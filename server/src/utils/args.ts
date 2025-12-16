export function parseArgs(): { configPath: string } {
  const args = process.argv.slice(2);
  let configPath = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--config" && i + 1 < args.length) {
      configPath = args[i + 1];
      i++;
    }
  }

  if (!configPath) {
    configPath = process.env.CONFIG_PATH || "";
  }

  if (!configPath) {
    console.error(
      "Error: --config argument or CONFIG_PATH environment variable is required"
    );
    process.exit(1);
  }

  return { configPath };
}
