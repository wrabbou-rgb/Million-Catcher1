import { useEffect, useRef } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface MoneyCounterProps {
  value: number;
  className?: string;
  prefix?: string;
}

export function MoneyCounter({ value, className = "", prefix = "" }: MoneyCounterProps) {
  // Use a spring for smooth number transitions
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  
  // Format the display value
  const display = useTransform(spring, (current) => {
    // Round to nearest integer for clean display
    const rounded = Math.round(current);
    // Format with dots for thousands: 1.000.000 €
    return `${prefix}${rounded.toLocaleString('es-ES')} €`;
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return (
    <motion.span className={className}>
      {display}
    </motion.span>
  );
}
