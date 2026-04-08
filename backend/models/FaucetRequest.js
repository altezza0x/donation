const mongoose = require('mongoose');

const faucetRequestSchema = new mongoose.Schema({
  wallet: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  ip: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    default: 0.05
  },
  txHash: {
    type: String,
    required: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('FaucetRequest', faucetRequestSchema);
