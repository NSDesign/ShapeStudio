import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Copy, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Settings,
  Eye,
  EyeOff,
  AlertTriangle,
  GripVertical,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { 
  GenerationSet, 
  ShapeCountMode, 
  SupportedShapeType,
  DEFAULT_GENERATION_SET_LIMITS,
  GenerationSetUtils,
  BatchConfigSettings
} from '@shared/schema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateUniqueSetName } from '@/utils/nameGeneration';
import { IndividualSetConfig } from '@/components/IndividualSetConfig';
import { 
  GenerationSetValidator,
  ValidationResult,
  ValidationError,
  ValidationWarning
} from '@/lib/typedHelpers';
import { ErrorBoundary, SafeSection } from '@/components/ErrorBoundary';
import { ScatterSettings, ShapeType } from '@/lib/shapeTypes';
import type { CurrentUIState } from '@/hooks/useGenerationSets';

interface GenerationSetsInterfaceProps {
  generationSets: GenerationSet[];
  onGenerationSetsChange: (sets: GenerationSet[]) => void;
  validationErrors?: string[];
  maxSets?: number;
  globalZIndexEnabled?: boolean;
  showInlineValidation?: boolean;
  onValidationChange?: (isValid: boolean, errors: ValidationError[], warnings: ValidationWarning[]) => void;
  // Bi-directional sync props
  currentSetId?: string | null;
  onCurrentSetChange?: (setId: string | null) => void;
  // Mismatch detection for export count
  batchExportCount?: number;
  // Current UI state for data capture
  currentUIState?: CurrentUIState;
  onCreateSetFromState?: (uiState: CurrentUIState, name?: string) => string;
}

