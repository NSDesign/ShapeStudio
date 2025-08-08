import { BaseShape, ShapeType, Point, TangentHandle, Transform, ShapeProperties, ShapeGroup, BlendMode } from './shapeTypes';

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
          const expectedY = Math.sin(angle) * h;
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
      if (batchConfig?.scatterSettings?.shapeSpecific?.polygon?.segmentCountRange) {
        const [min, max] = batchConfig.scatterSettings.shapeSpecific.polygon.segmentCountRange;
        return Math.floor(min + Math.random() * (max - min + 1));
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
        this.generateCirclePoints();
        break;
      case 'ellipse':
        const ellipseDims = getWidthHeight();
        this.width = ellipseDims.width;
        this.height = ellipseDims.height;
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
        // Apply inner radius ratio from batch config if available
        let innerRadiusRatio = 0.3 + Math.random() * 0.4;
        if (batchConfig?.propertiesEnabled && batchConfig?.shapePropertiesEnabled && batchConfig?.starInnerRadiusRange) {
          const [minRatio, maxRatio] = batchConfig.starInnerRadiusRange;
          innerRadiusRatio = minRatio + Math.random() * (maxRatio - minRatio);
        }
        this.innerRadius = this.radius * innerRadiusRatio;
        this.generateStarPoints();
        break;
      case 'line':
        this.generateLinePoints(getPointCount(2, 8), batchConfig);
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
        this.radius = getRadius(30, 70);
        // Apply inner radius ratio from batch config if available
        let ringInnerRadiusRatio = 0.4 + Math.random() * 0.4;
        if (batchConfig?.propertiesEnabled && batchConfig?.shapePropertiesEnabled && batchConfig?.ringInnerRadiusRange) {
          const [minRatio, maxRatio] = batchConfig.ringInnerRadiusRange;
          ringInnerRadiusRatio = minRatio + Math.random() * (maxRatio - minRatio);
        }
        this.innerRadius = this.radius * ringInnerRadiusRatio;
        this.generateRingPoints();
        break;
      case 'spline-circle':
        this.radius = getRadius(25, 75);
        this.generateSplineCirclePoints();
        break;
      case 'spline-ellipse':
        const splineEllipseDims = getWidthHeight();
        this.width = splineEllipseDims.width;
        this.height = splineEllipseDims.height;
        this.generateSplineEllipsePoints();
        break;
      case 'spline-ring':
        this.radius = getRadius(30, 70);
        // Apply inner radius ratio from batch config if available (same as ring)
        let splineRingInnerRadiusRatio = 0.4 + Math.random() * 0.4;
        if (batchConfig?.propertiesEnabled && batchConfig?.shapePropertiesEnabled && batchConfig?.ringInnerRadiusRange) {
          const [minRatio, maxRatio] = batchConfig.ringInnerRadiusRange;
          splineRingInnerRadiusRatio = minRatio + Math.random() * (maxRatio - minRatio);
        }
        this.innerRadius = this.radius * splineRingInnerRadiusRatio;
        this.generateSplineRingPoints();
        break;

    }
  }

  private generateLinePoints(numPoints?: number, batchConfig?: any): void {
    const pointCount = numPoints || 2 + Math.floor(Math.random() * 6);
    this.points = [];
    
    // Get point position range from batch config if available
    let positionRange = [-50, 50]; // Default range
    if (batchConfig?.propertiesEnabled && batchConfig?.linePropertiesEnabled && batchConfig?.pointPositionRange) {
      positionRange = batchConfig.pointPositionRange;
    } else if (batchConfig?.scatterSettings?.shapeSpecific?.line?.pointPositionRange) {
      positionRange = batchConfig.scatterSettings.shapeSpecific.line.pointPositionRange;
    }
    
    const [minPos, maxPos] = positionRange;
    const baseSpacing = 40; // Base spacing between points
    
    for (let i = 0; i < pointCount; i++) {
      // Calculate position with controlled variation
      const xVariation = minPos + Math.random() * (maxPos - minPos);
      const yVariation = minPos + Math.random() * (maxPos - minPos);
      
      this.points.push({
        x: i * baseSpacing + xVariation,
        y: yVariation
      });
    }
  }

  private generateCurvePoints(numPoints?: number, batchConfig?: any): void {
    const pointCount = numPoints || 3 + Math.floor(Math.random() * 5); // 3-7 points for variable complexity
    this.points = [];
    this.controlPoints = [];
    this.tangentHandles = [];
    this.smoothPoints = [];
    
    // Get spline positioning ranges from batch config if available
    let pointPositionRange = [-30, 30]; // Reduced default range for better control
    
    if (batchConfig?.propertiesEnabled && batchConfig?.splinePropertiesEnabled) {
      if (batchConfig?.splinePointPositionRange) {
        pointPositionRange = batchConfig.splinePointPositionRange;
      }
    } else if (batchConfig?.scatterSettings?.shapeSpecific) {
      // Fallback to scatter settings for spline-specific properties
      const splineSettings = batchConfig.scatterSettings.shapeSpecific['smooth-spline'] || 
                            batchConfig.scatterSettings.shapeSpecific.bezier;
      if (splineSettings?.pointPositionRange) {
        pointPositionRange = splineSettings.pointPositionRange;
      }
    }
    
    const [minPointPos, maxPointPos] = pointPositionRange;
    
    if (this.type === 'bezier') {
      // Generate Bézier curve with proper tangent handle continuity
      const width = 120;
      const height = 60;
      
      // Generate base points along a smooth path
      for (let i = 0; i < pointCount; i++) {
        const t = i / (pointCount - 1);
        const baseX = (t - 0.5) * width;
        const baseY = Math.sin(t * Math.PI * 1.5) * height / 4; // Gentle wave
        
        // Apply controlled point position variation
        const xVariation = (Math.random() - 0.5) * (maxPointPos - minPointPos) * 0.5;
        const yVariation = (Math.random() - 0.5) * (maxPointPos - minPointPos) * 0.5;
        
        this.points.push({ 
          x: baseX + xVariation, 
          y: baseY + yVariation 
        });
      }
      
      // Generate mathematically continuous tangent handles
      this.generateSmoothTangentHandles();
    }
    
    // Use batch config settings for open/closed probability if available
    let openProbability = 70; // Default 70% open for better curve display
    if (batchConfig?.scatterSettings?.shapeSpecific?.[this.type]?.openProbability !== undefined) {
      openProbability = batchConfig.scatterSettings.shapeSpecific[this.type].openProbability;
    }
    
    this.closed = Math.random() * 100 > openProbability;
    this.renderType = 'bezier';
  }

  private generateCubicCurvePoints(batchConfig?: any): void {
    // Generate multiple connected cubic curves with smooth interpolation
    this.points = [];
    this.controlPoints = [];
    this.tangentHandles = [];
    this.smoothPoints = [];

    // Get point count from batch config or use default range
    let pointCount = 3;
    if (batchConfig?.scatterSettings?.shapeSpecific?.cubic?.pointCountRange) {
      const [min, max] = batchConfig.scatterSettings.shapeSpecific.cubic.pointCountRange;
      pointCount = Math.floor(min + Math.random() * (max - min + 1));
    } else {
      pointCount = 3 + Math.floor(Math.random() * 4); // 3-6 points
    }

    // Ensure minimum of 3 points for proper cubic curves
    pointCount = Math.max(3, pointCount);

    // Generate main curve points with natural distribution
    const baseRadius = 60;
    const centerX = 0;
    const centerY = 0;
    
    // Create organic point distribution
    for (let i = 0; i < pointCount; i++) {
      const angle = (i / (pointCount - 1)) * Math.PI * 1.5 - Math.PI * 0.75; // Spread across 270 degrees
      const radiusVariation = 0.3 + Math.random() * 0.4; // 0.3 to 0.7 multiplier
      const radius = baseRadius * radiusVariation;
      
      const baseX = centerX + Math.cos(angle) * radius;
      const baseY = centerY + Math.sin(angle) * radius;
      
      // Add organic positional variation
      const maxPointPos = Math.max(Math.abs(baseX), Math.abs(baseY));
      const minPointPos = Math.min(Math.abs(baseX), Math.abs(baseY));
      const xVariation = (Math.random() - 0.5) * (maxPointPos - minPointPos) * 0.3;
      const yVariation = (Math.random() - 0.5) * (maxPointPos - minPointPos) * 0.3;
      
      this.points.push({ 
        x: baseX + xVariation, 
        y: baseY + yVariation 
      });
    }
    
    // Generate smooth tangent handles using the same approach as Bézier curves
    this.generateSmoothTangentHandles();

    // Use batch config settings for open/closed probability if available
    let openProbability = 90; // Default 90% open for better curve display
    if (batchConfig?.scatterSettings?.shapeSpecific?.[this.type]?.openProbability !== undefined) {
      openProbability = batchConfig.scatterSettings.shapeSpecific[this.type].openProbability;
    }
    
    this.closed = Math.random() * 100 > openProbability;
    this.renderType = 'cubic';
  }

  /**
   * Generate mathematically smooth tangent handles that maintain C1 continuity
   * This ensures smooth curves without breaks or sharp angles between segments
   */
  private generateSmoothTangentHandles(): void {
    if (!this.points || this.points.length < 2) return;
    
    this.tangentHandles = [];
    this.smoothPoints = [];
    
    for (let i = 0; i < this.points.length; i++) {
      const current = this.points[i];
      const isFirst = i === 0;
      const isLast = i === this.points.length - 1;
      
      let tangentVector: Point = { x: 0, y: 0 };
      
      if (isFirst && !this.closed) {
        // First point: tangent points toward next point
        const next = this.points[i + 1];
        tangentVector = this.normalizeVector({
          x: next.x - current.x,
          y: next.y - current.y
        });
      } else if (isLast && !this.closed) {
        // Last point: tangent points from previous point
        const prev = this.points[i - 1];
        tangentVector = this.normalizeVector({
          x: current.x - prev.x,
          y: current.y - prev.y
        });
      } else {
        // Middle points or closed curve: tangent bisects adjacent segments
        const prevIndex = this.closed ? (i - 1 + this.points.length) % this.points.length : Math.max(0, i - 1);
        const nextIndex = this.closed ? (i + 1) % this.points.length : Math.min(this.points.length - 1, i + 1);
        
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
        handleLength = avgDistance * 0.3; // 30% of average adjacent segment length
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

  private generateRectanglePoints(cornerRadius?: number): void {
    const w = this.width! / 2;
    const h = this.height! / 2;
    const radius = cornerRadius || 0;
    
    // Store corner radius for native roundRect() rendering
    this.cornerRadius = radius;
    
    if (radius > 0 && radius < Math.min(w, h)) {
      // For rounded rectangles, we'll use native roundRect() in drawing
      // But still generate basic corner points for bounds calculation
      this.points = [
        { x: -w, y: -h },  // Top-left
        { x: w, y: -h },   // Top-right
        { x: w, y: h },    // Bottom-right
        { x: -w, y: h }    // Bottom-left
      ];
      this.renderType = 'roundRect';
    } else {
      // Standard rectangle
      this.points = [
        { x: -w, y: -h },  // Top-left
        { x: w, y: -h },   // Top-right
        { x: w, y: h },    // Bottom-right
        { x: -w, y: h }    // Bottom-left
      ];
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
    }
    
    // Generate mathematically continuous tangent handles for smooth splines
    this.generateSmoothTangentHandles();
    this.renderType = 'bezier'; // Use bezier rendering for smooth curves
    this.segments = this.closed ? pointCount : pointCount - 1;
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
    
    // Check if blur should be applied
    if (this.properties.blurRadius > 0) {
      this.renderWithCanvasBlur(ctx);
    } else {
      // Draw shape normally
      this.drawShape(ctx);
    }
    
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

  private renderWithCanvasBlur(ctx: CanvasRenderingContext2D): void {
    // Get the bounds of the shape for blur calculation
    const bounds = this.getBounds();
    const blurRadius = Math.max(1, Math.min(20, this.properties.blurRadius)); // Clamp blur radius
    
    // Expand bounds to account for blur effect
    const expandedBounds = {
      x: bounds.x - blurRadius * 2,
      y: bounds.y - blurRadius * 2,
      width: bounds.width + blurRadius * 4,
      height: bounds.height + blurRadius * 4
    };
    
    // Create temporary canvas for shape rendering
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = expandedBounds.width;
    tempCanvas.height = expandedBounds.height;
    
    // Save current transform and translate temp context
    tempCtx.translate(-expandedBounds.x, -expandedBounds.y);
    
    // Draw shape on temporary canvas without transforms (they're already applied)
    tempCtx.save();
    this.drawShape(tempCtx);
    tempCtx.restore();
    
    // Apply blur effect to the temporary canvas
    const blurredImageData = this.applyGaussianBlur(tempCtx, tempCanvas.width, tempCanvas.height, blurRadius);
    
    // Draw the blurred result back to the main canvas
    const blurredCanvas = document.createElement('canvas');
    const blurredCtx = blurredCanvas.getContext('2d')!;
    blurredCanvas.width = tempCanvas.width;
    blurredCanvas.height = tempCanvas.height;
    blurredCtx.putImageData(blurredImageData, 0, 0);
    
    // Draw blurred result to main canvas
    ctx.drawImage(blurredCanvas, expandedBounds.x, expandedBounds.y);
  }

  private applyGaussianBlur(ctx: CanvasRenderingContext2D, width: number, height: number, radius: number): ImageData {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Simple box blur approximation (3 passes for Gaussian-like effect)
    const boxBlurRadius = Math.ceil(radius / 3);
    
    // Apply horizontal blur
    this.boxBlurHorizontal(data, width, height, boxBlurRadius);
    // Apply vertical blur  
    this.boxBlurVertical(data, width, height, boxBlurRadius);
    // Apply horizontal blur again
    this.boxBlurHorizontal(data, width, height, boxBlurRadius);
    
    return imageData;
  }

  private boxBlurHorizontal(data: Uint8ClampedArray, width: number, height: number, radius: number): void {
    const temp = new Uint8ClampedArray(data.length);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;
        
        for (let i = -radius; i <= radius; i++) {
          const xi = Math.max(0, Math.min(width - 1, x + i));
          const idx = (y * width + xi) * 4;
          
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }
        
        const idx = (y * width + x) * 4;
        temp[idx] = r / count;
        temp[idx + 1] = g / count;
        temp[idx + 2] = b / count;
        temp[idx + 3] = a / count;
      }
    }
    
    data.set(temp);
  }

  private boxBlurVertical(data: Uint8ClampedArray, width: number, height: number, radius: number): void {
    const temp = new Uint8ClampedArray(data.length);
    
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;
        
        for (let i = -radius; i <= radius; i++) {
          const yi = Math.max(0, Math.min(height - 1, y + i));
          const idx = (yi * width + x) * 4;
          
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }
        
        const idx = (y * width + x) * 4;
        temp[idx] = r / count;
        temp[idx + 1] = g / count;
        temp[idx + 2] = b / count;
        temp[idx + 3] = a / count;
      }
    }
    
    data.set(temp);
  }

  private drawShape(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    
    switch (this.type) {
      case 'rectangle':
      case 'square':
        this.drawPolygon(ctx); // Use points for standard rectangles
        break;
      case 'rounded-rectangle':
      case 'rounded-square':
        if (this.renderType === 'roundRect' && this.cornerRadius) {
          this.drawRoundedRectangle(ctx); // Use native roundRect for rounded shapes
        } else {
          this.drawPolygon(ctx); // Fallback to polygon for deformed shapes
        }
        break;
      case 'circle':
        this.drawPolygon(ctx); // Use points for deformable circles
        break;
      case 'ellipse':
        this.drawPolygon(ctx); // Use points for deformable ellipses
        break;
      case 'triangle':
      case 'right-triangle':
      case 'trapezoid':
      case 'pentagon':
      case 'hexagon':
      case 'rhombus':
      case 'parallelogram':
      case 'kite':
      case 'semicircle':
      case 'heart':
      case 'arrow':
      case 'cross':
        this.drawPolygon(ctx);
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
      case 'cubic':
        this.drawCubicCurve(ctx);
        break;
      case 'bezier':
        this.drawCurve(ctx);
        break;
      case 'smooth-spline':
        this.drawSmoothSpline(ctx);
        break;
      case 'chunk':
        this.drawChunk(ctx);
        break;
      case 'blob':
        this.drawBlob(ctx);
        break;
      case 'ring':
        this.drawPolygon(ctx); // Use points for deformable rings
        break;
      case 'spline-circle':
      case 'spline-ellipse':
      case 'spline-ring':
        this.drawSplineCubicBezier(ctx);
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

  private drawRoundedRectangle(ctx: CanvasRenderingContext2D): void {
    if (!this.width || !this.height || !this.cornerRadius) return;
    
    const w = this.width / 2;
    const h = this.height / 2;
    const radius = Math.min(this.cornerRadius, Math.min(w, h));
    
    // Use native roundRect() method for perfect rounded rectangles
    ctx.roundRect(-w, -h, this.width, this.height, radius);
  }

  private drawCubicCurve(ctx: CanvasRenderingContext2D): void {
    if (!this.points || this.points.length < 2) return;
    
    ctx.moveTo(this.points[0].x, this.points[0].y);

    // Use tangent handles for smooth cubic curves, same as Bézier curves
    if (this.tangentHandles && this.tangentHandles.length > 0) {
      for (let i = 0; i < this.points.length - 1; i++) {
        const p1 = this.points[i];
        const p2 = this.points[i + 1];
        
        // Get tangent handles for smooth cubic interpolation
        const handle1 = this.tangentHandles[i * 2 + 1]; // Outgoing handle from current point
        const handle2 = this.tangentHandles[(i + 1) * 2]; // Incoming handle to next point
        
        if (handle1 && handle2 && 'out' in handle1 && 'in' in handle2) {
          // Draw cubic Bézier curve with proper tangent continuity
          ctx.bezierCurveTo(
            p1.x + handle1.out.x, p1.y + handle1.out.y,
            p2.x + handle2.in.x, p2.y + handle2.in.y,
            p2.x, p2.y
          );
        } else {
          // Fallback to linear if handles missing
          ctx.lineTo(p2.x, p2.y);
        }
      }
    } else {
      // Fallback to simple quadratic curves if no tangent handles
      for (let i = 1; i < this.points.length; i++) {
        ctx.lineTo(this.points[i].x, this.points[i].y);
      }
    }

    // Close the path if this is a closed curve
    if (this.closed) {
      ctx.closePath();
    }
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
      if ((this.type === 'spline-circle' || this.type === 'spline-ellipse' || this.type === 'spline-ring') && this.controlPoints) {
        // Draw four-segment Bézier curves for spline-based shapes
        this.drawSplineCubicBezier(ctx);
      } else if (this.type === 'bezier' && this.controlPoints && this.points.length >= 2) {
        // Draw bezier curves using bezier curves with control points
        for (let i = 1; i < this.points.length; i++) {
          const controlIndex1 = (i - 1) * 2;
          const controlIndex2 = controlIndex1 + 1;
          
          if (controlIndex1 < this.controlPoints.length && controlIndex2 < this.controlPoints.length) {
            // Use two control points for proper bezier curve
            ctx.bezierCurveTo(
              this.controlPoints[controlIndex1].x,
              this.controlPoints[controlIndex1].y,
              this.controlPoints[controlIndex2].x,
              this.controlPoints[controlIndex2].y,
              this.points[i].x,
              this.points[i].y
            );
          } else {
            // Fallback to linear if control points are missing
            ctx.lineTo(this.points[i].x, this.points[i].y);
          }
        }
      } else if (this.type === 'bezier' && this.tangentHandles && this.points.length >= 2) {
        // Draw proper bezier curves using tangent handles
        for (let i = 0; i < this.points.length - 1; i++) {
          const p1 = this.points[i];
          const p2 = this.points[i + 1];
          
          if (i < this.tangentHandles.length && (i + 1) < this.tangentHandles.length) {
            const cp1 = this.tangentHandles[i].out;
            const cp2 = this.tangentHandles[i + 1].in;
            
            // Draw bezier curve
            ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
          } else {
            ctx.lineTo(p2.x, p2.y);
          }
        }
      } else {
        // Fallback for other curve types
        for (let i = 1; i < this.points.length; i++) {
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
    } else {
      // Draw straight lines between points
      for (let i = 1; i < this.points.length; i++) {
        ctx.lineTo(this.points[i].x, this.points[i].y);
      }
    }
    
    if (this.closed) ctx.closePath();
  }

  private drawChunk(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 3) return;
    
    ctx.moveTo(this.points[0].x, this.points[0].y);
    
    // Use control points if available, otherwise generate them
    if (this.controlPoints && this.controlPoints.length > 0) {
      for (let i = 1; i < this.points.length; i++) {
        const controlIndex = (i - 1) % this.controlPoints.length;
        ctx.quadraticCurveTo(
          this.controlPoints[controlIndex].x,
          this.controlPoints[controlIndex].y,
          this.points[i].x,
          this.points[i].y
        );
      }
      // Close the curve back to the first point
      if (this.controlPoints.length > 0) {
        const lastControlIndex = this.controlPoints.length - 1;
        ctx.quadraticCurveTo(
          this.controlPoints[lastControlIndex].x,
          this.controlPoints[lastControlIndex].y,
          this.points[0].x,
          this.points[0].y
        );
      }
    } else {
      // Fallback to generated smooth curves
      for (let i = 1; i < this.points.length; i++) {
        const current = this.points[i];
        const next = this.points[(i + 1) % this.points.length];
        const cp1x = current.x;
        const cp1y = current.y;
        const cp2x = (current.x + next.x) / 2;
        const cp2y = (current.y + next.y) / 2;
        
        ctx.quadraticCurveTo(cp1x, cp1y, cp2x, cp2y);
      }
    }
    
    ctx.closePath();
  }

  private drawBlob(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 3) return;
    
    ctx.moveTo(this.points[0].x, this.points[0].y);
    
    // Use bezier curves with tangent handles for smooth organic shapes
    if (this.tangentHandles && this.tangentHandles.length === this.points.length) {
      for (let i = 0; i < this.points.length; i++) {
        const current = this.points[i];
        const next = this.points[(i + 1) % this.points.length];
        const currentHandle = this.tangentHandles[i];
        const nextHandle = this.tangentHandles[(i + 1) % this.tangentHandles.length];
        
        // Create smooth bezier curve between points
        ctx.bezierCurveTo(
          currentHandle.out.x,
          currentHandle.out.y,
          nextHandle.in.x,
          nextHandle.in.y,
          next.x,
          next.y
        );
      }
    } else {
      // Fallback to generated smooth curves
      for (let i = 1; i < this.points.length; i++) {
        const current = this.points[i];
        const next = this.points[(i + 1) % this.points.length];
        const cp1x = current.x;
        const cp1y = current.y;
        const cp2x = (current.x + next.x) / 2;
        const cp2y = (current.y + next.y) / 2;
        
        ctx.quadraticCurveTo(cp1x, cp1y, cp2x, cp2y);
      }
    }
    
    ctx.closePath();
  }

  private drawRing(ctx: CanvasRenderingContext2D): void {
    ctx.arc(0, 0, this.radius!, 0, Math.PI * 2);
    ctx.arc(0, 0, this.innerRadius!, 0, Math.PI * 2, true);
  }

  private drawSplineCubicBezier(ctx: CanvasRenderingContext2D): void {
    if (!this.controlPoints || !this.points) return;
    
    if (this.type === 'spline-circle' || this.type === 'spline-ellipse') {
      // Four-segment Bézier curve (circle/ellipse)
      ctx.moveTo(this.points[0].x, this.points[0].y);
      
      // Draw four Bézier segments
      for (let i = 0; i < 4; i++) {
        const startPoint = this.points[i];
        const endPoint = this.points[(i + 1) % 4];
        const cp1 = this.controlPoints[i * 2];
        const cp2 = this.controlPoints[i * 2 + 1];
        
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, endPoint.x, endPoint.y);
      }
      
      if (this.closed) {
        ctx.closePath();
      }
    } else if (this.type === 'spline-ring') {
      // Outer ring - four Bézier segments
      ctx.moveTo(this.points[0].x, this.points[0].y);
      
      for (let i = 0; i < 4; i++) {
        const startPoint = this.points[i];
        const endPoint = this.points[(i + 1) % 4];
        const cp1 = this.controlPoints[i * 2];
        const cp2 = this.controlPoints[i * 2 + 1];
        
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, endPoint.x, endPoint.y);
      }
      ctx.closePath();
      
      // Inner ring - four Bézier segments (reverse order)
      ctx.moveTo(this.points[4].x, this.points[4].y);
      
      for (let i = 0; i < 4; i++) {
        const startPoint = this.points[4 + i];
        const endPoint = this.points[4 + ((i + 1) % 4)];
        const cp1 = this.controlPoints[8 + i * 2];
        const cp2 = this.controlPoints[8 + i * 2 + 1];
        
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, endPoint.x, endPoint.y);
      }
      ctx.closePath();
    }
  }

  private drawSmoothSpline(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 2) return;
    
    ctx.moveTo(this.points[0].x, this.points[0].y);
    
    // Use tangent handles for proper smooth spline curves
    if (this.tangentHandles && this.tangentHandles.length >= this.points.length) {
      // Draw smooth spline using bezier curves with tangent handles
      for (let i = 0; i < this.points.length - 1; i++) {
        const p1 = this.points[i];
        const p2 = this.points[i + 1];
        const cp1 = this.tangentHandles[i].out;
        const cp2 = this.tangentHandles[i + 1].in;
        
        // Draw bezier curve for smooth continuity
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
      }
      
      // Handle closed curves
      if (this.closed && this.points.length > 2) {
        const lastIndex = this.points.length - 1;
        const firstPoint = this.points[0];
        const cp1 = this.tangentHandles[lastIndex].out;
        const cp2 = this.tangentHandles[0].in;
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, firstPoint.x, firstPoint.y);
      }
    } else {
      // Fallback: use catmull-rom spline approximation
      for (let i = 1; i < this.points.length; i++) {
        const p0 = this.points[i - 2] || this.points[i - 1];
        const p1 = this.points[i - 1];
        const p2 = this.points[i];
        const p3 = this.points[i + 1] || this.points[i];
        
        // Catmull-Rom to Bezier conversion
        const tension = 0.3;
        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = p2.y - (p3.y - p1.y) * tension;
        
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
    }
    
    if (this.closed) ctx.closePath();
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
    if (this.type === 'bezier' && this.tangentHandles) {
      // Draw tangent handles for bezier curves
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
          
          // Draw 'in' handle (bezier curves use orange color)
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
          
          // Draw 'out' handle (bezier curves use orange color)
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
    } else if ((this.type === 'bezier' || this.type === 'blob' || this.renderType === 'bezier') && this.controlPoints) {
      // Draw control points for bezier curves and blob shapes
      this.controlPoints.forEach((controlPoint, index) => {
        const worldControl = this.getWorldControlPoint(index);
        
        // For bezier curves, control points are between segments
        // Control point at index controls the curve from point[index] to point[index+1]
        const startPointIndex = index;
        const endPointIndex = (index + 1) % this.points.length;
        
        const worldStartPoint = this.getWorldPoint(startPointIndex);
        const worldEndPoint = this.getWorldPoint(endPointIndex);
        
        if (worldControl && worldStartPoint && worldEndPoint) {
          // Draw tangent lines to both connected points
          ctx.strokeStyle = '#9CA3AF';
          ctx.lineWidth = 1 / canvasZoom;
          ctx.setLineDash([3 / canvasZoom, 3 / canvasZoom]);
          
          // Line from start point to control point
          ctx.beginPath();
          ctx.moveTo(worldStartPoint.x, worldStartPoint.y);
          ctx.lineTo(worldControl.x, worldControl.y);
          ctx.stroke();
          
          // Line from control point to end point
          ctx.beginPath();
          ctx.moveTo(worldControl.x, worldControl.y);
          ctx.lineTo(worldEndPoint.x, worldEndPoint.y);
          ctx.stroke();
          
          ctx.setLineDash([]);
          
          // Draw control handle (cubic curves use purple color)
          const radius = 4 / canvasZoom;
          const isControlSelected = selectedPoints.includes(index + 1000);
          ctx.fillStyle = isControlSelected ? '#EF4444' : '#8B5CF6';
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
    const numSegments = this.closed ? this.points.length : this.points.length - 1;
    for (let i = 0; i < numSegments; i++) {
      const p1 = this.getWorldPoint(i);
      const p2 = this.getWorldPoint((i + 1) % this.points.length);
      
      if (p1 && p2) {
        const isSelected = selectedSegments.includes(i);
        
        // Draw segment highlight with curve matching render type
        if (isSelected) {
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 6 / canvasZoom;
          ctx.beginPath();
          
          if (this.type === 'bezier' && this.tangentHandles && i < this.tangentHandles.length && (i + 1) < this.tangentHandles.length) {
            // Draw bezier curve using tangent handles for bezier curves
            ctx.moveTo(p1.x, p1.y);
            const cp1 = this.getWorldTangentHandle(i, 'out');
            const cp2 = this.getWorldTangentHandle(i + 1, 'in');
            
            if (cp1 && cp2) {
              ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
            } else {
              ctx.lineTo(p2.x, p2.y);
            }
          } else if (this.type === 'bezier' && this.controlPoints && i < this.controlPoints.length) {
            // Draw bezier curve using control points for cubic curves
            ctx.moveTo(p1.x, p1.y);
            const worldControl = this.getWorldControlPoint(i);
            if (worldControl) {
              ctx.quadraticCurveTo(worldControl.x, worldControl.y, p2.x, p2.y);
            } else {
              ctx.lineTo(p2.x, p2.y);
            }
          } else if ((this.type === 'spline-circle' || this.type === 'spline-ellipse' || this.type === 'spline-ring') && this.controlPoints) {
            // Draw Bézier curve segment for spline-based shapes
            ctx.moveTo(p1.x, p1.y);
            
            const segmentIndex = i % 4; // Four segments for circles/ellipses
            const cp1Index = segmentIndex * 2;
            const cp2Index = segmentIndex * 2 + 1;
            
            if (cp1Index < this.controlPoints.length && cp2Index < this.controlPoints.length) {
              const cp1 = this.getWorldControlPoint(cp1Index);
              const cp2 = this.getWorldControlPoint(cp2Index);
              
              if (cp1 && cp2) {
                ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
              } else {
                ctx.lineTo(p2.x, p2.y);
              }
            } else {
              ctx.lineTo(p2.x, p2.y);
            }
          } else if (this.type === 'bezier' || this.type === 'cubic' || this.renderType === 'smooth') {
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
        
        // Draw segment midpoint indicator - calculate true curve midpoint
        let midX, midY;
        
        if (this.type === 'bezier' && this.tangentHandles && i < this.tangentHandles.length && (i + 1) < this.tangentHandles.length) {
          // For bezier curves, calculate the actual curve midpoint
          const cp1 = this.getWorldTangentHandle(i, 'out');
          const cp2 = this.getWorldTangentHandle(i + 1, 'in');
          
          if (cp1 && cp2) {
            // Calculate bezier curve midpoint at t=0.5
            const t = 0.5;
            const mt = 1 - t;
            midX = mt * mt * mt * p1.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * p2.x;
            midY = mt * mt * mt * p1.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * p2.y;
          } else {
            midX = (p1.x + p2.x) / 2;
            midY = (p1.y + p2.y) / 2;
          }
        } else if (this.type === 'bezier' && this.controlPoints && i < this.controlPoints.length) {
          // For cubic curves, calculate quadratic curve midpoint
          const worldControl = this.getWorldControlPoint(i);
          if (worldControl) {
            // Calculate quadratic curve midpoint at t=0.5
            const t = 0.5;
            const mt = 1 - t;
            midX = mt * mt * p1.x + 2 * mt * t * worldControl.x + t * t * p2.x;
            midY = mt * mt * p1.y + 2 * mt * t * worldControl.y + t * t * p2.y;
          } else {
            midX = (p1.x + p2.x) / 2;
            midY = (p1.y + p2.y) / 2;
          }
        } else if ((this.type === 'spline-circle' || this.type === 'spline-ellipse' || this.type === 'spline-ring') && this.controlPoints) {
          // For spline-based shapes, calculate Bézier curve midpoint
          const segmentIndex = i % 4; // Four segments for circles/ellipses
          const cp1Index = segmentIndex * 2;
          const cp2Index = segmentIndex * 2 + 1;
          
          if (cp1Index < this.controlPoints.length && cp2Index < this.controlPoints.length) {
            const cp1 = this.getWorldControlPoint(cp1Index);
            const cp2 = this.getWorldControlPoint(cp2Index);
            
            if (cp1 && cp2) {
              // Calculate Bézier curve midpoint at t=0.5
              const t = 0.5;
              const mt = 1 - t;
              midX = mt * mt * mt * p1.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * p2.x;
              midY = mt * mt * mt * p1.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * p2.y;
            } else {
              midX = (p1.x + p2.x) / 2;
              midY = (p1.y + p2.y) / 2;
            }
          } else {
            midX = (p1.x + p2.x) / 2;
            midY = (p1.y + p2.y) / 2;
          }
        } else if (this.type === 'bezier' || this.type === 'cubic' || this.renderType === 'smooth') {
          // For other curve types with control points
          if (this.controlPoints && i < this.controlPoints.length) {
            const worldControl = this.getWorldControlPoint(i);
            if (worldControl) {
              const t = 0.5;
              const mt = 1 - t;
              midX = mt * mt * p1.x + 2 * mt * t * worldControl.x + t * t * p2.x;
              midY = mt * mt * p1.y + 2 * mt * t * worldControl.y + t * t * p2.y;
            } else {
              midX = (p1.x + p2.x) / 2;
              midY = (p1.y + p2.y) / 2;
            }
          } else {
            midX = (p1.x + p2.x) / 2;
            midY = (p1.y + p2.y) / 2;
          }
        } else {
          // For straight segments
          midX = (p1.x + p2.x) / 2;
          midY = (p1.y + p2.y) / 2;
        }
        
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

    // Draw tangent handles for curve types (cubic, bezier, smooth-spline)
    if ((this.type === 'cubic' || this.type === 'bezier' || this.type === 'smooth-spline') && this.tangentHandles) {
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 1 / canvasZoom;
      
      this.points.forEach((point, index) => {
        const worldPoint = this.getWorldPoint(index);
        if (!worldPoint || !this.tangentHandles) return;
        
        // Draw incoming handle
        const incomingHandle = this.tangentHandles[index * 2];
        if (incomingHandle && 'in' in incomingHandle) {
          const handleWorldPos = {
            x: worldPoint.x + incomingHandle.in.x * this.transform.scaleX,
            y: worldPoint.y + incomingHandle.in.y * this.transform.scaleY
          };
          
          ctx.beginPath();
          ctx.moveTo(worldPoint.x, worldPoint.y);
          ctx.lineTo(handleWorldPos.x, handleWorldPos.y);
          ctx.stroke();
          
          // Draw handle point
          ctx.fillStyle = '#10B981';
          ctx.beginPath();
          ctx.arc(handleWorldPos.x, handleWorldPos.y, 3 / canvasZoom, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Draw outgoing handle
        const outgoingHandle = this.tangentHandles[index * 2 + 1];
        if (outgoingHandle && 'out' in outgoingHandle) {
          const handleWorldPos = {
            x: worldPoint.x + outgoingHandle.out.x * this.transform.scaleX,
            y: worldPoint.y + outgoingHandle.out.y * this.transform.scaleY
          };
          
          ctx.beginPath();
          ctx.moveTo(worldPoint.x, worldPoint.y);
          ctx.lineTo(handleWorldPos.x, handleWorldPos.y);
          ctx.stroke();
          
          // Draw handle point
          ctx.fillStyle = '#10B981';
          ctx.beginPath();
          ctx.arc(handleWorldPos.x, handleWorldPos.y, 3 / canvasZoom, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
    
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
