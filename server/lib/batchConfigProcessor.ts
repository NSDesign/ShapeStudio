/**
 * Batch Config Processor for Server-side Shape Generation
 * Ported from client/src/hooks/useShapeEditor.ts
 */

import { Shape } from './shapeGenerator';
import { SmartDistributionAlgorithm } from './distributionAlgorithm';
import { ColorUtils, generateColor, generateGradientColors } from './colorUtils';
import { NoiseSystem } from './noiseUtils';
import type { BatchConfigSettings } from '../../shared/schema';
import type { ShapeType, Point } from '../../client/src/lib/shapeTypes';

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
    return (Math.random() - 0.5) * artboardWidth * 0.8;
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
      
      if (settings.xPositionModulationEnabled && settings.xPositionModulationValue > 0) {
        value = value % settings.xPositionModulationValue;
      }
      
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
    return (Math.random() - 0.5) * artboardHeight * 0.8;
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
      
      if (settings.yPositionModulationEnabled && settings.yPositionModulationValue > 0) {
        value = value % settings.yPositionModulationValue;
      }
      
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
 * Helper function to calculate constrained size for circular shapes
 */
function calculateConstrainedSize(
  settings: BatchConfigSettings,
  width: number,
  height: number,
  shapeType: string
): number {
  if (!['circle', 'star', 'ring', 'spline-circle', 'spline-ring'].includes(shapeType)) {
    return width;
  }

  if (settings.maintainAspectRatio) {
    return width;
  }

  if (settings.useMinWidthHeight) {
    return Math.min(width, height);
  }

  if (settings.useAvgWidthHeight) {
    return (width + height) / 2;
  }

  return Math.max(width, height);
}

/**
 * Main function to generate shapes with batch configuration
 */
