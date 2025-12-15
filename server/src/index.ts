import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./utils/loadConfig.js";
import { parseArgs } from "./utils/args.js";
import { Config } from "./types/config.js";
import { mongoClient } from "./db/mongoClient.js";

const { configPath } = parseArgs();
const schemaPath = "src/schemas/root.schema.json";

export const config = loadConfig<Config>(configPath, schemaPath);

const server = new McpServer({
  name: config.server.name!,
  version: config.server.version!,
});

async function main() {
  await mongoClient.connect();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Weather MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
