import { useState, useCallback, useRef, useEffect } from 'react';
import type { CurrentUIState } from './useGenerationSets';
import { useGenerationSetsPersistence } from './useGenerationSetsPersistence';
import { generateUniqueSetName as generateUniqueName } from '@/utils/nameGeneration';
import { Shape, ShapeGroupClass } from '../lib/shapes';
import { ShapeType, ScatterSettings, CanvasSettings, BlendMode, Point, Artboard, ColorManipulation, DistributionConfig, applyGridDistribution } from '../lib/shapeTypes';
import { SmartDistributionAlgorithm } from '../lib/distributionAlgorithm';
import { BooleanOperations } from '../lib/booleanOperations';
import { ColorUtils, ColorHarmonySettings } from '../lib/colorManipulation';
import { NoiseSystem } from '../lib/noiseSystem';
import { BatchConfigSettings, defaultBatchConfigSettings, GenerationSet, ShapeCountMode, SupportedShapeType } from '@shared/schema';
import { generateColor, generateGradientColors } from '../lib/hslColor';

// Interface for overriding UI state during generation (used for generation sets)
export interface GenerationContextOverrides {
  enabledShapeTypes?: Set<ShapeType>;
  batchConfig?: BatchConfigSettings;
  scatterSettings?: Partial<ScatterSettings>;
  setTransform?: {
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    transformOrigin: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  };
  artboardAlignment?: {
    fitToArtboard: boolean;
    alignTo: 'artboard' | 'set' | 'none';
    alignmentType: 'center' | 'top-left' | 'top-center' | 'top-right' | 
                   'center-left' | 'center-right' | 'bottom-left' | 
                   'bottom-center' | 'bottom-right';
    targetSetId?: string;
    margin: number;
  };
}

