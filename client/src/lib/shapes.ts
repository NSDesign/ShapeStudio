import { BaseShape, ShapeType, Point, Transform, ShapeProperties, ShapeGroup, BlendMode } from './shapeTypes';

export class Shape {
  id: string;
  type: ShapeType;
  transform: Transform;
  properties: ShapeProperties;
  selected: boolean;
  points: Point[];
  sides?: number;
  radius?: number;
  innerRadius?: number;
  width?: number;
  height?: number;
  controlPoints?: Point[];
  tangentHandles?: { in: Point; out: Point }[];
  smoothPoints?: boolean[];
  closed?: boolean;
  segments: number;
  renderType: 'polygon' | 'bezier' | 'cubic' | 'smooth';

  constructor(type: ShapeType, x: number = 0, y: number = 0) {
    this.id = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.transform = {
      x,
      y,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      skewX: 0,
      skewY: 0
    };
    this.properties = this.generateRandomProperties();
    this.selected = false;
    this.points = [];
    
    // Initialize with default values, will be set properly after shape data generation
    this.segments = 8;
    this.renderType = 'polygon';
    
    this.generateShapeData();
    
    // Set proper defaults after shape initialization
    this.segments = this.getDefaultSegments();
    this.renderType = this.getDefaultRenderType();
  }

  static create(type: ShapeType, x: number = 0, y: number = 0): Shape {
    return new Shape(type, x, y);
  }

  private getDefaultSegments(): number {
    switch (this.type) {
      case 'circle':
      case 'ellipse':
        return 32; // Smooth circles/ellipses
      case 'ring':
        return 24; // Smooth rings
      case 'polygon':
      case 'star':
        return this.sides || 6;
      case 'rectangle':
      case 'square':
        return 4;
      default:
        return 8;
    }
  }

  private getDefaultRenderType(): 'polygon' | 'bezier' | 'cubic' | 'smooth' {
    switch (this.type) {
      case 'circle':
      case 'ellipse':
      case 'ring':
        return 'smooth'; // Use smooth curves for round shapes
      case 'bezier':
        return 'bezier';
      case 'cubic':
        return 'cubic';
      case 'blob':
        return 'cubic';
      default:
        return 'polygon'; // Use polygon for geometric shapes
    }
  }

  private generateRandomProperties(): ShapeProperties {
    const hue = Math.random() * 360;
    const saturation = 50 + Math.random() * 50;
    const lightness = 40 + Math.random() * 40;
    
    // 50% chance for gradient fill
    const useGradient = Math.random() > 0.5;
    let gradient = undefined;
    
    if (useGradient) {
      const gradientType = Math.random() > 0.5 ? 'linear' : 'radial';
      const stopCount = 2 + Math.floor(Math.random() * 3); // 2-4 color stops
      const stops = [];
      
      for (let i = 0; i < stopCount; i++) {
        const stopHue = (hue + (i * 60)) % 360;
        const stopSat = 40 + Math.random() * 60;
        const stopLight = 30 + Math.random() * 50;
        stops.push({
          offset: i / (stopCount - 1),
          color: `hsl(${stopHue}, ${stopSat}%, ${stopLight}%)`
        });
      }
      
      gradient = {
        type: gradientType as 'linear' | 'radial',
        stops
      };
    }
    
    return {
      fillColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      fillOpacity: 0.7 + Math.random() * 0.3,
      strokeColor: `hsl(${(hue + 30) % 360}, ${saturation}%, ${Math.max(20, lightness - 20)}%)`,
      strokeWidth: 1 + Math.random() * 4,
      strokeOpacity: 0.8 + Math.random() * 0.2,
      blendMode: 'source-over' as BlendMode,
      zIndex: 0, // Will be set properly when shape is added to canvas
      gradient
    };
  }

  private generateShapeData(): void {
    switch (this.type) {
      case 'rectangle':
        this.width = 50 + Math.random() * 150;
        this.height = 30 + Math.random() * 120;
        this.generateRectanglePoints();
        break;
      case 'square':
        const size = 40 + Math.random() * 100;
        this.width = size;
        this.height = size;
        this.generateRectanglePoints();
        break;
      case 'circle':
        this.radius = 25 + Math.random() * 75;
        this.generateCirclePoints();
        break;
      case 'ellipse':
        this.width = 40 + Math.random() * 120;
        this.height = 30 + Math.random() * 80;
        this.generateEllipsePoints();
        break;
      case 'polygon':
        this.sides = 3 + Math.floor(Math.random() * 10);
        this.radius = 30 + Math.random() * 70;
        this.generatePolygonPoints();
        break;
      case 'star':
        this.sides = 5 + Math.floor(Math.random() * 7);
        this.radius = 30 + Math.random() * 70;
        this.innerRadius = this.radius * (0.3 + Math.random() * 0.4);
        this.generateStarPoints();
        break;
      case 'line':
        this.generateLinePoints();
        break;
      case 'bezier':
      case 'cubic':
        this.generateCurvePoints();
        break;
      case 'blob':
        this.generateBlobPoints();
        break;
      case 'ring':
        this.radius = 30 + Math.random() * 70;
        this.innerRadius = this.radius * (0.4 + Math.random() * 0.4);
        this.generateRingPoints();
        break;
    }
  }

  private generateLinePoints(): void {
    const numPoints = 2 + Math.floor(Math.random() * 6);
    this.points = [];
    for (let i = 0; i < numPoints; i++) {
      this.points.push({
        x: i * (20 + Math.random() * 40),
        y: (Math.random() - 0.5) * 100
      });
    }
  }

