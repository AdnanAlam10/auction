import { useEffect, useState } from "react";

interface CountdownProps {
  endsAt: string;
  size?: "sm" | "md" | "xl";
  onUrgencyChange?: (urgency: "normal" | "warning" | "critical") => void;
}

export function Countdown({
  endsAt,
  size = "xl",
  onUrgencyChange,
}: CountdownProps) {
  const [msRemaining, setMsRemaining] = useState(() =>
    Math.max(0, new Date(endsAt).getTime() - Date.now()),
  );

  useEffect(() => {
    const target = new Date(endsAt).getTime();
    const tick = () => {
      const remaining = Math.max(0, target - Date.now());
      setMsRemaining(remaining);
      if (remaining <= 0) clearInterval(interval);
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [endsAt]);

  const totalSeconds = Math.ceil(msRemaining / 1000);
  const urgency: "normal" | "warning" | "critical" =
    totalSeconds <= 10 ? "critical" : totalSeconds <= 30 ? "warning" : "normal";

  useEffect(() => {
    onUrgencyChange?.(urgency);
  }, [urgency, onUrgencyChange]);

  if (msRemaining <= 0) {
    return (
      <span className="font-mono uppercase tracking-widest2 text-vermillion text-sm">
        — closed —
      </span>
    );
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((msRemaining % 1000) / 100);
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");

  const sizeClass =
    size === "xl"
      ? "text-[6.5rem] leading-[0.9]"
      : size === "md"
        ? "text-5xl leading-none"
        : "text-2xl leading-none";

  const colorClass =
    urgency === "critical"
      ? "text-vermillion"
      : urgency === "warning"
        ? "text-vermillion-deep"
        : "text-ink";

  const pulseClass = urgency === "critical" ? "animate-tick-pulse" : "";

  return (
    <div className={`font-mono tabular ${colorClass} ${pulseClass}`}>
      <div className="flex items-baseline gap-1">
        <span className={`${sizeClass} font-medium`}>{mm}</span>
        <span className={`${sizeClass} font-medium opacity-40`}>:</span>
        <span className={`${sizeClass} font-medium`}>{ss}</span>
        {size === "xl" && (
          <span className="ml-2 text-xl opacity-50 tabular">·{tenths}</span>
        )}
      </div>
    </div>
  );
}
