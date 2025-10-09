# Fantasy Football Analytics Platform

A comprehensive, full-stack fantasy football analytics platform that provides real-time game data, player insights, AI-powered analysis, and advanced fantasy football tools. This application integrates multiple data sources to deliver actionable insights for fantasy football managers.

## Features

### 🏈 **Live Game Tracking**
- **Real-time Score Updates**: Live NFL game scores and play-by-play data
- **Game Polling Service**: Automated background polling for live game updates
- **Live Score Strip**: Real-time game status display with team logos and scores
- **Game Situation Tracking**: Down, distance, possession, and red zone indicators

### 🤖 **AI-Powered Analytics**
- **AI Insights Engine**: Google Generative AI integration for fantasy analysis
- **Weekly AI Recommendations**: Automated weekly player recommendations
- **Custom Query System**: Ask AI questions about your fantasy team and players
- **News Analysis**: AI-powered analysis of fantasy football news and trends
- **Smart Filtering**: AI-enhanced news filtering and relevance scoring

### 📊 **Player Analytics**
- **Comprehensive Player Database**: Full NFL player profiles with FantasyPros integration
- **Player Projections**: Multi-scoring format projections (STD, PPR, HALF)
- **Player Outlook**: Detailed player analysis and future performance predictions
- **Player Sync**: Automated player data synchronization from multiple sources
- **Player Browser**: Advanced player search and filtering capabilities

### 📰 **News & Content**
- **Fantasy News Feed**: Aggregated fantasy football news from multiple sources
- **Enhanced News Articles**: Rich article display with impact scoring and sentiment analysis
- **News Filtering**: Advanced filtering by category, impact, source, and sentiment
- **Web Scraping**: Automated content scraping and analysis
- **News Tracking**: Track important news items and their fantasy impact

### ⚙️ **Configuration & Management**
- **Dynamic Configuration**: Runtime configuration updates for season and week settings
- **Data Synchronization**: Automated sync with ESPN, FantasyPros, and other data sources
- **Dashboard Analytics**: Comprehensive dashboard with stats cards and system status
- **Color Scheme Management**: Dark/light mode with customizable color schemes

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
├── backend/                    # Node.js/Express backend
│   ├── src/
│   │   ├── models/            # MongoDB schemas (Game, Player, Projection, Stats)
│   │   ├── routes/            # API endpoints
│   │   │   ├── analysis.js    # AI analysis endpoints
│   │   │   ├── config.js      # Configuration management
│   │   │   ├── depthChart.js  # Depth chart data
│   │   │   ├── live.js        # Live game data
│   │   │   ├── playerDetails.js # Detailed player info
│   │   │   ├── players.js     # Player management
│   │   │   ├── ppr.js         # PPR projections
│   │   │   └── projections.js # Player projections
│   │   ├── services/          # Business logic and external APIs
│   │   │   ├── espnService.js      # ESPN API integration
│   │   │   ├── fantasyProsService.js # FantasyPros API
│   │   │   ├── gamePollingService.js # Live game polling
│   │   │   └── sportsDataService.js  # Sports data integration
│   │   ├── cron/              # Scheduled jobs
│   │   │   ├── fetchData.js   # Data fetching tasks
│   │   │   └── updateData.js  # Data update tasks
│   │   └── server.js          # Main server file
│   ├── spec/                  # API specifications
│   ├── package.json
│   └── .env
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── dashboard/     # Dashboard-specific components
│   │   │   │   ├── AIInsightsSidebar.tsx
│   │   │   │   ├── Configuration.tsx
│   │   │   │   ├── NewsFeed.tsx
│   │   │   │   ├── NewsFilters.tsx
│   │   │   │   ├── QuickActions.tsx
│   │   │   │   └── StatsCards.tsx
│   │   │   ├── ui/            # Reusable UI components
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   └── select.tsx
│   │   │   ├── AIInsights.tsx
│   │   │   ├── ColorSchemeToggler.tsx
│   │   │   ├── EnhancedNewsArticle.tsx
│   │   │   ├── Layout.tsx
│   │   │   ├── LiveScoreStrip.tsx
│   │   │   └── PlayerAvatar.tsx
│   │   ├── pages/             # Page components
│   │   │   ├── Dashboard.tsx      # Main dashboard
│   │   │   ├── Games.tsx          # Games page
│   │   │   ├── PlayerBrowser.tsx  # Player search/browse
│   │   │   ├── PlayerOutlook.tsx  # Player analysis
│   │   │   ├── PlayerProfile.tsx  # Individual player details
│   │   │   ├── PlayerSync.tsx     # Player data sync
│   │   │   ├── Settings.tsx       # App settings
│   │   │   └── WeeklyAnalysis.tsx # Weekly analysis
│   │   ├── contexts/          # React contexts
│   │   │   └── ColorSchemeContext.tsx
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useAI.ts       # AI functionality
│   │   │   └── useDashboard.ts # Dashboard state management
│   │   ├── lib/               # Utility libraries
│   │   │   ├── colorSchemes.ts
│   │   │   └── utils.ts
│   │   ├── services/          # API services
│   │   │   └── api.ts
│   │   ├── types/             # TypeScript type definitions
│   │   │   └── dashboard.ts
│   │   ├── App.tsx            # Main app component
│   │   ├── main.tsx           # App entry point
│   │   └── index.css          # Global styles
│   ├── public/                # Static assets
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── tsconfig.node.json
├── package.json               # Root package.json
└── README.md
```

## Getting Started

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

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=6300
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/fantasy_football

# API Keys
FANTASYPROS_API_KEY=your_fantasypros_api_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Optional: Additional API keys for extended functionality
SPORTS_DATA_API_KEY=your_sportsdata_api_key_here
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

### API Endpoints

#### Player Management
- `GET /api/players` - Get all players with filtering options
- `GET /api/players/:id` - Get specific player details
- `POST /api/players/sync` - Sync player data from external sources

#### Projections & Analysis
- `GET /api/projections` - Get player projections for current week
- `GET /api/ppr` - Get PPR-specific projections and rankings
- `GET /api/analysis` - Get AI-powered analysis and insights
- `POST /api/analysis/query` - Submit custom AI queries

#### Live Game Data
- `GET /api/live/games` - Get current live games and scores
- `GET /api/live/scoreboard` - Get complete scoreboard data
- `POST /api/live/polling/start` - Start live game polling
- `POST /api/live/polling/stop` - Stop live game polling

#### Configuration
- `GET /api/config` - Get current system configuration
- `PUT /api/config` - Update system configuration
- `POST /api/config/season/:season` - Update current season
- `POST /api/config/week/:week` - Update current week

#### System Health
- `GET /api/health` - System health check and status
- `GET /api/depth-chart` - Get team depth chart information

## Development

### Backend Development

```bash
cd backend
npm run dev          # Start development server
npm run data:fetch   # Fetch latest data
npm run data:update  # Update projections
```

### Frontend Development

```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

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

