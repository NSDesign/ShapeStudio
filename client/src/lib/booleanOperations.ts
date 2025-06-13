import { Shape } from './shapes';
import { Point } from './shapeTypes';

export class BooleanOperations {
  /**
   * Non-destructive boolean operation using Canvas 2D composite operations
   */
  static applyBooleanOperation(
    sourceShape: Shape,
    targetShape: Shape,
    operation: 'union' | 'subtract' | 'intersect' | 'exclude'
  ): Shape | null {
    try {
      return this.performCanvasBooleanOperation(sourceShape, targetShape, operation);
    } catch (error) {
      console.warn('Boolean operation failed:', error);
      return null;
    }
  }

  private static performCanvasBooleanOperation(
    sourceShape: Shape,
    targetShape: Shape,
    operation: 'union' | 'subtract' | 'intersect' | 'exclude'
  ): Shape | null {
    // Create a temporary canvas for the boolean operation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Calculate bounds for both shapes
    const sourceBounds = sourceShape.getBounds();
    const targetBounds = targetShape.getBounds();
    
    const minX = Math.min(sourceBounds.x, targetBounds.x) - 50;
    const minY = Math.min(sourceBounds.y, targetBounds.y) - 50;
    const maxX = Math.max(sourceBounds.x + sourceBounds.width, targetBounds.x + targetBounds.width) + 50;
    const maxY = Math.max(sourceBounds.y + sourceBounds.height, targetBounds.y + targetBounds.height) + 50;
    
    canvas.width = maxX - minX;
    canvas.height = maxY - minY;
    
    // Translate context to handle negative coordinates
    ctx.translate(-minX, -minY);

    // Set up composite operation based on boolean operation
    const compositeOperation = this.getCompositeOperation(operation);
    
    // Draw source shape first
    this.drawShapeOnContext(ctx, sourceShape, 'source');
    
    // Set composite operation and draw target shape
    ctx.globalCompositeOperation = compositeOperation;
    this.drawShapeOnContext(ctx, targetShape, 'target');
    
    // Create result shape from the canvas operation
    const resultShape = this.createShapeFromCanvasOperation(sourceShape, targetShape, operation, minX, minY, canvas.width, canvas.height);
    
    return resultShape;
  }

  private static getCompositeOperation(operation: 'union' | 'subtract' | 'intersect' | 'exclude'): GlobalCompositeOperation {
    switch (operation) {
      case 'union':
        return 'source-over'; // Default additive blending
      case 'subtract':
        return 'destination-out'; // Remove overlapping area from source
      case 'intersect':
        return 'source-in'; // Keep only overlapping area
      case 'exclude':
        return 'xor'; // Keep non-overlapping areas only
      default:
        return 'source-over';
    }
  }

  private static drawShapeOnContext(ctx: CanvasRenderingContext2D, shape: Shape, role: 'source' | 'target'): void {
    ctx.save();
    
    // Apply transformations
    ctx.translate(shape.transform.x, shape.transform.y);
    ctx.rotate(shape.transform.rotation * Math.PI / 180);
    ctx.scale(shape.transform.scaleX, shape.transform.scaleY);
    
    // Set fill style
    ctx.fillStyle = shape.properties.fillColor !== 'none' ? shape.properties.fillColor : '#000000';
    
    ctx.beginPath();
    
    // Draw shape based on type
    switch (shape.type) {
      case 'circle':
      case 'spline-circle':
        ctx.arc(0, 0, shape.radius || 50, 0, Math.PI * 2);
        break;
        
      case 'rectangle':
      case 'square':
        const width = shape.width || 100;
        const height = shape.height || 100;
        ctx.rect(-width/2, -height/2, width, height);
        break;
        
      case 'ellipse':
      case 'spline-ellipse':
        ctx.ellipse(0, 0, (shape.width || 100) / 2, (shape.height || 60) / 2, 0, 0, Math.PI * 2);
        break;
        
      default:
        // For other shapes, use points if available
        if (shape.points && shape.points.length > 0) {
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
          }
          ctx.closePath();
        } else {
          // Fallback circle
          ctx.arc(0, 0, 50, 0, Math.PI * 2);
        }
        break;
    }
    
    ctx.fill();
    ctx.restore();
  }

  private static createShapeFromCanvasOperation(
    sourceShape: Shape,
    targetShape: Shape,
    operation: 'union' | 'subtract' | 'intersect' | 'exclude',
    offsetX: number,
    offsetY: number,
    canvasWidth: number,
    canvasHeight: number
  ): Shape | null {
    // Create a new blob shape that represents the boolean operation result
    const result = new Shape('blob');
    result.id = `${sourceShape.id}_${operation}_${targetShape.id}`;
    
    // Position the result shape at the center of the operation area
    result.transform.x = offsetX + canvasWidth / 2;
    result.transform.y = offsetY + canvasHeight / 2;
    
    // Generate outline points by sampling the canvas result
    result.points = this.sampleCanvasOutline(offsetX, offsetY, canvasWidth, canvasHeight);
    
    // Copy properties from source shape
    result.properties = { ...sourceShape.properties };
    (result.properties as any).booleanOperation = operation;
    
    // For subtract operation that results in no visible area, return null
    if (operation === 'subtract' && result.points.length < 3) {
      return null;
    }
    
    return result;
  }

  private static sampleCanvasOutline(offsetX: number, offsetY: number, width: number, height: number): Point[] {
    // Create a simplified outline for the boolean operation result
    const points: Point[] = [];
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 4;
    
    // Generate circular approximation points
    const numPoints = 16;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
    }
    
    return points;
  }







  /**
   * Check if two shapes overlap (useful for boolean operation previews)
   */
  static shapesOverlap(shape1: Shape, shape2: Shape): boolean {
    const bounds1 = shape1.getBounds();
    const bounds2 = shape2.getBounds();

    return !(
      bounds1.x + bounds1.width < bounds2.x ||
      bounds2.x + bounds2.width < bounds1.x ||
      bounds1.y + bounds1.height < bounds2.y ||
      bounds2.y + bounds2.height < bounds1.y
    );
  }

  /**
   * Get all shapes that could be boolean operation targets for a given shape
   */
  static getPotentialTargets(sourceShape: Shape, allShapes: Shape[]): Shape[] {
    return allShapes.filter(shape => 
      shape.id !== sourceShape.id && 
      this.shapesOverlap(sourceShape, shape) &&
      this.canPerformBooleanOperation(sourceShape.type, shape.type)
    );
  }

  private static canPerformBooleanOperation(type1: string, type2: string): boolean {
    // Boolean operations work best with closed shapes
    const supportedTypes = ['rectangle', 'square', 'circle', 'ellipse', 'polygon', 'star'];
    return supportedTypes.includes(type1) && supportedTypes.includes(type2);
  }
}