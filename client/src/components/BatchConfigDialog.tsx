import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Settings, RotateCcw, X, ChevronDown, AlertTriangle, CheckCircle, AlertCircle, Plus, Minus, Info, Layers } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BatchConfigSettings, defaultBatchConfigSettings, BlendMode, ShapeCountMode, SupportedShapeType, GenerationSet } from '@shared/schema';
import { ScatterSettings, ShapeType } from '@/lib/shapeTypes';
import { GenerationSetsDropdown } from './GenerationSetsDropdown';
import type { CurrentUIState } from '@/hooks/useGenerationSets';

// Use defaultSettings from shared schema
const defaultSettings = defaultBatchConfigSettings;

interface BatchConfigDialogProps {
  settings: BatchConfigSettings;
  onSettingsChange: (settings: BatchConfigSettings) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  sidebarCollapsed?: boolean;
  
  // Generation Sets Integration
  generationSets?: GenerationSet[];
  currentGenerationSetId?: string | null;
  enabledShapeTypes?: Set<ShapeType>;
  scatterSettings?: ScatterSettings;
  shapeCountMode?: ShapeCountMode;
  shapeCountFixed?: number;
  shapeCountRange?: [number, number];
  generationSetsEnabled?: boolean;
  batchExportCount?: number;
  onGenerationSetsChange?: (sets: GenerationSet[]) => void;
  onCurrentGenerationSetChange?: (setId: string | null) => void;
  onCreateGenerationSet?: (customName?: string, currentUIState?: CurrentUIState) => string;
  onDeleteGenerationSet?: (setId: string) => void;
  generateUniqueSetName?: (baseName?: string) => string;
  onOpenGenerationSetsManager?: () => void;
  isSetsManagerOpen?: boolean;
  onCloseGenerationSetsManager?: () => void;
  updateGenerationSetPartial?: (setId: string, partialUpdate: Partial<GenerationSet>) => Promise<void>;
}

