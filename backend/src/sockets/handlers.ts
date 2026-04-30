import type { Server, Socket } from "socket.io";
import { prisma } from "../lib/prisma.js";
import { joinAuctionSchema, leaveAuctionSchema } from "./validation.js";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  AuctionStatePayload,
} from "../../../shared/socketEvents.js";
import { canBid, clearRateLimit } from "./rateLimit.js";
import { placeBid } from "../services/bidService.js";
import { BidError } from "../services/bidError.js";
import { placeBidSchema } from "./validation.js";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface AuctionSocketData {
  auctionId?: string;
  participantId?: string;
  displayName?: string;
}

function getJoinedContext(socket: ClientSocket):
  | (AuctionSocketData & {
      auctionId: string;
      participantId: string;
      displayName: string;
    })
  | null {
  const data = socket.data as AuctionSocketData;
  if (!data.auctionId || !data.participantId || !data.displayName) {
    return null;
  }
  return {
    auctionId: data.auctionId,
    participantId: data.participantId,
    displayName: data.displayName,
  };
}

function roomName(auctionId: string): string {
  return `auction:${auctionId}`;
}

function countInRoom(io: IO, room: string): number {
  return io.sockets.adapter.rooms.get(room)?.size ?? 0;
}

export function registerAuctionHandlers(io: IO, socket: ClientSocket): void {
  socket.on("join_auction", async (rawPayload) => {
    const parsed = joinAuctionSchema.safeParse(rawPayload);

    if (!parsed.success) {
      socket.emit("bid_rejected", { reason: "INVALID_INPUT" });
      return;
    }

    const { auctionId, displayName, participantId } = parsed.data;

    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        startingBid: true,
        currentBid: true,
        currentBidder: true,
        currentBidderId: true,
        minIncrement: true,
        startsAt: true,
        endsAt: true,
        status: true,
        winnerName: true,
        winnerAmount: true,
        bids: {
          select: {
            id: true,
            bidderName: true,
            amount: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!auction) {
      socket.emit("bid_rejected", { reason: "NOT_IN_ROOM" });
      return;
    }

    const previousCtx = getJoinedContext(socket);
    if (previousCtx && previousCtx.auctionId !== auctionId) {
      const previousRoom = roomName(previousCtx.auctionId);
      await socket.leave(previousRoom);
      setTimeout(() => {
        const count = countInRoom(io, previousRoom);
        io.to(previousRoom).emit("participant_count", { count });
      }, 100);
    }

    const room = roomName(auctionId);
    await socket.join(room);

    socket.data.auctionId = auctionId;
    socket.data.participantId = participantId;
    socket.data.displayName = displayName;

    const participantCount = countInRoom(io, room);

    const payload: AuctionStatePayload = {
      id: auction.id,
      title: auction.title,
      description: auction.description,
      imageUrl: auction.imageUrl,
      startingBid: auction.startingBid,
      currentBid: auction.currentBid,
      currentBidder: auction.currentBidder,
      currentBidderId: auction.currentBidderId,
      minIncrement: auction.minIncrement,
      startsAt: auction.startsAt.toISOString(),
      endsAt: auction.endsAt.toISOString(),
      status: auction.status,
      winnerName: auction.winnerName,
      winnerAmount: auction.winnerAmount,
      recentBids: auction.bids.map((b) => ({
        id: b.id,
        bidderName: b.bidderName,
        amount: b.amount,
        createdAt: b.createdAt.toISOString(),
      })),
      participantCount,
    };

    socket.emit("auction_state", payload);
    io.to(room).emit("participant_count", { count: participantCount });
  });

  socket.on("place_bid", async (rawPayload) => {
    const ctx = getJoinedContext(socket);
    if (!ctx) {
      socket.emit("bid_rejected", { reason: "NOT_IN_ROOM" });
      return;
    }

    const parsed = placeBidSchema.safeParse(rawPayload);
    if (!parsed.success) {
      socket.emit("bid_rejected", { reason: "INVALID_INPUT" });
      return;
    }
    const { auctionId, amount, participantId } = parsed.data;

    if (auctionId !== ctx.auctionId) {
      socket.emit("bid_rejected", { reason: "NOT_IN_ROOM" });
      return;
    }

    if (participantId !== ctx.participantId) {
      socket.emit("bid_rejected", { reason: "NOT_IN_ROOM" });
      return;
    }

    if (!canBid(socket.id)) {
      socket.emit("bid_rejected", { reason: "RATE_LIMITED" });
      return;
    }

    try {
      const result = await placeBid(
        {
          auctionId,
          bidderId: ctx.participantId,
          bidderName: ctx.displayName,
          amount,
        },
        prisma,
      );

      const room = roomName(auctionId);

      io.to(room).emit("new_bid", {
        bidderName: result.bidderName,
        amount: result.amount,
        currentBid: result.currentBid,
        currentBidder: result.currentBidder,
        timestamp: result.timestamp,
      });

      if (result.newEndsAt) {
        io.to(room).emit("timer_extended", { newEndsAt: result.newEndsAt });
      }
    } catch (err) {
      if (err instanceof BidError) {
        socket.emit("bid_rejected", { reason: err.reason });
      } else {
        console.error("Unexpected bid error:", err);
        socket.emit("bid_rejected", { reason: "INTERNAL_ERROR" });
      }
    }
  });

  socket.on("leave_auction", (rawPayload) => {
    const parsed = leaveAuctionSchema.safeParse(rawPayload);
    if (!parsed.success) return;
    const { auctionId } = parsed.data;

    const ctx = getJoinedContext(socket);
    if (!ctx || ctx.auctionId !== auctionId) return;

    const room = roomName(auctionId);
    socket.leave(room);
    socket.data.auctionId = undefined;

    setTimeout(() => {
      const count = countInRoom(io, room);
      io.to(room).emit("participant_count", { count });
    }, 100);
  });

  socket.on("disconnect", () => {
    clearRateLimit(socket.id);

    const auctionId = socket.data.auctionId;
    if (!auctionId) return;
    const room = roomName(auctionId);

    setTimeout(() => {
      const count = countInRoom(io, room);
      io.to(room).emit("participant_count", { count });
    }, 100);
  });
}
