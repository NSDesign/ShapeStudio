import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import BatchConfigDialog from './BatchConfigDialog';
import { SetsManagerDialog } from './SetsManagerDialog';
import { BatchConfigSettings, EnhancedBatchConfig, GenerationSet, ShapeCountMode } from '@shared/schema';
import type { CurrentUIState } from '@/hooks/useGenerationSets';
import { GenerationSetsDropdown } from './GenerationSetsDropdown';
import ApiCallGenerator from './ApiCallGenerator';
import AuthHeader from './AuthHeader';
import { useUserPreferences, useExportSettings } from '@/hooks/useUserPreferences';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shapes,
  Settings,
  Layers,
  Palette,
  Download,
  Wand2,
  Navigation,
  Shuffle,
  Layers3,
  Package,
  ImageIcon,
  Move,
  RotateCcw,
  Expand,
  FlipHorizontal,
  FlipVertical,
  Trash2,
  MousePointer,
  Edit3,
  Activity,
  Monitor,
  Target,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Grid3X3,
  Trash,
  FileImage,
  Save,
  FolderOpen,
  Clipboard,
  Boxes,
  Plus,
  Minus,
  Info,
  X
} from 'lucide-react';
import { ShapeType, ShapeGroup as ShapeGroupClass, BlendMode, ScatterSettings, CanvasSettings, Artboard, ArtboardPreset, ScalarMode, getDefaultLineVectorConfig } from '@/lib/shapeTypes';
import { ModeField } from '@/components/ModeField';
import { StyledModeField } from '@/components/StyledModeField';
import { Shape } from '@/lib/shapes';

import { SmartDistributionAlgorithm } from '../lib/distributionAlgorithm';

// Shape categories for organized display
const SHAPE_CATEGORIES = {
  'Basic': ['rectangle', 'rounded-rectangle', 'square', 'rounded-square', 'circle', 'ellipse'] as ShapeType[],
  'Geometric': ['triangle', 'right-triangle', 'pentagon', 'hexagon', 'rhombus', 'parallelogram', 'trapezoid'] as ShapeType[],
  'Special': ['star', 'polygon', 'heart', 'arrow', 'cross', 'kite', 'semicircle'] as ShapeType[],
  'Lines & Curves': ['line-vector', 'line', 'bezier', 'cubic', 'smooth-spline'] as ShapeType[],
  'Complex': ['ring', 'blob', 'chunk', 'spline-circle', 'spline-ellipse', 'spline-ring'] as ShapeType[]
};

// Shape display names mapping
const shapeTypeDisplayNames: Record<ShapeType, string> = {
  rectangle: 'Rectangle',
  'rounded-rectangle': 'Rounded Rectangle',
  square: 'Square',
  'rounded-square': 'Rounded Square',
  circle: 'Circle',
  ellipse: 'Ellipse',
  triangle: 'Triangle',
  'right-triangle': 'Right Triangle',
  trapezoid: 'Trapezoid',
  pentagon: 'Pentagon',
  hexagon: 'Hexagon',
  rhombus: 'Rhombus',
  parallelogram: 'Parallelogram',
  kite: 'Kite',
  semicircle: 'Semicircle',
  heart: 'Heart',
  arrow: 'Arrow',
  cross: 'Cross',
  polygon: 'Polygon',
  star: 'Star',
  'line-vector': 'Line Vector',
  line: 'Line',
  cubic: 'Cubic Curve',
  bezier: 'Bézier Curve',

  'smooth-spline': 'Smooth Spline',
  chunk: 'Chunk',
  blob: 'Organic Blob',
  ring: 'Ring',
  'spline-circle': 'Spline Circle',
  'spline-ellipse': 'Spline Ellipse',
  'spline-ring': 'Spline Ring'
};

// Conversion functions for scatterSettings to ModeConfig format
const convertScatterToModeConfig = (
  shapeType: string,
  property: string,
  scatterSettings: ScatterSettings,
  defaultRange: [number, number]
) => {
  const shapeData = scatterSettings.shapeSpecific[shapeType as keyof typeof scatterSettings.shapeSpecific];
  
  switch (property) {
    case 'edgeCount': // for polygon
      const edgeRange = (shapeData as any)?.edgeCountRange || defaultRange;
      return {
        kind: 'range' as const,
        min: edgeRange[0],
        max: edgeRange[1]
      };
    case 'pointCount': // for star, line, bezier, etc.
      const pointRange = (shapeData as any)?.pointCountRange || defaultRange;
      return {
        kind: 'range' as const,
        min: pointRange[0],
        max: pointRange[1]
      };
    case 'innerRadius': // for star, ring  
      const radiusRange = (shapeData as any)?.innerRadiusRange || [defaultRange[0] / 100, defaultRange[1] / 100];
      return {
        kind: 'range' as const,
        min: Math.round(radiusRange[0] * 100),
        max: Math.round(radiusRange[1] * 100)
      };
    case 'segmentCount': // for circle, ellipse
      const segmentRange = (shapeData as any)?.segmentCountRange || defaultRange;
      return {
        kind: 'range' as const,
        min: segmentRange[0],
        max: segmentRange[1]
      };
    case 'curvature': // for cubic curves (percentage)
      const curvatureRange = (shapeData as any)?.curvatureRange || [defaultRange[0] / 100, defaultRange[1] / 100];
      return {
        kind: 'range' as const,
        min: Math.round(curvatureRange[0] * 100), // Convert back to percentage for UI
        max: Math.round(curvatureRange[1] * 100)
      };
    case 'spread': // for cubic curves (pixels)
      const spreadRange = (shapeData as any)?.spreadRange || defaultRange;
      return {
        kind: 'range' as const,
        min: spreadRange[0],
        max: spreadRange[1]
      };
    case 'cornerRadius': // for rounded-rectangle, rounded-square
      const radiusMode = (shapeData as any)?.cornerRadiusMode || 'range';
      if (radiusMode === 'fixed') {
        const radiusValue = (shapeData as any)?.cornerRadiusValue || defaultRange[0];
        return {
          kind: 'fixed' as const,
          value: radiusValue
        };
      } else {
        const radiusRange = (shapeData as any)?.cornerRadiusRange || defaultRange;
        return {
          kind: 'range' as const,
          min: radiusRange[0],
          max: radiusRange[1]
        };
      }
    default:
      return {
        kind: 'range' as const,
        min: defaultRange[0],
        max: defaultRange[1]
      };
  }
};

// Conversion functions for line-vector ScalarMode to ModeConfig format
const convertLineVectorToModeConfig = (scalarMode: ScalarMode<number>) => {
  switch (scalarMode.kind) {
    case 'fixed':
      return {
        kind: 'fixed' as const,
        value: scalarMode.value
      };
    case 'range':
      return {
        kind: 'range' as const,
        min: scalarMode.min,
        max: scalarMode.max
      };
    case 'values':
      return {
        kind: 'values' as const,
        values: scalarMode.values,
        selection: scalarMode.selection
      };
    default:
      return {
        kind: 'fixed' as const,
        value: 0
      };
  }
};

// Conversion functions for line-vector ModeConfig back to ScalarMode format
const handleLineVectorModeConfigChange = (
  property: 'direction' | 'length' | 'centroid',
  modeConfig: any,
  scatterSettings: ScatterSettings,
  onUpdateScatterSettings: (settings: Partial<ScatterSettings>) => void
) => {
  // Convert ModeConfig back to ScalarMode format
  let newScalarMode: ScalarMode<number>;
  
  switch (modeConfig.kind) {
    case 'fixed':
      newScalarMode = {
        kind: 'fixed' as const,
        value: modeConfig.value
      };
      break;
    case 'range':
      newScalarMode = {
        kind: 'range' as const,
        min: modeConfig.min,
        max: modeConfig.max
      };
      break;
    case 'values':
      newScalarMode = {
        kind: 'values' as const,
        values: modeConfig.values,
        selection: modeConfig.selection,
        startIndex: 0
      };
      break;
    default:
      newScalarMode = {
        kind: 'fixed' as const,
        value: 0
      };
  }
  
  // Get current line-vector config and merge with the new property
  const currentLineVectorConfig = { 
    ...getDefaultLineVectorConfig(), 
    ...(scatterSettings.shapeSpecific['line-vector'] || {}) 
  };
  
  onUpdateScatterSettings({
    shapeSpecific: {
      ...scatterSettings.shapeSpecific,
      'line-vector': {
        ...currentLineVectorConfig,
        [property]: newScalarMode
      }
    }
  });
};

const handleScatterModeConfigChange = (
  shapeType: string,
  property: string,
  config: any,
  scatterSettings: ScatterSettings,
  onUpdateScatterSettings: (settings: Partial<ScatterSettings>) => void
) => {
  // Handle cornerRadius separately due to different data structure
  if (property === 'cornerRadius') {
    const cornerRadiusData = config.kind === 'fixed' 
      ? { cornerRadiusMode: 'fixed', cornerRadiusValue: config.value }
      : { cornerRadiusMode: 'range', cornerRadiusRange: [config.min, config.max] };
    
    onUpdateScatterSettings({
      shapeSpecific: {
        ...scatterSettings.shapeSpecific,
        [shapeType]: { 
          ...(scatterSettings.shapeSpecific[shapeType as keyof typeof scatterSettings.shapeSpecific] || {}),
          ...cornerRadiusData
        }
      }
    });
    return;
  }

  const propertyMap = {
    edgeCount: 'edgeCountRange',
    pointCount: 'pointCountRange', 
    innerRadius: 'innerRadiusRange',
    segmentCount: 'segmentCountRange',
    curvature: 'curvatureRange',
    spread: 'spreadRange'
  };
  
  const rangeProp = propertyMap[property as keyof typeof propertyMap];
  if (!rangeProp) return;
  
  // Convert ModeConfig back to range for scatterSettings
  let range = config.kind === 'range' ? [config.min, config.max] : [config.value, config.value];
  
  // Handle percentage scaling for inner radius and curvature (convert percentages back to decimals)
  if (property === 'innerRadius' || property === 'curvature') {
    range = [range[0] / 100, range[1] / 100];
  }
  
  onUpdateScatterSettings({
    shapeSpecific: {
      ...scatterSettings.shapeSpecific,
      [shapeType]: { 
        ...(scatterSettings.shapeSpecific[shapeType as keyof typeof scatterSettings.shapeSpecific] || {}),
        [rangeProp]: range
      }
    }
  });
};

interface SidebarProps {
  enabledShapeTypes: Set<ShapeType>;
  scatterSettings: ScatterSettings;
  generationConfigSettings: BatchConfigSettings;
  selectedCount: number;
  selectedPointsCount: number;
  selectedSegmentsCount: number;
  editMode: 'shapes' | 'points' | 'segments';
  canComposeShapes: boolean;
  selectedShapes: Shape[];
  selectedGroups: ShapeGroupClass[];
  shapes: Shape[]; // All shapes for layers panel
  artboards: Artboard[];
  activeArtboard: string;
  onToggleShapeType: (type: ShapeType) => void;
  onUpdateScatterSettings: (settings: Partial<ScatterSettings>) => void;
  onGenerateRandomShapes: () => void;
  onGenerateShapesWithBatchConfig: (count: number, canvasBounds: { x: number; y: number; width: number; height: number }, useDistribution?: boolean, shapeGenerationIndex?: number, shapeSpecificPropertiesOverride?: Record<string, any>, overrides?: { enabledShapeTypes?: Set<ShapeType>; batchConfig?: BatchConfigSettings; scatterSettings?: any }) => Shape[];
  onComposeShapes: () => void;
  onSetEditMode: (mode: 'shapes' | 'points' | 'segments') => void;
  onMoveBy: (x: number, y: number) => void;
  onScaleBy: (x: number, y: number) => void;
  onRotateBy: (angle: number) => void;
  onSkewBy: (x: number, y: number) => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onDeleteSelected: () => void;
  onClearAll?: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onChangeBlendMode: (blendMode: BlendMode) => void;
  onShapeUpdate?: () => void;
  onAddCustomShape?: (shape: Shape) => void;
  onAddArtboard: (preset: ArtboardPreset) => void;
  onSelectArtboard: (artboardId: string) => void;
  onDeleteArtboard: (artboardId: string) => void;
  onUpdateArtboard: (artboardId: string, updates: Partial<Artboard>) => void;
  onDistributeSelected: () => void;
  onApplyBooleanOperation: (operation: 'union' | 'subtract' | 'intersect' | 'exclude', targetId: string) => void;
  onApplyColorManipulation: (manipulation: any) => void;
  onUpdateGenerationConfigSettings: (settings: Partial<BatchConfigSettings>) => void;
  onLoadProject: (data: {
    shapes: any[];
    groups: any[];
    canvasSettings?: CanvasSettings;
    scatterSettings?: ScatterSettings;
    enabledShapeTypes: Set<ShapeType>;
  }) => void;
  
  // Generation Sets Management
  generationSets?: GenerationSet[];
  currentGenerationSetId?: string | null;
  shapeCountMode?: ShapeCountMode;
  shapeCountFixed?: number;
  shapeCountRange?: [number, number];
  batchExportCount?: number;
  generationCountMode?: string;
  onGenerationSetsChange?: (sets: GenerationSet[]) => void;
  onCurrentGenerationSetChange?: (setId: string | null) => void;
  onCreateGenerationSet?: (customName?: string, currentUIState?: CurrentUIState) => string;
  onDeleteGenerationSet?: (setId: string) => void;
  generateUniqueSetName?: (baseName?: string) => string;
  onOpenGenerationSetsManager?: () => void;
  isSetsManagerOpen?: boolean;
  onCloseGenerationSetsManager?: () => void;
  onBatchExportCountChange?: (count: number) => void;
  onGenerationCountModeChange?: (mode: 'fixed' | 'range') => void;
  onRestoreUIStateFromSet?: (setId: string) => void;
  hasUnsavedChanges?: (setId: string | null) => boolean;
  areSetsEnabled?: (batchCount?: number, countMode?: string) => boolean;
}

