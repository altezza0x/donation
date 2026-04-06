const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// S3 Client Setup (Hanya jalan jika R2 sudah di-setup di .env)
const isR2Configured = process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME;

let s3Client;
if (isR2Configured) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  console.log('☁️ Cloudflare R2 Uploader: AKTIF');
} else {
  console.log('📂 Local Uploader: AKTIF (Fallback, R2 belum di-setup di .env)');
}

const UPLOAD_DIR = path.join(__dirname, '../../frontend/public/uploads');
if (!isR2Configured && !fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const getContentType = (ext) => {
  const map = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
  return map[ext.toLowerCase()] || 'application/octet-stream';
};

/*
  POST /api/upload
  Menerima gambar base64, menyimpannya ke Cloudflare R2 (atau lokal)
*/
router.post('/', async (req, res) => {
  try {
    const { image, ext } = req.body;
    if (!image || !ext) return res.status(400).json({ error: 'image dan ext wajib diisi' });

    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    if (!allowedExts.includes(ext.toLowerCase())) return res.status(400).json({ error: 'Format tidak didukung' });

    // Cek max 2MB
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > 2 * 1024 * 1024) return res.status(400).json({ error: 'Ukuran file melebihi 2MB' });

    const filename = `camp-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    if (isR2Configured) {
      // ☁️ UPLOAD KE CLOUDFLARE R2
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: filename,
        Body: buffer,
        ContentType: getContentType(ext),
      }));
      
      const publicUrl = process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT;
      // Hapus trailing slash jika ada agar rapi
      const baseUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
      res.json({ success: true, url: `${baseUrl}/${filename}` });
      
    } else {
      // 📂 UPLOAD KE LOCAL FOLDER (Fallback)
      const filepath = path.join(UPLOAD_DIR, filename);
      fs.writeFileSync(filepath, buffer);
      res.json({ success: true, url: `/uploads/${filename}` });
    }
  } catch (err) {
    console.error('POST /api/upload error:', err);
    res.status(500).json({ error: 'Gagal mengunggah gambar' });
  }
});

module.exports = router;
