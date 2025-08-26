const axios = require('axios');
const { Game } = require('./src/models/Game.js');
const { User } = require('./src/models/User.js');

const API_BASE_URL = 'http://localhost:3001/api';

// Test user credentials
const TEST_USERS = [
  {
    username: 'testuser1',
    email: 'test1@example.com',
    password: 'TestPassword123!'
  },
  {
    username: 'testuser2', 
    email: 'test2@example.com',
    password: 'TestPassword456!'
  }
];

let authTokens = {};

async function checkServer() {
  try {
    await axios.get('http://localhost:3001/health');
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    console.log('❌ Server is not running');
    return false;
  }
}

async function loginUser(userData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      emailOrUsername: userData.email,
      password: userData.password
    });
    console.log(`✅ Logged in user: ${userData.username}`);
    authTokens[userData.username] = response.data.token;
    return response.data.token;
  } catch (error) {
    console.log(`❌ Failed to login user ${userData.username}:`, error.response?.data?.message || error.message);
    return null;
  }
}

async function testMatchHistory(userData) {
  console.log(`\n🔍 Testing match history for ${userData.username}...`);
  
  const token = authTokens[userData.username];
  if (!token) {
    console.log('❌ No token available for testing');
    return;
  }

  try {
    // Test match history endpoint
    const response = await axios.get(`${API_BASE_URL}/game/history/matches?limit=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Match history response received');
    console.log('📊 Match history data:', {
      totalMatches: response.data.pagination?.totalItems || 0,
      returnedMatches: response.data.matches?.length || 0,
      hasMore: response.data.pagination?.hasMore || false
    });

    if (response.data.matches && response.data.matches.length > 0) {
      console.log('📋 Sample match data:');
      const sampleMatch = response.data.matches[0];
      console.log({
        gameId: sampleMatch.gameId,
        roomId: sampleMatch.roomId,
        gameMode: sampleMatch.gameMode,
        result: sampleMatch.result,
        score: sampleMatch.score,
        playedAt: sampleMatch.playedAt,
        duration: sampleMatch.duration,
        playerCount: sampleMatch.playerCount
      });
    } else {
      console.log('ℹ️ No matches found in history');
    }

  } catch (error) {
    console.log('❌ Match history test failed:', error.response?.data?.message || error.message);
  }
}

async function testActiveRooms() {
  console.log('\n🏠 Testing active rooms...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/game/rooms`);
    
    console.log('✅ Active rooms response received');
    console.log('📊 Active rooms data:', {
      totalRooms: response.data.totalCount || 0,
      returnedRooms: response.data.rooms?.length || 0
    });

    if (response.data.rooms && response.data.rooms.length > 0) {
      console.log('📋 Sample room data:');
      const sampleRoom = response.data.rooms[0];
      console.log({
        roomId: sampleRoom.roomId,
        playerCount: sampleRoom.playerCount,
        maxPlayers: sampleRoom.maxPlayers,
        gameMode: sampleRoom.gameMode,
        status: sampleRoom.status,
        isJoinable: sampleRoom.isJoinable,
        createdAt: sampleRoom.createdAt
      });
    } else {
      console.log('ℹ️ No active rooms found');
    }

  } catch (error) {
    console.log('❌ Active rooms test failed:', error.response?.data?.message || error.message);
  }
}

async function testDatabaseCleanup() {
  console.log('\n🧹 Testing database cleanup...');
  
  try {
    // Check for stale games
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    // Find stale games that should be cleaned up
    const staleGames = await Game.find({
      $or: [
        { "gameState.status": "playing", updatedAt: { $lt: twoHoursAgo } },
        { "gameState.status": "waiting", updatedAt: { $lt: twoHoursAgo } },
        { "gameState.status": "starting", updatedAt: { $lt: twoHoursAgo } },
      ],
      $and: [
        { status: { $nin: ["completed", "finished"] } },
        { "gameState.status": { $nin: ["completed", "finished"] } },
      ],
    });

    console.log(`📊 Found ${staleGames.length} stale games that need cleanup`);

    if (staleGames.length > 0) {
      console.log('📋 Sample stale game:');
      const sampleStale = staleGames[0];
      console.log({
        roomId: sampleStale.roomId,
        gameStateStatus: sampleStale.gameState?.status,
        topLevelStatus: sampleStale.status,
        updatedAt: sampleStale.updatedAt,
        createdAt: sampleStale.createdAt
      });
    }

    // Find old completed games that should be deleted
    const oldCompletedGames = await Game.find({
      $or: [
        { status: "completed", updatedAt: { $lt: tenDaysAgo } },
        { status: "finished", updatedAt: { $lt: tenDaysAgo } },
        { "gameState.status": "completed", updatedAt: { $lt: tenDaysAgo } },
        { "gameState.status": "finished", updatedAt: { $lt: tenDaysAgo } },
      ],
    });

    console.log(`📊 Found ${oldCompletedGames.length} old completed games that should be deleted`);

    if (oldCompletedGames.length > 0) {
      console.log('📋 Sample old completed game:');
      const sampleOld = oldCompletedGames[0];
      console.log({
        roomId: sampleOld.roomId,
        gameStateStatus: sampleOld.gameState?.status,
        topLevelStatus: sampleOld.status,
        updatedAt: sampleOld.updatedAt,
        createdAt: sampleOld.createdAt
      });
    }

    // Check total game counts by status
    const gameCounts = await Game.aggregate([
      {
        $group: {
          _id: {
            gameStateStatus: "$gameState.status",
            topLevelStatus: "$status"
          },
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('📊 Game counts by status:');
    gameCounts.forEach(count => {
      console.log(`  ${count._id.gameStateStatus || 'null'} / ${count._id.topLevelStatus || 'null'}: ${count.count}`);
    });

  } catch (error) {
    console.log('❌ Database cleanup test failed:', error.message);
  }
}

async function testUserStats() {
  console.log('\n📈 Testing user stats...');
  
  for (const userData of TEST_USERS) {
    const token = authTokens[userData.username];
    if (!token) continue;

    try {
      const response = await axios.get(`${API_BASE_URL}/game/stats/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log(`✅ User stats for ${userData.username}:`);
      const stats = response.data.statistics;
      console.log({
        gamesPlayed: stats.gamesPlayed,
        gamesWon: stats.gamesWon,
        winRate: stats.winRate,
        totalScore: stats.totalScore,
        averageScore: stats.averageScore,
        bestScore: stats.bestScore
      });

    } catch (error) {
      console.log(`❌ User stats test failed for ${userData.username}:`, error.response?.data?.message || error.message);
    }
  }
}

async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive Match History & Cleanup Test...\n');
  
  // Check if server is running
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('❌ Cannot proceed without server running');
    return;
  }
  
  // Login both users
  console.log('👥 Logging in test users...');
  for (const userData of TEST_USERS) {
    const token = await loginUser(userData);
    if (!token) {
      console.log('❌ Cannot proceed without authentication');
      return;
    }
  }
  
  // Run all tests
  await testMatchHistory(TEST_USERS[0]);
  await testActiveRooms();
  await testDatabaseCleanup();
  await testUserStats();
  
  console.log('\n✅ Comprehensive test completed!');
}

// Run the test
runComprehensiveTest().catch(console.error);
