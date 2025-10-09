const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

console.log('========================================');
console.log('STARTING SERVER');
console.log('========================================');
console.log('Node version:', process.version);
console.log('Environment - PORT:', process.env.PORT);
console.log('Environment - MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('Environment - NODE_ENV:', process.env.NODE_ENV);
console.log('Binding to 0.0.0.0 (all interfaces)');

// Environment variable validation
function validateEnvironment() {
  const requiredVars = [
    'MONGODB_URI',
    'PORT',
    'NODE_ENV',
    'API_TIMEOUT',
    'API_RETRY_ATTEMPTS',
    'API_RETRY_DELAY',
    'GAME_POLL_ACTIVE_INTERVAL',
    'GAME_POLL_IDLE_INTERVAL',
    'GAME_POLL_MAX_CONSECUTIVE_ERRORS',
    'ESPN_LEAGUE_ID',
    'SEASON_ID'
  ];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Current environment variables:', Object.keys(process.env).filter(k => k.startsWith('MONGODB') || k === 'PORT' || k === 'NODE_ENV'));
    process.exit(1);
  }
}
// Validate environment on startup
validateEnvironment();
console.log('Environment validation passed');
const playerDetailsRoutes = require('./routes/playerDetails');
const liveRoutes = require('./routes/live');
const configRoutes = require('./routes/config');
const newsRoutes = require('./routes/news');
const dataRoutes = require('./routes/data');
const espnSyncRoutes = require('./routes/espnSync');
const espnPlayersRoutes = require('./routes/espnplayers');
const leagueRoutes = require('./routes/league');
// Import services
const gamePollingService = require('./services/gamePollingService');
const Config = require('./models/Config');
const app = express();
const PORT = Number(process.env.PORT) || 6300;
// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200
};
// Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Database connection
const mongoUri = process.env.MONGODB_URI;
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB connected successfully');
  // Check config before starting polling service
  try {
    const config = await Config.getConfig();
    if (config.pollingEnabled) {
      await gamePollingService.start();
      console.log('Game polling service started');
    }
  } catch (error) {
    console.error('Error starting polling service:', error);
  }
  
  // Start server after MongoDB is connected
  console.log('Starting HTTP server...');
  const HOST = '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });
})
.catch(err => {
  console.error('MongoDB connection error:', err.message);
  console.error('Full error:', err);
  process.exit(1);
});
// Routes
app.use('/api/players', playerDetailsRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/config', configRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/sync/espn', espnSyncRoutes);
app.use('/api/espnplayers', espnPlayersRoutes);
app.use('/api/league', leagueRoutes);
// Health check endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    pollingStatus: gamePollingService.getStatus()
  });
});

app.get('/healthz', (req, res) => {
  res.send('ok');
});
// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({ 
    success: false,
    error: 'Internal server error',
    message: err.message 
  });
});
// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});
// Graceful shutdown
process.on('SIGTERM', () => {
  gamePollingService.stop();
  mongoose.connection.close(() => {
    process.exit(0);
  });
});
process.on('SIGINT', () => {
  gamePollingService.stop();
  mongoose.connection.close(() => {
    process.exit(0);
  });
});
// Connection event handlers for monitoring
mongoose.connection.on('connected', () => {
  console.log('Mongoose connection event: connected');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err.message);
});

// Add unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose connection event: disconnected');
});