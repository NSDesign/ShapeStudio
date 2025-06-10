import { useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  marqueeStart: { x: number; y: number } | null;
  marqueeEnd: { x: number; y: number } | null;
  isMarqueeSelecting: boolean;
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

// Transform handle rendering functions
function renderTransformHandles(ctx: CanvasRenderingContext2D, shape: Shape, zoom: number) {
  const bounds = shape.getBounds();
  const handleSize = Math.max(12 / zoom, 8); // Larger minimum size for touch
  const rotateHandleDistance = 40 / zoom;
  
  ctx.save();
  
  // Apply shape transform for handles
  ctx.translate(shape.transform.x, shape.transform.y);
  ctx.rotate(shape.transform.rotation * Math.PI / 180);
  ctx.scale(shape.transform.scaleX, shape.transform.scaleY);
  
  // Corner resize handles (for proportional scaling)
  const corners = [
    { x: bounds.x, y: bounds.y, type: 'corner', cursor: 'nw-resize' }, // top-left
    { x: bounds.x + bounds.width, y: bounds.y, type: 'corner', cursor: 'ne-resize' }, // top-right
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height, type: 'corner', cursor: 'se-resize' }, // bottom-right
    { x: bounds.x, y: bounds.y + bounds.height, type: 'corner', cursor: 'sw-resize' } // bottom-left
  ];
  
  corners.forEach((corner, index) => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2 / zoom;
    ctx.fillRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize);
    ctx.strokeRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize);
    
    // Add corner indicator
    ctx.fillStyle = '#2563EB';
    ctx.fillRect(corner.x - 2/zoom, corner.y - 2/zoom, 4/zoom, 4/zoom);
  });
  
  // Edge handles for non-proportional scaling
  const edges = [
    { x: bounds.x + bounds.width/2, y: bounds.y, type: 'edge', direction: 'n' }, // top
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height/2, type: 'edge', direction: 'e' }, // right
    { x: bounds.x + bounds.width/2, y: bounds.y + bounds.height, type: 'edge', direction: 's' }, // bottom
    { x: bounds.x, y: bounds.y + bounds.height/2, type: 'edge', direction: 'w' } // left
  ];
  
  edges.forEach(edge => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1 / zoom;
    const edgeHandleSize = handleSize * 0.7;
    ctx.fillRect(edge.x - edgeHandleSize/2, edge.y - edgeHandleSize/2, edgeHandleSize, edgeHandleSize);
    ctx.strokeRect(edge.x - edgeHandleSize/2, edge.y - edgeHandleSize/2, edgeHandleSize, edgeHandleSize);
  });
  
  // Rotation handle with better visibility
  const rotateHandleX = bounds.x + bounds.width/2;
  const rotateHandleY = bounds.y - rotateHandleDistance;
  
  // Connection line
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 2 / zoom;
  ctx.setLineDash([4 / zoom, 4 / zoom]);
  ctx.beginPath();
  ctx.moveTo(bounds.x + bounds.width/2, bounds.y);
  ctx.lineTo(rotateHandleX, rotateHandleY);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Rotation handle circle (larger for touch)
  const rotateHandleSize = Math.max(16 / zoom, 12);
  ctx.fillStyle = '#10B981';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2 / zoom;
  ctx.beginPath();
  ctx.arc(rotateHandleX, rotateHandleY, rotateHandleSize/2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // Rotation icon
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5 / zoom;
  ctx.beginPath();
  ctx.arc(rotateHandleX, rotateHandleY, rotateHandleSize/3, 0, Math.PI * 1.5);
  ctx.stroke();
  
  // Arrow tip
  const arrowSize = 3 / zoom;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(rotateHandleX + rotateHandleSize/3, rotateHandleY);
  ctx.lineTo(rotateHandleX + rotateHandleSize/3 - arrowSize, rotateHandleY - arrowSize);
  ctx.lineTo(rotateHandleX + rotateHandleSize/3 - arrowSize, rotateHandleY + arrowSize);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

function renderGroupTransformHandles(ctx: CanvasRenderingContext2D, group: ShapeGroupClass, zoom: number) {
  const bounds = group.getBounds();
  const handleSize = Math.max(12 / zoom, 8);
  
  // Group handles are purple
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#7C3AED';
  ctx.lineWidth = 2 / zoom;
  
  // Corner handles
  const corners = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height }
  ];
  
  corners.forEach(corner => {
    ctx.fillRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize);
    ctx.strokeRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize);
  });
}

