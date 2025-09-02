const jwt = require("jsonwebtoken");

// Validate JWT secrets
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters long");
}

if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 32) {
  throw new Error("JWT_REFRESH_SECRET must be at least 32 characters long");
}

// Token expiration times (in seconds)
const JWT_ACCESS_EXPIRY = parseInt(process.env.JWT_ACCESS_EXPIRY) || 900; // 15 minutes
const JWT_REFRESH_EXPIRY = parseInt(process.env.JWT_REFRESH_EXPIRY) || 604800; // 7 days
const JWT_GUEST_EXPIRY = parseInt(process.env.JWT_GUEST_EXPIRY) || 3600; // 1 hour

// Generate access token (short-lived)
const generateAccessToken = (userId, isGuest = false) => {
  const payload = {
    userId,
    isGuest,
    type: "access",
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: isGuest ? JWT_GUEST_EXPIRY : JWT_ACCESS_EXPIRY,
  });
};

// Generate refresh token (long-lived)
const generateRefreshToken = (userId, isGuest = false) => {
  const payload = {
    userId,
    isGuest,
    type: "refresh",
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: isGuest ? JWT_GUEST_EXPIRY : JWT_REFRESH_EXPIRY,
  });
};

// Verify access token
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== "access") {
      throw new Error("Invalid token type");
    }
    return decoded;
  } catch (error) {
    return null;
  }
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    if (decoded.type !== "refresh") {
      throw new Error("Invalid token type");
    }
    return decoded;
  } catch (error) {
    return null;
  }
};

// Extract token from Authorization header
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
};

// Generate both tokens
const generateTokenPair = (userId, isGuest = false) => {
  return {
    accessToken: generateAccessToken(userId, isGuest),
    refreshToken: generateRefreshToken(userId, isGuest),
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  generateTokenPair,
};
