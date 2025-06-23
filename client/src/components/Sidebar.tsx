import { useState, useCallback, useMemo, useEffect } from 'react';
import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
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
  Shapes,
  Settings,
  Layers,
  Palette,
  Download,
  Wand2,
  Navigation,
  Shuffle,
  Layers3,
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
  Plus
} from 'lucide-react';
import { ShapeType, ShapeGroup as ShapeGroupClass, BlendMode, ScatterSettings, CanvasSettings, Artboard, ArtboardPreset } from '@/lib/shapeTypes';
import { Shape } from '@/lib/shapes';
import { renderShape } from '@/lib/shapeRenderer';
import { SmartDistributionAlgorithm } from '../lib/distributionAlgorithm';

// Shape display names mapping
const shapeTypeDisplayNames: Record<ShapeType, string> = {
  rectangle: 'Rectangle',
  square: 'Square',
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
  line: 'Line',
  bezier: 'Bézier Curve',
  cubic: 'Cubic Spline',
  'smooth-spline': 'Smooth Spline',
  chunk: 'Chunk',
  blob: 'Organic Blob',
  ring: 'Ring',
  'spline-circle': 'Spline Circle',
  'spline-ellipse': 'Spline Ellipse',
  'spline-ring': 'Spline Ring'
};

interface SidebarProps {
  enabledShapeTypes: Set<ShapeType>;
  scatterSettings: ScatterSettings;
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
  onLoadProject?: (data: {
    shapes: Shape[];
    groups: ShapeGroupClass[];
    canvasSettings: CanvasSettings;
    scatterSettings: ScatterSettings;
    enabledShapeTypes: Set<ShapeType>;
  }) => void;
}

