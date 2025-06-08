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
  FolderOpen
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
  onDeleteSelected
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

          {/* Shape Properties */}
          {selectedCount > 0 && (
            <ShapePropertiesPanel 
              selectedShapes={selectedShapes}
              selectedGroups={selectedGroups}
              selectedCount={selectedCount}
            />
          )}
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
    
    return (
      <div className="space-y-2 border-t border-slate-600 pt-2">
        <Label className="text-xs text-slate-300">Shape Properties</Label>
        {!firstSelectedShape ? (
          <div className="text-xs text-slate-400">
            {selectedCount} shape{selectedCount > 1 ? 's' : ''} selected
          </div>
        ) : (
          <div className="space-y-2">
            {/* Fill Properties */}
            <div>
              <Label className="text-xs text-slate-400 mb-1 block">Fill</Label>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Input
                    type="color"
                    value={firstSelectedShape.properties.fillColor}
                    onChange={(e) => {
                      firstSelectedShape.properties.fillColor = e.target.value;
                    }}
                    className="h-6 w-12 p-0 border-slate-600"
                  />
                  <span className="text-xs text-slate-400">
                    {Math.round(firstSelectedShape.properties.fillOpacity * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Stroke Properties */}
            <div>
              <Label className="text-xs text-slate-400 mb-1 block">Stroke</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="color"
                  value={firstSelectedShape.properties.strokeColor}
                  onChange={(e) => {
                    firstSelectedShape.properties.strokeColor = e.target.value;
                  }}
                  className="h-6 w-12 p-0 border-slate-600"
                />
                <Input
                  type="number"
                  value={firstSelectedShape.properties.strokeWidth}
                  onChange={(e) => {
                    firstSelectedShape.properties.strokeWidth = parseFloat(e.target.value) || 0;
                  }}
                  min={0}
                  max={20}
                  step={0.5}
                  className="h-6 flex-1 text-xs bg-slate-800 border-slate-600 text-white"
                />
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
                    firstSelectedShape.sides = parseInt(e.target.value) || 6;
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
                  value={firstSelectedShape.radius || 0}
                  onChange={(e) => {
                    firstSelectedShape.radius = parseFloat(e.target.value) || 0;
                  }}
                  className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                />
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
        {/* Collapsed Header - Just Folder Icon */}
        <div className="p-3 border-b border-slate-700 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(false)}
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 p-2 h-auto transition-colors"
          >
            <FolderOpen className="w-5 h-5" />
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
      {/* Compact Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FolderOpen className="w-5 h-5 text-blue-400" />
          <div>
            <h1 className="text-sm font-semibold text-white">Shape Editor</h1>
          </div>
        </div>
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
