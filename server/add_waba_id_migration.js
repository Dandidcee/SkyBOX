const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addWabaIdColumn() {
  try {
    console.log('Adding wa_business_account_id column to accounts table...');
    await pool.query(`
      ALTER TABLE accounts 
      ADD COLUMN IF NOT EXISTS wa_business_account_id text;
    `);
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

addWabaIdColumn();
