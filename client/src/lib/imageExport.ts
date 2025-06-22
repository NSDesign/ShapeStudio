import { Shape, ShapeGroupClass } from './shapes';
import { CanvasSettings, Artboard } from './shapeTypes';

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'svg' | 'bmp';

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
      case 'svg':
        return this.exportAsSVG(shapes, groups, canvasSettings, options);
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

  private async exportAsSVG(
    shapes: Shape[],
    groups: ShapeGroupClass[],
    canvasSettings: CanvasSettings,
    options: ExportOptions
  ): Promise<Blob> {
    const {
      width = canvasSettings.width,
      height = canvasSettings.height,
      backgroundColor = 'transparent',
      includeBackground = true
    } = options;

    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

    // Add background if requested
    if (includeBackground && backgroundColor !== 'transparent') {
      svgContent += `\n  <rect width="100%" height="100%" fill="${backgroundColor}"/>`;
    }

    // Add group for transforms
    svgContent += `\n  <g transform="scale(${canvasSettings.zoom}) translate(${canvasSettings.panX}, ${canvasSettings.panY})">`;

    // Convert groups to SVG
    groups.forEach(group => {
      svgContent += this.groupToSVG(group);
    });

    // Convert individual shapes to SVG
    shapes.forEach(shape => {
      svgContent += this.shapeToSVG(shape);
    });

    svgContent += '\n  </g>\n</svg>';

    return new Blob([svgContent], { type: 'image/svg+xml' });
  }

  private shapeToSVG(shape: Shape): string {
    const transform = `translate(${shape.transform.x}, ${shape.transform.y}) rotate(${shape.transform.rotation}) scale(${shape.transform.scaleX}, ${shape.transform.scaleY}) skewX(${shape.transform.skewX}) skewY(${shape.transform.skewY})`;
    
    let shapeElement = '';
    
    switch (shape.type) {
      case 'rectangle':
      case 'square':
        shapeElement = `<rect x="${-shape.width! / 2}" y="${-shape.height! / 2}" width="${shape.width}" height="${shape.height}"`;
        break;
      case 'circle':
        shapeElement = `<circle cx="0" cy="0" r="${shape.radius}"`;
        break;
      case 'ellipse':
        shapeElement = `<ellipse cx="0" cy="0" rx="${shape.width! / 2}" ry="${shape.height! / 2}"`;
        break;
      case 'polygon':
        const polygonPoints = this.getPolygonPoints(shape.sides!, shape.radius!);
        shapeElement = `<polygon points="${polygonPoints}"`;
        break;
      case 'star':
        const starPoints = this.getStarPoints(shape.sides!, shape.radius!, shape.innerRadius!);
        shapeElement = `<polygon points="${starPoints}"`;
        break;
      case 'line':
        const linePoints = shape.points.map(p => `${p.x},${p.y}`).join(' ');
        shapeElement = `<polyline points="${linePoints}" fill="none"`;
        break;
      default:
        // For complex shapes, use path
        if (shape.points && shape.points.length > 0) {
          const pathData = this.pointsToPath(shape.points, shape.type);
          shapeElement = `<path d="${pathData}"`;
        }
        break;
    }

    if (shapeElement) {
      const styles = `fill="${shape.properties.fillColor}" fill-opacity="${shape.properties.fillOpacity}" stroke="${shape.properties.strokeColor}" stroke-width="${shape.properties.strokeWidth}" stroke-opacity="${shape.properties.strokeOpacity}"`;
      return `\n    <g transform="${transform}">\n      ${shapeElement} ${styles}/>\n    </g>`;
    }

    return '';
  }

  private groupToSVG(group: ShapeGroupClass): string {
    const transform = `translate(${group.transform.x}, ${group.transform.y}) rotate(${group.transform.rotation}) scale(${group.transform.scaleX}, ${group.transform.scaleY})`;
    
    let groupContent = `\n    <g transform="${transform}">`;
    group.shapes.forEach(shape => {
      groupContent += this.shapeToSVG(shape);
    });
    groupContent += '\n    </g>';
    
    return groupContent;
  }

  private getPolygonPoints(sides: number, radius: number): string {
    const points: string[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  }

  private getStarPoints(sides: number, outerRadius: number, innerRadius: number): string {
    const points: string[] = [];
    for (let i = 0; i < sides * 2; i++) {
      const angle = (i * Math.PI) / sides - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  }

  private pointsToPath(points: { x: number; y: number }[], shapeType: string): string {
    if (points.length === 0) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      if (shapeType === 'chunk' || shapeType === 'blob') {
        // Use smooth curves for chunks and blobs
        const current = points[i];
        const next = points[(i + 1) % points.length];
        const cp1x = current.x;
        const cp1y = current.y;
        const cp2x = (current.x + next.x) / 2;
        const cp2y = (current.y + next.y) / 2;
        path += ` Q ${cp1x} ${cp1y} ${cp2x} ${cp2y}`;
      } else {
        path += ` L ${points[i].x} ${points[i].y}`;
      }
    }
    
    if (shapeType === 'chunk' || shapeType === 'blob' || shapeType === 'polygon') {
      path += ' Z';
    }
    
    return path;
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
      svg: 'svg',
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
        case 'svg':
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