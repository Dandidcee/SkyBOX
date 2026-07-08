const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { Pool } = require('pg');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Load env vars
dotenv.config();

// Init Postgres Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false } // Uncomment jika menggunakan SSL di VPS
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Di production, ganti dengan origin frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_ganti_di_production';

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected via Socket.io:', socket.id);
  
  socket.on('join_account', (accountId) => {
    socket.join(`account_${accountId}`);
    console.log(`Socket ${socket.id} joined room account_${accountId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(401);
    req.user = user;
    next();
  });
};

// Middleware
app.use(cors()); // Mengizinkan semua origin untuk dipanggil dari frontend kita
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static folder untuk media yang di-upload
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Setup Multer untuk upload file
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    await fs.ensureDir(uploadPath); // Pastikan folder ada
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Route: Upload Media
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || `localhost:${PORT}`;
  const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
  
  res.json({ url: fileUrl, filename: req.file.filename });
});

// ==========================================
// AUTHENTICATION
// ==========================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

    const result = await pool.query('SELECT * FROM auth_users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: 'Email atau password salah' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Email atau password salah' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal login' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });
    
    // Cek apakah sudah ada user di auth_users
    const userCount = await pool.query('SELECT COUNT(*) FROM auth_users');
    if (parseInt(userCount.rows[0].count) > 0) {
      // Hardcode: Pendaftaran ditutup untuk umum setelah admin pertama terdaftar
      return res.status(403).json({ error: 'Pendaftaran ditutup' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    const result = await pool.query('INSERT INTO auth_users (email, password_hash) VALUES ($1, $2) RETURNING id, email', [email, hash]);
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal register' });
  }
});

app.put('/api/auth/password', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password wajib diisi' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    await pool.query('UPDATE auth_users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal update password' });
  }
});

// Route: Delete Media
app.delete('/api/media', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    
    // Ekstrak nama file dari URL
    const parts = url.split('/uploads/');
    if (parts.length < 2) return res.json({ success: true, message: 'Not a local file' });
    
    const filename = parts[1];
    const filepath = path.join(__dirname, 'uploads', filename);
    
    if (await fs.pathExists(filepath)) {
      await fs.remove(filepath);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Delete Media Error:", err);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

const RAJAONGKIR_KEY = process.env.RAJAONGKIR_KEY;

if (!RAJAONGKIR_KEY) {
  console.error("ERROR: RAJAONGKIR_KEY tidak ditemukan di file .env. Pastikan Anda telah membuat file .env di folder server.");
}

// Route: Cari Tujuan/Asal
app.get('/api/ongkir/destination', async (req, res) => {
  try {
    const { search } = req.query;
    if (!search) {
      return res.status(400).json({ error: "Parameter search dibutuhkan" });
    }

    const apiKey = req.headers['x-api-key'] || process.env.RAJAONGKIR_KEY;
    if (!apiKey) {
      return res.status(401).json({ error: "API Key RajaOngkir belum diatur. Silakan isi di menu Settings dashboard." });
    }

    const url = `https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?search=${encodeURIComponent(search)}&limit=10&offset=0`;
    const response = await fetch(url, {
      headers: { 'key': apiKey }
    });

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error("Destination Error:", error);
    return res.status(500).json({ error: "Gagal mengambil data tujuan" });
  }
});

// Route: Hitung Ongkir
app.post('/api/ongkir/cost', async (req, res) => {
  try {
    const { origin, destination, weight, courier } = req.body;
    
    if (!origin || !destination || !weight || !courier) {
      return res.status(400).json({ error: "Parameter origin, destination, weight, dan courier dibutuhkan" });
    }

    const apiKey = req.headers['x-api-key'] || process.env.RAJAONGKIR_KEY;
    if (!apiKey) {
      return res.status(401).json({ error: "API Key RajaOngkir belum diatur. Silakan isi di menu Settings dashboard." });
    }

    const body = new URLSearchParams({
      origin: String(origin),
      destination: String(destination),
      weight: String(weight),
      courier: String(courier),
    });

    const url = `https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'key': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error("Cost Error:", error);
    return res.status(500).json({ error: "Gagal menghitung ongkos kirim" });
  }
});

