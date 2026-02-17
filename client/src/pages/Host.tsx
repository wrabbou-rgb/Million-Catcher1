import { useHostGame } from "@/hooks/use-game";
import { NeonButton } from "@/components/NeonButton";
import { Card } from "@/components/ui/card";
import { Trophy, ArrowRight, Users, Star } from "lucide-react";

export default function Host() {
  const { gameState, createRoom, startGame, nextQuestionGlobal, isCreating } =
    useHostGame();

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] p-6">
        <Card className="w-full max-w-md p-8 bg-black/40 border-white/10">
          <h1 className="text-4xl font-black text-primary text-center mb-8">
            HOST
          </h1>
          <NeonButton
            onClick={() => createRoom("Host", 10)}
            isLoading={isCreating}
            className="w-full h-16 text-xl"
          >
            {" "}
            CREAR SALA{" "}
          </NeonButton>
        </Card>
      </div>
    );
  }

  if (gameState.status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0b] p-6">
        <p className="text-slate-500 font-mono tracking-widest mb-2 uppercase">
          Codi de Sala
        </p>
        <h1 className="text-9xl font-black text-white mb-12 tracking-tighter">
          {gameState.roomCode}
        </h1>
        <div className="flex items-center gap-2 mb-12 bg-slate-900 px-6 py-3 rounded-full border border-white/10 text-slate-400">
          <Users className="w-5 h-5" />{" "}
          <span className="text-xl font-bold text-white">
            {gameState.players.length}
          </span>{" "}
          jugadors units
        </div>
        <NeonButton onClick={startGame} className="px-16 py-8 text-2xl">
          {" "}
          COMENÇAR JOC{" "}
        </NeonButton>
      </div>
    );
  }

  const sortedPlayers = [...gameState.players].sort(
    (a, b) => b.money - a.money,
  );

  return (
    <div className="min-h-screen bg-[#0a0a0b] p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-white/10 pb-8">
          <div>
            <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">
              Classificació
            </h1>
            <p className="text-primary font-mono font-bold mt-2 tracking-widest">
              SALA: {gameState.roomCode}
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-sm font-mono uppercase">
              Jugadors actius
            </p>
            <p className="text-4xl font-black text-white">
              {gameState.players.filter((p) => p.status === "active").length}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.socketId}
              className={`flex items-center justify-between p-6 rounded-2xl border transition-all ${index === 0 ? "bg-primary/10 border-primary shadow-[0_0_30px_rgba(var(--primary),0.1)]" : "bg-slate-900/40 border-white/5"}`}
            >
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-2xl border border-white/10 shadow-inner">
                  {index === 0
                    ? "🥇"
                    : index === 1
                      ? "🥈"
                      : index === 2
                        ? "🥉"
                        : `#${index + 1}`}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    {player.name}{" "}
                    {index === 0 && (
                      <Star className="w-5 h-5 text-primary fill-primary" />
                    )}
                  </h3>
                  <p className="text-primary/60 font-mono text-sm uppercase font-bold">
                    Pregunta {player.questionIndex + 1} / 8
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-mono font-black text-green-400">
                  {player.money.toLocaleString()} €
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xs px-6">
          <NeonButton
            onClick={nextQuestionGlobal}
            variant="primary"
            className="w-full h-16 shadow-2xl"
          >
            AVANÇAR TOTS <ArrowRight className="ml-2" />
          </NeonButton>
        </div>
      </div>
      <div className="fixed bottom-4 right-6 text-white/20 text-xs">
        Developed by Walid Rabbou
      </div>
    </div>
  );
}
