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
  gridSortBy: 'layer' | 'id' | 'shape-type' | 'fill-color' | 'opacity' | 'size' | 'angle' | 'creation-time' | 'none';
  gridSortScope: 'per-generation' | 'per-batch';
  gridSortOrder: 'ascending' | 'descending';
  gridXRandomization: number;
  gridYRandomization: number;
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
  spiralTurnCount?: number;
  spiralSpacingMode?: 'linear' | 'logarithmic';
  spiralDirection?: 'clockwise' | 'counterclockwise';
  spiralStartAngle?: number;
  spiralTightness?: number;
  tangentAlignment?: boolean;
  segmentDistribution?: 'even' | 'clustered';
  reverseDirection?: boolean;
  positionsEnabled: boolean; // Whether to add position offsets to grid layout
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
export type ModeKind = 'values' | 'range' | 'fixed';

export interface ValuesMode<T> { 
  kind: 'values'; 
  values: T[]; 
  selection: 'random' | 'cycle'; 
  startIndex?: number;
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

export type ScalarMode<T> = ValuesMode<T> | RangeMode<T> | FixedMode<T>;

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
  width: number;
  height: number;
  backgroundColor?: string;
  displayGrid?: boolean;
  displayBorder?: boolean;
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
  marginValue: number = 50
): GridPosition {
  const totalPositions = rows * columns;
  const adjustedIndex = index % totalPositions;
  
  const row = Math.floor(adjustedIndex / columns);
  const column = adjustedIndex % columns;
  
  // Debug logging for first position only
  if (index === 0) {
    console.log('🔍 [GRID DEBUG] calculateGridPosition - Initial params:', {
      rows,
      columns,
      rowOffset,
      columnOffset,
      centerX,
      centerY,
      artboardBounds,
      gridStartX,
      gridStartY,
      spacingXMode,
      spacingYMode,
      marginEnabled,
      marginValue
    });
  }
  
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
        
        if (index === 0) {
          console.log('🔍 [GRID DEBUG] X-axis auto-centered with margin:', {
            availableWidth,
            effectiveColumnOffset,
            calculation: `artboardBounds.x(${artboardBounds.x}) - centerX(${centerX}) + marginValue(${marginValue})`,
            startX
          });
        }
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
        
        if (index === 0) {
          console.log('🔍 [GRID DEBUG] Y-axis auto-centered with margin:', {
            availableHeight,
            effectiveRowOffset,
            calculation: `artboardBounds.y(${artboardBounds.y}) - centerY(${centerY}) + marginValue(${marginValue})`,
            startY
          });
        }
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
  
  const x = startX + (column * effectiveColumnOffset) + (ignoreGridStartX ? 0 : gridStartX);
  const y = startY + (row * effectiveRowOffset) + (ignoreGridStartY ? 0 : gridStartY);
  
  if (index === 0 || index === columns - 1 || index === totalPositions - 1) {
    console.log(`🔍 [GRID DEBUG] Position ${index} (row ${row}, col ${column}):`, {
      calculation: `startX(${startX}) + column(${column}) * effectiveColumnOffset(${effectiveColumnOffset}) + gridStartX(${gridStartX})`,
      x,
      calculationY: `startY(${startY}) + row(${row}) * effectiveRowOffset(${effectiveRowOffset}) + gridStartY(${gridStartY})`,
      y
    });
  }
  
  return { x, y, row, column };
}

export function sortShapesForGrid(shapes: any[], sortBy: string, sortOrder: 'ascending' | 'descending' = 'ascending'): any[] {
  if (sortBy === 'none') return shapes;
  
  const sorted = [...shapes].sort((a, b) => {
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
      default:
        return 0;
    }
    
    return sortOrder === 'ascending' ? comparison : -comparison;
  });
  
  return sorted;
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

