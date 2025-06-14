import { Shape } from './shapes';
import { Point } from './shapeTypes';

export interface LineSegment {
  start: Point;
  end: Point;
}

export interface IntersectionPoint extends Point {
  t1: number; // Parameter on first curve/line (0-1)
  t2: number; // Parameter on second curve/line (0-1)
  onShape1: boolean;
  onShape2: boolean;
}

export class GeometricIntersection {
  /**
   * Find all intersection points between two shapes
   */
  static findShapeIntersections(shape1: Shape, shape2: Shape): IntersectionPoint[] {
    const edges1 = this.getShapeEdges(shape1);
    const edges2 = this.getShapeEdges(shape2);
    const intersections: IntersectionPoint[] = [];

    for (let i = 0; i < edges1.length; i++) {
      for (let j = 0; j < edges2.length; j++) {
        const intersection = this.findLineIntersection(edges1[i], edges2[j]);
        if (intersection) {
          intersections.push({
            ...intersection,
            onShape1: true,
            onShape2: true
          });
        }
      }
    }

    return intersections;
  }

  /**
   * Get edge segments from a shape
   */
  private static getShapeEdges(shape: Shape): LineSegment[] {
    const edges: LineSegment[] = [];
    
    switch (shape.type) {
      case 'rectangle':
      case 'square':
        edges.push(...this.getRectangleEdges(shape));
        break;
      case 'circle':
        edges.push(...this.getCircleEdges(shape));
        break;
      case 'ellipse':
        edges.push(...this.getEllipseEdges(shape));
        break;
      case 'polygon':
      case 'star':
        if (shape.points) {
          edges.push(...this.getPolygonEdges(shape.points));
        }
        break;
    }

    return this.transformEdges(edges, shape);
  }

  /**
   * Get rectangle edges
   */
  private static getRectangleEdges(shape: Shape): LineSegment[] {
    const w = (shape.width || 100) / 2;
    const h = (shape.height || 100) / 2;
    
    return [
      { start: { x: -w, y: -h }, end: { x: w, y: -h } }, // Top
      { start: { x: w, y: -h }, end: { x: w, y: h } },   // Right
      { start: { x: w, y: h }, end: { x: -w, y: h } },   // Bottom
      { start: { x: -w, y: h }, end: { x: -w, y: -h } }  // Left
    ];
  }

  /**
   * Get circle edges (approximated as polygon)
   */
  private static getCircleEdges(shape: Shape): LineSegment[] {
    const radius = shape.radius || 50;
    const segments = 32; // High resolution for smooth circles
    const edges: LineSegment[] = [];
    
    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * Math.PI * 2;
      const angle2 = ((i + 1) / segments) * Math.PI * 2;
      
      edges.push({
        start: {
          x: Math.cos(angle1) * radius,
          y: Math.sin(angle1) * radius
        },
        end: {
          x: Math.cos(angle2) * radius,
          y: Math.sin(angle2) * radius
        }
      });
    }
    
