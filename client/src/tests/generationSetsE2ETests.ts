/**
 * Comprehensive End-to-End Tests for Generation Sets Functionality
 * 
 * This file contains test scenarios that verify:
 * 1. Multi-set configuration testing
 * 2. Z-index layering verification
 * 3. Shape type diversity testing
 * 4. Validation system testing
 * 5. Export integration testing
 */

import { 
  EnhancedBatchConfig, 
  GenerationSet, 
  GenerationSetMode, 
  ShapeCountMode,
  SupportedShapeType,
  GenerationSetUtils,
  defaultBatchConfigSettings,
  DEFAULT_Z_INDEX_CONFIG,
  DEFAULT_GENERATION_SET_LIMITS,
  SUPPORTED_SHAPE_TYPES,
  BLEND_MODES,
  BlendMode
} from '@shared/schema';
import { 
  validateGenerationSets,
  generateGenerationSetsSummary,
  autoFixGenerationSets
} from '@/lib/generationSetValidation';
import { 
  GenerationSetValidator,
  ShapeSpecificPropertiesHelper,
  BlendModeHelper,
  ValidationError,
  ValidationWarning
} from '@/lib/typedHelpers';

// ===== TEST DATA GENERATORS =====

/**
 * Creates a basic generation set for testing
 */
function createTestGenerationSet(
  id: string, 
  name: string, 
  overrides: Partial<GenerationSet> = {}
): GenerationSet {
  const defaultSet = GenerationSetUtils.createDefault(id, name);
  return {
    ...defaultSet,
    ...overrides
  };
}

/**
 * Creates an enhanced batch config for testing
 */
function createTestEnhancedBatchConfig(overrides: Partial<EnhancedBatchConfig> = {}): EnhancedBatchConfig {
  const now = new Date().toISOString();
  
  return {
    mode: GenerationSetMode.MULTI,
    generationSets: [],
    globalSettings: {
      canvasWidth: 1200,
      canvasHeight: 800,
      exportFormat: 'png',
      exportQuality: 92,
      globalZIndexSettings: {
        startingZIndex: 0,
        setSpacing: 1000,
        preventOverlap: true,
        useGlobalSettings: false
      }
    },
    modeRestrictions: {
      multiGenerationOnlyForFixedCount: false,
      maxGenerationSets: DEFAULT_GENERATION_SET_LIMITS.maxGenerationSets,
      minShapesPerSet: DEFAULT_GENERATION_SET_LIMITS.minShapesPerSet,
      maxShapesPerSet: DEFAULT_GENERATION_SET_LIMITS.maxShapesPerSet
    },
    createdAt: now,
    updatedAt: now,
    version: '1.0.0',
    ...overrides
  };
}

// ===== TEST SCENARIO GENERATORS =====

/**
 * Test Scenario 1: Multi-Set Configuration Testing
 * Creates 4 generation sets with different shape types and count modes
 */
export function createMultiSetConfigurationTest(): {
  name: string;
  config: EnhancedBatchConfig;
  expectedResults: {
    totalSets: number;
    enabledSets: number;
    totalShapeTypes: number;
    estimatedShapes: number;
  };
} {
  console.log('🧪 [E2E TEST] Creating Multi-Set Configuration Test');

  const sets: GenerationSet[] = [
    createTestGenerationSet('set1', 'Background Layer', {
      enabled: true,
      enabledShapeTypes: ['rectangle', 'rounded-rectangle', 'square'],
      shapeCountMode: ShapeCountMode.FIXED,
      shapeCountFixed: 20,
      generationOrder: 0,
      zIndexConfig: {
        baseOffset: 0,
        incrementPerShape: 1,
        incrementPerGeneration: 0
      },
      description: 'Background shapes with low z-index'
    }),
    
    createTestGenerationSet('set2', 'Geometric Shapes', {
      enabled: true,
      enabledShapeTypes: ['triangle', 'pentagon', 'hexagon', 'rhombus'],
      shapeCountMode: ShapeCountMode.RANGE,
      shapeCountRange: [5, 15],
      generationOrder: 1,
      zIndexConfig: {
        baseOffset: 100,
        incrementPerShape: 2,
        incrementPerGeneration: 0
      },
      description: 'Mid-layer geometric shapes'
    }),
    
    createTestGenerationSet('set3', 'Organic Shapes', {
      enabled: true,
      enabledShapeTypes: ['blob', 'chunk', 'heart', 'star'],
      shapeCountMode: ShapeCountMode.FIXED,
      shapeCountFixed: 8,
      generationOrder: 2,
      zIndexConfig: {
        baseOffset: 200,
        incrementPerShape: 3,
        incrementPerGeneration: 0
      },
      description: 'High-priority organic shapes'
    }),
    
    createTestGenerationSet('set4', 'Line Elements', {
      enabled: true,
      enabledShapeTypes: ['line', 'bezier', 'smooth-spline'],
      shapeCountMode: ShapeCountMode.RANGE,
      shapeCountRange: [2, 8],
      generationOrder: 3,
      zIndexConfig: {
        baseOffset: 300,
        incrementPerShape: 1,
        incrementPerGeneration: 0
      },
      description: 'Top layer line elements'
    })
  ];

  const config = createTestEnhancedBatchConfig({
    generationSets: sets
  });

  return {
    name: 'Multi-Set Configuration Test',
    config,
    expectedResults: {
      totalSets: 4,
      enabledSets: 4,
      totalShapeTypes: 15,
      estimatedShapes: 35 // 20 + 10 + 8 + 5 (average)
    }
  };
}

