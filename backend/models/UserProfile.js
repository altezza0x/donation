const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  wallet: {
    type: String,
    required: true,
    unique: true,
    lowercase: true, // simpan selalu lowercase agar tidak case-sensitive
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    default: '',
  },
  role: {
    type: String,
    enum: ['donor', 'recipient'],
    default: 'donor',
  },
  isRegistered: {
    type: Boolean,
    default: true,
  },
  signature: {
    type: String,
    default: '',
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt setiap kali ada perubahan
userProfileSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('UserProfile', userProfileSchema);
