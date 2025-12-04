# Betting Odds API Optimization Guide

## Overview

The betting odds service has been optimized to efficiently use The Odds API credits. With 500 credits per month, we can sync **~16 weeks** of NFL betting data (one sync per week = 30 credits × 16 weeks = 480 credits).

## Key Optimizations

### 1. **Single API Call Per Week** ⚡
- **Before**: Called API once per game (16 games × 30 credits = 480 credits per week ❌)
- **After**: ONE API call gets ALL games for the week (30 credits total ✅)
- **Savings**: 94% reduction in credit usage!

### 2. **Credit Tracking** 📊
- Tracks remaining credits from API response headers
- Logs credit usage for each sync
- Warns when credits are low
- Exposes credit status via `/api/betting-odds/stats` endpoint

### 3. **Efficient Matching** 🎯
- Uses Map-based lookup for O(1) team matching
- Processes all games in parallel from single API response
- Handles team name variations automatically

### 4. **Smart Fallback** 🔄
- Uses ESPN as free fallback (no credits) when The Odds API data unavailable
- Only fetches ESPN if The Odds API doesn't have data for a game

## API Credit Cost Formula

According to [The Odds API documentation](https://the-odds-api.com/liveapi/guides/v4/):

```
Cost = 10 × [number of unique markets returned] × [number of regions specified]
```

**Our Configuration:**
- Markets: `h2h,spreads,totals` (3 markets)
- Regions: `us` (1 region)
- **Cost per sync: 10 × 3 × 1 = 30 credits**

## Environment Variable

Add to your `.env` file:

```bash
THE_ODDS_API_KEY=your_api_key_here
```

Get your API key from: https://the-odds-api.com/

## Usage

### Sync All Games for a Week (Recommended)

```bash
# Via API
POST /api/betting-odds/sync/week/1?season=2025

# Via test script
npm run test:betting-odds
```

**Cost**: 30 credits per week sync

### Sync Single Game (Less Efficient)

```bash
POST /api/betting-odds/sync/game/401772510?season=2025
```

**Cost**: 30 credits (same as syncing all games - not recommended!)

### Check Credit Status

```bash
GET /api/betting-odds/stats
```

Response includes:
```json
{
  "stats": {
    "oddsApiCredits": {
      "remaining": 470,
      "used": 30,
      "lastCallCost": 30
    }
  }
}
```

## Monthly Credit Budget (500 credits)

With 500 credits per month, you can:

- **Sync 16 weeks**: 16 × 30 = 480 credits ✅
- **Sync 1 week daily**: 30 × 30 days = 900 credits ❌ (exceeds limit)
- **Sync 1 week every 2 days**: 15 × 30 = 450 credits ✅

**Recommended Strategy:**
- Sync each week once when games are scheduled (typically Tuesday/Wednesday)
- Re-sync only if odds change significantly
- Use ESPN fallback for games without The Odds API data

## Response Headers

The Odds API returns credit information in response headers:

- `x-requests-remaining`: Credits remaining until quota reset
- `x-requests-used`: Credits used since last quota reset  
- `x-requests-last`: Cost of the last API call

These are automatically tracked and logged by the service.

## Error Handling

The service handles common errors:

- **429 Rate Limit**: Logs warning, tracks credits
- **401 Invalid Key**: Logs error, suggests checking env variable
- **Network Errors**: Logs error, continues with ESPN fallback

## Best Practices

1. ✅ **Always sync by week** - Use `syncWeekOdds()` not individual game syncs
2. ✅ **Monitor credits** - Check `/api/betting-odds/stats` regularly
3. ✅ **Sync strategically** - Once per week is usually sufficient
4. ✅ **Use caching** - Odds are stored in MongoDB, avoid re-syncing unnecessarily
5. ❌ **Don't sync per-game** - Wastes credits (same cost as full week sync)

## Example Sync Output

```
[Sync Week 1] Found 16 games for week 1, season 2025
[The Odds API] Fetching all NFL odds (cost: ~30 credits for 3 markets × 1 region)...
[The Odds API] Successfully fetched 16 games with odds
[The Odds API] Credits - Used: 30, Remaining: 470, Last call cost: 30
[Sync Week 1] Matched 16 games from The Odds API
[Sync Week 1] Completed - Success: 16, Failed: 0, Skipped: 0, Credits Used: 30
```

## Testing

Run the test script to verify everything works:

```bash
npm run test:betting-odds
```

This will:
1. Connect to MongoDB
2. Find games for the current week
3. Fetch odds from The Odds API (one call)
4. Process and match all games
5. Save to database
6. Display credit usage





