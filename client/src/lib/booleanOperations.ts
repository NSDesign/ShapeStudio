import { Shape } from './shapes';
import { Point } from './shapeTypes';

export class BooleanOperations {
  /**
   * Non-destructive boolean operation that creates a visual result
   * without modifying the original shapes
   */
  static applyBooleanOperation(
    sourceShape: Shape,
    targetShape: Shape,
    operation: 'union' | 'subtract' | 'intersect' | 'exclude'
  ): Shape | null {
    const sourcePath = this.shapeToPath(sourceShape);
    const targetPath = this.shapeToPath(targetShape);
    
    if (!sourcePath || !targetPath) return null;

    let resultPath: Path2D;
    
    try {
      switch (operation) {
        case 'union':
          resultPath = this.unionPaths(sourcePath, targetPath);
          break;
        case 'subtract':
          resultPath = this.subtractPaths(sourcePath, targetPath);
          break;
        case 'intersect':
          resultPath = this.intersectPaths(sourcePath, targetPath);
          break;
        case 'exclude':
          resultPath = this.excludePaths(sourcePath, targetPath);
          break;
        default:
          return null;
      }

      return this.pathToShape(resultPath, sourceShape, operation);
    } catch (error) {
      console.warn('Boolean operation failed:', error);
      return null;
    }
  }

  private static shapeToPath(shape: Shape): Path2D | null {
    const path = new Path2D();
    const { transform } = shape;

    // Apply transform to path
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(transform.scaleX, transform.scaleY);

    switch (shape.type) {
      case 'rectangle':
      case 'square':
        if (shape.width && shape.height) {
          path.rect(-shape.width / 2, -shape.height / 2, shape.width, shape.height);
        }
        break;
      case 'circle':
        if (shape.radius) {
          path.arc(0, 0, shape.radius, 0, Math.PI * 2);
        }
        break;
      case 'ellipse':
        if (shape.width && shape.height) {
          path.ellipse(0, 0, shape.width / 2, shape.height / 2, 0, 0, Math.PI * 2);
        }
        break;
      case 'polygon':
      case 'star':
        if (shape.points && shape.points.length > 0) {
          const points = shape.points;
          path.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            path.lineTo(points[i].x, points[i].y);
          }
          path.closePath();
        }
        break;
      default:
        return null;
    }

    ctx.restore();
    return path;
  }

  private static unionPaths(path1: Path2D, path2: Path2D): Path2D {
    // For canvas-based boolean operations, we'll use a simplified approach
    // In a production environment, you might want to use a library like paper.js or clipper-lib
    const result = new Path2D();
    result.addPath(path1);
    result.addPath(path2);
    return result;
  }

  private static subtractPaths(path1: Path2D, path2: Path2D): Path2D {
    // Simplified subtraction - in practice, this would require more complex geometry operations
    return path1; // Fallback to original shape
  }

  private static intersectPaths(path1: Path2D, path2: Path2D): Path2D {
    // Simplified intersection
    return path1; // Fallback to original shape
  }

  private static excludePaths(path1: Path2D, path2: Path2D): Path2D {
    // Simplified exclusion
    return path1; // Fallback to original shape
  }

  private static pathToShape(path: Path2D, originalShape: Shape, operation: string): Shape {
    // Create a new shape based on the boolean result
    // For now, we'll create a visual indicator that a boolean operation is applied
    const newShape = originalShape.clone();
    newShape.id = `${originalShape.id}_${operation}`;
    newShape.properties.booleanOperation = operation as any;
    return newShape;
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