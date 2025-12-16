import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { ProfileRepo } from "../db/repository/profileRepo";
import { ProductRepo } from "../db/repository/ProductRepo";
import { config } from "../index";

export function registerTools(server: McpServer) {
  // Profile search tool
  (server.tool as any)(
    "search_profiles",
    {
      query: z.string(),
    },
    {
      title: "Search Profiles by any identifier",
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

  // Product tools (only if product config exists)
  if (config.product) {
    // Search single product by ID
    (server.tool as any)(
      "search_product",
      {
        productId: z.string().describe("Product ID to search for"),
      },
      {
        title: "Search for a single product by ID",
        readOnlyHint: true,
      },
      async (args: any) => {
        const repo = new ProductRepo();
        const product = await repo.getProductById(args.productId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                product
                  ? {
                      found: true,
                      product,
                    }
                  : {
                      found: false,
                      message: `Product with ID "${args.productId}" not found`,
                    },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    // Filter products by criteria
    (server.tool as any)(
      "filter_products",
      {
        category: z.string().optional().describe("Filter by product category"),
        minPrice: z.number().optional().describe("Minimum price"),
        maxPrice: z.number().optional().describe("Maximum price"),
        tags: z
          .array(z.string())
          .optional()
          .describe("Filter by tags (products must have at least one)"),
        inStock: z
          .boolean()
          .optional()
          .describe("Filter by stock availability"),
      },
      {
        title:
          "Filter products by category, price range, tags, or stock availability",
        readOnlyHint: true,
      },
      async (args: any) => {
        const repo = new ProductRepo();
        const products = await repo.filterProducts({
          category: args.category,
          minPrice: args.minPrice,
          maxPrice: args.maxPrice,
          tags: args.tags,
          inStock: args.inStock,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  filters: {
                    category: args.category,
                    minPrice: args.minPrice,
                    maxPrice: args.maxPrice,
                    tags: args.tags,
                    inStock: args.inStock,
                  },
                  count: products.length,
                  products,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );
  }
}
