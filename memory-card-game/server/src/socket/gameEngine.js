const { Game } = require("../models/Game.js");
const { User } = require("../models/User.js");
const {
  generateBoard,
  cardsMatch,
  calculateScore,
  getTimeLimit,
  shouldTriggerSuddenDeath,
  generateSuddenDeathCards,
  calculateMemoryMeter,
  shuffleArray,
  getRandomPowerUp,
} = require("../utils/gameLogic.js");
const { updateMetrics } = require("../utils/metrics.js");
const antiCheatSystem = require("../utils/antiCheat.js");

class GameEngine {
  constructor(roomId, io) {
    this.roomId = roomId;
    this.io = io;
    this.game = null;
    this.currentFlippedCards = [];
    this.flipTimer = null;
    this.gameTimer = null;
    this.isProcessingFlip = false;
    this.isStarting = false;
    this.isSaving = false;
    this.suddenDeathMode = false;
    this.currentPlayerId = null;
    this.gameCompleted = false; // Flag to track if game has been completed
  }

  async initialize() {
    try {
      this.game = await Game.findOne({ roomId: this.roomId });
      if (!this.game) {
        throw new Error("Game not found");
      }
    } catch (error) {
      console.error(
        `Error initializing game engine for room ${this.roomId}:`,
        error
      );
      if (error.name === "DocumentNotFoundError") {
        console.log(
          `Game document not found for room ${this.roomId}, cleaning up game engine`
        );
        this.cleanup();
      }
      throw error;
    }
  }

  // Protected save method to prevent duplicate saves
  async protectedSave() {
    if (this.isSaving) {
      console.log(
        `Save already in progress for room ${this.roomId}, skipping...`
      );
      return;
    }
    this.isSaving = true;
    try {
      if (this.game) {
        // Always update the updatedAt field when saving
        this.game.updatedAt = new Date();

        // Ensure game state is properly structured
        if (!this.game.gameState) {
          this.game.gameState = {};
        }

        // Update last activity
        this.game.gameState.lastActivity = new Date();

        // Ensure all required fields are present
        if (!this.game.gameState.board) {
          this.game.gameState.board = [];
        }
        if (!this.game.gameState.matchedPairs) {
          this.game.gameState.matchedPairs = [];
        }
        if (!this.game.gameState.flippedCards) {
          this.game.gameState.flippedCards = [];
        }

        console.log(`Saving game state for room ${this.roomId}:`, {
          status: this.game.gameState.status,
          matchedPairs: this.game.gameState.board.filter((c) => c.isMatched)
            .length,
          totalCards: this.game.gameState.board.length,
          players: this.game.players.length,
        });

        await this.game.save();
        console.log(`Game saved successfully for room ${this.roomId}`);
      }
    } catch (error) {
      console.error(`Error saving game for room ${this.roomId}:`, error);
      if (error.name === "DocumentNotFoundError") {
        console.log(
          `Game document not found for room ${this.roomId}, cleaning up game engine`
        );
        this.cleanup();
      }
    } finally {
      this.isSaving = false;
    }
  }

  async startGame() {
    if (this.isStarting) {
      console.log(`Game is already starting in room ${this.roomId}`);
      return; // Don't throw error, just return
    }

    // Check if game is already playing
    if (this.game && this.game.gameState.status === "playing") {
      console.log(`Game is already playing in room ${this.roomId}`);
      return; // Don't throw error, just return
    }

    this.isStarting = true;

    try {
      // Always refresh the game state from database to ensure we have latest player info
      await this.initialize();

      // Check if we have enough players
      console.log(
        `Starting game with ${this.game.players.length} players:`,
        this.game.players.map((p) => ({
          userId: p.userId,
          username: p.username,
          isReady: p.isReady,
        }))
      );

      if (this.game.players.length < 2) {
        throw new Error("Need at least 2 players to start");
      }

      // Check if all players are ready
      const readyPlayers = this.game.players.filter((p) => p.isReady);
      console.log(
        `Ready players: ${readyPlayers.length}/${this.game.players.length}`
      );

      if (readyPlayers.length !== this.game.players.length) {
        throw new Error("All players must be ready to start");
      }

      // Enable power-ups if user has selected them in settings
      // Power-ups are enabled by default in powerup-frenzy mode, but can also be enabled in other modes
      if (this.game.settings.gameMode === "powerup-frenzy") {
        this.game.settings.powerUpsEnabled = true;
      }
      // For other modes, respect the user's power-up setting
      // If powerUpsEnabled is not explicitly set, default to false for classic/sudden-death
      if (this.game.settings.powerUpsEnabled === undefined) {
        this.game.settings.powerUpsEnabled = false;
      }

      // Generate game board
      const board = generateBoard(
        this.game.settings.boardSize,
        this.game.settings.theme,
        this.game.settings.powerUpsEnabled,
        this.game.settings.gameMode
      );

      // Set game start time
      this.game.startedAt = new Date();

      // Initialize game state
      this.game.gameState = {
        status: "playing",
        currentPlayerIndex: 0,
        board: board,
        flippedCards: [],
        matchedPairs: [],
        timeLeft: getTimeLimit(
          this.game.settings.gameMode,
          this.game.settings.timeLimit
        ),
        gameMode: this.game.settings.gameMode,
        round: 1,
        lastActivity: new Date(),
        powerUpPool: [],
      };

      // Update metrics
      updateMetrics.incrementActiveGames();
      updateMetrics.incrementTotalGames();
      updateMetrics.incrementPlayerActions(
        "game_started",
        this.game.settings.gameMode
      );

      // Reset all players' turn status and set first player's turn
      this.game.players.forEach((p, index) => {
        p.isCurrentTurn = index === 0;
        p.score = 0;
        p.matches = 0;
        p.flips = 0;
        p.matchStreak = 0;
        p.memoryMeter = 0;
        p.powerUps = [];
        p.powerUpsUsed = 0;
        p.extraTurns = 0; // Initialize extraTurns to 0
        p.lastFlipTime = null;
      });

      // Ensure we have players before setting currentTurn
      if (this.game.players.length > 0) {
        this.game.gameState.currentTurn = this.game.players[0].userId;
        this.currentPlayerId = this.game.players[0].userId; // Set current player ID
        console.log(
          `Set currentTurn to: ${this.game.gameState.currentTurn} for player: ${this.game.players[0].username}`
        );
      } else {
        console.error("No players found when setting currentTurn");
        this.game.gameState.currentTurn = null;
        this.currentPlayerId = null;
      }

      // Reset any existing flipped cards
      this.currentFlippedCards = [];
      this.isProcessingFlip = false;

      await this.protectedSave();

      // Start game timer only for time-based modes (not classic or sudden-death)
      if (
        this.game.gameState.timeLeft !== null &&
        ["blitz", "powerup-frenzy"].includes(this.game.settings.gameMode)
      ) {
        this.startGameTimer();

        // Send immediate time update to fix initial display issue
        this.io.to(this.roomId).emit("time-update", {
          timeLeft: this.game.gameState.timeLeft,
        });
      }

      // Notify all players
      console.log(
        `Emitting game-started event with currentTurn: ${this.game.gameState.currentTurn}`
      );
      console.log(
        `Players in game-started event:`,
        this.game.players.map((p) => ({
          userId: p.userId,
          username: p.username,
        }))
      );

      this.io.to(this.roomId).emit("game-started", {
        gameState: this.game.gameState,
        players: this.game.players,
      });

      console.log(`Game started in room ${this.roomId}`);
    } catch (error) {
      console.error(`Error starting game in room ${this.roomId}:`, error);
      throw error;
    } finally {
      this.isStarting = false;
    }
  }

