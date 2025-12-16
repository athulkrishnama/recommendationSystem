import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { ProfileRepo } from "../db/repository/profileRepo";
import { ItemRepo } from "../db/repository/ItemRepo";
import { config } from "../index";

export function registerTools(server: McpServer) {
  // Profile search tool
  (server.tool as any)(
    "search_profiles",
    {
      query: z
        .string()
        .describe(
          "The actual VALUE to search for (e.g., 'john@example.com', 'John Doe', 'user123'). " +
            "DO NOT pass field names like 'email' or 'name'. " +
            "The system will automatically search this value across all allowed identifier fields (id, email, name, username)."
        ),
    },
    {
      title: "Search Profiles by any identifier value",
      readOnlyHint: true,
    },
    async (args: any) => {
      const repo = new ProfileRepo();

      const profiles = await repo.getProfileByIdentifier(
        config.profile.allowedIdentifiers,
        args.query
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                query: args.query,
                count: profiles.length,
                profiles,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Generic profile filter tool - domain agnostic
  (server.tool as any)(
    "filter_profiles",
    {
      filters: z
        .record(z.any())
        .describe(
          `Filter profiles by any fields. Provide a JSON object with field-value pairs. ` +
            `Allowed fields are defined in the profile projection config. ` +
            `Examples: {"age": {"$gte": 25, "$lte": 50}}, {"monthlySpend": {"$gte": 1000}}, {"name": "John"}`
        ),
    },
    {
      title: "Filter profiles by any field-value pairs (domain-agnostic)",
      readOnlyHint: true,
    },
    async (args: any) => {
      const repo = new ProfileRepo();

      try {
        const profiles = await repo.filter(args.filters);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  filters: args.filters,
                  count: profiles.length,
                  profiles,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: error.message,
                  filters: args.filters,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );

  // Item tools (only if item config exists)
  if (config.item) {
    // Search single item by ID
    (server.tool as any)(
      "search_item",
      {
        itemId: z
          .string()
          .describe(
            "The actual item ID VALUE to search for (e.g., 'item-12345', 'SKU-ABC-123'). " +
              "DO NOT pass the field name 'id'. Pass the actual identifier value."
          ),
      },
      {
        title: "Search for a single item by ID",
        readOnlyHint: true,
      },
      async (args: any) => {
        const repo = new ItemRepo();
        const item = await repo.getItemById(args.itemId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                item
                  ? {
                      found: true,
                      item,
                    }
                  : {
                      found: false,
                      message: `Item with ID "${args.itemId}" not found`,
                    },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    // Generic filter tool - domain agnostic
    (server.tool as any)(
      "filter_items",
      {
        filters: z
          .record(z.any())
          .describe(
            `Filter items by any fields. Provide a JSON object with field-value pairs. ` +
              `Allowed fields are defined in the item projection config. ` +
              `Examples: {"category": "electronics"}, {"price": {"$gte": 100, "$lte": 500}}, {"tags": ["sale", "featured"]}`
          ),
      },
      {
        title: "Filter items by any field-value pairs (domain-agnostic)",
        readOnlyHint: true,
      },
      async (args: any) => {
        const repo = new ItemRepo();

        try {
          const items = await repo.filter(args.filters);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    filters: args.filters,
                    count: items.length,
                    items,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error: error.message,
                    filters: args.filters,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
      }
    );
  }

  // =============================================================================
  // CORE RECOMMENDATION TOOLS
  // =============================================================================

  // Tool 1: match_items - Deterministic matching (NO LLM)
  if (config.matching && config.item) {
    (server.tool as any)(
      "match_items",
      {
        profileId: z
          .string()
          .describe("Customer profile ID to match items for"),
      },
      {
        title: "Match items to customer profile using configured rules",
        readOnlyHint: true,
      },
      async (args: any) => {
        try {
          const profileRepo = new ProfileRepo();
          const itemRepo = new ItemRepo();

          // 1. Fetch profile
          const profile = await profileRepo.getProfileById(args.profileId);
          if (!profile) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      error: `Profile ${args.profileId} not found`,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          // 2. Fetch all items
          const allItems = await itemRepo.getAllItems();

          // 3. Apply filters from config (domain-agnostic)
          const matchingConfig = config.matching!;
          const filtered = allItems.filter((item: any) => {
            for (const [fieldName, filterDef] of Object.entries(
              matchingConfig.filters
            )) {
              const itemValue = item[fieldName];
              const { operator, value } = filterDef;

              // Apply operator-based filtering
              switch (operator) {
                case "eq":
                  if (itemValue !== value) return false;
                  break;
                case "ne":
                  if (itemValue === value) return false;
                  break;
                case "gt":
                  if (itemValue <= value) return false;
                  break;
                case "gte":
                  if (itemValue < value) return false;
                  break;
                case "lt":
                  if (itemValue >= value) return false;
                  break;
                case "lte":
                  if (itemValue > value) return false;
                  break;
                case "in":
                  if (!Array.isArray(value) || !value.includes(itemValue))
                    return false;
                  break;
                case "nin":
                  if (Array.isArray(value) && value.includes(itemValue))
                    return false;
                  break;
                case "exists":
                  if (value && itemValue === undefined) return false;
                  if (!value && itemValue !== undefined) return false;
                  break;
              }
            }
            return true;
          });

          // 4. Calculate scores using configured dimensions (domain-agnostic)
          const scoringDimensions = matchingConfig.scoring.dimensions;

          const scored = filtered.map((item: any) => {
            let totalScore = 0;
            const breakdown: Record<string, number> = {};

            // Execute each scoring dimension
            for (const dimension of scoringDimensions) {
              const itemValue = item[dimension.itemField];
              let dimensionScore = 0;

              switch (dimension.operation) {
                case "normalize":
                  // Normalize to 0-1 range
                  const min = dimension.normalizeMin || 0;
                  const max = dimension.normalizeMax || 1;
                  dimensionScore = (itemValue - min) / (max - min) || 0;
                  dimensionScore = Math.max(0, Math.min(1, dimensionScore));
                  break;

                case "price_fit":
                  // Price fit: how well price matches profile budget
                  if (dimension.profileField) {
                    const budget = profile[dimension.profileField] || 10000;
                    dimensionScore = calculatePriceFit(itemValue, budget);
                  }
                  break;

                case "array_includes":
                  // Check if item value is in profile array
                  if (dimension.profileField) {
                    const profileArray = profile[dimension.profileField] || [];
                    dimensionScore = Array.isArray(profileArray)
                      ? profileArray.includes(itemValue)
                        ? 1.0
                        : 0.0
                      : 0.0;
                  }
                  break;

                case "exact_match":
                  // Binary match: 1 if equal, 0 otherwise
                  if (dimension.profileField) {
                    dimensionScore =
                      profile[dimension.profileField] === itemValue ? 1.0 : 0.0;
                  }
                  break;

                case "similarity":
                  // TODO: Implement string/vector similarity
                  dimensionScore = 0;
                  break;
              }

              breakdown[dimension.name] = dimensionScore;
              totalScore += dimensionScore * dimension.weight;
            }

            return {
              item,
              score: totalScore,
              breakdown,
            };
          });

          // 5. Sort by score and take top N
          scored.sort((a, b) => b.score - a.score);
          const topMatches = scored.slice(0, matchingConfig.maxCandidates);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    profileId: args.profileId,
                    matchCount: topMatches.length,
                    matches: topMatches,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error: error.message,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
      }
    );
  }

  // Tool 2: draft_recommendation - LLM narrative generation
  (server.tool as any)(
    "draft_recommendation",
    {
      profile: z.object({}).passthrough().describe("Customer profile object"),
      matchedItems: z
        .array(z.object({}).passthrough())
        .describe("Array of matched items with scores"),
    },
    {
      title: "Generate personalized recommendation narrative using LLM",
      readOnlyHint: true,
    },
    async (args: any) => {
      try {
        // TODO: Integrate with actual LLM service (OpenAI, Anthropic, Google)
        // For now, generate a simple template-based recommendation

        const itemNames = args.matchedItems
          .slice(0, 5)
          .map(
            (m: any, idx: number) =>
              `${idx + 1}. ${m.item.name} ($${
                m.item.price
              }) - Score: ${m.score.toFixed(2)}`
          )
          .join("\n");

        const recommendationText = `Based on your profile and preferences, we've selected ${args.matchedItems.length} items that match your needs:\n\n${itemNames}\n\nThese items were chosen based on your budget, category preferences, and quality ratings.`;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  recommendationText,
                  itemsIncluded: args.matchedItems
                    .slice(0, 5)
                    .map((m: any) => m.item.id),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: error.message,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );

  // Tool 3: generate_message - Template-based message formatting
  if (config.templates) {
    (server.tool as any)(
      "generate_message",
      {
        channel: z
          .string()
          .describe('Channel: "email", "whatsapp", "call_script"'),
        recommendationText: z
          .string()
          .describe("Generated recommendation narrative"),
        profile: z.object({}).passthrough().describe("Customer profile"),
        items: z
          .array(z.object({}).passthrough())
          .optional()
          .describe("Items to include"),
      },
      {
        title: "Format recommendation into channel-specific message",
        readOnlyHint: true,
      },
      async (args: any) => {
        try {
          const template = config.templates!.channels[args.channel];
          if (!template) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      error: `Channel "${
                        args.channel
                      }" not found. Available: ${Object.keys(
                        config.templates!.channels
                      ).join(", ")}`,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          // Build variable map
          const vars: Record<string, string> = {
            customerName: args.profile.name || "Customer",
            itemCount: (args.items?.length || 0).toString(),
            recommendations: args.recommendationText,
            ctaText: template.ctaText || "",
            ...config.templates!.variables,
          };

          // Inject variables into template
          const injectVars = (text: string): string => {
            return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
              return vars[varName] !== undefined ? vars[varName] : match;
            });
          };

          const result: any = {
            channel: args.channel,
            tone: template.tone,
          };

          if (template.subject) {
            result.subject = injectVars(template.subject);
          }
          if (template.greeting) {
            result.greeting = injectVars(template.greeting);
          }

          result.body = injectVars(template.body);
          result.message = result.body;

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error: error.message,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
      }
    );
  }
}

// Helper function for price fit calculation
function calculatePriceFit(price: number, budget: number): number {
  // Optimal price is around 70% of budget
  // Score decreases as price moves away from optimal
  const optimalPrice = budget * 0.7;
  const diff = Math.abs(price - optimalPrice);
  const range = budget * 0.5;

  if (diff > range) return 0;
  return 1 - diff / range;
}
