import { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { ZoomIn, ZoomOut, RotateCcw, MoreHorizontal, Eye, EyeOff } from "lucide-react";
import { Shape, ShapeGroupClass } from '../lib/shapes';
import { CanvasSettings, Artboard } from '../lib/shapeTypes';
import ExportDialog from './ExportDialog';
import { GeometricIntersection } from '../lib/geometricIntersection';

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
  onWheel: (e: WheelEvent) => void;
  onToggleMultiSelect: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

// This duplicate function has been removed - using shape.renderTransformHandles() method instead

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
  onWheel,
  onToggleMultiSelect,
  onZoomIn,
  onZoomOut,
  onResetView,
  canvasRef
}: CanvasProps) {
  const animationFrameRef = useRef<number>();
  const [showIntersections, setShowIntersections] = useState(true);
  const [intersectionCount, setIntersectionCount] = useState(0);

  // Add wheel event listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [onWheel]);

  // Dirty layer tracking
  const dirtyRegions = useRef<Set<string>>(new Set());
  const lastRenderState = useRef<{
    shapes: Shape[];
    selectedShapes: string[];
    editMode: string;
  }>({ shapes: [], selectedShapes: [], editMode: 'shapes' });

  // Calculate what needs re-rendering
  const calculateDirtyRegions = () => {
    const current = {
      shapes: shapes,
      selectedShapes: selectedShapes.map(s => s.id),
      editMode: editMode
    };
    
    // Check if anything changed
    const shapesChanged = JSON.stringify(current.shapes.map(s => ({ 
      id: s.id, 
      transform: s.transform, 
      selected: s.selected 
    }))) !== JSON.stringify(lastRenderState.current.shapes.map(s => ({ 
      id: s.id, 
      transform: s.transform, 
      selected: s.selected 
    })));
    
    const selectionChanged = JSON.stringify(current.selectedShapes) !== JSON.stringify(lastRenderState.current.selectedShapes);
    const modeChanged = current.editMode !== lastRenderState.current.editMode;
    
    if (shapesChanged || selectionChanged || modeChanged) {
      dirtyRegions.current.add('static');
      dirtyRegions.current.add('ui');
    }
    
    lastRenderState.current = current;
  };

  // Render loop with proper dependencies
  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      calculateDirtyRegions();

      // Set canvas size only if changed
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const newWidth = rect.width * dpr;
      const newHeight = rect.height * dpr;
      
      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.scale(dpr, dpr);
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
      }

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

      // Render shapes and their components in z-index order to maintain proper layering
      const sortedShapes = [...shapes].sort((a, b) => a.properties.zIndex - b.properties.zIndex);
      
      sortedShapes.forEach(shape => {
        const bounds = shape.getBounds();
        if (bounds.x < viewportBounds.maxX && bounds.x + bounds.width > viewportBounds.minX &&
            bounds.y < viewportBounds.maxY && bounds.y + bounds.height > viewportBounds.minY) {
          
          // Render the shape first
          shape.render(ctx);
          
          // Then render its components immediately after (maintaining z-index order)
          if (shape.points && shape.points.length > 0) {
            const hasSelectedComponents = selectedPoints.some(sp => sp.shapeId === shape.id) || 
                                         selectedSegments.some(ss => ss.shapeId === shape.id);
            const shouldShowComponents = (editMode === 'points' || editMode === 'segments') && 
                                       (shape.selected || hasSelectedComponents);
            
            if (shouldShowComponents) {
              const shapeSelectedPoints = selectedPoints
                .filter(sp => sp.shapeId === shape.id)
                .map(sp => sp.pointIndex);
              
              const shapeSelectedSegments = selectedSegments
                .filter(ss => ss.shapeId === shape.id)
                .map(ss => ss.segmentIndex);
              
              shape.renderPoints(ctx, shapeSelectedPoints, shapeSelectedSegments, canvasSettings.zoom);
            }
          }
        }
      });

      // Render transform handles for selected shapes on non-touch devices
      if (editMode === 'shapes') {
        const selectedShapeList = shapes.filter(shape => shape.selected);
        const selectedGroupList = groups.filter(group => group.selected);
        
        // If multiple shapes are selected, show collective bounding box
        if (selectedShapeList.length > 1 && !isTouchDevice) {
          ctx.save();
          
          // Calculate collective bounds
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          
          selectedShapeList.forEach(shape => {
            const bounds = shape.getWorldBounds();
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
          });
          
          const collectiveBounds = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
          };
          
          // Draw collective bounding box
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 2 / canvasSettings.zoom;
          ctx.setLineDash([5 / canvasSettings.zoom, 5 / canvasSettings.zoom]);
          ctx.strokeRect(collectiveBounds.x, collectiveBounds.y, collectiveBounds.width, collectiveBounds.height);
          ctx.setLineDash([]);
          
          // Draw collective transform handles
          const handleSize = 8 / canvasSettings.zoom;
          const handleOffset = handleSize / 2;
          
          ctx.fillStyle = '#3B82F6';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1 / canvasSettings.zoom;
          
          // Corner handles for multi-selection
          const corners = [
            { x: collectiveBounds.x - handleOffset, y: collectiveBounds.y - handleOffset },
            { x: collectiveBounds.x + collectiveBounds.width - handleOffset, y: collectiveBounds.y - handleOffset },
            { x: collectiveBounds.x + collectiveBounds.width - handleOffset, y: collectiveBounds.y + collectiveBounds.height - handleOffset },
            { x: collectiveBounds.x - handleOffset, y: collectiveBounds.y + collectiveBounds.height - handleOffset }
          ];
          
          corners.forEach(corner => {
            ctx.fillRect(corner.x, corner.y, handleSize, handleSize);
            ctx.strokeRect(corner.x, corner.y, handleSize, handleSize);
          });
          
          ctx.restore();
        } else {
          // Show individual shape handles when only one shape is selected
          shapes.forEach(shape => {
            if (shape.selected) {
              shape.renderTransformHandles(ctx, canvasSettings.zoom, isTouchDevice);
            }
          });
        }
        
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

      // Render debug intersection points with proper screen coordinates
      if (selectedShapes.length === 1 && showIntersections) {
        const sourceShape = selectedShapes[0];
        let totalIntersections = 0;
        
        // Only show intersections with shapes that can participate in boolean operations
        const compatibleShapes = shapes.filter(s => 
          s.id !== sourceShape.id && 
          !s.selected &&
          (s.type === 'rectangle' || s.type === 'square' || s.type === 'circle' || s.type === 'ellipse')
        );
        
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Reset to screen coordinates
        
        compatibleShapes.forEach(targetShape => {
          try {
            const intersections = GeometricIntersection.getIntersectionPoints(sourceShape, targetShape);
            totalIntersections += intersections.length;
            
            if (intersections.length > 0) {
              ctx.fillStyle = 'rgba(220, 38, 38, 0.7)'; // Semi-transparent red
              ctx.strokeStyle = 'rgba(220, 38, 38, 1.0)'; // Solid red outline
              ctx.lineWidth = 1.5;
              
              intersections.forEach(point => {
                // Transform world coordinates to screen coordinates
                const screenX = rect.width / 2 + (point.x + canvasSettings.panX) * canvasSettings.zoom;
                const screenY = rect.height / 2 + (point.y + canvasSettings.panY) * canvasSettings.zoom;
                
                const radius = 5; // Fixed screen size
                ctx.beginPath();
                ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              });
            }
          } catch (error) {
            // Silently handle intersection calculation errors
          }
        });
        
        ctx.restore();
        
        // Update intersection count
        if (totalIntersections !== intersectionCount) {
          setIntersectionCount(totalIntersections);
        }
      } else if (selectedShapes.length !== 1 && intersectionCount > 0) {
        setIntersectionCount(0);
      }

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

    };

    // Render only once per dependency change
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
          
          {/* Intersection Debug Info */}
          {selectedCount === 1 && (
            <>
              <div className="h-4 w-px bg-slate-600"></div>
              <span className="text-sm text-slate-400">
                Intersections: <span className="text-orange-400">{intersectionCount}</span>
              </span>
            </>
          )}

        </div>
        
        <div className="flex items-center space-x-2">
          {/* Intersection Debug Toggle */}
          {selectedCount === 1 && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowIntersections(!showIntersections)}
                    className={`p-2 h-auto ${showIntersections ? 'text-orange-400 hover:text-orange-300' : 'text-slate-500 hover:text-slate-400'}`}
                  >
                    {showIntersections ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showIntersections ? 'Hide intersection indicators' : 'Show intersection indicators'}
                </TooltipContent>
              </Tooltip>
              <div className="h-4 w-px bg-slate-600"></div>
            </>
          )}
          
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
      <div className="flex-1 relative bg-slate-900 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="shape-canvas w-full h-full cursor-crosshair"
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
