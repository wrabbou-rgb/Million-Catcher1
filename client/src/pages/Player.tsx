import { useState, useEffect } from "react";
import { usePlayerGame } from "@/hooks/use-game";
import { NeonButton } from "@/components/NeonButton";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Send,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Minus,
  Timer,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// --- COMPONENTE COUNTDOWN ---
interface CountdownProps {
  initialSeconds: number;
  onTimeUp: () => void;
}

export function Countdown({ initialSeconds, onTimeUp }: CountdownProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) {
      onTimeUp();
      return;
    }
    const timer = setInterval(() => setSeconds((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [seconds, onTimeUp]);

  const textColor = seconds <= 10 ? "text-red-500 animate-pulse" : "text-primary";

  return (
    <div className="flex flex-col items-center gap-1 bg-black/40 border border-white/10 p-4 rounded-2xl backdrop-blur-md min-w-[120px]">
      <div className="flex items-center gap-2">
        <Timer className={`w-5 h-5 ${textColor}`} />
        <span className={`text-4xl font-mono font-black tracking-tighter ${textColor}`}>
          {seconds}s
        </span>
      </div>
      <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-1000 ease-linear"
          style={{ width: `${(seconds / initialSeconds) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function Player() {
  const { gameState, myPlayer, joinRoom, confirmBet, nextQuestion, isJoining } = usePlayerGame();
  const { toast } = useToast();

  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [hasConfirmed, setHasConfirmed] = useState(false);

  const [bets, setBets] = useState<{ [key: string]: number }>({
    A: 0, B: 0, C: 0, D: 0,
  });
  const [localMoney, setLocalMoney] = useState(1000000);

  useEffect(() => {
    if (myPlayer) {
      setLocalMoney(myPlayer.money);
      setBets({ A: 0, B: 0, C: 0, D: 0 });
      setHasConfirmed(false);
    }
  }, [gameState?.currentQuestionIndex, myPlayer]);

  if (!gameState || !myPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] p-6">
        <Card className="w-full max-w-md p-8 bg-black/40 border-white/10 backdrop-blur-xl">
          <h1 className="text-3xl font-black text-white mb-6 text-center italic uppercase tracking-tighter">
            Atrapa un Milió
          </h1>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="EL TEU NOM"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
              className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-mono outline-none"
            />
            <input
              type="text"
              placeholder="CODI DE SALA"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-mono outline-none"
            />
            <NeonButton
              onClick={() => joinRoom(roomCode, playerName)}
              isLoading={isJoining}
              className="w-full h-16"
            >
              ENTRAR A JUGAR
            </NeonButton>
          </div>
        </Card>
      </div>
    );
  }

  const handleTimeUp = () => {
    if (!hasConfirmed && myPlayer.status === "active") handleConfirm();
  };

  const handleConfirm = () => {
    const activeTraps = Object.values(bets).filter((v) => v > 0).length;
    if (activeTraps > 3) {
      toast({ title: "Error", description: "Mínim una trapa buida!", variant: "destructive" });
      return;
    }
    if (localMoney > 0) {
      toast({ title: "Atenció", description: "Has d'apostar tots els diners!", variant: "destructive" });
      return;
    }
    setHasConfirmed(true);
    confirmBet();
    nextQuestion(myPlayer.money, gameState.currentQuestionIndex, myPlayer.status);
  };

  const updateBet = (trap: string, amount: number) => {
    if (hasConfirmed) return;
    const realAmount = amount > 0 ? Math.min(amount, localMoney) : Math.max(amount, -bets[trap]);
    setBets((prev) => ({ ...prev, [trap]: prev[trap] + realAmount }));
    setLocalMoney((prev) => prev - realAmount);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-4 pb-24">
      {!hasConfirmed && myPlayer.status === "active" && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <Countdown
            initialSeconds={gameState.questionTimer || 30}
            onTimeUp={handleTimeUp}
          />
        </div>
      )}

      <header className="flex justify-between items-center mb-6 pt-24">
        <div className="bg-slate-900 border border-white/10 px-4 py-2 rounded-xl">
          <p className="text-[10px] text-slate-500 uppercase font-mono">Diners</p>
          <div className="flex items-center gap-2 text-green-400 font-mono font-black">
            <Wallet className="w-4 h-4" />
            {new Intl.NumberFormat("ca-ES").format(localMoney)} €
          </div>
        </div>
        <div className="text-right font-black">
          <p className="text-[10px] text-slate-500 uppercase font-mono">Pregunta</p>
          {gameState.currentQuestionIndex + 1}/8
        </div>
      </header>

      {/* BLOQUE DE PREGUNTA IMPLEMENTADO */}
      {myPlayer.status === "active" && gameState.questions && (
        <div className="mb-8 text-center bg-white/5 p-6 rounded-2xl border border-white/10">
          <h2 className="text-xl font-bold text-white mb-4 italic">
            {gameState.questions[gameState.currentQuestionIndex]?.text}
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {gameState.questions[gameState.currentQuestionIndex]?.options.map((opt: any) => (
              <div key={opt.id} className="text-sm text-slate-400 font-mono bg-black/20 py-1 rounded">
                {opt.id}: {opt.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {myPlayer.status === "eliminated" ? (
        <Card className="p-10 border-red-500/50 bg-red-500/10 text-center space-y-4">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-4xl font-black text-red-500 uppercase italic">Eliminat</h2>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {["A", "B", "C", "D"].map((trap) => (
            <Card
              key={trap}
              className={`p-4 border-2 transition-all ${bets[trap] > 0 ? "border-primary bg-primary/5" : "border-white/5 bg-slate-900/40"}`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-3xl font-black opacity-20">{trap}</span>
                <span className="font-mono font-black">
                  {new Intl.NumberFormat("ca-ES").format(bets[trap])} €
                </span>
              </div>
              {!hasConfirmed && (
                <div className="flex gap-2">
                  <button onClick={() => updateBet(trap, -25000)} className="flex-1 h-12 bg-white/5 rounded-lg border border-white/10">
                    <Minus className="mx-auto" />
                  </button>
                  <button onClick={() => updateBet(trap, 25000)} className="flex-1 h-12 bg-primary/20 rounded-lg border border-primary/30">
                    <Plus className="mx-auto" />
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <div className="fixed bottom-6 left-6 right-6">
        <AnimatePresence>
          {!hasConfirmed && myPlayer.status === "active" && (
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }}>
              <NeonButton onClick={handleConfirm} className="w-full h-16 text-xl shadow-2xl">
                CONFIRMAR APOSTA <Send className="ml-2" />
              </NeonButton>
            </motion.div>
          )}
          {hasConfirmed && (
            <div className="bg-primary/20 border border-primary/50 p-4 rounded-xl flex items-center justify-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-primary animate-pulse" />
              <span className="font-black uppercase text-primary">Aposta Registrada</span>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}