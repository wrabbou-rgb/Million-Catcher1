import { useState, useEffect } from "react";
import { socket } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";
import { WS_EVENTS } from "@shared/schema";
import { useLocation } from "wouter";

// DEFINICIÓN DE TIPOS (Añadido questionTimer para arreglar tu error)
export type PlayerState = {
  id: string;
  socketId: string;
  name: string;
  money: number;
  status: "active" | "eliminated" | "winner";
  questionIndex: number;
  lastAnswer?: Record<string, number>;
};

export type GameState = {
  roomCode: string;
  hostName: string;
  maxPlayers: number;
  players: PlayerState[];
  status: "waiting" | "playing" | "finished";
  currentQuestionIndex: number;
  questionTimer?: number; // <--- ESTO ARREGLA EL ERROR DE LA IMAGEN 6
};

// ===========================
// Hook para el HOST
// ===========================
export function useHostGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const onRoomCreated = (data: GameState) => {
      setGameState(data);
      setIsCreating(false);
      toast({ title: "Sala Creada!", description: `Codi: ${data.roomCode}` });
    };

    const onStateUpdate = (data: GameState) => {
      setGameState(data);
    };

    const onPlayerJoined = (player: PlayerState) => {
      setGameState((prev) => {
        if (!prev) return prev;
        const exists = prev.players.find((p) => p.socketId === player.socketId);
        if (exists) return prev;
        return { ...prev, players: [...prev.players, player] };
      });
      toast({
        title: "Nou Jugador!",
        description: `${player.name} s'ha unit!`,
      });
    };

    socket.on(WS_EVENTS.ROOM_CREATED, onRoomCreated);
    socket.on(WS_EVENTS.STATE_UPDATE, onStateUpdate);
    socket.on(WS_EVENTS.PLAYER_JOINED, onPlayerJoined);

    return () => {
      socket.off(WS_EVENTS.ROOM_CREATED, onRoomCreated);
      socket.off(WS_EVENTS.STATE_UPDATE, onStateUpdate);
      socket.off(WS_EVENTS.PLAYER_JOINED, onPlayerJoined);
    };
  }, [toast]);

  const createRoom = (hostName: string, maxPlayers: number) => {
    setIsCreating(true);
    socket.emit(WS_EVENTS.CREATE_ROOM, { hostName, maxPlayers });
  };

  const startGame = () => {
    if (!gameState) return;
    socket.emit(WS_EVENTS.START_GAME, { roomCode: gameState.roomCode });
  };

  const nextQuestionGlobal = () => {
    if (!gameState) return;
    socket.emit(WS_EVENTS.STATE_UPDATE, {
      roomCode: gameState.roomCode,
      updates: {
        currentQuestionIndex: gameState.currentQuestionIndex + 1,
        status: "playing",
        questionTimer: 30,
      },
    });
  };

  return { gameState, createRoom, startGame, nextQuestionGlobal, isCreating };
}

// ==========================================
// Hook para el JUGADOR (EL QUE HABÍA BORRADO)
// ==========================================
export function usePlayerGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayer, setMyPlayer] = useState<PlayerState | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const onGameJoined = (data: {
      gameState: GameState;
      player: PlayerState;
    }) => {
      setGameState(data.gameState);
      setMyPlayer(data.player);
      setIsJoining(false);
    };

    const onStateUpdate = (data: GameState) => {
      setGameState(data);
      const me = data.players.find((p) => p.socketId === socket.id);
      if (me) setMyPlayer(me);
    };

    socket.on("game_joined", onGameJoined);
    socket.on(WS_EVENTS.STATE_UPDATE, onStateUpdate);

    return () => {
      socket.off("game_joined", onGameJoined);
      socket.off(WS_EVENTS.STATE_UPDATE, onStateUpdate);
    };
  }, []);

  const joinRoom = (roomCode: string, playerName: string) => {
    setIsJoining(true);
    socket.emit(WS_EVENTS.JOIN_ROOM, { roomCode, playerName });
  };

  const updateBet = (distribution: Record<string, number>) => {
    if (!gameState) return;
    socket.emit(WS_EVENTS.UPDATE_BET, {
      roomCode: gameState.roomCode,
      distribution,
    });
  };

  const confirmBet = () => {
    if (!gameState) return;
    socket.emit(WS_EVENTS.CONFIRM_BET, { roomCode: gameState.roomCode });
  };

  const nextQuestion = (newMoney: number, newIndex: number, status: string) => {
    if (!gameState) return;
    socket.emit(WS_EVENTS.SUBMIT_ANSWER, {
      roomCode: gameState.roomCode,
      money: newMoney,
      questionIndex: newIndex,
      status: status,
      distribution: {},
    });
  };

  return {
    gameState,
    myPlayer,
    joinRoom,
    updateBet,
    confirmBet,
    nextQuestion,
    isJoining,
  };
}
