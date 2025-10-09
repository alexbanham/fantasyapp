const mongoose = require('mongoose');

const ESPNWeekSchema = new mongoose.Schema({
  season: {
    type: Number,
    required: true,
    index: true
  },
  week: {
    type: Number,
    required: true,
    index: true
  },
  scoring_period_id: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: function() {
      return `${this.season}_${this.week}`;
    }
  },
  start_date: Date,
  end_date: Date,
  is_playoffs: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  last_updated: {
    type: Date,
    default: Date.now
  }
});

ESPNWeekSchema.index({ season: 1, week: 1 });

ESPNWeekSchema.statics.findBySeason = function(season) {
  return this.find({ season }).sort({ week: 1 });
};

ESPNWeekSchema.statics.findByWeek = function(season, week) {
  return this.findOne({ season, week });
};

module.exports = mongoose.model('ESPNWeek', ESPNWeekSchema);