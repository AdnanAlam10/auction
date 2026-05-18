import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import { createAuctionsRouter } from "./routes/auctions.js";
import { registerAuctionHandlers } from "./sockets/handlers.js";
import { schedule } from "./services/auctionTimers.js";
import { prisma } from "./lib/prisma.js";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

const app = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auctions", createAuctionsRouter(io));

io.on("connection", (socket) => {
  console.log(`socket connected: ${socket.id}`);
  registerAuctionHandlers(io, socket);
});

async function recoverTimers() {
  const active = await prisma.auction.findMany({
    where: { status: "active" },
    select: { id: true, endsAt: true },
  });

  for (const auction of active) {
    schedule(auction.id, auction.endsAt, io);
  }

  if (active.length > 0) {
    console.log(`recovered ${active.length} auction timer(s)`);
  }
}

const PORT = Number(process.env.PORT ?? 3001);
httpServer.listen(PORT, () => {
  console.log(`backend listening on :${PORT}`);
  recoverTimers().catch(console.error);
});
