import { Shape, ShapeGroupClass } from './shapes';
import { CanvasSettings, Artboard } from './shapeTypes';
import { PrintConfig, DEFAULT_PRINT_CONFIG, PrintUnitType, ExportBackgroundMode } from '@shared/schema';
import * as UTIF from 'utif';
import { embedIccInPng, embedIccInJpeg, getSrgbIccProfile, ColorSpaceOptions, DEFAULT_COLOR_SPACE_OPTIONS } from './iccProfile';

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'bmp' | 'tiff';

export type TiffCompression = 'none' | 'deflate';

export type BitDepth = 8 | 16;

export interface TiffOptions {
  compression?: TiffCompression;
  embedDpi?: boolean;
  bitDepth?: BitDepth;  // 8-bit (default) or 16-bit per channel
}

function convertPrintUnitToPixels(value: number, unit: PrintUnitType, dpi: number): number {
  switch (unit) {
    case 'pixels':
      return value;
    case 'mm':
      return (value / 25.4) * dpi;
    case 'cm':
      return (value / 2.54) * dpi;
    case 'inches':
      return value * dpi;
    default:
      return value;
  }
}

export interface ExportOptions {
  format: ImageFormat;
  quality?: number; // 0-1, for lossy formats
  width?: number;
  height?: number;
  scale?: number; // Scaling factor for high-res exports
  backgroundColor?: string;
  includeBackground?: boolean;
  includeAdornments?: boolean; // Include selection handles and other UI elements
  includeGrid?: boolean; // Include canvas grid
  includeArtboardGeometry?: boolean; // Include artboard outlines
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  artboardBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  printConfig?: PrintConfig;
  artboardDpi?: number;
  artboardBackgroundColor?: string;
  tiffOptions?: TiffOptions;
  exportBackgroundMode?: ExportBackgroundMode;  // Export background mode: transparent, artboard, or custom
  exportBackgroundColor?: string;               // Custom background color when mode is 'custom'
  colorSpaceOptions?: ColorSpaceOptions;        // Color space and ICC profile embedding options
}

