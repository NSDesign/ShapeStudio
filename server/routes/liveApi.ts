import type { Express } from "express";
import { z } from 'zod';
import type { DatabaseStorage } from '../storage';
import { 
  GenerationSetSchema, 
  BatchConfigSettingsSchema,
  type GenerationSet,
  type BatchConfigSettings,
  type UserPreferences
} from '@shared/schema';

// API key from environment or fallback to hardcoded for development
const API_KEY = process.env.LIVE_API_KEY || '3211d3f332fsss4t4tbebw5r653765h6brb4';

// Helper function to filter shape-specific properties based on enabled shape types
function filterShapeSpecificProperties(
  shapeSpecificProps: any,
  enabledShapeTypes: string[]
): any {
  if (!shapeSpecificProps || typeof shapeSpecificProps !== 'object') {
    return {};
  }
  
  const filtered: any = {};
  
  // Only include properties for enabled shape types
  enabledShapeTypes.forEach(shapeType => {
    if (shapeSpecificProps[shapeType] !== undefined) {
      filtered[shapeType] = shapeSpecificProps[shapeType];
    }
  });
  
  return filtered;
}

// Helper function to compare values and only return if different from defaults
function stripDefaultValues(obj: any, defaults: any): any {
  const result: any = {};
  
  for (const key in obj) {
    const value = obj[key];
    const defaultValue = defaults[key];
    
    // Include if value is different from default
    if (JSON.stringify(value) !== JSON.stringify(defaultValue)) {
      result[key] = value;
    }
  }
  
  return result;
}

// Helper to filter mode-based properties - only include relevant fields based on mode value
function filterModeBasedProperties(
  config: any, 
  prefix: string, 
  mode: string
): any {
  const result: any = {
    [`${prefix}Mode`]: mode
  };

  if (mode === 'range') {
    result[`${prefix}Range`] = config[`${prefix}Range`];
  } else if (mode === 'define' || mode === 'fixed') {
    result[`${prefix}Define`] = config[`${prefix}Define`];
  } else if (mode === 'incremental') {
    result[`${prefix}StartValue`] = config[`${prefix}StartValue`];
    result[`${prefix}Increment`] = config[`${prefix}Increment`];
  } else if (mode === 'modulation') {
    result[`${prefix}StartValue`] = config[`${prefix}StartValue`];
    result[`${prefix}ModulationEnabled`] = config[`${prefix}ModulationEnabled`];
    if (config[`${prefix}ModulationEnabled`]) {
      result[`${prefix}ModulationValue`] = config[`${prefix}ModulationValue`];
    }
  } else if (mode === 'palette') {
    result[`${prefix}Palette`] = config[`${prefix}Palette`];
  } else if (mode === 'harmony') {
    result[`${prefix}SaturationRange`] = config[`${prefix}SaturationRange`];
    result[`${prefix}LightnessRange`] = config[`${prefix}LightnessRange`];
  }

  return result;
}

