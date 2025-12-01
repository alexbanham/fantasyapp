# Verbose Logging Guide - Betting Odds Feature

## Overview

Comprehensive verbose logging has been added to both frontend and backend to help track the betting odds sync process. All logs are prefixed with `[Money Page]` (frontend) or `[BettingOdds API]` / `[Sync Week X]` (backend) for easy filtering.

## Frontend Logging

### Component Lifecycle
- `[Money Page] Component mounted, fetching config...`
- `[Money Page] Config received: {...}`
- `[Money Page] Setting week to X, season to Y`
- `[Money Page] Week/Season changed: Week X, Season Y`

### Fetching Odds
- `[Money Page] Fetching odds for Week X, Season Y`
- `[Money Page] API Response received in Xms: {...}`
- `[Money Page] Setting X games with odds`
- `[Money Page] Game 1/X: {...}` - Details for each game
- `[Money Page] Fetch odds completed`

### Syncing Odds
- `[Money Page] Starting sync for Week X, Season Y`
- `[Money Page] Sync completed in Xms: {...}`
- `[Money Page] Sync successful, refreshing odds and stats...`
- `[Money Page] Refresh complete after sync`
- `[Money Page] Sync operation completed`

### Statistics
- `[Money Page] Fetching betting odds statistics...`
- `[Money Page] Stats received: {...}`

### Error Handling
- `[Money Page] Error fetching betting odds: {...}`
- `[Money Page] Error during sync: {...}`
- `[Money Page] Error fetching config: {...}`

## Backend Logging

### API Routes

#### GET /api/betting-odds/week/:week
```
[BettingOdds API] [req_XXX] GET /week/X - Week: X, Season: Y
[BettingOdds API] [req_XXX] Fetching odds from database...
[BettingOdds API] [req_XXX] Found X games with odds in Xms
[BettingOdds API] [req_XXX] Game 1: DAL @ PHI - Sources: TheOddsAPI, ESPN
```

#### POST /api/betting-odds/sync/week/:week
```
[BettingOdds API] [sync_XXX] ========================================
[BettingOdds API] [sync_XXX] POST /sync/week/X - Starting sync
[BettingOdds API] [sync_XXX] Week: X, Season: Y
[BettingOdds API] [sync_XXX] ========================================
[BettingOdds API] [sync_XXX] Calling syncWeekOdds service...
[BettingOdds API] [sync_XXX] ========================================
[BettingOdds API] [sync_XXX] Sync completed in Xms
[BettingOdds API] [sync_XXX] Results: {...}
[BettingOdds API] [sync_XXX] ========================================
```

#### GET /api/betting-odds/stats
```
[BettingOdds API] [stats_XXX] GET /stats - Fetching statistics...
[BettingOdds API] [stats_XXX] Stats fetched in Xms: {...}
```

### Service Layer

#### The Odds API Fetch
```
[The Odds API] Fetching all NFL odds (cost: ~30 credits for 3 markets × 1 region)...
[The Odds API] Successfully fetched X games with odds
[The Odds API] Available bookmakers: FanDuel, DraftKings, BetMGM, Caesars, ...
[The Odds API] Credits - Used: X, Remaining: Y, Last call cost: Z
```

#### Week Sync Process
```
[Sync Week X] Found Y games for week X, season Y
[Sync Week X] Fetched Y games from The Odds API (cost: Z credits)
[Sync Week X] Matched Y games from The Odds API
[Sync Week X] Processing Y games...
[Sync Week X] [1/Y] Processing DAL @ PHI (eventId)...
[Sync Week X] [1/Y] Found The Odds API data for DAL @ PHI
[Sync Week X] [1/Y] Calculating best odds from 1 source(s)...
[Sync Week X] [1/Y] Saving odds to database...
[Sync Week X] [1/Y] ✅ Successfully saved odds for DAL @ PHI
[Sync Week X] Completed - Success: X, Failed: Y, Skipped: Z, Credits Used: W
```

#### Bookmaker Processing
```
[The Odds API] Processing 8 bookmakers for DAL @ PHI: FanDuel, DraftKings, BetMGM, ...
```

#### Error Handling
```
[Sync Week X] [1/Y] ❌ Error processing DAL @ PHI: {...}
[The Odds API] Rate limit exceeded. Please wait before retrying.
[The Odds API] Invalid API key. Please check THE_ODDS_API_KEY.
```

