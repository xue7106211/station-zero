import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

type DatabaseClient = {
  db: Database;
  sql: postgres.Sql;
};

let cachedClient: DatabaseClient | null = null;

function isSupabasePooler(connectionString: string) {
  return connectionString.includes(".pooler.supabase.com") || connectionString.includes(":6543");
}

export function createDatabaseClient(connectionString = process.env.DATABASE_URL): DatabaseClient | null {
  if (!connectionString?.trim()) {
    return null;
  }

  const sql = postgres(connectionString, {
    // Supabase transaction pooler (port 6543) does not support prepared statements.
    prepare: !isSupabasePooler(connectionString),
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return {
    sql,
    db: drizzle(sql, { schema }),
  };
}

export function getDatabaseClient(): DatabaseClient | null {
  if (!cachedClient) {
    cachedClient = createDatabaseClient();
  }
  return cachedClient;
}

export function getDb(): Database | null {
  return getDatabaseClient()?.db ?? null;
}

export async function closeDatabaseClient() {
  if (!cachedClient) {
    return;
  }

  await cachedClient.sql.end({ timeout: 5 });
  cachedClient = null;
}
