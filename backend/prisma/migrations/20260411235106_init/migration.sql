-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('pending', 'active', 'ended');

-- CreateTable
CREATE TABLE "auctions" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "starting_bid" INTEGER NOT NULL,
    "current_bid" INTEGER NOT NULL,
    "current_bidder" VARCHAR(50),
    "current_bidder_id" UUID,
    "min_increment" INTEGER NOT NULL DEFAULT 100,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'pending',
    "host_token" UUID NOT NULL,
    "winner_name" VARCHAR(50),
    "winner_amount" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" UUID NOT NULL,
    "auction_id" UUID NOT NULL,
    "bidder_name" VARCHAR(50) NOT NULL,
    "bidder_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auctions_host_token_key" ON "auctions"("host_token");

-- CreateIndex
CREATE INDEX "bids_auction_id_created_at_idx" ON "bids"("auction_id", "created_at");

-- CreateIndex
CREATE INDEX "bids_bidder_id_idx" ON "bids"("bidder_id");

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
