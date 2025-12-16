import { loadSchema, loadYaml, validate, addSchema } from "./validator.js";
import path from "path";
import fs from "fs";

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

const matchingSchemaPath = path.join(schemasDir, "matching.schema.json");
if (fs.existsSync(matchingSchemaPath)) {
  addSchema(loadSchema(matchingSchemaPath), "matching.schema.json");
}

const templatesSchemaPath = path.join(schemasDir, "templates.schema.json");
if (fs.existsSync(templatesSchemaPath)) {
  addSchema(loadSchema(templatesSchemaPath), "templates.schema.json");
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
    matching: loadSiblingYaml("matching.yaml"),
    templates: loadSiblingYaml("templates.yaml"),
  };
  const schema = loadSchema(schemaPath);
  return validate<T>(schema, config);
}
