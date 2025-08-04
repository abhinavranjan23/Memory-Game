import { Server as SocketIOServer, Socket } from 'socket.io';
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
import { GameMode, Player, Card } from '../types/index.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export class GameEngine {
  private game: any;
  private io: SocketIOServer;
  private players: Map<string, AuthenticatedSocket> = new Map();
  private gameTimer?: NodeJS.Timeout;
  private flipTimeout?: NodeJS.Timeout;
  private flipTimes: Map<string, number[]> = new Map();
  private isProcessingFlip = false;

  constructor(game: any, io: SocketIOServer) {
    this.game = game;
    this.io = io;
  }

  addPlayer(socket: AuthenticatedSocket) {
    if (socket.userId) {
      this.players.set(socket.userId, socket);
    }
  }

  removePlayer(userId: string) {
    this.players.delete(userId);
  }

  async startGame() {
    try {
      // Generate game board
      const board = generateBoard(
        this.game.settings.boardSize,
        this.game.settings.theme,
        this.game.settings.powerUpsEnabled
      );

      // Set up game state
      this.game.gameState.board = board;
      this.game.gameState.status = 'playing';
      this.game.gameState.currentPlayerIndex = 0;
      this.game.gameState.timeLeft = getTimeLimit(
        this.game.settings.gameMode,
        this.game.settings.boardSize
      );
      this.game.gameState.lastActivity = new Date();

      // Set first player's turn
      if (this.game.players.length > 0) {
        this.game.players.forEach((player: Player, index: number) => {
          player.isCurrentTurn = index === 0;
        });
      }

      await this.game.save();

      // Initialize flip times tracking
      this.game.players.forEach((player: Player) => {
        this.flipTimes.set(player.userId, []);
      });

      // Notify all players
      this.io.to(this.game.roomId).emit('game-started', {
        gameState: this.game.gameState,
        players: this.game.players
      });

      // Start game timer
      this.startTimer();

      console.log(`Game started in room ${this.game.roomId}`);
    } catch (error) {
      console.error('Error starting game:', error);
    }
  }

  async flipCard(userId: string, cardId: number) {
    if (this.isProcessingFlip) return;
    
    try {
      this.isProcessingFlip = true;
      
      // Validate turn
      const currentPlayer = this.game.players[this.game.gameState.currentPlayerIndex];
      if (!currentPlayer || currentPlayer.userId !== userId) {
        throw new Error('Not your turn');
      }

      // Validate game state
      if (this.game.gameState.status !== 'playing') {
        throw new Error('Game not in progress');
      }

      // Validate card
      const card = this.game.gameState.board.find((c: Card) => c.id === cardId);
      if (!card || card.isFlipped || card.isMatched) {
        throw new Error('Invalid card');
      }

      // Record flip time
      const flipTime = Date.now();
      const playerFlipTimes = this.flipTimes.get(userId) || [];
      
      // Flip the card
      card.isFlipped = true;
      this.game.gameState.flippedCards.push(cardId);
      currentPlayer.flips++;

      // Check for power-up
      if (card.powerUp) {
        currentPlayer.powerUps.push(card.powerUp);
        this.io.to(this.game.roomId).emit('powerup-collected', {
          userId,
          powerUp: card.powerUp
        });
      }

      // Update last activity
      this.game.gameState.lastActivity = new Date();

      // Emit card flip
      this.io.to(this.game.roomId).emit('card-flipped', {
        cardId,
        card,
        userId,
        gameState: this.game.gameState
      });

      // Check if this is the second flipped card
      if (this.game.gameState.flippedCards.length === 2) {
        const [firstCardId, secondCardId] = this.game.gameState.flippedCards;
        const firstCard = this.game.gameState.board.find((c: Card) => c.id === firstCardId);
        const secondCard = this.game.gameState.board.find((c: Card) => c.id === secondCardId);

        // Calculate flip time for this pair
        if (playerFlipTimes.length > 0) {
          const pairFlipTime = flipTime - playerFlipTimes[playerFlipTimes.length - 1];
          playerFlipTimes.push(pairFlipTime);
        } else {
          playerFlipTimes.push(1000); // Default for first flip
        }

        // Delay to show both cards
        this.flipTimeout = setTimeout(async () => {
          await this.processCardPair(firstCard!, secondCard!, currentPlayer);
        }, 1500);

      } else {
        // Record the time of the first flip
        playerFlipTimes.push(flipTime);
        this.flipTimes.set(userId, playerFlipTimes);
      }

      await this.game.save();
      
    } catch (error: any) {
      const socket = this.players.get(userId);
      if (socket) {
        socket.emit('error', { message: error.message });
      }
    } finally {
      this.isProcessingFlip = false;
    }
  }

  private async processCardPair(firstCard: Card, secondCard: Card, currentPlayer: Player) {
    try {
      const isMatch = cardsMatch(firstCard, secondCard);

      if (isMatch) {
        // Mark cards as matched
        firstCard.isMatched = true;
        secondCard.isMatched = true;
        this.game.gameState.matchedPairs.push(firstCard.id, secondCard.id);

        // Update player stats
        currentPlayer.matches++;
        currentPlayer.matchStreak++;
        currentPlayer.score += this.calculateMatchScore(currentPlayer);

        // Update memory meter
        const playerFlipTimes = this.flipTimes.get(currentPlayer.userId) || [];
        const avgFlipTime = playerFlipTimes.length > 0 
          ? playerFlipTimes.reduce((a, b) => a + b, 0) / playerFlipTimes.length 
          : 0;
        
        currentPlayer.memoryMeter = calculateMemoryMeter(
          currentPlayer.flips,
          currentPlayer.matches,
          avgFlipTime,
          currentPlayer.matchStreak
        );

        this.io.to(this.game.roomId).emit('match-found', {
          cards: [firstCard, secondCard],
          player: currentPlayer,
          gameState: this.game.gameState
        });

        // Check for game end
        const allMatched = this.game.gameState.board.every((card: Card) => card.isMatched);
        if (allMatched) {
          await this.endGame('completed');
          return;
        }

        // Player keeps turn on match (except in blitz mode)
        if (this.game.settings.gameMode !== 'blitz') {
          // Continue current player's turn
        } else {
          this.nextPlayer();
        }

      } else {
        // No match - flip cards back
        firstCard.isFlipped = false;
        secondCard.isFlipped = false;
        currentPlayer.matchStreak = 0; // Reset streak

        this.io.to(this.game.roomId).emit('no-match', {
          cards: [firstCard, secondCard],
          gameState: this.game.gameState
        });

        // Check for extra turn power-up
        const hasExtraTurn = currentPlayer.powerUps.find(p => p.type === 'extraTurn' && p.uses > 0);
        if (hasExtraTurn) {
          hasExtraTurn.uses--;
          if (hasExtraTurn.uses <= 0) {
            currentPlayer.powerUps = currentPlayer.powerUps.filter(p => p !== hasExtraTurn);
          }
          
          this.io.to(this.game.roomId).emit('extra-turn-used', {
            userId: currentPlayer.userId
          });
        } else {
          this.nextPlayer();
        }
      }

      // Clear flipped cards
      this.game.gameState.flippedCards = [];
      await this.game.save();

    } catch (error) {
      console.error('Error processing card pair:', error);
    }
  }

  private calculateMatchScore(player: Player): number {
    let baseScore = 100;
    
    // Streak bonus
    if (player.matchStreak > 1) {
      baseScore += (player.matchStreak - 1) * 25;
    }
    
    // Game mode multiplier
    switch (this.game.settings.gameMode) {
      case 'blitz':
        baseScore *= 1.5;
        break;
      case 'sudden-death':
        baseScore *= 1.2;
        break;
      case 'powerup-frenzy':
        baseScore *= 0.8;
        break;
    }
    
    return Math.floor(baseScore);
  }

  private nextPlayer() {
    const currentIndex = this.game.gameState.currentPlayerIndex;
    const nextIndex = (currentIndex + 1) % this.game.players.length;
    
    // Update turn
    this.game.players.forEach((player: Player, index: number) => {
      player.isCurrentTurn = index === nextIndex;
    });
    
    this.game.gameState.currentPlayerIndex = nextIndex;
    
    this.io.to(this.game.roomId).emit('turn-changed', {
      currentPlayerId: this.game.players[nextIndex].userId,
      gameState: this.game.gameState
    });
  }

  async usePowerUp(userId: string, powerUpType: string, target?: any) {
    try {
      const player = this.game.players.find((p: Player) => p.userId === userId);
      if (!player) throw new Error('Player not found');

      const powerUp = player.powerUps.find(p => p.type === powerUpType && p.uses > 0);
      if (!powerUp) throw new Error('Power-up not available');

      // Use the power-up
      powerUp.uses--;
      if (powerUp.uses <= 0) {
        player.powerUps = player.powerUps.filter(p => p !== powerUp);
      }

      switch (powerUpType) {
        case 'peek':
          this.io.to(this.game.roomId).emit('peek-activated', {
            userId,
            duration: powerUp.duration
          });
          break;

        case 'swap':
          if (target?.cardId1 !== undefined && target?.cardId2 !== undefined) {
            const card1 = this.game.gameState.board.find((c: Card) => c.id === target.cardId1);
            const card2 = this.game.gameState.board.find((c: Card) => c.id === target.cardId2);
            
            if (card1 && card2 && !card1.isMatched && !card2.isMatched) {
              [card1.value, card2.value] = [card2.value, card1.value];
              
              this.io.to(this.game.roomId).emit('cards-swapped', {
                cardId1: target.cardId1,
                cardId2: target.cardId2,
                userId
              });
            }
          }
          break;

        case 'revealOne':
          if (target?.cardId !== undefined) {
            const card = this.game.gameState.board.find((c: Card) => c.id === target.cardId);
            if (card && !card.isMatched) {
              this.io.to(this.game.roomId).emit('card-revealed', {
                cardId: target.cardId,
                value: card.value,
                userId
              });
            }
          }
          break;

        case 'freeze':
          this.pauseTimer(powerUp.duration || 10000);
          this.io.to(this.game.roomId).emit('timer-frozen', {
            userId,
            duration: powerUp.duration
          });
          break;

        case 'shuffle':
          const unmatchedCards = this.game.gameState.board.filter((c: Card) => !c.isMatched);
          const unmatchedValues = unmatchedCards.map(c => c.value);
          const shuffledValues = shuffleArray(unmatchedValues);
          
          unmatchedCards.forEach((card, index) => {
            card.value = shuffledValues[index];
          });
          
          this.io.to(this.game.roomId).emit('cards-shuffled', {
            userId
          });
          break;
      }

      await this.game.save();

      this.io.to(this.game.roomId).emit('powerup-used', {
        userId,
        powerUpType,
        target
      });

    } catch (error: any) {
      const socket = this.players.get(userId);
      if (socket) {
        socket.emit('error', { message: error.message });
      }
    }
  }

  private startTimer() {
    this.gameTimer = setInterval(async () => {
      this.game.gameState.timeLeft--;
      
      if (this.game.gameState.timeLeft <= 0) {
        // Check for sudden death
        if (shouldTriggerSuddenDeath(this.game.players, this.game.gameState.timeLeft)) {
          await this.startSuddenDeath();
        } else {
          await this.endGame('timeout');
        }
      } else {
        // Emit time update every 5 seconds or in last 10 seconds
        if (this.game.gameState.timeLeft % 5 === 0 || this.game.gameState.timeLeft <= 10) {
          this.io.to(this.game.roomId).emit('time-update', {
            timeLeft: this.game.gameState.timeLeft
          });
        }
      }
    }, 1000);
  }

  private pauseTimer(duration: number) {
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
    }
    
    setTimeout(() => {
      this.startTimer();
    }, duration);
  }

  private async startSuddenDeath() {
    try {
      // Generate sudden death board (single pair)
      const suddenDeathCards = generateSuddenDeathCards(this.game.settings.theme);
      
      this.game.gameState.board = suddenDeathCards;
      this.game.gameState.flippedCards = [];
      this.game.gameState.matchedPairs = [];
      this.game.gameState.timeLeft = 30; // 30 seconds for sudden death
      this.game.gameState.round++;
      
      // Reset all players except those tied for first
      const maxScore = Math.max(...this.game.players.map((p: Player) => p.score));
      this.game.players.forEach((player: Player) => {
        if (player.score < maxScore) {
          player.isCurrentTurn = false;
        }
      });
      
      await this.game.save();
      
      this.io.to(this.game.roomId).emit('sudden-death-started', {
        gameState: this.game.gameState,
        message: 'Sudden Death! First to match wins!'
      });
      
    } catch (error) {
      console.error('Error starting sudden death:', error);
      await this.endGame('error');
    }
  }

  async endGame(reason: 'completed' | 'timeout' | 'abandoned' | 'error') {
    try {
      if (this.gameTimer) {
        clearInterval(this.gameTimer);
      }
      
      if (this.flipTimeout) {
        clearTimeout(this.flipTimeout);
      }

      this.game.gameState.status = 'finished';
      this.game.endedAt = new Date();

      // Calculate final scores and determine winner
      const sortedPlayers = [...this.game.players].sort((a, b) => b.score - a.score);
      const winner = sortedPlayers[0];

      // Update player statistics
      for (const player of this.game.players) {
        const user = await User.findById(player.userId);
        if (user) {
          const flipTimes = this.flipTimes.get(player.userId) || [];
          const gameResult = {
            won: player.userId === winner.userId,
            score: player.score,
            flips: player.flips,
            matches: player.matches,
            flipTimes,
            matchStreak: player.matchStreak,
            powerUpsUsed: player.powerUps.length,
            isPerfect: player.matches * 2 === player.flips
          };

          user.updateStats(gameResult);
          await user.save();
        }
      }

      await this.game.save();

      // Notify all players
      this.io.to(this.game.roomId).emit('game-ended', {
        reason,
        winner: winner ? {
          userId: winner.userId,
          username: winner.username,
          score: winner.score
        } : null,
        finalScores: sortedPlayers,
        gameState: this.game.gameState
      });

      console.log(`Game ended in room ${this.game.roomId} - Reason: ${reason}`);
      
    } catch (error) {
      console.error('Error ending game:', error);
    }
  }

  handlePlayerDisconnect(userId: string) {
    const player = this.game.players.find((p: Player) => p.userId === userId);
    if (player && this.game.gameState.status === 'playing') {
      // Pause game for 60 seconds waiting for reconnection
      this.io.to(this.game.roomId).emit('player-disconnected', {
        userId,
        username: player.username
      });
      
      setTimeout(() => {
        // If player hasn't reconnected, continue without them
        if (!this.players.has(userId)) {
          if (player.isCurrentTurn) {
            this.nextPlayer();
          }
        }
      }, 60000);
    }
  }
}