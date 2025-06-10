import TestApp from "./TestApp";
import ShapeEditor from "./components/ShapeEditor";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

function App() {
  // Temporarily use TestApp to debug the white screen issue
  const useTestApp = true;
  
  if (useTestApp) {
    return <TestApp />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="h-screen w-screen bg-slate-900 text-slate-50 overflow-hidden">
          <ShapeEditor />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
