import { useEffect, useRef, useState } from "react";
import { socket } from "../lib/socket";
import { getParticipantId } from "../lib/participant";
import type { AuctionStatePayload, NewBidPayload } from "../../../socketEvents";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface UseAuctionSocketArgs {
  auctionId: string;
  displayName: string | null;
}

interface UseAuctionSocketResult {
  auction: AuctionStatePayload | null;
  status: ConnectionStatus;
  error: string | null;
}

export function useAuctionSocket({
  auctionId,
  displayName,
}: UseAuctionSocketArgs): UseAuctionSocketResult {
  const [auction, setAuction] = useState<AuctionStatePayload | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>(() =>
    socket.connected ? "connected" : "connecting",
  );
  const [error, setError] = useState<string | null>(null);

  const joinedRef = useRef(false);

  useEffect(() => {
    if (!displayName) return;

    const participantId = getParticipantId();

    const join = () => {
      socket.emit("join_auction", { auctionId, displayName, participantId });
      joinedRef.current = true;
    };

    const handleConnect = () => {
      setStatus("connected");
      setError(null);
      join();
    };

    const handleDisconnect = () => {
      setStatus("disconnected");
      joinedRef.current = false;
    };

    const handleConnectError = (err: Error) => {
      setStatus("disconnected");
      setError(err.message);
    };

    const handleAuctionState = (payload: AuctionStatePayload) => {
      setAuction(payload);
    };

    const handleParticipantCount = ({ count }: { count: number }) => {
      setAuction((prev) =>
        prev ? { ...prev, participantCount: count } : prev,
      );
    };

    const handleNewBid = ({ currentBid, currentBidder }: NewBidPayload) => {
      setAuction((prev) =>
        prev ? { ...prev, currentBid, currentBidder } : prev,
      );
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("auction_state", handleAuctionState);
    socket.on("participant_count", handleParticipantCount);
    socket.on("new_bid", handleNewBid);

    if (socket.connected) {
      join();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("auction_state", handleAuctionState);
      socket.off("participant_count", handleParticipantCount);
      socket.off("new_bid", handleNewBid);

      if (joinedRef.current) {
        socket.emit("leave_auction", { auctionId });
        joinedRef.current = false;
      }
    };
  }, [auctionId, displayName]);

  return { auction, status, error };
}
