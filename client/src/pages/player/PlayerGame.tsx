import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useGameSocket, type Player } from "@/hooks/use-game-socket";
import { Watermark } from "@/components/Watermark";
import { Button } from "@/components/ui/button";
import { OptionCard } from "@/components/OptionCard";
import { MoneyDisplay } from "@/components/MoneyDisplay";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Lock, Eye, ArrowRight, Trophy, Skull } from "lucide-react";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";

export default function PlayerGame() {
  const [, params] = useRoute("/play/:code");
  const roomCode = params?.code || "";
  const { 
    gameState, 
    socketId, 
    updateBet, 
    confirmBet, 
    revealResult, 
    nextQuestion 
  } = useGameSocket();
  const { toast } = useToast();

  const [localBet, setLocalBet] = useState<Record<string, number>>({});
  
  // Find myself
  const me = gameState?.players.find(p => p.id === socketId);
  const currentQuestion = gameState?.currentQuestion;
  const isHost = false; // This is player view

  // Reset local bet when question changes
  useEffect(() => {
    if (me?.currentBet) {
       // Sync local state with server state on load/reconnect
       setLocalBet(me.currentBet);
    } else {
       setLocalBet({});
    }
  }, [gameState?.questionIndex]);


  if (!gameState || !me) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Connectant amb la sala...</p>
      </div>
    );
  }

  // === RENDER STATES ===

  // 1. Waiting for Host to Start
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
        <p className="text-muted-foreground text-lg">Esperant que el fitrió iniciï el joc...</p>
      </div>
    );
  }

  // 2. Eliminated Screen
  if (me.status === "eliminated") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-red-950/20">
        <Watermark />
        <Skull className="w-24 h-24 text-red-500 mb-6" />
        <h1 className="text-4xl font-black text-red-500 mb-4">HAS ESTAT ELIMINAT</h1>
        <p className="text-xl text-white/60">Et vas quedar sense diners.</p>
        <div className="mt-12 p-6 bg-black/40 rounded-xl max-w-sm w-full">
           <p className="text-sm text-muted-foreground uppercase mb-2">Pots seguir mirant</p>
           <div className="text-2xl font-bold">La partida continua...</div>
        </div>
      </div>
    );
  }

  // 3. Winner Screen (Game Finished)
  if (gameState.status === "finished") {
     // Trigger confetti only once
     useEffect(() => {
        if (me.status === "winner") {
            const duration = 3000;
            const end = Date.now() + duration;
            (function frame() {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#a855f7', '#06b6d4']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#a855f7', '#06b6d4']
            });
            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
            }());
        }
     }, []);

     return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            <Watermark />
            <div className="absolute inset-0 bg-primary/5 z-0" />
            <div className="relative z-10">
                <Trophy className="w-32 h-32 text-yellow-500 mb-8 mx-auto drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]" />
                <h1 className="text-5xl md:text-7xl font-black mb-6">
                    {me.status === "winner" ? "ENHORABONA!" : "PARTIDA FINALITZADA"}
                </h1>
                <div className="bg-card/50 backdrop-blur-xl border border-primary/20 p-8 rounded-3xl shadow-2xl">
                    <p className="text-lg text-muted-foreground mb-2">Has aconseguit endur-te</p>
                    <MoneyDisplay amount={me.money} size="xl" className="text-primary text-glow" />
                </div>
            </div>
        </div>
     );
  }

  // 4. Playing State
  if (!currentQuestion) return <div>Carregant pregunta...</div>;

  const totalBetAmount = Object.values(localBet).reduce((a, b) => a + b, 0);
  const remainingMoney = me.money - totalBetAmount;
  const optionsWithBet = Object.keys(localBet).filter(k => localBet[k] > 0).length;
  // Rule: You must leave at least one option empty (unless it's the final question, logic handled in backend mostly, but frontend validation helps)
  // For standard questions (4 options), max options to bet is usually 3.
  const maxOptionsToBet = currentQuestion.maxOptionsToBet;
  
  // Validation for Confirm Button
  // 1. All money must be distributed (remainingMoney === 0)
  // 2. You cannot bet on ALL options (optionsWithBet < currentQuestion.options.length)
  // HOWEVER, for Q8 (2 options), you can only bet on ONE.
  const isDistributionValid = remainingMoney === 0 && optionsWithBet <= maxOptionsToBet && optionsWithBet > 0;
  
  const handleIncrease = (optionId: string) => {
    if (remainingMoney <= 0) return;
    
    // Check if we are starting a new pile and if that exceeds the limit of piles
    if (!localBet[optionId] && optionsWithBet >= maxOptionsToBet) {
       toast({
         title: "Límit d'opciones",
         description: `Només pots repartir diners en ${maxOptionsToBet} opcions.`,
         variant: "destructive"
       });
       return;
    }

    const step = 25000; // Increment step (adjust based on total money scale if needed)
    // Dynamic step based on total money could be better UX, but keeping simple
    const amountToAdd = Math.min(step, remainingMoney);
    
    const newBet = { ...localBet, [optionId]: (localBet[optionId] || 0) + amountToAdd };
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

  // Are we in result reveal mode? (You confirmed, waiting for result)
  // The server handles the transition. If we are waiting for result,
  // we typically don't see buttons.
  // Actually, 'me.hasConfirmed' locks the UI. 
  // Then the user can click "Revelar" if they want to see it? 
  // No, usually "Revelar" is a global event driven by logic or user. 
  // In this requirement: "Revelar Resultat" button appears after confirm.
  
  return (
    <div className="min-h-screen flex flex-col bg-background p-4 pb-24 md:p-6 relative">
      <Watermark />

      {/* Header Stats */}
      <div className="flex justify-between items-start mb-6">
        <div className="bg-card/50 backdrop-blur rounded-xl px-4 py-2 border border-white/10">
           <span className="text-xs uppercase text-muted-foreground font-bold">Pregunta</span>
           <div className="text-2xl font-bold text-white">{gameState.questionIndex}/{gameState.totalQuestions}</div>
        </div>

        <div className="flex flex-col items-end">
           <span className="text-xs uppercase text-muted-foreground font-bold mb-1">Diners Disponibles</span>
           <MoneyDisplay 
             amount={remainingMoney} 
             size="lg" 
             className={remainingMoney === 0 ? "text-muted-foreground opacity-50" : "text-primary text-glow"} 
           />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/10 min-h-[120px] flex items-center justify-center text-center shadow-lg">
           <h2 className="text-2xl md:text-3xl font-medium leading-relaxed">
             {currentQuestion.text}
           </h2>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-auto">
          {currentQuestion.options.map((opt, idx) => {
             // Generate an ID for the option based on index or letter
             // Schema has options array. Let's assume idx is stable or use letter.
             const optionKey = opt.letter;
             return (
               <OptionCard
                 key={optionKey}
                 letter={opt.letter}
                 text={opt.text}
                 amount={localBet[optionKey] || 0}
                 maxAmount={remainingMoney}
                 totalMoney={me.money}
                 onIncrease={() => handleIncrease(optionKey)}
                 onDecrease={() => handleDecrease(optionKey)}
                 disabled={me.hasConfirmed}
                 isRevealed={false /* TODO: Handle reveal state from backend */}
                 isCorrect={opt.isCorrect}
               />
             );
          })}
        </div>
      </div>

      {/* Action Bar (Bottom Fixed) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground hidden md:block">
             {currentQuestion.type === "final" 
               ? "Ronda Final: Tot o Res!" 
               : `Reparteix els diners. Deixa'n almenys 1 buida.`}
          </div>

          <div className="flex-1 md:flex-none flex justify-end">
            {!me.hasConfirmed ? (
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
              <div className="flex gap-4 w-full md:w-auto">
                 <div className="flex items-center text-yellow-500 font-bold animate-pulse px-4">
                    <Lock className="mr-2 w-4 h-4" />
                    Resposta Bloquejada
                 </div>
                 {/* 
                    In a real game, usually the HOST reveals. 
                    But requirements say: "Revelar Resultat" button appears after confirm.
                    Assuming this is for the player to see their OWN result? 
                    Or trigger global reveal? 
                    Let's assume it triggers the global reveal request or local reveal if allowed.
                    Actually, if multiplayer, usually everyone reveals at once.
                    Let's put the button here but it might need backend logic to wait for all.
                 */}
                 <Button 
                    size="lg"
                    variant="secondary"
                    className="flex-1 md:w-auto font-bold"
                    onClick={() => revealResult(roomCode)}
                 >
                    <Eye className="mr-2 w-5 h-5" />
                    Revelar Resultat
                 </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
