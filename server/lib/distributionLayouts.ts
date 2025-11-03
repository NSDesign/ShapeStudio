/**
 * Distribution Layout Functions for Server-side Shape Generation
 * Ported from client/src/lib/shapeTypes.ts
 * 
 * These functions apply advanced distribution patterns to shapes:
 * - Grid distribution with sorting and randomization
 * - Wave patterns (sine, triangle, square, sawtooth)
 * - Ellipse/ring patterns with rotation
 * - Spiral patterns with configurable tightness
 * - Auto-distribution for even spacing
 */

interface DistributionConfig {
  enabled: boolean;
  pattern: 'grid' | 'wave' | 'ellipse' | 'spiral' | 'auto-distribute';
  
  // Grid Layout Settings
  gridRows?: number;
  gridColumns?: number;
  gridStartX?: number;
  gridStartY?: number;
  gridSpacingXMode?: 'define' | 'auto-centered' | 'auto-edge-to-edge';
  gridSpacingYMode?: 'define' | 'auto-centered' | 'auto-edge-to-edge';
  gridRowOffset?: number;
  gridColumnOffset?: number;
  gridMarginEnabled?: boolean;
  gridMarginValue?: number;
  gridSortBy?: string;
  gridSortScope?: 'per-generation' | 'per-batch';
  gridSortOrder?: 'ascending' | 'descending';
  gridGroupByShapeType?: boolean;
  gridReverseGroups?: boolean;
  gridXRandomization?: number;
  gridYRandomization?: number;
  
  // Auto Distribute Settings
  autoDistributeXCount?: number;
  autoDistributeYCount?: number;
  
  // Wave Pattern Settings
  waveType?: 'sine' | 'triangle' | 'square' | 'sawtooth';
  waveAmplitude?: number;
  waveFrequency?: number;
  waveDirection?: 'horizontal' | 'vertical';
  wavePhaseOffset?: number;
  
  // Ellipse Pattern Settings
  ellipseXRadius?: [number, number];
  ellipseYRadius?: [number, number];
  ellipseRingCount?: number;
  ellipseRingSpacing?: 'even' | 'progressive';
  ellipseRotation?: number;
  ellipseRotationAlignment?: 'uniform' | 'progressive';
  
  // Spiral Pattern Settings
  spiralTurnCount?: number;
  spiralSpacingMode?: 'linear' | 'logarithmic';
  spiralDirection?: 'clockwise' | 'counterclockwise';
  spiralStartAngle?: number;
  spiralTightness?: number;
  
  // Shared Settings
  tangentAlignment?: boolean;
  segmentDistribution?: 'even' | 'clustered';
  reverseDirection?: boolean;
  positionsEnabled?: boolean;
}

/**
 * Helper function to sort shapes for grid distribution
 */
function sortShapesForGrid(
  shapes: any[],
  sortBy: string = 'none',
  order: 'ascending' | 'descending' = 'ascending',
  groupByShapeType: boolean = false,
  reverseGroups: boolean = false
): any[] {
  if (sortBy === 'none' && !groupByShapeType) return shapes;

  let sortedShapes = [...shapes];
  
  // Group by shape type if requested
  if (groupByShapeType) {
    const groups = new Map<string, any[]>();
    
    shapes.forEach(shape => {
      const type = shape.type || 'unknown';
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)!.push(shape);
    });
    
    // Sort within each group
    groups.forEach((groupShapes, type) => {
      groups.set(type, sortShapesWithinGroup(groupShapes, sortBy, order));
    });
    
    // Combine groups back together
    const groupEntries = Array.from(groups.entries());
    
    // Optionally reverse the order of groups
    if (reverseGroups) {
      groupEntries.reverse();
    }
    
    sortedShapes = groupEntries.flatMap(([_, groupShapes]) => groupShapes);
  } else {
    sortedShapes = sortShapesWithinGroup(sortedShapes, sortBy, order);
  }
  
  return sortedShapes;
}

