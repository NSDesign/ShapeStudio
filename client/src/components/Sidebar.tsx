import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Square, 
  Circle, 
  Boxes, 
  Star, 
  Minus, 
  Move, 
  RotateCw, 
  FlipHorizontal, 
  FlipVertical,
  Layers,
  Wand2,
  ArrowUpDown,
  ArrowLeftRight,
  Expand,
  Italic,
  Shapes,
  Settings,
  Palette,
  MousePointer,
  Navigation,
  Spline,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { ShapeType, ScatterSettings } from "../lib/shapeTypes";
import { useShapeEditor } from "../hooks/useShapeEditor";

const shapeIcons: Record<ShapeType, any> = {
  rectangle: Square,
  square: Square,
  circle: Circle,
  ellipse: Circle,
  polygon: Boxes,
  star: Star,
  line: Minus,
  bezier: Minus,
  cubic: Minus,
  quadratic: Minus,
  nurbs: Minus,
  blob: Circle,
  ring: Circle
};

const shapeNames: Record<ShapeType, string> = {
  rectangle: 'Rectangle',
  square: 'Square',
  circle: 'Circle',
  ellipse: 'Ellipse',
  polygon: 'Boxes',
  star: 'Star',
  line: 'Line',
  bezier: 'Bezier',
  cubic: 'Cubic',
  quadratic: 'Quadratic',
  nurbs: 'NURBS',
  blob: 'Blob',
  ring: 'Ring'
};

interface SidebarProps {
  enabledShapeTypes: Set<ShapeType>;
  scatterSettings: ScatterSettings;
  selectedCount: number;
  selectedPointsCount: number;
  selectedSegmentsCount: number;
  editMode: 'shapes' | 'points' | 'segments';
  canComposeShapes: boolean;
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
}

