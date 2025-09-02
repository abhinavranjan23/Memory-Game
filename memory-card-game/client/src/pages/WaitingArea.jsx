import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../contexts/SocketContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  UserGroupIcon,
  ArrowLeftIcon,
  ClockIcon,
  PlayIcon,
  Cog6ToothIcon,
  SparklesIcon,
  FireIcon,
  TrophyIcon,
  PuzzlePieceIcon,
  BoltIcon,
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
  const [showRoomInfo, setShowRoomInfo] = useState(false);

  useEffect(() => {
    if (socket) {
      hasJoinedRef.current = true;
    }

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

    const handleRoomJoined = (data) => {
      console.log("WaitingArea: room-joined event received", data);
      setLoading(false);
      setRoom(data.game);
      setPlayers(data.game.players || []);
    };

    const handlePlayerJoined = (data) => {
      console.log("WaitingArea: player-joined event received", data);
      setPlayers((prevPlayers) => {
        const existingPlayerIndex = prevPlayers.findIndex(
          (p) => p.userId === data.player.userId
        );

        if (existingPlayerIndex >= 0) {
          const newPlayers = [...prevPlayers];
          newPlayers[existingPlayerIndex] = {
            ...newPlayers[existingPlayerIndex],
            ...data.player,
          };
          return newPlayers;
        } else {
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

      if (
        error?.message?.includes("Failed to start game") ||
        error?.message?.includes("Game not active") ||
        error?.message?.includes("already started")
      ) {
        return;
      }

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

    socket.off("room-joined", handleRoomJoined);
    socket.off("player-joined", handlePlayerJoined);
    socket.off("game-started", handleGameStarted);
    socket.off("game-start", handleGameStart);
    socket.off("error", handleError);
    socket.off("join-room-error", handleJoinRoomError);

    socket.on("room-joined", handleRoomJoined);
    socket.on("player-joined", handlePlayerJoined);
    socket.on("game-started", handleGameStarted);
    socket.on("game-start", handleGameStart);
    socket.on("error", handleError);
    socket.on("join-room-error", handleJoinRoomError);

    return () => {
      socket.off("room-joined", handleRoomJoined);
      socket.off("player-joined", handlePlayerJoined);
      socket.off("game-started", handleGameStarted);
      socket.off("game-start", handleGameStart);
      socket.off("error", handleError);
      socket.off("join-room-error", handleJoinRoomError);
    };
  }, [socket, roomId]);

  const leaveRoom = () => {
    if (socket) {
      socket.emit("leave-room");
    }
    navigate("/lobby");
  };

  const getGameModeIcon = (mode) => {
    switch (mode) {
      case "blitz":
        return <ClockIcon className='h-5 w-5' />;
      case "sudden-death":
        return <FireIcon className='h-5 w-5' />;
      case "powerup-frenzy":
        return <BoltIcon className='h-5 w-5' />;
      default:
        return <TrophyIcon className='h-5 w-5' />;
    }
  };

  const getBoardSizeIcon = (size) => {
    return <PuzzlePieceIcon className='h-5 w-5' />;
  };

  if (loading) {
    return <GameLoadingScreen />;
  }

  const progressPercentage = Math.min(
    (players.length / (room?.settings?.maxPlayers || 2)) * 100,
    100
  );

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900'>
      {/* Floating Header */}
      <div className='fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700'>
        <div className='max-w-4xl mx-auto px-4 py-3 flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className='w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center'
            >
              <UserGroupIcon className='h-5 w-5 text-white' />
            </motion.div>
            <div>
              <h1 className='text-lg font-bold text-gray-900 dark:text-white'>
                Waiting Room
              </h1>
              <p className='text-xs text-gray-600 dark:text-gray-400'>
                Room: {roomId}
              </p>
            </div>
          </div>

          <button
            onClick={leaveRoom}
            className='px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105 active:scale-95'
          >
            <ArrowLeftIcon className='h-4 w-4 inline mr-2' />
            Leave
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className='pt-20 pb-6 px-4'>
        <div className='max-w-4xl mx-auto space-y-6'>
          {/* Auto-start Banner */}
          <AnimatePresence>
            {room && players.length >= (room.settings?.maxPlayers || 2) && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className='bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-2xl p-6 text-center shadow-lg'
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className='w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3'
                >
                  <PlayIcon className='h-6 w-6' />
                </motion.div>
                <h2 className='text-xl font-bold mb-2'>Room is Full!</h2>
                <p className='text-green-100'>
                  Game will start automatically...
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress Section */}
          <div className='bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700'>
            <div className='flex items-center justify-between mb-4'>
              <div className='flex items-center space-x-3'>
                <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center'>
                  <ClockIcon className='h-5 w-5 text-blue-600 dark:text-blue-400' />
                </div>
                <div>
                  <h3 className='font-semibold text-gray-900 dark:text-white'>
                    {players.length >= (room?.settings?.maxPlayers || 2)
                      ? "Starting Game..."
                      : "Waiting for Players"}
                  </h3>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    {players.length} of {room?.settings?.maxPlayers || 2}{" "}
                    players
                  </p>
                </div>
              </div>

              <div className='text-right'>
                <div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
                  {players.length}
                </div>
                <div className='text-sm text-gray-500 dark:text-gray-400'>
                  / {room?.settings?.maxPlayers || 2}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden'>
              <motion.div
                className='h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full'
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>

            {/* Animated Dots */}
            {players.length < (room?.settings?.maxPlayers || 2) && (
              <div className='flex items-center justify-center mt-4 space-x-1'>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className='w-2 h-2 bg-blue-400 rounded-full'
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Players Section */}
          <div className='bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700'>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-xl font-semibold text-gray-900 dark:text-white flex items-center'>
                <UserGroupIcon className='h-6 w-6 mr-3 text-purple-600 dark:text-purple-400' />
                Players
              </h2>
              <div className='text-sm text-gray-500 dark:text-gray-400'>
                {players.length}/{room?.settings?.maxPlayers || 2}
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              {/* Current Players */}
              <AnimatePresence>
                {players.map((player, index) => (
                  <motion.div
                    key={player.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className='bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 border border-blue-200 dark:border-blue-800'
                  >
                    <div className='flex items-center space-x-3'>
                      <div className='relative'>
                        <div className='w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg'>
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

                        {/* Status Indicators */}
                        {player.isReady && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className='absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800'
                          />
                        )}
                        {player.isHost && (
                          <div className='absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center'>
                            <span className='text-xs text-white font-bold'>
                              H
                            </span>
                          </div>
                        )}
                      </div>

                      <div className='flex-1 min-w-0'>
                        <p className='font-semibold text-gray-900 dark:text-white truncate'>
                          {player.username}
                        </p>
                        <div className='flex items-center space-x-2 mt-1'>
                          {player.userId === user?.id && (
                            <span className='px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full font-medium'>
                              You
                            </span>
                          )}
                          <span className='text-xs text-gray-500 dark:text-gray-400'>
                            {player.isHost ? "Host" : "Player"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Empty Slots */}
              {Array.from({
                length: (room?.settings?.maxPlayers || 2) - players.length,
              }).map((_, index) => (
                <motion.div
                  key={`empty-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 0.5, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className='bg-gray-100 dark:bg-gray-700 rounded-xl p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center'
                >
                  <div className='text-center'>
                    <div className='w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mb-2 flex items-center justify-center'>
                      <UserGroupIcon className='h-6 w-6 text-gray-500 dark:text-gray-400' />
                    </div>
                    <p className='text-sm text-gray-500 dark:text-gray-400 font-medium'>
                      Waiting for player...
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Room Info Toggle */}
          <div className='text-center'>
            <button
              onClick={() => setShowRoomInfo(!showRoomInfo)}
              className='inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-all duration-200 hover:scale-105'
            >
              <Cog6ToothIcon className='h-4 w-4 mr-2' />
              {showRoomInfo ? "Hide" : "Show"} Room Details
            </button>
          </div>

          {/* Room Information */}
          <AnimatePresence>
            {showRoomInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className='bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden'
              >
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                  Room Settings
                </h3>
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                  <div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-4'>
                    <div className='flex items-center space-x-2 mb-2'>
                      {getGameModeIcon(room?.settings?.gameMode)}
                      <span className='text-sm text-gray-500 dark:text-gray-400'>
                        Mode
                      </span>
                    </div>
                    <p className='font-semibold text-gray-900 dark:text-white'>
                      {room?.settings?.gameMode?.charAt(0).toUpperCase() +
                        room?.settings?.gameMode?.slice(1) || "Classic"}
                    </p>
                  </div>

                  <div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-4'>
                    <div className='flex items-center space-x-2 mb-2'>
                      {getBoardSizeIcon(room?.settings?.boardSize)}
                      <span className='text-sm text-gray-500 dark:text-gray-400'>
                        Board
                      </span>
                    </div>
                    <p className='font-semibold text-gray-900 dark:text-white'>
                      {room?.settings?.boardSize || "4x4"}
                    </p>
                  </div>

                  <div className='bg-gray-50 dark:bg-gray-700 rounded-lg p-4'>
                    <div className='flex items-center space-x-2 mb-2'>
                      <SparklesIcon className='h-5 w-5' />
                      <span className='text-sm text-gray-500 dark:text-gray-400'>
                        Power-ups
                      </span>
                    </div>
                    <p className='font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                      {room?.settings?.powerUpsEnabled ? (
                        <>
                          <span className='text-purple-500'>⚡</span>
                          <span>Enabled</span>
                        </>
                      ) : (
                        <span className='text-gray-500 dark:text-gray-400'>
                          Disabled
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default WaitingArea;
