import fs from "fs";
import yaml from "js-yaml";
import Ajv from "ajv";
import addFormats from "ajv-formats";

export function loadYaml(path: string): unknown {
  const raw = fs.readFileSync(path, "utf-8");
  return yaml.load(raw);
}

export function loadSchema(path: string): object {
  return JSON.parse(fs.readFileSync(path, "utf-8"));
}

const ajv = new (Ajv as any)({ allErrors: true, strict: false });
(addFormats as any)(ajv);

export function addSchema(schema: object, key: string) {
  ajv.addSchema(schema, key);
}

export function validate<T>(schema: object, data: unknown): T {
  const validateFn = ajv.compile(schema);
  const valid = validateFn(data);

  if (!valid) {
    throw new Error(ajv.errorsText(validateFn.errors, { separator: "\n" }));
  }

  return data as T;
}
