import type { Server } from "socket.io";
import { prisma } from "../lib/prisma.js";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "../../../shared/socketEvents.js";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

const timers = new Map<string, NodeJS.Timeout>();

interface EndAuctionRow {
  id: string;
  status: string;
  ends_at: Date;
  current_bid: number;
  current_bidder: string | null;
  current_bidder_id: string | null;
}

export function schedule(auctionId: string, endsAt: Date, io: IO): void {
  clear(auctionId);

  const ms = endsAt.getTime() - Date.now();

  if (ms <= 0) {
    endAuction(auctionId, io);
    return;
  }

  const timeout = setTimeout(() => {
    timers.delete(auctionId);
    endAuction(auctionId, io);
  }, ms);

  timers.set(auctionId, timeout);
}

export function reschedule(auctionId: string, newEndsAt: Date, io: IO): void {
  schedule(auctionId, newEndsAt, io);
}

export function clear(auctionId: string): void {
  const existing = timers.get(auctionId);
  if (existing) {
    clearTimeout(existing);
    timers.delete(auctionId);
  }
}

async function endAuction(auctionId: string, io: IO): Promise<void> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const rows = (await tx.$queryRaw`
        SELECT id, status, ends_at, current_bid, current_bidder, current_bidder_id
        FROM auctions
        WHERE id = ${auctionId}::uuid
        FOR UPDATE
        `) as EndAuctionRow[];

      const auction = rows[0];
      if (!auction) return null;

      if (auction.status !== "active") return null;

      if (new Date() < auction.ends_at) {
        return { type: "reschedule" as const, endsAt: auction.ends_at };
      }

      await tx.auction.update({
        where: { id: auctionId },
        data: {
          status: "ended",
          winnerName: auction.current_bidder,
          winnerAmount: auction.current_bid,
        },
      });

      return {
        type: "ended" as const,
        winnerName: auction.current_bidder,
        winnerAmount: auction.current_bidder ? auction.current_bid : null,
      };
    });

    if (!result) return;

    if (result.type === "reschedule") {
      schedule(auctionId, result.endsAt, io);
      return;
    }

    io.to(`auction:${auctionId}`).emit("auction_ended", {
      winnerName: result.winnerName,
      winnerAmount: result.winnerAmount,
    });
  } catch (err) {
    console.error(`Failed to end auction ${auctionId}:`, err);
  }
}
