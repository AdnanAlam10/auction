import { useState } from "react";

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
  BID_TOO_LOW: "Your bid is too low",
  SELF_BID: "You are already the highest bidder",
  AUCTION_NOT_ACTIVE: "This auction is not active",
  AUCTION_ENDED: "This auction has ended",
  RATE_LIMITED: "Too fast — wait a moment",
  INVALID_AMOUNT: "Invalid bid amount",
  INVALID_INPUT: "Invalid request",
  NOT_IN_ROOM: "Not connected to this auction",
  INTERNAL_ERROR: "Something went wrong — try again",
};

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

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
  const [inputValue, setInputValue] = useState(formatCents(minimumBid));
  const isHighBidder = currentBidderId === participantId;

  const handleSubmit = () => {
    const dollars = parseFloat(inputValue);
    if (!Number.isFinite(dollars) || dollars <= 0) return;
    const cents = Math.round(dollars * 100);
    onBid(cents);
  };

  return (
    <div className="border rounded p-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            $
          </span>
          <input
            type="number"
            step="0.01"
            min={formatCents(minimumBid)}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="w-full pl-7 pr-3 py-2 border rounded"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={isHighBidder || status !== "connected"}
          className="px-6 py-2 bg-black text-white rounded disabled:opacity-50"
        >
          Place bid
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Minimum bid: ${formatCents(minimumBid)}
      </p>

      {rejection && (
        <p className="text-red-600 text-sm mt-2">
          {REJECTION_MESSAGES[rejection] ?? rejection}
        </p>
      )}

      {isHighBidder && !rejection && (
        <p className="text-green-700 text-sm mt-2">
          You are the highest bidder
        </p>
      )}
    </div>
  );
}
