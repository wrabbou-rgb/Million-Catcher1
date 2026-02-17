import { useState, useEffect } from "react";
import { usePlayerGame } from "@/hooks/use-game";
import { NeonButton } from "@/components/NeonButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Trapdoor } from "@/components/Trapdoor";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, XCircle, Timer } from "lucide-react";
// @ts-ignore
import confetti from "canvas-confetti";

const QUESTIONS = [
  {
    id: 1,
    text: "En quin any va inventar Nikolaus August Otto el primer motor de quatre temps amb compressió?",
    options: [
      { id: "A", text: "1876", isCorrect: true },
      { id: "B", text: "1878", isCorrect: false },
      { id: "C", text: "1880", isCorrect: false },
      { id: "D", text: "1885", isCorrect: false },
    ],
  },
  {
    id: 2,
    text: "Quin és el component que transforma el moviment rectilini del pistó en moviment rotatiu?",
    options: [
      { id: "A", text: "La biela", isCorrect: false },
      { id: "B", text: "El cigonyal", isCorrect: true },
      { id: "C", text: "El volant d'inèrcia", isCorrect: false },
      { id: "D", text: "L'arbre de lleves", isCorrect: false },
    ],
  },
  {
    id: 3,
    text: "En quin ordre es produeixen les fases del motor de 4 temps?",
    options: [
      {
        id: "A",
        text: "Compressió, admissió, explosió, escapament",
        isCorrect: false,
      },
      {
        id: "B",
        text: "Admissió, compressió, explosió, escapament",
        isCorrect: true,
      },
      {
        id: "C",
        text: "Explosió, compressió, admissió, escapament",
        isCorrect: false,
      },
      {
        id: "D",
        text: "Admissió, explosió, compressió, escapament",
        isCorrect: false,
      },
    ],
  },
  {
    id: 4,
    text: "Quina temperatura pot superar la combustió dins del cilindre?",
    options: [
      { id: "A", text: "500 °C", isCorrect: false },
      { id: "B", text: "1.000 °C", isCorrect: false },
      { id: "C", text: "2.000 °C", isCorrect: true },
    ],
  },
  {
    id: 5,
    text: "Què és el càrter en un motor Otto?",
    options: [
      {
        id: "A",
        text: "La peça que tanca els cilindres per dalt",
        isCorrect: false,
      },
      {
        id: "B",
        text: "El dipòsit d'oli a la part inferior del motor",
        isCorrect: true,
      },
      {
        id: "C",
        text: "L'element que uneix el pistó amb el cigonyal",
        isCorrect: false,
      },
    ],
  },
  {
    id: 6,
    text: "Segons el Segon Principi de la Termodinàmica aplicat al motor:",
    options: [
      {
        id: "A",
        text: "Tota la calor es converteix en treball útil",
        isCorrect: false,
      },
      {
        id: "B",
        text: "Part de l'energia s'ha de cedir a un focus fred",
        isCorrect: true,
      },
      {
        id: "C",
        text: "No es pot generar energia mecànica des de calor",
        isCorrect: false,
      },
    ],
  },
  {
    id: 7,
    text: "Quina diferència principal té el motor de 2 temps respecte al de 4 temps?",
    options: [
      { id: "A", text: "Té vàlvules més complexes", isCorrect: false },
      {
        id: "B",
        text: "Completa el cicle en una volta de cigonyal",
        isCorrect: true,
      },
      { id: "C", text: "És menys contaminant", isCorrect: false },
    ],
  },
  {
    id: 8,
    text: "Quina és la temperatura de treball òptima d'un motor Otto?",
    options: [
      { id: "A", text: "90 °C", isCorrect: true },
      { id: "B", text: "150 °C", isCorrect: false },
    ],
  },
];

