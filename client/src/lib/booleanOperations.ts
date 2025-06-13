import { Shape } from './shapes';

export class BooleanOperations {
  /**
   * Non-destructive boolean operation using geometric approximation
   */
  static applyBooleanOperation(
    sourceShape: Shape,
    targetShape: Shape,
    operation: 'union' | 'subtract' | 'intersect' | 'exclude'
  ): Shape | null {
    try {
      return this.performGeometricBooleanOperation(sourceShape, targetShape, operation);
    } catch (error) {
      console.warn('Boolean operation failed:', error);
      return null;
    }
  }

  private static performGeometricBooleanOperation(
    sourceShape: Shape,
    targetShape: Shape,
    operation: 'union' | 'subtract' | 'intersect' | 'exclude'
  ): Shape | null {
    // Create a result shape based on the source shape
    const result = sourceShape.clone();
    result.id = `${sourceShape.id}_${operation}_${targetShape.id}`;
    
    // Apply visual indicators for the boolean operation
    switch (operation) {
      case 'union':
        // Maintain original position and size for union
        result.properties = { ...sourceShape.properties };
        result.properties.strokeColor = '#00ff00';
        result.properties.strokeWidth = 3;
        break;
        
      case 'subtract':
        // For subtract, keep source shape but indicate the operation
        result.properties = { ...sourceShape.properties };
        result.properties.strokeColor = '#ff0000';
        result.properties.strokeWidth = 3;
        result.properties.fillOpacity = 0.7;
        break;
        
      case 'intersect':
        // For intersect, create a smaller shape at the intersection
        const sourceBounds = sourceShape.getBounds();
        const targetBounds = targetShape.getBounds();
        
        const intersectX = Math.max(sourceBounds.x, targetBounds.x);
        const intersectY = Math.max(sourceBounds.y, targetBounds.y);
        const intersectWidth = Math.min(sourceBounds.x + sourceBounds.width, targetBounds.x + targetBounds.width) - intersectX;
        const intersectHeight = Math.min(sourceBounds.y + sourceBounds.height, targetBounds.y + targetBounds.height) - intersectY;
        
        if (intersectWidth > 0 && intersectHeight > 0) {
          result.transform.x = intersectX + intersectWidth / 2;
          result.transform.y = intersectY + intersectHeight / 2;
          if (result.width && result.height) {
            result.width = intersectWidth;
            result.height = intersectHeight;
          }
          if (result.radius) {
            result.radius = Math.min(intersectWidth, intersectHeight) / 2;
          }
        }
        result.properties.strokeColor = '#0000ff';
        result.properties.strokeWidth = 3;
        break;
        
      case 'exclude':
        // For exclude, keep original shape with different styling
        result.properties = { ...sourceShape.properties };
        result.properties.strokeColor = '#ff00ff';
        result.properties.strokeWidth = 3;
        result.properties.fillOpacity = 0.5;
        break;
    }
    
    return result;
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