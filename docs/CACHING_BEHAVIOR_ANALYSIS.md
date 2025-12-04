# Caching Behavior Analysis - Games & Standings

## Overview
This document analyzes how caching works for games and standings, and whether updates will work correctly over time.

## Games Endpoint (`/api/live/games/week/:week`)

### Current Behavior
1. **Database First**: Always queries database first (fast)
2. **Auto-Refresh Conditions**:
   - `realtime=true` query parameter
   - No games found in database
   - Live games older than 2 minutes (`lastUpdated > 2 minutes ago`)

3. **When Refresh Happens**:
   - Fetches from ESPN API
   - Updates database with latest data
   - Updates `lastUpdated` timestamp
   - Returns fresh data

### ✅ Works Correctly
- Live games refresh automatically when stale
- Completed games stay in database (no unnecessary API calls)
- Database is always updated when refresh happens

### ⚠️ Potential Issues
- **None identified** - The logic is sound. Games will update properly.

## Standings Endpoint (`/api/nfl-standings`)

### Current Behavior (After Improvements)

1. **Cache Check**:
   - Checks MongoDB cache first (unless `forceRefresh=true`)
   - Cache expires after 1 hour (MongoDB TTL)

2. **Cache Invalidation Logic** (IMPROVED):
   The cache automatically invalidates when:
   - ✅ Games with `STATUS_FINAL` are updated after cache (`lastUpdated > cacheTime`)
   - ✅ Games with `STATUS_FINAL` are created after cache (`createdAt > cacheTime`)
   - ✅ Games transition to completed status (have scores > 0, not scheduled/pre) and were updated after cache
   - ✅ Only checks games up to current week (prevents future games from invalidating)

3. **When Cache Invalidates**:
   - Standings are recalculated from database
   - New cache entry is saved with latest `lastGameUpdated` timestamp

### ✅ Works Correctly
- Cache invalidates when games complete (transition to `STATUS_FINAL`)
- Cache invalidates when game scores are updated
- Cache invalidates when new games are added
- Only checks relevant games (up to current week)

### ⚠️ Edge Cases Handled
- Games transitioning from `STATUS_IN` → `STATUS_FINAL`: ✅ Detected via `lastUpdated` check
- Score corrections on final games: ✅ Detected via `lastUpdated` check
- New games added retroactively: ✅ Detected via `createdAt` check
- Games with scores but wrong status: ✅ Detected via score + status check

## Game Polling Service

### Current Behavior
- Polls ESPN API at configured intervals
- Updates games in database when data changes
- Updates `lastUpdated` timestamp on every change
- Updates `dataHash` to detect changes

### ✅ Works Correctly
- Games are updated in real-time during live games
- When games complete, status changes to `STATUS_FINAL`
- `lastUpdated` timestamp is updated, triggering standings cache invalidation

## Flow Diagram

```
User visits Games page
  ↓
GET /api/live/games/week/14
  ↓
Check database
  ↓
[If live games > 2 min old OR realtime=true]
  ↓
Fetch from ESPN API
  ↓
Update database (lastUpdated = now)
  ↓
Return games
  ↓
[Standings cache check runs]
  ↓
[If any game.lastUpdated > cache.lastGameUpdated]
  ↓
Cache invalidated → Recalculate standings
```

## Testing Scenarios

### Scenario 1: Game Completes During User Session
1. User loads games page → sees game as `STATUS_IN`
2. Game completes → polling service updates database
3. User refreshes → sees game as `STATUS_FINAL` ✅
4. User visits standings → cache invalidated, shows updated standings ✅

### Scenario 2: Multiple Users, Game Completes
1. User A loads standings → gets cached data
2. Game completes → database updated
3. User B loads standings → cache invalidated, gets fresh data ✅
4. User A loads standings again → cache invalidated, gets fresh data ✅

### Scenario 3: Games Page Stale Data
1. User loads games page → gets database data
2. Live game is 3 minutes old → auto-refreshes ✅
3. Database updated → standings cache will invalidate on next standings request ✅

## Recommendations

### ✅ Current Implementation is Solid
The caching logic properly handles:
- Game status transitions
- Score updates
- New game additions
- Stale data detection

### 🔧 Optional Improvements (Not Critical)

1. **Standings Cache Warm-up**: After game polling updates, could proactively invalidate standings cache
   - Current: Cache invalidates on next standings request
   - Improvement: Could clear cache immediately after game updates
   - Impact: Low - current behavior is fine

2. **Games Cache**: Could add short-term cache for games endpoint
   - Current: Always queries database (already fast)
   - Improvement: Could cache for 30 seconds
   - Impact: Low - database queries are already fast

3. **Cache Warming**: Pre-calculate standings when games complete
   - Current: Calculated on-demand
   - Improvement: Background job calculates after game updates
   - Impact: Low - calculation is fast enough

## Conclusion

✅ **The current caching implementation will work correctly over time.**

- Games update properly when they complete
- Standings cache invalidates when games change
- No stale data issues identified
- Auto-refresh logic handles live games correctly

The system is designed to:
1. Keep games fresh (auto-refresh stale live games)
2. Keep standings accurate (cache invalidates on game changes)
3. Minimize API calls (cache when possible, refresh when needed)

No changes needed - the system will work correctly as users visit over time.