/**
 * Helper to sort shapes within a group
 */
function sortShapesWithinGroup(
  shapes: any[],
  sortBy: string,
  order: 'ascending' | 'descending'
): any[] {
  if (sortBy === 'none') return shapes;
  
  const sorted = [...shapes].sort((a, b) => {
    let compareValue = 0;
    
    switch (sortBy) {
      case 'layer':
        compareValue = (a.properties?.zIndex || 0) - (b.properties?.zIndex || 0);
        break;
      case 'creation-time':
        compareValue = a.id.localeCompare(b.id);
        break;
      case 'shape-type':
        compareValue = (a.type || '').localeCompare(b.type || '');
        break;
      case 'size':
        const sizeA = (a.width || 0) * (a.height || 0) || (a.radius || 0) * (a.radius || 0) * Math.PI;
        const sizeB = (b.width || 0) * (b.height || 0) || (b.radius || 0) * (b.radius || 0) * Math.PI;
        compareValue = sizeA - sizeB;
        break;
      case 'fill-color':
        compareValue = (a.properties?.fillColor || '').localeCompare(b.properties?.fillColor || '');
        break;
      case 'opacity':
        compareValue = (a.properties?.fillOpacity || 0) - (b.properties?.fillOpacity || 0);
        break;
      case 'angle':
        compareValue = (a.transform?.rotation || 0) - (b.transform?.rotation || 0);
        break;
      case 'id':
        compareValue = a.id.localeCompare(b.id);
        break;
      case 'corner-radius':
        compareValue = (a.cornerRadius || 0) - (b.cornerRadius || 0);
        break;
      case 'point-count':
        compareValue = (a.points?.length || 0) - (b.points?.length || 0);
        break;
      case 'edge-count':
        compareValue = (a.sides || 0) - (b.sides || 0);
        break;
      case 'inner-radius':
        compareValue = (a.innerRadius || 0) - (b.innerRadius || 0);
        break;
      case 'segment-count':
        compareValue = (a.segments || 0) - (b.segments || 0);
        break;
      case 'direction':
        // For line-vector shapes
        compareValue = 0;
        break;
      case 'length':
        // For line shapes
        if (a.points?.length >= 2 && b.points?.length >= 2) {
          const lengthA = Math.sqrt(
            Math.pow(a.points[1].x - a.points[0].x, 2) + 
            Math.pow(a.points[1].y - a.points[0].y, 2)
          );
          const lengthB = Math.sqrt(
            Math.pow(b.points[1].x - b.points[0].x, 2) + 
            Math.pow(b.points[1].y - b.points[0].y, 2)
          );
          compareValue = lengthA - lengthB;
        }
        break;
      case 'centroid':
        compareValue = 0;
        break;
      case 'spread':
      case 'curvature':
        compareValue = 0;
        break;
    }
    
    return order === 'ascending' ? compareValue : -compareValue;
  });
  
  return sorted;
}

