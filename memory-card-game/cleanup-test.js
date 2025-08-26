const axios = require("axios");

// Configuration
const BASE_URL = "http://localhost:3001";
const ADMIN_TOKEN = "YOUR_ADMIN_JWT_TOKEN_HERE"; // Replace with actual admin token

async function runCleanup() {
  try {
    console.log("🔄 Running database cleanup...");

    const response = await axios.post(
      `${BASE_URL}/api/game/cleanup`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ADMIN_TOKEN}`,
        },
      }
    );

    console.log("✅ Cleanup completed successfully!");
    console.log("📊 Results:", response.data);

    if (response.data.deletedCount > 0) {
      console.log(`🗑️  Deleted ${response.data.deletedCount} old games`);
    } else {
      console.log("✨ No old games found to cleanup");
    }
  } catch (error) {
    console.error("❌ Cleanup failed:", error.response?.data || error.message);

    if (error.response?.status === 403) {
      console.log(
        "🔒 Access denied. Make sure you are logged in as an admin user."
      );
    }
  }
}

// Run the cleanup
runCleanup();
