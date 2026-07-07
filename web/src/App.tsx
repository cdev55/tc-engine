import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { PlayerPage } from "./pages/PlayerPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/watch/:jobId" element={<PlayerPage />} />
      </Routes>
    </BrowserRouter>
  );
}
