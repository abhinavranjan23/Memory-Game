import React, { useState, useEffect } from "react";
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

    socket.emit("get-active-players");
    socket.emit("get-rooms");

    const refreshInterval = setInterval(() => {
      socket.emit("get-rooms");
      socket.emit("get-active-players");
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
      case "blitz":
        return <ClockIcon className='h-4 w-4' />;
      case "sudden-death":
        return <FireIcon className='h-4 w-4' />;
      default:
        return <TrophyIcon className='h-4 w-4' />;
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
    <div className='max-w-7xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
        <div>
          <h1 className='text-4xl font-bold text-gray-900 dark:text-white mb-2'>
            🎮 Game Lobby
          </h1>
          <p className='text-gray-600 dark:text-gray-300'>
            Join existing rooms or create your own memory challenge
          </p>
        </div>

        <div className='flex gap-3'>
          <button
            onClick={refreshRooms}
            disabled={refreshing}
            className='inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 
                     text-white rounded-lg font-medium transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                     disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <ArrowPathIcon
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className='inline-flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 
                     text-white rounded-lg font-medium transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          >
            <PlusIcon className='h-4 w-4 mr-2' />
            Create Room
          </button>
        </div>
      </div>

      {/* Room Statistics */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg'>
          <div className='flex items-center'>
            <UserGroupIcon className='h-8 w-8 mr-3' />
            <div>
              <p className='text-sm opacity-90'>Active Rooms</p>
              <p className='text-2xl font-bold'>{rooms.length}</p>
            </div>
          </div>
        </div>

        <div className='bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg'>
          <div className='flex items-center'>
            <UsersIcon className='h-8 w-8 mr-3' />
            <div>
              <p className='text-sm opacity-90'>Players Online</p>
              <p className='text-2xl font-bold'>{activePlayers}</p>
            </div>
          </div>
        </div>

        <div className='bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg'>
          <div className='flex items-center'>
            <LockOpenIcon className='h-8 w-8 mr-3' />
            <div>
              <p className='text-sm opacity-90'>Open Rooms</p>
              <p className='text-2xl font-bold'>
                {rooms.filter((room) => room.isJoinable).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden'>
        <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
            Available Rooms
          </h2>
          <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
            {rooms.length} room{rooms.length !== 1 ? "s" : ""} available
          </p>
        </div>

        {loading ? (
          <div className='flex items-center justify-center p-12'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500'></div>
          </div>
        ) : rooms.length === 0 ? (
          <div className='text-center p-12'>
            <UserGroupIcon className='h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
              No Active Rooms
            </h3>
            <p className='text-gray-500 dark:text-gray-400 mb-6'>
              Be the first to create a room and start playing!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className='inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 
                       text-white rounded-lg font-medium transition-colors duration-200'
            >
              <PlusIcon className='h-5 w-5 mr-2' />
              Create First Room
            </button>
          </div>
        ) : (
          <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-6'>
            <AnimatePresence>
              {rooms.map((room, index) => (
                <motion.div
                  key={room.roomId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className='bg-gray-50 dark:bg-gray-700 rounded-lg p-5 hover:shadow-md transition-shadow'
                >
                  {/* Room Header */}
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center gap-2'>
                      {room.hasPassword ? (
                        <LockClosedIcon className='h-4 w-4 text-yellow-500' />
                      ) : (
                        <LockOpenIcon className='h-4 w-4 text-green-500' />
                      )}
                      <span className='font-medium text-gray-900 dark:text-white'>
                        Room #{room.roomId.slice(-6)}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getRoomStatusColor(
                        room
                      )}`}
                    >
                      {room.status}
                    </span>
                  </div>

                  {/* Room Info */}
                  <div className='space-y-2 mb-4'>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-gray-600 dark:text-gray-300'>
                        Players:
                      </span>
                      <span className='font-medium text-gray-900 dark:text-white'>
                        {room.playerCount}/{room.maxPlayers}
                      </span>
                    </div>

                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-gray-600 dark:text-gray-300'>
                        Mode:
                      </span>
                      <div className='flex items-center gap-1 font-medium text-gray-900 dark:text-white'>
                        {getGameModeIcon(room.gameMode)}
                        {
                          gameModes.find((m) => m.value === room.gameMode)
                            ?.label
                        }
                      </div>
                    </div>

                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-gray-600 dark:text-gray-300'>
                        Board:
                      </span>
                      <span className='font-medium text-gray-900 dark:text-white'>
                        {room.boardSize}
                      </span>
                    </div>

                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-gray-600 dark:text-gray-300'>
                        Theme:
                      </span>
                      <div className='flex items-center gap-1'>
                        {themes
                          .find((t) => t.value === room.theme)
                          ?.preview.slice(0, 2)
                          .map((emoji, i) => (
                            <span key={i} className='text-xs'>
                              {emoji}
                            </span>
                          ))}
                        <span className='font-medium text-gray-900 dark:text-white text-xs'>
                          {themes.find((t) => t.value === room.theme)?.label}
                        </span>
                      </div>
                    </div>

                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-gray-600 dark:text-gray-300'>
                        Power-ups:
                      </span>
                      <div className='flex items-center gap-1'>
                        {room.settings?.powerUpsEnabled ? (
                          <>
                            <span className='text-purple-500'>⚡</span>
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
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => joinGameRoom(room)}
                    disabled={!room.isJoinable || joinLoading === room.roomId}
                    className={`w-full flex items-center justify-center px-4 py-2 rounded-lg 
                               font-medium transition-colors duration-200 focus:outline-none 
                               focus:ring-2 focus:ring-offset-2 disabled:opacity-50 
                               disabled:cursor-not-allowed ${
                                 room.isJoinable
                                   ? "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500"
                                   : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                               }`}
                  >
                    {joinLoading === room.roomId ? (
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                    ) : room.isJoinable ? (
                      <>
                        <PlayIcon className='h-4 w-4 mr-2' />
                        {room.hasPassword ? "Enter Password" : "Join Room"}
                      </>
                    ) : (
                      "Room Full"
                    )}
                  </button>
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
            className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className='bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto'
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                Create New Room
              </h3>

              <div className='space-y-4'>
                {/* Privacy Settings */}
                <div>
                  <label className='flex items-center'>
                    <input
                      type='checkbox'
                      checked={createForm.isPrivate}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          isPrivate: e.target.checked,
                        })
                      }
                      className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                    />
                    <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>
                      Private Room
                    </span>
                  </label>
                </div>

                {createForm.isPrivate && (
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Password
                    </label>
                    <input
                      type='password'
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          password: e.target.value,
                        })
                      }
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                      placeholder='Enter room password'
                    />
                  </div>
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

              <div className='flex gap-3 mt-6'>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className='flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 
                           rounded-lg font-medium transition-colors duration-200'
                >
                  Cancel
                </button>
                <button
                  onClick={createRoom}
                  className='flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white 
                           rounded-lg font-medium transition-colors duration-200'
                >
                  Create Room
                </button>
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
            className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'
            onClick={() => setSelectedRoom(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className='bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm'
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                Enter Room Password
              </h3>

              <p className='text-sm text-gray-600 dark:text-gray-300 mb-4'>
                Room #{selectedRoom.roomId.slice(-6)} is private. Enter the
                password to join.
              </p>

              <input
                type='password'
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && joinPrivateRoom()}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4'
                placeholder='Enter password'
                autoFocus
              />

              <div className='flex gap-3'>
                <button
                  onClick={() => {
                    setSelectedRoom(null);
                    setRoomPassword("");
                  }}
                  className='flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 
                           rounded-lg font-medium transition-colors duration-200'
                >
                  Cancel
                </button>
                <button
                  onClick={joinPrivateRoom}
                  disabled={joinLoading === selectedRoom.roomId}
                  className='flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white 
                           rounded-lg font-medium transition-colors duration-200
                           disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {joinLoading === selectedRoom.roomId ? (
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto'></div>
                  ) : (
                    "Join Room"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Lobby;
