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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Shape, ShapeGroupClass } from '../lib/shapes';
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
  ChevronRight,
  Trash2,
  FolderOpen,
  Menu,
  Grid3X3,
  Plus,
  Scissors,
  Pipette,
  Shuffle,
  Combine,
  GitMerge
} from "lucide-react";
import { ShapeType, ScatterSettings, BlendMode, Artboard, ArtboardPreset, ARTBOARD_PRESETS } from "../lib/shapeTypes";
import { useShapeEditor } from "../hooks/useShapeEditor";

const shapeIcons: Record<ShapeType, any> = {
  rectangle: Square,
  square: Square,
  circle: Circle,
  ellipse: Circle,
  polygon: Boxes,
  star: Star,
  line: Minus,
  bezier: Spline,
  cubic: Spline,
  blob: Circle,
  ring: Circle
};

const shapeNames: Record<ShapeType, string> = {
  rectangle: 'Rectangle',
  square: 'Square',
  circle: 'Circle',
  ellipse: 'Ellipse',
  polygon: 'Polygon',
  star: 'Star',
  line: 'Line',
  bezier: 'Bezier',
  cubic: 'Cubic',
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
  const [rotation, setRotation] = useState(0);
  const [skewX, setSkewX] = useState(0);
  const [skewY, setSkewY] = useState(0);
  
  // Boolean operations state
  const [selectedBooleanOp, setSelectedBooleanOp] = useState<'union' | 'subtract' | 'intersect' | 'exclude'>('union');
  const [booleanTargetId, setBooleanTargetId] = useState<string>('');
  
  // Color manipulation state
  const [colorMode, setColorMode] = useState<'shift' | 'remap'>('shift');
  const [hueShift, setHueShift] = useState(0);
  const [saturationShift, setSaturationShift] = useState(0);
  const [lightnessShift, setLightnessShift] = useState(0);
  const [affectFill, setAffectFill] = useState(true);
  const [affectStroke, setAffectStroke] = useState(true);

  // Shape properties will be passed from parent component via selectedShapes data

  const allShapeTypes: ShapeType[] = [
    'rectangle', 'square', 'circle', 'ellipse', 'line', 
    'polygon', 'star', 'blob', 'ring', 'bezier', 'cubic'
  ];

  const ShapeTypesContent = () => (
    <div className="space-y-3">
      <div className="space-y-3 max-h-48 overflow-y-auto" style={{ scrollBehavior: 'auto' }}>
        {allShapeTypes.map((type) => {
          const IconComponent = shapeIcons[type];
          const isEnabled = enabledShapeTypes.has(type);

          return (
            <div key={type} className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
              isEnabled ? 'bg-blue-900/30 border border-blue-500/50' : 'bg-slate-800/50 hover:bg-slate-700/50'
            }`}>
              <div className="flex items-center space-x-3">
                <IconComponent className={`w-4 h-4 transition-colors ${
                  isEnabled ? 'text-blue-400' : 'text-slate-400'
                }`} />
                <span className={`text-sm font-medium transition-colors ${
                  isEnabled ? 'text-blue-200' : 'text-slate-300'
                }`}>{shapeNames[type]}</span>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={() => onToggleShapeType(type)}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mt-4">
        <Button 
          onClick={() => {
            allShapeTypes.forEach(type => {
              if (!enabledShapeTypes.has(type)) {
                onToggleShapeType(type);
              }
            });
          }}
          variant="secondary"
          size="sm"
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200"
        >
          All On
        </Button>
        <Button 
          onClick={() => {
            allShapeTypes.forEach(type => {
              if (enabledShapeTypes.has(type)) {
                onToggleShapeType(type);
              }
            });
          }}
          variant="secondary"
          size="sm"
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200"
        >
          All Off
        </Button>
      </div>

      <div className="space-y-2 mt-4">
        <Label className="text-xs text-slate-400">Shape Count Range</Label>
        <div className="space-y-2">
          <Slider
            value={[scatterSettings.minCount, scatterSettings.maxCount]}
            onValueChange={([min, max]) => onUpdateScatterSettings({ minCount: min, maxCount: max })}
            min={1}
            max={50}
            step={1}
            className="w-full"
            minStepsBetweenThumbs={1}
          />
          <div className="flex justify-between items-center">
            <Input
              type="number"
              value={scatterSettings.minCount}
              onChange={(e) => {
                const value = Math.max(1, Math.min(Number(e.target.value), scatterSettings.maxCount - 1));
                onUpdateScatterSettings({ minCount: value });
              }}
              className="h-6 w-12 text-xs bg-slate-800 border-slate-600 text-white slider-input"
              min={1}
              max={scatterSettings.maxCount - 1}
            />
            <span className="text-xs text-slate-400 px-2">to</span>
            <Input
              type="number"
              value={scatterSettings.maxCount}
              onChange={(e) => {
                const value = Math.max(scatterSettings.minCount + 1, Math.min(Number(e.target.value), 50));
                onUpdateScatterSettings({ maxCount: value });
              }}
              className="h-6 w-12 text-xs bg-slate-800 border-slate-600 text-white slider-input"
              min={scatterSettings.minCount + 1}
              max={50}
            />
          </div>
          <span className="text-xs text-slate-400 text-center">{scatterSettings.minCount}-{scatterSettings.maxCount} shapes per generation</span>
        </div>
      </div>

      <Button 
        onClick={onGenerateRandomShapes}
        className="w-full mt-3 bg-[var(--editor-primary)] hover:bg-blue-700 text-white font-medium"
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
            "bg-blue-600 hover:bg-blue-700 text-white border-blue-500" : 
            "bg-slate-800/50 hover:bg-slate-700 text-slate-300 border-slate-600"
          }
        >
          <MousePointer className={`w-3 h-3 mr-2 ${editMode === 'shapes' ? 'text-white' : 'text-slate-400'}`} />
          Shape Mode
        </Button>

        <Button
          variant={editMode === 'points' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => onSetEditMode('points')}
          className={editMode === 'points' ? 
            "bg-green-600 hover:bg-green-700 text-white border-green-500" : 
            "bg-slate-800/50 hover:bg-slate-700 text-slate-300 border-slate-600"
          }
        >
          <Navigation className={`w-3 h-3 mr-2 ${editMode === 'points' ? 'text-white' : 'text-slate-400'}`} />
          Point Mode
        </Button>

        <Button
          variant={editMode === 'segments' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => onSetEditMode('segments')}
          className={editMode === 'segments' ? 
            "bg-purple-600 hover:bg-purple-700 text-white border-purple-500" : 
            "bg-slate-800/50 hover:bg-slate-700 text-slate-300 border-slate-600"
          }
        >
          <Spline className={`w-3 h-3 mr-2 ${editMode === 'segments' ? 'text-white' : 'text-slate-400'}`} />
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
            <div className="space-y-2">
              <div>
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">X</Label>
                  <Input
                    type="number"
                    value={moveX}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setMoveX(value);
                      onMoveBy(value - moveX, 0);
                    }}
                    className="h-5 w-16 text-xs bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <Slider
                  value={[moveX]}
                  onValueChange={([value]) => {
                    onMoveBy(value - moveX, 0);
                    setMoveX(value);
                  }}
                  min={-500}
                  max={500}
                  step={1}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">Y</Label>
                  <Input
                    type="number"
                    value={moveY}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setMoveY(value);
                      onMoveBy(0, value - moveY);
                    }}
                    className="h-5 w-16 text-xs bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <Slider
                  value={[moveY]}
                  onValueChange={([value]) => {
                    onMoveBy(0, value - moveY);
                    setMoveY(value);
                  }}
                  min={-500}
                  max={500}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
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
            <div className="space-y-2">
              <div>
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">X %</Label>
                  <Input
                    type="number"
                    value={scaleX}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      const factor = value / 100;
                      const currentFactor = scaleX / 100;
                      const deltaFactor = factor / currentFactor;

                      setScaleX(value);
                      if (lockAspectRatio) {
                        setScaleY(value);
                        onScaleBy(deltaFactor, deltaFactor);
                      } else {
                        onScaleBy(deltaFactor, 1);
                      }
                    }}
                    className="h-5 w-16 text-xs bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <Slider
                  value={[scaleX]}
                  onValueChange={([value]) => {
                    const factor = value / 100;
                    const currentFactor = scaleX / 100;
                    const deltaFactor = factor / currentFactor;

                    setScaleX(value);
                    if (lockAspectRatio) {
                      setScaleY(value);
                      onScaleBy(deltaFactor, deltaFactor);
                    } else {
                      onScaleBy(deltaFactor, 1);
                    }
                  }}
                  min={10}
                  max={300}
                  step={1}
                  className="w-full"
                />
              </div>
              {!lockAspectRatio && (
                <div>
                  <div className="flex justify-between">
                    <Label className="text-xs text-slate-400">Y %</Label>
                    <Input
                      type="number"
                      value={scaleY}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        const factor = value / 100;
                        const currentFactor = scaleY / 100;
                        const deltaFactor = factor / currentFactor;

                        setScaleY(value);
                        onScaleBy(1, deltaFactor);
                      }}
                      className="h-5 w-16 text-xs bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <Slider
                    value={[scaleY]}
                    onValueChange={([value]) => {
                      const factor = value / 100;
                      const currentFactor = scaleY / 100;
                      const deltaFactor = factor / currentFactor;

                      setScaleY(value);
                      onScaleBy(1, deltaFactor);
                    }}
                    min={10}
                    max={300}
                    step={1}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Rotation Controls */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-300 flex items-center">
              <RotateCw className="w-3 h-3 mr-1" />
              Rotate
            </Label>
            <div>
              <div className="flex justify-between">
                <Label className="text-xs text-slate-400">Degrees</Label>
                <Input
                  type="number"
                  value={rotation}
                  onChange={(e) => {
                    const value = Number(e.target.value) % 360;
                    const delta = value - rotation;
                    setRotation(value);
                    onRotateBy(delta);
                  }}
                  className="h-5 w-16 text-xs bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <Slider
                value={[rotation]}
                onValueChange={([value]) => {
                  const delta = value - rotation;
                  setRotation(value);
                  onRotateBy(delta);
                }}
                min={-180}
                max={180}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          {/* Skew Controls */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-300 flex items-center">
              <Italic className="w-3 h-3 mr-1" />
              Skew
            </Label>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">X</Label>
                  <Input
                    type="number"
                    value={skewX}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      const delta = value - skewX;
                      setSkewX(value);
                      onSkewBy(delta, 0);
                    }}
                    className="h-5 w-16 text-xs bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <Slider
                  value={[skewX]}
                  onValueChange={([value]) => {
                    const delta = value - skewX;
                    setSkewX(value);
                    onSkewBy(delta, 0);
                  }}
                  min={-45}
                  max={45}
                  step={1}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex justify-between">
                  <Label className="text-xs text-slate-400">Y</Label>
                  <Input
                    type="number"
                    value={skewY}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      const delta = value - skewY;
                      setSkewY(value);
                      onSkewBy(0, delta);
                    }}
                    className="h-5 w-16 text-xs bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <Slider
                  value={[skewY]}
                  onValueChange={([value]) => {
                    const delta = value - skewY;
                    setSkewY(value);
                    onSkewBy(0, delta);
                  }}
                  min={-45}
                  max={45}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
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

  const ArtboardContent = () => {
    const [selectedCategory, setSelectedCategory] = useState<string>('social');
    const [customWidth, setCustomWidth] = useState(1080);
    const [customHeight, setCustomHeight] = useState(1080);

    const categorizedPresets = useMemo(() => {
      return ARTBOARD_PRESETS.reduce((acc, preset) => {
        if (!acc[preset.category]) {
          acc[preset.category] = [];
        }
        acc[preset.category].push(preset);
        return acc;
      }, {} as Record<string, ArtboardPreset[]>);
    }, []);

    const categories = [
      { key: 'social', label: 'Social Media', icon: '📱' },
      { key: 'print', label: 'Print', icon: '🖨️' },
      { key: 'web', label: 'Web', icon: '🌐' },
      { key: 'tv', label: 'TV/Display', icon: '📺' },
      { key: 'mobile', label: 'Mobile', icon: '📱' }
    ];

    return (
      <div className="space-y-4">
        {/* Current Artboards */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Current Artboards</Label>
          {artboards.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-4 border border-slate-700 rounded bg-slate-800/50">
              No artboards yet. Add one below.
            </div>
          ) : (
            <div className="space-y-1">
              {artboards.map((artboard) => (
                <div 
                  key={artboard.id}
                  className={`p-2 rounded border cursor-pointer transition-colors ${
                    artboard.id === activeArtboard 
                      ? 'border-cyan-500 bg-cyan-900/30' 
                      : 'border-slate-600 bg-slate-800/50 hover:bg-slate-700/50'
                  }`}
                  onClick={() => onSelectArtboard(artboard.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-slate-200">{artboard.name}</div>
                      <div className="text-xs text-slate-400">{artboard.width} × {artboard.height}</div>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteArtboard(artboard.id);
                      }}
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
          )}
        </div>

        <Separator className="bg-slate-700" />

        {/* Add New Artboard */}
        <div className="space-y-3">
          <Label className="text-xs text-slate-400">Add New Artboard</Label>

          {/* Category Selection */}
          <div className="grid grid-cols-2 gap-1">
            {categories.map((category) => (
              <Button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                variant={selectedCategory === category.key ? 'default' : 'secondary'}
                size="sm"
                className={`text-xs ${
                  selectedCategory === category.key
                    ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {category.label}
              </Button>
            ))}
          </div>

          {/* Preset Selection */}
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {categorizedPresets[selectedCategory]?.map((preset) => (
              <Button
                key={preset.name}
                onClick={() => onAddArtboard(preset)}
                variant="ghost"
                className="w-full justify-start text-xs p-2 h-auto bg-slate-800/50 hover:bg-slate-700 text-slate-300 border border-slate-600"
              >
                <div className="text-left">
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-slate-400 text-xs">
                    {preset.width} × {preset.height}
                    {preset.description && ` • ${preset.description}`}
                  </div>
                </div>
              </Button>
            )) || []}
          </div>

          {/* Custom Size */}
          <div className="space-y-2 pt-2 border-t border-slate-700">
            <Label className="text-xs text-slate-400">Custom Size</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(parseInt(e.target.value) || 1080)}
                  placeholder="Width"
                  className="h-8 text-xs bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div>
                <Input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(parseInt(e.target.value) || 1080)}
                  placeholder="Height"
                  className="h-8 text-xs bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>
            <Button
              onClick={() => onAddArtboard({
                name: `Custom ${customWidth}×${customHeight}`,
                width: customWidth,
                height: customHeight,
                category: 'custom'
              })}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
              size="sm"
            >
              Add Custom Artboard
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Shape Properties Panel Component
  function ShapePropertiesPanel({ selectedShapes, selectedGroups, selectedCount }: {
    selectedShapes: Shape[];
    selectedGroups: ShapeGroupClass[];
    selectedCount: number;
  }) {
    const firstSelectedShape = selectedShapes[0] || selectedGroups[0]?.shapes[0];

    // Helper function to convert HSL to hex for color input
    const hslToHex = (hslString: string): string => {
      if (hslString.startsWith('#')) return hslString;
      const match = hslString.match(/hsl\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)%,\s*(\d+(?:\.\d+)?)%\)/);
      if (!match) return '#3B82F6';

      const h = parseFloat(match[1]) / 360;
      const s = parseFloat(match[2]) / 100;
      const l = parseFloat(match[3]) / 100;

      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs((h * 6) % 2 - 1));
      const m = l - c / 2;
      let r, g, b;

      if (0 <= h && h < 1/6) [r, g, b] = [c, x, 0];
      else if (1/6 <= h && h < 2/6) [r, g, b] = [x, c, 0];
      else if (2/6 <= h && h < 3/6) [r, g, b] = [0, c, x];
      else if (3/6 <= h && h < 4/6) [r, g, b] = [0, x, c];
      else if (4/6 <= h && h < 5/6) [r, g, b] = [x, 0, c];
      else [r, g, b] = [c, 0, x];

      r = Math.round((r + m) * 255);
      g = Math.round((g + m) * 255);
      b = Math.round((b + m) * 255);

      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    };

    // Helper function to convert hex to HSL
    const hexToHsl = (hex: string): string => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const diff = max - min;
      const sum = max + min;
      const l = sum / 2;

      if (diff === 0) return `hsl(0, 0%, ${Math.round(l * 100)}%)`;

      const s = l > 0.5 ? diff / (2 - sum) : diff / sum;

      let h;
      if (max === r) h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / diff + 2) / 6;
      else h = ((r - g) / diff + 4) / 6;

      return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
    };

    const updateShapeProperty = useCallback((updater: (shape: Shape) => void) => {
    const updated = [...selectedShapes];
    updated.forEach(updater);
    if (onShapeUpdate) {
      onShapeUpdate();
    }
  }, [selectedShapes, onShapeUpdate]);

  // Helper function to get minimum points for each shape type
  const getMinPointsForShape = (shapeType: string): number => {
    switch (shapeType) {
      case 'line': return 2;
      case 'bezier':
      case 'quadratic': return 3;
      case 'cubic': return 4;
      case 'blob': return 3;
      default: return 2;
    }
  };

  // Helper function to add a point to a shape by interpolating
  const addPointToShape = (shape: Shape) => {
    if (!shape.points || shape.points.length < 2) return;

    // Find the longest segment to split
    let longestSegmentIndex = 0;
    let longestDistance = 0;

    for (let i = 0; i < shape.points.length - 1; i++) {
      const p1 = shape.points[i];
      const p2 = shape.points[i + 1];
      const distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

      if (distance > longestDistance) {
        longestDistance = distance;
        longestSegmentIndex = i;
      }
    }

    // Insert new point at midpoint of longest segment
    const p1 = shape.points[longestSegmentIndex];
    const p2 = shape.points[longestSegmentIndex + 1];
    const newPoint = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    };

    shape.points.splice(longestSegmentIndex + 1, 0, newPoint);
  };

  // Helper functions to regenerate shape points
  const regeneratePolygonPoints = (shape: Shape) => {
    if (!shape.sides || !shape.radius) return;

    shape.points = [];
    for (let i = 0; i < shape.sides; i++) {
      const angle = (i / shape.sides) * Math.PI * 2 - Math.PI / 2;
      shape.points.push({
        x: Math.cos(angle) * shape.radius,
        y: Math.sin(angle) * shape.radius
      });
    }
  };

  const regenerateStarPoints = (shape: Shape) => {
    if (!shape.sides || !shape.radius || !shape.innerRadius) return;

    shape.points = [];
    for (let i = 0; i < shape.sides * 2; i++) {
      const angle = (i / (shape.sides * 2)) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? shape.radius : shape.innerRadius;
      shape.points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
    }
  };

    const addGradientStop = () => {
      if (!firstSelectedShape?.properties.gradient) return;
      const newStop = {
        offset: 0.5,
        color: 'hsl(200, 50%, 50%)'
      };
      updateShapeProperty(shape => {
        if (shape.properties.gradient) {
          shape.properties.gradient.stops.push(newStop);
          shape.properties.gradient.stops.sort((a, b) => a.offset - b.offset);
        }
      });
    };

    const removeGradientStop = (index: number) => {
      if (!firstSelectedShape?.properties.gradient || firstSelectedShape.properties.gradient.stops.length <= 2) return;
      updateShapeProperty(shape => {
        if (shape.properties.gradient && shape.properties.gradient.stops.length > 2) {
          shape.properties.gradient.stops.splice(index, 1);
        }
      });
    };

    const updateGradientStop = (index: number, field: 'offset' | 'color', value: number | string) => {
      updateShapeProperty(shape => {
        if (shape.properties.gradient && shape.properties.gradient.stops[index]) {
          if (field === 'offset') {
            shape.properties.gradient.stops[index].offset = Math.max(0, Math.min(1, value as number));
          } else {
            shape.properties.gradient.stops[index].color = value as string;
          }
          shape.properties.gradient.stops.sort((a, b) => a.offset - b.offset);
        }
      });
    };

    return (
      <div className="space-y-3 border-t border-slate-600 pt-3 max-h-96 overflow-y-auto">
        <Label className="text-xs text-slate-300 font-semibold">Shape Properties</Label>
        {!firstSelectedShape ? (
          <div className="text-xs text-slate-400">
            {selectedCount} shape{selectedCount > 1 ? 's' : ''} selected
          </div>
        ) : (
          <div className="space-y-4">
            {/* Fill Properties */}
            <div className="space-y-3">
              <Label className="text-xs text-slate-400 font-medium">Fill</Label>

              {/* Fill Type Toggle */}
              <div className="flex items-center space-x-2">
                <Button
                  variant={!firstSelectedShape.properties.gradient ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateShapeProperty(shape => { shape.properties.gradient = undefined; })}
                  className={`h-7 px-3 text-xs ${
                    !firstSelectedShape.properties.gradient 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
                  }`}
                >
                  Color
                </Button>
                <Button
                  variant={firstSelectedShape.properties.gradient ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateShapeProperty(shape => {
                    if (!shape.properties.gradient) {
                      shape.properties.gradient = {
                        type: 'linear',
                        stops: [
                          { offset: 0, color: shape.properties.fillColor },
                          { offset: 1, color: 'hsl(200, 50%, 50%)' }
                        ]
                      };
                    }
                  })}
                  className={`h-7 px-3 text-xs ${
                    firstSelectedShape.properties.gradient 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
                  }`}
                >
                  Gradient
                </Button>
              </div>

              {!firstSelectedShape.properties.gradient ? (
                /* Solid Color Fill */
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label className="text-xs text-slate-400 w-12">Color:</Label>
                    <Input
                      type="color"
                      value={hslToHex(firstSelectedShape.properties.fillColor)}
                      onChange={(e) => updateShapeProperty(shape => {
                        shape.properties.fillColor = hexToHsl(e.target.value);
                      })}
                      className="h-8 w-16 p-1 border-slate-600 bg-slate-800"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label className="text-xs text-slate-400 w-12">Opacity:</Label>
                    <Slider
                      value={[firstSelectedShape.properties.fillOpacity]}
                      onValueChange={([value]) => updateShapeProperty(shape => {
                        shape.properties.fillOpacity = value;
                      })}
                      min={0}
                      max={1}
                      step={0.01}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={Math.round(firstSelectedShape.properties.fillOpacity * 100)}
                      onChange={(e) => updateShapeProperty(shape => {
                        shape.properties.fillOpacity = Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) / 100;
                      })}
                      min={0}
                      max={100}
                      className="h-6 w-12 text-xs bg-slate-800 border-slate-600 text-white"
                    />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
              ) : (
                /* Gradient Fill */
                <div className="space-y-3">
                  {/* Gradient Type */}
                  <div className="flex items-center space-x-2">
                    <Label className="text-xs text-slate-400 w-12">Type:</Label>
                    <Select
                      value={firstSelectedShape.properties.gradient.type}
                      onValueChange={(value: 'linear' | 'radial') => updateShapeProperty(shape => {
                        if (shape.properties.gradient) {
                          shape.properties.gradient.type = value;
                        }
                      })}
                    >
                      <SelectTrigger className="h-6 text-xs bg-slate-800 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="linear">Linear</SelectItem>
                        <SelectItem value="radial">Radial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Gradient Stops */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-400">Gradient Stops</Label>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={addGradientStop}
                        className="h-5 px-2 text-xs bg-slate-700 hover:bg-slate-600"
                      >
                        + Add
                      </Button>
                    </div>

                    {firstSelectedShape.properties.gradient.stops.map((stop, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-slate-800/50 rounded">
                        <Input
                          type="color"
                          value={hslToHex(stop.color)}
                          onChange={(e) => updateGradientStop(index, 'color', hexToHsl(e.target.value))}
                          className="h-6 w-12 p-0 border-slate-600"
                        />
                        <Input
                          type="number"
                          value={Math.round(stop.offset * 100)}
                          onChange={(e) => updateGradientStop(index, 'offset', (parseInt(e.target.value) || 0) / 100)}
                          min={0}
                          max={100}
                          className="h-6 w-12 text-xs bg-slate-800 border-slate-600 text-white"
                        />
                        <span className="text-xs text-slate-400">%</span>
                        {firstSelectedShape.properties.gradient && firstSelectedShape.properties.gradient.stops.length > 2 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeGradientStop(index)}
                            className="h-6 w-6 p-0"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Fill Opacity for gradients */}
                  <div className="flex items-center space-x-2">
                    <Label className="text-xs text-slate-400 w-12">Opacity:</Label>
                    <Slider
                      value={[firstSelectedShape.properties.fillOpacity]}
                      onValueChange={([value]) => updateShapeProperty(shape => {
                        shape.properties.fillOpacity = value;
                      })}
                      min={0}
                      max={1}
                      step={0.01}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={Math.round(firstSelectedShape.properties.fillOpacity * 100)}
                      onChange={(e) => updateShapeProperty(shape => {
                        shape.properties.fillOpacity = Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) / 100;
                      })}
                      min={0}
                      max={100}
                      className="h-6 w-12 text-xs bg-slate-800 border-slate-600 text-white"
                    />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Stroke Properties */}
            <div className="space-y-3">
              <Label className="text-xs text-slate-400 font-medium">Stroke</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Label className="text-xs text-slate-400 w-12">Color:</Label>
                  <Input
                    type="color"
                    value={hslToHex(firstSelectedShape.properties.strokeColor)}
                    onChange={(e) => updateShapeProperty(shape => {
                      shape.properties.strokeColor = hexToHsl(e.target.value);
                    })}
                    className="h-8 w-16 p-1 border-slate-600 bg-slate-800"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Label className="text-xs text-slate-400 w-12">Width:</Label>
                  <Slider
                    value={[firstSelectedShape.properties.strokeWidth]}
                    onValueChange={([value]) => updateShapeProperty(shape => {
                      shape.properties.strokeWidth = value;
                    })}
                    min={0}
                    max={20}
                    step={0.1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={firstSelectedShape.properties.strokeWidth.toFixed(1)}
                    onChange={(e) => updateShapeProperty(shape => {
                      shape.properties.strokeWidth = Math.max(0, parseFloat(e.target.value) || 0);
                    })}
                    min={0}
                    max={20}
                    step={0.1}
                    className="h-6 w-16 text-xs bg-slate-800 border-slate-600 text-white"
                  />
                  <span className="text-xs text-slate-400">px</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Label className="text-xs text-slate-400 w-12">Opacity:</Label>
                  <Slider
                    value={[firstSelectedShape.properties.strokeOpacity]}
                    onValueChange={([value]) => updateShapeProperty(shape => {
                      shape.properties.strokeOpacity = value;
                    })}
                    min={0}
                    max={1}
                    step={0.01}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={Math.round(firstSelectedShape.properties.strokeOpacity * 100)}
                    onChange={(e) => updateShapeProperty(shape => {
                      shape.properties.strokeOpacity = Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) / 100;
                    })}
                    min={0}
                    max={100}
                    className="h-6 w-12 text-xs bg-slate-800 border-slate-600 text-white"
                  />
                  <span className="text-xs text-slate-400">%</span>
                </div>
              </div>
            </div>

            {/* Points Management for Editable Shapes */}
            {(firstSelectedShape.type === 'line' || firstSelectedShape.type === 'bezier' || firstSelectedShape.type === 'cubic' || firstSelectedShape.type === 'blob') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-400">Points ({firstSelectedShape.points?.length || 0})</Label>
                  <div className="flex space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateShapeProperty(shape => {
                          if (shape.points && shape.points.length > getMinPointsForShape(shape.type)) {
                            // Remove last point
                            shape.points.pop();
                          }
                        });
                      }}
                      disabled={!firstSelectedShape.points || firstSelectedShape.points.length <= getMinPointsForShape(firstSelectedShape.type)}
                      className="h-6 w-6 p-0 bg-slate-800 hover:bg-slate-700 border-slate-600"
                    >
                      <span className="text-xs">−</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateShapeProperty(shape => {
                          if (shape.points && shape.points.length < 20) {
                            // Add new point by interpolating between existing points
                            addPointToShape(shape);
                          }
                        });
                      }}
                      disabled={!firstSelectedShape.points || firstSelectedShape.points.length >= 20}
                      className="h-6 w-6 p-0 bg-slate-800 hover:bg-slate-700 border-slate-600"
                    >
                      <span className="text-xs">+</span>
                    </Button>
                  </div>
                </div>

                <div className="max-h-32 overflow-y-auto space-y-2">
                  {firstSelectedShape.points?.map((point, index) => (
                    <div key={index} className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-400 w-4">{index}</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-400 w-2">X:</span>
                        <Input
                          type="number"
                          value={Math.round(point.x * 10) / 10}
                          onChange={(e) => {
                            const newX = parseFloat(e.target.value) || 0;
                            updateShapeProperty(shape => {
                              if (shape.points && shape.points[index]) {
                                shape.points[index].x = newX;
                              }
                            });
                          }}
                          className="h-5 w-12 text-xs bg-slate-800 border-slate-600 text-white p-1"
                          step={0.1}
                        />
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-400 w-2">Y:</span>
                        <Input
                          type="number"
                          value={Math.round(point.y * 10) / 10}
                          onChange={(e) => {
                            const newY = parseFloat(e.target.value) || 0;
                            updateShapeProperty(shape => {
                              if (shape.points && shape.points[index]) {
                                shape.points[index].y = newY;
                              }
                            });
                          }}
                          className="h-5 w-12 text-xs bg-slate-800 border-slate-600 text-white p-1"
                          step={0.1}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Closed/Open toggle for spline curves */}
                {(firstSelectedShape.type === 'bezier' || firstSelectedShape.type === 'cubic') && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                    <Label className="text-xs text-slate-300">Closed Curve</Label>
                    <Switch
                      checked={firstSelectedShape.closed || false}
                      onCheckedChange={(checked) => {
                        updateShapeProperty(shape => {
                          if (shape.type === 'bezier' || shape.type === 'cubic') {
                            shape.closed = checked;
                          }
                        });
                      }}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Shape-specific Properties */}
            {(firstSelectedShape.type === 'polygon' || firstSelectedShape.type === 'star') && (
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Sides</Label>
                <div className="flex items-center space-x-2">
                  <Slider
                    value={[firstSelectedShape.sides || 6]}
                    onValueChange={([value]) => {
                      updateShapeProperty(shape => {
                        if (shape.type === 'polygon' || shape.type === 'star') {
                          shape.sides = value;
                          // Regenerate points when sides change
                          if (shape.type === 'polygon') {
                            regeneratePolygonPoints(shape);
                          } else if (shape.type === 'star') {
                            regenerateStarPoints(shape);
                          }
                        }
                      });
                    }}
                    min={3}
                    max={20}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={firstSelectedShape.sides || 6}
                    onChange={(e) => {
                      const newSides = Math.max(3, Math.min(20, parseInt(e.target.value) || 6));
                      updateShapeProperty(shape => {
                        if (shape.type === 'polygon' || shape.type === 'star') {
                          shape.sides = newSides;
                          // Regenerate points when sides change
                          if (shape.type === 'polygon') {
                            regeneratePolygonPoints(shape);
                          } else if (shape.type === 'star') {
                            regenerateStarPoints(shape);
                          }
                        }
                      });
                    }}
                    min={3}
                    max={20}
                    className="h-6 w-16 text-xs bg-slate-800 border-slate-600 text-white"
                  />
                  <span className="text-xs text-slate-400">sides</span>
                </div>
              </div>
            )}

            {firstSelectedShape.type === 'circle' && (
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Radius</Label>
                <div className="flex items-center space-x-2">
                  <Slider
                    value={[firstSelectedShape.radius || 50]}
                    onValueChange={([value]) => {
                      updateShapeProperty(shape => {
                        if (shape.type === 'circle') {
                          shape.radius = value;
                        }
                      });
                    }}
                    min={1}
                    max={200}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={Math.round(firstSelectedShape.radius || 0)}
                    onChange={(e) => {
                      const newRadius = Math.max(1, parseFloat(e.target.value) || 0);
                      updateShapeProperty(shape => {
                        if (shape.type === 'circle') {
                          shape.radius = newRadius;
                        }
                      });
                    }}
                    min={1}
                    className="h-6 w-16 text-xs bg-slate-800 border-slate-600 text-white"
                  />
                  <span className="text-xs text-slate-400">px</span>
                </div>
              </div>
            )}

            {firstSelectedShape.type === 'ring' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Outer Radius</Label>
                  <div className="flex items-center space-x-2">
                    <Slider
                      value={[firstSelectedShape.radius || 50]}
                      onValueChange={([value]) => {
                        updateShapeProperty(shape => {
                          if (shape.type === 'ring') {
                            shape.radius = value;
                            // Ensure inner radius doesn't exceed outer radius
                            if (shape.innerRadius && shape.innerRadius >= value) {
                              shape.innerRadius = value * 0.5;
                            }
                          }
                        });
                      }}
                      min={1}
                      max={200}
                      step={1}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={Math.round(firstSelectedShape.radius || 0)}
                      onChange={(e) => {
                        const newRadius = Math.max(1, parseFloat(e.target.value) || 0);
                        updateShapeProperty(shape => {
                          if (shape.type === 'ring') {
                            shape.radius = newRadius;
                            // Ensure inner radius doesn't exceed outer radius
                            if (shape.innerRadius && shape.innerRadius >= newRadius) {
                              shape.innerRadius = newRadius * 0.5;
                            }
                          }
                        });
                      }}
                      min={1}
                      className="h-6 w-16 text-xs bg-slate-800 border-slate-600 text-white"
                    />
                    <span className="text-xs text-slate-400">px</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Inner Radius</Label>
                  <div className="flex items-center space-x-2">
                    <Slider
                      value={[firstSelectedShape.innerRadius || 25]}
                      onValueChange={([value]) => {
                        updateShapeProperty(shape => {
                          if (shape.type === 'ring') {
                            // Ensure inner radius doesn't exceed outer radius
                            const maxInner = (shape.radius || 50) - 1;
                            shape.innerRadius = Math.min(value, maxInner);
                          }
                        });
                      }}
                      min={0}
                      max={(firstSelectedShape.radius || 50) - 1}
                      step={1}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={Math.round(firstSelectedShape.innerRadius || 0)}
                      onChange={(e) => {
                        const newInnerRadius = Math.max(0, parseFloat(e.target.value) || 0);
                        updateShapeProperty(shape => {
                          if (shape.type === 'ring') {
                            // Ensure inner radius doesn't exceed outer radius
                            const maxInner = (shape.radius || 50) - 1;
                            shape.innerRadius = Math.min(newInnerRadius, maxInner);
                          }
                        });
                      }}
                      min={0}
                      max={(firstSelectedShape.radius || 50) - 1}
                      className="h-6 w-16 text-xs bg-slate-800 border-slate-600 text-white"
                    />
                    <span className="text-xs text-slate-400">px</span>
                  </div>
                </div>
              </div>
            )}

            {firstSelectedShape.type === 'star' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Outer Radius</Label>
                  <div className="flex items-center space-x-2">
                    <Slider
                      value={[firstSelectedShape.radius || 50]}
                      onValueChange={([value]) => {
                        updateShapeProperty(shape => {
                          if (shape.type === 'star') {
                            shape.radius = value;
                            // Ensure inner radius doesn't exceed outer radius
                            if (shape.innerRadius && shape.innerRadius >= value) {
                              shape.innerRadius = value * 0.5;
                            }
                          }
                        });
                      }}
                      min={1}
                      max={200}
                      step={1}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={Math.round(firstSelectedShape.radius || 0)}
                      onChange={(e) => {
                        const newRadius = Math.max(1, parseFloat(e.target.value) || 0);
                        updateShapeProperty(shape => {
                          if (shape.type === 'star') {
                            shape.radius = newRadius;
                            // Ensure inner radius doesn't exceed outer radius
                            if (shape.innerRadius && shape.innerRadius >= newRadius) {
                              shape.innerRadius = newRadius * 0.5;
                            }
                          }
                        });
                      }}
                      min={1}
                      className="h-6 w-16 text-xs bg-slate-800 border-slate-600 text-white"
                    />
                    <span className="text-xs text-slate-400">px</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Inner Radius</Label>
                  <div className="flex items-center space-x-2">
                    <Slider
                      value={[firstSelectedShape.innerRadius || 25]}
                      onValueChange={([value]) => {
                        updateShapeProperty(shape => {
                          if (shape.type === 'star') {
                            // Ensure inner radius doesn't exceed outer radius
                            const maxInner = (shape.radius || 50) - 1;
                            shape.innerRadius = Math.min(value, maxInner);
                          }
                        });
                      }}
                      min={1}
                      max={(firstSelectedShape.radius || 50) - 1}
                      step={1}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={Math.round(firstSelectedShape.innerRadius || 0)}
                      onChange={(e) => {
                        const newInnerRadius = Math.max(1, parseFloat(e.target.value) || 0);
                        updateShapeProperty(shape => {
                          if (shape.type === 'star') {
                            // Ensure inner radius doesn't exceed outer radius
                            const maxInner = (shape.radius || 50) - 1;
                            shape.innerRadius = Math.min(newInnerRadius, maxInner);
                          }
                        });
                      }}
                      min={1}
                      max={(firstSelectedShape.radius || 50) - 1}
                      className="h-6 w-16 text-xs bg-slate-800 border-slate-600 text-white"
                    />
                    <span className="text-xs text-slate-400">px</span>
                  </div>
                </div>
              </div>
            )}

            {/* Dimensions for rectangles and ellipses */}
            {(firstSelectedShape.type === 'rectangle' || firstSelectedShape.type === 'square' || firstSelectedShape.type === 'ellipse') && (
              <div className="space-y-3">
                <Label className="text-xs text-slate-400">Dimensions</Label>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-400">Width</Label>
                    <div className="flex items-center space-x-2">
                      <Slider
                        value={[firstSelectedShape.width || 100]}
                        onValueChange={([value]) => {
                          updateShapeProperty(shape => {
                            if (shape.type === 'rectangle' || shape.type === 'square' || shape.type === 'ellipse') {
                              shape.width = value;
                              if (shape.type === 'square') {
                                shape.height = value;
                              }
                            }
                          });
                        }}
                        min={1}
                        max={400}
                        step={1}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={Math.round(firstSelectedShape.width || 0)}
                        onChange={(e) => {
                          const newWidth = Math.max(1, parseFloat(e.target.value) || 0);
                          updateShapeProperty(shape => {
                            if (shape.type === 'rectangle' || shape.type === 'square' || shape.type === 'ellipse') {
                              shape.width = newWidth;
                              if (shape.type === 'square') {
                                shape.height = newWidth;
                              }
                            }
                          });
                        }}
                        min={1}
                        className="h-6 w-16 text-xs bg-slate-800 border-slate-600 text-white"
                      />
                      <span className="text-xs text-slate-400">px</span>
                    </div>
                  </div>
                  {firstSelectedShape.type !== 'square' && (
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Height</Label>
                      <div className="flex items-center space-x-2">
                        <Slider
                          value={[firstSelectedShape.height || 100]}
                          onValueChange={([value]) => {
                            updateShapeProperty(shape => {
                              if (shape.type === 'rectangle' || shape.type === 'ellipse') {
                                shape.height = value;
                              }
                            });
                          }}
                          min={1}
                          max={400}
                          step={1}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={Math.round(firstSelectedShape.height || 0)}
                          onChange={(e) => {
                            const newHeight = Math.max(1, parseFloat(e.target.value) || 0);
                            updateShapeProperty(shape => {
                              if (shape.type === 'rectangle' || shape.type === 'ellipse') {
                                shape.height = newHeight;
                              }
                            });
                          }}
                          min={1}
                          className="h-6 w-16 text-xs bg-slate-800 border-slate-600 text-white"
                        />
                        <span className="text-xs text-slate-400">px</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Shape Type and ID Info */}
            <div className="border-t border-slate-600 pt-2 mt-2">
              <div className="text-xs text-slate-400 space-y-1">
                <div>Type: <span className="text-slate-300">{firstSelectedShape.type}</span></div>
                <div>ID: <span className="text-slate-300 font-mono">{firstSelectedShape.id.slice(-8)}</span></div>
                <div>Position: <span className="text-slate-300">
                  ({Math.round(firstSelectedShape.transform.x)}, {Math.round(firstSelectedShape.transform.y)})
                </span></div>
              </div>
            </div>

            {/* Delete Button */}
            <div className="mt-4 pt-3 border-t border-slate-600">
              <Button 
                onClick={onDeleteSelected}
                variant="destructive"
                size="sm"
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

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
              value={[scatterSettings.minCount, scatterSettings.maxCount]}
              onValueChange={([min, max]) => onUpdateScatterSettings({ minCount: min, maxCount: max })}
              min={1}
              max={50}
              step={1}
              className="w-full"
              minStepsBetweenThumbs={1}
            />
            <div className="flex justify-between items-center">
              <Input
                type="number"
                value={scatterSettings.minCount}
                onChange={(e) => {
                  const value = Math.max(1, Math.min(Number(e.target.value), scatterSettings.maxCount - 1));
                  onUpdateScatterSettings({ minCount: value });
                }}
                className="h-6 w-12 text-xs bg-slate-800 border-slate-600 text-white"
                min={1}
                max={scatterSettings.maxCount - 1}
              />
              <span className="text-xs text-slate-400 px-2">to</span>
              <Input
                type="number"
                value={scatterSettings.maxCount}
                onChange={(e) => {
                  const value = Math.max(scatterSettings.minCount + 1, Math.min(Number(e.target.value), 50));
                  onUpdateScatterSettings({ maxCount: value });
                }}
                className="h-6 w-12 text-xs bg-slate-800 border-slate-600 text-white"
                min={scatterSettings.minCount + 1}
                max={50}
              />
            </div>
            <span className="text-xs text-slate-400 text-center">{scatterSettings.minCount}-{scatterSettings.maxCount} shapes per generation</span>
          </div>
        </div>

        {/* Smart Distribution Controls */}
        <div className="space-y-3 mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <Label className="text-xs text-blue-200 font-medium">Smart Distribution</Label>

          {/* Pattern Selection */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Pattern</Label>
            <Select
              value={scatterSettings.distribution.pattern}
              onValueChange={(value) => onUpdateScatterSettings({ 
                distribution: { ...scatterSettings.distribution, pattern: value as any }
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

          {/* Distribution Parameters */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Spacing</Label>
              <Slider
                value={[scatterSettings.distribution.spacing]}
                onValueChange={([value]) => onUpdateScatterSettings({ 
                  distribution: { ...scatterSettings.distribution, spacing: value }
                })}
                min={10}
                max={200}
                step={5}
                className="w-full"
              />
              <span className="text-xs text-slate-500">{scatterSettings.distribution.spacing}px</span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Randomness</Label>
              <Slider
                value={[scatterSettings.distribution.randomness]}
                onValueChange={([value]) => onUpdateScatterSettings({ 
                  distribution: { ...scatterSettings.distribution, randomness: value }
                })}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
              <span className="text-xs text-slate-500">{Math.round(scatterSettings.distribution.randomness * 100)}%</span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Scale</Label>
              <Slider
                value={[scatterSettings.distribution.scale]}
                onValueChange={([value]) => onUpdateScatterSettings({ 
                  distribution: { ...scatterSettings.distribution, scale: value }
                })}
                min={0.1}
                max={3}
                step={0.1}
                className="w-full"
              />
              <span className="text-xs text-slate-500">{scatterSettings.distribution.scale.toFixed(1)}x</span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Density</Label>
              <Slider
                value={[scatterSettings.distribution.density]}
                onValueChange={([value]) => onUpdateScatterSettings({ 
                  distribution: { ...scatterSettings.distribution, density: value }
                })}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
              <span className="text-xs text-slate-500">{Math.round(scatterSettings.distribution.density * 100)}%</span>
            </div>
          </div>

          {/* Rotation Control */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Rotation</Label>
            <Slider
              value={[scatterSettings.distribution.rotation]}
              onValueChange={([value]) => onUpdateScatterSettings({ 
                distribution: { ...scatterSettings.distribution, rotation: value }
              })}
              min={0}
              max={Math.PI * 2}
              step={0.1}
              className="w-full"
            />
            <span className="text-xs text-slate-500">{Math.round(scatterSettings.distribution.rotation * 180 / Math.PI)}°</span>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={scatterSettings.distribution.avoidOverlap}
                onCheckedChange={(checked) => onUpdateScatterSettings({ 
                  distribution: { ...scatterSettings.distribution, avoidOverlap: checked === true }
                })}
                className="border-slate-600"
              />
              <Label className="text-xs text-slate-400">Avoid Overlap</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={scatterSettings.distribution.respectBounds}
                onCheckedChange={(checked) => onUpdateScatterSettings({ 
                  distribution: { ...scatterSettings.distribution, respectBounds: checked === true }
                })}
                className="border-slate-600"
              />
              <Label className="text-xs text-slate-400">Respect Bounds</Label>
            </div>
          </div>

          {/* Distribute Button */}
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
    </div>
  );

  const PropertiesContent = () => (
    <div className="space-y-4">
      <div className="text-sm text-slate-400">
        Selected: <span className="text-white font-medium">{selectedCount}</span> {selectedCount === 1 ? 'shape' : 'shapes'}
      </div>

      {/* Shape Properties Panel */}
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

  const LayersContent = () => {
    const blendModes: BlendMode[] = [
      'source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
      'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference',
      'exclusion', 'hue', 'saturation', 'color', 'luminosity'
    ];

    // Get all shapes from props
    const sortedShapes = useMemo(() => {
      return (shapes || []).sort((a: Shape, b: Shape) => b.properties.zIndex - a.properties.zIndex);
    }, [shapes]);

    return (
      <div className="space-y-4">
        <div className="text-sm text-slate-400">
          Layers: <span className="text-white font-medium">{(shapes || []).length}</span> total
        </div>

        {/* Layer Ordering Controls */}
        {selectedCount > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Layer Order</Label>
            <div className="grid grid-cols-2 gap-1">
              <Button
                onClick={onBringToFront}
                variant="secondary"
                size="sm"
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200"
              >
                Bring to Front
              </Button>
              <Button
                onClick={onSendToBack}
                variant="secondary"
                size="sm"
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200"
              >
                Send to Back
              </Button>
              <Button
                onClick={onBringForward}
                variant="secondary"
                size="sm"
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200"
              >
                Bring Forward
              </Button>
              <Button
                onClick={onSendBackward}
                variant="secondary"
                size="sm"
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200"
              >
                Send Backward
              </Button>
            </div>
          </div>
        )}

        {/* Blend Mode Selection */}
        {selectedCount > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Blend Mode</Label>
            <Select
              value={selectedShapes[0]?.properties.blendMode || 'source-over'}
              onValueChange={(value: BlendMode) => onChangeBlendMode(value)}
            >
              <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {blendModes.map(mode => (
                  <SelectItem key={mode} value={mode} className="text-xs text-white hover:bg-slate-700 focus:bg-slate-700 data-[highlighted]:bg-slate-700 data-[highlighted]:text-white">
                    {mode.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Layers List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-400">All Layers</Label>
            {(shapes || []).length > 0 && onClearAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20"
              >
                Clear All
              </Button>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {sortedShapes.map((shape, index) => (
              <div
                key={shape.id}
                className={`p-2 rounded text-xs border transition-colors cursor-pointer ${
                  shape.selected 
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-200' 
                    : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50'
                }`}
                onClick={() => {
                  // Clear other selections first, then select this shape
                  shapes.forEach(s => s.selected = false);
                  shape.selected = true;
                  onShapeUpdate?.();
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-slate-400">#{index + 1}</span>
                    <span className="capitalize">{shape.type}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-400">{shape.properties.blendMode}</span>
                    <div 
                      className="w-3 h-3 rounded border border-slate-500"
                      style={{ backgroundColor: shape.properties.fillColor.includes('hsl') ? '#3B82F6' : shape.properties.fillColor }}
                    />
                  </div>
                </div>
                <div className="text-slate-400 mt-1">
                  Z: {shape.properties.zIndex.toFixed(1)} | Opacity: {Math.round(shape.properties.fillOpacity * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {(shapes || []).length === 0 && (
          <div className="text-xs text-slate-500 text-center py-4">
            No layers yet. Create some shapes to see them here.
          </div>
        )}
      </div>
    );
  };

  const BooleanOperationsContent = () => {
    const potentialTargets = selectedShapes.length === 1 
      ? shapes.filter(shape => shape.id !== selectedShapes[0].id)
      : [];

    return (
      <div className="space-y-4">
        {selectedShapes.length === 1 ? (
          <div className="space-y-3">
            <div className="text-sm text-slate-400">
              Apply boolean operation to: <span className="text-white font-medium">{selectedShapes[0].type}</span>
            </div>

            {/* Operation Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Operation Type</Label>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  onClick={() => setSelectedBooleanOp('union')}
                  variant={selectedBooleanOp === 'union' ? 'default' : 'secondary'}
                  size="sm"
                  className={`text-xs ${
                    selectedBooleanOp === 'union'
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Union
                </Button>
                <Button
                  onClick={() => setSelectedBooleanOp('subtract')}
                  variant={selectedBooleanOp === 'subtract' ? 'default' : 'secondary'}
                  size="sm"
                  className={`text-xs ${
                    selectedBooleanOp === 'subtract'
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <Minus className="w-3 h-3 mr-1" />
                  Subtract
                </Button>
                <Button
                  onClick={() => setSelectedBooleanOp('intersect')}
                  variant={selectedBooleanOp === 'intersect' ? 'default' : 'secondary'}
                  size="sm"
                  className={`text-xs ${
                    selectedBooleanOp === 'intersect'
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <GitMerge className="w-3 h-3 mr-1" />
                  Intersect
                </Button>
                <Button
                  onClick={() => setSelectedBooleanOp('exclude')}
                  variant={selectedBooleanOp === 'exclude' ? 'default' : 'secondary'}
                  size="sm"
                  className={`text-xs ${
                    selectedBooleanOp === 'exclude'
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <Scissors className="w-3 h-3 mr-1" />
                  Exclude
                </Button>
              </div>
            </div>

            {/* Target Selection */}
            {potentialTargets.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Target Shape</Label>
                <Select value={booleanTargetId} onValueChange={setBooleanTargetId}>
                  <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600">
                    <SelectValue placeholder="Select target shape" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {potentialTargets.map((shape, index) => (
                      <SelectItem 
                        key={shape.id} 
                        value={shape.id}
                        className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white"
                      >
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-2 h-2 rounded border border-slate-500"
                            style={{ backgroundColor: shape.properties.fillColor.includes('hsl') ? '#3B82F6' : shape.properties.fillColor }}
                          />
                          <span className="capitalize">{shape.type}</span>
                          <span className="text-slate-400">Layer {potentialTargets.length - index}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Apply Button */}
            <Button
              onClick={() => {
                if (booleanTargetId) {
                  onApplyBooleanOperation(selectedBooleanOp, booleanTargetId);
                }
              }}
              disabled={!booleanTargetId}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              size="sm"
            >
              Apply {selectedBooleanOp} Operation
            </Button>

            <div className="text-xs text-slate-500 bg-slate-800/50 p-2 rounded">
              💡 {selectedBooleanOp === 'union' ? 'Combines both shapes into one' : 
                  selectedBooleanOp === 'subtract' ? 'Removes target from source' :
                  selectedBooleanOp === 'intersect' ? 'Keeps only overlapping area' :
                  'Removes overlapping area from both shapes'}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 text-center py-4">
            Select exactly one shape to apply boolean operations
          </div>
        )}
      </div>
    );
  };

  const ColorManipulationContent = () => {
    // Real-time color manipulation using useEffect
    useEffect(() => {
      if (colorMode === 'shift' && (hueShift !== 0 || saturationShift !== 0 || lightnessShift !== 0)) {
        const manipulation = {
          mode: colorMode,
          hslShift: {
            hue: hueShift,
            saturation: saturationShift,
            lightness: lightnessShift,
            enabled: true
          },
          affectFill,
          affectStroke
        };
        onApplyColorManipulation(manipulation);
      }
    }, [hueShift, saturationShift, lightnessShift, affectFill, affectStroke, colorMode]);

    return (
      <div className="space-y-4">
        <div className="text-sm text-slate-400">
          {selectedShapes.length > 0 
            ? `Apply to ${selectedShapes.length} selected shape${selectedShapes.length === 1 ? '' : 's'}`
            : "Apply to all shapes"
          }
        </div>

        {/* Mode Selection */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Mode</Label>
          <div className="grid grid-cols-2 gap-1">
            <Button
              onClick={() => setColorMode('shift')}
              variant={colorMode === 'shift' ? 'default' : 'secondary'}
              size="sm"
              className={`text-xs ${
                colorMode === 'shift'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Shuffle className="w-3 h-3 mr-1" />
              HSL Shift
            </Button>
            <Button
              onClick={() => setColorMode('remap')}
              variant={colorMode === 'remap' ? 'default' : 'secondary'}
              size="sm"
              className={`text-xs ${
                colorMode === 'remap'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Pipette className="w-3 h-3 mr-1" />
              Color Remap
            </Button>
          </div>
        </div>

        {/* HSL Shift Controls */}
        {colorMode === 'shift' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Hue Shift</Label>
              <div className="flex items-center space-x-2">
                <Slider
                  value={[hueShift]}
                  onValueChange={([value]) => setHueShift(value)}
                  min={-180}
                  max={180}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-slate-400 w-8">{hueShift}°</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Saturation Shift</Label>
              <div className="flex items-center space-x-2">
                <Slider
                  value={[saturationShift]}
                  onValueChange={([value]) => setSaturationShift(value)}
                  min={-100}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-slate-400 w-8">{saturationShift}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Lightness Shift</Label>
              <div className="flex items-center space-x-2">
                <Slider
                  value={[lightnessShift]}
                  onValueChange={([value]) => setLightnessShift(value)}
                  min={-100}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs text-slate-400 w-8">{lightnessShift}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Color Remap Controls */}
        {colorMode === 'remap' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-500">
              Color remapping functionality coming soon
            </div>
          </div>
        )}

        {/* Affect Options */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Apply To</Label>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={affectFill}
                onCheckedChange={setAffectFill}
              />
              <Label className="text-xs text-slate-300">Fill</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={affectStroke}
                onCheckedChange={setAffectStroke}
              />
              <Label className="text-xs text-slate-300">Stroke</Label>
            </div>
          </div>
        </div>



        {/* Reset Button */}
        <Button
          onClick={() => {
            setHueShift(0);
            setSaturationShift(0);
            setLightnessShift(0);
          }}
          variant="outline"
          className="w-full bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300 text-xs"
          size="sm"
        >
          Reset Values
        </Button>
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className="w-16 bg-[var(--surface)] border-r border-slate-700 flex flex-col">
        {/* Collapsed Header - Hamburger Menu */}
        <div className="p-3 border-b border-slate-700 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(false)}
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 p-2 h-auto transition-colors"
          >
            <Menu className="w-5 h-5" />
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
                    : 'text-white hover:text-white hover:bg-slate-700 bg-slate-800 border-slate-600'
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
                    : 'text-white hover:text-white hover:bg-slate-700 bg-slate-800 border-slate-600'
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
                    ? 'bg-orange-500 text-white hover:bg-orange-600 border-orange-400' 
                    : 'text-white hover:text-white hover:bg-slate-700 bg-slate-800 border-slate-600'
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
                    ? 'bg-purple-500 text-white hover:bg-purple-600 border-purple-400' 
                    : 'text-white hover:text-white hover:bg-slate-700 bg-slate-800 border-slate-600'
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

          {/* Boolean Operations */}
          <Popover onOpenChange={(open) => setActivePopover(open ? 'boolean' : null)}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`p-3 h-auto mx-2 transition-colors border ${
                  activePopover === 'boolean' 
                    ? 'bg-indigo-500 text-white hover:bg-indigo-600 border-indigo-400' 
                    : 'text-white hover:text-white hover:bg-slate-700 bg-slate-800 border-slate-600'
                }`}
              >
                <GitMerge className="w-5 h-5" />
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
                  <GitMerge className="w-4 h-4 mr-2" />
                  Boolean Operations
                </h3>
                <BooleanOperationsContent />
              </div>
            </PopoverContent>
          </Popover>

          {/* Color Manipulation */}
          <Popover onOpenChange={(open) => setActivePopover(open ? 'color' : null)}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`p-3 h-auto mx-2 transition-colors border ${
                  activePopover === 'color' 
                    ? 'bg-amber-500 text-white hover:bg-amber-600 border-amber-400' 
                    : 'text-white hover:text-white hover:bg-slate-700 bg-slate-800 border-slate-600'
                }`}
              >
                <Pipette className="w-5 h-5" />
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
                  <Pipette className="w-4 h-4 mr-2" />
                  Color Manipulation
                </h3>
                <ColorManipulationContent />
              </div>
            </PopoverContent>
          </Popover>

          {/* Artboards */}
          <Popover onOpenChange={(open) => setActivePopover(open ? 'artboards' : null)}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`p-3 h-auto mx-2 transition-colors border ${
                  activePopover === 'artboards' 
                    ? 'bg-cyan-500 text-white hover:bg-cyan-600 border-cyan-400' 
                    : 'text-white hover:text-white hover:bg-slate-700 bg-slate-800 border-slate-600'
                }`}
              >
                <Square className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              className="w-80 bg-[var(--surface)] border-slate-700 max-h-[80vh] overflow-hidden"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-300 flex items-center">
                  <Square className="w-4 h-4 mr-2" />
                  Artboards
                </h3>
                <div className="overflow-y-auto max-h-[70vh] pr-2" style={{ scrollBehavior: 'smooth' }}>
                  <ArtboardContent />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Layers */}
          <Popover onOpenChange={(open) => setActivePopover(open ? 'layers' : null)}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`p-3 h-auto mx-2 transition-colors border ${
                  activePopover === 'layers' 
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-400' 
                    : 'text-white hover:text-white hover:bg-slate-700 bg-slate-800 border-slate-600'
                }`}
              >
                <Layers className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              className="w-80 bg-[var(--surface)] border-slate-700 max-h-[80vh] overflow-hidden"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-300 flex items-center">
                  <Layers className="w-4 h-4 mr-2" />
                  Layers
                </h3>
                <div className="overflow-y-auto max-h-[70vh] pr-2" style={{ scrollBehavior: 'smooth' }}>
                  <LayersContent />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-[var(--surface)] border-r border-slate-700 flex flex-col">
      {/* Collapse Button */}
      <div className="px-4 py-2 border-b border-slate-700 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(true)}
          className="text-slate-400 hover:text-white p-1 h-auto"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Accordion Sections */}
      <div className="flex-1 overflow-y-auto">
        <Accordion type="multiple" defaultValue={["shapes", "editmode", "transforms", "boolean", "color", "artboards", "layers"]} className="w-full">

          {/* Shape Types Section */}
          <AccordionItem value="shapes" className="border-b border-slate-700">
            <AccordionTrigger className="px-6 py-4 text-slate-300 hover:text-white hover:no-underline data-[state=open]:text-blue-300 data-[state=open]:bg-blue-900/20">
              <div className="flex items-center space-x-2">
                <Shapes className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold uppercase tracking-wide">Shape Types</span>
                <span className="ml-auto text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                  {enabledShapeTypes.size} enabled
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <ShapeTypesContent />
            </AccordionContent>
          </AccordionItem>

          {/* Edit Mode Section - Moved under Create */}
          <AccordionItem value="editmode" className="border-b border-slate-700">
            <AccordionTrigger className="px-6 py-4 text-slate-300 hover:text-white hover:no-underline data-[state=open]:text-green-300 data-[state=open]:bg-green-900/20">
              <div className="flex items-center space-x-2">
                <Settings className={`w-4 h-4 ${
                  editMode === 'shapes' ? 'text-blue-400' :
                  editMode === 'points' ? 'text-green-400' : 'text-purple-400'
                }`} />
                <span className="text-sm font-semibold uppercase tracking-wide">Edit Mode</span>
                <span className={`ml-auto text-xs px-2 py-1 rounded-full text-white ${
                  editMode === 'shapes' ? 'bg-blue-600' :
                  editMode === 'points' ? 'bg-green-600' : 'bg-purple-600'
                }`}>
                  {editMode}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <EditModeContent />
            </AccordionContent>
          </AccordionItem>

          {/* Transform Tools Section */}
          <AccordionItem value="transforms" className="border-b border-slate-700">
            <AccordionTrigger className="px-6 py-4 text-slate-300 hover:text-white hover:no-underline data-[state=open]:text-orange-300 data-[state=open]:bg-orange-900/20">
              <div className="flex items-center space-x-2">
                <Move className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-semibold uppercase tracking-wide">Transform Tools</span>
                {selectedCount > 0 && (
                  <span className="ml-auto text-xs bg-orange-600 text-white px-2 py-1 rounded-full">
                    {selectedCount} selected
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <TransformToolsContent />
            </AccordionContent>
          </AccordionItem>

          {/* Composition Section */}
          <AccordionItem value="composition" className="border-b border-slate-700">
            <AccordionTrigger className="px-6 py-4 text-slate-300 hover:text-white hover:no-underline data-[state=open]:text-purple-300 data-[state=open]:bg-purple-900/20">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold uppercase tracking-wide">Composition</span>
                {(scatterSettings.onPoints || scatterSettings.insideArea) && (
                  <span className="ml-auto text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                    scatter active
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <CompositionContent />
            </AccordionContent>
          </AccordionItem>

          {/* Artboards Section */}
          <AccordionItem value="artboards" className="border-b-0">
            <AccordionTrigger className="px-6 py-4 text-slate-300 hover:text-white hover:no-underline data-[state=open]:text-cyan-300 data-[state=open]:bg-cyan-900/20">
              <div className="flex items-center space-x-2">
                <Square className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold uppercase tracking-wide">Artboards</span>
                <span className="ml-auto text-xs bg-cyan-600 text-white px-2 py-1 rounded-full">
                  {artboards.length}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <ArtboardContent />
            </AccordionContent>
          </AccordionItem>

          {/* Boolean Operations Section */}
          <AccordionItem value="boolean" className="border-b border-slate-700">
            <AccordionTrigger className="px-6 py-4 text-slate-300 hover:text-white hover:no-underline data-[state=open]:text-indigo-300 data-[state=open]:bg-indigo-900/20">
              <div className="flex items-center space-x-2">
                <GitMerge className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold uppercase tracking-wide">Boolean Operations</span>
                <span className="ml-auto text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">
                  {selectedShapes.length === 1 ? 'Ready' : 'Select 1'}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <BooleanOperationsContent />
            </AccordionContent>
          </AccordionItem>

          {/* Color Manipulation Section */}
          <AccordionItem value="color" className="border-b border-slate-700">
            <AccordionTrigger className="px-6 py-4 text-slate-300 hover:text-white hover:no-underline data-[state=open]:text-amber-300 data-[state=open]:bg-amber-900/20">
              <div className="flex items-center space-x-2">
                <Pipette className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold uppercase tracking-wide">Color Manipulation</span>
                <span className="ml-auto text-xs bg-amber-600 text-white px-2 py-1 rounded-full">
                  HSL
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <ColorManipulationContent />
            </AccordionContent>
          </AccordionItem>

          {/* Layers Section */}
          <AccordionItem value="layers" className="border-b border-slate-700">
            <AccordionTrigger className="px-6 py-4 text-slate-300 hover:text-white hover:no-underline data-[state=open]:text-emerald-300 data-[state=open]:bg-emerald-900/20">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold uppercase tracking-wide">Layers</span>
                <span className="ml-auto text-xs bg-emerald-600 text-white px-2 py-1 rounded-full">
                  {selectedShapes.length + selectedGroups.length + artboards.length}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <LayersContent />
            </AccordionContent>
          </AccordionItem>

          {/* Properties Section */}
          <AccordionItem value="properties" className="border-b-0">
            <AccordionTrigger className="px-6 py-4 text-slate-300 hover:text-white hover:no-underline data-[state=open]:text-pink-300 data-[state=open]:bg-pink-900/20">
              <div className="flex items-center space-x-2">
                <Palette className="w-4 h-4 text-pink-400" />
                <span className="text-sm font-semibold uppercase tracking-wide">Properties</span>
                {selectedCount > 0 && (
                  <span className="ml-auto text-xs bg-pink-600 text-white px-2 py-1 rounded-full">
                    {selectedCount} shape{selectedCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <ShapePropertiesPanel selectedShapes={selectedShapes} selectedGroups={selectedGroups} selectedCount={selectedCount} />
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </div>
  );
}