// Route: Webhook Verification untuk Meta (WhatsApp Cloud API)
app.get('/api/webhooks/meta/:accountId', (req, res) => {
  // Meta biasanya mengirimkan query parameters: hub.mode, hub.challenge, hub.verify_token
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && challenge) {
    console.log("Meta Webhook Verified!");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Route: Webhook Penerima Pesan dari Meta
app.post('/api/webhooks/meta/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const body = req.body;

    // Cek apakah ini event dari WhatsApp API
    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    if (!process.env.DATABASE_URL) {
      console.error("Database not configured");
      return res.sendStatus(500);
    }

    // Proses setiap entry
    for (const entry of body.entry) {
      const changes = entry.changes;
      for (const change of changes) {
        const value = change.value;
        
        // Pastikan ini ada pesan masuk
        if (value && value.messages && value.messages.length > 0) {
          const message = value.messages[0];
          const contact = value.contacts && value.contacts[0] ? value.contacts[0] : null;

          const customerPhone = message.from; // Nomor pengirim
          const customerName = contact ? contact.profile.name : customerPhone;
          const messageId = message.id;
          const messageType = message.type;
          
          let messageBody = "";
          let mediaUrl = null;

          if (messageType === 'text') {
            messageBody = message.text.body;
          } else if (messageType === 'image') {
            messageBody = "📷 Image";
          } else if (messageType === 'document') {
             messageBody = "📄 Document";
          } else {
             messageBody = `*[${messageType}]*`;
          }

          let msgTypeToStore = messageType === 'chat' ? 'text' : messageType;
          if (!['text', 'image', 'document'].includes(msgTypeToStore)) {
            msgTypeToStore = 'text'; // Fallback
          }

          const preview = messageBody.substring(0, 100);
          const now = new Date().toISOString();

          // 1. Cari atau buat percakapan (conversation) dengan raw SQL
          let conversationId;
          
          try {
            const findConvQuery = `
              SELECT id, unread FROM conversations 
              WHERE account_id = $1 AND customer_phone = $2 LIMIT 1
            `;
            const findRes = await pool.query(findConvQuery, [accountId, customerPhone]);

            if (findRes.rows.length === 0) {
              // Buat baru
              const insertConvQuery = `
                INSERT INTO conversations 
                (account_id, customer_phone, customer_name, chat_id, handler, order_status, unread, last_preview, last_time) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                RETURNING id
              `;
              const insertValues = [
                accountId, customerPhone, customerName, customerPhone, 'ai', 'none', 1, preview, now
              ];
              const insertRes = await pool.query(insertConvQuery, insertValues);
              conversationId = insertRes.rows[0].id;
            } else {
              conversationId = findRes.rows[0].id;
              // Gunakan raw SQL untuk update bump_unread
              const updateConvQuery = `
                UPDATE conversations 
                SET unread = unread + 1, last_preview = $1, last_time = $2, updated_at = $2 
                WHERE id = $3
                RETURNING *
              `;
              const updateRes = await pool.query(updateConvQuery, [preview, now, conversationId]);
              
              // Emit via Socket.io
              io.to(`account_${accountId}`).emit('conversation_updated', updateRes.rows[0]);
            }

            // 2. Masukkan pesan ke tabel messages
            const insertMsgQuery = `
              INSERT INTO messages 
              (conversation_id, external_message_id, direction, type, body, media_url) 
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (external_message_id) DO NOTHING
              RETURNING *
            `;
            const msgRes = await pool.query(insertMsgQuery, [
              conversationId, messageId, 'in', msgTypeToStore, messageBody, mediaUrl
            ]);

            if (msgRes.rows.length > 0) {
              // Emit pesan baru via Socket.io
              io.to(`account_${accountId}`).emit('new_message', msgRes.rows[0]);
            }

          } catch (dbErr) {
             console.error("DB Error processing message:", dbErr);
          }
        }
      }
    }

    // Selalu balas 200 OK ke Meta agar mereka tidak mencoba mengirim ulang
    res.sendStatus(200);

  } catch (error) {
    console.error("Meta Webhook Error:", error);
    res.sendStatus(500);
  }
});

// Route: Auth Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email dan Password dibutuhkan" });
    }

    // Cari user di tabel auth_users (tabel kustom pengganti Supabase auth.users)
    const result = await pool.query('SELECT * FROM auth_users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
       return res.status(401).json({ error: "Kredensial tidak valid" });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
       return res.status(401).json({ error: "Kredensial tidak valid" });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    // Hilangkan password_hash sebelum dikirim ke frontend
    delete user.password_hash;
    
    res.json({ token, user });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Route: Auth Register (Opsional, hanya untuk dev/testing awal)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      'INSERT INTO auth_users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hash]
    );

    res.json({ message: "User created", user: result.rows[0] });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Failed to register" });
  }
});

// ==========================================
// REST API untuk Frontend (Dilindungi oleh JWT)
// ==========================================

// Ambil daftar akun WhatsApp milik user
app.get('/api/accounts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // Auto-claim accounts that have no owner (useful after migration)
    await pool.query('UPDATE accounts SET owner_id = $1 WHERE owner_id IS NULL', [userId]);
    
    const result = await pool.query('SELECT * FROM accounts WHERE owner_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

// Tambah akun WhatsApp
app.post('/api/accounts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name, phone, color, wa_phone_number_id, wa_access_token, meta_verify_token,
      n8n_webhook_url, confidence_threshold, bank_account, admin_notify_phone, ai_enabled
    } = req.body;

    const query = `
      INSERT INTO accounts (
        owner_id, name, phone, color, wa_phone_number_id, wa_access_token, meta_verify_token,
        n8n_webhook_url, confidence_threshold, bank_account, admin_notify_phone, ai_enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *
    `;
    const values = [
      userId, name, phone, color, wa_phone_number_id || '', wa_access_token || '', meta_verify_token || '',
      n8n_webhook_url || '', confidence_threshold || 75, bank_account || '', admin_notify_phone || '', ai_enabled !== undefined ? ai_enabled : true
    ];
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add account" });
  }
});

