const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addErrorMessageColumn() {
  try {
    console.log('Adding error_message column to messages table...');
    await pool.query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS error_message text;
    `);
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

addErrorMessageColumn();