export function GenerationSetsInterface({
  generationSets,
  onGenerationSetsChange,
  validationErrors = [],
  maxSets = DEFAULT_GENERATION_SET_LIMITS.maxGenerationSets,
  globalZIndexEnabled = false,
  showInlineValidation = true,
  onValidationChange,
  // Bi-directional sync props
  currentSetId,
  onCurrentSetChange,
  // Mismatch detection for export count
  batchExportCount,
  // Current UI state for data capture
  currentUIState,
  onCreateSetFromState
}: GenerationSetsInterfaceProps) {
  // Use external currentSetId if provided, otherwise fall back to internal state
  const [internalSelectedSetId, setInternalSelectedSetId] = useState<string | null>(null);
  const selectedSetId = currentSetId !== undefined ? currentSetId : internalSelectedSetId;
  const setSelectedSetId = currentSetId !== undefined ? (setId: string | null) => {
    onCurrentSetChange?.(setId);
  } : setInternalSelectedSetId;
  const [draggedSetId, setDraggedSetId] = useState<string | null>(null);
  const [dragOverSetId, setDragOverSetId] = useState<string | null>(null);
  const [setValidations, setSetValidations] = useState<Record<string, ValidationResult>>({});

  // Comprehensive validation for all sets
  const overallValidation = useMemo(() => {
    return GenerationSetValidator.validateGenerationSets(generationSets);
  }, [generationSets]);

  // Calculate mismatch for export count banner - use enabled sets count
  const enabledSetsCount = generationSets.filter(set => set.enabled).length;
  // FIX: Don't compare enabled sets to total export images - only show warning when generation sets mode is actually enabled
  // TODO: This should compare to actual "Generation Sets per Export" value, not total batch export count
  const hasSetsCountMismatch = false; // Disable incorrect warning until proper logic is implemented

  // Update parent validation state when validation changes
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(overallValidation.isValid, overallValidation.errors, overallValidation.warnings);
    }
  }, [overallValidation, onValidationChange]);
  
  // Individual set validations
  useEffect(() => {
    if (!showInlineValidation) return;
    
    const newSetValidations: Record<string, ValidationResult> = {};
    generationSets.forEach(set => {
      newSetValidations[set.id] = GenerationSetValidator.validateGenerationSet(set);
    });
    setSetValidations(newSetValidations);
  }, [generationSets, showInlineValidation]);

  // Auto-select first set if none selected and sets exist
  useEffect(() => {
    if (!selectedSetId && generationSets.length > 0) {
      setSelectedSetId(generationSets[0].id);
    }
  }, [selectedSetId, generationSets]);

  // Add new generation set
  const handleAddSet = useCallback(() => {
    if (generationSets.length >= maxSets) {
      return;
    }

    // Use the generateUniqueSetName utility for consistent naming
    const existingNames = generationSets.map(set => set.name);
    const uniqueName = generateUniqueSetName(existingNames, 'Set');
    
    // If we have current UI state and a creation handler, use real data
    if (currentUIState && onCreateSetFromState) {
      const newSetId = onCreateSetFromState(currentUIState, uniqueName);
      setSelectedSetId(newSetId);
      return;
    }
    
    // Fallback to default creation (for backwards compatibility)
    const newId = `generation_set_${Date.now()}`;
    const newSet = GenerationSetUtils.createDefault(
      newId,
      uniqueName
    );
    
    // Set generation order
    newSet.generationOrder = generationSets.length;
    
    const updatedSets = [...generationSets, newSet];
    onGenerationSetsChange(updatedSets);
    setSelectedSetId(newId);
  }, [generationSets, maxSets, onGenerationSetsChange, currentUIState, onCreateSetFromState]);

  // Duplicate generation set
  const handleDuplicateSet = useCallback((setId: string) => {
    if (generationSets.length >= maxSets) {
      return;
    }

    const setToDuplicate = generationSets.find(set => set.id === setId);
    if (!setToDuplicate) return;

    const newId = `generation_set_${Date.now()}`;
    const duplicatedSet: GenerationSet = {
      ...setToDuplicate,
      id: newId,
      name: `${setToDuplicate.name} (Copy)`,
      generationOrder: generationSets.length
    };

    const updatedSets = [...generationSets, duplicatedSet];
    onGenerationSetsChange(updatedSets);
    setSelectedSetId(newId);
  }, [generationSets, maxSets, onGenerationSetsChange]);

  // Delete generation set
  const handleDeleteSet = useCallback((setId: string) => {
    // Allow deletion of final set to support 0-set state
    // if (generationSets.length <= 1) {
    //   return; // Prevent deleting the last set
    // }

    const updatedSets = generationSets
      .filter(set => set.id !== setId)
      .map((set, index) => ({
        ...set,
        generationOrder: index
      }));

    onGenerationSetsChange(updatedSets);

    // Update selection if deleted set was selected
    if (selectedSetId === setId) {
      setSelectedSetId(updatedSets.length > 0 ? updatedSets[0].id : null);
    }
  }, [generationSets, onGenerationSetsChange, selectedSetId]);

  // Update specific generation set
  const handleUpdateSet = useCallback((setId: string, updates: Partial<GenerationSet>) => {
    const updatedSets = generationSets.map(set =>
      set.id === setId ? { ...set, ...updates } : set
    );
    onGenerationSetsChange(updatedSets);
  }, [generationSets, onGenerationSetsChange]);

  // Toggle set enabled state
  const handleToggleSetEnabled = useCallback((setId: string) => {
    handleUpdateSet(setId, { 
      enabled: !generationSets.find(set => set.id === setId)?.enabled 
    });
  }, [generationSets, handleUpdateSet]);

  // Move set up/down in order
  const handleMoveSet = useCallback((setId: string, direction: 'up' | 'down') => {
    const currentIndex = generationSets.findIndex(set => set.id === setId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= generationSets.length) return;

    const updatedSets = [...generationSets];
    [updatedSets[currentIndex], updatedSets[newIndex]] = 
    [updatedSets[newIndex], updatedSets[currentIndex]];

    // Update generation orders
    updatedSets.forEach((set, index) => {
      set.generationOrder = index;
    });

    onGenerationSetsChange(updatedSets);
  }, [generationSets, onGenerationSetsChange]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, setId: string) => {
    setDraggedSetId(setId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, setId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSetId(setId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedSetId(null);
    setDragOverSetId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetSetId: string) => {
    e.preventDefault();
    
    if (!draggedSetId || draggedSetId === targetSetId) return;

    const draggedIndex = generationSets.findIndex(set => set.id === draggedSetId);
    const targetIndex = generationSets.findIndex(set => set.id === targetSetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const updatedSets = [...generationSets];
    const draggedSet = updatedSets.splice(draggedIndex, 1)[0];
    updatedSets.splice(targetIndex, 0, draggedSet);

    // Update generation orders
    updatedSets.forEach((set, index) => {
      set.generationOrder = index;
    });

    onGenerationSetsChange(updatedSets);
    setDraggedSetId(null);
    setDragOverSetId(null);
  }, [draggedSetId, generationSets, onGenerationSetsChange]);

  // Calculate total shape count across all enabled sets
  const totalShapeCount = generationSets
    .filter(set => set.enabled)
    .reduce((total, set) => {
      const count = set.shapeCountMode === ShapeCountMode.FIXED 
        ? set.shapeCountFixed 
        : Math.floor((set.shapeCountRange[0] + set.shapeCountRange[1]) / 2);
      return total + count;
    }, 0);
    
  // Get validation state for a specific set
  const getSetValidation = useCallback((setId: string) => {
    return setValidations[setId] || { isValid: true, errors: [], warnings: [] };
  }, [setValidations]);
  
  // Render set validation indicator
  const renderSetValidationIndicator = useCallback((setId: string) => {
    if (!showInlineValidation) return null;
    
    const validation = getSetValidation(setId);
    
    if (validation.errors.length > 0) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle 
                className="w-4 h-4 text-red-400 cursor-help" 
                data-testid={`validation-error-indicator-${setId}`}
              />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-1">
                <p className="font-medium text-red-400">Errors:</p>
                {validation.errors.map((error, index) => (
                  <p key={index} className="text-xs">{error.message}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    if (validation.warnings.length > 0) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircle 
                className="w-4 h-4 text-yellow-400 cursor-help"
                data-testid={`validation-warning-indicator-${setId}`}
              />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-1">
                <p className="font-medium text-yellow-400">Warnings:</p>
                {validation.warnings.map((warning, index) => (
                  <p key={index} className="text-xs">{warning.message}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    return (
      <CheckCircle 
        className="w-4 h-4 text-green-400"
        data-testid={`validation-success-indicator-${setId}`}
      />
    );
  }, [showInlineValidation, getSetValidation]);

  const selectedSet = generationSets.find(set => set.id === selectedSetId);

  return (
    <ErrorBoundary
      resetKeys={[generationSets.length, selectedSetId]}
      onError={(error, errorInfo) => {
        console.error('GenerationSetsInterface error:', error, errorInfo);
      }}
    >
      <div className="space-y-2" data-testid="generation-sets-interface">
      {/* Header with summary */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-200" data-testid="heading-generation-sets">Generation Sets</h3>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span data-testid="text-sets-count">{generationSets.length} sets</span>
            <Separator orientation="vertical" className="h-4" />
            <span data-testid="text-enabled-count">{generationSets.filter(set => set.enabled).length} enabled</span>
            <Separator orientation="vertical" className="h-4" />
            <span data-testid="text-total-shapes">~{totalShapeCount} shapes total</span>
          </div>
        </div>
        
        <Button
          onClick={handleAddSet}
          disabled={generationSets.length >= maxSets}
          size="sm"
          data-testid="button-add-generation-set"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Set
        </Button>
      </div>

        {/* Overall validation summary */}
        {showInlineValidation && !overallValidation.isValid && (
          <Alert variant="destructive" data-testid="alert-overall-validation-errors">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Generation Sets Issues:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {overallValidation.errors.map((error, index) => (
                    <li key={`error-${index}`}>{error.message}</li>
                  ))}
                </ul>
                {overallValidation.warnings.length > 0 && (
                  <>
                    <p className="font-medium text-yellow-400 mt-2">Warnings:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-yellow-400">
                      {overallValidation.warnings.map((warning, index) => (
                        <li key={`warning-${index}`}>{warning.message}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Legacy validation errors for backward compatibility */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive" data-testid="alert-legacy-validation-errors">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Mismatch notification banner */}
        {hasSetsCountMismatch && (
          <Alert className="border-yellow-500 bg-yellow-900/20" data-testid="alert-sets-count-mismatch">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-300">
              <strong>Generation Sets Mismatch:</strong> You have {enabledSetsCount} enabled generation set{enabledSetsCount !== 1 ? 's' : ''} but need {batchExportCount} for export. Configure the mismatch sets strategy below.
            </AlertDescription>
          </Alert>
        )}

        {/* Mismatch Sets Configuration */}
        {hasSetsCountMismatch && (
          <Card className="bg-slate-800 border-slate-700" data-testid="card-mismatch-sets-strategy">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-slate-200">
                    Mismatch Sets
                  </Label>
                  <p className="text-xs text-slate-400">
                    How to handle exports when fewer sets than batch count
                  </p>
                </div>
                <div className="w-32">
                  <Select 
                    value="hold" 
                    onValueChange={(value) => {
                      // TODO: Implement mismatch sets strategy change
                      console.log('Mismatch sets strategy changed:', value);
                    }}
                    data-testid="select-mismatch-sets-strategy"
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600" style={{ zIndex: 10002 }}>
                      <SelectItem value="cycle" className="text-white hover:bg-slate-600">
                        <div className="flex flex-col">
                          <span>Cycle</span>
                          <span className="text-xs text-slate-400">Repeat through all sets</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="hold" className="text-white hover:bg-slate-600">
                        <div className="flex flex-col">
                          <span>Hold</span>
                          <span className="text-xs text-slate-400">Repeat last set only</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="random" className="text-white hover:bg-slate-600">
                        <div className="flex flex-col">
                          <span>Random</span>
                          <span className="text-xs text-slate-400">Pick sets randomly</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="stop" className="text-white hover:bg-slate-600">
                        <div className="flex flex-col">
                          <span>Stop</span>
                          <span className="text-xs text-slate-400">Generate only available sets</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Generation Sets List */}
        <div className="lg:col-span-2 space-y-2">
          <h4 className="text-sm font-medium text-slate-300 mb-2" data-testid="heading-sets-list">
            Generation Sets List ({generationSets.length}{batchExportCount !== undefined ? ` of ${batchExportCount}` : ''} set{generationSets.length !== 1 ? 's' : ''})
          </h4>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 pr-2">
              {generationSets.map((set, index) => (
                <Card 
                  key={set.id}
                  className={`cursor-pointer transition-all border-slate-700 ${
                    selectedSetId === set.id 
                      ? 'bg-slate-800 border-blue-600' 
                      : 'bg-slate-900 hover:bg-slate-800'
                  } ${
                    dragOverSetId === set.id ? 'border-blue-400' : ''
                  }`}
                  onClick={() => setSelectedSetId(set.id)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, set.id)}
                  onDragOver={(e) => handleDragOver(e, set.id)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, set.id)}
                  data-testid={`card-generation-set-${set.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <GripVertical className="w-4 h-4 text-slate-500" data-testid={`handle-drag-${set.id}`} />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSetEnabled(set.id);
                        }}
                        data-testid={`button-toggle-enabled-${set.id}`}
                        aria-label={set.enabled ? `Disable ${set.name}` : `Enable ${set.name}`}
                      >
                        {set.enabled ? (
                          <Eye className="w-3 h-3 text-green-400" data-testid={`icon-enabled-${set.id}`} />
                        ) : (
                          <EyeOff className="w-3 h-3 text-slate-500" data-testid={`icon-disabled-${set.id}`} />
                        )}
                      </Button>
                      <span className="text-xs text-slate-500" data-testid={`text-set-order-${set.id}`}>#{index + 1}</span>
                      {renderSetValidationIndicator(set.id)}
                    </div>

                    <h5 className="font-medium text-slate-200 mb-1 truncate" data-testid={`text-set-name-${set.id}`}>
                      {set.name}
                    </h5>

                    <div className="flex flex-wrap gap-1 mb-2" data-testid={`container-shape-types-${set.id}`}>
                      {/* Show each set's own stored shape types */}
                      {set.enabledShapeTypes.slice(0, 3).map(shapeType => (
                        <Badge 
                          key={shapeType} 
                          variant="secondary" 
                          className="text-xs"
                          data-testid={`badge-shape-type-${set.id}-${shapeType}`}
                        >
                          {shapeType}
                        </Badge>
                      ))}
                      
                      {set.enabledShapeTypes.length > 3 && (
                        <Badge variant="secondary" className="text-xs bg-slate-600 text-slate-200 border-slate-500" data-testid={`badge-more-shapes-${set.id}`}>
                          +{set.enabledShapeTypes.length - 3}
                        </Badge>
                      )}
                    </div>

                    {/* Generation Settings Summary - Show each set's unique stored settings */}
                    <div className="text-xs text-slate-500 mb-2 space-y-1" data-testid={`generation-settings-${set.id}`}>
                      {set.batchConfig?.distributionLayoutEnabled && (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                          <span>Layout: {set.batchConfig.distributionPattern}</span>
                        </div>
                      )}
                      {set.batchConfig?.colorHarmonyEnabled && (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                          <span>Colors: {set.batchConfig.harmonyType}</span>
                        </div>
                      )}
                      {set.batchConfig?.blendModeEnabled && (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                          <span>Blending: Enabled</span>
                        </div>
                      )}
                      {set.batchConfig?.shapePropertiesEnabled && (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          <span>Properties: Enabled</span>
                        </div>
                      )}
                      {set.batchConfig?.physicsEnabled && (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                          <span>Physics: {set.batchConfig.physicsType}</span>
                        </div>
                      )}
                      {set.batchConfig?.transformsEnabled && (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                          <span>Transforms: Enabled</span>
                        </div>
                      )}
                      {set.batchConfig?.noiseEnabled && (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                          <span>Noise: {set.batchConfig.noiseType}</span>
                        </div>
                      )}
                      {set.batchConfig?.filterEnabled && (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-pink-400 rounded-full"></span>
                          <span>Filters: Enabled</span>
                        </div>
                      )}
                      {/* Set-specific configuration indicator */}
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
                        <span>Count: {set.shapeCountMode === 'fixed' ? `${set.shapeCountFixed}` : `${set.shapeCountRange[0]}-${set.shapeCountRange[1]}`}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span data-testid={`text-shape-count-${set.id}`}>
                        {/* Show set's unique stored data */}
                        {set.enabledShapeTypes.length} shape type{set.enabledShapeTypes.length !== 1 ? 's' : ''}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSet(set.id, 'up');
                          }}
                          disabled={index === 0}
                          data-testid={`button-move-up-${set.id}`}
                          aria-label={`Move ${set.name} up`}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSet(set.id, 'down');
                          }}
                          disabled={index === generationSets.length - 1}
                          data-testid={`button-move-down-${set.id}`}
                          aria-label={`Move ${set.name} down`}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateSet(set.id);
                          }}
                          disabled={generationSets.length >= maxSets}
                          data-testid={`button-duplicate-${set.id}`}
                          aria-label={`Duplicate ${set.name}`}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSet(set.id);
                          }}
                          disabled={generationSets.length <= 1}
                          data-testid={`button-delete-${set.id}`}
                          aria-label={`Delete ${set.name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Individual Set Configuration */}
        <div className="lg:col-span-3">
          {selectedSet ? (
            <IndividualSetConfig
              generationSet={selectedSet}
              onUpdate={(updates: Partial<GenerationSet>) => handleUpdateSet(selectedSet.id, updates)}
              globalZIndexEnabled={globalZIndexEnabled}
            />
          ) : (
            <Card className="bg-slate-900 border-slate-700" data-testid="card-no-set-selected">
              <CardContent className="p-8 text-center">
                <Settings className="w-12 h-12 text-slate-500 mx-auto mb-4" data-testid="icon-no-selection" />
                <h3 className="text-lg font-medium text-slate-300 mb-2" data-testid="heading-no-selection">
                  No Generation Set Selected
                </h3>
                <p className="text-slate-500 mb-4" data-testid="text-no-selection-help">
                  Select a generation set from the list to configure its settings.
                </p>
                <Button 
                  onClick={handleAddSet} 
                  disabled={generationSets.length >= maxSets}
                  data-testid="button-create-first-set"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Set
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}