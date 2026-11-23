import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

if (
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  (window.isSecureContext ||
    ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname))
) {
  const registerChatNotificationServiceWorker = () => {
    void navigator.serviceWorker
      .register("/chat-notifications-sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch((error) => {
        console.warn("[Chat notifications] Service worker registration failed", error);
      });
  };

  if (document.readyState === "complete") registerChatNotificationServiceWorker();
  else window.addEventListener("load", registerChatNotificationServiceWorker, { once: true });
}

// StrictMode intentionally disabled so that effects (and the API calls they
// trigger) run exactly once in development, matching production behaviour.
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
