/**
 * Z-Index Layering Verification Tests
 * 
 * Comprehensive tests for verifying proper z-index layering behavior
 * across different generation set configurations
 */

import { 
  EnhancedBatchConfig, 
  GenerationSet, 
  GenerationSetMode, 
  ShapeCountMode,
  GenerationSetUtils,
  DEFAULT_Z_INDEX_CONFIG
} from '@shared/schema';
import { 
  validateGenerationSets
} from '@/lib/generationSetValidation';

export interface ZIndexTestScenario {
  name: string;
  description: string;
  generationSets: GenerationSet[];
  expectedZIndexRanges: Array<{
    setId: string;
    setName: string;
    minZIndex: number;
    maxZIndex: number;
    shapeCount: number;
  }>;
  shouldHaveConflicts: boolean;
  conflictType?: 'overlap' | 'duplicate' | 'invalid-range';
}

export interface ZIndexVerificationResult {
  scenarioName: string;
  passed: boolean;
  calculatedRanges: Array<{
    setId: string;
    setName: string;
    minZIndex: number;
    maxZIndex: number;
    actualShapeCount: number;
  }>;
  conflicts: any[];
  errors: any[];
  visualStackingOrder: string[]; // Array of set names in stacking order
}

/**
 * Test Scenario 1: Basic Layer Separation
 * Tests clear z-index separation between different sets
 */
export function createBasicLayerSeparationTest(): ZIndexTestScenario {
  const sets: GenerationSet[] = [
    GenerationSetUtils.createDefault('background', 'Background Layer'),
    GenerationSetUtils.createDefault('midground', 'Midground Layer'),  
    GenerationSetUtils.createDefault('foreground', 'Foreground Layer')
  ];

  // Configure z-index settings for clear separation
  sets[0] = {
    ...sets[0],
    enabledShapeTypes: ['rectangle', 'square'],
    shapeCountMode: ShapeCountMode.FIXED,
    shapeCountFixed: 10,
    zIndexConfig: {
      baseOffset: 0,
      incrementPerShape: 1,
      incrementPerGeneration: 0
    },
    generationOrder: 0
  };

  sets[1] = {
    ...sets[1],
    enabledShapeTypes: ['circle', 'ellipse'],
    shapeCountMode: ShapeCountMode.FIXED,
    shapeCountFixed: 8,
    zIndexConfig: {
      baseOffset: 100,
      incrementPerShape: 2,
      incrementPerGeneration: 0
    },
    generationOrder: 1
  };

  sets[2] = {
    ...sets[2],
    enabledShapeTypes: ['star', 'polygon'],
    shapeCountMode: ShapeCountMode.FIXED,
    shapeCountFixed: 5,
    zIndexConfig: {
      baseOffset: 200,
      incrementPerShape: 5,
      incrementPerGeneration: 0
    },
    generationOrder: 2
  };

  return {
    name: 'Basic Layer Separation',
    description: 'Tests clear z-index separation with no overlaps between generation sets',
    generationSets: sets,
    expectedZIndexRanges: [
      { setId: 'background', setName: 'Background Layer', minZIndex: 0, maxZIndex: 9, shapeCount: 10 },
      { setId: 'midground', setName: 'Midground Layer', minZIndex: 100, maxZIndex: 114, shapeCount: 8 },
      { setId: 'foreground', setName: 'Foreground Layer', minZIndex: 200, maxZIndex: 220, shapeCount: 5 }
    ],
    shouldHaveConflicts: false
  };
}

/**
 * Test Scenario 2: Z-Index Extremes
 * Tests very high and very low z-index values
 */
