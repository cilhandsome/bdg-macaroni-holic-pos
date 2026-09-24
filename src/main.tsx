import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

class RootErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : "Terjadi kesalahan runtime." };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Macaroni Holic POS runtime error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="runtime-error-screen">
          <div className="runtime-error-card">
            <div className="runtime-error-mark">!</div>
            <h1>Aplikasi mengalami error</h1>
            <p>{this.state.error}</p>
            <button type="button" onClick={() => window.location.reload()}>Muat Ulang</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

async function clearOldLocalRuntime() {
  if (location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

window.addEventListener("error", (event) => console.error("Window error", event.error || event.message));
window.addEventListener("unhandledrejection", (event) => console.error("Unhandled promise rejection", event.reason));

void (async () => {
  await clearOldLocalRuntime();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </StrictMode>,
  );
})();
