import type { RecentBid } from "@shared/socketEvents";
import { formatCurrency } from "../lib/format";

interface RecentBidsProps {
  bids: RecentBid[];
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
}

export function RecentBids({ bids }: RecentBidsProps) {
  return (
    <section className="border-2 border-ink">
      <header className="flex items-center justify-between px-4 py-2 bg-ink text-paper">
        <h3 className="font-mono text-[10px] uppercase tracking-widest2">
          The Ledger
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-widest2 opacity-60">
          {bids.length === 0
            ? "no entries"
            : `${bids.length} entr${bids.length === 1 ? "y" : "ies"}`}
        </span>
      </header>

      {bids.length === 0 ? (
        <div className="px-4 py-10 text-center font-display italic text-ink-muted">
          The book is open. No bids recorded yet.
        </div>
      ) : (
        <ul>
          {bids.map((bid, i) => (
            <li
              key={bid.id}
              className={`grid grid-cols-[3rem_1fr_auto_3.5rem] items-baseline gap-3 px-4 py-3 ${
                i !== bids.length - 1 ? "rule-thin" : ""
              } ${i === 0 ? "animate-bid-pop bg-paper-2" : ""}`}
            >
              <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink-muted tabular">
                №{String(bids.length - i).padStart(3, "0")}
              </span>
              <span
                className={`font-display text-lg leading-none ${i === 0 ? "italic" : ""}`}
              >
                {bid.bidderName}
              </span>
              <span className="font-mono tabular text-base">
                {formatCurrency(bid.amount)}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink-muted text-right tabular">
                {timeAgo(bid.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
