import "dotenv/config";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  BETTER_AUTH_SECRET: requireEnv("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: process.env["BETTER_AUTH_URL"] ?? "http://localhost:4000",
  STRIPE_SECRET_KEY: process.env["STRIPE_SECRET_KEY"] ?? "",
  STRIPE_WEBHOOK_SECRET: process.env["STRIPE_WEBHOOK_SECRET"] ?? "",
  STRIPE_CURRENCY: process.env["STRIPE_CURRENCY"] ?? "usd",
  PORT: parseInt(process.env["PORT"] ?? "4000", 10),
  NODE_ENV: process.env["NODE_ENV"] ?? "development",
  CLIENT_URL: process.env["CLIENT_URL"] ?? "http://localhost:3000",
};
