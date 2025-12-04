# Player Props Credit Cost Analysis

## Per-Event API Pricing

**Important Discovery**: Player props are NOT available on the bulk `/sports/{sport}/odds` endpoint. They require **per-event calls** using `/sports/{sport}/events/{eventId}/odds`.

**Cost Formula**: `1 credit per market per region per event`

## Credit Cost Breakdown

### Test Results
- **1 market** (`player_anytime_td`) for **1 event** = **1 credit** ✅
- Successfully fetched 168 player props for 20 unique players

### Full Week Sync Costs

#### Scenario 1: Core 5 Player Prop Markets (Recommended)
**Markets**: `player_anytime_td`, `player_pass_tds`, `player_rush_yds`, `player_pass_yds`, `player_receptions`

**Note**: `player_receiving_yds` is not available (returns no data). Valid markets are:
- ✅ `player_anytime_td` - Anytime touchdown
- ✅ `player_pass_tds` - Passing touchdowns  
- ✅ `player_rush_yds` - Rushing yards
- ✅ `player_pass_yds` - Passing yards
- ✅ `player_receptions` - Receptions
- ✅ `player_rush_attempts` - Rush attempts
- ✅ `player_pass_completions` - Pass completions
- ✅ `player_pass_interceptions` - Interceptions
- ❌ `player_receiving_yds` - Not available (no data)
- ❌ `player_first_td` - Not available (no data)

- **Cost per game**: 5 markets × 1 credit = **5 credits per game**
- **Games per week**: ~15 NFL games (varies 13-16)
- **Total per week**: 15 games × 5 credits = **75 credits per week**

**Monthly Budget Impact**:
- 500 credits / 75 credits per sync = **~6 syncs per month**
- If syncing once per week: **4 syncs/month = 300 credits** (60% of budget)
- Leaves **200 credits** for game odds syncs and other operations

#### Scenario 2: Extended Player Props (8 Markets)
**Markets**: Core 4 + `player_pass_yds`, `player_receptions`, `player_rush_attempts`, `player_first_td`

- **Cost per game**: 8 markets × 1 credit = **8 credits per game**
- **Total per week**: 15 games × 8 credits = **120 credits per week**

**Monthly Budget Impact**:
- 500 credits / 120 credits per sync = **~4 syncs per month**
- If syncing once per week: **4 syncs/month = 480 credits** (96% of budget)
- Leaves only **20 credits** for other operations ⚠️

#### Scenario 3: All Available Player Props (~15 Markets)
**Markets**: All player prop markets available from The Odds API

- **Cost per game**: ~15 markets × 1 credit = **~15 credits per game**
- **Total per week**: 15 games × 15 credits = **225 credits per week**

**Monthly Budget Impact**:
- 500 credits / 225 credits per sync = **~2 syncs per month**
- **Not recommended** - Would exhaust budget too quickly

## Comparison with Game Odds Sync

### Current Game Odds Sync
- **Endpoint**: `/sports/{sport}/odds` (bulk endpoint)
- **Markets**: `h2h,spreads,totals` (3 markets)
- **Cost**: **30 credits per week** (all games in one call)
- **Efficiency**: Single API call for all games

### Player Props Sync
- **Endpoint**: `/sports/{sport}/events/{eventId}/odds` (per-event)
- **Markets**: Variable (4-15 markets)
- **Cost**: **60-225 credits per week** (15 separate API calls)
- **Efficiency**: Requires multiple API calls (one per game)

## Recommended Strategy

### Option A: Core 4 Markets (Best Balance)
- **Cost**: 60 credits per week
- **Sync Frequency**: Once per week
- **Monthly Cost**: 240 credits (48% of budget)
- **Remaining Credits**: 260 credits for game odds and other operations
- **Pros**: Good coverage of most popular props, manageable cost
- **Cons**: Doesn't include all available props

### Option B: On-Demand Fetching (Most Flexible)
- **Base Cost**: 0 credits (only fetch when requested)
- **Per-Request Cost**: Variable (1 credit per market per game)
- **Use Case**: Fetch player props for specific games/players when user requests
- **Pros**: No wasted credits, users get exactly what they need
- **Cons**: Requires user interaction, slower for bulk viewing

### Option C: Hybrid Approach (Recommended)
1. **Weekly Sync**: Core 4 markets (60 credits/week)
2. **On-Demand**: Additional markets fetched per-game when requested
3. **Best of Both**: Regular updates for popular props + flexibility for specific needs

## Implementation Notes

### Current Test Results
- ✅ Per-event endpoint works correctly
- ✅ Successfully fetching player props data
- ✅ Cost confirmed: 1 credit per market per event
- ✅ Data structure validated (168 props for 20 players in test)

### Next Steps
1. Implement full week sync for core 4 markets
2. Store player props separately from game odds
3. Create on-demand endpoint for additional markets
4. Add UI to display player props
5. Implement player name matching logic

## Credit Budget Planning

**Monthly Budget**: 500 credits

**Recommended Allocation**:
- **Game Odds Sync**: 30 credits/week × 4 weeks = 120 credits/month
- **Player Props Sync**: 60 credits/week × 4 weeks = 240 credits/month
- **Buffer/Other Operations**: 140 credits/month

**Total**: 500 credits/month ✅

**Alternative (Less Frequent Player Props)**:
- **Game Odds Sync**: 30 credits/week × 4 weeks = 120 credits/month
- **Player Props Sync**: 60 credits/week × 2 weeks = 120 credits/month (bi-weekly)
- **Buffer/Other Operations**: 260 credits/month

**Total**: 500 credits/month ✅

