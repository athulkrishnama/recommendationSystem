export interface DatabaseConfig {
  uri: string;
  name: string;
}

export interface ServerConfig {
  name: string;
  version: string;
}

export interface ProfileConfig {
  collection: string;
  allowedIdentifiers: string[];
  defaultIdentifiers: string[];
  projection: string[];
}

export interface ProductConfig {
  collection: string;
  allowedIdentifiers: string[];
  defaultIdentifiers: string[];
  projection: string[];
}

export interface Config {
  database: DatabaseConfig;
  server: ServerConfig;
  profile: ProfileConfig;
  product?: ProductConfig;
}
