import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
 
  Layers,
  Hash,
  Type,
  Target,
  Settings,
  Info,
  Plus,
  X,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Droplets,
  Blend,
  Move,
  RotateCcw,
  Maximize2,
  AlignCenter
} from 'lucide-react';
import { 
  GenerationSet, 
  ShapeCountMode, 
  SupportedShapeType,
  DEFAULT_GENERATION_SET_LIMITS,
  SupportedShapeTypeSchema,
  BlendMode,
  CompositingOperation,
  BLEND_MODES
} from '@shared/schema';
import {
  ShapeSpecificPropertiesHelper,
  BlendModeHelper,
  GenerationSetValidator,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  safeParseNumber,
  isValidShapeType
} from '@/lib/typedHelpers';
import { SafeSection } from '@/components/ErrorBoundary';
import { StyledModeField, type ModeConfig } from '@/components/StyledModeField';

interface IndividualSetConfigProps {
  generationSet: GenerationSet;
  onUpdate: (updates: Partial<GenerationSet>) => void;
  globalZIndexEnabled?: boolean;
  showInlineValidation?: boolean;
  validationResult?: ValidationResult;
}

// Available shape types grouped by category
const SHAPE_CATEGORIES = {
  'Basic': ['rectangle', 'rounded-rectangle', 'square', 'rounded-square', 'circle', 'ellipse'] as SupportedShapeType[],
  'Geometric': ['triangle', 'right-triangle', 'pentagon', 'hexagon', 'rhombus', 'parallelogram', 'trapezoid'] as SupportedShapeType[],
  'Special': ['star', 'polygon', 'heart', 'arrow', 'cross', 'kite', 'semicircle'] as SupportedShapeType[],
  'Lines & Curves': ['line-vector', 'line', 'bezier', 'cubic', 'smooth-spline'] as SupportedShapeType[],
  'Complex': ['ring', 'blob', 'chunk', 'spline-circle', 'spline-ellipse', 'spline-ring'] as SupportedShapeType[]
};

// Helper function to get display names for shape types
const getShapeDisplayName = (shapeType: SupportedShapeType): string => {
  const displayNames: Record<SupportedShapeType, string> = {
    'rectangle': 'Rect',
    'rounded-rectangle': 'Rounded Rect',
    'square': 'Square', 
    'rounded-square': 'Rounded Sq',
    'circle': 'Circle',
    'ellipse': 'Ellipse',
    'triangle': 'Triangle',
    'right-triangle': 'Right Tri',
    'pentagon': 'Pentagon',
    'hexagon': 'Hexagon',
    'rhombus': 'Rhombus',
    'parallelogram': 'Parallel',
    'trapezoid': 'Trapezoid',
    'star': 'Star',
    'polygon': 'Polygon',
    'heart': 'Heart',
    'arrow': 'Arrow',
    'cross': 'Cross',
    'kite': 'Kite',
    'semicircle': 'Semicircle',
    'line-vector': 'Line Vec',
    'line': 'Line',
    'bezier': 'Bezier',
    'cubic': 'Cubic',
    'smooth-spline': 'Smooth',
    'ring': 'Ring',
    'blob': 'Blob',
    'chunk': 'Chunk',
    'spline-circle': 'Spline Cir',
    'spline-ellipse': 'Spline Ell',
    'spline-ring': 'Spline Ring'
  };
  
  return displayNames[shapeType] || shapeType.replace('-', ' ');
};

// Helper function to check if a shape type has configurable properties
const hasConfigurableProperties = (shapeType: SupportedShapeType): boolean => {
  const shapesWithProperties: SupportedShapeType[] = [
    'rounded-rectangle',   // corner radius
    'rounded-square',      // corner radius
    'polygon',             // point count
    'star',                // point count, inner radius
    'ring',                // inner radius
    'spline-ring',         // inner radius
    'circle',              // segment count
    'ellipse',             // segment count
    'line-vector',         // direction, length, centroid, stroke caps
    'line',                // point count
    'bezier',              // point count
    'cubic',               // point count
    'smooth-spline'        // point count
  ];
  
  return shapesWithProperties.includes(shapeType);
};

// BLEND_MODES is now imported from shared schema

