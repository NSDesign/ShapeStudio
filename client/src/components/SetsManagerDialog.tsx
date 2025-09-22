import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { GenerationSet, DEFAULT_GENERATION_SET_LIMITS } from '@shared/schema';
import { GenerationSetsInterface } from './GenerationSetsInterface';
import { ValidationError, ValidationWarning } from '@/lib/typedHelpers';

interface SetsManagerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  generationSets: GenerationSet[];
  onGenerationSetsChange: (sets: GenerationSet[]) => void;
  globalZIndexEnabled?: boolean;
  showInlineValidation?: boolean;
}

export function SetsManagerDialog({
  isOpen,
  onOpenChange,
  generationSets,
  onGenerationSetsChange,
  globalZIndexEnabled = false,
  showInlineValidation = true
}: SetsManagerDialogProps) {
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }>({ isValid: true, errors: [], warnings: [] });

  // Validation callback from GenerationSetsInterface
  const handleValidationChange = useCallback((isValid: boolean, errors: ValidationError[], warnings: ValidationWarning[]) => {
    setValidationState({ isValid, errors, warnings });
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

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
            <h3 className="text-lg font-semibold text-slate-200">Generation Sets Manager</h3>
            <p className="text-sm text-slate-400">
              Create, organize, and manage your generation set configurations
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

        {/* Validation Status (if needed) */}
        {(!validationState.isValid || validationState.warnings.length > 0) && (
          <div className={`p-4 border-b border-slate-700 ${
            validationState.errors.length > 0 
              ? 'bg-red-900/20' 
              : 'bg-yellow-900/20'
          }`}>
            <div className="text-sm">
              {validationState.errors.length > 0 && (
                <div className="text-red-300 mb-2">
                  <strong>{validationState.errors.length} Error{validationState.errors.length !== 1 ? 's' : ''}:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {validationState.errors.map((error, index) => (
                      <li key={index}>{error.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validationState.warnings.length > 0 && (
                <div className="text-yellow-300">
                  <strong>{validationState.warnings.length} Warning{validationState.warnings.length !== 1 ? 's' : ''}:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {validationState.warnings.map((warning, index) => (
                      <li key={index}>{warning.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <GenerationSetsInterface
            generationSets={generationSets}
            onGenerationSetsChange={onGenerationSetsChange}
            maxSets={DEFAULT_GENERATION_SET_LIMITS.maxGenerationSets}
            globalZIndexEnabled={globalZIndexEnabled}
            showInlineValidation={showInlineValidation}
            onValidationChange={handleValidationChange}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-700 bg-slate-900">
          <div className="text-xs text-slate-500">
            {generationSets.length} of {DEFAULT_GENERATION_SET_LIMITS.maxGenerationSets} sets
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleClose}
              className="bg-slate-800 border-slate-600 hover:bg-slate-700"
              data-testid="close-sets-manager-footer"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}