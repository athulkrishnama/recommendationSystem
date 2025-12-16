import dotenv from "dotenv";
dotenv.config();
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";
import { loadConfig } from "./utils/loadConfig";
import { Config } from "./types/config";
import { mongoClient } from "./db/mongoClient";
import { registerResources } from "./register/registerResources";
import { registerTools } from "./register/registerTools";

export const config = loadConfig<Config>();

const server = new McpServer({
  name: config.server.name!,
  version: config.server.version!,
});

const toolRegistry = new Map<string, any>();
const originalToolMethod = server.tool.bind(server);
(server as any).tool = function (...args: any[]) {
  const [name, schema, options, handler] = args;
  toolRegistry.set(name, { name, schema, options, handler });
  return (originalToolMethod as any)(...args);
};

const resourceRegistry = new Map<string, any>();
const originalResourceMethod = server.resource.bind(server);
(server as any).resource = function (...args: any[]) {
  const [uri, name, handler] = args;
  resourceRegistry.set(uri, { uri, name, handler });
  return (originalResourceMethod as any)(...args);
};

async function main() {
  await mongoClient.connect();
  registerResources(server);
  registerTools(server);
  const useHttp = process.env.TRANSPORT === "http";

  if (useHttp) {
    const app = express();
    app.use(express.json());

    app.post("/mcp", async (req, res) => {
      try {
        console.error(
          "📥 Received request:",
          JSON.stringify(req.body, null, 2)
        );

        const { jsonrpc, id, method, params } = req.body;

        if (jsonrpc !== "2.0") {
          throw new Error("Invalid JSON-RPC version");
        }

        let result;

        switch (method) {
          case "tools/list": {
            const tools = Array.from(toolRegistry.values()).map((tool) => ({
              name: tool.name,
              description: tool.options?.title || `Tool: ${tool.name}`,
              inputSchema: tool.schema,
            }));
            result = { tools };
            break;
          }

          case "tools/call": {
            const toolName = params.name;
            const tool = toolRegistry.get(toolName);
            if (!tool) {
              throw new Error(`Tool not found: ${toolName}`);
            }
            result = await tool.handler(params.arguments || {});
            break;
          }

          case "resources/list": {
            const resources = Array.from(resourceRegistry.values()).map(
              (resource) => ({
                uri: resource.uri,
                name: resource.name,
              })
            );
            result = { resources };
            break;
          }

          case "resources/read": {
            const uri = params.uri;
            const resource = resourceRegistry.get(uri);
            if (!resource) {
              throw new Error(`Resource not found: ${uri}`);
            }
            result = await resource.handler();
            break;
          }

          default:
            throw new Error(`Unknown method: ${method}`);
        }

        const response = {
          jsonrpc: "2.0",
          id,
          result,
        };

        console.error(
          "📤 Sending response:",
          JSON.stringify(response, null, 2)
        );
        res.json(response);
      } catch (error: any) {
        console.error("❌ Error handling request:", error);
        console.error("Stack:", error.stack);
        res.status(500).json({
          jsonrpc: "2.0",
          id: req.body?.id || null,
          error: {
            code: -32603,
            message: error.message || "Internal error",
            data: error.stack,
          },
        });
      }
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.error(
        `✅ MCP Server running on HTTP at http://localhost:${PORT}/mcp`
      );
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("✅ MCP Server running on stdio");
  }
}

main().catch((error) => {
  console.error("❌ Fatal error in main():", error);
  process.exit(1);
});
