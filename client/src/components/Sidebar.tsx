import { useState, useMemo } from 'react';
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
  Menu
} from "lucide-react";
import { ShapeType, ScatterSettings, BlendMode } from "../lib/shapeTypes";
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
  polygon: 'Polygon',
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
  selectedShapes: Shape[];
  selectedGroups: ShapeGroupClass[];
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
  onBringToFront: () => void;
  onSendToBack: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onChangeBlendMode: (blendMode: BlendMode) => void;
  onShapeUpdate?: () => void;
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
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
  onChangeBlendMode,
  onShapeUpdate
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

  // Shape properties will be passed from parent component via selectedShapes data

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

    const updateShapeProperty = (updater: (shape: Shape) => void) => {
      selectedShapes.forEach(updater);
      selectedGroups.forEach(group => group.shapes.forEach(updater));
      onShapeUpdate?.(); // Trigger parent component update
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
                        {firstSelectedShape.properties.gradient.stops.length > 2 && (
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

            {/* Shape-specific Properties */}
            {(firstSelectedShape.type === 'polygon' || firstSelectedShape.type === 'star') && (
              <div>
                <Label className="text-xs text-slate-400 mb-1 block">Sides</Label>
                <Input
                  type="number"
                  value={firstSelectedShape.sides || 6}
                  onChange={(e) => {
                    const newSides = Math.max(3, Math.min(20, parseInt(e.target.value) || 6));
                    updateShapeProperty(shape => {
                      if (shape.type === 'polygon' || shape.type === 'star') {
                        shape.sides = newSides;
                      }
                    });
                  }}
                  min={3}
                  max={20}
                  className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                />
              </div>
            )}

            {(firstSelectedShape.type === 'circle' || firstSelectedShape.type === 'ring') && (
              <div>
                <Label className="text-xs text-slate-400 mb-1 block">Radius</Label>
                <Input
                  type="number"
                  value={Math.round(firstSelectedShape.radius || 0)}
                  onChange={(e) => {
                    const newRadius = Math.max(1, parseFloat(e.target.value) || 0);
                    updateShapeProperty(shape => {
                      if (shape.type === 'circle' || shape.type === 'ring') {
                        shape.radius = newRadius;
                      }
                    });
                  }}
                  min={1}
                  className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                />
              </div>
            )}

            {/* Dimensions for rectangles and ellipses */}
            {(firstSelectedShape.type === 'rectangle' || firstSelectedShape.type === 'square' || firstSelectedShape.type === 'ellipse') && (
              <div className="space-y-1">
                <Label className="text-xs text-slate-400 mb-1 block">Dimensions</Label>
                <div className="flex items-center space-x-2">
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
                  <span className="text-xs text-slate-400">×</span>
                  <Input
                    type="number"
                    value={Math.round(firstSelectedShape.height || 0)}
                    onChange={(e) => {
                      const newHeight = Math.max(1, parseFloat(e.target.value) || 0);
                      updateShapeProperty(shape => {
                        if (shape.type === 'rectangle' || shape.type === 'square' || shape.type === 'ellipse') {
                          shape.height = newHeight;
                          if (shape.type === 'square') {
                            shape.width = newHeight;
                          }
                        }
                      });
                    }}
                    min={1}
                    className="h-6 w-16 text-xs bg-slate-800 border-slate-600 text-white"
                    disabled={firstSelectedShape.type === 'square'}
                  />
                </div>
              </div>
            )}

            {(firstSelectedShape.type === 'line' || firstSelectedShape.type === 'bezier' || firstSelectedShape.type === 'cubic' || firstSelectedShape.type === 'quadratic') && (
              <div>
                <Label className="text-xs text-slate-400 mb-1 block">Points</Label>
                <div className="text-xs text-slate-300">
                  {firstSelectedShape.points?.length || 0} points
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

    // Get all shapes from selectedShapes prop
    const allShapes = [...selectedShapes, ...selectedGroups.flatMap(g => g.shapes)];
    const sortedShapes = useMemo(() => {
      return allShapes.sort((a, b) => b.properties.zIndex - a.properties.zIndex);
    }, [selectedShapes, selectedGroups]);

    return (
      <div className="space-y-4">
        <div className="text-sm text-slate-400">
          Layers: <span className="text-white font-medium">{allShapes.length}</span> total
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
                  <SelectItem key={mode} value={mode} className="text-xs">
                    {mode.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Layers List */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">All Layers</Label>
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
                  // Toggle selection
                  shape.selected = !shape.selected;
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

        {allShapes.length === 0 && (
          <div className="text-xs text-slate-500 text-center py-4">
            No layers yet. Create some shapes to see them here.
          </div>
        )}
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
                    ? 'bg-purple-500 text-white hover:bg-purple-600 border-purple-400' 
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
                    ? 'bg-blue-500 text-white hover:bg-blue-600 border-blue-400' 
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

          {/* Properties */}
          <Popover onOpenChange={(open) => setActivePopover(open ? 'properties' : null)}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`p-3 h-auto mx-2 transition-colors border ${
                  activePopover === 'properties' 
                    ? 'bg-pink-500 text-white hover:bg-pink-600 border-pink-400' 
                    : 'text-white hover:text-white hover:bg-slate-700 bg-slate-800 border-slate-600'
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

          {/* Layers */}
          <Popover onOpenChange={(open) => setActivePopover(open ? 'layers' : null)}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`p-3 h-auto mx-2 transition-colors border ${
                  activePopover === 'layers' 
                    ? 'bg-purple-500 text-white hover:bg-purple-600 border-purple-400' 
                    : 'text-white hover:text-white hover:bg-slate-700 bg-slate-800 border-slate-600'
                }`}
              >
                <Navigation className="w-5 h-5" />
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
                  <Navigation className="w-4 h-4 mr-2" />
                  Layers
                </h3>
                <LayersContent />
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
        <Accordion type="multiple" defaultValue={["shapes", "editmode", "transforms"]} className="w-full">

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
              <PropertiesContent />
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </div>
  );
}