### ✅ **Completed Features**
- [x] Real-time game tracking and live scores
- [x] AI-powered fantasy analysis with Google Generative AI
- [x] Comprehensive player database with FantasyPros integration
- [x] Advanced news filtering and sentiment analysis
- [x] Web scraping for fantasy news and content
- [x] Dynamic configuration management
- [x] Responsive dashboard with dark/light mode
- [x] Automated data synchronization
- [x] Live game polling service

### 🚧 **In Development**
- [ ] Enhanced player projections with machine learning
- [ ] Advanced trade analyzer with AI recommendations
- [ ] Waiver wire priority calculator
- [ ] Historical performance analysis
- [ ] Custom league scoring system integration

### 🔮 **Future Enhancements**
- [ ] Mobile app (React Native)
- [ ] Multi-user support and team management
- [ ] Advanced VBD algorithms
- [ ] Playoff schedule impact analysis
- [ ] Social features and league chat
- [ ] Advanced analytics dashboard
- [ ] Integration with major fantasy platforms (ESPN, Yahoo, Sleeper)
- [ ] Real-time notifications and alerts
```

## Key Features Overview

This fantasy football analytics platform provides a comprehensive suite of tools for fantasy managers:

### **🏈 Live Game Experience**
- Real-time NFL game tracking with live scores and game situations
- Automated polling service for continuous updates during game days
- Interactive score strip with team logos and detailed game information

### **🤖 AI-Powered Insights**
- Google Generative AI integration for advanced fantasy analysis
- Custom query system for personalized insights
- Weekly AI recommendations based on current data
- News analysis with sentiment and impact scoring

### **📊 Advanced Analytics**
- Comprehensive player database with FantasyPros integration
- Multi-format projections (Standard, PPR, Half-PPR)
- Player outlook and performance predictions
- Advanced filtering and search capabilities

### **📰 News & Content Management**
- Aggregated fantasy news from multiple sources
- Web scraping for automated content collection
- Advanced filtering by category, impact, and sentiment
- Enhanced article display with relevance scoring

### **⚙️ System Management**
- Dynamic configuration for season and week settings
- Automated data synchronization from multiple sources
- Comprehensive dashboard with system status monitoring
- Responsive design with customizable color schemes

The platform is built with modern technologies and follows best practices for scalability, maintainability, and user experience. It's designed to be a comprehensive solution for serious fantasy football managers who want data-driven insights and real-time information.
