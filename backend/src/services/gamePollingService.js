const cron = require('node-cron');
const Game = require('../models/Game');
const Config = require('../models/Config');
const espnService = require('../services/espnService');
const boxscoreSync = require('./boxscoreSync');

class GamePollingService {
  constructor() {
    this.isPolling = false;
    this.pollInterval = parseInt(process.env.GAME_POLL_ACTIVE_INTERVAL);
    this.idleInterval = parseInt(process.env.GAME_POLL_IDLE_INTERVAL);
    this.currentInterval = this.idleInterval;
    this.pollTimer = null;
    this.lastPollTime = null;
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = parseInt(process.env.GAME_POLL_MAX_CONSECUTIVE_ERRORS);
    
    // Boxscore sync settings
    this.lastBoxscoreSyncTime = null;
    // Configurable boxscore sync interval (default: 2 minutes when games are live)
    this.boxscoreSyncInterval = parseInt(process.env.BOXSCORE_SYNC_INTERVAL) || (2 * 60 * 1000);
    this.boxscoreSyncInProgress = false;
    
    // Validate required environment variables
    this.validateEnvironment();
  }
  // Validate required environment variables
  validateEnvironment() {
    const requiredVars = [
      'GAME_POLL_ACTIVE_INTERVAL',
      'GAME_POLL_IDLE_INTERVAL',
      'GAME_POLL_MAX_CONSECUTIVE_ERRORS'
    ];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      // Always throw error - no fallbacks allowed
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    // Validate numeric values
    if (isNaN(this.pollInterval) || this.pollInterval <= 0) {
      throw new Error('GAME_POLL_ACTIVE_INTERVAL must be a positive number');
    }
    if (isNaN(this.idleInterval) || this.idleInterval <= 0) {
      throw new Error('GAME_POLL_IDLE_INTERVAL must be a positive number');
    }
    if (isNaN(this.maxConsecutiveErrors) || this.maxConsecutiveErrors <= 0) {
      throw new Error('GAME_POLL_MAX_CONSECUTIVE_ERRORS must be a positive number');
    }
  }
  // Start polling service
  async start() {
    if (this.isPolling) {
      return;
    }
    // Check if polling is enabled in config
    const configEnabled = await this.isPollingEnabled();
    if (!configEnabled) {
      return;
    }
    this.isPolling = true;
    this.poll();
    // Schedule regular polling
    this.schedulePolling();
  }
  // Stop polling service
  stop() {
    if (!this.isPolling) {
      return;
    }
    this.isPolling = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
  // Schedule next poll based on current game status
  schedulePolling() {
    if (!this.isPolling) return;
    // Determine polling interval based on live games
    this.currentInterval = this.shouldPollFrequently() ? this.pollInterval : this.idleInterval;
    this.pollTimer = setTimeout(() => {
      this.poll();
    }, this.currentInterval);
  }
  // Check if we should poll frequently (during active games)
  shouldPollFrequently() {
    const now = new Date();
    const gameTime = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // 2 hours from now
    // Poll frequently if there are live games or games starting soon
    return Game.countDocuments({
      $or: [
        { status: 'in', isLive: true },
        { 
          status: 'scheduled', 
          date: { $gte: now, $lte: gameTime } 
        }
      ]
    }).then(count => count > 0);
  }
  // Check if polling is enabled in config
  async isPollingEnabled() {
    try {
      const config = await Config.getConfig();
      return config.pollingEnabled;
    } catch (error) {
      return false; // Default to disabled if config check fails
    }
  }
  // Main polling function
  async poll() {
    if (!this.isPolling) return;
    // Check if polling is enabled in config
    const configEnabled = await this.isPollingEnabled();
    if (!configEnabled) {
      this.stop();
      return;
    }
    try {
      // Get current week info from config database
      const config = await Config.getConfig();
      const weekInfo = {
        week: config.currentWeek,
        season: config.currentSeason
      };
      // Fetch scoreboard data
      const games = await espnService.fetchScoreboard(weekInfo.week, weekInfo.season);
      // Process each game
      let updatedCount = 0;
      let newCount = 0;
      let hasLiveGames = false;
      
      for (const gameData of games) {
        try {
          const result = await this.processGame(gameData);
          if (result.isNew) {
            newCount++;
          } else if (result.isUpdated) {
            updatedCount++;
          }
          // Check if this game is live
          if (gameData.isLive || gameData.status === 'in') {
            hasLiveGames = true;
          }
        } catch (error) {
          console.error('Error processing game:', error);
        }
      }
      
      // If there are live games, sync boxscores to update player scores and projections
      if (hasLiveGames) {
        await this.syncBoxscoresIfNeeded(weekInfo.season, weekInfo.week);
      }
      
      // Cleanup: Mark old games as not live if they haven't been updated recently
      await this.cleanupOldLiveGames();
      // Reset error counter on successful poll
      this.consecutiveErrors = 0;
      this.lastPollTime = new Date();
    } catch (error) {
      console.error('[GamePolling] Error in poll:', error);
      this.consecutiveErrors++;
      // Don't stop completely, just use longer intervals
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        this.consecutiveErrors = 0; // Reset counter but keep polling
        this.currentInterval = this.idleInterval; // Use configured idle interval
      } else {
        // Use longer interval on errors
        this.currentInterval = Math.min(this.currentInterval * 2, this.idleInterval); // Max idle interval
      }
    }
    // Schedule next poll
    this.schedulePolling();
  }
  
