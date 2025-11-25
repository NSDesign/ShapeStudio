import { GridOffsetsConfig, DEFAULT_GRID_OFFSETS, ShapeMaskingConfig, DEFAULT_SHAPE_MASKING, CellConstraintsConfig, DEFAULT_CELL_CONSTRAINTS } from '@shared/schema';

export interface Point {
  x: number;
  y: number;
}

export interface TangentHandle {
  in: Point;   // Incoming tangent handle
  out: Point;  // Outgoing tangent handle
  linked: boolean; // Whether handles maintain collinearity
  smooth: boolean; // Whether this point creates smooth continuity
}

export interface GridPosition {
  x: number;
  y: number;
  row: number;
  column: number;
}

export interface DistributionConfig {
  enabled: boolean;
  pattern: 'grid' | 'wave' | 'ellipse' | 'spiral' | 'auto-distribute';
  gridRows: number;
  gridColumns: number;
  gridStartX?: number;
  gridStartY?: number;
  gridSpacingXMode?: 'define' | 'auto' | 'auto-centered' | 'auto-edge-to-edge';
  gridSpacingYMode?: 'define' | 'auto' | 'auto-centered' | 'auto-edge-to-edge';
  gridRowOffset: number;
  gridColumnOffset: number;
  gridMarginEnabled?: boolean;
  gridMarginValue?: number;
  gridSortBy: 'layer' | 'id' | 'shape-type' | 'fill-color' | 'opacity' | 'size' | 'angle' | 'creation-time' | 'none' | 
    'corner-radius' | 'point-count' | 'edge-count' | 'inner-radius' | 'segment-count' | 
    'direction' | 'length' | 'centroid' | 'spread' | 'curvature';
  gridSortScope: 'per-generation' | 'per-batch';
  gridSortOrder: 'ascending' | 'descending';
  gridGroupByShapeType?: boolean;
  gridReverseGroups?: boolean;
  gridXRandomization: number;
  gridYRandomization: number;
  gridOffsets?: GridOffsetsConfig;
  shapeMasking?: ShapeMaskingConfig;
  cellConstraints?: CellConstraintsConfig;
  autoDistributeXCount?: number;
  autoDistributeYCount?: number;
  waveType?: 'sine' | 'triangle' | 'square' | 'sawtooth';
  waveAmplitude?: number;
  waveFrequency?: number;
  waveDirection?: 'horizontal' | 'vertical';
  wavePhaseOffset?: number;
  ellipseXRadius?: [number, number];
  ellipseYRadius?: [number, number];
  ellipseRingCount?: number;
  ellipseRingSpacing?: 'even' | 'progressive';
  ellipseRotation?: number;
  ellipseRotationAlignment?: 'uniform' | 'progressive';
  ellipseAlignToRing?: boolean;
  ellipseFlipInward?: boolean;
  ellipseAdditionalRotation?: number;
  ellipseShapeRotationMode?: 'none' | 'fixed' | 'range' | 'incremental';
  ellipseRotationFixed?: number;
  ellipseRotationRange?: [number, number];
  ellipseRotationIncrementalStart?: number;
  ellipseRotationIncrementalStep?: number;
  spiralTurnCount?: number;
  spiralSpacingMode?: 'linear' | 'logarithmic';
  spiralDirection?: 'clockwise' | 'counterclockwise';
  spiralStartAngle?: number;
  spiralTightness?: number;
  tangentAlignment?: boolean;
  segmentDistribution?: 'even' | 'clustered';
  reverseDirection?: boolean;
}

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  skewX: number;
  skewY: number;
}

export type BlendMode = 
  | 'source-over' 
  | 'multiply' 
  | 'screen' 
  | 'overlay' 
  | 'darken' 
  | 'lighten' 
  | 'color-dodge' 
  | 'color-burn' 
  | 'hard-light' 
  | 'soft-light' 
  | 'difference' 
  | 'exclusion' 
  | 'hue' 
  | 'saturation' 
  | 'color' 
  | 'luminosity'
  // Compositing operations for masking effects
  | 'source-in'
  | 'source-out'
  | 'source-atop'
  | 'destination-over'
  | 'destination-in'
  | 'destination-out'
  | 'destination-atop'
  | 'lighter'
  | 'copy'
  | 'xor';

export type BooleanOperation = 
  | 'union' 
  | 'subtract' 
  | 'intersect' 
  | 'exclude';

export interface HSLShift {
  hue: number; // -180 to 180 degrees
  saturation: number; // -100 to 100 percent
  lightness: number; // -100 to 100 percent
  enabled: boolean;
}

export interface ColorRemapping {
  sourceColor: string;
  targetColor: string;
  tolerance: number; // 0-100, how close colors need to be to match
}

export interface ColorManipulation {
  mode: 'shift' | 'remap';
  hslShift?: HSLShift;
  remappings?: ColorRemapping[];
  affectFill: boolean;
  affectStroke: boolean;
}

export interface ShapeProperties {
  fillColor: string | 'none';
  fillOpacity: number;
  strokeColor: string | 'none';
  strokeWidth: number;
  strokeOpacity: number;
  blendMode: BlendMode;
  zIndex: number;
  blurRadius: number; // 0 = no blur, >0 = blur in pixels
  gradient?: {
    type: 'linear' | 'radial' | 'conic';
    stops: { offset: number; color: string }[];
    // Radial gradient specific parameters
    radialCenterX?: number; // Center X as percentage of shape bounds (0-100)
    radialCenterY?: number; // Center Y as percentage of shape bounds (0-100)
    // Conic gradient specific parameters
    conicAngle?: number; // Start angle in radians (0-2π)
    conicCenterX?: number; // Center X as percentage of shape bounds (0-100)
    conicCenterY?: number; // Center Y as percentage of shape bounds (0-100)
  };
  // Boolean operation properties
  booleanOperation?: 'union' | 'subtract' | 'intersect' | 'exclude';
  booleanTarget?: string; // ID of target shape for boolean operation
  // Color manipulation properties
  colorShift?: {
    hue: number;
    saturation: number;
    lightness: number;
    enabled: boolean;
  };
}

export type ShapeType = 
  | 'rectangle' 
  | 'rounded-rectangle'
  | 'square' 
  | 'rounded-square'
  | 'circle' 
  | 'ellipse' 
  | 'triangle'
  | 'right-triangle'
  | 'trapezoid'
  | 'pentagon'
  | 'hexagon'
  | 'rhombus'
  | 'parallelogram'
  | 'kite'
  | 'semicircle'
  | 'heart'
  | 'arrow'
  | 'cross'
  | 'line' 
  | 'line-vector'
  | 'polygon' 
  | 'star' 
  | 'chunk' 
  | 'blob'
  | 'ring'
  | 'cubic'
  | 'bezier'
  | 'smooth-spline'
  | 'spline-circle'
  | 'spline-ellipse'
  | 'spline-ring';

export interface BaseShape {
  id: string;
  type: ShapeType;
  transform: Transform;
  properties: ShapeProperties;
  selected: boolean;
  points?: Point[];
  sides?: number;
  radius?: number;
  innerRadius?: number;
  width?: number;
  height?: number;
  controlPoints?: Point[];
  tangentHandles?: { in: Point; out: Point }[]; // Bezier tangent handles for each point
  smoothPoints?: boolean[]; // Track which points are smooth (continuous tangents) vs sharp
  closed?: boolean;
  segments?: number; // Number of segments for smooth curves
  renderType?: 'polygon' | 'bezier' | 'cubic' | 'smooth' | 'roundRect'; // How to render the shape
}

