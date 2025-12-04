const mongoose = require('mongoose');

const SyracuseGameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  date: {
    type: String,
    required: true
  },
  opponent: {
    type: String,
    required: true
  },
  opponentTeamId: {
    type: Number,
    default: null
  },
  location: {
    type: String,
    default: 'Home'
  },
  isHome: {
    type: Boolean,
    default: true
  },
  result: {
    type: String,
    default: null
  },
  score: {
    syracuse: {
      type: Number,
      default: null
    },
    opponent: {
      type: Number,
      default: null
    }
  },
  isWin: {
    type: Boolean,
    default: null
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'final'],
    default: 'scheduled'
  },
  season: {
    type: Number,
    required: true,
    index: true
  },
  gameLink: {
    type: String,
    default: null
  },
  boxScore: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
SyracuseGameSchema.index({ season: 1, date: -1 });
SyracuseGameSchema.index({ status: 1 });

module.exports = mongoose.model('SyracuseGame', SyracuseGameSchema);

