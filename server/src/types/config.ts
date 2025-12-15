export interface DatabaseConfig {
  uri: string;
  name: string;
}

export interface ServerConfig {
  name: string;
  version: string;
}

export interface Config {
  database: DatabaseConfig;
  server: ServerConfig;
}
