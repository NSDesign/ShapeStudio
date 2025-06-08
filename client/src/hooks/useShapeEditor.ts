import { useState, useCallback, useRef, useEffect } from 'react';
import { Shape, ShapeGroupClass } from '../lib/shapes';
import { ShapeType, ScatterSettings, CanvasSettings } from '../lib/shapeTypes';

export const useShapeEditor = () => {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [groups, setGroups] = useState<ShapeGroupClass[]>([]);
  const [selectedShapes, setSelectedShapes] = useState<Shape[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<ShapeGroupClass[]>([]);
  const [enabledShapeTypes, setEnabledShapeTypes] = useState<Set<ShapeType>>(
    new Set(['rectangle', 'circle', 'polygon'])
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
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate random shapes
  const generateRandomShapes = useCallback(() => {
    const availableTypes = Array.from(enabledShapeTypes);
    if (availableTypes.length === 0) return;
    
    const newShapes: Shape[] = [];
    const numShapes = 3 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < numShapes; i++) {
      const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      const x = 100 + Math.random() * (canvasSettings.width - 300);
      const y = 100 + Math.random() * (canvasSettings.height - 300);
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

  const scaleSelected = useCallback((factor: number = 1.1) => {
    selectedShapes.forEach(shape => shape.scale(factor));
    selectedGroups.forEach(group => group.scale(factor));
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
    const x = (e.clientX - rect.left) / canvasSettings.zoom;
    const y = (e.clientY - rect.top) / canvasSettings.zoom;
    
    setDragStart({ x, y });
    setIsDragging(true);
    
    // If scatter mode is active, try to scatter on clicked shape
    if (scatterSettings.onPoints || scatterSettings.insideArea) {
      const clickedShape = shapes.find(shape => shape.containsPoint(x, y));
      if (clickedShape) {
        scatterOnShape(clickedShape);
        return;
      }
    }
    
    selectShapeAtPoint(x, y, e.shiftKey);
  }, [canvasSettings.zoom, scatterSettings, shapes, selectShapeAtPoint, scatterOnShape]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart || (selectedShapes.length === 0 && selectedGroups.length === 0)) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvasSettings.zoom;
    const y = (e.clientY - rect.top) / canvasSettings.zoom;
    
    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;
    
    moveSelected(deltaX, deltaY);
    setDragStart({ x, y });
  }, [isDragging, dragStart, selectedShapes.length, selectedGroups.length, canvasSettings.zoom, moveSelected]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

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
    
    // Actions
    generateRandomShapes,
    toggleShapeType,
    updateScatterSettings,
    composeShapes,
    scatterOnShape,
    
    // Transforms
    moveSelected,
    scaleSelected,
    rotateSelected,
    skewSelected,
    flipSelected,
    
    // Canvas
    zoomIn,
    zoomOut,
    resetView,
    
    // Events
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    
    // Computed
    selectedCount: selectedShapes.length + selectedGroups.length,
    canComposeShapes: selectedShapes.length >= 2,
    isScatterMode: scatterSettings.onPoints || scatterSettings.insideArea
  };
};
