const redis = require("redis");

async function checkRedisConnection() {
  const client = redis.createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });

  try {
    await client.connect();
    const ping = await client.ping();

    if (ping === "PONG") {
      console.log("✅ Redis is running and responding to ping");

      // Get Redis info
      const info = await client.info();
      const lines = info.split("\n");
      const version = lines.find((line) => line.startsWith("redis_version"));
      const uptime = lines.find((line) => line.startsWith("uptime_in_seconds"));

      if (version) {
        console.log(`📦 Redis Version: ${version.split(":")[1]}`);
      }
      if (uptime) {
        const uptimeSeconds = parseInt(uptime.split(":")[1]);
        const uptimeHours = Math.floor(uptimeSeconds / 3600);
        console.log(`⏱️  Redis Uptime: ${uptimeHours} hours`);
      }

      await client.quit();
      return true;
    }
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.log("❌ Redis is not running or not accessible");
      console.log("💡 Please start Redis server or check connection settings");
    } else {
      console.error("❌ Redis connection error:", error.message);
    }

    return false;
  }
}

// Run the check
checkRedisConnection()
  .then((isRunning) => {
    if (isRunning) {
      console.log("🎉 Redis is working properly!");
    } else {
      console.log("⚠️ Redis is not working properly");
    }
    process.exit(isRunning ? 0 : 1);
  })
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
