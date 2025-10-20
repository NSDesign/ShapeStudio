import { Shape, ShapeGroupClass } from './shapes';
import { CanvasSettings, Artboard } from './shapeTypes';

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'bmp';

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
      artboardBounds
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

    // Apply margins
    const marginTop = margins?.top || 0;
    const marginRight = margins?.right || 0;
    const marginBottom = margins?.bottom || 0;
    const marginLeft = margins?.left || 0;

    // Calculate content dimensions with margins
    const contentWidth = maxX - minX + marginLeft + marginRight;
    const contentHeight = maxY - minY + marginTop + marginBottom;

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
    
    // Add background if requested
    if (includeBackground && backgroundColor !== 'transparent') {
      this.ctx.fillStyle = backgroundColor;
      this.ctx.fillRect(0, 0, exportWidth, exportHeight);
    }

    // Save context state
    this.ctx.save();

    // Apply scaling for high-res exports
    this.ctx.scale(scale, scale);

    // Translate to center content in the export area
    const offsetX = -minX + marginLeft;
    const offsetY = -minY + marginTop;
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

    // Restore context state
    this.ctx.restore();

    // Export based on format
    switch (format) {
      case 'png':
        return this.exportAsRaster('image/png');
      case 'jpeg':
        return this.exportAsRaster('image/jpeg', quality);
      case 'webp':
        return this.exportAsRaster('image/webp', quality);
      case 'avif':
        return this.exportAsRaster('image/avif', quality);
      case 'bmp':
        return this.exportAsRaster('image/bmp');
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
      bmp: 'bmp'
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