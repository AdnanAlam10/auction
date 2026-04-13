import { z } from "zod";

const uuidSchema = z.string().uuid();

export const joinAuctionSchema = z.object({
  auctionId: uuidSchema,
  displayName: z.string().trim().min(1).max(50),
  participantId: uuidSchema,
});

export const leaveAuctionSchema = z.object({
  auctionId: uuidSchema,
});
