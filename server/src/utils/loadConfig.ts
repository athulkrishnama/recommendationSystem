import { loadSchema, loadYaml, validate, addSchema } from "./validator.js";
import path from "path";
import fs from "fs";

// Preload common schemas
// Preload common schemas
const schemasDir = path.join(__dirname, "../schemas");
const databaseSchemaPath = path.join(schemasDir, "database.schema.json");
if (fs.existsSync(databaseSchemaPath)) {
  addSchema(loadSchema(databaseSchemaPath), "database.schema.json");
}

const profileSchemaPath = path.join(schemasDir, "profile.schema.json");
if (fs.existsSync(profileSchemaPath)) {
  addSchema(loadSchema(profileSchemaPath), "profile.schema.json");
}

const productSchemaPath = path.join(schemasDir, "item.schema.json");
if (fs.existsSync(productSchemaPath)) {
  addSchema(loadSchema(productSchemaPath), "item.schema.json");
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
    profile: loadSiblingYaml("profile.yaml"),
    item: loadSiblingYaml("item.yaml"),
  };
  const schema = loadSchema(schemaPath);
  return validate<T>(schema, config);
}
