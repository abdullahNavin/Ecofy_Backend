import "dotenv/config";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function envValue(key: string, fallback = ""): string {
  const value = process.env[key]?.trim();
  return value ? value : fallback;
}

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "");
}

const renderExternalURL = process.env["RENDER_EXTERNAL_URL"];
const defaultBetterAuthURL = trimTrailingSlashes(process.env["BETTER_AUTH_URL"] ??
  (renderExternalURL
    ? `https://${renderExternalURL}/api/v1/auth/better-auth`
    : `http://localhost:${process.env["PORT"] ?? "4000"}/api/v1/auth/better-auth`));

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  BETTER_AUTH_SECRET: requireEnv("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: defaultBetterAuthURL,
  GEMINI_API_KEY: envValue("GEMINI_API_KEY"),
  GEMINI_TEXT_MODEL: envValue("GEMINI_TEXT_MODEL", "gemini-2.5-flash"),
  OPENAI_API_KEY: envValue("OPENAI_API_KEY"),
  OPENAI_RESPONSE_MODEL: envValue("OPENAI_RESPONSE_MODEL", "gpt-4.1-mini"),
  OPENAI_EMBEDDING_MODEL: envValue("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
  STRIPE_SECRET_KEY: envValue("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: envValue("STRIPE_WEBHOOK_SECRET"),
  STRIPE_CURRENCY: envValue("STRIPE_CURRENCY", "usd"),
  PORT: parseInt(process.env["PORT"] ?? "4000", 10),
  NODE_ENV: envValue("NODE_ENV", "development"),
  CLIENT_URL: trimTrailingSlashes(envValue("CLIENT_URL", "http://localhost:3000")),
};
