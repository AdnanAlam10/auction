import type { Server, Socket } from "socket.io";
import { prisma } from "../lib/prisma.js";
import { joinAuctionSchema, leaveAuctionSchema } from "./validation.js";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  AuctionStatePayload,
} from "../../../socketEvents.js";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

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
      socket.emit("bid_rejected", { reason: "NOT_IN_AUCTION_ROOM" });
      return;
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

  socket.on("leave_auction", (rawPayload) => {
    const parsed = leaveAuctionSchema.safeParse(rawPayload);
    if (!parsed.success) return;
    const { auctionId } = parsed.data;
    const room = roomName(auctionId);

    socket.leave(room);
    const count = countInRoom(io, room);
    io.to(room).emit("participant_count", { count });
  });

  socket.on("disconnect", () => {
    const auctionId = socket.data.auctionId;
    if (!auctionId) return;
    const room = roomName(auctionId);

    setTimeout(() => {
      const count = countInRoom(io, room);
      io.to(room).emit("participant_count", { count });
    }, 100);
  });
}
