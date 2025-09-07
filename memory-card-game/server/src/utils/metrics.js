const promClient = require("prom-client");

const register = new promClient.Registry();

promClient.collectDefaultMetrics({ register });

const metrics = {
  // Game metrics
  activeGames: new promClient.Gauge({
    name: "memory_game_active_games",
    help: "Number of currently active games",
    registers: [register],
  }),

  totalGamesPlayed: new promClient.Counter({
    name: "memory_game_total_games_played",
    help: "Total number of games played",
    registers: [register],
  }),

  gamesCompleted: new promClient.Counter({
    name: "memory_game_games_completed",
    help: "Total number of games completed",
    labelNames: ["game_mode", "board_size"],
    registers: [register],
  }),

  // Player metrics
  activePlayers: new promClient.Gauge({
    name: "memory_game_active_players",
    help: "Number of currently active players",
    registers: [register],
  }),

  totalPlayers: new promClient.Counter({
    name: "memory_game_total_players",
    help: "Total number of unique players",
    registers: [register],
  }),

  playerActions: new promClient.Counter({
    name: "memory_game_player_actions",
    help: "Total number of player actions",
    labelNames: ["action_type", "game_mode"],
    registers: [register],
  }),

  // Performance metrics
  gameDuration: new promClient.Histogram({
    name: "memory_game_duration_seconds",
    help: "Duration of games in seconds",
    labelNames: ["game_mode", "board_size"],
    buckets: [30, 60, 120, 300, 600, 1200, 1800],
    registers: [register],
  }),

  cardFlipTime: new promClient.Histogram({
    name: "memory_game_card_flip_time_ms",
    help: "Time between card flips in milliseconds",
    labelNames: ["game_mode"],
    buckets: [100, 250, 500, 1000, 2000, 5000],
    registers: [register],
  }),

  // Error metrics
  gameErrors: new promClient.Counter({
    name: "memory_game_errors_total",
    help: "Total number of game errors",
    labelNames: ["error_type"],
    registers: [register],
  }),

  // Socket metrics
  socketConnections: new promClient.Gauge({
    name: "memory_game_socket_connections",
    help: "Number of active socket connections",
    registers: [register],
  }),

  socketDisconnections: new promClient.Counter({
    name: "memory_game_socket_disconnections_total",
    help: "Total number of socket disconnections",
    registers: [register],
  }),

  powerUpsUsed: new promClient.Counter({
    name: "memory_game_powerups_used",
    help: "Total number of power-ups used",
    labelNames: ["powerup_type"],
    registers: [register],
  }),

  achievementsUnlocked: new promClient.Counter({
    name: "memory_game_achievements_unlocked",
    help: "Total number of achievements unlocked",
    labelNames: ["achievement_type"],
    registers: [register],
  }),

  activeRooms: new promClient.Gauge({
    name: "memory_game_active_rooms",
    help: "Number of currently active rooms",
    registers: [register],
  }),

  roomCreationTime: new promClient.Histogram({
    name: "memory_game_room_creation_time_ms",
    help: "Time to create a new room in milliseconds",
    buckets: [10, 25, 50, 100, 250, 500],
    registers: [register],
  }),

  // API metrics
  apiRequests: new promClient.Counter({
    name: "memory_game_api_requests_total",
    help: "Total number of API requests",
    labelNames: ["method", "endpoint", "status_code"],
    registers: [register],
  }),

  apiResponseTime: new promClient.Histogram({
    name: "memory_game_api_response_time_ms",
    help: "API response time in milliseconds",
    labelNames: ["method", "endpoint"],
    buckets: [10, 25, 50, 100, 250, 500, 1000],
    registers: [register],
  }),

  dbOperations: new promClient.Counter({
    name: "memory_game_db_operations_total",
    help: "Total number of database operations",
    labelNames: ["operation", "collection"],
    registers: [register],
  }),

  dbOperationTime: new promClient.Histogram({
    name: "memory_game_db_operation_time_ms",
    help: "Database operation time in milliseconds",
    labelNames: ["operation", "collection"],
    buckets: [1, 5, 10, 25, 50, 100, 250],
    registers: [register],
  }),
};

