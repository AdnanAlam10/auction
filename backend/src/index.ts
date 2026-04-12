import express from "express";
import { auctionsRouter } from "./routes/auctions.js";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auctions", auctionsRouter);

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`backend listening on :${PORT}`);
});
