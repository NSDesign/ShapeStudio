/**
 * Batch Config Processor for Server-side Shape Generation
 * Ported from client/src/hooks/useShapeEditor.ts
 */

import { Shape } from './shapeGenerator';
import { SmartDistributionAlgorithm } from './distributionAlgorithm';
import { ColorUtils, generateColor, generateGradientColors } from './colorUtils';
import type { BatchConfigSettings } from '../../shared/schema';
import type { ShapeType, Point, DistributionSettings } from '../../client/src/lib/shapeTypes';
import { 
  applyGridDistribution, 
  applyWaveDistribution, 
  applyEllipseDistribution, 
  applySpiralDistribution, 
  applyAutoDistribution 
} from './distributionLayouts';
import { applyIncrementalPositionToShapes } from './positionModulationResolver';
import type { GenerationMetadata } from '../../shared/distributionTypes';
import { getEffectiveTranslateRange } from './artboardUtils';

interface CanvasBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GenerationOptions {
  enabledShapeTypes?: ShapeType[];
  batchConfig: BatchConfigSettings;
  distributionEnabled?: boolean;
  scatterSettings?: {
    distribution: DistributionSettings;
    shapeSpecific?: Record<string, any>;
  };
}

/**
 * Helper function to calculate X position based on batch config settings
 */
function calculatePositionX(
  settings: BatchConfigSettings,
  shapeIndex: number,
  artboardWidth: number,
  artboardHeight: number,
  batchSize: number,
  lastIncrementalIndex: number = 0
): number {
  if (!settings.propertiesEnabled || !settings.shapePropertiesEnabled) {
    return 0;
  }

  switch (settings.xPositionMode) {
    case 'range':
      const [minX, maxX] = settings.xPositionRange;
      return minX + Math.random() * (maxX - minX);

    case 'value':
      return settings.xPositionValue;

    case 'directional':
      return calculateDirectionalPosition(settings, shapeIndex, artboardWidth, artboardHeight, batchSize).x;

    case 'incremental':
      const effectiveIndex = settings.incrementalResetPerBatch ? shapeIndex : (shapeIndex + lastIncrementalIndex);
      let value = settings.xPositionStartValue + (effectiveIndex * settings.xPositionIncrement);
      
      // Apply modulation based on mode
      if (settings.xPositionModulationMode === 'pixel-value' && settings.xPositionModulationValue > 0) {
        value = value % settings.xPositionModulationValue;
      } else if (settings.xPositionModulationMode === 'shape-count' && settings.xPositionModulationValue > 0) {
        // Modulate by shape count (e.g., every 3 shapes resets)
        const moduloIndex = effectiveIndex % settings.xPositionModulationValue;
        value = settings.xPositionStartValue + (moduloIndex * settings.xPositionIncrement);
      }
      // Note: grid-row mode will be implemented when refactoring to use grid cell index
      
      return value;

    default:
      return 0;
  }
}

/**
 * Helper function to calculate Y position based on batch config settings
 */
function calculatePositionY(
  settings: BatchConfigSettings,
  shapeIndex: number,
  artboardWidth: number,
  artboardHeight: number,
  batchSize: number,
  lastIncrementalIndex: number = 0
): number {
  if (!settings.propertiesEnabled || !settings.shapePropertiesEnabled) {
    return 0;
  }

  switch (settings.yPositionMode) {
    case 'range':
      const [minY, maxY] = settings.yPositionRange;
      return minY + Math.random() * (maxY - minY);

    case 'value':
      return settings.yPositionValue;

    case 'directional':
      return calculateDirectionalPosition(settings, shapeIndex, artboardWidth, artboardHeight, batchSize).y;

    case 'incremental':
      const effectiveIndex = settings.incrementalResetPerBatch ? shapeIndex : (shapeIndex + lastIncrementalIndex);
      let value = settings.yPositionStartValue + (effectiveIndex * settings.yPositionIncrement);
      
      // Apply modulation based on mode
      if (settings.yPositionModulationMode === 'pixel-value' && settings.yPositionModulationValue > 0) {
        value = value % settings.yPositionModulationValue;
      } else if (settings.yPositionModulationMode === 'shape-count' && settings.yPositionModulationValue > 0) {
        // Modulate by shape count (e.g., every 3 shapes resets)
        const moduloIndex = effectiveIndex % settings.yPositionModulationValue;
        value = settings.yPositionStartValue + (moduloIndex * settings.yPositionIncrement);
      }
      // Note: grid-row mode will be implemented when refactoring to use grid cell index
      
      return value;

    default:
      return 0;
  }
}

/**
 * Helper function to calculate directional position
 */
function calculateDirectionalPosition(
  settings: BatchConfigSettings,
  shapeIndex: number,
  artboardWidth: number,
  artboardHeight: number,
  batchSize: number
): { x: number; y: number } {
  let angle = 0;
  let distance = settings.positionDirectionalDistance;

  switch (settings.positionDirectionalMode) {
    case 'outward-center':
      if (settings.directionalEvenDistribution) {
        angle = (shapeIndex * 360 / Math.max(1, batchSize)) * (Math.PI / 180);
      } else {
        const clusterRange = settings.directionalClusterAngle * (Math.PI / 180);
        angle = (shapeIndex * clusterRange / Math.max(1, batchSize - 1)) - (clusterRange / 2);
      }
      break;

    case 'outward-edge':
      const edgeAngle = Math.atan2(artboardHeight, artboardWidth);
      if (settings.directionalEvenDistribution) {
        angle = (shapeIndex * 2 * Math.PI / Math.max(1, batchSize)) + edgeAngle;
      } else {
        const clusterRange = settings.directionalClusterAngle * (Math.PI / 180);
        angle = (shapeIndex * clusterRange / Math.max(1, batchSize - 1)) - (clusterRange / 2) + edgeAngle;
      }
      break;

    case 'angle-based':
      const baseAngle = settings.positionDirectionalAngle * (Math.PI / 180);
      if (settings.directionalEvenDistribution) {
        angle = baseAngle;
      } else {
        const clusterRange = settings.directionalClusterAngle * (Math.PI / 180);
        angle = baseAngle + (shapeIndex * clusterRange / Math.max(1, batchSize - 1)) - (clusterRange / 2);
      }
      break;
  }

  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance
  };
}

/**
 * Helper function to calculate width based on batch config settings
 */
function calculateWidth(
  settings: BatchConfigSettings,
  shapeIndex: number,
  artboardWidth: number,
  artboardHeight: number,
  batchSize: number,
  lastIncrementalIndex: number = 0
): number {
  if (!settings.propertiesEnabled || !settings.shapePropertiesEnabled) {
    return 100;
  }

  let baseWidth = 0;

  switch (settings.widthMode) {
    case 'range':
      const [minW, maxW] = settings.widthRange;
      const centerW = minW + (maxW - minW) / 2;
      const rangeW = (maxW - minW) / 2;
      const randomFactorW = (Math.random() - 0.5) * 2;
      const scaledRandomW = randomFactorW * (settings.widthRandomizationScale / 100);
      baseWidth = centerW + (scaledRandomW * rangeW);
      break;

    case 'value':
      baseWidth = settings.widthValue;
      break;

    case 'incremental':
      const effectiveIndex = settings.sizeIncrementalResetPerBatch ? shapeIndex : (shapeIndex + lastIncrementalIndex);
      baseWidth = settings.widthStartValue + (effectiveIndex * settings.widthIncrement);
      
      if (settings.widthModulationEnabled && settings.widthModulationValue > 0) {
        baseWidth = baseWidth % settings.widthModulationValue;
      }
      break;

    default:
      baseWidth = 100;
  }

  return Math.max(10, Math.min(1000, baseWidth));
}

