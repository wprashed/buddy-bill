import dotenv from "dotenv";
import path from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Explicitly load .env from the project root.
// Next.js `dev` auto-loads .env, but `next start` (production) does NOT,
// so we must do it ourselves.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

let pool: Pool | null = null;

if (databaseUrl) {
  pool =
    globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
    });

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
          "DATABASE_URL environment variable is not set.\n\n" +
          "Create a .env file in the project root:\n\n" +
          "  DATABASE_URL=postgresql://username:password@localhost:5432/buddybill\n\n" +
          "Looked for .env at: " + path.resolve(process.cwd(), ".env")
        );
      },
    }) as ReturnType<typeof drizzle>);
