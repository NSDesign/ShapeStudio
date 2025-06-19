import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress harmless ResizeObserver errors
window.addEventListener('error', (e) => {
  if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
    e.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
