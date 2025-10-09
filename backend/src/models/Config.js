const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  currentWeek: {
    type: Number,
    required: true,
    min: 1,
    max: 18,
    default: 1
  },
  currentSeason: {
    type: Number,
    required: true,
    min: 2020,
    max: 2030,
    default: new Date().getFullYear()
  },
  scoringType: {
    type: String,
    required: true,
    enum: ['STD', 'PPR', 'HALF'],
    default: 'PPR'
  },
  isInSeason: {
    type: Boolean,
    required: true,
    default: true
  },
  pollingEnabled: {
    type: Boolean,
    required: true,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure only one config document exists
configSchema.statics.getConfig = async function() {
  let config = await this.findOne();
  if (!config) {
    config = new this({
      currentWeek: 1,
      currentSeason: new Date().getFullYear(),
      scoringType: 'PPR',
      isInSeason: true
    });
    await config.save();
  }
  return config;
};

configSchema.statics.updateConfig = async function(updates) {
  let config = await this.findOne();
  if (!config) {
    config = new this(updates);
  } else {
    Object.assign(config, updates);
    config.lastUpdated = new Date();
  }
  await config.save();
  return config;
};

module.exports = mongoose.model('Config', configSchema);
