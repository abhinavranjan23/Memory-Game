import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext();

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const hasConnectedRef = useRef(false);
  const lastJoinPayloadRef = useRef(null);
  const joinCooldownRef = useRef(0);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
      hasConnectedRef.current = false;
      return;
    }

    // Prevent duplicate socket connections
    if (hasConnectedRef.current && socketRef.current) {
      return;
    }

    hasConnectedRef.current = true;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;

    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onError = (error) => {
      // Suppress benign start-game race messages and temporary failures
      if (
        error?.message === "Game already started or not enough players" ||
        /already started/i.test(error?.message || "") ||
        /failed to start game/i.test(error?.message || "") ||
        /game not active/i.test(error?.message || "")
      ) {
        return;
      }
      console.error("Socket error:", error);
    };

    newSocket.on("connect", onConnect);
    newSocket.on("disconnect", onDisconnect);
    newSocket.on("error", onError);

    setSocket(newSocket);

    return () => {
      newSocket.off("connect", onConnect);
      newSocket.off("disconnect", onDisconnect);
      newSocket.off("error", onError);
      newSocket.close();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      hasConnectedRef.current = false;
      lastJoinPayloadRef.current = null;
      joinCooldownRef.current = 0;
    };
  }, [user, token]);

  // Debounced join to avoid flooding the server
  const joinRoom = (roomData) => {
    console.log("joinRoom called with data:", roomData);
    console.log("Socket connected:", isConnected);
    console.log("Socket ref exists:", !!socketRef.current);

    if (!socketRef.current || !isConnected) {
      console.error("Socket not connected");
      return false;
    }

    const now = Date.now();
    const samePayload =
      lastJoinPayloadRef.current &&
      JSON.stringify(lastJoinPayloadRef.current) === JSON.stringify(roomData);

    // 200ms cooldown for same join payload (reduced from 500ms)
    if (samePayload && now - joinCooldownRef.current < 200) {
      console.log("Join request throttled due to cooldown");
      return true;
    }

    try {
      lastJoinPayloadRef.current = roomData;
      joinCooldownRef.current = now;
      console.log("Emitting join-room event:", roomData);
      socketRef.current.emit("join-room", roomData);
      return true;
    } catch (err) {
      console.error("Error joining room:", err);
      return false;
    }
  };

  const value = useMemo(
    () => ({ socket, isConnected, joinRoom }),
    [socket, isConnected]
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
