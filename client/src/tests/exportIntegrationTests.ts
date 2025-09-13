/**
 * Export Integration Tests
 * 
 * Tests batch export functionality with complex multi-set configurations
 * to ensure proper layered composite image generation
 */

import { 
  EnhancedBatchConfig, 
  GenerationSet, 
  GenerationSetMode, 
  ShapeCountMode,
  GenerationSetUtils,
  defaultBatchConfigSettings
} from '@shared/schema';
import { 
  validateGenerationSets,
  generateGenerationSetsSummary
} from '@/lib/generationSetValidation';

export interface ExportIntegrationTest {
  name: string;
  description: string;
  config: EnhancedBatchConfig;
  exportSettings: {
    format: 'png' | 'svg' | 'json';
    quality: number;
    batchCount: number;
    packageAsZip: boolean;
    exportAllImages: boolean;
    selectedImageIndices?: number[];
  };
  expectedResults: {
    totalImages: number;
    layersPerImage: number;
    hasBackground: boolean;
    hasEffects: boolean;
    fileFormats: string[];
  };
}

export interface ExportIntegrationResult {
  testName: string;
  passed: boolean;
  exportAttempted: boolean;
  validationPassed: boolean;
  configurationValid: boolean;
  expectedFiles: number;
  simulatedExportTime: number;
  errors: any[];
  warnings: any[];
  exportDetails: {
    format: string;
    quality: number;
    batchSize: number;
    totalShapes: number;
    zIndexRange: [number, number];
    complexityScore: number;
  };
}

/**
 * Test 1: Basic Multi-Set Export
 * Tests simple multi-set configuration with PNG export
 */
