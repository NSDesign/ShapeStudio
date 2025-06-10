import { useState, useCallback, useRef, useEffect } from 'react';
import { Shape, ShapeGroupClass } from '../lib/shapes';
import { ShapeType, ScatterSettings, CanvasSettings, BlendMode, Point } from '../lib/shapeTypes';

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
    randomness: 0.5
  });
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>({
    width: 1200,
    height: 800,
    zoom: 1,
    panX: 0,
    panY: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
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
  const [initialTouchDistance, setInitialTouchDistance] = useState<number>(0);
  const [initialTouchAngle, setInitialTouchAngle] = useState<number>(0);
  const [initialScale, setInitialScale] = useState<number>(1);
  const [initialRotation, setInitialRotation] = useState<number>(0);
  const [gestureCenter, setGestureCenter] = useState<{ x: number; y: number } | null>(null);
  
  // Use ref to track gesture state immediately
  const gestureActiveRef = useRef(false);
  
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

  // Generate random shapes
  const generateRandomShapes = useCallback(() => {
    const availableTypes = Array.from(enabledShapeTypes);
    if (availableTypes.length === 0) return;
    
    const newShapes: Shape[] = [];
    const numShapes = scatterSettings.count;
    
    // Generate shapes in the visible viewport area for infinite canvas
    const viewportWidth = 800;
    const viewportHeight = 600;
    
    for (let i = 0; i < numShapes; i++) {
      const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      // Convert viewport coordinates to world coordinates
      const x = (Math.random() * viewportWidth - canvasSettings.panX) / canvasSettings.zoom;
      const y = (Math.random() * viewportHeight - canvasSettings.panY) / canvasSettings.zoom;
      const shape = new Shape(type, x, y);
      newShapes.push(shape);
    }
    
    setShapes(prev => [...prev, ...newShapes]);
  }, [enabledShapeTypes, canvasSettings]);

  // Select shape at point
  const selectShapeAtPoint = useCallback((x: number, y: number, multiSelect: boolean = false) => {
    // Check groups first
    const clickedGroup = groups.find(group => group.containsPoint(x, y));
    if (clickedGroup) {
      if (!multiSelect) {
        selectedShapes.forEach(shape => shape.selected = false);
        selectedGroups.forEach(group => group.selected = false);
        setSelectedShapes([]);
        setSelectedGroups([clickedGroup]);
        clickedGroup.selected = true;
      } else {
        if (clickedGroup.selected) {
          clickedGroup.selected = false;
          setSelectedGroups(prev => prev.filter(g => g !== clickedGroup));
        } else {
          clickedGroup.selected = true;
          setSelectedGroups(prev => [...prev, clickedGroup]);
        }
      }
      return;
    }

    // Check individual shapes
    const clickedShape = shapes.find(shape => shape.containsPoint(x, y));
    
    if (!multiSelect) {
      selectedShapes.forEach(shape => shape.selected = false);
      selectedGroups.forEach(group => group.selected = false);
      setSelectedShapes([]);
      setSelectedGroups([]);
    }
    
    if (clickedShape) {
      if (multiSelect && clickedShape.selected) {
        clickedShape.selected = false;
        setSelectedShapes(prev => prev.filter(s => s !== clickedShape));
        console.log('Shape deselected:', clickedShape.id);
      } else {
        clickedShape.selected = true;
        setSelectedShapes(prev => multiSelect ? [...prev.filter(s => s !== clickedShape), clickedShape] : [clickedShape]);
        
        // Console log single shape selection for debugging
        console.log('=== SINGLE SHAPE SELECTED ===');
        console.log('Shape:', {
          id: clickedShape.id,
          type: clickedShape.type,
          transform: clickedShape.transform,
          properties: clickedShape.properties,
          points: clickedShape.points?.length || 0,
          width: clickedShape.width,
          height: clickedShape.height,
          radius: clickedShape.radius,
          sides: clickedShape.sides
        });
        console.log('=== END SINGLE SHAPE DEBUG ===');
      }
    }
  }, [shapes, groups, selectedShapes, selectedGroups]);

  // Transform operations
  const moveSelected = useCallback((deltaX: number, deltaY: number) => {
    selectedShapes.forEach(shape => shape.move(deltaX, deltaY));
    selectedGroups.forEach(group => group.move(deltaX, deltaY));
    setShapes(prev => [...prev]);
    setGroups(prev => [...prev]);
  }, [selectedShapes, selectedGroups]);

  const scaleSelected = useCallback((factorX: number = 1.1, factorY: number = 1.1) => {
    selectedShapes.forEach(shape => {
      shape.transform.scaleX *= factorX;
      shape.transform.scaleY *= factorY;
    });
    selectedGroups.forEach(group => {
      group.transform.scaleX *= factorX;
      group.transform.scaleY *= factorY;
    });
    setShapes(prev => [...prev]);
    setGroups(prev => [...prev]);
  }, [selectedShapes, selectedGroups]);

  const rotateSelected = useCallback((angle: number = 15) => {
    selectedShapes.forEach(shape => shape.rotate(angle));
    selectedGroups.forEach(group => group.rotate(angle));
    setShapes(prev => [...prev]);
    setGroups(prev => [...prev]);
  }, [selectedShapes, selectedGroups]);

  const skewSelected = useCallback((skewX: number = 0.1, skewY: number = 0) => {
    selectedShapes.forEach(shape => shape.skew(skewX, skewY));
    selectedGroups.forEach(group => group.skew(skewX, skewY));
    setShapes(prev => [...prev]);
    setGroups(prev => [...prev]);
  }, [selectedShapes, selectedGroups]);

  const flipSelected = useCallback((horizontal: boolean = true) => {
    selectedShapes.forEach(shape => shape.flip(horizontal));
    selectedGroups.forEach(group => group.flip(horizontal));
    setShapes(prev => [...prev]);
    setGroups(prev => [...prev]);
  }, [selectedShapes, selectedGroups]);

  // Delete selected shapes and groups
  const deleteSelected = useCallback(() => {
    if (selectedShapes.length === 0 && selectedGroups.length === 0) return;
    
    // Remove selected shapes
    setShapes(prev => prev.filter(shape => !selectedShapes.includes(shape)));
    
    // Remove selected groups
    setGroups(prev => prev.filter(group => !selectedGroups.includes(group)));
    
    // Clear selection
    setSelectedShapes([]);
    setSelectedGroups([]);
  }, [selectedShapes, selectedGroups]);

  // Load project from file
  const loadProject = useCallback((data: {
    shapes: Shape[];
    groups: ShapeGroupClass[];
    canvasSettings: CanvasSettings;
    scatterSettings: ScatterSettings;
    enabledShapeTypes: Set<ShapeType>;
  }) => {
    setShapes(data.shapes);
    setGroups(data.groups);
    setCanvasSettings(data.canvasSettings);
    setScatterSettings(data.scatterSettings);
    setEnabledShapeTypes(data.enabledShapeTypes);
    
    // Clear selections
    setSelectedShapes([]);
    setSelectedGroups([]);
    setSelectedPoints([]);
    setSelectedSegments([]);
  }, []);

  // Compose shapes into group
  const composeShapes = useCallback(() => {
    if (selectedShapes.length < 2) return;
    
    const newGroup = new ShapeGroupClass([...selectedShapes]);
    
    // Remove selected shapes from individual shapes array
    setShapes(prev => prev.filter(shape => !selectedShapes.includes(shape)));
    
    // Clear selection
    selectedShapes.forEach(shape => shape.selected = false);
    setSelectedShapes([]);
    
    // Add new group
    setGroups(prev => [...prev, newGroup]);
  }, [selectedShapes]);

  // Scatter shapes
  const scatterOnShape = useCallback((targetShape: Shape) => {
    if (!scatterSettings.onPoints && !scatterSettings.insideArea) return;
    
    const availableTypes = Array.from(enabledShapeTypes);
    if (availableTypes.length === 0) return;
    
    const newShapes: Shape[] = [];
    
    if (scatterSettings.onPoints && targetShape.points && targetShape.points.length > 0) {
      targetShape.points.forEach(point => {
        const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        const x = targetShape.transform.x + point.x + (Math.random() - 0.5) * 20;
        const y = targetShape.transform.y + point.y + (Math.random() - 0.5) * 20;
        const shape = new Shape(type, x, y);
        newShapes.push(shape);
      });
    }
    
    if (scatterSettings.insideArea) {
      const bounds = targetShape.getBounds();
      for (let i = 0; i < scatterSettings.count; i++) {
        const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        const x = targetShape.transform.x + bounds.x + Math.random() * bounds.width;
        const y = targetShape.transform.y + bounds.y + Math.random() * bounds.height;
        const shape = new Shape(type, x, y);
        newShapes.push(shape);
      }
    }
    
    setShapes(prev => [...prev, ...newShapes]);
  }, [scatterSettings, enabledShapeTypes]);

  // Toggle shape type
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

  // Update scatter settings
  const updateScatterSettings = useCallback((settings: Partial<ScatterSettings>) => {
    setScatterSettings(prev => ({ ...prev, ...settings }));
  }, []);

  // Clear all selections
  const clearSelection = useCallback(() => {
    shapes.forEach(shape => shape.selected = false);
    groups.forEach(group => group.selected = false);
    setSelectedShapes([]);
    setSelectedGroups([]);
    setSelectedPoints([]);
    setSelectedSegments([]);
    setShapes(prev => [...prev]);
    setGroups(prev => [...prev]);
  }, [shapes, groups]);

  // Multi-touch gesture utilities
  const getTouchDistance = useCallback((touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getTouchAngle = useCallback((touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.atan2(dy, dx);
  }, []);

  const getTouchCenter = useCallback((touch1: React.Touch, touch2: React.Touch, canvas: HTMLCanvasElement): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    const centerX = (touch1.clientX + touch2.clientX) / 2;
    const centerY = (touch1.clientY + touch2.clientY) / 2;
    return {
      x: (centerX - rect.left - canvasSettings.panX * canvasSettings.zoom) / canvasSettings.zoom,
      y: (centerY - rect.top - canvasSettings.panY * canvasSettings.zoom) / canvasSettings.zoom
    };
  }, [canvasSettings]);

  // Point and segment editing functions
  const setEditingMode = useCallback((mode: 'shapes' | 'points' | 'segments') => {
    setEditMode(mode);
    setSelectedPoints([]);
    setSelectedSegments([]);
  }, []);

  const selectPointAt = useCallback((x: number, y: number, multiSelect: boolean = false, isTouch: boolean = false) => {
    let foundPoint: { shapeId: string; pointIndex: number } | null = null;
    const threshold = isTouch ? 20 : 8; // Larger threshold for touch devices
    
    // Search through all shapes for nearby points
    for (const shape of shapes) {
      if (!shape.points || shape.points.length === 0) continue;
      
      for (let i = 0; i < shape.points.length; i++) {
        if (shape.isPointNear(x, y, i, threshold)) {
          foundPoint = { shapeId: shape.id, pointIndex: i };
          break;
        }
      }
      if (foundPoint) break;
    }

    if (foundPoint) {
      if (!multiSelect) {
        setSelectedPoints([foundPoint]);
      } else {
        setSelectedPoints(prev => {
          const existing = prev.find(p => p.shapeId === foundPoint!.shapeId && p.pointIndex === foundPoint!.pointIndex);
          if (existing) {
            return prev.filter(p => p !== existing);
          } else {
            return [...prev, foundPoint!];
          }
        });
      }
      // Force visual update
      setShapes(prev => [...prev]);
    } else if (!multiSelect) {
      setSelectedPoints([]);
    }
  }, [shapes]);

  const selectSegmentAt = useCallback((x: number, y: number, multiSelect: boolean = false, isTouch: boolean = false) => {
    let foundSegment: { shapeId: string; segmentIndex: number } | null = null;
    const threshold = isTouch ? 15 : 5; // Larger threshold for touch devices
    
    // Search through all shapes for nearby segments
    for (const shape of shapes) {
      if (!shape.points || shape.points.length < 2) continue;
      
      for (let i = 0; i < shape.points.length - 1; i++) {
        if (shape.isSegmentNear(x, y, i, threshold)) {
          foundSegment = { shapeId: shape.id, segmentIndex: i };
          break;
        }
      }
      if (foundSegment) break;
    }

    if (foundSegment) {
      if (!multiSelect) {
        setSelectedSegments([foundSegment]);
      } else {
        setSelectedSegments(prev => {
          const existing = prev.find(s => s.shapeId === foundSegment!.shapeId && s.segmentIndex === foundSegment!.segmentIndex);
          if (existing) {
            return prev.filter(s => s !== existing);
          } else {
            return [...prev, foundSegment!];
          }
        });
      }
      // Force visual update
      setShapes(prev => [...prev]);
    } else if (!multiSelect) {
      setSelectedSegments([]);
    }
  }, [shapes]);

  const moveSelectedPoints = useCallback((deltaX: number, deltaY: number) => {
    selectedPoints.forEach(({ shapeId, pointIndex }) => {
      const shape = shapes.find(s => s.id === shapeId);
      if (shape) {
        const worldPoint = shape.getWorldPoint(pointIndex);
        if (worldPoint) {
          shape.updateWorldPoint(pointIndex, {
            x: worldPoint.x + deltaX,
            y: worldPoint.y + deltaY
          });
        }
      }
    });
    setShapes(prev => [...prev]);
  }, [selectedPoints, shapes]);

  const moveSelectedSegments = useCallback((deltaX: number, deltaY: number) => {
    selectedSegments.forEach(({ shapeId, segmentIndex }) => {
      const shape = shapes.find(s => s.id === shapeId);
      if (shape) {
        // Move both points of the segment
        const point1 = shape.getWorldPoint(segmentIndex);
        const point2 = shape.getWorldPoint(segmentIndex + 1);
        if (point1 && point2) {
          shape.updateWorldPoint(segmentIndex, {
            x: point1.x + deltaX,
            y: point1.y + deltaY
          });
          shape.updateWorldPoint(segmentIndex + 1, {
            x: point2.x + deltaX,
            y: point2.y + deltaY
          });
        }
      }
    });
    setShapes(prev => [...prev]);
  }, [selectedSegments, shapes]);

  // Canvas zoom and pan
  const zoomIn = useCallback(() => {
    setCanvasSettings(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 5) }));
  }, []);

  const zoomOut = useCallback(() => {
    setCanvasSettings(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.1) }));
  }, []);

  const resetView = useCallback(() => {
    setCanvasSettings(prev => ({ ...prev, zoom: 1, panX: 0, panY: 0 }));
  }, []);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - canvasSettings.panX * canvasSettings.zoom) / canvasSettings.zoom;
    const y = (e.clientY - rect.top - canvasSettings.panY * canvasSettings.zoom) / canvasSettings.zoom;
    
    setDragStart({ x, y });
    
    // Check if clicking on empty space to start marquee selection
    let clickedOnShape = false;
    
    // If scatter mode is active, try to scatter on clicked shape
    if (scatterSettings.onPoints || scatterSettings.insideArea) {
      const clickedShape = shapes.find(shape => shape.containsPoint(x, y));
      if (clickedShape) {
        scatterOnShape(clickedShape);
        return;
      }
    }
    
    // Handle different edit modes
    switch (editMode) {
      case 'points':
        clickedOnShape = selectedPoints.some(p => {
          const shape = shapes.find(s => s.id === p.shapeId);
          return shape?.isPointNear(x, y, p.pointIndex, 8);
        });
        if (!clickedOnShape) {
          selectPointAt(x, y, e.shiftKey);
          clickedOnShape = selectedPoints.length > 0;
        }
        break;
      case 'segments':
        clickedOnShape = selectedSegments.some(s => {
          const shape = shapes.find(sh => sh.id === s.shapeId);
          return shape?.isSegmentNear(x, y, s.segmentIndex, 5);
        });
        if (!clickedOnShape) {
          selectSegmentAt(x, y, e.shiftKey);
          clickedOnShape = selectedSegments.length > 0;
        }
        break;
      default:
        clickedOnShape = shapes.some(shape => shape.containsPoint(x, y));
        if (clickedOnShape) {
          selectShapeAtPoint(x, y, e.shiftKey);
        }
        break;
    }
    
    // Start marquee selection if clicking on empty space and not holding shift
    if (!clickedOnShape && !e.shiftKey) {
      setMarqueeStart({ x, y });
      setMarqueeEnd({ x, y });
      setIsMarqueeSelecting(true);
      // Clear existing selection when starting marquee
      if (editMode === 'shapes') {
        clearSelection();
      } else if (editMode === 'points') {
        setSelectedPoints([]);
      } else if (editMode === 'segments') {
        setSelectedSegments([]);
      }
    } else {
      setIsDragging(true);
    }
  }, [canvasSettings.zoom, scatterSettings, shapes, editMode, selectShapeAtPoint, scatterOnShape, selectPointAt, selectSegmentAt, selectedPoints, selectedSegments, clearSelection]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - canvasSettings.panX * canvasSettings.zoom) / canvasSettings.zoom;
    const y = (e.clientY - rect.top - canvasSettings.panY * canvasSettings.zoom) / canvasSettings.zoom;
    
    // Handle marquee selection
    if (isMarqueeSelecting && marqueeStart) {
      setMarqueeEnd({ x, y });
      
      const minX = Math.min(marqueeStart.x, x);
      const maxX = Math.max(marqueeStart.x, x);
      const minY = Math.min(marqueeStart.y, y);
      const maxY = Math.max(marqueeStart.y, y);
      
      if (editMode === 'shapes') {
        // Select shapes within marquee rectangle
        shapes.forEach(shape => {
          const shapeCenterX = shape.transform.x;
          const shapeCenterY = shape.transform.y;
          
          const shapeInMarquee = shapeCenterX >= minX && shapeCenterX <= maxX &&
                                shapeCenterY >= minY && shapeCenterY <= maxY;
          shape.selected = shapeInMarquee;
        });
        setShapes(prev => [...prev]);
      } else if (editMode === 'points') {
        // Select points within marquee rectangle
        const newSelectedPoints: { shapeId: string; pointIndex: number }[] = [];
        shapes.forEach(shape => {
          if (!shape.selected || !shape.points) return;
          
          shape.points.forEach((_, pointIndex) => {
            const worldPoint = shape.getWorldPoint(pointIndex);
            if (worldPoint && 
                worldPoint.x >= minX && worldPoint.x <= maxX &&
                worldPoint.y >= minY && worldPoint.y <= maxY) {
              newSelectedPoints.push({ shapeId: shape.id, pointIndex });
            }
          });
        });
        setSelectedPoints(newSelectedPoints);
      } else if (editMode === 'segments') {
        // Select segments within marquee rectangle
        const newSelectedSegments: { shapeId: string; segmentIndex: number }[] = [];
        shapes.forEach(shape => {
          if (!shape.selected || !shape.points || shape.points.length < 2) return;
          
          for (let i = 0; i < shape.points.length - 1; i++) {
            const point1 = shape.getWorldPoint(i);
            const point2 = shape.getWorldPoint(i + 1);
            if (point1 && point2) {
              // Check if segment midpoint is within marquee
              const midX = (point1.x + point2.x) / 2;
              const midY = (point1.y + point2.y) / 2;
              if (midX >= minX && midX <= maxX && midY >= minY && midY <= maxY) {
                newSelectedSegments.push({ shapeId: shape.id, segmentIndex: i });
              }
            }
          }
        });
        setSelectedSegments(newSelectedSegments);
      }
      
      return;
    }
    
    if (!isDragging || !dragStart) return;
    
    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;
    
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
    
    setDragStart({ x, y });
  }, [isDragging, dragStart, editMode, selectedPoints.length, selectedSegments.length, selectedShapes.length, selectedGroups.length, canvasSettings.zoom, moveSelected, moveSelectedPoints, moveSelectedSegments, isMarqueeSelecting, marqueeStart, shapes]);

  const handleMouseUp = useCallback(() => {
    if (isMarqueeSelecting) {
      // Finalize marquee selection and immediately hide marquee rectangle
      setIsMarqueeSelecting(false);
      setMarqueeStart(null);
      setMarqueeEnd(null);
      
      // Update selected shapes array based on shape.selected flags
      const newSelectedShapes = shapes.filter(shape => shape.selected);
      setSelectedShapes(newSelectedShapes);
      
      // Console log selected shape properties for debugging
      console.log('=== SELECTED SHAPES DEBUG ===');
      console.log('Selected shapes count:', newSelectedShapes.length);
      newSelectedShapes.forEach((shape, index) => {
        console.log(`Shape ${index + 1}:`, {
          id: shape.id,
          type: shape.type,
          transform: shape.transform,
          properties: shape.properties,
          points: shape.points?.length || 0,
          width: shape.width,
          height: shape.height,
          radius: shape.radius,
          sides: shape.sides
        });
      });
      console.log('=== END DEBUG ===');
    }
    
    setIsDragging(false);
    setDragStart(null);
  }, [isMarqueeSelecting, shapes]);

  // Touch event handlers for mobile multi-select and marquee
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Prevent default browser touch behavior (zooming, scrolling)
    e.preventDefault();
    
    // Handle multi-touch gestures for scaling and rotating shapes
    if (e.touches.length === 2 && editMode === 'shapes' && selectedShapes.length > 0) {
      console.log('=== GESTURE STARTED ===');
      return;
    }
    
    // Single touch handling
    if (e.touches.length > 1) return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left - canvasSettings.panX * canvasSettings.zoom) / canvasSettings.zoom;
    const y = (touch.clientY - rect.top - canvasSettings.panY * canvasSettings.zoom) / canvasSettings.zoom;
    
    setTouchStartTime(Date.now());
    setDragStart({ x, y });
    
    // Check if touching empty space for potential marquee selection
    let touchedShape = false;
    
    switch (editMode) {
      case 'points':
        touchedShape = selectedPoints.some(p => {
          const shape = shapes.find(s => s.id === p.shapeId);
          return shape?.isPointNear(x, y, p.pointIndex, 20);
        });
        break;
      case 'segments':
        touchedShape = selectedSegments.some(s => {
          const shape = shapes.find(sh => sh.id === s.shapeId);
          return shape?.isSegmentNear(x, y, s.segmentIndex, 15);
        });
        break;
      default:
        touchedShape = shapes.some(shape => shape.containsPoint(x, y));
        break;
    }
    
    // Prepare for potential marquee selection if touching empty space
    if (!touchedShape && editMode === 'shapes') {
      // Will start marquee on touch move if not dragging existing selection
      setMarqueeStart({ x, y });
      setMarqueeEnd({ x, y });
    }
  }, [canvasSettings.zoom, editMode, shapes, selectedPoints, selectedSegments]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Prevent default browser touch behavior
    e.preventDefault();
    
    // Handle multi-touch gestures for scaling and rotating
    if (e.touches.length === 2 && selectedShapes.length > 0) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      // Initialize gesture if not started
      if (!gestureActiveRef.current) {
        gestureActiveRef.current = true;
        setIsMultiTouch(true);
        setInitialTouchDistance(getTouchDistance(touch1, touch2));
        setInitialTouchAngle(getTouchAngle(touch1, touch2));
        setGestureCenter(getTouchCenter(touch1, touch2, canvas));
        
        // Store initial transform values for selected shapes
        if (selectedShapes.length > 0) {
          setInitialScale(selectedShapes[0].transform.scaleX);
          setInitialRotation(selectedShapes[0].transform.rotation);
        }
        
        console.log('=== GESTURE INITIALIZED IN MOVE ===');
        return;
      }
      
      const currentDistance = getTouchDistance(touch1, touch2);
      const currentAngle = getTouchAngle(touch1, touch2);
      
      // Only proceed if we have valid initial values
      if (initialTouchDistance > 0) {
        // Calculate scale factor from distance change (pinch to scale)
        const scaleFactor = currentDistance / initialTouchDistance;
        const newScale = Math.max(0.1, Math.min(5, initialScale * scaleFactor));
        
        // Calculate rotation from angle change (rotate with two fingers)
        const rotationDelta = currentAngle - initialTouchAngle;
        const newRotation = initialRotation + rotationDelta;
        
        console.log('=== APPLYING GESTURE ===', { 
          scaleFactor, 
          newScale, 
          rotationDelta: rotationDelta * (180 / Math.PI), 
          newRotation: newRotation * (180 / Math.PI) 
        });
        
        // Apply transforms to all selected shapes
        selectedShapes.forEach(shape => {
          shape.transform.scaleX = newScale;
          shape.transform.scaleY = newScale;
          shape.transform.rotation = newRotation;
        });
        
        // Also apply to selected groups
        selectedGroups.forEach(group => {
          group.shapes.forEach(shape => {
            shape.transform.scaleX = newScale;
            shape.transform.scaleY = newScale;
            shape.transform.rotation = newRotation;
          });
        });
        
        setShapes(prev => [...prev]);
        setGroups(prev => [...prev]);
      }
      
      return;
    }
    
    // Single touch handling
    if (!dragStart || e.touches.length > 1) return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left - canvasSettings.panX * canvasSettings.zoom) / canvasSettings.zoom;
    const y = (touch.clientY - rect.top - canvasSettings.panY * canvasSettings.zoom) / canvasSettings.zoom;
    
    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;
    
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
      
      setShapes(prev => [...prev]);
      return;
    }
    
    // Start dragging if movement detected and not doing marquee
    if (!isDragging && !isMarqueeSelecting && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      setIsDragging(true);
    }
    
    if (isDragging) {
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
      
      setDragStart({ x, y });
    }
  }, [isDragging, dragStart, editMode, selectedPoints.length, selectedSegments.length, selectedShapes.length, selectedGroups.length, canvasSettings.zoom, moveSelected, moveSelectedPoints, moveSelectedSegments]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent default browser touch behavior
    e.preventDefault();
    
    const touchDuration = Date.now() - touchStartTime;
    
    // Reset multi-touch state when touches end
    if (e.touches.length < 2) {
      gestureActiveRef.current = false;
      setIsMultiTouch(false);
      setInitialTouchDistance(0);
      setInitialTouchAngle(0);
      setInitialScale(1);
      setInitialRotation(0);
      setGestureCenter(null);
      console.log('=== GESTURE ENDED ===');
    }
    
    // Handle marquee selection completion
    if (isMarqueeSelecting) {
      setIsMarqueeSelecting(false);
      setMarqueeStart(null);
      setMarqueeEnd(null);
      
      // Update selected shapes array based on shape.selected flags
      const newSelectedShapes = shapes.filter(shape => shape.selected);
      setSelectedShapes(newSelectedShapes);
    } else if (!isDragging && dragStart && e.touches.length === 0) {
      // This was a tap, not a drag
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.changedTouches[0].clientX - rect.left) / canvasSettings.zoom;
        const y = (e.changedTouches[0].clientY - rect.top) / canvasSettings.zoom;
        
        // Long press (>500ms) toggles multi-select mode
        if (touchDuration > 500) {
          setIsMultiSelectMode(!isMultiSelectMode);
        } else {
          // Short tap - select shape
          switch (editMode) {
            case 'points':
              selectPointAt(x, y, isMultiSelectMode, true);
              break;
            case 'segments':
              selectSegmentAt(x, y, isMultiSelectMode, true);
              break;
            default:
              selectShapeAtPoint(x, y, isMultiSelectMode);
              break;
          }
        }
      }
    }
    
    setIsDragging(false);
    setDragStart(null);
    setTouchStartTime(0);
    setMarqueeStart(null);
    setMarqueeEnd(null);
  }, [touchStartTime, isMultiSelectMode, isDragging, dragStart, canvasSettings.zoom, editMode, selectShapeAtPoint, selectPointAt, selectSegmentAt, isMarqueeSelecting, shapes]);

  const toggleMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(!isMultiSelectMode);
  }, [isMultiSelectMode]);

  // Force update function for shape property changes
  const forceUpdate = useCallback(() => {
    setShapes(prev => [...prev]);
    setGroups(prev => [...prev]);
  }, []);

  // Layer management functions
  const bringToFront = useCallback(() => {
    if (selectedShapes.length === 0) return;
    
    const maxZIndex = Math.max(...shapes.map(s => s.properties.zIndex));
    selectedShapes.forEach(shape => {
      shape.properties.zIndex = maxZIndex + 1 + Math.random() * 0.1;
    });
    
    // Sort shapes by zIndex for proper rendering order
    setShapes(prev => [...prev].sort((a, b) => a.properties.zIndex - b.properties.zIndex));
  }, [selectedShapes, shapes]);

  const sendToBack = useCallback(() => {
    if (selectedShapes.length === 0) return;
    
    const minZIndex = Math.min(...shapes.map(s => s.properties.zIndex));
    selectedShapes.forEach(shape => {
      shape.properties.zIndex = minZIndex - 1 - Math.random() * 0.1;
    });
    
    // Sort shapes by zIndex for proper rendering order
    setShapes(prev => [...prev].sort((a, b) => a.properties.zIndex - b.properties.zIndex));
  }, [selectedShapes, shapes]);

  const bringForward = useCallback(() => {
    if (selectedShapes.length === 0) return;
    
    selectedShapes.forEach(shape => {
      shape.properties.zIndex += 1.1;
    });
    
    // Sort shapes by zIndex for proper rendering order
    setShapes(prev => [...prev].sort((a, b) => a.properties.zIndex - b.properties.zIndex));
  }, [selectedShapes]);

  const sendBackward = useCallback(() => {
    if (selectedShapes.length === 0) return;
    
    selectedShapes.forEach(shape => {
      shape.properties.zIndex -= 1.1;
    });
    
    // Sort shapes by zIndex for proper rendering order
    setShapes(prev => [...prev].sort((a, b) => a.properties.zIndex - b.properties.zIndex));
  }, [selectedShapes]);

  const changeBlendMode = useCallback((blendMode: BlendMode) => {
    if (selectedShapes.length === 0) return;
    
    selectedShapes.forEach(shape => {
      shape.properties.blendMode = blendMode;
    });
    
    setShapes(prev => [...prev]);
  }, [selectedShapes]);

  // Transform operations for selected points
  const scaleSelectedPoints = useCallback((factor: number) => {
    if (selectedPoints.length === 0) return;
    
    // Calculate center of selected points
    let centerX = 0, centerY = 0;
    const worldPoints: Point[] = [];
    
    selectedPoints.forEach(({ shapeId, pointIndex }) => {
      const shape = shapes.find(s => s.id === shapeId);
      if (shape) {
        const worldPoint = shape.getWorldPoint(pointIndex);
        if (worldPoint) {
          worldPoints.push(worldPoint);
          centerX += worldPoint.x;
          centerY += worldPoint.y;
        }
      }
    });
    
    if (worldPoints.length === 0) return;
    
    centerX /= worldPoints.length;
    centerY /= worldPoints.length;
    
    // Scale points around center
    selectedPoints.forEach(({ shapeId, pointIndex }, index) => {
      const shape = shapes.find(s => s.id === shapeId);
      if (shape && worldPoints[index]) {
        const worldPoint = worldPoints[index];
        const newX = centerX + (worldPoint.x - centerX) * factor;
        const newY = centerY + (worldPoint.y - centerY) * factor;
        shape.updateWorldPoint(pointIndex, { x: newX, y: newY });
      }
    });
    
    setShapes(prev => [...prev]);
  }, [selectedPoints, shapes]);

  const rotateSelectedPoints = useCallback((angle: number) => {
    if (selectedPoints.length === 0) return;
    
    // Calculate center of selected points
    let centerX = 0, centerY = 0;
    const worldPoints: Point[] = [];
    
    selectedPoints.forEach(({ shapeId, pointIndex }) => {
      const shape = shapes.find(s => s.id === shapeId);
      if (shape) {
        const worldPoint = shape.getWorldPoint(pointIndex);
        if (worldPoint) {
          worldPoints.push(worldPoint);
          centerX += worldPoint.x;
          centerY += worldPoint.y;
        }
      }
    });
    
    if (worldPoints.length === 0) return;
    
    centerX /= worldPoints.length;
    centerY /= worldPoints.length;
    
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // Rotate points around center
    selectedPoints.forEach(({ shapeId, pointIndex }, index) => {
      const shape = shapes.find(s => s.id === shapeId);
      if (shape && worldPoints[index]) {
        const worldPoint = worldPoints[index];
        const dx = worldPoint.x - centerX;
        const dy = worldPoint.y - centerY;
        const newX = centerX + dx * cos - dy * sin;
        const newY = centerY + dx * sin + dy * cos;
        shape.updateWorldPoint(pointIndex, { x: newX, y: newY });
      }
    });
    
    setShapes(prev => [...prev]);
  }, [selectedPoints, shapes]);

  const scaleSelectedSegments = useCallback((factor: number) => {
    if (selectedSegments.length === 0) return;
    
    // Calculate center of selected segments
    let centerX = 0, centerY = 0;
    const segmentPoints: Point[][] = [];
    
    selectedSegments.forEach(({ shapeId, segmentIndex }) => {
      const shape = shapes.find(s => s.id === shapeId);
      if (shape) {
        const point1 = shape.getWorldPoint(segmentIndex);
        const point2 = shape.getWorldPoint(segmentIndex + 1);
        if (point1 && point2) {
          segmentPoints.push([point1, point2]);
          centerX += (point1.x + point2.x) / 2;
          centerY += (point1.y + point2.y) / 2;
        }
      }
    });
    
    if (segmentPoints.length === 0) return;
    
    centerX /= segmentPoints.length;
    centerY /= segmentPoints.length;
    
    // Scale segments around center
    selectedSegments.forEach(({ shapeId, segmentIndex }, index) => {
      const shape = shapes.find(s => s.id === shapeId);
      if (shape && segmentPoints[index]) {
        const [point1, point2] = segmentPoints[index];
        
        const newX1 = centerX + (point1.x - centerX) * factor;
        const newY1 = centerY + (point1.y - centerY) * factor;
        const newX2 = centerX + (point2.x - centerX) * factor;
        const newY2 = centerY + (point2.y - centerY) * factor;
        
        shape.updateWorldPoint(segmentIndex, { x: newX1, y: newY1 });
        shape.updateWorldPoint(segmentIndex + 1, { x: newX2, y: newY2 });
      }
    });
    
    setShapes(prev => [...prev]);
  }, [selectedSegments, shapes]);

  const rotateSelectedSegments = useCallback((angle: number) => {
    if (selectedSegments.length === 0) return;
    
    // Calculate center of selected segments
    let centerX = 0, centerY = 0;
    const segmentPoints: Point[][] = [];
    
    selectedSegments.forEach(({ shapeId, segmentIndex }) => {
      const shape = shapes.find(s => s.id === shapeId);
      if (shape) {
        const point1 = shape.getWorldPoint(segmentIndex);
        const point2 = shape.getWorldPoint(segmentIndex + 1);
        if (point1 && point2) {
          segmentPoints.push([point1, point2]);
          centerX += (point1.x + point2.x) / 2;
          centerY += (point1.y + point2.y) / 2;
        }
      }
    });
    
    if (segmentPoints.length === 0) return;
    
    centerX /= segmentPoints.length;
    centerY /= segmentPoints.length;
    
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // Rotate segments around center
    selectedSegments.forEach(({ shapeId, segmentIndex }, index) => {
      const shape = shapes.find(s => s.id === shapeId);
      if (shape && segmentPoints[index]) {
        const [point1, point2] = segmentPoints[index];
        
        const dx1 = point1.x - centerX;
        const dy1 = point1.y - centerY;
        const newX1 = centerX + dx1 * cos - dy1 * sin;
        const newY1 = centerY + dx1 * sin + dy1 * cos;
        
        const dx2 = point2.x - centerX;
        const dy2 = point2.y - centerY;
        const newX2 = centerX + dx2 * cos - dy2 * sin;
        const newY2 = centerY + dx2 * sin + dy2 * cos;
        
        shape.updateWorldPoint(segmentIndex, { x: newX1, y: newY1 });
        shape.updateWorldPoint(segmentIndex + 1, { x: newX2, y: newY2 });
      }
    });
    
    setShapes(prev => [...prev]);
  }, [selectedSegments, shapes]);

  return {
    // State
    shapes,
    groups,
    selectedShapes,
    selectedGroups,
    enabledShapeTypes,
    scatterSettings,
    canvasSettings,
    canvasRef,
    editMode,
    selectedPoints,
    selectedSegments,
    isMultiSelectMode,
    marqueeStart,
    marqueeEnd,
    isMarqueeSelecting,
    isTouchDevice,
    isMultiTouch,
    
    // Actions
    generateRandomShapes,
    toggleShapeType,
    updateScatterSettings,
    composeShapes,
    scatterOnShape,
    setEditingMode,
    toggleMultiSelectMode,
    forceUpdate,
    
    // Layer Management
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    changeBlendMode,
    
    // Transforms
    moveSelected,
    scaleSelected,
    rotateSelected,
    skewSelected,
    flipSelected,
    deleteSelected,
    moveSelectedPoints,
    moveSelectedSegments,
    scaleSelectedPoints,
    rotateSelectedPoints,
    scaleSelectedSegments,
    rotateSelectedSegments,
    
    // Canvas
    zoomIn,
    zoomOut,
    resetView,
    
    // Events
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    
    // Computed
    selectedCount: selectedShapes.length + selectedGroups.length,
    selectedPointsCount: selectedPoints.length,
    selectedSegmentsCount: selectedSegments.length,
    canComposeShapes: selectedShapes.length >= 2,
    isScatterMode: scatterSettings.onPoints || scatterSettings.insideArea
  };
};