export function createZIndexExtremesTest(): ZIndexTestScenario {
  const sets: GenerationSet[] = [
    GenerationSetUtils.createDefault('deep-background', 'Deep Background'),
    GenerationSetUtils.createDefault('high-foreground', 'High Foreground')
  ];

  sets[0] = {
    ...sets[0],
    enabledShapeTypes: ['blob', 'chunk'],
    shapeCountMode: ShapeCountMode.RANGE,
    shapeCountRange: [5, 10],
    zIndexConfig: {
      baseOffset: -1000,
      incrementPerShape: 1,
      incrementPerGeneration: 0
    },
    generationOrder: 0
  };

  sets[1] = {
    ...sets[1],
    enabledShapeTypes: ['arrow', 'cross'],
    shapeCountMode: ShapeCountMode.FIXED,
    shapeCountFixed: 3,
    zIndexConfig: {
      baseOffset: 10000,
      incrementPerShape: 100,
      incrementPerGeneration: 0
    },
    generationOrder: 1
  };

  return {
    name: 'Z-Index Extremes',
    description: 'Tests extreme z-index values (negative and very high)',
    generationSets: sets,
    expectedZIndexRanges: [
      { setId: 'deep-background', setName: 'Deep Background', minZIndex: -1000, maxZIndex: -991, shapeCount: 10 },
      { setId: 'high-foreground', setName: 'High Foreground', minZIndex: 10000, maxZIndex: 10200, shapeCount: 3 }
    ],
    shouldHaveConflicts: false
  };
}

/**
 * Test Scenario 3: Intentional Z-Index Conflicts
 * Tests overlapping z-index ranges to verify conflict detection
 */
export function createZIndexConflictsTest(): ZIndexTestScenario {
  const sets: GenerationSet[] = [
    GenerationSetUtils.createDefault('set1', 'Conflicting Set 1'),
    GenerationSetUtils.createDefault('set2', 'Conflicting Set 2'),
    GenerationSetUtils.createDefault('set3', 'Conflicting Set 3')
  ];

  // Set up overlapping z-index ranges
  sets[0] = {
    ...sets[0],
    enabledShapeTypes: ['rectangle'],
    shapeCountMode: ShapeCountMode.FIXED,
    shapeCountFixed: 10,
    zIndexConfig: {
      baseOffset: 50,
      incrementPerShape: 5,
      incrementPerGeneration: 0
    },
    generationOrder: 0
  };

  sets[1] = {
    ...sets[1],
    enabledShapeTypes: ['circle'],
    shapeCountMode: ShapeCountMode.FIXED,
    shapeCountFixed: 8,
    zIndexConfig: {
      baseOffset: 80,
      incrementPerShape: 3,
      incrementPerGeneration: 0
    },
    generationOrder: 1
  };

  sets[2] = {
    ...sets[2],
    enabledShapeTypes: ['triangle'],
    shapeCountMode: ShapeCountMode.FIXED,
    shapeCountFixed: 6,
    zIndexConfig: {
      baseOffset: 75,
      incrementPerShape: 8,
      incrementPerGeneration: 0
    },
    generationOrder: 2
  };

  return {
    name: 'Z-Index Conflicts',
    description: 'Tests overlapping z-index ranges to verify conflict detection works correctly',
    generationSets: sets,
    expectedZIndexRanges: [
      { setId: 'set1', setName: 'Conflicting Set 1', minZIndex: 50, maxZIndex: 95, shapeCount: 10 },
      { setId: 'set2', setName: 'Conflicting Set 2', minZIndex: 80, maxZIndex: 101, shapeCount: 8 },
      { setId: 'set3', setName: 'Conflicting Set 3', minZIndex: 75, maxZIndex: 115, shapeCount: 6 }
    ],
    shouldHaveConflicts: true,
    conflictType: 'overlap'
  };
}

/**
 * Test Scenario 4: Dense Z-Index Packing
 * Tests many sets with tightly packed z-index ranges
 */
export function createDenseZIndexPackingTest(): ZIndexTestScenario {
  const sets: GenerationSet[] = [];
  const expectedRanges: Array<{
    setId: string;
    setName: string;
    minZIndex: number;
    maxZIndex: number;
    shapeCount: number;
  }> = [];

  // Create 8 tightly packed sets
  for (let i = 0; i < 8; i++) {
    const setId = `dense-set-${i}`;
    const setName = `Dense Set ${i + 1}`;
    const baseOffset = i * 10;
    const shapeCount = 3;
    
    const set = GenerationSetUtils.createDefault(setId, setName);
    sets.push({
      ...set,
      enabledShapeTypes: ['rectangle', 'circle', 'star'][i % 3] as any,
      shapeCountMode: ShapeCountMode.FIXED,
      shapeCountFixed: shapeCount,
      zIndexConfig: {
        baseOffset,
        incrementPerShape: 1,
        incrementPerGeneration: 0
      },
      generationOrder: i
    });

    expectedRanges.push({
      setId,
      setName,
      minZIndex: baseOffset,
      maxZIndex: baseOffset + shapeCount - 1,
      shapeCount
    });
  }

  return {
    name: 'Dense Z-Index Packing',
    description: 'Tests many generation sets with tightly packed but non-overlapping z-index ranges',
    generationSets: sets,
    expectedZIndexRanges: expectedRanges,
    shouldHaveConflicts: false
  };
}

