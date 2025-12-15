import { loadSchema, loadYaml, validate, addSchema } from "./validator.js";
import path from "path";
import fs from "fs";

// Preload common schemas
const databaseSchemaPath = "src/schemas/database.schema.json";
if (fs.existsSync(databaseSchemaPath)) {
  addSchema(loadSchema(databaseSchemaPath), "database.schema.json");
}

export function loadConfig<T>(configPath: string, schemaPath: string): T {
  const rootConfig = loadYaml(configPath) as Record<string, unknown>;
  const configDir = path.dirname(configPath);

  const loadSiblingYaml = (filename: string) => {
    const filePath = path.join(configDir, filename);
    if (fs.existsSync(filePath)) {
      return loadYaml(filePath);
    }
    return undefined;
  };

  const config = {
    ...rootConfig,
    database: loadSiblingYaml("database.yaml"),
  };

  const schema = loadSchema(schemaPath);
  return validate<T>(schema, config);
}
