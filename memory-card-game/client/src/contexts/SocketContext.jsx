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

  useEffect(() => {
    if (!user || !token) {
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
      hasConnectedRef.current = false;
      return;
    }

    // Prevent duplicate socket connections under React.StrictMode
    if (hasConnectedRef.current) {
      return;
    }
    hasConnectedRef.current = true;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
    });

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onError = (error) => {
      // Suppress benign start-game race messages
      if (
        error?.message === "Game already started or not enough players" ||
        /already started/i.test(error?.message || "")
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
      setSocket(null);
      setIsConnected(false);
      hasConnectedRef.current = false;
      lastJoinPayloadRef.current = null;
      joinCooldownRef.current = 0;
    };
  }, [user, token]);

  // Debounced join to avoid flooding the server
  const joinRoom = (roomData) => {
    if (!socket) {
      console.error("Socket not connected");
      return false;
    }

    const now = Date.now();
    const samePayload =
      lastJoinPayloadRef.current &&
      JSON.stringify(lastJoinPayloadRef.current) === JSON.stringify(roomData);

    // 500ms cooldown for same join payload
    if (samePayload && now - joinCooldownRef.current < 500) {
      return true;
    }

    try {
      lastJoinPayloadRef.current = roomData;
      joinCooldownRef.current = now;
      socket.emit("join-room", roomData);
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
