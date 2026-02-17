import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGameSocket } from "@/hooks/use-game-socket";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

export default function Host() {
  const { gameState, createRoom } = useGameSocket();
  const [, setLocation] = useLocation();
  const [maxPlayers, setMaxPlayers] = useState(20);
  const [isCreating, setIsCreating] = useState(false);

  // Cuando se crea la sala, redirigimos al lobby
  useEffect(() => {
    if (gameState?.roomCode) {
      setLocation(`/host/lobby/${gameState.roomCode}`);
    }
  }, [gameState?.roomCode, setLocation]);

  const handleCreate = () => {
    setIsCreating(true);
    setTimeout(() => setIsCreating(false), 3000);
    createRoom("HOST", maxPlayers);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] p-6">
      <Card className="w-full max-w-md p-10 bg-black/40 border-white/10 backdrop-blur-2xl">
        <h1 className="text-4xl font-black text-white mb-8 text-center italic tracking-tighter text-primary">
          ATRAPA UN MILIÓ
        </h1>
        <div className="space-y-6 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">
            Límit de jugadors
          </p>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => setMaxPlayers(Math.max(2, maxPlayers - 1))}
              className="w-12 h-12 rounded-full border border-white/20 text-2xl text-white"
            >
              -
            </button>
            <span className="text-5xl font-black text-white">{maxPlayers}</span>
            <button
              onClick={() => setMaxPlayers(maxPlayers + 1)}
              className="w-12 h-12 rounded-full border border-white/20 text-2xl text-white"
            >
              +
            </button>
          </div>
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="w-full h-16 text-lg font-black bg-primary hover:bg-primary/80"
          >
            <Play className="mr-2" />
            {isCreating ? "CREANT SALA..." : "CREAR NOVA SALA"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
