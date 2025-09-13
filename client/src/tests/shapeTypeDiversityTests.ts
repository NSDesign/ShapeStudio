/**
 * Shape Type Diversity Tests
 * 
 * Tests combinations of different shape types, their properties,
 * and visual effects across generation sets
 */

import { 
  EnhancedBatchConfig, 
  GenerationSet, 
  GenerationSetMode, 
  ShapeCountMode,
  SupportedShapeType,
  ShapeSpecificProperties,
  GenerationSetUtils,
  defaultBatchConfigSettings,
  SUPPORTED_SHAPE_TYPES,
  BLEND_MODES
} from '@shared/schema';
import { 
  validateGenerationSets
} from '@/lib/generationSetValidation';

export interface ShapeTypeDiversityTest {
  name: string;
  description: string;
  generationSets: GenerationSet[];
  expectedShapeTypes: SupportedShapeType[];
  expectedPropertiesUsed: string[];
  expectedBlendModes: string[];
  complexity: 'simple' | 'medium' | 'complex';
}

export interface ShapeTypeDiversityResult {
  testName: string;
  passed: boolean;
  shapeTypeCoverage: {
    expectedCount: number;
    actualCount: number;
    missingTypes: SupportedShapeType[];
    extraTypes: SupportedShapeType[];
  };
  propertiesVerification: {
    shapeSpecificProperties: string[];
    blendModes: string[];
    gradients: boolean;
    effects: string[];
  };
  errors: any[];
  warnings: any[];
  complexity: 'simple' | 'medium' | 'complex';
}

/**
 * Test 1: Basic Shape Type Coverage
 * Tests fundamental shape types with basic properties
 */
export function createBasicShapeTypeCoverageTest(): ShapeTypeDiversityTest {
  const sets: GenerationSet[] = [
    // Basic geometric shapes
    GenerationSetUtils.createDefault('basic-geo', 'Basic Geometric Shapes'),
    // Advanced shapes
    GenerationSetUtils.createDefault('advanced', 'Advanced Shapes'),
    // Line-based shapes
    GenerationSetUtils.createDefault('lines', 'Line Shapes')
  ];

  sets[0] = {
    ...sets[0],
    enabledShapeTypes: ['rectangle', 'rounded-rectangle', 'circle', 'ellipse', 'triangle'],
    shapeCountMode: ShapeCountMode.FIXED,
    shapeCountFixed: 15,
    shapeSpecificProperties: {
      'rounded-rectangle': {
        cornerRadiusMode: 'range',
        cornerRadiusRange: [5, 25]
      },
      circle: {
        segmentCountRange: [16, 32]
      },
      ellipse: {
        segmentCountRange: [20, 40]
      }
    },
    batchConfig: {
      ...defaultBatchConfigSettings,
      fillEnabled: true,
      fillColorMode: 'palette',
      fillColorPalette: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
    }
  };

  sets[1] = {
    ...sets[1],
    enabledShapeTypes: ['star', 'polygon', 'heart', 'blob', 'chunk'],
    shapeCountMode: ShapeCountMode.RANGE,
    shapeCountRange: [8, 12],
    shapeSpecificProperties: {
      star: {
        pointCountMode: 'range',
        pointCountRange: [5, 8],
        innerRadiusMode: 'range',
        innerRadiusRange: [0.4, 0.7]
      },
      polygon: {
        pointCountMode: 'fixed',
        pointCountValue: 6
      }
    },
    batchConfig: {
      ...defaultBatchConfigSettings,
      blendModeEnabled: true,
      enabledBlendModes: {
        'multiply': 40,
        'screen': 30,
        'overlay': 30
      },
      fillGradientEnabled: true,
      fillGradientLinearProbability: 60,
      fillGradientRadialProbability: 40
    }
  };

  sets[2] = {
    ...sets[2],
    enabledShapeTypes: ['line', 'bezier', 'smooth-spline'],
    shapeCountMode: ShapeCountMode.FIXED,
    shapeCountFixed: 6,
    shapeSpecificProperties: {
      line: {
        pointCountMode: 'range',
        pointCountRange: [3, 8],
        strokeCapProbabilities: {
          round: 50,
          square: 30,
          butt: 20
        }
      },
      bezier: {
        pointCountMode: 'fixed',
        pointCountValue: 4,
        openProbability: 75
      }
    },
    batchConfig: {
      ...defaultBatchConfigSettings,
      strokeEnabled: true,
      strokeProbability: 100,
      strokeWidthMode: 'range',
      strokeWidthRange: [2, 8],
      strokeColorMode: 'range',
      strokeColorRange: ['#2C3E50', '#8E44AD']
    }
  };

  return {
    name: 'Basic Shape Type Coverage',
    description: 'Tests fundamental shape types with basic properties and effects',
    generationSets: sets,
    expectedShapeTypes: [
      'rectangle', 'rounded-rectangle', 'circle', 'ellipse', 'triangle',
      'star', 'polygon', 'heart', 'blob', 'chunk',
      'line', 'bezier', 'smooth-spline'
    ],
    expectedPropertiesUsed: [
      'cornerRadius', 'segmentCount', 'pointCount', 'innerRadius',
      'strokeCap', 'openProbability'
    ],
    expectedBlendModes: ['multiply', 'screen', 'overlay'],
    complexity: 'simple'
  };
}

