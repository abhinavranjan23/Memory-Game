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
    this.gameCompleted = false;
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
        this.cleanup();
      }
      throw error;
    }
  }

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
        this.game.updatedAt = new Date();

        if (!this.game.gameState) {
          this.game.gameState = {};
        }

        // Update last activity
        this.game.gameState.lastActivity = new Date();

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
          matchedCards: this.game.gameState.board.filter((c) => c.isMatched)
            .length,
          matchedPairsArray: this.game.gameState.matchedPairs.length,
          flippedCardsArray: this.game.gameState.flippedCards.length,
          totalCards: this.game.gameState.board.length,
          players: this.game.players.length,
        });

        await this.game.save();
        console.log(`Game saved successfully for room ${this.roomId}`);

        const savedGame = await Game.findOne({ roomId: this.roomId });
        if (savedGame) {
          console.log(`Database verification for room ${this.roomId}:`, {
            savedFlippedCards: savedGame.gameState.flippedCards,
            savedMatchedPairs: savedGame.gameState.matchedPairs,
            savedMatchedCards: savedGame.gameState.board.filter(
              (c) => c.isMatched
            ).length,
            totalCards: savedGame.gameState.board.length,
          });
        }
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
      return;
    }

    if (this.game && this.game.gameState.status === "playing") {
      console.log(`Game is already playing in room ${this.roomId}`);
      return;
    }

    this.isStarting = true;

    try {
      await this.initialize();

      if (this.game.players.length < 2) {
        throw new Error("Need at least 2 players to start");
      }

      const readyPlayers = this.game.players.filter((p) => p.isReady);

      if (readyPlayers.length !== this.game.players.length) {
        throw new Error("All players must be ready to start");
      }

      if (this.game.settings.gameMode === "powerup-frenzy") {
        this.game.settings.powerUpsEnabled = true;
      }

      if (this.game.settings.powerUpsEnabled === undefined) {
        this.game.settings.powerUpsEnabled = false;
      }

      const board = generateBoard(
        this.game.settings.boardSize,
        this.game.settings.theme,
        this.game.settings.powerUpsEnabled,
        this.game.settings.gameMode
      );

      let powerUpPool = [];
      if (this.game.settings.powerUpsEnabled) {
        const cardsWithPowerUps = board.filter((card) => card.powerUp);
        powerUpPool = cardsWithPowerUps.map((card) => ({
          ...card.powerUp,
          cardId: card.id,
          collected: false,
        }));

        console.log(`Generated ${powerUpPool.length} power-ups for board`);
      }

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
        powerUpPool: powerUpPool,
      };

      this.game.status = "playing";

      // Update metrics
      updateMetrics.incrementActiveGames();
      updateMetrics.incrementTotalGames();
      updateMetrics.incrementPlayerActions(
        "game_started",
        this.game.settings.gameMode
      );

      const randomPlayerIndex = Math.floor(
        Math.random() * (this.game.players.length - 1)
      );

      this.game.players.forEach((p, index) => {
        p.isCurrentTurn = index === randomPlayerIndex;
        p.score = 0;
        p.matches = 0;
        p.flips = 0;
        p.matchStreak = 0;
        p.memoryMeter = 0;
        p.powerUps = [];
        p.powerUpsUsed = 0;
        p.extraTurns = 0;
        p.lastFlipTime = null;
      });

      if (this.game.players.length > 0) {
        this.game.gameState.currentTurn = this.game.players[0].userId;
        this.currentPlayerId = this.game.players[0].userId;
      } else {
        this.game.gameState.currentTurn = null;
        this.currentPlayerId = null;
      }

      this.currentFlippedCards = [];
      this.isProcessingFlip = false;

      await this.protectedSave();

      if (
        this.game.gameState.timeLeft !== null &&
        ["blitz", "powerup-frenzy"].includes(this.game.settings.gameMode)
      ) {
        this.startGameTimer();

        this.io.to(this.roomId).emit("time-update", {
          timeLeft: this.game.gameState.timeLeft,
        });
      }

      this.io.to(this.roomId).emit("game-started", {
        gameState: this.game.gameState,
        players: this.game.players,
      });
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

    if (
      this.game?.gameState?.board &&
      Array.isArray(this.game.gameState.board) &&
      this.game.gameState.board.length > 0 &&
      this.game.players &&
      Array.isArray(this.game.players)
    ) {
      try {
        const completeGameState = {
          board: this.game.gameState.board,
          status: this.game.gameState.status,
          currentPlayerIndex: this.game.gameState.currentPlayerIndex,
          currentTurn: this.game.gameState.currentTurn,
          flippedCards: this.game.gameState.flippedCards,
          matchedPairs: this.game.gameState.matchedPairs,
          timeLeft: this.game.gameState.timeLeft,
          gameMode: this.game.gameState.gameMode,
          round: this.game.gameState.round,
          lastActivity: this.game.gameState.lastActivity,
          powerUpPool: this.game.gameState.powerUpPool,
          players: this.game.players,
        };

        antiCheatSystem.validateCardFlip(userId, cardId, completeGameState);
        antiCheatSystem.trackAction(
          userId,
          { type: "flip_card", cardId },
          completeGameState
        );
      } catch (error) {
        console.warn(
          ` Anti-cheat violation for user ${userId}: ${error.message}`
        );
        throw new Error(`Action blocked: ${error.message}`);
      }
    } else {
    }

    const currentPlayer = this.game.players.find((p) => p.isCurrentTurn);
    const gameStateCurrentTurn = this.game.gameState.currentTurn;

    const isPlayerTurn =
      (currentPlayer && currentPlayer.userId === userId) ||
      gameStateCurrentTurn === userId ||
      this.currentPlayerId === userId;

    if (!isPlayerTurn) {
      throw new Error("Not your turn");
    }

    if (
      this.game.gameState.status !== "playing" &&
      this.game.gameState.status !== "sudden-death"
    ) {
      throw new Error("Game is not in playing state");
    }

    const card = this.game.gameState.board.find((c) => c.id === cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    if (card.isFlipped || card.isMatched) {
      throw new Error("Card cannot be flipped");
    }

    const currentlyFlipped = this.game.gameState.board.filter(
      (c) => c.isFlipped && !c.isMatched
    ).length;
    if (currentlyFlipped >= 2) {
      throw new Error("Two cards are already flipped");
    }

    this.isProcessingFlip = true;

    try {
      card.isFlipped = true;
      this.currentFlippedCards.push(card);
      currentPlayer.flips += 1;
      currentPlayer.lastFlipTime = new Date();

      currentPlayer.memoryMeter = calculateMemoryMeter(
        currentPlayer.matches,
        currentPlayer.flips,
        currentPlayer.matchStreak
      );

      if (!this.game.gameState.flippedCards.includes(card.id)) {
        this.game.gameState.flippedCards.push(card.id);
      }

      this.game.gameState.lastActivity = new Date();
      this.game.updatedAt = new Date();

      this.io.to(this.roomId).emit("card-flipped", {
        cardId: card.id,
        value: card.value,
        isFlipped: true,
        playerId: userId,
      });

      if (this.currentFlippedCards.length === 2) {
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

      if (cardsMatch(card1, card2)) {
        if (
          this.game?.gameState?.board &&
          Array.isArray(this.game.gameState.board) &&
          this.game.gameState.board.length > 0 &&
          this.game.players &&
          Array.isArray(this.game.players)
        ) {
          try {
            const completeGameState = {
              board: this.game.gameState.board,
              status: this.game.gameState.status,
              currentPlayerIndex: this.game.gameState.currentPlayerIndex,
              currentTurn: this.game.gameState.currentTurn,
              flippedCards: this.game.gameState.flippedCards,
              matchedPairs: this.game.gameState.matchedPairs,
              timeLeft: this.game.gameState.timeLeft,
              gameMode: this.game.gameState.gameMode,
              round: this.game.gameState.round,
              lastActivity: this.game.gameState.lastActivity,
              powerUpPool: this.game.gameState.powerUpPool,
              players: this.game.players,
            };

            antiCheatSystem.trackAction(
              currentPlayer.userId,
              {
                type: "card_match",
                card1Id: card1.id,
                card2Id: card2.id,
              },
              completeGameState
            );
          } catch (error) {
            console.warn(
              `🚨 Anti-cheat violation for user ${currentPlayer.userId}: ${error.message}`
            );
          }
        }

        card1.isMatched = true;
        card2.isMatched = true;
        card1.isFlipped = true;
        card2.isFlipped = true;

        if (!this.game.gameState.matchedPairs.includes(card1.id)) {
          this.game.gameState.matchedPairs.push(card1.id);
        }
        if (!this.game.gameState.matchedPairs.includes(card2.id)) {
          this.game.gameState.matchedPairs.push(card2.id);
        }

        this.game.gameState.flippedCards =
          this.game.gameState.flippedCards.filter(
            (id) => id !== card1.id && id !== card2.id
          );

        currentPlayer.matches += 1;
        currentPlayer.score += calculateScore(
          this.game.settings.gameMode,
          currentPlayer.matchStreak,
          currentPlayer.lastFlipTime
        );

        currentPlayer.matchStreak += 1;

        currentPlayer.lastFlipTime = new Date();

        currentPlayer.memoryMeter = calculateMemoryMeter(
          currentPlayer.matches,
          currentPlayer.flips,
          currentPlayer.matchStreak
        );

        if (card1.powerUp) {
          currentPlayer.powerUps.push(card1.powerUp);
        }
        if (card2.powerUp) {
          currentPlayer.powerUps.push(card2.powerUp);
        }

        if (card1.powerUp || card2.powerUp) {
          this.io.to(this.roomId).emit("power-up-collected", {
            playerId: currentPlayer.userId,
            playerName: currentPlayer.username,
            powerUpName: card1.powerUp?.name || card2.powerUp?.name,
            powerUpIcon: card1.powerUp?.icon || card2.powerUp?.icon,
            cardId: card1.powerUp ? card1.id : card2.id,
          });

          this.io.to(this.roomId).emit("power-up-update", {
            playerId: currentPlayer.userId,
            powerUps: currentPlayer.powerUps,
            newPowerUp: card1.powerUp || card2.powerUp,
          });
        }

        this.io.to(this.roomId).emit("cards-matched", {
          cards: [card1.id, card2.id],
          playerId: currentPlayer.userId,
          playerScore: currentPlayer.score,
          playerMatches: currentPlayer.matches,
          matchStreak: currentPlayer.matchStreak,
        });

        const matchedCards = this.game.gameState.board.filter(
          (c) => c.isMatched
        );
        const matchedPairs = matchedCards.length / 2;
        const totalPairs = this.game.gameState.board.length / 2;

        if (this.game.gameState.status === "sudden-death") {
          await this.endGame("sudden_death_winner");
          return;
        }

        if (matchedPairs >= totalPairs) {
          await this.endGame("game_completed");
          return;
        }

        this.giveExtraTurn(currentPlayer.userId, "match_found");

        await this.protectedSave();
      } else {
        console.log(`No match: ${card1.value} vs ${card2.value}`);

        currentPlayer.matchStreak = 0;
        currentPlayer.lastFlipTime = new Date();

        // Update memory meter
        currentPlayer.memoryMeter = calculateMemoryMeter(
          currentPlayer.matches,
          currentPlayer.flips,
          currentPlayer.matchStreak
        );

        card1.isFlipped = false;
        card2.isFlipped = false;

        this.game.gameState.flippedCards =
          this.game.gameState.flippedCards.filter(
            (id) => id !== card1.id && id !== card2.id
          );

        console.log(
          `Cards ${card1.id} and ${card2.id} flipped back. Updated flippedCards:`,
          this.game.gameState.flippedCards
        );

        this.io.to(this.roomId).emit("cards-flipped-back", {
          cards: [card1.id, card2.id],
        });

        if (
          this.game.settings.gameMode === "sudden-death" ||
          this.game.gameState.status === "sudden-death"
        ) {
          console.log(
            `Sudden death: Eliminating player ${currentPlayer.username} for wrong match`
          );

          this.io.to(this.roomId).emit("player-eliminated", {
            playerId: currentPlayer.userId,
            username: currentPlayer.username,
            reason: "wrong_match_sudden_death",
          });

          if (!this.game.gameState.opponentsForHistory) {
            this.game.gameState.opponentsForHistory = [];
          }

          const existingOpponent = this.game.gameState.opponentsForHistory.find(
            (opp) => opp.userId === currentPlayer.userId
          );

          if (!existingOpponent) {
            this.game.gameState.opponentsForHistory.push({
              userId: currentPlayer.userId,
              username: currentPlayer.username,
              score: currentPlayer.score || 0,
              matches: currentPlayer.matches || 0,
              leftEarly: false,
              disconnectedAt: null,
            });
          }

          const playerIndex = this.game.players.findIndex(
            (p) => p.userId === currentPlayer.userId
          );
          if (playerIndex !== -1) {
            this.game.players.splice(playerIndex, 1);

            if (playerIndex <= this.game.gameState.currentPlayerIndex) {
              this.game.gameState.currentPlayerIndex = Math.max(
                0,
                this.game.gameState.currentPlayerIndex - 1
              );
            }
          }

          await this.protectedSave();

          // Check if only one player remains (winner)
          if (this.game.players.length === 1) {
            await this.endGame("sudden_death_winner");
            return;
          }

          if (this.game.players.length === 0) {
            await this.endGame("sudden_death_tie");
            return;
          }

          this.currentPlayerId = this.game.gameState.currentTurn;

          this.io.to(this.roomId).emit("game-state", {
            players: this.game.players,
            gameState: this.game.gameState,
          });

          await this.protectedSave();
        } else {
          if ((currentPlayer.extraTurns || 0) > 0) {
            currentPlayer.extraTurns -= 1;

            this.game.gameState.currentTurn = currentPlayer.userId;
            this.currentPlayerId = currentPlayer.userId;

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
            this.switchToNextPlayer();
          }
        }
      }

      this.currentFlippedCards = [];
      this.flipTimer = null;

      await this.protectedSave();
    } catch (error) {}
  }

  calculateScore() {
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

    this.currentPlayerId = currentTurnPlayerId;
  }

  giveExtraTurn(playerId, reason) {
    const player = this.game.players.find((p) => p.userId === playerId);
    if (!player) {
      console.error(`Player ${playerId} not found for extra turn`);
      return;
    }

    if (player.extraTurns === undefined || player.extraTurns === null) {
      player.extraTurns = 0;
    }

    if (reason === "match_found") {
    } else {
      // For other reasons (like power-ups), add 1 extra turn
      player.extraTurns += 1;
    }

    this.game.gameState.currentTurn = playerId;
    this.currentPlayerId = playerId; // Update current player ID

    this.io.to(this.roomId).emit("turn-continue", {
      currentPlayer: playerId,
      reason: reason,
      remainingExtraTurns: player.extraTurns,
    });

    this.io.to(this.roomId).emit("game-state", {
      players: this.game.players,
      gameState: this.game.gameState,
    });
  }

  switchToNextPlayer() {
    const currentIndex = this.game.gameState.currentPlayerIndex;
    const currentPlayer = this.game.players[currentIndex];

    if (currentPlayer && (currentPlayer.extraTurns || 0) > 0) {
      currentPlayer.extraTurns -= 1;

      this.game.gameState.currentTurn = currentPlayer.userId;
      this.currentPlayerId = currentPlayer.userId;

      this.io.to(this.roomId).emit("turn-continue", {
        currentPlayer: currentPlayer.userId,
        reason: "extra_turn_used",
        remainingExtraTurns: currentPlayer.extraTurns,
      });

      this.io.to(this.roomId).emit("game-state", {
        players: this.game.players,
        gameState: this.game.gameState,
      });

      return; // Don't switch to next player
    }

    const nextIndex = (currentIndex + 1) % this.game.players.length;

    this.currentFlippedCards = [];
    if (this.flipTimer) {
      clearTimeout(this.flipTimer);
      this.flipTimer = null;
    }

    if (currentIndex >= 0 && currentIndex < this.game.players.length) {
      this.game.players[currentIndex].isCurrentTurn = false;
    }

    if (nextIndex >= 0 && nextIndex < this.game.players.length) {
      this.game.players[nextIndex].isCurrentTurn = true;
      this.game.gameState.currentPlayerIndex = nextIndex;
      this.game.gameState.currentTurn = this.game.players[nextIndex].userId;
      this.currentPlayerId = this.game.players[nextIndex].userId; // Update current player ID
    } else {
      console.error(
        `Invalid nextIndex ${nextIndex} for players array of length ${this.game.players.length}`
      );
      // Fallback: set to first player
      if (this.game.players.length > 0) {
        this.game.players[0].isCurrentTurn = true;
        this.game.gameState.currentPlayerIndex = 0;
        this.game.gameState.currentTurn = this.game.players[0].userId;
        this.currentPlayerId = this.game.players[0].userId;
      }
    }

    this.io.to(this.roomId).emit("turn-changed", {
      playerId: this.game.players[nextIndex].userId,
      previousPlayerId: this.game.players[currentIndex].userId,
      gameState: this.game.gameState,
    });

    this.io.to(this.roomId).emit("game-state", {
      players: this.game.players,
      gameState: this.game.gameState,
    });

    this.synchronizeTurnState();
  }

  async usePowerUp(userId, powerUpType, target) {
    if (!this.game) {
      await this.initialize();
    }

    const player = this.game.players.find((p) => p.userId === userId);
    if (!player) {
      throw new Error("Player not found");
    }

    const powerUpIndex = player.powerUps.findIndex(
      (p) => p.type === powerUpType
    );
    if (powerUpIndex === -1) {
      throw new Error("Power-up not available");
    }

    const powerUp = player.powerUps[powerUpIndex];

    if (
      this.game?.gameState?.board &&
      Array.isArray(this.game.gameState.board) &&
      this.game.gameState.board.length > 0 &&
      this.game.players &&
      Array.isArray(this.game.players)
    ) {
      try {
        const livePlayer = this.game.players.find((p) => p.userId === userId);

        if (!livePlayer) {
          throw new Error("Player not found");
        }

        const completeGameState = {
          board: this.game.gameState.board,
          status: this.game.gameState.status,
          currentPlayerIndex: this.game.gameState.currentPlayerIndex,
          currentTurn: this.game.gameState.currentTurn,
          flippedCards: this.game.gameState.flippedCards,
          matchedPairs: this.game.gameState.matchedPairs,
          timeLeft: this.game.gameState.timeLeft,
          gameMode: this.game.gameState.gameMode,
          round: this.game.gameState.round,
          lastActivity: this.game.gameState.lastActivity,
          powerUpPool: this.game.gameState.powerUpPool,
          players: this.game.players,
        };

        await antiCheatSystem.validatePowerUpUsage(
          userId,
          powerUpType,
          completeGameState
        );

        antiCheatSystem.trackAction(
          userId,
          { type: "use_powerup", powerUpType, target },
          completeGameState
        );
      } catch (error) {
        console.warn(
          `🚨 Anti-cheat violation for user ${userId}: ${error.message}`
        );
        throw new Error(`Action blocked: ${error.message}`);
      }
    } else {
      console.log(
        "Skipping power-up anti-cheat validation - board not properly initialized yet"
      );
    }

    try {
      switch (powerUpType) {
        case "extraTurn":
          this.giveExtraTurn(userId, "extra_turn_powerup");
          break;

        case "peek":
          const unmatched = this.game.gameState.board.filter(
            (c) => !c.isMatched
          );

          this.io.to(this.roomId).emit("powerup-peek", {
            duration: 3000,
            playerId: userId,
            cards: unmatched.map((c) => ({ id: c.id, value: c.value })),
            targetUserId: userId, // Add target user ID for client-side filtering
          });
          break;

        case "swap":
          if (!target || !target.card1Id || !target.card2Id) {
            const unmatchedCards = this.game.gameState.board.filter(
              (c) => !c.isMatched
            );
            if (unmatchedCards.length < 2) {
              throw new Error("Not enough unmatched cards for swap");
            }

            const card1 = unmatchedCards[0];
            const card2 = unmatchedCards[1];

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

            if (!card1 || !card2 || card1.isMatched || card2.isMatched) {
              throw new Error("Invalid cards for swap");
            }

            [card1.value, card2.value] = [card2.value, card1.value];
            [card1.theme, card2.theme] = [card2.theme, card1.theme];

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
          if (!target || !target.cardId) {
            const unmatchedCards = this.game.gameState.board.filter(
              (c) => !c.isMatched && !c.isFlipped
            );
            if (unmatchedCards.length === 0) {
              throw new Error("No unmatched cards to reveal");
            }

            const revealCard = unmatchedCards[0];

            this.io.to(this.roomId).emit("powerup-reveal", {
              cardId: revealCard.id,
              value: revealCard.value,
              playerId: userId,
              targetUserId: userId,
            });
          } else {
            const revealCard = this.game.gameState.board.find(
              (c) => c.id === target.cardId
            );
            if (!revealCard || revealCard.isMatched) {
              throw new Error("Invalid card for reveal");
            }

            this.io.to(this.roomId).emit("powerup-reveal", {
              cardId: revealCard.id,
              value: revealCard.value,
              playerId: userId,
              targetUserId: userId,
            });
          }
          break;

        case "freeze":
          if (this.game.settings.gameMode === "blitz") {
            this.freezeTimer(10000);
            this.io.to(this.roomId).emit("powerup-freeze", {
              duration: 10000,
              playerId: userId,
              targetUserId: userId,
            });
          } else {
            throw new Error("Freeze power-up can only be used in Blitz mode");
          }
          break;

        case "shuffle":
          console.log("Shuffle power-up called");

          const unmatchedCards = this.game.gameState.board.filter(
            (c) => !c.isMatched
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

          this.io.to(this.roomId).emit("powerup-shuffle", {
            playerId: userId,
            board: this.game.gameState.board,
          });
          break;
      }

      const player = this.game.players.find((p) => p.userId === userId);
      if (player && player.powerUps) {
        const powerUpIndex = player.powerUps.findIndex(
          (p) => p.type === powerUpType
        );

        if (powerUpIndex !== -1) {
          player.powerUpsUsed = (player.powerUpsUsed || 0) + 1;

          player.powerUpsCollected.push(powerUpType);

          player.powerUps.splice(powerUpIndex, 1);

          this.io.to(this.roomId).emit("power-up-update", {
            playerId: userId,
            powerUps: player.powerUps,
            consumedPowerUp: powerUpType,
          });
        }
      }

      await this.protectedSave();

      if (powerUpType === "extraTurn") {
        this.game.gameState.currentTurn = player.userId;
        this.currentPlayerId = player.userId;

        this.io.to(this.roomId).emit("turn-continue", {
          currentPlayer: player.userId,
          reason: "extra_turn_powerup_used",
          remainingExtraTurns: player.extraTurns,
        });
      } else {
        this.game.gameState.currentTurn = player.userId;
        this.currentPlayerId = player.userId;
      }

      this.io.to(this.roomId).emit("game-state", {
        players: this.game.players,
        gameState: this.game.gameState,
      });

      this.io.to(this.roomId).emit("power-up-used-notification", {
        playerId: userId,
        playerName: player.username,
        powerUpType: powerUpType,
        powerUpName: powerUp.name,
        powerUpIcon: powerUp.icon,
      });
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

        if (
          this.game.settings.gameMode === "sudden-death" ||
          this.game.gameState.status === "sudden-death"
        ) {
          if (this.game.gameState.status === "sudden-death") {
            await this.endGame("sudden_death_timeout");
            return;
          } else {
            return;
          }
        }

        await this.endGame("timeout");
        return;
      }

      this.game.gameState.timeLeft -= 1;

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

      const suddenDeathBoard = generateSuddenDeathCards(
        this.game.settings.theme
      );

      this.game.gameState.board = suddenDeathBoard;
      this.game.gameState.status = "sudden-death";
      this.game.status = "playing";
      this.game.gameState.timeLeft = 30;
      this.game.gameState.matchedPairs = [];

      this.game.players.forEach((p) => (p.isCurrentTurn = false));

      this.game.players[0].isCurrentTurn = true;
      this.game.gameState.currentPlayerIndex = 0;
      this.game.gameState.currentTurn = this.game.players[0].userId;

      this.currentFlippedCards = [];

      await this.protectedSave();

      this.io.to(this.roomId).emit("sudden-death-triggered", {
        gameState: this.game.gameState,
        players: this.game.players,
        message: "Sudden Death Mode! Find the last pair to win!",
      });

      this.startGameTimer();
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

      if (!this.game) {
        console.log(`Game not found for room ${this.roomId} during endGame`);
        this.cleanup();
        return;
      }

      const originalPlayers = [...this.game.players];

      if (
        this.game?.gameState?.board &&
        Array.isArray(this.game.gameState.board) &&
        this.game.gameState.board.length > 0 &&
        this.game.players &&
        Array.isArray(this.game.players)
      ) {
        try {
          const matchedPairs = this.game.gameState.board.filter(
            (card) => card && card.isMatched
          );

          // Create a complete game state object for anti-cheat validation
          const completeGameState = {
            board: this.game.gameState.board,
            status: this.game.gameState.status,
            currentPlayerIndex: this.game.gameState.currentPlayerIndex,
            currentTurn: this.game.gameState.currentTurn,
            flippedCards: this.game.gameState.flippedCards,
            matchedPairs: this.game.gameState.matchedPairs,
            timeLeft: this.game.gameState.timeLeft,
            gameMode: this.game.gameState.gameMode,
            round: this.game.gameState.round,
            lastActivity: this.game.gameState.lastActivity,
            powerUpPool: this.game.gameState.powerUpPool,
            players: this.game.players,
          };

          for (const player of this.game.players) {
            if (player && player.userId) {
              // TODO: Fix validateGameCompletion method in antiCheatSystem
              // antiCheatSystem.validateGameCompletion(
              //   player.userId,
              //   completeGameState,
              //   matchedPairs
              // );
            }
          }
        } catch (error) {
          console.warn(
            `🚨 Anti-cheat violation during game completion: ${error.message}`
          );
        }
      } else {
        console.log(
          " Skipping game completion anti-cheat validation - board not properly initialized yet"
        );
      }

      this.game.gameState.status = "finished";
      this.game.status = "completed";
      this.game.endedAt = new Date();

      const gameDuration = this.game.startedAt
        ? (this.game.endedAt - this.game.startedAt) / 1000
        : 0;

      //
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

      let winners = [];
      const sortedPlayers = [...this.game.players].sort(
        (a, b) => b.score - a.score
      );

      if (reason === "last_player_winner") {
        winners = this.game.players;

        // Set the game state winner field for match history
        if (this.game.players.length === 1) {
          this.game.gameState.winner = this.game.players[0].userId;
          this.game.gameState.completionReason = "opponents_left";
        }
      } else if (reason === "all_players_left") {
        winners = [];
        this.game.gameState.completionReason = "all_players_left";
      } else if (
        reason === "timeout" &&
        this.game.settings.gameMode === "blitz"
      ) {
        const playersWithMatches = sortedPlayers.filter((p) => p.matches > 0);
        if (playersWithMatches.length === 0) {
          winners = [];
          this.game.gameState.completionReason = "timeout_no_matches";
        } else {
          const maxMatches = playersWithMatches[0].matches;
          winners = playersWithMatches.filter((p) => p.matches === maxMatches);
          this.game.gameState.completionReason = "timeout_with_matches";

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
        winners = [];
        this.game.gameState.completionReason = "sudden_death_timeout";

        console.log("Sudden death timeout - keeping players for match history");
      } else if (reason === "sudden_death_winner") {
        winners = this.game.players;
        this.game.gameState.completionReason = "sudden_death_winner";
        if (this.game.players.length === 1) {
          this.game.gameState.winner = this.game.players[0].userId;
        }

        console.log(
          "Sudden death completed - keeping players for match history"
        );
      } else {
        winners = sortedPlayers.filter(
          (p) => p.score === sortedPlayers[0].score && p.score > 0
        );

        this.game.gameState.completionReason = "game_completed";

        // Set winner in game state if there's exactly one winner
        if (winners.length === 1) {
          this.game.gameState.winner = winners[0].userId;
        }
      }

      if (!this.game.gameState.opponentsForHistory) {
        this.game.gameState.opponentsForHistory = [];
      }

      const allPlayers = [...originalPlayers];

      if (this.game.gameState.opponentsForHistory.length > 0) {
        const existingOpponentIds = allPlayers.map((p) => p.userId);
        const additionalOpponents =
          this.game.gameState.opponentsForHistory.filter(
            (opp) => !existingOpponentIds.includes(opp.userId)
          );
        allPlayers.push(...additionalOpponents);
      }

      const opponentMap = new Map();

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

      this.game.gameState.opponentsForHistory = Array.from(
        opponentMap.values()
      );

      for (const player of this.game.players) {
        try {
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
              memoryMeter: player.memoryMeter || 0,
              gameMode: this.game.settings.gameMode,
              boardSize: this.game.settings.boardSize,
            };

            user.updateStats(gameResult);

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

      try {
        this.game.updatedAt = new Date();
        await this.game.save();
      } catch (error) {
        console.error(
          `Error in final game save for room ${this.roomId}:`,
          error
        );
      }

      this.io.to(this.roomId).emit("game-over", {
        reason,
        winners: winners,
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

      this.gameCompleted = true;
    } catch (error) {
      console.error(`Error ending game for room ${this.roomId}:`, error);
      if (error.name === "DocumentNotFoundError") {
        this.cleanup();
      }
    }
  }

  async handlePlayerDisconnect(userId) {
    try {
      if (!this.game) {
        return;
      }

      await this.initialize();

      const player = this.game.players.find((p) => p.userId === userId);
      if (!player) {
        return;
      }

      const disconnectedPlayer = {
        userId: player.userId,
        username: player.username,
        score: player.score || 0,
        matches: player.matches || 0,
        leftEarly: true,
        disconnectedAt: new Date(),
      };

      if (!this.game.gameState.opponentsForHistory) {
        this.game.gameState.opponentsForHistory = [];
      }

      const existingOpponent = this.game.gameState.opponentsForHistory.find(
        (opp) => opp.userId === userId
      );

      if (!existingOpponent) {
        this.game.gameState.opponentsForHistory.push(disconnectedPlayer);
      } else {
        existingOpponent.leftEarly = true;
        existingOpponent.disconnectedAt = new Date();
        existingOpponent.score = player.score || 0;
        existingOpponent.matches = player.matches || 0;
      }

      const playerIndex = this.game.players.findIndex(
        (p) => p.userId === userId
      );
      if (playerIndex !== -1) {
        this.game.players.splice(playerIndex, 1);

        if (playerIndex <= this.game.gameState.currentPlayerIndex) {
          this.game.gameState.currentPlayerIndex = Math.max(
            0,
            this.game.gameState.currentPlayerIndex - 1
          );
        }
      }

      if (this.game.gameState.status === "playing" && player.isCurrentTurn) {
        if (this.game.players.length > 0) {
          this.switchToNextPlayer();
          await this.protectedSave();
        } else {
          // console.log("No players remaining, cannot switch turn");
        }
      }

      const remainingPlayers = this.game.players.length;

      if (remainingPlayers === 0) {
      } else if (remainingPlayers === 1) {
        await this.endGame("last_player_winner");
      } else if (remainingPlayers >= 2) {
        await this.protectedSave();
      }
    } catch (error) {
      console.error(
        `Error handling player disconnect for user ${userId}:`,
        error
      );
    }
  }

  cleanup() {
    if (this.gameCompleted && this.game) {
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

    if (this.suddenDeathTimer) {
      clearTimeout(this.suddenDeathTimer);
      this.suddenDeathTimer = null;
    }

    if (this.powerUpTimer) {
      clearTimeout(this.powerUpTimer);
      this.powerUpTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.game = null;
    this.currentFlippedCards = [];
    this.isProcessingFlip = false;
    this.suddenDeathMode = false;
    this.gameCompleted = false;
  }
}

module.exports = { GameEngine };