export interface ShapeGroup {
  id: string;
  shapes: BaseShape[];
  transform: Transform;
  selected: boolean;
}

export type DistributionPattern = 
  | 'random' 
  | 'grid' 
  | 'circle' 
  | 'spiral' 
  | 'organic' 
  | 'physics' 
  | 'wave' 
  | 'cluster';

export interface DistributionSettings {
  pattern: DistributionPattern;
  spacing: number;
  randomness: number;
  rotation: number;
  scale: number;
  density: number;
  avoidOverlap: boolean;
  respectBounds: boolean;
}

// Mode configuration types for line-vector properties
export type ModeKind = 'incremental' | 'range' | 'fixed';

export interface IncrementalMode<T> { 
  kind: 'incremental'; 
  startValue: T; 
  increment: T;
}

export interface RangeMode<T> { 
  kind: 'range'; 
  min: T; 
  max: T; 
  step?: T; 
  distribution?: 'uniform' | 'normal';
}

export interface FixedMode<T> { 
  kind: 'fixed'; 
  value: T;
}

export type ScalarMode<T> = IncrementalMode<T> | RangeMode<T> | FixedMode<T>;

export interface ShapeSpecificSettings {
  polygon: {
    edgeCountRange: [number, number];
  };
  circle: {
    segmentCountRange: [number, number];
  };
  ellipse: {
    segmentCountRange: [number, number];
  };
  bezier: {
    pointCountRange: [number, number];
    openProbability: number;
    strokeCapProbabilities: { round: number; square: number; butt: number };
  };

  cubic: {
    pointCountRange: [number, number];
    curvatureRange: [number, number];
    spreadRange: [number, number];
    patternType: number;
    openProbability: number;
  };

  'smooth-spline': {
    pointCountRange: [number, number];
    openProbability: number;
    strokeCapProbabilities: { round: number; square: number; butt: number };
  };
  star: {
    pointCountRange: [number, number];
    innerRadiusRange: [number, number];
  };
  ring: {
    innerRadiusRange: [number, number];
  };
  'spline-ring': {
    innerRadiusRange: [number, number];
    segmentCountRange: [number, number];
  };
  line: {
    pointCountRange: [number, number];
    strokeCapProbabilities: { round: number; square: number; butt: number };
  };
  'line-vector': {
    direction: ScalarMode<number>;
    length: ScalarMode<number>;
    centroid: ScalarMode<number>;
    strokeCapProbabilities: { round: number; square: number; butt: number };
  };
  rectangle: {
    // Standard rectangle with no rounded corners
  };
  'rounded-rectangle': {
    cornerRadiusRange: [number, number];
    cornerRadiusMode?: 'range' | 'fixed';
    cornerRadiusValue?: number;
  };
  square: {
    // Standard square with sharp corners - no properties
  };
  'rounded-square': {
    cornerRadiusRange: [number, number];
    cornerRadiusMode?: 'range' | 'fixed';
    cornerRadiusValue?: number;
  };
}

export interface ScatterSettings {
  onPoints: boolean;
  insideArea: boolean;
  count: number;
  minCount: number;
  maxCount: number;
  shapeCountMode: 'range' | 'fixed'; // Mode for shape count generation
  fixedShapeCount: number; // Fixed number when using fixed mode
  randomness: number;
  distribution: DistributionSettings;
  shapeSpecific: Partial<ShapeSpecificSettings>;
}

export interface CanvasSettings {
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
  backgroundColor: string;
  showGrid: boolean;
}

export interface Artboard {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;  // Always stored in pixels internally
  height: number; // Always stored in pixels internally
  dpi?: number;   // Resolution in dots per inch (default 72)
  unitType?: 'pixels' | 'mm' | 'cm' | 'inches'; // Display unit (default 'pixels')
  backgroundColor?: string;
  gridColor?: string;
  displayGrid?: boolean;
  displayBorder?: boolean;
  displayName?: boolean;
  displayDimensions?: boolean;
  displayResolution?: boolean;
  preset?: string;
  category?: string;
}

export interface ArtboardPreset {
  name: string;
  width: number;
  height: number;
  category: 'social' | 'print' | 'web' | 'tv' | 'mobile' | 'custom';
  description?: string;
}

export const ARTBOARD_PRESETS: ArtboardPreset[] = [
  // Social Media
  { name: 'Instagram Post', width: 1080, height: 1080, category: 'social', description: '1:1 Square' },
  { name: 'Instagram Story', width: 1080, height: 1920, category: 'social', description: '9:16 Vertical' },
  { name: 'Facebook Post', width: 1200, height: 630, category: 'social', description: '1.91:1 Landscape' },
  { name: 'Facebook Cover', width: 1640, height: 859, category: 'social', description: 'Profile cover' },
  { name: 'Twitter Post', width: 1200, height: 675, category: 'social', description: '16:9 Landscape' },
  { name: 'Twitter Header', width: 1500, height: 500, category: 'social', description: '3:1 Header' },
  { name: 'LinkedIn Post', width: 1200, height: 627, category: 'social', description: '1.91:1 Landscape' },
  { name: 'YouTube Thumbnail', width: 1280, height: 720, category: 'social', description: '16:9 HD' },
  { name: 'TikTok Video', width: 1080, height: 1920, category: 'social', description: '9:16 Vertical' },
  
  // Print
  { name: 'Letter (8.5×11")', width: 2550, height: 3300, category: 'print', description: 'US Standard at 300 DPI' },
  { name: 'A4 (210×297mm)', width: 2480, height: 3508, category: 'print', description: 'International at 300 DPI' },
  { name: 'Business Card', width: 1050, height: 600, category: 'print', description: '3.5×2" at 300 DPI' },
  { name: 'Postcard (4×6")', width: 1200, height: 1800, category: 'print', description: 'Standard at 300 DPI' },
  { name: 'Poster (18×24")', width: 5400, height: 7200, category: 'print', description: 'Medium poster at 300 DPI' },
  { name: 'Flyer (8.5×11")', width: 2550, height: 3300, category: 'print', description: 'Letter size at 300 DPI' },
  { name: 'Banner (36×24")', width: 10800, height: 7200, category: 'print', description: 'Large banner at 300 DPI' },
  
  // Web
  { name: 'Desktop HD', width: 1920, height: 1080, category: 'web', description: '1920×1080 Full HD' },
  { name: 'Desktop 4K', width: 3840, height: 2160, category: 'web', description: '4K Ultra HD' },
  { name: 'Laptop', width: 1366, height: 768, category: 'web', description: 'Common laptop resolution' },
  { name: 'Tablet Portrait', width: 768, height: 1024, category: 'web', description: 'iPad portrait' },
  { name: 'Tablet Landscape', width: 1024, height: 768, category: 'web', description: 'iPad landscape' },
  { name: 'Web Banner', width: 728, height: 90, category: 'web', description: 'Leaderboard banner' },
  { name: 'Square Ad', width: 300, height: 300, category: 'web', description: 'Medium rectangle' },
  
  // TV & Digital Displays
  { name: 'Full HD (1080p)', width: 1920, height: 1080, category: 'tv', description: '16:9 Full HD' },
  { name: '4K UHD', width: 3840, height: 2160, category: 'tv', description: '16:9 Ultra HD' },
  { name: '8K UHD', width: 7680, height: 4320, category: 'tv', description: '16:9 8K' },
  { name: 'Cinema 4K', width: 4096, height: 2160, category: 'tv', description: 'DCI 4K' },
  { name: 'Digital Signage', width: 1920, height: 1080, category: 'tv', description: 'Standard display' },
  
  // Mobile
  { name: 'iPhone 14 Pro', width: 1179, height: 2556, category: 'mobile', description: 'iPhone 14 Pro screen' },
  { name: 'iPhone SE', width: 750, height: 1334, category: 'mobile', description: 'iPhone SE screen' },
  { name: 'Android Phone', width: 1080, height: 1920, category: 'mobile', description: 'Common Android resolution' },
  { name: 'Mobile Banner', width: 320, height: 50, category: 'mobile', description: 'Mobile web banner' },
];

