import { useState, useEffect } from "react";
import { useHostGame } from "@/hooks/use-game";
import { NeonButton } from "@/components/NeonButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Trophy, PlayCircle, ArrowRight, Timer } from "lucide-react";

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat("ca-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function Host() {
  // Asegúrate de que useHostGame devuelva 'updateGameState' o similar para cambiar la pregunta global
  const { gameState, createRoom, startGame, isCreating } = useHostGame();
  const [hostName, setHostName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(10);

  // === 1. Pantalla de Creación ===
  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 bg-black/40 border-white/10 backdrop-blur-xl">
            <h1 className="text-4xl text-center mb-2 text-primary font-bold">
              ATRAPA UN MILIÓ
            </h1>
            <p className="text-center text-slate-400 mb-8">
              Motor de Cicle Otto - HOST
            </p>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-slate-300">El teu nom</Label>
                <Input
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="bg-slate-900/50 border-slate-700 text-lg h-12"
                  placeholder="El teu nom..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">
                  Màxim de Jugadors:{" "}
                  <span className="text-primary font-bold">{maxPlayers}</span>
                </Label>
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
                {" "}
                CREAR SALA{" "}
              </NeonButton>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // === 2. Lobby (Esperando jugadores) ===
  if (gameState.status === "waiting") {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center bg-background">
        <div className="w-full max-w-6xl space-y-12">
          <div className="text-center space-y-4">
            <h3 className="text-xl text-slate-400 font-mono uppercase tracking-widest">
              Codi de la Sala
            </h3>
            <div className="text-9xl font-black text-white tracking-widest drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
              {gameState.roomCode}
            </div>
            <div className="flex items-center justify-center gap-2 text-primary">
              <Users className="w-6 h-6" />
              <span className="text-2xl font-bold">
                {gameState.players.length} / {gameState.maxPlayers}
              </span>
            </div>
          </div>
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
                  <span className="font-bold text-white truncate w-full text-center">
                    {player.name}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="fixed bottom-10 left-0 right-0 flex justify-center">
            <NeonButton
              onClick={startGame}
              disabled={gameState.players.length < 1}
              className="text-2xl px-12 py-8"
            >
              <PlayCircle className="w-8 h-8 mr-3" /> COMENÇAR JOC
            </NeonButton>
          </div>
        </div>
      </div>
    );
  }

  // === 3. Panel de Control del Juego ===
  const activePlayers = gameState.players.filter(
    (p) => p.status === "active",
  ).length;
  const eliminatedPlayers = gameState.players.filter(
    (p) => p.status === "eliminated",
  ).length;
  const finishedPlayers = gameState.players.filter(
    (p) => p.status === "winner",
  ).length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col gap-6">
      <header className="flex items-center justify-between bg-slate-900/80 border border-white/10 p-4 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 p-2 rounded-lg">
            <span className="text-primary font-mono font-bold text-xl px-2">
              {gameState.roomCode}
            </span>
          </div>
          <h1 className="text-2xl text-white font-bold">
            PREGUNTA {gameState.currentQuestionIndex + 1} / 8
          </h1>
        </div>

        {/* TEMPORIZADOR DEL HOST */}
        <div className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-lg border border-white/10">
          <Timer className="text-primary w-5 h-5" />
          <span className="text-white font-mono font-bold text-xl">
            {(gameState as any).questionTimer || 0}s
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-sm">Vius:</span>
          <span className="text-green-400 font-bold text-xl">
            {activePlayers}
          </span>
          <span className="text-slate-600 mx-1">/</span>
          <span className="text-white font-bold text-xl">
            {gameState.players.length}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Leaderboard (Tu lógica de sortedPlayers aquí) */}
        <Card className="lg:col-span-2 bg-black/40 border-white/10 backdrop-blur-md p-6 overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h2 className="text-2xl text-white font-bold">
              CLASSIFICACIÓ EN DIRECTE
            </h2>
          </div>
          <div className="space-y-3 overflow-y-auto pr-2 flex-1">
            {gameState.players.map((player, index) => (
              <div
                key={player.socketId}
                className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-slate-800/50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-bold text-white">{player.name}</div>
                    <div
                      className={`text-xs ${player.status === "active" ? "text-green-500" : "text-red-500"}`}
                    >
                      {player.status.toUpperCase()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-yellow-400">
                    {formatMoney(player.money)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Panel de Sincronización */}
        <div className="space-y-6">
          <Card className="bg-slate-900/50 border-white/10 p-6">
            <h3 className="text-lg text-slate-400 mb-4 uppercase tracking-widest text-center italic">
              CONTROL DE SINCRONITZACIÓ
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl text-center">
                <p className="text-blue-200 text-sm mb-4">
                  Prem per avançar a tots els jugadors a la següent pregunta
                  simultàniament.
                </p>
                {/* Aquí deberías llamar a una función del hook que haga: 
                  socket.emit("update-game-state", { currentQuestionIndex: nextIndex })
                */}
                <NeonButton className="w-full h-16 text-lg" variant="primary">
                  AVANÇAR PREGUNTA <ArrowRight className="ml-2" />
                </NeonButton>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-white">
                    {activePlayers}
                  </div>
                  <div className="text-xs text-slate-500 uppercase">Actius</div>
                </div>
                <div className="bg-red-900/20 p-4 rounded-lg text-center border border-red-900/30">
                  <div className="text-3xl font-bold text-red-400">
                    {eliminatedPlayers}
                  </div>
                  <div className="text-xs text-red-600 uppercase">
                    Eliminats
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <div className="fixed bottom-4 right-6 text-white/50 text-xs pointer-events-none">
        {" "}
        Developed by Walid Rabbou{" "}
      </div>
    </div>
  );
}
