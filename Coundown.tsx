import { useState, useEffect } from "react";
import { Timer } from "lucide-react";

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

    const timer = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, onTimeUp]);

  // Calculamos el color basado en el tiempo restante
  const textColor =
    seconds <= 10 ? "text-red-500 animate-pulse" : "text-primary";

  return (
    <div className="flex flex-col items-center gap-1 bg-black/40 border border-white/10 p-4 rounded-2xl backdrop-blur-md min-w-[120px]">
      <div className="flex items-center gap-2">
        <Timer className={`w-5 h-5 ${textColor}`} />
        <span
          className={`text-4xl font-mono font-black tracking-tighter ${textColor}`}
        >
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
