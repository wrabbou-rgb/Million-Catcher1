import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface MoneyDisplayProps {
  amount: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  animate?: boolean;
}

export function MoneyDisplay({
  amount,
  size = "md",
  className = "",
  animate = true,
}: MoneyDisplayProps) {
  const [displayAmount, setDisplayAmount] = useState(amount);

  useEffect(() => {
    setDisplayAmount(amount);
  }, [amount, animate]);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("ca-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const sizeClasses = {
    sm: "text-lg font-bold",
    md: "text-2xl font-bold",
    lg: "text-4xl font-extrabold tracking-tight",
    xl: "text-6xl font-black tracking-tighter",
  };

  return (
    <div className={`font-mono text-primary ${sizeClasses[size]} ${className}`}>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={displayAmount}
          initial={animate ? { y: 10, opacity: 0 } : undefined}
          animate={{ y: 0, opacity: 1 }}
          exit={animate ? { y: -10, opacity: 0 } : undefined}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {formatMoney(displayAmount)}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
