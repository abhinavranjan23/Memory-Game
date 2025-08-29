const express = require("express");
const { createServer } = require("http");
const { Server: SocketIOServer } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require("./routes/auth.js");
const gameRoutes = require("./routes/game.js");
const userRoutes = require("./routes/user.js");
const adminRoutes = require("./routes/admin.js");

// Import socket handlers
const { initializeSocket } = require("./socket/index.js");

// Import metrics
const { getMetrics, apiMetricsMiddleware } = require("./utils/metrics.js");

// Import Redis manager
const redisManager = require("./utils/redis.js");

const app = express();
const server = createServer(app);

// Global error handlers
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit the process, just log the error
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Don't exit the process, just log the error
});

// Increase max listeners to prevent warnings
require("events").EventEmitter.defaultMaxListeners = 20;

// CORS configuration
const corsOptions = {
  origin: [
    process.env.CLIENT_URL || "http://localhost:5173",
    "http://localhost:5174",
    "https://e95fedc38c75.ngrok-free.app",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Log CORS configuration
console.log("CORS configuration:", corsOptions);

// Initialize Socket.IO with CORS
const io = new SocketIOServer(server, {
  cors: corsOptions,
  transports: ["websocket", "polling"],
});

// Log Socket.IO configuration
console.log("Socket.IO initialized with CORS:", corsOptions);

// Security middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

// Logging
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined"));
}

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// API metrics middleware
if (process.env.ENABLE_METRICS === "true") {
  app.use(apiMetricsMiddleware);
}

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const redisStats = await redisManager.getStats();

    res.status(200).json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      redis: redisStats,
    });
  } catch (error) {
    res.status(200).json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      redis: { isConnected: false, error: error.message },
    });
  }
});

// Metrics endpoint
if (process.env.ENABLE_METRICS === "true") {
  app.get("/metrics", async (req, res) => {
    try {
      const metrics = await getMetrics();
      res.set("Content-Type", "text/plain");
      res.send(metrics);
    } catch (error) {
      console.error("Error getting metrics:", error);
      res.status(500).send("Error getting metrics");
    }
  });
}

// Set socket.io instance for game routes
gameRoutes.setSocketIO(io);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation Error",
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      message: "Invalid ID format",
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      message: "Duplicate entry found",
    });
  }

  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    message: "API endpoint not found",
    path: req.originalUrl,
  });
});

// Initialize Socket.IO
initializeSocket(io);

// Database connection
const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/memory-game";

    await mongoose.connect(mongoURI);

    console.log("✅ MongoDB connected successfully");

    // Log database info
    const dbName = mongoose.connection.db.databaseName;
    console.log(`📊 Connected to database: ${dbName}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);

    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

// Redis connection
const connectRedis = async () => {
  try {
    const connected = await redisManager.connect();
    if (connected) {
      console.log("✅ Redis connected successfully");
    } else {
      console.log("⚠️ Redis connection failed, continuing without Redis");
    }
  } catch (error) {
    console.error("❌ Redis connection error:", error.message);
    console.log("⚠️ Continuing without Redis support");
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  // Close server
  server.close(async () => {
    console.log("HTTP server closed.");

    try {
      // Close database connection
      await mongoose.connection.close();
      console.log("MongoDB connection closed.");
    } catch (error) {
      console.error("Error closing MongoDB connection:", error);
    }

    try {
      // Close Redis connection
      await redisManager.disconnect();
      console.log("Redis connection closed.");
    } catch (error) {
      console.error("Error closing Redis connection:", error);
    }

    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error(
      "Could not close connections in time, forcefully shutting down"
    );
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});

// Start server
const PORT = process.env.PORT || 3001;
const METRICS_PORT = process.env.METRICS_PORT || 9090;

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(
        `📍 Client URL: ${process.env.CLIENT_URL || "http://localhost:5173"}`
      );
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);

      if (process.env.ENABLE_METRICS === "true") {
        console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
        console.log(
          `📈 Prometheus Metrics: http://localhost:${METRICS_PORT}/metrics`
        );
      }
    });

    // Start metrics server if enabled
    if (process.env.ENABLE_METRICS === "true") {
      const metricsApp = express();
      const metricsServer = require("http").createServer(metricsApp);

      metricsApp.get("/metrics", async (req, res) => {
        try {
          const metrics = await getMetrics();
          res.set("Content-Type", "text/plain");
          res.send(metrics);
        } catch (error) {
          console.error("Error getting metrics:", error);
          res.status(500).send("Error getting metrics");
        }
      });

      metricsApp.get("/health", (req, res) => {
        res.status(200).json({
          status: "OK",
          service: "metrics",
          timestamp: new Date().toISOString(),
        });
      });

      metricsServer.listen(METRICS_PORT, () => {
        console.log(`📊 Metrics server running on port ${METRICS_PORT}`);
        console.log(
          `📈 Prometheus endpoint: http://localhost:${METRICS_PORT}/metrics`
        );
      });
    }
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

module.exports = { app, server, io };
