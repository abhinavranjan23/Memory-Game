const redis = require("redis");

class RedisManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.retryAttempts = 0;
    this.maxRetryAttempts = 5;
  }

  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

      this.client = redis.createClient({
        url: redisUrl,
        retry_strategy: (options) => {
          if (options.error && options.error.code === "ECONNREFUSED") {
            console.error("Redis server refused connection");
            return new Error("Redis server refused connection");
          }
          if (this.retryAttempts >= this.maxRetryAttempts) {
            console.error("Max Redis retry attempts reached");
            return new Error("Max retry attempts reached");
          }
          this.retryAttempts++;
          return Math.min(options.attempt * 100, 3000);
        },
      });

      this.client.on("error", (err) => {
        console.error("Redis Client Error:", err);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        this.isConnected = true;
        this.retryAttempts = 0;
      });

      this.client.on("ready", () => {});

      this.client.on("end", () => {
        this.isConnected = false;
      });

      await this.client.connect();

      return true;
    } catch (error) {
      console.error("❌ Redis connection failed:", error.message);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  // Session Storage
  async setSession(sessionId, sessionData, ttl = 3600) {
    try {
      const key = `session:${sessionId}`;
      await this.client.set(key, JSON.stringify(sessionData), { EX: ttl });
      return true;
    } catch (error) {
      console.error("Error setting session:", error);
      return false;
    }
  }

  async getSession(sessionId) {
    try {
      const key = `session:${sessionId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  }

  async deleteSession(sessionId) {
    try {
      const key = `session:${sessionId}`;
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error("Error deleting session:", error);
      return false;
    }
  }

  // Rate Limiting
  async checkRateLimit(identifier, maxRequests, windowMs) {
    try {
      const key = `ratelimit:${identifier}`;
      const current = await this.client.incr(key);

      if (current === 1) {
        await this.client.expire(key, Math.floor(windowMs / 1000));
      }

      return {
        allowed: current <= maxRequests,
        remaining: Math.max(0, maxRequests - current),
        resetTime: await this.client.ttl(key),
      };
    } catch (error) {
      console.error("Error checking rate limit:", error);
      return { allowed: true, remaining: maxRequests, resetTime: 0 };
    }
  }

  async cacheGameState(gameId, gameState, ttl = 1800) {
    try {
      const key = `game:${gameId}`;
      await this.client.set(key, JSON.stringify(gameState), { EX: ttl });
      return true;
    } catch (error) {
      console.error("Error caching game state:", error);
      return false;
    }
  }

  async getGameState(gameId) {
    try {
      const key = `game:${gameId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error getting game state:", error);
      return null;
    }
  }

  async deleteGameState(gameId) {
    try {
      const key = `game:${gameId}`;
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error("Error deleting game state:", error);
      return false;
    }
  }

  // Active Players Tracking
  async addActivePlayer(userId, userData) {
    try {
      const key = "active_players";
      await this.client.hSet(key, userId, JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error("Error adding active player:", error);
      return false;
    }
  }

  async removeActivePlayer(userId) {
    try {
      const key = "active_players";
      await this.client.hDel(key, userId);
      return true;
    } catch (error) {
      console.error("Error removing active player:", error);
      return false;
    }
  }

  async getActivePlayers() {
    try {
      const key = "active_players";
      const players = await this.client.hGetAll(key);
      const result = {};

      for (const [userId, userData] of Object.entries(players)) {
        result[userId] = JSON.parse(userData);
      }

      return result;
    } catch (error) {
      console.error("Error getting active players:", error);
      return {};
    }
  }

  async getActivePlayerCount() {
    try {
      const key = "active_players";
      const players = await this.client.hGetAll(key);
      return Object.keys(players).length;
    } catch (error) {
      console.error("Error getting active player count:", error);
      return 0;
    }
  }

  // Active Games Tracking
  async addActiveGame(gameId, gameData) {
    try {
      const key = "active_games";
      await this.client.hSet(key, gameId, JSON.stringify(gameData));
      return true;
    } catch (error) {
      console.error("Error adding active game:", error);
      return false;
    }
  }

  async removeActiveGame(gameId) {
    try {
      const key = "active_games";
      await this.client.hDel(key, gameId);
      return true;
    } catch (error) {
      console.error("Error removing active game:", error);
      return false;
    }
  }

  async getActiveGames() {
    try {
      const key = "active_games";
      const games = await this.client.hGetAll(key);
      const result = {};

      for (const [gameId, gameData] of Object.entries(games)) {
        result[gameId] = JSON.parse(gameData);
      }

      return result;
    } catch (error) {
      console.error("Error getting active games:", error);
      return {};
    }
  }

  async getActiveGameCount() {
    try {
      const key = "active_games";
      const games = await this.client.hGetAll(key);
      return Object.keys(games).length;
    } catch (error) {
      console.error("Error getting active game count:", error);
      return 0;
    }
  }

  // Leaderboard Caching
  async cacheLeaderboard(type, data, ttl = 300) {
    try {
      const key = `leaderboard:${type}`;
      await this.client.set(key, JSON.stringify(data), { EX: ttl });
      return true;
    } catch (error) {
      console.error("Error caching leaderboard:", error);
      return false;
    }
  }

  async getLeaderboard(type) {
    try {
      const key = `leaderboard:${type}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      return null;
    }
  }

  async updatePlayerScore(userId, score, leaderboardType = "global") {
    try {
      const key = `leaderboard:${leaderboardType}`;
      await this.client.zAdd(key, { score: score, value: userId });
      return true;
    } catch (error) {
      console.error("Error updating player score:", error);
      return false;
    }
  }

  async getTopPlayers(limit = 10, leaderboardType = "global") {
    try {
      const key = `leaderboard:${leaderboardType}`;
      const players = await this.client.zRange(key, 0, limit - 1, {
        REV: true,
        WITHSCORES: true,
      });
      const result = [];

      for (let i = 0; i < players.length; i += 2) {
        result.push({
          userId: players[i],
          score: parseFloat(players[i + 1]),
        });
      }

      return result;
    } catch (error) {
      console.error("Error getting top players:", error);
      return [];
    }
  }

  // Performance Boost - Cache frequently accessed data
  async cacheUserProfile(userId, userData, ttl = 1800) {
    try {
      const key = `user:${userId}`;
      await this.client.set(key, JSON.stringify(userData), { EX: ttl });
      return true;
    } catch (error) {
      console.error("Error caching user profile:", error);
      return false;
    }
  }

  async getUserProfile(userId) {
    try {
      const key = `user:${userId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error getting user profile:", error);
      return null;
    }
  }

  // Utility methods
  async ping() {
    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch (error) {
      console.error("Redis ping failed:", error);
      return false;
    }
  }

  async flushAll() {
    try {
      await this.client.flushAll();
      return true;
    } catch (error) {
      console.error("Error flushing Redis:", error);
      return false;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error("Error deleting key:", error);
      return false;
    }
  }

  async getStats() {
    try {
      const info = await this.client.info();
      const stats = {
        isConnected: this.isConnected,
        activePlayers: await this.getActivePlayerCount(),
        activeGames: await this.getActiveGameCount(),
        ping: await this.ping(),
      };
      return stats;
    } catch (error) {
      console.error("Error getting Redis stats:", error);
      return {
        isConnected: this.isConnected,
        activePlayers: 0,
        activeGames: 0,
        ping: false,
      };
    }
  }
}

// Create singleton instance
const redisManager = new RedisManager();

module.exports = redisManager;