export const useShapeEditor = () => {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [groups, setGroups] = useState<ShapeGroupClass[]>([]);
  const [selectedShapes, setSelectedShapes] = useState<Shape[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<ShapeGroupClass[]>([]);
  const [enabledShapeTypes, setEnabledShapeTypes] = useState<Set<ShapeType>>(
    new Set(['rectangle' as ShapeType, 'rounded-rectangle' as ShapeType, 'square' as ShapeType, 'rounded-square' as ShapeType, 'circle' as ShapeType, 'polygon' as ShapeType])
  );
  const [scatterSettings, setScatterSettings] = useState<ScatterSettings>({
    onPoints: false,
    insideArea: false,
    count: 5,
    minCount: 1,
    maxCount: 20,
    randomness: 0.5,
    shapeCountMode: 'fixed',
    fixedShapeCount: 5,
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
        strokeCapProbabilities: { round: 33, square: 33, butt: 34 }
      },
      cubic: { 
        pointCountRange: [3, 8], 
        openProbability: 90,
        curvatureRange: [0.2, 0.8],
        spreadRange: [40, 120],
        patternType: 2
      },
      'smooth-spline': { 
        pointCountRange: [3, 6], 
        openProbability: 50,
        strokeCapProbabilities: { round: 33, square: 33, butt: 34 }
      },
      star: { pointCountRange: [5, 8], innerRadiusRange: [0.3, 0.7] },
      ring: { innerRadiusRange: [0.2, 0.8] },
      'spline-ring': { innerRadiusRange: [0.2, 0.8], segmentCountRange: [16, 32] },
      line: { 
        pointCountRange: [2, 4],
        strokeCapProbabilities: { round: 33, square: 33, butt: 34 }
      },
      'line-vector': {
        direction: { kind: 'range' as const, min: 0, max: 360 },
        length: { kind: 'range' as const, min: 5, max: 500 },
        centroid: { kind: 'fixed' as const, value: 0.5 },
        strokeCapProbabilities: { round: 33, square: 33, butt: 34 }
      },
      rectangle: {
        // Standard rectangle has no special properties
      },
      'rounded-rectangle': { 
        cornerRadiusRange: [0, 10],
        cornerRadiusMode: 'range' as const,
        cornerRadiusValue: 5
      },
      square: {
        // Standard square has no special properties
      },
      'rounded-square': { 
        cornerRadiusRange: [0, 10],
        cornerRadiusMode: 'range' as const,
        cornerRadiusValue: 5
      }
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
  const [generationConfigSettings, setGenerationConfigSettings] = useState<BatchConfigSettings>(defaultBatchConfigSettings);
  
  // Generation Sets persistence
  const {
    generationSets: persistedGenerationSets,
    currentSetId: persistedCurrentSetId,
    saveGenerationSets,
    isLoading: isLoadingGenerationSets,
    isReady: isPersistenceReady,
  } = useGenerationSetsPersistence();

  // Generation Sets Management - centralized state for bi-directional sync
  const [generationSets, setGenerationSets] = useState<GenerationSet[]>([]);
  const [currentGenerationSetId, setCurrentGenerationSetId] = useState<string | null>(null);
  const [hasManualChangesAfterRestore, setHasManualChangesAfterRestore] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Track if initial load is complete to prevent save loops
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  
  // Migration function to ensure old sets have new properties
  const migrateGenerationSets = useCallback((sets: GenerationSet[]): GenerationSet[] => {
    return sets.map(set => ({
      ...set,
      // Add new set-level properties with defaults if they don't exist
      setVisibility: set.setVisibility || {
        visible: true,
        opacity: 1.0,
        opacityVariance: 0.0
      },
      setBlendMode: set.setBlendMode || 'source-over',
      compositingOperation: set.compositingOperation || 'source-over',
      setTransform: set.setTransform || {
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1.0,
        scaleY: 1.0,
        transformOrigin: 'center'
      },
      artboardAlignment: set.artboardAlignment || {
        fitToArtboard: false,
        alignTo: 'none',
        alignmentType: 'center',
        margin: 0
      }
    }));
  }, []);

  // Sync persisted data to local state when loaded
  useEffect(() => {
    if (isPersistenceReady && persistedGenerationSets) {
      const migratedSets = migrateGenerationSets(persistedGenerationSets);
      setGenerationSets(migratedSets);
      setCurrentGenerationSetId(persistedCurrentSetId);
      setIsInitialLoadComplete(true);
      console.log('Loaded generation sets from persistence:', migratedSets.length, 'sets');
    }
  }, [isPersistenceReady, persistedGenerationSets, persistedCurrentSetId, migrateGenerationSets]);

  // Auto-save when generation sets or current set changes (only after initial load)
  useEffect(() => {
    if (isPersistenceReady && isInitialLoadComplete) {
      // Deep comparison for arrays and simple comparison for primitives
      const setsChanged = generationSets.length !== persistedGenerationSets.length ||
                         JSON.stringify(generationSets) !== JSON.stringify(persistedGenerationSets);
      const currentSetChanged = currentGenerationSetId !== persistedCurrentSetId;
      
      if (setsChanged || currentSetChanged) {
        // Debounce saves to avoid excessive API calls
        const timeoutId = setTimeout(() => {
          console.log('Auto-saving generation sets:', generationSets.length, 'sets');
          saveGenerationSets(generationSets, currentGenerationSetId)
            .catch(error => console.error('Failed to auto-save generation sets:', error));
        }, 1000);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [generationSets, currentGenerationSetId, saveGenerationSets, isPersistenceReady, isInitialLoadComplete, persistedGenerationSets, persistedCurrentSetId]);
  const [batchExportCount, setBatchExportCount] = useState(1);
  const [generationCountMode, setGenerationCountMode] = useState<'fixed' | 'range'>('fixed');
  
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

  // Sets Manager Dialog state
  const [isSetsManagerOpen, setIsSetsManagerOpen] = useState(false);

  // Track incremental index for continuous incremental positioning
  const [lastIncrementalIndex, setLastIncrementalIndex] = useState(0);

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
    // Mark as manually changed only if not during restore operation
    if (!isRestoring) {
      setHasManualChangesAfterRestore(true);
    }
  }, [isRestoring]);

  // Capture current UI state for comparison and saving
  const captureCurrentState = useCallback((): CurrentUIState => {
    return {
      enabledShapeTypes,
      scatterSettings,
      batchConfigSettings: generationConfigSettings,
      shapeCountMode: scatterSettings.shapeCountMode as ShapeCountMode,
      shapeCountFixed: scatterSettings.fixedShapeCount,
      shapeCountRange: [scatterSettings.minCount, scatterSettings.maxCount] as [number, number]
    };
  }, [enabledShapeTypes, scatterSettings, generationConfigSettings]);

  // Check if there are manual changes after the last set restore
  const hasUnsavedChanges = useCallback((setId: string | null): boolean => {
    if (!setId) return false;
    
    const set = generationSets.find(s => s.id === setId);
    if (!set) return false;

    console.log('🔄 [UNSAVED CHECK] Checking for manual changes in set:', set.name, 'ID:', setId);
    console.log('🔄 [UNSAVED CHECK] Has manual changes after restore:', hasManualChangesAfterRestore);
    
    // Simply check if user has made manual changes after the last restore
    if (hasManualChangesAfterRestore) {
      console.log('🔄 [UNSAVED] User has made manual changes since last restore');
      return true;
    }
    
    return false;
  }, [generationSets, hasManualChangesAfterRestore]);

  // UI state restoration from generation set
  const restoreUIStateFromSet = useCallback((setId: string) => {
    const set = generationSets.find(s => s.id === setId);
    if (!set) {
      console.warn('🔄 [SET RESTORE] Set not found:', setId);
      return;
    }

    console.log('🔄 [SET RESTORE] Restoring UI state from set:', set.name, 'ID:', setId);
    
    // Set restoring flag to prevent manual change tracking during restore
    setIsRestoring(true);
    console.log('🔄 [SET RESTORE] Shape types:', set.enabledShapeTypes);
    console.log('🔄 [SET RESTORE] Count mode:', set.shapeCountMode, 'Fixed:', set.shapeCountFixed, 'Range:', set.shapeCountRange);

    // Convert SupportedShapeType back to ShapeType Set
    const newShapeTypes = new Set(set.enabledShapeTypes as ShapeType[]);
    setEnabledShapeTypes(newShapeTypes);
    console.log('🔄 [SET RESTORE] Updated shape types to:', Array.from(newShapeTypes));
    
    // Restore scatter settings with proper shape count properties
    const restoredScatterSettings: ScatterSettings = {
      ...scatterSettings,
      shapeCountMode: set.shapeCountMode,
      fixedShapeCount: set.shapeCountFixed,
      count: set.shapeCountMode === 'fixed' ? set.shapeCountFixed : Math.floor((set.shapeCountRange[0] + set.shapeCountRange[1]) / 2),
      minCount: set.shapeCountRange[0],
      maxCount: set.shapeCountRange[1],
      shapeSpecific: {
        ...scatterSettings.shapeSpecific,
        ...(set.shapeSpecificProperties as any)
      }
    };
    setScatterSettings(restoredScatterSettings);
    console.log('🔄 [SET RESTORE] Updated scatter settings:', restoredScatterSettings.shapeCountMode, restoredScatterSettings.count);
    
    // Restore batch config settings
    setGenerationConfigSettings(set.batchConfig);
    console.log('🔄 [SET RESTORE] Updated generation config settings');
    
    // Reset manual changes flag since we just restored the set
    setHasManualChangesAfterRestore(false);
    console.log('🔄 [SET RESTORE] Reset manual changes flag');
    
    // Clear restoring flag
    setIsRestoring(false);
    console.log('🔄 [SET RESTORE] Cleared restoring flag');
    
    console.log('🔄 [SET RESTORE] ✅ Successfully restored UI state from set:', set.name);
  }, [generationSets, scatterSettings]);

  // Generation Sets handlers for bi-directional synchronization
  const handleGenerationSetsChange = useCallback((sets: GenerationSet[]) => {
    setGenerationSets(sets);
  }, []);

  const handleCurrentGenerationSetChange = useCallback((setId: string | null) => {
    console.log('🔄 [SET SWITCH] Attempting to switch to set:', setId);
    console.log('🔄 [SET SWITCH] Current set ID:', currentGenerationSetId);
    
    // Auto-save current state before switching (if there's a current set)
    if (currentGenerationSetId && hasUnsavedChanges(currentGenerationSetId)) {
      console.log('🔄 [SET SWITCH] Auto-saving current set before switch:', currentGenerationSetId);
      
      // Capture current state and update the set
      const currentState = captureCurrentState();
      const setIndex = generationSets.findIndex(s => s.id === currentGenerationSetId);
      if (setIndex !== -1) {
        const updatedSet = {
          ...generationSets[setIndex],
          enabledShapeTypes: Array.from(currentState.enabledShapeTypes) as SupportedShapeType[],
          shapeCountMode: currentState.shapeCountMode,
          shapeCountFixed: currentState.shapeCountFixed,
          shapeCountRange: currentState.shapeCountRange,
          batchConfig: currentState.batchConfigSettings
        };
        
        const newSets = [...generationSets];
        newSets[setIndex] = updatedSet;
        setGenerationSets(newSets);
        console.log('🔄 [SET SWITCH] ✅ Auto-saved current set changes');
      }
    }
    
    console.log('🔄 [SET SWITCH] ✅ Proceeding with set switch to:', setId);
    setCurrentGenerationSetId(setId);
    
    // Restore UI state if a set is selected
    if (setId) {
      console.log('🔄 [SET SWITCH] Restoring UI state for set:', setId);
      restoreUIStateFromSet(setId);
    }
  }, [currentGenerationSetId, hasUnsavedChanges, restoreUIStateFromSet, captureCurrentState, generationSets]);

  const handleBatchExportCountChange = useCallback((count: number) => {
    setBatchExportCount(count);
  }, []);

  const handleGenerationCountModeChange = useCallback((mode: 'fixed' | 'range') => {
    setGenerationCountMode(mode);
  }, []);

  // Generate unique set name with auto-increment using shared utility
  const generateUniqueSetName = useCallback((baseName?: string): string => {
    const existingNames = generationSets.map(set => set.name);
    return generateUniqueName(existingNames, baseName);
  }, [generationSets]);

  // Create a new generation set with current UI state
  const handleCreateGenerationSet = useCallback((customName?: string, currentUIState?: CurrentUIState) => {
    // Generate unique name if none provided
    const setName = customName || generateUniqueSetName();
    
    // Use currentUIState if provided, otherwise fall back to current component state
    const uiState = currentUIState || {
      enabledShapeTypes,
      scatterSettings,
      batchConfig: generationConfigSettings,
      shapeCountMode: scatterSettings.shapeCountMode,
      shapeCountFixed: scatterSettings.fixedShapeCount,
      shapeCountRange: [scatterSettings.minCount, scatterSettings.maxCount] as [number, number]
    };
    
    // Create new generation set with proper types
    const newSetId = `set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newSet: GenerationSet = {
      id: newSetId,
      name: setName,
      enabled: true,
      enabledShapeTypes: Array.from(uiState.enabledShapeTypes || enabledShapeTypes) as SupportedShapeType[],
      shapeCountMode: (uiState.shapeCountMode === 'fixed' ? ShapeCountMode.FIXED : ShapeCountMode.RANGE) || 
                      (scatterSettings.shapeCountMode === 'fixed' ? ShapeCountMode.FIXED : ShapeCountMode.RANGE),
      shapeCountFixed: uiState.shapeCountFixed ?? scatterSettings.fixedShapeCount,
      shapeCountRange: uiState.shapeCountRange ?? [scatterSettings.minCount, scatterSettings.maxCount] as [number, number],
      shapeSpecificProperties: {
        // Capture current shape-specific scatter settings
        ...Object.fromEntries(
          Object.entries(uiState.scatterSettings?.shapeSpecific || scatterSettings.shapeSpecific).map(([shapeType, settings]) => [
            shapeType,
            settings
          ])
        )
      },
      zIndexConfig: {
        baseOffset: 0,
        incrementPerShape: 1,
        incrementPerGeneration: 1000
      },
      batchConfig: { ...((uiState as any).batchConfigSettings || (uiState as any).batchConfig || generationConfigSettings) },
      generationOrder: generationSets.length,
      description: `Generated from current settings on ${new Date().toLocaleString()}`,
      // New set-level features with sensible defaults
      setVisibility: {
        visible: true,
        opacity: 1.0,
        opacityVariance: 0.0
      },
      setBlendMode: 'source-over',
      compositingOperation: 'source-over',
      setTransform: {
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1.0,
        scaleY: 1.0,
        transformOrigin: 'center'
      },
      artboardAlignment: {
        fitToArtboard: false,
        alignTo: 'none',
        alignmentType: 'center',
        margin: 0
      }
    };
    
    // Add to generation sets
    const newSets = [...generationSets, newSet];
    setGenerationSets(newSets);
    
    // Only auto-select if this is the first set (no current set exists)
    // This allows independent UI state for creating multiple sets with different configurations
    if (!currentGenerationSetId) {
      setCurrentGenerationSetId(newSetId);
    }
    
    return newSetId;
  }, [enabledShapeTypes, scatterSettings, generationConfigSettings, generationSets, generateUniqueSetName, currentGenerationSetId]);

  // Delete a generation set
  const handleDeleteGenerationSet = useCallback((setId: string) => {
    const newSets = generationSets.filter(set => set.id !== setId);
    setGenerationSets(newSets);
    
    // If we deleted the current set, clear selection or select first available
    if (currentGenerationSetId === setId) {
      setCurrentGenerationSetId(newSets.length > 0 ? newSets[0].id : null);
    }
  }, [generationSets, currentGenerationSetId]);

  // Handler to open the Sets Manager Dialog
  const handleOpenGenerationSetsManager = useCallback(() => {
    setIsSetsManagerOpen(true);
  }, []);

  const handleCloseGenerationSetsManager = useCallback(() => {
    setIsSetsManagerOpen(false);
  }, []);

  // Check if generation sets are enabled based on batch export settings
  const areSetsEnabled = useCallback((
    batchCount: number = batchExportCount,
    countMode: string = generationCountMode
  ): boolean => {
    return batchCount > 1 && countMode === 'fixed';
  }, [batchExportCount, generationCountMode]);

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
    console.log(`🎯 [SELECTION] Sorting ${shapes.length} shapes by z-index for selection`);
    console.log(`🎯 [SELECTION] Original z-indices: [${shapes.map(s => s.properties.zIndex).join(', ')}]`);
    console.log(`🎯 [SELECTION] Sorted z-indices (high→low): [${sortedShapes.map(s => s.properties.zIndex).join(', ')}]`);
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

    setShapes(prev => {
      // Calculate proper z-indices for scatter shapes to avoid conflicts
      const currentMaxZIndex = prev.length > 0 ? Math.max(...prev.map(s => s.properties.zIndex)) : 0;
      const shapesWithFixedZIndex = newShapes.map((shape, index) => {
        // Directly modify the existing Shape instance instead of creating a plain object
        shape.properties.zIndex = currentMaxZIndex + index + 1;
        return shape;
      });
      return [...prev, ...shapesWithFixedZIndex];
    });
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

  // Helper functions for enhanced position calculation
  const calculatePositionX = (settings: BatchConfigSettings, shapeIndex: number, artboardWidth: number, artboardHeight: number, batchSize: number): number => {
    // If properties are disabled, use fallback to sidebar settings
    if (!settings.propertiesEnabled || !settings.shapePropertiesEnabled) {
      return (Math.random() - 0.5) * artboardWidth * 0.8; // Fallback to random position
    }

    switch (settings.xPositionMode) {
      case 'range':
        const [minX, maxX] = settings.xPositionRange;
        // Simple random value between min and max like other range controls
        return minX + Math.random() * (maxX - minX);

      case 'value':
        return settings.xPositionValue;

      case 'directional':
        return calculateDirectionalPosition(settings, shapeIndex, artboardWidth, artboardHeight, batchSize).x;

      case 'incremental':
        // Use actual shape index, with optional reset per batch
        const effectiveIndex = settings.incrementalResetPerBatch ? shapeIndex : (shapeIndex + lastIncrementalIndex);
        let value = settings.xPositionStartValue + (effectiveIndex * settings.xPositionIncrement);
        
        // Apply modulation if enabled
        if (settings.xPositionModulationEnabled && settings.xPositionModulationValue > 0) {
          value = value % settings.xPositionModulationValue;
        }
        
        return value;

      default:
        return 0;
    }
  };

  // Helper functions for enhanced width/height calculation
  const calculateWidth = (settings: BatchConfigSettings, shapeIndex: number, artboardWidth: number, artboardHeight: number, batchSize: number): number => {
    // If properties are disabled, use fallback to deterministic default size
    if (!settings.propertiesEnabled || !settings.shapePropertiesEnabled) {
      return 100; // Deterministic fallback size
    }

    let baseWidth = 0;

    switch (settings.widthMode) {
      case 'range':
        const [minW, maxW] = settings.widthRange;
        const centerW = minW + (maxW - minW) / 2; // Center of range
        const rangeW = (maxW - minW) / 2; // Half range for ±variation
        const randomFactorW = (Math.random() - 0.5) * 2; // -1 to 1
        const scaledRandomW = randomFactorW * (settings.widthRandomizationScale / 100);
        baseWidth = centerW + (scaledRandomW * rangeW);
        break;

      case 'value':
        baseWidth = settings.widthValue;
        break;

      case 'incremental':
        // Use actual shape index, with optional reset per batch
        const effectiveIndex = settings.sizeIncrementalResetPerBatch ? shapeIndex : (shapeIndex + lastIncrementalIndex);
        baseWidth = settings.widthStartValue + (effectiveIndex * settings.widthIncrement);
        
        // Apply modulation if enabled
        if (settings.widthModulationEnabled && settings.widthModulationValue > 0) {
          baseWidth = baseWidth % settings.widthModulationValue;
        }
        break;

      default:
        baseWidth = 100;
    }

    // Apply basic size constraints (10px minimum, 1000px maximum)
    return Math.max(10, Math.min(1000, baseWidth));
  };

  const calculateHeight = (settings: BatchConfigSettings, shapeIndex: number, artboardWidth: number, artboardHeight: number, batchSize: number): number => {
    // If properties are disabled, use fallback to deterministic default size
    if (!settings.propertiesEnabled || !settings.shapePropertiesEnabled) {
      return 100; // Deterministic fallback size
    }

    let baseHeight = 0;

    switch (settings.heightMode) {
      case 'range':
        const [minH, maxH] = settings.heightRange;
        const centerH = minH + (maxH - minH) / 2; // Center of range
        const rangeH = (maxH - minH) / 2; // Half range for ±variation
        const randomFactorH = (Math.random() - 0.5) * 2; // -1 to 1
        const scaledRandomH = randomFactorH * (settings.heightRandomizationScale / 100);
        baseHeight = centerH + (scaledRandomH * rangeH);
        break;

      case 'value':
        baseHeight = settings.heightValue;
        break;

      case 'incremental':
        // Use actual shape index, with optional reset per batch
        const effectiveIndex = settings.sizeIncrementalResetPerBatch ? shapeIndex : (shapeIndex + lastIncrementalIndex);
        baseHeight = settings.heightStartValue + (effectiveIndex * settings.heightIncrement);
        
        // Apply modulation if enabled
        if (settings.heightModulationEnabled && settings.heightModulationValue > 0) {
          baseHeight = baseHeight % settings.heightModulationValue;
        }
        break;

      default:
        baseHeight = 100;
    }

    // Apply basic size constraints (10px minimum, 1000px maximum)
    return Math.max(10, Math.min(1000, baseHeight));
  };

  // Helper function to determine final size for circular shapes based on width/height constraint preferences
  const calculateConstrainedSize = (settings: BatchConfigSettings, width: number, height: number, shapeType: string): number => {
    // Only apply constraints to circular shapes (circle, star, ring, etc.)
    if (!['circle', 'star', 'ring', 'spline-circle', 'spline-ring'].includes(shapeType)) {
      return width; // For non-circular shapes, use width as-is
    }

    // If aspect ratio is enforced, use width
    if (settings.maintainAspectRatio) {
      return width;
    }

    // Apply constraint preferences
    if (settings.useMinWidthHeight) {
      return Math.min(width, height);
    }

    if (settings.useAvgWidthHeight) {
      return (width + height) / 2;
    }

    // Default: use maximum value (useMaxWidthHeight is default)
    return Math.max(width, height);
  };



  const calculatePositionY = (settings: BatchConfigSettings, shapeIndex: number, artboardWidth: number, artboardHeight: number, batchSize: number): number => {
    // If properties are disabled, use fallback to sidebar settings
    if (!settings.propertiesEnabled || !settings.shapePropertiesEnabled) {
      return (Math.random() - 0.5) * artboardHeight * 0.8; // Fallback to random position
    }

    switch (settings.yPositionMode) {
      case 'range':
        const [minY, maxY] = settings.yPositionRange;
        // Simple random value between min and max like other range controls
        return minY + Math.random() * (maxY - minY);

      case 'value':
        return settings.yPositionValue;

      case 'directional':
        return calculateDirectionalPosition(settings, shapeIndex, artboardWidth, artboardHeight, batchSize).y;

      case 'incremental':
        // Use actual shape index, with optional reset per batch
        const effectiveIndex = settings.incrementalResetPerBatch ? shapeIndex : (shapeIndex + lastIncrementalIndex);
        let value = settings.yPositionStartValue + (effectiveIndex * settings.yPositionIncrement);
        
        // Apply modulation if enabled
        if (settings.yPositionModulationEnabled && settings.yPositionModulationValue > 0) {
          value = value % settings.yPositionModulationValue;
        }
        
        return value;

      default:
        return 0;
    }
  };

  const calculateDirectionalPosition = (settings: BatchConfigSettings, shapeIndex: number, artboardWidth: number, artboardHeight: number, batchSize: number): { x: number, y: number } => {
    let angle = 0;
    let distance = settings.positionDirectionalDistance;

    switch (settings.positionDirectionalMode) {
      case 'outward-center':
        if (settings.directionalEvenDistribution) {
          // Even distribution around 360°
          angle = (shapeIndex * 360 / Math.max(1, batchSize)) * (Math.PI / 180);
        } else {
          // Cluster within specified angle range
          const clusterRange = settings.directionalClusterAngle * (Math.PI / 180);
          angle = (shapeIndex * clusterRange / Math.max(1, batchSize - 1)) - (clusterRange / 2);
        }
        break;

      case 'outward-edge':
        // Distribute shapes outward from nearest edge
        const edgeAngle = Math.atan2(artboardHeight, artboardWidth);
        if (settings.directionalEvenDistribution) {
          angle = (shapeIndex * 2 * Math.PI / Math.max(1, batchSize)) + edgeAngle;
        } else {
          const clusterRange = settings.directionalClusterAngle * (Math.PI / 180);
          angle = (shapeIndex * clusterRange / Math.max(1, batchSize - 1)) - (clusterRange / 2) + edgeAngle;
        }
        break;

      case 'angle-based':
        // All shapes at the same angle, but can be spread along the angle
        const baseAngle = settings.positionDirectionalAngle * (Math.PI / 180);
        if (settings.directionalEvenDistribution) {
          angle = baseAngle; // All at same angle
        } else {
          // Spread within cluster angle
          const clusterRange = settings.directionalClusterAngle * (Math.PI / 180);
          angle = baseAngle + (shapeIndex * clusterRange / Math.max(1, batchSize - 1)) - (clusterRange / 2);
        }
        break;
    }

    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance
    };
  };

  // Unified shape generation function that both regular and batch export can use
  const generateShapesWithBatchConfig = useCallback((
    count: number, 
    canvasBounds: { x: number; y: number; width: number; height: number },
    useDistribution: boolean = true,
    shapeGenerationIndex: number = 0,
    shapeSpecificPropertiesOverride?: Record<string, any>,
    overrides?: GenerationContextOverrides
  ): Shape[] => {
    // Use overrides if provided, otherwise fall back to UI state
    const effectiveEnabledTypes = overrides?.enabledShapeTypes 
      ? Array.from(overrides.enabledShapeTypes) 
      : Array.from(enabledShapeTypes);
    
    const effectiveBatchConfig = overrides?.batchConfig ?? generationConfigSettings;
    
    const effectiveScatterSettings = overrides?.scatterSettings 
      ? { ...scatterSettings, ...overrides.scatterSettings }
      : scatterSettings;

    console.log(`🔍 generateShapesWithBatchConfig: count=${count}, enabledTypes=${effectiveEnabledTypes.length}, types=${effectiveEnabledTypes.join(',')}, hasOverrides=${!!overrides}`);
    
    // DIAGNOSTIC: Log effectiveBatchConfig being used
    console.log(`🔍 [DIAGNOSTIC] effectiveBatchConfig in generateShapes:`, {
      source: overrides?.batchConfig ? 'FROM_OVERRIDES' : 'FROM_GLOBAL_UI',
      propertiesEnabled: effectiveBatchConfig.propertiesEnabled,
      fillColorMode: effectiveBatchConfig.fillColorMode,
      fillColorDefine: effectiveBatchConfig.fillColorDefine,
      fillOpacityDefine: effectiveBatchConfig.fillOpacityDefine,
      fillStyleProbability: effectiveBatchConfig.fillStyleProbability
    });

    if (effectiveEnabledTypes.length === 0) {
      console.log(`❌ No enabled shape types, returning empty array`);
      return [];
    }

    const positions = useDistribution ? SmartDistributionAlgorithm.generatePositions(
      count,
      canvasBounds,
      effectiveScatterSettings.distribution
    ) : Array.from({ length: count }, (_, i) => ({
      x: canvasBounds.x + (Math.random() - 0.5) * (canvasBounds.width * 0.8),
      y: canvasBounds.y + (Math.random() - 0.5) * (canvasBounds.height * 0.8)
    }));

    const newShapes = positions.map((position, index) => {
      const randomType = effectiveEnabledTypes[Math.floor(Math.random() * effectiveEnabledTypes.length)];

      // Apply position from batch config if properties are enabled
      let shapeX = position.x;
      let shapeY = position.y;

      if (effectiveBatchConfig.propertiesEnabled && effectiveBatchConfig.shapePropertiesEnabled) {
        // Enhanced position calculation based on mode
        shapeX = calculatePositionX(effectiveBatchConfig, index, canvasBounds.width, canvasBounds.height, positions.length);
        shapeY = calculatePositionY(effectiveBatchConfig, index, canvasBounds.width, canvasBounds.height, positions.length);
      }

      // Combine batch config with scatter settings for complete configuration
      // Deep merge shape-specific properties override if provided (from generation sets)
      const enhancedScatterSettings = shapeSpecificPropertiesOverride ? {
        ...effectiveScatterSettings,
        shapeSpecific: Object.fromEntries(
          // Get all unique shape type keys from both sources
          Array.from(new Set([
            ...Object.keys(effectiveScatterSettings.shapeSpecific || {}),
            ...Object.keys(shapeSpecificPropertiesOverride)
          ])).map((shapeType: string) => [
            shapeType,
            {
              // Deep merge: existing config + override for this shape type
              ...(effectiveScatterSettings.shapeSpecific?.[shapeType as keyof typeof effectiveScatterSettings.shapeSpecific] || {}),
              ...(shapeSpecificPropertiesOverride[shapeType] || {})
            }
          ])
        )
      } : effectiveScatterSettings;

      const combinedConfig = { 
        ...effectiveBatchConfig, 
        scatterSettings: enhancedScatterSettings 
      };
      const shape = new Shape(randomType, shapeX, shapeY, combinedConfig);

      // Apply width/height from batch config if properties are enabled
      if (effectiveBatchConfig.propertiesEnabled && effectiveBatchConfig.shapePropertiesEnabled) {
        // Enhanced width and height calculation based on mode
        let width = calculateWidth(effectiveBatchConfig, index, canvasBounds.width, canvasBounds.height, positions.length);
        let height = calculateHeight(effectiveBatchConfig, index, canvasBounds.width, canvasBounds.height, positions.length);

        // Check if 1:1 aspect ratio enforcement is enabled
        if (effectiveBatchConfig.maintainAspectRatio) {
          // Force 1:1 aspect ratio for ALL shape types
          const constrainedSize = calculateConstrainedSize(effectiveBatchConfig, width, height, shape.type);
          width = constrainedSize;
          height = constrainedSize;
        }

        // Apply the size based on shape type with constraint system
        switch (shape.type) {
          case 'rectangle':
          case 'rounded-rectangle':
            shape.width = width;
            shape.height = height;
            break;
          case 'square':
          case 'rounded-square':
            // Square always maintains 1:1 aspect ratio regardless of setting
            const squareSize = effectiveBatchConfig.maintainAspectRatio ? width : Math.max(width, height);
            shape.width = squareSize;
            shape.height = squareSize;
            break;
          case 'circle':
          case 'spline-circle':
            // Circular shapes use constraint system to determine final radius
            const circleSize = effectiveBatchConfig.maintainAspectRatio ? width : calculateConstrainedSize(effectiveBatchConfig, width, height, shape.type);
            shape.radius = circleSize / 2;
            break;
          case 'polygon':
            // Polygon uses constraint system for radius
            const polygonSize = effectiveBatchConfig.maintainAspectRatio ? width : calculateConstrainedSize(effectiveBatchConfig, width, height, shape.type);
            shape.radius = polygonSize / 2;
            break;
          case 'star':
            // Star uses constraint system for outer radius
            const starSize = effectiveBatchConfig.maintainAspectRatio ? width : calculateConstrainedSize(effectiveBatchConfig, width, height, shape.type);
            shape.radius = starSize / 2;
            break;
          case 'ring':
          case 'spline-ring':
            // Ring uses constraint system for outer radius
            const ringSize = effectiveBatchConfig.maintainAspectRatio ? width : calculateConstrainedSize(effectiveBatchConfig, width, height, shape.type);
            shape.radius = ringSize / 2;
            break;
          case 'line':
          case 'bezier':
          case 'cubic':
          case 'smooth-spline':
            // For lines and splines, when 1:1 is enforced, use same value for both dimensions
            if (shape.points.length >= 2) {
              const lineWidth = effectiveBatchConfig.maintainAspectRatio ? width : width;
              const lineHeight = effectiveBatchConfig.maintainAspectRatio ? width : height;
              const angle = Math.random() * Math.PI * 2;
              shape.points[1] = {
                x: shape.points[0].x + Math.cos(angle) * lineWidth,
                y: shape.points[0].y + Math.sin(angle) * lineHeight
              };
            }
            break;
        }
        
        // CRITICAL: Regenerate points after width/height changes to update visual rendering
        shape.regenerateShapePoints();
      }

      // Temporarily assign a placeholder z-index, will be fixed during state update
      shape.properties.zIndex = index + 1;

      console.log(`🔢 [Z-INDEX DEBUG] Shape ${index}: temporary z-index=${shape.properties.zIndex} (will be fixed in state update)`);
      console.log(`🔢 [Z-INDEX DEBUG] Shape ${index}: Shape ID=${shape.id}, Type=${shape.type}`);

      // Comprehensive shape summary
      console.log(`📋 [SHAPE SUMMARY] Shape ${index} (${shape.type}):`, {
        id: shape.id,
        layerIndex: shape.properties.zIndex,
        position: { x: shape.transform.x.toFixed(2), y: shape.transform.y.toFixed(2) },
        rotation: `${shape.transform.rotation.toFixed(2)}°`,
        scale: { x: shape.transform.scaleX.toFixed(3), y: shape.transform.scaleY.toFixed(3) },
        skew: { x: shape.transform.skewX.toFixed(2), y: shape.transform.skewY.toFixed(2) },
        fillColor: shape.properties.fillColor,
        strokeColor: shape.properties.strokeColor,
        hasGradient: !!shape.properties.gradient,
        blurRadius: shape.properties.blurRadius
      });

      // Apply color harmony if enabled
      if (effectiveBatchConfig.colorHarmonyEnabled) {
        const colorHarmonySettings: ColorHarmonySettings = {
          enabled: effectiveBatchConfig.colorHarmonyEnabled,
          harmonyType: effectiveBatchConfig.harmonyType,
          baseColor: effectiveBatchConfig.baseColor,
          hueVariance: effectiveBatchConfig.hueVariance,
          saturationRange: effectiveBatchConfig.saturationRange,
          lightnessRange: effectiveBatchConfig.lightnessRange,
          monochromaticSettings: effectiveBatchConfig.monochromaticSettings,
          analogousSettings: effectiveBatchConfig.analogousSettings,
          complementarySettings: effectiveBatchConfig.complementarySettings,
          triadicSettings: effectiveBatchConfig.triadicSettings,
          splitComplementarySettings: effectiveBatchConfig.splitComplementarySettings,
          tetradicSettings: effectiveBatchConfig.tetradicSettings
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

        console.log(`🎨 Applied ${effectiveBatchConfig.harmonyType} harmony - Fill: ${shape.properties.fillColor}, Stroke: ${shape.properties.strokeColor}`);
      } else if (effectiveBatchConfig.propertiesEnabled) {
        // When properties are enabled, don't pre-set colors here
        // Fill and stroke colors will be determined by probability logic below
        console.log(`🎯 [BATCH PROPERTIES] Shape ${index}: Properties enabled, colors will be set by probability logic`);

        // Set default transparent values - probability logic will override if needed
        shape.properties.fillColor = 'transparent';
        shape.properties.fillOpacity = 0;
        shape.properties.strokeColor = 'transparent';
        shape.properties.strokeOpacity = 0;
      } else {
          // Only apply legacy randomization if batch config properties are completely disabled
          if (!effectiveBatchConfig.propertiesEnabled) {
            // Original randomization behavior (before noise system)
            const hue = Math.random() * 360;
            const saturation = 50 + Math.random() * 50;
            const lightness = 30 + Math.random() * 40;
            const fillColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            shape.properties.fillColor = fillColor;
            console.log(`🔥 [LEGACY RANDOM] Shape ${index}: LEGACY HSL randomization applied! fillColor="${fillColor}" (properties disabled fallback) - propertiesEnabled=${effectiveBatchConfig.propertiesEnabled}`);

            // Random stroke color
            const strokeHue = Math.random() * 360;
            const strokeSaturation = 60 + Math.random() * 40;
            const strokeLightness = 20 + Math.random() * 60;
            const strokeColor = `hsl(${strokeHue}, ${strokeSaturation}%, ${strokeLightness}%)`;
            shape.properties.strokeColor = strokeColor;
            console.log(`🔥 [LEGACY RANDOM] Shape ${index}: LEGACY stroke color="${strokeColor}"`);
          } else {
            console.log(`🚫 [LEGACY SKIP] Shape ${index}: Skipping legacy randomization because propertiesEnabled=true. Current fillColor="${shape.properties.fillColor}"`);
          }
        }

      // Apply fill and stroke probabilities from batch config
      if (effectiveBatchConfig.propertiesEnabled) {
        // Handle fill style: solid vs gradient (not transparent vs opaque)
        if (effectiveBatchConfig.fillEnabled) {
          // Determine if this shape gets solid or gradient fill
          const shouldHaveSolidFill = Math.random() * 100 < effectiveBatchConfig.fillStyleProbability;
          const shouldHaveGradient = !shouldHaveSolidFill && effectiveBatchConfig.fillGradientEnabled;

          console.log(`🎨 [FILL DEBUG] Shape ${index}: fillStyleProb=${effectiveBatchConfig.fillStyleProbability}%, shouldHaveSolidFill=${shouldHaveSolidFill}, shouldHaveGradient=${shouldHaveGradient}`);

          // Determine fill type based on probabilities
          if (shouldHaveGradient) {
            // Determine gradient type based on individual probabilities
            const totalGradientProb = effectiveBatchConfig.fillGradientLinearProbability + 
                                    effectiveBatchConfig.fillGradientRadialProbability + 
                                    effectiveBatchConfig.fillGradientConicProbability;
            
            let gradientType: 'linear' | 'radial' | 'conic' = 'linear';
            
            if (totalGradientProb > 0) {
              const random = Math.random() * totalGradientProb;
              let cumulative = 0;
              
              cumulative += effectiveBatchConfig.fillGradientLinearProbability;
              if (random < cumulative) {
                gradientType = 'linear';
              } else {
                cumulative += effectiveBatchConfig.fillGradientRadialProbability;
                if (random < cumulative) {
                  gradientType = 'radial';
                } else {
                  gradientType = 'conic';
                }
              }
            }
            const [minStops, maxStops] = effectiveBatchConfig.fillGradientStopsRange;
            const stopCount = Math.floor(minStops + Math.random() * (maxStops - minStops + 1));

            const gradientStops = [];
            for (let i = 0; i < stopCount; i++) {
              let stopColor: string;

              if (effectiveBatchConfig.fillGradientColorMode === 'define') {
                // For define mode, use specific colors from the array
                const colors = effectiveBatchConfig.fillGradientColorDefine || ['#3b82f6'];
                stopColor = colors[i % colors.length];
              } else {
                // For range and palette modes, use generateColor
                stopColor = generateColor(
                  effectiveBatchConfig.fillGradientColorMode,
                  effectiveBatchConfig.fillGradientColorRange,
                  effectiveBatchConfig.fillGradientColorPalette,
                  undefined, // define is handled above
                  index + i,
                  effectiveBatchConfig.fillGradientColorMode === 'range' ? {
                    saturationRange: effectiveBatchConfig.fillGradientColorSaturationRange,
                    lightnessRange: effectiveBatchConfig.fillGradientColorLightnessRange
                  } : undefined
                );
              }

              gradientStops.push({
                offset: i / (stopCount - 1),
                color: stopColor
              });
            }

            shape.properties.gradient = {
              type: gradientType,
              stops: gradientStops
            };

            // When gradient is used, set transparent fill so gradient shows through
            shape.properties.fillColor = 'transparent';
            console.log(`🎨 [FILL DEBUG] Shape ${index}: Using ${gradientType.toUpperCase()} GRADIENT, fillColor set to transparent`);

            // Apply fill opacity based on mode
            if (effectiveBatchConfig.fillOpacityMode === 'range') {
              const [minOpacity, maxOpacity] = effectiveBatchConfig.fillOpacityRange;
              shape.properties.fillOpacity = (minOpacity + Math.random() * (maxOpacity - minOpacity)) / 100;
            } else if (effectiveBatchConfig.fillOpacityMode === 'define') {
              shape.properties.fillOpacity = effectiveBatchConfig.fillOpacityDefine / 100;
            }

          } else if (shouldHaveSolidFill) {
            // Create solid fill (only if no gradient)
            shape.properties.gradient = undefined;

            // Apply solid fill color using range mode with saturation/lightness controls
            const fillColor = generateColor(
              effectiveBatchConfig.fillColorMode,
              effectiveBatchConfig.fillColorRange,
              effectiveBatchConfig.fillColorPalette,
              effectiveBatchConfig.fillColorDefine,
              index,
              effectiveBatchConfig.fillColorMode === 'range' ? {
                saturationRange: effectiveBatchConfig.fillColorSaturationRange,
                lightnessRange: effectiveBatchConfig.fillColorLightnessRange
              } : undefined
            );
            shape.properties.fillColor = fillColor;
            console.log(`🎨 [FILL DEBUG] Shape ${index}: Using SOLID FILL, fillColor="${fillColor}" from mode="${effectiveBatchConfig.fillColorMode}"`);

            // Apply fill opacity based on mode
            if (effectiveBatchConfig.fillOpacityMode === 'range') {
              const [minOpacity, maxOpacity] = effectiveBatchConfig.fillOpacityRange;
              shape.properties.fillOpacity = (minOpacity + Math.random() * (maxOpacity - minOpacity)) / 100;
            } else if (effectiveBatchConfig.fillOpacityMode === 'define') {
              shape.properties.fillOpacity = effectiveBatchConfig.fillOpacityDefine / 100;
            }

          } else {
            // This should not happen in the new system - every shape gets either solid or gradient
            // If neither solid nor gradient, default to a solid fill
            console.log(`🎨 [FILL DEBUG] Shape ${index}: Fallback to default solid fill`);
            shape.properties.gradient = undefined;
            shape.properties.fillColor = '#3b82f6';
            shape.properties.fillOpacity = 0.8;
          }
        }

        // Handle stroke probability - PRIMARY GATE for all stroke properties
        if (effectiveBatchConfig.strokeEnabled) {
          const shouldHaveStroke = Math.random() * 100 < effectiveBatchConfig.strokeProbability;
          if (!shouldHaveStroke) {
            // No stroke - disable all stroke properties
            shape.properties.strokeColor = 'transparent';
            shape.properties.strokeOpacity = 0;
            shape.properties.strokeWidth = 0;
          } else {
            // Stroke enabled - apply all stroke properties

            // Apply stroke width range
            const [minWidth, maxWidth] = effectiveBatchConfig.strokeWidthRange;
            shape.properties.strokeWidth = minWidth + Math.random() * (maxWidth - minWidth);

            // Apply stroke opacity based on mode
            if (effectiveBatchConfig.strokeOpacityMode === 'range') {
              const [minOpacity, maxOpacity] = effectiveBatchConfig.strokeOpacityRange;
              shape.properties.strokeOpacity = (minOpacity + Math.random() * (maxOpacity - minOpacity)) / 100;
            } else if (effectiveBatchConfig.strokeOpacityMode === 'define') {
              shape.properties.strokeOpacity = effectiveBatchConfig.strokeOpacityDefine / 100;
            }

            // Apply stroke color using range mode with saturation/lightness controls
            const strokeColor = generateColor(
              effectiveBatchConfig.strokeColorMode,
              effectiveBatchConfig.strokeColorRange,
              effectiveBatchConfig.strokeColorPalette,
              effectiveBatchConfig.strokeColorDefine,
              index,
              effectiveBatchConfig.strokeColorMode === 'range' ? {
                saturationRange: effectiveBatchConfig.strokeColorSaturationRange,
                lightnessRange: effectiveBatchConfig.strokeColorLightnessRange
              } : undefined
            );
            shape.properties.strokeColor = strokeColor;
          }
        } else {
          // Stroke section disabled - ensure no stroke
          shape.properties.strokeColor = 'transparent';
          shape.properties.strokeOpacity = 0;
          shape.properties.strokeWidth = 0;
        }

        // Handle blur properties
        if (effectiveBatchConfig.blurEnabled) {
          const shouldHaveBlur = Math.random() * 100 < effectiveBatchConfig.blurProbability;
          if (shouldHaveBlur) {
            // Apply blur based on mode
            if (effectiveBatchConfig.blurMode === 'range') {
              const [minBlur, maxBlur] = effectiveBatchConfig.blurRange;
              shape.properties.blurRadius = minBlur + Math.random() * (maxBlur - minBlur);
            } else if (effectiveBatchConfig.blurMode === 'define') {
              shape.properties.blurRadius = effectiveBatchConfig.blurDefine;
            }
            console.log(`🌊 [BLUR] Shape ${index}: Applied blur radius=${shape.properties.blurRadius}px`);
          } else {
            shape.properties.blurRadius = 0;
            console.log(`🌊 [BLUR] Shape ${index}: No blur applied (probability failed)`);
          }
        } else {
          // Blur section disabled - ensure no blur
          shape.properties.blurRadius = 0;
        }

        // Apply shape transforms if enabled
        if (effectiveBatchConfig.transformsEnabled) {
          // Apply enhanced position transforms (X)
          if (effectiveBatchConfig.xTransformMode === 'range') {
            const [minTransX, maxTransX] = effectiveBatchConfig.translateXRange;
            const randomization = minTransX + Math.random() * (maxTransX - minTransX);
            shape.transform.x += randomization;
          } else if (effectiveBatchConfig.xTransformMode === 'value') {
            const baseValue = effectiveBatchConfig.xTransformValue || 0;
            // Add small random variation for value mode
            const randomVariation = (Math.random() * 2 - 1) * 50; // ±50px variation
            shape.transform.x += baseValue + randomVariation;
          } else if (effectiveBatchConfig.xTransformMode === 'incremental') {
            // Incremental mode: each shape gets progressively more transform
            const incrementAmount = (effectiveBatchConfig.xTransformIncrement || 0) * index;
            // Add small random variation for incremental mode
            const randomVariation = (Math.random() * 2 - 1) * 25; // ±25px variation
            shape.transform.x += incrementAmount + randomVariation;
          }

          // Apply enhanced position transforms (Y)
          if (effectiveBatchConfig.yTransformMode === 'range') {
            const [minTransY, maxTransY] = effectiveBatchConfig.translateYRange;
            const randomization = minTransY + Math.random() * (maxTransY - minTransY);
            shape.transform.y += randomization;
          } else if (effectiveBatchConfig.yTransformMode === 'value') {
            const baseValue = effectiveBatchConfig.yTransformValue || 0;
            // Add small random variation for value mode
            const randomVariation = (Math.random() * 2 - 1) * 50; // ±50px variation
            shape.transform.y += baseValue + randomVariation;
          } else if (effectiveBatchConfig.yTransformMode === 'incremental') {
            // Incremental mode: each shape gets progressively more transform
            const incrementAmount = (effectiveBatchConfig.yTransformIncrement || 0) * index;
            // Add small random variation for incremental mode
            const randomVariation = (Math.random() * 2 - 1) * 25; // ±25px variation
            shape.transform.y += incrementAmount + randomVariation;
          }

          // Apply enhanced scale transforms
          if (effectiveBatchConfig.maintainScaleAspectRatio) {
            // Use scaleX mode for both X and Y when aspect ratio is linked
            if (effectiveBatchConfig.scaleXMode === 'range') {
              const [minScale, maxScale] = effectiveBatchConfig.scaleXRange;
              // Convert percentage to decimal like value mode (50% = 0.5, 100% = 1.0)
              const randomScale = (minScale + Math.random() * (maxScale - minScale)) / 100;
              shape.transform.scaleX = Math.max(0.1, randomScale); // Prevent negative scale
              shape.transform.scaleY = Math.max(0.1, randomScale);
            } else if (effectiveBatchConfig.scaleXMode === 'value') {
              const baseScale = (effectiveBatchConfig.scaleXValue || 100) / 100; // Convert percentage to decimal (100% = 1.0)
              shape.transform.scaleX = Math.max(0.1, baseScale);
              shape.transform.scaleY = Math.max(0.1, baseScale);
            } else if (effectiveBatchConfig.scaleXMode === 'incremental') {
              const incrementAmount = (effectiveBatchConfig.scaleXIncrement || 0) * index;
              const finalScale = 1 + incrementAmount;
              shape.transform.scaleX = Math.max(0.1, finalScale);
              shape.transform.scaleY = Math.max(0.1, finalScale);
            }
          } else {
            // Independent scale X and Y
            // Scale X
            if (effectiveBatchConfig.scaleXMode === 'range') {
              const [minScaleX, maxScaleX] = effectiveBatchConfig.scaleXRange;
              // Convert percentage to decimal like value mode (50% = 0.5, 100% = 1.0)
              const randomScale = (minScaleX + Math.random() * (maxScaleX - minScaleX)) / 100;
              shape.transform.scaleX = Math.max(0.1, randomScale);
            } else if (effectiveBatchConfig.scaleXMode === 'value') {
              const baseScale = (effectiveBatchConfig.scaleXValue || 100) / 100; // Convert percentage to decimal (100% = 1.0)
              shape.transform.scaleX = Math.max(0.1, baseScale);
            } else if (effectiveBatchConfig.scaleXMode === 'incremental') {
              const incrementAmount = (effectiveBatchConfig.scaleXIncrement || 0) * index;
              const finalScale = 1 + incrementAmount;
              shape.transform.scaleX = Math.max(0.1, finalScale);
            }

            // Scale Y
            if (effectiveBatchConfig.scaleYMode === 'range') {
              const [minScaleY, maxScaleY] = effectiveBatchConfig.scaleYRange;
              // Convert percentage to decimal like value mode (50% = 0.5, 100% = 1.0)
              const randomScale = (minScaleY + Math.random() * (maxScaleY - minScaleY)) / 100;
              shape.transform.scaleY = Math.max(0.1, randomScale);
            } else if (effectiveBatchConfig.scaleYMode === 'value') {
              const baseScale = (effectiveBatchConfig.scaleYValue || 100) / 100; // Convert percentage to decimal (100% = 1.0)
              shape.transform.scaleY = Math.max(0.1, baseScale);
            } else if (effectiveBatchConfig.scaleYMode === 'incremental') {
              const incrementAmount = (effectiveBatchConfig.scaleYIncrement || 0) * index;
              const finalScale = 1 + incrementAmount;
              shape.transform.scaleY = Math.max(0.1, finalScale);
            }
          }

          // Apply enhanced rotation transforms
          if (effectiveBatchConfig.rotationMode === 'range') {
            const [minRot, maxRot] = effectiveBatchConfig.rotationRange;
            const baseRotation = minRot + Math.random() * (maxRot - minRot);
            console.log(`🔄 [ENHANCED ROTATION RANGE] Shape ${index}: base=${baseRotation.toFixed(2)}°, range=${minRot}-${maxRot}`);
            shape.transform.rotation = baseRotation;
          } else if (effectiveBatchConfig.rotationMode === 'value') {
            const baseRotation = effectiveBatchConfig.rotationValue || 0;
            console.log(`🔄 [ENHANCED ROTATION VALUE] Shape ${index}: fixed value=${baseRotation}°`);
            shape.transform.rotation = baseRotation;
          } else if (effectiveBatchConfig.rotationMode === 'incremental') {
            // Incremental mode: each shape gets progressively more rotation
            let incrementAmount = (effectiveBatchConfig.rotationIncrement || 0) * index;
            
            // Apply modulation if enabled
            if (effectiveBatchConfig.rotationModulationEnabled && effectiveBatchConfig.rotationModulation > 0) {
              incrementAmount = incrementAmount % effectiveBatchConfig.rotationModulation;
            }
            
            console.log(`🔄 [ENHANCED ROTATION INCREMENTAL] Shape ${index}: increment=${incrementAmount}°`);
            shape.transform.rotation = incrementAmount;
          }

          // Apply skew if configured (legacy system)
          if (effectiveBatchConfig.skewXRange && effectiveBatchConfig.skewYRange) {
            const [minSkewX, maxSkewX] = effectiveBatchConfig.skewXRange;
            const [minSkewY, maxSkewY] = effectiveBatchConfig.skewYRange;
            shape.transform.skewX = minSkewX + Math.random() * (maxSkewX - minSkewX);
            shape.transform.skewY = minSkewY + Math.random() * (maxSkewY - minSkewY);
          }
        }

        // Apply rotation randomization if enabled (additive to any existing rotation)
        if (effectiveBatchConfig.rotationRandomizationScale > 0) {
          const randomVariation = (Math.random() * 2 - 1) * 30; // ±30° base variation
          const scaledVariation = randomVariation * (effectiveBatchConfig.rotationRandomizationScale / 100);
          shape.transform.rotation += scaledVariation;
          console.log(`🎲 [ROTATION RANDOMIZATION] Shape ${index}: Added ${scaledVariation.toFixed(2)}° variation (scale=${effectiveBatchConfig.rotationRandomizationScale}%)`);
        }
      }

      console.log(`🧪 [PRE-NOISE] Shape ${index}: BEFORE noise processing, fillColor="${shape.properties.fillColor}", noiseEnabled=${effectiveBatchConfig.noiseEnabled}`);

      // Apply noise variations ONLY if enabled - this fixes the disabled state issue
      if (effectiveBatchConfig.noiseEnabled) {
        console.log(`🌊 [NOISE START] Shape ${index}: Entering noise processing, current fillColor="${shape.properties.fillColor}"`);

        // Get current artboard dimensions
        const currentArtboard = artboards.find(ab => ab.id === activeArtboard);
        const artboardWidth = currentArtboard?.width || 400;
        const artboardHeight = currentArtboard?.height || 400;

        const noiseResult = NoiseSystem.generateNoiseVariation(
          index, 
          effectiveBatchConfig, 
          position.x, 
          position.y,
          artboardWidth,
          artboardHeight
        );

        console.log(`🎲 [NOISE VALUES] Shape ${index}: noiseResult.hue=${noiseResult.hue}, saturation=${noiseResult.saturation}, lightness=${noiseResult.lightness}`);

        // Apply additive noise to position (simplified, no mode selection)
        shape.transform.x += noiseResult.x;
        shape.transform.y += noiseResult.y;

        // Apply additive noise to rotation
        shape.transform.rotation += noiseResult.rotation;

        // Apply additive noise to scale
        shape.transform.scaleX += noiseResult.scaleX * 0.1;
        shape.transform.scaleY += noiseResult.scaleY * 0.1;

        // Apply noise to opacity - only if opacity noise is enabled in Properties section
        if (effectiveBatchConfig.propertiesEnabled && effectiveBatchConfig.noiseOpacityAmplitude > 0) {
          // Apply additive noise to batch config opacity values
          const baseOpacity = shape.properties.fillOpacity;
          const noiseOpacity = baseOpacity + (noiseResult.opacity - 1) * 0.3; // Scale noise effect
          shape.properties.fillOpacity = Math.max(0.1, Math.min(1, noiseOpacity));
          shape.properties.strokeOpacity = Math.max(0.1, Math.min(1, noiseOpacity));
        }
        // If opacity Properties section is disabled, preserve batch config opacity values

        // Apply noise to blur
        shape.properties.blurRadius = Math.max(0, noiseResult.blur);

        console.log(`🎨 [COLOR CHECK] Shape ${index}: About to apply noise colors. colorHarmonyEnabled=${effectiveBatchConfig.colorHarmonyEnabled}, current fillColor="${shape.properties.fillColor}"`);

        // Apply noise to colors if color harmony is not enabled
        if (!effectiveBatchConfig.colorHarmonyEnabled) {
          console.log(`🔍 [COLOR BRANCH] Shape ${index}: Entering color noise processing. noiseAlgorithm="${effectiveBatchConfig.noiseAlgorithm}"`);

          if (effectiveBatchConfig.noiseAlgorithm === 'randomise') {
            console.log(`🎯 [RANDOMISE BRANCH] Shape ${index}: BEFORE randomise - fillColor="${shape.properties.fillColor}"`);

            // Randomise uses absolute values like original
            const hue = noiseResult.hue; // Direct 0-360° value
            const saturation = noiseResult.saturation; // Direct 50-100% value  
            const lightness = noiseResult.lightness; // Direct 30-70% value

            const noiseColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

            console.log(`💥 [COLOR OVERRIDE] Shape ${index}: *** THIS IS THE OVERRIDE *** fillColor changing from "${shape.properties.fillColor}" to "${noiseColor}"`);

            shape.properties.fillColor = noiseColor;
            console.log(`🌊 [NOISE COLOR] Shape ${index}: NOISE randomise applied! fillColor="${noiseColor}"`);
          } else if (effectiveBatchConfig.noiseAlgorithm === 'perlin') {
            console.log(`🎯 [PERLIN BRANCH] Shape ${index}: BEFORE perlin - fillColor="${shape.properties.fillColor}"`);

            // Extract existing HSL values for variation-based algorithms
            let hue = 0, saturation = 50, lightness = 50;
            const hslMatch = shape.properties.fillColor?.match(/hsl\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)%,\s*(\d+(?:\.\d+)?)%\)/);
            if (hslMatch) {
              hue = parseFloat(hslMatch[1]);
              saturation = parseFloat(hslMatch[2]);
              lightness = parseFloat(hslMatch[3]);
            }

            // Apply variations
            hue = (hue + noiseResult.hue + 360) % 360; // Add variation and wrap
            saturation = Math.max(0, Math.min(100, saturation + noiseResult.saturation));
            lightness = Math.max(0, Math.min(100, lightness + noiseResult.lightness));

            const noiseColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

            console.log(`💥 [COLOR OVERRIDE] Shape ${index}: *** THIS IS THE OVERRIDE *** fillColor changing from "${shape.properties.fillColor}" to "${noiseColor}"`);

            shape.properties.fillColor = noiseColor;
            console.log(`🌊 [NOISE COLOR] Shape ${index}: NOISE perlin applied! fillColor="${noiseColor}" (from base: ${hslMatch?.[0] || 'no match'})`);

            // Random stroke color (original behavior - use different seed offset)
            const strokeHue = (hue + 180) % 360; // Complementary hue
            const strokeSaturation = 60 + (noiseResult.saturation * 0.8) * 40; // Map to 60-100%
            const strokeLightness = 20 + (noiseResult.lightness * 0.7) * 60; // Map to 20-80%
            shape.properties.strokeColor = `hsl(${strokeHue}, ${strokeSaturation}%, ${strokeLightness}%)`;
          } else {
            console.log(`🎯 [OTHER ALGORITHM BRANCH] Shape ${index}: BEFORE other algorithm - fillColor="${shape.properties.fillColor}", algorithm="${effectiveBatchConfig.noiseAlgorithm}"`);

            // Other noise algorithms use additive variation
            const baseHue = Math.random() * 360;
            const baseSaturation = 60 + Math.random() * 30;
            const baseLightness = 40 + Math.random() * 30;

            const finalHue = (baseHue + noiseResult.hue + 360) % 360;
            const finalSaturation = Math.max(10, Math.min(95, baseSaturation + noiseResult.saturation));
            const finalLightness = Math.max(15, Math.min(85, baseLightness + noiseResult.lightness));

            const noiseColor = `hsl(${finalHue}, ${finalSaturation}%, ${finalLightness}%)`;

            console.log(`💥 [COLOR OVERRIDE] Shape ${index}: *** THIS IS THE OVERRIDE *** fillColor changing from "${shape.properties.fillColor}" to "${noiseColor}"`);

            shape.properties.fillColor = noiseColor;
            console.log(`🌊 [NOISE COLOR] Shape ${index}: NOISE ${effectiveBatchConfig.noiseAlgorithm} applied! fillColor="${noiseColor}"`);

            const strokeHue = (finalHue + 30 + noiseResult.hue * 0.3) % 360;
            const strokeSaturation = Math.max(10, Math.min(95, baseSaturation + noiseResult.saturation * 0.8));
            const strokeLightness = Math.max(15, Math.min(85, baseLightness + noiseResult.lightness * 0.7));
            shape.properties.strokeColor = `hsl(${strokeHue}, ${strokeSaturation}%, ${strokeLightness}%)`;
          }
        } else {
          console.log(`⏭️ [SKIP COLOR] Shape ${index}: Skipping color noise due to colorHarmonyEnabled=true`);
        }

        console.log(`🔊 Applied ${effectiveBatchConfig.noiseAlgorithm} noise to shape ${index}: pos(${noiseResult.x.toFixed(1)}, ${noiseResult.y.toFixed(1)}), rot(${noiseResult.rotation.toFixed(1)}), scale(${noiseResult.scaleX.toFixed(2)})`);
      } else {
        console.log(`🚫 [NO NOISE] Shape ${index}: Noise disabled, entering non-noise branch`);

        // Skip legacy randomization - transforms are now handled by the enhanced transform system above
        // Preserve batch config opacity values when noise is disabled
        // (opacity values were already set by batch config earlier in the generation process)

        console.log(`🔧 [NO NOISE] Shape ${index}: Noise disabled, applying transform only. Current fillColor="${shape.properties.fillColor}"`);
      }

      console.log(`✅ [POST-NOISE] Shape ${index}: AFTER noise processing, final fillColor="${shape.properties.fillColor}"`);
      console.log(`📊 [SUMMARY] Shape ${index}: ${shape.properties.fillColor === 'transparent' ? '❌ TRANSPARENT LOST' : '✅ Color preserved'}`);

      return shape;
    });

    // Apply grid distribution if enabled
    let finalShapes = newShapes;
    if (effectiveBatchConfig.distributionLayoutEnabled) {
      const distributionConfig: DistributionConfig = {
        enabled: effectiveBatchConfig.distributionLayoutEnabled,
        pattern: effectiveBatchConfig.distributionPattern,
        gridRows: effectiveBatchConfig.gridRows,
        gridColumns: effectiveBatchConfig.gridColumns,
        gridRowOffset: effectiveBatchConfig.gridRowOffset,
        gridColumnOffset: effectiveBatchConfig.gridColumnOffset,
        gridSortBy: effectiveBatchConfig.gridSortBy,
        gridSortScope: effectiveBatchConfig.gridSortScope,
        gridSortOrder: effectiveBatchConfig.gridSortOrder,
        gridXRandomization: effectiveBatchConfig.gridXRandomization,
        gridYRandomization: effectiveBatchConfig.gridYRandomization,
        positionsEnabled: effectiveBatchConfig.positionsEnabled
      };

      // Apply grid positioning additively with existing positions
      // For now, assume single generation per call (can be enhanced for batch exports)
      const generationInfo = {
        currentGeneration: 0,
        totalGenerations: 1,
        shapesPerGeneration: newShapes.length
      };
      
      finalShapes = applyGridDistribution(newShapes, distributionConfig, { x: 0, y: 0 }, generationInfo);
      console.log(`🎯 Applied grid distribution: ${effectiveBatchConfig.gridRows}×${effectiveBatchConfig.gridColumns}, sort by ${effectiveBatchConfig.gridSortBy} (${effectiveBatchConfig.gridSortOrder}, ${effectiveBatchConfig.gridSortScope})`);
    }

    // Apply setTransform if provided in overrides
    if (overrides?.setTransform) {
      const setTransform = overrides.setTransform;
      if (setTransform.x !== 0 || setTransform.y !== 0 || 
          setTransform.rotation !== 0 || setTransform.scaleX !== 1 || setTransform.scaleY !== 1) {
        console.log(`🔄 Applying setTransform from overrides: x=${setTransform.x}, y=${setTransform.y}, rotation=${setTransform.rotation}, scaleX=${setTransform.scaleX}, scaleY=${setTransform.scaleY}`);
        
        finalShapes.forEach(shape => {
          shape.transform.x += setTransform.x;
          shape.transform.y += setTransform.y;
          shape.transform.rotation += setTransform.rotation;
          shape.transform.scaleX *= setTransform.scaleX;
          shape.transform.scaleY *= setTransform.scaleY;
        });
      }
    }

    // Apply artboard alignment if provided in overrides
    if (overrides?.artboardAlignment) {
      const currentArtboard = artboards.find(ab => ab.id === activeArtboard);
      
      if (overrides.artboardAlignment.fitToArtboard && currentArtboard && finalShapes.length > 0) {
        console.log(`📐 Applying fitToArtboard from overrides`);
        
        // Calculate bounding box of all shapes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        finalShapes.forEach(shape => {
          const x = shape.transform.x;
          const y = shape.transform.y;
          const halfWidth = ((shape.width || 50) * shape.transform.scaleX) / 2;
          const halfHeight = ((shape.height || 50) * shape.transform.scaleY) / 2;
          
          minX = Math.min(minX, x - halfWidth);
          minY = Math.min(minY, y - halfHeight);
          maxX = Math.max(maxX, x + halfWidth);
          maxY = Math.max(maxY, y + halfHeight);
        });
        
        const setBoundsWidth = maxX - minX;
        const setBoundsHeight = maxY - minY;
        const setCenterX = (minX + maxX) / 2;
        const setCenterY = (minY + maxY) / 2;
        
        // Calculate scale to fit within artboard with margin
        const margin = overrides.artboardAlignment.margin || 0;
        const availableWidth = currentArtboard.width - (margin * 2);
        const availableHeight = currentArtboard.height - (margin * 2);
        
        const scaleX = availableWidth / setBoundsWidth;
        const scaleY = availableHeight / setBoundsHeight;
        const fitScale = Math.min(scaleX, scaleY, 1);
        
        // Apply scale and center to artboard
        finalShapes.forEach(shape => {
          const relX = shape.transform.x - setCenterX;
          const relY = shape.transform.y - setCenterY;
          
          shape.transform.x = currentArtboard.x + currentArtboard.width / 2 + (relX * fitScale);
          shape.transform.y = currentArtboard.y + currentArtboard.height / 2 + (relY * fitScale);
          shape.transform.scaleX *= fitScale;
          shape.transform.scaleY *= fitScale;
        });
        
        console.log(`✅ Fitted shapes to artboard with scale=${fitScale.toFixed(2)}`);
      } else if (overrides.artboardAlignment.alignTo !== 'none' && currentArtboard && finalShapes.length > 0) {
        console.log(`🎯 Applying alignment from overrides: ${overrides.artboardAlignment.alignmentType}`);
        
        // Calculate bounding box center
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        finalShapes.forEach(shape => {
          const x = shape.transform.x;
          const y = shape.transform.y;
          const halfWidth = (shape.width || 50) / 2;
          const halfHeight = (shape.height || 50) / 2;
          
          minX = Math.min(minX, x - halfWidth);
          minY = Math.min(minY, y - halfHeight);
          maxX = Math.max(maxX, x + halfWidth);
          maxY = Math.max(maxY, y + halfHeight);
        });
        
        const setCenterX = (minX + maxX) / 2;
        const setCenterY = (minY + maxY) / 2;
        const margin = overrides.artboardAlignment.margin || 0;
        
        // Calculate target position based on alignment type
        let targetX = currentArtboard.x + currentArtboard.width / 2;
        let targetY = currentArtboard.y + currentArtboard.height / 2;
        
        switch (overrides.artboardAlignment.alignmentType) {
          case 'top-left':
            targetX = currentArtboard.x + margin;
            targetY = currentArtboard.y + margin;
            break;
          case 'top-center':
            targetX = currentArtboard.x + currentArtboard.width / 2;
            targetY = currentArtboard.y + margin;
            break;
          case 'top-right':
            targetX = currentArtboard.x + currentArtboard.width - margin;
            targetY = currentArtboard.y + margin;
            break;
          case 'center-left':
            targetX = currentArtboard.x + margin;
            targetY = currentArtboard.y + currentArtboard.height / 2;
            break;
          case 'center':
            targetX = currentArtboard.x + currentArtboard.width / 2;
            targetY = currentArtboard.y + currentArtboard.height / 2;
            break;
          case 'center-right':
            targetX = currentArtboard.x + currentArtboard.width - margin;
            targetY = currentArtboard.y + currentArtboard.height / 2;
            break;
          case 'bottom-left':
            targetX = currentArtboard.x + margin;
            targetY = currentArtboard.y + currentArtboard.height - margin;
            break;
          case 'bottom-center':
            targetX = currentArtboard.x + currentArtboard.width / 2;
            targetY = currentArtboard.y + currentArtboard.height - margin;
            break;
          case 'bottom-right':
            targetX = currentArtboard.x + currentArtboard.width - margin;
            targetY = currentArtboard.y + currentArtboard.height - margin;
            break;
        }
        
        // Calculate offset and apply to all shapes
        const offsetX = targetX - setCenterX;
        const offsetY = targetY - setCenterY;
        
        finalShapes.forEach(shape => {
          shape.transform.x += offsetX;
          shape.transform.y += offsetY;
        });
        
        console.log(`✅ Aligned shapes to ${overrides.artboardAlignment.alignmentType} with offset (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`);
      }
    }

    // Log all final z-indices before adding to state
    console.log(`🔍 [FINAL Z-INDEX] All new shapes z-indices: [${finalShapes.map(s => s.properties.zIndex).join(', ')}]`);
    console.log(`🔍 [FINAL Z-INDEX] Existing shapes count: ${shapes.length}, New shapes count: ${finalShapes.length}`);

    console.log(`✅ Created ${finalShapes.length} shapes, returning for further processing`);

    return finalShapes;
  }, [enabledShapeTypes, scatterSettings, canvasSettings, generationConfigSettings]);

  const generateRandomShapes = useCallback(() => {
    // Check if generation sets are enabled and have enabled sets
    const enabledGenerationSets = generationSets
      .filter(set => set.enabled)
      .sort((a, b) => a.generationOrder - b.generationOrder); // Sort by generationOrder
    const useGenerationSets = enabledGenerationSets.length > 0;

    let newShapes: Shape[] = [];

    if (useGenerationSets) {
      console.log(`🔍 generateRandomShapes: Using ${enabledGenerationSets.length} enabled generation sets`);
      
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

      // Generate shapes for each enabled generation set
      const allNewShapes: Shape[] = [];
      
      enabledGenerationSets.forEach((set, setIndex) => {
        // Calculate shape count for this set
        const setCount = set.shapeCountMode === 'fixed' 
          ? set.shapeCountFixed
          : Math.floor(Math.random() * (set.shapeCountRange[1] - set.shapeCountRange[0] + 1)) + set.shapeCountRange[0];

        console.log(`🎯 Generating ${setCount} shapes for set "${set.name}" (${set.shapeCountMode} mode)`);

        // Generate shapes for this set - pass set's configuration as overrides
        const setShapes = generateShapesWithBatchConfig(
          setCount,
          canvasBounds,
          true,
          setIndex,
          set.shapeSpecificProperties,
          {
            enabledShapeTypes: new Set(set.enabledShapeTypes),
            batchConfig: set.batchConfig,
            scatterSettings: {},
            setTransform: set.setTransform,
            artboardAlignment: set.artboardAlignment
          }
        );

        // Apply z-index offset based on generation order (1000x spacing ensures sets never overlap)
        setShapes.forEach(shape => {
          shape.properties.zIndex += set.generationOrder * 1000;
        });

        // Apply set-level blend mode and compositing operation
        // compositingOperation takes precedence over setBlendMode if not default
        const effectiveBlendMode = (set.compositingOperation && set.compositingOperation !== 'source-over')
          ? set.compositingOperation
          : set.setBlendMode;
        
        if (effectiveBlendMode && effectiveBlendMode !== 'source-over') {
          console.log(`🎨 Applying blend/compositing mode "${effectiveBlendMode}" to set "${set.name}"`);
          setShapes.forEach(shape => {
            shape.properties.blendMode = effectiveBlendMode as BlendMode;
          });
        }

        // Apply set visibility and opacity
        if (set.setVisibility) {
          if (!set.setVisibility.visible) {
            console.log(`👁️ Set "${set.name}" is hidden, skipping render`);
            return; // Skip this set entirely if not visible
          }
          
          if (set.setVisibility.opacity < 1 || set.setVisibility.opacityVariance > 0) {
            console.log(`🌫️ Applying set opacity ${set.setVisibility.opacity} with variance ${set.setVisibility.opacityVariance} to set "${set.name}"`);
            setShapes.forEach(shape => {
              const variance = (Math.random() - 0.5) * 2 * set.setVisibility.opacityVariance;
              const finalOpacity = Math.max(0, Math.min(1, set.setVisibility.opacity + variance));
              
              // Apply to both fill and stroke opacity
              shape.properties.fillOpacity *= finalOpacity;
              shape.properties.strokeOpacity *= finalOpacity;
            });
          }
        }

        // Apply setTransform if configured
        if (set.setTransform && (set.setTransform.x !== 0 || set.setTransform.y !== 0 || 
            set.setTransform.rotation !== 0 || set.setTransform.scaleX !== 1 || set.setTransform.scaleY !== 1)) {
          console.log(`🔄 Applying setTransform to set "${set.name}": x=${set.setTransform.x}, y=${set.setTransform.y}, rotation=${set.setTransform.rotation}, scaleX=${set.setTransform.scaleX}, scaleY=${set.setTransform.scaleY}`);
          
          setShapes.forEach(shape => {
            // Apply translation
            shape.transform.x += set.setTransform!.x;
            shape.transform.y += set.setTransform!.y;
            
            // Apply rotation
            shape.transform.rotation += set.setTransform!.rotation;
            
            // Apply scale
            shape.transform.scaleX *= set.setTransform!.scaleX;
            shape.transform.scaleY *= set.setTransform!.scaleY;
          });
        }

        // Apply artboard alignment if configured
        if (set.artboardAlignment && set.artboardAlignment.fitToArtboard && currentArtboard) {
          console.log(`📐 Applying fitToArtboard for set "${set.name}"`);
          
          // Calculate bounding box of all shapes in this set
          if (setShapes.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            
            setShapes.forEach(shape => {
              const x = shape.transform.x;
              const y = shape.transform.y;
              // Approximate bounds using shape dimensions
              const halfWidth = (shape.width || 50) / 2;
              const halfHeight = (shape.height || 50) / 2;
              
              minX = Math.min(minX, x - halfWidth);
              minY = Math.min(minY, y - halfHeight);
              maxX = Math.max(maxX, x + halfWidth);
              maxY = Math.max(maxY, y + halfHeight);
            });
            
            const setBoundsWidth = maxX - minX;
            const setBoundsHeight = maxY - minY;
            const setCenterX = (minX + maxX) / 2;
            const setCenterY = (minY + maxY) / 2;
            
            // Calculate scale to fit within artboard with margin
            const margin = set.artboardAlignment.margin || 0;
            const availableWidth = currentArtboard.width - (margin * 2);
            const availableHeight = currentArtboard.height - (margin * 2);
            
            const scaleX = availableWidth / setBoundsWidth;
            const scaleY = availableHeight / setBoundsHeight;
            const fitScale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
            
            // Apply scale and center to artboard
            setShapes.forEach(shape => {
              // Scale relative to set center
              const relX = shape.transform.x - setCenterX;
              const relY = shape.transform.y - setCenterY;
              
              shape.transform.x = currentArtboard.x + currentArtboard.width / 2 + (relX * fitScale);
              shape.transform.y = currentArtboard.y + currentArtboard.height / 2 + (relY * fitScale);
              shape.transform.scaleX *= fitScale;
              shape.transform.scaleY *= fitScale;
            });
            
            console.log(`✅ Fitted set to artboard with scale=${fitScale.toFixed(2)}`);
          }
        } else if (set.artboardAlignment && set.artboardAlignment.alignTo !== 'none' && currentArtboard) {
          console.log(`🎯 Applying alignment for set "${set.name}": ${set.artboardAlignment.alignmentType}`);
          
          // Calculate bounding box center
          if (setShapes.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            
            setShapes.forEach(shape => {
              const x = shape.transform.x;
              const y = shape.transform.y;
              const halfWidth = (shape.width || 50) / 2;
              const halfHeight = (shape.height || 50) / 2;
              
              minX = Math.min(minX, x - halfWidth);
              minY = Math.min(minY, y - halfHeight);
              maxX = Math.max(maxX, x + halfWidth);
              maxY = Math.max(maxY, y + halfHeight);
            });
            
            const setCenterX = (minX + maxX) / 2;
            const setCenterY = (minY + maxY) / 2;
            const margin = set.artboardAlignment.margin || 0;
            
            // Calculate target position based on alignment type
            let targetX = currentArtboard.x + currentArtboard.width / 2;
            let targetY = currentArtboard.y + currentArtboard.height / 2;
            
            switch (set.artboardAlignment.alignmentType) {
              case 'top-left':
                targetX = currentArtboard.x + margin;
                targetY = currentArtboard.y + margin;
                break;
              case 'top-center':
                targetX = currentArtboard.x + currentArtboard.width / 2;
                targetY = currentArtboard.y + margin;
                break;
              case 'top-right':
                targetX = currentArtboard.x + currentArtboard.width - margin;
                targetY = currentArtboard.y + margin;
                break;
              case 'center-left':
                targetX = currentArtboard.x + margin;
                targetY = currentArtboard.y + currentArtboard.height / 2;
                break;
              case 'center':
                targetX = currentArtboard.x + currentArtboard.width / 2;
                targetY = currentArtboard.y + currentArtboard.height / 2;
                break;
              case 'center-right':
                targetX = currentArtboard.x + currentArtboard.width - margin;
                targetY = currentArtboard.y + currentArtboard.height / 2;
                break;
              case 'bottom-left':
                targetX = currentArtboard.x + margin;
                targetY = currentArtboard.y + currentArtboard.height - margin;
                break;
              case 'bottom-center':
                targetX = currentArtboard.x + currentArtboard.width / 2;
                targetY = currentArtboard.y + currentArtboard.height - margin;
                break;
              case 'bottom-right':
                targetX = currentArtboard.x + currentArtboard.width - margin;
                targetY = currentArtboard.y + currentArtboard.height - margin;
                break;
            }
            
            // Calculate offset and apply to all shapes
            const offsetX = targetX - setCenterX;
            const offsetY = targetY - setCenterY;
            
            setShapes.forEach(shape => {
              shape.transform.x += offsetX;
              shape.transform.y += offsetY;
            });
            
            console.log(`✅ Aligned set to ${set.artboardAlignment.alignmentType} with offset (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`);
          }
        }

        allNewShapes.push(...setShapes);
      });

      console.log(`✅ Generated total of ${allNewShapes.length} shapes from ${enabledGenerationSets.length} generation sets`);
      newShapes = allNewShapes;
    } else {
      // Fallback to scatter settings when no generation sets are enabled
      const count = scatterSettings.shapeCountMode === 'fixed' 
        ? (scatterSettings.fixedShapeCount || 10)
        : Math.floor(Math.random() * (scatterSettings.maxCount - scatterSettings.minCount + 1)) + scatterSettings.minCount;

      console.log(`🔍 generateRandomShapes: count=${count}, mode=${scatterSettings.shapeCountMode || 'range'}, using scatter settings (no generation sets)`);

      if (enabledShapeTypes.size === 0) {
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

      // Generate shapes using the unified function
      newShapes = generateShapesWithBatchConfig(count, canvasBounds, true, 0);
    }

    if (newShapes.length === 0) {
      console.log(`❌ No shapes generated, returning early`);
      return;
    }

    // Add shapes to state
    setShapes(prev => {
      // Calculate the correct base z-index from the current state
      const currentMaxZIndex = prev.length > 0 ? Math.max(...prev.map(s => s.properties.zIndex)) : 0;
      console.log(`🔍 [STATE UPDATE] Current shapes: ${prev.length}, currentMaxZIndex: ${currentMaxZIndex}`);

      // Fix z-indices for the new shapes based on current state
      const shapesWithFixedZIndex = newShapes.map((shape, index) => {
        // Directly modify the existing Shape instance instead of creating a plain object
        shape.properties.zIndex = currentMaxZIndex + index + 1;
        return shape;
      });

      const updatedShapes = [...prev, ...shapesWithFixedZIndex];
      console.log(`🔍 [AFTER ADD] Total shapes: ${updatedShapes.length}, New z-indices: [${shapesWithFixedZIndex.map(s => s.properties.zIndex).join(', ')}]`);
      return updatedShapes;
    });

    // Update incremental index if not resetting per batch
    if (generationConfigSettings.propertiesEnabled && generationConfigSettings.shapePropertiesEnabled && 
        !generationConfigSettings.incrementalResetPerBatch) {
      setLastIncrementalIndex(prev => prev + newShapes.length);
    }
  }, [enabledShapeTypes, scatterSettings, generateShapesWithBatchConfig, artboards, activeArtboard, generationConfigSettings, generationSets]);

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
      backgroundColor: '#ffffff',
      displayGrid: true,
      displayBorder: false,
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

  const updateGenerationConfigSettings = useCallback((updates: Partial<BatchConfigSettings>) => {
    setGenerationConfigSettings(prev => ({ ...prev, ...updates }));
    // Mark as manually changed only if not during restore operation
    if (!isRestoring) {
      setHasManualChangesAfterRestore(true);
    }
  }, [isRestoring]);

  // Project loading functionality
  const onLoadProject = useCallback((data: {
    shapes: any[];
    groups: any[];
    canvasSettings?: CanvasSettings;
    scatterSettings?: ScatterSettings;
    enabledShapeTypes: Set<ShapeType>;
  }) => {
    console.log('🔄 Loading project with data:', data);

    // Clear current state
    setShapes([]);
    setGroups([]);
    setSelectedShapes([]);
    setSelectedGroups([]);

    // Convert plain objects back to Shape instances
    const shapeInstances = (data.shapes || []).map((shapeData: any) => {
      // Create a new Shape instance
      const shape = new Shape(shapeData.type, shapeData.transform.x, shapeData.transform.y);

      // Copy all properties from saved data
      Object.assign(shape, shapeData);

      // Ensure the shape has all required methods by creating a proper instance
      return shape;
    });

    // Convert groups if needed (for now, just use empty array since groups might be plain objects too)
    const groupInstances = (data.groups || []).map((groupData: any) => {
      // For now, just return the group data as-is since groups are less complex
      return groupData;
    });

    // Load new data
    setShapes(shapeInstances);
    setGroups(groupInstances);
    setEnabledShapeTypes(data.enabledShapeTypes || new Set());

    // Update settings if provided with proper defaults
    if (data.scatterSettings) {
      setScatterSettings(data.scatterSettings);
    }
    if (data.canvasSettings) {
      // Ensure canvas settings have valid values
      const validCanvasSettings = {
        width: data.canvasSettings.width || Number.MAX_SAFE_INTEGER,
        height: data.canvasSettings.height || Number.MAX_SAFE_INTEGER,
        zoom: data.canvasSettings.zoom && data.canvasSettings.zoom > 0 ? data.canvasSettings.zoom : 1,
        panX: data.canvasSettings.panX || 0,
        panY: data.canvasSettings.panY || 0,
        backgroundColor: data.canvasSettings.backgroundColor || '#1e293b',
        showGrid: data.canvasSettings.showGrid !== undefined ? data.canvasSettings.showGrid : true
      };
      setCanvasSettings(validCanvasSettings);
      console.log('📐 Applied canvas settings:', validCanvasSettings);
    } else {
      // Reset to defaults if no canvas settings provided
      setCanvasSettings({
        width: Number.MAX_SAFE_INTEGER,
        height: Number.MAX_SAFE_INTEGER,
        zoom: 1,
        panX: 0,
        panY: 0,
        backgroundColor: '#1e293b',
        showGrid: true
      });
      console.log('📐 Reset to default canvas settings');
    }

    console.log('✅ Project loaded successfully with', shapeInstances.length, 'shapes');

    // Log shape positions for debugging
    if (shapeInstances.length > 0) {
      console.log('📍 First few shape positions:', shapeInstances.slice(0, 3).map(s => ({
        id: s.id,
        type: s.type,
        x: s.transform.x,
        y: s.transform.y
      })));
    }
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
    generationConfigSettings,
    canvasSettings,
    artboards,
    activeArtboard,
    
    // Generation Sets state for bi-directional sync
    generationSets,
    currentGenerationSetId,
    batchExportCount,
    generationCountMode,
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
    updateGenerationConfigSettings,
    
    // Generation Sets handlers for bi-directional sync
    handleGenerationSetsChange,
    handleCurrentGenerationSetChange,
    handleBatchExportCountChange,
    handleGenerationCountModeChange,
    handleCreateGenerationSet,
    handleDeleteGenerationSet,
    onOpenGenerationSetsManager: handleOpenGenerationSetsManager,
    onCloseGenerationSetsManager: handleCloseGenerationSetsManager,
    isSetsManagerOpen,
    generateUniqueSetName,
    restoreUIStateFromSet,
    hasUnsavedChanges,
    areSetsEnabled,
    generateRandomShapes,
    generateShapesWithBatchConfig,
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
    onLoadProject,
    setGroups,
    setCanvasSettings,
    setScatterSettings,
    setEnabledShapeTypes: useCallback((value: Set<ShapeType> | ((prev: Set<ShapeType>) => Set<ShapeType>)) => {
      setEnabledShapeTypes(value);
      // Mark as manually changed only if not during restore operation
      if (!isRestoring) {
        setHasManualChangesAfterRestore(true);
      }
    }, [isRestoring])
  };
};