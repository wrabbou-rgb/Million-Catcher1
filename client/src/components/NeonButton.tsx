import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

interface NeonButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children?: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "outline";
  isLoading?: boolean;
}

export function NeonButton({
  children,
  className,
  variant = "primary",
  isLoading,
  disabled,
  ...props
}: NeonButtonProps) {
  const variants = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] border-primary",
    secondary:
      "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-[0_0_15px_rgba(168,85,247,0.5)] hover:shadow-[0_0_25px_rgba(168,85,247,0.8)] border-secondary",
    danger:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:shadow-[0_0_25px_rgba(239,68,68,0.8)] border-destructive",
    outline:
      "bg-transparent border-2 border-white/20 hover:border-white/50 text-white hover:bg-white/5",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      disabled={disabled || isLoading}
      className={cn(
        "px-8 py-4 rounded-xl font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
        variants[variant],
        className,
      )}
      {...props}
    >
      {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
      {children}
    </motion.button>
  );
}
