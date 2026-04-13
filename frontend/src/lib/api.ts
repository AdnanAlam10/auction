const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3001";

export interface CreateAuctionRequest {
  title: string;
  description?: string;
  imageUrl?: string;
  startingBid: number;
  minIncrement: number;
  durationSeconds: number;
}

export interface CreateAuctionResponse {
  id: string;
  hostToken: string;
}

export async function createAuction(
  input: CreateAuctionRequest,
): Promise<CreateAuctionResponse> {
  const res = await fetch(`${BACKEND_URL}/api/auctions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed: ${res.status}`);
  }

  return res.json();
}
