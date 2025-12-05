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
import { createCanvas, Canvas as NodeCanvas } from 'canvas';
import { renderShape } from '../lib/canvasRenderer';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import sharp from 'sharp';
import { execSync } from 'child_process';

export interface BatchExportSettings {
  // Format and quality
  format: ImageFormat;
  quality?: number; // 1-100 for lossy formats
  
  // Scale and dimensions  
  scale?: number;
  scope?: 'all' | 'artboard'; // Export mode: 'all' = fit to all shapes, 'artboard' = use artboard bounds
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

  /**
   * Render shapes to a node-canvas Canvas
   * @param shapes - Array of shapes to render
   * @param canvasSettings - Canvas dimensions and settings
   * @param exportOptions - Export options including background, margins, scale
   * @returns Canvas with rendered shapes
   */
  private renderShapesToCanvas(
    shapes: Shape[],
    canvasSettings: CanvasSettings,
    exportOptions: ExportOptions
  ): NodeCanvas {
    // Calculate canvas dimensions with scale and margins
    const scale = exportOptions.scale || 1;
    const margins = exportOptions.margins || { top: 0, right: 0, bottom: 0, left: 0 };
    
    // Calculate bounds of all content to export
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    // Use artboard bounds if provided (for artboard exports)
    if (exportOptions.artboardBounds) {
      minX = exportOptions.artboardBounds.x;
      minY = exportOptions.artboardBounds.y;
      maxX = exportOptions.artboardBounds.x + exportOptions.artboardBounds.width;
      maxY = exportOptions.artboardBounds.y + exportOptions.artboardBounds.height;
      console.log(`[ExportService] Using artboard bounds: ${minX},${minY} to ${maxX},${maxY}`);
    } else {
      // Get bounds of all shapes
      shapes.forEach(shape => {
        const bounds = shape.getBounds();
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
      });
      
      // If no valid bounds found after checking all content, use a minimal default
      if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
        minX = 0;
        minY = 0;
        maxX = 100;
        maxY = 100;
      }
      console.log(`[ExportService] Calculated bounds from ${shapes.length} shapes: ${minX},${minY} to ${maxX},${maxY}`);
    }
    
    // Calculate content dimensions
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // Use custom size if specified, otherwise use calculated content dimensions
    const baseWidth = exportOptions.width || contentWidth;
    const baseHeight = exportOptions.height || contentHeight;
    
    // Apply margins and scale
    const canvasWidth = (baseWidth + margins.left + margins.right) * scale;
    const canvasHeight = (baseHeight + margins.top + margins.bottom) * scale;
    
    console.log(`[ExportService] Creating canvas: ${canvasWidth}x${canvasHeight} (base: ${baseWidth}x${baseHeight}, scale: ${scale})`);
    console.log(`[ExportService] Rendering ${shapes.length} shapes`);
    
    // Create canvas
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    
    // Apply scale
    ctx.scale(scale, scale);
    
    // Translate for margins and to move content origin to (0,0)
    ctx.translate(margins.left - minX, margins.top - minY);
    
    // Draw background if requested
    if (exportOptions.includeBackground && exportOptions.backgroundColor) {
      console.log(`[ExportService] Drawing background: ${exportOptions.backgroundColor}`);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      ctx.fillStyle = exportOptions.backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.restore();
    }
    
    // Sort shapes by z-index for proper layering
    const sortedShapes = [...shapes].sort((a, b) => (a.properties.zIndex || 0) - (b.properties.zIndex || 0));
    
    // Render each shape
    for (let i = 0; i < sortedShapes.length; i++) {
      const shape = sortedShapes[i];
      console.log(`[ExportService] Rendering shape ${i + 1}/${sortedShapes.length}: type=${shape.type}, points=${shape.points?.length || 0}`);
      
      if (!shape.points || shape.points.length === 0) {
        console.warn(`[ExportService] Shape ${shape.type} has no points, skipping`);
        continue;
      }
      
      // Cast to server Shape type - they're compatible in structure
      renderShape(ctx, shape as any, !exportOptions.includeAdornments);
    }
    
