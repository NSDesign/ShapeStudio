import type { Express } from "express";
import { ExportService, BatchExportSettings } from '../services/exportService';
import { ProjectService, SaveProjectSettings } from '../services/projectService';
import { z } from 'zod';
import * as path from 'path';

// Create service instances
const exportService = new ExportService();
const projectService = new ProjectService();

// Validation schemas
// V2 Generation Count Schema
const GenerationCountSchema = z.object({
  mode: z.enum(['fixed', 'range', 'incremental']),
  fixed: z.number().min(1).optional(),
  min: z.number().min(1).optional(),
  max: z.number().min(1).optional(),
  start: z.number().min(1).optional(),
  increment: z.number().min(1).optional(),
  resetPerBatch: z.boolean().optional()
}).refine((data) => {
  if (data.mode === 'fixed') return typeof data.fixed === 'number';
  if (data.mode === 'range') return typeof data.min === 'number' && typeof data.max === 'number' && data.min <= data.max;
  if (data.mode === 'incremental') return typeof data.start === 'number' && typeof data.increment === 'number';
  return false;
}, {
  message: "Invalid generation count configuration for the specified mode"
});

const BatchExportSchema = z.object({
  // V1 (existing) parameters
  format: z.enum(['png', 'jpeg', 'webp', 'avif', 'svg', 'bmp']).default('png'),
  quality: z.number().min(1).max(100).optional().default(92),
  scale: z.number().min(0.1).max(10).optional().default(1),
  useCustomSize: z.boolean().optional().default(false),
  customWidth: z.number().min(1).optional(),
  customHeight: z.number().min(1).optional(),
  includeBackground: z.boolean().optional().default(true),
  backgroundColor: z.string().optional().default('#1e293b'),
  useMargins: z.boolean().optional().default(false),
  uniformMargins: z.boolean().optional().default(true),
  marginTop: z.number().min(0).optional().default(20),
  marginRight: z.number().min(0).optional().default(20),
  marginBottom: z.number().min(0).optional().default(20),
  marginLeft: z.number().min(0).optional().default(20),
  batchExportCount: z.number().min(1).max(100).default(10),
  batchSaveProjectFiles: z.boolean().optional().default(false),
  packageAsZip: z.boolean().optional().default(false),
  // Selective export settings (V3+ features)
  exportAllImages: z.boolean().optional().default(true),
  selectedImageIndices: z.array(z.number().int().positive()).optional().default([]),
  includeAdornments: z.boolean().optional().default(false),
  includeGrid: z.boolean().optional().default(false),
  includeArtboardGeometry: z.boolean().optional().default(false),
  filename: z.string().optional(),
  customPrefix: z.string().optional(),
  includeTypeInName: z.boolean().optional().default(false),
  
  // V2 additions
  generationCount: GenerationCountSchema.optional(),
  modulationValue: z.number().min(0).max(1).optional()
});

const SaveProjectSchema = z.object({
  projectName: z.string().optional(),
  includeTimestamp: z.boolean().optional().default(true)
});

// Live State API Schema - Complete current UI state
const LiveStateApiSchema = z.object({
  // Mode differentiation
  apiMode: z.literal('live').default('live'),
  
  // Current UI state (passed from frontend)
  currentState: z.object({
    // Shape types and settings from current UI
    enabledShapeTypes: z.array(z.string()),
    shapeCountMode: z.enum(['fixed', 'range']),
    shapeCount: z.number(),
    shapeCountRange: z.tuple([z.number(), z.number()]),
    shapeSpecificSettings: z.record(z.any()),
    // Export settings from current UI
    exportFormat: z.string(),
    exportQuality: z.number().min(1).max(100),
    exportScale: z.number().min(1).max(4),
    exportScope: z.enum(['all', 'selected', 'artboard']),
    // Batch settings from UI
    exportBatchModeEnabled: z.boolean(),
    exportBatchCount: z.number().min(1).max(100),
    exportSaveProjectFiles: z.boolean(),
    exportShapeCountRange: z.tuple([z.number(), z.number()]),
    // Packaging settings
    packageAsZip: z.boolean().optional().default(false),
    // Selective export settings
    exportAllImages: z.boolean().optional().default(true),
    selectedImageIndices: z.array(z.number()).optional().default([]),
    // Artboard settings
    artboardBackgroundColor: z.string(),
    // Only enabled generation config settings
    enabledGenerationSettings: z.record(z.any()),
  }).optional()
});

