import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { placeBid } from "../bidService.js";

const testPrisma = new PrismaClient({
  datasources: {
    db: { url: "postgresql://auction:auction@localhost:5434/auction_test" },
  },
});

let auctionId: string;

beforeEach(async () => {
  await testPrisma.bid.deleteMany();
  await testPrisma.auction.deleteMany();

  const auction = await testPrisma.auction.create({
    data: {
      title: "Test Auction",
      startingBid: 1000,
      currentBid: 1000,
      minIncrement: 100,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 300_000),
      status: "active",
    },
  });

  auctionId = auction.id;
});

describe("placeBid", () => {
  it("accepts a valid bid", async () => {
    const result = await placeBid(
      {
        auctionId,
        bidderId: crypto.randomUUID(),
        bidderName: "Alice",
        amount: 1100,
      },
      testPrisma,
    );

    expect(result.currentBid).toBe(1100);
    expect(result.currentBidder).toBe("Alice");
  });

  it("rejects a bid below minimum", async () => {
    await expect(
      placeBid(
        {
          auctionId,
          bidderId: crypto.randomUUID(),
          bidderName: "Alice",
          amount: 1050,
        },
        testPrisma,
      ),
    ).rejects.toThrow("BID_TOO_LOW");
  });

  it("rejects a self-bid", async () => {
    const bidderId = crypto.randomUUID();

    await placeBid(
      {
        auctionId,
        bidderId,
        bidderName: "Alice",
        amount: 1100,
      },
      testPrisma,
    );

    await expect(
      placeBid(
        {
          auctionId,
          bidderId,
          bidderName: "Alice",
          amount: 1200,
        },
        testPrisma,
      ),
    ).rejects.toThrow("SELF_BID");
  });

  it("rejects bids on ended auctions", async () => {
    await testPrisma.auction.update({
      where: { id: auctionId },
      data: { status: "ended" },
    });

    await expect(
      placeBid(
        {
          auctionId,
          bidderId: crypto.randomUUID(),
          bidderName: "Alice",
          amount: 1100,
        },
        testPrisma,
      ),
    ).rejects.toThrow("AUCTION_NOT_ACTIVE");
  });

  it("rejects bids past ends_at", async () => {
    await testPrisma.auction.update({
      where: { id: auctionId },
      data: { endsAt: new Date(Date.now() - 1000) },
    });

    await expect(
      placeBid(
        {
          auctionId,
          bidderId: crypto.randomUUID(),
          bidderName: "Alice",
          amount: 1100,
        },
        testPrisma,
      ),
    ).rejects.toThrow("AUCTION_ENDED");
  });

  it("triggers anti-sniping when bid is in final 30 seconds", async () => {
    await testPrisma.auction.update({
      where: { id: auctionId },
      data: { endsAt: new Date(Date.now() + 10_000) },
    });

    const result = await placeBid(
      {
        auctionId,
        bidderId: crypto.randomUUID(),
        bidderName: "Alice",
        amount: 1100,
      },
      testPrisma,
    );

    expect(result.newEndsAt).not.toBeNull();
    const extended = new Date(result.newEndsAt!).getTime();
    expect(extended).toBeGreaterThan(Date.now() + 25_000);
  });

  it("exactly one bid wins when 20 concurrent bids race", async () => {
    const bids = Array.from({ length: 20 }, (_, i) =>
      placeBid(
        {
          auctionId,
          bidderId: crypto.randomUUID(),
          bidderName: `Bidder${i}`,
          amount: 1100,
        },
        testPrisma,
      ).then(
        (result) => ({ status: "won" as const, result }),
        (err) => ({ status: "rejected" as const, reason: err.message }),
      ),
    );

    const results = await Promise.all(bids);

    const winners = results.filter((r) => r.status === "won");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(winners).toHaveLength(1);
    expect(rejected).toHaveLength(19);
    expect(rejected.every((r) => r.reason === "BID_TOO_LOW")).toBe(true);

    const auction = await testPrisma.auction.findUniqueOrThrow({
      where: { id: auctionId },
    });
    expect(auction.currentBid).toBe(1100);

    const bidCount = await testPrisma.bid.count({ where: { auctionId } });
    expect(bidCount).toBe(1);
  });
});
