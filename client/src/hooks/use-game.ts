import { useState, useEffect } from "react"; // He quitado useCallback para limpiar el error amarillo
import { io, Socket } from "socket.io-client";

// Añadimos questionTimer aquí para arreglar el error de TypeScript
export interface GameState {
  roomCode: string;
  status: "waiting" | "playing" | "finished";
  players: any[];
  currentQuestionIndex: number;
  questionTimer?: number; // <-- Esto soluciona image_3d861d.png
}

let socket: Socket;

export function useHostGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!socket) socket = io();
    socket.on("STATE_UPDATE", (state: GameState) => setGameState(state));
    return () => {
      socket.off("STATE_UPDATE");
    };
  }, []);

  const createRoom = (hostName: string, time: number) => {
    setIsCreating(true);
    socket.emit("CREATE_ROOM", { hostName, questionTime: time });
  };

  const startGame = () => socket.emit("START_GAME");

  const nextQuestionGlobal = () => {
    console.log("Emitiendo avance global...");
    socket.emit("NEXT_QUESTION_GLOBAL");
  };

  return { gameState, createRoom, startGame, nextQuestionGlobal, isCreating };
}

// ESTA EXPORTACIÓN ES LA QUE TE DABA EL ERROR ROJO
export function usePlayerGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!socket) socket = io();
    socket.on("STATE_UPDATE", (state: GameState) => setGameState(state));
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
