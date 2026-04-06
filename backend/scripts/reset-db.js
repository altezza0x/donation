const mongoose = require('mongoose');
require('dotenv').config();

const UserProfile = require('../models/UserProfile');
const TxHash = require('../models/TxHash');

async function resetDatabase() {
    console.log('--- 🧹 Memulai Pembersihan Database ---');

    if (!process.env.MONGODB_URI) {
        console.error('❌ Error: MONGODB_URI tidak ditemukan di .env');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Terhubung ke MongoDB');

        // Menghapus semua data dari koleksi yang ada
        console.log('⏳ Menghapus riwayat Transaksi...');
        await TxHash.deleteMany({});
        
        console.log('⏳ Menghapus Profil Pengguna...');
        await UserProfile.deleteMany({});

        console.log('✨ Database berhasil dikosongkan!');
        console.log('💡 Sekarang kamu bisa mendeploy kontrak baru dengan aman.');
        
    } catch (err) {
        console.error('❌ Gagal membersihkan database:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Koneksi diputus.');
    }
}

resetDatabase();
