import { prisma } from "../lib/prisma.js";
import { BidError } from "./bidError.js";

const ANTI_SNIPE_THRESHOLD_MS = 30_000; // 30 seconds
const ANTI_SNIPE_EXTENSION_MS = 30_000;

interface PlaceBidArgs {
  auctionId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
}

interface PlaceBidResult {
  bidId: string;
  amount: number;
  bidderName: string;
  currentBid: number;
  currentBidder: string;
  newEndsAt: string | null;
  timestamp: string;
}

interface AuctionRow {
  id: string;
  status: string;
  ends_at: Date;
  current_bid: number;
  current_bidder: string | null;
  current_bidder_id: string | null;
  min_increment: number;
}

export async function placeBid(args: PlaceBidArgs): Promise<PlaceBidResult> {
  const { auctionId, bidderId, bidderName, amount } = args;

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new BidError("INVALID_AMOUNT");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Step 1: Lock the auction row.
    // This is raw SQL because Prisma doesn't expose SELECT FOR UPDATE.
    // Every other transaction trying to lock this row will WAIT here
    // until this transaction commits or rolls back.
    const rows = await tx.$queryRaw<AuctionRow[]>`
    SELECT
        id,
        status,
        ends_at,
        current_bid,
        current_bidder,
        current_bidder_id,
        min_increment
      FROM auctions
      WHERE id = ${auctionId}::uuid
      FOR UPDATE
    `;

    const auction = rows[0];
    if (!auction) {
      throw new BidError("AUCTION_NOT_ACTIVE");
    }

    // Step 2: Validate against the locked row.
    // These checks run against data that no other transaction can
    // change until we commit — that's the whole point of FOR UPDATE.

    if (auction.status !== "active") {
      throw new BidError("AUCTION_NOT_ACTIVE");
    }

    if (new Date() >= auction.ends_at) {
      throw new BidError("AUCTION_ENDED");
    }

    if (auction.current_bidder_id === bidderId) {
      throw new BidError("SELF_BID");
    }

    const minimumBid = auction.current_bid + auction.min_increment;
    if (amount < minimumBid) {
      throw new BidError("BID_TOO_LOW");
    }

    // Step 3: Compute anti-sniping extension.
    // If we're within the final 30 seconds, push ends_at out.
    // This happens inside the same transaction as the bid —
    // if the transaction rolls back, the extension never happened.
    let newEndsAt: Date | null = null;
    const msRemaining = auction.ends_at.getTime() - Date.now();
    if (msRemaining <= ANTI_SNIPE_THRESHOLD_MS) {
      newEndsAt = new Date(Date.now() + ANTI_SNIPE_EXTENSION_MS);
    }

    // Step 4: Insert the bid row.
    const bid = await tx.bid.create({
      data: {
        auctionId,
        bidderId,
        bidderName,
        amount,
      },
    });

    // Step 5: Update the auction row.
    // One UPDATE, same transaction. current_bid, current_bidder,
    // current_bidder_id, and optionally ends_at — all atomic.
    await tx.auction.update({
      where: { id: auctionId },
      data: {
        currentBid: amount,
        currentBidder: bidderName,
        currentBidderId: bidderId,
        ...(newEndsAt ? { endsAt: newEndsAt } : {}),
      },
    });

    // Return everything the caller needs to broadcast.
    // Do NOT broadcast inside this callback — if the transaction
    // rolls back, the broadcast would be a lie.
    return {
      bidId: bid.id,
      amount,
      bidderName,
      currentBid: amount,
      currentBidder: bidderName,
      newEndsAt: newEndsAt ? newEndsAt.toISOString() : null,
      timestamp: bid.createdAt.toISOString(),
    };
  });

  // Step 6: We're past the await — the transaction has committed.
  // The caller (the socket handler) will use this result to:
  //   - emit 'new_bid' to the room
  //   - emit 'timer_extended' if newEndsAt is set
  //   - reschedule the in-memory setTimeout (day 4)
  // All of that happens OUTSIDE this function, AFTER commit.
  return result;
}
