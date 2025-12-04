# Betting Odds Database Best Practices

## Overview
This document outlines the database practices implemented to prevent duplicates, ensure data integrity, and optimize performance for the betting odds feature.

## Unique Index Constraint

### Compound Unique Index
```javascript
bettingOddsSchema.index({ eventId: 1, season: 1 }, { unique: true });
```

**Purpose**: Ensures one document per game per season, preventing duplicate documents even if multiple syncs occur simultaneously.

**Benefits**:
- Prevents race conditions from creating duplicates
- Ensures data consistency
- MongoDB will reject duplicate inserts automatically

## Upsert Strategy

### Using `findOneAndUpdate` with `upsert: true`
```javascript
BettingOdds.findOneAndUpdate(
  { eventId: game.eventId, season },
  { /* update data */ },
  { 
    upsert: true, 
    new: true,
    setDefaultsOnInsert: true
  }
);
```

**Purpose**: Updates existing document or creates new one atomically.

**Options Explained**:
- `upsert: true` - Creates document if it doesn't exist
- `new: true` - Returns the updated document (not the old one)
- `setDefaultsOnInsert: true` - Applies schema defaults on insert

## Source Merging Strategy

### Intelligent Source Deduplication
When syncing, we merge sources intelligently:

1. **Check for Existing Document**: Query existing odds before update
2. **Merge Sources**: 
   - Update existing bookmaker entries with new data
   - Preserve old data if new data is missing
   - Add new bookmakers that weren't in previous sync
   - Keep old bookmakers that aren't in new sync (preserves historical data)
3. **Deduplicate**: Remove duplicate bookmaker entries, keeping the most recent

### Example Merge Logic
```javascript
// Create map of existing sources
const existingSourcesMap = new Map();
existingOdds.sources.forEach(source => {
  existingSourcesMap.set(source.source, source);
});

// Merge: update existing, add new
sources.forEach(newSource => {
  const existingSource = existingSourcesMap.get(newSource.source);
  if (existingSource) {
    // Update existing with new data, preserve old if new missing
    mergedSource = {
      ...existingSource,
      ...newSource,
      lastUpdated: new Date(),
      // Merge nested objects intelligently
    };
  }
});

// Deduplicate by source name (keep most recent)
const seenSources = new Map();
mergedSources.forEach(source => {
  const existing = seenSources.get(source.source);
  if (!existing || new Date(source.lastUpdated) > new Date(existing.lastUpdated)) {
    seenSources.set(source.source, source);
  }
});
```

## Indexes for Performance

### Query Optimization Indexes
```javascript
// Compound index for week/season queries
bettingOddsSchema.index({ week: 1, season: 1 });

// Index for date-based queries
bettingOddsSchema.index({ gameDate: 1 });

// Index for team-based queries
bettingOddsSchema.index({ 'homeTeam.abbreviation': 1, 'awayTeam.abbreviation': 1 });

// Index for sync tracking
bettingOddsSchema.index({ lastSynced: 1 });
```

**Purpose**: Optimize common query patterns without creating unnecessary indexes.

## Data Integrity

### Preventing Data Loss
1. **Merge Strategy**: Preserves old bookmaker data when new sync doesn't include them
2. **Nested Object Merging**: Intelligently merges moneyline, spread, and total data
3. **Timestamp Tracking**: Each source has `lastUpdated` to track when data was refreshed

### Handling Concurrent Syncs
- Unique index prevents duplicate documents
- Upsert operation is atomic (MongoDB handles race conditions)
- Source merging handles multiple syncs gracefully

## Best Practices Summary

✅ **DO**:
- Use unique compound index to prevent duplicates
- Use upsert for atomic updates
- Merge sources intelligently to preserve data
- Deduplicate sources by bookmaker name
- Track timestamps for data freshness
- Use indexes for common query patterns

❌ **DON'T**:
- Replace entire sources array without checking existing data
- Create documents without unique constraints
- Ignore existing data when syncing
- Create duplicate indexes unnecessarily

## Migration Notes

If you have existing duplicate documents, you can clean them up:

```javascript
// Find duplicates
db.bettingodds.aggregate([
  {
    $group: {
      _id: { eventId: "$eventId", season: "$season" },
      count: { $sum: 1 },
      docs: { $push: "$_id" }
    }
  },
  {
    $match: { count: { $gt: 1 } }
  }
]);

// Keep most recent, delete others
// (Run cleanup script based on results)
```

## Performance Considerations

- **Index Size**: Unique index adds minimal overhead (~few bytes per document)
- **Merge Operations**: O(n) where n is number of sources (typically < 10)
- **Query Performance**: Indexes ensure fast lookups by eventId/season

## Future Enhancements

Potential improvements:
1. Add TTL index for old odds data (auto-delete after X days)
2. Add version field for optimistic locking
3. Add change tracking for odds movements
4. Implement soft deletes instead of hard deletes





