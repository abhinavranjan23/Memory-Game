import { Game } from '../models/Game.js';
import { User } from '../models/User.js';
import { 
  generateBoard, 
  cardsMatch, 
  calculateScore, 
  getTimeLimit,
  shouldTriggerSuddenDeath,
  generateSuddenDeathCards,
  calculateMemoryMeter,
  shuffleArray
} from '../utils/gameLogic.js';

export class GameEngine {
  constructor(roomId, io) {
    this.roomId = roomId;
    this.io = io;
    this.game = null;
    this.gameTimer = null;
    this.flipTimer = null;
    this.currentFlippedCards = [];
    this.isProcessingFlip = false;
  }

  async initialize() {
    this.game = await Game.findOne({ roomId: this.roomId });
    if (!this.game) {
      throw new Error('Game not found');
    }
  }

  async startGame() {
    if (!this.game) {
      await this.initialize();
    }

    // Check if all players are ready
    const allReady = this.game.players.every(p => p.isReady);
    if (!allReady || this.game.players.length < 2) {
      throw new Error('Not all players are ready or insufficient players');
    }

    // Generate game board
    const board = generateBoard(
      this.game.settings.boardSize,
      this.game.settings.theme,
      this.game.settings.powerUpsEnabled
    );

    // Initialize game state
    this.game.gameState = {
      status: 'playing',
      currentPlayerIndex: 0,
      board: board,
      flippedCards: [],
      matchedPairs: [],
      timeLeft: getTimeLimit(this.game.settings.gameMode, this.game.settings.timeLimit),
      gameMode: this.game.settings.gameMode,
      round: 1,
      lastActivity: new Date(),
      powerUpPool: []
    };

    // Set first player's turn
    this.game.players[0].isCurrentTurn = true;

    await this.game.save();

    // Start game timer for blitz mode
    if (this.game.settings.gameMode === 'blitz') {
      this.startGameTimer();
    }

    // Notify all players
    this.io.to(this.roomId).emit('game-started', {
      gameState: this.game.gameState,
      players: this.game.players
    });

    console.log(`Game started in room ${this.roomId}`);
  }

  async flipCard(userId, cardId) {
    if (!this.game) {
      await this.initialize();
    }

    if (this.isProcessingFlip) {
      throw new Error('Please wait for the current flip to complete');
    }

    // Check if it's the player's turn
    const currentPlayer = this.game.players[this.game.gameState.currentPlayerIndex];
    if (currentPlayer.userId !== userId) {
      throw new Error('Not your turn');
    }

    // Check if game is in playing state
    if (this.game.gameState.status !== 'playing') {
      throw new Error('Game is not in playing state');
    }

    // Find the card
    const card = this.game.gameState.board.find(c => c.id === cardId);
    if (!card) {
      throw new Error('Card not found');
    }

    // Check if card can be flipped
    if (card.isFlipped || card.isMatched) {
      throw new Error('Card cannot be flipped');
    }

    // Check if already two cards are flipped
    if (this.currentFlippedCards.length >= 2) {
      throw new Error('Two cards are already flipped');
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

      // Emit card flip to all players
      this.io.to(this.roomId).emit('card-flipped', {
        cardId: card.id,
        value: card.value,
        playerId: userId,
        gameState: this.game.gameState
      });

      // Check if this is the second card
      if (this.currentFlippedCards.length === 2) {
        // Wait a moment for visual effect
        this.flipTimer = setTimeout(async () => {
          await this.processCardMatch();
        }, 1500);
      }

      await this.game.save();
    } finally {
      this.isProcessingFlip = false;
    }
  }

