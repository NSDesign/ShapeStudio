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
  pattern: 'grid' | 'line' | 'circle' | 'spiral';
  gridRows: number;
  gridColumns: number;
  gridRowOffset: number;
  gridColumnOffset: number;
  gridSortBy: 'layer' | 'id' | 'shape-type' | 'fill-color' | 'opacity' | 'size' | 'angle' | 'creation-time' | 'none';
  gridSortScope: 'per-generation' | 'per-batch';
  gridSortOrder: 'ascending' | 'descending';
  gridXRandomization: number;
  gridYRandomization: number;
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
  | 'luminosity';

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
  centerY = 0
): GridPosition {
  const totalPositions = rows * columns;
  const adjustedIndex = index % totalPositions;
  
  const row = Math.floor(adjustedIndex / columns);
  const column = adjustedIndex % columns;
  
  // Calculate grid position from center
  const startX = centerX - ((columns - 1) * columnOffset) / 2;
  const startY = centerY - ((rows - 1) * rowOffset) / 2;
  
  const x = startX + (column * columnOffset);
  const y = startY + (row * rowOffset);
  
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
  generationInfo?: { currentGeneration?: number, totalGenerations?: number, shapesPerGeneration?: number }
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
    const gridPos = calculateGridPosition(
      index,
      config.gridRows,
      config.gridColumns,
      config.gridRowOffset,
      config.gridColumnOffset,
      canvasCenter.x,
      canvasCenter.y
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
    } else {
      // Scale existing transform randomization using X/Y randomization factors
      // If randomization is 0, existing transform is preserved (no scaling)
      // If randomization is 100, existing transform variation is maximized
      const existingXVariation = shape.transform?.x || 0;
      const existingYVariation = shape.transform?.y || 0;
      
      const xScaleFactor = config.gridXRandomization / 100; // Convert 0-100 to 0-1 scale
      const yScaleFactor = config.gridYRandomization / 100; // Convert 0-100 to 0-1 scale
      
      const scaledXVariation = existingXVariation * xScaleFactor;
      const scaledYVariation = existingYVariation * yScaleFactor;
      
      finalX = gridPos.x + scaledXVariation;
      finalY = gridPos.y + scaledYVariation;
    }
    
    // Apply final grid position
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
  centroid: { kind: 'fixed' as const, value: 0.5 }
});
