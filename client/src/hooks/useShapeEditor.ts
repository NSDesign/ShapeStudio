import { useState, useCallback, useRef, useEffect } from 'react';
import { Shape, ShapeGroupClass } from '../lib/shapes';
import { ShapeType, ScatterSettings, CanvasSettings } from '../lib/shapeTypes';

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
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      } else {
        clickedShape.selected = true;
        setSelectedShapes(prev => multiSelect ? [...prev.filter(s => s !== clickedShape), clickedShape] : [clickedShape]);
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
    if (!clickedOnShape && !e.shiftKey && editMode === 'shapes') {
      setMarqueeStart({ x, y });
      setMarqueeEnd({ x, y });
      setIsMarqueeSelecting(true);
      // Clear existing selection when starting marquee
      clearSelection();
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
      
      // Select shapes within marquee rectangle
      const minX = Math.min(marqueeStart.x, x);
      const maxX = Math.max(marqueeStart.x, x);
      const minY = Math.min(marqueeStart.y, y);
      const maxY = Math.max(marqueeStart.y, y);
      
      shapes.forEach(shape => {
        const bounds = shape.getBounds();
        const shapeInMarquee = bounds.x >= minX && bounds.x + bounds.width <= maxX &&
                              bounds.y >= minY && bounds.y + bounds.height <= maxY;
        shape.selected = shapeInMarquee;
      });
      
      setShapes(prev => [...prev]);
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
    setIsDragging(false);
    setDragStart(null);
  }, []);

  // Touch event handlers for mobile multi-select
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 1) return; // Ignore multi-touch gestures
    
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left - canvasSettings.panX * canvasSettings.zoom) / canvasSettings.zoom;
    const y = (touch.clientY - rect.top - canvasSettings.panY * canvasSettings.zoom) / canvasSettings.zoom;
    
    setTouchStartTime(Date.now());
    setDragStart({ x, y });
    
    // Don't immediately select on touch start - wait for touch end to avoid drag conflicts
  }, [canvasSettings.zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!dragStart || e.touches.length > 1) return;
    
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left - canvasSettings.panX * canvasSettings.zoom) / canvasSettings.zoom;
    const y = (touch.clientY - rect.top - canvasSettings.panY * canvasSettings.zoom) / canvasSettings.zoom;
    
    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;
    
    // Start dragging if movement detected
    if (!isDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
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
    const touchDuration = Date.now() - touchStartTime;
    
    if (!isDragging && dragStart) {
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
    }
    
    setIsDragging(false);
    setDragStart(null);
    setTouchStartTime(0);
  }, [touchStartTime, isMultiSelectMode, isDragging, dragStart, canvasSettings.zoom, editMode, selectShapeAtPoint, selectPointAt, selectSegmentAt]);

  const toggleMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(!isMultiSelectMode);
  }, [isMultiSelectMode]);

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
    
    // Actions
    generateRandomShapes,
    toggleShapeType,
    updateScatterSettings,
    composeShapes,
    scatterOnShape,
    setEditingMode,
    toggleMultiSelectMode,
    
    // Transforms
    moveSelected,
    scaleSelected,
    rotateSelected,
    skewSelected,
    flipSelected,
    moveSelectedPoints,
    moveSelectedSegments,
    
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
