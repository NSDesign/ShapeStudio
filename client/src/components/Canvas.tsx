import { useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, MoreHorizontal } from "lucide-react";
import { Shape, ShapeGroupClass } from '../lib/shapes';
import { CanvasSettings } from '../lib/shapeTypes';
import ExportDialog from './ExportDialog';

interface CanvasProps {
  shapes: Shape[];
  groups: ShapeGroupClass[];
  canvasSettings: CanvasSettings;
  selectedCount: number;
  editMode: 'shapes' | 'points' | 'segments';
  selectedPoints: { shapeId: string; pointIndex: number }[];
  selectedSegments: { shapeId: string; segmentIndex: number }[];
  isMultiSelectMode: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onTouchStart: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchMove: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchEnd: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  onToggleMultiSelect: () => void;
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
  editMode,
  selectedPoints,
  selectedSegments,
  isMultiSelectMode,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onToggleMultiSelect,
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

      // Render points and segments in edit mode
      if (editMode === 'points' || editMode === 'segments') {
        shapes.forEach(shape => {
          if (!shape.points || shape.points.length === 0) return;
          
          const shapeSelectedPoints = selectedPoints
            .filter(sp => sp.shapeId === shape.id)
            .map(sp => sp.pointIndex);
          
          const shapeSelectedSegments = selectedSegments
            .filter(ss => ss.shapeId === shape.id)
            .map(ss => ss.segmentIndex);
          
          shape.renderPoints(ctx, shapeSelectedPoints, shapeSelectedSegments, canvasSettings.zoom);
        });
      }

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
          <ExportDialog
            shapes={shapes}
            groups={groups}
            canvasSettings={canvasSettings}
          />
          <div className="h-4 w-px bg-slate-600"></div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMultiSelect}
            className={`p-2 h-auto ${isMultiSelectMode ? 'bg-blue-500 text-white hover:bg-blue-600' : 'text-slate-400 hover:text-white'}`}
          >
            <MoreHorizontal className={`w-4 h-4 ${isMultiSelectMode ? 'text-white' : ''}`} />
          </Button>
          <div className="h-4 w-px bg-slate-600"></div>
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
      <div className="flex-1 relative overflow-hidden bg-slate-900">
        <canvas
          ref={canvasRef}
          className="shape-canvas absolute inset-0 w-full h-full cursor-crosshair"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
        
        {/* Canvas Overlay Messages */}
        {selectedCount === 0 && !isMultiSelectMode && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white">
            <span>Hold Shift to select multiple shapes</span>
          </div>
        )}
        
        {isMultiSelectMode && (
          <div className="absolute top-4 left-4 bg-blue-500 bg-opacity-90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white">
            <span>Multi-select mode: Tap shapes to add/remove from selection</span>
          </div>
        )}
        
        {editMode !== 'shapes' && (
          <div className="absolute top-4 right-4 bg-purple-500 bg-opacity-90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white">
            <span>{editMode === 'points' ? 'Point Edit Mode' : 'Segment Edit Mode'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