/**
 * Test 2: Complex Shape Properties
 * Tests advanced shape-specific properties and combinations
 */
export function createComplexShapePropertiesTest(): ShapeTypeDiversityTest {
  const sets: GenerationSet[] = [
    // Rounded shapes with varied corner radius
    GenerationSetUtils.createDefault('rounded', 'Rounded Shapes'),
    // Ring and star variations
    GenerationSetUtils.createDefault('rings-stars', 'Rings and Stars'),
    // Curve shapes with advanced properties
    GenerationSetUtils.createDefault('curves', 'Advanced Curves')
  ];

  sets[0] = {
    ...sets[0],
    enabledShapeTypes: ['rounded-rectangle', 'rounded-square'],
    shapeCountMode: ShapeCountMode.FIXED,
    shapeCountFixed: 10,
    shapeSpecificProperties: {
      'rounded-rectangle': {
        cornerRadiusMode: 'range',
        cornerRadiusRange: [2, 30]
      },
      'rounded-square': {
        cornerRadiusMode: 'fixed',
        cornerRadiusValue: 15
      }
    },
    batchConfig: {
      ...defaultBatchConfigSettings,
      fillGradientEnabled: true,
      fillGradientLinearProbability: 30,
      fillGradientRadialProbability: 40,
      fillGradientConicProbability: 30,
      fillGradientColorMode: 'palette',
      fillGradientColorPalette: ['#667eea', '#764ba2', '#f093fb', '#f5576c']
    }
  };

  sets[1] = {
    ...sets[1],
    enabledShapeTypes: ['ring', 'star'],
    shapeCountMode: ShapeCountMode.RANGE,
    shapeCountRange: [6, 10],
    shapeSpecificProperties: {
      ring: {
        innerRadiusMode: 'range',
        innerRadiusRange: [0.3, 0.8]
      },
      star: {
        pointCountMode: 'range',
        pointCountRange: [3, 12],
        innerRadiusMode: 'range',
        innerRadiusRange: [0.2, 0.9]
      }
    },
    batchConfig: {
      ...defaultBatchConfigSettings,
      blendModeEnabled: true,
      enabledBlendModes: {
        'hard-light': 25,
        'soft-light': 25,
        'difference': 25,
        'exclusion': 25
      },
      strokeEnabled: true,
      strokeProbability: 60,
      strokeWidthRange: [1, 4]
    }
  };

  sets[2] = {
    ...sets[2],
    enabledShapeTypes: ['cubic', 'spline-circle', 'spline-ellipse'],
    shapeCountMode: ShapeCountMode.FIXED,
    shapeCountFixed: 8,
    shapeSpecificProperties: {
      cubic: {
        pointCountMode: 'range',
        pointCountRange: [4, 8],
        curvatureRange: [0.1, 0.9],
        spreadRange: [30, 120],
        patternType: 2
      },
      'spline-circle': {
        segmentCountRange: [12, 24]
      },
      'spline-ellipse': {
        segmentCountRange: [16, 32]
      }
    },
    batchConfig: {
      ...defaultBatchConfigSettings,
      fillOpacityMode: 'range',
      fillOpacityRange: [0.3, 0.8],
      blurEnabled: true,
      blurProbability: 40,
      blurRange: [1, 5]
    }
  };

  return {
    name: 'Complex Shape Properties',
    description: 'Tests advanced shape properties, gradients, and visual effects',
    generationSets: sets,
    expectedShapeTypes: [
      'rounded-rectangle', 'rounded-square', 'ring', 'star',
      'cubic', 'spline-circle', 'spline-ellipse'
    ],
    expectedPropertiesUsed: [
      'cornerRadius', 'innerRadius', 'pointCount', 'curvature',
      'spread', 'patternType', 'segmentCount'
    ],
    expectedBlendModes: ['hard-light', 'soft-light', 'difference', 'exclusion'],
    complexity: 'complex'
  };
}

