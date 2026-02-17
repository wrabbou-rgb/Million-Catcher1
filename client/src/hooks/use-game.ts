import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket;

export function useHostGame() {
  const [gameState, setGameState] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!socket) socket = io();
    socket.on("STATE_UPDATE", (state) => {
      setGameState(state);
      setIsCreating(false);
    });
    return () => {
      socket.off("STATE_UPDATE");
    };
  }, []);

  const createRoom = (hostName: string, maxPlayers: number) => {
    setIsCreating(true);
    socket.emit("CREATE_ROOM", { hostName, maxPlayers });
  };

  const startGame = () => {
    if (gameState) socket.emit("START_GAME", { roomCode: gameState.roomCode });
  };

  const nextQuestionGlobal = () => {
    socket.emit("NEXT_QUESTION_GLOBAL");
  };

  return { gameState, createRoom, startGame, nextQuestionGlobal, isCreating };
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

  // Estas dos funciones son las que te faltaban según el error rojo
  const confirmBet = () => {
    socket.emit("PLAYER_CONFIRM");
  };

  const nextQuestion = (money: number, index: number, status: string) => {
    socket.emit("PLAYER_NEXT", { money, index, status });
  };

  return { gameState, myPlayer, joinRoom, confirmBet, nextQuestion, isJoining };
}
