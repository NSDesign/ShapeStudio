import { useState, useCallback } from 'react';
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
  Upload,
  Save,
  FolderOpen,
  Plus,
  Minus,
  RotateCw,
  Square,
  Circle,
  Triangle,
  Hexagon,
  Star,
  Heart,
  ZapOff,
  Zap,
  Copy,
  X,
  Check,
  AlertCircle,
  Info,
  HelpCircle,
} from 'lucide-react';
import { Shape, ShapeType, ShapeGroupClass, CanvasSettings, ScatterSettings, Artboard, ArtboardPreset, BlendMode } from '@/types/shape';

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
  onLoadProject,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Batch export state
  const [batchModeEnabled, setBatchModeEnabled] = useState(false);
  const [batchShapeCount, setBatchShapeCount] = useState<[number, number]>([5, 15]);
  const [batchExportCount, setBatchExportCount] = useState(10);
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  // Export states
  const [exportMode, setExportMode] = useState<'all' | 'selected' | 'artboard'>('all');
  const [selectedArtboardForExport, setSelectedArtboardForExport] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg'>('png');
  const [exportQuality, setExportQuality] = useState(90);
  const [exportScale, setExportScale] = useState(1);

  const renderShapeForExport = useCallback((ctx: CanvasRenderingContext2D, shape: Shape) => {
    ctx.save();
    
    // Apply shape transform
    ctx.translate(shape.transform.x, shape.transform.y);
    ctx.rotate((shape.transform.rotation * Math.PI) / 180);
    ctx.scale(shape.transform.scaleX, shape.transform.scaleY);
    
    // Set shape style
    if (shape.properties.fillColor && shape.properties.fillColor !== 'transparent') {
      ctx.fillStyle = shape.properties.fillColor;
    }
    if (shape.properties.strokeColor && shape.properties.strokeColor !== 'transparent') {
      ctx.strokeStyle = shape.properties.strokeColor;
      ctx.lineWidth = shape.properties.strokeWidth || 1;
    }
    
    // Draw shape based on type
    ctx.beginPath();
    
    if (shape.type === 'rectangle') {
      ctx.rect(0, 0, shape.properties.width || 100, shape.properties.height || 100);
    } else if (shape.type === 'circle') {
      const radius = (shape.properties.width || 100) / 2;
      ctx.arc(radius, radius, radius, 0, Math.PI * 2);
    } else if (shape.type === 'triangle') {
      const width = shape.properties.width || 100;
      const height = shape.properties.height || 100;
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
    }
    
    // Fill and stroke
    if (shape.properties.fillColor && shape.properties.fillColor !== 'transparent') {
      ctx.fill();
    }
    if (shape.properties.strokeColor && shape.properties.strokeColor !== 'transparent') {
      ctx.stroke();
    }
    
    ctx.restore();
  }, []);

  const handleBatchExport = useCallback(async () => {
    if (isBatchExporting) return;
    
    setIsBatchExporting(true);
    setBatchProgress(0);
    
    console.log(`Starting batch export: ${batchExportCount} exports, ${batchShapeCount[0]}-${batchShapeCount[1]} generate calls each`);
    
    try {
      for (let i = 0; i < batchExportCount; i++) {
        console.log(`--- Starting export ${i + 1} of ${batchExportCount} ---`);
        
        try {
          // Clear existing shapes first
          onClearAll?.();
          await new Promise(resolve => setTimeout(resolve, 200));

          // Generate random number of shapes
          const randomCallCount = Math.floor(Math.random() * (batchShapeCount[1] - batchShapeCount[0] + 1)) + batchShapeCount[0];
          console.log(`Calling generateRandomShapes() ${randomCallCount} times for export ${i + 1}`);

          // Generate shapes
          for (let j = 0; j < randomCallCount; j++) {
            onGenerateRandomShapes();
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          // Wait for shapes to render
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (shapes.length === 0) {
            console.warn(`No shapes found for export ${i + 1}, skipping`);
            continue;
          }

          // Create export canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: false });
          
          if (!ctx) {
            console.error(`Canvas context unavailable for export ${i + 1}`);
            continue;
          }

          // Calculate canvas bounds
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          
          shapes.forEach(shape => {
            const bounds = shape.getBounds();
            const x1 = bounds.x + shape.transform.x;
            const y1 = bounds.y + shape.transform.y;
            const x2 = x1 + bounds.width;
            const y2 = y1 + bounds.height;
            
            minX = Math.min(minX, x1);
            minY = Math.min(minY, y1);
            maxX = Math.max(maxX, x2);
            maxY = Math.max(maxY, y2);
          });
          
          // Set canvas size with padding
          const padding = 20;
          const canvasWidth = Math.max(400, (maxX - minX + padding * 2)) * exportScale;
          const canvasHeight = Math.max(300, (maxY - minY + padding * 2)) * exportScale;
          
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          
          // White background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          
          // Apply transformations
          ctx.scale(exportScale, exportScale);
          ctx.translate(-minX + padding, -minY + padding);
          
          // Render shapes
          const sortedShapes = [...shapes].sort((a, b) => a.properties.zIndex - b.properties.zIndex);
          sortedShapes.forEach(shape => renderShapeForExport(ctx, shape));
          
          // Download image
          const batchFilename = `batch-export-${String(i + 1).padStart(3, '0')}-${Date.now()}.${exportFormat}`;
          const imageData = exportFormat === 'jpg' 
            ? canvas.toDataURL('image/jpeg', exportQuality / 100)
            : canvas.toDataURL('image/png');
          
          const link = document.createElement('a');
          link.href = imageData;
          link.download = batchFilename;
          link.style.display = 'none';
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          console.log(`✅ Batch saved: ${batchFilename} (${Math.round(canvasWidth)}x${Math.round(canvasHeight)})`);

          // Update progress
          setBatchProgress(i + 1);
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (exportError) {
          console.error(`Error in export ${i + 1}:`, exportError);
        }
      }
      console.log(`Batch export completed: ${batchExportCount} exports finished`);
    } catch (error) {
      console.error('Batch export failed:', error);
    } finally {
      setIsBatchExporting(false);
      setBatchProgress(0);
    }
  }, [
    batchExportCount,
    batchShapeCount,
    exportFormat,
    exportQuality,
    exportScale,
    onClearAll,
    onGenerateRandomShapes,
    shapes,
    renderShapeForExport,
    isBatchExporting
  ]);

  function ExportSaveContent() {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>Note: Disable "Ask where to save each file before downloading" in browser settings for batch export</span>
          </div>
          
          <div>
            <Label htmlFor="export-mode">Export Mode</Label>
            <Select value={exportMode} onValueChange={(value: 'all' | 'selected' | 'artboard') => setExportMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shapes</SelectItem>
                <SelectItem value="selected">Selected Shapes ({selectedCount})</SelectItem>
                <SelectItem value="artboard">Active Artboard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="export-format">Format</Label>
            <Select value={exportFormat} onValueChange={(value: 'png' | 'jpg') => setExportFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="jpg">JPG</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {exportFormat === 'jpg' && (
            <div>
              <Label htmlFor="quality">Quality: {exportQuality}%</Label>
              <Slider
                id="quality"
                min={10}
                max={100}
                step={10}
                value={[exportQuality]}
                onValueChange={(value) => setExportQuality(value[0])}
              />
            </div>
          )}

          <div>
            <Label htmlFor="scale">Scale: {exportScale}x</Label>
            <Slider
              id="scale"
              min={0.5}
              max={3}
              step={0.5}
              value={[exportScale]}
              onValueChange={(value) => setExportScale(value[0])}
            />
          </div>

          <Button onClick={() => {}} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Export Image
          </Button>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="batch-mode"
              checked={batchModeEnabled}
              onCheckedChange={setBatchModeEnabled}
            />
            <Label htmlFor="batch-mode">Batch Export Mode</Label>
          </div>

          {batchModeEnabled && (
            <div className="space-y-4 pl-6 border-l-2 border-primary/20">
              <div>
                <Label>Shape Types per Export: {batchShapeCount[0]}-{batchShapeCount[1]}</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={batchShapeCount[0]}
                    onChange={(e) => setBatchShapeCount([parseInt(e.target.value) || 1, batchShapeCount[1]])}
                    className="w-20"
                  />
                  <span className="flex items-center">to</span>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={batchShapeCount[1]}
                    onChange={(e) => setBatchShapeCount([batchShapeCount[0], parseInt(e.target.value) || 15])}
                    className="w-20"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="batch-count">Number of Exports</Label>
                <Input
                  id="batch-count"
                  type="number"
                  min={1}
                  max={100}
                  value={batchExportCount}
                  onChange={(e) => setBatchExportCount(parseInt(e.target.value) || 10)}
                />
              </div>

              <Button 
                onClick={handleBatchExport}
                disabled={isBatchExporting}
                className="w-full"
              >
                {isBatchExporting ? (
                  <>
                    <Activity className="mr-2 h-4 w-4 animate-spin" />
                    Exporting... ({batchProgress}/{batchExportCount})
                  </>
                ) : (
                  <>
                    <Shuffle className="mr-2 h-4 w-4" />
                    Start Batch Export
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isCollapsed) {
    return (
      <div className="w-12 h-full bg-background border-r flex flex-col items-center py-4 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(false)}
          className="w-8 h-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 h-full bg-background border-r flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Shape Editor</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(true)}
          className="w-8 h-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <Accordion type="multiple" defaultValue={["export"]} className="w-full">
            <AccordionItem value="export">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export & Save
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ExportSaveContent />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  );
}