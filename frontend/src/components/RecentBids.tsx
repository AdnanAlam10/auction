import type { RecentBid } from "@shared/socketEvents";

interface RecentBidsProps {
  bids: RecentBid[];
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

export function RecentBids({ bids }: RecentBidsProps) {
  if (bids.length === 0) return null;

  return (
    <div className="border rounded p-4 mb-4">
      <h3 className="text-sm font-medium text-gray-500 mb-2">Recent bids</h3>
      <ul className="space-y-1">
        {bids.map((bid, i) => (
          <li
            key={bid.id}
            className="flex justify-between text-sm transition-opacity duration-300"
            style={{ opacity: i === 0 ? 1 : Math.max(0.4, 1 - i * 0.07) }}
          >
            <span className="font-medium">{bid.bidderName}</span>
            <span className="flex gap-3">
              <span>{formatCents(bid.amount)}</span>
              <span className="text-gray-400 w-16 text-right">
                {timeAgo(bid.createdAt)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
