import { z } from "zod";

export const createAuctionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  imageUrl: z.url().max(2000).optional(),
  startingBid: z.number().int().positive().min(100),
  minIncrement: z.number().int().positive().min(1).default(100),
  durationSeconds: z.number().int().positive().min(30).max(86_400),
});

export type CreateAuctionInput = z.infer<typeof createAuctionSchema>;
