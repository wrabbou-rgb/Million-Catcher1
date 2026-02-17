import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket;

export function useHostGame() {
  const [gameState, setGameState] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!socket) socket = io();

    socket.on("STATE_UPDATE", (state) => {
      console.log("NUEVO ESTADO:", state);
      setGameState(state);
      setIsCreating(false); // <--- Esto desbloquea el botón
    });

    return () => {
      socket.off("STATE_UPDATE");
    };
  }, []);

  const createRoom = (hostName: string, maxPlayers: number) => {
    setIsCreating(true);
    // Si en 3 segundos no hay respuesta, desbloqueamos por fuerza bruta
    setTimeout(() => setIsCreating(false), 3000);
    socket.emit("CREATE_ROOM", { hostName, maxPlayers });
  };

  const startGame = () => {
    if (gameState) socket.emit("START_GAME", { roomCode: gameState.roomCode });
  };

  return { gameState, createRoom, startGame, isCreating };
}

export function usePlayerGame() {
  const [gameState, setGameState] = useState<any>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!socket) socket = io();
    socket.on("STATE_UPDATE", (state) => {
      setGameState(state);
      setIsJoining(false);
    });
    return () => {
      socket.off("STATE_UPDATE");
    };
  }, []);

  const myPlayer = gameState?.players?.find(
    (p: any) => p.socketId === socket.id,
  );

  const joinRoom = (roomCode: string, playerName: string) => {
    setIsJoining(true);
    socket.emit("JOIN_ROOM", { roomCode, playerName });
  };

  return { gameState, myPlayer, joinRoom, isJoining };
}
