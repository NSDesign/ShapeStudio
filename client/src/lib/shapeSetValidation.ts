import { 
  ShapeSet, 
  EnhancedBatchConfig, 
  ShapeSetMode,
  ShapeCountMode,
  DEFAULT_SHAPE_SET_LIMITS,
  ShapeSetUtils
} from '@shared/schema';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ShapeSetValidationResult extends ValidationResult {
  setSpecificErrors: { [setId: string]: string[] };
}

/**
 * Validates individual shape set configuration
 */
export function validateShapeSet(shapeSet: ShapeSet): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate basic information
  if (!shapeSet.name?.trim()) {
    errors.push('Set name is required');
  }

  if (shapeSet.name && shapeSet.name.length > 50) {
    warnings.push('Set name is quite long, consider shortening it');
  }

  if (shapeSet.description && shapeSet.description.length > 200) {
    warnings.push('Set description is quite long, consider shortening it');
  }

  // Validate shape types
  if (!shapeSet.enabledShapeTypes || shapeSet.enabledShapeTypes.length === 0) {
    errors.push('At least one shape type must be selected');
  }

  if (shapeSet.enabledShapeTypes && shapeSet.enabledShapeTypes.length > 15) {
    warnings.push('Many shape types selected - this may reduce performance');
  }

  // Validate shape count
  if (shapeSet.shapeCountMode === ShapeCountMode.FIXED) {
    const count = shapeSet.shapeCountFixed;
    if (count < DEFAULT_SHAPE_SET_LIMITS.minShapesPerSet) {
      errors.push(`Shape count must be at least ${DEFAULT_SHAPE_SET_LIMITS.minShapesPerSet}`);
    }
    if (count > DEFAULT_SHAPE_SET_LIMITS.maxShapesPerSet) {
      errors.push(`Shape count cannot exceed ${DEFAULT_SHAPE_SET_LIMITS.maxShapesPerSet}`);
    }
    if (count > 100) {
      warnings.push('High shape count may impact performance');
    }
  } else if (shapeSet.shapeCountMode === ShapeCountMode.RANGE) {
    const [min, max] = shapeSet.shapeCountRange;
    
    if (min < DEFAULT_SHAPE_SET_LIMITS.minShapesPerSet) {
      errors.push(`Minimum shape count must be at least ${DEFAULT_SHAPE_SET_LIMITS.minShapesPerSet}`);
    }
    if (max > DEFAULT_SHAPE_SET_LIMITS.maxShapesPerSet) {
      errors.push(`Maximum shape count cannot exceed ${DEFAULT_SHAPE_SET_LIMITS.maxShapesPerSet}`);
    }
    if (min > max) {
      errors.push('Minimum shape count cannot be greater than maximum');
    }
    if (max > 100) {
      warnings.push('High maximum shape count may impact performance');
    }
  }

  // Validate z-index configuration
  if (shapeSet.zIndexConfig) {
    const { baseOffset, incrementPerShape, incrementPerGeneration } = shapeSet.zIndexConfig;
    
    if (baseOffset < 0) {
      errors.push('Base z-index offset cannot be negative');
    }
    if (incrementPerShape < 0) {
      errors.push('Z-index increment per shape cannot be negative');
    }
    if (incrementPerGeneration < 0) {
      errors.push('Z-index increment per generation cannot be negative');
    }
    
    // Check for potential z-index overflow
    const maxShapes = shapeSet.shapeCountMode === ShapeCountMode.FIXED 
      ? shapeSet.shapeCountFixed 
      : shapeSet.shapeCountRange[1];
      
    const maxZIndex = baseOffset + (maxShapes * incrementPerShape) + (incrementPerGeneration * 10); // Assume max 10 generations
    if (maxZIndex > 999999) {
      warnings.push('Z-index values may become very large - consider reducing increments');
    }
  }

  // Validate shape-specific properties
  if (shapeSet.shapeSpecificProperties) {
    for (const [shapeType, properties] of Object.entries(shapeSet.shapeSpecificProperties)) {
      if (!shapeSet.enabledShapeTypes.includes(shapeType as any)) {
        warnings.push(`Shape-specific properties defined for disabled shape type: ${shapeType}`);
      }

      if (properties) {
        // Validate corner radius for rounded shapes
        if (('cornerRadiusRange' in properties) && properties.cornerRadiusRange) {
          const [min, max] = properties.cornerRadiusRange;
          if (min < 0 || max < 0) {
            errors.push(`Corner radius values cannot be negative for ${shapeType}`);
          }
          if (min > max) {
            errors.push(`Corner radius minimum cannot be greater than maximum for ${shapeType}`);
          }
        }

        // Validate point count for polygons and stars
        if (('pointCountRange' in properties) && properties.pointCountRange) {
          const [min, max] = properties.pointCountRange;
          if (min < 3) {
            errors.push(`Point count minimum must be at least 3 for ${shapeType}`);
          }
          if (min > max) {
            errors.push(`Point count minimum cannot be greater than maximum for ${shapeType}`);
          }
        }

        // Validate inner radius for rings and stars
        if (('innerRadiusRange' in properties) && properties.innerRadiusRange) {
          const [min, max] = properties.innerRadiusRange;
          if (min < 0 || max < 0) {
            errors.push(`Inner radius values cannot be negative for ${shapeType}`);
          }
          if (min >= 1 || max >= 1) {
            errors.push(`Inner radius values must be less than 1.0 for ${shapeType}`);
          }
          if (min > max) {
            errors.push(`Inner radius minimum cannot be greater than maximum for ${shapeType}`);
          }
        }
      }
    }
  }

  // Validate set visibility
  if (shapeSet.setVisibility) {
    const { opacity } = shapeSet.setVisibility;
    
    if (opacity < 0 || opacity > 1) {
      errors.push('Set opacity must be between 0 and 1');
    }
    
    if (opacity < 0.1) {
      warnings.push('Very low set opacity may make shapes nearly invisible');
    }
  }

  // Validate set transforms
  if (shapeSet.setTransform) {
    const { x, y, rotation, scaleX, scaleY } = shapeSet.setTransform;
    
    // Position validation
    if (Math.abs(x) > 5000 || Math.abs(y) > 5000) {
      warnings.push('Extreme set position values may move shapes outside visible area');
    }
    
    // Rotation validation
    if (Math.abs(rotation) > 360) {
      warnings.push('Set rotation values beyond ±360° are excessive');
    }
    
    // Scale validation
    if (scaleX <= 0 || scaleY <= 0) {
      errors.push('Set scale values must be positive');
    }
    
    if (scaleX < 0.01 || scaleY < 0.01) {
      warnings.push('Very small set scale values may make shapes invisible');
    }
    
    if (scaleX > 10 || scaleY > 10) {
      warnings.push('Very large set scale values may cause performance issues');
    }
    
    if (Math.abs(scaleX - scaleY) > 5) {
      warnings.push('Extreme difference between X and Y scale may cause distortion');
    }
  }

  // Validate artboard alignment
  if (shapeSet.artboardAlignment) {
    const { alignTo, targetSetId, margin } = shapeSet.artboardAlignment;
    
    // Validate target set ID when aligning to another set
    if (alignTo === 'set') {
      if (!targetSetId || targetSetId.trim() === '') {
        errors.push('Target set ID is required when aligning to another set');
      }
      
      if (targetSetId === shapeSet.id) {
        errors.push('Cannot align a set to itself');
      }
    }
    
    // Validate margin
    if (margin < 0) {
      errors.push('Alignment margin cannot be negative');
    }
    
    if (margin > 500) {
      warnings.push('Large alignment margin may cause unexpected positioning');
    }
  }

  // Validate blend mode and compositing (enum validation handled by TypeScript)
  // Additional performance warnings for complex blend modes
  if (shapeSet.setBlendMode && shapeSet.setBlendMode !== 'source-over') {
    warnings.push('Non-standard blend modes may impact rendering performance');
  }
  
  if (shapeSet.compositingOperation && shapeSet.compositingOperation !== 'source-over') {
    warnings.push('Advanced compositing operations may impact rendering performance');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates the entire shape sets configuration
 */
export function validateShapeSets(
  shapeSets: ShapeSet[], 
  enhancedConfig?: EnhancedBatchConfig
): ShapeSetValidationResult {
  const globalErrors: string[] = [];
  const globalWarnings: string[] = [];
  const setSpecificErrors: { [setId: string]: string[] } = {};

  // Validate global constraints
  // Note: Allow 0 sets for cases where shape sets feature is optional
  // if (shapeSets.length === 0) {
  //   globalErrors.push('At least one shape set is required');
  // }

  if (shapeSets.length > DEFAULT_SHAPE_SET_LIMITS.maxShapeSets) {
    globalErrors.push(`Cannot have more than ${DEFAULT_SHAPE_SET_LIMITS.maxShapeSets} shape sets`);
  }

  // Check for enabled sets
  const enabledSets = shapeSets.filter(set => set.enabled);
  // Allow no enabled sets when shape sets feature is optional
  // if (enabledSets.length === 0 && shapeSets.length > 0) {
  //   globalErrors.push('At least one shape set must be enabled');
  // }

  // Validate mode-specific constraints
  if (enhancedConfig?.mode === ShapeSetMode.MULTI && enhancedConfig.modeRestrictions) {
    const { multiGenerationOnlyForFixedCount } = enhancedConfig.modeRestrictions;
    
    if (multiGenerationOnlyForFixedCount) {
      const hasVariableCount = enabledSets.some(set => set.shapeCountMode !== ShapeCountMode.FIXED);
      if (hasVariableCount) {
        globalErrors.push('Multi-generation mode requires fixed shape count for all enabled sets');
      }
    }
  }

  // Validate individual sets
  for (const set of shapeSets) {
    const setValidation = validateShapeSet(set);
    if (!setValidation.isValid) {
      setSpecificErrors[set.id] = setValidation.errors;
    }
    
    // Collect warnings as global warnings with set context
    if (setValidation.warnings.length > 0) {
      globalWarnings.push(...setValidation.warnings.map(w => `${set.name}: ${w}`));
    }
  }

  // Validate unique names
  const names = shapeSets.map(set => set.name.trim().toLowerCase());
  const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
  if (duplicateNames.length > 0) {
    globalErrors.push('Shape set names must be unique');
  }

  // Validate generation order consistency
  const orders = shapeSets.map(set => set.generationOrder);
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== shapeSets.length) {
    globalWarnings.push('Generation order values should be unique - auto-correcting recommended');
  }

  // Check for potential z-index conflicts
  if (!enhancedConfig?.globalSettings?.globalZIndexSettings?.useGlobalSettings) {
    const zIndexRanges = shapeSets.map(set => {
      const [minZ, maxZ] = ShapeSetUtils.calculateZIndexRange(set);
      return { setId: set.id, setName: set.name, minZ, maxZ };
    });

    for (let i = 0; i < zIndexRanges.length; i++) {
      for (let j = i + 1; j < zIndexRanges.length; j++) {
        const rangeA = zIndexRanges[i];
        const rangeB = zIndexRanges[j];
        
        // Check for significant overlap (allow minor edge overlaps)
        const overlapSize = Math.min(rangeA.maxZ, rangeB.maxZ) - Math.max(rangeA.minZ, rangeB.minZ);
        const minRangeSize = Math.min(rangeA.maxZ - rangeA.minZ, rangeB.maxZ - rangeB.minZ);
        const overlapRatio = overlapSize / minRangeSize;
        
        // Only warn about significant overlaps (more than 25% of the smaller range)
        if (overlapSize > 0 && overlapRatio > 0.25) {
          globalWarnings.push(
            `Z-index ranges may overlap between "${rangeA.setName}" and "${rangeB.setName}"`
          );
        }
      }
    }
  }

  // Calculate total estimated shapes
  const totalEstimatedShapes = enabledSets.reduce((total, set) => {
    const count = set.shapeCountMode === ShapeCountMode.FIXED 
      ? set.shapeCountFixed 
      : Math.floor((set.shapeCountRange[0] + set.shapeCountRange[1]) / 2);
    return total + count;
  }, 0);

  if (totalEstimatedShapes > 500) {
    globalWarnings.push('High total shape count may impact performance and memory usage');
  }

  if (totalEstimatedShapes > 1000) {
    globalErrors.push('Total shape count is extremely high and may cause performance issues');
  }

  return {
    isValid: globalErrors.length === 0 && Object.keys(setSpecificErrors).length === 0,
    errors: globalErrors,
    warnings: globalWarnings,
    setSpecificErrors
  };
}

