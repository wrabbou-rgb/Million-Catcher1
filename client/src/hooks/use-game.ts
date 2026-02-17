import { useState, useEffect } from "react";
import { socket } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";
import { WS_EVENTS } from "@shared/schema";
import { useLocation } from "wouter";

// Types for Game State
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
};

// ===========================
// Hook for Host Logic
// ===========================
export function useHostGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const onRoomCreated = (data: GameState) => {
      setGameState(data);
      setIsCreating(false);
      toast({
        title: "Sala Creada!",
        description: `Codi: ${data.roomCode}`,
        className: "border-primary text-primary",
      });
    };

    // This is the key event - every time a player updates, the host receives the full updated game state
    const onStateUpdate = (data: GameState) => {
      setGameState(data);
    };

    const onPlayerJoined = (player: PlayerState) => {
      // Also update game state when a player joins
      setGameState((prev) => {
        if (!prev) return prev;
        const exists = prev.players.find((p) => p.socketId === player.socketId);
        if (exists) return prev;
        return { ...prev, players: [...prev.players, player] };
      });
      toast({
        title: "Nou Jugador!",
        description: `${player.name} s'ha unit!`,
        className: "border-green-500 text-green-500",
      });
    };

    const onPlayerUpdate = (data: {
      socketId: string;
      money: number;
      questionIndex: number;
      status: string;
    }) => {
      // Update specific player in the list without replacing the whole state
      setGameState((prev) => {
        if (!prev) return prev;
        const updatedPlayers = prev.players.map((p) => {
          if (p.socketId === data.socketId) {
            return {
              ...p,
              money: data.money,
              questionIndex: data.questionIndex,
              status: data.status as PlayerState["status"],
            };
          }
          return p;
        });
        return { ...prev, players: updatedPlayers };
      });
    };

    const onError = (msg: string) => {
      setIsCreating(false);
      toast({ title: "Error", description: msg, variant: "destructive" });
    };

    socket.on(WS_EVENTS.ROOM_CREATED, onRoomCreated);
    socket.on(WS_EVENTS.STATE_UPDATE, onStateUpdate);
    socket.on(WS_EVENTS.PLAYER_JOINED, onPlayerJoined);
    socket.on(WS_EVENTS.PLAYER_UPDATE, onPlayerUpdate);
    socket.on(WS_EVENTS.ERROR, onError);

    return () => {
      socket.off(WS_EVENTS.ROOM_CREATED, onRoomCreated);
      socket.off(WS_EVENTS.STATE_UPDATE, onStateUpdate);
      socket.off(WS_EVENTS.PLAYER_JOINED, onPlayerJoined);
      socket.off(WS_EVENTS.PLAYER_UPDATE, onPlayerUpdate);
      socket.off(WS_EVENTS.ERROR, onError);
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

  return { gameState, createRoom, startGame, isCreating };
}

// ===========================
// Hook for Player Logic
// ===========================
export function usePlayerGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayer, setMyPlayer] = useState<PlayerState | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const onGameJoined = (data: {
      gameState: GameState;
      player: PlayerState;
    }) => {
      setGameState(data.gameState);
      setMyPlayer(data.player);
      setIsJoining(false);
      toast({
        title: "Unit a la sala!",
        description: "Esperant al presentador...",
        className: "border-primary text-primary",
      });
    };

    const onStateUpdate = (data: GameState) => {
      setGameState(data);
      if (myPlayer) {
        const me = data.players.find((p) => p.socketId === socket.id);
        if (me) setMyPlayer(me);
      }
    };

    const onError = (data: { message: string } | string) => {
      setIsJoining(false);
      const msg = typeof data === "string" ? data : data.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
    };

    const onGameStarted = () => {
      // Update game status locally so the waiting screen disappears
      setGameState((prev) => (prev ? { ...prev, status: "playing" } : prev));
      toast({
        title: "El joc comença!",
        description: "Bona sort!",
        className: "border-yellow-500 text-yellow-500",
      });
    };

    socket.on("game_joined", onGameJoined);
    socket.on(WS_EVENTS.STATE_UPDATE, onStateUpdate);
    socket.on(WS_EVENTS.ERROR, onError);
    socket.on(WS_EVENTS.GAME_STARTED, onGameStarted);

    return () => {
      socket.off("game_joined", onGameJoined);
      socket.off(WS_EVENTS.STATE_UPDATE, onStateUpdate);
      socket.off(WS_EVENTS.ERROR, onError);
      socket.off(WS_EVENTS.GAME_STARTED, onGameStarted);
    };
  }, [toast, myPlayer]);

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

  // THIS IS THE KEY FIX:
  // Now nextQuestion sends the new money and question index to the server
  // so the host can see the update in real time
  const nextQuestion = (
    newMoney: number,
    newQuestionIndex: number,
    status: "active" | "eliminated" | "winner",
  ) => {
    if (!gameState) return;
    socket.emit(WS_EVENTS.SUBMIT_ANSWER, {
      roomCode: gameState.roomCode,
      money: newMoney,
      questionIndex: newQuestionIndex,
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
