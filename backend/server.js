require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const txRoutes = require('./routes/tx');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const syncRoutes = require('./routes/sync');
const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  // Izinkan semua device di jaringan lokal (untuk akses dari HP)
  /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
  /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
  // Izinkan domain vercel (production)
  /^https:\/\/.*\.vercel\.app$/,
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Perlu besar untuk base64 gambar

// ── Routes ──────────────────────────────────────────────
app.use('/api/tx', txRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/sync', syncRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    time: new Date().toISOString(),
  });
});

// ── Database ─────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB terhubung');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Backend berjalan di http://localhost:${PORT}`);
      console.log(`   Endpoint: POST/GET /api/tx | POST/GET /api/users | POST /api/upload`);
    });
  })
  .catch((err) => {
    console.error('❌ Gagal koneksi MongoDB:', err.message);
    process.exit(1);
  });
