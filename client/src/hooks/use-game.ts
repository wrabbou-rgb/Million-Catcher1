import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";

export interface GameState {
  roomCode: string;
  status: "waiting" | "playing" | "finished";
  players: any[];
  currentQuestionIndex: number;
  questionTimer?: number;
}

let socket: Socket;

export function useHostGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!socket) socket = io();

    // Escuchamos la actualización del estado
    socket.on("STATE_UPDATE", (state: GameState) => {
      console.log("Estado recibido en Host:", state);
      setGameState(state);
      setIsCreating(false); // <--- IMPORTANTE: Detenemos el buffering aquí
    });

    return () => {
      socket.off("STATE_UPDATE");
    };
  }, []);

  // Cambiamos "time" por "maxPlayers" para que coincida con el servidor
  const createRoom = (hostName: string, maxPlayers: number) => {
    setIsCreating(true);
    console.log("Enviando CREATE_ROOM...", { hostName, maxPlayers });
    socket.emit("CREATE_ROOM", { hostName, maxPlayers });
  };

  const startGame = () => {
    if (gameState) {
      socket.emit("START_GAME", { roomCode: gameState.roomCode });
    }
  };

  const nextQuestionGlobal = () => {
    socket.emit("NEXT_QUESTION_GLOBAL");
  };

  return { gameState, createRoom, startGame, nextQuestionGlobal, isCreating };
}

export function usePlayerGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!socket) socket = io();

    socket.on("STATE_UPDATE", (state: GameState) => {
      setGameState(state);
      setIsJoining(false); // Detenemos buffering de join
    });

    return () => {
      socket.off("STATE_UPDATE");
    };
  }, []);

  const myPlayer = gameState?.players.find((p) => p.socketId === socket.id);

  const joinRoom = (roomCode: string, playerName: string) => {
    setIsJoining(true);
    socket.emit("JOIN_ROOM", { roomCode, playerName });
  };

  const confirmBet = () => socket.emit("PLAYER_CONFIRM");

  const nextQuestion = (money: number, index: number, status: string) => {
    socket.emit("PLAYER_NEXT", { money, index, status });
  };

  return { gameState, myPlayer, joinRoom, confirmBet, nextQuestion, isJoining };
}