// Helper function to filter BatchConfigSettings to only include enabled sections
function filterEnabledBatchConfig(batchConfig: BatchConfigSettings, enabledShapeTypes: string[] = []): Partial<BatchConfigSettings> {
  const filtered: Partial<BatchConfigSettings> = {
    selectedPreset: batchConfig.selectedPreset,
  };
  
  // Create a set for faster lookup
  const enabledShapesSet = new Set(enabledShapeTypes);

  // Distribution Layout Section
  if (batchConfig.distributionLayoutEnabled) {
    filtered.distributionLayoutEnabled = true;
    filtered.distributionPattern = batchConfig.distributionPattern;
    
    // Pattern-specific settings
    if (batchConfig.distributionPattern === 'grid') {
      filtered.gridRows = batchConfig.gridRows;
      filtered.gridColumns = batchConfig.gridColumns;
      filtered.gridStartX = batchConfig.gridStartX;
      filtered.gridStartY = batchConfig.gridStartY;
      filtered.gridSpacingXMode = batchConfig.gridSpacingXMode;
      filtered.gridSpacingYMode = batchConfig.gridSpacingYMode;
      filtered.gridRowOffset = batchConfig.gridRowOffset;
      filtered.gridColumnOffset = batchConfig.gridColumnOffset;
      filtered.gridSortBy = batchConfig.gridSortBy;
      filtered.gridSortScope = batchConfig.gridSortScope;
      filtered.gridSortOrder = batchConfig.gridSortOrder;
      filtered.gridXRandomization = batchConfig.gridXRandomization;
      filtered.gridYRandomization = batchConfig.gridYRandomization;
    }
    if (batchConfig.distributionPattern === 'auto-distribute') {
      filtered.autoDistributeXCount = batchConfig.autoDistributeXCount;
      filtered.autoDistributeYCount = batchConfig.autoDistributeYCount;
    }
    if (batchConfig.distributionPattern === 'wave') {
      filtered.waveType = batchConfig.waveType;
      filtered.waveAmplitude = batchConfig.waveAmplitude;
      filtered.waveFrequency = batchConfig.waveFrequency;
      filtered.waveDirection = batchConfig.waveDirection;
      filtered.wavePhaseOffset = batchConfig.wavePhaseOffset;
    }
    if (batchConfig.distributionPattern === 'ellipse') {
      filtered.ellipseXRadius = batchConfig.ellipseXRadius;
      filtered.ellipseYRadius = batchConfig.ellipseYRadius;
      filtered.ellipseRingCount = batchConfig.ellipseRingCount;
      filtered.ellipseRingSpacing = batchConfig.ellipseRingSpacing;
      filtered.ellipseRotation = batchConfig.ellipseRotation;
      filtered.ellipseRotationAlignment = batchConfig.ellipseRotationAlignment;
    }
    if (batchConfig.distributionPattern === 'spiral') {
      filtered.spiralTurnCount = batchConfig.spiralTurnCount;
      filtered.spiralSpacingMode = batchConfig.spiralSpacingMode;
      filtered.spiralDirection = batchConfig.spiralDirection;
      filtered.spiralStartAngle = batchConfig.spiralStartAngle;
      filtered.spiralTightness = batchConfig.spiralTightness;
    }
    
    // Shared pattern enhancements
    filtered.tangentAlignment = batchConfig.tangentAlignment;
    filtered.segmentDistribution = batchConfig.segmentDistribution;
    filtered.reverseDirection = batchConfig.reverseDirection;
  }

  // Generation Count Controls
  if (batchConfig.generationCountModulationEnabled) {
    filtered.generationCountMode = batchConfig.generationCountMode;
    filtered.generationCountDefine = batchConfig.generationCountDefine;
    filtered.generationCountStartValue = batchConfig.generationCountStartValue;
    filtered.generationCountIncrement = batchConfig.generationCountIncrement;
    filtered.generationCountResetPerBatch = batchConfig.generationCountResetPerBatch;
    filtered.generationCountModulationEnabled = true;
    filtered.generationCountModulationValue = batchConfig.generationCountModulationValue;
  }

  // Blend Mode Control
  if (batchConfig.blendModeEnabled) {
    filtered.blendModeEnabled = true;
    filtered.enabledBlendModes = batchConfig.enabledBlendModes;
  }

  // Compositing Operations Control
  if (batchConfig.compositingOperationsEnabled) {
    filtered.compositingOperationsEnabled = true;
    filtered.enabledCompositingOperations = batchConfig.enabledCompositingOperations;
  }

  // Properties Section
  if (batchConfig.propertiesEnabled) {
    filtered.propertiesEnabled = true;
    
    // Shape Properties
    if (batchConfig.shapePropertiesEnabled) {
      filtered.shapePropertiesEnabled = true;
      filtered.widthRange = batchConfig.widthRange;
      filtered.heightRange = batchConfig.heightRange;
      filtered.xPositionRange = batchConfig.xPositionRange;
      filtered.yPositionRange = batchConfig.yPositionRange;
      filtered.widthMode = batchConfig.widthMode;
      filtered.heightMode = batchConfig.heightMode;
      filtered.sizeIncrementalResetPerBatch = batchConfig.sizeIncrementalResetPerBatch;
      filtered.useMinWidthHeight = batchConfig.useMinWidthHeight;
      filtered.useMaxWidthHeight = batchConfig.useMaxWidthHeight;
      filtered.useAvgWidthHeight = batchConfig.useAvgWidthHeight;
      filtered.widthValue = batchConfig.widthValue;
      filtered.heightValue = batchConfig.heightValue;
      filtered.widthIncrement = batchConfig.widthIncrement;
      filtered.heightIncrement = batchConfig.heightIncrement;
      filtered.widthStartValue = batchConfig.widthStartValue;
      filtered.heightStartValue = batchConfig.heightStartValue;
      filtered.widthModulationEnabled = batchConfig.widthModulationEnabled;
      filtered.widthModulationValue = batchConfig.widthModulationValue;
      filtered.heightModulationEnabled = batchConfig.heightModulationEnabled;
      filtered.heightModulationValue = batchConfig.heightModulationValue;
      filtered.maintainAspectRatio = batchConfig.maintainAspectRatio;
      filtered.minimumSize = batchConfig.minimumSize;
      filtered.maximumSize = batchConfig.maximumSize;
    }

    // Position Properties
    if (batchConfig.positionsEnabled) {
      filtered.positionsEnabled = true;
      filtered.xPositionMode = batchConfig.xPositionMode;
      filtered.yPositionMode = batchConfig.yPositionMode;
      filtered.incrementalResetPerBatch = batchConfig.incrementalResetPerBatch;
      filtered.directionalEvenDistribution = batchConfig.directionalEvenDistribution;
      filtered.directionalClusterAngle = batchConfig.directionalClusterAngle;
      filtered.xPositionValue = batchConfig.xPositionValue;
      filtered.yPositionValue = batchConfig.yPositionValue;
      filtered.positionDirectionalMode = batchConfig.positionDirectionalMode;
      filtered.positionDirectionalAngle = batchConfig.positionDirectionalAngle;
      filtered.positionDirectionalDistance = batchConfig.positionDirectionalDistance;
      filtered.xPositionIncrement = batchConfig.xPositionIncrement;
      filtered.yPositionIncrement = batchConfig.yPositionIncrement;
      filtered.xPositionStartValue = batchConfig.xPositionStartValue;
      filtered.yPositionStartValue = batchConfig.yPositionStartValue;
      filtered.xPositionModulationEnabled = batchConfig.xPositionModulationEnabled;
      filtered.xPositionModulationValue = batchConfig.xPositionModulationValue;
      filtered.yPositionModulationEnabled = batchConfig.yPositionModulationEnabled;
      filtered.yPositionModulationValue = batchConfig.yPositionModulationValue;
    }

    // Shape-specific properties (only include if relevant shapes are enabled)
    // Rectangle/Rounded-Rectangle corner radius (only if rounded variants are enabled)
    if (enabledShapesSet.has('rounded-rectangle') || enabledShapesSet.has('rounded-square')) {
      const cornerRadiusProps = filterModeBasedProperties(batchConfig, 'rectangleCornerRadius', batchConfig.rectangleCornerRadiusMode);
      Object.assign(filtered, cornerRadiusProps);
    }

    // Star inner radius (only if star is enabled)
    if (enabledShapesSet.has('star')) {
      const starInnerRadiusProps = filterModeBasedProperties(batchConfig, 'starInnerRadius', batchConfig.starInnerRadiusMode);
      Object.assign(filtered, starInnerRadiusProps);
    }

    // Ring inner radius (only if ring or spline-ring is enabled)
    if (enabledShapesSet.has('ring') || enabledShapesSet.has('spline-ring')) {
      const ringInnerRadiusProps = filterModeBasedProperties(batchConfig, 'ringInnerRadius', batchConfig.ringInnerRadiusMode);
      Object.assign(filtered, ringInnerRadiusProps);
    }

    // Fill Properties
    if (batchConfig.fillEnabled) {
      filtered.fillEnabled = true;
      filtered.fillStyleProbability = batchConfig.fillStyleProbability;
      
      // Only include fill color properties relevant to the mode
      const fillColorProps = filterModeBasedProperties(batchConfig, 'fillColor', batchConfig.fillColorMode);
      Object.assign(filtered, fillColorProps);
      
      // Add flip flag only for range mode
      if (batchConfig.fillColorMode === 'range') {
        filtered.fillColorRangeFlip = batchConfig.fillColorRangeFlip;
      }

      // Fill Gradient Settings
      if (batchConfig.fillGradientEnabled) {
        filtered.fillGradientEnabled = true;
        filtered.fillGradientLinearProbability = batchConfig.fillGradientLinearProbability;
        filtered.fillGradientRadialProbability = batchConfig.fillGradientRadialProbability;
        filtered.fillGradientConicProbability = batchConfig.fillGradientConicProbability;
        filtered.fillGradientColorMode = batchConfig.fillGradientColorMode;
        filtered.fillGradientColorRange = batchConfig.fillGradientColorRange;
        filtered.fillGradientColorRangeFlip = batchConfig.fillGradientColorRangeFlip;
        filtered.fillGradientColorPalette = batchConfig.fillGradientColorPalette;
        filtered.fillGradientColorDefine = batchConfig.fillGradientColorDefine;
        filtered.fillGradientColorSaturationRange = batchConfig.fillGradientColorSaturationRange;
        filtered.fillGradientColorLightnessRange = batchConfig.fillGradientColorLightnessRange;
        filtered.fillGradientStopsRange = batchConfig.fillGradientStopsRange;
        filtered.fillGradientLinearDirection = batchConfig.fillGradientLinearDirection;
        filtered.fillGradientLinearAngleRange = batchConfig.fillGradientLinearAngleRange;
        filtered.fillGradientLinearPredefined = batchConfig.fillGradientLinearPredefined;
        filtered.fillGradientLinearAlignToShape = batchConfig.fillGradientLinearAlignToShape;
        filtered.fillGradientRadialCenter = batchConfig.fillGradientRadialCenter;
        filtered.fillGradientRadialCenterX = batchConfig.fillGradientRadialCenterX;
        filtered.fillGradientRadialCenterY = batchConfig.fillGradientRadialCenterY;
        filtered.fillGradientRadialCorners = batchConfig.fillGradientRadialCorners;
        filtered.fillGradientRadialMidpoints = batchConfig.fillGradientRadialMidpoints;
        filtered.fillGradientRadialSelectionMode = batchConfig.fillGradientRadialSelectionMode;
        filtered.fillGradientRadialShape = batchConfig.fillGradientRadialShape;
        filtered.fillGradientRadialCircleProbability = batchConfig.fillGradientRadialCircleProbability;
        filtered.fillGradientRadialEllipseProbability = batchConfig.fillGradientRadialEllipseProbability;
        filtered.fillGradientMatchShape = batchConfig.fillGradientMatchShape;
        filtered.fillGradientConicCenter = batchConfig.fillGradientConicCenter;
        filtered.fillGradientConicCenterX = batchConfig.fillGradientConicCenterX;
        filtered.fillGradientConicCenterY = batchConfig.fillGradientConicCenterY;
        filtered.fillGradientConicAngle = batchConfig.fillGradientConicAngle;
      }

      // Fill Opacity Settings - only include relevant properties based on mode
      const fillOpacityProps = filterModeBasedProperties(batchConfig, 'fillOpacity', batchConfig.fillOpacityMode);
      Object.assign(filtered, fillOpacityProps);
    }

    // Blur Properties
    if (batchConfig.blurEnabled) {
      filtered.blurEnabled = true;
      filtered.blurProbability = batchConfig.blurProbability;
      
      // Only include blur properties relevant to the mode
      const blurProps = filterModeBasedProperties(batchConfig, 'blur', batchConfig.blurMode);
      Object.assign(filtered, blurProps);
    }

    // Stroke Properties
    if (batchConfig.strokeEnabled) {
      filtered.strokeEnabled = true;
      filtered.strokeProbability = batchConfig.strokeProbability;
      
      // Stroke Color - only include relevant properties based on mode
      const strokeColorProps = filterModeBasedProperties(batchConfig, 'strokeColor', batchConfig.strokeColorMode);
      Object.assign(filtered, strokeColorProps);
      
      if (batchConfig.strokeColorMode === 'range') {
        filtered.strokeColorRangeFlip = batchConfig.strokeColorRangeFlip;
      }
      
      // Stroke Opacity - only include relevant properties based on mode
      const strokeOpacityProps = filterModeBasedProperties(batchConfig, 'strokeOpacity', batchConfig.strokeOpacityMode);
      Object.assign(filtered, strokeOpacityProps);
      
      // Stroke Width - only include relevant properties based on mode
      const strokeWidthProps = filterModeBasedProperties(batchConfig, 'strokeWidth', batchConfig.strokeWidthMode);
      Object.assign(filtered, strokeWidthProps);
    }

    // Polygon Properties
    if (batchConfig.polygonPropertiesEnabled) {
      filtered.polygonPropertiesEnabled = true;
      filtered.segmentCountMode = batchConfig.segmentCountMode;
      filtered.segmentCountRange = batchConfig.segmentCountRange;
      filtered.segmentCountDefine = batchConfig.segmentCountDefine;
      filtered.segmentCountStartValue = batchConfig.segmentCountStartValue;
      filtered.segmentCountIncrement = batchConfig.segmentCountIncrement;
      filtered.segmentCountModulationEnabled = batchConfig.segmentCountModulationEnabled;
      filtered.segmentCountModulationValue = batchConfig.segmentCountModulationValue;
    }

    // Line Properties
    if (batchConfig.linePropertiesEnabled) {
      filtered.linePropertiesEnabled = true;
      filtered.pointCountMode = batchConfig.pointCountMode;
      filtered.pointCountRange = batchConfig.pointCountRange;
      filtered.pointCountDefine = batchConfig.pointCountDefine;
      filtered.pointCountStartValue = batchConfig.pointCountStartValue;
      filtered.pointCountIncrement = batchConfig.pointCountIncrement;
      filtered.pointCountModulationEnabled = batchConfig.pointCountModulationEnabled;
      filtered.pointCountModulationValue = batchConfig.pointCountModulationValue;
      filtered.pointPositionMode = batchConfig.pointPositionMode;
      filtered.pointPositionRange = batchConfig.pointPositionRange;
      filtered.pointPositionDefine = batchConfig.pointPositionDefine;
      filtered.pointPositionStartValue = batchConfig.pointPositionStartValue;
      filtered.pointPositionIncrement = batchConfig.pointPositionIncrement;
      filtered.pointPositionModulationEnabled = batchConfig.pointPositionModulationEnabled;
      filtered.pointPositionModulationValue = batchConfig.pointPositionModulationValue;
    }

    // Spline Curve Properties
    if (batchConfig.splinePropertiesEnabled) {
      filtered.splinePropertiesEnabled = true;
      filtered.splinePointCountMode = batchConfig.splinePointCountMode;
      filtered.splinePointCountRange = batchConfig.splinePointCountRange;
      filtered.splinePointCountDefine = batchConfig.splinePointCountDefine;
      filtered.splinePointCountStartValue = batchConfig.splinePointCountStartValue;
      filtered.splinePointCountIncrement = batchConfig.splinePointCountIncrement;
      filtered.splinePointCountModulationEnabled = batchConfig.splinePointCountModulationEnabled;
      filtered.splinePointCountModulationValue = batchConfig.splinePointCountModulationValue;
      filtered.splinePointPositionMode = batchConfig.splinePointPositionMode;
      filtered.splinePointPositionRange = batchConfig.splinePointPositionRange;
      filtered.splinePointPositionDefine = batchConfig.splinePointPositionDefine;
      filtered.splinePointPositionStartValue = batchConfig.splinePointPositionStartValue;
      filtered.splinePointPositionIncrement = batchConfig.splinePointPositionIncrement;
      filtered.splinePointPositionModulationEnabled = batchConfig.splinePointPositionModulationEnabled;
      filtered.splinePointPositionModulationValue = batchConfig.splinePointPositionModulationValue;
      filtered.splineControlPointMode = batchConfig.splineControlPointMode;
      filtered.splineControlPointRange = batchConfig.splineControlPointRange;
      filtered.splineControlPointDefine = batchConfig.splineControlPointDefine;
      filtered.splineControlPointStartValue = batchConfig.splineControlPointStartValue;
      filtered.splineControlPointIncrement = batchConfig.splineControlPointIncrement;
      filtered.splineControlPointModulationEnabled = batchConfig.splineControlPointModulationEnabled;
      filtered.splineControlPointModulationValue = batchConfig.splineControlPointModulationValue;
    }
  }

  // Transforms Section
  if (batchConfig.transformsEnabled) {
    filtered.transformsEnabled = true;
    filtered.translateXRange = batchConfig.translateXRange;
    filtered.translateYRange = batchConfig.translateYRange;
    filtered.scaleUniform = batchConfig.scaleUniform;
    filtered.scaleRange = batchConfig.scaleRange;
    filtered.scaleXRange = batchConfig.scaleXRange;
    filtered.scaleYRange = batchConfig.scaleYRange;
    filtered.rotationRange = batchConfig.rotationRange;
    filtered.skewXRange = batchConfig.skewXRange;
    filtered.skewYRange = batchConfig.skewYRange;
    filtered.xTransformMode = batchConfig.xTransformMode;
    filtered.yTransformMode = batchConfig.yTransformMode;
    filtered.xTransformValue = batchConfig.xTransformValue;
    filtered.yTransformValue = batchConfig.yTransformValue;
    filtered.xTransformIncrement = batchConfig.xTransformIncrement;
    filtered.yTransformIncrement = batchConfig.yTransformIncrement;
    filtered.xTransformStartValue = batchConfig.xTransformStartValue;
    filtered.yTransformStartValue = batchConfig.yTransformStartValue;
    filtered.xTransformModulationEnabled = batchConfig.xTransformModulationEnabled;
    filtered.xTransformModulationValue = batchConfig.xTransformModulationValue;
    filtered.yTransformModulationEnabled = batchConfig.yTransformModulationEnabled;
    filtered.yTransformModulationValue = batchConfig.yTransformModulationValue;
    
    // Position Alignment
    if (batchConfig.xTransformMode === 'align') {
      filtered.xShapeAnchorMode = batchConfig.xShapeAnchorMode;
      filtered.xShapeAnchorPredefined = batchConfig.xShapeAnchorPredefined;
      filtered.xShapeAnchorDefine = batchConfig.xShapeAnchorDefine;
      filtered.xArtboardAnchorMode = batchConfig.xArtboardAnchorMode;
      filtered.xArtboardAnchorPredefined = batchConfig.xArtboardAnchorPredefined;
      filtered.xArtboardAnchorDefine = batchConfig.xArtboardAnchorDefine;
    }
    if (batchConfig.yTransformMode === 'align') {
      filtered.yShapeAnchorMode = batchConfig.yShapeAnchorMode;
      filtered.yShapeAnchorPredefined = batchConfig.yShapeAnchorPredefined;
      filtered.yShapeAnchorDefine = batchConfig.yShapeAnchorDefine;
      filtered.yArtboardAnchorMode = batchConfig.yArtboardAnchorMode;
      filtered.yArtboardAnchorPredefined = batchConfig.yArtboardAnchorPredefined;
      filtered.yArtboardAnchorDefine = batchConfig.yArtboardAnchorDefine;
    }

    // Scale Enhanced Modes
    filtered.scaleXMode = batchConfig.scaleXMode;
    filtered.scaleYMode = batchConfig.scaleYMode;
    filtered.scaleXValue = batchConfig.scaleXValue;
    filtered.scaleYValue = batchConfig.scaleYValue;
    filtered.scaleXIncrement = batchConfig.scaleXIncrement;
    filtered.scaleYIncrement = batchConfig.scaleYIncrement;
    filtered.scaleXStartValue = batchConfig.scaleXStartValue;
    filtered.scaleYStartValue = batchConfig.scaleYStartValue;
    filtered.scaleXModulationEnabled = batchConfig.scaleXModulationEnabled;
    filtered.scaleXModulationValue = batchConfig.scaleXModulationValue;
    filtered.scaleYModulationEnabled = batchConfig.scaleYModulationEnabled;
    filtered.scaleYModulationValue = batchConfig.scaleYModulationValue;
    filtered.maintainScaleAspectRatio = batchConfig.maintainScaleAspectRatio;

    // Rotation Enhanced Mode
    filtered.rotationMode = batchConfig.rotationMode;
    filtered.rotationValue = batchConfig.rotationValue;
    filtered.rotationIncrement = batchConfig.rotationIncrement;
    filtered.rotationModulation = batchConfig.rotationModulation;
    filtered.rotationModulationEnabled = batchConfig.rotationModulationEnabled;

    // Transform Randomization Scaling
    filtered.scaleRandomizationScale = batchConfig.scaleRandomizationScale;
    filtered.rotationRandomizationScale = batchConfig.rotationRandomizationScale;
    filtered.widthRandomizationScale = batchConfig.widthRandomizationScale;
    filtered.heightRandomizationScale = batchConfig.heightRandomizationScale;

    // Transform Origin
    filtered.transformOriginMode = batchConfig.transformOriginMode;
    filtered.transformOriginX = batchConfig.transformOriginX;
    filtered.transformOriginY = batchConfig.transformOriginY;
    filtered.transformOriginPredefined = batchConfig.transformOriginPredefined;
  }

  // Shape Effects Section
  if (batchConfig.shapeEffectsEnabled) {
    filtered.shapeEffectsEnabled = true;
  }

  // Color Harmony Section
  if (batchConfig.colorHarmonyEnabled) {
    filtered.colorHarmonyEnabled = true;
    filtered.harmonyType = batchConfig.harmonyType;
    filtered.baseColor = batchConfig.baseColor;
    filtered.hueVariance = batchConfig.hueVariance;
    filtered.saturationRange = batchConfig.saturationRange;
    filtered.lightnessRange = batchConfig.lightnessRange;
    
    // Harmony-specific settings
    if (batchConfig.harmonyType === 'monochromatic') {
      filtered.monochromaticSettings = batchConfig.monochromaticSettings;
    }
    if (batchConfig.harmonyType === 'analogous') {
      filtered.analogousSettings = batchConfig.analogousSettings;
    }
    if (batchConfig.harmonyType === 'complementary') {
      filtered.complementarySettings = batchConfig.complementarySettings;
    }
    if (batchConfig.harmonyType === 'triadic') {
      filtered.triadicSettings = batchConfig.triadicSettings;
    }
    if (batchConfig.harmonyType === 'split-complementary') {
      filtered.splitComplementarySettings = batchConfig.splitComplementarySettings;
    }
    if (batchConfig.harmonyType === 'tetradic') {
      filtered.tetradicSettings = batchConfig.tetradicSettings;
    }
  }

  // Physics Simulation
  if (batchConfig.physicsEnabled) {
    filtered.physicsEnabled = true;
    filtered.physicsType = batchConfig.physicsType;
    filtered.gravityDirection = batchConfig.gravityDirection;
    filtered.gravityStrength = batchConfig.gravityStrength;
    filtered.magneticType = batchConfig.magneticType;
    filtered.magneticStrength = batchConfig.magneticStrength;
    filtered.collisionDistance = batchConfig.collisionDistance;
    filtered.collisionBounce = batchConfig.collisionBounce;
    filtered.simulationSteps = batchConfig.simulationSteps;
  }

  // Temporal Variation
  if (batchConfig.temporalEnabled) {
    filtered.temporalEnabled = batchConfig.temporalEnabled;
    filtered.evolutionMode = batchConfig.evolutionMode;
    filtered.seedIncrement = batchConfig.seedIncrement;
    filtered.evolutionTargets = batchConfig.evolutionTargets;
  }

  return filtered;
}

