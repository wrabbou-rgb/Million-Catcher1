import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useGameSocket } from "@/hooks/use-game-socket";
import { Button } from "@/components/ui/button";
import { Watermark } from "@/components/Watermark";
import { Users, Play, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { WS_EVENTS } from "@shared/schema";

export default function Lobby() {
  const [, params] = useRoute("/host/lobby/:code");
  const [, setLocation] = useLocation();
  const { gameState, startGame, socketId } = useGameSocket();
  const { toast } = useToast();
  const roomCode = params?.code || "";

  // Redirect if game starts
  useEffect(() => {
    if (gameState?.status === "playing") {
      setLocation(`/host/game/${roomCode}`);
    }
  }, [gameState?.status, roomCode, setLocation]);

  // If user refreshed and lost state, or navigated directly
  // In a real app we'd try to reconnect/recover state.
  // For now, if no gameState, we might be lost.
  // But useGameSocket handles reconnection and state sync if socket stays alive.

  const handleStart = () => {
    if (gameState && gameState.players.length < 1) { // Allow 1 for testing, ideally 2
       toast({
         title: "No hi ha prou jugadors",
         description: "Es necessita almenys 1 jugador per començar (Testing Mode)",
         variant: "destructive"
       });
       return;
    }
    startGame(roomCode);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast({ title: "Codi copiat!", description: "El codi s'ha copiat al porta-retalls." });
  };

  return (
    <div className="min-h-screen flex flex-col p-8 relative">
      <Watermark />
      
      <div className="flex-1 flex flex-col items-center max-w-7xl mx-auto w-full">
        {/* Header Area */}
        <div className="w-full flex justify-between items-center mb-16">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-sm uppercase tracking-wider mb-1">Codi de Sala</span>
            <div 
              className="text-7xl md:text-9xl font-black tracking-tighter text-white cursor-pointer hover:text-primary transition-colors flex items-center gap-4"
              onClick={copyCode}
            >
              {roomCode}
              <Copy className="w-8 h-8 md:w-12 md:h-12 text-white/20" />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-sm text-muted-foreground uppercase tracking-wider">Jugadors</div>
              <div className="text-4xl font-bold flex items-center justify-end gap-2">
                <Users className="w-8 h-8 text-primary" />
                {gameState?.players.length || 0}
              </div>
            </div>
            
            <Button 
              size="lg" 
              className="h-20 px-12 text-2xl rounded-2xl shadow-[0_0_40px_rgba(139,92,246,0.3)]"
              onClick={handleStart}
            >
              <Play className="mr-3 w-8 h-8 fill-current" />
              Començar Joc
            </Button>
          </div>
        </div>

        {/* Players Grid */}
        <div className="w-full bg-white/5 rounded-3xl p-8 border border-white/10 min-h-[400px]">
          <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Esperant jugadors...
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <AnimatePresence>
              {gameState?.players.map((player) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="bg-card border border-white/10 p-4 rounded-xl flex items-center justify-center gap-3 shadow-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-lg">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium truncate max-w-[120px]">{player.name}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {(!gameState?.players || gameState.players.length === 0) && (
            <div className="h-full flex flex-col items-center justify-center py-20 text-white/20">
              <Users className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-xl">La sala és buida. Uneix-te amb el codi {roomCode}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
