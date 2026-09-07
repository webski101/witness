import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("DATABASE_URL_UNPOOLED is required for database migrations");

export default defineConfig({
  schema: "./lib/witness/db-schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
