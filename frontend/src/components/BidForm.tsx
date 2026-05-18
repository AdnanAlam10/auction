import { useState } from "react";
import { formatDollars } from "../lib/format";

interface BidFormProps {
  currentBid: number;
  minIncrement: number;
  currentBidderId: string | null;
  participantId: string;
  status: string;
  rejection: string | null;
  onBid: (amountCents: number) => void;
}

const REJECTION_MESSAGES: Record<string, string> = {
  BID_TOO_LOW: "Bid did not clear the minimum increment.",
  SELF_BID: "You already hold the high bid.",
  AUCTION_NOT_ACTIVE: "This lot is not currently open.",
  AUCTION_ENDED: "The hammer has fallen.",
  RATE_LIMITED: "Easy — a moment between bids.",
  INVALID_AMOUNT: "That amount is not a valid figure.",
  INVALID_INPUT: "Bid payload rejected.",
  NOT_IN_ROOM: "Connection lost. Rejoining…",
  INTERNAL_ERROR: "Server hiccup. Try once more.",
};

export function BidForm({
  currentBid,
  minIncrement,
  currentBidderId,
  participantId,
  status,
  rejection,
  onBid,
}: BidFormProps) {
  const minimumBid = currentBid + minIncrement;
  const [editedValue, setEditedValue] = useState<string | null>(null);
  const inputValue = editedValue ?? formatDollars(minimumBid);
  const isHighBidder = currentBidderId === participantId;
  const disabled = isHighBidder || status !== "connected";

  const handleSubmit = () => {
    const dollars = parseFloat(inputValue);
    if (!Number.isFinite(dollars) || dollars <= 0) return;
    const cents = Math.round(dollars * 100);
    onBid(cents);
    setEditedValue(null);
  };

  const bump = (delta: number) => {
    const next = Math.max(
      minimumBid,
      Math.round(parseFloat(inputValue) * 100) + delta,
    );
    setEditedValue(formatDollars(next));
  };

  return (
    <div className="border-2 border-ink bg-paper">
      <div className="flex items-center justify-between px-4 py-2 rule-thin">
        <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
          Submit a bid
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
          min · ${formatDollars(minimumBid)}
        </span>
      </div>

      <div className="flex items-stretch">
        <div className="flex-1 relative">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 font-display text-4xl text-ink-muted">
            $
          </span>
          <input
            type="number"
            step="0.01"
            min={formatDollars(minimumBid)}
            value={inputValue}
            onChange={(e) => setEditedValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={disabled}
            className="w-full bg-transparent pl-12 pr-4 py-5 font-display text-5xl tabular tracking-tight focus:outline-none disabled:opacity-50"
          />
        </div>
        <div className="flex flex-col border-l-2 border-ink">
          <button
            type="button"
            onClick={() => bump(100)}
            disabled={disabled}
            className="flex-1 px-3 font-mono text-xs hover:bg-ink hover:text-paper transition-colors disabled:opacity-40 border-b border-ink"
          >
            +$1
          </button>
          <button
            type="button"
            onClick={() => bump(500)}
            disabled={disabled}
            className="flex-1 px-3 font-mono text-xs hover:bg-ink hover:text-paper transition-colors disabled:opacity-40"
          >
            +$5
          </button>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={disabled}
        className="w-full bg-ink text-paper py-4 font-mono uppercase tracking-widest2 text-sm border-t-2 border-ink hover:bg-vermillion transition-colors disabled:bg-ink-muted disabled:cursor-not-allowed"
      >
        {isHighBidder ? "You hold the bid" : "Place bid →"}
      </button>

      {rejection && (
        <div className="px-4 py-3 bg-vermillion text-paper border-t-2 border-ink flex items-start gap-2">
          <span className="font-mono text-xs mt-0.5">!</span>
          <p className="font-display italic text-base leading-tight">
            {REJECTION_MESSAGES[rejection] ?? rejection}
          </p>
        </div>
      )}

      {isHighBidder && !rejection && (
        <div className="px-4 py-3 border-t-2 border-ink flex items-center gap-3">
          <span className="w-2 h-2 bg-moss rounded-full animate-live-pulse" />
          <p className="font-mono text-xs uppercase tracking-widest2">
            Leading bidder
          </p>
        </div>
      )}
    </div>
  );
}
