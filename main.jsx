import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import DoScrollApp from "./doscroll.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DoScrollApp />
  </StrictMode>
);
