const PARTICIPANT_ID_KEY = "auction:participantId";
const DISPLAY_NAME_KEY = "auction:displayName";

export function getParticipantId(): string {
  const existingId = localStorage.getItem(PARTICIPANT_ID_KEY);

  if (existingId) return existingId;

  const freshId = crypto.randomUUID();
  localStorage.setItem(PARTICIPANT_ID_KEY, freshId);
  return freshId;
}

export function getDisplayName(): string | null {
  return localStorage.getItem(DISPLAY_NAME_KEY);
}

export function setDisplayName(name: string): void {
  const trimmedName = name.trim();

  if (trimmedName.length === 0 || trimmedName.length > 50) {
    throw new Error("Display name must be between 1 and 50 characters.");
  }

  localStorage.setItem(DISPLAY_NAME_KEY, trimmedName);
}