export class ImageExporter {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  async exportImage(
    shapes: Shape[],
    groups: ShapeGroupClass[],
    canvasSettings: CanvasSettings,
    options: ExportOptions,
    artboards?: Artboard[]
  ): Promise<Blob> {
    const {
      format,
      quality = 0.92,
      width: optionsWidth,
      height: optionsHeight,
      scale = 1,
      backgroundColor = 'transparent',
      includeBackground = true,
      margins,
      artboardBounds,
      printConfig,
      artboardDpi = 72,
      artboardBackgroundColor,
      tiffOptions,
      exportBackgroundMode = 'transparent',
      exportBackgroundColor = '#ffffff',
      colorSpaceOptions = DEFAULT_COLOR_SPACE_OPTIONS
    } = options;

    // Calculate bounds of all content to export
    const allContent = [...shapes, ...groups];
    if (allContent.length === 0) {
      throw new Error('No content to export');
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Use artboard bounds if provided (for artboard exports)
    if (artboardBounds) {
      minX = artboardBounds.x;
      minY = artboardBounds.y;
      maxX = artboardBounds.x + artboardBounds.width;
      maxY = artboardBounds.y + artboardBounds.height;
    } else {
      // Get bounds of all shapes and groups
      shapes.forEach(shape => {
        const bounds = shape.getBounds();
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
      });

      groups.forEach(group => {
        const bounds = group.getBounds();
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
    }

    // Calculate print configuration expansions
    let bleedPx = 0;
    let printMarksGutterPx = 0;
    const config = printConfig || DEFAULT_PRINT_CONFIG;
    
    // Use printConfig's DPI as authoritative, fallback to artboardDpi option
    const effectiveDpi = config.outputSpecs.dpi || artboardDpi;
    
    // Calculate bleed expansion (if render is enabled)
    // Use the unified overlayUnit from the overlays configuration
    const overlayUnit = config.overlays.overlayUnit;
    
    if (config.overlays.bleed.render && config.overlays.bleed.amount > 0) {
      bleedPx = convertPrintUnitToPixels(
        config.overlays.bleed.amount,
        overlayUnit,
        effectiveDpi
      );
    }
    
    // Calculate print marks gutter (if render is enabled)
    // Mark length and offset use the same unified overlayUnit, or percentage of artboard/content
    if (config.overlays.printMarks.render) {
      const scaleMode = config.overlays.printMarks.scaleMode || 'none';
      
      let markLengthPx: number;
      let markOffsetPx: number;
      
      if (scaleMode === 'percent') {
        // Percentage mode: values are percentages of the smaller dimension
        // Use artboardBounds if available, otherwise fall back to computed content bounds
        const refWidth = artboardBounds?.width ?? (maxX - minX);
        const refHeight = artboardBounds?.height ?? (maxY - minY);
        const minDimension = Math.min(refWidth, refHeight);
        markLengthPx = (config.overlays.printMarks.markLength / 100) * minDimension;
        markOffsetPx = (config.overlays.printMarks.markOffset / 100) * minDimension;
      } else {
        // Default mode: convert from unified unit to pixels
        markLengthPx = convertPrintUnitToPixels(
          config.overlays.printMarks.markLength,
          overlayUnit,
          effectiveDpi
        );
        markOffsetPx = convertPrintUnitToPixels(
          config.overlays.printMarks.markOffset,
          overlayUnit,
          effectiveDpi
        );
      }
      
      printMarksGutterPx = markLengthPx + markOffsetPx + 5;
    }
    
    // Total expansion from print features
    const printExpansion = bleedPx + printMarksGutterPx;

    // Apply margins
    const marginTop = margins?.top || 0;
    const marginRight = margins?.right || 0;
    const marginBottom = margins?.bottom || 0;
    const marginLeft = margins?.left || 0;

    // Calculate content dimensions with margins and print expansions
    const contentWidth = maxX - minX + marginLeft + marginRight + (printExpansion * 2);
    const contentHeight = maxY - minY + marginTop + marginBottom + (printExpansion * 2);

    // Use provided dimensions or calculated content dimensions
    // If no custom dimensions provided, always use the calculated content dimensions
    const exportBaseWidth = optionsWidth || contentWidth;
    const exportBaseHeight = optionsHeight || contentHeight;

    // Set canvas size with scale applied
    const exportWidth = exportBaseWidth * scale;
    const exportHeight = exportBaseHeight * scale;
    this.canvas.width = exportWidth;
    this.canvas.height = exportHeight;

    // Clear and setup canvas
    this.ctx.clearRect(0, 0, exportWidth, exportHeight);
    
    // Determine effective background color based on export background mode
    // 'transparent' = no background, 'artboard' = use artboard's configured color
    const effectiveBackgroundColor = exportBackgroundMode === 'artboard' 
      ? (artboardBackgroundColor || backgroundColor) 
      : 'transparent';
    
    // Add background if requested
    if (includeBackground && effectiveBackgroundColor !== 'transparent') {
      this.ctx.fillStyle = effectiveBackgroundColor;
      this.ctx.fillRect(0, 0, exportWidth, exportHeight);
    }

    // Save context state
    this.ctx.save();

    // Apply scaling for high-res exports
    this.ctx.scale(scale, scale);

    // Translate to center content in the export area (accounting for print expansions)
    const offsetX = -minX + marginLeft + printExpansion;
    const offsetY = -minY + marginTop + printExpansion;
    this.ctx.translate(offsetX, offsetY);

    // Sort shapes by zIndex to maintain proper rendering order
    const sortedShapes = [...shapes].sort((a, b) => a.properties.zIndex - b.properties.zIndex);
    const sortedGroups = [...groups].sort((a, b) => {
      // For groups, use the minimum zIndex of contained shapes
      const aMinZ = Math.min(...a.shapes.map(s => s.properties.zIndex));
      const bMinZ = Math.min(...b.shapes.map(s => s.properties.zIndex));
      return aMinZ - bMinZ;
    });

    // Render all groups first (in correct order)
    sortedGroups.forEach(group => {
      group.render(this.ctx);
    });

    // Render grid if requested
    if (options.includeGrid) {
      this.renderGrid(minX, minY, maxX, maxY);
    }

    // Render artboard geometry if requested
    if (options.includeArtboardGeometry && artboards) {
      this.renderArtboards(artboards);
    }

    // Render individual shapes (in correct order)
    sortedShapes.forEach(shape => {
      shape.render(this.ctx);
    });

    // Render adornments if requested
    if (options.includeAdornments) {
      shapes.forEach(shape => {
        if (shape.selected) {
          // Render transform handles for selected shapes
          shape.renderTransformHandles(this.ctx, 1, false); // Use zoom=1 and not touch device
        }
        
        // Render points and segments if the shape has them
        if (shape.points && shape.points.length > 0) {
          const allPointIndices = shape.points.map((_, i) => i);
          const allSegmentIndices = shape.points.length > 1 ? 
            shape.points.slice(0, -1).map((_, i) => i) : [];
          
          shape.renderPoints(this.ctx, allPointIndices, allSegmentIndices, 1);
        }
      });

      groups.forEach(group => {
        if (group.selected) {
          // Render group transform handles
          const bounds = group.getBounds();
          const handleSize = 8;
          
          this.ctx.save();
          this.ctx.fillStyle = '#8B5CF6';
          this.ctx.strokeStyle = '#FFFFFF';
          this.ctx.lineWidth = 1;
          
          // Corner handles for group
          const corners = [
            { x: bounds.x - handleSize/2, y: bounds.y - handleSize/2 },
            { x: bounds.x + bounds.width - handleSize/2, y: bounds.y - handleSize/2 },
            { x: bounds.x + bounds.width - handleSize/2, y: bounds.y + bounds.height - handleSize/2 },
            { x: bounds.x - handleSize/2, y: bounds.y + bounds.height - handleSize/2 }
          ];
          
          corners.forEach(corner => {
            this.ctx.fillRect(corner.x, corner.y, handleSize, handleSize);
            this.ctx.strokeRect(corner.x, corner.y, handleSize, handleSize);
          });
          
          this.ctx.restore();
        }
      });
    }
    
    // Render print marks if enabled (only for artboard exports with defined bounds)
    if (config.overlays.printMarks.render && artboardBounds) {
      const scaleMode = config.overlays.printMarks.scaleMode || 'none';
      
      let markLengthPx: number;
      let markOffsetPx: number;
      
      if (scaleMode === 'percent') {
        // Percentage mode: values are percentages of the smaller artboard dimension
        const minDimension = Math.min(artboardBounds.width, artboardBounds.height);
        markLengthPx = (config.overlays.printMarks.markLength / 100) * minDimension;
        markOffsetPx = (config.overlays.printMarks.markOffset / 100) * minDimension;
      } else {
        // Default mode: convert from unified unit to pixels using unified overlayUnit
        markLengthPx = convertPrintUnitToPixels(
          config.overlays.printMarks.markLength,
          overlayUnit,
          effectiveDpi
        );
        markOffsetPx = convertPrintUnitToPixels(
          config.overlays.printMarks.markOffset,
          overlayUnit,
          effectiveDpi
        );
      }
      
      this.renderPrintMarks(
        artboardBounds.x,
        artboardBounds.y,
        artboardBounds.width,
        artboardBounds.height,
        bleedPx,
        {
          cropMarks: config.overlays.printMarks.cropMarks,
          registrationMarks: config.overlays.printMarks.registrationMarks,
          markLength: markLengthPx,
          markOffset: markOffsetPx
        }
      );
    }

    // Restore context state
    this.ctx.restore();

    // Export based on format, with optional ICC profile embedding
    const embedIcc = colorSpaceOptions?.embedIccProfile ?? true;
    
    switch (format) {
      case 'png': {
        const blob = await this.exportAsRaster('image/png');
        return embedIcc ? embedIccInPng(blob) : blob;
      }
      case 'jpeg': {
        const blob = await this.exportAsRaster('image/jpeg', quality);
        return embedIcc ? embedIccInJpeg(blob) : blob;
      }
      case 'webp':
        // WebP doesn't support ICC profile embedding in the same way
        return this.exportAsRaster('image/webp', quality);
      case 'avif':
        // AVIF uses its own color management
        return this.exportAsRaster('image/avif', quality);
      case 'bmp':
        // BMP doesn't support ICC profiles
        return this.exportAsRaster('image/bmp');
      case 'tiff':
        return this.exportAsTiff(effectiveDpi, tiffOptions, embedIcc);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private renderGrid(minX: number, minY: number, maxX: number, maxY: number) {
    this.ctx.save();
    this.ctx.strokeStyle = '#374151';
    this.ctx.lineWidth = 0.5;
    this.ctx.globalAlpha = 0.3;

    const gridSize = 20;
    const startX = Math.floor(minX / gridSize) * gridSize;
    const startY = Math.floor(minY / gridSize) * gridSize;

    // Draw vertical lines
    for (let x = startX; x <= maxX; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, minY);
      this.ctx.lineTo(x, maxY);
      this.ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = startY; y <= maxY; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(minX, y);
      this.ctx.lineTo(maxX, y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private renderArtboards(artboards: Artboard[]) {
    this.ctx.save();
    this.ctx.strokeStyle = '#60A5FA';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);

    artboards.forEach(artboard => {
      this.ctx.strokeRect(artboard.x, artboard.y, artboard.width, artboard.height);
      
      // Draw artboard name
      this.ctx.save();
      this.ctx.fillStyle = '#60A5FA';
      this.ctx.font = '12px Arial';
      this.ctx.fillText(artboard.name, artboard.x + 5, artboard.y - 5);
      this.ctx.restore();
    });

    this.ctx.restore();
  }

  private renderPrintMarks(
    artboardX: number,
    artboardY: number,
    artboardWidth: number,
    artboardHeight: number,
    bleedPx: number,
    printMarksConfig: {
      cropMarks: boolean;
      registrationMarks: boolean;
      markLength: number;
      markOffset: number;
    }
  ) {
    const { cropMarks, registrationMarks, markLength, markOffset } = printMarksConfig;
    
    this.ctx.save();
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([]);
    
    // Crop Marks (corner marks at artboard edges, positioned outside the bleed area)
    if (cropMarks) {
      const corners = [
        { x: artboardX, y: artboardY, dx: -1, dy: -1 },
        { x: artboardX + artboardWidth, y: artboardY, dx: 1, dy: -1 },
        { x: artboardX, y: artboardY + artboardHeight, dx: -1, dy: 1 },
        { x: artboardX + artboardWidth, y: artboardY + artboardHeight, dx: 1, dy: 1 }
      ];
      
      corners.forEach(corner => {
        const offsetX = (bleedPx + markOffset) * corner.dx;
        const offsetY = (bleedPx + markOffset) * corner.dy;
        
        // Horizontal line
        this.ctx.beginPath();
        this.ctx.moveTo(corner.x + offsetX, corner.y);
        this.ctx.lineTo(corner.x + offsetX + (markLength * corner.dx), corner.y);
        this.ctx.stroke();
        
        // Vertical line
        this.ctx.beginPath();
        this.ctx.moveTo(corner.x, corner.y + offsetY);
        this.ctx.lineTo(corner.x, corner.y + offsetY + (markLength * corner.dy));
        this.ctx.stroke();
      });
    }
    
    // Registration Marks (crosshair marks at center of each edge)
    if (registrationMarks) {
      const regMarkSize = 8;
      const regCircleRadius = 4;
      const edgeCenters = [
        { x: artboardX + artboardWidth / 2, y: artboardY - bleedPx - markOffset - regMarkSize },
        { x: artboardX + artboardWidth / 2, y: artboardY + artboardHeight + bleedPx + markOffset + regMarkSize },
        { x: artboardX - bleedPx - markOffset - regMarkSize, y: artboardY + artboardHeight / 2 },
        { x: artboardX + artboardWidth + bleedPx + markOffset + regMarkSize, y: artboardY + artboardHeight / 2 }
      ];
      
      edgeCenters.forEach(center => {
        // Draw crosshair
        this.ctx.beginPath();
        this.ctx.moveTo(center.x - regMarkSize, center.y);
        this.ctx.lineTo(center.x + regMarkSize, center.y);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(center.x, center.y - regMarkSize);
        this.ctx.lineTo(center.x, center.y + regMarkSize);
        this.ctx.stroke();
        
        // Draw circle
        this.ctx.beginPath();
        this.ctx.arc(center.x, center.y, regCircleRadius, 0, Math.PI * 2);
        this.ctx.stroke();
      });
    }
    
    this.ctx.restore();
  }

  private async exportAsRaster(mimeType: string, quality?: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        mimeType,
        quality
      );
    });
  }

  private async exportAsTiff(dpi: number, tiffOptions?: TiffOptions, embedIccProfile: boolean = true): Promise<Blob> {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const bitDepth = tiffOptions?.bitDepth ?? 8;
    
    // Memory guardrail: warn for very large exports (over 200 megapixels)
    // 16-bit doubles memory usage
    const megapixels = (width * height) / 1_000_000;
    const memoryMultiplier = bitDepth === 16 ? 2 : 1;
    if (megapixels * memoryMultiplier > 200) {
      console.warn(`Large TIFF export: ${megapixels.toFixed(1)} megapixels at ${bitDepth}-bit. May cause memory issues.`);
    }
    
    // Get RGBA pixel data from canvas (always 8-bit from canvas)
    const imageData = this.ctx.getImageData(0, 0, width, height);
    let rgba: Uint8Array | Uint16Array;
    
    if (bitDepth === 16) {
      // Convert 8-bit to 16-bit by scaling values (0-255 -> 0-65535)
      const rgba16 = new Uint16Array(imageData.data.length);
      for (let i = 0; i < imageData.data.length; i++) {
        rgba16[i] = imageData.data[i] * 257; // Scale 8-bit to 16-bit (255 * 257 = 65535)
      }
      rgba = rgba16;
    } else {
      rgba = new Uint8Array(imageData.data.buffer);
    }
    
    // Build TIFF metadata with DPI tags
    // Note: UTIF.IFD type requires data/width/height but encodeImage only needs metadata tags
    const tiffMetadata: Partial<UTIF.IFD> = {};
    
    // Embed DPI metadata if requested (default: true)
    if (tiffOptions?.embedDpi !== false) {
      // TIFF uses resolution in pixels per resolution unit
      // ResolutionUnit: 2 = inches
      tiffMetadata.t282 = [dpi]; // XResolution
      tiffMetadata.t283 = [dpi]; // YResolution  
      tiffMetadata.t296 = [2];   // ResolutionUnit (2 = inch)
    }
    
    // Set bit depth tag for 16-bit exports
    if (bitDepth === 16) {
      tiffMetadata.t258 = [16, 16, 16, 16]; // BitsPerSample (R, G, B, A)
    }
    
    // Embed sRGB ICC profile if requested (TIFF tag 34675 = InterColorProfile)
    if (embedIccProfile) {
      const iccProfile = getSrgbIccProfile();
      // UTIF expects the ICC profile data as an array of bytes
      tiffMetadata.t34675 = Array.from(iccProfile);
    }
    
    // Encode to TIFF buffer
    // Note: UTIF.encodeImage expects Uint8Array, so for 16-bit we pass the buffer view
    // The library handles it based on the BitsPerSample tag we set above
    const tiffBuffer = UTIF.encodeImage(
      bitDepth === 16 ? new Uint8Array((rgba as Uint16Array).buffer) : rgba as Uint8Array, 
      width, 
      height, 
      tiffMetadata as UTIF.IFD
    );
    
    // Create blob from buffer
    return new Blob([tiffBuffer], { type: 'image/tiff' });
  }

  static async downloadImage(blob: Blob, filename: string): Promise<void> {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static getFileExtension(format: ImageFormat): string {
    const extensions: Record<ImageFormat, string> = {
      png: 'png',
      jpeg: 'jpg',
      webp: 'webp',
      avif: 'avif',
      bmp: 'bmp',
      tiff: 'tiff'
    };
    return extensions[format];
  }

  static isFormatSupported(format: ImageFormat): boolean {
    // Check if the browser supports the format
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    try {
      switch (format) {
        case 'png':
        case 'jpeg':
        case 'bmp':
        case 'tiff': // TIFF is always supported via UTIF library
          return true;
        case 'webp':
          return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        case 'avif':
          return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }
}

// Server-side high-resolution export utilities
export interface ServerExportEstimate {
  requiresServerExport: boolean;
  reason: string | null;
  estimatedDuration: number;
  estimatedFileSizeMB: number;
  canvasWidth: number;
  canvasHeight: number;
  memoryRequiredMB: number;
}

export interface ServerExportRequest {
  shapes: any[];
  groups: any[];
  artboard: {
    x: number;
    y: number;
    width: number;
    height: number;
    backgroundColor: string;
    dpi: number;
    printConfig?: PrintConfig;
  };
  exportSettings: {
    format: 'tiff' | 'png';
    bitDepth: 8 | 16;
    dpi?: number;
    scale?: number;
    includeBleed?: boolean;
    includePrintMarks?: boolean;
    backgroundColor?: string;
    backgroundMode?: ExportBackgroundMode;
  };
}

// Browser canvas limits
const MAX_CANVAS_DIMENSION = 32767;
const MAX_CANVAS_PIXELS = 268435456; // ~268M pixels
const BROWSER_MEMORY_THRESHOLD_MB = 500; // Conservative threshold for browser memory

export function calculateExportDimensions(
  artboardWidth: number,
  artboardHeight: number,
  dpi: number,
  scale: number = 1,
  printConfig?: PrintConfig
): { width: number; height: number; bleedPx: number; printMarksGutterPx: number } {
  const config = printConfig || DEFAULT_PRINT_CONFIG;
  const effectiveDpi = config.outputSpecs.dpi || dpi;
  const overlayUnit = config.overlays.overlayUnit;
  
  // Calculate bleed expansion
  let bleedPx = 0;
  if (config.overlays.bleed.render && config.overlays.bleed.amount > 0) {
    bleedPx = convertPrintUnitToPixels(
      config.overlays.bleed.amount,
      overlayUnit,
      effectiveDpi
    );
  }
  
  // Calculate print marks gutter
  let printMarksGutterPx = 0;
  if (config.overlays.printMarks.render) {
    const scaleMode = config.overlays.printMarks.scaleMode || 'none';
    let markLengthPx: number;
    let markOffsetPx: number;
    
    if (scaleMode === 'percent') {
      const minDimension = Math.min(artboardWidth, artboardHeight);
      const markLengthPercent = config.overlays.printMarks.markLength || 3;
      const markOffsetPercent = config.overlays.printMarks.markOffset || 1;
      markLengthPx = (markLengthPercent / 100) * minDimension;
      markOffsetPx = (markOffsetPercent / 100) * minDimension;
    } else {
      markLengthPx = convertPrintUnitToPixels(
        config.overlays.printMarks.markLength,
        overlayUnit,
        effectiveDpi
      );
      markOffsetPx = convertPrintUnitToPixels(
        config.overlays.printMarks.markOffset,
        overlayUnit,
        effectiveDpi
      );
    }
    printMarksGutterPx = Math.ceil(markLengthPx + markOffsetPx);
  }
  
  // Total expansion on each side
  const expansionPerSide = bleedPx + printMarksGutterPx;
  
  // Final dimensions with scale
  const width = Math.ceil((artboardWidth + (expansionPerSide * 2)) * scale);
  const height = Math.ceil((artboardHeight + (expansionPerSide * 2)) * scale);
  
  return { width, height, bleedPx, printMarksGutterPx };
}

export function estimateMemoryUsage(width: number, height: number, bitDepth: 8 | 16 = 8): number {
  const bytesPerPixel = bitDepth === 16 ? 8 : 4; // RGBA
  const totalBytes = width * height * bytesPerPixel;
  return totalBytes / (1024 * 1024); // MB
}

export function requiresServerExport(
  artboardWidth: number,
  artboardHeight: number,
  dpi: number,
  scale: number = 1,
  format: ImageFormat = 'png',
  bitDepth: 8 | 16 = 8,
  printConfig?: PrintConfig
): ServerExportEstimate {
  // Calculate dimensions including bleed, print marks expansions and DPI scaling
  const { width, height, bleedPx, printMarksGutterPx } = calculateExportDimensions(artboardWidth, artboardHeight, dpi, scale, printConfig);
  
  // Apply DPI scaling to get final canvas dimensions (base 72 DPI)
  const baseDpi = 72;
  const dpiScale = dpi / baseDpi;
  const scaledWidth = Math.ceil(width * dpiScale);
  const scaledHeight = Math.ceil(height * dpiScale);
  
  const memoryMB = estimateMemoryUsage(scaledWidth, scaledHeight, bitDepth);
  const totalPixels = scaledWidth * scaledHeight;
  
  let requiresServer = false;
  let reason: string | null = null;
  
  // Check dimension limits
  if (scaledWidth > MAX_CANVAS_DIMENSION || scaledHeight > MAX_CANVAS_DIMENSION) {
    requiresServer = true;
    reason = `Canvas dimension ${Math.max(scaledWidth, scaledHeight)}px exceeds browser limit of ${MAX_CANVAS_DIMENSION}px`;
  }
  
  // Check pixel count
  if (!requiresServer && totalPixels > MAX_CANVAS_PIXELS) {
    requiresServer = true;
    reason = `Total pixels (${(totalPixels / 1000000).toFixed(1)}M) exceeds browser limit of ${(MAX_CANVAS_PIXELS / 1000000).toFixed(0)}M`;
  }
  
  // Check memory threshold
  if (!requiresServer && memoryMB > BROWSER_MEMORY_THRESHOLD_MB) {
    requiresServer = true;
    reason = `Estimated memory (${memoryMB.toFixed(0)}MB) exceeds browser threshold of ${BROWSER_MEMORY_THRESHOLD_MB}MB`;
  }
  
  // 16-bit TIFF always uses server for better quality
  if (!requiresServer && format === 'tiff' && bitDepth === 16) {
    requiresServer = true;
    reason = '16-bit TIFF requires server-side processing for proper bit depth';
  }
  
  // Estimate duration (based on validation test results: ~5 seconds for integration test)
  const baseDurationMs = 5000;
  const pixelFactor = totalPixels / (3000 * 4000); // A4@300DPI as baseline
  const estimatedDuration = Math.ceil(baseDurationMs * Math.max(1, pixelFactor));
  
  // Estimate file size (very rough: ~0.5 bytes per pixel for compressed TIFF/PNG)
  const estimatedFileSizeMB = (totalPixels * 0.5) / (1024 * 1024);
  
  return {
    requiresServerExport: requiresServer,
    reason,
    estimatedDuration,
    estimatedFileSizeMB,
    canvasWidth: scaledWidth,
    canvasHeight: scaledHeight,
    memoryRequiredMB: memoryMB
  };
}

export async function fetchServerExportEstimate(
  artboard: { width: number; height: number; dpi: number; printConfig?: PrintConfig },
  exportSettings: { format?: ImageFormat; bitDepth?: 8 | 16; scale?: number }
): Promise<ServerExportEstimate> {
  try {
    const response = await fetch('/api/export/high-resolution/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artboard, exportSettings })
    });
    
    if (!response.ok) {
      throw new Error(`Server estimate failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    // Fall back to client-side calculation
    console.warn('Server estimate failed, using client calculation:', error);
    return requiresServerExport(
      artboard.width,
      artboard.height,
      artboard.dpi,
      exportSettings.scale || 1,
      exportSettings.format || 'png',
      exportSettings.bitDepth || 8,
      artboard.printConfig
    );
  }
}

export async function executeServerExport(request: ServerExportRequest): Promise<Blob> {
  const response = await fetch('/api/export/high-resolution', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Export failed' }));
    throw new Error(error.error || error.message || 'Server export failed');
  }
  
  return await response.blob();
}