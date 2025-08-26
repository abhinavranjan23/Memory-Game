import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useSocket } from "../contexts/SocketContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import { motion } from "framer-motion";
import {
  UserGroupIcon,
  ArrowLeftIcon,
  ClockIcon,
  ChatBubbleLeftIcon,
  PaperAirplaneIcon,
  TrophyIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";

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

  useEffect(() => {
    // Game component should not join the room - it should only listen for game events
    // The user should already be in the room when they navigate to the game
    console.log("Game component mounted for room:", roomId);
    console.log("Current user:", user);
    console.log("Socket available:", !!socket);
    hasJoinedRef.current = true;

    // Fallback: If we don't receive game state within 3 seconds, try to fetch it
    const fallbackTimer = setTimeout(async () => {
      if (loading && socket) {
        console.log("Fallback: Requesting game state from server");
        socket.emit("get-game-state");
      }
    }, 3000);

    // Emergency fallback: Set loading to false after 10 seconds to prevent infinite loading
    const emergencyTimer = setTimeout(() => {
      if (loading) {
        console.log(
          "Emergency fallback: Setting loading to false after 10 seconds"
        );
        setLoading(false);
      }
    }, 10000);

    return () => {
      clearTimeout(fallbackTimer);
      clearTimeout(emergencyTimer);
    };
  }, [roomId, loading, socket]);

  // Debug currentTurn changes
  useEffect(() => {
    console.log("currentTurn changed to:", currentTurn);
    console.log(
      "Available players:",
      players.map((p) => ({ userId: p.userId, username: p.username }))
    );
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
        console.log("Current turn player no longer exists, fixing turn");
        // Set turn to the first available player
        setCurrentTurn(players[0].userId);
        addToast(`Turn passed to ${players[0].username}`, "info");
      }
    }

    // Check if we have enough players to continue
    if (
      gameStatus === "playing" &&
      players.length < 2 &&
      !gamePausedForCurrentState.current
    ) {
      console.log("Not enough players to continue game - showing pause toast");
      setGameStatus("waiting");
      addToast("Game paused - waiting for more players", "warning");
      gamePausedForCurrentState.current = true;
      gamePausedToastShown.current = true;

      // Reset the flags after a delay
      setTimeout(() => {
        gamePausedToastShown.current = false;
        gamePausedForCurrentState.current = false;
      }, 5000);
    }
  }, [currentTurn, players, gameStatus]);

  useEffect(() => {
    if (!socket) return;

    // Event handlers

    const handleGameState = (data) => {
      console.log("=== GAME STATE UPDATE RECEIVED ===");
      console.log("Game state update received:", data);
      console.log("gameState.currentTurn:", data.gameState?.currentTurn);
      console.log(
        "Current cards state before game state update:",
        cards.map((c) => ({
          id: c.id,
          value: c.value,
          theme: c.theme,
          isSwapping: c.isSwapping,
        }))
      );

      // Set loading to false when we receive the first game state
      console.log("Setting loading to false in handleGameState");
      setLoading(false);

      setPlayers(data.players || []);

      // Preserve animation states when updating cards
      setCards((prevCards) => {
        const newBoard = data.gameState?.board || [];
        console.log(
          "New board from server:",
          newBoard.map((c) => ({ id: c.id, value: c.value, theme: c.theme }))
        );

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

          // Debug logging for swapping cards
          if (isRecentlySwapped) {
            console.log(`Preserving swap values for card ${newCard.id}:`, {
              originalValue: newCard.value,
              preservedValue: existingCard.value,
              originalTheme: newCard.theme,
              preservedTheme: existingCard.theme,
              isRecentlySwapped,
            });
          }

          return updatedCard;
        });

        console.log(
          "Updated cards in handleGameState:",
          updatedCards.map((c) => ({
            id: c.id,
            value: c.value,
            isSwapping: c.isSwapping,
          }))
        );
        return updatedCards;
      });

      // Only update currentTurn if we haven't recently received a turn-continue event
      // This prevents the game-state event from overriding the turn-continue event
      const now = Date.now();
      const lastTurnContinueTime = window.lastTurnContinueTime || 0;
      const timeSinceTurnContinue = now - lastTurnContinueTime;

      console.log("Game state turn management:", {
        serverCurrentTurn: data.gameState?.currentTurn,
        clientCurrentTurn: currentTurn,
        lastTurnContinueTime,
        timeSinceTurnContinue,
        willUpdateTurn: timeSinceTurnContinue > 1000,
      });

      if (timeSinceTurnContinue > 1000) {
        // Only update if no recent turn-continue
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

        if (newCurrentTurn) {
          console.log(
            "Updating currentTurn from game-state to:",
            newCurrentTurn
          );
          setCurrentTurn(newCurrentTurn);
        } else {
          console.log(
            "Skipping currentTurn update - no valid currentTurn found"
          );
        }
      } else {
        console.log(
          "Skipping currentTurn update due to recent turn-continue event"
        );
      }

      setGameStatus(data.gameState?.status || "waiting");
      setTimeLeft(data.gameState?.timeLeft || 0);

      // Update power-ups for current user
      const currentPlayer = data.players?.find((p) => p.userId === user?.id);
      setPowerUps(currentPlayer?.powerUps || []);
    };

    const handleGameStarted = (data) => {
      console.log("=== GAME STARTED EVENT RECEIVED ===");
      console.log("Full event data:", data);
      console.log("gameState:", data.gameState);
      console.log("gameState.currentTurn:", data.gameState?.currentTurn);
      console.log("players:", data.players);
      console.log("players[0].userId:", data.players?.[0]?.userId);
      console.log(
        "All players in event:",
        data.players?.map((p) => ({ userId: p.userId, username: p.username }))
      );

      // Set loading to false when game starts
      console.log("Setting loading to false in handleGameStarted");
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
          console.log(
            "Found currentTurn from player.isCurrentTurn:",
            newCurrentTurn
          );
        }
      }

      // Fallback to first player if still no currentTurn
      if (!newCurrentTurn && data.players?.length > 0) {
        newCurrentTurn = data.players[0].userId;
        console.log(
          "Using fallback currentTurn (first player):",
          newCurrentTurn
        );
      }

      console.log("Final currentTurn value:", newCurrentTurn);
      setCurrentTurn(newCurrentTurn);

      const newGameStatus = data.gameState?.status || "playing";
      console.log("Setting gameStatus to:", newGameStatus);
      setGameStatus(newGameStatus);

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
        console.log("Game started - showing start toast");
        addToastOnce("Game has started!", "success", "game-started");
        gameStartToastShown.current = true;
      }
    };

    const handlePlayerJoined = (data) => {
      console.log("Player joined event:", data);
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
        setTimeout(() => {
          playerJoinedToastShown.current.delete(data.player.userId);
        }, 5000);
      }
    };

    const handlePlayerLeft = (data) => {
      console.log("Player left event received:", data);

      // Prevent duplicate toasts for the same player leaving
      const playerLeftKey = `${data.userId}-${Date.now()}`;
      if (playerLeftToastShown.current.has(data.userId)) {
        return; // Already shown toast for this player
      }
      playerLeftToastShown.current.add(data.userId);

      // Update players list
      setPlayers((prevPlayers) => {
        const updatedPlayers = prevPlayers.filter(
          (p) => p.userId !== data.userId
        );

        // If less than 2 players remain, handle game end
        if (
          updatedPlayers.length < 2 &&
          gameStatus === "playing" &&
          !gamePausedForCurrentState.current
        ) {
          console.log(
            "Not enough players to continue game - showing pause toast from player left"
          );
          setGameStatus("waiting");
          addToast("Game paused - waiting for more players", "warning");
          gamePausedForCurrentState.current = true;
          gamePausedToastShown.current = true;

          // Reset the flags after a delay
          setTimeout(() => {
            gamePausedToastShown.current = false;
            gamePausedForCurrentState.current = false;
          }, 5000);

          // If current user is the only one left, show appropriate message
          if (
            updatedPlayers.length === 1 &&
            updatedPlayers[0].userId === user?.id
          ) {
            addToast(
              "You are the only player left. Waiting for others to join...",
              "info"
            );
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
      setTimeout(() => {
        playerLeftToastShown.current.delete(data.userId);
      }, 5000);
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
        addToast("You found a match!", "success");
      } else {
        const playerName =
          players.find((p) => p.userId === playerId)?.username || "Opponent";
        addToast(`${playerName} found a match!`, "info");
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
      setCurrentTurn(data.playerId);

      if (data.playerId === user?.id) {
        addToast("It's your turn!", "info");
      } else {
        // Check if this turn change was due to using the last extra turn
        const previousPlayer = data.previousPlayerId;
        if (previousPlayer === user?.id) {
          addToast(
            "Your extra turns are finished. Turn passed to next player.",
            "info"
          );
        }
      }
    };

    const handleTurnContinue = (data) => {
      console.log("=== TURN CONTINUE EVENT RECEIVED ===");
      console.log("Turn continue event received:", data);
      console.log("Setting currentTurn to:", data.currentPlayer);
      console.log("Previous currentTurn was:", currentTurn);

      // Keep the same player's turn active
      setCurrentTurn(data.currentPlayer);

      // Set timestamp to prevent game-state from overriding this turn
      window.lastTurnContinueTime = Date.now();
      console.log("Set lastTurnContinueTime to:", window.lastTurnContinueTime);

      if (data.currentPlayer === user?.id) {
        if (data.reason === "extra_turn_used") {
          addToast(
            `Extra turn used! ${
              data.remainingExtraTurns || 0
            } extra turns remaining.`,
            "info"
          );
        } else if (data.reason === "extra_turn_powerup_used") {
          addToast(
            `Extra turn power-up activated! You now have ${
              data.remainingExtraTurns || 0
            } extra turns available.`,
            "success"
          );
        } else if (data.reason === "match_found") {
          addToast(
            `Great match! You get another turn! ${
              data.remainingExtraTurns || 0
            } extra turns available.`,
            "success"
          );
        } else if (data.reason === "powerup_used") {
          addToast(
            `Power-up used! You still have ${
              data.remainingExtraTurns || 0
            } extra turns available.`,
            "info"
          );
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
          addToast("Congratulations! You won the game! 🎉", "success");
        } else {
          addToast("Game Over! Better luck next time!", "info");
        }
      } else {
        // No winners (e.g., Blitz mode timeout with no matches)
        addToast("Time's up! No one found any matches.", "info");
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

      addToast("Sudden Death Mode! Find the last pair to win!", "warning");
    };

    const handleChatMessage = (data) => {
      setChatMessages((prev) => [...prev, data]);
      // Scroll to bottom of chat
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };

    const handleError = (error) => {
      console.error("Socket error:", error);

      // Handle specific error cases
      if (error.message?.includes("room") || error.message?.includes("game")) {
        addToast("Game room error. Redirecting to lobby...", "error");
        setTimeout(() => {
          navigate("/lobby");
        }, 2000);
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

          // Hide notification after 3 seconds
          setTimeout(() => {
            setShowPowerUpNotification(false);
            setNewPowerUp(null);
          }, 3000);

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
        setTimeout(() => setIsPeekActive(false), data.duration || 3000);
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
          }, 500); // Animation duration
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
      setTimeout(() => {
        addToast("🔄 Cards swapped with animation!", "info");
      }, 100);
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
            }, 3000);
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
          setTimeout(() => {
            timerElement.classList.remove("frozen");
          }, 10000);
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
          setTimeout(() => {
            addToast("🔄 Cards shuffled with animation!", "info");
          }, 100);
        } else {
          console.log(
            "No board data received, falling back to game state refresh"
          );
          // Fallback: force a refresh of the game state
          if (socket) {
            socket.emit("get-game-state");
          }
          setTimeout(() => {
            addToast("🔄 Cards shuffled with animation!", "info");
          }, 100);
        }
      }, 800); // Shuffle animation duration
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
    const gameStartedTimeout = setTimeout(() => {
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
          setGameStatus("playing");
        }
      }

      // Additional check: if gameStatus is "playing" but currentTurn is null
      if (gameStatus === "playing" && !currentTurn && players.length > 0) {
        console.log(
          "WARNING: Game is playing but currentTurn is null, setting to first player"
        );
        setCurrentTurn(players[0].userId);
      }
    }, 5000); // 5 second timeout
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

    // Cleanup function
    return () => {
      clearTimeout(gameStartedTimeout);
      gameStartToastShown.current = false;
      gamePausedToastShown.current = false;
      gamePausedForCurrentState.current = false;
      playerLeftToastShown.current.clear();
      playerJoinedToastShown.current.clear();

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
      revealOne: "Permanently reveal one card - Break deadlocks!",
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

  const leaveGame = () => {
    if (socket) {
      socket.emit("leave-room");
    }
    navigate("/lobby");
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4'></div>
          <p className='text-gray-600 dark:text-gray-400'>Loading game...</p>
        </div>
      </div>
    );
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
        {/* Header */}
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4'>
          <button
            onClick={leaveGame}
            className='flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors'
          >
            <ArrowLeftIcon className='h-5 w-5 mr-2' />
            Back to Lobby
          </button>

          <div className='text-center sm:text-right'>
            <h2 className='text-lg font-medium text-gray-900 dark:text-white'>
              Room:{" "}
              <span className='font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded'>
                {roomId}
              </span>
            </h2>
            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
              {gameStatus === "waiting" && "Waiting for players..."}
              {gameStatus === "starting" && "Game is starting..."}
              {gameStatus === "playing" &&
                (() => {
                  console.log(
                    "Rendering turn display - currentTurn:",
                    currentTurn,
                    "players:",
                    players
                  );
                  const currentPlayer = players.find(
                    (p) => p.userId === currentTurn
                  );
                  console.log("Found current player:", currentPlayer);
                  if (currentPlayer) {
                    return `${currentPlayer.username}'s turn`;
                  } else if (currentTurn) {
                    return `Player ${currentTurn}'s turn`;
                  } else {
                    return "Waiting for turn...";
                  }
                })()}
              {gameStatus === "sudden-death" && "Sudden Death Mode!"}
              {gameStatus === "completed" && "Game completed"}
            </p>
            {(gameStatus === "playing" || gameStatus === "sudden-death") && (
              <div className='flex items-center justify-center space-x-4 mt-2 text-sm'>
                {timeLeft !== null && timeLeft !== undefined && (
                  <div className='flex items-center space-x-2 timer-frozen'>
                    <ClockIcon className='h-4 w-4 text-blue-500' />
                    <span
                      className='font-mono font-semibold transition-all duration-300'
                      style={{
                        filter: "drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))",
                      }}
                    >
                      {timeLeft}s
                    </span>
                  </div>
                )}
                <div className='flex items-center space-x-2'>
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    className='w-2 h-2 bg-green-500 rounded-full'
                  />
                  <span className='text-green-600 dark:text-green-400'>
                    {gameStatus === "sudden-death" ? "Sudden Death!" : "Active"}
                  </span>
                </div>
                {game?.settings?.powerUpsEnabled && (
                  <div className='flex items-center space-x-2'>
                    <span className='text-purple-500'>⚡</span>
                    <span className='text-purple-600 dark:text-purple-400'>
                      Power-ups: {powerUps.length}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
          {/* Main Game Area */}
          <div className='lg:col-span-3'>
            {/* Players */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-8'>
              {players.map((player) => (
                <div
                  key={player.userId}
                  className={`flex items-center p-4 rounded-lg border-2 transition-all ${
                    currentTurn === player.userId
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-lg"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className='flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-lg overflow-hidden'>
                    {player.avatar && player.avatar.startsWith("http") ? (
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
                        player.avatar && player.avatar.startsWith("http")
                          ? "hidden"
                          : "flex"
                      }
                    >
                      {player.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className='ml-4 flex-grow'>
                    <p className='text-base font-medium text-gray-900 dark:text-white flex items-center gap-2'>
                      {player.username}
                      {player.userId === user?.id && (
                        <span className='px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full font-medium'>
                          You
                        </span>
                      )}
                      {currentTurn === player.userId && (
                        <motion.span
                          className='px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full font-medium'
                          animate={{
                            scale: [1, 1.1, 1],
                            boxShadow: [
                              "0 0 0 0 rgba(59, 130, 246, 0.4)",
                              "0 0 0 10px rgba(59, 130, 246, 0)",
                              "0 0 0 0 rgba(59, 130, 246, 0)",
                            ],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                          }}
                        >
                          Current Turn
                        </motion.span>
                      )}
                    </p>
                    <div className='flex items-center justify-between mt-1'>
                      <p className='text-sm text-gray-500 dark:text-gray-400'>
                        Score:{" "}
                        <span className='font-semibold'>
                          {player.score || 0}
                        </span>{" "}
                        pairs
                      </p>
                      <p className='text-sm text-gray-500 dark:text-gray-400'>
                        Matches:{" "}
                        <span className='font-semibold'>
                          {player.matches || 0}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Power-ups Section */}
            {(game?.settings?.powerUpsEnabled || powerUps.length > 0) && (
              <div className='mb-6'>
                <div className='flex items-center justify-between mb-3'>
                  <h3 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center'>
                    <span className='text-purple-500 mr-2'>⚡</span>
                    Your Power-ups
                  </h3>
                  <div className='flex items-center gap-2'>
                    <div className='text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded'>
                      {powerUps.length} available
                    </div>
                    <button
                      onClick={() => setShowPowerUpTutorial(true)}
                      className='text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline'
                    >
                      Help
                    </button>
                    <button
                      onClick={() => setShowPowerUpTutorial(true)}
                      className='text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50'
                    >
                      Manual
                    </button>
                  </div>
                </div>
                {powerUps.length > 0 ? (
                  <>
                    <div className='flex flex-wrap gap-2'>
                      {powerUps.map((powerUp, index) => (
                        <motion.button
                          key={`${powerUp.type}-${index}`}
                          onClick={() => handlePowerUpClick(powerUp)}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 shadow-lg ${getPowerUpButtonStyle(
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

                    {/* Swap mode indicator and cancel button */}
                    {swapMode && (
                      <div className='mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center space-x-2'>
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

                    {/* Reveal mode indicator and cancel button */}
                    {revealMode && (
                      <div className='mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center space-x-2'>
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

                    <div className='mt-2 text-xs text-gray-600 dark:text-gray-400'>
                      💡 <strong>Strategy:</strong> {getPowerUpStrategy()}
                    </div>
                  </>
                ) : (
                  <div className='text-center py-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
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
              <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>
                    {gameStatus === "sudden-death"
                      ? "Sudden Death Board"
                      : "Memory Game Board"}
                  </h3>
                  {(gameStatus === "playing" ||
                    gameStatus === "sudden-death") && (
                    <div className='flex items-center space-x-3'>
                      <div className='text-sm text-gray-600 dark:text-gray-400'>
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
                      </div>
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
                <div className='grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 sm:gap-4 relative'>
                  {cards.map((card) => (
                    <motion.div
                      key={`card-${card.id}`}
                      className={`aspect-square rounded-lg shadow-md flex items-center justify-center text-2xl sm:text-3xl md:text-4xl cursor-pointer transition-all duration-300 relative ${
                        card.isMatched
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 opacity-60"
                          : card.isFlipped
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                          : card.isRevealed
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                          : selectedCardsForSwap.includes(card.id)
                          ? "bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 border-2 border-purple-500"
                          : swapMode && !card.isMatched
                          ? "bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-700 dark:to-purple-800 text-purple-600 dark:text-purple-300 hover:from-purple-200 hover:to-purple-300 dark:hover:from-purple-600 dark:hover:to-purple-700"
                          : revealMode && !card.isMatched && !card.isFlipped
                          ? "bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-700 dark:to-yellow-800 text-yellow-600 dark:text-yellow-300 hover:from-yellow-200 hover:to-yellow-300 dark:hover:from-yellow-600 dark:hover:to-yellow-700"
                          : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-400 dark:text-gray-500 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700"
                      } ${
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
                    >
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
                          className='absolute inset-0 rounded-lg border-2 border-purple-400/50'
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
                          <span className='text-lg'>{card.value}</span>
                        </motion.div>
                      )}

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
                      ) : (
                        "?"
                      )}
                    </motion.div>
                  ))}
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

          {/* Chat Sidebar */}
          <div className='lg:col-span-1'>
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 h-full'>
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

              <div className={`${showChat ? "block" : "hidden"} lg:block`}>
                {/* Chat Messages */}
                <div className='h-64 overflow-y-auto p-4 space-y-3'>
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
                  <p className='text-xs text-gray-500 dark:text-gray-400 mt-2 text-center'>
                    Press Enter to send
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
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

                <button
                  onClick={() => {
                    setShowGameResults(false);
                    // Option to play again or stay in current room
                  }}
                  className='px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors transform hover:scale-105'
                >
                  Close
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
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Floating Power-up Manual Button */}
      {(game?.settings?.powerUpsEnabled || powerUps.length > 0) && (
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
    </div>
  );
};

export default Game;
