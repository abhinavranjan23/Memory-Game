import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSocket } from '../contexts/SocketContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { motion } from 'framer-motion';
import { UserGroupIcon, ArrowLeftIcon, ClockIcon } from '@heroicons/react/24/outline';

const Game = () => {
  const { roomId } = useParams();
  const { socket } = useSocket();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [gameStatus, setGameStatus] = useState('waiting');

  useEffect(() => {
    if (socket) {
      // Join the room when component mounts
      socket.emit('join-room', { roomId });

      // Listen for game updates
      socket.on('room-joined', handleRoomJoined);
      socket.on('game-state', handleGameState);
      socket.on('game-started', handleGameStarted);
      socket.on('player-joined', handlePlayerJoined);
      socket.on('player-left', handlePlayerLeft);
      socket.on('card-flipped', handleCardFlipped);
      socket.on('cards-matched', handleCardsMatched);
      socket.on('cards-flipped-back', handleCardsFlippedBack);
      socket.on('turn-changed', handleTurnChanged);
      socket.on('game-over', handleGameOver);
      socket.on('error', handleError);

      return () => {
        socket.off('room-joined', handleRoomJoined);
        socket.off('game-state', handleGameState);
        socket.off('game-started', handleGameStarted);
        socket.off('player-joined', handlePlayerJoined);
        socket.off('player-left', handlePlayerLeft);
        socket.off('card-flipped', handleCardFlipped);
        socket.off('cards-matched', handleCardsMatched);
        socket.off('cards-flipped-back', handleCardsFlippedBack);
        socket.off('turn-changed', handleTurnChanged);
        socket.off('game-over', handleGameOver);
        socket.off('error', handleError);
      };
    }
  }, [socket, roomId]);

  const handleRoomJoined = (data) => {
    setLoading(false);
    setGame(data.game);
    setPlayers(data.game.players);
    setCards(data.game.gameState.board || []);
    setCurrentTurn(data.game.gameState.currentTurn);
    setGameStatus(data.game.gameState.status);
  };

  const handleGameState = (data) => {
    setPlayers(data.players);
    setCards(data.gameState.board || []);
    setCurrentTurn(data.gameState.currentTurn);
    setGameStatus(data.gameState.status);
  };

  const handleGameStarted = (data) => {
    setPlayers(data.players);
    setCards(data.gameState.board || []);
    setCurrentTurn(data.gameState.currentPlayerIndex !== undefined ? 
      data.players[data.gameState.currentPlayerIndex]?.userId : null);
    setGameStatus(data.gameState.status);
    addToast('Game has started!', 'success');
  };

  const handlePlayerJoined = (data) => {
    setPlayers(prevPlayers => {
      const newPlayers = [...prevPlayers];
      const existingPlayerIndex = newPlayers.findIndex(p => p.userId === data.player.userId);
      
      if (existingPlayerIndex >= 0) {
        newPlayers[existingPlayerIndex] = data.player;
      } else {
        newPlayers.push(data.player);
      }

      return newPlayers;
    });
    addToast(`${data.player.username} joined the game`, 'info');
  };

  const handlePlayerLeft = (data) => {
    setPlayers(prevPlayers => prevPlayers.filter(p => p.userId !== data.userId));
    addToast(`${data.username} left the game`, 'info');
  };

  const handleCardFlipped = (data) => {
    setCards(prevCards => {
      const newCards = [...prevCards];
      const cardIndex = newCards.findIndex(c => c.id === data.cardId);
      
      if (cardIndex >= 0) {
        newCards[cardIndex] = { ...newCards[cardIndex], isFlipped: data.isFlipped };
      }
      
      return newCards;
    });
  };

  const handleCardsMatched = (data) => {
    const { cards: matchedCardIds, playerId, playerScore } = data;
    
    setCards(prevCards => {
      const newCards = [...prevCards];
      
      matchedCardIds.forEach(cardId => {
        const cardIndex = newCards.findIndex(c => c.id === cardId);
        if (cardIndex >= 0) {
          newCards[cardIndex] = { ...newCards[cardIndex], isMatched: true };
        }
      });
      
      return newCards;
    });
    
    // Update player score
    setPlayers(prevPlayers => {
      return prevPlayers.map(player => {
        if (player.userId === playerId) {
          return { ...player, score: playerScore };
        }
        return player;
      });
    });
    
    // Show toast for match
    if (playerId === user.id) {
      addToast('You found a match!', 'success');
    } else {
      const playerName = players.find(p => p.userId === playerId)?.username || 'Opponent';
      addToast(`${playerName} found a match!`, 'info');
    }
  };

  const handleCardsFlippedBack = (data) => {
    const { cards: flippedBackCardIds } = data;
    
    setCards(prevCards => {
      const newCards = [...prevCards];
      
      flippedBackCardIds.forEach(cardId => {
        const cardIndex = newCards.findIndex(c => c.id === cardId);
        if (cardIndex >= 0) {
          newCards[cardIndex] = { ...newCards[cardIndex], isFlipped: false };
        }
      });
      
      return newCards;
    });
  };

  const handleTurnChanged = (data) => {
    setCurrentTurn(data.playerId);
    
    if (data.playerId === user.id) {
      addToast('It\'s your turn!', 'info');
    }
  };

  const handleGameOver = (data) => {
    setGameStatus('completed');
    
    const winner = data.winner;
    if (winner.userId === user.id) {
      addToast('You won the game!', 'success');
    } else {
      addToast(`${winner.username} won the game!`, 'info');
    }
  };

  const handleError = (error) => {
    addToast(error.message || 'An error occurred', 'error');
  };

  const flipCard = (cardId) => {
    if (socket && currentTurn === user.id && gameStatus === 'playing') {
      socket.emit('flip-card', { cardId });
    } else if (gameStatus !== 'playing') {
      addToast('Game has not started yet', 'warning');
    } else if (currentTurn !== user.id) {
      addToast('It\'s not your turn', 'warning');
    }
  };

  const leaveGame = () => {
    if (socket) {
      socket.emit('leave-room');
    }
    navigate('/lobby');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={leaveGame}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Lobby
        </button>
        
        <div className="text-right">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Room: <span className="font-mono">{roomId}</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {gameStatus === 'waiting' && 'Waiting for players...'}
            {gameStatus === 'starting' && 'Game is starting...'}
            {gameStatus === 'playing' && `${players.find(p => p.userId === currentTurn)?.username}'s turn`}
            {gameStatus === 'completed' && 'Game completed'}
          </p>
        </div>
      </div>

      {/* Players */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {players.map(player => (
          <div 
            key={player.userId}
            className={`flex items-center p-4 rounded-lg ${currentTurn === player.userId ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-800'}`}
          >
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
              {player.avatar || player.username.charAt(0).toUpperCase()}
            </div>
            <div className="ml-4 flex-grow">
              <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                {player.username}
                {player.userId === user.id && (
                  <span className="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded">
                    You
                  </span>
                )}
                {currentTurn === player.userId && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded">
                    Current Turn
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Score: {player.score || 0} pairs
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Game Board */}
      {gameStatus === 'waiting' || gameStatus === 'starting' ? (
        <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <ClockIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            {gameStatus === 'waiting' ? 'Waiting for players...' : 'Game is starting...'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {gameStatus === 'waiting' ? 'The game will start when all players are ready.' : 'Get ready to play!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 sm:gap-4">
          {cards.map((card, index) => (
            <motion.div
              key={card.id || index}
              className={`aspect-square bg-white dark:bg-gray-700 rounded-lg shadow-md flex items-center justify-center text-4xl cursor-pointer ${card.isMatched ? 'opacity-50' : ''}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => !card.isFlipped && !card.isMatched && flipCard(card.id)}
            >
              {card.isFlipped || card.isMatched ? card.value : '?'}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Game;
