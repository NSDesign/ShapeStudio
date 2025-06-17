import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Shapes, 
  Layers, 
  Palette, 
  GitMerge,
  Menu,
  Wand2,
  Navigation,
  Move,
  Expand,
  FlipHorizontal,
  FlipVertical,
  Trash2,
  Boxes,
  Square,
  Circle,
  Triangle,
  Star,
  Hexagon,
  Zap,
  Coffee,
  CheckSquare,
  ArrowUpDown,
  ArrowLeftRight,
  RotateCw,
  Blend,
  Filter,
  Minimize2,
  Maximize2,
  PlusCircle,
  Grid,
  Target
} from 'lucide-react';
import { ShapeType, Shape, ShapeGroupClass, BlendMode, ScatterSettings, CanvasSettings, Artboard, ArtboardPreset } from '@/lib/shapeTypes';

// Shape display names mapping
const shapeTypeDisplayNames: Record<ShapeType, string> = {
  rectangle: 'Rectangle',
  square: 'Square',
  circle: 'Circle',
  ellipse: 'Ellipse',
  line: 'Line',
  polygon: 'Polygon',
  star: 'Star',
  blob: 'Blob',
  bezier: 'Bézier',
  cubic: 'Cubic',
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
      
      {isCollapsed ? (
        /* Collapsed sidebar with icon buttons */
        <div className="flex flex-col items-center py-2 space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-blue-300 hover:bg-slate-800 h-8 w-8 p-0"
            onClick={() => setIsCollapsed(false)}
          >
            <Shapes className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-green-300 hover:bg-slate-800 h-8 w-8 p-0"
            onClick={() => setIsCollapsed(false)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-purple-300 hover:bg-slate-800 h-8 w-8 p-0"
            onClick={() => setIsCollapsed(false)}
          >
            <Layers className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-yellow-300 hover:bg-slate-800 h-8 w-8 p-0"
            onClick={() => setIsCollapsed(false)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-pink-300 hover:bg-slate-800 h-8 w-8 p-0"
            onClick={() => setIsCollapsed(false)}
          >
            <Palette className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-cyan-300 hover:bg-slate-800 h-8 w-8 p-0"
            onClick={() => setIsCollapsed(false)}
          >
            <GitMerge className="h-4 w-4" />
          </Button>
        </div>
      ) : (
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

            {/* Properties Section */}
            <AccordionItem value="properties" className="border-slate-700">
              <AccordionTrigger className="text-sm text-green-400 hover:text-green-300 py-3 hover:no-underline">
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
              <AccordionTrigger className="text-sm text-purple-400 hover:text-purple-300 py-3 hover:no-underline">
                <div className="flex items-center">
                  <Layers className="w-4 h-4 mr-2" />
                  Composition
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <CompositionContent />
              </AccordionContent>
            </AccordionItem>

            {/* Layers Section */}
            <AccordionItem value="layers" className="border-slate-700">
              <AccordionTrigger className="text-sm text-yellow-400 hover:text-yellow-300 py-3 hover:no-underline">
                <div className="flex items-center">
                  <Menu className="w-4 h-4 mr-2" />
                  Layers
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <LayersContent />
              </AccordionContent>
            </AccordionItem>

            {/* Color Manipulation Section */}
            <AccordionItem value="color" className="border-slate-700">
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

            {/* Boolean Operations Section */}
            <AccordionItem value="boolean" className="border-slate-700">
              <AccordionTrigger className="text-sm text-cyan-400 hover:text-cyan-300 py-3 hover:no-underline">
                <div className="flex items-center">
                  <GitMerge className="w-4 h-4 mr-2" />
                  Boolean Operations
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <BooleanOperationsContent />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  );

  // Helper functions for content sections
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

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Distribution Pattern</Label>
              <Select
                value={scatterSettings.distribution.pattern}
                onValueChange={(value: any) => onUpdateScatterSettings({ 
                  distribution: { ...scatterSettings.distribution, pattern: value }
                })}
              >
                <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="random" className="text-black data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">Random</SelectItem>
                  <SelectItem value="grid" className="text-black data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">Grid</SelectItem>
                  <SelectItem value="circle" className="text-black data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">Circle</SelectItem>
                  <SelectItem value="spiral" className="text-black data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">Spiral</SelectItem>
                  <SelectItem value="organic" className="text-black data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">Organic</SelectItem>
                  <SelectItem value="physics" className="text-black data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">Physics</SelectItem>
                  <SelectItem value="wave" className="text-black data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">Wave</SelectItem>
                  <SelectItem value="cluster" className="text-black data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">Cluster</SelectItem>
                </SelectContent>
              </Select>
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
      <div className="space-y-4">
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

        {(scatterSettings.onPoints || scatterSettings.insideArea) && (
          <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <div className="text-xs text-blue-200 font-medium mb-1">Scatter Mode Active</div>
            <div className="text-xs text-blue-300">
              Click on any shape to scatter new shapes {scatterSettings.onPoints ? 'on its points' : ''} 
              {scatterSettings.onPoints && scatterSettings.insideArea ? ' and ' : ''}
              {scatterSettings.insideArea ? 'inside its area' : ''}
            </div>
          </div>
        )}
      </div>
    );
  }

  function LayersContent() {
    const blendModes = [
      'source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
      'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference',
      'exclusion', 'hue', 'saturation', 'color', 'luminosity'
    ];

    const sortedShapes = useMemo(() => {
      return (shapes || []).sort((a, b) => b.properties.zIndex - a.properties.zIndex);
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
          {sortedShapes.map((shape, index) => (
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
      if (selectedShapes.length === 0) return;

      const manipulation = {
        type: 'hsl_shift' as const,
        hslShift: {
          hue: hueShift,
          saturation: saturationShift,
          lightness: lightnessShift
        },
        remappings: []
      };

      onApplyColorManipulation(manipulation);
    };

    return (
      <div className="space-y-4">
        <div className="text-sm text-slate-400">
          Color Manipulation
        </div>

        {selectedShapes.length === 0 && (
          <div className="text-xs text-slate-500">
            Select shapes to manipulate colors
          </div>
        )}

        {selectedShapes.length > 0 && (
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

  function BooleanOperationsContent() {
    const [selectedBooleanOp, setSelectedBooleanOp] = useState<'union' | 'subtract' | 'intersect' | 'exclude'>('union');
    const [booleanTargetId, setBooleanTargetId] = useState<string>('');

    const potentialTargets = selectedShapes.length > 0 
      ? shapes.filter(shape => !selectedShapes.some(selected => selected.id === shape.id))
      : [];

    const canPerformBoolean = selectedShapes.length > 0 && booleanTargetId !== '';

    const shapesIntersect = (sourceShape: Shape, targetShape: Shape): boolean => {
      const sourceBounds = sourceShape.getBounds();
      const targetBounds = targetShape.getBounds();
      
      return !(sourceBounds.x + sourceBounds.width < targetBounds.x ||
               targetBounds.x + targetBounds.width < sourceBounds.x ||
               sourceBounds.y + sourceBounds.height < targetBounds.y ||
               targetBounds.y + targetBounds.height < sourceBounds.y);
    };

    return (
      <div className="space-y-4">
        <div className="text-sm text-slate-400">
          Boolean Operations
        </div>

        {selectedShapes.length === 0 && (
          <div className="text-xs text-slate-500">
            Select shapes to perform boolean operations
          </div>
        )}

        {selectedShapes.length > 0 && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Operation</Label>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  variant={selectedBooleanOp === 'union' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedBooleanOp('union')}
                  className="text-xs"
                >
                  Union
                </Button>
                <Button
                  variant={selectedBooleanOp === 'subtract' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedBooleanOp('subtract')}
                  className="text-xs"
                >
                  Subtract
                </Button>
                <Button
                  variant={selectedBooleanOp === 'intersect' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedBooleanOp('intersect')}
                  className="text-xs"
                >
                  Intersect
                </Button>
                <Button
                  variant={selectedBooleanOp === 'exclude' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedBooleanOp('exclude')}
                  className="text-xs"
                >
                  Exclude
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Target Shape</Label>
              <Select value={booleanTargetId} onValueChange={setBooleanTargetId}>
                <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600">
                  <SelectValue placeholder="Select target shape" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {potentialTargets.map((shape, index) => {
                    const intersects = selectedShapes.some(selected => shapesIntersect(selected, shape));
                    return (
                      <SelectItem key={shape.id} value={shape.id} className="text-black data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">
                        {shape.type} (z: {shape.properties.zIndex}) {intersects ? '🔗' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => onApplyBooleanOperation(selectedBooleanOp, booleanTargetId)}
              disabled={!canPerformBoolean}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white"
            >
              Apply {selectedBooleanOp.charAt(0).toUpperCase() + selectedBooleanOp.slice(1)}
            </Button>

            {potentialTargets.length === 0 && (
              <div className="text-xs text-slate-500">
                Need at least one other shape as target
              </div>
            )}
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
      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Move</Label>
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

        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Scale (%)</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Input
                type="number"
                value={scaleX}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setScaleX(value);
                  if (lockAspectRatio) {
                    setScaleY(value);
                  }
                }}
                className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                placeholder="Scale X"
              />
            </div>
            <div className="space-y-1">
              <Input
                type="number"
                value={scaleY}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setScaleY(value);
                  if (lockAspectRatio) {
                    setScaleX(value);
                  }
                }}
                className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                placeholder="Scale Y"
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
}