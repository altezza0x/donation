const mongoose = require('mongoose');

const txHashSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['campaign', 'donation', 'withdrawal'],
    required: true,
  },
  // ID unik per tipe:
  // campaign   → campaignId
  // donation   → donationId
  // withdrawal → campaignId + timestamp (digabung jadi key)
  refId: {
    type: String,
    required: true,
  },
  txHash: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Pastikan kombinasi type + refId unik
txHashSchema.index({ type: 1, refId: 1 }, { unique: true });

module.exports = mongoose.model('TxHash', txHashSchema);
