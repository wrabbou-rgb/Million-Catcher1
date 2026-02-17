import { useState, useEffect } from "react";
import { usePlayerGame } from "@/hooks/use-game";
import { NeonButton } from "@/components/NeonButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Trapdoor } from "@/components/Trapdoor";
import { MoneyCounter } from "@/components/MoneyCounter";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, CheckCircle2, XCircle } from "lucide-react";
import confetti from "canvas-confetti";

// Question mock data for now (since logic is mostly client side for this demo)
// Ideally this comes from server/db, but the prompt implies logic happens in player screen
const QUESTIONS = [
  {
    id: 1,
    text: "Quina és la funció principal del cicle d'Otto?",
    options: [
      { id: "A", text: "Generar electricitat", isCorrect: false },
      { id: "B", text: "Convertir calor en treball", isCorrect: true },
      { id: "C", text: "Refredar motors", isCorrect: false },
      { id: "D", text: "Filtrar oli", isCorrect: false },
    ]
  },
  {
    id: 2,
    text: "Quants temps té el cicle d'Otto de 4 temps?",
    options: [
      { id: "A", text: "2 temps", isCorrect: false },
      { id: "B", text: "4 temps", isCorrect: true },
      { id: "C", text: "6 temps", isCorrect: false },
      { id: "D", text: "8 temps", isCorrect: false },
    ]
  },
  // Add more placeholders or fetch from server
  {
    id: 3,
    text: "En quina fase s'injecta la mescla aire-combustible?",
    options: [
      { id: "A", text: "Admissió", isCorrect: true },
      { id: "B", text: "Compressió", isCorrect: false },
      { id: "C", text: "Explosió", isCorrect: false },
      { id: "D", text: "Escapament", isCorrect: false },
    ]
  },
  {
    id: 4,
    text: "Què encén la mescla en un motor Otto?",
    options: [
      { id: "A", text: "La pressió", isCorrect: false },
      { id: "B", text: "La bugia", isCorrect: true },
      { id: "C", text: "El pistó", isCorrect: false },
      { id: "D", text: "L'injector", isCorrect: false },
    ]
  },
   {
    id: 5,
    text: "Quin és el rendiment teòric màxim?",
    options: [
      { id: "A", text: "100%", isCorrect: false },
      { id: "B", text: "60-70%", isCorrect: true },
      { id: "C", text: "10-20%", isCorrect: false },
      { id: "D", text: "0%", isCorrect: false },
    ]
  },
   {
    id: 6,
    text: "Pregunta Final: El motor Otto és de...",
    options: [
      { id: "A", text: "Combustió Interna", isCorrect: true },
      { id: "B", text: "Combustió Externa", isCorrect: false },
    ]
  }
];

