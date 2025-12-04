# NFL Standings Cache Management

## Overview
The NFL standings are cached in MongoDB for performance. The cache automatically invalidates when games are updated or added, but you can also manually manage it.

## Automatic Cache Invalidation

The cache automatically invalidates when:
1. **Games are updated** - If any game's `lastUpdated` timestamp is newer than the cache
2. **New games are added** - If any game's `createdAt` timestamp is newer than the cache
3. **Cache expires** - Cache entries auto-expire after 1 hour

## Manual Cache Management

### 1. Clear Cache via API Endpoint

**Clear all cache:**
```bash
POST /api/nfl-standings/clear-cache
```

**Clear cache for specific season:**
```bash
POST /api/nfl-standings/clear-cache?season=2025
```

**Clear cache for specific season/week:**
```bash
POST /api/nfl-standings/clear-cache?season=2025&week=14
```

### 2. Force Refresh via Query Parameter

**Force refresh standings (bypasses cache):**
```bash
GET /api/nfl-standings?forceRefresh=true
```

### 3. Check Cache Status

**Get cache status:**
```bash
GET /api/nfl-standings/cache-status
```

**Get cache status for specific season:**
```bash
GET /api/nfl-standings/cache-status?season=2025
```

### 4. Clear Cache via Script

**Clear all standings cache:**
```bash
npm run clear:standings-cache
```

Or directly:
```bash
node backend/src/scripts/clearStandingsCache.js
```

## When to Clear Cache

You should clear the cache when:
- ✅ After syncing missing game weeks
- ✅ After manually updating game data
- ✅ When standings appear incorrect
- ✅ After bulk data imports
- ✅ When testing standings calculations

## Cache Behavior

1. **First Request**: Calculates standings and saves to cache
2. **Subsequent Requests**: Returns cached data if valid
3. **Auto-Invalidation**: Cache checks for updated/new games automatically
4. **Expiration**: Cache expires after 1 hour (MongoDB TTL)

## Example: After Syncing Missing Weeks

After running `npm run sync:missing-weeks`, you should clear the cache:

```bash
# Option 1: Use the script
npm run clear:standings-cache

# Option 2: Use the API endpoint
curl -X POST http://localhost:6100/api/nfl-standings/clear-cache

# Option 3: Force refresh on next request
# Just add ?forceRefresh=true to your standings API call
```

## Cache Structure

Cache entries are stored in the `nflstandingscaches` collection with:
- `season`: The NFL season year
- `week`: The current week when cached
- `standings`: The calculated standings data
- `lastGameUpdated`: Timestamp of the latest game update
- `expiresAt`: Auto-expiration timestamp (1 hour)
- `updatedAt`: When the cache entry was last updated

## Troubleshooting

**Problem**: Standings showing old data after syncing games
**Solution**: Clear cache using one of the methods above

**Problem**: Cache not invalidating automatically
**Solution**: 
1. Check if games have `lastUpdated` or `createdAt` timestamps
2. Manually clear cache
3. Check cache status endpoint to see if cache is stale

**Problem**: Want to see fresh data immediately
**Solution**: Use `?forceRefresh=true` query parameter

