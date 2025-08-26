const axios = require("axios");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const BASE_URL = "http://localhost:3001/api";

async function testJWTAndPasswordBugs() {
  try {
    // Test 1: Check JWT token structure and security
    const testUser = {
      username: "jwt_test_" + Date.now(),
      email: `jwt${Date.now()}@test.com`,
      password: "SecurePassword123!",
    };

    const registerResponse = await axios.post(
      `${BASE_URL}/auth/register`,
      testUser
    );
    const token = registerResponse.data.token;

    if (!token) {
      return;
    }

    // Decode token without verification to check structure
    const decoded = jwt.decode(token);
    .toISOString());
    .toISOString());
    // Check token expiration time
    const tokenAge = decoded.exp - decoded.iat;
    const expectedAge = 900; // 15 minutes
    if (Math.abs(tokenAge - expectedAge) <= 5) {
      } else {
      "
      );
    }

    // Test 2: Check password hashing security
    // Try to login with the same password to verify hashing works
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      emailOrUsername: testUser.username,
      password: testUser.password,
    });

    if (loginResponse.data.token) {
      } else {
      }

    // Test 3: Check for JWT secret exposure
    // Try to verify token with a wrong secret
    try {
      jwt.verify(token, "wrong-secret-key");
      } catch (error) {
      if (error.message.includes("invalid signature")) {
        } else {
        }
    }

    // Test 4: Check for token tampering
    // Create a tampered token by modifying the payload
    const tamperedToken = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        ...decoded,
        userId: "tampered_user_id",
      })
    )
      .toString("base64")
      .replace(/=/g, "");
    tamperedToken[1] = tamperedPayload;
    const tamperedTokenString = tamperedToken.join(".");

    try {
      await axios.get(`${BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${tamperedTokenString}`,
        },
      });
      } catch (error) {
      if (error.response?.status === 401) {
        } else {
        }
    }

    // Test 5: Check for weak password acceptance
    const weakPasswords = ["123", "abc", "password", "qwerty", "123456"];
    let weakPasswordAccepted = false;

    for (const weakPassword of weakPasswords) {
      try {
        await axios.post(`${BASE_URL}/auth/register`, {
          username: "weak_test_" + Date.now(),
          email: `weak${Date.now()}@test.com`,
          password: weakPassword,
        });
        weakPasswordAccepted = true;
        break;
      } catch (error) {
        if (error.response?.status === 400) {
          }
      }
    }

    if (!weakPasswordAccepted) {
      }

    // Test 6: Check for JWT token replay attacks
    // Use the same token multiple times (should work for valid tokens)
    const replayAttempts = [];
    for (let i = 0; i < 5; i++) {
      replayAttempts.push(
        axios
          .get(`${BASE_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          .catch((error) => error)
      );
    }

    const replayResults = await Promise.all(replayAttempts);
    const successfulReplays = replayResults.filter(
      (r) => r.status === 200
    ).length;
    const failedReplays = replayResults.filter(
      (r) => r.response?.status === 401
    ).length;

    // Test 7: Check for timing attacks in password comparison
    const timingTests = [];
    const startTime = Date.now();

    // Test with correct password
    timingTests.push(
      axios
        .post(`${BASE_URL}/auth/login`, {
          emailOrUsername: testUser.username,
          password: testUser.password,
        })
        .catch((error) => error)
    );

    // Test with wrong password
    timingTests.push(
      axios
        .post(`${BASE_URL}/auth/login`, {
          emailOrUsername: testUser.username,
          password: "WrongPassword123!",
        })
        .catch((error) => error)
    );

    const timingResults = await Promise.all(timingTests);
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    "
    );

    // Test 8: Check for JWT token expiration handling
    // Create a token that expires in 1 second
    const shortLivedToken = jwt.sign(
      {
        userId: decoded.userId,
        isGuest: false,
        type: "access",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 1,
      },
      process.env.JWT_SECRET || "fallback-secret"
    );

    // Wait for token to expire
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      await axios.get(`${BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${shortLivedToken}`,
        },
      });
      } catch (error) {
      if (error.response?.status === 401) {
        } else {
        }
    }

    } catch (error) {
    console.error(
      "❌ JWT & Password test failed:",
      error.response?.data || error.message
    );
  }
}

// Run the focused test
testJWTAndPasswordBugs();
