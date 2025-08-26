const axios = require("axios");

async function testMetrics() {
  const baseUrl = "http://localhost:3001";
  const metricsUrl = "http://localhost:9090";

  try {
    // Test main server health
    const healthResponse = await axios.get(`${baseUrl}/health`);
    // Test metrics endpoint on main server
    const mainMetricsResponse = await axios.get(`${baseUrl}/metrics`);
    // Test dedicated metrics server
    const metricsResponse = await axios.get(`${metricsUrl}/metrics`);
    // Test metrics server health
    const metricsHealthResponse = await axios.get(`${metricsUrl}/health`);
    // Parse and display some key metrics
    const metricsText = metricsResponse.data;
    const lines = metricsText.split("\n");

    const keyMetrics = {
      memory_game_active_games: "Active Games",
      memory_game_total_games_played: "Total Games Played",
      memory_game_active_players: "Active Players",
      memory_game_socket_connections: "Socket Connections",
      memory_game_api_requests_total: "API Requests",
      process_cpu_seconds_total: "CPU Usage",
      process_resident_memory_bytes: "Memory Usage",
    };

    lines.forEach((line) => {
      if (line && !line.startsWith("#")) {
        const [metricName, value] = line.split(" ");
        if (metricName && keyMetrics[metricName]) {
          }
      }
    });

    } catch (error) {
    console.error("\n❌ Metrics test failed:", error.message);

    if (error.code === "ECONNREFUSED") {
      }
  }
}

// Run the test
testMetrics();
