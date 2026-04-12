import { prisma } from "./lib/prisma.js";

async function main() {
  const count = await prisma.auction.count();
  console.log(`hello from backend — ${count} auctions in db`);
  await prisma.$disconnect();
}

main();
