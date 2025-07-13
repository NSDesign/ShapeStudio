import React from 'react';
import ShapeEditor from '@/components/ShapeEditor';
import { AuthInterface } from '@/components/AuthInterface';

export default function Home() {
  const [showAuthInterface, setShowAuthInterface] = React.useState(false);

  return (
    <div className="h-screen w-screen bg-slate-900 text-slate-50 overflow-hidden">
      {showAuthInterface ? (
        <div className="p-4">
          <button 
            onClick={() => setShowAuthInterface(false)}
            className="mb-4 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600"
          >
            ← Back to Shape Editor
          </button>
          <AuthInterface />
        </div>
      ) : (
        <div className="relative h-full">
          <button 
            onClick={() => setShowAuthInterface(true)}
            className="absolute top-4 right-4 z-50 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            User Management
          </button>
          <ShapeEditor />
        </div>
      )}
    </div>
  );
}