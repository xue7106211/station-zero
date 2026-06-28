import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL.trim(), { prepare: false, max: 1 });
const rows = await sql`
  select
    case
      when poster_url like '%supabase.co%' then 'supabase'
      when poster_url like '/media%' then 'local'
      when poster_url is null then 'null'
      else 'other'
    end as kind,
    count(*)::int as count
  from movies
  group by 1
  order by 1
`;
console.log(rows);
await sql.end();