/**
 * Apply grid distribution to shapes
 */
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
    sortedShapes = sortShapesForGrid(
      shapes, 
      config.gridSortBy, 
      config.gridSortOrder,
      config.gridGroupByShapeType || false,
      config.gridReverseGroups || false
    );
  }
  
  return sortedShapes.map((shape, index) => {
    const rows = config.gridRows || 3;
    const columns = config.gridColumns || 3;
    const startX = config.gridStartX || 0;
    const startY = config.gridStartY || 0;
    
    const row = Math.floor(index / columns);
    const col = index % columns;
    
    // Calculate spacing based on mode
    let columnSpacing, rowSpacing;
    
    if (config.gridSpacingXMode === 'auto-centered' && artboardBounds) {
      const margin = config.gridMarginEnabled ? config.gridMarginValue || 20 : 40;
      const availableWidth = artboardBounds.width - (margin * 2);
      columnSpacing = columns > 1 ? availableWidth / (columns - 1) : 0;
    } else if (config.gridSpacingXMode === 'auto-edge-to-edge' && artboardBounds) {
      columnSpacing = columns > 1 ? artboardBounds.width / (columns - 1) : 0;
    } else {
      columnSpacing = config.gridColumnOffset || 50;
    }
    
    if (config.gridSpacingYMode === 'auto-centered' && artboardBounds) {
      const margin = config.gridMarginEnabled ? config.gridMarginValue || 20 : 40;
      const availableHeight = artboardBounds.height - (margin * 2);
      rowSpacing = rows > 1 ? availableHeight / (rows - 1) : 0;
    } else if (config.gridSpacingYMode === 'auto-edge-to-edge' && artboardBounds) {
      rowSpacing = rows > 1 ? artboardBounds.height / (rows - 1) : 0;
    } else {
      rowSpacing = config.gridRowOffset || 50;
    }
    
    // Calculate base position
    let gridX = col * columnSpacing;
    let gridY = row * rowSpacing;
    
    // Apply start position offset
    gridX += startX;
    gridY += startY;
    
    // Center the grid
    const totalGridWidth = (columns - 1) * columnSpacing;
    const totalGridHeight = (rows - 1) * rowSpacing;
    
    const artboardCenterX = artboardBounds 
      ? artboardBounds.x + artboardBounds.width / 2 
      : canvasCenter.x;
    const artboardCenterY = artboardBounds 
      ? artboardBounds.y + artboardBounds.height / 2 
      : canvasCenter.y;
    
    // Adjust for auto-edge-to-edge mode
    let offsetX, offsetY;
    if (config.gridSpacingXMode === 'auto-edge-to-edge' && artboardBounds) {
      offsetX = artboardBounds.x - totalGridWidth / 2;
    } else {
      offsetX = artboardCenterX - totalGridWidth / 2;
    }
    
    if (config.gridSpacingYMode === 'auto-edge-to-edge' && artboardBounds) {
      offsetY = artboardBounds.y - totalGridHeight / 2;
    } else {
      offsetY = artboardCenterY - totalGridHeight / 2;
    }
    
    // Apply additive random offset
    const randomX = (Math.random() - 0.5) * 2 * (config.gridXRandomization || 0);
    const randomY = (Math.random() - 0.5) * 2 * (config.gridYRandomization || 0);
    
    let finalX, finalY;
    if (config.positionsEnabled) {
      const positionOffsetX = shape.transform?.x || 0;
      const positionOffsetY = shape.transform?.y || 0;
      finalX = offsetX + gridX + randomX + positionOffsetX;
      finalY = offsetY + gridY + randomY + positionOffsetY;
    } else {
      finalX = offsetX + gridX + randomX;
      finalY = offsetY + gridY + randomY;
    }
    
    shape.transform.x = finalX;
    shape.transform.y = finalY;
    
    return shape;
  });
}

