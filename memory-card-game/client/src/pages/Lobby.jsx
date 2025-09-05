import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useSocket } from "../contexts/SocketContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import useErrorHandler from "../hooks/useErrorHandler.js";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  PlusIcon,
  UsersIcon,
  LockClosedIcon,
  LockOpenIcon,
  PlayIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  ClockIcon,
  TrophyIcon,
  FireIcon,
  EyeIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import GameLoadingScreen from "../components/GameLoadingScreen";

const Lobby = () => {
  const { user } = useAuth();
  const { socket, joinRoom } = useSocket();
  const { addToast } = useToast();
  const { handleError, handleApiCall } = useErrorHandler();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomPassword, setRoomPassword] = useState("");
  const [joinLoading, setJoinLoading] = useState(null);
  const [activePlayers, setActivePlayers] = useState(0);

  // Create room form state
  const [createForm, setCreateForm] = useState({
    isPrivate: false,
    password: "",
    maxPlayers: 2,
    boardSize: "4x4",
    gameMode: "classic",
    theme: "emojis",
    powerUpsEnabled: false, // Default to false for classic mode
    timeLimit: 60,
  });

  const boardSizes = [
    { value: "4x4", label: "4×4 (Easy)", pairs: 8 },
    { value: "6x6", label: "6×6 (Medium)", pairs: 18 },
    { value: "8x8", label: "8×8 (Hard)", pairs: 32 },
  ];

  const gameModes = [
    {
      value: "classic",
      label: "Classic",
      description: "Turn-based memory matching",
    },
    {
      value: "blitz",
      label: "Blitz",
      description: "Fast-paced time challenge",
    },
    {
      value: "sudden-death",
      label: "Sudden Death",
      description: "One mistake elimination",
    },
    {
      value: "powerup-frenzy",
      label: "Power-Up Frenzy",
      description: "Enhanced gameplay with special abilities",
    },
  ];

  const themes = [
    { value: "emojis", label: "Emojis", preview: ["🎮", "🎯", "🎲", "🎪"] },
    { value: "animals", label: "Animals", preview: ["🐶", "🐱", "🐭", "🐹"] },
    { value: "tech", label: "Tech", preview: ["💻", "📱", "🖥️", "⌨️"] },
    { value: "nature", label: "Nature", preview: ["🌲", "🌺", "🌙", "⭐"] },
    { value: "food", label: "Food", preview: ["🍕", "🍔", "🍰", "🍎"] },
  ];
  useEffect(() => {
    fetchRooms();
    if (!socket) return;

    // Always clear old listeners first to prevent stacking
    socket.off("room-updated", handleRoomUpdate);
    socket.off("room-deleted", handleRoomDelete);
    socket.off("room-joined", handleJoinedRoom);
    socket.off("join-room-error", handleJoinError);
    socket.off("error", handleJoinError);
    socket.off("active-players", handleActivePlayers);
    socket.off("join-room-received");

    // Now add fresh listeners
    socket.on("room-updated", handleRoomUpdate);
    socket.on("room-deleted", handleRoomDelete);
    socket.on("room-joined", handleJoinedRoom);
    socket.on("join-room-error", handleJoinError);
    socket.on("error", handleJoinError);
    socket.on("active-players", handleActivePlayers);
    socket.on("join-room-received", (data) => {
      console.log("Join room request received by server:", data);
      addToast("Connecting to room...", "info");
    });

    socket.emit("get-rooms");

    // Request active players count with a small delay to ensure socket is ready
    setTimeout(() => {
      socket.emit("get-active-players");
    }, 100);

    const refreshInterval = setInterval(() => {
      socket.emit("get-rooms");
    }, 5000);

    return () => {
      clearInterval(refreshInterval);
      socket.off("room-updated", handleRoomUpdate);
      socket.off("room-deleted", handleRoomDelete);
      socket.off("room-joined", handleJoinedRoom);
      socket.off("join-room-error", handleJoinError);
      socket.off("error", handleJoinError);
      socket.off("active-players", handleActivePlayers);
      socket.off("join-room-received");
    };
  }, [socket]); // Keep only socket as dependency

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/game/rooms");
      setRooms(response.data.rooms);
    } catch (error) {
      handleError(error, "Failed to load game rooms");
    } finally {
      setLoading(false);
    }
  };

  const refreshRooms = async () => {
    setRefreshing(true);
    await fetchRooms();
    setRefreshing(false);
    addToast("Rooms refreshed successfully", "success");
  };

  const handleRoomUpdate = (updatedRoom) => {
    setRooms((prevRooms) => {
      const existingRoomIndex = prevRooms.findIndex(
        (r) => r.roomId === updatedRoom.roomId
      );

      if (existingRoomIndex >= 0) {
        const updatedRooms = [...prevRooms];
        updatedRooms[existingRoomIndex] = {
          ...updatedRooms[existingRoomIndex],
          ...updatedRoom,
        };
        return updatedRooms;
      } else {
        // Add the room if it doesn't exist yet
        return [...prevRooms, updatedRoom];
      }
    });
  };

  const handleRoomDelete = (roomId) => {
    setRooms((prev) => prev.filter((room) => room.roomId !== roomId));
  };

  const handleJoinedRoom = (data) => {
    console.log("handleJoinedRoom called with data:", data);
    setJoinLoading(null);
    setSelectedRoom(null);
    setRoomPassword("");
    addToast(`Joined room successfully!`, "success");
    // Navigate to waiting area immediately
    console.log("Navigating to waiting area:", `/waiting/${data.roomId}`);
    navigate(`/waiting/${data.roomId}`);
  };

  const handleJoinError = (error) => {
    setJoinLoading(null);
    setSelectedRoom(null);
    setRoomPassword("");

    // Handle specific error cases
    if (error.message && error.message.includes("Invalid room password")) {
      addToast("Invalid room password. Please try again.", "error");
    } else if (error.message && error.message.includes("blocked")) {
      addToast(
        "Your account has been blocked due to suspicious activity. Please contact an administrator.",
        "error"
      );
    } else {
      addToast(error.message || "Failed to join room", "error");
    }
  };

  const handleActivePlayers = (data) => {
    setActivePlayers(data.count);
  };

  const createRoom = async () => {
    try {
      const roomData = {
        isPrivate: createForm.isPrivate,
        password:
          createForm.isPrivate && createForm.password
            ? createForm.password.trim()
            : null,
        settings: {
          maxPlayers: createForm.maxPlayers,
          boardSize: createForm.boardSize,
          gameMode: createForm.gameMode,
          theme: createForm.theme,
          powerUpsEnabled: createForm.powerUpsEnabled,
          timeLimit: ["blitz", "powerup-frenzy"].includes(createForm.gameMode)
            ? createForm.timeLimit
            : null,
        },
      };

      const response = await handleApiCall(
        () => axios.post("/game/create", roomData),
        "Room created successfully!",
        "Failed to create room"
      );

      setShowCreateModal(false);
      setCreateForm({
        isPrivate: false,
        password: "",
        maxPlayers: 2,
        boardSize: "4x4",
        gameMode: "classic",
        theme: "emojis",
        powerUpsEnabled: false, // Default to false for classic mode
        timeLimit: 60,
      });

      // Join the created room and navigate to waiting area
      if (socket) {
        const joinData = { roomId: response.data.game.roomId };
        // Include password if it's a private room
        if (createForm.isPrivate && createForm.password) {
          joinData.password = createForm.password.trim();
        }
        console.log("Attempting to join room with data:", joinData);
        // Use the joinRoom function from SocketContext for proper debouncing
        const success = joinRoom(joinData);
        if (!success) {
          addToast("Failed to join room - Socket not connected", "error");
        } else {
          console.log("Join room request sent successfully");
          // Add timeout for join room response
          const timeoutId = setTimeout(() => {
            console.log("Create room join timeout - navigating anyway");
            addToast("Taking you to the room...", "info");
            navigate(`/waiting/${response.data.game.roomId}`);
          }, 3000); // 3 second timeout

          // Store timeout ID to clear if response comes back
          socket.once("room-joined", () => {
            clearTimeout(timeoutId);
          });
        }
      }
    } catch (error) {
      // Error already handled by handleApiCall
    }
  };

  const joinGameRoom = (room) => {
    if (room.isPrivate) {
      setSelectedRoom(room);
    } else {
      setJoinLoading(room.roomId);
      if (socket) {
        try {
          // Use the joinRoom function from SocketContext
          const success = joinRoom({ roomId: room.roomId });
          if (!success) {
            setJoinLoading(null);
            addToast("Failed to join room - Socket not connected", "error");
          } else {
            // Add timeout for join room response
            const timeoutId = setTimeout(() => {
              console.log("Join room timeout - navigating anyway");
              setJoinLoading(null);
              addToast("Taking you to the room...", "info");
              navigate(`/waiting/${room.roomId}`);
            }, 3000); // 3 second timeout

            // Store timeout ID to clear if response comes back
            socket.once("room-joined", () => {
              clearTimeout(timeoutId);
            });
          }
        } catch (error) {
          setJoinLoading(null);
          addToast(error.message || "Failed to join room", "error");
        }
      } else {
        setJoinLoading(null);
        addToast("Socket connection not available", "error");
      }
    }
  };

  const joinPrivateRoom = () => {
    if (!selectedRoom || !roomPassword.trim()) {
      addToast("Please enter the room password", "warning");
      return;
    }

    setJoinLoading(selectedRoom.roomId);
    if (socket) {
      try {
        // Use the joinRoom function from SocketContext - only emit once
        const success = joinRoom({
          roomId: selectedRoom.roomId,
          password: roomPassword.trim(),
        });

        if (!success) {
          setJoinLoading(null);
          addToast(
            "Failed to join private room - Socket not connected",
            "error"
          );
        } else {
          // Add timeout for join room response
          const timeoutId = setTimeout(() => {
            console.log("Private room join timeout - navigating anyway");
            setJoinLoading(null);
            addToast("Taking you to the room...", "info");
            navigate(`/waiting/${selectedRoom.roomId}`);
          }, 3000); // 3 second timeout

          // Store timeout ID to clear if response comes back
          socket.once("room-joined", () => {
            clearTimeout(timeoutId);
          });
        }
      } catch (error) {
        setJoinLoading(null);
        addToast(error.message || "Failed to join private room", "error");
      }
    } else {
      setJoinLoading(null);
      addToast("Socket connection not available", "error");
    }
  };

  const getGameModeIcon = (mode) => {
    switch (mode) {
      case "classic":
        return "🎯";
      case "blitz":
        return "⏰";
      case "sudden-death":
        return "🔥";
      case "powerup-frenzy":
        return "⚡";
      default:
        return "🎮";
    }
  };

  const getRoomStatusColor = (room) => {
    if (room.playerCount >= room.maxPlayers)
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    if (room.playerCount === room.maxPlayers - 1)
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  };

  return (
    <div className='max-w-7xl mx-auto space-y-6 relative'>
      {/* Background Animation */}
      <motion.div
        className='fixed inset-0 pointer-events-none z-0'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      >
        <div className='absolute top-20 left-20 w-32 h-32 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob'></div>
        <div className='absolute top-40 right-20 w-32 h-32 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000'></div>
        <div className='absolute -bottom-8 left-40 w-32 h-32 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000'></div>
      </motion.div>
      {/* Floating Action Button for Mobile */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, type: "spring" }}
        className='fixed bottom-6 right-6 z-40 sm:hidden'
      >
        <motion.button
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowCreateModal(true)}
          className='group relative w-16 h-16 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white rounded-full shadow-2xl hover:shadow-3xl flex items-center justify-center overflow-hidden'
        >
          <motion.div
            className='absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30'
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
          />
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className='relative z-10'
          >
            <PlusIcon className='h-7 w-7' />
          </motion.div>

          {/* Pulse Ring Effect */}
          <motion.div
            className='absolute inset-0 border-2 border-blue-400 rounded-full'
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 0, 0.7],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.button>
      </motion.div>
      {/* Header - Hidden on Mobile */}
      <div className='hidden sm:flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 sm:p-0'>
        <div className='flex-1'>
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, type: "spring" }}
            className='relative'
          >
            <motion.h1 className='text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 mb-2 flex items-center gap-3'>
              <motion.span
                animate={{
                  y: [0, -8, 0],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className='text-3xl sm:text-4xl'
              >
                🎮
              </motion.span>
              <span className='relative'>
                Game Lobby
                <motion.div
                  className='absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full'
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1, duration: 0.8 }}
                />
              </span>
              <motion.span
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 15, -15, 0],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className='text-2xl bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent'
              >
                ✨
              </motion.span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className='text-gray-600 dark:text-gray-300 text-sm sm:text-base flex items-center gap-2'
            >
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className='w-2 h-2 bg-green-500 rounded-full'
              />
              Join existing rooms or create your own memory challenge
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                className='text-blue-500'
              >
                🚀
              </motion.span>
            </motion.p>
          </motion.div>
        </div>

        <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto'>
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={refreshRooms}
            disabled={refreshing}
            className='group relative inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 
                     hover:from-gray-700 hover:via-gray-800 hover:to-gray-900 text-white rounded-xl font-medium transition-all duration-300
                     focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                     disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-2xl overflow-hidden'
          >
            <motion.div
              className='absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20'
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1 }}
            />
            <ArrowPathIcon
              className={`h-5 w-5 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className='relative z-10'>
              {refreshing ? "Refreshing..." : "Refresh"}
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            className='group relative inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 
                     hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all duration-300
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-2xl overflow-hidden'
          >
            <motion.div
              className='absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20'
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1 }}
            />
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <PlusIcon className='h-5 w-5 mr-2' />
            </motion.div>
            <span className='relative z-10'>Create Room</span>
          </motion.button>
        </div>
      </div>

      {/* Quick Actions for Mobile - Smaller and Minimal */}
      <div className='px-4 sm:px-0 sm:hidden'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className='relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 rounded-xl p-4 text-white shadow-lg'
        >
          <motion.div
            className='absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0'
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
          />
          <div className='relative z-10 flex items-center justify-between'>
            <div>
              <motion.h3
                className='font-semibold text-lg mb-1 flex items-center gap-2'
                whileHover={{ scale: 1.02 }}
              >
                <motion.span
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  🎯
                </motion.span>
                Quick Actions
              </motion.h3>
              <p className='text-xs opacity-90'>Create room or refresh lobby</p>
            </div>
            <div className='flex gap-2'>
              <motion.button
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.9 }}
                onClick={refreshRooms}
                disabled={refreshing}
                className='group p-2.5 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all duration-300'
              >
                <motion.div
                  animate={{ rotate: refreshing ? 360 : 0 }}
                  transition={{
                    duration: refreshing ? 1 : 0,
                    repeat: refreshing ? Infinity : 0,
                    ease: "linear",
                  }}
                >
                  <ArrowPathIcon className='h-5 w-5' />
                </motion.div>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowCreateModal(true)}
                className='group p-2.5 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all duration-300'
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <PlusIcon className='h-5 w-5' />
                </motion.div>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Room Statistics */}
      <div className='grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 px-4 sm:px-0'>
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className='group relative overflow-hidden bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300 cursor-pointer'
          onClick={() =>
            addToast(
              `There are ${rooms.length} active rooms available!`,
              "info"
            )
          }
        >
          <motion.div
            className='absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20'
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
          />
          <div className='relative z-10 flex items-center justify-between'>
            <div className='flex items-center'>
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className='relative'
              >
                <UserGroupIcon className='h-6 w-6 sm:h-10 sm:w-10 mr-2 sm:mr-4' />
                <motion.div
                  className='absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-yellow-400 rounded-full'
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </motion.div>
              <div>
                <p className='text-xs sm:text-sm opacity-90 font-medium mb-1'>
                  Active Rooms
                </p>
                <motion.p
                  key={rooms.length}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className='text-xl sm:text-3xl font-bold'
                >
                  {rooms.length}
                </motion.p>
              </div>
            </div>
            <motion.div
              className='text-right opacity-80 hidden sm:block'
              whileHover={{ scale: 1.1 }}
            >
              <div className='text-xs bg-white bg-opacity-20 px-2 py-1 rounded-lg'>
                Tap for info
              </div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className='group relative overflow-hidden bg-gradient-to-r from-green-500 via-green-600 to-green-700 text-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300 cursor-pointer'
          onClick={() =>
            addToast(
              `There are ${activePlayers} players currently online!`,
              "info"
            )
          }
        >
          <motion.div
            className='absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20'
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
          />
          <div className='relative z-10 flex items-center justify-between'>
            <div className='flex items-center'>
              <motion.div
                animate={{ pulse: true }}
                transition={{ duration: 2, repeat: Infinity }}
                className='relative'
              >
                <UsersIcon className='h-6 w-6 sm:h-10 sm:w-10 mr-2 sm:mr-4' />
                <motion.div
                  className='absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-red-400 rounded-full'
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                />
              </motion.div>
              <div>
                <p className='text-xs sm:text-sm opacity-90 font-medium mb-1'>
                  Players Online
                </p>
                <motion.p
                  key={activePlayers}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className='text-xl sm:text-3xl font-bold'
                >
                  {activePlayers}
                </motion.p>
              </div>
            </div>
            <motion.div
              className='text-right opacity-80 hidden sm:block'
              whileHover={{ scale: 1.1 }}
            >
              <div className='text-xs bg-white bg-opacity-20 px-2 py-1 rounded-lg'>
                Tap for info
              </div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className='group relative overflow-hidden bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300 cursor-pointer col-span-2 lg:col-span-1'
          onClick={() =>
            addToast(
              `There are ${
                rooms.filter((room) => room.isJoinable).length
              } rooms you can join!`,
              "info"
            )
          }
        >
          <motion.div
            className='absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20'
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
          />
          <div className='relative z-10 flex items-center justify-between'>
            <div className='flex items-center'>
              <motion.div
                animate={{ bounce: true }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                className='relative'
              >
                <LockOpenIcon className='h-6 w-6 sm:h-10 sm:w-10 mr-2 sm:mr-4' />
                <motion.div
                  className='absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-pink-400 rounded-full'
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
                />
              </motion.div>
              <div>
                <p className='text-xs sm:text-sm opacity-90 font-medium mb-1'>
                  Open Rooms
                </p>
                <motion.p
                  key={rooms.filter((room) => room.isJoinable).length}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className='text-xl sm:text-3xl font-bold'
                >
                  {rooms.filter((room) => room.isJoinable).length}
                </motion.p>
              </div>
            </div>
            <motion.div
              className='text-right opacity-80 hidden sm:block'
              whileHover={{ scale: 1.1 }}
            >
              <div className='text-xs bg-white bg-opacity-20 px-2 py-1 rounded-lg'>
                Tap for info
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Rooms Grid */}
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mx-4 sm:mx-0'>
        <div className='p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className='text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2'
              >
                <span className='text-blue-600'>🎯</span>
                Active Rooms
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 hidden sm:block'
              >
                {rooms.length} room{rooms.length !== 1 ? "s" : ""} available
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className='hidden sm:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400'
            >
              <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse'></div>
              Live updates every 5s
            </motion.div>
          </div>
        </div>

        {loading ? (
          <GameLoadingScreen />
        ) : rooms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='text-center p-8 sm:p-12'
          >
            <motion.div
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <UserGroupIcon className='h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4' />
            </motion.div>
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className='text-lg sm:text-xl font-medium text-gray-900 dark:text-white mb-2'
            >
              No Active Rooms
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className='text-gray-500 dark:text-gray-400 mb-6 text-sm sm:text-base'
            >
              Be the first to create a room and start playing!
            </motion.p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className='inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 
                       hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium 
                       transition-all duration-200 shadow-lg hover:shadow-xl'
            >
              <PlusIcon className='h-5 w-5 mr-2' />
              Create First Room
            </motion.button>
          </motion.div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-4 sm:p-6'>
            <AnimatePresence>
              {rooms.map((room, index) => (
                <motion.div
                  key={room.roomId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className='group relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-6 hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                >
                  {/* Shimmer Effect */}
                  <motion.div
                    className='absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30'
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      repeatDelay: 3,
                    }}
                  />

                  {/* New Room Indicator */}
                  {room.playerCount === 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className='absolute top-3 right-3 z-10'
                    >
                      <motion.div
                        className='bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg'
                        animate={{
                          scale: [1, 1.1, 1],
                          boxShadow: [
                            "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                            "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        New! 🎉
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Room Status Badge */}
                  <motion.div
                    className='absolute top-3 left-3 z-10'
                    whileHover={{ scale: 1.1 }}
                  >
                    <div
                      className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${
                        room.playerCount >= room.maxPlayers
                          ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                          : room.playerCount === room.maxPlayers - 1
                          ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                          : "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                      }`}
                    >
                      {room.status}
                    </div>
                  </motion.div>
                  {/* Room Header */}
                  <motion.div
                    className='flex items-center justify-between mb-2 sm:mb-4 mt-4 sm:mt-8'
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className='flex items-center gap-2 sm:gap-3'>
                      <motion.div
                        whileHover={{ rotate: 360, scale: 1.2 }}
                        transition={{ duration: 0.5 }}
                        className='relative'
                      >
                        {room.hasPassword ? (
                          <motion.div
                            animate={{
                              boxShadow: [
                                "0 0 0 0 rgba(245, 158, 11, 0.7)",
                                "0 0 0 10px rgba(245, 158, 11, 0)",
                                "0 0 0 0 rgba(245, 158, 11, 0)",
                              ],
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <LockClosedIcon className='h-4 w-4 sm:h-6 sm:w-6 text-yellow-500' />
                          </motion.div>
                        ) : (
                          <motion.div
                            animate={{
                              boxShadow: [
                                "0 0 0 0 rgba(34, 197, 94, 0.7)",
                                "0 0 0 10px rgba(34, 197, 94, 0)",
                                "0 0 0 0 rgba(34, 197, 94, 0)",
                              ],
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <LockOpenIcon className='h-4 w-4 sm:h-6 sm:w-6 text-green-500' />
                          </motion.div>
                        )}
                      </motion.div>
                      <div className='flex flex-col'>
                        <span className='font-bold text-gray-900 dark:text-white text-sm sm:text-lg'>
                          Room #{room.roomId.slice(-6)}
                        </span>
                        <span className='text-xs text-gray-500 dark:text-gray-400 hidden sm:block'>
                          {room.hasPassword ? "Private Room" : "Public Room"}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Room Info */}
                  <div className='space-y-1.5 sm:space-y-2 mb-3 sm:mb-4'>
                    {/* Mobile: Show icons in first row, data in second row with proper alignment */}
                    <div className='sm:hidden'>
                      <motion.div
                        className='space-y-2 text-xs'
                        whileHover={{ x: 2 }}
                      >
                        {/* Grid layout for proper alignment */}
                        <div className='grid grid-cols-5 gap-4'>
                          {/* Icons row */}
                          <div className='flex justify-center'>
                            <span className='text-gray-600 dark:text-gray-300'>
                              <UsersIcon className='h-3 w-3' />
                            </span>
                          </div>
                          <div className='flex justify-center'>
                            <span className='text-gray-600 dark:text-gray-300'>
                              <TrophyIcon className='h-3 w-3' />
                            </span>
                          </div>
                          <div className='flex justify-center'>
                            <span className='text-gray-600 dark:text-gray-300'>
                              <Cog6ToothIcon className='h-3 w-3' />
                            </span>
                          </div>
                          <div className='flex justify-center'>
                            <span className='text-gray-600 dark:text-gray-300'>
                              <EyeIcon className='h-3 w-3' />
                            </span>
                          </div>
                          <div className='flex justify-center'>
                            <span className='text-gray-600 dark:text-gray-300'>
                              <FireIcon className='h-3 w-3' />
                            </span>
                          </div>

                          {/* Data values row */}
                          <div className='flex justify-center'>
                            <span className='font-medium text-gray-900 dark:text-white'>
                              {room.playerCount}/{room.maxPlayers}
                            </span>
                          </div>
                          <div className='flex justify-center'>
                            <span className='font-medium text-gray-900 dark:text-white'>
                              {/* {
                                gameModes.find((m) => m.value === room.gameMode)
                                  ?.label
                              } */}
                              {getGameModeIcon(room.gameMode)}
                            </span>
                          </div>
                          <div className='flex justify-center'>
                            <span className='font-medium text-gray-900 dark:text-white'>
                              {room.boardSize}
                            </span>
                          </div>
                          <div className='flex justify-center'>
                            <span className='font-medium text-gray-900 dark:text-white'>
                              {themes
                                .find((t) => t.value === room.theme)
                                ?.preview.slice(0, 2)
                                .map((emoji, i) => (
                                  <span key={i} className='text-xs'>
                                    {emoji}
                                  </span>
                                ))}
                            </span>
                          </div>
                          <div className='flex justify-center'>
                            <span className='font-medium text-gray-900 dark:text-white'>
                              {room.settings?.powerUpsEnabled ? "⚡" : "❌"}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Desktop: Show all info */}
                    <div className='hidden sm:block'>
                      <motion.div
                        className='flex items-center justify-between text-xs sm:text-sm'
                        whileHover={{ x: 2 }}
                      >
                        <span className='text-gray-600 dark:text-gray-300 flex items-center gap-1'>
                          <UsersIcon className='h-3 w-3' />
                          Players:
                        </span>
                        <motion.span
                          className={`font-medium ${
                            room.playerCount === 0
                              ? "text-orange-600 dark:text-orange-400"
                              : "text-gray-900 dark:text-white"
                          }`}
                          whileHover={{ scale: 1.1 }}
                        >
                          {room.playerCount}/{room.maxPlayers}
                          {room.playerCount === 0 && (
                            <motion.span
                              className='ml-1 text-xs text-orange-500'
                              animate={{ pulse: true }}
                            >
                              • Empty
                            </motion.span>
                          )}
                        </motion.span>
                      </motion.div>

                      <motion.div
                        className='flex items-center justify-between text-xs sm:text-sm'
                        whileHover={{ x: 2 }}
                      >
                        <span className='text-gray-600 dark:text-gray-300 flex items-center gap-1'>
                          <TrophyIcon className='h-3 w-3' />
                          Mode:
                        </span>
                        <div className='flex items-center gap-1 font-medium text-gray-900 dark:text-white'>
                          {getGameModeIcon(room.gameMode)}
                          <span className='text-xs sm:text-sm'>
                            {
                              gameModes.find((m) => m.value === room.gameMode)
                                ?.label
                            }
                          </span>
                        </div>
                      </motion.div>

                      <motion.div
                        className='flex items-center justify-between text-xs sm:text-sm'
                        whileHover={{ x: 2 }}
                      >
                        <span className='text-gray-600 dark:text-gray-300 flex items-center gap-1'>
                          <Cog6ToothIcon className='h-3 w-3' />
                          Board:
                        </span>
                        <span className='font-medium text-gray-900 dark:text-white text-xs sm:text-sm'>
                          {room.boardSize}
                        </span>
                      </motion.div>

                      <motion.div
                        className='flex items-center justify-between text-xs sm:text-sm'
                        whileHover={{ x: 2 }}
                      >
                        <span className='text-gray-600 dark:text-gray-300 flex items-center gap-1'>
                          <EyeIcon className='h-3 w-3' />
                          Theme:
                        </span>
                        <div className='flex items-center gap-1'>
                          {themes
                            .find((t) => t.value === room.theme)
                            ?.preview.slice(0, 2)
                            .map((emoji, i) => (
                              <motion.span
                                key={i}
                                className='text-xs'
                                whileHover={{ scale: 1.2, rotate: 10 }}
                              >
                                {emoji}
                              </motion.span>
                            ))}
                          <span className='font-medium text-gray-900 dark:text-white text-xs'>
                            {themes.find((t) => t.value === room.theme)?.label}
                          </span>
                        </div>
                      </motion.div>

                      <motion.div
                        className='flex items-center justify-between text-xs sm:text-sm'
                        whileHover={{ x: 2 }}
                      >
                        <span className='text-gray-600 dark:text-gray-300 flex items-center gap-1'>
                          <FireIcon className='h-3 w-3' />
                          Power-ups:
                        </span>
                        <div className='flex items-center gap-1'>
                          {room.settings?.powerUpsEnabled ? (
                            <>
                              <motion.span
                                className='text-purple-500'
                                animate={{ rotate: [0, 360] }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                              >
                                ⚡
                              </motion.span>
                              <span className='font-medium text-purple-600 dark:text-purple-400 text-xs'>
                                Enabled
                              </span>
                            </>
                          ) : (
                            <span className='font-medium text-gray-500 dark:text-gray-400 text-xs'>
                              Disabled
                            </span>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => joinGameRoom(room)}
                    disabled={!room.isJoinable || joinLoading === room.roomId}
                    className={`group relative w-full flex items-center justify-center px-4 sm:px-6 py-3 sm:py-4 rounded-xl 
                               font-bold transition-all duration-300 focus:outline-none 
                               focus:ring-2 focus:ring-offset-2 disabled:opacity-50 
                               disabled:cursor-not-allowed shadow-lg hover:shadow-xl sm:hover:shadow-2xl overflow-hidden ${
                                 room.isJoinable
                                   ? "bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 text-white focus:ring-blue-500"
                                   : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                               }`}
                  >
                    {room.isJoinable && (
                      <motion.div
                        className='absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20'
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          repeatDelay: 2,
                        }}
                      />
                    )}

                    {joinLoading === room.roomId ? (
                      <motion.div
                        className='relative z-10'
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <div className='w-5 h-5 sm:w-6 sm:h-6 border-3 border-white border-t-transparent rounded-full'></div>
                      </motion.div>
                    ) : room.isJoinable ? (
                      <div className='relative z-10 flex items-center'>
                        <motion.div
                          whileHover={{ scale: 1.2, rotate: 15 }}
                          whileTap={{ scale: 0.9 }}
                          className='mr-2 sm:mr-3'
                        >
                          <PlayIcon className='h-5 w-5 sm:h-6 sm:w-6' />
                        </motion.div>
                        <span className='text-sm sm:text-base'>
                          {room.hasPassword
                            ? "🔐 Enter Password"
                            : "🚀 Join Room"}
                        </span>
                      </div>
                    ) : (
                      <span className='text-sm sm:text-base'>❌ Room Full</span>
                    )}
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50'
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className='bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='flex items-center justify-between mb-4'>
                <motion.h3
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className='text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2'
                >
                  <span className='text-blue-600'>✨</span>
                  Create New Room
                </motion.h3>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowCreateModal(false)}
                  className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1'
                >
                  <svg
                    className='w-6 h-6'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M6 18L18 6M6 6l12 12'
                    />
                  </svg>
                </motion.button>
              </div>

              <div className='space-y-4'>
                {/* Privacy Settings */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <motion.label
                    className='flex items-center cursor-pointer p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-colors'
                    whileHover={{ scale: 1.02 }}
                  >
                    <input
                      type='checkbox'
                      checked={createForm.isPrivate}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          isPrivate: e.target.checked,
                        })
                      }
                      className='rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4'
                    />
                    <span className='ml-3 text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium'>
                      🔒 Private Room
                    </span>
                  </motion.label>
                </motion.div>

                {createForm.isPrivate && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                      🔑 Password
                    </label>
                    <motion.input
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      type='password'
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          password: e.target.value,
                        })
                      }
                      className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200'
                      placeholder='Enter room password'
                    />
                  </motion.div>
                )}

                {/* Game Settings */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Max Players
                  </label>
                  <select
                    value={createForm.maxPlayers}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        maxPlayers: parseInt(e.target.value),
                      })
                    }
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                  >
                    <option value={2}>2 Players</option>
                    <option value={3}>3 Players</option>
                    <option value={4}>4 Players</option>
                  </select>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Board Size
                  </label>
                  <select
                    value={createForm.boardSize}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        boardSize: e.target.value,
                      })
                    }
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                  >
                    {boardSizes.map((size) => (
                      <option key={size.value} value={size.value}>
                        {size.label} - {size.pairs} pairs
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Game Mode
                  </label>
                  <select
                    value={createForm.gameMode}
                    onChange={(e) => {
                      const newGameMode = e.target.value;
                      setCreateForm({
                        ...createForm,
                        gameMode: newGameMode,
                        // Automatically enable power-ups for powerup-frenzy mode
                        powerUpsEnabled:
                          newGameMode === "powerup-frenzy" ||
                          createForm.powerUpsEnabled,
                      });
                    }}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                  >
                    {gameModes.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label} - {mode.description}
                      </option>
                    ))}
                  </select>
                </div>

                {["blitz", "powerup-frenzy"].includes(createForm.gameMode) && (
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Time Limit (seconds)
                    </label>
                    <input
                      type='number'
                      min='30'
                      max='600'
                      value={createForm.timeLimit}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          timeLimit: parseInt(e.target.value),
                        })
                      }
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                    />
                  </div>
                )}

                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Theme
                  </label>
                  <select
                    value={createForm.theme}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, theme: e.target.value })
                    }
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                  >
                    {themes.map((theme) => (
                      <option key={theme.value} value={theme.value}>
                        {theme.label} {theme.preview.join(" ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className='flex items-center'>
                    <input
                      type='checkbox'
                      checked={createForm.powerUpsEnabled}
                      disabled={createForm.gameMode === "powerup-frenzy"}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          powerUpsEnabled: e.target.checked,
                        })
                      }
                      className='rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50'
                    />
                    <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>
                      Enable Power-ups
                      {createForm.gameMode === "powerup-frenzy" && (
                        <span className='text-blue-600 ml-1'>
                          {" "}
                          (Always enabled in Power-up Frenzy)
                        </span>
                      )}
                    </span>
                  </label>

                  {createForm.powerUpsEnabled && (
                    <div className='mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
                      <h4 className='text-sm font-medium text-blue-900 dark:text-blue-100 mb-2'>
                        Available Power-ups:
                      </h4>
                      <div className='grid grid-cols-2 gap-2 text-xs'>
                        <div className='flex items-center gap-1'>
                          <span>🔄</span>
                          <span className='text-blue-800 dark:text-blue-200'>
                            Extra Turn
                          </span>
                        </div>
                        <div className='flex items-center gap-1'>
                          <span>👁️</span>
                          <span className='text-blue-800 dark:text-blue-200'>
                            Peek
                          </span>
                        </div>
                        <div className='flex items-center gap-1'>
                          <span>🔀</span>
                          <span className='text-blue-800 dark:text-blue-200'>
                            Swap
                          </span>
                        </div>
                        <div className='flex items-center gap-1'>
                          <span>💡</span>
                          <span className='text-blue-800 dark:text-blue-200'>
                            Reveal
                          </span>
                        </div>
                        <div className='flex items-center gap-1'>
                          <span>❄️</span>
                          <span className='text-blue-800 dark:text-blue-200'>
                            Freeze
                          </span>
                        </div>
                        <div className='flex items-center gap-1'>
                          <span>🔀</span>
                          <span className='text-blue-800 dark:text-blue-200'>
                            Shuffle
                          </span>
                        </div>
                      </div>
                      <div className='mt-2 text-xs text-blue-700 dark:text-blue-300'>
                        💡 <strong>Strategy:</strong> Save power-ups for crucial
                        moments!
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className='flex flex-col sm:flex-row gap-3 mt-6'>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCreateModal(false)}
                  className='flex-1 px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 
                           rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg'
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={createRoom}
                  className='flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 
                           hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium 
                           transition-all duration-200 shadow-md hover:shadow-lg'
                >
                  ✨ Create Room
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Private Room Password Modal */}
      <AnimatePresence>
        {selectedRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50'
            onClick={() => setSelectedRoom(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className='bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 sm:p-6 w-full max-w-sm'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='flex items-center justify-between mb-4'>
                <motion.h3
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className='text-lg sm:text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2'
                >
                  <span className='text-yellow-500'>🔐</span>
                  Enter Room Password
                </motion.h3>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedRoom(null)}
                  className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1'
                >
                  <svg
                    className='w-6 h-6'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M6 18L18 6M6 6l12 12'
                    />
                  </svg>
                </motion.button>
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className='text-sm text-gray-600 dark:text-gray-300 mb-4'
              >
                Room #{selectedRoom.roomId.slice(-6)} is private. Enter the
                password to join.
              </motion.p>

              <motion.input
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                type='password'
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && joinPrivateRoom()}
                className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200'
                placeholder='Enter password'
                autoFocus
              />

              <div className='flex flex-col sm:flex-row gap-3'>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedRoom(null);
                    setRoomPassword("");
                  }}
                  className='flex-1 px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 
                           rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg'
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={joinPrivateRoom}
                  disabled={joinLoading === selectedRoom.roomId}
                  className='flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 
                           hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium 
                           transition-all duration-200 shadow-md hover:shadow-lg
                           disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {joinLoading === selectedRoom.roomId ? (
                    <motion.div
                      className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto'
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    ></motion.div>
                  ) : (
                    "🚀 Join Room"
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Lobby;
