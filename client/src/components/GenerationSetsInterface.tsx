import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  GenerationSetUtils
} from '@shared/schema';
import { IndividualSetConfig } from '@/components/IndividualSetConfig';
import { 
  GenerationSetValidator,
  ValidationResult,
  ValidationError,
  ValidationWarning
} from '@/lib/typedHelpers';
import { ErrorBoundary, SafeSection } from '@/components/ErrorBoundary';

interface GenerationSetsInterfaceProps {
  generationSets: GenerationSet[];
  onGenerationSetsChange: (sets: GenerationSet[]) => void;
  validationErrors?: string[];
  maxSets?: number;
  globalZIndexEnabled?: boolean;
  showInlineValidation?: boolean;
  onValidationChange?: (isValid: boolean, errors: ValidationError[], warnings: ValidationWarning[]) => void;
}

export function GenerationSetsInterface({
  generationSets,
  onGenerationSetsChange,
  validationErrors = [],
  maxSets = DEFAULT_GENERATION_SET_LIMITS.maxGenerationSets,
  globalZIndexEnabled = false,
  showInlineValidation = true,
  onValidationChange
}: GenerationSetsInterfaceProps) {
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [draggedSetId, setDraggedSetId] = useState<string | null>(null);
  const [dragOverSetId, setDragOverSetId] = useState<string | null>(null);
  const [setValidations, setSetValidations] = useState<Record<string, ValidationResult>>({});

  // Comprehensive validation for all sets
  const overallValidation = useMemo(() => {
    const validation = GenerationSetValidator.validateGenerationSets(generationSets);
    
    // Update parent validation state if callback provided
    if (onValidationChange) {
      onValidationChange(validation.isValid, validation.errors, validation.warnings);
    }
    
    return validation;
  }, [generationSets, onValidationChange]);
  
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

    const newId = `generation_set_${Date.now()}`;
    const newSet = GenerationSetUtils.createDefault(
      newId,
      `Generation Set ${generationSets.length + 1}`
    );
    
    // Set generation order
    newSet.generationOrder = generationSets.length;
    
    const updatedSets = [...generationSets, newSet];
    onGenerationSetsChange(updatedSets);
    setSelectedSetId(newId);
  }, [generationSets, maxSets, onGenerationSetsChange]);

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
    if (generationSets.length <= 1) {
      return; // Prevent deleting the last set
    }

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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Generation Sets List */}
        <div className="lg:col-span-2 space-y-2">
          <h4 className="text-sm font-medium text-slate-300 mb-2" data-testid="heading-sets-list">Generation Sets List</h4>
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
                        <Badge variant="outline" className="text-xs" data-testid={`badge-more-shapes-${set.id}`}>
                          +{set.enabledShapeTypes.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span data-testid={`text-shape-count-${set.id}`}>
                        {set.shapeCountMode === ShapeCountMode.FIXED 
                          ? `${set.shapeCountFixed} shapes`
                          : `${set.shapeCountRange[0]}-${set.shapeCountRange[1]} shapes`
                        }
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