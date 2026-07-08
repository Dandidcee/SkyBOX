const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('server/.env', 'utf8').replace(/\r/g, '');
const envVars = env.split('\n').reduce((acc, line) => {
  const [key, ...valParts] = line.split('=');
  const val = valParts.join('=');
  if (key && val) acc[key] = val;
  return acc;
}, {});

const pool = new Pool({
  connectionString: envVars.DATABASE_URL
});

async function main() {
  try {
    const res = await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
        name text NOT NULL,
        phone text NOT NULL,
        created_at timestamptz DEFAULT now()
      );
    `);
    console.log('Successfully created contacts table:', res);
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    await pool.end();
  }
}

main();
