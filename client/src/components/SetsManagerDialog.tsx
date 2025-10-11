import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { GenerationSet, DEFAULT_GENERATION_SET_LIMITS, ShapeCountMode, BatchConfigSettings } from '@shared/schema';
import { GenerationSetsInterface } from './GenerationSetsInterface';
import { ValidationError, ValidationWarning } from '@/lib/typedHelpers';
import type { CurrentUIState } from '@/hooks/useGenerationSets';
import { ScatterSettings, ShapeType } from '@/lib/shapeTypes';

// Base props that are always available
interface SetsManagerDialogBaseProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  generationSets: GenerationSet[];
  onGenerationSetsChange: (sets: GenerationSet[]) => void;
  globalZIndexEnabled?: boolean;
  showInlineValidation?: boolean;
  // Bi-directional sync props
  currentSetId?: string | null;
  onCurrentSetChange?: (setId: string | null) => void;
  onCurrentSetUpdate?: (setId: string) => void;
  onApplyCurrentUIStateToSet?: (setId: string, uiState: CurrentUIState) => Promise<void>;
  batchExportCount?: number;
  // Edge case strategy for when set count < batch export count
  edgeCaseStrategy?: 'hold' | 'cycle' | 'random' | 'stop';
  onEdgeCaseStrategyChange?: (strategy: 'hold' | 'cycle' | 'random' | 'stop') => void;
}

// When onCreateSetFromState is provided, all state capture props are REQUIRED
interface SetsManagerDialogWithStateCapture extends SetsManagerDialogBaseProps {
  // Raw UI state props for synchronous state capture at button click time (ALL REQUIRED)
  enabledShapeTypes: Set<ShapeType>;
  scatterSettings: ScatterSettings;
  batchConfigSettings: BatchConfigSettings;
  shapeCountMode: ShapeCountMode;
  shapeCountFixed: number;
  shapeCountRange: [number, number];
  onCreateSetFromState: (uiState: CurrentUIState, name?: string) => string;
}

// When onCreateSetFromState is not provided, state capture props are not allowed
interface SetsManagerDialogWithoutStateCapture extends SetsManagerDialogBaseProps {
  enabledShapeTypes?: never;
  scatterSettings?: never;
  batchConfigSettings?: never;
  shapeCountMode?: never;
  shapeCountFixed?: never;
  shapeCountRange?: never;
  onCreateSetFromState?: never;
}

// Union type enforces: either ALL state props are provided, or NONE are provided
type SetsManagerDialogProps = 
  | SetsManagerDialogWithStateCapture 
  | SetsManagerDialogWithoutStateCapture;

