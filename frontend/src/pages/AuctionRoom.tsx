import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuctionSocket } from "../hooks/useAuctionSocket";
import { getDisplayName, getParticipantId } from "../lib/participant";
import { NamePrompt } from "../components/NamePrompt";
import { BidForm } from "../components/BidForm";
import { RecentBids } from "../components/RecentBids";
import { Countdown } from "../components/Countdown";
import { ConnectionStatus } from "../components/ConnectionStatus";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function AuctionRoom() {
  const { id } = useParams<{ id: string }>();
  const [displayName, setDisplayNameState] = useState<string | null>(() =>
    getDisplayName(),
  );

  if (!id) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-red-600">
        Missing auction id
      </div>
    );
  }

  if (!displayName) {
    return <NamePrompt onSubmit={setDisplayNameState} />;
  }

  return <AuctionRoomContent auctionId={id} displayName={displayName} />;
}

function AuctionRoomContent({
  auctionId,
  displayName,
}: {
  auctionId: string;
  displayName: string;
}) {
  const { auction, status, error, rejection, placeBid } = useAuctionSocket({
    auctionId,
    displayName,
  });

  if (error && !auction) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <p className="text-red-600">Connection error: {error}</p>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-gray-400">
        Loading auction…
      </div>
    );
  }

  const isEnded = auction.status === "ended";
  const participantId = getParticipantId();

  return (
    <div className="max-w-2xl mx-auto p-8">
      <ConnectionStatus status={status} />

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{auction.title}</h1>
          {auction.description && (
            <p className="text-gray-600 mt-1">{auction.description}</p>
          )}
        </div>
        <span className="text-sm text-gray-400 whitespace-nowrap ml-4">
          {auction.participantCount} watching
        </span>
      </div>

      {auction.imageUrl && (
        <img
          src={auction.imageUrl}
          alt=""
          className="w-full max-h-80 object-cover rounded-lg mb-6"
        />
      )}

      <div className="border rounded-lg p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">
              {isEnded ? "Final price" : "Current bid"}
            </div>
            <div className="text-3xl font-semibold mt-1">
              {formatCents(auction.currentBid)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {auction.currentBidder
                ? `by ${auction.currentBidder}`
                : "No bids yet"}
            </div>
          </div>
          {!isEnded && (
            <div className="text-right">
              <div className="text-sm text-gray-500">Time remaining</div>
              <div className="mt-1">
                <Countdown endsAt={auction.endsAt} />
              </div>
            </div>
          )}
        </div>
      </div>

      {isEnded && (
        <div className="rounded-lg p-5 mb-4 bg-gray-50 border">
          <div className="text-lg font-semibold">Auction ended</div>
          {auction.winnerName ? (
            <p className="mt-1">
              Won by <span className="font-medium">{auction.winnerName}</span>{" "}
              for {formatCents(auction.winnerAmount!)}
            </p>
          ) : (
            <p className="mt-1 text-gray-500">No bids were placed</p>
          )}
        </div>
      )}

      {auction.status === "active" && (
        <div className="mb-4">
          <BidForm
            currentBid={auction.currentBid}
            minIncrement={auction.minIncrement}
            currentBidderId={auction.currentBidderId}
            participantId={participantId}
            status={status}
            rejection={rejection}
            onBid={placeBid}
          />
        </div>
      )}

      <RecentBids bids={auction.recentBids} />

      <div className="text-xs text-gray-400 mt-6">Joined as {displayName}</div>
    </div>
  );
}
