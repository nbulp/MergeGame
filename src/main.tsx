import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

import { polyfill } from "mobile-drag-drop";
import "mobile-drag-drop/default.css"; // Optional styling for the drag ghost

polyfill({
  dragImageCenterOnTouch: true,
  holdToDrag: 0, // FIX 1: Removes the 500ms delay so drag is instant
});

// A known hack for Safari/Android to prevent the page from twitching during drags
window.addEventListener("touchmove", () => {}, { passive: false });
// -------------------------

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
