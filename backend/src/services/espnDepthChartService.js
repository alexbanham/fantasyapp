const axios = require('axios');
require('dotenv').config();
class ESPNDepthChartService {
  constructor() {
    this.baseURL = process.env.ESPN_BASE_URL;
    this.timeout = parseInt(process.env.API_TIMEOUT);
    this.retryAttempts = parseInt(process.env.API_RETRY_ATTEMPTS);
    this.retryDelay = parseInt(process.env.API_RETRY_DELAY);
    // Validate required environment variables
    this.validateEnvironment();
    // Rate limiting
    this.rateLimitDelay = 1000; // 1 second between requests
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.maxRequestsPerMinute = 30;
    this.requestWindow = 60000; // 1 minute window
    this.requestTimes = [];
  // Validate required environment variables
  validateEnvironment() {
    const requiredVars = [
      'ESPN_BASE_URL',
      'API_TIMEOUT',
      'API_RETRY_ATTEMPTS',
      'API_RETRY_DELAY'
    ];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      // Always throw error - no fallbacks allowed
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    // Validate numeric values
    if (isNaN(this.timeout) || this.timeout <= 0) {
      throw new Error('API_TIMEOUT must be a positive number');
    }
    if (isNaN(this.retryAttempts) || this.retryAttempts <= 0) {
      throw new Error('API_RETRY_ATTEMPTS must be a positive number');
    }
    if (isNaN(this.retryDelay) || this.retryDelay <= 0) {
      throw new Error('API_RETRY_DELAY must be a positive number');
    }
  }
  // Rate limiting helper
  async enforceRateLimit() {
    const now = Date.now();
    // Clean old request times (older than 1 minute)
    this.requestTimes = this.requestTimes.filter(time => now - time < this.requestWindow);
    // Check if we're at the rate limit
    if (this.requestTimes.length >= this.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = this.requestWindow - (now - oldestRequest) + 1000; // Add 1 second buffer
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    // Enforce minimum delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    // Record this request
    this.requestTimes.push(Date.now());
    this.lastRequestTime = Date.now();
  }
  // Get request headers
  getHeaders() {
    return {
      'User-Agent': 'fantasyapp/1.0',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache'
    };
  // Fetch depth chart for a specific team
  async fetchTeamDepthChart(teamId, season = null) {
    let attempt = 0;
    // Use current season if not provided
    if (!season) {
      season = this.getCurrentSeason();
    while (attempt < this.retryAttempts) {
      try {
        // Enforce rate limiting
        await this.enforceRateLimit();
        // Use the correct ESPN Core API endpoint for depth charts
        const url = `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${season}/teams/${teamId}/depthcharts`;
        const response = await axios.get(url, {
          timeout: this.timeout,
          headers: this.getHeaders()
        });
        if (response.status === 200 && response.data) {
          return this.normalizeDepthChartData(response.data, teamId);
        } else {
          throw new Error(`Invalid response format: ${response.status}`);
      } catch (error) {
        attempt++;
        if (attempt >= this.retryAttempts) {
          throw new Error(`ESPN depth chart API failed after ${this.retryAttempts} attempts: ${error.message}`);
        // Exponential backoff for retries
        const backoffDelay = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
  // Fetch depth charts for all NFL teams
  async fetchAllDepthCharts() {
    const fetchId = `depthchart_${Date.now()}`;
    try {
      // First, get all NFL teams
      const teams = await this.fetchTeams();
      let allDepthCharts = [];
      let successCount = 0;
      let errorCount = 0;
      const totalTeams = teams.length;
      // Fetch depth chart for each team with rate limiting
      for (let i = 0; i < teams.length; i++) {
        const team = teams[i];
        try {
          const depthChart = await this.fetchTeamDepthChart(team.team_id);
          allDepthCharts.push(depthChart);
          successCount++;
          // Small delay to be extra respectful
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          errorCount++;
          // Continue with next team instead of failing completely
          continue;
      return allDepthCharts;
    } catch (error) {
      throw new Error(`Failed to fetch depth charts: ${error.message}`);
  // Fetch NFL teams for depth chart context
  async fetchTeams() {
    let attempt = 0;
    while (attempt < this.retryAttempts) {
      try {
        // Enforce rate limiting
        await this.enforceRateLimit();
        const url = `${this.baseURL}/teams`;
        const response = await axios.get(url, {
          timeout: this.timeout,
          headers: this.getHeaders()
        });
        if (response.status === 200 && response.data?.sports?.[0]?.leagues?.[0]?.teams) {
          const teams = response.data.sports[0].leagues[0].teams;
          return teams.map(team => this.normalizeTeamData(team));
        } else {
          throw new Error(`Invalid response format: ${response.status}`);
      } catch (error) {
        attempt++;
        if (attempt >= this.retryAttempts) {
          throw new Error(`ESPN teams API failed after ${this.retryAttempts} attempts: ${error.message}`);
        // Exponential backoff for retries
        const backoffDelay = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
  // Normalize ESPN depth chart data
  normalizeDepthChartData(espnDepthChart, teamId) {
    try {
      // The ESPN Core API returns a different structure
      const depthCharts = espnDepthChart.items || [];
      const processedDepthChart = {};
      depthCharts.forEach(depthChart => {
        const positions = depthChart.positions || {};
        // Process each position in the depth chart
        Object.entries(positions).forEach(([positionKey, positionData]) => {
          const position = positionData.position?.abbreviation || positionData.position?.displayName || 'UNKNOWN';
          const athletes = positionData.athletes || [];
          // Create depth chart entries for each player
          const depthEntries = athletes.map((athleteData, index) => {
            // The athlete data might be empty or need to be fetched separately
            const athlete = athleteData.athlete || athleteData;
            const rank = athleteData.rank || (index + 1);
            return {
              player_id: athlete?.id?.toString() || null,
              name: athlete?.displayName || athlete?.fullName || `${athlete?.firstName || ''} ${athlete?.lastName || ''}`.trim() || `Player ${rank}`,
              position: position,
              team_id: teamId,
              team_abbreviation: this.getTeamAbbreviationById(teamId.toString()),
              depth_position: rank, // Use the rank from ESPN
              depth_label: this.getDepthLabel(position, rank),
              jersey_number: athlete?.jersey || null,
              injury_status: athlete?.injury?.status || null,
              slot: athleteData.slot || null,
              lastUpdated: new Date()
            };
          });
          // Only add positions that have players
          if (depthEntries.length > 0) {
            processedDepthChart[position] = depthEntries;
        });
      });
      return {
        team_id: teamId,
        team_abbreviation: this.getTeamAbbreviationById(teamId.toString()),
        team_name: this.getTeamAbbreviationById(teamId.toString()),
        depth_chart: processedDepthChart,
        lastUpdated: new Date()
      };
    } catch (error) {
      throw new Error('Failed to normalize depth chart data');
  // Get depth label (WR1, WR2, etc.)
  getDepthLabel(position, depthPosition) {
    const positionMap = {
      'QB': 'QB',
      'RB': 'RB',
      'WR': 'WR',
      'TE': 'TE',
      'K': 'K',
      'P': 'P',
      'LS': 'LS',
      'FB': 'FB',
      'OL': 'OL',
      'DL': 'DL',
      'LB': 'LB',
      'DB': 'DB'
    };
    const normalizedPosition = positionMap[position] || position;
    return `${normalizedPosition}${depthPosition}`;
  // Normalize ESPN team data
  normalizeTeamData(espnTeam) {
    try {
      const team = espnTeam.team;
      return {
        team_id: team.id,
        abbreviation: team.abbreviation,
        display_name: team.displayName,
        name: team.name,
        location: team.location,
        logo: team.logo,
        color: team.color,
        alternate_color: team.alternateColor
      };
    } catch (error) {
      throw new Error('Failed to normalize team data');
  // Get depth chart for a specific player
  async getPlayerDepthPosition(playerId, teamId) {
    try {
      const teamDepthChart = await this.fetchTeamDepthChart(teamId);
      // Search through all positions for the player
      for (const [position, players] of Object.entries(teamDepthChart.depth_chart)) {
        const player = players.find(p => p.player_id === playerId.toString());
        if (player) {
          return {
            player_id: player.player_id,
            name: player.name,
            position: player.position,
            team: player.team_abbreviation,
            depth_position: player.depth_position,
            depth_label: player.depth_label,
            jersey_number: player.jersey_number,
            injury_status: player.injury_status,
            lastUpdated: player.lastUpdated
          };
      return null; // Player not found in depth chart
    } catch (error) {
      throw new Error(`Failed to get depth position: ${error.message}`);
  // Get team abbreviation by ESPN team ID
  getTeamAbbreviationById(teamId) {
    const teamMap = {
      '1': 'ARI', '2': 'ATL', '3': 'BAL', '4': 'BUF', '5': 'CAR', '6': 'CHI',
      '7': 'CIN', '8': 'CLE', '9': 'DAL', '10': 'DEN', '11': 'DET', '12': 'GB',
      '13': 'HOU', '14': 'IND', '15': 'JAX', '16': 'KC', '17': 'LV', '18': 'LAC',
      '19': 'LAR', '20': 'MIA', '21': 'MIN', '22': 'NE', '23': 'NO', '24': 'NYG',
      '25': 'NYJ', '26': 'PHI', '27': 'PIT', '28': 'SF', '29': 'SEA', '30': 'TB',
      '31': 'TEN', '32': 'WAS'
    };
    return teamMap[teamId] || null;
  // Get current NFL season
  getCurrentSeason() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    // NFL season typically starts in September
    if (month >= 9) {
      return year;
    } else {
      return year - 1;
  // Get current rate limit status
  getRateLimitStatus() {
    const now = Date.now();
    const recentRequests = this.requestTimes.filter(time => now - time < this.requestWindow);
    return {
      requestsInLastMinute: recentRequests.length,
      maxRequestsPerMinute: this.maxRequestsPerMinute,
      timeUntilReset: recentRequests.length > 0 ? this.requestWindow - (now - Math.min(...recentRequests)) : 0,
      canMakeRequest: recentRequests.length < this.maxRequestsPerMinute
    };
module.exports = new ESPNDepthChartService();