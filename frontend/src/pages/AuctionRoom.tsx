import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuctionSocket } from "../hooks/useAuctionSocket";
import { getDisplayName, getParticipantId } from "../lib/participant";
import { NamePrompt } from "../components/NamePrompt";
import { BidForm } from "../components/BidForm";
import { RecentBids } from "../components/RecentBids";
import { Countdown } from "../components/Countdown";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { formatCurrency } from "../lib/format";

function shortLot(id: string): string {
  return id.replace(/-/g, "").slice(0, 4).toUpperCase();
}

export function AuctionRoom() {
  const { id } = useParams<{ id: string }>();
  const [displayName, setDisplayNameState] = useState<string | null>(() =>
    getDisplayName(),
  );

  if (!id) {
    return (
      <div className="max-w-2xl mx-auto p-8 font-display italic text-vermillion text-2xl">
        Missing lot reference.
      </div>
    );
  }

  if (!displayName) {
    return <NamePrompt onSubmit={setDisplayNameState} />;
  }

  return <AuctionRoomContent auctionId={id} displayName={displayName} />;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function AuctionRoomContent({
  auctionId,
  displayName,
}: {
  auctionId: string;
  displayName: string;
}) {
  const { auction, status, error, rejection, extendedTick, placeBid } =
    useAuctionSocket({ auctionId, displayName });
  const now = useClock();

  const [urgency, setUrgency] = useState<"normal" | "warning" | "critical">(
    "normal",
  );

  const [extensionFlash, setExtensionFlash] = useState(0);
  useEffect(() => {
    if (extendedTick === 0) return;
    setExtensionFlash((n) => n + 1);
    const t = setTimeout(() => setExtensionFlash(0), 1100);
    return () => clearTimeout(t);
  }, [extendedTick]);

  useEffect(() => {
    if (!auction || auction.status !== "active") {
      document.body.dataset.urgency = "normal";
      return;
    }
    document.body.dataset.urgency = urgency;
    return () => {
      document.body.dataset.urgency = "normal";
    };
  }, [urgency, auction]);

  const isHost = useMemo(() => {
    if (!auction) return false;
    return Boolean(localStorage.getItem(`auction:${auction.id}:hostToken`));
  }, [auction]);

  const onUrgencyChange = useCallback(
    (u: "normal" | "warning" | "critical") => setUrgency(u),
    [],
  );

  const onCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  if (error && !auction) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-vermillion">
            Line · severed
          </span>
          <p className="font-display italic text-3xl mt-3">{error}</p>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
            Loading the floor…
          </span>
          <div className="mt-4 font-display italic text-3xl text-ink-muted">
            …
          </div>
        </div>
      </div>
    );
  }

  const isEnded = auction.status === "ended";
  const participantId = getParticipantId();
  const lotCode = shortLot(auction.id);

  return (
    <div className="min-h-screen">
      <ConnectionStatus status={status} />

      {extensionFlash > 0 && (
        <div
          key={extensionFlash}
          className="fixed inset-0 z-40 pointer-events-none animate-extended-flash bg-vermillion/35 flex items-start justify-center pt-32"
        >
          <div className="bg-ink text-paper px-8 py-5 border-2 border-paper shadow-[8px_8px_0_0_rgba(0,0,0,0.4)]">
            <div className="font-mono text-[10px] uppercase tracking-widest2 opacity-70">
              Late-bid clause invoked
            </div>
            <div className="font-display italic text-5xl mt-1">
              Floor extended <span className="tabular">+30s</span>
            </div>
          </div>
        </div>
      )}

      <header className="border-b-2 border-ink">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
          <div className="flex items-baseline gap-4">
            <span className="font-display italic text-2xl">
              House of Lots
            </span>
            <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
              · lot {lotCode}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isEnded ? "bg-ink-muted" : "bg-vermillion animate-live-pulse"
                }`}
              />
              <span className="font-mono text-[10px] uppercase tracking-widest2">
                {isEnded ? "Closed" : "Live"}
              </span>
            </span>
            <span className="hidden md:inline font-mono text-[10px] uppercase tracking-widest2 text-ink-muted tabular">
              {now.toLocaleTimeString("en-US", { hour12: false })}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
              {auction.participantCount} on the floor
            </span>
          </div>
        </div>
      </header>

      <section className="border-b-2 border-ink">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-12 gap-8 intro">
          <div className="col-span-12 md:col-span-7">
            <div className="flex items-baseline gap-4 mb-4">
              <span className="font-mono text-xs uppercase tracking-widest2 text-vermillion">
                Lot · {lotCode}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
                {isEnded ? "Sold / Passed" : "Under the hammer"}
              </span>
            </div>
            <h1 className="font-display italic text-[3.5rem] md:text-7xl leading-[0.92] tracking-tight">
              {auction.title}
            </h1>
            {auction.description && (
              <p className="mt-6 font-display text-lg text-ink-soft max-w-xl leading-relaxed">
                {auction.description}
              </p>
            )}

            {isHost && (
              <div className="mt-8 inline-flex items-center gap-3 border-2 border-ink px-3 py-2">
                <span className="font-mono text-[10px] uppercase tracking-widest2 bg-ink text-paper px-2 py-1">
                  Auctioneer
                </span>
                <span className="font-mono text-xs text-ink-muted">
                  You hold the host key for this lot.
                </span>
                <button
                  onClick={onCopyLink}
                  className="font-mono text-[10px] uppercase tracking-widest2 underline underline-offset-4 hover:text-vermillion"
                >
                  Copy link
                </button>
              </div>
            )}
          </div>

          <div className="col-span-12 md:col-span-5">
            {auction.imageUrl ? (
              <div className="border-2 border-ink p-2 bg-paper-2">
                <img
                  src={auction.imageUrl}
                  alt={auction.title}
                  className="w-full aspect-[4/3] object-cover"
                />
                <div className="flex items-center justify-between px-1 pt-2 font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
                  <span>Plate · {lotCode}</span>
                  <span>From the consignor's collection</span>
                </div>
              </div>
            ) : (
              <div className="border-2 border-ink aspect-[4/3] flex items-center justify-center bg-paper-2">
                <span className="font-display italic text-3xl text-ink-muted">
                  No plate
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-ink">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-7">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
                {isEnded ? "Hammer price" : "Standing bid"}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
                opened at {formatCurrency(auction.startingBid)} · increment{" "}
                {formatCurrency(auction.minIncrement)}
              </span>
            </div>

            <div
              key={auction.currentBid}
              className="font-display text-[6.5rem] md:text-[9rem] leading-[0.88] tracking-tight tabular animate-bid-pop"
            >
              {formatCurrency(auction.currentBid)}
            </div>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
                Held by
              </span>
              <span className="font-display italic text-2xl">
                {auction.currentBidder ?? "— the room —"}
              </span>
            </div>
          </div>

          <div className="col-span-12 md:col-span-5 md:border-l-2 md:border-ink md:pl-8">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
                Time on the clock
              </span>
              <span
                className={`font-mono text-[10px] uppercase tracking-widest2 ${
                  urgency === "critical"
                    ? "text-vermillion"
                    : urgency === "warning"
                      ? "text-vermillion-deep"
                      : "text-ink-muted"
                }`}
              >
                {urgency === "critical"
                  ? "Final seconds"
                  : urgency === "warning"
                    ? "Closing window"
                    : "Open"}
              </span>
            </div>

            {!isEnded ? (
              <Countdown
                endsAt={auction.endsAt}
                onUrgencyChange={onUrgencyChange}
              />
            ) : (
              <div className="font-display italic text-5xl text-ink-muted">
                — the hammer has fallen —
              </div>
            )}

            <p className="mt-6 font-display text-base text-ink-muted leading-snug max-w-sm">
              A bid placed in the final 30 seconds resets the clock by another
              thirty. Snipe-resistant by design.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-7">
            {isEnded ? (
              <EndedBanner
                winnerName={auction.winnerName}
                winnerAmount={auction.winnerAmount}
              />
            ) : (
              <BidForm
                currentBid={auction.currentBid}
                minIncrement={auction.minIncrement}
                currentBidderId={auction.currentBidderId}
                participantId={participantId}
                status={status}
                rejection={rejection}
                onBid={placeBid}
              />
            )}

            <p className="mt-4 font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
              Signed onto the floor as{" "}
              <span className="font-display italic normal-case tracking-normal text-ink text-sm">
                {displayName}
              </span>
            </p>
          </div>

          <div className="col-span-12 md:col-span-5">
            <RecentBids bids={auction.recentBids} />
          </div>
        </div>
      </section>

      <footer className="border-t-2 border-ink mt-8">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
          <span>House of Lots · floor record</span>
          <span>Lot {lotCode}</span>
          <span>Server-authoritative · row-locked · anti-snipe ready</span>
        </div>
      </footer>
    </div>
  );
}

function EndedBanner({
  winnerName,
  winnerAmount,
}: {
  winnerName: string | null;
  winnerAmount: number | null;
}) {
  return (
    <div className="border-2 border-ink bg-paper-2">
      <div className="px-4 py-2 bg-ink text-paper flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest2">
          Sold record
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest2 opacity-60">
          Hammer down
        </span>
      </div>
      <div className="p-6">
        {winnerName ? (
          <>
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
              Knocked down to
            </p>
            <p className="font-display italic text-5xl mt-1">{winnerName}</p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
              at
            </p>
            <p className="font-display text-6xl tabular tracking-tight">
              {winnerAmount !== null ? formatCurrency(winnerAmount) : "—"}
            </p>
          </>
        ) : (
          <p className="font-display italic text-4xl">
            Passed — no bids on the floor.
          </p>
        )}
      </div>
    </div>
  );
}