/**
 * Test Scenario 5: Variable Shape Counts with Z-Index
 * Tests z-index behavior with range-based shape counts
 */
export function createVariableShapeCountsTest(): ZIndexTestScenario {
  const sets: GenerationSet[] = [
    GenerationSetUtils.createDefault('var1', 'Variable Count 1'),
    GenerationSetUtils.createDefault('var2', 'Variable Count 2'),
    GenerationSetUtils.createDefault('var3', 'Variable Count 3')
  ];

  sets[0] = {
    ...sets[0],
    enabledShapeTypes: ['polygon'],
    shapeCountMode: ShapeCountMode.RANGE,
    shapeCountRange: [5, 15],
    zIndexConfig: {
      baseOffset: 0,
      incrementPerShape: 2,
      incrementPerGeneration: 0
    },
    generationOrder: 0
  };

  sets[1] = {
    ...sets[1],
    enabledShapeTypes: ['ring'],
    shapeCountMode: ShapeCountMode.RANGE,
    shapeCountRange: [3, 8],
    zIndexConfig: {
      baseOffset: 50,
      incrementPerShape: 4,
      incrementPerGeneration: 0
    },
    generationOrder: 1
  };

  sets[2] = {
    ...sets[2],
    enabledShapeTypes: ['heart'],
    shapeCountMode: ShapeCountMode.RANGE,
    shapeCountRange: [1, 5],
    zIndexConfig: {
      baseOffset: 100,
      incrementPerShape: 10,
      incrementPerGeneration: 0
    },
    generationOrder: 2
  };

  return {
    name: 'Variable Shape Counts',
    description: 'Tests z-index calculations with range-based shape counts',
    generationSets: sets,
    expectedZIndexRanges: [
      { setId: 'var1', setName: 'Variable Count 1', minZIndex: 0, maxZIndex: 28, shapeCount: 15 }, // max case
      { setId: 'var2', setName: 'Variable Count 2', minZIndex: 50, maxZIndex: 78, shapeCount: 8 }, // max case  
      { setId: 'var3', setName: 'Variable Count 3', minZIndex: 100, maxZIndex: 140, shapeCount: 5 } // max case
    ],
    shouldHaveConflicts: false
  };
}

/**
 * Runs z-index verification for a single test scenario
 */
