const { Game } = require('./src/models/Game.js');

async function testDatabaseCleanup() {
  console.log('🧹 Testing Database Cleanup Logic...\n');
  
  try {
    // Check for stale games
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    console.log('📅 Time references:');
    console.log(`  Now: ${now.toISOString()}`);
    console.log(`  2 hours ago: ${twoHoursAgo.toISOString()}`);
    console.log(`  10 days ago: ${tenDaysAgo.toISOString()}`);

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

    console.log(`\n📊 Found ${staleGames.length} stale games that need cleanup`);

    if (staleGames.length > 0) {
      console.log('📋 Sample stale games:');
      staleGames.slice(0, 3).forEach((game, index) => {
        console.log(`  ${index + 1}. Room: ${game.roomId}`);
        console.log(`     Game State Status: ${game.gameState?.status || 'null'}`);
        console.log(`     Top Level Status: ${game.status || 'null'}`);
        console.log(`     Updated: ${game.updatedAt?.toISOString() || 'null'}`);
        console.log(`     Created: ${game.createdAt?.toISOString() || 'null'}`);
        console.log('');
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
      console.log('📋 Sample old completed games:');
      oldCompletedGames.slice(0, 3).forEach((game, index) => {
        console.log(`  ${index + 1}. Room: ${game.roomId}`);
        console.log(`     Game State Status: ${game.gameState?.status || 'null'}`);
        console.log(`     Top Level Status: ${game.status || 'null'}`);
        console.log(`     Updated: ${game.updatedAt?.toISOString() || 'null'}`);
        console.log(`     Created: ${game.createdAt?.toISOString() || 'null'}`);
        console.log('');
      });
    }

    // Find long waiting games (more than 1 hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const longWaitingGames = await Game.find({
      "gameState.status": "waiting",
      updatedAt: { $lt: oneHourAgo },
      status: { $nin: ["completed", "finished"] },
    });

    console.log(`📊 Found ${longWaitingGames.length} long-waiting games (>1 hour)`);

    if (longWaitingGames.length > 0) {
      console.log('📋 Sample long-waiting games:');
      longWaitingGames.slice(0, 3).forEach((game, index) => {
        console.log(`  ${index + 1}. Room: ${game.roomId}`);
        console.log(`     Updated: ${game.updatedAt?.toISOString() || 'null'}`);
        console.log(`     Created: ${game.createdAt?.toISOString() || 'null'}`);
        console.log('');
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
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('📊 Game counts by status:');
    gameCounts.forEach(count => {
      const gameStateStatus = count._id.gameStateStatus || 'null';
      const topLevelStatus = count._id.topLevelStatus || 'null';
      console.log(`  ${gameStateStatus} / ${topLevelStatus}: ${count.count}`);
    });

    // Test active rooms query
    const activeRooms = await Game.find({
      $and: [
        { "gameState.status": { $in: ["waiting", "starting"] } },
        { status: { $nin: ["completed", "finished"] } },
        { "gameState.status": { $nin: ["completed", "finished"] } },
        // Only show rooms that are not full
        { $expr: { $lt: [{ $size: "$players" }, "$settings.maxPlayers"] } },
        // Not older than 24 hours
        { createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        // Not stale (updated within last 2 hours)
        { updatedAt: { $gt: new Date(Date.now() - 2 * 60 * 60 * 1000) } }
      ]
    });

    console.log(`\n🏠 Found ${activeRooms.length} active rooms (properly filtered)`);

    if (activeRooms.length > 0) {
      console.log('📋 Sample active room:');
      const sampleRoom = activeRooms[0];
      console.log({
        roomId: sampleRoom.roomId,
        gameStateStatus: sampleRoom.gameState?.status,
        topLevelStatus: sampleRoom.status,
        playerCount: sampleRoom.players?.length || 0,
        maxPlayers: sampleRoom.settings?.maxPlayers,
        createdAt: sampleRoom.createdAt?.toISOString(),
        updatedAt: sampleRoom.updatedAt?.toISOString()
      });
    }

    console.log('\n✅ Database cleanup test completed!');

  } catch (error) {
    console.log('❌ Database cleanup test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testDatabaseCleanup().catch(console.error);
