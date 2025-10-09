const mongoose = require('mongoose');

const FantasyPlayerSchema = new mongoose.Schema({
  player_id: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  full_name: {
    type: String,
    default: null
  },
  default_pos_id: {
    type: Number,
    default: null
  },
  last_updated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FantasyPlayer', FantasyPlayerSchema);

