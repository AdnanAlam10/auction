const MIN_BID_INTERVAL_MS = 500;

const lastBidTime = new Map<string, number>();

export function canBid(socketId: string): boolean {
  const now = Date.now();
  const last = lastBidTime.get(socketId);

  if (last && now - last < MIN_BID_INTERVAL_MS) {
    return false;
  }

  lastBidTime.set(socketId, now);
  return true;
}

export function clearRateLimit(socketId: string): void {
  lastBidTime.delete(socketId);
}
