import { loadSchema, loadYaml, validate, addSchema } from "./validator";
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

export function loadConfig<T>(): T {
  const isBuilt = __dirname.includes("build");
  const configBaseDir = isBuilt
    ? path.join(__dirname, "../config")
    : path.join(__dirname, "../config");

  if (!fs.existsSync(configBaseDir)) {
    throw new Error(`Config directory not found: ${configBaseDir}`);
  }

  const rootConfigPath = path.join(configBaseDir, "config.yaml");
  if (!fs.existsSync(rootConfigPath)) {
    throw new Error(`config.yaml not found in: ${configBaseDir}`);
  }

  console.error(`Loading config from: ${configBaseDir}`);

  const rootConfig = loadYaml(rootConfigPath) as Record<string, unknown>;

  const loadSiblingYaml = (filename: string) => {
    const filePath = path.join(configBaseDir, filename);
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

  console.error(`Environment MONGO_URL: ${process.env.MONGO_URL || "NOT SET"}`);
  console.error(`Database config loaded: ${JSON.stringify(config.database)}`);

  if (process.env.MONGO_URL && config.database) {
    const mongoUrl = new URL(process.env.MONGO_URL);
    const dbConfig = config.database as any;
    dbConfig.uri = `${mongoUrl.protocol}//${mongoUrl.host}`;
    if (mongoUrl.pathname && mongoUrl.pathname !== "/") {
      dbConfig.name = mongoUrl.pathname.slice(1);
    }
    console.error(`Using MongoDB from env: ${dbConfig.uri}/${dbConfig.name}`);
  }

  const schemaPath = path.join(__dirname, "../schemas/root.schema.json");
  const schema = loadSchema(schemaPath);
  return validate<T>(schema, config);
}
