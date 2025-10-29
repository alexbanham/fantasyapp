# Fantasy Football Analytics Platform

A comprehensive, full-stack fantasy football analytics platform that provides real-time game data, player insights, AI-powered analysis, and advanced fantasy football tools. This application integrates multiple data sources to deliver actionable insights for fantasy football managers.

## Features

- Dashboard:
  - Live score strip with polling toggle and current week display
  - Game highlights when no live games are active
  - News feed with filters; one-click syncs for players, week, news, and boxscores
  - Configuration modal to change season/week and enable/disable polling
- Games:
  - Week navigation and refresh
  - Real-time game list with status, venue, clock; live updates overlay
  - Game modal with fantasy scorers (home/away), team context, and points
- League:
  - Standings (wins/losses, PF/PA, streak, logos) and week matchups (status badges)
  - Week selector with current/past/future labels and prev/next week controls
  - Detailed rosters view: starters/bench, totals, per-player points; auto background sync if stale
- Players:
  - Top performers by position for a selected week
  - Player browser with search, position/team/roster-status filters, sort by points/projections
  - Player modal with weekly actuals vs projections and team/roster context
- Player Profile:
  - Overview, weekly stats table, latest news, and injury report
  - Current-week projections, historical vs projected comparisons, season summaries
- Analytics:
  - Manager score leaderboard (efficiency = actual/optimal)
  - Team weekly breakdown: starters vs optimal lineup, bench impact, slot-by-slot changes
  - Position group averages per team with optional league ranking
- Data:
  - CSV exports (projections, performance, analytics) with progress and download handling
- Settings:
  - Local analysis settings (teams, roster spots, scoring type) with save/reset
- UI:
  - Dark/light modes and color scheme utilities

## Tech Stack

### Backend
- **Node.js** with **Express.js** - RESTful API server
- **MongoDB** with **Mongoose** - Document database for game and player data
- **FantasyPros API** - Player rankings, projections, and fantasy data
- **ESPN API** - Live game scores, schedules, and team data
- **Google Generative AI** - AI-powered fantasy analysis and insights
- **Cheerio** - Web scraping for fantasy news and content
- **Node-cron** - Scheduled data updates and polling
- **Node-cache** - Performance optimization and caching
- **Axios** - HTTP client for API integrations
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing

### Frontend
- **React 18** with **TypeScript** - Modern UI framework
- **Vite** - Fast development and building
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icon library
- **Zustand** - Lightweight state management
- **React Router** - Client-side routing
- **Axios** - HTTP client for API communication
- **Class Variance Authority** - Component variant management

## Project Structure

```
fantasyapp/
├── backend/                      # Node.js/Express backend
│   ├── src/
│   │   ├── models/              # Mongoose models (Config, Game, Matchup, etc.)
│   │   ├── routes/              # API route modules
│   │   │   ├── config.js        # System configuration
│   │   │   ├── data.js          # Data access and utilities
│   │   │   ├── espnplayers.js   # ESPN player data helpers
│   │   │   ├── espnSync.js      # ESPN sync utilities
│   │   │   ├── league.js        # League and lineup tools
│   │   │   ├── live.js          # Live game data
│   │   │   └── news.js          # News aggregation
│   │   ├── services/            # Business logic and external APIs
│   │   │   ├── boxscoreSync.js
│   │   │   ├── espnService.js
│   │   │   ├── fantasyProsNewsService.js
│   │   │   ├── gamePollingService.js
│   │   │   └── imageProcessor.js
│   │   ├── cron/
│   │   │   └── updateData.js    # Data update tasks
│   │   ├── utils/               # Utility modules
│   │   │   ├── optimalLineupCalculator.js
│   │   │   └── slots.js
│   │   └── server.js            # Main server file (mounts /api/* routes)
│   ├── spec/                    # API specifications (OpenAPI files)
│   ├── package.json
│   └── render.yaml              # Deployment config (Render)
├── frontend/                     # React + Vite frontend (TypeScript)
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   └── ui/
│   │   ├── pages/               # Routes: Dashboard, Games, League, etc.
│   │   ├── services/            # API client
│   │   ├── contexts/, hooks/, lib/, types/
│   │   └── main.tsx, App.tsx
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── vercel.json              # Deployment config (Vercel)
├── package.json                  # Root workspace package
└── README.md
```

## Getting Started

## Quick Start

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (in a new shell)
cd frontend && npm install && npm run dev
```

Then visit:
- Frontend: http://localhost:6100
- API: http://localhost:6300 (health: /api/health)

## Demo

The latest frontend is deployed on Vercel at [fantasyapp.vercel.app](https://fantasyapp.vercel.app).
- If your API is running elsewhere (e.g., local `http://localhost:6300`), configure the frontend to point at it via `VITE_API_BASE_URL` or enable the backend `CORS_ORIGINS` to include the Vercel domain.

### Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (local installation or MongoDB Atlas)
- **FantasyPros API key** (for player data and projections)
- **Google Generative AI API key** (for AI-powered insights)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fantasyapp
   ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install
   # Create .env file with required environment variables
   npm run dev
   ```

3. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:6100
   - Backend API: http://localhost:6300
   - Health Check: http://localhost:6300/api/health

### Environment Variables

Create a `.env` file in the `backend/` directory. The server validates the following variables at startup:

```env
# Server
PORT=6300
NODE_ENV=development
CORS_ORIGINS=http://localhost:6100

# Database
MONGODB_URI=mongodb://localhost:27017/fantasy_football

# ESPN/Season (private leagues require cookies)
ESPN_LEAGUE_ID=your_espn_league_id
ESPN_S2_COOKIE=your_espn_s2_cookie
ESPN_SWID_COOKIE={YOUR-SWID}
SEASON_ID=2025

# Polling and request controls
API_TIMEOUT=15000
API_RETRY_ATTEMPTS=3
API_RETRY_DELAY=750
GAME_POLL_ACTIVE_INTERVAL=5000
GAME_POLL_IDLE_INTERVAL=30000
GAME_POLL_MAX_CONSECUTIVE_ERRORS=10

# Integrations
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
# Optional
FANTASYPROS_API_KEY=your_fantasypros_api_key_here
```

### Frontend Environment Variables

Create a `.env` in the `frontend/` directory:

```env
# Base URL for API requests from the frontend
# Defaults to `/api` (useful when frontend and backend are reverse-proxied together)
VITE_API_BASE_URL=http://localhost:6300/api
```

## Usage

### Initial Setup

1. **Configure System Settings**: Set current season, week, and data sources
2. **Sync Player Data**: Use the player sync functionality to populate your database
3. **Start Game Polling**: Enable live game updates for real-time scores
4. **Configure AI Analysis**: Set up AI insights and custom queries

### Data Management

- **Manual Data Sync**: Use the dashboard sync buttons for ESPN and FantasyPros data
- **Automated Polling**: Live game polling runs automatically when enabled
- **Web Scraping**: Automated news scraping and analysis
- **AI Analysis**: On-demand AI insights and weekly recommendations

### ESPN Integration

- Uses the `espn-fantasy-football-api` client plus direct ESPN endpoints to get complete league data (teams, rosters, matchups, standings) and weekly player stats.
- For private leagues, set `ESPN_S2_COOKIE` and `ESPN_SWID_COOKIE` in `.env`. Without these, ESPN calls may return 401 and endpoints will respond with `requiresAuth: true`.
- Key modules: `backend/src/services/espnService.js` (fetch/merge/mapping), `backend/src/services/boxscoreSync.js` (ingestion to Mongo models: `WeeklyPlayerLine`, `WeeklyTeamTotals`, `Matchup`, `FantasyTeam`).
- Typical flow:
  1) Ingest: call `/api/sync/espn/current-week` or use scripts `npm run sync:week` / `sync:backfill`.
  2) Consume: UI and APIs read `/api/league/overview`, `/api/league/matchups`, `/api/league/standings`.
  3) Explore players: `/api/espnplayers` supports filtering, sorting, and top-performers.

### API Surface (route groups)

Base URL: `http://localhost:6300/api`

- `/players` — Player details and lookup
- `/live` — Live games, scoreboards, and polling controls
- `/config` — Read/update runtime configuration
- `/data` — Data access utilities (e.g., weeks, positions)
- `/sync/espn` — ESPN synchronization helpers
- `/espnplayers` — ESPN player utilities
- `/league` — League tools (optimal lineup, roster utilities)
- `/health` — Health/status at `/api/health` (JSON) and `/healthz` (plain text)

## Development

### Backend Development

```bash
cd backend
npm run dev                 # Start backend on port 6300
npm run data:update         # Run data update job
npm run sync:week           # Sync a single week (requires SEASON_ID, WEEK)
npm run sync:backfill       # Backfill an entire season (requires SEASON_ID)
```

### Frontend Development

```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

## Deployment

- Frontend: Vercel (configured via `vercel.json`). Set `VITE_API_BASE_URL` to your backend URL.
- Backend: Any Node host (Render example in `backend/render.yaml`). Ensure env vars are set and MongoDB reachable.
- CORS: Add the deployed frontend origin to `CORS_ORIGINS` (comma-separated) in backend `.env`.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue on GitHub or contact the development team.

## Roadmap

- Completed: live game polling, player/league tools, news aggregation, config API, dashboard UI.
- In progress: lineup optimizer improvements, ESPN sync refinements, stability/observability.
- Planned: ML projections, trade/waiver tools, multi-user/auth, notifications.

## Troubleshooting

- 401 from ESPN endpoints: set `ESPN_S2_COOKIE` and `ESPN_SWID_COOKIE` for private leagues.
- Cannot connect to MongoDB: verify `MONGODB_URI` and network/firewall rules.
- CORS errors in browser: include your frontend origin in backend `CORS_ORIGINS`.
- Frontend cannot reach API: set `frontend/.env` `VITE_API_BASE_URL` to your API (e.g., `https://api.example.com/api`).
