import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Shapes, 
  Circle, 
  Square, 
  Triangle, 
  Hexagon, 
  Star, 
  Minus, 
  Navigation, 
  Layers, 
  Palette, 
  Settings, 
  Move, 
  RotateCw, 
  Scale, 
  Flip, 
  FlipHorizontal, 
  FlipVertical, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  Edit, 
  MousePointer, 
  Zap,
  Eye,
  EyeOff,
  Download,
  Upload,
  Save,
  FolderOpen
} from 'lucide-react';
import { Shape, ShapeGroupClass } from '@/lib/shapes';
import { ShapeType, ScatterSettings, BlendMode } from '@/lib/shapeTypes';

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
  const [activeTab, setActiveTab] = useState<'shapes' | 'transform' | 'composition' | 'properties' | 'layers'>('shapes');

  const ShapeTypesContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { type: 'rectangle' as ShapeType, icon: Square, label: 'Rectangle' },
          { type: 'square' as ShapeType, icon: Square, label: 'Square' },
          { type: 'circle' as ShapeType, icon: Circle, label: 'Circle' },
          { type: 'ellipse' as ShapeType, icon: Circle, label: 'Ellipse' },
          { type: 'line' as ShapeType, icon: Minus, label: 'Line' },
          { type: 'polygon' as ShapeType, icon: Hexagon, label: 'Polygon' },
          { type: 'star' as ShapeType, icon: Star, label: 'Star' },
          { type: 'blob' as ShapeType, icon: Shapes, label: 'Blob' },
          { type: 'ring' as ShapeType, icon: Circle, label: 'Ring' },
          { type: 'bezier' as ShapeType, icon: Navigation, label: 'Bézier' },
          { type: 'cubic' as ShapeType, icon: Navigation, label: 'Cubic' },
          { type: 'quadratic' as ShapeType, icon: Navigation, label: 'Quadratic' },
          { type: 'nurbs' as ShapeType, icon: Navigation, label: 'NURBS' }
        ].map(({ type, icon: Icon, label }) => (
          <Button
            key={type}
            variant={enabledShapeTypes.has(type) ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleShapeType(type)}
            className={`flex flex-col items-center gap-1 h-auto py-2 transition-colors ${
              enabledShapeTypes.has(type) 
                ? 'bg-[var(--editor-accent)] hover:bg-purple-700 text-white' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-xs">{label}</span>
          </Button>
        ))}
      </div>

      <Separator className="bg-slate-600" />

      <Button 
        onClick={onGenerateRandomShapes}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
      >
        <Zap className="w-4 h-4 mr-2" />
        Generate Random Shapes
      </Button>

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
              <Button size="sm" variant="outline" onClick={() => onMoveBy(-10, 0)}>← 10px</Button>
              <Button size="sm" variant="outline" onClick={() => onMoveBy(10, 0)}>10px →</Button>
              <Button size="sm" variant="outline" onClick={() => onMoveBy(0, -10)}>↑ 10px</Button>
              <Button size="sm" variant="outline" onClick={() => onMoveBy(0, 10)}>10px ↓</Button>
            </div>
          </div>

          {/* Scale Controls */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-300 flex items-center">
              <Scale className="w-3 h-3 mr-1" />
              Scale
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => onScaleBy(0.9, 0.9)}>90%</Button>
              <Button size="sm" variant="outline" onClick={() => onScaleBy(1.1, 1.1)}>110%</Button>
              <Button size="sm" variant="outline" onClick={() => onScaleBy(0.5, 1)}>50% W</Button>
              <Button size="sm" variant="outline" onClick={() => onScaleBy(1, 0.5)}>50% H</Button>
            </div>
          </div>

          {/* Rotate Controls */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-300 flex items-center">
              <RotateCw className="w-3 h-3 mr-1" />
              Rotate
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => onRotateBy(-15)}>-15°</Button>
              <Button size="sm" variant="outline" onClick={() => onRotateBy(15)}>+15°</Button>
              <Button size="sm" variant="outline" onClick={() => onRotateBy(-90)}>-90°</Button>
              <Button size="sm" variant="outline" onClick={() => onRotateBy(90)}>+90°</Button>
            </div>
          </div>

          {/* Flip Controls */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-300 flex items-center">
              <Flip className="w-3 h-3 mr-1" />
              Flip
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={onFlipHorizontal}>
                <FlipHorizontal className="w-4 h-4 mr-1" />
                Horizontal
              </Button>
              <Button size="sm" variant="outline" onClick={onFlipVertical}>
                <FlipVertical className="w-4 h-4 mr-1" />
                Vertical
              </Button>
            </div>
          </div>

          {/* Layer Controls */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-300 flex items-center">
              <Layers className="w-3 h-3 mr-1" />
              Layer Order
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={onBringToFront}>
                <ChevronUp className="w-4 h-4 mr-1" />
                To Front
              </Button>
              <Button size="sm" variant="outline" onClick={onSendToBack}>
                <ChevronDown className="w-4 h-4 mr-1" />
                To Back
              </Button>
              <Button size="sm" variant="outline" onClick={onBringForward}>
                <ChevronUp className="w-4 h-4 mr-1" />
                Forward
              </Button>
              <Button size="sm" variant="outline" onClick={onSendBackward}>
                <ChevronDown className="w-4 h-4 mr-1" />
                Backward
              </Button>
            </div>
          </div>

          {/* Delete Button */}
          <Button 
            onClick={onDeleteSelected}
            variant="destructive"
            size="sm"
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
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
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-slate-300">Count: {scatterSettings.count}</Label>
        <Slider
          value={[scatterSettings.count]}
          onValueChange={([value]) => onUpdateScatterSettings({ count: value })}
          max={50}
          min={1}
          step={1}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-slate-300">Randomness: {scatterSettings.randomness}%</Label>
        <Slider
          value={[scatterSettings.randomness]}
          onValueChange={([value]) => onUpdateScatterSettings({ randomness: value })}
          max={100}
          min={0}
          step={5}
          className="w-full"
        />
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
        <div className="space-y-3 border-t border-slate-600 pt-3 max-h-96 overflow-y-auto">
          <Label className="text-xs text-slate-300 font-semibold">Shape Properties</Label>
          <div className="text-xs text-slate-400">
            {selectedCount} shape{selectedCount > 1 ? 's' : ''} selected
          </div>
        </div>
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
        
        {selectedCount > 0 && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm text-slate-300">Blend Mode</Label>
              <Select onValueChange={(value: BlendMode) => onChangeBlendMode(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select blend mode" />
                </SelectTrigger>
                <SelectContent>
                  {blendModes.map(mode => (
                    <SelectItem key={mode} value={mode}>
                      {mode.charAt(0).toUpperCase() + mode.slice(1).replace('-', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        
        {sortedShapes.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            <Label className="text-xs text-slate-400">Layer Stack</Label>
            {sortedShapes.map((shape, index) => (
              <div 
                key={shape.id} 
                className={`flex items-center justify-between p-2 rounded text-xs ${
                  shape.selected ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-slate-800/50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {shape.type}
                  </Badge>
                  <span className="text-slate-300 font-mono">
                    {shape.id.slice(-6)}
                  </span>
                </div>
                <div className="text-slate-400">
                  z: {shape.properties.zIndex}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 bg-slate-900 border-r border-slate-600 flex flex-col h-full">
      <div className="p-4 border-b border-slate-600">
        <h2 className="text-lg font-semibold text-white mb-4">Shape Editor</h2>
        
        {/* Edit Mode Selector */}
        <div className="flex bg-slate-800 rounded-lg p-1 mb-4">
          {[
            { mode: 'shapes' as const, icon: Shapes, label: 'Shapes' },
            { mode: 'points' as const, icon: MousePointer, label: 'Points' },
            { mode: 'segments' as const, icon: Edit, label: 'Segments' }
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => onSetEditMode(mode)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                editMode === mode
                  ? 'bg-[var(--editor-accent)] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Accordion type="multiple" defaultValue={["shapes", "transform", "properties"]} className="w-full">
          <AccordionItem value="shapes">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium text-slate-200 hover:text-white">
              <div className="flex items-center">
                <Shapes className="w-4 h-4 mr-2" />
                Shape Types
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <ShapeTypesContent />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="transform">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium text-slate-200 hover:text-white">
              <div className="flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Transform
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <TransformToolsContent />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="composition">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium text-slate-200 hover:text-white">
              <div className="flex items-center">
                <Layers className="w-4 h-4 mr-2" />
                Composition
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <CompositionContent />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="properties">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium text-slate-200 hover:text-white">
              <div className="flex items-center">
                <Palette className="w-4 h-4 mr-2" />
                Properties
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <PropertiesContent />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="layers">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium text-slate-200 hover:text-white">
              <div className="flex items-center">
                <Layers className="w-4 h-4 mr-2" />
                Layers
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <LayersContent />
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </div>
  );
}