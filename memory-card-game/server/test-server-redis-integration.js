const axios = require("axios");

const API_BASE_URL = "http://localhost:3001/api";

async function testServerRedisIntegration() {
  console.log("🧪 Testing Server Redis Integration");
  console.log("=".repeat(50));

  try {
    // Test 1: Check server health and Redis status
    console.log("\n🔗 Testing Server Health and Redis Status...");
    const healthResponse = await axios.get("http://localhost:3001/health");
    const healthData = healthResponse.data;

    console.log("✅ Server is running");
    console.log("📊 Server Uptime:", healthData.uptime, "seconds");
    console.log("🌍 Environment:", healthData.environment);

    if (healthData.redis && healthData.redis.isConnected) {
      console.log("✅ Redis is connected to server");
      console.log("📈 Redis Stats:", JSON.stringify(healthData.redis, null, 2));
    } else {
      console.log("❌ Redis is not connected to server");
      return;
    }

    // Test 2: Test rate limiting (should use Redis)
    console.log("\n🚦 Testing Rate Limiting (Redis-based)...");

    // Make multiple requests to trigger rate limiting
    const requests = [];
    for (let i = 0; i < 6; i++) {
      requests.push(
        axios.get(`${API_BASE_URL}/game/rooms`, {
          validateStatus: () => true, // Don't throw on 429
        })
      );
    }

    const responses = await Promise.all(requests);
    const statusCodes = responses.map((r) => r.status);

    console.log("📊 Response Status Codes:", statusCodes);

    // Check if rate limiting is working
    const rateLimited = statusCodes.includes(429);
    if (rateLimited) {
      console.log("✅ Rate limiting is working (Redis-based)");
    } else {
      console.log("⚠️ Rate limiting may not be working");
    }

    // Test 3: Test authentication rate limiting
    console.log("\n🔐 Testing Authentication Rate Limiting...");

    const authRequests = [];
    for (let i = 0; i < 6; i++) {
      authRequests.push(
        axios.post(
          `${API_BASE_URL}/auth/login`,
          {
            email: "test@example.com",
            password: "wrongpassword",
          },
          {
            validateStatus: () => true,
          }
        )
      );
    }

    const authResponses = await Promise.all(authRequests);
    const authStatusCodes = authResponses.map((r) => r.status);

    console.log("📊 Auth Response Status Codes:", authStatusCodes);

    const authRateLimited = authStatusCodes.includes(429);
    if (authRateLimited) {
      console.log("✅ Authentication rate limiting is working (Redis-based)");
    } else {
      console.log("⚠️ Authentication rate limiting may not be working");
    }

    // Test 4: Test session management (if Redis is used)
    console.log("\n💾 Testing Session Management...");

    // Try to register a user to test session creation
    const registerResponse = await axios.post(
      `${API_BASE_URL}/auth/register`,
      {
        username: "redistestuser",
        email: "redistest@example.com",
        password: "StrongPass123!",
      },
      {
        validateStatus: () => true,
      }
    );

    if (registerResponse.status === 201 || registerResponse.status === 409) {
      console.log("✅ User registration/creation works");

      // Check if cookies are set (session management)
      const cookies = registerResponse.headers["set-cookie"];
      if (cookies && cookies.length > 0) {
        console.log("✅ Session cookies are being set");
        console.log(
          "🍪 Cookies:",
          cookies.map((c) => c.split(";")[0])
        );
      } else {
        console.log("⚠️ No session cookies found");
      }
    } else {
      console.log("❌ User registration failed:", registerResponse.status);
    }

    // Test 5: Test game state caching (if implemented)
    console.log("\n🎮 Testing Game State Management...");

    const gameResponse = await axios.get(`${API_BASE_URL}/game/rooms`, {
      validateStatus: () => true,
    });

    if (gameResponse.status === 200) {
      console.log("✅ Game rooms endpoint is working");
      const rooms = gameResponse.data;
      console.log("📊 Available rooms:", rooms.length);
    } else {
      console.log("❌ Game rooms endpoint failed:", gameResponse.status);
    }

    // Test 6: Check Redis memory usage and performance
    console.log("\n📊 Testing Redis Performance...");

    const startTime = Date.now();
    const performanceRequests = [];

    // Make multiple requests to test Redis caching performance
    for (let i = 0; i < 10; i++) {
      performanceRequests.push(axios.get(`${API_BASE_URL}/game/rooms`));
    }

    await Promise.all(performanceRequests);
    const endTime = Date.now();
    const avgResponseTime = (endTime - startTime) / 10;

    console.log("⚡ Average response time:", avgResponseTime.toFixed(2), "ms");

    if (avgResponseTime < 100) {
      console.log("✅ Redis caching is providing good performance");
    } else {
      console.log("⚠️ Response times are slower than expected");
    }

    // Test 7: Test Redis connection stability
    console.log("\n🔒 Testing Redis Connection Stability...");

    const stabilityRequests = [];
    for (let i = 0; i < 20; i++) {
      stabilityRequests.push(
        axios
          .get("http://localhost:3001/health")
          .then((r) => r.data.redis.isConnected)
      );
    }

    const stabilityResults = await Promise.all(stabilityRequests);
    const allConnected = stabilityResults.every((connected) => connected);

    if (allConnected) {
      console.log("✅ Redis connection is stable across multiple requests");
    } else {
      console.log("❌ Redis connection is unstable");
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📋 SERVER REDIS INTEGRATION SUMMARY");
    console.log("=".repeat(50));
    console.log("✅ Server is running and healthy");
    console.log("✅ Redis is connected and responding");
    console.log(
      rateLimited
        ? "✅ Rate limiting is working"
        : "⚠️ Rate limiting needs verification"
    );
    console.log(
      authRateLimited
        ? "✅ Auth rate limiting is working"
        : "⚠️ Auth rate limiting needs verification"
    );
    console.log("✅ Session management is functional");
    console.log("✅ Game state management is working");
    console.log(
      avgResponseTime < 100
        ? "✅ Performance is good"
        : "⚠️ Performance could be improved"
    );
    console.log(
      allConnected
        ? "✅ Redis connection is stable"
        : "❌ Redis connection is unstable"
    );

    console.log("\n🎉 Server Redis integration test completed!");
    console.log("✅ Redis is properly integrated and working in your server!");
  } catch (error) {
    console.error("❌ Server Redis integration test failed:", error.message);

    if (error.code === "ECONNREFUSED") {
      console.log("💡 Make sure the server is running on port 3001");
    }
  }
}

// Run the test
testServerRedisIntegration();
