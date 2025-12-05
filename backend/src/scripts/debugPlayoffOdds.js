require('dotenv').config();
const mongoose = require('mongoose');
const espnService = require('../services/espnService');
const Config = require('../models/Config');

async function debugPlayoffOdds() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get config
    const config = await Config.getConfig();
    const currentSeason = config.currentSeason || espnService.getCurrentNFLSeason();
    const requestedWeek = config.currentWeek || espnService.getCurrentNFLWeek();
    
    console.log(`\n=== Playoff Odds Debug ===`);
    console.log(`Season: ${currentSeason}, Week: ${requestedWeek}\n`);

    // Get comprehensive league data
    const comprehensiveResult = await espnService.getComprehensiveLeagueData(currentSeason, requestedWeek);
    
    if (!comprehensiveResult.success) {
      console.error('Failed to fetch league data:', comprehensiveResult.error);
      return;
    }

    // Build standings
    const standings = comprehensiveResult.teams ? comprehensiveResult.teams.map(team => {
      const ownerName = team.owners?.[0]?.displayName || 'Unknown';
      return {
        teamId: team.teamId,
        teamName: team.name,
        owner: ownerName,
        wins: team.record.overall.wins,
        losses: team.record.overall.losses,
        ties: team.record.overall.ties,
        winPercentage: team.record.overall.percentage,
        pointsFor: team.record.overall.pointsFor,
        pointsAgainst: team.record.overall.pointsAgainst,
        logo: team.logo
      };
    }) : [];

    // Sort standings by win percentage, then points for
    standings.sort((a, b) => {
      if (b.winPercentage !== a.winPercentage) {
        return b.winPercentage - a.winPercentage;
      }
      return b.pointsFor - a.pointsFor;
    });

    const playoffTeams = comprehensiveResult.leagueSettings?.playoffTeamCount || Math.floor((comprehensiveResult.totalTeams || standings.length) / 2);
    const regularSeasonWeeks = comprehensiveResult.leagueSettings?.regularSeasonLength || 13;
    const gamesPlayed = requestedWeek - 1;
    const gamesRemaining = Math.max(0, regularSeasonWeeks - gamesPlayed);

    console.log(`League Settings:`);
    console.log(`  Total Teams: ${standings.length}`);
    console.log(`  Playoff Teams: ${playoffTeams}`);
    console.log(`  Regular Season Weeks: ${regularSeasonWeeks}`);
    console.log(`  Games Played: ${gamesPlayed}`);
    console.log(`  Games Remaining: ${gamesRemaining}\n`);

    // Calculate playoff odds using the same logic as the route
    const calculatePlayoffOdds = (team, index) => {
      try {
        if (gamesRemaining === 0) {
          return { odds: index < playoffTeams ? 100 : 0, reason: 'Season over' };
        }
        
        const currentWins = team.wins;
        const currentLosses = team.losses;
        const currentPointsFor = team.pointsFor;
        const maxPossibleWins = currentWins + gamesRemaining;
        const minWinsIfLoseAll = currentWins;
        
        const gamesPlayedForTeam = currentWins + currentLosses;
        const avgPointsPerGame = gamesPlayedForTeam > 0 ? currentPointsFor / gamesPlayedForTeam : 0;
        const estimatedMaxPointsFor = currentPointsFor + (gamesRemaining * avgPointsPerGame);
        const estimatedMinPointsFor = currentPointsFor;
        
        // Step 1: Check if guaranteed
        let teamsThatCanFinishAheadIfWeLoseAll = 0;
        const teamsAheadIfLoseAll = [];
        
        for (let i = 0; i < standings.length; i++) {
          if (i === index) continue;
          
          const otherTeam = standings[i];
          const otherMaxWins = otherTeam.wins + gamesRemaining;
          const otherGamesPlayed = otherTeam.wins + otherTeam.losses;
          const otherAvgPointsPerGame = otherGamesPlayed > 0 ? otherTeam.pointsFor / otherGamesPlayed : 0;
          const otherMaxPointsFor = otherTeam.pointsFor + (gamesRemaining * otherAvgPointsPerGame);
          
          const canFinishAhead = 
            otherMaxWins > minWinsIfLoseAll ||
            (otherMaxWins === minWinsIfLoseAll && otherMaxPointsFor > estimatedMinPointsFor);
          
          if (canFinishAhead) {
            teamsThatCanFinishAheadIfWeLoseAll++;
            teamsAheadIfLoseAll.push({
              name: otherTeam.teamName,
              currentWins: otherTeam.wins,
              maxWins: otherMaxWins,
              maxPoints: otherMaxPointsFor.toFixed(1)
            });
          }
        }
        
        if (teamsThatCanFinishAheadIfWeLoseAll < playoffTeams) {
          return { 
            odds: 100, 
            reason: `GUARANTEED: Only ${teamsThatCanFinishAheadIfWeLoseAll} teams can finish ahead if we lose all`,
            details: teamsAheadIfLoseAll
          };
        }
        
        // Step 2: Check if eliminated
        // Build scenarios for all teams
        const teamScenarios = standings.map((otherTeam, otherIndex) => {
          const otherMaxWins = otherTeam.wins + gamesRemaining;
          const otherMinWins = otherTeam.wins;
          const otherGamesPlayed = otherTeam.wins + otherTeam.losses;
          const otherAvgPointsPerGame = otherGamesPlayed > 0 ? otherTeam.pointsFor / otherGamesPlayed : 0;
          const otherMaxPointsFor = otherTeam.pointsFor + (gamesRemaining * otherAvgPointsPerGame);
          const otherMinPointsFor = otherTeam.pointsFor;
          
          return {
            index: otherIndex,
            team: otherTeam,
            maxWins: otherMaxWins,
            minWins: otherMinWins,
            maxPointsFor: otherMaxPointsFor,
            minPointsFor: otherMinPointsFor,
            currentWins: otherTeam.wins,
            currentPointsFor: otherTeam.pointsFor
          };
        });
        
        // Count teams GUARANTEED to finish ahead (even in their worst case)
        let guaranteedAhead = 0;
        const guaranteedAheadTeams = [];
        
        for (const scenario of teamScenarios) {
          if (scenario.index === index) continue;
          
          // They're guaranteed ahead if their worst case beats our best case
          const isGuaranteedAhead = 
            scenario.minWins > maxPossibleWins ||
            (scenario.minWins === maxPossibleWins && scenario.minPointsFor > estimatedMaxPointsFor);
          
          if (isGuaranteedAhead) {
            guaranteedAhead++;
            guaranteedAheadTeams.push({
              name: scenario.team.teamName,
              currentWins: scenario.currentWins,
              minWins: scenario.minWins,
              minPoints: scenario.minPointsFor.toFixed(1)
            });
          }
        }
        
        if (guaranteedAhead >= playoffTeams) {
          return { 
            odds: 0, 
            reason: `ELIMINATED: ${guaranteedAhead} teams guaranteed to finish ahead`,
            details: guaranteedAheadTeams
          };
        }
        
        // Step 3: Calculate probability
        const cutoffIndex = Math.min(playoffTeams - 1, standings.length - 1);
        const cutoffTeam = standings[cutoffIndex];
          const cutoffWins = cutoffTeam ? cutoffTeam.wins : currentWins;
          const cutoffPointsFor = cutoffTeam ? cutoffTeam.pointsFor : currentPointsFor;
          const winsBehindCutoff = cutoffWins - currentWins;
          const pointsForAdvantage = currentPointsFor > cutoffPointsFor ? 1 : 0;
          const pointsForDisadvantage = currentPointsFor < cutoffPointsFor ? 1 : 0;
          
          // Debug for Good Kittens
          if (team.teamName === 'Good Kittens') {
            console.log(`    DEBUG Good Kittens: cutoffTeam=${cutoffTeam?.teamName}, cutoffPointsFor=${cutoffPointsFor}, currentPointsFor=${currentPointsFor}, pointsForAdvantage=${pointsForAdvantage}, pointsRatio=${(currentPointsFor/cutoffPointsFor).toFixed(3)}`);
          }
        
        let baseProbability = 0;
        
        if (index < playoffTeams) {
          const positionInPlayoffs = playoffTeams - index;
          const cushion = positionInPlayoffs - 1;
          
          if (cushion >= 2) {
            baseProbability = 85 + (cushion * 3);
          } else if (cushion === 1) {
            baseProbability = 70;
          } else {
            if (pointsForAdvantage) {
              baseProbability = 60;
            } else if (pointsForDisadvantage) {
              baseProbability = 50;
            } else {
              baseProbability = 55;
            }
          }
        } else {
          const spotsOutside = index - playoffTeams + 1;
          const effectiveWinsBehind = Math.max(0, winsBehindCutoff);
          
          if (spotsOutside === 1) {
            if (effectiveWinsBehind === 0) {
              baseProbability = pointsForAdvantage ? 55 : (pointsForDisadvantage ? 45 : 50);
              } else if (effectiveWinsBehind === 1) {
              // One win behind - can catch up, tiebreaker helps significantly
              // If we have significantly more points for, we have a very good chance if we catch up
              if (team.teamName === 'Good Kittens') {
                console.log(`    DEBUG: Checking condition: pointsForAdvantage=${pointsForAdvantage}, currentPointsFor=${currentPointsFor}, cutoffPointsFor=${cutoffPointsFor}, condition=${pointsForAdvantage && currentPointsFor > cutoffPointsFor * 1.05}`);
              }
              if (pointsForAdvantage && currentPointsFor > cutoffPointsFor * 1.05) {
                // We're one win behind but have 5%+ more points - excellent chance if we catch up
                baseProbability = 60; // Higher than the team currently in the spot
                if (team.teamName === 'Good Kittens') {
                  console.log(`    DEBUG: Special case APPLIED! baseProbability set to 60`);
                }
              } else if (pointsForAdvantage) {
                baseProbability = 50;
                if (team.teamName === 'Good Kittens') {
                  console.log(`    DEBUG: Regular points advantage, baseProbability set to 50`);
                }
              } else {
                baseProbability = 40;
              }
            } else if (effectiveWinsBehind === 2) {
              baseProbability = 30;
            } else if (effectiveWinsBehind === 3) {
              baseProbability = 20;
            } else {
              baseProbability = Math.max(10, 20 - (effectiveWinsBehind - 3) * 3);
            }
          } else if (spotsOutside === 2) {
            if (effectiveWinsBehind <= 1) {
              baseProbability = pointsForAdvantage ? 30 : 20;
            } else if (effectiveWinsBehind === 2) {
              baseProbability = 15;
            } else if (effectiveWinsBehind === 3) {
              baseProbability = 10;
            } else {
              baseProbability = Math.max(5, 10 - (effectiveWinsBehind - 3) * 2);
            }
          } else if (spotsOutside === 3) {
            if (effectiveWinsBehind <= 1) {
              baseProbability = 12;
            } else if (effectiveWinsBehind === 2) {
              baseProbability = 8;
            } else {
              baseProbability = Math.max(3, 8 - (effectiveWinsBehind - 2) * 2);
            }
          } else {
            const maxSpotsOutside = Math.min(spotsOutside, 6);
            const baseChance = Math.max(2, 8 - (maxSpotsOutside - 3) * 1.5);
            baseProbability = Math.max(1, baseChance - Math.max(0, effectiveWinsBehind - 2) * 1.5);
          }
          
          // Special case: if we're one win behind but have significantly more points for,
          // we have a better chance if we can catch up (applies to any position)
          if (effectiveWinsBehind === 1 && pointsForAdvantage && currentPointsFor > cutoffPointsFor * 1.05) {
            // Boost probability significantly - we can catch up and win tiebreaker
            baseProbability = Math.min(100, Math.max(baseProbability, 50 + (spotsOutside === 1 ? 10 : spotsOutside === 2 ? 5 : 0)));
          }
        }
        
        // Adjust for remaining games
        if (gamesRemaining > 0) {
          const uncertaintyFactor = Math.min(0.3, gamesRemaining / regularSeasonWeeks);
          if (baseProbability > 50) {
            baseProbability = baseProbability - (uncertaintyFactor * (baseProbability - 50));
          } else {
            baseProbability = baseProbability + (uncertaintyFactor * (50 - baseProbability));
          }
        }
        
        const finalOdds = Math.max(0, Math.min(100, Math.round(baseProbability)));
        
        return {
          odds: finalOdds,
          reason: `PROBABILITY: Position ${index + 1}, ${winsBehindCutoff > 0 ? winsBehindCutoff + ' wins behind' : 'ahead'}, ${pointsForAdvantage ? 'points advantage' : pointsForDisadvantage ? 'points disadvantage' : 'tied points'}`,
            details: {
            baseProbability: baseProbability.toFixed(1),
            winsBehindCutoff,
            pointsForAdvantage: pointsForAdvantage ? 'Yes' : 'No',
            teamsAheadIfLoseAll: teamsThatCanFinishAheadIfWeLoseAll,
            guaranteedAhead: guaranteedAhead
          }
        };
      } catch (err) {
        return { odds: 0, reason: `ERROR: ${err.message}` };
      }
    };

    // Calculate odds for each team
    console.log('=== STANDINGS AND PLAYOFF ODDS ===\n');
    standings.forEach((team, index) => {
      const result = calculatePlayoffOdds(team, index);
      const inPlayoffs = index < playoffTeams ? '✓' : ' ';
      const record = `${team.wins}-${team.losses}${team.ties > 0 ? `-${team.ties}` : ''}`;
      
      console.log(`${index + 1}. ${inPlayoffs} ${team.teamName.padEnd(25)} ${record.padEnd(8)} PF: ${team.pointsFor.toFixed(1).padStart(7)} Odds: ${result.odds}%`);
      console.log(`    ${result.reason}`);
      if (result.details && result.details.teamsAheadIfLoseAll !== undefined) {
        console.log(`    Details: Base=${result.details.baseProbability}%, Wins Behind=${result.details.winsBehindCutoff}, Points Advantage=${result.details.pointsForAdvantage}`);
        console.log(`    Teams ahead if we lose all: ${result.details.teamsAheadIfLoseAll}, Teams ahead if we win all: ${result.details.teamsAheadIfWinAll}`);
      }
      if (result.details && Array.isArray(result.details)) {
        console.log(`    Teams that can finish ahead:`);
        result.details.forEach(t => {
          console.log(`      - ${t.name}: ${t.currentWins} wins → max ${t.maxWins} wins, ${t.maxPoints} pts`);
        });
      }
      console.log('');
    });

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugPlayoffOdds();