// Helper function to apply consistent project file prioritization and selective filtering
// NOTE: This should only be used when files are actually available (e.g., Live API or status responses)
function applyProjectFilePrioritization(
  result: any, 
  settings: { batchSaveProjectFiles?: boolean; exportAllImages?: boolean; selectedImageIndices?: number[] }
): any {
  const { batchSaveProjectFiles = false, exportAllImages = true, selectedImageIndices = [] } = settings;
  
  // When Save Project Files is enabled, prioritize project files over image files
  if (batchSaveProjectFiles) {
    // Check if selective export is enabled
    if (!exportAllImages && selectedImageIndices.length > 0) {
      // Convert 1-based UI indices to 0-based array indices and validate
      const validIndices = selectedImageIndices
        .filter(idx => idx >= 1) // Must be 1-based
        .map(idx => idx - 1); // Convert to 0-based
      
      // Filter project files based on selectedImageIndices
      if (result.projectFiles && Array.isArray(result.projectFiles) && result.projectFiles.length > 0) {
        const selectedProjectFiles = validIndices
          .filter(index => index >= 0 && index < result.projectFiles!.length)
          .map(index => result.projectFiles![index]);
        
        return {
          ...result,
          projectFiles: selectedProjectFiles,
          // Primary files to download (project files prioritized)
          files: selectedProjectFiles,
          // For backward compatibility, set downloadUrl to first project file
          downloadUrl: selectedProjectFiles.length > 0 ? selectedProjectFiles[0].url : result.downloadUrl
        };
      }
    } else {
      // Export all project files
      if (result.projectFiles && Array.isArray(result.projectFiles) && result.projectFiles.length > 0) {
        return {
          ...result,
          // Primary files to download (project files prioritized)
          files: result.projectFiles,
          // For backward compatibility, set downloadUrl to first project file
          downloadUrl: result.projectFiles.length > 0 ? result.projectFiles[0].url : result.downloadUrl
        };
      }
    }
  } else {
    // Original logic for image files when Save Project Files is disabled
    if (!exportAllImages && selectedImageIndices.length > 0) {
      // Convert 1-based UI indices to 0-based array indices and validate
      const validIndices = selectedImageIndices
        .filter(idx => idx >= 1) // Must be 1-based
        .map(idx => idx - 1); // Convert to 0-based
      
      // Filter image files based on selectedImageIndices
      if (result.imageFiles && Array.isArray(result.imageFiles) && result.imageFiles.length > 0) {
        const selectedImageFiles = validIndices
          .filter(index => index >= 0 && index < result.imageFiles!.length)
          .map(index => result.imageFiles![index]);
        
        return {
          ...result,
          imageFiles: selectedImageFiles,
          // Primary files to download (image files)
          files: selectedImageFiles,
          // For backward compatibility, set downloadUrl to first image file
          downloadUrl: selectedImageFiles.length > 0 ? selectedImageFiles[0].url : result.downloadUrl
        };
      }
    }
  }
  
  return result;
}

