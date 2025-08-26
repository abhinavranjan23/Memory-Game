# Extra Turn Bug Fix

## Problem Description

There was a bug where players would get multiple extra turns when finding a match. The issue manifested as:

1. Player finds a match and gets an extra turn (correct behavior)
2. Player uses that extra turn and gets another toast saying "extra turn used, you have 0 extra turns"
3. The same player still has the turn and when they use it, it says "extra turn used, switching the turn"
4. This created a confusing experience with multiple extra turn notifications

## Root Cause

The bug was caused by a **duplicate event handling loop** in the socket server:

1. When a player finds a match, the server calls `giveExtraTurn()` which emits a `turn-continue` event
2. The client receives the `turn-continue` event and processes it correctly
3. **BUG**: The client was also sending a `turn-continue` event back to the server
4. The server had a client-side event handler for `turn-continue` that would emit another `turn-continue` event
5. This created an infinite loop where the player would get multiple extra turns

## The Fix

The fix involved three parts:

### Part 1: Remove Duplicate Event Handler

**File**: `memory-card-game/server/src/socket/index.js`

**Problem Code** (lines 895-915):

```javascript
// Turn continue event (when player gets another turn after a match)
socket.on("turn-continue", async (data) => {
  if (!socket.currentRoom) {
    socket.emit("error", { message: "Not in a room" });
    return;
  }

  try {
    const game = await Game.findOne({ roomId: socket.currentRoom });
    if (!game) {
      socket.emit("error", { message: "Game not found" });
      return;
    }

    // Emit turn continue to all players in the room
    io.to(socket.currentRoom).emit("turn-continue", {
      currentPlayer: socket.userId,
      reason: "match_found",
    });
  } catch (error) {
    console.error("Turn continue error:", error);
    socket.emit("error", { message: "Failed to continue turn" });
  }
});
```

**Fixed Code**:

```javascript
// Turn continue event handling removed - this was causing duplicate extra turns
// The server should only emit turn-continue events, not listen to them from clients
```

### Part 2: Fix Turn Switching Logic

**File**: `memory-card-game/server/src/socket/gameEngine.js`

**Problem**: When a player had extra turns and made a wrong match, the code would call `switchToNextPlayer()` regardless of whether they had extra turns or not.

**Fixed Code** (in `processCardMatch()` no-match scenario):

```javascript
} else {
  // Regular mode: only switch to next player if no extra turns
  console.log(
    `Checking extra turns for ${
      currentPlayer.username
    } before switching: ${currentPlayer.extraTurns || 0} extra turns`
  );

  if ((currentPlayer.extraTurns || 0) > 0) {
    // Player has extra turns, use one and keep the same player's turn
    console.log(
      `Player ${currentPlayer.username} has extra turns - using one extra turn and keeping turn`
    );
    currentPlayer.extraTurns -= 1;

    // Keep the same player's turn active
    this.game.gameState.currentTurn = currentPlayer.userId;
    this.currentPlayerId = currentPlayer.userId;

    console.log(
      `Extra turn used. Remaining extra turns: ${currentPlayer.extraTurns}`
    );

    // Emit turn continue event
    this.io.to(this.roomId).emit("turn-continue", {
      currentPlayer: currentPlayer.userId,
      reason: "extra_turn_used",
      remainingExtraTurns: currentPlayer.extraTurns,
    });

    // Also emit game state to ensure consistency
    this.io.to(this.roomId).emit("game-state", {
      players: this.game.players,
      gameState: this.game.gameState,
    });
  } else {
    // Player has no extra turns, switch to next player
    console.log(
      `Player ${currentPlayer.username} has no extra turns - switching to next player`
    );
    this.switchToNextPlayer();
  }
}
```

### Part 3: Fix Client-Side Turn Handling

**File**: `memory-card-game/client/src/pages/Game.jsx`

**Problem**: The client was always setting the current turn in `handleTurnContinue`, even when `remainingExtraTurns` was 0.

**Fixed Code**:

```javascript
// Only keep the same player's turn active if they still have extra turns
// If remainingExtraTurns is 0, don't set the turn - wait for turn-changed event
if (data.remainingExtraTurns > 0) {
  console.log("About to call setCurrentTurn with:", data.currentPlayer);
  setCurrentTurn(data.currentPlayer);
  console.log("setCurrentTurn called in handleTurnContinue");

  // Set timestamp to prevent game-state from overriding this turn
  window.lastTurnContinueTime = Date.now();
  console.log("Set lastTurnContinueTime to:", window.lastTurnContinueTime);
} else {
  console.log(
    "No extra turns remaining - not setting current turn, waiting for turn-changed event"
  );
}
```

## Why This Fix Works

1. **Server-Only Events**: The server should only emit `turn-continue` events, not listen to them from clients
2. **Prevents Event Loop**: Removing the client-side event handler prevents the infinite loop
3. **Correct Turn Switching**: The server now properly checks for extra turns before switching to the next player
4. **Client-Side Coordination**: The client now waits for `turn-changed` events when extra turns are exhausted

## Verification

The fix was tested and verified to work correctly:

- ✅ Player gets exactly 1 extra turn when finding a match (not multiple)
- ✅ Extra turns don't accumulate for `match_found` reason (they reset to 1)
- ✅ Power-up extra turns accumulate correctly (add to existing)
- ✅ Extra turns are consumed properly when used
- ✅ Turn switches correctly when no extra turns remain

## Files Modified

1. `memory-card-game/server/src/socket/index.js` - Removed problematic client-side `turn-continue` event handler
2. `memory-card-game/server/src/socket/gameEngine.js` - Fixed turn switching logic in no-match scenario
3. `memory-card-game/client/src/pages/Game.jsx` - Fixed client-side turn handling for extra turns

## Testing

The fix was verified with a comprehensive test that confirmed:

- Match found gives exactly 1 extra turn
- Multiple matches don't accumulate extra turns
- Power-ups add to existing extra turns
- Extra turns are consumed correctly when making wrong matches
- Turn switches correctly when no extra turns remain
- Client properly waits for turn-changed events when extra turns are exhausted

## Impact

This fix resolves the confusing extra turn behavior and ensures that:

- Players get the correct number of extra turns
- Toast notifications are accurate
- Turn management works as expected
- No more infinite extra turn loops
