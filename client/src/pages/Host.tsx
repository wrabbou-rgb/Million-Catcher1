import { useState } from "react";
import { useHostGame } from "@/hooks/use-game";
import { NeonButton } from "@/components/NeonButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Trophy, PlayCircle } from "lucide-react";
import { MoneyCounter } from "@/components/MoneyCounter";

export default function Host() {
  const { gameState, createRoom, startGame, isCreating } = useHostGame();
  const [hostName, setHostName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(10);

  // === 1. Create Room Screen ===
  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 bg-black/40 border-white/10 backdrop-blur-xl">
            <h2 className="text-3xl text-center mb-8 text-primary font-display">Configurar Sala</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-slate-300">Nom del Presentador</Label>
                <Input 
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="bg-slate-900/50 border-slate-700 text-lg h-12"
                  placeholder="El teu nom..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Màxim de Jugadors: {maxPlayers}</Label>
                <input 
                  type="range" 
                  min="2" 
                  max="30" 
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                  className="w-full accent-primary h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <NeonButton 
                onClick={() => createRoom(hostName, maxPlayers)}
                disabled={!hostName}
                isLoading={isCreating}
                className="w-full"
              >
                Crear Sala
              </NeonButton>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // === 2. Lobby Screen ===
  if (gameState.status === "waiting") {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center bg-background">
        <div className="w-full max-w-6xl space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <h3 className="text-xl text-slate-400 font-mono">CODI DE LA SALA</h3>
            <div className="text-9xl font-black text-white tracking-widest drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
              {gameState.roomCode}
            </div>
            <div className="flex items-center justify-center gap-2 text-primary">
              <Users className="w-6 h-6" />
              <span className="text-2xl font-bold">{gameState.players.length} / {gameState.maxPlayers}</span>
            </div>
          </div>

          {/* Player Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <AnimatePresence>
              {gameState.players.map((player) => (
                <motion.div
                  key={player.socketId}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="bg-slate-900/60 border border-primary/30 p-4 rounded-xl flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                    {player.name[0].toUpperCase()}
                  </div>
                  <span className="font-bold text-white truncate w-full text-center">{player.name}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Start Button */}
          <div className="fixed bottom-10 left-0 right-0 flex justify-center">
            <NeonButton 
              onClick={startGame}
              disabled={gameState.players.length < 1} // Allow testing with 1 player
              className="text-2xl px-12 py-8"
            >
              <PlayCircle className="w-8 h-8 mr-3" />
              COMENÇAR JOC
            </NeonButton>
          </div>
        </div>
      </div>
    );
  }

  // === 3. Game Dashboard (Playing/Finished) ===
  const sortedPlayers = [...gameState.players].sort((a, b) => b.money - a.money);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col gap-6">
      {/* Top Bar */}
      <header className="flex items-center justify-between glass-panel p-4 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 p-2 rounded-lg">
            <span className="text-primary font-mono font-bold text-xl px-2">{gameState.roomCode}</span>
          </div>
          <h1 className="text-2xl text-white hidden md:block">Panell de Control</h1>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span>Pregunta:</span>
          <span className="text-white font-bold text-xl">{gameState.currentQuestionIndex + 1} / 8</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Leaderboard - Main Focus */}
        <Card className="lg:col-span-2 bg-black/40 border-white/10 backdrop-blur-md p-6 overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h2 className="text-2xl text-white">Classificació en Directe</h2>
          </div>
          
          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
            <AnimatePresence>
              {sortedPlayers.map((player, index) => (
                <motion.div
                  key={player.socketId}
                  layoutId={player.socketId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`
                    flex items-center justify-between p-4 rounded-xl border
                    ${player.status === 'eliminated' 
                      ? 'bg-red-900/10 border-red-900/30 opacity-60' 
                      : index === 0 
                        ? 'bg-yellow-500/10 border-yellow-500/50' 
                        : 'bg-slate-800/50 border-white/5'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold
                      ${index === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-white'}
                    `}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-bold text-lg text-white">{player.name}</div>
                      <div className="text-xs uppercase tracking-wider font-mono
                        ${player.status === 'active' ? 'text-green-500' : 'text-red-500'}
                      ">
                        {player.status === 'active' ? 'ACTIU' : 'ELIMINAT'}
                      </div>
                    </div>
                  </div>
                  <MoneyCounter value={player.money} className={`text-2xl font-bold ${player.status === 'eliminated' ? 'text-red-400' : 'text-green-400'}`} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Card>

        {/* Stats / Info Side Panel */}
        <div className="space-y-6">
          <Card className="bg-slate-900/50 border-white/10 p-6">
            <h3 className="text-lg text-slate-400 mb-4 uppercase tracking-widest">Estat de la Sala</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-white">{gameState.players.length}</div>
                <div className="text-xs text-slate-500 uppercase">Total</div>
              </div>
              <div className="bg-green-900/20 p-4 rounded-lg text-center border border-green-900/30">
                <div className="text-3xl font-bold text-green-400">
                  {gameState.players.filter(p => p.status === 'active').length}
                </div>
                <div className="text-xs text-green-600 uppercase">Vius</div>
              </div>
              <div className="bg-red-900/20 p-4 rounded-lg text-center border border-red-900/30 col-span-2">
                <div className="text-3xl font-bold text-red-400">
                  {gameState.players.filter(p => p.status === 'eliminated').length}
                </div>
                <div className="text-xs text-red-600 uppercase">Eliminats</div>
              </div>
            </div>
          </Card>

          <div className="bg-blue-900/20 border border-blue-500/30 p-6 rounded-xl">
             <h3 className="text-blue-400 font-bold uppercase mb-2">Vista del Presentador</h3>
             <p className="text-sm text-blue-200/70">
               Tu no controles el joc. Els jugadors avancen al seu ritme. 
               Només observa i comenta la jugada!
             </p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 right-6 text-white/60 text-xs font-mono">
        Developed by Walid Rabbou
      </div>
    </div>
  );
}
