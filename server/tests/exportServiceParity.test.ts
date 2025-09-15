// Parity tests to ensure server defaults match shared schema defaults
// This prevents drift between server and client default values

import { ExportService } from '../services/exportService';
import { DEFAULT_BATCH_EXPORT_SETTINGS, CanonicalBatchExportSettings } from '../../shared/exportSchema';

describe('Export Service Parity Tests', () => {
  let exportService: ExportService;

  beforeEach(() => {
    exportService = new ExportService();
  });

  test('ExportService.getDefaultBatchSettings() matches shared DEFAULT_BATCH_EXPORT_SETTINGS', () => {
    const serverDefaults = exportService.getDefaultBatchSettings();
    const sharedDefaults = DEFAULT_BATCH_EXPORT_SETTINGS;

    // Test each property individually for clear error messages
    expect(serverDefaults.format).toBe(sharedDefaults.format);
    expect(serverDefaults.quality).toBe(sharedDefaults.quality);
    expect(serverDefaults.scale).toBe(sharedDefaults.scale);
    expect(serverDefaults.useCustomSize).toBe(sharedDefaults.useCustomSize);
    expect(serverDefaults.includeBackground).toBe(sharedDefaults.includeBackground);
    expect(serverDefaults.backgroundColor).toBe(sharedDefaults.backgroundColor);
    expect(serverDefaults.useMargins).toBe(sharedDefaults.useMargins);
    expect(serverDefaults.uniformMargins).toBe(sharedDefaults.uniformMargins);
    expect(serverDefaults.marginTop).toBe(sharedDefaults.marginTop);
    expect(serverDefaults.marginRight).toBe(sharedDefaults.marginRight);
    expect(serverDefaults.marginBottom).toBe(sharedDefaults.marginBottom);
    expect(serverDefaults.marginLeft).toBe(sharedDefaults.marginLeft);
    expect(serverDefaults.batchExportCount).toBe(sharedDefaults.batchExportCount);
    expect(serverDefaults.batchSaveProjectFiles).toBe(sharedDefaults.batchSaveProjectFiles);
    expect(serverDefaults.packageAsZip).toBe(sharedDefaults.packageAsZip);
    expect(serverDefaults.includeAdornments).toBe(sharedDefaults.includeAdornments);
    expect(serverDefaults.includeGrid).toBe(sharedDefaults.includeGrid);
    expect(serverDefaults.includeArtboardGeometry).toBe(sharedDefaults.includeArtboardGeometry);
    expect(serverDefaults.includeTypeInName).toBe(sharedDefaults.includeTypeInName);
  });

  test('Server and shared defaults have identical object structure', () => {
    const serverDefaults = exportService.getDefaultBatchSettings();
    const sharedDefaults = DEFAULT_BATCH_EXPORT_SETTINGS;

    // Deep equality check
    expect(serverDefaults).toEqual(sharedDefaults);
  });

  test('No extra properties in server defaults that are missing from shared', () => {
    const serverDefaults = exportService.getDefaultBatchSettings();
    const sharedDefaults = DEFAULT_BATCH_EXPORT_SETTINGS;

    const serverKeys = Object.keys(serverDefaults).sort();
    const sharedKeys = Object.keys(sharedDefaults).sort();

    expect(serverKeys).toEqual(sharedKeys);
  });

  test('Shared defaults conform to CanonicalBatchExportSettings interface', () => {
    // TypeScript compile-time check - this will fail if types don't match
    const conformanceTest: CanonicalBatchExportSettings = DEFAULT_BATCH_EXPORT_SETTINGS;
    expect(conformanceTest).toBeDefined();
  });
});