// Update akun WhatsApp
app.put('/api/accounts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const patch = req.body;
    
    // Verifikasi kepemilikan
    const check = await pool.query('SELECT id FROM accounts WHERE id = $1 AND owner_id = $2', [id, req.user.id]);
    if (check.rows.length === 0) return res.sendStatus(403);

    // Bikin dynamic update query
    const fields = Object.keys(patch);
    if (fields.length === 0) return res.json({ success: true });
    
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = [id, ...fields.map(f => patch[f])];
    
    const query = `UPDATE accounts SET ${setClause} WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update account" });
  }
});

// Hapus akun WhatsApp
app.delete('/api/accounts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT id FROM accounts WHERE id = $1 AND owner_id = $2', [id, req.user.id]);
    if (check.rows.length === 0) return res.sendStatus(403);

    await pool.query('DELETE FROM accounts WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

// ==========================================
// DYNAMIC CRUD UNTUK TABEL DENGAN account_id
// (products, knowledge, promos, orders, templates, quick_replies, dll)
// ==========================================
const ALLOWED_TABLES = ['products', 'knowledge', 'promos', 'orders', 'templates', 'quick_replies', 'notifications', 'contacts'];

// GET list per accountId
app.get('/api/resource/:table/:accountId', authenticateToken, async (req, res) => {
  try {
    const { table, accountId } = req.params;
    if (!ALLOWED_TABLES.includes(table)) return res.sendStatus(404);

    const check = await pool.query('SELECT id FROM accounts WHERE id = $1 AND owner_id = $2', [accountId, req.user.id]);
    if (check.rows.length === 0) return res.sendStatus(403);

    const result = await pool.query(`SELECT * FROM ${table} WHERE account_id = $1 ORDER BY created_at DESC`, [accountId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Failed to fetch ${req.params.table}` });
  }
});

// POST (Create)
app.post('/api/resource/:table', authenticateToken, async (req, res) => {
  try {
    const { table } = req.params;
    if (!ALLOWED_TABLES.includes(table)) return res.sendStatus(404);

    const { account_id, ...data } = req.body;
    const check = await pool.query('SELECT id FROM accounts WHERE id = $1 AND owner_id = $2', [account_id, req.user.id]);
    if (check.rows.length === 0) return res.sendStatus(403);

    const fields = ['account_id', ...Object.keys(data)];
    const values = [account_id, ...Object.values(data)];
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

    const query = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Failed to create ${req.params.table}` });
  }
});

// PUT (Update)
app.put('/api/resource/:table/:id', authenticateToken, async (req, res) => {
  try {
    const { table, id } = req.params;
    if (!ALLOWED_TABLES.includes(table)) return res.sendStatus(404);

    // Verify ownership by joining with accounts
    const checkQuery = `
      SELECT t.id FROM ${table} t 
      JOIN accounts a ON a.id = t.account_id 
      WHERE t.id = $1 AND a.owner_id = $2
    `;
    const check = await pool.query(checkQuery, [id, req.user.id]);
    if (check.rows.length === 0) return res.sendStatus(403);

    const fields = Object.keys(req.body);
    if (fields.length === 0) return res.json({ success: true });

    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = [id, ...Object.values(req.body)];

    const query = `UPDATE ${table} SET ${setClause} WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Failed to update ${req.params.table}` });
  }
});

// DELETE
app.delete('/api/resource/:table/:id', authenticateToken, async (req, res) => {
  try {
    const { table, id } = req.params;
    if (!ALLOWED_TABLES.includes(table)) return res.sendStatus(404);

    const checkQuery = `
      SELECT t.id FROM ${table} t 
      JOIN accounts a ON a.id = t.account_id 
      WHERE t.id = $1 AND a.owner_id = $2
    `;
    const check = await pool.query(checkQuery, [id, req.user.id]);
    if (check.rows.length === 0) return res.sendStatus(403);

    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Failed to delete ${req.params.table}` });
  }
});


