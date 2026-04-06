const express = require('express');
const router = express.Router();
const TxHash = require('../models/TxHash');

/*
  POST /api/tx
  Body: { type: 'campaign'|'donation'|'withdrawal', refId: string, txHash: string }
  
  Contoh refId:
    - campaign   → "8"
    - donation   → "42"
    - withdrawal → "8-1712345678" (campaignId-timestamp)
*/
router.post('/', async (req, res) => {
  try {
    const { type, refId, txHash } = req.body;

    if (!type || !refId || !txHash) {
      return res.status(400).json({ error: 'type, refId, dan txHash wajib diisi' });
    }

    // Upsert: simpan baru, atau perbarui jika sudah ada
    const doc = await TxHash.findOneAndUpdate(
      { type, refId },
      { txHash },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ success: true, data: doc });
  } catch (err) {
    console.error('POST /api/tx error:', err.message);
    res.status(500).json({ error: 'Gagal menyimpan tx hash' });
  }
});

/*
  GET /api/tx/all
  Fetch semua txHash dari database untuk efisiensi load di halaman transparansi.
*/
router.get('/all', async (req, res) => {
  try {
    const docs = await TxHash.find({}, { _id: 0, type: 1, refId: 1, txHash: 1 });
    res.json({ success: true, data: docs });
  } catch (err) {
    console.error('GET /api/tx/all error:', err.message);
    res.status(500).json({ error: 'Gagal mengambil semua tx hash' });
  }
});

/*
  GET /api/tx/:type/:refId
  Contoh: GET /api/tx/campaign/8
          GET /api/tx/donation/42
          GET /api/tx/withdrawal/8-1712345678
*/
router.get('/:type/:refId', async (req, res) => {
  try {
    const { type, refId } = req.params;
    const doc = await TxHash.findOne({ type, refId });

    if (!doc) {
      return res.status(404).json({ error: 'Tx hash tidak ditemukan' });
    }

    res.json({ success: true, txHash: doc.txHash });
  } catch (err) {
    console.error('GET /api/tx error:', err.message);
    res.status(500).json({ error: 'Gagal mengambil tx hash' });
  }
});

module.exports = router;
