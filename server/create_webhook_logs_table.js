const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgres://postgres:pakaruL123!@localhost:5433/skybox_db',
});

async function main() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
        payload jsonb NOT NULL,
        created_at timestamptz DEFAULT now()
      );
    `);
    console.log("Table webhook_logs created successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
main();