// Ambil riwayat percakapan berdasarkan accountId
app.get('/api/conversations/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    // Pastikan akun ini milik user yang sedang login
    const accCheck = await pool.query('SELECT id FROM accounts WHERE id = $1 AND owner_id = $2', [accountId, req.user.id]);
    if (accCheck.rows.length === 0) return res.sendStatus(403);

    const result = await pool.query('SELECT * FROM conversations WHERE account_id = $1 ORDER BY last_time DESC', [accountId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Bulk Delete Conversations
app.post('/api/conversations/bulk-delete', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body; // array of strings
    if (!ids || !ids.length) return res.json({ success: true });

    // Verify ownership
    const checkQuery = `
      SELECT c.id FROM conversations c
      JOIN accounts a ON a.id = c.account_id
      WHERE c.id = ANY($1::uuid[]) AND a.owner_id = $2
    `;
    const check = await pool.query(checkQuery, [ids, req.user.id]);
    const validIds = check.rows.map(r => r.id);

    if (validIds.length === 0) return res.json({ success: true });

    // In a real app we'd also delete physical media files here.
    // Since we're migrating fast, we just delete from db.
    await pool.query('DELETE FROM conversations WHERE id = ANY($1::uuid[])', [validIds]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete conversations" });
  }
});

// Ambil daftar pesan berdasarkan conversationId
app.get('/api/messages/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Verifikasi kepemilikan
    const convCheck = await pool.query(`
      SELECT c.id FROM conversations c 
      JOIN accounts a ON a.id = c.account_id 
      WHERE c.id = $1 AND a.owner_id = $2
    `, [conversationId, req.user.id]);
    
    if (convCheck.rows.length === 0) return res.sendStatus(403);

    const result = await pool.query('SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC', [conversationId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Ambil daftar order berdasarkan conversationId
app.get('/api/orders/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const convCheck = await pool.query(`
      SELECT c.id FROM conversations c 
      JOIN accounts a ON a.id = c.account_id 
      WHERE c.id = $1 AND a.owner_id = $2
    `, [conversationId, req.user.id]);
    
    if (convCheck.rows.length === 0) return res.sendStatus(403);

    const result = await pool.query('SELECT * FROM orders WHERE conversation_id = $1 ORDER BY created_at DESC', [conversationId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Ambil semua order lintas percakapan dengan join ke tabel conversations
app.get('/api/orders-list', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        o.id, o.conversation_id, o.created_at, o.type, o.status, 
        o.address, o.amount, o.items, o.note, o.verified,
        c.customer_name, c.customer_phone, c.account_id, c.order_status
      FROM orders o
      JOIN conversations c ON o.conversation_id = c.id
      JOIN accounts a ON c.account_id = a.id
      WHERE a.owner_id = $1
      ORDER BY o.created_at DESC
      LIMIT 300
    `;
    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders list" });
  }
});

// Ambil semua percakapan lintas akun
app.get('/api/conversations-list', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT c.* FROM conversations c
      JOIN accounts a ON c.account_id = a.id
      WHERE a.owner_id = $1
      ORDER BY c.last_time DESC
    `;
    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch all conversations" });
  }
});

// Start/Get conversation with a contact
app.post('/api/conversations/start', authenticateToken, async (req, res) => {
  try {
    const { accountId, phone, name } = req.body;
    
    // Verifikasi akun
    const check = await pool.query('SELECT id FROM accounts WHERE id = $1 AND owner_id = $2', [accountId, req.user.id]);
    if (check.rows.length === 0) return res.sendStatus(403);

    // Cari atau buat percakapan
    const findConv = await pool.query('SELECT * FROM conversations WHERE account_id = $1 AND customer_phone = $2 LIMIT 1', [accountId, phone]);
    
    if (findConv.rows.length > 0) {
      return res.json(findConv.rows[0]);
    } else {
      const insertConv = `
        INSERT INTO conversations (account_id, customer_phone, customer_name, unread, handler, last_preview, last_time)
        VALUES ($1, $2, $3, 0, 'human', 'Percakapan dimulai via Kontak', NOW())
        RETURNING *
      `;
      const newConv = await pool.query(insertConv, [accountId, phone, name || phone]);
      
      // Emit via socket
      io.to(`account_${accountId}`).emit('conversation_updated', newConv.rows[0]);
      
      return res.json(newConv.rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start conversation" });
  }
});

// ==========================================
// NOTIFICATIONS
// ==========================================
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT n.* FROM notifications n
      LEFT JOIN accounts a ON a.id = n.account_id
      WHERE n.account_id IS NULL OR a.owner_id = $1
      ORDER BY n.created_at DESC
      LIMIT 100
    `;
    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

app.delete('/api/notifications', authenticateToken, async (req, res) => {
  try {
    // Hanya hapus notifikasi yang belong to user ini
    const query = `
      DELETE FROM notifications 
      WHERE id IN (
        SELECT n.id FROM notifications n
        LEFT JOIN accounts a ON a.id = n.account_id
        WHERE n.account_id IS NULL OR a.owner_id = $1
      )
    `;
    await pool.query(query, [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete notifications" });
  }
});

// ==========================================
// QUICK REPLIES CRUD (owner_id based)
// ==========================================
app.get('/api/quick_replies', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM quick_replies WHERE owner_id = $1 ORDER BY shortcut ASC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch quick replies" });
  }
});

app.post('/api/quick_replies', authenticateToken, async (req, res) => {
  try {
    const { shortcut, content } = req.body;
    const query = `INSERT INTO quick_replies (owner_id, shortcut, content) VALUES ($1, $2, $3) RETURNING *`;
    const result = await pool.query(query, [req.user.id, shortcut, content]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create quick reply" });
  }
});

app.put('/api/quick_replies/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { shortcut, content } = req.body;

    // Build update query dynamically
    const fields = [];
    const values = [id, req.user.id];
    let i = 3;
    
    if (shortcut !== undefined) {
      fields.push(`shortcut = $${i++}`);
      values.push(shortcut);
    }
    if (content !== undefined) {
      fields.push(`content = $${i++}`);
      values.push(content);
    }

    if (fields.length === 0) return res.json({ success: true });

    const query = `UPDATE quick_replies SET ${fields.join(', ')} WHERE id = $1 AND owner_id = $2 RETURNING *`;
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) return res.sendStatus(403);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update quick reply" });
  }
});

app.delete('/api/quick_replies/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM quick_replies WHERE id = $1 AND owner_id = $2 RETURNING *', [id, req.user.id]);
    if (result.rows.length === 0) return res.sendStatus(403);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete quick reply" });
  }
});


