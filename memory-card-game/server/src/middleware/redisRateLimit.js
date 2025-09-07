const redisManager = require("../utils/redis.js");

/**
 * Redis-based rate limiting middleware
 * @param {Object} options - Rate limiting options
 * @param {number} options.maxRequests - Maximum requests per window
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {Function} options.keyGenerator - Function to generate rate limit key
 * @param {Function} options.skip - Function to determine if request should be skipped
 * @returns {Function} Express middleware function
 */
const redisRateLimit = (options = {}) => {
  const {
    maxRequests = 1000,
    windowMs = 15 * 60 * 1000,
    keyGenerator = (req) => req.ip,
    skip = () => false,
    message = "Too many requests from this IP, please try again later.",
    statusCode = 429,
  } = options;

  return async (req, res, next) => {
    try {
      if (!redisManager.isConnected) {
        return next();
      }

      if (skip(req)) {
        return next();
      }

      const key = keyGenerator(req);
      const identifier = `ratelimit:${key}`;

      const rateLimitResult = await redisManager.checkRateLimit(
        identifier,
        maxRequests,
        windowMs
      );

      res.set({
        "X-RateLimit-Limit": maxRequests,
        "X-RateLimit-Remaining": rateLimitResult.remaining,
        "X-RateLimit-Reset":
          Math.floor(Date.now() / 1000) + rateLimitResult.resetTime,
      });

      if (!rateLimitResult.allowed) {
        return res.status(statusCode).json({
          error: "Rate limit exceeded",
          message: message,
          retryAfter: rateLimitResult.resetTime,
        });
      }

      next();
    } catch (error) {
      console.error("Rate limiting error:", error);

      next();
    }
  };
};

const authRateLimit = redisRateLimit({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyGenerator: (req) => `auth:${req.ip}`,
  message: "Too many authentication attempts, please try again later.",
});

const gameRateLimit = redisRateLimit({
  maxRequests: 500,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyGenerator: (req) => `game:${req.ip}`,
  message: "Too many game requests, please try again later.",
});

const apiRateLimit = redisRateLimit({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyGenerator: (req) => `api:${req.ip}`,
  message: "Too many API requests, please try again later.",
});

const userRateLimit = redisRateLimit({
  maxRequests: 200,
  windowMs: 15 * 60 * 1000,
  keyGenerator: (req) => {
    const userId = req.user?.id || req.ip;
    return `user:${userId}`;
  },
  skip: (req) => !req.user,
  message: "Too many requests for this user, please try again later.",
});

module.exports = {
  redisRateLimit,
  authRateLimit,
  gameRateLimit,
  apiRateLimit,
  userRateLimit,
};
