import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NumericInput } from '@/components/ui/numeric-input';
import { MousePointer, ZoomIn, ZoomOut, RotateCcw, Maximize2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Shape, ShapeGroupClass } from '@/lib/shapes';
import { CanvasSettings, Artboard } from '@/lib/shapeTypes';
import { GenerationSet } from '@shared/schema';
import { renderSetToOffscreenCanvas, compositeSetCanvases } from '@/lib/offscreenRenderer';
import { getArtboardDisplayDimensions } from '@/lib/artboardUtils';


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
  showMultiSelectButton: boolean;
  showSelectedCount: boolean;
  marqueeStart: { x: number; y: number } | null;
  marqueeEnd: { x: number; y: number } | null;
  isMarqueeSelecting: boolean;
  isTouchDevice: boolean;
  isMultiTouch: boolean;
  selectedShapes: Shape[];
  selectedGroups: ShapeGroupClass[];
  generationSets?: GenerationSet[];
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
  onZoomChange: (zoomPercentage: number) => void;
  onResetView: () => void;
  onFitToArtboard: () => void;
  onClearAll: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

function renderGroupTransformHandles(ctx: CanvasRenderingContext2D, group: ShapeGroupClass, zoom: number) {
  // Simplified group handle rendering
  const bounds = group.getBounds();
  if (!bounds) return;
  
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2 / zoom;
  ctx.setLineDash([5 / zoom, 5 / zoom]);
  ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  ctx.setLineDash([]);
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
  showMultiSelectButton,
  showSelectedCount,
  marqueeStart,
  marqueeEnd,
  isMarqueeSelecting,
  isTouchDevice,
  isMultiTouch,
  selectedShapes,
  selectedGroups,
  generationSets,
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
  onZoomChange,
  onResetView,
  onFitToArtboard,
  onClearAll,
  canvasRef,
}: CanvasProps) {
  const animationFrameRef = useRef<number>();
  const infiniteCanvasRef = useRef<HTMLCanvasElement>(null);
  const artboardCanvasRef = useRef<HTMLCanvasElement>(null);
  const dirtyRef = useRef<boolean>(true); // Track if canvas needs re-render
  const isAnimatingRef = useRef<boolean>(false); // Track if animation loop is active

  // Set canvas size to match container with proper pixel density for all three layers
  useEffect(() => {
    let resizeTimeoutId: number;
    
    const resizeCanvas = () => {
      const canvases = [infiniteCanvasRef.current, artboardCanvasRef.current, canvasRef.current];
      const canvas = canvasRef.current;
      
      if (canvas) {
        const container = canvas.parentElement;
        if (container) {
          const rect = container.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;
          
          // Apply same sizing to all three canvas layers
          canvases.forEach(c => {
            if (c) {
              // Set actual canvas size in memory (accounting for device pixel ratio)
              c.width = rect.width * dpr;
              c.height = rect.height * dpr;
              
              // Set display size via CSS
              c.style.width = rect.width + 'px';
              c.style.height = rect.height + 'px';
              
              // Scale the drawing context so everything draws at the correct size
              const ctx = c.getContext('2d');
              if (ctx) {
                ctx.scale(dpr, dpr);
              }
            }
          });
        }
      }
    };

    const debouncedResizeCanvas = () => {
      clearTimeout(resizeTimeoutId);
      resizeTimeoutId = window.setTimeout(() => {
        requestAnimationFrame(() => {
          resizeCanvas();
          dirtyRef.current = true; // Mark as dirty after resize
        });
      }, 16); // ~60fps debouncing
    };

    resizeCanvas();
    dirtyRef.current = true; // Mark as dirty on mount
    
    const resizeObserver = new ResizeObserver(debouncedResizeCanvas);
    if (canvasRef.current?.parentElement) {
      resizeObserver.observe(canvasRef.current.parentElement);
    }

    window.addEventListener('resize', debouncedResizeCanvas);
    
    return () => {
      clearTimeout(resizeTimeoutId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', debouncedResizeCanvas);
    };
  }, []);

  // Main render loop - three separate layers
  useEffect(() => {
    // Layer 1: Infinite Canvas (background + grid)
    const renderInfiniteCanvas = () => {
      const canvas = infiniteCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear and fill background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = canvasSettings.backgroundColor || '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Temporarily force zoom to 1.0 if invalid
      let effectiveZoom = canvasSettings.zoom;
      let effectivePanX = canvasSettings.panX;
      let effectivePanY = canvasSettings.panY;
      
      if (effectiveZoom < 0.05) {
        effectiveZoom = 1.0;
        effectivePanX = 0;
        effectivePanY = 0;
      }

      // Apply transformations
      ctx.save();
      
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      
      ctx.translate(displayWidth / 2, displayHeight / 2);
      ctx.scale(effectiveZoom, effectiveZoom);
      ctx.translate(effectivePanX, effectivePanY);

      // Draw infinite canvas grid
      if (canvasSettings.showGrid) {
        const gridSize = 20;
        const adjustedGridSize = gridSize / effectiveZoom;
        
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 0.5 / effectiveZoom;
        ctx.globalAlpha = 0.3;

        const viewWidth = displayWidth / effectiveZoom;
        const viewHeight = displayHeight / effectiveZoom;
        const startX = Math.floor((-effectivePanX - viewWidth / 2) / adjustedGridSize) * adjustedGridSize;
        const endX = Math.ceil((-effectivePanX + viewWidth / 2) / adjustedGridSize) * adjustedGridSize;
        const startY = Math.floor((-effectivePanY - viewHeight / 2) / adjustedGridSize) * adjustedGridSize;
        const endY = Math.ceil((-effectivePanY + viewHeight / 2) / adjustedGridSize) * adjustedGridSize;

        ctx.beginPath();
        for (let x = startX; x <= endX; x += adjustedGridSize) {
          ctx.moveTo(x, startY);
          ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += adjustedGridSize) {
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    };

    // Layer 2: Artboard (background + grid + border)
    const renderArtboard = () => {
      const canvas = artboardCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas (transparent)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let effectiveZoom = canvasSettings.zoom;
      let effectivePanX = canvasSettings.panX;
      let effectivePanY = canvasSettings.panY;
      
      if (effectiveZoom < 0.05) {
        effectiveZoom = 1.0;
        effectivePanX = 0;
        effectivePanY = 0;
      }

      ctx.save();
      
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      
      ctx.translate(displayWidth / 2, displayHeight / 2);
      ctx.scale(effectiveZoom, effectiveZoom);
      ctx.translate(effectivePanX, effectivePanY);

      // Draw active artboard
      const currentArtboard = artboards.find(a => a.id === activeArtboard);
      if (currentArtboard) {
        // Draw artboard background
        ctx.fillStyle = currentArtboard.backgroundColor || '#ffffff';
        ctx.fillRect(currentArtboard.x, currentArtboard.y, currentArtboard.width, currentArtboard.height);
        
        // Draw artboard grid if enabled
        if (currentArtboard.displayGrid !== false) {
          const gridSize = 50;
          const adjustedGridSize = gridSize / effectiveZoom;
          
          ctx.strokeStyle = currentArtboard.gridColor || '#cccccc';
          ctx.lineWidth = 0.5 / effectiveZoom;
          ctx.globalAlpha = 0.3;
          
          ctx.beginPath();
          for (let x = currentArtboard.x; x <= currentArtboard.x + currentArtboard.width; x += adjustedGridSize) {
            ctx.moveTo(x, currentArtboard.y);
            ctx.lineTo(x, currentArtboard.y + currentArtboard.height);
          }
          for (let y = currentArtboard.y; y <= currentArtboard.y + currentArtboard.height; y += adjustedGridSize) {
            ctx.moveTo(currentArtboard.x, y);
            ctx.lineTo(currentArtboard.x + currentArtboard.width, y);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        
        // Draw artboard border if enabled
        if (currentArtboard.displayBorder !== false) {
          ctx.strokeStyle = '#0066cc';
          ctx.lineWidth = 2 / effectiveZoom;
          ctx.strokeRect(currentArtboard.x, currentArtboard.y, currentArtboard.width, currentArtboard.height);
        }
        
        // Display artboard information overlay (independent of border)
        const fontSize = 12 / effectiveZoom;
        const lineHeight = fontSize * 1.3;
        let textYOffset = -5 / effectiveZoom;
        const textXOffset = currentArtboard.x;
        
        ctx.fillStyle = '#0066cc';
        ctx.font = `${fontSize}px Arial`;
        
        // Display artboard name if enabled
        if (currentArtboard.displayName !== false) {
          ctx.fillText(currentArtboard.name, textXOffset, currentArtboard.y + textYOffset);
          textYOffset -= lineHeight;
        }
        
        // Display dimensions if enabled
        if (currentArtboard.displayDimensions === true) {
          const displayDims = getArtboardDisplayDimensions(
            currentArtboard.width,
            currentArtboard.height,
            currentArtboard.dpi ?? 72,
            currentArtboard.unitType ?? 'pixels'
          );
          const dimensionText = `${displayDims.widthFormatted} × ${displayDims.heightFormatted}`;
          ctx.fillText(dimensionText, textXOffset, currentArtboard.y + textYOffset);
          textYOffset -= lineHeight;
        }
        
        // Display resolution if enabled
        if (currentArtboard.displayResolution === true) {
          const dpi = currentArtboard.dpi ?? 72;
          const resolutionText = `${dpi} DPI`;
          ctx.fillText(resolutionText, textXOffset, currentArtboard.y + textYOffset);
        }
      }

      ctx.restore();
    };

    // Layer 3: Shapes (transparent background, compositing happens here)
    const renderShapes = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas (transparent background)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let effectiveZoom = canvasSettings.zoom;
      let effectivePanX = canvasSettings.panX;
      let effectivePanY = canvasSettings.panY;
      
      if (effectiveZoom < 0.05) {
        effectiveZoom = 1.0;
        effectivePanX = 0;
        effectivePanY = 0;
      }

      ctx.save();
      
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      
      ctx.translate(displayWidth / 2, displayHeight / 2);
      ctx.scale(effectiveZoom, effectiveZoom);
      ctx.translate(effectivePanX, effectivePanY);

      // Check if we need set-based rendering with compositing operations
      const hasCompositingOperations = generationSets && generationSets.some(set => 
        set.enabled && ((set.compositingOperation && set.compositingOperation !== 'source-over') || 
        (set.setBlendMode && set.setBlendMode !== 'source-over'))
      );

      if (hasCompositingOperations && generationSets && shapes.length > 0) {
        // OFFSCREEN RENDERING PIPELINE: Render each set to isolated canvas, then composite
        
        // Group shapes by set using z-index ranges (sets use 1000x multiplier)
        const shapesBySet: Map<number, typeof shapes> = new Map();
        shapes.forEach(shape => {
          const setIndex = Math.floor(shape.properties.zIndex / 1000);
          if (!shapesBySet.has(setIndex)) {
            shapesBySet.set(setIndex, []);
          }
          shapesBySet.get(setIndex)!.push(shape);
        });

        const enabledSets = generationSets
          .filter(set => set.enabled)
          .sort((a, b) => a.generationOrder - b.generationOrder);

        // Create render context for offscreen canvases
        const renderContext = {
          width: displayWidth,
          height: displayHeight,
          dpr: window.devicePixelRatio || 1,
          panX: effectivePanX,
          panY: effectivePanY,
          zoom: effectiveZoom
        };

        // Render each set to its own offscreen canvas
        const setCanvases = enabledSets.map(set => {
          const setShapes = shapesBySet.get(set.generationOrder) || [];
          if (setShapes.length === 0) return null;

          const offscreenCanvas = renderSetToOffscreenCanvas(set, setShapes, renderContext);
          return { canvas: offscreenCanvas, set };
        }).filter(Boolean) as Array<{ canvas: HTMLCanvasElement; set: GenerationSet }>;

        // Save current context state (preserving transforms applied above)
        ctx.save();
        
        // Reset to identity transform for compositing
        // The offscreen canvases already have transforms baked in
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Composite all set canvases onto main canvas with set-level operations
        compositeSetCanvases(ctx, setCanvases);
        
        // Restore context state (to apply transforms for UI elements below)
        ctx.restore();
      } else {
        // STANDARD RENDERING: Draw shapes in z-index order (no compositing)
        const sortedShapes = [...shapes].sort((a, b) => a.properties.zIndex - b.properties.zIndex);
        sortedShapes.forEach(shape => {
          shape.render(ctx);
        });
      }

      // Draw selection bounding boxes on top of composited result
      selectedShapes.forEach(shape => {
        ctx.save();
        
        // Calculate total scale factor (canvas zoom × shape scale)
        // This ensures constant visual stroke width regardless of zoom or transform scaling
        const totalScaleX = effectiveZoom * Math.abs(shape.transform.scaleX);
        const totalScaleY = effectiveZoom * Math.abs(shape.transform.scaleY);
        const avgScale = (totalScaleX + totalScaleY) / 2;
        
        // Apply shape transform to position the bounding box correctly
        ctx.translate(shape.transform.x, shape.transform.y);
        ctx.rotate(shape.transform.rotation * Math.PI / 180);
        ctx.scale(shape.transform.scaleX, shape.transform.scaleY);
        ctx.transform(1, shape.transform.skewX, shape.transform.skewY, 1, 0, 0);
        
        // Draw selection bounding box with constant stroke width
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2 / avgScale;
        ctx.setLineDash([5 / avgScale, 5 / avgScale]);
        
        const bounds = shape.getBounds();
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        
        // Add corner indicators with constant size
        const cornerSize = 6 / avgScale;
        const corners = [
          [bounds.x, bounds.y],
          [bounds.x + bounds.width, bounds.y],
          [bounds.x + bounds.width, bounds.y + bounds.height],
          [bounds.x, bounds.y + bounds.height]
        ];
        
        ctx.fillStyle = '#2563EB';
        corners.forEach(([x, y]) => {
          ctx.fillRect(x - cornerSize/2, y - cornerSize/2, cornerSize, cornerSize);
        });
        
        ctx.setLineDash([]);
        ctx.restore();
      });

      // Draw group handles
      groups.forEach(group => {
        if (selectedGroups.includes(group)) {
          renderGroupTransformHandles(ctx, group, effectiveZoom);
        }
      });

      // Draw marquee selection
      if (isMarqueeSelecting && marqueeStart && marqueeEnd) {
        const startX = Math.min(marqueeStart.x, marqueeEnd.x);
        const startY = Math.min(marqueeStart.y, marqueeEnd.y);
        const width = Math.abs(marqueeEnd.x - marqueeStart.x);
        const height = Math.abs(marqueeEnd.y - marqueeStart.y);
        
        ctx.strokeStyle = '#007bff';
        ctx.setLineDash([5 / effectiveZoom, 5 / effectiveZoom]);
        ctx.lineWidth = 1 / effectiveZoom;
        ctx.strokeRect(startX, startY, width, height);
        ctx.setLineDash([]);
      }

      // Draw edit handles
      if (editMode === 'points') {
        selectedShapes.forEach(shape => {
          if (shape.points) {
            shape.points.forEach((point, index) => {
              const isSelected = selectedPoints.some(sp => sp.shapeId === shape.id && sp.pointIndex === index);
              ctx.fillStyle = isSelected ? '#ff6b6b' : '#4dabf7';
              
              const transformedX = point.x + shape.transform.x;
              const transformedY = point.y + shape.transform.y;
              
              ctx.fillRect(
                transformedX - 4 / effectiveZoom,
                transformedY - 4 / effectiveZoom,
                8 / effectiveZoom,
                8 / effectiveZoom
              );
            });
          }
        });
      } else if (editMode === 'segments') {
        selectedShapes.forEach(shape => {
          if (shape.points && shape.points.length > 1) {
            for (let i = 0; i < shape.points.length - 1; i++) {
              const point1 = shape.points[i];
              const point2 = shape.points[i + 1];
              
              const midX = (point1.x + point2.x) / 2 + shape.transform.x;
              const midY = (point1.y + point2.y) / 2 + shape.transform.y;
              
              const isSelected = selectedSegments.some(ss => ss.shapeId === shape.id && ss.segmentIndex === i);
              ctx.fillStyle = isSelected ? '#ff6b6b' : '#51cf66';
              ctx.beginPath();
              ctx.arc(midX, midY, 4 / effectiveZoom, 0, 2 * Math.PI);
              ctx.fill();
            }
          }
        });
      }

      ctx.restore();
    };

    const animate = () => {
      // Only render if dirty flag is set
      if (dirtyRef.current) {
        renderInfiniteCanvas();
        renderArtboard();
        renderShapes();
        dirtyRef.current = false; // Reset dirty flag after rendering
      }
      
      // Always schedule next frame to check for changes
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop if not already running
    if (!isAnimatingRef.current) {
      isAnimatingRef.current = true;
      animate();
    }

    return () => {
      isAnimatingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [shapes, groups, canvasSettings, artboards, activeArtboard, selectedShapes, selectedGroups, isMarqueeSelecting, marqueeStart, marqueeEnd, editMode, selectedPoints, selectedSegments, generationSets]);

  // Mark canvas as dirty whenever state changes - this triggers a re-render
  useEffect(() => {
    dirtyRef.current = true;
  }, [shapes, groups, canvasSettings, artboards, activeArtboard, selectedShapes, selectedGroups, isMarqueeSelecting, marqueeStart, marqueeEnd, editMode, selectedPoints, selectedSegments, generationSets]);

  // Wrap interaction handlers to set dirty flag for immediate visual feedback
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    dirtyRef.current = true;
    onMouseDown(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    dirtyRef.current = true;
    onMouseMove(e);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    dirtyRef.current = true;
    onMouseUp(e);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    dirtyRef.current = true;
    onTouchStart(e);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    dirtyRef.current = true;
    onTouchMove(e);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    dirtyRef.current = true;
    onTouchEnd(e);
  };

  const handleWheel = (e: WheelEvent) => {
    dirtyRef.current = true;
    onWheel(e);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="bg-slate-800 border-b border-slate-700 p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="text-slate-300 hover:text-red-400 hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear all shapes</p>
              </TooltipContent>
            </Tooltip>

            {showMultiSelectButton && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleMultiSelect}
                    className={cn(
                      "text-slate-300 hover:text-white hover:bg-slate-700",
                      isMultiSelectMode && "bg-blue-600 text-white hover:bg-blue-500"
                    )}
                    data-testid="button-multi-select"
                  >
                    <MousePointer className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle multi-select mode</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {showSelectedCount && (
              <div className="text-sm text-slate-400 bg-slate-700 px-2 py-1 rounded" data-testid="text-selected-count">
                Selected: {selectedCount}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onZoomOut} className="text-slate-300 hover:text-white hover:bg-slate-700">
                  <ZoomOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Zoom out</p></TooltipContent>
            </Tooltip>
            
            <NumericInput
              value={Math.round((canvasSettings.zoom && canvasSettings.zoom > 0.05 ? canvasSettings.zoom : 1) * 100)}
              onChange={(value) => onZoomChange(value / 100)}
              min={5}
              max={500}
              step={5}
              className="h-8 w-16 text-xs bg-slate-700 border-slate-600 text-slate-200"
            />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onZoomIn} className="text-slate-300 hover:text-white hover:bg-slate-700">
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Zoom in</p></TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onResetView} className="text-slate-300 hover:text-white hover:bg-slate-700">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Reset view</p></TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onFitToArtboard} className="text-slate-300 hover:text-white hover:bg-slate-700" data-testid="button-fit-artboard">
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Fit Artboard</p></TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      
      {/* Canvas Container - Three Layered Canvases */}
      <div className="flex-1 relative bg-slate-900">
        {/* Layer 1: Infinite Canvas (background + grid) */}
        <canvas
          ref={infiniteCanvasRef}
          className="absolute inset-0"
          style={{ pointerEvents: 'none' }}
        />
        
        {/* Layer 2: Artboard (artboard background + border + grid) */}
        <canvas
          ref={artboardCanvasRef}
          className="absolute inset-0"
          style={{ pointerEvents: 'none' }}
        />
        
        {/* Layer 3: Shapes (transparent, compositing happens here, receives all interactions) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={(e) => handleWheel(e.nativeEvent)}
        />
        
        {/* Overlay Messages */}
        {isMultiSelectMode && (
          <div className="absolute top-4 left-4 bg-blue-500/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white">
            Multi-select mode: Tap shapes to add/remove from selection
          </div>
        )}
        
        {editMode !== 'shapes' && (
          <div className="absolute top-4 right-4 bg-purple-500/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white">
            {editMode === 'points' ? 'Point Edit Mode' : 'Segment Edit Mode'}
          </div>
        )}
      </div>
    </div>
  );
}