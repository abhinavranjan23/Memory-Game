import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../contexts/SocketContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import { motion } from "framer-motion";
import axios from "axios";
import {
  UserGroupIcon,
  ArrowLeftIcon,
  ClockIcon,
  PlayIcon,
  CrownIcon,
} from "@heroicons/react/24/outline";
import GameLoadingScreen from "../components/GameLoadingScreen";

const WaitingArea = () => {
  const { roomId } = useParams();
  const { socket, joinRoom } = useSocket();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const hasJoinedRef = useRef(false);

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    // Don't automatically join - the user should already be in the room when they navigate here
    // Just set the joined flag to prevent duplicate joins
    if (socket) {
      hasJoinedRef.current = true;
    }

    // Fallback: If we don't receive room data within 2 seconds, try to fetch it
    const fallbackTimer = setTimeout(async () => {
      if (loading) {
        try {
          const response = await axios.get(`/game/${roomId}`);
          setRoom(response.data.game);
          setPlayers(response.data.game.players || []);
          setLoading(false);
        } catch (error) {
          console.error("Failed to fetch room data:", error);
          addToast("Failed to load room data", "error");
          navigate("/lobby");
        }
      }
    }, 2000);

    return () => clearTimeout(fallbackTimer);
  }, [socket, roomId, loading, navigate, addToast]);

  useEffect(() => {
    if (!socket) return;

    // Event handlers
    const handleRoomJoined = (data) => {
      console.log("WaitingArea: room-joined event received", data);
      setLoading(false);
      setRoom(data.game);
      setPlayers(data.game.players || []);
    };

    const handlePlayerJoined = (data) => {
      console.log("WaitingArea: player-joined event received", data);
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
          // Add new player (no toast here - Game.jsx will handle it)
          return [...prevPlayers, data.player];
        }
      });
    };

    const handleGameStarted = (data) => {
      console.log("WaitingArea: game-started event received", data);
      navigate(`/game/${roomId}`);
    };

    const handleGameStart = (data) => {
      console.log("WaitingArea: game-start event received", data);
      navigate(`/game/${roomId}`);
    };

    const handleError = (error) => {
      console.log("WaitingArea: error event received", error);
      // Don't show temporary start-game errors to the user
      if (
        error?.message?.includes("Failed to start game") ||
        error?.message?.includes("Game not active") ||
        error?.message?.includes("already started")
      ) {
        return;
      }

      // Handle password errors by redirecting to lobby
      if (error?.message?.includes("Invalid room password")) {
        addToast("Invalid room password. Redirecting to lobby...", "error");
        setTimeout(() => {
          navigate("/lobby");
        }, 2000);
        return;
      }

      addToast(error.message || "An error occurred", "error");
    };

    const handleJoinRoomError = (error) => {
      console.log("WaitingArea: join-room-error event received", error);
      // Handle join room errors (like invalid password)
      if (error?.message?.includes("Invalid room password")) {
        addToast("Invalid room password. Redirecting to lobby...", "error");
        setTimeout(() => {
          navigate("/lobby");
        }, 2000);
        return;
      }

      addToast(error.message || "Failed to join room", "error");
      setTimeout(() => {
        navigate("/lobby");
      }, 2000);
    };

    // Clear any existing listeners first
    socket.off("room-joined", handleRoomJoined);
    socket.off("player-joined", handlePlayerJoined);
    socket.off("game-started", handleGameStarted);
    socket.off("game-start", handleGameStart);
    socket.off("error", handleError);
    socket.off("join-room-error", handleJoinRoomError);

    // Register event listeners
    socket.on("room-joined", handleRoomJoined);
    socket.on("player-joined", handlePlayerJoined);
    socket.on("game-started", handleGameStarted);
    socket.on("game-start", handleGameStart);
    socket.on("error", handleError);
    socket.on("join-room-error", handleJoinRoomError);

    // Cleanup function
    return () => {
      socket.off("room-joined", handleRoomJoined);
      socket.off("player-joined", handlePlayerJoined);
      socket.off("game-started", handleGameStarted);
      socket.off("game-start", handleGameStart);
      socket.off("error", handleError);
      socket.off("join-room-error", handleJoinRoomError);
    };
  }, [socket, roomId]); // Removed addToast and navigate from dependencies

  const leaveRoom = () => {
    if (socket) {
      socket.emit("leave-room");
    }
    navigate("/lobby");
  };

  if (loading) {
    return <GameLoadingScreen />;
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='max-w-4xl mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg'>
        <div className='flex justify-between items-center mb-6'>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
            Waiting for Players
          </h1>
          <button
            onClick={leaveRoom}
            className='inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 
                     dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white 
                     rounded-lg font-medium transition-colors duration-200'
          >
            <ArrowLeftIcon className='h-4 w-4 mr-2' />
            Leave Room
          </button>
        </div>

        {/* Auto-start notification */}
        {room && players.length >= (room.settings?.maxPlayers || 2) && (
          <div className='text-center mb-6'>
            <div className='px-8 py-3 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 font-semibold rounded-lg'>
              Room is full! Game will start automatically...
            </div>
            <p className='text-sm text-gray-500 mt-2'>
              Please wait while the game initializes...
            </p>
          </div>
        )}

        {/* Progress indicator */}
        <div className='bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6'>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center'>
              <ClockIcon className='h-6 w-6 text-blue-500 mr-3' />
              <p className='text-blue-700 dark:text-blue-300 font-medium'>
                {players.length >= (room?.settings?.maxPlayers || 2)
                  ? "Room is full! Game will start automatically."
                  : "Waiting for more players to join..."}
              </p>
            </div>
            <div className='text-sm text-blue-600 dark:text-blue-400'>
              {players.length}/{room?.settings?.maxPlayers || 2}
            </div>
          </div>

          <div className='w-full bg-blue-200 dark:bg-blue-800 rounded-full h-3'>
            <motion.div
              className='bg-blue-500 h-3 rounded-full transition-all duration-500'
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(
                  (players.length / (room?.settings?.maxPlayers || 2)) * 100,
                  100
                )}%`,
              }}
            />
          </div>

          {players.length < (room?.settings?.maxPlayers || 2) && (
            <div className='flex items-center mt-2'>
              <span className='inline-block mr-2'>
                <span className='animate-pulse'>.</span>
                <span className='animate-pulse delay-100'>.</span>
                <span className='animate-pulse delay-200'>.</span>
              </span>
            </div>
          )}
        </div>

        <div className='mb-6'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-3'>
            Room Information
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                Room ID
              </p>
              <p className='font-medium text-gray-900 dark:text-white font-mono bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded'>
                {roomId}
              </p>
            </div>
            <div className='p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                Game Mode
              </p>
              <p className='font-medium text-gray-900 dark:text-white'>
                {room?.settings?.gameMode?.charAt(0).toUpperCase() +
                  room?.settings?.gameMode?.slice(1) || "Classic"}
              </p>
            </div>
            <div className='p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                Board Size
              </p>
              <p className='font-medium text-gray-900 dark:text-white'>
                {room?.settings?.boardSize || "4x4"}
              </p>
            </div>
            <div className='p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                Max Players
              </p>
              <p className='font-medium text-gray-900 dark:text-white'>
                {room?.settings?.maxPlayers || 2}
              </p>
            </div>
            <div className='p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                Power-ups
              </p>
              <p className='font-medium text-gray-900 dark:text-white flex items-center gap-2'>
                {room?.settings?.powerUpsEnabled ? (
                  <>
                    <span className='text-purple-500'>⚡</span>
                    <span className='text-purple-600 dark:text-purple-400'>
                      Enabled
                    </span>
                  </>
                ) : (
                  <span className='text-gray-500 dark:text-gray-400'>
                    Disabled
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center'>
            <UserGroupIcon className='h-5 w-5 mr-2' />
            Players ({players.length}/{room?.settings?.maxPlayers || 2})
          </h2>
          <div className='space-y-3'>
            {players.map((player) => (
              <motion.div
                key={player.userId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className='flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600'
              >
                <div className='h-10 w-10 rounded-full overflow-hidden mr-3 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold'>
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
                <div className='flex-grow'>
                  <p className='font-medium text-gray-900 dark:text-white flex items-center gap-2'>
                    {player.username}
                    {player.userId === user?.id && (
                      <span className='px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full font-medium'>
                        You
                      </span>
                    )}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {player.userId === user?.id ? "You" : "Opponent"}
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  {player.isReady && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className='w-3 h-3 bg-green-500 rounded-full'
                    />
                  )}
                  {player.isHost && (
                    <span className='px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs rounded-full'>
                      Host
                    </span>
                  )}
                </div>
              </motion.div>
            ))}

            {Array.from({
              length: (room?.settings?.maxPlayers || 2) - players.length,
            }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className='flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg opacity-50 border border-gray-200 dark:border-gray-600'
              >
                <div className='h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 mr-3 flex items-center justify-center'>
                  <UserGroupIcon className='h-6 w-6 text-gray-400 dark:text-gray-500' />
                </div>
                <p className='font-medium text-gray-400 dark:text-gray-500'>
                  Waiting for player...
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingArea;