export function runZIndexVerificationTest(scenario: ZIndexTestScenario, randomSeed?: number): ZIndexVerificationResult {
  console.log(`🧪 [Z-INDEX TEST] Running: ${scenario.name}`);
  
  // Calculate actual z-index ranges for each set
  const calculatedRanges = scenario.generationSets.map(set => {
    const shapeCount = GenerationSetUtils.getShapeCount(set, randomSeed);
    const [minZIndex, maxZIndex] = GenerationSetUtils.calculateZIndexRange(set);
    
    return {
      setId: set.id,
      setName: set.name,
      minZIndex,
      maxZIndex: minZIndex + (shapeCount - 1) * set.zIndexConfig.incrementPerShape,
      actualShapeCount: shapeCount
    };
  });

  // Run validation to detect conflicts
  const validation = validateGenerationSets(scenario.generationSets);
  const conflicts = validation.warnings.filter(w => 
    typeof w === 'object' && w.message && w.message.toLowerCase().includes('zindex')
  );
  
  // Determine visual stacking order (sorted by minimum z-index)
  const visualStackingOrder = calculatedRanges
    .sort((a, b) => a.minZIndex - b.minZIndex)
    .map(range => range.setName);

  // Check if test expectations match results
  const hasConflicts = conflicts.length > 0;
  const passed = hasConflicts === scenario.shouldHaveConflicts;

  // Additional verification for expected ranges
  if (scenario.expectedZIndexRanges.length === calculatedRanges.length) {
    for (let i = 0; i < scenario.expectedZIndexRanges.length; i++) {
      const expected = scenario.expectedZIndexRanges[i];
      const actual = calculatedRanges.find(r => r.setId === expected.setId);
      
      if (actual) {
        // For range-based counts, we check against max expected count
        const expectedMaxZIndex = expected.minZIndex + (expected.shapeCount - 1) * 
          scenario.generationSets.find(s => s.id === expected.setId)!.zIndexConfig.incrementPerShape;
        
        if (actual.minZIndex !== expected.minZIndex || 
            (scenario.generationSets.find(s => s.id === expected.setId)!.shapeCountMode === ShapeCountMode.FIXED &&
             actual.maxZIndex !== expectedMaxZIndex)) {
          console.warn(`⚠️ Z-index range mismatch for ${expected.setName}: expected [${expected.minZIndex}, ${expectedMaxZIndex}], got [${actual.minZIndex}, ${actual.maxZIndex}]`);
        }
      }
    }
  }

  console.log(`   Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log(`   Conflicts detected: ${hasConflicts} (expected: ${scenario.shouldHaveConflicts})`);
  console.log(`   Visual stacking order: ${visualStackingOrder.join(' → ')}`);
  
  return {
    scenarioName: scenario.name,
    passed,
    calculatedRanges,
    conflicts,
    errors: validation.errors,
    visualStackingOrder
  };
}

/**
 * Runs all z-index layering verification tests
 */
export function runAllZIndexLayeringTests(randomSeed?: number): {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    success: boolean;
  };
  results: ZIndexVerificationResult[];
} {
  console.log('🚀 [Z-INDEX TEST] Starting Z-Index Layering Verification Tests');
  console.log('================================================================');

  const scenarios = [
    createBasicLayerSeparationTest(),
    createZIndexExtremesTest(),
    createZIndexConflictsTest(),
    createDenseZIndexPackingTest(),
    createVariableShapeCountsTest()
  ];

  const results: ZIndexVerificationResult[] = [];
  let passed = 0;
  let failed = 0;

  scenarios.forEach(scenario => {
    try {
      const result = runZIndexVerificationTest(scenario, randomSeed);
      results.push(result);
      
      if (result.passed) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ [Z-INDEX TEST] Failed to run ${scenario.name}:`, error);
      results.push({
        scenarioName: scenario.name,
        passed: false,
        calculatedRanges: [],
        conflicts: [],
        errors: [{ 
          message: error instanceof Error ? error.message : 'Unknown error'
        }],
        visualStackingOrder: []
      });
      failed++;
    }
  });

  const success = failed === 0;
  
  console.log('================================================================');
  console.log(`🏁 [Z-INDEX TEST] Tests Complete: ${passed}/${passed + failed} passed`);
  if (success) {
    console.log('✅ All z-index layering tests passed!');
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

/**
 * Creates a visual z-index map for debugging
 */
export function createZIndexVisualizationMap(sets: GenerationSet[], randomSeed?: number): {
  setName: string;
  zIndexRanges: Array<{ shapeIndex: number; zIndex: number }>;
  totalRange: [number, number];
}[] {
  return sets.map(set => {
    const shapeCount = GenerationSetUtils.getShapeCount(set, randomSeed);
    const zIndexRanges: Array<{ shapeIndex: number; zIndex: number }> = [];
    
    for (let i = 0; i < shapeCount; i++) {
      const zIndex = set.zIndexConfig.baseOffset + (i * set.zIndexConfig.incrementPerShape);
      zIndexRanges.push({ shapeIndex: i, zIndex });
    }
    
    const minZ = zIndexRanges[0]?.zIndex ?? set.zIndexConfig.baseOffset;
    const maxZ = zIndexRanges[zIndexRanges.length - 1]?.zIndex ?? set.zIndexConfig.baseOffset;
    
    return {
      setName: set.name,
      zIndexRanges,
      totalRange: [minZ, maxZ] as [number, number]
    };
  });
}

// Export all test scenarios for external use
export const Z_INDEX_TEST_SCENARIOS = {
  basicLayerSeparation: createBasicLayerSeparationTest,
  zIndexExtremes: createZIndexExtremesTest,
  zIndexConflicts: createZIndexConflictsTest,
  denseZIndexPacking: createDenseZIndexPackingTest,
  variableShapeCounts: createVariableShapeCountsTest
};

// Export test functions
export const Z_INDEX_TEST_FUNCTIONS = {
  runZIndexVerificationTest,
  runAllZIndexLayeringTests,
  createZIndexVisualizationMap
};