export default function BatchConfigDialog({ 
  settings, 
  onSettingsChange, 
  isOpen: controlledIsOpen, 
  onOpenChange: controlledOnOpenChange,
  sidebarCollapsed = false,
  
  // Generation Sets Integration props
  generationSets = [],
  currentGenerationSetId = null,
  enabledShapeTypes = new Set<ShapeType>(),
  scatterSettings,
  shapeCountMode = 'fixed' as ShapeCountMode,
  shapeCountFixed = 10,
  shapeCountRange = [5, 15] as [number, number],
  generationSetsEnabled = false,
  batchExportCount = 10,
  onGenerationSetsChange,
  onCurrentGenerationSetChange,
  onCreateGenerationSet,
  onDeleteGenerationSet,
  generateUniqueSetName,
  onOpenGenerationSetsManager,
  isSetsManagerOpen = false,
  onCloseGenerationSetsManager,
  updateGenerationSetPartial
}: BatchConfigDialogProps) {
  const [currentSettings, setCurrentSettings] = useState<BatchConfigSettings>(defaultSettings);
  const [isOpen, setIsOpen] = useState(controlledIsOpen ?? false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showValidationBanner, setShowValidationBanner] = useState(false);
  const [overallValidationState, setOverallValidationState] = useState<{
    errors: Array<{ message: string }>;
    warnings: Array<{ message: string }>;
  }>({ errors: [], warnings: [] });
  const [isApplying, setIsApplying] = useState(false);

  // Calculate mismatch detection for gear icon warning - use enabled sets count
  const enabledSetsCount = generationSets.filter(set => set.enabled).length;
  const hasSetsCountMismatch = batchExportCount > 0 && enabledSetsCount < batchExportCount;



  // Sync with external control
  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setIsOpen(controlledIsOpen);
    }
  }, [controlledIsOpen]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    controlledOnOpenChange?.(open);
  };

  useEffect(() => {
    console.log('[BatchConfigDialog] Component mounted');
    return () => console.log('[BatchConfigDialog] Component unmounting');
  }, []);

  useEffect(() => {
    console.log('[BatchConfigDialog] Dialog state changed:', { isOpen });
  }, [isOpen]);

  // Initialize settings 
  useEffect(() => {
    const mergedSettings = { ...defaultSettings, ...settings };
    setCurrentSettings(mergedSettings);
  }, [settings]);

  const handleSettingsUpdate = useCallback((updates: Partial<BatchConfigSettings>) => {
    console.log('[BatchConfigDialog] Settings update triggered:', {
      updates,
      currentDialogOpen: isOpen,
      timestamp: new Date().toISOString()
    });
    
    // Handle gradient probability auto-balancing
    if ('fillGradientLinearProbability' in updates || 'fillGradientRadialProbability' in updates || 'fillGradientConicProbability' in updates) {
      setCurrentSettings(prevSettings => {
        const newSettings = { ...prevSettings, ...updates };
        
        // Get the current probabilities
        const linear = newSettings.fillGradientLinearProbability;
        const radial = newSettings.fillGradientRadialProbability;
        const conic = newSettings.fillGradientConicProbability;
        
        // Auto-balance to 100%
        const total = linear + radial + conic;
        if (total !== 100 && total > 0) {
          // Determine which property was changed
          const changedKey = Object.keys(updates)[0];
          const changedValue = updates[changedKey as keyof typeof updates] as number;
          
          if (changedKey === 'fillGradientLinearProbability') {
            const remaining = 100 - changedValue;
            const radialRatio = radial / (radial + conic || 1);
            newSettings.fillGradientRadialProbability = Math.round(remaining * radialRatio);
            newSettings.fillGradientConicProbability = remaining - newSettings.fillGradientRadialProbability;
          } else if (changedKey === 'fillGradientRadialProbability') {
            const remaining = 100 - changedValue;
            const linearRatio = linear / (linear + conic || 1);
            newSettings.fillGradientLinearProbability = Math.round(remaining * linearRatio);
            newSettings.fillGradientConicProbability = remaining - newSettings.fillGradientLinearProbability;
          } else if (changedKey === 'fillGradientConicProbability') {
            const remaining = 100 - changedValue;
            const linearRatio = linear / (linear + radial || 1);
            newSettings.fillGradientLinearProbability = Math.round(remaining * linearRatio);
            newSettings.fillGradientRadialProbability = remaining - newSettings.fillGradientLinearProbability;
          }
        }
        
        return newSettings;
      });
    } else {
      // Only update internal state, don't call parent callback immediately
      setCurrentSettings(prevSettings => ({ ...prevSettings, ...updates }));
    }
  }, [isOpen]);

  const resetToDefaults = useCallback(() => {
    setCurrentSettings(defaultSettings);
  }, []);

  // Simple validation for legacy mode
  const validateConfiguration = useCallback((): string | null => {
    return null; // No validation needed for legacy mode
  }, []);

  // Simple export validation
  const isExportDisabled = useCallback((): boolean => {
    return !!validateConfiguration();
  }, [validateConfiguration]);
  
  // Update validation error state when configuration changes
  useEffect(() => {
    const error = validateConfiguration();
    setValidationError(error);
  }, [validateConfiguration]);
  
  const applySettings = useCallback(async () => {
    console.log('[BatchConfigDialog] Applying settings to parent');
    
    // Simple validation check before applying
    const currentValidationError = validateConfiguration();
    const exportBlocked = isExportDisabled();
    
    if (currentValidationError || exportBlocked) {
      console.error('[BatchConfigDialog] Validation failed:', { 
        localError: currentValidationError
      });
      return;
    }
    
    // Set applying state
    setIsApplying(true);
    
    try {
      // If generation sets are enabled, update only the batchConfig portion via partial update
      if (generationSetsEnabled && currentGenerationSetId && updateGenerationSetPartial) {
        console.log('📝 [GEN CONFIG APPLY] Updating batchConfig for set:', currentGenerationSetId);
        await updateGenerationSetPartial(currentGenerationSetId, {
          batchConfig: { ...currentSettings }
        });
      } else {
        // Legacy mode: update parent settings directly
        onSettingsChange(currentSettings);
      }
      
      // Keep loading state visible for 1000ms for user feedback
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsApplying(false);
    }
  }, [currentSettings, onSettingsChange, validateConfiguration, isExportDisabled, generationSetsEnabled, currentGenerationSetId, updateGenerationSetPartial]);

  const blendModes: BlendMode[] = [
    'source-over', 'multiply', 'screen', 'overlay', 'darken', 
    'lighten', 'color-dodge', 'color-burn', 'hard-light', 
    'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 
    'color', 'luminosity'
  ];

  const compositingOperations = [
    'source-in', 'source-out', 'source-atop', 'destination-over',
    'destination-in', 'destination-out', 'destination-atop', 
    'lighter', 'copy', 'xor'
  ];


  return (
    <>
      <div className={`flex flex-col gap-2 ${sidebarCollapsed ? 'items-center' : 'px-2'} py-2`}>
        <Button 
          variant="ghost" 
          size="sm"
          className={`bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 ${
            sidebarCollapsed 
              ? 'h-12 w-12 p-0 flex items-center justify-center' 
              : 'h-10 w-full justify-start gap-2'
          }`}
          onClick={() => setIsOpen(true)}
          data-testid="button-batch-settings"
        >
          <Settings className="w-4 h-4" />
          {!sidebarCollapsed && <span className="text-sm">Gen Config Settings</span>}
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm"
          className={`bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 ${
            sidebarCollapsed 
              ? 'h-12 w-12 p-0 flex items-center justify-center' 
              : 'h-10 w-full justify-start gap-2'
          }`}
          onClick={onOpenGenerationSetsManager}
          disabled={!onOpenGenerationSetsManager}
          data-testid="button-sets-manager"
          title="Open Sets Manager"
        >
          <Layers className="w-4 h-4" />
          {!sidebarCollapsed && <span className="text-sm">Sets Manager</span>}
        </Button>
      </div>
      
      {isOpen && createPortal(
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            className="w-[95vw] max-w-[900px] bg-slate-900 border-slate-700 border rounded-lg overflow-hidden max-h-[90vh] shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: 10000 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900">
              <div>
                <h3 className="text-lg font-semibold text-slate-200">Generation Config Settings</h3>
                <p className="text-sm text-slate-400">
                  Configure advanced settings for batch shape generation
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content with proper scrolling */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ zIndex: 10001 }}>
              
              {/* Generation Sets Section */}
              {(generationSets.length > 0 || onCreateGenerationSet) && (
                <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-3 space-y-2">
                  {/* Header Row with Title and Buttons */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-slate-200">Shape Sets</Label>
                    {generationSetsEnabled && (
                      <div className="flex items-center gap-1">
                        {/* Add Set Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onCreateGenerationSet?.('')}
                          className="px-2 bg-slate-800 border-slate-600 hover:bg-slate-700"
                          title="Create new generation set"
                          data-testid="batch-dialog-generation-sets-add-button"
                        >
                          <Plus className="h-3 w-3 text-slate-300" />
                        </Button>

                        {/* Remove Set Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteGenerationSet?.(currentGenerationSetId || '')}
                          disabled={!currentGenerationSetId || generationSets.length <= 1}
                          className={`px-2 bg-slate-800 border-slate-600 hover:bg-slate-700 ${(!currentGenerationSetId || generationSets.length <= 1) ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={currentGenerationSetId && generationSets.length > 1 ? "Delete current generation set" : "Cannot delete - only one set remaining"}
                          data-testid="batch-dialog-generation-sets-remove-button"
                        >
                          <Minus className="h-3 w-3 text-slate-300" />
                        </Button>

                        {/* Sets Manager Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenGenerationSetsManager?.()}
                          className="px-2 bg-slate-800 border-slate-600 hover:bg-slate-700"
                          title="Open Shape Sets Manager"
                          data-testid="batch-dialog-generation-sets-manager-button"
                        >
                          <Settings className="h-3 w-3 text-slate-300" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Full Width Dropdown - Always visible, disabled when not enabled */}
                  <Select
                    value={currentGenerationSetId || ''}
                    onValueChange={(value) => onCurrentGenerationSetChange?.(value || null)}
                    disabled={!generationSetsEnabled}
                  >
                    <SelectTrigger 
                      className={`w-full h-8 ${!generationSetsEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      data-testid="batch-dialog-generation-sets-select-trigger"
                    >
                      <SelectValue 
                        placeholder={generationSetsEnabled ? "Select shape set..." : "Enable Shape Sets in Export & Save section"} 
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                      {generationSets.length === 0 ? (
                        <SelectItem value="no-sets" disabled className="text-slate-400">
                          No sets available
                        </SelectItem>
                      ) : (
                        generationSets.map((set) => (
                          <SelectItem 
                            key={set.id} 
                            value={set.id}
                            className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white"
                            data-testid={`batch-dialog-generation-sets-option-${set.id}`}
                          >
                            {set.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  
                  {/* Explanatory message when disabled */}
                  {!generationSetsEnabled && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-blue-900/20 p-2 rounded border border-blue-500/30">
                      <Info className="w-3 h-3 text-blue-400 flex-shrink-0" />
                      <span>Enable Shape Sets in the Export & Save section to use this feature</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Global Validation Status Banner */}
              {showValidationBanner && (
                <div className={`rounded-lg p-4 mb-4 ${
                  overallValidationState.errors.length > 0 
                    ? 'bg-red-900/50 border border-red-500' 
                    : 'bg-yellow-900/50 border border-yellow-500'
                }`} data-testid="validation-status-banner">
                  <div className="flex items-start space-x-3">
                    {overallValidationState.errors.length > 0 ? (
                      <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-medium ${
                          overallValidationState.errors.length > 0 
                            ? 'text-red-200' 
                            : 'text-yellow-200'
                        }`}>
                          Validation Status
                        </h4>
                        <button 
                          onClick={() => setShowValidationBanner(false)}
                          className={`p-1 rounded hover:bg-black/10 ${
                            overallValidationState.errors.length > 0 
                              ? 'text-red-300 hover:text-red-200' 
                              : 'text-yellow-300 hover:text-yellow-200'
                          }`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="mt-2 space-y-2">
                        {overallValidationState.errors.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-sm text-red-300 font-medium">
                              {overallValidationState.errors.length} Error{overallValidationState.errors.length !== 1 ? 's' : ''} Found:
                            </p>
                            <ul className="text-sm text-red-300 list-disc list-inside space-y-1 max-h-24 overflow-y-auto">
                              {overallValidationState.errors.map((error, index) => (
                                <li key={`error-${index}`}>{error.message}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {overallValidationState.warnings.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-sm text-yellow-300 font-medium">
                              {overallValidationState.warnings.length} Warning{overallValidationState.warnings.length !== 1 ? 's' : ''} Found:
                            </p>
                            <ul className="text-sm text-yellow-300 list-disc list-inside space-y-1 max-h-24 overflow-y-auto">
                              {overallValidationState.warnings.map((warning, index) => (
                                <li key={`warning-${index}`}>{warning.message}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {overallValidationState.errors.length > 0 && (
                          <p className="text-xs text-red-400 mt-2 italic">
                            Export actions are disabled until all errors are resolved.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Legacy validation error display */}
              {validationError && (
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mb-4" data-testid="validation-error-legacy">
                  <div className="flex items-start space-x-2">
                    <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-red-200">Configuration Error</h4>
                      <p className="text-sm text-red-300 mt-1">{validationError}</p>
                    </div>
                  </div>
                </div>
              )}





              <Separator className="bg-slate-600" />

              {/* Distribution Layout */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    checked={currentSettings.distributionLayoutEnabled}
                    onCheckedChange={(checked) => handleSettingsUpdate({ distributionLayoutEnabled: checked as boolean })}
                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <Label className="font-medium text-slate-200">Distribution Layout</Label>
                </div>
                
                {currentSettings.distributionLayoutEnabled && (
                  <div className="ml-6 space-y-4">
                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                      <p className="text-xs text-slate-400">
                        <strong>Grid positioning works additively with noise:</strong> Grid provides base layout, noise adds variation on top.
                        <strong>X/Y Randomization Scale:</strong> Controls the amount of existing random variation applied to grid positions (0% = no variation, 100% = full variation).
                        When grid is active, consider zeroing transform position properties to avoid conflicts.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-300">Pattern Type</Label>
                      <Select 
                        value={currentSettings.distributionPattern}
                        onValueChange={(value) => handleSettingsUpdate({ distributionPattern: value as any })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                          <SelectItem value="grid" className="text-slate-200 hover:bg-slate-700">Grid (rows × columns)</SelectItem>
                          <SelectItem value="line" className="text-slate-200 hover:bg-slate-700">Line (coming soon)</SelectItem>
                          <SelectItem value="circle" className="text-slate-200 hover:bg-slate-700">Circle (coming soon)</SelectItem>
                          <SelectItem value="spiral" className="text-slate-200 hover:bg-slate-700">Spiral (coming soon)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {currentSettings.distributionPattern === 'grid' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Rows: {currentSettings.gridRows}</Label>
                            <Slider
                              value={[currentSettings.gridRows]}
                              onValueChange={([value]) => handleSettingsUpdate({ gridRows: value })}
                              min={1}
                              max={10}
                              step={1}
                              className="[&_[role=slider]]:bg-green-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Columns: {currentSettings.gridColumns}</Label>
                            <Slider
                              value={[currentSettings.gridColumns]}
                              onValueChange={([value]) => handleSettingsUpdate({ gridColumns: value })}
                              min={1}
                              max={10}
                              step={1}
                              className="[&_[role=slider]]:bg-green-600"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Row Offset: {currentSettings.gridRowOffset}px</Label>
                            <Slider
                              value={[currentSettings.gridRowOffset]}
                              onValueChange={([value]) => handleSettingsUpdate({ gridRowOffset: value })}
                              min={50}
                              max={300}
                              step={10}
                              className="[&_[role=slider]]:bg-green-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Column Offset: {currentSettings.gridColumnOffset}px</Label>
                            <Slider
                              value={[currentSettings.gridColumnOffset]}
                              onValueChange={([value]) => handleSettingsUpdate({ gridColumnOffset: value })}
                              min={50}
                              max={300}
                              step={10}
                              className="[&_[role=slider]]:bg-green-600"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">X Randomization Scale: {currentSettings.gridXRandomization}%</Label>
                            <Slider
                              value={[currentSettings.gridXRandomization]}
                              onValueChange={([value]) => handleSettingsUpdate({ gridXRandomization: value })}
                              min={0}
                              max={100}
                              step={5}
                              className="[&_[role=slider]]:bg-purple-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Y Randomization Scale: {currentSettings.gridYRandomization}%</Label>
                            <Slider
                              value={[currentSettings.gridYRandomization]}
                              onValueChange={([value]) => handleSettingsUpdate({ gridYRandomization: value })}
                              min={0}
                              max={100}
                              step={5}
                              className="[&_[role=slider]]:bg-purple-600"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm text-slate-300">Sort Grid By</Label>
                          <Select 
                            value={currentSettings.gridSortBy}
                            onValueChange={(value) => handleSettingsUpdate({ gridSortBy: value as any })}
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                              <SelectItem value="none" className="text-slate-200 hover:bg-slate-700">None (generation order)</SelectItem>
                              <SelectItem value="layer" className="text-slate-200 hover:bg-slate-700">Layer Order (z-index)</SelectItem>
                              <SelectItem value="creation-time" className="text-slate-200 hover:bg-slate-700">Creation Time</SelectItem>
                              <SelectItem value="shape-type" className="text-slate-200 hover:bg-slate-700">Shape Type</SelectItem>
                              <SelectItem value="size" className="text-slate-200 hover:bg-slate-700">Size (area)</SelectItem>
                              <SelectItem value="fill-color" className="text-slate-200 hover:bg-slate-700">Fill Color (hue)</SelectItem>
                              <SelectItem value="opacity" className="text-slate-200 hover:bg-slate-700">Opacity</SelectItem>
                              <SelectItem value="angle" className="text-slate-200 hover:bg-slate-700">Rotation Angle</SelectItem>
                              <SelectItem value="id" className="text-slate-200 hover:bg-slate-700">Shape ID</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {currentSettings.gridSortBy !== 'none' && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label className="text-sm text-slate-300">Sort Scope</Label>
                              <Select 
                                value={currentSettings.gridSortScope}
                                onValueChange={(value) => handleSettingsUpdate({ gridSortScope: value as any })}
                              >
                                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="per-generation" className="text-slate-200 hover:bg-slate-700">Per Generation</SelectItem>
                                  <SelectItem value="per-batch" className="text-slate-200 hover:bg-slate-700">Per Batch (all generations)</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-slate-400">
                                Per Generation: Sort shapes within each generation separately<br />
                                Per Batch: Sort all shapes across all generations together
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-sm text-slate-300">Sort Order</Label>
                              <Select 
                                value={currentSettings.gridSortOrder}
                                onValueChange={(value) => handleSettingsUpdate({ gridSortOrder: value as any })}
                              >
                                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="ascending" className="text-slate-200 hover:bg-slate-700">Ascending (low → high)</SelectItem>
                                  <SelectItem value="descending" className="text-slate-200 hover:bg-slate-700">Descending (high → low)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator className="bg-slate-600" />

              {/* Blending Modes */}
              <div className={`space-y-1 ${currentSettings.compositingOperationsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    checked={currentSettings.blendModeEnabled}
                    onCheckedChange={(checked) => handleSettingsUpdate({ blendModeEnabled: checked as boolean })}
                    disabled={currentSettings.compositingOperationsEnabled}
                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <Label className="font-medium text-slate-200">Blending Modes</Label>
                </div>
                
                {currentSettings.compositingOperationsEnabled && (
                  <div className="ml-6 mt-2">
                    <p className="text-xs text-amber-400 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Disabled when Compositing is active. Blend modes and compositing operations cannot be combined on individual shapes.
                    </p>
                  </div>
                )}
                
                {currentSettings.blendModeEnabled && !currentSettings.compositingOperationsEnabled && (
                  <div className="ml-6 space-y-3">
                    <p className="text-xs text-slate-400 border border-slate-600 rounded p-3">
                      Each enabled blend mode has a 0-100% probability weight. System randomly selects modes based on these weights.
                    </p>
                    
                    <div className="grid grid-cols-1 gap-2">
                      {blendModes.map((mode) => (
                        <div key={mode} className="flex items-center space-x-3 p-2 bg-slate-800 rounded">
                          <Checkbox
                            checked={(currentSettings.enabledBlendModes as any)[mode] !== undefined}
                            onCheckedChange={(checked) => {
                              const newBlendModes = { ...currentSettings.enabledBlendModes };
                              if (checked) {
                                (newBlendModes as any)[mode] = 50;
                              } else {
                                delete (newBlendModes as any)[mode];
                              }
                              handleSettingsUpdate({ enabledBlendModes: newBlendModes });
                            }}
                            className="border-slate-500 data-[state=checked]:bg-blue-600"
                          />
                          <Label className="text-xs capitalize text-slate-300 w-28">
                            {mode.replace(/-/g, ' ')}
                          </Label>
                          {(currentSettings.enabledBlendModes as any)[mode] !== undefined && (
                            <div className="flex items-center space-x-2 flex-1">
                              <Slider
                                value={[(currentSettings.enabledBlendModes as any)[mode] || 50]}
                                onValueChange={([value]) => {
                                  const newBlendModes = { ...currentSettings.enabledBlendModes };
                                  (newBlendModes as any)[mode] = value;
                                  handleSettingsUpdate({ enabledBlendModes: newBlendModes });
                                }}
                                max={100}
                                step={1}
                                className="h-2"
                              />
                              <span className="text-xs text-slate-400 w-10 text-right">{(currentSettings.enabledBlendModes as any)[mode]}%</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-slate-600" />

              {/* Compositing Operations */}
              <div className={`space-y-1 ${currentSettings.blendModeEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    checked={currentSettings.compositingOperationsEnabled}
                    onCheckedChange={(checked) => handleSettingsUpdate({ compositingOperationsEnabled: checked as boolean })}
                    disabled={currentSettings.blendModeEnabled}
                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <Label className="font-medium text-slate-200">Compositing</Label>
                </div>
                
                {currentSettings.blendModeEnabled && (
                  <div className="ml-6 mt-2">
                    <p className="text-xs text-amber-400 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Disabled when Blending Modes is active. Blend modes and compositing operations cannot be combined on individual shapes.
                    </p>
                  </div>
                )}
                
                {currentSettings.compositingOperationsEnabled && !currentSettings.blendModeEnabled && (
                  <div className="ml-6 space-y-3">
                    <p className="text-xs text-slate-400 border border-slate-600 rounded p-3">
                      Each enabled compositing operation has a 0-100% probability weight. System randomly selects operations based on these weights for masking and transparency effects.
                    </p>
                    
                    <div className="grid grid-cols-1 gap-2">
                      {compositingOperations.map((op) => (
                        <div key={op} className="flex items-center space-x-3 p-2 bg-slate-800 rounded">
                          <Checkbox
                            checked={(currentSettings.enabledCompositingOperations as any)?.[op] !== undefined}
                            onCheckedChange={(checked) => {
                              const newOps = { ...currentSettings.enabledCompositingOperations };
                              if (checked) {
                                (newOps as any)[op] = 50;
                              } else {
                                delete (newOps as any)[op];
                              }
                              handleSettingsUpdate({ enabledCompositingOperations: newOps });
                            }}
                            className="border-slate-500 data-[state=checked]:bg-blue-600"
                          />
                          <Label className="text-xs capitalize text-slate-300 w-28">
                            {op.replace(/-/g, ' ')}
                          </Label>
                          {(currentSettings.enabledCompositingOperations as any)?.[op] !== undefined && (
                            <div className="flex items-center space-x-2 flex-1">
                              <Slider
                                value={[(currentSettings.enabledCompositingOperations as any)[op] || 50]}
                                onValueChange={([value]) => {
                                  const newOps = { ...currentSettings.enabledCompositingOperations };
                                  (newOps as any)[op] = value;
                                  handleSettingsUpdate({ enabledCompositingOperations: newOps });
                                }}
                                max={100}
                                step={1}
                                className="h-2"
                              />
                              <span className="text-xs text-slate-400 w-10 text-right">{(currentSettings.enabledCompositingOperations as any)[op]}%</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-slate-600" />

              {/* Properties Section */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={currentSettings.propertiesEnabled}
                    onCheckedChange={(checked) => handleSettingsUpdate({ propertiesEnabled: checked as boolean })}
                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <Label className="font-medium text-slate-200">Properties</Label>
                </div>
                
                {currentSettings.propertiesEnabled && (
                  <div className="ml-6 space-y-4">


                    {/* Shape Properties */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={currentSettings.shapePropertiesEnabled}
                          onCheckedChange={(checked) => handleSettingsUpdate({ shapePropertiesEnabled: checked as boolean })}
                          className="border-slate-500 data-[state=checked]:bg-blue-600"
                        />
                        <Label className="text-sm font-medium text-slate-200">Shape Properties</Label>
                      </div>
                      
                      {currentSettings.shapePropertiesEnabled && (
                        <div className="ml-6 space-y-4">
                          {/* Enhanced Width Controls */}
                          <div className="space-y-3 p-3 bg-slate-800 rounded">
                            <div className="flex items-center space-x-2">
                              <Label className="text-sm font-medium text-slate-200">Width</Label>
                              <Select value={currentSettings.widthMode} onValueChange={(value) => handleSettingsUpdate({ widthMode: value as any })}>
                                <SelectTrigger className="h-7 w-32 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                  <SelectItem value="value" className="text-slate-200 hover:bg-slate-700">Fixed Value</SelectItem>
                                  <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {currentSettings.widthMode === 'range' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Range: {currentSettings.widthRange?.[0] || 50} - {currentSettings.widthRange?.[1] || 200}</Label>
                                <Slider
                                  value={currentSettings.widthRange || [50, 200]}
                                  onValueChange={(value) => handleSettingsUpdate({ widthRange: value as [number, number] })}
                                  min={10}
                                  max={500}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                                <Label className="text-xs text-slate-300">Width Randomization: {currentSettings.widthRandomizationScale}%</Label>
                                <Slider
                                  value={[currentSettings.widthRandomizationScale]}
                                  onValueChange={([value]) => handleSettingsUpdate({ widthRandomizationScale: value })}
                                  min={0}
                                  max={100}
                                  step={5}
                                  className="[&_[role=slider]]:bg-purple-600"
                                />
                                <p className="text-xs text-slate-400">0% = deterministic sizing, 100% = full range randomization</p>
                              </div>
                            )}
                            
                            {currentSettings.widthMode === 'value' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Fixed Value: {currentSettings.widthValue}</Label>
                                <Slider
                                  value={[currentSettings.widthValue]}
                                  onValueChange={([value]) => handleSettingsUpdate({ widthValue: value })}
                                  min={10}
                                  max={500}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                            )}
                            

                            
                            {currentSettings.widthMode === 'incremental' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Start Value: {currentSettings.widthStartValue}px</Label>
                                <Slider
                                  value={[currentSettings.widthStartValue]}
                                  onValueChange={([value]) => handleSettingsUpdate({ widthStartValue: value })}
                                  min={10}
                                  max={200}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                                <Label className="text-xs text-slate-300">Increment: {currentSettings.widthIncrement}px</Label>
                                <Slider
                                  value={[currentSettings.widthIncrement]}
                                  onValueChange={([value]) => handleSettingsUpdate({ widthIncrement: value })}
                                  min={1}
                                  max={50}
                                  step={1}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                                <p className="text-xs text-slate-400">Stepped sizing (start value + increment per shape)</p>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={currentSettings.sizeIncrementalResetPerBatch}
                                    onCheckedChange={(checked) => handleSettingsUpdate({ sizeIncrementalResetPerBatch: checked as boolean })}
                                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                                  />
                                  <Label className="text-xs text-slate-300">Reset per batch</Label>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Enhanced Height Controls */}
                          <div className="space-y-3 p-3 bg-slate-800 rounded">
                            <div className="flex items-center space-x-2">
                              <Label className="text-sm font-medium text-slate-200">Height</Label>
                              <Select value={currentSettings.heightMode} onValueChange={(value) => handleSettingsUpdate({ heightMode: value as any })}>
                                <SelectTrigger className="h-7 w-32 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                  <SelectItem value="value" className="text-slate-200 hover:bg-slate-700">Fixed Value</SelectItem>
                                  <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {currentSettings.heightMode === 'range' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Range: {currentSettings.heightRange?.[0] || 50} - {currentSettings.heightRange?.[1] || 200}</Label>
                                <Slider
                                  value={currentSettings.heightRange || [50, 200]}
                                  onValueChange={(value) => handleSettingsUpdate({ heightRange: value as [number, number] })}
                                  min={10}
                                  max={500}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                                <Label className="text-xs text-slate-300">Height Randomization: {currentSettings.heightRandomizationScale}%</Label>
                                <Slider
                                  value={[currentSettings.heightRandomizationScale]}
                                  onValueChange={([value]) => handleSettingsUpdate({ heightRandomizationScale: value })}
                                  min={0}
                                  max={100}
                                  step={5}
                                  className="[&_[role=slider]]:bg-purple-600"
                                />
                                <p className="text-xs text-slate-400">0% = deterministic sizing, 100% = full range randomization</p>
                              </div>
                            )}
                            
                            {currentSettings.heightMode === 'value' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Fixed Value: {currentSettings.heightValue}</Label>
                                <Slider
                                  value={[currentSettings.heightValue]}
                                  onValueChange={([value]) => handleSettingsUpdate({ heightValue: value })}
                                  min={10}
                                  max={500}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                            )}
                            

                            
                            {currentSettings.heightMode === 'incremental' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Start Value: {currentSettings.heightStartValue}px</Label>
                                <Slider
                                  value={[currentSettings.heightStartValue]}
                                  onValueChange={([value]) => handleSettingsUpdate({ heightStartValue: value })}
                                  min={10}
                                  max={200}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                                <Label className="text-xs text-slate-300">Increment: {currentSettings.heightIncrement}px</Label>
                                <Slider
                                  value={[currentSettings.heightIncrement]}
                                  onValueChange={([value]) => handleSettingsUpdate({ heightIncrement: value })}
                                  min={1}
                                  max={50}
                                  step={1}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                                <p className="text-xs text-slate-400">Stepped sizing (start value + increment per shape)</p>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={currentSettings.sizeIncrementalResetPerBatch}
                                    onCheckedChange={(checked) => handleSettingsUpdate({ sizeIncrementalResetPerBatch: checked as boolean })}
                                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                                  />
                                  <Label className="text-xs text-slate-300">Reset per batch</Label>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Size Constraints for Circular Shapes */}
                          <div className="space-y-3 p-3 bg-slate-700 rounded">
                            <Label className="text-sm font-medium text-slate-200">Circular Shape Constraints</Label>
                            <p className="text-xs text-slate-400">When width and height differ, which value should be used for circles, stars, and rings?</p>
                            <div className="space-y-3">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={currentSettings.useMinWidthHeight}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ 
                                    useMinWidthHeight: checked as boolean,
                                    useMaxWidthHeight: checked ? false : currentSettings.useMaxWidthHeight,
                                    useAvgWidthHeight: checked ? false : currentSettings.useAvgWidthHeight
                                  })}
                                  className="border-slate-500 data-[state=checked]:bg-blue-600"
                                />
                                <Label className="text-xs text-slate-300">Use minimum value</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={currentSettings.useMaxWidthHeight}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ 
                                    useMaxWidthHeight: checked as boolean,
                                    useMinWidthHeight: checked ? false : currentSettings.useMinWidthHeight,
                                    useAvgWidthHeight: checked ? false : currentSettings.useAvgWidthHeight
                                  })}
                                  className="border-slate-500 data-[state=checked]:bg-blue-600"
                                />
                                <Label className="text-xs text-slate-300">Use maximum value (default)</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={currentSettings.useAvgWidthHeight}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ 
                                    useAvgWidthHeight: checked as boolean,
                                    useMinWidthHeight: checked ? false : currentSettings.useMinWidthHeight,
                                    useMaxWidthHeight: checked ? false : currentSettings.useMaxWidthHeight
                                  })}
                                  className="border-slate-500 data-[state=checked]:bg-blue-600"
                                />
                                <Label className="text-xs text-slate-300">Use average value</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={currentSettings.maintainAspectRatio}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ maintainAspectRatio: checked as boolean })}
                                  className="border-slate-500 data-[state=checked]:bg-blue-600"
                                />
                                <Label className="text-xs text-slate-300">Force 1:1 aspect ratio for all shapes</Label>
                              </div>
                            </div>
                          </div>
                          

                          {/* Positions Enabled Toggle */}
                          <div className="space-y-3 p-3 bg-slate-700 rounded border border-slate-600">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium text-slate-200">Positions Enabled</Label>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={currentSettings.positionsEnabled}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ positionsEnabled: checked as boolean })}
                                  disabled={currentSettings.distributionLayoutEnabled}
                                  className="border-slate-500 data-[state=checked]:bg-blue-600 disabled:opacity-50"
                                />
                                <Label className={`text-xs ${currentSettings.distributionLayoutEnabled ? 'text-slate-500' : 'text-slate-300'}`}>
                                  {currentSettings.distributionLayoutEnabled ? 'Disabled during distribution layout' : 'Add positions to layout'}
                                </Label>
                              </div>
                            </div>
                          </div>

                          {/* Enhanced X Position Controls */}
                          <div className={`space-y-3 p-3 bg-slate-800 rounded ${!currentSettings.positionsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex items-center space-x-2">
                              <Label className="text-sm font-medium text-slate-200">X Position</Label>
                              <Select value={currentSettings.xPositionMode} onValueChange={(value) => handleSettingsUpdate({ xPositionMode: value as any })}>
                                <SelectTrigger className="h-7 w-32 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                  <SelectItem value="value" className="text-slate-200 hover:bg-slate-700">Fixed Value</SelectItem>
                                  <SelectItem value="directional" className="text-slate-200 hover:bg-slate-700">Directional</SelectItem>
                                  <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {currentSettings.xPositionMode === 'range' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Range: {currentSettings.xPositionRange?.[0] || -100} - {currentSettings.xPositionRange?.[1] || 100}</Label>
                                <Slider
                                  value={currentSettings.xPositionRange || [-100, 100]}
                                  onValueChange={(value) => handleSettingsUpdate({ xPositionRange: value as [number, number] })}
                                  min={-500}
                                  max={500}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                            )}
                            
                            {currentSettings.xPositionMode === 'value' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Fixed Value: {currentSettings.xPositionValue}</Label>
                                <Slider
                                  value={[currentSettings.xPositionValue]}
                                  onValueChange={([value]) => handleSettingsUpdate({ xPositionValue: value })}
                                  min={-400}
                                  max={400}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                            )}
                            
                            {currentSettings.xPositionMode === 'directional' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-300">Directional Mode</Label>
                                  <Select value={currentSettings.positionDirectionalMode} onValueChange={(value) => handleSettingsUpdate({ positionDirectionalMode: value as any })}>
                                    <SelectTrigger className="h-6 w-full text-xs bg-slate-800 border-slate-600 text-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="outward-center" className="text-slate-200 hover:bg-slate-700">Outward from Center</SelectItem>
                                      <SelectItem value="outward-edge" className="text-slate-200 hover:bg-slate-700">Outward from Edge</SelectItem>
                                      <SelectItem value="angle-based" className="text-slate-200 hover:bg-slate-700">Angle-based</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-300">Distance: {currentSettings.positionDirectionalDistance}px</Label>
                                  <Slider
                                    value={[currentSettings.positionDirectionalDistance]}
                                    onValueChange={([value]) => handleSettingsUpdate({ positionDirectionalDistance: value })}
                                    min={10}
                                    max={200}
                                    step={5}
                                    className="[&_[role=slider]]:bg-blue-600"
                                  />
                                </div>
                                {currentSettings.positionDirectionalMode === 'angle-based' && (
                                  <div className="space-y-2">
                                    <Label className="text-xs text-slate-300">Angle: {currentSettings.positionDirectionalAngle}°</Label>
                                    <Slider
                                      value={[currentSettings.positionDirectionalAngle]}
                                      onValueChange={([value]) => handleSettingsUpdate({ positionDirectionalAngle: value })}
                                      min={0}
                                      max={360}
                                      step={1}
                                      className="[&_[role=slider]]:bg-blue-600"
                                    />
                                  </div>
                                )}
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={currentSettings.directionalEvenDistribution}
                                    onCheckedChange={(checked) => handleSettingsUpdate({ directionalEvenDistribution: checked as boolean })}
                                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                                  />
                                  <Label className="text-xs text-slate-300">Even 360° Distribution</Label>
                                </div>
                                {!currentSettings.directionalEvenDistribution && (
                                  <div className="space-y-2">
                                    <Label className="text-xs text-slate-300">Cluster Angle: {currentSettings.directionalClusterAngle}°</Label>
                                    <Slider
                                      value={[currentSettings.directionalClusterAngle]}
                                      onValueChange={([value]) => handleSettingsUpdate({ directionalClusterAngle: value })}
                                      min={10}
                                      max={180}
                                      step={5}
                                      className="[&_[role=slider]]:bg-blue-600"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {currentSettings.xPositionMode === 'incremental' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Start Value: {currentSettings.xPositionStartValue}px</Label>
                                <Slider
                                  value={[currentSettings.xPositionStartValue]}
                                  onValueChange={([value]) => handleSettingsUpdate({ xPositionStartValue: value })}
                                  min={0}
                                  max={200}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                                <Label className="text-xs text-slate-300">Increment: {currentSettings.xPositionIncrement}px</Label>
                                <Slider
                                  value={[currentSettings.xPositionIncrement]}
                                  onValueChange={([value]) => handleSettingsUpdate({ xPositionIncrement: value })}
                                  min={1}
                                  max={100}
                                  step={1}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={currentSettings.incrementalResetPerBatch}
                                    onCheckedChange={(checked) => handleSettingsUpdate({ incrementalResetPerBatch: checked as boolean })}
                                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                                  />
                                  <Label className="text-xs text-slate-300">Reset per batch</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={currentSettings.xPositionModulationEnabled}
                                    onCheckedChange={(checked) => handleSettingsUpdate({ xPositionModulationEnabled: checked as boolean })}
                                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                                  />
                                  <Label className="text-xs text-slate-300">Enable Modulation</Label>
                                </div>
                                {currentSettings.xPositionModulationEnabled && (
                                  <>
                                    <Label className="text-xs text-slate-300">Modulation Value: {currentSettings.xPositionModulationValue}px</Label>
                                    <Slider
                                      value={[currentSettings.xPositionModulationValue]}
                                      onValueChange={([value]) => handleSettingsUpdate({ xPositionModulationValue: value })}
                                      min={50}
                                      max={1500}
                                      step={50}
                                      className="[&_[role=slider]]:bg-blue-600"
                                    />
                                  </>
                                )}
                                <p className="text-xs text-slate-400">Stepped positioning (start + index × increment, with optional modulation)</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Enhanced Y Position Controls */}
                          <div className={`space-y-3 p-3 bg-slate-800 rounded ${!currentSettings.positionsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex items-center space-x-2">
                              <Label className="text-sm font-medium text-slate-200">Y Position</Label>
                              <Select value={currentSettings.yPositionMode} onValueChange={(value) => handleSettingsUpdate({ yPositionMode: value as any })}>
                                <SelectTrigger className="h-7 w-32 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                  <SelectItem value="value" className="text-slate-200 hover:bg-slate-700">Fixed Value</SelectItem>
                                  <SelectItem value="directional" className="text-slate-200 hover:bg-slate-700">Directional</SelectItem>
                                  <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {currentSettings.yPositionMode === 'range' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Range: {currentSettings.yPositionRange?.[0] || -100} - {currentSettings.yPositionRange?.[1] || 100}</Label>
                                <Slider
                                  value={currentSettings.yPositionRange || [-100, 100]}
                                  onValueChange={(value) => handleSettingsUpdate({ yPositionRange: value as [number, number] })}
                                  min={-500}
                                  max={500}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                            )}
                            
                            {currentSettings.yPositionMode === 'value' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Fixed Value: {currentSettings.yPositionValue}</Label>
                                <Slider
                                  value={[currentSettings.yPositionValue]}
                                  onValueChange={([value]) => handleSettingsUpdate({ yPositionValue: value })}
                                  min={-400}
                                  max={400}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                            )}
                            
                            {currentSettings.yPositionMode === 'directional' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-300">Directional Mode</Label>
                                  <Select value={currentSettings.positionDirectionalMode} onValueChange={(value) => handleSettingsUpdate({ positionDirectionalMode: value as any })}>
                                    <SelectTrigger className="h-6 w-full text-xs bg-slate-800 border-slate-600 text-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="outward-center" className="text-slate-200 hover:bg-slate-700">Outward from Center</SelectItem>
                                      <SelectItem value="outward-edge" className="text-slate-200 hover:bg-slate-700">Outward from Edge</SelectItem>
                                      <SelectItem value="angle-based" className="text-slate-200 hover:bg-slate-700">Angle-based</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-300">Distance: {currentSettings.positionDirectionalDistance}px</Label>
                                  <Slider
                                    value={[currentSettings.positionDirectionalDistance]}
                                    onValueChange={([value]) => handleSettingsUpdate({ positionDirectionalDistance: value })}
                                    min={10}
                                    max={200}
                                    step={5}
                                    className="[&_[role=slider]]:bg-blue-600"
                                  />
                                </div>
                                {currentSettings.positionDirectionalMode === 'angle-based' && (
                                  <div className="space-y-2">
                                    <Label className="text-xs text-slate-300">Angle: {currentSettings.positionDirectionalAngle}°</Label>
                                    <Slider
                                      value={[currentSettings.positionDirectionalAngle]}
                                      onValueChange={([value]) => handleSettingsUpdate({ positionDirectionalAngle: value })}
                                      min={0}
                                      max={360}
                                      step={1}
                                      className="[&_[role=slider]]:bg-blue-600"
                                    />
                                  </div>
                                )}
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={currentSettings.directionalEvenDistribution}
                                    onCheckedChange={(checked) => handleSettingsUpdate({ directionalEvenDistribution: checked as boolean })}
                                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                                  />
                                  <Label className="text-xs text-slate-300">Even 360° Distribution</Label>
                                </div>
                                {!currentSettings.directionalEvenDistribution && (
                                  <div className="space-y-2">
                                    <Label className="text-xs text-slate-300">Cluster Angle: {currentSettings.directionalClusterAngle}°</Label>
                                    <Slider
                                      value={[currentSettings.directionalClusterAngle]}
                                      onValueChange={([value]) => handleSettingsUpdate({ directionalClusterAngle: value })}
                                      min={10}
                                      max={180}
                                      step={5}
                                      className="[&_[role=slider]]:bg-blue-600"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {currentSettings.yPositionMode === 'incremental' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Start Value: {currentSettings.yPositionStartValue}px</Label>
                                <Slider
                                  value={[currentSettings.yPositionStartValue]}
                                  onValueChange={([value]) => handleSettingsUpdate({ yPositionStartValue: value })}
                                  min={0}
                                  max={200}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                                <Label className="text-xs text-slate-300">Increment: {currentSettings.yPositionIncrement}px</Label>
                                <Slider
                                  value={[currentSettings.yPositionIncrement]}
                                  onValueChange={([value]) => handleSettingsUpdate({ yPositionIncrement: value })}
                                  min={1}
                                  max={100}
                                  step={1}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={currentSettings.incrementalResetPerBatch}
                                    onCheckedChange={(checked) => handleSettingsUpdate({ incrementalResetPerBatch: checked as boolean })}
                                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                                  />
                                  <Label className="text-xs text-slate-300">Reset per batch</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={currentSettings.yPositionModulationEnabled}
                                    onCheckedChange={(checked) => handleSettingsUpdate({ yPositionModulationEnabled: checked as boolean })}
                                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                                  />
                                  <Label className="text-xs text-slate-300">Enable Modulation</Label>
                                </div>
                                {currentSettings.yPositionModulationEnabled && (
                                  <>
                                    <Label className="text-xs text-slate-300">Modulation Value: {currentSettings.yPositionModulationValue}px</Label>
                                    <Slider
                                      value={[currentSettings.yPositionModulationValue]}
                                      onValueChange={([value]) => handleSettingsUpdate({ yPositionModulationValue: value })}
                                      min={50}
                                      max={1500}
                                      step={50}
                                      className="[&_[role=slider]]:bg-blue-600"
                                    />
                                  </>
                                )}
                                <p className="text-xs text-slate-400">Stepped positioning (start + index × increment, with optional modulation)</p>
                              </div>
                            )}
                          </div>
                          


                        </div>
                      )}
                    </div>

                    <Separator className="bg-slate-700" />

                    {/* Fill Properties */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          checked={currentSettings.fillEnabled}
                          onCheckedChange={(checked) => handleSettingsUpdate({ fillEnabled: checked as boolean })}
                          className="border-slate-500 data-[state=checked]:bg-blue-600"
                        />
                        <Label className="text-sm font-medium text-slate-200">Fill Properties</Label>
                      </div>
                      
                      {currentSettings.fillEnabled && (
                        <div className="ml-6 space-y-4">
                          <Accordion type="multiple" className="w-full space-y-1">
                            {/* Solid Fill Accordion */}
                            <AccordionItem value="solid" className="border border-slate-600 rounded bg-slate-800">
                              <AccordionTrigger className="px-3 py-2 hover:no-underline">
                                <div className="flex items-center space-x-2">
                                  <Label className="text-sm font-medium text-slate-200">Solid</Label>
                                  <div className="flex items-center space-x-1 text-xs text-slate-400">
                                    <span>Probability: {currentSettings.fillStyleProbability}%</span>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-3 pb-2">
                                <div className="space-y-3">
                                  {/* Fill Style Probability - Controls solid vs gradient */}
                                  <div className="space-y-2">
                                    <Label className="text-xs text-slate-300">Solid Fill Probability: {currentSettings.fillStyleProbability}%</Label>
                                    <Slider
                                      value={[currentSettings.fillStyleProbability]}
                                      onValueChange={([value]) => handleSettingsUpdate({ fillStyleProbability: value })}
                                      max={100}
                                      step={5}
                                      className="[&_[role=slider]]:bg-blue-600"
                                    />
                                    <p className="text-xs text-slate-400">{currentSettings.fillStyleProbability}% solid fill, {100 - currentSettings.fillStyleProbability}% gradient fill</p>
                                  </div>

                                  {/* Solid Colors */}
                                  <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                      <Label className="text-sm font-medium text-slate-200">Solid Colors</Label>
                                      <Select value={currentSettings.fillColorMode} onValueChange={(value) => handleSettingsUpdate({ fillColorMode: value as any })}>
                                        <SelectTrigger className="h-7 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                          <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                          <SelectItem value="palette" className="text-slate-200 hover:bg-slate-700">Palette</SelectItem>
                                          <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {currentSettings.fillColorMode === 'range' && (
                                      <div className="space-y-3">
                                        <div className="space-y-2">
                                          <Label className="text-xs text-slate-300">Color Range</Label>
                                          <div className="flex space-x-2">
                                            <Input
                                              type="color"
                                              value={currentSettings.fillColorRange?.[0] || '#3b82f6'}
                                              onChange={(e) => handleSettingsUpdate({
                                                fillColorRange: [e.target.value, currentSettings.fillColorRange?.[1] || '#8b5cf6']
                                              })}
                                              className="w-16 h-8 p-1 bg-slate-700 border-slate-600"
                                            />
                                            <Input
                                              type="color"
                                              value={currentSettings.fillColorRange?.[1] || '#8b5cf6'}
                                              onChange={(e) => handleSettingsUpdate({
                                                fillColorRange: [currentSettings.fillColorRange?.[0] || '#3b82f6', e.target.value]
                                              })}
                                              className="w-16 h-8 p-1 bg-slate-700 border-slate-600"
                                            />
                                          </div>
                                        </div>
                                        
                                        {/* Flip Colour Range Toggle */}
                                        <div className="flex items-center space-x-2">
                                          <Checkbox 
                                            checked={currentSettings.fillColorRangeFlip || false}
                                            onCheckedChange={(checked) => handleSettingsUpdate({ fillColorRangeFlip: checked as boolean })}
                                            className="border-slate-500 data-[state=checked]:bg-blue-600"
                                            data-testid="checkbox-fill-color-range-flip"
                                          />
                                          <Label className="text-xs text-slate-300">Flip Colour Range</Label>
                                        </div>
                                        
                                        {/* Saturation Range */}
                                        <div className="space-y-2">
                                          <Label className="text-xs text-slate-300">Saturation Range: {currentSettings.fillColorSaturationRange?.[0] || 50}% - {currentSettings.fillColorSaturationRange?.[1] || 100}%</Label>
                                          <Slider
                                            value={currentSettings.fillColorSaturationRange || [50, 100]}
                                            onValueChange={(value) => handleSettingsUpdate({ fillColorSaturationRange: value as [number, number] })}
                                            min={0}
                                            max={100}
                                            step={5}
                                            className="[&_[role=slider]]:bg-green-500"
                                          />
                                        </div>
                                        
                                        {/* Lightness Range */}
                                        <div className="space-y-2">
                                          <Label className="text-xs text-slate-300">Lightness Range: {currentSettings.fillColorLightnessRange?.[0] || 30}% - {currentSettings.fillColorLightnessRange?.[1] || 70}%</Label>
                                          <Slider
                                            value={currentSettings.fillColorLightnessRange || [30, 70]}
                                            onValueChange={(value) => handleSettingsUpdate({ fillColorLightnessRange: value as [number, number] })}
                                            min={0}
                                            max={100}
                                            step={5}
                                            className="[&_[role=slider]]:bg-blue-500"
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {currentSettings.fillColorMode === 'palette' && (
                                      <div className="space-y-2">
                                        <Label className="text-xs text-slate-300">Color Palette</Label>
                                        <div className="flex flex-wrap gap-2">
                                          {currentSettings.fillColorPalette?.map((color, index) => (
                                            <Input
                                              key={index}
                                              type="color"
                                              value={color}
                                              onChange={(e) => {
                                                const newPalette = [...(currentSettings.fillColorPalette || [])];
                                                newPalette[index] = e.target.value;
                                                handleSettingsUpdate({ fillColorPalette: newPalette });
                                              }}
                                              className="w-12 h-8 p-1 bg-slate-700 border-slate-600"
                                            />
                                          ))}
                                          <button
                                            onClick={() => {
                                              const newPalette = [...(currentSettings.fillColorPalette || []), '#ffffff'];
                                              handleSettingsUpdate({ fillColorPalette: newPalette });
                                            }}
                                            className="w-12 h-8 bg-slate-600 border border-slate-500 rounded text-slate-300 text-xs hover:bg-slate-500"
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {currentSettings.fillColorMode === 'define' && (
                                      <div className="space-y-2">
                                        <Label className="text-xs text-slate-300">Defined Color</Label>
                                        <Input
                                          type="color"
                                          value={currentSettings.fillColorDefine || '#3b82f6'}
                                          onChange={(e) => handleSettingsUpdate({ fillColorDefine: e.target.value })}
                                          className="w-16 h-8 p-1 bg-slate-700 border-slate-600"
                                        />
                                        <p className="text-xs text-slate-400">All shapes use this exact color</p>
                                      </div>
                                    )}


                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>

                            {/* Gradient Fill Accordion */}
                            <AccordionItem value="gradient" className="border border-slate-600 rounded bg-slate-800">
                              <AccordionTrigger className="px-3 py-2 hover:no-underline">
                                <div className="flex items-center space-x-2">
                                  <Label className="text-sm font-medium text-slate-200">Gradient</Label>
                                  <div className="flex items-center space-x-1 text-xs text-slate-400">
                                    <span>Linear: {currentSettings.fillGradientLinearProbability}% | Radial: {currentSettings.fillGradientRadialProbability}% | Conic: {currentSettings.fillGradientConicProbability}%</span>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-3 pb-2">
                                <div className="space-y-3">
                                  {/* Gradient Enable Control */}
                                  <div className="flex items-center space-x-2">
                                    <Checkbox 
                                      checked={currentSettings.fillGradientEnabled}
                                      onCheckedChange={(checked) => handleSettingsUpdate({ fillGradientEnabled: checked as boolean })}
                                      className="border-slate-500 data-[state=checked]:bg-blue-600"
                                    />
                                    <Label className="text-sm font-medium text-slate-200">Enable Gradients</Label>
                                  </div>

                                  {/* Gradient Type Probabilities */}
                                  <div className="space-y-3">
                                    <Label className="text-sm font-medium text-slate-200">Gradient Type Probabilities</Label>
                                    
                                    <div className="space-y-2">
                                      <Label className="text-xs text-slate-300">Linear: {currentSettings.fillGradientLinearProbability}%</Label>
                                      <Slider
                                        value={[currentSettings.fillGradientLinearProbability]}
                                        onValueChange={([value]) => handleSettingsUpdate({ fillGradientLinearProbability: value })}
                                        max={100}
                                        step={5}
                                        className="[&_[role=slider]]:bg-blue-600"
                                      />
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <Label className="text-xs text-slate-300">Radial: {currentSettings.fillGradientRadialProbability}%</Label>
                                      <Slider
                                        value={[currentSettings.fillGradientRadialProbability]}
                                        onValueChange={([value]) => handleSettingsUpdate({ fillGradientRadialProbability: value })}
                                        max={100}
                                        step={5}
                                        className="[&_[role=slider]]:bg-purple-600"
                                      />
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <Label className="text-xs text-slate-300">Conic: {currentSettings.fillGradientConicProbability}%</Label>
                                      <Slider
                                        value={[currentSettings.fillGradientConicProbability]}
                                        onValueChange={([value]) => handleSettingsUpdate({ fillGradientConicProbability: value })}
                                        max={100}
                                        step={5}
                                        className="[&_[role=slider]]:bg-green-600"
                                      />
                                    </div>
                                    
                                    <p className="text-xs text-slate-400">Total: {currentSettings.fillGradientLinearProbability + currentSettings.fillGradientRadialProbability + currentSettings.fillGradientConicProbability}% (normalization applied during generation)</p>
                                  </div>

                                  {/* Gradient Stops */}
                                  <div className="space-y-2">
                                    <Label className="text-xs text-slate-300">Gradient Stops: {currentSettings.fillGradientStopsRange?.[0] || 2} - {currentSettings.fillGradientStopsRange?.[1] || 4}</Label>
                                    <Slider
                                      value={currentSettings.fillGradientStopsRange || [2, 4]}
                                      onValueChange={(value) => handleSettingsUpdate({ fillGradientStopsRange: value as [number, number] })}
                                      min={2}
                                      max={8}
                                      step={1}
                                      className="[&_[role=slider]]:bg-blue-600"
                                    />
                                  </div>

                                  {/* Gradient Colors */}
                                  <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                      <Label className="text-sm font-medium text-slate-200">Gradient Colors</Label>
                                      <Select value={currentSettings.fillGradientColorMode} onValueChange={(value) => handleSettingsUpdate({ fillGradientColorMode: value as any })}>
                                        <SelectTrigger className="h-7 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                          <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                          <SelectItem value="palette" className="text-slate-200 hover:bg-slate-700">Palette</SelectItem>
                                          <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {currentSettings.fillGradientColorMode === 'range' && (
                                      <div className="space-y-3">
                                        <div className="space-y-2">
                                          <Label className="text-xs text-slate-300">Color Range</Label>
                                          <div className="flex space-x-2">
                                            <Input
                                              type="color"
                                              value={currentSettings.fillGradientColorRange?.[0] || '#3b82f6'}
                                              onChange={(e) => handleSettingsUpdate({
                                                fillGradientColorRange: [e.target.value, currentSettings.fillGradientColorRange?.[1] || '#8b5cf6']
                                              })}
                                              className="w-16 h-8 p-1 bg-slate-700 border-slate-600"
                                            />
                                            <Input
                                              type="color"
                                              value={currentSettings.fillGradientColorRange?.[1] || '#8b5cf6'}
                                              onChange={(e) => handleSettingsUpdate({
                                                fillGradientColorRange: [currentSettings.fillGradientColorRange?.[0] || '#3b82f6', e.target.value]
                                              })}
                                              className="w-16 h-8 p-1 bg-slate-700 border-slate-600"
                                            />
                                          </div>
                                        </div>
                                        
                                        {/* Flip Colour Range Toggle */}
                                        <div className="flex items-center space-x-2">
                                          <Checkbox 
                                            checked={currentSettings.fillGradientColorRangeFlip || false}
                                            onCheckedChange={(checked) => handleSettingsUpdate({ fillGradientColorRangeFlip: checked as boolean })}
                                            className="border-slate-500 data-[state=checked]:bg-blue-600"
                                            data-testid="checkbox-fill-gradient-color-range-flip"
                                          />
                                          <Label className="text-xs text-slate-300">Flip Colour Range</Label>
                                        </div>
                                        
                                        {/* Saturation Range */}
                                        <div className="space-y-2">
                                          <Label className="text-xs text-slate-300">Saturation Range: {currentSettings.fillGradientColorSaturationRange?.[0] || 40}% - {currentSettings.fillGradientColorSaturationRange?.[1] || 90}%</Label>
                                          <Slider
                                            value={currentSettings.fillGradientColorSaturationRange || [40, 90]}
                                            onValueChange={(value) => handleSettingsUpdate({ fillGradientColorSaturationRange: value as [number, number] })}
                                            min={0}
                                            max={100}
                                            step={5}
                                            className="[&_[role=slider]]:bg-green-500"
                                          />
                                        </div>
                                        
                                        {/* Lightness Range */}
                                        <div className="space-y-2">
                                          <Label className="text-xs text-slate-300">Lightness Range: {currentSettings.fillGradientColorLightnessRange?.[0] || 20}% - {currentSettings.fillGradientColorLightnessRange?.[1] || 80}%</Label>
                                          <Slider
                                            value={currentSettings.fillGradientColorLightnessRange || [20, 80]}
                                            onValueChange={(value) => handleSettingsUpdate({ fillGradientColorLightnessRange: value as [number, number] })}
                                            min={0}
                                            max={100}
                                            step={5}
                                            className="[&_[role=slider]]:bg-blue-500"
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {currentSettings.fillGradientColorMode === 'palette' && (
                                      <div className="space-y-2">
                                        <Label className="text-xs text-slate-300">Gradient Palette</Label>
                                        <div className="flex flex-wrap gap-2">
                                          {currentSettings.fillGradientColorPalette?.map((color, index) => (
                                            <Input
                                              key={index}
                                              type="color"
                                              value={color}
                                              onChange={(e) => {
                                                const newPalette = [...(currentSettings.fillGradientColorPalette || [])];
                                                newPalette[index] = e.target.value;
                                                handleSettingsUpdate({ fillGradientColorPalette: newPalette });
                                              }}
                                              className="w-12 h-8 p-1 bg-slate-700 border-slate-600"
                                            />
                                          ))}
                                          <button
                                            onClick={() => {
                                              const newPalette = [...(currentSettings.fillGradientColorPalette || []), '#ffffff'];
                                              handleSettingsUpdate({ fillGradientColorPalette: newPalette });
                                            }}
                                            className="w-12 h-8 bg-slate-600 border border-slate-500 rounded text-slate-300 text-xs hover:bg-slate-500"
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {currentSettings.fillGradientColorMode === 'define' && (
                                      <div className="space-y-2">
                                        <Label className="text-xs text-slate-300">Gradient Colors</Label>
                                        <div className="flex flex-wrap gap-2">
                                          {currentSettings.fillGradientColorDefine?.map((color, index) => (
                                            <Input
                                              key={index}
                                              type="color"
                                              value={color}
                                              onChange={(e) => {
                                                const newColors = [...(currentSettings.fillGradientColorDefine || [])];
                                                newColors[index] = e.target.value;
                                                handleSettingsUpdate({ fillGradientColorDefine: newColors });
                                              }}
                                              className="w-12 h-8 p-1 bg-slate-700 border-slate-600"
                                            />
                                          ))}
                                          <button
                                            onClick={() => {
                                              const newColors = [...(currentSettings.fillGradientColorDefine || []), '#ffffff'];
                                              handleSettingsUpdate({ fillGradientColorDefine: newColors });
                                            }}
                                            className="w-12 h-8 bg-slate-600 border border-slate-500 rounded text-slate-300 text-xs hover:bg-slate-500"
                                          >
                                            +
                                          </button>
                                        </div>
                                        <p className="text-xs text-slate-400">Exact colors for gradient generation</p>
                                      </div>
                                    )}

                                  {/* Enhanced Gradient Type & Direction Controls */}
                                  <Separator className="bg-slate-600" />
                                  
                                  <div className="space-y-4">
                                    <Label className="text-sm font-medium text-slate-200">Gradient Type & Direction</Label>
                                    
                                    {/* Gradient Type Probability */}
                                    <div className="space-y-3">
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          checked={currentSettings.fillGradientMatchShape}
                                          onCheckedChange={(checked) => handleSettingsUpdate({ fillGradientMatchShape: checked as boolean })}
                                          className="border-slate-500 data-[state=checked]:bg-blue-600"
                                        />
                                        <Label className="text-xs text-slate-300">Match gradient type to shape</Label>
                                      </div>
                                      <p className="text-xs text-slate-400 ml-6">
                                        When enabled: radial gradients for round shapes (circles, stars, blobs), linear gradients for geometric shapes (rectangles, polygons)
                                      </p>
                                      
                                      {!currentSettings.fillGradientMatchShape && (
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-2">
                                            <Label className="text-xs text-slate-300">Linear: {currentSettings.fillGradientLinearProbability}%</Label>
                                            <Slider
                                              value={[currentSettings.fillGradientLinearProbability]}
                                              onValueChange={([value]) => {
                                                const radialValue = 100 - value;
                                                handleSettingsUpdate({ 
                                                  fillGradientLinearProbability: value,
                                                  fillGradientRadialProbability: radialValue
                                                });
                                              }}
                                              max={100}
                                              step={5}
                                              className="[&_[role=slider]]:bg-purple-600"
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-xs text-slate-300">Radial: {currentSettings.fillGradientRadialProbability}%</Label>
                                            <Slider
                                              value={[currentSettings.fillGradientRadialProbability]}
                                              onValueChange={([value]) => {
                                                const linearValue = 100 - value;
                                                handleSettingsUpdate({ 
                                                  fillGradientRadialProbability: value,
                                                  fillGradientLinearProbability: linearValue
                                                });
                                              }}
                                              max={100}
                                              step={5}
                                              className="[&_[role=slider]]:bg-pink-600"
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Linear Gradient Direction */}
                                    <div className="space-y-3 p-3 bg-slate-700 rounded">
                                      <Label className="text-sm font-medium text-slate-200">Linear Direction</Label>
                                      
                                      <div className="flex items-center space-x-2">
                                        <Label className="text-xs text-slate-300">Mode</Label>
                                        <Select value={currentSettings.fillGradientLinearDirection} onValueChange={(value) => handleSettingsUpdate({ fillGradientLinearDirection: value as any })}>
                                          <SelectTrigger className="h-7 w-24 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                            <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                            <SelectItem value="predefined" className="text-slate-200 hover:bg-slate-700">Predefined</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {currentSettings.fillGradientLinearDirection === 'range' && (
                                        <div className="space-y-2">
                                          <Label className="text-xs text-slate-300">
                                            Angle Range: {currentSettings.fillGradientLinearAngleRange?.[0] || 0}° - {currentSettings.fillGradientLinearAngleRange?.[1] || 360}°
                                          </Label>
                                          <Slider
                                            value={currentSettings.fillGradientLinearAngleRange || [0, 360]}
                                            onValueChange={(value) => handleSettingsUpdate({ fillGradientLinearAngleRange: value as [number, number] })}
                                            min={0}
                                            max={360}
                                            step={15}
                                            className="[&_[role=slider]]:bg-purple-600"
                                          />
                                        </div>
                                      )}

                                      {currentSettings.fillGradientLinearDirection === 'predefined' && (
                                        <div className="space-y-3">
                                          <div className="space-y-2">
                                            <Label className="text-xs text-slate-300">Direction</Label>
                                            <Select value={currentSettings.fillGradientLinearPredefined} onValueChange={(value) => handleSettingsUpdate({ fillGradientLinearPredefined: value as any })}>
                                              <SelectTrigger className="h-7 w-32 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                                <SelectItem value="horizontal" className="text-slate-200 hover:bg-slate-700">Horizontal</SelectItem>
                                                <SelectItem value="vertical" className="text-slate-200 hover:bg-slate-700">Vertical</SelectItem>
                                                <SelectItem value="diagonal-down" className="text-slate-200 hover:bg-slate-700">Diagonal ↘</SelectItem>
                                                <SelectItem value="diagonal-up" className="text-slate-200 hover:bg-slate-700">Diagonal ↗</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          
                                          <div className="flex items-center space-x-2">
                                            <Checkbox
                                              checked={currentSettings.fillGradientLinearAlignToShape}
                                              onCheckedChange={(checked) => handleSettingsUpdate({ fillGradientLinearAlignToShape: checked as boolean })}
                                              className="border-slate-500 data-[state=checked]:bg-purple-600"
                                            />
                                            <Label className="text-xs text-slate-300">Align to shape orientation</Label>
                                          </div>
                                          <p className="text-xs text-slate-400 ml-6">
                                            Adjust gradient direction based on shape rotation and orientation
                                          </p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Radial Gradient Controls */}
                                    <div className="space-y-3 p-3 bg-slate-700 rounded">
                                      <Label className="text-sm font-medium text-slate-200">Radial Settings</Label>
                                      
                                      {/* Radial Center Position */}
                                      <div className="space-y-2">
                                        <Label className="text-xs text-slate-300">Center Position</Label>
                                        <Select value={currentSettings.fillGradientRadialCenter} onValueChange={(value) => handleSettingsUpdate({ fillGradientRadialCenter: value as any })}>
                                          <SelectTrigger className="h-7 w-32 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                            <SelectItem value="center" className="text-slate-200 hover:bg-slate-700">Center</SelectItem>
                                            <SelectItem value="random" className="text-slate-200 hover:bg-slate-700">Random</SelectItem>
                                            <SelectItem value="corners" className="text-slate-200 hover:bg-slate-700">Corners</SelectItem>
                                            <SelectItem value="midpoints" className="text-slate-200 hover:bg-slate-700">Midpoints</SelectItem>
                                            <SelectItem value="coordinates" className="text-slate-200 hover:bg-slate-700">Coordinates</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {/* Enhanced Position Controls */}
                                      {currentSettings.fillGradientRadialCenter === 'coordinates' && (
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-2">
                                            <Label className="text-xs text-slate-300">X: {currentSettings.fillGradientRadialCenterX}%</Label>
                                            <Slider
                                              value={[currentSettings.fillGradientRadialCenterX]}
                                              onValueChange={([value]) => handleSettingsUpdate({ fillGradientRadialCenterX: value })}
                                              min={0}
                                              max={100}
                                              step={5}
                                              className="[&_[role=slider]]:bg-pink-600"
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-xs text-slate-300">Y: {currentSettings.fillGradientRadialCenterY}%</Label>
                                            <Slider
                                              value={[currentSettings.fillGradientRadialCenterY]}
                                              onValueChange={([value]) => handleSettingsUpdate({ fillGradientRadialCenterY: value })}
                                              min={0}
                                              max={100}
                                              step={5}
                                              className="[&_[role=slider]]:bg-pink-600"
                                            />
                                          </div>
                                        </div>
                                      )}

                                      {/* Corners Selection */}
                                      {currentSettings.fillGradientRadialCenter === 'corners' && (
                                        <div className="space-y-3">
                                          <div className="flex items-center space-x-2">
                                            <Label className="text-xs text-slate-300">Selection Mode</Label>
                                            <Select value={currentSettings.fillGradientRadialSelectionMode} onValueChange={(value) => handleSettingsUpdate({ fillGradientRadialSelectionMode: value as any })}>
                                              <SelectTrigger className="h-7 w-20 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                                <SelectItem value="random" className="text-slate-200 hover:bg-slate-700">Random</SelectItem>
                                                <SelectItem value="cycle" className="text-slate-200 hover:bg-slate-700">Cycle</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          
                                          <div className="space-y-2">
                                            <Label className="text-xs text-slate-300">Available Corners</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                              <div className="flex items-center space-x-2">
                                                <Checkbox
                                                  checked={currentSettings.fillGradientRadialCorners?.topLeft}
                                                  onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                    fillGradientRadialCorners: { 
                                                      ...currentSettings.fillGradientRadialCorners, 
                                                      topLeft: checked as boolean 
                                                    } 
                                                  })}
                                                  className="border-slate-500 data-[state=checked]:bg-pink-600"
                                                />
                                                <Label className="text-xs text-slate-300">Top Left</Label>
                                              </div>
                                              <div className="flex items-center space-x-2">
                                                <Checkbox
                                                  checked={currentSettings.fillGradientRadialCorners?.topRight}
                                                  onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                    fillGradientRadialCorners: { 
                                                      ...currentSettings.fillGradientRadialCorners, 
                                                      topRight: checked as boolean 
                                                    } 
                                                  })}
                                                  className="border-slate-500 data-[state=checked]:bg-pink-600"
                                                />
                                                <Label className="text-xs text-slate-300">Top Right</Label>
                                              </div>
                                              <div className="flex items-center space-x-2">
                                                <Checkbox
                                                  checked={currentSettings.fillGradientRadialCorners?.bottomLeft}
                                                  onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                    fillGradientRadialCorners: { 
                                                      ...currentSettings.fillGradientRadialCorners, 
                                                      bottomLeft: checked as boolean 
                                                    } 
                                                  })}
                                                  className="border-slate-500 data-[state=checked]:bg-pink-600"
                                                />
                                                <Label className="text-xs text-slate-300">Bottom Left</Label>
                                              </div>
                                              <div className="flex items-center space-x-2">
                                                <Checkbox
                                                  checked={currentSettings.fillGradientRadialCorners?.bottomRight}
                                                  onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                    fillGradientRadialCorners: { 
                                                      ...currentSettings.fillGradientRadialCorners, 
                                                      bottomRight: checked as boolean 
                                                    } 
                                                  })}
                                                  className="border-slate-500 data-[state=checked]:bg-pink-600"
                                                />
                                                <Label className="text-xs text-slate-300">Bottom Right</Label>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Midpoints Selection */}
                                      {currentSettings.fillGradientRadialCenter === 'midpoints' && (
                                        <div className="space-y-3">
                                          <div className="flex items-center space-x-2">
                                            <Label className="text-xs text-slate-300">Selection Mode</Label>
                                            <Select value={currentSettings.fillGradientRadialSelectionMode} onValueChange={(value) => handleSettingsUpdate({ fillGradientRadialSelectionMode: value as any })}>
                                              <SelectTrigger className="h-7 w-20 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                                <SelectItem value="random" className="text-slate-200 hover:bg-slate-700">Random</SelectItem>
                                                <SelectItem value="cycle" className="text-slate-200 hover:bg-slate-700">Cycle</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          
                                          <div className="space-y-2">
                                            <Label className="text-xs text-slate-300">Available Midpoints</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                              <div className="flex items-center space-x-2">
                                                <Checkbox
                                                  checked={currentSettings.fillGradientRadialMidpoints?.top}
                                                  onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                    fillGradientRadialMidpoints: { 
                                                      ...currentSettings.fillGradientRadialMidpoints, 
                                                      top: checked as boolean 
                                                    } 
                                                  })}
                                                  className="border-slate-500 data-[state=checked]:bg-pink-600"
                                                />
                                                <Label className="text-xs text-slate-300">Top</Label>
                                              </div>
                                              <div className="flex items-center space-x-2">
                                                <Checkbox
                                                  checked={currentSettings.fillGradientRadialMidpoints?.right}
                                                  onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                    fillGradientRadialMidpoints: { 
                                                      ...currentSettings.fillGradientRadialMidpoints, 
                                                      right: checked as boolean 
                                                    } 
                                                  })}
                                                  className="border-slate-500 data-[state=checked]:bg-pink-600"
                                                />
                                                <Label className="text-xs text-slate-300">Right</Label>
                                              </div>
                                              <div className="flex items-center space-x-2">
                                                <Checkbox
                                                  checked={currentSettings.fillGradientRadialMidpoints?.bottom}
                                                  onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                    fillGradientRadialMidpoints: { 
                                                      ...currentSettings.fillGradientRadialMidpoints, 
                                                      bottom: checked as boolean 
                                                    } 
                                                  })}
                                                  className="border-slate-500 data-[state=checked]:bg-pink-600"
                                                />
                                                <Label className="text-xs text-slate-300">Bottom</Label>
                                              </div>
                                              <div className="flex items-center space-x-2">
                                                <Checkbox
                                                  checked={currentSettings.fillGradientRadialMidpoints?.left}
                                                  onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                    fillGradientRadialMidpoints: { 
                                                      ...currentSettings.fillGradientRadialMidpoints, 
                                                      left: checked as boolean 
                                                    } 
                                                  })}
                                                  className="border-slate-500 data-[state=checked]:bg-pink-600"
                                                />
                                                <Label className="text-xs text-slate-300">Left</Label>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Radial Shape */}
                                      <div className="space-y-2">
                                        <Label className="text-xs text-slate-300">Radial Shape</Label>
                                        <Select value={currentSettings.fillGradientRadialShape} onValueChange={(value) => handleSettingsUpdate({ fillGradientRadialShape: value as any })}>
                                          <SelectTrigger className="h-7 w-24 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                            <SelectItem value="auto" className="text-slate-200 hover:bg-slate-700">Auto</SelectItem>
                                            <SelectItem value="circle" className="text-slate-200 hover:bg-slate-700">Circle</SelectItem>
                                            <SelectItem value="ellipse" className="text-slate-200 hover:bg-slate-700">Ellipse</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {currentSettings.fillGradientRadialShape === 'auto' && (
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-2">
                                            <Label className="text-xs text-slate-300">Circle: {currentSettings.fillGradientRadialCircleProbability}%</Label>
                                            <Slider
                                              value={[currentSettings.fillGradientRadialCircleProbability]}
                                              onValueChange={([value]) => {
                                                const ellipseValue = 100 - value;
                                                handleSettingsUpdate({ 
                                                  fillGradientRadialCircleProbability: value,
                                                  fillGradientRadialEllipseProbability: ellipseValue
                                                });
                                              }}
                                              max={100}
                                              step={5}
                                              className="[&_[role=slider]]:bg-pink-600"
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-xs text-slate-300">Ellipse: {currentSettings.fillGradientRadialEllipseProbability}%</Label>
                                            <Slider
                                              value={[currentSettings.fillGradientRadialEllipseProbability]}
                                              onValueChange={([value]) => {
                                                const circleValue = 100 - value;
                                                handleSettingsUpdate({ 
                                                  fillGradientRadialEllipseProbability: value,
                                                  fillGradientRadialCircleProbability: circleValue
                                                });
                                              }}
                                              max={100}
                                              step={5}
                                              className="[&_[role=slider]]:bg-pink-600"
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>

                          {/* Fill Opacity Section - Separate from accordions */}
                          <div className="space-y-3 p-3 bg-slate-800 rounded">
                            <div className="flex items-center space-x-2">
                              <Label className="text-sm font-medium text-slate-200">Fill Opacity</Label>
                              <Select value={currentSettings.fillOpacityMode} onValueChange={(value) => handleSettingsUpdate({ fillOpacityMode: value as any })}>
                                <SelectTrigger className="h-7 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                  <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {currentSettings.fillOpacityMode === 'range' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Opacity Range: {currentSettings.fillOpacityRange?.[0] ?? 0}% - {currentSettings.fillOpacityRange?.[1] ?? 100}%</Label>
                                <Slider
                                  value={currentSettings.fillOpacityRange || [0, 100]}
                                  onValueChange={(value) => handleSettingsUpdate({ fillOpacityRange: value as [number, number] })}
                                  min={0}
                                  max={100}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                            )}

                            {currentSettings.fillOpacityMode === 'define' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Opacity: {currentSettings.fillOpacityDefine || 80}%</Label>
                                <Slider
                                  value={[currentSettings.fillOpacityDefine || 80]}
                                  onValueChange={([value]) => handleSettingsUpdate({ fillOpacityDefine: value })}
                                  max={100}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                    </div>

                    <Separator className="bg-slate-700" />

                    {/* Stroke Properties */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          checked={currentSettings.strokeEnabled}
                          onCheckedChange={(checked) => handleSettingsUpdate({ strokeEnabled: checked as boolean })}
                          className="border-slate-500 data-[state=checked]:bg-blue-600"
                        />
                        <Label className="text-sm font-medium text-slate-200">Stroke Properties</Label>
                      </div>
                      
                      {currentSettings.strokeEnabled && (
                        <div className="ml-6 space-y-4">
                          {/* Stroke Probability and Width */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-300">Stroke Probability: {currentSettings.strokeProbability}%</Label>
                              <Slider
                                value={[currentSettings.strokeProbability]}
                                onValueChange={([value]) => handleSettingsUpdate({ strokeProbability: value })}
                                max={100}
                                step={5}
                                className="[&_[role=slider]]:bg-blue-600"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-300">Stroke Width: {currentSettings.strokeWidthRange?.[0] || 1} - {currentSettings.strokeWidthRange?.[1] || 5}px</Label>
                              <Slider
                                value={currentSettings.strokeWidthRange || [1, 5]}
                                onValueChange={(value) => handleSettingsUpdate({ strokeWidthRange: value as [number, number] })}
                                min={1}
                                max={20}
                                step={1}
                                className="[&_[role=slider]]:bg-blue-600"
                              />
                            </div>
                          </div>

                          {/* Stroke Color Controls */}
                          <div className="space-y-3 p-3 bg-slate-800 rounded">
                            <div className="flex items-center space-x-2">
                              <Label className="text-sm font-medium text-slate-200">Stroke Color</Label>
                              <Select value={currentSettings.strokeColorMode} onValueChange={(value) => handleSettingsUpdate({ strokeColorMode: value as any })}>
                                <SelectTrigger className="h-7 w-24 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                  <SelectItem value="palette" className="text-slate-200 hover:bg-slate-700">Palette</SelectItem>
                                  <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {currentSettings.strokeColorMode === 'range' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-300">Color Range</Label>
                                  <div className="flex space-x-2">
                                    <Input
                                      type="color"
                                      value={currentSettings.strokeColorRange?.[0] || '#ef4444'}
                                      onChange={(e) => handleSettingsUpdate({
                                        strokeColorRange: [e.target.value, currentSettings.strokeColorRange?.[1] || '#f59e0b']
                                      })}
                                      className="w-16 h-8 p-1 bg-slate-800 border-slate-600"
                                    />
                                    <Input
                                      type="color"
                                      value={currentSettings.strokeColorRange?.[1] || '#f59e0b'}
                                      onChange={(e) => handleSettingsUpdate({
                                        strokeColorRange: [currentSettings.strokeColorRange?.[0] || '#ef4444', e.target.value]
                                      })}
                                      className="w-16 h-8 p-1 bg-slate-800 border-slate-600"
                                    />
                                  </div>
                                </div>
                                
                                {/* Flip Colour Range Toggle */}
                                <div className="flex items-center space-x-2">
                                  <Checkbox 
                                    checked={currentSettings.strokeColorRangeFlip || false}
                                    onCheckedChange={(checked) => handleSettingsUpdate({ strokeColorRangeFlip: checked as boolean })}
                                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                                    data-testid="checkbox-stroke-color-range-flip"
                                  />
                                  <Label className="text-xs text-slate-300">Flip Colour Range</Label>
                                </div>
                                
                                {/* Saturation Range */}
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-300">Saturation Range: {currentSettings.strokeColorSaturationRange?.[0] || 60}% - {currentSettings.strokeColorSaturationRange?.[1] || 100}%</Label>
                                  <Slider
                                    value={currentSettings.strokeColorSaturationRange || [60, 100]}
                                    onValueChange={(value) => handleSettingsUpdate({ strokeColorSaturationRange: value as [number, number] })}
                                    min={0}
                                    max={100}
                                    step={5}
                                    className="[&_[role=slider]]:bg-green-500"
                                  />
                                </div>
                                
                                {/* Lightness Range */}
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-300">Lightness Range: {currentSettings.strokeColorLightnessRange?.[0] || 20}% - {currentSettings.strokeColorLightnessRange?.[1] || 60}%</Label>
                                  <Slider
                                    value={currentSettings.strokeColorLightnessRange || [20, 60]}
                                    onValueChange={(value) => handleSettingsUpdate({ strokeColorLightnessRange: value as [number, number] })}
                                    min={0}
                                    max={100}
                                    step={5}
                                    className="[&_[role=slider]]:bg-blue-500"
                                  />
                                </div>
                              </div>
                            )}

                            {currentSettings.strokeColorMode === 'palette' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Color Palette</Label>
                                <div className="flex flex-wrap gap-2">
                                  {currentSettings.strokeColorPalette?.map((color, index) => (
                                    <Input
                                      key={index}
                                      type="color"
                                      value={color}
                                      onChange={(e) => {
                                        const newPalette = [...(currentSettings.strokeColorPalette || [])];
                                        newPalette[index] = e.target.value;
                                        handleSettingsUpdate({ strokeColorPalette: newPalette });
                                      }}
                                      className="w-12 h-8 p-1 bg-slate-800 border-slate-600"
                                    />
                                  ))}
                                  <button
                                    onClick={() => {
                                      const newPalette = [...(currentSettings.strokeColorPalette || []), '#ffffff'];
                                      handleSettingsUpdate({ strokeColorPalette: newPalette });
                                    }}
                                    className="w-12 h-8 bg-slate-700 border border-slate-600 rounded text-slate-300 text-xs hover:bg-slate-600"
                                  >
                                    +
                                  </button>
                                </div>
                                <p className="text-xs text-slate-400">Shapes cycle through palette colors</p>
                              </div>
                            )}

                            {currentSettings.strokeColorMode === 'define' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Defined Color</Label>
                                <Input
                                  type="color"
                                  value={currentSettings.strokeColorDefine || '#ef4444'}
                                  onChange={(e) => handleSettingsUpdate({ strokeColorDefine: e.target.value })}
                                  className="w-16 h-8 p-1 bg-slate-800 border-slate-600"
                                />
                                <p className="text-xs text-slate-400">All shapes use this exact color</p>
                              </div>
                            )}


                          </div>

                          {/* Stroke Opacity Controls */}
                          <div className="space-y-3 p-3 bg-slate-800 rounded">
                            <div className="flex items-center space-x-2">
                              <Label className="text-sm font-medium text-slate-200">Stroke Opacity</Label>
                              <Select value={currentSettings.strokeOpacityMode} onValueChange={(value) => handleSettingsUpdate({ strokeOpacityMode: value as any })}>
                                <SelectTrigger className="h-7 w-24 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                  <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {currentSettings.strokeOpacityMode === 'range' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Opacity Range: {currentSettings.strokeOpacityRange?.[0] || 40}% - {currentSettings.strokeOpacityRange?.[1] || 100}%</Label>
                                <Slider
                                  value={currentSettings.strokeOpacityRange || [40, 100]}
                                  onValueChange={(value) => handleSettingsUpdate({ strokeOpacityRange: value as [number, number] })}
                                  max={100}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                            )}

                            {currentSettings.strokeOpacityMode === 'define' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Opacity: {currentSettings.strokeOpacityDefine || 80}%</Label>
                                <Slider
                                  value={[currentSettings.strokeOpacityDefine || 80]}
                                  onValueChange={([value]) => handleSettingsUpdate({ strokeOpacityDefine: value })}
                                  max={100}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator className="bg-slate-700" />

                    {/* Shape Transforms */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={currentSettings.transformsEnabled}
                          onCheckedChange={(checked) => handleSettingsUpdate({ transformsEnabled: checked as boolean })}
                          className="border-slate-500 data-[state=checked]:bg-blue-600"
                        />
                        <Label className="text-sm font-medium text-slate-200">Shape Transforms</Label>
                      </div>
                      
                      {currentSettings.transformsEnabled && (
                        <div className="ml-6 space-y-4">
                          {/* X and Y Translate Enhanced Controls */}
                          <div className="space-y-3 p-3 bg-slate-800 rounded">
                            <Label className="text-sm font-medium text-slate-200">Position (X/Y Translate)</Label>
                            
                            <div className="grid grid-cols-2 gap-4">
                              {/* X Position Controls */}
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Label className="text-xs text-slate-300">X</Label>
                                  <Select value={currentSettings.xTransformMode} onValueChange={(value) => handleSettingsUpdate({ xTransformMode: value as any })}>
                                    <SelectTrigger className="h-6 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                      <SelectItem value="value" className="text-slate-200 hover:bg-slate-700">Value</SelectItem>
                                      <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {currentSettings.xTransformMode === 'range' && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Range: {currentSettings.translateXRange?.[0] || -50} - {currentSettings.translateXRange?.[1] || 50}</Label>
                                    <Slider
                                      value={currentSettings.translateXRange || [-50, 50]}
                                      onValueChange={(value) => handleSettingsUpdate({ translateXRange: value as [number, number] })}
                                      min={-200}
                                      max={200}
                                      step={5}
                                      className="[&_[role=slider]]:bg-blue-600"
                                    />
                                  </div>
                                )}
                                
                                {currentSettings.xTransformMode === 'value' && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Value: {currentSettings.xTransformValue}</Label>
                                    <Slider
                                      value={[currentSettings.xTransformValue]}
                                      onValueChange={([value]) => handleSettingsUpdate({ xTransformValue: value })}
                                      min={-200}
                                      max={200}
                                      step={5}
                                      className="[&_[role=slider]]:bg-blue-600"
                                    />
                                  </div>
                                )}
                                
                                {currentSettings.xTransformMode === 'incremental' && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Increment: {currentSettings.xTransformIncrement}</Label>
                                    <Slider
                                      value={[currentSettings.xTransformIncrement]}
                                      onValueChange={([value]) => handleSettingsUpdate({ xTransformIncrement: value })}
                                      min={-50}
                                      max={50}
                                      step={1}
                                      className="[&_[role=slider]]:bg-blue-600"
                                    />
                                  </div>
                                )}
                              </div>
                              
                              {/* Y Position Controls */}
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Label className="text-xs text-slate-300">Y</Label>
                                  <Select value={currentSettings.yTransformMode} onValueChange={(value) => handleSettingsUpdate({ yTransformMode: value as any })}>
                                    <SelectTrigger className="h-6 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                      <SelectItem value="value" className="text-slate-200 hover:bg-slate-700">Value</SelectItem>
                                      <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {currentSettings.yTransformMode === 'range' && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Range: {currentSettings.translateYRange?.[0] || -50} - {currentSettings.translateYRange?.[1] || 50}</Label>
                                    <Slider
                                      value={currentSettings.translateYRange || [-50, 50]}
                                      onValueChange={(value) => handleSettingsUpdate({ translateYRange: value as [number, number] })}
                                      min={-200}
                                      max={200}
                                      step={5}
                                      className="[&_[role=slider]]:bg-blue-600"
                                    />
                                  </div>
                                )}
                                
                                {currentSettings.yTransformMode === 'value' && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Value: {currentSettings.yTransformValue}</Label>
                                    <Slider
                                      value={[currentSettings.yTransformValue]}
                                      onValueChange={([value]) => handleSettingsUpdate({ yTransformValue: value })}
                                      min={-200}
                                      max={200}
                                      step={5}
                                      className="[&_[role=slider]]:bg-blue-600"
                                    />
                                  </div>
                                )}
                                
                                {currentSettings.yTransformMode === 'incremental' && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Increment: {currentSettings.yTransformIncrement}</Label>
                                    <Slider
                                      value={[currentSettings.yTransformIncrement]}
                                      onValueChange={([value]) => handleSettingsUpdate({ yTransformIncrement: value })}
                                      min={-50}
                                      max={50}
                                      step={1}
                                      className="[&_[role=slider]]:bg-blue-600"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Scale Enhanced Controls */}
                          <div className="space-y-3 p-3 bg-slate-800 rounded">
                            <div className="flex items-center space-x-2">
                              <Label className="text-sm font-medium text-slate-200">Scale</Label>
                              <Checkbox 
                                checked={currentSettings.maintainScaleAspectRatio}
                                onCheckedChange={(checked) => {
                                  handleSettingsUpdate({ maintainScaleAspectRatio: checked as boolean });
                                  // When linking, sync Y mode to match X mode
                                  if (checked) {
                                    handleSettingsUpdate({ 
                                      scaleYMode: currentSettings.scaleXMode,
                                      scaleYValue: currentSettings.scaleXValue,
                                      scaleYIncrement: currentSettings.scaleXIncrement
                                    });
                                  }
                                }}
                                className="border-slate-500 data-[state=checked]:bg-green-600"
                              />
                              <Label className="text-xs text-slate-300">Link X/Y</Label>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              {/* Scale X Controls */}
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Label className="text-xs text-slate-300">X</Label>
                                  <Select 
                                    value={currentSettings.scaleXMode} 
                                    onValueChange={(value) => {
                                      handleSettingsUpdate({ scaleXMode: value as any });
                                      // Sync Y when aspect ratio is linked
                                      if (currentSettings.maintainScaleAspectRatio) {
                                        handleSettingsUpdate({ scaleYMode: value as any });
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-6 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                      <SelectItem value="value" className="text-slate-200 hover:bg-slate-700">Value</SelectItem>
                                      <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {currentSettings.scaleXMode === 'range' && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Range: {currentSettings.scaleXRange?.[0] || 50}% - {currentSettings.scaleXRange?.[1] || 200}%</Label>
                                    <Slider
                                      value={currentSettings.scaleXRange || [50, 200]}
                                      onValueChange={(value) => {
                                        handleSettingsUpdate({ scaleXRange: value as [number, number] });
                                        if (currentSettings.maintainScaleAspectRatio) {
                                          handleSettingsUpdate({ scaleYRange: value as [number, number] });
                                        }
                                      }}
                                      min={10}
                                      max={300}
                                      step={5}
                                      className="[&_[role=slider]]:bg-green-600"
                                    />
                                  </div>
                                )}
                                
                                {currentSettings.scaleXMode === 'value' && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Value: {currentSettings.scaleXValue}%</Label>
                                    <Slider
                                      value={[currentSettings.scaleXValue]}
                                      onValueChange={([value]) => {
                                        handleSettingsUpdate({ scaleXValue: value });
                                        if (currentSettings.maintainScaleAspectRatio) {
                                          handleSettingsUpdate({ scaleYValue: value });
                                        }
                                      }}
                                      min={10}
                                      max={300}
                                      step={5}
                                      className="[&_[role=slider]]:bg-green-600"
                                    />
                                  </div>
                                )}
                                
                                {currentSettings.scaleXMode === 'incremental' && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Increment: {currentSettings.scaleXIncrement}%</Label>
                                    <Slider
                                      value={[currentSettings.scaleXIncrement]}
                                      onValueChange={([value]) => {
                                        handleSettingsUpdate({ scaleXIncrement: value });
                                        if (currentSettings.maintainScaleAspectRatio) {
                                          handleSettingsUpdate({ scaleYIncrement: value });
                                        }
                                      }}
                                      min={-50}
                                      max={50}
                                      step={1}
                                      className="[&_[role=slider]]:bg-green-600"
                                    />
                                  </div>
                                )}
                              </div>
                              
                              {/* Scale Y Controls */}
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Label className="text-xs text-slate-300">Y</Label>
                                  <Select 
                                    value={currentSettings.scaleYMode} 
                                    onValueChange={(value) => handleSettingsUpdate({ scaleYMode: value as any })}
                                    disabled={currentSettings.maintainScaleAspectRatio}
                                  >
                                    <SelectTrigger className={`h-6 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200 ${currentSettings.maintainScaleAspectRatio ? 'opacity-50' : ''}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                      <SelectItem value="value" className="text-slate-200 hover:bg-slate-700">Value</SelectItem>
                                      <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {currentSettings.scaleYMode === 'range' && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Range: {currentSettings.scaleYRange?.[0] || 50}% - {currentSettings.scaleYRange?.[1] || 200}%</Label>
                                    <Slider
                                      value={currentSettings.scaleYRange || [50, 200]}
                                      onValueChange={(value) => handleSettingsUpdate({ scaleYRange: value as [number, number] })}
                                      min={10}
                                      max={300}
                                      step={5}
                                      className="[&_[role=slider]]:bg-green-600"
                                      disabled={currentSettings.maintainScaleAspectRatio}
                                    />
                                  </div>
                                )}
                                
                                {currentSettings.scaleYMode === 'value' && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Value: {currentSettings.scaleYValue}%</Label>
                                    <Slider
                                      value={[currentSettings.scaleYValue]}
                                      onValueChange={([value]) => handleSettingsUpdate({ scaleYValue: value })}
                                      min={10}
                                      max={300}
                                      step={5}
                                      className="[&_[role=slider]]:bg-green-600"
                                      disabled={currentSettings.maintainScaleAspectRatio}
                                    />
                                  </div>
                                )}
                                
                                {currentSettings.scaleYMode === 'incremental' && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Increment: {currentSettings.scaleYIncrement}%</Label>
                                    <Slider
                                      value={[currentSettings.scaleYIncrement]}
                                      onValueChange={([value]) => handleSettingsUpdate({ scaleYIncrement: value })}
                                      min={-50}
                                      max={50}
                                      step={1}
                                      className="[&_[role=slider]]:bg-green-600"
                                      disabled={currentSettings.maintainScaleAspectRatio}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Rotation Enhanced Controls */}
                          <div className="space-y-3 p-3 bg-slate-800 rounded">
                            <Label className="text-sm font-medium text-slate-200">Rotation</Label>
                            
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Label className="text-xs text-slate-300">Mode</Label>
                                <Select value={currentSettings.rotationMode} onValueChange={(value) => handleSettingsUpdate({ rotationMode: value as any })}>
                                  <SelectTrigger className="h-6 w-24 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                    <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                    <SelectItem value="value" className="text-slate-200 hover:bg-slate-700">Value</SelectItem>
                                    <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {currentSettings.rotationMode === 'range' && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Range: {currentSettings.rotationRange?.[0] || 0}° - {currentSettings.rotationRange?.[1] || 360}°</Label>
                                  <Slider
                                    value={currentSettings.rotationRange || [0, 360]}
                                    onValueChange={(value) => handleSettingsUpdate({ rotationRange: value as [number, number] })}
                                    min={0}
                                    max={360}
                                    step={5}
                                    className="[&_[role=slider]]:bg-orange-600"
                                  />
                                </div>
                              )}
                              
                              {currentSettings.rotationMode === 'value' && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Value: {currentSettings.rotationValue}°</Label>
                                  <Slider
                                    value={[currentSettings.rotationValue]}
                                    onValueChange={([value]) => handleSettingsUpdate({ rotationValue: value })}
                                    min={0}
                                    max={360}
                                    step={5}
                                    className="[&_[role=slider]]:bg-orange-600"
                                  />
                                </div>
                              )}
                              
                              {currentSettings.rotationMode === 'incremental' && (
                                <div className="space-y-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Increment: {currentSettings.rotationIncrement}°</Label>
                                    <Slider
                                      value={[currentSettings.rotationIncrement]}
                                      onValueChange={([value]) => handleSettingsUpdate({ rotationIncrement: value })}
                                      min={-180}
                                      max={180}
                                      step={15}
                                      className="[&_[role=slider]]:bg-orange-600"
                                    />
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <Checkbox 
                                      checked={currentSettings.rotationModulationEnabled}
                                      onCheckedChange={(checked) => handleSettingsUpdate({ rotationModulationEnabled: checked as boolean })}
                                      className="border-slate-500 data-[state=checked]:bg-orange-600"
                                    />
                                    <Label className="text-xs text-slate-300">Enable Modulation</Label>
                                  </div>
                                  
                                  {currentSettings.rotationModulationEnabled && (
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Modulation: {currentSettings.rotationModulation}° (reset cycle)</Label>
                                      <Slider
                                        value={[currentSettings.rotationModulation]}
                                        onValueChange={([value]) => handleSettingsUpdate({ rotationModulation: value })}
                                        min={90}
                                        max={720}
                                        step={30}
                                        className="[&_[role=slider]]:bg-orange-600"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Transform Randomization Scaling */}
                          <div className="space-y-3 p-3 bg-slate-900 rounded border border-slate-600">
                            <Label className="text-sm font-medium text-slate-200">Transform Randomization Scaling</Label>
                            <p className="text-xs text-slate-400">Control how much additional randomization is applied to transform modes</p>
                            
                            <div className="space-y-3">
                              
                              {/* Scale Randomization Scale */}
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Scale Randomization: {currentSettings.scaleRandomizationScale}%</Label>
                                <Slider
                                  value={[currentSettings.scaleRandomizationScale]}
                                  onValueChange={([value]) => handleSettingsUpdate({ scaleRandomizationScale: value })}
                                  min={0}
                                  max={100}
                                  step={5}
                                  className="[&_[role=slider]]:bg-purple-600"
                                />
                                <p className="text-xs text-slate-400">0% = no randomization, 100% = full randomization applied to scale transforms (range: 0 to 1)</p>
                              </div>
                              
                              {/* Rotation Randomization Scale */}
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Rotation Randomization: {currentSettings.rotationRandomizationScale}%</Label>
                                <Slider
                                  value={[currentSettings.rotationRandomizationScale]}
                                  onValueChange={([value]) => handleSettingsUpdate({ rotationRandomizationScale: value })}
                                  min={0}
                                  max={100}
                                  step={5}
                                  className="[&_[role=slider]]:bg-purple-600"
                                />
                                <p className="text-xs text-slate-400">0% = no randomization, 100% = full randomization applied to rotation transforms (range: 0 to 1)</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Transform Origin */}
                          <div className="space-y-3 p-3 bg-slate-800 rounded">
                            <Label className="text-sm font-medium text-slate-200">Transform Origin</Label>
                            <p className="text-xs text-slate-400">Set the point from which transforms (rotation, scale, position) are applied</p>
                            
                            <div className="space-y-3">
                              {/* Mode Selector */}
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Mode</Label>
                                <Select 
                                  value={currentSettings.transformOriginMode} 
                                  onValueChange={(value) => handleSettingsUpdate({ transformOriginMode: value as 'define' | 'predefined' })}
                                >
                                  <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-slate-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                    <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define (X, Y)</SelectItem>
                                    <SelectItem value="predefined" className="text-slate-200 hover:bg-slate-700">Predefined</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {/* Define Mode - X and Y Coordinates */}
                              {currentSettings.transformOriginMode === 'define' && (
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-300">X: {currentSettings.transformOriginX}</Label>
                                    <Slider
                                      value={[currentSettings.transformOriginX]}
                                      onValueChange={([value]) => handleSettingsUpdate({ transformOriginX: value })}
                                      min={-500}
                                      max={500}
                                      step={10}
                                      className="[&_[role=slider]]:bg-cyan-600"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-300">Y: {currentSettings.transformOriginY}</Label>
                                    <Slider
                                      value={[currentSettings.transformOriginY]}
                                      onValueChange={([value]) => handleSettingsUpdate({ transformOriginY: value })}
                                      min={-500}
                                      max={500}
                                      step={10}
                                      className="[&_[role=slider]]:bg-cyan-600"
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {/* Predefined Mode - Alignment Options */}
                              {currentSettings.transformOriginMode === 'predefined' && (
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-300">Alignment Point</Label>
                                  <Select 
                                    value={currentSettings.transformOriginPredefined} 
                                    onValueChange={(value) => handleSettingsUpdate({ transformOriginPredefined: value as any })}
                                  >
                                    <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="center" className="text-slate-200 hover:bg-slate-700">Center</SelectItem>
                                      <SelectItem value="top-left" className="text-slate-200 hover:bg-slate-700">Top Left (Corner)</SelectItem>
                                      <SelectItem value="top-center" className="text-slate-200 hover:bg-slate-700">Top Center (Midpoint)</SelectItem>
                                      <SelectItem value="top-right" className="text-slate-200 hover:bg-slate-700">Top Right (Corner)</SelectItem>
                                      <SelectItem value="center-left" className="text-slate-200 hover:bg-slate-700">Left Center (Midpoint)</SelectItem>
                                      <SelectItem value="center-right" className="text-slate-200 hover:bg-slate-700">Right Center (Midpoint)</SelectItem>
                                      <SelectItem value="bottom-left" className="text-slate-200 hover:bg-slate-700">Bottom Left (Corner)</SelectItem>
                                      <SelectItem value="bottom-center" className="text-slate-200 hover:bg-slate-700">Bottom Center (Midpoint)</SelectItem>
                                      <SelectItem value="bottom-right" className="text-slate-200 hover:bg-slate-700">Bottom Right (Corner)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-slate-600" />

              {/* Shape Effects */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={currentSettings.shapeEffectsEnabled}
                    onCheckedChange={(checked) => handleSettingsUpdate({ shapeEffectsEnabled: checked as boolean })}
                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <Label className="font-medium text-slate-200">Shape Effects</Label>
                </div>
                
                {currentSettings.shapeEffectsEnabled && (
                  <div className="ml-6 space-y-4">
                    {/* Blur Effects Section */}
                    <div className="space-y-3 p-3 bg-slate-800 rounded">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          checked={currentSettings.blurEnabled}
                          onCheckedChange={(checked) => handleSettingsUpdate({ blurEnabled: checked as boolean })}
                          className="border-slate-500 data-[state=checked]:bg-blue-600"
                        />
                        <Label className="text-sm font-medium text-slate-200">Blur</Label>
                        <Select value={currentSettings.blurMode} onValueChange={(value) => handleSettingsUpdate({ blurMode: value as any })}>
                          <SelectTrigger className="h-7 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                            <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                            <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {currentSettings.blurEnabled && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-300">Blur Probability: {currentSettings.blurProbability}%</Label>
                            <Slider
                              value={[currentSettings.blurProbability]}
                              onValueChange={([value]) => handleSettingsUpdate({ blurProbability: value })}
                              max={100}
                              step={5}
                              className="[&_[role=slider]]:bg-purple-600"
                            />
                          </div>

                          {currentSettings.blurMode === 'range' && (
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-300">Blur Range: {currentSettings.blurRange?.[0] || 2}px - {currentSettings.blurRange?.[1] || 15}px</Label>
                              <Slider
                                value={currentSettings.blurRange || [2, 15]}
                                onValueChange={(value) => handleSettingsUpdate({ blurRange: value as [number, number] })}
                                min={0}
                                max={50}
                                step={1}
                                className="[&_[role=slider]]:bg-purple-600"
                              />
                            </div>
                          )}

                          {currentSettings.blurMode === 'define' && (
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-300">Blur Radius: {currentSettings.blurDefine || 8}px</Label>
                              <Slider
                                value={[currentSettings.blurDefine || 8]}
                                onValueChange={([value]) => handleSettingsUpdate({ blurDefine: value })}
                                min={0}
                                max={50}
                                step={1}
                                className="[&_[role=slider]]:bg-purple-600"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Future effects can be added here */}
                    <div className="p-3 bg-slate-700/50 rounded border border-slate-600">
                      <p className="text-xs text-slate-400">
                        Future effects like drop shadow and glow will be added here.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-slate-600" />

              {/* Color Harmony */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={currentSettings.colorHarmonyEnabled}
                    onCheckedChange={(checked) => handleSettingsUpdate({ colorHarmonyEnabled: checked as boolean })}
                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <Label className="font-medium text-slate-200">Color Harmony</Label>
                </div>
                
                {currentSettings.colorHarmonyEnabled && (
                  <div className="ml-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Harmony Type</Label>
                        <Select 
                          value={currentSettings.harmonyType}
                          onValueChange={(value) => handleSettingsUpdate({ harmonyType: value as any })}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                            <SelectItem value="monochromatic" className="text-slate-200 hover:bg-slate-700">Monochromatic</SelectItem>
                            <SelectItem value="analogous" className="text-slate-200 hover:bg-slate-700">Analogous</SelectItem>
                            <SelectItem value="complementary" className="text-slate-200 hover:bg-slate-700">Complementary</SelectItem>
                            <SelectItem value="triadic" className="text-slate-200 hover:bg-slate-700">Triadic</SelectItem>
                            <SelectItem value="split-complementary" className="text-slate-200 hover:bg-slate-700">Split Complementary</SelectItem>
                            <SelectItem value="tetradic" className="text-slate-200 hover:bg-slate-700">Tetradic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Base Color</Label>
                        <Input
                          type="color"
                          value={currentSettings.baseColor}
                          onChange={(e) => handleSettingsUpdate({ baseColor: e.target.value })}
                          className="w-full h-8 p-1 bg-slate-800 border-slate-600"
                        />
                      </div>
                    </div>

                    {/* Color Harmony Explanation */}
                    <div className="p-3 bg-slate-800/50 rounded border border-slate-600">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-blue-300">
                          {currentSettings.harmonyType === 'monochromatic' && 'Monochromatic Harmony'}
                          {currentSettings.harmonyType === 'analogous' && 'Analogous Harmony'}
                          {currentSettings.harmonyType === 'complementary' && 'Complementary Harmony'}
                          {currentSettings.harmonyType === 'triadic' && 'Triadic Harmony'}
                          {currentSettings.harmonyType === 'split-complementary' && 'Split Complementary Harmony'}
                          {currentSettings.harmonyType === 'tetradic' && 'Tetradic Harmony'}
                        </Label>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {currentSettings.harmonyType === 'monochromatic' && 
                            'Uses variations of a single hue by adjusting lightness and saturation. Creates cohesive, calming color schemes with subtle tonal variations from your base color.'
                          }
                          {currentSettings.harmonyType === 'analogous' && 
                            'Uses colors adjacent to your base color on the color wheel (±30°). Creates harmonious, natural-feeling color schemes like sunset or forest themes.'
                          }
                          {currentSettings.harmonyType === 'complementary' && 
                            'Uses your base color plus its opposite (180° away) on the color wheel. Creates high contrast and vibrant, eye-catching combinations.'
                          }
                          {currentSettings.harmonyType === 'triadic' && 
                            'Uses three colors evenly spaced around the color wheel (120° apart). Creates balanced, vibrant schemes while maintaining harmony.'
                          }
                          {currentSettings.harmonyType === 'split-complementary' && 
                            'Uses your base color plus the two colors adjacent to its complement. Offers strong contrast like complementary but with more nuanced color relationships.'
                          }
                          {currentSettings.harmonyType === 'tetradic' && 
                            'Uses four colors forming a rectangle on the color wheel. Creates rich, complex color schemes with two complementary pairs.'
                          }
                        </p>
                      </div>
                    </div>

                    {/* Harmony-specific Controls */}
                    {currentSettings.harmonyType === 'monochromatic' && (
                      <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-300">Lightness Steps: {currentSettings.monochromaticSettings?.lightnessSteps || 5}</Label>
                            <Slider
                              value={[currentSettings.monochromaticSettings?.lightnessSteps || 5]}
                              onValueChange={([value]) => handleSettingsUpdate({
                                monochromaticSettings: { ...currentSettings.monochromaticSettings, lightnessSteps: value }
                              })}
                              min={3}
                              max={10}
                              step={1}
                              className="[&_[role=slider]]:bg-blue-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-300">Saturation Steps: {currentSettings.monochromaticSettings?.saturationSteps || 3}</Label>
                            <Slider
                              value={[currentSettings.monochromaticSettings?.saturationSteps || 3]}
                              onValueChange={([value]) => handleSettingsUpdate({
                                monochromaticSettings: { ...currentSettings.monochromaticSettings, saturationSteps: value }
                              })}
                              min={2}
                              max={7}
                              step={1}
                              className="[&_[role=slider]]:bg-blue-600"
                            />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={currentSettings.monochromaticSettings?.includeNeutrals || false}
                            onCheckedChange={(checked) => handleSettingsUpdate({
                              monochromaticSettings: { ...currentSettings.monochromaticSettings, includeNeutrals: checked as boolean }
                            })}
                            className="border-slate-500 data-[state=checked]:bg-blue-600 scale-75"
                          />
                          <Label className="text-xs text-slate-300">Include Neutral Grays</Label>
                        </div>
                      </div>
                    )}

                    {currentSettings.harmonyType === 'analogous' && (
                      <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-300">Hue Range: ±{currentSettings.analogousSettings?.hueRange || 60}°</Label>
                            <Slider
                              value={[currentSettings.analogousSettings?.hueRange || 60]}
                              onValueChange={([value]) => handleSettingsUpdate({
                                analogousSettings: { ...currentSettings.analogousSettings, hueRange: value }
                              })}
                              min={30}
                              max={90}
                              step={15}
                              className="[&_[role=slider]]:bg-blue-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-300">Color Count: {currentSettings.analogousSettings?.colorCount || 3}</Label>
                            <Slider
                              value={[currentSettings.analogousSettings?.colorCount || 3]}
                              onValueChange={([value]) => handleSettingsUpdate({
                                analogousSettings: { ...currentSettings.analogousSettings, colorCount: value }
                              })}
                              min={2}
                              max={5}
                              step={1}
                              className="[&_[role=slider]]:bg-blue-600"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {currentSettings.harmonyType === 'complementary' && (
                      <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={currentSettings.complementarySettings?.includeNearComplements || false}
                              onCheckedChange={(checked) => handleSettingsUpdate({
                                complementarySettings: { ...currentSettings.complementarySettings, includeNearComplements: checked as boolean }
                              })}
                              className="border-slate-500 data-[state=checked]:bg-blue-600 scale-75"
                            />
                            <Label className="text-xs text-slate-300">Include Near-Complements</Label>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-300">Complement Offset: {currentSettings.complementarySettings?.complementOffset || 0}°</Label>
                            <Slider
                              value={[currentSettings.complementarySettings?.complementOffset || 0]}
                              onValueChange={([value]) => handleSettingsUpdate({
                                complementarySettings: { ...currentSettings.complementarySettings, complementOffset: value }
                              })}
                              min={-30}
                              max={30}
                              step={5}
                              className="[&_[role=slider]]:bg-blue-600"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {currentSettings.harmonyType === 'triadic' && (
                      <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-300">Rotation Offset: {currentSettings.triadicSettings?.rotationOffset || 0}°</Label>
                            <Slider
                              value={[currentSettings.triadicSettings?.rotationOffset || 0]}
                              onValueChange={([value]) => handleSettingsUpdate({
                                triadicSettings: { ...currentSettings.triadicSettings, rotationOffset: value }
                              })}
                              min={-60}
                              max={60}
                              step={10}
                              className="[&_[role=slider]]:bg-blue-600"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={currentSettings.triadicSettings?.useEqualSpacing || true}
                              onCheckedChange={(checked) => handleSettingsUpdate({
                                triadicSettings: { ...currentSettings.triadicSettings, useEqualSpacing: checked as boolean }
                              })}
                              className="border-slate-500 data-[state=checked]:bg-blue-600 scale-75"
                            />
                            <Label className="text-xs text-slate-300">Equal 120° Spacing</Label>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentSettings.harmonyType === 'split-complementary' && (
                      <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-300">Split Angle: ±{currentSettings.splitComplementarySettings?.splitAngle || 30}°</Label>
                            <Slider
                              value={[currentSettings.splitComplementarySettings?.splitAngle || 30]}
                              onValueChange={([value]) => handleSettingsUpdate({
                                splitComplementarySettings: { ...currentSettings.splitComplementarySettings, splitAngle: value }
                              })}
                              min={15}
                              max={60}
                              step={5}
                              className="[&_[role=slider]]:bg-blue-600"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={currentSettings.splitComplementarySettings?.balanceWeights || true}
                              onCheckedChange={(checked) => handleSettingsUpdate({
                                splitComplementarySettings: { ...currentSettings.splitComplementarySettings, balanceWeights: checked as boolean }
                              })}
                              className="border-slate-500 data-[state=checked]:bg-blue-600 scale-75"
                            />
                            <Label className="text-xs text-slate-300">Balance Color Weights</Label>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentSettings.harmonyType === 'tetradic' && (
                      <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-600">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={currentSettings.tetradicSettings?.squareHarmony || true}
                              onCheckedChange={(checked) => handleSettingsUpdate({
                                tetradicSettings: { ...currentSettings.tetradicSettings, squareHarmony: checked as boolean }
                              })}
                              className="border-slate-500 data-[state=checked]:bg-blue-600 scale-75"
                            />
                            <Label className="text-xs text-slate-300">Square Harmony (90°)</Label>
                          </div>
                          {!currentSettings.tetradicSettings?.squareHarmony && (
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-300">Rectangle Ratio: {currentSettings.tetradicSettings?.rectangleRatio || 60}°</Label>
                              <Slider
                                value={[currentSettings.tetradicSettings?.rectangleRatio || 60]}
                                onValueChange={([value]) => handleSettingsUpdate({
                                  tetradicSettings: { ...currentSettings.tetradicSettings, rectangleRatio: value }
                                })}
                                min={30}
                                max={90}
                                step={10}
                                className="[&_[role=slider]]:bg-blue-600"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Common Harmony Controls */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-300">Saturation: {currentSettings.saturationRange?.[0] || 0}% - {currentSettings.saturationRange?.[1] || 100}%</Label>
                        <Slider
                          value={currentSettings.saturationRange || [0, 100]}
                          onValueChange={(value) => handleSettingsUpdate({ saturationRange: value as [number, number] })}
                          max={100}
                          step={1}
                          className="[&_[role=slider]]:bg-blue-600"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-300">Lightness: {currentSettings.lightnessRange?.[0] || 0}% - {currentSettings.lightnessRange?.[1] || 100}%</Label>
                        <Slider
                          value={currentSettings.lightnessRange || [0, 100]}
                          onValueChange={(value) => handleSettingsUpdate({ lightnessRange: value as [number, number] })}
                          max={100}
                          step={1}
                          className="[&_[role=slider]]:bg-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-slate-600" />

              {/* Physics Simulation - NOT IMPLEMENTED */}
              <div className="space-y-1 opacity-30 pointer-events-none">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={false}
                    disabled={true}
                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <Label className="font-medium text-slate-400">Physics Simulation <span className="text-xs text-red-400">(NOT IMPLEMENTED)</span></Label>
                </div>
                
                {currentSettings.physicsEnabled && (
                  <div className="ml-6 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-300">Physics Type</Label>
                      <Select 
                        value={currentSettings.physicsType}
                        onValueChange={(value) => handleSettingsUpdate({ physicsType: value as any })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                          <SelectItem value="none" className="text-slate-200 hover:bg-slate-700">None</SelectItem>
                          <SelectItem value="gravity" className="text-slate-200 hover:bg-slate-700">Gravity</SelectItem>
                          <SelectItem value="magnetic" className="text-slate-200 hover:bg-slate-700">Magnetic</SelectItem>
                          <SelectItem value="collision" className="text-slate-200 hover:bg-slate-700">Collision Avoidance</SelectItem>
                          <SelectItem value="flocking" className="text-slate-200 hover:bg-slate-700">Flocking</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {currentSettings.physicsType === 'gravity' && (
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Gravity Strength: {currentSettings.gravityStrength}%</Label>
                        <Slider
                          value={[currentSettings.gravityStrength]}
                          onValueChange={([value]) => handleSettingsUpdate({ gravityStrength: value })}
                          min={0}
                          max={100}
                          step={1}
                          className="[&_[role=slider]]:bg-blue-600"
                        />
                      </div>
                    )}
                    
                    {currentSettings.physicsType === 'collision' && (
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Collision Distance: {currentSettings.collisionDistance}px</Label>
                        <Slider
                          value={[currentSettings.collisionDistance]}
                          onValueChange={([value]) => handleSettingsUpdate({ collisionDistance: value })}
                          min={5}
                          max={100}
                          step={1}
                          className="[&_[role=slider]]:bg-blue-600"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator className="bg-slate-600" />

              {/* Temporal Variation - DISABLED BY DESIGN */}
              <div className="space-y-3 opacity-50 pointer-events-none">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={false}
                    disabled={true}
                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <Label className="font-medium text-slate-400">Temporal Variation <span className="text-xs text-yellow-400">(DISABLED BY DESIGN)</span></Label>
                </div>
                
                {currentSettings.temporalEnabled && (
                  <div className="ml-6 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-300">Evolution Mode</Label>
                      <Select 
                        value={currentSettings.evolutionMode}
                        onValueChange={(value) => handleSettingsUpdate({ evolutionMode: value as any })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                          <SelectItem value="none" className="text-slate-200 hover:bg-slate-700">None</SelectItem>
                          <SelectItem value="linear" className="text-slate-200 hover:bg-slate-700">Linear Progression</SelectItem>
                          <SelectItem value="oscillation" className="text-slate-200 hover:bg-slate-700">Oscillation</SelectItem>
                          <SelectItem value="chaos" className="text-slate-200 hover:bg-slate-700">Chaos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-300">Seed Increment: {currentSettings.seedIncrement}</Label>
                      <Slider
                        value={[currentSettings.seedIncrement]}
                        onValueChange={([value]) => handleSettingsUpdate({ seedIncrement: value })}
                        min={1}
                        max={100}
                        step={1}
                        className="[&_[role=slider]]:bg-blue-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-slate-700 bg-slate-900">
              <div className="flex gap-2">
                <Button 
                  onClick={resetToDefaults}
                  variant="outline"
                  className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
                >
                  Reset
                </Button>
                <Button 
                  onClick={applySettings}
                  disabled={isExportDisabled() || isApplying}
                  className={`${
                    isExportDisabled()
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      : isApplying
                      ? 'bg-green-600 text-white cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  } transition-colors duration-200`}
                  data-testid="button-apply"
                >
                  <div className="flex items-center space-x-2">
                    {isExportDisabled() ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : isApplying ? (
                      <>
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Applying...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Apply</span>
                      </>
                    )}
                  </div>
                </Button>
              </div>
              <Button 
                onClick={() => setIsOpen(false)} 
                variant="outline"
                className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
