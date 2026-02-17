import { useHostGame } from "@/hooks/use-game";
import { NeonButton } from "@/components/NeonButton";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ArrowRight, Users, Star, Timer } from "lucide-react"; // Ahora sí los usamos todos

const formatMoney = (amount: number | undefined | null) => {
  const safe = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat("ca-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);
};

export default function Host() {
  const { gameState, createRoom, startGame, nextQuestionGlobal, isCreating } =
    useHostGame();

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="w-full max-w-md p-8 bg-black/40 border-white/10 backdrop-blur-xl">
            <h1 className="text-4xl font-black text-primary text-center mb-8 italic uppercase">
              Atrapa un Milió
            </h1>
            <NeonButton
              onClick={() => createRoom("Host", 30)}
              isLoading={isCreating}
              className="w-full h-16 text-xl"
            >
              CREAR NOVA SALA
            </NeonButton>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (gameState.status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0b] p-6 text-center">
        <p className="text-slate-500 font-mono tracking-[0.3em] mb-4 uppercase">
          Codi d'accés
        </p>
        <h1 className="text-9xl font-black text-white mb-12 tracking-tighter drop-shadow-[0_0_30px_rgba(var(--primary),0.3)]">
          {gameState.roomCode}
        </h1>
        <div className="flex items-center gap-6 mb-12 bg-slate-900/50 px-10 py-5 rounded-3xl border border-white/10 backdrop-blur-md">
          <div className="flex flex-col items-center border-r border-white/10 pr-6">
            <Users className="w-8 h-8 text-primary mb-1" />
            <span className="text-3xl font-bold text-white">
              {gameState.players.length}
            </span>
          </div>
          <p className="uppercase text-sm tracking-widest font-mono text-slate-400">
            Jugadors
            <br />
            esperant
          </p>
        </div>
        <NeonButton
          onClick={startGame}
          className="px-16 py-8 text-2xl shadow-2xl"
        >
          COMENÇAR EL JOC
        </NeonButton>
      </div>
    );
  }

  // Ordenamos por dinero para la posición dinámica
  const sortedPlayers = [...gameState.players].sort(
    (a, b) => b.money - a.money,
  );

  return (
    <div className="min-h-screen bg-[#0a0a0b] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-white/10 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="text-yellow-500 w-8 h-8" />{" "}
              {/* USAMOS TROPHY AQUÍ */}
              <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">
                Rànquing
              </h1>
            </div>
            <div className="flex gap-4">
              <p className="text-primary font-mono font-bold tracking-widest bg-primary/10 px-3 py-1 rounded border border-primary/20">
                SALA: {gameState.roomCode}
              </p>
              <div className="flex items-center gap-2 text-slate-400 font-mono font-bold tracking-widest bg-white/5 px-3 py-1 rounded border border-white/10">
                <Timer className="w-4 h-4" /> {/* USAMOS TIMER AQUÍ */}
                PREGUNTA {gameState.currentQuestionIndex + 1} / 8
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mb-1">
              En joc
            </p>
            <p className="text-5xl font-black text-white">
              {gameState.players.filter((p) => p.status === "active").length}
              <span className="text-slate-700 text-2xl ml-1">
                /{gameState.players.length}
              </span>
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {sortedPlayers.map((player, index) => (
              <motion.div
                key={player.socketId}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center justify-between p-6 rounded-2xl border transition-all ${
                  index === 0
                    ? "bg-primary/10 border-primary shadow-lg"
                    : "bg-slate-900/40 border-white/5"
                }`}
              >
                <div className="flex items-center gap-6">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black border ${
                      index === 0
                        ? "bg-yellow-500/20 border-yellow-500 text-yellow-500"
                        : "bg-slate-800 border-white/10 text-slate-500"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                      {player.name}
                      {index === 0 && (
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      )}
                    </h3>
                    <p className="text-slate-500 text-xs font-mono">
                      ESTAT: {player.status.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-3xl font-mono font-black ${player.money > 0 ? "text-green-400" : "text-slate-700"}`}
                  >
                    {formatMoney(player.money)}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* BOTÓN PARA AVANZAR A TODOS */}
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-50">
          <NeonButton
            onClick={nextQuestionGlobal}
            className="w-full h-20 text-2xl group shadow-2xl"
          >
            AVANÇAR PREGUNTA{" "}
            <ArrowRight className="ml-3 group-hover:translate-x-2 transition-transform" />
          </NeonButton>
        </div>
      </div>
      <div className="fixed bottom-4 right-6 text-white/20 text-[10px] font-mono pointer-events-none uppercase">
        Developed by Walid Rabbou
      </div>
    </div>
  );
}
