import { useState, useEffect, useCallback } from "react";
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

// Hook for Host Logic
export function useHostGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Listeners
    const onRoomCreated = (data: GameState) => {
      setGameState(data);
      setIsCreating(false);
      toast({ title: "Sala Creada!", description: `Codi: ${data.roomCode}`, className: "border-primary text-primary" });
    };

    const onStateUpdate = (data: GameState) => {
      setGameState(data);
    };

    const onPlayerJoined = (player: PlayerState) => {
      toast({ title: "Nou Jugador", description: `${player.name} s'ha unit!`, className: "border-green-500 text-green-500" });
    };

    const onError = (msg: string) => {
      setIsCreating(false);
      toast({ title: "Error", description: msg, variant: "destructive" });
    };

    socket.on(WS_EVENTS.ROOM_CREATED, onRoomCreated);
    socket.on(WS_EVENTS.STATE_UPDATE, onStateUpdate);
    socket.on(WS_EVENTS.PLAYER_JOINED, onPlayerJoined);
    socket.on(WS_EVENTS.ERROR, onError);

    return () => {
      socket.off(WS_EVENTS.ROOM_CREATED, onRoomCreated);
      socket.off(WS_EVENTS.STATE_UPDATE, onStateUpdate);
      socket.off(WS_EVENTS.PLAYER_JOINED, onPlayerJoined);
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

// Hook for Player Logic
export function usePlayerGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayer, setMyPlayer] = useState<PlayerState | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const onGameJoined = (data: { gameState: GameState; player: PlayerState }) => {
      setGameState(data.gameState);
      setMyPlayer(data.player);
      setIsJoining(false);
      toast({ title: "Unit a la sala!", description: "Esperant al fitrió...", className: "border-primary text-primary" });
    };

    const onStateUpdate = (data: GameState) => {
      setGameState(data);
      // Find self to update money/status
      if (myPlayer) {
        const me = data.players.find(p => p.socketId === socket.id);
        if (me) setMyPlayer(me);
      }
    };

    const onError = (msg: string) => {
      setIsJoining(false);
      toast({ title: "Error", description: msg, variant: "destructive" });
    };

    const onGameStarted = () => {
       toast({ title: "El joc comença!", description: "Bona sort!", className: "border-yellow-500 text-yellow-500" });
    };

    socket.on("game_joined", onGameJoined); // Custom event for confirmation
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
    socket.emit(WS_EVENTS.UPDATE_BET, { roomCode: gameState.roomCode, distribution });
  };

  const confirmBet = () => {
    if (!gameState) return;
    socket.emit(WS_EVENTS.CONFIRM_BET, { roomCode: gameState.roomCode });
  };

  const nextQuestion = () => {
    if (!gameState) return;
    socket.emit(WS_EVENTS.NEXT_QUESTION, { roomCode: gameState.roomCode });
  };

  return { 
    gameState, 
    myPlayer, 
    joinRoom, 
    updateBet, 
    confirmBet, 
    nextQuestion,
    isJoining 
  };
}