/**
 * Apply wave distribution to shapes
 */
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
  const phaseOffset = (config.wavePhaseOffset || 0) * (Math.PI / 180);
  
  const artboardCenterX = artboardBounds 
    ? artboardBounds.x + artboardBounds.width / 2 
    : canvasCenter.x;
  const artboardCenterY = artboardBounds 
    ? artboardBounds.y + artboardBounds.height / 2 
    : canvasCenter.y;
  
  const pathLength = direction === 'horizontal' 
    ? (artboardBounds?.width || 400)
    : (artboardBounds?.height || 400);
  
  const totalShapes = shapes.length;
  const spacing = pathLength / (totalShapes + 1);
  
  return shapes.map((shape, index) => {
    const t = (index + 1) * spacing;
    const phase = (t / pathLength) * frequency * 2 * Math.PI + phaseOffset;
    
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
    
    const randomX = (Math.random() - 0.5) * 2 * (config.gridXRandomization || 0);
    const randomY = (Math.random() - 0.5) * 2 * (config.gridYRandomization || 0);
    
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

/**
 * Apply ellipse distribution to shapes
 */
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
    
    let ringProgress;
    if (ringSpacing === 'progressive') {
      ringProgress = Math.pow(ringIndex / Math.max(ringCount - 1, 1), 1.5);
    } else {
      ringProgress = ringIndex / Math.max(ringCount - 1, 1);
    }
    
    const xRadius = xRadiusRange[0] + (xRadiusRange[1] - xRadiusRange[0]) * ringProgress;
    const yRadius = yRadiusRange[0] + (yRadiusRange[1] - yRadiusRange[0]) * ringProgress;
    
    const shapeRotation = rotationAlignment === 'progressive' 
      ? rotation * Math.pow(ringIndex / Math.max(ringCount - 1, 1), 1.5)
      : rotation;
    
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const cosRot = Math.cos(shapeRotation);
    const sinRot = Math.sin(shapeRotation);
    
    const x = artboardCenterX + (xRadius * cosAngle * cosRot - yRadius * sinAngle * sinRot);
    const y = artboardCenterY + (xRadius * cosAngle * sinRot + yRadius * sinAngle * cosRot);
    
    const randomX = (Math.random() - 0.5) * 2 * (config.gridXRandomization || 0);
    const randomY = (Math.random() - 0.5) * 2 * (config.gridYRandomization || 0);
    
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

/**
 * Apply spiral distribution to shapes
 */
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
  const startAngle = (config.spiralStartAngle || 0) * (Math.PI / 180);
  const tightness = config.spiralTightness || 1.0;
  
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
  ) / 2 * 0.8;
  
  return shapes.map((shape, index) => {
    const progress = index / Math.max(totalShapes - 1, 1);
    
    const angle = direction === 'clockwise'
      ? startAngle + (progress * totalAngle)
      : startAngle - (progress * totalAngle);
    
    let radius;
    if (spacingMode === 'logarithmic') {
      radius = maxRadius * Math.pow(progress, tightness);
    } else {
      radius = maxRadius * progress * tightness;
    }
    
    const x = artboardCenterX + radius * Math.cos(angle);
    const y = artboardCenterY + radius * Math.sin(angle);
    
    const randomX = (Math.random() - 0.5) * 2 * (config.gridXRandomization || 0);
    const randomY = (Math.random() - 0.5) * 2 * (config.gridYRandomization || 0);
    
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

/**
 * Apply auto-distribution to shapes
 */
export function applyAutoDistribution(
  shapes: any[],
  config: DistributionConfig,
  canvasCenter = { x: 0, y: 0 },
  artboardBounds?: { x: number; y: number; width: number; height: number }
): any[] {
  if (!config.enabled || config.pattern !== 'auto-distribute') return shapes;
  
  const xCount = config.autoDistributeXCount || 3;
  const yCount = config.autoDistributeYCount || 3;
  
  const artboardCenterX = artboardBounds 
    ? artboardBounds.x + artboardBounds.width / 2 
    : canvasCenter.x;
  const artboardCenterY = artboardBounds 
    ? artboardBounds.y + artboardBounds.height / 2 
    : canvasCenter.y;
  
  const width = artboardBounds?.width || 400;
  const height = artboardBounds?.height || 400;
  
  const xSpacing = width / (xCount + 1);
  const ySpacing = height / (yCount + 1);
  
  const totalPositions = xCount * yCount;
  const actualShapeCount = shapes.length;
  
  return shapes.map((shape, index) => {
    const positionIndex = index % totalPositions;
    const row = Math.floor(positionIndex / xCount);
    const col = positionIndex % xCount;
    
    const x = artboardCenterX - width / 2 + (col + 1) * xSpacing;
    const y = artboardCenterY - height / 2 + (row + 1) * ySpacing;
    
    const randomX = (Math.random() - 0.5) * 2 * (config.gridXRandomization || 0);
    const randomY = (Math.random() - 0.5) * 2 * (config.gridYRandomization || 0);
    
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