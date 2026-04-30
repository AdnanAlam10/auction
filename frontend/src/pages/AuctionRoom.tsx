import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuctionSocket } from "../hooks/useAuctionSocket";
import { getDisplayName } from "../lib/participant";
import { NamePrompt } from "../components/NamePrompt";
import { BidForm } from "../components/BidForm";
import { getParticipantId } from "../lib/participant";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function AuctionRoom() {
  const { id } = useParams<{ id: string }>();
  const [displayName, setDisplayNameState] = useState<string | null>(() =>
    getDisplayName(),
  );

  if (!id) {
    return <div className="p-8 text-red-600">Missing auction id</div>;
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

  if (status === "connecting" && !auction) {
    return <div className="p-8 text-gray-500">Connecting…</div>;
  }

  if (error && !auction) {
    return <div className="p-8 text-red-600">Connection error: {error}</div>;
  }

  if (!auction) {
    return <div className="p-8 text-gray-500">Loading auction…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex items-start justify-between mb-4">
        <h1 className="text-2xl font-semibold">{auction.title}</h1>
        <span className="text-sm text-gray-500">
          {auction.participantCount} watching
        </span>
      </div>

      {auction.description && (
        <p className="text-gray-700 mb-4">{auction.description}</p>
      )}

      {auction.imageUrl && (
        <img
          src={auction.imageUrl}
          alt=""
          className="w-full max-h-96 object-cover rounded mb-4"
        />
      )}

      <div className="border rounded p-4 mb-4">
        <div className="text-sm text-gray-500">Current bid</div>
        <div className="text-3xl font-semibold">
          {formatCents(auction.currentBid)}
        </div>
        <div className="text-sm text-gray-600 mt-1">
          {auction.currentBidder
            ? `by ${auction.currentBidder}`
            : "No bids yet"}
        </div>
      </div>

      {auction.status === "active" && (
        <BidForm
          currentBid={auction.currentBid}
          minIncrement={auction.minIncrement}
          currentBidderId={auction.currentBidderId}
          participantId={getParticipantId()}
          status={status}
          rejection={rejection}
          onBid={placeBid}
        />
      )}

      <div className="text-sm text-gray-500">
        Ends at: {new Date(auction.endsAt).toLocaleString()}
      </div>
      <div className="text-xs text-gray-400 mt-1">
        Status: {auction.status} · You: {displayName} · Connection: {status}
      </div>
    </div>
  );
}
