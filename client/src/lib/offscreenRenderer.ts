import { Shape } from './shapes';
import { GenerationSet } from '@shared/schema';

interface RenderContext {
  width: number;
  height: number;
  dpr: number;
  panX: number;
  panY: number;
  zoom: number;
}

/**
 * Renders a Generation Set's shapes to an isolated offscreen canvas
 * with shape-level blend modes applied.
 * 
 * This function creates a temporary rendering surface for a set, allowing
 * set-level compositing operations to be applied to the entire group.
 */
export function renderSetToOffscreenCanvas(
  set: GenerationSet,
  shapes: Shape[],
  renderContext: RenderContext
): HTMLCanvasElement {
  const { width, height, dpr, panX, panY, zoom } = renderContext;
  
  // Create offscreen canvas with same dimensions as target
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = width * dpr;
  offscreenCanvas.height = height * dpr;
  
  const ctx = offscreenCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context from offscreen canvas');
  }
  
  // Apply device pixel ratio scaling (matches main canvas init)
  ctx.scale(dpr, dpr);
  
  // Center the canvas (matches main canvas render loop)
  ctx.translate(width / 2, height / 2);
  
  // Apply zoom and pan transforms (matches main canvas render loop)
  ctx.scale(zoom, zoom);
  ctx.translate(panX, panY);
  
  // Sort shapes by z-index for proper layering within the set
  const sortedShapes = [...shapes].sort((a, b) => a.properties.zIndex - b.properties.zIndex);
  
  // Render each shape with its individual blend mode
  sortedShapes.forEach(shape => {
    shape.render(ctx);
  });
  
  return offscreenCanvas;
}

/**
 * Composites multiple Generation Set canvases onto a target canvas
 * with set-level compositing operations and blend modes.
 * 
 * This function implements the hierarchical compositing system:
 * - Inner level: Shape blend modes (already applied in offscreen canvases)
 * - Outer level: Set compositing operations (applied here)
 */
export function compositeSetCanvases(
  targetCtx: CanvasRenderingContext2D,
  setCanvases: Array<{
    canvas: HTMLCanvasElement;
    set: GenerationSet;
  }>
) {
  // Sort by generation order
  const sortedSets = [...setCanvases].sort((a, b) => 
    a.set.generationOrder - b.set.generationOrder
  );
  
  // Composite each set canvas onto the target
  sortedSets.forEach(({ canvas, set }) => {
    // Determine effective compositing operation
    // Compositing operation takes precedence over blend mode
    const effectiveOperation = (set.compositingOperation && set.compositingOperation !== 'source-over')
      ? set.compositingOperation
      : set.setBlendMode || 'source-over';
    
    // Apply set-level compositing operation
    targetCtx.globalCompositeOperation = effectiveOperation as GlobalCompositeOperation;
    
    // Draw the entire set canvas
    targetCtx.drawImage(canvas, 0, 0);
    
    // Reset to default for next iteration
    targetCtx.globalCompositeOperation = 'source-over';
  });
}