  async processCardMatch() {
    const [card1, card2] = this.currentFlippedCards;
    const currentPlayer = this.game.players[this.game.gameState.currentPlayerIndex];

    let isMatch = false;
    let powerUpActivated = null;

    try {
      // Check if cards match
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
        
        // Check for power-ups
        if (card1.powerUp) {
          currentPlayer.powerUps.push(card1.powerUp);
          powerUpActivated = card1.powerUp;
        }
        if (card2.powerUp && card2.powerUp.type !== card1.powerUp?.type) {
          currentPlayer.powerUps.push(card2.powerUp);
          powerUpActivated = card2.powerUp;
        }
        
        // Update memory meter
        currentPlayer.memoryMeter = calculateMemoryMeter(
          currentPlayer.matches,
          currentPlayer.flips,
          currentPlayer.matchStreak
        );
        
        console.log(`Match found by ${currentPlayer.username} in room ${this.roomId}`);
      } else {
        // No match - flip cards back
        card1.isFlipped = false;
        card2.isFlipped = false;
        
        // Reset match streak
        currentPlayer.matchStreak = 0;
        
        // Switch to next player
        this.switchToNextPlayer();
      }

      // Clear flipped cards
      this.currentFlippedCards = [];

      // Emit match result
      this.io.to(this.roomId).emit('match-result', {
        isMatch,
        cards: [card1, card2],
        currentPlayer: {
          userId: currentPlayer.userId,
          score: currentPlayer.score,
          matches: currentPlayer.matches,
          matchStreak: currentPlayer.matchStreak,
          memoryMeter: currentPlayer.memoryMeter
        },
        powerUpActivated,
        gameState: this.game.gameState
      });

      // Check if game is complete
      const totalPairs = this.game.gameState.board.length / 2;
      if (this.game.gameState.matchedPairs.length / 2 >= totalPairs) {
        await this.endGame('completed');
      } else if (isMatch) {
        // Player gets another turn for successful match
        this.io.to(this.roomId).emit('turn-continue', {
          currentPlayer: currentPlayer.userId,
          reason: 'match_found'
        });
      }

      await this.game.save();

    } catch (error) {
      console.error('Error processing card match:', error);
      
      // Reset flipped cards on error
      if (card1) card1.isFlipped = false;
      if (card2) card2.isFlipped = false;
      this.currentFlippedCards = [];
      
      this.io.to(this.roomId).emit('error', {
        message: 'Error processing card match'
      });
    }
  }

  switchToNextPlayer() {
    const currentIndex = this.game.gameState.currentPlayerIndex;
    const nextIndex = (currentIndex + 1) % this.game.players.length;
    
    // Update current turn
    this.game.players[currentIndex].isCurrentTurn = false;
    this.game.players[nextIndex].isCurrentTurn = true;
    this.game.gameState.currentPlayerIndex = nextIndex;

    // Emit turn change
    this.io.to(this.roomId).emit('turn-changed', {
      previousPlayer: this.game.players[currentIndex].userId,
      currentPlayer: this.game.players[nextIndex].userId,
      gameState: this.game.gameState
    });
  }

  async usePowerUp(userId, powerUpType, target) {
    if (!this.game) {
      await this.initialize();
    }

    const player = this.game.players.find(p => p.userId === userId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Check if player has the power-up
    const powerUpIndex = player.powerUps.findIndex(p => p.type === powerUpType);
    if (powerUpIndex === -1) {
      throw new Error('Power-up not available');
    }

    const powerUp = player.powerUps[powerUpIndex];

    try {
      switch (powerUpType) {
        case 'extraTurn':
          // Player gets an extra turn after their current turn ends
          player.extraTurns = (player.extraTurns || 0) + 1;
          break;

        case 'peek':
          // Reveal all unmatched cards for 3 seconds
          const unmatched = this.game.gameState.board.filter(c => !c.isMatched);
          this.io.to(this.roomId).emit('powerup-peek', {
            cards: unmatched,
            duration: 3000,
            playerId: userId
          });
          break;

        case 'swap':
          // Swap positions of two cards
          if (!target || !target.card1Id || !target.card2Id) {
            throw new Error('Two cards required for swap');
          }
          
          const card1 = this.game.gameState.board.find(c => c.id === target.card1Id);
          const card2 = this.game.gameState.board.find(c => c.id === target.card2Id);
          
          if (!card1 || !card2 || card1.isMatched || card2.isMatched) {
            throw new Error('Invalid cards for swap');
          }

          // Swap card values and themes
          [card1.value, card2.value] = [card2.value, card1.value];
          [card1.theme, card2.theme] = [card2.theme, card1.theme];
          
          this.io.to(this.roomId).emit('powerup-swap', {
            card1Id: card1.id,
            card2Id: card2.id,
            playerId: userId
          });
          break;

        case 'revealOne':
          // Permanently reveal one card
          if (!target || !target.cardId) {
            throw new Error('Card ID required for reveal');
          }
          
          const revealCard = this.game.gameState.board.find(c => c.id === target.cardId);
          if (!revealCard || revealCard.isMatched) {
            throw new Error('Invalid card for reveal');
          }
          
          revealCard.isFlipped = true;
          this.io.to(this.roomId).emit('powerup-reveal', {
            cardId: revealCard.id,
            value: revealCard.value,
            playerId: userId
          });
          break;

        case 'freeze':
          // Freeze timer for 10 seconds (blitz mode only)
          if (this.game.settings.gameMode === 'blitz') {
            this.freezeTimer(10000);
            this.io.to(this.roomId).emit('powerup-freeze', {
              duration: 10000,
              playerId: userId
            });
          }
          break;

        case 'shuffle':
          // Shuffle unmatched cards
          const unmatchedCards = this.game.gameState.board.filter(c => !c.isMatched);
          const values = unmatchedCards.map(c => ({ value: c.value, theme: c.theme }));
          const shuffled = shuffleArray([...values]);
          
          unmatchedCards.forEach((card, index) => {
            card.value = shuffled[index].value;
            card.theme = shuffled[index].theme;
          });
          
          this.io.to(this.roomId).emit('powerup-shuffle', {
            playerId: userId
          });
          break;
      }

      // Remove used power-up
      player.powerUps.splice(powerUpIndex, 1);
      player.powerUpsUsed = (player.powerUpsUsed || 0) + 1;

      await this.game.save();

      this.io.to(this.roomId).emit('powerup-used', {
        playerId: userId,
        powerUpType,
        remainingPowerUps: player.powerUps
      });

      console.log(`${player.username} used power-up ${powerUpType} in room ${this.roomId}`);

    } catch (error) {
      console.error('Power-up error:', error);
      throw error;
    }
  }

  startGameTimer() {
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
    }

    this.gameTimer = setInterval(async () => {
      if (this.game.gameState.timeLeft <= 0) {
        await this.endGame('timeout');
        return;
      }

      this.game.gameState.timeLeft -= 1;
      
      // Emit time update every 10 seconds or last 10 seconds
      if (this.game.gameState.timeLeft % 10 === 0 || this.game.gameState.timeLeft <= 10) {
        this.io.to(this.roomId).emit('time-update', {
          timeLeft: this.game.gameState.timeLeft
        });
      }

      await this.game.save();
    }, 1000);
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
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }

    if (this.flipTimer) {
      clearTimeout(this.flipTimer);
      this.flipTimer = null;
    }

    // Update game state
    this.game.gameState.status = 'finished';
    this.game.endedAt = new Date();

    // Determine winners
    const sortedPlayers = [...this.game.players].sort((a, b) => b.score - a.score);
    const winners = sortedPlayers.filter(p => p.score === sortedPlayers[0].score);

    // Update user statistics
    for (const player of this.game.players) {
      try {
        const user = await User.findById(player.userId);
        if (user && !user.isGuest) {
          const gameResult = {
            won: winners.some(w => w.userId === player.userId),
            score: player.score,
            flipTimes: [player.lastFlipTime ? (player.lastFlipTime - this.game.createdAt) / player.flips : 0],
            matchStreak: player.matchStreak,
            isPerfect: player.flips === player.matches * 2,
            powerUpsUsed: player.powerUpsUsed || 0
          };

          user.updateStats(gameResult);
          await user.save();
        }
      } catch (error) {
        console.error(`Error updating stats for player ${player.userId}:`, error);
      }
    }

    await this.game.save();

    // Emit game end
    this.io.to(this.roomId).emit('game-ended', {
      reason,
      winners: winners.map(w => ({
        userId: w.userId,
        username: w.username,
        score: w.score
      })),
      finalStats: sortedPlayers.map(p => ({
        userId: p.userId,
        username: p.username,
        score: p.score,
        matches: p.matches,
        flips: p.flips,
        accuracy: p.flips > 0 ? Math.round((p.matches * 2 / p.flips) * 100) : 0,
        memoryMeter: p.memoryMeter
      })),
      gameState: this.game.gameState
    });

    console.log(`Game ended in room ${this.roomId}. Reason: ${reason}`);
  }

  async handlePlayerDisconnect(userId) {
    if (!this.game) return;

    const player = this.game.players.find(p => p.userId === userId);
    if (!player) return;

    // If game is in progress and player was current turn, skip to next player
    if (this.game.gameState.status === 'playing' && player.isCurrentTurn) {
      this.switchToNextPlayer();
      await this.game.save();
    }

    // If only one player left, end the game
    if (this.game.players.length === 1) {
      await this.endGame('player_disconnect');
    }

    console.log(`Player ${player.username} disconnected from room ${this.roomId}`);
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