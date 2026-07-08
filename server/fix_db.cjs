const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8').replace(/\r/g, '');
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
    console.log('Menambahkan tabel contacts jika belum ada...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
        name text NOT NULL,
        phone text NOT NULL,
        created_at timestamptz DEFAULT now()
      );
    `);
    
    console.log('Menambahkan kolom ai_enabled di tabel accounts jika belum ada...');
    await pool.query(`
      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ai_enabled boolean DEFAULT true;
    `);

    console.log('BERHASIL! Database sudah diperbarui.');
  } catch (err) {
    console.error('ERROR saat memperbarui database:', err);
  } finally {
    await pool.end();
  }
}

main();
