# Player Props Integration Plan

## Overview
Based on [The Odds API V4 Documentation](https://the-odds-api.com/liveapi/guides/v4/), we can expand our betting odds integration to include player props (player-specific betting markets like touchdowns, yards, receptions, etc.).

## Current Implementation
- **Markets**: `h2h,spreads,totals` (3 markets)
- **Cost**: 30 credits per sync (10 × 3 markets × 1 region)
- **Data Structure**: Game-level odds only

## Available NFL Player Prop Markets

Based on The Odds API documentation, common NFL player prop markets include:

### Passing Props
- `player_pass_tds` - Player passing touchdowns
- `player_pass_yds` - Player passing yards
- `player_pass_completions` - Player pass completions
- `player_pass_interceptions` - Player interceptions thrown

### Rushing Props
- `player_rush_yds` - Player rushing yards
- `player_rush_attempts` - Player rush attempts
- `player_rush_longest` - Player longest rush

### Receiving Props
- `player_receptions` - Player receptions
- `player_receiving_yds` - Player receiving yards
- `player_receiving_longest` - Player longest reception

### Touchdown Props
- `player_anytime_td` - Player to score a touchdown (anytime)
- `player_first_td` - Player to score first touchdown
- `player_last_td` - Player to score last touchdown

### Combined Props
- `player_pass_attempts` - Player pass attempts
- `player_fantasy_points` - Player fantasy points (if available)

## Credit Cost Analysis

**Current**: 30 credits (3 markets × 1 region × 10)

**With Player Props**:
- **Option 1: All Player Props** - Add all ~15+ player prop markets
  - Cost: ~150+ credits per sync (15 markets × 1 region × 10)
  - **Not recommended** - Would exhaust monthly budget quickly

- **Option 2: Selective Player Props** - Add 3-5 most popular markets
  - Cost: 60-80 credits per sync (6-8 total markets × 1 region × 10)
  - **Recommended** - Focus on most valuable props

- **Option 3: Separate Endpoint** - Fetch player props separately on-demand
  - Cost: Variable (only fetch when needed)
  - **Best for flexibility** - Don't fetch unless user requests

## Recommended Approach: Hybrid Strategy

### Phase 1: Core Player Props (Immediate)
Add the most popular player props to the main sync:
- `player_pass_tds` - Passing touchdowns
- `player_rush_yds` - Rushing yards  
- `player_receiving_yds` - Receiving yards
- `player_anytime_td` - Anytime touchdown

**New Cost**: 70 credits per sync (7 markets × 1 region × 10)
**Impact**: Still manageable with 500 credit/month budget (~7 syncs/week)

### Phase 2: On-Demand Player Props (Future)
Create separate endpoints for:
- Fetching all player props for a specific game
- Fetching props for a specific player
- Fetching props for a specific market type

**Cost**: Only when requested, allows users to explore more props without wasting credits

## Data Structure Changes Needed

### Current Schema (BettingOdds Model)
```javascript
{
  sources: [{
    source: String,
    moneyline: {...},
    spread: {...},
    total: {...}
  }]
}
```

### Proposed Schema Addition
```javascript
{
  sources: [{
    source: String,
    moneyline: {...},
    spread: {...},
    total: {...},
    playerProps: [{  // NEW
      market: String,  // e.g., "player_pass_tds"
      playerName: String,
      playerId: String,  // Link to our Player model
      description: String,  // e.g., "Over 2.5"
      outcomes: [{
        name: String,  // "Over" or "Under"
        price: Number,  // American odds
        point: Number  // The threshold (e.g., 2.5)
      }],
      bookmaker: String
    }]
  }]
}
```

## Implementation Steps

### Step 1: Update API Request
- Modify `fetchTheOddsAPIOdds` to accept optional player prop markets
- Add parameter: `includePlayerProps: boolean` (default: false for now)
- When true, append player prop markets to the markets parameter

### Step 2: Update Data Processing
- Extend `processTheOddsAPIData` to handle player prop markets
- Parse player names and match to our Player database
- Store player props in a structured format

### Step 3: Update Database Schema
- Add `playerProps` array to BettingOdds model sources
- Create indexes for efficient player prop queries
- Consider separate collection for player props if volume is high

### Step 4: Update Frontend
- Add UI section for player props in Money page
- Display player props grouped by:
  - Player name
  - Market type
  - Bookmaker
- Add filters/search for specific players

### Step 5: Player Matching Logic
- Match player names from The Odds API to our Player database
- Handle name variations (e.g., "A.J. Brown" vs "AJ Brown")
- Store playerId reference for linking

## Example API Response Structure

From The Odds API documentation, player props come in this format:

```json
{
  "markets": [
    {
      "key": "player_pass_tds",
      "last_update": "2023-11-29T22:40:55Z",
      "outcomes": [
        {
          "name": "Over",
          "description": "Patrick Mahomes",
          "price": 1.83,
          "point": 2.5
        },
        {
          "name": "Under",
          "description": "Patrick Mahomes",
          "price": 1.91,
          "point": 2.5
        }
      ]
    }
  ]
}
```

## Credit Budget Planning

**Monthly Budget**: 500 credits

**Current Usage**:
- Main sync (h2h, spreads, totals): 30 credits
- Can sync ~16 times/month

**With Core Player Props**:
- Main sync (7 markets): 70 credits
- Can sync ~7 times/month
- **Recommendation**: Sync 1-2 times per week, or make player props optional

**With On-Demand Player Props**:
- Main sync: 30 credits (unchanged)
- Player props fetch: 40 credits (when requested)
- **Best approach**: Keep main sync lean, fetch player props separately

## Next Steps Priority

1. **High Priority**: 
   - Add `includePlayerProps` flag to sync function
   - Implement core 4 player prop markets
   - Update data model to store player props

2. **Medium Priority**:
   - Create separate endpoint for fetching all player props for a game
   - Add player name matching logic
   - Update frontend to display player props

3. **Low Priority**:
   - Add more player prop markets
   - Create player-specific prop endpoints
   - Add prop comparison across bookmakers

## Testing Strategy

1. **Test API Response**: Call The Odds API with player prop markets to see actual data structure
2. **Test Credit Usage**: Verify credit costs match expectations
3. **Test Player Matching**: Ensure we can match player names correctly
4. **Test Storage**: Verify player props are stored and retrieved correctly
5. **Test UI**: Ensure player props display nicely in the frontend

## Questions to Answer

1. Which player prop markets are most valuable for fantasy football?
2. Should player props be included in main sync or separate?
3. How do we handle player name matching (The Odds API vs our database)?
4. Should we cache player props separately or with game odds?
5. What's the best UI/UX for displaying player props?

## References

- [The Odds API V4 Documentation](https://the-odds-api.com/liveapi/guides/v4/)
- [GET odds endpoint](https://the-odds-api.com/liveapi/guides/v4/#get-odds) - Main endpoint for fetching odds
- Credit cost formula: `cost = 10 × [markets] × [regions]`