// Helper functions for transform handle detection
export function getTransformHandleAt(shape: Shape, worldX: number, worldY: number, zoom: number): { type: string; index?: number } | null {
  const bounds = shape.getBounds();
  const handleSize = Math.max(12 / zoom, 8);
  const rotateHandleDistance = 40 / zoom;
  
  // Transform world coordinates to shape-local coordinates
  let localX = worldX - shape.transform.x;
  let localY = worldY - shape.transform.y;
  
  // Apply inverse rotation
  const cos = Math.cos(-shape.transform.rotation * Math.PI / 180);
  const sin = Math.sin(-shape.transform.rotation * Math.PI / 180);
  const rotatedX = localX * cos - localY * sin;
  const rotatedY = localX * sin + localY * cos;
  
  // Apply inverse scale
  localX = rotatedX / shape.transform.scaleX;
  localY = rotatedY / shape.transform.scaleY;
  
  // Check rotation handle first (has priority)
  const rotateHandleX = bounds.x + bounds.width/2;
  const rotateHandleY = bounds.y - rotateHandleDistance;
  const rotateHandleSize = Math.max(16 / zoom, 12);
  
  const rotateDistance = Math.sqrt(
    Math.pow(localX - rotateHandleX, 2) + Math.pow(localY - rotateHandleY, 2)
  );
  
  if (rotateDistance <= rotateHandleSize/2 + 4) {
    return { type: 'rotate' };
  }
  
  // Check corner handles
  const corners = [
    { x: bounds.x, y: bounds.y, index: 0 }, // top-left
    { x: bounds.x + bounds.width, y: bounds.y, index: 1 }, // top-right
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height, index: 2 }, // bottom-right
    { x: bounds.x, y: bounds.y + bounds.height, index: 3 } // bottom-left
  ];
  
  for (const corner of corners) {
    const distance = Math.sqrt(
      Math.pow(localX - corner.x, 2) + Math.pow(localY - corner.y, 2)
    );
    
    if (distance <= handleSize/2 + 4) {
      return { type: 'corner', index: corner.index };
    }
  }
  
  // Check edge handles
  const edges = [
    { x: bounds.x + bounds.width/2, y: bounds.y, index: 0, direction: 'n' }, // top
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height/2, index: 1, direction: 'e' }, // right
    { x: bounds.x + bounds.width/2, y: bounds.y + bounds.height, index: 2, direction: 's' }, // bottom
    { x: bounds.x, y: bounds.y + bounds.height/2, index: 3, direction: 'w' } // left
  ];
  
  const edgeHandleSize = handleSize * 0.7;
  for (const edge of edges) {
    const distance = Math.sqrt(
      Math.pow(localX - edge.x, 2) + Math.pow(localY - edge.y, 2)
    );
    
    if (distance <= edgeHandleSize/2 + 4) {
      return { type: 'edge', index: edge.index };
    }
  }
  
  return null;
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
  marqueeStart,
  marqueeEnd,
  isMarqueeSelecting,
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

      // Apply zoom and pan for infinite canvas
      ctx.save();
      ctx.translate(canvasSettings.panX * canvasSettings.zoom, canvasSettings.panY * canvasSettings.zoom);
      ctx.scale(canvasSettings.zoom, canvasSettings.zoom);

      // Performance optimization: Only render shapes visible in viewport
      const viewportBounds = {
        minX: -canvasSettings.panX - (rect.width / 2) / canvasSettings.zoom,
        maxX: -canvasSettings.panX + (rect.width / 2) / canvasSettings.zoom,
        minY: -canvasSettings.panY - (rect.height / 2) / canvasSettings.zoom,
        maxY: -canvasSettings.panY + (rect.height / 2) / canvasSettings.zoom
      };

      // Render visible groups first (they contain shapes)
      groups.forEach(group => {
        const bounds = group.getBounds();
        if (bounds.x < viewportBounds.maxX && bounds.x + bounds.width > viewportBounds.minX &&
            bounds.y < viewportBounds.maxY && bounds.y + bounds.height > viewportBounds.minY) {
          group.render(ctx);
        }
      });

      // Render visible individual shapes
      shapes.forEach(shape => {
        const bounds = shape.getBounds();
        if (bounds.x < viewportBounds.maxX && bounds.x + bounds.width > viewportBounds.minX &&
            bounds.y < viewportBounds.maxY && bounds.y + bounds.height > viewportBounds.minY) {
          shape.render(ctx);
        }
      });

      // Render points and segments only for selected shapes in edit mode
      if (editMode === 'points' || editMode === 'segments') {
        shapes.forEach(shape => {
          // Only show points/segments for selected shapes
          if (!shape.selected || !shape.points || shape.points.length === 0) return;
          
          const shapeSelectedPoints = selectedPoints
            .filter(sp => sp.shapeId === shape.id)
            .map(sp => sp.pointIndex);
          
          const shapeSelectedSegments = selectedSegments
            .filter(ss => ss.shapeId === shape.id)
            .map(ss => ss.segmentIndex);
          
          shape.renderPoints(ctx, shapeSelectedPoints, shapeSelectedSegments, canvasSettings.zoom);
        });
      }

      // Render transform handles for selected shapes in shape mode
      if (editMode === 'shapes') {
        shapes.forEach(shape => {
          if (shape.selected) {
            renderTransformHandles(ctx, shape, canvasSettings.zoom);
          }
        });
        
        groups.forEach(group => {
          if (group.selected) {
            renderGroupTransformHandles(ctx, group, canvasSettings.zoom);
          }
        });
      }

      ctx.restore();

      // Render marquee selection rectangle
      if (isMarqueeSelecting && marqueeStart && marqueeEnd) {
        const minX = Math.min(marqueeStart.x, marqueeEnd.x) * canvasSettings.zoom + canvasSettings.panX * canvasSettings.zoom;
        const maxX = Math.max(marqueeStart.x, marqueeEnd.x) * canvasSettings.zoom + canvasSettings.panX * canvasSettings.zoom;
        const minY = Math.min(marqueeStart.y, marqueeEnd.y) * canvasSettings.zoom + canvasSettings.panY * canvasSettings.zoom;
        const maxY = Math.max(marqueeStart.y, marqueeEnd.y) * canvasSettings.zoom + canvasSettings.panY * canvasSettings.zoom;
        
        ctx.strokeStyle = '#ec4899'; // Pink color
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.fillStyle = 'rgba(236, 72, 153, 0.1)'; // Pink fill with transparency
        
        ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        
        ctx.setLineDash([]);
      }

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
  }, [shapes, groups, canvasSettings, canvasRef, isMarqueeSelecting, marqueeStart, marqueeEnd, editMode, selectedPoints, selectedSegments]);

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
            className="text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 p-2 h-auto transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className={`text-sm min-w-[60px] text-center font-medium transition-colors ${
            canvasSettings.zoom === 1 ? 'text-green-400' : 
            canvasSettings.zoom < 1 ? 'text-orange-400' : 'text-blue-400'
          }`}>
            {Math.round(canvasSettings.zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomIn}
            className="text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 p-2 h-auto transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="h-4 w-px bg-slate-600"></div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetView}
                className="text-slate-400 hover:text-green-400 hover:bg-green-500/20 p-2 h-auto transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset view to 100% zoom and center position</p>
            </TooltipContent>
          </Tooltip>
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