const formatMoney = (amount: number | undefined | null) => {
  const safe = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat("ca-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);
};

export default function Player() {
  const {
    gameState,
    myPlayer,
    joinRoom,
    confirmBet: serverConfirm,
    nextQuestion: serverNext,
    isJoining,
  } = usePlayerGame();

  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [localQIndex, setLocalQIndex] = useState(0);
  const [localMoney, setLocalMoney] = useState(1000000);
  const [localDistribution, setLocalDistribution] = useState<
    Record<string, number>
  >({});
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isEliminated, setIsEliminated] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // CRONÓMETRO LOCAL (SIN DEPENDER DEL SERVIDOR)
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerStarted, setTimerStarted] = useState(false);

  const currentQuestion = QUESTIONS[localQIndex];
  const distributedAmount = Object.values(localDistribution).reduce(
    (a, b) => a + b,
    0,
  );
  const availableMoney = localMoney - distributedAmount;
  const optionsWithMoney = Object.values(localDistribution).filter(
    (v) => v > 0,
  ).length;
  const totalOptions = currentQuestion?.options.length || 0;

  const isValid =
    availableMoney === 0 &&
    optionsWithMoney > 0 &&
    optionsWithMoney < totalOptions;

  // Sincronización con el Host
  useEffect(() => {
    if (gameState) {
      if (
        gameState.currentQuestionIndex !== undefined &&
        gameState.currentQuestionIndex !== localQIndex
      ) {
        setLocalQIndex(gameState.currentQuestionIndex);
        setLocalDistribution({});
        setIsConfirmed(false);
        setIsRevealed(false);
        setCountdown(null);
        setTimeLeft(30); // Reset tiempo
        setTimerStarted(false); // Pausar hasta que toque un botón
      }
      if (
        myPlayer &&
        myPlayer.money !== undefined &&
        myPlayer.money !== localMoney
      ) {
        setLocalMoney(myPlayer.money);
        if (myPlayer.money <= 0) setIsEliminated(true);
      }
    }
  }, [gameState, myPlayer, localQIndex, localMoney]);

  // Lógica del Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerStarted && timeLeft > 0 && !isConfirmed) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && !isConfirmed && timerStarted) {
      handleConfirm(); // Auto-confirmar al llegar a 0
    }
    return () => clearInterval(interval);
  }, [timerStarted, timeLeft, isConfirmed]);

  const handleAddMoney = (optionId: string) => {
    if (!timerStarted) setTimerStarted(true); // Arranca el tiempo al primer toque
    if (availableMoney <= 0 || isConfirmed || timeLeft === 0) return;
    const step = 50000;
    const toAdd = Math.min(step, availableMoney);
    setLocalDistribution((prev) => ({
      ...prev,
      [optionId]: (prev[optionId] || 0) + toAdd,
    }));
  };

  const handleRemoveMoney = (optionId: string) => {
    if (isConfirmed || timeLeft === 0) return;
    const current = localDistribution[optionId] || 0;
    if (current <= 0) return;
    const step = 50000;
    const toRemove = Math.min(step, current);
    setLocalDistribution((prev) => ({
      ...prev,
      [optionId]: current - toRemove,
    }));
  };

  const handleConfirm = () => {
    setIsConfirmed(true);
    setTimerStarted(false);
    serverConfirm();
  };

  const handleReveal = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setCountdown(null);
          setIsRevealed(true);
          const correctOption = currentQuestion.options.find(
            (o) => o.isCorrect,
          );
          const moneyOnCorrect =
            localDistribution[correctOption?.id || ""] || 0;
          if (moneyOnCorrect > 0) {
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          } else {
            setIsEliminated(true);
            serverNext(0, localQIndex, "eliminated");
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleNext = () => {
    const nextQIndex = localQIndex + 1;
    if (localQIndex >= QUESTIONS.length - 1) {
      setIsFinished(true);
      serverNext(localMoney, QUESTIONS.length, "winner");
    } else {
      serverNext(localMoney, nextQIndex, "active");
    }
  };

  if (!gameState)
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
              Motor de Cicle Otto
            </p>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-slate-300">El teu nom</Label>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="bg-slate-900/50 border-slate-700 text-lg h-12"
                  placeholder="El teu nom..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Codi de la Sala</Label>
                <Input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="bg-slate-900/50 border-slate-700 text-lg h-12 font-mono uppercase tracking-widest text-center"
                  placeholder="XXXXXX"
                  maxLength={6}
                />
              </div>
              <NeonButton
                onClick={() => joinRoom(roomCode, playerName)}
                disabled={!roomCode || !playerName}
                isLoading={isJoining}
                className="w-full"
              >
                UNIR-SE A LA PARTIDA
              </NeonButton>
            </div>
          </Card>
        </motion.div>
      </div>
    );

  if (gameState.status === "waiting")
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background space-y-8">
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
        <div className="text-center space-y-4">
          <h2 className="text-4xl text-white font-bold">
            PREPARAT, {myPlayer?.name?.toUpperCase()}!
          </h2>
          <p className="text-slate-400">
            Esperant que el presentador comenci la partida...
          </p>
          <div className="text-3xl font-bold text-primary">
            {formatMoney(1000000)}
          </div>
        </div>
      </div>
    );

  if (isFinished)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="text-center space-y-6">
          <div className="text-8xl">🏆</div>
          <h1 className="text-5xl font-black text-yellow-400">HAS GUANYAT!</h1>
          <div className="p-6 bg-slate-900 rounded-xl border border-yellow-400/30">
            <p className="text-slate-400 text-sm mb-2">Premi final</p>
            <p className="text-4xl font-bold text-yellow-400">
              {formatMoney(localMoney)}
            </p>
          </div>
        </div>
      </div>
    );

  if (isEliminated && isRevealed)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="text-center space-y-6">
          <XCircle className="w-24 h-24 text-red-500 mx-auto" />
          <h1 className="text-5xl font-black text-red-500">ELIMINAT!</h1>
          <p className="text-white text-xl">
            No tenies diners en la resposta correcta.
          </p>
        </div>
      </div>
    );

  if (countdown !== null)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <AnimatePresence mode="wait">
          <motion.div
            key={countdown}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <div className="text-9xl font-black text-primary">{countdown}</div>
            <p className="text-white text-2xl mt-4">Revelant la resposta...</p>
          </motion.div>
        </AnimatePresence>
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="p-4 bg-slate-900 border-b border-white/10 flex justify-between items-center sticky top-0 z-50">
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs uppercase tracking-widest">
            Pregunta
          </span>
          <span className="text-white font-bold text-xl">
            {localQIndex + 1} / {QUESTIONS.length}
          </span>
        </div>

        {/* AQUÍ SE USA EL TIMER PARA QUE NO SALGA EL ERROR DE TS */}
        <div className="flex flex-col items-center">
          <div
            className={`flex items-center gap-2 px-4 py-1 rounded-full border transition-all ${timeLeft <= 5 && timerStarted ? "bg-red-500/20 border-red-500 animate-pulse" : "bg-slate-800 border-slate-700"}`}
          >
            <Timer
              className={`w-4 h-4 ${timeLeft <= 5 && timerStarted ? "text-red-500" : "text-primary"}`}
            />
            <span
              className={`font-mono font-bold text-xl ${timeLeft <= 5 && timerStarted ? "text-red-500" : "text-white"}`}
            >
              {timeLeft}s
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-slate-400 text-xs uppercase tracking-widest">
            Disponible
          </span>
          <span
            className={`text-2xl font-mono font-bold ${availableMoney === 0 ? "text-green-500" : "text-yellow-400"}`}
          >
            {formatMoney(availableMoney)}
          </span>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 flex flex-col gap-4 max-w-4xl">
        <div className="py-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
            {currentQuestion.text}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
          {currentQuestion.options.map((option) => (
            <Trapdoor
              key={option.id}
              letter={option.id}
              text={option.text}
              amount={localDistribution[option.id] || 0}
              maxAmount={localMoney}
              onAdd={() => handleAddMoney(option.id)}
              onRemove={() => handleRemoveMoney(option.id)}
              disabled={isConfirmed || timeLeft === 0}
              result={
                isRevealed ? (option.isCorrect ? "correct" : "incorrect") : null
              }
              showResult={isRevealed}
            />
          ))}
        </div>

        {isRevealed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-center p-4 rounded-xl border ${!isEliminated ? "bg-green-900/30 border-green-500/50 text-green-400" : "bg-red-900/30 border-red-500/50 text-red-400"}`}
          >
            {!isEliminated ? (
              <>
                <p className="text-2xl font-bold">✅ CORRECTE!</p>
                <p className="text-lg">
                  Nou balance: {formatMoney(localMoney)}
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold">❌ ELIMINAT!</p>
                <p className="text-lg">Balance final: 0 €</p>
              </>
            )}
          </motion.div>
        )}

        <div className="py-4 flex justify-center sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-8">
          {!isConfirmed ? (
            <NeonButton
              onClick={handleConfirm}
              disabled={!isValid || timeLeft === 0}
              className="w-full max-w-sm text-xl h-16"
            >
              Confirmar Resposta
            </NeonButton>
          ) : !isRevealed ? (
            <NeonButton
              variant="secondary"
              onClick={handleReveal}
              className="w-full max-w-sm text-xl h-16 animate-pulse"
            >
              Revelar Resultat
            </NeonButton>
          ) : (
            <NeonButton
              onClick={handleNext}
              className="w-full max-w-sm text-xl h-16"
            >
              Següent Pregunta <ArrowRight className="ml-2" />
            </NeonButton>
          )}
        </div>
      </main>
      <div className="fixed bottom-4 right-6 text-white/50 text-xs pointer-events-none">
        {" "}
        Developed by Walid Rabbou{" "}
      </div>
    </div>
  );
}
