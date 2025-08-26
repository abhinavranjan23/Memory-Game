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

class GameEngine {
  constructor(roomId, io) {
    this.roomId = roomId;
    this.io = io;
    this.game = null;
    this.gameTimer = null;
    this.flipTimer = null;
    this.currentFlippedCards = [];
    this.isProcessingFlip = false;
    this.isStarting = false;
    this.suddenDeathMode = false;
    this.isSaving = false; // Add save lock
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
        await this.game.save();
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
        console.log(
          `Set currentTurn to: ${this.game.gameState.currentTurn} for player: ${this.game.players[0].username}`
        );
      } else {
        console.error("No players found when setting currentTurn");
        this.game.gameState.currentTurn = null;
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

    // Check if it's the player's turn
    const currentPlayer = this.game.players.find((p) => p.isCurrentTurn);
    console.log(`Turn validation for user ${userId}:`, {
      currentPlayer: currentPlayer
        ? { userId: currentPlayer.userId, username: currentPlayer.username }
        : null,
      allPlayers: this.game.players.map((p) => ({
        userId: p.userId,
        username: p.username,
        isCurrentTurn: p.isCurrentTurn,
      })),
      gameStatus: this.game.gameState.status,
      gameStateCurrentTurn: this.game.gameState.currentTurn,
    });

    if (!currentPlayer || currentPlayer.userId !== userId) {
      console.log(`Turn validation failed for user ${userId}:`, {
        currentPlayerFound: !!currentPlayer,
        currentPlayerUserId: currentPlayer?.userId,
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
    const [card1, card2] = this.currentFlippedCards;
    const currentPlayer = this.game.players.find((p) => p.isCurrentTurn);

    if (!card1 || !card2 || !currentPlayer) {
      console.error("Invalid card match data:", {
        card1,
        card2,
        currentPlayer,
      });
      return;
    }

    let isMatch = false;
    let powerUpActivated = null;

    try {
      // Check if cards match
      console.log("Checking card match:", {
        card1: { id: card1.id, value: card1.value, theme: card1.theme },
        card2: { id: card2.id, value: card2.value, theme: card2.theme },
        isMatch: cardsMatch(card1, card2),
      });

      if (cardsMatch(card1, card2)) {
        isMatch = true;

        // Mark cards as matched
        card1.isMatched = true;
        card2.isMatched = true;

        // Add to matched pairs
        this.game.gameState.matchedPairs.push(card1.id, card2.id);

        // Update player stats
        currentPlayer.matches += 1;
        currentPlayer.matchStreak += 1;

        // Calculate score
        const score = calculateScore(
          this.game.settings.gameMode,
          currentPlayer.matchStreak,
          currentPlayer.lastFlipTime
        );
        currentPlayer.score += score;

        // Check for power-ups - give both power-ups if both cards have them
        const powerUpsCollected = [];

        console.log(`Power-up check for match in room ${this.roomId}:`, {
          card1: { id: card1.id, value: card1.value, powerUp: card1.powerUp },
          card2: { id: card2.id, value: card2.value, powerUp: card2.powerUp },
          player: currentPlayer.username,
          currentPowerUps: currentPlayer.powerUps.length,
        });

        if (card1.powerUp) {
          currentPlayer.powerUps.push(card1.powerUp);
          powerUpsCollected.push(card1.powerUp);
          console.log(`Added power-up from card1: ${card1.powerUp.name}`);
        }
        if (card2.powerUp) {
          currentPlayer.powerUps.push(card2.powerUp);
          powerUpsCollected.push(card2.powerUp);
          console.log(`Added power-up from card2: ${card2.powerUp.name}`);
        }

        console.log(`Total power-ups collected: ${powerUpsCollected.length}`);
        console.log(
          `Player ${currentPlayer.username} now has ${currentPlayer.powerUps.length} power-ups`
        );

        // Set the first power-up as the activated one for the initial notification
        if (powerUpsCollected.length > 0) {
          powerUpActivated = powerUpsCollected[0];
        }

        // Power-up frenzy mode: chance to get additional power-ups
        if (
          this.game.settings.gameMode === "powerup-frenzy" &&
          Math.random() < 0.3
        ) {
          const randomPowerUp = getRandomPowerUp();
          if (randomPowerUp) {
            currentPlayer.powerUps.push(randomPowerUp);
            powerUpActivated = randomPowerUp;
            console.log(
              `Power-up frenzy: Added random power-up ${randomPowerUp.name}`
            );
          }
        }

        // In power-up frenzy mode, give random power-ups but don't show awareness notifications
        // Users will learn about power-ups through the manual button

        // Update memory meter
        currentPlayer.memoryMeter = calculateMemoryMeter(
          currentPlayer.matches,
          currentPlayer.flips,
          currentPlayer.matchStreak
        );

        console.log(
          `Match found by ${currentPlayer.username} in room ${this.roomId}`
        );

        // Emit match result
        const matchEvent = {
          cards: [card1.id, card2.id],
          playerId: currentPlayer.userId,
          playerScore: currentPlayer.score,
          playerMatches: currentPlayer.matches,
        };
        console.log("Emitting cards-matched event:", matchEvent);
        this.io.to(this.roomId).emit("cards-matched", matchEvent);

        // Emit power-up update if power-up was activated
        if (powerUpActivated) {
          console.log(
            `Emitting power-up-update for player ${currentPlayer.username}:`,
            {
              playerId: currentPlayer.userId,
              powerUpsCount: currentPlayer.powerUps.length,
              newPowerUp: powerUpActivated.name,
            }
          );
          this.io.to(this.roomId).emit("power-up-update", {
            playerId: currentPlayer.userId,
            powerUps: currentPlayer.powerUps,
            newPowerUp: powerUpActivated,
          });

          // Notify other players about power-up collection
          this.io.to(this.roomId).emit("power-up-collected", {
            playerId: currentPlayer.userId,
            playerName: currentPlayer.username,
            powerUpName: powerUpActivated.name,
            powerUpIcon: powerUpActivated.icon,
            totalPowerUps: currentPlayer.powerUps.length,
          });
        }

        // If both cards had power-ups, emit additional updates to show all power-ups
        if (powerUpsCollected.length > 1) {
          powerUpsCollected.slice(1).forEach((powerUp, index) => {
            setTimeout(() => {
              this.io.to(this.roomId).emit("power-up-update", {
                playerId: currentPlayer.userId,
                powerUps: currentPlayer.powerUps,
                newPowerUp: powerUp,
              });
            }, (index + 1) * 500); // Stagger the notifications
          });
        }

        // Check if game is complete
        const totalPairs = this.game.gameState.board.length / 2;
        if (this.game.gameState.matchedPairs.length / 2 >= totalPairs) {
          await this.endGame("completed");
          return;
        }

        // Player gets another turn for successful match
        // Set extra turns to 1 (not increment - this ensures only 1 extra turn per match)
        const previousExtraTurns = currentPlayer.extraTurns || 0;
        currentPlayer.extraTurns = 1;
        console.log(
          `DEBUG: Match found by ${currentPlayer.username}. Extra turns: ${previousExtraTurns} -> ${currentPlayer.extraTurns} (set to 1, not increment)`
        );

        // Keep the same player's turn active
        this.game.gameState.currentTurn = currentPlayer.userId;
        this.io.to(this.roomId).emit("turn-continue", {
          currentPlayer: currentPlayer.userId,
          reason: "match_found",
          remainingExtraTurns: currentPlayer.extraTurns,
        });
      } else {
        // No match - flip cards back
        card1.isFlipped = false;
        card2.isFlipped = false;

        // Reset match streak
        currentPlayer.matchStreak = 0;

        // Sudden death mode: eliminate player on wrong match
        if (
          this.game.settings.gameMode === "sudden-death" ||
          this.game.gameState.status === "sudden-death"
        ) {
          this.game.removePlayer(currentPlayer.userId);
          this.io.to(this.roomId).emit("player-eliminated", {
            playerId: currentPlayer.userId,
            username: currentPlayer.username,
            reason: "wrong_match",
          });

          // Check if only one player remains
          if (this.game.players.length === 1) {
            await this.endGame("sudden_death_winner");
            return;
          }

          // Switch to next player
          this.switchToNextPlayer();
        } else {
          // Emit cards flipped back
          this.io.to(this.roomId).emit("cards-flipped-back", {
            cards: [card1.id, card2.id],
          });

          // Check if player has extra turns before switching
          console.log(
            `DEBUG: Wrong match by ${currentPlayer.username}. Current extraTurns: ${currentPlayer.extraTurns}`
          );

          if (currentPlayer.extraTurns && currentPlayer.extraTurns > 0) {
            // Player has extra turns, consume one and keep their turn
            const previousExtraTurns = currentPlayer.extraTurns;
            currentPlayer.extraTurns -= 1;
            console.log(
              `${currentPlayer.username} used an extra turn after wrong match. Previous: ${previousExtraTurns}, Remaining: ${currentPlayer.extraTurns}`
            );

            // If this was the last extra turn, switch to next player immediately
            if (currentPlayer.extraTurns === 0) {
              console.log(
                `${currentPlayer.username} used their last extra turn after wrong match (${previousExtraTurns} -> 0), switching to next player immediately`
              );
              this.switchToNextPlayer();
            } else {
              // Keep the same player's turn active
              this.game.gameState.currentTurn = currentPlayer.userId;
              console.log(
                `DEBUG: Emitting turn-continue after wrong match for ${currentPlayer.username} with ${currentPlayer.extraTurns} extra turns remaining`
              );
              this.io.to(this.roomId).emit("turn-continue", {
                currentPlayer: currentPlayer.userId,
                reason: "extra_turn_used",
                remainingExtraTurns: currentPlayer.extraTurns,
              });
            }
          } else {
            // No extra turns available, switch to next player
            console.log(
              `${currentPlayer.username} has no extra turns, switching to next player after wrong match`
            );
            this.switchToNextPlayer();
          }
        }
      }

      // Clear flipped cards
      this.currentFlippedCards = [];

      await this.protectedSave();
    } catch (error) {
      console.error("Error processing card match:", error);

      // Reset flipped cards on error
      if (card1) card1.isFlipped = false;
      if (card2) card2.isFlipped = false;
      this.currentFlippedCards = [];

      this.io.to(this.roomId).emit("error", {
        message: "Error processing card match",
      });
    }
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

    // Update current turn
    this.game.players[currentIndex].isCurrentTurn = false;
    this.game.players[nextIndex].isCurrentTurn = true;
    this.game.gameState.currentPlayerIndex = nextIndex;
    this.game.gameState.currentTurn = this.game.players[nextIndex].userId;

    console.log(`Turn switched to: ${this.game.gameState.currentTurn}`);

    // Emit turn change
    this.io.to(this.roomId).emit("turn-changed", {
      playerId: this.game.players[nextIndex].userId,
      previousPlayerId: this.game.players[currentIndex].userId,
      gameState: this.game.gameState,
    });
  }

  async usePowerUp(userId, powerUpType, target) {
    if (!this.game) {
      await this.initialize();
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
          // Player gets an extra turn after their current turn ends
          player.extraTurns = (player.extraTurns || 0) + 1;
          this.io.to(this.roomId).emit("powerup-extra-turn", {
            playerId: userId,
            extraTurns: player.extraTurns,
          });
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

        // Emit turn-continue to ensure the client maintains the turn
        this.io.to(this.roomId).emit("turn-continue", {
          currentPlayer: player.userId,
          reason: "powerup_used",
          remainingExtraTurns: player.extraTurns,
        });
      }

      // Add a small delay before emitting game-state to allow power-up animations to complete
      setTimeout(() => {
        // Ensure currentTurn is properly set before emitting game-state
        if (!this.game.gameState.currentTurn) {
          console.log(
            "WARNING: currentTurn is undefined, attempting to fix..."
          );
          // Find the current player and set the turn
          const currentPlayer = this.game.players.find((p) => p.isCurrentTurn);
          if (currentPlayer) {
            this.game.gameState.currentTurn = currentPlayer.userId;
            console.log(
              `Fixed currentTurn to: ${this.game.gameState.currentTurn}`
            );
          } else {
            console.log(
              "ERROR: No current player found, cannot fix currentTurn"
            );
            // As a last resort, try to find any player and set their turn
            if (this.game.players.length > 0) {
              this.game.gameState.currentTurn = this.game.players[0].userId;
              this.game.players[0].isCurrentTurn = true;
              console.log(
                `Emergency fallback: Set currentTurn to first player: ${this.game.gameState.currentTurn}`
              );
            }
          }
        }

        console.log(
          `Emitting game-state after power-up. Current turn: ${this.game.gameState.currentTurn}`
        );

        // Double-check that we have a valid currentTurn before emitting
        if (this.game.gameState.currentTurn) {
          // Emit updated game state to ensure all clients are synchronized
          this.io.to(this.roomId).emit("game-state", {
            gameState: this.game.gameState,
            players: this.game.players,
          });
        } else {
          console.log(
            "ERROR: Still no valid currentTurn, skipping game-state emission"
          );
        }
      }, 600); // 600ms delay to allow 500ms animation + buffer

      // Notify all players about power-up usage
      this.io.to(this.roomId).emit("power-up-used", {
        playerId: userId,
        powerUpType: powerUpType,
        remainingPowerUps: player.powerUps,
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
      } else if (reason === "all_players_left") {
        // When all players left, no winners
        console.log("All players left - no winners");
        winners = [];
      } else if (
        reason === "timeout" &&
        this.game.settings.gameMode === "blitz"
      ) {
        // For Blitz mode timeout, check if anyone has matches
        const playersWithMatches = sortedPlayers.filter((p) => p.matches > 0);
        if (playersWithMatches.length === 0) {
          // No one has matches - no winners
          winners = [];
        } else {
          // Find players with the most matches
          const maxMatches = playersWithMatches[0].matches;
          winners = playersWithMatches.filter((p) => p.matches === maxMatches);
        }
      } else if (
        reason === "timeout" &&
        this.game.settings.gameMode === "sudden-death"
      ) {
        // For Sudden Death timeout, no winners
        winners = [];
      } else if (reason === "sudden_death_timeout") {
        // For Sudden Death timeout (from blitz mode), no winners
        winners = [];
      } else if (reason === "sudden_death_winner") {
        // For Sudden Death elimination, the remaining player is the winner
        winners = this.game.players;
      } else {
        // For other cases, use score-based winner determination
        winners = sortedPlayers.filter(
          (p) => p.score === sortedPlayers[0].score && p.score > 0
        );
      }

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

      // Emit game end
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

      console.log(`Game ended in room ${this.roomId}. Reason: ${reason}`);
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
      if (!this.game) return;

      // Refresh game state from database to ensure we have latest data
      await this.initialize();

      const player = this.game.players.find((p) => p.userId === userId);
      if (!player) return;

      console.log(
        `Player ${player.username} disconnected from room ${this.roomId}`
      );
      console.log(`Remaining players: ${this.game.players.length - 1}`);

      // If game is in progress and player was current turn, skip to next player
      if (this.game.gameState.status === "playing" && player.isCurrentTurn) {
        console.log(
          "Disconnected player was current turn, switching to next player"
        );
        this.switchToNextPlayer();
        await this.protectedSave();
      }

      // Determine if game should continue or end based on remaining players
      const remainingPlayers = this.game.players.length - 1; // -1 for the disconnected player
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
        await this.endGame("last_player_winner");
      } else if (remainingPlayers >= 2) {
        // 2 or more players remaining - continue the game
        console.log("2+ players remaining, continuing the game");
        // Game continues, no action needed
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
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }

    if (this.flipTimer) {
      clearTimeout(this.flipTimer);
      this.flipTimer = null;
    }
  }
}

module.exports = { GameEngine };
