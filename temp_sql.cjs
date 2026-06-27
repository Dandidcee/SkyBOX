const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').replace(/\r/g, '');
const envVars = env.split('\n').reduce((acc, line) => {
  const [key, ...valParts] = line.split('=');
  const val = valParts.join('=');
  if (key && val) acc[key] = val;
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  envVars.VITE_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpdnhkZm1pZ2h2eHZ6dnNjbnVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTM2MjkzNSwiZXhwIjoyMDk2OTM4OTM1fQ.ZkqEtO0yLebM8aZf8PMEiDA2Zb2P5PHYXpy_ugZ8kKM' // Using the same role key found in execute_sql.cjs
);

const runSql = async () => {
  const query = `
    create table if not exists templates (
      id uuid primary key default gen_random_uuid(),
      account_id uuid not null references accounts(id) on delete cascade,
      trigger_text text not null,
      reply_text text not null,
      image_url text,
      created_at timestamptz default now()
    );
    create index if not exists idx_templates_account on templates(account_id);
    alter table templates enable row level security;
    drop policy if exists "allow authenticated" on templates;
    create policy "allow authenticated" on templates for all to authenticated
      using (true)
      with check (true);
  `;
  try {
    const { error } = await sb.rpc('exec_sql', { sql: query });
    if (error) {
      console.log('Error executing SQL via RPC:', error);
    } else {
      console.log('SQL executed successfully');
    }
  } catch (e) {
    console.log('Exception executing SQL:', e);
  }
};
runSql();