/**
 * Helper function to calculate height based on batch config settings
 */
function calculateHeight(
  settings: BatchConfigSettings,
  shapeIndex: number,
  artboardWidth: number,
  artboardHeight: number,
  batchSize: number,
  lastIncrementalIndex: number = 0
): number {
  if (!settings.propertiesEnabled || !settings.shapePropertiesEnabled) {
    return 100;
  }

  let baseHeight = 0;

  switch (settings.heightMode) {
    case 'range':
      const [minH, maxH] = settings.heightRange;
      const centerH = minH + (maxH - minH) / 2;
      const rangeH = (maxH - minH) / 2;
      const randomFactorH = (Math.random() - 0.5) * 2;
      const scaledRandomH = randomFactorH * (settings.heightRandomizationScale / 100);
      baseHeight = centerH + (scaledRandomH * rangeH);
      break;

    case 'value':
      baseHeight = settings.heightValue;
      break;

    case 'incremental':
      const effectiveIndex = settings.sizeIncrementalResetPerBatch ? shapeIndex : (shapeIndex + lastIncrementalIndex);
      baseHeight = settings.heightStartValue + (effectiveIndex * settings.heightIncrement);
      
      if (settings.heightModulationEnabled && settings.heightModulationValue > 0) {
        baseHeight = baseHeight % settings.heightModulationValue;
      }
      break;

    default:
      baseHeight = 100;
  }

  return Math.max(10, Math.min(1000, baseHeight));
}

/**
 * Helper function to calculate constrained size based on sizeConstraintMode
 * Returns the constrained size based on mode, or width if mode is 'none'
 */
function calculateConstrainedSize(
  settings: BatchConfigSettings,
  width: number,
  height: number
): number {
  switch (settings.sizeConstraintMode) {
    case 'min':
      return Math.min(width, height);
    case 'max':
      return Math.max(width, height);
    case 'avg':
      return (width + height) / 2;
    case 'none':
    default:
      // Return width as-is, shapes will use independent dimensions
      return width;
  }
}

/**
 * Helper function to calculate blur radius based on mode
 */
function calculateBlur(settings: BatchConfigSettings, shapeIndex: number): number {
  switch (settings.blurMode) {
    case 'range':
      const [minBlur, maxBlur] = settings.blurRange;
      return minBlur + Math.random() * (maxBlur - minBlur);
    
    case 'define':
      return settings.blurDefine;
    
    case 'incremental':
      let incrementAmount = (settings.blurIncrement || 0) * shapeIndex;
      if (settings.blurModulationEnabled && settings.blurModulationValue > 0) {
        incrementAmount = incrementAmount % settings.blurModulationValue;
      }
      return settings.blurStartValue + incrementAmount;
    
    default:
      return 0;
  }
}

/**
 * Helper function to calculate stroke width based on mode
 */
function calculateStrokeWidth(settings: BatchConfigSettings, shapeIndex: number): number {
  switch (settings.strokeWidthMode) {
    case 'range':
      const [minWidth, maxWidth] = settings.strokeWidthRange;
      return minWidth + Math.random() * (maxWidth - minWidth);
    
    case 'define':
      return settings.strokeWidthDefine;
    
    case 'incremental':
      let incrementAmount = (settings.strokeWidthIncrement || 0) * shapeIndex;
      if (settings.strokeWidthModulationEnabled && settings.strokeWidthModulationValue > 0) {
        incrementAmount = incrementAmount % settings.strokeWidthModulationValue;
      }
      return settings.strokeWidthStartValue + incrementAmount;
    
    default:
      return 1; // Default stroke width
  }
}

/**
 * Helper function to calculate conic gradient start angle (returns radians)
 */
function calculateConicAngle(settings: BatchConfigSettings, shapeIndex: number): number {
  let angleDegrees: number;
  
  switch (settings.fillGradientConicAngleMode) {
    case 'range':
      const [minAngle, maxAngle] = settings.fillGradientConicAngleRange || [0, 360];
      angleDegrees = minAngle + Math.random() * (maxAngle - minAngle);
      break;
    
    case 'incremental':
      let incrementAmount = (settings.fillGradientConicAngleIncrement || 0) * shapeIndex;
      if (settings.fillGradientConicAngleModulationEnabled && settings.fillGradientConicAngleModulationValue > 0) {
        // Non-negative modulo to handle negative increments
        const m = settings.fillGradientConicAngleModulationValue;
        incrementAmount = ((incrementAmount % m) + m) % m;
      }
      angleDegrees = (settings.fillGradientConicAngleStartValue || 0) + incrementAmount;
      break;
    
    case 'fixed':
    default:
      angleDegrees = settings.fillGradientConicAngle || 0;
      break;
  }
  
  // Wrap angle to 0-360 range before converting to radians
  angleDegrees = ((angleDegrees % 360) + 360) % 360;
  
  // Convert degrees to radians
  return (angleDegrees * Math.PI) / 180;
}

/**
 * Helper function to calculate conic gradient center X (returns 0-100 percentage, clamped)
 */
function calculateConicCenterX(settings: BatchConfigSettings, shapeIndex: number): number {
  let result: number;
  
  switch (settings.fillGradientConicCenterXMode) {
    case 'range':
      const [minX, maxX] = settings.fillGradientConicCenterXRange || [25, 75];
      result = minX + Math.random() * (maxX - minX);
      break;
    
    case 'incremental':
      const startX = settings.fillGradientConicCenterXStartValue ?? 50;
      const incrementX = (settings.fillGradientConicCenterXIncrement || 0) * shapeIndex;
      result = startX + incrementX;
      
      // Apply modulation to the final result, not just the increment
      if (settings.fillGradientConicCenterXModulationEnabled && settings.fillGradientConicCenterXModulationValue > 0) {
        const m = settings.fillGradientConicCenterXModulationValue;
        result = ((result % m) + m) % m;
      }
      break;
    
    case 'fixed':
    default:
      result = settings.fillGradientConicCenterX ?? 50;
      break;
  }
  
  // Clamp to valid 0-100 percentage range
  return Math.max(0, Math.min(100, result));
}

/**
 * Helper function to calculate conic gradient center Y (returns 0-100 percentage, clamped)
 */
function calculateConicCenterY(settings: BatchConfigSettings, shapeIndex: number): number {
  let result: number;
  
  switch (settings.fillGradientConicCenterYMode) {
    case 'range':
      const [minY, maxY] = settings.fillGradientConicCenterYRange || [25, 75];
      result = minY + Math.random() * (maxY - minY);
      break;
    
    case 'incremental':
      const startY = settings.fillGradientConicCenterYStartValue ?? 50;
      const incrementY = (settings.fillGradientConicCenterYIncrement || 0) * shapeIndex;
      result = startY + incrementY;
      
      // Apply modulation to the final result, not just the increment
      if (settings.fillGradientConicCenterYModulationEnabled && settings.fillGradientConicCenterYModulationValue > 0) {
        const m = settings.fillGradientConicCenterYModulationValue;
        result = ((result % m) + m) % m;
      }
      break;
    
    case 'fixed':
    default:
      result = settings.fillGradientConicCenterY ?? 50;
      break;
  }
  
  // Clamp to valid 0-100 percentage range
  return Math.max(0, Math.min(100, result));
}

