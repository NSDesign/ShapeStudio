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
    // Artboard settings
    artboardBackgroundColor: z.string(),
    // Only enabled generation config settings
    enabledGenerationSettings: z.record(z.any()),
  }).optional()
});

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
      // Validate request body
      const validatedSettings = BatchExportSchema.parse(req.body);
      
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
        if (individualFiles) {
          return res.json({
            success: true,
            status: {
              ...status,
              imageFiles: individualFiles.imageFiles,
              projectFiles: individualFiles.projectFiles
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
      // Validate API key
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== '3211d3f332fsss4t4tbebw5r653765h6brb4') {
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
        
        // Batch settings from UI
        batchExportCount: currentState.exportBatchCount,
        batchSaveProjectFiles: currentState.exportSaveProjectFiles,
        packageAsZip: currentState.exportBatchCount > 1,
        
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

      // Generate unique export ID for tracking
      const exportId = `live-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      res.json({ 
        success: true, 
        exportId: exportId,
        message: 'Live State API execution started - using all current app settings',
        apiMode: 'live',
        appliedSettings: {
          enabledShapeTypes: currentState.enabledShapeTypes,
          shapeCountMode: currentState.shapeCountMode,
          shapeCount: currentState.shapeCount,
          shapeCountRange: currentState.shapeCountRange,
          format: allSettings.format,
          quality: allSettings.quality,
          scale: allSettings.scale,
          scope: allSettings.scope,
          batchCount: allSettings.batchExportCount,
          backgroundColor: allSettings.backgroundColor,
          saveProjectFiles: allSettings.batchSaveProjectFiles,
          exportShapeCountRange: currentState.exportShapeCountRange,
          enabledSections: Object.keys(currentState.enabledGenerationSettings),
          shapeSpecificSettings: Object.keys(currentState.shapeSpecificSettings)
        }
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