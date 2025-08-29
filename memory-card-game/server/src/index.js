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
    "https://memory-game-pink-six.vercel.app/",
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

// Beautiful root endpoint
app.get("/", (req, res) => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  const uptimeString = `${hours}h ${minutes}m ${seconds}s`;
  const environment = process.env.NODE_ENV || "development";
  const port = process.env.PORT || 3001;
  const timestamp = new Date().toISOString();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Memory Masters - Server Status</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        
        .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            max-width: 600px;
            width: 90%;
        }
        
        .logo {
            font-size: 3rem;
            margin-bottom: 20px;
            animation: pulse 2s infinite;
        }
        
        .title {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 10px;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .subtitle {
            font-size: 1.2rem;
            margin-bottom: 30px;
            opacity: 0.9;
        }
        
        .status {
            background: rgba(76, 175, 80, 0.2);
            border: 2px solid #4caf50;
            border-radius: 15px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .status-text {
            font-size: 1.5rem;
            font-weight: bold;
            color: #4caf50;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .info-card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .info-label {
            font-size: 0.9rem;
            opacity: 0.7;
            margin-bottom: 5px;
        }
        
        .info-value {
            font-size: 1.1rem;
            font-weight: bold;
        }
        
        .links {
            margin-top: 30px;
        }
        
        .link {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 25px;
            margin: 10px;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .link:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
        
        .footer {
            margin-top: 30px;
            opacity: 0.7;
            font-size: 0.9rem;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        .floating-particles {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -1;
        }
        
        .particle {
            position: absolute;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            animation: float 6s infinite linear;
        }
        
        @keyframes float {
            0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100px) rotate(360deg); opacity: 0; }
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 20px;
            }
            
            .title {
                font-size: 2rem;
            }
            
            .logo {
                font-size: 2.5rem;
            }
            
            .info-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="floating-particles" id="particles"></div>
    
    <div class="container">
        <div class="logo">🎮</div>
        <h1 class="title">Memory Masters</h1>
        <p class="subtitle">Multiplayer Memory Card Game Server</p>
        
        <div class="status">
            <div class="status-text">🚀 Server Running Successfully</div>
        </div>
        
        <div class="info-grid">
            <div class="info-card">
                <div class="info-label">Environment</div>
                <div class="info-value">${environment}</div>
            </div>
            <div class="info-card">
                <div class="info-label">Port</div>
                <div class="info-value">${port}</div>
            </div>
            <div class="info-card">
                <div class="info-label">Uptime</div>
                <div class="info-value">${uptimeString}</div>
            </div>
            <div class="info-card">
                <div class="info-label">Timestamp</div>
                <div class="info-value">${new Date(
                  timestamp
                ).toLocaleString()}</div>
            </div>
        </div>
        
        <div class="links">
            <a href="/health" class="link">🔍 Health Check</a>
            <a href="/api" class="link"> API Endpoints</a>
            ${
              process.env.ENABLE_METRICS === "true"
                ? '<a href="/metrics" class="link">📊 Metrics</a>'
                : ""
            }
        </div>
        
        <div class="footer">
            <p>Built with ❤️ for secure, engaging, and enjoyable multiplayer gaming</p>
            <p>Memory Masters - Where Strategy Meets Memory</p>
        </div>
    </div>
    
    <script>
        // Create floating particles
        function createParticles() {
            const particlesContainer = document.getElementById('particles');
            const particleCount = 20;
            
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.width = Math.random() * 10 + 5 + 'px';
                particle.style.height = particle.style.width;
                particle.style.animationDelay = Math.random() * 6 + 's';
                particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
                particlesContainer.appendChild(particle);
            }
        }
        
        // Initialize particles
        createParticles();
        
        // Update uptime every second
        setInterval(() => {
            const uptimeElement = document.querySelector('.info-value');
            if (uptimeElement && uptimeElement.textContent.includes('h')) {
                const startTime = Date.now() - (${uptime * 1000});
                const currentUptime = Math.floor((Date.now() - startTime) / 1000);
                const hours = Math.floor(currentUptime / 3600);
                const minutes = Math.floor((currentUptime % 3600) / 60);
                const seconds = Math.floor(currentUptime % 60);
                uptimeElement.textContent = \`\${hours}h \${minutes}m \${seconds}s\`;
            }
        }, 1000);
    </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

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
        `📍 Client URL: ${
          process.env.CLIENT_URL || "https://memory-game-pink-six.vercel.app/"
        }`
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
