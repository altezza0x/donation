const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile');

/*
  POST /api/users
  Body: { wallet, name, email, role, signature }
  Simpan atau update profil user berdasarkan wallet address
*/
router.post('/', async (req, res) => {
  try {
    const { wallet, name, email, role, signature } = req.body;

    if (!wallet || !name) {
      return res.status(400).json({ error: 'wallet dan name wajib diisi' });
    }

    const walletLower = wallet.toLowerCase();

    const doc = await UserProfile.findOneAndUpdate(
      { wallet: walletLower },
      {
        wallet: walletLower,
        name: name.trim(),
        email: (email || '').trim(),
        role: role || 'donor',
        isRegistered: true,
        signature: signature || '',
        updatedAt: Date.now(),
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ success: true, data: doc });
  } catch (err) {
    console.error('POST /api/users error:', err.message);
    res.status(500).json({ error: 'Gagal menyimpan profil user' });
  }
});

/*
  GET /api/users
  Ambil semua profil user
*/
router.get('/', async (req, res) => {
  try {
    const docs = await UserProfile.find({});
    res.json({ success: true, data: docs });
  } catch (err) {
    console.error('GET /api/users error:', err.message);
    res.status(500).json({ error: 'Gagal mengambil data users' });
  }
});

/*
  GET /api/users/:wallet
  Ambil profil user berdasarkan wallet address
*/
router.get('/:wallet', async (req, res) => {
  try {
    const wallet = req.params.wallet.toLowerCase();
    const doc = await UserProfile.findOne({ wallet });

    if (!doc) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    res.json({ success: true, data: doc });
  } catch (err) {
    console.error('GET /api/users error:', err.message);
    res.status(500).json({ error: 'Gagal mengambil data user' });
  }
});

module.exports = router;
