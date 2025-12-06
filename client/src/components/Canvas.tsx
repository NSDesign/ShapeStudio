import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NumericInput } from '@/components/ui/numeric-input';
import { MousePointer, ZoomIn, ZoomOut, RotateCcw, Maximize2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Shape, ShapeGroupClass } from '@/lib/shapes';
import { CanvasSettings, Artboard } from '@/lib/shapeTypes';
import { GenerationSet, DEFAULT_PRINT_CONFIG, PrintUnitType } from '@shared/schema';
import { renderSetToOffscreenCanvas, compositeSetCanvases } from '@/lib/offscreenRenderer';
import { getArtboardDisplayDimensions } from '@/lib/artboardUtils';

function convertPrintUnitToPixels(value: number, unit: PrintUnitType, dpi: number): number {
  switch (unit) {
    case 'pixels':
      return value;
    case 'mm':
      return (value / 25.4) * dpi;
    case 'cm':
      return (value / 2.54) * dpi;
    case 'inches':
      return value * dpi;
    default:
      return value;
  }
}


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
        
        // Print Configuration Overlays
        const printConfig = currentArtboard.printConfig || DEFAULT_PRINT_CONFIG;
        const artboardDpi = currentArtboard.dpi ?? 72;
        
        // Get unified overlay unit (with fallback for legacy projects)
        const overlayUnit = printConfig.overlays.overlayUnit || 'pixels';
        const unitLabel = overlayUnit === 'pixels' ? 'px' : overlayUnit;
        
        // Bleed Overlay (rectangle outside the artboard) - solid line
        if (printConfig.overlays.bleed.display && printConfig.overlays.bleed.amount > 0) {
          const bleedPx = convertPrintUnitToPixels(
            printConfig.overlays.bleed.amount,
            overlayUnit,
            artboardDpi
          );
          
          const bleedColor = printConfig.overlays.bleed.color || '#00FFFF';
          ctx.strokeStyle = bleedColor;
          ctx.lineWidth = 1.5 / effectiveZoom;
          ctx.setLineDash([]);  // Solid line
          ctx.strokeRect(
            currentArtboard.x - bleedPx,
            currentArtboard.y - bleedPx,
            currentArtboard.width + (bleedPx * 2),
            currentArtboard.height + (bleedPx * 2)
          );
          
          // Draw bleed label
          const labelFontSize = 10 / effectiveZoom;
          ctx.fillStyle = bleedColor;
          ctx.font = `${labelFontSize}px Arial`;
          ctx.fillText(
            `Bleed: ${printConfig.overlays.bleed.amount}${unitLabel}`,
            currentArtboard.x - bleedPx,
            currentArtboard.y - bleedPx - 4 / effectiveZoom
          );
        }
        
        // Safe Zone Overlay (rectangle inside the artboard) - solid line
        if (printConfig.overlays.safeZone.display && printConfig.overlays.safeZone.amount > 0) {
          const safeZonePx = convertPrintUnitToPixels(
            printConfig.overlays.safeZone.amount,
            overlayUnit,
            artboardDpi
          );
          
          const safeZoneColor = printConfig.overlays.safeZone.color || '#FF00FF';
          ctx.strokeStyle = safeZoneColor;
          ctx.lineWidth = 1.5 / effectiveZoom;
          ctx.setLineDash([]);  // Solid line
          ctx.strokeRect(
            currentArtboard.x + safeZonePx,
            currentArtboard.y + safeZonePx,
            currentArtboard.width - (safeZonePx * 2),
            currentArtboard.height - (safeZonePx * 2)
          );
          
          // Draw safe zone label
          const labelFontSize = 10 / effectiveZoom;
          ctx.fillStyle = safeZoneColor;
          ctx.font = `${labelFontSize}px Arial`;
          ctx.fillText(
            `Safe Zone: ${printConfig.overlays.safeZone.amount}${unitLabel}`,
            currentArtboard.x + safeZonePx,
            currentArtboard.y + safeZonePx + labelFontSize + 2 / effectiveZoom
          );
        }
        
        // Print Marks Overlay
        if (printConfig.overlays.printMarks.display) {
          const bleedPx = printConfig.overlays.bleed.amount > 0 
            ? convertPrintUnitToPixels(printConfig.overlays.bleed.amount, overlayUnit, artboardDpi)
            : 0;
          
          // Calculate mark length and offset based on scale mode
          const scaleMode = printConfig.overlays.printMarks.scaleMode || 'none';
          const minDimension = Math.min(currentArtboard.width, currentArtboard.height);
          
          let markLengthPx: number;
          let markOffsetPx: number;
          
          if (scaleMode === 'percent') {
            // Percentage mode: values are percentages of the smaller artboard dimension
            markLengthPx = (printConfig.overlays.printMarks.markLength / 100) * minDimension;
            markOffsetPx = (printConfig.overlays.printMarks.markOffset / 100) * minDimension;
          } else {
            // Default mode: convert from unified unit to pixels
            markLengthPx = convertPrintUnitToPixels(printConfig.overlays.printMarks.markLength, overlayUnit, artboardDpi);
            markOffsetPx = convertPrintUnitToPixels(printConfig.overlays.printMarks.markOffset, overlayUnit, artboardDpi);
          }
          
          const markLength = markLengthPx / effectiveZoom;
          const markOffset = markOffsetPx / effectiveZoom;
          const markStroke = 1 / effectiveZoom;
          
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = markStroke;
          ctx.setLineDash([]);
          
          // Crop Marks (corner marks at artboard edges, positioned outside the bleed area)
          if (printConfig.overlays.printMarks.cropMarks) {
            const corners = [
              { x: currentArtboard.x, y: currentArtboard.y, dx: -1, dy: -1 },
              { x: currentArtboard.x + currentArtboard.width, y: currentArtboard.y, dx: 1, dy: -1 },
              { x: currentArtboard.x, y: currentArtboard.y + currentArtboard.height, dx: -1, dy: 1 },
              { x: currentArtboard.x + currentArtboard.width, y: currentArtboard.y + currentArtboard.height, dx: 1, dy: 1 }
            ];
            
            corners.forEach(corner => {
              const offsetX = (bleedPx + markOffset) * corner.dx;
              const offsetY = (bleedPx + markOffset) * corner.dy;
              
              // Horizontal line
              ctx.beginPath();
              ctx.moveTo(corner.x + offsetX, corner.y + offsetY * 0);
              ctx.lineTo(corner.x + offsetX + (markLength * corner.dx), corner.y);
              ctx.stroke();
              
              // Vertical line
              ctx.beginPath();
              ctx.moveTo(corner.x + offsetX * 0, corner.y + offsetY);
              ctx.lineTo(corner.x, corner.y + offsetY + (markLength * corner.dy));
              ctx.stroke();
            });
          }
          
          // Registration Marks (crosshair marks at center of each edge)
          if (printConfig.overlays.printMarks.registrationMarks) {
            const regMarkSize = 8 / effectiveZoom;
            const regCircleRadius = 4 / effectiveZoom;
            const edgeCenters = [
              { x: currentArtboard.x + currentArtboard.width / 2, y: currentArtboard.y - bleedPx - markOffset - regMarkSize },
              { x: currentArtboard.x + currentArtboard.width / 2, y: currentArtboard.y + currentArtboard.height + bleedPx + markOffset + regMarkSize },
              { x: currentArtboard.x - bleedPx - markOffset - regMarkSize, y: currentArtboard.y + currentArtboard.height / 2 },
              { x: currentArtboard.x + currentArtboard.width + bleedPx + markOffset + regMarkSize, y: currentArtboard.y + currentArtboard.height / 2 }
            ];
            
            edgeCenters.forEach(center => {
              // Draw crosshair
              ctx.beginPath();
              ctx.moveTo(center.x - regMarkSize, center.y);
              ctx.lineTo(center.x + regMarkSize, center.y);
              ctx.stroke();
              
              ctx.beginPath();
              ctx.moveTo(center.x, center.y - regMarkSize);
              ctx.lineTo(center.x, center.y + regMarkSize);
              ctx.stroke();
              
              // Draw circle
              ctx.beginPath();
              ctx.arc(center.x, center.y, regCircleRadius, 0, Math.PI * 2);
              ctx.stroke();
            });
          }
        }
        
        // Artboard Info Container - rendered LAST to appear above all print overlays
        // Calculate topmost boundary considering bleed and print marks gutter
        const hasAnyInfoToDisplay = 
          currentArtboard.displayName !== false || 
          currentArtboard.displayDimensions === true || 
          currentArtboard.displayResolution === true;
        
        if (hasAnyInfoToDisplay) {
          // Calculate bleed amount in pixels (already in world-space)
          const bleedPxForInfo = printConfig.overlays.bleed.display && printConfig.overlays.bleed.amount > 0
            ? convertPrintUnitToPixels(printConfig.overlays.bleed.amount, overlayUnit, artboardDpi)
            : 0;
          
          // Calculate print marks gutter in world-space (matching how marks are drawn)
          // Marks are drawn with lengths/offsets scaled by 1/effectiveZoom, so we need to match
          let printMarksGutter = 0;
          if (printConfig.overlays.printMarks.display) {
            const scaleMode = printConfig.overlays.printMarks.scaleMode || 'none';
            const minDimension = Math.min(currentArtboard.width, currentArtboard.height);
            
            let markLengthPxInfo: number;
            let markOffsetPxInfo: number;
            
            if (scaleMode === 'percent') {
              markLengthPxInfo = (printConfig.overlays.printMarks.markLength / 100) * minDimension;
              markOffsetPxInfo = (printConfig.overlays.printMarks.markOffset / 100) * minDimension;
            } else {
              markLengthPxInfo = convertPrintUnitToPixels(printConfig.overlays.printMarks.markLength, overlayUnit, artboardDpi);
              markOffsetPxInfo = convertPrintUnitToPixels(printConfig.overlays.printMarks.markOffset, overlayUnit, artboardDpi);
            }
            
            // Registration marks use 8px base size scaled by zoom
            const regMarkSizeBase = printConfig.overlays.printMarks.registrationMarks ? 8 : 0;
            // Scale gutter to match drawn mark dimensions (marks are drawn at 1/effectiveZoom scale)
            printMarksGutter = (markOffsetPxInfo + markLengthPxInfo + regMarkSizeBase) / effectiveZoom;
          }
          
          // Topmost Y position (above all overlays)
          const topBoundary = currentArtboard.y - bleedPxForInfo - printMarksGutter;
          
          // Container styling
          const fontSize = 11 / effectiveZoom;
          const lineHeight = fontSize * 1.4;
          const paddingX = 8 / effectiveZoom;
          const paddingY = 6 / effectiveZoom;
          const borderRadius = 4 / effectiveZoom;
          const containerGap = 6 / effectiveZoom;
          
          // Collect lines to display
          const infoLines: string[] = [];
          
          if (currentArtboard.displayName !== false) {
            infoLines.push(currentArtboard.name);
          }
          
          if (currentArtboard.displayDimensions === true) {
            const displayDims = getArtboardDisplayDimensions(
              currentArtboard.width,
              currentArtboard.height,
              currentArtboard.dpi ?? 72,
              currentArtboard.unitType ?? 'pixels'
            );
            infoLines.push(`${displayDims.widthFormatted} × ${displayDims.heightFormatted}`);
          }
          
          if (currentArtboard.displayResolution === true) {
            const dpi = currentArtboard.dpi ?? 72;
            infoLines.push(`${dpi} DPI`);
          }
          
          // Calculate container dimensions
          ctx.font = `${fontSize}px Arial`;
          let maxTextWidth = 0;
          infoLines.forEach(line => {
            const metrics = ctx.measureText(line);
            if (metrics.width > maxTextWidth) maxTextWidth = metrics.width;
          });
          
          const containerWidth = maxTextWidth + (paddingX * 2);
          const containerHeight = (infoLines.length * lineHeight) + (paddingY * 2) - (lineHeight - fontSize);
          
          // Position container at top-right, above all overlays
          const containerX = currentArtboard.x + currentArtboard.width - containerWidth;
          const containerY = topBoundary - containerHeight - containerGap;
          
          // Determine background color based on artboard brightness
          const bgColor = currentArtboard.backgroundColor || '#ffffff';
          const r = parseInt(bgColor.slice(1, 3), 16);
          const g = parseInt(bgColor.slice(3, 5), 16);
          const b = parseInt(bgColor.slice(5, 7), 16);
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          
          // Use dark container on light backgrounds, light container on dark backgrounds
          const isLightBg = brightness > 128;
          const containerBgColor = isLightBg ? 'rgba(30, 41, 59, 0.85)' : 'rgba(241, 245, 249, 0.9)';
          const textColor = isLightBg ? '#f1f5f9' : '#1e293b';
          
          // Draw rounded rectangle container
          ctx.fillStyle = containerBgColor;
          ctx.beginPath();
          ctx.moveTo(containerX + borderRadius, containerY);
          ctx.lineTo(containerX + containerWidth - borderRadius, containerY);
          ctx.quadraticCurveTo(containerX + containerWidth, containerY, containerX + containerWidth, containerY + borderRadius);
          ctx.lineTo(containerX + containerWidth, containerY + containerHeight - borderRadius);
          ctx.quadraticCurveTo(containerX + containerWidth, containerY + containerHeight, containerX + containerWidth - borderRadius, containerY + containerHeight);
          ctx.lineTo(containerX + borderRadius, containerY + containerHeight);
          ctx.quadraticCurveTo(containerX, containerY + containerHeight, containerX, containerY + containerHeight - borderRadius);
          ctx.lineTo(containerX, containerY + borderRadius);
          ctx.quadraticCurveTo(containerX, containerY, containerX + borderRadius, containerY);
          ctx.closePath();
          ctx.fill();
          
          // Draw text inside container
          ctx.fillStyle = textColor;
          ctx.font = `${fontSize}px Arial`;
          ctx.textAlign = 'right';
          
          let textY = containerY + paddingY + fontSize;
          infoLines.forEach(line => {
            ctx.fillText(line, containerX + containerWidth - paddingX, textY);
            textY += lineHeight;
          });
          
          // Reset text alignment
          ctx.textAlign = 'left';
        }
      }

      ctx.restore();
    };

    // Debug Grid Overlay: Shows distribution grid for debugging cell vs point rendering
    // Renders on the shapes canvas (canvasRef) so it appears on TOP of all shapes
    const renderDebugGrid = () => {
      // Check if any generation set has debug grid enabled
      const activeSet = generationSets?.find(set => set.enabled && set.batchConfig?.cellConstraints?.showDebugGrid);
      if (!activeSet) return;
      
      const batchConfig = activeSet.batchConfig;
      if (!batchConfig || !batchConfig.distributionLayoutEnabled || batchConfig.distributionPattern !== 'grid') return;
      
      const currentArtboard = artboards.find(a => a.id === activeArtboard);
      if (!currentArtboard) return;
      
      // Use canvasRef (shapes layer) instead of artboardCanvasRef so debug grid appears on top of shapes
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
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
      
      const rows = batchConfig.gridRows;
      const columns = batchConfig.gridColumns;
      const artboardBounds = {
        x: currentArtboard.x,
        y: currentArtboard.y,
        width: currentArtboard.width,
        height: currentArtboard.height
      };
      
      // Calculate spacing and start position matching calculateGridPosition logic
      // Note: calculateGridPosition uses centerX/centerY which is typically 0
      const centerX = 0;
      const centerY = 0;
      const marginEnabled = batchConfig.gridMarginEnabled ?? false;
      const marginValue = batchConfig.gridMarginValue ?? 50;
      
      let spacingX = batchConfig.gridColumnOffset;
      let spacingY = batchConfig.gridRowOffset;
      let startX = centerX - ((columns - 1) * spacingX) / 2;
      let startY = centerY - ((rows - 1) * spacingY) / 2;
      let ignoreGridStartX = false;
      let ignoreGridStartY = false;
      
      // Handle X spacing mode (matching calculateGridPosition)
      if (batchConfig.gridSpacingXMode === 'auto-centered') {
        ignoreGridStartX = true;
        if (marginEnabled) {
          const availableWidth = artboardBounds.width - (2 * marginValue);
          spacingX = columns > 1 ? availableWidth / (columns - 1) : 0;
          startX = artboardBounds.x - centerX + marginValue;
        } else {
          spacingX = artboardBounds.width / (columns + 1);
          startX = artboardBounds.x - centerX + spacingX;
        }
      } else if (batchConfig.gridSpacingXMode === 'auto-edge-to-edge') {
        ignoreGridStartX = true;
        spacingX = columns > 1 ? artboardBounds.width / (columns - 1) : 0;
        startX = artboardBounds.x - centerX;
      }
      
      // Handle Y spacing mode (matching calculateGridPosition)
      if (batchConfig.gridSpacingYMode === 'auto-centered') {
        ignoreGridStartY = true;
        if (marginEnabled) {
          const availableHeight = artboardBounds.height - (2 * marginValue);
          spacingY = rows > 1 ? availableHeight / (rows - 1) : 0;
          startY = artboardBounds.y - centerY + marginValue;
        } else {
          spacingY = artboardBounds.height / (rows + 1);
          startY = artboardBounds.y - centerY + spacingY;
        }
      } else if (batchConfig.gridSpacingYMode === 'auto-edge-to-edge') {
        ignoreGridStartY = true;
        spacingY = rows > 1 ? artboardBounds.height / (rows - 1) : 0;
        startY = artboardBounds.y - centerY;
      }
      
      // Apply grid start offsets if not using auto modes
      if (!ignoreGridStartX) {
        startX += batchConfig.gridStartX || 0;
      }
      if (!ignoreGridStartY) {
        startY += batchConfig.gridStartY || 0;
      }
      
      const cellConstraints = batchConfig.cellConstraints;
      const isCellMode = cellConstraints?.renderMode === 'cell';
      const isCellPointMode = cellConstraints?.renderMode === 'cell-point';
      const hasFitConstraints = isCellMode || isCellPointMode;
      
      // Draw grid lines (red semi-transparent)
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
      ctx.lineWidth = 1 / effectiveZoom;
      ctx.setLineDash([]);
      
      // Draw vertical lines at each column position
      for (let col = 0; col < columns; col++) {
        const x = startX + (col * spacingX);
        ctx.beginPath();
        ctx.moveTo(x, artboardBounds.y);
        ctx.lineTo(x, artboardBounds.y + artboardBounds.height);
        ctx.stroke();
      }
      
      // Draw horizontal lines at each row position
      for (let row = 0; row < rows; row++) {
        const y = startY + (row * spacingY);
        ctx.beginPath();
        ctx.moveTo(artboardBounds.x, y);
        ctx.lineTo(artboardBounds.x + artboardBounds.width, y);
        ctx.stroke();
      }
      
      // Position count depends on mode:
      // - Cell mode: cells are BETWEEN the lines, (rows-1) × (cols-1) cells
      // - Point/Cell-Point mode: shapes at intersection points, rows × cols positions
      const effectiveRows = isCellMode ? Math.max(1, rows - 1) : rows;
      const effectiveCols = isCellMode ? Math.max(1, columns - 1) : columns;
      
      // Draw cell boundaries based on mode
      if (hasFitConstraints && spacingX > 0 && spacingY > 0) {
        ctx.strokeStyle = 'rgba(255, 100, 0, 0.3)';
        ctx.lineWidth = 2 / effectiveZoom;
        ctx.setLineDash([4 / effectiveZoom, 4 / effectiveZoom]);
        
        if (isCellMode) {
          // Cell mode: cells are BETWEEN intersection points (top-left corner at intersection)
          for (let row = 0; row < effectiveRows; row++) {
            for (let col = 0; col < effectiveCols; col++) {
              const x = startX + (col * spacingX);
              const y = startY + (row * spacingY);
              ctx.strokeRect(x, y, spacingX, spacingY);
            }
          }
        } else if (isCellPointMode) {
          // Cell Points mode: cells CENTERED on intersection points
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
              const x = startX + (col * spacingX);
              const y = startY + (row * spacingY);
              // Draw cell rectangle centered on the intersection point
              ctx.strokeRect(x - spacingX / 2, y - spacingY / 2, spacingX, spacingY);
            }
          }
        }
        ctx.setLineDash([]);
      }
      
      // Draw markers at grid positions
      const markerSize = 6 / effectiveZoom;
      
      if (isCellMode) {
        // Cell mode: draw cross at cell centers (between intersection points)
        for (let row = 0; row < effectiveRows; row++) {
          for (let col = 0; col < effectiveCols; col++) {
            // Cell center is at intersection point + half spacing
            const x = startX + (col * spacingX) + spacingX / 2;
            const y = startY + (row * spacingY) + spacingY / 2;
            
            ctx.strokeStyle = 'rgba(0, 200, 0, 0.8)';
            ctx.lineWidth = 2 / effectiveZoom;
            ctx.beginPath();
            ctx.moveTo(x - markerSize, y);
            ctx.lineTo(x + markerSize, y);
            ctx.moveTo(x, y - markerSize);
            ctx.lineTo(x, y + markerSize);
            ctx.stroke();
          }
        }
      } else if (isCellPointMode) {
        // Cell Points mode: draw cross at intersection points (they're both cell centers AND grid points)
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < columns; col++) {
            const x = startX + (col * spacingX);
            const y = startY + (row * spacingY);
            
            // Draw cell-style cross marker (green)
            ctx.strokeStyle = 'rgba(0, 200, 0, 0.8)';
            ctx.lineWidth = 2 / effectiveZoom;
            ctx.beginPath();
            ctx.moveTo(x - markerSize, y);
            ctx.lineTo(x + markerSize, y);
            ctx.moveTo(x, y - markerSize);
            ctx.lineTo(x, y + markerSize);
            ctx.stroke();
            
            // Also draw a small point marker (to show it's on the grid intersection)
            ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
            ctx.beginPath();
            ctx.arc(x, y, markerSize / 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        // Point mode: draw filled circle at intersection points
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < columns; col++) {
            const x = startX + (col * spacingX);
            const y = startY + (row * spacingY);
            
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.beginPath();
            ctx.arc(x, y, markerSize / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      
      // Draw mode label
      ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
      ctx.font = `${12 / effectiveZoom}px Arial`;
      let modeLabel: string;
      let positionCount: string;
      if (isCellMode) {
        modeLabel = 'Cell Mode';
        positionCount = `${effectiveRows}×${effectiveCols} cells`;
      } else if (isCellPointMode) {
        modeLabel = 'Cell Points Mode';
        positionCount = `${rows}×${columns} cells at points`;
      } else {
        modeLabel = 'Point Mode';
        positionCount = `${rows}×${columns} points`;
      }
      ctx.fillText(
        `DEBUG: ${modeLabel} | ${positionCount}`,
        artboardBounds.x + 5 / effectiveZoom,
        artboardBounds.y + artboardBounds.height - 5 / effectiveZoom
      );
      
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
        renderDebugGrid(); // Debug grid overlay - rendered LAST to appear on top of all shapes
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
              value={Math.round((canvasSettings.zoom || 1) * 100)}
              onChange={(value) => onZoomChange(value / 100)}
              min={5}
              max={500}
              step={5}
              className="h-8 w-16 text-xs bg-slate-700 border-slate-600 text-slate-200 pt-[0px] pb-[0px] pl-[10px] pr-[10px]"
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