export function applyGridDistribution(
  shapes: any[], 
  config: DistributionConfig,
  canvasCenter = { x: 0, y: 0 },
  generationInfo?: { currentGeneration?: number, totalGenerations?: number, shapesPerGeneration?: number },
  artboardBounds?: { x: number; y: number; width: number; height: number }
): any[] {
  if (!config.enabled || config.pattern !== 'grid') return shapes;
  
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
        config.gridSortOrder
      );
      
      sortedShapes.push(...sortedGeneration);
    }
  } else {
    // Sort across entire batch
    sortedShapes = sortShapesForGrid(shapes, config.gridSortBy, config.gridSortOrder);
  }
  
  return sortedShapes.map((shape, index) => {
    // Debug: log original transform for first few shapes
    if (index < 3) {
      console.log(`🔍 [GRID DEBUG] applyGridDistribution - Shape ${index} BEFORE:`, {
        originalTransform: { ...shape.transform },
        positionsEnabled: config.positionsEnabled,
        gridXRandomization: config.gridXRandomization,
        gridYRandomization: config.gridYRandomization
      });
    }
    
    const gridPos = calculateGridPosition(
      index,
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
      config.gridMarginValue || 50
    );
    
    // If positions are enabled, preserve existing transform as position offset
    // If positions are disabled, scale existing transform randomization using X/Y randomization factors
    let finalX: number;
    let finalY: number;
    
    if (config.positionsEnabled) {
      // Add position offsets to grid layout
      const positionOffsetX = shape.transform?.x || 0;
      const positionOffsetY = shape.transform?.y || 0;
      
      finalX = gridPos.x + positionOffsetX;
      finalY = gridPos.y + positionOffsetY;
      
      if (index < 3) {
        console.log(`🔍 [GRID DEBUG] Shape ${index} - Positions ENABLED:`, {
          gridPos,
          positionOffsetX,
          positionOffsetY,
          finalX,
          finalY
        });
      }
    } else {
      // Apply additive random offset (0-200px configurable range)
      const randomX = (Math.random() - 0.5) * 2 * config.gridXRandomization; // -randomization to +randomization
      const randomY = (Math.random() - 0.5) * 2 * config.gridYRandomization; // -randomization to +randomization
      
      finalX = gridPos.x + randomX;
      finalY = gridPos.y + randomY;
      
      if (index < 3) {
        console.log(`🔍 [GRID DEBUG] Shape ${index} - Positions DISABLED:`, {
          gridPos,
          randomX,
          randomY,
          finalX,
          finalY
        });
      }
    }
    
    // Apply final grid position
    shape.transform.x = finalX;
    shape.transform.y = finalY;
    
    if (index < 3) {
      console.log(`🔍 [GRID DEBUG] Shape ${index} AFTER:`, {
        finalTransform: { ...shape.transform }
      });
    }
    
    return shape;
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
    
    let finalX, finalY;
    
    if (config.positionsEnabled) {
      // Add position offsets
      const positionOffsetX = shape.transform?.x || 0;
      const positionOffsetY = shape.transform?.y || 0;
      
      finalX = x + randomX + positionOffsetX;
      finalY = y + randomY + positionOffsetY;
    } else {
      finalX = x + randomX;
      finalY = y + randomY;
    }
    
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
    
    let finalX, finalY;
    if (config.positionsEnabled) {
      const positionOffsetX = shape.transform?.x || 0;
      const positionOffsetY = shape.transform?.y || 0;
      finalX = x + randomX + positionOffsetX;
      finalY = y + randomY + positionOffsetY;
    } else {
      finalX = x + randomX;
      finalY = y + randomY;
    }
    
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
  const rotation = (config.ellipseRotation || 0) * (Math.PI / 180); // Convert to radians
  const rotationAlignment = config.ellipseRotationAlignment || 'uniform';
  
  // Calculate artboard center
  const artboardCenterX = artboardBounds 
    ? artboardBounds.x + artboardBounds.width / 2 
    : canvasCenter.x;
  const artboardCenterY = artboardBounds 
    ? artboardBounds.y + artboardBounds.height / 2 
    : canvasCenter.y;
  
  const totalShapes = shapes.length;
  const shapesPerRing = Math.ceil(totalShapes / ringCount);
  
  return shapes.map((shape, index) => {
    const ringIndex = Math.floor(index / shapesPerRing);
    const indexInRing = index % shapesPerRing;
    const angleStep = (2 * Math.PI) / shapesPerRing;
    const angle = indexInRing * angleStep;
    
    // Calculate ring radius based on spacing mode
    let ringProgress;
    if (ringSpacing === 'progressive') {
      // Progressive: rings get further apart
      ringProgress = Math.pow(ringIndex / Math.max(ringCount - 1, 1), 1.5);
    } else {
      // Even: equal spacing
      ringProgress = ringIndex / Math.max(ringCount - 1, 1);
    }
    
    // Interpolate radius based on ring
    const xRadius = xRadiusRange[0] + (xRadiusRange[1] - xRadiusRange[0]) * ringProgress;
    const yRadius = yRadiusRange[0] + (yRadiusRange[1] - yRadiusRange[0]) * ringProgress;
    
    // Calculate rotation based on alignment mode
    const shapeRotation = rotationAlignment === 'progressive' 
      ? rotation * (ringIndex / Math.max(ringCount - 1, 1))
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
    
    let finalX, finalY;
    if (config.positionsEnabled) {
      const positionOffsetX = shape.transform?.x || 0;
      const positionOffsetY = shape.transform?.y || 0;
      finalX = x + randomX + positionOffsetX;
      finalY = y + randomY + positionOffsetY;
    } else {
      finalX = x + randomX;
      finalY = y + randomY;
    }
    
    shape.transform.x = finalX;
    shape.transform.y = finalY;
    
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
    
    let finalX, finalY;
    if (config.positionsEnabled) {
      const positionOffsetX = shape.transform?.x || 0;
      const positionOffsetY = shape.transform?.y || 0;
      finalX = x + randomX + positionOffsetX;
      finalY = y + randomY + positionOffsetY;
    } else {
      finalX = x + randomX;
      finalY = y + randomY;
    }
    
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
    case 'values':
      if (config.values.length === 0) return 0;
      if (config.selection === 'cycle') {
        const startIdx = config.startIndex || 0;
        const cycleIndex = ((index || 0) + startIdx) % config.values.length;
        return config.values[cycleIndex];
      } else {
        // random selection
        const randomIndex = Math.floor(Math.random() * config.values.length);
        return config.values[randomIndex];
      }
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