export function SetsManagerDialog({
  isOpen,
  onOpenChange,
  generationSets,
  onGenerationSetsChange,
  globalZIndexEnabled = false,
  showInlineValidation = true,
  // Bi-directional sync props
  currentSetId,
  onCurrentSetChange,
  onCurrentSetUpdate,
  onApplyCurrentUIStateToSet,
  // Raw UI state props for synchronous state capture
  enabledShapeTypes,
  scatterSettings,
  batchConfigSettings,
  shapeCountMode,
  shapeCountFixed,
  shapeCountRange,
  onCreateSetFromState,
  batchExportCount,
  // Edge case strategy
  edgeCaseStrategy = 'hold',
  onEdgeCaseStrategyChange
}: SetsManagerDialogProps) {
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }>({ isValid: true, errors: [], warnings: [] });
  const [applyStatus, setApplyStatus] = useState<'idle' | 'applying' | 'success'>('idle');

  // Validation callback from GenerationSetsInterface
  const handleValidationChange = useCallback((isValid: boolean, errors: ValidationError[], warnings: ValidationWarning[]) => {
    setValidationState({ isValid, errors, warnings });
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Apply current UI state to the current generation set
  const handleApplyToCurrentSet = useCallback(async () => {
    if (!currentSetId || !onApplyCurrentUIStateToSet) return;
    if (!(enabledShapeTypes instanceof Set) || !scatterSettings || !batchConfigSettings || 
        !shapeCountMode || shapeCountFixed === undefined || !Array.isArray(shapeCountRange)) {
      return;
    }

    setApplyStatus('applying');
    
    try {
      const currentUIState: CurrentUIState = {
        enabledShapeTypes,
        scatterSettings,
        batchConfigSettings,
        shapeCountMode,
        shapeCountFixed,
        shapeCountRange
      };
      
      await onApplyCurrentUIStateToSet(currentSetId, currentUIState);
      
      // Show success state for 1000ms
      setApplyStatus('success');
      setTimeout(() => {
        setApplyStatus('idle');
      }, 1000);
    } catch (error) {
      // On error, revert to idle
      setApplyStatus('idle');
    }
  }, [currentSetId, onApplyCurrentUIStateToSet, enabledShapeTypes, scatterSettings, batchConfigSettings, shapeCountMode, shapeCountFixed, shapeCountRange]);

  // Calculate whether edge case strategy should be shown
  const enabledSetsCount = generationSets.filter(set => set.enabled).length;
  const shouldShowEdgeCaseStrategy = enabledSetsCount > 0 && batchExportCount && batchExportCount > enabledSetsCount;

  const handleEdgeCaseStrategyChange = useCallback((value: string) => {
    if (onEdgeCaseStrategyChange) {
      onEdgeCaseStrategyChange(value as 'hold' | 'cycle' | 'random' | 'stop');
    }
  }, [onEdgeCaseStrategyChange]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]" 
      onClick={handleClose}
      data-testid="sets-manager-dialog-overlay"
    >
      <div
        className="w-[95vw] max-w-[1000px] bg-slate-900 border-slate-700 border rounded-lg overflow-hidden max-h-[90vh] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        data-testid="sets-manager-dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900">
          <div>
            <h3 className="text-lg font-semibold text-slate-200">Shape Sets Manager</h3>
            <p className="text-sm text-slate-400">
              Create, organize, and manage your shape set configurations
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleClose}
            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            data-testid="close-sets-manager"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>


        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Type-safe conditional rendering based on whether state capture props are ALL provided */}
          {/* Use explicit checks to avoid rejecting valid empty values (empty Set, [0,0] range, etc.) */}
          {enabledShapeTypes instanceof Set && scatterSettings !== undefined && batchConfigSettings !== undefined && 
           shapeCountMode !== undefined && shapeCountFixed !== undefined && 
           Array.isArray(shapeCountRange) && shapeCountRange.length === 2 && 
           typeof shapeCountRange[0] === 'number' && typeof shapeCountRange[1] === 'number' && 
           onCreateSetFromState ? (
            <GenerationSetsInterface
              generationSets={generationSets}
              onGenerationSetsChange={onGenerationSetsChange}
              maxSets={DEFAULT_GENERATION_SET_LIMITS.maxGenerationSets}
              globalZIndexEnabled={globalZIndexEnabled}
              showInlineValidation={showInlineValidation}
              onValidationChange={handleValidationChange}
              currentSetId={currentSetId}
              onCurrentSetChange={onCurrentSetChange}
              onCurrentSetUpdate={onCurrentSetUpdate}
              enabledShapeTypes={enabledShapeTypes}
              scatterSettings={scatterSettings}
              batchConfigSettings={batchConfigSettings}
              shapeCountMode={shapeCountMode}
              shapeCountFixed={shapeCountFixed}
              shapeCountRange={shapeCountRange}
              onCreateSetFromState={onCreateSetFromState}
              batchExportCount={batchExportCount}
            />
          ) : (
            <GenerationSetsInterface
              generationSets={generationSets}
              onGenerationSetsChange={onGenerationSetsChange}
              maxSets={DEFAULT_GENERATION_SET_LIMITS.maxGenerationSets}
              globalZIndexEnabled={globalZIndexEnabled}
              showInlineValidation={showInlineValidation}
              onValidationChange={handleValidationChange}
              currentSetId={currentSetId}
              onCurrentSetChange={onCurrentSetChange}
              onCurrentSetUpdate={onCurrentSetUpdate}
              batchExportCount={batchExportCount}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-700 bg-slate-900">
          <div className="flex gap-4 text-xs text-slate-500">
            <span>{generationSets.length} of {DEFAULT_GENERATION_SET_LIMITS.maxGenerationSets} sets</span>
            <span>{enabledSetsCount} enabled</span>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={applyStatus === 'idle' ? handleApplyToCurrentSet : undefined}
              disabled={!currentSetId || !onApplyCurrentUIStateToSet || !(enabledShapeTypes instanceof Set)}
              className={`${
                !currentSetId || !onApplyCurrentUIStateToSet || !(enabledShapeTypes instanceof Set)
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : applyStatus === 'applying'
                  ? 'bg-blue-600 text-white cursor-not-allowed'
                  : applyStatus === 'success'
                  ? 'bg-green-600 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } transition-colors duration-200`}
              data-testid="button-apply-sets-manager"
            >
              <div className="flex items-center space-x-2">
                {!currentSetId || !onApplyCurrentUIStateToSet || !(enabledShapeTypes instanceof Set) ? (
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
            <Button 
              onClick={handleClose}
              variant="outline"
              className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}