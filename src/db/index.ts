import { drizzle, type NetlifyDbDatabase } from "drizzle-orm/netlify-db";
import * as schema from "./schema";

// Netlify Database configures the connection automatically — no connection string needed.
// The adapter returns a union of driver types; narrowing it keeps query builder overloads resolvable.
export const db = drizzle({ schema }) as NetlifyDbDatabase<typeof schema>;