  private generateCurvePoints(): void {
    const numPoints = this.type === 'cubic' ? 4 : 3 + Math.floor(Math.random() * 3);
    this.points = [];
    this.controlPoints = [];
    this.tangentHandles = [];
    this.smoothPoints = [];
    
    if (this.type === 'cubic') {
      // Generate cubic bezier curve with 4 points
      this.points = [
        { x: -60, y: 0 },
        { x: -20, y: -40 },
        { x: 20, y: 40 },
        { x: 60, y: 0 }
      ];
      
      // Generate tangent handles for each point
      this.points.forEach((point, i) => {
        const handleLength = 20 + Math.random() * 15;
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = angle1 + Math.PI; // Opposite direction for smooth continuity
        
        this.tangentHandles!.push({
          in: {
            x: point.x + Math.cos(angle1) * handleLength,
            y: point.y + Math.sin(angle1) * handleLength
          },
          out: {
            x: point.x + Math.cos(angle2) * handleLength,
            y: point.y + Math.sin(angle2) * handleLength
          }
        });
        
        // All points start as smooth (continuous tangents)
        this.smoothPoints!.push(true);
      });
      
    } else {
      // Generate bezier curve with tangent handles
      for (let i = 0; i < numPoints; i++) {
        const point = {
          x: (i - numPoints/2) * (40 + Math.random() * 30),
          y: (Math.random() - 0.5) * 100
        };
        this.points.push(point);
        
        // Generate tangent handles
        const handleLength = 15 + Math.random() * 10;
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = angle1 + Math.PI;
        
        this.tangentHandles!.push({
          in: {
            x: point.x + Math.cos(angle1) * handleLength,
            y: point.y + Math.sin(angle1) * handleLength
          },
          out: {
            x: point.x + Math.cos(angle2) * handleLength,
            y: point.y + Math.sin(angle2) * handleLength
          }
        });
        
        this.smoothPoints!.push(true);
      }
    }
    
    this.closed = this.type === 'cubic' ? false : Math.random() > 0.5;
    this.renderType = 'bezier';
  }