  async flipCard(userId, cardId) {
    if (!this.game) {
      await this.initialize();
    }

    if (this.isProcessingFlip) {
      throw new Error("Please wait for the current flip to complete");
    }

    // Anti-cheat validation
    try {
      antiCheatSystem.validateCardFlip(userId, cardId, this.game.gameState);
      antiCheatSystem.trackAction(
        userId,
        { type: "flip_card", cardId },
        this.game.gameState
      );
    } catch (error) {
      console.warn(
        `🚨 Anti-cheat violation for user ${userId}: ${error.message}`
      );
      throw new Error(`Action blocked: ${error.message}`);
    }

    // Check if it's the player's turn
    const currentPlayer = this.game.players.find((p) => p.isCurrentTurn);
    const gameStateCurrentTurn = this.game.gameState.currentTurn;

    console.log(`Turn validation for user ${userId}:`, {
      currentPlayer: currentPlayer
        ? { userId: currentPlayer.userId, username: currentPlayer.username }
        : null,
      gameStateCurrentTurn: gameStateCurrentTurn,
      currentPlayerId: this.currentPlayerId,
      allPlayers: this.game.players.map((p) => ({
        userId: p.userId,
        username: p.username,
        isCurrentTurn: p.isCurrentTurn,
      })),
      gameStatus: this.game.gameState.status,
    });

    // Check if it's the player's turn using multiple validation methods
    const isPlayerTurn =
      (currentPlayer && currentPlayer.userId === userId) ||
      gameStateCurrentTurn === userId ||
      this.currentPlayerId === userId;

    if (!isPlayerTurn) {
      console.log(`Turn validation failed for user ${userId}:`, {
        currentPlayerFound: !!currentPlayer,
        currentPlayerUserId: currentPlayer?.userId,
        gameStateCurrentTurn: gameStateCurrentTurn,
        currentPlayerId: this.currentPlayerId,
        requestingUserId: userId,
      });
      throw new Error("Not your turn");
    }

    // Check if game is in playing state
    if (
      this.game.gameState.status !== "playing" &&
      this.game.gameState.status !== "sudden-death"
    ) {
      throw new Error("Game is not in playing state");
    }

    // Find the card
    const card = this.game.gameState.board.find((c) => c.id === cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    // Check if card can be flipped
    if (card.isFlipped || card.isMatched) {
      throw new Error("Card cannot be flipped");
    }

    // Check if already two cards are flipped
    const currentlyFlipped = this.game.gameState.board.filter(
      (c) => c.isFlipped && !c.isMatched
    ).length;
    if (currentlyFlipped >= 2) {
      throw new Error("Two cards are already flipped");
    }

    this.isProcessingFlip = true;

    try {
      // Flip the card
      card.isFlipped = true;
      this.currentFlippedCards.push(card);
      currentPlayer.flips += 1;
      currentPlayer.lastFlipTime = new Date();

      // Update activity
      this.game.gameState.lastActivity = new Date();
      this.game.updatedAt = new Date(); // Update the main updatedAt field

      // Emit card flip to all players
      this.io.to(this.roomId).emit("card-flipped", {
        cardId: card.id,
        value: card.value,
        isFlipped: true,
        playerId: userId,
      });

      // Check if this is the second card
      if (this.currentFlippedCards.length === 2) {
        // Wait a moment for visual effect
        this.flipTimer = setTimeout(async () => {
          await this.processCardMatch();
        }, 1500);
      }

      await this.protectedSave();
    } finally {
      this.isProcessingFlip = false;
    }
  }

  async processCardMatch() {
    try {
      if (this.currentFlippedCards.length !== 2) return;

      const [card1, card2] = this.currentFlippedCards;

      if (!card1 || !card2) {
        console.error("Cards not found for match processing");
        return;
      }

      const currentPlayer = this.game.players.find(
        (p) => p.userId === this.currentPlayerId
      );

      if (!currentPlayer) {
        console.error("Current player not found for match processing");
        return;
      }

      // Check if cards match
      if (card1.value === card2.value) {
        console.log(`Match found: ${card1.value} (${card1.id}, ${card2.id})`);

        // Anti-cheat validation for card match
        try {
          antiCheatSystem.trackAction(
            currentPlayer.userId,
            {
              type: "card_match",
              card1Id: card1.id,
              card2Id: card2.id,
            },
            this.game.gameState
          );
        } catch (error) {
          console.warn(
            `🚨 Anti-cheat violation for user ${currentPlayer.userId}: ${error.message}`
          );
        }

        // Mark cards as matched
        card1.isMatched = true;
        card2.isMatched = true;
        card1.isFlipped = true;
        card2.isFlipped = true;

        // Update current player's stats
        currentPlayer.matches += 1;
        currentPlayer.score += this.calculateScore();

        // Update match streak
        currentPlayer.matchStreak += 1;

        // Update last flip time for streak calculation
        currentPlayer.lastFlipTime = new Date();

        // Check for power-ups on matched cards
        if (card1.powerUp) {
          currentPlayer.powerUps.push(card1.powerUp);
          console.log(
            `Power-up collected: ${card1.powerUp.name} by ${currentPlayer.username}`
          );
        }
        if (card2.powerUp) {
          currentPlayer.powerUps.push(card2.powerUp);
          console.log(
            `Power-up collected: ${card2.powerUp.name} by ${currentPlayer.username}`
          );
        }

        // Emit power-up update immediately if power-ups were collected
        if (card1.powerUp || card2.powerUp) {
          // Emit power-up collection event
          this.io.to(this.roomId).emit("power-up-collected", {
            playerId: currentPlayer.userId,
            playerName: currentPlayer.username,
            powerUpName: card1.powerUp?.name || card2.powerUp?.name,
            powerUpIcon: card1.powerUp?.icon || card2.powerUp?.icon,
            cardId: card1.powerUp ? card1.id : card2.id,
          });

          // Emit power-up update for the current player
          this.io.to(this.roomId).emit("power-up-update", {
            playerId: currentPlayer.userId,
            powerUps: currentPlayer.powerUps,
            newPowerUp: card1.powerUp || card2.powerUp,
          });
        }

        // Emit match event
        this.io.to(this.roomId).emit("cards-matched", {
          cards: [card1.id, card2.id],
          playerId: currentPlayer.userId,
          playerScore: currentPlayer.score,
          playerMatches: currentPlayer.matches,
          matchStreak: currentPlayer.matchStreak,
        });

        // Check if game is complete
        const matchedCards = this.game.gameState.board.filter(
          (c) => c.isMatched
        );
        const matchedPairs = matchedCards.length / 2; // Divide by 2 to get actual pairs
        const totalPairs = this.game.gameState.board.length / 2;

        console.log(
          `Game completion check: ${matchedPairs}/${totalPairs} pairs matched`
        );
        console.log(
          `Game mode: ${this.game.settings.gameMode}, Status: ${this.game.gameState.status}`
        );
        console.log(
          `Matched cards count: ${matchedCards.length}, Matched pairs: ${matchedPairs}`
        );

        // For sudden death mode, any match ends the game
        if (this.game.gameState.status === "sudden-death") {
          console.log("Sudden death match found - game complete!");
          console.log("Winner:", currentPlayer.username);
          await this.endGame("sudden_death_winner");
          return;
        }

        // For regular games, check if all pairs are matched
        if (matchedPairs >= totalPairs) {
          console.log("All pairs matched - game complete!");
          console.log(
            "Matched cards:",
            this.game.gameState.board
              .filter((c) => c.isMatched)
              .map((c) => ({ id: c.id, value: c.value }))
          );
          await this.endGame("game_completed");
          return;
        }

        // Give extra turn for match
        this.giveExtraTurn(currentPlayer.userId, "match_found");

        // Save game state immediately after match
        await this.protectedSave();

        console.log(`After giving extra turn to ${currentPlayer.username}:`, {
          extraTurns: currentPlayer.extraTurns,
          currentTurn: this.game.gameState.currentTurn,
          currentPlayerId: this.currentPlayerId,
        });
      } else {
        console.log(`No match: ${card1.value} vs ${card2.value}`);

        // Log current player's extra turns before switching
        console.log(
          `Before switching turn - ${currentPlayer.username} has ${
            currentPlayer.extraTurns || 0
          } extra turns`
        );

        // Reset match streak for current player
        currentPlayer.matchStreak = 0;
        currentPlayer.lastFlipTime = new Date();

        // Set cards back to not flipped in the game state
        card1.isFlipped = false;
        card2.isFlipped = false;

        // Emit cards flipped back event
        this.io.to(this.roomId).emit("cards-flipped-back", {
          cards: [card1.id, card2.id],
        });

        // Sudden death mode: eliminate player on wrong match
        if (
          this.game.settings.gameMode === "sudden-death" ||
          this.game.gameState.status === "sudden-death"
        ) {
          console.log(
            `Sudden death: Eliminating player ${currentPlayer.username} for wrong match`
          );

          // Emit player eliminated event
          this.io.to(this.roomId).emit("player-eliminated", {
            playerId: currentPlayer.userId,
            username: currentPlayer.username,
            reason: "wrong_match_sudden_death",
          });

          // Remove player from game
          const playerRemoved = this.game.removePlayer(currentPlayer.userId);

          if (playerRemoved) {
            console.log(`Player ${currentPlayer.username} removed from game`);
            console.log(`Remaining players: ${this.game.players.length}`);

            // Save the game state immediately after player removal
            await this.protectedSave();

            // Check if only one player remains (winner)
            if (this.game.players.length === 1) {
              console.log("Only one player remains - game complete!");
              await this.endGame("sudden_death_winner");
              return;
            }

            // Check if no players remain (tie)
            if (this.game.players.length === 0) {
              console.log("No players remain - game complete!");
              await this.endGame("sudden_death_tie");
              return;
            }

            // Update currentPlayerId to the new current turn
            this.currentPlayerId = this.game.gameState.currentTurn;

            // Emit updated game state
            this.io.to(this.roomId).emit("game-state", {
              players: this.game.players,
              gameState: this.game.gameState,
            });

            // Save again after updating game state
            await this.protectedSave();
          }
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

          console.log(
            `After turn handling - current turn: ${this.game.gameState.currentTurn}`
          );
          console.log(
            `After turn handling - current player ID: ${this.currentPlayerId}`
          );
        }
      }

      // Clear flipped cards
      this.currentFlippedCards = [];
      this.flipTimer = null;

      await this.protectedSave();
    } catch (error) {
      console.error("Error processing card match:", error);
    }
  }

  calculateScore() {
    // Basic score calculation - can be enhanced based on game mode
    const baseScore = 10;
    const currentPlayer = this.game.players.find(
      (p) => p.userId === this.currentPlayerId
    );
    const streakBonus = currentPlayer?.matchStreak || 0;
    return baseScore + streakBonus * 5;
  }

  // Helper method to synchronize turn state
  synchronizeTurnState() {
    const currentTurnPlayerId = this.game.gameState.currentTurn;

    // Update isCurrentTurn flags for all players
    this.game.players.forEach((player) => {
      player.isCurrentTurn = player.userId === currentTurnPlayerId;
    });

    // Update currentPlayerId
    this.currentPlayerId = currentTurnPlayerId;

    console.log(`Synchronized turn state:`, {
      currentTurn: currentTurnPlayerId,
      currentPlayerId: this.currentPlayerId,
      isCurrentTurnFlags: this.game.players.map((p) => ({
        username: p.username,
        isCurrentTurn: p.isCurrentTurn,
      })),
    });
  }

  giveExtraTurn(playerId, reason) {
    const player = this.game.players.find((p) => p.userId === playerId);
    if (!player) {
      console.error(`Player ${playerId} not found for extra turn`);
      return;
    }

    // Initialize extraTurns if not set
    if (player.extraTurns === undefined || player.extraTurns === null) {
      player.extraTurns = 0;
    }

    // Handle different reasons for extra turns
    if (reason === "match_found") {
      // When player finds a match, they get exactly 1 extra turn (don't accumulate)
      // player.extraTurns = 1;
      console.log(
        `Match found! ${player.username} gets exactly 1 extra turn (${reason})`
      );
    } else {
      // For other reasons (like power-ups), add 1 extra turn
      player.extraTurns += 1;
      console.log(
        `Extra turn added to ${player.username} (${playerId}) for reason: ${reason}`
      );
    }

    console.log(
      `Player ${player.username} now has ${player.extraTurns} extra turns`
    );

    // Keep the same player's turn active
    this.game.gameState.currentTurn = playerId;
    this.currentPlayerId = playerId; // Update current player ID

    // Emit turn continue event
    this.io.to(this.roomId).emit("turn-continue", {
      currentPlayer: playerId,
      reason: reason,
      remainingExtraTurns: player.extraTurns,
    });

    // Also emit game state to ensure consistency
    this.io.to(this.roomId).emit("game-state", {
      players: this.game.players,
      gameState: this.game.gameState,
    });
  }

  switchToNextPlayer() {
    console.log("=== SWITCH TO NEXT PLAYER CALLED ===");
    console.log(
      "Current extra turns for players:",
      this.game.players.map((p) => ({
        username: p.username,
        extraTurns: p.extraTurns || 0,
        isCurrentTurn: p.isCurrentTurn,
      }))
    );

    const currentIndex = this.game.gameState.currentPlayerIndex;
    const currentPlayer = this.game.players[currentIndex];

    console.log(`Current player index: ${currentIndex}`);
    console.log(`Current player: ${currentPlayer?.username || "Unknown"}`);
    console.log(
      `Current player extra turns: ${currentPlayer?.extraTurns || 0}`
    );

    // Check if current player has extra turns (must be > 0, not >= 0)
    if (currentPlayer && (currentPlayer.extraTurns || 0) > 0) {
      console.log(
        `Player ${currentPlayer.username} has ${currentPlayer.extraTurns} extra turns - keeping turn`
      );

      // Use one extra turn
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

      return; // Don't switch to next player
    }

    // No extra turns (0 or undefined), switch to next player
    console.log(
      `Player ${
        currentPlayer?.username || "Unknown"
      } has no extra turns - switching to next player`
    );
    console.log(`This should trigger turn-changed event to next player`);

    const nextIndex = (currentIndex + 1) % this.game.players.length;

    console.log(`Switching turn from player ${currentIndex} to ${nextIndex}`);
    console.log(
      `Current player: ${
        this.game.players[currentIndex]?.username || "Unknown"
      }`
    );
    console.log(
      `Next player: ${this.game.players[nextIndex]?.username || "Unknown"}`
    );

    // Clear flipped cards when switching turns
    this.currentFlippedCards = [];
    if (this.flipTimer) {
      clearTimeout(this.flipTimer);
      this.flipTimer = null;
    }

    // Update current turn
    this.game.players[currentIndex].isCurrentTurn = false;
    this.game.players[nextIndex].isCurrentTurn = true;
    this.game.gameState.currentPlayerIndex = nextIndex;
    this.game.gameState.currentTurn = this.game.players[nextIndex].userId;
    this.currentPlayerId = this.game.players[nextIndex].userId; // Update current player ID

    console.log(`Turn switched to: ${this.game.gameState.currentTurn}`);
    console.log(`Current player ID set to: ${this.currentPlayerId}`);
    console.log(
      `Updated isCurrentTurn flags:`,
      this.game.players.map((p) => ({
        username: p.username,
        isCurrentTurn: p.isCurrentTurn,
      }))
    );

    // Emit turn change
    console.log(
      `Emitting turn-changed event: ${this.game.players[currentIndex]?.username} -> ${this.game.players[nextIndex]?.username}`
    );
    this.io.to(this.roomId).emit("turn-changed", {
      playerId: this.game.players[nextIndex].userId,
      previousPlayerId: this.game.players[currentIndex].userId,
      gameState: this.game.gameState,
    });

    // Also emit game state to ensure consistency
    this.io.to(this.roomId).emit("game-state", {
      players: this.game.players,
      gameState: this.game.gameState,
    });

    // Synchronize turn state to ensure consistency
    this.synchronizeTurnState();
  }

  async usePowerUp(userId, powerUpType, target) {
    if (!this.game) {
      await this.initialize();
    }

    // Anti-cheat validation for power-up usage
    try {
      antiCheatSystem.validatePowerUpUsage(
        userId,
        powerUpType,
        this.game.gameState
      );
      antiCheatSystem.trackAction(
        userId,
        { type: "use_powerup", powerUpType, target },
        this.game.gameState
      );
    } catch (error) {
      console.warn(
        `🚨 Anti-cheat violation for user ${userId}: ${error.message}`
      );
      throw new Error(`Action blocked: ${error.message}`);
    }

    const player = this.game.players.find((p) => p.userId === userId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Check if player has the power-up
    console.log(`Checking power-up availability for player ${userId}:`, {
      powerUpType,
      playerPowerUps: player.powerUps,
      powerUpsLength: player.powerUps?.length || 0,
      currentExtraTurns: player.extraTurns || 0,
    });

    const powerUpIndex = player.powerUps.findIndex(
      (p) => p.type === powerUpType
    );
    if (powerUpIndex === -1) {
      console.log(`Power-up ${powerUpType} not found for player ${userId}`);
      throw new Error("Power-up not available");
    }

    const powerUp = player.powerUps[powerUpIndex];

    try {
      switch (powerUpType) {
        case "extraTurn":
          // Player gets an extra turn (adds to existing extra turns)
          this.giveExtraTurn(userId, "extra_turn_powerup");
          break;

        case "peek":
          // Reveal all unmatched cards for 3 seconds
          const unmatched = this.game.gameState.board.filter(
            (c) => !c.isMatched
          );
          // Emit to all players but with user-specific data
          this.io.to(this.roomId).emit("powerup-peek", {
            duration: 3000,
            playerId: userId,
            cards: unmatched.map((c) => ({ id: c.id, value: c.value })),
            targetUserId: userId, // Add target user ID for client-side filtering
          });
          break;

        case "swap":
          // Swap positions of two cards
          console.log("Swap power-up called with target:", target);

          if (!target || !target.card1Id || !target.card2Id) {
            // For now, just swap two random unmatched cards
            const unmatchedCards = this.game.gameState.board.filter(
              (c) => !c.isMatched
            );
            if (unmatchedCards.length < 2) {
              throw new Error("Not enough unmatched cards for swap");
            }

            const card1 = unmatchedCards[0];
            const card2 = unmatchedCards[1];

            console.log("Swapping random cards:", {
              card1: { id: card1.id, value: card1.value, theme: card1.theme },
              card2: { id: card2.id, value: card2.value, theme: card2.theme },
            });

            // Swap card values and themes
            [card1.value, card2.value] = [card2.value, card1.value];
            [card1.theme, card2.theme] = [card2.theme, card1.theme];

            console.log("After swap:", {
              card1: { id: card1.id, value: card1.value, theme: card1.theme },
              card2: { id: card2.id, value: card2.value, theme: card2.theme },
            });

            this.io.to(this.roomId).emit("powerup-swap", {
              card1Id: card1.id,
              card2Id: card2.id,
              playerId: userId,
              card1Value: card1.value,
              card2Value: card2.value,
              card1Theme: card1.theme,
              card2Theme: card2.theme,
            });
          } else {
            const card1 = this.game.gameState.board.find(
              (c) => c.id === target.card1Id
            );
            const card2 = this.game.gameState.board.find(
              (c) => c.id === target.card2Id
            );

            console.log("Swapping targeted cards:", {
              target: target,
              card1: card1
                ? { id: card1.id, value: card1.value, theme: card1.theme }
                : null,
              card2: card2
                ? { id: card2.id, value: card2.value, theme: card2.theme }
                : null,
            });

            if (!card1 || !card2 || card1.isMatched || card2.isMatched) {
              throw new Error("Invalid cards for swap");
            }

            // Swap card values and themes
            [card1.value, card2.value] = [card2.value, card1.value];
            [card1.theme, card2.theme] = [card2.theme, card1.theme];

            console.log("After targeted swap:", {
              card1: { id: card1.id, value: card1.value, theme: card1.theme },
              card2: { id: card2.id, value: card2.value, theme: card2.theme },
            });

            this.io.to(this.roomId).emit("powerup-swap", {
              card1Id: card1.id,
              card2Id: card2.id,
              playerId: userId,
              card1Value: card1.value,
              card2Value: card2.value,
              card1Theme: card1.theme,
              card2Theme: card2.theme,
            });
          }
          break;

        case "revealOne":
          // Permanently reveal one card
          if (!target || !target.cardId) {
            // For now, just reveal a random unmatched card
            const unmatchedCards = this.game.gameState.board.filter(
              (c) => !c.isMatched && !c.isFlipped
            );
            if (unmatchedCards.length === 0) {
              throw new Error("No unmatched cards to reveal");
            }

            const revealCard = unmatchedCards[0];
            // Don't mark as flipped - just reveal it temporarily
            console.log("Server sending reveal data (random card):", {
              cardId: revealCard.id,
              value: revealCard.value,
              playerId: userId,
            });
            this.io.to(this.roomId).emit("powerup-reveal", {
              cardId: revealCard.id,
              value: revealCard.value,
              playerId: userId,
              targetUserId: userId, // Add target user ID for client-side filtering
            });
          } else {
            const revealCard = this.game.gameState.board.find(
              (c) => c.id === target.cardId
            );
            if (!revealCard || revealCard.isMatched) {
              throw new Error("Invalid card for reveal");
            }

            // Don't mark as flipped - just reveal it temporarily
            console.log("Server sending reveal data (targeted card):", {
              cardId: revealCard.id,
              value: revealCard.value,
              playerId: userId,
            });
            this.io.to(this.roomId).emit("powerup-reveal", {
              cardId: revealCard.id,
              value: revealCard.value,
              playerId: userId,
              targetUserId: userId, // Add target user ID for client-side filtering
            });
          }
          break;

        case "freeze":
          // Freeze timer for 10 seconds (blitz mode only)
          if (this.game.settings.gameMode === "blitz") {
            this.freezeTimer(10000);
            this.io.to(this.roomId).emit("powerup-freeze", {
              duration: 10000,
              playerId: userId,
              targetUserId: userId, // Add target user ID for client-side filtering
            });
          } else {
            throw new Error("Freeze power-up can only be used in Blitz mode");
          }
          break;

        case "shuffle":
          // Shuffle unmatched cards
          console.log("Shuffle power-up called");

          const unmatchedCards = this.game.gameState.board.filter(
            (c) => !c.isMatched
          );
          console.log(
            "Unmatched cards before shuffle:",
            unmatchedCards.map((c) => ({
              id: c.id,
              value: c.value,
              theme: c.theme,
            }))
          );

          const values = unmatchedCards.map((c) => ({
            value: c.value,
            theme: c.theme,
          }));
          const shuffled = shuffleArray([...values]);
          console.log("Shuffled values:", shuffled);

          unmatchedCards.forEach((card, index) => {
            const oldValue = card.value;
            const oldTheme = card.theme;
            card.value = shuffled[index].value;
            card.theme = shuffled[index].theme;
            console.log(
              `Card ${card.id}: ${oldValue}(${oldTheme}) -> ${card.value}(${card.theme})`
            );
          });

          console.log(
            "Board after shuffle:",
            this.game.gameState.board.map((c) => ({
              id: c.id,
              value: c.value,
              theme: c.theme,
            }))
          );

          // Emit the updated board to all players
          this.io.to(this.roomId).emit("powerup-shuffle", {
            playerId: userId,
            board: this.game.gameState.board,
          });
          break;
      }

      // Remove used power-up
      player.powerUps.splice(powerUpIndex, 1);
      player.powerUpsUsed = (player.powerUpsUsed || 0) + 1;

      await this.protectedSave();

      // Check if player has extra turns before changing turn
      console.log(`Power-up turn management for ${player.username}:`, {
        powerUpType,
        currentExtraTurns: player.extraTurns,
        currentTurn: this.game.gameState.currentTurn,
        isCurrentTurn: player.userId === this.game.gameState.currentTurn,
        playerId: player.userId,
      });

      if (powerUpType === "extraTurn") {
        // For extraTurn power-up, keep the same player's turn active
        this.game.gameState.currentTurn = player.userId;
        this.currentPlayerId = player.userId;
        console.log(
          `${player.username} used extraTurn power-up. Extra turns: ${player.extraTurns}`
        );

        // Emit turn-continue to ensure the client maintains the turn
        this.io.to(this.roomId).emit("turn-continue", {
          currentPlayer: player.userId,
          reason: "extra_turn_powerup_used",
          remainingExtraTurns: player.extraTurns,
        });
      } else {
        // For all other power-ups (peek, swap, shuffle, revealOne, freeze),
        // they should NOT consume extra turns and should NOT change the turn
        console.log(
          `${player.username} used ${powerUpType} power-up. This does not consume extra turns or change turn.`
        );

        // Keep the same player's turn active without consuming extra turns
        this.game.gameState.currentTurn = player.userId;
        this.currentPlayerId = player.userId;
      }

      // Emit game state to ensure consistency
      this.io.to(this.roomId).emit("game-state", {
        players: this.game.players,
        gameState: this.game.gameState,
      });

      // Notify other players about power-up usage with toast
      this.io.to(this.roomId).emit("power-up-used-notification", {
        playerId: userId,
        playerName: player.username,
        powerUpType: powerUpType,
        powerUpName: powerUp.name,
        powerUpIcon: powerUp.icon,
      });

      console.log(
        `${player.username} used power-up ${powerUpType} in room ${this.roomId}`
      );
    } catch (error) {
      console.error("Power-up error:", error);
      throw error;
    }
  }

  startGameTimer() {
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
    }

    this.gameTimer = setInterval(async () => {
      if (this.game.gameState.timeLeft <= 0) {
        // Check if sudden death should trigger (only for blitz mode)
        if (this.game.settings.gameMode === "blitz" && !this.suddenDeathMode) {
          if (
            shouldTriggerSuddenDeath(
              this.game.players,
              this.game.gameState.timeLeft
            )
          ) {
            await this.triggerSuddenDeath();
            return;
          }
        }

        // For sudden death game mode or when in sudden death status, handle timeout appropriately
        if (
          this.game.settings.gameMode === "sudden-death" ||
          this.game.gameState.status === "sudden-death"
        ) {
          if (this.game.gameState.status === "sudden-death") {
            // In Sudden Death status, when time runs out, end the game with no winners
            console.log(
              "Sudden Death time ran out - ending game with no winners"
            );
            await this.endGame("sudden_death_timeout");
            return;
          } else {
            // In Sudden Death game mode, time running out should not end the game
            // The game should only end when players are eliminated
            console.log(
              "Time ran out in Sudden Death mode, but game continues until elimination"
            );
            return;
          }
        }

        // For other modes, end game on timeout
        await this.endGame("timeout");
        return;
      }

      this.game.gameState.timeLeft -= 1;

      // Emit time update every 10 seconds or every second in last 10 seconds
      if (
        this.game.gameState.timeLeft % 10 === 0 ||
        this.game.gameState.timeLeft <= 10
      ) {
        this.io.to(this.roomId).emit("time-update", {
          timeLeft: this.game.gameState.timeLeft,
        });
      }

      await this.protectedSave();
    }, 1000);
  }

  async triggerSuddenDeath() {
    try {
      this.suddenDeathMode = true;

      // Generate sudden death board (single pair)
      const suddenDeathBoard = generateSuddenDeathCards(
        this.game.settings.theme
      );

      // Update game state
      this.game.gameState.board = suddenDeathBoard;
      this.game.gameState.status = "sudden-death";
      this.game.gameState.timeLeft = 30; // 30 seconds for sudden death
      this.game.gameState.matchedPairs = [];

      // Reset all players' current turn status
      this.game.players.forEach((p) => (p.isCurrentTurn = false));

      // Set first player's turn
      this.game.players[0].isCurrentTurn = true;
      this.game.gameState.currentPlayerIndex = 0;
      this.game.gameState.currentTurn = this.game.players[0].userId;

      console.log(`Sudden death turn setup:`, {
        firstPlayer: {
          userId: this.game.players[0].userId,
          username: this.game.players[0].username,
        },
        currentTurn: this.game.gameState.currentTurn,
        allPlayers: this.game.players.map((p) => ({
          userId: p.userId,
          username: p.username,
          isCurrentTurn: p.isCurrentTurn,
        })),
      });

      // Clear any flipped cards
      this.currentFlippedCards = [];

      await this.protectedSave();

      // Notify players about sudden death
      this.io.to(this.roomId).emit("sudden-death-triggered", {
        gameState: this.game.gameState,
        players: this.game.players,
        message: "Sudden Death Mode! Find the last pair to win!",
      });

      // Restart timer for sudden death
      this.startGameTimer();

      console.log(`Sudden death triggered in room ${this.roomId}`);
    } catch (error) {
      console.error("Error triggering sudden death:", error);
      await this.endGame("error");
    }
  }

  freezeTimer(duration) {
    if (this.gameTimer) {
      clearInterval(this.gameTimer);

      setTimeout(() => {
        this.startGameTimer();
      }, duration);
    }
  }

  async endGame(reason) {
    try {
      console.log(
        `endGame called with reason: ${reason} for room ${this.roomId}`
      );

      if (this.gameTimer) {
        clearInterval(this.gameTimer);
        this.gameTimer = null;
      }

      if (this.flipTimer) {
        clearTimeout(this.flipTimer);
        this.flipTimer = null;
      }

      // Check if game still exists
      if (!this.game) {
        console.log(`Game not found for room ${this.roomId} during endGame`);
        this.cleanup();
        return;
      }

      // Store original players before any modifications for opponent tracking
      const originalPlayers = [...this.game.players];

      // Anti-cheat validation for game completion
      try {
        const matchedPairs = this.game.gameState.board.filter(
          (card) => card.isMatched
        );
        // Validate for all players in the game
        for (const player of this.game.players) {
          antiCheatSystem.validateGameCompletion(
            player.userId,
            this.game.gameState,
            matchedPairs
          );
        }
      } catch (error) {
        console.warn(
          `🚨 Anti-cheat violation during game completion: ${error.message}`
        );
        // Don't throw error here as game is ending, just log the violation
      }

      // Update game state
      this.game.gameState.status = "finished";
      this.game.status = "completed";
      this.game.endedAt = new Date();

      // Calculate game duration for metrics
      const gameDuration = this.game.startedAt
        ? (this.game.endedAt - this.game.startedAt) / 1000
        : 0;

      // Update metrics
      updateMetrics.decrementActiveGames();
      updateMetrics.incrementGamesCompleted(
        this.game.settings.gameMode,
        this.game.settings.boardSize
      );
      updateMetrics.recordGameDuration(
        gameDuration,
        this.game.settings.gameMode,
        this.game.settings.boardSize
      );

      // Determine winners based on game mode and reason
      let winners = [];
      const sortedPlayers = [...this.game.players].sort(
        (a, b) => b.score - a.score
      );

      if (reason === "last_player_winner") {
        // When only one player remains, they are the winner
        console.log("Last player remaining - they are the winner");
        winners = this.game.players;

        // Set the game state winner field for match history
        if (this.game.players.length === 1) {
          this.game.gameState.winner = this.game.players[0].userId;
          this.game.gameState.completionReason = "opponents_left";
          console.log(
            `Winner set to: ${this.game.players[0].username} (${this.game.players[0].userId})`
          );
        }
      } else if (reason === "all_players_left") {
        // When all players left, no winners
        console.log("All players left - no winners");
        winners = [];
        this.game.gameState.completionReason = "all_players_left";
      } else if (
        reason === "timeout" &&
        this.game.settings.gameMode === "blitz"
      ) {
        // For Blitz mode timeout, check if anyone has matches
        const playersWithMatches = sortedPlayers.filter((p) => p.matches > 0);
        if (playersWithMatches.length === 0) {
          // No one has matches - no winners
          winners = [];
          this.game.gameState.completionReason = "timeout_no_matches";
        } else {
          // Find players with the most matches
          const maxMatches = playersWithMatches[0].matches;
          winners = playersWithMatches.filter((p) => p.matches === maxMatches);
          this.game.gameState.completionReason = "timeout_with_matches";

          // Set winner if there's exactly one winner
          if (winners.length === 1) {
            this.game.gameState.winner = winners[0].userId;
          }
        }
      } else if (
        reason === "timeout" &&
        this.game.settings.gameMode === "sudden-death"
      ) {
        // For Sudden Death timeout, no winners
        winners = [];
        this.game.gameState.completionReason = "sudden_death_timeout";
      } else if (reason === "sudden_death_timeout") {
        // For Sudden Death timeout (from blitz mode), no winners
        winners = [];
        this.game.gameState.completionReason = "sudden_death_timeout";
      } else if (reason === "sudden_death_winner") {
        // For Sudden Death elimination, the remaining player is the winner
        winners = this.game.players;
        this.game.gameState.completionReason = "sudden_death_winner";
        if (this.game.players.length === 1) {
          this.game.gameState.winner = this.game.players[0].userId;
        }
      } else {
        // For other cases, use score-based winner determination
        winners = sortedPlayers.filter(
          (p) => p.score === sortedPlayers[0].score && p.score > 0
        );

        this.game.gameState.completionReason = "game_completed";

        // Set winner in game state if there's exactly one winner
        if (winners.length === 1) {
          this.game.gameState.winner = winners[0].userId;
        }
      }

      // Store opponents information for match history
      // This ensures we have opponent data even if players left during the game
      if (!this.game.gameState.opponentsForHistory) {
        this.game.gameState.opponentsForHistory = [];
      }

      // Get all original players (including those who left)
      const allPlayers = [...originalPlayers];

      // Add any players from opponentsForHistory that aren't in originalPlayers
      if (this.game.gameState.opponentsForHistory.length > 0) {
        const existingOpponentIds = allPlayers.map((p) => p.userId);
        const additionalOpponents =
          this.game.gameState.opponentsForHistory.filter(
            (opp) => !existingOpponentIds.includes(opp.userId)
          );
        allPlayers.push(...additionalOpponents);
      }

      // Create a clean opponents list without duplicates
      const opponentMap = new Map();

      // Add all players to the map, with the most recent data taking precedence
      allPlayers.forEach((player) => {
        opponentMap.set(player.userId, {
          userId: player.userId,
          username: player.username,
          score: player.score || 0,
          matches: player.matches || 0,
          leftEarly:
            player.leftEarly ||
            reason === "opponents_left" ||
            reason === "last_player_winner" ||
            reason === "abort",
          disconnectedAt: player.disconnectedAt || null,
        });
      });

      // Convert map back to array
      this.game.gameState.opponentsForHistory = Array.from(
        opponentMap.values()
      );

      // Update user statistics and check achievements
      for (const player of this.game.players) {
        try {
          // Skip guest users as they don't have persistent stats
          if (player.userId.startsWith("guest_")) {
            continue;
          }

          const user = await User.findById(player.userId);
          if (user && !user.isGuest) {
            const gameResult = {
              won: winners.some((w) => w.userId === player.userId),
              score: player.score,
              flipTimes: [
                player.lastFlipTime
                  ? (player.lastFlipTime - this.game.createdAt) / player.flips
                  : 0,
              ],
              matchStreak: player.matchStreak,
              isPerfect: player.flips === player.matches * 2,
              powerUpsUsed: player.powerUpsUsed || 0,
              gameMode: this.game.settings.gameMode,
              boardSize: this.game.settings.boardSize,
            };

            user.updateStats(gameResult);

            // Check for achievements
            const { checkAchievements } = require("../utils/gameLogic.js");
            const newAchievements = checkAchievements(user, gameResult);
            newAchievements.forEach((achievement) => {
              user.addAchievement(achievement);
            });

            await user.save();
          }
        } catch (error) {
          console.error(
            `Error updating stats for player ${player.userId}:`,
            error
          );
        }
      }

      await this.protectedSave();

      // Add additional save verification
      console.log(`Final game state before save:`, {
        roomId: this.roomId,
        status: this.game.gameState.status,
        completionReason: this.game.gameState.completionReason,
        winner: this.game.gameState.winner,
        matchedPairs:
          this.game.gameState.board.filter((c) => c.isMatched).length / 2,
        totalPairs: this.game.gameState.board.length / 2,
        players: this.game.players.length,
        endedAt: this.game.endedAt,
      });

      // Force an additional save to ensure data persistence
      try {
        this.game.updatedAt = new Date();
        await this.game.save();
        console.log(`Final game save completed for room ${this.roomId}`);
      } catch (error) {
        console.error(
          `Error in final game save for room ${this.roomId}:`,
          error
        );
      }

      // Emit game end
      console.log(`About to emit game-over event for room ${this.roomId}`);
      console.log(
        `Winners:`,
        winners.map((w) => w.username)
      );

      this.io.to(this.roomId).emit("game-over", {
        reason,
        winners: winners, // Send all winners (empty array if no winners)
        finalStats: sortedPlayers.map((p) => ({
          userId: p.userId,
          username: p.username,
          score: p.score,
          matches: p.matches,
          flips: p.flips,
          accuracy:
            p.flips > 0 ? Math.round(((p.matches * 2) / p.flips) * 100) : 0,
          memoryMeter: p.memoryMeter,
          isWinner: winners.some((w) => w.userId === p.userId),
        })),
        gameState: this.game.gameState,
      });

      console.log(
        `Game-over event emitted for room ${this.roomId}. Reason: ${reason}`
      );

      // Mark game as completed to prevent premature cleanup
      this.gameCompleted = true;
    } catch (error) {
      console.error(`Error ending game for room ${this.roomId}:`, error);
      if (error.name === "DocumentNotFoundError") {
        console.log(
          `Game document not found for room ${this.roomId} during endGame, cleaning up`
        );
        this.cleanup();
      }
    }
  }

  async handlePlayerDisconnect(userId) {
    try {
      if (!this.game) {
        console.log(`❌ No game found for room ${this.roomId}`);
        return;
      }

      // Refresh game state from database to ensure we have latest data
      await this.initialize();

      const player = this.game.players.find((p) => p.userId === userId);
      if (!player) {
        console.log(
          `Player ${userId} not found in game engine - may have already been removed`
        );
        return;
      }

      console.log(
        `Player ${player.username} disconnected from room ${this.roomId}`
      );
      console.log(
        `Current players in game engine: ${this.game.players.length}`
      );

      // Store opponent information before removing player
      const disconnectedPlayer = {
        userId: player.userId,
        username: player.username,
        score: player.score || 0,
        matches: player.matches || 0,
        leftEarly: true,
        disconnectedAt: new Date(),
      };

      // Initialize opponentsForHistory if it doesn't exist
      if (!this.game.gameState.opponentsForHistory) {
        this.game.gameState.opponentsForHistory = [];
      }

      // Check if this player is already in opponents history
      const existingOpponent = this.game.gameState.opponentsForHistory.find(
        (opp) => opp.userId === userId
      );

      if (!existingOpponent) {
        // Add the disconnected player to opponents history
        this.game.gameState.opponentsForHistory.push(disconnectedPlayer);
      } else {
        // Update existing opponent with latest information
        existingOpponent.leftEarly = true;
        existingOpponent.disconnectedAt = new Date();
        existingOpponent.score = player.score || 0;
        existingOpponent.matches = player.matches || 0;
      }

      // Remove the player from the game engine's player list
      const playerIndex = this.game.players.findIndex(
        (p) => p.userId === userId
      );
      if (playerIndex !== -1) {
        this.game.players.splice(playerIndex, 1);
        console.log(
          `Removed player ${player.username} from game engine. Remaining: ${this.game.players.length}`
        );
      }

      // If game is in progress and player was current turn, skip to next player
      if (this.game.gameState.status === "playing" && player.isCurrentTurn) {
        console.log(
          "Disconnected player was current turn, switching to next player"
        );
        this.switchToNextPlayer();
        await this.protectedSave();
      }

      // Determine if game should continue or end based on remaining players
      const remainingPlayers = this.game.players.length;
      const maxPlayers = this.game.settings.maxPlayers;

      console.log(
        `Game logic: ${remainingPlayers} remaining players, max: ${maxPlayers}`
      );

      if (remainingPlayers === 0) {
        // No players left - end game with no winners
        console.log("No players remaining, ending game with no winners");
        await this.endGame("all_players_left");
      } else if (remainingPlayers === 1) {
        // Only one player left - they are the winner
        console.log("Only one player remaining, making them the winner");
        console.log(
          `Remaining player: ${this.game.players[0].username} (${this.game.players[0].userId})`
        );

        // Opponent info already stored above, no need to duplicate

        console.log("About to call endGame with reason: last_player_winner");
        await this.endGame("last_player_winner");
        console.log("endGame call completed");
      } else if (remainingPlayers >= 2) {
        // 2 or more players remaining - continue the game
        console.log("2+ players remaining, continuing the game");

        // Opponent info already stored above, no need to duplicate

        // Game continues, save the updated state
        await this.protectedSave();
      }
    } catch (error) {
      console.error(
        `Error handling player disconnect for user ${userId}:`,
        error
      );
      // If game document not found, clean up the game engine
      if (error.name === "DocumentNotFoundError") {
        console.log(
          `Game document not found for room ${this.roomId}, cleaning up game engine`
        );
        this.cleanup();
      }
    }
  }

  cleanup() {
    // If game was completed, ensure it's saved before cleanup
    if (this.gameCompleted && this.game) {
      console.log(
        `Game ${this.roomId} was completed - ensuring final save before cleanup`
      );
      // The game should already be saved by endGame, but we can add additional verification here
    }

    // Clear all timers to prevent memory leaks
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }

    if (this.flipTimer) {
      clearTimeout(this.flipTimer);
      this.flipTimer = null;
    }

    // Clear any other potential timers
    if (this.suddenDeathTimer) {
      clearTimeout(this.suddenDeathTimer);
      this.suddenDeathTimer = null;
    }

    if (this.powerUpTimer) {
      clearTimeout(this.powerUpTimer);
      this.powerUpTimer = null;
    }

    // Clear any other intervals
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Reset game state references
    this.game = null;
    this.currentFlippedCards = [];
    this.isProcessingFlip = false;
    this.suddenDeathMode = false;
    this.gameCompleted = false; // Reset completion flag

    console.log("🧹 Cleaned up game engine for room " + this.roomId);
  }
}

module.exports = { GameEngine };