/**
 * Auto-fix common issues in shape sets
 */
export function autoFixShapeSets(shapeSets: ShapeSet[]): ShapeSet[] {
  return shapeSets.map((set, index) => ({
    ...set,
    // Fix generation order
    generationOrder: index,
    // Ensure name is not empty
    name: set.name.trim() || `Shape Set ${index + 1}`,
    // Ensure at least one shape type is enabled
    enabledShapeTypes: set.enabledShapeTypes.length > 0 ? set.enabledShapeTypes : ['rectangle'],
    // Fix shape count ranges
    shapeCountRange: set.shapeCountMode === ShapeCountMode.RANGE 
      ? [
          Math.max(DEFAULT_SHAPE_SET_LIMITS.minShapesPerSet, Math.min(set.shapeCountRange[0], set.shapeCountRange[1])),
          Math.min(DEFAULT_SHAPE_SET_LIMITS.maxShapesPerSet, Math.max(set.shapeCountRange[0], set.shapeCountRange[1]))
        ] as [number, number]
      : set.shapeCountRange,
    // Fix fixed shape count
    shapeCountFixed: set.shapeCountMode === ShapeCountMode.FIXED
      ? Math.max(
          DEFAULT_SHAPE_SET_LIMITS.minShapesPerSet,
          Math.min(DEFAULT_SHAPE_SET_LIMITS.maxShapesPerSet, set.shapeCountFixed)
        )
      : set.shapeCountFixed
  }));
}

