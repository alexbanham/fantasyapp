const mongoose = require('mongoose');
require('dotenv').config();
const ESPNPlayer = require('../models/ESPNPlayer');
const espnService = require('../services/espnService');
async function updateTeamNames(dryRun = true) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    // Get current week info
    const weekInfo = espnService.getCurrentWeek();
    // Fetch league data to get team names
    const leagueData = await espnService.getComprehensiveLeagueData(weekInfo.season, weekInfo.week);
    if (!leagueData.success || !leagueData.teams) {
      process.exit(1);
    // Create a map of team IDs to team names
    const teamNameMap = new Map();
    leagueData.teams.forEach(team => {
      teamNameMap.set(team.teamId, team.name);
    });
    // Get all rostered players from database
    const rosteredPlayers = await ESPNPlayer.find({ 
      roster_status: 'rostered',
      fantasy_team_id: { $ne: null }
    }).select('espn_id name fantasy_team_id fantasy_team_name');
    // Find players with incorrect team names
    const updates = [];
    for (const player of rosteredPlayers) {
      const expectedTeamName = teamNameMap.get(player.fantasy_team_id);
      if (!expectedTeamName) {
        continue;
      if (player.fantasy_team_name !== expectedTeamName) {
        updates.push({
          playerId: player._id,
          playerName: player.name,
          oldTeamName: player.fantasy_team_name || 'null',
          newTeamName: expectedTeamName,
          teamId: player.fantasy_team_id
        });
    if (updates.length > 0) {
      updates.slice(0, 20).forEach(update => {
      });
      if (updates.length > 20) {
    if (dryRun) {
    } else {
      let updatedCount = 0;
      for (const update of updates) {
        try {
          await ESPNPlayer.updateOne(
            { _id: update.playerId },
            { $set: { fantasy_team_name: update.newTeamName } }
          );
          updatedCount++;
        } catch (error) {
    process.exit(0);
  } catch (error) {
    process.exit(1);
// Parse command line arguments
const args = process.argv.slice(2);
const shouldWrite = args.includes('--write');
// Run the update
updateTeamNames(!shouldWrite);