    console.log('[ExportService] Canvas rendering complete');
    return canvas;
  }

  /**
   * Apply export options to a pre-composited canvas
   * This preserves blend modes and compositing while applying margins, bounds, backgrounds, etc.
   * @param sourceCanvas - The pre-composited canvas from generation sets
   * @param shapes - Array of shapes (for bounds calculation)
   * @param canvasSettings - Canvas dimensions
   * @param exportOptions - Export options to apply
   * @returns New canvas with export options applied
   */
  private applyExportOptionsToCanvas(
    sourceCanvas: NodeCanvas,
    shapes: Shape[],
    canvasSettings: CanvasSettings,
    exportOptions: ExportOptions
  ): NodeCanvas {
    const scale = exportOptions.scale || 1;
    const margins = exportOptions.margins || { top: 0, right: 0, bottom: 0, left: 0 };
    
    // Calculate bounds (same logic as renderShapesToCanvas)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    if (exportOptions.artboardBounds) {
      minX = exportOptions.artboardBounds.x;
      minY = exportOptions.artboardBounds.y;
      maxX = exportOptions.artboardBounds.x + exportOptions.artboardBounds.width;
      maxY = exportOptions.artboardBounds.y + exportOptions.artboardBounds.height;
      console.log(`[ExportService] Using artboard bounds for composited canvas: ${minX},${minY} to ${maxX},${maxY}`);
    } else {
      // Get bounds of all shapes
      shapes.forEach(shape => {
        const bounds = shape.getBounds();
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
      });
      
      if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
        minX = 0;
        minY = 0;
        maxX = 100;
        maxY = 100;
      }
      console.log(`[ExportService] Calculated bounds for composited canvas from ${shapes.length} shapes: ${minX},${minY} to ${maxX},${maxY}`);
    }
    
    // Calculate content dimensions
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // Use custom size if specified, otherwise use calculated content dimensions
    const baseWidth = exportOptions.width || contentWidth;
    const baseHeight = exportOptions.height || contentHeight;
    
    // Apply margins and scale
    const canvasWidth = (baseWidth + margins.left + margins.right) * scale;
    const canvasHeight = (baseHeight + margins.top + margins.bottom) * scale;
    
    console.log(`[ExportService] Creating final export canvas: ${canvasWidth}x${canvasHeight} (base: ${baseWidth}x${baseHeight}, scale: ${scale})`);
    
    // Create final export canvas
    const exportCanvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = exportCanvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get 2D context from export canvas');
    }
    
    // Apply scale
    ctx.scale(scale, scale);
    
    // Translate for margins and to move content origin to (0,0) - same as renderShapesToCanvas
    ctx.translate(margins.left - minX, margins.top - minY);
    
    // Draw background if requested
    if (exportOptions.includeBackground && exportOptions.backgroundColor) {
      console.log(`[ExportService] Drawing background: ${exportOptions.backgroundColor}`);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      ctx.fillStyle = exportOptions.backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.restore();
    }
    
    // Draw the pre-composited canvas at the origin
    // The sourceCanvas is centered at (width/2, height/2) from processGenerationSets
    // We need to draw it so that shapes at (minX, minY) appear at our origin
    ctx.drawImage(sourceCanvas, 0, 0);
    
    console.log('[ExportService] Applied export options to composited canvas');
    return exportCanvas;
  }

  /**
   * Convert canvas to image buffer with format support
   * @param canvas - The canvas to convert
   * @param format - Image format (png, jpeg, webp, etc.)
   * @param quality - Quality for lossy formats (0-1)
   * @returns Buffer containing image data
   */
  private canvasToBuffer(
    canvas: NodeCanvas,
    format: ImageFormat,
    quality: number = 0.92
  ): Buffer {
    const formatLower = format.toLowerCase();
    
    // node-canvas supports PNG and JPEG reliably
    if (formatLower === 'jpeg' || formatLower === 'jpg') {
      const buffer = canvas.toBuffer('image/jpeg', { quality });
      console.log(`[ExportService] Generated JPEG buffer, size: ${buffer.length} bytes`);
      return buffer;
    }
    
    // All other formats default to PNG
    // (WebP, AVIF, BMP not widely supported in node-canvas)
    if (formatLower !== 'png') {
      console.warn(`Format ${format} not fully supported, using PNG`);
    }
    
    const buffer = canvas.toBuffer('image/png');
    console.log(`[ExportService] Generated PNG buffer, size: ${buffer.length} bytes`);
    
    // Validate PNG header (PNG signature: 89 50 4E 47 0D 0A 1A 0A)
    if (buffer.length < 8) {
      console.error('[ExportService] PNG buffer too small:', buffer.length);
      throw new Error('Generated PNG buffer is too small');
    }
    
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const bufferSignature = buffer.slice(0, 8);
    
    if (!bufferSignature.equals(pngSignature)) {
      console.error('[ExportService] Invalid PNG signature:', bufferSignature);
      console.error('[ExportService] Expected:', pngSignature);
      console.error('[ExportService] Buffer preview (first 50 bytes):', buffer.slice(0, 50));
      throw new Error('Generated buffer does not have valid PNG signature');
    }
    
    console.log('[ExportService] PNG buffer validated successfully');
    return buffer;
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
    userId?: string,
    generationSetsMetadata?: {
      generationSets?: any[];
      exportSettings?: any;
      artboardSettings?: any;
    }
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
    userId: string = 'dev-user',
    generationSetsMetadata?: {
      generationSets?: any[];
      exportSettings?: any;
      artboardSettings?: any;
    }
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
        userId,
        generationSetsMetadata
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
    generateShapesFunction: (config: any) => { shapes: Shape[], groups: ShapeGroupClass[] },
    generationSetsMetadata?: {
      generationSets?: any[];
      exportSettings?: any;
      artboardSettings?: any;
    }
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
        const generationResult = generateShapesFunction(batchConfigSettings) as any;
        const { shapes: currentShapes, groups: currentGroups, compositedCanvas } = generationResult;
        currentStep++;
        
        // Export image
        progress.currentStep = `Exporting image ${i + 1} of ${settings.batchExportCount}`;
        progress.progress = Math.round((currentStep / totalSteps) * 100);
        this.activeExports.set(exportId, progress);
        await this.updateExportJobProgress(exportId, progress);
        
        // Build export options
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
        
        // Set artboard bounds if scope is 'artboard'
        if (settings.scope === 'artboard') {
          exportOptions.artboardBounds = {
            x: -(canvasSettings.width / 2),
            y: -(canvasSettings.height / 2),
            width: canvasSettings.width,
            height: canvasSettings.height
          };
        }
        
        if (settings.useCustomSize && settings.customWidth && settings.customHeight) {
          exportOptions.width = settings.customWidth;
          exportOptions.height = settings.customHeight;
        }
        
        let imageBuffer: Buffer;
        
        // CRITICAL FIX: If generation sets returned a pre-composited canvas, use it as source
        // but still apply export options (margins, bounds, background) for parity
        if (compositedCanvas) {
          console.log(`[ExportService] Using pre-composited canvas from generation sets with export options applied`);
          const finalCanvas = this.applyExportOptionsToCanvas(compositedCanvas, currentShapes, canvasSettings, exportOptions);
          imageBuffer = this.canvasToBuffer(finalCanvas, settings.format, exportOptions.quality);
        } else {
          // Normal flow: render shapes to canvas
          const canvas = this.renderShapesToCanvas(currentShapes, canvasSettings, exportOptions);
          imageBuffer = this.canvasToBuffer(canvas, settings.format, exportOptions.quality);
        }
        
        // Generate filename
        const filename = this.generateBatchFilename(settings, i + 1);
        const imageFilename = `${filename}.${settings.format}`;
        
        if (settings.packageAsZip) {
          // Add to ZIP
          zip!.file(imageFilename, imageBuffer);
        } else {
          // Save individual file
          const imagePath = path.join(exportDir, imageFilename);
          fs.writeFileSync(imagePath, imageBuffer);
          
          // Track individual file
          imageFiles.push({
            filename: imageFilename,
            url: `/api/export/files/${exportId}/${imageFilename}`,
            index: i + 1
          });
        }
        
        // Save project file if requested (minimal schema: shapes + artboard only)
        if (settings.batchSaveProjectFiles) {
          const projectData: any = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            name: filename,
            shapes: currentShapes.map((shape: Shape) => this.serializeShape(shape)),
            ...(currentGroups && currentGroups.length > 0 && { 
              groups: currentGroups.map((group: ShapeGroupClass) => this.serializeGroup(group)) 
            }),
            artboard: {
              width: canvasSettings.width || 1200,
              height: canvasSettings.height || 800,
              backgroundColor: canvasSettings.backgroundColor || '#ffffff'
            }
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
      transform: group.transform
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

  async getExportFile(exportId: string): Promise<string | null> {
    // First check in-memory cache for backwards compatibility
    const cachedPath = this.exportResults.get(exportId);
    if (cachedPath) {
      return cachedPath;
    }

    // Query database for export job
    try {
      const [exportJob] = await db
        .select()
        .from(exportJobs)
        .where(eq(exportJobs.exportId, exportId))
        .limit(1);

      if (!exportJob || !exportJob.results) {
        return null;
      }

      // Extract downloadPath from results JSONB column
      const results = exportJob.results as any;
      const downloadPath = results?.downloadPath;

      if (downloadPath && fs.existsSync(downloadPath)) {
        return downloadPath;
      }

      return null;
    } catch (error) {
      console.error(`[ExportService] Error fetching export file from database:`, error);
      return null;
    }
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
    userId: string = 'dev-user',
    generationSetsMetadata?: {
      generationSets?: any[];
      exportSettings?: any;
      artboardSettings?: any;
    }
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
      generateShapesFunction,
      generationSetsMetadata
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
    
    // Set artboard bounds if scope is 'artboard'
    if (settings.scope === 'artboard') {
      exportOptions.artboardBounds = {
        x: -(canvasSettings.width / 2),
        y: -(canvasSettings.height / 2),
        width: canvasSettings.width,
        height: canvasSettings.height
      };
    }
    
    if (settings.useCustomSize && settings.customWidth && settings.customHeight) {
      exportOptions.width = settings.customWidth;
      exportOptions.height = settings.customHeight;
    }
    
    // Render shapes to canvas and convert to image buffer
    const canvas = this.renderShapesToCanvas(shapes, canvasSettings, exportOptions);
    const imageBuffer = this.canvasToBuffer(canvas, settings.format, exportOptions.quality);
    
    // Generate filename
    const filename = this.generateBatchFilename(settings, index);
    const imageFilename = `${filename}.${settings.format}`;
    
    if (settings.packageAsZip) {
      // Add to ZIP
      zip!.file(imageFilename, imageBuffer);
    } else {
      // Save individual file
      const imagePath = path.join(exportDir, imageFilename);
      fs.writeFileSync(imagePath, imageBuffer);
      
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
        shapes: shapes.map(shape => this.serializeShape(shape))
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

/**
 * High-Resolution Export Service
 * 
 * Uses Headless Chromium + Sharp for exports that exceed browser canvas limits.
 * Produces 16-bit TIFF with sRGB ICC profiles for professional print quality.
 * 
 * TILED PROCESSING: For very large images (e.g., A0+ at 600 DPI), the service
 * automatically breaks rendering into tiles to avoid memory limits.
 */

// Tile planning interface for breaking large images into manageable chunks
export interface TilePlan {
  needsTiling: boolean;
  totalWidth: number;
  totalHeight: number;
  tileWidth: number;
  tileHeight: number;
  tilesX: number;
  tilesY: number;
  totalTiles: number;
  tiles: Array<{
    index: number;
    x: number;
    y: number;
    width: number;
    height: number;
    row: number;
    col: number;
  }>;
  estimatedMemoryMB: number;
  reason?: string;
}

// Progress callback for tiled exports
export type TileProgressCallback = (progress: {
  phase: 'preparing' | 'rendering' | 'combining' | 'encoding' | 'completed' | 'error';
  currentTile?: number;
  totalTiles?: number;
  percent: number;
  message: string;
}) => void;

// Constants for tile planning
const TILE_MEMORY_TARGET_MB = 256; // Target memory per tile in MB
const MAX_TILE_PIXELS = 64_000_000; // Max 64 megapixels per tile (~8000x8000)
const TILING_THRESHOLD_PIXELS = 100_000_000; // Enable tiling above 100 megapixels
const TILING_THRESHOLD_BYTES = 400_000_000; // Enable tiling above 400MB raw

/**
 * Calculate optimal tile plan for a large image
 */
function calculateTilePlan(
  width: number, 
  height: number, 
  bitDepth: 8 | 16 = 8,
  channels: 3 | 4 = 4
): TilePlan {
  const totalPixels = width * height;
  const bytesPerPixel = (bitDepth === 16 ? 2 : 1) * channels;
  const totalBytes = totalPixels * bytesPerPixel;
  
  // Determine if tiling is needed
  const needsTiling = totalPixels > TILING_THRESHOLD_PIXELS || totalBytes > TILING_THRESHOLD_BYTES;
  
  if (!needsTiling) {
    return {
      needsTiling: false,
      totalWidth: width,
      totalHeight: height,
      tileWidth: width,
      tileHeight: height,
      tilesX: 1,
      tilesY: 1,
      totalTiles: 1,
      tiles: [{
        index: 0,
        x: 0,
        y: 0,
        width,
        height,
        row: 0,
        col: 0
      }],
      estimatedMemoryMB: totalBytes / (1024 * 1024)
    };
  }
  
  // Calculate optimal tile size based on memory target
  const targetTileBytes = TILE_MEMORY_TARGET_MB * 1024 * 1024;
  const targetTilePixels = Math.min(targetTileBytes / bytesPerPixel, MAX_TILE_PIXELS);
  
  // Calculate tile dimensions (prefer square-ish tiles)
  const tileSize = Math.floor(Math.sqrt(targetTilePixels));
  
  // Ensure tile size doesn't exceed image dimensions
  const tileWidth = Math.min(tileSize, width);
  const tileHeight = Math.min(tileSize, height);
  
  // Calculate grid dimensions
  const tilesX = Math.ceil(width / tileWidth);
  const tilesY = Math.ceil(height / tileHeight);
  const totalTiles = tilesX * tilesY;
  
  // Generate tile specifications
  const tiles: TilePlan['tiles'] = [];
  let index = 0;
  
  for (let row = 0; row < tilesY; row++) {
    for (let col = 0; col < tilesX; col++) {
      const x = col * tileWidth;
      const y = row * tileHeight;
      // Handle edge tiles that may be smaller
      const w = Math.min(tileWidth, width - x);
      const h = Math.min(tileHeight, height - y);
      
      tiles.push({ index, x, y, width: w, height: h, row, col });
      index++;
    }
  }
  
  const tileBytes = tileWidth * tileHeight * bytesPerPixel;
  
  return {
    needsTiling: true,
    totalWidth: width,
    totalHeight: height,
    tileWidth,
    tileHeight,
    tilesX,
    tilesY,
    totalTiles,
    tiles,
    estimatedMemoryMB: tileBytes / (1024 * 1024),
    reason: `Image ${width}x${height} (${(totalBytes / 1024 / 1024).toFixed(1)} MB) exceeds threshold, splitting into ${tilesX}x${tilesY} tiles`
  };
}

export interface HighResExportRequest {
  shapes: any[];
  groups?: any[];
  artboard: {
    x?: number;
    y?: number;
    width: number;
    height: number;
    backgroundColor: string;
    dpi: number;
    printConfig?: any;
  };
  exportSettings: {
    format: 'tiff' | 'png';
    bitDepth?: 8 | 16;
    dpi?: number;
    scale?: number;
    includeBleed?: boolean;
    includePrintMarks?: boolean;
    backgroundColor?: string;
    backgroundMode?: 'transparent' | 'artboard' | 'custom';
    compression?: 'none' | 'deflate';
    flattenToRgb?: boolean;
    matteColor?: string;
  };
  // Optional progress callback for tiled exports
  onProgress?: TileProgressCallback;
}

export interface HighResExportResult {
  success: boolean;
  buffer?: Buffer;
  mimeType?: string;
  filename?: string;
  width?: number;
  height?: number;
  error?: string;
  duration?: number;
}

let chromiumPathCache: string | null = null;

function findChromiumPath(): string {
  if (chromiumPathCache) return chromiumPathCache;
  
  try {
    const result = execSync('which chromium', { encoding: 'utf-8' }).trim();
    if (result && fs.existsSync(result)) {
      chromiumPathCache = result;
      return result;
    }
  } catch {}
  
  const commonPaths = [
    '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ];
  
  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      chromiumPathCache = p;
      return p;
    }
  }
  
  throw new Error('Chromium not found. Please install Chromium via replit.nix');
}

function convertUnitToPixels(value: number, unit: string, dpi: number): number {
  switch (unit) {
    case 'pixels': return value;
    case 'mm': return (value / 25.4) * dpi;
    case 'cm': return (value / 2.54) * dpi;
    case 'inches': return value * dpi;
    default: return value;
  }
}

// Progress tracking for high-res exports
export interface HighResExportProgress {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  phase: 'preparing' | 'rendering' | 'combining' | 'encoding' | 'completed' | 'error';
  percent: number;
  message: string;
  currentTile?: number;
  totalTiles?: number;
  startTime: number;
  endTime?: number;
  error?: string;
  result?: {
    buffer: Buffer;
    mimeType: string;
    filename: string;
    width: number;
    height: number;
  };
}

export class HighResolutionExportService {
  private browser: Browser | null = null;
  private activeHighResExports = new Map<string, HighResExportProgress>();
  
  // Get progress for an export
  getExportProgress(exportId: string): HighResExportProgress | undefined {
    return this.activeHighResExports.get(exportId);
  }
  
  // Start async export and return immediately with exportId
  async startAsyncExport(request: HighResExportRequest): Promise<{ exportId: string; needsTiling: boolean; totalTiles?: number }> {
    const exportId = `highres_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate if tiling is needed
    const { artboard, exportSettings } = request;
    const { bitDepth = 16, scale = 1 } = exportSettings;
    const effectiveDpi = exportSettings.dpi || artboard.dpi || 300;
    
    let bleedPx = 0;
    let printMarksGutterPx = 0;
    
    if (artboard.printConfig) {
      const config = artboard.printConfig;
      const overlayUnit = config.overlays?.overlayUnit || 'pixels';
      
      if (exportSettings.includeBleed && config.overlays?.bleed?.render && config.overlays?.bleed?.amount > 0) {
        bleedPx = convertUnitToPixels(config.overlays.bleed.amount, overlayUnit, effectiveDpi);
      }
      
      if (exportSettings.includePrintMarks && config.overlays?.printMarks?.render) {
        const scaleMode = config.overlays.printMarks.scaleMode || 'none';
        let markLengthPx: number;
        let markOffsetPx: number;
        
        if (scaleMode === 'percent') {
          const minDimension = Math.min(artboard.width, artboard.height);
          markLengthPx = (config.overlays.printMarks.markLength / 100) * minDimension;
          markOffsetPx = (config.overlays.printMarks.markOffset / 100) * minDimension;
        } else {
          markLengthPx = convertUnitToPixels(config.overlays.printMarks.markLength, overlayUnit, effectiveDpi);
          markOffsetPx = convertUnitToPixels(config.overlays.printMarks.markOffset, overlayUnit, effectiveDpi);
        }
        
        printMarksGutterPx = markLengthPx + markOffsetPx + 5;
      }
    }
    
    const printExpansion = bleedPx + printMarksGutterPx;
    const canvasWidth = Math.ceil((artboard.width + printExpansion * 2) * scale);
    const canvasHeight = Math.ceil((artboard.height + printExpansion * 2) * scale);
    
    const channels: 3 | 4 = (exportSettings.flattenToRgb || exportSettings.backgroundMode !== 'transparent') ? 3 : 4;
    const tilePlan = calculateTilePlan(canvasWidth, canvasHeight, bitDepth, channels);
    
    // Initialize progress
    const progress: HighResExportProgress = {
      exportId,
      status: 'pending',
      phase: 'preparing',
      percent: 0,
      message: 'Starting export...',
      startTime: Date.now(),
      totalTiles: tilePlan.needsTiling ? tilePlan.totalTiles : undefined
    };
    
    this.activeHighResExports.set(exportId, progress);
    
    // Start export in background
    this.runAsyncExport(exportId, request).catch(error => {
      console.error(`[HighResExport] Async export ${exportId} failed:`, error);
    });
    
    return {
      exportId,
      needsTiling: tilePlan.needsTiling,
      totalTiles: tilePlan.needsTiling ? tilePlan.totalTiles : undefined
    };
  }
  
  // Run export asynchronously and update progress
  private async runAsyncExport(exportId: string, request: HighResExportRequest): Promise<void> {
    const progress = this.activeHighResExports.get(exportId);
    if (!progress) return;
    
    try {
      progress.status = 'processing';
      this.activeHighResExports.set(exportId, progress);
      
      // Add progress callback to request
      const requestWithProgress: HighResExportRequest = {
        ...request,
        onProgress: (update) => {
          const p = this.activeHighResExports.get(exportId);
          if (p) {
            p.phase = update.phase;
            p.percent = update.percent;
            p.message = update.message;
            p.currentTile = update.currentTile;
            p.totalTiles = update.totalTiles;
            this.activeHighResExports.set(exportId, p);
          }
        }
      };
      
      const result = await this.exportImage(requestWithProgress);
      
      if (result.success && result.buffer) {
        progress.status = 'completed';
        progress.phase = 'completed';
        progress.percent = 100;
        progress.message = 'Export completed successfully';
        progress.endTime = Date.now();
        progress.result = {
          buffer: result.buffer,
          mimeType: result.mimeType || 'application/octet-stream',
          filename: result.filename || `export-${Date.now()}.tiff`,
          width: result.width || 0,
          height: result.height || 0
        };
      } else {
        progress.status = 'error';
        progress.phase = 'error';
        progress.error = result.error || 'Export failed';
        progress.endTime = Date.now();
      }
      
      this.activeHighResExports.set(exportId, progress);
      
      // Clean up after 10 minutes
      setTimeout(() => {
        this.activeHighResExports.delete(exportId);
      }, 10 * 60 * 1000);
      
    } catch (error) {
      progress.status = 'error';
      progress.phase = 'error';
      progress.error = error instanceof Error ? error.message : 'Unknown error';
      progress.endTime = Date.now();
      this.activeHighResExports.set(exportId, progress);
    }
  }
  
  // Get export result (returns buffer if completed)
  getExportResult(exportId: string): HighResExportProgress['result'] | undefined {
    const progress = this.activeHighResExports.get(exportId);
    if (progress?.status === 'completed' && progress.result) {
      return progress.result;
    }
    return undefined;
  }
  
  // Clean up a completed export
  cleanupExport(exportId: string): void {
    this.activeHighResExports.delete(exportId);
  }
  
  async initialize(): Promise<void> {
    if (this.browser) return;
    
    const executablePath = findChromiumPath();
    console.log(`[HighResExport] Launching browser from: ${executablePath}`);
    
    this.browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions'
      ]
    });
    
    console.log('[HighResExport] Browser initialized');
  }
  
  async shutdown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('[HighResExport] Browser closed');
    }
  }
  
  async exportImage(request: HighResExportRequest): Promise<HighResExportResult> {
    const startTime = Date.now();
    const { artboard, exportSettings, onProgress } = request;
    const { bitDepth = 16, scale = 1 } = exportSettings;
    
    try {
      await this.initialize();
      
      if (!this.browser) {
        throw new Error('Browser not initialized');
      }
      
      // Calculate final canvas dimensions
      const effectiveDpi = exportSettings.dpi || artboard.printConfig?.outputSpecs?.dpi || artboard.dpi || 300;
      let bleedPx = 0;
      let printMarksGutterPx = 0;
      
      if (artboard.printConfig) {
        const config = artboard.printConfig;
        const overlayUnit = config.overlays?.overlayUnit || 'pixels';
        
        if (exportSettings.includeBleed && config.overlays?.bleed?.render && config.overlays?.bleed?.amount > 0) {
          bleedPx = convertUnitToPixels(config.overlays.bleed.amount, overlayUnit, effectiveDpi);
        }
        
        if (exportSettings.includePrintMarks && config.overlays?.printMarks?.render) {
          const scaleMode = config.overlays.printMarks.scaleMode || 'none';
          let markLengthPx: number;
          let markOffsetPx: number;
          
          if (scaleMode === 'percent') {
            const minDimension = Math.min(artboard.width, artboard.height);
            markLengthPx = (config.overlays.printMarks.markLength / 100) * minDimension;
            markOffsetPx = (config.overlays.printMarks.markOffset / 100) * minDimension;
          } else {
            markLengthPx = convertUnitToPixels(config.overlays.printMarks.markLength, overlayUnit, effectiveDpi);
            markOffsetPx = convertUnitToPixels(config.overlays.printMarks.markOffset, overlayUnit, effectiveDpi);
          }
          
          printMarksGutterPx = markLengthPx + markOffsetPx + 5;
        }
      }
      
      const printExpansion = bleedPx + printMarksGutterPx;
      const canvasWidth = Math.ceil((artboard.width + printExpansion * 2) * scale);
      const canvasHeight = Math.ceil((artboard.height + printExpansion * 2) * scale);
      
      // Calculate tile plan to determine if tiling is needed
      const channels: 3 | 4 = (exportSettings.flattenToRgb || exportSettings.backgroundMode !== 'transparent') ? 3 : 4;
      const tilePlan = calculateTilePlan(canvasWidth, canvasHeight, bitDepth, channels);
      
      if (tilePlan.needsTiling) {
        console.log(`[HighResExport] ${tilePlan.reason}`);
        console.log(`[HighResExport] Tile size: ${tilePlan.tileWidth}x${tilePlan.tileHeight}, Memory per tile: ~${tilePlan.estimatedMemoryMB.toFixed(1)} MB`);
        
        // Use tiled rendering path
        const result = await this.renderTiled(request, tilePlan);
        return {
          ...result,
          duration: Date.now() - startTime
        };
      }
      
      // Standard single-pass rendering
      const page = await this.browser.newPage();
      
      try {
        onProgress?.({
          phase: 'rendering',
          percent: 10,
          message: `Rendering ${canvasWidth}x${canvasHeight} image...`
        });
        
        const result = await this.renderAndCapture(page, request);
        
        onProgress?.({
          phase: 'completed',
          percent: 100,
          message: 'Export completed'
        });
        
        return {
          ...result,
          duration: Date.now() - startTime
        };
      } finally {
        await page.close();
      }
    } catch (error) {
      console.error('[HighResExport] Export failed:', error);
      request.onProgress?.({
        phase: 'error',
        percent: 0,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      };
    }
  }
  
  /**
   * Render a large image using tiled processing
   * Each tile is rendered separately and then combined using Sharp
   */
  private async renderTiled(request: HighResExportRequest, tilePlan: TilePlan): Promise<HighResExportResult> {
    const { shapes, groups = [], artboard, exportSettings, onProgress } = request;
    const { format = 'tiff', bitDepth = 16, scale = 1, backgroundMode = 'transparent', compression = 'none' } = exportSettings;
    
    const effectiveDpi = exportSettings.dpi || artboard.printConfig?.outputSpecs?.dpi || artboard.dpi || 300;
    
    // Calculate print expansion (same as single-pass)
    let bleedPx = 0;
    let printMarksGutterPx = 0;
    
    if (artboard.printConfig) {
      const config = artboard.printConfig;
      const overlayUnit = config.overlays?.overlayUnit || 'pixels';
      
      if (exportSettings.includeBleed && config.overlays?.bleed?.render && config.overlays?.bleed?.amount > 0) {
        bleedPx = convertUnitToPixels(config.overlays.bleed.amount, overlayUnit, effectiveDpi);
      }
      
      if (exportSettings.includePrintMarks && config.overlays?.printMarks?.render) {
        const scaleMode = config.overlays.printMarks.scaleMode || 'none';
        let markLengthPx: number;
        let markOffsetPx: number;
        
        if (scaleMode === 'percent') {
          const minDimension = Math.min(artboard.width, artboard.height);
          markLengthPx = (config.overlays.printMarks.markLength / 100) * minDimension;
          markOffsetPx = (config.overlays.printMarks.markOffset / 100) * minDimension;
        } else {
          markLengthPx = convertUnitToPixels(config.overlays.printMarks.markLength, overlayUnit, effectiveDpi);
          markOffsetPx = convertUnitToPixels(config.overlays.printMarks.markOffset, overlayUnit, effectiveDpi);
        }
        
        printMarksGutterPx = markLengthPx + markOffsetPx + 5;
      }
    }
    
    const printExpansion = bleedPx + printMarksGutterPx;
    
    let bgColor = 'transparent';
    if (backgroundMode === 'artboard') {
      bgColor = artboard.backgroundColor || '#ffffff';
    } else if (backgroundMode === 'custom' && exportSettings.backgroundColor) {
      bgColor = exportSettings.backgroundColor;
    }
    
    console.log(`[HighResExport] Starting tiled render: ${tilePlan.totalWidth}x${tilePlan.totalHeight}, ${tilePlan.totalTiles} tiles`);
    
    onProgress?.({
      phase: 'preparing',
      totalTiles: tilePlan.totalTiles,
      percent: 5,
      message: `Preparing ${tilePlan.tilesX}x${tilePlan.tilesY} tile grid (${tilePlan.totalTiles} tiles)...`
    });
    
    // Render each tile
    const tileBuffers: Array<{ buffer: Buffer; x: number; y: number; width: number; height: number }> = [];
    const page = await this.browser!.newPage();
    
    try {
      for (let i = 0; i < tilePlan.tiles.length; i++) {
        const tile = tilePlan.tiles[i];
        const tileProgress = Math.round(10 + (i / tilePlan.totalTiles) * 70); // 10-80% for tile rendering
        
        onProgress?.({
          phase: 'rendering',
          currentTile: i + 1,
          totalTiles: tilePlan.totalTiles,
          percent: tileProgress,
          message: `Rendering tile ${i + 1} of ${tilePlan.totalTiles} (${tile.col + 1},${tile.row + 1})...`
        });
        
        console.log(`[HighResExport] Rendering tile ${i + 1}/${tilePlan.totalTiles}: ${tile.width}x${tile.height} at (${tile.x}, ${tile.y})`);
        
        // Generate HTML for this tile with viewport offset
        const tileRenderData = {
          shapes,
          groups,
          artboard: {
            ...artboard,
            printConfig: artboard.printConfig
          },
          exportSettings: {
            ...exportSettings,
            dpi: effectiveDpi,
            bleedPx,
            printMarksGutterPx,
            printExpansion,
            backgroundColor: bgColor
          },
          canvasWidth: tile.width,
          canvasHeight: tile.height,
          scale,
          // Tile-specific viewport offset
          tileOffsetX: tile.x,
          tileOffsetY: tile.y,
          fullWidth: tilePlan.totalWidth,
          fullHeight: tilePlan.totalHeight
        };
        
        const tileHtml = this.generateTileRendererHtml(tileRenderData);
        
        await page.setViewport({
          width: Math.max(tile.width, 800),
          height: Math.max(tile.height, 600),
          deviceScaleFactor: 1
        });
        
        await page.setContent(tileHtml, { waitUntil: 'networkidle0' });
        
        const renderResult = await page.evaluate(() => {
          return (window as any).renderShapes();
        });
        
        if (!renderResult.success) {
          throw new Error(`Tile ${i + 1} render failed: ${renderResult.error}`);
        }
        
        // Capture tile as PNG buffer
        const pngDataUrl = await page.evaluate(() => {
          const canvas = document.getElementById('exportCanvas') as HTMLCanvasElement;
          return canvas.toDataURL('image/png');
        });
        
        const tileBuffer = Buffer.from(pngDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
        
        tileBuffers.push({
          buffer: tileBuffer,
          x: tile.x,
          y: tile.y,
          width: tile.width,
          height: tile.height
        });
        
        console.log(`[HighResExport] Tile ${i + 1} captured: ${(tileBuffer.length / 1024).toFixed(1)} KB`);
        
        // Small delay between tiles to allow garbage collection
        if (i < tilePlan.tiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } finally {
      await page.close();
    }
    
    // Combine tiles into final image
    onProgress?.({
      phase: 'combining',
      totalTiles: tilePlan.totalTiles,
      percent: 85,
      message: `Combining ${tilePlan.totalTiles} tiles into final image...`
    });
    
    console.log(`[HighResExport] Combining ${tileBuffers.length} tiles into ${tilePlan.totalWidth}x${tilePlan.totalHeight} image`);
    
    const combinedBuffer = await this.combineTiles(tileBuffers, tilePlan, bgColor);
    
    // Encode to final format
    onProgress?.({
      phase: 'encoding',
      percent: 95,
      message: `Encoding ${format.toUpperCase()} image...`
    });
    
    let finalBuffer: Buffer;
    let mimeType: string;
    let filename: string;
    
    if (format === 'png') {
      finalBuffer = combinedBuffer;
      mimeType = 'image/png';
      filename = `export-${Date.now()}.png`;
    } else {
      // Convert to TIFF
      const shouldFlattenToRgb = exportSettings.flattenToRgb || 
        (backgroundMode === 'artboard' || backgroundMode === 'custom');
      
      finalBuffer = await this.convertToTiff(combinedBuffer, {
        bitDepth,
        dpi: effectiveDpi,
        compression: compression as 'none' | 'deflate',
        flattenToRgb: shouldFlattenToRgb,
        matteColor: exportSettings.matteColor || '#ffffff'
      });
      
      mimeType = 'image/tiff';
      filename = `export-${Date.now()}.tiff`;
    }
    
    onProgress?.({
      phase: 'completed',
      percent: 100,
      message: 'Tiled export completed successfully'
    });
    
    console.log(`[HighResExport] Tiled export complete: ${(finalBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    return {
      success: true,
      buffer: finalBuffer,
      mimeType,
      filename,
      width: tilePlan.totalWidth,
      height: tilePlan.totalHeight
    };
  }
  
  /**
   * Combine tile buffers into a single image using Sharp
   */
  private async combineTiles(
    tiles: Array<{ buffer: Buffer; x: number; y: number; width: number; height: number }>,
    tilePlan: TilePlan,
    backgroundColor: string
  ): Promise<Buffer> {
    // Create base canvas with background color
    const isTransparent = backgroundColor === 'transparent';
    
    let baseImage: sharp.Sharp;
    
    if (isTransparent) {
      // Create transparent RGBA base
      baseImage = sharp({
        create: {
          width: tilePlan.totalWidth,
          height: tilePlan.totalHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      });
    } else {
      // Parse background color
      const hexMatch = backgroundColor.match(/^#?([0-9a-fA-F]{6})$/);
      const r = hexMatch ? parseInt(hexMatch[1].substring(0, 2), 16) : 255;
      const g = hexMatch ? parseInt(hexMatch[1].substring(2, 4), 16) : 255;
      const b = hexMatch ? parseInt(hexMatch[1].substring(4, 6), 16) : 255;
      
      baseImage = sharp({
        create: {
          width: tilePlan.totalWidth,
          height: tilePlan.totalHeight,
          channels: 3,
          background: { r, g, b }
        }
      });
    }
    
    // Build composite array for all tiles
    const compositeInputs: sharp.OverlayOptions[] = tiles.map(tile => ({
      input: tile.buffer,
      left: tile.x,
      top: tile.y
    }));
    
    // Composite all tiles at once
    const combinedBuffer = await baseImage
      .composite(compositeInputs)
      .png()
      .toBuffer();
    
    console.log(`[HighResExport] Combined ${tiles.length} tiles: ${(combinedBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    return combinedBuffer;
  }
  
  /**
   * Generate HTML renderer for a single tile (with viewport offset)
   */
  private generateTileRendererHtml(data: any): string {
    const { shapes, groups, artboard, exportSettings, canvasWidth, canvasHeight, scale, tileOffsetX, tileOffsetY, fullWidth, fullHeight } = data;
    const { bleedPx, printMarksGutterPx, printExpansion, backgroundColor } = exportSettings;
    
    // Use the same base template but with tile offset applied
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>High-Res Tile Renderer</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: transparent; overflow: hidden; }
    #exportCanvas { display: block; }
  </style>
</head>
<body>
  <canvas id="exportCanvas" width="${canvasWidth}" height="${canvasHeight}"></canvas>
  
  <script>
    const RENDER_DATA = ${JSON.stringify({ shapes, groups, artboard, exportSettings, canvasWidth, canvasHeight, scale, bleedPx, printMarksGutterPx, printExpansion, backgroundColor, tileOffsetX, tileOffsetY, fullWidth, fullHeight })};
    
    function drawPolygon(ctx, points) {
      if (!points || points.length === 0) return;
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
    }
    
    function drawLine(ctx, points) {
      if (!points || points.length < 2) return;
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
    }
    
    function drawSmoothSpline(ctx, points, controlPoints) {
      if (!points || points.length < 2) return;
      
      if (controlPoints && controlPoints.length >= (points.length - 1) * 2) {
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
          const cp1 = controlPoints[i * 2];
          const cp2 = controlPoints[i * 2 + 1];
          ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, points[i + 1].x, points[i + 1].y);
        }
      } else {
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
      }
    }
    
    function drawSplineCircle(ctx, points, controlPoints, closed) {
      if (!points || points.length < 4) return;
      if (!controlPoints || controlPoints.length < 8) {
        drawPolygon(ctx, points);
        return;
      }
      
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 0; i < 4; i++) {
        const endPoint = points[(i + 1) % 4];
        const cp1 = controlPoints[i * 2];
        const cp2 = controlPoints[i * 2 + 1];
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, endPoint.x, endPoint.y);
      }
      
      if (closed !== false) {
        ctx.closePath();
      }
    }
    
    function drawSplineRing(ctx, points, controlPoints) {
      if (!points || points.length < 8) return;
      if (!controlPoints || controlPoints.length < 16) {
        drawPolygon(ctx, points);
        return;
      }
      
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < 4; i++) {
        const endPoint = points[(i + 1) % 4];
        const cp1 = controlPoints[i * 2];
        const cp2 = controlPoints[i * 2 + 1];
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, endPoint.x, endPoint.y);
      }
      ctx.closePath();
      
      ctx.moveTo(points[4].x, points[4].y);
      for (let i = 0; i < 4; i++) {
        const endPoint = points[4 + ((i + 1) % 4)];
        const cp1 = controlPoints[8 + i * 2];
        const cp2 = controlPoints[8 + i * 2 + 1];
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, endPoint.x, endPoint.y);
      }
      ctx.closePath();
    }
    
    function getShapeBounds(points) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    
    function renderShape(ctx, shape) {
      if (!shape.points || shape.points.length === 0) return;
      
      ctx.save();
      
      ctx.globalCompositeOperation = shape.properties.blendMode || 'source-over';
      
      const artboardX = RENDER_DATA.artboard.x || 0;
      const artboardY = RENDER_DATA.artboard.y || 0;
      
      // Apply tile offset for viewport clipping
      const tileOffsetX = RENDER_DATA.tileOffsetX || 0;
      const tileOffsetY = RENDER_DATA.tileOffsetY || 0;
      
      ctx.translate(shape.transform.x - artboardX - tileOffsetX, shape.transform.y - artboardY - tileOffsetY);
      ctx.rotate((shape.transform.rotation || 0) * Math.PI / 180);
      ctx.scale(shape.transform.scaleX || 1, shape.transform.scaleY || 1);
      ctx.transform(1, shape.transform.skewX || 0, shape.transform.skewY || 0, 1, 0, 0);
      
      if (shape.properties.blurRadius > 0) {
        ctx.filter = 'blur(' + shape.properties.blurRadius + 'px)';
      }
      
      ctx.beginPath();
      
      const shapeType = shape.type;
      if (shapeType === 'line' || shapeType === 'line-vector') {
        drawLine(ctx, shape.points);
      } else if (shapeType === 'spline-circle' || shapeType === 'spline-ellipse') {
        drawSplineCircle(ctx, shape.points, shape.controlPoints, shape.closed);
      } else if (shapeType === 'spline-ring') {
        drawSplineRing(ctx, shape.points, shape.controlPoints);
      } else if (shapeType === 'bezier' || shapeType === 'smooth-spline' || shapeType === 'cubic') {
        drawSmoothSpline(ctx, shape.points, shape.controlPoints);
        if (shape.closed) ctx.closePath();
      } else {
        drawPolygon(ctx, shape.points);
      }
      
      // Fill and stroke logic (same as standard renderer)
      if (shapeType !== 'line' && shapeType !== 'line-vector' && shape.properties.fillColor !== 'none') {
        ctx.globalAlpha = shape.properties.fillOpacity || 1;
        
        if (shape.properties.gradient) {
          const bounds = getShapeBounds(shape.points);
          let gradient;
          const gradientType = shape.properties.gradient.type;
          
          if (gradientType === 'conic') {
            const cx = bounds.x + (bounds.width * (shape.properties.gradient.conicCenterX ?? 50) / 100);
            const cy = bounds.y + (bounds.height * (shape.properties.gradient.conicCenterY ?? 50) / 100);
            gradient = ctx.createConicGradient(shape.properties.gradient.conicAngle || 0, cx, cy);
          } else if (gradientType === 'radial') {
            const cx = bounds.x + (bounds.width * (shape.properties.gradient.radialCenterX ?? 50) / 100);
            const cy = bounds.y + (bounds.height * (shape.properties.gradient.radialCenterY ?? 50) / 100);
            const radius = Math.max(bounds.width, bounds.height) / 2;
            gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
          } else {
            const angle = (shape.properties.gradient.angle || 0) * Math.PI / 180;
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;
            const length = Math.sqrt(bounds.width * bounds.width + bounds.height * bounds.height) / 2;
            gradient = ctx.createLinearGradient(
              cx - Math.cos(angle) * length,
              cy - Math.sin(angle) * length,
              cx + Math.cos(angle) * length,
              cy + Math.sin(angle) * length
            );
          }
          
          const stops = shape.properties.gradient.stops || [];
          for (const stop of stops) {
            gradient.addColorStop(stop.position, stop.color);
          }
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = shape.properties.fillColor || '#000000';
        }
        
        ctx.fill('evenodd');
      }
      
      if (shape.properties.strokeColor && shape.properties.strokeColor !== 'none' && shape.properties.strokeWidth > 0) {
        ctx.globalAlpha = shape.properties.strokeOpacity || 1;
        ctx.strokeStyle = shape.properties.strokeColor;
        ctx.lineWidth = shape.properties.strokeWidth;
        ctx.stroke();
      }
      
      ctx.restore();
    }
    
    window.renderShapes = function() {
      try {
        const canvas = document.getElementById('exportCanvas');
        const ctx = canvas.getContext('2d');
        
        const { shapes, groups, artboard, exportSettings, canvasWidth, canvasHeight, scale, bleedPx, printMarksGutterPx, printExpansion, backgroundColor, tileOffsetX, tileOffsetY } = RENDER_DATA;
        
        ctx.save();
        ctx.scale(scale, scale);
        
        // Apply print expansion offset for this tile
        ctx.translate(printExpansion - (tileOffsetX / scale), printExpansion - (tileOffsetY / scale));
        
        // Draw background if not transparent
        if (backgroundColor && backgroundColor !== 'transparent') {
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          ctx.restore();
        }
        
        // Sort and render shapes
        const sortedShapes = [...shapes].sort((a, b) => (a.properties.zIndex || 0) - (b.properties.zIndex || 0));
        
        for (const shape of sortedShapes) {
          renderShape(ctx, shape);
        }
        
        ctx.restore();
        
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    };
  </script>
</body>
</html>`;
  }
  
  private async renderAndCapture(page: Page, request: HighResExportRequest): Promise<HighResExportResult> {
    const { shapes, groups = [], artboard, exportSettings } = request;
    const { format = 'tiff', bitDepth = 16, scale = 1, backgroundMode = 'transparent', compression = 'none' } = exportSettings;
    
    const effectiveDpi = exportSettings.dpi || artboard.printConfig?.outputSpecs?.dpi || artboard.dpi || 300;
    
    let bleedPx = 0;
    let printMarksGutterPx = 0;
    
    if (artboard.printConfig) {
      const config = artboard.printConfig;
      const overlayUnit = config.overlays?.overlayUnit || 'pixels';
      
      if (exportSettings.includeBleed && config.overlays?.bleed?.render && config.overlays?.bleed?.amount > 0) {
        bleedPx = convertUnitToPixels(config.overlays.bleed.amount, overlayUnit, effectiveDpi);
      }
      
      if (exportSettings.includePrintMarks && config.overlays?.printMarks?.render) {
        const scaleMode = config.overlays.printMarks.scaleMode || 'none';
        let markLengthPx: number;
        let markOffsetPx: number;
        
        if (scaleMode === 'percent') {
          const minDimension = Math.min(artboard.width, artboard.height);
          markLengthPx = (config.overlays.printMarks.markLength / 100) * minDimension;
          markOffsetPx = (config.overlays.printMarks.markOffset / 100) * minDimension;
        } else {
          markLengthPx = convertUnitToPixels(config.overlays.printMarks.markLength, overlayUnit, effectiveDpi);
          markOffsetPx = convertUnitToPixels(config.overlays.printMarks.markOffset, overlayUnit, effectiveDpi);
        }
        
        printMarksGutterPx = markLengthPx + markOffsetPx + 5;
      }
    }
    
    const printExpansion = bleedPx + printMarksGutterPx;
    const canvasWidth = Math.ceil((artboard.width + printExpansion * 2) * scale);
    const canvasHeight = Math.ceil((artboard.height + printExpansion * 2) * scale);
    
    console.log(`[HighResExport] Rendering ${canvasWidth}x${canvasHeight} canvas at ${effectiveDpi} DPI`);
    
    let bgColor = 'transparent';
    if (backgroundMode === 'artboard') {
      bgColor = artboard.backgroundColor || '#ffffff';
    } else if (backgroundMode === 'custom' && exportSettings.backgroundColor) {
      bgColor = exportSettings.backgroundColor;
    }
    
    const renderData = {
      shapes,
      groups,
      artboard: {
        ...artboard,
        printConfig: artboard.printConfig
      },
      exportSettings: {
        ...exportSettings,
        dpi: effectiveDpi,
        bleedPx,
        printMarksGutterPx,
        printExpansion,
        backgroundColor: bgColor
      },
      canvasWidth,
      canvasHeight,
      scale
    };
    
    const templateHtml = this.generateRendererHtml(renderData);
    
    await page.setViewport({
      width: Math.max(canvasWidth, 800),
      height: Math.max(canvasHeight, 600),
      deviceScaleFactor: 1
    });
    
    await page.setContent(templateHtml, { waitUntil: 'networkidle0' });
    
    const renderResult = await page.evaluate(() => {
      return (window as any).renderShapes();
    });
    
    if (!renderResult.success) {
      throw new Error(`Render failed: ${renderResult.error}`);
    }
    
    const pngDataUrl = await page.evaluate(() => {
      const canvas = document.getElementById('exportCanvas') as HTMLCanvasElement;
      return canvas.toDataURL('image/png');
    });
    
    const pngBuffer = Buffer.from(pngDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
    
    console.log(`[HighResExport] Captured PNG buffer: ${(pngBuffer.length / 1024).toFixed(1)} KB`);
    
    if (format === 'png') {
      return {
        success: true,
        buffer: pngBuffer,
        mimeType: 'image/png',
        filename: `export-${Date.now()}.png`,
        width: canvasWidth,
        height: canvasHeight
      };
    }
    
    const shouldFlattenToRgb = exportSettings.flattenToRgb || 
      (backgroundMode === 'artboard' || backgroundMode === 'custom');
    
    const tiffBuffer = await this.convertToTiff(pngBuffer, {
      bitDepth,
      dpi: effectiveDpi,
      compression: compression as 'none' | 'deflate',
      flattenToRgb: shouldFlattenToRgb,
      matteColor: exportSettings.matteColor || '#ffffff'
    });
    
    console.log(`[HighResExport] Generated TIFF: ${(tiffBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    return {
      success: true,
      buffer: tiffBuffer,
      mimeType: 'image/tiff',
      filename: `export-${Date.now()}.tiff`,
      width: canvasWidth,
      height: canvasHeight
    };
  }
  
  private async convertToTiff(pngBuffer: Buffer, options: { 
    bitDepth: 8 | 16; 
    dpi: number; 
    compression?: 'none' | 'deflate';
    flattenToRgb?: boolean;
    matteColor?: string;
  }): Promise<Buffer> {
    const { bitDepth, dpi, compression = 'none', flattenToRgb = false, matteColor = '#ffffff' } = options;
    
    let pipeline = sharp(pngBuffer);
    
    if (flattenToRgb) {
      const hexMatch = matteColor.match(/^#?([0-9a-fA-F]{6})$/);
      const r = hexMatch ? parseInt(hexMatch[1].substring(0, 2), 16) : 255;
      const g = hexMatch ? parseInt(hexMatch[1].substring(2, 4), 16) : 255;
      const b = hexMatch ? parseInt(hexMatch[1].substring(4, 6), 16) : 255;
      
      pipeline = pipeline.flatten({ background: { r, g, b } });
      console.log(`[HighResExport] Flattening to RGB with matte color: ${matteColor} (${r}, ${g}, ${b})`);
    }
    
    if (bitDepth === 16) {
      pipeline = pipeline.toColourspace('rgb16');
    }
    
    // Map compression setting to Sharp's TIFF compression options
    // Sharp supports: 'none', 'jpeg', 'deflate', 'packbits', 'ccittfax4', 'lzw', 'webp', 'zstd', 'jp2k'
    const tiffCompression = compression === 'deflate' ? 'deflate' : 'none';
    
    const tiffBuffer = await pipeline
      .withMetadata({
        density: dpi
      })
      .tiff({
        compression: tiffCompression,
        quality: 100
      })
      .toBuffer();
    
    return tiffBuffer;
  }
  
  private generateRendererHtml(data: any): string {
    const { shapes, groups, artboard, exportSettings, canvasWidth, canvasHeight, scale } = data;
    const { bleedPx, printMarksGutterPx, printExpansion, backgroundColor } = exportSettings;
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>High-Res Shape Renderer</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: transparent; overflow: hidden; }
    #exportCanvas { display: block; }
  </style>
</head>
<body>
  <canvas id="exportCanvas" width="${canvasWidth}" height="${canvasHeight}"></canvas>
  
  <script>
    const RENDER_DATA = ${JSON.stringify({ shapes, groups, artboard, exportSettings, canvasWidth, canvasHeight, scale, bleedPx, printMarksGutterPx, printExpansion, backgroundColor })};
    
    function drawPolygon(ctx, points) {
      if (!points || points.length === 0) return;
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
    }
    
    function drawLine(ctx, points) {
      if (!points || points.length < 2) return;
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
    }
    
    function drawSmoothSpline(ctx, points, controlPoints) {
      if (!points || points.length < 2) return;
      
      if (controlPoints && controlPoints.length >= (points.length - 1) * 2) {
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
          const cp1 = controlPoints[i * 2];
          const cp2 = controlPoints[i * 2 + 1];
          ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, points[i + 1].x, points[i + 1].y);
        }
      } else {
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
      }
    }
    
    // Draw spline-circle and spline-ellipse using 4-segment Bézier curves
    function drawSplineCircle(ctx, points, controlPoints, closed) {
      if (!points || points.length < 4) return;
      if (!controlPoints || controlPoints.length < 8) {
        // Fallback to polygon if no control points
        drawPolygon(ctx, points);
        return;
      }
      
      // Four-segment Bézier curve (circle/ellipse approximation)
      ctx.moveTo(points[0].x, points[0].y);
      
      // Draw four Bézier segments
      for (let i = 0; i < 4; i++) {
        const endPoint = points[(i + 1) % 4];
        const cp1 = controlPoints[i * 2];
        const cp2 = controlPoints[i * 2 + 1];
        
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, endPoint.x, endPoint.y);
      }
      
      if (closed !== false) {
        ctx.closePath();
      }
    }
    
    // Draw spline-ring (donut shape) with inner and outer rings
    function drawSplineRing(ctx, points, controlPoints) {
      if (!points || points.length < 8) return;
      if (!controlPoints || controlPoints.length < 16) {
        drawPolygon(ctx, points);
        return;
      }
      
      // Outer ring - four Bézier segments
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < 4; i++) {
        const endPoint = points[(i + 1) % 4];
        const cp1 = controlPoints[i * 2];
        const cp2 = controlPoints[i * 2 + 1];
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, endPoint.x, endPoint.y);
      }
      ctx.closePath();
      
      // Inner ring - four Bézier segments (reverse winding for hole)
      ctx.moveTo(points[4].x, points[4].y);
      for (let i = 0; i < 4; i++) {
        const endPoint = points[4 + ((i + 1) % 4)];
        const cp1 = controlPoints[8 + i * 2];
        const cp2 = controlPoints[8 + i * 2 + 1];
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, endPoint.x, endPoint.y);
      }
      ctx.closePath();
    }
    
    function renderShape(ctx, shape) {
      if (!shape.points || shape.points.length === 0) return;
      
      ctx.save();
      
      ctx.globalCompositeOperation = shape.properties.blendMode || 'source-over';
      
      // Translate shape relative to artboard position
      const artboardX = RENDER_DATA.artboard.x || 0;
      const artboardY = RENDER_DATA.artboard.y || 0;
      ctx.translate(shape.transform.x - artboardX, shape.transform.y - artboardY);
      ctx.rotate((shape.transform.rotation || 0) * Math.PI / 180);
      ctx.scale(shape.transform.scaleX || 1, shape.transform.scaleY || 1);
      ctx.transform(1, shape.transform.skewX || 0, shape.transform.skewY || 0, 1, 0, 0);
      
      if (shape.properties.blurRadius > 0) {
        ctx.filter = 'blur(' + shape.properties.blurRadius + 'px)';
      }
      
      ctx.beginPath();
      
      const shapeType = shape.type;
      if (shapeType === 'line' || shapeType === 'line-vector') {
        drawLine(ctx, shape.points);
      } else if (shapeType === 'spline-circle' || shapeType === 'spline-ellipse') {
        drawSplineCircle(ctx, shape.points, shape.controlPoints, shape.closed);
      } else if (shapeType === 'spline-ring') {
        drawSplineRing(ctx, shape.points, shape.controlPoints);
      } else if (shapeType === 'bezier' || shapeType === 'smooth-spline' || shapeType === 'cubic') {
        drawSmoothSpline(ctx, shape.points, shape.controlPoints);
        if (shape.closed) ctx.closePath();
      } else {
        drawPolygon(ctx, shape.points);
      }
      
      if (shapeType !== 'line' && shapeType !== 'line-vector' && shape.properties.fillColor !== 'none') {
        ctx.globalAlpha = shape.properties.fillOpacity || 1;
        
        if (shape.properties.gradient) {
          const bounds = getShapeBounds(shape.points);
          let gradient;
          const gradientType = shape.properties.gradient.type;
          
          if (gradientType === 'conic') {
            // Conic gradient support with center positioning
            const conicCenterXPercent = shape.properties.gradient.conicCenterX ?? 50;
            const conicCenterYPercent = shape.properties.gradient.conicCenterY ?? 50;
            const cx = bounds.x + (bounds.width * conicCenterXPercent / 100);
            const cy = bounds.y + (bounds.height * conicCenterYPercent / 100);
            const startAngle = (shape.properties.gradient.conicAngle || 0);
            gradient = ctx.createConicGradient(startAngle, cx, cy);
          } else if (gradientType === 'radial') {
            // Radial gradient with center positioning
            const radialCenterXPercent = shape.properties.gradient.radialCenterX ?? 50;
            const radialCenterYPercent = shape.properties.gradient.radialCenterY ?? 50;
            const cx = bounds.x + (bounds.width * radialCenterXPercent / 100);
            const cy = bounds.y + (bounds.height * radialCenterYPercent / 100);
            const radius = Math.max(bounds.width, bounds.height) / 2;
            gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
          } else {
            // Linear gradient (default)
            const angle = (shape.properties.gradient.angle || 0) * Math.PI / 180;
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;
            const length = Math.max(bounds.width, bounds.height) / 2;
            const x1 = cx - Math.cos(angle) * length;
            const y1 = cy - Math.sin(angle) * length;
            const x2 = cx + Math.cos(angle) * length;
            const y2 = cy + Math.sin(angle) * length;
            gradient = ctx.createLinearGradient(x1, y1, x2, y2);
          }
          
          shape.properties.gradient.stops.forEach(function(stop) {
            gradient.addColorStop(stop.offset, stop.color);
          });
          
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = shape.properties.fillColor;
        }
        // Use evenodd fill rule for spline-ring to create proper hole
        if (shapeType === 'spline-ring') {
          ctx.fill('evenodd');
        } else {
          ctx.fill();
        }
      }
      
      if (shape.properties.strokeColor !== 'none' && shape.properties.strokeWidth > 0) {
        ctx.globalAlpha = shape.properties.strokeOpacity || 1;
        ctx.strokeStyle = shape.properties.strokeColor;
        ctx.lineWidth = shape.properties.strokeWidth;
        ctx.stroke();
      }
      
      ctx.restore();
    }
    
    function getShapeBounds(points) {
      if (!points || points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      points.forEach(function(p) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    
    function renderPrintMarks(ctx, x, y, width, height, bleedPx, config) {
      if (!config.cropMarks && !config.registrationMarks) return;
      
      ctx.save();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.5;
      
      const markLength = config.markLength || 20;
      const markOffset = config.markOffset || 5;
      
      if (config.cropMarks) {
        const corners = [
          { x: x - bleedPx, y: y - bleedPx },
          { x: x + width + bleedPx, y: y - bleedPx },
          { x: x + width + bleedPx, y: y + height + bleedPx },
          { x: x - bleedPx, y: y + height + bleedPx }
        ];
        
        corners.forEach(function(corner, i) {
          ctx.beginPath();
          if (i === 0) {
            ctx.moveTo(corner.x - markOffset - markLength, corner.y);
            ctx.lineTo(corner.x - markOffset, corner.y);
            ctx.moveTo(corner.x, corner.y - markOffset - markLength);
            ctx.lineTo(corner.x, corner.y - markOffset);
          } else if (i === 1) {
            ctx.moveTo(corner.x + markOffset, corner.y);
            ctx.lineTo(corner.x + markOffset + markLength, corner.y);
            ctx.moveTo(corner.x, corner.y - markOffset - markLength);
            ctx.lineTo(corner.x, corner.y - markOffset);
          } else if (i === 2) {
            ctx.moveTo(corner.x + markOffset, corner.y);
            ctx.lineTo(corner.x + markOffset + markLength, corner.y);
            ctx.moveTo(corner.x, corner.y + markOffset);
            ctx.lineTo(corner.x, corner.y + markOffset + markLength);
          } else {
            ctx.moveTo(corner.x - markOffset - markLength, corner.y);
            ctx.lineTo(corner.x - markOffset, corner.y);
            ctx.moveTo(corner.x, corner.y + markOffset);
            ctx.lineTo(corner.x, corner.y + markOffset + markLength);
          }
          ctx.stroke();
        });
      }
      
      if (config.registrationMarks) {
        const regSize = 8;
        const positions = [
          { x: x + width / 2, y: y - bleedPx - markOffset - regSize },
          { x: x + width / 2, y: y + height + bleedPx + markOffset + regSize },
          { x: x - bleedPx - markOffset - regSize, y: y + height / 2 },
          { x: x + width + bleedPx + markOffset + regSize, y: y + height / 2 }
        ];
        
        positions.forEach(function(pos) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, regSize / 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pos.x - regSize, pos.y);
          ctx.lineTo(pos.x + regSize, pos.y);
          ctx.moveTo(pos.x, pos.y - regSize);
          ctx.lineTo(pos.x, pos.y + regSize);
          ctx.stroke();
        });
      }
      
      ctx.restore();
    }
    
    window.renderShapes = function() {
      try {
        const canvas = document.getElementById('exportCanvas');
        const ctx = canvas.getContext('2d');
        
        const { shapes, groups, artboard, exportSettings, canvasWidth, canvasHeight, scale, bleedPx, printExpansion, backgroundColor } = RENDER_DATA;
        
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        if (backgroundColor && backgroundColor !== 'transparent') {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
        
        ctx.save();
        ctx.scale(scale, scale);
        ctx.translate(printExpansion, printExpansion);
        
        const allShapes = [...shapes];
        if (groups) {
          groups.forEach(function(group) {
            if (group.shapes) {
              group.shapes.forEach(function(s) {
                allShapes.push(s);
              });
            }
          });
        }
        
        allShapes.sort(function(a, b) {
          return (a.properties.zIndex || 0) - (b.properties.zIndex || 0);
        });
        
        allShapes.forEach(function(shape) {
          renderShape(ctx, shape);
        });
        
        if (artboard.printConfig && artboard.printConfig.overlays && artboard.printConfig.overlays.printMarks && artboard.printConfig.overlays.printMarks.render && exportSettings.includePrintMarks !== false) {
          const config = artboard.printConfig.overlays.printMarks;
          renderPrintMarks(ctx, 0, 0, artboard.width, artboard.height, bleedPx, {
            cropMarks: config.cropMarks,
            registrationMarks: config.registrationMarks,
            markLength: config.markLength,
            markOffset: config.markOffset
          });
        }
        
        ctx.restore();
        
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    };
  </script>
</body>
</html>`;
  }
  
  needsServerExport(artboard: { width: number; height: number; dpi?: number }, exportSettings: any): boolean {
    const width = artboard.width * (exportSettings.scale || 1);
    const height = artboard.height * (exportSettings.scale || 1);
    
    const estimatedMemory = width * height * 4;
    const maxBrowserPixels = 268_000_000;
    const maxBrowserMemory = 500_000_000;
    
    if (estimatedMemory > maxBrowserMemory) return true;
    if (width * height > maxBrowserPixels) return true;
    if (exportSettings.format === 'tiff' && exportSettings.bitDepth === 16) return true;
    
    const dpi = exportSettings.dpi || artboard.dpi || 72;
    if (dpi >= 300 && (width >= 3000 || height >= 3000)) return true;
    
    return false;
  }
  
  getExportEstimate(artboard: { width: number; height: number; dpi?: number }, exportSettings: any): {
    needsServer: boolean;
    estimatedTime: string;
    estimatedSize: string;
    dimensions: { width: number; height: number };
    tiling?: {
      needsTiling: boolean;
      tilesX: number;
      tilesY: number;
      totalTiles: number;
      tileSize: string;
    };
  } {
    const scale = exportSettings.scale || 1;
    const width = Math.ceil(artboard.width * scale);
    const height = Math.ceil(artboard.height * scale);
    const needsServer = this.needsServerExport(artboard, exportSettings);
    
    const pixels = width * height;
    const bytesPerPixel = exportSettings.bitDepth === 16 ? 8 : 4;
    const estimatedBytes = pixels * bytesPerPixel;
    
    // Calculate tile plan for large images
    const bitDepth = exportSettings.bitDepth || 8;
    const channels: 3 | 4 = (exportSettings.flattenToRgb || exportSettings.backgroundMode !== 'transparent') ? 3 : 4;
    const tilePlan = calculateTilePlan(width, height, bitDepth, channels);
    
    let estimatedTime: string;
    if (needsServer) {
      if (tilePlan.needsTiling) {
        // Tiled processing takes longer: base time + time per tile + combining time
        const baseSeconds = 5;
        const secondsPerTile = 3;
        const combineSeconds = Math.ceil(pixels / 20_000_000);
        const totalSeconds = baseSeconds + (tilePlan.totalTiles * secondsPerTile) + combineSeconds;
        estimatedTime = totalSeconds < 60 ? `~${totalSeconds} seconds` : `~${Math.ceil(totalSeconds / 60)} minutes`;
      } else {
        const seconds = Math.ceil(2 + pixels / 5_000_000);
        estimatedTime = seconds < 60 ? `~${seconds} seconds` : `~${Math.ceil(seconds / 60)} minutes`;
      }
    } else {
      estimatedTime = '< 1 second';
    }
    
    const sizeMB = estimatedBytes / 1024 / 1024;
    const estimatedSize = sizeMB < 1 ? `~${Math.ceil(sizeMB * 1024)} KB` : `~${sizeMB.toFixed(1)} MB`;
    
    return {
      needsServer,
      estimatedTime,
      estimatedSize,
      dimensions: { width, height },
      tiling: tilePlan.needsTiling ? {
        needsTiling: true,
        tilesX: tilePlan.tilesX,
        tilesY: tilePlan.tilesY,
        totalTiles: tilePlan.totalTiles,
        tileSize: `${tilePlan.tileWidth}x${tilePlan.tileHeight}`
      } : undefined
    };
  }
}

export const highResExportService = new HighResolutionExportService();