// Helper function to filter Set Manager settings (only include if different from defaults)
function filterSetManagerSettings(set: GenerationSet): any {
  const result: any = {};
  
  // Default values for Set Manager settings
  const defaults = {
    setVisibility: { visible: true, opacity: 1.0, opacityVariance: 0.0 },
    setBlendMode: 'source-over',
    compositingOperation: 'source-over',
    setTransform: { x: 0, y: 0, rotation: 0, scaleX: 1.0, scaleY: 1.0, transformOrigin: 'center' },
    artboardAlignment: { fitToArtboard: false, alignTo: 'none', alignmentType: 'center', margin: 0 },
  };
  
  // Only include if different from default
  if (JSON.stringify(set.setVisibility) !== JSON.stringify(defaults.setVisibility)) {
    result.setVisibility = set.setVisibility;
  }
  if (set.setBlendMode !== defaults.setBlendMode) {
    result.setBlendMode = set.setBlendMode;
  }
  if (set.compositingOperation !== defaults.compositingOperation) {
    result.compositingOperation = set.compositingOperation;
  }
  if (JSON.stringify(set.setTransform) !== JSON.stringify(defaults.setTransform)) {
    result.setTransform = set.setTransform;
  }
  if (JSON.stringify(set.artboardAlignment) !== JSON.stringify(defaults.artboardAlignment)) {
    result.artboardAlignment = set.artboardAlignment;
  }
  
  // Always include zIndexConfig and generationOrder (needed for rendering)
  result.zIndexConfig = set.zIndexConfig;
  result.generationOrder = set.generationOrder;
  
  return result;
}

