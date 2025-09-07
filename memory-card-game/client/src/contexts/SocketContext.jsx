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
  const connectionAttemptsRef = useRef(0);
  const maxConnectionAttempts = 5;

  useEffect(() => {
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
      hasConnectedRef.current = false;
      connectionAttemptsRef.current = 0;
      return;
    }

    if (hasConnectedRef.current && socketRef.current) {
      return;
    }

    connectionAttemptsRef.current = 0;
    hasConnectedRef.current = true;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: maxConnectionAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = newSocket;

    const onConnect = () => {
      console.log("Socket connected successfully");
      setIsConnected(true);
      connectionAttemptsRef.current = 0;
    };

    const onDisconnect = (reason) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);

      if (
        reason === "io client disconnect" ||
        connectionAttemptsRef.current >= maxConnectionAttempts
      ) {
        hasConnectedRef.current = false;
        socketRef.current = null;
        setSocket(null);
      }
    };

    const onConnectError = (error) => {
      console.error("Socket connection error:", error);
      connectionAttemptsRef.current++;

      if (connectionAttemptsRef.current >= maxConnectionAttempts) {
        console.error("Max connection attempts reached");
        hasConnectedRef.current = false;
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
    };

    const onError = (error) => {
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
    newSocket.on("connect_error", onConnectError);
    newSocket.on("error", onError);

    setSocket(newSocket);

    return () => {
      newSocket.off("connect", onConnect);
      newSocket.off("disconnect", onDisconnect);
      newSocket.off("connect_error", onConnectError);
      newSocket.off("error", onError);
      newSocket.close();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      hasConnectedRef.current = false;
      lastJoinPayloadRef.current = null;
      joinCooldownRef.current = 0;
      connectionAttemptsRef.current = 0;
    };
  }, [user, token]);

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

    // 200ms cooldown for same join payload
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
