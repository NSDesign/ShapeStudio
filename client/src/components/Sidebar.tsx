import React, { useState, useCallback, useMemo, useEffect, useRef, useLayoutEffect, memo } from 'react';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import * as UTIF from 'utif';
import pako from 'pako';

// Expose pako globally for UTIF.js Deflate compression support
if (typeof window !== 'undefined') {
  (window as unknown as { pako: typeof pako }).pako = pako;
}
import { getSrgbIccProfile, embedIccInPng, embedIccInJpeg } from '@/lib/iccProfile';
import { executeServerExport, ServerExportRequest } from '@/lib/imageExport';
import { Button } from '@/components/ui/button';
import BatchConfigDialog from './BatchConfigDialog';
import { SetsManagerDialog } from './SetsManagerDialog';
import TiffPreflightModal, { calculateTiffPreflightInfo } from './TiffPreflightModal';
import { BatchConfigSettings, EnhancedBatchConfig, GenerationSet, ShapeCountMode, SupportedShapeType, SidebarSectionConfig, DEFAULT_PRINT_CONFIG, PrintConfig, PrintUnitType, BackgroundMode, PrintMarksScaleMode } from '@shared/schema';
import type { CurrentUIState } from '@/hooks/useGenerationSets';
import { GenerationSetsDropdown } from './GenerationSetsDropdown';
import ApiCallGenerator from './ApiCallGenerator';
import AuthHeader from './AuthHeader';
import { useUserPreferences, useExportSettings } from '@/hooks/useUserPreferences';
import { useShapeSetPresets } from '@/hooks/useShapeSetPresets';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { BufferedSlider, BufferedRangeSlider, BufferedSliderWithLabel, BufferedRangeSliderWithLabel, BufferedSliderWithNumericInput, BufferedRangeSliderWithNumericInputs } from '@/components/ui/buffered-slider';
import { NumericInput, BufferedNumericInput } from '@/components/ui/numeric-input';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shapes,
  Settings,
  Layers,
  Palette,
  Download,
  Wand2,
  Navigation,
  Shuffle,
  Layers3,
  Package,
  ImageIcon,
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
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Grid3X3,
  Trash,
  FileImage,
  Save,
  FolderOpen,
  Clipboard,
  Boxes,
  Plus,
  Minus,
  Info,
  X,
  CheckCircle,
  AlertTriangle,
  Link2,
  Unlink2,
  RectangleVertical,
  RectangleHorizontal
} from 'lucide-react';
import { ShapeType, ShapeGroup as ShapeGroupClass, BlendMode, ScatterSettings, CanvasSettings, Artboard, ArtboardPreset, ScalarMode, getDefaultLineVectorConfig } from '@/lib/shapeTypes';
import { ModeField } from '@/components/ModeField';
import { StyledModeField } from '@/components/StyledModeField';
import { Shape } from '@/lib/shapes';
import { pixelsToUnit, unitToPixels, calculatePixelDimensions, getArtboardDisplayDimensions, getUnitLabel, DPI_PRESETS, type UnitType } from '@/lib/artboardUtils';
import { ARTBOARD_PRESETS_PHYSICAL, PRESET_CATEGORIES, getPresetsByCategory, getPresetPixelDimensions, formatPresetDimensions, type ArtboardPresetPhysical, type PresetCategory } from '@/lib/artboardPresets';
import { embedDPI, embedCopyright, embedPngMetadata, type PngMetadata } from '@/lib/dpiEmbedder';

import { SmartDistributionAlgorithm } from '../lib/distributionAlgorithm';

// Shape categories for organized display
const SHAPE_CATEGORIES = {
  'Basic': ['rectangle', 'rounded-rectangle', 'square', 'rounded-square', 'circle', 'ellipse'] as ShapeType[],
  'Geometric': ['triangle', 'right-triangle', 'pentagon', 'hexagon', 'rhombus', 'parallelogram', 'trapezoid'] as ShapeType[],
  'Special': ['star', 'polygon', 'heart', 'arrow', 'cross', 'kite', 'semicircle'] as ShapeType[],
  'Lines & Curves': ['line-vector', 'line', 'bezier', 'cubic', 'smooth-spline'] as ShapeType[],
  'Complex': ['ring', 'blob', 'chunk', 'spline-circle', 'spline-ellipse', 'spline-ring'] as ShapeType[]
};

// Shape display names mapping
const shapeTypeDisplayNames: Record<ShapeType, string> = {
  rectangle: 'Rectangle',
  'rounded-rectangle': 'Rounded Rectangle',
  square: 'Square',
  'rounded-square': 'Rounded Square',
  circle: 'Circle',
  ellipse: 'Ellipse',
  triangle: 'Triangle',
  'right-triangle': 'Right Triangle',
  trapezoid: 'Trapezoid',
  pentagon: 'Pentagon',
  hexagon: 'Hexagon',
  rhombus: 'Rhombus',
  parallelogram: 'Parallelogram',
  kite: 'Kite',
  semicircle: 'Semicircle',
  heart: 'Heart',
  arrow: 'Arrow',
  cross: 'Cross',
  polygon: 'Polygon',
  star: 'Star',
  'line-vector': 'Line Vector',
  line: 'Line',
  cubic: 'Cubic Curve',
  bezier: 'Bézier Curve',

  'smooth-spline': 'Smooth Spline',
  chunk: 'Chunk',
  blob: 'Organic Blob',
  ring: 'Ring',
  'spline-circle': 'Spline Circle',
  'spline-ellipse': 'Spline Ellipse',
  'spline-ring': 'Spline Ring'
};

// Conversion functions for scatterSettings to ModeConfig format
const convertScatterToModeConfig = (
  shapeType: string,
  property: string,
  scatterSettings: ScatterSettings,
  defaultRange: [number, number]
) => {
  const shapeData = scatterSettings.shapeSpecific[shapeType as keyof typeof scatterSettings.shapeSpecific];
  
  switch (property) {
    case 'edgeCount': // for polygon
      const edgeRange = (shapeData as any)?.edgeCountRange || defaultRange;
      return {
        kind: 'range' as const,
        min: edgeRange[0],
        max: edgeRange[1]
      };
    case 'pointCount': // for star, line, bezier, etc.
      const pointRange = (shapeData as any)?.pointCountRange || defaultRange;
      return {
        kind: 'range' as const,
        min: pointRange[0],
        max: pointRange[1]
      };
    case 'innerRadius': // for star, ring  
      const radiusRange = (shapeData as any)?.innerRadiusRange || [defaultRange[0] / 100, defaultRange[1] / 100];
      return {
        kind: 'range' as const,
        min: Math.round(radiusRange[0] * 100),
        max: Math.round(radiusRange[1] * 100)
      };
    case 'segmentCount': // for circle, ellipse
      const segmentRange = (shapeData as any)?.segmentCountRange || defaultRange;
      return {
        kind: 'range' as const,
        min: segmentRange[0],
        max: segmentRange[1]
      };
    case 'curvature': // for cubic curves (percentage)
      const curvatureRange = (shapeData as any)?.curvatureRange || [defaultRange[0] / 100, defaultRange[1] / 100];
      return {
        kind: 'range' as const,
        min: Math.round(curvatureRange[0] * 100), // Convert back to percentage for UI
        max: Math.round(curvatureRange[1] * 100)
      };
    case 'spread': // for cubic curves (pixels)
      const spreadRange = (shapeData as any)?.spreadRange || defaultRange;
      return {
        kind: 'range' as const,
        min: spreadRange[0],
        max: spreadRange[1]
      };
    case 'cornerRadius': // for rounded-rectangle, rounded-square
      const radiusMode = (shapeData as any)?.cornerRadiusMode || 'range';
      if (radiusMode === 'fixed') {
        const radiusValue = (shapeData as any)?.cornerRadiusValue || defaultRange[0];
        return {
          kind: 'fixed' as const,
          value: radiusValue
        };
      } else {
        const radiusRange = (shapeData as any)?.cornerRadiusRange || defaultRange;
        return {
          kind: 'range' as const,
          min: radiusRange[0],
          max: radiusRange[1]
        };
      }
    default:
      return {
        kind: 'range' as const,
        min: defaultRange[0],
        max: defaultRange[1]
      };
  }
};

// Conversion functions for line-vector ScalarMode to ModeConfig format
const convertLineVectorToModeConfig = (scalarMode: ScalarMode<number>) => {
  switch (scalarMode.kind) {
    case 'fixed':
      return {
        kind: 'fixed' as const,
        value: scalarMode.value
      };
    case 'range':
      return {
        kind: 'range' as const,
        min: scalarMode.min,
        max: scalarMode.max
      };
    case 'incremental':
      return {
        kind: 'incremental' as const,
        startValue: scalarMode.startValue,
        increment: scalarMode.increment
      };
    default:
      return {
        kind: 'fixed' as const,
        value: 0
      };
  }
};

// Conversion functions for line-vector ModeConfig back to ScalarMode format
const handleLineVectorModeConfigChange = (
  property: 'direction' | 'length' | 'centroid',
  modeConfig: any,
  scatterSettings: ScatterSettings,
  onUpdateScatterSettings: (settings: Partial<ScatterSettings>) => void
) => {
  // Convert ModeConfig back to ScalarMode format
  let newScalarMode: ScalarMode<number>;
  
  switch (modeConfig.kind) {
    case 'fixed':
      newScalarMode = {
        kind: 'fixed' as const,
        value: modeConfig.value
      };
      break;
    case 'range':
      newScalarMode = {
        kind: 'range' as const,
        min: modeConfig.min,
        max: modeConfig.max
      };
      break;
    case 'incremental':
      newScalarMode = {
        kind: 'incremental' as const,
        startValue: modeConfig.startValue,
        increment: modeConfig.increment
      };
      break;
    default:
      newScalarMode = {
        kind: 'fixed' as const,
        value: 0
      };
  }
  
  // Get current line-vector config and merge with the new property
  const currentLineVectorConfig = { 
    ...getDefaultLineVectorConfig(), 
    ...(scatterSettings.shapeSpecific['line-vector'] || {}) 
  };
  
  onUpdateScatterSettings({
    shapeSpecific: {
      ...scatterSettings.shapeSpecific,
      'line-vector': {
        ...currentLineVectorConfig,
        [property]: newScalarMode
      }
    }
  });
};

const handleScatterModeConfigChange = (
  shapeType: string,
  property: string,
  config: any,
  scatterSettings: ScatterSettings,
  onUpdateScatterSettings: (settings: Partial<ScatterSettings>) => void
) => {
  // Handle cornerRadius separately due to different data structure
  if (property === 'cornerRadius') {
    const cornerRadiusData = config.kind === 'fixed' 
      ? { cornerRadiusMode: 'fixed', cornerRadiusValue: config.value }
      : { cornerRadiusMode: 'range', cornerRadiusRange: [config.min, config.max] };
    
    onUpdateScatterSettings({
      shapeSpecific: {
        ...scatterSettings.shapeSpecific,
        [shapeType]: { 
          ...(scatterSettings.shapeSpecific[shapeType as keyof typeof scatterSettings.shapeSpecific] || {}),
          ...cornerRadiusData
        }
      }
    });
    return;
  }

  const propertyMap = {
    edgeCount: 'edgeCountRange',
    pointCount: 'pointCountRange', 
    innerRadius: 'innerRadiusRange',
    segmentCount: 'segmentCountRange',
    curvature: 'curvatureRange',
    spread: 'spreadRange'
  };
  
  const rangeProp = propertyMap[property as keyof typeof propertyMap];
  if (!rangeProp) return;
  
  // Convert ModeConfig back to range for scatterSettings
  let range = config.kind === 'range' ? [config.min, config.max] : [config.value, config.value];
  
  // Handle percentage scaling for inner radius and curvature (convert percentages back to decimals)
  if (property === 'innerRadius' || property === 'curvature') {
    range = [range[0] / 100, range[1] / 100];
  }
  
  onUpdateScatterSettings({
    shapeSpecific: {
      ...scatterSettings.shapeSpecific,
      [shapeType]: { 
        ...(scatterSettings.shapeSpecific[shapeType as keyof typeof scatterSettings.shapeSpecific] || {}),
        [rangeProp]: range
      }
    }
  });
};

// Memoized PrintConfigurationSection - extracted to top level to prevent remounting on parent re-renders
interface PrintConfigurationSectionProps {
  currentArtboard: Artboard;
  onUpdateArtboard: (id: string, updates: Partial<Artboard>) => void;
}

