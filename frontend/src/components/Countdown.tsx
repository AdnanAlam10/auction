import { useState, useEffect } from "react";

interface CountdownProps {
  endsAt: string;
}

export function Countdown({ endsAt }: CountdownProps) {
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

  if (msRemaining <= 0) {
    return <span className="text-red-600 font-semibold">Ended</span>;
  }

  const totalSeconds = Math.ceil(msRemaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  let className = "font-mono text-lg font-semibold ";
  if (totalSeconds <= 10) {
    className += "text-red-600 animate-pulse";
  } else if (totalSeconds <= 30) {
    className += "text-orange-500";
  } else {
    className += "text-gray-900";
  }

  return <span className={className}>{display}</span>;
}
