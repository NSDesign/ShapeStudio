import { BaseShape, ShapeType, Point, TangentHandle, Transform, ShapeProperties, ShapeGroup, BlendMode } from '../../client/src/lib/shapeTypes';

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
  tangentHandles?: TangentHandle[];
  smoothPoints?: boolean[];
  closed?: boolean;
  segments: number;
  renderType: 'polygon' | 'bezier' | 'cubic' | 'smooth' | 'roundRect';
  cornerRadius?: number;
  strokeCap?: 'round' | 'square' | 'butt';

  constructor(type: ShapeType, x: number = 0, y: number = 0, batchConfig?: any) {
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
    
    // Initialize properties based on whether batch config is provided
    if (batchConfig && batchConfig.propertiesEnabled) {
      // Use minimal properties that batch config will override
      this.properties = this.generateMinimalProperties();
    } else {
      // Use full random properties for non-batch creation
      this.properties = this.generateRandomProperties();
    }
    
    this.selected = false;
    this.points = [];
    
    // Set proper defaults before shape initialization
    this.segments = this.getDefaultSegments();
    this.renderType = this.getDefaultRenderType();
    
    this.generateShapeData(batchConfig);
  }
  
  /**
   * Regenerate points when segments change for circles and ellipses
   */
  regeneratePointsFromSegments(): void {
    if (this.type === 'circle' && this.radius) {
      this.points = [];
      for (let i = 0; i < this.segments; i++) {
        const angle = (i / this.segments) * Math.PI * 2;
        this.points.push({
          x: Math.cos(angle) * this.radius,
          y: Math.sin(angle) * this.radius
        });
      }
    } else if (this.type === 'ellipse' && this.width && this.height) {
      this.points = [];
      const w = this.width / 2;
      const h = this.height / 2;
      for (let i = 0; i < this.segments; i++) {
        const angle = (i / this.segments) * Math.PI * 2;
        this.points.push({
          x: Math.cos(angle) * w,
          y: Math.sin(angle) * h
        });
      }
    }
  }

  /**
   * Check if the shape's geometry has been manually edited
   */
  hasEditedGeometry(): boolean {
    if (this.points.length === 0) return false;
    
    // Generate expected points based on shape type and compare
    switch (this.type) {
      case 'circle':
        if (!this.radius || this.points.length !== this.segments) return true;
        for (let i = 0; i < this.segments; i++) {
          const angle = (i / this.segments) * Math.PI * 2;
          const expectedX = Math.cos(angle) * this.radius;
          const expectedY = Math.sin(angle) * this.radius;
          const tolerance = 0.1;
          if (Math.abs(this.points[i].x - expectedX) > tolerance || 
              Math.abs(this.points[i].y - expectedY) > tolerance) {
            return true;
          }
        }
        return false;
        
      case 'ellipse':
        if (!this.width || !this.height || this.points.length !== this.segments) return true;
        const w = this.width / 2;
        const h = this.height / 2;
        for (let i = 0; i < this.segments; i++) {
          const angle = (i / this.segments) * Math.PI * 2;
          const expectedX = Math.cos(angle) * w;
          const expectedY = Math.cos(angle) * h;
          const tolerance = 0.1;
          if (Math.abs(this.points[i].x - expectedX) > tolerance || 
              Math.abs(this.points[i].y - expectedY) > tolerance) {
            return true;
          }
        }
        return false;
        
      case 'rectangle':
      case 'square':
        if (!this.width || !this.height || this.points.length !== 4) return true;
        const expectedRect = [
          { x: -this.width / 2, y: -this.height / 2 },
          { x: this.width / 2, y: -this.height / 2 },
          { x: this.width / 2, y: this.height / 2 },
          { x: -this.width / 2, y: this.height / 2 }
        ];
        for (let i = 0; i < 4; i++) {
          const tolerance = 0.1;
          if (Math.abs(this.points[i].x - expectedRect[i].x) > tolerance || 
              Math.abs(this.points[i].y - expectedRect[i].y) > tolerance) {
            return true;
          }
        }
        return false;
        
      default:
        // For other shape types (line, bezier, blob, etc.), assume they are always "edited"
        return true;
    }
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
      case 'cubic':
        return 'cubic';
      case 'bezier':
        return 'bezier';
      case 'blob':
        return 'bezier';
      default:
        return 'polygon'; // Use polygon for geometric shapes
    }
  }

  private generateMinimalProperties(): ShapeProperties {
    // Minimal properties for batch configuration to override
    return {
      fillColor: 'transparent',
      fillOpacity: 0,
      strokeColor: 'transparent',
      strokeWidth: 0,
      strokeOpacity: 0,
      blendMode: 'source-over' as BlendMode,
      zIndex: Date.now(),
      blurRadius: 0,
      gradient: undefined
    };
  }

  private generateRandomProperties(): ShapeProperties {
    const hue = Math.random() * 360;
    const saturation = 50 + Math.random() * 50;
    const lightness = 40 + Math.random() * 40;
    
    // Determine fill/stroke combination (ensure at least one is visible)
    const fillChance = Math.random();
    const strokeChance = Math.random();
    
    let hasFill = fillChance > 0.3; // 70% chance for fill
    let hasStroke = strokeChance > 0.5; // 50% chance for stroke
    
    // Ensure at least one is visible
    if (!hasFill && !hasStroke) {
      if (Math.random() > 0.5) {
        hasFill = true;
      } else {
        hasStroke = true;
      }
    }
    
    // 50% chance for gradient fill (only if has fill)
    const useGradient = hasFill && Math.random() > 0.5;
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
    
    const fillColor = hasFill ? `hsl(${hue}, ${saturation}%, ${lightness}%)` : 'transparent';
    const strokeColor = hasStroke ? `hsl(${(hue + 30) % 360}, ${saturation}%, ${Math.max(20, lightness - 20)}%)` : 'transparent';
    
    console.log(`🏗️ [SHAPE CONSTRUCTOR] generateRandomProperties: fillColor="${fillColor}", strokeColor="${strokeColor}" (non-batch creation) - ID: ${this.id}`);
    
    return {
      fillColor: fillColor,
      fillOpacity: hasFill ? 0.7 + Math.random() * 0.3 : 0,
      strokeColor: strokeColor,
      strokeWidth: hasStroke ? 1 + Math.random() * 4 : 0,
      strokeOpacity: hasStroke ? 0.8 + Math.random() * 0.2 : 0,
      blendMode: 'source-over' as BlendMode,
      zIndex: Date.now(), // Use timestamp for proper ordering
      blurRadius: 0, // No blur by default in random generation
      gradient: hasFill ? gradient : undefined
    };
  }

  private generateShapeData(batchConfig?: any): void {
    // Helper function to get values from batch config or use defaults
    const getRange = (configRange: [number, number] | undefined, defaultMin: number, defaultMax: number): number => {
      if (batchConfig?.propertiesEnabled && batchConfig?.shapePropertiesEnabled && configRange) {
        // Batch config handles its own randomization in the width/height calculation functions
        // Don't add additional randomization here
        const [min, max] = configRange;
        return min + (max - min) / 2; // Use center value, randomization handled elsewhere
      }
      return defaultMin + Math.random() * (defaultMax - defaultMin);
    };
    
    const getWidthHeight = (): { width: number; height: number } => {
      // For batch configuration, width and height are already calculated with proper randomization scaling
      // Use the exact values passed in without additional randomization
      if (batchConfig?.propertiesEnabled && batchConfig?.shapePropertiesEnabled) {
        // Use default center values if ranges are not provided
        const width = batchConfig?.widthRange ? (batchConfig.widthRange[0] + batchConfig.widthRange[1]) / 2 : 100;
        const height = batchConfig?.heightRange ? (batchConfig.heightRange[0] + batchConfig.heightRange[1]) / 2 : 100;
        return { width, height };
      }
      // For non-batch creation, use random values
      const width = 40 + Math.random() * 110;
      const height = 30 + Math.random() * 90;
      return { width, height };
    };
    
    const getRadius = (defaultMin: number = 25, defaultMax: number = 75): number => {
      const { width } = getWidthHeight();
      return width / 2; // Use width to determine radius
    };
    
    const getSegmentCount = (defaultMin: number, defaultMax: number): number => {
      // Check if polygon properties are specifically enabled
      if (batchConfig?.propertiesEnabled && batchConfig?.polygonPropertiesEnabled && batchConfig?.segmentCountRange) {
        const [min, max] = batchConfig.segmentCountRange;
        return Math.floor(min + Math.random() * (max - min + 1));
      }
      // Fallback to scatter settings for polygon-specific properties
      // Check both edgeCountRange (UI naming) and pointCountRange (schema naming)
      if (batchConfig?.scatterSettings?.shapeSpecific?.polygon) {
        const polygonSettings = batchConfig.scatterSettings.shapeSpecific.polygon as any;
        
        // Check for fixed mode with either edgeCountValue or pointCountValue
        if (polygonSettings.edgeCountMode === 'fixed' && polygonSettings.edgeCountValue !== undefined) {
          return polygonSettings.edgeCountValue;
        } else if (polygonSettings.pointCountMode === 'fixed' && polygonSettings.pointCountValue !== undefined) {
          return polygonSettings.pointCountValue;
        }
        
        // Check for range mode with either edgeCountRange or pointCountRange
        if (polygonSettings.edgeCountRange) {
          const [min, max] = polygonSettings.edgeCountRange;
          return Math.floor(min + Math.random() * (max - min + 1));
        } else if (polygonSettings.pointCountRange) {
          const [min, max] = polygonSettings.pointCountRange;
          return Math.floor(min + Math.random() * (max - min + 1));
        }
      }
      return defaultMin + Math.floor(Math.random() * (defaultMax - defaultMin + 1));
    };
    
    const getPointCount = (defaultMin: number, defaultMax: number): number => {
      // Check if line properties are specifically enabled
      if (batchConfig?.propertiesEnabled && batchConfig?.linePropertiesEnabled && batchConfig?.pointCountRange) {
        const [min, max] = batchConfig.pointCountRange;
        return Math.floor(min + Math.random() * (max - min + 1));
      }
      // Fallback to scatter settings for line-specific properties
      if (batchConfig?.scatterSettings?.shapeSpecific?.line?.pointCountRange) {
        const [min, max] = batchConfig.scatterSettings.shapeSpecific.line.pointCountRange;
        return Math.floor(min + Math.random() * (max - min + 1));
      }
      return defaultMin + Math.floor(Math.random() * (defaultMax - defaultMin + 1));
    };
    
    const getSplinePointCount = (defaultMin: number, defaultMax: number): number => {
      // Check if spline properties are specifically enabled
      if (batchConfig?.propertiesEnabled && batchConfig?.splinePropertiesEnabled && batchConfig?.splinePointCountRange) {
        const [min, max] = batchConfig.splinePointCountRange;
        return Math.floor(min + Math.random() * (max - min + 1));
      }
      // Fallback to scatter settings for spline-specific properties
      if (batchConfig?.scatterSettings?.shapeSpecific?.['smooth-spline']?.pointCountRange || 
          batchConfig?.scatterSettings?.shapeSpecific?.bezier?.pointCountRange ||
          batchConfig?.scatterSettings?.shapeSpecific?.bezier?.pointCountRange) {
        const splineSettings = batchConfig.scatterSettings.shapeSpecific['smooth-spline'] || 
                              batchConfig.scatterSettings.shapeSpecific.bezier;
        if (splineSettings?.pointCountRange) {
          const [min, max] = splineSettings.pointCountRange;
          return Math.floor(min + Math.random() * (max - min + 1));
        }
      }
      return defaultMin + Math.floor(Math.random() * (defaultMax - defaultMin + 1));
    };

    switch (this.type) {
      case 'rectangle':
        const rectDims = getWidthHeight();
        this.width = rectDims.width;
        this.height = rectDims.height;
        // Standard rectangle - no rounded corners
        this.generateRectanglePoints(0);
        break;
      case 'rounded-rectangle':
        const roundedRectDims = getWidthHeight();
        this.width = roundedRectDims.width;
        this.height = roundedRectDims.height;
        // Apply corner radius from batch config or scatter settings if available
        let cornerRadius = 0;
        if (batchConfig?.propertiesEnabled && batchConfig?.shapePropertiesEnabled && batchConfig?.rectangleCornerRadiusRange) {
          const [minRadius, maxRadius] = batchConfig.rectangleCornerRadiusRange;
          cornerRadius = minRadius + Math.random() * (maxRadius - minRadius);
        } else if (batchConfig?.scatterSettings?.shapeSpecific?.['rounded-rectangle']) {
          const roundedRectSettings = batchConfig.scatterSettings.shapeSpecific['rounded-rectangle'];
          if (roundedRectSettings.cornerRadiusMode === 'fixed') {
            cornerRadius = roundedRectSettings.cornerRadiusValue || 5;
          } else {
            const [minRadius, maxRadius] = roundedRectSettings.cornerRadiusRange || [0, 10];
            cornerRadius = minRadius + Math.random() * (maxRadius - minRadius);
          }
        }
        this.generateRectanglePoints(cornerRadius);
        break;
      case 'square':
        const { width: squareSize } = getWidthHeight();
        this.width = squareSize;
        this.height = squareSize;
        // Standard square - no rounded corners
        this.generateRectanglePoints(0);
        break;
      case 'rounded-square':
        const { width: roundedSquareSize } = getWidthHeight();
        this.width = roundedSquareSize;
        this.height = roundedSquareSize;
        // Apply corner radius from batch config or scatter settings if available
        let squareCornerRadius = 0;
        if (batchConfig?.propertiesEnabled && batchConfig?.shapePropertiesEnabled && batchConfig?.rectangleCornerRadiusRange) {
          const [minRadius, maxRadius] = batchConfig.rectangleCornerRadiusRange;
          squareCornerRadius = minRadius + Math.random() * (maxRadius - minRadius);
        } else if (batchConfig?.scatterSettings?.shapeSpecific?.['rounded-square']) {
          const roundedSquareSettings = batchConfig.scatterSettings.shapeSpecific['rounded-square'];
          if (roundedSquareSettings.cornerRadiusMode === 'fixed') {
            squareCornerRadius = roundedSquareSettings.cornerRadiusValue || 5;
          } else {
            const [minRadius, maxRadius] = roundedSquareSettings.cornerRadiusRange || [0, 10];
            squareCornerRadius = minRadius + Math.random() * (maxRadius - minRadius);
          }
        }
        this.generateRectanglePoints(squareCornerRadius);
        break;
      case 'circle':
        this.radius = getRadius();
        // Apply segment count from shape-specific settings if available
        if (batchConfig?.scatterSettings?.shapeSpecific?.circle) {
          const circleSettings = batchConfig.scatterSettings.shapeSpecific.circle;
          if (circleSettings.segmentCountMode === 'fixed' && circleSettings.segmentCountValue !== undefined) {
            this.segments = circleSettings.segmentCountValue;
          } else if (circleSettings.segmentCountRange) {
            const [min, max] = circleSettings.segmentCountRange;
            this.segments = Math.floor(min + Math.random() * (max - min + 1));
          }
        }
        this.generateCirclePoints();
        break;
      case 'ellipse':
        const ellipseDims = getWidthHeight();
        this.width = ellipseDims.width;
        this.height = ellipseDims.height;
        // Apply segment count from shape-specific settings if available
        if (batchConfig?.scatterSettings?.shapeSpecific?.ellipse) {
          const ellipseSettings = batchConfig.scatterSettings.shapeSpecific.ellipse;
          if (ellipseSettings.segmentCountMode === 'fixed' && ellipseSettings.segmentCountValue !== undefined) {
            this.segments = ellipseSettings.segmentCountValue;
          } else if (ellipseSettings.segmentCountRange) {
            const [min, max] = ellipseSettings.segmentCountRange;
            this.segments = Math.floor(min + Math.random() * (max - min + 1));
          }
        }
        this.generateEllipsePoints();
        break;
      case 'triangle':
        this.radius = getRadius(30, 70);
        this.generateTrianglePoints();
        break;
      case 'right-triangle':
        const rightTriDims = getWidthHeight();
        this.width = rightTriDims.width;
        this.height = rightTriDims.height;
        this.generateRightTrianglePoints();
        break;
      case 'trapezoid':
        const trapDims = getWidthHeight();
        this.width = trapDims.width;
        this.height = trapDims.height;
        this.generateTrapezoidPoints();
        break;
      case 'pentagon':
        this.radius = getRadius(30, 70);
        this.generatePentagonPoints();
        break;
      case 'hexagon':
        this.radius = getRadius(30, 70);
        this.generateHexagonPoints();
        break;
      case 'rhombus':
        const rhombusDims = getWidthHeight();
        this.width = rhombusDims.width;
        this.height = rhombusDims.height;
        this.generateRhombusPoints();
        break;
      case 'parallelogram':
        const paraDims = getWidthHeight();
        this.width = paraDims.width;
        this.height = paraDims.height;
        this.generateParallelogramPoints();
        break;
      case 'kite':
        const kiteDims = getWidthHeight();
        this.width = kiteDims.width;
        this.height = kiteDims.height;
        this.generateKitePoints();
        break;
      case 'semicircle':
        this.radius = getRadius(30, 70);
        this.generateSemicirclePoints();
        break;
      case 'heart':
        const heartDims = getWidthHeight();
        this.width = heartDims.width;
        this.height = heartDims.height;
        this.generateHeartPoints();
        break;
      case 'arrow':
        const arrowDims = getWidthHeight();
        this.width = arrowDims.width;
        this.height = arrowDims.height;
        this.generateArrowPoints();
        break;
      case 'cross':
        const crossDims = getWidthHeight();
        this.width = crossDims.width;
        this.height = crossDims.height;
        this.generateCrossPoints();
        break;
      case 'polygon':
        this.sides = getSegmentCount(3, 12);
        this.radius = getRadius(30, 70);
        this.generatePolygonPoints();
        break;
      case 'star':
        this.sides = getSegmentCount(5, 12);
        this.radius = getRadius(30, 70);
        // Apply inner radius ratio from batch config or scatter settings if available
        let innerRadiusRatio = 0.3 + Math.random() * 0.4;
        if (batchConfig?.propertiesEnabled && batchConfig?.shapePropertiesEnabled && batchConfig?.starInnerRadiusRange) {
          const [minRatio, maxRatio] = batchConfig.starInnerRadiusRange;
          innerRadiusRatio = minRatio + Math.random() * (maxRatio - minRatio);
        } else if (batchConfig?.scatterSettings?.shapeSpecific?.star) {
          const starSettings = batchConfig.scatterSettings.shapeSpecific.star;
          if (starSettings.innerRadiusMode === 'fixed' && starSettings.innerRadiusValue !== undefined) {
            innerRadiusRatio = starSettings.innerRadiusValue;
          } else if (starSettings.innerRadiusRange) {
            const [minRatio, maxRatio] = starSettings.innerRadiusRange;
            innerRadiusRatio = minRatio + Math.random() * (maxRatio - minRatio);
          }
        }
        this.innerRadius = this.radius * innerRadiusRatio;
        this.generateStarPoints();
        break;
      case 'line':
        this.generateLinePoints(getPointCount(2, 8), batchConfig);
        break;
      case 'line-vector':
        this.generateLineVectorPoints(batchConfig);
        break;
      case 'cubic':
        this.generateCubicCurvePoints(batchConfig);
        break;
      case 'bezier':
        this.generateCurvePoints(getSplinePointCount(3, 6), batchConfig);
        break;
      case 'smooth-spline':
        this.generateSmoothSplinePoints(getSplinePointCount(3, 8), batchConfig);
        break;
      case 'chunk':
        this.generateChunkPoints();
        break;
      case 'blob':
        this.generateBlobPoints();
        break;
      case 'ring':
        this.radius = getRadius();
        // Apply inner radius ratio from batch config or shape-specific settings
        let ringInnerRadiusRatio = 0.4 + Math.random() * 0.4;
        if (batchConfig?.propertiesEnabled && batchConfig?.shapePropertiesEnabled && batchConfig?.ringInnerRadiusRange) {
          const [minRatio, maxRatio] = batchConfig.ringInnerRadiusRange;
          ringInnerRadiusRatio = minRatio + Math.random() * (maxRatio - minRatio);
        } else if (batchConfig?.scatterSettings?.shapeSpecific?.ring) {
          const ringSettings = batchConfig.scatterSettings.shapeSpecific.ring;
          if (ringSettings.innerRadiusMode === 'fixed' && ringSettings.innerRadiusValue !== undefined) {
            ringInnerRadiusRatio = ringSettings.innerRadiusValue;
          } else if (ringSettings.innerRadiusRange) {
            const [minRatio, maxRatio] = ringSettings.innerRadiusRange;
            ringInnerRadiusRatio = minRatio + Math.random() * (maxRatio - minRatio);
          }
        }
        this.innerRadius = this.radius * ringInnerRadiusRatio;
        this.generateRingPoints();
        break;
      case 'spline-circle':
        this.radius = getRadius();
        this.generateSplineCirclePoints();
        break;
      case 'spline-ellipse':
        const splineEllipseDims = getWidthHeight();
        this.width = splineEllipseDims.width;
        this.height = splineEllipseDims.height;
        this.generateSplineEllipsePoints();
        break;
      case 'spline-ring':
        this.radius = getRadius();
        // Apply inner radius ratio from batch config or shape-specific settings
        let splineRingInnerRadiusRatio = 0.4 + Math.random() * 0.4;
        if (batchConfig?.propertiesEnabled && batchConfig?.shapePropertiesEnabled && batchConfig?.ringInnerRadiusRange) {
          const [minRatio, maxRatio] = batchConfig.ringInnerRadiusRange;
          splineRingInnerRadiusRatio = minRatio + Math.random() * (maxRatio - minRatio);
        } else if (batchConfig?.scatterSettings?.shapeSpecific?.['spline-ring']) {
          const ringSettings = batchConfig.scatterSettings.shapeSpecific['spline-ring'];
          if (ringSettings.innerRadiusMode === 'fixed' && ringSettings.innerRadiusValue !== undefined) {
            splineRingInnerRadiusRatio = ringSettings.innerRadiusValue;
          } else if (ringSettings.innerRadiusRange) {
            const [minRatio, maxRatio] = ringSettings.innerRadiusRange;
            splineRingInnerRadiusRatio = minRatio + Math.random() * (maxRatio - minRatio);
          }
        }
        this.innerRadius = this.radius * splineRingInnerRadiusRatio;
        this.generateSplineRingPoints();
        break;
      default:
        // Fallback for unknown types
        console.warn(`Unknown shape type: ${this.type}`);
        this.generateCirclePoints();
    }
  }

  private generateRectanglePoints(cornerRadius?: number): void {
    const w = this.width! / 2;
    const h = this.height! / 2;
    const radius = cornerRadius || 0;
    
    // Store corner radius for native roundRect() rendering
    this.cornerRadius = radius;
    
    // Always generate basic corner points for bounds calculation
    this.points = [
      { x: -w, y: -h },  // Top-left
      { x: w, y: -h },   // Top-right
      { x: w, y: h },    // Bottom-right
      { x: -w, y: h }    // Bottom-left
    ];
    
    // Use roundRect rendering if radius is specified (drawRoundedRectangle will clamp it)
    if (radius > 0) {
      this.renderType = 'roundRect';
    } else {
      this.renderType = 'polygon';
    }
    this.closed = true;
  }

  private generateCirclePoints(): void {
    this.points = [];
    const radius = this.radius!;
    
    // Use consistent segment count for smooth circles and proper boolean operations
    const numPoints = this.segments;
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      this.points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
    }
    this.closed = true;
    this.renderType = 'smooth'; // Use smooth rendering for circles
  }

  private generateEllipsePoints(): void {
    const numPoints = this.segments; // Use consistent segment count
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
    this.renderType = 'smooth'; // Use smooth rendering for ellipses
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

  private generateLinePoints(numPoints?: number, batchConfig?: any): void {
    const pointCount = numPoints || 3 + Math.floor(Math.random() * 5);
    this.points = [];
    const spread = 100;
    
    for (let i = 0; i < pointCount; i++) {
      const t = i / (pointCount - 1);
      this.points.push({
        x: (t - 0.5) * spread + (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * spread
      });
    }
    
    this.closed = false;
    
    // Apply stroke cap settings from batch config if available
    if (batchConfig?.scatterSettings?.shapeSpecific?.line?.strokeCapProbabilities) {
      const caps = batchConfig.scatterSettings.shapeSpecific.line.strokeCapProbabilities;
      const total = caps.round + caps.square + caps.butt;
      const rand = Math.random() * total;
      
      if (rand < caps.round) {
        this.strokeCap = 'round';
      } else if (rand < caps.round + caps.square) {
        this.strokeCap = 'square';
      } else {
        this.strokeCap = 'butt';
      }
    } else {
      // Default random selection
      const capOptions: ('round' | 'square' | 'butt')[] = ['round', 'square', 'butt'];
      this.strokeCap = capOptions[Math.floor(Math.random() * capOptions.length)];
    }
  }

  private generateLineVectorPoints(batchConfig?: any): void {
    // Get direction, length, and centroid from batch config or use defaults
    let direction = Math.random() * 360; // Default random angle
    let length = 50 + Math.random() * 100; // Default random length
    let centroid = 0.5; // Default center point
    
    if (batchConfig?.scatterSettings?.shapeSpecific?.['line-vector']) {
      const settings = batchConfig.scatterSettings.shapeSpecific['line-vector'];
      
      // Handle direction based on mode
      if (settings.direction) {
        if (settings.direction.kind === 'fixed') {
          direction = settings.direction.value;
        } else if (settings.direction.kind === 'range') {
          direction = settings.direction.min + Math.random() * (settings.direction.max - settings.direction.min);
        } else if (settings.direction.kind === 'values') {
          if (settings.direction.selection === 'random') {
            direction = settings.direction.values[Math.floor(Math.random() * settings.direction.values.length)];
          } else {
            // cycle mode - use start index or 0
            const index = (settings.direction.startIndex || 0) % settings.direction.values.length;
            direction = settings.direction.values[index];
          }
        }
      }
      
      // Handle length based on mode
      if (settings.length) {
        if (settings.length.kind === 'fixed') {
          length = settings.length.value;
        } else if (settings.length.kind === 'range') {
          length = settings.length.min + Math.random() * (settings.length.max - settings.length.min);
        } else if (settings.length.kind === 'values') {
          if (settings.length.selection === 'random') {
            length = settings.length.values[Math.floor(Math.random() * settings.length.values.length)];
          } else {
            const index = (settings.length.startIndex || 0) % settings.length.values.length;
            length = settings.length.values[index];
          }
        }
      }
      
      // Handle centroid based on mode
      if (settings.centroid) {
        if (settings.centroid.kind === 'fixed') {
          centroid = settings.centroid.value;
        } else if (settings.centroid.kind === 'range') {
          centroid = settings.centroid.min + Math.random() * (settings.centroid.max - settings.centroid.min);
        } else if (settings.centroid.kind === 'values') {
          if (settings.centroid.selection === 'random') {
            centroid = settings.centroid.values[Math.floor(Math.random() * settings.centroid.values.length)];
          } else {
            const index = (settings.centroid.startIndex || 0) % settings.centroid.values.length;
            centroid = settings.centroid.values[index];
          }
        }
      }
      
      // Handle stroke cap
      if (settings.strokeCapProbabilities) {
        const caps = settings.strokeCapProbabilities;
        const total = caps.round + caps.square + caps.butt;
        const rand = Math.random() * total;
        
        if (rand < caps.round) {
          this.strokeCap = 'round';
        } else if (rand < caps.round + caps.square) {
          this.strokeCap = 'square';
        } else {
          this.strokeCap = 'butt';
        }
      }
    }
    
    // Convert direction to radians
    const angleRad = (direction * Math.PI) / 180;
    
    // Calculate start and end points based on centroid
    const startDist = -length * centroid;
    const endDist = length * (1 - centroid);
    
    this.points = [
      {
        x: Math.cos(angleRad) * startDist,
        y: Math.sin(angleRad) * startDist
      },
      {
        x: Math.cos(angleRad) * endDist,
        y: Math.sin(angleRad) * endDist
      }
    ];
    
    this.closed = false;
    
    // Set default stroke cap if not set
    if (!this.strokeCap) {
      const capOptions: ('round' | 'square' | 'butt')[] = ['round', 'square', 'butt'];
      this.strokeCap = capOptions[Math.floor(Math.random() * capOptions.length)];
    }
  }

  private generateCubicCurvePoints(batchConfig?: any): void {
    // Get configuration from batch settings
    let numPoints = 4 + Math.floor(Math.random() * 4); // 4-8 points default
    let curvature = 0.3 + Math.random() * 0.5; // 0.3-0.8 default
    let spread = 60 + Math.random() * 60; // 60-120 default
    let patternType = Math.floor(Math.random() * 3); // 0-2 pattern types
    let openProbability = 70; // Default 70% open
    
    if (batchConfig?.scatterSettings?.shapeSpecific?.cubic) {
      const cubicSettings = batchConfig.scatterSettings.shapeSpecific.cubic;
      
      if (cubicSettings.pointCountRange) {
        const [min, max] = cubicSettings.pointCountRange;
        numPoints = Math.floor(min + Math.random() * (max - min + 1));
      }
      
      if (cubicSettings.curvatureRange) {
        const [min, max] = cubicSettings.curvatureRange;
        curvature = min + Math.random() * (max - min);
      }
      
      if (cubicSettings.spreadRange) {
        const [min, max] = cubicSettings.spreadRange;
        spread = min + Math.random() * (max - min);
      }
      
      if (cubicSettings.patternType !== undefined) {
        patternType = cubicSettings.patternType;
      }
      
      if (cubicSettings.openProbability !== undefined) {
        openProbability = cubicSettings.openProbability;
      }
    }
    
    this.closed = Math.random() * 100 > openProbability;
    
    this.points = [];
    this.tangentHandles = [];
    
    // Generate points based on pattern type
    if (patternType === 0) {
      // Wave pattern
      for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        this.points.push({
          x: (t - 0.5) * spread * 2,
          y: Math.sin(t * Math.PI * 2) * spread
        });
      }
    } else if (patternType === 1) {
      // Spiral pattern
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 4;
        const radius = (i / numPoints) * spread;
        this.points.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        });
      }
    } else {
      // Random scatter pattern
      for (let i = 0; i < numPoints; i++) {
        this.points.push({
          x: (Math.random() - 0.5) * spread * 2,
          y: (Math.random() - 0.5) * spread * 2
        });
      }
    }
    
    // Generate tangent handles for smooth cubic curves
    this.createLinkedTangentHandles(curvature);
    
    this.renderType = 'cubic';
  }

  private generateCurvePoints(numPoints?: number, batchConfig?: any): void {
    const pointCount = numPoints || 4 + Math.floor(Math.random() * 4);
    this.points = [];
    this.controlPoints = [];
    
    // Use batch config settings for open/closed probability if available
    let openProbability = 50; // Default 50% open
    if (batchConfig?.scatterSettings?.shapeSpecific?.bezier?.openProbability !== undefined) {
      openProbability = batchConfig.scatterSettings.shapeSpecific.bezier.openProbability;
    }
    
    this.closed = Math.random() * 100 > openProbability;
    
    const baseRadius = 60 + Math.random() * 60;
    
    if (this.closed) {
      // Generate points in a circular pattern for closed curves
      for (let i = 0; i < pointCount; i++) {
        const angle = (i / pointCount) * Math.PI * 2;
        const radiusVar = 0.7 + Math.random() * 0.6;
        const radius = baseRadius * radiusVar;
        
        this.points.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        });
      }
      
      // Generate control points for smooth bezier curves
      for (let i = 0; i < pointCount; i++) {
        const current = this.points[i];
        const next = this.points[(i + 1) % pointCount];
        
        // First control point (near current point)
        const angle1 = Math.atan2(next.y - current.y, next.x - current.x) + (Math.random() - 0.5) * 0.5;
        const distance1 = Math.sqrt((next.x - current.x) ** 2 + (next.y - current.y) ** 2) * (0.2 + Math.random() * 0.2);
        this.controlPoints.push({
          x: current.x + Math.cos(angle1) * distance1,
          y: current.y + Math.sin(angle1) * distance1
        });
        
        // Second control point (near next point)
        const angle2 = Math.atan2(next.y - current.y, next.x - current.x) + (Math.random() - 0.5) * 0.5;
        const distance2 = Math.sqrt((next.x - current.x) ** 2 + (next.y - current.y) ** 2) * (0.2 + Math.random() * 0.2);
        this.controlPoints.push({
          x: next.x - Math.cos(angle2) * distance2,
          y: next.y - Math.sin(angle2) * distance2
        });
      }
    } else {
      // Generate points in a wave-like pattern for open curves
      const width = baseRadius * 2;
      for (let i = 0; i < pointCount; i++) {
        const t = i / (pointCount - 1);
        this.points.push({
          x: (t - 0.5) * width,
          y: Math.sin(t * Math.PI * 2) * baseRadius * 0.5
        });
      }
      
      // Generate control points for open curves
      for (let i = 0; i < pointCount - 1; i++) {
        const current = this.points[i];
        const next = this.points[i + 1];
        
        // First control point
        const angle1 = Math.atan2(next.y - current.y, next.x - current.x) + (Math.random() - 0.5) * 0.5;
        const distance1 = Math.sqrt((next.x - current.x) ** 2 + (next.y - current.y) ** 2) * (0.2 + Math.random() * 0.2);
        this.controlPoints.push({
          x: current.x + Math.cos(angle1) * distance1,
          y: current.y + Math.sin(angle1) * distance1
        });
        
        // Second control point
        const angle2 = Math.atan2(next.y - current.y, next.x - current.x) + (Math.random() - 0.5) * 0.5;
        const distance2 = Math.sqrt((next.x - current.x) ** 2 + (next.y - current.y) ** 2) * (0.2 + Math.random() * 0.2);
        this.controlPoints.push({
          x: next.x - Math.cos(angle2) * distance2,
          y: next.y - Math.sin(angle2) * distance2
        });
      }
    }
    
    // Apply stroke cap settings for open curves
    if (!this.closed) {
      if (batchConfig?.scatterSettings?.shapeSpecific?.bezier?.strokeCapProbabilities) {
        const caps = batchConfig.scatterSettings.shapeSpecific.bezier.strokeCapProbabilities;
        const total = caps.round + caps.square + caps.butt;
        const rand = Math.random() * total;
        
        if (rand < caps.round) {
          this.strokeCap = 'round';
        } else if (rand < caps.round + caps.square) {
          this.strokeCap = 'square';
        } else {
          this.strokeCap = 'butt';
        }
      } else {
        const capOptions: ('round' | 'square' | 'butt')[] = ['round', 'square', 'butt'];
        this.strokeCap = capOptions[Math.floor(Math.random() * capOptions.length)];
      }
    }
    
    this.renderType = 'bezier';
  }

  /**
   * Generate linked tangent handles that maintain C1 continuity for smooth curves
   */
  private createLinkedTangentHandles(curvatureFactor: number = 0.3): void {
    this.tangentHandles = [];
    this.smoothPoints = [];
    
    for (let i = 0; i < this.points.length; i++) {
      const current = this.points[i];
      const isFirst = i === 0;
      const isLast = i === this.points.length - 1;
      
      // Calculate tangent direction based on neighboring points
      let tangentVector: Point;
      
      if (isFirst && !this.closed) {
        // First point in open curve: tangent points towards next point
        const next = this.points[i + 1];
        tangentVector = this.normalizeVector({
          x: next.x - current.x,
          y: next.y - current.y
        });
      } else if (isLast && !this.closed) {
        // Last point in open curve: tangent points from previous point
        const prev = this.points[i - 1];
        tangentVector = this.normalizeVector({
          x: current.x - prev.x,
          y: current.y - prev.y
        });
      } else {
        // Middle points or closed curve: calculate smooth tangent
        const prevIndex = this.closed ? (i - 1 + this.points.length) % this.points.length : i - 1;
        const nextIndex = this.closed ? (i + 1) % this.points.length : i + 1;
        
        const prev = this.points[prevIndex];
        const next = this.points[nextIndex];
        
        // Calculate smooth tangent vector (average of normalized adjacent directions)
        const incomingVector = this.normalizeVector({
          x: current.x - prev.x,
          y: current.y - prev.y
        });
        const outgoingVector = this.normalizeVector({
          x: next.x - current.x,
          y: next.y - current.y
        });
        
        // Tangent is the normalized average of adjacent directions
        tangentVector = this.normalizeVector({
          x: (incomingVector.x + outgoingVector.x) / 2,
          y: (incomingVector.y + outgoingVector.y) / 2
        });
      }
      
      // Calculate handle length based on distance to adjacent points (30% of average)
      let handleLength = 25; // Default length
      
      const distances: number[] = [];
      if (!isFirst || this.closed) {
        const prevIndex = this.closed ? (i - 1 + this.points.length) % this.points.length : i - 1;
        const prev = this.points[prevIndex];
        distances.push(Math.sqrt(
          Math.pow(current.x - prev.x, 2) + Math.pow(current.y - prev.y, 2)
        ));
      }
      if (!isLast || this.closed) {
        const nextIndex = this.closed ? (i + 1) % this.points.length : i + 1;
        const next = this.points[nextIndex];
        distances.push(Math.sqrt(
          Math.pow(next.x - current.x, 2) + Math.pow(next.y - current.y, 2)
        ));
      }
      
      if (distances.length > 0) {
        const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
        handleLength = avgDistance * curvatureFactor;
      }
      
      // Create collinear handles that maintain C1 continuity
      this.tangentHandles.push({
        in: {
          x: current.x - tangentVector.x * handleLength,
          y: current.y - tangentVector.y * handleLength
        },
        out: {
          x: current.x + tangentVector.x * handleLength,
          y: current.y + tangentVector.y * handleLength
        },
        linked: true,  // Handles maintain collinearity
        smooth: true   // Point creates smooth continuity
      });
      
      // All points are smooth by default for mathematical continuity
      this.smoothPoints.push(true);
    }
  }

  /**
   * Normalize a vector to unit length
   */
  private normalizeVector(vector: Point): Point {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (length === 0) return { x: 0, y: 0 };
    return {
      x: vector.x / length,
      y: vector.y / length
    };
  }

  private generateSmoothSplinePoints(numPoints?: number, batchConfig?: any): void {
    const pointCount = numPoints || 4 + Math.floor(Math.random() * 6); // 4-10 points for variety
    this.points = [];
    this.controlPoints = [];
    
    // Get spline positioning ranges from batch config if available
    let pointPositionRange = [-50, 50]; // Default range for point positioning
    let controlPointRange = [-25, 25]; // Default range for control point positioning
    
    if (batchConfig?.propertiesEnabled && batchConfig?.splinePropertiesEnabled) {
      if (batchConfig?.splinePointPositionRange) {
        pointPositionRange = batchConfig.splinePointPositionRange;
      }
      if (batchConfig?.splineControlPointRange) {
        controlPointRange = batchConfig.splineControlPointRange;
      }
    } else if (batchConfig?.scatterSettings?.shapeSpecific?.['smooth-spline']) {
      if (batchConfig.scatterSettings.shapeSpecific['smooth-spline'].pointPositionRange) {
        pointPositionRange = batchConfig.scatterSettings.shapeSpecific['smooth-spline'].pointPositionRange;
      }
      if (batchConfig.scatterSettings.shapeSpecific['smooth-spline'].controlPointRange) {
        controlPointRange = batchConfig.scatterSettings.shapeSpecific['smooth-spline'].controlPointRange;
      }
    }
    
    const [minPointPos, maxPointPos] = pointPositionRange;
    const [minControlPos, maxControlPos] = controlPointRange;
    
    // Use batch config settings for open/closed probability if available
    let openProbability = 30; // Default 30% open (70% closed)
    if (batchConfig?.scatterSettings?.shapeSpecific?.['smooth-spline']?.openProbability !== undefined) {
      openProbability = batchConfig.scatterSettings.shapeSpecific['smooth-spline'].openProbability;
    }
    
    this.closed = Math.random() * 100 > openProbability;
    
    const baseRadius = 50 + Math.random() * 80;
    const variation = 0.4 + Math.random() * 0.4; // Control point variation
    
    if (this.closed) {
      // Generate points in a circular pattern for closed splines
      for (let i = 0; i < pointCount; i++) {
        const angle = (i / pointCount) * Math.PI * 2;
        const radiusVar = 0.7 + Math.random() * 0.6;
        const radius = baseRadius * radiusVar;
        
        // Apply point position variation from batch config
        const xVariation = minPointPos + Math.random() * (maxPointPos - minPointPos);
        const yVariation = minPointPos + Math.random() * (maxPointPos - minPointPos);
        
        this.points.push({
          x: Math.cos(angle) * radius + xVariation,
          y: Math.sin(angle) * radius + yVariation
        });
      }
    } else {
      // Generate points in a wave-like pattern for open splines
      const width = baseRadius * 2;
      for (let i = 0; i < pointCount; i++) {
        const t = i / (pointCount - 1);
        const baseX = (t - 0.5) * width;
        const baseY = Math.sin(t * Math.PI * 2) * baseRadius * (0.3 + Math.random() * 0.4);
        
        // Apply point position variation from batch config
        const xVariation = minPointPos + Math.random() * (maxPointPos - minPointPos);
        const yVariation = minPointPos + Math.random() * (maxPointPos - minPointPos);
        
        this.points.push({ 
          x: baseX + xVariation, 
          y: baseY + yVariation 
        });
      }
      
      // Apply stroke cap settings for open curves
      if (batchConfig?.scatterSettings?.shapeSpecific?.['smooth-spline']?.strokeCapProbabilities) {
        const caps = batchConfig.scatterSettings.shapeSpecific['smooth-spline'].strokeCapProbabilities;
        const total = caps.round + caps.square + caps.butt;
        const rand = Math.random() * total;
        
        if (rand < caps.round) {
          this.strokeCap = 'round';
        } else if (rand < caps.round + caps.square) {
          this.strokeCap = 'square';
        } else {
          this.strokeCap = 'butt';
        }
      } else {
        const capOptions: ('round' | 'square' | 'butt')[] = ['round', 'square', 'butt'];
        this.strokeCap = capOptions[Math.floor(Math.random() * capOptions.length)];
      }
    }
    
    // Generate smooth tangent handles for proper C1 continuity
    this.createLinkedTangentHandles(variation);
    
    this.renderType = 'smooth';
  }

  private generateChunkPoints(): void {
    const numPoints = 6 + Math.floor(Math.random() * 6);
    this.points = [];
    this.controlPoints = [];
    const baseRadius = 40 + Math.random() * 60;
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radiusVariation = 0.7 + Math.random() * 0.6;
      const radius = baseRadius * radiusVariation;
      
      this.points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
      
      // Generate control points for smooth blob curves positioned between points
      const nextAngle = ((i + 1) / numPoints) * Math.PI * 2;
      const nextRadius = baseRadius * (0.7 + Math.random() * 0.6);
      const nextX = Math.cos(nextAngle) * nextRadius;
      const nextY = Math.sin(nextAngle) * nextRadius;
      
      // Control point positioned between current and next point for smooth curves
      const controlX = (this.points[i].x + nextX) / 2 + (Math.random() - 0.5) * 20;
      const controlY = (this.points[i].y + nextY) / 2 + (Math.random() - 0.5) * 20;
      
      this.controlPoints.push({
        x: controlX,
        y: controlY
      });
    }
    
    this.closed = true;
    this.renderType = 'bezier';
  }

  private generateBlobPoints(): void {
    const numPoints = 6 + Math.floor(Math.random() * 4); // 6-10 points for smoother curves
    this.points = [];
    this.tangentHandles = [];
    const baseRadius = 50 + Math.random() * 50;
    
    // Generate points in a circular pattern with radius variation
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radiusVariation = 0.8 + Math.random() * 0.4; // Less variation for smoother shape
      const radius = baseRadius * radiusVariation;
      
      this.points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
    }
    
    // Generate tangent handles for bezier curves
    for (let i = 0; i < numPoints; i++) {
      const prevIndex = (i - 1 + numPoints) % numPoints;
      const nextIndex = (i + 1) % numPoints;
      
      const prev = this.points[prevIndex];
      const current = this.points[i];
      const next = this.points[nextIndex];
      
      // Calculate tangent direction based on neighboring points
      const tangentX = (next.x - prev.x) * 0.25; // Control handle length
      const tangentY = (next.y - prev.y) * 0.25;
      
      // Add some randomness to the tangent handles for organic variation
      const randomFactor = 0.3;
      const randomX = (Math.random() - 0.5) * randomFactor * Math.abs(tangentX);
      const randomY = (Math.random() - 0.5) * randomFactor * Math.abs(tangentY);
      
      this.tangentHandles.push({
        in: {
          x: current.x - tangentX + randomX,
          y: current.y - tangentY + randomY
        },
        out: {
          x: current.x + tangentX + randomX,
          y: current.y + tangentY + randomY
        },
        linked: true,
        smooth: true
      });
    }
    
    this.closed = true;
    this.renderType = 'bezier';
  }

  private generateTrianglePoints(): void {
    this.points = [];
    const height = this.radius! * Math.sin(Math.PI / 3); // Equilateral triangle height
    
    this.points.push({ x: 0, y: -this.radius! * 2/3 });
    this.points.push({ x: -this.radius! * Math.cos(Math.PI / 6), y: height - this.radius! * 2/3 });
    this.points.push({ x: this.radius! * Math.cos(Math.PI / 6), y: height - this.radius! * 2/3 });
    
    this.closed = true;
    this.renderType = 'polygon';
  }

  private generateRightTrianglePoints(): void {
    this.points = [];
    const w = this.width! / 2;
    const h = this.height! / 2;
    
    this.points.push({ x: -w, y: -h });
    this.points.push({ x: w, y: h });
    this.points.push({ x: -w, y: h });
    
    this.closed = true;
    this.renderType = 'polygon';
  }

  private generateTrapezoidPoints(): void {
    this.points = [];
    const w = this.width! / 2;
    const h = this.height! / 2;
    const topWidth = w * 0.6; // Top is 60% of bottom width
    
    this.points.push({ x: -topWidth, y: -h });
    this.points.push({ x: topWidth, y: -h });
    this.points.push({ x: w, y: h });
    this.points.push({ x: -w, y: h });
    
    this.closed = true;
    this.renderType = 'polygon';
  }

  private generatePentagonPoints(): void {
    this.points = [];
    const sides = 5;
    
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      this.points.push({
        x: Math.cos(angle) * this.radius!,
        y: Math.sin(angle) * this.radius!
      });
    }
    
    this.closed = true;
    this.renderType = 'polygon';
  }

  private generateHexagonPoints(): void {
    this.points = [];
    const sides = 6;
    
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      this.points.push({
        x: Math.cos(angle) * this.radius!,
        y: Math.sin(angle) * this.radius!
      });
    }
    
    this.closed = true;
    this.renderType = 'polygon';
  }

  private generateRhombusPoints(): void {
    this.points = [];
    const w = this.width! / 2;
    const h = this.height! / 2;
    
    this.points.push({ x: 0, y: -h });
    this.points.push({ x: w, y: 0 });
    this.points.push({ x: 0, y: h });
    this.points.push({ x: -w, y: 0 });
    
    this.closed = true;
    this.renderType = 'polygon';
  }

  private generateParallelogramPoints(): void {
    this.points = [];
    const w = this.width! / 2;
    const h = this.height! / 2;
    const skew = w * 0.3; // 30% skew
    
    this.points.push({ x: -w + skew, y: -h });
    this.points.push({ x: w + skew, y: -h });
    this.points.push({ x: w - skew, y: h });
    this.points.push({ x: -w - skew, y: h });
    
    this.closed = true;
    this.renderType = 'polygon';
  }

  private generateKitePoints(): void {
    this.points = [];
    const w = this.width! / 2;
    const h = this.height! / 2;
    
    this.points.push({ x: 0, y: -h });
    this.points.push({ x: w * 0.6, y: -h * 0.3 });
    this.points.push({ x: 0, y: h });
    this.points.push({ x: -w * 0.6, y: -h * 0.3 });
    
    this.closed = true;
    this.renderType = 'polygon';
  }

  private generateSemicirclePoints(): void {
    this.points = [];
    const segments = 16;
    
    // Generate semicircle arc
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI;
      this.points.push({
        x: Math.cos(angle) * this.radius!,
        y: Math.sin(angle) * this.radius!
      });
    }
    
    this.closed = true;
    this.renderType = 'polygon';
  }

  private generateHeartPoints(): void {
    this.points = [];
    const segments = 32;
    const scale = this.width! / 100; // Scale factor
    
    for (let i = 0; i < segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
      
      this.points.push({
        x: x * scale,
        y: y * scale
      });
    }
    
    this.closed = true;
    this.renderType = 'polygon';
  }

  private generateArrowPoints(): void {
    this.points = [];
    const w = this.width! / 2;
    const h = this.height! / 2;
    const headWidth = w * 0.6;
    const shaftWidth = h * 0.4;
    
    this.points.push({ x: w, y: 0 }); // Arrow tip
    this.points.push({ x: w * 0.3, y: -headWidth });
    this.points.push({ x: w * 0.3, y: -shaftWidth });
    this.points.push({ x: -w, y: -shaftWidth });
    this.points.push({ x: -w, y: shaftWidth });
    this.points.push({ x: w * 0.3, y: shaftWidth });
    this.points.push({ x: w * 0.3, y: headWidth });
    
    this.closed = true;
    this.renderType = 'polygon';
  }

  private generateCrossPoints(): void {
    this.points = [];
    const w = this.width! / 2;
    const h = this.height! / 2;
    const thickness = Math.min(w, h) * 0.4;
    
    // Cross shape with 12 points
    this.points.push({ x: -thickness, y: -h });
    this.points.push({ x: thickness, y: -h });
    this.points.push({ x: thickness, y: -thickness });
    this.points.push({ x: w, y: -thickness });
    this.points.push({ x: w, y: thickness });
    this.points.push({ x: thickness, y: thickness });
    this.points.push({ x: thickness, y: h });
    this.points.push({ x: -thickness, y: h });
    this.points.push({ x: -thickness, y: thickness });
    this.points.push({ x: -w, y: thickness });
    this.points.push({ x: -w, y: -thickness });
    this.points.push({ x: -thickness, y: -thickness });
    
    this.closed = true;
    this.renderType = 'polygon';
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

  private generateSplineCirclePoints(): void {
    const radius = this.radius!;
    // Four-segment Bézier circle approximation
    // Control point distance for accurate circle approximation
    const kappa = 0.5522848; // (4/3) * tan(π/8) - magic number for Bézier circle
    const cp = kappa * radius; // Control point distance from anchor points
    
    // Four anchor points (cardinal directions)
    this.points = [
      { x: radius, y: 0 },     // Right
      { x: 0, y: -radius },    // Top
      { x: -radius, y: 0 },    // Left  
      { x: 0, y: radius }      // Bottom
    ];
    
    // Four segments with control points for smooth Bézier curves
    this.controlPoints = [
      { x: radius, y: -cp },   // First control point for segment 0→1
      { x: cp, y: -radius },   // Second control point for segment 0→1
      { x: -cp, y: -radius },  // First control point for segment 1→2
      { x: -radius, y: -cp },  // Second control point for segment 1→2
      { x: -radius, y: cp },   // First control point for segment 2→3
      { x: -cp, y: radius },   // Second control point for segment 2→3
      { x: cp, y: radius },    // First control point for segment 3→0
      { x: radius, y: cp }     // Second control point for segment 3→0
    ];
    
    this.closed = true;
    this.renderType = 'bezier';
    this.segments = 4; // Four Bézier segments
  }

  private generateSplineEllipsePoints(): void {
    const w = this.width! / 2;
    const h = this.height! / 2;
    // Control point distances for ellipse approximation
    const kappaX = 0.5522848 * w;
    const kappaY = 0.5522848 * h;
    
    // Four anchor points
    this.points = [
      { x: w, y: 0 },      // Right
      { x: 0, y: -h },     // Top
      { x: -w, y: 0 },     // Left
      { x: 0, y: h }       // Bottom
    ];
    
    // Control points for ellipse segments
    this.controlPoints = [
      { x: w, y: -kappaY },     // First control point for segment 0→1
      { x: kappaX, y: -h },     // Second control point for segment 0→1
      { x: -kappaX, y: -h },    // First control point for segment 1→2
      { x: -w, y: -kappaY },    // Second control point for segment 1→2
      { x: -w, y: kappaY },     // First control point for segment 2→3
      { x: -kappaX, y: h },     // Second control point for segment 2→3
      { x: kappaX, y: h },      // First control point for segment 3→0
      { x: w, y: kappaY }       // Second control point for segment 3→0
    ];
    
    this.closed = true;
    this.renderType = 'bezier';
    this.segments = 4;
  }

  private generateSplineRingPoints(): void {
    const outerRadius = this.radius!;
    const innerRadius = this.innerRadius!;
    const outerKappa = 0.5522848 * outerRadius;
    const innerKappa = 0.5522848 * innerRadius;
    
    // Outer circle points (4 segments)
    this.points = [
      { x: outerRadius, y: 0 },     // Outer right
      { x: 0, y: -outerRadius },    // Outer top
      { x: -outerRadius, y: 0 },    // Outer left
      { x: 0, y: outerRadius },     // Outer bottom
      // Inner circle points (reverse order for proper winding)
      { x: 0, y: innerRadius },     // Inner bottom
      { x: -innerRadius, y: 0 },    // Inner left
      { x: 0, y: -innerRadius },    // Inner top
      { x: innerRadius, y: 0 }      // Inner right
    ];
    
    // Control points for both outer and inner circles
    this.controlPoints = [
      // Outer circle control points
      { x: outerRadius, y: -outerKappa },
      { x: outerKappa, y: -outerRadius },
      { x: -outerKappa, y: -outerRadius },
      { x: -outerRadius, y: -outerKappa },
      { x: -outerRadius, y: outerKappa },
      { x: -outerKappa, y: outerRadius },
      { x: outerKappa, y: outerRadius },
      { x: outerRadius, y: outerKappa },
      // Inner circle control points (reverse order)
      { x: -innerKappa, y: innerRadius },
      { x: -innerRadius, y: innerKappa },
      { x: -innerRadius, y: -innerKappa },
      { x: -innerKappa, y: -innerRadius },
      { x: innerKappa, y: -innerRadius },
      { x: innerRadius, y: -innerKappa },
      { x: innerRadius, y: innerKappa },
      { x: innerKappa, y: innerRadius }
    ];
    
    this.closed = true;
    this.renderType = 'bezier';
    this.segments = 8; // Four segments for outer + four for inner
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    if (this.points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    // Calculate bounds ONLY from actual shape points, not control handles
    const xs = this.points.map(p => p.x);
    const ys = this.points.map(p => p.y);
    
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
    
    // Check if points have been manually edited by comparing with original geometry
    const hasEditedPoints = this.hasEditedGeometry();
    
    // For shapes with edited points, always use point-based detection
    if (hasEditedPoints) {
      if (this.type === 'line') {
        return this.isPointOnLine(x, y);
      } else {
        return this.isPointInPolygon(x, y);
      }
    }
    
    // For unedited shapes, use optimized detection algorithms
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
      case 'line-vector':
        return this.isPointOnLine(x, y); // Use same hit detection as regular line
      case 'blob':
        return this.isPointInPolygon(x, y);
      default:
        return this.isPointInPolygon(x, y);
    }
  }

  private isPointInEllipse(x: number, y: number): boolean {
    // For circles, use radius; for ellipses, use width/height
    if (this.type === 'circle') {
      if (!this.radius) return false;
      const distance = Math.sqrt(x * x + y * y);
      return distance <= this.radius;
    } else {
      // Ellipse case
      if (!this.width || !this.height) return false;
      const cx = 0; // Center at origin in local space
      const cy = 0;
      const rx = this.width / 2;
      const ry = this.height / 2;
      
      const dx = x - cx;
      const dy = y - cy;
      return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
    }
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