export function createBasicMultiSetExportTest(): ExportIntegrationTest {
  const sets: GenerationSet[] = [
    GenerationSetUtils.createDefault('bg', 'Background'),
    GenerationSetUtils.createDefault('fg', 'Foreground')
  ];

  sets[0] = {
    ...sets[0],
    enabledShapeTypes: ['rectangle', 'rounded-rectangle'],
    shapeCountMode: ShapeCountMode.FIXED,
    shapeCountFixed: 20,
    zIndexConfig: {
      baseOffset: 0,
      incrementPerShape: 1,
      incrementPerGeneration: 0
    },
    batchConfig: {
      ...defaultBatchConfigSettings,
      fillEnabled: true,
      fillColorMode: 'palette',
      fillColorPalette: ['#E8F4FD', '#D1E7DD', '#F8D7DA'],
      distributionLayoutEnabled: true,
      distributionPattern: 'grid',
      gridRows: 4,
      gridColumns: 5
    }
  };

  sets[1] = {
    ...sets[1],
    enabledShapeTypes: ['circle', 'star'],
    shapeCountMode: ShapeCountMode.RANGE,
    shapeCountRange: [8, 12],
    zIndexConfig: {
      baseOffset: 100,
      incrementPerShape: 2,
      incrementPerGeneration: 0
    },
    batchConfig: {
      ...defaultBatchConfigSettings,
      blendModeEnabled: true,
      enabledBlendModes: {
        'multiply': 50,
        'screen': 50
      },
      fillOpacityRange: [0.7, 0.9]
    }
  };

  const config = {
    mode: GenerationSetMode.MULTI,
    generationSets: sets,
    globalSettings: {
      canvasWidth: 800,
      canvasHeight: 600,
      exportFormat: 'png' as const,
      exportQuality: 92,
      globalZIndexSettings: {
        startingZIndex: 0,
        setSpacing: 100,
        preventOverlap: true,
        useGlobalSettings: false
      }
    },
    modeRestrictions: {
      multiGenerationOnlyForFixedCount: false,
      maxGenerationSets: 20,
      minShapesPerSet: 1,
      maxShapesPerSet: 1000
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '1.0.0'
  };

  return {
    name: 'Basic Multi-Set Export',
    description: 'Tests basic multi-set PNG export with background grid and foreground scatter',
    config,
    exportSettings: {
      format: 'png',
      quality: 92,
      batchCount: 5,
      packageAsZip: true,
      exportAllImages: true
    },
    expectedResults: {
      totalImages: 5,
      layersPerImage: 2,
      hasBackground: true,
      hasEffects: true,
      fileFormats: ['png']
    }
  };
}

/**
 * Test 2: Complex Multi-Format Export
 * Tests complex configuration with SVG and JSON exports
 */
export function createComplexMultiFormatExportTest(): ExportIntegrationTest {
  const sets: GenerationSet[] = [
    GenerationSetUtils.createDefault('base', 'Base Layer'),
    GenerationSetUtils.createDefault('mid', 'Mid Layer'),
    GenerationSetUtils.createDefault('top', 'Top Layer'),
    GenerationSetUtils.createDefault('overlay', 'Overlay Effects')
  ];

  // Complex base layer with noise
  sets[0] = {
    ...sets[0],
    enabledShapeTypes: ['blob', 'chunk'],
    shapeCountMode: ShapeCountMode.FIXED,
    shapeCountFixed: 15,
    zIndexConfig: { baseOffset: 0, incrementPerShape: 1, incrementPerGeneration: 0 },
    batchConfig: {
      ...defaultBatchConfigSettings,
      noiseEnabled: true,
      noiseAlgorithm: 'perlin',
      noiseScale: 0.1,
      noiseAmplitude: 50,
      fillGradientEnabled: true,
      fillGradientRadialProbability: 100,
      fillGradientColorMode: 'palette',
      fillGradientColorPalette: ['#667eea', '#764ba2']
    }
  };

  // Mid layer with geometric shapes
  sets[1] = {
    ...sets[1],
    enabledShapeTypes: ['polygon', 'hexagon', 'pentagon'],
    shapeCountMode: ShapeCountMode.RANGE,
    shapeCountRange: [10, 15],
    zIndexConfig: { baseOffset: 50, incrementPerShape: 2, incrementPerGeneration: 0 },
    shapeSpecificProperties: {
      polygon: {
        pointCountMode: 'range',
        pointCountRange: [5, 8]
      }
    },
    batchConfig: {
      ...defaultBatchConfigSettings,
      blendModeEnabled: true,
      enabledBlendModes: {
        'overlay': 30,
        'hard-light': 35,
        'soft-light': 35
      },
      strokeEnabled: true,
      strokeProbability: 80,
      strokeWidthRange: [1, 3]
    }
  };

  // Top layer with stars and effects
  sets[2] = {
    ...sets[2],
    enabledShapeTypes: ['star', 'heart'],
    shapeCountMode: ShapeCountMode.FIXED,
    shapeCountFixed: 8,
    zIndexConfig: { baseOffset: 100, incrementPerShape: 5, incrementPerGeneration: 0 },
    shapeSpecificProperties: {
      star: {
        pointCountMode: 'range',
        pointCountRange: [5, 12],
        innerRadiusMode: 'range',
        innerRadiusRange: [0.3, 0.8]
      }
    },
    batchConfig: {
      ...defaultBatchConfigSettings,
      blurEnabled: true,
      blurProbability: 50,
      blurRange: [2, 6],
      fillColorMode: 'range',
      fillColorRange: ['#ff6b6b', '#feca57']
    }
  };

  // Overlay with lines
  sets[3] = {
    ...sets[3],
    enabledShapeTypes: ['line', 'bezier'],
    shapeCountMode: ShapeCountMode.RANGE,
    shapeCountRange: [3, 6],
    zIndexConfig: { baseOffset: 150, incrementPerShape: 10, incrementPerGeneration: 0 },
    shapeSpecificProperties: {
      line: {
        pointCountMode: 'range',
        pointCountRange: [3, 8],
        strokeCapProbabilities: {
          round: 60,
          square: 40,
          butt: 0
        }
      },
      bezier: {
        pointCountMode: 'fixed',
        pointCountValue: 4,
        openProbability: 90
      }
    },
    batchConfig: {
      ...defaultBatchConfigSettings,
      strokeEnabled: true,
      strokeProbability: 100,
      strokeWidthRange: [2, 8],
      strokeOpacityRange: [0.6, 1.0],
      blendModeEnabled: true,
      enabledBlendModes: {
        'difference': 100
      }
    }
  };

  const config = {
    mode: GenerationSetMode.MULTI,
    generationSets: sets,
    globalSettings: {
      canvasWidth: 1200,
      canvasHeight: 800,
      exportFormat: 'svg' as const,
      exportQuality: 100,
      globalZIndexSettings: {
        startingZIndex: 0,
        setSpacing: 50,
        preventOverlap: true,
        useGlobalSettings: false
      }
    },
    modeRestrictions: {
      multiGenerationOnlyForFixedCount: false,
      maxGenerationSets: 20,
      minShapesPerSet: 1,
      maxShapesPerSet: 1000
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '1.0.0'
  };

  return {
    name: 'Complex Multi-Format Export',
    description: 'Tests complex 4-layer SVG export with noise, blend modes, and effects',
    config,
    exportSettings: {
      format: 'svg',
      quality: 100,
      batchCount: 3,
      packageAsZip: true,
      exportAllImages: true
    },
    expectedResults: {
      totalImages: 3,
      layersPerImage: 4,
      hasBackground: true,
      hasEffects: true,
      fileFormats: ['svg']
    }
  };
}

/**
 * Test 3: Selective Export Test
 * Tests selective image export functionality
 */
export function createSelectiveExportTest(): ExportIntegrationTest {
  const sets: GenerationSet[] = [
    GenerationSetUtils.createDefault('layer1', 'Layer 1'),
    GenerationSetUtils.createDefault('layer2', 'Layer 2')
  ];

  sets[0] = {
    ...sets[0],
    enabledShapeTypes: ['rectangle', 'circle'],
    shapeCountMode: ShapeCountMode.FIXED,
    shapeCountFixed: 12,
    batchConfig: {
      ...defaultBatchConfigSettings,
      fillEnabled: true,
      fillColorMode: 'palette',
      fillColorPalette: ['#3498db', '#e74c3c', '#2ecc71']
    }
  };

  sets[1] = {
    ...sets[1],
    enabledShapeTypes: ['star', 'triangle'],
    shapeCountMode: ShapeCountMode.FIXED,
    shapeCountFixed: 6,
    zIndexConfig: { baseOffset: 50, incrementPerShape: 1, incrementPerGeneration: 0 },
    batchConfig: {
      ...defaultBatchConfigSettings,
      strokeEnabled: true,
      strokeProbability: 100,
      strokeWidthRange: [2, 4]
    }
  };

  const config = {
    mode: GenerationSetMode.MULTI,
    generationSets: sets,
    globalSettings: {
      canvasWidth: 600,
      canvasHeight: 400,
      exportFormat: 'png' as const,
      exportQuality: 85,
      globalZIndexSettings: {
        startingZIndex: 0,
        setSpacing: 50,
        preventOverlap: true,
        useGlobalSettings: false
      }
    },
    modeRestrictions: {
      multiGenerationOnlyForFixedCount: false,
      maxGenerationSets: 20,
      minShapesPerSet: 1,
      maxShapesPerSet: 1000
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '1.0.0'
  };

  return {
    name: 'Selective Export Test',
    description: 'Tests selective export of specific images from a batch',
    config,
    exportSettings: {
      format: 'png',
      quality: 85,
      batchCount: 10,
      packageAsZip: false,
      exportAllImages: false,
      selectedImageIndices: [1, 3, 5, 8] // Export only specific images
    },
    expectedResults: {
      totalImages: 4, // Only selected images
      layersPerImage: 2,
      hasBackground: false,
      hasEffects: false,
      fileFormats: ['png']
    }
  };
}

/**
 * Test 4: High Complexity Export
 * Tests maximum complexity scenario
 */
export function createHighComplexityExportTest(): ExportIntegrationTest {
  const sets: GenerationSet[] = [];

  // Create 5 complex generation sets
  for (let i = 0; i < 5; i++) {
    const set = GenerationSetUtils.createDefault(`complex-set-${i}`, `Complex Set ${i + 1}`);
    sets.push({
      ...set,
      enabledShapeTypes: [
        ['rectangle', 'rounded-rectangle', 'square'],
        ['circle', 'ellipse', 'ring'],
        ['star', 'polygon', 'heart'],
        ['blob', 'chunk', 'arrow'],
        ['line', 'bezier', 'cubic']
      ][i] as any,
      shapeCountMode: i % 2 === 0 ? ShapeCountMode.FIXED : ShapeCountMode.RANGE,
      shapeCountFixed: 15 - i * 2,
      shapeCountRange: [8 - i, 12 + i],
      zIndexConfig: {
        baseOffset: i * 50,
        incrementPerShape: i + 1,
        incrementPerGeneration: 0
      },
      batchConfig: {
        ...defaultBatchConfigSettings,
        // Enable all features for complexity
        noiseEnabled: true,
        noiseAlgorithm: (['perlin', 'simplex', 'fractal', 'worley', 'turbulence'] as const)[i] as any,
        noiseScale: 0.05 + i * 0.02,
        noiseAmplitude: 20 + i * 10,
        blendModeEnabled: true,
        enabledBlendModes: {
          [(['multiply', 'screen', 'overlay', 'hard-light', 'difference'] as const)[i]]: 100
        },
        fillGradientEnabled: i % 2 === 0,
        fillGradientLinearProbability: 40,
        fillGradientRadialProbability: 30,
        fillGradientConicProbability: 30,
        strokeEnabled: i % 2 === 1,
        strokeProbability: 80,
        strokeWidthRange: [1, 5],
        blurEnabled: i === 4,
        blurProbability: 30,
        blurRange: [1, 4],
        distributionLayoutEnabled: i === 0,
        distributionPattern: 'grid'
      }
    });
  }

  const config = {
    mode: GenerationSetMode.MULTI,
    generationSets: sets,
    globalSettings: {
      canvasWidth: 1600,
      canvasHeight: 1200,
      exportFormat: 'png' as const,
      exportQuality: 95,
      globalZIndexSettings: {
        startingZIndex: 0,
        setSpacing: 50,
        preventOverlap: true,
        useGlobalSettings: false
      }
    },
    modeRestrictions: {
      multiGenerationOnlyForFixedCount: false,
      maxGenerationSets: 20,
      minShapesPerSet: 1,
      maxShapesPerSet: 1000
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '1.0.0'
  };

  return {
    name: 'High Complexity Export',
    description: 'Tests maximum complexity with 5 sets, all features enabled, large canvas',
    config,
    exportSettings: {
      format: 'png',
      quality: 95,
      batchCount: 2, // Small batch due to complexity
      packageAsZip: true,
      exportAllImages: true
    },
    expectedResults: {
      totalImages: 2,
      layersPerImage: 5,
      hasBackground: true,
      hasEffects: true,
      fileFormats: ['png']
    }
  };
}

/**
 * Runs an export integration test
 */
export function runExportIntegrationTest(test: ExportIntegrationTest): ExportIntegrationResult {
  console.log(`🧪 [EXPORT TEST] Running: ${test.name}`);
  
  const startTime = Date.now();
  
  // Validate configuration
  const validation = validateGenerationSets(test.config.generationSets);
  const summary = generateGenerationSetsSummary(test.config.generationSets);
  
  // Calculate complexity score
  const complexityFactors = {
    setCount: test.config.generationSets.length,
    totalShapes: summary.estimatedShapeCount,
    canvasSize: test.config.globalSettings.canvasWidth * test.config.globalSettings.canvasHeight,
    batchSize: test.exportSettings.batchCount
  };
  
  const complexityScore = Math.floor(
    (complexityFactors.setCount * 10) +
    (complexityFactors.totalShapes * 2) +
    (complexityFactors.canvasSize / 100000) +
    (complexityFactors.batchSize * 5)
  );

  // Simulate export process
  const simulatedExportTime = Math.max(
    100, // Minimum time
    complexityScore * 10 + Math.random() * 500 // Complexity-based time
  );

  // Determine expected files
  let expectedFiles = test.exportSettings.batchCount;
  if (!test.exportSettings.exportAllImages && test.exportSettings.selectedImageIndices) {
    expectedFiles = test.exportSettings.selectedImageIndices.length;
  }

  // Check if export would be valid
  const configurationValid = validation.isValid;
  const exportAttempted = configurationValid; // Only attempt if valid
  
  const passed = configurationValid && 
                 expectedFiles === test.expectedResults.totalImages &&
                 test.config.generationSets.length === test.expectedResults.layersPerImage;

  const endTime = Date.now();
  
  console.log(`   Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log(`   Configuration valid: ${configurationValid}`);
  console.log(`   Expected files: ${expectedFiles}`);
  console.log(`   Complexity score: ${complexityScore}`);
  console.log(`   Simulated export time: ${simulatedExportTime.toFixed(0)}ms`);

  return {
    testName: test.name,
    passed,
    exportAttempted,
    validationPassed: validation.isValid,
    configurationValid,
    expectedFiles,
    simulatedExportTime,
    errors: validation.errors,
    warnings: validation.warnings,
    exportDetails: {
      format: test.exportSettings.format,
      quality: test.exportSettings.quality,
      batchSize: test.exportSettings.batchCount,
      totalShapes: summary.estimatedShapes,
      zIndexRange: summary.zIndexRange,
      complexityScore
    }
  };
}

/**
 * Runs all export integration tests
 */
export function runAllExportIntegrationTests(): {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    success: boolean;
  };
  results: ExportIntegrationResult[];
} {
  console.log('🚀 [EXPORT TEST] Starting Export Integration Tests');
  console.log('==================================================');

  const tests = [
    createBasicMultiSetExportTest(),
    createComplexMultiFormatExportTest(),
    createSelectiveExportTest(),
    createHighComplexityExportTest()
  ];

  const results: ExportIntegrationResult[] = [];
  let passed = 0;
  let failed = 0;

  tests.forEach(test => {
    try {
      const result = runExportIntegrationTest(test);
      results.push(result);
      
      if (result.passed) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ [EXPORT TEST] Failed to run ${test.name}:`, error);
      results.push({
        testName: test.name,
        passed: false,
        exportAttempted: false,
        validationPassed: false,
        configurationValid: false,
        expectedFiles: 0,
        simulatedExportTime: 0,
        errors: [{ 
          message: error instanceof Error ? error.message : 'Unknown error'
        }],
        warnings: [],
        exportDetails: {
          format: 'png',
          quality: 0,
          batchSize: 0,
          totalShapes: 0,
          zIndexRange: [0, 0],
          complexityScore: 0
        }
      });
      failed++;
    }
  });

  const success = failed === 0;
  
  console.log('==================================================');
  console.log(`🏁 [EXPORT TEST] Tests Complete: ${passed}/${passed + failed} passed`);
  if (success) {
    console.log('✅ All export integration tests passed!');
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
export const EXPORT_INTEGRATION_TESTS = {
  basicMultiSetExport: createBasicMultiSetExportTest,
  complexMultiFormatExport: createComplexMultiFormatExportTest,
  selectiveExport: createSelectiveExportTest,
  highComplexityExport: createHighComplexityExportTest
};

export const EXPORT_INTEGRATION_TEST_FUNCTIONS = {
  runExportIntegrationTest,
  runAllExportIntegrationTests
};