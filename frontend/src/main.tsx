import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import type { AuctionId } from "@shared/types";

const demo = "abc" as AuctionId;
console.log("frontend sees", demo);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
