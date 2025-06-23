import { useState, useCallback, useMemo, useEffect } from 'react';
import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import BatchConfigDialog, { BatchConfigSettings } from './BatchConfigDialog';
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
  Clipboard,
  Monitor,
  Save,
  FolderOpen,
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignTop,
  AlignBottom,
  DistributeHorizontal,
  DistributeVertical,
  BringToFront,
  SendToBack,
  StepForward,
  StepBack,
  Circle,
  Square,
  Triangle,
  Star,
  Heart,
  Diamond,
  Hexagon,
  Octagon,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  X,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  MoreHorizontal,
  Combine,
  Minus as MinusIcon,
  Intersect,
  XCircle,
} from 'lucide-react';
import type { 
  Shape, 
  ShapeType, 
  ScatterSettings, 
  BlendMode, 
  ShapeGroupClass, 
  Artboard, 
  ArtboardPreset,
  ColorManipulation 
} from '@/lib/types';
import { renderShape } from '@/lib/renderUtils';
import { shapeTypeDisplayNames } from '@/lib/shapes';
import ExportDialog from './ExportDialog';
import ProjectDialog from './ProjectDialog';

interface SidebarProps {
  enabledShapeTypes: Set<ShapeType>;
  scatterSettings: ScatterSettings;
  batchConfigSettings: BatchConfigSettings;
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
  onUpdateBatchConfigSettings: (settings: BatchConfigSettings) => void;
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
  batchConfigSettings,
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
  onApplyColorManipulation,
  onUpdateBatchConfigSettings,
  onLoadProject,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<string[]>(['shape-types']);

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

        <div className="mt-6 pt-2 border-t border-slate-700">
          <div className="flex gap-2">
            <Button 
              onClick={onGenerateRandomShapes}
              className="flex-1 bg-[var(--editor-accent)] hover:bg-purple-700 text-white font-medium"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Random Shapes
            </Button>
            <BatchConfigDialog
              settings={batchConfigSettings}
              onSettingsChange={onUpdateBatchConfigSettings}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`
      h-full bg-slate-900 border-r border-slate-700 text-slate-200 transition-all duration-300
      ${isCollapsed ? 'w-12' : 'w-80'}
    `}>
      {/* Collapse Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {!isCollapsed && <h2 className="text-lg font-semibold">Tools</h2>}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0 hover:bg-slate-800"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {!isCollapsed && (
        <div className="p-4 h-[calc(100%-4rem)] overflow-hidden">
          <Accordion 
            type="multiple" 
            value={activeSection} 
            onValueChange={setActiveSection}
            className="space-y-2"
          >
            <AccordionItem value="shape-types" className="border-slate-700">
              <AccordionTrigger className="text-slate-200 hover:text-white hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <Shapes className="w-4 h-4" />
                  Shape Types
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <ShapeTypesContent />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  );
}