export function registerExportRoutes(app: Express): void {
  // Get available export formats
  app.get('/api/export/formats', (req, res) => {
    try {
      const formats = [
        { value: 'png', label: 'PNG', description: 'Lossless with transparency' },
        { value: 'jpeg', label: 'JPEG', description: 'Lossy compression, smaller files' },
        { value: 'webp', label: 'WebP', description: 'Modern format, excellent compression' },
        { value: 'avif', label: 'AVIF', description: 'Next-gen format, best compression' },
        { value: 'svg', label: 'SVG', description: 'Vector format, scalable' },
        { value: 'bmp', label: 'BMP', description: 'Uncompressed bitmap' }
      ];
      
      res.json({ success: true, formats });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get export formats',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get default export settings
  app.get('/api/export/defaults', (req, res) => {
    try {
      const defaults = exportService.getDefaultBatchSettings();
      res.json({ success: true, defaults });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get default settings',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Start batch export
  app.post('/api/export/batch', async (req, res) => {
    try {
      // Set defaults when options are not provided: Export All Images = true, Save Project Files = true
      const requestWithDefaults = {
        exportAllImages: true,
        batchSaveProjectFiles: true,
        ...req.body
      };
      
      // Validate request body
      const validatedSettings = BatchExportSchema.parse(requestWithDefaults);
      
      // For now, we'll use mock data since we don't have the actual shape generation
      // In a real implementation, this would get the current shapes and settings
      const mockShapes: any[] = [];
      const mockGroups: any[] = [];
      const mockCanvasSettings = {
        width: 1200,
        height: 800,
        zoom: 1,
        panX: 0,
        panY: 0,
        backgroundColor: '#1e293b',
        showGrid: false
      };
      const mockBatchConfigSettings = {
        selectedPreset: 'none',
        noiseEnabled: false,
        distributionLayoutEnabled: false,
        propertiesEnabled: true,
        // Add other default batch config settings
      };
      const mockEnabledShapeTypes = new Set(['rectangle', 'circle', 'polygon']);
      
      // Mock shape generation function
      const mockGenerateShapes = (config: any) => {
        // This would be replaced with actual shape generation logic
        return { shapes: [], groups: [] };
      };
      
      const result = await exportService.startBatchExport(
        mockShapes,
        mockGroups,
        mockCanvasSettings,
        mockBatchConfigSettings as any,
        mockEnabledShapeTypes,
        validatedSettings,
        mockGenerateShapes
      );
      
      // Note: Project file prioritization happens at the status endpoint when files are available
      // The initial POST response contains empty arrays that will be populated during async processing
      res.json(result);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          error: 'Invalid request parameters',
          details: error.errors
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Failed to start batch export',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  // Get export status
  app.get('/api/export/status/:exportId', (req, res) => {
    try {
      const { exportId } = req.params;
      const status = exportService.getExportStatus(exportId);
      
      if (!status) {
        return res.status(404).json({ 
          success: false, 
          error: 'Export not found' 
        });
      }
      
      // If export is completed and was using individual files, include file arrays
      if (status.status === 'completed') {
        const individualFiles = exportService.getIndividualFiles(exportId);
        const exportSettings = exportService.getExportSettings(exportId);
        
        if (individualFiles && exportSettings) {
          // Apply consistent project file prioritization with stored settings
          const resultWithFiles = {
            ...status,
            imageFiles: individualFiles.imageFiles,
            projectFiles: individualFiles.projectFiles
          };
          
          const prioritizedResult = applyProjectFilePrioritization(resultWithFiles, exportSettings);
          
          return res.json({
            success: true,
            status: prioritizedResult
          });
        } else if (individualFiles) {
          // Fallback for exports without stored settings (backward compatibility)
          const responseFiles = individualFiles.projectFiles && individualFiles.projectFiles.length > 0 
            ? individualFiles.projectFiles 
            : individualFiles.imageFiles;
            
          return res.json({
            success: true,
            status: {
              ...status,
              imageFiles: individualFiles.imageFiles,
              projectFiles: individualFiles.projectFiles,
              // Primary files to download (prioritizes project files)
              files: responseFiles
            }
          });
        }
      }
      
      res.json({ success: true, status });
      
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get export status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Download completed export (ZIP only)
  app.get('/api/export/download/:exportId', (req, res) => {
    try {
      const { exportId } = req.params;
      const filePath = exportService.getExportFile(exportId);
      
      if (!filePath) {
        return res.status(404).json({ 
          success: false, 
          error: 'Export file not found' 
        });
      }
      
      const filename = path.basename(filePath);
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({ 
              success: false, 
              error: 'Failed to download file',
              message: err.message
            });
          }
        }
      });
      
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to download export',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Serve individual export files
  app.get('/api/export/files/:exportId/:filename', (req, res) => {
    try {
      const { exportId, filename } = req.params;
      const filePath = exportService.getIndividualFile(exportId, filename);
      
      if (!filePath) {
        return res.status(404).json({ 
          success: false, 
          error: 'File not found' 
        });
      }
      
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({ 
              success: false, 
              error: 'Failed to download file',
              message: err.message
            });
          }
        }
      });
      
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to serve file',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Save project
  app.post('/api/projects/save', async (req, res) => {
    try {
      const validatedSettings = SaveProjectSchema.parse(req.body);
      
      // Mock project data for now
      const mockShapes: any[] = [];
      const mockGroups: any[] = [];
      const mockCanvasSettings = {
        width: 1200,
        height: 800,
        zoom: 1,
        panX: 0,
        panY: 0,
        backgroundColor: '#1e293b',
        showGrid: false
      };
      const mockBatchConfigSettings = {
        selectedPreset: 'none',
        // Add other settings
      };
      const mockEnabledShapeTypes = new Set(['rectangle', 'circle', 'polygon']);
      
      const result = await projectService.saveProject(
        mockShapes,
        mockGroups,
        mockCanvasSettings,
        mockBatchConfigSettings as any,
        mockEnabledShapeTypes,
        validatedSettings
      );
      
      res.json(result);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          error: 'Invalid request parameters',
          details: error.errors
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Failed to save project',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  // Download project file
  app.get('/api/projects/download/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = await projectService.getProjectFile(decodeURIComponent(filename));
      
      if (!filePath) {
        return res.status(404).json({ 
          success: false, 
          error: 'Project file not found' 
        });
      }
      
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({ 
              success: false, 
              error: 'Failed to download file',
              message: err.message
            });
          }
        }
      });
      
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to download project',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Live State API - Single endpoint using all current app settings
  app.post('/api/live/execute', async (req, res) => {
    try {
      // Validate API key - using hardcoded key
      const apiKey = req.headers['x-api-key'];
      const expectedApiKey = '3211d3f332fsss4t4tbebw5r653765h6brb4';
      if (!apiKey || apiKey !== expectedApiKey) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid or missing API key' 
        });
      }

      const validatedData = LiveStateApiSchema.parse({
        ...req.body,
        apiMode: 'live'
      });

      // Convert current UI state to complete export operation
      const currentState = validatedData.currentState;
      if (!currentState) {
        return res.status(400).json({ 
          success: false, 
          error: 'Current UI state is required for Live State API' 
        });
      }

      // Set defaults when options are not provided: Export All Images = true, Save Project Files = true
      const exportAllImages = currentState.exportAllImages !== false; // default to true
      const exportSaveProjectFiles = currentState.exportSaveProjectFiles !== false; // default to true 
      const selectedImageIndices = currentState.selectedImageIndices || [];

      // Force batch mode for Live State API
      if (!currentState.exportBatchModeEnabled) {
        return res.status(400).json({ 
          success: false, 
          error: 'Live State API requires batch mode to be enabled. Set exportBatchModeEnabled: true or use generationCount mode: fixed with count: 1 for single generation.' 
        });
      }

      // Build complete export operation using ALL current UI settings
      const allSettings = {
        // Export settings from UI
        format: currentState.exportFormat,
        quality: currentState.exportQuality / 100, // Convert percentage to decimal
        scale: currentState.exportScale,
        scope: currentState.exportScope,
        includeBackground: true,
        backgroundColor: currentState.artboardBackgroundColor || '#ffffff',
        
        // Batch settings from UI - use correct field names that match BatchExportSchema
        batchExportCount: currentState.exportBatchCount,
        batchSaveProjectFiles: exportSaveProjectFiles,
        packageAsZip: currentState.packageAsZip || false,
        // Selective export settings
        exportAllImages: exportAllImages,
        selectedImageIndices: selectedImageIndices,
        
        // Generation count settings from UI
        ...(currentState.exportShapeCountRange && {
          generationCount: {
            mode: 'range' as const,
            min: currentState.exportShapeCountRange[0],
            max: currentState.exportShapeCountRange[1]
          }
        }),
        
        // Advanced generation config from enabled sections only
        ...(currentState.enabledGenerationSettings.modulation && {
          modulationValue: currentState.enabledGenerationSettings.modulation.value
        })
      };

      // Perform actual batch export using all current UI settings
      const mockShapes: any[] = [];
      const mockGroups: any[] = [];
      const mockCanvasSettings = {
        width: 1200,
        height: 800,
        zoom: 1,
        panX: 0,
        panY: 0,
        backgroundColor: allSettings.backgroundColor,
        showGrid: false
      };
      const mockBatchConfigSettings = {
        selectedPreset: 'none',
        noiseEnabled: false,
        distributionLayoutEnabled: false,
        propertiesEnabled: true,
      };
      const enabledShapeTypesSet = new Set(currentState.enabledShapeTypes);
      
      // Mock shape generation function
      const mockGenerateShapes = (config: any) => {
        return { shapes: [], groups: [] };
      };
      
      // Actually perform the export using the export service
      const result = await exportService.startBatchExport(
        mockShapes,
        mockGroups,
        mockCanvasSettings,
        mockBatchConfigSettings as any,
        enabledShapeTypesSet,
        allSettings,
        mockGenerateShapes
      );
      
      // Apply consistent project file prioritization logic for Live API
      // Live API expects immediate results, so we apply the helper here
      let filteredResult = applyProjectFilePrioritization(result, {
        batchSaveProjectFiles: allSettings.batchSaveProjectFiles,
        exportAllImages: exportAllImages,
        selectedImageIndices: selectedImageIndices
      });
      
      // Return the same format as regular batch export with direct URLs
      res.json({
        ...filteredResult,
        apiMode: 'live',
        message: 'Live State API export completed - using current app settings'
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          success: false, 
          error: 'Invalid request data for Live State API',
          details: error.errors
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Failed to execute Live State API',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });


  // Versioned batch export endpoints (v1, v2, v3, v4)
  ['v1', 'v2', 'v3', 'v4'].forEach(version => {
    app.post(`/api/export/batch/${version}`, async (req, res) => {
      try {
        // All versions support the full feature set with defaults
        const requestWithDefaults = {
          exportAllImages: true,
          batchSaveProjectFiles: true,
          ...req.body
        };
        
        const validatedSettings = BatchExportSchema.parse(requestWithDefaults);
        
        // Use the same logic as regular batch export
        const mockShapes: any[] = [];
        const mockGroups: any[] = [];
        const mockCanvasSettings = {
          width: 1200,
          height: 800,
          zoom: 1,
          panX: 0,
          panY: 0,
          backgroundColor: validatedSettings.backgroundColor || '#1e293b',
          showGrid: false
        };
        const mockBatchConfigSettings = {
          selectedPreset: 'none',
          noiseEnabled: false,
          distributionLayoutEnabled: false,
          propertiesEnabled: true,
        };
        const mockEnabledShapeTypes = new Set(['rectangle', 'circle', 'polygon']);
        
        const mockGenerateShapes = (config: any) => {
          return { shapes: [], groups: [] };
        };
        
        const result = await exportService.startBatchExport(
          mockShapes,
          mockGroups,
          mockCanvasSettings,
          mockBatchConfigSettings as any,
          mockEnabledShapeTypes,
          validatedSettings,
          mockGenerateShapes
        );
        
        // Note: Project file prioritization happens at the status endpoint when files are available
        // The initial POST response contains empty arrays that will be populated during async processing
        res.json({
          ...result,
          apiVersion: version,
          message: `${version.toUpperCase()} batch export completed`
        });
        
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ 
            success: false, 
            error: 'Invalid request parameters',
            details: error.errors
          });
        } else {
          res.status(500).json({ 
            success: false, 
            error: `Failed to start ${version.toUpperCase()} batch export`,
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    });
  });

  // Cleanup endpoint (can be called by cron job)
  app.post('/api/export/cleanup', (req, res) => {
    try {
      exportService.cleanupOldExports();
      projectService.cleanupOldProjects();
      
      res.json({ 
        success: true, 
        message: 'Cleanup completed successfully' 
      });
      
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to cleanup files',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}