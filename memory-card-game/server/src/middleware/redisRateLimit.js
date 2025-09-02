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
    maxRequests = 100,
    windowMs = 15 * 60 * 1000, // 15 minutes
    keyGenerator = (req) => req.ip,
    skip = () => false,
    message = "Too many requests from this IP, please try again later.",
    statusCode = 429,
  } = options;

  return async (req, res, next) => {
    try {
      // Skip rate limiting if Redis is not connected
      if (!redisManager.isConnected) {
        return next();
      }

      // Skip rate limiting if skip function returns true
      if (skip(req)) {
        return next();
      }

      // Generate rate limit key
      const key = keyGenerator(req);
      const identifier = `ratelimit:${key}`;

      // Check rate limit
      const rateLimitResult = await redisManager.checkRateLimit(
        identifier,
        maxRequests,
        windowMs
      );

      // Add rate limit headers
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
      // Continue without rate limiting if Redis fails
      next();
    }
  };
};

/**
 * Authentication-specific rate limiting
 */
const authRateLimit = redisRateLimit({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyGenerator: (req) => `auth:${req.ip}`,
  message: "Too many authentication attempts, please try again later.",
});

/**
 * Game-specific rate limiting
 */
const gameRateLimit = redisRateLimit({
  maxRequests: 50,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyGenerator: (req) => `game:${req.ip}`,
  message: "Too many game requests, please try again later.",
});

/**
 * API-specific rate limiting
 */
const apiRateLimit = redisRateLimit({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyGenerator: (req) => `api:${req.ip}`,
  message: "Too many API requests, please try again later.",
});

/**
 * User-specific rate limiting
 */
const userRateLimit = redisRateLimit({
  maxRequests: 200,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyGenerator: (req) => {
    const userId = req.user?.id || req.ip;
    return `user:${userId}`;
  },
  skip: (req) => !req.user, // Skip if no authenticated user
  message: "Too many requests for this user, please try again later.",
});

module.exports = {
  redisRateLimit,
  authRateLimit,
  gameRateLimit,
  apiRateLimit,
  userRateLimit,
};
