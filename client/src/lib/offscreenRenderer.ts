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
  // Skip selection adornments to prevent them from being included in compositing operations
  sortedShapes.forEach(shape => {
    shape.render(ctx, true);
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
 * 
 * Composite Lock Support (Read-Only Locking):
 * - Locked sets are protected from modification but remain readable by other operations
 * - All sets render in generation order (locked and unlocked interleaved)
 * - After each unlocked set composites, locked pixels are selectively restored
 * - This allows operations like destination-over, source-atop to read from locked layers
 *   while preventing them from modifying locked pixels
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
  
  // Check if any sets are locked
  const hasLockedSets = sortedSets.some(({ set }) => set.locks?.composite === true);
  
  // If no locked sets, use simple compositing path
  if (!hasLockedSets) {
    sortedSets.forEach(({ canvas, set }) => {
      const effectiveOperation = (set.compositingOperation && set.compositingOperation !== 'source-over')
        ? set.compositingOperation
        : set.setBlendMode || 'source-over';
      
      targetCtx.globalCompositeOperation = effectiveOperation as GlobalCompositeOperation;
      targetCtx.drawImage(canvas, 0, 0);
      targetCtx.globalCompositeOperation = 'source-over';
    });
    return;
  }
  
  // Buffers for read-only locking
  const lockedSnapshot = document.createElement('canvas');
  lockedSnapshot.width = targetCtx.canvas.width;
  lockedSnapshot.height = targetCtx.canvas.height;
  const lockedSnapshotCtx = lockedSnapshot.getContext('2d')!;
  
  const lockedMask = document.createElement('canvas');
  lockedMask.width = targetCtx.canvas.width;
  lockedMask.height = targetCtx.canvas.height;
  const lockedMaskCtx = lockedMask.getContext('2d')!;
  
  // Render all sets in order
  for (const { canvas, set } of sortedSets) {
    const isLocked = set.locks?.composite === true;
    
    if (isLocked) {
      // Locked set: render and update buffers
      targetCtx.globalCompositeOperation = 'source-over';
      targetCtx.drawImage(canvas, 0, 0);
      
      // Save current target state as locked snapshot
      lockedSnapshotCtx.clearRect(0, 0, lockedSnapshot.width, lockedSnapshot.height);
      lockedSnapshotCtx.drawImage(targetCtx.canvas, 0, 0);
      
      // Update locked mask
      lockedMaskCtx.globalCompositeOperation = 'source-over';
      lockedMaskCtx.drawImage(canvas, 0, 0);
    } else {
      // Unlocked set: composite operation with locked pixel protection
      const effectiveOperation = (set.compositingOperation && set.compositingOperation !== 'source-over')
        ? set.compositingOperation
        : set.setBlendMode || 'source-over';
      
      // Step 1: Capture "before" state for delta calculation
      const beforeCanvas = document.createElement('canvas');
      beforeCanvas.width = targetCtx.canvas.width;
      beforeCanvas.height = targetCtx.canvas.height;
      const beforeCtx = beforeCanvas.getContext('2d')!;
      beforeCtx.drawImage(targetCtx.canvas, 0, 0);
      
      // Step 2: Apply unlocked composite operation (can read from locked pixels)
      targetCtx.globalCompositeOperation = effectiveOperation as GlobalCompositeOperation;
      targetCtx.drawImage(canvas, 0, 0);
      
      // Step 3: Extract unlocked delta (changes in unlocked regions only)
      // Create inverted mask (opaque where unlocked, transparent where locked)
      const invertedMask = document.createElement('canvas');
      invertedMask.width = targetCtx.canvas.width;
      invertedMask.height = targetCtx.canvas.height;
      const invertedMaskCtx = invertedMask.getContext('2d')!;
      
      invertedMaskCtx.fillStyle = 'white';
      invertedMaskCtx.fillRect(0, 0, invertedMask.width, invertedMask.height);
      invertedMaskCtx.globalCompositeOperation = 'destination-out';
      invertedMaskCtx.drawImage(lockedMask, 0, 0);
      
      // Mask current target to keep only unlocked regions
      targetCtx.globalCompositeOperation = 'destination-in';
      targetCtx.drawImage(invertedMask, 0, 0);
      
      // Step 4: Combine locked baseline + unlocked delta
      // First add locked pixels back
      const restoredLocked = document.createElement('canvas');
      restoredLocked.width = targetCtx.canvas.width;
      restoredLocked.height = targetCtx.canvas.height;
      const restoredLockedCtx = restoredLocked.getContext('2d')!;
      
      restoredLockedCtx.drawImage(lockedSnapshot, 0, 0);
      restoredLockedCtx.globalCompositeOperation = 'destination-in';
      restoredLockedCtx.drawImage(lockedMask, 0, 0);
      
      targetCtx.globalCompositeOperation = 'destination-over';
      targetCtx.drawImage(restoredLocked, 0, 0);
    }
  }
  
  // Reset to default
  targetCtx.globalCompositeOperation = 'source-over';
}
