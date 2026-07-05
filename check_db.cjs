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
(async () => {
  const { data, error } = await sb.from('templates').select('*');
  console.log('Templates data:', JSON.stringify(error || data, null, 2));

  const { data: cols, error: colsErr } = await sb.rpc('exec_sql', { sql: "select column_name from information_schema.columns where table_name='templates'" });
  console.log('Columns:', colsErr || cols);
})();
