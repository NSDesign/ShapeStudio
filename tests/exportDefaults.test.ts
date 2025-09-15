import { ExportService } from '../server/services/exportService';
import { DEFAULT_BATCH_EXPORT_SETTINGS, EXPORT_SCOPE_ORDER, DEFAULT_EXPORT_SCOPE } from '../shared/exportSchema';

describe('Export Defaults Parity Tests', () => {
  const exportService = new ExportService();

  test('Server defaults should match shared defaults exactly', () => {
    const serverDefaults = exportService.getDefaultBatchSettings();
    
    // Test each property for exact match
    expect(serverDefaults.format).toBe(DEFAULT_BATCH_EXPORT_SETTINGS.format);
    expect(serverDefaults.quality).toBe(DEFAULT_BATCH_EXPORT_SETTINGS.quality);
    expect(serverDefaults.scale).toBe(DEFAULT_BATCH_EXPORT_SETTINGS.scale);
    expect(serverDefaults.useCustomSize).toBe(DEFAULT_BATCH_EXPORT_SETTINGS.useCustomSize);
    expect(serverDefaults.includeBackground).toBe(DEFAULT_BATCH_EXPORT_SETTINGS.includeBackground);
    expect(serverDefaults.backgroundColor).toBe(DEFAULT_BATCH_EXPORT_SETTINGS.backgroundColor);
    expect(serverDefaults.useMargins).toBe(DEFAULT_BATCH_EXPORT_SETTINGS.useMargins);
    expect(serverDefaults.uniformMargins).toBe(DEFAULT_BATCH_EXPORT_SETTINGS.uniformMargins);
    expect(serverDefaults.marginTop).toBe(DEFAULT_BATCH_EXPORT_SETTINGS.marginTop);
    expect(serverDefaults.marginRight).toBe(DEFAULT_BATCH_EXPORT_SETTINGS.marginRight);
    expect(serverDefaults.marginBottom).toBe(DEFAULT_BATCH_EXPORT_SETTINGS.marginBottom);
    expect(serverDefaults.marginLeft).toBe(DEFAULT_BATCH_EXPORT_SETTINGS.marginLeft);
    expect(serverDefaults.batchExportCount).toBe(DEFAULT_BATCH_EXPORT_SETTINGS.batchExportCount);
    expect(serverDefaults.batchSaveProjectFiles).toBe(DEFAULT_BATCH_EXPORT_SETTINGS.batchSaveProjectFiles);
    expect(serverDefaults.packageAsZip).toBe(DEFAULT_BATCH_EXPORT_SETTINGS.packageAsZip);
    expect(serverDefaults.includeAdornments).toBe(DEFAULT_BATCH_EXPORT_SETTINGS.includeAdornments);
    expect(serverDefaults.includeGrid).toBe(DEFAULT_BATCH_EXPORT_SETTINGS.includeGrid);
    expect(serverDefaults.includeArtboardGeometry).toBe(DEFAULT_BATCH_EXPORT_SETTINGS.includeArtboardGeometry);
    expect(serverDefaults.includeTypeInName).toBe(DEFAULT_BATCH_EXPORT_SETTINGS.includeTypeInName);
  });

  test('Export scope order should be correct', () => {
    expect(EXPORT_SCOPE_ORDER).toEqual(['all', 'artboard', 'selected']);
    expect(EXPORT_SCOPE_ORDER[0]).toBe('all'); // First option should be 'all'
  });

  test('Default export scope should be all', () => {
    expect(DEFAULT_EXPORT_SCOPE).toBe('all');
  });

  test('Shared defaults should be a complete CanonicalBatchExportSettings object', () => {
    // Verify all required properties exist
    expect(DEFAULT_BATCH_EXPORT_SETTINGS).toHaveProperty('format');
    expect(DEFAULT_BATCH_EXPORT_SETTINGS).toHaveProperty('quality');
    expect(DEFAULT_BATCH_EXPORT_SETTINGS).toHaveProperty('scale');
    expect(DEFAULT_BATCH_EXPORT_SETTINGS).toHaveProperty('useCustomSize');
    expect(DEFAULT_BATCH_EXPORT_SETTINGS).toHaveProperty('includeBackground');
    expect(DEFAULT_BATCH_EXPORT_SETTINGS).toHaveProperty('backgroundColor');
    expect(DEFAULT_BATCH_EXPORT_SETTINGS).toHaveProperty('useMargins');
    expect(DEFAULT_BATCH_EXPORT_SETTINGS).toHaveProperty('uniformMargins');
    expect(DEFAULT_BATCH_EXPORT_SETTINGS).toHaveProperty('marginTop');
    expect(DEFAULT_BATCH_EXPORT_SETTINGS).toHaveProperty('marginRight');
    expect(DEFAULT_BATCH_EXPORT_SETTINGS).toHaveProperty('marginBottom');
    expect(DEFAULT_BATCH_EXPORT_SETTINGS).toHaveProperty('marginLeft');
    expect(DEFAULT_BATCH_EXPORT_SETTINGS).toHaveProperty('batchExportCount');
    expect(DEFAULT_BATCH_EXPORT_SETTINGS).toHaveProperty('batchSaveProjectFiles');
    expect(DEFAULT_BATCH_EXPORT_SETTINGS).toHaveProperty('packageAsZip');
    expect(DEFAULT_BATCH_EXPORT_SETTINGS).toHaveProperty('includeAdornments');
    expect(DEFAULT_BATCH_EXPORT_SETTINGS).toHaveProperty('includeGrid');
    expect(DEFAULT_BATCH_EXPORT_SETTINGS).toHaveProperty('includeArtboardGeometry');
    expect(DEFAULT_BATCH_EXPORT_SETTINGS).toHaveProperty('includeTypeInName');
  });
});