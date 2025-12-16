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

export interface ItemConfig {
  collection: string;
  allowedIdentifiers: string[];
  defaultIdentifiers: string[];
  projection: string[];
}

export interface MatchingConfig {
  maxCandidates: number;
  filters: Record<
    string,
    {
      operator:
        | "eq"
        | "ne"
        | "gt"
        | "gte"
        | "lt"
        | "lte"
        | "in"
        | "nin"
        | "exists";
      value: any;
    }
  >;
  scoring: {
    dimensions: Array<{
      name: string;
      weight: number;
      itemField: string;
      profileField?: string;
      operation:
        | "normalize"
        | "price_fit"
        | "array_includes"
        | "exact_match"
        | "similarity";
      normalizeMax?: number;
      normalizeMin?: number;
    }>;
  };
}

export interface TemplatesConfig {
  channels: Record<
    string,
    {
      tone: string;
      subject?: string;
      body: string;
      greeting?: string;
      ctaText?: string;
    }
  >;
  variables: Record<string, string>;
}

export interface Config {
  database: DatabaseConfig;
  server: ServerConfig;
  profile: ProfileConfig;
  item?: ItemConfig;
  matching?: MatchingConfig;
  templates?: TemplatesConfig;
}
