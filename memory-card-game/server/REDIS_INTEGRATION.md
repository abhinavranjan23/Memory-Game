# Redis Integration for Memory Card Game

This document explains the Redis integration implemented in the Memory Card Game server, which provides enhanced performance, scalability, and real-time features.

## 🚀 Features Implemented

### ✅ Session Storage

- **Purpose**: Store user sessions and authentication tokens
- **Benefits**: Faster session validation, reduced database load
- **TTL**: Configurable (default: 1 hour)
- **Usage**: Automatic session management for authenticated users

### ✅ Rate Limiting

- **Purpose**: Request throttling with Redis storage
- **Benefits**: Distributed rate limiting, better performance than in-memory
- **Types**:
  - Authentication: 5 requests per 15 minutes
  - Game requests: 50 requests per 15 minutes
  - API requests: 100 requests per 15 minutes
  - User-specific: 200 requests per 15 minutes

### ✅ Game State Caching

- **Purpose**: Fast access to active game states
- **Benefits**: Reduced database queries, faster game updates
- **TTL**: Configurable (default: 30 minutes)
- **Usage**: Automatic caching of game states during gameplay

### ✅ Active Players Tracking

- **Purpose**: Real-time player count and data
- **Benefits**: Live player statistics, better user experience
- **Data**: Player ID, username, last activity, current status

### ✅ Active Games Tracking

- **Purpose**: Monitor ongoing games
- **Benefits**: Real-time game statistics, better monitoring
- **Data**: Game ID, players, status, creation time

### ✅ Leaderboard Caching

- **Purpose**: Cache frequently accessed leaderboards
- **Benefits**: Faster leaderboard display, reduced database load
- **TTL**: Configurable (default: 5 minutes)
- **Features**: Sorted sets for efficient ranking

### ✅ Performance Boost

- **Purpose**: Faster data access for frequently used data
- **Benefits**: Reduced response times, better user experience
- **Features**: User profile caching, intelligent cache invalidation

### ✅ Scalability

- **Purpose**: Better handling of concurrent users
- **Benefits**: Horizontal scaling support, distributed caching
- **Features**: Redis cluster support, connection pooling

## 🛠️ Setup Instructions

### 1. Install Redis

#### Option A: Local Installation

```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Windows
# Download from https://redis.io/download
```

#### Option B: Docker

```bash
docker run -d --name redis-server -p 6379:6379 redis:alpine
```

#### Option C: Redis Cloud (Free Tier)

1. Go to https://redis.com/try-free/
2. Create a free account
3. Create a new database
4. Copy the connection URL

### 2. Configure Environment Variables

Add to your `.env` file:

```env
REDIS_URL=redis://localhost:6379
# Or for Redis Cloud:
# REDIS_URL=redis://username:password@host:port
```

### 3. Check Redis Connection

```bash
npm run check:redis
```

### 4. Run Redis Tests

```bash
npm run test:redis
```

## 📊 Usage Examples

### Session Management

```javascript
const redisManager = require("./src/utils/redis.js");

// Store session
await redisManager.setSession("session-id", {
  userId: "123",
  username: "john",
});

// Retrieve session
const session = await redisManager.getSession("session-id");

// Delete session
await redisManager.deleteSession("session-id");
```

### Rate Limiting

```javascript
const { redisRateLimit } = require("./src/middleware/redisRateLimit.js");

// Use in routes
app.use(
  "/api/auth",
  redisRateLimit({
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  })
);
```

### Game State Caching

```javascript
// Cache game state
await redisManager.cacheGameState('game-123', {
  id: 'game-123',
  players: ['user1', 'user2'],
  board: [...],
  currentTurn: 'user1'
});

// Retrieve game state
const gameState = await redisManager.getGameState('game-123');
```

### Active Players Tracking

```javascript
// Add active player
await redisManager.addActivePlayer("user123", {
  id: "user123",
  username: "john",
  lastSeen: new Date().toISOString(),
});

// Get active players
const activePlayers = await redisManager.getActivePlayers();
const playerCount = await redisManager.getActivePlayerCount();
```

### Leaderboard Management

```javascript
// Update player score
await redisManager.updatePlayerScore("user123", 1500, "global");

// Get top players
const topPlayers = await redisManager.getTopPlayers(10, "global");

// Cache leaderboard
await redisManager.cacheLeaderboard("global", leaderboardData);
```

## 🔧 Configuration

### Redis Connection Options

```javascript
// In src/utils/redis.js
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
```

### TTL Settings

- **Sessions**: 3600 seconds (1 hour)
- **Game States**: 1800 seconds (30 minutes)
- **Leaderboards**: 300 seconds (5 minutes)
- **User Profiles**: 1800 seconds (30 minutes)

### Rate Limiting Configuration

```javascript
// Authentication
maxRequests: 5, windowMs: 15 * 60 * 1000

// Game requests
maxRequests: 50, windowMs: 15 * 60 * 1000

// API requests
maxRequests: 100, windowMs: 15 * 60 * 1000

// User-specific
maxRequests: 200, windowMs: 15 * 60 * 1000
```

## 📈 Monitoring

### Health Check Endpoint

```bash
GET /health
```

Response includes Redis status:

```json
{
  "status": "OK",
  "redis": {
    "isConnected": true,
    "activePlayers": 5,
    "activeGames": 3,
    "ping": true
  }
}
```

### Redis Statistics

```javascript
const stats = await redisManager.getStats();
console.log(stats);
// {
//   isConnected: true,
//   activePlayers: 5,
//   activeGames: 3,
//   ping: true
// }
```

## 🚨 Error Handling

The Redis integration is designed to be fault-tolerant:

- **Connection Failures**: Application continues without Redis
- **Operation Failures**: Graceful degradation with fallbacks
- **Timeout Handling**: Automatic retry with exponential backoff
- **Memory Management**: Automatic cleanup of expired data

## 🔒 Security Considerations

- **Connection Security**: Use SSL/TLS for production Redis connections
- **Authentication**: Implement Redis authentication for production
- **Network Security**: Restrict Redis access to application servers
- **Data Encryption**: Sensitive data is not stored in Redis (only session tokens)

## 📝 Best Practices

1. **Monitor Memory Usage**: Redis memory usage should be monitored
2. **Set Appropriate TTLs**: Don't let cached data expire too quickly or slowly
3. **Use Connection Pooling**: For high-traffic applications
4. **Implement Cache Warming**: Pre-populate frequently accessed data
5. **Regular Cleanup**: Monitor and clean up stale data

## 🧪 Testing

Run the comprehensive test suite:

```bash
npm run test:redis
```

This tests all Redis functionality:

- Connection and ping
- Session storage
- Rate limiting
- Game state caching
- Active players tracking
- Active games tracking
- Leaderboard caching
- Performance caching
- Statistics and monitoring

## 🔄 Migration from In-Memory

The Redis integration is designed to work alongside existing in-memory solutions:

1. **Gradual Migration**: Redis can be enabled/disabled via configuration
2. **Fallback Support**: Application works without Redis
3. **Data Consistency**: Redis data is automatically synchronized
4. **Performance Monitoring**: Compare performance with and without Redis

## 📞 Support

For issues with Redis integration:

1. Check Redis connection: `npm run check:redis`
2. Run tests: `npm run test:redis`
3. Check server logs for Redis-related errors
4. Verify environment variables are set correctly
