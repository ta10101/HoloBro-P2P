import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";
import App from "./App";
import { normalizeAppWebsocketUrl } from "./holochainConnect";

/** Push Vite env into localStorage so HolochainProvider uses them without manual Setup (dev / .env.local). */
function applyHolochainEnvToLocalStorage(): void {
  try {
    const w = (import.meta.env.VITE_HC_APP_WS as string | undefined)?.trim();
    const t = (import.meta.env.VITE_HC_APP_TOKEN as string | undefined)?.trim();
    if (w) localStorage.setItem("holobro-hc-ws", normalizeAppWebsocketUrl(w));
    if (t) localStorage.setItem("holobro-hc-token", t);
  } catch {
    /* storage blocked */
  }
}
applyHolochainEnvToLocalStorage();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
