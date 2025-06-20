import { useState, useCallback, useMemo, useEffect } from 'react';
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
  Trash,
  FileImage,
  Save,
  FolderOpen,
  Clipboard,
  Boxes
} from 'lucide-react';
import { ShapeType, ShapeGroup as ShapeGroupClass, BlendMode, ScatterSettings, CanvasSettings, Artboard, ArtboardPreset } from '@/lib/shapeTypes';
import { Shape } from '@/lib/shapes';
import { renderShape } from '@/lib/shapeRenderer';

// Shape display names mapping
const shapeTypeDisplayNames: Record<ShapeType, string> = {
  rectangle: 'Rectangle',
  square: 'Square',
  circle: 'Circle',
  ellipse: 'Ellipse',
  polygon: 'Polygon',
  star: 'Star',
  line: 'Line',
  bezier: 'Bézier Curve',
  cubic: 'Cubic Spline',
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
    const artboardPresets = [
      { name: 'Desktop HD', width: 1920, height: 1080, category: 'web', description: '1920×1080 Full HD' },
      { name: 'Instagram Post', width: 1080, height: 1080, category: 'social', description: 'Square 1:1' },
      { name: 'Instagram Story', width: 1080, height: 1920, category: 'social', description: 'Portrait 9:16' },
      { name: 'Business Card', width: 1050, height: 600, category: 'print', description: '3.5×2" at 300 DPI' },
      { name: 'A4 Paper', width: 2480, height: 3508, category: 'print', description: '210×297mm at 300 DPI' },
      { name: 'iPhone 14 Pro', width: 1179, height: 2556, category: 'mobile', description: 'iPhone screen' }
    ];

    return (
      <div className="space-y-4">
        <div className="text-sm text-slate-400">
          Active: <span className="text-white font-medium">{artboards.find(a => a.id === activeArtboard)?.name || 'None'}</span>
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
        if (shapesToExport.length === 0) return;
        
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
                <SelectItem value="selection" className="text-black data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">Selected Shapes</SelectItem>
                <SelectItem value="artboard" className="text-black data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">Artboard Content</SelectItem>
                <SelectItem value="all" className="text-black data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">All Shapes</SelectItem>
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
                    <SelectItem key={artboard.id} value={artboard.id} className="text-black data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">
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
                <SelectItem value="png" className="text-black data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">PNG (Transparent)</SelectItem>
                <SelectItem value="jpg" className="text-black data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">JPG (Compressed)</SelectItem>
                <SelectItem value="svg" className="text-black data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">SVG (Vector)</SelectItem>
                <SelectItem value="pdf" className="text-black data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">PDF (Print)</SelectItem>
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
            { id: 'selection', name: 'Selection Mode', icon: Target, color: 'cyan', content: SelectionModesContent },
            { id: 'artboards', name: 'Artboards', icon: Monitor, color: 'orange', content: ArtboardsContent },
            { id: 'export', name: 'Export & Save', icon: Download, color: 'emerald', content: ExportSaveContent },
            { id: 'shapes', name: 'Shape Types', icon: Shapes, color: 'blue', content: ShapeTypesContent },
            { id: 'composition', name: 'Composition', icon: Shuffle, color: 'green', content: CompositionContent },
            { id: 'properties', name: 'Properties', icon: Settings, color: 'yellow', content: PropertiesContent },
            { id: 'layers', name: 'Layers', icon: Layers3, color: 'purple', content: LayersContent },
            { id: 'colors', name: 'Color Manipulation', icon: Palette, color: 'pink', content: ColorManipulationContent }
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
            {/* Selection Modes Section */}
            <AccordionItem value="selection" className="border-slate-700">
              <AccordionTrigger className="text-sm text-orange-400 hover:text-orange-300 py-3 hover:no-underline">
                <div className="flex items-center">
                  <MousePointer className="w-4 h-4 mr-2" />
                  Selection Modes
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <SelectionModesContent />
              </AccordionContent>
            </AccordionItem>

            {/* Artboards Section */}
            <AccordionItem value="artboards" className="border-slate-700">
              <AccordionTrigger className="text-sm text-teal-400 hover:text-teal-300 py-3 hover:no-underline">
                <div className="flex items-center">
                  <Monitor className="w-4 h-4 mr-2" />
                  Artboards
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <ArtboardsContent />
              </AccordionContent>
            </AccordionItem>

            {/* Export & Save Section */}
            <AccordionItem value="export" className="border-slate-700">
              <AccordionTrigger className="text-sm text-cyan-400 hover:text-cyan-300 py-3 hover:no-underline">
                <div className="flex items-center">
                  <Download className="w-4 h-4 mr-2" />
                  Export & Save
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <ExportSaveContent />
              </AccordionContent>
            </AccordionItem>

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
          </Accordion>
        </div>
      )}
    </div>
  );
}