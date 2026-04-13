import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAuction } from "../lib/api";

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
    <div className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-6">Create an auction</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Vintage typewriter"
            maxLength={200}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Description <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={5000}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Image URL <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Starting bid ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              value={startingBidDollars}
              onChange={(e) => setStartingBidDollars(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              max="1440"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim()}
          className="w-full px-4 py-2 bg-black text-white rounded disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create auction"}
        </button>
      </div>
    </div>
  );
}
