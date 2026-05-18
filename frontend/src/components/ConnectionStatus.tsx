import type { ConnectionStatus as Status } from "../hooks/useAuctionSocket";

interface ConnectionStatusProps {
  status: Status;
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  if (status === "connected") return null;

  const label =
    status === "connecting" ? "Re-establishing line…" : "Line dropped";

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-ink text-paper border-2 border-ink shadow-[4px_4px_0_0_var(--vermillion)]">
      <span
        className={`w-2 h-2 rounded-full ${
          status === "connecting"
            ? "bg-vermillion-glow animate-live-pulse"
            : "bg-vermillion"
        }`}
      />
      <span className="font-mono text-xs uppercase tracking-widest2">
        {label}
      </span>
    </div>
  );
}
