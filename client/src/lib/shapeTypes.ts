export interface Point {
  x: number;
  y: number;
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
  gridSortBy: 'layer' | 'id' | 'shape-type' | 'fill-color' | 'opacity' | 'none';
  gridXRandomization: number;
  gridYRandomization: number;
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
    type: 'linear' | 'radial';
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
  | 'square' 
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
  | 'polygon' 
  | 'star' 
  | 'chunk' 
  | 'blob'
  | 'ring'
  | 'bezier'
  | 'cubic'
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
  renderType?: 'polygon' | 'bezier' | 'cubic' | 'smooth'; // How to render the shape
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
    openProbability: number;
    strokeCapProbabilities: { round: number; square: number; butt: number };
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
  rectangle: {
    cornerRadiusRange: [number, number];
  };
  square: {
    cornerRadiusRange: [number, number];
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

export function sortShapesForGrid(shapes: any[], sortBy: string): any[] {
  if (sortBy === 'none') return shapes;
  
  return [...shapes].sort((a, b) => {
    switch (sortBy) {
      case 'layer':
        return (a.properties?.zIndex || 0) - (b.properties?.zIndex || 0);
      case 'id':
        return a.id.localeCompare(b.id);
      case 'shape-type':
        return a.type.localeCompare(b.type);
      case 'fill-color':
        const aFill = a.properties?.fillColor || '#000000';
        const bFill = b.properties?.fillColor || '#000000';
        return aFill.localeCompare(bFill);
      case 'opacity':
        return (a.properties?.opacity || 1) - (b.properties?.opacity || 1);
      default:
        return 0;
    }
  });
}

export function applyGridDistribution(
  shapes: any[], 
  config: DistributionConfig,
  canvasCenter = { x: 0, y: 0 }
): any[] {
  if (!config.enabled || config.pattern !== 'grid') return shapes;
  
  const sortedShapes = sortShapesForGrid(shapes, config.gridSortBy);
  
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
    
    // Scale existing transform randomization using X/Y randomization factors
    // If randomization is 0, existing transform is preserved (no scaling)
    // If randomization is 100, existing transform variation is maximized
    const existingXVariation = shape.transform?.x || 0;
    const existingYVariation = shape.transform?.y || 0;
    
    const xScaleFactor = config.gridXRandomization / 100; // Convert 0-100 to 0-1 scale
    const yScaleFactor = config.gridYRandomization / 100; // Convert 0-100 to 0-1 scale
    
    const scaledXVariation = existingXVariation * xScaleFactor;
    const scaledYVariation = existingYVariation * yScaleFactor;
    
    // Apply grid position with scaled existing variation
    // Grid provides base position, scaled existing transform provides controlled variation
    shape.transform.x = gridPos.x + scaledXVariation;
    shape.transform.y = gridPos.y + scaledYVariation;
    
    return shape;
  });
}
