# ESPN API Stat ID Mappings

Based on investigation of ESPN API responses, here are the correct stat ID mappings:

## Key Findings

The ESPN API returns detailed stats in the `stats` object within each stat entry. Stat entries are found at:
- `player.stats[]` array
- Filter by: `scoringPeriodId`, `statSplitTypeId === 1` (weekly), `statSourceId === 0` (actual)

## Stat ID Mappings

### Receiving Stats
- **Stat ID 53**: Receptions (integer, typically 1-15)
- **Stat ID 60**: Targets (decimal, typically 3-15)
- **Stat ID 42**: Receiving Yards (integer, typically 0-200)
- **Stat ID 61**: Receiving Yards (duplicate/alternative)
- **Stat ID 43**: Receiving TDs (integer, typically 0-3)
- **Stat ID 44**: Receiving 2PT conversions

### Rushing Stats
- **Stat ID 23**: Rushing Yards (integer, typically 0-200)
- **Stat ID 24**: Rushing TDs (integer, typically 0-3)
- **Stat ID 58**: Rushing Attempts/Carries (integer, typically 1-30)
- **Stat ID 27**: Rushing Yards (alternative/duplicate?)
- **Stat ID 28**: Rushing TDs (alternative/duplicate?)

### Passing Stats
- **Stat ID 0**: Passing Yards
- **Stat ID 4**: Passing TDs
- **Stat ID 20**: Passing Interceptions
- **Stat ID 19**: Passing Interceptions (alternative)

### Other Stats
- **Stat ID 72**: Fumbles Lost
- **Stat ID 41**: Unknown (appears frequently, avg=3.81)
- **Stat ID 47**: Unknown (appears frequently, avg=8.17)
- **Stat ID 48**: Unknown (appears frequently, avg=4.19)
- **Stat ID 59**: Unknown (appears frequently, avg=18.87)
- **Stat ID 210**: Common flag (value=1, appears in 135/146 players)

## Usage Example

```javascript
// Get actual stats for a week
const weekStats = player.stats.find(s => 
  s.scoringPeriodId === week &&
  s.statSplitTypeId === 1 && // Weekly stats
  s.statSourceId === 0 // Actual stats (1 = projection)
);

if (weekStats && weekStats.stats) {
  const receptions = weekStats.stats['53'] || 0;
  const targets = weekStats.stats['60'] || 0;
  const receivingYards = weekStats.stats['42'] || 0;
  const rushingYards = weekStats.stats['23'] || 0;
  const carries = weekStats.stats['58'] || 0;
  
  // Calculate PPR score
  const pprScore = 
    (receivingYards * 0.1) +
    (receptions * 1.0) + // PPR
    (receivingTDs * 6) +
    (rushingYards * 0.1) +
    (rushingTDs * 6) +
    (passingYards * 0.04) +
    (passingTDs * 4) -
    (interceptions * 2) -
    (fumblesLost * 2);
}
```

## Data Availability

- ✅ **Receptions**: Available via Stat ID 53
- ✅ **Targets**: Available via Stat ID 60
- ✅ **Carries**: Available via Stat ID 58 (needs verification for all positions)
- ✅ **All yardage stats**: Available
- ✅ **TDs**: Available
- ✅ **Turnovers**: Available

## Notes

1. Some stat IDs appear to have duplicates or alternatives (e.g., 42/61 for receiving yards)
2. Stat ID 58 appears frequently but may not always represent carries for non-RB players
3. Targets (Stat ID 60) can be decimal values
4. The `appliedTotal` field contains ESPN's calculated fantasy points for the league's scoring system
5. Stat Source IDs: 0 = actual, 1 = projection
6. Stat Split Type IDs: 0 = season totals, 1 = weekly totals




