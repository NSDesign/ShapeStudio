import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Settings, RotateCcw, X, ChevronDown, AlertTriangle, CheckCircle, AlertCircle, Plus, Minus, Info, Layers } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BatchConfigSettings, defaultBatchConfigSettings, BlendMode, ShapeCountMode, SupportedShapeType, GenerationSet, DEFAULT_GRID_OFFSETS, GridOffsetsConfig } from '@shared/schema';
import { ScatterSettings, ShapeType, Artboard, getAvailableShapeSpecificSortOptions } from '@/lib/shapeTypes';
import { GenerationSetsDropdown } from './GenerationSetsDropdown';
import ApiCallGenerator from './ApiCallGenerator';
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
  
  // Props for ApiCallGenerator
  artboards?: Artboard[];
  activeArtboard?: string;
  exportBatchModeEnabled?: boolean;
  exportSaveProjectFiles?: boolean;
  exportBatchCount?: number;
  exportShapeCountRange?: [number, number];
  exportQuality?: number;
  exportScale?: number;
  exportFormat?: string;
  exportScope?: 'all' | 'selected' | 'artboard';
  packageAsZip?: boolean;
  exportAllImages?: boolean;
  selectedImageIndices?: number[];
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
  updateGenerationSetPartial,
  
  // ApiCallGenerator props
  artboards = [],
  activeArtboard = '',
  exportBatchModeEnabled = true,
  exportSaveProjectFiles = false,
  exportBatchCount = 5,
  exportShapeCountRange,
  exportQuality = 92,
  exportScale = 1,
  exportFormat = "png",
  exportScope = "all",
  packageAsZip = false,
  exportAllImages = true,
  selectedImageIndices = []
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

  // Calculate available shape-specific sort options based on current generation set
  const availableShapeSpecificSortOptions = React.useMemo(() => {
    // Get current generation set's shape types
    const currentSet = generationSets.find(set => set.id === currentGenerationSetId);
    const shapeTypes = currentSet?.enabledShapeTypes || [];
    
    // Get available sort options
    return getAvailableShapeSpecificSortOptions(shapeTypes);
  }, [generationSets, currentGenerationSetId]);

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

  // Initialize settings with backward compatibility migration
  useEffect(() => {
    const mergedSettings = { ...defaultSettings, ...settings };
    
    // Migrate legacy 'auto' spacing mode to 'auto-centered'
    if ((mergedSettings.gridSpacingXMode as any) === 'auto') {
      mergedSettings.gridSpacingXMode = 'auto-centered';
      // Set default values for new margin controls if not present
      if (mergedSettings.gridMarginEnabled === undefined) {
        mergedSettings.gridMarginEnabled = false;
      }
      if (mergedSettings.gridMarginValue === undefined) {
        mergedSettings.gridMarginValue = 50;
      }
    }
    
    if ((mergedSettings.gridSpacingYMode as any) === 'auto') {
      mergedSettings.gridSpacingYMode = 'auto-centered';
      // Set default values for new margin controls if not present
      if (mergedSettings.gridMarginEnabled === undefined) {
        mergedSettings.gridMarginEnabled = false;
      }
      if (mergedSettings.gridMarginValue === undefined) {
        mergedSettings.gridMarginValue = 50;
      }
    }
    
    setCurrentSettings(mergedSettings);
  }, [settings]);

  const handleSettingsUpdate = useCallback((updates: Partial<BatchConfigSettings> | ((prev: BatchConfigSettings) => Partial<BatchConfigSettings>)) => {
    console.log('[BatchConfigDialog] Settings update triggered:', {
      updates: typeof updates === 'function' ? 'functional updater' : updates,
      currentDialogOpen: isOpen,
      timestamp: new Date().toISOString()
    });
    
    setCurrentSettings(prevSettings => {
      // Resolve updates if it's a function
      const resolvedUpdates = typeof updates === 'function' ? updates(prevSettings) : updates;
      
      // Handle gradient probability auto-balancing
      if ('fillGradientLinearProbability' in resolvedUpdates || 'fillGradientRadialProbability' in resolvedUpdates || 'fillGradientConicProbability' in resolvedUpdates) {
        const newSettings = { ...prevSettings, ...resolvedUpdates };
        
        // Get the current probabilities
        const linear = newSettings.fillGradientLinearProbability;
        const radial = newSettings.fillGradientRadialProbability;
        const conic = newSettings.fillGradientConicProbability;
        
        // Auto-balance to 100%
        const total = linear + radial + conic;
        if (total !== 100 && total > 0) {
          // Determine which property was changed
          const changedKey = Object.keys(resolvedUpdates)[0];
          const changedValue = resolvedUpdates[changedKey as keyof typeof resolvedUpdates] as number;
          
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
      } else {
        // Only update internal state, don't call parent callback immediately
        return { ...prevSettings, ...resolvedUpdates };
      }
    });
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
              ? 'h-8 w-8 p-0 flex items-center justify-center' 
              : 'h-6 w-full justify-start gap-2'
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
              ? 'h-8 w-8 p-0 flex items-center justify-center' 
              : 'h-6 w-full justify-start gap-2'
          }`}
          onClick={onOpenGenerationSetsManager}
          disabled={!onOpenGenerationSetsManager}
          data-testid="button-sets-manager"
          title="Open Sets Manager"
        >
          <Layers className="w-4 h-4" />
          {!sidebarCollapsed && <span className="text-sm">Sets Manager</span>}
        </Button>
        
        {/* Separator */}
        <Separator className="bg-slate-600" />
        
        {/* API Call Generator Button */}
        <ApiCallGenerator 
          enabledShapeTypes={enabledShapeTypes}
          scatterSettings={scatterSettings || {
            shapeCountMode: 'fixed',
            fixedShapeCount: 10,
            minCount: 5,
            maxCount: 15,
            shapeSpecific: {}
          } as ScatterSettings}
          generationConfigSettings={settings}
          exportBatchModeEnabled={exportBatchModeEnabled}
          exportSaveProjectFiles={exportSaveProjectFiles}
          exportBatchCount={exportBatchCount}
          packageAsZip={packageAsZip}
          exportAllImages={exportAllImages}
          selectedImageIndices={selectedImageIndices}
          exportShapeCountRange={exportShapeCountRange}
          exportQuality={exportQuality}
          exportScale={exportScale}
          exportFormat={exportFormat}
          exportScope={exportScope}
          artboards={artboards}
          activeArtboard={activeArtboard}
          className={sidebarCollapsed ? '' : 'w-full'}
          sidebarCollapsed={sidebarCollapsed}
        />
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
              {(generationSets.length > 0 || onCreateGenerationSet) && scatterSettings && (
                <GenerationSetsDropdown
                  currentSetId={currentGenerationSetId}
                  generationSets={generationSets}
                  enabledShapeTypes={enabledShapeTypes}
                  scatterSettings={scatterSettings}
                  batchConfigSettings={currentSettings}
                  shapeCountMode={shapeCountMode}
                  shapeCountFixed={shapeCountFixed}
                  shapeCountRange={shapeCountRange}
                  onSetChange={(setId) => onCurrentGenerationSetChange?.(setId)}
                  onCreateSet={(name) => onCreateGenerationSet?.(name)}
                  onDeleteSet={(setId) => onDeleteGenerationSet?.(setId)}
                  onOpenManager={() => onOpenGenerationSetsManager?.()}
                  enabled={generationSetsEnabled}
                  variant="boxed"
                  size="sm"
                  className="bg-slate-800/50"
                  data-testid="batch-dialog-generation-sets"
                />
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
                          <SelectItem value="auto-distribute" className="text-slate-200 hover:bg-slate-700">Auto Distribute</SelectItem>
                          <SelectItem value="wave" className="text-slate-200 hover:bg-slate-700">Wave</SelectItem>
                          <SelectItem value="ellipse" className="text-slate-200 hover:bg-slate-700">Ellipse</SelectItem>
                          <SelectItem value="spiral" className="text-slate-200 hover:bg-slate-700">Spiral</SelectItem>
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
                        
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">X Spacing</Label>
                            <Select 
                              value={((currentSettings.gridSpacingXMode as any) === 'auto' ? 'auto-centered' : currentSettings.gridSpacingXMode) || 'define'}
                              onValueChange={(value) => handleSettingsUpdate({ gridSpacingXMode: value as 'define' | 'auto-centered' | 'auto-edge-to-edge' })}
                            >
                              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200" data-testid="select-x-spacing">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                <SelectItem value="auto-centered" className="text-slate-200 hover:bg-slate-700">Auto - Centered</SelectItem>
                                <SelectItem value="auto-edge-to-edge" className="text-slate-200 hover:bg-slate-700">Auto - Edge to Edge</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {(currentSettings.gridSpacingXMode || 'define') === 'define' && (
                            <div className="space-y-3 pl-2 border-l-2 border-slate-700">
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Grid Start X: {currentSettings.gridStartX || 0}px</Label>
                                <Slider
                                  value={[currentSettings.gridStartX || 0]}
                                  onValueChange={([value]) => handleSettingsUpdate({ gridStartX: value })}
                                  min={-500}
                                  max={500}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Column Offset: {currentSettings.gridColumnOffset}px</Label>
                                <Slider
                                  value={[currentSettings.gridColumnOffset]}
                                  onValueChange={([value]) => handleSettingsUpdate({ gridColumnOffset: value })}
                                  min={0}
                                  max={300}
                                  step={5}
                                  className="[&_[role=slider]]:bg-green-600"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Y Spacing</Label>
                            <Select 
                              value={((currentSettings.gridSpacingYMode as any) === 'auto' ? 'auto-centered' : currentSettings.gridSpacingYMode) || 'define'}
                              onValueChange={(value) => handleSettingsUpdate({ gridSpacingYMode: value as 'define' | 'auto-centered' | 'auto-edge-to-edge' })}
                            >
                              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200" data-testid="select-y-spacing">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                <SelectItem value="auto-centered" className="text-slate-200 hover:bg-slate-700">Auto - Centered</SelectItem>
                                <SelectItem value="auto-edge-to-edge" className="text-slate-200 hover:bg-slate-700">Auto - Edge to Edge</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {(currentSettings.gridSpacingYMode || 'define') === 'define' && (
                            <div className="space-y-3 pl-2 border-l-2 border-slate-700">
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Grid Start Y: {currentSettings.gridStartY || 0}px</Label>
                                <Slider
                                  value={[currentSettings.gridStartY || 0]}
                                  onValueChange={([value]) => handleSettingsUpdate({ gridStartY: value })}
                                  min={-500}
                                  max={500}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Row Offset: {currentSettings.gridRowOffset}px</Label>
                                <Slider
                                  value={[currentSettings.gridRowOffset]}
                                  onValueChange={([value]) => handleSettingsUpdate({ gridRowOffset: value })}
                                  min={0}
                                  max={300}
                                  step={5}
                                  className="[&_[role=slider]]:bg-green-600"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {((currentSettings.gridSpacingXMode === 'auto-centered' || (currentSettings.gridSpacingXMode as any) === 'auto') || 
                          (currentSettings.gridSpacingYMode === 'auto-centered' || (currentSettings.gridSpacingYMode as any) === 'auto')) && (
                          <div className="space-y-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm text-slate-300">Custom Margin</Label>
                              <Switch
                                checked={currentSettings.gridMarginEnabled || false}
                                onCheckedChange={(checked: boolean) => handleSettingsUpdate({ gridMarginEnabled: checked })}
                                data-testid="switch-custom-margin"
                              />
                            </div>
                            {currentSettings.gridMarginEnabled && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Margin: {currentSettings.gridMarginValue || 50}px</Label>
                                <Slider
                                  value={[currentSettings.gridMarginValue || 50]}
                                  onValueChange={([value]) => handleSettingsUpdate({ gridMarginValue: value })}
                                  min={0}
                                  max={200}
                                  step={5}
                                  className="[&_[role=slider]]:bg-orange-600"
                                />
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Grid Offsets Section */}
                        <div className="space-y-3 border border-slate-600 rounded-lg p-3 bg-slate-800/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                checked={currentSettings.gridOffsets?.enabled ?? false}
                                onCheckedChange={(checked) => handleSettingsUpdate((prev) => ({ 
                                  gridOffsets: { 
                                    ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                    enabled: checked as boolean 
                                  } 
                                }))}
                                className="border-slate-500 data-[state=checked]:bg-cyan-600"
                                data-testid="checkbox-grid-offsets-enabled"
                              />
                              <Label className="text-sm font-medium text-slate-200">Grid Offsets</Label>
                            </div>
                            <span className="text-xs text-slate-400">Alternating row/column offsets</span>
                          </div>
                          
                          {(currentSettings.gridOffsets?.enabled ?? false) && (
                            <div className="space-y-4 mt-3">
                              {/* Row Offset Controls */}
                              <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                                <div className="flex items-center space-x-2">
                                  <Checkbox 
                                    checked={currentSettings.gridOffsets?.row?.enabled ?? false}
                                    onCheckedChange={(checked) => handleSettingsUpdate((prev) => ({ 
                                      gridOffsets: { 
                                        ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                        row: {
                                          ...(prev.gridOffsets?.row || DEFAULT_GRID_OFFSETS.row),
                                          enabled: checked as boolean
                                        }
                                      } 
                                    }))}
                                    className="border-slate-500 data-[state=checked]:bg-green-600"
                                    data-testid="checkbox-grid-row-offset-enabled"
                                  />
                                  <Label className="text-xs font-medium text-slate-300">Row Offset</Label>
                                </div>
                                
                                {(currentSettings.gridOffsets?.row?.enabled ?? false) && (
                                  <div className="grid grid-cols-3 gap-2 mt-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Amount (px)</Label>
                                      <Input
                                        type="number"
                                        value={currentSettings.gridOffsets?.row?.amount ?? 0}
                                        onChange={(e) => {
                                          const newAmount = parseInt(e.target.value) || 0;
                                          handleSettingsUpdate((prev) => ({ 
                                            gridOffsets: { 
                                              ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                              row: {
                                                ...(prev.gridOffsets?.row || DEFAULT_GRID_OFFSETS.row),
                                                amount: newAmount
                                              }
                                            } 
                                          }));
                                        }}
                                        className="h-8 bg-slate-800 border-slate-600 text-slate-200"
                                        data-testid="input-grid-row-offset-amount"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Start From</Label>
                                      <Select 
                                        value={String(currentSettings.gridOffsets?.row?.startIndex ?? 0)}
                                        onValueChange={(value) => handleSettingsUpdate((prev) => ({ 
                                          gridOffsets: { 
                                            ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                            row: {
                                              ...(prev.gridOffsets?.row || DEFAULT_GRID_OFFSETS.row),
                                              startIndex: parseInt(value) as 0 | 1
                                            }
                                          } 
                                        }))}
                                      >
                                        <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-200" data-testid="select-grid-row-offset-start">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                          <SelectItem value="0" className="text-slate-200 hover:bg-slate-700">1st row</SelectItem>
                                          <SelectItem value="1" className="text-slate-200 hover:bg-slate-700">2nd row</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Direction</Label>
                                      <Select 
                                        value={currentSettings.gridOffsets?.row?.direction ?? 'right'}
                                        onValueChange={(value) => handleSettingsUpdate((prev) => ({ 
                                          gridOffsets: { 
                                            ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                            row: {
                                              ...(prev.gridOffsets?.row || DEFAULT_GRID_OFFSETS.row),
                                              direction: value as 'left' | 'right'
                                            }
                                          } 
                                        }))}
                                      >
                                        <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-200" data-testid="select-grid-row-offset-direction">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                          <SelectItem value="left" className="text-slate-200 hover:bg-slate-700">Left</SelectItem>
                                          <SelectItem value="right" className="text-slate-200 hover:bg-slate-700">Right</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Column Offset Controls */}
                              <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                                <div className="flex items-center space-x-2">
                                  <Checkbox 
                                    checked={currentSettings.gridOffsets?.column?.enabled ?? false}
                                    onCheckedChange={(checked) => handleSettingsUpdate((prev) => ({ 
                                      gridOffsets: { 
                                        ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                        column: {
                                          ...(prev.gridOffsets?.column || DEFAULT_GRID_OFFSETS.column),
                                          enabled: checked as boolean
                                        }
                                      } 
                                    }))}
                                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                                    data-testid="checkbox-grid-column-offset-enabled"
                                  />
                                  <Label className="text-xs font-medium text-slate-300">Column Offset</Label>
                                </div>
                                
                                {(currentSettings.gridOffsets?.column?.enabled ?? false) && (
                                  <div className="grid grid-cols-3 gap-2 mt-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Amount (px)</Label>
                                      <Input
                                        type="number"
                                        value={currentSettings.gridOffsets?.column?.amount ?? 0}
                                        onChange={(e) => {
                                          const newAmount = parseInt(e.target.value) || 0;
                                          handleSettingsUpdate((prev) => ({ 
                                            gridOffsets: { 
                                              ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                              column: {
                                                ...(prev.gridOffsets?.column || DEFAULT_GRID_OFFSETS.column),
                                                amount: newAmount
                                              }
                                            } 
                                          }));
                                        }}
                                        className="h-8 bg-slate-800 border-slate-600 text-slate-200"
                                        data-testid="input-grid-column-offset-amount"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Start From</Label>
                                      <Select 
                                        value={String(currentSettings.gridOffsets?.column?.startIndex ?? 0)}
                                        onValueChange={(value) => handleSettingsUpdate((prev) => ({ 
                                          gridOffsets: { 
                                            ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                            column: {
                                              ...(prev.gridOffsets?.column || DEFAULT_GRID_OFFSETS.column),
                                              startIndex: parseInt(value) as 0 | 1
                                            }
                                          } 
                                        }))}
                                      >
                                        <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-200" data-testid="select-grid-column-offset-start">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                          <SelectItem value="0" className="text-slate-200 hover:bg-slate-700">1st column</SelectItem>
                                          <SelectItem value="1" className="text-slate-200 hover:bg-slate-700">2nd column</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Direction</Label>
                                      <Select 
                                        value={currentSettings.gridOffsets?.column?.direction ?? 'down'}
                                        onValueChange={(value) => handleSettingsUpdate((prev) => ({ 
                                          gridOffsets: { 
                                            ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                            column: {
                                              ...(prev.gridOffsets?.column || DEFAULT_GRID_OFFSETS.column),
                                              direction: value as 'up' | 'down'
                                            }
                                          } 
                                        }))}
                                      >
                                        <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-200" data-testid="select-grid-column-offset-direction">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                          <SelectItem value="up" className="text-slate-200 hover:bg-slate-700">Up</SelectItem>
                                          <SelectItem value="down" className="text-slate-200 hover:bg-slate-700">Down</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Randomisation Section - kept at bottom */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">X Random Amount: {currentSettings.gridXRandomization}px</Label>
                            <Slider
                              value={[currentSettings.gridXRandomization]}
                              onValueChange={([value]) => handleSettingsUpdate({ gridXRandomization: value })}
                              min={0}
                              max={200}
                              step={5}
                              className="[&_[role=slider]]:bg-purple-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Y Random Amount: {currentSettings.gridYRandomization}px</Label>
                            <Slider
                              value={[currentSettings.gridYRandomization]}
                              onValueChange={([value]) => handleSettingsUpdate({ gridYRandomization: value })}
                              min={0}
                              max={200}
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
                              
                              <SelectSeparator className="bg-slate-600" />
                              
                              <SelectItem 
                                value="corner-radius" 
                                disabled={!availableShapeSpecificSortOptions.cornerRadius}
                                className="text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Corner Radius
                              </SelectItem>
                              <SelectItem 
                                value="point-count" 
                                disabled={!availableShapeSpecificSortOptions.pointCount}
                                className="text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Point Count
                              </SelectItem>
                              <SelectItem 
                                value="edge-count" 
                                disabled={!availableShapeSpecificSortOptions.edgeCount}
                                className="text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Edge Count
                              </SelectItem>
                              <SelectItem 
                                value="inner-radius" 
                                disabled={!availableShapeSpecificSortOptions.innerRadius}
                                className="text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Inner Radius
                              </SelectItem>
                              <SelectItem 
                                value="segment-count" 
                                disabled={!availableShapeSpecificSortOptions.segmentCount}
                                className="text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Segment Count
                              </SelectItem>
                              <SelectItem 
                                value="direction" 
                                disabled={!availableShapeSpecificSortOptions.direction}
                                className="text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Direction (line-vector)
                              </SelectItem>
                              <SelectItem 
                                value="length" 
                                disabled={!availableShapeSpecificSortOptions.length}
                                className="text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Length (line-vector)
                              </SelectItem>
                              <SelectItem 
                                value="centroid" 
                                disabled={!availableShapeSpecificSortOptions.centroid}
                                className="text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Centroid (line-vector)
                              </SelectItem>
                              <SelectItem 
                                value="spread" 
                                disabled={!availableShapeSpecificSortOptions.spread}
                                className="text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Spread (cubic)
                              </SelectItem>
                              <SelectItem 
                                value="curvature" 
                                disabled={!availableShapeSpecificSortOptions.curvature}
                                className="text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Curvature (cubic)
                              </SelectItem>
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
                            
                            <div className="space-y-3 pt-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm text-slate-300">Group by Shape Type</Label>
                                <Switch
                                  checked={currentSettings.gridGroupByShapeType}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ gridGroupByShapeType: checked })}
                                  className="data-[state=checked]:bg-purple-600"
                                />
                              </div>
                              <p className="text-xs text-slate-400">
                                Group shapes by type first, then sort within each group
                              </p>
                            </div>
                            
                            {currentSettings.gridGroupByShapeType && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm text-slate-300">Reverse Groups</Label>
                                  <Switch
                                    checked={currentSettings.gridReverseGroups}
                                    onCheckedChange={(checked) => handleSettingsUpdate({ gridReverseGroups: checked })}
                                    className="data-[state=checked]:bg-purple-600"
                                  />
                                </div>
                                <p className="text-xs text-slate-400">
                                  Reverse the order of shape-type groups
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {currentSettings.distributionPattern === 'auto-distribute' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Shapes X Count: {currentSettings.autoDistributeXCount}</Label>
                            <Slider
                              value={[currentSettings.autoDistributeXCount]}
                              onValueChange={([value]) => {
                                const totalShapes = currentSettings.generationCountMode === 'fixed' 
                                  ? currentSettings.generationCountDefine 
                                  : 20;
                                const yCount = totalShapes - value;
                                handleSettingsUpdate({ 
                                  autoDistributeXCount: value,
                                  autoDistributeYCount: Math.max(0, yCount)
                                });
                              }}
                              min={0}
                              max={currentSettings.generationCountMode === 'fixed' ? currentSettings.generationCountDefine : 50}
                              step={1}
                              className="[&_[role=slider]]:bg-green-600"
                              data-testid="slider-auto-distribute-x"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Shapes Y Count: {currentSettings.autoDistributeYCount}</Label>
                            <Slider
                              value={[currentSettings.autoDistributeYCount]}
                              onValueChange={([value]) => {
                                const totalShapes = currentSettings.generationCountMode === 'fixed' 
                                  ? currentSettings.generationCountDefine 
                                  : 20;
                                const xCount = totalShapes - value;
                                handleSettingsUpdate({ 
                                  autoDistributeXCount: Math.max(0, xCount),
                                  autoDistributeYCount: value
                                });
                              }}
                              min={0}
                              max={currentSettings.generationCountMode === 'fixed' ? currentSettings.generationCountDefine : 50}
                              step={1}
                              className="[&_[role=slider]]:bg-green-600"
                              data-testid="slider-auto-distribute-y"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">X Random Amount: {currentSettings.gridXRandomization}px</Label>
                            <Slider
                              value={[currentSettings.gridXRandomization]}
                              onValueChange={([value]) => handleSettingsUpdate({ gridXRandomization: value })}
                              min={0}
                              max={200}
                              step={5}
                              className="[&_[role=slider]]:bg-purple-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Y Random Amount: {currentSettings.gridYRandomization}px</Label>
                            <Slider
                              value={[currentSettings.gridYRandomization]}
                              onValueChange={([value]) => handleSettingsUpdate({ gridYRandomization: value })}
                              min={0}
                              max={200}
                              step={5}
                              className="[&_[role=slider]]:bg-purple-600"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {currentSettings.distributionPattern === 'wave' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm text-slate-300">Wave Type</Label>
                          <Select 
                            value={currentSettings.waveType}
                            onValueChange={(value) => handleSettingsUpdate({ waveType: value as any })}
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                              <SelectItem value="sine" className="text-slate-200 hover:bg-slate-700">Sine Wave</SelectItem>
                              <SelectItem value="triangle" className="text-slate-200 hover:bg-slate-700">Triangle Wave</SelectItem>
                              <SelectItem value="square" className="text-slate-200 hover:bg-slate-700">Square Wave</SelectItem>
                              <SelectItem value="sawtooth" className="text-slate-200 hover:bg-slate-700">Sawtooth Wave</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Amplitude: {currentSettings.waveAmplitude}px</Label>
                            <Slider
                              value={[currentSettings.waveAmplitude]}
                              onValueChange={([value]) => handleSettingsUpdate({ waveAmplitude: value })}
                              min={0}
                              max={200}
                              step={5}
                              className="[&_[role=slider]]:bg-blue-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Frequency: {currentSettings.waveFrequency}</Label>
                            <Slider
                              value={[currentSettings.waveFrequency]}
                              onValueChange={([value]) => handleSettingsUpdate({ waveFrequency: value })}
                              min={0.5}
                              max={10}
                              step={0.5}
                              className="[&_[role=slider]]:bg-blue-600"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Direction</Label>
                            <Select 
                              value={currentSettings.waveDirection}
                              onValueChange={(value) => handleSettingsUpdate({ waveDirection: value as any })}
                            >
                              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="horizontal" className="text-slate-200 hover:bg-slate-700">Horizontal</SelectItem>
                                <SelectItem value="vertical" className="text-slate-200 hover:bg-slate-700">Vertical</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Phase Offset: {currentSettings.wavePhaseOffset}°</Label>
                            <Slider
                              value={[currentSettings.wavePhaseOffset]}
                              onValueChange={([value]) => handleSettingsUpdate({ wavePhaseOffset: value })}
                              min={0}
                              max={360}
                              step={15}
                              className="[&_[role=slider]]:bg-blue-600"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">X Random Amount: {currentSettings.gridXRandomization}px</Label>
                            <Slider
                              value={[currentSettings.gridXRandomization]}
                              onValueChange={([value]) => handleSettingsUpdate({ gridXRandomization: value })}
                              min={0}
                              max={200}
                              step={5}
                              className="[&_[role=slider]]:bg-purple-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Y Random Amount: {currentSettings.gridYRandomization}px</Label>
                            <Slider
                              value={[currentSettings.gridYRandomization]}
                              onValueChange={([value]) => handleSettingsUpdate({ gridYRandomization: value })}
                              min={0}
                              max={200}
                              step={5}
                              className="[&_[role=slider]]:bg-purple-600"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {currentSettings.distributionPattern === 'ellipse' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm text-slate-300">Ring Count: {currentSettings.ellipseRingCount}</Label>
                          <Slider
                            value={[currentSettings.ellipseRingCount]}
                            onValueChange={([value]) => handleSettingsUpdate({ ellipseRingCount: value })}
                            min={1}
                            max={10}
                            step={1}
                            className="[&_[role=slider]]:bg-cyan-600"
                          />
                        </div>
                        
                        {currentSettings.ellipseRingCount === 1 ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm text-slate-300">X Radius: {currentSettings.ellipseXRadius[0]}px</Label>
                              <Slider
                                value={[currentSettings.ellipseXRadius[0]]}
                                onValueChange={([value]) => handleSettingsUpdate({ ellipseXRadius: [value, value] })}
                                min={10}
                                max={300}
                                step={5}
                                className="[&_[role=slider]]:bg-cyan-600"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm text-slate-300">Y Radius: {currentSettings.ellipseYRadius[0]}px</Label>
                              <Slider
                                value={[currentSettings.ellipseYRadius[0]]}
                                onValueChange={([value]) => handleSettingsUpdate({ ellipseYRadius: [value, value] })}
                                min={10}
                                max={300}
                                step={5}
                                className="[&_[role=slider]]:bg-cyan-600"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm text-slate-300">Min X Radius: {currentSettings.ellipseXRadius[0]}px</Label>
                                <Slider
                                  value={[currentSettings.ellipseXRadius[0]]}
                                  onValueChange={([value]) => handleSettingsUpdate({ ellipseXRadius: [value, currentSettings.ellipseXRadius[1]] })}
                                  min={10}
                                  max={300}
                                  step={5}
                                  className="[&_[role=slider]]:bg-cyan-600"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm text-slate-300">Max X Radius: {currentSettings.ellipseXRadius[1]}px</Label>
                                <Slider
                                  value={[currentSettings.ellipseXRadius[1]]}
                                  onValueChange={([value]) => handleSettingsUpdate({ ellipseXRadius: [currentSettings.ellipseXRadius[0], value] })}
                                  min={10}
                                  max={300}
                                  step={5}
                                  className="[&_[role=slider]]:bg-cyan-600"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm text-slate-300">Min Y Radius: {currentSettings.ellipseYRadius[0]}px</Label>
                                <Slider
                                  value={[currentSettings.ellipseYRadius[0]]}
                                  onValueChange={([value]) => handleSettingsUpdate({ ellipseYRadius: [value, currentSettings.ellipseYRadius[1]] })}
                                  min={10}
                                  max={300}
                                  step={5}
                                  className="[&_[role=slider]]:bg-cyan-600"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm text-slate-300">Max Y Radius: {currentSettings.ellipseYRadius[1]}px</Label>
                                <Slider
                                  value={[currentSettings.ellipseYRadius[1]]}
                                  onValueChange={([value]) => handleSettingsUpdate({ ellipseYRadius: [currentSettings.ellipseYRadius[0], value] })}
                                  min={10}
                                  max={300}
                                  step={5}
                                  className="[&_[role=slider]]:bg-cyan-600"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm text-slate-300">Ring Spacing</Label>
                              <Select 
                                value={currentSettings.ellipseRingSpacing}
                                onValueChange={(value) => handleSettingsUpdate({ ellipseRingSpacing: value as any })}
                              >
                                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="even" className="text-slate-200 hover:bg-slate-700">Even Spacing</SelectItem>
                                  <SelectItem value="progressive" className="text-slate-200 hover:bg-slate-700">Progressive Spacing</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Rotation: {currentSettings.ellipseRotation}°</Label>
                            <Slider
                              value={[currentSettings.ellipseRotation]}
                              onValueChange={([value]) => handleSettingsUpdate({ ellipseRotation: value })}
                              min={0}
                              max={360}
                              step={15}
                              className="[&_[role=slider]]:bg-cyan-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Rotation Alignment</Label>
                            <Select 
                              value={currentSettings.ellipseRotationAlignment}
                              onValueChange={(value) => handleSettingsUpdate({ ellipseRotationAlignment: value as any })}
                            >
                              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="uniform" className="text-slate-200 hover:bg-slate-700">Uniform (same rotation)</SelectItem>
                                <SelectItem value="progressive" className="text-slate-200 hover:bg-slate-700">Progressive (increasing)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <Separator className="bg-slate-600" />
                        
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={currentSettings.ellipseAlignToRing}
                              onCheckedChange={(checked) => handleSettingsUpdate({ ellipseAlignToRing: checked })}
                              className="data-[state=checked]:bg-cyan-600"
                            />
                            <Label className="text-sm text-slate-300">Align to Ring (Tangent)</Label>
                          </div>
                          
                          {currentSettings.ellipseAlignToRing && (
                            <div className="ml-6 space-y-3">
                              <div className="flex items-center space-x-2">
                                <Switch 
                                  checked={currentSettings.ellipseFlipInward}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ ellipseFlipInward: checked })}
                                  className="data-[state=checked]:bg-cyan-600"
                                />
                                <Label className="text-xs text-slate-400">Flip Inward</Label>
                              </div>
                              
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Additional Rotation: {currentSettings.ellipseAdditionalRotation}°</Label>
                                <Slider
                                  value={[currentSettings.ellipseAdditionalRotation]}
                                  onValueChange={([value]) => handleSettingsUpdate({ ellipseAdditionalRotation: value })}
                                  min={-180}
                                  max={180}
                                  step={5}
                                  className="[&_[role=slider]]:bg-cyan-600"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <Separator className="bg-slate-600" />
                        
                        <div className="space-y-3">
                          <Label className="text-sm text-slate-300">Shape Rotation Mode</Label>
                          <Select 
                            value={currentSettings.ellipseShapeRotationMode}
                            onValueChange={(value) => handleSettingsUpdate({ ellipseShapeRotationMode: value as any })}
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                              <SelectItem value="none" className="text-slate-200 hover:bg-slate-700">None</SelectItem>
                              <SelectItem value="fixed" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
                              <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                              <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {currentSettings.ellipseShapeRotationMode === 'fixed' && (
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-300">Rotation: {currentSettings.ellipseRotationFixed}°</Label>
                              <Slider
                                value={[currentSettings.ellipseRotationFixed]}
                                onValueChange={([value]) => handleSettingsUpdate({ ellipseRotationFixed: value })}
                                min={0}
                                max={360}
                                step={5}
                                className="[&_[role=slider]]:bg-cyan-600"
                              />
                            </div>
                          )}
                          
                          {currentSettings.ellipseShapeRotationMode === 'range' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Min: {currentSettings.ellipseRotationRange[0]}°</Label>
                                <Slider
                                  value={[currentSettings.ellipseRotationRange[0]]}
                                  onValueChange={([value]) => handleSettingsUpdate({ ellipseRotationRange: [value, currentSettings.ellipseRotationRange[1]] })}
                                  min={0}
                                  max={360}
                                  step={5}
                                  className="[&_[role=slider]]:bg-cyan-600"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Max: {currentSettings.ellipseRotationRange[1]}°</Label>
                                <Slider
                                  value={[currentSettings.ellipseRotationRange[1]]}
                                  onValueChange={([value]) => handleSettingsUpdate({ ellipseRotationRange: [currentSettings.ellipseRotationRange[0], value] })}
                                  min={0}
                                  max={360}
                                  step={5}
                                  className="[&_[role=slider]]:bg-cyan-600"
                                />
                              </div>
                            </div>
                          )}
                          
                          {currentSettings.ellipseShapeRotationMode === 'incremental' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Start: {currentSettings.ellipseRotationIncrementalStart}°</Label>
                                <Slider
                                  value={[currentSettings.ellipseRotationIncrementalStart]}
                                  onValueChange={([value]) => handleSettingsUpdate({ ellipseRotationIncrementalStart: value })}
                                  min={0}
                                  max={360}
                                  step={5}
                                  className="[&_[role=slider]]:bg-cyan-600"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Step: {currentSettings.ellipseRotationIncrementalStep}°</Label>
                                <Slider
                                  value={[currentSettings.ellipseRotationIncrementalStep]}
                                  onValueChange={([value]) => handleSettingsUpdate({ ellipseRotationIncrementalStep: value })}
                                  min={-180}
                                  max={180}
                                  step={5}
                                  className="[&_[role=slider]]:bg-cyan-600"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <Separator className="bg-slate-600" />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">X Random Amount: {currentSettings.gridXRandomization}px</Label>
                            <Slider
                              value={[currentSettings.gridXRandomization]}
                              onValueChange={([value]) => handleSettingsUpdate({ gridXRandomization: value })}
                              min={0}
                              max={200}
                              step={5}
                              className="[&_[role=slider]]:bg-purple-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Y Random Amount: {currentSettings.gridYRandomization}px</Label>
                            <Slider
                              value={[currentSettings.gridYRandomization]}
                              onValueChange={([value]) => handleSettingsUpdate({ gridYRandomization: value })}
                              min={0}
                              max={200}
                              step={5}
                              className="[&_[role=slider]]:bg-purple-600"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {currentSettings.distributionPattern === 'spiral' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Turn Count: {currentSettings.spiralTurnCount}</Label>
                            <Slider
                              value={[currentSettings.spiralTurnCount]}
                              onValueChange={([value]) => handleSettingsUpdate({ spiralTurnCount: value })}
                              min={1}
                              max={20}
                              step={1}
                              className="[&_[role=slider]]:bg-orange-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Spacing Mode</Label>
                            <Select 
                              value={currentSettings.spiralSpacingMode}
                              onValueChange={(value) => handleSettingsUpdate({ spiralSpacingMode: value as any })}
                            >
                              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="linear" className="text-slate-200 hover:bg-slate-700">Linear (constant spacing)</SelectItem>
                                <SelectItem value="logarithmic" className="text-slate-200 hover:bg-slate-700">Logarithmic (expanding)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Direction</Label>
                            <Select 
                              value={currentSettings.spiralDirection}
                              onValueChange={(value) => handleSettingsUpdate({ spiralDirection: value as any })}
                            >
                              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="clockwise" className="text-slate-200 hover:bg-slate-700">Clockwise</SelectItem>
                                <SelectItem value="counterclockwise" className="text-slate-200 hover:bg-slate-700">Counter-Clockwise</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Start Angle: {currentSettings.spiralStartAngle}°</Label>
                            <Slider
                              value={[currentSettings.spiralStartAngle]}
                              onValueChange={([value]) => handleSettingsUpdate({ spiralStartAngle: value })}
                              min={0}
                              max={360}
                              step={15}
                              className="[&_[role=slider]]:bg-orange-600"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm text-slate-300">Tightness: {currentSettings.spiralTightness.toFixed(1)}</Label>
                          <Slider
                            value={[currentSettings.spiralTightness]}
                            onValueChange={([value]) => handleSettingsUpdate({ spiralTightness: value })}
                            min={0.1}
                            max={3}
                            step={0.1}
                            className="[&_[role=slider]]:bg-orange-600"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">X Random Amount: {currentSettings.gridXRandomization}px</Label>
                            <Slider
                              value={[currentSettings.gridXRandomization]}
                              onValueChange={([value]) => handleSettingsUpdate({ gridXRandomization: value })}
                              min={0}
                              max={200}
                              step={5}
                              className="[&_[role=slider]]:bg-purple-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-300">Y Random Amount: {currentSettings.gridYRandomization}px</Label>
                            <Slider
                              value={[currentSettings.gridYRandomization]}
                              onValueChange={([value]) => handleSettingsUpdate({ gridYRandomization: value })}
                              min={0}
                              max={200}
                              step={5}
                              className="[&_[role=slider]]:bg-purple-600"
                            />
                          </div>
                        </div>
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
                          
                          {/* Size Constraints for All Shapes */}
                          <div className="space-y-3 p-3 bg-slate-700 rounded">
                            <Label className="text-sm font-medium text-slate-200">Size Constraints</Label>
                            <p className="text-xs text-slate-400">How should width and height dimensions be constrained?</p>
                            <RadioGroup 
                              value={currentSettings.sizeConstraintMode} 
                              onValueChange={(value: 'none' | 'min' | 'max' | 'avg') => handleSettingsUpdate({ sizeConstraintMode: value })}
                              className="space-y-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="none" id="size-none" className="border-slate-500 text-blue-600" />
                                <Label htmlFor="size-none" className="text-xs text-slate-300 cursor-pointer">None - Independent width/height</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="min" id="size-min" className="border-slate-500 text-blue-600" />
                                <Label htmlFor="size-min" className="text-xs text-slate-300 cursor-pointer">Min - Use smaller value for both dimensions</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="max" id="size-max" className="border-slate-500 text-blue-600" />
                                <Label htmlFor="size-max" className="text-xs text-slate-300 cursor-pointer">Max - Use larger value for both dimensions</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="avg" id="size-avg" className="border-slate-500 text-blue-600" />
                                <Label htmlFor="size-avg" className="text-xs text-slate-300 cursor-pointer">Avg - Use average value for both dimensions</Label>
                              </div>
                            </RadioGroup>
                          </div>

                          {/* Enhanced X Position Controls */}
                          <div className="space-y-3 p-3 bg-slate-800 rounded">
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
                                  <Label className="text-xs text-slate-300">Modulation Mode</Label>
                                  <Select value={currentSettings.xPositionModulationMode} onValueChange={(value) => handleSettingsUpdate({ xPositionModulationMode: value as any })}>
                                    <SelectTrigger className="h-7 w-32 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="off" className="text-slate-200 hover:bg-slate-700">Off</SelectItem>
                                      <SelectItem value="pixel-value" className="text-slate-200 hover:bg-slate-700">Pixel Value</SelectItem>
                                      <SelectItem value="shape-count" className="text-slate-200 hover:bg-slate-700">Shape Count</SelectItem>
                                      <SelectItem value="grid-row" className="text-slate-200 hover:bg-slate-700">Grid Row</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {(currentSettings.xPositionModulationMode === 'pixel-value' || currentSettings.xPositionModulationMode === 'shape-count') && (
                                  <>
                                    <Label className="text-xs text-slate-300">
                                      {currentSettings.xPositionModulationMode === 'pixel-value' ? 'Modulation Value: ' : 'Shape Count: '}
                                      {currentSettings.xPositionModulationValue}
                                      {currentSettings.xPositionModulationMode === 'pixel-value' ? 'px' : ' shapes'}
                                    </Label>
                                    <Slider
                                      value={[currentSettings.xPositionModulationValue]}
                                      onValueChange={([value]) => handleSettingsUpdate({ xPositionModulationValue: value })}
                                      min={currentSettings.xPositionModulationMode === 'pixel-value' ? 50 : 1}
                                      max={currentSettings.xPositionModulationMode === 'pixel-value' ? 1500 : 50}
                                      step={currentSettings.xPositionModulationMode === 'pixel-value' ? 50 : 1}
                                      className="[&_[role=slider]]:bg-blue-600"
                                    />
                                  </>
                                )}
                                <p className="text-xs text-slate-400">Stepped positioning (start + index × increment, with optional modulation)</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Enhanced Y Position Controls */}
                          <div className="space-y-3 p-3 bg-slate-800 rounded">
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
                                  <Label className="text-xs text-slate-300">Modulation Mode</Label>
                                  <Select value={currentSettings.yPositionModulationMode} onValueChange={(value) => handleSettingsUpdate({ yPositionModulationMode: value as any })}>
                                    <SelectTrigger className="h-7 w-32 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="off" className="text-slate-200 hover:bg-slate-700">Off</SelectItem>
                                      <SelectItem value="pixel-value" className="text-slate-200 hover:bg-slate-700">Pixel Value</SelectItem>
                                      <SelectItem value="shape-count" className="text-slate-200 hover:bg-slate-700">Shape Count</SelectItem>
                                      <SelectItem value="grid-row" className="text-slate-200 hover:bg-slate-700">Grid Row</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {(currentSettings.yPositionModulationMode === 'pixel-value' || currentSettings.yPositionModulationMode === 'shape-count') && (
                                  <>
                                    <Label className="text-xs text-slate-300">
                                      {currentSettings.yPositionModulationMode === 'pixel-value' ? 'Modulation Value: ' : 'Shape Count: '}
                                      {currentSettings.yPositionModulationValue}
                                      {currentSettings.yPositionModulationMode === 'pixel-value' ? 'px' : ' shapes'}
                                    </Label>
                                    <Slider
                                      value={[currentSettings.yPositionModulationValue]}
                                      onValueChange={([value]) => handleSettingsUpdate({ yPositionModulationValue: value })}
                                      min={currentSettings.yPositionModulationMode === 'pixel-value' ? 50 : 1}
                                      max={currentSettings.yPositionModulationMode === 'pixel-value' ? 1500 : 50}
                                      step={currentSettings.yPositionModulationMode === 'pixel-value' ? 50 : 1}
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
                          {/* Stroke Probability */}
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
                          
                          {/* Stroke Width with Mode Support */}
                          <div className="space-y-3 p-3 bg-slate-800 rounded">
                            <div className="flex items-center space-x-2">
                              <Label className="text-sm font-medium text-slate-200">Stroke Width</Label>
                              <Select value={currentSettings.strokeWidthMode} onValueChange={(value) => handleSettingsUpdate({ strokeWidthMode: value as any })}>
                                <SelectTrigger className="h-7 w-28 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                  <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                  <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {currentSettings.strokeWidthMode === 'range' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Width Range: {currentSettings.strokeWidthRange?.[0] || 1}px - {currentSettings.strokeWidthRange?.[1] || 5}px</Label>
                                <Slider
                                  value={currentSettings.strokeWidthRange || [1, 5]}
                                  onValueChange={(value) => handleSettingsUpdate({ strokeWidthRange: value as [number, number] })}
                                  min={0.5}
                                  max={20}
                                  step={0.5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                            )}
                            
                            {currentSettings.strokeWidthMode === 'define' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Width: {currentSettings.strokeWidthDefine || 3}px</Label>
                                <Slider
                                  value={[currentSettings.strokeWidthDefine || 3]}
                                  onValueChange={([value]) => handleSettingsUpdate({ strokeWidthDefine: value })}
                                  min={0.5}
                                  max={20}
                                  step={0.5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                            )}
                            
                            {currentSettings.strokeWidthMode === 'incremental' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-300">Start Value: {currentSettings.strokeWidthStartValue}px</Label>
                                  <Slider
                                    value={[currentSettings.strokeWidthStartValue]}
                                    onValueChange={([value]) => handleSettingsUpdate({ strokeWidthStartValue: value })}
                                    min={0.5}
                                    max={20}
                                    step={0.5}
                                    className="[&_[role=slider]]:bg-blue-600"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-300">Increment: {currentSettings.strokeWidthIncrement}px per shape</Label>
                                  <Slider
                                    value={[currentSettings.strokeWidthIncrement]}
                                    onValueChange={([value]) => handleSettingsUpdate({ strokeWidthIncrement: value })}
                                    min={0}
                                    max={2}
                                    step={0.1}
                                    className="[&_[role=slider]]:bg-blue-600"
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={currentSettings.strokeWidthModulationEnabled}
                                    onCheckedChange={(checked) => handleSettingsUpdate({ strokeWidthModulationEnabled: checked as boolean })}
                                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                                  />
                                  <Label className="text-xs text-slate-300">Enable Modulation</Label>
                                </div>
                                {currentSettings.strokeWidthModulationEnabled && (
                                  <div className="space-y-2">
                                    <Label className="text-xs text-slate-300">Modulation: Wrap at {currentSettings.strokeWidthModulationValue}px</Label>
                                    <Slider
                                      value={[currentSettings.strokeWidthModulationValue]}
                                      onValueChange={([value]) => handleSettingsUpdate({ strokeWidthModulationValue: value })}
                                      min={1}
                                      max={20}
                                      step={0.5}
                                      className="[&_[role=slider]]:bg-blue-600"
                                    />
                                  </div>
                                )}
                                <p className="text-xs text-slate-400">Progressive stroke width (start + index × increment, with optional modulation)</p>
                              </div>
                            )}
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
                  </div>
                )}
              </div>

              <Separator className="bg-slate-600" />

              {/* Transforms Section */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={currentSettings.transformsEnabled}
                    onCheckedChange={(checked) => handleSettingsUpdate({ transformsEnabled: checked as boolean })}
                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <Label className="font-medium text-slate-200">Transforms</Label>
                </div>
                
                {currentSettings.transformsEnabled && (
                  <div className="ml-6 space-y-4">
                    {/* Artboard-Aware Toggle */}
                    <div className="flex items-center space-x-2 p-2 bg-slate-700 rounded">
                      <Checkbox
                        checked={currentSettings.transformsArtboardAware}
                        onCheckedChange={(checked) => handleSettingsUpdate({ transformsArtboardAware: checked as boolean })}
                        className="border-slate-500 data-[state=checked]:bg-blue-600"
                        data-testid="checkbox-transforms-artboard-aware"
                      />
                      <Label className="text-xs text-slate-300">Use Artboard Bounds for Translate X/Y Ranges</Label>
                    </div>
                    
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
                                <SelectItem value="align" className="text-slate-200 hover:bg-slate-700">Align</SelectItem>
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
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-400">Start: {currentSettings.xTransformStartValue ?? 0}</Label>
                                <Slider
                                  value={[currentSettings.xTransformStartValue ?? 0]}
                                  onValueChange={([value]) => handleSettingsUpdate({ xTransformStartValue: value })}
                                  min={-200}
                                  max={200}
                                  step={1}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                              </div>
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
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={currentSettings.xTransformModulationEnabled}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ xTransformModulationEnabled: checked })}
                                  className="border-slate-500 data-[state=checked]:bg-blue-600"
                                />
                                <Label className="text-xs text-slate-300">Enable Modulation</Label>
                              </div>
                              {currentSettings.xTransformModulationEnabled && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Modulation: {currentSettings.xTransformModulationValue}</Label>
                                  <Slider
                                    value={[currentSettings.xTransformModulationValue]}
                                    onValueChange={([value]) => handleSettingsUpdate({ xTransformModulationValue: value })}
                                    min={10}
                                    max={500}
                                    step={10}
                                    className="[&_[role=slider]]:bg-blue-600"
                                  />
                                </div>
                              )}
                            </>
                          )}
                          
                          {currentSettings.xTransformMode === 'align' && (
                            <div className="space-y-3">
                              {/* Shape X Anchor */}
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Shape Anchor</Label>
                                <Select value={currentSettings.xShapeAnchorMode} onValueChange={(value) => handleSettingsUpdate({ xShapeAnchorMode: value as any })}>
                                  <SelectTrigger className="h-6 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                    <SelectItem value="predefined" className="text-slate-200 hover:bg-slate-700">Predefined</SelectItem>
                                    <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                {currentSettings.xShapeAnchorMode === 'predefined' && (
                                  <Select value={currentSettings.xShapeAnchorPredefined} onValueChange={(value) => handleSettingsUpdate({ xShapeAnchorPredefined: value as any })}>
                                    <SelectTrigger className="h-6 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="left" className="text-slate-200 hover:bg-slate-700">Left</SelectItem>
                                      <SelectItem value="center" className="text-slate-200 hover:bg-slate-700">Center</SelectItem>
                                      <SelectItem value="right" className="text-slate-200 hover:bg-slate-700">Right</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                                
                                {currentSettings.xShapeAnchorMode === 'define' && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">X: {currentSettings.xShapeAnchorDefine}</Label>
                                    <Slider
                                      value={[currentSettings.xShapeAnchorDefine]}
                                      onValueChange={([value]) => handleSettingsUpdate({ xShapeAnchorDefine: value })}
                                      min={-500}
                                      max={500}
                                      step={10}
                                      className="[&_[role=slider]]:bg-cyan-600"
                                    />
                                  </div>
                                )}
                              </div>
                              
                              {/* Artboard X Anchor */}
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Artboard Anchor</Label>
                                <Select value={currentSettings.xArtboardAnchorMode} onValueChange={(value) => handleSettingsUpdate({ xArtboardAnchorMode: value as any })}>
                                  <SelectTrigger className="h-6 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                    <SelectItem value="predefined" className="text-slate-200 hover:bg-slate-700">Predefined</SelectItem>
                                    <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                {currentSettings.xArtboardAnchorMode === 'predefined' && (
                                  <Select value={currentSettings.xArtboardAnchorPredefined} onValueChange={(value) => handleSettingsUpdate({ xArtboardAnchorPredefined: value as any })}>
                                    <SelectTrigger className="h-6 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="left" className="text-slate-200 hover:bg-slate-700">Left</SelectItem>
                                      <SelectItem value="center" className="text-slate-200 hover:bg-slate-700">Center</SelectItem>
                                      <SelectItem value="right" className="text-slate-200 hover:bg-slate-700">Right</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                                
                                {currentSettings.xArtboardAnchorMode === 'define' && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">X: {currentSettings.xArtboardAnchorDefine}</Label>
                                    <Slider
                                      value={[currentSettings.xArtboardAnchorDefine]}
                                      onValueChange={([value]) => handleSettingsUpdate({ xArtboardAnchorDefine: value })}
                                      min={-500}
                                      max={500}
                                      step={10}
                                      className="[&_[role=slider]]:bg-cyan-600"
                                    />
                                  </div>
                                )}
                              </div>
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
                                <SelectItem value="align" className="text-slate-200 hover:bg-slate-700">Align</SelectItem>
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
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-400">Start: {currentSettings.yTransformStartValue ?? 0}</Label>
                                <Slider
                                  value={[currentSettings.yTransformStartValue ?? 0]}
                                  onValueChange={([value]) => handleSettingsUpdate({ yTransformStartValue: value })}
                                  min={-200}
                                  max={200}
                                  step={1}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                              </div>
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
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={currentSettings.yTransformModulationEnabled}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ yTransformModulationEnabled: checked })}
                                  className="border-slate-500 data-[state=checked]:bg-blue-600"
                                />
                                <Label className="text-xs text-slate-300">Enable Modulation</Label>
                              </div>
                              {currentSettings.yTransformModulationEnabled && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Modulation: {currentSettings.yTransformModulationValue}</Label>
                                  <Slider
                                    value={[currentSettings.yTransformModulationValue]}
                                    onValueChange={([value]) => handleSettingsUpdate({ yTransformModulationValue: value })}
                                    min={10}
                                    max={500}
                                    step={10}
                                    className="[&_[role=slider]]:bg-blue-600"
                                  />
                                </div>
                              )}
                            </>
                          )}
                          
                          {currentSettings.yTransformMode === 'align' && (
                            <div className="space-y-3">
                              {/* Shape Y Anchor */}
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Shape Anchor</Label>
                                <Select value={currentSettings.yShapeAnchorMode} onValueChange={(value) => handleSettingsUpdate({ yShapeAnchorMode: value as any })}>
                                  <SelectTrigger className="h-6 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                    <SelectItem value="predefined" className="text-slate-200 hover:bg-slate-700">Predefined</SelectItem>
                                    <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                {currentSettings.yShapeAnchorMode === 'predefined' && (
                                  <Select value={currentSettings.yShapeAnchorPredefined} onValueChange={(value) => handleSettingsUpdate({ yShapeAnchorPredefined: value as any })}>
                                    <SelectTrigger className="h-6 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="top" className="text-slate-200 hover:bg-slate-700">Top</SelectItem>
                                      <SelectItem value="center" className="text-slate-200 hover:bg-slate-700">Center</SelectItem>
                                      <SelectItem value="bottom" className="text-slate-200 hover:bg-slate-700">Bottom</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                                
                                {currentSettings.yShapeAnchorMode === 'define' && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Y: {currentSettings.yShapeAnchorDefine}</Label>
                                    <Slider
                                      value={[currentSettings.yShapeAnchorDefine]}
                                      onValueChange={([value]) => handleSettingsUpdate({ yShapeAnchorDefine: value })}
                                      min={-500}
                                      max={500}
                                      step={10}
                                      className="[&_[role=slider]]:bg-cyan-600"
                                    />
                                  </div>
                                )}
                              </div>
                              
                              {/* Artboard Y Anchor */}
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Artboard Anchor</Label>
                                <Select value={currentSettings.yArtboardAnchorMode} onValueChange={(value) => handleSettingsUpdate({ yArtboardAnchorMode: value as any })}>
                                  <SelectTrigger className="h-6 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                    <SelectItem value="predefined" className="text-slate-200 hover:bg-slate-700">Predefined</SelectItem>
                                    <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                {currentSettings.yArtboardAnchorMode === 'predefined' && (
                                  <Select value={currentSettings.yArtboardAnchorPredefined} onValueChange={(value) => handleSettingsUpdate({ yArtboardAnchorPredefined: value as any })}>
                                    <SelectTrigger className="h-6 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="top" className="text-slate-200 hover:bg-slate-700">Top</SelectItem>
                                      <SelectItem value="center" className="text-slate-200 hover:bg-slate-700">Center</SelectItem>
                                      <SelectItem value="bottom" className="text-slate-200 hover:bg-slate-700">Bottom</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                                
                                {currentSettings.yArtboardAnchorMode === 'define' && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Y: {currentSettings.yArtboardAnchorDefine}</Label>
                                    <Slider
                                      value={[currentSettings.yArtboardAnchorDefine]}
                                      onValueChange={([value]) => handleSettingsUpdate({ yArtboardAnchorDefine: value })}
                                      min={-500}
                                      max={500}
                                      step={10}
                                      className="[&_[role=slider]]:bg-cyan-600"
                                    />
                                  </div>
                                )}
                              </div>
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
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-400">Start: {currentSettings.scaleXStartValue ?? 100}%</Label>
                                <Slider
                                  value={[currentSettings.scaleXStartValue ?? 100]}
                                  onValueChange={([value]) => {
                                    handleSettingsUpdate({ scaleXStartValue: value });
                                    if (currentSettings.maintainScaleAspectRatio) {
                                      handleSettingsUpdate({ scaleYStartValue: value });
                                    }
                                  }}
                                  min={0}
                                  max={200}
                                  step={1}
                                  className="[&_[role=slider]]:bg-green-600"
                                />
                              </div>
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
                            </>
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
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-400">Start: {currentSettings.scaleYStartValue ?? 100}%</Label>
                                <Slider
                                  value={[currentSettings.scaleYStartValue ?? 100]}
                                  onValueChange={([value]) => handleSettingsUpdate({ scaleYStartValue: value })}
                                  min={0}
                                  max={200}
                                  step={1}
                                  className="[&_[role=slider]]:bg-green-600"
                                  disabled={currentSettings.maintainScaleAspectRatio}
                                />
                              </div>
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
                            </>
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
                              <Label className="text-xs text-slate-400">Start: {currentSettings.rotationStartValue ?? 0}°</Label>
                              <Slider
                                value={[currentSettings.rotationStartValue ?? 0]}
                                onValueChange={([value]) => handleSettingsUpdate({ rotationStartValue: value })}
                                min={0}
                                max={360}
                                step={1}
                                className="[&_[role=slider]]:bg-orange-600"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-400">Step Amount: {currentSettings.rotationIncrementStep}°</Label>
                              <Slider
                                value={[currentSettings.rotationIncrementStep]}
                                onValueChange={([value]) => handleSettingsUpdate({ rotationIncrementStep: value })}
                                min={1}
                                max={90}
                                step={1}
                                className="[&_[role=slider]]:bg-orange-600"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-400">Increment: {currentSettings.rotationIncrement}°</Label>
                              <Slider
                                value={[currentSettings.rotationIncrement]}
                                onValueChange={([value]) => handleSettingsUpdate({ rotationIncrement: value })}
                                min={-180}
                                max={180}
                                step={currentSettings.rotationIncrementStep}
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
                            onValueChange={(value) => handleSettingsUpdate({ transformOriginMode: value as 'define' | 'predefined-artboard' | 'current-shape' | 'shape-reference' })}
                          >
                            <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                              <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define (X, Y)</SelectItem>
                              <SelectItem value="predefined-artboard" className="text-slate-200 hover:bg-slate-700">Predefined Artboard</SelectItem>
                              <SelectItem value="current-shape" className="text-slate-200 hover:bg-slate-700">Current Shape</SelectItem>
                              <SelectItem value="shape-reference" className="text-slate-200 hover:bg-slate-700">Shape Reference</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Define Mode - X and Y Coordinates with Sub-modes */}
                        {currentSettings.transformOriginMode === 'define' && (
                          <div className="space-y-3">
                            {/* Sub-mode Selector */}
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-300">Define Mode</Label>
                              <Select 
                                value={currentSettings.transformOriginDefineMode} 
                                onValueChange={(value) => handleSettingsUpdate({ transformOriginDefineMode: value as 'fixed' | 'range' | 'incremental' })}
                              >
                                <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="fixed" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
                                  <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                  <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Fixed Mode - Single X and Y */}
                            {currentSettings.transformOriginDefineMode === 'fixed' && (
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
                            
                            {/* Range Mode - Min/Max for X and Y */}
                            {currentSettings.transformOriginDefineMode === 'range' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-300">X Range: [{currentSettings.transformOriginXMin}, {currentSettings.transformOriginXMax}]</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Min: {currentSettings.transformOriginXMin}</Label>
                                      <Slider
                                        value={[currentSettings.transformOriginXMin]}
                                        onValueChange={([value]) => handleSettingsUpdate({ transformOriginXMin: value })}
                                        min={-500}
                                        max={500}
                                        step={10}
                                        className="[&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Max: {currentSettings.transformOriginXMax}</Label>
                                      <Slider
                                        value={[currentSettings.transformOriginXMax]}
                                        onValueChange={([value]) => handleSettingsUpdate({ transformOriginXMax: value })}
                                        min={-500}
                                        max={500}
                                        step={10}
                                        className="[&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-300">Y Range: [{currentSettings.transformOriginYMin}, {currentSettings.transformOriginYMax}]</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Min: {currentSettings.transformOriginYMin}</Label>
                                      <Slider
                                        value={[currentSettings.transformOriginYMin]}
                                        onValueChange={([value]) => handleSettingsUpdate({ transformOriginYMin: value })}
                                        min={-500}
                                        max={500}
                                        step={10}
                                        className="[&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Max: {currentSettings.transformOriginYMax}</Label>
                                      <Slider
                                        value={[currentSettings.transformOriginYMax]}
                                        onValueChange={([value]) => handleSettingsUpdate({ transformOriginYMax: value })}
                                        min={-500}
                                        max={500}
                                        step={10}
                                        className="[&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Incremental Mode - Start, Increment, Modulation for X and Y */}
                            {currentSettings.transformOriginDefineMode === 'incremental' && (
                              <div className="space-y-3">
                                {/* X Incremental */}
                                <div className="space-y-2 p-2 bg-slate-900 rounded">
                                  <Label className="text-xs font-medium text-slate-300">X Incremental</Label>
                                  <div className="space-y-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Start: {currentSettings.transformOriginXStartValue}</Label>
                                      <Slider
                                        value={[currentSettings.transformOriginXStartValue]}
                                        onValueChange={([value]) => handleSettingsUpdate({ transformOriginXStartValue: value })}
                                        min={-500}
                                        max={500}
                                        step={10}
                                        className="[&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Increment: {currentSettings.transformOriginXIncrement}</Label>
                                      <Slider
                                        value={[currentSettings.transformOriginXIncrement]}
                                        onValueChange={([value]) => handleSettingsUpdate({ transformOriginXIncrement: value })}
                                        min={-100}
                                        max={100}
                                        step={1}
                                        className="[&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={currentSettings.transformOriginXModulationEnabled}
                                        onCheckedChange={(checked) => handleSettingsUpdate({ transformOriginXModulationEnabled: checked as boolean })}
                                        className="border-slate-500 data-[state=checked]:bg-blue-600"
                                      />
                                      <Label className="text-xs text-slate-300">Enable Modulation</Label>
                                    </div>
                                    {currentSettings.transformOriginXModulationEnabled && (
                                      <div className="space-y-1">
                                        <Label className="text-xs text-slate-400">Modulation: {currentSettings.transformOriginXModulationValue}</Label>
                                        <Slider
                                          value={[currentSettings.transformOriginXModulationValue]}
                                          onValueChange={([value]) => handleSettingsUpdate({ transformOriginXModulationValue: value })}
                                          min={1}
                                          max={500}
                                          step={10}
                                          className="[&_[role=slider]]:bg-purple-600"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Y Incremental */}
                                <div className="space-y-2 p-2 bg-slate-900 rounded">
                                  <Label className="text-xs font-medium text-slate-300">Y Incremental</Label>
                                  <div className="space-y-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Start: {currentSettings.transformOriginYStartValue}</Label>
                                      <Slider
                                        value={[currentSettings.transformOriginYStartValue]}
                                        onValueChange={([value]) => handleSettingsUpdate({ transformOriginYStartValue: value })}
                                        min={-500}
                                        max={500}
                                        step={10}
                                        className="[&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Increment: {currentSettings.transformOriginYIncrement}</Label>
                                      <Slider
                                        value={[currentSettings.transformOriginYIncrement]}
                                        onValueChange={([value]) => handleSettingsUpdate({ transformOriginYIncrement: value })}
                                        min={-100}
                                        max={100}
                                        step={1}
                                        className="[&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={currentSettings.transformOriginYModulationEnabled}
                                        onCheckedChange={(checked) => handleSettingsUpdate({ transformOriginYModulationEnabled: checked as boolean })}
                                        className="border-slate-500 data-[state=checked]:bg-blue-600"
                                      />
                                      <Label className="text-xs text-slate-300">Enable Modulation</Label>
                                    </div>
                                    {currentSettings.transformOriginYModulationEnabled && (
                                      <div className="space-y-1">
                                        <Label className="text-xs text-slate-400">Modulation: {currentSettings.transformOriginYModulationValue}</Label>
                                        <Slider
                                          value={[currentSettings.transformOriginYModulationValue]}
                                          onValueChange={([value]) => handleSettingsUpdate({ transformOriginYModulationValue: value })}
                                          min={1}
                                          max={500}
                                          step={10}
                                          className="[&_[role=slider]]:bg-purple-600"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Predefined Artboard Mode - Alignment Options */}
                        {currentSettings.transformOriginMode === 'predefined-artboard' && (
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-300">Artboard Alignment Point</Label>
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
                        
                        {/* Current Shape Mode - Alignment Options */}
                        {currentSettings.transformOriginMode === 'current-shape' && (
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-300">Shape Alignment Point</Label>
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
                        
                        {/* Shape Reference Mode - Reference another shape */}
                        {currentSettings.transformOriginMode === 'shape-reference' && (
                          <div className="space-y-3">
                            {/* Reference Type Selector */}
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-300">Reference Type</Label>
                              <Select 
                                value={currentSettings.transformOriginShapeReference} 
                                onValueChange={(value) => handleSettingsUpdate({ transformOriginShapeReference: value as 'current' | 'previous' | 'next' | 'specific' })}
                              >
                                <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="current" className="text-slate-200 hover:bg-slate-700">Current Shape</SelectItem>
                                  <SelectItem value="previous" className="text-slate-200 hover:bg-slate-700">Previous Shape</SelectItem>
                                  <SelectItem value="next" className="text-slate-200 hover:bg-slate-700">Next Shape</SelectItem>
                                  <SelectItem value="specific" className="text-slate-200 hover:bg-slate-700">Specific Index</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Specific Index Input (conditional on reference type) */}
                            {currentSettings.transformOriginShapeReference === 'specific' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Shape Index: {currentSettings.transformOriginShapeIndex}</Label>
                                <Slider
                                  value={[currentSettings.transformOriginShapeIndex]}
                                  onValueChange={([value]) => handleSettingsUpdate({ transformOriginShapeIndex: value })}
                                  min={0}
                                  max={100}
                                  step={1}
                                  className="[&_[role=slider]]:bg-orange-600"
                                />
                                <p className="text-xs text-slate-400">0 = first shape in batch, 1 = second shape, etc.</p>
                              </div>
                            )}
                            
                            {/* Shape Anchor Point Selector */}
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-300">Anchor Point on Referenced Shape</Label>
                              <Select 
                                value={currentSettings.transformOriginShapeAnchor} 
                                onValueChange={(value) => handleSettingsUpdate({ transformOriginShapeAnchor: value as any })}
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
                          </div>
                        )}
                      </div>
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
                          <SelectTrigger className="h-7 w-28 text-xs bg-slate-700 border-slate-600 text-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                            <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                            <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                            <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
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

                          {currentSettings.blurMode === 'incremental' && (
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Start Value: {currentSettings.blurStartValue}px</Label>
                                <Slider
                                  value={[currentSettings.blurStartValue]}
                                  onValueChange={([value]) => handleSettingsUpdate({ blurStartValue: value })}
                                  min={0}
                                  max={50}
                                  step={0.5}
                                  className="[&_[role=slider]]:bg-purple-600"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Increment: {currentSettings.blurIncrement}px per shape</Label>
                                <Slider
                                  value={[currentSettings.blurIncrement]}
                                  onValueChange={([value]) => handleSettingsUpdate({ blurIncrement: value })}
                                  min={0}
                                  max={5}
                                  step={0.1}
                                  className="[&_[role=slider]]:bg-purple-600"
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={currentSettings.blurModulationEnabled}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ blurModulationEnabled: checked as boolean })}
                                  className="border-slate-500 data-[state=checked]:bg-purple-600"
                                />
                                <Label className="text-xs text-slate-300">Enable Modulation</Label>
                              </div>
                              {currentSettings.blurModulationEnabled && (
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-300">Modulation: Wrap at {currentSettings.blurModulationValue}px</Label>
                                  <Slider
                                    value={[currentSettings.blurModulationValue]}
                                    onValueChange={([value]) => handleSettingsUpdate({ blurModulationValue: value })}
                                    min={1}
                                    max={50}
                                    step={1}
                                    className="[&_[role=slider]]:bg-purple-600"
                                  />
                                </div>
                              )}
                              <p className="text-xs text-slate-400">Progressive blur (start + index × increment, with optional modulation)</p>
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
