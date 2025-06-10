import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add global error handling
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