export function IndividualSetConfig({ 
  generationSet, 
  onUpdate, 
  globalZIndexEnabled = false,
  showInlineValidation = true,
  validationResult
}: IndividualSetConfigProps) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, ValidationError | null>>({});
  const [fieldWarnings, setFieldWarnings] = useState<Record<string, ValidationWarning | null>>({});
  

  // Real-time validation
  const currentValidation = useMemo(() => {
    if (validationResult) {
      return validationResult;
    }
    return GenerationSetValidator.validateGenerationSet(generationSet);
  }, [generationSet, validationResult]);

  // Update field-level errors and warnings
  useEffect(() => {
    if (!showInlineValidation) return;
    
    const newFieldErrors: Record<string, ValidationError | null> = {};
    const newFieldWarnings: Record<string, ValidationWarning | null> = {};
    
    currentValidation.errors.forEach(error => {
      newFieldErrors[error.field] = error;
    });
    
    currentValidation.warnings.forEach(warning => {
      newFieldWarnings[warning.field] = warning;
    });
    
    setFieldErrors(newFieldErrors);
    setFieldWarnings(newFieldWarnings);
  }, [currentValidation, showInlineValidation]);

  // Helper to get field validation state
  const getFieldValidation = useCallback((fieldName: string) => {
    return {
      error: fieldErrors[fieldName],
      warning: fieldWarnings[fieldName],
      hasError: Boolean(fieldErrors[fieldName]),
      hasWarning: Boolean(fieldWarnings[fieldName])
    };
  }, [fieldErrors, fieldWarnings]);

  // Update handlers
  const handleNameChange = useCallback((name: string) => {
    onUpdate({ name });
  }, [onUpdate]);

  const handleDescriptionChange = useCallback((description: string) => {
    onUpdate({ description: description || undefined });
  }, [onUpdate]);

  const handleShapeCountModeChange = useCallback((mode: ShapeCountMode) => {
    onUpdate({ shapeCountMode: mode });
  }, [onUpdate]);

  const handleShapeCountFixedChange = useCallback((count: number) => {
    onUpdate({ shapeCountFixed: count });
  }, [onUpdate]);

  const handleShapeCountRangeChange = useCallback((range: [number, number]) => {
    onUpdate({ shapeCountRange: range });
  }, [onUpdate]);

  const handleShapeTypeToggle = useCallback((shapeType: SupportedShapeType, enabled: boolean) => {
    const currentTypes = generationSet.enabledShapeTypes;
    const updatedTypes = enabled
      ? [...currentTypes, shapeType]
      : currentTypes.filter(type => type !== shapeType);
    
    onUpdate({ enabledShapeTypes: updatedTypes });
  }, [generationSet.enabledShapeTypes, onUpdate]);

  const handleSelectAllShapes = useCallback((category: string) => {
    const categoryShapes = SHAPE_CATEGORIES[category as keyof typeof SHAPE_CATEGORIES];
    const allCurrentTypes = new Set(generationSet.enabledShapeTypes);
    
    categoryShapes.forEach(shape => allCurrentTypes.add(shape));
    onUpdate({ enabledShapeTypes: Array.from(allCurrentTypes) });
  }, [generationSet.enabledShapeTypes, onUpdate]);

  const handleDeselectAllShapes = useCallback((category: string) => {
    const categoryShapes = SHAPE_CATEGORIES[category as keyof typeof SHAPE_CATEGORIES];
    const updatedTypes = generationSet.enabledShapeTypes.filter(
      type => !categoryShapes.includes(type)
    );
    onUpdate({ enabledShapeTypes: updatedTypes });
  }, [generationSet.enabledShapeTypes, onUpdate]);

  const handleZIndexConfigChange = useCallback((field: keyof typeof generationSet.zIndexConfig, value: number) => {
    onUpdate({
      zIndexConfig: {
        ...generationSet.zIndexConfig,
        [field]: value
      }
    });
  }, [generationSet.zIndexConfig, onUpdate]);

  // Shape-specific property handlers with type safety
  const handleShapeSpecificPropertyChange = useCallback(<T = any>(
    shapeType: SupportedShapeType,
    property: string,
    value: T
  ) => {
    if (!isValidShapeType(shapeType)) {
      console.error(`Invalid shape type: ${shapeType}`);
      return;
    }
    
    // Create fresh helper with current properties to avoid stale data race condition
    const freshHelper = new ShapeSpecificPropertiesHelper(generationSet.shapeSpecificProperties);
    const updatedProperties = freshHelper.setProperty(shapeType, property, value);
    onUpdate({ shapeSpecificProperties: updatedProperties });
  }, [generationSet.shapeSpecificProperties, onUpdate]);

  // Helper functions to convert between old format and ModeConfig
  const convertToModeConfig = useCallback((shapeType: SupportedShapeType, property: string, defaultFixed: number, defaultRange: [number, number]): ModeConfig => {
    const shapeProps = generationSet.shapeSpecificProperties?.[shapeType] as any;
    const mode = shapeProps?.[`${property}Mode`] || 'range';
    
    switch (mode) {
      case 'fixed':
        return { kind: 'fixed', value: shapeProps?.[`${property}Value`] || defaultFixed };
      case 'range':
        const range = shapeProps?.[`${property}Range`] || defaultRange;
        return { kind: 'range', min: range[0], max: range[1] };
      default:
        return { kind: 'range', min: defaultRange[0], max: defaultRange[1] };
    }
  }, [generationSet.shapeSpecificProperties]);

  const handleModeConfigChange = useCallback((shapeType: SupportedShapeType, property: string, config: ModeConfig) => {
    const updates: Record<string, any> = {};
    
    switch (config.kind) {
      case 'fixed':
        updates[`${property}Mode`] = 'fixed';
        updates[`${property}Value`] = config.value;
        break;
      case 'range':
        updates[`${property}Mode`] = 'range';
        updates[`${property}Range`] = [config.min, config.max];
        break;
      case 'values':
        // For now, convert values mode to range using first and last values
        updates[`${property}Mode`] = 'range';
        updates[`${property}Range`] = [Math.min(...config.values), Math.max(...config.values)];
        break;
    }

    // Apply all updates atomically with a single helper operation
    const currentProperties = generationSet.shapeSpecificProperties || {};
    const shapeProperties = currentProperties[shapeType] || {};
    
    onUpdate({
      shapeSpecificProperties: {
        ...currentProperties,
        [shapeType]: {
          ...shapeProperties,
          ...updates
        }
      }
    });
  }, [generationSet.shapeSpecificProperties, onUpdate]);

  // Helper to render field validation indicators
  const renderFieldValidation = useCallback((fieldName: string) => {
    const validation = getFieldValidation(fieldName);
    
    if (!showInlineValidation) return null;
    
    if (validation.hasError) {
      return (
        <div className="flex items-center gap-1 mt-1" data-testid={`validation-error-${fieldName}`}>
          <AlertTriangle className="w-3 h-3 text-red-400" />
          <span className="text-xs text-red-400">{validation.error!.message}</span>
        </div>
      );
    }
    
    if (validation.hasWarning) {
      return (
        <div className="flex items-center gap-1 mt-1" data-testid={`validation-warning-${fieldName}`}>
          <AlertCircle className="w-3 h-3 text-yellow-400" />
          <span className="text-xs text-yellow-400">{validation.warning!.message}</span>
        </div>
      );
    }
    
    return null;
  }, [getFieldValidation, showInlineValidation]);

  // Render validation summary
  const renderValidationSummary = useCallback(() => {
    if (!showInlineValidation || currentValidation.isValid) return null;
    
    return (
      <Alert variant="destructive" className="mb-4" data-testid="validation-summary">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1">
            <p className="font-medium">Configuration Issues:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {currentValidation.errors.map((error, index) => (
                <li key={`error-${index}`}>{error.message}</li>
              ))}
            </ul>
            {currentValidation.warnings.length > 0 && (
              <>
                <p className="font-medium mt-2">Warnings:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-400">
                  {currentValidation.warnings.map((warning, index) => (
                    <li key={`warning-${index}`}>{warning.message}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }, [showInlineValidation, currentValidation]);

  return (
    <SafeSection className="bg-slate-900 border-slate-700 rounded-lg">
      <Card className="bg-slate-900 border-slate-700" data-testid="individual-set-config">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-200">
            <Settings className="w-5 h-5" />
            Configure Generation Set
            {!currentValidation.isValid && (
              <Badge variant="destructive" className="ml-2" data-testid="badge-validation-status">
                Issues
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              {/* Validation Summary */}
              {renderValidationSummary()}

              {/* Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2" data-testid="section-basic-information">
                  <Type className="w-4 h-4 text-slate-400" />
                  <h4 className="text-sm font-medium text-white" data-testid="heading-basic-information">Basic Information</h4>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="set-name" className="text-white">
                      Set Name
                    </Label>
                    <Input
                      id="set-name"
                      value={generationSet.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Enter set name"
                      className={`bg-slate-800 border-slate-600 text-white ${
                        getFieldValidation('name').hasError ? 'border-red-500' : ''
                      }`}
                      data-testid="input-set-name"
                      aria-invalid={getFieldValidation('name').hasError}
                      aria-describedby={getFieldValidation('name').hasError ? 'set-name-error' : undefined}
                    />
                    <div id="set-name-error" role="alert">
                      {renderFieldValidation('name')}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="set-description" className="text-white">
                      Description (Optional)
                    </Label>
                    <Textarea
                      id="set-description"
                      value={generationSet.description || ''}
                      onChange={(e) => handleDescriptionChange(e.target.value)}
                      placeholder="Enter optional description"
                      className="bg-slate-800 border-slate-600 text-white"
                      rows={2}
                      data-testid="textarea-set-description"
                      aria-describedby="set-description-help"
                    />
                    <div id="set-description-help" className="sr-only">
                      Optional description for this generation set
                    </div>
                  </div>
                </div>
              </div>


            <Separator className="bg-slate-700" />

            {/* Note: Shape Types Selection is managed in the sidebar Generation Sets dropdown */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-medium text-blue-200">Shape Types Configuration</h4>
              </div>
              <p className="text-xs text-slate-400">
                Shape types are configured in the sidebar Generation Sets dropdown and combined with the advanced settings below. 
                This dialog manages only the advanced generation settings that apply to the captured shape types.
              </p>
            </div>

            {!globalZIndexEnabled && (
              <>
                <Separator className="bg-slate-700" />

                {/* Z-Index Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2" data-testid="section-zindex-layering">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <h4 className="text-sm font-medium text-white" data-testid="heading-zindex-layering">Z-Index Layering</h4>
                    <Info className="w-3 h-3 text-slate-500" data-testid="icon-zindex-info" />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label className="text-white text-xs">
                        Base Offset: {generationSet.zIndexConfig.baseOffset}
                      </Label>
                      <Slider
                        value={[generationSet.zIndexConfig.baseOffset]}
                        onValueChange={([value]) => handleZIndexConfigChange('baseOffset', value)}
                        min={0}
                        max={10000}
                        step={100}
                        className="mt-2"
                        data-testid="slider-zindex-base-offset"
                        aria-label="Base Z-index offset"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Starting z-index for shapes in this set
                      </p>
                    </div>

                    <div>
                      <Label className="text-white text-xs">
                        Increment Per Shape: {generationSet.zIndexConfig.incrementPerShape}
                      </Label>
                      <Slider
                        value={[generationSet.zIndexConfig.incrementPerShape]}
                        onValueChange={([value]) => handleZIndexConfigChange('incrementPerShape', value)}
                        min={1}
                        max={100}
                        step={1}
                        className="mt-2"
                        data-testid="slider-zindex-increment-per-shape"
                        aria-label="Z-index increment per shape"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Z-index increment between shapes in this set
                      </p>
                    </div>

                    <div>
                      <Label className="text-white text-xs">
                        Increment Per Generation: {generationSet.zIndexConfig.incrementPerGeneration}
                      </Label>
                      <Slider
                        value={[generationSet.zIndexConfig.incrementPerGeneration]}
                        onValueChange={([value]) => handleZIndexConfigChange('incrementPerGeneration', value)}
                        min={0}
                        max={1000}
                        step={10}
                        className="mt-2"
                        data-testid="slider-zindex-increment-per-generation"
                        aria-label="Z-index increment per generation"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Z-index increment between batch generations
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {globalZIndexEnabled && (
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700" data-testid="alert-global-zindex-enabled">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-400" data-testid="icon-global-zindex-info" />
                  <span className="text-sm font-medium text-white" data-testid="text-global-zindex-title">Global Z-Index Enabled</span>
                </div>
                <p className="text-xs text-slate-500" data-testid="text-global-zindex-description">
                  Z-index settings are controlled globally. Individual set z-index configuration is disabled.
                </p>
              </div>
            )}

            <Separator className="bg-slate-700" />

            {/* Set Opacity & Visibility Controls */}
            <div className="space-y-4">
              <div className="flex items-center gap-2" data-testid="section-set-visibility">
                <Eye className="w-4 h-4 text-slate-400" />
                <h4 className="text-sm font-medium text-white" data-testid="heading-set-visibility">Set Visibility & Opacity</h4>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Visibility Toggle */}
                <div className="flex items-center justify-between">
                  <Label className="text-white text-sm">Visible</Label>
                  <div className="flex items-center space-x-2">
                    {generationSet.setVisibility.visible ? (
                      <Eye className="w-4 h-4 text-blue-400" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-slate-500" />
                    )}
                    <Checkbox
                      checked={generationSet.setVisibility.visible}
                      onCheckedChange={(checked) => 
                        onUpdate({
                          setVisibility: {
                            ...generationSet.setVisibility,
                            visible: checked as boolean
                          }
                        })
                      }
                      className="border-slate-600 data-[state=checked]:bg-blue-600"
                      data-testid="checkbox-set-visible"
                    />
                  </div>
                </div>

                {/* Opacity Control */}
                <div>
                  <Label className="text-white text-xs">
                    Opacity: {Math.round(generationSet.setVisibility.opacity * 100)}%
                  </Label>
                  <Slider
                    value={[generationSet.setVisibility.opacity]}
                    onValueChange={([value]) => 
                      onUpdate({
                        setVisibility: {
                          ...generationSet.setVisibility,
                          opacity: value
                        }
                      })
                    }
                    min={0}
                    max={1}
                    step={0.01}
                    className="mt-2"
                    data-testid="slider-set-opacity"
                    aria-label="Set opacity"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Overall opacity applied to all shapes in this set
                  </p>
                </div>

                {/* Opacity Variance */}
                <div>
                  <Label className="text-white text-xs">
                    Opacity Variance: {Math.round(generationSet.setVisibility.opacityVariance * 100)}%
                  </Label>
                  <Slider
                    value={[generationSet.setVisibility.opacityVariance]}
                    onValueChange={([value]) => 
                      onUpdate({
                        setVisibility: {
                          ...generationSet.setVisibility,
                          opacityVariance: value
                        }
                      })
                    }
                    min={0}
                    max={1}
                    step={0.01}
                    className="mt-2"
                    data-testid="slider-set-opacity-variance"
                    aria-label="Set opacity variance"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Random variation in opacity across shapes in this set
                  </p>
                </div>
              </div>
            </div>

            <Separator className="bg-slate-700" />

            {/* Advanced Configuration Sections */}
            <Accordion type="multiple" className="space-y-2" defaultValue={["compositing", "transforms", "artboard"]}>
              {/* Compositing & Blend Modes Controls */}
              <AccordionItem value="compositing" className="border-slate-700">
                <AccordionTrigger className="text-slate-200 hover:text-white hover:no-underline py-3" data-testid="trigger-compositing-blend">
                  <div className="flex items-center gap-2">
                    <Blend className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium">Compositing & Blend Modes</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="grid grid-cols-1 gap-4 pt-2">
                    {/* Set Blend Mode */}
                <div>
                  <Label className="text-white text-xs">Set Blend Mode</Label>
                  <Select
                    value={generationSet.setBlendMode}
                    onValueChange={(value: BlendMode) => 
                      onUpdate({ setBlendMode: value })
                    }
                    data-testid="select-set-blend-mode"
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 max-h-48">
                      {BLEND_MODES.map((mode) => (
                        <SelectItem key={mode} value={mode} className="text-white hover:bg-slate-600">
                          <div className="flex flex-col">
                            <span className="capitalize">{mode.replace('-', ' ')}</span>
                            <span className="text-xs text-slate-400">
                              {mode === 'source-over' && 'Default - normal blending'}
                              {mode === 'multiply' && 'Darkens by multiplying colors'}
                              {mode === 'screen' && 'Lightens by inverting and multiplying'}
                              {mode === 'overlay' && 'Combines multiply and screen'}
                              {mode === 'difference' && 'Subtracts colors for contrast'}
                              {mode === 'exclusion' && 'Similar to difference but softer'}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    Blend mode applied to the entire generation set
                  </p>
                </div>

                {/* Compositing Operation */}
                <div>
                  <Label className="text-white text-xs">Compositing Operation</Label>
                  <Select
                    value={generationSet.compositingOperation}
                    onValueChange={(value: CompositingOperation) => 
                      onUpdate({ compositingOperation: value })
                    }
                    data-testid="select-compositing-operation"
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 max-h-48">
                      <SelectItem value="source-over" className="text-white hover:bg-slate-600">
                        <div className="flex flex-col">
                          <span>Source Over</span>
                          <span className="text-xs text-slate-400">Draw new on top (default)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="source-in" className="text-white hover:bg-slate-600">
                        <div className="flex flex-col">
                          <span>Source In</span>
                          <span className="text-xs text-slate-400">Keep new where it overlaps existing</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="source-out" className="text-white hover:bg-slate-600">
                        <div className="flex flex-col">
                          <span>Source Out</span>
                          <span className="text-xs text-slate-400">Keep new where it doesn't overlap</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="destination-in" className="text-white hover:bg-slate-600">
                        <div className="flex flex-col">
                          <span>Destination In</span>
                          <span className="text-xs text-slate-400">Keep existing where new overlaps</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="destination-out" className="text-white hover:bg-slate-600">
                        <div className="flex flex-col">
                          <span>Destination Out</span>
                          <span className="text-xs text-slate-400">Remove existing where new overlaps</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="xor" className="text-white hover:bg-slate-600">
                        <div className="flex flex-col">
                          <span>XOR</span>
                          <span className="text-xs text-slate-400">Keep where they don't overlap</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                    <p className="text-xs text-slate-500 mt-1">
                      Advanced compositing for masking and special effects
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Set Positioning & Transforms Controls */}
              <AccordionItem value="transforms" className="border-slate-700">
                <AccordionTrigger className="text-slate-200 hover:text-white hover:no-underline py-3" data-testid="trigger-set-transform">
                  <div className="flex items-center gap-2">
                    <Move className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium">Set Positioning & Transforms</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="grid grid-cols-2 gap-4 pt-2">
                {/* Position Controls */}
                <div className="space-y-3">
                  <Label className="text-white text-xs">Position</Label>
                  
                  {/* X Position */}
                  <div>
                    <Label className="text-white text-xs">
                      X: {generationSet.setTransform.x}px
                    </Label>
                    <Slider
                      value={[generationSet.setTransform.x]}
                      onValueChange={([value]) => 
                        onUpdate({
                          setTransform: {
                            ...generationSet.setTransform,
                            x: value
                          }
                        })
                      }
                      min={-1000}
                      max={1000}
                      step={1}
                      className="mt-1"
                      data-testid="slider-set-transform-x"
                      aria-label="Set X position"
                    />
                  </div>

                  {/* Y Position */}
                  <div>
                    <Label className="text-white text-xs">
                      Y: {generationSet.setTransform.y}px
                    </Label>
                    <Slider
                      value={[generationSet.setTransform.y]}
                      onValueChange={([value]) => 
                        onUpdate({
                          setTransform: {
                            ...generationSet.setTransform,
                            y: value
                          }
                        })
                      }
                      min={-1000}
                      max={1000}
                      step={1}
                      className="mt-1"
                      data-testid="slider-set-transform-y"
                      aria-label="Set Y position"
                    />
                  </div>
                </div>

                {/* Transform Controls */}
                <div className="space-y-3">
                  <Label className="text-white text-xs">Transform</Label>
                  
                  {/* Rotation */}
                  <div>
                    <Label className="text-white text-xs">
                      Rotation: {generationSet.setTransform.rotation}°
                    </Label>
                    <Slider
                      value={[generationSet.setTransform.rotation]}
                      onValueChange={([value]) => 
                        onUpdate({
                          setTransform: {
                            ...generationSet.setTransform,
                            rotation: value
                          }
                        })
                      }
                      min={-180}
                      max={180}
                      step={1}
                      className="mt-1"
                      data-testid="slider-set-transform-rotation"
                      aria-label="Set rotation"
                    />
                  </div>

                  {/* Scale Controls */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-white text-xs">
                        Scale X: {Math.round(generationSet.setTransform.scaleX * 100)}%
                      </Label>
                      <Slider
                        value={[generationSet.setTransform.scaleX]}
                        onValueChange={([value]) => 
                          onUpdate({
                            setTransform: {
                              ...generationSet.setTransform,
                              scaleX: value
                            }
                          })
                        }
                        min={0.1}
                        max={3.0}
                        step={0.01}
                        className="mt-1"
                        data-testid="slider-set-transform-scale-x"
                        aria-label="Set scale X"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-white text-xs">
                        Scale Y: {Math.round(generationSet.setTransform.scaleY * 100)}%
                      </Label>
                      <Slider
                        value={[generationSet.setTransform.scaleY]}
                        onValueChange={([value]) => 
                          onUpdate({
                            setTransform: {
                              ...generationSet.setTransform,
                              scaleY: value
                            }
                          })
                        }
                        min={0.1}
                        max={3.0}
                        step={0.01}
                        className="mt-1"
                        data-testid="slider-set-transform-scale-y"
                        aria-label="Set scale Y"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Transform Origin */}
              <div>
                <Label className="text-white text-xs">Transform Origin</Label>
                <Select
                  value={generationSet.setTransform.transformOrigin}
                  onValueChange={(value) => 
                    onUpdate({
                      setTransform: {
                        ...generationSet.setTransform,
                        transformOrigin: value as 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
                      }
                    })
                  }
                  data-testid="select-transform-origin"
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="center" className="text-white hover:bg-slate-600">Center</SelectItem>
                    <SelectItem value="top-left" className="text-white hover:bg-slate-600">Top Left</SelectItem>
                    <SelectItem value="top-right" className="text-white hover:bg-slate-600">Top Right</SelectItem>
                    <SelectItem value="bottom-left" className="text-white hover:bg-slate-600">Bottom Left</SelectItem>
                    <SelectItem value="bottom-right" className="text-white hover:bg-slate-600">Bottom Right</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  Point around which rotation and scaling occurs
                </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Artboard & Alignment Controls */}
            <AccordionItem value="artboard" className="border-slate-700">
              <AccordionTrigger className="text-slate-200 hover:text-white hover:no-underline py-3" data-testid="trigger-artboard-alignment">
                <div className="flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium">Artboard & Alignment</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid grid-cols-1 gap-4 pt-2">
                {/* Fit to Artboard */}
                <div className="flex items-center justify-between">
                  <Label className="text-white text-sm">Fit to Artboard</Label>
                  <Checkbox
                    checked={generationSet.artboardAlignment.fitToArtboard}
                    onCheckedChange={(checked) => 
                      onUpdate({
                        artboardAlignment: {
                          ...generationSet.artboardAlignment,
                          fitToArtboard: checked as boolean
                        }
                      })
                    }
                    className="border-slate-600 data-[state=checked]:bg-blue-600"
                    data-testid="checkbox-fit-to-artboard"
                  />
                </div>

                {generationSet.artboardAlignment.fitToArtboard && (
                  <div className="bg-blue-900/20 border border-blue-700 p-3 rounded-lg">
                    <p className="text-xs text-blue-300">
                      Shapes will be automatically scaled and positioned to fit within artboard bounds
                    </p>
                  </div>
                )}

                {/* Align To */}
                <div>
                  <Label className="text-white text-xs">Align To</Label>
                  <Select
                    value={generationSet.artboardAlignment.alignTo}
                    onValueChange={(value: 'artboard' | 'set' | 'none') => 
                      onUpdate({
                        artboardAlignment: {
                          ...generationSet.artboardAlignment,
                          alignTo: value,
                          ...(value !== 'set' && { targetSetId: undefined })
                        }
                      })
                    }
                    data-testid="select-align-to"
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="none" className="text-white hover:bg-slate-600">None</SelectItem>
                      <SelectItem value="artboard" className="text-white hover:bg-slate-600">Artboard</SelectItem>
                      <SelectItem value="set" className="text-white hover:bg-slate-600">Another Set</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Set Selection (when aligning to another set) */}
                {generationSet.artboardAlignment.alignTo === 'set' && (
                  <div>
                    <Label className="text-white text-xs">Target Set ID</Label>
                    <Input
                      value={generationSet.artboardAlignment.targetSetId || ''}
                      onChange={(e) => 
                        onUpdate({
                          artboardAlignment: {
                            ...generationSet.artboardAlignment,
                            targetSetId: e.target.value || undefined
                          }
                        })
                      }
                      placeholder="Enter target set ID"
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                      data-testid="input-target-set-id"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      ID of the generation set to align to
                    </p>
                  </div>
                )}

                {/* Alignment Type */}
                {generationSet.artboardAlignment.alignTo !== 'none' && (
                  <div>
                    <Label className="text-white text-xs">Alignment</Label>
                    <Select
                      value={generationSet.artboardAlignment.alignmentType}
                      onValueChange={(value) => 
                        onUpdate({
                          artboardAlignment: {
                            ...generationSet.artboardAlignment,
                            alignmentType: value as any
                          }
                        })
                      }
                      data-testid="select-alignment-type"
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="center" className="text-white hover:bg-slate-600">
                          <div className="flex items-center gap-2">
                            <AlignCenter className="w-3 h-3" />
                            <span>Center</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="top-left" className="text-white hover:bg-slate-600">Top Left</SelectItem>
                        <SelectItem value="top-center" className="text-white hover:bg-slate-600">Top Center</SelectItem>
                        <SelectItem value="top-right" className="text-white hover:bg-slate-600">Top Right</SelectItem>
                        <SelectItem value="center-left" className="text-white hover:bg-slate-600">Center Left</SelectItem>
                        <SelectItem value="center-right" className="text-white hover:bg-slate-600">Center Right</SelectItem>
                        <SelectItem value="bottom-left" className="text-white hover:bg-slate-600">Bottom Left</SelectItem>
                        <SelectItem value="bottom-center" className="text-white hover:bg-slate-600">Bottom Center</SelectItem>
                        <SelectItem value="bottom-right" className="text-white hover:bg-slate-600">Bottom Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Margin */}
                {generationSet.artboardAlignment.alignTo !== 'none' && (
                  <div>
                    <Label className="text-white text-xs">
                      Margin: {generationSet.artboardAlignment.margin}px
                    </Label>
                    <Slider
                      value={[generationSet.artboardAlignment.margin]}
                      onValueChange={([value]) => 
                        onUpdate({
                          artboardAlignment: {
                            ...generationSet.artboardAlignment,
                            margin: value
                          }
                        })
                      }
                      min={0}
                      max={100}
                      step={1}
                      className="mt-2"
                      data-testid="slider-alignment-margin"
                      aria-label="Alignment margin"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Distance from alignment target in pixels
                    </p>
                  </div>
                )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Separator className="bg-slate-700" />

            {/* Note: Shape-Specific Properties have been moved to the main generation UI */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-medium text-blue-200">Shape-Specific Properties</h4>
              </div>
              <p className="text-xs text-slate-400">
                Shape-specific properties (corner radius, point counts, etc.) are now configured in the main generation UI. 
                These settings are automatically captured and restored when working with generation sets.
              </p>
            </div>

            {/* Shape-Specific Properties - Hidden */}
            {false && generationSet.enabledShapeTypes.length > 0 && (
              <>
                <Separator className="bg-slate-700" />
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2" data-testid="section-shape-specific-properties">
                    <Settings className="w-4 h-4 text-slate-400" />
                    <h4 className="text-sm font-medium text-white" data-testid="heading-shape-specific-properties">Shape-Specific Properties</h4>
                  </div>

                  <Tabs 
                    defaultValue={generationSet.enabledShapeTypes.find(hasConfigurableProperties) || generationSet.enabledShapeTypes[0]} 
                    className="w-full" 
                    data-testid="tabs-shape-properties"
                  >
                    {/* Only show tabs if there are shape types with properties */}
                    {generationSet.enabledShapeTypes.filter(hasConfigurableProperties).length > 0 && (
                      <div className="mb-4">
                        <TabsList className="w-full bg-slate-800 flex flex-wrap justify-start gap-1 p-1 h-auto min-h-[40px]" data-testid="tabs-list-shape-properties">
                          {generationSet.enabledShapeTypes
                            .filter(hasConfigurableProperties)
                            .map((shapeType) => (
                            <TabsTrigger 
                              key={shapeType} 
                              value={shapeType} 
                              className="text-xs px-3 py-2 flex-shrink-0 data-[state=active]:!text-blue-500" 
                              data-testid={`tab-trigger-${shapeType}`}
                            >
                              {getShapeDisplayName(shapeType)}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </div>
                    )}

                    {/* Show message if no shape types have properties */}
                    {generationSet.enabledShapeTypes.filter(hasConfigurableProperties).length === 0 && (
                      <div className="text-center py-8 bg-slate-800 rounded-lg">
                        <p className="text-sm text-slate-400">
                          None of the selected shape types have configurable properties.
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Try selecting shapes like circles, polygons, stars, or rounded rectangles.
                        </p>
                      </div>
                    )}
                    
                    {generationSet.enabledShapeTypes.map((shapeType) => (
                      <TabsContent key={shapeType} value={shapeType} className="mt-4" data-testid={`tab-content-${shapeType}`}>
                        <div className="bg-slate-800 p-4 rounded-lg">
                          <h5 className="text-sm font-medium text-white mb-3">
                            {shapeType.replace('-', ' ')} Properties
                          </h5>
                          
                          {/* Render shape-specific controls based on shape type */}
                          {(shapeType === 'rounded-rectangle' || shapeType === 'rounded-square') && (
                            <div className="space-y-3">
                              <div>
                                <Label className="text-white text-xs">Corner Radius Mode</Label>
                                <Select
                                  value={generationSet.shapeSpecificProperties[shapeType]?.cornerRadiusMode || 'range'}
                                  onValueChange={(value) => 
                                    handleShapeSpecificPropertyChange(shapeType, 'cornerRadiusMode', value)
                                  }
                                >
                                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-700 border-slate-600 text-white">
                                    <SelectItem value="range">Range</SelectItem>
                                    <SelectItem value="fixed">Fixed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {generationSet.shapeSpecificProperties[shapeType]?.cornerRadiusMode === 'fixed' ? (
                                <div>
                                  <Label className="text-white text-xs">
                                    Corner Radius: {generationSet.shapeSpecificProperties[shapeType]?.cornerRadiusValue || 5}
                                  </Label>
                                  <Slider
                                    value={[generationSet.shapeSpecificProperties[shapeType]?.cornerRadiusValue || 5]}
                                    onValueChange={([value]) => 
                                      handleShapeSpecificPropertyChange(shapeType, 'cornerRadiusValue', value)
                                    }
                                    min={0}
                                    max={50}
                                    step={1}
                                    className="mt-2"
                                    data-testid={`slider-${shapeType}-segment-count-value`}
                                  />
                                </div>
                              ) : (
                                <div>
                                  <Label className="text-white text-xs">
                                    Corner Radius Range: {
                                      (generationSet.shapeSpecificProperties[shapeType]?.cornerRadiusRange || [0, 10])[0]
                                    } - {
                                      (generationSet.shapeSpecificProperties[shapeType]?.cornerRadiusRange || [0, 10])[1]
                                    }
                                  </Label>
                                  <Slider
                                    value={generationSet.shapeSpecificProperties[shapeType]?.cornerRadiusRange || [0, 10]}
                                    onValueChange={(value) => 
                                      handleShapeSpecificPropertyChange(shapeType, 'cornerRadiusRange', value)
                                    }
                                    min={0}
                                    max={50}
                                    step={1}
                                    className="mt-2"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {shapeType === 'polygon' && (
                            <StyledModeField
                              label="Point Count"
                              config={convertToModeConfig(shapeType, 'pointCount', 6, [3, 8])}
                              onChange={(config) => handleModeConfigChange(shapeType, 'pointCount', config)}
                              bounds={{ min: 3, max: 20 }}
                              step={1}
                            />
                          )}

                          {shapeType === 'star' && (
                            <div className="space-y-3">
                              <StyledModeField
                                label="Point Count"
                                config={convertToModeConfig(shapeType, 'pointCount', 5, [3, 8])}
                                onChange={(config) => handleModeConfigChange(shapeType, 'pointCount', config)}
                                bounds={{ min: 3, max: 20 }}
                                step={1}
                              />
                              
                              <StyledModeField
                                label="Inner Radius"
                                config={convertToModeConfig(shapeType, 'innerRadius', 0.5, [0.2, 0.8])}
                                onChange={(config) => handleModeConfigChange(shapeType, 'innerRadius', config)}
                                bounds={{ min: 0.1, max: 0.9 }}
                                step={0.1}
                              />
                            </div>
                          )}

                          {(shapeType === 'ring' || shapeType === 'spline-ring') && (
                            <StyledModeField
                              label="Inner Radius"
                              config={convertToModeConfig(shapeType, 'innerRadius', 0.5, [0.2, 0.8])}
                              onChange={(config) => handleModeConfigChange(shapeType, 'innerRadius', config)}
                              bounds={{ min: 0.1, max: 0.9 }}
                              step={0.1}
                            />
                          )}


                          {(shapeType === 'circle' || shapeType === 'ellipse') && (
                            <StyledModeField
                              label="Segment Count"
                              config={convertToModeConfig(shapeType, 'segmentCount', 24, [16, 32])}
                              onChange={(config) => handleModeConfigChange(shapeType, 'segmentCount', config)}
                              bounds={{ min: 8, max: 64 }}
                              step={4}
                            />
                          )}

                          {shapeType === 'line-vector' && (
                            <div className="space-y-3">
                              {/* Direction Controls */}
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-white text-xs">Direction Mode</Label>
                                  <Select
                                    value={generationSet.shapeSpecificProperties[shapeType]?.directionMode || 'range'}
                                    onValueChange={(value) => 
                                      handleShapeSpecificPropertyChange(shapeType, 'directionMode', value)
                                    }
                                  >
                                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="select-line-vector-direction-mode">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                                      <SelectItem value="range" data-testid="option-line-vector-direction-range">Range</SelectItem>
                                      <SelectItem value="fixed" data-testid="option-line-vector-direction-fixed">Fixed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {generationSet.shapeSpecificProperties[shapeType]?.directionMode === 'fixed' ? (
                                  <div>
                                    <Label className="text-white text-xs">
                                      Direction: {generationSet.shapeSpecificProperties[shapeType]?.directionValue || 0}°
                                    </Label>
                                    <Slider
                                      value={[generationSet.shapeSpecificProperties[shapeType]?.directionValue || 0]}
                                      onValueChange={([value]) => 
                                        handleShapeSpecificPropertyChange(shapeType, 'directionValue', value)
                                      }
                                      min={0}
                                      max={360}
                                      step={1}
                                      className="mt-2"
                                      data-testid="slider-line-vector-direction-value"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <Label className="text-white text-xs">
                                      Direction Range: {
                                        (generationSet.shapeSpecificProperties[shapeType]?.directionRange || [0, 360])[0]
                                      }° - {
                                        (generationSet.shapeSpecificProperties[shapeType]?.directionRange || [0, 360])[1]
                                      }°
                                    </Label>
                                    <Slider
                                      value={generationSet.shapeSpecificProperties[shapeType]?.directionRange || [0, 360]}
                                      onValueChange={(value) => 
                                        handleShapeSpecificPropertyChange(shapeType, 'directionRange', value)
                                      }
                                      min={0}
                                      max={360}
                                      step={1}
                                      className="mt-2"
                                      data-testid="slider-line-vector-direction-range"
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Length Controls */}
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-white text-xs">Length Mode</Label>
                                  <Select
                                    value={generationSet.shapeSpecificProperties[shapeType]?.lengthMode || 'range'}
                                    onValueChange={(value) => 
                                      handleShapeSpecificPropertyChange(shapeType, 'lengthMode', value)
                                    }
                                  >
                                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="select-line-vector-length-mode">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                                      <SelectItem value="range" data-testid="option-line-vector-length-range">Range</SelectItem>
                                      <SelectItem value="fixed" data-testid="option-line-vector-length-fixed">Fixed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {generationSet.shapeSpecificProperties[shapeType]?.lengthMode === 'fixed' ? (
                                  <div>
                                    <Label className="text-white text-xs">
                                      Length: {generationSet.shapeSpecificProperties[shapeType]?.lengthValue || 100}
                                    </Label>
                                    <Slider
                                      value={[generationSet.shapeSpecificProperties[shapeType]?.lengthValue || 100]}
                                      onValueChange={([value]) => 
                                        handleShapeSpecificPropertyChange(shapeType, 'lengthValue', value)
                                      }
                                      min={5}
                                      max={500}
                                      step={1}
                                      className="mt-2"
                                      data-testid="slider-line-vector-length-value"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <Label className="text-white text-xs">
                                      Length Range: {
                                        (generationSet.shapeSpecificProperties[shapeType]?.lengthRange || [50, 150])[0]
                                      } - {
                                        (generationSet.shapeSpecificProperties[shapeType]?.lengthRange || [50, 150])[1]
                                      }
                                    </Label>
                                    <Slider
                                      value={generationSet.shapeSpecificProperties[shapeType]?.lengthRange || [50, 150]}
                                      onValueChange={(value) => 
                                        handleShapeSpecificPropertyChange(shapeType, 'lengthRange', value)
                                      }
                                      min={5}
                                      max={500}
                                      step={1}
                                      className="mt-2"
                                      data-testid="slider-line-vector-length-range"
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Centroid Controls */}
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-white text-xs">Centroid Mode</Label>
                                  <Select
                                    value={generationSet.shapeSpecificProperties[shapeType]?.centroidMode || 'fixed'}
                                    onValueChange={(value) => 
                                      handleShapeSpecificPropertyChange(shapeType, 'centroidMode', value)
                                    }
                                  >
                                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="select-line-vector-centroid-mode">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                                      <SelectItem value="range" data-testid="option-line-vector-centroid-range">Range</SelectItem>
                                      <SelectItem value="fixed" data-testid="option-line-vector-centroid-fixed">Fixed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {generationSet.shapeSpecificProperties[shapeType]?.centroidMode === 'fixed' ? (
                                  <div>
                                    <Label className="text-white text-xs">
                                      Centroid: {(generationSet.shapeSpecificProperties[shapeType]?.centroidValue || 0.5).toFixed(2)}
                                    </Label>
                                    <Slider
                                      value={[generationSet.shapeSpecificProperties[shapeType]?.centroidValue || 0.5]}
                                      onValueChange={([value]) => 
                                        handleShapeSpecificPropertyChange(shapeType, 'centroidValue', value)
                                      }
                                      min={0}
                                      max={1}
                                      step={0.01}
                                      className="mt-2"
                                      data-testid="slider-line-vector-centroid-value"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <Label className="text-white text-xs">
                                      Centroid Range: {
                                        (generationSet.shapeSpecificProperties[shapeType]?.centroidRange || [0, 1])[0].toFixed(2)
                                      } - {
                                        (generationSet.shapeSpecificProperties[shapeType]?.centroidRange || [0, 1])[1].toFixed(2)
                                      }
                                    </Label>
                                    <Slider
                                      value={generationSet.shapeSpecificProperties[shapeType]?.centroidRange || [0, 1]}
                                      onValueChange={(value) => 
                                        handleShapeSpecificPropertyChange(shapeType, 'centroidRange', value)
                                      }
                                      min={0}
                                      max={1}
                                      step={0.01}
                                      className="mt-2"
                                      data-testid="slider-line-vector-centroid-range"
                                    />
                                  </div>
                                )}
                              </div>
                              
                              {/* Stroke Cap Probabilities */}
                              <div className="space-y-3">
                                <Label className="text-white text-xs">Stroke Cap Probabilities (%)</Label>
                                <div className="space-y-2">
                                  {(['round', 'square', 'butt'] as const).map((cap) => {
                                    const strokeCaps = generationSet.shapeSpecificProperties[shapeType]?.strokeCapProbabilities ?? { round: 33, square: 33, butt: 34 };
                                    const currentValue = strokeCaps[cap] ?? 33;
                                    return (
                                      <div key={cap} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                          <Label className="text-white capitalize">{cap}</Label>
                                          <span className="text-slate-400">{currentValue}%</span>
                                        </div>
                                        <Slider
                                          value={[currentValue]}
                                          onValueChange={([value]) => {
                                            const currentCaps = generationSet.shapeSpecificProperties[shapeType]?.strokeCapProbabilities ?? { round: 33, square: 33, butt: 34 };
                                            const updatedCaps = {
                                              ...currentCaps,
                                              [cap]: value
                                            };
                                            handleShapeSpecificPropertyChange(shapeType, 'strokeCapProbabilities', updatedCaps);
                                          }}
                                          min={0}
                                          max={100}
                                          step={1}
                                          className="mt-1"
                                          data-testid={`slider-line-vector-${cap}-cap`}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Point Count Controls for Line/Curve shapes */}
                          {(shapeType === 'line' || shapeType === 'bezier' || shapeType === 'cubic' || shapeType === 'smooth-spline') && (
                            <StyledModeField
                              label="Point Count"
                              config={convertToModeConfig(shapeType, 'pointCount', 4, [2, 8])}
                              onChange={(config) => handleModeConfigChange(shapeType, 'pointCount', config)}
                              bounds={{ min: 2, max: 20 }}
                              step={1}
                            />
                          )}


                          {/* Default message for shapes without specific properties */}
                          {!['rounded-rectangle', 'rounded-square', 'polygon', 'star', 'ring', 'spline-ring', 'circle', 'ellipse', 'line-vector', 'line', 'bezier', 'cubic', 'smooth-spline'].includes(shapeType) && (
                            <div className="text-center py-4">
                              <p className="text-sm text-slate-500">
                                No specific properties available for {shapeType.replace('-', ' ')}
                              </p>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              </>
            )}

            {/* Validation Errors */}
            {showInlineValidation && currentValidation.errors.length > 0 && (
              <div className="bg-red-900/20 border border-red-700 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <X className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-red-400">Validation Errors</span>
                </div>
                <ul className="space-y-1">
                  {currentValidation.errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-300">
                      • {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
    </SafeSection>
  );
}