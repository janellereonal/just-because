import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * One shared connection pool per server instance. On Vercel, point DATABASE_URL
 * at Neon's *pooled* connection string.
 */
function createDb() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  const client = postgres(url, { max: 5, prepare: false, idle_timeout: 20 });
  return drizzle(client, { schema });
}

type Db = ReturnType<typeof createDb>;
const globalForDb = globalThis as unknown as { __jbDb?: Db };

export function getDb(): Db {
  if (!globalForDb.__jbDb) globalForDb.__jbDb = createDb();
  return globalForDb.__jbDb;
}

export { schema };
