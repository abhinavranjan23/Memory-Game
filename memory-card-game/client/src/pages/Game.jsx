import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftIcon,
  ClockIcon,
  UserGroupIcon,
  PlayIcon,
  FireIcon,
  StarIcon,
  TrophyIcon,
  ChartBarIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  UserIcon,
  UsersIcon,
  XCircleIcon,
  ChatBubbleLeftIcon,
  PaperAirplaneIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import { useToast } from "../contexts/ToastContext";
import { useAudio } from "../hooks/useAudio";
import GameLoadingScreen from "../components/GameLoadingScreen";

const Game = () => {
  const { roomId } = useParams();
  const { socket, joinRoom } = useSocket();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Helper function to prevent duplicate toasts
  const addToastOnce = (message, type, key, timeout = 3000) => {
    const now = Date.now();
    const lastToast = toastDeduplication.current.get(key);

    if (!lastToast || now - lastToast > timeout) {
      addToast(message, type);
      toastDeduplication.current.set(key, now);
    }
  };
  const hasJoinedRef = useRef(false);
  const chatEndRef = useRef(null);

  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [gameStatus, setGameStatus] = useState("waiting");
  const [selectedCards, setSelectedCards] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [showGameResults, setShowGameResults] = useState(false);
  const [gameResults, setGameResults] = useState(null);
  const [powerUps, setPowerUps] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPeekActive, setIsPeekActive] = useState(false);
  const [powerUpHistory, setPowerUpHistory] = useState([]);
  const [showPowerUpTutorial, setShowPowerUpTutorial] = useState(false);
  const gameStartToastShown = useRef(false);
  const gamePausedToastShown = useRef(false);
  const gamePausedForCurrentState = useRef(false);
  const playerLeftToastShown = useRef(new Set());
  const playerJoinedToastShown = useRef(new Set());
  const toastDeduplication = useRef(new Map()); // Track recent toasts to prevent duplicates
  const [swapMode, setSwapMode] = useState(false);
  const [selectedCardsForSwap, setSelectedCardsForSwap] = useState([]);
  const [revealMode, setRevealMode] = useState(false);
  const [showPowerUpNotification, setShowPowerUpNotification] = useState(false);
  const [newPowerUp, setNewPowerUp] = useState(null);
  const [neverShowPowerUpTutorial, setNeverShowPowerUpTutorial] = useState(
    () => {
      localStorage.getItem("neverShowPowerUpTutorial") || false;
    }
  );

  // Floating chat state
  const [showFloatingChat, setShowFloatingChat] = useState(false);
  const [floatingChatPosition, setFloatingChatPosition] = useState({
    x: 20,
    y: 100,
  });
  const [isDraggingChat, setIsDraggingChat] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [latestMessage, setLatestMessage] = useState(null);
  const [showMessagePreview, setShowMessagePreview] = useState(false);

  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  // Audio hook for notification sounds
  const {
    playTurnNotification,
    playMatchFoundNotification,
    playGameCompletionNotification,
    playPowerUpNotification,
    playFlipCardNotification,
    playMessageNotification,
  } = useAudio();

  const toggleFloatingChat = () => {
    setShowFloatingChat(!showFloatingChat);
    if (!showFloatingChat) {
      setUnreadMessages(0); // Clear unread messages when opening
      setShowMessagePreview(false); // Hide message preview when opening chat
    }
  };

  const handleChatDragStart = (e) => {
    setIsDraggingChat(true);
    e.preventDefault();
  };

  const handleChatDrag = (e) => {
    if (!isDraggingChat) return;

    const touch = e.touches ? e.touches[0] : e;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.width / 2;
    const y = touch.clientY - rect.height / 2;

    // Constrain to screen bounds
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;

    setFloatingChatPosition({
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    });
  };

  const handleChatDragEnd = () => {
    setIsDraggingChat(false);
  };

  // Store all timers for proper cleanup
  const timersRef = useRef(new Set());

  // Helper function to add timers for cleanup
  const addTimer = (timer) => {
    timersRef.current.add(timer);
    return timer;
  };

  // Helper function to clear all timers
  const clearAllTimers = () => {
    timersRef.current.forEach((timer) => {
      clearTimeout(timer);
      clearInterval(timer);
    });
    timersRef.current.clear();
  };

  useEffect(() => {
    // Game component should not join the room - it should only listen for game events
    // The user should already be in the room when they navigate to the game

    hasJoinedRef.current = true;

    // Fallback: If we don't receive game state within 3 seconds, try to fetch it
    const fallbackTimer = addTimer(
      setTimeout(async () => {
        if (loading && socket) {
          console.log("Fallback: Requesting game state from server");
          socket.emit("get-game-state");
        }
      }, 3000)
    );

    // Emergency fallback: Set loading to false after 10 seconds to prevent infinite loading
    const emergencyTimer = addTimer(
      setTimeout(() => {
        if (loading) {
          console.log(
            "Emergency fallback: Setting loading to false after 10 seconds"
          );
          setLoading(false);
        }
      }, 10000)
    );

    return () => {
      clearAllTimers();
    };
  }, [roomId, loading, socket]);

  // Debug currentTurn changes
  useEffect(() => {
    console.log("currentTurn changed to:", currentTurn);
    console.log(
      "Available players:",
      players.map((p) => ({ userId: p.userId, username: p.username }))
    );
    console.log("Stack trace for currentTurn change:", new Error().stack);
  }, [currentTurn, players]);

  // Debug loading state changes
  useEffect(() => {
    console.log("Loading state changed to:", loading);
  }, [loading]);

  // Monitor game state validity
  useEffect(() => {
    // Check if currentTurn is valid (player exists)
    if (currentTurn && gameStatus === "playing") {
      const turnPlayerExists = players.some((p) => p.userId === currentTurn);
      if (!turnPlayerExists && players.length > 0) {
        // Only fix turn if we haven't recently received a turn-changed event
        const now = Date.now();
        const lastTurnChangedTime = window.lastTurnChangedTime || 0;
        const timeSinceTurnChanged = now - lastTurnChangedTime;

        if (timeSinceTurnChanged > 2000) {
          // 2 second protection
          console.log("Fixing turn - no recent turn-changed event");
          setCurrentTurn(players[0].userId);
          addToast(`Turn passed to ${players[0].username}`, "info");
        } else {
          console.log("Skipping turn fix - recent turn-changed event detected");
        }
      }
    }

    // Check if we have enough players to continue
    if (
      gameStatus === "playing" &&
      players.length < 2 &&
      !gamePausedForCurrentState.current
    ) {
      console.log("Not enough players to continue game - showing pause toast");
      // Don't override game status if game is already completed or in sudden death
      if (gameStatus !== "completed" && gameStatus !== "sudden-death") {
        setGameStatus("waiting");
      }

      gamePausedForCurrentState.current = true;
      gamePausedToastShown.current = true;

      // Reset the flags after a delay
      addTimer(
        setTimeout(() => {
          gamePausedToastShown.current = false;
          gamePausedForCurrentState.current = false;
        }, 5000)
      );
    }
  }, [currentTurn, players, gameStatus]);

  useEffect(() => {
    if (!socket) return;

    // Event handlers

    const handleGameState = (data) => {
      setLoading(false);

      setPlayers(data.players || []);

      // Preserve animation states when updating cards
      setCards((prevCards) => {
        const newBoard = data.gameState?.board || [];

        const updatedCards = newBoard.map((newCard) => {
          const existingCard = prevCards.find((c) => c.id === newCard.id);

          // Check if this card was recently involved in a swap (within last 1 second)
          const isRecentlySwapped =
            existingCard?.isSwapping ||
            (existingCard?.lastSwapTime &&
              Date.now() - existingCard.lastSwapTime < 1000);

          const updatedCard = {
            ...newCard,
            // Preserve animation states and values during animations
            isSwapping: existingCard?.isSwapping || false,
            isShuffling: existingCard?.isShuffling || false,
            isRevealed: existingCard?.isRevealed || false,
            revealedValue: existingCard?.revealedValue,
            lastSwapTime: existingCard?.lastSwapTime,
            // If card is currently swapping or recently swapped, preserve the updated values from the swap event
            value: isRecentlySwapped ? existingCard.value : newCard.value,
            theme: isRecentlySwapped ? existingCard.theme : newCard.theme,
          };

          return updatedCard;
        });

        return updatedCards;
      });

      // Only update currentTurn if we haven't recently received a turn-continue event
      // This prevents the game-state event from overriding the turn-continue event
      const now = Date.now();
      const lastTurnContinueTime = window.lastTurnContinueTime || 0;
      const lastTurnChangedTime = window.lastTurnChangedTime || 0;
      const timeSinceTurnContinue = now - lastTurnContinueTime;
      const timeSinceTurnChanged = now - lastTurnChangedTime;

      if (timeSinceTurnContinue > 1000 && timeSinceTurnChanged > 1000) {
        // Only update if no recent turn-continue or turn-changed events
        // Try multiple sources for currentTurn
        let newCurrentTurn = data.gameState?.currentTurn;

        // If currentTurn is not in gameState, try to find the player with isCurrentTurn = true
        if (!newCurrentTurn) {
          const currentTurnPlayer = data.players?.find((p) => p.isCurrentTurn);
          if (currentTurnPlayer) {
            newCurrentTurn = currentTurnPlayer.userId;
            console.log(
              "Found currentTurn from player.isCurrentTurn in game-state:",
              newCurrentTurn
            );
          }
        }

        // Fallback to first player if still no currentTurn
        if (!newCurrentTurn && data.players?.length > 0) {
          newCurrentTurn = data.players[0].userId;
          console.log(
            "Using fallback currentTurn (first player) in game-state:",
            newCurrentTurn
          );
        }

        if (newCurrentTurn && newCurrentTurn !== currentTurn) {
          console.log(
            `Updating currentTurn from game-state: ${currentTurn} -> ${newCurrentTurn}`
          );
          setCurrentTurn(newCurrentTurn);
        }
      } else {
        console.log(
          "Skipping currentTurn update due to recent turn-continue or turn-changed event"
        );
      }

      // Don't override game status if game is already completed, in sudden death, or if we're in a transitional state
      if (gameStatus !== "completed" && gameStatus !== "sudden-death") {
        const newStatus = data.gameState?.status || "waiting";

        // Don't set status to "waiting" if we're currently playing and have players
        // This prevents race conditions during player disconnect scenarios
        if (
          newStatus === "waiting" &&
          gameStatus === "playing" &&
          data.players?.length > 0
        ) {
          console.log(
            "Ignoring game-state status change to 'waiting' while game is playing with players"
          );
        } else {
          setGameStatus(newStatus);
        }
      }
      setTimeLeft(data.gameState?.timeLeft || 0);

      // Update power-ups for current user
      const currentPlayer = data.players?.find((p) => p.userId === user?.id);
      setPowerUps(currentPlayer?.powerUps || []);
    };

    const handleGameStarted = (data) => {
      // Set loading to false when game starts

      setLoading(false);

      setPlayers(data.players || []);
      setCards(data.gameState?.board || []);

      // Try multiple sources for currentTurn
      let newCurrentTurn = data.gameState?.currentTurn;

      // If currentTurn is not in gameState, try to find the player with isCurrentTurn = true
      if (!newCurrentTurn) {
        const currentTurnPlayer = data.players?.find((p) => p.isCurrentTurn);
        if (currentTurnPlayer) {
          newCurrentTurn = currentTurnPlayer.userId;
        }
      }

      // Fallback to first player if still no currentTurn
      if (!newCurrentTurn && data.players?.length > 0) {
        newCurrentTurn = data.players[0].userId;
      }

      console.log("Final currentTurn value:", newCurrentTurn);

      setCurrentTurn(newCurrentTurn);

      const newGameStatus = data.gameState?.status || "playing";

      // Don't override game status if game is already completed or in sudden death
      if (gameStatus !== "completed" && gameStatus !== "sudden-death") {
        setGameStatus(newGameStatus);
      }

      // Reset game start toast flag if game goes back to waiting
      if (newGameStatus === "waiting") {
        gameStartToastShown.current = false;
      }

      // Reset game paused toast flag if game goes back to playing
      if (newGameStatus === "playing") {
        gamePausedToastShown.current = false;
        gamePausedForCurrentState.current = false;
      }

      setSelectedCards([]); // Clear any selected cards

      // Only show toast if this is the first time the game is starting
      if (
        (newGameStatus === "playing" || newGameStatus === "sudden-death") &&
        !gameStartToastShown.current
      ) {
        addToastOnce("Game has started!", "success", "game-started");
        gameStartToastShown.current = true;
      }
    };

    const handlePlayerJoined = (data) => {
      setPlayers((prevPlayers) => {
        // Check if player already exists
        const existingPlayerIndex = prevPlayers.findIndex(
          (p) => p.userId === data.player.userId
        );

        if (existingPlayerIndex >= 0) {
          // Update existing player
          const newPlayers = [...prevPlayers];
          newPlayers[existingPlayerIndex] = {
            ...newPlayers[existingPlayerIndex],
            ...data.player,
          };
          return newPlayers;
        } else {
          // Add new player
          addToastOnce(
            `${data.player.username} joined the game!`,
            "success",
            `player-joined-${data.player.userId}`
          );
          return [...prevPlayers, data.player];
        }
      });

      // Only show toast for new players, not for reconnections
      if (
        !data.player.isReconnecting &&
        !playerJoinedToastShown.current.has(data.player.userId)
      ) {
        addToast(`${data.player.username} joined the game`, "info");
        playerJoinedToastShown.current.add(data.player.userId);

        // Clean up the toast tracking after a delay
        addTimer(
          setTimeout(() => {
            playerJoinedToastShown.current.delete(data.player.userId);
          }, 5000)
        );
      }
    };

    const handlePlayerLeft = (data) => {
      // Prevent duplicate toasts for the same player leaving
      const playerLeftKey = `${data.userId}-${Date.now()}`;

      if (playerLeftToastShown.current.has(data.userId)) {
        console.log(
          `🔍 CLIENT DEBUG: Duplicate player-left event detected for ${data.userId}, ignoring`
        );
        return; // Already shown toast for this player
      }

      playerLeftToastShown.current.add(data.userId);

      // Update players list
      setPlayers((prevPlayers) => {
        const updatedPlayers = prevPlayers.filter(
          (p) => p.userId !== data.userId
        );

        // If less than 2 players remain, let the server handle game completion
        if (
          updatedPlayers.length < 2 &&
          gameStatus === "playing" &&
          !gamePausedForCurrentState.current
        ) {
          console.log(
            "Not enough players to continue game - server will handle game completion"
          );

          // Don't set game status to waiting - let server handle completion
          // The server should emit game-over event when only one player remains

          gamePausedForCurrentState.current = true;
          gamePausedToastShown.current = true;

          // Reset the flags after a delay
          addTimer(
            setTimeout(() => {
              gamePausedToastShown.current = false;
              gamePausedForCurrentState.current = false;
            }, 5000)
          );

          // Show temporary message while server processes game completion
          if (
            updatedPlayers.length === 1 &&
            updatedPlayers[0].userId === user?.id
          ) {
            addToast("Processing game completion...", "info");
          }
        }

        return updatedPlayers;
      });

      addToastOnce(
        `${data.username} left the game`,
        "info",
        `player-left-${data.userId}`
      );

      // If the current turn player left, handle turn change
      if (currentTurn === data.userId) {
        const remainingPlayers = players.filter(
          (p) => p.userId !== data.userId
        );
        if (remainingPlayers.length > 0) {
          // Set turn to the next available player
          const nextPlayerIndex =
            (players.findIndex((p) => p.userId === data.userId) + 1) %
            remainingPlayers.length;
          setCurrentTurn(remainingPlayers[nextPlayerIndex].userId);
          addToast(
            `Turn passed to ${remainingPlayers[nextPlayerIndex].username}`,
            "info"
          );
        }
      }

      // Clean up the toast tracking after a delay
      addTimer(
        setTimeout(() => {
          playerLeftToastShown.current.delete(data.userId);
        }, 5000)
      );
    };

    const handleCardFlipped = (data) => {
      console.log("Card flipped:", data);
      setCards((prevCards) => {
        const newCards = [...prevCards];
        const cardIndex = newCards.findIndex((c) => c.id === data.cardId);

        if (cardIndex >= 0) {
          newCards[cardIndex] = {
            ...newCards[cardIndex],
            isFlipped: true,
          };
        }

        return newCards;
      });
    };

    const handleCardsMatched = (data) => {
      console.log("=== CARDS-MATCHED EVENT RECEIVED ===");
      console.log("Cards matched data:", data);
      console.log("Current user ID:", user?.id);
      console.log("Current game status:", gameStatus);
      console.log("Current cards state:", cards);

      // Check if the matched cards had power-ups
      const matchedCards = cards.filter((card) => data.cards.includes(card.id));
      console.log(
        "Matched cards with power-ups:",
        matchedCards.map((card) => ({
          id: card.id,
          value: card.value,
          powerUp: card.powerUp,
        }))
      );

      const {
        cards: matchedCardIds,
        playerId,
        playerScore,
        playerMatches,
      } = data;

      setCards((prevCards) => {
        const newCards = [...prevCards];

        matchedCardIds.forEach((cardId) => {
          const cardIndex = newCards.findIndex((c) => c.id === cardId);
          if (cardIndex >= 0) {
            newCards[cardIndex] = {
              ...newCards[cardIndex],
              isMatched: true,
              isFlipped: true,
            };
          }
        });

        return newCards;
      });

      // Update player score and matches
      setPlayers((prevPlayers) => {
        return prevPlayers.map((player) => {
          if (player.userId === playerId) {
            return {
              ...player,
              score: playerScore,
              matches: playerMatches,
            };
          }
          return player;
        });
      });

      // Clear selected cards after match
      setSelectedCards([]);

      // Show toast for match
      if (playerId === user?.id) {
        // Check if this is sudden death mode
        if (gameStatus === "sudden-death") {
          addToast("🎯 You found the final pair! You win!", "success");
        } else {
          addToast("You found a match!", "success");
        }
        playMatchFoundNotification(); // Play match found notification sound
      } else {
        const playerName =
          players.find((p) => p.userId === playerId)?.username || "Opponent";
        // Check if this is sudden death mode
        if (gameStatus === "sudden-death") {
          addToast(`${playerName} found the final pair! They win!`, "info");
        } else {
          addToast(`${playerName} found a match!`, "info");
        }
      }
    };

    const handleCardsFlippedBack = (data) => {
      console.log("Cards flipped back:", data);
      const { cards: flippedBackCardIds } = data;

      setCards((prevCards) => {
        const newCards = [...prevCards];

        flippedBackCardIds.forEach((cardId) => {
          const cardIndex = newCards.findIndex((c) => c.id === cardId);
          if (cardIndex >= 0) {
            newCards[cardIndex] = { ...newCards[cardIndex], isFlipped: false };
          }
        });

        return newCards;
      });

      // Clear selected cards after cards are flipped back
      setSelectedCards([]);
    };

    const handleTurnChanged = (data) => {
      console.log("=== TURN CHANGED EVENT RECEIVED ===");
      console.log("Turn changed event received:", data);
      console.log("Setting currentTurn to:", data.playerId);
      console.log("Previous currentTurn was:", currentTurn);
      console.log("Current user ID:", user?.id);
      console.log("Is this turn for current user?", data.playerId === user?.id);
      console.log("Event timestamp:", Date.now());
      console.log("Previous player ID:", data.previousPlayerId);

      console.log("About to call setCurrentTurn with:", data.playerId);
      setCurrentTurn(data.playerId);
      console.log("setCurrentTurn called");

      // Set timestamp to prevent game-state from overriding this turn change
      window.lastTurnChangedTime = Date.now();
      console.log("Set lastTurnChangedTime to:", window.lastTurnChangedTime);

      if (data.playerId === user?.id) {
        console.log("Turn switched to current user");
        addToast("🎯 It's your turn!", "success");
        playTurnNotification(); // Play turn notification sound
      } else {
        // Check if this turn change was due to using the last extra turn
        const previousPlayer = data.previousPlayerId;
        if (previousPlayer === user?.id) {
          console.log(
            "Turn changed from current user to another player - extra turns finished"
          );
          addToast(
            "⏰ Your turns are finished. Turn passed to next player.",
            "warning"
          );
        } else {
          // General turn switch notification
          const nextPlayer = players.find((p) => p.userId === data.playerId);
          if (nextPlayer) {
            console.log("Turn switched to:", nextPlayer.username);
            addToast(`🎯 Turn switched to ${nextPlayer.username}`, "info");
          } else {
            console.log("Turn switched to unknown player");
            addToast("🎯 Turn switched to next player", "info");
          }
        }
      }
    };

    const handleTurnContinue = (data) => {
      console.log("=== TURN CONTINUE EVENT RECEIVED ===");
      console.log("Turn continue event received:", data);
      console.log("Setting currentTurn to:", data.currentPlayer);
      console.log("Previous currentTurn was:", currentTurn);
      console.log("Reason:", data.reason);
      console.log("Remaining extra turns:", data.remainingExtraTurns);

      // Only keep the same player's turn active if they still have extra turns
      // If remainingExtraTurns is 0, don't set the turn - wait for turn-changed event
      if (data.remainingExtraTurns > 0) {
        console.log("About to call setCurrentTurn with:", data.currentPlayer);
        setCurrentTurn(data.currentPlayer);
        console.log("setCurrentTurn called in handleTurnContinue");

        // Set timestamp to prevent game-state from overriding this turn
        window.lastTurnContinueTime = Date.now();
        console.log(
          "Set lastTurnContinueTime to:",
          window.lastTurnContinueTime
        );
      } else {
        console.log(
          "No extra turns remaining - not setting current turn, waiting for turn-changed event"
        );
      }

      if (data.currentPlayer === user?.id) {
        if (data.reason === "extra_turn_used") {
          console.log(
            "Extra turn used - remaining extra turns:",
            data.remainingExtraTurns
          );
          if (data.remainingExtraTurns > 0) {
            addToast(`🎯 Extra turn used! `, "info");
          } else {
            addToast("🎯 Extra turn used!", "info");
          }
        } else if (data.reason === "extra_turn_powerup_used") {
          addToast(`Extra turn power-up activated!`, "success");
        } else if (data.reason === "match_found") {
          addToast(`Great match! You get another turn!`, "success");
        } else if (data.reason === "powerup_used") {
          addToast(`Power-up used!`, "info");
        } else {
          addToast("Great match! You get another turn!", "success");
        }
      }
    };

    const handleGameOver = (data) => {
      setGameStatus("completed");
      setGameResults(data);
      setShowGameResults(true);

      // Show appropriate toast based on whether user is a winner
      const isUserWinner = data.winners?.some((w) => w.userId === user?.id);
      if (data.winners && data.winners.length > 0) {
        if (isUserWinner) {
          addToast("🎉 Congratulations! You won the game! 🎉", "success");
        } else {
          addToast(
            "Game Over! Thanks for playing! Better luck next time!",
            "info"
          );
        }
        playGameCompletionNotification(); // Play game completion notification sound
      } else {
        // No winners (e.g., Blitz mode timeout with no matches)
        if (data.reason === "timeout" || data.reason === "blitz_timeout") {
          addToast("⏰ Time's up! No one found any matches.", "info");
        } else if (data.reason === "sudden_death_timeout") {
          addToast("⚡ Sudden Death timeout! No winner this round.", "info");
        } else {
          addToast("Game ended! No winners this round.", "info");
        }
      }
    };

    const handleSuddenDeath = (data) => {
      setCards(data.gameState.board || []);
      setGameStatus("sudden-death");

      // Update players and current turn from the sudden death data
      if (data.players) {
        setPlayers(data.players);
        // Find the player whose turn it is
        const currentTurnPlayer = data.players.find((p) => p.isCurrentTurn);
        if (currentTurnPlayer) {
          setCurrentTurn(currentTurnPlayer.userId);
          console.log(
            "Sudden death: Set current turn to:",
            currentTurnPlayer.userId
          );
        } else if (data.players.length > 0) {
          // Fallback: set to first player if no current turn is set
          setCurrentTurn(data.players[0].userId);
          console.log(
            "Sudden death: Fallback - set current turn to first player:",
            data.players[0].userId
          );
        }
      }

      addToast(
        "⚡ Sudden Death Mode! Find the last pair to win! ⚡",
        "warning"
      );
    };

    const handleChatMessage = (data) => {
      setChatMessages((prev) => [...prev, data]);

      // Play message notification sound for new messages from other users
      if (data.userId !== user?.id) {
        // Don't play sound for own messages
        playMessageNotification();

        // Increment unread messages if chat is not open (mobile only) - only for other users' messages
        if (!showFloatingChat && window.innerWidth < 1024) {
          setUnreadMessages((prev) => prev + 1);
        }

        // Show message preview for messages from other users
        setLatestMessage(data);
        setShowMessagePreview(true);

        // Hide preview after 5 seconds
        addTimer(
          setTimeout(() => {
            setShowMessagePreview(false);
          }, 5000)
        );
      }

      // Scroll to bottom of chat
      addTimer(
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100)
      );
    };

    const handleError = (error) => {
      console.error("Socket error:", error);

      // Handle specific error cases
      if (error.message?.includes("room") || error.message?.includes("game")) {
        addToast("Game room error. Redirecting to lobby...", "error");
        addTimer(
          setTimeout(() => {
            navigate("/lobby");
          }, 2000)
        );
      } else if (error.message?.includes("connection")) {
        addToast("Connection lost. Attempting to reconnect...", "error");
        // The socket will automatically attempt to reconnect
      } else {
        addToast(error.message || "An error occurred", "error");
      }
    };

    const handleTimeUpdate = (data) => {
      setTimeLeft(data.timeLeft);
    };

    const handlePowerUpUsed = (data) => {
      if (data.playerId === user?.id) {
        setPowerUps(data.remainingPowerUps || []);
        addToast(`Used ${data.powerUpType} power-up!`, "success");
      }

      // Add to power-up history
      const playerName =
        players.find((p) => p.userId === data.playerId)?.username || "Unknown";
      setPowerUpHistory((prev) => [
        {
          id: Date.now(),
          playerName,
          powerUpType: data.powerUpType,
          timestamp: new Date(),
        },
        ...prev.slice(0, 4), // Keep only last 5 entries
      ]);
    };

    const handlePowerUpCollected = (data) => {
      console.log("Power-up collected by another player:", data);
      // Show toast notification for other players when someone collects a power-up
      if (data.playerId !== user?.id) {
        addToast(
          `${data.playerName} collected ${data.powerUpIcon} ${data.powerUpName}!`,
          "info"
        );
      }
    };

    const handlePowerUpUsedNotification = (data) => {
      console.log("Power-up used notification:", data);
      // Add power-up usage to chat instead of showing toast notification
      if (data.playerId !== user?.id) {
        // Add to chat messages
        const newMessage = {
          id: Date.now(),
          userId: data.playerId,
          username: data.playerName,
          message: `used ${data.powerUpIcon} ${data.powerUpName}`,
          timestamp: new Date(),
          type: "powerup",
        };
        setChatMessages((prev) => [...prev, newMessage]);
      }
    };

    const handlePowerUpUpdate = (data) => {
      console.log("=== POWER-UP UPDATE RECEIVED ===");
      console.log("Power-up update data:", data);
      console.log("Current user ID:", user?.id);
      console.log("Data player ID:", data.playerId);
      console.log("Previous power-ups count:", powerUps.length);
      console.log("New power-ups count:", data.powerUps?.length || 0);

      if (data.playerId === user?.id) {
        const previousPowerUps = powerUps.length;
        setPowerUps(data.powerUps || []);
        console.log("Updated power-ups state:", data.powerUps);

        if (data.newPowerUp) {
          console.log("New power-up received:", data.newPowerUp);

          // Show power-up notification (only notification, not manual)
          setNewPowerUp(data.newPowerUp);
          setShowPowerUpNotification(true);

          // Play power-up notification sound
          playPowerUpNotification();

          // Hide notification after 3 seconds
          addTimer(
            setTimeout(() => {
              setShowPowerUpNotification(false);
              setNewPowerUp(null);
            }, 3000)
          );

          // No toast notifications for power-ups
        }
        // No automatic tutorial opening - manual only opens when clicked
      } else {
        console.log("Power-up update not for current user");
      }
    };

    const handlePowerUpPeek = (data) => {
      // Only show peek effect to the user who used it
      if (data.targetUserId === user?.id) {
        setIsPeekActive(true);
        addTimer(
          setTimeout(() => setIsPeekActive(false), data.duration || 3000)
        );
        addToast(
          "Peek power-up activated! All cards revealed for 3 seconds!",
          "info"
        );
      } else {
        // Show a toast to other players that someone used peek
        const playerName =
          players.find((p) => p.userId === data.playerId)?.username ||
          "A player";
        addToast(`${playerName} used a peek power-up!`, "info");
      }
    };

    const handlePowerUpSwap = (data) => {
      console.log("=== SWAP POWER-UP EVENT RECEIVED ===");
      console.log("Swap power-up data received:", data);
      console.log(
        "Current cards state before swap:",
        cards.map((c) => ({ id: c.id, value: c.value, theme: c.theme }))
      );
      console.log(
        "Card1 ID:",
        data.card1Id,
        "New value:",
        data.card1Value,
        "New theme:",
        data.card1Theme
      );
      console.log(
        "Card2 ID:",
        data.card2Id,
        "New value:",
        data.card2Value,
        "New theme:",
        data.card2Theme
      );

      setCards((prevCards) => {
        const newCards = [...prevCards];
        const card1Index = newCards.findIndex((c) => c.id === data.card1Id);
        const card2Index = newCards.findIndex((c) => c.id === data.card2Id);

        console.log(
          "Found card1 at index:",
          card1Index,
          "Found card2 at index:",
          card2Index
        );

        if (card1Index >= 0 && card2Index >= 0) {
          console.log(
            "Before swap - Card1 value:",
            newCards[card1Index].value,
            "Card2 value:",
            newCards[card2Index].value
          );

          // Use the values from server to ensure consistency
          const swapTime = Date.now();
          newCards[card1Index] = {
            ...newCards[card1Index],
            value: data.card1Value,
            theme: data.card1Theme,
            isSwapping: true,
            lastSwapTime: swapTime,
          };
          newCards[card2Index] = {
            ...newCards[card2Index],
            value: data.card2Value,
            theme: data.card2Theme,
            isSwapping: true,
            lastSwapTime: swapTime,
          };

          console.log(
            "After swap - Card1 value:",
            newCards[card1Index].value,
            "Card2 value:",
            newCards[card2Index].value
          );
          console.log(
            "Updated cards state after swap:",
            newCards.map((c) => ({
              id: c.id,
              value: c.value,
              theme: c.theme,
              isSwapping: c.isSwapping,
            }))
          );

          // Remove animation state after animation completes
          addTimer(
            setTimeout(() => {
              setCards((currentCards) => {
                const updatedCards = [...currentCards];
                const currentCard1Index = updatedCards.findIndex(
                  (c) => c.id === data.card1Id
                );
                const currentCard2Index = updatedCards.findIndex(
                  (c) => c.id === data.card2Id
                );

                if (currentCard1Index >= 0) {
                  updatedCards[currentCard1Index] = {
                    ...updatedCards[currentCard1Index],
                    isSwapping: false,
                    lastSwapTime: null,
                  };
                }
                if (currentCard2Index >= 0) {
                  updatedCards[currentCard2Index] = {
                    ...updatedCards[currentCard2Index],
                    isSwapping: false,
                    lastSwapTime: null,
                  };
                }

                console.log(
                  "Animation completed, final cards state:",
                  updatedCards.map((c) => ({
                    id: c.id,
                    value: c.value,
                    theme: c.theme,
                    isSwapping: c.isSwapping,
                  }))
                );

                return updatedCards;
              });
            }, 500)
          ); // Animation duration
        } else {
          console.error("Could not find cards for swap:", {
            card1Index,
            card2Index,
            card1Id: data.card1Id,
            card2Id: data.card2Id,
          });
        }

        return newCards;
      });

      // Show toast with animation indication
      addTimer(
        setTimeout(() => {
          addToast("🔄 Cards swapped ", "info");
        }, 100)
      );
    };

    const handlePowerUpReveal = (data) => {
      console.log("Reveal power-up data received:", data);
      console.log("Current cards state before update:", cards);

      // Only show reveal effect to the user who used it
      if (data.targetUserId === user?.id) {
        setCards((prevCards) => {
          const newCards = [...prevCards];
          const cardIndex = newCards.findIndex((c) => c.id === data.cardId);
          console.log(
            "Found card at index:",
            cardIndex,
            "Card ID:",
            data.cardId
          );

          if (cardIndex >= 0) {
            const originalCard = newCards[cardIndex];
            console.log("Original card:", originalCard);

            // Temporarily show the card value for 3 seconds
            newCards[cardIndex] = {
              ...originalCard,
              isRevealed: true,
              revealedValue: data.value, // Store the revealed value
            };
            console.log("Updated card:", newCards[cardIndex]);
            console.log("All cards after update:", newCards);

            // Hide it after 3 seconds
            addTimer(
              setTimeout(() => {
                console.log("Hiding revealed card after 3 seconds");
                setCards((currentCards) => {
                  const updatedCards = [...currentCards];
                  const currentCardIndex = updatedCards.findIndex(
                    (c) => c.id === data.cardId
                  );
                  if (currentCardIndex >= 0) {
                    updatedCards[currentCardIndex] = {
                      ...updatedCards[currentCardIndex],
                      isRevealed: false,
                      revealedValue: null,
                    };
                    console.log("Card hidden:", updatedCards[currentCardIndex]);
                  }
                  return updatedCards;
                });
              }, 3000)
            );
          } else {
            console.error("Card not found for reveal:", data.cardId);
          }
          return newCards;
        });
        addToast("Card revealed for 3 seconds!", "info");
      } else {
        // Show a toast to other players that someone used reveal
        const playerName =
          players.find((p) => p.userId === data.playerId)?.username ||
          "A player";
        addToast(`${playerName} used a reveal power-up!`, "info");
      }
    };

    const handlePowerUpFreeze = (data) => {
      // Only show freeze effect to the user who used it
      if (data.targetUserId === user?.id) {
        addToast("❄️ Time frozen for 10 seconds!", "info");

        // Add visual indication that timer is frozen
        const timerElement = document.querySelector(".timer-frozen");
        if (timerElement) {
          timerElement.classList.add("frozen");
          addTimer(
            setTimeout(() => {
              timerElement.classList.remove("frozen");
            }, 10000)
          );
        }
      } else {
        // Show a toast to other players that someone used freeze
        const playerName =
          players.find((p) => p.userId === data.playerId)?.username ||
          "A player";
        addToast(`${playerName} used a freeze power-up!`, "info");
      }
    };

    const handlePowerUpShuffle = (data) => {
      console.log("Shuffle power-up data received:", data);
      console.log("Shuffled board data:", data.board);

      // Add shuffle animation state to all cards
      setCards((prevCards) => {
        const newCards = prevCards.map((card) => ({
          ...card,
          isShuffling: true,
        }));
        console.log("Added shuffle animation to all cards");
        return newCards;
      });

      // After animation, update with shuffled board
      addTimer(
        setTimeout(() => {
          if (data.board) {
            console.log(
              "Updating cards with shuffled board:",
              data.board.map((c) => ({
                id: c.id,
                value: c.value,
                theme: c.theme,
              }))
            );
            setCards(
              data.board.map((card) => ({
                ...card,
                isShuffling: false,
              }))
            );
            addTimer(
              setTimeout(() => {
                addToast("🔄 Cards shuffled ", "info");
              }, 100)
            );
          } else {
            console.log(
              "No board data received, falling back to game state refresh"
            );
            // Fallback: force a refresh of the game state
            if (socket) {
              socket.emit("get-game-state");
            }
            addTimer(
              setTimeout(() => {
                addToast("🔄 Cards shuffled ", "info");
              }, 100)
            );
          }
        }, 800)
      ); // Shuffle animation duration
    };

    const handlePowerUpExtraTurn = (data) => {
      addToast(
        "Extra turn power-up activated! You'll get another turn after this one!",
        "success"
      );
    };

    const handlePlayerEliminated = (data) => {
      setPlayers((prevPlayers) =>
        prevPlayers.filter((p) => p.userId !== data.playerId)
      );
      addToast(`${data.username} was eliminated!`, "warning");
    };

    // Register event listeners
    console.log("Registering socket event listeners");
    console.log("Socket connected:", socket.connected);
    console.log("Socket ID:", socket.id);
    console.log("Will listen for turn-changed and turn-continue events");

    // Clear any existing listeners first to prevent duplicates
    socket.off("game-state", handleGameState);
    socket.off("game-started", handleGameStarted);
    socket.off("player-joined", handlePlayerJoined);
    socket.off("player-left", handlePlayerLeft);
    socket.off("card-flipped", handleCardFlipped);
    socket.off("cards-matched", handleCardsMatched);
    socket.off("cards-flipped-back", handleCardsFlippedBack);
    socket.off("turn-changed", handleTurnChanged);
    socket.off("turn-continue", handleTurnContinue);
    socket.off("game-over", handleGameOver);
    socket.off("sudden-death-triggered", handleSuddenDeath);
    socket.off("chat-message", handleChatMessage);
    socket.off("error", handleError);
    socket.off("time-update", handleTimeUpdate);
    socket.off("power-up-used", handlePowerUpUsed);
    socket.off("power-up-update", handlePowerUpUpdate);
    socket.off("powerup-peek", handlePowerUpPeek);
    socket.off("powerup-swap", handlePowerUpSwap);
    socket.off("powerup-reveal", handlePowerUpReveal);
    socket.off("powerup-freeze", handlePowerUpFreeze);
    socket.off("powerup-shuffle", handlePowerUpShuffle);
    socket.off("powerup-extra-turn", handlePowerUpExtraTurn);
    socket.off("player-eliminated", handlePlayerEliminated);

    socket.on("game-state", handleGameState);
    socket.on("game-started", handleGameStarted);

    // Debug: Test if we can emit and receive events
    console.log("Testing socket connection by emitting test event");
    socket.emit("get-game-state");

    // Add a timeout to check if game-started event is received
    const gameStartedTimeout = addTimer(
      setTimeout(() => {
        console.log("TIMEOUT: Checking if game-started event was received");
        console.log("Current gameStatus:", gameStatus);
        console.log("Current currentTurn:", currentTurn);
        console.log("Current players:", players);

        if (gameStatus === "waiting" && players.length >= 2) {
          console.log(
            "WARNING: Game should have started but game-started event not received"
          );
          console.log("Attempting to manually set currentTurn to first player");
          if (players.length > 0) {
            setCurrentTurn(players[0].userId);
            // Don't override game status if game is already completed or in sudden death
            if (gameStatus !== "completed" && gameStatus !== "sudden-death") {
              setGameStatus("playing");
            }
          }
        }

        // Additional check: if gameStatus is "playing" but currentTurn is null
        if (gameStatus === "playing" && !currentTurn && players.length > 0) {
          console.log(
            "WARNING: Game is playing but currentTurn is null, setting to first player"
          );
          setCurrentTurn(players[0].userId);
        }
      }, 5000)
    ); // 5 second timeout
    socket.on("player-joined", handlePlayerJoined);
    socket.on("player-left", handlePlayerLeft);
    socket.on("card-flipped", handleCardFlipped);
    socket.on("cards-matched", handleCardsMatched);
    socket.on("cards-flipped-back", handleCardsFlippedBack);
    socket.on("turn-changed", handleTurnChanged);
    socket.on("turn-continue", handleTurnContinue);
    socket.on("game-over", handleGameOver);
    socket.on("sudden-death-triggered", handleSuddenDeath);
    socket.on("chat-message", handleChatMessage);
    socket.on("error", handleError);
    socket.on("time-update", handleTimeUpdate);
    socket.on("power-up-used", handlePowerUpUsed);
    socket.on("power-up-update", handlePowerUpUpdate);
    socket.on("power-up-collected", handlePowerUpCollected);
    socket.on("power-up-used-notification", handlePowerUpUsedNotification);
    socket.on("powerup-peek", handlePowerUpPeek);
    socket.on("powerup-swap", handlePowerUpSwap);
    socket.on("powerup-reveal", handlePowerUpReveal);
    socket.on("powerup-freeze", handlePowerUpFreeze);
    socket.on("powerup-shuffle", handlePowerUpShuffle);
    socket.on("powerup-extra-turn", handlePowerUpExtraTurn);
    socket.on("player-eliminated", handlePlayerEliminated);
    console.log("Turn event listeners registered successfully");
    console.log("Listening for events: turn-changed, turn-continue");

    // Cleanup function
    return () => {
      clearAllTimers();
      gameStartToastShown.current = false;
      gamePausedToastShown.current = false;
      gamePausedForCurrentState.current = false;
      playerLeftToastShown.current.clear();
      playerJoinedToastShown.current.clear();

      // Audio cleanup is now handled by the useAudio hook

      socket.off("game-state", handleGameState);
      socket.off("game-started", handleGameStarted);
      socket.off("player-joined", handlePlayerJoined);
      socket.off("player-left", handlePlayerLeft);
      socket.off("card-flipped", handleCardFlipped);
      socket.off("cards-matched", handleCardsMatched);
      socket.off("cards-flipped-back", handleCardsFlippedBack);
      socket.off("turn-changed", handleTurnChanged);
      socket.off("turn-continue", handleTurnContinue);
      socket.off("game-over", handleGameOver);
      socket.off("sudden-death-triggered", handleSuddenDeath);
      socket.off("chat-message", handleChatMessage);
      socket.off("error", handleError);
      socket.off("time-update", handleTimeUpdate);
      socket.off("power-up-used", handlePowerUpUsed);
      socket.off("power-up-update", handlePowerUpUpdate);
      socket.off("power-up-collected", handlePowerUpCollected);
      socket.off("power-up-used-notification", handlePowerUpUsedNotification);
      socket.off("powerup-peek", handlePowerUpPeek);
      socket.off("powerup-swap", handlePowerUpSwap);
      socket.off("powerup-reveal", handlePowerUpReveal);
      socket.off("powerup-freeze", handlePowerUpFreeze);
      socket.off("powerup-shuffle", handlePowerUpShuffle);
      socket.off("powerup-extra-turn", handlePowerUpExtraTurn);
      socket.off("player-eliminated", handlePlayerEliminated);
    };
  }, [socket, user?.id]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (gameStatus !== "completed" && gameStatus !== "waiting") {
        e.preventDefault();
        e.returnValue =
          "Are you sure you want to leave? You will lose your progress and points!";
        return e.returnValue;
      }
    };

    const handlePopState = (e) => {
      console.log("🔍 PopState event triggered", {
        gameStatus,
        currentPath: window.location.pathname,
      });

      // Only show warning if game is active
      if (gameStatus !== "completed" && gameStatus !== "waiting") {
        console.log("🔍 Game is active, preventing navigation");

        // Prevent the default navigation
        e.preventDefault();

        // Show our custom warning popup
        handleLeaveAttempt(window.location.pathname);

        // Push the current state back to prevent navigation
        window.history.pushState(null, "", window.location.pathname);

        // Also try to prevent React Router navigation
        return false;
      }
    };

    // Add event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    // Also listen for React Router navigation attempts
    const unblock = navigate((location, action) => {
      console.log("🔍 React Router navigation attempt", {
        action,
        location,
        gameStatus,
      });

      if (
        action === "POP" &&
        gameStatus !== "completed" &&
        gameStatus !== "waiting"
      ) {
        console.log("🔍 Blocking React Router POP navigation");

        // Show warning popup
        handleLeaveAttempt(location.pathname);

        // Block the navigation
        return false;
      }
    });

    // Cleanup
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      if (unblock) unblock();
    };
  }, [gameStatus, navigate]);

  const flipCard = (cardId) => {
    if (!socket || !user) return;

    // If in swap mode, handle card selection for swap
    if (swapMode) {
      handleCardSelectionForSwap(cardId);
      return;
    }

    // If in reveal mode, handle card selection for reveal
    if (revealMode) {
      handleCardSelectionForReveal(cardId);
      return;
    }

    console.log(
      "Attempting to flip card:",
      cardId,
      "Current turn:",
      currentTurn,
      "User ID:",
      user.id,
      "Game status:",
      gameStatus
    );

    if (currentTurn !== user.id) {
      console.log("Turn validation failed - not user's turn");
      addToast("It's not your turn", "warning");
      return;
    }

    if (gameStatus !== "playing" && gameStatus !== "sudden-death") {
      addToast("Game has not started yet", "warning");
      return;
    }

    // Check if card is already flipped, matched, or revealed
    const card = cards.find((c) => c.id === cardId);
    if (card?.isFlipped || card?.isMatched || card?.isRevealed) {
      console.log("Card cannot be flipped:", card);
      return;
    }

    // Check if we can flip more cards (max 2)
    const currentlyFlipped = cards.filter(
      (c) => c.isFlipped && !c.isMatched
    ).length;
    if (currentlyFlipped >= 2) {
      addToast("You can only flip 2 cards at a time", "warning");
      return;
    }

    console.log(
      "Flipping card:",
      cardId,
      "Currently flipped:",
      currentlyFlipped
    );

    // Add card to selected cards
    setSelectedCards((prev) => [...prev, cardId]);

    // Play flip card notification sound
    playFlipCardNotification();

    // Emit flip card event
    socket.emit("flip-card", { cardId });
  };

  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;

    socket.emit("send-chat", { message: chatInput.trim() });
    setChatInput("");
  };

  const usePowerUp = (powerUpType, target = null) => {
    if (!socket || !user) return;

    console.log("Sending power-up event:", { powerUpType, target });
    console.log("Socket connected:", socket.connected);
    console.log("Socket ID:", socket.id);
    socket.emit("use-powerup", { powerUpType, target });

    // Add a callback to check if the event was sent
    socket.on("connect", () => {
      console.log("Socket connected, event should be sent");
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });
  };

  const handlePowerUpClick = (powerUp) => {
    console.log("Power-up clicked:", powerUp);
    console.log("Current powerUps state:", powerUps);
    console.log("Current user ID:", user?.id);

    // Check if power-up requires targeting
    if (powerUp.type === "swap") {
      setSwapMode(true);
      setSelectedCardsForSwap([]);
      addToast("Select two cards to swap", "info");
    } else if (powerUp.type === "revealOne") {
      setRevealMode(true);
      addToast("Select a card to reveal", "info");
    } else {
      console.log("Using non-targeting power-up:", powerUp.type);
      usePowerUp(powerUp.type);
    }
  };

  const handleCardSelectionForSwap = (cardId) => {
    const card = cards.find((c) => c.id === cardId);

    // Don't allow selecting matched cards
    if (card?.isMatched) {
      addToast("Cannot swap matched cards", "warning");
      return;
    }

    // Don't allow selecting the same card twice
    if (selectedCardsForSwap.includes(cardId)) {
      addToast("Card already selected", "warning");
      return;
    }

    const newSelectedCards = [...selectedCardsForSwap, cardId];
    setSelectedCardsForSwap(newSelectedCards);

    if (newSelectedCards.length === 2) {
      // Execute the swap with proper target format
      usePowerUp("swap", {
        card1Id: newSelectedCards[0],
        card2Id: newSelectedCards[1],
      });

      // Reset swap mode
      setSwapMode(false);
      setSelectedCardsForSwap([]);
    } else {
      addToast(`Selected card ${newSelectedCards.length}/2`, "info");
    }
  };

  const cancelSwapMode = () => {
    setSwapMode(false);
    setSelectedCardsForSwap([]);
    addToast("Swap cancelled", "info");
  };

  const handleCardSelectionForReveal = (cardId) => {
    const card = cards.find((c) => c.id === cardId);

    // Don't allow selecting matched cards
    if (card?.isMatched) {
      addToast("Cannot reveal matched cards", "warning");
      return;
    }

    // Don't allow selecting already flipped cards
    if (card?.isFlipped) {
      addToast("Card is already flipped", "warning");
      return;
    }

    // Execute the reveal
    usePowerUp("revealOne", { cardId });

    // Reset reveal mode
    setRevealMode(false);
    addToast("Card revealed!", "success");
  };

  const cancelRevealMode = () => {
    setRevealMode(false);
    addToast("Reveal cancelled", "info");
  };

  const getPowerUpButtonStyle = (powerUpType) => {
    const styles = {
      extraTurn:
        "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700",
      peek: "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700",
      swap: "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700",
      revealOne:
        "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700",
      freeze:
        "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700",
      shuffle:
        "bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:from-pink-600 hover:to-pink-700",
    };
    return (
      styles[powerUpType] ||
      "bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:from-gray-600 hover:to-gray-700"
    );
  };

  const getPowerUpTooltip = (powerUpType) => {
    const tooltips = {
      extraTurn: "Get an additional turn after a miss - Perfect for recovery!",
      peek: "Reveal all cards for 3 seconds - Great for memorizing positions!",
      swap: "Swap the positions of two cards - Create favorable layouts!",
      revealOne: "Reveal one card for 3 seconds - Break deadlocks!",
      freeze: "Freeze the timer for 10 seconds - Essential in Blitz mode!",
      shuffle: "Shuffle all unmatched cards - Reset when stuck!",
    };
    return tooltips[powerUpType] || "Use this power-up";
  };

  const getPowerUpStrategy = () => {
    const strategies = [
      "Save power-ups for crucial moments",
      "Use Peek when you need to remember card positions",
      "Use Swap to create favorable layouts",
      "Time Freeze is valuable in Blitz mode",
    ];
    return strategies[Math.floor(Math.random() * strategies.length)];
  };

  const handleLeaveAttempt = (navigationTarget = "/lobby") => {
    setPendingNavigation(navigationTarget);
    setShowLeaveWarning(true);
  };

  const confirmLeave = () => {
    setShowLeaveWarning(false);
    if (pendingNavigation) {
      // Call the original leaveGame function
      if (socket) {
        socket.emit("leave-room");
      }
      navigate(pendingNavigation);
    }
  };

  const cancelLeave = () => {
    setShowLeaveWarning(false);
    setPendingNavigation(null);
  };

  const leaveGame = () => {
    handleLeaveAttempt("/lobby");
  };
  const handleNeverShowPowerUpTutorial = () => {
    setNeverShowPowerUpTutorial(true);
  };

  if (loading) {
    return <GameLoadingScreen />;
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <style>
        {`
          .timer-frozen.frozen .font-mono {
            color: #3b82f6 !important;
            text-shadow: 0 0 10px #3b82f6;
            animation: freeze-pulse 2s ease-in-out infinite;
          }
          
          @keyframes freeze-pulse {
            0%, 100% { 
              filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.5));
              transform: scale(1);
            }
            50% { 
              filter: drop-shadow(0 0 15px rgba(59, 130, 246, 0.8));
              transform: scale(1.05);
            }
          }
          
          .timer-frozen.frozen .h-4.w-4 {
            color: #3b82f6 !important;
            animation: freeze-pulse 2s ease-in-out infinite;
          }
        `}
      </style>
      <div className='max-w-7xl mx-auto px-4 py-8'>
        {/* Enhanced Header */}
        <div className='mb-6'>
          {/* Top Navigation Bar */}
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4'>
            <motion.button
              onClick={() => handleLeaveAttempt("/lobby")}
              className='flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-600'
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ArrowLeftIcon className='h-5 w-5' />
              <span className='font-medium'>Back to Lobby</span>
            </motion.button>

            <div className='text-center sm:text-right'>
              <div className='flex items-center justify-center sm:justify-end gap-2 mb-2'>
                <h2 className='text-lg font-bold text-gray-900 dark:text-white'>
                  Room
                </h2>
                <span className='font-mono bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-lg text-sm font-semibold shadow-md'>
                  {roomId}
                </span>
              </div>
            </div>
          </div>

          {/* Game Stats Bar - Mobile Optimized */}
          {(gameStatus === "playing" || gameStatus === "sudden-death") && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className='bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 p-4'
            >
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
                {/* Timer - Only show when there's a timer running */}
                {timeLeft !== null &&
                  timeLeft !== undefined &&
                  timeLeft > 0 && (
                    <div className='flex items-center justify-center sm:justify-start gap-2 timer-frozen'>
                      <div className='p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg'>
                        <ClockIcon className='h-5 w-5 text-blue-600 dark:text-blue-400' />
                      </div>
                      <div className='text-center sm:text-left'>
                        <div className='text-xs text-gray-500 dark:text-gray-400'>
                          Time Left
                        </div>
                        <div
                          className='font-mono font-bold text-lg text-blue-600 dark:text-blue-400 transition-all duration-300'
                          style={{
                            filter:
                              "drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))",
                          }}
                        >
                          {timeLeft}s
                        </div>
                      </div>
                    </div>
                  )}

                {/* Game Status */}
                <div className='flex items-center justify-center sm:justify-start gap-2'>
                  <div className='p-2 bg-green-100 dark:bg-green-900/30 rounded-lg'>
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                      }}
                      className='w-3 h-3 bg-green-500 rounded-full'
                    />
                  </div>
                  <div className='text-center sm:text-left'>
                    <div className='text-xs text-gray-500 dark:text-gray-400'>
                      Status
                    </div>
                    <div className='font-semibold text-green-600 dark:text-green-400'>
                      {gameStatus === "waiting" && "Waiting for players..."}
                      {gameStatus === "starting" && "Game is starting..."}
                      {gameStatus === "playing" && "Playing"}
                      {gameStatus === "sudden-death" && "⚡ Sudden Death Mode!"}
                      {gameStatus === "completed" && "Game completed"}
                    </div>
                  </div>
                </div>

                {/* Power-ups */}
                {game?.settings?.powerUpsEnabled && (
                  <div className='flex items-center justify-center sm:justify-start gap-2'>
                    <div className='p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg'>
                      <span className='text-lg'>⚡</span>
                    </div>
                    <div className='text-center sm:text-left'>
                      <div className='text-xs text-gray-500 dark:text-gray-400'>
                        Power-ups
                      </div>
                      <div className='font-semibold text-purple-600 dark:text-purple-400'>
                        {powerUps.length}
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress */}
                <div className='flex items-center justify-center sm:justify-start gap-2'>
                  <div className='p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg'>
                    <TrophyIcon className='h-5 w-5 text-yellow-600 dark:text-yellow-400' />
                  </div>
                  <div className='text-center sm:text-left'>
                    <div className='text-xs text-gray-500 dark:text-gray-400'>
                      Progress
                    </div>
                    <div className='font-semibold text-yellow-600 dark:text-yellow-400'>
                      {cards.filter((c) => c.isMatched).length / 2}/
                      {cards.length / 2}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
          {/* Main Game Area */}
          <div className='lg:col-span-3'>
            {/* Enhanced Players Section - Mobile Side by Side */}
            <div className='mb-8'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2'>
                  <UsersIcon className='h-6 w-6 text-blue-500' />
                  Players
                  <span className='text-sm font-normal text-gray-500 dark:text-gray-400'>
                    ({players.length})
                  </span>
                </h3>
                {gameStatus === "playing" && (
                  <div className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400'>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className='w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full'
                    />
                    <span>Game Active</span>
                  </div>
                )}
              </div>

              {/* Mobile: Side by side, Desktop: Grid layout */}
              <div className='grid grid-cols-2 gap-2 md:gap-4'>
                {players.map((player, index) => {
                  const isCurrentTurn = currentTurn === player.userId;
                  const isCurrentUser = player.userId === user?.id;

                  return (
                    <motion.div
                      key={player.userId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`relative group cursor-pointer ${
                        isCurrentTurn
                          ? "transform scale-105"
                          : "hover:scale-102"
                      } transition-all duration-300`}
                    >
                      {/* Glow effect for current turn */}
                      {isCurrentTurn && (
                        <motion.div
                          className='absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 to-purple-500 opacity-20 blur-xl'
                          animate={{
                            scale: [1, 1.05, 1],
                            opacity: [0.2, 0.3, 0.2],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                          }}
                        />
                      )}

                      <div
                        className={`relative p-3 md:p-5 rounded-xl md:rounded-2xl border-2 transition-all duration-300 ${
                          isCurrentTurn
                            ? "bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-blue-300 dark:border-blue-600 shadow-xl shadow-blue-200/50 dark:shadow-blue-900/20"
                            : isCurrentUser
                            ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-600 shadow-lg"
                            : "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 border-gray-200 dark:border-gray-600 shadow-md hover:shadow-lg"
                        }`}
                      >
                        <div className='flex items-center space-x-2 md:space-x-4'>
                          {/* Enhanced Avatar */}
                          <div className='relative flex-shrink-0'>
                            <motion.div
                              className={`h-10 w-10 md:h-16 md:w-16 rounded-xl md:rounded-2xl flex items-center justify-center font-bold text-lg md:text-2xl shadow-lg overflow-hidden ${
                                isCurrentTurn
                                  ? "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500"
                                  : isCurrentUser
                                  ? "bg-gradient-to-br from-green-500 to-emerald-600"
                                  : "bg-gradient-to-br from-gray-500 to-gray-600"
                              } text-white`}
                              animate={
                                isCurrentTurn
                                  ? {
                                      scale: [1, 1.05, 1],
                                      rotate: [0, 5, -5, 0],
                                    }
                                  : {}
                              }
                              transition={
                                isCurrentTurn
                                  ? {
                                      duration: 2,
                                      repeat: Infinity,
                                    }
                                  : {}
                              }
                            >
                              {player.avatar &&
                              player.avatar.startsWith("http") ? (
                                <img
                                  src={player.avatar}
                                  alt={player.username}
                                  className='h-full w-full object-cover'
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.nextSibling.style.display = "flex";
                                  }}
                                />
                              ) : null}
                              <span
                                className={
                                  player.avatar &&
                                  player.avatar.startsWith("http")
                                    ? "hidden"
                                    : "flex"
                                }
                              >
                                {player.username.charAt(0).toUpperCase()}
                              </span>
                            </motion.div>

                            {/* Status indicators */}
                            {isCurrentTurn && (
                              <motion.div
                                className='absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center'
                                animate={{
                                  scale: [1, 1.2, 1],
                                  boxShadow: [
                                    "0 0 0 0 rgba(59, 130, 246, 0.4)",
                                    "0 0 0 8px rgba(59, 130, 246, 0)",
                                    "0 0 0 0 rgba(59, 130, 246, 0)",
                                  ],
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                }}
                              >
                                <PlayIcon className='h-3 w-3 text-white' />
                              </motion.div>
                            )}

                            {isCurrentUser && (
                              <div className='absolute -bottom-1 -left-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center'>
                                <UserIcon className='h-2.5 w-2.5 text-white' />
                              </div>
                            )}
                          </div>

                          {/* Player Info */}
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-1 md:gap-2 mb-1'>
                              <h4 className='text-sm md:text-lg font-bold text-gray-900 dark:text-white truncate'>
                                {player.username}
                              </h4>

                              {/* Badges */}
                              <div className='flex items-center gap-1'>
                                {isCurrentUser && (
                                  <span className='px-1.5 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 rounded-full font-semibold'>
                                    You
                                  </span>
                                )}
                                {isCurrentTurn && (
                                  <motion.span
                                    className='px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded-full font-semibold flex items-center gap-1'
                                    animate={{
                                      scale: [1, 1.05, 1],
                                    }}
                                    transition={{
                                      duration: 1,
                                      repeat: Infinity,
                                    }}
                                  >
                                    <PlayIcon className='h-3 w-3' />
                                    <span className='hidden sm:inline'>
                                      Turn
                                    </span>
                                  </motion.span>
                                )}
                              </div>
                            </div>

                            {/* Stats - Compact on mobile */}
                            <div className='grid grid-cols-2 gap-1 md:gap-2 text-xs md:text-sm'>
                              <div className='flex items-center gap-1'>
                                <TrophyIcon className='h-3 w-3 md:h-4 md:w-4 text-yellow-500' />
                                <span className='text-gray-600 dark:text-gray-400 hidden sm:inline'>
                                  Score:
                                </span>
                                <span className='font-bold text-gray-900 dark:text-white'>
                                  {player.score || 0}
                                </span>
                              </div>
                              <div className='flex items-center gap-1'>
                                <StarIcon className='h-3 w-3 md:h-4 md:w-4 text-purple-500' />
                                <span className='text-gray-600 dark:text-gray-400 hidden sm:inline'>
                                  Matches:
                                </span>
                                <span className='font-bold text-gray-900 dark:text-white'>
                                  {player.matches || 0}
                                </span>
                              </div>
                            </div>

                            {/* Progress bar for matches - Hidden on mobile to save space */}
                            <div className='mt-1 md:mt-2 hidden md:block'>
                              <div className='flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1'>
                                <span>Progress</span>
                                <span>
                                  {player.matches || 0} / {cards.length / 2}
                                </span>
                              </div>
                              <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5'>
                                <motion.div
                                  className={`h-1.5 rounded-full ${
                                    isCurrentTurn
                                      ? "bg-gradient-to-r from-blue-500 to-purple-500"
                                      : isCurrentUser
                                      ? "bg-gradient-to-r from-green-500 to-emerald-500"
                                      : "bg-gradient-to-r from-gray-500 to-gray-600"
                                  }`}
                                  initial={{ width: 0 }}
                                  animate={{
                                    width: `${
                                      ((player.matches || 0) /
                                        (cards.length / 2)) *
                                      100
                                    }%`,
                                  }}
                                  transition={{ duration: 0.8, delay: 0.2 }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Compact Power-ups Section */}
            {(game?.settings?.powerUpsEnabled || powerUps.length > 0) && (
              <div className='mb-2 md:mb-4 '>
                <div className='flex items-center justify-between mb-2'>
                  <h3 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                    <span className='text-lg'>⚡</span>
                    Power-ups ({powerUps.length})
                  </h3>
                  {!neverShowPowerUpTutorial && (
                    <button
                      onClick={() => setShowPowerUpTutorial(true)}
                      className='p-1 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-all'
                      title='Power-up Help'
                    >
                      <span className='text-sm'>❓Rules</span>
                    </button>
                  )}
                </div>

                {powerUps.length > 0 ? (
                  <>
                    {/* Compact power-up buttons */}
                    <div className='flex flex-wrap gap-2'>
                      {powerUps.map((powerUp, index) => (
                        <motion.button
                          key={`${powerUp.type}-${index}`}
                          onClick={() => handlePowerUpClick(powerUp)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg ${getPowerUpButtonStyle(
                            powerUp.type
                          )}`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          title={getPowerUpTooltip(powerUp.type)}
                        >
                          <span className='text-lg'>{powerUp.icon}</span>
                          <span className='text-sm font-medium'>
                            {powerUp.name}
                          </span>
                        </motion.button>
                      ))}
                    </div>

                    {/* Compact mode indicators */}
                    {swapMode && (
                      <div className='mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <span className='text-purple-600 dark:text-purple-400'>
                              🔀
                            </span>
                            <span className='text-sm font-medium text-purple-800 dark:text-purple-200'>
                              Swap Mode: Select 2 cards (
                              {selectedCardsForSwap.length}/2)
                            </span>
                          </div>
                          <button
                            onClick={cancelSwapMode}
                            className='px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors'
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {revealMode && (
                      <div className='mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <span className='text-yellow-600 dark:text-yellow-400'>
                              💡
                            </span>
                            <span className='text-sm font-medium text-yellow-800 dark:text-yellow-200'>
                              Reveal Mode: Select 1 card to reveal
                            </span>
                          </div>
                          <button
                            onClick={cancelRevealMode}
                            className='px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors'
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className='text-center py-3 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                    <p className='text-gray-500 dark:text-gray-400 text-sm'>
                      No power-ups yet. Find them on cards during gameplay!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Game Board */}
            {gameStatus === "waiting" || gameStatus === "starting" ? (
              <div className='text-center p-16 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700'>
                <ClockIcon className='h-16 w-16 mx-auto text-gray-400 dark:text-gray-500 mb-6' />
                <h3 className='text-2xl font-semibold text-gray-900 dark:text-white mb-3'>
                  {gameStatus === "waiting"
                    ? "Waiting for players..."
                    : "Game is starting..."}
                </h3>
                <p className='text-gray-500 dark:text-gray-400 text-lg'>
                  {gameStatus === "waiting"
                    ? "The game will start when all players are ready."
                    : "Get ready to play!"}
                </p>
                {gameStatus === "waiting" && (
                  <div className='mt-6 flex justify-center'>
                    <div className='flex space-x-1'>
                      <div className='w-2 h-2 bg-blue-500 rounded-full animate-bounce'></div>
                      <div
                        className='w-2 h-2 bg-blue-500 rounded-full animate-bounce'
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className='w-2 h-2 bg-blue-500 rounded-full animate-bounce'
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ) : cards.length > 0 ? (
              <div
                className={`rounded-xl shadow-lg p-2 sm:p-3 md:p-4 border transition-all duration-500 ${
                  currentTurn === user?.id &&
                  (gameStatus === "playing" || gameStatus === "sudden-death")
                    ? "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-green-300 dark:border-green-600 shadow-green-200 dark:shadow-green-900/20"
                    : "bg-gradient-to-tr from-red-200 to-red-300 dark:from-red-400/40 dark:to-red-800/80 border-red-500 dark:border-red-300"
                }`}
              >
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>
                    {gameStatus === "sudden-death"
                      ? "Sudden Death Board"
                      : "Memory Game Board"}
                  </h3>
                  {(gameStatus === "playing" ||
                    gameStatus === "sudden-death") && (
                    <div className='flex items-center space-x-3'>
                      {/* <div className='text-sm text-gray-600 dark:text-gray-400'>
                        Progress: {cards.filter((c) => c.isMatched).length / 2}{" "}
                        / {cards.length / 2}
                      </div>
                      <div className='w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
                        <motion.div
                          className='bg-green-500 h-2 rounded-full'
                          initial={{ width: 0 }}
                          animate={{
                            width: `${
                              (cards.filter((c) => c.isMatched).length /
                                cards.length) *
                              100
                            }%`,
                          }}
                          transition={{ duration: 0.5 }}
                        />
                      </div> */}
                      {(game?.settings?.powerUpsEnabled ||
                        powerUps.length > 0) && (
                        <div className='flex items-center space-x-1 text-sm text-purple-600 dark:text-purple-400'>
                          <span>⚡</span>
                          <span>{powerUps.length}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className='grid grid-cols-6 sm:grid-cols-6 md:grid-cols-8 gap-0.5 sm:gap-1 md:gap-2 lg:gap-3 relative'>
                  {cards.map((card) => (
                    <motion.div
                      key={`card-${card.id}`}
                      className={`w-10 h-14 sm:w-16 sm:h-20 md:w-20 md:h-24 lg:w-24 lg:h-32 rounded-lg cursor-pointer relative aspect-[3/4] ${
                        card.isMatched ? "cursor-default" : "hover:scale-105"
                      }`}
                      animate={
                        card.isSwapping
                          ? {
                              rotate: [0, 180, 360],
                              scale: [1, 1.1, 1],
                              boxShadow: [
                                "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                "0 20px 25px -5px rgba(139, 92, 246, 0.3)",
                                "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                              ],
                            }
                          : card.isShuffling
                          ? {
                              rotate: [0, 90, 180, 270, 360],
                              scale: [1, 0.8, 1.2, 0.8, 1],
                              x: [0, 10, -10, 5, 0],
                              y: [0, -5, 10, -5, 0],
                            }
                          : {}
                      }
                      transition={
                        card.isSwapping
                          ? { duration: 0.5, ease: "easeInOut" }
                          : card.isShuffling
                          ? { duration: 0.8, ease: "easeInOut" }
                          : {}
                      }
                      whileHover={
                        !card.isMatched
                          ? {
                              scale: 1.05,
                              boxShadow:
                                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                            }
                          : {}
                      }
                      whileTap={!card.isMatched ? { scale: 0.95 } : {}}
                      onClick={() => !card.isMatched && flipCard(card.id)}
                      style={{
                        transformStyle: "preserve-3d",
                        perspective: "1000px",
                      }}
                    >
                      {/* Card Back Side */}
                      <motion.div
                        className={`absolute inset-0 rounded-lg flex items-center justify-center text-lg sm:text-xl md:text-2xl ${
                          card.isMatched
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 opacity-60"
                            : card.isRevealed
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                            : selectedCardsForSwap.includes(card.id)
                            ? "bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 border-2 border-purple-500"
                            : swapMode && !card.isMatched
                            ? "bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-700 dark:to-purple-800 text-purple-600 dark:text-purple-300 hover:from-purple-200 hover:to-purple-300 dark:hover:from-purple-600 dark:hover:to-purple-700"
                            : revealMode && !card.isMatched && !card.isFlipped
                            ? "bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-700 dark:to-yellow-800 text-yellow-600 dark:text-yellow-300 hover:from-yellow-200 hover:to-yellow-300 dark:hover:from-yellow-600 dark:hover:to-yellow-700"
                            : "bg-gradient-to-br from-yellow-200 to-yellow-300 dark:from-yellow-600 dark:to-yellow-700 text-yellow-800 dark:text-yellow-200 border-2 border-white dark:border-gray-300 hover:from-yellow-300 hover:to-yellow-400 dark:hover:from-yellow-500 dark:hover:to-yellow-600"
                        }`}
                        animate={{
                          rotateY: card.isFlipped || card.isMatched ? 180 : 0,
                          scale: card.isFlipped || card.isMatched ? 1 : 1,
                          boxShadow:
                            card.isFlipped || card.isMatched
                              ? "0 8px 25px rgba(0, 0, 0, 0.3), 0 4px 10px rgba(0, 0, 0, 0.2)"
                              : "0 4px 15px rgba(0, 0, 0, 0.2), 0 2px 5px rgba(0, 0, 0, 0.1)",
                        }}
                        transition={{
                          duration: 0.6,
                          ease: "easeInOut",
                        }}
                        style={{
                          backfaceVisibility: "hidden",
                          transformOrigin: "center center",
                          transform: "rotateY(0deg)",
                        }}
                      >
                        {/* Card Back Content */}
                        <div className='flex flex-col items-center justify-center'>
                          {/* <div className='w-6 h-4 sm:w-8 sm:h-6 md:w-10 md:h-8 lg:w-12 lg:h-9 bg-white dark:bg-gray-200 rounded-lg flex items-center justify-center mb-1 shadow-sm'>
                            <div className='text-xs sm:text-sm font-bold text-yellow-600 dark:text-yellow-700'>
                              😄
                            </div>
                          </div> */}
                        </div>
                      </motion.div>

                      {/* Card Front Side */}
                      <motion.div
                        className={`absolute inset-0 rounded-lg flex items-center justify-center text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300`}
                        animate={{
                          rotateY:
                            card.isFlipped || card.isMatched || card.isRevealed
                              ? 0
                              : -180,
                          scale:
                            card.isFlipped || card.isMatched || card.isRevealed
                              ? 1
                              : 1,
                          boxShadow:
                            card.isFlipped || card.isMatched || card.isRevealed
                              ? "0 8px 25px rgba(0, 0, 0, 0.3), 0 4px 10px rgba(0, 0, 0, 0.2)"
                              : "0 4px 15px rgba(0, 0, 0, 0.2), 0 2px 5px rgba(0, 0, 0, 0.1)",
                        }}
                        transition={{
                          duration: 0.6,
                          ease: "easeInOut",
                        }}
                        style={{
                          backfaceVisibility: "hidden",
                          transformOrigin: "center center",
                          transform: card.isRevealed
                            ? "rotateY(0deg)"
                            : "rotateY(-180deg)",
                        }}
                      >
                        {/* Card Front Content */}
                        {card.isFlipped || card.isMatched ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              type: "spring",
                              damping: 15,
                              stiffness: 300,
                            }}
                          >
                            {card.value}
                          </motion.div>
                        ) : card.isRevealed ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              type: "spring",
                              damping: 15,
                              stiffness: 300,
                            }}
                          >
                            {(() => {
                              console.log("Rendering revealed card:", {
                                cardId: card.id,
                                isRevealed: card.isRevealed,
                                revealedValue: card.revealedValue,
                                cardValue: card.value,
                                finalValue: card.revealedValue || card.value,
                              });
                              return card.revealedValue || card.value;
                            })()}
                          </motion.div>
                        ) : null}
                      </motion.div>
                      {/* Power-up indicator */}
                      {card.powerUp && !card.isMatched && (
                        <motion.div
                          className='absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs text-white shadow-lg'
                          animate={{
                            scale: [1, 1.2, 1],
                            rotate: [0, 5, -5, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                          }}
                          title={`${card.powerUp.name}: ${card.powerUp.description}`}
                        >
                          {card.powerUp.icon}
                        </motion.div>
                      )}

                      {/* Enhanced power-up glow effect */}
                      {card.powerUp && !card.isMatched && (
                        <motion.div
                          className='absolute inset-0 rounded-lg  '
                          animate={{
                            boxShadow: [
                              "0 0 0 0 rgba(168, 85, 247, 0.4)",
                              "0 0 0 10px rgba(168, 85, 247, 0)",
                              "0 0 0 0 rgba(168, 85, 247, 0)",
                            ],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                          }}
                        />
                      )}

                      {/* Swap selection indicator */}
                      {selectedCardsForSwap.includes(card.id) && (
                        <motion.div
                          className='absolute -top-1 -left-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs text-white shadow-lg'
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            damping: 15,
                            stiffness: 300,
                          }}
                        >
                          {selectedCardsForSwap.indexOf(card.id) + 1}
                        </motion.div>
                      )}

                      {/* Peek effect overlay - only visible to the user who used the power-up */}
                      {isPeekActive && !card.isMatched && !card.isFlipped && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.8 }}
                          exit={{ opacity: 0 }}
                          className='absolute inset-0 bg-blue-200 dark:bg-blue-800 rounded-lg flex items-center justify-center'
                        >
                          <span className='text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl'>
                            {card.value}
                          </span>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                  {/* Reveal effect overlay - only visible to the user who used the power-up
                  {card.isRevealed && !card.isMatched && !card.isFlipped && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.9 }}
                      exit={{ opacity: 0 }}
                      className='absolute inset-0 bg-yellow-200 dark:bg-yellow-800 rounded-lg flex items-center justify-center'
                    >
                      <span className='text-lg font-bold'>
                        {card.revealedValue || card.value}
                      </span>
                    </motion.div>
                  )} */}
                </div>

                {/* Celebration effect for matches */}
                {cards.filter((c) => c.isMatched).length > 0 && (
                  <motion.div
                    className='absolute inset-0 pointer-events-none'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {[
                      ...Array(
                        Math.min(
                          cards.filter((c) => c.isMatched).length / 2,
                          10
                        )
                      ),
                    ].map((_, i) => (
                      <motion.div
                        key={i}
                        className='absolute w-2 h-2 bg-yellow-400 rounded-full'
                        initial={{
                          x: Math.random() * 400 - 200,
                          y: Math.random() * 400 - 200,
                          scale: 0,
                        }}
                        animate={{
                          x: Math.random() * 800 - 400,
                          y: Math.random() * 800 - 400,
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.1,
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </div>
            ) : (
              <div className='text-center p-16 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700'>
                <p className='text-gray-500 dark:text-gray-400'>
                  Loading game board...
                </p>
              </div>
            )}
          </div>

          {/* Chat Sidebar - Hidden on mobile, shown on desktop */}
          <div className='hidden lg:block lg:col-span-1 max-h-[470px]'>
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col'>
              <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center'>
                    <ChatBubbleLeftIcon className='h-5 w-5 mr-2' />
                    Chat
                  </h3>
                  <button
                    onClick={() => setShowChat(!showChat)}
                    className='lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700'
                  >
                    <ChatBubbleLeftIcon className='h-5 w-5' />
                  </button>
                </div>
              </div>

              {/* Power-up History */}
              {game?.settings?.powerUpsEnabled && powerUpHistory.length > 0 && (
                <div className='p-3 border-b border-gray-200 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/20'>
                  <h4 className='text-sm font-medium text-purple-900 dark:text-purple-100 mb-2 flex items-center'>
                    <span className='mr-1'>⚡</span>
                    Recent Power-ups
                  </h4>
                  <div className='space-y-1'>
                    {powerUpHistory.slice(0, 3).map((entry) => (
                      <div
                        key={entry.id}
                        className='text-xs text-purple-800 dark:text-purple-200'
                      >
                        <span className='font-medium'>{entry.playerName}</span>
                        <span className='mx-1'>used</span>
                        <span className='font-medium'>{entry.powerUpType}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div
                className={`${
                  showChat ? "flex" : "hidden"
                } lg:flex flex-col flex-1 min-h-0`}
              >
                {/* Chat Messages */}
                <div className='flex-1 overflow-y-auto p-4 space-y-3 min-h-0'>
                  {chatMessages.length === 0 ? (
                    <div className='text-center py-8'>
                      <ChatBubbleLeftIcon className='h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3' />
                      <p className='text-gray-500 dark:text-gray-400 text-sm'>
                        No messages yet. Start the conversation!
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex flex-col ${
                          message.userId === user?.id
                            ? "items-end"
                            : "items-start"
                        }`}
                      >
                        <div
                          className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                            message.type === "powerup"
                              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700"
                              : message.userId === user?.id
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                          }`}
                        >
                          <p className='font-medium text-xs mb-1 opacity-80'>
                            {message.username}
                            {message.userId === user?.id && " (You)"}
                          </p>
                          <p
                            className={
                              message.type === "powerup" ? "font-semibold" : ""
                            }
                          >
                            {message.message}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input - Now properly aligned to bottom */}
                <div className='p-4 border-t border-gray-200 dark:border-gray-700 mt-auto'>
                  <form onSubmit={sendChatMessage} className='flex gap-2'>
                    <input
                      type='text'
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder='Type a message...'
                      className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all'
                      maxLength={500}
                    />
                    <motion.button
                      type='submit'
                      disabled={!chatInput.trim()}
                      className='px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors'
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <PaperAirplaneIcon className='h-4 w-4' />
                    </motion.button>
                  </form>
                  <p className='text-xs text-gray-500 dark:text-gray-400 mt-2 text-center'>
                    Press Enter to send
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Chat - Mobile Only */}
      <div className='lg:hidden'>
        {/* Floating Chat Button */}
        <motion.div
          className='fixed z-40 cursor-pointer'
          style={{
            left: `${floatingChatPosition.x}px`,
            top: `${floatingChatPosition.y}px`,
          }}
          onMouseDown={handleChatDragStart}
          onMouseMove={handleChatDrag}
          onMouseUp={handleChatDragEnd}
          onTouchStart={handleChatDragStart}
          onTouchMove={handleChatDrag}
          onTouchEnd={handleChatDragEnd}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <div className='relative' onClick={toggleFloatingChat}>
            <div className='w-14 h-14 bg-indigo-400 hover:bg-indigo-600 rounded-full shadow-lg flex items-center justify-center'>
              <ChatBubbleLeftIcon className='h-6 w-6 text-white' />
            </div>
            {unreadMessages > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className='absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold'
              >
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Message Preview */}
        {showMessagePreview && latestMessage && !showFloatingChat && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.8 }}
            className='fixed z-30 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 max-w-xs cursor-pointer hover:shadow-xl transition-shadow duration-200'
            style={{
              left: `${floatingChatPosition.x + 70}px`,
              top: `${floatingChatPosition.y}px`,
            }}
            onClick={toggleFloatingChat}
          >
            <div className='flex items-start space-x-2'>
              <div className='flex-shrink-0'>
                <div className='w-8 h-8 bg-indigo-400 rounded-full flex items-center justify-center'>
                  <span className='text-white text-xs font-medium'>
                    {latestMessage.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                  {latestMessage.username}
                </p>
                <p
                  className='text-sm text-gray-600 dark:text-gray-300 overflow-hidden'
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {latestMessage.message}
                </p>
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                  {new Date(latestMessage.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMessagePreview(false);
                }}
                className='flex-shrink-0 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
              >
                <svg
                  className='w-3 h-3 text-gray-500'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            </div>
            <div className='absolute top-1/2 -left-2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-white dark:border-r-gray-800'></div>
          </motion.div>
        )}

        {/* Floating Chat Window */}
        {showFloatingChat && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className='fixed inset-8 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col h-[470px]   '
          >
            {/* Chat Header */}
            <div className='p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center'>
                <ChatBubbleLeftIcon className='h-5 w-5 mr-2' />
                Chat
              </h3>
              <button
                onClick={toggleFloatingChat}
                className='p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700'
              >
                <svg
                  className='h-5 w-5 text-gray-500'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            </div>

            {/* Chat Messages */}
            <div className='flex-1 overflow-y-auto p-4 space-y-3'>
              {chatMessages.length === 0 ? (
                <div className='text-center py-8'>
                  <ChatBubbleLeftIcon className='h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3' />
                  <p className='text-gray-500 dark:text-gray-400 text-sm'>
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                chatMessages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex flex-col ${
                      message.userId === user?.id ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                        message.type === "powerup"
                          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700"
                          : message.userId === user?.id
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                    >
                      <p className='font-medium text-xs mb-1 opacity-80'>
                        {message.username}
                        {message.userId === user?.id && " (You)"}
                      </p>
                      <p
                        className={
                          message.type === "powerup" ? "font-semibold" : ""
                        }
                      >
                        {message.message}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className='p-4 border-t border-gray-200 dark:border-gray-700'>
              <form onSubmit={sendChatMessage} className='flex gap-2'>
                <input
                  type='text'
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder='Type a message...'
                  className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all'
                  maxLength={500}
                />
                <motion.button
                  type='submit'
                  disabled={!chatInput.trim()}
                  className='px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors'
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <PaperAirplaneIcon className='h-4 w-4' />
                </motion.button>
              </form>
            </div>
          </motion.div>
        )}
      </div>

      {/* Game Results Modal */}
      {showGameResults && gameResults && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'
          >
            {/* Header */}
            <div className='text-center p-6 border-b border-gray-200 dark:border-gray-700'>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", damping: 15 }}
                className='mb-4'
              >
                {gameResults.winners && gameResults.winners.length > 0 ? (
                  gameResults.winners.some((w) => w.userId === user?.id) ? (
                    <div className='flex justify-center'>
                      <motion.div
                        animate={{
                          rotate: [0, -10, 10, -10, 0],
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          repeatDelay: 2,
                        }}
                        className='bg-gradient-to-r from-yellow-400 to-orange-500 p-4 rounded-full'
                      >
                        <TrophyIcon className='h-16 w-16 text-white' />
                      </motion.div>
                    </div>
                  ) : (
                    <div className='flex justify-center'>
                      <motion.div
                        animate={{
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          repeatDelay: 1,
                        }}
                        className='bg-gradient-to-r from-blue-400 to-purple-500 p-4 rounded-full'
                      >
                        <HeartIcon className='h-16 w-16 text-white' />
                      </motion.div>
                    </div>
                  )
                ) : (
                  <div className='flex justify-center'>
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 1,
                      }}
                      className='bg-gradient-to-r from-gray-400 to-gray-600 p-4 rounded-full'
                    >
                      <ClockIcon className='h-16 w-16 text-white' />
                    </motion.div>
                  </div>
                )}
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className='text-3xl font-bold text-gray-900 dark:text-white mb-2'
              >
                {gameResults.winners && gameResults.winners.length > 0
                  ? gameResults.winners.some((w) => w.userId === user?.id)
                    ? "🎉 Congratulations! 🎉"
                    : "Game Complete!"
                  : "Time's Up!"}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className='text-gray-600 dark:text-gray-400'
              >
                {gameResults.winners && gameResults.winners.length > 0
                  ? gameResults.winners.some((w) => w.userId === user?.id)
                    ? "You're a winner! Great job!"
                    : "Thanks for playing! Better luck next time!"
                  : "No one found any matches before time ran out!"}
              </motion.p>

              {/* Game Completion Reason */}
              {gameResults.reason && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className='mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700'
                >
                  <div className='flex items-center justify-center space-x-2'>
                    <span className='text-blue-600 dark:text-blue-400'>ℹ️</span>
                    <span className='text-sm font-medium text-blue-800 dark:text-blue-200'>
                      {(() => {
                        const reasonMap = {
                          game_completed: "All pairs found - Game completed!",
                          timeout_no_matches: "Time ran out - No matches found",
                          timeout_with_matches:
                            "Time ran out - Game ended with matches",
                          sudden_death_winner: "Sudden Death winner found!",
                          sudden_death_timeout:
                            "Sudden Death timeout - No winner",
                          opponents_left: "Opponents left the game",
                          last_player_winner: "Last player remaining wins",
                          all_players_left: "All players left the game",
                          blitz_timeout: "Blitz mode timeout",
                          abort: "Game was aborted",
                        };
                        return (
                          reasonMap[gameResults.reason] ||
                          `Game ended: ${gameResults.reason}`
                        );
                      })()}
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Results */}
            <div className='p-6'>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className='mb-6'
              >
                <h3 className='text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center'>
                  Final Results
                </h3>

                <div className='space-y-3'>
                  {gameResults.finalStats?.map((player, index) => (
                    <motion.div
                      key={player.userId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                        player.isWinner
                          ? "border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20"
                          : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                      }`}
                    >
                      <div className='flex items-center space-x-3'>
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            player.isWinner
                              ? "bg-yellow-400 text-yellow-900"
                              : "bg-gray-400 text-gray-700"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <p
                            className={`font-semibold ${
                              player.isWinner
                                ? "text-yellow-800 dark:text-yellow-200"
                                : "text-gray-900 dark:text-white"
                            }`}
                          >
                            {player.username}
                            {player.isWinner && " 👑"}
                          </p>
                          <p className='text-sm text-gray-500 dark:text-gray-400'>
                            {player.matches} matches • {player.flips} flips
                          </p>
                        </div>
                      </div>

                      <div className='text-right'>
                        <p
                          className={`text-2xl font-bold ${
                            player.isWinner
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {player.score}
                        </p>
                        <p className='text-sm text-gray-500 dark:text-gray-400'>
                          {player.accuracy}% accuracy
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className='flex flex-col sm:flex-row gap-3 justify-center'
              >
                <button
                  onClick={() => {
                    setShowGameResults(false);
                    navigate("/lobby");
                  }}
                  className='px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors transform hover:scale-105'
                >
                  Back to Lobby
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Power-up Tutorial Modal */}
      {showPowerUpTutorial && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'
          >
            <div className='p-6'>
              <div className='text-center mb-6'>
                <div className='text-4xl mb-4'>⚡</div>
                <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
                  Power-ups Guide
                </h2>
                <p className='text-gray-600 dark:text-gray-400'>
                  Learn how to use power-ups strategically!
                </p>
              </div>

              <div className='space-y-4'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='p-4 bg-green-50 dark:bg-green-900/20 rounded-lg'>
                    <div className='flex items-center gap-2 mb-2'>
                      <span className='text-lg'>🔄</span>
                      <h3 className='font-semibold text-green-900 dark:text-green-100'>
                        Extra Turn
                      </h3>
                    </div>
                    <p className='text-sm text-green-800 dark:text-green-200'>
                      Get another turn after a miss. Use when you're close to
                      finding a match!
                    </p>
                  </div>

                  <div className='p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
                    <div className='flex items-center gap-2 mb-2'>
                      <span className='text-lg'>👁️</span>
                      <h3 className='font-semibold text-blue-900 dark:text-blue-100'>
                        Peek
                      </h3>
                    </div>
                    <p className='text-sm text-blue-800 dark:text-blue-200'>
                      Reveal all cards for 3 seconds. Perfect for memorizing
                      positions!
                    </p>
                  </div>

                  <div className='p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg'>
                    <div className='flex items-center gap-2 mb-2'>
                      <span className='text-lg'>🔀</span>
                      <h3 className='font-semibold text-purple-900 dark:text-purple-100'>
                        Swap
                      </h3>
                    </div>
                    <p className='text-sm text-purple-800 dark:text-purple-200'>
                      Swap two card positions. Create favorable layouts for
                      easier matching!
                    </p>
                  </div>

                  <div className='p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg'>
                    <div className='flex items-center gap-2 mb-2'>
                      <span className='text-lg'>💡</span>
                      <h3 className='font-semibold text-yellow-900 dark:text-yellow-100'>
                        Reveal One
                      </h3>
                    </div>
                    <p className='text-sm text-yellow-800 dark:text-yellow-200'>
                      Permanently reveal one card. Great for breaking deadlocks!
                    </p>
                  </div>

                  <div className='p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg'>
                    <div className='flex items-center gap-2 mb-2'>
                      <span className='text-lg'>❄️</span>
                      <h3 className='font-semibold text-cyan-900 dark:text-cyan-100'>
                        Freeze Timer
                      </h3>
                    </div>
                    <p className='text-sm text-cyan-800 dark:text-cyan-200'>
                      Freeze the timer for 10 seconds. Essential in Blitz mode!
                    </p>
                  </div>

                  <div className='p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg'>
                    <div className='flex items-center gap-2 mb-2'>
                      <span className='text-lg'>🔀</span>
                      <h3 className='font-semibold text-pink-900 dark:text-pink-100'>
                        Shuffle
                      </h3>
                    </div>
                    <p className='text-sm text-pink-800 dark:text-pink-200'>
                      Shuffle all unmatched cards. Reset the board when stuck!
                    </p>
                  </div>
                </div>

                <div className='bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 p-4 rounded-lg'>
                  <h3 className='font-semibold text-purple-900 dark:text-purple-100 mb-2'>
                    💡 Strategic Tips:
                  </h3>
                  <ul className='text-sm text-purple-800 dark:text-purple-200 space-y-1'>
                    <li>• Save power-ups for crucial moments</li>
                    <li>• Use Peek when you need to remember card positions</li>
                    <li>• Use Swap to create favorable layouts</li>
                    <li>• Time Freeze is valuable in Blitz mode</li>
                    <li>• Power-ups can be found on cards during gameplay</li>
                  </ul>
                </div>
              </div>

              <div className='flex justify-center mt-6'>
                <button
                  onClick={() => setShowPowerUpTutorial(false)}
                  className='px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors transform hover:scale-105'
                >
                  Got it!
                </button>
                <button
                  onClick={handleNeverShowPowerUpTutorial}
                  className='px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors transform hover:scale-105'
                >
                  Never show again
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Floating Power-up Manual Button */}
      {(game?.settings?.powerUpsEnabled || powerUps.length > 0) &&
        !neverShowPowerUpTutorial && (
          <motion.button
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            className='fixed bottom-6 right-6 z-40 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200'
            onClick={() => setShowPowerUpTutorial(true)}
            title='Power-up Manual'
          >
            <span className='text-2xl'>⚡</span>
          </motion.button>
        )}

      {/* Power-up Notification */}
      {showPowerUpNotification && newPowerUp && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.8 }}
          className='fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50'
        >
          <div className='bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-xl shadow-2xl border-2 border-white/20'>
            <div className='text-center'>
              <div className='text-6xl mb-4 animate-bounce'>
                {newPowerUp.icon}
              </div>
              <h3 className='text-2xl font-bold mb-2'>New Power-up!</h3>
              <p className='text-xl mb-3'>{newPowerUp.name}</p>
              <p className='text-sm opacity-90'>{newPowerUp.description}</p>
              <div className='mt-4 text-xs opacity-75'>
                Click on power-ups in your bar to use them!
              </div>
            </div>
          </div>
        </motion.div>
      )}
      {/* Leave Game Warning Popup */}
      {showLeaveWarning && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className='bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6'
          >
            <div className='text-center'>
              {/* Warning Icon */}
              <div className='mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4'>
                <svg
                  className='h-6 w-6 text-red-600 dark:text-red-400'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                  />
                </svg>
              </div>

              {/* Warning Title */}
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-2'>
                Leave Game?
              </h3>

              {/* Warning Message */}
              <p className='text-sm text-gray-600 dark:text-gray-300 mb-6'>
                Are you sure you want to leave this game?
                <br />
                <span className='font-medium text-red-600 dark:text-red-400'>
                  You will lose your progress and no points will be awarded!
                </span>
              </p>

              {/* Action Buttons */}
              <div className='flex space-x-3'>
                <button
                  onClick={cancelLeave}
                  className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLeave}
                  className='flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors'
                >
                  Yes, Leave Game
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Game;
