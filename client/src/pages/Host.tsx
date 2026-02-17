import { useState } from "react";
import { useHostGame } from "@/hooks/use-game";
import { NeonButton } from "@/components/NeonButton";
import { Card } from "@/components/ui/card";
import { Users, Play, ChevronRight, Trophy } from "lucide-react";

export default function Host() {
  const { gameState, createRoom, startGame, nextQuestionGlobal, isCreating } =
    useHostGame();
  const [maxPlayers, setMaxPlayers] = useState(20);

  if (!gameState) {
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
                className="w-12 h-12 rounded-full border border-white/20 text-2xl"
              >
                -
              </button>
              <span className="text-5xl font-black">{maxPlayers}</span>
              <button
                onClick={() => setMaxPlayers(maxPlayers + 1)}
                className="w-12 h-12 rounded-full border border-white/20 text-2xl"
              >
                +
              </button>
            </div>
            <NeonButton
              onClick={() => createRoom("HOST", maxPlayers)}
              isLoading={isCreating}
              className="w-full h-16 text-lg"
            >
              CREAR NOVA SALA
            </NeonButton>
          </div>
        </Card>
      </div>
    );
  }

  const sortedPlayers = [...(gameState.players || [])].sort(
    (a, b) => b.money - a.money,
  );

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-8">
      <div className="max-w-6xl mx-auto flex gap-8">
        <div className="flex-1 space-y-6">
          <Card className="p-8 bg-primary/5 border-primary/20">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-xs uppercase text-primary font-bold tracking-widest">
                  Codi de Sala
                </p>
                <h2 className="text-6xl font-black font-mono">
                  {gameState.roomCode}
                </h2>
              </div>
              {gameState.status === "waiting" ? (
                <NeonButton onClick={startGame} className="h-16 px-8">
                  <Play className="mr-2" /> COMENÇAR JOC
                </NeonButton>
              ) : (
                <NeonButton onClick={nextQuestionGlobal} className="h-16 px-8">
                  SEGÜENT PREGUNTA <ChevronRight className="ml-2" />
                </NeonButton>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-3">
            {sortedPlayers.map((player, idx) => (
              <div
                key={player.socketId}
                className={`p-4 rounded-xl flex items-center justify-between border ${player.status === "eliminated" ? "bg-red-500/10 border-red-500/20 opacity-50" : "bg-white/5 border-white/10"}`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-black opacity-30 w-8">
                    #{idx + 1}
                  </span>
                  <span className="text-xl font-bold uppercase italic">
                    {player.name}
                  </span>
                </div>
                <div className="text-2xl font-mono font-black text-green-400">
                  {new Intl.NumberFormat().format(player.money)}€
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
