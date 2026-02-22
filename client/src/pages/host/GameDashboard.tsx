import { useRoute } from "wouter";
import { useGameSocket, type Player } from "@/hooks/use-game-socket";
import { Watermark } from "@/components/Watermark";
import { motion, AnimatePresence } from "framer-motion";
import { MoneyDisplay } from "@/components/MoneyDisplay";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Eye,
  ArrowRight,
  Trophy,
  TrendingUp,
  TrendingDown,
  Trash2,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";

// ── Podio dramàtic ───────────────────────────────────────────────────────────
function PodiumScreen({ players }: { players: Player[] }) {
  const sorted = [...players].sort((a, b) => b.money - a.money);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const medals = ["🥇", "🥈", "🥉"];
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1400),
      setTimeout(() => setPhase(2), 3800),
      setTimeout(() => setPhase(3), 6500),
      setTimeout(() => setPhase(4), 9000),
    ];
    const confettiTimer = setTimeout(() => {
      const end = Date.now() + 5000;
      (function frame() {
        confetti({
          particleCount: 10,
          angle: 60,
          spread: 80,
          origin: { x: 0 },
          colors: ["#FFD700", "#a855f7", "#06b6d4", "#fff"],
        });
        confetti({
          particleCount: 10,
          angle: 120,
          spread: 80,
          origin: { x: 1 },
          colors: ["#FFD700", "#a855f7", "#06b6d4", "#fff"],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }, 6500);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(confettiTimer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <Watermark />
      <AnimatePresence>
        {phase === 0 && (
          <motion.div
            key="curtain"
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              transition: { duration: 0.9, ease: "easeInOut" },
            }}
            className="absolute inset-0 bg-background z-50 flex flex-col items-center justify-center gap-6"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
            >
              <Trophy className="w-32 h-32 text-yellow-400 drop-shadow-[0_0_60px_rgba(234,179,8,0.9)]" />
            </motion.div>
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="text-white/50 text-2xl font-black tracking-widest uppercase"
            >
              Preparant el Podi...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/8 via-transparent to-purple-500/5 z-0" />
      <div className="relative z-10 w-full max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : -40 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-10"
        >
          <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_40px_rgba(234,179,8,0.7)]" />
          <h1 className="text-5xl md:text-7xl font-black bg-gradient-to-r from-yellow-400 via-primary to-accent bg-clip-text text-transparent">
            CLASSIFICACIÓ FINAL
          </h1>
        </motion.div>
        <div className="flex items-end justify-center gap-3 mb-12 min-h-[280px]">
          <div className="flex-1">
            <AnimatePresence>
              {phase >= 1 && top3[2] && (
                <motion.div
                  initial={{ opacity: 0, y: 100, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 160, damping: 16 }}
                  className="flex flex-col items-center justify-end h-36 rounded-t-2xl border border-orange-700/40 bg-orange-700/20 p-4"
                >
                  <span className="text-3xl mb-2">🥉</span>
                  <span className="font-black text-base text-white truncate w-full text-center">
                    {top3[2].name}
                  </span>
                  <span className="text-primary font-bold text-xs mt-1">
                    {new Intl.NumberFormat().format(top3[2].money)}€
                  </span>
                  <span className="text-white/30 text-xs">3r lloc</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1">
            <AnimatePresence>
              {phase >= 3 && top3[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 120, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 140, damping: 14 }}
                  className="flex flex-col items-center justify-end h-64 rounded-t-2xl border border-yellow-500/50 bg-yellow-500/15 p-4 shadow-[0_0_40px_rgba(234,179,8,0.3)]"
                >
                  <motion.span
                    animate={{ rotate: [0, -12, 12, -8, 0] }}
                    transition={{ delay: 0.4, duration: 0.7 }}
                    className="text-5xl mb-3"
                  >
                    🥇
                  </motion.span>
                  <span className="font-black text-xl text-white truncate w-full text-center">
                    {top3[0].name}
                  </span>
                  <span className="text-yellow-400 font-bold text-sm mt-1">
                    {new Intl.NumberFormat().format(top3[0].money)}€
                  </span>
                  <span className="text-yellow-400/50 text-xs">1r lloc</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1">
            <AnimatePresence>
              {phase >= 2 && top3[1] && (
                <motion.div
                  initial={{ opacity: 0, y: 100, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 160, damping: 16 }}
                  className="flex flex-col items-center justify-end h-48 rounded-t-2xl border border-slate-400/40 bg-slate-400/15 p-4"
                >
                  <span className="text-4xl mb-2">🥈</span>
                  <span className="font-black text-lg text-white truncate w-full text-center">
                    {top3[1].name}
                  </span>
                  <span className="text-primary font-bold text-xs mt-1">
                    {new Intl.NumberFormat().format(top3[1].money)}€
                  </span>
                  <span className="text-white/30 text-xs">2n lloc</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <AnimatePresence>
          {phase >= 4 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-2"
            >
              <p className="text-white/30 text-sm uppercase tracking-wider mb-4">
                Classificació completa
              </p>
              {sorted.map((player, idx) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white/30 font-black w-8">
                      #{idx + 1}
                    </span>
                    <span className="font-bold">
                      {idx < 3 ? medals[idx] : ""} {player.name}
                    </span>
                  </div>
                  <MoneyDisplay
                    amount={player.money}
                    size="sm"
                    className="text-primary"
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        {phase >= 1 && phase < 4 && rest.length > 0 && (
          <p className="text-white/20 text-sm mt-6">
            {rest.length} jugador{rest.length > 1 ? "s" : ""} més...
          </p>
        )}
      </div>
    </div>
  );
}

// ── Dashboard principal ──────────────────────────────────────────────────────
export default function GameDashboard() {
  const [, params] = useRoute("/host/game/:code");
  const roomCode = params?.code || "";
  const { gameState, revealResult, nextQuestion, eliminatePlayer } =
    useGameSocket();

  const [isAdvancing, setIsAdvancing] = useState(false);
  const [justAdvanced, setJustAdvanced] = useState(false);
  const prevRankRef = useRef<Record<string, number>>({});
  const rankInitialized = useRef(false);
  const [rankChanges, setRankChanges] = useState<Record<string, number>>({});

  const sortedPlayers = [...(gameState?.players || [])].sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    return b.money - a.money;
  });

  const activePlayers = sortedPlayers.filter((p) => p.status === "active");
  const eliminatedPlayers = sortedPlayers.filter(
    (p) => p.status === "eliminated",
  );
  const revealedAnswer: string | null =
    (gameState as any)?.revealedAnswer ?? null;
  const confirmedCount = activePlayers.filter((p) => p.hasConfirmed).length;

  useEffect(() => {
    if (justAdvanced && !revealedAnswer) {
      setJustAdvanced(false);
      setIsAdvancing(false);
    }
  }, [revealedAnswer, justAdvanced]);

  // ✅ Fix: trackea money Y hasConfirmed para detectar cambios en la primera pregunta
  // ✅ Fix: inicializa prevRankRef la primera vez que llegan jugadores (sin emitir cambios)
  useEffect(() => {
    if (sortedPlayers.length === 0) return;

    const currentRank: Record<string, number> = {};
    sortedPlayers.forEach((p, i) => {
      currentRank[p.id] = i + 1;
    });

    // Primera vez: solo guardamos la referencia, no emitimos cambios
    if (!rankInitialized.current) {
      prevRankRef.current = currentRank;
      rankInitialized.current = true;
      return;
    }

    const changes: Record<string, number> = {};
    sortedPlayers.forEach((p) => {
      const prev = prevRankRef.current[p.id];
      if (prev !== undefined && prev !== currentRank[p.id]) {
        changes[p.id] = prev - currentRank[p.id];
      }
    });

    if (Object.keys(changes).length > 0) {
      setRankChanges(changes);
      setTimeout(() => setRankChanges({}), 3000);
    }

    prevRankRef.current = currentRank;
    // ✅ Escucha money Y hasConfirmed para actualizar en tiempo real
  }, [
    JSON.stringify(
      sortedPlayers.map((p) => `${p.id}-${p.money}-${p.hasConfirmed}`),
    ),
  ]);

  // ✅ Reset del ranking al cambiar de pregunta
  useEffect(() => {
    rankInitialized.current = false;
    prevRankRef.current = {};
    setRankChanges({});
  }, [gameState?.currentQuestionIndex]);

  const handleNextQuestion = () => {
    setIsAdvancing(true);
    setJustAdvanced(true);
    nextQuestion(roomCode);
  };

  if (gameState?.status === "finished") {
    return <PodiumScreen players={gameState.players} />;
  }

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col overflow-hidden">
      <Watermark />

      <div className="flex items-center justify-between mb-8 bg-card/50 backdrop-blur-md p-6 rounded-2xl border border-white/10">
        <div>
          <h2 className="text-muted-foreground uppercase tracking-wider text-sm font-semibold mb-1">
            Pregunta Actual
          </h2>
          <div className="text-3xl font-bold text-white flex items-center gap-3">
            <motion.span
              key={gameState?.currentQuestionIndex}
              initial={{ scale: 1.5, color: "#06b6d4" }}
              animate={{ scale: 1, color: "#06b6d4" }}
              transition={{ duration: 0.4 }}
              className="text-primary"
            >
              {(gameState?.currentQuestionIndex ?? 0) + 1}
            </motion.span>
            <span className="text-white/30">/</span>
            <span>
              {gameState?.totalQuestions ?? gameState?.questions?.length ?? 8}
            </span>
          </div>
        </div>

        <div className="text-center flex flex-col items-center gap-4">
          <h1 className="text-4xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            CLASSIFICACIÓ EN DIRECTE
          </h1>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className={clsx(
                "border-primary text-primary hover:bg-primary/10 transition-all",
                revealedAnswer &&
                  "border-green-500 text-green-400 bg-green-500/10 hover:bg-green-500/10 cursor-default",
              )}
              onClick={() => !revealedAnswer && revealResult(roomCode)}
              disabled={!!revealedAnswer}
            >
              {revealedAnswer ? (
                <>
                  <CheckCircle2 className="mr-2 w-4 h-4 text-green-400" />
                  Resposta Revelada ✓
                </>
              ) : (
                <>
                  <Eye className="mr-2 w-4 h-4" />
                  Revelar Resposta
                </>
              )}
            </Button>

            <Button
              className={clsx(
                "font-bold transition-all",
                isAdvancing
                  ? "bg-yellow-500 hover:bg-yellow-500 text-black cursor-wait"
                  : "bg-primary hover:bg-primary/80",
              )}
              onClick={handleNextQuestion}
              disabled={!revealedAnswer || isAdvancing}
            >
              {isAdvancing ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Canviant...
                </>
              ) : (
                <>
                  Següent Pregunta
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ✅ Contador de confirmats */}
        <div className="text-right">
          <h2 className="text-muted-foreground uppercase tracking-wider text-sm font-semibold mb-1">
            Han Confirmat
          </h2>
          <div className="text-3xl font-bold text-white flex items-center justify-end gap-2">
            <motion.span
              key={confirmedCount}
              initial={{ scale: 1.4 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.25 }}
              className={clsx(
                "font-black",
                confirmedCount === activePlayers.length &&
                  activePlayers.length > 0
                  ? "text-green-400"
                  : "text-yellow-400",
              )}
            >
              {confirmedCount}
            </motion.span>
            <span className="text-white/30">/</span>
            <span>{activePlayers.length}</span>
          </div>
          {!revealedAnswer &&
            activePlayers.length > 0 &&
            confirmedCount === activePlayers.length && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-green-400 text-xs font-bold mt-1"
              >
                Tots confirmats ✓
              </motion.p>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
        <div className="lg:col-span-2 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence>
              {activePlayers.map((player, index) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  rank={index + 1}
                  revealedAnswer={revealedAnswer}
                  rankChange={rankChanges[player.id] ?? 0}
                  onEliminate={(sid) => eliminatePlayer(roomCode, sid)}
                />
              ))}
            </AnimatePresence>
            {activePlayers.length === 0 && (
              <div className="p-12 text-center text-muted-foreground border-2 border-dashed border-white/10 rounded-2xl">
                Tots els jugadors han estat eliminats.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 flex flex-col">
          <Card className="bg-card/50 border-white/10 p-6">
            <h3 className="text-lg font-bold mb-4 text-white">
              Resposta Correcta
            </h3>
            {revealedAnswer ? (
              <div className="flex items-center justify-center h-16 rounded-xl bg-green-500/20 border border-green-500/50">
                <span className="text-4xl font-black text-green-400">
                  {revealedAnswer}
                </span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                Prem "Revelar Resposta" per mostrar-la.
              </div>
            )}
          </Card>

          <Card className="bg-card/50 border-white/10 p-6 flex-1 overflow-hidden flex flex-col">
            <h3 className="text-lg font-bold mb-4 text-red-500 flex items-center gap-2">
              <span>Eliminats</span>
              <Badge variant="destructive" className="ml-auto">
                {eliminatedPlayers.length}
              </Badge>
            </h3>
            <div className="overflow-y-auto flex-1 space-y-2 pr-2">
              {eliminatedPlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 bg-black/20 rounded-lg opacity-60 grayscale"
                >
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

// ── Fila de jugador ──────────────────────────────────────────────────────────
function PlayerRow({
  player,
  rank,
  revealedAnswer,
  rankChange,
  onEliminate,
}: {
  player: Player;
  rank: number;
  revealedAnswer: string | null;
  rankChange: number;
  onEliminate: (socketId: string) => void;
}) {
  const isConfirmed = player.hasConfirmed;
  const playerBet = (player as any).currentBet || {};
  const betOnCorrect = revealedAnswer ? playerBet[revealedAnswer] || 0 : 0;
  const didWin = revealedAnswer ? betOnCorrect > 0 : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={clsx(
        "flex items-center p-4 rounded-xl border-l-4 shadow-lg transition-all",
        "bg-card border-y border-r border-white/5",
        revealedAnswer && didWin
          ? "border-l-green-500 bg-green-500/10"
          : revealedAnswer && !didWin
            ? "border-l-red-500 bg-red-500/5"
            : rank === 1
              ? "border-l-yellow-500 bg-yellow-500/5"
              : rank === 2
                ? "border-l-gray-400 bg-white/5"
                : rank === 3
                  ? "border-l-orange-700 bg-orange-700/5"
                  : "border-l-primary",
      )}
    >
      <div className="w-12 h-12 flex items-center justify-center font-black text-2xl text-white/20 mr-4">
        #{rank}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-bold text-lg">{player.name}</span>
          <AnimatePresence>
            {rankChange !== 0 && (
              <motion.div
                key={`change-${rankChange}`}
                initial={{ opacity: 0, scale: 0.5, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className={clsx(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black",
                  rankChange > 0
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400",
                )}
              >
                {rankChange > 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3" />+{rankChange}
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3 h-3" />
                    {rankChange}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ✅ Badge confirmat: apareix en quant el jugador confirma, fins que es revela */}
          {isConfirmed && !revealedAnswer && (
            <Badge
              variant="outline"
              className="bg-green-500/10 text-green-500 border-green-500/50 text-xs"
            >
              ✓ Confirmat
            </Badge>
          )}
          {revealedAnswer && didWin && (
            <Badge
              variant="outline"
              className="bg-green-500/20 text-green-400 border-green-500/50 text-xs"
            >
              ✓ Encertat
            </Badge>
          )}
          {revealedAnswer && !didWin && (
            <Badge
              variant="outline"
              className="bg-red-500/20 text-red-400 border-red-500/50 text-xs"
            >
              ✗ Fallat
            </Badge>
          )}
        </div>
        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-700"
            style={{ width: `${(player.money / 1000000) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 pl-6">
        <MoneyDisplay
          amount={player.money}
          size="lg"
          className="text-primary"
        />
        {!revealedAnswer && (
          <button
            onClick={() => onEliminate((player as any).socketId || player.id)}
            className="flex items-center gap-1 text-xs text-red-400/60 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
          >
            <Trash2 className="w-3 h-3" />
            Eliminar
          </button>
        )}
      </div>
    </motion.div>
  );
}