/**
 * Helper function to calculate radial gradient center X (returns 0-100 percentage, clamped)
 */
function calculateRadialCenterX(settings: BatchConfigSettings, shapeIndex: number): number {
  let result: number;
  
  switch (settings.fillGradientRadialCenterXMode) {
    case 'range':
      const [minX, maxX] = settings.fillGradientRadialCenterXRange || [25, 75];
      result = minX + Math.random() * (maxX - minX);
      break;
    
    case 'incremental':
      const startX = settings.fillGradientRadialCenterXStartValue ?? 50;
      const incrementX = (settings.fillGradientRadialCenterXIncrement || 0) * shapeIndex;
      result = startX + incrementX;
      
      // Apply modulation to the final result, not just the increment
      if (settings.fillGradientRadialCenterXModulationEnabled && settings.fillGradientRadialCenterXModulationValue > 0) {
        const m = settings.fillGradientRadialCenterXModulationValue;
        result = ((result % m) + m) % m;
      }
      break;
    
    case 'fixed':
    default:
      result = settings.fillGradientRadialCenterX ?? 50;
      break;
  }
  
  // Clamp to valid 0-100 percentage range
  return Math.max(0, Math.min(100, result));
}

/**
 * Helper function to calculate radial gradient center Y (returns 0-100 percentage, clamped)
 */
function calculateRadialCenterY(settings: BatchConfigSettings, shapeIndex: number): number {
  let result: number;
  
  switch (settings.fillGradientRadialCenterYMode) {
    case 'range':
      const [minY, maxY] = settings.fillGradientRadialCenterYRange || [25, 75];
      result = minY + Math.random() * (maxY - minY);
      break;
    
    case 'incremental':
      const startY = settings.fillGradientRadialCenterYStartValue ?? 50;
      const incrementY = (settings.fillGradientRadialCenterYIncrement || 0) * shapeIndex;
      result = startY + incrementY;
      
      // Apply modulation to the final result, not just the increment
      if (settings.fillGradientRadialCenterYModulationEnabled && settings.fillGradientRadialCenterYModulationValue > 0) {
        const m = settings.fillGradientRadialCenterYModulationValue;
        result = ((result % m) + m) % m;
      }
      break;
    
    case 'fixed':
    default:
      result = settings.fillGradientRadialCenterY ?? 50;
      break;
  }
  
  // Clamp to valid 0-100 percentage range
  return Math.max(0, Math.min(100, result));
}

/**
 * Helper function to calculate linear gradient angle (returns degrees)
 */
function calculateLinearAngle(settings: BatchConfigSettings, shapeIndex: number): number {
  let angleDegrees: number;
  
  // Check if type & direction controls are enabled
  if (!settings.fillGradientTypeDirectionEnabled) {
    // Use default angle when controls are disabled
    return 45; // Default diagonal
  }
  
  switch (settings.fillGradientLinearDirection) {
    case 'fixed':
      angleDegrees = settings.fillGradientLinearAngle ?? 45;
      break;
    
    case 'predefined':
      // Map predefined direction to angle
      switch (settings.fillGradientLinearPredefined) {
        case 'horizontal':
          angleDegrees = 90; // Left to right
          break;
        case 'vertical':
          angleDegrees = 180; // Top to bottom
          break;
        case 'diagonal-down':
          angleDegrees = 135; // Top-left to bottom-right
          break;
        case 'diagonal-up':
          angleDegrees = 45; // Bottom-left to top-right
          break;
        default:
          angleDegrees = 90;
      }
      break;
    
    case 'range':
    default:
      const [minAngle, maxAngle] = settings.fillGradientLinearAngleRange || [0, 360];
      angleDegrees = minAngle + Math.random() * (maxAngle - minAngle);
      break;
  }
  
  // Wrap angle to 0-360 range
  angleDegrees = ((angleDegrees % 360) + 360) % 360;
  
  return angleDegrees;
}

/**
 * Main function to generate shapes with batch configuration
 * Returns both the generated shapes and metadata for tracking generation boundaries
 */
