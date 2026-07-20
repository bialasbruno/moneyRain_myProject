export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
  DEV_AUTH_BYPASS?: string;
  OWNER_EMAIL?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  MARKET_DATA_API_KEY?: string;
}

export interface AuthData {
  [key: string]: unknown;
  ownerEmail: string;
}

export type AppContext = EventContext<Env, string, AuthData>;
