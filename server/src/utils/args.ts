export function parseArgs(): { configPath: string } {
  const args = process.argv.slice(2);
  let configPath = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--config" && i + 1 < args.length) {
      configPath = args[i + 1];
      i++; // Skip next arg since it's the value
    }
  }

  if (!configPath) {
    // Default or error? User said "extract arguments... and using that get ---config path".
    // I will throw if not found or return null?
    // Let's assume it's required as per "pass that to ...".
    // But for better DX, maybe default? The user didn't specify default.
    // I'll throw an error if missing to be safe/explicit.
    console.error("Error: --config argument is required");
    process.exit(1);
  }

  return { configPath };
}
