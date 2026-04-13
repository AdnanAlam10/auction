import { z } from "zod";
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { createAuctionSchema } from "./validation.js";

export const auctionsRouter = Router();

auctionsRouter.post("/", async (req: Request, res: Response) => {
  const parsed = createAuctionSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "INVALID_INPUT",
      issues: z.flattenError(parsed.error).fieldErrors,
    });
  }

  const input = parsed.data;
  const now = new Date();
  const endsAt = new Date(now.getTime() + input.durationSeconds * 1000);

  try {
    const auction = await prisma.auction.create({
      data: {
        title: input.title,
        description: input.description,
        imageUrl: input.imageUrl,
        startingBid: input.startingBid,
        currentBid: input.startingBid,
        minIncrement: input.minIncrement,
        startsAt: now,
        endsAt,
        status: "active",
      },
      select: {
        id: true,
        hostToken: true,
      },
    });

    return res.status(201).json(auction);
  } catch (err) {
    console.error("Failed to create auction:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

auctionsRouter.get("/:id", async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (!z.uuid().safeParse(id).success) {
    return res.status(400).json({ error: "INVALID_ID" });
  }

  const auction = await prisma.auction.findUnique({
    where: { id },
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
      createdAt: true,
    },
  });

  if (!auction) {
    return res.status(404).json({ error: "NOT_FOUND" });
  }

  return res.json(auction);
});
