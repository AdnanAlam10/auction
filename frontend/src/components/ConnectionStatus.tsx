import type { ConnectionStatus as Status } from "../hooks/useAuctionSocket";

interface ConnectionStatusProps {
  status: Status;
}

const config: Record<Status, { color: string; label: string }> = {
  connected: { color: "bg-green-500", label: "Connected" },
  connecting: { color: "bg-yellow-500 animate-pulse", label: "Reconnecting…" },
  disconnected: { color: "bg-red-500", label: "Disconnected" },
};

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  if (status === "connected") return null;

  const { color, label } = config[status];

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {label}
    </div>
  );
}
