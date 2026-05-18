import { BidError } from "./bidError.js";
import type { PrismaClient } from "@prisma/client";

const ANTI_SNIPE_THRESHOLD_MS = 30_000;
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

export async function placeBid(
  args: PlaceBidArgs,
  db: PrismaClient,
): Promise<PlaceBidResult> {
  const { auctionId, bidderId, bidderName, amount } = args;

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new BidError("INVALID_AMOUNT");
  }

  const result = await db.$transaction(async (tx) => {
    // Raw SQL because Prisma doesn't expose SELECT FOR UPDATE — concurrent
    // bidders block here until this transaction commits.
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

    let newEndsAt: Date | null = null;
    const msRemaining = auction.ends_at.getTime() - Date.now();
    if (msRemaining <= ANTI_SNIPE_THRESHOLD_MS) {
      newEndsAt = new Date(Date.now() + ANTI_SNIPE_EXTENSION_MS);
    }

    const bid = await tx.bid.create({
      data: {
        auctionId,
        bidderId,
        bidderName,
        amount,
      },
    });

    await tx.auction.update({
      where: { id: auctionId },
      data: {
        currentBid: amount,
        currentBidder: bidderName,
        currentBidderId: bidderId,
        ...(newEndsAt ? { endsAt: newEndsAt } : {}),
      },
    });

    // Caller must broadcast AFTER commit — emitting inside the txn
    // would lie to clients if it rolls back.
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

  return result;
}
