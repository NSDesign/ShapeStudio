import { useState, useCallback, useRef, useEffect } from 'react';
import { Shape, ShapeGroupClass } from '../lib/shapes';
import { ShapeType, ScatterSettings, CanvasSettings, BlendMode, Point, Artboard } from '../lib/shapeTypes';
import { SmartDistributionAlgorithm } from '../lib/distributionAlgorithm';

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
    }
  });
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>({
    width: Number.MAX_SAFE_INTEGER,  // Truly infinite canvas
    height: Number.MAX_SAFE_INTEGER,
    zoom: 1,
    panX: 0,
    panY: 0
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
      preset: 'Basic'
    }
  ]);
  const [activeArtboard, setActiveArtboard] = useState<string>('artboard_1');
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
    const shapesAtPoint = shapes.filter(shape => shape.containsPoint(x, y));
    if (shapesAtPoint.length === 0) {
      if (!addToSelection) {
        clearSelection();
      }
      return false;
    }

    // Find the topmost shape (highest z-index)
    const topShape = shapesAtPoint.reduce((topmost, current) => 
      current.properties.zIndex > topmost.properties.zIndex ? current : topmost
    );

    if (addToSelection) {
      topShape.selected = !topShape.selected;
    } else {
      clearSelection();
      topShape.selected = true;
    }

    const newSelectedShapes = shapes.filter(shape => shape.selected);
    setSelectedShapes(newSelectedShapes);
    return true;
  }, [shapes, clearSelection]);

  const selectPointAt = useCallback((x: number, y: number, addToSelection: boolean = false) => {
    for (const shape of shapes) {
      if (shape.points) {
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
                  setSelectedPoints(prev => [...prev, pointId]);
                }
              } else {
                setSelectedPoints([pointId]);
              }
              return true;
            }
          }
        }
      }
    }

    if (!addToSelection) {
      setSelectedPoints([]);
    }
    return false;
  }, [shapes, selectedPoints]);

  const selectSegmentAt = useCallback((x: number, y: number, addToSelection: boolean = false) => {
    for (const shape of shapes) {
      if (shape.points && shape.points.length > 1) {
        for (let i = 0; i < shape.points.length - 1; i++) {
          const worldP1 = shape.getWorldPoint(i);
          const worldP2 = shape.getWorldPoint(i + 1);
          
          if (worldP1 && worldP2) {
            // Calculate distance from point to line segment using world coordinates
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
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= 8) {
              const segmentId = { shapeId: shape.id, segmentIndex: i };
              if (addToSelection) {
                const exists = selectedSegments.some(s => s.shapeId === segmentId.shapeId && s.segmentIndex === segmentId.segmentIndex);
                if (exists) {
                  setSelectedSegments(prev => prev.filter(s => !(s.shapeId === segmentId.shapeId && s.segmentIndex === segmentId.segmentIndex)));
                } else {
                  setSelectedSegments(prev => [...prev, segmentId]);
                }
              } else {
                setSelectedSegments([segmentId]);
              }
              return true;
            }
          }
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
      if (shape && shape.points && shape.points[pointIndex]) {
        shape.points[pointIndex].x += deltaX;
        shape.points[pointIndex].y += deltaY;
      }
    });
    setShapes(prev => [...prev]);
  }, [selectedPoints, shapes]);

  const moveSelectedSegments = useCallback((deltaX: number, deltaY: number) => {
    selectedSegments.forEach(({ shapeId, segmentIndex }) => {
      const shape = shapes.find(s => s.id === shapeId);
      if (shape && shape.points) {
        const p1 = shape.points[segmentIndex];
        const p2 = shape.points[segmentIndex + 1];
        if (p1) {
          p1.x += deltaX;
          p1.y += deltaY;
        }
        if (p2) {
          p2.x += deltaX;
          p2.y += deltaY;
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
    
    if (enabledTypes.length === 0) return;

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
      const existingMaxZ = shapes.length > 0 ? Math.max(...shapes.map(s => s.properties.zIndex)) : 0;
      shape.properties.zIndex = existingMaxZ + index + 1;
      
      // Random properties
      const hue = Math.random() * 360;
      const saturation = 50 + Math.random() * 50;
      const lightness = 30 + Math.random() * 40;
      shape.properties.fillColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      
      // Random size
      const scale = 0.5 + Math.random() * 2;
      shape.transform.scaleX = scale;
      shape.transform.scaleY = scale;
      
      // Random rotation
      shape.transform.rotation = Math.random() * 360;
      
      return shape;
    });

    setShapes(prev => [...prev, ...newShapes]);
  }, [enabledShapeTypes, scatterSettings, canvasSettings]);

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
    
    // World coordinates before zoom
    const worldXBefore = (mouseX / canvasSettings.zoom) - canvasSettings.panX;
    const worldYBefore = (mouseY / canvasSettings.zoom) - canvasSettings.panY;
    
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.1, Math.min(5, canvasSettings.zoom * zoomFactor));
    
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
    
    // Check if clicking on empty space to start marquee selection
    let clickedOnShape = false;
    
    switch (editMode) {
      case 'points':
        const pointSelected = selectPointAt(x, y, e.shiftKey);
        if (pointSelected) {
          clickedOnShape = true;
        } else {
          // Check if clicking on already selected points for dragging
          clickedOnShape = selectedPoints.some(p => {
            const shape = shapes.find(s => s.id === p.shapeId);
            if (shape && shape.points && shape.points[p.pointIndex]) {
              const point = shape.points[p.pointIndex];
              const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
              return distance <= 5;
            }
            return false;
          });
        }
        break;
      case 'segments':
        const segmentSelected = selectSegmentAt(x, y, e.shiftKey);
        if (segmentSelected) {
          clickedOnShape = true;
        } else {
          // Check if clicking on already selected segments for dragging
          clickedOnShape = selectedSegments.some(s => {
            const shape = shapes.find(sh => sh.id === s.shapeId);
            return shape?.isSegmentNear(x, y, s.segmentIndex, 5);
          });
        }
        break;
      default:
        const shapesAtMousePoint = shapes.filter(shape => shape.containsPoint(x, y));
        clickedOnShape = shapesAtMousePoint.length > 0;
        if (clickedOnShape) {
          // Find the topmost shape at the click point (highest z-index)
          const topShape = shapesAtMousePoint.reduce((topmost, current) => 
            current.properties.zIndex > topmost.properties.zIndex ? current : topmost
          );
          
          // Preserve multi-selection if:
          // 1. Shift is held and clicking on a selected shape, OR
          // 2. Clicking on any selected shape when multiple shapes are selected (for dragging)
          const isMultiSelectDrag = topShape.selected && selectedShapes.length > 1;
          const allowDeselect = !(e.shiftKey && topShape.selected && selectedShapes.length > 1);
          
          // If clicking on a selected shape with multiple selections, don't change selection
          if (!isMultiSelectDrag) {
            if (e.shiftKey) {
              // Toggle selection
              topShape.selected = !topShape.selected;
            } else {
              // Single select
              clearSelection();
              topShape.selected = true;
            }
            
            const newSelectedShapes = shapes.filter(shape => shape.selected);
            setSelectedShapes(newSelectedShapes);
          }
        }
        break;
    }
    
    // Start marquee selection if clicking on empty space
    if (!clickedOnShape && !e.shiftKey) {
      clearSelection();
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
    if (marqueeStart && !isMarqueeSelecting) {
      const dragDistance = Math.sqrt((x - marqueeStart.x) ** 2 + (y - marqueeStart.y) ** 2);
      if (dragDistance > 5) { // Start marquee after minimum drag distance
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
    }
    
    setIsDragging(false);
    setDragState(null);
  }, [isMarqueeSelecting, shapes]);

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
      const newZoom = Math.max(0.1, Math.min(5, gestureDataRef.current.initialScale * scale));
      
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
    
    // Handle shape/point/segment dragging
    if (isDragging && Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
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
    const newArtboard: Artboard = {
      id: `artboard_${Date.now()}`,
      name: `${preset.name}`,
      x: 0,
      y: 0,
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

  return {
    // State
    shapes,
    setShapes,
    groups,
    selectedShapes,
    selectedGroups,
    enabledShapeTypes,
    scatterSettings,
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
    generateRandomShapes,
    scatterOnShape,
    clearSelection,
    setEditMode,
    toggleMultiSelectMode,
    changeBlendMode,
    
    // Canvas controls
    zoomIn: () => updateCanvasSettings({ zoom: Math.min(5, canvasSettings.zoom * 1.2) }),
    zoomOut: () => updateCanvasSettings({ zoom: Math.max(0.1, canvasSettings.zoom / 1.2) }),
    resetView: () => updateCanvasSettings({ zoom: 1, panX: 0, panY: 0 }),
    
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
    
    // Project management
    setGroups,
    setCanvasSettings,
    setScatterSettings,
    setEnabledShapeTypes
  };
};