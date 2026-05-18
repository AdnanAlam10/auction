import { useState } from "react";
import { setDisplayName } from "../lib/participant";

interface NamePromptProps {
  onSubmit: (name: string) => void;
}

export function NamePrompt({ onSubmit }: NamePromptProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    try {
      setDisplayName(name);
      onSubmit(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid name");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-xl intro">
        <div className="flex items-center justify-between mb-12">
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
            House of Lots · est. MMXXVI
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink-muted">
            Floor admission
          </span>
        </div>

        <h1 className="font-display italic text-7xl leading-[0.95] mb-2 tracking-tight">
          Sign the
          <br />
          ledger.
        </h1>

        <p className="font-display text-lg text-ink-muted max-w-md mb-10">
          Choose a name for the floor. It will appear next to every bid you
          place. No accounts, no email — just the name we'll call.
        </p>

        <div className="rule mb-8" />

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink-muted block mb-3">
            Your name on the floor
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="e.g. A. Whitford"
            autoFocus
            maxLength={50}
            className="w-full bg-transparent border-0 border-b-2 border-ink py-3 font-display text-3xl focus:outline-none focus:border-vermillion transition-colors placeholder:text-ink-muted/40 placeholder:italic"
          />
        </label>

        {error && (
          <p className="mt-3 font-display italic text-vermillion">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="mt-8 w-full bg-ink text-paper py-4 font-mono uppercase tracking-widest2 text-sm hover:bg-vermillion transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          <span>Enter the room</span>
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
