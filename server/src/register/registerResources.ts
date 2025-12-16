import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { ProfileRepo } from "../db/repository/profileRepo";
import { ItemRepo } from "../db/repository/ItemRepo";
import { config } from "../index";

export function registerResources(server: McpServer) {
  server.resource("identifiers", "Profile Identifiers Configuration", () => {
    return {
      contents: [
        {
          uri: "config://profile/identifiers",
          mimeType: "application/json",
          text: JSON.stringify(
            {
              description:
                "Profile identifier configuration for search and filtering",
              explanation: {
                allowedIdentifiers:
                  "Field names that can be used to search for profiles. These are DATABASE FIELD NAMES, not values.",
                defaultIdentifiers:
                  "Field names used when no specific identifiers are requested",
                projection:
                  "All fields that can be returned in profile results",
                important:
                  "When searching, provide the ACTUAL VALUE to search for (e.g., 'john@example.com'), NOT the field name (e.g., 'email'). The system will automatically search across all allowed identifier fields.",
              },
              allowedIdentifiers: config.profile.allowedIdentifiers,
              defaultIdentifiers: config.profile.defaultIdentifiers,
              projection: config.profile.projection,
              examples: {
                correct: {
                  description:
                    "Search for a user by their actual email address",
                  query: "john@example.com",
                  explanation:
                    "This searches across all allowedIdentifiers for the VALUE 'john@example.com'",
                },
                incorrect: {
                  description: "DON'T search using field names",
                  query: "email",
                  explanation:
                    "This would search for the literal string 'email', not search the email field",
                },
                moreExamples: [
                  "Search by email value: 'alice@company.com'",
                  "Search by name value: 'John Doe'",
                  "Search by username value: 'johndoe123'",
                  "Search by ID value: 'user-12345'",
                ],
              },
            },
            null,
            2
          ),
        },
      ],
    };
  });

  server.resource("profile-catalog", "Complete Profile Catalog", async () => {
    const repo = new ProfileRepo();
    const profiles = await repo.getProfileByIdentifier(
      config.profile.allowedIdentifiers,
      ""
    );

    return {
      contents: [
        {
          uri: "data://profiles/catalog",
          mimeType: "application/json",
          text: JSON.stringify(
            {
              count: profiles.length,
              profiles,
            },
            null,
            2
          ),
        },
      ],
    };
  });

  if (config.item) {
    server.resource(
      "item-identifiers",
      "Item Identifiers Configuration",
      () => {
        return {
          contents: [
            {
              uri: "config://item/identifiers",
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  description:
                    "Item identifier configuration for search and filtering",
                  explanation: {
                    allowedIdentifiers:
                      "Field names that can be used to search for items. These are DATABASE FIELD NAMES, not values.",
                    defaultIdentifiers:
                      "Field names used when no specific identifiers are requested",
                    projection:
                      "All fields that can be returned in item results and used for filtering",
                    important:
                      "When searching by ID, provide the ACTUAL VALUE (e.g., 'item-12345'), NOT the field name (e.g., 'id'). For filtering, use field names as keys with their corresponding values.",
                  },
                  allowedIdentifiers: config.item!.allowedIdentifiers,
                  defaultIdentifiers: config.item!.defaultIdentifiers,
                  projection: config.item!.projection,
                  examples: {
                    searchById: {
                      description: "Search for an item by its actual ID value",
                      itemId: "item-12345",
                      explanation:
                        "This searches for the item with ID 'item-12345'",
                    },
                    filterByFields: {
                      description:
                        "Filter items using field names as keys and values",
                      filters: {
                        category: "electronics",
                        price: { $gte: 100, $lte: 500 },
                      },
                      explanation:
                        "This filters items in the 'electronics' category with price between 100-500",
                    },
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    server.resource("item-catalog", "Complete Item Catalog", async () => {
      const repo = new ItemRepo();
      const items = await repo.getAllItems();

      return {
        contents: [
          {
            uri: "data://items/catalog",
            mimeType: "application/json",
            text: JSON.stringify(
              {
                count: items.length,
                items,
              },
              null,
              2
            ),
          },
        ],
      };
    });
  }

  if (config.matching) {
    server.resource("matching-rules", "Matching Rules Configuration", () => {
      return {
        contents: [
          {
            uri: "config://matching/rules",
            mimeType: "application/json",
            text: JSON.stringify(config.matching, null, 2),
          },
        ],
      };
    });
  }

  if (config.templates) {
    server.resource(
      "message-templates",
      "Message Templates Configuration",
      () => {
        return {
          contents: [
            {
              uri: "config://templates/channels",
              mimeType: "application/json",
              text: JSON.stringify(config.templates, null, 2),
            },
          ],
        };
      }
    );
  }
}
