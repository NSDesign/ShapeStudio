import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  GripVertical
} from 'lucide-react';
import { 
  GenerationSet, 
  ShapeCountMode, 
  SupportedShapeType,
  DEFAULT_GENERATION_SET_LIMITS,
  GenerationSetUtils
} from '@shared/schema';
import { IndividualSetConfig } from '@/components/IndividualSetConfig';

interface GenerationSetsInterfaceProps {
  generationSets: GenerationSet[];
  onGenerationSetsChange: (sets: GenerationSet[]) => void;
  validationErrors?: string[];
  maxSets?: number;
  globalZIndexEnabled?: boolean;
}

export function GenerationSetsInterface({
  generationSets,
  onGenerationSetsChange,
  validationErrors = [],
  maxSets = DEFAULT_GENERATION_SET_LIMITS.maxGenerationSets,
  globalZIndexEnabled = false
}: GenerationSetsInterfaceProps) {
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [draggedSetId, setDraggedSetId] = useState<string | null>(null);
  const [dragOverSetId, setDragOverSetId] = useState<string | null>(null);

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

  const selectedSet = generationSets.find(set => set.id === selectedSetId);

  return (
    <div className="space-y-4" data-testid="generation-sets-interface">
      {/* Header with summary */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-200">Generation Sets</h3>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>{generationSets.length} sets</span>
            <Separator orientation="vertical" className="h-4" />
            <span>{generationSets.filter(set => set.enabled).length} enabled</span>
            <Separator orientation="vertical" className="h-4" />
            <span>~{totalShapeCount} shapes total</span>
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

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive" data-testid="alert-validation-errors">
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
          <h4 className="text-sm font-medium text-slate-300 mb-2">Generation Sets List</h4>
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
                      <GripVertical className="w-4 h-4 text-slate-500" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSetEnabled(set.id);
                        }}
                        data-testid={`button-toggle-set-${set.id}`}
                      >
                        {set.enabled ? (
                          <Eye className="w-3 h-3 text-green-400" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-slate-500" />
                        )}
                      </Button>
                      <span className="text-xs text-slate-500">#{index + 1}</span>
                    </div>

                    <h5 className="font-medium text-slate-200 mb-1 truncate">
                      {set.name}
                    </h5>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {set.enabledShapeTypes.slice(0, 3).map(shapeType => (
                        <Badge 
                          key={shapeType} 
                          variant="secondary" 
                          className="text-xs"
                        >
                          {shapeType}
                        </Badge>
                      ))}
                      {set.enabledShapeTypes.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{set.enabledShapeTypes.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>
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
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="p-8 text-center">
                <Settings className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">
                  No Generation Set Selected
                </h3>
                <p className="text-slate-500 mb-4">
                  Select a generation set from the list to configure its settings.
                </p>
                <Button onClick={handleAddSet} disabled={generationSets.length >= maxSets}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Set
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}