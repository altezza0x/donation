const mongoose = require('mongoose');

const syncStateSchema = new mongoose.Schema({
  contractAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  lastSyncedBlock: {
    type: Number, // block number as an integer
    required: true,
    default: 0,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('SyncState', syncStateSchema);
