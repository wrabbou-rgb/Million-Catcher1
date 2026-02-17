import { io, Socket } from "socket.io-client";

// In development, the socket server is on the same host/port usually, 
// or proxied by Vite. In production, it might be different.
// For Replit/Vite setup, undefined usually works (auto-detects).
const SOCKET_URL = window.location.protocol + "//" + window.location.host;

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
});

// Debugging
socket.on("connect", () => {
  console.log("Connected to WebSocket server:", socket.id);
});

socket.on("disconnect", () => {
  console.log("Disconnected from WebSocket server");
});

socket.on("connect_error", (err) => {
  console.error("Socket connection error:", err);
});
