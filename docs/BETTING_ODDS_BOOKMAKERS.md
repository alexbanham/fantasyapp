# Multiple Bookmakers Integration

## ✅ Yes, We're Already Getting Multiple Bookmakers!

The Odds API returns odds from **multiple bookmakers** in a **single API call**. We're already aggregating and using this data efficiently.

## How It Works

### Single API Call Gets Everything

When you call The Odds API with:
```
GET /v4/sports/americanfootball_nfl/odds?regions=us&markets=h2h,spreads,totals
```

**You get in ONE response:**
- All NFL games for the week
- **Multiple bookmakers per game** (FanDuel, DraftKings, BetMGM, Caesars, etc.)
- All markets (moneyline, spreads, totals)

**Cost: 30 credits** (regardless of how many bookmakers are returned!)

### Our Aggregation Strategy

For each game, we:
1. **Receive odds from all bookmakers** (typically 5-10+ bookmakers per game)
2. **Find the best odds** across all bookmakers for each market:
   - Best moneyline (home & away)
   - Best spread odds
   - Best over/under odds
3. **Track which bookmaker** provided the best odds
4. **Store the aggregated data** with bookmaker attribution

### Example Response Structure

```json
{
  "id": "game123",
  "home_team": "Kansas City Chiefs",
  "away_team": "Buffalo Bills",
  "bookmakers": [
    {
      "key": "fanduel",
      "title": "FanDuel",
      "markets": [
        {
          "key": "h2h",
          "outcomes": [
            { "name": "Kansas City Chiefs", "price": -150 },
            { "name": "Buffalo Bills", "price": 130 }
          ]
        }
      ]
    },
    {
      "key": "draftkings",
      "title": "DraftKings",
      "markets": [
        {
          "key": "h2h",
          "outcomes": [
            { "name": "Kansas City Chiefs", "price": -145 },
            { "name": "Buffalo Bills", "price": 125 }
          ]
        }
      ]
    },
    {
      "key": "betmgm",
      "title": "BetMGM",
      "markets": [...]
    }
    // ... more bookmakers
  ]
}
```

### What We Store

For each game, we store:
- **Best moneyline odds** (with bookmaker name)
- **Best spread odds** (with bookmaker name)
- **Best total odds** (with bookmaker name)
- **Raw data** from all bookmakers (for reference)

## Credit Consumption

### Expected Credit Usage

**Per Week Sync:**
- **Cost**: 30 credits
- **Gets**: All games + All bookmakers + All markets
- **Bookmakers**: Typically 5-10+ per game (FanDuel, DraftKings, BetMGM, Caesars, etc.)

**Monthly Budget (500 credits):**
- **Can sync**: ~16 weeks (16 × 30 = 480 credits)
- **Remaining**: 20 credits buffer

### Credit Cost Formula

According to [The Odds API documentation](https://the-odds-api.com/liveapi/guides/v4/):

```
Cost = 10 × [number of unique markets] × [number of regions]
```

**Our Configuration:**
- Markets: `h2h,spreads,totals` = **3 markets**
- Regions: `us` = **1 region**
- **Total Cost: 10 × 3 × 1 = 30 credits**

**Important:** The number of bookmakers does NOT affect credit cost. One API call gets you ALL bookmakers for the same price!

## Testing Expectations

When you test a week sync, expect:

### Console Output:
```
[The Odds API] Fetching all NFL odds (cost: ~30 credits for 3 markets × 1 region)...
[The Odds API] Successfully fetched 16 games with odds
[The Odds API] Available bookmakers: FanDuel, DraftKings, BetMGM, Caesars, PointsBet, BetRivers, Unibet, ...
[The Odds API] Credits - Used: 30, Remaining: 470, Last call cost: 30
[The Odds API] Processing 8 bookmakers for DAL @ PHI: FanDuel, DraftKings, BetMGM, Caesars, PointsBet, BetRivers, Unibet, WynnBET
[Sync Week 1] Matched 16 games from The Odds API
[Sync Week 1] Completed - Success: 16, Failed: 0, Skipped: 0, Credits Used: 30
```

### What You Get:
- ✅ **16 games** with odds
- ✅ **5-10+ bookmakers** per game
- ✅ **Best odds** aggregated from all bookmakers
- ✅ **Bookmaker attribution** (which bookmaker has best odds)
- ✅ **30 credits** consumed

### Database Storage:

Each game stores:
```javascript
{
  sources: [{
    source: 'TheOddsAPI',
    moneyline: {
      home: {
        american: -150,
        decimal: 1.67,
        impliedProbability: 0.60,
        bookmaker: 'FanDuel'  // ← Best bookmaker
      },
      away: {
        american: 130,
        decimal: 2.30,
        impliedProbability: 0.43,
        bookmaker: 'DraftKings'  // ← Best bookmaker
      }
    },
    spread: {
      home: {
        points: -3.5,
        odds: {
          american: -110,
          bookmaker: 'BetMGM'  // ← Best bookmaker
        }
      }
    },
    // ... more markets
    rawData: {
      // Full response with ALL bookmakers
      bookmakers: [...]
    }
  }]
}
```

## Available Bookmakers

The Odds API typically provides odds from:
- **FanDuel**
- **DraftKings**
- **BetMGM**
- **Caesars**
- **PointsBet**
- **BetRivers**
- **Unibet**
- **WynnBET**
- **Barstool Sportsbook**
- **FOX Bet**
- And more...

The exact bookmakers vary by game and availability.

## Summary

✅ **Yes, we're getting multiple bookmakers**  
✅ **One API call gets ALL bookmakers**  
✅ **Cost is 30 credits per week sync**  
✅ **We aggregate to find best odds**  
✅ **We track which bookmaker has best odds**  
✅ **Monthly budget: ~16 weeks of syncs**

The system is optimized to get maximum value from your API credits by aggregating odds from all available bookmakers in a single efficient call!





