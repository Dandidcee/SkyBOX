const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Mengizinkan semua origin untuk dipanggil dari frontend kita
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Root endpoint test
app.get('/', (req, res) => {
  res.send('Ongkir Backend is Running!');
});

app.listen(PORT, () => {
  console.log(`Server ongkir berjalan di http://localhost:${PORT}`);
});
