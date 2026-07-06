import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Load .env file for local `npm run start` (production mode).
// On Vercel / serverless, env vars are injected by the platform.
// In `npm run dev`, Next.js loads .env automatically.
// This try/catch ensures it never crashes if dotenv or the file is missing.
try {
  const dotenv = require("dotenv");
  const path = require("path");
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
} catch {
  // dotenv not available or .env not found — that's fine,
  // the platform should provide DATABASE_URL via environment.
}

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

let pool: Pool | null = null;

if (databaseUrl) {
  pool =
    globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({ connectionString: databaseUrl });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }
}

export { pool };

export const db = databaseUrl
  ? drizzle(pool!)
  : (new Proxy({} as ReturnType<typeof drizzle>, {
      get() {
        throw new Error(
          "DATABASE_URL is not set. " +
          "Set it as an environment variable on your hosting platform, " +
          "or create a .env file in the project root for local development."
        );
      },
    }) as ReturnType<typeof drizzle>);