export default function Sidebar({
  enabledShapeTypes,
  scatterSettings,
  generationConfigSettings,
  selectedCount,
  selectedPointsCount,
  selectedSegmentsCount,
  editMode,
  canComposeShapes,
  selectedShapes,
  selectedGroups,
  shapes,
  artboards,
  activeArtboard,
  onToggleShapeType,
  onUpdateScatterSettings,
  onUpdateGenerationConfigSettings,
  onGenerateRandomShapes,
  onGenerateShapesWithBatchConfig,
  onComposeShapes,
  onSetEditMode,
  onMoveBy,
  onScaleBy,
  onRotateBy,
  onSkewBy,
  onFlipHorizontal,
  onFlipVertical,
  onDeleteSelected,
  onClearAll,
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
  onChangeBlendMode,
  onShapeUpdate,
  onAddCustomShape,
  onAddArtboard,
  onSelectArtboard,
  onDeleteArtboard,
  onUpdateArtboard,
  onDistributeSelected,
  onApplyBooleanOperation,
  onApplyColorManipulation,
  onLoadProject,
  
  // Generation Sets Management
  generationSets = [],
  currentGenerationSetId = null,
  shapeCountMode = 'fixed' as ShapeCountMode,
  shapeCountFixed = 10,
  shapeCountRange = [5, 15] as [number, number],
  batchExportCount = 1,
  generationCountMode = 'fixed',
  onGenerationSetsChange,
  onCurrentGenerationSetChange,
  onCreateGenerationSet,
  onDeleteGenerationSet,
  generateUniqueSetName,
  onOpenGenerationSetsManager,
  isSetsManagerOpen = false,
  onCloseGenerationSetsManager,
  onBatchExportCountChange,
  onGenerationCountModeChange,
  onRestoreUIStateFromSet,
  hasUnsavedChanges,
  areSetsEnabled
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [moveX, setMoveX] = useState(0);
  const [moveY, setMoveY] = useState(0);
  const [scaleX, setScaleX] = useState(100);
  const [scaleY, setScaleY] = useState(100);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  
  // Loading states for save/load/export operations
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  
  // Sets Manager Dialog state is now managed centrally via props

  // Get user preferences for sidebar section visibility
  const { sidebarSections, isLoading: isLoadingPreferences } = useUserPreferences();
  
  // Get export settings from user preferences
  const { exportSettings, updateExportSettings, isLoading: isLoadingExportSettings } = useExportSettings();

  // Use centralized generation sets state from parent
  const effectiveGenerationSets = generationSets || [];
  const effectiveCurrentSetId = currentGenerationSetId;

  // Generation sets are enabled when the main toggle is enabled
  // This allows users to save/load generation configurations with any count mode
  const effectiveMode = generationCountMode ?? 'fixed';
  const setsEnabled = exportSettings.generationSetsEnabled;
  

  // Generation sets handlers - now simplified since validation logic is centralized
  const handleSetChange = useCallback((setId: string | null) => {
    // The enhanced validation and state restoration logic is now handled centrally
    // in useShapeEditor's handleCurrentGenerationSetChange function
    onCurrentGenerationSetChange?.(setId);
  }, [onCurrentGenerationSetChange]);


  const handleDeleteSet = useCallback((setId: string) => {
    // Call the actual handler from parent component
    onDeleteGenerationSet?.(setId);
    console.log('Deleted generation set:', setId);
  }, [onDeleteGenerationSet]);

  const handleOpenManager = useCallback(() => {
    onOpenGenerationSetsManager?.();
  }, [onOpenGenerationSetsManager]);

  // Define handlePopoverToggle function
  const handlePopoverToggle = (sectionId: string) => {
    setActivePopover(activePopover === sectionId ? null : sectionId);
  };

  // Helper functions for content sections
  function SelectionModesContent() {
    const editModes = [
      { id: 'shapes', name: 'Shapes', icon: MousePointer, desc: 'Select and transform entire shapes' },
      { id: 'points', name: 'Points', icon: Edit3, desc: 'Edit individual points' },
      { id: 'segments', name: 'Segments', icon: Activity, desc: 'Edit curve segments' }
    ];

    return (
      <div className="space-y-3">
        <div className="text-sm text-slate-400">
          Current Mode: <span className="text-white font-medium">{editMode}</span>
        </div>

        {editModes.map((mode) => {
          const IconComponent = mode.icon;
          const isActive = editMode === mode.id;

          return (
            <div key={mode.id} className={`p-3 rounded-lg transition-colors cursor-pointer ${
              isActive ? 'bg-orange-900/30 border border-orange-500/50' : 'bg-slate-800/50 hover:bg-slate-700/50'
            }`} onClick={() => onSetEditMode(mode.id as any)}>
              <div className="flex items-center space-x-3">
                <IconComponent className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-orange-400' : 'text-slate-400'
                }`} />
                <div>
                  <div className={`text-sm font-medium transition-colors ${
                    isActive ? 'text-orange-200' : 'text-slate-300'
                  }`}>{mode.name}</div>
                  <div className="text-xs text-slate-500">{mode.desc}</div>
                </div>
              </div>
            </div>
          );
        })}

        {editMode === 'points' && selectedPointsCount > 0 && (
          <div className="p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <div className="text-xs text-blue-200">
              {selectedPointsCount} point{selectedPointsCount !== 1 ? 's' : ''} selected
            </div>
          </div>
        )}

        {editMode === 'segments' && selectedSegmentsCount > 0 && (
          <div className="p-2 bg-green-500/20 border border-green-500/30 rounded-lg">
            <div className="text-xs text-green-200">
              {selectedSegmentsCount} segment{selectedSegmentsCount !== 1 ? 's' : ''} selected
            </div>
          </div>
        )}
      </div>
    );
  }

  function ArtboardsContent() {
    const [customWidth, setCustomWidth] = useState(1920);
    const [customHeight, setCustomHeight] = useState(1080);
    const [customName, setCustomName] = useState('Custom Artboard');
    const [customBackgroundColor, setCustomBackgroundColor] = useState('#ffffff');
    
    const artboardPresets = [
      { name: 'Desktop HD', width: 1920, height: 1080, category: 'web', description: '1920×1080 Full HD' },
      { name: 'Instagram Post', width: 1080, height: 1080, category: 'social', description: 'Square 1:1' },
      { name: 'Instagram Story', width: 1080, height: 1920, category: 'social', description: 'Portrait 9:16' },
      { name: 'Business Card', width: 1050, height: 600, category: 'print', description: '3.5×2" at 300 DPI' },
      { name: 'A4 Paper', width: 2480, height: 3508, category: 'print', description: '210×297mm at 300 DPI' },
      { name: 'iPhone 14 Pro', width: 1179, height: 2556, category: 'mobile', description: 'iPhone screen' }
    ];

    const handleCreateCustomArtboard = () => {
      const customPreset = {
        name: customName,
        width: customWidth,
        height: customHeight,
        backgroundColor: customBackgroundColor,
        category: 'custom' as const,
        description: `${customWidth}×${customHeight} Custom`
      };
      onAddArtboard(customPreset);
    };

    return (
      <div className="space-y-4">
        <div className="text-sm text-slate-400">
          Active: <span className="text-white font-medium">{artboards.find(a => a.id === activeArtboard)?.name || 'None'}</span>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Custom Dimensions</Label>
          <div className="space-y-2 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Name</Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Custom Artboard"
                className="h-7 text-xs bg-slate-700 border-slate-600 text-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Width</Label>
                <Input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(parseInt(e.target.value) || 1920)}
                  min="1"
                  max="10000"
                  className="h-7 text-xs bg-slate-700 border-slate-600 text-slate-200"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Height</Label>
                <Input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(parseInt(e.target.value) || 1080)}
                  min="1"
                  max="10000"
                  className="h-7 text-xs bg-slate-700 border-slate-600 text-slate-200"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={customBackgroundColor}
                  onChange={(e) => setCustomBackgroundColor(e.target.value)}
                  className="h-7 w-12 p-1 bg-slate-700 border-slate-600"
                />
                <Input
                  type="text"
                  value={customBackgroundColor}
                  onChange={(e) => setCustomBackgroundColor(e.target.value)}
                  placeholder="#ffffff"
                  className="h-7 flex-1 text-xs bg-slate-700 border-slate-600 text-slate-200"
                />
              </div>
            </div>
            <Button
              onClick={handleCreateCustomArtboard}
              className="w-full h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="w-3 h-3 mr-1" />
              Create Custom Artboard
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Quick Presets</Label>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {artboardPresets.map((preset, index) => (
              <Button
                key={index}
                onClick={() => onAddArtboard(preset as ArtboardPreset)}
                variant="secondary"
                size="sm"
                className="w-full justify-start text-xs bg-slate-700 hover:bg-slate-600 text-slate-200"
              >
                <Monitor className="w-3 h-3 mr-2" />
                <div className="flex-1 text-left">
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-xs text-slate-400">{preset.width}×{preset.height}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Existing Artboards</Label>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {artboards.map((artboard) => (
              <div key={artboard.id} className={`flex items-center justify-between p-2 rounded text-xs transition-colors ${
                artboard.id === activeArtboard ? 'bg-teal-500/30 border border-teal-500/50' : 'bg-slate-800/50 hover:bg-slate-700/50'
              }`}>
                <div className="flex-1">
                  <div className={artboard.id === activeArtboard ? 'text-teal-200' : 'text-slate-300'}>
                    {artboard.name}
                  </div>
                  <div className="text-slate-500">{artboard.width}×{artboard.height}</div>
                </div>
                <div className="flex space-x-1">
                  <Button
                    onClick={() => onSelectArtboard(artboard.id)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                  >
                    <Target className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => onDeleteArtboard(artboard.id)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {artboards.length === 0 && (
            <div className="text-xs text-slate-500 text-center py-4">
              No artboards created
            </div>
          )}
        </div>

        {/* Active Artboard Settings */}
        {(() => {
          const currentArtboard = artboards.find(a => a.id === activeArtboard);
          if (!currentArtboard) return null;
          
          return (
            <div className="space-y-2 p-3 bg-teal-900/20 border border-teal-500/30 rounded-lg">
              <Label className="text-xs text-teal-300">Active Artboard Settings</Label>
              
              <div className="space-y-2">
                {/* Background Color */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={currentArtboard.backgroundColor || '#ffffff'}
                      onChange={(e) => onUpdateArtboard(currentArtboard.id, { backgroundColor: e.target.value })}
                      className="h-7 w-12 p-1 bg-slate-700 border-slate-600"
                      data-testid="input-artboard-background-color"
                    />
                    <Input
                      type="text"
                      value={currentArtboard.backgroundColor || '#ffffff'}
                      onChange={(e) => onUpdateArtboard(currentArtboard.id, { backgroundColor: e.target.value })}
                      placeholder="#ffffff"
                      className="h-7 flex-1 text-xs bg-slate-700 border-slate-600 text-slate-200"
                      data-testid="input-artboard-background-hex"
                    />
                  </div>
                </div>

                {/* Display Grid Toggle */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-400">Display Grid</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={currentArtboard.displayGrid !== false}
                      onCheckedChange={(checked) => onUpdateArtboard(currentArtboard.id, { displayGrid: checked })}
                      data-testid="switch-artboard-display-grid"
                    />
                    <span className="text-xs text-slate-400">
                      {currentArtboard.displayGrid !== false ? 'On' : 'Off'}
                    </span>
                  </div>
                </div>

                {/* Display Border Toggle */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-400">Display Border</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={currentArtboard.displayBorder !== false}
                      onCheckedChange={(checked) => onUpdateArtboard(currentArtboard.id, { displayBorder: checked })}
                      data-testid="switch-artboard-display-border"
                    />
                    <span className="text-xs text-slate-400">
                      {currentArtboard.displayBorder !== false ? 'On' : 'Off'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // Export state variables lifted to main component level  
  const [exportShapeCountRange, setExportShapeCountRange] = useState<[number, number]>([5, 15]);
  const [exportBatchCount, setExportBatchCount] = useState(10);
  const [exportSaveProjectFiles, setExportSaveProjectFiles] = useState(false);
  // New packaging and selective export settings
  const [packageAsZip, setPackageAsZip] = useState(false);
  const [exportAllImages, setExportAllImages] = useState(true);
  const [selectedImageIndices, setSelectedImageIndices] = useState<number[]>([]);

  // Generation sets handlers (placed after state declarations)
  const handleCreateSet = useCallback((name: string) => {
    // Auto-enable batch export when creating sets
    if (!exportSettings.exportBatchModeEnabled) {
      updateExportSettings.mutate({ exportBatchModeEnabled: true });
      console.log('Auto-enabled batch export for generation sets');
    }
    
    
    // Capture current UI state for the generation set
    const currentUIState: CurrentUIState = {
      enabledShapeTypes,
      scatterSettings,
      batchConfigSettings: generationConfigSettings,
      shapeCountMode,
      shapeCountFixed,
      shapeCountRange
    };
    
    // Call the actual handler from parent component with UI state
    const setId = onCreateGenerationSet?.(name, currentUIState);
    console.log('Created generation set:', name, 'with ID:', setId, 'from current UI state');
    return setId;
  }, [onCreateGenerationSet, exportSettings.exportBatchModeEnabled, updateExportSettings, generationConfigSettings, onUpdateGenerationConfigSettings, enabledShapeTypes, scatterSettings, shapeCountMode, shapeCountFixed, shapeCountRange]);

  function ExportSaveContent() {
    const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'webp' | 'avif' | 'bmp' | 'svg' | 'pdf'>('png');
    const [exportQuality, setExportQuality] = useState(90);
    const [exportScale, setExportScale] = useState(1);
    const [exportMode, setExportMode] = useState<'selection' | 'artboard' | 'all'>('all');
    const [selectedArtboardForExport, setSelectedArtboardForExport] = useState<string>('');

    // Local export state (not needed by API generator)
    const [batchExportPath, setBatchExportPath] = useState<string>('');
    const [isBatchExporting, setIsBatchExporting] = useState(false);
    const [batchProgress, setBatchProgress] = useState(0);
    const [batchTotalSteps, setBatchTotalSteps] = useState(0);
    const [batchStatus, setBatchStatus] = useState('');
    const [showBatchResult, setShowBatchResult] = useState(false);
    const [batchResultMessage, setBatchResultMessage] = useState('');

    const renderShapeForExport = (ctx: CanvasRenderingContext2D, shape: Shape) => {
      // Temporarily disable selection to avoid selection indicators, but keep the original shape
      const originalSelected = shape.selected;
      shape.selected = false;

      // Save current context state
      ctx.save();
      
      // Apply blend mode or compositing operation if set
      if (shape.properties.blendMode && shape.properties.blendMode !== 'source-over') {
        ctx.globalCompositeOperation = shape.properties.blendMode as GlobalCompositeOperation;
      }

      // Use the Shape class's render method for export
      shape.render(ctx);

      // Restore context state (including blend mode)
      ctx.restore();

      // Restore original selection state
      shape.selected = originalSelected;
    };

    const exportCanvasAsFormat = (canvas: HTMLCanvasElement, filename: string, format: string, quality: number, scale: number) => {
      switch (format) {
        case 'pdf':
          // Convert canvas to PDF
          const pdf = new jsPDF({
            orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
            unit: 'pt',
            format: [canvas.width / scale, canvas.height / scale]
          });
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width / scale, canvas.height / scale);
          pdf.save(filename);
          console.log(`📁 File saved: ${filename} (check your Downloads folder)`);
          break;
        default:
          // Handle raster formats
          const link = document.createElement('a');
          link.download = filename;
          
          switch (format) {
            case 'jpg':
              link.href = canvas.toDataURL('image/jpeg', quality / 100);
              break;
            case 'webp':
              link.href = canvas.toDataURL('image/webp', quality / 100);
              break;
            case 'avif':
              link.href = canvas.toDataURL('image/avif', quality / 100);
              break;
            case 'bmp':
              link.href = canvas.toDataURL('image/bmp');
              break;
            case 'png':
            default:
              link.href = canvas.toDataURL('image/png');
              break;
          }

          link.click();
          console.log(`📁 File saved: ${filename} (check your Downloads folder)`);
          break;
      }
    };

    const handleExportShapes = async () => {
      setIsExporting(true);
      try {
      let shapesToExport: Shape[] = [];
      let canvasWidth: number;
      let canvasHeight: number;
      let translateX = 0;
      let translateY = 0;
      let filename = '';

      if (exportMode === 'artboard' && selectedArtboardForExport) {
        // Export specific artboard
        const artboard = artboards.find(ab => ab.id === selectedArtboardForExport);
        if (!artboard) return;

        // Filter shapes that overlap with the artboard bounds
        shapesToExport = shapes.filter(shape => {
          const bounds = shape.getBounds();
          const shapeLeft = shape.transform.x + bounds.x;
          const shapeTop = shape.transform.y + bounds.y;
          const shapeRight = shapeLeft + bounds.width;
          const shapeBottom = shapeTop + bounds.height;

          // Check if shape overlaps with artboard (not just if top-left corner is inside)
          return !(shapeRight < artboard.x || 
                   shapeLeft > artboard.x + artboard.width ||
                   shapeBottom < artboard.y || 
                   shapeTop > artboard.y + artboard.height);
        });

        canvasWidth = artboard.width * exportScale;
        canvasHeight = artboard.height * exportScale;
        translateX = -artboard.x;
        translateY = -artboard.y;
        filename = `${artboard.name}-export-${Date.now()}.${exportFormat}`;
      } else if (exportMode === 'selection' && selectedShapes.length > 0) {
        // Export selected shapes with bounds fitting
        shapesToExport = selectedShapes;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        shapesToExport.forEach(shape => {
          const bounds = shape.getBounds();

          // Calculate transformed bounds by checking all four corners
          const corners = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x, y: bounds.y + bounds.height },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
          ];

          corners.forEach(corner => {
            // Apply transformations to each corner
            let x = corner.x;
            let y = corner.y;

            // Apply scale
            x *= shape.transform.scaleX;
            y *= shape.transform.scaleY;

            // Apply rotation
            if (shape.transform.rotation !== 0) {
              const cos = Math.cos(shape.transform.rotation * Math.PI / 180);
              const sin = Math.sin(shape.transform.rotation * Math.PI / 180);
              const newX = x * cos - y * sin;
              const newY = x * sin + y * cos;
              x = newX;
              y = newY;
            }

            // Apply translation
            x += shape.transform.x;
            y += shape.transform.y;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          });
        });

        const padding = 20;
        canvasWidth = (maxX - minX + padding * 2) * exportScale;
        canvasHeight = (maxY - minY + padding * 2) * exportScale;
        translateX = -minX + padding;
        translateY = -minY + padding;
        filename = `selection-export-${Date.now()}.${exportFormat}`;
      } else {
        // Export all shapes with bounds fitting
        shapesToExport = shapes;
        console.log(`Export attempt: Found ${shapesToExport.length} shapes to export`);
        if (shapesToExport.length === 0) {
          console.warn('No shapes found for export - creating blank canvas');
          // Create a blank canvas instead of returning
          canvasWidth = 800 * exportScale;
          canvasHeight = 600 * exportScale;
          translateX = 0;
          translateY = 0;
          filename = `all-export-${Date.now()}.${exportFormat}`;
        } else {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        shapesToExport.forEach(shape => {
          const bounds = shape.getBounds();

          // Calculate transformed bounds by checking all four corners
          const corners = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x, y: bounds.y + bounds.height },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
          ];

          corners.forEach(corner => {
            // Apply transformations to each corner
            let x = corner.x;
            let y = corner.y;

            // Apply scale
            x *= shape.transform.scaleX;
            y *= shape.transform.scaleY;

            // Apply rotation
            if (shape.transform.rotation !== 0) {
              const cos = Math.cos(shape.transform.rotation * Math.PI / 180);
              const sin = Math.sin(shape.transform.rotation * Math.PI / 180);
              const newX = x * cos - y * sin;
              const newY = x * sin + y * cos;
              x = newX;
              y = newY;
            }

            // Apply translation
            x += shape.transform.x;
            y += shape.transform.y;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          });
        });

          const padding = 20;
          canvasWidth = (maxX - minX + padding * 2) * exportScale;
          canvasHeight = (maxY - minY + padding * 2) * exportScale;
          translateX = -minX + padding;
          translateY = -minY + padding;
          filename = `all-shapes-export-${Date.now()}.${exportFormat}`;
        }
      }

      if (shapesToExport.length === 0) return;

      // Create export canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Set background for non-transparent formats
      if (!['png', 'webp', 'avif'].includes(exportFormat)) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      // Apply scaling and translation
      ctx.scale(exportScale, exportScale);
      ctx.translate(translateX, translateY);

      // Sort shapes by z-index and render them directly (no copying to avoid property corruption)
      const sortedShapes = [...shapesToExport].sort((a, b) => a.properties.zIndex - b.properties.zIndex);

      sortedShapes.forEach(shape => renderShapeForExport(ctx, shape));

      // Export using helper function that handles all formats including PDF
      exportCanvasAsFormat(canvas, filename, exportFormat, exportQuality, exportScale);
      
      // Add a small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('❌ Export failed:', error);
      } finally {
        setIsExporting(false);
      }
    };

    const performBatchExport = (filename: string) => {
      // Export all shapes for batch mode
      const shapesToExport = shapes;
      console.log(`Batch export: Found ${shapesToExport.length} shapes to export as ${filename}`);
      
      // Set canvas dimensions based on shapes or default size
      let canvasWidth = 800 * exportScale;
      let canvasHeight = 600 * exportScale;
      let translateX = 0;
      let translateY = 0;

      if (shapesToExport.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        shapesToExport.forEach(shape => {
          const bounds = shape.getBounds();
          const corners = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x, y: bounds.y + bounds.height },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
          ];

          corners.forEach(corner => {
            let x = corner.x * shape.transform.scaleX;
            let y = corner.y * shape.transform.scaleY;

            if (shape.transform.rotation !== 0) {
              const cos = Math.cos(shape.transform.rotation * Math.PI / 180);
              const sin = Math.sin(shape.transform.rotation * Math.PI / 180);
              const newX = x * cos - y * sin;
              const newY = x * sin + y * cos;
              x = newX;
              y = newY;
            }

            x += shape.transform.x;
            y += shape.transform.y;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          });
        });

        const padding = 20;
        canvasWidth = (maxX - minX + padding * 2) * exportScale;
        canvasHeight = (maxY - minY + padding * 2) * exportScale;
        translateX = -minX + padding;
        translateY = -minY + padding;
      }

      // Create export canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Failed to get canvas context for batch export');
        return;
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Set background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Apply scaling and translation
      ctx.scale(exportScale, exportScale);
      ctx.translate(translateX, translateY);

      // Render shapes
      const sortedShapes = [...shapesToExport].sort((a, b) => a.properties.zIndex - b.properties.zIndex);
      sortedShapes.forEach(shape => renderShapeForExport(ctx, shape));

      // Export using helper function that handles all formats including PDF
      exportCanvasAsFormat(canvas, filename, exportFormat, exportQuality, exportScale);
    };

    // NEW BATCH EXPORT WITH ZIP PACKAGING
    const handleBatchExportNew = async () => {
      if (!exportSettings.exportBatchModeEnabled) return;

      setIsBatchExporting(true);
      setBatchProgress(0);
      // Calculate actual number of images to export for step calculation
      const actualImageCount = exportAllImages ? exportBatchCount : selectedImageIndices.length;
      
      // Calculate total steps based on packaging mode and actual image count
      const totalSteps = packageAsZip 
        ? (actualImageCount * 2) + 2 // 2 steps per image + zip creation + download
        : (actualImageCount * 3); // 2 steps per image + individual download per image
      setBatchTotalSteps(totalSteps);
      setBatchStatus('Initializing batch export...');
      console.log(`🚀 BATCH EXPORT: Starting ${actualImageCount} exports (${packageAsZip ? 'ZIP package' : 'individual files'}) - ${exportAllImages ? 'All images' : 'Selected images'}`);
      
      // Get the target artboard for shape generation
      const targetArtboard = exportMode === 'artboard' && selectedArtboardForExport 
        ? artboards.find(ab => ab.id === selectedArtboardForExport)
        : artboards.find(ab => ab.id === activeArtboard);
      
      const generationBounds = targetArtboard ? {
        x: targetArtboard.x,
        y: targetArtboard.y,
        width: targetArtboard.width,
        height: targetArtboard.height
      } : {
        x: -200,
        y: -200,
        width: 400,
        height: 400
      };
      
      console.log(`📐 Using bounds: ${generationBounds.width}x${generationBounds.height} at (${generationBounds.x}, ${generationBounds.y})`);
      
      try {
        // Initialize packaging based on user setting
        setBatchStatus(packageAsZip ? 'Initializing ZIP archive...' : 'Preparing individual files...');
        const zip = packageAsZip ? new JSZip() : null;
        const timestamp = Date.now();
        const individualFiles: Array<{blob: Blob, filename: string}> = [];
        
        let currentStep = 1; // Start at 1 to avoid initial 0% display
        
        // Determine which images to export based on exportAllImages setting
        const imagesToExport = exportAllImages 
          ? Array.from({ length: exportBatchCount }, (_, i) => i)
          : selectedImageIndices;
        
        console.log(`🎯 Export selection: ${exportAllImages ? 'All images' : 'Selected images'} - Processing indices: [${imagesToExport.join(', ')}]`);
        
        for (let loopIndex = 0; loopIndex < imagesToExport.length; loopIndex++) {
          const i = imagesToExport[loopIndex];
          console.log(`🎨 Creating artwork ${i + 1} of ${exportBatchCount}`);
          console.log(`📊 BATCH PROCESSING: ${i + 1} of ${exportBatchCount} exports`);
          
          // STEP 1: Shape Generation
          setBatchStatus(`Generating shapes for artwork ${i + 1}...`);
          setBatchProgress(currentStep);
          console.log(`📊 PROGRESS UPDATE: Step ${currentStep}/${totalSteps} - Generating shapes for artwork ${i + 1}`);
          
          // Force UI update before incrementing step
          await new Promise(resolve => {
            setTimeout(() => {
              console.log(`⏳ Shape generation delay completed for artwork ${i + 1} - Progress: ${currentStep}/${totalSteps}`);
              resolve(undefined);
            }, 200); // Reduced delay for better responsiveness
          });
          
          currentStep++;
          
          // Clear canvas and generate fresh shapes
          onClearAll?.();
          await new Promise(resolve => setTimeout(resolve, 200));

          // Generate shapes for this export using batch configuration
          // Use user's configured generations per export and shape count values
          let generationCallsCount: number;
          
          // When Shape Sets are enabled, ignore generations per export setting
          if (exportSettings.generationSetsEnabled && generationSets && generationSets.length > 0) {
            generationCallsCount = 1; // Each set runs once
            console.log(`🔢 SHAPE SETS MODE: Each set runs once (generationCallsCount=1)`);
          } else {
            // Determine generations per export based on user's mode setting
            if (generationConfigSettings?.generationCountMode === 'fixed') {
              generationCallsCount = generationConfigSettings?.generationCountDefine || 5;
              console.log(`🔢 Using FIXED generations per export: ${generationCallsCount} (user configured)`);
            } else if (generationConfigSettings?.generationCountMode === 'range') {
              // Use user's configured range from UI slider (exportShapeCountRange controlled by user)
              generationCallsCount = Math.floor(Math.random() * (exportShapeCountRange[1] - exportShapeCountRange[0] + 1)) + exportShapeCountRange[0];
              console.log(`🔢 Using RANGE generations per export: ${generationCallsCount} (random ${exportShapeCountRange[0]}-${exportShapeCountRange[1]} from user range slider)`);
            } else {
              // Fallback to default
              generationCallsCount = 5;
              console.log(`🔢 Using DEFAULT generations per export: ${generationCallsCount} (fallback)`);
            }
          }

          // Simulate multiple button presses - each call generates shapes based on user's shape count settings
          const currentExportShapes: Shape[] = [];
          
          // Check if generation sets mode is enabled
          if (exportSettings.generationSetsEnabled && generationSets && generationSets.length > 0) {
            const enabledSets = generationSets
              .filter(set => set.enabled)
              .sort((a, b) => a.generationOrder - b.generationOrder); // Sort by generationOrder
            
            if (enabledSets.length > 0) {
              console.log(`🎯 GENERATION SETS MODE: Using ${enabledSets.length} enabled sets`);
              
              // DIAGNOSTIC: Log each set's batchConfig on load
              enabledSets.forEach((set, idx) => {
                console.log(`🔍 [DIAGNOSTIC] Set ${idx + 1} "${set.name}" batchConfig:`, {
                  hasConfig: !!set.batchConfig,
                  propertiesEnabled: set.batchConfig?.propertiesEnabled,
                  fillColorMode: set.batchConfig?.fillColorMode,
                  fillColorDefine: set.batchConfig?.fillColorDefine,
                  fillOpacityDefine: set.batchConfig?.fillOpacityDefine,
                  fillStyleProbability: set.batchConfig?.fillStyleProbability
                });
              });
              
              // Loop through each generation call
              for (let callIndex = 0; callIndex < generationCallsCount; callIndex++) {
                // Generate shapes for each enabled set
                for (let setIndex = 0; setIndex < enabledSets.length; setIndex++) {
                  const set = enabledSets[setIndex];
                  
                  // Calculate shape count for this set
                  let shapesFromThisCall: number;
                  const isFixedMode = set.shapeCountMode === ShapeCountMode.FIXED || String(set.shapeCountMode).toLowerCase() === 'fixed';
                  if (isFixedMode) {
                    shapesFromThisCall = set.shapeCountFixed || 10;
                    console.log(`📞 [${set.name}] Generation ${callIndex + 1}/${generationCallsCount}: Creating ${shapesFromThisCall} shapes (FIXED)`);
                  } else {
                    shapesFromThisCall = Math.floor(Math.random() * (set.shapeCountRange[1] - set.shapeCountRange[0] + 1)) + set.shapeCountRange[0];
                    console.log(`📞 [${set.name}] Generation ${callIndex + 1}/${generationCallsCount}: Creating ${shapesFromThisCall} shapes (RANGE ${set.shapeCountRange[0]}-${set.shapeCountRange[1]})`);
                  }
                  
                  // Create overrides from set configuration
                  const overrides = {
                    enabledShapeTypes: new Set(set.enabledShapeTypes as ShapeType[]),
                    batchConfig: set.batchConfig,
                    scatterSettings: {
                      shapeCountMode: set.shapeCountMode,
                      fixedShapeCount: set.shapeCountFixed,
                      minCount: set.shapeCountRange[0],
                      maxCount: set.shapeCountRange[1],
                      shapeSpecific: set.shapeSpecificProperties
                    },
                    setTransform: set.setTransform,
                    artboardAlignment: set.artboardAlignment
                  };
                  
                  // DIAGNOSTIC: Log overrides being passed
                  console.log(`🔍 [DIAGNOSTIC] Passing overrides for "${set.name}":`, {
                    hasOverrides: !!overrides,
                    hasBatchConfig: !!overrides.batchConfig,
                    fillColorMode: overrides.batchConfig?.fillColorMode,
                    fillColorDefine: overrides.batchConfig?.fillColorDefine,
                    propertiesEnabled: overrides.batchConfig?.propertiesEnabled
                  });
                  
                  const newShapes = onGenerateShapesWithBatchConfig(
                    shapesFromThisCall, 
                    generationBounds, 
                    true, 
                    i + callIndex * 1000 + setIndex, 
                    set.shapeSpecificProperties,
                    overrides
                  );
                  
                  // Apply set-specific post-processing
                  // Apply z-index offset based on generation order (1000x spacing ensures sets never overlap)
                  newShapes.forEach(shape => {
                    shape.properties.zIndex += set.generationOrder * 1000;
                  });
                  
                  // Apply blend modes and compositing operations
                  const effectiveBlendMode = (set.compositingOperation && set.compositingOperation !== 'source-over')
                    ? set.compositingOperation
                    : set.setBlendMode;
                  
                  if (effectiveBlendMode && effectiveBlendMode !== 'source-over') {
                    newShapes.forEach(shape => {
                      shape.properties.blendMode = effectiveBlendMode as any;
                    });
                  }
                  
                  // Apply visibility and opacity
                  if (set.setVisibility) {
                    if (!set.setVisibility.visible) {
                      // Skip adding these shapes if set is not visible
                      continue;
                    }
                    if (set.setVisibility.opacity !== undefined && set.setVisibility.opacity < 1.0) {
                      const variance = set.setVisibility.opacityVariance || 0;
                      newShapes.forEach(shape => {
                        const randomVariance = (Math.random() - 0.5) * 2 * variance;
                        const finalOpacity = Math.max(0, Math.min(1, set.setVisibility.opacity + randomVariance));
                        shape.properties.fillOpacity *= finalOpacity;
                        shape.properties.strokeOpacity *= finalOpacity;
                      });
                    }
                  }
                  
                  currentExportShapes.push(...newShapes);
                }
              }
            } else {
              console.log(`⚠️ No enabled generation sets, using current UI state as fallback`);
              // Fallback to current UI state
              for (let callIndex = 0; callIndex < generationCallsCount; callIndex++) {
                let shapesFromThisCall: number;
                if (scatterSettings.shapeCountMode === 'fixed') {
                  shapesFromThisCall = scatterSettings.fixedShapeCount || 10;
                  console.log(`📞 Generation call ${callIndex + 1}/${generationCallsCount}: Creating ${shapesFromThisCall} shapes (FIXED user configured)`);
                } else {
                  shapesFromThisCall = Math.floor(Math.random() * (scatterSettings.maxCount - scatterSettings.minCount + 1)) + scatterSettings.minCount;
                  console.log(`📞 Generation call ${callIndex + 1}/${generationCallsCount}: Creating ${shapesFromThisCall} shapes (RANGE ${scatterSettings.minCount}-${scatterSettings.maxCount})`);
                }
                const newShapes = onGenerateShapesWithBatchConfig(shapesFromThisCall, generationBounds, true, i + callIndex * 1000);
                currentExportShapes.push(...newShapes);
              }
            }
          } else {
            // Generation sets disabled - use current UI state
            console.log(`🎯 NORMAL MODE: Using current UI state`);
            for (let callIndex = 0; callIndex < generationCallsCount; callIndex++) {
              let shapesFromThisCall: number;
              
              // Determine shapes per generation based on user's shape count mode
              if (scatterSettings.shapeCountMode === 'fixed') {
                shapesFromThisCall = scatterSettings.fixedShapeCount || 10;
                console.log(`📞 Generation call ${callIndex + 1}/${generationCallsCount}: Creating ${shapesFromThisCall} shapes (FIXED user configured)`);
              } else {
                shapesFromThisCall = Math.floor(Math.random() * (scatterSettings.maxCount - scatterSettings.minCount + 1)) + scatterSettings.minCount;
                console.log(`📞 Generation call ${callIndex + 1}/${generationCallsCount}: Creating ${shapesFromThisCall} shapes (RANGE ${scatterSettings.minCount}-${scatterSettings.maxCount})`);
              }
              
              const newShapes = onGenerateShapesWithBatchConfig(shapesFromThisCall, generationBounds, true, i + callIndex * 1000);
              currentExportShapes.push(...newShapes);
            }
          }
          
          console.log(`✨ Generated ${currentExportShapes.length} total shapes from ${generationCallsCount} generation calls for export ${i + 1}`);

          // Create image data for ZIP with timestamp
          const imageTimestamp = Date.now() + i; // Unique timestamp for each image
          const filename = `batch-${String(i + 1).padStart(3, '0')}-${imageTimestamp}.${exportFormat}`;
          
          if (currentExportShapes.length > 0) {
            // STEP 2: Image Creation and Export
            setBatchStatus(`Creating image for artwork ${i + 1}...`);
            setBatchProgress(currentStep);
            console.log(`📊 PROGRESS UPDATE: Step ${currentStep}/${totalSteps} - Creating image for artwork ${i + 1}`);
            
            // Force UI update before incrementing step
            await new Promise(resolve => {
              setTimeout(() => {
                console.log(`⏳ Image creation delay completed for artwork ${i + 1} - Progress: ${currentStep}/${totalSteps}`);
                resolve(undefined);
              }, 200); // Reduced delay for better responsiveness
            });
            
            currentStep++;
            
            console.log(`🖼️ Processing ${currentExportShapes.length} shapes for ${filename}`);
            
            // Use artboard bounds for export dimensions when in artboard mode
            let canvasWidth, canvasHeight, translateX, translateY;
            
            if (exportMode === 'artboard' && targetArtboard) {
              // Use exact artboard dimensions
              canvasWidth = targetArtboard.width * exportScale;
              canvasHeight = targetArtboard.height * exportScale;
              translateX = -targetArtboard.x;
              translateY = -targetArtboard.y;
              console.log(`📐 Using artboard bounds: ${targetArtboard.width}x${targetArtboard.height}`);
            } else {
              // Calculate dynamic bounds based on shapes
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
              
              currentExportShapes.forEach(shape => {
                const bounds = shape.getBounds();
                const corners = [
                  { x: bounds.x, y: bounds.y },
                  { x: bounds.x + bounds.width, y: bounds.y },
                  { x: bounds.x, y: bounds.y + bounds.height },
                  { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
                ];
                
                corners.forEach(corner => {
                  let x = corner.x * shape.transform.scaleX;
                  let y = corner.y * shape.transform.scaleY;
                  
                  if (shape.transform.rotation !== 0) {
                    const angle = (shape.transform.rotation * Math.PI) / 180;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    const rotatedX = x * cos - y * sin;
                    const rotatedY = x * sin + y * cos;
                    x = rotatedX;
                    y = rotatedY;
                  }
                  
                  x += shape.transform.x;
                  y += shape.transform.y;

                  minX = Math.min(minX, x);
                  minY = Math.min(minY, y);
                  maxX = Math.max(maxX, x);
                  maxY = Math.max(maxY, y);
                });
              });

              const padding = 20;
              canvasWidth = (maxX - minX + padding * 2) * exportScale;
              canvasHeight = (maxY - minY + padding * 2) * exportScale;
              translateX = -minX + padding;
              translateY = -minY + padding;
              console.log(`📐 Using dynamic bounds: ${canvasWidth/exportScale}x${canvasHeight/exportScale}`);
            }

            // Create canvas and render
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              throw new Error(`Failed to get canvas context for export ${i + 1}`);
            }
            
            try {
              canvas.width = canvasWidth;
              canvas.height = canvasHeight;

              // Use artboard background color if in artboard mode, otherwise white
              const exportBackgroundColor = (exportMode === 'artboard' && targetArtboard) 
                ? (targetArtboard.backgroundColor || '#ffffff')
                : '#ffffff';
              ctx.fillStyle = exportBackgroundColor;
              ctx.fillRect(0, 0, canvasWidth, canvasHeight);

              ctx.scale(exportScale, exportScale);
              ctx.translate(translateX, translateY);

              // Check if we need set-based rendering (for compositing operations)
              const hasCompositingOperations = exportSettings.generationSetsEnabled && 
                generationSets?.some(set => set.enabled && set.compositingOperation && set.compositingOperation !== 'source-over');

              if (hasCompositingOperations && exportSettings.generationSetsEnabled && generationSets) {
                // SET-BASED RENDERING: Group shapes by generation set and use offscreen canvases for proper compositing
                console.log('🎨 Using set-based rendering with offscreen canvases for compositing operations');
                
                const enabledSets = generationSets
                  .filter(set => set.enabled)
                  .sort((a, b) => a.generationOrder - b.generationOrder);
                
                // Group shapes by set using z-index ranges (sets use 1000x multiplier)
                const shapesBySet: Map<number, Shape[]> = new Map();
                currentExportShapes.forEach(shape => {
                  const setIndex = Math.floor(shape.properties.zIndex / 1000);
                  if (!shapesBySet.has(setIndex)) {
                    shapesBySet.set(setIndex, []);
                  }
                  shapesBySet.get(setIndex)!.push(shape);
                });
                
                // Render each set to an offscreen canvas, then composite onto main canvas
                enabledSets.forEach((set, idx) => {
                  const setShapes = shapesBySet.get(set.generationOrder) || [];
                  if (setShapes.length === 0) return;
                  
                  console.log(`🖼️ Rendering set "${set.name}" (${setShapes.length} shapes) to offscreen canvas`);
                  
                  // Create offscreen canvas for this set
                  const setCanvas = document.createElement('canvas');
                  setCanvas.width = canvas.width;
                  setCanvas.height = canvas.height;
                  const setCtx = setCanvas.getContext('2d');
                  
                  if (!setCtx) {
                    console.error(`Failed to create context for set "${set.name}"`);
                    return;
                  }
                  
                  // Apply same transform as main canvas
                  setCtx.scale(exportScale, exportScale);
                  setCtx.translate(translateX, translateY);
                  
                  // Render shapes for this set (sorted by z-index within set)
                  const sortedSetShapes = [...setShapes].sort((a, b) => a.properties.zIndex - b.properties.zIndex);
                  sortedSetShapes.forEach(shape => renderShapeForExport(setCtx, shape));
                  
                  // Composite set canvas onto main canvas with appropriate blend mode/compositing
                  ctx.save();
                  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to draw at pixel coordinates
                  
                  const effectiveBlendMode = (set.compositingOperation && set.compositingOperation !== 'source-over')
                    ? set.compositingOperation
                    : set.setBlendMode;
                  
                  if (effectiveBlendMode && effectiveBlendMode !== 'source-over') {
                    ctx.globalCompositeOperation = effectiveBlendMode as GlobalCompositeOperation;
                    console.log(`🎨 Applying ${effectiveBlendMode} to set "${set.name}"`);
                  }
                  
                  // Draw the set canvas onto main canvas
                  ctx.drawImage(setCanvas, 0, 0);
                  ctx.restore();
                  
                  // Cleanup
                  setCtx.clearRect(0, 0, setCanvas.width, setCanvas.height);
                  setCanvas.width = 0;
                  setCanvas.height = 0;
                });
              } else {
                // STANDARD RENDERING: Render all shapes directly to main canvas (no compositing operations)
                console.log('🎨 Using standard per-shape rendering');
                const sortedShapes = [...currentExportShapes].sort((a, b) => a.properties.zIndex - b.properties.zIndex);
                sortedShapes.forEach(shape => renderShapeForExport(ctx, shape));
              }

              // Convert canvas to blob and add to ZIP
              if (exportFormat === 'pdf') {
                // Handle PDF separately for ZIP exports
                const pdf = new jsPDF({
                  orientation: canvasWidth > canvasHeight ? 'landscape' : 'portrait',
                  unit: 'pt',
                  format: [canvasWidth / exportScale, canvasHeight / exportScale]
                });
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvasWidth / exportScale, canvasHeight / exportScale);
                const pdfBlob = pdf.output('blob');
                if (packageAsZip && zip) {
                  zip.file(filename, pdfBlob);
                  console.log(`📦 Added ${filename} to ZIP`);
                } else {
                  individualFiles.push({ blob: pdfBlob, filename });
                  console.log(`📁 Prepared ${filename} for individual download`);
                }
              } else {
                // Handle raster formats
                let dataURL: string;
                switch (exportFormat) {
                  case 'jpg':
                    dataURL = canvas.toDataURL('image/jpeg', exportQuality / 100);
                    break;
                  case 'webp':
                    dataURL = canvas.toDataURL('image/webp', exportQuality / 100);
                    break;
                  case 'avif':
                    dataURL = canvas.toDataURL('image/avif', exportQuality / 100);
                    break;
                  case 'bmp':
                    dataURL = canvas.toDataURL('image/bmp');
                    break;
                  case 'png':
                  default:
                    dataURL = canvas.toDataURL('image/png');
                    break;
                }
                
                if (packageAsZip && zip) {
                  // Extract base64 data from data URL for ZIP
                  const base64Data = dataURL.split(',')[1];
                  zip.file(filename, base64Data, { base64: true });
                  console.log(`📦 Added ${filename} to ZIP`);
                } else {
                  // Convert data URL to blob for individual download
                  const response = await fetch(dataURL);
                  const blob = await response.blob();
                  individualFiles.push({ blob, filename });
                  console.log(`📁 Prepared ${filename} for individual download`);
                }
              }

              // Save project file if enabled
              if (exportSaveProjectFiles) {
                const projectFilename = filename.replace(/\.(png|jpg|webp|avif|bmp|pdf)$/, '.json');
                const projectData = {
                  shapes: currentExportShapes,
                  groups: [], // Empty for batch exports
                  enabledShapeTypes: Array.from(enabledShapeTypes),
                  artboards: targetArtboard ? [targetArtboard] : [],
                  metadata: {
                    exportIndex: i + 1,
                    totalExports: exportBatchCount,
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                    exportMode: exportMode,
                    generationBounds: generationBounds,
                    imageFilename: filename,
                    shapeCount: currentExportShapes.length,
                    description: `Batch export ${i + 1} of ${exportBatchCount} - Generated ${currentExportShapes.length} shapes`
                  }
                };
                
                const projectJson = JSON.stringify(projectData, null, 2);
                
                if (packageAsZip && zip) {
                  zip.file(projectFilename, projectJson);
                  console.log(`💾 Added project file ${projectFilename} to ZIP`);
                } else {
                  const projectBlob = new Blob([projectJson], { type: 'application/json' });
                  individualFiles.push({ blob: projectBlob, filename: projectFilename });
                  console.log(`📁 Prepared project file ${projectFilename} for individual download`);
                }
              }
            } catch (canvasError) {
              throw new Error(`Canvas rendering failed for export ${i + 1}: ${canvasError instanceof Error ? canvasError.message : 'Unknown canvas error'}`);
            } finally {
              // Immediate canvas cleanup to prevent memory leaks
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              canvas.width = 0;
              canvas.height = 0;
              console.log(`🧹 Cleaned up canvas for image ${i + 1}`);
            }
          } else {
            console.error(`❌ No shapes generated for export ${i + 1}`);
          }

          // Progress already updated after image creation step
        }
        
        // FINAL STEP: Package and Download
        if (packageAsZip && zip) {
          // ZIP Creation and Download
          setBatchStatus('Creating ZIP file...');
          setBatchProgress(currentStep);
          console.log(`📊 PROGRESS UPDATE: Step ${currentStep}/${totalSteps} - Creating ZIP file`);
          
          // Force UI update before incrementing step
          await new Promise(resolve => {
            setTimeout(() => {
              console.log(`⏳ ZIP creation delay completed - Progress: ${currentStep}/${totalSteps}`);
              resolve(undefined);
            }, 300); // Reduced delay for better responsiveness
          });
          
          currentStep++;
          
          const projectFilesText = exportSaveProjectFiles ? ` and ${exportBatchCount} project files` : '';
          console.log(`📦 Creating ZIP file with ${exportBatchCount} images${projectFilesText}`);
          
          let zipBlob;
          try {
            setBatchStatus('Generating ZIP file...');
            
            // Use compression level 1 for better mobile compatibility (faster, less memory-intensive)
            zipBlob = await zip.generateAsync({ 
              type: 'blob',
              compression: 'DEFLATE',
              compressionOptions: { level: 1 }
            });
            
            console.log(`✅ ZIP blob generated successfully, size: ${zipBlob.size} bytes`);
            
            // Check if blob is too large for mobile browsers (warn if > 100MB)
            if (zipBlob.size > 100 * 1024 * 1024) {
              console.warn(`⚠️ Large ZIP file (${Math.round(zipBlob.size / 1024 / 1024)}MB) - may cause issues on mobile`);
            }
          } catch (zipError) {
            throw new Error(`Failed to generate ZIP file: ${zipError instanceof Error ? zipError.message : 'Unknown ZIP error'}`);
          }
        
          setBatchStatus('Downloading ZIP file...');
          setBatchProgress(currentStep);
          console.log(`📊 PROGRESS UPDATE: Step ${currentStep}/${totalSteps} - Downloading ZIP file`);
          
          // Force UI update before download
          await new Promise(resolve => {
            setTimeout(() => {
              console.log(`⏳ Download preparation delay completed - Progress: ${currentStep}/${totalSteps}`);
              resolve(undefined);
            }, 300); // Reduced delay for better responsiveness
          });
          
          currentStep++;
          
          try {
            setBatchStatus('Triggering download...');
            console.log(`📥 Creating download link for ZIP file (${zipBlob.size} bytes)`);
            
            const link = document.createElement('a');
            const blobUrl = URL.createObjectURL(zipBlob);
            
            // Enhanced mobile compatibility settings
            link.href = blobUrl;
            link.download = `batch-export-${timestamp}.zip`;
            link.style.display = 'none';
            link.target = '_blank'; // Helps with some mobile browsers
            
            // Add to DOM temporarily for better mobile compatibility
            document.body.appendChild(link);
          
          // Use multiple methods for better mobile compatibility
          try {
            link.click();
            console.log(`📱 Primary download method triggered`);
          } catch (clickError) {
            console.warn(`⚠️ Primary download failed, trying fallback:`, clickError);
            // Fallback: try to trigger download event manually
            const event = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true
            });
            link.dispatchEvent(event);
          }
          
          // Clean up DOM
          setTimeout(() => {
            if (document.body.contains(link)) {
              document.body.removeChild(link);
            }
          }, 1000);
          
          // Clean up blob URL immediately after download starts
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
            console.log(`🧹 Cleaned up blob URL`);
          }, 2000); // Reduced from 10 seconds to 2 seconds for better performance
          
            setBatchStatus('Download initiated!');
            console.log(`🎉 ZIP COMPLETE: Download initiated for batch-export-${timestamp}.zip with ${exportBatchCount} images${projectFilesText}`);
          } catch (downloadError) {
            throw new Error(`Failed to trigger download: ${downloadError instanceof Error ? downloadError.message : 'Unknown download error'}`);
          }
        } else {
          // Individual File Downloads
          setBatchStatus('Downloading individual files...');
          console.log(`📁 INDIVIDUAL FILES: Starting ${individualFiles.length} individual downloads`);
          
          // Detect mobile device once for the entire download session
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          const delayMs = isMobile ? 3000 : 800; // 3 seconds for mobile, 800ms for desktop
          console.log(`📱 Device detected: ${isMobile ? 'mobile' : 'desktop'} - using ${delayMs}ms delays between downloads`);
          
          for (let fileIndex = 0; fileIndex < individualFiles.length; fileIndex++) {
            const { blob, filename } = individualFiles[fileIndex];
            
            // Add delay BEFORE each download (including the first one) to let browser settle
            if (fileIndex > 0 || isMobile) {
              setBatchStatus(`Preparing download ${fileIndex + 1}/${individualFiles.length} - waiting for browser...`);
              console.log(`⏳ Pre-download delay (${delayMs}ms) before ${filename}`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            
            setBatchStatus(`Downloading ${filename} (${fileIndex + 1}/${individualFiles.length})...`);
            setBatchProgress(currentStep);
            console.log(`📊 PROGRESS UPDATE: Step ${currentStep}/${totalSteps} - Downloading ${filename}`);
            currentStep++;
            
            try {
              const link = document.createElement('a');
              const blobUrl = URL.createObjectURL(blob);
              
              link.href = blobUrl;
              link.download = filename;
              link.style.display = 'none';
              link.target = '_blank';
              
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              // Clean up blob URL after a delay
              setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
              }, 5000);
              
              console.log(`✅ Downloaded ${filename}`);
              
            } catch (downloadError) {
              console.error(`❌ Failed to download ${filename}:`, downloadError);
              // Continue with other files even if one fails
            }
            
            // ALWAYS add delay after each download, regardless of success/failure
            if (fileIndex < individualFiles.length - 1) { // Don't delay after the last file
              console.log(`⏳ Post-download delay (${delayMs}ms) after ${filename}`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          }
          
          setBatchStatus('All downloads completed!');
          console.log(`🎉 INDIVIDUAL FILES COMPLETE: Downloaded ${individualFiles.length} files`);
        }
        
        // Mark progress as complete
        setBatchProgress(totalSteps);
        setBatchStatus('Export completed successfully!');
        
        // Show persistent success message  
        const projectFilesText = exportSaveProjectFiles ? ` and ${exportBatchCount} project files` : '';
        const successMessage = packageAsZip 
          ? `✅ Success! Downloaded batch-export-${timestamp}.zip with ${exportBatchCount} images${projectFilesText}`
          : `✅ Success! Downloaded ${individualFiles.length} individual files`;
        setBatchResultMessage(successMessage);
        setShowBatchResult(true);
        
        console.log(`✅ Export complete - Progress: ${totalSteps}/${totalSteps} (100%) - Manual dismiss required`);
        
      } catch (error) {
        console.error('❌ Batch export error:', error);
        
        // Create a more detailed error message for mobile users who can't check console
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const detailedError = `Export failed: ${errorMessage}`;
        
        setBatchStatus(detailedError);
        console.error('❌ DETAILED ERROR:', {
          error: errorMessage,
          timestamp: new Date().toISOString(),
          exportBatchCount,
          exportFormat,
          enabledShapeTypes: Array.from(enabledShapeTypes)
        });
        
        // Mark progress as failed but visible
        setBatchStatus(`Export failed: ${errorMessage}`);
        
        // Show persistent error message
        setBatchResultMessage(`❌ Export failed: ${errorMessage}`);
        setShowBatchResult(true);
        
        console.log(`❌ Export failed - Progress: ${batchProgress}/${totalSteps} - Manual dismiss required`);
        
      } finally {
        onClearAll?.();
        // Keep the progress dialog visible until manually dismissed by user
        // setIsBatchExporting(false); // Removed to prevent auto-dismiss
        // setBatchProgress(0); // Keep progress visible
        // setBatchStatus(''); // Keep final status visible
        console.log(`🔄 Export process completed - progress dialog remains visible for manual dismiss`);
      }
    };

    const handleSaveProject = () => {
      const projectData = {
        shapes: shapes,
        groups: selectedGroups,
        artboards: artboards,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `shape-editor-project-${Date.now()}.json`;
      link.click();

      URL.revokeObjectURL(url);
    };

    return (
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Export Mode</Label>
            <Select value={exportMode} onValueChange={(value: any) => setExportMode(value)}>
              <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="selection" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">Selected Shapes</SelectItem>
                <SelectItem value="artboard" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">Artboard Content</SelectItem>
                <SelectItem value="all" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">All Shapes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {exportMode === 'artboard' && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Select Artboard</Label>
              <Select value={selectedArtboardForExport} onValueChange={setSelectedArtboardForExport}>
                <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600">
                  <SelectValue placeholder="Choose artboard..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {artboards.map((artboard) => (
                    <SelectItem key={artboard.id} value={artboard.id} className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">
                      {artboard.name} ({artboard.width}×{artboard.height})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Export Format</Label>
            <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="png" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">PNG (Transparent)</SelectItem>
                <SelectItem value="jpg" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">JPG (Compressed)</SelectItem>
                <SelectItem value="webp" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">WebP (Modern)</SelectItem>
                <SelectItem value="avif" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">AVIF (Next-gen)</SelectItem>
                <SelectItem value="bmp" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">BMP (Uncompressed)</SelectItem>
                <SelectItem value="svg" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">SVG (Vector)</SelectItem>
                <SelectItem value="pdf" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">PDF (Print)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {['jpg', 'webp', 'avif'].includes(exportFormat) && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Quality</Label>
              <Slider
                value={[exportQuality]}
                onValueChange={([value]) => setExportQuality(value)}
                min={10}
                max={100}
                step={1}
                className="w-full"
              />
              <span className="text-xs text-slate-500">{exportQuality}%</span>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Scale</Label>
            <Slider
              value={[exportScale]}
              onValueChange={([value]) => setExportScale(value)}
              min={0.5}
              max={4}
              step={0.5}
              className="w-full"
            />
            <span className="text-xs text-slate-500">{exportScale}x</span>
          </div>

          <Button
            onClick={handleExportShapes}
            disabled={
              isExporting ||
              isBatchExporting ||
              (exportMode === 'selection' && selectedShapes.length === 0) ||
              (exportMode === 'artboard' && (!selectedArtboardForExport || artboards.length === 0)) ||
              (exportMode === 'all' && shapes.length === 0)
            }
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Exporting...
              </>
            ) : (
              <>
                <FileImage className="w-4 h-4 mr-2" />
                {exportMode === 'selection' && `Export Selected (${selectedShapes.length})`}
                {exportMode === 'artboard' && selectedArtboardForExport && 
                  `Export ${artboards.find(ab => ab.id === selectedArtboardForExport)?.name || 'Artboard'}`}
                {exportMode === 'artboard' && !selectedArtboardForExport && 'Select Artboard to Export'}
                {exportMode === 'all' && `Export All Shapes (${shapes.length})`}
              </>
            )}
          </Button>
        </div>

        <Separator className="bg-slate-600" />

        {/* Batch Export Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-300">Batch Export</Label>
            <div className="flex items-center space-x-2">
              <Label htmlFor="batch-mode" className="text-xs text-slate-400">Enable</Label>
              <Switch
                id="batch-mode"
                checked={exportSettings.exportBatchModeEnabled}
                disabled={isLoadingExportSettings}
                onCheckedChange={(checked) => {
                  console.log('Batch export toggle clicked:', checked);
                  updateExportSettings.mutate({ exportBatchModeEnabled: checked as boolean });
                }}
              />
            </div>
          </div>

          {exportSettings.exportBatchModeEnabled && (
            <>
              <div className={`space-y-2 ${exportSettings.generationSetsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center space-x-2">
                  <Label className="text-xs text-slate-400">
                    Generations per Export
                  </Label>
                  <Select 
                    value={generationConfigSettings?.generationCountMode || 'range'} 
                    onValueChange={(value) => {
                      console.log('Updating generationCountMode to:', value, 'Current enabledShapeTypes size:', enabledShapeTypes.size);
                      onUpdateGenerationConfigSettings({ generationCountMode: value as 'range' | 'fixed' | 'incremental' });
                    }}
                    disabled={exportSettings.generationSetsEnabled}
                  >
                    <SelectTrigger className="h-6 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                      <SelectItem value="fixed" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
                      <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {generationConfigSettings?.generationCountMode === 'range' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Min: {exportShapeCountRange[0]}</span>
                      <span className="text-slate-400">Max: {exportShapeCountRange[1]}</span>
                    </div>
                    <Slider
                      value={exportShapeCountRange}
                      onValueChange={(value) => setExportShapeCountRange(value as [number, number])}
                      min={1}
                      max={20}
                      step={1}
                      className="w-full"
                      minStepsBetweenThumbs={1}
                    />
                  </div>
                )}
                
                {generationConfigSettings?.generationCountMode === 'fixed' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-300">Fixed Value: {generationConfigSettings?.generationCountDefine || 5}</Label>
                    <Slider
                      value={[generationConfigSettings?.generationCountDefine || 5]}
                      onValueChange={([value]) => onUpdateGenerationConfigSettings({ generationCountDefine: value })}
                      min={1}
                      max={20}
                      step={1}
                      className="[&_[role=slider]]:bg-blue-600"
                    />
                  </div>
                )}
                
                {generationConfigSettings?.generationCountMode === 'incremental' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-300">Start Value: {generationConfigSettings?.generationCountStartValue || 1}</Label>
                    <Slider
                      value={[generationConfigSettings?.generationCountStartValue || 1]}
                      onValueChange={([value]) => onUpdateGenerationConfigSettings({ generationCountStartValue: value })}
                      min={1}
                      max={15}
                      step={1}
                      className="[&_[role=slider]]:bg-blue-600"
                    />
                    <Label className="text-xs text-slate-300">Increment: {generationConfigSettings?.generationCountIncrement || 1}</Label>
                    <Slider
                      value={[generationConfigSettings?.generationCountIncrement || 1]}
                      onValueChange={([value]) => onUpdateGenerationConfigSettings({ generationCountIncrement: value })}
                      min={1}
                      max={5}
                      step={1}
                      className="[&_[role=slider]]:bg-blue-600"
                    />
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={generationConfigSettings?.generationCountResetPerBatch || false}
                        onCheckedChange={(checked) => onUpdateGenerationConfigSettings({ generationCountResetPerBatch: checked as boolean })}
                        className="border-slate-500 data-[state=checked]:bg-blue-600"
                      />
                      <Label className="text-xs text-slate-300">Reset per batch</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={generationConfigSettings?.generationCountModulationEnabled || false}
                        onCheckedChange={(checked) => onUpdateGenerationConfigSettings({ generationCountModulationEnabled: checked as boolean })}
                        className="border-slate-500 data-[state=checked]:bg-blue-600"
                      />
                      <Label className="text-xs text-slate-300">Enable Modulation</Label>
                    </div>
                    {generationConfigSettings?.generationCountModulationEnabled && (
                      <>
                        <Label className="text-xs text-slate-300">Modulation Value: {generationConfigSettings?.generationCountModulationValue || 0.5}</Label>
                        <Slider
                          value={[generationConfigSettings?.generationCountModulationValue || 0.5]}
                          onValueChange={([value]) => onUpdateGenerationConfigSettings({ generationCountModulationValue: value })}
                          min={1}
                          max={10}
                          step={1}
                          className="[&_[role=slider]]:bg-blue-600"
                        />
                      </>
                    )}
                    <p className="text-xs text-slate-400">Stepped generation count (start + export × increment, with optional modulation)</p>
                  </div>
                )}
              </div>

              <Separator className="bg-slate-700" />

              {/* Shape Sets Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-slate-800/30 rounded border border-slate-600">
                  <div className="flex items-center space-x-2">
                    <Boxes className="w-3 h-3 text-slate-400" />
                    <Label className="text-xs text-slate-300">Shape Sets</Label>
                  </div>
                  <Switch
                    checked={exportSettings.generationSetsEnabled}
                    onCheckedChange={(checked) => {
                      updateExportSettings.mutate({ generationSetsEnabled: checked as boolean });
                    }}
                    disabled={!exportSettings.exportBatchModeEnabled}
                    data-testid="toggle-generation-sets"
                  />
                </div>

                {/* Prerequisites messaging */}
                {!exportSettings.exportBatchModeEnabled && (
                  <div className="text-xs text-slate-500 bg-yellow-900/20 p-2 rounded border border-yellow-500/30">
                    <div className="flex items-center space-x-1 mb-1">
                      <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
                      <span className="text-yellow-300 font-medium">Prerequisites Required</span>
                    </div>
                    <div className="space-y-1">
                      <div>• Enable batch export mode above</div>
                    </div>
                  </div>
                )}

                {/* Shape Sets enabled messaging */}
                {exportSettings.generationSetsEnabled && exportSettings.exportBatchModeEnabled && (
                  <div className="text-xs text-slate-500 bg-blue-900/20 p-2 rounded border border-blue-500/30">
                    <div className="flex items-center space-x-1 mb-1">
                      <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                      <span className="text-blue-300 font-medium">Shape Sets Active</span>
                    </div>
                    All enabled shape sets combine to create each export. Manage sets in the Shape Sets Manager.
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Number of Exports</span>
                  <span className="text-slate-300">{exportBatchCount}</span>
                </div>
                <Slider
                  value={[exportBatchCount]}
                  onValueChange={([value]) => setExportBatchCount(value)}
                  min={1}
                  max={100}
                  step={1}
                  className="w-full"
                  data-testid="slider-export-batch-count"
                />
              </div>

              {(() => {
                // Calculate if project files option should be disabled
                const imageCount = exportAllImages ? exportBatchCount : selectedImageIndices.length;
                const isDisabled = imageCount === 0;
                
                return (
                  <div className={`flex items-center justify-between p-2 rounded border ${
                    isDisabled 
                      ? 'bg-slate-900/50 border-slate-700 opacity-50' 
                      : 'bg-slate-800/30 border-slate-600'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <Save className={`w-3 h-3 ${isDisabled ? 'text-slate-500' : 'text-slate-400'}`} />
                      <div className="flex flex-col">
                        <Label className={`text-xs ${isDisabled ? 'text-slate-500' : 'text-slate-300'}`}>
                          Export Project Files
                        </Label>
                        {isDisabled && (
                          <span className="text-xs text-slate-600">
                            No images selected for export
                          </span>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={exportSaveProjectFiles}
                      onCheckedChange={setExportSaveProjectFiles}
                      disabled={isDisabled}
                    />
                  </div>
                );
              })()}

              {exportSaveProjectFiles && (
                <div className="text-xs text-slate-500 bg-blue-900/20 p-2 rounded border border-blue-500/30">
                  <div className="flex items-center space-x-1 mb-1">
                    <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                    <span className="text-blue-300 font-medium">Project Files Enabled</span>
                  </div>
                  Each exported image will include a corresponding project file (.json) containing all shapes and settings. You can reload these files later to continue editing specific batched images.
                </div>
              )}

              <div className="flex items-center justify-between p-2 bg-slate-800/30 rounded border border-slate-600">
                <div className="flex items-center space-x-2">
                  <ImageIcon className="w-3 h-3 text-slate-400" />
                  <Label className="text-xs text-slate-300">Export All Images</Label>
                </div>
                <Switch
                  checked={exportAllImages}
                  onCheckedChange={setExportAllImages}
                  data-testid="toggle-export-all-images"
                />
              </div>

              {(() => {
                // Calculate total items to export for Package as ZIP logic
                const imageCount = exportAllImages ? exportBatchCount : selectedImageIndices.length;
                const projectFileCount = exportSaveProjectFiles ? imageCount : 0;
                const totalItems = imageCount + projectFileCount;
                const isDisabled = totalItems <= 1;
                
                return (
                  <div className={`flex items-center justify-between p-2 rounded border ${
                    isDisabled 
                      ? 'bg-slate-900/50 border-slate-700 opacity-50' 
                      : 'bg-slate-800/30 border-slate-600'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <Package className={`w-3 h-3 ${isDisabled ? 'text-slate-500' : 'text-slate-400'}`} />
                      <div className="flex flex-col">
                        <Label className={`text-xs ${isDisabled ? 'text-slate-500' : 'text-slate-300'}`}>
                          Package as ZIP
                        </Label>
                        {isDisabled && (
                          <span className="text-xs text-slate-600">
                            Only 1 item - no ZIP needed
                          </span>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={packageAsZip}
                      onCheckedChange={setPackageAsZip}
                      disabled={isDisabled}
                      data-testid="toggle-package-as-zip"
                    />
                  </div>
                );
              })()}

              {!exportAllImages && (
                <div className="space-y-2 p-3 bg-orange-900/20 rounded border border-orange-500/30" data-testid="accordion-selective-export">
                  <div className="flex items-center space-x-1 mb-2">
                    <div className="w-1 h-1 bg-orange-400 rounded-full"></div>
                    <span className="text-orange-300 font-medium text-xs">Selective Export</span>
                  </div>
                  <Label className="text-xs text-slate-400">Select images to export (1-{exportBatchCount}):</Label>
                  <div className="grid grid-cols-5 gap-1 max-h-24 overflow-y-auto">
                    {Array.from({ length: exportBatchCount }, (_, i) => i + 1).map((imageIndex) => (
                      <div key={imageIndex} className="flex items-center space-x-1">
                        <Checkbox
                          checked={selectedImageIndices.includes(imageIndex)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedImageIndices([...selectedImageIndices, imageIndex]);
                            } else {
                              setSelectedImageIndices(selectedImageIndices.filter(idx => idx !== imageIndex));
                            }
                          }}
                          className="border-slate-500 data-[state=checked]:bg-orange-600"
                          data-testid={`checkbox-image-${imageIndex}`}
                        />
                        <Label className="text-xs text-slate-300">{imageIndex}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-slate-500">
                    Selected: {selectedImageIndices.length} of {exportBatchCount} images
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Export Info</Label>
                <div className="text-xs text-slate-500 bg-slate-800 p-2 rounded border border-slate-600">
                  {exportSaveProjectFiles ? (
                    packageAsZip 
                      ? 'Project files (.json) with shape data will be packaged in a ZIP file'
                      : 'Project files (.json) with shape data will be downloaded individually'
                  ) : (
                    packageAsZip 
                      ? 'Images will be packaged into a single ZIP file'
                      : 'Individual image files will be downloaded'
                  )}
                  
                  {(() => {
                    // Mobile device detection for helpful UX message
                    const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    const imageCount = exportAllImages ? exportBatchCount : selectedImageIndices.length;
                    const showMobileWarning = isMobile && !packageAsZip && imageCount > 1;
                    
                    return showMobileWarning ? (
                      <div className="mt-2 p-2 bg-blue-900/20 rounded border border-blue-500/30">
                        <div className="text-blue-300 font-medium text-xs mb-1">📱 Mobile Tip</div>
                        <div className="text-blue-200 text-xs">
                          Individual downloads have 2-second delays on mobile to prevent download interruptions. 
                          Consider enabling "Package as ZIP" for faster download.
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              {isBatchExporting && (
                <div className="space-y-2 p-3 bg-purple-900/20 rounded border border-purple-500/30">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-300 font-medium">Batch Export Progress</span>
                    <span className="text-purple-200">
                      {batchProgress}/{batchTotalSteps} ({Math.round((batchProgress / Math.max(batchTotalSteps, 1)) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((batchProgress / Math.max(batchTotalSteps, 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-purple-400">
                    {batchStatus || 'Processing...'}
                  </div>
                  {batchProgress >= batchTotalSteps && (
                    <div className="text-xs text-green-400 font-medium">
                      ✅ Export process completed - Use X button above to close
                    </div>
                  )}
                </div>
              )}
              
              {showBatchResult && (
                <div className="relative space-y-2 p-3 bg-slate-900/50 rounded border border-gray-500/30">
                  <button 
                    onClick={() => {
                      setShowBatchResult(false);
                      setBatchResultMessage('');
                      setIsBatchExporting(false); // Close the entire progress dialog when manually dismissed
                    }}
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-full transition-colors"
                    data-testid="close-batch-result"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="text-sm text-white whitespace-pre-wrap break-words pr-8">
                    {batchResultMessage}
                  </div>
                </div>
              )}

              <Button
                onClick={handleBatchExportNew}
                disabled={isBatchExporting || enabledShapeTypes.size === 0}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 text-white"
                title={enabledShapeTypes.size === 0 ? `No shape types enabled (${enabledShapeTypes.size})` : undefined}
              >
                {isBatchExporting ? (
                  <>
                    <div className="w-3 h-3 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Exporting... ({Math.round((batchProgress / batchTotalSteps) * 100)}%)
                  </>
                ) : (
                  <>
                    <Boxes className="w-3 h-3 mr-1" />
                    Start Batch Export
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* API Call Generator */}
        <div className="mt-6 pt-4 border-t border-slate-700">
          <div className="mb-3">
            <Label className="text-xs text-slate-400">Quick Actions</Label>
          </div>
          <ApiCallGenerator 
            enabledShapeTypes={enabledShapeTypes}
            scatterSettings={scatterSettings}
            generationConfigSettings={generationConfigSettings}
            exportBatchModeEnabled={exportSettings.exportBatchModeEnabled}
            exportSaveProjectFiles={exportSaveProjectFiles}
            exportBatchCount={exportBatchCount}
            packageAsZip={packageAsZip}
            exportAllImages={exportAllImages}
            selectedImageIndices={selectedImageIndices}
            exportShapeCountRange={exportShapeCountRange}
            exportQuality={92}
            exportScale={1}
            exportFormat="png"
            exportScope="all"
            artboards={artboards}
            activeArtboard={activeArtboard}
            className="w-full text-xs"
          />
        </div>
      </div>
    );
  }

  // Move expanded shapes state outside of function to prevent reset on re-renders
  const [expandedShapes, setExpandedShapes] = useState<Set<string>>(new Set());
  
  // Add state for the shape list accordion to prevent auto-expansion
  const [shapeListAccordionOpen, setShapeListAccordionOpen] = useState<string | undefined>(undefined);
  
  // Add state for main sidebar accordion sections to prevent collapse on value changes
  const [openAccordionSections, setOpenAccordionSections] = useState<string[]>([]);
  
  // Add state for shape categories accordion to prevent collapse when shapes are toggled
  const [openShapeCategories, setOpenShapeCategories] = useState<string[]>(["Basic", "Geometric", "Special", "Lines & Curves", "Complex"]);
  
  // Scroll position preservation with better control
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const savedScrollPosition = useRef<number>(0);
  const isUserScrolling = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Save scroll position and track user-initiated scrolls
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const handleScroll = () => {
        // Mark as user scrolling
        isUserScrolling.current = true;
        savedScrollPosition.current = container.scrollTop;
        
        // Clear previous timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        // Reset user scrolling flag after a brief delay
        scrollTimeoutRef.current = setTimeout(() => {
          isUserScrolling.current = false;
        }, 150);
      };
      
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, []);
  
  // Restore scroll position after re-renders only if not currently scrolling
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container && savedScrollPosition.current > 0 && !isUserScrolling.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (container && !isUserScrolling.current) {
          container.scrollTop = savedScrollPosition.current;
        }
      });
    }
  });

  const toggleShapeExpansion = useCallback((shapeType: string) => {
    setExpandedShapes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(shapeType)) {
        newExpanded.delete(shapeType);
      } else {
        newExpanded.add(shapeType);
      }
      return newExpanded;
    });
  }, []);

  // Simplified callback for BatchConfigDialog
  const handleBatchConfigSettingsChange = useCallback((settings: BatchConfigSettings) => {
    onUpdateGenerationConfigSettings(settings);
  }, [onUpdateGenerationConfigSettings]);

  function ShapeTypesContent() {

    const getShapeProperties = (shapeType: string) => {
      switch (shapeType) {
        case 'polygon':
          return (
            <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
              <StyledModeField
                label="Edge Count"
                config={convertScatterToModeConfig('polygon', 'edgeCount', scatterSettings, [3, 20])}
                onChange={(config) => handleScatterModeConfigChange('polygon', 'edgeCount', config, scatterSettings, onUpdateScatterSettings)}
                bounds={{ min: 3, max: 20 }}
                step={1}
                allowedModes={['fixed', 'range']}
              />
            </div>
          );
        
        case 'line-vector':
          // Deep merge with defaults to backfill missing fields in legacy configs
          const lineVectorConfig = { 
            ...getDefaultLineVectorConfig(), 
            ...(scatterSettings.shapeSpecific['line-vector'] || {}) 
          };
          return (
            <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
              <StyledModeField
                label="Direction"
                config={convertLineVectorToModeConfig(lineVectorConfig.direction)}
                onChange={(modeConfig) => {
                  handleLineVectorModeConfigChange('direction', modeConfig, scatterSettings, onUpdateScatterSettings);
                }}
                bounds={{ min: 0, max: 360 }}
                unit="°"
                step={15}
              />
              
              <Separator className="bg-slate-600" />
              
              <StyledModeField
                label="Length"
                config={convertLineVectorToModeConfig(lineVectorConfig.length)}
                onChange={(modeConfig) => {
                  handleLineVectorModeConfigChange('length', modeConfig, scatterSettings, onUpdateScatterSettings);
                }}
                bounds={{ min: 5, max: 500 }}
                unit="px"
                step={5}
              />
              
              <Separator className="bg-slate-600" />
              
              <StyledModeField
                label="Centroid"
                config={convertLineVectorToModeConfig(lineVectorConfig.centroid)}
                onChange={(modeConfig) => {
                  handleLineVectorModeConfigChange('centroid', modeConfig, scatterSettings, onUpdateScatterSettings);
                }}
                bounds={{ min: 0, max: 1 }}
                step={0.01}
              />
              
              <Separator className="bg-slate-600" />
              
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Stroke Cap Probabilities (%)</Label>
                <div className="space-y-2">
                  {['round', 'square', 'butt'].map((cap) => (
                    <div key={cap} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 capitalize">{cap}</span>
                        <span className="text-slate-400">{(scatterSettings.shapeSpecific['line-vector']?.strokeCapProbabilities as any)?.[cap] || 0}%</span>
                      </div>
                      <Slider
                        value={[(scatterSettings.shapeSpecific['line-vector']?.strokeCapProbabilities as any)?.[cap] || 0]}
                        onValueChange={(value) => {
                          const probability = value[0];
                          onUpdateScatterSettings({
                            shapeSpecific: {
                              ...scatterSettings.shapeSpecific,
                              'line-vector': { 
                                ...lineVectorConfig,
                                strokeCapProbabilities: {
                                  round: cap === 'round' ? probability : (scatterSettings.shapeSpecific['line-vector']?.strokeCapProbabilities?.round || 0),
                                  square: cap === 'square' ? probability : (scatterSettings.shapeSpecific['line-vector']?.strokeCapProbabilities?.square || 0),
                                  butt: cap === 'butt' ? probability : (scatterSettings.shapeSpecific['line-vector']?.strokeCapProbabilities?.butt || 0)
                                }
                              }
                            }
                          });
                        }}
                        min={0}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        
        case 'circle':
        case 'ellipse':
          return (
            <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
              <StyledModeField
                label="Segment Count"
                config={convertScatterToModeConfig(shapeType, 'segmentCount', scatterSettings, [16, 32])}
                onChange={(config) => handleScatterModeConfigChange(shapeType, 'segmentCount', config, scatterSettings, onUpdateScatterSettings)}
                bounds={{ min: 8, max: 64 }}
                step={1}
                allowedModes={['fixed', 'range']}
              />
            </div>
          );
        
        case 'bezier':
        case 'smooth-spline':
          return (
            <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
              <StyledModeField
                label="Point Count"
                config={convertScatterToModeConfig(shapeType, 'pointCount', scatterSettings, [3, 6])}
                onChange={(config) => handleScatterModeConfigChange(shapeType, 'pointCount', config, scatterSettings, onUpdateScatterSettings)}
                bounds={{ min: 3, max: 10 }}
                step={1}
                allowedModes={['fixed', 'range']}
              />
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Open/Closed Probability</Label>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Open: {(scatterSettings.shapeSpecific[shapeType as 'bezier' | 'smooth-spline'] as any)?.openProbability ?? 50}%</span>
                    <span className="text-slate-400">Closed: {100 - ((scatterSettings.shapeSpecific[shapeType as 'bezier' | 'smooth-spline'] as any)?.openProbability ?? 50)}%</span>
                  </div>
                  <Slider
                    value={[(scatterSettings.shapeSpecific[shapeType as 'bezier' | 'smooth-spline'] as any)?.openProbability ?? 50]}
                    onValueChange={([value]) => {
                      console.log(`${shapeType} open probability: ${value}%`);
                      onUpdateScatterSettings({
                        shapeSpecific: {
                          ...scatterSettings.shapeSpecific,
                          [shapeType]: { 
                            ...(scatterSettings.shapeSpecific[shapeType as 'bezier' | 'smooth-spline'] || {}),
                            openProbability: value 
                          }
                        }
                      });
                    }}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Stroke Cap Probability</Label>
                <div className="space-y-2">
                  {['round', 'square', 'butt'].map((cap) => {
                    const currentValue = (scatterSettings.shapeSpecific[shapeType as 'bezier' | 'smooth-spline'] as any)?.strokeCapProbabilities?.[cap] ?? (cap === 'round' ? 50 : 25);
                    return (
                      <div key={cap} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <Label className="text-slate-300 capitalize">{cap}</Label>
                          <span className="text-slate-400">{currentValue}%</span>
                        </div>
                        <Slider
                          value={[currentValue]}
                          onValueChange={([value]) => {
                            console.log(`${shapeType} ${cap} cap: ${value}%`);
                            const currentCaps = (scatterSettings.shapeSpecific[shapeType as 'bezier' | 'smooth-spline'] as any)?.strokeCapProbabilities ?? { round: 50, square: 25, butt: 25 };
                            onUpdateScatterSettings({
                              shapeSpecific: {
                                ...scatterSettings.shapeSpecific,
                                [shapeType]: { 
                                  ...(scatterSettings.shapeSpecific[shapeType as 'bezier' | 'smooth-spline'] || {}),
                                  strokeCapProbabilities: {
                                    ...currentCaps,
                                    [cap]: value
                                  }
                                }
                              }
                            });
                          }}
                          min={0}
                          max={50}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );

        case 'star':
          return (
            <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
              <StyledModeField
                label="Point Count"
                config={convertScatterToModeConfig('star', 'pointCount', scatterSettings, [5, 8])}
                onChange={(config) => handleScatterModeConfigChange('star', 'pointCount', config, scatterSettings, onUpdateScatterSettings)}
                bounds={{ min: 5, max: 12 }}
                step={1}
                allowedModes={['fixed', 'range']}
              />
              
              <Separator className="bg-slate-600" />
              
              <StyledModeField
                label="Inner Radius"
                config={convertScatterToModeConfig('star', 'innerRadius', scatterSettings, [30, 70])}
                onChange={(config) => handleScatterModeConfigChange('star', 'innerRadius', config, scatterSettings, onUpdateScatterSettings)}
                bounds={{ min: 10, max: 90 }}
                step={1}
                unit="%"
                allowedModes={['fixed', 'range']}
              />
            </div>
          );

        case 'ring':
          return (
            <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
              <StyledModeField
                label="Inner Radius"
                config={convertScatterToModeConfig('ring', 'innerRadius', scatterSettings, [20, 80])}
                onChange={(config) => handleScatterModeConfigChange('ring', 'innerRadius', config, scatterSettings, onUpdateScatterSettings)}
                bounds={{ min: 10, max: 90 }}
                step={1}
                unit="%"
                allowedModes={['fixed', 'range']}
              />
            </div>
          );

        case 'spline-ring':
          return (
            <div className="space-y-4 p-3 bg-slate-800/30 rounded border border-slate-600">
              <StyledModeField
                label="Inner Radius"
                config={convertScatterToModeConfig('spline-ring', 'innerRadius', scatterSettings, [20, 80])}
                onChange={(config) => handleScatterModeConfigChange('spline-ring', 'innerRadius', config, scatterSettings, onUpdateScatterSettings)}
                bounds={{ min: 10, max: 90 }}
                step={1}
                unit="%"
                allowedModes={['fixed', 'range']}
              />
            </div>
          );

        case 'line':
          return (
            <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
              <StyledModeField
                label="Point Count"
                config={convertScatterToModeConfig('line', 'pointCount', scatterSettings, [2, 4])}
                onChange={(config) => handleScatterModeConfigChange('line', 'pointCount', config, scatterSettings, onUpdateScatterSettings)}
                bounds={{ min: 2, max: 8 }}
                step={1}
                allowedModes={['fixed', 'range']}
              />
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Stroke Cap Probabilities (%)</Label>
                <div className="space-y-2">
                  {['round', 'square', 'butt'].map((cap) => (
                    <div key={cap} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 capitalize">{cap}</span>
                        <span className="text-slate-400">{(scatterSettings.shapeSpecific.line?.strokeCapProbabilities as any)?.[cap] || 0}%</span>
                      </div>
                      <Slider
                        value={[(scatterSettings.shapeSpecific.line?.strokeCapProbabilities as any)?.[cap] || 0]}
                        onValueChange={(value) => {
                          const probability = value[0];
                          onUpdateScatterSettings({
                            shapeSpecific: {
                              ...scatterSettings.shapeSpecific,
                              line: { 
                                pointCountRange: scatterSettings.shapeSpecific.line?.pointCountRange || [2, 4] as [number, number],
                                strokeCapProbabilities: {
                                  round: cap === 'round' ? probability : (scatterSettings.shapeSpecific.line?.strokeCapProbabilities?.round || 0),
                                  square: cap === 'square' ? probability : (scatterSettings.shapeSpecific.line?.strokeCapProbabilities?.square || 0),
                                  butt: cap === 'butt' ? probability : (scatterSettings.shapeSpecific.line?.strokeCapProbabilities?.butt || 0)
                                }
                              }
                            }
                          });
                        }}
                        min={0}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );

        case 'rectangle':
          return null; // Standard rectangle has no properties
          
        case 'rounded-rectangle':
        case 'rounded-square':
          return (
            <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
              <StyledModeField
                label="Corner Radius"
                config={convertScatterToModeConfig(shapeType, 'cornerRadius', scatterSettings, [0, 20])}
                onChange={(config) => handleScatterModeConfigChange(shapeType, 'cornerRadius', config, scatterSettings, onUpdateScatterSettings)}
                bounds={{ min: 0, max: 50 }}
                step={1}
                unit="px"
                allowedModes={['fixed', 'range']}
              />
            </div>
          );
          
        case 'cubic':
          return (
            <div className="space-y-4 p-3 bg-slate-800/30 rounded border border-slate-600">
              <StyledModeField
                label="Point Count"
                config={convertScatterToModeConfig('cubic', 'pointCount', scatterSettings, [3, 7])}
                onChange={(config) => handleScatterModeConfigChange('cubic', 'pointCount', config, scatterSettings, onUpdateScatterSettings)}
                bounds={{ min: 3, max: 8 }}
                step={1}
                allowedModes={['fixed', 'range']}
              />
              
              <Separator className="bg-slate-600" />
              
              <StyledModeField
                label="Curvature"
                config={convertScatterToModeConfig('cubic', 'curvature', scatterSettings, [20, 80])}
                onChange={(config) => handleScatterModeConfigChange('cubic', 'curvature', config, scatterSettings, onUpdateScatterSettings)}
                bounds={{ min: 10, max: 100 }}
                step={1}
                unit="%"
                allowedModes={['fixed', 'range']}
              />
              
              <Separator className="bg-slate-600" />
              
              <StyledModeField
                label="Curve Spread"
                config={convertScatterToModeConfig('cubic', 'spread', scatterSettings, [40, 120])}
                onChange={(config) => handleScatterModeConfigChange('cubic', 'spread', config, scatterSettings, onUpdateScatterSettings)}
                bounds={{ min: 20, max: 200 }}
                step={10}
                unit="px"
                allowedModes={['fixed', 'range']}
              />
              
              <Separator className="bg-slate-600" />

              <div className="space-y-3">
                <Label className="text-xs text-slate-400">Curve Pattern</Label>
                <Select 
                  value={String(scatterSettings.shapeSpecific.cubic?.patternType || 2)} 
                  onValueChange={(value) => {
                    onUpdateScatterSettings({
                      shapeSpecific: {
                        ...scatterSettings.shapeSpecific,
                        cubic: { 
                          pointCountRange: scatterSettings.shapeSpecific.cubic?.pointCountRange || [3, 7],
                          curvatureRange: scatterSettings.shapeSpecific.cubic?.curvatureRange || [0.2, 0.8],
                          spreadRange: scatterSettings.shapeSpecific.cubic?.spreadRange || [40, 120],
                          patternType: parseInt(value),
                          openProbability: scatterSettings.shapeSpecific.cubic?.openProbability || 85
                        }
                      }
                    });
                  }}
                >
                  <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Spiral</SelectItem>
                    <SelectItem value="1">Wave</SelectItem>
                    <SelectItem value="2">Organic</SelectItem>
                    <SelectItem value="3">Arc</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-slate-600" />

              <div className="space-y-3">
                <Label className="text-xs text-slate-400">Open Curve Probability: {scatterSettings.shapeSpecific.cubic?.openProbability || 85}%</Label>
                <Slider
                  value={[scatterSettings.shapeSpecific.cubic?.openProbability || 85]}
                  onValueChange={(value) => {
                    const probability = value[0];
                    onUpdateScatterSettings({
                      shapeSpecific: {
                        ...scatterSettings.shapeSpecific,
                        cubic: { 
                          pointCountRange: scatterSettings.shapeSpecific.cubic?.pointCountRange || [3, 7],
                          curvatureRange: scatterSettings.shapeSpecific.cubic?.curvatureRange || [0.2, 0.8],
                          spreadRange: scatterSettings.shapeSpecific.cubic?.spreadRange || [40, 120],
                          patternType: scatterSettings.shapeSpecific.cubic?.patternType || 2,
                          openProbability: probability
                        }
                      }
                    });
                  }}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            </div>
          );

        case 'square':
          return null; // Standard square has no properties

        default:
          return null;
      }
    };

    return (
      <div className="space-y-3">
        {/* Internal accordion to control shape list visibility */}
        <Accordion 
          type="single" 
          collapsible 
          value={shapeListAccordionOpen} 
          onValueChange={setShapeListAccordionOpen}
          className="w-full"
        >
          <AccordionItem value="shape-list" className="border-0">
            <AccordionTrigger className="text-xs text-slate-400 hover:text-slate-300 py-2 hover:no-underline">
              <span>Shape List ({Object.keys(shapeTypeDisplayNames).length} types)</span>
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="space-y-3">
                {/* Nested accordion for shape categories */}
                <Accordion 
                  type="multiple" 
                  className="w-full"
                  value={openShapeCategories}
                  onValueChange={setOpenShapeCategories}
                >
                  {Object.entries(SHAPE_CATEGORIES).map(([categoryName, categoryShapes]) => {
                    const enabledInCategory = categoryShapes.filter(shapeType => 
                      enabledShapeTypes.has(shapeType)
                    ).length;
                    
                    return (
                      <AccordionItem key={categoryName} value={categoryName} className="border-slate-700">
                        <AccordionTrigger className="text-xs text-slate-400 hover:text-slate-300 py-2 hover:no-underline">
                          <div className="flex items-center gap-2">
                            <span>{categoryName}</span>
                            <span className="text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded text-xs">
                              {enabledInCategory}/{categoryShapes.length}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2 pt-2">
                          {categoryShapes.map((shapeType) => {
                            const displayName = shapeTypeDisplayNames[shapeType];
                            const isEnabled = enabledShapeTypes.has(shapeType);
                            const isExpanded = expandedShapes.has(shapeType);
                            const hasProperties = ['polygon', 'circle', 'ellipse', 'bezier', 'cubic', 'smooth-spline', 'star', 'ring', 'spline-ring', 'line', 'line-vector', 'rounded-rectangle', 'rounded-square'].includes(shapeType);

                            return (
                              <div key={shapeType} className="space-y-2">
                                {/* Shape Toggle Row */}
                                <div className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                                  isEnabled ? 'bg-blue-900/30 border border-blue-500/50' : 'bg-slate-800/50 hover:bg-slate-700/50'
                                }`}>
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-3 h-3 rounded transition-colors ${
                                      isEnabled ? 'bg-blue-400' : 'bg-slate-500'
                                    }`} />
                                    <Label className={`text-sm transition-colors ${
                                      isEnabled ? 'text-blue-200' : 'text-slate-300'
                                    }`}>{displayName}</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {isEnabled && hasProperties && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleShapeExpansion(shapeType)}
                                        className="p-1 h-6 w-6 hover:bg-slate-700"
                                      >
                                        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${
                                          isExpanded ? 'rotate-180' : ''
                                        }`} />
                                      </Button>
                                    )}
                                    <Switch
                                      checked={isEnabled}
                                      onCheckedChange={() => onToggleShapeType(shapeType)}
                                      className="data-[state=checked]:bg-blue-600"
                                    />
                                  </div>
                                </div>
                                
                                {/* Shape Properties (Accordion Content) */}
                                {isEnabled && isExpanded && hasProperties && (
                                  <div className="ml-4">
                                    {getShapeProperties(shapeType)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
                
                {/* Separator inside accordion so it disappears when collapsed */}
                <Separator className="bg-slate-600" />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* All On/Off Buttons */}
        <div className="flex gap-2 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const allTypes = Object.keys(shapeTypeDisplayNames) as ShapeType[];
              allTypes.forEach(type => {
                if (!enabledShapeTypes.has(type)) {
                  onToggleShapeType(type);
                }
              });
            }}
            className="flex-1 h-7 text-xs bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-200"
          >
            All On
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const enabledTypes = Array.from(enabledShapeTypes);
              enabledTypes.forEach(type => {
                onToggleShapeType(type);
              });
            }}
            className="flex-1 h-7 text-xs bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-200"
          >
            All Off
          </Button>
        </div>

        {/* Shape Count Settings */}
        <div className="space-y-2 pb-6">
          <div className="flex items-center space-x-2">
            <Label className="text-xs text-slate-400">Shape Count</Label>
            <Select 
              value={scatterSettings.shapeCountMode || 'range'} 
              onValueChange={(value) => onUpdateScatterSettings({ shapeCountMode: value as 'range' | 'fixed' })}
            >
              <SelectTrigger className="h-6 w-16 text-xs bg-slate-700 border-slate-600 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                <SelectItem value="fixed" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {scatterSettings.shapeCountMode === 'range' ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Min: {scatterSettings.minCount}</span>
                <Input
                  type="number"
                  value={scatterSettings.minCount}
                  onChange={(e) => {
                    const value = Math.max(1, Math.min(Number(e.target.value), scatterSettings.maxCount - 1));
                    onUpdateScatterSettings({ minCount: value });
                  }}
                  className="h-5 w-12 text-xs bg-slate-800 border-slate-600 text-white px-1"
                  min={1}
                  max={49}
                />
                <span className="text-slate-400">Max: {scatterSettings.maxCount}</span>
                <Input
                  type="number"
                  value={scatterSettings.maxCount}
                  onChange={(e) => {
                    const value = Math.max(scatterSettings.minCount + 1, Math.min(Number(e.target.value), 50));
                    onUpdateScatterSettings({ maxCount: value });
                  }}
                  className="h-5 w-12 text-xs bg-slate-800 border-slate-600 text-white px-1"
                  min={2}
                  max={50}
                />
              </div>
              <Slider
                value={[scatterSettings.minCount, scatterSettings.maxCount]}
                onValueChange={([min, max]) => onUpdateScatterSettings({ minCount: min, maxCount: max })}
                min={1}
                max={50}
                step={1}
                className="w-full"
                minStepsBetweenThumbs={1}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Count: {scatterSettings.fixedShapeCount || 10}</span>
                <Input
                  type="number"
                  value={scatterSettings.fixedShapeCount || 10}
                  onChange={(e) => {
                    const value = Math.max(1, Math.min(Number(e.target.value), 50));
                    onUpdateScatterSettings({ fixedShapeCount: value });
                  }}
                  className="h-5 w-12 text-xs bg-slate-800 border-slate-600 text-white px-1"
                  min={1}
                  max={50}
                />
              </div>
              <Slider
                value={[scatterSettings.fixedShapeCount || 10]}
                onValueChange={([value]) => onUpdateScatterSettings({ fixedShapeCount: value })}
                min={1}
                max={50}
                step={1}
                className="w-full"
              />
            </div>
          )}
        </div>


        {/* Generate Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={onGenerateRandomShapes}
            className="flex-1 bg-[var(--editor-accent)] hover:bg-purple-700 text-white font-medium"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            {scatterSettings.shapeCountMode === 'fixed' 
              ? `Generate ${scatterSettings.fixedShapeCount || 10} Shapes`
              : `Generate ${scatterSettings.minCount}-${scatterSettings.maxCount} Shapes`
            }
          </Button>
        </div>
      </div>
    );
  }

  function CompositionContent() {
    return (
      <ScrollArea className="h-[400px] w-full">
        <div className="space-y-3 pr-4">
          <Button 
            onClick={onComposeShapes}
            disabled={!canComposeShapes}
            className="w-full bg-[var(--editor-accent)] hover:bg-purple-700 text-white font-medium mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Layers className="w-4 h-4 mr-2" />
            Compose Shapes
          </Button>

          <div className="space-y-3">
            <div className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
              scatterSettings.onPoints ? 'bg-orange-900/30 border border-orange-500/50' : 'bg-slate-800/50 hover:bg-slate-700/50'
            }`}>
              <div className="flex items-center space-x-3">
                <Navigation className={`w-4 h-4 transition-colors ${
                  scatterSettings.onPoints ? 'text-orange-400' : 'text-slate-400'
                }`} />
                <Label className={`text-sm transition-colors ${
                  scatterSettings.onPoints ? 'text-orange-200' : 'text-slate-300'
                }`}>Scatter on Points</Label>
              </div>
              <Switch
                checked={scatterSettings.onPoints}
                onCheckedChange={(checked) => onUpdateScatterSettings({ onPoints: checked })}
                className="data-[state=checked]:bg-orange-600"
              />
            </div>
            <div className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
              scatterSettings.insideArea ? 'bg-cyan-900/30 border border-cyan-500/50' : 'bg-slate-800/50 hover:bg-slate-700/50'
            }`}>
              <div className="flex items-center space-x-3">
                <Shapes className={`w-4 h-4 transition-colors ${
                  scatterSettings.insideArea ? 'text-cyan-400' : 'text-slate-400'
                }`} />
                <Label className={`text-sm transition-colors ${
                  scatterSettings.insideArea ? 'text-cyan-200' : 'text-slate-300'
                }`}>Scatter Inside Area</Label>
              </div>
              <Switch
                checked={scatterSettings.insideArea}
                onCheckedChange={(checked) => onUpdateScatterSettings({ insideArea: checked })}
                className="data-[state=checked]:bg-cyan-600"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Shape Count Range</Label>
              <div className="space-y-2">
                <Slider
                  value={[scatterSettings.count]}
                  onValueChange={([value]) => onUpdateScatterSettings({ count: value })}
                  min={1}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <span className="text-xs text-slate-500">{scatterSettings.count} shapes</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Randomness</Label>
              <div className="space-y-2">
                <Slider
                  value={[scatterSettings.randomness]}
                  onValueChange={([value]) => onUpdateScatterSettings({ randomness: value })}
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
                <span className="text-xs text-slate-500">{Math.round(scatterSettings.randomness * 100)}%</span>
              </div>
            </div>

            <Button
              onClick={onDistributeSelected}
              disabled={selectedCount < 2}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white"
            >
              <Boxes className="w-4 h-4 mr-2" />
              Distribute Selected ({selectedCount})
            </Button>
          </div>
        </div>
      </ScrollArea>
    );
  }

  function PropertiesContent() {
    return (
      <ScrollArea className="h-[400px] w-full">
        <div className="space-y-4 pr-4">
          <div className="text-sm text-slate-400">
            Selected: <span className="text-white font-medium">{selectedCount}</span> {selectedCount === 1 ? 'shape' : 'shapes'}
            {selectedCount === 1 && selectedShapes[0] && (
              <div className="text-xs text-slate-500 mt-1">
                Type: <span className="text-slate-300">{shapeTypeDisplayNames[selectedShapes[0].type] || selectedShapes[0].type}</span>
              </div>
            )}
          </div>

          {/* Shape Properties Information */}
          {selectedCount === 1 && selectedShapes[0] && (
            <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
              <Label className="text-sm text-slate-300 font-medium">Shape Properties</Label>
              
              <div className="space-y-2 text-xs">
                {(() => {
                  const shape = selectedShapes[0];
                  const properties = [];

                  // Basic position and transform info
                  properties.push(
                    <div key="position" className="flex justify-between">
                      <span className="text-slate-400">Position</span>
                      <span className="text-slate-300">
                        {Math.round(shape.transform.x)}, {Math.round(shape.transform.y)}
                      </span>
                    </div>
                  );

                  properties.push(
                    <div key="rotation" className="flex justify-between">
                      <span className="text-slate-400">Rotation</span>
                      <span className="text-slate-300">{Math.round(shape.transform.rotation)}°</span>
                    </div>
                  );

                  properties.push(
                    <div key="scale" className="flex justify-between">
                      <span className="text-slate-400">Scale</span>
                      <span className="text-slate-300">
                        {shape.transform.scaleX.toFixed(2)}×, {shape.transform.scaleY.toFixed(2)}×
                      </span>
                    </div>
                  );

                  // Shape-specific properties
                  switch (shape.type) {
                    case 'cubic':
                    case 'bezier':
                    case 'smooth-spline':
                      properties.push(
                        <div key="curve-type" className="flex justify-between">
                          <span className="text-slate-400">Curve Type</span>
                          <span className="text-slate-300 capitalize">
                            {shape.closed ? 'Closed' : 'Open'}
                          </span>
                        </div>
                      );
                      properties.push(
                        <div key="points" className="flex justify-between">
                          <span className="text-slate-400">Control Points</span>
                          <span className="text-slate-300">{shape.points?.length || 0}</span>
                        </div>
                      );
                      if (shape.tangentHandles?.length) {
                        properties.push(
                          <div key="handles" className="flex justify-between">
                            <span className="text-slate-400">Tangent Handles</span>
                            <span className="text-slate-300">{shape.tangentHandles.length}</span>
                          </div>
                        );
                      }
                      break;

                    case 'polygon':
                    case 'star':
                      if (shape.sides) {
                        properties.push(
                          <div key="sides" className="flex justify-between">
                            <span className="text-slate-400">{shape.type === 'star' ? 'Points' : 'Sides'}</span>
                            <span className="text-slate-300">{shape.sides}</span>
                          </div>
                        );
                      }
                      if (shape.type === 'star' && shape.innerRadius) {
                        properties.push(
                          <div key="inner-radius" className="flex justify-between">
                            <span className="text-slate-400">Inner Radius</span>
                            <span className="text-slate-300">{Math.round(shape.innerRadius)}px</span>
                          </div>
                        );
                      }
                      break;

                    case 'circle':
                    case 'ellipse':
                      if (shape.radius) {
                        properties.push(
                          <div key="radius" className="flex justify-between">
                            <span className="text-slate-400">Radius</span>
                            <span className="text-slate-300">{Math.round(shape.radius)}px</span>
                          </div>
                        );
                      }
                      break;

                    case 'rectangle':
                    case 'rounded-rectangle':
                    case 'square':
                    case 'rounded-square':
                      if (shape.width && shape.height) {
                        properties.push(
                          <div key="dimensions" className="flex justify-between">
                            <span className="text-slate-400">Dimensions</span>
                            <span className="text-slate-300">
                              {Math.round(shape.width)} × {Math.round(shape.height)}
                            </span>
                          </div>
                        );
                      }
                      if ((shape.type === 'rounded-rectangle' || shape.type === 'rounded-square') && shape.cornerRadius) {
                        properties.push(
                          <div key="corner-radius" className="flex justify-between">
                            <span className="text-slate-400">Corner Radius</span>
                            <span className="text-slate-300">{Math.round(shape.cornerRadius)}px</span>
                          </div>
                        );
                      }
                      break;

                    case 'line':
                      properties.push(
                        <div key="points" className="flex justify-between">
                          <span className="text-slate-400">Line Points</span>
                          <span className="text-slate-300">{shape.points?.length || 2}</span>
                        </div>
                      );
                      if (shape.strokeCap) {
                        properties.push(
                          <div key="stroke-cap" className="flex justify-between">
                            <span className="text-slate-400">Stroke Cap</span>
                            <span className="text-slate-300 capitalize">{shape.strokeCap}</span>
                          </div>
                        );
                      }
                      break;

                    case 'ring':
                    case 'spline-ring':
                      if (shape.radius) {
                        properties.push(
                          <div key="outer-radius" className="flex justify-between">
                            <span className="text-slate-400">Outer Radius</span>
                            <span className="text-slate-300">{Math.round(shape.radius)}px</span>
                          </div>
                        );
                      }
                      if (shape.innerRadius) {
                        properties.push(
                          <div key="inner-radius" className="flex justify-between">
                            <span className="text-slate-400">Inner Radius</span>
                            <span className="text-slate-300">{Math.round(shape.innerRadius)}px</span>
                          </div>
                        );
                      }
                      break;
                  }

                  // Common properties for all shapes
                  properties.push(
                    <div key="opacity" className="flex justify-between">
                      <span className="text-slate-400">Fill Opacity</span>
                      <span className="text-slate-300">{Math.round(shape.properties.fillOpacity * 100)}%</span>
                    </div>
                  );

                  if (shape.properties.strokeWidth > 0) {
                    properties.push(
                      <div key="stroke-width" className="flex justify-between">
                        <span className="text-slate-400">Stroke Width</span>
                        <span className="text-slate-300">{shape.properties.strokeWidth}px</span>
                      </div>
                    );
                  }

                  if (shape.properties.blurRadius > 0) {
                    properties.push(
                      <div key="blur" className="flex justify-between">
                        <span className="text-slate-400">Blur Radius</span>
                        <span className="text-slate-300">{shape.properties.blurRadius}px</span>
                      </div>
                    );
                  }

                  properties.push(
                    <div key="layer" className="flex justify-between">
                      <span className="text-slate-400">Layer Index</span>
                      <span className="text-slate-300">{shape.properties.zIndex}</span>
                    </div>
                  );

                  return properties;
                })()}
              </div>
            </div>
          )}

          {/* Multiple shapes selected - show aggregate information */}
          {selectedCount > 1 && (
            <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
              <Label className="text-sm text-slate-300 font-medium">Selection Properties</Label>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Shape Types</span>
                  <span className="text-slate-300">
                    {Array.from(new Set(selectedShapes.map(s => s.type))).length} different
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Shapes</span>
                  <span className="text-slate-300">{selectedCount}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Layer Range</span>
                  <span className="text-slate-300">
                    {Math.min(...selectedShapes.map(s => s.properties.zIndex))} - {Math.max(...selectedShapes.map(s => s.properties.zIndex))}
                  </span>
                </div>

                {/* Show types breakdown */}
                <div className="mt-2 pt-2 border-t border-slate-600">
                  <span className="text-slate-400 text-xs">Types breakdown:</span>
                  <div className="mt-1 space-y-1">
                    {Object.entries(
                      selectedShapes.reduce((acc, shape) => {
                        acc[shape.type] = (acc[shape.type] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([type, count]) => (
                      <div key={type} className="flex justify-between text-xs">
                        <span className="text-slate-500">{shapeTypeDisplayNames[type as ShapeType] || type}</span>
                        <span className="text-slate-400">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedCount > 0 && (
            <ShapePropertiesPanel 
              selectedShapes={selectedShapes}
              selectedGroups={selectedGroups}
              selectedCount={selectedCount}
            />
          )}

          {selectedCount === 0 && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 mb-4">
                Select shapes to edit their properties
              </div>
              
              {/* General Canvas Properties */}
              <div className="space-y-3">
                <Label className="text-sm text-slate-300 font-medium">Canvas Settings</Label>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-400">Background Color</Label>
                    <div className="w-6 h-6 rounded bg-slate-900 border border-slate-600"></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-400">Canvas Size</Label>
                    <span className="text-xs text-slate-300">1200 × 800</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-400">Zoom Level</Label>
                    <span className="text-xs text-slate-300">100%</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <Label className="text-sm text-slate-300 font-medium">Quick Actions</Label>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={onGenerateRandomShapes} variant="secondary" size="sm" className="text-xs bg-slate-700 hover:bg-slate-600">
                    Generate Random
                  </Button>
                  <Button onClick={() => onGenerateShapesWithBatchConfig(10, { x: 0, y: 0, width: 800, height: 600 })} variant="secondary" size="sm" className="text-xs bg-slate-700 hover:bg-slate-600">
                    Generate 10
                  </Button>
                  <Button onClick={() => {/* Select all functionality would be handled by parent */}} variant="secondary" size="sm" className="text-xs bg-slate-700 hover:bg-slate-600 opacity-50" disabled>
                    Select All
                  </Button>
                  <Button onClick={onClearAll} variant="secondary" size="sm" className="text-xs bg-slate-700 hover:bg-slate-600" disabled={!onClearAll}>
                    Clear Canvas
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    );
  }

  function LayersContent() {
    const blendModes = [
      'source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
      'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference',
      'exclusion', 'hue', 'saturation', 'color', 'luminosity'
    ];

    const sortedShapes = useMemo(() => {
      return (shapes || []).sort((a, b) => a.properties.zIndex - b.properties.zIndex);
    }, [shapes]);

    return (
      <div className="space-y-4">
        <div className="text-sm text-slate-400">
          Layers: <span className="text-white font-medium">{(shapes || []).length}</span> total
        </div>

        {selectedCount > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Layer Order</Label>
            <div className="grid grid-cols-2 gap-1">
              <Button onClick={onBringToFront} variant="secondary" size="sm" className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200">
                Bring to Front
              </Button>
              <Button onClick={onSendToBack} variant="secondary" size="sm" className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200">
                Send to Back
              </Button>
              <Button onClick={onBringForward} variant="secondary" size="sm" className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200">
                Bring Forward
              </Button>
              <Button onClick={onSendBackward} variant="secondary" size="sm" className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200">
                Send Backward
              </Button>
            </div>
          </div>
        )}

        {selectedCount > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Blend Mode</Label>
            <Select onValueChange={(value) => onChangeBlendMode(value as any)}>
              <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600">
                <SelectValue placeholder="source-over" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {blendModes.map((mode) => (
                  <SelectItem key={mode} value={mode} className="text-black data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">
                    {mode.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1 max-h-48 overflow-y-auto">
          {sortedShapes.map((shape) => (
            <div key={shape.id} className={`flex items-center justify-between p-2 rounded text-xs transition-colors cursor-pointer ${
              shape.selected ? 'bg-blue-500/30 border border-blue-500/50' : 'bg-slate-800/50 hover:bg-slate-700/50'
            }`}>
              <span className={shape.selected ? 'text-blue-200' : 'text-slate-300'}>
                {shape.type} (z: {shape.properties.zIndex})
              </span>
            </div>
          ))}
        </div>

        {sortedShapes.length === 0 && (
          <div className="text-xs text-slate-500 text-center py-4">
            No shapes on canvas
          </div>
        )}
      </div>
    );
  }

  function AlignDistributeContent() {
    const [distributionPattern, setDistributionPattern] = useState<'grid' | 'circle' | 'line' | 'spiral'>('grid');
    const [distributionSpacing, setDistributionSpacing] = useState(50);
    const [alignTarget, setAlignTarget] = useState<'selection' | 'canvas'>('selection');

    const handleAlign = (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (selectedShapes.length < 2) return;

      const bounds = selectedShapes.map(shape => {
        // Calculate shape bounds
        const minX = Math.min(...shape.points.map(p => p.x + shape.transform.x));
        const maxX = Math.max(...shape.points.map(p => p.x + shape.transform.x));
        const minY = Math.min(...shape.points.map(p => p.y + shape.transform.y));
        const maxY = Math.max(...shape.points.map(p => p.y + shape.transform.y));
        return { shape, minX, maxX, minY, maxY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
      });

      let targetValue: number;

      if (direction === 'left') {
        targetValue = Math.min(...bounds.map(b => b.minX));
        bounds.forEach(b => {
          b.shape.transform.x += targetValue - b.minX;
        });
      } else if (direction === 'right') {
        targetValue = Math.max(...bounds.map(b => b.maxX));
        bounds.forEach(b => {
          b.shape.transform.x += targetValue - b.maxX;
        });
      } else if (direction === 'center') {
        targetValue = bounds.reduce((sum, b) => sum + b.centerX, 0) / bounds.length;
        bounds.forEach(b => {
          b.shape.transform.x += targetValue - b.centerX;
        });
      } else if (direction === 'top') {
        targetValue = Math.min(...bounds.map(b => b.minY));
        bounds.forEach(b => {
          b.shape.transform.y += targetValue - b.minY;
        });
      } else if (direction === 'bottom') {
        targetValue = Math.max(...bounds.map(b => b.maxY));
        bounds.forEach(b => {
          b.shape.transform.y += targetValue - b.maxY;
        });
      } else if (direction === 'middle') {
        targetValue = bounds.reduce((sum, b) => sum + b.centerY, 0) / bounds.length;
        bounds.forEach(b => {
          b.shape.transform.y += targetValue - b.centerY;
        });
      }

      if (onShapeUpdate) onShapeUpdate();
    };

    const handleDistribute = (direction: 'horizontal' | 'vertical') => {
      if (selectedShapes.length < 3) return;

      const bounds = selectedShapes.map(shape => {
        const minX = Math.min(...shape.points.map(p => p.x + shape.transform.x));
        const maxX = Math.max(...shape.points.map(p => p.x + shape.transform.x));
        const minY = Math.min(...shape.points.map(p => p.y + shape.transform.y));
        const maxY = Math.max(...shape.points.map(p => p.y + shape.transform.y));
        return { shape, minX, maxX, minY, maxY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
      });

      if (direction === 'horizontal') {
        bounds.sort((a, b) => a.centerX - b.centerX);
        const totalSpace = bounds[bounds.length - 1].centerX - bounds[0].centerX;
        const spacing = totalSpace / (bounds.length - 1);

        bounds.forEach((b, index) => {
          if (index > 0 && index < bounds.length - 1) {
            const targetX = bounds[0].centerX + spacing * index;
            b.shape.transform.x += targetX - b.centerX;
          }
        });
      } else {
        bounds.sort((a, b) => a.centerY - b.centerY);
        const totalSpace = bounds[bounds.length - 1].centerY - bounds[0].centerY;
        const spacing = totalSpace / (bounds.length - 1);

        bounds.forEach((b, index) => {
          if (index > 0 && index < bounds.length - 1) {
            const targetY = bounds[0].centerY + spacing * index;
            b.shape.transform.y += targetY - b.centerY;
          }
        });
      }

      if (onShapeUpdate) onShapeUpdate();
    };

    const handleSmartDistribution = () => {
      const targetShapes = alignTarget === 'selection' ? selectedShapes : shapes;
      if (targetShapes.length < 2) return;

      // Use the distribution algorithm
      const bounds = { x: 0, y: 0, width: 800, height: 600 };
      const settings = {
        pattern: distributionPattern as any,
        spacing: distributionSpacing,
        randomness: 0.1,
        angle: 0,
        rotation: 0,
        scale: 1,
        density: 1,
        avoidOverlap: true,
        respectBounds: true
      };

      const positions = SmartDistributionAlgorithm.generatePositions(targetShapes.length, bounds, settings);

      targetShapes.forEach((shape, index) => {
        if (positions[index]) {
          shape.transform.x = positions[index].x;
          shape.transform.y = positions[index].y;
        }
      });

      if (onShapeUpdate) onShapeUpdate();
    };

    return (
      <div className="space-y-4">
        {/* Alignment Controls */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">Align ({selectedShapes.length} selected)</Label>
          <div className="grid grid-cols-3 gap-1">
            <Button
              onClick={() => handleAlign('left')}
              variant="secondary"
              size="sm"
              className="text-xs p-1 h-7"
              disabled={selectedShapes.length < 2}
            >
              <AlignLeft className="w-3 h-3" />
            </Button>
            <Button
              onClick={() => handleAlign('center')}
              variant="secondary"
              size="sm"
              className="text-xs p-1 h-7"
              disabled={selectedShapes.length < 2}
            >
              <AlignCenter className="w-3 h-3" />
            </Button>
            <Button
              onClick={() => handleAlign('right')}
              variant="secondary"
              size="sm"
              className="text-xs p-1 h-7"
              disabled={selectedShapes.length < 2}
            >
              <AlignRight className="w-3 h-3" />
            </Button>
            <Button
              onClick={() => handleAlign('top')}
              variant="secondary"
              size="sm"
              className="text-xs p-1 h-7"
              disabled={selectedShapes.length < 2}
            >
              <AlignJustify className="w-3 h-3 rotate-90" />
            </Button>
            <Button
              onClick={() => handleAlign('middle')}
              variant="secondary"
              size="sm"
              className="text-xs p-1 h-7"
              disabled={selectedShapes.length < 2}
            >
              <AlignCenter className="w-3 h-3 rotate-90" />
            </Button>
            <Button
              onClick={() => handleAlign('bottom')}
              variant="secondary"
              size="sm"
              className="text-xs p-1 h-7"
              disabled={selectedShapes.length < 2}
            >
              <AlignJustify className="w-3 h-3 rotate-90" />
            </Button>
          </div>
        </div>

        {/* Distribution Controls */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">Distribute</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleDistribute('horizontal')}
              variant="secondary"
              size="sm"
              className="text-xs"
              disabled={selectedShapes.length < 3}
            >
              Horizontal
            </Button>
            <Button
              onClick={() => handleDistribute('vertical')}
              variant="secondary"
              size="sm"
              className="text-xs"
              disabled={selectedShapes.length < 3}
            >
              Vertical
            </Button>
          </div>
        </div>

        <Separator className="bg-slate-700" />

        {/* Smart Distribution */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">Smart Distribution</Label>

          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Target</Label>
            <Select value={alignTarget} onValueChange={(value: 'selection' | 'canvas') => setAlignTarget(value)}>
              <SelectTrigger className="h-7 text-xs bg-slate-800 border-slate-600 text-slate-200">
                <SelectValue className="text-slate-200" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="selection" className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700 focus:text-slate-100">Selected Shapes</SelectItem>
                <SelectItem value="canvas" className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700 focus:text-slate-100">All Shapes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Pattern</Label>
            <Select value={distributionPattern} onValueChange={(value: 'grid' | 'circle' | 'line' | 'spiral') => setDistributionPattern(value)}>
              <SelectTrigger className="h-7 text-xs bg-slate-800 border-slate-600 text-slate-200">
                <SelectValue className="text-slate-200" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="grid" className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700 focus:text-slate-100">Grid</SelectItem>
                <SelectItem value="circle" className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700 focus:text-slate-100">Circle</SelectItem>
                <SelectItem value="line" className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700 focus:text-slate-100">Line</SelectItem>
                <SelectItem value="spiral" className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700 focus:text-slate-100">Spiral</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Spacing</span>
              <span className="text-slate-300">{distributionSpacing}px</span>
            </div>
            <Slider
              value={[distributionSpacing]}
              onValueChange={([value]) => setDistributionSpacing(value)}
              min={10}
              max={200}
              step={5}
              className="w-full"
            />
          </div>

          <Button
            onClick={handleSmartDistribution}
            variant="secondary"
            size="sm"
            className="w-full text-xs"
            disabled={(alignTarget === 'selection' && selectedShapes.length < 2) || (alignTarget === 'canvas' && shapes.length < 2)}
          >
            <Grid3X3 className="w-3 h-3 mr-1" />
            Apply Distribution
          </Button>
        </div>
      </div>
    );
  }

  function ProjectManagementContent() {
    return (
      <div className="space-y-4">
        {/* Save/Load Project */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">Project Files</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={async () => {
                setIsSavingProject(true);
                try {
                  const projectData = {
                    shapes,
                    selectedGroups,
                    scatterSettings,
                    enabledShapeTypes: Array.from(enabledShapeTypes)
                  };
                  const blob = new Blob([JSON.stringify(projectData, null, 2)], {
                    type: 'application/json'
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `shape-editor-project-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  
                  // Add a small delay to show the loading state
                  await new Promise(resolve => setTimeout(resolve, 500));
                } finally {
                  setIsSavingProject(false);
                }
              }}
              variant="secondary"
              size="sm"
              className="text-xs"
              disabled={isSavingProject}
            >
              {isSavingProject ? (
                <>
                  <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-slate-400 border-t-slate-600" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    setIsLoadingProject(true);
                    try {
                      const reader = new FileReader();
                      reader.onload = async (e) => {
                        try {
                          const data = JSON.parse(e.target?.result as string);
                          console.log('Project loaded:', data);
                          
                          // Load project data into the app if onLoadProject is available
                          if (onLoadProject) {
                            // Convert shapes array back to Shape objects if needed
                            const shapes = data.shapes || [];
                            const groups = data.groups || [];
                            const canvasSettings = data.canvasSettings || {};
                            const scatterSettings = data.scatterSettings || {};
                            const enabledShapeTypes = data.enabledShapeTypes ? 
                              new Set(data.enabledShapeTypes as ShapeType[]) : new Set<ShapeType>();
                            
                            onLoadProject({
                              shapes,
                              groups,
                              canvasSettings,
                              scatterSettings,
                              enabledShapeTypes
                            });
                            
                            console.log('✅ Project loaded successfully!');
                          } else {
                            console.warn('⚠️ onLoadProject callback not available');
                          }
                        } catch (error) {
                          console.error('❌ Failed to load project:', error);
                        } finally {
                          // Add a small delay to show the loading state
                          await new Promise(resolve => setTimeout(resolve, 500));
                          setIsLoadingProject(false);
                        }
                      };
                      reader.readAsText(file);
                    } catch (error) {
                      console.error('❌ Failed to load project:', error);
                      setIsLoadingProject(false);
                    }
                  }
                };
                input.click();
              }}
              variant="secondary"
              size="sm"
              className="text-xs"
              disabled={isLoadingProject}
            >
              {isLoadingProject ? (
                <>
                  <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-slate-400 border-t-slate-600" />
                  Loading...
                </>
              ) : (
                <>
                  <FolderOpen className="w-3 h-3 mr-1" />
                  Load
                </>
              )}
            </Button>
          </div>
        </div>

        <Separator className="bg-slate-700" />

        {/* Quick Actions */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">Quick Actions</Label>
          <div className="space-y-2">
            <Button
              onClick={async () => {
                setIsCopying(true);
                try {
                  const projectData = {
                    shapes,
                    selectedGroups,
                    scatterSettings,
                    enabledShapeTypes: Array.from(enabledShapeTypes)
                  };
                  await navigator.clipboard.writeText(JSON.stringify(projectData, null, 2));
                  
                  // Add a small delay to show the loading state
                  await new Promise(resolve => setTimeout(resolve, 300));
                } catch (error) {
                  console.error('❌ Failed to copy to clipboard:', error);
                } finally {
                  setIsCopying(false);
                }
              }}
              variant="secondary"
              size="sm"
              className="w-full text-xs"
              disabled={isCopying}
            >
              {isCopying ? (
                <>
                  <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-slate-400 border-t-slate-600" />
                  Copying...
                </>
              ) : (
                <>
                  <Clipboard className="w-3 h-3 mr-1" />
                  Copy Project to Clipboard
                </>
              )}
            </Button>

            <Button
              onClick={() => {
                if (onClearAll) onClearAll();
              }}
              variant="secondary"
              size="sm"
              className="w-full text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              New Project
            </Button>

          </div>
        </div>

        {/* Project Info */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">Project Statistics</Label>
          <div className="text-xs text-slate-400 space-y-1">
            <div>Shapes: {shapes.length}</div>
            <div>Groups: {selectedGroups.length}</div>
            <div>Selected: {selectedCount}</div>
          </div>
        </div>
      </div>
    );
  }

  function ColorManipulationContent() {
    const [hueShift, setHueShift] = useState(0);
    const [saturationShift, setSaturationShift] = useState(0);
    const [lightnessShift, setLightnessShift] = useState(0);

    const handleApplyColorManipulation = () => {
      const manipulation = {
        mode: 'shift' as const,
        hslShift: {
          hue: hueShift,
          saturation: saturationShift,
          lightness: lightnessShift,
          enabled: true
        },
        affectFill: true,
        affectStroke: true
      };

      onApplyColorManipulation(manipulation);
    };

    return (
      <div className="space-y-4">
        <div className="text-sm text-slate-400">
          Color Manipulation
        </div>

        <div className="text-xs text-slate-500 mb-3">
          {selectedShapes.length === 0 
            ? "Apply to all shapes on canvas" 
            : `Apply to ${selectedShapes.length} selected shape${selectedShapes.length > 1 ? 's' : ''}`
          }
        </div>

        {(
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Hue Shift</Label>
              <Slider
                value={[hueShift]}
                onValueChange={([value]) => setHueShift(value)}
                min={-180}
                max={180}
                step={1}
                className="w-full"
              />
              <span className="text-xs text-slate-500">{hueShift}°</span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Saturation Shift</Label>
              <Slider
                value={[saturationShift]}
                onValueChange={([value]) => setSaturationShift(value)}
                min={-100}
                max={100}
                step={1}
                className="w-full"
              />
              <span className="text-xs text-slate-500">{saturationShift}%</span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Lightness Shift</Label>
              <Slider
                value={[lightnessShift]}
                onValueChange={([value]) => setLightnessShift(value)}
                min={-100}
                max={100}
                step={1}
                className="w-full"
              />
              <span className="text-xs text-slate-500">{lightnessShift}%</span>
            </div>

            <Button
              onClick={handleApplyColorManipulation}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              Apply Color Changes
            </Button>
          </div>
        )}
      </div>
    );
  }

  function ShapePropertiesPanel({ selectedShapes, selectedGroups, selectedCount }: {
    selectedShapes: Shape[];
    selectedGroups: ShapeGroupClass[];
    selectedCount: number;
  }) {
    const updateShapeProperty = useCallback((updater: (shape: Shape) => void) => {
      selectedShapes.forEach(updater);
      if (onShapeUpdate) {
        onShapeUpdate();
      }
    }, [selectedShapes, onShapeUpdate]);

    return (
      <div className="space-y-4">
        {/* Transform Properties */}
        <div className="space-y-3">
          <Label className="text-sm text-slate-300 font-medium">Transform</Label>

          {/* Position */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Position</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-1">
                <Button
                  onClick={() => onMoveBy(-1, 0)}
                  variant="secondary"
                  size="sm"
                  className="text-xs p-1 h-6"
                >
                  ←
                </Button>
                <Input
                  type="number"
                  value={moveX}
                  onChange={(e) => setMoveX(Number(e.target.value))}
                  className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                  placeholder="X"
                />
                <Button
                  onClick={() => onMoveBy(1, 0)}
                  variant="secondary"
                  size="sm"
                  className="text-xs p-1 h-6"
                >
                  →
                </Button>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  onClick={() => onMoveBy(0, -1)}
                  variant="secondary"
                  size="sm"
                  className="text-xs p-1 h-6"
                >
                  ↑
                </Button>
                <Input
                  type="number"
                  value={moveY}
                  onChange={(e) => setMoveY(Number(e.target.value))}
                  className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                  placeholder="Y"
                />
                <Button
                  onClick={() => onMoveBy(0, 1)}
                  variant="secondary"
                  size="sm"
                  className="text-xs p-1 h-6"
                >
                  ↓
                </Button>
              </div>
            </div>
            <Button
              onClick={() => onMoveBy(moveX, moveY)}
              variant="secondary"
              size="sm"
              className="w-full text-xs"
            >
              <Move className="w-3 h-3 mr-1" />
              Apply Move
            </Button>
          </div>

          {/* Scale with Interactive Sliders */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Scale</Label>
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">X Scale</span>
                  <span className="text-slate-300">{scaleX}%</span>
                </div>
                <Slider
                  value={[scaleX]}
                  onValueChange={([value]) => {
                    setScaleX(value);
                    if (lockAspectRatio) {
                      setScaleY(value);
                    }
                  }}
                  min={1}
                  max={500}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Y Scale</span>
                  <span className="text-slate-300">{scaleY}%</span>
                </div>
                <Slider
                  value={[scaleY]}
                  onValueChange={([value]) => {
                    setScaleY(value);
                    if (lockAspectRatio) {
                      setScaleX(value);
                    }
                  }}
                  min={1}
                  max={500}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={lockAspectRatio}
                onCheckedChange={(checked) => setLockAspectRatio(checked === true)}
                className="border-slate-600"
              />
              <Label className="text-xs text-slate-400">Lock Aspect Ratio</Label>
            </div>
            <Button
              onClick={() => onScaleBy(scaleX / 100, scaleY / 100)}
              variant="secondary"
              size="sm"
              className="w-full text-xs"
            >
              <Expand className="w-3 h-3 mr-1" />
              Apply Scale
            </Button>
          </div>

          {/* Rotation with Slider */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Rotation</Label>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Angle</span>
                <span className="text-slate-300">{selectedShapes[0]?.transform.rotation || 0}°</span>
              </div>
              <Slider
                value={[selectedShapes[0]?.transform.rotation || 0]}
                onValueChange={([value]) => {
                  selectedShapes.forEach(shape => {
                    shape.transform.rotation = value;
                  });
                  if (onShapeUpdate) onShapeUpdate();
                }}
                min={-180}
                max={180}
                step={1}
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-3 gap-1">
              <Button
                onClick={() => onRotateBy(-15)}
                variant="secondary"
                size="sm"
                className="text-xs"
              >
                -15°
              </Button>
              <Button
                onClick={() => onRotateBy(-90)}
                variant="secondary"
                size="sm"
                className="text-xs"
              >
                -90°
              </Button>
              <Button
                onClick={() => onRotateBy(15)}
                variant="secondary"
                size="sm"
                className="text-xs"
              >
                +15°
              </Button>
            </div>
          </div>

          {/* Flip */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={onFlipHorizontal}
              variant="secondary"
              size="sm"
              className="text-xs"
            >
              <FlipHorizontal className="w-3 h-3 mr-1" />
              Flip H
            </Button>
            <Button
              onClick={onFlipVertical}
              variant="secondary"
              size="sm"
              className="text-xs"
            >
              <FlipVertical className="w-3 h-3 mr-1" />
              Flip V
            </Button>
          </div>
        </div>

        {/* Fill & Stroke Properties */}
        <Separator className="bg-slate-600" />

        <div className="space-y-3">
          <Label className="text-sm text-slate-300 font-medium">Fill & Stroke</Label>

          {/* Fill Color */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Fill Color</Label>
            <div className="flex items-center space-x-2">
              <div 
                className="w-8 h-6 rounded border border-slate-600 cursor-pointer"
                style={{ backgroundColor: selectedShapes[0]?.properties.fillColor || '#3b82f6' }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'color';
                  input.value = selectedShapes[0]?.properties.fillColor || '#3b82f6';
                  input.onchange = (e) => {
                    const color = (e.target as HTMLInputElement).value;
                    updateShapeProperty((shape) => {
                      shape.properties.fillColor = color;
                    });
                  };
                  input.click();
                }}
              />
              <Input
                type="text"
                value={selectedShapes[0]?.properties.fillColor || '#3b82f6'}
                onChange={(e) => {
                  const color = e.target.value;
                  updateShapeProperty((shape) => {
                    shape.properties.fillColor = color;
                  });
                }}
                className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                placeholder="#color"
              />
            </div>
          </div>

          {/* Fill Opacity */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Fill Opacity</Label>
            <Slider
              value={[Math.round((selectedShapes[0]?.properties.fillOpacity || 1) * 100)]}
              onValueChange={([value]) => {
                updateShapeProperty((shape) => {
                  shape.properties.fillOpacity = value / 100;
                });
              }}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <span className="text-xs text-slate-500">{Math.round((selectedShapes[0]?.properties.fillOpacity || 1) * 100)}%</span>
          </div>

          {/* Stroke Color */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Stroke Color</Label>
            <div className="flex items-center space-x-2">
              <div 
                className="w-8 h-6 rounded border border-slate-600 cursor-pointer"
                style={{ backgroundColor: selectedShapes[0]?.properties.strokeColor || '#1e40af' }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'color';
                  input.value = selectedShapes[0]?.properties.strokeColor || '#1e40af';
                  input.onchange = (e) => {
                    const color = (e.target as HTMLInputElement).value;
                    updateShapeProperty((shape) => {
                      shape.properties.strokeColor = color;
                    });
                  };
                  input.click();
                }}
              />
              <Input
                type="text"
                value={selectedShapes[0]?.properties.strokeColor || '#1e40af'}
                onChange={(e) => {
                  const color = e.target.value;
                  updateShapeProperty((shape) => {
                    shape.properties.strokeColor = color;
                  });
                }}
                className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                placeholder="#color"
              />
            </div>
          </div>

          {/* Stroke Width & Opacity */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Stroke Width</Label>
              <Input
                type="number"
                value={selectedShapes[0]?.properties.strokeWidth || 2}
                onChange={(e) => {
                  const width = Number(e.target.value);
                  updateShapeProperty((shape) => {
                    shape.properties.strokeWidth = width;
                  });
                }}
                className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                min="0"
                max="50"
                step="0.1"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Stroke Opacity</Label>
              <Input
                type="number"
                value={Math.round((selectedShapes[0]?.properties.strokeOpacity || 1) * 100)}
                onChange={(e) => {
                  const opacity = Number(e.target.value) / 100;
                  updateShapeProperty((shape) => {
                    shape.properties.strokeOpacity = opacity;
                  });
                }}
                className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                min="0"
                max="100"
              />
            </div>
          </div>
        </div>

        {/* Shape-specific Properties */}
        {selectedShapes.length === 1 && (
          <>
            <Separator className="bg-slate-600" />
            <div className="space-y-3">
              <Label className="text-sm text-slate-300 font-medium">Shape Properties</Label>

              {selectedShapes[0].type === 'circle' && selectedShapes[0].radius && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Radius</Label>
                  <Input
                    type="number"
                    value={selectedShapes[0].radius}
                    onChange={(e) => {
                      const newRadius = Number(e.target.value);
                      updateShapeProperty((shape) => {
                        if (shape.type === 'circle') {
                          shape.radius = newRadius;
                          shape.regeneratePointsFromSegments();
                        }
                      });
                    }}
                    className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                    min="1"
                  />
                </div>
              )}

              {(selectedShapes[0].type === 'rectangle' || selectedShapes[0].type === 'ellipse') && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-400">Width</Label>
                    <Input
                      type="number"
                      value={selectedShapes[0].width || 0}
                      onChange={(e) => {
                        const newWidth = Number(e.target.value);
                        updateShapeProperty((shape) => {
                          if (shape.width !== undefined) {
                            shape.width = newWidth;
                            if (shape.type === 'rectangle' || shape.type === 'ellipse') {
                              shape.regeneratePointsFromSegments();
                            }
                          }
                        });
                      }}
                      className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                      min="1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-400">Height</Label>
                    <Input
                      type="number"
                      value={selectedShapes[0].height || 0}
                      onChange={(e) => {
                        const newHeight = Number(e.target.value);
                        updateShapeProperty((shape) => {
                          if (shape.height !== undefined) {
                            shape.height = newHeight;
                            if (shape.type === 'rectangle' || shape.type === 'ellipse') {
                              shape.regeneratePointsFromSegments();
                            }
                          }
                        });
                      }}
                      className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                      min="1"
                    />
                  </div>
                </div>
              )}

              {(selectedShapes[0].type === 'polygon' || selectedShapes[0].type === 'star') && selectedShapes[0].sides && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Sides</Label>
                  <Input
                    type="number"
                    value={selectedShapes[0].sides}
                    onChange={(e) => {
                      const newSides = Number(e.target.value);
                      updateShapeProperty((shape) => {
                        if (shape.sides !== undefined) {
                          shape.sides = newSides;
                          shape.regeneratePointsFromSegments();
                        }
                      });
                    }}
                    className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                    min="3"
                    max="20"
                  />
                </div>
              )}

              {(selectedShapes[0].type === 'circle' || selectedShapes[0].type === 'ellipse') && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Segments (Smoothness)</Label>
                  <Slider
                    value={[selectedShapes[0].segments]}
                    onValueChange={([value]) => {
                      updateShapeProperty((shape) => {
                        shape.segments = value;
                        shape.regeneratePointsFromSegments();
                      });
                    }}
                    min={8}
                    max={64}
                    step={4}
                    className="w-full"
                  />
                  <span className="text-xs text-slate-500">{selectedShapes[0].segments} segments</span>
                </div>
              )}

              {/* Point Management for Splines, Lines, and Polygons */}
              {(selectedShapes[0].type === 'bezier' || selectedShapes[0].type === 'smooth-spline' || selectedShapes[0].type === 'line' || selectedShapes[0].type === 'polygon') && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Point Count</Label>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => {
                        updateShapeProperty((shape) => {
                          if (shape.points && shape.points.length > 2) {
                            // Remove the last point
                            shape.points.pop();
                            // Update shape geometry
                            if (shape.updateShapeFromPoints) {
                              shape.updateShapeFromPoints();
                            }
                            // Regenerate polygon segments if needed
                            if (shape.type === 'polygon' && shape.sides) {
                              shape.sides = shape.points.length;
                            }
                          }
                        });
                      }}
                      variant="secondary"
                      size="sm"
                      className="text-xs h-6 px-2 bg-slate-700 hover:bg-slate-600"
                      disabled={selectedShapes[0].points?.length <= 2}
                    >
                      - Remove Point
                    </Button>
                    <span className="text-xs text-slate-300 flex-1 text-center">
                      {selectedShapes[0].points?.length || 0} points
                    </span>
                    <Button
                      onClick={() => {
                        updateShapeProperty((shape) => {
                          if (shape.points && shape.points.length < 20) {
                            // Add a new point between the last two points
                            const lastPoint = shape.points[shape.points.length - 1];
                            const secondLastPoint = shape.points[shape.points.length - 2] || lastPoint;
                            const newPoint = {
                              x: (lastPoint.x + secondLastPoint.x) / 2 + (Math.random() - 0.5) * 20,
                              y: (lastPoint.y + secondLastPoint.y) / 2 + (Math.random() - 0.5) * 20
                            };
                            shape.points.push(newPoint);
                            // Update shape geometry
                            if (shape.updateShapeFromPoints) {
                              shape.updateShapeFromPoints();
                            }
                            // Regenerate polygon segments if needed
                            if (shape.type === 'polygon' && shape.sides) {
                              shape.sides = shape.points.length;
                            }
                          }
                        });
                      }}
                      variant="secondary"
                      size="sm"
                      className="text-xs h-6 px-2 bg-slate-700 hover:bg-slate-600"
                      disabled={selectedShapes[0].points?.length >= 20}
                    >
                      + Add Point
                    </Button>
                  </div>
                </div>
              )}

              {/* Corner Radius for Rounded Shapes */}
              {(selectedShapes[0].type === 'rounded-rectangle' || selectedShapes[0].type === 'rounded-square') && selectedShapes[0].cornerRadius !== undefined && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Corner Radius</Label>
                  <Input
                    type="number"
                    value={selectedShapes[0].cornerRadius || 0}
                    onChange={(e) => {
                      const newRadius = Number(e.target.value);
                      updateShapeProperty((shape) => {
                        if (shape.cornerRadius !== undefined) {
                          shape.cornerRadius = Math.max(0, newRadius);
                          if (shape.regeneratePointsFromSegments) {
                            shape.regeneratePointsFromSegments();
                          }
                        }
                      });
                    }}
                    className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                    min="0"
                    max="50"
                  />
                </div>
              )}

              {/* Inner Radius for Stars and Rings */}
              {(selectedShapes[0].type === 'star' || selectedShapes[0].type === 'ring') && selectedShapes[0].innerRadius !== undefined && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Inner Radius</Label>
                  <Input
                    type="number"
                    value={selectedShapes[0].innerRadius || 0}
                    onChange={(e) => {
                      const newInnerRadius = Number(e.target.value);
                      updateShapeProperty((shape) => {
                        if (shape.innerRadius !== undefined) {
                          shape.innerRadius = Math.max(0, newInnerRadius);
                          if (shape.regeneratePointsFromSegments) {
                            shape.regeneratePointsFromSegments();
                          }
                        }
                      });
                    }}
                    className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                    min="0"
                    max={selectedShapes[0].radius ? Math.floor(selectedShapes[0].radius * 0.9) : 50}
                  />
                </div>
              )}
            </div>
          </>
        )}

        <Separator className="bg-slate-600" />

        <Button
          onClick={onDeleteSelected}
          variant="destructive"
          size="sm"
          className="w-full text-xs"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Delete Selected
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-slate-900/95 border-r border-slate-700 transition-all duration-300 ${
      isCollapsed ? 'w-12' : 'w-80'
    }`}>
      {/* Auth Header */}
      <div className="border-b border-slate-700">
        <AuthHeader isCollapsed={isCollapsed} />
      </div>
      
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-white">Shape Editor</h2>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 p-0"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Collapsed Content with Tight Popovers */}
      {isCollapsed && (
        <div className="flex flex-col w-full">
          {[
            { id: 'shapes', name: 'Shape Types', icon: Shapes, color: 'blue', content: ShapeTypesContent },
            { id: 'selection', name: 'Selection Mode', icon: Target, color: 'cyan', content: SelectionModesContent },
            { id: 'layers', name: 'Layers', icon: Layers3, color: 'purple', content: LayersContent },
            { id: 'properties', name: 'Properties', icon: Settings, color: 'yellow', content: PropertiesContent },
            { id: 'composition', name: 'Composition', icon: Shuffle, color: 'green', content: CompositionContent },
            { id: 'align-distribute', name: 'Align & Distribute', icon: AlignCenter, color: 'indigo', content: AlignDistributeContent },
            { id: 'artboards', name: 'Artboards', icon: Monitor, color: 'orange', content: ArtboardsContent },
            { id: 'colors', name: 'Color Manipulation', icon: Palette, color: 'pink', content: ColorManipulationContent },
            { id: 'project', name: 'Project Management', icon: FolderOpen, color: 'violet', content: ProjectManagementContent },
            { id: 'export', name: 'Export & Save', icon: Download, color: 'emerald', content: ExportSaveContent }
          ].filter(section => 
            // Only show sections that are enabled in user preferences
            sidebarSections[section.id as keyof typeof sidebarSections] === true
          ).map(section => (
            <Popover 
              key={section.id} 
              open={activePopover === section.id} 
              onOpenChange={(open) => setActivePopover(open ? section.id : null)}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className={`w-full h-8 p-0 rounded-none border-0 hover:bg-slate-800 ${
                    activePopover === section.id ? 'bg-slate-800' : ''
                  } ${
                    section.color === 'cyan' ? 'text-cyan-400 hover:text-cyan-300' :
                    section.color === 'orange' ? 'text-orange-400 hover:text-orange-300' :
                    section.color === 'emerald' ? 'text-emerald-400 hover:text-emerald-300' :
                    section.color === 'blue' ? 'text-blue-400 hover:text-blue-300' :
                    section.color === 'green' ? 'text-green-400 hover:text-green-300' :
                    section.color === 'yellow' ? 'text-yellow-400 hover:text-yellow-300' :
                    section.color === 'purple' ? 'text-purple-400 hover:text-purple-300' :
                    section.color === 'indigo' ? 'text-indigo-400 hover:text-indigo-300' :
                    section.color === 'violet' ? 'text-violet-400 hover:text-violet-300' :
                    'text-pink-400 hover:text-pink-300'
                  }`}
                  onClick={() => handlePopoverToggle(section.id)}
                >
                  <section.icon className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                side="right" 
                align="start" 
                className="w-80 max-h-96 overflow-y-auto bg-slate-900 border-slate-700 text-white"
                sideOffset={4}
              >
                <div className="space-y-2">
                  <h3 className={`text-sm font-medium ${
                    section.color === 'cyan' ? 'text-cyan-400' :
                    section.color === 'orange' ? 'text-orange-400' :
                    section.color === 'emerald' ? 'text-emerald-400' :
                    section.color === 'blue' ? 'text-blue-400' :
                    section.color === 'green' ? 'text-green-400' :
                    section.color === 'yellow' ? 'text-yellow-400' :
                    section.color === 'purple' ? 'text-purple-400' :
                    section.color === 'indigo' ? 'text-indigo-400' :
                    section.color === 'violet' ? 'text-violet-400' :
                    'text-pink-400'
                  }`}>
                    {section.name}
                  </h3>
                  <section.content />
                </div>
              </PopoverContent>
            </Popover>
          ))}
        </div>
      )}

      {!isCollapsed && (
        /* Expanded sidebar with full content */
        <div 
          ref={scrollContainerRef} 
          className="flex-1 overflow-y-auto"
          style={{ scrollBehavior: 'auto', overflowAnchor: 'none' }}
        >
          <Accordion 
            type="multiple" 
            value={openAccordionSections} 
            onValueChange={setOpenAccordionSections}
            className="w-full px-2 py-1"
          >
            {/* Shape Types Section */}
            {sidebarSections.shapes && (
              <AccordionItem value="shapes" className="border-slate-700">
                <AccordionTrigger className="text-sm text-blue-400 hover:text-blue-300 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <Shapes className="w-4 h-4 mr-2" />
                    Shape Types
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  {/* Shape Sets Section */}
                  <div className="mb-4 p-3 border border-slate-600 rounded-lg bg-slate-800/30 space-y-2">
                    {/* Header Row with Title and Buttons */}
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-400">Shape Sets</Label>
                      {setsEnabled && (
                        <div className="flex items-center gap-1">
                          {/* Add Set Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateSet('')}
                            disabled={!setsEnabled}
                            className={`px-2 bg-slate-800 border-slate-600 hover:bg-slate-700 ${!setsEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Create new generation set"
                            data-testid="sidebar-generation-sets-add-button"
                          >
                            <Plus className="h-3 w-3 text-slate-300" />
                          </Button>

                          {/* Remove Set Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSet(effectiveCurrentSetId || '')}
                            disabled={!setsEnabled || !effectiveCurrentSetId || effectiveGenerationSets.length <= 1}
                            className={`px-2 bg-slate-800 border-slate-600 hover:bg-slate-700 ${(!setsEnabled || !effectiveCurrentSetId || effectiveGenerationSets.length <= 1) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={effectiveCurrentSetId && effectiveGenerationSets.length > 1 ? "Delete current generation set" : "Cannot delete - only one set remaining"}
                            data-testid="sidebar-generation-sets-remove-button"
                          >
                            <Minus className="h-3 w-3 text-slate-300" />
                          </Button>

                          {/* Sets Manager Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenManager()}
                            disabled={!setsEnabled}
                            className={`px-2 bg-slate-800 border-slate-600 hover:bg-slate-700 ${!setsEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Open Generation Sets Manager"
                            data-testid="sidebar-generation-sets-manager-button"
                          >
                            <Settings className="h-3 w-3 text-slate-300" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {setsEnabled ? (
                      /* Full Width Dropdown */
                      <Select
                        value={effectiveCurrentSetId || ''}
                        onValueChange={(value) => handleSetChange(value || null)}
                        disabled={!setsEnabled}
                      >
                        <SelectTrigger 
                          className={`w-full h-8 ${!setsEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                          data-testid="sidebar-generation-sets-select-trigger"
                        >
                          <SelectValue 
                            placeholder={setsEnabled ? "Select generation set..." : "Enable generation sets to select"} 
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          {effectiveGenerationSets.length === 0 ? (
                            <SelectItem value="no-sets" disabled className="text-slate-400">
                              No sets available
                            </SelectItem>
                          ) : (
                            effectiveGenerationSets.map((set) => (
                              <SelectItem 
                                key={set.id} 
                                value={set.id}
                                className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white"
                                data-testid={`sidebar-generation-sets-option-${set.id}`}
                              >
                                {set.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      /* Disabled Message */
                      <div className="flex items-center gap-2 p-2 bg-slate-900/50 border border-slate-600 rounded text-xs text-slate-400">
                        <Info className="w-3 h-3 text-blue-400 flex-shrink-0" />
                        <span>Enable Shape Sets in the Export & Save section to use this feature</span>
                      </div>
                    )}
                  </div>
                  
                  <ShapeTypesContent />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Selection Modes Section */}
            {sidebarSections.selection && (
              <AccordionItem value="selection" className="border-slate-700">
                <AccordionTrigger className="text-sm text-cyan-400 hover:text-cyan-300 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    Selection Modes
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <SelectionModesContent />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Layers Section */}
            {sidebarSections.layers && (
              <AccordionItem value="layers" className="border-slate-700">
                <AccordionTrigger className="text-sm text-purple-400 hover:text-purple-300 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <Layers3 className="w-4 h-4 mr-2" />
                    Layers
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <LayersContent />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Composition Section */}
            {sidebarSections.composition && (
              <AccordionItem value="composition" className="border-slate-700">
                <AccordionTrigger className="text-sm text-green-400 hover:text-green-300 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <Shuffle className="w-4 h-4 mr-2" />
                    Composition
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <CompositionContent />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Align & Distribute Section */}
            {sidebarSections['align-distribute'] && (
              <AccordionItem value="align-distribute" className="border-slate-700">
                <AccordionTrigger className="text-sm text-indigo-400 hover:text-indigo-300 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <AlignCenter className="w-4 h-4 mr-2" />
                    Align & Distribute
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <AlignDistributeContent />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Artboards Section */}
            {sidebarSections.artboards && (
              <AccordionItem value="artboards" className="border-slate-700">
                <AccordionTrigger className="text-sm text-orange-400 hover:text-orange-300 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <Monitor className="w-4 h-4 mr-2" />
                    Artboards
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <ArtboardsContent />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Color Manipulation Section */}
            {sidebarSections.colors && (
              <AccordionItem value="colors" className="border-slate-700">
                <AccordionTrigger className="text-sm text-pink-400 hover:text-pink-300 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <Palette className="w-4 h-4 mr-2" />
                    Color Manipulation
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <ColorManipulationContent />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Project Management Section */}
            {sidebarSections.project && (
              <AccordionItem value="project" className="border-slate-700">
                <AccordionTrigger className="text-sm text-violet-400 hover:text-violet-300 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Project Management
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <ProjectManagementContent />
                  
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Export & Save Section */}
            {sidebarSections.export && (
              <AccordionItem value="export" className="border-slate-700">
                <AccordionTrigger className="text-sm text-emerald-400 hover:text-emerald-300 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <Download className="w-4 h-4 mr-2" />
                    Export & Save
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <ExportSaveContent />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Properties Section - Moved to last position */}
            {sidebarSections.properties && (
              <AccordionItem value="properties" className="border-slate-700">
                <AccordionTrigger className="text-sm text-yellow-400 hover:text-yellow-300 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Properties
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <PropertiesContent />
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      )}
      
      {/* BatchConfigDialog - Moved to stable location to prevent mount/unmount cycles */}
      <BatchConfigDialog
        settings={generationConfigSettings}
        onSettingsChange={handleBatchConfigSettingsChange}
        
        // Generation Sets Integration
        generationSets={generationSets}
        currentGenerationSetId={currentGenerationSetId}
        enabledShapeTypes={enabledShapeTypes}
        scatterSettings={scatterSettings}
        shapeCountMode={shapeCountMode}
        shapeCountFixed={shapeCountFixed}
        shapeCountRange={shapeCountRange}
        generationSetsEnabled={exportSettings.generationSetsEnabled}
        onGenerationSetsChange={onGenerationSetsChange}
        onCurrentGenerationSetChange={onCurrentGenerationSetChange}
        onCreateGenerationSet={onCreateGenerationSet}
        onDeleteGenerationSet={onDeleteGenerationSet}
        generateUniqueSetName={generateUniqueSetName}
        onOpenGenerationSetsManager={onOpenGenerationSetsManager}
      />
      
      {/* Sets Manager Dialog - Separate dialog for managing generation sets */}
      <SetsManagerDialog
        isOpen={isSetsManagerOpen}
        onOpenChange={(open) => {
          if (!open && onCloseGenerationSetsManager) {
            onCloseGenerationSetsManager();
          }
        }}
        generationSets={effectiveGenerationSets}
        onGenerationSetsChange={onGenerationSetsChange || (() => {})}
        globalZIndexEnabled={false}
        showInlineValidation={true}
        currentSetId={effectiveCurrentSetId}
        onCurrentSetChange={onCurrentGenerationSetChange}
        currentUIState={{
          enabledShapeTypes,
          scatterSettings,
          batchConfigSettings: generationConfigSettings,
          shapeCountMode,
          shapeCountFixed,
          shapeCountRange
        }}
        onCreateSetFromState={(uiState, name) => {
          const setId = handleCreateSet(name || '');
          return setId || '';
        }}
        batchExportCount={exportBatchCount}
        edgeCaseStrategy={exportSettings.edgeCaseStrategy || 'hold'}
        onEdgeCaseStrategyChange={(strategy) => {
          console.log('Edge case strategy changed:', strategy);
          updateExportSettings.mutate({ edgeCaseStrategy: strategy });
        }}
      />
    </div>
  );
}