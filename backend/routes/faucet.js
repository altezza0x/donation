const express = require('express');
const router = express.Router();
const FaucetRequest = require('../models/FaucetRequest');
const { createWalletClient, http, parseEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { sepolia } = require('viem/chains');

// Inisialisasi Admin Wallet
const privateKey = process.env.FAUCET_PRIVATE_KEY;
const rpcUrl = process.env.SEPOLIA_RPC_URL;

if (!privateKey || !rpcUrl) {
  console.error('[FAUCET] ERROR: FAUCET_PRIVATE_KEY atau SEPOLIA_RPC_URL belum dikonfigurasi di .env!');
}

const account = privateKey ? privateKeyToAccount(`0x${privateKey.replace(/^0x/, '')}`) : null;
const walletClient = account ? createWalletClient({
  account,
  chain: sepolia,
  transport: http(rpcUrl)
}) : null;

// Konfigurasi Faucet
const FAUCET_AMOUNT_ETH = '0.05';

router.post('/eth', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress harus disertakan dalam body' });
    }

    if (!walletClient) {
      return res.status(500).json({ error: 'Server belum dikonfigurasi untuk faucet (wallet missing)' });
    }

    const addr = walletAddress.toLowerCase();

    // 1. Cek Apakah Wallet Sudah Pernah Klaim
    const existingWalletReq = await FaucetRequest.findOne({ wallet: addr });
    if (existingWalletReq) {
      return res.status(400).json({ error: 'Address ini sudah pernah mengambil faucet ETH. Klaim hanya diperbolehkan satu kali.' });
    }

    // 2. Cek Apakah IP Sudah Pernah Klaim
    const existingIpReq = await FaucetRequest.findOne({ ip });
    if (existingIpReq) {
      return res.status(400).json({ error: 'Satu koneksi internet hanya diperbolehkan melakukan klaim satu kali faucet ETH.' });
    }

    // 3. Kirim ETH melalui Viem
    console.log(`[FAUCET] Mengirim ${FAUCET_AMOUNT_ETH} Sepolia ETH ke ${addr}...`);
    
    const hash = await walletClient.sendTransaction({
      to: addr,
      value: parseEther(FAUCET_AMOUNT_ETH)
    });

    // 4. Simpan riwayat klaim ke DB
    const newReq = new FaucetRequest({
      wallet: addr,
      ip: ip,
      amount: parseFloat(FAUCET_AMOUNT_ETH),
      txHash: hash
    });
    await newReq.save();

    res.json({
      success: true,
      message: `🎉 Berhasil! ${FAUCET_AMOUNT_ETH} Sepolia ETH sedang dikirim.`,
      txHash: hash,
      amount: FAUCET_AMOUNT_ETH
    });

  } catch (err) {
    console.error('[FAUCET] Error saat klaim:', err);
    res.status(500).json({ 
      error: 'Terjadi kesalahan saat memproses pengiriman ETH.',
      details: err.message 
    });
  }
});

module.exports = router;