// Grid positioning utilities
export function calculateGridPosition(
  index: number, 
  rows: number, 
  columns: number, 
  rowOffset: number, 
  columnOffset: number,
  centerX = 0,
  centerY = 0,
  artboardBounds?: { x: number; y: number; width: number; height: number },
  gridStartX = 0,
  gridStartY = 0,
  spacingXMode: 'define' | 'auto' | 'auto-centered' | 'auto-edge-to-edge' = 'define',
  spacingYMode: 'define' | 'auto' | 'auto-centered' | 'auto-edge-to-edge' = 'define',
  marginEnabled: boolean = false,
  marginValue: number = 50,
  gridOffsets?: GridOffsetsConfig
): GridPosition {
  const totalPositions = rows * columns;
  const adjustedIndex = index % totalPositions;
  
  const row = Math.floor(adjustedIndex / columns);
  const column = adjustedIndex % columns;
  
  // Calculate effective spacing based on mode
  let effectiveColumnOffset = columnOffset;
  let effectiveRowOffset = rowOffset;
  let startX = centerX - ((columns - 1) * effectiveColumnOffset) / 2;
  let startY = centerY - ((rows - 1) * effectiveRowOffset) / 2;
  
  // Handle X spacing mode
  let ignoreGridStartX = false;
  let ignoreGridStartY = false;
  
  if (artboardBounds) {
    // Backward compatibility: treat 'auto' as 'auto-centered'
    const effectiveXMode = spacingXMode === 'auto' ? 'auto-centered' : spacingXMode;
    
    if (effectiveXMode === 'auto-centered') {
      ignoreGridStartX = true; // Auto modes calculate their own positioning
      if (marginEnabled) {
        // Custom margin: calculate spacing within margin-reduced area
        const availableWidth = artboardBounds.width - (2 * marginValue);
        effectiveColumnOffset = columns > 1 ? availableWidth / (columns - 1) : 0;
        startX = artboardBounds.x - centerX + marginValue;
      } else {
        // Auto margin: evenly distribute with auto-calculated margins
        effectiveColumnOffset = artboardBounds.width / (columns + 1);
        startX = artboardBounds.x - centerX + effectiveColumnOffset;
      }
    } else if (effectiveXMode === 'auto-edge-to-edge') {
      ignoreGridStartX = true; // Auto modes calculate their own positioning
      // Edge to edge: positions from 0 to artboard width
      effectiveColumnOffset = columns > 1 ? artboardBounds.width / (columns - 1) : 0;
      startX = artboardBounds.x - centerX;
    }
  }
  
  // Handle Y spacing mode
  if (artboardBounds) {
    // Backward compatibility: treat 'auto' as 'auto-centered'
    const effectiveYMode = spacingYMode === 'auto' ? 'auto-centered' : spacingYMode;
    
    if (effectiveYMode === 'auto-centered') {
      ignoreGridStartY = true; // Auto modes calculate their own positioning
      if (marginEnabled) {
        // Custom margin: calculate spacing within margin-reduced area
        const availableHeight = artboardBounds.height - (2 * marginValue);
        effectiveRowOffset = rows > 1 ? availableHeight / (rows - 1) : 0;
        startY = artboardBounds.y - centerY + marginValue;
      } else {
        // Auto margin: evenly distribute with auto-calculated margins
        effectiveRowOffset = artboardBounds.height / (rows + 1);
        startY = artboardBounds.y - centerY + effectiveRowOffset;
      }
    } else if (effectiveYMode === 'auto-edge-to-edge') {
      ignoreGridStartY = true; // Auto modes calculate their own positioning
      // Edge to edge: positions from 0 to artboard height
      effectiveRowOffset = rows > 1 ? artboardBounds.height / (rows - 1) : 0;
      startY = artboardBounds.y - centerY;
    }
  }
  
  let x = startX + (column * effectiveColumnOffset) + (ignoreGridStartX ? 0 : gridStartX);
  let y = startY + (row * effectiveRowOffset) + (ignoreGridStartY ? 0 : gridStartY);
  
  // Apply grid offsets (alternating or pattern-based row/column offsets)
  if (gridOffsets?.enabled) {
    const mode = gridOffsets.mode ?? 'alternating';
    
    // Row offset affects X position (shifts rows left/right)
    if (gridOffsets.row?.enabled) {
      let shouldApplyRowOffset = false;
      
      if (mode === 'alternating') {
        // Alternating mode: check if row index modulo 2 matches startIndex
        shouldApplyRowOffset = (row % 2) === (gridOffsets.row.startIndex ?? 0);
      } else if (mode === 'pattern') {
        // Pattern mode: check if row index is in the pattern array
        const rowPattern = gridOffsets.row.pattern ?? [];
        shouldApplyRowOffset = rowPattern.includes(row);
      }
      
      if (shouldApplyRowOffset) {
        const amount = gridOffsets.row.amount ?? 0;
        x += gridOffsets.row.direction === 'right' ? amount : -amount;
      }
    }
    
    // Column offset affects Y position (shifts columns up/down)
    if (gridOffsets.column?.enabled) {
      let shouldApplyColumnOffset = false;
      
      if (mode === 'alternating') {
        // Alternating mode: check if column index modulo 2 matches startIndex
        shouldApplyColumnOffset = (column % 2) === (gridOffsets.column.startIndex ?? 0);
      } else if (mode === 'pattern') {
        // Pattern mode: check if column index is in the pattern array
        const columnPattern = gridOffsets.column.pattern ?? [];
        shouldApplyColumnOffset = columnPattern.includes(column);
      }
      
      if (shouldApplyColumnOffset) {
        const amount = gridOffsets.column.amount ?? 0;
        y += gridOffsets.column.direction === 'down' ? amount : -amount;
      }
    }
  }
  
  return { x, y, row, column };
}

/**
 * Determines if a grid position should be masked (excluded from shape rendering)
 * @param row - Row index (0-indexed)
 * @param column - Column index (0-indexed)
 * @param shapeMasking - Shape masking configuration
 * @returns true if the position should be masked (no shape rendered), false if shape should render
 */
