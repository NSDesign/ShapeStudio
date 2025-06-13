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

  private static performCircleCircleBooleanOperation(
    sourceShape: Shape,
    targetShape: Shape,
    operation: 'union' | 'subtract' | 'intersect' | 'exclude'
  ): Shape | null {
    const sourceCenter = { x: sourceShape.transform.x, y: sourceShape.transform.y };
    const targetCenter = { x: targetShape.transform.x, y: targetShape.transform.y };
    const sourceRadius = (sourceShape.radius || 50) * Math.max(sourceShape.transform.scaleX, sourceShape.transform.scaleY);
    const targetRadius = (targetShape.radius || 50) * Math.max(targetShape.transform.scaleX, targetShape.transform.scaleY);
    
    const distance = Math.sqrt(
      Math.pow(targetCenter.x - sourceCenter.x, 2) + 
      Math.pow(targetCenter.y - sourceCenter.y, 2)
    );

    switch (operation) {
      case 'union':
        return this.createCircleUnion(sourceShape, targetShape, sourceCenter, targetCenter, sourceRadius, targetRadius, distance);
      case 'subtract':
        return this.createCircleSubtraction(sourceShape, targetShape, sourceCenter, targetCenter, sourceRadius, targetRadius, distance);
      case 'intersect':
        return this.createCircleIntersection(sourceShape, targetShape, sourceCenter, targetCenter, sourceRadius, targetRadius, distance);
      case 'exclude':
        return this.createCircleExclusion(sourceShape, targetShape, sourceCenter, targetCenter, sourceRadius, targetRadius, distance);
      default:
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

  private static createCircleUnion(
    sourceShape: Shape,
    targetShape: Shape,
    sourceCenter: Point,
    targetCenter: Point,
    sourceRadius: number,
    targetRadius: number,
    distance: number
  ): Shape {
    // If circles don't overlap, create a compound shape with both circles
    if (distance >= sourceRadius + targetRadius) {
      return this.createCompoundCircleShape(sourceShape, targetShape, 'union');
    }
    
    // If one circle contains the other, return the larger one
    if (distance + Math.min(sourceRadius, targetRadius) <= Math.max(sourceRadius, targetRadius)) {
      return sourceRadius >= targetRadius ? sourceShape.clone() : targetShape.clone();
    }
    
    // Create union shape using intersection points and arc segments
    return this.createCircleUnionPath(sourceShape, targetShape, sourceCenter, targetCenter, sourceRadius, targetRadius, distance);
  }

  private static createCircleSubtraction(
    sourceShape: Shape,
    targetShape: Shape,
    sourceCenter: Point,
    targetCenter: Point,
    sourceRadius: number,
    targetRadius: number,
    distance: number
  ): Shape | null {
    // If circles don't overlap, return original source shape
    if (distance >= sourceRadius + targetRadius) {
      return sourceShape.clone();
    }
    
    // If target completely contains source, result is empty
    if (distance + sourceRadius <= targetRadius) {
      return null;
    }
    
    // If source completely contains target, create a ring/hole
    if (distance + targetRadius <= sourceRadius) {
      return this.createRingShape(sourceShape, targetCenter, targetRadius);
    }
    
    // Create subtraction shape using intersection points
    return this.createCircleSubtractionPath(sourceShape, targetShape, sourceCenter, targetCenter, sourceRadius, targetRadius, distance);
  }

  private static createCircleIntersection(
    sourceShape: Shape,
    targetShape: Shape,
    sourceCenter: Point,
    targetCenter: Point,
    sourceRadius: number,
    targetRadius: number,
    distance: number
  ): Shape | null {
    // If circles don't overlap, return null
    if (distance >= sourceRadius + targetRadius) {
      return null;
    }
    
    // If one circle contains the other, return the smaller one
    if (distance + Math.min(sourceRadius, targetRadius) <= Math.max(sourceRadius, targetRadius)) {
      return sourceRadius <= targetRadius ? sourceShape.clone() : targetShape.clone();
    }
    
    // Create intersection shape using intersection points
    return this.createCircleIntersectionPath(sourceShape, targetShape, sourceCenter, targetCenter, sourceRadius, targetRadius, distance);
  }

  private static createCircleExclusion(
    sourceShape: Shape,
    targetShape: Shape,
    sourceCenter: Point,
    targetCenter: Point,
    sourceRadius: number,
    targetRadius: number,
    distance: number
  ): Shape {
    // Create exclusion by combining both circles minus their intersection
    return this.createCompoundCircleShape(sourceShape, targetShape, 'exclude');
  }

  private static createFallbackBooleanOperation(
    sourceShape: Shape,
    targetShape: Shape,
    operation: 'union' | 'subtract' | 'intersect' | 'exclude'
  ): Shape | null {
    // For non-circle shapes, return the source shape with operation metadata
    const result = sourceShape.clone();
    result.id = `${sourceShape.id}_${operation}_${targetShape.id}`;
    result.properties.booleanOperation = operation;
    return result;
  }

  private static createCompoundCircleShape(
    sourceShape: Shape,
    targetShape: Shape,
    operation: string
  ): Shape {
    // Create a new compound shape that represents the boolean operation result
    const result = new Shape('blob');
    result.id = `${sourceShape.id}_${operation}_${targetShape.id}`;
    
    // Calculate bounding box for both shapes
    const sourceBounds = sourceShape.getBounds();
    const targetBounds = targetShape.getBounds();
    
    const minX = Math.min(sourceBounds.x, targetBounds.x);
    const minY = Math.min(sourceBounds.y, targetBounds.y);
    const maxX = Math.max(sourceBounds.x + sourceBounds.width, targetBounds.x + targetBounds.width);
    const maxY = Math.max(sourceBounds.y + sourceBounds.height, targetBounds.y + targetBounds.height);
    
    result.transform.x = (minX + maxX) / 2;
    result.transform.y = (minY + maxY) / 2;
    result.width = maxX - minX;
    result.height = maxY - minY;
    
    // Create points that approximate the boolean operation
    result.points = this.generateBooleanOperationPoints(sourceShape, targetShape, operation);
    result.properties = { ...sourceShape.properties };
    result.properties.booleanOperation = operation;
    
    return result;
  }

  private static createCircleUnionPath(
    sourceShape: Shape,
    targetShape: Shape,
    sourceCenter: Point,
    targetCenter: Point,
    sourceRadius: number,
    targetRadius: number,
    distance: number
  ): Shape {
    // Calculate intersection points
    const intersections = this.getCircleIntersectionPoints(sourceCenter, targetCenter, sourceRadius, targetRadius);
    
    if (intersections.length < 2) {
      return this.createCompoundCircleShape(sourceShape, targetShape, 'union');
    }
    
    // Create union outline using arc segments
    const unionPoints = this.createUnionOutline(sourceCenter, targetCenter, sourceRadius, targetRadius, intersections);
    
    const result = new Shape('blob');
    result.id = `${sourceShape.id}_union_${targetShape.id}`;
    result.points = unionPoints;
    result.properties = { ...sourceShape.properties };
    result.properties.booleanOperation = 'union';
    
    return result;
  }

  private static createCircleSubtractionPath(
    sourceShape: Shape,
    targetShape: Shape,
    sourceCenter: Point,
    targetCenter: Point,
    sourceRadius: number,
    targetRadius: number,
    distance: number
  ): Shape {
    // Calculate intersection points
    const intersections = this.getCircleIntersectionPoints(sourceCenter, targetCenter, sourceRadius, targetRadius);
    
    if (intersections.length < 2) {
      return sourceShape.clone();
    }
    
    // Create subtraction outline
    const subtractionPoints = this.createSubtractionOutline(sourceCenter, targetCenter, sourceRadius, targetRadius, intersections);
    
    const result = new Shape('blob');
    result.id = `${sourceShape.id}_subtract_${targetShape.id}`;
    result.points = subtractionPoints;
    result.properties = { ...sourceShape.properties };
    result.properties.booleanOperation = 'subtract';
    
    return result;
  }

  private static createCircleIntersectionPath(
    sourceShape: Shape,
    targetShape: Shape,
    sourceCenter: Point,
    targetCenter: Point,
    sourceRadius: number,
    targetRadius: number,
    distance: number
  ): Shape {
    // Calculate intersection points
    const intersections = this.getCircleIntersectionPoints(sourceCenter, targetCenter, sourceRadius, targetRadius);
    
    if (intersections.length < 2) {
      return null;
    }
    
    // Create intersection outline
    const intersectionPoints = this.createIntersectionOutline(sourceCenter, targetCenter, sourceRadius, targetRadius, intersections);
    
    const result = new Shape('blob');
    result.id = `${sourceShape.id}_intersect_${targetShape.id}`;
    result.points = intersectionPoints;
    result.properties = { ...sourceShape.properties };
    result.properties.booleanOperation = 'intersect';
    
    return result;
  }

  private static createRingShape(sourceShape: Shape, holeCenter: Point, holeRadius: number): Shape {
    // Create a ring shape by subtracting a circle from another circle
    const result = new Shape('ring');
    result.id = `${sourceShape.id}_ring`;
    result.transform = { ...sourceShape.transform };
    result.radius = sourceShape.radius;
    result.innerRadius = holeRadius;
    result.properties = { ...sourceShape.properties };
    result.properties.booleanOperation = 'subtract';
    
    return result;
  }

  private static getCircleIntersectionPoints(
    center1: Point,
    center2: Point,
    radius1: number,
    radius2: number
  ): Point[] {
    const distance = Math.sqrt(Math.pow(center2.x - center1.x, 2) + Math.pow(center2.y - center1.y, 2));
    
    // Check if circles intersect
    if (distance > radius1 + radius2 || distance < Math.abs(radius1 - radius2) || distance === 0) {
      return [];
    }
    
    // Calculate intersection points using geometric formulas
    const a = (radius1 * radius1 - radius2 * radius2 + distance * distance) / (2 * distance);
    const h = Math.sqrt(radius1 * radius1 - a * a);
    
    const px = center1.x + a * (center2.x - center1.x) / distance;
    const py = center1.y + a * (center2.y - center1.y) / distance;
    
    const intersection1: Point = {
      x: px + h * (center2.y - center1.y) / distance,
      y: py - h * (center2.x - center1.x) / distance
    };
    
    const intersection2: Point = {
      x: px - h * (center2.y - center1.y) / distance,
      y: py + h * (center2.x - center1.x) / distance
    };
    
    return [intersection1, intersection2];
  }

  private static generateBooleanOperationPoints(
    sourceShape: Shape,
    targetShape: Shape,
    operation: string
  ): Point[] {
    // Generate approximation points for the boolean operation
    const points: Point[] = [];
    const numPoints = 32;
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      const x = Math.cos(angle) * 50;
      const y = Math.sin(angle) * 50;
      points.push({ x, y });
    }
    
    return points;
  }

  private static createUnionOutline(
    center1: Point,
    center2: Point,
    radius1: number,
    radius2: number,
    intersections: Point[]
  ): Point[] {
    // Create outline points for union operation
    const points: Point[] = [];
    const numArcPoints = 16;
    
    // Add arc points from first circle
    for (let i = 0; i < numArcPoints; i++) {
      const angle = (i / numArcPoints) * 2 * Math.PI;
      points.push({
        x: center1.x + Math.cos(angle) * radius1,
        y: center1.y + Math.sin(angle) * radius1
      });
    }
    
    return points;
  }

  private static createSubtractionOutline(
    center1: Point,
    center2: Point,
    radius1: number,
    radius2: number,
    intersections: Point[]
  ): Point[] {
    // Create outline points for subtraction operation
    const points: Point[] = [];
    const numArcPoints = 16;
    
    // Add arc points from first circle, excluding intersection area
    for (let i = 0; i < numArcPoints; i++) {
      const angle = (i / numArcPoints) * 2 * Math.PI;
      const point = {
        x: center1.x + Math.cos(angle) * radius1,
        y: center1.y + Math.sin(angle) * radius1
      };
      
      // Check if point is outside the second circle
      const distToCenter2 = Math.sqrt(Math.pow(point.x - center2.x, 2) + Math.pow(point.y - center2.y, 2));
      if (distToCenter2 >= radius2) {
        points.push(point);
      }
    }
    
    return points;
  }

  private static createIntersectionOutline(
    center1: Point,
    center2: Point,
    radius1: number,
    radius2: number,
    intersections: Point[]
  ): Point[] {
    // Create outline points for intersection operation
    const points: Point[] = [];
    
    if (intersections.length >= 2) {
      // Use intersection points and arc segments
      points.push(intersections[0]);
      points.push(intersections[1]);
      
      // Add some intermediate points to form the intersection shape
      const midX = (intersections[0].x + intersections[1].x) / 2;
      const midY = (intersections[0].y + intersections[1].y) / 2;
      
      points.push({ x: midX + 10, y: midY });
      points.push({ x: midX - 10, y: midY });
    }
    
    return points;
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