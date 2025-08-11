import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext();

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token, user } = useAuth();

  useEffect(() => {
    if (user && token) {
      const newSocket = io(SOCKET_URL, {
        auth: {
          token,
        },
      });

      newSocket.on("connect", () => {
        console.log("Connected to server");
        setIsConnected(true);
      });

      newSocket.on("disconnect", () => {
        console.log("Disconnected from server");
        setIsConnected(false);
      });

      newSocket.on("error", (error) => {
        console.error("Socket error 123:", error);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [user, token]);

  // Function to join a room
  const joinRoom = (roomData) => {
    if (!socket) {
      console.error("Socket not connected");
      return false;
    }

    try {
      console.log("Joining room with data:", roomData);
      socket.emit("join-room", roomData);
      return true;
    } catch (error) {
      console.error("Error joining room:", error);
      return false;
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinRoom }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