export function generateShapesWithBatchConfig(
  count: number,
  canvasBounds: CanvasBounds,
  options: GenerationOptions,
  generationContext?: {
    generationIndex: number;  // Which generation this is (0, 1, 2... for repetitions)
    startIndex: number;       // Cumulative index where this generation starts
  }
): { shapes: Shape[]; metadata: GenerationMetadata } {
  const enabledTypes = options.enabledShapeTypes || ['rectangle', 'circle', 'triangle'];
  const batchConfig = options.batchConfig;
  const scatterSettings = options.scatterSettings || { 
    distribution: { 
      pattern: 'random', 
      spacing: 50, 
      randomness: 0.3,
      rotation: 0,
      scale: 1,
      density: 0.5,
      avoidOverlap: false,
      respectBounds: true
    }
  };
  
  // For initial scatter, use SmartDistributionAlgorithm with settings from generation sets
  // The advanced distribution layouts will be applied afterward
  const useSmartDistribution = options.distributionEnabled !== false;

  if (enabledTypes.length === 0) {
    return {
      shapes: [],
      metadata: {
        generationId: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        generationIndex: generationContext?.generationIndex ?? 0,
        shapeCount: 0,
        startIndex: generationContext?.startIndex ?? 0
      }
    };
  }

  // Check if any positioning system is active
  const hasDistributionLayout = batchConfig.distributionLayoutEnabled;
  const hasShapeProperties = batchConfig.propertiesEnabled && batchConfig.shapePropertiesEnabled;
  const hasTransforms = batchConfig.transformsEnabled;
  const anyPositioningSystemActive = hasDistributionLayout || hasShapeProperties || hasTransforms;

  // Phase 1: Generate initial positions using scatter settings from generation sets (matching client)
  // Only use random scatter if NO positioning systems are active (fallback behavior)
  // Otherwise start with deterministic (0, 0) so positioning systems aren't polluted
  console.log(`🎲 [SERVER] Phase 1: Generating initial positions for ${count} shapes (positioning systems active: ${anyPositioningSystemActive})`);
  const positions = anyPositioningSystemActive
    ? Array.from({ length: count }, () => ({ x: 0, y: 0 }))
    : (useSmartDistribution 
        ? SmartDistributionAlgorithm.generatePositions(count, canvasBounds, scatterSettings.distribution)
        : Array.from({ length: count }, () => ({
            x: canvasBounds.x + (Math.random() - 0.5) * (canvasBounds.width * 0.8),
            y: canvasBounds.y + (Math.random() - 0.5) * (canvasBounds.height * 0.8)
          })));
  
  console.log(`✅ [SERVER] Phase 1: Generated ${positions.length} ${anyPositioningSystemActive ? 'deterministic (0,0)' : 'random scatter'} positions`);

  // Create shapes with initial positions
  const newShapes = positions.map((position, index) => {
    const randomType = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];

    let shapeX = position.x;
    let shapeY = position.y;

    // Apply batch config position offsets if properties are enabled (additive to distribution position)
    // SKIP incremental positions if grid distribution is enabled - they'll be applied post-distribution
    const isGridDistribution = batchConfig.distributionLayoutEnabled && batchConfig.distributionPattern === 'grid';
    const skipIncrementalForGrid = isGridDistribution && 
                                   (batchConfig.xPositionMode === 'incremental' || 
                                    batchConfig.yPositionMode === 'incremental');
    
    if (batchConfig.propertiesEnabled && batchConfig.shapePropertiesEnabled && !skipIncrementalForGrid) {
      // Add position offsets from shape properties (additive, not replacement)
      shapeX += calculatePositionX(batchConfig, index, canvasBounds.width, canvasBounds.height, positions.length);
      shapeY += calculatePositionY(batchConfig, index, canvasBounds.width, canvasBounds.height, positions.length);
    } else if (batchConfig.propertiesEnabled && batchConfig.shapePropertiesEnabled && skipIncrementalForGrid) {
      // For grid distribution with incremental mode, apply non-incremental position modes only
      const xPosNoIncremental = batchConfig.xPositionMode === 'incremental' ? 0 : 
        calculatePositionX(batchConfig, index, canvasBounds.width, canvasBounds.height, positions.length);
      const yPosNoIncremental = batchConfig.yPositionMode === 'incremental' ? 0 :
        calculatePositionY(batchConfig, index, canvasBounds.width, canvasBounds.height, positions.length);
      shapeX += xPosNoIncremental;
      shapeY += yPosNoIncremental;
    }

    let calculatedWidth = calculateWidth(batchConfig, index, canvasBounds.width, canvasBounds.height, positions.length);
    let calculatedHeight = calculateHeight(batchConfig, index, canvasBounds.width, canvasBounds.height, positions.length);

    // Calculate constrained size based on mode
    const constrainedSize = calculateConstrainedSize(batchConfig, calculatedWidth, calculatedHeight);
    
    // If constraint mode is active (min/max/avg), use constrained size for BOTH dimensions
    const useConstrainedDimensions = batchConfig.sizeConstraintMode !== 'none';
    
    if (useConstrainedDimensions) {
      calculatedWidth = constrainedSize;
      calculatedHeight = constrainedSize;
    }
    
    // Create combined config matching client: batchConfig + scatterSettings
    const combinedConfig = {
      ...batchConfig,
      scatterSettings: scatterSettings
    };
    
    // Pass combinedConfig to Shape constructor like client does
    const shape = new Shape(randomType, shapeX, shapeY, combinedConfig);
    
    // Apply size based on shape type (matching client logic)
    switch (randomType) {
      case 'rectangle':
      case 'rounded-rectangle':
        shape.width = calculatedWidth;
        shape.height = calculatedHeight;
        break;
      case 'square':
      case 'rounded-square':
        // Square always uses constrained size (even in 'none' mode, use calculated size)
        shape.width = constrainedSize;
        shape.height = constrainedSize;
        break;
      case 'circle':
      case 'spline-circle':
      case 'polygon':
      case 'star':
      case 'ring':
      case 'spline-ring':
        // Radius-based shapes always use constrained size
        shape.radius = constrainedSize / 2;
        break;
      case 'ellipse':
      case 'spline-ellipse':
        shape.width = calculatedWidth;
        shape.height = calculatedHeight;
        break;
      // Lines and splines would go here if supported on server
      default:
        shape.width = calculatedWidth;
        shape.height = calculatedHeight;
    }

    if (batchConfig.propertiesEnabled) {
      if (batchConfig.fillEnabled) {
        const shouldHaveFill = true; // Always fill when enabled
        
        if (!shouldHaveFill) {
          shape.properties.fillColor = 'transparent';
          shape.properties.fillOpacity = 0;
          shape.properties.gradient = undefined;
        } else {
          // Determine whether to use gradient based on fillStyleProbability
          const useGradient = batchConfig.fillGradientEnabled && 
                             Math.random() * 100 < (100 - batchConfig.fillStyleProbability);
          
          if (useGradient) {
            // Determine stop count based on mode
            let stopCount: number;
            if (batchConfig.fillGradientStopsMode === 'fixed') {
              stopCount = batchConfig.fillGradientStopsCount ?? 3;
            } else {
              const [minStops, maxStops] = batchConfig.fillGradientStopsRange || [2, 5];
              stopCount = Math.floor(minStops + Math.random() * (maxStops - minStops + 1));
            }
            
            let gradientColors = generateGradientColors(
              batchConfig.fillGradientColorMode,
              stopCount,
              batchConfig.fillGradientColorRange,
              batchConfig.fillGradientColorPalette,
              batchConfig.fillGradientColorDefine,
              index,
              batchConfig.fillGradientColorRangeFlip
            );

            // Apply reverse if enabled
            if (batchConfig.fillGradientStopsReverse) {
              gradientColors = gradientColors.reverse();
            }

            // Calculate stop positions based on distribution mode
            let stops = gradientColors.map((color, i) => {
              let offset: number;
              if (batchConfig.fillGradientStopDistribution === 'random' && stopCount > 2) {
                // Random distribution (keep first and last at 0 and 1)
                if (i === 0) {
                  offset = 0;
                } else if (i === stopCount - 1) {
                  offset = 1;
                } else {
                  offset = Math.random();
                }
              } else {
                // Even distribution (default)
                offset = stopCount === 1 ? 0 : i / (stopCount - 1);
              }
              return { offset, color };
            });

            // Sort by offset for random distribution to maintain proper order
            if (batchConfig.fillGradientStopDistribution === 'random') {
              stops = stops.sort((a, b) => a.offset - b.offset);
            }

            // Determine gradient type based on settings
            let gradientType: 'linear' | 'radial' | 'conic' = 'linear';
            
            // Check if shape-matching mode is enabled
            const useShapeMatching = batchConfig.fillGradientTypeDirectionEnabled && 
                                    batchConfig.fillGradientMatchShape;
            
            if (useShapeMatching) {
              // Match gradient type to shape type - deterministic override of probabilities
              const roundShapes = ['circle', 'ellipse', 'star', 'blob', 'ring', 'spline-circle', 'spline-ring', 'spline-star', 'spline-blob'];
              const isRoundShape = roundShapes.includes(randomType);
              
              if (isRoundShape) {
                // For round shapes: ONLY use radial or conic, never linear
                // Use relative probabilities to determine which one, but exclude linear entirely
                const radialProb = batchConfig.fillGradientRadialProbability;
                const conicProb = batchConfig.fillGradientConicProbability;
                const totalRoundProb = radialProb + conicProb;
                
                if (totalRoundProb > 0) {
                  const random = Math.random() * totalRoundProb;
                  gradientType = random < radialProb ? 'radial' : 'conic';
                } else {
                  // If both radial and conic are 0, default to radial (never linear)
                  gradientType = 'radial';
                }
              } else {
                // For geometric shapes: ONLY use linear, never radial or conic
                gradientType = 'linear';
              }
            } else {
              // Use probability-based selection (original behavior)
              const totalProb = batchConfig.fillGradientLinearProbability + 
                              batchConfig.fillGradientRadialProbability + 
                              batchConfig.fillGradientConicProbability;
              const rand = Math.random() * totalProb;
              
              if (rand < batchConfig.fillGradientLinearProbability) {
                gradientType = 'linear';
              } else if (rand < batchConfig.fillGradientLinearProbability + batchConfig.fillGradientRadialProbability) {
                gradientType = 'radial';
              } else {
                gradientType = 'conic';
              }
            }

            // Build gradient object with type-specific parameters
            const gradientObj: {
              type: 'linear' | 'radial' | 'conic';
              stops: { offset: number; color: string }[];
              angle?: number;
              radialCenterX?: number;
              radialCenterY?: number;
              conicAngle?: number;
              conicCenterX?: number;
              conicCenterY?: number;
            } = {
              type: gradientType,
              stops: stops
            };
            
            // Add linear-specific parameters when gradient type is linear
            if (gradientType === 'linear') {
              gradientObj.angle = calculateLinearAngle(batchConfig, index);
            }
            
            // Add radial-specific parameters when gradient type is radial
            if (gradientType === 'radial') {
              gradientObj.radialCenterX = calculateRadialCenterX(batchConfig, index);
              gradientObj.radialCenterY = calculateRadialCenterY(batchConfig, index);
            }
            
            // Add conic-specific parameters when gradient type is conic
            if (gradientType === 'conic') {
              gradientObj.conicAngle = calculateConicAngle(batchConfig, index);
              gradientObj.conicCenterX = calculateConicCenterX(batchConfig, index);
              gradientObj.conicCenterY = calculateConicCenterY(batchConfig, index);
            }
            
            shape.properties.gradient = gradientObj;

            shape.properties.fillColor = gradientColors[0];
            shape.properties.fillOpacity = batchConfig.fillOpacityMode === 'range'
              ? (batchConfig.fillOpacityRange[0] + Math.random() * (batchConfig.fillOpacityRange[1] - batchConfig.fillOpacityRange[0])) / 100
              : batchConfig.fillOpacityDefine / 100;
          } else {
            const fillColor = batchConfig.colorHarmonyEnabled
              ? ColorUtils.generateHarmonyColor({
                  enabled: batchConfig.colorHarmonyEnabled,
                  harmonyType: batchConfig.harmonyType,
                  baseColor: batchConfig.baseColor,
                  hueVariance: batchConfig.hueVariance,
                  saturationRange: batchConfig.saturationRange,
                  lightnessRange: batchConfig.lightnessRange,
                  monochromaticSettings: batchConfig.monochromaticSettings,
                  analogousSettings: batchConfig.analogousSettings,
                  complementarySettings: batchConfig.complementarySettings,
                  triadicSettings: batchConfig.triadicSettings,
                  splitComplementarySettings: batchConfig.splitComplementarySettings,
                  tetradicSettings: batchConfig.tetradicSettings
                })
              : generateColor(
                  batchConfig.fillColorMode,
                  batchConfig.fillColorRange,
                  batchConfig.fillColorPalette,
                  batchConfig.fillColorDefine,
                  index,
                  batchConfig.fillColorMode === 'range' ? {
                    saturationRange: batchConfig.fillColorSaturationRange,
                    lightnessRange: batchConfig.fillColorLightnessRange,
                    flip: batchConfig.fillColorRangeFlip
                  } : undefined
                );

            shape.properties.gradient = undefined;
            shape.properties.fillColor = fillColor;
            shape.properties.fillOpacity = batchConfig.fillOpacityMode === 'range'
              ? (batchConfig.fillOpacityRange[0] + Math.random() * (batchConfig.fillOpacityRange[1] - batchConfig.fillOpacityRange[0])) / 100
              : batchConfig.fillOpacityDefine / 100;
          }
        }
      } else {
        shape.properties.fillColor = 'transparent';
        shape.properties.fillOpacity = 0;
        shape.properties.gradient = undefined;
      }

      if (batchConfig.strokeEnabled) {
        const shouldHaveStroke = Math.random() * 100 < batchConfig.strokeProbability;
        if (!shouldHaveStroke) {
          shape.properties.strokeColor = 'transparent';
          shape.properties.strokeOpacity = 0;
          shape.properties.strokeWidth = 0;
        } else {
          // Apply stroke width using helper function that supports all modes (range/define/incremental)
          shape.properties.strokeWidth = calculateStrokeWidth(batchConfig, index);

          if (batchConfig.strokeOpacityMode === 'range') {
            const [minOpacity, maxOpacity] = batchConfig.strokeOpacityRange;
            shape.properties.strokeOpacity = (minOpacity + Math.random() * (maxOpacity - minOpacity)) / 100;
          } else if (batchConfig.strokeOpacityMode === 'define') {
            shape.properties.strokeOpacity = batchConfig.strokeOpacityDefine / 100;
          }

          const strokeColor = generateColor(
            batchConfig.strokeColorMode,
            batchConfig.strokeColorRange,
            batchConfig.strokeColorPalette,
            batchConfig.strokeColorDefine,
            index,
            batchConfig.strokeColorMode === 'range' ? {
              saturationRange: batchConfig.strokeColorSaturationRange,
              lightnessRange: batchConfig.strokeColorLightnessRange,
              flip: batchConfig.strokeColorRangeFlip
            } : undefined
          );
          shape.properties.strokeColor = strokeColor;
        }
      } else {
        shape.properties.strokeColor = 'transparent';
        shape.properties.strokeOpacity = 0;
        shape.properties.strokeWidth = 0;
      }

      // Handle blur properties - check parent Shape Effects first
      if (batchConfig.shapeEffectsEnabled && batchConfig.blurEnabled) {
        const shouldHaveBlur = Math.random() * 100 < batchConfig.blurProbability;
        if (shouldHaveBlur) {
          // Apply blur using helper function that supports all modes (range/define/incremental)
          shape.properties.blurRadius = calculateBlur(batchConfig, index);
        } else {
          shape.properties.blurRadius = 0;
        }
      } else {
        // Shape Effects or Blur section disabled - ensure no blur
        shape.properties.blurRadius = 0;
      }

      if (batchConfig.transformsEnabled) {
        let originX = 0;
        let originY = 0;
        
        if (batchConfig.transformOriginMode === 'define') {
          // Define mode with sub-modes (fixed, range, incremental)
          const defineMode = batchConfig.transformOriginDefineMode || 'fixed';
          
          if (defineMode === 'fixed') {
            // Fixed mode: use custom coordinates
            originX = batchConfig.transformOriginX || 0;
            originY = batchConfig.transformOriginY || 0;
          } else if (defineMode === 'range') {
            // Range mode: random X/Y from ranges
            const xMin = batchConfig.transformOriginXMin ?? -100;
            const xMax = batchConfig.transformOriginXMax ?? 100;
            const yMin = batchConfig.transformOriginYMin ?? -100;
            const yMax = batchConfig.transformOriginYMax ?? 100;
            originX = xMin + Math.random() * (xMax - xMin);
            originY = yMin + Math.random() * (yMax - yMin);
          } else if (defineMode === 'incremental') {
            // Incremental mode: start + increment * index + modulation
            const xStart = batchConfig.transformOriginXStartValue ?? 0;
            const xIncrement = batchConfig.transformOriginXIncrement ?? 10;
            const yStart = batchConfig.transformOriginYStartValue ?? 0;
            const yIncrement = batchConfig.transformOriginYIncrement ?? 10;
            
            let xIncrementAmount = xIncrement * index;
            let yIncrementAmount = yIncrement * index;
            
            // Apply modulation if enabled
            if (batchConfig.transformOriginXModulationEnabled && batchConfig.transformOriginXModulationValue > 0) {
              const m = batchConfig.transformOriginXModulationValue;
              xIncrementAmount = ((xIncrementAmount % m) + m) % m;
            }
            if (batchConfig.transformOriginYModulationEnabled && batchConfig.transformOriginYModulationValue > 0) {
              const m = batchConfig.transformOriginYModulationValue;
              yIncrementAmount = ((yIncrementAmount % m) + m) % m;
            }
            
            originX = xStart + xIncrementAmount;
            originY = yStart + yIncrementAmount;
          }
        } else if (batchConfig.transformOriginMode === 'predefined-artboard') {
          // Use predefined artboard alignment points
          const artboardX = canvasBounds.x;
          const artboardY = canvasBounds.y;
          
          switch (batchConfig.transformOriginPredefined) {
            case 'center':
              originX = artboardX + canvasBounds.width / 2;
              originY = artboardY + canvasBounds.height / 2;
              break;
            case 'top-left':
              originX = artboardX;
              originY = artboardY;
              break;
            case 'top-center':
              originX = artboardX + canvasBounds.width / 2;
              originY = artboardY;
              break;
            case 'top-right':
              originX = artboardX + canvasBounds.width;
              originY = artboardY;
              break;
            case 'center-left':
              originX = artboardX;
              originY = artboardY + canvasBounds.height / 2;
              break;
            case 'center-right':
              originX = artboardX + canvasBounds.width;
              originY = artboardY + canvasBounds.height / 2;
              break;
            case 'bottom-left':
              originX = artboardX;
              originY = artboardY + canvasBounds.height;
              break;
            case 'bottom-center':
              originX = artboardX + canvasBounds.width / 2;
              originY = artboardY + canvasBounds.height;
              break;
            case 'bottom-right':
              originX = artboardX + canvasBounds.width;
              originY = artboardY + canvasBounds.height;
              break;
          }
        } else if (batchConfig.transformOriginMode === 'current-shape') {
          // Current shape mode: use predefined shape alignment points based on shape's own bounds
          const shapeBounds = shape.getBounds();
          const shapeX = shapeBounds.x;
          const shapeY = shapeBounds.y;
          
          switch (batchConfig.transformOriginPredefined) {
            case 'center':
              originX = shapeX + shapeBounds.width / 2;
              originY = shapeY + shapeBounds.height / 2;
              break;
            case 'top-left':
              originX = shapeX;
              originY = shapeY;
              break;
            case 'top-center':
              originX = shapeX + shapeBounds.width / 2;
              originY = shapeY;
              break;
            case 'top-right':
              originX = shapeX + shapeBounds.width;
              originY = shapeY;
              break;
            case 'center-left':
              originX = shapeX;
              originY = shapeY + shapeBounds.height / 2;
              break;
            case 'center-right':
              originX = shapeX + shapeBounds.width;
              originY = shapeY + shapeBounds.height / 2;
              break;
            case 'bottom-left':
              originX = shapeX;
              originY = shapeY + shapeBounds.height;
              break;
            case 'bottom-center':
              originX = shapeX + shapeBounds.width / 2;
              originY = shapeY + shapeBounds.height;
              break;
            case 'bottom-right':
              originX = shapeX + shapeBounds.width;
              originY = shapeY + shapeBounds.height;
              break;
          }
        } else if (batchConfig.transformOriginMode === 'shape-reference') {
          // Shape reference mode: reference another shape's position and use its anchor point
          const referenceType = batchConfig.transformOriginShapeReference || 'current';
          let referencedShape: Shape | undefined;
          
          if (referenceType === 'current') {
            referencedShape = shape;
          } else if (referenceType === 'previous') {
            referencedShape = index > 0 ? finalShapes[index - 1] : undefined;
          } else if (referenceType === 'next') {
            referencedShape = index < finalShapes.length - 1 ? finalShapes[index + 1] : undefined;
          } else if (referenceType === 'specific') {
            const specificIndex = batchConfig.transformOriginShapeIndex ?? 0;
            referencedShape = finalShapes[specificIndex];
          }
          
          // If referenced shape exists, calculate origin based on its bounds and anchor point
          if (referencedShape) {
            const refBounds = referencedShape.getBounds();
            const refWidth = refBounds.width;
            const refHeight = refBounds.height;
            const refX = refBounds.x;
            const refY = refBounds.y;
            
            switch (batchConfig.transformOriginShapeAnchor) {
              case 'center':
                originX = refX + refWidth / 2;
                originY = refY + refHeight / 2;
                break;
              case 'top-left':
                originX = refX;
                originY = refY;
                break;
              case 'top-center':
                originX = refX + refWidth / 2;
                originY = refY;
                break;
              case 'top-right':
                originX = refX + refWidth;
                originY = refY;
                break;
              case 'center-left':
                originX = refX;
                originY = refY + refHeight / 2;
                break;
              case 'center-right':
                originX = refX + refWidth;
                originY = refY + refHeight / 2;
                break;
              case 'bottom-left':
                originX = refX;
                originY = refY + refHeight;
                break;
              case 'bottom-center':
                originX = refX + refWidth / 2;
                originY = refY + refHeight;
                break;
              case 'bottom-right':
                originX = refX + refWidth;
                originY = refY + refHeight;
                break;
            }
          } else {
            // Fallback if referenced shape doesn't exist - use current shape's center
            const shapeBounds = shape.getBounds();
            originX = shapeBounds.x + shapeBounds.width / 2;
            originY = shapeBounds.y + shapeBounds.height / 2;
            console.warn(`⚠️ [TRANSFORM ORIGIN] Shape ${index}: Referenced shape not found (type=${referenceType}), falling back to current shape center`);
          }
        }
        
        const shapeRelativeX = shape.transform.x - originX;
        const shapeRelativeY = shape.transform.y - originY;

        let positionDeltaX = 0;
        if (batchConfig.xTransformMode === 'range') {
          const [minTransX, maxTransX] = getEffectiveTranslateRange('x', batchConfig, canvasBounds);
          positionDeltaX = minTransX + Math.random() * (maxTransX - minTransX);
        } else if (batchConfig.xTransformMode === 'value') {
          positionDeltaX = batchConfig.xTransformValue || 0;
        } else if (batchConfig.xTransformMode === 'incremental') {
          let incrementAmount = (batchConfig.xTransformIncrement || 0) * index;
          const startValue = batchConfig.xTransformStartValue ?? 0;
          if (batchConfig.xTransformModulationEnabled && batchConfig.xTransformModulationValue > 0) {
            const m = batchConfig.xTransformModulationValue;
            incrementAmount = ((incrementAmount % m) + m) % m;
          }
          positionDeltaX = startValue + incrementAmount;
        }

        let positionDeltaY = 0;
        if (batchConfig.yTransformMode === 'range') {
          const [minTransY, maxTransY] = getEffectiveTranslateRange('y', batchConfig, canvasBounds);
          positionDeltaY = minTransY + Math.random() * (maxTransY - minTransY);
        } else if (batchConfig.yTransformMode === 'value') {
          positionDeltaY = batchConfig.yTransformValue || 0;
        } else if (batchConfig.yTransformMode === 'incremental') {
          let incrementAmount = (batchConfig.yTransformIncrement || 0) * index;
          const startValue = batchConfig.yTransformStartValue ?? 0;
          if (batchConfig.yTransformModulationEnabled && batchConfig.yTransformModulationValue > 0) {
            const m = batchConfig.yTransformModulationValue;
            incrementAmount = ((incrementAmount % m) + m) % m;
          }
          positionDeltaY = startValue + incrementAmount;
        }

        let scaleX = shape.transform.scaleX;
        let scaleY = shape.transform.scaleY;
        
        if (batchConfig.maintainScaleAspectRatio) {
          if (batchConfig.scaleXMode === 'range') {
            const [minScale, maxScale] = batchConfig.scaleXRange;
            const randomScale = (minScale + Math.random() * (maxScale - minScale)) / 100;
            scaleX = Math.max(0.1, randomScale);
            scaleY = Math.max(0.1, randomScale);
          } else if (batchConfig.scaleXMode === 'value') {
            const baseScale = (batchConfig.scaleXValue || 100) / 100;
            scaleX = Math.max(0.1, baseScale);
            scaleY = Math.max(0.1, baseScale);
          } else if (batchConfig.scaleXMode === 'incremental') {
            const incrementAmount = ((batchConfig.scaleXIncrement || 0) / 100) * index;
            const startScale = (batchConfig.scaleXStartValue ?? 100) / 100;
            const finalScale = startScale + incrementAmount;
            scaleX = Math.max(0.1, finalScale);
            scaleY = Math.max(0.1, finalScale);
          }
        } else {
          if (batchConfig.scaleXMode === 'range') {
            const [minScaleX, maxScaleX] = batchConfig.scaleXRange;
            const randomScale = (minScaleX + Math.random() * (maxScaleX - minScaleX)) / 100;
            scaleX = Math.max(0.1, randomScale);
          } else if (batchConfig.scaleXMode === 'value') {
            const baseScale = (batchConfig.scaleXValue || 100) / 100;
            scaleX = Math.max(0.1, baseScale);
          } else if (batchConfig.scaleXMode === 'incremental') {
            const incrementAmount = ((batchConfig.scaleXIncrement || 0) / 100) * index;
            const startScale = (batchConfig.scaleXStartValue ?? 100) / 100;
            const finalScale = startScale + incrementAmount;
            scaleX = Math.max(0.1, finalScale);
          }

          if (batchConfig.scaleYMode === 'range') {
            const [minScaleY, maxScaleY] = batchConfig.scaleYRange;
            const randomScale = (minScaleY + Math.random() * (maxScaleY - minScaleY)) / 100;
            scaleY = Math.max(0.1, randomScale);
          } else if (batchConfig.scaleYMode === 'value') {
            const baseScale = (batchConfig.scaleYValue || 100) / 100;
            scaleY = Math.max(0.1, baseScale);
          } else if (batchConfig.scaleYMode === 'incremental') {
            const incrementAmount = ((batchConfig.scaleYIncrement || 0) / 100) * index;
            const startScale = (batchConfig.scaleYStartValue ?? 100) / 100;
            const finalScale = startScale + incrementAmount;
            scaleY = Math.max(0.1, finalScale);
          }
        }

        let rotation = 0;
        if (batchConfig.rotationMode === 'range') {
          const [minRot, maxRot] = batchConfig.rotationRange;
          rotation = minRot + Math.random() * (maxRot - minRot);
        } else if (batchConfig.rotationMode === 'value') {
          rotation = batchConfig.rotationValue || 0;
        } else if (batchConfig.rotationMode === 'incremental') {
          let incrementAmount = (batchConfig.rotationIncrement || 0) * index;
          const startValue = batchConfig.rotationStartValue ?? 0;
          if (batchConfig.rotationModulationEnabled && batchConfig.rotationModulation > 0) {
            const m = batchConfig.rotationModulation;
            incrementAmount = ((incrementAmount % m) + m) % m;
          }
          rotation = startValue + incrementAmount;
        }

        const scaledRelativeX = shapeRelativeX * scaleX;
        const scaledRelativeY = shapeRelativeY * scaleY;
        
        const rotationRad = (rotation * Math.PI) / 180;
        const cosR = Math.cos(rotationRad);
        const sinR = Math.sin(rotationRad);
        const rotatedX = scaledRelativeX * cosR - scaledRelativeY * sinR;
        const rotatedY = scaledRelativeX * sinR + scaledRelativeY * cosR;
        
        shape.transform.x = originX + rotatedX + positionDeltaX;
        shape.transform.y = originY + rotatedY + positionDeltaY;
        shape.transform.scaleX = scaleX;
        shape.transform.scaleY = scaleY;
        shape.transform.rotation = rotation;

        if (batchConfig.skewXRange && batchConfig.skewYRange) {
          const [minSkewX, maxSkewX] = batchConfig.skewXRange;
          const [minSkewY, maxSkewY] = batchConfig.skewYRange;
          shape.transform.skewX = minSkewX + Math.random() * (maxSkewX - minSkewX);
          shape.transform.skewY = minSkewY + Math.random() * (maxSkewY - minSkewY);
        }

        if (batchConfig.rotationRandomizationScale > 0) {
          const randomVariation = (Math.random() * 2 - 1) * 30;
          const scaledVariation = randomVariation * (batchConfig.rotationRandomizationScale / 100);
          
          const relX = shape.transform.x - originX;
          const relY = shape.transform.y - originY;
          
          const newRotation = shape.transform.rotation + scaledVariation;
          
          const totalRotationRad = (newRotation * Math.PI) / 180;
          const cosTotal = Math.cos(totalRotationRad);
          const sinTotal = Math.sin(totalRotationRad);
          
          const oldRotationRad = (shape.transform.rotation * Math.PI) / 180;
          const cosOld = Math.cos(oldRotationRad);
          const sinOld = Math.sin(oldRotationRad);
          
          const unrotatedX = relX * cosOld + relY * sinOld;
          const unrotatedY = -relX * sinOld + relY * cosOld;
          
          const newRelX = unrotatedX * cosTotal - unrotatedY * sinTotal;
          const newRelY = unrotatedX * sinTotal + unrotatedY * cosTotal;
          
          shape.transform.x = originX + newRelX;
          shape.transform.y = originY + newRelY;
          shape.transform.rotation = newRotation;
        }
      }
    }

    // Apply blend modes or compositing operations based on probabilities
    if (batchConfig.blendModeEnabled && batchConfig.enabledBlendModes) {
      const enabledModes = Object.entries(batchConfig.enabledBlendModes);
      if (enabledModes.length > 0) {
        const totalWeight = enabledModes.reduce((sum, [_, weight]) => sum + (weight as number), 0);
        if (totalWeight > 0) {
          const random = Math.random() * totalWeight;
          let cumulative = 0;
          
          for (const [mode, weight] of enabledModes) {
            cumulative += (weight as number);
            if (random < cumulative) {
              shape.properties.blendMode = mode as any;
              break;
            }
          }
        }
      }
    } else if (batchConfig.compositingOperationsEnabled && batchConfig.enabledCompositingOperations) {
      const enabledOps = Object.entries(batchConfig.enabledCompositingOperations);
      if (enabledOps.length > 0) {
        const totalWeight = enabledOps.reduce((sum, [_, weight]) => sum + (weight as number), 0);
        if (totalWeight > 0) {
          const random = Math.random() * totalWeight;
          let cumulative = 0;
          
          for (const [op, weight] of enabledOps) {
            cumulative += (weight as number);
            if (random < cumulative) {
              shape.properties.blendMode = op as any;
              break;
            }
          }
        }
      }
    }

    return shape;
  });

  // Phase 2: Apply distribution layouts ONLY if explicitly enabled
  let finalShapes = newShapes;
  
  console.log(`📍 [SERVER] Phase 2 Check: distributionLayoutEnabled=${batchConfig.distributionLayoutEnabled}, pattern=${batchConfig.distributionPattern}`);
  
  if (batchConfig.distributionLayoutEnabled) {
    const distributionConfig = {
      enabled: batchConfig.distributionLayoutEnabled,
      pattern: batchConfig.distributionPattern,
      gridRows: batchConfig.gridRows,
      gridColumns: batchConfig.gridColumns,
      gridStartX: batchConfig.gridStartX,
      gridStartY: batchConfig.gridStartY,
      gridSpacingXMode: batchConfig.gridSpacingXMode,
      gridSpacingYMode: batchConfig.gridSpacingYMode,
      gridRowOffset: batchConfig.gridRowOffset,
      gridColumnOffset: batchConfig.gridColumnOffset,
      gridMarginEnabled: batchConfig.gridMarginEnabled,
      gridMarginValue: batchConfig.gridMarginValue,
      gridSortBy: batchConfig.gridSortBy,
      gridSortScope: batchConfig.gridSortScope,
      gridSortOrder: batchConfig.gridSortOrder,
      gridXRandomization: batchConfig.gridXRandomization,
      gridYRandomization: batchConfig.gridYRandomization,
      autoDistributeXCount: batchConfig.autoDistributeXCount,
      autoDistributeYCount: batchConfig.autoDistributeYCount,
      waveType: batchConfig.waveType,
      waveAmplitude: batchConfig.waveAmplitude,
      waveFrequency: batchConfig.waveFrequency,
      waveDirection: batchConfig.waveDirection,
      wavePhaseOffset: batchConfig.wavePhaseOffset,
      ellipseXRadius: batchConfig.ellipseXRadius,
      ellipseYRadius: batchConfig.ellipseYRadius,
      ellipseRingCount: batchConfig.ellipseRingCount,
      ellipseRingSpacing: batchConfig.ellipseRingSpacing,
      ellipseRotation: batchConfig.ellipseRotation,
      ellipseRotationAlignment: batchConfig.ellipseRotationAlignment,
      ellipseAlignToRing: batchConfig.ellipseAlignToRing,
      ellipseFlipInward: batchConfig.ellipseFlipInward,
      ellipseAdditionalRotation: batchConfig.ellipseAdditionalRotation,
      ellipseShapeRotationMode: batchConfig.ellipseShapeRotationMode,
      ellipseRotationFixed: batchConfig.ellipseRotationFixed,
      ellipseRotationRange: batchConfig.ellipseRotationRange,
      ellipseRotationIncrementalStart: batchConfig.ellipseRotationIncrementalStart,
      ellipseRotationIncrementalStep: batchConfig.ellipseRotationIncrementalStep,
      spiralTurnCount: batchConfig.spiralTurnCount,
      spiralSpacingMode: batchConfig.spiralSpacingMode,
      spiralDirection: batchConfig.spiralDirection,
      spiralStartAngle: batchConfig.spiralStartAngle,
      spiralTightness: batchConfig.spiralTightness,
      tangentAlignment: batchConfig.tangentAlignment,
      segmentDistribution: batchConfig.segmentDistribution,
      reverseDirection: batchConfig.reverseDirection
    };

    // Default generation info for single batch
    const generationInfo = {
      currentGeneration: 0,
      totalGenerations: 1,
      shapesPerGeneration: newShapes.length
    };
    
    // Apply the appropriate distribution pattern
    if (batchConfig.distributionPattern === 'auto-distribute') {
      finalShapes = applyAutoDistribution(newShapes, distributionConfig, { x: 0, y: 0 }, canvasBounds);
      console.log(`🎯 [SERVER] Applied auto-distribute: ${batchConfig.autoDistributeXCount} shapes X, ${batchConfig.autoDistributeYCount} shapes Y`);
    } else if (batchConfig.distributionPattern === 'wave') {
      finalShapes = applyWaveDistribution(newShapes, distributionConfig, { x: 0, y: 0 }, canvasBounds);
      console.log(`🌊 [SERVER] Applied wave distribution: ${batchConfig.waveType} wave, amplitude=${batchConfig.waveAmplitude}px, frequency=${batchConfig.waveFrequency}`);
    } else if (batchConfig.distributionPattern === 'ellipse') {
      finalShapes = applyEllipseDistribution(newShapes, distributionConfig, { x: 0, y: 0 }, canvasBounds);
      console.log(`⭕ [SERVER] Applied ellipse distribution: ${batchConfig.ellipseRingCount} rings`);
    } else if (batchConfig.distributionPattern === 'spiral') {
      finalShapes = applySpiralDistribution(newShapes, distributionConfig, { x: 0, y: 0 }, canvasBounds);
      console.log(`🌀 [SERVER] Applied spiral distribution: ${batchConfig.spiralTurnCount} turns`);
    } else {
      // Apply grid distribution and get results with grid context
      const globalIndexOffset = generationContext?.startIndex ?? 0;
      const gridResults = applyGridDistribution(newShapes, distributionConfig, { x: 0, y: 0 }, generationInfo, canvasBounds, globalIndexOffset);
      console.log(`🎯 [SERVER] Applied grid distribution: ${batchConfig.gridRows}×${batchConfig.gridColumns}`);
      
      // Apply incremental position modulation after grid distribution (if enabled)
      const hasXIncremental = batchConfig.propertiesEnabled && batchConfig.shapePropertiesEnabled && 
                             batchConfig.xPositionMode === 'incremental';
      const hasYIncremental = batchConfig.propertiesEnabled && batchConfig.shapePropertiesEnabled && 
                             batchConfig.yPositionMode === 'incremental';
      
      if (hasXIncremental || hasYIncremental) {
        const xSettings = hasXIncremental ? {
          startValue: batchConfig.xPositionStartValue,
          increment: batchConfig.xPositionIncrement,
          modulationMode: batchConfig.xPositionModulationMode,
          modulationValue: batchConfig.xPositionModulationValue,
          resetPerBatch: batchConfig.incrementalResetPerBatch
        } : null;
        
        const ySettings = hasYIncremental ? {
          startValue: batchConfig.yPositionStartValue,
          increment: batchConfig.yPositionIncrement,
          modulationMode: batchConfig.yPositionModulationMode,
          modulationValue: batchConfig.yPositionModulationValue,
          resetPerBatch: batchConfig.incrementalResetPerBatch
        } : null;
        
        // Apply modulation with grid context (globalIndexOffset is already in batchIndex)
        finalShapes = applyIncrementalPositionToShapes(gridResults, xSettings, ySettings, {
          globalIndexOffset: generationContext?.startIndex ?? 0,
          gridColumns: batchConfig.gridColumns || 3
        });
        
        console.log(`📐 [SERVER] Applied incremental position modulation after grid distribution`);
      } else {
        // Extract shapes from grid results (no modulation needed)
        finalShapes = gridResults.map(r => r.shape);
      }
    }
  }

  // Build generation metadata
  const metadata: GenerationMetadata = {
    generationId: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    generationIndex: generationContext?.generationIndex ?? 0,
    shapeCount: finalShapes.length,
    startIndex: generationContext?.startIndex ?? 0
  };

  return { shapes: finalShapes, metadata };
}