## What to Expect on First Run

### Console Output Flow

1. **Page Load:**
   ```
   [Money Page] Component mounted, fetching config...
   [Money Page] Config received: { currentWeek: 1, currentSeason: 2025 }
   [Money Page] Setting week to 1, season to 2025
   [Money Page] Week/Season changed: Week 1, Season 2025
   [Money Page] Fetching odds and stats for new week/season...
   ```

2. **Initial Fetch:**
   ```
   [Money Page] Fetching odds for Week 1, Season 2025
   [BettingOdds API] [req_XXX] GET /week/1 - Week: 1, Season: 2025
   [BettingOdds API] [req_XXX] Found 0 games with odds in Xms
   [Money Page] API Response received in Xms: { success: true, oddsCount: 0 }
   [Money Page] Setting 0 games with odds
   ```

3. **Sync Operation:**
   ```
   [Money Page] Starting sync for Week 1, Season 2025
   [BettingOdds API] [sync_XXX] POST /sync/week/1 - Starting sync
   [Sync Week 1] Found 16 games for week 1, season 2025
   [The Odds API] Fetching all NFL odds (cost: ~30 credits for 3 markets × 1 region)...
   [The Odds API] Successfully fetched 16 games with odds
   [The Odds API] Available bookmakers: FanDuel, DraftKings, BetMGM, Caesars, ...
   [The Odds API] Credits - Used: 30, Remaining: 470, Last call cost: 30
   [Sync Week 1] Matched 16 games from The Odds API
   [Sync Week 1] Processing 16 games...
   [Sync Week 1] [1/16] Processing DAL @ PHI (401772510)...
   [Sync Week 1] [1/16] Found The Odds API data for DAL @ PHI
   [The Odds API] Processing 8 bookmakers for DAL @ PHI: FanDuel, DraftKings, ...
   [Sync Week 1] [1/16] Calculating best odds from 1 source(s)...
   [Sync Week 1] [1/16] Saving odds to database...
   [Sync Week 1] [1/16] ✅ Successfully saved odds for DAL @ PHI
   ... (repeats for all 16 games)
   [Sync Week 1] Completed - Success: 16, Failed: 0, Skipped: 0, Credits Used: 30
   ```

4. **After Sync:**
   ```
   [Money Page] Sync successful, refreshing odds and stats...
   [Money Page] Fetching odds for Week 1, Season 2025
   [Money Page] API Response received: { success: true, oddsCount: 16 }
   [Money Page] Setting 16 games with odds
   [Money Page] Game 1/16: { game: "DAL @ PHI", sources: ["TheOddsAPI"], ... }
   ```

## Filtering Logs

### Browser Console (Frontend)
Filter by: `[Money Page]`

### Server Logs (Backend)
Filter by:
- `[BettingOdds API]` - API route logs
- `[Sync Week X]` - Service layer sync logs
- `[The Odds API]` - External API calls

## Key Metrics to Watch

1. **Credit Usage**: Check `[The Odds API] Credits - Used: X, Remaining: Y`
2. **Success Rate**: Check `[Sync Week X] Completed - Success: X, Failed: Y, Skipped: Z`
3. **Bookmaker Count**: Check `[The Odds API] Processing X bookmakers for...`
4. **API Response Times**: Check `API Response received in Xms`
5. **Database Operations**: Check `Saving odds to database...` and `✅ Successfully saved`

## Troubleshooting

### No Odds Data
- Check: `[Sync Week X] [X/Y] ⚠️ No odds data from any source`
- Check: `[The Odds API] API key not configured, skipping...`
- Check: `[The Odds API] No odds data returned`

### Credit Issues
- Check: `[The Odds API] Low credits remaining: X`
- Check: `[The Odds API] Rate limit exceeded`
- Check: `[The Odds API] Invalid API key`

### Matching Issues
- Check: `[Sync Week X] [X/Y] No The Odds API data for...`
- Check: `[Sync Week X] [X/Y] Trying ESPN as fallback...`

## UI Credit Display

The UI now shows a credit status card when The Odds API credits are available:
- **Green**: 200+ credits remaining
- **Yellow**: 100-199 credits remaining  
- **Red**: <100 credits remaining

This helps you monitor credit usage at a glance!

