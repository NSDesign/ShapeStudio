import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";

function App() {
  console.log("App component rendering - basic test");
  
  return (
    <div className="h-screen w-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="text-2xl">Shape Editor - Basic Test</div>
    </div>
  );
}

export default App;