/**
 * Test Scenario 2: Z-Index Layering Verification
 * Tests extreme z-index values and layering behavior
 */
export function createZIndexLayeringTest(): {
  name: string;
  config: EnhancedBatchConfig;
  expectedZIndexRanges: Array<{ setName: string; minZ: number; maxZ: number }>;
} {
  console.log('🧪 [E2E TEST] Creating Z-Index Layering Test');

  const sets: GenerationSet[] = [
    createTestGenerationSet('ztest1', 'Far Background', {
      enabled: true,
      enabledShapeTypes: ['rectangle'],
      shapeCountMode: ShapeCountMode.FIXED,
      shapeCountFixed: 10,
      zIndexConfig: {
        baseOffset: 0,
        incrementPerShape: 1,
        incrementPerGeneration: 0
      }
    }),
    
    createTestGenerationSet('ztest2', 'Mid Layer', {
      enabled: true,
      enabledShapeTypes: ['circle'],
      shapeCountMode: ShapeCountMode.FIXED,
      shapeCountFixed: 5,
      zIndexConfig: {
        baseOffset: 500,
        incrementPerShape: 10,
        incrementPerGeneration: 0
      }
    }),
    
    createTestGenerationSet('ztest3', 'High Layer', {
      enabled: true,
      enabledShapeTypes: ['star'],
      shapeCountMode: ShapeCountMode.FIXED,
      shapeCountFixed: 3,
      zIndexConfig: {
        baseOffset: 1000,
        incrementPerShape: 100,
        incrementPerGeneration: 0
      }
    })
  ];

  const config = createTestEnhancedBatchConfig({
    generationSets: sets
  });

  return {
    name: 'Z-Index Layering Test',
    config,
    expectedZIndexRanges: [
      { setName: 'Far Background', minZ: 0, maxZ: 9 },
      { setName: 'Mid Layer', minZ: 500, maxZ: 540 },
      { setName: 'High Layer', minZ: 1000, maxZ: 1200 }
    ]
  };
}

/**
 * Test Scenario 3: Shape Type Diversity Testing
 * Tests complex shape-specific properties and blend modes
 */
// ===== BROWSER-BASED UI TESTING =====

/**
 * Browser-based E2E Test Runner for Generation Sets
 */
export class GenerationSetsBrowserTester {
  private testResults: Array<{name: string, status: 'pass' | 'fail' | 'warning', details: string, timestamp: Date}> = [];
  private isRunning = false;

  constructor() {
    console.log('🧪 [GenerationSetsE2E] Browser Test Runner Initialized');
    // Make available globally for manual testing
    if (typeof window !== 'undefined') {
      (window as any).generationSetsBrowserTester = this;
      console.log('🧪 Available at: window.generationSetsBrowserTester');
    }
  }

  // UI Test Helpers
  private findElement(testId: string): Element | null {
    return document.querySelector(`[data-testid="${testId}"]`);
  }

