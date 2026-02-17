import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OptionCardProps {
  letter: string;
  text: string;
  amount: number;
  maxAmount: number; // Current remaining money to distribute
  totalMoney: number; // Total money the player has
  onIncrease: () => void;
  onDecrease: () => void;
  disabled: boolean;
  isRevealed?: boolean;
  isCorrect?: boolean;
}

export function OptionCard({
  letter,
  text,
  amount,
  maxAmount,
  totalMoney,
  onIncrease,
  onDecrease,
  disabled,
  isRevealed = false,
  isCorrect = false
}: OptionCardProps) {
  
  // Calculate percentage for visual fill
  const fillPercentage = totalMoney > 0 ? (amount / totalMoney) * 100 : 0;

  let borderColor = "border-white/10";
  let glowClass = "";
  
  if (isRevealed) {
    if (isCorrect) {
      borderColor = "border-green-500";
      glowClass = "shadow-[0_0_30px_rgba(34,197,94,0.3)] bg-green-500/10";
    } else {
      borderColor = "border-red-500";
      glowClass = "shadow-[0_0_30px_rgba(239,68,68,0.3)] opacity-50";
    }
  } else if (amount > 0) {
    borderColor = "border-primary";
    glowClass = "shadow-[0_0_20px_rgba(139,92,246,0.2)]";
  }

  return (
    <motion.div
      className={cn(
        "relative flex flex-col rounded-2xl border-2 overflow-hidden transition-colors duration-300 bg-card/80 backdrop-blur-sm",
        borderColor,
        glowClass
      )}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={!disabled && !isRevealed ? { scale: 1.02 } : {}}
    >
      {/* Background Fill Animation */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-primary/20 transition-all duration-500 ease-out"
        style={{ height: `${fillPercentage}%` }}
      />

      <div className="relative z-10 flex flex-col h-full p-4 md:p-6">
        <div className="flex items-start gap-4 mb-auto">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full font-bold text-xl shrink-0",
            amount > 0 ? "bg-primary text-white" : "bg-white/10 text-white/50",
            isRevealed && isCorrect && "bg-green-500 text-white",
            isRevealed && !isCorrect && "bg-red-500 text-white"
          )}>
            {letter}
          </div>
          <p className="text-lg md:text-xl font-medium leading-snug">{text}</p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <div className="flex items-center justify-between bg-black/40 rounded-lg p-3">
             <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full hover:bg-white/10 hover:text-white"
                onClick={onDecrease}
                disabled={disabled || amount === 0}
             >
                <Minus className="w-5 h-5" />
             </Button>

             <div className="font-mono text-xl font-bold text-primary tabular-nums">
                {(amount).toLocaleString('ca-ES')} €
             </div>

             <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full hover:bg-white/10 hover:text-white"
                onClick={onIncrease}
                disabled={disabled || maxAmount === 0}
             >
                <Plus className="w-5 h-5" />
             </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