export default function Sidebar({
  enabledShapeTypes,
  scatterSettings,
  selectedCount,
  selectedPointsCount,
  selectedSegmentsCount,
  editMode,
  canComposeShapes,
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
  onFlipVertical
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [moveX, setMoveX] = useState(0);
  const [moveY, setMoveY] = useState(0);
  const [scaleX, setScaleX] = useState(100);
  const [scaleY, setScaleY] = useState(100);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [skewX, setSkewX] = useState(0);
  const [skewY, setSkewY] = useState(0);
  
  const allShapeTypes: ShapeType[] = [
    'rectangle', 'square', 'circle', 'ellipse', 'line', 
    'polygon', 'star', 'blob', 'ring', 'bezier', 'cubic', 'quadratic', 'nurbs'
  ];

  const ShapeTypesContent = () => (
    <div className="space-y-3">
      <div className="space-y-3 max-h-48 overflow-y-auto" style={{ scrollBehavior: 'auto' }}>
        {allShapeTypes.map((type) => {
          const IconComponent = shapeIcons[type];
          const isEnabled = enabledShapeTypes.has(type);
          
          return (
            <div key={type} className="flex items-center justify-between p-2 rounded-lg">
              <div className="flex items-center space-x-3">
                <IconComponent className="w-4 h-4 text-[var(--editor-primary)]" />
                <span className="text-sm font-medium text-white">{shapeNames[type]}</span>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={() => onToggleShapeType(type)}
              />
            </div>
          );
        })}
      </div>
      
      <Button 
        onClick={onGenerateRandomShapes}
        className="w-full mt-4 bg-[var(--editor-primary)] hover:bg-blue-700 text-white font-medium"
      >
        <Wand2 className="w-4 h-4 mr-2" />
        Generate Random Shapes
      </Button>
    </div>
  );

  const EditModeContent = () => (
    <div className="space-y-3">
      <div className="text-xs text-slate-400 mb-3">
        Select editing mode to control different aspects of your shapes
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        <Button
          variant={editMode === 'shapes' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => onSetEditMode('shapes')}
          className={editMode === 'shapes' ? 
            "bg-[var(--editor-primary)] text-white" : 
            "bg-[var(--surface-light)] hover:bg-slate-600 text-slate-200"
          }
        >
          <MousePointer className="w-3 h-3 mr-2" />
          Shape Mode
        </Button>
        
        <Button
          variant={editMode === 'points' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => onSetEditMode('points')}
          className={editMode === 'points' ? 
            "bg-[var(--editor-primary)] text-white" : 
            "bg-[var(--surface-light)] hover:bg-slate-600 text-slate-200"
          }
        >
          <Navigation className="w-3 h-3 mr-2" />
          Point Mode
        </Button>
        
        <Button
          variant={editMode === 'segments' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => onSetEditMode('segments')}
          className={editMode === 'segments' ? 
            "bg-[var(--editor-primary)] text-white" : 
            "bg-[var(--surface-light)] hover:bg-slate-600 text-slate-200"
          }
        >
          <Spline className="w-3 h-3 mr-2" />
          Segment Mode
        </Button>
      </div>
      
      <div className="text-xs text-slate-500 mt-3">
        {editMode === 'shapes' && "Select and transform entire shapes"}
        {editMode === 'points' && `Edit individual points - ${selectedPointsCount} selected`}
        {editMode === 'segments' && `Edit shape segments - ${selectedSegmentsCount} selected`}
      </div>
    </div>
  );

  const TransformToolsContent = () => (
    <div className="space-y-4">
      {selectedCount === 0 && (
        <div className="text-xs text-slate-400 text-center">
          Select shapes to transform
        </div>
      )}
      
      {selectedCount > 0 && (
        <>
          {/* Move Controls */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-300 flex items-center">
              <Move className="w-3 h-3 mr-1" />
              Move
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-slate-400">X</Label>
                <Input
                  type="number"
                  value={moveX}
                  onChange={(e) => setMoveX(Number(e.target.value))}
                  className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-400">Y</Label>
                <Input
                  type="number"
                  value={moveY}
                  onChange={(e) => setMoveY(Number(e.target.value))}
                  className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onMoveBy(moveX, moveY);
                setMoveX(0);
                setMoveY(0);
              }}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
              Apply Move
            </Button>
          </div>

          {/* Scale Controls */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-300 flex items-center">
              <Expand className="w-3 h-3 mr-1" />
              Scale
            </Label>
            <div className="flex items-center space-x-2 mb-2">
              <Checkbox
                checked={lockAspectRatio}
                onCheckedChange={(checked) => setLockAspectRatio(checked === true)}
                className="border-slate-600"
              />
              <Label className="text-xs text-slate-400">Lock aspect ratio</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-slate-400">X %</Label>
                <Input
                  type="number"
                  value={scaleX}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setScaleX(value);
                    if (lockAspectRatio) setScaleY(value);
                  }}
                  className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-400">Y %</Label>
                <Input
                  type="number"
                  value={scaleY}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setScaleY(value);
                    if (lockAspectRatio) setScaleX(value);
                  }}
                  className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onScaleBy(scaleX / 100, scaleY / 100);
                setScaleX(100);
                setScaleY(100);
              }}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
              Apply Scale
            </Button>
          </div>

          {/* Rotation Controls */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-300 flex items-center">
              <RotateCw className="w-3 h-3 mr-1" />
              Rotate
            </Label>
            <div>
              <Label className="text-xs text-slate-400">Degrees</Label>
              <Input
                type="number"
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value) % 360)}
                className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onRotateBy(rotation);
                setRotation(0);
              }}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
              Apply Rotation
            </Button>
          </div>

          {/* Skew Controls */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-300 flex items-center">
              <Italic className="w-3 h-3 mr-1" />
              Skew
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-slate-400">X</Label>
                <Input
                  type="number"
                  value={skewX}
                  onChange={(e) => setSkewX(Number(e.target.value))}
                  className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-400">Y</Label>
                <Input
                  type="number"
                  value={skewY}
                  onChange={(e) => setSkewY(Number(e.target.value))}
                  className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onSkewBy(skewX, skewY);
                setSkewX(0);
                setSkewY(0);
              }}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
              Apply Skew
            </Button>
          </div>

          {/* Flip Controls */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-300">Flip</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={onFlipHorizontal}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200"
              >
                <FlipHorizontal className="w-3 h-3 mr-1" />
                Horizontal
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onFlipVertical}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200"
              >
                <FlipVertical className="w-3 h-3 mr-1" />
                Vertical
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const CompositionContent = () => (
    <div className="space-y-3">
      <Button 
        onClick={onComposeShapes}
        disabled={!canComposeShapes}
        className="w-full bg-[var(--editor-accent)] hover:bg-purple-700 text-white font-medium mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Layers className="w-4 h-4 mr-2" />
        Compose Shapes
      </Button>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <Switch
            checked={scatterSettings.onPoints}
            onCheckedChange={(checked) => onUpdateScatterSettings({ onPoints: checked })}
          />
          <Label className="text-sm text-white">Scatter on Points</Label>
        </div>
        <div className="flex items-center space-x-3">
          <Switch
            checked={scatterSettings.insideArea}
            onCheckedChange={(checked) => onUpdateScatterSettings({ insideArea: checked })}
          />
          <Label className="text-sm text-white">Scatter Inside Area</Label>
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Scatter Count</Label>
          <Slider
            value={[scatterSettings.count]}
            onValueChange={([value]) => onUpdateScatterSettings({ count: value })}
            min={1}
            max={20}
            step={1}
            className="w-full"
          />
          <span className="text-xs text-slate-400">{scatterSettings.count} shapes</span>
        </div>
      </div>
    </div>
  );

  const PropertiesContent = () => (
    <div className="space-y-4">
      <div className="text-sm text-slate-400">
        Selected: <span className="text-white font-medium">{selectedCount}</span> {selectedCount === 1 ? 'shape' : 'shapes'}
      </div>
      
      {selectedCount > 0 && (
        <div className="text-xs text-slate-500">
          Use the transform tools above to modify selected shapes, or drag them directly on the canvas.
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

  if (isCollapsed) {
    return (
      <div className="w-16 bg-[var(--surface)] border-r border-slate-700 flex flex-col">
        {/* Collapsed Header */}
        <div className="p-4 border-b border-slate-700 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(false)}
            className="text-slate-400 hover:text-white p-2 h-auto"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Icon Panels */}
        <div className="flex-1 flex flex-col space-y-2 py-4">
          {/* Shape Types */}
          <Popover onOpenChange={(open) => setActivePopover(open ? 'shapes' : null)}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`p-3 h-auto mx-2 transition-colors border ${
                  activePopover === 'shapes' 
                    ? 'bg-orange-500 text-white hover:bg-orange-600 border-orange-400' 
                    : 'text-slate-900 hover:text-black hover:bg-gray-100 bg-white border-slate-300'
                }`}
              >
                <Shapes className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              className="w-80 bg-[var(--surface)] border-slate-700"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-300 flex items-center">
                  <Shapes className="w-4 h-4 mr-2" />
                  Shape Types
                </h3>
                <ShapeTypesContent />
              </div>
            </PopoverContent>
          </Popover>

          {/* Edit Mode */}
          <Popover onOpenChange={(open) => setActivePopover(open ? 'edit' : null)}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`p-3 h-auto mx-2 transition-colors border ${
                  activePopover === 'edit' 
                    ? 'bg-green-500 text-white hover:bg-green-600 border-green-400' 
                    : 'text-slate-900 hover:text-black hover:bg-gray-100 bg-white border-slate-300'
                }`}
              >
                <Settings className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              className="w-80 bg-[var(--surface)] border-slate-700"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-300 flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Mode
                </h3>
                <EditModeContent />
              </div>
            </PopoverContent>
          </Popover>

          {/* Transform Tools */}
          <Popover onOpenChange={(open) => setActivePopover(open ? 'transform' : null)}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`p-3 h-auto mx-2 transition-colors border ${
                  activePopover === 'transform' 
                    ? 'bg-purple-500 text-white hover:bg-purple-600 border-purple-400' 
                    : 'text-slate-900 hover:text-black hover:bg-gray-100 bg-white border-slate-300'
                }`}
              >
                <Move className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              className="w-80 bg-[var(--surface)] border-slate-700"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-300 flex items-center">
                  <Move className="w-4 h-4 mr-2" />
                  Transform Tools
                </h3>
                <TransformToolsContent />
              </div>
            </PopoverContent>
          </Popover>

          {/* Composition */}
          <Popover onOpenChange={(open) => setActivePopover(open ? 'composition' : null)}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`p-3 h-auto mx-2 transition-colors border ${
                  activePopover === 'composition' 
                    ? 'bg-blue-500 text-white hover:bg-blue-600 border-blue-400' 
                    : 'text-slate-900 hover:text-black hover:bg-gray-100 bg-white border-slate-300'
                }`}
              >
                <Layers className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              className="w-80 bg-[var(--surface)] border-slate-700"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-300 flex items-center">
                  <Layers className="w-4 h-4 mr-2" />
                  Composition
                </h3>
                <CompositionContent />
              </div>
            </PopoverContent>
          </Popover>

          {/* Properties */}
          <Popover onOpenChange={(open) => setActivePopover(open ? 'properties' : null)}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`p-3 h-auto mx-2 transition-colors border ${
                  activePopover === 'properties' 
                    ? 'bg-pink-500 text-white hover:bg-pink-600 border-pink-400' 
                    : 'text-slate-900 hover:text-black hover:bg-gray-100 bg-white border-slate-300'
                }`}
              >
                <Palette className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              className="w-80 bg-[var(--surface)] border-slate-700"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-300 flex items-center">
                  <Palette className="w-4 h-4 mr-2" />
                  Properties
                </h3>
                <PropertiesContent />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-[var(--surface)] border-r border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Shape Editor Pro</h1>
          <p className="text-sm text-slate-400">Create and manipulate shapes with precision</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(true)}
          className="text-slate-400 hover:text-white p-2 h-auto"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Accordion Sections */}
      <div className="flex-1 overflow-y-auto">
        <Accordion type="multiple" defaultValue={["shapes", "editmode", "transforms"]} className="w-full">
          
          {/* Shape Types Section */}
          <AccordionItem value="shapes" className="border-b border-slate-700">
            <AccordionTrigger className="px-6 py-4 text-slate-300 hover:text-white hover:no-underline">
              <div className="flex items-center space-x-2">
                <Shapes className="w-4 h-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">Shape Types</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <ShapeTypesContent />
            </AccordionContent>
          </AccordionItem>
          
          {/* Edit Mode Section - Moved under Create */}
          <AccordionItem value="editmode" className="border-b border-slate-700">
            <AccordionTrigger className="px-6 py-4 text-slate-300 hover:text-white hover:no-underline">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">Edit Mode</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <EditModeContent />
            </AccordionContent>
          </AccordionItem>
          
          {/* Transform Tools Section */}
          <AccordionItem value="transforms" className="border-b border-slate-700">
            <AccordionTrigger className="px-6 py-4 text-slate-300 hover:text-white hover:no-underline">
              <div className="flex items-center space-x-2">
                <Move className="w-4 h-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">Transform Tools</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <TransformToolsContent />
            </AccordionContent>
          </AccordionItem>
          
          {/* Composition Section */}
          <AccordionItem value="composition" className="border-b border-slate-700">
            <AccordionTrigger className="px-6 py-4 text-slate-300 hover:text-white hover:no-underline">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">Composition</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <CompositionContent />
            </AccordionContent>
          </AccordionItem>
          
          {/* Properties Section */}
          <AccordionItem value="properties" className="border-b-0">
            <AccordionTrigger className="px-6 py-4 text-slate-300 hover:text-white hover:no-underline">
              <div className="flex items-center space-x-2">
                <Palette className="w-4 h-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">Properties</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <PropertiesContent />
            </AccordionContent>
          </AccordionItem>
          
        </Accordion>
      </div>
    </div>
  );
}
