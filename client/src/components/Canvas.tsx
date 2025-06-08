import { useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Shape, ShapeGroupClass } from '../lib/shapes';
import { CanvasSettings } from '../lib/shapeTypes';

interface CanvasProps {
  shapes: Shape[];
  groups: ShapeGroupClass[];
  canvasSettings: CanvasSettings;
  selectedCount: number;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export default function Canvas({
  shapes,
  groups,
  canvasSettings,
  selectedCount,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onZoomIn,
  onZoomOut,
  onResetView,
  canvasRef
}: CanvasProps) {
  const animationFrameRef = useRef<number>();

  // Render loop
  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Apply zoom and pan
      ctx.save();
      ctx.scale(canvasSettings.zoom, canvasSettings.zoom);
      ctx.translate(canvasSettings.panX, canvasSettings.panY);

      // Render all groups first (they contain shapes)
      groups.forEach(group => group.render(ctx));

      // Render individual shapes
      shapes.forEach(shape => shape.render(ctx));

      ctx.restore();

      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame(render);
    };

    // Start render loop
    render();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [shapes, groups, canvasSettings, canvasRef]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Trigger re-render on resize
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-[var(--surface)] border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-slate-400">
            Canvas: <span className="text-white">{canvasSettings.width}</span> × <span className="text-white">{canvasSettings.height}</span>
          </span>
          <div className="h-4 w-px bg-slate-600"></div>
          <span className="text-sm text-slate-400">
            Selected: <span className="text-white">{selectedCount}</span> {selectedCount === 1 ? 'shape' : 'shapes'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomOut}
            className="text-slate-400 hover:text-white p-2 h-auto"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-400 min-w-[60px] text-center">
            {Math.round(canvasSettings.zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomIn}
            className="text-slate-400 hover:text-white p-2 h-auto"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="h-4 w-px bg-slate-600"></div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetView}
            className="text-slate-400 hover:text-white p-2 h-auto"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="shape-canvas w-full h-full cursor-crosshair"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        />
        
        {/* Canvas Overlay Messages */}
        {selectedCount === 0 && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white">
            <span>Hold Shift to select multiple shapes</span>
          </div>
        )}
      </div>
    </div>
  );
}