/**
 * Test 3: Maximum Shape Type Diversity
 * Tests the widest possible range of shape types
 */
export function createMaximumShapeTypeDiversityTest(): ShapeTypeDiversityTest {
  const sets: GenerationSet[] = [
    // Set 1: Basic shapes
    GenerationSetUtils.createDefault('set1', 'Basic Shapes'),
    // Set 2: Geometric shapes  
    GenerationSetUtils.createDefault('set2', 'Geometric Shapes'),
    // Set 3: Organic shapes
    GenerationSetUtils.createDefault('set3', 'Organic Shapes'),
    // Set 4: Line shapes
    GenerationSetUtils.createDefault('set4', 'Line Shapes'),
    // Set 5: Spline shapes
    GenerationSetUtils.createDefault('set5', 'Spline Shapes')
  ];

  // Distribute all available shape types across sets
  const allShapeTypes = SUPPORTED_SHAPE_TYPES;
  const shapesPerSet = Math.ceil(allShapeTypes.length / sets.length);
  
  sets.forEach((set, index) => {
    const startIdx = index * shapesPerSet;
    const endIdx = Math.min(startIdx + shapesPerSet, allShapeTypes.length);
    const shapeTypes = allShapeTypes.slice(startIdx, endIdx);
    
    sets[index] = {
      ...set,
      enabledShapeTypes: shapeTypes,
      shapeCountMode: ShapeCountMode.RANGE,
      shapeCountRange: [3, 8],
      shapeSpecificProperties: createShapeSpecificPropertiesForTypes(shapeTypes),
      batchConfig: {
        ...defaultBatchConfigSettings,
        blendModeEnabled: index % 2 === 0,
        enabledBlendModes: getBlendModesForSet(index),
        fillGradientEnabled: index % 3 === 0,
        fillGradientLinearProbability: 50,
        strokeEnabled: index % 2 === 1,
        strokeProbability: 70
      }
    };
  });

  return {
    name: 'Maximum Shape Type Diversity',
    description: 'Tests the widest possible range of shape types across multiple sets',
    generationSets: sets,
    expectedShapeTypes: allShapeTypes,
    expectedPropertiesUsed: [
      'cornerRadius', 'segmentCount', 'pointCount', 'innerRadius',
      'curvature', 'spread', 'patternType', 'openProbability', 'strokeCap'
    ],
    expectedBlendModes: BLEND_MODES.slice(0, 8), // Use first 8 blend modes
    complexity: 'complex'
  };
}

/**
 * Helper function to create shape-specific properties for given shape types
 */
