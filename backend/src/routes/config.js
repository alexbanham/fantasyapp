const express = require('express');
const router = express.Router();
const Config = require('../models/Config');
const gamePollingService = require('../services/gamePollingService');
// POST /api/config/verify-password - Verify admin password
router.post('/verify-password', async (req, res) => {
  try {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      // If no password is set in env, allow access (development mode)
      res.json({
        success: true,
        verified: true,
        message: 'Password verification disabled'
      });
      return;
    }
    
    if (!password) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'Password required',
        message: 'Please provide a password'
      });
    }
    
    if (password === adminPassword) {
      res.json({
        success: true,
        verified: true,
        message: 'Password verified'
      });
    } else {
      res.status(401).json({
        success: false,
        verified: false,
        error: 'Invalid password',
        message: 'Incorrect password'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      verified: false,
      error: 'Failed to verify password',
      message: error.message
    });
  }
});

// GET /api/config - Get current configuration
router.get('/', async (req, res) => {
  try {
    const config = await Config.getConfig();
    res.json({
      success: true,
      data: {
        currentWeek: config.currentWeek,
        currentSeason: config.currentSeason,
        scoringType: config.scoringType,
        isInSeason: config.isInSeason,
        pollingEnabled: config.pollingEnabled,
        lastUpdated: config.lastUpdated
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration',
      message: error.message
    });
  }
});
// PUT /api/config/week - Update current week
router.put('/week', async (req, res) => {
  try {
    const { week } = req.body;
    if (!week || typeof week !== 'number' || week < 1 || week > 18) {
      return res.status(400).json({
        success: false,
        error: 'Invalid week',
        message: 'Week must be a number between 1 and 18'
      });
    }
    const config = await Config.updateConfig({ currentWeek: week });
    res.json({
      success: true,
      message: `Current week updated to ${week}`,
      data: {
        currentWeek: config.currentWeek,
        currentSeason: config.currentSeason,
        scoringType: config.scoringType,
        isInSeason: config.isInSeason,
        pollingEnabled: config.pollingEnabled,
        lastUpdated: config.lastUpdated
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update week',
      message: error.message
    });
  }
});
// PUT /api/config/season - Update current season
router.put('/season', async (req, res) => {
  try {
    const { season } = req.body;
    if (!season || typeof season !== 'number' || season < 2020 || season > 2030) {
      return res.status(400).json({
        success: false,
        error: 'Invalid season',
        message: 'Season must be a number between 2020 and 2030'
      });
    }
    const config = await Config.updateConfig({ currentSeason: season });
    res.json({
      success: true,
      message: `Current season updated to ${season}`,
      data: {
        currentWeek: config.currentWeek,
        currentSeason: config.currentSeason,
        scoringType: config.scoringType,
        isInSeason: config.isInSeason,
        pollingEnabled: config.pollingEnabled,
        lastUpdated: config.lastUpdated
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update season',
      message: error.message
    });
  }
});
// PUT /api/config/scoring - Update scoring type
router.put('/scoring', async (req, res) => {
  try {
    const { scoringType } = req.body;
    if (!scoringType || !['STD', 'PPR', 'HALF'].includes(scoringType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scoring type',
        message: 'Scoring type must be STD, PPR, or HALF'
      });
    }
    const config = await Config.updateConfig({ scoringType });
    res.json({
      success: true,
      message: `Scoring type updated to ${scoringType}`,
      data: {
        currentWeek: config.currentWeek,
        currentSeason: config.currentSeason,
        scoringType: config.scoringType,
        isInSeason: config.isInSeason,
        pollingEnabled: config.pollingEnabled,
        lastUpdated: config.lastUpdated
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update scoring type',
      message: error.message
    });
  }
});
// POST /api/config/auto-update - Auto-update current week based on NFL schedule
router.post('/auto-update', async (req, res) => {
  try {
    // Get current config first
    const currentConfig = await Config.getConfig();
    // Simple logic to determine current week based on date
    // In a real implementation, this would check against NFL schedule
    const now = new Date();
    const seasonStart = new Date(currentConfig.currentSeason, 8, 1); // September 1st
    const weeksSinceStart = Math.floor((now - seasonStart) / (7 * 24 * 60 * 60 * 1000));
    let newWeek = Math.max(1, Math.min(18, weeksSinceStart + 1));
    let isInSeason = true;
    // Don't update if we're in the off-season
    if (now < seasonStart || now > new Date(currentConfig.currentSeason + 1, 1, 1)) {
      isInSeason = false;
      newWeek = 1;
    }
    const config = await Config.updateConfig({ 
      currentWeek: newWeek, 
      isInSeason 
    });
    res.json({
      success: true,
      message: `Week auto-updated to ${newWeek}`,
      data: {
        currentWeek: config.currentWeek,
        currentSeason: config.currentSeason,
        scoringType: config.scoringType,
        isInSeason: config.isInSeason,
        pollingEnabled: config.pollingEnabled,
        lastUpdated: config.lastUpdated
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to auto-update week',
      message: error.message
    });
  }
});
// PUT /api/config/polling - Toggle polling enabled/disabled
router.put('/polling', async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Invalid polling state',
        message: 'enabled must be a boolean value'
      });
    }
    // Get current config to check if polling state is actually changing
    const currentConfig = await Config.getConfig();
    const isCurrentlyEnabled = currentConfig.pollingEnabled;
    // Update the config
    const config = await Config.updateConfig({ pollingEnabled: enabled });
    // Start or stop the polling service based on the new state
    if (enabled && !isCurrentlyEnabled) {
      // Starting polling service
      await gamePollingService.startForced();
    } else if (!enabled && isCurrentlyEnabled) {
      // Stopping polling service
      gamePollingService.stop();
    }
    res.json({
      success: true,
      message: `Polling ${enabled ? 'enabled' : 'disabled'}`,
      data: {
        currentWeek: config.currentWeek,
        currentSeason: config.currentSeason,
        scoringType: config.scoringType,
        isInSeason: config.isInSeason,
        pollingEnabled: config.pollingEnabled,
        lastUpdated: config.lastUpdated
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update polling state',
      message: error.message
    });
  }
});
// GET /api/config/sync-status - Get sync status information
router.get('/sync-status', async (req, res) => {
  try {
    const config = await Config.getConfig();
    res.json({
      success: true,
      data: {
        lastSync: config.lastUpdated,
        currentWeek: config.currentWeek,
        currentSeason: config.currentSeason,
        scoringType: config.scoringType,
        isInSeason: config.isInSeason,
        syncStatus: {
          players: 'up_to_date',
          projections: 'up_to_date',
          games: 'up_to_date'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status',
      message: error.message
    });
  }
});
module.exports = router;
