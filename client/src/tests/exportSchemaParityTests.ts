// Parity tests to ensure server defaults match shared defaults exactly
// This prevents the original issue where multiple implementations had different defaults

import { DEFAULT_BATCH_EXPORT_SETTINGS, EXPORT_SCOPE_ORDER, DEFAULT_EXPORT_SCOPE } from '@shared/exportSchema';
import { ExportService } from '../../../server/services/exportService';

export class ExportSchemaParityTests {
  private exportService = new ExportService();

  // Test that server defaults match shared schema defaults exactly
  testBatchSettingsParity(): boolean {
    const serverDefaults = this.exportService.getDefaultBatchSettings();
    const sharedDefaults = DEFAULT_BATCH_EXPORT_SETTINGS;
    
    console.log('🔍 [PARITY TEST] Comparing server defaults with shared schema defaults...');
    
    // Check each field for exact match
    const fields = Object.keys(sharedDefaults) as (keyof typeof sharedDefaults)[];
    let allMatch = true;
    
    for (const field of fields) {
      const serverValue = serverDefaults[field];
      const sharedValue = sharedDefaults[field];
      
      if (serverValue !== sharedValue) {
        console.error(`❌ [PARITY MISMATCH] Field "${field}": server="${serverValue}", shared="${sharedValue}"`);
        allMatch = false;
      } else {
        console.log(`✅ [PARITY MATCH] Field "${field}": "${serverValue}"`);
      }
    }
    
    // Check for any extra fields in server defaults
    const serverFields = Object.keys(serverDefaults);
    const sharedFields = Object.keys(sharedDefaults);
    
    const extraServerFields = serverFields.filter(field => !sharedFields.includes(field));
    const missingServerFields = sharedFields.filter(field => !serverFields.includes(field));
    
    if (extraServerFields.length > 0) {
      console.error(`❌ [PARITY MISMATCH] Extra fields in server defaults: ${extraServerFields.join(', ')}`);
      allMatch = false;
    }
    
    if (missingServerFields.length > 0) {
      console.error(`❌ [PARITY MISMATCH] Missing fields in server defaults: ${missingServerFields.join(', ')}`);
      allMatch = false;
    }
    
    if (allMatch) {
      console.log('✅ [PARITY SUCCESS] All batch settings match between server and shared schema');
    } else {
      console.error('❌ [PARITY FAILURE] Batch settings mismatch detected');
    }
    
    return allMatch;
  }

  // Test that export scope order is correct
  testExportScopeOrder(): boolean {
    const expectedOrder = ['all', 'artboard', 'selected'];
    const actualOrder = [...EXPORT_SCOPE_ORDER];
    
    console.log('🔍 [PARITY TEST] Checking export scope order...');
    console.log(`Expected: [${expectedOrder.join(', ')}]`);
    console.log(`Actual: [${actualOrder.join(', ')}]`);
    
    const isCorrect = JSON.stringify(expectedOrder) === JSON.stringify(actualOrder);
    
    if (isCorrect) {
      console.log('✅ [PARITY SUCCESS] Export scope order is correct');
    } else {
      console.error('❌ [PARITY FAILURE] Export scope order mismatch');
    }
    
    return isCorrect;
  }

  // Test that default export scope is "all"
  testDefaultExportScope(): boolean {
    console.log('🔍 [PARITY TEST] Checking default export scope...');
    console.log(`Expected: "all"`);
    console.log(`Actual: "${DEFAULT_EXPORT_SCOPE}"`);
    
    const isCorrect = DEFAULT_EXPORT_SCOPE === 'all';
    
    if (isCorrect) {
      console.log('✅ [PARITY SUCCESS] Default export scope is "all"');
    } else {
      console.error('❌ [PARITY FAILURE] Default export scope is not "all"');
    }
    
    return isCorrect;
  }

  // Run all parity tests
  runAllTests(): boolean {
    console.log('🧪 [EXPORT SCHEMA PARITY] Running all parity tests...\n');
    
    const results = [
      this.testBatchSettingsParity(),
      this.testExportScopeOrder(),
      this.testDefaultExportScope()
    ];
    
    const allPassed = results.every(result => result === true);
    const passedCount = results.filter(result => result === true).length;
    
    console.log(`\n📊 [TEST SUMMARY] ${passedCount}/${results.length} tests passed`);
    
    if (allPassed) {
      console.log('🎉 [ALL TESTS PASSED] Export schema parity verified');
    } else {
      console.error('💥 [TESTS FAILED] Export schema parity issues detected');
    }
    
    return allPassed;
  }
}

// Export for use in other test suites or manual testing
export const exportSchemaParityTests = new ExportSchemaParityTests();

// Auto-run tests in development (can be disabled in production)
if (typeof window !== 'undefined') {
  // Browser environment - make available globally for manual testing
  (window as any).exportSchemaParityTests = exportSchemaParityTests;
  
  // Auto-run on import in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 [DEV MODE] Auto-running export schema parity tests...');
    exportSchemaParityTests.runAllTests();
  }
}