function createShapeSpecificPropertiesForTypes(shapeTypes: SupportedShapeType[]): ShapeSpecificProperties {
  const properties: ShapeSpecificProperties = {};
  
  shapeTypes.forEach(type => {
    switch (type) {
      case 'rounded-rectangle':
      case 'rounded-square':
        properties[type] = {
          cornerRadiusMode: 'range',
          cornerRadiusRange: [3, 20]
        };
        break;
      case 'circle':
      case 'ellipse':
        properties[type] = {
          segmentCountRange: [16, 32]
        };
        break;
      case 'star':
        properties.star = {
          pointCountMode: 'range',
          pointCountRange: [4, 10],
          innerRadiusMode: 'range',
          innerRadiusRange: [0.3, 0.7]
        };
        break;
      case 'polygon':
        properties.polygon = {
          pointCountMode: 'range',
          pointCountRange: [5, 8]
        };
        break;
      case 'ring':
        properties.ring = {
          innerRadiusMode: 'range',
          innerRadiusRange: [0.4, 0.8]
        };
        break;
      case 'line':
        properties.line = {
          pointCountMode: 'range',
          pointCountRange: [3, 6],
          strokeCapProbabilities: {
            round: 40,
            square: 30,
            butt: 30
          }
        };
        break;
      case 'bezier':
        properties.bezier = {
          pointCountMode: 'fixed',
          pointCountValue: 4,
          openProbability: 60
        };
        break;
      case 'cubic':
        properties.cubic = {
          pointCountMode: 'range',
          pointCountRange: [3, 6],
          curvatureRange: [0.2, 0.8],
          spreadRange: [50, 100]
        };
        break;
      case 'smooth-spline':
        properties['smooth-spline'] = {
          pointCountMode: 'range',
          pointCountRange: [4, 8],
          openProbability: 50
        };
        break;
      case 'spline-circle':
      case 'spline-ellipse':
        properties[type] = {
          segmentCountRange: [12, 24]
        };
        break;
      case 'spline-ring':
        properties['spline-ring'] = {
          innerRadiusRange: [0.3, 0.7],
          segmentCountRange: [16, 28]
        };
        break;
    }
  });
  
  return properties;
}

/**
 * Helper function to get blend modes for a specific set
 */
function getBlendModesForSet(setIndex: number): Record<string, number> {
  const blendModeGroups: Record<string, number>[] = [
    { 'source-over': 40, 'multiply': 30, 'screen': 30 },
    { 'overlay': 35, 'hard-light': 35, 'soft-light': 30 },
    { 'difference': 50, 'exclusion': 50 },
    { 'color-dodge': 40, 'color-burn': 30, 'darken': 30 },
    { 'lighten': 50, 'hue': 25, 'saturation': 25 }
  ];
  
  return blendModeGroups[setIndex % blendModeGroups.length];
}

/**
 * Runs a shape type diversity test
 */