  private generateBlobPoints(): void {
    const numPoints = 6 + Math.floor(Math.random() * 6);
    this.points = [];
    const baseRadius = 40 + Math.random() * 60;
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radiusVariation = 0.7 + Math.random() * 0.6;
      const radius = baseRadius * radiusVariation;
      
      this.points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
    }
    this.closed = true;
  }

  private generateRectanglePoints(): void {
    const w = this.width! / 2;
    const h = this.height! / 2;
    this.points = [
      { x: -w, y: -h },  // Top-left
      { x: w, y: -h },   // Top-right
      { x: w, y: h },    // Bottom-right
      { x: -w, y: h }    // Bottom-left
    ];
    this.closed = true;
  }

  private generateCirclePoints(): void {
    this.points = [];
    const radius = this.radius!;
    
    for (let i = 0; i < this.segments; i++) {
      const angle = (i / this.segments) * Math.PI * 2;
      this.points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
    }
    this.closed = true;
  }

  private generateEllipsePoints(): void {
    const numPoints = 16; // 16 points for smooth ellipse editing
    this.points = [];
    const w = this.width! / 2;
    const h = this.height! / 2;
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      this.points.push({
        x: Math.cos(angle) * w,
        y: Math.sin(angle) * h
      });
    }
    this.closed = true;
  }

  private generatePolygonPoints(): void {
    this.points = [];
    const sides = this.sides!;
    const radius = this.radius!;
    
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      this.points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
    }
    this.closed = true;
  }

  private generateStarPoints(): void {
    this.points = [];
    const sides = this.sides!;
    const outerRadius = this.radius!;
    const innerRadius = this.innerRadius!;
    
    for (let i = 0; i < sides * 2; i++) {
      const angle = (i / (sides * 2)) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      this.points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
    }
    this.closed = true;
  }

  private generateRingPoints(): void {
    const numPoints = 16;
    this.points = [];
    const outerRadius = this.radius!;
    const innerRadius = this.innerRadius!;
    
    // Outer ring points
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      this.points.push({
        x: Math.cos(angle) * outerRadius,
        y: Math.sin(angle) * outerRadius
      });
    }
    
    // Inner ring points (reverse order for proper winding)
    for (let i = numPoints - 1; i >= 0; i--) {
      const angle = (i / numPoints) * Math.PI * 2;
      this.points.push({
        x: Math.cos(angle) * innerRadius,
        y: Math.sin(angle) * innerRadius
      });
    }
    this.closed = true;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.points || this.points.length === 0) {
      return;
    }
    
    ctx.save();
    
    // Apply blend mode
    ctx.globalCompositeOperation = this.properties.blendMode;
    
    // Apply transform
    ctx.translate(this.transform.x, this.transform.y);
    ctx.rotate(this.transform.rotation * Math.PI / 180);
    ctx.scale(this.transform.scaleX, this.transform.scaleY);
    ctx.transform(1, this.transform.skewX, this.transform.skewY, 1, 0, 0);
    
    // Draw shape
    this.drawShape(ctx);
    
    // Draw selection indicator
    if (this.selected) {
      ctx.globalCompositeOperation = 'source-over'; // Reset blend mode for selection
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      this.drawSelectionBounds(ctx);
      ctx.setLineDash([]);
    }
    
    ctx.restore();
  }

  private drawShape(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    
    switch (this.type) {
      case 'rectangle':
      case 'square':
        this.drawPolygon(ctx); // Use points for deformable rectangles
        break;
      case 'circle':
        this.drawPolygon(ctx); // Use points for deformable circles
        break;
      case 'ellipse':
        this.drawPolygon(ctx); // Use points for deformable ellipses
        break;
      case 'polygon':
        this.drawPolygon(ctx);
        break;
      case 'star':
        this.drawPolygon(ctx); // Use points for deformable stars
        break;
      case 'line':
        this.drawLine(ctx);
        break;
      case 'bezier':
      case 'cubic':
        this.drawCurve(ctx);
        break;
      case 'blob':
        this.drawBlob(ctx);
        break;
      case 'ring':
        this.drawPolygon(ctx); // Use points for deformable rings
        break;
    }
    
    // Only fill shapes that aren't lines and have fill enabled
    if (this.type !== 'line' && this.properties.fillColor !== 'none') {
      // Apply fill with gradient if available
      if (this.properties.gradient) {
        const bounds = this.getBounds();
        let gradient: CanvasGradient;
        
        if (this.properties.gradient.type === 'linear') {
          gradient = ctx.createLinearGradient(
            bounds.x, bounds.y, 
            bounds.x + bounds.width, bounds.y + bounds.height
          );
        } else {
          const centerX = bounds.x + bounds.width / 2;
          const centerY = bounds.y + bounds.height / 2;
          const radius = Math.max(bounds.width, bounds.height) / 2;
          gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        }
        
        this.properties.gradient.stops.forEach(stop => {
          gradient.addColorStop(stop.offset, stop.color);
        });
        
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = this.properties.fillColor;
      }
      ctx.globalAlpha = this.properties.fillOpacity;
      ctx.fill();
    }
    
    // Only stroke if stroke is enabled
    if (this.properties.strokeColor !== 'none' && this.properties.strokeWidth > 0) {
      ctx.globalAlpha = this.properties.strokeOpacity;
      ctx.strokeStyle = this.properties.strokeColor;
      ctx.lineWidth = this.properties.strokeWidth;
      ctx.stroke();
    }
  }

  private drawPolygon(ctx: CanvasRenderingContext2D): void {
    if (!this.points || this.points.length === 0) {
      return;
    }
    
    // Handle ring shapes with inner and outer points
    if (this.type === 'ring') {
      const halfPoints = this.points.length / 2;
      
      // Draw outer ring
      this.points.slice(0, halfPoints).forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      
      // Draw inner ring (cut-out)
      ctx.moveTo(this.points[halfPoints].x, this.points[halfPoints].y);
      for (let i = halfPoints; i < this.points.length; i++) {
        ctx.lineTo(this.points[i].x, this.points[i].y);
      }
      ctx.closePath();
    } else {
      // Draw regular polygon using actual points
      this.points.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
    }
  }

  private drawStar(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.sides! * 2; i++) {
      const angle = (i * Math.PI) / this.sides! - Math.PI / 2;
      const radius = i % 2 === 0 ? this.radius! : this.innerRadius!;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  private drawLine(ctx: CanvasRenderingContext2D): void {
    this.points.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
  }

  private drawCurve(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 2) return;
    
    ctx.moveTo(this.points[0].x, this.points[0].y);
    
    // Use renderType to determine how to draw curves
    const renderType = this.renderType || 'polygon';
    
    if (renderType === 'bezier' || renderType === 'cubic' || renderType === 'smooth') {
      if (this.type === 'cubic' && this.tangentHandles && this.points.length >= 2) {
        // Draw proper cubic bezier curves using tangent handles
        for (let i = 0; i < this.points.length - 1; i++) {
          const p1 = this.points[i];
          const p2 = this.points[i + 1];
          
          if (i < this.tangentHandles.length && (i + 1) < this.tangentHandles.length) {
            const cp1 = this.tangentHandles[i].out;
            const cp2 = this.tangentHandles[i + 1].in;
            
            // Draw cubic bezier curve
            ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
          } else {
            ctx.lineTo(p2.x, p2.y);
          }
        }
      } else {
        // Draw bezier curves between points
        for (let i = 1; i < this.points.length; i++) {
          if (this.controlPoints && i - 1 < this.controlPoints.length) {
            // Use control points for bezier curves
            ctx.quadraticCurveTo(
              this.controlPoints[i - 1].x,
              this.controlPoints[i - 1].y,
              this.points[i].x,
              this.points[i].y
            );
          } else {
            // Generate smooth curve without explicit control points
            const prevPoint = this.points[i - 1];
            const currentPoint = this.points[i];
            const nextPoint = this.points[i + 1] || (this.closed ? this.points[0] : currentPoint);
            
            // Calculate control point for smooth curve
            const tension = 0.3;
            const controlX = currentPoint.x + (nextPoint.x - prevPoint.x) * tension;
            const controlY = currentPoint.y + (nextPoint.y - prevPoint.y) * tension;
            
            ctx.quadraticCurveTo(controlX, controlY, currentPoint.x, currentPoint.y);
          }
        }
      }
    } else {
      // Draw straight lines between points
      for (let i = 1; i < this.points.length; i++) {
        ctx.lineTo(this.points[i].x, this.points[i].y);
      }
    }
    
    if (this.closed) ctx.closePath();
  }

  private drawBlob(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 3) return;
    
    ctx.moveTo(this.points[0].x, this.points[0].y);
    
    for (let i = 1; i < this.points.length; i++) {
      const current = this.points[i];
      const next = this.points[(i + 1) % this.points.length];
      const cp1x = current.x;
      const cp1y = current.y;
      const cp2x = (current.x + next.x) / 2;
      const cp2y = (current.y + next.y) / 2;
      
      ctx.quadraticCurveTo(cp1x, cp1y, cp2x, cp2y);
    }
    
    ctx.closePath();
  }

  private drawRing(ctx: CanvasRenderingContext2D): void {
    ctx.arc(0, 0, this.radius!, 0, Math.PI * 2);
    ctx.arc(0, 0, this.innerRadius!, 0, Math.PI * 2, true);
  }

  private drawSelectionBounds(ctx: CanvasRenderingContext2D): void {
    const bounds = this.getBounds();
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
    // Add corner indicators for better visibility
    const cornerSize = 6;
    const corners = [
      [bounds.x, bounds.y],
      [bounds.x + bounds.width, bounds.y],
      [bounds.x + bounds.width, bounds.y + bounds.height],
      [bounds.x, bounds.y + bounds.height]
    ];
    
    ctx.fillStyle = '#2563EB';
    corners.forEach(([x, y]) => {
      ctx.fillRect(x - cornerSize/2, y - cornerSize/2, cornerSize, cornerSize);
    });
  }

  renderTransformHandles(ctx: CanvasRenderingContext2D, canvasZoom: number = 1, isTouchDevice: boolean = false): void {
    if (!this.selected || isTouchDevice) return; // Only show handles on non-touch devices
    
    ctx.save();
    
    // Get world-space bounds after transformation
    const worldBounds = this.getWorldBounds();
    
    // Handle size should be constant in screen space
    const handleSize = 8 / canvasZoom;
    const handleOffset = handleSize / 2;
    
    // Corner handles for scaling - use world bounds
    const corners = [
      { x: worldBounds.x - handleOffset, y: worldBounds.y - handleOffset }, // Top-left
      { x: worldBounds.x + worldBounds.width - handleOffset, y: worldBounds.y - handleOffset }, // Top-right
      { x: worldBounds.x + worldBounds.width - handleOffset, y: worldBounds.y + worldBounds.height - handleOffset }, // Bottom-right
      { x: worldBounds.x - handleOffset, y: worldBounds.y + worldBounds.height - handleOffset } // Bottom-left
    ];
    
    // Edge handles for scaling
    const edges = [
      { x: worldBounds.x + worldBounds.width / 2 - handleOffset, y: worldBounds.y - handleOffset }, // Top
      { x: worldBounds.x + worldBounds.width - handleOffset, y: worldBounds.y + worldBounds.height / 2 - handleOffset }, // Right
      { x: worldBounds.x + worldBounds.width / 2 - handleOffset, y: worldBounds.y + worldBounds.height - handleOffset }, // Bottom
      { x: worldBounds.x - handleOffset, y: worldBounds.y + worldBounds.height / 2 - handleOffset } // Left
    ];
    
    // Draw corner handles (for scaling)
    ctx.fillStyle = '#3B82F6';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1 / canvasZoom;
    
    corners.forEach(corner => {
      ctx.fillRect(corner.x, corner.y, handleSize, handleSize);
      ctx.strokeRect(corner.x, corner.y, handleSize, handleSize);
    });
    
    // Draw edge handles (for scaling)
    ctx.fillStyle = '#10B981';
    edges.forEach(edge => {
      ctx.fillRect(edge.x, edge.y, handleSize, handleSize);
      ctx.strokeRect(edge.x, edge.y, handleSize, handleSize);
    });
    
    // Draw rotation handle
    const rotationHandleDistance = Math.max(worldBounds.width, worldBounds.height) / 2 + 20 / canvasZoom;
    const rotationHandleX = worldBounds.x + worldBounds.width / 2 - handleOffset;
    const rotationHandleY = worldBounds.y - rotationHandleDistance - handleOffset;
    
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(rotationHandleX + handleOffset, rotationHandleY + handleOffset, handleSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw line connecting rotation handle to shape
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1 / canvasZoom;
    ctx.setLineDash([2 / canvasZoom, 2 / canvasZoom]);
    ctx.beginPath();
    ctx.moveTo(worldBounds.x + worldBounds.width / 2, worldBounds.y);
    ctx.lineTo(rotationHandleX + handleOffset, rotationHandleY + handleOffset);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.restore();
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    // Calculate bounds ONLY from actual shape geometry, excluding control handles
    if (this.points.length > 0) {
      const xs = this.points.map(p => p.x);
      const ys = this.points.map(p => p.y);
      
      // DO NOT include control points in bounding box - they are UI elements only
      
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    }
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  getWorldBounds(): { x: number; y: number; width: number; height: number } {
    if (this.points.length === 0) {
      return { x: this.transform.x, y: this.transform.y, width: 0, height: 0 };
    }

    // Transform all points to world space
    const worldPoints = this.points.map(p => {
      // Apply scale
      let x = p.x * this.transform.scaleX;
      let y = p.y * this.transform.scaleY;
      
      // Apply skew
      x += y * Math.tan(this.transform.skewX * Math.PI / 180);
      y += x * Math.tan(this.transform.skewY * Math.PI / 180);
      
      // Apply rotation
      const rotationRad = this.transform.rotation * Math.PI / 180;
      const cos = Math.cos(rotationRad);
      const sin = Math.sin(rotationRad);
      const rotatedX = x * cos - y * sin;
      const rotatedY = x * sin + y * cos;
      
      // Apply translation
      return {
        x: this.transform.x + rotatedX,
        y: this.transform.y + rotatedY
      };
    });

    const xs = worldPoints.map(p => p.x);
    const ys = worldPoints.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  containsPoint(x: number, y: number): boolean {
    // Transform the world point to local space using inverse transformation
    let localX = x - this.transform.x;
    let localY = y - this.transform.y;
    
    // Inverse rotation
    if (this.transform.rotation !== 0) {
      const cos = Math.cos(-this.transform.rotation * Math.PI / 180);
      const sin = Math.sin(-this.transform.rotation * Math.PI / 180);
      const rotatedX = localX * cos - localY * sin;
      const rotatedY = localX * sin + localY * cos;
      localX = rotatedX;
      localY = rotatedY;
    }
    
    // Inverse skew (approximate)
    if (this.transform.skewX !== 0) localX -= localY * Math.tan(this.transform.skewX);
    if (this.transform.skewY !== 0) localY -= localX * Math.tan(this.transform.skewY);
    
    // Inverse scale
    if (this.transform.scaleX !== 0) localX /= this.transform.scaleX;
    if (this.transform.scaleY !== 0) localY /= this.transform.scaleY;
    
    // Use pixel-perfect detection instead of bounding box
    return this.isPointInsideShape(localX, localY);
  }

  private isPointInsideShape(x: number, y: number): boolean {
    if (this.points.length === 0) return false;
    
    // For different shape types, use appropriate detection algorithms
    switch (this.type) {
      case 'circle':
      case 'ellipse':
        return this.isPointInEllipse(x, y);
      case 'polygon':
      case 'star':
      case 'ring':
        return this.isPointInPolygon(x, y);
      case 'rectangle':
        return this.isPointInRectangle(x, y);
      case 'line':
        return this.isPointOnLine(x, y);
      case 'blob':
        return this.isPointInPolygon(x, y); // Use polygon approximation for complex shapes
      default:
        return this.isPointInPolygon(x, y);
    }
  }

  private isPointInEllipse(x: number, y: number): boolean {
    if (!this.width || !this.height) return false;
    const cx = 0; // Center at origin in local space
    const cy = 0;
    const rx = this.width / 2;
    const ry = this.height / 2;
    
    const dx = x - cx;
    const dy = y - cy;
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
  }

  private isPointInRectangle(x: number, y: number): boolean {
    if (!this.width || !this.height) return false;
    return x >= -this.width / 2 && x <= this.width / 2 &&
           y >= -this.height / 2 && y <= this.height / 2;
  }

  private isPointOnLine(x: number, y: number, tolerance: number = 3): boolean {
    if (this.points.length < 2) return false;
    
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      
      const distance = this.distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
      if (distance <= tolerance) return true;
    }
    return false;
  }

  private isPointInPolygon(x: number, y: number): boolean {
    if (this.points.length < 3) return false;
    
    let inside = false;
    for (let i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
      const xi = this.points[i].x;
      const yi = this.points[i].y;
      const xj = this.points[j].x;
      const yj = this.points[j].y;
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  private distanceToLineSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  worldDeltaToLocal(worldDeltaX: number, worldDeltaY: number): Point {
    // Transform world space delta to local space delta
    let localDeltaX = worldDeltaX;
    let localDeltaY = worldDeltaY;
    
    // Inverse rotation
    if (this.transform.rotation !== 0) {
      const rotationRad = -this.transform.rotation * Math.PI / 180;
      const cos = Math.cos(rotationRad);
      const sin = Math.sin(rotationRad);
      const rotatedX = localDeltaX * cos - localDeltaY * sin;
      const rotatedY = localDeltaX * sin + localDeltaY * cos;
      localDeltaX = rotatedX;
      localDeltaY = rotatedY;
    }
    
    // Inverse scale
    if (this.transform.scaleX !== 0) localDeltaX /= this.transform.scaleX;
    if (this.transform.scaleY !== 0) localDeltaY /= this.transform.scaleY;
    
    return { x: localDeltaX, y: localDeltaY };
  }

  getPointAt(index: number): Point | null {
    if (!this.points || index < 0 || index >= this.points.length) return null;
    return { ...this.points[index] };
  }

  getWorldPoint(index: number): Point | null {
    const localPoint = this.getPointAt(index);
    if (!localPoint) return null;
    
    // Apply full transformation matrix: scale, rotation, skew, then translate
    const rotationRad = this.transform.rotation * Math.PI / 180;
    const cos = Math.cos(rotationRad);
    const sin = Math.sin(rotationRad);
    
    // Apply scale
    let x = localPoint.x * this.transform.scaleX;
    let y = localPoint.y * this.transform.scaleY;
    
    // Apply skew
    x += y * Math.tan(this.transform.skewX);
    y += x * Math.tan(this.transform.skewY);
    
    // Apply rotation
    const rotatedX = x * cos - y * sin;
    const rotatedY = x * sin + y * cos;
    
    // Apply translation
    return {
      x: this.transform.x + rotatedX,
      y: this.transform.y + rotatedY
    };
  }

  updateShapeFromPoints(): void {
    // Allow direct point manipulation for all shapes - no regeneration
    // This enables free-form deformation instead of scaling
    // The shape will render using the modified points directly
  }

  updatePoint(index: number, newPoint: Point): void {
    // Handle control points (offset by 1000)
    if (index >= 1000) {
      const controlIndex = index - 1000;
      if (!this.controlPoints || controlIndex < 0 || controlIndex >= this.controlPoints.length) return;
      this.controlPoints[controlIndex] = { ...newPoint };
      return;
    }
    
    // Handle regular points
    if (!this.points || index < 0 || index >= this.points.length) return;
    this.points[index] = { ...newPoint };
    
    // For geometric shapes, recalculate dimensions based on modified points
    this.updateShapeFromPoints();
  }

  updateWorldPoint(index: number, worldPoint: Point): void {
    // Handle control points (offset by 1000)
    if (index >= 1000) {
      const controlIndex = index - 1000;
      if (!this.controlPoints || controlIndex < 0 || controlIndex >= this.controlPoints.length) return;
      
      // Inverse transformation for control points
      let x = worldPoint.x - this.transform.x;
      let y = worldPoint.y - this.transform.y;
      
      // Inverse rotation
      const rotationRad = -this.transform.rotation * Math.PI / 180;
      const cos = Math.cos(rotationRad);
      const sin = Math.sin(rotationRad);
      const unrotatedX = x * cos - y * sin;
      const unrotatedY = x * sin + y * cos;
      
      x = unrotatedX;
      y = unrotatedY;
      
      // Inverse skew (approximate)
      x -= y * Math.tan(this.transform.skewX);
      y -= x * Math.tan(this.transform.skewY);
      
      // Inverse scale
      const localControl = {
        x: x / this.transform.scaleX,
        y: y / this.transform.scaleY
      };
      
      this.controlPoints[controlIndex] = localControl;
      return;
    }
    
    // Handle regular points
    // Inverse transformation: translate, then inverse rotate, skew, and scale
    let x = worldPoint.x - this.transform.x;
    let y = worldPoint.y - this.transform.y;
    
    // Inverse rotation
    const rotationRad = -this.transform.rotation * Math.PI / 180;
    const cos = Math.cos(rotationRad);
    const sin = Math.sin(rotationRad);
    const unrotatedX = x * cos - y * sin;
    const unrotatedY = x * sin + y * cos;
    
    x = unrotatedX;
    y = unrotatedY;
    
    // Inverse skew (approximate)
    x -= y * Math.tan(this.transform.skewX);
    y -= x * Math.tan(this.transform.skewY);
    
    // Inverse scale
    const localPoint = {
      x: x / this.transform.scaleX,
      y: y / this.transform.scaleY
    };
    
    this.updatePoint(index, localPoint);
  }

  getWorldControlPoint(index: number): Point | null {
    if (!this.controlPoints || index < 0 || index >= this.controlPoints.length) return null;
    
    const localControl = this.controlPoints[index];
    
    // Apply full transformation matrix: scale, rotation, skew, then translate
    const rotationRad = this.transform.rotation * Math.PI / 180;
    const cos = Math.cos(rotationRad);
    const sin = Math.sin(rotationRad);
    
    // Apply scale
    let x = localControl.x * this.transform.scaleX;
    let y = localControl.y * this.transform.scaleY;
    
    // Apply skew
    x += y * Math.tan(this.transform.skewX);
    y += x * Math.tan(this.transform.skewY);
    
    // Apply rotation
    const rotatedX = x * cos - y * sin;
    const rotatedY = x * sin + y * cos;
    
    // Apply translation
    return {
      x: this.transform.x + rotatedX,
      y: this.transform.y + rotatedY
    };
  }

  getWorldTangentHandle(index: number, type: 'in' | 'out'): Point | null {
    if (!this.tangentHandles || index < 0 || index >= this.tangentHandles.length) return null;
    
    const localHandle = type === 'in' ? this.tangentHandles[index].in : this.tangentHandles[index].out;
    
    // Apply full transformation matrix: scale, rotation, skew, then translate
    const rotationRad = this.transform.rotation * Math.PI / 180;
    const cos = Math.cos(rotationRad);
    const sin = Math.sin(rotationRad);
    
    // Apply scale
    let x = localHandle.x * this.transform.scaleX;
    let y = localHandle.y * this.transform.scaleY;
    
    // Apply skew
    x += y * Math.tan(this.transform.skewX);
    y += x * Math.tan(this.transform.skewY);
    
    // Apply rotation
    const rotatedX = x * cos - y * sin;
    const rotatedY = x * sin + y * cos;
    
    // Apply translation
    return {
      x: this.transform.x + rotatedX,
      y: this.transform.y + rotatedY
    };
  }

  isPointNear(worldX: number, worldY: number, pointIndex: number, threshold: number = 8): boolean {
    // Check regular points
    if (pointIndex < 1000) {
      const worldPoint = this.getWorldPoint(pointIndex);
      if (!worldPoint) return false;
      
      const dx = worldX - worldPoint.x;
      const dy = worldY - worldPoint.y;
      return Math.sqrt(dx * dx + dy * dy) <= threshold;
    }
    
    // Check control points (offset by 1000)
    const controlIndex = pointIndex - 1000;
    const worldControl = this.getWorldControlPoint(controlIndex);
    if (!worldControl) return false;
    
    const dx = worldX - worldControl.x;
    const dy = worldY - worldControl.y;
    return Math.sqrt(dx * dx + dy * dy) <= threshold;
  }

  isSegmentNear(worldX: number, worldY: number, segmentIndex: number, threshold: number = 5): boolean {
    if (!this.points || segmentIndex < 0 || segmentIndex >= this.points.length - 1) return false;
    
    const point1 = this.getWorldPoint(segmentIndex);
    const point2 = this.getWorldPoint(segmentIndex + 1);
    if (!point1 || !point2) return false;
    
    // Calculate distance from point to line segment
    const A = worldX - point1.x;
    const B = worldY - point1.y;
    const C = point2.x - point1.x;
    const D = point2.y - point1.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return false;
    
    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));
    
    const closestX = point1.x + param * C;
    const closestY = point1.y + param * D;
    
    const dx = worldX - closestX;
    const dy = worldY - closestY;
    return Math.sqrt(dx * dx + dy * dy) <= threshold;
  }

  renderPoints(ctx: CanvasRenderingContext2D, selectedPoints: number[] = [], selectedSegments: number[] = [], canvasZoom: number = 1): void {
    if (!this.points || this.points.length === 0) return;
    
    ctx.save();
    
    // Draw control handles for curve types
    if (this.type === 'cubic' && this.tangentHandles) {
      // Draw tangent handles for cubic curves
      this.tangentHandles.forEach((tangentHandle, index) => {
        const worldPoint = this.getWorldPoint(index);
        if (!worldPoint) return;
        
        // Transform tangent handles to world coordinates
        const worldHandleIn = this.getWorldTangentHandle(index, 'in');
        const worldHandleOut = this.getWorldTangentHandle(index, 'out');
        
        if (worldHandleIn) {
          // Draw tangent line for 'in' handle
          ctx.strokeStyle = '#9CA3AF';
          ctx.lineWidth = 1 / canvasZoom;
          ctx.setLineDash([3 / canvasZoom, 3 / canvasZoom]);
          ctx.beginPath();
          ctx.moveTo(worldPoint.x, worldPoint.y);
          ctx.lineTo(worldHandleIn.x, worldHandleIn.y);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Draw 'in' handle
          const radius = 4 / canvasZoom;
          const isInSelected = selectedPoints.includes(2000 + index * 2); // Tangent handles start at 2000
          ctx.fillStyle = isInSelected ? '#EF4444' : '#F59E0B';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1 / canvasZoom;
          
          ctx.beginPath();
          ctx.arc(worldHandleIn.x, worldHandleIn.y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        
        if (worldHandleOut) {
          // Draw tangent line for 'out' handle
          ctx.strokeStyle = '#9CA3AF';
          ctx.lineWidth = 1 / canvasZoom;
          ctx.setLineDash([3 / canvasZoom, 3 / canvasZoom]);
          ctx.beginPath();
          ctx.moveTo(worldPoint.x, worldPoint.y);
          ctx.lineTo(worldHandleOut.x, worldHandleOut.y);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Draw 'out' handle
          const radius = 4 / canvasZoom;
          const isOutSelected = selectedPoints.includes(2000 + index * 2 + 1); // Out handle is +1 from in handle
          ctx.fillStyle = isOutSelected ? '#EF4444' : '#F59E0B';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1 / canvasZoom;
          
          ctx.beginPath();
          ctx.arc(worldHandleOut.x, worldHandleOut.y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });
    } else if ((this.type === 'bezier' || this.renderType === 'bezier') && this.controlPoints) {
      // Draw control points for bezier curves
      this.controlPoints.forEach((controlPoint, index) => {
        const worldControl = this.getWorldControlPoint(index);
        const worldPoint = this.getWorldPoint(index);
        
        if (worldControl && worldPoint) {
          // Draw tangent line
          ctx.strokeStyle = '#9CA3AF';
          ctx.lineWidth = 1 / canvasZoom;
          ctx.setLineDash([3 / canvasZoom, 3 / canvasZoom]);
          ctx.beginPath();
          ctx.moveTo(worldPoint.x, worldPoint.y);
          ctx.lineTo(worldControl.x, worldControl.y);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Draw control handle
          const radius = 4 / canvasZoom;
          const isControlSelected = selectedPoints.includes(index + 1000);
          ctx.fillStyle = isControlSelected ? '#EF4444' : '#F59E0B';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1 / canvasZoom;
          
          ctx.beginPath();
          ctx.arc(worldControl.x, worldControl.y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });
    }
    
    // Draw all segment midpoints for visibility
    for (let i = 0; i < this.points.length - 1; i++) {
      const p1 = this.getWorldPoint(i);
      const p2 = this.getWorldPoint(i + 1);
      
      if (p1 && p2) {
        const isSelected = selectedSegments.includes(i);
        
        // Draw segment highlight with curve matching render type
        if (isSelected) {
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 4 / canvasZoom;
          ctx.beginPath();
          
          if (this.renderType === 'bezier' || this.renderType === 'cubic' || this.renderType === 'smooth') {
            // Draw curved segment using actual control points if available
            ctx.moveTo(p1.x, p1.y);
            
            if (this.controlPoints && i < this.controlPoints.length) {
              // Use actual control point for this segment
              const worldControl = this.getWorldControlPoint(i);
              if (worldControl) {
                ctx.quadraticCurveTo(worldControl.x, worldControl.y, p2.x, p2.y);
              } else {
                ctx.lineTo(p2.x, p2.y);
              }
            } else {
              // Generate smooth curve without explicit control points
              const prevPoint = i > 0 ? this.getWorldPoint(i - 1) : p1;
              const nextPoint = i + 2 < this.points.length ? this.getWorldPoint(i + 2) : p2;
              
              if (prevPoint && nextPoint) {
                const tension = 0.3;
                const controlX = p2.x + (nextPoint.x - prevPoint.x) * tension;
                const controlY = p2.y + (nextPoint.y - prevPoint.y) * tension;
                ctx.quadraticCurveTo(controlX, controlY, p2.x, p2.y);
              } else {
                ctx.lineTo(p2.x, p2.y);
              }
            }
          } else {
            // Draw straight line segment
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
          }
          ctx.stroke();
        }
        
        // Draw segment midpoint indicator
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const radius = (isSelected ? 6 : 4) / canvasZoom;
        
        ctx.fillStyle = isSelected ? '#10B981' : '#8B5CF6';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1 / canvasZoom;
        
        ctx.beginPath();
        ctx.rect(midX - radius/2, midY - radius/2, radius, radius);
        ctx.fill();
        ctx.stroke();
      }
    }
    
    // Draw points in world space for constant size
    this.points.forEach((point, index) => {
      const worldPoint = this.getWorldPoint(index);
      if (!worldPoint) return;
      
      const isSelected = selectedPoints.includes(index);
      const radius = (isSelected ? 8 : 6) / canvasZoom; // Constant size regardless of zoom
      
      ctx.fillStyle = isSelected ? '#EF4444' : '#3B82F6';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2 / canvasZoom; // Constant stroke width
      
      ctx.beginPath();
      ctx.arc(worldPoint.x, worldPoint.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    
    ctx.restore();
  }

  move(deltaX: number, deltaY: number): void {
    this.transform.x += deltaX;
    this.transform.y += deltaY;
  }

  scale(factor: number): void {
    this.transform.scaleX *= factor;
    this.transform.scaleY *= factor;
  }

  rotate(angle: number): void {
    this.transform.rotation += angle;
  }

  skew(skewX: number, skewY: number): void {
    this.transform.skewX += skewX;
    this.transform.skewY += skewY;
  }

  flip(horizontal: boolean): void {
    // Calculate the center of the actual point geometry
    const bounds = this.getBounds();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    if (horizontal) {
      // Horizontal flip: mirror points across vertical center line
      this.points.forEach(point => {
        point.x = centerX - (point.x - centerX);
      });
      if (this.controlPoints) {
        this.controlPoints.forEach(control => {
          control.x = centerX - (control.x - centerX);
        });
      }
    } else {
      // Vertical flip: mirror points across horizontal center line  
      this.points.forEach(point => {
        point.y = centerY - (point.y - centerY);
      });
      if (this.controlPoints) {
        this.controlPoints.forEach(control => {
          control.y = centerY - (control.y - centerY);
        });
      }
    }
  }

  // Method to regenerate shape points when properties change
  regenerateShapePoints(): void {
    switch (this.type) {
      case 'polygon':
        this.generatePolygonPoints();
        break;
      case 'star':
        this.generateStarPoints();
        break;
      case 'circle':
        this.generateCirclePoints();
        break;
      case 'ellipse':
        this.generateEllipsePoints();
        break;
      case 'rectangle':
      case 'square':
        this.generateRectanglePoints();
        break;
      case 'ring':
        this.generateRingPoints();
        break;
      // Line and curve types don't auto-regenerate to preserve user edits
    }
  }

  clone(): Shape {
    const cloned = new Shape(this.type, this.transform.x + 20, this.transform.y + 20);
    cloned.transform = { ...this.transform };
    cloned.properties = { ...this.properties };
    cloned.points = [...this.points];
    cloned.sides = this.sides;
    cloned.radius = this.radius;
    cloned.innerRadius = this.innerRadius;
    cloned.width = this.width;
    cloned.height = this.height;
    cloned.controlPoints = this.controlPoints ? [...this.controlPoints] : undefined;
    cloned.closed = this.closed;
    return cloned;
  }
}

export class ShapeGroupClass {
  id: string;
  shapes: Shape[];
  transform: Transform;
  selected: boolean;

  constructor(shapes: Shape[]) {
    this.id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.shapes = shapes;
    this.selected = false;
    
    // Calculate center point for group transform
    const bounds = this.getBounds();
    this.transform = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      skewX: 0,
      skewY: 0
    };
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    if (this.shapes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    
    this.shapes.forEach(shape => {
      const bounds = shape.getBounds();
      const shapeMinX = shape.transform.x + bounds.x;
      const shapeMaxX = shape.transform.x + bounds.x + bounds.width;
      const shapeMinY = shape.transform.y + bounds.y;
      const shapeMaxY = shape.transform.y + bounds.y + bounds.height;
      
      minX = Math.min(minX, shapeMinX);
      maxX = Math.max(maxX, shapeMaxX);
      minY = Math.min(minY, shapeMinY);
      maxY = Math.max(maxY, shapeMaxY);
    });
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    
    // Apply group transform
    ctx.translate(this.transform.x, this.transform.y);
    ctx.rotate(this.transform.rotation * Math.PI / 180);
    ctx.scale(this.transform.scaleX, this.transform.scaleY);
    ctx.transform(1, this.transform.skewX, this.transform.skewY, 1, 0, 0);
    ctx.translate(-this.transform.x, -this.transform.y);
    
    // Render all shapes
    this.shapes.forEach(shape => shape.render(ctx));
    
    // Draw group selection
    if (this.selected) {
      const bounds = this.getBounds();
      ctx.strokeStyle = '#7C3AED';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.setLineDash([]);
    }
    
    ctx.restore();
  }

  move(deltaX: number, deltaY: number): void {
    this.shapes.forEach(shape => shape.move(deltaX, deltaY));
    this.transform.x += deltaX;
    this.transform.y += deltaY;
  }

  scale(factor: number): void {
    const centerX = this.transform.x;
    const centerY = this.transform.y;
    
    this.shapes.forEach(shape => {
      const dx = shape.transform.x - centerX;
      const dy = shape.transform.y - centerY;
      shape.transform.x = centerX + dx * factor;
      shape.transform.y = centerY + dy * factor;
      shape.scale(factor);
    });
    
    this.transform.scaleX *= factor;
    this.transform.scaleY *= factor;
  }

  rotate(angle: number): void {
    const centerX = this.transform.x;
    const centerY = this.transform.y;
    const rad = angle * Math.PI / 180;
    
    this.shapes.forEach(shape => {
      const dx = shape.transform.x - centerX;
      const dy = shape.transform.y - centerY;
      const newX = dx * Math.cos(rad) - dy * Math.sin(rad);
      const newY = dx * Math.sin(rad) + dy * Math.cos(rad);
      shape.transform.x = centerX + newX;
      shape.transform.y = centerY + newY;
      shape.rotate(angle);
    });
    
    this.transform.rotation += angle;
  }

  skew(skewX: number, skewY: number): void {
    this.shapes.forEach(shape => shape.skew(skewX, skewY));
    this.transform.skewX += skewX;
    this.transform.skewY += skewY;
  }

  flip(horizontal: boolean): void {
    const centerX = this.transform.x;
    const centerY = this.transform.y;
    
    this.shapes.forEach(shape => {
      if (horizontal) {
        const dx = shape.transform.x - centerX;
        shape.transform.x = centerX - dx;
      } else {
        const dy = shape.transform.y - centerY;
        shape.transform.y = centerY - dy;
      }
      shape.flip(horizontal);
    });
    
    if (horizontal) {
      this.transform.scaleX *= -1;
    } else {
      this.transform.scaleY *= -1;
    }
  }

  containsPoint(x: number, y: number): boolean {
    const bounds = this.getBounds();
    return x >= bounds.x && x <= bounds.x + bounds.width &&
           y >= bounds.y && y <= bounds.y + bounds.height;
  }
}