// Helper functions to update metrics
const updateMetrics = {
  // Game metrics
  incrementActiveGames: () => metrics.activeGames.inc(),
  decrementActiveGames: () => metrics.activeGames.dec(),
  setActiveGames: (count) => metrics.activeGames.set(count),

  incrementTotalGames: () => metrics.totalGamesPlayed.inc(),

  incrementGamesCompleted: (gameMode, boardSize) => {
    metrics.gamesCompleted.inc({ game_mode: gameMode, board_size: boardSize });
  },

  // Player metrics
  incrementActivePlayers: () => metrics.activePlayers.inc(),
  decrementActivePlayers: () => metrics.activePlayers.dec(),
  setActivePlayers: (count) => metrics.activePlayers.set(count),

  incrementTotalPlayers: () => metrics.totalPlayers.inc(),

  incrementPlayerActions: (actionType, gameMode) => {
    metrics.playerActions.inc({ action_type: actionType, game_mode: gameMode });
  },

  // Performance metrics
  recordGameDuration: (duration, gameMode, boardSize) => {
    metrics.gameDuration.observe(
      { game_mode: gameMode, board_size: boardSize },
      duration
    );
  },

  recordCardFlipTime: (time, gameMode) => {
    metrics.cardFlipTime.observe({ game_mode: gameMode }, time);
  },

  incrementErrors: (errorType) => {
    metrics.gameErrors.inc({ error_type: errorType });
  },

  incrementSocketConnections: () => metrics.socketConnections.inc(),
  decrementSocketConnections: () => metrics.socketConnections.dec(),
  setSocketConnections: (count) => metrics.socketConnections.set(count),

  incrementSocketDisconnections: () => metrics.socketDisconnections.inc(),

  incrementPowerUpsUsed: (powerUpType) => {
    metrics.powerUpsUsed.inc({ powerup_type: powerUpType });
  },

  incrementAchievements: (achievementType) => {
    metrics.achievementsUnlocked.inc({ achievement_type: achievementType });
  },

  incrementActiveRooms: () => metrics.activeRooms.inc(),
  decrementActiveRooms: () => metrics.activeRooms.dec(),
  setActiveRooms: (count) => metrics.activeRooms.set(count),

  recordRoomCreationTime: (time) => {
    metrics.roomCreationTime.observe({}, time);
  },

  incrementApiRequests: (method, endpoint, statusCode) => {
    metrics.apiRequests.inc({
      method: method.toUpperCase(),
      endpoint: endpoint,
      status_code: statusCode,
    });
  },

  recordApiResponseTime: (time, method, endpoint) => {
    metrics.apiResponseTime.observe(
      {
        method: method.toUpperCase(),
        endpoint: endpoint,
      },
      time
    );
  },

  incrementDbOperations: (operation, collection) => {
    metrics.dbOperations.inc({ operation: operation, collection: collection });
  },

  recordDbOperationTime: (time, operation, collection) => {
    metrics.dbOperationTime.observe(
      {
        operation: operation,
        collection: collection,
      },
      time
    );
  },
};

// Middleware for API metrics
const apiMetricsMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Override res.end to capture response time and status
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - startTime;
    const method = req.method;
    const endpoint = req.route ? req.route.path : req.path;
    const statusCode = res.statusCode;

    updateMetrics.incrementApiRequests(method, endpoint, statusCode);
    updateMetrics.recordApiResponseTime(duration, method, endpoint);

    originalEnd.apply(this, args);
  };

  next();
};

// Database operation wrapper for metrics
const withDbMetrics = (operation, collection) => {
  return async (...args) => {
    const startTime = Date.now();
    try {
      updateMetrics.incrementDbOperations(operation, collection);
      const result = await args[0]; // Assuming the first arg is the promise
      const duration = Date.now() - startTime;
      updateMetrics.recordDbOperationTime(duration, operation, collection);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      updateMetrics.recordDbOperationTime(duration, operation, collection);
      updateMetrics.incrementErrors("database");
      throw error;
    }
  };
};

// Get metrics as text
const getMetrics = async () => {
  return await register.metrics();
};

// Get metrics as JSON
const getMetricsJson = async () => {
  const metricsText = await register.metrics();
  const lines = metricsText.split("\n");
  const result = {};

  lines.forEach((line) => {
    if (line && !line.startsWith("#")) {
      const [metricName, value] = line.split(" ");
      if (metricName && value) {
        result[metricName] = parseFloat(value);
      }
    }
  });

  return result;
};

module.exports = {
  register,
  metrics,
  updateMetrics,
  apiMetricsMiddleware,
  withDbMetrics,
  getMetrics,
  getMetricsJson,
};
