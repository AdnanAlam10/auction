# House of Lots

A real-time live auction app. Bid against other people in the same room, watch the clock, and trigger anti-snipe extensions in the final 30 seconds.

**Live demo:** [auction-frontend-a4j5.onrender.com](https://auction-frontend-a4j5.onrender.com)

> Open the link in two browser windows (or share with a friend) to see the live bidding in action. One window creates the lot, the other joins as a bidder.

---

## Screenshots

![Create a lot](https://github.com/user-attachments/assets/cd5ad29c-2cb3-4a33-8b8b-cd24dfd164dc)

![Auction room](https://github.com/user-attachments/assets/5bef3ca4-b42f-44bd-80b4-d33d657a8ecc)

---

## How it works (the user flow)

1. **List a lot.** Anyone can open the home page, fill out a short form (title, optional description and image URL, opening bid, duration), and click "Open the floor." That submits a `POST /api/auctions`, the server inserts the auction with `status = active`, schedules its end timer, and returns a host token stored in the creator's `localStorage`.
2. **Enter the room.** Visiting `/auction/:id` joins a Socket.io room scoped to that auction. First-time visitors are prompted to sign the ledger with a display name, which is persisted in `localStorage` alongside a stable per-browser `participantId` (a UUID generated client-side).
3. **Watch and bid.** The room receives the full auction state plus the last ten bids on join. From there it's pure socket events: every new bid, every participant joining or leaving, and every timer extension is broadcast to the room in real time.
4. **Final seconds.** As the countdown crosses 30 seconds the whole page warms to amber, and at 10 seconds it shifts to a vermilion red and the clock starts pulsing. Any bid during that final window pushes the deadline out by another 30 seconds and flashes a "floor extended" banner across the room.
5. **The hammer falls.** When the timer hits zero the server runs one final locked check, marks the auction `ended`, and broadcasts an `auction_ended` event with the winner's name and the hammer price. New bid attempts after that are rejected.

## Features

### Bidding

- Server-enforced minimum increment (default $1.00). Bids below `currentBid + minIncrement` are rejected with `BID_TOO_LOW`.
- Self-bid protection. The current high bidder can't bid against themselves, identified by the stable `participantId`, not just the display name. This survives renaming and reload.
- Per-socket rate limit of one bid every 500ms. Spamming the bid button rejects with `RATE_LIMITED` instead of overwhelming the database.
- Money handled as integer cents end to end. No floating point near a price.
- Quick-bump buttons (`+$1`, `+$5`) on the bid form so you don't have to retype.

### Real-time

- Socket.io rooms scoped per auction. A bid in lot A never leaks to clients watching lot B.
- Six typed server-to-client events: `auction_state`, `new_bid`, `bid_rejected`, `participant_count`, `timer_extended`, `auction_ended`.
- Live participant count, updated on join, leave, and disconnect (with a small debounce so the room adapter has time to settle before the count is read).
- Automatic reconnection with retry-forever backoff on the client.

### Anti-snipe extension

- A bid placed within the last 30 seconds pushes `endsAt` out by another 30 seconds.
- Extension is computed and persisted inside the same Postgres transaction as the bid itself, so a rejected or rolled-back bid never extends the clock.
- After commit, the server emits `timer_extended` to the room and reschedules its in-memory `setTimeout`. The frontend shows a full-screen flash to make the extension legible.

### Concurrency safety

- Bids run inside a Prisma transaction that takes a `SELECT … FOR UPDATE` row lock on the target auction. Competing transactions block on the lock and only proceed after the holder commits, so every bid sees fresh state.
- A vitest integration test fires 20 simultaneous bids at the same minimum price against a real Postgres database. The assertion: exactly one bid wins, the other nineteen are rejected with `BID_TOO_LOW`, and the `bids` table contains exactly one row.

### Server-authoritative time

- The clock the user sees is cosmetic. The authoritative `endsAt` lives in the database, and is checked again inside the bid transaction. A bid that arrives 200ms after the deadline is rejected even if the client's countdown still showed time.
- The in-memory auction timer is just a notification mechanism. Even if a setTimeout fires late (loaded server, GC pause), the row-locked check inside `endAuction` will either close the auction correctly or reschedule itself if the deadline has moved.

### Boot recovery

- Auction end-of-life is driven by an in-memory `Map<auctionId, NodeJS.Timeout>`. When the server starts, `recoverTimers()` queries every auction with `status = active` and reschedules a `setTimeout` for each one. A redeploy or crash mid-auction doesn't drop the hammer.

### Validation and error contract

- HTTP and socket payloads are both parsed with Zod schemas at the entry point. Bad input returns a typed reject reason rather than a 500.
- Nine distinct rejection reasons (`BID_TOO_LOW`, `SELF_BID`, `AUCTION_NOT_ACTIVE`, `AUCTION_ENDED`, `RATE_LIMITED`, `INVALID_AMOUNT`, `INVALID_INPUT`, `NOT_IN_ROOM`, `INTERNAL_ERROR`) shared as a typed union between client and server, so the bid form can render a human-readable message for each one without duplicating the list.

### Frontend

- Editorial auction-house aesthetic. Cream paper background, Fraunces italic display type, JetBrains Mono for prices and timers, hand-set "ledger" of recent bids numbered `№001`, `№002`, etc.
- Urgency-driven theme. The countdown component reports its urgency (`normal`, `warning`, `critical`) up to the page; the page sets a `data-urgency` attribute on `<body>` which drives the background colour via CSS variables. The whole room warms as time runs out.
- Tabular numerals on every price and timer so digits don't shift width as they change.
- A subtle SVG grain texture across the page so the paper background doesn't feel flat.

## Architecture

```
┌──────────────┐  WS  ┌──────────────────────────┐  SQL  ┌────────────┐
│  React + TS  │ ───▶ │  Express + Socket.io     │ ────▶ │  Postgres  │
│  Vite        │      │  ─────────────────────── │       │  (Neon)    │
│  Tailwind    │      │  bidService              │       └────────────┘
└──────────────┘      │   └─ SELECT FOR UPDATE   │
                      │  auctionTimers (in-mem)  │
                      │   └─ recovered on boot   │
                      │  socket handlers         │
                      │   └─ join / bid / leave  │
                      └──────────────────────────┘
```

**Data model.** Two tables (`auctions`, `bids`). Money is stored as integer cents. Anti-snipe pushes `auctions.ends_at` directly.

**Event contract.** Typed `ServerToClientEvents` / `ClientToServerEvents` shared between server and client (`shared/socketEvents.ts`) so the wire format is checked at compile time on both ends.

**Rate limiting.** One bid per socket per 500ms, in-memory.

## Tech stack

| Layer      | Tools                                                 |
| ---------- | ----------------------------------------------------- |
| Frontend   | React 19, Vite, Tailwind CSS, Socket.io client        |
| Backend    | Node 20, Express 5, Socket.io, Prisma                 |
| Database   | Postgres (Neon in prod, Docker locally)               |
| Validation | Zod (HTTP + socket payloads)                          |
| Testing    | Vitest, real Postgres test DB                         |
| Deployment | Render (backend) · Render Static (frontend) · Neon DB |

## Running locally

```bash
# 1. Start Postgres
docker-compose up -d

# 2. Backend
cd backend
cp .env.example .env             # DATABASE_URL points at local docker
npm install
npx prisma migrate deploy
npm run dev                      # :3001

# 3. Frontend
cd ../frontend
npm install
npm run dev                      # :5173
```

Open <http://localhost:5173>, create an auction, then open a second browser to bid against yourself.

### Tests

The bid service has an integration test suite that spins up a separate Postgres DB and runs real concurrent transactions:

```bash
cd backend
docker-compose up -d             # if not already running
npm run db:push:test
npm test
```

The headline test fires 20 simultaneous bids at the same minimum and asserts exactly one wins.

## Project layout

```
auction/
├─ backend/
│  ├─ prisma/             schema + migrations
│  └─ src/
│     ├─ routes/          HTTP (create auction, fetch auction)
│     ├─ sockets/         socket.io handlers + validation + rate limit
│     ├─ services/        bidService, auctionTimers, bidError
│     └─ lib/             prisma client
├─ frontend/
│  └─ src/
│     ├─ pages/           CreateAuction, AuctionRoom
│     ├─ components/      Countdown, BidForm, RecentBids, …
│     ├─ hooks/           useAuctionSocket
│     └─ lib/             socket, api, participant, format
└─ shared/                socketEvents.ts (event contract)
```

## Things I'd add next

- Persisted user accounts (right now identity is a UUID in `localStorage`)
- Image uploads instead of pasted URLs
- Auction archive page + winner notifications
- Proxy bidding (set a max, let the server bid incrementally on your behalf)
