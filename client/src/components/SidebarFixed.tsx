import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ChevronLeft, 
  Menu,
  Shapes, 
  Settings, 
  Move, 
  RotateCw, 
  FlipHorizontal, 
  FlipVertical, 
  Trash2, 
  Copy, 
  Layers, 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Square, 
  Circle, 
  Triangle, 
  Star, 
  Hexagon, 
  Pentagon,
  Palette,
  GitMerge,
  Plus,
  Minus,
  X,
  Divide,
  Pipette
} from 'lucide-react';
import { Shape, ShapeGroupClass } from '@/lib/shapes';
import { ShapeType, ScatterSettings, Artboard, ArtboardPreset, BlendMode } from '@/lib/shapeTypes';

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
  shapes: Shape[];
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

  // Collapsed sidebar view
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
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-3 h-auto mx-2 transition-colors border text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 bg-slate-800 border-slate-600"
              >
                <Shapes className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              className="w-auto bg-slate-900 border-slate-700 p-2"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="text-xs text-white font-medium whitespace-nowrap">Shape Types</div>
            </PopoverContent>
          </Popover>

          {/* Edit Mode */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`p-3 h-auto mx-2 transition-colors border bg-slate-800 border-slate-600 ${
                  editMode === 'shapes' ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/20' :
                  editMode === 'points' ? 'text-green-400 hover:text-green-300 hover:bg-green-500/20' : 
                  'text-purple-400 hover:text-purple-300 hover:bg-purple-500/20'
                }`}
              >
                <Settings className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              className="w-auto bg-slate-900 border-slate-700 p-2"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="text-xs text-white font-medium whitespace-nowrap">Edit Mode</div>
            </PopoverContent>
          </Popover>

          {/* Transform Tools */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-3 h-auto mx-2 transition-colors border text-orange-400 hover:text-orange-300 hover:bg-orange-500/20 bg-slate-800 border-slate-600"
              >
                <Move className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              className="w-auto bg-slate-900 border-slate-700 p-2"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="text-xs text-white font-medium whitespace-nowrap">Transform Tools</div>
            </PopoverContent>
          </Popover>

          {/* Composition */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-3 h-auto mx-2 transition-colors border text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 bg-slate-800 border-slate-600"
              >
                <Layers className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              className="w-auto bg-slate-900 border-slate-700 p-2"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="text-xs text-white font-medium whitespace-nowrap">Composition</div>
            </PopoverContent>
          </Popover>

          {/* Artboards */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-3 h-auto mx-2 transition-colors border text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 bg-slate-800 border-slate-600"
              >
                <Square className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              className="w-auto bg-slate-900 border-slate-700 p-2"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="text-xs text-white font-medium whitespace-nowrap">Artboards</div>
            </PopoverContent>
          </Popover>

          {/* Boolean Operations */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-3 h-auto mx-2 transition-colors border text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 bg-slate-800 border-slate-600"
              >
                <GitMerge className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              className="w-auto bg-slate-900 border-slate-700 p-2"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="text-xs text-white font-medium whitespace-nowrap">Boolean Operations</div>
            </PopoverContent>
          </Popover>

          {/* Color Manipulation */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-3 h-auto mx-2 transition-colors border text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 bg-slate-800 border-slate-600"
              >
                <Pipette className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              className="w-auto bg-slate-900 border-slate-700 p-2"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="text-xs text-white font-medium whitespace-nowrap">Color Manipulation</div>
            </PopoverContent>
          </Popover>

          {/* Layers */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-3 h-auto mx-2 transition-colors border text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 bg-slate-800 border-slate-600"
              >
                <Layers className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              className="w-auto bg-slate-900 border-slate-700 p-2"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="text-xs text-white font-medium whitespace-nowrap">Layers</div>
            </PopoverContent>
          </Popover>

          {/* Properties */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-3 h-auto mx-2 transition-colors border text-pink-400 hover:text-pink-300 hover:bg-pink-500/20 bg-slate-800 border-slate-600"
              >
                <Palette className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              className="w-auto bg-slate-900 border-slate-700 p-2"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="text-xs text-white font-medium whitespace-nowrap">Properties</div>
            </PopoverContent>
          </Popover>

        </div>
      </div>
    );
  }

  // Expanded sidebar view
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
        <Accordion type="multiple" defaultValue={["shapes", "editmode", "transforms", "composition", "artboards", "boolean", "color", "layers", "properties"]} className="w-full">
          {/* Shape Types Section */}
          <AccordionItem value="shapes" className="border-b border-slate-700">
            <AccordionTrigger className="px-6 py-4 text-slate-300 hover:text-white hover:no-underline data-[state=open]:text-blue-300 data-[state=open]:bg-blue-900/20">
              <div className="flex items-center space-x-2">
                <Shapes className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold uppercase tracking-wide">Shape Types</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="text-xs text-slate-400 mb-3">Select which shape types to generate</div>
              <div className="grid grid-cols-2 gap-2">
                {(['rectangle', 'circle', 'triangle', 'star', 'polygon', 'ring', 'blob', 'bezier', 'spline'] as ShapeType[]).map((type) => (
                  <Button
                    key={type}
                    variant={enabledShapeTypes.has(type) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onToggleShapeType(type)}
                    className={`text-xs capitalize transition-all ${
                      enabledShapeTypes.has(type) 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-700 border-slate-600'
                    }`}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Edit Mode Section */}
          <AccordionItem value="editmode" className="border-b border-slate-700">
            <AccordionTrigger className="px-6 py-4 text-slate-300 hover:text-white hover:no-underline data-[state=open]:text-green-300 data-[state=open]:bg-green-900/20">
              <div className="flex items-center space-x-2">
                <Settings className={`w-4 h-4 ${
                  editMode === 'shapes' ? 'text-blue-400' :
                  editMode === 'points' ? 'text-green-400' : 'text-purple-400'
                }`} />
                <span className="text-sm font-semibold uppercase tracking-wide">Edit Mode</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-3">
                <div className="text-xs text-slate-400 mb-3">Current: {editMode}</div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={editMode === 'shapes' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onSetEditMode('shapes')}
                    className={`text-xs ${
                      editMode === 'shapes' 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    Shapes
                  </Button>
                  <Button
                    variant={editMode === 'points' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onSetEditMode('points')}
                    className={`text-xs ${
                      editMode === 'points' 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    Points
                  </Button>
                  <Button
                    variant={editMode === 'segments' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onSetEditMode('segments')}
                    className={`text-xs ${
                      editMode === 'segments' 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    Segments
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Transform Tools Section */}
          <AccordionItem value="transforms" className="border-b border-slate-700">
            <AccordionTrigger className="px-6 py-4 text-slate-300 hover:text-white hover:no-underline data-[state=open]:text-orange-300 data-[state=open]:bg-orange-900/20">
              <div className="flex items-center space-x-2">
                <Move className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-semibold uppercase tracking-wide">Transform Tools</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4">
                <div className="text-xs text-slate-400 mb-3">
                  Selected: {selectedCount} shape{selectedCount !== 1 ? 's' : ''}
                  {selectedPointsCount > 0 && `, ${selectedPointsCount} point${selectedPointsCount !== 1 ? 's' : ''}`}
                  {selectedSegmentsCount > 0 && `, ${selectedSegmentsCount} segment${selectedSegmentsCount !== 1 ? 's' : ''}`}
                </div>

                {/* Move */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Move</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={() => onMoveBy(-10, 0)} disabled={selectedCount === 0} className="text-xs">← 10px</Button>
                    <Button size="sm" onClick={() => onMoveBy(10, 0)} disabled={selectedCount === 0} className="text-xs">→ 10px</Button>
                    <Button size="sm" onClick={() => onMoveBy(0, -10)} disabled={selectedCount === 0} className="text-xs">↑ 10px</Button>
                    <Button size="sm" onClick={() => onMoveBy(0, 10)} disabled={selectedCount === 0} className="text-xs">↓ 10px</Button>
                  </div>
                </div>

                {/* Scale */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Scale</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={() => onScaleBy(1.1, 1.1)} disabled={selectedCount === 0} className="text-xs">+10%</Button>
                    <Button size="sm" onClick={() => onScaleBy(0.9, 0.9)} disabled={selectedCount === 0} className="text-xs">-10%</Button>
                    <Button size="sm" onClick={() => onScaleBy(1.1, 1)} disabled={selectedCount === 0} className="text-xs">W +10%</Button>
                    <Button size="sm" onClick={() => onScaleBy(1, 1.1)} disabled={selectedCount === 0} className="text-xs">H +10%</Button>
                  </div>
                </div>

                {/* Rotate & Flip */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Rotate & Flip</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={() => onRotateBy(-15)} disabled={selectedCount === 0} className="text-xs">
                      <RotateCw className="w-3 h-3 mr-1 scale-x-[-1]" />
                      -15°
                    </Button>
                    <Button size="sm" onClick={() => onRotateBy(15)} disabled={selectedCount === 0} className="text-xs">
                      <RotateCw className="w-3 h-3 mr-1" />
                      +15°
                    </Button>
                    <Button size="sm" onClick={onFlipHorizontal} disabled={selectedCount === 0} className="text-xs">
                      <FlipHorizontal className="w-3 h-3 mr-1" />
                      Flip H
                    </Button>
                    <Button size="sm" onClick={onFlipVertical} disabled={selectedCount === 0} className="text-xs">
                      <FlipVertical className="w-3 h-3 mr-1" />
                      Flip V
                    </Button>
                  </div>
                </div>

                {/* Z-Order */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Z-Order</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={onBringToFront} disabled={selectedCount === 0} className="text-xs">
                      <ChevronUp className="w-3 h-3 mr-1" />
                      Front
                    </Button>
                    <Button size="sm" onClick={onSendToBack} disabled={selectedCount === 0} className="text-xs">
                      <ChevronDown className="w-3 h-3 mr-1" />
                      Back
                    </Button>
                    <Button size="sm" onClick={onBringForward} disabled={selectedCount === 0} className="text-xs">
                      <ChevronUp className="w-3 h-3 mr-1" />
                      Forward
                    </Button>
                    <Button size="sm" onClick={onSendBackward} disabled={selectedCount === 0} className="text-xs">
                      <ChevronDown className="w-3 h-3 mr-1" />
                      Backward
                    </Button>
                  </div>
                </div>

                {/* Delete */}
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={onDeleteSelected} 
                  disabled={selectedCount === 0}
                  className="w-full text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete Selected ({selectedCount})
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Properties Section */}
          <AccordionItem value="properties" className="border-b-0">
            <AccordionTrigger className="px-6 py-4 text-slate-300 hover:text-white hover:no-underline data-[state=open]:text-pink-300 data-[state=open]:bg-pink-900/20">
              <div className="flex items-center space-x-2">
                <Palette className="w-4 h-4 text-pink-400" />
                <span className="text-sm font-semibold uppercase tracking-wide">Properties</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="text-xs text-slate-400 mb-3">
                {selectedCount === 0 ? 'No shapes selected' : `Editing ${selectedCount} shape${selectedCount !== 1 ? 's' : ''}`}
              </div>
              {selectedCount > 0 && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-300">Shape properties panel would go here</div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </div>
  );
}