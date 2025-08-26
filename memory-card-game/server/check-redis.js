const redis = require("redis");

async function checkRedisConnection() {
  const client = redis.createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });

  try {
    await client.connect();
    const ping = await client.ping();

    if (ping === "PONG") {
      // Get Redis info
      const info = await client.info();
      const lines = info.split("\n");
      const version = lines.find((line) => line.startsWith("redis_version"));
      const uptime = lines.find((line) => line.startsWith("uptime_in_seconds"));

      if (version) {
        [1]}`);
      }
      if (uptime) {
        const uptimeSeconds = parseInt(uptime.split(":")[1]);
        const uptimeHours = Math.floor(uptimeSeconds / 3600);
        }

      await client.quit();
      return true;
    }
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      ");
      ");
      }

    return false;
  }
}

// Run the check
checkRedisConnection()
  .then((isRunning) => {
    if (isRunning) {
      } else {
      }
    process.exit(isRunning ? 0 : 1);
  })
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
