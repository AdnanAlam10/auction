import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuctionRoom } from "./pages/AuctionRoom";
import { CreateAuction } from "./pages/CreateAuction";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreateAuction />} />
        <Route path="/auction/:id" element={<AuctionRoom />} />
      </Routes>
    </BrowserRouter>
  );
}
