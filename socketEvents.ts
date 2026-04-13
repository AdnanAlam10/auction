export interface ServerToClientEvents {
  auction_state: (payload: AuctionStatePayload) => void;
  new_bid: (payload: NewBidPayload) => void;
  bid_rejected: (payload: { reason: string }) => void;
  participant_count: (payload: { count: number }) => void;
  timer_extended: (payload: { newEndsAt: string }) => void;
  auction_ended: (payload: {
    winnerName: string | null;
    winnerAmount: number | null;
  }) => void;
}

export interface ClientToServerEvents {
  join_auction: (payload: {
    auctionId: string;
    displayName: string;
    participantId: string;
  }) => void;
  place_bid: (payload: {
    auctionId: string;
    amount: number;
    participantId: string;
  }) => void;
  leave_auction: (payload: { auctionId: string }) => void;
}

export interface AuctionStatePayload {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  startingBid: number;
  currentBid: number;
  currentBidder: string | null;
  currentBidderId: string | null;
  minIncrement: number;
  startsAt: string;
  endsAt: string;
  status: "pending" | "active" | "ended";
  winnerName: string | null;
  winnerAmount: number | null;
  recentBids: RecentBid[];
  participantCount: number;
}

export interface NewBidPayload {
  bidderName: string;
  amount: number;
  currentBid: number;
  currentBidder: string;
  timestamp: string;
}

export interface RecentBid {
  id: string;
  bidderName: string;
  amount: number;
  createdAt: string;
}