  // Sync boxscores if enough time has passed since last sync
  async syncBoxscoresIfNeeded(season, week) {
    // Don't sync if already in progress
    if (this.boxscoreSyncInProgress) {
      return;
    }
    
    const now = new Date();
    const timeSinceLastSync = this.lastBoxscoreSyncTime 
      ? now - this.lastBoxscoreSyncTime 
      : Infinity;
    
    // Sync if enough time has passed (or never synced)
    if (timeSinceLastSync >= this.boxscoreSyncInterval) {
      this.boxscoreSyncInProgress = true;
      try {
        console.log(`[GamePolling] Syncing boxscores for week ${week}, season ${season}...`);
        const result = await boxscoreSync.syncWeek(season, week);
        
        if (result.success) {
          console.log(`[GamePolling] Boxscore sync successful: ${result.playerLines} player lines, ${result.teamTotals} team totals`);
          this.lastBoxscoreSyncTime = now;
        } else {
          console.error(`[GamePolling] Boxscore sync failed: ${result.error}`);
        }
      } catch (error) {
        console.error('[GamePolling] Error syncing boxscores:', error);
      } finally {
        this.boxscoreSyncInProgress = false;
      }
    }
  }
  // Process individual game data
  async processGame(gameData) {
    try {
      // Generate hash for change detection
      const dataHash = espnService.generateGameHash(gameData);
      // Check if game exists
      const existingGame = await Game.findOne({ eventId: gameData.eventId });
      if (!existingGame) {
        // New game
        const newGame = new Game({
          ...gameData,
          dataHash
        });
        await newGame.save();
        return { isNew: true, isUpdated: false };
      }
      // Check if data has changed
      if (existingGame.dataHash === dataHash) {
        // No changes, just update lastUpdated timestamp
        existingGame.lastUpdated = new Date();
        await existingGame.save();
        return { isNew: false, isUpdated: false };
      }
      // Data has changed, update the game
      Object.assign(existingGame, gameData, { dataHash });
      await existingGame.save();
      return { isNew: false, isUpdated: true };
    } catch (error) {
      throw error;
    }
  }
  // Restart polling service
  restart() {
    this.stop();
    setTimeout(() => {
      this.start();
    }, 1000);
  }
  // Start polling service without config check (for config route)
  async startForced() {
    if (this.isPolling) {
      return;
    }
    this.isPolling = true;
    this.poll();
    // Schedule regular polling
    this.schedulePolling();
  }
  // Manual poll trigger (for testing)
  async manualPoll() {
    await this.poll();
  }
  // Cleanup old live games
  async cleanupOldLiveGames() {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const result = await Game.updateMany(
        { 
          isLive: true, 
          lastUpdated: { $lt: thirtyMinutesAgo } 
        },
        { 
          $set: { isLive: false } 
        }
      );
      if (result.modifiedCount > 0) {
        console.log(`Marked ${result.modifiedCount} games as not live`);
      }
    } catch (error) {
      console.error('Error cleaning up old live games:', error);
    }
  }
  // Get polling status
  getStatus() {
    return {
      isPolling: this.isPolling,
      currentInterval: this.currentInterval,
      lastPollTime: this.lastPollTime,
      consecutiveErrors: this.consecutiveErrors,
      nextPollIn: this.pollTimer ? this.currentInterval : null,
      lastBoxscoreSyncTime: this.lastBoxscoreSyncTime,
      boxscoreSyncInProgress: this.boxscoreSyncInProgress
    };
  }
  
  // Force a boxscore sync (for manual triggers)
  async forceBoxscoreSync(season, week) {
    if (this.boxscoreSyncInProgress) {
      return { success: false, error: 'Boxscore sync already in progress' };
    }
    
    this.boxscoreSyncInProgress = true;
    try {
      const result = await boxscoreSync.syncWeek(season, week);
      if (result.success) {
        this.lastBoxscoreSyncTime = new Date();
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      this.boxscoreSyncInProgress = false;
    }
  }
}
// Create singleton instance
const gamePollingService = new GamePollingService();
// Export for use in other modules
module.exports = gamePollingService;
// Auto-start if this file is run directly
if (require.main === module) {
  gamePollingService.start();
}