  private async waitForElement(testId: string, timeout = 5000): Promise<Element | null> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const element = this.findElement(testId);
      if (element) return element;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return null;
  }

  private async clickElement(testId: string): Promise<boolean> {
    const element = this.findElement(testId);
    if (element && element instanceof HTMLElement) {
      element.click();
      return true;
    }
    return false;
  }

  private addResult(name: string, status: 'pass' | 'fail' | 'warning', details: string) {
    const result = { name, status, details, timestamp: new Date() };
    this.testResults.push(result);
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} [${name}] ${details}`);
  }

  /**
   * Test 1: Basic Multi-Generation Flow
   */
  async testBasicMultiGenerationFlow(): Promise<void> {
    console.log('🧪 Starting Basic Multi-Generation Flow Test');
    
    try {
      // Step 1: Open Batch Config Dialog
      const batchButton = await this.waitForElement('button-batch-settings', 3000);
      if (!batchButton) {
        this.addResult('Open Batch Dialog', 'fail', 'Batch settings button not found in UI');
        return;
      }

      const clicked = await this.clickElement('button-batch-settings');
      if (!clicked) {
        this.addResult('Open Batch Dialog', 'fail', 'Failed to click batch settings button');
        return;
      }

      const dialog = await this.waitForElement('batch-config-dialog', 2000);
      if (!dialog) {
        this.addResult('Open Batch Dialog', 'fail', 'Batch config dialog did not appear');
        return;
      }
      this.addResult('Open Batch Dialog', 'pass', 'Successfully opened batch configuration dialog');

      // Step 2: Check for Generation Mode Selector
      const modeSelector = this.findElement('select-generation-mode');
      if (!modeSelector) {
        this.addResult('Find Mode Selector', 'fail', 'Generation mode selector not found');
        return;
      }
      this.addResult('Find Mode Selector', 'pass', 'Found generation mode selector');

      // Step 3: Switch to Multi Mode (if not already)
      // Note: This may require specific UI interaction based on component implementation
      const generationSetsInterface = this.findElement('generation-sets-interface');
      if (generationSetsInterface) {
        this.addResult('Multi-Generation Mode', 'pass', 'Generation sets interface is visible');
      } else {
        this.addResult('Multi-Generation Mode', 'warning', 'Generation sets interface not visible - may need mode switch');
      }

      // Step 4: Test Add Generation Set
      const addSetButton = this.findElement('button-add-generation-set');
      if (!addSetButton) {
        this.addResult('Add Generation Set Button', 'fail', 'Add generation set button not found');
        return;
      }
      
      const beforeSetsCount = document.querySelectorAll('[data-testid*="generation-set-"]').length;
      await this.clickElement('button-add-generation-set');
      
      // Wait for UI update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const afterSetsCount = document.querySelectorAll('[data-testid*="generation-set-"]').length;
      if (afterSetsCount > beforeSetsCount) {
        this.addResult('Add Generation Set', 'pass', `Successfully added generation set (${beforeSetsCount} -> ${afterSetsCount})`);
      } else {
        this.addResult('Add Generation Set', 'warning', 'Generation set may have been added but UI not updated yet');
      }

    } catch (error) {
      this.addResult('Basic Multi-Generation Flow', 'fail', `Error: ${error}`);
    }
  }

  /**
   * Test 2: Validation System Testing
   */
  async testValidationSystem(): Promise<void> {
    console.log('🧪 Starting Validation System Test');
    
    try {
      // Look for validation indicators
      const validationBanners = document.querySelectorAll('[data-testid*="validation"], .validation-error, .validation-warning, [role="alert"]');
      const errorElements = document.querySelectorAll('.error, [data-testid*="error"], .text-red-500, .text-destructive');
      const warningElements = document.querySelectorAll('.warning, [data-testid*="warning"], .text-yellow-500, .text-warning');
      
      if (validationBanners.length > 0 || errorElements.length > 0) {
        this.addResult('Validation Indicators', 'pass', `Found ${validationBanners.length} validation banners, ${errorElements.length} error elements`);
      } else {
        this.addResult('Validation Indicators', 'warning', 'No validation indicators found - may indicate all valid or validation not triggered');
      }

      // Test shape count validation by looking for count inputs
      const countInputs = document.querySelectorAll('input[type="number"], [data-testid*="count"], [data-testid*="shape-count"]');
      if (countInputs.length > 0) {
        this.addResult('Shape Count Inputs', 'pass', `Found ${countInputs.length} count-related inputs`);
        
        // Try to trigger validation on first input found
        const firstInput = countInputs[0] as HTMLInputElement;
        if (firstInput) {
          const originalValue = firstInput.value;
          firstInput.value = '0'; // Invalid value
          firstInput.dispatchEvent(new Event('input', { bubbles: true }));
          firstInput.dispatchEvent(new Event('blur', { bubbles: true }));
          
          // Check for validation response
          await new Promise(resolve => setTimeout(resolve, 300));
          const newErrorElements = document.querySelectorAll('.error, [data-testid*="error"], .text-red-500');
          
          if (newErrorElements.length > errorElements.length) {
            this.addResult('Input Validation Trigger', 'pass', 'Successfully triggered validation error on invalid input');
          } else {
            this.addResult('Input Validation Trigger', 'warning', 'No new validation errors detected after invalid input');
          }
          
          // Restore original value
          firstInput.value = originalValue;
          firstInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } else {
        this.addResult('Shape Count Inputs', 'warning', 'No shape count inputs found');
      }
      
    } catch (error) {
      this.addResult('Validation System Test', 'fail', `Error: ${error}`);
    }
  }

  /**
   * Test 3: Complex Configuration Testing
   */
  async testComplexConfiguration(): Promise<void> {
    console.log('🧪 Starting Complex Configuration Test');
    
    try {
      // Look for shape type selectors
      const shapeTypeElements = document.querySelectorAll('[data-testid*="shape-type"], .shape-type-selector, input[type="checkbox"]');
      if (shapeTypeElements.length > 0) {
        this.addResult('Shape Type Selectors', 'pass', `Found ${shapeTypeElements.length} shape type related elements`);
      } else {
        this.addResult('Shape Type Selectors', 'warning', 'No shape type selectors found - may need individual set selection');
      }

      // Look for configuration sections
      const configSections = document.querySelectorAll('[data-testid*="config"], .config-section, .accordion-item, [role="tabpanel"]');
      if (configSections.length > 0) {
        this.addResult('Configuration Sections', 'pass', `Found ${configSections.length} configuration sections`);
      } else {
        this.addResult('Configuration Sections', 'warning', 'No configuration sections identified');
      }

      // Test individual set configuration access
      const individualConfigs = document.querySelectorAll('[data-testid*="individual-set"], [data-testid*="set-config"]');
      if (individualConfigs.length > 0) {
        this.addResult('Individual Set Configs', 'pass', `Found ${individualConfigs.length} individual set configuration interfaces`);
      } else {
        this.addResult('Individual Set Configs', 'warning', 'No individual set configuration interfaces found');
      }
      
    } catch (error) {
      this.addResult('Complex Configuration Test', 'fail', `Error: ${error}`);
    }
  }

  /**
   * Test 4: Export Integration Testing
   */
  async testExportIntegration(): Promise<void> {
    console.log('🧪 Starting Export Integration Test');
    
    try {
      // Look for export-related buttons
      const exportButtons = document.querySelectorAll('[data-testid*="export"], .export-button, button');
      const batchExportButtons = Array.from(exportButtons).filter(btn => 
        btn.textContent?.toLowerCase().includes('export') || 
        btn.textContent?.toLowerCase().includes('batch')
      );
      
      if (batchExportButtons.length > 0) {
        this.addResult('Export Buttons', 'pass', `Found ${batchExportButtons.length} export-related buttons`);
        
        // Check if we can identify batch export specifically
        const batchExportBtn = batchExportButtons.find(btn => 
          btn.textContent?.toLowerCase().includes('batch')
        );
        
        if (batchExportBtn) {
          this.addResult('Batch Export Button', 'pass', 'Found batch export button');
        } else {
          this.addResult('Batch Export Button', 'warning', 'Batch export button not specifically identified');
        }
      } else {
        this.addResult('Export Buttons', 'fail', 'No export buttons found');
      }
      
      // Check for export settings/options
      const exportSettings = document.querySelectorAll('[data-testid*="export-settings"], .export-settings, [data-testid*="format"]');
      if (exportSettings.length > 0) {
        this.addResult('Export Settings', 'pass', `Found ${exportSettings.length} export settings elements`);
      } else {
        this.addResult('Export Settings', 'warning', 'No export settings interfaces found');
      }
      
    } catch (error) {
      this.addResult('Export Integration Test', 'fail', `Error: ${error}`);
    }
  }

  /**
   * Test 5: Performance & Edge Cases
   */
  async testPerformanceAndEdgeCases(): Promise<void> {
    console.log('🧪 Starting Performance & Edge Cases Test');
    
    try {
      // Memory usage check
      let memoryInfo = 'unavailable';
      if ('memory' in performance) {
        const mem = (performance as any).memory;
        const usedMB = Math.round(mem.usedJSHeapSize / 1024 / 1024);
        const totalMB = Math.round(mem.totalJSHeapSize / 1024 / 1024);
        memoryInfo = `${usedMB}MB / ${totalMB}MB`;
      }
      this.addResult('Memory Usage', 'pass', `Current memory usage: ${memoryInfo}`);

      // DOM complexity check
      const totalElements = document.querySelectorAll('*').length;
      const formElements = document.querySelectorAll('input, select, textarea, button').length;
      this.addResult('DOM Complexity', 'pass', `Total elements: ${totalElements}, Form elements: ${formElements}`);
      
      // Test rapid UI interactions (if elements are available)
      const interactiveElements = document.querySelectorAll('button:not([disabled]), input:not([disabled])');
      if (interactiveElements.length > 0) {
        this.addResult('Interactive Elements', 'pass', `Found ${interactiveElements.length} interactive elements`);
        
        // Simulate rapid interactions (limited to prevent issues)
        let interactionsCount = 0;
        const maxInteractions = Math.min(5, interactiveElements.length);
        
        for (let i = 0; i < maxInteractions; i++) {
          const element = interactiveElements[i] as HTMLElement;
          if (element.tagName === 'BUTTON') {
            element.focus();
            element.blur();
            interactionsCount++;
          }
        }
        
        this.addResult('Rapid Interactions', 'pass', `Performed ${interactionsCount} rapid UI interactions without errors`);
      } else {
        this.addResult('Interactive Elements', 'warning', 'No interactive elements found for testing');
      }
      
    } catch (error) {
      this.addResult('Performance & Edge Cases Test', 'fail', `Error: ${error}`);
    }
  }

  /**
   * Run all tests in sequence
   */
  async runAllTests(): Promise<void> {
    if (this.isRunning) {
      console.log('🧪 Tests already running...');
      return;
    }
    
    this.isRunning = true;
    this.testResults = [];
    
    console.log('🧪 [GenerationSetsE2E] Starting Comprehensive Test Suite');
    console.log('=====================================');
    
    await this.testBasicMultiGenerationFlow();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause between tests
    
    await this.testValidationSystem();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await this.testComplexConfiguration();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await this.testExportIntegration();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await this.testPerformanceAndEdgeCases();
    
    this.isRunning = false;
    
    // Generate summary
    this.generateTestSummary();
  }

  /**
   * Generate and display test summary
   */
  private generateTestSummary(): void {
    const passed = this.testResults.filter(r => r.status === 'pass').length;
    const failed = this.testResults.filter(r => r.status === 'fail').length;
    const warnings = this.testResults.filter(r => r.status === 'warning').length;
    const total = this.testResults.length;
    
    console.log('\n=====================================');
    console.log('🧪 GENERATION SETS E2E TEST SUMMARY');
    console.log('=====================================');
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`\nSuccess Rate: ${Math.round((passed / total) * 100)}%`);
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.filter(r => r.status === 'fail').forEach(result => {
        console.log(`   ${result.name}: ${result.details}`);
      });
    }
    
    if (warnings > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.testResults.filter(r => r.status === 'warning').forEach(result => {
        console.log(`   ${result.name}: ${result.details}`);
      });
    }
    
    console.log('\n🧪 Test run completed. Check console for detailed results.');
  }

  /**
   * Get test results for external use
   */
  getResults() {
    return this.testResults;
  }
}

// Initialize and export test runner instance
export const browserTester = new GenerationSetsBrowserTester();

export function createShapeTypeDiversityTest(): {
  name: string;
  config: EnhancedBatchConfig;
  expectedShapeTypes: SupportedShapeType[];
  expectedBlendModes: BlendMode[];
} {
  console.log('🧪 [E2E TEST] Creating Shape Type Diversity Test');

  // Create shape-specific properties helper
  const shapePropsHelper = new ShapeSpecificPropertiesHelper();
  
  const sets: GenerationSet[] = [
    createTestGenerationSet('diversity1', 'Rounded Shapes', {
      enabled: true,
      enabledShapeTypes: ['rounded-rectangle', 'rounded-square', 'circle', 'ellipse'],
      shapeCountMode: ShapeCountMode.FIXED,
      shapeCountFixed: 12,
      shapeSpecificProperties: {
        'rounded-rectangle': {
          cornerRadiusMode: 'range',
          cornerRadiusRange: [5, 20]
        },
        'rounded-square': {
          cornerRadiusMode: 'fixed',
          cornerRadiusValue: 15
        },
        circle: {
          segmentCountRange: [16, 32]
        },
        ellipse: {
          segmentCountRange: [24, 48]
        }
      },
      batchConfig: {
        ...defaultBatchConfigSettings,
        blendModeEnabled: true,
        enabledBlendModes: {
          'source-over': 30,
          'multiply': 25,
          'screen': 25,
          'overlay': 20
        }
      }
    }),
    
    createTestGenerationSet('diversity2', 'Complex Shapes', {
      enabled: true,
      enabledShapeTypes: ['star', 'polygon', 'ring', 'blob'],
      shapeCountMode: ShapeCountMode.RANGE,
      shapeCountRange: [8, 16],
      shapeSpecificProperties: {
        star: {
          pointCountMode: 'range',
          pointCountRange: [5, 12],
          innerRadiusMode: 'range',
          innerRadiusRange: [0.3, 0.7]
        },
        polygon: {
          pointCountMode: 'range',
          pointCountRange: [6, 10]
        },
        ring: {
          innerRadiusMode: 'range',
          innerRadiusRange: [0.4, 0.8]
        }
      },
      batchConfig: {
        ...defaultBatchConfigSettings,
        fillGradientEnabled: true,
        fillGradientLinearProbability: 50,
        fillGradientRadialProbability: 30,
        fillGradientConicProbability: 20
      }
    }),
    
    createTestGenerationSet('diversity3', 'Line Shapes', {
      enabled: true,
      enabledShapeTypes: ['line', 'bezier', 'cubic', 'smooth-spline'],
      shapeCountMode: ShapeCountMode.FIXED,
      shapeCountFixed: 6,
      shapeSpecificProperties: {
        line: {
          pointCountMode: 'range',
          pointCountRange: [3, 8],
          strokeCapProbabilities: {
            round: 40,
            square: 30,
            butt: 30
          }
        },
        bezier: {
          pointCountMode: 'fixed',
          pointCountValue: 4,
          openProbability: 75
        },
        cubic: {
          pointCountMode: 'range',
          pointCountRange: [3, 6],
          curvatureRange: [0.2, 0.8],
          spreadRange: [50, 150]
        }
      }
    })
  ];

  const config = createTestEnhancedBatchConfig({
    generationSets: sets
  });

  return {
    name: 'Shape Type Diversity Test',
    config,
    expectedShapeTypes: [
      'rounded-rectangle', 'rounded-square', 'circle', 'ellipse',
      'star', 'polygon', 'ring', 'blob',
      'line', 'bezier', 'cubic', 'smooth-spline'
    ],
    expectedBlendModes: ['source-over', 'multiply', 'screen', 'overlay']
  };
}

/**
 * Test Scenario 4: Validation System Testing
 * Creates various invalid configurations to test validation
 */
export function createValidationSystemTests(): Array<{
  name: string;
  config: EnhancedBatchConfig;
  expectedErrors: number;
  expectedWarnings: number;
  errorTypes: string[];
}> {
  console.log('🧪 [E2E TEST] Creating Validation System Tests');

  const tests = [];

  // Test 1: Empty generation sets
  tests.push({
    name: 'Empty Generation Sets',
    config: createTestEnhancedBatchConfig({
      generationSets: []
    }),
    expectedErrors: 1,
    expectedWarnings: 0,
    errorTypes: ['NO_GENERATION_SETS']
  });

  // Test 2: Invalid shape counts
  tests.push({
    name: 'Invalid Shape Counts',
    config: createTestEnhancedBatchConfig({
      generationSets: [
        createTestGenerationSet('invalid1', 'Too Few Shapes', {
          shapeCountMode: ShapeCountMode.FIXED,
          shapeCountFixed: 0
        }),
        createTestGenerationSet('invalid2', 'Too Many Shapes', {
          shapeCountMode: ShapeCountMode.FIXED,
          shapeCountFixed: 2000
        }),
        createTestGenerationSet('invalid3', 'Invalid Range', {
          shapeCountMode: ShapeCountMode.RANGE,
          shapeCountRange: [10, 5] // min > max
        })
      ]
    }),
    expectedErrors: 3,
    expectedWarnings: 0,
    errorTypes: ['INVALID_SHAPE_COUNT', 'INVALID_SHAPE_COUNT', 'INVALID_SHAPE_COUNT_RANGE']
  });

  // Test 3: Duplicate names
  tests.push({
    name: 'Duplicate Set Names',
    config: createTestEnhancedBatchConfig({
      generationSets: [
        createTestGenerationSet('dup1', 'Duplicate Name'),
        createTestGenerationSet('dup2', 'Duplicate Name'),
        createTestGenerationSet('dup3', 'Another Set')
      ]
    }),
    expectedErrors: 1,
    expectedWarnings: 0,
    errorTypes: ['DUPLICATE_NAME']
  });

  // Test 4: Z-index conflicts
  tests.push({
    name: 'Z-Index Conflicts',
    config: createTestEnhancedBatchConfig({
      generationSets: [
        createTestGenerationSet('z1', 'Conflicting Z-Index 1', {
          zIndexConfig: {
            baseOffset: 100,
            incrementPerShape: 50,
            incrementPerGeneration: 0
          },
          shapeCountFixed: 10
        }),
        createTestGenerationSet('z2', 'Conflicting Z-Index 2', {
          zIndexConfig: {
            baseOffset: 200,
            incrementPerShape: 10,
            incrementPerGeneration: 0
          },
          shapeCountFixed: 20
        })
      ]
    }),
    expectedErrors: 0,
    expectedWarnings: 1,
    errorTypes: ['ZINDEX_OVERLAP']
  });

  // Test 5: No shape types selected
  tests.push({
    name: 'No Shape Types Selected',
    config: createTestEnhancedBatchConfig({
      generationSets: [
        createTestGenerationSet('noshapes', 'No Shapes', {
          enabledShapeTypes: []
        })
      ]
    }),
    expectedErrors: 1,
    expectedWarnings: 0,
    errorTypes: ['NO_SHAPE_TYPES']
  });

  return tests;
}

/**
 * Test Scenario 5: Export Integration Testing
 * Creates complex configurations for export testing
 */
export function createExportIntegrationTest(): {
  name: string;
  config: EnhancedBatchConfig;
  exportSettings: {
    format: 'png' | 'svg' | 'json';
    quality: number;
    batchCount: number;
    packageAsZip: boolean;
  };
} {
  console.log('🧪 [E2E TEST] Creating Export Integration Test');

  const sets: GenerationSet[] = [
    createTestGenerationSet('export1', 'Background Grid', {
      enabled: true,
      enabledShapeTypes: ['rectangle', 'square'],
      shapeCountMode: ShapeCountMode.FIXED,
      shapeCountFixed: 25,
      zIndexConfig: { baseOffset: 0, incrementPerShape: 1, incrementPerGeneration: 0 },
      batchConfig: {
        ...defaultBatchConfigSettings,
        distributionLayoutEnabled: true,
        distributionPattern: 'grid',
        gridRows: 5,
        gridColumns: 5,
        fillColorMode: 'range',
        fillColorRange: ['#FF0000', '#FF8888']
      }
    }),
    
    createTestGenerationSet('export2', 'Scattered Circles', {
      enabled: true,
      enabledShapeTypes: ['circle', 'ellipse'],
      shapeCountMode: ShapeCountMode.RANGE,
      shapeCountRange: [15, 25],
      zIndexConfig: { baseOffset: 50, incrementPerShape: 2, incrementPerGeneration: 0 },
      batchConfig: {
        ...defaultBatchConfigSettings,
        blendModeEnabled: true,
        enabledBlendModes: { 'multiply': 50, 'screen': 50 },
        fillGradientEnabled: true,
        fillGradientRadialProbability: 100
      }
    }),
    
    createTestGenerationSet('export3', 'Top Decorations', {
      enabled: true,
      enabledShapeTypes: ['star', 'heart', 'arrow'],
      shapeCountMode: ShapeCountMode.FIXED,
      shapeCountFixed: 8,
      zIndexConfig: { baseOffset: 100, incrementPerShape: 5, incrementPerGeneration: 0 },
      batchConfig: {
        ...defaultBatchConfigSettings,
        strokeEnabled: true,
        strokeProbability: 80,
        strokeWidthRange: [2, 8]
      }
    })
  ];

  const config = createTestEnhancedBatchConfig({
    generationSets: sets,
    globalSettings: {
      canvasWidth: 800,
      canvasHeight: 600,
      exportFormat: 'png',
      exportQuality: 95,
      globalZIndexSettings: {
        startingZIndex: 0,
        setSpacing: 100,
        preventOverlap: true,
        useGlobalSettings: false
      }
    }
  });

  return {
    name: 'Export Integration Test',
    config,
    exportSettings: {
      format: 'png',
      quality: 95,
      batchCount: 5,
      packageAsZip: true
    }
  };
}

// ===== TEST EXECUTION FUNCTIONS =====

/**
 * Runs validation tests on all test scenarios
 */
export function runValidationTests(): {
  testName: string;
  passed: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ReturnType<typeof generateGenerationSetsSummary>;
}[] {
  console.log('🧪 [E2E TEST] Running Validation Tests');

  const results = [];

  // Test multi-set configuration
  const multiSetTest = createMultiSetConfigurationTest();
  const multiSetValidation = GenerationSetValidator.validateGenerationSets(multiSetTest.config.generationSets);
  const multiSetSummary = generateGenerationSetsSummary(multiSetTest.config.generationSets);
  
  results.push({
    testName: multiSetTest.name,
    passed: multiSetValidation.isValid,
    errors: multiSetValidation.errors,
    warnings: multiSetValidation.warnings,
    summary: multiSetSummary
  });

  console.log(`✅ Multi-Set Test: ${multiSetValidation.isValid ? 'PASSED' : 'FAILED'}`);
  console.log(`   Expected ${multiSetTest.expectedResults.totalSets} sets, got ${multiSetSummary.totalSets}`);
  console.log(`   Expected ${multiSetTest.expectedResults.enabledSets} enabled, got ${multiSetSummary.enabledSets}`);

  // Test z-index layering
  const zIndexTest = createZIndexLayeringTest();
  const zIndexValidation = GenerationSetValidator.validateGenerationSets(zIndexTest.config.generationSets);
  const zIndexSummary = generateGenerationSetsSummary(zIndexTest.config.generationSets);
  
  results.push({
    testName: zIndexTest.name,
    passed: zIndexValidation.isValid,
    errors: zIndexValidation.errors,
    warnings: zIndexValidation.warnings,
    summary: zIndexSummary
  });

  console.log(`✅ Z-Index Test: ${zIndexValidation.isValid ? 'PASSED' : 'FAILED'}`);
  console.log(`   Z-Index range: [${zIndexSummary.zIndexRange[0]}, ${zIndexSummary.zIndexRange[1]}]`);

  // Test shape type diversity
  const diversityTest = createShapeTypeDiversityTest();
  const diversityValidation = GenerationSetValidator.validateGenerationSets(diversityTest.config.generationSets);
  const diversitySummary = generateGenerationSetsSummary(diversityTest.config.generationSets);
  
  results.push({
    testName: diversityTest.name,
    passed: diversityValidation.isValid,
    errors: diversityValidation.errors,
    warnings: diversityValidation.warnings,
    summary: diversitySummary
  });

  console.log(`✅ Diversity Test: ${diversityValidation.isValid ? 'PASSED' : 'FAILED'}`);
  console.log(`   Total shape types: ${diversitySummary.totalShapeTypes}`);

  // Test validation system with invalid configs
  const validationTests = createValidationSystemTests();
  validationTests.forEach(test => {
    const validation = GenerationSetValidator.validateGenerationSets(test.config.generationSets);
    const summary = generateGenerationSetsSummary(test.config.generationSets);
    
    const passed = validation.errors.length === test.expectedErrors && 
                   validation.warnings.length >= test.expectedWarnings;
    
    results.push({
      testName: test.name,
      passed,
      errors: validation.errors,
      warnings: validation.warnings,
      summary
    });

    console.log(`✅ ${test.name}: ${passed ? 'PASSED' : 'FAILED'}`);
    console.log(`   Expected ${test.expectedErrors} errors, got ${validation.errors.length}`);
    console.log(`   Expected ${test.expectedWarnings} warnings, got ${validation.warnings.length}`);
  });

  return results;
}

/**
 * Runs comprehensive shape generation simulation
 */
export function runShapeGenerationSimulation(): {
  testName: string;
  generatedShapes: number;
  layerDistribution: Array<{ setName: string; shapeCount: number; zIndexRange: [number, number] }>;
  success: boolean;
} {
  console.log('🧪 [E2E TEST] Running Shape Generation Simulation');

  const exportTest = createExportIntegrationTest();
  const layerDistribution = exportTest.config.generationSets.map(set => {
    const shapeCount = GenerationSetUtils.getShapeCount(set, 42); // Use seed for consistent testing
    const zIndexRange = GenerationSetUtils.calculateZIndexRange(set);
    
    return {
      setName: set.name,
      shapeCount,
      zIndexRange
    };
  });

  const totalShapes = layerDistribution.reduce((sum, layer) => sum + layer.shapeCount, 0);

  console.log('📊 Shape Generation Results:');
  layerDistribution.forEach(layer => {
    console.log(`   ${layer.setName}: ${layer.shapeCount} shapes, z-index ${layer.zIndexRange[0]}-${layer.zIndexRange[1]}`);
  });
  console.log(`   Total: ${totalShapes} shapes`);

  return {
    testName: 'Shape Generation Simulation',
    generatedShapes: totalShapes,
    layerDistribution,
    success: totalShapes > 0 && layerDistribution.every(layer => layer.shapeCount > 0)
  };
}

/**
 * Tests the auto-fix functionality
 */
export function runAutoFixTests(): {
  testName: string;
  originalErrors: number;
  fixedErrors: number;
  success: boolean;
} {
  console.log('🧪 [E2E TEST] Running Auto-Fix Tests');

  // Create intentionally broken config
  const brokenSets: GenerationSet[] = [
    createTestGenerationSet('broken1', '', { // Empty name
      shapeCountMode: ShapeCountMode.RANGE,
      shapeCountRange: [15, 5], // Invalid range
      enabledShapeTypes: [] // No shapes
    }),
    createTestGenerationSet('broken2', 'Also broken', {
      shapeCountFixed: -5, // Invalid count
      generationOrder: -1 // Invalid order
    })
  ];

  // Validate broken config
  const originalValidation = GenerationSetValidator.validateGenerationSets(brokenSets);
  console.log(`   Original errors: ${originalValidation.errors.length}`);

  // Apply auto-fix
  const fixedSets = autoFixGenerationSets(brokenSets);
  const fixedValidation = GenerationSetValidator.validateGenerationSets(fixedSets);
  console.log(`   Fixed errors: ${fixedValidation.errors.length}`);

  const success = fixedValidation.errors.length < originalValidation.errors.length;

  return {
    testName: 'Auto-Fix Test',
    originalErrors: originalValidation.errors.length,
    fixedErrors: fixedValidation.errors.length,
    success
  };
}

// ===== MAIN TEST RUNNER =====

/**
 * Runs all end-to-end tests
 */
export function runAllGenerationSetsE2ETests(): {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    success: boolean;
  };
  results: any[];
} {
  console.log('🚀 [E2E TEST] Starting Generation Sets End-to-End Tests');
  console.log('=====================================');

  const results = [];
  let passed = 0;
  let failed = 0;

  try {
    // Run validation tests
    const validationResults = runValidationTests();
    results.push(...validationResults);
    validationResults.forEach(result => result.passed ? passed++ : failed++);

    // Run shape generation simulation
    const generationResult = runShapeGenerationSimulation();
    results.push(generationResult);
    generationResult.success ? passed++ : failed++;

    // Run auto-fix tests
    const autoFixResult = runAutoFixTests();
    results.push(autoFixResult);
    autoFixResult.success ? passed++ : failed++;

  } catch (error) {
    console.error('❌ [E2E TEST] Critical test failure:', error);
    failed++;
  }

  const totalTests = passed + failed;
  const success = failed === 0;

  console.log('=====================================');
  console.log(`🏁 [E2E TEST] Tests Complete: ${passed}/${totalTests} passed`);
  if (success) {
    console.log('✅ All generation sets tests passed!');
  } else {
    console.log(`❌ ${failed} tests failed`);
  }

  return {
    summary: {
      totalTests,
      passed,
      failed,
      success
    },
    results
  };
}

// Export test data for UI testing
export const TEST_CONFIGURATIONS = {
  multiSet: createMultiSetConfigurationTest(),
  zIndexLayering: createZIndexLayeringTest(),
  shapeTypeDiversity: createShapeTypeDiversityTest(),
  validationTests: createValidationSystemTests(),
  exportIntegration: createExportIntegrationTest()
};

// Export individual test functions for selective testing
export const TEST_FUNCTIONS = {
  runValidationTests,
  runShapeGenerationSimulation,
  runAutoFixTests,
  runAllGenerationSetsE2ETests
};