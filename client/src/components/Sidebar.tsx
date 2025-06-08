import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  Palette
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
  canComposeShapes: boolean;
  onToggleShapeType: (type: ShapeType) => void;
  onUpdateScatterSettings: (settings: Partial<ScatterSettings>) => void;
  onGenerateRandomShapes: () => void;
  onComposeShapes: () => void;
  onMove: () => void;
  onScale: () => void;
  onRotate: () => void;
  onSkew: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
}

export default function Sidebar({
  enabledShapeTypes,
  scatterSettings,
  selectedCount,
  canComposeShapes,
  onToggleShapeType,
  onUpdateScatterSettings,
  onGenerateRandomShapes,
  onComposeShapes,
  onMove,
  onScale,
  onRotate,
  onSkew,
  onFlipHorizontal,
  onFlipVertical
}: SidebarProps) {
  const allShapeTypes: ShapeType[] = [
    'rectangle', 'square', 'circle', 'ellipse', 'line', 
    'polygon', 'star', 'blob', 'ring', 'bezier', 'cubic', 'quadratic', 'nurbs'
  ];

  return (
    <div className="w-80 bg-[var(--surface)] border-r border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white mb-1">Shape Editor Pro</h1>
        <p className="text-sm text-slate-400">Create and manipulate shapes with precision</p>
      </div>
      
      {/* Accordion Sections */}
      <div className="flex-1 overflow-y-auto">
        <Accordion type="multiple" defaultValue={["shapes", "transforms"]} className="w-full">
          
          {/* Shape Types Section */}
          <AccordionItem value="shapes" className="border-b border-slate-700">
            <AccordionTrigger className="px-6 py-4 text-slate-300 hover:text-white hover:no-underline">
              <div className="flex items-center space-x-2">
                <Shapes className="w-4 h-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">Shape Types</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {allShapeTypes.map((type) => {
                  const IconComponent = shapeIcons[type];
                  const isEnabled = enabledShapeTypes.has(type);
                  
                  return (
                    <div key={type} className="shape-item flex items-center justify-between p-2 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <IconComponent className="w-4 h-4 text-[var(--editor-primary)]" />
                        <span className="text-sm font-medium">{shapeNames[type]}</span>
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
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={onMove}
                  className="bg-[var(--surface-light)] hover:bg-slate-600 text-slate-200"
                >
                  <Move className="w-3 h-3 mr-1" />
                  Move
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={onScale}
                  className="bg-[var(--surface-light)] hover:bg-slate-600 text-slate-200"
                >
                  <Expand className="w-3 h-3 mr-1" />
                  Scale
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={onRotate}
                  className="bg-[var(--surface-light)] hover:bg-slate-600 text-slate-200"
                >
                  <RotateCw className="w-3 h-3 mr-1" />
                  Rotate
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={onSkew}
                  className="bg-[var(--surface-light)] hover:bg-slate-600 text-slate-200"
                >
                  <Italic className="w-3 h-3 mr-1" />
                  Skew
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={onFlipHorizontal}
                  className="bg-[var(--surface-light)] hover:bg-slate-600 text-slate-200"
                >
                  <FlipHorizontal className="w-3 h-3 mr-1" />
                  Flip H
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={onFlipVertical}
                  className="bg-[var(--surface-light)] hover:bg-slate-600 text-slate-200"
                >
                  <FlipVertical className="w-3 h-3 mr-1" />
                  Flip V
                </Button>
              </div>
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
                  <Label className="text-sm">Scatter on Points</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={scatterSettings.insideArea}
                    onCheckedChange={(checked) => onUpdateScatterSettings({ insideArea: checked })}
                  />
                  <Label className="text-sm">Scatter Inside Area</Label>
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
            </AccordionContent>
          </AccordionItem>
          
        </Accordion>
      </div>
    </div>
  );
}