export function isPositionMasked(
  row: number,
  column: number,
  shapeMasking?: ShapeMaskingConfig
): boolean {
  // If masking is not enabled or not provided, render all positions
  if (!shapeMasking?.enabled || !shapeMasking?.grid?.enabled) {
    return false;
  }
  
  const grid = shapeMasking.grid;
  const mode = grid.mode ?? 'alternating';
  const invert = grid.invert ?? false;
  
  let isMatched = false;
  
  if (mode === 'alternating') {
    const { skipEvery, startIndex } = grid.alternating;
    const skipN = skipEvery ?? 2;
    const start = startIndex ?? 0;
    
    // In row-first priority, determine masking based on row index first
    // In column-first priority, determine masking based on column index first
    if (grid.priority === 'row-first') {
      // Row determines if the entire row is masked
      isMatched = ((row - start) % skipN) === 0 && row >= start;
    } else {
      // Column determines if the entire column is masked
      isMatched = ((column - start) % skipN) === 0 && column >= start;
    }
  } else if (mode === 'pattern') {
    // Pattern mode: check explicit row/column combinations
    const patterns = grid.pattern ?? [];
    
    for (const patternEntry of patterns) {
      if (patternEntry.row === row) {
        // Check if this column is in the columns array for this row
        if (patternEntry.columns.includes(column)) {
          isMatched = true;
          break;
        }
      }
    }
  }
  
  // invert=false: matched positions are excluded (masked)
  // invert=true: only matched positions are rendered (non-matched are masked)
  return invert ? !isMatched : isMatched;
}

/**
 * Detects which shape-specific sort options are available based on enabled shape types
 * @param enabledShapeTypes - Array of enabled shape type strings
 * @returns Object indicating which sort criteria are available
 */
export function getAvailableShapeSpecificSortOptions(enabledShapeTypes: string[]): {
  cornerRadius: boolean;
  pointCount: boolean;
  edgeCount: boolean;
  innerRadius: boolean;
  segmentCount: boolean;
  direction: boolean;
  length: boolean;
  centroid: boolean;
  spread: boolean;
  curvature: boolean;
} {
  const hasRoundedShapes = enabledShapeTypes.some(type => 
    type === 'rounded-rectangle' || type === 'rounded-square'
  );
  
  const hasPointCountShapes = enabledShapeTypes.some(type => 
    type === 'star' || type === 'line' || 
    type === 'bezier' || type === 'cubic' || type === 'smooth-spline'
  );
  
  const hasEdgeCountShapes = enabledShapeTypes.some(type => 
    type === 'polygon'
  );
  
  const hasInnerRadiusShapes = enabledShapeTypes.some(type => 
    type === 'ring' || type === 'star' || type === 'spline-ring'
  );
  
  const hasSegmentCountShapes = enabledShapeTypes.some(type => 
    type === 'circle' || type === 'ellipse' || type === 'spline-ring'
  );
  
  const hasLineVectorShapes = enabledShapeTypes.some(type => 
    type === 'line-vector'
  );
  
  const hasCubicShapes = enabledShapeTypes.some(type => 
    type === 'cubic'
  );
  
  return {
    cornerRadius: hasRoundedShapes,
    pointCount: hasPointCountShapes,
    edgeCount: hasEdgeCountShapes,
    innerRadius: hasInnerRadiusShapes,
    segmentCount: hasSegmentCountShapes,
    direction: hasLineVectorShapes,
    length: hasLineVectorShapes,
    centroid: hasLineVectorShapes,
    spread: hasCubicShapes,
    curvature: hasCubicShapes
  };
}

export function sortShapesForGrid(
  shapes: any[], 
  sortBy: string, 
  sortOrder: 'ascending' | 'descending' = 'ascending',
  groupByShapeType: boolean = false,
  reverseGroups: boolean = false
): any[] {
  if (sortBy === 'none') return shapes;
  
  // If grouping is enabled, group shapes by type first
  if (groupByShapeType) {
    // Group shapes by their type
    const groupedByType: Record<string, any[]> = {};
    shapes.forEach(shape => {
      const type = shape.type || 'unknown';
      if (!groupedByType[type]) {
        groupedByType[type] = [];
      }
      groupedByType[type].push(shape);
    });
    
    // Sort shapes within each group first
    let sortedGroups = Object.entries(groupedByType).map(([type, groupShapes]) => {
      const sorted = sortShapesWithinGroup(groupShapes, sortBy, sortOrder);
      return {
        type,
        shapes: sorted,
        // Use first shape from sorted array as representative
        // For ascending, first is smallest; for descending, first is largest
        representative: sorted[0]
      };
    });
    
    // Sort the groups themselves using the same criteria
    sortedGroups = sortedGroups.sort((groupA, groupB) => {
      // Special case: for shape-type sorting, sort groups by type name
      if (sortBy === 'shape-type') {
        const comparison = groupA.type.localeCompare(groupB.type);
        return sortOrder === 'ascending' ? comparison : -comparison;
      }
      
      // For other criteria, compare representative shapes from each group
      const comparison = getComparisonValue(groupA.representative, groupB.representative, sortBy, sortOrder);
      
      // Add tie-breaker using type name for stable sorting
      if (comparison === 0) {
        return groupA.type.localeCompare(groupB.type);
      }
      
      return comparison;
    });
    
    // Optionally reverse the order of groups
    if (reverseGroups) {
      sortedGroups.reverse();
    }
    
    // Flatten the sorted groups back into a single array
    return sortedGroups.flatMap(group => group.shapes);
  }
  
  // Standard sorting without grouping
  return sortShapesWithinGroup(shapes, sortBy, sortOrder);
}

function getComparisonValue(a: any, b: any, sortBy: string, sortOrder: 'ascending' | 'descending'): number {
  let comparison = 0;
    
    switch (sortBy) {
      case 'layer':
        comparison = (a.properties?.zIndex || a.layerIndex || 0) - (b.properties?.zIndex || b.layerIndex || 0);
        break;
      case 'creation-time':
        // Extract timestamp from shape ID if available, fallback to creation order
        const aTime = extractTimestamp(a.id) || a.creationIndex || 0;
        const bTime = extractTimestamp(b.id) || b.creationIndex || 0;
        comparison = aTime - bTime;
        break;
      case 'shape-type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'size':
        const aSize = calculateShapeArea(a);
        const bSize = calculateShapeArea(b);
        comparison = aSize - bSize;
        break;
      case 'fill-color':
        const aHue = extractHueFromColor(a.properties?.fillColor || a.fillColor || '#000000');
        const bHue = extractHueFromColor(b.properties?.fillColor || b.fillColor || '#000000');
        comparison = aHue - bHue;
        break;
      case 'opacity':
        const aOpacity = a.properties?.fillOpacity || a.properties?.opacity || a.opacity || 1;
        const bOpacity = b.properties?.fillOpacity || b.properties?.opacity || b.opacity || 1;
        comparison = aOpacity - bOpacity;
        break;
      case 'angle':
        comparison = (a.transform?.rotation || a.rotation || 0) - (b.transform?.rotation || b.rotation || 0);
        break;
      case 'id':
        comparison = a.id.localeCompare(b.id);
        break;
      
      // Shape-specific sort criteria
      case 'corner-radius':
        const aCornerRadius = a.cornerRadius || 0;
        const bCornerRadius = b.cornerRadius || 0;
        comparison = aCornerRadius - bCornerRadius;
        break;
      case 'point-count':
        const aPointCount = a.sides || a.points?.length || 0;
        const bPointCount = b.sides || b.points?.length || 0;
        comparison = aPointCount - bPointCount;
        break;
      case 'edge-count':
        const aEdgeCount = a.sides || 0;
        const bEdgeCount = b.sides || 0;
        comparison = aEdgeCount - bEdgeCount;
        break;
      case 'inner-radius':
        const aInnerRadius = a.innerRadius || 0;
        const bInnerRadius = b.innerRadius || 0;
        comparison = aInnerRadius - bInnerRadius;
        break;
      case 'segment-count':
        const aSegmentCount = a.segments || 0;
        const bSegmentCount = b.segments || 0;
        comparison = aSegmentCount - bSegmentCount;
        break;
      case 'direction':
        const aDirection = a.direction || 0;
        const bDirection = b.direction || 0;
        comparison = aDirection - bDirection;
        break;
      case 'length':
        const aLength = a.length || 0;
        const bLength = b.length || 0;
        comparison = aLength - bLength;
        break;
      case 'centroid':
        const aCentroid = a.centroid || 0;
        const bCentroid = b.centroid || 0;
        comparison = aCentroid - bCentroid;
        break;
      case 'spread':
        const aSpread = a.spread || 0;
        const bSpread = b.spread || 0;
        comparison = aSpread - bSpread;
        break;
      case 'curvature':
        const aCurvature = a.curvature || 0;
        const bCurvature = b.curvature || 0;
        comparison = aCurvature - bCurvature;
        break;
      
      default:
        comparison = 0;
    }
    
    return sortOrder === 'ascending' ? comparison : -comparison;
}

