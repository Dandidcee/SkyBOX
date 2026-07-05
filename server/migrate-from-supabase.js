const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const PG_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SUPABASE_KEY || !PG_URL) {
  console.error("Pastikan VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, dan DATABASE_URL ada di .env backend");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const pool = new Pool({ connectionString: PG_URL });

async function migrateData() {
  console.log("Memulai migrasi dari Supabase ke PostgreSQL lokal...");

  try {
    // === 1. Migrate Users (Auth) ===
    console.log("Migrasi auth.users ke auth_users...");
    // Supabase tidak mengizinkan akses auth.users via public anon key
    // Solusi: Kita akan membuat 1 user default karena kita tidak bisa tarik hash password dari supabase.
    // ATAU: user harus mendaftar ulang di halaman Login lokal.
    console.warn("⚠️ Peringatan: Data auth.users (email & password) dari Supabase tidak dapat dimigrasi menggunakan anon key.");
    console.warn("⚠️ Silakan daftar ulang admin pertama kali di halaman Login setelah server jalan.");

    // === 2. Migrate Accounts ===
    console.log("Migrasi accounts...");
    const { data: accounts } = await supabase.from('accounts').select('*');
    for (const acc of (accounts || [])) {
      // Kita insert tanpa constraint owner_id (hapus constraint sementara di lokal jika perlu, atau set null)
      // Karena owner_id refer ke auth_users lokal yang belum ada.
      console.log(`- Akun: ${acc.name}`);
      await pool.query(`
        INSERT INTO accounts (id, name, phone, session_status, color, created_at, webhook_url, is_waha, origin_city_id, origin_label, analyze_webhook_url, admin_notify_phone)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO NOTHING
      `, [acc.id, acc.name, acc.phone, acc.session_status, acc.color, acc.created_at, acc.webhook_url, acc.is_waha, acc.origin_city_id, acc.origin_label, acc.analyze_webhook_url, acc.admin_notify_phone]);
    }

    // === 3. Migrate Conversations ===
    console.log("Migrasi conversations...");
    const { data: conversations } = await supabase.from('conversations').select('*');
    for (const conv of (conversations || [])) {
      await pool.query(`
        INSERT INTO conversations (id, account_id, customer_phone, customer_name, unread, last_message, last_time, status, tags, summary, order_status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO NOTHING
      `, [conv.id, conv.account_id, conv.customer_phone, conv.customer_name, conv.unread, conv.last_message, conv.last_time, conv.status, conv.tags, conv.summary, conv.order_status, conv.created_at]);
    }

    // === 4. Migrate Messages ===
    console.log("Migrasi messages...");
    const { data: messages } = await supabase.from('messages').select('*');
    for (const msg of (messages || [])) {
      await pool.query(`
        INSERT INTO messages (id, conversation_id, direction, type, content, media_url, status, created_at, from_me)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, [msg.id, msg.conversation_id, msg.direction, msg.type, msg.content, msg.media_url, msg.status, msg.created_at, msg.from_me]);
    }

    // Lakukan yang sama untuk tabel lain jika perlu (products, knowledge, orders, dll)
    console.log("Migrasi products, knowledge, orders, dll...");
    const tables = ['products', 'knowledge', 'orders', 'promos', 'templates', 'quick_replies', 'notifications'];
    for (const table of tables) {
      console.log(`Migrasi ${table}...`);
      const { data } = await supabase.from(table).select('*');
      if (data && data.length > 0) {
        const keys = Object.keys(data[0]);
        for (const row of data) {
          const values = keys.map(k => row[k]);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          
          try {
            await pool.query(`
              INSERT INTO ${table} (${keys.join(', ')})
              VALUES (${placeholders})
              ON CONFLICT (id) DO NOTHING
            `, values);
          } catch (e) {
            console.error(`Gagal insert ke ${table}:`, e.message);
          }
        }
      }
    }

    console.log("✅ Migrasi selesai!");
  } catch (err) {
    console.error("Terjadi kesalahan migrasi:", err);
  } finally {
    await pool.end();
  }
}

migrateData();
