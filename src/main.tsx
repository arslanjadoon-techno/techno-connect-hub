import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// StrictMode intentionally disabled so that effects (and the API calls they
// trigger) run exactly once in development, matching production behaviour.
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