// Toggle AI/Human handler for a conversation
app.put('/api/conversations/:id/handler', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { handler } = req.body;
    
    if (handler !== 'ai' && handler !== 'human') {
      return res.status(400).json({ error: "Invalid handler value" });
    }

    // Verify ownership
    const checkQuery = `
      SELECT c.id, c.account_id FROM conversations c
      JOIN accounts a ON a.id = c.account_id
      WHERE c.id = $1 AND a.owner_id = $2
    `;
    const check = await pool.query(checkQuery, [id, req.user.id]);
    if (check.rows.length === 0) return res.sendStatus(403);

    const accountId = check.rows[0].account_id;

    const updateQuery = `
      UPDATE conversations 
      SET handler = $1 
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [handler, id]);
    
    // Emit via Socket.io agar realtime terupdate di client
    io.to(`account_${accountId}`).emit('conversation_updated', result.rows[0]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update handler" });
  }
});

// Kirim pesan ke pelanggan via Meta API & Simpan ke DB
app.post('/api/messages', authenticateToken, async (req, res) => {
  try {
    const { conversationId, body, type } = req.body; // type = 'text', 'image', dll
    
    // Ambil info akun dan percakapan untuk kirim via Meta API
    const convInfo = await pool.query(`
      SELECT c.customer_phone, a.id as account_id, a.wa_phone_number_id, a.wa_access_token 
      FROM conversations c 
      JOIN accounts a ON a.id = c.account_id 
      WHERE c.id = $1 AND a.owner_id = $2
    `, [conversationId, req.user.id]);

    if (convInfo.rows.length === 0) return res.status(403).json({ error: "Unauthorized" });

    const { customer_phone, account_id, wa_phone_number_id, wa_access_token } = convInfo.rows[0];

    // Lakukan HTTP POST ke Graph API Meta
    if (wa_phone_number_id && wa_access_token) {
      try {
        const payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: customer_phone.replace(/\D/g, ''), // Pastikan hanya angka
          type: type || 'text',
        };
        
        if (type === 'image' || type === 'video' || type === 'document' || type === 'audio' || type === 'sticker') {
          // req.body.mediaUrl harus ada dari frontend
          payload[type] = { link: req.body.mediaUrl };
          if (type === 'image' || type === 'video' || type === 'document') {
            if (body && body !== `[${type}]`) {
              payload[type].caption = body; // Caption text for media
            }
          }
        } else {
          payload.text = { body: body };
        }

        const metaRes = await fetch(`https://graph.facebook.com/v17.0/${wa_phone_number_id}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${wa_access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        const metaData = await metaRes.json();
        if (metaData.error) {
          console.error('Meta API Error:', metaData.error);
        }
      } catch (e) {
        console.error('Failed to send message to Meta API:', e);
      }
    }
    
    // Simpan pesan ke database
    const insertMsg = `
      INSERT INTO messages (conversation_id, external_message_id, direction, type, content, media_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const messageId = `out_${Date.now()}`;
    const result = await pool.query(insertMsg, [conversationId, messageId, 'out', type || 'text', body, req.body.mediaUrl || null]);
    const newMessage = result.rows[0];

    // Update conversation preview
    const updateConvQuery = `
      UPDATE conversations 
      SET last_preview = $1, last_time = $2 
      WHERE id = $3
      RETURNING *
    `;
    const updateRes = await pool.query(updateConvQuery, [body.substring(0, 100), new Date().toISOString(), conversationId]);

    // Emit via Socket.io agar admin lain atau tab lain terupdate
    io.to(`account_${account_id}`).emit('new_message', newMessage);
    io.to(`account_${account_id}`).emit('conversation_updated', updateRes.rows[0]);

    res.json(newMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Root endpoint test
app.get('/', (req, res) => {
  res.send('Ongkir & WhatsApp Backend is Running!');
});

// ==========================================
// N8N INTEGRATION ENDPOINTS
// ==========================================

app.use('/api/n8n', authenticateToken);

// Endpoint N8N untuk mencocokkan template
app.post('/api/n8n/match-template', async (req, res) => {
  try {
    const { conversation_id, message } = req.body;
    if (!conversation_id || !message) {
      return res.status(400).json({ error: 'Missing conversation_id or message' });
    }

    // Cari account_id dari percakapan
    const convResult = await pool.query('SELECT account_id FROM conversations WHERE id = $1', [conversation_id]);
    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const account_id = convResult.rows[0].account_id;

    // Ambil template untuk akun ini
    const tmplResult = await pool.query('SELECT trigger_text, reply_text, image_url FROM templates WHERE account_id = $1', [account_id]);
    const templates = tmplResult.rows;

    const msgLower = message.toLowerCase();
    
    // Cari template yang trigger_text-nya cocok
    let matchedTemplate = null;
    for (const tmpl of templates) {
      if (!tmpl.trigger_text) continue;
      // Pecah trigger_text berdasarkan koma jika ada multi-keyword
      const keywords = tmpl.trigger_text.split(',').map(k => k.trim().toLowerCase());
      for (const kw of keywords) {
        if (msgLower.includes(kw)) {
          matchedTemplate = tmpl;
          break;
        }
      }
      if (matchedTemplate) break;
    }

    if (matchedTemplate) {
      return res.json({ 
        matched: true, 
        template: {
          reply_text: matchedTemplate.reply_text,
          image_url: matchedTemplate.image_url
        } 
      });
    }

    return res.json({ matched: false });
  } catch (err) {
    console.error('Error matching template:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint N8N untuk membuat order baru ke database
app.post('/api/n8n/orders', async (req, res) => {
  try {
    const { conversation_id, type, status, address, amount, items, note } = req.body;
    if (!conversation_id || !type || !status) {
      return res.status(400).json({ error: 'Missing required fields: conversation_id, type, status' });
    }

    const query = `
      INSERT INTO orders (conversation_id, type, status, address, amount, items, note)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [conversation_id, type, status, address, amount || 0, items || '[]', note || ''];
    const result = await pool.query(query, values);
    
    // Update order status di tabel conversations juga
    await pool.query('UPDATE conversations SET order_status = $1 WHERE id = $2', [status, conversation_id]);
    
    // Emit ke socket jika butuh update UI
    const convInfo = await pool.query('SELECT account_id FROM conversations WHERE id = $1', [conversation_id]);
    if (convInfo.rows.length > 0) {
      io.to(`account_${convInfo.rows[0].account_id}`).emit('order_created', result.rows[0]);
    }

    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    console.error("N8N Create Order API Error:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint N8N untuk mengubah mode handler (contoh: dari 'ai' ke 'human')
app.put('/api/n8n/conversations/:id/handler', async (req, res) => {
  try {
    const { id } = req.params;
    const { handler } = req.body; // 'ai' atau 'human'
    if (!handler) return res.status(400).json({ error: 'Missing handler value' });

    const updateQuery = `UPDATE conversations SET handler = $1 WHERE id = $2 RETURNING *`;
    const result = await pool.query(updateQuery, [handler, id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });

    io.to(`account_${result.rows[0].account_id}`).emit('conversation_updated', result.rows[0]);
    res.json({ success: true, conversation: result.rows[0] });
  } catch (err) {
    console.error("N8N Update Handler API Error:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint publik (sekarang terlindungi) khusus untuk dipanggil oleh N8N.
// N8N memanggil ini menggunakan wa_phone_number_id yang didapat dari webhook Meta.
app.get('/api/n8n/context/:phoneId', async (req, res) => {
  try {
    const { phoneId } = req.params;
    
    // 1. Cari akun berdasarkan wa_phone_number_id
    const accResult = await pool.query('SELECT id, name FROM accounts WHERE wa_phone_number_id = $1 LIMIT 1', [phoneId]);
    if (accResult.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found for this Phone ID' });
    }
    const account = accResult.rows[0];

    // 2. Ambil Knowledge Base
    const knowResult = await pool.query('SELECT title, content FROM knowledge WHERE account_id = $1', [account.id]);
    
    // 3. Ambil Products / Stock
    const prodResult = await pool.query('SELECT name, price, stock, category, description FROM products WHERE account_id = $1', [account.id]);

    // 4. Ambil Templates
    const tempResult = await pool.query('SELECT trigger_text, reply_text, image_url, variants FROM templates WHERE account_id = $1', [account.id]);

    // 5. Susun respons untuk N8N
    const context = {
      accountId: account.id,
      accountName: account.name,
      knowledge: knowResult.rows,
      products: prodResult.rows,
      templates: tempResult.rows
    };

    res.json(context);
  } catch (err) {
    console.error("N8N Context API Error:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint untuk dipanggil N8N menggunakan accountId (yang dikirim dari webhook dashboard)
app.get('/api/n8n/context/account/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const accResult = await pool.query('SELECT id, name FROM accounts WHERE id = $1 LIMIT 1', [accountId]);
    if (accResult.rows.length === 0) return res.status(404).json({ error: 'Account not found' });
    const account = accResult.rows[0];

    const knowResult = await pool.query('SELECT title, content FROM knowledge WHERE account_id = $1', [accountId]);
    const prodResult = await pool.query('SELECT name, price, stock, category, description FROM products WHERE account_id = $1', [accountId]);
    const tempResult = await pool.query('SELECT trigger_text, reply_text, image_url, variants FROM templates WHERE account_id = $1', [accountId]);

    res.json({
      accountId: account.id,
      accountName: account.name,
      knowledge: knowResult.rows,
      products: prodResult.rows,
      templates: tempResult.rows
    });
  } catch (err) {
    console.error("N8N Context Account API Error:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint untuk menyimpan balasan dari AI N8N ke database
app.post('/api/n8n/save-message', async (req, res) => {
  try {
    const { conversationId, body, type, direction = 'out', externalMessageId } = req.body;
    if (!conversationId || !body) return res.status(400).json({ error: 'Missing required fields' });
    
    const messageId = externalMessageId || `n8n_out_${Date.now()}`;
    const insertMsg = `
      INSERT INTO messages (conversation_id, external_message_id, direction, type, body)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(insertMsg, [conversationId, messageId, direction, type || 'text', body]);
    
    // Update conversation preview
    await pool.query(`
      UPDATE conversations 
      SET last_message = $1, last_time = NOW()
      WHERE id = $2
    `, [body.substring(0, 50), conversationId]);

    // Emit event socket.io ke client (jika terhubung)
    // Untuk mendapatkan account_id, kita query dari conversation
    const convInfo = await pool.query('SELECT account_id FROM conversations WHERE id = $1', [conversationId]);
    if (convInfo.rows.length > 0) {
      const accountId = convInfo.rows[0].account_id;
      io.to(`account_${accountId}`).emit('new_message', result.rows[0]);
    }

    res.json({ success: true, message: result.rows[0] });
  } catch (err) {
    console.error("N8N Save Message API Error:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint untuk mengirim pesan dari N8N via Dashboard (Meta API) & simpan ke DB
// Dengan ini N8N tidak perlu menyimpan token Meta, cukup panggil API ini
app.post('/api/n8n/send-message', async (req, res) => {
  try {
    const { conversationId, body, type, externalMessageId, intent } = req.body;
    if (!conversationId || !body) return res.status(400).json({ error: 'Missing required fields' });

    // 1. Ambil info akun dan percakapan
    const convInfo = await pool.query(`
      SELECT c.customer_phone, a.id as account_id, a.wa_phone_number_id, a.wa_access_token 
      FROM conversations c 
      JOIN accounts a ON a.id = c.account_id 
      WHERE c.id = $1
    `, [conversationId]);

    if (convInfo.rows.length === 0) return res.status(404).json({ error: "Conversation not found" });

    const { customer_phone, account_id, wa_phone_number_id, wa_access_token } = convInfo.rows[0];

    // 2. Lakukan HTTP POST ke Graph API Meta
    let metaMessageId = externalMessageId || `n8n_out_${Date.now()}`;
    if (wa_phone_number_id && wa_access_token) {
      try {
        const payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: customer_phone.replace(/\D/g, ''),
          type: type || 'text',
        };
        
        if (type === 'image' || type === 'video' || type === 'document' || type === 'audio' || type === 'sticker') {
          payload[type] = { link: req.body.mediaUrl };
          if ((type === 'image' || type === 'video' || type === 'document') && body && body !== `[${type}]`) {
            payload[type].caption = body;
          }
        } else {
          payload.text = { body: body };
        }

        const metaRes = await fetch(`https://graph.facebook.com/v17.0/${wa_phone_number_id}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${wa_access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        const metaData = await metaRes.json();
        if (metaData.error) {
          console.error('Meta API Error (N8N Send):', metaData.error);
        } else if (metaData.messages && metaData.messages[0]) {
          metaMessageId = metaData.messages[0].id; // Gunakan ID asli dari Meta jika berhasil
        }
      } catch (e) {
        console.error('Failed to send message to Meta API from N8N:', e);
      }
    }
    
    // 3. Simpan pesan ke database
    const insertMsg = `
      INSERT INTO messages (conversation_id, external_message_id, direction, type, body, media_url)
      VALUES ($1, $2, 'out', $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(insertMsg, [conversationId, metaMessageId, type || 'text', body, req.body.mediaUrl || null]);
    const newMessage = result.rows[0];

    // 4. Update conversation preview dan order_status (jika ada intent)
    let updateConvQuery = `
      UPDATE conversations 
      SET last_message = $1, last_time = NOW()
    `;
    const updateValues = [body.substring(0, 100), conversationId];
    
    if (intent && ['none', 'lead', 'waiting_payment', 'closing', 'complaint'].includes(intent)) {
      updateConvQuery += `, order_status = $3`;
      updateValues.push(intent);
    }
    
    updateConvQuery += `
      WHERE id = $2
      RETURNING *
    `;
    const updateRes = await pool.query(updateConvQuery, updateValues);

    // 5. Emit event socket.io ke client (jika terhubung)
    io.to(`account_${account_id}`).emit('new_message', newMessage);
    io.to(`account_${account_id}`).emit('conversation_updated', updateRes.rows[0]);

    res.json({ success: true, message: newMessage });
  } catch (err) {
    console.error("N8N Send Message API Error:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// ==========================================
// META WEBHOOK RECEIVER
// ==========================================

const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'skybox_secret_token';



// Endpoint Khusus N8N untuk mengambil riwayat chat (Tools N8N)
app.get('/api/n8n/chat-history/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await pool.query(`
      SELECT direction, type, body, media_url, created_at 
      FROM messages 
      WHERE conversation_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `, [conversationId, limit]);
    
    res.json(result.rows.reverse());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// 1. Meta Webhook Verification
app.get('/api/webhook/meta', async (req, res) => {
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token && challenge) {
    try {
      // Cari apakah token ini ada di tabel accounts kita
      const checkResult = await pool.query('SELECT id FROM accounts WHERE meta_verify_token = $1 LIMIT 1', [token]);
      
      if (checkResult.rows.length > 0) {
        console.log(`Meta Webhook Verified (Token matches DB: ${token})`);
        res.status(200).send(challenge);
      } else {
        console.warn(`Meta Webhook Verification Failed (Token not found: ${token})`);
        res.sendStatus(403);
      }
    } catch (err) {
      console.error("DB Error on Webhook Verify:", err);
      res.sendStatus(500);
    }
  } else {
    res.status(200).send("Webhook is running!");
  }
});

// 2. Meta Webhook Message Receiver
app.post('/api/webhook/meta', async (req, res) => {
  try {
    const body = req.body;

    if (body.object) {
      if (body.entry && body.entry[0].changes && body.entry[0].changes[0] && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
        const phone_number_id = body.entry[0].changes[0].value.metadata.phone_number_id;
        const msg = body.entry[0].changes[0].value.messages[0];
        const contact = body.entry[0].changes[0].value.contacts?.[0];
        const from = msg.from; // Nomor customer
        const msgType = msg.type; // 'text', 'image', 'video', 'document', 'audio', dll
        const msgId = msg.id;

        // 1. Cari akun berdasarkan phone_number_id
        const accResult = await pool.query('SELECT * FROM accounts WHERE wa_phone_number_id = $1 LIMIT 1', [phone_number_id]);
        if (accResult.rows.length === 0) {
          console.warn('Webhook Meta: Akun tidak ditemukan untuk phone_number_id', phone_number_id);
          return res.sendStatus(200);
        }
        const account = accResult.rows[0];

        // 2. Cari atau buat Conversation
        let convResult = await pool.query('SELECT * FROM conversations WHERE account_id = $1 AND customer_phone = $2 LIMIT 1', [account.id, from]);
        let conversation;
        let isNewConversation = false;

        if (convResult.rows.length === 0) {
          const customerName = contact?.profile?.name || from;
          const insertConv = `
            INSERT INTO conversations (account_id, customer_phone, customer_name, unread, handler)
            VALUES ($1, $2, $3, 1, 'ai')
            RETURNING *
          `;
          const newConv = await pool.query(insertConv, [account.id, from, customerName]);
          conversation = newConv.rows[0];
          isNewConversation = true;
        } else {
          conversation = convResult.rows[0];
        }

        // Cek jika tipe pesan adalah media, otomatis ubah handler ke human
        const mediaTypes = ['image', 'video', 'audio', 'document', 'sticker'];
        const isMedia = mediaTypes.includes(msgType);
        let newHandler = conversation.handler;
        
        if (isMedia) {
          newHandler = 'human';
        }

        // 3. Simpan Pesan Masuk
        // Ambil body teks jika ada
        let msgBody = `[${msgType}]`;
        let mediaUrl = null;
        if (msgType === 'text') {
          msgBody = msg.text.body;
        } else if (isMedia) {
          const mediaObj = msg[msgType];
          msgBody = mediaObj?.caption || `[Received ${msgType}]`;
          mediaUrl = mediaObj?.id; // ID media Meta
        }

        const insertMsg = `
          INSERT INTO messages (conversation_id, external_message_id, direction, type, body, media_url)
          VALUES ($1, $2, 'in', $3, $4, $5)
          ON CONFLICT (external_message_id) DO NOTHING
          RETURNING *
        `;
        const savedMsgResult = await pool.query(insertMsg, [conversation.id, msgId, msgType, msgBody, mediaUrl]);

        if (savedMsgResult.rows.length > 0) {
          // Update Conversation last_preview, last_time, unread, dan handler
          const updatedConvResult = await pool.query(`
            UPDATE conversations 
            SET last_preview = $1, last_time = NOW(), unread = unread + 1, handler = $2
            WHERE id = $3
            RETURNING *
          `, [msgBody.substring(0, 50), newHandler, conversation.id]);

          // Emit realtime via Socket.io
          io.to(`account_${account.id}`).emit('new_message', savedMsgResult.rows[0]);
          io.to(`account_${account.id}`).emit('conversation_updated', updatedConvResult.rows[0]);

          // 4. Meneruskan ke N8N JIKA handler adalah AI, BUKAN Media, dan ai_enabled adalah true
          // Jika isMedia = true, kita otomatis human dan TIDAK kirim webhook.
          if (!isMedia && newHandler === 'ai' && account.ai_enabled) {
            const n8nWebhookUrl = account.n8n_webhook_url;
            if (n8nWebhookUrl) {
              try {
                // Teruskan payload asli dari Meta ke N8N secara asinkron (Fire and Forget)
                // HAPUS 'await' agar webhook Meta tidak timeout saat AI loading lama di N8N!
                fetch(n8nWebhookUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    meta_payload: body,
                    conversation_id: conversation.id,
                    account_id: account.id,
                    customer_phone: from
                  })
                }).catch(e => console.error(`Failed to forward webhook to N8N: ${e.message}`));
                
                console.log(`Forwarded incoming message to N8N for account ${account.name}`);
              } catch (e) {
                console.error(`Error initiating webhook to N8N: ${e.message}`);
              }
            }
          }
        }
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (err) {
    console.error("Meta Webhook Error:", err);
    res.sendStatus(500);
  }
});


server.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
