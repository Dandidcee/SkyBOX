import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await pool.query(`
      ALTER TABLE accounts
      DROP COLUMN IF EXISTS waha_session,
      DROP COLUMN IF EXISTS toggle_webhook_url,
      DROP COLUMN IF EXISTS send_message_webhook_url,
      DROP COLUMN IF EXISTS send_media_webhook_url,
      DROP COLUMN IF EXISTS is_waha;
      
      -- Ubah nama analyze_webhook_url menjadi n8n_webhook_url jika belum ada
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'analyze_webhook_url') THEN
          ALTER TABLE accounts RENAME COLUMN analyze_webhook_url TO n8n_webhook_url;
        END IF;
      END $$;
    `);
    console.log("Migration successful");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

run();
