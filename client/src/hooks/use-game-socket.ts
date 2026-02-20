import { useEffect, useState, useCallback } from "react";
import { socketClient } from "@/lib/socket";
import {
  WS_EVENTS,
  type GameStatus,
  type PlayerStatus,
  type Question,
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export interface GameState {
  roomCode: string;
  hostName: string;
  players: Player[];
  status: GameStatus;
  currentQuestion?: Question;
  currentQuestionIndex: number;
  questions: Question[];
  totalQuestions: number;
  revealedAnswer?: string | null;
}

export interface Player {
  id: string;
  socketId: string;
  name: string;
  money: number;
  status: PlayerStatus;
  currentBet: Record<string, number>;
  hasConfirmed: boolean;
}

export function useGameSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [kicked, setKicked] = useState<string | null>(null); // mensaje de expulsión
  const { toast } = useToast();

  useEffect(() => {
    const socket = socketClient.connect();

    function onConnect() {
      setIsConnected(true);
      setPlayerId(socket?.id || null);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onStateUpdate(newState: Partial<GameState>) {
      setGameState((prev) => {
        if (!prev) return newState as GameState;
        return { ...prev, ...newState };
      });
    }

    function onPlayersUpdate(data: { players: Player[] }) {
      setGameState((prev) => {
        if (!prev) return prev;
        return { ...prev, players: data.players };
      });
    }

    function onKicked(data: { message: string }) {
      setKicked(data.message);
    }

    function onError(error: { message: string }) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }

    function onRoomCreated(data: { roomCode: string; state: GameState }) {
      setGameState(data.state);
      toast({
        title: "Sala creada!",
        description: `Codi de sala: ${data.roomCode}`,
      });
    }

    function onGameStarted(state: GameState) {
      setGameState(state);
      toast({
        title: "El joc ha començat!",
        description: "Bona sort a tots els jugadors.",
      });
    }

    socket?.on("connect", onConnect);
    socket?.on("disconnect", onDisconnect);
    socket?.on(WS_EVENTS.STATE_UPDATE, onStateUpdate);
    socket?.on("PLAYERS_UPDATE", onPlayersUpdate);
    socket?.on("KICKED", onKicked);
    socket?.on(WS_EVENTS.ERROR, onError);
    socket?.on(WS_EVENTS.ROOM_CREATED, onRoomCreated);
    socket?.on(WS_EVENTS.GAME_STARTED, onGameStarted);

    if (socket?.connected) onConnect();

    return () => {
      socket?.off("connect", onConnect);
      socket?.off("disconnect", onDisconnect);
      socket?.off(WS_EVENTS.STATE_UPDATE, onStateUpdate);
      socket?.off("PLAYERS_UPDATE", onPlayersUpdate);
      socket?.off("KICKED", onKicked);
      socket?.off(WS_EVENTS.ERROR, onError);
      socket?.off(WS_EVENTS.ROOM_CREATED, onRoomCreated);
      socket?.off(WS_EVENTS.GAME_STARTED, onGameStarted);
    };
  }, [toast]);

  const createRoom = useCallback((hostName: string, maxPlayers: number) => {
    socketClient.emit(WS_EVENTS.CREATE_ROOM, { hostName, maxPlayers });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    socketClient.emit(WS_EVENTS.JOIN_ROOM, { roomCode, playerName });
  }, []);

  const startGame = useCallback((roomCode: string) => {
    socketClient.emit(WS_EVENTS.START_GAME, { roomCode });
  }, []);

  const updateBet = useCallback(
    (roomCode: string, bet: Record<string, number>) => {
      socketClient.emit(WS_EVENTS.UPDATE_BET, { roomCode, bet });
    },
    [],
  );

  const confirmBet = useCallback((roomCode: string) => {
    socketClient.emit(WS_EVENTS.CONFIRM_BET, { roomCode });
  }, []);

  const revealResult = useCallback((roomCode: string) => {
    socketClient.emit(WS_EVENTS.REVEAL_RESULT, { roomCode });
  }, []);

  const nextQuestion = useCallback((roomCode: string) => {
    socketClient.emit(WS_EVENTS.NEXT_QUESTION, { roomCode });
  }, []);

  // ✅ Ahora usa KICK_PLAYER en lugar de ELIMINATE_PLAYER
  const kickPlayer = useCallback((roomCode: string, socketId: string) => {
    socketClient.emit("KICK_PLAYER", { roomCode, socketId });
  }, []);

  // Mantenemos eliminatePlayer como alias por si GameDashboard lo usa
  const eliminatePlayer = kickPlayer;

  return {
    isConnected,
    socketId: playerId,
    gameState,
    kicked,
    createRoom,
    joinRoom,
    startGame,
    updateBet,
    confirmBet,
    revealResult,
    nextQuestion,
    kickPlayer,
    eliminatePlayer,
  };
}