    return edges;
  }

  /**
   * Get ellipse edges (approximated as polygon)
   */
  private static getEllipseEdges(shape: Shape): LineSegment[] {
    const rx = (shape.width || 100) / 2;
    const ry = (shape.height || 100) / 2;
    const segments = 32;
    const edges: LineSegment[] = [];
    
    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * Math.PI * 2;
      const angle2 = ((i + 1) / segments) * Math.PI * 2;
      
      edges.push({
        start: {
          x: Math.cos(angle1) * rx,
          y: Math.sin(angle1) * ry
        },
        end: {
          x: Math.cos(angle2) * rx,
          y: Math.sin(angle2) * ry
        }
      });
    }
    
    return edges;
  }

  /**
   * Get polygon edges
   */
  private static getPolygonEdges(points: Point[]): LineSegment[] {
    const edges: LineSegment[] = [];
    
    for (let i = 0; i < points.length; i++) {
      const next = (i + 1) % points.length;
      edges.push({
        start: points[i],
        end: points[next]
      });
    }
    
    return edges;
  }

  /**
   * Transform edges by shape transform
   */
  private static transformEdges(edges: LineSegment[], shape: Shape): LineSegment[] {
    const { transform } = shape;
    
    return edges.map(edge => ({
      start: this.transformPoint(edge.start, transform),
      end: this.transformPoint(edge.end, transform)
    }));
  }

  /**
   * Transform a point by shape transform
   */
  private static transformPoint(point: Point, transform: any): Point {
    // Apply scale
    let x = point.x * transform.scaleX;
    let y = point.y * transform.scaleY;
    
    // Apply rotation
    if (transform.rotation !== 0) {
      const cos = Math.cos(transform.rotation * Math.PI / 180);
      const sin = Math.sin(transform.rotation * Math.PI / 180);
      const newX = x * cos - y * sin;
      const newY = x * sin + y * cos;
      x = newX;
      y = newY;
    }
    
    // Apply translation
    x += transform.x;
    y += transform.y;
    
    return { x, y };
  }

  /**
   * Find intersection between two line segments
   */
  private static findLineIntersection(line1: LineSegment, line2: LineSegment): IntersectionPoint | null {
    const { start: p1, end: p2 } = line1;
    const { start: p3, end: p4 } = line2;
    
    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const x3 = p3.x, y3 = p3.y;
    const x4 = p4.x, y4 = p4.y;
    
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    
    if (Math.abs(denom) < 1e-10) {
      return null; // Lines are parallel
    }
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    // Check if intersection is within both line segments
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1),
        t1: t,
        t2: u,
        onShape1: true,
        onShape2: true
      };
    }
    
    return null;
  }

  /**
   * Perform geometric union operation
   */
  static performGeometricUnion(shape1: Shape, shape2: Shape): Shape | null {
    // Find all intersection points
    const intersections = this.findShapeIntersections(shape1, shape2);
    
    if (intersections.length === 0) {
      // No intersections - shapes don't overlap
      // Return a compound shape or the larger shape
      return this.createCompoundShape(shape1, shape2, 'union');
    }
    
    // Get all vertices from both shapes including intersection points
    const allVertices = this.collectAllVertices(shape1, shape2, intersections);
    
    // Build the union outline by tracing the outer boundary
    const unionOutline = this.traceUnionBoundary(allVertices, shape1, shape2);
    
    // Create result shape
    const result = new Shape('blob');
    result.id = `${shape1.id}_union_${shape2.id}`;
    result.points = unionOutline;
    result.transform.x = shape1.transform.x;
    result.transform.y = shape1.transform.y;
    result.properties = { ...shape1.properties };
    
    return result;
  }

  /**
   * Collect all vertices from both shapes and intersection points
   */
  private static collectAllVertices(shape1: Shape, shape2: Shape, intersections: IntersectionPoint[]): Point[] {
    const vertices: Point[] = [];
    
    // Add shape1 vertices
    const shape1Vertices = this.getShapeVertices(shape1);
    vertices.push(...shape1Vertices);
    
    // Add shape2 vertices
    const shape2Vertices = this.getShapeVertices(shape2);
    vertices.push(...shape2Vertices);
    
    // Add intersection points
    vertices.push(...intersections);
    
    return vertices;
  }

  /**
   * Get vertices from a shape
   */
  private static getShapeVertices(shape: Shape): Point[] {
    switch (shape.type) {
      case 'rectangle':
      case 'square':
        return this.getRectangleVertices(shape);
      case 'circle':
        return this.getCircleVertices(shape);
      case 'ellipse':
        return this.getEllipseVertices(shape);
      case 'polygon':
      case 'star':
        return shape.points || [];
      default:
        return [];
    }
  }

  /**
   * Get rectangle vertices
   */
  private static getRectangleVertices(shape: Shape): Point[] {
    const w = (shape.width || 100) / 2;
    const h = (shape.height || 100) / 2;
    
    const vertices = [
      { x: -w, y: -h },
      { x: w, y: -h },
      { x: w, y: h },
      { x: -w, y: h }
    ];
    
    return vertices.map(v => this.transformPoint(v, shape.transform));
  }

  /**
   * Get circle vertices (approximated)
   */
  private static getCircleVertices(shape: Shape): Point[] {
    const radius = shape.radius || 50;
    const segments = 32;
    const vertices: Point[] = [];
    
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const vertex = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      };
      vertices.push(this.transformPoint(vertex, shape.transform));
    }
    
    return vertices;
  }

  /**
   * Get ellipse vertices (approximated)
   */
  private static getEllipseVertices(shape: Shape): Point[] {
    const rx = (shape.width || 100) / 2;
    const ry = (shape.height || 100) / 2;
    const segments = 32;
    const vertices: Point[] = [];
    
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const vertex = {
        x: Math.cos(angle) * rx,
        y: Math.sin(angle) * ry
      };
      vertices.push(this.transformPoint(vertex, shape.transform));
    }
    
    return vertices;
  }

  /**
   * Trace the union boundary by walking the outer perimeter
   */
  private static traceUnionBoundary(vertices: Point[], shape1: Shape, shape2: Shape): Point[] {
    const intersections = this.findShapeIntersections(shape1, shape2);
    
    if (intersections.length === 0) {
      // No intersections - return convex hull of both shapes
      return this.convexHull(vertices);
    }
    
    // Build adjacency information for boundary tracing
    const shape1Edges = this.getShapeEdges(shape1);
    const shape2Edges = this.getShapeEdges(shape2);
    
    // Create a boundary trace starting from the leftmost point
    return this.traceBoundaryWithIntersections(shape1Edges, shape2Edges, intersections);
  }

  /**
   * Trace boundary considering intersections to build union outline
   */
  private static traceBoundaryWithIntersections(
    shape1Edges: LineSegment[], 
    shape2Edges: LineSegment[], 
    intersections: IntersectionPoint[]
  ): Point[] {
    const boundary: Point[] = [];
    
    // Start from leftmost point of shape1
    let currentEdges = shape1Edges;
    let currentShape = 1;
    let currentPoint = this.findLeftmostPoint(shape1Edges);
    
    boundary.push(currentPoint);
    
    // Trace boundary by following exterior edges
    let iterations = 0;
    const maxIterations = (shape1Edges.length + shape2Edges.length) * 2;
    
    while (iterations < maxIterations) {
      iterations++;
      
      // Find next point on current shape's boundary
      const nextEdge = this.findNextBoundaryEdge(currentPoint, currentEdges, currentShape === 1 ? shape2Edges : shape1Edges);
      
      if (!nextEdge) break;
      
      // Check if this edge crosses to the other shape
      const crossing = this.findEdgeCrossing(nextEdge, intersections);
      
      if (crossing) {
        // Switch to other shape at intersection
        boundary.push(crossing);
        currentPoint = crossing;
        currentEdges = currentShape === 1 ? shape2Edges : shape1Edges;
        currentShape = currentShape === 1 ? 2 : 1;
      } else {
        // Continue on current shape
        boundary.push(nextEdge.end);
        currentPoint = nextEdge.end;
      }
      
      // Check if we've returned to start
      if (this.pointsEqual(currentPoint, boundary[0]) && boundary.length > 3) {
        break;
      }
    }
    
    return boundary.length > 3 ? boundary : this.convexHull([...this.getEdgePoints(shape1Edges), ...this.getEdgePoints(shape2Edges)]);
  }

  /**
   * Find leftmost point from edges
   */
  private static findLeftmostPoint(edges: LineSegment[]): Point {
    let leftmost = edges[0].start;
    
    for (const edge of edges) {
      if (edge.start.x < leftmost.x || (edge.start.x === leftmost.x && edge.start.y < leftmost.y)) {
        leftmost = edge.start;
      }
      if (edge.end.x < leftmost.x || (edge.end.x === leftmost.x && edge.end.y < leftmost.y)) {
        leftmost = edge.end;
      }
    }
    
    return leftmost;
  }

  /**
   * Find next boundary edge from current point
   */
  private static findNextBoundaryEdge(currentPoint: Point, currentEdges: LineSegment[], otherEdges: LineSegment[]): LineSegment | null {
    // Find edge that starts from current point
    for (const edge of currentEdges) {
      if (this.pointsEqual(edge.start, currentPoint)) {
        // Check if this edge is on the exterior (not inside other shape)
        const midPoint = {
          x: (edge.start.x + edge.end.x) / 2,
          y: (edge.start.y + edge.end.y) / 2
        };
        
        if (!this.isPointInsideShape(midPoint, otherEdges)) {
          return edge;
        }
      }
    }
    
    return null;
  }

  /**
   * Check if point is inside a shape defined by edges
   */
  private static isPointInsideShape(point: Point, edges: LineSegment[]): boolean {
    // Ray casting algorithm
    let inside = false;
    const rayEnd = { x: point.x + 10000, y: point.y };
    
    for (const edge of edges) {
      const intersection = this.findLineIntersection(
        { start: point, end: rayEnd },
        edge
      );
      
      if (intersection) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  /**
   * Find where an edge crosses to another shape
   */
  private static findEdgeCrossing(edge: LineSegment, intersections: IntersectionPoint[]): Point | null {
    for (const intersection of intersections) {
      // Check if intersection lies on this edge
      const dist1 = this.pointDistance(edge.start, intersection);
      const dist2 = this.pointDistance(edge.end, intersection);
      const edgeLength = this.pointDistance(edge.start, edge.end);
      
      if (Math.abs(dist1 + dist2 - edgeLength) < 1e-6) {
        return intersection;
      }
    }
    
    return null;
  }

  /**
   * Get all points from edges
   */
  private static getEdgePoints(edges: LineSegment[]): Point[] {
    const points: Point[] = [];
    for (const edge of edges) {
      points.push(edge.start, edge.end);
    }
    return points;
  }

  /**
   * Check if two points are equal within tolerance
   */
  private static pointsEqual(p1: Point, p2: Point, tolerance = 1e-6): boolean {
    return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
  }

  /**
   * Calculate distance between two points
   */
  private static pointDistance(p1: Point, p2: Point): number {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  }

  /**
   * Compute convex hull using Graham scan
   */
  private static convexHull(points: Point[]): Point[] {
    if (points.length < 3) return points;
    
    // Find the bottom-most point (or left most in case of tie)
    let bottom = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].y < points[bottom].y || 
          (points[i].y === points[bottom].y && points[i].x < points[bottom].x)) {
        bottom = i;
      }
    }
    
    // Swap bottom point to first position
    [points[0], points[bottom]] = [points[bottom], points[0]];
    
    // Sort points by polar angle with respect to bottom point
    const bottomPoint = points[0];
    points.slice(1).sort((a, b) => {
      const angleA = Math.atan2(a.y - bottomPoint.y, a.x - bottomPoint.x);
      const angleB = Math.atan2(b.y - bottomPoint.y, b.x - bottomPoint.x);
      return angleA - angleB;
    });
    
    // Build convex hull
    const hull: Point[] = [];
    for (const point of points) {
      while (hull.length >= 2 && this.crossProduct(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
        hull.pop();
      }
      hull.push(point);
    }
    
    return hull;
  }

  /**
   * Calculate cross product for three points
   */
  private static crossProduct(o: Point, a: Point, b: Point): number {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  /**
   * Create a compound shape when shapes don't intersect
   */
  private static createCompoundShape(shape1: Shape, shape2: Shape, operation: string): Shape {
    const result = new Shape('blob');
    result.id = `${shape1.id}_${operation}_${shape2.id}`;
    
    // Use shape1's position and properties
    result.transform = { ...shape1.transform };
    result.properties = { ...shape1.properties };
    
    // Create a bounding outline that encompasses both shapes
    const bounds1 = shape1.getBounds();
    const bounds2 = shape2.getBounds();
    
    const minX = Math.min(bounds1.x, bounds2.x);
    const minY = Math.min(bounds1.y, bounds2.y);
    const maxX = Math.max(bounds1.x + bounds1.width, bounds2.x + bounds2.width);
    const maxY = Math.max(bounds1.y + bounds1.height, bounds2.y + bounds2.height);
    
    result.points = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY }
    ];
    
    return result;
  }
}