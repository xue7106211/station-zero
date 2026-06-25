import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  console.error("Supabase: Project Settings → Database → Connection string → URI (Transaction pooler, port 6543).");
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  prepare: !(databaseUrl.includes(".pooler.supabase.com") || databaseUrl.includes(":6543")),
  max: 1,
  connect_timeout: 10,
});

try {
  const [{ now }] = await sql`select now() as now`;
  console.log(`Connected to Postgres. Server time: ${now}`);

  const tables = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('movies', 'viewing_paths', 'media_assets', 'import_staging')
    order by table_name
  `;

  if (tables.length === 0) {
    console.log("Schema not applied yet. Run: npm run db:migrate");
    process.exit(2);
  }

  console.log(`Found tables: ${tables.map((row) => row.table_name).join(", ")}`);

  const [{ count }] = await sql`select count(*)::int as count from movies`;
  console.log(`movies row count: ${count}`);
} catch (error) {
  console.error("Database check failed.");
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);

  if (message.includes("password authentication failed")) {
    console.error("");
    console.error("Likely causes:");
    console.error("- DATABASE_URL uses the wrong database password (not the anon/service API key).");
    console.error("- Password special characters are not URL-encoded in the connection string.");
    console.error("- Supabase password was reset but .env.local was not updated.");
    console.error("");
    console.error("Fix:");
    console.error("1. Supabase → Project Settings → Database → Reset database password");
    console.error("2. Copy URI for Transaction pooler (port 6543)");
    console.error("3. Paste the full string into .env.local as DATABASE_URL=...");
  }

  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
