// Applies drizzle/migrations to DATABASE_URL. Safe to re-run.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL first.");
const client = postgres(url, { max: 1 });
await migrate(drizzle(client), { migrationsFolder: "drizzle/migrations" });
await client.end();
console.log("Migrations applied.");
