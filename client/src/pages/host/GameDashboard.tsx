import { useEffect } from "react";
import { useRoute } from "wouter";
import { useGameSocket, type Player } from "@/hooks/use-game-socket";
import { Watermark } from "@/components/Watermark";
import { motion, AnimatePresence } from "framer-motion";
import { MoneyDisplay } from "@/components/MoneyDisplay";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import clsx from "clsx";

export default function GameDashboard() {
  const [, params] = useRoute("/host/game/:code");
  const roomCode = params?.code || "";
  const { gameState } = useGameSocket();

  // Sort players by money (descending) then by status (active first)
  const sortedPlayers = [...(gameState?.players || [])].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "active" ? -1 : 1;
    }
    return b.money - a.money;
  });

  const activePlayers = sortedPlayers.filter(p => p.status === "active");
  const eliminatedPlayers = sortedPlayers.filter(p => p.status === "eliminated");
  
  const currentQ = gameState?.currentQuestion;

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col overflow-hidden">
      <Watermark />
      
      {/* Top Bar: Question Info & Stats */}
      <div className="flex items-center justify-between mb-8 bg-card/50 backdrop-blur-md p-6 rounded-2xl border border-white/10">
        <div>
          <h2 className="text-muted-foreground uppercase tracking-wider text-sm font-semibold mb-1">Pregunta Actual</h2>
          <div className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-primary">{gameState?.questionIndex || 1}</span>
            <span className="text-white/30">/</span>
            <span>{gameState?.totalQuestions || 8}</span>
          </div>
        </div>
        
        <div className="text-center">
             <h1 className="text-4xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
               CLASSIFICACIÓ EN DIRECTE
             </h1>
        </div>

        <div className="text-right">
          <h2 className="text-muted-foreground uppercase tracking-wider text-sm font-semibold mb-1">Jugadors Actius</h2>
          <div className="text-3xl font-bold text-white">
            <span className="text-green-500">{activePlayers.length}</span>
            <span className="text-white/30">/</span>
            <span>{gameState?.players.length || 0}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
        {/* Main List: Active Players */}
        <div className="lg:col-span-2 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence>
              {activePlayers.map((player, index) => (
                <PlayerRow key={player.id} player={player} rank={index + 1} />
              ))}
            </AnimatePresence>
            
            {activePlayers.length === 0 && (
              <div className="p-12 text-center text-muted-foreground border-2 border-dashed border-white/10 rounded-2xl">
                Tots els jugadors han estat eliminats.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Question Status & Eliminated */}
        <div className="space-y-6 flex flex-col">
          {/* Current Question Status */}
          <Card className="bg-card/50 border-white/10 p-6">
             <h3 className="text-lg font-bold mb-4 text-white">Distribució de Respostes</h3>
             {/* This would ideally show an aggregate chart of where money is placed if the backend supported aggregation events easily. 
                 For now, keeping it simple. */}
             <div className="text-sm text-muted-foreground italic">
                La informació de les respostes es revela al final de cada ronda.
             </div>
          </Card>

          {/* Eliminated Players List */}
          <Card className="bg-card/50 border-white/10 p-6 flex-1 overflow-hidden flex flex-col">
            <h3 className="text-lg font-bold mb-4 text-red-500 flex items-center gap-2">
              <span>Eliminats</span>
              <Badge variant="destructive" className="ml-auto">{eliminatedPlayers.length}</Badge>
            </h3>
            <div className="overflow-y-auto flex-1 space-y-2 pr-2">
              {eliminatedPlayers.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg opacity-60 grayscale">
                  <span className="font-medium">{player.name}</span>
                  <span className="text-xs text-muted-foreground">0 €</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PlayerRow({ player, rank }: { player: Player, rank: number }) {
  // Determine status color/border
  const isConfirmed = player.hasConfirmed;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={clsx(
        "flex items-center p-4 rounded-xl border-l-4 shadow-lg transition-all",
        "bg-card border-y border-r border-white/5",
        rank === 1 ? "border-l-yellow-500 bg-yellow-500/5" : 
        rank === 2 ? "border-l-gray-400 bg-white/5" :
        rank === 3 ? "border-l-orange-700 bg-orange-700/5" :
        "border-l-primary"
      )}
    >
      <div className="w-12 h-12 flex items-center justify-center font-black text-2xl text-white/20 mr-4">
        #{rank}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-bold text-lg">{player.name}</span>
          {isConfirmed && (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/50 text-xs">
              Resposta Confirmada
            </Badge>
          )}
        </div>
        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
           {/* Visual progress bar of money relative to max possible (1M) */}
           <div 
             className="h-full bg-primary" 
             style={{ width: `${(player.money / 1000000) * 100}%` }}
           />
        </div>
      </div>

      <div className="text-right pl-6">
        <MoneyDisplay amount={player.money} size="lg" className="text-primary" />
      </div>
    </motion.div>
  );
}
