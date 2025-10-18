import { ImageFormat, ExportOptions } from '../../client/src/lib/imageExport';
import { ProjectManager } from '../../client/src/lib/projectManager';
import { Shape, ShapeGroupClass } from '../../client/src/lib/shapes';
import { CanvasSettings, Artboard } from '../../client/src/lib/shapeTypes';
import { 
  BatchConfigSettings, 
  EnhancedBatchConfig, 
  GenerationSet, 
  GenerationSetMode, 
  ShapeCountMode,
  ZIndexConfig,
  SupportedShapeType,
  exportJobs,
  InsertExportJob,
  ExportJob
} from '../../shared/schema';
import { DEFAULT_BATCH_EXPORT_SETTINGS } from '../../shared/exportSchema';
import JSZip from 'jszip';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../db';
import { eq } from 'drizzle-orm';

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

// Enhanced batch export result for generation sets
export interface EnhancedBatchExportResult extends BatchExportResult {
  mode: GenerationSetMode;
  generationSetsProcessed?: number;
  totalGenerationSets?: number;
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
    // Use shared defaults to ensure consistency across the application
    return DEFAULT_BATCH_EXPORT_SETTINGS;
  }

  mergeBatchSettings(userSettings: Partial<BatchExportSettings>): BatchExportSettings {
    const defaults = this.getDefaultBatchSettings();
    return { ...defaults, ...userSettings };
  }

  // Legacy method for backward compatibility
  async startBatchExport(
    shapes: Shape[],
    groups: ShapeGroupClass[],
    canvasSettings: CanvasSettings,
    batchConfigSettings: BatchConfigSettings,
    enabledShapeTypes: Set<string>,
    userSettings: Partial<BatchExportSettings> & { exportAllImages?: boolean, selectedImageIndices?: number[] },
    generateShapesFunction: (config: any) => { shapes: Shape[], groups: ShapeGroupClass[] },
    userId?: string
  ): Promise<BatchExportResult>;
  
  // New enhanced method for generation sets
  async startBatchExport(
    shapes: Shape[],
    groups: ShapeGroupClass[],
    canvasSettings: CanvasSettings,
    enhancedConfig: EnhancedBatchConfig,
    enabledShapeTypes: Set<string>,
    userSettings: Partial<BatchExportSettings> & { exportAllImages?: boolean, selectedImageIndices?: number[] },
    generateShapesFunction: (config: any, enabledTypes?: Set<SupportedShapeType>) => { shapes: Shape[], groups: ShapeGroupClass[] },
    userId?: string
  ): Promise<EnhancedBatchExportResult>;
  
  // Implementation with overload handling
  async startBatchExport(
    shapes: Shape[],
    groups: ShapeGroupClass[],
    canvasSettings: CanvasSettings,
    configSettings: BatchConfigSettings | EnhancedBatchConfig,
    enabledShapeTypes: Set<string>,
    userSettings: Partial<BatchExportSettings> & { exportAllImages?: boolean, selectedImageIndices?: number[] },
    generateShapesFunction: (config: any, enabledTypes?: Set<SupportedShapeType>) => { shapes: Shape[], groups: ShapeGroupClass[] },
    userId: string = 'dev-user'
  ): Promise<BatchExportResult | EnhancedBatchExportResult> {
    // Detect configuration type and delegate to appropriate handler
    const isEnhanced = this.isEnhancedBatchConfig(configSettings);
    
    if (isEnhanced) {
      return this.startEnhancedBatchExport(
        shapes,
        groups,
        canvasSettings,
        configSettings as EnhancedBatchConfig,
        enabledShapeTypes,
        userSettings,
        generateShapesFunction,
        userId
      );
    } else {
      return this.startLegacyBatchExport(
        shapes,
        groups,
        canvasSettings,
        configSettings as BatchConfigSettings,
        enabledShapeTypes,
        userSettings,
        generateShapesFunction,
        userId
      );
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
      await this.updateExportJobProgress(exportId, progress);
      
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
        await this.updateExportJobProgress(exportId, progress);
        
        // Generate shapes for this iteration
        const { shapes: currentShapes, groups: currentGroups } = generateShapesFunction(batchConfigSettings);
        currentStep++;
        
        // Export image
        progress.currentStep = `Exporting image ${i + 1} of ${settings.batchExportCount}`;
        progress.progress = Math.round((currentStep / totalSteps) * 100);
        this.activeExports.set(exportId, progress);
        await this.updateExportJobProgress(exportId, progress);
        
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
        await this.updateExportJobProgress(exportId, progress);
      }
      
      if (settings.packageAsZip) {
        // Create ZIP file
        progress.currentStep = 'Creating ZIP file...';
        progress.progress = Math.round((currentStep / totalSteps) * 100);
        this.activeExports.set(exportId, progress);
        await this.updateExportJobProgress(exportId, progress);
        
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
        
        // Update database with final results
        await this.updateExportJobResults(exportId, {
          downloadUrl: `/api/export/download/${exportId}`,
          downloadPath: zipPath,
          packageType: 'zip'
        });
        await this.updateExportJobProgress(exportId, progress);
      } else {
        // Complete individual files export
        progress.status = 'completed';
        progress.progress = 100;
        progress.currentStep = 'Individual files export completed successfully';
        this.activeExports.set(exportId, progress);
        
        // Store individual file information
        this.individualFiles.set(exportId, { imageFiles, projectFiles });
        
        // Update database with final results
        await this.updateExportJobResults(exportId, {
          imageFiles,
          projectFiles,
          packageType: 'individual'
        });
        await this.updateExportJobProgress(exportId, progress);
      }
      
    } catch (error) {
      progress.status = 'error';
      progress.errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.activeExports.set(exportId, progress);
      
      // Update database with error status
      await this.updateExportJobProgress(exportId, progress);
    }
  }

  private generateBatchFilename(settings: BatchExportSettings, index: number): string {
    const parts = [];
    
    if (settings.customPrefix) {
      // Sanitize custom prefix to prevent path traversal
      const sanitizedPrefix = this.sanitizeFilename(settings.customPrefix);
      if (sanitizedPrefix) {
        parts.push(sanitizedPrefix);
      }
    }
    
    if (settings.filename?.trim()) {
      // Sanitize filename to prevent path traversal
      const sanitizedFilename = this.sanitizeFilename(settings.filename.trim());
      if (sanitizedFilename) {
        parts.push(sanitizedFilename);
      } else {
        parts.push('batch-export'); // Fallback if sanitization removes everything
      }
    } else {
      parts.push('batch-export');
    }
    
    // Add index with zero-padding
    const paddedIndex = index.toString().padStart(3, '0');
    parts.push(paddedIndex);
    
    return parts.join('-');
  }

  // Sanitize filename to prevent path traversal attacks and ensure valid filenames
  private sanitizeFilename(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // Remove null bytes and control characters
    let sanitized = input.replace(/[\x00-\x1f\x80-\x9f]/g, '');
    
    // Remove path traversal sequences
    sanitized = sanitized.replace(/\.\./g, '');
    
    // Remove path separators and dangerous characters
    sanitized = sanitized.replace(/[\\\/:|*?"<>]/g, '');
    
    // Replace multiple spaces/dashes with single dash
    sanitized = sanitized.replace(/[\s\-]+/g, '-');
    
    // Remove leading/trailing dashes and dots
    sanitized = sanitized.replace(/^[\-\.]+|[\-\.]+$/g, '');
    
    // Limit length to prevent filesystem issues
    sanitized = sanitized.substring(0, 100);
    
    // Ensure it's not empty and doesn't start with a dot
    if (!sanitized || sanitized.startsWith('.')) {
      return '';
    }
    
    return sanitized;
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

  async getExportStatus(exportId: string): Promise<ExportProgress | null> {
    // Try in-memory cache first for performance
    const cached = this.activeExports.get(exportId);
    if (cached) {
      return cached;
    }
    
    // Query from database
    try {
      const [job] = await db.select().from(exportJobs).where(eq(exportJobs.exportId, exportId));
      
      if (!job) {
        return null;
      }
      
      // Convert database record to ExportProgress format
      const progress = job.progress as any;
      const results = job.results as any;
      
      const exportProgress: ExportProgress = {
        exportId: job.exportId,
        status: job.status as any,
        progress: progress?.progress || 0,
        currentStep: progress?.currentStep || '',
        imagesCompleted: progress?.imagesCompleted || 0,
        totalImages: progress?.totalImages || 0,
        estimatedTimeRemaining: progress?.estimatedTimeRemaining,
        errorMessage: job.error || undefined,
        downloadPath: results?.downloadUrl || results?.downloadPath
      };
      
      // Cache it for future requests
      this.activeExports.set(exportId, exportProgress);
      
      return exportProgress;
    } catch (error) {
      console.error(`[ExportService] Error fetching export status from database:`, error);
      return null;
    }
  }

  /**
   * Create a new export job in the database
   */
  private async createExportJob(
    exportId: string,
    userId: string,
    progress: ExportProgress,
    config: any
  ): Promise<void> {
    try {
      await db.insert(exportJobs).values({
        exportId,
        userId,
        status: progress.status,
        progress: {
          progress: progress.progress,
          currentStep: progress.currentStep,
          imagesCompleted: progress.imagesCompleted,
          totalImages: progress.totalImages,
          estimatedTimeRemaining: progress.estimatedTimeRemaining
        },
        config,
        results: null,
        error: progress.errorMessage || null
      });
      
      console.log(`[ExportService] Created export job in database: ${exportId}`);
    } catch (error) {
      console.error(`[ExportService] Error creating export job in database:`, error);
    }
  }

  /**
   * Update export job progress in the database
   */
  private async updateExportJobProgress(
    exportId: string,
    progress: ExportProgress
  ): Promise<void> {
    try {
      await db.update(exportJobs)
        .set({
          status: progress.status,
          progress: {
            progress: progress.progress,
            currentStep: progress.currentStep,
            imagesCompleted: progress.imagesCompleted,
            totalImages: progress.totalImages,
            estimatedTimeRemaining: progress.estimatedTimeRemaining
          },
          error: progress.errorMessage || null,
          completedAt: progress.status === 'completed' || progress.status === 'error' ? new Date() : null
        })
        .where(eq(exportJobs.exportId, exportId));
    } catch (error) {
      console.error(`[ExportService] Error updating export job progress in database:`, error);
    }
  }

  /**
   * Update export job results in the database
   */
  private async updateExportJobResults(
    exportId: string,
    results: any
  ): Promise<void> {
    try {
      await db.update(exportJobs)
        .set({
          results,
          status: 'completed',
          completedAt: new Date()
        })
        .where(eq(exportJobs.exportId, exportId));
    } catch (error) {
      console.error(`[ExportService] Error updating export job results in database:`, error);
    }
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
    // Validate input parameters
    if (!exportId || !filename) {
      return null;
    }
    
    // Sanitize filename to prevent path traversal
    const sanitizedFilename = this.sanitizeFilename(filename);
    if (!sanitizedFilename) {
      return null;
    }
    
    const exportDir = path.join(process.cwd(), 'exports', exportId);
    const resolvedExportDir = path.resolve(exportDir);
    const requestedPath = path.resolve(exportDir, sanitizedFilename);
    
    // Critical security check: Ensure the resolved path is within the export directory
    if (!requestedPath.startsWith(resolvedExportDir + path.sep) && requestedPath !== resolvedExportDir) {
      return null;
    }
    
    // Additional security: Only allow access to files we've actually tracked
    const trackedFiles = this.individualFiles.get(exportId);
    if (trackedFiles) {
      const isTrackedFile = [
        ...trackedFiles.imageFiles.map(f => f.filename),
        ...trackedFiles.projectFiles.map(f => f.filename)
      ].includes(sanitizedFilename);
      
      if (!isTrackedFile) {
        return null;
      }
    }
    
    // Final check: file exists and is within bounds
    if (fs.existsSync(requestedPath)) {
      return requestedPath;
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

  // Helper method to detect if config is EnhancedBatchConfig with robust runtime validation
  private isEnhancedBatchConfig(config: any): config is EnhancedBatchConfig {
    if (!config || typeof config !== 'object') {
      return false;
    }
    
    // Check for required EnhancedBatchConfig properties
    if (!('mode' in config)) {
      return false;
    }
    
    // Validate mode value using string comparison (more reliable than enum check)
    const validModes = ['single', 'multi'] as const;
    if (!validModes.includes(config.mode)) {
      return false;
    }
    
    // Check for generationSets array (required for enhanced config)
    if (!('generationSets' in config) || !Array.isArray(config.generationSets)) {
      return false;
    }
    
    // Check for globalSettings object
    if (!('globalSettings' in config) || typeof config.globalSettings !== 'object') {
      return false;
    }
    
    // For single mode, legacyBatchConfig should be present
    if (config.mode === 'single' && !('legacyBatchConfig' in config)) {
      return false;
    }
    
    return true;
  }

  // Validation for mode restrictions
  private validateModeRestrictions(config: EnhancedBatchConfig): void {
    if (config.mode === GenerationSetMode.MULTI) {
      const { modeRestrictions } = config;
      
      // Check maximum generation sets
      if (config.generationSets.length > modeRestrictions.maxGenerationSets) {
        throw new Error(`Too many generation sets: ${config.generationSets.length} exceeds maximum of ${modeRestrictions.maxGenerationSets}`);
      }
      
      // Check if multi-generation is restricted to fixed count only
      if (modeRestrictions.multiGenerationOnlyForFixedCount) {
        for (const set of config.generationSets) {
          if (set.enabled && set.shapeCountMode !== ShapeCountMode.FIXED) {
            throw new Error(`Multi-generation mode restricted to fixed shape count only. Set "${set.name}" uses ${set.shapeCountMode} mode.`);
          }
        }
      }
      
      // Check shape count limits per set
      for (const set of config.generationSets) {
        if (!set.enabled) continue;
        
        const shapeCount = set.shapeCountMode === ShapeCountMode.FIXED 
          ? set.shapeCountFixed 
          : Math.max(set.shapeCountRange[0], set.shapeCountRange[1]);
          
        if (shapeCount < modeRestrictions.minShapesPerSet) {
          throw new Error(`Set "${set.name}" has too few shapes: ${shapeCount} < minimum ${modeRestrictions.minShapesPerSet}`);
        }
        
        if (shapeCount > modeRestrictions.maxShapesPerSet) {
          throw new Error(`Set "${set.name}" has too many shapes: ${shapeCount} > maximum ${modeRestrictions.maxShapesPerSet}`);
        }
      }
    }
  }
  
  // Calculate total images for enhanced config
  private calculateTotalImages(config: EnhancedBatchConfig, settings: BatchExportSettings): number {
    if (config.mode === GenerationSetMode.SINGLE) {
      return settings.batchExportCount;
    } else {
      // For multi-generation, we still use the batch export count as total images to generate
      // The generation sets define the composition within each image
      return settings.batchExportCount;
    }
  }

  // Legacy batch export implementation (backward compatibility)
  private async startLegacyBatchExport(
    shapes: Shape[],
    groups: ShapeGroupClass[],
    canvasSettings: CanvasSettings,
    batchConfigSettings: BatchConfigSettings,
    enabledShapeTypes: Set<string>,
    userSettings: Partial<BatchExportSettings> & { exportAllImages?: boolean, selectedImageIndices?: number[] },
    generateShapesFunction: (config: any) => { shapes: Shape[], groups: ShapeGroupClass[] },
    userId: string = 'dev-user'
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
    
    // Persist to database
    await this.createExportJob(exportId, userId, progress, {
      shapes: shapes.map(s => this.serializeShape(s)),
      groups: groups.map(g => this.serializeGroup(g)),
      canvasSettings,
      batchConfigSettings,
      enabledShapeTypes: Array.from(enabledShapeTypes),
      userSettings
    });
    
    // Start async batch processing using legacy method
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

  // Enhanced batch export implementation for generation sets
  private async startEnhancedBatchExport(
    shapes: Shape[],
    groups: ShapeGroupClass[],
    canvasSettings: CanvasSettings,
    enhancedConfig: EnhancedBatchConfig,
    enabledShapeTypes: Set<string>,
    userSettings: Partial<BatchExportSettings> & { exportAllImages?: boolean, selectedImageIndices?: number[] },
    generateShapesFunction: (config: any, enabledTypes?: Set<SupportedShapeType>) => { shapes: Shape[], groups: ShapeGroupClass[] },
    userId: string = 'dev-user'
  ): Promise<EnhancedBatchExportResult> {
    // Validate mode restrictions
    this.validateModeRestrictions(enhancedConfig);
    
    const exportId = this.generateExportId();
    const settings = this.mergeBatchSettings(userSettings);
    
    // Calculate total images based on mode
    const totalImages = this.calculateTotalImages(enhancedConfig, settings);
    
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
      currentStep: 'Initializing enhanced batch export...',
      imagesCompleted: 0,
      totalImages
    };
    
    this.activeExports.set(exportId, progress);
    
    // Persist to database
    await this.createExportJob(exportId, userId, progress, {
      shapes: shapes.map(s => this.serializeShape(s)),
      groups: groups.map(g => this.serializeGroup(g)),
      canvasSettings,
      enhancedConfig,
      enabledShapeTypes: Array.from(enabledShapeTypes),
      userSettings
    });
    
    // Start async enhanced batch processing
    this.processBatchExportEnhanced(
      exportId,
      shapes,
      groups,
      canvasSettings,
      enhancedConfig,
      enabledShapeTypes,
      settings,
      generateShapesFunction
    );
    
    // Calculate additional metadata for enhanced result
    const enabledSets = enhancedConfig.generationSets.filter(set => set.enabled);
    
    // Return appropriate response based on packaging mode
    const baseResult = {
      success: true,
      exportId,
      estimatedDuration: this.calculateEstimatedDuration(totalImages),
      totalImages,
      mode: enhancedConfig.mode,
      generationSetsProcessed: enabledSets.length,
      totalGenerationSets: enhancedConfig.generationSets.length
    };
    
    if (settings.packageAsZip) {
      return {
        ...baseResult,
        downloadUrl: `/api/export/download/${exportId}`
      };
    } else {
      return {
        ...baseResult,
        imageFiles: [], // Will be populated when processing completes
        projectFiles: []
      };
    }
  }

  // Enhanced batch export processing for generation sets with z-index layering
  private async processBatchExportEnhanced(
    exportId: string,
    baseShapes: Shape[],
    baseGroups: ShapeGroupClass[],
    canvasSettings: CanvasSettings,
    enhancedConfig: EnhancedBatchConfig,
    enabledShapeTypes: Set<string>,
    settings: BatchExportSettings,
    generateShapesFunction: (config: any, enabledTypes?: Set<SupportedShapeType>) => { shapes: Shape[], groups: ShapeGroupClass[] }
  ): Promise<void> {
    const progress = this.activeExports.get(exportId);
    
    if (!progress) {
      throw new Error(`Export progress not found for ID: ${exportId}`);
    }
    
    try {
      // Validate enhanced config
      if (!enhancedConfig) {
        throw new Error('Enhanced configuration is required but not provided');
      }
      
      if (!enhancedConfig.generationSets || !Array.isArray(enhancedConfig.generationSets)) {
        throw new Error('Enhanced configuration must contain valid generationSets array');
      }
      
      if (!enhancedConfig.globalSettings) {
        throw new Error('Enhanced configuration must contain globalSettings');
      }
      progress.status = 'processing';
      progress.currentStep = settings.packageAsZip ? 'Creating enhanced ZIP archive...' : 'Creating enhanced individual files...';
      this.activeExports.set(exportId, progress);
      
      // Update database with processing status
      await this.updateExportJobProgress(exportId, progress);
      
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
      
      // Validate mode and handle different modes
      if (!enhancedConfig.mode) {
        throw new Error('Enhanced configuration mode is required');
      }
      
      if (enhancedConfig.mode === GenerationSetMode.SINGLE) {
        // Single mode: use legacy batch configuration
        await this.processSingleMode(
          exportId, 
          baseShapes, 
          baseGroups, 
          canvasSettings, 
          enhancedConfig, 
          enabledShapeTypes,
          settings, 
          generateShapesFunction, 
          zip, 
          exportDir, 
          imageFiles, 
          projectFiles, 
          timestamp
        );
      } else {
        // Multi mode: process generation sets
        await this.processMultiMode(
          exportId, 
          baseShapes, 
          baseGroups, 
          canvasSettings, 
          enhancedConfig, 
          settings, 
          generateShapesFunction, 
          zip, 
          exportDir, 
          imageFiles, 
          projectFiles, 
          timestamp
        );
      }
      
      // Finalize export (same for both modes)
      await this.finalizeExport(exportId, settings, zip, timestamp, imageFiles, projectFiles);
      
    } catch (error) {
      progress.status = 'error';
      progress.errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.activeExports.set(exportId, progress);
      
      // Update database with error status
      await this.updateExportJobProgress(exportId, progress);
    }
  }

  // Process single generation mode (backward compatibility)
  private async processSingleMode(
    exportId: string,
    baseShapes: Shape[],
    baseGroups: ShapeGroupClass[],
    canvasSettings: CanvasSettings,
    enhancedConfig: EnhancedBatchConfig,
    enabledShapeTypes: Set<string>,
    settings: BatchExportSettings,
    generateShapesFunction: (config: any, enabledTypes?: Set<SupportedShapeType>) => { shapes: Shape[], groups: ShapeGroupClass[] },
    zip: JSZip | null,
    exportDir: string,
    imageFiles: any[],
    projectFiles: any[],
    timestamp: string
  ): Promise<void> {
    const progress = this.activeExports.get(exportId);
    
    if (!progress) {
      throw new Error(`Export progress not found for ID: ${exportId}`);
    }
    
    const batchConfig = enhancedConfig.legacyBatchConfig;
    
    if (!batchConfig) {
      throw new Error('Single mode requires legacyBatchConfig to be provided');
    }
    
    if (!generateShapesFunction || typeof generateShapesFunction !== 'function') {
      throw new Error('generateShapesFunction is required but not provided or invalid');
    }
    
    if (settings.batchExportCount <= 0) {
      throw new Error('batchExportCount must be greater than 0');
    }
    
    // Calculate steps for progress tracking
    const totalSteps = settings.batchExportCount * 2 + (settings.packageAsZip ? 2 : 1);
    let currentStep = 0;
    
    for (let i = 0; i < settings.batchExportCount; i++) {
      // Update progress
      progress.currentStep = `Generating artwork ${i + 1} of ${settings.batchExportCount} (Single Mode)`;
      progress.progress = Math.round((currentStep / totalSteps) * 100);
      this.activeExports.set(exportId, progress);
      await this.updateExportJobProgress(exportId, progress);
      
      // Generate shapes for this iteration using legacy config
      const { shapes: currentShapes, groups: currentGroups } = generateShapesFunction(batchConfig);
      currentStep++;
      
      // Export image
      progress.currentStep = `Exporting image ${i + 1} of ${settings.batchExportCount}`;
      progress.progress = Math.round((currentStep / totalSteps) * 100);
      this.activeExports.set(exportId, progress);
      await this.updateExportJobProgress(exportId, progress);
      
      await this.exportImage(
        i + 1, 
        currentShapes, 
        currentGroups, 
        canvasSettings, 
        batchConfig, 
        settings, 
        zip, 
        exportDir, 
        imageFiles, 
        projectFiles, 
        timestamp,
        new Set(Array.from(enabledShapeTypes)) // Convert Set<string> to Set<string>
      );
      
      progress.imagesCompleted = i + 1;
      currentStep++;
      await this.updateExportJobProgress(exportId, progress);
    }
  }

  // Process multi-generation mode with z-index layering
  private async processMultiMode(
    exportId: string,
    baseShapes: Shape[],
    baseGroups: ShapeGroupClass[],
    canvasSettings: CanvasSettings,
    enhancedConfig: EnhancedBatchConfig,
    settings: BatchExportSettings,
    generateShapesFunction: (config: any, enabledTypes?: Set<SupportedShapeType>) => { shapes: Shape[], groups: ShapeGroupClass[] },
    zip: JSZip | null,
    exportDir: string,
    imageFiles: any[],
    projectFiles: any[],
    timestamp: string
  ): Promise<void> {
    const progress = this.activeExports.get(exportId);
    
    if (!progress) {
      throw new Error(`Export progress not found for ID: ${exportId}`);
    }
    
    if (!generateShapesFunction || typeof generateShapesFunction !== 'function') {
      throw new Error('generateShapesFunction is required but not provided or invalid');
    }
    
    if (settings.batchExportCount <= 0) {
      throw new Error('batchExportCount must be greater than 0');
    }
    
    // Filter enabled generation sets and sort by generation order
    const enabledSets = enhancedConfig.generationSets
      .filter(set => set.enabled)
      .sort((a, b) => (a.generationOrder ?? 0) - (b.generationOrder ?? 0));
      
    if (enabledSets.length === 0) {
      throw new Error('No enabled generation sets found for multi-generation mode');
    }
      
    // Calculate steps for progress tracking
    const totalSteps = settings.batchExportCount * 2 + (settings.packageAsZip ? 2 : 1);
    let currentStep = 0;
    
    for (let i = 0; i < settings.batchExportCount; i++) {
      // Update progress
      progress.currentStep = `Generating composite artwork ${i + 1} of ${settings.batchExportCount} (Multi Mode)`;
      progress.progress = Math.round((currentStep / totalSteps) * 100);
      this.activeExports.set(exportId, progress);
      await this.updateExportJobProgress(exportId, progress);
      
      // Accumulate shapes from all generation sets with proper z-index layering
      const compositeShapes: Shape[] = [];
      const compositeGroups: ShapeGroupClass[] = [];
      
      // Process each generation set ONCE - each set generates exactly its defined shape count
      for (let setIndex = 0; setIndex < enabledSets.length; setIndex++) {
        const generationSet = enabledSets[setIndex];
        
        if (!generationSet) {
          throw new Error(`Generation set at index ${setIndex} is null or undefined`);
        }
        
        if (!generationSet.batchConfig) {
          throw new Error(`Generation set "${generationSet.name || setIndex}" is missing required batchConfig`);
        }
        
        if (!generationSet.enabledShapeTypes || !Array.isArray(generationSet.enabledShapeTypes)) {
          throw new Error(`Generation set "${generationSet.name || setIndex}" has invalid enabledShapeTypes`);
        }
        
        // Convert SupportedShapeType[] to Set<SupportedShapeType> for type safety
        const setEnabledTypes = new Set(generationSet.enabledShapeTypes);
        
        // Generate shapes for this generation set with error handling
        let setShapes: Shape[];
        let setGroups: ShapeGroupClass[];
        
        try {
          const result = generateShapesFunction(
            generationSet.batchConfig, 
            setEnabledTypes
          );
          setShapes = result.shapes;
          setGroups = result.groups;
        } catch (error) {
          throw new Error(`Failed to generate shapes for set "${generationSet.name || setIndex}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Apply z-index layering based on global settings
        const adjustedShapes = this.applyZIndexLayering(
          setShapes, 
          generationSet, 
          setIndex, 
          enhancedConfig.globalSettings.globalZIndexSettings
        );
        
        // Apply shape count restrictions for this generation set
        const finalShapes = this.applyShapeCountRestrictions(adjustedShapes, generationSet);
        
        // Add to composite
        compositeShapes.push(...finalShapes);
        compositeGroups.push(...setGroups);
      }
      
      currentStep++;
      
      // Export composite image
      progress.currentStep = `Exporting composite image ${i + 1} of ${settings.batchExportCount}`;
      progress.progress = Math.round((currentStep / totalSteps) * 100);
      this.activeExports.set(exportId, progress);
      await this.updateExportJobProgress(exportId, progress);
      
      await this.exportImage(
        i + 1, 
        compositeShapes, 
        compositeGroups, 
        canvasSettings, 
        enhancedConfig.generationSets[0]?.batchConfig, // Use first set's config for export settings
        settings, 
        zip, 
        exportDir, 
        imageFiles, 
        projectFiles, 
        timestamp,
        new Set(enabledSets.flatMap(set => set.enabledShapeTypes.map(type => type as string)))
      );
      
      progress.imagesCompleted = i + 1;
      currentStep++;
      await this.updateExportJobProgress(exportId, progress);
    }
  }

  // Apply z-index layering to shapes based on generation set configuration
  private applyZIndexLayering(
    shapes: Shape[], 
    generationSet: GenerationSet, 
    setIndex: number,
    globalZIndexSettings: any
  ): Shape[] {
    if (!shapes || !Array.isArray(shapes)) {
      throw new Error('Invalid shapes array provided to applyZIndexLayering');
    }
    
    if (!generationSet) {
      throw new Error('Generation set is required for z-index layering');
    }
    
    if (!globalZIndexSettings) {
      throw new Error('Global z-index settings are required');
    }
    
    // Use global settings if enabled, otherwise use per-set settings
    const zIndexConfig = globalZIndexSettings.useGlobalSettings 
      ? {
          baseOffset: (globalZIndexSettings.startingZIndex || 0) + (setIndex * (globalZIndexSettings.setSpacing || 10)),
          incrementPerShape: 1,
          incrementPerGeneration: globalZIndexSettings.setSpacing || 10
        }
      : generationSet.zIndexConfig || { baseOffset: 0, incrementPerShape: 1, incrementPerGeneration: 10 };
    
    return shapes.map((shape, shapeIndex) => {
      if (!shape) {
        throw new Error(`Shape at index ${shapeIndex} is null or undefined`);
      }
      
      // Calculate z-index for this shape
      const baseOffset = zIndexConfig.baseOffset || 0;
      const incrementPerShape = zIndexConfig.incrementPerShape || 1;
      const zIndex = baseOffset + (shapeIndex * incrementPerShape);
      
      // Apply z-index to shape properties (preserve existing properties)
      if (!shape.properties) {
        // Create minimal properties object with defaults for required fields
        shape.properties = {
          fillColor: '#000000',
          fillOpacity: 1,
          strokeColor: 'none',
          strokeWidth: 0,
          strokeOpacity: 1,
          blendMode: 'source-over' as any,
          zIndex: zIndex,
          blurRadius: 0
        };
      } else {
        // Only update the zIndex if properties already exist
        shape.properties.zIndex = zIndex;
      }
      return shape;
    });
  }

  // Apply shape count restrictions for a generation set
  private applyShapeCountRestrictions(shapes: Shape[], generationSet: GenerationSet): Shape[] {
    if (!shapes || !Array.isArray(shapes)) {
      throw new Error('Invalid shapes array provided to applyShapeCountRestrictions');
    }
    
    if (!generationSet) {
      throw new Error('Generation set is required for shape count restrictions');
    }
    
    let targetCount: number;
    
    if (generationSet.shapeCountMode === ShapeCountMode.FIXED) {
      targetCount = generationSet.shapeCountFixed;
      
      if (typeof targetCount !== 'number' || targetCount < 0) {
        throw new Error(`Invalid fixed shape count: ${targetCount}`);
      }
    } else {
      // Range mode: pick random count within range
      const shapeCountRange = generationSet.shapeCountRange;
      
      if (!Array.isArray(shapeCountRange) || shapeCountRange.length !== 2) {
        throw new Error('Shape count range must be an array of two numbers');
      }
      
      const [min, max] = shapeCountRange;
      
      if (typeof min !== 'number' || typeof max !== 'number' || min < 0 || max < min) {
        throw new Error(`Invalid shape count range: [${min}, ${max}]`);
      }
      
      targetCount = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // Return the first targetCount shapes (or all if fewer than target)
    return shapes.slice(0, Math.max(0, targetCount));
  }

  // Refactored image export logic (extracted from original processBatchExport)
  private async exportImage(
    index: number,
    shapes: Shape[],
    groups: ShapeGroupClass[],
    canvasSettings: CanvasSettings,
    batchConfig: BatchConfigSettings | undefined,
    settings: BatchExportSettings,
    zip: JSZip | null,
    exportDir: string,
    imageFiles: any[],
    projectFiles: any[],
    timestamp: string,
    enabledShapeTypes: Set<string>
  ): Promise<void> {
    // Create export options
    const exportOptions: any = {
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
    const mockImageData = Buffer.from(`mock-enhanced-image-data-${index}`);
    const blob = { arrayBuffer: async () => mockImageData.buffer } as Blob;
    
    // Generate filename
    const filename = this.generateBatchFilename(settings, index);
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
        url: `/api/export/files/${exportDir.split('/').pop()}/${imageFilename}`,
        index
      });
    }
    
    // Save project file if requested
    if (settings.batchSaveProjectFiles) {
      const projectData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        name: filename,
        canvasSettings,
        batchConfig,
        enabledShapeTypes: Array.from(enabledShapeTypes),
        shapes: shapes.map(shape => this.serializeShape(shape)),
        groups: groups.map(group => this.serializeGroup(group))
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
          url: `/api/export/files/${exportDir.split('/').pop()}/${projectFilename}`,
          index
        });
      }
    }
  }

  // Finalize export (handle ZIP creation or individual files completion)
  private async finalizeExport(
    exportId: string,
    settings: BatchExportSettings,
    zip: JSZip | null,
    timestamp: string,
    imageFiles: any[],
    projectFiles: any[]
  ): Promise<void> {
    const progress = this.activeExports.get(exportId)!;
    
    if (settings.packageAsZip) {
      // Create ZIP file
      progress.currentStep = 'Creating ZIP file...';
      progress.progress = 95;
      this.activeExports.set(exportId, progress);
      
      const zipBlob = await zip!.generateAsync({ type: 'nodebuffer' });
      const zipFilename = `enhanced-batch-export-${timestamp}.zip`;
      const zipPath = path.join(process.cwd(), 'exports', zipFilename);
      
      fs.writeFileSync(zipPath, zipBlob);
      
      // Complete export
      progress.status = 'completed';
      progress.progress = 100;
      progress.currentStep = 'Enhanced ZIP export completed successfully';
      progress.downloadPath = zipPath;
      this.activeExports.set(exportId, progress);
      this.exportResults.set(exportId, zipPath);
      
      // Update database with final results
      await this.updateExportJobResults(exportId, {
        downloadUrl: `/api/export/download/${exportId}`,
        downloadPath: zipPath,
        packageType: 'zip'
      });
      await this.updateExportJobProgress(exportId, progress);
    } else {
      // Complete individual files export
      progress.status = 'completed';
      progress.progress = 100;
      progress.currentStep = 'Enhanced individual files export completed successfully';
      this.activeExports.set(exportId, progress);
      
      // Store individual file information
      this.individualFiles.set(exportId, { imageFiles, projectFiles });
      
      // Update database with final results
      await this.updateExportJobResults(exportId, {
        imageFiles,
        projectFiles,
        packageType: 'individual'
      });
      await this.updateExportJobProgress(exportId, progress);
    }
  }
}