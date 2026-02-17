import { io, Socket } from "socket.io-client";

const SOCKET_URL = window.location.protocol + "//" + window.location.host;

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
});

// Alias para compatibilidad con use-game-socket.ts
export const socketClient = {
  connect: () => socket,
  emit: (event: string, data?: any) => socket.emit(event, data),
};

socket.on("connect", () => {
  console.log("Connected to WebSocket server:", socket.id);
});
socket.on("disconnect", () => {
  console.log("Disconnected from WebSocket server");
});
socket.on("connect_error", (err) => {
  console.error("Socket connection error:", err);
});