const PrintConfigurationSection = React.memo(function PrintConfigurationSection({ 
  currentArtboard, 
  onUpdateArtboard
}: PrintConfigurationSectionProps) {
  
  const printConfig = currentArtboard.printConfig || DEFAULT_PRINT_CONFIG;
  
  const updatePrintConfig = useCallback((updates: Partial<PrintConfig>) => {
    onUpdateArtboard(currentArtboard.id, {
      printConfig: { ...printConfig, ...updates }
    });
  }, [currentArtboard.id, printConfig, onUpdateArtboard]);
  
  const updateBleed = useCallback((updates: Partial<typeof printConfig.overlays.bleed>) => {
    onUpdateArtboard(currentArtboard.id, {
      printConfig: {
        ...printConfig,
        overlays: {
          ...printConfig.overlays,
          bleed: { ...printConfig.overlays.bleed, ...updates }
        }
      }
    });
  }, [currentArtboard.id, printConfig, onUpdateArtboard]);
  
  const updateSafeZone = useCallback((updates: Partial<typeof printConfig.overlays.safeZone>) => {
    onUpdateArtboard(currentArtboard.id, {
      printConfig: {
        ...printConfig,
        overlays: {
          ...printConfig.overlays,
          safeZone: { ...printConfig.overlays.safeZone, ...updates }
        }
      }
    });
  }, [currentArtboard.id, printConfig, onUpdateArtboard]);
  
  const updatePrintMarks = useCallback((updates: Partial<typeof printConfig.overlays.printMarks>) => {
    onUpdateArtboard(currentArtboard.id, {
      printConfig: {
        ...printConfig,
        overlays: {
          ...printConfig.overlays,
          printMarks: { ...printConfig.overlays.printMarks, ...updates }
        }
      }
    });
  }, [currentArtboard.id, printConfig, onUpdateArtboard]);
  
  const updateOverlayUnit = useCallback((unit: PrintUnitType) => {
    onUpdateArtboard(currentArtboard.id, {
      printConfig: {
        ...printConfig,
        overlays: {
          ...printConfig.overlays,
          overlayUnit: unit
        }
      }
    });
  }, [currentArtboard.id, printConfig, onUpdateArtboard]);
  
  // Get unit label for display
  const overlayUnit = printConfig.overlays.overlayUnit || 'pixels';
  const unitLabel = overlayUnit === 'pixels' ? 'px' : overlayUnit === 'inches' ? 'in' : overlayUnit;
  
  const displayDimensions = getArtboardDisplayDimensions(
    currentArtboard.width,
    currentArtboard.height,
    currentArtboard.dpi ?? 72,
    currentArtboard.unitType ?? 'pixels'
  );
  
  return (
    <div className="space-y-3">
      <div className="text-xs text-purple-300 font-medium">Print Configuration</div>
      
      <div className="space-y-3 p-2 bg-slate-800/30 rounded-lg border border-purple-500/20">
        
        {/* Artboard Info Display - Name, Dimensions, DPI */}
        <div className="flex items-center justify-between text-[10px] bg-slate-900/50 p-2 rounded border border-slate-700">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-400 font-medium truncate max-w-[100px]" title={currentArtboard.name}>
              {currentArtboard.name}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300 whitespace-nowrap">
              {displayDimensions.widthFormatted} × {displayDimensions.heightFormatted} {getUnitLabel(currentArtboard.unitType ?? 'pixels')}
            </span>
          </div>
          <span className="text-slate-400 whitespace-nowrap ml-2">
            {currentArtboard.dpi ?? 72} DPI
          </span>
        </div>
        
        <Separator className="bg-slate-600/30" />
        
        {/* Unified Overlay Unit Selector */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-400 font-medium">Overlay Unit</Label>
          <Select
            value={printConfig.overlays.overlayUnit || 'pixels'}
            onValueChange={(value: PrintUnitType) => updateOverlayUnit(value)}
          >
            <SelectTrigger className="h-7 text-xs bg-slate-700 border-slate-600" data-testid="select-overlay-unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pixels">Pixels (px)</SelectItem>
              <SelectItem value="mm">Millimeters (mm)</SelectItem>
              <SelectItem value="cm">Centimeters (cm)</SelectItem>
              <SelectItem value="inches">Inches (in)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[9px] text-slate-500">Applies to bleed, safe zone, and print marks</p>
        </div>
        
        <Separator className="bg-slate-600/30" />
        
        {/* Bleed Settings */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 font-medium">Bleed</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">Amount</Label>
              <BufferedNumericInput
                value={printConfig.overlays.bleed.amount}
                onCommit={(value) => updateBleed({ amount: value })}
                step={0.1}
                min={0}
                className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200"
                data-testid="input-bleed-amount"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">Color</Label>
              <div className="flex gap-1">
                <input
                  type="color"
                  value={printConfig.overlays.bleed.color || '#00FFFF'}
                  onChange={(e) => updateBleed({ color: e.target.value })}
                  className="h-6 w-8 rounded border border-slate-600 bg-slate-700 cursor-pointer"
                  data-testid="input-bleed-color"
                />
                <Input
                  type="text"
                  value={printConfig.overlays.bleed.color || '#00FFFF'}
                  onChange={(e) => updateBleed({ color: e.target.value })}
                  className="h-6 text-xs bg-slate-700 border-slate-600 text-slate-200 flex-1"
                  data-testid="input-bleed-color-text"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={printConfig.overlays.bleed.display}
                onCheckedChange={(checked) => updateBleed({ display: !!checked })}
                data-testid="checkbox-bleed-display"
              />
              <Label className="text-[10px] text-slate-500">Display</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={printConfig.overlays.bleed.render}
                onCheckedChange={(checked) => updateBleed({ render: !!checked })}
                data-testid="checkbox-bleed-render"
              />
              <Label className="text-[10px] text-slate-500">Render</Label>
            </div>
          </div>
        </div>
        
        <Separator className="bg-slate-600/30" />
        
        {/* Safe Zone Settings */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400 font-medium">Safe Zone</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">Amount</Label>
              <BufferedNumericInput
                value={printConfig.overlays.safeZone.amount}
                onCommit={(value) => updateSafeZone({ amount: value })}
                step={0.1}
                min={0}
                className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200"
                data-testid="input-safe-zone-amount"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">Color</Label>
              <div className="flex gap-1">
                <input
                  type="color"
                  value={printConfig.overlays.safeZone.color || '#FF00FF'}
                  onChange={(e) => updateSafeZone({ color: e.target.value })}
                  className="h-6 w-8 rounded border border-slate-600 bg-slate-700 cursor-pointer"
                  data-testid="input-safe-zone-color"
                />
                <Input
                  type="text"
                  value={printConfig.overlays.safeZone.color || '#FF00FF'}
                  onChange={(e) => updateSafeZone({ color: e.target.value })}
                  className="h-6 text-xs bg-slate-700 border-slate-600 text-slate-200 flex-1"
                  data-testid="input-safe-zone-color-text"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={printConfig.overlays.safeZone.display}
              onCheckedChange={(checked) => updateSafeZone({ display: !!checked })}
              data-testid="checkbox-safe-zone-display"
            />
            <Label className="text-[10px] text-slate-500">Display</Label>
          </div>
        </div>
        
        <Separator className="bg-slate-600/30" />
        
        {/* Print Marks Settings */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-400 font-medium">Print Marks</Label>
            <Select
              value={printConfig.overlays.printMarks.scaleMode || 'none'}
              onValueChange={(value: PrintMarksScaleMode) => updatePrintMarks({ scaleMode: value })}
            >
              <SelectTrigger className="h-6 w-24 text-[10px] bg-slate-700 border-slate-600" data-testid="select-print-marks-scale-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None ({unitLabel})</SelectItem>
                <SelectItem value="percent">Percent (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={printConfig.overlays.printMarks.display}
                onCheckedChange={(checked) => updatePrintMarks({ display: !!checked })}
                data-testid="checkbox-print-marks-display"
              />
              <Label className="text-[10px] text-slate-500">Display</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={printConfig.overlays.printMarks.render}
                onCheckedChange={(checked) => updatePrintMarks({ render: !!checked })}
                data-testid="checkbox-print-marks-render"
              />
              <Label className="text-[10px] text-slate-500">Render</Label>
            </div>
          </div>
          {(printConfig.overlays.printMarks.display || printConfig.overlays.printMarks.render) && (
            <div className="space-y-2 ml-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={printConfig.overlays.printMarks.cropMarks}
                  onCheckedChange={(checked) => updatePrintMarks({ cropMarks: !!checked })}
                  data-testid="checkbox-crop-marks"
                />
                <Label className="text-[10px] text-slate-500">Crop Marks</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={printConfig.overlays.printMarks.registrationMarks}
                  onCheckedChange={(checked) => updatePrintMarks({ registrationMarks: !!checked })}
                  data-testid="checkbox-registration-marks"
                />
                <Label className="text-[10px] text-slate-500">Registration Marks</Label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500">
                    Mark Length ({(printConfig.overlays.printMarks.scaleMode || 'none') === 'percent' ? '%' : unitLabel})
                  </Label>
                  <BufferedNumericInput
                    value={printConfig.overlays.printMarks.markLength}
                    onCommit={(value) => updatePrintMarks({ markLength: (printConfig.overlays.printMarks.scaleMode || 'none') === 'percent' ? value : Math.round(value) })}
                    min={(printConfig.overlays.printMarks.scaleMode || 'none') === 'percent' ? 0.1 : 1}
                    max={100}
                    step={(printConfig.overlays.printMarks.scaleMode || 'none') === 'percent' ? 0.1 : 1}
                    className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200"
                    data-testid="input-mark-length"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500">
                    Mark Offset ({(printConfig.overlays.printMarks.scaleMode || 'none') === 'percent' ? '%' : unitLabel})
                  </Label>
                  <BufferedNumericInput
                    value={printConfig.overlays.printMarks.markOffset}
                    onCommit={(value) => updatePrintMarks({ markOffset: (printConfig.overlays.printMarks.scaleMode || 'none') === 'percent' ? value : Math.round(value) })}
                    min={0}
                    max={50}
                    step={(printConfig.overlays.printMarks.scaleMode || 'none') === 'percent' ? 0.1 : 1}
                    className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200"
                    data-testid="input-mark-offset"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Memoized ShapeTypesContent - extracted to top level to prevent remounting on parent re-renders
interface ShapeTypesContentProps {
  scatterSettings: ScatterSettings;
  onUpdateScatterSettings: (settings: Partial<ScatterSettings>) => void;
  enabledShapeTypes: Set<ShapeType>;
  onToggleShapeType: (type: ShapeType) => void;
  shapeListAccordionOpen: string | undefined;
  setShapeListAccordionOpen: (value: string | undefined) => void;
  openShapeCategories: string[];
  setOpenShapeCategories: (value: string[]) => void;
  expandedShapes: Set<string>;
  toggleShapeExpansion: (shapeType: string) => void;
  setsEnabled: boolean;
  currentGenerationSetId: string | null;
  updateGenerationSetPartial: ((id: string, updates: Partial<GenerationSet>) => Promise<void>) | undefined;
  applyStatus: 'idle' | 'applying' | 'success';
  handleApplyToCurrentSet: () => void;
  onGenerateRandomShapes: () => void;
}

const ShapeTypesContentMemo = React.memo(function ShapeTypesContentMemo({
  scatterSettings,
  onUpdateScatterSettings,
  enabledShapeTypes,
  onToggleShapeType,
  shapeListAccordionOpen,
  setShapeListAccordionOpen,
  openShapeCategories,
  setOpenShapeCategories,
  expandedShapes,
  toggleShapeExpansion,
  setsEnabled,
  currentGenerationSetId,
  updateGenerationSetPartial,
  applyStatus,
  handleApplyToCurrentSet,
  onGenerateRandomShapes
}: ShapeTypesContentProps) {

  const getShapeProperties = useCallback((shapeType: string) => {
    switch (shapeType) {
      case 'polygon':
        return (
          <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
            <StyledModeField
              label="Edge Count"
              config={convertScatterToModeConfig('polygon', 'edgeCount', scatterSettings, [3, 20])}
              onChange={(config) => handleScatterModeConfigChange('polygon', 'edgeCount', config, scatterSettings, onUpdateScatterSettings)}
              bounds={{ min: 3, max: 20 }}
              step={1}
              allowedModes={['fixed', 'range']}
            />
          </div>
        );
      
      case 'line-vector':
        const lineVectorConfig = { 
          ...getDefaultLineVectorConfig(), 
          ...(scatterSettings.shapeSpecific['line-vector'] || {}) 
        };
        return (
          <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
            <StyledModeField
              label="Direction"
              config={convertLineVectorToModeConfig(lineVectorConfig.direction)}
              onChange={(modeConfig) => {
                handleLineVectorModeConfigChange('direction', modeConfig, scatterSettings, onUpdateScatterSettings);
              }}
              bounds={{ min: 0, max: 360 }}
              unit="°"
              step={15}
            />
            
            <Separator className="bg-slate-600" />
            
            <StyledModeField
              label="Length"
              config={convertLineVectorToModeConfig(lineVectorConfig.length)}
              onChange={(modeConfig) => {
                handleLineVectorModeConfigChange('length', modeConfig, scatterSettings, onUpdateScatterSettings);
              }}
              bounds={{ min: 0, max: 500 }}
              unit="px"
              step={5}
            />
            
            <Separator className="bg-slate-600" />
            
            <StyledModeField
              label="Centroid"
              config={convertLineVectorToModeConfig(lineVectorConfig.centroid)}
              onChange={(modeConfig) => {
                handleLineVectorModeConfigChange('centroid', modeConfig, scatterSettings, onUpdateScatterSettings);
              }}
              bounds={{ min: 0, max: 1 }}
              step={0.01}
            />
            
            <Separator className="bg-slate-600" />
            
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Stroke Cap Probabilities (%)</Label>
              <div className="space-y-2">
                {['round', 'square', 'butt'].map((cap) => (
                  <div key={cap} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 capitalize">{cap}</span>
                      <span className="text-slate-400">{(scatterSettings.shapeSpecific['line-vector']?.strokeCapProbabilities as any)?.[cap] || 0}%</span>
                    </div>
                    <BufferedSlider
                      value={[(scatterSettings.shapeSpecific['line-vector']?.strokeCapProbabilities as any)?.[cap] || 0]}
                      onValueCommit={(value) => {
                        const probability = value[0];
                        onUpdateScatterSettings({
                          shapeSpecific: {
                            ...scatterSettings.shapeSpecific,
                            'line-vector': { 
                              ...lineVectorConfig,
                              strokeCapProbabilities: {
                                round: cap === 'round' ? probability : (scatterSettings.shapeSpecific['line-vector']?.strokeCapProbabilities?.round || 0),
                                square: cap === 'square' ? probability : (scatterSettings.shapeSpecific['line-vector']?.strokeCapProbabilities?.square || 0),
                                butt: cap === 'butt' ? probability : (scatterSettings.shapeSpecific['line-vector']?.strokeCapProbabilities?.butt || 0)
                              }
                            }
                          }
                        });
                      }}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'circle':
      case 'ellipse':
        return (
          <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
            <StyledModeField
              label="Segment Count"
              config={convertScatterToModeConfig(shapeType, 'segmentCount', scatterSettings, [16, 32])}
              onChange={(config) => handleScatterModeConfigChange(shapeType, 'segmentCount', config, scatterSettings, onUpdateScatterSettings)}
              bounds={{ min: 8, max: 64 }}
              step={1}
              allowedModes={['fixed', 'range']}
            />
          </div>
        );
      
      case 'bezier':
      case 'smooth-spline':
        return (
          <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
            <StyledModeField
              label="Point Count"
              config={convertScatterToModeConfig(shapeType, 'pointCount', scatterSettings, [3, 6])}
              onChange={(config) => handleScatterModeConfigChange(shapeType, 'pointCount', config, scatterSettings, onUpdateScatterSettings)}
              bounds={{ min: 3, max: 10 }}
              step={1}
              allowedModes={['fixed', 'range']}
            />
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Open/Closed Probability</Label>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Open: {(scatterSettings.shapeSpecific[shapeType as 'bezier' | 'smooth-spline'] as any)?.openProbability ?? 50}%</span>
                  <span className="text-slate-400">Closed: {100 - ((scatterSettings.shapeSpecific[shapeType as 'bezier' | 'smooth-spline'] as any)?.openProbability ?? 50)}%</span>
                </div>
                <BufferedSlider
                  value={[(scatterSettings.shapeSpecific[shapeType as 'bezier' | 'smooth-spline'] as any)?.openProbability ?? 50]}
                  onValueCommit={([value]) => {
                    console.log(`${shapeType} open probability: ${value}%`);
                    onUpdateScatterSettings({
                      shapeSpecific: {
                        ...scatterSettings.shapeSpecific,
                        [shapeType]: { 
                          ...(scatterSettings.shapeSpecific[shapeType as 'bezier' | 'smooth-spline'] || {}),
                          openProbability: value 
                        }
                      }
                    });
                  }}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Stroke Cap Probability</Label>
              <div className="space-y-2">
                {['round', 'square', 'butt'].map((cap) => {
                  const currentValue = (scatterSettings.shapeSpecific[shapeType as 'bezier' | 'smooth-spline'] as any)?.strokeCapProbabilities?.[cap] ?? (cap === 'round' ? 50 : 25);
                  return (
                    <div key={cap} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <Label className="text-slate-300 capitalize">{cap}</Label>
                        <span className="text-slate-400">{currentValue}%</span>
                      </div>
                      <BufferedSlider
                        value={[currentValue]}
                        onValueCommit={([value]) => {
                          console.log(`${shapeType} ${cap} cap: ${value}%`);
                          const currentCaps = (scatterSettings.shapeSpecific[shapeType as 'bezier' | 'smooth-spline'] as any)?.strokeCapProbabilities ?? { round: 50, square: 25, butt: 25 };
                          onUpdateScatterSettings({
                            shapeSpecific: {
                              ...scatterSettings.shapeSpecific,
                              [shapeType]: { 
                                ...(scatterSettings.shapeSpecific[shapeType as 'bezier' | 'smooth-spline'] || {}),
                                strokeCapProbabilities: {
                                  ...currentCaps,
                                  [cap]: value
                                }
                              }
                            }
                          });
                        }}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'star':
        return (
          <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
            <StyledModeField
              label="Point Count"
              config={convertScatterToModeConfig('star', 'pointCount', scatterSettings, [5, 8])}
              onChange={(config) => handleScatterModeConfigChange('star', 'pointCount', config, scatterSettings, onUpdateScatterSettings)}
              bounds={{ min: 5, max: 12 }}
              step={1}
              allowedModes={['fixed', 'range']}
            />
            
            <Separator className="bg-slate-600" />
            
            <StyledModeField
              label="Inner Radius"
              config={convertScatterToModeConfig('star', 'innerRadius', scatterSettings, [30, 70])}
              onChange={(config) => handleScatterModeConfigChange('star', 'innerRadius', config, scatterSettings, onUpdateScatterSettings)}
              bounds={{ min: 10, max: 90 }}
              step={1}
              unit="%"
              allowedModes={['fixed', 'range']}
            />
          </div>
        );

      case 'ring':
        return (
          <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
            <StyledModeField
              label="Inner Radius"
              config={convertScatterToModeConfig('ring', 'innerRadius', scatterSettings, [20, 80])}
              onChange={(config) => handleScatterModeConfigChange('ring', 'innerRadius', config, scatterSettings, onUpdateScatterSettings)}
              bounds={{ min: 10, max: 90 }}
              step={1}
              unit="%"
              allowedModes={['fixed', 'range']}
            />
          </div>
        );

      case 'spline-ring':
        return (
          <div className="space-y-4 p-3 bg-slate-800/30 rounded border border-slate-600">
            <StyledModeField
              label="Inner Radius"
              config={convertScatterToModeConfig('spline-ring', 'innerRadius', scatterSettings, [20, 80])}
              onChange={(config) => handleScatterModeConfigChange('spline-ring', 'innerRadius', config, scatterSettings, onUpdateScatterSettings)}
              bounds={{ min: 10, max: 90 }}
              step={1}
              unit="%"
              allowedModes={['fixed', 'range']}
            />
          </div>
        );

      case 'line':
        return (
          <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
            <StyledModeField
              label="Point Count"
              config={convertScatterToModeConfig('line', 'pointCount', scatterSettings, [2, 4])}
              onChange={(config) => handleScatterModeConfigChange('line', 'pointCount', config, scatterSettings, onUpdateScatterSettings)}
              bounds={{ min: 2, max: 8 }}
              step={1}
              allowedModes={['fixed', 'range']}
            />
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Stroke Cap Probabilities (%)</Label>
              <div className="space-y-2">
                {['round', 'square', 'butt'].map((cap) => (
                  <div key={cap} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 capitalize">{cap}</span>
                      <span className="text-slate-400">{(scatterSettings.shapeSpecific.line?.strokeCapProbabilities as any)?.[cap] || 0}%</span>
                    </div>
                    <BufferedSlider
                      value={[(scatterSettings.shapeSpecific.line?.strokeCapProbabilities as any)?.[cap] || 0]}
                      onValueCommit={(value) => {
                        const probability = value[0];
                        onUpdateScatterSettings({
                          shapeSpecific: {
                            ...scatterSettings.shapeSpecific,
                            line: { 
                              pointCountRange: scatterSettings.shapeSpecific.line?.pointCountRange || [2, 4] as [number, number],
                              strokeCapProbabilities: {
                                round: cap === 'round' ? probability : (scatterSettings.shapeSpecific.line?.strokeCapProbabilities?.round || 0),
                                square: cap === 'square' ? probability : (scatterSettings.shapeSpecific.line?.strokeCapProbabilities?.square || 0),
                                butt: cap === 'butt' ? probability : (scatterSettings.shapeSpecific.line?.strokeCapProbabilities?.butt || 0)
                              }
                            }
                          }
                        });
                      }}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'rectangle':
        return null;
        
      case 'rounded-rectangle':
      case 'rounded-square':
        return (
          <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
            <StyledModeField
              label="Corner Radius"
              config={convertScatterToModeConfig(shapeType, 'cornerRadius', scatterSettings, [0, 20])}
              onChange={(config) => handleScatterModeConfigChange(shapeType, 'cornerRadius', config, scatterSettings, onUpdateScatterSettings)}
              bounds={{ min: 0, max: 50 }}
              step={1}
              unit="px"
              allowedModes={['fixed', 'range']}
            />
          </div>
        );
        
      case 'cubic':
        return (
          <div className="space-y-4 p-3 bg-slate-800/30 rounded border border-slate-600">
            <StyledModeField
              label="Point Count"
              config={convertScatterToModeConfig('cubic', 'pointCount', scatterSettings, [3, 7])}
              onChange={(config) => handleScatterModeConfigChange('cubic', 'pointCount', config, scatterSettings, onUpdateScatterSettings)}
              bounds={{ min: 3, max: 8 }}
              step={1}
              allowedModes={['fixed', 'range']}
            />
            
            <Separator className="bg-slate-600" />
            
            <StyledModeField
              label="Curvature"
              config={convertScatterToModeConfig('cubic', 'curvature', scatterSettings, [20, 80])}
              onChange={(config) => handleScatterModeConfigChange('cubic', 'curvature', config, scatterSettings, onUpdateScatterSettings)}
              bounds={{ min: 10, max: 100 }}
              step={1}
              unit="%"
              allowedModes={['fixed', 'range']}
            />
            
            <Separator className="bg-slate-600" />
            
            <StyledModeField
              label="Curve Spread"
              config={convertScatterToModeConfig('cubic', 'spread', scatterSettings, [40, 120])}
              onChange={(config) => handleScatterModeConfigChange('cubic', 'spread', config, scatterSettings, onUpdateScatterSettings)}
              bounds={{ min: 20, max: 200 }}
              step={10}
              unit="px"
              allowedModes={['fixed', 'range']}
            />
            
            <Separator className="bg-slate-600" />

            <div className="space-y-3">
              <Label className="text-xs text-slate-400">Curve Pattern</Label>
              <Select 
                value={String(scatterSettings.shapeSpecific.cubic?.patternType || 2)} 
                onValueChange={(value) => {
                  onUpdateScatterSettings({
                    shapeSpecific: {
                      ...scatterSettings.shapeSpecific,
                      cubic: { 
                        pointCountRange: scatterSettings.shapeSpecific.cubic?.pointCountRange || [3, 7],
                        curvatureRange: scatterSettings.shapeSpecific.cubic?.curvatureRange || [0.2, 0.8],
                        spreadRange: scatterSettings.shapeSpecific.cubic?.spreadRange || [40, 120],
                        patternType: parseInt(value),
                        openProbability: scatterSettings.shapeSpecific.cubic?.openProbability || 85
                      }
                    }
                  });
                }}
              >
                <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Spiral</SelectItem>
                  <SelectItem value="1">Wave</SelectItem>
                  <SelectItem value="2">Organic</SelectItem>
                  <SelectItem value="3">Arc</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator className="bg-slate-600" />

            <div className="space-y-3">
              <Label className="text-xs text-slate-400">Open Curve Probability: {scatterSettings.shapeSpecific.cubic?.openProbability || 85}%</Label>
              <BufferedSlider
                value={[scatterSettings.shapeSpecific.cubic?.openProbability || 85]}
                onValueCommit={(value) => {
                  const probability = value[0];
                  onUpdateScatterSettings({
                    shapeSpecific: {
                      ...scatterSettings.shapeSpecific,
                      cubic: { 
                        pointCountRange: scatterSettings.shapeSpecific.cubic?.pointCountRange || [3, 7],
                        curvatureRange: scatterSettings.shapeSpecific.cubic?.curvatureRange || [0.2, 0.8],
                        spreadRange: scatterSettings.shapeSpecific.cubic?.spreadRange || [40, 120],
                        patternType: scatterSettings.shapeSpecific.cubic?.patternType || 2,
                        openProbability: probability
                      }
                    }
                  });
                }}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          </div>
        );

      case 'square':
        return null;

      default:
        return null;
    }
  }, [scatterSettings, onUpdateScatterSettings]);

  return (
    <div className="space-y-3">
      {/* Internal accordion to control shape list visibility */}
      <Accordion 
        type="single" 
        collapsible 
        value={shapeListAccordionOpen} 
        onValueChange={setShapeListAccordionOpen}
        className="w-full"
      >
        <AccordionItem value="shape-list" className="border-0">
          <AccordionTrigger className="text-xs text-slate-400 hover:text-slate-300 py-2 hover:no-underline">
            <span>Shape List ({Object.keys(shapeTypeDisplayNames).length} types)</span>
          </AccordionTrigger>
          <AccordionContent className="pb-2">
            <div className="space-y-3">
              {/* Nested accordion for shape categories */}
              <Accordion 
                type="multiple" 
                className="w-full"
                value={openShapeCategories}
                onValueChange={setOpenShapeCategories}
              >
                {Object.entries(SHAPE_CATEGORIES).map(([categoryName, categoryShapes]) => {
                  const enabledInCategory = categoryShapes.filter(shapeType => 
                    enabledShapeTypes.has(shapeType)
                  ).length;
                  
                  return (
                    <AccordionItem key={categoryName} value={categoryName} className="border-slate-700">
                      <AccordionTrigger className="text-xs text-slate-400 hover:text-slate-300 py-2 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span>{categoryName}</span>
                          <span className="text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded text-xs">
                            {enabledInCategory}/{categoryShapes.length}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2 pt-2">
                        {categoryShapes.map((shapeType) => {
                          const displayName = shapeTypeDisplayNames[shapeType];
                          const isEnabled = enabledShapeTypes.has(shapeType);
                          const isExpanded = expandedShapes.has(shapeType);
                          const hasProperties = ['polygon', 'circle', 'ellipse', 'bezier', 'cubic', 'smooth-spline', 'star', 'ring', 'spline-ring', 'line', 'line-vector', 'rounded-rectangle', 'rounded-square'].includes(shapeType);

                          return (
                            <div key={shapeType} className="space-y-2">
                              {/* Shape Toggle Row */}
                              <div className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                                isEnabled ? 'bg-blue-900/30 border border-blue-500/50' : 'bg-slate-800/50 hover:bg-slate-700/50'
                              }`}>
                                <div className="flex items-center space-x-3">
                                  <div className={`w-3 h-3 rounded transition-colors ${
                                    isEnabled ? 'bg-blue-400' : 'bg-slate-500'
                                  }`} />
                                  <Label className={`text-sm transition-colors ${
                                    isEnabled ? 'text-blue-200' : 'text-slate-300'
                                  }`}>{displayName}</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {isEnabled && hasProperties && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleShapeExpansion(shapeType)}
                                      className="p-1 h-6 w-6 hover:bg-slate-700"
                                    >
                                      <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${
                                        isExpanded ? 'rotate-180' : ''
                                      }`} />
                                    </Button>
                                  )}
                                  <Switch
                                    checked={isEnabled}
                                    onCheckedChange={() => onToggleShapeType(shapeType)}
                                    className="data-[state=checked]:bg-blue-600"
                                  />
                                </div>
                              </div>
                              
                              {/* Shape Properties (Accordion Content) */}
                              {isEnabled && isExpanded && hasProperties && (
                                <div className="ml-4">
                                  {getShapeProperties(shapeType)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
              
              {/* Separator inside accordion so it disappears when collapsed */}
              <Separator className="bg-slate-600" />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* All On/Off Buttons */}
      <div className="flex gap-2 py-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const allTypes = Object.keys(shapeTypeDisplayNames) as ShapeType[];
            allTypes.forEach(type => {
              if (!enabledShapeTypes.has(type)) {
                onToggleShapeType(type);
              }
            });
          }}
          className="flex-1 h-8 text-xs bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-200"
        >
          All On
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const enabledTypes = Array.from(enabledShapeTypes);
            enabledTypes.forEach(type => {
              onToggleShapeType(type);
            });
          }}
          className="flex-1 h-8 text-xs bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-200"
        >
          All Off
        </Button>
      </div>

      {/* Shape Count Settings */}
      <div className="space-y-2 pb-6">
        <div className="flex items-center space-x-2">
          <Label className="text-xs text-slate-400">Shape Count</Label>
          <Select 
            value={scatterSettings.shapeCountMode || 'range'} 
            onValueChange={(value) => onUpdateScatterSettings({ shapeCountMode: value as 'range' | 'fixed' })}
          >
            <SelectTrigger className="h-8 w-24 text-xs bg-slate-700 border-slate-600 text-slate-200 px-2 py-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
              <SelectItem value="fixed" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {scatterSettings.shapeCountMode === 'range' ? (
          <BufferedRangeSliderWithNumericInputs
            value={[scatterSettings.minCount, scatterSettings.maxCount] as [number, number]}
            onValueCommit={([min, max]) => onUpdateScatterSettings({ minCount: min, maxCount: max })}
            min={1}
            max={50}
            step={1}
            minLabel="Min"
            maxLabel="Max"
          />
        ) : (
          <BufferedSliderWithNumericInput
            value={scatterSettings.fixedShapeCount || 10}
            onValueCommit={(value) => onUpdateScatterSettings({ fixedShapeCount: value })}
            min={1}
            max={50}
            step={1}
            sliderClassName="w-full pt-2"
          />
        )}
      </div>


      {/* Apply and Generate Buttons */}
      <div className="flex flex-col gap-2">
        {setsEnabled && (
          <Button 
            onClick={applyStatus === 'idle' ? handleApplyToCurrentSet : undefined}
            disabled={!currentGenerationSetId || !updateGenerationSetPartial}
            className={`w-full h-8 ${
              !currentGenerationSetId || !updateGenerationSetPartial
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : applyStatus === 'applying'
                ? 'bg-blue-600 text-white cursor-not-allowed'
                : applyStatus === 'success'
                ? 'bg-green-600 text-white cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } transition-colors duration-200`}
            data-testid="button-apply-shape-types"
          >
            <div className="flex items-center space-x-2">
              {!currentGenerationSetId || !updateGenerationSetPartial ? (
                <AlertTriangle className="w-4 h-4" />
              ) : applyStatus === 'applying' ? (
                <>
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Applying...</span>
                </>
              ) : applyStatus === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Applied!</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Apply</span>
                </>
              )}
            </div>
          </Button>
        )}
        <Button 
          onClick={onGenerateRandomShapes}
          className="w-full h-8 bg-[var(--editor-accent)] hover:bg-purple-700 text-white font-medium"
        >
          <Wand2 className="w-4 h-4 mr-2" />
          {scatterSettings.shapeCountMode === 'fixed' 
            ? `Generate ${scatterSettings.fixedShapeCount || 10} Shapes`
            : `Generate ${scatterSettings.minCount}-${scatterSettings.maxCount} Shapes`
          }
        </Button>
      </div>
    </div>
  );
});

interface SidebarProps {
  enabledShapeTypes: Set<ShapeType>;
  scatterSettings: ScatterSettings;
  generationConfigSettings: BatchConfigSettings;
  selectedCount: number;
  selectedPointsCount: number;
  selectedSegmentsCount: number;
  editMode: 'shapes' | 'points' | 'segments';
  showMultiSelectButton: boolean;
  showSelectedCount: boolean;
  onSetShowMultiSelectButton: (show: boolean) => void;
  onSetShowSelectedCount: (show: boolean) => void;
  canComposeShapes: boolean;
  selectedShapes: Shape[];
  selectedGroups: ShapeGroupClass[];
  shapes: Shape[]; // All shapes for layers panel
  artboards: Artboard[];
  activeArtboard: string;
  onToggleShapeType: (type: ShapeType) => void;
  onUpdateScatterSettings: (settings: Partial<ScatterSettings>) => void;
  onGenerateRandomShapes: () => void;
  onGenerateShapesWithBatchConfig: (count: number, canvasBounds: { x: number; y: number; width: number; height: number }, useDistribution?: boolean, shapeGenerationIndex?: number, shapeSpecificPropertiesOverride?: Record<string, any>, overrides?: { enabledShapeTypes?: Set<ShapeType>; batchConfig?: BatchConfigSettings; scatterSettings?: any }) => Shape[];
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
  onUpdateGenerationConfigSettings: (settings: Partial<BatchConfigSettings>) => void;
  onLoadProject: (data: {
    shapes: any[];
    groups: any[];
    artboard: {
      width: number;
      height: number;
      backgroundColor: string;
    };
  }) => void;
  
  // Generation Sets Management
  generationSets?: GenerationSet[];
  currentGenerationSetId?: string | null;
  shapeCountMode?: ShapeCountMode;
  shapeCountFixed?: number;
  shapeCountRange?: [number, number];
  batchExportCount?: number;
  generationCountMode?: string;
  onGenerationSetsChange?: (sets: GenerationSet[]) => void;
  onCurrentGenerationSetChange?: (setId: string | null) => void;
  onCreateGenerationSet?: (customName?: string, currentUIState?: CurrentUIState) => string;
  onDeleteGenerationSet?: (setId: string) => void;
  generateUniqueSetName?: (baseName?: string) => string;
  onOpenGenerationSetsManager?: () => void;
  isSetsManagerOpen?: boolean;
  onCloseGenerationSetsManager?: () => void;
  onBatchExportCountChange?: (count: number) => void;
  onGenerationCountModeChange?: (mode: 'fixed' | 'range') => void;
  onRestoreUIStateFromSet?: (setId: string) => void;
  onApplyCurrentUIStateToSet?: (setId: string, uiState: CurrentUIState) => Promise<void>;
  updateGenerationSetPartial?: (setId: string, partialUpdate: Partial<GenerationSet>) => Promise<void>;
  hasUnsavedChanges?: (setId: string | null) => boolean;
  areSetsEnabled?: (batchCount?: number, countMode?: string) => boolean;
  
  // App Settings Management
  onSaveAppSettings?: () => void;
  onLoadAppSettings?: () => void;
  appSettingsStatus?: { isSaving?: boolean; isLoading?: boolean; hasSaved?: boolean; hasLoaded?: boolean };
}

export default function Sidebar({
  enabledShapeTypes,
  scatterSettings,
  generationConfigSettings,
  selectedCount,
  selectedPointsCount,
  selectedSegmentsCount,
  editMode,
  showMultiSelectButton,
  showSelectedCount,
  onSetShowMultiSelectButton,
  onSetShowSelectedCount,
  canComposeShapes,
  selectedShapes,
  selectedGroups,
  shapes,
  artboards,
  activeArtboard,
  onToggleShapeType,
  onUpdateScatterSettings,
  onUpdateGenerationConfigSettings,
  onGenerateRandomShapes,
  onGenerateShapesWithBatchConfig,
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
  
  // Generation Sets Management
  generationSets = [],
  currentGenerationSetId = null,
  shapeCountMode = 'fixed' as ShapeCountMode,
  shapeCountFixed = 10,
  shapeCountRange = [5, 15] as [number, number],
  batchExportCount = 1,
  generationCountMode = 'fixed',
  onGenerationSetsChange,
  onCurrentGenerationSetChange,
  onCreateGenerationSet,
  onDeleteGenerationSet,
  generateUniqueSetName,
  onOpenGenerationSetsManager,
  isSetsManagerOpen = false,
  onCloseGenerationSetsManager,
  onBatchExportCountChange,
  onGenerationCountModeChange,
  onRestoreUIStateFromSet,
  onApplyCurrentUIStateToSet,
  updateGenerationSetPartial,
  hasUnsavedChanges,
  areSetsEnabled,
  
  // App Settings Management
  onSaveAppSettings,
  onLoadAppSettings,
  appSettingsStatus = {}
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activePopover, setActivePopover] = useState<string | null>(null);
  
  // Track if sidebar settings have been restored to prevent save loops
  const hasRestoredSidebar = useRef(false);
  const [moveX, setMoveX] = useState(0);
  const [moveY, setMoveY] = useState(0);
  const [scaleX, setScaleX] = useState(100);
  const [scaleY, setScaleY] = useState(100);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  
  // Loading states for save/load/export operations
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [applyStatus, setApplyStatus] = useState<'idle' | 'applying' | 'success'>('idle');
  
  // Project load dialog state
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [pendingProjectFile, setPendingProjectFile] = useState<File | null>(null);
  const [dontAskAgainPref, setDontAskAgainPref] = useState(false);
  
  // Shape set presets state
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [isSavePresetDialogOpen, setIsSavePresetDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [cleanPresetEnabled, setCleanPresetEnabled] = useState(false);
  const [autoLoadAfterSave, setAutoLoadAfterSave] = useState(false);
  const [isDeletePresetDialogOpen, setIsDeletePresetDialogOpen] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<string>('');
  
  // Export settings state (lifted from ExportSaveContent for persistence)
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'webp' | 'avif' | 'bmp' | 'pdf' | 'tiff'>('png');
  const [exportQuality, setExportQuality] = useState(90);
  const [exportScale, setExportScale] = useState(1);
  const [exportAutoScaleFromDpi, setExportAutoScaleFromDpi] = useState(false);
  const [exportMode, setExportMode] = useState<'selection' | 'artboard' | 'all'>('all');
  const [selectedArtboardForExport, setSelectedArtboardForExport] = useState<string>('');
  
  // TIFF pre-flight modal state
  const [isTiffPreflightOpen, setIsTiffPreflightOpen] = useState(false);
  const [pendingTiffExport, setPendingTiffExport] = useState<boolean>(false);
  const pendingTiffExportRef = useRef<(() => void) | null>(null);
  const [isServerExportingGlobal, setIsServerExportingGlobal] = useState(false);
  
  // Global repetition settings for generation sets
  const [globalRepetitionMode, setGlobalRepetitionMode] = useState<'fixed' | 'range'>('fixed');
  const [globalRepetitionValue, setGlobalRepetitionValue] = useState<number>(0);
  const [globalRepetitionRange, setGlobalRepetitionRange] = useState<[number, number]>([0, 0]);
  
  // Ref to skip UI restoration after Apply button (prevents scroll jump)
  const skipNextRestoreRef = useRef(false);
  
  // Sets Manager Dialog state is now managed centrally via props

  // Get user preferences for sidebar section visibility
  const { sidebarSections, isLoading: isLoadingPreferences, appSettingsDefaults, saveAppSettings, skipLoadProjectDialog, updateSkipLoadDialog } = useUserPreferences();
  
  // Get export settings from user preferences
  const { exportSettings, updateExportSettings, isLoading: isLoadingExportSettings } = useExportSettings();
  
  // Shape set presets hook
  const { presets, savePreset, deletePreset, isSaving, isDeleting } = useShapeSetPresets();
  
  // Toast notifications
  const { toast } = useToast();

  // Use centralized generation sets state from parent (memoized to prevent re-renders)
  const effectiveGenerationSets = useMemo(() => generationSets || [], [generationSets]);
  const effectiveCurrentSetId = currentGenerationSetId;

  // Preset handlers - memoized to prevent recreation on every render
  // Use refs for frequently changing values to avoid recreating the callback
  const newPresetNameRef = useRef('');
  useEffect(() => {
    newPresetNameRef.current = newPresetName;
  }, [newPresetName]);
  
  // Real-time validation for duplicate preset names
  const isPresetNameDuplicate = useMemo(() => {
    const name = newPresetName.trim();
    if (!name) return false;
    return presets.some(p => p.presetName.toLowerCase() === name.toLowerCase());
  }, [newPresetName, presets]);

  const cleanPresetEnabledRef = useRef(false);
  useEffect(() => {
    cleanPresetEnabledRef.current = cleanPresetEnabled;
  }, [cleanPresetEnabled]);
  
  const autoLoadAfterSaveRef = useRef(false);
  useEffect(() => {
    autoLoadAfterSaveRef.current = autoLoadAfterSave;
  }, [autoLoadAfterSave]);
  
  const handleSavePreset = useCallback(async () => {
    const name = newPresetNameRef.current;
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Preset name required",
        description: "Please enter a name for the preset.",
      });
      return;
    }
    
    // Check for duplicate preset names
    const isDuplicate = presets.some(p => p.presetName.toLowerCase() === name.trim().toLowerCase());
    if (isDuplicate) {
      toast({
        variant: "destructive",
        title: "Preset name already exists",
        description: "A preset with this name already exists. Please choose a different name.",
      });
      return;
    }
    
    try {
      // Filter out disabled sets if clean preset is enabled
      const setsToSave = cleanPresetEnabledRef.current 
        ? effectiveGenerationSets.filter(set => set.enabled)
        : effectiveGenerationSets;
      
      // Prevent saving if clean preset would result in no sets
      if (cleanPresetEnabledRef.current && setsToSave.length === 0) {
        toast({
          variant: "destructive",
          title: "No enabled sets",
          description: "Cannot save a clean preset with no enabled sets. Enable at least one set first.",
        });
        return;
      }
      
      // Determine the current set ID - if the current set was filtered out, use the first enabled set
      let currentSetIdToSave = effectiveCurrentSetId;
      if (cleanPresetEnabledRef.current && currentSetIdToSave) {
        const currentSetStillExists = setsToSave.some(set => set.id === currentSetIdToSave);
        if (!currentSetStillExists && setsToSave.length > 0) {
          currentSetIdToSave = setsToSave[0].id;
        }
      }
      
      await savePreset(name, setsToSave, currentSetIdToSave);
      
      const savedCount = setsToSave.length;
      const filteredCount = effectiveGenerationSets.length - savedCount;
      const description = cleanPresetEnabledRef.current && filteredCount > 0
        ? `"${name}" saved with ${savedCount} enabled set${savedCount !== 1 ? 's' : ''} (${filteredCount} disabled set${filteredCount !== 1 ? 's' : ''} excluded).`
        : `"${name}" has been saved successfully.`;
      
      toast({
        title: "Preset saved",
        description,
      });
      
      // Auto-load the saved preset if enabled
      if (autoLoadAfterSaveRef.current && cleanPresetEnabledRef.current) {
        onGenerationSetsChange?.(setsToSave);
        onCurrentGenerationSetChange?.(currentSetIdToSave || null);
        toast({
          title: "Preset loaded",
          description: `Clean preset "${name}" has been applied.`,
        });
      }
      
      setIsSavePresetDialogOpen(false);
      setNewPresetName('');
      setCleanPresetEnabled(false);
      setAutoLoadAfterSave(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Failed to save preset. Please try again.",
      });
    }
  }, [presets, savePreset, effectiveGenerationSets, effectiveCurrentSetId, onGenerationSetsChange, onCurrentGenerationSetChange, toast]);
  
  const handleLoadPreset = useCallback(() => {
    const preset = presets.find(p => p.id === selectedPresetId);
    if (!preset) return;
    
    try {
      // Update generation sets with preset data
      onGenerationSetsChange?.(preset.generationSetsData as GenerationSet[]);
      onCurrentGenerationSetChange?.(preset.currentSetId || null);
      
      toast({
        title: "Preset loaded",
        description: `"${preset.presetName}" has been loaded successfully.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Load failed",
        description: "Failed to load preset. Please try again.",
      });
    }
  }, [presets, selectedPresetId, onGenerationSetsChange, onCurrentGenerationSetChange, toast]);
  
  const presetToDeleteRef = useRef('');
  useEffect(() => {
    presetToDeleteRef.current = presetToDelete;
  }, [presetToDelete]);
  
  const handleDeletePreset = useCallback(async () => {
    const idToDelete = presetToDeleteRef.current;
    try {
      const preset = presets.find(p => p.id === idToDelete);
      await deletePreset(idToDelete);
      toast({
        title: "Preset deleted",
        description: `"${preset?.presetName}" has been deleted.`,
      });
      setIsDeletePresetDialogOpen(false);
      setPresetToDelete('');
      setSelectedPresetId('');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Failed to delete preset. Please try again.",
      });
    }
  }, [presets, deletePreset, toast]);

  // Generation sets are enabled when the main toggle is enabled
  // This allows users to save/load generation configurations with any count mode
  const effectiveMode = generationCountMode ?? 'fixed';
  const setsEnabled = exportSettings.generationSetsEnabled;
  
  // Define section order based on displayOrder from user preferences
  const sectionOrder = useMemo(() => {
    const sections = [
      'shapes', 'selection', 'layers', 'properties', 'composition', 
      'align-distribute', 'artboards', 'colors', 'project', 'export'
    ] as const;
    
    return sections
      .map(id => ({
        id,
        displayOrder: sidebarSections[id as keyof typeof sidebarSections]?.displayOrder ?? 999,
        enabled: sidebarSections[id as keyof typeof sidebarSections]?.enabled ?? false
      }))
      .filter(item => item.enabled) // Only include enabled sections
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(item => item.id);
  }, [sidebarSections]);

  // Auto-load app settings on mount (once only)
  // Note: Artboard and canvas restoration is handled by useShapeEditor
  useEffect(() => {
    if (appSettingsDefaults && !isLoadingPreferences && !hasRestoredSidebar.current) {
      console.log('Auto-loading app settings:', appSettingsDefaults);
      hasRestoredSidebar.current = true;
      
      setExportFormat(appSettingsDefaults.exportFormat);
      setExportQuality(appSettingsDefaults.exportQuality);
      setExportScale(appSettingsDefaults.exportScale);
      setExportAutoScaleFromDpi(appSettingsDefaults.exportAutoScaleFromDpi ?? false);
      setExportMode(appSettingsDefaults.exportMode);
      setIsCollapsed(appSettingsDefaults.sidebarCollapsed ?? false);
    }
  }, [appSettingsDefaults, isLoadingPreferences]);

  // Save sidebar collapsed state when it changes (debounced)
  useEffect(() => {
    if (!appSettingsDefaults || !hasRestoredSidebar.current) return;
    
    const timeoutId = setTimeout(() => {
      saveAppSettings.mutate({
        ...appSettingsDefaults,
        sidebarCollapsed: isCollapsed,
      });
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [isCollapsed]);

  // Note: Print configuration auto-save is handled in useShapeEditor along with 
  // other artboard settings. This keeps all artboard-related persistence in one place.

  // Save app settings handler
  const handleSaveAppSettings = useCallback(async () => {
    const activeBoard = artboards.find(a => a.id === activeArtboard);
    if (!activeBoard) {
      console.error('No active artboard found');
      return;
    }
    
    // Get print configuration from active artboard (or use defaults)
    const printConfig = activeBoard.printConfig || DEFAULT_PRINT_CONFIG;
    
    const settings = {
      exportFormat,
      exportQuality,
      exportScale,
      exportAutoScaleFromDpi,
      exportMode,
      artboardName: activeBoard.name,
      artboardWidth: activeBoard.width,
      artboardHeight: activeBoard.height,
      artboardBackgroundColor: activeBoard.backgroundColor || '#ffffff',
      artboardGridColor: activeBoard.gridColor || '#cccccc',
      artboardDisplayGrid: activeBoard.displayGrid || false,
      artboardDisplayBorder: activeBoard.displayBorder !== undefined ? activeBoard.displayBorder : true,
      artboardDpi: activeBoard.dpi ?? 72,
      artboardUnitType: activeBoard.unitType ?? 'pixels',
      artboardDisplayName: activeBoard.displayName !== false,
      artboardDisplayDimensions: activeBoard.displayDimensions === true,
      artboardDisplayResolution: activeBoard.displayResolution === true,
      canvasPanX: appSettingsDefaults?.canvasPanX ?? 0,
      canvasPanY: appSettingsDefaults?.canvasPanY ?? 0,
      canvasZoom: appSettingsDefaults?.canvasZoom ?? 1,
      sidebarCollapsed: isCollapsed,
      showMultiSelectButton: appSettingsDefaults?.showMultiSelectButton ?? true,
      showSelectedCount: appSettingsDefaults?.showSelectedCount ?? true,
      printOverlayUnit: printConfig.overlays.overlayUnit || 'pixels',
      printBleedAmount: printConfig.overlays.bleed.amount,
      printBleedDisplay: printConfig.overlays.bleed.display,
      printBleedRender: printConfig.overlays.bleed.render,
      printBleedColor: printConfig.overlays.bleed.color || '#00FFFF',
      printSafeZoneAmount: printConfig.overlays.safeZone.amount,
      printSafeZoneDisplay: printConfig.overlays.safeZone.display,
      printSafeZoneColor: printConfig.overlays.safeZone.color || '#FF00FF',
      printMarksCropMarks: printConfig.overlays.printMarks.cropMarks,
      printMarksRegistrationMarks: printConfig.overlays.printMarks.registrationMarks,
      printMarksMarkLength: printConfig.overlays.printMarks.markLength,
      printMarksMarkOffset: printConfig.overlays.printMarks.markOffset,
      printMarksDisplay: printConfig.overlays.printMarks.display,
      printMarksRender: printConfig.overlays.printMarks.render,
      printMarksScaleMode: printConfig.overlays.printMarks.scaleMode || 'none',
    };
    
    console.log('Saving app settings:', settings);
    await saveAppSettings.mutateAsync(settings);
  }, [exportFormat, exportQuality, exportScale, exportAutoScaleFromDpi, exportMode, artboards, activeArtboard, saveAppSettings, isCollapsed, appSettingsDefaults]);

  // Load app settings handler
  const handleLoadAppSettings = useCallback(() => {
    if (appSettingsDefaults) {
      console.log('Loading app settings:', appSettingsDefaults);
      setExportFormat(appSettingsDefaults.exportFormat);
      setExportQuality(appSettingsDefaults.exportQuality);
      setExportScale(appSettingsDefaults.exportScale);
      setExportAutoScaleFromDpi(appSettingsDefaults.exportAutoScaleFromDpi ?? false);
      setExportMode(appSettingsDefaults.exportMode);
      
      // Build print configuration from app settings (if available)
      const printConfig: PrintConfig = {
        outputSpecs: {
          dpi: appSettingsDefaults.artboardDpi ?? DEFAULT_PRINT_CONFIG.outputSpecs.dpi,
          unitType: appSettingsDefaults.artboardUnitType ?? DEFAULT_PRINT_CONFIG.outputSpecs.unitType,
        },
        overlays: {
          overlayUnit: appSettingsDefaults.printOverlayUnit ?? DEFAULT_PRINT_CONFIG.overlays.overlayUnit,
          bleed: {
            amount: appSettingsDefaults.printBleedAmount ?? DEFAULT_PRINT_CONFIG.overlays.bleed.amount,
            display: appSettingsDefaults.printBleedDisplay ?? DEFAULT_PRINT_CONFIG.overlays.bleed.display,
            render: appSettingsDefaults.printBleedRender ?? DEFAULT_PRINT_CONFIG.overlays.bleed.render,
            color: appSettingsDefaults.printBleedColor ?? DEFAULT_PRINT_CONFIG.overlays.bleed.color,
          },
          safeZone: {
            amount: appSettingsDefaults.printSafeZoneAmount ?? DEFAULT_PRINT_CONFIG.overlays.safeZone.amount,
            display: appSettingsDefaults.printSafeZoneDisplay ?? DEFAULT_PRINT_CONFIG.overlays.safeZone.display,
            color: appSettingsDefaults.printSafeZoneColor ?? DEFAULT_PRINT_CONFIG.overlays.safeZone.color,
          },
          printMarks: {
            cropMarks: appSettingsDefaults.printMarksCropMarks ?? DEFAULT_PRINT_CONFIG.overlays.printMarks.cropMarks,
            registrationMarks: appSettingsDefaults.printMarksRegistrationMarks ?? DEFAULT_PRINT_CONFIG.overlays.printMarks.registrationMarks,
            markLength: appSettingsDefaults.printMarksMarkLength ?? DEFAULT_PRINT_CONFIG.overlays.printMarks.markLength,
            markOffset: appSettingsDefaults.printMarksMarkOffset ?? DEFAULT_PRINT_CONFIG.overlays.printMarks.markOffset,
            display: appSettingsDefaults.printMarksDisplay ?? DEFAULT_PRINT_CONFIG.overlays.printMarks.display,
            render: appSettingsDefaults.printMarksRender ?? DEFAULT_PRINT_CONFIG.overlays.printMarks.render,
            scaleMode: appSettingsDefaults.printMarksScaleMode ?? DEFAULT_PRINT_CONFIG.overlays.printMarks.scaleMode,
          },
          background: DEFAULT_PRINT_CONFIG.overlays.background,
        },
      };
      
      // Apply artboard settings to the active artboard
      const activeBoard = artboards.find(a => a.id === activeArtboard);
      if (activeBoard && onUpdateArtboard) {
        onUpdateArtboard(activeArtboard, {
          width: appSettingsDefaults.artboardWidth,
          height: appSettingsDefaults.artboardHeight,
          backgroundColor: appSettingsDefaults.artboardBackgroundColor,
          gridColor: appSettingsDefaults.artboardGridColor,
          displayGrid: appSettingsDefaults.artboardDisplayGrid,
          displayBorder: appSettingsDefaults.artboardDisplayBorder,
          dpi: appSettingsDefaults.artboardDpi,
          unitType: appSettingsDefaults.artboardUnitType,
          displayName: appSettingsDefaults.artboardDisplayName,
          displayDimensions: appSettingsDefaults.artboardDisplayDimensions,
          displayResolution: appSettingsDefaults.artboardDisplayResolution,
          printConfig: printConfig,
        });
      }
    }
  }, [appSettingsDefaults, artboards, activeArtboard, onUpdateArtboard]);

  // Project load handler - loads project file after user confirms in dialog
  const handleLoadProjectFile = useCallback(async (file: File, clearSettings: boolean = false) => {
    setIsLoadingProject(true);
    try {
      const { ProjectManager } = await import('../lib/projectManager');
      const projectData = await ProjectManager.loadProject(file);
      console.log('Project loaded:', projectData);
      
      // If clearing settings, reset to defaults
      if (clearSettings) {
        console.log('🔄 Clearing settings and resetting to defaults...');
        
        // Reset export settings to defaults
        setExportFormat('png');
        setExportQuality(90);
        setExportScale(1);
        setExportAutoScaleFromDpi(false);
        setExportMode('all');
        
        // Clear generation sets (start fresh)
        if (onClearAll) {
          onClearAll();
        }
        
        console.log('✅ Settings cleared, loading project fresh');
      }
      
      if (onLoadProject) {
        onLoadProject({
          shapes: projectData.shapes,
          groups: projectData.groups,
          artboard: projectData.artboard
        });
        console.log('✅ Project loaded successfully!');
      } else {
        console.warn('⚠️ onLoadProject callback not available');
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('❌ Failed to load project:', error);
    } finally {
      setIsLoadingProject(false);
    }
  }, [onLoadProject, onClearAll]);

  // Calculate effective export scale (auto from DPI or manual)
  const effectiveExportScale = useMemo(() => {
    if (exportAutoScaleFromDpi) {
      const activeBoard = artboards.find(a => a.id === activeArtboard);
      const dpi = activeBoard?.dpi ?? 72;
      return Number((dpi / 72).toFixed(2));
    }
    return exportScale;
  }, [exportAutoScaleFromDpi, exportScale, artboards, activeArtboard]);

  // Auto-select artboard when export mode changes to 'artboard'
  useEffect(() => {
    if (exportMode === 'artboard' && artboards.length > 0) {
      // If no artboard is selected, auto-select one
      if (!selectedArtboardForExport) {
        // First try to select the active artboard
        const activeBoard = artboards.find(a => a.id === activeArtboard);
        if (activeBoard) {
          setSelectedArtboardForExport(activeBoard.id);
        } else {
          // Otherwise select the first artboard
          setSelectedArtboardForExport(artboards[0].id);
        }
      }
    }
  }, [exportMode, artboards, activeArtboard, selectedArtboardForExport]);

  // Generation sets handlers - now simplified since validation logic is centralized
  const handleSetChange = useCallback((setId: string | null) => {
    // The enhanced validation and state restoration logic is now handled centrally
    // in useShapeEditor's handleCurrentGenerationSetChange function
    onCurrentGenerationSetChange?.(setId);
  }, [onCurrentGenerationSetChange]);


  const handleDeleteSet = useCallback((setId: string) => {
    // Call the actual handler from parent component
    onDeleteGenerationSet?.(setId);
    console.log('Deleted generation set:', setId);
  }, [onDeleteGenerationSet]);

  const handleOpenManager = useCallback(() => {
    onOpenGenerationSetsManager?.();
  }, [onOpenGenerationSetsManager]);

  // Define handlePopoverToggle function
  const handlePopoverToggle = (sectionId: string) => {
    setActivePopover(activePopover === sectionId ? null : sectionId);
  };

  // Helper functions for content sections
  function SelectionModesContent() {
    const editModes = [
      { id: 'shapes', name: 'Shapes', icon: MousePointer, desc: 'Select and transform entire shapes' },
      { id: 'points', name: 'Points', icon: Edit3, desc: 'Edit individual points' },
      { id: 'segments', name: 'Segments', icon: Activity, desc: 'Edit curve segments' }
    ];

    return (
      <div className="space-y-3">
        <div className="text-sm text-slate-400">
          Current Mode: <span className="text-white font-medium">{editMode}</span>
        </div>

        {editModes.map((mode) => {
          const IconComponent = mode.icon;
          const isActive = editMode === mode.id;

          return (
            <div key={mode.id} className={`p-3 rounded-lg transition-colors cursor-pointer ${
              isActive ? 'bg-orange-900/30 border border-orange-500/50' : 'bg-slate-800/50 hover:bg-slate-700/50'
            }`} onClick={() => onSetEditMode(mode.id as any)}>
              <div className="flex items-center space-x-3">
                <IconComponent className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-orange-400' : 'text-slate-400'
                }`} />
                <div>
                  <div className={`text-sm font-medium transition-colors ${
                    isActive ? 'text-orange-200' : 'text-slate-300'
                  }`}>{mode.name}</div>
                  <div className="text-xs text-slate-500">{mode.desc}</div>
                </div>
              </div>
            </div>
          );
        })}

        {editMode === 'points' && selectedPointsCount > 0 && (
          <div className="p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <div className="text-xs text-blue-200">
              {selectedPointsCount} point{selectedPointsCount !== 1 ? 's' : ''} selected
            </div>
          </div>
        )}

        {editMode === 'segments' && selectedSegmentsCount > 0 && (
          <div className="p-2 bg-green-500/20 border border-green-500/30 rounded-lg">
            <div className="text-xs text-green-200">
              {selectedSegmentsCount} segment{selectedSegmentsCount !== 1 ? 's' : ''} selected
            </div>
          </div>
        )}

        <Separator className="bg-slate-700" />

        <div className="space-y-3">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            UI Element Visibility
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
            <Label htmlFor="toggle-multi-select" className="text-sm text-slate-300 cursor-pointer">
              Show multi-select button
            </Label>
            <Switch
              id="toggle-multi-select"
              checked={showMultiSelectButton}
              onCheckedChange={onSetShowMultiSelectButton}
              data-testid="toggle-multi-select-button"
            />
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
            <Label htmlFor="toggle-selected-count" className="text-sm text-slate-300 cursor-pointer">
              Show selected count
            </Label>
            <Switch
              id="toggle-selected-count"
              checked={showSelectedCount}
              onCheckedChange={onSetShowSelectedCount}
              data-testid="toggle-selected-count"
            />
          </div>
        </div>
      </div>
    );
  }

  function ArtboardsContent() {
    const [customWidth, setCustomWidth] = useState(8.27); // Width in current unit (A4 default)
    const [customHeight, setCustomHeight] = useState(11.69); // Height in current unit (A4 default)
    const [customName, setCustomName] = useState('Custom Artboard');
    const [customBackgroundColor, setCustomBackgroundColor] = useState('#ffffff');
    const [customLinkedDimensions, setCustomLinkedDimensions] = useState(true);
    const [customAspectRatio, setCustomAspectRatio] = useState('1:√2'); // A4 aspect ratio
    const [customUnit, setCustomUnit] = useState<UnitType>('inches');
    const [customDpi, setCustomDpi] = useState(300); // Default to print-quality 300 DPI
    
    // Persist tab and category in localStorage
    const [selectedPresetCategory, setSelectedPresetCategory] = useState<PresetCategory>(() => {
      try {
        const saved = localStorage.getItem('artboard-preset-category');
        return (saved as PresetCategory) || 'paper';
      } catch {
        return 'paper';
      }
    });
    const [activeTab, setActiveTab] = useState<'custom' | 'presets'>(() => {
      try {
        const saved = localStorage.getItem('artboard-create-tab');
        return (saved === 'custom' || saved === 'presets') ? saved : 'custom';
      } catch {
        return 'custom';
      }
    });
    
    // Parent tab state (Active vs Create) with localStorage persistence
    const [parentTab, setParentTab] = useState<'active' | 'create'>(() => {
      try {
        const saved = localStorage.getItem('artboard-parent-tab');
        return (saved === 'active' || saved === 'create') ? saved : 'active';
      } catch {
        return 'active';
      }
    });
    
    // Persist parent tab selection to localStorage
    const handleParentTabChange = (tab: 'active' | 'create') => {
      setParentTab(tab);
      try {
        localStorage.setItem('artboard-parent-tab', tab);
      } catch {}
    };
    
    // Persist nested tab selection to localStorage
    const handleTabChange = (tab: 'custom' | 'presets') => {
      setActiveTab(tab);
      try {
        localStorage.setItem('artboard-create-tab', tab);
      } catch {}
    };
    
    // Persist category selection to localStorage
    const handleCategoryChange = (category: PresetCategory) => {
      setSelectedPresetCategory(category);
      try {
        localStorage.setItem('artboard-preset-category', category);
      } catch {}
    };
    
    // Calculate live pixel dimensions from physical dimensions and DPI
    const livePixelWidth = customUnit === 'pixels' 
      ? Math.round(customWidth) 
      : Math.round(unitToPixels(customWidth, customDpi, customUnit));
    const livePixelHeight = customUnit === 'pixels' 
      ? Math.round(customHeight) 
      : Math.round(unitToPixels(customHeight, customDpi, customUnit));
    
    const handleWidthChange = (newWidth: number) => {
      if (customLinkedDimensions && customWidth > 0) {
        const aspectRatio = customWidth / customHeight;
        const newHeight = newWidth / aspectRatio;
        setCustomWidth(newWidth);
        setCustomHeight(newHeight);
      } else {
        setCustomWidth(newWidth);
        setCustomAspectRatio('custom');
      }
    };
    
    const handleHeightChange = (newHeight: number) => {
      if (customLinkedDimensions && customHeight > 0) {
        const aspectRatio = customWidth / customHeight;
        const newWidth = newHeight * aspectRatio;
        setCustomWidth(newWidth);
        setCustomHeight(newHeight);
      } else {
        setCustomHeight(newHeight);
        setCustomAspectRatio('custom');
      }
    };
    
    const handleAspectRatioChange = (value: string) => {
      if (value === 'custom') {
        setCustomAspectRatio('custom');
      } else {
        const [w, h] = value.split(':').map(Number);
        const aspectRatioValue = w / h;
        const newHeight = customWidth / aspectRatioValue;
        setCustomHeight(newHeight);
        setCustomAspectRatio(value);
        setCustomLinkedDimensions(true);
      }
    };
    
    const handleCreateCustomArtboard = () => {
      const customPreset = {
        name: customName,
        width: livePixelWidth,
        height: livePixelHeight,
        dpi: customDpi,
        unitType: customUnit,
        backgroundColor: customBackgroundColor,
        category: 'custom' as const,
        description: `${livePixelWidth}×${livePixelHeight}px at ${customDpi} DPI`
      };
      onAddArtboard(customPreset);
    };
    
    // Handle selecting a preset - populate the form with preset values then switch to custom tab
    const handlePresetSelect = (preset: ArtboardPresetPhysical) => {
      setCustomName(preset.name);
      if (preset.nativeWidthPx !== undefined && preset.nativeHeightPx !== undefined) {
        setCustomWidth(preset.nativeWidthPx);
        setCustomHeight(preset.nativeHeightPx);
        setCustomUnit('pixels');
      } else {
        setCustomWidth(preset.widthInches);
        setCustomHeight(preset.heightInches);
        setCustomUnit('inches');
      }
      setCustomAspectRatio(preset.aspectRatio);
      setCustomLinkedDimensions(true);
      setActiveTab('custom');
    };
    
    // Handle quick create from preset - create artboard immediately
    const handlePresetQuickCreate = (preset: ArtboardPresetPhysical) => {
      const pixelDims = getPresetPixelDimensions(preset, customDpi);
      const newPreset = {
        name: preset.name,
        width: pixelDims.width,
        height: pixelDims.height,
        dpi: customDpi,
        unitType: 'inches' as const,
        backgroundColor: customBackgroundColor,
        category: 'print' as const,
        description: `${pixelDims.width}×${pixelDims.height}px at ${customDpi} DPI`
      };
      onAddArtboard(newPreset);
    };
    
    // Handle unit change - convert existing values to new unit via pixels as intermediate
    const handleUnitChange = (newUnit: UnitType) => {
      if (newUnit === customUnit) return;
      
      // Step 1: Convert current values to pixels (using current unit)
      const widthPixels = customUnit === 'pixels' 
        ? customWidth 
        : unitToPixels(customWidth, customDpi, customUnit);
      const heightPixels = customUnit === 'pixels' 
        ? customHeight 
        : unitToPixels(customHeight, customDpi, customUnit);
      
      // Step 2: Convert pixels to new unit
      if (newUnit === 'pixels') {
        setCustomWidth(Math.round(widthPixels));
        setCustomHeight(Math.round(heightPixels));
      } else {
        const newWidth = pixelsToUnit(widthPixels, customDpi, newUnit);
        const newHeight = pixelsToUnit(heightPixels, customDpi, newUnit);
        
        // Format based on unit type
        if (newUnit === 'mm') {
          setCustomWidth(Math.round(newWidth));
          setCustomHeight(Math.round(newHeight));
        } else {
          setCustomWidth(Number(newWidth.toFixed(2)));
          setCustomHeight(Number(newHeight.toFixed(2)));
        }
      }
      
      setCustomUnit(newUnit);
    };

    return (
      <div className="space-y-4">
        {/* Section 1: Existing Artboards (at top) */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Artboards</Label>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {artboards.map((artboard) => {
              const isActive = artboard.id === activeArtboard;
              return (
                <div 
                  key={artboard.id} 
                  className={`flex items-center justify-between p-2 rounded text-xs transition-colors cursor-pointer ${
                    isActive 
                      ? 'bg-orange-500/30 border border-orange-500/50' 
                      : 'bg-slate-800/50 hover:bg-slate-700/50 border border-transparent'
                  }`}
                  onClick={() => onSelectArtboard(artboard.id)}
                  data-testid={`artboard-item-${artboard.id}`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isActive && (
                      <CheckCircle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`truncate ${isActive ? 'text-orange-200 font-medium' : 'text-slate-300'}`}>
                        {artboard.name}
                      </div>
                      <div className="text-slate-500 text-[10px]">{artboard.width}×{artboard.height}px</div>
                    </div>
                  </div>
                  <div className="flex space-x-1 flex-shrink-0">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteArtboard(artboard.id);
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                      disabled={artboards.length <= 1}
                      data-testid={`button-delete-artboard-${artboard.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {artboards.length === 0 && (
            <div className="text-xs text-slate-500 text-center py-4">
              No artboards created
            </div>
          )}
        </div>

        <Separator className="bg-slate-700" />

        {/* Parent Tabs: Active / Create */}
        <Tabs value={parentTab} onValueChange={(v) => handleParentTabChange(v as 'active' | 'create')} className="w-full">
          <TabsList className="flex gap-2 w-full bg-transparent p-0 h-auto">
            <TabsTrigger 
              value="active" 
              className="flex-1 text-xs text-slate-400 rounded-md border border-slate-600 bg-slate-800 data-[state=active]:bg-blue-600 data-[state=active]:border-blue-600 data-[state=active]:text-white h-8"
              data-testid="tab-active-artboard"
            >
              Active
            </TabsTrigger>
            <TabsTrigger 
              value="create" 
              className="flex-1 text-xs text-slate-400 rounded-md border border-slate-600 bg-slate-800 data-[state=active]:bg-blue-600 data-[state=active]:border-blue-600 data-[state=active]:text-white h-8"
              data-testid="tab-create-artboard"
            >
              Create
            </TabsTrigger>
          </TabsList>
          
          {/* Create Tab Content */}
          <TabsContent value="create" className="mt-2">
            <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as 'custom' | 'presets')} className="w-full">
              <TabsList className="flex gap-2 w-full bg-transparent p-0 h-auto">
                <TabsTrigger 
                  value="custom" 
                  className="flex-1 text-xs text-slate-400 rounded-md border border-slate-600 bg-slate-700 data-[state=active]:bg-blue-600 data-[state=active]:border-blue-600 data-[state=active]:text-white h-7"
                  data-testid="tab-custom"
                >
                  Custom
                </TabsTrigger>
                <TabsTrigger 
                  value="presets" 
                  className="flex-1 text-xs text-slate-400 rounded-md border border-slate-600 bg-slate-700 data-[state=active]:bg-blue-600 data-[state=active]:border-blue-600 data-[state=active]:text-white h-7"
                  data-testid="tab-presets"
                >
                  Presets
                </TabsTrigger>
              </TabsList>
            
            {/* Custom Tab Content */}
            <TabsContent value="custom" className="mt-2">
              <div className="space-y-2 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Name</Label>
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Custom Artboard"
                    className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200"
                    data-testid="input-artboard-name"
                  />
                </div>
                
                {/* Unit and DPI row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-400">Unit</Label>
                    <Select
                      value={customUnit}
                      onValueChange={(value) => handleUnitChange(value as UnitType)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200 artboard-select" data-testid="select-artboard-unit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pixels">Pixels (px)</SelectItem>
                        <SelectItem value="inches">Inches (in)</SelectItem>
                        <SelectItem value="mm">Millimeters (mm)</SelectItem>
                        <SelectItem value="cm">Centimeters (cm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-400">DPI</Label>
                    <Select
                      value={String(customDpi)}
                      onValueChange={(value) => setCustomDpi(Number(value))}
                    >
                      <SelectTrigger className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200 artboard-select" data-testid="select-artboard-dpi">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DPI_PRESETS.map((preset) => (
                          <SelectItem key={preset.value} value={String(preset.value)}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-400">Dimensions ({getUnitLabel(customUnit)})</Label>
                    <div className="flex items-center gap-1">
                      {/* Portrait/Landscape Toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 w-6 p-0 ${customWidth <= customHeight ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                        onClick={() => {
                          if (customWidth > customHeight) {
                            const temp = customWidth;
                            setCustomWidth(customHeight);
                            setCustomHeight(temp);
                          }
                        }}
                        title="Portrait orientation"
                        data-testid="button-custom-orientation-portrait"
                      >
                        <RectangleVertical className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 w-6 p-0 ${customWidth > customHeight ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                        onClick={() => {
                          if (customWidth <= customHeight) {
                            const temp = customWidth;
                            setCustomWidth(customHeight);
                            setCustomHeight(temp);
                          }
                        }}
                        title="Landscape orientation"
                        data-testid="button-custom-orientation-landscape"
                      >
                        <RectangleHorizontal className="w-3.5 h-3.5" />
                      </Button>
                      {/* Link Dimensions Toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 px-2 ${customLinkedDimensions ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500'}`}
                        onClick={() => {
                          setCustomLinkedDimensions(!customLinkedDimensions);
                          if (!customLinkedDimensions) {
                            setCustomAspectRatio('custom');
                          }
                        }}
                        title={customLinkedDimensions ? 'Unlock dimensions' : 'Lock dimensions (maintain aspect ratio)'}
                        data-testid="button-link-custom-dimensions"
                      >
                        {customLinkedDimensions ? (
                          <Link2 className="w-3.5 h-3.5" />
                        ) : (
                          <Unlink2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-500">Width</Label>
                      <BufferedNumericInput
                        value={customWidth}
                        onCommit={handleWidthChange}
                        min={customUnit === 'pixels' ? 1 : 0.1}
                        max={customUnit === 'pixels' ? 20000 : 100}
                        step={customUnit === 'pixels' ? 1 : (customUnit === 'mm' ? 1 : 0.1)}
                        className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200"
                        data-testid="input-custom-width"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-500">Height</Label>
                      <BufferedNumericInput
                        value={customHeight}
                        onCommit={handleHeightChange}
                        min={customUnit === 'pixels' ? 1 : 0.1}
                        max={customUnit === 'pixels' ? 20000 : 100}
                        step={customUnit === 'pixels' ? 1 : (customUnit === 'mm' ? 1 : 0.1)}
                        className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200"
                        data-testid="input-custom-height"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Live pixel preview - only show when not in pixel mode */}
                {customUnit !== 'pixels' && (
                  <div className="text-xs text-slate-400 bg-slate-900/50 p-2 rounded border border-slate-700">
                    <span className="text-slate-500">Output:</span> <span className="text-slate-400">{livePixelWidth} × {livePixelHeight} px</span>
                    <span className="text-slate-500 ml-2">({(livePixelWidth * livePixelHeight / 1000000).toFixed(1)} MP)</span>
                  </div>
                )}
                
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={customBackgroundColor}
                      onChange={(e) => setCustomBackgroundColor(e.target.value)}
                      className="h-7 w-12 p-1 bg-slate-700 border-slate-600"
                      data-testid="input-artboard-bg-color"
                    />
                    <Input
                      type="text"
                      value={customBackgroundColor}
                      onChange={(e) => setCustomBackgroundColor(e.target.value)}
                      placeholder="#ffffff"
                      className="h-7 flex-1 text-xs bg-slate-700 border-slate-600 text-slate-200"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCreateCustomArtboard}
                  className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-create-artboard"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Create Artboard
                </Button>
              </div>
            </TabsContent>
            
            {/* Presets Tab Content */}
            <TabsContent value="presets" className="mt-2">
              <div className="space-y-2">
                {/* DPI selector for presets */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-400 whitespace-nowrap">DPI:</Label>
                  <Select
                    value={String(customDpi)}
                    onValueChange={(value) => setCustomDpi(Number(value))}
                  >
                    <SelectTrigger className="h-7 text-xs bg-slate-700 border-slate-600 flex-1" data-testid="select-preset-dpi">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DPI_PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={String(preset.value)}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Category selector */}
                <Select
                  value={selectedPresetCategory}
                  onValueChange={(value) => handleCategoryChange(value as PresetCategory)}
                >
                  <SelectTrigger className="h-8 text-xs bg-slate-700 border-slate-600" data-testid="select-preset-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_CATEGORIES.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Presets for selected category */}
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {getPresetsByCategory(selectedPresetCategory).map((preset) => {
                    const pixelDims = getPresetPixelDimensions(preset, customDpi);
                    return (
                      <div
                        key={preset.id}
                        className="flex items-center gap-1 p-2 rounded bg-slate-700/50 hover:bg-slate-700 transition-colors"
                        data-testid={`preset-item-${preset.id}`}
                      >
                        <Button
                          onClick={() => handlePresetSelect(preset)}
                          variant="ghost"
                          size="sm"
                          className="flex-1 justify-start text-xs h-auto py-1 px-2 hover:bg-slate-600"
                          title="Edit preset settings before creating"
                          data-testid={`button-preset-edit-${preset.id}`}
                        >
                          <div className="flex-1 text-left min-w-0">
                            <div className="font-medium truncate text-slate-100">{preset.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {pixelDims.width} × {pixelDims.height} px
                            </div>
                          </div>
                        </Button>
                        <Button
                          onClick={() => handlePresetQuickCreate(preset)}
                          variant="secondary"
                          size="sm"
                          className="h-7 px-2 bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
                          title="Create artboard immediately"
                          data-testid={`button-preset-create-${preset.id}`}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Active Tab Content */}
          <TabsContent value="active" className="mt-2">
            {(() => {
              const currentArtboard = artboards.find(a => a.id === activeArtboard);
              if (!currentArtboard) return (
                <div className="text-xs text-slate-500 text-center py-4 bg-slate-800/50 rounded-lg border border-slate-600">
                  No artboard selected
                </div>
              );
              
              return (
                <div className="space-y-2 p-3 bg-slate-800/50 border border-slate-600 rounded-lg">
                  <Label className="text-xs text-slate-400">Active Artboard Settings</Label>
              
              <div className="space-y-2">
                {/* Artboard Name */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Artboard Name</Label>
                  <Input
                    type="text"
                    value={currentArtboard.name}
                    onChange={(e) => onUpdateArtboard(currentArtboard.id, { name: e.target.value })}
                    placeholder="Artboard 1"
                    className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200"
                    data-testid="input-artboard-name"
                  />
                </div>

                <Separator className="bg-slate-600/50" />

                {/* DPI Setting */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Resolution (DPI)</Label>
                  <Select
                    value={String(currentArtboard.dpi ?? 72)}
                    onValueChange={(value) => onUpdateArtboard(currentArtboard.id, { dpi: parseInt(value) })}
                  >
                    <SelectTrigger className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200 artboard-select" data-testid="select-artboard-dpi">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DPI_PRESETS.map(preset => (
                        <SelectItem key={preset.value} value={String(preset.value)}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Unit Type Selector */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Units</Label>
                  <Select
                    value={currentArtboard.unitType ?? 'pixels'}
                    onValueChange={(value: UnitType) => onUpdateArtboard(currentArtboard.id, { unitType: value })}
                  >
                    <SelectTrigger className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200 artboard-select" data-testid="select-artboard-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pixels">Pixels (px)</SelectItem>
                      <SelectItem value="mm">Millimeters (mm)</SelectItem>
                      <SelectItem value="cm">Centimeters (cm)</SelectItem>
                      <SelectItem value="inches">Inches (in)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Document Type & Size Presets */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Document Preset</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={(() => {
                        const matchingPreset = ARTBOARD_PRESETS_PHYSICAL.find(p => 
                          Math.abs(p.widthInches * (currentArtboard.dpi ?? 72) - currentArtboard.width) < 2 &&
                          Math.abs(p.heightInches * (currentArtboard.dpi ?? 72) - currentArtboard.height) < 2
                        );
                        return matchingPreset?.category ?? 'paper';
                      })()}
                      onValueChange={(category: PresetCategory) => {
                        const presets = getPresetsByCategory(category);
                        if (presets.length > 0) {
                          const firstPreset = presets[0];
                          const dpi = currentArtboard.dpi ?? 72;
                          const newWidth = Math.round(firstPreset.widthInches * dpi);
                          const newHeight = Math.round(firstPreset.heightInches * dpi);
                          onUpdateArtboard(currentArtboard.id, {
                            name: firstPreset.name,
                            width: newWidth,
                            height: newHeight,
                            aspectRatio: firstPreset.aspectRatio,
                            linkedDimensions: true
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200 artboard-select" data-testid="select-preset-category-active">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRESET_CATEGORIES.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={(() => {
                        const matchingPreset = ARTBOARD_PRESETS_PHYSICAL.find(p => 
                          Math.abs(p.widthInches * (currentArtboard.dpi ?? 72) - currentArtboard.width) < 2 &&
                          Math.abs(p.heightInches * (currentArtboard.dpi ?? 72) - currentArtboard.height) < 2
                        );
                        return matchingPreset?.id ?? '';
                      })()}
                      onValueChange={(presetId: string) => {
                        const preset = ARTBOARD_PRESETS_PHYSICAL.find(p => p.id === presetId);
                        if (preset) {
                          const dpi = currentArtboard.dpi ?? 72;
                          const newWidth = Math.round(preset.widthInches * dpi);
                          const newHeight = Math.round(preset.heightInches * dpi);
                          onUpdateArtboard(currentArtboard.id, {
                            name: preset.name,
                            width: newWidth,
                            height: newHeight,
                            aspectRatio: preset.aspectRatio,
                            linkedDimensions: true
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200 artboard-select" data-testid="select-preset-size-active">
                        <SelectValue placeholder="Size" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const matchingPreset = ARTBOARD_PRESETS_PHYSICAL.find(p => 
                            Math.abs(p.widthInches * (currentArtboard.dpi ?? 72) - currentArtboard.width) < 2 &&
                            Math.abs(p.heightInches * (currentArtboard.dpi ?? 72) - currentArtboard.height) < 2
                          );
                          const category = matchingPreset?.category ?? 'paper';
                          return getPresetsByCategory(category).map((preset) => (
                            <SelectItem key={preset.id} value={preset.id}>
                              {preset.name}
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Dimensions with Orientation and Linked Toggle */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-400">
                      Dimensions {currentArtboard.unitType !== 'pixels' && (
                        <span className="text-slate-500">({getUnitLabel(currentArtboard.unitType ?? 'pixels')})</span>
                      )}
                    </Label>
                    <div className="flex items-center gap-1">
                      {/* Portrait/Landscape Toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 w-6 p-0 ${currentArtboard.width <= currentArtboard.height ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                        onClick={() => {
                          if (currentArtboard.width > currentArtboard.height) {
                            onUpdateArtboard(currentArtboard.id, {
                              width: currentArtboard.height,
                              height: currentArtboard.width
                            });
                          }
                        }}
                        title="Portrait orientation"
                        data-testid="button-orientation-portrait"
                      >
                        <RectangleVertical className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 w-6 p-0 ${currentArtboard.width > currentArtboard.height ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                        onClick={() => {
                          if (currentArtboard.width <= currentArtboard.height) {
                            onUpdateArtboard(currentArtboard.id, {
                              width: currentArtboard.height,
                              height: currentArtboard.width
                            });
                          }
                        }}
                        title="Landscape orientation"
                        data-testid="button-orientation-landscape"
                      >
                        <RectangleHorizontal className="w-3.5 h-3.5" />
                      </Button>
                      {/* Link Dimensions Toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 px-2 ${currentArtboard.linkedDimensions ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500'}`}
                        onClick={() => onUpdateArtboard(currentArtboard.id, { 
                          linkedDimensions: !currentArtboard.linkedDimensions,
                          aspectRatio: !currentArtboard.linkedDimensions ? 'custom' : currentArtboard.aspectRatio
                        })}
                        title={currentArtboard.linkedDimensions ? 'Unlock dimensions (allows independent resize)' : 'Lock dimensions (maintain aspect ratio)'}
                        data-testid="button-link-dimensions"
                      >
                        {currentArtboard.linkedDimensions ? (
                          <Link2 className="w-3.5 h-3.5" />
                        ) : (
                          <Unlink2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-500">Width</Label>
                      <BufferedNumericInput
                        step={currentArtboard.unitType === 'pixels' ? 1 : 0.01}
                        value={(() => {
                          const displayDims = getArtboardDisplayDimensions(
                            currentArtboard.width,
                            currentArtboard.height,
                            currentArtboard.dpi ?? 72,
                            currentArtboard.unitType ?? 'pixels'
                          );
                          return parseFloat(displayDims.widthFormatted);
                        })()}
                        onCommit={(value) => {
                          const dpi = currentArtboard.dpi ?? 72;
                          const unitType = currentArtboard.unitType ?? 'pixels';
                          
                          if (currentArtboard.linkedDimensions && currentArtboard.width > 0) {
                            const aspectRatio = currentArtboard.width / currentArtboard.height;
                            const newWidthPixels = unitToPixels(value, dpi, unitType);
                            const newHeightPixels = Math.round(newWidthPixels / aspectRatio);
                            onUpdateArtboard(currentArtboard.id, { 
                              width: Math.round(newWidthPixels), 
                              height: newHeightPixels 
                            });
                          } else {
                            const pixelDims = calculatePixelDimensions(
                              value,
                              pixelsToUnit(currentArtboard.height, dpi, unitType),
                              dpi,
                              unitType
                            );
                            onUpdateArtboard(currentArtboard.id, { 
                              width: pixelDims.widthPixels,
                              aspectRatio: 'custom'
                            });
                          }
                        }}
                        min={1}
                        max={20000}
                        className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200"
                        data-testid="input-artboard-width"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-500">Height</Label>
                      <BufferedNumericInput
                        step={currentArtboard.unitType === 'pixels' ? 1 : 0.01}
                        value={(() => {
                          const displayDims = getArtboardDisplayDimensions(
                            currentArtboard.width,
                            currentArtboard.height,
                            currentArtboard.dpi ?? 72,
                            currentArtboard.unitType ?? 'pixels'
                          );
                          return parseFloat(displayDims.heightFormatted);
                        })()}
                        onCommit={(value) => {
                          const dpi = currentArtboard.dpi ?? 72;
                          const unitType = currentArtboard.unitType ?? 'pixels';
                          
                          if (currentArtboard.linkedDimensions && currentArtboard.height > 0) {
                            const aspectRatio = currentArtboard.width / currentArtboard.height;
                            const newHeightPixels = unitToPixels(value, dpi, unitType);
                            const newWidthPixels = Math.round(newHeightPixels * aspectRatio);
                            onUpdateArtboard(currentArtboard.id, { 
                              width: newWidthPixels, 
                              height: Math.round(newHeightPixels) 
                            });
                          } else {
                            const pixelDims = calculatePixelDimensions(
                              pixelsToUnit(currentArtboard.width, dpi, unitType),
                              value,
                              dpi,
                              unitType
                            );
                            onUpdateArtboard(currentArtboard.id, { 
                              height: pixelDims.heightPixels,
                              aspectRatio: 'custom'
                            });
                          }
                        }}
                        min={1}
                        max={20000}
                        className="h-8 text-xs bg-slate-700 border-slate-600 text-slate-200"
                        data-testid="input-artboard-height"
                      />
                    </div>
                  </div>
                  {currentArtboard.unitType !== 'pixels' && (
                    <div className="text-xs text-slate-500 mt-1">
                      {currentArtboard.width} × {currentArtboard.height} px
                    </div>
                  )}
                </div>

                {/* Background Color */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={currentArtboard.backgroundColor || '#ffffff'}
                      onChange={(e) => onUpdateArtboard(currentArtboard.id, { backgroundColor: e.target.value })}
                      className="h-7 w-12 p-1 bg-slate-700 border-slate-600"
                      data-testid="input-artboard-background-color"
                    />
                    <Input
                      type="text"
                      value={currentArtboard.backgroundColor || '#ffffff'}
                      onChange={(e) => onUpdateArtboard(currentArtboard.id, { backgroundColor: e.target.value })}
                      placeholder="#ffffff"
                      className="h-7 flex-1 text-xs bg-slate-700 border-slate-600 text-slate-200"
                      data-testid="input-artboard-background-hex"
                    />
                  </div>
                </div>

                <Separator className="bg-slate-600/50" />

                {/* Display Name Toggle */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-400">Display Name</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={currentArtboard.displayName !== false}
                      onCheckedChange={(checked) => onUpdateArtboard(currentArtboard.id, { displayName: checked })}
                      data-testid="switch-artboard-display-name"
                    />
                    <span className="text-xs text-slate-400">
                      {currentArtboard.displayName !== false ? 'On' : 'Off'}
                    </span>
                  </div>
                </div>

                {/* Display Dimensions Toggle */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-400">Display Dimensions</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={currentArtboard.displayDimensions === true}
                      onCheckedChange={(checked) => onUpdateArtboard(currentArtboard.id, { displayDimensions: checked })}
                      data-testid="switch-artboard-display-dimensions"
                    />
                    <span className="text-xs text-slate-400">
                      {currentArtboard.displayDimensions === true ? 'On' : 'Off'}
                    </span>
                  </div>
                </div>

                {/* Display Resolution Toggle */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-400">Display Resolution</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={currentArtboard.displayResolution === true}
                      onCheckedChange={(checked) => onUpdateArtboard(currentArtboard.id, { displayResolution: checked })}
                      data-testid="switch-artboard-display-resolution"
                    />
                    <span className="text-xs text-slate-400">
                      {currentArtboard.displayResolution === true ? 'On' : 'Off'}
                    </span>
                  </div>
                </div>

                {/* Display Border Toggle */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-400">Display Border</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={currentArtboard.displayBorder !== false}
                      onCheckedChange={(checked) => onUpdateArtboard(currentArtboard.id, { displayBorder: checked })}
                      data-testid="switch-artboard-display-border"
                    />
                    <span className="text-xs text-slate-400">
                      {currentArtboard.displayBorder !== false ? 'On' : 'Off'}
                    </span>
                  </div>
                </div>

                {/* Display Grid Toggle */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-400">Display Grid</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={currentArtboard.displayGrid !== false}
                      onCheckedChange={(checked) => onUpdateArtboard(currentArtboard.id, { displayGrid: checked })}
                      data-testid="switch-artboard-display-grid"
                    />
                    <span className="text-xs text-slate-400">
                      {currentArtboard.displayGrid !== false ? 'On' : 'Off'}
                    </span>
                  </div>
                </div>

                {/* Grid Color */}
                {currentArtboard.displayGrid !== false && (
                  <div className="space-y-1 ml-4">
                    <Label className="text-xs text-slate-400">Grid Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={currentArtboard.gridColor || '#cccccc'}
                        onChange={(e) => onUpdateArtboard(currentArtboard.id, { gridColor: e.target.value })}
                        className="h-7 w-12 p-1 bg-slate-700 border-slate-600"
                        data-testid="input-artboard-grid-color"
                      />
                      <Input
                        type="text"
                        value={currentArtboard.gridColor || '#cccccc'}
                        onChange={(e) => onUpdateArtboard(currentArtboard.id, { gridColor: e.target.value })}
                        placeholder="#cccccc"
                        className="h-7 flex-1 text-xs bg-slate-700 border-slate-600 text-slate-200"
                        data-testid="input-artboard-grid-hex"
                      />
                    </div>
                  </div>
                )}

                <Separator className="bg-slate-600/50" />

                {/* Print Configuration Section */}
                <PrintConfigurationSection 
                  currentArtboard={currentArtboard}
                  onUpdateArtboard={onUpdateArtboard}
                />
              </div>
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Export state variables lifted to main component level  
  const [exportShapeCountRange, setExportShapeCountRange] = useState<[number, number]>([5, 15]);
  
  // Use persisted export settings instead of local state
  const exportBatchCount = exportSettings.batchExportCount;
  const setExportBatchCount = (count: number) => {
    updateExportSettings.mutate({ batchExportCount: count });
  };
  
  const exportSaveProjectFiles = exportSettings.exportSaveProjectFiles;
  const setExportSaveProjectFiles = (enabled: boolean) => {
    updateExportSettings.mutate({ exportSaveProjectFiles: enabled });
  };
  
  const packageAsZip = exportSettings.packageAsZip;
  const setPackageAsZip = (enabled: boolean) => {
    updateExportSettings.mutate({ packageAsZip: enabled });
  };
  
  // New packaging and selective export settings
  const [exportAllImages, setExportAllImages] = useState(true);
  const [selectedImageIndices, setSelectedImageIndices] = useState<number[]>([]);

  // TIFF Pre-flight helper functions (at component level for access across components)
  const getTiffPreflightInfo = useCallback(() => {
    const backgroundArtboard = artboards.find(ab => ab.id === activeArtboard);
    const targetArtboard = exportMode === 'artboard' 
      ? (selectedArtboardForExport 
          ? artboards.find(ab => ab.id === selectedArtboardForExport)
          : backgroundArtboard)
      : backgroundArtboard;
    
    const artboardWidth = targetArtboard?.width ?? backgroundArtboard?.width ?? 400;
    const artboardHeight = targetArtboard?.height ?? backgroundArtboard?.height ?? 400;
    const artboardDpi = targetArtboard?.dpi ?? backgroundArtboard?.dpi ?? 72;
    const requestedCount = exportAllImages ? exportBatchCount : selectedImageIndices.length;
    
    const printConfig = targetArtboard?.printConfig ?? backgroundArtboard?.printConfig ?? DEFAULT_PRINT_CONFIG;
    const bleedEnabled = printConfig.overlays.bleed.render && printConfig.overlays.bleed.amount > 0;
    const backgroundMode = exportSettings.exportBackgroundMode || 'transparent';
    const is16Bit = (exportSettings.tiffBitDepth ?? 8) === 16;
    const scale = effectiveExportScale;
    
    return calculateTiffPreflightInfo(
      artboardWidth,
      artboardHeight,
      artboardDpi,
      requestedCount,
      bleedEnabled,
      backgroundMode,
      is16Bit,
      scale
    );
  }, [artboards, activeArtboard, exportMode, selectedArtboardForExport, exportAllImages, exportBatchCount, selectedImageIndices, exportSettings.exportBackgroundMode, exportSettings.tiffBitDepth, effectiveExportScale]);
  
  // Handle TIFF pre-flight modal confirmation
  const handleTiffPreflightConfirm = useCallback((dontShowAgain: boolean) => {
    if (dontShowAgain) {
      updateExportSettings.mutate({ skipTiffPreflightModal: true });
    }
    setIsTiffPreflightOpen(false);
    // Trigger the pending export
    if (pendingTiffExportRef.current) {
      pendingTiffExportRef.current();
      pendingTiffExportRef.current = null;
    }
  }, [updateExportSettings]);
  
  // Handle TIFF pre-flight modal cancel
  const handleTiffPreflightCancel = useCallback(() => {
    setIsTiffPreflightOpen(false);
    pendingTiffExportRef.current = null;
  }, []);

  // Generation sets handlers (placed after state declarations)
  const handleCreateSet = useCallback((name: string) => {
    // Auto-enable batch export when creating sets
    if (!exportSettings.exportBatchModeEnabled) {
      updateExportSettings.mutate({ exportBatchModeEnabled: true });
      console.log('Auto-enabled batch export for generation sets');
    }
    
    
    // Capture current UI state for the generation set
    const currentUIState: CurrentUIState = {
      enabledShapeTypes,
      scatterSettings,
      batchConfigSettings: generationConfigSettings,
      shapeCountMode,
      shapeCountFixed,
      shapeCountRange
    };
    
    // Call the actual handler from parent component with UI state
    const setId = onCreateGenerationSet?.(name, currentUIState);
    console.log('Created generation set:', name, 'with ID:', setId, 'from current UI state');
    return setId;
  }, [onCreateGenerationSet, exportSettings.exportBatchModeEnabled, updateExportSettings, generationConfigSettings, onUpdateGenerationConfigSettings, enabledShapeTypes, scatterSettings, shapeCountMode, shapeCountFixed, shapeCountRange]);

  // Apply current UI state to the current generation set - Shape Types section only
  const handleApplyToCurrentSet = useCallback(async () => {
    if (!currentGenerationSetId || !updateGenerationSetPartial) return;

    setApplyStatus('applying');
    
    // Set flag to skip the automatic UI restoration that would reset scroll position
    skipNextRestoreRef.current = true;
    
    try {
      // Prepare shape types partial update - only what this section controls
      const shapeTypesUpdate: Partial<GenerationSet> = {
        enabledShapeTypes: Array.from(enabledShapeTypes) as SupportedShapeType[],
        shapeCountMode,
        shapeCountFixed,
        shapeCountRange,
        // Include shape-specific properties (corner radius, inner radius, segments, etc.)
        shapeSpecificProperties: scatterSettings.shapeSpecific as any
      };
      
      console.log('📝 [SHAPE TYPES APPLY] Updating with:', {
        shapeTypes: shapeTypesUpdate.enabledShapeTypes,
        mode: shapeCountMode,
        fixed: shapeCountFixed,
        range: shapeCountRange,
        shapeSpecific: Object.keys(scatterSettings.shapeSpecific)
      });
      
      await updateGenerationSetPartial(currentGenerationSetId, shapeTypesUpdate);
      
      // Show success state for 1000ms
      setApplyStatus('success');
      setTimeout(() => {
        setApplyStatus('idle');
      }, 1000);
    } catch (error) {
      console.error('Failed to apply shape types:', error);
      // On error, revert to idle and clear the skip flag
      skipNextRestoreRef.current = false;
      setApplyStatus('idle');
    }
  }, [currentGenerationSetId, updateGenerationSetPartial, enabledShapeTypes, shapeCountMode, shapeCountFixed, shapeCountRange, scatterSettings.shapeSpecific]);

  function ExportSaveContent() {
    // Export settings now use lifted state from main Sidebar component
    // exportFormat, exportQuality, exportScale, exportMode, selectedArtboardForExport are already defined at the component level

    // Local export state (not needed by API generator)
    const [batchExportPath, setBatchExportPath] = useState<string>('');
    const [isBatchExporting, setIsBatchExporting] = useState(false);
    // Server export state is managed at the Sidebar component level (isServerExportingGlobal) for proper modal synchronization
    const [batchProgress, setBatchProgress] = useState(0);
    const [batchTotalSteps, setBatchTotalSteps] = useState(0);
    const [batchStatus, setBatchStatus] = useState('');
    const [showBatchResult, setShowBatchResult] = useState(false);
    const [batchResultMessage, setBatchResultMessage] = useState('');
    
    // Export progress tracking with elapsed time and cancel
    const [exportElapsedTime, setExportElapsedTime] = useState(0);
    const exportStartTimeRef = useRef<number | null>(null);
    const exportAbortControllerRef = useRef<AbortController | null>(null);
    const elapsedTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
    
    // Format elapsed time as mm:ss
    const formatElapsedTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Start elapsed time tracking
    const startElapsedTimeTracking = () => {
      exportStartTimeRef.current = Date.now();
      setExportElapsedTime(0);
      elapsedTimeIntervalRef.current = setInterval(() => {
        if (exportStartTimeRef.current) {
          setExportElapsedTime(Math.floor((Date.now() - exportStartTimeRef.current) / 1000));
        }
      }, 1000);
    };
    
    // Stop elapsed time tracking
    const stopElapsedTimeTracking = () => {
      if (elapsedTimeIntervalRef.current) {
        clearInterval(elapsedTimeIntervalRef.current);
        elapsedTimeIntervalRef.current = null;
      }
      exportStartTimeRef.current = null;
    };
    
    // Cancel export
    const handleCancelExport = useCallback(() => {
      if (exportAbortControllerRef.current) {
        exportAbortControllerRef.current.abort();
        console.log('🛑 Export cancelled by user');
        setBatchStatus('Export cancelled');
        stopElapsedTimeTracking();
        setIsBatchExporting(false);
        setShowBatchResult(true);
        setBatchResultMessage('⚠️ Export was cancelled');
      }
    }, []);

    // Helper function to convert print units to pixels
    const convertPrintUnitToPixels = (value: number, unit: PrintUnitType, dpi: number): number => {
      switch (unit) {
        case 'pixels':
          return value;
        case 'mm':
          return (value / 25.4) * dpi;
        case 'cm':
          return (value / 2.54) * dpi;
        case 'inches':
          return value * dpi;
        default:
          return value;
      }
    };

    // Helper function to render print marks on export canvas
    const renderPrintMarks = (
      ctx: CanvasRenderingContext2D,
      artboardX: number,
      artboardY: number,
      artboardWidth: number,
      artboardHeight: number,
      bleedPx: number,
      printMarksConfig: {
        cropMarks: boolean;
        registrationMarks: boolean;
        markLength: number;
        markOffset: number;
      }
    ) => {
      const { cropMarks, registrationMarks, markLength, markOffset } = printMarksConfig;
      
      ctx.save();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      
      // Crop Marks (corner marks at artboard edges, positioned outside the bleed area)
      if (cropMarks) {
        const corners = [
          { x: artboardX, y: artboardY, dx: -1, dy: -1 },
          { x: artboardX + artboardWidth, y: artboardY, dx: 1, dy: -1 },
          { x: artboardX, y: artboardY + artboardHeight, dx: -1, dy: 1 },
          { x: artboardX + artboardWidth, y: artboardY + artboardHeight, dx: 1, dy: 1 }
        ];
        
        corners.forEach(corner => {
          const offsetX = (bleedPx + markOffset) * corner.dx;
          const offsetY = (bleedPx + markOffset) * corner.dy;
          
          // Horizontal line
          ctx.beginPath();
          ctx.moveTo(corner.x + offsetX, corner.y);
          ctx.lineTo(corner.x + offsetX + (markLength * corner.dx), corner.y);
          ctx.stroke();
          
          // Vertical line
          ctx.beginPath();
          ctx.moveTo(corner.x, corner.y + offsetY);
          ctx.lineTo(corner.x, corner.y + offsetY + (markLength * corner.dy));
          ctx.stroke();
        });
      }
      
      // Registration Marks (crosshair marks at center of each edge)
      if (registrationMarks) {
        const regMarkSize = 8;
        const regCircleRadius = 4;
        const edgeCenters = [
          { x: artboardX + artboardWidth / 2, y: artboardY - bleedPx - markOffset - regMarkSize },
          { x: artboardX + artboardWidth / 2, y: artboardY + artboardHeight + bleedPx + markOffset + regMarkSize },
          { x: artboardX - bleedPx - markOffset - regMarkSize, y: artboardY + artboardHeight / 2 },
          { x: artboardX + artboardWidth + bleedPx + markOffset + regMarkSize, y: artboardY + artboardHeight / 2 }
        ];
        
        edgeCenters.forEach(center => {
          // Draw crosshair
          ctx.beginPath();
          ctx.moveTo(center.x - regMarkSize, center.y);
          ctx.lineTo(center.x + regMarkSize, center.y);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(center.x, center.y - regMarkSize);
          ctx.lineTo(center.x, center.y + regMarkSize);
          ctx.stroke();
          
          // Draw circle
          ctx.beginPath();
          ctx.arc(center.x, center.y, regCircleRadius, 0, Math.PI * 2);
          ctx.stroke();
        });
      }
      
      ctx.restore();
    };

    const renderShapeForExport = (ctx: CanvasRenderingContext2D, shape: Shape) => {
      // Temporarily disable selection to avoid selection indicators, but keep the original shape
      const originalSelected = shape.selected;
      shape.selected = false;

      // DIAGNOSTIC: Log shape properties for debugging batch export
      console.log(`🔍 [EXPORT RENDER] Shape ${shape.id}:`, {
        type: shape.type,
        transform: { x: shape.transform.x, y: shape.transform.y },
        hasPoints: !!(shape.points && shape.points.length > 0),
        pointsCount: shape.points?.length ?? 0,
        hasControlPoints: !!(shape.controlPoints && shape.controlPoints.length > 0),
        controlPointsCount: shape.controlPoints?.length ?? 0,
        fillColor: shape.properties.fillColor,
        fillOpacity: shape.properties.fillOpacity,
        hasGradient: !!shape.properties.gradient,
        gradientType: shape.properties.gradient?.type,
        gradientStops: shape.properties.gradient?.stops?.length ?? 0,
        radius: shape.radius
      });

      // Save current context state
      ctx.save();
      
      // Apply blend mode or compositing operation if set
      if (shape.properties.blendMode && shape.properties.blendMode !== 'source-over') {
        ctx.globalCompositeOperation = shape.properties.blendMode as GlobalCompositeOperation;
      }

      // Use the Shape class's render method for export
      shape.render(ctx);

      // Restore context state (including blend mode)
      ctx.restore();

      // Restore original selection state
      shape.selected = originalSelected;
    };

    const exportCanvasAsFormat = async (canvas: HTMLCanvasElement, filename: string, format: string, quality: number, scale: number, dpi: number = 72) => {
      // Get export settings for TIFF and ICC profile
      const tiffBitDepth = exportSettings.tiffBitDepth ?? 8;
      const tiffCompression = exportSettings.tiffCompression ?? 'none';
      const embedIccProfile = exportSettings.embedIccProfile ?? true;
      
      switch (format) {
        case 'pdf':
          // Convert canvas to PDF
          const pdf = new jsPDF({
            orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
            unit: 'pt',
            format: [canvas.width / scale, canvas.height / scale]
          });
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width / scale, canvas.height / scale);
          pdf.save(filename);
          console.log(`📁 File saved: ${filename} (check your Downloads folder)`);
          break;
        case 'tiff':
          // Handle TIFF format using UTIF library
          const tiffCtx = canvas.getContext('2d');
          if (tiffCtx) {
            // Memory guardrail: limit to 200 megapixels (800MB RGBA data) to support A4 300DPI scaled exports
            // 16-bit doubles memory usage, so adjust limit accordingly
            const memoryMultiplier = tiffBitDepth === 16 ? 2 : 1;
            const maxPixels = 200_000_000 / memoryMultiplier;
            const pixelCount = canvas.width * canvas.height;
            if (pixelCount > maxPixels) {
              console.error(`❌ TIFF export aborted: Canvas size (${canvas.width}x${canvas.height} = ${pixelCount.toLocaleString()} pixels) exceeds maximum allowed (${maxPixels.toLocaleString()} pixels at ${tiffBitDepth}-bit). Consider reducing resolution or using a different format.`);
              alert(`TIFF export failed: Image too large (${canvas.width}x${canvas.height}) at ${tiffBitDepth}-bit. Please reduce the resolution or use PNG/JPEG instead.`);
              break;
            }
            
            const imageData = tiffCtx.getImageData(0, 0, canvas.width, canvas.height);
            let rgba: Uint8Array | Uint16Array;
            
            if (tiffBitDepth === 16) {
              // Convert 8-bit to 16-bit by scaling values (0-255 -> 0-65535)
              const rgba16 = new Uint16Array(imageData.data.length);
              for (let i = 0; i < imageData.data.length; i++) {
                rgba16[i] = imageData.data[i] * 257; // Scale 8-bit to 16-bit (255 * 257 = 65535)
              }
              rgba = rgba16;
            } else {
              rgba = new Uint8Array(imageData.data.buffer);
            }
            
            // Build TIFF metadata
            // Note: UTIF.js encodeImage supports uncompressed (1) or Deflate (8) with Pako.js
            // LZW compression (5) is NOT supported for encoding - setting t259=[5] corrupts output
            // UTIF handles compression internally when t259 is set and pako is available globally
            const tiffMetadata: Record<string, unknown> = {
              t282: [dpi],  // XResolution
              t283: [dpi],  // YResolution
              t296: [2],    // ResolutionUnit (2 = inch)
            };
            
            // Set compression type (UTIF handles compression internally)
            if (tiffCompression === 'deflate') {
              tiffMetadata.t259 = [8];  // Deflate compression (requires pako globally available)
              console.log(`📄 TIFF: Using Deflate compression`);
            } else {
              tiffMetadata.t259 = [1];  // No compression
              console.log(`📄 TIFF: No compression (uncompressed)`);
            }
            
            // Set bit depth tag for 16-bit exports
            if (tiffBitDepth === 16) {
              tiffMetadata.t258 = [16, 16, 16, 16]; // BitsPerSample (R, G, B, A)
            }
            
            // Embed sRGB ICC profile if requested (TIFF tag 34675 = InterColorProfile)
            if (embedIccProfile) {
              const iccProfile = getSrgbIccProfile();
              tiffMetadata.t34675 = Array.from(iccProfile);
              console.log(`📄 TIFF: Embedding sRGB ICC profile (${iccProfile.length} bytes)`);
            }
            
            // Embed copyright if set (TIFF tag 33432 = Copyright)
            const tiffCopyright = exportSettings.copyrightText ?? '';
            if (tiffCopyright) {
              tiffMetadata.t33432 = tiffCopyright;
              console.log(`📄 TIFF: Embedding copyright metadata`);
            }
            
            // Embed artist/creator (TIFF tag 315 = Artist)
            const artistName = exportSettings.artistName ?? '';
            if (artistName) {
              tiffMetadata.t315 = artistName;
              console.log(`📄 TIFF: Embedding artist metadata`);
            }
            
            // Embed image description (TIFF tag 270 = ImageDescription)
            const imageDescription = exportSettings.imageDescription ?? '';
            if (imageDescription) {
              tiffMetadata.t270 = imageDescription;
              console.log(`📄 TIFF: Embedding description metadata`);
            }
            
            // Embed document name/title (TIFF tag 269 = DocumentName)
            const imageTitle = exportSettings.imageTitle ?? '';
            if (imageTitle) {
              tiffMetadata.t269 = imageTitle;
              console.log(`📄 TIFF: Embedding title metadata`);
            }
            
            // Embed software info (TIFF tag 305 = Software)
            tiffMetadata.t305 = 'Shape Editor';
            
            // Embed creation date (TIFF tag 306 = DateTime) - format: YYYY:MM:DD HH:MM:SS
            const now = new Date();
            const dateTimeStr = `${now.getFullYear()}:${String(now.getMonth() + 1).padStart(2, '0')}:${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
            tiffMetadata.t306 = dateTimeStr;
            console.log(`📄 TIFF: Embedding creation date and software metadata`);
            
            // Encode to TIFF buffer
            // Note: UTIF.encodeImage expects Uint8Array, so for 16-bit we pass the buffer view
            const tiffBuffer = UTIF.encodeImage(
              tiffBitDepth === 16 ? new Uint8Array((rgba as Uint16Array).buffer) : rgba as Uint8Array, 
              canvas.width, 
              canvas.height, 
              tiffMetadata as UTIF.IFD
            );
            const blob = new Blob([tiffBuffer], { type: 'image/tiff' });
            const url = URL.createObjectURL(blob);
            const tiffLink = document.createElement('a');
            tiffLink.href = url;
            tiffLink.download = filename;
            tiffLink.click();
            URL.revokeObjectURL(url);
            console.log(`📁 File saved: ${filename} (check your Downloads folder) with ${dpi} DPI metadata, ${tiffBitDepth}-bit${embedIccProfile ? ', sRGB ICC profile' : ''}`);
          }
          break;
        default:
          // Handle raster formats
          const link = document.createElement('a');
          link.download = filename;
          
          let dataURL: string;
          switch (format) {
            case 'jpg':
              dataURL = canvas.toDataURL('image/jpeg', quality / 100);
              // Embed DPI metadata for JPEG
              if (embedIccProfile) {
                // Convert to blob, embed ICC, then back to URL
                const jpegBlob = await (await fetch(dataURL)).blob();
                const iccBlob = await embedIccInJpeg(jpegBlob);
                const iccUrl = URL.createObjectURL(iccBlob);
                link.href = iccUrl;
                console.log(`📄 JPEG: Embedded sRGB ICC profile`);
              } else {
                link.href = embedDPI(dataURL, 'jpg', dpi);
              }
              break;
            case 'webp':
              link.href = canvas.toDataURL('image/webp', quality / 100);
              break;
            case 'avif':
              link.href = canvas.toDataURL('image/avif', quality / 100);
              break;
            case 'bmp':
              link.href = canvas.toDataURL('image/bmp');
              break;
            case 'png':
            default:
              dataURL = canvas.toDataURL('image/png');
              // Embed all image metadata (copyright, author, title, description, creation time, software)
              const pngMetadata: PngMetadata = {
                copyright: exportSettings.copyrightText ?? '',
                author: exportSettings.artistName ?? '',
                title: exportSettings.imageTitle ?? '',
                description: exportSettings.imageDescription ?? '',
                creationTime: new Date().toISOString(),
                software: 'Shape Editor',
              };
              dataURL = embedPngMetadata(dataURL, pngMetadata);
              const hasMetadata = Object.values(pngMetadata).some(v => v && v.trim() !== '');
              if (hasMetadata) {
                console.log(`📄 PNG: Embedded image metadata (copyright, author, title, description, creation time, software)`);
              }
              if (embedIccProfile) {
                // Convert to blob, embed ICC, then back to URL
                const pngBlob = await (await fetch(dataURL)).blob();
                const iccBlob = await embedIccInPng(pngBlob);
                const iccUrl = URL.createObjectURL(iccBlob);
                link.href = iccUrl;
                console.log(`📄 PNG: Embedded sRGB ICC profile`);
              } else {
                // Embed DPI metadata for PNG
                link.href = embedDPI(dataURL, 'png', dpi);
              }
              break;
          }

          link.click();
          console.log(`📁 File saved: ${filename} (check your Downloads folder) with ${dpi} DPI metadata`);
          break;
      }
    };

    const handleExportShapes = async () => {
      setIsExporting(true);
      try {
      let shapesToExport: Shape[] = [];
      let canvasWidth: number;
      let canvasHeight: number;
      let translateX = 0;
      let translateY = 0;
      let filename = '';
      let exportDPI = 72; // Default DPI
      
      // Print configuration variables (only used for artboard exports)
      let bleedPx = 0;
      let printMarksGutterPx = 0;
      let printExpansion = 0;
      let artboardForPrintMarks: { x: number; y: number; width: number; height: number } | null = null;
      let printMarksConfig: { cropMarks: boolean; registrationMarks: boolean; markLength: number; markOffset: number } | null = null;

      if (exportMode === 'artboard' && selectedArtboardForExport) {
        // Export specific artboard
        const artboard = artboards.find(ab => ab.id === selectedArtboardForExport);
        if (!artboard) return;
        
        // Calculate effective DPI based on export scale
        // The metadata DPI should reflect the actual resolution of the exported image
        // Base dimensions are at 72 DPI, so effective DPI = 72 * exportScale
        exportDPI = Math.round(72 * effectiveExportScale);
        
        // Get print configuration
        const printConfig = artboard.printConfig || DEFAULT_PRINT_CONFIG;
        const overlayUnit = printConfig.overlays.overlayUnit || 'pixels';
        
        // DEBUG: Log print configuration values
        console.log('🖨️ [EXPORT DEBUG] Print Configuration:', {
          artboardId: artboard.id,
          artboardName: artboard.name,
          hasPrintConfig: !!artboard.printConfig,
          overlayUnit,
          bleed: {
            amount: printConfig.overlays.bleed.amount,
            render: printConfig.overlays.bleed.render,
          },
          printMarks: {
            cropMarks: printConfig.overlays.printMarks.cropMarks,
            registrationMarks: printConfig.overlays.printMarks.registrationMarks,
            render: printConfig.overlays.printMarks.render,
            markLength: printConfig.overlays.printMarks.markLength,
            markOffset: printConfig.overlays.printMarks.markOffset,
          },
        });
        
        // Calculate bleed expansion (if render is enabled)
        if (printConfig.overlays.bleed.render && printConfig.overlays.bleed.amount > 0) {
          bleedPx = convertPrintUnitToPixels(
            printConfig.overlays.bleed.amount,
            overlayUnit,
            exportDPI
          );
        }
        
        // Calculate print marks gutter (if render is enabled)
        if (printConfig.overlays.printMarks.render && (printConfig.overlays.printMarks.cropMarks || printConfig.overlays.printMarks.registrationMarks)) {
          const scaleMode = printConfig.overlays.printMarks.scaleMode || 'none';
          const minDimension = Math.min(artboard.width, artboard.height);
          
          let markLengthPx: number;
          let markOffsetPx: number;
          
          if (scaleMode === 'percent') {
            // Percentage mode: values are percentages of the smaller artboard dimension
            markLengthPx = (printConfig.overlays.printMarks.markLength / 100) * minDimension;
            markOffsetPx = (printConfig.overlays.printMarks.markOffset / 100) * minDimension;
          } else {
            // Default mode: convert from unified unit to pixels
            markLengthPx = convertPrintUnitToPixels(
              printConfig.overlays.printMarks.markLength,
              overlayUnit,
              exportDPI
            );
            markOffsetPx = convertPrintUnitToPixels(
              printConfig.overlays.printMarks.markOffset,
              overlayUnit,
              exportDPI
            );
          }
          
          // Gutter needs space for marks outside the bleed area
          printMarksGutterPx = markLengthPx + markOffsetPx + 10; // Extra 10px padding
          
          // Store print marks config for later rendering
          printMarksConfig = {
            cropMarks: printConfig.overlays.printMarks.cropMarks,
            registrationMarks: printConfig.overlays.printMarks.registrationMarks,
            markLength: markLengthPx,
            markOffset: markOffsetPx
          };
        }
        
        // Total print expansion (bleed + marks gutter on each side)
        printExpansion = bleedPx + printMarksGutterPx;
        
        // DEBUG: Log calculated expansion values
        console.log('🖨️ [EXPORT DEBUG] Print Expansion Calculations:', {
          bleedPx,
          printMarksGutterPx,
          totalPrintExpansion: printExpansion,
          willRenderPrintMarks: !!printMarksConfig,
          artboardDimensions: { width: artboard.width, height: artboard.height },
          expandedDimensions: { 
            width: artboard.width + (printExpansion * 2), 
            height: artboard.height + (printExpansion * 2) 
          },
        });
        
        // Store artboard bounds for print marks rendering (relative to export canvas origin)
        artboardForPrintMarks = {
          x: printExpansion,
          y: printExpansion,
          width: artboard.width,
          height: artboard.height
        };

        // Filter shapes that overlap with the artboard bounds (including bleed area)
        const bleedExpandedBounds = {
          x: artboard.x - bleedPx,
          y: artboard.y - bleedPx,
          width: artboard.width + (bleedPx * 2),
          height: artboard.height + (bleedPx * 2)
        };
        
        shapesToExport = shapes.filter(shape => {
          const bounds = shape.getBounds();
          const shapeLeft = shape.transform.x + bounds.x;
          const shapeTop = shape.transform.y + bounds.y;
          const shapeRight = shapeLeft + bounds.width;
          const shapeBottom = shapeTop + bounds.height;

          // Check if shape overlaps with expanded artboard (including bleed)
          return !(shapeRight < bleedExpandedBounds.x || 
                   shapeLeft > bleedExpandedBounds.x + bleedExpandedBounds.width ||
                   shapeBottom < bleedExpandedBounds.y || 
                   shapeTop > bleedExpandedBounds.y + bleedExpandedBounds.height);
        });

        // Canvas dimensions include bleed and print marks gutter
        canvasWidth = (artboard.width + (printExpansion * 2)) * effectiveExportScale;
        canvasHeight = (artboard.height + (printExpansion * 2)) * effectiveExportScale;
        
        // DEBUG: Log final canvas dimensions and expected file size
        const expectedFileSize = Math.round(canvasWidth * canvasHeight * 4 / (1024 * 1024));
        console.log('🖼️ [EXPORT DEBUG] Canvas Dimensions:', {
          artboardConfiguredDPI: artboard.dpi ?? 72,
          effectiveExportScale,
          effectiveExportDPI: exportDPI,
          baseWidth: artboard.width,
          baseHeight: artboard.height,
          printExpansion,
          finalCanvasWidth: Math.round(canvasWidth),
          finalCanvasHeight: Math.round(canvasHeight),
          totalPixels: Math.round(canvasWidth * canvasHeight),
          expectedFileSizeMB: `~${expectedFileSize} MB (uncompressed RGBA)`,
        });
        
        // Translate shapes relative to expanded canvas (accounting for print expansion)
        translateX = -artboard.x + printExpansion;
        translateY = -artboard.y + printExpansion;
        filename = `${artboard.name}-export-${Date.now()}.${exportFormat}`;
      } else if (exportMode === 'selection' && selectedShapes.length > 0) {
        // Export selected shapes with bounds fitting
        shapesToExport = selectedShapes;
        
        // Calculate effective DPI based on export scale (same as artboard export)
        exportDPI = Math.round(72 * effectiveExportScale);

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        shapesToExport.forEach(shape => {
          const bounds = shape.getBounds();

          // Calculate transformed bounds by checking all four corners
          const corners = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x, y: bounds.y + bounds.height },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
          ];

          corners.forEach(corner => {
            // Apply transformations to each corner
            let x = corner.x;
            let y = corner.y;

            // Apply scale
            x *= shape.transform.scaleX;
            y *= shape.transform.scaleY;

            // Apply rotation
            if (shape.transform.rotation !== 0) {
              const cos = Math.cos(shape.transform.rotation * Math.PI / 180);
              const sin = Math.sin(shape.transform.rotation * Math.PI / 180);
              const newX = x * cos - y * sin;
              const newY = x * sin + y * cos;
              x = newX;
              y = newY;
            }

            // Apply translation
            x += shape.transform.x;
            y += shape.transform.y;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          });
        });

        const padding = 20;
        canvasWidth = (maxX - minX + padding * 2) * effectiveExportScale;
        canvasHeight = (maxY - minY + padding * 2) * effectiveExportScale;
        translateX = -minX + padding;
        translateY = -minY + padding;
        filename = `selection-export-${Date.now()}.${exportFormat}`;
      } else {
        // Export all shapes with bounds fitting
        shapesToExport = shapes;
        
        // Calculate effective DPI based on export scale (same as artboard export)
        exportDPI = Math.round(72 * effectiveExportScale);
        
        console.log(`Export attempt: Found ${shapesToExport.length} shapes to export`);
        if (shapesToExport.length === 0) {
          console.warn('No shapes found for export - creating blank canvas');
          // Create a blank canvas instead of returning
          canvasWidth = 800 * effectiveExportScale;
          canvasHeight = 600 * effectiveExportScale;
          translateX = 0;
          translateY = 0;
          filename = `all-export-${Date.now()}.${exportFormat}`;
        } else {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        shapesToExport.forEach(shape => {
          const bounds = shape.getBounds();

          // Calculate transformed bounds by checking all four corners
          const corners = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x, y: bounds.y + bounds.height },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
          ];

          corners.forEach(corner => {
            // Apply transformations to each corner
            let x = corner.x;
            let y = corner.y;

            // Apply scale
            x *= shape.transform.scaleX;
            y *= shape.transform.scaleY;

            // Apply rotation
            if (shape.transform.rotation !== 0) {
              const cos = Math.cos(shape.transform.rotation * Math.PI / 180);
              const sin = Math.sin(shape.transform.rotation * Math.PI / 180);
              const newX = x * cos - y * sin;
              const newY = x * sin + y * cos;
              x = newX;
              y = newY;
            }

            // Apply translation
            x += shape.transform.x;
            y += shape.transform.y;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          });
        });

          const padding = 20;
          canvasWidth = (maxX - minX + padding * 2) * effectiveExportScale;
          canvasHeight = (maxY - minY + padding * 2) * effectiveExportScale;
          translateX = -minX + padding;
          translateY = -minY + padding;
          filename = `all-shapes-export-${Date.now()}.${exportFormat}`;
        }
      }

      if (shapesToExport.length === 0) return;

      // Create export canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Get the current artboard for background color reference
      const currentArtboardData = exportMode === 'artboard' && selectedArtboardForExport
        ? artboards.find(ab => ab.id === selectedArtboardForExport)
        : artboards.find(ab => ab.id === activeArtboard);
      const artboardBgColor = currentArtboardData?.backgroundColor || '#ffffff';

      // Determine effective background color based on export settings
      // 'transparent' = no background, 'artboard' = use artboard's configured color
      const bgMode = exportSettings.exportBackgroundMode || 'transparent';
      const effectiveBgColor = bgMode === 'artboard' ? artboardBgColor : 'transparent';

      // Set background if not transparent
      if (effectiveBgColor !== 'transparent') {
        ctx.fillStyle = effectiveBgColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      // Save context state before transformations
      ctx.save();
      
      // Apply scaling and translation for shape rendering
      ctx.scale(effectiveExportScale, effectiveExportScale);
      ctx.translate(translateX, translateY);

      // Sort shapes by z-index and render them directly (no copying to avoid property corruption)
      const sortedShapes = [...shapesToExport].sort((a, b) => a.properties.zIndex - b.properties.zIndex);

      sortedShapes.forEach(shape => renderShapeForExport(ctx, shape));
      
      // Restore context to untransformed state for print marks
      ctx.restore();
      
      // Render print marks if configured (artboard exports only)
      // Print marks are rendered in canvas coordinate space (with scale but no translation)
      if (artboardForPrintMarks && printMarksConfig) {
        ctx.save();
        ctx.scale(effectiveExportScale, effectiveExportScale);
        renderPrintMarks(
          ctx,
          artboardForPrintMarks.x,
          artboardForPrintMarks.y,
          artboardForPrintMarks.width,
          artboardForPrintMarks.height,
          bleedPx,
          printMarksConfig
        );
        ctx.restore();
      }

      // Export using helper function that handles all formats including PDF
      await exportCanvasAsFormat(canvas, filename, exportFormat, exportQuality, effectiveExportScale, exportDPI);
      
      // Add a small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('❌ Export failed:', error);
      } finally {
        setIsExporting(false);
      }
    };

    const performBatchExport = async (filename: string) => {
      // Export all shapes for batch mode
      const shapesToExport = shapes;
      console.log(`Batch export: Found ${shapesToExport.length} shapes to export as ${filename}`);
      
      // Calculate effective DPI based on export scale (same as artboard export)
      const exportDPI = Math.round(72 * effectiveExportScale);
      
      // Set canvas dimensions based on shapes or default size
      let canvasWidth = 800 * effectiveExportScale;
      let canvasHeight = 600 * effectiveExportScale;
      let translateX = 0;
      let translateY = 0;

      if (shapesToExport.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        shapesToExport.forEach(shape => {
          const bounds = shape.getBounds();
          const corners = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x, y: bounds.y + bounds.height },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
          ];

          corners.forEach(corner => {
            let x = corner.x * shape.transform.scaleX;
            let y = corner.y * shape.transform.scaleY;

            if (shape.transform.rotation !== 0) {
              const cos = Math.cos(shape.transform.rotation * Math.PI / 180);
              const sin = Math.sin(shape.transform.rotation * Math.PI / 180);
              const newX = x * cos - y * sin;
              const newY = x * sin + y * cos;
              x = newX;
              y = newY;
            }

            x += shape.transform.x;
            y += shape.transform.y;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          });
        });

        const padding = 20;
        canvasWidth = (maxX - minX + padding * 2) * effectiveExportScale;
        canvasHeight = (maxY - minY + padding * 2) * effectiveExportScale;
        translateX = -minX + padding;
        translateY = -minY + padding;
      }

      // Create export canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Failed to get canvas context for batch export');
        return;
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Get the current artboard for background color reference
      const currentArtboardData = artboards.find(ab => ab.id === activeArtboard);
      const artboardBgColor = currentArtboardData?.backgroundColor || '#ffffff';

      // Determine effective background color based on export settings
      // 'transparent' = no background, 'artboard' = use artboard's configured color
      const bgMode = exportSettings.exportBackgroundMode || 'transparent';
      const effectiveBgColor = bgMode === 'artboard' ? artboardBgColor : 'transparent';

      // Set background if not transparent
      if (effectiveBgColor !== 'transparent') {
        ctx.fillStyle = effectiveBgColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      // Apply scaling and translation
      ctx.scale(effectiveExportScale, effectiveExportScale);
      ctx.translate(translateX, translateY);

      // Render shapes
      const sortedShapes = [...shapesToExport].sort((a, b) => a.properties.zIndex - b.properties.zIndex);
      sortedShapes.forEach(shape => renderShapeForExport(ctx, shape));

      // Export using helper function that handles all formats including PDF
      await exportCanvasAsFormat(canvas, filename, exportFormat, exportQuality, effectiveExportScale, exportDPI);
    };

    // Server-side high-resolution export handler
    const handleServerExport = async () => {
      setIsServerExportingGlobal(true);
      setBatchStatus('Processing on server...');
      setBatchProgress(10);
      
      try {
        const backgroundArtboard = artboards.find(ab => ab.id === activeArtboard);
        const targetArtboard = exportMode === 'artboard' 
          ? (selectedArtboardForExport 
              ? artboards.find(ab => ab.id === selectedArtboardForExport)
              : backgroundArtboard)
          : backgroundArtboard;
        
        const artboardWidth = targetArtboard?.width ?? backgroundArtboard?.width ?? 400;
        const artboardHeight = targetArtboard?.height ?? backgroundArtboard?.height ?? 400;
        const artboardDpi = targetArtboard?.dpi ?? backgroundArtboard?.dpi ?? 72;
        const artboardBgColor = targetArtboard?.backgroundColor ?? backgroundArtboard?.backgroundColor ?? '#ffffff';
        const printConfig = targetArtboard?.printConfig ?? backgroundArtboard?.printConfig;
        
        const bgMode = exportSettings.exportBackgroundMode || 'transparent';
        const is16Bit = (exportSettings.tiffBitDepth ?? 8) === 16;
        
        // Determine which shapes to export based on export mode
        // This mirrors the client-side export logic
        let shapesToExport: Shape[] = [];
        
        if (exportMode === 'artboard' || exportMode === 'all') {
          // Export all shapes - same behavior as client batch export
          shapesToExport = shapes;
        } else if (exportMode === 'selection') {
          // Export only selected shapes
          shapesToExport = selectedShapes;
        } else {
          // Default to all shapes
          shapesToExport = shapes;
        }
        
        // Serialize shapes with full data for server rendering (matching projectManager format)
        const serializeShape = (shape: Shape) => ({
          id: shape.id,
          type: shape.type,
          transform: shape.transform,
          properties: shape.properties,
          points: shape.points,
          sides: shape.sides,
          radius: shape.radius,
          innerRadius: shape.innerRadius,
          width: shape.width,
          height: shape.height,
          controlPoints: shape.controlPoints,
          tangentHandles: shape.tangentHandles,
          smoothPoints: shape.smoothPoints,
          closed: shape.closed,
          segments: shape.segments,
          renderType: shape.renderType,
          cornerRadius: shape.cornerRadius,
          strokeCap: shape.strokeCap
        });
        
        const serializedShapes = shapesToExport.map(serializeShape);
        
        // Serialize groups - include all groups that contain any of the shapes being exported
        // Use all available groups, not just selectedGroups
        const shapeIds = new Set(shapesToExport.map(s => s.id));
        const allGroups = [...selectedGroups]; // selectedGroups contains all groups in the scene
        const serializedGroups = allGroups
          .filter(group => group.shapes.some(s => shapeIds.has(s.id)))
          .map(group => ({
            id: group.id,
            transform: group.transform,
            shapes: group.shapes.filter(s => shapeIds.has(s.id)).map(s => s.id)
          }));
        
        const artboardX = targetArtboard?.x ?? backgroundArtboard?.x ?? 0;
        const artboardY = targetArtboard?.y ?? backgroundArtboard?.y ?? 0;
        
        const request: ServerExportRequest = {
          shapes: serializedShapes,
          groups: serializedGroups,
          artboard: {
            x: artboardX,
            y: artboardY,
            width: artboardWidth,
            height: artboardHeight,
            backgroundColor: artboardBgColor,
            dpi: artboardDpi,
            printConfig: printConfig
          },
          exportSettings: {
            format: 'tiff',
            bitDepth: is16Bit ? 16 : 8,
            dpi: artboardDpi,
            scale: effectiveExportScale,
            includeBleed: printConfig?.overlays.bleed.render ?? false,
            includePrintMarks: printConfig?.overlays.printMarks.render ?? false,
            backgroundColor: bgMode === 'artboard' ? artboardBgColor : undefined,
            backgroundMode: bgMode,
            compression: exportSettings.tiffCompression ?? 'none'
          }
        };
        
        setBatchProgress(30);
        setBatchStatus('Rendering on server...');
        
        console.log(`🖥️ SERVER EXPORT: Starting high-resolution export ${artboardWidth}×${artboardHeight} @ ${artboardDpi} DPI`);
        
        const blob = await executeServerExport(request);
        
        setBatchProgress(90);
        setBatchStatus('Downloading...');
        
        // Download the file
        const timestamp = Date.now();
        const filename = `export-${timestamp}.tiff`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        
        setBatchProgress(100);
        setBatchStatus('Export complete!');
        console.log(`✅ SERVER EXPORT: Complete - ${filename} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
        
        setTimeout(() => {
          setIsServerExportingGlobal(false);
          setBatchProgress(0);
          setBatchStatus('');
        }, 2000);
        
      } catch (error) {
        console.error('Server export failed:', error);
        setBatchStatus(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        setTimeout(() => {
          setIsServerExportingGlobal(false);
          setBatchProgress(0);
          setBatchStatus('');
        }, 3000);
      }
    };

    // Wrapper function that shows TIFF pre-flight modal if needed
    const handleBatchExportWithPreflight = useCallback(() => {
      if (!exportSettings.exportBatchModeEnabled) return;
      
      if (exportFormat === 'tiff' && !exportSettings.skipTiffPreflightModal) {
        // Store the export function to call after confirmation
        // Check if server export is needed
        const preflightInfo = getTiffPreflightInfo();
        if (preflightInfo.requiresServerExport) {
          pendingTiffExportRef.current = handleServerExport;
        } else {
          pendingTiffExportRef.current = handleBatchExportNewInternal;
        }
        setIsTiffPreflightOpen(true);
      } else {
        // For TIFF exports that skip preflight, still check if server export is needed
        if (exportFormat === 'tiff') {
          const preflightInfo = getTiffPreflightInfo();
          if (preflightInfo.requiresServerExport) {
            handleServerExport();
            return;
          }
        }
        handleBatchExportNewInternal();
      }
    }, [exportSettings.exportBatchModeEnabled, exportSettings.skipTiffPreflightModal, exportFormat, getTiffPreflightInfo]);
    
    // NEW BATCH EXPORT WITH ZIP PACKAGING (internal implementation)
    const handleBatchExportNewInternal = async () => {
      if (!exportSettings.exportBatchModeEnabled) return;

      // Initialize abort controller and elapsed time tracking
      exportAbortControllerRef.current = new AbortController();
      startElapsedTimeTracking();

      setIsBatchExporting(true);
      setBatchProgress(0);
      // Calculate actual number of images to export for step calculation
      const actualImageCount = exportAllImages ? exportBatchCount : selectedImageIndices.length;
      
      // Calculate total steps based on packaging mode and actual image count
      const totalSteps = packageAsZip 
        ? (actualImageCount * 2) + 2 // 2 steps per image + zip creation + download
        : (actualImageCount * 3); // 2 steps per image + individual download per image
      setBatchTotalSteps(totalSteps);
      setBatchStatus('Initializing batch export...');
      console.log(`🚀 BATCH EXPORT: Starting ${actualImageCount} exports (${packageAsZip ? 'ZIP package' : 'individual files'}) - ${exportAllImages ? 'All images' : 'Selected images'}`);
      
      // Get artboard for background color (used in all modes when available)
      const backgroundArtboard = artboards.find(ab => ab.id === activeArtboard);
      
      // Get the target artboard for dimensions (only when exportMode is 'artboard')
      const targetArtboard = exportMode === 'artboard' 
        ? (selectedArtboardForExport 
            ? artboards.find(ab => ab.id === selectedArtboardForExport)
            : backgroundArtboard)
        : null;
      
      const generationBounds = backgroundArtboard ? {
        x: backgroundArtboard.x,
        y: backgroundArtboard.y,
        width: backgroundArtboard.width,
        height: backgroundArtboard.height
      } : {
        x: -200,
        y: -200,
        width: 400,
        height: 400
      };
      
      console.log(`📐 Using bounds: ${generationBounds.width}x${generationBounds.height} at (${generationBounds.x}, ${generationBounds.y})`);
      
      // MEMORY ESTIMATION FOR TIFF EXPORTS
      // Calculate estimated memory requirements and apply limits for large TIFF exports
      const isTiffExport = exportFormat === 'tiff';
      let effectiveBatchCount = actualImageCount;
      
      if (isTiffExport) {
        // Calculate canvas dimensions with DPI scaling
        const baseDpi = 72;
        const artboardDpi = targetArtboard?.dpi ?? backgroundArtboard?.dpi ?? baseDpi;
        const dpiScale = artboardDpi / baseDpi;
        const scaledWidth = generationBounds.width * dpiScale;
        const scaledHeight = generationBounds.height * dpiScale;
        const pixelsPerImage = scaledWidth * scaledHeight;
        const megapixelsPerImage = pixelsPerImage / 1_000_000;
        
        // TIFF requires ~4 bytes per pixel for RGBA (getImageData) + encoding buffer
        const bytesPerImage = pixelsPerImage * 4;
        const mbPerImage = bytesPerImage / (1024 * 1024);
        const totalEstimatedMb = mbPerImage * actualImageCount;
        
        console.log(`🧮 TIFF Memory Estimation:`);
        console.log(`   - Canvas size: ${Math.round(scaledWidth)}×${Math.round(scaledHeight)} (${megapixelsPerImage.toFixed(1)} MP)`);
        console.log(`   - Memory per image: ~${mbPerImage.toFixed(0)} MB`);
        console.log(`   - Total for ${actualImageCount} images: ~${totalEstimatedMb.toFixed(0)} MB`);
        
        // Browser memory limits: ~1-2 GB practical limit for tab
        // Conservative threshold: warn above 300 MB, limit above 600 MB
        const WARNING_THRESHOLD_MB = 300;
        const LIMIT_THRESHOLD_MB = 600;
        const MAX_SAFE_MEGAPIXELS = 150; // ~600 MB for single image
        
        if (megapixelsPerImage > MAX_SAFE_MEGAPIXELS) {
          // Single image too large - warn but allow (user may have enough RAM)
          console.warn(`⚠️ TIFF export: Each image is ${megapixelsPerImage.toFixed(1)} MP (>${MAX_SAFE_MEGAPIXELS} MP limit). May cause memory issues.`);
          setBatchStatus(`⚠️ Large TIFF export (${megapixelsPerImage.toFixed(1)} MP per image). Processing sequentially...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (totalEstimatedMb > LIMIT_THRESHOLD_MB && actualImageCount > 1) {
          // Calculate safe batch size based on memory per image
          const maxSafeCount = Math.max(1, Math.floor(LIMIT_THRESHOLD_MB / mbPerImage));
          effectiveBatchCount = Math.min(actualImageCount, maxSafeCount);
          
          console.warn(`⚠️ TIFF batch export: Reducing from ${actualImageCount} to ${effectiveBatchCount} images to stay under ${LIMIT_THRESHOLD_MB} MB memory limit.`);
          setBatchStatus(`⚠️ Limiting TIFF batch to ${effectiveBatchCount} images for memory safety...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else if (totalEstimatedMb > WARNING_THRESHOLD_MB) {
          console.warn(`⚠️ TIFF batch export: Estimated ${totalEstimatedMb.toFixed(0)} MB memory usage. Processing carefully...`);
        }
      }
      
      try {
        // Initialize packaging based on user setting
        setBatchStatus(packageAsZip ? 'Initializing ZIP archive...' : 'Preparing individual files...');
        const zip = packageAsZip ? new JSZip() : null;
        const timestamp = Date.now();
        const individualFiles: Array<{blob: Blob, filename: string}> = [];
        
        let currentStep = 1; // Start at 1 to avoid initial 0% display
        
        // Determine which images to export based on exportAllImages setting
        // For TIFF exports, use effectiveBatchCount which may be reduced for memory safety
        const exportCount = isTiffExport ? effectiveBatchCount : exportBatchCount;
        const imagesToExport = exportAllImages 
          ? Array.from({ length: exportCount }, (_, i) => i)
          : selectedImageIndices.slice(0, exportCount); // Also limit selected indices for TIFF
        
        console.log(`🎯 Export selection: ${exportAllImages ? 'All images' : 'Selected images'} - Processing indices: [${imagesToExport.join(', ')}]`);
        if (isTiffExport && effectiveBatchCount < actualImageCount) {
          console.log(`📉 TIFF batch limited from ${actualImageCount} to ${effectiveBatchCount} images for memory safety`);
        }
        
        for (let loopIndex = 0; loopIndex < imagesToExport.length; loopIndex++) {
          // Check for abort signal at start of each iteration
          if (exportAbortControllerRef.current?.signal.aborted) {
            console.log('🛑 Export aborted during batch loop');
            stopElapsedTimeTracking();
            return;
          }
          
          const i = imagesToExport[loopIndex];
          console.log(`🎨 Creating artwork ${i + 1} of ${exportBatchCount}`);
          console.log(`📊 BATCH PROCESSING: ${i + 1} of ${exportBatchCount} exports`);
          
          // STEP 1: Shape Generation
          setBatchStatus(`Generating shapes for artwork ${i + 1}...`);
          setBatchProgress(currentStep);
          console.log(`📊 PROGRESS UPDATE: Step ${currentStep}/${totalSteps} - Generating shapes for artwork ${i + 1}`);
          
          // Force UI update before incrementing step
          await new Promise(resolve => {
            setTimeout(() => {
              console.log(`⏳ Shape generation delay completed for artwork ${i + 1} - Progress: ${currentStep}/${totalSteps}`);
              resolve(undefined);
            }, 200); // Reduced delay for better responsiveness
          });
          
          currentStep++;
          
          // Clear canvas and generate fresh shapes
          onClearAll?.();
          await new Promise(resolve => setTimeout(resolve, 200));

          // Generate shapes for this export using batch configuration
          // Use user's configured generations per export and shape count values
          let generationCallsCount: number;
          
          // When Shape Sets are enabled, ignore generations per export setting
          if (exportSettings.generationSetsEnabled && generationSets && generationSets.length > 0) {
            generationCallsCount = 1; // Each set runs once
            console.log(`🔢 SHAPE SETS MODE: Each set runs once (generationCallsCount=1)`);
          } else {
            // Determine generations per export based on user's mode setting
            if (generationConfigSettings?.generationCountMode === 'fixed') {
              generationCallsCount = generationConfigSettings?.generationCountDefine || 5;
              console.log(`🔢 Using FIXED generations per export: ${generationCallsCount} (user configured)`);
            } else if (generationConfigSettings?.generationCountMode === 'range') {
              // Use user's configured range from UI slider (exportShapeCountRange controlled by user)
              generationCallsCount = Math.floor(Math.random() * (exportShapeCountRange[1] - exportShapeCountRange[0] + 1)) + exportShapeCountRange[0];
              console.log(`🔢 Using RANGE generations per export: ${generationCallsCount} (random ${exportShapeCountRange[0]}-${exportShapeCountRange[1]} from user range slider)`);
            } else {
              // Fallback to default
              generationCallsCount = 5;
              console.log(`🔢 Using DEFAULT generations per export: ${generationCallsCount} (fallback)`);
            }
          }

          // Simulate multiple button presses - each call generates shapes based on user's shape count settings
          const currentExportShapes: Shape[] = [];
          
          // Check if generation sets mode is enabled
          if (exportSettings.generationSetsEnabled && generationSets && generationSets.length > 0) {
            const enabledSets = generationSets
              .filter(set => set.enabled)
              .sort((a, b) => a.generationOrder - b.generationOrder); // Sort by generationOrder
            
            if (enabledSets.length > 0) {
              console.log(`🎯 GENERATION SETS MODE: Using ${enabledSets.length} enabled sets`);
              
              // DIAGNOSTIC: Log each set's batchConfig on load
              enabledSets.forEach((set, idx) => {
                console.log(`🔍 [DIAGNOSTIC] Set ${idx + 1} "${set.name}" batchConfig:`, {
                  hasConfig: !!set.batchConfig,
                  propertiesEnabled: set.batchConfig?.propertiesEnabled,
                  fillColorMode: set.batchConfig?.fillColorMode,
                  fillColorDefine: set.batchConfig?.fillColorDefine,
                  fillOpacityDefine: set.batchConfig?.fillOpacityDefine,
                  fillStyleProbability: set.batchConfig?.fillStyleProbability
                });
              });
              
              // Loop through each generation call
              for (let callIndex = 0; callIndex < generationCallsCount; callIndex++) {
                // Generate shapes for each enabled set
                for (let setIndex = 0; setIndex < enabledSets.length; setIndex++) {
                  const set = enabledSets[setIndex];
                  
                  // Calculate repetition count for this set
                  const useSetRepetition = set.repetitionMode && set.repetitionMode !== 'use-global';
                  let repetitionCount = 0;
                  
                  if (useSetRepetition) {
                    if (set.repetitionMode === 'fixed') {
                      repetitionCount = set.repetitionValue || 0;
                    } else if (set.repetitionMode === 'range' && set.repetitionRange) {
                      const [min, max] = set.repetitionRange;
                      repetitionCount = Math.floor(Math.random() * (max - min + 1)) + min;
                    }
                  } else {
                    // Use global repetition settings
                    if (globalRepetitionMode === 'fixed') {
                      repetitionCount = globalRepetitionValue;
                    } else {
                      const [min, max] = globalRepetitionRange;
                      repetitionCount = Math.floor(Math.random() * (max - min + 1)) + min;
                    }
                  }
                  
                  const totalReps = Math.max(1, repetitionCount);
                  console.log(`🔁 [BATCH REPETITION] Set "${set.name}" will generate ${totalReps} time(s)`);
                  
                  // Loop for each repetition - regenerate shapes fresh each time
                  for (let repIndex = 0; repIndex < totalReps; repIndex++) {
                    if (repetitionCount > 0) {
                      console.log(`🔁 [BATCH REPETITION ${repIndex + 1}/${totalReps}] Generating fresh shapes for set "${set.name}"`);
                    }
                    
                    // Calculate shape count for this set
                    let shapesFromThisCall: number;
                    const isFixedMode = set.shapeCountMode === ShapeCountMode.FIXED || String(set.shapeCountMode).toLowerCase() === 'fixed';
                    if (isFixedMode) {
                      shapesFromThisCall = set.shapeCountFixed || 10;
                      console.log(`📞 [${set.name}] Generation ${callIndex + 1}/${generationCallsCount}: Creating ${shapesFromThisCall} shapes (FIXED)`);
                    } else {
                      shapesFromThisCall = Math.floor(Math.random() * (set.shapeCountRange[1] - set.shapeCountRange[0] + 1)) + set.shapeCountRange[0];
                      console.log(`📞 [${set.name}] Generation ${callIndex + 1}/${generationCallsCount}: Creating ${shapesFromThisCall} shapes (RANGE ${set.shapeCountRange[0]}-${set.shapeCountRange[1]})`);
                    }
                    
                    // Create overrides from set configuration
                    const overrides = {
                      enabledShapeTypes: new Set(set.enabledShapeTypes as ShapeType[]),
                      batchConfig: set.batchConfig,
                      scatterSettings: {
                        shapeCountMode: set.shapeCountMode,
                        fixedShapeCount: set.shapeCountFixed,
                        minCount: set.shapeCountRange[0],
                        maxCount: set.shapeCountRange[1],
                        shapeSpecific: set.shapeSpecificProperties
                      },
                      setTransform: set.setTransform,
                      artboardAlignment: set.artboardAlignment
                    };
                    
                    // DIAGNOSTIC: Log overrides being passed
                    console.log(`🔍 [DIAGNOSTIC] Passing overrides for "${set.name}":`, {
                      hasOverrides: !!overrides,
                      hasBatchConfig: !!overrides.batchConfig,
                      fillColorMode: overrides.batchConfig?.fillColorMode,
                      fillColorDefine: overrides.batchConfig?.fillColorDefine,
                      propertiesEnabled: overrides.batchConfig?.propertiesEnabled
                    });
                    
                    const newShapes = onGenerateShapesWithBatchConfig(
                      shapesFromThisCall, 
                      generationBounds, 
                      true, 
                      i + callIndex * 1000 + setIndex, 
                      set.shapeSpecificProperties,
                      overrides
                    );
                    
                    // Apply set-specific post-processing
                    // Apply z-index offset based on generation order (1000x spacing ensures sets never overlap)
                    newShapes.forEach(shape => {
                      shape.properties.zIndex += set.generationOrder * 1000;
                    });
                    
                    // NOTE: Set-level blend modes and compositing operations are applied during rendering,
                    // not to individual shapes. Shapes keep their own blend modes.
                    
                    // Apply visibility and opacity
                    if (set.setVisibility) {
                      if (!set.setVisibility.visible) {
                        // Skip adding these shapes if set is not visible
                        continue;
                      }
                      if (set.setVisibility.opacity !== undefined && set.setVisibility.opacity < 1.0) {
                        const variance = set.setVisibility.opacityVariance || 0;
                        newShapes.forEach(shape => {
                          const randomVariance = (Math.random() - 0.5) * 2 * variance;
                          const finalOpacity = Math.max(0, Math.min(1, set.setVisibility.opacity + randomVariance));
                          shape.properties.fillOpacity *= finalOpacity;
                          shape.properties.strokeOpacity *= finalOpacity;
                        });
                      }
                    }
                    
                    // Add the generated shapes to the collection
                    currentExportShapes.push(...newShapes);
                  } // End of repetition loop
                }
              }
            } else {
              console.log(`⚠️ No enabled generation sets, using current UI state as fallback`);
              // Fallback to current UI state
              for (let callIndex = 0; callIndex < generationCallsCount; callIndex++) {
                let shapesFromThisCall: number;
                if (scatterSettings.shapeCountMode === 'fixed') {
                  shapesFromThisCall = scatterSettings.fixedShapeCount || 10;
                  console.log(`📞 Generation call ${callIndex + 1}/${generationCallsCount}: Creating ${shapesFromThisCall} shapes (FIXED user configured)`);
                } else {
                  shapesFromThisCall = Math.floor(Math.random() * (scatterSettings.maxCount - scatterSettings.minCount + 1)) + scatterSettings.minCount;
                  console.log(`📞 Generation call ${callIndex + 1}/${generationCallsCount}: Creating ${shapesFromThisCall} shapes (RANGE ${scatterSettings.minCount}-${scatterSettings.maxCount})`);
                }
                const newShapes = onGenerateShapesWithBatchConfig(shapesFromThisCall, generationBounds, true, i + callIndex * 1000);
                currentExportShapes.push(...newShapes);
              }
            }
          } else {
            // Generation sets disabled - use current UI state
            console.log(`🎯 NORMAL MODE: Using current UI state`);
            for (let callIndex = 0; callIndex < generationCallsCount; callIndex++) {
              let shapesFromThisCall: number;
              
              // Determine shapes per generation based on user's shape count mode
              if (scatterSettings.shapeCountMode === 'fixed') {
                shapesFromThisCall = scatterSettings.fixedShapeCount || 10;
                console.log(`📞 Generation call ${callIndex + 1}/${generationCallsCount}: Creating ${shapesFromThisCall} shapes (FIXED user configured)`);
              } else {
                shapesFromThisCall = Math.floor(Math.random() * (scatterSettings.maxCount - scatterSettings.minCount + 1)) + scatterSettings.minCount;
                console.log(`📞 Generation call ${callIndex + 1}/${generationCallsCount}: Creating ${shapesFromThisCall} shapes (RANGE ${scatterSettings.minCount}-${scatterSettings.maxCount})`);
              }
              
              const newShapes = onGenerateShapesWithBatchConfig(shapesFromThisCall, generationBounds, true, i + callIndex * 1000);
              currentExportShapes.push(...newShapes);
            }
          }
          
          console.log(`✨ Generated ${currentExportShapes.length} total shapes from ${generationCallsCount} generation calls for export ${i + 1}`);

          // Check for abort after shape generation
          if (exportAbortControllerRef.current?.signal.aborted) {
            console.log('🛑 Export aborted after shape generation');
            stopElapsedTimeTracking();
            return;
          }

          // Create image data for ZIP with timestamp
          const imageTimestamp = Date.now() + i; // Unique timestamp for each image
          const filename = `batch-${String(i + 1).padStart(3, '0')}-${imageTimestamp}.${exportFormat}`;
          
          if (currentExportShapes.length > 0) {
            // STEP 2: Image Creation and Export
            setBatchStatus(`Creating image for artwork ${i + 1}...`);
            setBatchProgress(currentStep);
            console.log(`📊 PROGRESS UPDATE: Step ${currentStep}/${totalSteps} - Creating image for artwork ${i + 1}`);
            
            // Force UI update before incrementing step
            await new Promise(resolve => {
              setTimeout(() => {
                console.log(`⏳ Image creation delay completed for artwork ${i + 1} - Progress: ${currentStep}/${totalSteps}`);
                resolve(undefined);
              }, 200); // Reduced delay for better responsiveness
            });
            
            currentStep++;
            
            console.log(`🖼️ Processing ${currentExportShapes.length} shapes for ${filename}`);
            
            // Use artboard bounds for export dimensions when in artboard mode
            let canvasWidth, canvasHeight, translateX, translateY;
            
            // Print configuration variables for batch export
            let batchBleedPx = 0;
            let batchPrintMarksGutterPx = 0;
            let batchPrintExpansion = 0;
            let batchArtboardForPrintMarks: { x: number; y: number; width: number; height: number } | null = null;
            let batchPrintMarksConfig: { cropMarks: boolean; registrationMarks: boolean; markLength: number; markOffset: number } | null = null;
            
            if (targetArtboard) {
              // Get print configuration from artboard
              const batchPrintConfig = targetArtboard.printConfig || DEFAULT_PRINT_CONFIG;
              // Calculate effective DPI based on export scale (same as artboard export)
              const batchExportDPI = Math.round(72 * effectiveExportScale);
              const batchOverlayUnit = batchPrintConfig.overlays.overlayUnit || 'pixels';
              
              // DEBUG: Log print configuration for batch export
              console.log('🖨️ [BATCH EXPORT DEBUG] Print Configuration:', {
                artboardName: targetArtboard.name,
                hasPrintConfig: !!targetArtboard.printConfig,
                overlayUnit: batchOverlayUnit,
                bleed: {
                  amount: batchPrintConfig.overlays.bleed.amount,
                  render: batchPrintConfig.overlays.bleed.render,
                },
                printMarks: {
                  cropMarks: batchPrintConfig.overlays.printMarks.cropMarks,
                  registrationMarks: batchPrintConfig.overlays.printMarks.registrationMarks,
                  render: batchPrintConfig.overlays.printMarks.render,
                },
              });
              
              // Calculate bleed expansion (if render is enabled)
              if (batchPrintConfig.overlays.bleed.render && batchPrintConfig.overlays.bleed.amount > 0) {
                batchBleedPx = convertPrintUnitToPixels(
                  batchPrintConfig.overlays.bleed.amount,
                  batchOverlayUnit,
                  batchExportDPI
                );
              }
              
              // Calculate print marks gutter (if render is enabled)
              if (batchPrintConfig.overlays.printMarks.render && (batchPrintConfig.overlays.printMarks.cropMarks || batchPrintConfig.overlays.printMarks.registrationMarks)) {
                const scaleMode = batchPrintConfig.overlays.printMarks.scaleMode || 'none';
                const minDimension = Math.min(targetArtboard.width, targetArtboard.height);
                
                let markLengthPx: number;
                let markOffsetPx: number;
                
                if (scaleMode === 'percent') {
                  // Percentage mode: values are percentages of the smaller artboard dimension
                  markLengthPx = (batchPrintConfig.overlays.printMarks.markLength / 100) * minDimension;
                  markOffsetPx = (batchPrintConfig.overlays.printMarks.markOffset / 100) * minDimension;
                } else {
                  // Default mode: convert from unified unit to pixels
                  markLengthPx = convertPrintUnitToPixels(
                    batchPrintConfig.overlays.printMarks.markLength,
                    batchOverlayUnit,
                    batchExportDPI
                  );
                  markOffsetPx = convertPrintUnitToPixels(
                    batchPrintConfig.overlays.printMarks.markOffset,
                    batchOverlayUnit,
                    batchExportDPI
                  );
                }
                
                batchPrintMarksGutterPx = markLengthPx + markOffsetPx + 10;
                
                batchPrintMarksConfig = {
                  cropMarks: batchPrintConfig.overlays.printMarks.cropMarks,
                  registrationMarks: batchPrintConfig.overlays.printMarks.registrationMarks,
                  markLength: markLengthPx,
                  markOffset: markOffsetPx
                };
              }
              
              // Total print expansion
              batchPrintExpansion = batchBleedPx + batchPrintMarksGutterPx;
              
              // Store artboard bounds for print marks rendering
              if (batchPrintExpansion > 0) {
                batchArtboardForPrintMarks = {
                  x: batchPrintExpansion,
                  y: batchPrintExpansion,
                  width: targetArtboard.width,
                  height: targetArtboard.height
                };
              }
              
              console.log('🖨️ [BATCH EXPORT DEBUG] Print Expansion:', {
                bleedPx: batchBleedPx,
                printMarksGutterPx: batchPrintMarksGutterPx,
                totalExpansion: batchPrintExpansion,
                willRenderMarks: !!batchPrintMarksConfig,
              });
              
              // Use artboard dimensions with print expansion
              canvasWidth = (targetArtboard.width + (batchPrintExpansion * 2)) * effectiveExportScale;
              canvasHeight = (targetArtboard.height + (batchPrintExpansion * 2)) * effectiveExportScale;
              translateX = -targetArtboard.x + batchPrintExpansion;
              translateY = -targetArtboard.y + batchPrintExpansion;
              console.log(`📐 Using artboard bounds: ${targetArtboard.width}x${targetArtboard.height} (expanded to ${canvasWidth/effectiveExportScale}x${canvasHeight/effectiveExportScale} with print config)`);
            } else {
              // Calculate dynamic bounds based on shapes
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
              
              currentExportShapes.forEach(shape => {
                const bounds = shape.getBounds();
                const corners = [
                  { x: bounds.x, y: bounds.y },
                  { x: bounds.x + bounds.width, y: bounds.y },
                  { x: bounds.x, y: bounds.y + bounds.height },
                  { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
                ];
                
                corners.forEach(corner => {
                  let x = corner.x * shape.transform.scaleX;
                  let y = corner.y * shape.transform.scaleY;
                  
                  if (shape.transform.rotation !== 0) {
                    const angle = (shape.transform.rotation * Math.PI) / 180;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    const rotatedX = x * cos - y * sin;
                    const rotatedY = x * sin + y * cos;
                    x = rotatedX;
                    y = rotatedY;
                  }
                  
                  x += shape.transform.x;
                  y += shape.transform.y;

                  minX = Math.min(minX, x);
                  minY = Math.min(minY, y);
                  maxX = Math.max(maxX, x);
                  maxY = Math.max(maxY, y);
                });
              });

              const padding = 20;
              canvasWidth = (maxX - minX + padding * 2) * effectiveExportScale;
              canvasHeight = (maxY - minY + padding * 2) * effectiveExportScale;
              translateX = -minX + padding;
              translateY = -minY + padding;
              console.log(`📐 Using dynamic bounds: ${canvasWidth/effectiveExportScale}x${canvasHeight/effectiveExportScale}`);
            }

            // MEMORY ESTIMATION: Log canvas size for diagnostics
            // Browser practical limit is ~268 MP for single canvas, but batch mode needs headroom
            const pixelCount = canvasWidth * canvasHeight;
            const megapixels = pixelCount / 1_000_000;
            const estimatedMB = (pixelCount * 4) / (1024 * 1024); // RGBA = 4 bytes per pixel
            
            // Adaptive limits: single exports can use more memory than batch exports
            // Browser can handle ~268 MP for single canvas, but batch mode needs headroom for multiple allocations
            // A4 at 300 DPI scaled = 2480*4.17 x 3508*4.17 = ~151 MP, so we need 160+ for print workflows
            const isSingleExport = exportBatchCount === 1;
            const maxMegapixelsSingle = 220; // ~880MB - safe for single large exports, allows poster sizes
            const maxMegapixelsBatch = 160;  // ~640MB per image - allows A4 300DPI in small batches
            
            const effectiveLimit = isSingleExport ? maxMegapixelsSingle : maxMegapixelsBatch;
            
            console.log(`📊 Memory estimate: ${megapixels.toFixed(1)}MP (${estimatedMB.toFixed(0)}MB RGBA), limit: ${effectiveLimit}MP, mode: ${isSingleExport ? 'single' : 'batch'}`);
            
            if (megapixels > effectiveLimit) {
              const suggestedScale = Math.sqrt(effectiveLimit * 1_000_000 / (targetArtboard?.width ?? 2480) / (targetArtboard?.height ?? 3508));
              console.error(`❌ MEMORY GUARD: Canvas size ${Math.round(canvasWidth)}x${Math.round(canvasHeight)} (${megapixels.toFixed(1)}MP) exceeds safe limit (${effectiveLimit}MP) for ${isSingleExport ? 'single' : 'batch'} ${exportFormat.toUpperCase()} export.`);
              
              // Graceful degradation: skip this image but continue batch
              setBatchStatus(`⚠️ Skipping image ${i + 1}: Too large (${megapixels.toFixed(0)}MP > ${effectiveLimit}MP limit)`);
              
              // Show user-friendly message only on first failure
              if (i === 0) {
                alert(`Export size exceeds browser memory limits.\n\nCurrent: ${megapixels.toFixed(0)} megapixels (~${estimatedMB.toFixed(0)}MB)\nLimit: ${effectiveLimit} megapixels\n\nTry:\n• Reduce export scale to ${suggestedScale.toFixed(1)}x or lower\n• Reduce batch count to export fewer images at once\n• For very large exports, consider using a desktop app`);
                throw new Error(`Memory limit exceeded for ${exportFormat} export`);
              }
              continue; // Skip this image in batch
            }
            
            console.log(`✅ Memory check passed: ${megapixels.toFixed(1)}MP (limit: ${effectiveLimit}MP)`);

            // Create canvas and render
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              throw new Error(`Failed to get canvas context for export ${i + 1}`);
            }
            
            try {
              canvas.width = canvasWidth;
              canvas.height = canvasHeight;

              // Determine effective background color based on export settings
              // 'transparent' = no background, 'artboard' = use artboard's configured color
              const artboardBgColor = backgroundArtboard?.backgroundColor || '#ffffff';
              const bgMode = exportSettings.exportBackgroundMode || 'transparent';
              const exportBackgroundColor = bgMode === 'artboard' ? artboardBgColor : 'transparent';

              // Check if we need set-based rendering (for compositing operations)
              const hasCompositingOperations = exportSettings.generationSetsEnabled && 
                generationSets?.some(set => set.enabled && set.compositingOperation && set.compositingOperation !== 'source-over');

              if (hasCompositingOperations && exportSettings.generationSetsEnabled && generationSets) {
                // SET-BASED RENDERING WITH COMPOSITING: Use offscreen canvas to avoid background interference
                console.log('🎨 Using set-based rendering with offscreen compositing (background applied last)');
                
                // Create offscreen canvas for compositing (transparent background)
                const compositingCanvas = document.createElement('canvas');
                compositingCanvas.width = canvasWidth;
                compositingCanvas.height = canvasHeight;
                const compositingCtx = compositingCanvas.getContext('2d');
                
                if (!compositingCtx) {
                  throw new Error('Failed to create compositing canvas context');
                }
                
                compositingCtx.scale(effectiveExportScale, effectiveExportScale);
                compositingCtx.translate(translateX, translateY);
                
                const enabledSets = generationSets
                  .filter(set => set.enabled)
                  .sort((a, b) => a.generationOrder - b.generationOrder);
                
                // Group shapes by set using z-index ranges (sets use 1000x multiplier)
                const shapesBySet: Map<number, Shape[]> = new Map();
                currentExportShapes.forEach(shape => {
                  const setIndex = Math.floor(shape.properties.zIndex / 1000);
                  if (!shapesBySet.has(setIndex)) {
                    shapesBySet.set(setIndex, []);
                  }
                  shapesBySet.get(setIndex)!.push(shape);
                });
                
                // Calculate SHARED canvas dimensions from ALL shapes (across all sets)
                // This ensures all offscreen canvases are the same size, maintaining relative positions
                let globalMinX = Infinity, globalMinY = Infinity, globalMaxX = -Infinity, globalMaxY = -Infinity;
                currentExportShapes.forEach(shape => {
                  const worldBounds = shape.getWorldBounds();
                  globalMinX = Math.min(globalMinX, worldBounds.x);
                  globalMinY = Math.min(globalMinY, worldBounds.y);
                  globalMaxX = Math.max(globalMaxX, worldBounds.x + worldBounds.width);
                  globalMaxY = Math.max(globalMaxY, worldBounds.y + worldBounds.height);
                });

                // Add padding
                const padding = 50;
                globalMinX -= padding;
                globalMinY -= padding;
                globalMaxX += padding;
                globalMaxY += padding;

                // Calculate shared canvas dimensions in world coordinates (no translation yet)
                const sharedWidth = Math.ceil((globalMaxX - globalMinX) * effectiveExportScale);
                const sharedHeight = Math.ceil((globalMaxY - globalMinY) * effectiveExportScale);

                console.log(`📐 Shared canvas dimensions: ${sharedWidth}x${sharedHeight} for all sets`);
                
                // Render each set to an offscreen canvas (all same size), then composite onto compositing canvas
                enabledSets.forEach((set, idx) => {
                  const setShapes = shapesBySet.get(set.generationOrder) || [];
                  if (setShapes.length === 0) return;
                  
                  console.log(`🖼️ Rendering set "${set.name}" (${setShapes.length} shapes) to shared-size offscreen canvas`);
                  
                  // Create offscreen canvas with SHARED dimensions (same for all sets)
                  const setCanvas = document.createElement('canvas');
                  setCanvas.width = sharedWidth;
                  setCanvas.height = sharedHeight;
                  const setCtx = setCanvas.getContext('2d');
                  
                  if (!setCtx) {
                    console.error(`Failed to create context for set "${set.name}"`);
                    return;
                  }
                  
                  // Apply transform for world coordinates (translate to align with global bounds)
                  setCtx.scale(effectiveExportScale, effectiveExportScale);
                  setCtx.translate(-globalMinX, -globalMinY);
                  
                  // Render shapes for this set with their individual blend modes/comp ops
                  const sortedSetShapes = [...setShapes].sort((a, b) => a.properties.zIndex - b.properties.zIndex);
                  sortedSetShapes.forEach(shape => renderShapeForExport(setCtx, shape));
                  
                  // Composite set canvas onto compositing canvas with set-level blend mode/compositing
                  compositingCtx.save();
                  compositingCtx.setTransform(1, 0, 0, 1, 0, 0); // Reset to pixel coordinates
                  
                  const effectiveBlendMode = (set.compositingOperation && set.compositingOperation !== 'source-over')
                    ? set.compositingOperation
                    : set.setBlendMode;
                  
                  if (effectiveBlendMode && effectiveBlendMode !== 'source-over') {
                    compositingCtx.globalCompositeOperation = effectiveBlendMode as GlobalCompositeOperation;
                    console.log(`🎨 Applying ${effectiveBlendMode} to set "${set.name}"`);
                  }
                  
                  // Draw at world coordinates - compositingCtx already has scale/translate applied
                  const canvasX = (globalMinX + translateX) * effectiveExportScale;
                  const canvasY = (globalMinY + translateY) * effectiveExportScale;
                  compositingCtx.drawImage(setCanvas, canvasX, canvasY);
                  
                  // Reset composite operation for next set
                  compositingCtx.globalCompositeOperation = 'source-over';
                  compositingCtx.restore();
                  
                  // Cleanup
                  setCanvas.width = 0;
                  setCanvas.height = 0;
                });
                
                // NOW draw background to final canvas FIRST (if not transparent)
                if (exportBackgroundColor !== 'transparent') {
                  ctx.fillStyle = exportBackgroundColor;
                  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                }
                
                // Then draw composited shapes OVER background (using destination-over would put shapes behind)
                ctx.drawImage(compositingCanvas, 0, 0);
                
                // Render print marks for SET-BASED rendering path
                if (batchArtboardForPrintMarks && batchPrintMarksConfig) {
                  ctx.save();
                  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
                  ctx.scale(effectiveExportScale, effectiveExportScale);
                  renderPrintMarks(
                    ctx,
                    batchArtboardForPrintMarks.x,
                    batchArtboardForPrintMarks.y,
                    batchArtboardForPrintMarks.width,
                    batchArtboardForPrintMarks.height,
                    batchBleedPx,
                    batchPrintMarksConfig
                  );
                  ctx.restore();
                  console.log('🖨️ Print marks rendered (SET-BASED path)');
                }
                
                console.log('✅ Background applied after compositing, preventing interference');
              } else {
                // STANDARD RENDERING: Draw background first (if not transparent), then shapes
                console.log('🎨 Using standard per-shape rendering (background first)');
                if (exportBackgroundColor !== 'transparent') {
                  ctx.fillStyle = exportBackgroundColor;
                  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                }
                
                ctx.save();
                ctx.scale(effectiveExportScale, effectiveExportScale);
                ctx.translate(translateX, translateY);
                
                const sortedShapes = [...currentExportShapes].sort((a, b) => a.properties.zIndex - b.properties.zIndex);
                sortedShapes.forEach(shape => renderShapeForExport(ctx, shape));
                
                ctx.restore();
                
                // Render print marks for STANDARD rendering path
                if (batchArtboardForPrintMarks && batchPrintMarksConfig) {
                  ctx.save();
                  ctx.scale(effectiveExportScale, effectiveExportScale);
                  renderPrintMarks(
                    ctx,
                    batchArtboardForPrintMarks.x,
                    batchArtboardForPrintMarks.y,
                    batchArtboardForPrintMarks.width,
                    batchArtboardForPrintMarks.height,
                    batchBleedPx,
                    batchPrintMarksConfig
                  );
                  ctx.restore();
                  console.log('🖨️ Print marks rendered (STANDARD path)');
                }
              }

              // Convert canvas to blob and add to ZIP
              if (exportFormat === 'pdf') {
                // Handle PDF separately for ZIP exports
                const pdf = new jsPDF({
                  orientation: canvasWidth > canvasHeight ? 'landscape' : 'portrait',
                  unit: 'pt',
                  format: [canvasWidth / effectiveExportScale, canvasHeight / effectiveExportScale]
                });
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvasWidth / effectiveExportScale, canvasHeight / effectiveExportScale);
                const pdfBlob = pdf.output('blob');
                if (packageAsZip && zip) {
                  zip.file(filename, pdfBlob);
                  console.log(`📦 Added ${filename} to ZIP`);
                } else {
                  individualFiles.push({ blob: pdfBlob, filename });
                  console.log(`📁 Prepared ${filename} for individual download`);
                }
              } else if (exportFormat === 'tiff') {
                // Handle TIFF format using UTIF library
                const tiffCtx = canvas.getContext('2d');
                if (tiffCtx) {
                  // Memory guardrail: limit to 200 megapixels (800MB RGBA data) to support A4 300DPI scaled exports
                  const maxPixels = 200_000_000;
                  const pixelCount = canvas.width * canvas.height;
                  if (pixelCount > maxPixels) {
                    console.error(`❌ TIFF batch export skipped for image ${i + 1}: Canvas size (${canvas.width}x${canvas.height} = ${pixelCount.toLocaleString()} pixels) exceeds maximum allowed (${maxPixels.toLocaleString()} pixels).`);
                    continue; // Skip this image in batch mode
                  }
                  
                  try {
                    const imageData = tiffCtx.getImageData(0, 0, canvas.width, canvas.height);
                    const rgba = new Uint8Array(imageData.data.buffer);
                    
                    // Calculate effective DPI based on export scale (same as artboard export)
                    const batchTiffDPI = Math.round(72 * effectiveExportScale);
                    
                    // Build TIFF metadata with DPI tags only (not width/height/data - those are separate params)
                    // Note: UTIF.js encodeImage supports uncompressed (1) or Deflate (8) with Pako.js
                    // LZW compression (5) is NOT supported for encoding - setting t259=[5] corrupts output
                    const batchTiffCompression = exportSettings.tiffCompression ?? 'none';
                    const tiffMetadata = {
                      t282: [batchTiffDPI],  // XResolution
                      t283: [batchTiffDPI],  // YResolution
                      t296: [2],          // ResolutionUnit (2 = inch)
                      t259: [batchTiffCompression === 'deflate' ? 8 : 1], // Compression: 8=Deflate, 1=None
                    } as unknown as UTIF.IFD;
                    
                    console.log(`📄 TIFF batch: Using ${batchTiffCompression === 'deflate' ? 'Deflate' : 'no'} compression`);
                    
                    console.log(`🔄 Encoding TIFF for image ${i + 1}...`);
                    const tiffBuffer = UTIF.encodeImage(rgba, canvas.width, canvas.height, tiffMetadata);
                    const tiffBlob = new Blob([tiffBuffer], { type: 'image/tiff' });
                    
                    if (packageAsZip && zip) {
                      zip.file(filename, tiffBlob);
                      console.log(`📦 Added ${filename} to ZIP (TIFF with ${batchTiffDPI} DPI)`);
                    } else {
                      individualFiles.push({ blob: tiffBlob, filename });
                      console.log(`📁 Prepared ${filename} for individual download (TIFF with ${batchTiffDPI} DPI)`);
                    }
                    
                    // ENHANCED MEMORY CLEANUP FOR TIFF:
                    // Clear references to large buffers to help garbage collection
                    // Note: Variables are block-scoped but explicitly nulling helps GC
                    console.log(`🧹 Releasing TIFF memory buffers for image ${i + 1}...`);
                    
                    // Allow event loop to process and GC to potentially run
                    // This pause is critical for sequential TIFF processing
                    if (loopIndex < imagesToExport.length - 1) {
                      setBatchStatus(`Memory cleanup after TIFF ${i + 1}...`);
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }
                  } catch (tiffError) {
                    console.error(`❌ TIFF encoding failed for image ${i + 1}:`, tiffError);
                    setBatchStatus(`⚠️ TIFF encoding failed for image ${i + 1}`);
                    // Continue with next image instead of crashing
                    continue;
                  }
                }
              } else {
                // Handle raster formats
                let dataURL: string;
                switch (exportFormat) {
                  case 'jpg':
                    dataURL = canvas.toDataURL('image/jpeg', exportQuality / 100);
                    break;
                  case 'webp':
                    dataURL = canvas.toDataURL('image/webp', exportQuality / 100);
                    break;
                  case 'avif':
                    dataURL = canvas.toDataURL('image/avif', exportQuality / 100);
                    break;
                  case 'bmp':
                    dataURL = canvas.toDataURL('image/bmp');
                    break;
                  case 'png':
                  default:
                    dataURL = canvas.toDataURL('image/png');
                    break;
                }
                
                if (packageAsZip && zip) {
                  // Extract base64 data from data URL for ZIP
                  const base64Data = dataURL.split(',')[1];
                  zip.file(filename, base64Data, { base64: true });
                  console.log(`📦 Added ${filename} to ZIP`);
                } else {
                  // Convert data URL to blob for individual download
                  const response = await fetch(dataURL);
                  const blob = await response.blob();
                  individualFiles.push({ blob, filename });
                  console.log(`📁 Prepared ${filename} for individual download`);
                }
              }

              // Save project file if enabled
              if (exportSaveProjectFiles) {
                const projectFilename = filename.replace(/\.(png|jpg|webp|avif|bmp|pdf|tiff)$/, '.json');
                const projectData = {
                  shapes: currentExportShapes,
                  groups: [], // Empty for batch exports
                  enabledShapeTypes: Array.from(enabledShapeTypes),
                  artboards: targetArtboard ? [targetArtboard] : [],
                  metadata: {
                    exportIndex: i + 1,
                    totalExports: exportBatchCount,
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                    exportMode: exportMode,
                    generationBounds: generationBounds,
                    imageFilename: filename,
                    shapeCount: currentExportShapes.length,
                    description: `Batch export ${i + 1} of ${exportBatchCount} - Generated ${currentExportShapes.length} shapes`
                  }
                };
                
                const projectJson = JSON.stringify(projectData, null, 2);
                
                if (packageAsZip && zip) {
                  zip.file(projectFilename, projectJson);
                  console.log(`💾 Added project file ${projectFilename} to ZIP`);
                } else {
                  const projectBlob = new Blob([projectJson], { type: 'application/json' });
                  individualFiles.push({ blob: projectBlob, filename: projectFilename });
                  console.log(`📁 Prepared project file ${projectFilename} for individual download`);
                }
              }
            } catch (canvasError) {
              throw new Error(`Canvas rendering failed for export ${i + 1}: ${canvasError instanceof Error ? canvasError.message : 'Unknown canvas error'}`);
            } finally {
              // Immediate canvas cleanup to prevent memory leaks
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              canvas.width = 0;
              canvas.height = 0;
              console.log(`🧹 Cleaned up canvas for image ${i + 1}`);
            }
          } else {
            console.error(`❌ No shapes generated for export ${i + 1}`);
          }

          // Progress already updated after image creation step
          
          // Check for abort after image creation
          if (exportAbortControllerRef.current?.signal.aborted) {
            console.log('🛑 Export aborted after image creation');
            stopElapsedTimeTracking();
            return;
          }
        }
        
        // FINAL STEP: Package and Download
        if (packageAsZip && zip) {
          // ZIP Creation and Download
          setBatchStatus('Creating ZIP file...');
          setBatchProgress(currentStep);
          console.log(`📊 PROGRESS UPDATE: Step ${currentStep}/${totalSteps} - Creating ZIP file`);
          
          // Force UI update before incrementing step
          await new Promise(resolve => {
            setTimeout(() => {
              console.log(`⏳ ZIP creation delay completed - Progress: ${currentStep}/${totalSteps}`);
              resolve(undefined);
            }, 300); // Reduced delay for better responsiveness
          });
          
          currentStep++;
          
          const projectFilesText = exportSaveProjectFiles ? ` and ${exportBatchCount} project files` : '';
          console.log(`📦 Creating ZIP file with ${exportBatchCount} images${projectFilesText}`);
          
          let zipBlob;
          try {
            setBatchStatus('Generating ZIP file...');
            
            // Use compression level 1 for better mobile compatibility (faster, less memory-intensive)
            zipBlob = await zip.generateAsync({ 
              type: 'blob',
              compression: 'DEFLATE',
              compressionOptions: { level: 1 }
            });
            
            console.log(`✅ ZIP blob generated successfully, size: ${zipBlob.size} bytes`);
            
            // Check if blob is too large for mobile browsers (warn if > 100MB)
            if (zipBlob.size > 100 * 1024 * 1024) {
              console.warn(`⚠️ Large ZIP file (${Math.round(zipBlob.size / 1024 / 1024)}MB) - may cause issues on mobile`);
            }
          } catch (zipError) {
            throw new Error(`Failed to generate ZIP file: ${zipError instanceof Error ? zipError.message : 'Unknown ZIP error'}`);
          }
        
          setBatchStatus('Downloading ZIP file...');
          setBatchProgress(currentStep);
          console.log(`📊 PROGRESS UPDATE: Step ${currentStep}/${totalSteps} - Downloading ZIP file`);
          
          // Force UI update before download
          await new Promise(resolve => {
            setTimeout(() => {
              console.log(`⏳ Download preparation delay completed - Progress: ${currentStep}/${totalSteps}`);
              resolve(undefined);
            }, 300); // Reduced delay for better responsiveness
          });
          
          currentStep++;
          
          try {
            setBatchStatus('Triggering download...');
            console.log(`📥 Creating download link for ZIP file (${zipBlob.size} bytes)`);
            
            const link = document.createElement('a');
            const blobUrl = URL.createObjectURL(zipBlob);
            
            // Enhanced mobile compatibility settings
            link.href = blobUrl;
            link.download = `batch-export-${timestamp}.zip`;
            link.style.display = 'none';
            link.target = '_blank'; // Helps with some mobile browsers
            
            // Add to DOM temporarily for better mobile compatibility
            document.body.appendChild(link);
          
          // Use multiple methods for better mobile compatibility
          try {
            link.click();
            console.log(`📱 Primary download method triggered`);
          } catch (clickError) {
            console.warn(`⚠️ Primary download failed, trying fallback:`, clickError);
            // Fallback: try to trigger download event manually
            const event = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true
            });
            link.dispatchEvent(event);
          }
          
          // Clean up DOM
          setTimeout(() => {
            if (document.body.contains(link)) {
              document.body.removeChild(link);
            }
          }, 1000);
          
          // Clean up blob URL immediately after download starts
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
            console.log(`🧹 Cleaned up blob URL`);
          }, 2000); // Reduced from 10 seconds to 2 seconds for better performance
          
            setBatchStatus('Download initiated!');
            console.log(`🎉 ZIP COMPLETE: Download initiated for batch-export-${timestamp}.zip with ${exportBatchCount} images${projectFilesText}`);
          } catch (downloadError) {
            throw new Error(`Failed to trigger download: ${downloadError instanceof Error ? downloadError.message : 'Unknown download error'}`);
          }
        } else {
          // Individual File Downloads
          setBatchStatus('Downloading individual files...');
          console.log(`📁 INDIVIDUAL FILES: Starting ${individualFiles.length} individual downloads`);
          
          // Detect mobile device once for the entire download session
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          const delayMs = isMobile ? 3000 : 800; // 3 seconds for mobile, 800ms for desktop
          console.log(`📱 Device detected: ${isMobile ? 'mobile' : 'desktop'} - using ${delayMs}ms delays between downloads`);
          
          for (let fileIndex = 0; fileIndex < individualFiles.length; fileIndex++) {
            const { blob, filename } = individualFiles[fileIndex];
            
            // Add delay BEFORE each download (including the first one) to let browser settle
            if (fileIndex > 0 || isMobile) {
              setBatchStatus(`Preparing download ${fileIndex + 1}/${individualFiles.length} - waiting for browser...`);
              console.log(`⏳ Pre-download delay (${delayMs}ms) before ${filename}`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            
            setBatchStatus(`Downloading ${filename} (${fileIndex + 1}/${individualFiles.length})...`);
            setBatchProgress(currentStep);
            console.log(`📊 PROGRESS UPDATE: Step ${currentStep}/${totalSteps} - Downloading ${filename}`);
            currentStep++;
            
            try {
              const link = document.createElement('a');
              const blobUrl = URL.createObjectURL(blob);
              
              link.href = blobUrl;
              link.download = filename;
              link.style.display = 'none';
              link.target = '_blank';
              
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              // Clean up blob URL after a delay
              setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
              }, 5000);
              
              console.log(`✅ Downloaded ${filename}`);
              
            } catch (downloadError) {
              console.error(`❌ Failed to download ${filename}:`, downloadError);
              // Continue with other files even if one fails
            }
            
            // ALWAYS add delay after each download, regardless of success/failure
            if (fileIndex < individualFiles.length - 1) { // Don't delay after the last file
              console.log(`⏳ Post-download delay (${delayMs}ms) after ${filename}`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          }
          
          setBatchStatus('All downloads completed!');
          console.log(`🎉 INDIVIDUAL FILES COMPLETE: Downloaded ${individualFiles.length} files`);
        }
        
        // Mark progress as complete
        stopElapsedTimeTracking();
        setBatchProgress(totalSteps);
        setBatchStatus('Export completed successfully!');
        
        // Show persistent success message with elapsed time
        const elapsedStr = formatElapsedTime(exportElapsedTime);
        const projectFilesText = exportSaveProjectFiles ? ` and ${exportBatchCount} project files` : '';
        const successMessage = packageAsZip 
          ? `✅ Success! Downloaded batch-export-${timestamp}.zip with ${exportBatchCount} images${projectFilesText} (${elapsedStr})`
          : `✅ Success! Downloaded ${individualFiles.length} individual files (${elapsedStr})`;
        setBatchResultMessage(successMessage);
        setShowBatchResult(true);
        
        console.log(`✅ Export complete - Progress: ${totalSteps}/${totalSteps} (100%) - Manual dismiss required`);
        
      } catch (error) {
        console.error('❌ Batch export error:', error);
        stopElapsedTimeTracking();
        
        // Create a more detailed error message for mobile users who can't check console
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const detailedError = `Export failed: ${errorMessage}`;
        
        setBatchStatus(detailedError);
        console.error('❌ DETAILED ERROR:', {
          error: errorMessage,
          timestamp: new Date().toISOString(),
          exportBatchCount,
          exportFormat,
          enabledShapeTypes: Array.from(enabledShapeTypes)
        });
        
        // Mark progress as failed but visible
        setBatchStatus(`Export failed: ${errorMessage}`);
        
        // Show persistent error message
        setBatchResultMessage(`❌ Export failed: ${errorMessage}`);
        setShowBatchResult(true);
        
        console.log(`❌ Export failed - Progress: ${batchProgress}/${totalSteps} - Manual dismiss required`);
        
      } finally {
        onClearAll?.();
        stopElapsedTimeTracking();
        exportAbortControllerRef.current = null;
        // Keep the progress dialog visible until manually dismissed by user
        // setIsBatchExporting(false); // Removed to prevent auto-dismiss
        // setBatchProgress(0); // Keep progress visible
        // setBatchStatus(''); // Keep final status visible
        console.log(`🔄 Export process completed - progress dialog remains visible for manual dismiss`);
      }
    };

    const handleSaveProject = () => {
      const projectData = {
        shapes: shapes,
        groups: selectedGroups,
        artboards: artboards,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `shape-editor-project-${Date.now()}.json`;
      link.click();

      URL.revokeObjectURL(url);
    };

    return (
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Export Mode</Label>
            <Select value={exportMode} onValueChange={(value: any) => setExportMode(value)}>
              <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="selection" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">Selected Shapes</SelectItem>
                <SelectItem value="artboard" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">Artboard Content</SelectItem>
                <SelectItem value="all" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">All Shapes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {exportMode === 'artboard' && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Select Artboard</Label>
              <Select value={selectedArtboardForExport} onValueChange={setSelectedArtboardForExport}>
                <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600">
                  <SelectValue placeholder="Choose artboard..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {artboards.map((artboard) => (
                    <SelectItem key={artboard.id} value={artboard.id} className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">
                      {artboard.name} ({artboard.width}×{artboard.height})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Export Format</Label>
            <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="png" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">PNG</SelectItem>
                <SelectItem value="jpg" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">JPG</SelectItem>
                <SelectItem value="webp" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">WebP</SelectItem>
                <SelectItem value="avif" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">AVIF</SelectItem>
                <SelectItem value="bmp" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">BMP</SelectItem>
                <SelectItem value="tiff" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">TIFF</SelectItem>
                <SelectItem value="pdf" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* TIFF Compression (only shown when TIFF format is selected) */}
          {exportFormat === 'tiff' && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">TIFF Compression</Label>
              <Select 
                value={exportSettings.tiffCompression ?? 'none'} 
                onValueChange={(value: 'none' | 'deflate') => updateExportSettings.mutate({ tiffCompression: value })}
              >
                <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600" data-testid="select-tiff-compression">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="none" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">Uncompressed</SelectItem>
                  <SelectItem value="deflate" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">Deflate (Smaller files)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                {exportSettings.tiffCompression === 'deflate' 
                  ? 'Deflate compression reduces file size without quality loss' 
                  : 'Uncompressed for maximum compatibility'}
              </p>
            </div>
          )}

          {/* Export Background Setting */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Export Background</Label>
            <Select 
              value={exportSettings.exportBackgroundMode || 'transparent'} 
              onValueChange={(value: 'transparent' | 'artboard') => 
                updateExportSettings.mutate({ exportBackgroundMode: value })
              }
            >
              <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600" data-testid="select-export-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="transparent" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">Transparent</SelectItem>
                <SelectItem value="artboard" className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white">Artboard Color</SelectItem>
              </SelectContent>
            </Select>
            {exportSettings.exportBackgroundMode === 'artboard' && (
              <p className="text-xs text-slate-500">Background color is configured in the Artboard section</p>
            )}
          </div>

          {/* TIFF Print-Ready Warnings */}
          {exportFormat === 'tiff' && (() => {
            const preflightInfo = getTiffPreflightInfo();
            const warnings: string[] = [];
            if (preflightInfo.hasLowDpi) {
              warnings.push(`DPI (${preflightInfo.artboardDpi}) is below 300 - not ideal for professional printing`);
            }
            if (preflightInfo.hasNoBleed) {
              warnings.push('Bleed is not enabled - may cause issues at print edges');
            }
            if (preflightInfo.hasTransparentBackground) {
              warnings.push('Background is transparent - some print services require solid background');
            }
            
            if (warnings.length === 0) return null;
            
            return (
              <div className="p-2 bg-amber-900/20 border border-amber-500/30 rounded space-y-1">
                <div className="flex items-center gap-1 text-amber-300 text-xs font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  Print Considerations
                </div>
                <ul className="text-xs text-amber-200/80 space-y-0.5 list-disc list-inside pl-1">
                  {warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {['jpg', 'webp', 'avif'].includes(exportFormat) && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Quality</Label>
              <BufferedSliderWithLabel
                value={exportQuality}
                onValueCommit={(value) => setExportQuality(value)}
                min={10}
                max={100}
                step={1}
                className="w-full"
                formatLabel={(v) => `${v}%`}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Export Scale (up to 20x for 1200dpi)</Label>
            <BufferedSliderWithLabel
              value={exportScale}
              onValueCommit={(value) => setExportScale(value)}
              min={0.1}
              max={20}
              step={0.1}
              className="w-full"
              disabled={exportAutoScaleFromDpi}
              formatLabel={(v) => exportAutoScaleFromDpi ? '(Disabled - using auto-scale)' : `${v}x`}
            />
          </div>

          <div className="flex items-center justify-between space-x-3">
            <div className="flex-1">
              <Label className="text-xs text-slate-400">Auto-scale from DPI</Label>
              <p className="text-xs text-slate-500 mt-0.5">Calculate scale automatically based on artboard DPI</p>
            </div>
            <Switch
              checked={exportAutoScaleFromDpi}
              onCheckedChange={setExportAutoScaleFromDpi}
              data-testid="toggle-auto-scale-dpi"
            />
          </div>

          {exportAutoScaleFromDpi && (
            <div className="p-2 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-blue-300">
              Auto: {effectiveExportScale}x from {artboards.find(a => a.id === activeArtboard)?.dpi ?? 72} DPI
            </div>
          )}

          <Button
            onClick={handleExportShapes}
            disabled={
              isExporting ||
              isBatchExporting ||
              (exportMode === 'selection' && selectedShapes.length === 0) ||
              (exportMode === 'artboard' && (!selectedArtboardForExport || artboards.length === 0)) ||
              (exportMode === 'all' && shapes.length === 0)
            }
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Exporting...
              </>
            ) : (
              <>
                <FileImage className="w-4 h-4 mr-2" />
                {exportMode === 'selection' && `Export Selected (${selectedShapes.length})`}
                {exportMode === 'artboard' && selectedArtboardForExport && 
                  `Export ${artboards.find(ab => ab.id === selectedArtboardForExport)?.name || 'Artboard'}`}
                {exportMode === 'artboard' && !selectedArtboardForExport && 'Select Artboard to Export'}
                {exportMode === 'all' && `Export All Shapes (${shapes.length})`}
              </>
            )}
          </Button>
        </div>

        <Separator className="bg-slate-600" />

        {/* Batch Export Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-300">Batch Export</Label>
            <div className="flex items-center space-x-2">
              <Label htmlFor="batch-mode" className="text-xs text-slate-400">Enable</Label>
              <Switch
                id="batch-mode"
                checked={exportSettings.exportBatchModeEnabled}
                disabled={isLoadingExportSettings}
                onCheckedChange={(checked) => {
                  console.log('Batch export toggle clicked:', checked);
                  updateExportSettings.mutate({ exportBatchModeEnabled: checked as boolean });
                }}
              />
            </div>
          </div>

          {exportSettings.exportBatchModeEnabled && (
            <>
              <div className={`space-y-2 ${exportSettings.generationSetsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center space-x-2">
                  <Label className="text-xs text-slate-400">
                    Generations per Export
                  </Label>
                  <Select 
                    value={generationConfigSettings?.generationCountMode || 'range'} 
                    onValueChange={(value) => {
                      console.log('Updating generationCountMode to:', value, 'Current enabledShapeTypes size:', enabledShapeTypes.size);
                      onUpdateGenerationConfigSettings({ generationCountMode: value as 'range' | 'fixed' | 'incremental' });
                    }}
                    disabled={exportSettings.generationSetsEnabled}
                  >
                    <SelectTrigger className="h-6 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                      <SelectItem value="fixed" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
                      <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {generationConfigSettings?.generationCountMode === 'range' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Min: {exportShapeCountRange[0]}</span>
                      <span className="text-slate-400">Max: {exportShapeCountRange[1]}</span>
                    </div>
                    <BufferedRangeSlider
                      value={exportShapeCountRange}
                      onValueCommit={(value) => setExportShapeCountRange(value)}
                      min={1}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                  </div>
                )}
                
                {generationConfigSettings?.generationCountMode === 'fixed' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-300">Fixed Value: {generationConfigSettings?.generationCountDefine || 5}</Label>
                    <BufferedSlider
                      value={[generationConfigSettings?.generationCountDefine || 5]}
                      onValueCommit={([value]) => onUpdateGenerationConfigSettings({ generationCountDefine: value })}
                      min={1}
                      max={20}
                      step={1}
                      className="[&_[role=slider]]:bg-blue-600"
                    />
                  </div>
                )}
                
                {generationConfigSettings?.generationCountMode === 'incremental' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-300">Start Value: {generationConfigSettings?.generationCountStartValue || 1}</Label>
                    <BufferedSlider
                      value={[generationConfigSettings?.generationCountStartValue || 1]}
                      onValueCommit={([value]) => onUpdateGenerationConfigSettings({ generationCountStartValue: value })}
                      min={1}
                      max={15}
                      step={1}
                      className="[&_[role=slider]]:bg-blue-600"
                    />
                    <Label className="text-xs text-slate-300">Increment: {generationConfigSettings?.generationCountIncrement || 1}</Label>
                    <BufferedSlider
                      value={[generationConfigSettings?.generationCountIncrement || 1]}
                      onValueCommit={([value]) => onUpdateGenerationConfigSettings({ generationCountIncrement: value })}
                      min={1}
                      max={5}
                      step={1}
                      className="[&_[role=slider]]:bg-blue-600"
                    />
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={generationConfigSettings?.generationCountResetPerBatch || false}
                        onCheckedChange={(checked) => onUpdateGenerationConfigSettings({ generationCountResetPerBatch: checked as boolean })}
                        className="border-slate-500 data-[state=checked]:bg-blue-600"
                      />
                      <Label className="text-xs text-slate-300">Reset per batch</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={generationConfigSettings?.generationCountModulationEnabled || false}
                        onCheckedChange={(checked) => onUpdateGenerationConfigSettings({ generationCountModulationEnabled: checked as boolean })}
                        className="border-slate-500 data-[state=checked]:bg-blue-600"
                      />
                      <Label className="text-xs text-slate-300">Enable Modulation</Label>
                    </div>
                    {generationConfigSettings?.generationCountModulationEnabled && (
                      <>
                        <Label className="text-xs text-slate-300">Modulation Value: {generationConfigSettings?.generationCountModulationValue || 0.5}</Label>
                        <BufferedSlider
                          value={[generationConfigSettings?.generationCountModulationValue || 0.5]}
                          onValueCommit={([value]) => onUpdateGenerationConfigSettings({ generationCountModulationValue: value })}
                          min={1}
                          max={10}
                          step={1}
                          className="[&_[role=slider]]:bg-blue-600"
                        />
                      </>
                    )}
                    <p className="text-xs text-slate-400">Stepped generation count (start + export × increment, with optional modulation)</p>
                  </div>
                )}
              </div>

              <Separator className="bg-slate-700" />

              {/* Shape Sets Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-slate-800/30 rounded border border-slate-600">
                  <div className="flex items-center space-x-2">
                    <Boxes className="w-3 h-3 text-slate-400" />
                    <Label className="text-xs text-slate-300">Shape Sets</Label>
                  </div>
                  <Switch
                    checked={exportSettings.generationSetsEnabled}
                    onCheckedChange={(checked) => {
                      updateExportSettings.mutate({ generationSetsEnabled: checked as boolean });
                    }}
                    disabled={!exportSettings.exportBatchModeEnabled}
                    data-testid="toggle-generation-sets"
                  />
                </div>

                {/* Prerequisites messaging */}
                {!exportSettings.exportBatchModeEnabled && (
                  <div className="text-xs text-slate-500 bg-yellow-900/20 p-2 rounded border border-yellow-500/30">
                    <div className="flex items-center space-x-1 mb-1">
                      <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
                      <span className="text-yellow-300 font-medium">Prerequisites Required</span>
                    </div>
                    <div className="space-y-1">
                      <div>• Enable batch export mode above</div>
                    </div>
                  </div>
                )}

                {/* Shape Sets enabled messaging */}
                {exportSettings.generationSetsEnabled && exportSettings.exportBatchModeEnabled && (
                  <div className="text-xs text-slate-500 bg-blue-900/20 p-2 rounded border border-blue-500/30">
                    <div className="flex items-center space-x-1 mb-1">
                      <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                      <span className="text-blue-300 font-medium">Shape Sets Active</span>
                    </div>
                    All enabled shape sets combine to create each export. Manage sets in the Shape Sets Manager.
                  </div>
                )}
              </div>

              <BufferedSliderWithLabel
                label="Number of Exports"
                value={exportBatchCount}
                onValueCommit={(value) => setExportBatchCount(value)}
                min={1}
                max={100}
                step={1}
                className="w-full"
              />

              {(() => {
                // Calculate if project files option should be disabled
                const imageCount = exportAllImages ? exportBatchCount : selectedImageIndices.length;
                const isDisabled = imageCount === 0;
                
                return (
                  <div className={`flex items-center justify-between p-2 rounded border ${
                    isDisabled 
                      ? 'bg-slate-900/50 border-slate-700 opacity-50' 
                      : 'bg-slate-800/30 border-slate-600'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <Save className={`w-3 h-3 ${isDisabled ? 'text-slate-500' : 'text-slate-400'}`} />
                      <div className="flex flex-col">
                        <Label className={`text-xs ${isDisabled ? 'text-slate-500' : 'text-slate-300'}`}>
                          Export Project Files
                        </Label>
                        {isDisabled && (
                          <span className="text-xs text-slate-600">
                            No images selected for export
                          </span>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={exportSaveProjectFiles}
                      onCheckedChange={setExportSaveProjectFiles}
                      disabled={isDisabled}
                    />
                  </div>
                );
              })()}

              {exportSaveProjectFiles && (
                <div className="text-xs text-slate-500 bg-blue-900/20 p-2 rounded border border-blue-500/30">
                  <div className="flex items-center space-x-1 mb-1">
                    <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                    <span className="text-blue-300 font-medium">Project Files Enabled</span>
                  </div>
                  Each exported image will include a corresponding project file (.json) containing all shapes and settings. You can reload these files later to continue editing specific batched images.
                </div>
              )}

              <div className="flex items-center justify-between p-2 bg-slate-800/30 rounded border border-slate-600">
                <div className="flex items-center space-x-2">
                  <ImageIcon className="w-3 h-3 text-slate-400" />
                  <Label className="text-xs text-slate-300">Export All Images</Label>
                </div>
                <Switch
                  checked={exportAllImages}
                  onCheckedChange={setExportAllImages}
                  data-testid="toggle-export-all-images"
                />
              </div>

              {(() => {
                // Package as ZIP is enabled when there are multiple files to export (images + optional project files)
                const imageCount = exportAllImages ? exportBatchCount : selectedImageIndices.length;
                const projectFileCount = exportSaveProjectFiles ? imageCount : 0;
                const totalItems = imageCount + projectFileCount;
                const isDisabled = totalItems <= 1;
                
                return (
                  <div className={`flex items-center justify-between p-2 rounded border ${
                    isDisabled 
                      ? 'bg-slate-900/50 border-slate-700 opacity-50' 
                      : 'bg-slate-800/30 border-slate-600'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <Package className={`w-3 h-3 ${isDisabled ? 'text-slate-500' : 'text-slate-400'}`} />
                      <div className="flex flex-col">
                        <Label className={`text-xs ${isDisabled ? 'text-slate-500' : 'text-slate-300'}`}>
                          Package as ZIP
                        </Label>
                        {isDisabled && (
                          <span className="text-xs text-slate-600">
                            Only 1 item - no ZIP needed
                          </span>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={packageAsZip}
                      onCheckedChange={setPackageAsZip}
                      disabled={isDisabled}
                      data-testid="toggle-package-as-zip"
                    />
                  </div>
                );
              })()}

              {!exportAllImages && (
                <div className="space-y-2 p-3 bg-orange-900/20 rounded border border-orange-500/30" data-testid="accordion-selective-export">
                  <div className="flex items-center space-x-1 mb-2">
                    <div className="w-1 h-1 bg-orange-400 rounded-full"></div>
                    <span className="text-orange-300 font-medium text-xs">Selective Export</span>
                  </div>
                  <Label className="text-xs text-slate-400">Select images to export (1-{exportBatchCount}):</Label>
                  <div className="grid grid-cols-5 gap-1 max-h-24 overflow-y-auto">
                    {Array.from({ length: exportBatchCount }, (_, i) => i + 1).map((imageIndex) => (
                      <div key={imageIndex} className="flex items-center space-x-1">
                        <Checkbox
                          checked={selectedImageIndices.includes(imageIndex)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedImageIndices([...selectedImageIndices, imageIndex]);
                            } else {
                              setSelectedImageIndices(selectedImageIndices.filter(idx => idx !== imageIndex));
                            }
                          }}
                          className="border-slate-500 data-[state=checked]:bg-orange-600"
                          data-testid={`checkbox-image-${imageIndex}`}
                        />
                        <Label className="text-xs text-slate-300">{imageIndex}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-slate-500">
                    Selected: {selectedImageIndices.length} of {exportBatchCount} images
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Export Info</Label>
                <div className="text-xs text-slate-500 bg-slate-800 p-2 rounded border border-slate-600">
                  {exportSaveProjectFiles ? (
                    packageAsZip 
                      ? 'Project files (.json) with shape data will be packaged in a ZIP file'
                      : 'Project files (.json) with shape data will be downloaded individually'
                  ) : (
                    packageAsZip 
                      ? 'Images will be packaged into a single ZIP file'
                      : 'Individual image files will be downloaded'
                  )}
                  
                  {(() => {
                    // Mobile device detection for helpful UX message
                    const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    const imageCount = exportAllImages ? exportBatchCount : selectedImageIndices.length;
                    const showMobileWarning = isMobile && !packageAsZip && imageCount > 1;
                    
                    return showMobileWarning ? (
                      <div className="mt-2 p-2 bg-blue-900/20 rounded border border-blue-500/30">
                        <div className="text-blue-300 font-medium text-xs mb-1">📱 Mobile Tip</div>
                        <div className="text-blue-200 text-xs">
                          Individual downloads have 2-second delays on mobile to prevent download interruptions. 
                          Consider enabling "Package as ZIP" for faster download.
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              {isBatchExporting && (
                <div className="space-y-2 p-3 bg-purple-900/20 rounded border border-purple-500/30">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-300 font-medium">Batch Export Progress</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-mono">
                        {formatElapsedTime(exportElapsedTime)}
                      </span>
                      <span className="text-purple-200">
                        {batchProgress}/{batchTotalSteps} ({Math.round((batchProgress / Math.max(batchTotalSteps, 1)) * 100)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((batchProgress / Math.max(batchTotalSteps, 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-purple-400">
                      {batchStatus || 'Processing...'}
                    </div>
                    {batchProgress < batchTotalSteps && (
                      <Button
                        onClick={handleCancelExport}
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs bg-red-900/20 border-red-500/30 text-red-300 hover:bg-red-900/40 hover:text-red-200"
                        data-testid="cancel-export-button"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                  {batchProgress >= batchTotalSteps && (
                    <div className="text-xs text-green-400 font-medium">
                      ✅ Export process completed - Use X button above to close
                    </div>
                  )}
                </div>
              )}
              
              {showBatchResult && (
                <div className="relative space-y-2 p-3 bg-slate-900/50 rounded border border-gray-500/30">
                  <button 
                    onClick={() => {
                      setShowBatchResult(false);
                      setBatchResultMessage('');
                      setIsBatchExporting(false); // Close the entire progress dialog when manually dismissed
                    }}
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-full transition-colors"
                    data-testid="close-batch-result"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="text-sm text-white whitespace-pre-wrap break-words pr-8">
                    {batchResultMessage}
                  </div>
                </div>
              )}

              <Button
                onClick={handleBatchExportWithPreflight}
                disabled={isBatchExporting || enabledShapeTypes.size === 0}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 text-white"
                title={enabledShapeTypes.size === 0 ? `No shape types enabled (${enabledShapeTypes.size})` : undefined}
              >
                {isBatchExporting ? (
                  <>
                    <div className="w-3 h-3 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Exporting... ({Math.round((batchProgress / batchTotalSteps) * 100)}%)
                  </>
                ) : (
                  <>
                    <Boxes className="w-3 h-3 mr-1" />
                    Start Batch Export
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Move expanded shapes state outside of function to prevent reset on re-renders
  const [expandedShapes, setExpandedShapes] = useState<Set<string>>(new Set());
  
  // Add state for the shape list accordion to prevent auto-expansion
  const [shapeListAccordionOpen, setShapeListAccordionOpen] = useState<string | undefined>(undefined);
  
  // Add state for main sidebar accordion sections to prevent collapse on value changes
  const [openAccordionSections, setOpenAccordionSections] = useState<string[]>([]);
  
  // Add state for shape categories accordion to prevent collapse when shapes are toggled
  const [openShapeCategories, setOpenShapeCategories] = useState<string[]>(["Basic", "Geometric", "Special", "Lines & Curves", "Complex"]);
  
  // Scroll container ref for the sidebar
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Scroll position preservation to prevent jumps during state updates in nested accordions
  const scrollPositionRef = useRef<number>(0);
  const scrollLockEndTimeRef = useRef<number>(0);
  const scrollLockRafRef = useRef<number | null>(null);
  
  // Save scroll position before any interaction that might cause a re-render
  // Uses a time-based lock that persists across multiple re-renders
  const saveScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
      // Lock scroll for 100ms to handle multiple re-renders and browser scroll adjustments
      scrollLockEndTimeRef.current = Date.now() + 100;
    }
  }, []);
  
  // Continuously restore scroll position while lock is active
  useLayoutEffect(() => {
    const checkAndRestoreScroll = () => {
      if (Date.now() < scrollLockEndTimeRef.current && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollPositionRef.current;
        scrollLockRafRef.current = requestAnimationFrame(checkAndRestoreScroll);
      } else {
        scrollLockRafRef.current = null;
      }
    };
    
    if (Date.now() < scrollLockEndTimeRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPositionRef.current;
      // Schedule additional checks to handle delayed scroll resets
      if (!scrollLockRafRef.current) {
        scrollLockRafRef.current = requestAnimationFrame(checkAndRestoreScroll);
      }
    }
    
    return () => {
      if (scrollLockRafRef.current) {
        cancelAnimationFrame(scrollLockRafRef.current);
        scrollLockRafRef.current = null;
      }
    };
  });
  

  const toggleShapeExpansion = useCallback((shapeType: string) => {
    setExpandedShapes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(shapeType)) {
        newExpanded.delete(shapeType);
      } else {
        newExpanded.add(shapeType);
      }
      return newExpanded;
    });
  }, []);

  // Simplified callback for BatchConfigDialog
  const handleBatchConfigSettingsChange = useCallback((settings: BatchConfigSettings) => {
    onUpdateGenerationConfigSettings(settings);
  }, [onUpdateGenerationConfigSettings]);

  // Memoized Shape Sets UI using the unified GenerationSetsDropdown component
  const ShapeSetsUI = useMemo(() => (
    <GenerationSetsDropdown
      currentSetId={effectiveCurrentSetId}
      generationSets={effectiveGenerationSets}
      enabledShapeTypes={enabledShapeTypes}
      scatterSettings={scatterSettings}
      batchConfigSettings={generationConfigSettings}
      shapeCountMode={effectiveMode as ShapeCountMode}
      shapeCountFixed={shapeCountFixed}
      shapeCountRange={shapeCountRange}
      onSetChange={handleSetChange}
      onCreateSet={handleCreateSet}
      onDeleteSet={handleDeleteSet}
      onOpenManager={handleOpenManager}
      enabled={setsEnabled}
      variant="boxed"
      size="sm"
      data-testid="sidebar-generation-sets"
    />
  ), [
    setsEnabled,
    effectiveCurrentSetId,
    effectiveGenerationSets,
    enabledShapeTypes,
    scatterSettings,
    generationConfigSettings,
    effectiveMode,
    shapeCountFixed,
    shapeCountRange,
    handleCreateSet,
    handleDeleteSet,
    handleSetChange,
    handleOpenManager
  ]);

  // Variant-aware ShapeTypesSection that includes Shape Sets UI + ShapeTypesContentMemo
  const ShapeTypesSection = useCallback(({ variant }: { variant: 'expanded' | 'collapsed' }) => {
    return (
      <>
        {ShapeSetsUI}
        <ShapeTypesContentMemo
          scatterSettings={scatterSettings}
          onUpdateScatterSettings={onUpdateScatterSettings}
          enabledShapeTypes={enabledShapeTypes}
          onToggleShapeType={onToggleShapeType}
          shapeListAccordionOpen={shapeListAccordionOpen}
          setShapeListAccordionOpen={setShapeListAccordionOpen}
          openShapeCategories={openShapeCategories}
          setOpenShapeCategories={setOpenShapeCategories}
          expandedShapes={expandedShapes}
          toggleShapeExpansion={toggleShapeExpansion}
          setsEnabled={setsEnabled}
          currentGenerationSetId={currentGenerationSetId}
          updateGenerationSetPartial={updateGenerationSetPartial}
          applyStatus={applyStatus}
          handleApplyToCurrentSet={handleApplyToCurrentSet}
          onGenerateRandomShapes={onGenerateRandomShapes}
        />
      </>
    );
  }, [
    ShapeSetsUI, 
    scatterSettings, 
    onUpdateScatterSettings, 
    enabledShapeTypes, 
    onToggleShapeType, 
    shapeListAccordionOpen,
    openShapeCategories,
    expandedShapes,
    toggleShapeExpansion,
    setsEnabled,
    currentGenerationSetId,
    updateGenerationSetPartial,
    applyStatus,
    handleApplyToCurrentSet,
    onGenerateRandomShapes
  ]);

  // Create stable collapsed content component
  const CollapsedShapeTypesContent = useCallback(() => {
    return <ShapeTypesSection variant="collapsed" />;
  }, [ShapeTypesSection]);

  function CompositionContent() {
    return (
      <div className="h-[400px] w-full overflow-y-auto">
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
              <BufferedSliderWithLabel
                value={scatterSettings.count}
                onValueCommit={(value) => onUpdateScatterSettings({ count: value })}
                min={1}
                max={50}
                step={1}
                className="w-full"
                formatLabel={(v) => `${v} shapes`}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Randomness</Label>
              <BufferedSliderWithLabel
                value={scatterSettings.randomness}
                onValueCommit={(value) => onUpdateScatterSettings({ randomness: value })}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
                formatLabel={(v) => `${Math.round(v * 100)}%`}
              />
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
      </div>
    );
  }

  function PropertiesContent() {
    return (
      <div className="h-[400px] w-full overflow-y-auto">
        <div className="space-y-4 pr-4">
          <div className="text-sm text-slate-400">
            Selected: <span className="text-white font-medium">{selectedCount}</span> {selectedCount === 1 ? 'shape' : 'shapes'}
            {selectedCount === 1 && selectedShapes[0] && (
              <div className="text-xs text-slate-500 mt-1">
                Type: <span className="text-slate-300">{shapeTypeDisplayNames[selectedShapes[0].type] || selectedShapes[0].type}</span>
              </div>
            )}
          </div>

          {/* Shape Properties Information */}
          {selectedCount === 1 && selectedShapes[0] && (
            <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
              <Label className="text-sm text-slate-300 font-medium">Shape Properties</Label>
              
              <div className="space-y-2 text-xs">
                {(() => {
                  const shape = selectedShapes[0];
                  const properties = [];

                  // Basic position and transform info
                  properties.push(
                    <div key="position" className="flex justify-between">
                      <span className="text-slate-400">Position</span>
                      <span className="text-slate-300">
                        {Math.round(shape.transform.x)}, {Math.round(shape.transform.y)}
                      </span>
                    </div>
                  );

                  properties.push(
                    <div key="rotation" className="flex justify-between">
                      <span className="text-slate-400">Rotation</span>
                      <span className="text-slate-300">{Math.round(shape.transform.rotation)}°</span>
                    </div>
                  );

                  properties.push(
                    <div key="scale" className="flex justify-between">
                      <span className="text-slate-400">Scale</span>
                      <span className="text-slate-300">
                        {shape.transform.scaleX.toFixed(2)}×, {shape.transform.scaleY.toFixed(2)}×
                      </span>
                    </div>
                  );

                  // Shape-specific properties
                  switch (shape.type) {
                    case 'cubic':
                    case 'bezier':
                    case 'smooth-spline':
                      properties.push(
                        <div key="curve-type" className="flex justify-between">
                          <span className="text-slate-400">Curve Type</span>
                          <span className="text-slate-300 capitalize">
                            {shape.closed ? 'Closed' : 'Open'}
                          </span>
                        </div>
                      );
                      properties.push(
                        <div key="points" className="flex justify-between">
                          <span className="text-slate-400">Control Points</span>
                          <span className="text-slate-300">{shape.points?.length || 0}</span>
                        </div>
                      );
                      if (shape.tangentHandles?.length) {
                        properties.push(
                          <div key="handles" className="flex justify-between">
                            <span className="text-slate-400">Tangent Handles</span>
                            <span className="text-slate-300">{shape.tangentHandles.length}</span>
                          </div>
                        );
                      }
                      break;

                    case 'polygon':
                    case 'star':
                      if (shape.sides) {
                        properties.push(
                          <div key="sides" className="flex justify-between">
                            <span className="text-slate-400">{shape.type === 'star' ? 'Points' : 'Sides'}</span>
                            <span className="text-slate-300">{shape.sides}</span>
                          </div>
                        );
                      }
                      if (shape.type === 'star' && shape.innerRadius) {
                        properties.push(
                          <div key="inner-radius" className="flex justify-between">
                            <span className="text-slate-400">Inner Radius</span>
                            <span className="text-slate-300">{Math.round(shape.innerRadius)}px</span>
                          </div>
                        );
                      }
                      break;

                    case 'circle':
                    case 'ellipse':
                      if (shape.radius) {
                        properties.push(
                          <div key="radius" className="flex justify-between">
                            <span className="text-slate-400">Radius</span>
                            <span className="text-slate-300">{Math.round(shape.radius)}px</span>
                          </div>
                        );
                      }
                      break;

                    case 'rectangle':
                    case 'rounded-rectangle':
                    case 'square':
                    case 'rounded-square':
                      if (shape.width && shape.height) {
                        properties.push(
                          <div key="dimensions" className="flex justify-between">
                            <span className="text-slate-400">Dimensions</span>
                            <span className="text-slate-300">
                              {Math.round(shape.width)} × {Math.round(shape.height)}
                            </span>
                          </div>
                        );
                      }
                      if ((shape.type === 'rounded-rectangle' || shape.type === 'rounded-square') && shape.cornerRadius) {
                        properties.push(
                          <div key="corner-radius" className="flex justify-between">
                            <span className="text-slate-400">Corner Radius</span>
                            <span className="text-slate-300">{Math.round(shape.cornerRadius)}px</span>
                          </div>
                        );
                      }
                      break;

                    case 'line':
                      properties.push(
                        <div key="points" className="flex justify-between">
                          <span className="text-slate-400">Line Points</span>
                          <span className="text-slate-300">{shape.points?.length || 2}</span>
                        </div>
                      );
                      if (shape.strokeCap) {
                        properties.push(
                          <div key="stroke-cap" className="flex justify-between">
                            <span className="text-slate-400">Stroke Cap</span>
                            <span className="text-slate-300 capitalize">{shape.strokeCap}</span>
                          </div>
                        );
                      }
                      break;

                    case 'ring':
                    case 'spline-ring':
                      if (shape.radius) {
                        properties.push(
                          <div key="outer-radius" className="flex justify-between">
                            <span className="text-slate-400">Outer Radius</span>
                            <span className="text-slate-300">{Math.round(shape.radius)}px</span>
                          </div>
                        );
                      }
                      if (shape.innerRadius) {
                        properties.push(
                          <div key="inner-radius" className="flex justify-between">
                            <span className="text-slate-400">Inner Radius</span>
                            <span className="text-slate-300">{Math.round(shape.innerRadius)}px</span>
                          </div>
                        );
                      }
                      break;
                  }

                  // Common properties for all shapes
                  properties.push(
                    <div key="opacity" className="flex justify-between">
                      <span className="text-slate-400">Fill Opacity</span>
                      <span className="text-slate-300">{Math.round(shape.properties.fillOpacity * 100)}%</span>
                    </div>
                  );

                  if (shape.properties.strokeWidth > 0) {
                    properties.push(
                      <div key="stroke-width" className="flex justify-between">
                        <span className="text-slate-400">Stroke Width</span>
                        <span className="text-slate-300">{shape.properties.strokeWidth}px</span>
                      </div>
                    );
                  }

                  if (shape.properties.blurRadius > 0) {
                    properties.push(
                      <div key="blur" className="flex justify-between">
                        <span className="text-slate-400">Blur Radius</span>
                        <span className="text-slate-300">{shape.properties.blurRadius}px</span>
                      </div>
                    );
                  }

                  properties.push(
                    <div key="layer" className="flex justify-between">
                      <span className="text-slate-400">Layer Index</span>
                      <span className="text-slate-300">{shape.properties.zIndex}</span>
                    </div>
                  );

                  return properties;
                })()}
              </div>
            </div>
          )}

          {/* Multiple shapes selected - show aggregate information */}
          {selectedCount > 1 && (
            <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
              <Label className="text-sm text-slate-300 font-medium">Selection Properties</Label>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Shape Types</span>
                  <span className="text-slate-300">
                    {Array.from(new Set(selectedShapes.map(s => s.type))).length} different
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Shapes</span>
                  <span className="text-slate-300">{selectedCount}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Layer Range</span>
                  <span className="text-slate-300">
                    {Math.min(...selectedShapes.map(s => s.properties.zIndex))} - {Math.max(...selectedShapes.map(s => s.properties.zIndex))}
                  </span>
                </div>

                {/* Show types breakdown */}
                <div className="mt-2 pt-2 border-t border-slate-600">
                  <span className="text-slate-400 text-xs">Types breakdown:</span>
                  <div className="mt-1 space-y-1">
                    {Object.entries(
                      selectedShapes.reduce((acc, shape) => {
                        acc[shape.type] = (acc[shape.type] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([type, count]) => (
                      <div key={type} className="flex justify-between text-xs">
                        <span className="text-slate-500">{shapeTypeDisplayNames[type as ShapeType] || type}</span>
                        <span className="text-slate-400">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedCount > 0 && (
            <ShapePropertiesPanel 
              selectedShapes={selectedShapes}
              selectedGroups={selectedGroups}
              selectedCount={selectedCount}
            />
          )}

          {selectedCount === 0 && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 mb-4">
                Select shapes to edit their properties
              </div>
              
              {/* General Canvas Properties */}
              <div className="space-y-3">
                <Label className="text-sm text-slate-300 font-medium">Canvas Settings</Label>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-400">Background Color</Label>
                    <div className="w-6 h-6 rounded bg-slate-900 border border-slate-600"></div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-400">Canvas Size</Label>
                    <span className="text-xs text-slate-300">1200 × 800</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-400">Zoom Level</Label>
                    <span className="text-xs text-slate-300">100%</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <Label className="text-sm text-slate-300 font-medium">Quick Actions</Label>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={onGenerateRandomShapes} variant="secondary" size="sm" className="text-xs bg-slate-700 hover:bg-slate-600">
                    Generate Random
                  </Button>
                  <Button onClick={() => onGenerateShapesWithBatchConfig(10, { x: 0, y: 0, width: 800, height: 600 })} variant="secondary" size="sm" className="text-xs bg-slate-700 hover:bg-slate-600">
                    Generate 10
                  </Button>
                  <Button onClick={() => {/* Select all functionality would be handled by parent */}} variant="secondary" size="sm" className="text-xs bg-slate-700 hover:bg-slate-600 opacity-50" disabled>
                    Select All
                  </Button>
                  <Button onClick={onClearAll} variant="secondary" size="sm" className="text-xs bg-slate-700 hover:bg-slate-600" disabled={!onClearAll}>
                    Clear Canvas
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
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
      return (shapes || []).sort((a, b) => a.properties.zIndex - b.properties.zIndex);
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
          {sortedShapes.map((shape) => (
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

  function AlignDistributeContent() {
    const [distributionPattern, setDistributionPattern] = useState<'grid' | 'circle' | 'line' | 'spiral'>('grid');
    const [distributionSpacing, setDistributionSpacing] = useState(50);
    const [alignTarget, setAlignTarget] = useState<'selection' | 'canvas'>('selection');

    const handleAlign = (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (selectedShapes.length < 2) return;

      const bounds = selectedShapes.map(shape => {
        // Calculate shape bounds
        const minX = Math.min(...shape.points.map(p => p.x + shape.transform.x));
        const maxX = Math.max(...shape.points.map(p => p.x + shape.transform.x));
        const minY = Math.min(...shape.points.map(p => p.y + shape.transform.y));
        const maxY = Math.max(...shape.points.map(p => p.y + shape.transform.y));
        return { shape, minX, maxX, minY, maxY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
      });

      let targetValue: number;

      if (direction === 'left') {
        targetValue = Math.min(...bounds.map(b => b.minX));
        bounds.forEach(b => {
          b.shape.transform.x += targetValue - b.minX;
        });
      } else if (direction === 'right') {
        targetValue = Math.max(...bounds.map(b => b.maxX));
        bounds.forEach(b => {
          b.shape.transform.x += targetValue - b.maxX;
        });
      } else if (direction === 'center') {
        targetValue = bounds.reduce((sum, b) => sum + b.centerX, 0) / bounds.length;
        bounds.forEach(b => {
          b.shape.transform.x += targetValue - b.centerX;
        });
      } else if (direction === 'top') {
        targetValue = Math.min(...bounds.map(b => b.minY));
        bounds.forEach(b => {
          b.shape.transform.y += targetValue - b.minY;
        });
      } else if (direction === 'bottom') {
        targetValue = Math.max(...bounds.map(b => b.maxY));
        bounds.forEach(b => {
          b.shape.transform.y += targetValue - b.maxY;
        });
      } else if (direction === 'middle') {
        targetValue = bounds.reduce((sum, b) => sum + b.centerY, 0) / bounds.length;
        bounds.forEach(b => {
          b.shape.transform.y += targetValue - b.centerY;
        });
      }

      if (onShapeUpdate) onShapeUpdate();
    };

    const handleDistribute = (direction: 'horizontal' | 'vertical') => {
      if (selectedShapes.length < 3) return;

      const bounds = selectedShapes.map(shape => {
        const minX = Math.min(...shape.points.map(p => p.x + shape.transform.x));
        const maxX = Math.max(...shape.points.map(p => p.x + shape.transform.x));
        const minY = Math.min(...shape.points.map(p => p.y + shape.transform.y));
        const maxY = Math.max(...shape.points.map(p => p.y + shape.transform.y));
        return { shape, minX, maxX, minY, maxY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
      });

      if (direction === 'horizontal') {
        bounds.sort((a, b) => a.centerX - b.centerX);
        const totalSpace = bounds[bounds.length - 1].centerX - bounds[0].centerX;
        const spacing = totalSpace / (bounds.length - 1);

        bounds.forEach((b, index) => {
          if (index > 0 && index < bounds.length - 1) {
            const targetX = bounds[0].centerX + spacing * index;
            b.shape.transform.x += targetX - b.centerX;
          }
        });
      } else {
        bounds.sort((a, b) => a.centerY - b.centerY);
        const totalSpace = bounds[bounds.length - 1].centerY - bounds[0].centerY;
        const spacing = totalSpace / (bounds.length - 1);

        bounds.forEach((b, index) => {
          if (index > 0 && index < bounds.length - 1) {
            const targetY = bounds[0].centerY + spacing * index;
            b.shape.transform.y += targetY - b.centerY;
          }
        });
      }

      if (onShapeUpdate) onShapeUpdate();
    };

    const handleSmartDistribution = () => {
      const targetShapes = alignTarget === 'selection' ? selectedShapes : shapes;
      if (targetShapes.length < 2) return;

      // Use the distribution algorithm
      const bounds = { x: 0, y: 0, width: 800, height: 600 };
      const settings = {
        pattern: distributionPattern as any,
        spacing: distributionSpacing,
        randomness: 0.1,
        angle: 0,
        rotation: 0,
        scale: 1,
        density: 1,
        avoidOverlap: true,
        respectBounds: true
      };

      const positions = SmartDistributionAlgorithm.generatePositions(targetShapes.length, bounds, settings);

      targetShapes.forEach((shape, index) => {
        if (positions[index]) {
          shape.transform.x = positions[index].x;
          shape.transform.y = positions[index].y;
        }
      });

      if (onShapeUpdate) onShapeUpdate();
    };

    return (
      <div className="space-y-4">
        {/* Alignment Controls */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">Align ({selectedShapes.length} selected)</Label>
          <div className="grid grid-cols-3 gap-1">
            <Button
              onClick={() => handleAlign('left')}
              variant="secondary"
              size="sm"
              className="text-xs p-1 h-7"
              disabled={selectedShapes.length < 2}
            >
              <AlignLeft className="w-3 h-3" />
            </Button>
            <Button
              onClick={() => handleAlign('center')}
              variant="secondary"
              size="sm"
              className="text-xs p-1 h-7"
              disabled={selectedShapes.length < 2}
            >
              <AlignCenter className="w-3 h-3" />
            </Button>
            <Button
              onClick={() => handleAlign('right')}
              variant="secondary"
              size="sm"
              className="text-xs p-1 h-7"
              disabled={selectedShapes.length < 2}
            >
              <AlignRight className="w-3 h-3" />
            </Button>
            <Button
              onClick={() => handleAlign('top')}
              variant="secondary"
              size="sm"
              className="text-xs p-1 h-7"
              disabled={selectedShapes.length < 2}
            >
              <AlignJustify className="w-3 h-3 rotate-90" />
            </Button>
            <Button
              onClick={() => handleAlign('middle')}
              variant="secondary"
              size="sm"
              className="text-xs p-1 h-7"
              disabled={selectedShapes.length < 2}
            >
              <AlignCenter className="w-3 h-3 rotate-90" />
            </Button>
            <Button
              onClick={() => handleAlign('bottom')}
              variant="secondary"
              size="sm"
              className="text-xs p-1 h-7"
              disabled={selectedShapes.length < 2}
            >
              <AlignJustify className="w-3 h-3 rotate-90" />
            </Button>
          </div>
        </div>

        {/* Distribution Controls */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">Distribute</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleDistribute('horizontal')}
              variant="secondary"
              size="sm"
              className="text-xs"
              disabled={selectedShapes.length < 3}
            >
              Horizontal
            </Button>
            <Button
              onClick={() => handleDistribute('vertical')}
              variant="secondary"
              size="sm"
              className="text-xs"
              disabled={selectedShapes.length < 3}
            >
              Vertical
            </Button>
          </div>
        </div>

        <Separator className="bg-slate-700" />

        {/* Smart Distribution */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">Smart Distribution</Label>

          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Target</Label>
            <Select value={alignTarget} onValueChange={(value: 'selection' | 'canvas') => setAlignTarget(value)}>
              <SelectTrigger className="h-7 text-xs bg-slate-800 border-slate-600 text-slate-200">
                <SelectValue className="text-slate-200" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="selection" className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700 focus:text-slate-100">Selected Shapes</SelectItem>
                <SelectItem value="canvas" className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700 focus:text-slate-100">All Shapes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Pattern</Label>
            <Select value={distributionPattern} onValueChange={(value: 'grid' | 'circle' | 'line' | 'spiral') => setDistributionPattern(value)}>
              <SelectTrigger className="h-7 text-xs bg-slate-800 border-slate-600 text-slate-200">
                <SelectValue className="text-slate-200" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="grid" className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700 focus:text-slate-100">Grid</SelectItem>
                <SelectItem value="circle" className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700 focus:text-slate-100">Circle</SelectItem>
                <SelectItem value="line" className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700 focus:text-slate-100">Line</SelectItem>
                <SelectItem value="spiral" className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700 focus:text-slate-100">Spiral</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Spacing</span>
              <span className="text-slate-300">{distributionSpacing}px</span>
            </div>
            <BufferedSlider
              value={[distributionSpacing]}
              onValueCommit={([value]) => setDistributionSpacing(value)}
              min={10}
              max={200}
              step={5}
              className="w-full"
            />
          </div>

          <Button
            onClick={handleSmartDistribution}
            variant="secondary"
            size="sm"
            className="w-full text-xs"
            disabled={(alignTarget === 'selection' && selectedShapes.length < 2) || (alignTarget === 'canvas' && shapes.length < 2)}
          >
            <Grid3X3 className="w-3 h-3 mr-1" />
            Apply Distribution
          </Button>
        </div>
      </div>
    );
  }

  function ProjectManagementContent() {
    return (
      <div className="space-y-4">
        {/* Shape Sets Presets */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">Shape Sets Presets</Label>
          <Select
            value={selectedPresetId}
            onValueChange={setSelectedPresetId}
          >
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue placeholder="Select a preset..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {presets.length === 0 ? (
                <SelectItem value="no-presets" disabled className="text-slate-400 text-xs">
                  No presets saved
                </SelectItem>
              ) : (
                presets.map((preset) => (
                  <SelectItem 
                    key={preset.id} 
                    value={preset.id}
                    className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white text-xs"
                  >
                    {preset.presetName}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => setIsSavePresetDialogOpen(true)}
              variant="secondary"
              size="sm"
              className="text-xs"
              disabled={isSaving}
              data-testid="button-save-preset"
            >
              <Save className="w-3 h-3 mr-1" />
              Save As
            </Button>
            <Button
              onClick={handleLoadPreset}
              variant="secondary"
              size="sm"
              className="text-xs"
              disabled={!selectedPresetId || selectedPresetId === 'no-presets'}
              data-testid="button-load-preset"
            >
              <FolderOpen className="w-3 h-3 mr-1" />
              Load
            </Button>
            <Button
              onClick={() => {
                setPresetToDelete(selectedPresetId);
                setIsDeletePresetDialogOpen(true);
              }}
              variant="secondary"
              size="sm"
              className="text-xs"
              disabled={!selectedPresetId || selectedPresetId === 'no-presets' || isDeleting}
              data-testid="button-delete-preset"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
          </div>
        </div>

        <Separator className="bg-slate-700" />

        {/* Save/Load Project */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">Project Files</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={async () => {
                setIsSavingProject(true);
                try {
                  // Import ProjectManager dynamically
                  const { ProjectManager } = await import('../lib/projectManager');
                  
                  // Get active artboard for minimal save
                  const activeArtboardData = artboards.find(a => a.id === activeArtboard);
                  
                  if (!activeArtboardData) {
                    console.error('No active artboard found');
                    return;
                  }
                  
                  await ProjectManager.saveProject(
                    shapes,
                    selectedGroups as any,
                    activeArtboardData
                  );
                  
                  // Add a small delay to show the loading state
                  await new Promise(resolve => setTimeout(resolve, 500));
                } finally {
                  setIsSavingProject(false);
                }
              }}
              variant="secondary"
              size="sm"
              className="text-xs"
              disabled={isSavingProject}
            >
              {isSavingProject ? (
                <>
                  <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-slate-400 border-t-slate-600" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    // If user previously checked "don't ask again", load directly
                    if (skipLoadProjectDialog) {
                      await handleLoadProjectFile(file, false);
                    } else {
                      setPendingProjectFile(file);
                      setIsLoadDialogOpen(true);
                    }
                  }
                };
                input.click();
              }}
              variant="secondary"
              size="sm"
              className="text-xs"
              disabled={isLoadingProject}
            >
              {isLoadingProject ? (
                <>
                  <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-slate-400 border-t-slate-600" />
                  Loading...
                </>
              ) : (
                <>
                  <FolderOpen className="w-3 h-3 mr-1" />
                  Load
                </>
              )}
            </Button>
          </div>
        </div>

        <Separator className="bg-slate-700" />

        {/* App Settings */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">App Settings</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleSaveAppSettings}
              variant="secondary"
              size="sm"
              className="text-xs"
              disabled={true}
              data-testid="button-save-app-settings"
            >
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
            <Button
              onClick={handleLoadAppSettings}
              variant="secondary"
              size="sm"
              className="text-xs"
              disabled={true}
              data-testid="button-load-app-settings"
            >
              <FolderOpen className="w-3 h-3 mr-1" />
              Load
            </Button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your settings are automatically saved to the database and reloaded when the app is refreshed.
          </p>
        </div>

        <Separator className="bg-slate-700" />

        {/* Quick Actions */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">Quick Actions</Label>
          <div className="space-y-2">
            <Button
              onClick={async () => {
                setIsCopying(true);
                try {
                  const projectData = {
                    shapes,
                    selectedGroups,
                    scatterSettings,
                    enabledShapeTypes: Array.from(enabledShapeTypes)
                  };
                  await navigator.clipboard.writeText(JSON.stringify(projectData, null, 2));
                  
                  // Add a small delay to show the loading state
                  await new Promise(resolve => setTimeout(resolve, 300));
                } catch (error) {
                  console.error('❌ Failed to copy to clipboard:', error);
                } finally {
                  setIsCopying(false);
                }
              }}
              variant="secondary"
              size="sm"
              className="w-full text-xs"
              disabled={isCopying}
            >
              {isCopying ? (
                <>
                  <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-slate-400 border-t-slate-600" />
                  Copying...
                </>
              ) : (
                <>
                  <Clipboard className="w-3 h-3 mr-1" />
                  Copy Project to Clipboard
                </>
              )}
            </Button>

            <Button
              onClick={() => {
                if (onClearAll) onClearAll();
              }}
              variant="secondary"
              size="sm"
              className="w-full text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              New Project
            </Button>

          </div>
        </div>

        {/* Project Info */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-300">Project Statistics</Label>
          <div className="text-xs text-slate-400 space-y-1">
            <div>Shapes: {shapes.length}</div>
            <div>Groups: {selectedGroups.length}</div>
            <div>Selected: {selectedCount}</div>
          </div>
        </div>
      </div>
    );
  }

  // Dialogs moved outside ProjectManagementContent to prevent recreation on state changes
  
  function renderDialogs() {
    return (
      <>
        {/* Load Project Dialog */}
        <AlertDialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Load Project File</AlertDialogTitle>
              <AlertDialogDescription>
                This project file contains shapes and artboard settings. Would you like to keep your current auto-saved settings or start fresh?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex items-center space-x-2 py-2">
              <Checkbox
                id="dont-ask-again"
                checked={dontAskAgainPref}
                onCheckedChange={(checked) => setDontAskAgainPref(checked as boolean)}
              />
              <label
                htmlFor="dont-ask-again"
                className="text-sm text-slate-300 cursor-pointer"
              >
                Don't ask again
              </label>
            </div>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel onClick={() => {
                setPendingProjectFile(null);
                setDontAskAgainPref(false);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async (e) => {
                  e.preventDefault();
                  if (pendingProjectFile) {
                    setIsLoadDialogOpen(false);
                    // Save "don't ask again" preference if checked
                    if (dontAskAgainPref) {
                      await updateSkipLoadDialog.mutateAsync(true);
                    }
                    await handleLoadProjectFile(pendingProjectFile, true);
                    setPendingProjectFile(null);
                    setDontAskAgainPref(false);
                  }
                }}
              >
                Clear & Load Fresh
              </AlertDialogAction>
              <AlertDialogAction onClick={async (e) => {
                e.preventDefault();
                if (pendingProjectFile) {
                  setIsLoadDialogOpen(false);
                  // Save "don't ask again" preference if checked
                  if (dontAskAgainPref) {
                    await updateSkipLoadDialog.mutateAsync(true);
                  }
                  await handleLoadProjectFile(pendingProjectFile, false);
                  setPendingProjectFile(null);
                  setDontAskAgainPref(false);
                }
              }}>
                Keep My Settings
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Save Preset Dialog */}
        <AlertDialog open={isSavePresetDialogOpen} onOpenChange={setIsSavePresetDialogOpen}>
          <AlertDialogContent className="bg-slate-900 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-200">Save Shape Sets Preset</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Enter a name for this preset configuration. This will save all current shape sets and their settings.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Preset name..."
                className={`mt-2 ${isPresetNameDuplicate ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-600'} bg-slate-800 text-slate-200 placeholder:text-slate-500`}
                autoFocus
                list="preset-names-datalist"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newPresetName.trim() && !isPresetNameDuplicate) {
                    handleSavePreset();
                  }
                }}
                data-testid="input-preset-name"
              />
              {isPresetNameDuplicate && (
                <p className="text-xs text-red-400">A preset with this name already exists</p>
              )}
              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="clean-preset-checkbox"
                  checked={cleanPresetEnabled}
                  onCheckedChange={(checked) => setCleanPresetEnabled(checked as boolean)}
                  className="border-slate-500 data-[state=checked]:bg-blue-600"
                  data-testid="checkbox-clean-preset"
                />
                <label 
                  htmlFor="clean-preset-checkbox" 
                  className="text-sm text-slate-300 cursor-pointer select-none"
                >
                  Clean preset (only save enabled sets)
                </label>
              </div>
              {cleanPresetEnabled && (
                <>
                  <p className={`text-xs pl-6 ${effectiveGenerationSets.filter(s => s.enabled).length === 0 ? 'text-red-400' : 'text-slate-400'}`}>
                    {effectiveGenerationSets.filter(s => s.enabled).length === 0 
                      ? 'No enabled sets - cannot save clean preset'
                      : `${effectiveGenerationSets.filter(s => s.enabled).length} of ${effectiveGenerationSets.length} sets will be saved`
                    }
                  </p>
                  <div className="flex items-center space-x-2 pl-6 pt-1">
                    <Checkbox
                      id="auto-load-after-save-checkbox"
                      checked={autoLoadAfterSave}
                      onCheckedChange={(checked) => setAutoLoadAfterSave(checked as boolean)}
                      className="border-slate-500 data-[state=checked]:bg-green-600"
                      data-testid="checkbox-auto-load-after-save"
                    />
                    <label 
                      htmlFor="auto-load-after-save-checkbox" 
                      className="text-sm text-slate-300 cursor-pointer select-none"
                    >
                      Auto-load after saving
                    </label>
                  </div>
                </>
              )}
            </div>
            <datalist id="preset-names-datalist">
              {presets.map(preset => (
                <option key={preset.id} value={preset.presetName} />
              ))}
            </datalist>
            <AlertDialogFooter>
              <AlertDialogCancel 
                className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
                onClick={() => {
                  setNewPresetName('');
                  setCleanPresetEnabled(false);
                  setAutoLoadAfterSave(false);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSavePreset}
                disabled={!newPresetName.trim() || isPresetNameDuplicate || (cleanPresetEnabled && effectiveGenerationSets.filter(s => s.enabled).length === 0)}
                data-testid="button-save-preset"
              >
                Save Preset
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Preset Confirmation Dialog */}
        <AlertDialog open={isDeletePresetDialogOpen} onOpenChange={setIsDeletePresetDialogOpen}>
          <AlertDialogContent className="bg-slate-900 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-200">Delete Preset</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Are you sure you want to delete "{presets.find(p => p.id === presetToDelete)?.presetName}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
                onClick={() => {
                  setPresetToDelete('');
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeletePreset} 
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  function ColorManipulationContent() {
    const [hueShift, setHueShift] = useState(0);
    const [saturationShift, setSaturationShift] = useState(0);
    const [lightnessShift, setLightnessShift] = useState(0);

    const handleApplyColorManipulation = () => {
      const manipulation = {
        mode: 'shift' as const,
        hslShift: {
          hue: hueShift,
          saturation: saturationShift,
          lightness: lightnessShift,
          enabled: true
        },
        affectFill: true,
        affectStroke: true
      };

      onApplyColorManipulation(manipulation);
    };

    return (
      <div className="space-y-4">
        <div className="text-sm text-slate-400">
          Color Manipulation
        </div>

        <div className="text-xs text-slate-500 mb-3">
          {selectedShapes.length === 0 
            ? "Apply to all shapes on canvas" 
            : `Apply to ${selectedShapes.length} selected shape${selectedShapes.length > 1 ? 's' : ''}`
          }
        </div>

        {(
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Hue Shift</Label>
              <BufferedSliderWithLabel
                value={hueShift}
                onValueCommit={(value) => setHueShift(value)}
                min={-180}
                max={180}
                step={1}
                className="w-full"
                formatLabel={(v) => `${v}°`}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Saturation Shift</Label>
              <BufferedSliderWithLabel
                value={saturationShift}
                onValueCommit={(value) => setSaturationShift(value)}
                min={-100}
                max={100}
                step={1}
                className="w-full"
                formatLabel={(v) => `${v}%`}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Lightness Shift</Label>
              <BufferedSliderWithLabel
                value={lightnessShift}
                onValueCommit={(value) => setLightnessShift(value)}
                min={-100}
                max={100}
                step={1}
                className="w-full"
                formatLabel={(v) => `${v}%`}
              />
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
      <div className="space-y-4">
        {/* Transform Properties */}
        <div className="space-y-3">
          <Label className="text-sm text-slate-300 font-medium">Transform</Label>

          {/* Position */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Position</Label>
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

          {/* Scale with Interactive Sliders */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Scale</Label>
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">X Scale</span>
                  <span className="text-slate-300">{scaleX}%</span>
                </div>
                <BufferedSlider
                  value={[scaleX]}
                  onValueCommit={([value]) => {
                    setScaleX(value);
                    if (lockAspectRatio) {
                      setScaleY(value);
                    }
                  }}
                  min={1}
                  max={500}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Y Scale</span>
                  <span className="text-slate-300">{scaleY}%</span>
                </div>
                <BufferedSlider
                  value={[scaleY]}
                  onValueCommit={([value]) => {
                    setScaleY(value);
                    if (lockAspectRatio) {
                      setScaleX(value);
                    }
                  }}
                  min={1}
                  max={500}
                  step={1}
                  className="w-full"
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

          {/* Rotation with Slider */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Rotation</Label>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Angle</span>
                <span className="text-slate-300">{selectedShapes[0]?.transform.rotation || 0}°</span>
              </div>
              <BufferedSlider
                value={[selectedShapes[0]?.transform.rotation || 0]}
                onValueCommit={([value]) => {
                  selectedShapes.forEach(shape => {
                    shape.transform.rotation = value;
                  });
                  if (onShapeUpdate) onShapeUpdate();
                }}
                min={-180}
                max={180}
                step={1}
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-3 gap-1">
              <Button
                onClick={() => onRotateBy(-15)}
                variant="secondary"
                size="sm"
                className="text-xs"
              >
                -15°
              </Button>
              <Button
                onClick={() => onRotateBy(-90)}
                variant="secondary"
                size="sm"
                className="text-xs"
              >
                -90°
              </Button>
              <Button
                onClick={() => onRotateBy(15)}
                variant="secondary"
                size="sm"
                className="text-xs"
              >
                +15°
              </Button>
            </div>
          </div>

          {/* Flip */}
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
        </div>

        {/* Fill & Stroke Properties */}
        <Separator className="bg-slate-600" />

        <div className="space-y-3">
          <Label className="text-sm text-slate-300 font-medium">Fill & Stroke</Label>

          {/* Fill Color */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Fill Color</Label>
            <div className="flex items-center space-x-2">
              <div 
                className="w-8 h-6 rounded border border-slate-600 cursor-pointer"
                style={{ backgroundColor: selectedShapes[0]?.properties.fillColor || '#3b82f6' }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'color';
                  input.value = selectedShapes[0]?.properties.fillColor || '#3b82f6';
                  input.onchange = (e) => {
                    const color = (e.target as HTMLInputElement).value;
                    updateShapeProperty((shape) => {
                      shape.properties.fillColor = color;
                    });
                  };
                  input.click();
                }}
              />
              <Input
                type="text"
                value={selectedShapes[0]?.properties.fillColor || '#3b82f6'}
                onChange={(e) => {
                  const color = e.target.value;
                  updateShapeProperty((shape) => {
                    shape.properties.fillColor = color;
                  });
                }}
                className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                placeholder="#color"
              />
            </div>
          </div>

          {/* Fill Opacity */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Fill Opacity</Label>
            <BufferedSlider
              value={[Math.round((selectedShapes[0]?.properties.fillOpacity || 1) * 100)]}
              onValueCommit={([value]) => {
                updateShapeProperty((shape) => {
                  shape.properties.fillOpacity = value / 100;
                });
              }}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <span className="text-xs text-slate-500">{Math.round((selectedShapes[0]?.properties.fillOpacity || 1) * 100)}%</span>
          </div>

          {/* Stroke Color */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Stroke Color</Label>
            <div className="flex items-center space-x-2">
              <div 
                className="w-8 h-6 rounded border border-slate-600 cursor-pointer"
                style={{ backgroundColor: selectedShapes[0]?.properties.strokeColor || '#1e40af' }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'color';
                  input.value = selectedShapes[0]?.properties.strokeColor || '#1e40af';
                  input.onchange = (e) => {
                    const color = (e.target as HTMLInputElement).value;
                    updateShapeProperty((shape) => {
                      shape.properties.strokeColor = color;
                    });
                  };
                  input.click();
                }}
              />
              <Input
                type="text"
                value={selectedShapes[0]?.properties.strokeColor || '#1e40af'}
                onChange={(e) => {
                  const color = e.target.value;
                  updateShapeProperty((shape) => {
                    shape.properties.strokeColor = color;
                  });
                }}
                className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                placeholder="#color"
              />
            </div>
          </div>

          {/* Stroke Width & Opacity */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Stroke Width</Label>
              <BufferedNumericInput
                value={selectedShapes[0]?.properties.strokeWidth || 2}
                onCommit={(width) => {
                  updateShapeProperty((shape) => {
                    shape.properties.strokeWidth = width;
                  });
                }}
                min={0}
                max={50}
                step={0.1}
                className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Stroke Opacity</Label>
              <BufferedNumericInput
                value={Math.round((selectedShapes[0]?.properties.strokeOpacity || 1) * 100)}
                onCommit={(value) => {
                  const opacity = value / 100;
                  updateShapeProperty((shape) => {
                    shape.properties.strokeOpacity = opacity;
                  });
                }}
                min={0}
                max={100}
                step={1}
                className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
        </div>

        {/* Shape-specific Properties */}
        {selectedShapes.length === 1 && (
          <>
            <Separator className="bg-slate-600" />
            <div className="space-y-3">
              <Label className="text-sm text-slate-300 font-medium">Shape Properties</Label>

              {selectedShapes[0].type === 'circle' && selectedShapes[0].radius && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Radius</Label>
                  <BufferedNumericInput
                    value={selectedShapes[0].radius}
                    onCommit={(newRadius) => {
                      updateShapeProperty((shape) => {
                        if (shape.type === 'circle') {
                          shape.radius = newRadius;
                          shape.regeneratePointsFromSegments();
                        }
                      });
                    }}
                    min={1}
                    max={1000}
                    step={1}
                    className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                  />
                </div>
              )}

              {(selectedShapes[0].type === 'rectangle' || selectedShapes[0].type === 'ellipse') && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-400">Width</Label>
                    <BufferedNumericInput
                      value={selectedShapes[0].width || 0}
                      onCommit={(newWidth) => {
                        updateShapeProperty((shape) => {
                          if (shape.width !== undefined) {
                            shape.width = newWidth;
                            if (shape.type === 'rectangle' || shape.type === 'ellipse') {
                              shape.regeneratePointsFromSegments();
                            }
                          }
                        });
                      }}
                      min={1}
                      max={2000}
                      step={1}
                      className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-400">Height</Label>
                    <BufferedNumericInput
                      value={selectedShapes[0].height || 0}
                      onCommit={(newHeight) => {
                        updateShapeProperty((shape) => {
                          if (shape.height !== undefined) {
                            shape.height = newHeight;
                            if (shape.type === 'rectangle' || shape.type === 'ellipse') {
                              shape.regeneratePointsFromSegments();
                            }
                          }
                        });
                      }}
                      min={1}
                      max={2000}
                      step={1}
                      className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                </div>
              )}

              {(selectedShapes[0].type === 'polygon' || selectedShapes[0].type === 'star') && selectedShapes[0].sides && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Sides</Label>
                  <BufferedNumericInput
                    value={selectedShapes[0].sides}
                    onCommit={(newSides) => {
                      updateShapeProperty((shape) => {
                        if (shape.sides !== undefined) {
                          shape.sides = newSides;
                          shape.regeneratePointsFromSegments();
                        }
                      });
                    }}
                    min={3}
                    max={20}
                    step={1}
                    className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                  />
                </div>
              )}

              {(selectedShapes[0].type === 'circle' || selectedShapes[0].type === 'ellipse') && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Segments (Smoothness)</Label>
                  <BufferedSliderWithLabel
                    value={selectedShapes[0].segments}
                    onValueCommit={(value) => {
                      updateShapeProperty((shape) => {
                        shape.segments = value;
                        shape.regeneratePointsFromSegments();
                      });
                    }}
                    min={8}
                    max={64}
                    step={4}
                    className="w-full"
                    formatLabel={(v) => `${v} segments`}
                  />
                </div>
              )}

              {/* Point Management for Splines, Lines, and Polygons */}
              {(selectedShapes[0].type === 'bezier' || selectedShapes[0].type === 'smooth-spline' || selectedShapes[0].type === 'line' || selectedShapes[0].type === 'polygon') && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Point Count</Label>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => {
                        updateShapeProperty((shape) => {
                          if (shape.points && shape.points.length > 2) {
                            // Remove the last point
                            shape.points.pop();
                            // Update shape geometry
                            if (shape.updateShapeFromPoints) {
                              shape.updateShapeFromPoints();
                            }
                            // Regenerate polygon segments if needed
                            if (shape.type === 'polygon' && shape.sides) {
                              shape.sides = shape.points.length;
                            }
                          }
                        });
                      }}
                      variant="secondary"
                      size="sm"
                      className="text-xs h-6 px-2 bg-slate-700 hover:bg-slate-600"
                      disabled={selectedShapes[0].points?.length <= 2}
                    >
                      - Remove Point
                    </Button>
                    <span className="text-xs text-slate-300 flex-1 text-center">
                      {selectedShapes[0].points?.length || 0} points
                    </span>
                    <Button
                      onClick={() => {
                        updateShapeProperty((shape) => {
                          if (shape.points && shape.points.length < 20) {
                            // Add a new point between the last two points
                            const lastPoint = shape.points[shape.points.length - 1];
                            const secondLastPoint = shape.points[shape.points.length - 2] || lastPoint;
                            const newPoint = {
                              x: (lastPoint.x + secondLastPoint.x) / 2 + (Math.random() - 0.5) * 20,
                              y: (lastPoint.y + secondLastPoint.y) / 2 + (Math.random() - 0.5) * 20
                            };
                            shape.points.push(newPoint);
                            // Update shape geometry
                            if (shape.updateShapeFromPoints) {
                              shape.updateShapeFromPoints();
                            }
                            // Regenerate polygon segments if needed
                            if (shape.type === 'polygon' && shape.sides) {
                              shape.sides = shape.points.length;
                            }
                          }
                        });
                      }}
                      variant="secondary"
                      size="sm"
                      className="text-xs h-6 px-2 bg-slate-700 hover:bg-slate-600"
                      disabled={selectedShapes[0].points?.length >= 20}
                    >
                      + Add Point
                    </Button>
                  </div>
                </div>
              )}

              {/* Corner Radius for Rounded Shapes */}
              {(selectedShapes[0].type === 'rounded-rectangle' || selectedShapes[0].type === 'rounded-square') && selectedShapes[0].cornerRadius !== undefined && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Corner Radius</Label>
                  <BufferedNumericInput
                    value={selectedShapes[0].cornerRadius || 0}
                    onCommit={(newRadius) => {
                      updateShapeProperty((shape) => {
                        if (shape.cornerRadius !== undefined) {
                          shape.cornerRadius = Math.max(0, newRadius);
                          if (shape.regeneratePointsFromSegments) {
                            shape.regeneratePointsFromSegments();
                          }
                        }
                      });
                    }}
                    min={0}
                    max={50}
                    step={1}
                    className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                  />
                </div>
              )}

              {/* Inner Radius for Stars and Rings */}
              {(selectedShapes[0].type === 'star' || selectedShapes[0].type === 'ring') && selectedShapes[0].innerRadius !== undefined && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Inner Radius</Label>
                  <BufferedNumericInput
                    value={selectedShapes[0].innerRadius || 0}
                    onCommit={(newInnerRadius) => {
                      updateShapeProperty((shape) => {
                        if (shape.innerRadius !== undefined) {
                          shape.innerRadius = Math.max(0, newInnerRadius);
                          if (shape.regeneratePointsFromSegments) {
                            shape.regeneratePointsFromSegments();
                          }
                        }
                      });
                    }}
                    min={0}
                    max={selectedShapes[0].radius ? Math.floor(selectedShapes[0].radius * 0.9) : 50}
                    step={1}
                    className="h-6 text-xs bg-slate-800 border-slate-600 text-white"
                  />
                </div>
              )}
            </div>
          </>
        )}

        <Separator className="bg-slate-600" />

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

  return (
    <div className={`flex flex-col h-full bg-slate-900/95 border-r border-slate-700 transition-all duration-300 ${
      isCollapsed ? 'w-12' : 'w-80'
    }`}>
      {/* Auth Header */}
      <div className="border-b border-slate-700">
        <AuthHeader isCollapsed={isCollapsed} />
      </div>
      
      {/* Header */}
      <div className={`flex items-center border-b border-slate-700 ${isCollapsed ? 'justify-center py-3' : 'justify-between p-3'}`}>
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

      {/* Collapsed Content with Tight Popovers */}
      {isCollapsed && (
        <div className="flex flex-col w-full items-center">
          {[
            { id: 'shapes', name: 'Shape Types', icon: Shapes, color: 'blue', content: CollapsedShapeTypesContent },
            { id: 'selection', name: 'Selection Mode', icon: Target, color: 'cyan', content: SelectionModesContent },
            { id: 'layers', name: 'Layers', icon: Layers3, color: 'purple', content: LayersContent },
            { id: 'properties', name: 'Properties', icon: Settings, color: 'yellow', content: PropertiesContent },
            { id: 'composition', name: 'Composition', icon: Shuffle, color: 'green', content: CompositionContent },
            { id: 'align-distribute', name: 'Align & Distribute', icon: AlignCenter, color: 'indigo', content: AlignDistributeContent },
            { id: 'artboards', name: 'Artboards', icon: Monitor, color: 'orange', content: ArtboardsContent },
            { id: 'colors', name: 'Color Manipulation', icon: Palette, color: 'pink', content: ColorManipulationContent },
            { id: 'project', name: 'Project Management', icon: FolderOpen, color: 'violet', content: ProjectManagementContent },
            { id: 'export', name: 'Export & Save', icon: Download, color: 'emerald', content: ExportSaveContent }
          ]
          .sort((a, b) => {
            // Sort by displayOrder from user preferences
            const orderA = sidebarSections[a.id as keyof typeof sidebarSections]?.displayOrder ?? 999;
            const orderB = sidebarSections[b.id as keyof typeof sidebarSections]?.displayOrder ?? 999;
            return orderA - orderB;
          })
          .filter(section => 
            // Only show sections that are enabled in user preferences
            sidebarSections[section.id as keyof typeof sidebarSections]?.enabled === true
          ).map((section, index) => (
            <div key={section.id} className="flex flex-col items-center w-full">
              <Popover 
                open={activePopover === section.id} 
                onOpenChange={(open) => setActivePopover(open ? section.id : null)}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`w-full h-8 p-0 rounded-none border-0 hover:bg-slate-800 ${
                      activePopover === section.id ? 'bg-slate-800' : ''
                    } ${
                      section.color === 'cyan' ? 'text-cyan-400 hover:text-cyan-300' :
                      section.color === 'orange' ? 'text-orange-400 hover:text-orange-300' :
                      section.color === 'emerald' ? 'text-emerald-400 hover:text-emerald-300' :
                      section.color === 'blue' ? 'text-blue-400 hover:text-blue-300' :
                      section.color === 'green' ? 'text-green-400 hover:text-green-300' :
                      section.color === 'yellow' ? 'text-yellow-400 hover:text-yellow-300' :
                      section.color === 'purple' ? 'text-purple-400 hover:text-purple-300' :
                      section.color === 'indigo' ? 'text-indigo-400 hover:text-indigo-300' :
                      section.color === 'violet' ? 'text-violet-400 hover:text-violet-300' :
                      'text-pink-400 hover:text-pink-300'
                    }`}
                    onClick={() => handlePopoverToggle(section.id)}
                    data-testid={`sidebar-collapsed-${section.id}-button`}
                  >
                    <section.icon className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  side="right" 
                  align="start" 
                  className="w-80 max-h-96 overflow-y-auto bg-slate-900 border-slate-700 text-white"
                  sideOffset={4}
                >
                  <div className="space-y-2">
                    <h3 className={`text-sm font-medium ${
                      section.color === 'cyan' ? 'text-cyan-400' :
                      section.color === 'orange' ? 'text-orange-400' :
                      section.color === 'emerald' ? 'text-emerald-400' :
                      section.color === 'blue' ? 'text-blue-400' :
                      section.color === 'green' ? 'text-green-400' :
                      section.color === 'yellow' ? 'text-yellow-400' :
                      section.color === 'purple' ? 'text-purple-400' :
                      section.color === 'indigo' ? 'text-indigo-400' :
                      section.color === 'violet' ? 'text-violet-400' :
                      'text-pink-400'
                    }`}>
                      {section.name}
                    </h3>
                    <section.content />
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* Quick Generate Button - appears after Shape Types icon */}
              {section.id === 'shapes' && (
                <Button
                  onClick={onGenerateRandomShapes}
                  className="w-8 h-8 p-0 rounded-md bg-[var(--editor-accent)] hover:bg-purple-700 text-white transition-colors"
                  title="Generate Shapes (Quick)"
                  data-testid="sidebar-collapsed-quick-generate-button"
                >
                  <Wand2 className="w-5 h-5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {!isCollapsed && (
        /* Expanded sidebar with full content */
        <>
          <div 
            ref={scrollContainerRef} 
            className="flex-1 overflow-y-auto [&_*]:!scroll-m-0"
            style={{ overflowAnchor: 'none' }}
            onPointerDown={saveScrollPosition}
            onFocusCapture={saveScrollPosition}
            onKeyDown={saveScrollPosition}
          >
          <Accordion 
            type="multiple" 
            value={openAccordionSections} 
            onValueChange={setOpenAccordionSections}
            className="w-full px-2 py-1 flex flex-col"
          >
            {/* Shape Types Section */}
            {sidebarSections.shapes?.enabled && (
              <AccordionItem value="shapes" className="border-slate-700" style={{ order: sidebarSections.shapes?.displayOrder ?? 999 }}>
                <AccordionTrigger className="text-sm text-blue-400 hover:text-blue-300 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <Shapes className="w-4 h-4 mr-2" />
                    Shape Types
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <ShapeTypesSection variant="expanded" />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Selection Modes Section */}
            {sidebarSections.selection?.enabled && (
              <AccordionItem value="selection" className="border-slate-700" style={{ order: sidebarSections.selection?.displayOrder ?? 999 }}>
                <AccordionTrigger className="text-sm text-cyan-400 hover:text-cyan-300 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    Selection Modes
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <SelectionModesContent />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Layers Section */}
            {sidebarSections.layers?.enabled && (
              <AccordionItem value="layers" className="border-slate-700" style={{ order: sidebarSections.layers?.displayOrder ?? 999 }}>
                <AccordionTrigger className="text-sm text-purple-400 hover:text-purple-300 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <Layers3 className="w-4 h-4 mr-2" />
                    Layers
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <LayersContent />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Composition Section */}
            {sidebarSections.composition?.enabled && (
              <AccordionItem value="composition" className="border-slate-700" style={{ order: sidebarSections.composition?.displayOrder ?? 999 }}>
                <AccordionTrigger className="text-sm text-green-400 hover:text-green-300 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <Shuffle className="w-4 h-4 mr-2" />
                    Composition
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <CompositionContent />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Align & Distribute Section */}
            {sidebarSections['align-distribute']?.enabled && (
              <AccordionItem value="align-distribute" className="border-slate-700" style={{ order: sidebarSections['align-distribute']?.displayOrder ?? 999 }}>
                <AccordionTrigger className="text-sm text-indigo-400 hover:text-indigo-300 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <AlignCenter className="w-4 h-4 mr-2" />
                    Align & Distribute
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <AlignDistributeContent />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Artboards Section */}
            {sidebarSections.artboards?.enabled && (
              <AccordionItem value="artboards" className="border-slate-700" style={{ order: sidebarSections.artboards?.displayOrder ?? 999 }}>
                <AccordionTrigger className="text-sm text-orange-400 hover:text-orange-300 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <Monitor className="w-4 h-4 mr-2" />
                    Artboards
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <ArtboardsContent />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Color Manipulation Section */}
            {sidebarSections.colors?.enabled && (
              <AccordionItem value="colors" className="border-slate-700" style={{ order: sidebarSections.colors?.displayOrder ?? 999 }}>
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
            )}

            {/* Project Management Section */}
            {sidebarSections.project?.enabled && (
              <AccordionItem value="project" className="border-slate-700" style={{ order: sidebarSections.project?.displayOrder ?? 999 }}>
                <AccordionTrigger className="text-sm text-violet-400 hover:text-violet-300 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Project Management
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <ProjectManagementContent />
                  
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Export & Save Section */}
            {sidebarSections.export?.enabled && (
              <AccordionItem value="export" className="border-slate-700" style={{ order: sidebarSections.export?.displayOrder ?? 999 }}>
                <AccordionTrigger className="text-sm text-emerald-400 hover:text-emerald-300 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <Download className="w-4 h-4 mr-2" />
                    Export & Save
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <ExportSaveContent />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Properties Section - Moved to last position */}
            {sidebarSections.properties?.enabled && (
              <AccordionItem value="properties" className="border-slate-700" style={{ order: sidebarSections.properties?.displayOrder ?? 999 }}>
                <AccordionTrigger className="text-sm text-yellow-400 hover:text-yellow-300 py-3 hover:no-underline">
                  <div className="flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Properties
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <PropertiesContent />
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
        </>
      )}
      
      {/* BatchConfigDialog - Moved to stable location to prevent mount/unmount cycles */}
      <BatchConfigDialog
        settings={generationConfigSettings}
        onSettingsChange={handleBatchConfigSettingsChange}
        sidebarCollapsed={isCollapsed}
        
        // Generation Sets Integration
        generationSets={generationSets}
        currentGenerationSetId={currentGenerationSetId}
        enabledShapeTypes={enabledShapeTypes}
        scatterSettings={scatterSettings}
        shapeCountMode={shapeCountMode}
        shapeCountFixed={shapeCountFixed}
        shapeCountRange={shapeCountRange}
        generationSetsEnabled={exportSettings.generationSetsEnabled}
        onGenerationSetsChange={onGenerationSetsChange}
        onCurrentGenerationSetChange={onCurrentGenerationSetChange}
        onCreateGenerationSet={onCreateGenerationSet}
        onDeleteGenerationSet={onDeleteGenerationSet}
        generateUniqueSetName={generateUniqueSetName}
        onOpenGenerationSetsManager={onOpenGenerationSetsManager}
        updateGenerationSetPartial={updateGenerationSetPartial}
        
        // Props for ApiCallGenerator
        artboards={artboards}
        activeArtboard={activeArtboard}
        exportBatchModeEnabled={exportSettings.exportBatchModeEnabled}
        exportSaveProjectFiles={exportSaveProjectFiles}
        exportBatchCount={exportBatchCount}
        exportShapeCountRange={exportShapeCountRange}
        exportQuality={exportQuality}
        exportScale={exportScale}
        exportFormat={exportFormat}
        exportScope={exportMode === 'selection' ? 'selected' : exportMode}
        packageAsZip={packageAsZip}
        exportAllImages={exportAllImages}
        selectedImageIndices={selectedImageIndices}
      />
      
      {/* Render all dialogs outside the main component tree to prevent recreation */}
      {renderDialogs()}
      
      {/* Sets Manager Dialog - Separate dialog for managing generation sets */}
      <SetsManagerDialog
        isOpen={isSetsManagerOpen}
        onOpenChange={(open) => {
          if (!open && onCloseGenerationSetsManager) {
            onCloseGenerationSetsManager();
          }
        }}
        generationSets={effectiveGenerationSets}
        onGenerationSetsChange={onGenerationSetsChange || (() => {})}
        globalZIndexEnabled={false}
        showInlineValidation={true}
        currentSetId={effectiveCurrentSetId}
        onCurrentSetChange={onCurrentGenerationSetChange}
        onCurrentSetUpdate={(setId) => {
          // Skip restoration if Apply button just saved (prevents scroll jump)
          if (skipNextRestoreRef.current) {
            console.log('⏭️ [SIDEBAR] Skipping UI restoration after Apply - scroll position preserved');
            skipNextRestoreRef.current = false;
            return;
          }
          // When current set is updated externally, restore UI state from it
          console.log('🔄 [SIDEBAR] Current set updated, restoring UI state:', setId);
          onRestoreUIStateFromSet?.(setId);
        }}
        onApplyCurrentUIStateToSet={onApplyCurrentUIStateToSet}
        enabledShapeTypes={enabledShapeTypes}
        scatterSettings={scatterSettings}
        batchConfigSettings={generationConfigSettings}
        shapeCountMode={shapeCountMode}
        shapeCountFixed={shapeCountFixed}
        shapeCountRange={shapeCountRange}
        onCreateSetFromState={(uiState, name) => {
          // Use the passed uiState instead of re-capturing to ensure accurate state capture
          const setId = onCreateGenerationSet?.(name || '', uiState);
          return setId || '';
        }}
        batchExportCount={exportBatchCount}
        globalRepetitionMode={globalRepetitionMode}
        globalRepetitionValue={globalRepetitionValue}
        globalRepetitionRange={globalRepetitionRange}
        onGlobalRepetitionModeChange={setGlobalRepetitionMode}
        onGlobalRepetitionValueChange={setGlobalRepetitionValue}
        onGlobalRepetitionRangeChange={setGlobalRepetitionRange}
        edgeCaseStrategy={exportSettings.edgeCaseStrategy || 'hold'}
        onEdgeCaseStrategyChange={(strategy) => {
          console.log('Edge case strategy changed:', strategy);
          updateExportSettings.mutate({ edgeCaseStrategy: strategy });
        }}
      />
      
      {/* TIFF Pre-flight Modal */}
      <TiffPreflightModal
        open={isTiffPreflightOpen}
        onOpenChange={setIsTiffPreflightOpen}
        preflightInfo={getTiffPreflightInfo()}
        onConfirm={handleTiffPreflightConfirm}
        onCancel={handleTiffPreflightCancel}
        isExporting={isServerExportingGlobal}
      />
    </div>
  );
}