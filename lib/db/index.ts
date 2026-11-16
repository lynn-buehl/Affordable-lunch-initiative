import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Plain node-postgres rather than @neondatabase/serverless's HTTP driver:
// Neon accepts normal Postgres wire-protocol connections (its HTTP driver is
// an optional edge-runtime optimization, not a requirement), and using the
// standard driver means this also works unmodified against a local/dev
// Postgres, and gives real transactions instead of the HTTP driver's
// single-request-batch workaround.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });
