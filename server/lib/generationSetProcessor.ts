/**
 * Generation Set Processor for Server-side Multi-Set Generation
 * Ported from client/src/hooks/useShapeEditor.ts (generateRandomShapes function)
 * and client/src/lib/offscreenRenderer.ts (compositing logic)
 * 
 * This module handles:
 * - Multi-set generation with layering
 * - Z-index offsets (generationOrder × 1000)
 * - Set transforms (translation, rotation, scaling)
 * - Artboard alignment (fit-to-artboard, 9-point alignment)
 * - Set visibility and opacity
 * - Offscreen rendering and compositing
 * - Blend modes and compositing operations
 */

import { Shape } from './shapeGenerator';
import { generateShapesWithBatchConfig } from './batchConfigProcessor';
import { renderShape } from './canvasRenderer';
import { createCanvas, Canvas, CanvasRenderingContext2D } from 'canvas';
import type { GenerationSet, SetTransform, ArtboardAlignment, SetVisibility } from '../../shared/schema';
import type { ShapeType, DistributionSettings } from '../../client/src/lib/shapeTypes';

interface ArtboardSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor?: string;
}

interface ExportSettings {
  width: number;
  height: number;
  scale?: number;
  dpr?: number;
}

interface ProcessGenerationSetsResult {
  shapes: Shape[];
  canvas: Canvas;
}

interface RenderContext {
  width: number;
  height: number;
  dpr: number;
}

/**
 * Main function to process generation sets and create a final composited canvas
 * 
 * @param sets - Array of generation sets to process
 * @param artboardSettings - Artboard dimensions and properties
 * @param exportSettings - Export/rendering settings
 * @returns Object containing all generated shapes and final composited canvas
 */
export function processGenerationSets(
  sets: GenerationSet[],
  artboardSettings: ArtboardSettings,
  exportSettings: ExportSettings
): ProcessGenerationSetsResult {
  // Filter and sort enabled sets by generation order
  const enabledSets = sets
    .filter(set => set.enabled)
    .sort((a, b) => a.generationOrder - b.generationOrder);

  if (enabledSets.length === 0) {
    // No enabled sets, return empty result
    const canvas = createCanvas(exportSettings.width, exportSettings.height);
    return { shapes: [], canvas };
  }

  // Canvas bounds for shape placement
  const canvasBounds = {
    x: artboardSettings.x,
    y: artboardSettings.y,
    width: artboardSettings.width,
    height: artboardSettings.height
  };

  // Render context for offscreen canvases
  const dpr = exportSettings.dpr || 1;
  const renderContext: RenderContext = {
    width: exportSettings.width,
    height: exportSettings.height,
    dpr
  };

  // Generate shapes for each enabled set
  const allShapes: Shape[] = [];
  const setCanvases: Array<{ canvas: Canvas; set: GenerationSet }> = [];

  enabledSets.forEach((set, setIndex) => {
    console.log(`🎯 [SERVER] Processing generation set "${set.name}" (order: ${set.generationOrder})`);

    // Calculate shape count for this set
    const setCount = set.shapeCountMode === 'fixed' 
      ? set.shapeCountFixed
      : Math.floor(Math.random() * (set.shapeCountRange[1] - set.shapeCountRange[0] + 1)) + set.shapeCountRange[0];

    console.log(`🎯 [SERVER] Generating ${setCount} shapes for set "${set.name}" (${set.shapeCountMode} mode)`);

    // Generate shapes for this set
    // Convert shapeSpecificProperties to scatterSettings format (matching client logic)
    const scatterSettings = {
      distribution: {
        pattern: 'random' as const,
        spacing: 50,
        randomness: 0.3,
        rotation: 0,
        scale: 1,
        density: 0.5,
        avoidOverlap: false,
        respectBounds: true
      } as DistributionSettings,
      shapeSpecific: set.shapeSpecificProperties || {}
    };
    
    const setShapes = generateShapesWithBatchConfig(
      setCount,
      canvasBounds,
      {
        enabledShapeTypes: set.enabledShapeTypes as ShapeType[],
        batchConfig: set.batchConfig,
        distributionEnabled: true,
        scatterSettings: scatterSettings
      }
    );

    // Apply z-index offset based on generation order (1000x spacing ensures sets never overlap)
    setShapes.forEach(shape => {
      shape.properties.zIndex += set.generationOrder * 1000;
    });

    console.log(`🔍 [SERVER] Applied z-index offset: ${set.generationOrder * 1000} to ${setShapes.length} shapes`);

    // Apply set visibility and opacity
    applySetVisibility(setShapes, set.setVisibility, set.name);

    // Apply set transform if configured
    applySetTransform(setShapes, set.setTransform, set.name);

    // Apply artboard alignment if configured
    applyArtboardAlignment(setShapes, set.artboardAlignment, artboardSettings, set.name);

    // Render this set to an offscreen canvas
    const setCanvas = renderSetToOffscreenCanvas(set, setShapes, renderContext, artboardSettings);
    
    setCanvases.push({ canvas: setCanvas, set });
    allShapes.push(...setShapes);
  });

  console.log(`✅ [SERVER] Generated total of ${allShapes.length} shapes from ${enabledSets.length} generation sets`);

  // Create final composite canvas
  const finalCanvas = createCanvas(exportSettings.width, exportSettings.height);
  const finalCtx = finalCanvas.getContext('2d');

  // Fill background
  if (artboardSettings.backgroundColor) {
    finalCtx.fillStyle = artboardSettings.backgroundColor;
    finalCtx.fillRect(0, 0, exportSettings.width, exportSettings.height);
  }

  // Composite all set canvases onto final canvas
  compositeSetCanvases(finalCtx, setCanvases);

  return {
    shapes: allShapes,
    canvas: finalCanvas
  };
}

/**
 * Apply set visibility and opacity to all shapes in a set
 * 
 * @param shapes - Array of shapes in the set
 * @param visibility - Set visibility configuration
 * @param setName - Name of the set (for logging)
 */
function applySetVisibility(
  shapes: Shape[],
  visibility: SetVisibility | undefined,
  setName: string
): void {
  // If no visibility config, shapes are visible with default opacity
  if (!visibility) {
    return;
  }
  
  if (!visibility.visible) {
    console.log(`👁️ [SERVER] Set "${setName}" is hidden, shapes will be skipped during render`);
    return;
  }
  
  if (visibility.opacity < 1 || visibility.opacityVariance > 0) {
    console.log(`🌫️ [SERVER] Applying set opacity ${visibility.opacity} with variance ${visibility.opacityVariance} to set "${setName}"`);
    
    shapes.forEach(shape => {
      const variance = (Math.random() - 0.5) * 2 * visibility.opacityVariance;
      const finalOpacity = Math.max(0, Math.min(1, visibility.opacity + variance));
      
      // Apply to both fill and stroke opacity
      shape.properties.fillOpacity *= finalOpacity;
      shape.properties.strokeOpacity *= finalOpacity;
    });
  }
}

/**
 * Apply set-level transform to all shapes in a set
 * Handles translation, rotation, and scaling
 * 
 * @param shapes - Array of shapes in the set
 * @param transform - Set transform configuration
 * @param setName - Name of the set (for logging)
 */
function applySetTransform(
  shapes: Shape[],
  transform: SetTransform,
  setName: string
): void {
  if (!transform) return;

  // Check if any transforms are non-default
  const hasTransform = transform.x !== 0 || transform.y !== 0 || 
    transform.rotation !== 0 || transform.scaleX !== 1 || transform.scaleY !== 1;

  if (!hasTransform) return;

  console.log(`🔄 [SERVER] Applying setTransform to set "${setName}": x=${transform.x}, y=${transform.y}, rotation=${transform.rotation}, scaleX=${transform.scaleX}, scaleY=${transform.scaleY}`);
  
  shapes.forEach(shape => {
    // Apply translation
    shape.transform.x += transform.x;
    shape.transform.y += transform.y;
    
    // Apply rotation
    shape.transform.rotation += transform.rotation;
    
    // Apply scale
    shape.transform.scaleX *= transform.scaleX;
    shape.transform.scaleY *= transform.scaleY;
  });
}

/**
 * Apply artboard alignment to all shapes in a set
 * Supports fit-to-artboard and 9-point alignment
 * 
 * @param shapes - Array of shapes in the set
 * @param alignment - Artboard alignment configuration
 * @param artboard - Artboard settings
 * @param setName - Name of the set (for logging)
 */
function applyArtboardAlignment(
  shapes: Shape[],
  alignment: ArtboardAlignment,
  artboard: ArtboardSettings,
  setName: string
): void {
  if (!alignment || shapes.length === 0) return;

  if (alignment.fitToArtboard) {
    console.log(`📐 [SERVER] Applying fitToArtboard for set "${setName}"`);
    
    // Calculate bounding box of all shapes in this set using world bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    shapes.forEach(shape => {
      // Calculate world bounds for shape
      const x = shape.transform.x;
      const y = shape.transform.y;
      const halfWidth = (shape.width || 50) / 2;
      const halfHeight = (shape.height || 50) / 2;
      
      minX = Math.min(minX, x - halfWidth);
      minY = Math.min(minY, y - halfHeight);
      maxX = Math.max(maxX, x + halfWidth);
      maxY = Math.max(maxY, y + halfHeight);
    });
    
    const setBoundsWidth = maxX - minX;
    const setBoundsHeight = maxY - minY;
    const setCenterX = (minX + maxX) / 2;
    const setCenterY = (minY + maxY) / 2;
    
    // Calculate scale to fit within artboard with margin
    const margin = alignment.margin || 0;
    const availableWidth = artboard.width - (margin * 2);
    const availableHeight = artboard.height - (margin * 2);
    
    const scaleX = availableWidth / setBoundsWidth;
    const scaleY = availableHeight / setBoundsHeight;
    const fitScale = Math.min(scaleX, scaleY);
    
    // Apply scale and center to artboard
    shapes.forEach(shape => {
      // Scale relative to set center
      const relX = shape.transform.x - setCenterX;
      const relY = shape.transform.y - setCenterY;
      
      shape.transform.x = artboard.x + artboard.width / 2 + (relX * fitScale);
      shape.transform.y = artboard.y + artboard.height / 2 + (relY * fitScale);
      shape.transform.scaleX *= fitScale;
      shape.transform.scaleY *= fitScale;
    });
    
    console.log(`✅ [SERVER] Fitted set to artboard with scale=${fitScale.toFixed(2)}`);
  } else if (alignment.alignTo !== 'none') {
    console.log(`🎯 [SERVER] Applying alignment for set "${setName}": ${alignment.alignmentType}`);
    
    // Calculate bounding box center
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    shapes.forEach(shape => {
      const x = shape.transform.x;
      const y = shape.transform.y;
      const halfWidth = (shape.width || 50) / 2;
      const halfHeight = (shape.height || 50) / 2;
      
      minX = Math.min(minX, x - halfWidth);
      minY = Math.min(minY, y - halfHeight);
      maxX = Math.max(maxX, x + halfWidth);
      maxY = Math.max(maxY, y + halfHeight);
    });
    
    const setCenterX = (minX + maxX) / 2;
    const setCenterY = (minY + maxY) / 2;
    const margin = alignment.margin || 0;
    
    // Calculate target position based on alignment type
    let targetX = artboard.x + artboard.width / 2;
    let targetY = artboard.y + artboard.height / 2;
    
    switch (alignment.alignmentType) {
      case 'top-left':
        targetX = artboard.x + margin;
        targetY = artboard.y + margin;
        break;
      case 'top-center':
        targetX = artboard.x + artboard.width / 2;
        targetY = artboard.y + margin;
        break;
      case 'top-right':
        targetX = artboard.x + artboard.width - margin;
        targetY = artboard.y + margin;
        break;
      case 'center-left':
        targetX = artboard.x + margin;
        targetY = artboard.y + artboard.height / 2;
        break;
      case 'center':
        targetX = artboard.x + artboard.width / 2;
        targetY = artboard.y + artboard.height / 2;
        break;
      case 'center-right':
        targetX = artboard.x + artboard.width - margin;
        targetY = artboard.y + artboard.height / 2;
        break;
      case 'bottom-left':
        targetX = artboard.x + margin;
        targetY = artboard.y + artboard.height - margin;
        break;
      case 'bottom-center':
        targetX = artboard.x + artboard.width / 2;
        targetY = artboard.y + artboard.height - margin;
        break;
      case 'bottom-right':
        targetX = artboard.x + artboard.width - margin;
        targetY = artboard.y + artboard.height - margin;
        break;
    }
    
    // Calculate offset and apply to all shapes
    const offsetX = targetX - setCenterX;
    const offsetY = targetY - setCenterY;
    
    shapes.forEach(shape => {
      shape.transform.x += offsetX;
      shape.transform.y += offsetY;
    });
    
    console.log(`✅ [SERVER] Aligned set to ${alignment.alignmentType} with offset (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`);
  }
}

/**
 * Render a generation set's shapes to an isolated offscreen canvas
 * with shape-level blend modes applied
 * 
 * Ported from client/src/lib/offscreenRenderer.ts
 * 
 * @param set - Generation set configuration
 * @param shapes - Array of shapes to render
 * @param renderContext - Rendering context (dimensions, DPR)
 * @param artboard - Artboard settings for centering
 * @returns Offscreen canvas with rendered shapes
 */
function renderSetToOffscreenCanvas(
  set: GenerationSet,
  shapes: Shape[],
  renderContext: RenderContext,
  artboard: ArtboardSettings
): Canvas {
  const { width, height, dpr } = renderContext;
  
  // Create offscreen canvas with same dimensions as target
  const offscreenCanvas = createCanvas(width * dpr, height * dpr);
  const ctx = offscreenCanvas.getContext('2d');
  
  // Apply device pixel ratio scaling
  ctx.scale(dpr, dpr);
  
  // Center the canvas (translate to center)
  ctx.translate(width / 2, height / 2);
  
  // Sort shapes by z-index for proper layering within the set
  const sortedShapes = [...shapes].sort((a, b) => a.properties.zIndex - b.properties.zIndex);
  
  // Render each shape with its individual blend mode
  sortedShapes.forEach(shape => {
    renderShape(ctx, shape, true); // Skip selection adornments
  });
  
  return offscreenCanvas;
}

/**
 * Composite multiple generation set canvases onto a target canvas
 * with set-level compositing operations and blend modes
 * 
 * Ported from client/src/lib/offscreenRenderer.ts
 * 
 * Implements hierarchical compositing:
 * - Inner level: Shape blend modes (already applied in offscreen canvases)
 * - Outer level: Set compositing operations (applied here)
 * 
 * @param targetCtx - Target canvas context to composite onto
 * @param setCanvases - Array of set canvases with their configurations
 */
function compositeSetCanvases(
  targetCtx: CanvasRenderingContext2D,
  setCanvases: Array<{ canvas: Canvas; set: GenerationSet }>
): void {
  // Sort by generation order (should already be sorted, but ensure it)
  const sortedSets = [...setCanvases].sort((a, b) => 
    a.set.generationOrder - b.set.generationOrder
  );
  
  // Composite each set canvas onto the target
  sortedSets.forEach(({ canvas, set }) => {
    // Skip invisible sets (if visibility config exists and visible is false)
    if (set.setVisibility && !set.setVisibility.visible) {
      console.log(`⏭️ [SERVER] Skipping invisible set "${set.name}"`);
      return;
    }

    // Determine effective compositing operation
    // Compositing operation takes precedence over blend mode
    const effectiveOperation = (set.compositingOperation && set.compositingOperation !== 'source-over')
      ? set.compositingOperation
      : set.setBlendMode || 'source-over';
    
    console.log(`🎨 [SERVER] Compositing set "${set.name}" with operation: ${effectiveOperation}`);
    
    // Apply set-level compositing operation
    targetCtx.globalCompositeOperation = effectiveOperation as GlobalCompositeOperation;
    
    // Draw the entire set canvas at origin (already centered in offscreen canvas)
    targetCtx.drawImage(canvas, 0, 0);
    
    // Reset to default for next iteration
    targetCtx.globalCompositeOperation = 'source-over';
  });
  
  console.log(`✅ [SERVER] Composited ${sortedSets.length} generation sets`);
}
