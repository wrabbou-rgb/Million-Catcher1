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
  Minus,
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

export default function GameDashboard() {
  const [, params] = useRoute("/host/game/:code");
  const roomCode = params?.code || "";
  const { gameState, revealResult, nextQuestion } = useGameSocket();

  // ✅ Guardamos el ranking anterior para comparar posiciones
  const prevRankRef = useRef<Record<string, number>>({});
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

  // Cada vez que cambia el orden, calculamos el delta de posición
  useEffect(() => {
    if (sortedPlayers.length === 0) return;

    const currentRank: Record<string, number> = {};
    sortedPlayers.forEach((p, i) => {
      currentRank[p.id] = i + 1;
    });

    const changes: Record<string, number> = {};
    sortedPlayers.forEach((p) => {
      const prev = prevRankRef.current[p.id];
      if (prev !== undefined && prev !== currentRank[p.id]) {
        changes[p.id] = prev - currentRank[p.id]; // positivo = subió, negativo = bajó
      }
    });

    if (Object.keys(changes).length > 0) {
      setRankChanges(changes);
      // Limpiamos el indicador después de 3 segundos
      setTimeout(() => setRankChanges({}), 3000);
    }

    prevRankRef.current = currentRank;
  }, [JSON.stringify(sortedPlayers.map((p) => p.id + p.money))]);

  // Pantalla de podio cuando termina la partida
  if (gameState?.status === "finished") {
    const top3 = sortedPlayers.slice(0, 3);
    const medals = ["🥇", "🥈", "🥉"];
    const podiumOrder = [1, 0, 2];

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <Watermark />
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent z-0" />
        <div className="relative z-10 w-full max-w-3xl text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6 drop-shadow-[0_0_40px_rgba(234,179,8,0.6)]" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-6xl font-black mb-12 bg-gradient-to-r from-yellow-400 to-primary bg-clip-text text-transparent"
          >
            CLASSIFICACIÓ FINAL
          </motion.h1>

          <div className="flex items-end justify-center gap-4 mb-12">
            {podiumOrder.map((playerIdx, visualIdx) => {
              const player = top3[playerIdx];
              if (!player) return null;
              const podiumHeights = ["h-40", "h-52", "h-32"];
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 60 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + visualIdx * 0.2, type: "spring" }}
                  className={`flex flex-col items-center justify-end ${podiumHeights[visualIdx]} flex-1 rounded-t-2xl border border-white/10 p-4
                    ${
                      playerIdx === 0
                        ? "bg-yellow-500/20 border-yellow-500/30"
                        : playerIdx === 1
                          ? "bg-white/10 border-white/20"
                          : "bg-orange-700/20 border-orange-700/30"
                    }`}
                >
                  <span className="text-3xl mb-2">{medals[playerIdx]}</span>
                  <span className="font-black text-lg text-white truncate w-full text-center">
                    {player.name}
                  </span>
                  <span className="text-primary font-bold text-sm">
                    {new Intl.NumberFormat().format(player.money)}€
                  </span>
                </motion.div>
              );
            })}
          </div>

          <div className="space-y-2">
            {sortedPlayers.map((player, idx) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 + idx * 0.05 }}
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
          </div>
        </div>
      </div>
    );
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
            <span className="text-primary">
              {(gameState?.currentQuestionIndex ?? 0) + 1}
            </span>
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
              className="border-primary text-primary hover:bg-primary/10"
              onClick={() => revealResult(roomCode)}
              disabled={!!revealedAnswer}
            >
              <Eye className="mr-2 w-4 h-4" />
              {revealedAnswer ? "Resposta Revelada" : "Revelar Resposta"}
            </Button>
            <Button
              className="bg-primary hover:bg-primary/80 font-bold"
              onClick={() => nextQuestion(roomCode)}
              disabled={!revealedAnswer}
            >
              Següent Pregunta
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="text-right">
          <h2 className="text-muted-foreground uppercase tracking-wider text-sm font-semibold mb-1">
            Jugadors Actius
          </h2>
          <div className="text-3xl font-bold text-white">
            <span className="text-green-500">{activePlayers.length}</span>
            <span className="text-white/30">/</span>
            <span>{gameState?.players.length || 0}</span>
          </div>
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

function PlayerRow({
  player,
  rank,
  revealedAnswer,
  rankChange,
}: {
  player: Player;
  rank: number;
  revealedAnswer: string | null;
  rankChange: number;
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

          {/* ✅ Indicador de cambio de posición */}
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

          {isConfirmed && !revealedAnswer && (
            <Badge
              variant="outline"
              className="bg-green-500/10 text-green-500 border-green-500/50 text-xs"
            >
              Resposta Confirmada
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

      <div className="text-right pl-6">
        <MoneyDisplay
          amount={player.money}
          size="lg"
          className="text-primary"
        />
      </div>
    </motion.div>
  );
}
