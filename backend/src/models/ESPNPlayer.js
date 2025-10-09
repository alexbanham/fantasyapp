const mongoose = require('mongoose');

const ESPNPlayerSchema = new mongoose.Schema({
  espn_id: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  first_name: String,
  last_name: String,
  position: {
    type: String,
    required: true,
    index: true
  },
  pro_team_id: {
    type: String,
    index: true
  },
  jersey_number: Number,
  headshot_url: String,
  roster_status: {
    type: String,
    enum: ['free_agent', 'rostered', 'unknown'],
    default: 'unknown',
    index: true
  },
  fantasy_team_id: {
    type: Number,
    default: null,
    index: true
  },
  fantasy_team_name: {
    type: String,
    default: null
  },
  weekly_projections: {
    type: Map,
    of: {
      std: { type: Number, default: null },
      ppr: { type: Number, default: null },
      half: { type: Number, default: null },
      last_updated: { type: Date, default: Date.now }
    },
    default: () => new Map()
  },
  weekly_actuals: {
    type: Map,
    of: {
      std: { type: Number, default: null },
      ppr: { type: Number, default: null },
      half: { type: Number, default: null },
      last_updated: { type: Date, default: Date.now }
    },
    default: () => new Map()
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  last_updated: {
    type: Date,
    default: Date.now,
    index: true
  }
});

ESPNPlayerSchema.index({ position: 1 });
ESPNPlayerSchema.index({ pro_team_id: 1 });
ESPNPlayerSchema.index({ name: 1 });

ESPNPlayerSchema.statics.findByPosition = function(position) {
  return this.find({ position }).sort({ name: 1 });
};

ESPNPlayerSchema.statics.findByTeam = function(team) {
  return this.find({ pro_team_id: team }).sort({ position: 1, name: 1 });
};

ESPNPlayerSchema.statics.findFreeAgents = function() {
  return this.find({ roster_status: 'free_agent' }).sort({ name: 1 });
};

ESPNPlayerSchema.statics.findRosteredPlayers = function() {
  return this.find({ roster_status: 'rostered' }).sort({ fantasy_team_name: 1, name: 1 });
};

ESPNPlayerSchema.statics.findByRosterStatus = function(status) {
  return this.find({ roster_status: status }).sort({ name: 1 });
};

ESPNPlayerSchema.methods.updateWeeklyProjections = function(week, projections) {
  this.weekly_projections.set(week.toString(), {
    std: projections.std,
    ppr: projections.ppr,
    half: projections.half,
    last_updated: new Date()
  });
  this.last_updated = new Date();
  return this.save();
};

ESPNPlayerSchema.methods.getProjectionsForWeek = function(week) {
  return this.weekly_projections.get(week.toString()) || null;
};

module.exports = mongoose.model('ESPNPlayer', ESPNPlayerSchema);