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
    <div className="max-w-md mx-auto mt-24 p-6 border rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Enter a display name</h2>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="e.g. Alice"
        className="w-full px-3 py-2 border rounded"
        autoFocus
        maxLength={50}
      />
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={!name.trim()}
        className="mt-4 px-4 py-2 bg-black text-white rounded disabled:opacity-50"
      >
        Join auction
      </button>
    </div>
  );
}
