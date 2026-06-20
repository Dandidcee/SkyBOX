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
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpdnhkZm1pZ2h2eHZ6dnNjbnVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTM2MjkzNSwiZXhwIjoyMDk2OTM4OTM1fQ.ZkqEtO0yLebM8aZf8PMEiDA2Zb2P5PHYXpy_ugZ8kKM'
);

const runSql = async () => {
  const query = `
    create table if not exists quick_replies (
      id uuid primary key default gen_random_uuid(),
      owner_id uuid not null references auth.users(id) on delete cascade,
      shortcut text not null,
      content text not null,
      created_at timestamptz default now()
    );
    create index if not exists idx_quick_replies_owner on quick_replies(owner_id);
    alter table quick_replies enable row level security;
    drop policy if exists "own quick_replies all" on quick_replies;
    create policy "own quick_replies all" on quick_replies for all to authenticated
      using (owner_id = auth.uid())
      with check (owner_id = auth.uid());
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