function sortShapesWithinGroup(shapes: any[], sortBy: string, sortOrder: 'ascending' | 'descending'): any[] {
  return [...shapes].sort((a, b) => getComparisonValue(a, b, sortBy, sortOrder));
}

function extractTimestamp(id: string): number | null {
  // Extract timestamp from shape ID format: shape_timestamp_random
  const match = id.match(/shape_(\d+)_/);
  return match ? parseInt(match[1]) : null;
}

function calculateShapeArea(shape: any): number {
  if (!shape.points || shape.points.length === 0) return 0;
  
  // Simple area calculation using bounding box
  const minX = Math.min(...shape.points.map((p: any) => p.x));
  const maxX = Math.max(...shape.points.map((p: any) => p.x));
  const minY = Math.min(...shape.points.map((p: any) => p.y));
  const maxY = Math.max(...shape.points.map((p: any) => p.y));
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  // Apply transform scaling
  const scaleX = shape.transform?.scaleX || 1;
  const scaleY = shape.transform?.scaleY || 1;
  
  return width * height * Math.abs(scaleX) * Math.abs(scaleY);
}

function extractHueFromColor(color: string): number {
  // Extract hue from HSL color string
  const hslMatch = color.match(/hsl\((\d+(?:\.\d+)?),/);
  if (hslMatch) {
    return parseFloat(hslMatch[1]);
  }
  
  // For hex colors, convert to HSL and extract hue
  if (color.startsWith('#')) {
    return hexToHue(color);
  }
  
  return 0;
}

function hexToHue(hex: string): number {
  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  if (diff === 0) return 0;
  
  let hue = 0;
  if (max === r) {
    hue = ((g - b) / diff) % 6;
  } else if (max === g) {
    hue = (b - r) / diff + 2;
  } else {
    hue = (r - g) / diff + 4;
  }
  
  return (hue * 60 + 360) % 360;
}

// Import shared grid distribution result type
import type { GridDistributionResult } from '../../../shared/distributionTypes';

export function applyGridDistribution(
  shapes: any[], 
  config: DistributionConfig,
  canvasCenter = { x: 0, y: 0 },
  generationInfo?: { currentGeneration?: number, totalGenerations?: number, shapesPerGeneration?: number },
  artboardBounds?: { x: number; y: number; width: number; height: number }
): GridDistributionResult[] {
  // Early return: wrap shapes in result structure with default grid context
  if (!config.enabled || config.pattern !== 'grid') {
    return shapes.map((shape, index) => ({
      shape,
      rowIndex: 0,
      colIndex: index,
      generationIndex: index
    }));
  }
  
  let sortedShapes: any[];
  
  if (config.gridSortScope === 'per-generation' && generationInfo) {
    // Sort within each generation separately
    const { shapesPerGeneration = shapes.length, totalGenerations = 1 } = generationInfo;
    sortedShapes = [];
    
    for (let gen = 0; gen < totalGenerations; gen++) {
      const startIndex = gen * shapesPerGeneration;
      const endIndex = Math.min(startIndex + shapesPerGeneration, shapes.length);
      const generationShapes = shapes.slice(startIndex, endIndex);
      
      const sortedGeneration = sortShapesForGrid(
        generationShapes, 
        config.gridSortBy, 
        config.gridSortOrder,
        config.gridGroupByShapeType || false,
        config.gridReverseGroups || false
      );
      
      sortedShapes.push(...sortedGeneration);
    }
  } else {
    // Sort across entire batch
    sortedShapes = sortShapesForGrid(
      shapes, 
      config.gridSortBy, 
      config.gridSortOrder,
      config.gridGroupByShapeType || false,
      config.gridReverseGroups || false
    );
  }
  
  // Calculate cell dimensions for cell-based rendering
  const cellConstraints = config.cellConstraints || DEFAULT_CELL_CONSTRAINTS;
  const isCellMode = cellConstraints.enabled && cellConstraints.renderMode === 'cell';
  
  // Debug logging for cell mode
  console.log('🔲 [GRID RENDER MODE] cellConstraints:', JSON.stringify(cellConstraints));
  console.log('🔲 [GRID RENDER MODE] enabled:', cellConstraints.enabled, 'renderMode:', cellConstraints.renderMode, 'isCellMode:', isCellMode);
  
  // In cell mode, cells are the spaces BETWEEN grid lines
  // For R rows × C columns of intersection points, there are (R-1) × (C-1) cells
  const effectiveRows = isCellMode ? Math.max(1, config.gridRows - 1) : config.gridRows;
  const effectiveCols = isCellMode ? Math.max(1, config.gridColumns - 1) : config.gridColumns;
  
  // Build list of valid (non-masked) grid positions
  const validPositions: Array<{ rowIndex: number; colIndex: number; linearIndex: number }> = [];
  const totalPositions = effectiveRows * effectiveCols;
  
  for (let i = 0; i < totalPositions; i++) {
    const rowIndex = Math.floor(i / effectiveCols);
    const colIndex = i % effectiveCols;
    
    // Check if this position is masked
    if (!isPositionMasked(rowIndex, colIndex, config.shapeMasking)) {
      validPositions.push({ rowIndex, colIndex, linearIndex: i });
    }
  }
  
  // Only use shapes that fit within valid positions - excess shapes are excluded
  // This ensures masked positions result in shapes being removed, not repositioned
  const shapesToPlace = sortedShapes.slice(0, validPositions.length);
  
  // Calculate spacing for cell dimensions
  let cellWidth = config.gridColumnOffset;
  let cellHeight = config.gridRowOffset;
  
  if (config.gridSpacingXMode === 'auto-centered' && artboardBounds) {
    const margin = config.gridMarginEnabled ? config.gridMarginValue || 50 : 40;
    const availableWidth = artboardBounds.width - (margin * 2);
    cellWidth = config.gridColumns > 1 ? availableWidth / (config.gridColumns - 1) : availableWidth;
  } else if (config.gridSpacingXMode === 'auto-edge-to-edge' && artboardBounds) {
    cellWidth = config.gridColumns > 1 ? artboardBounds.width / (config.gridColumns - 1) : artboardBounds.width;
  }
  
  if (config.gridSpacingYMode === 'auto-centered' && artboardBounds) {
    const margin = config.gridMarginEnabled ? config.gridMarginValue || 50 : 40;
    const availableHeight = artboardBounds.height - (margin * 2);
    cellHeight = config.gridRows > 1 ? availableHeight / (config.gridRows - 1) : availableHeight;
  } else if (config.gridSpacingYMode === 'auto-edge-to-edge' && artboardBounds) {
    cellHeight = config.gridRows > 1 ? artboardBounds.height / (config.gridRows - 1) : artboardBounds.height;
  }
  
  // Map shapes to valid positions only (1:1 mapping, no wrapping)
  return shapesToPlace.map((shape, index) => {
    const positionEntry = validPositions[index] || { rowIndex: 0, colIndex: 0, linearIndex: 0 };
    const { rowIndex, colIndex } = positionEntry;
    
    // Cell mode: offset position to cell center and apply scaling
    let cellOffsetX = 0;
    let cellOffsetY = 0;
    
    // In cell mode, use the cell's top-left corner intersection point, then offset to center
    // The cell at (row, col) has its top-left corner at intersection point (row, col)
    const gridLinearIndex = isCellMode 
      ? (rowIndex * config.gridColumns) + colIndex  // Use original grid dimensions for intersection lookup
      : (rowIndex * effectiveCols) + colIndex;
    
    const gridPos = calculateGridPosition(
      gridLinearIndex,
      config.gridRows,
      config.gridColumns,
      config.gridRowOffset,
      config.gridColumnOffset,
      canvasCenter.x,
      canvasCenter.y,
      artboardBounds,
      config.gridStartX || 0,
      config.gridStartY || 0,
      config.gridSpacingXMode || 'define',
      config.gridSpacingYMode || 'define',
      config.gridMarginEnabled || false,
      config.gridMarginValue || 50,
      config.gridOffsets
    );
    
    if (isCellMode) {
      // In cell mode, offset from intersection point (top-left of cell) to cell center
      // Cell center is half a cell width/height from the intersection point
      cellOffsetX = cellWidth / 2;
      cellOffsetY = cellHeight / 2;
      
      // Apply fit mode scaling
      if (cellConstraints.fitMode !== 'none') {
        // Calculate padding
        let paddingX = 0;
        let paddingY = 0;
        if (cellConstraints.padding > 0) {
          if (cellConstraints.paddingUnit === '%') {
            paddingX = (cellConstraints.padding / 100) * cellWidth;
            paddingY = (cellConstraints.padding / 100) * cellHeight;
          } else {
            paddingX = cellConstraints.padding;
            paddingY = cellConstraints.padding;
          }
        }
        
        // Available space within cell after padding
        const availableWidth = Math.max(1, cellWidth - (paddingX * 2));
        const availableHeight = Math.max(1, cellHeight - (paddingY * 2));
        
        // Get shape dimensions based on shape type
        // For radius-based shapes (circle, polygon, star, ring), calculate from radius
        // For rectangular shapes, use width/height directly
        let shapeWidth: number;
        let shapeHeight: number;
        
        if (shape.radius !== undefined && shape.radius > 0) {
          // Radius-based shapes: diameter is 2 * radius
          shapeWidth = shape.radius * 2;
          shapeHeight = shape.radius * 2;
        } else if (shape.width !== undefined && shape.height !== undefined) {
          // Rectangular/elliptical shapes: use direct dimensions
          shapeWidth = shape.width;
          shapeHeight = shape.height;
        } else if (shape.points && shape.points.length > 0) {
          // Point-based shapes: calculate bounding box from points
          const xs = shape.points.map((p: any) => p.x);
          const ys = shape.points.map((p: any) => p.y);
          shapeWidth = Math.max(...xs) - Math.min(...xs);
          shapeHeight = Math.max(...ys) - Math.min(...ys);
          // Ensure minimum size
          shapeWidth = Math.max(10, shapeWidth);
          shapeHeight = Math.max(10, shapeHeight);
        } else {
          // Fallback defaults
          shapeWidth = 50;
          shapeHeight = 50;
        }
        
        // Calculate scale based on fit mode
        let scaleX = 1;
        let scaleY = 1;
        
        switch (cellConstraints.fitMode) {
          case 'contain':
            // Scale DOWN to fit within cell if too large, but never scale up
            // This ensures shapes fit inside the cell without exceeding boundaries
            const rawContainScale = Math.min(availableWidth / shapeWidth, availableHeight / shapeHeight);
            const containScale = Math.min(1, rawContainScale); // Cap at 1 - never scale up
            scaleX = containScale;
            scaleY = containScale;
            break;
          case 'cover':
            // Scale to cover entire cell (may exceed cell boundaries), maintain aspect ratio
            // This will scale up or down as needed to ensure cell is fully covered
            const coverScale = Math.max(availableWidth / shapeWidth, availableHeight / shapeHeight);
            scaleX = coverScale;
            scaleY = coverScale;
            break;
          case 'fill':
            // Scale to exactly fill cell dimensions
            if (cellConstraints.maintainAspectRatio) {
              // Fill to match the larger dimension while maintaining aspect ratio
              const fillScale = Math.max(availableWidth / shapeWidth, availableHeight / shapeHeight);
              scaleX = fillScale;
              scaleY = fillScale;
            } else {
              // Independent scaling - stretch to fill completely (distorts aspect ratio)
              scaleX = availableWidth / shapeWidth;
              scaleY = availableHeight / shapeHeight;
            }
            break;
        }
        
        // Apply the calculated scale to the shape's transform
        shape.transform.scaleX = (shape.transform.scaleX || 1) * scaleX;
        shape.transform.scaleY = (shape.transform.scaleY || 1) * scaleY;
        
        console.log(`🔲 [CELL MODE] Shape ${index}: fitMode=${cellConstraints.fitMode}, scale=${scaleX.toFixed(2)}, cellSize=${cellWidth.toFixed(0)}x${cellHeight.toFixed(0)}, shapeSize=${shapeWidth}x${shapeHeight}`);
      }
    }
    
    // Always apply position offsets additively to grid layout
    const positionOffsetX = shape.transform?.x || 0;
    const positionOffsetY = shape.transform?.y || 0;
    
    // Also apply random offsets
    const randomX = (Math.random() - 0.5) * 2 * config.gridXRandomization;
    const randomY = (Math.random() - 0.5) * 2 * config.gridYRandomization;
    
    const finalX = gridPos.x + positionOffsetX + randomX + cellOffsetX;
    const finalY = gridPos.y + positionOffsetY + randomY + cellOffsetY;
    
    // Apply final grid position
    shape.transform.x = finalX;
    shape.transform.y = finalY;
    
    // Return shape with grid context
    return {
      shape,
      rowIndex,
      colIndex,
      generationIndex: index
    };
  });
}

// Apply auto-distribute layout: shapes distributed in X and Y directions based on counts
export function applyAutoDistribution(
  shapes: any[],
  config: DistributionConfig,
  canvasCenter = { x: 0, y: 0 },
  artboardBounds?: { x: number; y: number; width: number; height: number }
): any[] {
  if (!config.enabled || config.pattern !== 'auto-distribute') return shapes;
  
  const xCount = config.autoDistributeXCount || 0;
  const yCount = config.autoDistributeYCount || 0;
  const totalShapes = shapes.length;
  
  // Calculate artboard center from bounds (or use canvas center as fallback)
  const artboardCenterX = artboardBounds 
    ? artboardBounds.x + artboardBounds.width / 2 
    : canvasCenter.x;
  const artboardCenterY = artboardBounds 
    ? artboardBounds.y + artboardBounds.height / 2 
    : canvasCenter.y;
  
  // Auto-calculate spacing based on artboard dimensions
  const xSpacing = artboardBounds ? artboardBounds.width / (xCount + 1) : 100;
  const ySpacing = artboardBounds ? artboardBounds.height / (yCount + 1) : 100;
  
  // Distribute shapes
  return shapes.map((shape, index) => {
    let x, y;
    
    if (index < xCount) {
      // First xCount shapes distributed along X axis
      const xIndex = index + 1;
      x = artboardCenterX - (artboardBounds?.width || 400) / 2 + (xIndex * xSpacing);
      y = artboardCenterY;
    } else {
      // Remaining shapes distributed along Y axis
      const yIndex = (index - xCount) + 1;
      x = artboardCenterX;
      y = artboardCenterY - (artboardBounds?.height || 400) / 2 + (yIndex * ySpacing);
    }
    
    // Apply additive random offset
    const randomX = (Math.random() - 0.5) * 2 * config.gridXRandomization;
    const randomY = (Math.random() - 0.5) * 2 * config.gridYRandomization;
    
    // Always apply position offsets additively
    const positionOffsetX = shape.transform?.x || 0;
    const positionOffsetY = shape.transform?.y || 0;
    
    const finalX = x + randomX + positionOffsetX;
    const finalY = y + randomY + positionOffsetY;
    
    shape.transform.x = finalX;
    shape.transform.y = finalY;
    
    return shape;
  });
}

// Apply wave distribution: shapes positioned along a wave pattern (sine, triangle, square, sawtooth)
export function applyWaveDistribution(
  shapes: any[],
  config: DistributionConfig,
  canvasCenter = { x: 0, y: 0 },
  artboardBounds?: { x: number; y: number; width: number; height: number }
): any[] {
  if (!config.enabled || config.pattern !== 'wave') return shapes;
  
  const waveType = config.waveType || 'sine';
  const amplitude = config.waveAmplitude || 50;
  const frequency = config.waveFrequency || 2;
  const direction = config.waveDirection || 'horizontal';
  const phaseOffset = (config.wavePhaseOffset || 0) * (Math.PI / 180); // Convert to radians
  
  // Calculate artboard center
  const artboardCenterX = artboardBounds 
    ? artboardBounds.x + artboardBounds.width / 2 
    : canvasCenter.x;
  const artboardCenterY = artboardBounds 
    ? artboardBounds.y + artboardBounds.height / 2 
    : canvasCenter.y;
  
  // Calculate wave path length
  const pathLength = direction === 'horizontal' 
    ? (artboardBounds?.width || 400)
    : (artboardBounds?.height || 400);
  
  const totalShapes = shapes.length;
  const spacing = pathLength / (totalShapes + 1);
  
  return shapes.map((shape, index) => {
    const t = (index + 1) * spacing; // Position along the path
    const phase = (t / pathLength) * frequency * 2 * Math.PI + phaseOffset;
    
    // Calculate wave offset based on wave type
    let waveOffset = 0;
    switch (waveType) {
      case 'sine':
        waveOffset = Math.sin(phase) * amplitude;
        break;
      case 'triangle':
        waveOffset = (2 * amplitude / Math.PI) * Math.asin(Math.sin(phase));
        break;
      case 'square':
        waveOffset = Math.sign(Math.sin(phase)) * amplitude;
        break;
      case 'sawtooth':
        waveOffset = (2 * amplitude / Math.PI) * (phase % (2 * Math.PI) - Math.PI);
        break;
    }
    
    let x, y;
    if (direction === 'horizontal') {
      x = artboardCenterX - pathLength / 2 + t;
      y = artboardCenterY + waveOffset;
    } else {
      x = artboardCenterX + waveOffset;
      y = artboardCenterY - pathLength / 2 + t;
    }
    
    // Apply additive random offset
    const randomX = (Math.random() - 0.5) * 2 * config.gridXRandomization;
    const randomY = (Math.random() - 0.5) * 2 * config.gridYRandomization;
    
    // Always apply position offsets additively
    const positionOffsetX = shape.transform?.x || 0;
    const positionOffsetY = shape.transform?.y || 0;
    const finalX = x + randomX + positionOffsetX;
    const finalY = y + randomY + positionOffsetY;
    
    shape.transform.x = finalX;
    shape.transform.y = finalY;
    
    return shape;
  });
}

// Apply ellipse distribution: shapes positioned in concentric ellipse rings
export function applyEllipseDistribution(
  shapes: any[],
  config: DistributionConfig,
  canvasCenter = { x: 0, y: 0 },
  artboardBounds?: { x: number; y: number; width: number; height: number }
): any[] {
  if (!config.enabled || config.pattern !== 'ellipse') return shapes;
  
  const xRadiusRange = config.ellipseXRadius || [80, 120];
  const yRadiusRange = config.ellipseYRadius || [80, 120];
  const ringCount = config.ellipseRingCount || 1;
  const ringSpacing = config.ellipseRingSpacing || 'even';
  const rotation = (config.ellipseRotation || 0) * (Math.PI / 180);
  const rotationAlignment = config.ellipseRotationAlignment || 'uniform';
  const alignToRing = config.ellipseAlignToRing || false;
  const flipInward = config.ellipseFlipInward || false;
  const additionalRotation = (config.ellipseAdditionalRotation || 0) * (Math.PI / 180);
  const shapeRotationMode = config.ellipseShapeRotationMode || 'none';
  const rotationFixed = (config.ellipseRotationFixed || 0) * (Math.PI / 180);
  const rotationRange = config.ellipseRotationRange || [0, 360];
  const rotationIncrementalStart = (config.ellipseRotationIncrementalStart || 0) * (Math.PI / 180);
  const rotationIncrementalStep = (config.ellipseRotationIncrementalStep || 10) * (Math.PI / 180);
  
  // Calculate artboard center
  const artboardCenterX = artboardBounds 
    ? artboardBounds.x + artboardBounds.width / 2 
    : canvasCenter.x;
  const artboardCenterY = artboardBounds 
    ? artboardBounds.y + artboardBounds.height / 2 
    : canvasCenter.y;
  
  const totalShapes = shapes.length;
  
  // Calculate descending arithmetic sequence for smooth distribution
  // Formula: a = (N + R×(R-1)/2) / R
  // Example: 50 shapes, 4 rings -> a = (50 + 6)/4 = 14 -> [14, 13, 12, 11]
  const startingCount = Math.round((totalShapes + ringCount * (ringCount - 1) / 2) / ringCount);
  const ringAllocations: number[] = [];
  
  for (let i = 0; i < ringCount; i++) {
    ringAllocations[i] = Math.max(0, startingCount - i);
  }
  
  // Adjust for rounding errors by distributing any difference
  const currentTotal = ringAllocations.reduce((sum, count) => sum + count, 0);
  const difference = totalShapes - currentTotal;
  
  if (difference !== 0) {
    // Distribute the difference across rings to match exactly
    for (let i = 0; i < Math.abs(difference); i++) {
      const ringIndex = i % ringCount;
      ringAllocations[ringIndex] += difference > 0 ? 1 : -1;
    }
  }
  
  // Group shapes by ring using the calculated allocations
  const shapesByRing: any[][] = [];
  for (let i = 0; i < ringCount; i++) {
    shapesByRing[i] = [];
  }
  
  let shapeIndex = 0;
  for (let ringIdx = 0; ringIdx < ringCount; ringIdx++) {
    for (let i = 0; i < ringAllocations[ringIdx]; i++) {
      if (shapeIndex < totalShapes) {
        shapesByRing[ringIdx].push({ shape: shapes[shapeIndex], originalIndex: shapeIndex });
        shapeIndex++;
      }
    }
  }
  
  return shapes.map((shape, index) => {
    // Find which ring this shape belongs to
    let ringIndex = 0;
    let cumulativeCount = 0;
    for (let i = 0; i < ringCount; i++) {
      if (index < cumulativeCount + ringAllocations[i]) {
        ringIndex = i;
        break;
      }
      cumulativeCount += ringAllocations[i];
    }
    
    // Calculate index within the ring
    cumulativeCount = 0;
    for (let i = 0; i < ringIndex; i++) {
      cumulativeCount += ringAllocations[i];
    }
    const indexInRing = index - cumulativeCount;
    
    // Calculate angle step based on actual number of shapes in this ring
    const shapesInThisRing = shapesByRing[ringIndex].length;
    const angleStep = (2 * Math.PI) / shapesInThisRing;
    const angle = indexInRing * angleStep;
    
    // Calculate ring radius based on spacing mode
    let ringProgress;
    if (ringSpacing === 'progressive') {
      ringProgress = Math.pow(ringIndex / Math.max(ringCount - 1, 1), 1.5);
    } else {
      ringProgress = ringIndex / Math.max(ringCount - 1, 1);
    }
    
    // Interpolate radius based on ring
    const xRadius = xRadiusRange[0] + (xRadiusRange[1] - xRadiusRange[0]) * ringProgress;
    const yRadius = yRadiusRange[0] + (yRadiusRange[1] - yRadiusRange[0]) * ringProgress;
    
    // Calculate rotation based on alignment mode
    const shapeRotation = rotationAlignment === 'progressive' 
      ? rotation * Math.pow(ringIndex / Math.max(ringCount - 1, 1), 1.5)
      : rotation;
    
    // Calculate position on ellipse with rotation
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const cosRot = Math.cos(shapeRotation);
    const sinRot = Math.sin(shapeRotation);
    
    const x = artboardCenterX + (xRadius * cosAngle * cosRot - yRadius * sinAngle * sinRot);
    const y = artboardCenterY + (xRadius * cosAngle * sinRot + yRadius * sinAngle * cosRot);
    
    // Apply additive random offset
    const randomX = (Math.random() - 0.5) * 2 * config.gridXRandomization;
    const randomY = (Math.random() - 0.5) * 2 * config.gridYRandomization;
    
    // Always apply position offsets additively
    const positionOffsetX = shape.transform?.x || 0;
    const positionOffsetY = shape.transform?.y || 0;
    const finalX = x + randomX + positionOffsetX;
    const finalY = y + randomY + positionOffsetY;
    
    shape.transform.x = finalX;
    shape.transform.y = finalY;
    
    // Apply align-to-ring tangent rotation
    let finalRotation = 0;
    if (alignToRing) {
      // Calculate tangent angle at this point on the ellipse
      // For an ellipse, the tangent angle is perpendicular to the normal
      // The normal direction from center to point is angle, so tangent is angle + 90°
      let tangentAngle = angle + shapeRotation + Math.PI / 2;
      
      // Flip inward reverses the tangent direction
      if (flipInward) {
        tangentAngle += Math.PI;
      }
      
      // Add additional rotation offset
      finalRotation = tangentAngle + additionalRotation;
    }
    
    // Apply shape rotation mode on top of align-to-ring rotation
    if (shapeRotationMode === 'fixed') {
      finalRotation += rotationFixed;
    } else if (shapeRotationMode === 'range') {
      const minRot = rotationRange[0] * (Math.PI / 180);
      const maxRot = rotationRange[1] * (Math.PI / 180);
      finalRotation += minRot + Math.random() * (maxRot - minRot);
    } else if (shapeRotationMode === 'incremental') {
      finalRotation += rotationIncrementalStart + (index * rotationIncrementalStep);
    }
    
    // Convert rotation back to degrees and apply to shape
    shape.transform.rotation = finalRotation * (180 / Math.PI);
    
    return shape;
  });
}

// Apply spiral distribution: shapes positioned along a spiral path
export function applySpiralDistribution(
  shapes: any[],
  config: DistributionConfig,
  canvasCenter = { x: 0, y: 0 },
  artboardBounds?: { x: number; y: number; width: number; height: number }
): any[] {
  if (!config.enabled || config.pattern !== 'spiral') return shapes;
  
  const turnCount = config.spiralTurnCount || 3;
  const spacingMode = config.spiralSpacingMode || 'linear';
  const direction = config.spiralDirection || 'clockwise';
  const startAngle = (config.spiralStartAngle || 0) * (Math.PI / 180); // Convert to radians
  const tightness = config.spiralTightness || 1.0;
  
  // Calculate artboard center
  const artboardCenterX = artboardBounds 
    ? artboardBounds.x + artboardBounds.width / 2 
    : canvasCenter.x;
  const artboardCenterY = artboardBounds 
    ? artboardBounds.y + artboardBounds.height / 2 
    : canvasCenter.y;
  
  const totalShapes = shapes.length;
  const totalAngle = turnCount * 2 * Math.PI;
  const maxRadius = Math.min(
    artboardBounds?.width || 400, 
    artboardBounds?.height || 400
  ) / 2 * 0.8; // Use 80% of available space
  
  return shapes.map((shape, index) => {
    const progress = index / Math.max(totalShapes - 1, 1);
    
    // Calculate angle based on direction
    const angle = direction === 'clockwise'
      ? startAngle + (progress * totalAngle)
      : startAngle - (progress * totalAngle);
    
    // Calculate radius based on spacing mode
    let radius;
    if (spacingMode === 'logarithmic') {
      // Logarithmic: expands outward
      radius = maxRadius * Math.pow(progress, tightness);
    } else {
      // Linear: constant spacing
      radius = maxRadius * progress * tightness;
    }
    
    // Calculate position
    const x = artboardCenterX + radius * Math.cos(angle);
    const y = artboardCenterY + radius * Math.sin(angle);
    
    // Apply additive random offset
    const randomX = (Math.random() - 0.5) * 2 * config.gridXRandomization;
    const randomY = (Math.random() - 0.5) * 2 * config.gridYRandomization;
    
    // Always apply position offsets additively
    const positionOffsetX = shape.transform?.x || 0;
    const positionOffsetY = shape.transform?.y || 0;
    const finalX = x + randomX + positionOffsetX;
    const finalY = y + randomY + positionOffsetY;
    
    shape.transform.x = finalX;
    shape.transform.y = finalY;
    
    return shape;
  });
}

// Helper function to resolve scalar mode to actual value
export const resolveScalar = (config: ScalarMode<number>, index?: number): number => {
  switch (config.kind) {
    case 'fixed':
      return config.value;
    case 'range':
      // For now, return random value in range. Can be enhanced with distribution later
      return Math.random() * (config.max - config.min) + config.min;
    case 'incremental':
      return config.startValue + (config.increment * (index || 0));
    default:
      return 0;
  }
};

// Default configurations for line-vector properties
export const getDefaultLineVectorConfig = () => ({
  direction: { kind: 'range' as const, min: 0, max: 360 },
  length: { kind: 'range' as const, min: 5, max: 500 },
  centroid: { kind: 'fixed' as const, value: 0.5 },
  strokeCapProbabilities: { round: 33, square: 33, butt: 34 }
});
