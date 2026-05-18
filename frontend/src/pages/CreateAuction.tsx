import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAuction } from "../lib/api";

const DURATION_PRESETS = [
  { label: "1 min", value: "1" },
  { label: "2 min", value: "2" },
  { label: "5 min", value: "5" },
  { label: "10 min", value: "10" },
  { label: "30 min", value: "30" },
];

export function CreateAuction() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [startingBidDollars, setStartingBidDollars] = useState("1.00");
  const [durationMinutes, setDurationMinutes] = useState("5");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    const startingBidCents = Math.round(parseFloat(startingBidDollars) * 100);
    const durationSeconds = Math.round(parseFloat(durationMinutes) * 60);

    if (!Number.isFinite(startingBidCents) || startingBidCents < 100) {
      setError("Starting bid must be at least $1.00");
      return;
    }
    if (!Number.isFinite(durationSeconds) || durationSeconds < 30) {
      setError("Duration must be at least 30 seconds");
      return;
    }
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      const { id, hostToken } = await createAuction({
        title: title.trim(),
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        startingBid: startingBidCents,
        minIncrement: 100,
        durationSeconds,
      });

      localStorage.setItem(`auction:${id}:hostToken`, hostToken);
      navigate(`/auction/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create auction");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b-2 border-ink">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="font-display italic text-2xl">House of Lots</span>
            <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
              · auctioneer's desk
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
            New consignment
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-12 gap-8 intro">
          <div className="col-span-12 md:col-span-7">
            <span className="font-mono text-xs uppercase tracking-widest2 text-vermillion">
              Folio №— · draft
            </span>
            <h1 className="mt-4 font-display italic text-7xl md:text-[6.5rem] leading-[0.92] tracking-tight">
              Catalogue
              <br />a new lot.
            </h1>
            <p className="mt-6 font-display text-lg text-ink-muted max-w-md">
              Describe the item, set a starting figure, and choose the length of
              the sale. The hammer falls when the clock runs out, though a late
              bid will extend the floor.
            </p>
          </div>

          <aside className="col-span-12 md:col-span-5 md:pl-8 md:border-l-2 md:border-ink">
            <p className="font-mono text-[11px] uppercase tracking-widest2 text-ink-muted mb-3">
              Notes from the rostrum
            </p>
            <ul className="space-y-3 font-display text-base">
              <li className="flex gap-3">
                <span className="font-mono text-vermillion mt-1">i.</span>
                <span>
                  Bids in the final 30 seconds push the close out by another
                  thirty.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-vermillion mt-1">ii.</span>
                <span>Once the gavel falls, no further bids are accepted.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-vermillion mt-1">iii.</span>
                <span>
                  The bid token in your browser is your host key so guard it.
                </span>
              </li>
            </ul>
          </aside>
        </div>

        <div className="rule mt-16 mb-12" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="grid grid-cols-12 gap-8"
        >
          <NumberedField n="01" label="Title of the lot" hint="Required">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Vintage Hasselblad 500C/M"
              maxLength={200}
              className="w-full bg-transparent border-0 border-b-2 border-ink py-3 font-display text-3xl focus:outline-none focus:border-vermillion transition-colors placeholder:text-ink-muted/40 placeholder:italic"
            />
          </NumberedField>

          <NumberedField
            n="02"
            label="Provenance & description"
            hint="Optional"
          >
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={5000}
              placeholder="Condition, history, any marks worth mentioning…"
              className="w-full bg-transparent border-2 border-ink p-4 font-display text-lg focus:outline-none focus:border-vermillion transition-colors placeholder:text-ink-muted/40 placeholder:italic resize-none"
            />
          </NumberedField>

          <NumberedField n="03" label="Image URL" hint="Optional">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className="w-full bg-transparent border-0 border-b-2 border-ink py-3 font-mono text-base focus:outline-none focus:border-vermillion transition-colors placeholder:text-ink-muted/40"
            />
          </NumberedField>

          <NumberedField n="04" label="Opening bid" hint="USD · minimum $1.00">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-5xl text-ink-muted">$</span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={startingBidDollars}
                onChange={(e) => setStartingBidDollars(e.target.value)}
                className="flex-1 bg-transparent border-0 border-b-2 border-ink py-3 font-display text-5xl tabular tracking-tight focus:outline-none focus:border-vermillion transition-colors"
              />
            </div>
          </NumberedField>

          <NumberedField n="05" label="Length of the sale" hint="Minutes">
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setDurationMinutes(p.value)}
                  className={`px-4 py-2 border-2 border-ink font-mono text-xs uppercase tracking-widest2 transition-colors ${
                    durationMinutes === p.value
                      ? "bg-ink text-paper"
                      : "hover:bg-ink hover:text-paper"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <input
                type="number"
                step="1"
                min="1"
                max="1440"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-24 bg-transparent border-2 border-ink px-3 py-2 font-mono text-sm tabular focus:outline-none focus:border-vermillion"
              />
            </div>
          </NumberedField>

          <div className="col-span-12 md:col-start-3 md:col-span-10">
            {error && (
              <p className="mb-4 font-display italic text-vermillion">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="w-full bg-ink text-paper py-5 font-mono uppercase tracking-widest2 text-sm hover:bg-vermillion transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {submitting ? (
                <span>Going under the hammer…</span>
              ) : (
                <>
                  <span>Open the floor</span>
                  <span aria-hidden>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      <footer className="border-t-2 border-ink mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
          <span>© House of Lots</span>
          <span>Server-authoritative · row-locked · anti-snipe ready</span>
        </div>
      </footer>
    </div>
  );
}

function NumberedField({
  n,
  label,
  hint,
  children,
}: {
  n: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="col-span-12 grid grid-cols-12 gap-6 items-start">
      <div className="col-span-12 md:col-span-2 md:text-right md:pt-2">
        <div className="font-mono text-[10px] uppercase tracking-widest2 text-vermillion">
          {n}
        </div>
        <div className="font-mono text-[11px] uppercase tracking-widest2 text-ink mt-1">
          {label}
        </div>
        {hint && (
          <div className="font-mono text-[10px] text-ink-muted mt-0.5 normal-case tracking-normal">
            {hint}
          </div>
        )}
      </div>
      <div className="col-span-12 md:col-span-10">{children}</div>
    </div>
  );
}
