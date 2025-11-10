/**
 * Position Modulation Resolver
 * 
 * Handles incremental position modulation calculations after grid distribution/sorting.
 * Supports multiple modulation modes: pixel-value, shape-count, grid-row.
 */

export interface ModulationContext {
  // Index within the current generation (0-based)
  generationIndex: number;
  
  // Index across all generations (for per-batch scope)
  globalIndex: number;
  
  // Grid cell information (available after grid distribution)
  gridCellIndex?: number;  // Linear grid index (0-based)
  gridRowIndex?: number;   // Row within grid (0-based)
  gridColIndex?: number;   // Column within grid (0-based)
  gridColumns?: number;    // Total columns in grid
}

export interface IncrementalSettings {
  startValue: number;
  increment: number;
  modulationMode: 'off' | 'pixel-value' | 'shape-count' | 'grid-row';
  modulationValue: number;
  resetPerBatch: boolean;
  // Future: incrementScope: 'per-generation' | 'per-batch'
}

/**
 * Calculate incremental position value with modulation support
 */
export function calculateIncrementalPosition(
  settings: IncrementalSettings,
  context: ModulationContext
): number {
  // Determine which index to use based on reset-per-batch setting
  const effectiveIndex = settings.resetPerBatch 
    ? context.generationIndex 
    : context.globalIndex;
  
  // Calculate base incremental value
  let value = settings.startValue + (effectiveIndex * settings.increment);
  
  // Apply modulation based on mode
  switch (settings.modulationMode) {
    case 'pixel-value':
      // Modulate by pixel value (legacy behavior)
      if (settings.modulationValue > 0) {
        value = value % settings.modulationValue;
      }
      break;
      
    case 'shape-count':
      // Modulate by shape count (reset every N shapes)
      if (settings.modulationValue > 0) {
        const moduloIndex = effectiveIndex % settings.modulationValue;
        value = settings.startValue + (moduloIndex * settings.increment);
      }
      break;
      
    case 'grid-row':
      // Modulate by grid row (reset at end of each row)
      // This mode REQUIRES grid context information
      if (context.gridColIndex !== undefined && context.gridColumns !== undefined) {
        // Use column index within the row instead of global index
        value = settings.startValue + (context.gridColIndex * settings.increment);
      } else {
        // Fallback to regular incremental if grid context not available
        console.warn('[Position Modulation] grid-row mode requires grid context');
        value = settings.startValue + (effectiveIndex * settings.increment);
      }
      break;
      
    case 'off':
    default:
      // No modulation, value already calculated
      break;
  }
  
  return value;
}

/**
 * Apply incremental position modulation to an array of shapes after distribution
 * 
 * This function modifies shapes in-place, applying X/Y position adjustments
 * based on incremental settings with modulation support.
 */
export function applyIncrementalPositionToShapes(
  shapes: any[],
  xSettings: IncrementalSettings | null,
  ySettings: IncrementalSettings | null,
  options: {
    globalIndexOffset?: number;  // Offset for cross-batch calculations
    gridColumns?: number;        // For grid-row modulation
  } = {}
): void {
  const globalIndexOffset = options.globalIndexOffset || 0;
  const gridColumns = options.gridColumns;
  
  shapes.forEach((shape, index) => {
    // Build modulation context
    const context: ModulationContext = {
      generationIndex: index,
      globalIndex: globalIndexOffset + index,
      gridCellIndex: index,  // Linear grid index (same as generation index after distribution)
      gridRowIndex: gridColumns ? Math.floor(index / gridColumns) : undefined,
      gridColIndex: gridColumns ? index % gridColumns : undefined,
      gridColumns: gridColumns
    };
    
    // Apply X position modulation if enabled
    if (xSettings) {
      const xOffset = calculateIncrementalPosition(xSettings, context);
      shape.x = (shape.x || 0) + xOffset;
    }
    
    // Apply Y position modulation if enabled
    if (ySettings) {
      const yOffset = calculateIncrementalPosition(ySettings, context);
      shape.y = (shape.y || 0) + yOffset;
    }
  });
}
