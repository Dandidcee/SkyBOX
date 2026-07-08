const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key text PRIMARY KEY,
        value text
      );
    `);
    console.log("Table app_settings created.");
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