export default function Sidebar({
  enabledShapeTypes,
  scatterSettings,
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
  onGenerateRandomShapes,
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
  onApplyColorManipulation
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [moveX, setMoveX] = useState(0);
  const [moveY, setMoveY] = useState(0);
  const [scaleX, setScaleX] = useState(100);
  const [scaleY, setScaleY] = useState(100);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

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
      </div>
    );
  }

  function ExportSaveContent() {
    const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'svg' | 'pdf'>('png');
    const [exportQuality, setExportQuality] = useState(90);
    const [exportScale, setExportScale] = useState(1);
    const [exportMode, setExportMode] = useState<'selection' | 'artboard' | 'all'>('selection');
    const [selectedArtboardForExport, setSelectedArtboardForExport] = useState<string>('');

    // Batch export state
    const [batchShapeCount, setBatchShapeCount] = useState([5, 15]);
    const [batchExportCount, setBatchExportCount] = useState(10);
    const [batchExportPath, setBatchExportPath] = useState<string>('');
    const [isBatchExporting, setIsBatchExporting] = useState(false);
    const [batchProgress, setBatchProgress] = useState(0);
    const [batchModeEnabled, setBatchModeEnabled] = useState(false);

    const renderShapeForExport = (ctx: CanvasRenderingContext2D, shape: Shape) => {
      // Temporarily disable selection to avoid selection indicators, but keep the original shape
      const originalSelected = shape.selected;
      shape.selected = false;

      // Use the exact same renderer as the main canvas but with zoom=1 for export
      renderShape(ctx, shape, 1);

      // Restore original selection state
      shape.selected = originalSelected;
    };

    const handleExportShapes = () => {
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
      if (exportFormat !== 'png') {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      // Apply scaling and translation
      ctx.scale(exportScale, exportScale);
      ctx.translate(translateX, translateY);

      // Sort shapes by z-index and render them directly (no copying to avoid property corruption)
      const sortedShapes = [...shapesToExport].sort((a, b) => a.properties.zIndex - b.properties.zIndex);

      sortedShapes.forEach(shape => renderShapeForExport(ctx, shape));

      // Download the image
      const link = document.createElement('a');
      link.download = filename;

      if (exportFormat === 'jpg') {
        link.href = canvas.toDataURL('image/jpeg', exportQuality / 100);
      } else {
        link.href = canvas.toDataURL('image/png');
      }

      link.click();
      console.log(`📁 File saved: ${filename} (check your Downloads folder)`);
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

      // Download the image
      const link = document.createElement('a');
      link.download = filename;

      if (exportFormat === 'jpg') {
        link.href = canvas.toDataURL('image/jpeg', exportQuality / 100);
      } else {
        link.href = canvas.toDataURL('image/png');
      }

      link.click();
      console.log(`📁 File saved: ${filename} (check your Downloads folder)`);
    };

    // NEW BATCH EXPORT WITH ZIP PACKAGING
    const handleBatchExportNew = async () => {
      if (!batchModeEnabled) return;

      setIsBatchExporting(true);
      setBatchProgress(0);
      console.log(`🚀 ZIP BATCH EXPORT: Starting ${batchExportCount} exports`);
      
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
        const zip = new JSZip();
        const timestamp = Date.now();
        
        for (let i = 0; i < batchExportCount; i++) {
          console.log(`🎨 Creating artwork ${i + 1} of ${batchExportCount}`);
          
          // Clear canvas and generate fresh shapes
          onClearAll?.();
          await new Promise(resolve => setTimeout(resolve, 50)); // Reduced delay

          // Generate shapes for this export
          const shapesToGenerate = Math.floor(Math.random() * (batchShapeCount[1] - batchShapeCount[0] + 1)) + batchShapeCount[0];
          console.log(`🔢 Will generate ${shapesToGenerate} shape calls for export ${i + 1}`);

          // Generate shapes directly without using the scatter system
          const currentExportShapes: Shape[] = [];
          
          for (let j = 0; j < shapesToGenerate; j++) {
            // Use Random Shape Count Range from Shape Types section
            const shapeCount = Math.floor(Math.random() * (scatterSettings.maxCount - scatterSettings.minCount + 1)) + scatterSettings.minCount;
            
            for (let k = 0; k < shapeCount; k++) {
              // Use enabled shape types from UI
              const enabledTypes = Array.from(enabledShapeTypes);
              if (enabledTypes.length === 0) continue; // Skip if no types enabled
              
              const randomType = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];
              
              // Random position within the target artboard bounds
              const x = generationBounds.x + (Math.random() - 0.5) * (generationBounds.width * 0.8);
              const y = generationBounds.y + (Math.random() - 0.5) * (generationBounds.height * 0.8);
              
              const newShape = new Shape(randomType, x, y);
              
              // Random properties
              const hue = Math.random() * 360;
              const saturation = 50 + Math.random() * 50;
              const lightness = 30 + Math.random() * 40;
              newShape.properties.fillColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
              
              // Random size
              const scale = 0.5 + Math.random() * 2;
              newShape.transform.scaleX = scale;
              newShape.transform.scaleY = scale;
              
              // Random rotation
              newShape.transform.rotation = Math.random() * 360;
              
              currentExportShapes.push(newShape);
            }
            
            console.log(`✨ Generation ${j + 1}: Created ${shapeCount} shapes (total: ${currentExportShapes.length})`);
          }

          // Create image data for ZIP with timestamp
          const imageTimestamp = Date.now() + i; // Unique timestamp for each image
          const filename = `batch-${String(i + 1).padStart(3, '0')}-${imageTimestamp}.${exportFormat}`;
          
          if (currentExportShapes.length > 0) {
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
            
            if (ctx) {
              canvas.width = canvasWidth;
              canvas.height = canvasHeight;

              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvasWidth, canvasHeight);

              ctx.scale(exportScale, exportScale);
              ctx.translate(translateX, translateY);

              const sortedShapes = [...currentExportShapes].sort((a, b) => a.properties.zIndex - b.properties.zIndex);
              sortedShapes.forEach(shape => renderShapeForExport(ctx, shape));

              // Convert canvas to blob and add to ZIP
              const dataURL = exportFormat === 'jpg' 
                ? canvas.toDataURL('image/jpeg', exportQuality / 100)
                : canvas.toDataURL('image/png');
              
              // Extract base64 data from data URL
              const base64Data = dataURL.split(',')[1];
              zip.file(filename, base64Data, { base64: true });
              
              console.log(`📦 Added ${filename} to ZIP`);
            } else {
              console.error(`❌ Canvas context failed for export ${i + 1}`);
            }
          } else {
            console.error(`❌ No shapes generated for export ${i + 1}`);
          }

          setBatchProgress(i + 1);
          await new Promise(resolve => setTimeout(resolve, 100)); // Reduced delay
        }
        
        // Generate and download ZIP file
        console.log(`📦 Creating ZIP file with ${batchExportCount} images`);
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `batch-export-${timestamp}.zip`;
        link.click();
        
        console.log(`🎉 ZIP COMPLETE: Downloaded batch-export-${timestamp}.zip`);
      } catch (error) {
        console.error('❌ Batch export error:', error);
      } finally {
        onClearAll?.();
        setIsBatchExporting(false);
        setBatchProgress(0);
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
                <SelectItem value="svg" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">SVG (Vector)</SelectItem>
                <SelectItem value="pdf" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">PDF (Print)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {exportFormat === 'jpg' && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Quality</Label>
              <Slider
                value={[exportQuality]}
                onValueChange={([value]) => setExportQuality(value)}
                min={10}
                max={100}
                step={5}
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
              isBatchExporting ||
              (exportMode === 'selection' && selectedShapes.length === 0) ||
              (exportMode === 'artboard' && (!selectedArtboardForExport || artboards.length === 0)) ||
              (exportMode === 'all' && shapes.length === 0)
            }
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white"
          >
            <FileImage className="w-4 h-4 mr-2" />
            {exportMode === 'selection' && `Export Selected (${selectedShapes.length})`}
            {exportMode === 'artboard' && selectedArtboardForExport && 
              `Export ${artboards.find(ab => ab.id === selectedArtboardForExport)?.name || 'Artboard'}`}
            {exportMode === 'artboard' && !selectedArtboardForExport && 'Select Artboard to Export'}
            {exportMode === 'all' && `Export All Shapes (${shapes.length})`}
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
                checked={batchModeEnabled}
                onCheckedChange={setBatchModeEnabled}
              />
            </div>
          </div>

          {batchModeEnabled && (
            <>
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Random Shape Range</Label>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Min: {batchShapeCount[0]}</span>
                    <span className="text-slate-400">Max: {batchShapeCount[1]}</span>
                  </div>
                  <Slider
                    value={batchShapeCount}
                    onValueChange={(value) => setBatchShapeCount(value)}
                    min={1}
                    max={20}
                    step={1}
                    className="w-full"
                    minStepsBetweenThumbs={1}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Number of Exports</span>
                  <span className="text-slate-300">{batchExportCount}</span>
                </div>
                <Slider
                  value={[batchExportCount]}
                  onValueChange={([value]) => setBatchExportCount(value)}
                  min={1}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Export Format</Label>
                <div className="text-xs text-slate-500 bg-slate-800 p-2 rounded border border-slate-600">
                  All images will be packaged into a single ZIP file for easy download
                </div>
              </div>

              <Button
                onClick={handleBatchExportNew}
                disabled={isBatchExporting || enabledShapeTypes.size === 0}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 text-white"
              >
                {isBatchExporting ? (
                  <>
                    <div className="w-3 h-3 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Exporting... ({Math.floor((batchProgress / batchExportCount) * 100)}%)
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

        <Separator className="bg-slate-600" />

        <div className="space-y-3">
          <Label className="text-xs text-slate-400">Project Management</Label>

          <Button
            onClick={handleSaveProject}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Project
          </Button>

          <Button
            onClick={() => navigator.clipboard.writeText(JSON.stringify({ shapes, artboards }))}
            variant="secondary"
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200"
          >
            <Clipboard className="w-4 h-4 mr-2" />
            Copy to Clipboard
          </Button>
        </div>
      </div>
    );
  }

  function ShapeTypesContent() {
    return (
      <div className="space-y-3">
        {Object.entries(shapeTypeDisplayNames).map(([type, displayName]) => (
          <div key={type} className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
            enabledShapeTypes.has(type as ShapeType) ? 'bg-blue-900/30 border border-blue-500/50' : 'bg-slate-800/50 hover:bg-slate-700/50'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded transition-colors ${
                enabledShapeTypes.has(type as ShapeType) ? 'bg-blue-400' : 'bg-slate-500'
              }`} />
              <Label className={`text-sm transition-colors ${
                enabledShapeTypes.has(type as ShapeType) ? 'text-blue-200' : 'text-slate-300'
              }`}>{displayName}</Label>
            </div>
            <Switch
              checked={enabledShapeTypes.has(type as ShapeType)}
              onCheckedChange={() => onToggleShapeType(type as ShapeType)}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>
        ))}

        <Separator className="bg-slate-600" />

        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Random Shape Count Range</Label>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Min: {scatterSettings.minCount}</span>
              <span className="text-slate-400">Max: {scatterSettings.maxCount}</span>
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
        </div>

        <Button 
          onClick={onGenerateRandomShapes}
          className="w-full bg-[var(--editor-accent)] hover:bg-purple-700 text-white font-medium"
        >
          <Wand2 className="w-4 h-4 mr-2" />
          Generate Random Shapes
        </Button>
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
          </div>

          {selectedCount > 0 && (
            <ShapePropertiesPanel 
              selectedShapes={selectedShapes}
              selectedGroups={selectedGroups}
              selectedCount={selectedCount}
            />
          )}

          {selectedCount === 0 && (
            <div className="text-xs text-slate-500">
              Select shapes to edit their properties
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
              onClick={() => {
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
              }}
              variant="secondary"
              size="sm"
              className="text-xs"
            >
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
            <Button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      try {
                        const data = JSON.parse(e.target?.result as string);
                        console.log('Project loaded:', data);
                      } catch (error) {
                        console.error('Failed to load project:', error);
                      }
                    };
                    reader.readAsText(file);
                  }
                };
                input.click();
              }}
              variant="secondary"
              size="sm"
              className="text-xs"
            >
              <FolderOpen className="w-3 h-3 mr-1" />
              Load
            </Button>
          </div>
        </div>

        <Separator className="bg-slate-700" />

        {/* Quick Actions */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">Quick Actions</Label>
          <div className="space-y-2">
            <Button
              onClick={() => {
                const projectData = {
                  shapes,
                  selectedGroups,
                  scatterSettings,
                  enabledShapeTypes: Array.from(enabledShapeTypes)
                };
                navigator.clipboard.writeText(JSON.stringify(projectData, null, 2));
              }}
              variant="secondary"
              size="sm"
              className="w-full text-xs"
            >
              <Clipboard className="w-3 h-3 mr-1" />
              Copy Project to Clipboard
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
          ].map(section => (
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
        <div className="flex-1 overflow-y-auto">
          <Accordion type="multiple" className="w-full px-2 py-1">
            {/* Shape Types Section */}
            <AccordionItem value="shapes" className="border-slate-700">
              <AccordionTrigger className="text-sm text-blue-400 hover:text-blue-300 py-3 hover:no-underline">
                <div className="flex items-center">
                  <Shapes className="w-4 h-4 mr-2" />
                  Shape Types
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <ShapeTypesContent />
              </AccordionContent>
            </AccordionItem>

            {/* Selection Modes Section */}
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

            {/* Layers Section */}
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

            {/* Properties Section */}
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

            {/* Composition Section */}
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

            {/* Align & Distribute Section */}
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

            {/* Artboards Section */}
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

            {/* Color Manipulation Section */}
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

            {/* Project Management Section */}
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

            {/* Export & Save Section */}
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
          </Accordion>
        </div>
      )}
    </div>
  );
}