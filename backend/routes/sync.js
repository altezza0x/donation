const express = require('express');
const router = express.Router();
const TxHash = require('../models/TxHash');
const SyncState = require('../models/SyncState');
const { createPublicClient, http, parseAbiItem } = require('viem');
const { sepolia } = require('viem/chains');

// Minimal ABI for the events we want to track
const eventsAbi = [
  parseAbiItem('event CampaignCreated(uint256 indexed campaignId, address indexed owner, string title, uint256 targetAmount, uint256 deadline)'),
  parseAbiItem('event DonationMade(uint256 indexed donationId, uint256 indexed campaignId, address indexed donor, uint256 amount, uint256 timestamp)'),
  parseAbiItem('event FundsWithdrawn(uint256 indexed campaignId, address indexed recipient, uint256 amount, uint256 timestamp)')
];

router.post('/', async (req, res) => {
  try {
    const rpcUrl = req.body.rpcUrl || 'https://ethereum-sepolia-rpc.publicnode.com'; // fallback public RPC
    const contractAddress = req.body.contractAddress;

    if (!contractAddress) {
      return res.status(400).json({ error: 'contractAddress must be provided in body' });
    }

    const client = createPublicClient({
      chain: sepolia,
      transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
    });

    console.log(`[SYNC] Memulai sinkronisasi blockchain dari contract ${contractAddress}`);

    // --- CHECKPOINTING ---
    const DEFAULT_START_BLOCK = 5570000n; // Sepolia block waktu contract di-deploy
    let syncState = await SyncState.findOne({ contractAddress: contractAddress.toLowerCase() });
    
    let fromBlock = DEFAULT_START_BLOCK;
    if (syncState && BigInt(syncState.lastSyncedBlock) > DEFAULT_START_BLOCK) {
      fromBlock = BigInt(syncState.lastSyncedBlock) + 1n; // Mulai dari blok setelahnya
    }

    const latestBlock = await client.getBlockNumber();
    
    // Jika tidak ada blok baru, langsung return
    if (fromBlock > latestBlock) {
       return res.json({ success: true, message: 'Blockchain sudah sinkron.', stats: { found: 0, latestBlock: latestBlock.toString() } });
    }

    console.log(`[SYNC] Memindai dari blok ${fromBlock.toString()} sampai ${latestBlock.toString()}`);

    // --- PARALLEL FETCHING ---
    const allEventsPromises = eventsAbi.map(eventAbi => 
       client.getLogs({
         address: contractAddress,
         event: eventAbi,
         fromBlock: fromBlock,
         toBlock: latestBlock
       }).catch(e => {
         console.warn(`[SYNC] Error fetching logs for event:`, e.message);
         return [];
       })
    );

    const [campaignLogs, donationLogs, withdrawalLogs] = await Promise.all(allEventsPromises);
    
    console.log(`[SYNC] Ditemukan: ${campaignLogs.length} kampanye, ${donationLogs.length} donasi, ${withdrawalLogs.length} penarikan.`);

    // --- BULK DATABASE UPDATES ---
    const bulkOps = [];

    // Campaigns
    for (const log of campaignLogs) {
      if (!log.args || !log.args.campaignId) continue;
      bulkOps.push({
        updateOne: {
          filter: { type: 'campaign', refId: log.args.campaignId.toString() },
          update: { txHash: log.transactionHash },
          upsert: true
        }
      });
    }

    // Donations
    for (const log of donationLogs) {
      if (!log.args || !log.args.donationId) continue;
      bulkOps.push({
        updateOne: {
          filter: { type: 'donation', refId: log.args.donationId.toString() },
          update: { txHash: log.transactionHash },
          upsert: true
        }
      });
    }

    // Withdrawals
    for (const log of withdrawalLogs) {
      if (!log.args || !log.args.campaignId || !log.args.timestamp) continue;
      const refId = `${log.args.campaignId.toString()}-${log.args.timestamp.toString()}`;
      bulkOps.push({
        updateOne: {
          filter: { type: 'withdrawal', refId: refId },
          update: { txHash: log.transactionHash },
          upsert: true
        }
      });
    }

    if (bulkOps.length > 0) {
      await TxHash.bulkWrite(bulkOps);
    }

    // --- UPDATE CHECKPOINT ---
    await SyncState.findOneAndUpdate(
      { contractAddress: contractAddress.toLowerCase() },
      { lastSyncedBlock: Number(latestBlock), updatedAt: new Date() },
      { upsert: true }
    );

    console.log(`[SYNC] Selesai. Blok terakhir: ${latestBlock.toString()}`);

    res.json({ 
      success: true, 
      stats: {
        totalFound: campaignLogs.length + donationLogs.length + withdrawalLogs.length,
        campaigns: campaignLogs.length,
        donations: donationLogs.length,
        withdrawals: withdrawalLogs.length,
        syncedToBlock: latestBlock.toString()
      } 
    });

  } catch (err) {
    console.error('[SYNC] Gagal menyinkronkan:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat menyinkronkan data dengan blockchain', message: err.message });
  }
});

module.exports = router;
