# Syracuse Orange Men's Basketball Feature

## Overview
This feature adds comprehensive Syracuse Orange men's basketball data to your fantasy football app, including schedule, scores, players, box scores, and news. The feature is accessible through a dedicated UI separate from the main fantasy football interface.

## What Was Created

### Backend Components

1. **Service** (`backend/src/services/syracuseBasketballService.js`)
   - Fetches data from ESPN for Syracuse basketball
   - Methods:
     - `fetchSchedule(season)` - Gets team schedule
     - `fetchRoster(season)` - Gets team roster/players
     - `fetchNews(limit)` - Gets news articles
     - `fetchTeamStats(season)` - Gets team statistics
     - `fetchBoxScore(gameId)` - Gets box score for a specific game

2. **Models** (MongoDB schemas)
   - `SyracuseGame` - Stores game schedule and results
   - `SyracusePlayer` - Stores player roster information
   - `SyracuseNews` - Stores news articles

3. **Routes** (`backend/src/routes/syracuse.js`)
   - `GET /api/syracuse/schedule` - Get schedule (with optional `?season=YYYY&refresh=true`)
   - `GET /api/syracuse/roster` - Get roster (with optional `?season=YYYY&refresh=true`)
   - `GET /api/syracuse/news` - Get news (with optional `?limit=20&refresh=true`)
   - `GET /api/syracuse/stats` - Get team stats (with optional `?season=YYYY`)
   - `GET /api/syracuse/game/:gameId` - Get game details and box score
   - `POST /api/syracuse/sync` - Sync all data (body: `{ season: YYYY }`)

### Frontend Components

1. **Page** (`frontend/src/pages/Orangemen.tsx`)
   - Dedicated UI for Syracuse basketball
   - Tabs for: Schedule, Roster, News, Stats
   - "Back to Fantasy" button to return to main app
   - Sync button to refresh data

2. **API Functions** (`frontend/src/services/api.ts`)
   - `getSyracuseSchedule(season?)`
   - `getSyracuseRoster(season?)`
   - `getSyracuseNews(limit?)`
   - `getSyracuseStats(season?)`
   - `getSyracuseGame(gameId)`
   - `syncSyracuseData(season?)`

3. **Admin Panel Integration**
   - Added "View Orangemen" button in ConfigurationModal
   - Accessible from admin panel (Settings icon)

### Test Script

**Test Script** (`backend/src/scripts/testSyracuse.js`)
- Tests all data fetching methods
- Verifies data structure and content
- Run with: `node backend/src/scripts/testSyracuse.js`

## How to Use

### Accessing the Feature

1. **From Admin Panel:**
   - Click the Settings icon (gear) in the top right
   - Enter admin password if prompted
   - Click "View Orangemen" button in the Syracuse Orange section

2. **Direct URL:**
   - Navigate to `/orangemen` in your browser

### Syncing Data

1. **Manual Sync:**
   - Click "Sync Data" button on the Orangemen page
   - Or use the API: `POST /api/syracuse/sync`

2. **Automatic Caching:**
   - Data is cached in MongoDB
   - Add `?refresh=true` to API calls to force refresh

### Testing

Run the test script to verify data fetching:
```bash
cd backend
node src/scripts/testSyracuse.js
```

This will test:
- Schedule fetching
- Roster fetching
- News fetching
- Team stats fetching
- Box score fetching (if available)

## Data Sources

The feature scrapes data from:
- **ESPN** - Primary source for schedule, roster, stats, and news
- Syracuse Orange ESPN team ID: 183

## Data Available

### Schedule
- Game dates
- Opponents
- Location (Home/Away)
- Scores (when available)
- Game status (scheduled/live/final)
- Win/Loss indicators

### Roster
- Player names
- Jersey numbers
- Positions
- Class year
- Height/Weight
- Player images
- Links to player profiles

### News
- Article titles
- Summaries
- Published dates
- Source information
- Links to full articles

### Stats
- Overall record (W-L)
- Win percentage
- Team averages (points, rebounds, assists, etc.)

### Box Scores
- Team scores
- Individual player statistics
- Available for completed games

## Notes

- Data is cached in MongoDB to reduce API calls
- Use `refresh=true` query parameter to force fresh data
- Box scores may not be available for all games
- The UI is separate from the main fantasy football interface
- All data fetching uses web scraping (cheerio) since ESPN's public API is limited

## Future Enhancements

Potential improvements:
- Player statistics tracking over time
- Game highlights integration
- Social media feed
- Live game updates
- Historical data analysis
- Comparison with other teams



