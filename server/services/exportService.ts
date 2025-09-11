import { ImageFormat, ExportOptions } from '../../client/src/lib/imageExport';
import { ProjectManager } from '../../client/src/lib/projectManager';
import { Shape, ShapeGroupClass } from '../../client/src/lib/shapes';
import { CanvasSettings, Artboard } from '../../client/src/lib/shapeTypes';
import { BatchConfigSettings } from '../../client/src/components/BatchConfigDialog';
import JSZip from 'jszip';
import * as fs from 'fs';
import * as path from 'path';

export interface BatchExportSettings {
  // Format and quality
  format: ImageFormat;
  quality?: number; // 1-100 for lossy formats
  
  // Scale and dimensions  
  scale?: number;
  useCustomSize?: boolean;
  customWidth?: number;
  customHeight?: number;
  
  // Background control
  includeBackground?: boolean;
  backgroundColor?: string;
  
  // Margins
  useMargins?: boolean;
  uniformMargins?: boolean;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  
  // Batch-specific settings
  batchExportCount: number;
  batchSaveProjectFiles?: boolean;
  packageAsZip?: boolean; // New: Whether to package files in ZIP (default: false)
  
  // Additional options
  includeAdornments?: boolean;
  includeGrid?: boolean;
  includeArtboardGeometry?: boolean;
  
  // Naming
  filename?: string;
  customPrefix?: string;
  includeTypeInName?: boolean;
}

export interface ExportProgress {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number; // 0-100
  currentStep: string;
  imagesCompleted: number;
  totalImages: number;
  estimatedTimeRemaining?: number;
  errorMessage?: string;
  downloadPath?: string;
}

export interface BatchExportResult {
  success: boolean;
  exportId: string;
  estimatedDuration: number;
  totalImages: number;
  downloadUrl?: string; // Only present if packageAsZip is true
  imageFiles?: Array<{
    filename: string;
    url: string;
    index: number;
  }>;
  projectFiles?: Array<{
    filename: string;
    url: string;
    index: number;
  }>;
}

export class ExportService {
  private activeExports = new Map<string, ExportProgress>();
  private exportResults = new Map<string, string>(); // exportId -> file path
  private individualFiles = new Map<string, { imageFiles: any[], projectFiles: any[] }>(); // exportId -> file arrays
  private exportSettings = new Map<string, { batchSaveProjectFiles: boolean, exportAllImages: boolean, selectedImageIndices: number[] }>(); // exportId -> request settings
  
  constructor() {
    // Ensure exports directory exists
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
  }

  generateExportId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getDefaultBatchSettings(): BatchExportSettings {
    return {
      format: 'png',
      quality: 92,
      scale: 1,
      useCustomSize: false,
      includeBackground: true,
      backgroundColor: '#1e293b',
      useMargins: false,
      uniformMargins: true,
      marginTop: 20,
      marginRight: 20,
      marginBottom: 20,
      marginLeft: 20,
      batchExportCount: 10,
      batchSaveProjectFiles: false,
      packageAsZip: false, // Default to individual files
      includeAdornments: false,
      includeGrid: false,
      includeArtboardGeometry: false,
      includeTypeInName: false
    };
  }

  mergeBatchSettings(userSettings: Partial<BatchExportSettings>): BatchExportSettings {
    const defaults = this.getDefaultBatchSettings();
    return { ...defaults, ...userSettings };
  }

  async startBatchExport(
    shapes: Shape[],
    groups: ShapeGroupClass[],
    canvasSettings: CanvasSettings,
    batchConfigSettings: BatchConfigSettings,
    enabledShapeTypes: Set<string>,
    userSettings: Partial<BatchExportSettings> & { exportAllImages?: boolean, selectedImageIndices?: number[] },
    generateShapesFunction: (config: any) => { shapes: Shape[], groups: ShapeGroupClass[] }
  ): Promise<BatchExportResult> {
    const exportId = this.generateExportId();
    const settings = this.mergeBatchSettings(userSettings);
    
    // Store request settings for later use in status endpoint
    this.exportSettings.set(exportId, {
      batchSaveProjectFiles: settings.batchSaveProjectFiles || false,
      exportAllImages: userSettings.exportAllImages !== false, // default to true
      selectedImageIndices: userSettings.selectedImageIndices || []
    });
    
    // Initialize progress tracking
    const progress: ExportProgress = {
      exportId,
      status: 'pending',
      progress: 0,
      currentStep: 'Initializing batch export...',
      imagesCompleted: 0,
      totalImages: settings.batchExportCount
    };
    
    this.activeExports.set(exportId, progress);
    
    // Start async batch processing
    this.processBatchExport(
      exportId,
      shapes,
      groups,
      canvasSettings,
      batchConfigSettings,
      enabledShapeTypes,
      settings,
      generateShapesFunction
    );
    
    // Return appropriate response based on packaging mode
    if (settings.packageAsZip) {
      return {
        success: true,
        exportId,
        estimatedDuration: this.calculateEstimatedDuration(settings.batchExportCount),
        totalImages: settings.batchExportCount,
        downloadUrl: `/api/export/download/${exportId}`
      };
    } else {
      return {
        success: true,
        exportId,
        estimatedDuration: this.calculateEstimatedDuration(settings.batchExportCount),
        totalImages: settings.batchExportCount,
        imageFiles: [], // Will be populated when processing completes
        projectFiles: []
      };
    }
  }

