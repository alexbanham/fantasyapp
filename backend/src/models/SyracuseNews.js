const mongoose = require('mongoose');

const SyracuseNewsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  summary: {
    type: String,
    default: null
  },
  imageUrl: {
    type: String,
    default: null
  },
  publishedDate: {
    type: Date,
    required: true,
    index: true
  },
  source: {
    type: String,
    default: 'ESPN'
  },
  content: {
    type: String,
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
SyracuseNewsSchema.index({ publishedDate: -1 });
SyracuseNewsSchema.index({ source: 1 });

module.exports = mongoose.model('SyracuseNews', SyracuseNewsSchema);







