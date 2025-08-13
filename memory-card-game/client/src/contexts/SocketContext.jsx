import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext();

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Game-related state
  const [rooms, setRooms] = useState([]);
  const [activePlayers, setActivePlayers] = useState([]);
  const [error, setError] = useState(null);

  const { token, user } = useAuth();

  useEffect(() => {
    if (!user || !token) {
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
    });

    setSocket(newSocket);

    // Attach all listeners ONCE
    newSocket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
      newSocket.emit("get-rooms");
      newSocket.emit("get-active-players");
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
    });

    newSocket.on("error", (err) => {
      console.error("Socket error:", err);
      setError(err);
    });

    newSocket.on("room-updated", (updatedRoom) => {
      setRooms((prev) => {
        const exists = prev.find((room) => room.id === updatedRoom.id);
        return exists
          ? prev.map((room) =>
              room.id === updatedRoom.id ? updatedRoom : room
            )
          : [...prev, updatedRoom];
      });
    });

    newSocket.on("room-deleted", (deletedRoomId) => {
      setRooms((prev) => prev.filter((room) => room.id !== deletedRoomId));
    });

    newSocket.on("joined-room", (room) => {
      console.log("Joined room:", room);
    });

    newSocket.on("join-room-error", (errMsg) => {
      console.error("Join room error:", errMsg);
      setError(errMsg);
    });

    newSocket.on("active-players", (players) => {
      setActivePlayers(players);
    });

    // Refresh every 5 seconds
    const refreshInterval = setInterval(() => {
      newSocket.emit("get-rooms");
      newSocket.emit("get-active-players");
    }, 5000);

    return () => {
      clearInterval(refreshInterval);
      newSocket.close();
    };
  }, [user, token]);

  // API for joining a room
  const joinRoom = (roomData) => {
    if (!socket) {
      console.error("Socket not connected");
      return false;
    }
    try {
      socket.emit("join-room", roomData);
      return true;
    } catch (err) {
      console.error("Error joining room:", err);
      return false;
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        rooms,
        activePlayers,
        error,
        joinRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