  private async processBatchExport(
    exportId: string,
    baseShapes: Shape[],
    baseGroups: ShapeGroupClass[],
    canvasSettings: CanvasSettings,
    batchConfigSettings: BatchConfigSettings,
    enabledShapeTypes: Set<string>,
    settings: BatchExportSettings,
    generateShapesFunction: (config: any) => { shapes: Shape[], groups: ShapeGroupClass[] }
  ): Promise<void> {
    const progress = this.activeExports.get(exportId)!;
    
    try {
      progress.status = 'processing';
      progress.currentStep = settings.packageAsZip ? 'Creating ZIP archive...' : 'Creating individual files...';
      this.activeExports.set(exportId, progress);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      
      // Initialize tracking for individual files
      const imageFiles: any[] = [];
      const projectFiles: any[] = [];
      
      // Create export directory for this batch
      const exportDir = path.join(process.cwd(), 'exports', exportId);
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      
      // Initialize ZIP only if needed
      let zip: JSZip | null = null;
      if (settings.packageAsZip) {
        zip = new JSZip();
      }
      
      // Calculate total steps for progress tracking
      const baseSteps = settings.batchExportCount * 2; // 2 steps per image
      const finalSteps = settings.packageAsZip ? 2 : 1; // zip creation + save OR just completion
      const totalSteps = baseSteps + finalSteps;
      let currentStep = 0;
      
      for (let i = 0; i < settings.batchExportCount; i++) {
        // Update progress
        progress.currentStep = `Generating artwork ${i + 1} of ${settings.batchExportCount}`;
        progress.progress = Math.round((currentStep / totalSteps) * 100);
        this.activeExports.set(exportId, progress);
        
        // Generate shapes for this iteration
        const { shapes: currentShapes, groups: currentGroups } = generateShapesFunction(batchConfigSettings);
        currentStep++;
        
        // Export image
        progress.currentStep = `Exporting image ${i + 1} of ${settings.batchExportCount}`;
        progress.progress = Math.round((currentStep / totalSteps) * 100);
        this.activeExports.set(exportId, progress);
        
        const exportOptions: ExportOptions = {
          format: settings.format,
          quality: settings.quality ? settings.quality / 100 : 0.92,
          scale: settings.scale || 1,
          backgroundColor: settings.backgroundColor,
          includeBackground: settings.includeBackground,
          includeAdornments: settings.includeAdornments,
          includeGrid: settings.includeGrid,
          includeArtboardGeometry: settings.includeArtboardGeometry,
          margins: settings.useMargins ? {
            top: settings.marginTop || 0,
            right: settings.marginRight || 0,
            bottom: settings.marginBottom || 0,
            left: settings.marginLeft || 0
          } : undefined
        };
        
        if (settings.useCustomSize && settings.customWidth && settings.customHeight) {
          exportOptions.width = settings.customWidth;
          exportOptions.height = settings.customHeight;
        }
        
        // For now, create a mock blob since we can't use browser Canvas API on server
        // In a real implementation, this would use a server-side canvas library like node-canvas
        const mockImageData = Buffer.from(`mock-image-data-${i + 1}`);
        const blob = { arrayBuffer: async () => mockImageData.buffer } as Blob;
        
        // Generate filename
        const filename = this.generateBatchFilename(settings, i + 1);
        const imageData = await blob.arrayBuffer();
        const imageFilename = `${filename}.${settings.format}`;
        
        if (settings.packageAsZip) {
          // Add to ZIP
          zip!.file(imageFilename, imageData);
        } else {
          // Save individual file
          const imagePath = path.join(exportDir, imageFilename);
          fs.writeFileSync(imagePath, Buffer.from(imageData));
          
          // Track individual file
          imageFiles.push({
            filename: imageFilename,
            url: `/api/export/files/${exportId}/${imageFilename}`,
            index: i + 1
          });
        }
        
        // Save project file if requested
        if (settings.batchSaveProjectFiles) {
          const projectData = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            name: filename,
            canvasSettings,
            batchConfigSettings,
            enabledShapeTypes: Array.from(enabledShapeTypes),
            shapes: currentShapes.map(shape => this.serializeShape(shape)),
            groups: currentGroups.map(group => this.serializeGroup(group))
          };
          
          const projectJson = JSON.stringify(projectData, null, 2);
          const projectFilename = `${filename}.json`;
          
          if (settings.packageAsZip) {
            // Add to ZIP
            zip!.file(projectFilename, projectJson);
          } else {
            // Save individual file
            const projectPath = path.join(exportDir, projectFilename);
            fs.writeFileSync(projectPath, projectJson);
            
            // Track individual file
            projectFiles.push({
              filename: projectFilename,
              url: `/api/export/files/${exportId}/${projectFilename}`,
              index: i + 1
            });
          }
        }
        
        progress.imagesCompleted = i + 1;
        currentStep++;
      }
      
      if (settings.packageAsZip) {
        // Create ZIP file
        progress.currentStep = 'Creating ZIP file...';
        progress.progress = Math.round((currentStep / totalSteps) * 100);
        this.activeExports.set(exportId, progress);
        
        const zipBlob = await zip!.generateAsync({ type: 'nodebuffer' });
        const zipFilename = `batch-export-${timestamp}.zip`;
        const zipPath = path.join(process.cwd(), 'exports', zipFilename);
        
        fs.writeFileSync(zipPath, zipBlob);
        
        // Complete export
        progress.status = 'completed';
        progress.progress = 100;
        progress.currentStep = 'ZIP export completed successfully';
        progress.downloadPath = zipPath;
        this.activeExports.set(exportId, progress);
        this.exportResults.set(exportId, zipPath);
      } else {
        // Complete individual files export
        progress.status = 'completed';
        progress.progress = 100;
        progress.currentStep = 'Individual files export completed successfully';
        this.activeExports.set(exportId, progress);
        
        // Store individual file information
        this.individualFiles.set(exportId, { imageFiles, projectFiles });
      }
      
    } catch (error) {
      progress.status = 'error';
      progress.errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.activeExports.set(exportId, progress);
    }
  }

  private generateBatchFilename(settings: BatchExportSettings, index: number): string {
    const parts = [];
    
    if (settings.customPrefix) {
      parts.push(settings.customPrefix);
    }
    
    if (settings.filename?.trim()) {
      parts.push(settings.filename.trim());
    } else {
      parts.push('batch-export');
    }
    
    // Add index with zero-padding
    const paddedIndex = index.toString().padStart(3, '0');
    parts.push(paddedIndex);
    
    return parts.join('-');
  }

  private calculateEstimatedDuration(batchCount: number): number {
    // Estimate 2-3 seconds per image for processing
    return Math.ceil(batchCount * 2.5);
  }

  private serializeShape(shape: Shape): any {
    return {
      id: shape.id,
      type: shape.type,
      transform: shape.transform,
      properties: shape.properties,
      selected: false, // Don't save selection state
      points: shape.points,
      sides: shape.sides,
      radius: shape.radius,
      innerRadius: shape.innerRadius,
      width: shape.width,
      height: shape.height,
      controlPoints: shape.controlPoints,
      closed: shape.closed
    };
  }

  private serializeGroup(group: ShapeGroupClass): any {
    return {
      id: group.id,
      shapes: group.shapes.map(shape => this.serializeShape(shape)),
      transform: group.transform,
      selected: false // Don't save selection state
    };
  }

  getExportStatus(exportId: string): ExportProgress | null {
    return this.activeExports.get(exportId) || null;
  }

  getExportFile(exportId: string): string | null {
    return this.exportResults.get(exportId) || null;
  }

  getIndividualFiles(exportId: string): { imageFiles: any[], projectFiles: any[] } | null {
    return this.individualFiles.get(exportId) || null;
  }

  getExportSettings(exportId: string): { batchSaveProjectFiles: boolean, exportAllImages: boolean, selectedImageIndices: number[] } | null {
    return this.exportSettings.get(exportId) || null;
  }

  getIndividualFile(exportId: string, filename: string): string | null {
    const exportDir = path.join(process.cwd(), 'exports', exportId);
    const filePath = path.join(exportDir, filename);
    
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    
    return null;
  }

  cleanupOldExports(): void {
    // Clean up exports older than 24 hours
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
    
    for (const [exportId, progress] of Array.from(this.activeExports.entries())) {
      const timestamp = parseInt(exportId.split('_')[1]);
      if (timestamp < cutoffTime) {
        // Remove from tracking
        this.activeExports.delete(exportId);
        
        // Delete file if it exists
        const filePath = this.exportResults.get(exportId);
        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        this.exportResults.delete(exportId);
        
        // Clean up individual files tracking and export settings
        this.individualFiles.delete(exportId);
        this.exportSettings.delete(exportId);
        
        // Clean up export directory
        const exportDir = path.join(process.cwd(), 'exports', exportId);
        if (fs.existsSync(exportDir)) {
          fs.rmSync(exportDir, { recursive: true, force: true });
        }
      }
    }
  }
}