/**
 * Generate a summary of the current shape sets configuration
 */
export function generateShapeSetsSummary(shapeSets: ShapeSet[]): {
  totalSets: number;
  enabledSets: number;
  totalShapeTypes: number;
  estimatedShapes: number;
  zIndexRange: [number, number];
} {
  const enabledSets = shapeSets.filter(set => set.enabled);
  const allShapeTypes = new Set<string>();
  
  enabledSets.forEach(set => {
    set.enabledShapeTypes.forEach(type => allShapeTypes.add(type));
  });

  const estimatedShapes = enabledSets.reduce((total, set) => {
    const count = set.shapeCountMode === ShapeCountMode.FIXED 
      ? set.shapeCountFixed 
      : Math.floor((set.shapeCountRange[0] + set.shapeCountRange[1]) / 2);
    return total + count;
  }, 0);

  // Calculate overall z-index range
  let minZ = Infinity;
  let maxZ = -Infinity;
  
  enabledSets.forEach(set => {
    const [setMinZ, setMaxZ] = ShapeSetUtils.calculateZIndexRange(set);
    minZ = Math.min(minZ, setMinZ);
    maxZ = Math.max(maxZ, setMaxZ);
  });

  if (minZ === Infinity) {
    minZ = 0;
    maxZ = 0;
  }

  return {
    totalSets: shapeSets.length,
    enabledSets: enabledSets.length,
    totalShapeTypes: allShapeTypes.size,
    estimatedShapes,
    zIndexRange: [minZ, maxZ]
  };
}