export function runShapeTypeDiversityTest(test: ShapeTypeDiversityTest): ShapeTypeDiversityResult {
  console.log(`🧪 [DIVERSITY TEST] Running: ${test.name}`);
  
  // Validate generation sets
  const validation = validateGenerationSets(test.generationSets);
  
  // Calculate actual shape types used
  const actualShapeTypes = new Set<SupportedShapeType>();
  test.generationSets.forEach(set => {
    set.enabledShapeTypes.forEach(type => actualShapeTypes.add(type));
  });
  
  const actualShapeTypesArray = Array.from(actualShapeTypes);
  const missingTypes = test.expectedShapeTypes.filter(type => !actualShapeTypes.has(type));
  const extraTypes = actualShapeTypesArray.filter(type => !test.expectedShapeTypes.includes(type));
  
  // Check shape-specific properties usage
  const propertiesUsed = new Set<string>();
  const blendModes = new Set<string>();
  let hasGradients = false;
  const effects = new Set<string>();
  
  test.generationSets.forEach(set => {
    // Check shape-specific properties
    Object.keys(set.shapeSpecificProperties).forEach(shapeType => {
      const props = set.shapeSpecificProperties[shapeType as keyof ShapeSpecificProperties];
      if (props) {
        Object.keys(props).forEach(prop => {
          propertiesUsed.add(prop);
        });
      }
    });
    
    // Check blend modes
    if (set.batchConfig.blendModeEnabled && set.batchConfig.enabledBlendModes) {
      Object.keys(set.batchConfig.enabledBlendModes).forEach(mode => {
        blendModes.add(mode);
      });
    }
    
    // Check gradients
    if (set.batchConfig.fillGradientEnabled) {
      hasGradients = true;
    }
    
    // Check effects
    if (set.batchConfig.blurEnabled) effects.add('blur');
    if (set.batchConfig.strokeEnabled) effects.add('stroke');
  });
  
  // Determine if test passed
  const shapeTypeCoverageGood = missingTypes.length === 0;
  const validationPassed = validation.isValid;
  const passed = shapeTypeCoverageGood && validationPassed;
  
  console.log(`   Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log(`   Shape types: ${actualShapeTypesArray.length}/${test.expectedShapeTypes.length}`);
  console.log(`   Properties used: ${Array.from(propertiesUsed).length}`);
  console.log(`   Blend modes: ${Array.from(blendModes).length}`);
  
  return {
    testName: test.name,
    passed,
    shapeTypeCoverage: {
      expectedCount: test.expectedShapeTypes.length,
      actualCount: actualShapeTypesArray.length,
      missingTypes,
      extraTypes
    },
    propertiesVerification: {
      shapeSpecificProperties: Array.from(propertiesUsed),
      blendModes: Array.from(blendModes),
      gradients: hasGradients,
      effects: Array.from(effects)
    },
    errors: validation.errors,
    warnings: validation.warnings,
    complexity: test.complexity
  };
}

/**
 * Runs all shape type diversity tests
 */
export function runAllShapeTypeDiversityTests(): {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    success: boolean;
  };
  results: ShapeTypeDiversityResult[];
} {
  console.log('🚀 [DIVERSITY TEST] Starting Shape Type Diversity Tests');
  console.log('======================================================');

  const tests = [
    createBasicShapeTypeCoverageTest(),
    createComplexShapePropertiesTest(),
    createMaximumShapeTypeDiversityTest()
  ];

  const results: ShapeTypeDiversityResult[] = [];
  let passed = 0;
  let failed = 0;

  tests.forEach(test => {
    try {
      const result = runShapeTypeDiversityTest(test);
      results.push(result);
      
      if (result.passed) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ [DIVERSITY TEST] Failed to run ${test.name}:`, error);
      results.push({
        testName: test.name,
        passed: false,
        shapeTypeCoverage: {
          expectedCount: test.expectedShapeTypes.length,
          actualCount: 0,
          missingTypes: test.expectedShapeTypes,
          extraTypes: []
        },
        propertiesVerification: {
          shapeSpecificProperties: [],
          blendModes: [],
          gradients: false,
          effects: []
        },
        errors: [{ 
          message: error instanceof Error ? error.message : 'Unknown error'
        }],
        warnings: [],
        complexity: test.complexity
      });
      failed++;
    }
  });

  const success = failed === 0;
  
  console.log('======================================================');
  console.log(`🏁 [DIVERSITY TEST] Tests Complete: ${passed}/${passed + failed} passed`);
  if (success) {
    console.log('✅ All shape type diversity tests passed!');
  } else {
    console.log(`❌ ${failed} tests failed`);
  }

  return {
    summary: {
      totalTests: passed + failed,
      passed,
      failed,
      success
    },
    results
  };
}

// Export test scenarios and functions
export const SHAPE_TYPE_DIVERSITY_TESTS = {
  basicShapeTypeCoverage: createBasicShapeTypeCoverageTest,
  complexShapeProperties: createComplexShapePropertiesTest,
  maximumShapeTypeDiversity: createMaximumShapeTypeDiversityTest
};

export const SHAPE_TYPE_DIVERSITY_TEST_FUNCTIONS = {
  runShapeTypeDiversityTest,
  runAllShapeTypeDiversityTests
};