// Helper function to filter a GenerationSet to only include enabled data
function filterEnabledGenerationSet(set: GenerationSet): any {
  const filtered: any = {
    id: set.id,
    name: set.name,
    enabled: set.enabled,
    
    // Shape Types Data
    enabledShapeTypes: set.enabledShapeTypes,
    shapeCountMode: set.shapeCountMode,
    shapeCountFixed: set.shapeCountFixed,
    shapeCountRange: set.shapeCountRange,
    
    // Only include shape-specific properties for enabled shape types
    shapeSpecificProperties: filterShapeSpecificProperties(
      set.shapeSpecificProperties,
      set.enabledShapeTypes
    ),
    
    // Generation Configuration Settings (filtered to only enabled sections)
    batchConfig: filterEnabledBatchConfig(set.batchConfig, set.enabledShapeTypes),
  };
  
  // Add Set Manager settings (only if different from defaults)
  const setManagerSettings = filterSetManagerSettings(set);
  Object.assign(filtered, setManagerSettings);
  
  // Add description if present
  if (set.description) {
    filtered.description = set.description;
  }
  
  return filtered;
}

// Request schema for /api/live/sets/enabled
const LiveSetsEnabledRequestSchema = z.object({
  userId: z.string().optional(), // Optional - will use session user if not provided
});

