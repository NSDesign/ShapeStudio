import { useState, useCallback, useRef, useEffect } from 'react';
import { Shape, ShapeGroupClass } from '../lib/shapes';
import { ShapeType, ScatterSettings, CanvasSettings, BlendMode, Point, Artboard, ColorManipulation, DistributionConfig, applyGridDistribution } from '../lib/shapeTypes';
import { SmartDistributionAlgorithm } from '../lib/distributionAlgorithm';
import { BooleanOperations } from '../lib/booleanOperations';
import { ColorUtils, ColorHarmonySettings } from '../lib/colorManipulation';
import { NoiseSystem } from '../lib/noiseSystem';
import { BatchConfigSettings } from '../components/BatchConfigDialog';

export const useShapeEditor = () => {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [groups, setGroups] = useState<ShapeGroupClass[]>([]);
  const [selectedShapes, setSelectedShapes] = useState<Shape[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<ShapeGroupClass[]>([]);
  const [enabledShapeTypes, setEnabledShapeTypes] = useState<Set<ShapeType>>(
    new Set(['rectangle' as ShapeType, 'circle' as ShapeType, 'polygon' as ShapeType])
  );
  const [scatterSettings, setScatterSettings] = useState<ScatterSettings>({
    onPoints: false,
    insideArea: false,
    count: 5,
    minCount: 1,
    maxCount: 20,
    randomness: 0.5,
    distribution: {
      pattern: 'random',
      spacing: 50,
      randomness: 0.3,
      rotation: 0,
      scale: 1,
      density: 0.5,
      avoidOverlap: false,
      respectBounds: true
    },
    shapeSpecific: {
      polygon: { edgeCountRange: [3, 20] },
      circle: { segmentCountRange: [16, 32] },
      ellipse: { segmentCountRange: [16, 32] },
      bezier: { 
        pointCountRange: [3, 6], 
        openProbability: 50,
        strokeCapProbabilities: { round: 50, square: 25, butt: 25 }
      },
      cubic: { 
        pointCountRange: [3, 6], 
        openProbability: 50,
        strokeCapProbabilities: { round: 50, square: 25, butt: 25 }
      },
      'smooth-spline': { 
        pointCountRange: [3, 6], 
        openProbability: 50,
        strokeCapProbabilities: { round: 50, square: 25, butt: 25 }
      },
      star: { pointCountRange: [5, 8], innerRadiusRange: [30, 70] },
      ring: { innerRadiusRange: [20, 80] },
      'spline-ring': { innerRadiusRange: [20, 80], segmentCountRange: [16, 32] },
      line: { 
        pointCountRange: [2, 4],
        strokeCapProbabilities: { round: 50, square: 25, butt: 25 }
      },
      rectangle: { cornerRadiusRange: [0, 10] },
      square: { cornerRadiusRange: [0, 10] }
    }
  });
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>({
    width: Number.MAX_SAFE_INTEGER,  // Truly infinite canvas
    height: Number.MAX_SAFE_INTEGER,
    zoom: 1,
    panX: 0,
    panY: 0,
    backgroundColor: '#1e293b',
    showGrid: true
  });


  
  // Artboard state
  const [artboards, setArtboards] = useState<Artboard[]>([
    {
      id: 'artboard_1',
      name: 'Artboard 1',
      x: -200,  // Centered at origin
      y: -200,
      width: 400,
      height: 400,
      backgroundColor: '#ffffff',
      preset: 'Basic'
    }
  ]);
  const [activeArtboard, setActiveArtboard] = useState<string>('artboard_1');
  
  // Batch Configuration Settings - using defaults from BatchConfigDialog
  const [batchConfigSettings, setBatchConfigSettings] = useState<BatchConfigSettings>({
    selectedPreset: 'custom',
    
    noiseEnabled: false,
    noiseAlgorithm: 'randomise',
    noiseScale: 1,
    noiseOctaves: 1,
    noiseAmplitude: 50,
    noiseSeed: Math.floor(Math.random() * 10000),
    noiseLacunarity: 2.0,
    noiseGain: 0.5,
    noiseDistanceFunction: 'euclidean',
    noiseFeaturePoints: 1,
    noiseRidgeOffset: 1.0,
    noiseTurbulencePower: 1.0,
    
    distributionLayoutEnabled: false,
    distributionPattern: 'grid',
    gridRows: 3,
    gridColumns: 3,
    gridRowOffset: 120,
    gridColumnOffset: 120,
    gridSortBy: 'none',
    
    blendModeEnabled: false,
    enabledBlendModes: { 'source-over': 100 },
    
    propertiesEnabled: false,
    preventInvisibleShapes: true,
    
    shapePropertiesEnabled: false,
    widthRange: [50, 200],
    heightRange: [50, 200],
    xPositionRange: [-100, 100],
    yPositionRange: [-100, 100],
    
    fillEnabled: true,
    fillProbability: 80,
    fillColorProbability: 70,
    fillGradientProbability: 20,
    fillGradientTypeProbability: 50,
    fillGradientColorRange: ['#3b82f6', '#8b5cf6'],
    fillGradientStopsRange: [2, 4],
    fillOpacityRange: [20, 100],
    
    strokeEnabled: true,
    strokeProbability: 60,
    strokeColorProbability: 80,
    strokeColorRange: ['#ef4444', '#f59e0b'],
    strokeGradientProbability: 15,
    strokeGradientTypeProbability: 50,
    strokeGradientColorRange: ['#ef4444', '#f59e0b'],
    strokeGradientStopsRange: [2, 3],
    strokeOpacityRange: [40, 100],
    strokeWidthRange: [1, 5],
    
    polygonPropertiesEnabled: false,
    segmentCountRange: [3, 12],
    
    linePropertiesEnabled: false,
    pointCountRange: [2, 8],
    pointPositionRange: [10, 200],
    
    splinePropertiesEnabled: false,
    splinePointCountRange: [3, 8],
    splinePointPositionRange: [10, 200],
    splineControlPointRange: [5, 50],
    
    transformsEnabled: false,
    translateXRange: [-50, 50],
    translateYRange: [-50, 50],
    scaleUniform: true,
    scaleRange: [50, 200],
    scaleXRange: [50, 200],
    scaleYRange: [50, 200],
    rotationRange: [0, 360],
    skewXRange: [0, 0],
    skewYRange: [0, 0],
    
    colorHarmonyEnabled: false,
    harmonyType: 'complementary',
    baseColor: '#3b82f6',
    hueVariance: 15,
    saturationRange: [0, 100],
    lightnessRange: [0, 100],
    
    monochromaticSettings: {
      lightnessSteps: 5,
      saturationSteps: 3,
      includeNeutrals: true,
    },
    analogousSettings: {
      hueRange: 60,
      colorCount: 3,
    },
    complementarySettings: {
      includeNearComplements: false,
      complementOffset: 0,
    },
    triadicSettings: {
      rotationOffset: 0,
      useEqualSpacing: true,
    },
    splitComplementarySettings: {
      splitAngle: 30,
      balanceWeights: true,
    },
    tetradicSettings: {
      squareHarmony: true,
      rectangleRatio: 60,
    },
    
    physicsEnabled: false,
    physicsType: 'none',
    gravityDirection: 270,
    gravityStrength: 50,
    magneticType: 'attraction',
    magneticStrength: 50,
    collisionDistance: 20,
    collisionBounce: 0.5,
    simulationSteps: 100,
    
    temporalEnabled: false,
    evolutionMode: 'linear',
    seedIncrement: 1,
    evolutionTargets: {
      position: true,
      rotation: true,
      scale: false,
      color: false,
      opacity: false
    }
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragState, setDragState] = useState<{
    startScreenX: number;
    startScreenY: number;
    lastScreenX: number;
    lastScreenY: number;
    totalDeltaX: number;
    totalDeltaY: number;
  } | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [editMode, setEditMode] = useState<'shapes' | 'points' | 'segments'>('shapes');
  const [selectedPoints, setSelectedPoints] = useState<{ shapeId: string; pointIndex: number }[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<{ shapeId: string; segmentIndex: number }[]>([]);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  
  // Multi-touch gesture state
  const [isMultiTouch, setIsMultiTouch] = useState(false);
  
  // Use refs for immediate access to gesture data
  const gestureDataRef = useRef({
    isActive: false,
    initialDistance: 0,
    initialAngle: 0,
    initialScale: 1,
    initialRotation: 0
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Touch device detection
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Synchronize selectedShapes and selectedGroups with shape.selected flags
  useEffect(() => {
    const currentSelectedShapes = shapes.filter(shape => shape.selected);
    const currentSelectedGroups = groups.filter(group => group.selected);
    
    if (currentSelectedShapes.length !== selectedShapes.length || 
        !currentSelectedShapes.every(shape => selectedShapes.includes(shape))) {
      setSelectedShapes(currentSelectedShapes);
    }
    
    if (currentSelectedGroups.length !== selectedGroups.length || 
        !currentSelectedGroups.every(group => selectedGroups.includes(group))) {
      setSelectedGroups(currentSelectedGroups);
    }
  }, [shapes, groups, selectedShapes, selectedGroups]);

  const updateCanvasSettings = useCallback((updates: Partial<CanvasSettings>) => {
    setCanvasSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const updateScatterSettings = useCallback((updates: Partial<ScatterSettings>) => {
    setScatterSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const clearSelection = useCallback(() => {
    shapes.forEach(shape => shape.selected = false);
    groups.forEach(group => group.selected = false);
    setSelectedShapes([]);
    setSelectedGroups([]);
    setSelectedPoints([]);
    setSelectedSegments([]);
  }, [shapes, groups]);

  const selectShapeAtPoint = useCallback((x: number, y: number, addToSelection: boolean = false) => {
    // Sort shapes by z-index from highest to lowest and find first hit
    const sortedShapes = [...shapes].sort((a, b) => b.properties.zIndex - a.properties.zIndex);
    let topShape: Shape | null = null;
    
    // Find the first (topmost) shape that contains the point
    for (const shape of sortedShapes) {
      if (shape.containsPoint(x, y)) {
        topShape = shape;
        break;
      }
    }
    
    if (!topShape) {
      if (!addToSelection) {
        clearSelection();
      }
      return false;
    }

    if (addToSelection) {
      topShape.selected = !topShape.selected;
    } else {
      clearSelection();
      setSelectedPoints([]);
      setSelectedSegments([]);
      topShape.selected = true;
    }

    const newSelectedShapes = shapes.filter(shape => shape.selected);
    setSelectedShapes(newSelectedShapes);
    return true;
  }, [shapes, clearSelection]);

  const selectPointAt = useCallback((x: number, y: number, addToSelection: boolean = false) => {
    // Sort shapes by z-index from highest to lowest to respect layering
    const sortedShapes = [...shapes].sort((a, b) => b.properties.zIndex - a.properties.zIndex);
    
    for (const shape of sortedShapes) {
      if (shape.points) {
        // Check if this shape blocks access to lower shapes
        const shapeBlocks = shape.containsPoint(x, y);
        
        // Check tangent handles first (for cubic curves)
        if (shape.tangentHandles) {
          for (let i = 0; i < shape.tangentHandles.length; i++) {
            // Check 'in' handle
            const worldHandleIn = shape.getWorldTangentHandle(i, 'in');
            if (worldHandleIn) {
              const distance = Math.sqrt((worldHandleIn.x - x) ** 2 + (worldHandleIn.y - y) ** 2);
              if (distance <= 6) {
                const pointId = { shapeId: shape.id, pointIndex: 2000 + i * 2 }; // Tangent handles start at 2000
                if (addToSelection) {
                  const exists = selectedPoints.some(p => p.shapeId === pointId.shapeId && p.pointIndex === pointId.pointIndex);
                  if (exists) {
                    setSelectedPoints(prev => prev.filter(p => !(p.shapeId === pointId.shapeId && p.pointIndex === pointId.pointIndex)));
                  } else {
                    const pointsFromOtherShapes = selectedPoints.filter(p => p.shapeId !== shape.id);
                    if (pointsFromOtherShapes.length > 0) {
                      setSelectedPoints(prev => prev.filter(p => p.shapeId === shape.id).concat([pointId]));
                    } else {
                      setSelectedPoints(prev => [...prev, pointId]);
                    }
                  }
                } else {
                  // Check if clicking on already selected point - if so, maintain selection for dragging
                  const isAlreadySelected = selectedPoints.some(p => p.shapeId === pointId.shapeId && p.pointIndex === pointId.pointIndex);
                  if (!isAlreadySelected) {
                    setSelectedPoints([pointId]);
                  }
                }
                return true;
              }
            }
            
            // Check 'out' handle
            const worldHandleOut = shape.getWorldTangentHandle(i, 'out');
            if (worldHandleOut) {
              const distance = Math.sqrt((worldHandleOut.x - x) ** 2 + (worldHandleOut.y - y) ** 2);
              if (distance <= 6) {
                const pointId = { shapeId: shape.id, pointIndex: 2000 + i * 2 + 1 }; // Out handle is +1 from in handle
                if (addToSelection) {
                  const exists = selectedPoints.some(p => p.shapeId === pointId.shapeId && p.pointIndex === pointId.pointIndex);
                  if (exists) {
                    setSelectedPoints(prev => prev.filter(p => !(p.shapeId === pointId.shapeId && p.pointIndex === pointId.pointIndex)));
                  } else {
                    const pointsFromOtherShapes = selectedPoints.filter(p => p.shapeId !== shape.id);
                    if (pointsFromOtherShapes.length > 0) {
                      setSelectedPoints(prev => prev.filter(p => p.shapeId === shape.id).concat([pointId]));
                    } else {
                      setSelectedPoints(prev => [...prev, pointId]);
                    }
                  }
                } else {
                  // Check if clicking on already selected point - if so, maintain selection for dragging
                  const isAlreadySelected = selectedPoints.some(p => p.shapeId === pointId.shapeId && p.pointIndex === pointId.pointIndex);
                  if (!isAlreadySelected) {
                    setSelectedPoints([pointId]);
                  }
                }
                return true;
              }
            }
          }
        }
        
        // Check control points (for bezier curves)
        if (shape.controlPoints) {
          for (let i = 0; i < shape.controlPoints.length; i++) {
            const worldControl = shape.getWorldControlPoint(i);
            if (worldControl) {
              const distance = Math.sqrt((worldControl.x - x) ** 2 + (worldControl.y - y) ** 2);
              if (distance <= 6) {
                const pointId = { shapeId: shape.id, pointIndex: i + 1000 }; // Offset control points
                if (addToSelection) {
                  const exists = selectedPoints.some(p => p.shapeId === pointId.shapeId && p.pointIndex === pointId.pointIndex);
                  if (exists) {
                    setSelectedPoints(prev => prev.filter(p => !(p.shapeId === pointId.shapeId && p.pointIndex === pointId.pointIndex)));
                  } else {
                    const pointsFromOtherShapes = selectedPoints.filter(p => p.shapeId !== shape.id);
                    if (pointsFromOtherShapes.length > 0) {
                      setSelectedPoints(prev => prev.filter(p => p.shapeId === shape.id).concat([pointId]));
                    } else {
                      setSelectedPoints(prev => [...prev, pointId]);
                    }
                  }
                } else {
                  // Check if clicking on already selected point - if so, maintain selection for dragging
                  const isAlreadySelected = selectedPoints.some(p => p.shapeId === pointId.shapeId && p.pointIndex === pointId.pointIndex);
                  if (!isAlreadySelected) {
                    setSelectedPoints([pointId]);
                  }
                }
                return true;
              }
            }
          }
        }
        
        // Check regular points
        for (let i = 0; i < shape.points.length; i++) {
          const worldPoint = shape.getWorldPoint(i);
          if (worldPoint) {
            const distance = Math.sqrt((worldPoint.x - x) ** 2 + (worldPoint.y - y) ** 2);
            if (distance <= 8) {
              const pointId = { shapeId: shape.id, pointIndex: i };
              if (addToSelection) {
                const exists = selectedPoints.some(p => p.shapeId === pointId.shapeId && p.pointIndex === pointId.pointIndex);
                if (exists) {
                  setSelectedPoints(prev => prev.filter(p => !(p.shapeId === pointId.shapeId && p.pointIndex === pointId.pointIndex)));
                } else {
                  const pointsFromOtherShapes = selectedPoints.filter(p => p.shapeId !== shape.id);
                  if (pointsFromOtherShapes.length > 0) {
                    setSelectedPoints(prev => prev.filter(p => p.shapeId === shape.id).concat([pointId]));
                  } else {
                    setSelectedPoints(prev => [...prev, pointId]);
                  }
                }
              } else {
                // Check if clicking on already selected point - if so, maintain selection for dragging
                const isAlreadySelected = selectedPoints.some(p => p.shapeId === pointId.shapeId && p.pointIndex === pointId.pointIndex);
                if (!isAlreadySelected) {
                  setSelectedPoints([pointId]);
                }
              }
              return true;
            }
          }
        }
        
        // If this shape blocks access to lower shapes, stop searching
        if (shapeBlocks) {
          return false;
        }
      }
    }

    if (!addToSelection) {
      setSelectedPoints([]);
    }
    return false;
  }, [shapes, selectedPoints]);

  const selectSegmentAt = useCallback((x: number, y: number, addToSelection: boolean = false) => {
    // Sort shapes by z-index from highest to lowest to respect layering
    const sortedShapes = [...shapes].sort((a, b) => b.properties.zIndex - a.properties.zIndex);
    
    for (const shape of sortedShapes) {
      if (shape.points && shape.points.length > 1) {
        // Check if this shape blocks access to lower shapes
        const shapeBlocks = shape.containsPoint(x, y);
        
        for (let i = 0; i < shape.points.length - 1; i++) {
          const worldP1 = shape.getWorldPoint(i);
          const worldP2 = shape.getWorldPoint(i + 1);
          
          if (worldP1 && worldP2) {
            let distance = Infinity;
            
            // For spline shapes, use cubic Bézier curve distance calculation
            if (shape.type.startsWith('spline-') && shape.tangentHandles && i < shape.tangentHandles.length && (i + 1) < shape.tangentHandles.length) {
              // Get world-space tangent handles for this segment
              const worldTangent1Out = shape.getWorldTangentHandle(i, 'out');
              const worldTangent2In = shape.getWorldTangentHandle(i + 1, 'in');
              
              if (worldTangent1Out && worldTangent2In) {
                // Sample points along the cubic Bézier curve and find the closest distance
                const sampleCount = 20;
                let minDistance = Infinity;
                
                for (let t = 0; t <= 1; t += 1 / sampleCount) {
                  // Cubic Bézier formula: B(t) = (1-t)³P₀ + 3(1-t)²tC₀ + 3(1-t)t²C₁ + t³P₁
                  const t1 = 1 - t;
                  const t1_2 = t1 * t1;
                  const t1_3 = t1_2 * t1;
                  const t_2 = t * t;
                  const t_3 = t_2 * t;
                  
                  const curveX = t1_3 * worldP1.x + 
                               3 * t1_2 * t * worldTangent1Out.x + 
                               3 * t1 * t_2 * worldTangent2In.x + 
                               t_3 * worldP2.x;
                  
                  const curveY = t1_3 * worldP1.y + 
                               3 * t1_2 * t * worldTangent1Out.y + 
                               3 * t1 * t_2 * worldTangent2In.y + 
                               t_3 * worldP2.y;
                  
                  const dx = x - curveX;
                  const dy = y - curveY;
                  const sampleDistance = Math.sqrt(dx * dx + dy * dy);
                  
                  if (sampleDistance < minDistance) {
                    minDistance = sampleDistance;
                  }
                }
                
                distance = minDistance;
              }
            } else {
              // For non-spline shapes, use straight line distance calculation
              const A = x - worldP1.x;
              const B = y - worldP1.y;
              const C = worldP2.x - worldP1.x;
              const D = worldP2.y - worldP1.y;

              const dot = A * C + B * D;
              const lenSq = C * C + D * D;
              let param = -1;
              if (lenSq !== 0) {
                param = dot / lenSq;
              }

              let xx, yy;
              if (param < 0) {
                xx = worldP1.x;
                yy = worldP1.y;
              } else if (param > 1) {
                xx = worldP2.x;
                yy = worldP2.y;
              } else {
                xx = worldP1.x + param * C;
                yy = worldP1.y + param * D;
              }

              const dx = x - xx;
              const dy = y - yy;
              distance = Math.sqrt(dx * dx + dy * dy);
            }

            if (distance <= 8) {
              const segmentId = { shapeId: shape.id, segmentIndex: i };
              if (addToSelection) {
                const exists = selectedSegments.some(s => s.shapeId === segmentId.shapeId && s.segmentIndex === segmentId.segmentIndex);
                if (exists) {
                  setSelectedSegments(prev => prev.filter(s => !(s.shapeId === segmentId.shapeId && s.segmentIndex === segmentId.segmentIndex)));
                } else {
                  // If selecting segment from different shape, clear segments from other shapes
                  const segmentsFromOtherShapes = selectedSegments.filter(s => s.shapeId !== shape.id);
                  if (segmentsFromOtherShapes.length > 0) {
                    setSelectedSegments(prev => prev.filter(s => s.shapeId === shape.id).concat([segmentId]));
                  } else {
                    setSelectedSegments(prev => [...prev, segmentId]);
                  }
                }
              } else {
                // Check if clicking on already selected segment - if so, maintain selection for dragging
                const isAlreadySelected = selectedSegments.some(s => s.shapeId === segmentId.shapeId && s.segmentIndex === segmentId.segmentIndex);
                if (!isAlreadySelected) {
                  setSelectedSegments([segmentId]);
                }
              }
              return true;
            }
          }
        }
        
        // If this shape blocks access to lower shapes, stop searching
        if (shapeBlocks) {
          return false;
        }
      }
    }

    if (!addToSelection) {
      setSelectedSegments([]);
    }
    return false;
  }, [shapes, selectedSegments]);

  const moveSelected = useCallback((deltaX: number, deltaY: number) => {
    selectedShapes.forEach(shape => {
      shape.transform.x += deltaX;
      shape.transform.y += deltaY;
    });

    selectedGroups.forEach(group => {
      group.transform.x += deltaX;
      group.transform.y += deltaY;
      group.shapes.forEach(shape => {
        shape.transform.x += deltaX;
        shape.transform.y += deltaY;
      });
    });

    setShapes(prev => [...prev]);
    setGroups(prev => [...prev]);
  }, [selectedShapes, selectedGroups]);

  const moveSelectedPoints = useCallback((deltaX: number, deltaY: number) => {
    selectedPoints.forEach(({ shapeId, pointIndex }) => {
      const shape = shapes.find(s => s.id === shapeId);
      if (!shape) return;
      
      const localDelta = shape.worldDeltaToLocal(deltaX, deltaY);
      
      if (pointIndex < 1000) {
        // Regular point
        if (shape.points && shape.points[pointIndex]) {
          const oldX = shape.points[pointIndex].x;
          const oldY = shape.points[pointIndex].y;
          
          shape.points[pointIndex].x += localDelta.x;
          shape.points[pointIndex].y += localDelta.y;
          
          // Move associated control points and tangent handles with the point
          if (shape.controlPoints) {
            // For bezier curves, move the control point associated with this point
            if (pointIndex < shape.controlPoints.length) {
              shape.controlPoints[pointIndex].x += localDelta.x;
              shape.controlPoints[pointIndex].y += localDelta.y;
            }
            
            // For blob shapes, also move the previous control point (since they're between points)
            if (shape.type === 'blob') {
              const prevControlIndex = (pointIndex - 1 + shape.controlPoints.length) % shape.controlPoints.length;
              shape.controlPoints[prevControlIndex].x += localDelta.x;
              shape.controlPoints[prevControlIndex].y += localDelta.y;
            }
          }
          
          // Move associated tangent handles with the point
          if (shape.tangentHandles && pointIndex < shape.tangentHandles.length) {
            shape.tangentHandles[pointIndex].in.x += localDelta.x;
            shape.tangentHandles[pointIndex].in.y += localDelta.y;
            shape.tangentHandles[pointIndex].out.x += localDelta.x;
            shape.tangentHandles[pointIndex].out.y += localDelta.y;
          }
        }
      } else if (pointIndex >= 1000 && pointIndex < 2000) {
        // Control point (for bezier curves)
        const controlIndex = pointIndex - 1000;
        if (shape.controlPoints && shape.controlPoints[controlIndex]) {
          shape.controlPoints[controlIndex].x += localDelta.x;
          shape.controlPoints[controlIndex].y += localDelta.y;
        }
      } else if (pointIndex >= 2000) {
        // Tangent handle (for cubic curves)
        const handlePointIndex = Math.floor((pointIndex - 2000) / 2);
        const isOut = (pointIndex - 2000) % 2 === 1;
        
        if (shape.tangentHandles && shape.tangentHandles[handlePointIndex]) {
          const handleType = isOut ? 'out' : 'in';
          shape.tangentHandles[handlePointIndex][handleType].x += localDelta.x;
          shape.tangentHandles[handlePointIndex][handleType].y += localDelta.y;
          
          // If the point is marked as smooth, update the opposite handle to maintain continuity
          if (shape.smoothPoints && shape.smoothPoints[handlePointIndex]) {
            const oppositeType = isOut ? 'in' : 'out';
            const currentHandle = shape.tangentHandles[handlePointIndex][handleType];
            const oppositeHandle = shape.tangentHandles[handlePointIndex][oppositeType];
            const basePoint = shape.points[handlePointIndex];
            
            if (basePoint) {
              // Calculate the vector from base point to current handle
              const currentVector = {
                x: currentHandle.x - basePoint.x,
                y: currentHandle.y - basePoint.y
              };
              
              // Set opposite handle to be the reflection of current handle
              oppositeHandle.x = basePoint.x - currentVector.x;
              oppositeHandle.y = basePoint.y - currentVector.y;
            }
          }
        }
      }
    });
    setShapes(prev => [...prev]);
  }, [selectedPoints, shapes]);

  const moveSelectedSegments = useCallback((deltaX: number, deltaY: number) => {
    selectedSegments.forEach(({ shapeId, segmentIndex }) => {
      const shape = shapes.find(s => s.id === shapeId);
      if (shape && shape.points) {
        const localDelta = shape.worldDeltaToLocal(deltaX, deltaY);
        const p1 = shape.points[segmentIndex];
        const p2 = shape.points[segmentIndex + 1];
        
        if (p1) {
          p1.x += localDelta.x;
          p1.y += localDelta.y;
          
          // Move associated control points and tangent handles with the first point
          if (shape.controlPoints && segmentIndex < shape.controlPoints.length) {
            shape.controlPoints[segmentIndex].x += localDelta.x;
            shape.controlPoints[segmentIndex].y += localDelta.y;
          }
          
          if (shape.tangentHandles && segmentIndex < shape.tangentHandles.length) {
            shape.tangentHandles[segmentIndex].in.x += localDelta.x;
            shape.tangentHandles[segmentIndex].in.y += localDelta.y;
            shape.tangentHandles[segmentIndex].out.x += localDelta.x;
            shape.tangentHandles[segmentIndex].out.y += localDelta.y;
          }
        }
        
        if (p2) {
          p2.x += localDelta.x;
          p2.y += localDelta.y;
          
          // Move associated control points and tangent handles with the second point
          const p2Index = segmentIndex + 1;
          if (shape.controlPoints && p2Index < shape.controlPoints.length) {
            shape.controlPoints[p2Index].x += localDelta.x;
            shape.controlPoints[p2Index].y += localDelta.y;
          }
          
          if (shape.tangentHandles && p2Index < shape.tangentHandles.length) {
            shape.tangentHandles[p2Index].in.x += localDelta.x;
            shape.tangentHandles[p2Index].in.y += localDelta.y;
            shape.tangentHandles[p2Index].out.x += localDelta.x;
            shape.tangentHandles[p2Index].out.y += localDelta.y;
          }
        }
      }
    });
    setShapes(prev => [...prev]);
  }, [selectedSegments, shapes]);

  const scatterOnShape = useCallback((targetShape: Shape) => {
    if (!targetShape.points || targetShape.points.length === 0) return;

    const newShapes: Shape[] = [];
    const enabledTypes = Array.from(enabledShapeTypes);
    
    // Use smart distribution algorithm
    let positions: Point[] = [];
    
    if (scatterSettings.onPoints) {
      // Scatter on shape points
      positions = targetShape.points.slice();
    } else if (scatterSettings.insideArea) {
      // Scatter inside shape area using smart distribution
      const bounds = targetShape.getBounds();
      positions = SmartDistributionAlgorithm.generatePositions(
        scatterSettings.count,
        bounds,
        scatterSettings.distribution
      );
      
      // Filter positions to only include those inside the shape
      positions = positions.filter(pos => targetShape.containsPoint(pos.x, pos.y));
    } else {
      // Use smart distribution algorithm for general scattering
      const bounds = targetShape.getBounds();
      // Expand bounds slightly for more interesting distributions
      const expandedBounds = {
        ...bounds,
        x: bounds.x - bounds.width * 0.2,
        y: bounds.y - bounds.height * 0.2,
        width: bounds.width * 1.4,
        height: bounds.height * 1.4
      };
      
      positions = SmartDistributionAlgorithm.generatePositions(
        scatterSettings.count,
        expandedBounds,
        scatterSettings.distribution
      );
    }

    positions.forEach((position, index) => {
      if (enabledTypes.length === 0) return;
      
      const randomType = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];
      const randomness = scatterSettings.randomness;
      
      // Add some randomness to position
      const finalX = position.x + (Math.random() - 0.5) * 20 * randomness;
      const finalY = position.y + (Math.random() - 0.5) * 20 * randomness;
      
      const newShape = new Shape(randomType, finalX, finalY);
      
      // Assign proper z-index for layering
      const existingMaxZ = shapes.length > 0 ? Math.max(...shapes.map(s => s.properties.zIndex)) : 0;
      newShape.properties.zIndex = existingMaxZ + index + 1;
      
      // Add some variation to scattered shapes
      const sizeVariation = 0.5 + Math.random() * randomness;
      newShape.transform.scaleX *= sizeVariation;
      newShape.transform.scaleY *= sizeVariation;
      
      // Random rotation
      newShape.transform.rotation = Math.random() * 360 * randomness;
      
      // Assign proper z-index for layering
      const currentMaxZ = shapes.length > 0 ? Math.max(...shapes.map(s => s.properties.zIndex)) : 0;
      newShape.properties.zIndex = currentMaxZ + newShapes.length + 1;
      
      // Random color variation
      const hue = Math.random() * 360;
      const saturation = 50 + Math.random() * 50;
      const lightness = 30 + Math.random() * 40;
      newShape.properties.fillColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      
      newShapes.push(newShape);
    });

    setShapes(prev => [...prev, ...newShapes]);
  }, [enabledShapeTypes, scatterSettings]);

  const toggleShapeType = useCallback((type: ShapeType) => {
    setEnabledShapeTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  }, []);

  const generateRandomShapes = useCallback(() => {
    const count = Math.floor(Math.random() * (scatterSettings.maxCount - scatterSettings.minCount + 1)) + scatterSettings.minCount;
    const enabledTypes = Array.from(enabledShapeTypes);
    
    console.log(`🔍 generateRandomShapes: count=${count}, enabledTypes=${enabledTypes.length}, types=${enabledTypes.join(',')}`);
    
    if (enabledTypes.length === 0) {
      console.log(`❌ No enabled shape types, returning early`);
      return;
    }

    // Use current artboard bounds for shape placement
    const currentArtboard = artboards.find(ab => ab.id === activeArtboard);
    const canvasBounds = currentArtboard ? {
      x: currentArtboard.x,
      y: currentArtboard.y,
      width: currentArtboard.width,
      height: currentArtboard.height
    } : {
      x: -200,
      y: -200,
      width: 400,
      height: 400
    };

    const positions = SmartDistributionAlgorithm.generatePositions(
      count,
      canvasBounds,
      scatterSettings.distribution
    );

    const newShapes = positions.map((position, index) => {
      const randomType = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];
      const shape = new Shape(randomType, position.x, position.y);
      
      // Assign proper z-index for layering
      const existingMaxIndex = shapes.length > 0 ? Math.max(...shapes.map(s => s.properties.zIndex)) : 0;
      shape.properties.zIndex = existingMaxIndex + index + 1;
      
      // Apply color harmony if enabled
      if (batchConfigSettings.colorHarmonyEnabled) {
        const colorHarmonySettings: ColorHarmonySettings = {
          enabled: batchConfigSettings.colorHarmonyEnabled,
          harmonyType: batchConfigSettings.harmonyType,
          baseColor: batchConfigSettings.baseColor,
          hueVariance: batchConfigSettings.hueVariance,
          saturationRange: batchConfigSettings.saturationRange,
          lightnessRange: batchConfigSettings.lightnessRange,
          monochromaticSettings: batchConfigSettings.monochromaticSettings,
          analogousSettings: batchConfigSettings.analogousSettings,
          complementarySettings: batchConfigSettings.complementarySettings,
          triadicSettings: batchConfigSettings.triadicSettings,
          splitComplementarySettings: batchConfigSettings.splitComplementarySettings,
          tetradicSettings: batchConfigSettings.tetradicSettings
        };
        
        // Apply harmony to fill color
        shape.properties.fillColor = ColorUtils.generateHarmonyColor(colorHarmonySettings);
        
        // Apply harmony to stroke color (related but slightly different)
        shape.properties.strokeColor = ColorUtils.generateHarmonyColor(colorHarmonySettings);
        
        // Apply harmony to gradients if they exist
        if (shape.properties.gradient) {
          shape.properties.gradient.stops = shape.properties.gradient.stops.map(stop => ({
            ...stop,
            color: ColorUtils.generateHarmonyColor(colorHarmonySettings)
          }));
        }
        
        console.log(`🎨 Applied ${batchConfigSettings.harmonyType} harmony - Fill: ${shape.properties.fillColor}, Stroke: ${shape.properties.strokeColor}`);
      } else {
        // Fallback to current randomization
        const hue = Math.random() * 360;
        const saturation = 50 + Math.random() * 50;
        const lightness = 30 + Math.random() * 40;
        shape.properties.fillColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        
        // Random stroke color
        const strokeHue = Math.random() * 360;
        const strokeSaturation = 60 + Math.random() * 40;
        const strokeLightness = 20 + Math.random() * 60;
        shape.properties.strokeColor = `hsl(${strokeHue}, ${strokeSaturation}%, ${strokeLightness}%)`;
      }
      
      // Apply noise variations if enabled
      if (batchConfigSettings.noiseEnabled) {
        const noiseResult = NoiseSystem.generateNoiseVariation(
          index, 
          batchConfigSettings, 
          position.x, 
          position.y
        );
        
        // Apply noise to position (additive to grid layout)
        shape.transform.x += noiseResult.x;
        shape.transform.y += noiseResult.y;
        
        // Apply noise to rotation
        shape.transform.rotation = noiseResult.rotation;
        
        // Apply noise to scale
        shape.transform.scaleX = noiseResult.scaleX;
        shape.transform.scaleY = noiseResult.scaleY;
        
        // Apply noise to opacity
        shape.properties.fillOpacity = noiseResult.opacity;
        shape.properties.strokeOpacity = noiseResult.opacity;
        
        // Apply noise to colors if color harmony is not enabled
        if (!batchConfigSettings.colorHarmonyEnabled) {
          const baseHue = Math.random() * 360;
          const baseSaturation = 50;
          const baseLightness = 50;
          
          const finalHue = (baseHue + noiseResult.hue + 360) % 360;
          const finalSaturation = Math.max(0, Math.min(100, baseSaturation + noiseResult.saturation));
          const finalLightness = Math.max(0, Math.min(100, baseLightness + noiseResult.lightness));
          
          shape.properties.fillColor = `hsl(${finalHue}, ${finalSaturation}%, ${finalLightness}%)`;
          
          // Apply noise to stroke color with slight variation
          const strokeHue = (finalHue + 30 + noiseResult.hue * 0.5) % 360;
          shape.properties.strokeColor = `hsl(${strokeHue}, ${finalSaturation}%, ${finalLightness}%)`;
        }
        
        console.log(`🔊 Applied ${batchConfigSettings.noiseAlgorithm} noise to shape ${index}: pos(${noiseResult.x.toFixed(1)}, ${noiseResult.y.toFixed(1)}), rot(${noiseResult.rotation.toFixed(1)}), scale(${noiseResult.scaleX.toFixed(2)})`);
      } else {
        // Fallback to current randomization when noise is disabled
        const scale = 0.5 + Math.random() * 2;
        shape.transform.scaleX = scale;
        shape.transform.scaleY = scale;
        shape.transform.rotation = Math.random() * 360;
      }
      
      return shape;
    });

    // Apply grid distribution if enabled
    let finalShapes = newShapes;
    if (batchConfigSettings.distributionLayoutEnabled) {
      const distributionConfig: DistributionConfig = {
        enabled: batchConfigSettings.distributionLayoutEnabled,
        pattern: batchConfigSettings.distributionPattern,
        gridRows: batchConfigSettings.gridRows,
        gridColumns: batchConfigSettings.gridColumns,
        gridRowOffset: batchConfigSettings.gridRowOffset,
        gridColumnOffset: batchConfigSettings.gridColumnOffset,
        gridSortBy: batchConfigSettings.gridSortBy
      };
      
      // Apply grid positioning additively with existing positions
      finalShapes = applyGridDistribution(newShapes, distributionConfig, { x: 0, y: 0 });
      console.log(`🎯 Applied grid distribution: ${batchConfigSettings.gridRows}×${batchConfigSettings.gridColumns}, sort by ${batchConfigSettings.gridSortBy}`);
    }

    console.log(`✅ Created ${finalShapes.length} shapes, adding to existing ${shapes.length} shapes`);
    setShapes(prev => [...prev, ...finalShapes]);
  }, [enabledShapeTypes, scatterSettings, canvasSettings, batchConfigSettings]);

  const getTouchCenter = useCallback((touch1: React.Touch, touch2: React.Touch, canvas: HTMLCanvasElement): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    const centerX = (touch1.clientX + touch2.clientX) / 2;
    const centerY = (touch1.clientY + touch2.clientY) / 2;
    
    const screenX = (centerX - rect.left - rect.width / 2) / canvasSettings.zoom;
    const screenY = (centerY - rect.top - rect.height / 2) / canvasSettings.zoom;
    
    return {
      x: screenX - canvasSettings.panX,
      y: screenY - canvasSettings.panY
    };
  }, [canvasSettings]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    
    const currentZoom = canvasSettings.zoom < 0.05 ? 1 : canvasSettings.zoom;
    
    // World coordinates before zoom
    const worldXBefore = (mouseX / currentZoom) - canvasSettings.panX;
    const worldYBefore = (mouseY / currentZoom) - canvasSettings.panY;
    
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.05, Math.min(5, currentZoom * zoomFactor));
    
    // World coordinates after zoom
    const worldXAfter = (mouseX / newZoom) - canvasSettings.panX;
    const worldYAfter = (mouseY / newZoom) - canvasSettings.panY;
    
    // Adjust pan to keep mouse position fixed
    const panDeltaX = worldXAfter - worldXBefore;
    const panDeltaY = worldYAfter - worldYBefore;
    
    setCanvasSettings(prev => ({
      ...prev,
      zoom: newZoom,
      panX: prev.panX + panDeltaX,
      panY: prev.panY + panDeltaY
    }));
  }, [canvasSettings]);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected shapes/points/segments
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editMode === 'points' && selectedPoints.length > 0) {
          selectedPoints.forEach(({ shapeId, pointIndex }) => {
            const shape = shapes.find(s => s.id === shapeId);
            if (shape && shape.points && shape.points.length > 3) {
              shape.points.splice(pointIndex, 1);
            }
          });
          setSelectedPoints([]);
          setShapes(prev => [...prev]);
        } else if (editMode === 'segments' && selectedSegments.length > 0) {
          // For segments, we could split the shape or remove the segment
          setSelectedSegments([]);
        } else if (selectedShapes.length > 0) {
          setShapes(prev => prev.filter(shape => !shape.selected));
          clearSelection();
        }
      }
      
      // Escape to clear selection
      if (e.key === 'Escape') {
        clearSelection();
        setIsMarqueeSelecting(false);
        setMarqueeStart(null);
        setMarqueeEnd(null);
      }
      
      // Tab to cycle through edit modes
      if (e.key === 'Tab') {
        e.preventDefault();
        setEditMode(prev => {
          switch (prev) {
            case 'shapes': return 'points';
            case 'points': return 'segments';
            case 'segments': return 'shapes';
            default: return 'shapes';
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editMode, selectedPoints, selectedSegments, selectedShapes, shapes, clearSelection]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const screenX = (e.clientX - rect.left - rect.width / 2) / canvasSettings.zoom;
    const screenY = (e.clientY - rect.top - rect.height / 2) / canvasSettings.zoom;
    const x = screenX - canvasSettings.panX;
    const y = screenY - canvasSettings.panY;
    
    // Handle middle mouse button for panning
    if (e.button === 1) {
      setDragState({
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        lastScreenX: e.clientX,
        lastScreenY: e.clientY,
        totalDeltaX: 0,
        totalDeltaY: 0
      });
      setIsDragging(true);
      return;
    }
    
    // Handle space key + left click for panning
    if (e.button === 0 && (e.metaKey || e.ctrlKey)) {
      setDragState({
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        lastScreenX: e.clientX,
        lastScreenY: e.clientY,
        totalDeltaX: 0,
        totalDeltaY: 0
      });
      setIsDragging(true);
      return;
    }
    
    // Initialize new drag state tracking system
    setDragState({
      startScreenX: e.clientX,
      startScreenY: e.clientY,
      lastScreenX: e.clientX,
      lastScreenY: e.clientY,
      totalDeltaX: 0,
      totalDeltaY: 0
    });
    
    // Intelligent mode detection and auto-switching
    let clickedOnShape = false;
    let detectedMode: 'shapes' | 'points' | 'segments' = 'shapes';
    
    // First, check for point selection (highest priority)
    const pointSelected = selectPointAt(x, y, e.shiftKey);
    if (pointSelected) {
      clickedOnShape = true;
      detectedMode = 'points';
      if (editMode !== 'points') {
        // Clear shape selections when entering point mode
        shapes.forEach(shape => shape.selected = false);
        setSelectedShapes([]);
        setEditMode('points');
      }
    } else {
      // Check for segment selection
      const segmentSelected = selectSegmentAt(x, y, e.shiftKey);
      if (segmentSelected) {
        clickedOnShape = true;
        detectedMode = 'segments';
        if (editMode !== 'segments') {
          // Clear shape selections when entering segment mode
          shapes.forEach(shape => shape.selected = false);
          setSelectedShapes([]);
          setEditMode('segments');
        }
      } else {
        // Check for shape selection - iterate from highest to lowest z-index
        const sortedShapes = [...shapes].sort((a, b) => b.properties.zIndex - a.properties.zIndex);
        let topShape: Shape | null = null;
        
        // Find the first (topmost) shape that contains the point
        for (const shape of sortedShapes) {
          if (shape.containsPoint(x, y)) {
            topShape = shape;
            break;
          }
        }
        
        clickedOnShape = topShape !== null;
        if (clickedOnShape && topShape) {
          detectedMode = 'shapes';
          if (editMode !== 'shapes') {
            setEditMode('shapes');
          }
          
          // Preserve multi-selection if:
          // 1. Shift is held and clicking on a selected shape, OR
          // 2. Clicking on any selected shape when multiple shapes are selected (for dragging)
          const isMultiSelectDrag = topShape.selected && selectedShapes.length > 1;
          
          // If clicking on a selected shape with multiple selections, don't change selection
          if (!isMultiSelectDrag) {
            if (e.shiftKey) {
              // Toggle selection
              topShape.selected = !topShape.selected;
            } else {
              // Single select - clear everything including components
              clearSelection();
              setSelectedPoints([]);
              setSelectedSegments([]);
              topShape.selected = true;
            }
            
            const newSelectedShapes = shapes.filter(shape => shape.selected);
            setSelectedShapes(newSelectedShapes);
          }
        } else {
          // Check if clicking on already selected elements for dragging
          if (editMode === 'points') {
            clickedOnShape = selectedPoints.some(p => {
              const shape = shapes.find(s => s.id === p.shapeId);
              if (shape) {
                const worldPoint = shape.getWorldPoint(p.pointIndex);
                if (worldPoint) {
                  const distance = Math.sqrt((worldPoint.x - x) ** 2 + (worldPoint.y - y) ** 2);
                  return distance <= 8;
                }
              }
              return false;
            });
          } else if (editMode === 'segments') {
            clickedOnShape = selectedSegments.some(s => {
              const shape = shapes.find(sh => sh.id === s.shapeId);
              if (shape) {
                const worldP1 = shape.getWorldPoint(s.segmentIndex);
                const worldP2 = shape.getWorldPoint(s.segmentIndex + 1);
                if (worldP1 && worldP2) {
                  const midX = (worldP1.x + worldP2.x) / 2;
                  const midY = (worldP1.y + worldP2.y) / 2;
                  const distance = Math.sqrt((midX - x) ** 2 + (midY - y) ** 2);
                  return distance <= 8;
                }
              }
              return false;
            });
          }
        }
      }
    }
    
    // Start marquee selection if clicking on empty space
    if (!clickedOnShape && !e.shiftKey) {
      clearSelection();
      // Clear all component selections when starting marquee
      setSelectedPoints([]);
      setSelectedSegments([]);
      setMarqueeStart({ x, y });
      setIsMarqueeSelecting(false); // Will be set to true on mouse move
    }
    
    setIsDragging(true);
  }, [canvasSettings.zoom, canvasSettings.panX, canvasSettings.panY, editMode, selectPointAt, selectSegmentAt, selectedPoints, selectedSegments, shapes, selectedShapes, clearSelection]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    
    // Handle canvas panning (middle mouse or Cmd/Ctrl+drag)
    if (isDragging && dragState && (e.buttons === 4 || (e.buttons === 1 && (e.metaKey || e.ctrlKey)))) {
      const deltaX = (e.clientX - dragState.lastScreenX) / canvasSettings.zoom;
      const deltaY = (e.clientY - dragState.lastScreenY) / canvasSettings.zoom;
      
      setCanvasSettings(prev => ({
        ...prev,
        panX: prev.panX + deltaX,
        panY: prev.panY + deltaY
      }));
      
      setDragState(prev => prev ? {
        ...prev,
        lastScreenX: e.clientX,
        lastScreenY: e.clientY
      } : null);
      return;
    }
    
    // Convert screen coordinates to world coordinates - match canvas transformation
    const screenX = (e.clientX - rect.left - rect.width / 2) / canvasSettings.zoom;
    const screenY = (e.clientY - rect.top - rect.height / 2) / canvasSettings.zoom;
    const x = screenX - canvasSettings.panX;
    const y = screenY - canvasSettings.panY;
    
    // Start marquee selection if dragging from empty space
    if (marqueeStart && !isMarqueeSelecting && isDragging) {
      const dragDistance = Math.sqrt((x - marqueeStart.x) ** 2 + (y - marqueeStart.y) ** 2);
      if (dragDistance > 10) { // Start marquee after minimum drag distance
        setIsMarqueeSelecting(true);
      }
    }

    // Update marquee selection
    if (isMarqueeSelecting && marqueeStart) {
      setMarqueeEnd({ x, y });
      
      // Select shapes/points/segments within marquee
      const minX = Math.min(marqueeStart.x, x);
      const maxX = Math.max(marqueeStart.x, x);
      const minY = Math.min(marqueeStart.y, y);
      const maxY = Math.max(marqueeStart.y, y);
      
      if (editMode === 'shapes') {
        shapes.forEach(shape => {
          // Use world bounds for proper marquee selection
          const worldBounds = shape.getWorldBounds();
          const shapeInMarquee = worldBounds.x >= minX && worldBounds.x + worldBounds.width <= maxX &&
                               worldBounds.y >= minY && worldBounds.y + worldBounds.height <= maxY;
          if (shape.selected !== shapeInMarquee) {
            shape.selected = shapeInMarquee;
          }
        });
      } else if (editMode === 'points') {
        const newSelectedPoints: { shapeId: string; pointIndex: number }[] = [];
        shapes.forEach(shape => {
          shape.points?.forEach((point, index) => {
            // Transform point to world coordinates for marquee selection
            const worldPoint = shape.getWorldPoint(index);
            if (worldPoint) {
              const pointInMarquee = worldPoint.x >= minX && worldPoint.x <= maxX &&
                                   worldPoint.y >= minY && worldPoint.y <= maxY;
              if (pointInMarquee) {
                newSelectedPoints.push({ shapeId: shape.id, pointIndex: index });
              }
            }
          });
        });
        setSelectedPoints(newSelectedPoints);
      } else if (editMode === 'segments') {
        const newSelectedSegments: { shapeId: string; segmentIndex: number }[] = [];
        shapes.forEach(shape => {
          if (shape.points) {
            for (let i = 0; i < shape.points.length - 1; i++) {
              const worldPoint1 = shape.getWorldPoint(i);
              const worldPoint2 = shape.getWorldPoint(i + 1);
              if (worldPoint1 && worldPoint2) {
                const midX = (worldPoint1.x + worldPoint2.x) / 2;
                const midY = (worldPoint1.y + worldPoint2.y) / 2;
                const segmentInMarquee = midX >= minX && midX <= maxX &&
                                       midY >= minY && midY <= maxY;
                if (segmentInMarquee) {
                  newSelectedSegments.push({ shapeId: shape.id, segmentIndex: i });
                }
              }
            }
          }
        });
        setSelectedSegments(newSelectedSegments);
      }
      
      return;
    }
    
    if (!isDragging || !dragState) return;
    
    // Calculate precise delta from last position
    const deltaX = (e.clientX - dragState.lastScreenX) / canvasSettings.zoom;
    const deltaY = (e.clientY - dragState.lastScreenY) / canvasSettings.zoom;
    
    // Only apply movement if there's actual delta
    if (Math.abs(deltaX) > 0.01 || Math.abs(deltaY) > 0.01) {
      // Handle different edit modes
      switch (editMode) {
        case 'points':
          if (selectedPoints.length > 0) {
            moveSelectedPoints(deltaX, deltaY);
          }
          break;
        case 'segments':
          if (selectedSegments.length > 0) {
            moveSelectedSegments(deltaX, deltaY);
          }
          break;
        default:
          if (selectedShapes.length > 0 || selectedGroups.length > 0) {
            moveSelected(deltaX, deltaY);
          }
          break;
      }
      
      // Update drag state with new position and accumulated delta
      setDragState(prev => prev ? {
        ...prev,
        lastScreenX: e.clientX,
        lastScreenY: e.clientY,
        totalDeltaX: prev.totalDeltaX + deltaX,
        totalDeltaY: prev.totalDeltaY + deltaY
      } : null);
    }
  }, [isDragging, dragState, editMode, selectedPoints.length, selectedSegments.length, selectedShapes.length, selectedGroups.length, canvasSettings.zoom, moveSelected, moveSelectedPoints, moveSelectedSegments, isMarqueeSelecting, marqueeStart, shapes]);

  const handleMouseUp = useCallback(() => {
    if (isMarqueeSelecting) {
      // Finalize marquee selection and immediately hide marquee rectangle
      setIsMarqueeSelecting(false);
      setMarqueeStart(null);
      setMarqueeEnd(null);
      
      // Update selected shapes array based on shape.selected flags
      const newSelectedShapes = shapes.filter(shape => shape.selected);
      setSelectedShapes(newSelectedShapes);
    } else if (marqueeStart && !isMarqueeSelecting) {
      // Single click without drag - clear marquee state
      setMarqueeStart(null);
      setMarqueeEnd(null);
    }
    
    setIsDragging(false);
    setDragState(null);
  }, [isMarqueeSelecting, marqueeStart, shapes]);

  // Touch event handlers for mobile multi-select and marquee
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle multi-touch gestures
    if (e.touches.length === 2) {
      setIsMultiTouch(true);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const angle = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      ) * 180 / Math.PI;
      
      gestureDataRef.current = {
        isActive: true,
        initialDistance: distance,
        initialAngle: angle,
        initialScale: canvasSettings.zoom,
        initialRotation: 0
      };
      
      return;
    }
    
    setIsMultiTouch(false);
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const screenX = (touch.clientX - rect.left - rect.width / 2) / canvasSettings.zoom;
    const screenY = (touch.clientY - rect.top - rect.height / 2) / canvasSettings.zoom;
    const x = screenX - canvasSettings.panX;
    const y = screenY - canvasSettings.panY;
    
    setTouchStartTime(Date.now());
    setDragState({
      startScreenX: e.touches[0].clientX,
      startScreenY: e.touches[0].clientY,
      lastScreenX: e.touches[0].clientX,
      lastScreenY: e.touches[0].clientY,
      totalDeltaX: 0,
      totalDeltaY: 0
    });
    
    // Check if touching empty space for potential marquee selection
    let touchedShape = false;
    
    switch (editMode) {
      case 'points':
        touchedShape = selectPointAt(x, y, isMultiSelectMode);
        break;
      case 'segments':
        touchedShape = selectSegmentAt(x, y, isMultiSelectMode);
        break;
      default:
        touchedShape = selectShapeAtPoint(x, y, isMultiSelectMode);
        break;
    }
    
    if (!touchedShape && !isMultiSelectMode) {
      setMarqueeStart({ x, y });
    }
    
    setIsDragging(true);
  }, [canvasSettings.zoom, canvasSettings.panX, canvasSettings.panY, editMode, isMultiSelectMode, selectPointAt, selectSegmentAt, selectShapeAtPoint]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle multi-touch zoom and rotate
    if (e.touches.length === 2 && gestureDataRef.current.isActive) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const scale = currentDistance / gestureDataRef.current.initialDistance;
      const newZoom = Math.max(0.05, Math.min(5, gestureDataRef.current.initialScale * scale));
      
      // Get center point for zoom
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      const rect = canvas.getBoundingClientRect();
      const mouseX = centerX - rect.left - rect.width / 2;
      const mouseY = centerY - rect.top - rect.height / 2;
      
      // Apply zoom with center point
      const worldXBefore = (mouseX / canvasSettings.zoom) - canvasSettings.panX;
      const worldYBefore = (mouseY / canvasSettings.zoom) - canvasSettings.panY;
      const worldXAfter = (mouseX / newZoom) - canvasSettings.panX;
      const worldYAfter = (mouseY / newZoom) - canvasSettings.panY;
      
      setCanvasSettings(prev => ({
        ...prev,
        zoom: newZoom,
        panX: prev.panX + (worldXAfter - worldXBefore),
        panY: prev.panY + (worldYAfter - worldYBefore)
      }));
      
      return;
    }
    
    // Single touch handling
    if (!dragState || e.touches.length > 1) return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const screenX = (touch.clientX - rect.left - rect.width / 2) / canvasSettings.zoom;
    const screenY = (touch.clientY - rect.top - rect.height / 2) / canvasSettings.zoom;
    const x = screenX - canvasSettings.panX;
    const y = screenY - canvasSettings.panY;
    
    // Calculate precise delta from last position
    const deltaX = (touch.clientX - dragState.lastScreenX) / canvasSettings.zoom;
    const deltaY = (touch.clientY - dragState.lastScreenY) / canvasSettings.zoom;
    
    // Check if we should start marquee selection on touch devices
    if (marqueeStart && !isMarqueeSelecting && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      setIsMarqueeSelecting(true);
      clearSelection();
    }
    
    // Handle marquee selection for touch
    if (isMarqueeSelecting && marqueeStart) {
      setMarqueeEnd({ x, y });
      
      // Select shapes within marquee rectangle
      const minX = Math.min(marqueeStart.x, x);
      const maxX = Math.max(marqueeStart.x, x);
      const minY = Math.min(marqueeStart.y, y);
      const maxY = Math.max(marqueeStart.y, y);
      
      shapes.forEach(shape => {
        // Check if shape center is within marquee bounds
        const shapeCenterX = shape.transform.x;
        const shapeCenterY = shape.transform.y;
        
        const shapeInMarquee = shapeCenterX >= minX && shapeCenterX <= maxX &&
                              shapeCenterY >= minY && shapeCenterY <= maxY;
        shape.selected = shapeInMarquee;
      });
      
      return;
    }
    
    // Handle shape/point/segment dragging or canvas panning
    if (isDragging && Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
      let handledDrag = false;
      
      switch (editMode) {
        case 'points':
          if (selectedPoints.length > 0) {
            moveSelectedPoints(deltaX, deltaY);
            handledDrag = true;
          }
          break;
        case 'segments':
          if (selectedSegments.length > 0) {
            moveSelectedSegments(deltaX, deltaY);
            handledDrag = true;
          }
          break;
        default:
          if (selectedShapes.length > 0 || selectedGroups.length > 0) {
            moveSelected(deltaX, deltaY);
            handledDrag = true;
          }
          break;
      }
      
      // If no shapes/points/segments were moved, pan the canvas
      if (!handledDrag) {
        setCanvasSettings(prev => ({
          ...prev,
          panX: prev.panX + deltaX,
          panY: prev.panY + deltaY
        }));
      }
      
      setDragState(prev => prev ? {
        ...prev,
        lastScreenX: touch.clientX,
        lastScreenY: touch.clientY,
        totalDeltaX: prev.totalDeltaX + deltaX,
        totalDeltaY: prev.totalDeltaY + deltaY
      } : null);
    }
  }, [isDragging, dragState, editMode, selectedPoints.length, selectedSegments.length, selectedShapes.length, selectedGroups.length, canvasSettings.zoom, moveSelected, moveSelectedPoints, moveSelectedSegments]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent default browser touch behavior
    e.preventDefault();
    
    const touchDuration = Date.now() - touchStartTime;
    
    // Reset multi-touch state when touches end
    if (e.touches.length < 2) {
      gestureDataRef.current = {
        isActive: false,
        initialDistance: 0,
        initialAngle: 0,
        initialScale: 1,
        initialRotation: 0
      };
      setIsMultiTouch(false);
    }

    // Handle marquee selection completion
    if (isMarqueeSelecting) {
      setIsMarqueeSelecting(false);
      setMarqueeStart(null);
      setMarqueeEnd(null);
      
      // Update selected shapes array based on shape.selected flags
      const newSelectedShapes = shapes.filter(shape => shape.selected);
      setSelectedShapes(newSelectedShapes);
    } else if (!isDragging && dragState && e.touches.length === 0) {
      // This was a tap, not a drag
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const screenX = (e.changedTouches[0].clientX - rect.left - rect.width / 2) / canvasSettings.zoom;
        const screenY = (e.changedTouches[0].clientY - rect.top - rect.height / 2) / canvasSettings.zoom;
        const x = screenX - canvasSettings.panX;
        const y = screenY - canvasSettings.panY;
        
        switch (editMode) {
          case 'points':
            selectPointAt(x, y, isMultiSelectMode);
            break;
          case 'segments':
            selectSegmentAt(x, y, isMultiSelectMode);
            break;
          default:
            selectShapeAtPoint(x, y, isMultiSelectMode);
            break;
        }
      }
    }
    
    setIsDragging(false);
    setDragState(null);
    setTouchStartTime(0);
    setMarqueeStart(null);
    setMarqueeEnd(null);
  }, [touchStartTime, isMultiSelectMode, isDragging, dragState, canvasSettings.zoom, editMode, selectShapeAtPoint, selectPointAt, selectSegmentAt, isMarqueeSelecting, shapes]);

  const toggleMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(!isMultiSelectMode);
  }, [isMultiSelectMode]);

  const changeBlendMode = useCallback((blendMode: BlendMode) => {
    selectedShapes.forEach(shape => {
      shape.properties.blendMode = blendMode;
    });
    setShapes(prev => [...prev]);
  }, [selectedShapes]);

  // Artboard management
  const addArtboard = useCallback((preset: any) => {
    // Center the artboard on the canvas (stack them on top of each other)
    const centerX = -preset.width / 2;
    const centerY = -preset.height / 2;
    
    const newArtboard: Artboard = {
      id: `artboard_${Date.now()}`,
      name: `${preset.name}`,
      x: centerX,
      y: centerY,
      width: preset.width,
      height: preset.height,
      preset: preset.name,
      category: preset.category
    };
    setArtboards(prev => [...prev, newArtboard]);
  }, []);

  const selectArtboard = useCallback((artboardId: string) => {
    setActiveArtboard(artboardId);
  }, []);

  const deleteArtboard = useCallback((artboardId: string) => {
    if (artboards.length <= 1) return; // Keep at least one artboard
    setArtboards(prev => prev.filter(ab => ab.id !== artboardId));
    if (activeArtboard === artboardId) {
      setActiveArtboard(artboards[0].id);
    }
  }, [artboards, activeArtboard]);

  const updateArtboard = useCallback((artboardId: string, updates: Partial<Artboard>) => {
    setArtboards(prev => prev.map(ab => 
      ab.id === artboardId ? { ...ab, ...updates } : ab
    ));
  }, []);

  const distributeSelected = useCallback(() => {
    if (selectedShapes.length < 2) return;
    
    // Sort shapes by position for proper distribution
    const sortedShapes = [...selectedShapes].sort((a, b) => a.transform.x - b.transform.x);
    
    const firstX = sortedShapes[0].transform.x;
    const lastX = sortedShapes[sortedShapes.length - 1].transform.x;
    const totalDistance = lastX - firstX;
    
    if (totalDistance === 0) return;
    
    const spacing = totalDistance / (sortedShapes.length - 1);
    
    sortedShapes.forEach((shape, index) => {
      if (index > 0 && index < sortedShapes.length - 1) {
        shape.transform.x = firstX + spacing * index;
      }
    });
    
    setShapes(prev => [...prev]);
  }, [selectedShapes]);

  const updateBatchConfigSettings = useCallback((settings: BatchConfigSettings) => {
    setBatchConfigSettings(settings);
  }, []);

  return {
    // State
    shapes,
    setShapes,
    groups,
    selectedShapes,
    selectedGroups,
    enabledShapeTypes,
    scatterSettings,
    batchConfigSettings,
    canvasSettings,
    artboards,
    activeArtboard,
    selectedCount: selectedShapes.length + selectedGroups.length,
    selectedPointsCount: selectedPoints.length,
    selectedSegmentsCount: selectedSegments.length,
    editMode,
    selectedPoints,
    selectedSegments,
    marqueeStart,
    marqueeEnd,
    isMarqueeSelecting,
    isTouchDevice,
    isMultiTouch,
    isMultiSelectMode,
    
    // Canvas interaction
    canvasRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleWheel,
    
    // Actions
    toggleShapeType,
    updateScatterSettings,
    updateBatchConfigSettings,
    generateRandomShapes,
    scatterOnShape,
    clearSelection,
    setEditMode,
    toggleMultiSelectMode,
    changeBlendMode,
    
    // Canvas controls
    zoomIn: () => {
      const currentZoom = canvasSettings.zoom < 0.05 ? 1 : canvasSettings.zoom;
      updateCanvasSettings({ zoom: Math.min(5, currentZoom * 1.2) });
    },
    zoomOut: () => {
      const currentZoom = canvasSettings.zoom < 0.05 ? 1 : canvasSettings.zoom;
      updateCanvasSettings({ zoom: Math.max(0.05, currentZoom / 1.2) });
    },
    resetView: () => {
      // Find the active artboard and center on it
      const artboard = artboards.find(ab => ab.id === activeArtboard);
      if (artboard) {
        // Center the view on the artboard
        const centerX = -(artboard.x + artboard.width / 2);
        const centerY = -(artboard.y + artboard.height / 2);
        updateCanvasSettings({ zoom: 1, panX: centerX, panY: centerY });
      } else {
        // Default reset if no artboard is active
        updateCanvasSettings({ zoom: 1, panX: 0, panY: 0 });
      }
    },
    
    // Transform operations
    moveBy: (x: number, y: number) => moveSelected(x, y),
    scaleBy: (x: number, y: number) => {
      selectedShapes.forEach(shape => {
        shape.transform.scaleX *= x;
        shape.transform.scaleY *= y;
      });
      setShapes(prev => [...prev]);
    },
    rotateBy: (angle: number) => {
      selectedShapes.forEach(shape => {
        shape.transform.rotation += angle;
      });
      setShapes(prev => [...prev]);
    },
    skewBy: (x: number, y: number) => {
      selectedShapes.forEach(shape => {
        shape.transform.skewX += x;
        shape.transform.skewY += y;
      });
      setShapes(prev => [...prev]);
    },
    flipHorizontal: () => {
      selectedShapes.forEach(shape => {
        shape.transform.scaleX *= -1;
      });
      setShapes(prev => [...prev]);
    },
    flipVertical: () => {
      selectedShapes.forEach(shape => {
        shape.transform.scaleY *= -1;
      });
      setShapes(prev => [...prev]);
    },
    
    // Layer operations
    deleteSelected: () => {
      setShapes(prev => prev.filter(shape => !shape.selected));
      clearSelection();
    },
    clearAllShapes: () => {
      setShapes([]);
      setGroups([]);
      clearSelection();
    },
    bringToFront: () => {
      const maxZ = Math.max(...shapes.map(s => s.properties.zIndex), 0);
      selectedShapes.forEach(shape => {
        shape.properties.zIndex = maxZ + 1;
      });
      setShapes(prev => [...prev]);
    },
    sendToBack: () => {
      const minZ = Math.min(...shapes.map(s => s.properties.zIndex), 0);
      selectedShapes.forEach(shape => {
        shape.properties.zIndex = minZ - 1;
      });
      setShapes(prev => [...prev]);
    },
    bringForward: () => {
      selectedShapes.forEach(shape => {
        shape.properties.zIndex += 1;
      });
      setShapes(prev => [...prev]);
    },
    sendBackward: () => {
      selectedShapes.forEach(shape => {
        shape.properties.zIndex -= 1;
      });
      setShapes(prev => [...prev]);
    },
    
    // Group operations
    composeShapes: () => {
      if (selectedShapes.length < 2) return;
      
      const newGroup = new ShapeGroupClass([...selectedShapes]);
      selectedShapes.forEach(shape => {
        shape.selected = false;
      });
      
      setGroups(prev => [...prev, newGroup]);
      setSelectedShapes([]);
      setSelectedGroups([newGroup]);
    },
    canComposeShapes: selectedShapes.length >= 2,
    
    // Artboard operations
    addArtboard,
    selectArtboard,
    deleteArtboard,
    updateArtboard,
    distributeSelected,
    
    // Boolean operations
    applyBooleanOperation: useCallback((operation: 'union' | 'subtract' | 'intersect' | 'exclude', targetId: string) => {
      if (selectedShapes.length !== 1) return;
      
      const sourceShape = selectedShapes[0];
      const targetShape = shapes.find(s => s.id === targetId);
      
      if (!targetShape) return;
      
      const result = BooleanOperations.applyBooleanOperation(sourceShape, targetShape, operation);
      
      if (result) {
        // Remove both original shapes and add the result
        const newShapes = shapes.filter(shape => 
          shape.id !== sourceShape.id && shape.id !== targetId
        );
        newShapes.push(result);
        
        setShapes(newShapes);
        setSelectedShapes([result]);
        console.log(`${operation.charAt(0).toUpperCase() + operation.slice(1)} operation completed successfully.`);
      } else {
        console.warn(`Cannot perform ${operation}: shapes do not intersect or are incompatible.`);
      }
    }, [selectedShapes, shapes, setShapes, setSelectedShapes]),
    
    // Color manipulation
    applyColorManipulation: useCallback((manipulation: ColorManipulation) => {
      const targetShapes = selectedShapes.length > 0 ? selectedShapes : shapes;
      
      if (manipulation.mode === 'shift' && manipulation.hslShift) {
        targetShapes.forEach(shape => {
          if (manipulation.affectFill && shape.properties.fillColor !== 'none') {
            shape.properties.fillColor = ColorUtils.applyHSLShift(
              shape.properties.fillColor, 
              manipulation.hslShift!
            );
          }
          if (manipulation.affectStroke && shape.properties.strokeColor !== 'none') {
            shape.properties.strokeColor = ColorUtils.applyHSLShift(
              shape.properties.strokeColor, 
              manipulation.hslShift!
            );
          }
        });
      } else if (manipulation.mode === 'remap' && manipulation.remappings) {
        targetShapes.forEach(shape => {
          if (manipulation.affectFill && shape.properties.fillColor !== 'none') {
            shape.properties.fillColor = ColorUtils.applyColorRemapping(
              shape.properties.fillColor, 
              manipulation.remappings!
            );
          }
          if (manipulation.affectStroke && shape.properties.strokeColor !== 'none') {
            shape.properties.strokeColor = ColorUtils.applyColorRemapping(
              shape.properties.strokeColor, 
              manipulation.remappings!
            );
          }
        });
      }
      
      setShapes(prev => [...prev]);
    }, [selectedShapes, shapes]),
    
    // Project management
    setGroups,
    setCanvasSettings,
    setScatterSettings,
    setEnabledShapeTypes
  };
};