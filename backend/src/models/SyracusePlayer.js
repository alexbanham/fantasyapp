const mongoose = require('mongoose');

const SyracusePlayerSchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  number: {
    type: String,
    default: null
  },
  position: {
    type: String,
    default: null
  },
  classYear: {
    type: String,
    default: null
  },
  height: {
    type: String,
    default: null
  },
  weight: {
    type: String,
    default: null
  },
  imageUrl: {
    type: String,
    default: null
  },
  playerLink: {
    type: String,
    default: null
  },
  season: {
    type: Number,
    required: true,
    index: true
  },
  stats: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
SyracusePlayerSchema.index({ season: 1, name: 1 });

module.exports = mongoose.model('SyracusePlayer', SyracusePlayerSchema);




