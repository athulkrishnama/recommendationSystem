import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./utils/loadConfig";
import { parseArgs } from "./utils/args";
import { Config } from "./types/config";
import { mongoClient } from "./db/mongoClient";
import { registerResources } from "./register/registerResources";
import { registerTools } from "./register/registerTools";

import { join } from "path";

const { configPath } = parseArgs();

const schemaPath = join(__dirname, "schemas/root.schema.json");

export const config = loadConfig<Config>(configPath, schemaPath);

const server = new McpServer({
  name: config.server.name!,
  version: config.server.version!,
});

async function main() {
  await mongoClient.connect();
  registerResources(server);
  registerTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("✅ MCP Server running on stdio");
}

main().catch((error) => {
  console.error("❌ Fatal error in main():", error);
  process.exit(1);
});
