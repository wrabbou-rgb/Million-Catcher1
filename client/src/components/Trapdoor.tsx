import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MoneyCounter } from "./MoneyCounter";
import { Plus, Minus } from "lucide-react";

interface TrapdoorProps {
  letter: string;
  amount: number;
  maxAmount: number;
  onAdd: () => void;
  onRemove: () => void;
  disabled?: boolean;
  result?: "correct" | "incorrect" | null;
  showResult?: boolean;
  text: string;
}

export function Trapdoor({
  letter,
  amount,
  onAdd,
  onRemove,
  disabled,
  result,
  showResult,
  text,
}: TrapdoorProps) {
  const isCorrect = result === "correct";
  const isIncorrect = result === "incorrect";

  return (
    <div className="flex flex-col gap-2 w-full max-w-[280px] mx-auto">
      <div
        className={cn(
          "relative aspect-[4/3] rounded-t-xl overflow-hidden border-b-8 transition-all duration-500",
          "bg-gradient-to-b from-slate-800 to-slate-900",
          !showResult && "border-slate-600 shadow-lg",
          showResult &&
            isCorrect &&
            "border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]",
          showResult &&
            isIncorrect &&
            "border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.4)]",
        )}
      >
        {/* Option Text Overlay - Z-INDEX ALTO PARA QUE ESTÉ SOBRE EL DINERO */}
        <div className="absolute inset-0 p-6 pt-10 flex items-center justify-center text-center z-20">
          <span className="text-white font-bold text-lg leading-tight drop-shadow-md">
            {text}
          </span>
        </div>

        {/* Money Stack Visualization con OPACIDAD BAJA */}
        <AnimatePresence>
          {amount > 0 && !showResult && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute inset-0 flex flex-col-reverse items-center gap-1 pb-2 z-10"
            >
              {Array.from({
                length: Math.min(5, Math.ceil(amount / 50000)),
              }).map((_, i) => (
                <div
                  key={i}
                  className="w-3/4 h-6 bg-green-600/30 backdrop-blur-[2px] border border-green-400/20 rounded-sm shadow-sm"
                />
              ))}
              <div className="text-xs font-mono text-green-400/80 font-bold mb-1">
                {(amount / 1000).toFixed(0)}k
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showResult && isIncorrect && (
          <motion.div
            initial={{ rotateX: 0 }}
            animate={{ rotateX: -90 }}
            transition={{ duration: 0.8, ease: "easeIn" }}
            className="absolute inset-0 bg-black/80 origin-bottom flex items-center justify-center z-30"
          >
            <span className="text-red-500 font-bold text-xl uppercase tracking-widest">
              CAIGUDA!
            </span>
          </motion.div>
        )}

        <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 font-display font-bold text-xl z-40">
          {letter}
        </div>
      </div>

      <div
        className={cn(
          "p-4 rounded-b-xl border border-t-0 flex flex-col items-center gap-3 transition-colors duration-300",
          "bg-slate-900/50 backdrop-blur-sm",
          showResult && isCorrect
            ? "bg-green-900/20 border-green-500/30"
            : showResult && isIncorrect
              ? "bg-red-900/20 border-red-500/30"
              : "border-slate-700",
        )}
      >
        <MoneyCounter
          value={amount}
          className="text-2xl font-mono text-white"
        />

        {!showResult && (
          <div className="flex items-center gap-4 w-full justify-between">
            <button
              onClick={onRemove}
              disabled={disabled || amount <= 0}
              className="w-12 h-12 rounded-lg bg-slate-800 hover:bg-red-900/50 border border-slate-600 hover:border-red-500 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Minus className="w-6 h-6" />
            </button>

            <button
              onClick={onAdd}
              disabled={disabled}
              className="w-12 h-12 rounded-lg bg-slate-800 hover:bg-green-900/50 border border-slate-600 hover:border-green-500 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
