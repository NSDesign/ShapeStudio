import { useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ZoomIn, ZoomOut, RotateCcw, MoreHorizontal } from "lucide-react";
import { Shape, ShapeGroupClass } from '../lib/shapes';
import { CanvasSettings, Artboard } from '../lib/shapeTypes';
import ExportDialog from './ExportDialog';

interface CanvasProps {
  shapes: Shape[];
  groups: ShapeGroupClass[];
  canvasSettings: CanvasSettings;
  artboards: Artboard[];
  activeArtboard: string;
  selectedCount: number;
  editMode: 'shapes' | 'points' | 'segments';
  selectedPoints: { shapeId: string; pointIndex: number }[];
  selectedSegments: { shapeId: string; segmentIndex: number }[];
  isMultiSelectMode: boolean;
  marqueeStart: { x: number; y: number } | null;
  marqueeEnd: { x: number; y: number } | null;
  isMarqueeSelecting: boolean;
  isTouchDevice: boolean;
  isMultiTouch: boolean;
  selectedShapes: Shape[];
  selectedGroups: ShapeGroupClass[];
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
  const handleSize = 8 / zoom;
  const rotateHandleDistance = 30 / zoom;
  
  ctx.save();
  
  // Apply shape transform for handles
  ctx.translate(shape.transform.x, shape.transform.y);
  ctx.rotate(shape.transform.rotation * Math.PI / 180);
  ctx.scale(shape.transform.scaleX, shape.transform.scaleY);
  
  // Corner resize handles
  const corners = [
    { x: bounds.x, y: bounds.y }, // top-left
    { x: bounds.x + bounds.width, y: bounds.y }, // top-right
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height }, // bottom-right
    { x: bounds.x, y: bounds.y + bounds.height } // bottom-left
  ];
  
  corners.forEach(corner => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 1 / zoom;
    ctx.fillRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize);
    ctx.strokeRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize);
  });
  
  // Edge handles for scaling
  const edges = [
    { x: bounds.x + bounds.width/2, y: bounds.y }, // top
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height/2 }, // right
    { x: bounds.x + bounds.width/2, y: bounds.y + bounds.height }, // bottom
    { x: bounds.x, y: bounds.y + bounds.height/2 } // left
  ];
  
  edges.forEach(edge => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 1 / zoom;
    ctx.fillRect(edge.x - handleSize/2, edge.y - handleSize/2, handleSize, handleSize);
    ctx.strokeRect(edge.x - handleSize/2, edge.y - handleSize/2, handleSize, handleSize);
  });
  
  // Rotation handle
  const rotateHandleX = bounds.x + bounds.width/2;
  const rotateHandleY = bounds.y - rotateHandleDistance;
  
  ctx.strokeStyle = '#2563EB';
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();
  ctx.moveTo(bounds.x + bounds.width/2, bounds.y);
  ctx.lineTo(rotateHandleX, rotateHandleY);
  ctx.stroke();
  
  ctx.fillStyle = '#10B981';
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(rotateHandleX, rotateHandleY, handleSize/2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  ctx.restore();
}