// Response type for /api/live/sets/enabled
interface LiveSetsEnabledResponse {
  success: boolean;
  data: {
    generationSets: any[]; // Filtered enabled generation sets
    currentSetId: string | null;
    exportSettings: {
      format: string;
      quality: number;
      scale: number;
      mode: string;
    };
    artboardSettings: {
      width: number;
      height: number;
      backgroundColor: string;
      displayGrid: boolean;
      displayBorder: boolean;
    };
    batchExportSettings: {
      enabled: boolean;
      count: number;
      saveProjectFiles: boolean;
      packageAsZip: boolean;
      edgeCaseStrategy: string;
      generationSetsEnabled: boolean;
      generationCountMode: string;
    };
  };
  error?: string;
}

export function setupLiveApiRoutes(app: Express, storage: DatabaseStorage) {
  
  // POST /api/live/sets/enabled - Get only enabled generation sets with filtered batch configs
  app.post('/api/live/sets/enabled', async (req, res) => {
    try {
      // Validate API key
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid or missing API key' 
        });
      }

      // Get user ID from request body or session
      // NOTE: For production use, implement proper API key -> userId mapping
      // Currently accepts userId from request body for development/testing
      // TODO: Add API key -> userId validation to prevent unauthorized access
      const userId = req.body.userId || (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: 'User ID required. Provide userId in request body or authenticate via session.' 
        });
      }

      // Load user preferences
      const preferences = await storage.getUserPreferences(userId);
      if (!preferences) {
        return res.status(404).json({ 
          success: false, 
          error: 'User preferences not found' 
        });
      }

      // Load generation sets
      const { generationSets, currentSetId } = await storage.loadUserGenerationSets(userId);

      // Filter to only enabled sets and strip disabled batch config sections
      const filteredSets = generationSets
        .filter(set => set.enabled)
        .map(set => filterEnabledGenerationSet(set));

      // Parse JSONB fields
      const exportSettings = (preferences.exportSettings as any) || {};
      const appDefaults = (preferences.appSettingsDefaults as any) || {};

      // Build response with all app settings
      const response: LiveSetsEnabledResponse = {
        success: true,
        data: {
          generationSets: filteredSets,
          currentSetId: currentSetId || null,
          exportSettings: {
            format: appDefaults.exportFormat || 'png',
            quality: appDefaults.exportQuality || 90,
            scale: appDefaults.exportScale || 1,
            mode: appDefaults.exportMode || 'all',
          },
          artboardSettings: {
            width: appDefaults.artboardWidth || 400,
            height: appDefaults.artboardHeight || 400,
            backgroundColor: appDefaults.artboardBackgroundColor || '#ffffff',
            displayGrid: appDefaults.artboardDisplayGrid || false,
            displayBorder: appDefaults.artboardDisplayBorder || true,
          },
          batchExportSettings: {
            enabled: exportSettings.exportBatchModeEnabled || false,
            count: exportSettings.batchExportCount || 10,
            saveProjectFiles: exportSettings.exportSaveProjectFiles || false,
            packageAsZip: exportSettings.packageAsZip || false,
            edgeCaseStrategy: exportSettings.edgeCaseStrategy || 'cycle',
            generationSetsEnabled: exportSettings.generationSetsEnabled || false,
            generationCountMode: exportSettings.generationCountMode || 'fixed',
          },
        },
      };

      res.json(response);
      
    } catch (error) {
      console.error('Error in /api/live/sets/enabled:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve enabled generation sets',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // POST /api/live/sets/execute - Execute generation using configuration from /api/live/sets/enabled
  app.post('/api/live/sets/execute', async (req, res) => {
    try {
      // Validate API key
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid or missing API key' 
        });
      }

      // Extract configuration from request body (should be the output from /api/live/sets/enabled)
      const { data } = req.body;
      if (!data) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing configuration data. Please provide the output from /api/live/sets/enabled endpoint.' 
        });
      }

      const { generationSets, exportSettings, artboardSettings, batchExportSettings } = data;

      // Validate required fields
      if (!generationSets || !Array.isArray(generationSets) || generationSets.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'No generation sets provided. At least one enabled generation set is required.' 
        });
      }

      if (!exportSettings || !artboardSettings || !batchExportSettings) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required settings. Please provide exportSettings, artboardSettings, and batchExportSettings.' 
        });
      }

      // Import export service
      const { ExportService } = await import('../services/exportService');
      const exportService = new ExportService();

      // Build canvas settings from artboard settings
      const canvasSettings = {
        width: artboardSettings.width || 400,
        height: artboardSettings.height || 400,
        zoom: 1,
        panX: 0,
        panY: 0,
        backgroundColor: artboardSettings.backgroundColor || '#ffffff',
        showGrid: artboardSettings.displayGrid || false
      };

      // Shape generation function
      // NOTE: This is currently a placeholder. To generate actual shapes server-side:
      // 1. Port the shape generation logic from client/src/lib/shapeGenerators.ts to server
      // 2. Use the generationSets[].enabledShapeTypes and batchConfig to generate shapes
      // 3. Apply transforms, effects, and set-level operations from generationSets[].setTransform
      // For now, this returns empty shapes which means the export will be blank
      const mockGenerateShapes = (config: any) => {
        // TODO: Implement server-side shape generation using the provided generation sets
        return { shapes: [], groups: [] };
      };

      // Build export settings
      const exportConfig = {
        format: exportSettings.format || 'png',
        quality: (exportSettings.quality || 90) / 100,
        scale: exportSettings.scale || 1,
        scope: exportSettings.mode || 'all',
        includeBackground: true,
        backgroundColor: artboardSettings.backgroundColor || '#ffffff',
        batchExportCount: batchExportSettings.count || 10,
        batchSaveProjectFiles: batchExportSettings.saveProjectFiles || false,
        packageAsZip: batchExportSettings.packageAsZip || false,
        exportAllImages: true,
        selectedImageIndices: []
      };

      // Process all enabled generation sets
      // TODO: Currently only using the first set - need to iterate through all sets
      // and combine their shapes for proper multi-set generation
      const firstSet = generationSets[0];
      const enabledShapeTypes = new Set<string>(firstSet.enabledShapeTypes || []);
      const batchConfig = firstSet.batchConfig || {
        selectedPreset: 'none',
        distributionLayoutEnabled: false,
        propertiesEnabled: false
      };

      const result = await exportService.startBatchExport(
        [], // shapes - empty until server-side generation is implemented
        [], // groups - empty until server-side generation is implemented
        canvasSettings,
        batchConfig as any,
        enabledShapeTypes,
        exportConfig,
        mockGenerateShapes
      );

      // Return response with exportId for polling status
      res.json({
        success: true,
        data: {
          exportId: result.exportId,
          message: 'Export job created. Note: Server-side shape generation is not yet implemented, so exports will be blank. Poll /api/export/status/:exportId to check status.',
          statusEndpoint: `/api/export/status/${result.exportId}`,
          setsConfigured: generationSets.length,
          setsProcessed: 1, // Currently only processing first set
          config: {
            exportFormat: exportSettings.format,
            batchCount: batchExportSettings.count,
            artboardSize: `${artboardSettings.width}x${artboardSettings.height}`,
            note: 'Shape generation logic needs to be ported from client to server for actual image generation'
          }
        }
      });
      
    } catch (error) {
      console.error('Error in /api/live/sets/execute:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to execute generation',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