export default function Player() {
  const { 
    gameState, 
    myPlayer, 
    joinRoom, 
    updateBet, 
    confirmBet: serverConfirm, 
    nextQuestion: serverNext,
    isJoining 
  } = usePlayerGame();

  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  
  // Local state for the current question interaction
  const [localDistribution, setLocalDistribution] = useState<Record<string, number>>({});
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  
  // Derived state
  const currentQIndex = gameState?.currentQuestionIndex || 0;
  const currentQuestion = QUESTIONS[currentQIndex % QUESTIONS.length]; // Cycle if out of bounds
  const currentMoney = myPlayer?.money || 1000000;
  
  // Calculate available money
  const distributedAmount = Object.values(localDistribution).reduce((a, b) => a + b, 0);
  const availableMoney = currentMoney - distributedAmount;

  // Validate rules: 
  // 1. All money must be distributed (availableMoney === 0)
  // 2. At least one option must be empty
  const optionsWithMoney = Object.values(localDistribution).filter(v => v > 0).length;
  const totalOptions = currentQuestion.options.length;
  const isValid = availableMoney === 0 && optionsWithMoney < totalOptions;

  // Reset local state when question changes
  useEffect(() => {
    setLocalDistribution({});
    setIsConfirmed(false);
    setIsRevealed(false);
  }, [currentQIndex]);

  // Update server on distribution change (throttled in real app)
  useEffect(() => {
    if (gameState?.status === "playing") {
      updateBet(localDistribution);
    }
  }, [localDistribution, gameState?.status]);

  const handleAddMoney = (optionId: string) => {
    if (availableMoney <= 0) return;
    const step = 25000; // Step size
    const toAdd = Math.min(step, availableMoney);
    
    setLocalDistribution(prev => ({
      ...prev,
      [optionId]: (prev[optionId] || 0) + toAdd
    }));
  };

  const handleRemoveMoney = (optionId: string) => {
    const current = localDistribution[optionId] || 0;
    if (current <= 0) return;
    const step = 25000;
    const toRemove = Math.min(step, current);

    setLocalDistribution(prev => ({
      ...prev,
      [optionId]: current - toRemove
    }));
  };

  const handleReveal = () => {
    setIsRevealed(true);
    
    // Check if player survived
    const correctOptionId = currentQuestion.options.find(o => o.isCorrect)?.id;
    const moneyOnCorrect = localDistribution[correctOptionId!] || 0;

    if (moneyOnCorrect > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    
    // In a real app, server would handle the calculation and send back new money
    // Here we simulate it locally then sync would happen via socket ideally
  };

  const handleNext = () => {
    serverNext();
  };

  // === 1. Join Screen ===
  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
         <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 bg-black/40 border-white/10 backdrop-blur-xl">
            <h2 className="text-3xl text-center mb-8 text-primary font-display">Unir-se a la partida</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-slate-300">Codi de la Sala</Label>
                <Input 
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="bg-slate-900/50 border-slate-700 text-lg h-12 font-mono uppercase tracking-widest text-center"
                  placeholder="XA34B1"
                  maxLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Nom de Jugador</Label>
                <Input 
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="bg-slate-900/50 border-slate-700 text-lg h-12"
                  placeholder="El teu nom..."
                />
              </div>
              <NeonButton 
                onClick={() => joinRoom(roomCode, playerName)}
                disabled={!roomCode || !playerName}
                isLoading={isJoining}
                className="w-full"
              >
                Entrar
              </NeonButton>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // === 2. Waiting Screen ===
  if (gameState.status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background space-y-8">
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
        <div className="text-center space-y-4">
          <h2 className="text-4xl text-white font-bold">Esperant al fitrió...</h2>
          <p className="text-slate-400">Prepara't, la partida començarà aviat.</p>
        </div>
        <div className="p-4 bg-slate-900/50 rounded-xl border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {myPlayer?.name?.[0].toUpperCase()}
            </div>
            <span className="text-white font-bold text-lg">{myPlayer?.name}</span>
          </div>
        </div>
      </div>
    );
  }

  // === 3. Game Screen ===
  // If eliminated
  if (myPlayer?.status === "eliminated") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="text-center space-y-6">
          <XCircle className="w-24 h-24 text-red-500 mx-auto" />
          <h1 className="text-5xl font-black text-red-500">ELIMINAT</h1>
          <p className="text-white text-xl">T'has quedat sense diners.</p>
          <div className="p-6 bg-slate-900 rounded-xl">
             <p className="text-slate-400">Pots seguir mirant la partida a la pantalla principal.</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Playing
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="p-4 bg-slate-900 border-b border-white/10 flex justify-between items-center sticky top-0 z-50">
        <div className="flex flex-col">
           <span className="text-slate-400 text-xs uppercase tracking-widest">Pregunta</span>
           <span className="text-white font-bold text-xl">{currentQIndex + 1} / 8</span>
        </div>
        
        <div className="flex flex-col items-end">
           <span className="text-slate-400 text-xs uppercase tracking-widest">Disponible</span>
           <MoneyCounter value={availableMoney} className={`text-2xl font-mono font-bold ${availableMoney === 0 ? 'text-green-500' : 'text-yellow-400'}`} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 flex flex-col gap-6 max-w-4xl">
        
        {/* Question */}
        <div className="py-6 text-center space-y-4">
           <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight drop-shadow-md">
             {currentQuestion.text}
           </h2>
           {!isConfirmed && (
             <p className="text-sm text-slate-400 bg-slate-800/50 inline-block px-4 py-1 rounded-full border border-white/5">
               Recorda: Has de deixar almenys una opció buida!
             </p>
           )}
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 flex-1">
          {currentQuestion.options.map((option) => (
            <Trapdoor 
              key={option.id}
              letter={option.id}
              amount={localDistribution[option.id] || 0}
              maxAmount={currentMoney}
              onAdd={() => handleAddMoney(option.id)}
              onRemove={() => handleRemoveMoney(option.id)}
              disabled={isConfirmed}
              result={isRevealed ? (option.isCorrect ? "correct" : "incorrect") : null}
              showResult={isRevealed}
            />
          ))}
        </div>

        {/* Action Bar */}
        <div className="py-6 flex justify-center sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-10">
          {!isConfirmed ? (
            <NeonButton 
              onClick={() => setIsConfirmed(true)}
              disabled={!isValid}
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

      <div className="fixed bottom-2 right-2 text-white/10 text-[10px] font-mono pointer-events-none">
        Developed by Walid Rabbou
      </div>
    </div>
  );
}