export function generateShapesWithBatchConfig(
  count: number,
  canvasBounds: CanvasBounds,
  options: GenerationOptions
): Shape[] {
  const enabledTypes = options.enabledShapeTypes || ['rectangle', 'circle', 'triangle'];
  const batchConfig = options.batchConfig;
  const useDistribution = options.distributionEnabled !== false;

  if (enabledTypes.length === 0) {
    return [];
  }

  const positions = useDistribution
    ? SmartDistributionAlgorithm.generatePositions(count, canvasBounds, {
        pattern: 'random',
        randomness: 1,
        spacing: 20,
        scale: 1,
        density: 0.5,
        rotation: 0,
        avoidOverlap: false,
        respectBounds: true
      })
    : Array.from({ length: count }, () => ({
        x: canvasBounds.x + (Math.random() - 0.5) * (canvasBounds.width * 0.8),
        y: canvasBounds.y + (Math.random() - 0.5) * (canvasBounds.height * 0.8)
      }));

  const newShapes = positions.map((position, index) => {
    const randomType = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];

    let shapeX = position.x;
    let shapeY = position.y;

    // Defensive fallback: if distribution algorithm returns null positions, use random defaults
    if (shapeX == null) {
      shapeX = canvasBounds.x + (Math.random() - 0.5) * (canvasBounds.width * 0.8);
    }
    if (shapeY == null) {
      shapeY = canvasBounds.y + (Math.random() - 0.5) * (canvasBounds.height * 0.8);
    }

    if (batchConfig.propertiesEnabled && batchConfig.shapePropertiesEnabled) {
      shapeX = calculatePositionX(batchConfig, index, canvasBounds.width, canvasBounds.height, positions.length);
      shapeY = calculatePositionY(batchConfig, index, canvasBounds.width, canvasBounds.height, positions.length);
    }

    let calculatedWidth = calculateWidth(batchConfig, index, canvasBounds.width, canvasBounds.height, positions.length);
    let calculatedHeight = calculateHeight(batchConfig, index, canvasBounds.width, canvasBounds.height, positions.length);

    if (batchConfig.maintainAspectRatio) {
      calculatedHeight = calculatedWidth;
    }

    const finalSize = calculateConstrainedSize(batchConfig, calculatedWidth, calculatedHeight, randomType);
    
    const shape = new Shape(randomType, shapeX, shapeY);
    shape.width = finalSize;
    shape.height = batchConfig.maintainAspectRatio || ['circle', 'star', 'ring', 'spline-circle', 'spline-ring'].includes(randomType) 
      ? finalSize 
      : calculatedHeight;

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
            // Simplified gradient generation
            const [minStops, maxStops] = batchConfig.fillGradientStopsRange || [2, 5];
            const stopCount = Math.floor(minStops + Math.random() * (maxStops - minStops + 1));
            
            const gradientColors = generateGradientColors(
              batchConfig.fillGradientColorMode,
              stopCount,
              batchConfig.fillGradientColorRange,
              batchConfig.fillGradientColorPalette,
              batchConfig.fillGradientColorDefine,
              index,
              batchConfig.fillGradientColorRangeFlip
            );

            const stops = gradientColors.map((color, i) => ({
              offset: stopCount === 1 ? 0 : i / (stopCount - 1),
              color: color
            }));

            // Determine gradient type based on probabilities
            const totalProb = batchConfig.fillGradientLinearProbability + 
                            batchConfig.fillGradientRadialProbability + 
                            batchConfig.fillGradientConicProbability;
            const rand = Math.random() * totalProb;
            
            let gradientType: 'linear' | 'radial' | 'conic' = 'linear';
            if (rand < batchConfig.fillGradientLinearProbability) {
              gradientType = 'linear';
            } else if (rand < batchConfig.fillGradientLinearProbability + batchConfig.fillGradientRadialProbability) {
              gradientType = 'radial';
            } else {
              gradientType = 'conic';
            }

            shape.properties.gradient = {
              type: gradientType,
              stops: stops
            };

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
          const [minWidth, maxWidth] = batchConfig.strokeWidthRange;
          shape.properties.strokeWidth = minWidth + Math.random() * (maxWidth - minWidth);

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

      if (batchConfig.blurEnabled) {
        const shouldHaveBlur = Math.random() * 100 < batchConfig.blurProbability;
        if (shouldHaveBlur) {
          if (batchConfig.blurMode === 'range') {
            const [minBlur, maxBlur] = batchConfig.blurRange;
            shape.properties.blurRadius = minBlur + Math.random() * (maxBlur - minBlur);
          } else if (batchConfig.blurMode === 'define') {
            shape.properties.blurRadius = batchConfig.blurDefine;
          }
        } else {
          shape.properties.blurRadius = 0;
        }
      } else {
        shape.properties.blurRadius = 0;
      }

      if (batchConfig.transformsEnabled) {
        let originX = 0;
        let originY = 0;
        
        if (batchConfig.transformOriginMode === 'define') {
          originX = batchConfig.transformOriginX || 0;
          originY = batchConfig.transformOriginY || 0;
        } else if (batchConfig.transformOriginMode === 'predefined-artboard') {
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
        } else if (batchConfig.transformOriginMode === 'predefined-shape') {
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
        }
        
        const shapeRelativeX = shape.transform.x - originX;
        const shapeRelativeY = shape.transform.y - originY;

        let positionDeltaX = 0;
        if (batchConfig.xTransformMode === 'range') {
          const [minTransX, maxTransX] = batchConfig.translateXRange;
          positionDeltaX = minTransX + Math.random() * (maxTransX - minTransX);
        } else if (batchConfig.xTransformMode === 'value') {
          const baseValue = batchConfig.xTransformValue || 0;
          const randomVariation = (Math.random() * 2 - 1) * 50;
          positionDeltaX = baseValue + randomVariation;
        } else if (batchConfig.xTransformMode === 'incremental') {
          const incrementAmount = (batchConfig.xTransformIncrement || 0) * index;
          const randomVariation = (Math.random() * 2 - 1) * 25;
          positionDeltaX = incrementAmount + randomVariation;
        }

        let positionDeltaY = 0;
        if (batchConfig.yTransformMode === 'range') {
          const [minTransY, maxTransY] = batchConfig.translateYRange;
          positionDeltaY = minTransY + Math.random() * (maxTransY - minTransY);
        } else if (batchConfig.yTransformMode === 'value') {
          const baseValue = batchConfig.yTransformValue || 0;
          const randomVariation = (Math.random() * 2 - 1) * 50;
          positionDeltaY = baseValue + randomVariation;
        } else if (batchConfig.yTransformMode === 'incremental') {
          const incrementAmount = (batchConfig.yTransformIncrement || 0) * index;
          const randomVariation = (Math.random() * 2 - 1) * 25;
          positionDeltaY = incrementAmount + randomVariation;
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
            const incrementAmount = (batchConfig.scaleXIncrement || 0) * index;
            const finalScale = 1 + incrementAmount;
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
            const incrementAmount = (batchConfig.scaleXIncrement || 0) * index;
            const finalScale = 1 + incrementAmount;
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
            const incrementAmount = (batchConfig.scaleYIncrement || 0) * index;
            const finalScale = 1 + incrementAmount;
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
          if (batchConfig.rotationModulationEnabled && batchConfig.rotationModulation > 0) {
            incrementAmount = incrementAmount % batchConfig.rotationModulation;
          }
          rotation = incrementAmount;
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
      }

      if (batchConfig.rotationRandomizationScale > 0) {
        const randomVariation = (Math.random() * 2 - 1) * 30;
        const scaledVariation = randomVariation * (batchConfig.rotationRandomizationScale / 100);
        shape.transform.rotation += scaledVariation;
      }
    }

    if (batchConfig.noiseEnabled) {
      const noiseResult = NoiseSystem.generateNoiseVariation(
        index,
        batchConfig,
        position.x,
        position.y,
        canvasBounds.width,
        canvasBounds.height
      );

      shape.transform.x += noiseResult.x;
      shape.transform.y += noiseResult.y;
      shape.transform.rotation += noiseResult.rotation;
      shape.transform.scaleX += noiseResult.scaleX * 0.1;
      shape.transform.scaleY += noiseResult.scaleY * 0.1;

      if (batchConfig.propertiesEnabled && batchConfig.noiseOpacityAmplitude > 0) {
        const baseOpacity = shape.properties.fillOpacity;
        const noiseOpacity = baseOpacity + (noiseResult.opacity - 1) * 0.3;
        shape.properties.fillOpacity = Math.max(0.1, Math.min(1, noiseOpacity));
        shape.properties.strokeOpacity = Math.max(0.1, Math.min(1, noiseOpacity));
      }

      shape.properties.blurRadius = Math.max(0, noiseResult.blur);

      if (!batchConfig.colorHarmonyEnabled) {
        if (batchConfig.noiseAlgorithm === 'randomise') {
          const hue = noiseResult.hue;
          const saturation = noiseResult.saturation;
          const lightness = noiseResult.lightness;
          const noiseColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          shape.properties.fillColor = noiseColor;
        } else if (batchConfig.noiseAlgorithm === 'perlin') {
          let hue = 0, saturation = 50, lightness = 50;
          const hslMatch = shape.properties.fillColor?.match(/hsl\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)%,\s*(\d+(?:\.\d+)?)%\)/);
          if (hslMatch) {
            hue = parseFloat(hslMatch[1]);
            saturation = parseFloat(hslMatch[2]);
            lightness = parseFloat(hslMatch[3]);
          }

          hue = (hue + noiseResult.hue + 360) % 360;
          saturation = Math.max(0, Math.min(100, saturation + noiseResult.saturation));
          lightness = Math.max(0, Math.min(100, lightness + noiseResult.lightness));
          shape.properties.fillColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        } else {
          const baseHue = Math.random() * 360;
          const baseSaturation = 60 + Math.random() * 30;
          const baseLightness = 40 + Math.random() * 30;

          const finalHue = (baseHue + noiseResult.hue + 360) % 360;
          const finalSaturation = Math.max(10, Math.min(95, baseSaturation + noiseResult.saturation));
          const finalLightness = Math.max(15, Math.min(85, baseLightness + noiseResult.lightness));
          shape.properties.fillColor = `hsl(${finalHue}, ${finalSaturation}%, ${finalLightness}%)`;
        }
      }
    }

    return shape;
  });

  return newShapes;
}
