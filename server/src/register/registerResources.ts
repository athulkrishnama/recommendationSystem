import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { ProfileRepo } from "../db/repository/profileRepo";
import { ProductRepo } from "../db/repository/ProductRepo";
import { config } from "../index";

export function registerResources(server: McpServer) {
  // Profile identifiers resource
  server.resource("identifiers", "Profile Identifiers Configuration", () => {
    return {
      contents: [
        {
          uri: "config://profile/identifiers",
          mimeType: "application/json",
          text: JSON.stringify(
            {
              allowedIdentifiers: config.profile.allowedIdentifiers,
              defaultIdentifiers: config.profile.defaultIdentifiers,
            },
            null,
            2
          ),
        },
      ],
    };
  });

  // Profile catalog resource
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

  // Product resources (only if product config exists)
  if (config.product) {
    // Product identifiers resource
    server.resource(
      "product-identifiers",
      "Product Identifiers Configuration",
      () => {
        return {
          contents: [
            {
              uri: "config://product/identifiers",
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  allowedIdentifiers: config.product!.allowedIdentifiers,
                  defaultIdentifiers: config.product!.defaultIdentifiers,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    // Product catalog resource
    server.resource("product-catalog", "Complete Product Catalog", async () => {
      const repo = new ProductRepo();
      const products = await repo.getAllProducts();

      return {
        contents: [
          {
            uri: "data://products/catalog",
            mimeType: "application/json",
            text: JSON.stringify(
              {
                count: products.length,
                products,
              },
              null,
              2
            ),
          },
        ],
      };
    });
  }
}
