import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useGameSocket } from "@/hooks/use-game-socket";
import { Watermark } from "@/components/Watermark";
import { Button } from "@/components/ui/button";
import { OptionCard } from "@/components/OptionCard";
import { MoneyDisplay } from "@/components/MoneyDisplay";
import { motion } from "framer-motion";
import { Loader2, Lock, Trophy, Skull, WifiOff, XCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";

export default function PlayerGame() {
  const [, params] = useRoute("/play/:code");
  const roomCode = params?.code || "";
  const { gameState, socketId, updateBet, confirmBet, joinRoom, kicked } =
    useGameSocket();
  const { toast } = useToast();
  const [localBet, setLocalBet] = useState<Record<string, number>>({});
  const [isReconnecting, setIsReconnecting] = useState(false);

  const me = gameState?.players.find(
    (p: any) => p.socketId === socketId || p.id === socketId,
  );
  const currentQuestion =
    gameState?.currentQuestion ??
    (gameState?.questions
      ? gameState.questions[gameState.currentQuestionIndex]
      : null);
  const revealedAnswer: string | null =
    (gameState as any)?.revealedAnswer ?? null;

  // ✅ Reconexión automática
  useEffect(() => {
    if (!roomCode || !socketId || me) return;
    const savedName = sessionStorage.getItem(`player_name_${roomCode}`);
    if (savedName && gameState) {
      setIsReconnecting(true);
      joinRoom(roomCode, savedName);
      setTimeout(() => setIsReconnecting(false), 3000);
    }
  }, [socketId, gameState, me, roomCode]);

  // ✅ Guardar nombre cuando nos unimos correctamente
  useEffect(() => {
    if (me?.name && roomCode) {
      sessionStorage.setItem(`player_name_${roomCode}`, me.name);
    }
  }, [me?.name, roomCode]);

  useEffect(() => {
    setLocalBet({});
  }, [gameState?.currentQuestionIndex]);

  useEffect(() => {
    if (gameState?.status === "finished" && me?.status === "winner") {
      const duration = 3000;
      const end = Date.now() + duration;
      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#a855f7", "#06b6d4"],
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#a855f7", "#06b6d4"],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }
  }, [gameState?.status, me?.status]);

  // ✅ PANTALLA DE EXPULSIÓN
  if (kicked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Watermark />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="mb-6"
        >
          <XCircle className="w-28 h-28 text-red-500 mx-auto drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]" />
        </motion.div>
        <h1 className="text-4xl font-black text-red-400 mb-3">
          Has estat expulsat
        </h1>
        <p className="text-white/60 text-lg mb-10">{kicked}</p>
        <Button
          size="lg"
          className="h-14 px-10 text-lg font-bold"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          Tornar a l'inici
        </Button>
      </div>
    );
  }

  // Reconectando...
  if (isReconnecting || (!me && gameState)) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <WifiOff className="w-12 h-12 text-yellow-500 mb-2" />
        <p className="text-white font-bold text-xl">Reconnectant...</p>
        <p className="text-muted-foreground text-sm">
          Tornant a connectar amb la sala
        </p>
        <Loader2 className="w-8 h-8 animate-spin text-primary mt-2" />
      </div>
    );
  }

  if (!gameState || !me) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Connectant amb la sala...</p>
      </div>
    );
  }

  if (gameState.status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Watermark />
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mb-8"
        >
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
        </motion.div>
        <h1 className="text-3xl font-bold mb-2">Benvingut, {me.name}!</h1>
        <p className="text-muted-foreground text-lg">
          Esperant que el fitrió iniciï el joc...
        </p>
      </div>
    );
  }

  if (me.status === "eliminated") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-red-950/20">
        <Watermark />
        <Skull className="w-24 h-24 text-red-500 mb-6" />
        <h1 className="text-4xl font-black text-red-500 mb-4">
          HAS ESTAT ELIMINAT
        </h1>
        <p className="text-xl text-white/60">Et vas quedar sense diners.</p>
        <div className="mt-12 p-6 bg-black/40 rounded-xl max-w-sm w-full">
          <p className="text-sm text-muted-foreground uppercase mb-2">
            Pots seguir mirant
          </p>
          <div className="text-2xl font-bold">La partida continua...</div>
        </div>
      </div>
    );
  }

  if (gameState.status === "finished") {
    const sorted = [...(gameState.players || [])].sort(
      (a, b) => b.money - a.money,
    );
    const myRank =
      sorted.findIndex(
        (p: any) => p.socketId === socketId || p.id === socketId,
      ) + 1;
    const medals = ["🥇", "🥈", "🥉"];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <Watermark />
        <div className="absolute inset-0 bg-primary/5 z-0" />
        <div className="relative z-10 w-full max-w-md">
          <Trophy className="w-24 h-24 text-yellow-500 mb-4 mx-auto drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]" />
          <h1 className="text-4xl md:text-6xl font-black mb-2">
            {myRank === 1
              ? "🥇 GUANYADOR!"
              : myRank === 2
                ? "🥈 Segon lloc!"
                : myRank === 3
                  ? "🥉 Tercer lloc!"
                  : "PARTIDA FINALITZADA"}
          </h1>
          <p className="text-white/50 mb-6">Posició #{myRank}</p>
          <div className="bg-card/50 backdrop-blur-xl border border-primary/20 p-6 rounded-3xl shadow-2xl mb-8">
            <p className="text-sm text-muted-foreground mb-1">
              Has aconseguit endur-te
            </p>
            <MoneyDisplay
              amount={me.money}
              size="xl"
              className="text-primary text-glow"
            />
          </div>
          <div className="flex items-end justify-center gap-3">
            {sorted.slice(0, 3).map((p: any, i: number) => {
              const heights = ["h-24", "h-16", "h-12"];
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.2 }}
                  className={`flex flex-col items-center bg-white/5 border border-white/10 rounded-xl p-3 flex-1 ${heights[i]}`}
                >
                  <span className="text-xl">{medals[i]}</span>
                  <span className="text-xs font-bold truncate w-full text-center">
                    {p.name}
                  </span>
                  <span className="text-xs text-primary">
                    {new Intl.NumberFormat().format(p.money)}€
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Watermark />
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mb-8"
        >
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
        </motion.div>
        <h1 className="text-3xl font-bold mb-2">Benvingut, {me.name}!</h1>
        <p className="text-muted-foreground text-lg">
          Esperant que el fitrió iniciï el joc...
        </p>
      </div>
    );
  }

  const totalBetAmount = Object.values(localBet).reduce((a, b) => a + b, 0);
  const remainingMoney = me.money - totalBetAmount;
  const optionsWithBet = Object.keys(localBet).filter(
    (k) => localBet[k] > 0,
  ).length;
  const maxOptionsToBet = currentQuestion.maxOptionsToBet ?? 3;
  const isDistributionValid =
    remainingMoney === 0 &&
    optionsWithBet <= maxOptionsToBet &&
    optionsWithBet > 0;

  const handleIncrease = (optionId: string) => {
    if (remainingMoney <= 0) return;
    if (!localBet[optionId] && optionsWithBet >= maxOptionsToBet) {
      toast({
        title: "Límit d'opcions",
        description: `Només pots repartir diners en ${maxOptionsToBet} opcions.`,
        variant: "destructive",
      });
      return;
    }
    const step = 25000;
    const amountToAdd = Math.min(step, remainingMoney);
    const newBet = {
      ...localBet,
      [optionId]: (localBet[optionId] || 0) + amountToAdd,
    };
    setLocalBet(newBet);
    updateBet(roomCode, newBet);
  };

  const handleDecrease = (optionId: string) => {
    const currentAmount = localBet[optionId] || 0;
    if (currentAmount <= 0) return;
    const step = 25000;
    const amountToRemove = Math.min(step, currentAmount);
    const newBet = { ...localBet, [optionId]: currentAmount - amountToRemove };
    setLocalBet(newBet);
    updateBet(roomCode, newBet);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background p-4 pb-32 md:p-6 md:pb-32 relative overflow-y-auto">
      <Watermark />

      <div className="flex justify-between items-start mb-6">
        <div className="bg-card/50 backdrop-blur rounded-xl px-4 py-2 border border-white/10">
          <span className="text-xs uppercase text-muted-foreground font-bold">
            Pregunta
          </span>
          <div className="text-2xl font-bold text-white">
            {(gameState.currentQuestionIndex ?? 0) + 1}/
            {gameState.totalQuestions ?? gameState.questions?.length ?? 8}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs uppercase text-muted-foreground font-bold mb-1">
            Diners Disponibles
          </span>
          <MoneyDisplay
            amount={remainingMoney}
            size="lg"
            className={
              remainingMoney === 0
                ? "text-muted-foreground opacity-50"
                : "text-primary text-glow"
            }
          />
        </div>
      </div>

      {revealedAnswer && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 p-4 rounded-xl text-center font-black text-xl border ${
            localBet[revealedAnswer] > 0
              ? "bg-green-500/20 border-green-500/50 text-green-400"
              : "bg-red-500/20 border-red-500/50 text-red-400"
          }`}
        >
          {localBet[revealedAnswer] > 0
            ? `✓ ENCERTAT! Conserves ${localBet[revealedAnswer].toLocaleString()} €`
            : `✗ FALLAT! La correcta era la ${revealedAnswer}`}
        </motion.div>
      )}

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <div className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10 min-h-[100px] flex items-center justify-center text-center shadow-lg">
          <h2 className="text-xl md:text-2xl font-medium leading-relaxed">
            {currentQuestion.text}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentQuestion.options.map((opt: any) => {
            const optionKey = opt.letter ?? opt.id;
            return (
              <OptionCard
                key={optionKey}
                letter={optionKey}
                text={opt.text}
                amount={localBet[optionKey] || 0}
                maxAmount={remainingMoney}
                totalMoney={me.money}
                onIncrease={() => handleIncrease(optionKey)}
                onDecrease={() => handleDecrease(optionKey)}
                disabled={me.hasConfirmed || !!revealedAnswer}
                isRevealed={!!revealedAnswer}
                isCorrect={opt.isCorrect}
              />
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground hidden md:block">
            {currentQuestion.type === "final"
              ? "Ronda Final: Tot o Res!"
              : `Reparteix els diners. Deixa'n almenys 1 buida.`}
          </div>
          <div className="flex-1 md:flex-none flex justify-end">
            {revealedAnswer ? (
              <div className="flex items-center text-white/50 font-bold px-4 animate-pulse">
                Esperant la següent pregunta...
              </div>
            ) : !me.hasConfirmed ? (
              <Button
                size="lg"
                className="w-full md:w-auto text-lg h-14 font-bold shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                disabled={!isDistributionValid}
                onClick={() => confirmBet(roomCode)}
              >
                <Lock className="mr-2 w-5 h-5" />
                Confirmar Resposta
              </Button>
            ) : (
              <div className="flex items-center text-yellow-500 font-bold animate-pulse px-4">
                <Lock className="mr-2 w-4 h-4" />
                Resposta Bloquejada — Esperant el fitrió...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
