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
}
