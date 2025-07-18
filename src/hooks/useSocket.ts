import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Socket,
  type ManagerOptions,
  type SocketOptions,
  io,
} from "socket.io-client";
import { useLocalStorage } from "./useLocalStorage";

interface UseSocketOptions {
  socketOptions?: Partial<ManagerOptions & SocketOptions>;
}

export interface UseSocketReturn<T = any> {
  socket: Socket | null;
  isConnected: boolean;
  emitEvent: (event: string, data?: T) => void;
  listenToEvent: <R = T>(event: string, callback: (data: R) => void) => void;
  removeListener: (event: string) => void;
}

export const useSocket = <T = any>({
  socketOptions = {},
}: UseSocketOptions): UseSocketReturn<T> => {
  const { getItem } = useLocalStorage("auth");
  const userDetail = getItem();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const token = useMemo(() => {
    return userDetail?.token;
  }, [userDetail]);

  useEffect(() => {
    if (!token) return;
    const socketInstance = io("ws://192.168.1.37:8080", {
      transports: ["websocket"],
      autoConnect: false,
      forceNew: true,
      auth: {
        token: token,
      },
      ...socketOptions,
    });

    socketInstance.connect();

    socketInstance.on("connect", () => {
      setIsConnected(true);
      console.log("Connected to socket server:", socketInstance.id);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
      console.log("Disconnected from socket server");
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [token]);

  const emitEvent = useCallback(
    (event: string, data?: T) => {
      if (socket) {
        socket.emit(event, data);
      } else {
        console.warn(`Cannot emit "${event}": Socket is not initialized`);
      }
    },
    [socket]
  );

  const listenToEvent = useCallback(
    <R = T>(event: string, callback: (data: R) => void) => {
      if (socket) {
        socket.on(event, callback);
      } else {
        console.warn(`Cannot listen to "${event}": Socket is not initialized`);
      }
    },
    [socket]
  );

  const removeListener = useCallback(
    (event: string) => {
      if (socket) {
        socket.off(event);
      } else {
        console.warn(
          `Cannot remove listener for "${event}": Socket is not initialized`
        );
      }
    },
    [socket]
  );

  return { socket, isConnected, emitEvent, listenToEvent, removeListener };
};