function renderGroupTransformHandles(ctx: CanvasRenderingContext2D, group: ShapeGroupClass, zoom: number) {
  const bounds = group.getBounds();
  const handleSize = 10 / zoom;
  
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

export default function Canvas({
  shapes,
  groups,
  canvasSettings,
  artboards,
  activeArtboard,
  selectedCount,
  editMode,
  selectedPoints,
  selectedSegments,
  isMultiSelectMode,
  marqueeStart,
  marqueeEnd,
  isMarqueeSelecting,
  isTouchDevice,
  isMultiTouch,
  selectedShapes,
  selectedGroups,
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

      // Apply transform for infinite canvas
      ctx.save();
      ctx.translate(rect.width / 2, rect.height / 2); // Center the canvas
      ctx.scale(canvasSettings.zoom, canvasSettings.zoom);
      ctx.translate(canvasSettings.panX, canvasSettings.panY);

      // Calculate viewport bounds in world coordinates for culling
      const halfWidth = rect.width / (2 * canvasSettings.zoom);
      const halfHeight = rect.height / (2 * canvasSettings.zoom);
      const viewportBounds = {
        minX: -canvasSettings.panX - halfWidth,
        maxX: -canvasSettings.panX + halfWidth,
        minY: -canvasSettings.panY - halfHeight,
        maxY: -canvasSettings.panY + halfHeight
      };

      // Render visible groups first (they contain shapes)
      groups.forEach(group => {
        const bounds = group.getBounds();
        if (bounds.x < viewportBounds.maxX && bounds.x + bounds.width > viewportBounds.minX &&
            bounds.y < viewportBounds.maxY && bounds.y + bounds.height > viewportBounds.minY) {
          group.render(ctx);
        }
      });

      // Render artboards first
      artboards.forEach(artboard => {
        ctx.strokeStyle = artboard.id === activeArtboard ? '#3B82F6' : '#64748B';
        ctx.lineWidth = 2 / canvasSettings.zoom;
        ctx.setLineDash([]);
        ctx.strokeRect(artboard.x, artboard.y, artboard.width, artboard.height);
        
        // Artboard label
        if (canvasSettings.zoom > 0.3) {
          ctx.fillStyle = artboard.id === activeArtboard ? '#3B82F6' : '#64748B';
          ctx.font = `${12 / canvasSettings.zoom}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillText(artboard.name, artboard.x + 5 / canvasSettings.zoom, artboard.y - 5 / canvasSettings.zoom);
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

      // Render transform handles for selected shapes on non-touch devices
      if (editMode === 'shapes') {
        shapes.forEach(shape => {
          if (shape.selected) {
            shape.renderTransformHandles(ctx, canvasSettings.zoom, isTouchDevice);
          }
        });
        
        groups.forEach(group => {
          if (group.selected) {
            // For groups, render handles around the group bounds
            const bounds = group.getBounds();
            const handleSize = 8 / canvasSettings.zoom;
            const handleOffset = handleSize / 2;
            
            if (!isTouchDevice) {
              ctx.save();
              ctx.fillStyle = '#8B5CF6';
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 1 / canvasSettings.zoom;
              
              // Corner handles for group
              const corners = [
                { x: bounds.x - handleOffset, y: bounds.y - handleOffset },
                { x: bounds.x + bounds.width - handleOffset, y: bounds.y - handleOffset },
                { x: bounds.x + bounds.width - handleOffset, y: bounds.y + bounds.height - handleOffset },
                { x: bounds.x - handleOffset, y: bounds.y + bounds.height - handleOffset }
              ];
              
              corners.forEach(corner => {
                ctx.fillRect(corner.x, corner.y, handleSize, handleSize);
                ctx.strokeRect(corner.x, corner.y, handleSize, handleSize);
              });
              
              ctx.restore();
            }
          }
        });
      }

      // Render marquee selection rectangle (in world coordinates, before ctx.restore())
      if (isMarqueeSelecting && marqueeStart && marqueeEnd) {
        const minX = Math.min(marqueeStart.x, marqueeEnd.x);
        const maxX = Math.max(marqueeStart.x, marqueeEnd.x);
        const minY = Math.min(marqueeStart.y, marqueeEnd.y);
        const maxY = Math.max(marqueeStart.y, marqueeEnd.y);
        
        ctx.strokeStyle = '#ec4899'; // Pink color
        ctx.lineWidth = 1 / canvasSettings.zoom;
        ctx.setLineDash([5 / canvasSettings.zoom, 5 / canvasSettings.zoom]);
        ctx.fillStyle = 'rgba(236, 72, 153, 0.1)'; // Pink fill with transparency
        
        ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        
        ctx.setLineDash([]);
      }

      ctx.restore();

      // Show multi-touch gesture indicator on touch devices
      if (isTouchDevice && isMultiTouch && selectedCount > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        
        const centerX = rect.width / 2;
        const centerY = 40;
        
        // Background pill
        const text = 'Pinch to scale • Rotate with two fingers';
        const textWidth = ctx.measureText(text).width;
        const pillWidth = textWidth + 24;
        const pillHeight = 32;
        
        ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
        ctx.fillRect(centerX - pillWidth / 2, centerY - pillHeight / 2, pillWidth, pillHeight);
        ctx.strokeRect(centerX - pillWidth / 2, centerY - pillHeight / 2, pillWidth, pillHeight);
        
        // Text
        ctx.fillStyle = '#3B82F6';
        ctx.fillText(text, centerX, centerY + 4);
        
        ctx.restore();
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
  }, [shapes, groups, canvasSettings, canvasRef, isMarqueeSelecting, marqueeStart, marqueeEnd, editMode, selectedPoints, selectedSegments, isTouchDevice]);

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
          {(() => {
            const currentArtboard = artboards.find(ab => ab.id === activeArtboard);
            return (
              <span className="text-sm text-slate-400">
                {currentArtboard ? (
                  <>
                    <span className="text-blue-400">{currentArtboard.name}</span>: <span className="text-white">{currentArtboard.width}</span> × <span className="text-white">{currentArtboard.height}</span>
                  </>
                ) : (
                  <>Canvas: <span className="text-white">Infinite</span></>
                )}
              </span>
            );
          })()}
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
            artboards={artboards}
            selectedShapes={selectedShapes}
            selectedGroups={selectedGroups}
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
      <div className="flex-1 relative bg-slate-900">
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
