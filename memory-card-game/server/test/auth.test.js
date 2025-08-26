const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  generateTokenPair,
} = require("../src/utils/auth.js");

const { validateUser } = require("../src/utils/validation.js");

// Test 1: Token Generation
try {
  const userId = "test-user-id";
  const accessToken = generateAccessToken(userId, false);
  const refreshToken = generateRefreshToken(userId, false);

  if (accessToken && refreshToken) {
  } else {
    process.exit(1);
  }
} catch (error) {
  process.exit(1);
}

// Test 2: Token Verification
try {
  const userId = "test-user-id";
  const accessToken = generateAccessToken(userId, false);
  const refreshToken = generateRefreshToken(userId, false);

  const decodedAccess = verifyAccessToken(accessToken);
  const decodedRefresh = verifyRefreshToken(refreshToken);

  if (decodedAccess && decodedAccess.userId === userId) {
  } else {
    process.exit(1);
  }

  if (decodedRefresh && decodedRefresh.userId === userId) {
  } else {
    process.exit(1);
  }
} catch (error) {
  process.exit(1);
}

// Test 3: Guest Token Generation
try {
  const guestId = "guest_1234567890_abcdef";
  const guestAccessToken = generateAccessToken(guestId, true);
  const guestRefreshToken = generateRefreshToken(guestId, true);

  const decodedGuest = verifyAccessToken(guestAccessToken);

  if (decodedGuest && decodedGuest.isGuest && decodedGuest.userId === guestId) {
  } else {
    process.exit(1);
  }
} catch (error) {
  process.exit(1);
}

// Test 4: Token Header Extraction
try {
  const testToken = "test-token-123";
  const authHeader = `Bearer ${testToken}`;
  const extractedToken = extractTokenFromHeader(authHeader);

  if (extractedToken === testToken) {
  } else {
    process.exit(1);
  }

  // Test invalid header
  const invalidHeader = "InvalidHeader test-token";
  const invalidToken = extractTokenFromHeader(invalidHeader);

  if (invalidToken === null) {
  } else {
    process.exit(1);
  }
} catch (error) {
  process.exit(1);
}

// Test 5: Token Pair Generation
try {
  const userId = "test-user-id";
  const tokenPair = generateTokenPair(userId, false);

  if (tokenPair.accessToken && tokenPair.refreshToken) {
    // Verify both tokens
    const decodedAccess = verifyAccessToken(tokenPair.accessToken);
    const decodedRefresh = verifyRefreshToken(tokenPair.refreshToken);

    if (decodedAccess && decodedRefresh && decodedAccess.userId === userId) {
    } else {
      process.exit(1);
    }
  } else {
    process.exit(1);
  }
} catch (error) {
  process.exit(1);
}

// Test 6: User Validation
try {
  // Valid user data
  const validUser = {
    username: "testuser123",
    email: "test@example.com",
    password: "TestPass123!",
  };

  const validatedUser = validateUser(validUser);
  if (validatedUser.username === validUser.username) {
  } else {
    process.exit(1);
  }

  // Invalid user data
  try {
    const invalidUser = {
      username: "ab", // Too short
      email: "invalid-email",
      password: "weak",
    };

    validateUser(invalidUser);
    process.exit(1);
  } catch (error) {}
} catch (error) {
  process.exit(1);
}

// Test 7: Token Expiration
try {
  // This test would require time manipulation in a real test environment
  // For now, we'll just verify the token structure
  const userId = "test-user-id";
  const accessToken = generateAccessToken(userId, false);
  const decoded = verifyAccessToken(accessToken);

  if (decoded && decoded.iat && decoded.exp) {
  } else {
    process.exit(1);
  }
} catch (error) {
  process.exit(1);
}
