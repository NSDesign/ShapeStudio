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
  Palette, 
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
  AlertCircle
} from 'lucide-react';
import { 
  GenerationSet, 
  ShapeCountMode, 
  SupportedShapeType,
  DEFAULT_GENERATION_SET_LIMITS,
  SupportedShapeTypeSchema,
  BlendMode
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

const BLEND_MODES: BlendMode[] = [
  'source-over', 'multiply', 'screen', 'overlay', 'darken', 
  'lighten', 'color-dodge', 'color-burn', 'hard-light', 
  'soft-light', 'difference', 'exclusion'
];

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

            {/* Shape Count Configuration */}
            <div className="space-y-4">
              <div className="flex items-center gap-2" data-testid="section-shape-count">
                <Hash className="w-4 h-4 text-slate-400" />
                <h4 className="text-sm font-medium text-white" data-testid="heading-shape-count">Shape Count</h4>
              </div>

              <div className="space-y-3">
                <Select
                  value={generationSet.shapeCountMode}
                  onValueChange={(value) => handleShapeCountModeChange(value as ShapeCountMode)}
                >
                  <SelectTrigger 
                    className={`bg-slate-800 border-slate-600 text-white ${
                      getFieldValidation('shapeCountMode').hasError ? 'border-red-500' : ''
                    }`} 
                    data-testid="select-shape-count-mode"
                    aria-invalid={getFieldValidation('shapeCountMode').hasError}
                    aria-describedby={getFieldValidation('shapeCountMode').hasError ? 'shape-count-mode-error' : undefined}
                  >
                    <SelectValue placeholder="Select count mode" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 text-white">
                    <SelectItem value={ShapeCountMode.FIXED} data-testid="option-shape-count-fixed">Fixed Count</SelectItem>
                    <SelectItem value={ShapeCountMode.RANGE} data-testid="option-shape-count-range">Range</SelectItem>
                  </SelectContent>
                </Select>
                <div id="shape-count-mode-error" role="alert">
                  {renderFieldValidation('shapeCountMode')}
                </div>

                {generationSet.shapeCountMode === ShapeCountMode.FIXED ? (
                  <div>
                    <Label className="text-white text-xs">
                      Fixed Shape Count: {generationSet.shapeCountFixed}
                    </Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Slider
                        value={[generationSet.shapeCountFixed]}
                        onValueChange={([value]) => handleShapeCountFixedChange(safeParseNumber(value))}
                        min={DEFAULT_GENERATION_SET_LIMITS.minShapesPerSet}
                        max={DEFAULT_GENERATION_SET_LIMITS.maxShapesPerSet}
                        step={1}
                        className="flex-1"
                        data-testid="slider-shape-count-fixed"
                      />
                      <Input
                        type="number"
                        value={generationSet.shapeCountFixed}
                        onChange={(e) => handleShapeCountFixedChange(safeParseNumber(e.target.value))}
                        min={DEFAULT_GENERATION_SET_LIMITS.minShapesPerSet}
                        max={DEFAULT_GENERATION_SET_LIMITS.maxShapesPerSet}
                        className={`w-20 bg-slate-800 border-slate-600 text-white text-xs ${
                          getFieldValidation('shapeCountFixed').hasError ? 'border-red-500' : ''
                        }`}
                        data-testid="input-shape-count-fixed"
                        aria-invalid={getFieldValidation('shapeCountFixed').hasError}
                        aria-describedby={getFieldValidation('shapeCountFixed').hasError ? 'shape-count-fixed-error' : undefined}
                      />
                    </div>
                    <div id="shape-count-fixed-error" role="alert">
                      {renderFieldValidation('shapeCountFixed')}
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-white text-xs">
                      Shape Count Range: {generationSet.shapeCountRange[0]} - {generationSet.shapeCountRange[1]}
                    </Label>
                    <div className="space-y-2 mt-2">
                      <Slider
                        value={generationSet.shapeCountRange}
                        onValueChange={(value) => handleShapeCountRangeChange(value as [number, number])}
                        min={DEFAULT_GENERATION_SET_LIMITS.minShapesPerSet}
                        max={DEFAULT_GENERATION_SET_LIMITS.maxShapesPerSet}
                        step={1}
                        data-testid="slider-shape-count-range"
                      />
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Label className="text-xs text-slate-400">Min:</Label>
                          <Input
                            type="number"
                            value={generationSet.shapeCountRange[0]}
                            onChange={(e) => {
                              const newMin = safeParseNumber(e.target.value);
                              handleShapeCountRangeChange([newMin, generationSet.shapeCountRange[1]]);
                            }}
                            min={DEFAULT_GENERATION_SET_LIMITS.minShapesPerSet}
                            max={generationSet.shapeCountRange[1]}
                            className={`w-20 bg-slate-800 border-slate-600 text-white text-xs ${
                              getFieldValidation('shapeCountRange').hasError ? 'border-red-500' : ''
                            }`}
                            data-testid="input-shape-count-range-min"
                            aria-invalid={getFieldValidation('shapeCountRange').hasError}
                            aria-label="Minimum shape count"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Label className="text-xs text-slate-400">Max:</Label>
                          <Input
                            type="number"
                            value={generationSet.shapeCountRange[1]}
                            onChange={(e) => {
                              const newMax = safeParseNumber(e.target.value);
                              handleShapeCountRangeChange([generationSet.shapeCountRange[0], newMax]);
                            }}
                            min={generationSet.shapeCountRange[0]}
                            max={DEFAULT_GENERATION_SET_LIMITS.maxShapesPerSet}
                            className={`w-20 bg-slate-800 border-slate-600 text-white text-xs ${
                              getFieldValidation('shapeCountRange').hasError ? 'border-red-500' : ''
                            }`}
                            data-testid="input-shape-count-range-max"
                            aria-invalid={getFieldValidation('shapeCountRange').hasError}
                            aria-label="Maximum shape count"
                          />
                        </div>
                      </div>
                    </div>
                    <div id="shape-count-range-error" role="alert">
                      {renderFieldValidation('shapeCountRange')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator className="bg-slate-700" />

            {/* Shape Types Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 justify-between" data-testid="section-shape-types">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-slate-400" />
                  <h4 className="text-sm font-medium text-white" data-testid="heading-shape-types">Shape Types</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={generationSet.enabledShapeTypes.length === 0 ? "destructive" : "secondary"} 
                    className="text-xs text-blue-500"
                    data-testid="badge-selected-shapes-count"
                  >
                    {generationSet.enabledShapeTypes.length} selected
                  </Badge>
                  {getFieldValidation('enabledShapeTypes').hasError && (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>
              <div id="enabled-shape-types-error" role="alert">
                {renderFieldValidation('enabledShapeTypes')}
              </div>

              <Accordion type="multiple" className="w-full" data-testid="accordion-shape-categories">
                {Object.entries(SHAPE_CATEGORIES).map(([category, shapes]) => {
                  const enabledInCategory = shapes.filter(shape => 
                    generationSet.enabledShapeTypes.includes(shape)
                  ).length;
                  
                  return (
                    <AccordionItem key={category} value={category} className="border-slate-700" data-testid={`accordion-item-${category.toLowerCase().replace(/\s+/g, '-')}`}>
                      <AccordionTrigger className="text-white hover:text-slate-200" data-testid={`accordion-trigger-${category.toLowerCase().replace(/\s+/g, '-')}`}>
                        <div className="flex items-center gap-2">
                          <span>{category}</span>
                          <Badge variant="outline" className="text-xs text-blue-500" data-testid={`badge-category-count-${category.toLowerCase().replace(/\s+/g, '-')}`}>
                            {enabledInCategory}/{shapes.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectAllShapes(category)}
                            data-testid={`button-select-all-${category.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            Select All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeselectAllShapes(category)}
                            data-testid={`button-deselect-all-${category.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            Deselect All
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {shapes.map((shapeType) => (
                            <div 
                              key={shapeType}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`shape-${shapeType}`}
                                checked={generationSet.enabledShapeTypes.includes(shapeType)}
                                onCheckedChange={(checked) => 
                                  handleShapeTypeToggle(shapeType, checked as boolean)
                                }
                                data-testid={`checkbox-shape-${shapeType}`}
                                aria-describedby={`label-shape-${shapeType}`}
                              />
                              <Label 
                                id={`label-shape-${shapeType}`}
                                htmlFor={`shape-${shapeType}`}
                                className="text-sm text-white cursor-pointer"
                                data-testid={`label-shape-${shapeType}`}
                              >
                                {shapeType.replace('-', ' ')}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
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

            {/* Shape-Specific Properties */}
            {generationSet.enabledShapeTypes.length > 0 && (
              <>
                <Separator className="bg-slate-700" />
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2" data-testid="section-shape-specific-properties">
                    <Settings className="w-4 h-4 text-slate-400" />
                    <h4 className="text-sm font-medium text-white" data-testid="heading-shape-specific-properties">Shape-Specific Properties</h4>
                  </div>

                  <Tabs defaultValue={generationSet.enabledShapeTypes[0]} className="w-full" data-testid="tabs-shape-properties">
                    <TabsList 
                      className={`grid w-full bg-slate-800 ${
                        generationSet.enabledShapeTypes.length <= 3 ? 'grid-cols-3' :
                        generationSet.enabledShapeTypes.length <= 5 ? 'grid-cols-5' :
                        generationSet.enabledShapeTypes.length <= 8 ? 'grid-cols-4 lg:grid-cols-8' :
                        'grid-cols-3 lg:grid-cols-6'
                      }`}
                      data-testid="tabs-list-shape-properties"
                    >
                      {generationSet.enabledShapeTypes.map((shapeType) => (
                        <TabsTrigger key={shapeType} value={shapeType} className="text-xs" data-testid={`tab-trigger-${shapeType}`}>
                          {getShapeDisplayName(shapeType)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {generationSet.enabledShapeTypes.map((shapeType) => (
                      <TabsContent key={shapeType} value={shapeType} className="space-y-3" data-testid={`tab-content-${shapeType}`}>
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