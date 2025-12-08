import React, { useState, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { BufferedSliderWithNumericInput, BufferedRangeSliderWithNumericInputs } from '@/components/ui/buffered-slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Settings, RotateCcw, X, ChevronDown, AlertTriangle, CheckCircle, AlertCircle, Plus, Minus, Info, Layers } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BatchConfigSettings, defaultBatchConfigSettings, BlendMode, ShapeCountMode, SupportedShapeType, GenerationSet, DEFAULT_GRID_OFFSETS, GridOffsetsConfig, DEFAULT_SHAPE_MASKING, ShapeMaskingConfig, DEFAULT_CELL_CONSTRAINTS, CellConstraintsConfig, migrateEchoJitter, IncrementalIndexDriver } from '@shared/schema';
import { ScatterSettings, ShapeType, Artboard, getAvailableShapeSpecificSortOptions } from '@/lib/shapeTypes';
import { GenerationSetsDropdown } from './GenerationSetsDropdown';
import ApiCallGenerator from './ApiCallGenerator';
import type { CurrentUIState } from '@/hooks/useGenerationSets';

// Use defaultSettings from shared schema
const defaultSettings = defaultBatchConfigSettings;

interface IndexDriverSelectProps {
  value: IncrementalIndexDriver;
  onChange: (value: IncrementalIndexDriver) => void;
  testId?: string;
}

function IndexDriverSelect({ value, onChange, testId }: IndexDriverSelectProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-slate-700/50 rounded mt-2">
      <Label className="text-xs text-slate-400 whitespace-nowrap">Index Driver:</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-36 bg-slate-800 border-slate-600 text-slate-200 text-xs" data-testid={testId || "select-index-driver"}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent style={{ zIndex: 10002 }}>
          <SelectItem value="shapeIndex">Shape Index</SelectItem>
          <SelectItem value="setRepIndex">Set Rep Index</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

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

function BatchConfigDialogInner({ 
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

  // Calculate effective repetitions for current set to enable/disable echo driver options
  const effectiveRepetitions = React.useMemo(() => {
    const currentSet = generationSets.find(set => set.id === currentGenerationSetId);
    if (!currentSet) return 0;
    
    // Check repetition mode - 'use-global' means we'd need global settings which we don't have here
    // For 'fixed' mode, use repetitionValue; for 'range' mode, use max of range
    if (currentSet.repetitionMode === 'fixed') {
      return currentSet.repetitionValue ?? 0;
    } else if (currentSet.repetitionMode === 'range') {
      return currentSet.repetitionRange?.[1] ?? 0;
    }
    // For 'use-global', we can't determine here - assume it might have repetitions
    return 1; // Conservative: don't disable for use-global mode
  }, [generationSets, currentGenerationSetId]);

  // Determine if Set Rep Index driver should be disabled
  const isSetRepIndexDisabled = effectiveRepetitions <= 1;

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
    let mergedSettings = { ...defaultSettings, ...settings };
    console.log('🔄 [DIALOG INIT] Incoming settings.cellConstraints:', JSON.stringify(settings.cellConstraints));
    console.log('🔄 [DIALOG INIT] Merged cellConstraints:', JSON.stringify(mergedSettings.cellConstraints));
    
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
    
    // Apply echo jitter migration for legacy configs
    mergedSettings = migrateEchoJitter(mergedSettings) as BatchConfigSettings;
    
    setCurrentSettings(mergedSettings);
  }, [settings]);

  const handleSettingsUpdate = useCallback((updates: Partial<BatchConfigSettings> | ((prev: BatchConfigSettings) => Partial<BatchConfigSettings>)) => {
    setCurrentSettings(prevSettings => {
      // Resolve updates if it's a function
      const resolvedUpdates = typeof updates === 'function' ? updates(prevSettings) : updates;
      return { ...prevSettings, ...resolvedUpdates };
    });
  }, []);

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
        console.log('📝 [GEN CONFIG APPLY] cellConstraints being saved:', JSON.stringify(currentSettings.cellConstraints));
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
              : 'h-8 w-full justify-start gap-2'
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
              : 'h-8 w-full justify-start gap-2'
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

              {/* Distribution Layout */}
              <div className="space-y-3 border border-slate-600 rounded-lg p-3 bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      checked={currentSettings.distributionLayoutEnabled}
                      onCheckedChange={(checked) => handleSettingsUpdate({ distributionLayoutEnabled: checked as boolean })}
                      className="border-slate-500 data-[state=checked]:bg-blue-600"
                      data-testid="checkbox-distribution-layout-enabled"
                    />
                    <Label className="text-sm font-medium text-slate-200">Distribution Layout</Label>
                  </div>
                  <span className="text-xs text-slate-400">
                    {currentSettings.distributionLayoutEnabled
                      ? `Pattern: ${currentSettings.distributionPattern}`
                      : 'Disabled'}
                  </span>
                </div>
                
                {currentSettings.distributionLayoutEnabled && (
                  <div className="space-y-4 mt-3">
                    {/* Main Layout Controls Container */}
                    <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                      {/* Pattern Type */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-200">Pattern Type</Label>
                        <Select 
                          value={currentSettings.distributionPattern}
                          onValueChange={(value) => handleSettingsUpdate({ distributionPattern: value as any })}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                            <SelectItem value="grid" className="text-slate-200 hover:bg-slate-700">Grid (rows × columns)</SelectItem>
                            <SelectItem value="wave" className="text-slate-200 hover:bg-slate-700">Wave</SelectItem>
                            <SelectItem value="ellipse" className="text-slate-200 hover:bg-slate-700">Ellipse</SelectItem>
                            <SelectItem value="spiral" className="text-slate-200 hover:bg-slate-700">Spiral</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    
                      {currentSettings.distributionPattern === 'grid' && (
                        <>
                          {/* Grid Dimensions */}
                          <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Grid Dimensions</Label>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-400">Rows</Label>
                                <BufferedSliderWithNumericInput
                                  value={currentSettings.gridRows}
                                  onValueCommit={(value) => handleSettingsUpdate({ gridRows: value })}
                                  min={1}
                                  max={50}
                                  step={1}
                                  layout="inline"
                                  inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                  sliderClassName="flex-1 [&_[role=slider]]:bg-green-600"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-400">Columns</Label>
                                <BufferedSliderWithNumericInput
                                  value={currentSettings.gridColumns}
                                  onValueCommit={(value) => handleSettingsUpdate({ gridColumns: value })}
                                  min={1}
                                  max={50}
                                  step={1}
                                  layout="inline"
                                  inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                  sliderClassName="flex-1 [&_[role=slider]]:bg-green-600"
                                />
                              </div>
                            </div>
                          </div>
                        
                          {/* X Spacing */}
                          <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">X Spacing</Label>
                            <Select 
                              value={((currentSettings.gridSpacingXMode as any) === 'auto' ? 'auto-centered' : currentSettings.gridSpacingXMode) || 'define'}
                              onValueChange={(value) => handleSettingsUpdate({ gridSpacingXMode: value as 'define' | 'auto-centered' | 'auto-edge-to-edge' })}
                            >
                              <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-200" data-testid="select-x-spacing">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                <SelectItem value="auto-centered" className="text-slate-200 hover:bg-slate-700">Auto - Centered</SelectItem>
                                <SelectItem value="auto-edge-to-edge" className="text-slate-200 hover:bg-slate-700">Auto - Edge to Edge</SelectItem>
                              </SelectContent>
                            </Select>
                            {(currentSettings.gridSpacingXMode || 'define') === 'define' && (
                              <div className="space-y-2 mt-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Grid Start X (px)</Label>
                                  <BufferedSliderWithNumericInput
                                    value={currentSettings.gridStartX || 0}
                                    onValueCommit={(value) => handleSettingsUpdate({ gridStartX: value })}
                                    min={-500}
                                    max={500}
                                    step={5}
                                    layout="inline"
                                    inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                    sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Column Offset (px)</Label>
                                  <BufferedSliderWithNumericInput
                                    value={currentSettings.gridColumnOffset}
                                    onValueCommit={(value) => handleSettingsUpdate({ gridColumnOffset: value })}
                                    min={0}
                                    max={500}
                                    step={5}
                                    layout="inline"
                                    inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                    sliderClassName="flex-1 [&_[role=slider]]:bg-green-600"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        
                          {/* Y Spacing */}
                          <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Y Spacing</Label>
                            <Select 
                              value={((currentSettings.gridSpacingYMode as any) === 'auto' ? 'auto-centered' : currentSettings.gridSpacingYMode) || 'define'}
                              onValueChange={(value) => handleSettingsUpdate({ gridSpacingYMode: value as 'define' | 'auto-centered' | 'auto-edge-to-edge' })}
                            >
                              <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-200" data-testid="select-y-spacing">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                <SelectItem value="auto-centered" className="text-slate-200 hover:bg-slate-700">Auto - Centered</SelectItem>
                                <SelectItem value="auto-edge-to-edge" className="text-slate-200 hover:bg-slate-700">Auto - Edge to Edge</SelectItem>
                              </SelectContent>
                            </Select>
                            {(currentSettings.gridSpacingYMode || 'define') === 'define' && (
                              <div className="space-y-2 mt-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Grid Start Y (px)</Label>
                                  <BufferedSliderWithNumericInput
                                    value={currentSettings.gridStartY || 0}
                                    onValueCommit={(value) => handleSettingsUpdate({ gridStartY: value })}
                                    min={-500}
                                    max={500}
                                    step={5}
                                    layout="inline"
                                    inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                    sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Row Offset (px)</Label>
                                  <BufferedSliderWithNumericInput
                                    value={currentSettings.gridRowOffset}
                                    onValueCommit={(value) => handleSettingsUpdate({ gridRowOffset: value })}
                                    min={0}
                                    max={500}
                                    step={5}
                                    layout="inline"
                                    inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                    sliderClassName="flex-1 [&_[role=slider]]:bg-green-600"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        
                          {/* Custom Margin */}
                          {((currentSettings.gridSpacingXMode === 'auto-centered' || (currentSettings.gridSpacingXMode as any) === 'auto') || 
                            (currentSettings.gridSpacingYMode === 'auto-centered' || (currentSettings.gridSpacingYMode as any) === 'auto')) && (
                            <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  checked={currentSettings.gridMarginEnabled || false}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ gridMarginEnabled: checked as boolean })}
                                  className="border-slate-500 data-[state=checked]:bg-orange-600"
                                  data-testid="checkbox-custom-margin"
                                />
                                <Label className="text-xs font-medium text-slate-300">Custom Margin</Label>
                              </div>
                              {currentSettings.gridMarginEnabled && (
                                <div className="space-y-1 mt-2">
                                  <Label className="text-xs text-slate-400">Margin (px)</Label>
                                  <BufferedSliderWithNumericInput
                                    value={currentSettings.gridMarginValue || 50}
                                    onValueCommit={(value) => handleSettingsUpdate({ gridMarginValue: value })}
                                    min={0}
                                    max={500}
                                    step={5}
                                    layout="inline"
                                    inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                    sliderClassName="flex-1 [&_[role=slider]]:bg-orange-600"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    
                    {currentSettings.distributionPattern === 'grid' && (
                      <div className="space-y-4">
                        
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
                            <span className="text-xs text-slate-400">
                              {(currentSettings.gridOffsets?.mode ?? 'alternating') === 'alternating' 
                                ? 'Alternating row/column offsets' 
                                : 'Pattern-based row/column offsets'}
                            </span>
                          </div>
                          
                          {(currentSettings.gridOffsets?.enabled ?? false) && (
                            <div className="space-y-4 mt-3">
                              {/* Preset Selector */}
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-400">Quick Presets</Label>
                                <Select 
                                  value={currentSettings.gridOffsets?.preset ?? 'custom'}
                                  onValueChange={(preset: 'custom' | 'none' | 'brick' | 'honeycomb' | 'staircase' | 'zigzag' | 'diamond') => {
                                    if (preset === 'none' || preset === 'custom') {
                                      handleSettingsUpdate((prev) => ({ 
                                        gridOffsets: { 
                                          ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                          preset: preset,
                                          enabled: preset === 'custom' ? prev.gridOffsets?.enabled ?? true : false,
                                          row: { ...DEFAULT_GRID_OFFSETS.row },
                                          column: { ...DEFAULT_GRID_OFFSETS.column }
                                        } 
                                      }));
                                      return;
                                    }
                                    
                                    const spacingX = currentSettings.gridColumnOffset || 50;
                                    const spacingY = currentSettings.gridRowOffset || 50;
                                    
                                    const defaultAxisConfig = { amountMode: 'fixed' as const, amountMin: 0, amountMax: 50, amountBase: 0, amountIncrement: 10 };
                                    let newOffsets: GridOffsetsConfig;
                                    switch (preset) {
                                      case 'brick':
                                        newOffsets = {
                                          enabled: true,
                                          mode: 'alternating',
                                          preset: 'brick',
                                          row: { ...defaultAxisConfig, enabled: true, amount: Math.round(spacingX / 2), startIndex: 1, direction: 'right', pattern: [] },
                                          column: { ...defaultAxisConfig, enabled: false, amount: 0, startIndex: 0, direction: 'down', pattern: [] }
                                        };
                                        break;
                                      case 'honeycomb':
                                        newOffsets = {
                                          enabled: true,
                                          mode: 'alternating',
                                          preset: 'honeycomb',
                                          row: { ...defaultAxisConfig, enabled: true, amount: Math.round(spacingX / 2), startIndex: 1, direction: 'right', pattern: [] },
                                          column: { ...defaultAxisConfig, enabled: true, amount: Math.round(spacingY / 4), startIndex: 1, direction: 'down', pattern: [] }
                                        };
                                        break;
                                      case 'staircase':
                                        newOffsets = {
                                          enabled: true,
                                          mode: 'alternating',
                                          preset: 'staircase',
                                          row: { ...defaultAxisConfig, enabled: true, amount: Math.round(spacingX / 4), startIndex: 1, direction: 'right', pattern: [] },
                                          column: { ...defaultAxisConfig, enabled: false, amount: 0, startIndex: 0, direction: 'down', pattern: [] }
                                        };
                                        break;
                                      case 'zigzag':
                                        newOffsets = {
                                          enabled: true,
                                          mode: 'alternating',
                                          preset: 'zigzag',
                                          row: { ...defaultAxisConfig, enabled: false, amount: 0, startIndex: 0, direction: 'right', pattern: [] },
                                          column: { ...defaultAxisConfig, enabled: true, amount: Math.round(spacingY / 2), startIndex: 1, direction: 'down', pattern: [] }
                                        };
                                        break;
                                      case 'diamond':
                                        newOffsets = {
                                          enabled: true,
                                          mode: 'alternating',
                                          preset: 'diamond',
                                          row: { ...defaultAxisConfig, enabled: true, amount: Math.round(spacingX / 2), startIndex: 1, direction: 'right', pattern: [] },
                                          column: { ...defaultAxisConfig, enabled: true, amount: Math.round(spacingY / 2), startIndex: 1, direction: 'down', pattern: [] }
                                        };
                                        break;
                                      default:
                                        return;
                                    }
                                    handleSettingsUpdate({ gridOffsets: newOffsets });
                                  }}
                                >
                                  <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-200" data-testid="select-grid-offsets-preset">
                                    <SelectValue placeholder="Select a preset..." />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                    <SelectItem value="custom" className="text-slate-200 focus:bg-slate-700">Custom</SelectItem>
                                    <SelectItem value="none" className="text-slate-200 focus:bg-slate-700">None (Clear offsets)</SelectItem>
                                    <SelectItem value="brick" className="text-slate-200 focus:bg-slate-700">Brick Pattern</SelectItem>
                                    <SelectItem value="honeycomb" className="text-slate-200 focus:bg-slate-700">Honeycomb Pattern</SelectItem>
                                    <SelectItem value="staircase" className="text-slate-200 focus:bg-slate-700">Staircase Pattern</SelectItem>
                                    <SelectItem value="zigzag" className="text-slate-200 focus:bg-slate-700">Zigzag Pattern</SelectItem>
                                    <SelectItem value="diamond" className="text-slate-200 focus:bg-slate-700">Diamond Pattern</SelectItem>
                                  </SelectContent>
                                </Select>
                                <span className="text-xs text-slate-500">Presets calculate offsets from current grid spacing</span>
                              </div>
                              
                              {/* Mode Selector */}
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-400">Offset Mode</Label>
                                <Select 
                                  value={currentSettings.gridOffsets?.mode ?? 'alternating'}
                                  onValueChange={(value: 'alternating' | 'pattern') => handleSettingsUpdate((prev) => ({ 
                                    gridOffsets: { 
                                      ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                      mode: value 
                                    } 
                                  }))}
                                >
                                  <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-200" data-testid="select-grid-offsets-mode">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                    <SelectItem value="alternating" className="text-slate-200 focus:bg-slate-700">
                                      Alternating (every other row/column)
                                    </SelectItem>
                                    <SelectItem value="pattern" className="text-slate-200 focus:bg-slate-700">
                                      Pattern (specific indices)
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
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
                                  <div className="space-y-2 mt-2">
                                    {/* Amount Mode Selector */}
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <Label className="text-xs text-slate-400">Amount Mode</Label>
                                        <Select 
                                          value={currentSettings.gridOffsets?.row?.amountMode ?? 'fixed'}
                                          onValueChange={(value) => handleSettingsUpdate((prev) => ({ 
                                            gridOffsets: { 
                                              ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                              row: {
                                                ...(prev.gridOffsets?.row || DEFAULT_GRID_OFFSETS.row),
                                                amountMode: value as 'fixed' | 'range' | 'incremental'
                                              }
                                            } 
                                          }))}
                                        >
                                          <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-200" data-testid="select-grid-row-offset-amount-mode">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                            <SelectItem value="fixed" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
                                            <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                            <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
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
                                    
                                    {/* Fixed Mode: Single Amount Input */}
                                    {(currentSettings.gridOffsets?.row?.amountMode ?? 'fixed') === 'fixed' && (
                                      <div className="space-y-1">
                                        <Label className="text-xs text-slate-400">Amount (px)</Label>
                                        <BufferedSliderWithNumericInput
                                          value={currentSettings.gridOffsets?.row?.amount ?? 0}
                                          onValueCommit={(value) => handleSettingsUpdate((prev) => ({ 
                                            gridOffsets: { 
                                              ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                              row: {
                                                ...(prev.gridOffsets?.row || DEFAULT_GRID_OFFSETS.row),
                                                amount: value
                                              }
                                            } 
                                          }))}
                                          min={-500}
                                          max={500}
                                          step={5}
                                          layout="inline"
                                          inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                          sliderClassName="flex-1 [&_[role=slider]]:bg-green-600"
                                        />
                                      </div>
                                    )}
                                    
                                    {/* Range Mode: Min/Max Inputs */}
                                    {(currentSettings.gridOffsets?.row?.amountMode ?? 'fixed') === 'range' && (
                                      <div className="space-y-3">
                                        <Label className="text-xs text-slate-400">Amount Range (px)</Label>
                                        {/* Desktop: inputs flanking slider | Mobile: 2-col grid above slider */}
                                        <div className="hidden md:flex items-center gap-2">
                                          <NumericInput
                                            value={currentSettings.gridOffsets?.row?.amountMin ?? 0}
                                            onChange={(value) => handleSettingsUpdate((prev) => ({ 
                                              gridOffsets: { 
                                                ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                                row: {
                                                  ...(prev.gridOffsets?.row || DEFAULT_GRID_OFFSETS.row),
                                                  amountMin: value
                                                }
                                              } 
                                            }))}
                                            min={-500}
                                            max={500}
                                            step={5}
                                            className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                            data-testid="input-grid-row-offset-amount-min"
                                          />
                                          <Slider
                                            value={[currentSettings.gridOffsets?.row?.amountMin ?? 0, currentSettings.gridOffsets?.row?.amountMax ?? 50]}
                                            onValueChange={([min, max]) => handleSettingsUpdate((prev) => ({ 
                                              gridOffsets: { 
                                                ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                                row: {
                                                  ...(prev.gridOffsets?.row || DEFAULT_GRID_OFFSETS.row),
                                                  amountMin: min,
                                                  amountMax: max
                                                }
                                              } 
                                            }))}
                                            min={-500}
                                            max={500}
                                            step={5}
                                            className="flex-1 [&_[role=slider]]:bg-green-600"
                                          />
                                          <NumericInput
                                            value={currentSettings.gridOffsets?.row?.amountMax ?? 50}
                                            onChange={(value) => handleSettingsUpdate((prev) => ({ 
                                              gridOffsets: { 
                                                ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                                row: {
                                                  ...(prev.gridOffsets?.row || DEFAULT_GRID_OFFSETS.row),
                                                  amountMax: value
                                                }
                                              } 
                                            }))}
                                            min={-500}
                                            max={500}
                                            step={5}
                                            className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                            data-testid="input-grid-row-offset-amount-max-desktop"
                                          />
                                        </div>
                                        {/* Mobile layout: 2-column grid for inputs, slider below */}
                                        <div className="md:hidden space-y-3">
                                          <div className="grid grid-cols-2 gap-2">
                                            <NumericInput
                                              value={currentSettings.gridOffsets?.row?.amountMin ?? 0}
                                              onChange={(value) => handleSettingsUpdate((prev) => ({ 
                                                gridOffsets: { 
                                                  ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                                  row: {
                                                    ...(prev.gridOffsets?.row || DEFAULT_GRID_OFFSETS.row),
                                                    amountMin: value
                                                  }
                                                } 
                                              }))}
                                              min={-500}
                                              max={500}
                                              step={5}
                                              className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                              data-testid="input-grid-row-offset-amount-min"
                                            />
                                            <NumericInput
                                              value={currentSettings.gridOffsets?.row?.amountMax ?? 50}
                                              onChange={(value) => handleSettingsUpdate((prev) => ({ 
                                                gridOffsets: { 
                                                  ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                                  row: {
                                                    ...(prev.gridOffsets?.row || DEFAULT_GRID_OFFSETS.row),
                                                    amountMax: value
                                                  }
                                                } 
                                              }))}
                                              min={-500}
                                              max={500}
                                              step={5}
                                              className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                              data-testid="input-grid-row-offset-amount-max"
                                            />
                                          </div>
                                          <Slider
                                            value={[currentSettings.gridOffsets?.row?.amountMin ?? 0, currentSettings.gridOffsets?.row?.amountMax ?? 50]}
                                            onValueChange={([min, max]) => handleSettingsUpdate((prev) => ({ 
                                              gridOffsets: { 
                                                ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                                row: {
                                                  ...(prev.gridOffsets?.row || DEFAULT_GRID_OFFSETS.row),
                                                  amountMin: min,
                                                  amountMax: max
                                                }
                                              } 
                                            }))}
                                            min={-500}
                                            max={500}
                                            step={5}
                                            className="[&_[role=slider]]:bg-green-600"
                                          />
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Incremental Mode: Base/Increment Inputs */}
                                    {(currentSettings.gridOffsets?.row?.amountMode ?? 'fixed') === 'incremental' && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                          <Label className="text-xs text-slate-400">Base (px)</Label>
                                          <BufferedSliderWithNumericInput
                                            value={currentSettings.gridOffsets?.row?.amountBase ?? 0}
                                            onValueCommit={(value) => handleSettingsUpdate((prev) => ({ 
                                              gridOffsets: { 
                                                ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                                row: {
                                                  ...(prev.gridOffsets?.row || DEFAULT_GRID_OFFSETS.row),
                                                  amountBase: value
                                                }
                                              } 
                                            }))}
                                            min={-500}
                                            max={500}
                                            step={5}
                                            inputClassName="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                            sliderClassName="[&_[role=slider]]:bg-green-600"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label className="text-xs text-slate-400">Increment (px)</Label>
                                          <BufferedSliderWithNumericInput
                                            value={currentSettings.gridOffsets?.row?.amountIncrement ?? 10}
                                            onValueCommit={(value) => handleSettingsUpdate((prev) => ({ 
                                              gridOffsets: { 
                                                ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                                row: {
                                                  ...(prev.gridOffsets?.row || DEFAULT_GRID_OFFSETS.row),
                                                  amountIncrement: value
                                                }
                                              } 
                                            }))}
                                            min={-100}
                                            max={100}
                                            step={5}
                                            inputClassName="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                            sliderClassName="[&_[role=slider]]:bg-green-600"
                                          />
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Alternating mode: Start From selector */}
                                    {(currentSettings.gridOffsets?.mode ?? 'alternating') === 'alternating' && (
                                      <div className="space-y-1">
                                        <Label className="text-xs text-slate-400">Start From</Label>
                                        <Select 
                                          value={String(Math.min(currentSettings.gridOffsets?.row?.startIndex ?? 0, currentSettings.gridRows - 1))}
                                          onValueChange={(value) => handleSettingsUpdate((prev) => ({ 
                                            gridOffsets: { 
                                              ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                              row: {
                                                ...(prev.gridOffsets?.row || DEFAULT_GRID_OFFSETS.row),
                                                startIndex: parseInt(value)
                                              }
                                            } 
                                          }))}
                                        >
                                          <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-200" data-testid="select-grid-row-offset-start">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                            {Array.from({ length: currentSettings.gridRows }, (_, i) => (
                                              <SelectItem key={i} value={String(i)} className="text-slate-200 hover:bg-slate-700">
                                                {i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`} row
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                    
                                    {/* Pattern mode: Row indices input */}
                                    {(currentSettings.gridOffsets?.mode ?? 'alternating') === 'pattern' && (
                                      <div className="space-y-1">
                                        <Label className="text-xs text-slate-400">Row Indices (comma-separated, 0-based)</Label>
                                        <Input
                                          type="text"
                                          value={(currentSettings.gridOffsets?.row?.pattern ?? []).join(', ')}
                                          onChange={(e) => {
                                            const rawValue = e.target.value;
                                            const indices = rawValue
                                              .split(',')
                                              .map(s => s.trim())
                                              .filter(s => s !== '')
                                              .map(s => parseInt(s, 10))
                                              .filter(n => !isNaN(n) && n >= 0);
                                            handleSettingsUpdate((prev) => ({ 
                                              gridOffsets: { 
                                                ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                                row: {
                                                  ...(prev.gridOffsets?.row || DEFAULT_GRID_OFFSETS.row),
                                                  pattern: indices
                                                }
                                              } 
                                            }));
                                          }}
                                          placeholder="e.g., 0, 2, 4"
                                          className="h-8 bg-slate-800 border-slate-600 text-slate-200"
                                          data-testid="input-grid-row-offset-pattern"
                                        />
                                        <span className="text-xs text-slate-500">Rows at these indices will be offset</span>
                                      </div>
                                    )}
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
                                  <div className="space-y-2 mt-2">
                                    {/* Amount Mode Selector */}
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <Label className="text-xs text-slate-400">Amount Mode</Label>
                                        <Select 
                                          value={currentSettings.gridOffsets?.column?.amountMode ?? 'fixed'}
                                          onValueChange={(value) => handleSettingsUpdate((prev) => ({ 
                                            gridOffsets: { 
                                              ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                              column: {
                                                ...(prev.gridOffsets?.column || DEFAULT_GRID_OFFSETS.column),
                                                amountMode: value as 'fixed' | 'range' | 'incremental'
                                              }
                                            } 
                                          }))}
                                        >
                                          <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-200" data-testid="select-grid-column-offset-amount-mode">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                            <SelectItem value="fixed" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
                                            <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                            <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
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
                                    
                                    {/* Fixed Mode: Single Amount Input */}
                                    {(currentSettings.gridOffsets?.column?.amountMode ?? 'fixed') === 'fixed' && (
                                      <div className="space-y-1">
                                        <Label className="text-xs text-slate-400">Amount (px)</Label>
                                        <BufferedSliderWithNumericInput
                                          value={currentSettings.gridOffsets?.column?.amount ?? 0}
                                          onValueCommit={(value) => handleSettingsUpdate((prev) => ({ 
                                            gridOffsets: { 
                                              ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                              column: {
                                                ...(prev.gridOffsets?.column || DEFAULT_GRID_OFFSETS.column),
                                                amount: value
                                              }
                                            } 
                                          }))}
                                          min={-500}
                                          max={500}
                                          step={5}
                                          layout="inline"
                                          inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                          sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                        />
                                      </div>
                                    )}
                                    
                                    {/* Range Mode: Min/Max Inputs */}
                                    {(currentSettings.gridOffsets?.column?.amountMode ?? 'fixed') === 'range' && (
                                      <div className="space-y-3">
                                        <Label className="text-xs text-slate-400">Amount Range (px)</Label>
                                        {/* Desktop: inputs flanking slider | Mobile: 2-col grid above slider */}
                                        <div className="hidden md:flex items-center gap-2">
                                          <NumericInput
                                            value={currentSettings.gridOffsets?.column?.amountMin ?? 0}
                                            onChange={(value) => handleSettingsUpdate((prev) => ({ 
                                              gridOffsets: { 
                                                ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                                column: {
                                                  ...(prev.gridOffsets?.column || DEFAULT_GRID_OFFSETS.column),
                                                  amountMin: value
                                                }
                                              } 
                                            }))}
                                            min={-500}
                                            max={500}
                                            step={5}
                                            className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                            data-testid="input-grid-column-offset-amount-min"
                                          />
                                          <Slider
                                            value={[currentSettings.gridOffsets?.column?.amountMin ?? 0, currentSettings.gridOffsets?.column?.amountMax ?? 50]}
                                            onValueChange={([min, max]) => handleSettingsUpdate((prev) => ({ 
                                              gridOffsets: { 
                                                ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                                column: {
                                                  ...(prev.gridOffsets?.column || DEFAULT_GRID_OFFSETS.column),
                                                  amountMin: min,
                                                  amountMax: max
                                                }
                                              } 
                                            }))}
                                            min={-500}
                                            max={500}
                                            step={5}
                                            className="flex-1 [&_[role=slider]]:bg-blue-600"
                                          />
                                          <NumericInput
                                            value={currentSettings.gridOffsets?.column?.amountMax ?? 50}
                                            onChange={(value) => handleSettingsUpdate((prev) => ({ 
                                              gridOffsets: { 
                                                ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                                column: {
                                                  ...(prev.gridOffsets?.column || DEFAULT_GRID_OFFSETS.column),
                                                  amountMax: value
                                                }
                                              } 
                                            }))}
                                            min={-500}
                                            max={500}
                                            step={5}
                                            className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                            data-testid="input-grid-column-offset-amount-max-desktop"
                                          />
                                        </div>
                                        {/* Mobile layout: 2-column grid for inputs, slider below */}
                                        <div className="md:hidden space-y-3">
                                          <div className="grid grid-cols-2 gap-2">
                                            <NumericInput
                                              value={currentSettings.gridOffsets?.column?.amountMin ?? 0}
                                              onChange={(value) => handleSettingsUpdate((prev) => ({ 
                                                gridOffsets: { 
                                                  ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                                  column: {
                                                    ...(prev.gridOffsets?.column || DEFAULT_GRID_OFFSETS.column),
                                                    amountMin: value
                                                  }
                                                } 
                                              }))}
                                              min={-500}
                                              max={500}
                                              step={5}
                                              className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                              data-testid="input-grid-column-offset-amount-min"
                                            />
                                            <NumericInput
                                              value={currentSettings.gridOffsets?.column?.amountMax ?? 50}
                                              onChange={(value) => handleSettingsUpdate((prev) => ({ 
                                                gridOffsets: { 
                                                  ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                                  column: {
                                                    ...(prev.gridOffsets?.column || DEFAULT_GRID_OFFSETS.column),
                                                    amountMax: value
                                                  }
                                                } 
                                              }))}
                                              min={-500}
                                              max={500}
                                              step={5}
                                              className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                              data-testid="input-grid-column-offset-amount-max"
                                            />
                                          </div>
                                          <Slider
                                            value={[currentSettings.gridOffsets?.column?.amountMin ?? 0, currentSettings.gridOffsets?.column?.amountMax ?? 50]}
                                            onValueChange={([min, max]) => handleSettingsUpdate((prev) => ({ 
                                              gridOffsets: { 
                                                ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                                column: {
                                                  ...(prev.gridOffsets?.column || DEFAULT_GRID_OFFSETS.column),
                                                  amountMin: min,
                                                  amountMax: max
                                                }
                                              } 
                                            }))}
                                            min={-500}
                                            max={500}
                                            step={5}
                                            className="[&_[role=slider]]:bg-blue-600"
                                          />
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Incremental Mode: Base/Increment Inputs */}
                                    {(currentSettings.gridOffsets?.column?.amountMode ?? 'fixed') === 'incremental' && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                          <Label className="text-xs text-slate-400">Base (px)</Label>
                                          <BufferedSliderWithNumericInput
                                            value={currentSettings.gridOffsets?.column?.amountBase ?? 0}
                                            onValueCommit={(value) => handleSettingsUpdate((prev) => ({ 
                                              gridOffsets: { 
                                                ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                                column: {
                                                  ...(prev.gridOffsets?.column || DEFAULT_GRID_OFFSETS.column),
                                                  amountBase: value
                                                }
                                              } 
                                            }))}
                                            min={-500}
                                            max={500}
                                            step={5}
                                            inputClassName="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                            sliderClassName="[&_[role=slider]]:bg-blue-600"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label className="text-xs text-slate-400">Increment (px)</Label>
                                          <BufferedSliderWithNumericInput
                                            value={currentSettings.gridOffsets?.column?.amountIncrement ?? 10}
                                            onValueCommit={(value) => handleSettingsUpdate((prev) => ({ 
                                              gridOffsets: { 
                                                ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                                column: {
                                                  ...(prev.gridOffsets?.column || DEFAULT_GRID_OFFSETS.column),
                                                  amountIncrement: value
                                                }
                                              } 
                                            }))}
                                            min={-100}
                                            max={100}
                                            step={5}
                                            inputClassName="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                            sliderClassName="[&_[role=slider]]:bg-blue-600"
                                          />
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Alternating mode: Start From selector */}
                                    {(currentSettings.gridOffsets?.mode ?? 'alternating') === 'alternating' && (
                                      <div className="space-y-1">
                                        <Label className="text-xs text-slate-400">Start From</Label>
                                        <Select 
                                          value={String(Math.min(currentSettings.gridOffsets?.column?.startIndex ?? 0, currentSettings.gridColumns - 1))}
                                          onValueChange={(value) => handleSettingsUpdate((prev) => ({ 
                                            gridOffsets: { 
                                              ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                              column: {
                                                ...(prev.gridOffsets?.column || DEFAULT_GRID_OFFSETS.column),
                                                startIndex: parseInt(value)
                                              }
                                            } 
                                          }))}
                                        >
                                          <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-200" data-testid="select-grid-column-offset-start">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                            {Array.from({ length: currentSettings.gridColumns }, (_, i) => (
                                              <SelectItem key={i} value={String(i)} className="text-slate-200 hover:bg-slate-700">
                                                {i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`} column
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                    
                                    {/* Pattern mode: Column indices input */}
                                    {(currentSettings.gridOffsets?.mode ?? 'alternating') === 'pattern' && (
                                      <div className="space-y-1">
                                        <Label className="text-xs text-slate-400">Column Indices (comma-separated, 0-based)</Label>
                                        <Input
                                          type="text"
                                          value={(currentSettings.gridOffsets?.column?.pattern ?? []).join(', ')}
                                          onChange={(e) => {
                                            const rawValue = e.target.value;
                                            const indices = rawValue
                                              .split(',')
                                              .map(s => s.trim())
                                              .filter(s => s !== '')
                                              .map(s => parseInt(s, 10))
                                              .filter(n => !isNaN(n) && n >= 0);
                                            handleSettingsUpdate((prev) => ({ 
                                              gridOffsets: { 
                                                ...(prev.gridOffsets || DEFAULT_GRID_OFFSETS), 
                                                column: {
                                                  ...(prev.gridOffsets?.column || DEFAULT_GRID_OFFSETS.column),
                                                  pattern: indices
                                                }
                                              } 
                                            }));
                                          }}
                                          placeholder="e.g., 0, 2, 4"
                                          className="h-8 bg-slate-800 border-slate-600 text-slate-200"
                                          data-testid="input-grid-column-offset-pattern"
                                        />
                                        <span className="text-xs text-slate-500">Columns at these indices will be offset</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Render Mode Section */}
                        <div className="space-y-3 border border-slate-600 rounded-lg p-3 bg-slate-800/50">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-slate-200">Render Mode</Label>
                            <Select 
                              value={currentSettings.cellConstraints?.renderMode ?? 'point'}
                              onValueChange={(value) => handleSettingsUpdate((prev) => {
                                const newRenderMode = value as 'point' | 'cell' | 'cell-point';
                                // Cell and Cell-Point modes require enabled=true for fit constraints
                                // Point mode doesn't use fit constraints so enabled=false
                                const newEnabled = newRenderMode !== 'point';
                                return { 
                                  cellConstraints: { 
                                    ...(prev.cellConstraints || DEFAULT_CELL_CONSTRAINTS), 
                                    enabled: newEnabled,
                                    renderMode: newRenderMode
                                  } 
                                };
                              })}
                            >
                              <SelectTrigger className="h-8 w-40 bg-slate-800 border-slate-600 text-slate-200" data-testid="select-render-mode">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="point" className="text-slate-200 hover:bg-slate-700">Point</SelectItem>
                                <SelectItem value="cell" className="text-slate-200 hover:bg-slate-700">Cell</SelectItem>
                                <SelectItem value="cell-point" className="text-slate-200 hover:bg-slate-700">Cell Points</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <p className="text-xs text-slate-500">
                            {(currentSettings.cellConstraints?.renderMode ?? 'point') === 'point'
                              ? 'Shapes placed at grid intersection points'
                              : (currentSettings.cellConstraints?.renderMode ?? 'point') === 'cell'
                                ? 'Shapes centered in cells between grid lines with size constraints'
                                : 'Shapes at intersection points with cell-based size constraints'}
                          </p>
                          
                          {/* Cell Mode Warning - only for 'cell' mode which reduces shape count */}
                          {(currentSettings.cellConstraints?.renderMode ?? 'point') === 'cell' && (
                            <p className="text-xs text-amber-400 bg-amber-900/20 rounded px-2 py-1 border border-amber-700/30">
                              Note: Cell mode limits shape count to (rows-1) × (cols-1) cells. 
                              Currently: {Math.max(0, (currentSettings.gridRows - 1))} × {Math.max(0, (currentSettings.gridColumns - 1))} = {Math.max(0, (currentSettings.gridRows - 1)) * Math.max(0, (currentSettings.gridColumns - 1))} max shapes
                            </p>
                          )}
                          
                          {/* Cell Points Mode Info */}
                          {(currentSettings.cellConstraints?.renderMode ?? 'point') === 'cell-point' && (
                            <p className="text-xs text-blue-400 bg-blue-900/20 rounded px-2 py-1 border border-blue-700/30">
                              Cell Points: {currentSettings.gridRows} × {currentSettings.gridColumns} = {currentSettings.gridRows * currentSettings.gridColumns} shapes with fit constraints. 
                              Edge cells extend beyond artboard.
                            </p>
                          )}
                          
                          {/* Cell/Cell-Point Mode Options - show for both modes that have fit constraints */}
                          {((currentSettings.cellConstraints?.renderMode ?? 'point') === 'cell' || (currentSettings.cellConstraints?.renderMode ?? 'point') === 'cell-point') && (
                            <div className="space-y-3 mt-2 pt-3 border-t border-slate-600">
                              {/* Fit Mode */}
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-400">Fit Mode</Label>
                                <Select 
                                  value={currentSettings.cellConstraints?.fitMode ?? 'contain'}
                                  onValueChange={(value) => handleSettingsUpdate((prev) => ({ 
                                    cellConstraints: { 
                                      ...(prev.cellConstraints || DEFAULT_CELL_CONSTRAINTS), 
                                      fitMode: value as 'none' | 'fill' | 'contain' | 'cover'
                                    } 
                                  }))}
                                >
                                  <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-200" data-testid="select-fit-mode">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                    <SelectItem value="none" className="text-slate-200 hover:bg-slate-700">None (Original Size)</SelectItem>
                                    <SelectItem value="contain" className="text-slate-200 hover:bg-slate-700">Contain (Fit Inside)</SelectItem>
                                    <SelectItem value="cover" className="text-slate-200 hover:bg-slate-700">Cover (Fill Cell)</SelectItem>
                                    <SelectItem value="fill" className="text-slate-200 hover:bg-slate-700">Fill (Stretch)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              
                              {/* Padding */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs text-slate-400">Cell Padding</Label>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">
                                      {currentSettings.cellConstraints?.padding ?? 0}{currentSettings.cellConstraints?.paddingUnit ?? 'px'}
                                    </span>
                                    <Select 
                                      value={currentSettings.cellConstraints?.paddingUnit ?? 'px'}
                                      onValueChange={(value) => handleSettingsUpdate((prev) => ({ 
                                        cellConstraints: { 
                                          ...(prev.cellConstraints || DEFAULT_CELL_CONSTRAINTS), 
                                          paddingUnit: value as 'px' | '%'
                                        } 
                                      }))}
                                    >
                                      <SelectTrigger className="h-6 w-14 text-xs bg-slate-800 border-slate-600 text-slate-200" data-testid="select-padding-unit">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                        <SelectItem value="px" className="text-slate-200 hover:bg-slate-700">px</SelectItem>
                                        <SelectItem value="%" className="text-slate-200 hover:bg-slate-700">%</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <Slider
                                  value={[currentSettings.cellConstraints?.padding ?? 0]}
                                  onValueChange={([value]) => handleSettingsUpdate((prev) => ({ 
                                    cellConstraints: { 
                                      ...(prev.cellConstraints || DEFAULT_CELL_CONSTRAINTS), 
                                      padding: value
                                    } 
                                  }))}
                                  min={0}
                                  max={(currentSettings.cellConstraints?.paddingUnit ?? 'px') === '%' ? 50 : 100}
                                  step={(currentSettings.cellConstraints?.paddingUnit ?? 'px') === '%' ? 1 : 5}
                                  data-testid="slider-padding"
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* Debug Grid Toggle */}
                          <div className="flex items-center space-x-2 pt-2 border-t border-slate-600">
                            <Checkbox 
                              checked={currentSettings.cellConstraints?.showDebugGrid ?? false}
                              onCheckedChange={(checked) => handleSettingsUpdate((prev) => ({ 
                                cellConstraints: { 
                                  ...(prev.cellConstraints || DEFAULT_CELL_CONSTRAINTS), 
                                  showDebugGrid: checked as boolean
                                } 
                              }))}
                              className="border-red-500 data-[state=checked]:bg-red-600"
                              data-testid="checkbox-show-debug-grid"
                            />
                            <Label className="text-xs text-slate-300">Show Debug Grid</Label>
                            <span className="text-xs text-slate-500">(red overlay)</span>
                          </div>
                        </div>
                        
                        {/* Randomization Container */}
                        <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                          <Label className="text-xs font-medium text-slate-300">Position Randomization</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-400">X Random (px)</Label>
                              <BufferedSliderWithNumericInput
                                value={currentSettings.gridXRandomization}
                                onValueCommit={(value) => handleSettingsUpdate({ gridXRandomization: value })}
                                min={0}
                                max={500}
                                step={5}
                                layout="inline"
                                inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                sliderClassName="flex-1 [&_[role=slider]]:bg-purple-600"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-400">Y Random (px)</Label>
                              <BufferedSliderWithNumericInput
                                value={currentSettings.gridYRandomization}
                                onValueCommit={(value) => handleSettingsUpdate({ gridYRandomization: value })}
                                min={0}
                                max={500}
                                step={5}
                                layout="inline"
                                inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                sliderClassName="flex-1 [&_[role=slider]]:bg-purple-600"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Sorting Container */}
                        <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                          <Label className="text-xs font-medium text-slate-300">Sort By</Label>
                          <Select 
                            value={currentSettings.gridSortBy}
                            onValueChange={(value) => handleSettingsUpdate({ gridSortBy: value as any })}
                          >
                            <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-200">
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
                        
                          {currentSettings.gridSortBy !== 'none' && (
                            <div className="space-y-2 mt-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Scope</Label>
                                  <Select 
                                    value={currentSettings.gridSortScope}
                                    onValueChange={(value) => handleSettingsUpdate({ gridSortScope: value as any })}
                                  >
                                    <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="per-generation" className="text-slate-200 hover:bg-slate-700">Per Generation</SelectItem>
                                      <SelectItem value="per-batch" className="text-slate-200 hover:bg-slate-700">Per Batch</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Order</Label>
                                  <Select 
                                    value={currentSettings.gridSortOrder}
                                    onValueChange={(value) => handleSettingsUpdate({ gridSortOrder: value as any })}
                                  >
                                    <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="ascending" className="text-slate-200 hover:bg-slate-700">Ascending</SelectItem>
                                      <SelectItem value="descending" className="text-slate-200 hover:bg-slate-700">Descending</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2 pt-1">
                                <Checkbox 
                                  checked={currentSettings.gridGroupByShapeType}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ gridGroupByShapeType: checked as boolean })}
                                  className="border-slate-500 data-[state=checked]:bg-purple-600"
                                  data-testid="checkbox-group-by-shape-type"
                                />
                                <Label className="text-xs text-slate-400">Group by Shape Type</Label>
                              </div>
                              
                              {currentSettings.gridGroupByShapeType && (
                                <div className="flex items-center space-x-2">
                                  <Checkbox 
                                    checked={currentSettings.gridReverseGroups}
                                    onCheckedChange={(checked) => handleSettingsUpdate({ gridReverseGroups: checked as boolean })}
                                    className="border-slate-500 data-[state=checked]:bg-purple-600"
                                    data-testid="checkbox-reverse-groups"
                                  />
                                  <Label className="text-xs text-slate-400">Reverse Groups</Label>
                                </div>
                              )}
                            </div>
                          )}
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

              {/* Shape Masking Section - Modern Styling */}
              <div className="space-y-3 border border-slate-600 rounded-lg p-3 bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      checked={currentSettings.shapeMasking?.enabled ?? false}
                      onCheckedChange={(checked) => handleSettingsUpdate((prev) => ({ 
                        shapeMasking: { 
                          ...(prev.shapeMasking || DEFAULT_SHAPE_MASKING), 
                          enabled: checked as boolean,
                          grid: {
                            ...(prev.shapeMasking?.grid || DEFAULT_SHAPE_MASKING.grid),
                            enabled: checked as boolean
                          }
                        } 
                      }))}
                      className="border-slate-500 data-[state=checked]:bg-purple-600"
                      data-testid="checkbox-shape-masking-enabled"
                    />
                    <Label className="text-sm font-medium text-slate-200">Shape Masking</Label>
                  </div>
                  <span className="text-xs text-slate-400">
                    {(currentSettings.shapeMasking?.enabled ?? false)
                      ? `Grid: ${currentSettings.shapeMasking?.grid?.mode ?? 'alternating'}`
                      : 'Disabled'}
                  </span>
                </div>
                
                {(currentSettings.shapeMasking?.enabled ?? false) && (
                  <div className="space-y-4 mt-3">
                    {/* Grid Position Masking - First filter type */}
                    <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          checked={currentSettings.shapeMasking?.grid?.enabled ?? false}
                          onCheckedChange={(checked) => handleSettingsUpdate((prev) => ({ 
                            shapeMasking: { 
                              ...(prev.shapeMasking || DEFAULT_SHAPE_MASKING), 
                              grid: {
                                ...(prev.shapeMasking?.grid || DEFAULT_SHAPE_MASKING.grid),
                                enabled: checked as boolean
                              }
                            } 
                          }))}
                          className="border-slate-500 data-[state=checked]:bg-blue-600"
                          data-testid="checkbox-shape-masking-grid-enabled"
                        />
                        <Label className="text-sm font-medium text-slate-200">Grid Position</Label>
                        <span className="text-xs text-slate-400">Filter by row/column indices</span>
                      </div>
                      
                      {(currentSettings.shapeMasking?.grid?.enabled ?? false) && (
                        <div className="ml-6 space-y-3">
                          {/* Mode and Priority Row */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-400">Mode</Label>
                              <Select 
                                value={currentSettings.shapeMasking?.grid?.mode ?? 'alternating'}
                                onValueChange={(value) => handleSettingsUpdate((prev) => ({ 
                                  shapeMasking: { 
                                    ...(prev.shapeMasking || DEFAULT_SHAPE_MASKING), 
                                    grid: {
                                      ...(prev.shapeMasking?.grid || DEFAULT_SHAPE_MASKING.grid),
                                      mode: value as 'alternating' | 'pattern'
                                    }
                                  } 
                                }))}
                              >
                                <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-200" data-testid="select-shape-masking-mode">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="alternating" className="text-slate-200 hover:bg-slate-700">Alternating</SelectItem>
                                  <SelectItem value="pattern" className="text-slate-200 hover:bg-slate-700">Pattern</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-400">Priority</Label>
                              <Select 
                                value={currentSettings.shapeMasking?.grid?.priority ?? 'row-first'}
                                onValueChange={(value) => handleSettingsUpdate((prev) => ({ 
                                  shapeMasking: { 
                                    ...(prev.shapeMasking || DEFAULT_SHAPE_MASKING), 
                                    grid: {
                                      ...(prev.shapeMasking?.grid || DEFAULT_SHAPE_MASKING.grid),
                                      priority: value as 'row-first' | 'column-first'
                                    }
                                  } 
                                }))}
                              >
                                <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-200" data-testid="select-shape-masking-priority">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="row-first" className="text-slate-200 hover:bg-slate-700">Row First</SelectItem>
                                  <SelectItem value="column-first" className="text-slate-200 hover:bg-slate-700">Column First</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          {/* Invert Toggle */}
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              checked={currentSettings.shapeMasking?.grid?.invert ?? false}
                              onCheckedChange={(checked) => handleSettingsUpdate((prev) => ({ 
                                shapeMasking: { 
                                  ...(prev.shapeMasking || DEFAULT_SHAPE_MASKING), 
                                  grid: {
                                    ...(prev.shapeMasking?.grid || DEFAULT_SHAPE_MASKING.grid),
                                    invert: checked as boolean
                                  }
                                } 
                              }))}
                              className="border-slate-500 data-[state=checked]:bg-blue-600"
                              data-testid="checkbox-shape-masking-invert"
                            />
                            <Label className="text-xs text-slate-300">
                              Invert: {(currentSettings.shapeMasking?.grid?.invert ?? false) 
                                ? 'Render only matched positions' 
                                : 'Exclude matched positions'}
                            </Label>
                          </div>
                          
                          {/* Alternating Mode Controls */}
                          {(currentSettings.shapeMasking?.grid?.mode ?? 'alternating') === 'alternating' && (
                            <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                              <Label className="text-xs font-medium text-slate-300">Alternating Settings</Label>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Skip Every N</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={currentSettings.shapeMasking?.grid?.alternating?.skipEvery ?? 2}
                                    onChange={(e) => {
                                      const value = Math.max(1, Math.min(10, parseInt(e.target.value) || 2));
                                      handleSettingsUpdate((prev) => ({ 
                                        shapeMasking: { 
                                          ...(prev.shapeMasking || DEFAULT_SHAPE_MASKING), 
                                          grid: {
                                            ...(prev.shapeMasking?.grid || DEFAULT_SHAPE_MASKING.grid),
                                            alternating: {
                                              ...(prev.shapeMasking?.grid?.alternating || DEFAULT_SHAPE_MASKING.grid.alternating),
                                              skipEvery: value
                                            }
                                          }
                                        } 
                                      }));
                                    }}
                                    className="h-8 bg-slate-800 border-slate-600 text-slate-200"
                                    data-testid="input-shape-masking-skip-every"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Start Index</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={currentSettings.shapeMasking?.grid?.alternating?.skipEvery ? currentSettings.shapeMasking.grid.alternating.skipEvery - 1 : 1}
                                    value={currentSettings.shapeMasking?.grid?.alternating?.startIndex ?? 0}
                                    onChange={(e) => {
                                      const skipEvery = currentSettings.shapeMasking?.grid?.alternating?.skipEvery ?? 2;
                                      const value = Math.max(0, Math.min(skipEvery - 1, parseInt(e.target.value) || 0));
                                      handleSettingsUpdate((prev) => ({ 
                                        shapeMasking: { 
                                          ...(prev.shapeMasking || DEFAULT_SHAPE_MASKING), 
                                          grid: {
                                            ...(prev.shapeMasking?.grid || DEFAULT_SHAPE_MASKING.grid),
                                            alternating: {
                                              ...(prev.shapeMasking?.grid?.alternating || DEFAULT_SHAPE_MASKING.grid.alternating),
                                              startIndex: value
                                            }
                                          }
                                        } 
                                      }));
                                    }}
                                    className="h-8 bg-slate-800 border-slate-600 text-slate-200"
                                    data-testid="input-shape-masking-start-index"
                                  />
                                </div>
                              </div>
                              <span className="text-xs text-slate-500">
                                Masks {(currentSettings.shapeMasking?.grid?.priority ?? 'row-first') === 'row-first' ? 'rows' : 'columns'} at indices {currentSettings.shapeMasking?.grid?.alternating?.startIndex ?? 0}, {(currentSettings.shapeMasking?.grid?.alternating?.startIndex ?? 0) + (currentSettings.shapeMasking?.grid?.alternating?.skipEvery ?? 2)}, {(currentSettings.shapeMasking?.grid?.alternating?.startIndex ?? 0) + 2*(currentSettings.shapeMasking?.grid?.alternating?.skipEvery ?? 2)}, ...
                              </span>
                            </div>
                          )}
                          
                          {/* Pattern Mode Controls */}
                          {(currentSettings.shapeMasking?.grid?.mode ?? 'alternating') === 'pattern' && (
                            <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                              <Label className="text-xs font-medium text-slate-300">Pattern Settings</Label>
                              <div className="space-y-2">
                                {(currentSettings.shapeMasking?.grid?.pattern ?? []).map((entry, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <Label className="text-xs text-slate-400">Row {idx + 1}</Label>
                                        <Input
                                          type="number"
                                          min={0}
                                          value={entry.row}
                                          onChange={(e) => {
                                            const newRow = Math.max(0, parseInt(e.target.value) || 0);
                                            handleSettingsUpdate((prev) => {
                                              const patterns = [...(prev.shapeMasking?.grid?.pattern ?? [])];
                                              patterns[idx] = { ...patterns[idx], row: newRow };
                                              return { 
                                                shapeMasking: { 
                                                  ...(prev.shapeMasking || DEFAULT_SHAPE_MASKING), 
                                                  grid: {
                                                    ...(prev.shapeMasking?.grid || DEFAULT_SHAPE_MASKING.grid),
                                                    pattern: patterns
                                                  }
                                                } 
                                              };
                                            });
                                          }}
                                          className="h-7 bg-slate-800 border-slate-600 text-slate-200 text-xs"
                                          data-testid={`input-shape-masking-pattern-row-${idx}`}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs text-slate-400">Columns</Label>
                                        <Input
                                          type="text"
                                          value={entry.columns.join(', ')}
                                          onChange={(e) => {
                                            const cols = e.target.value
                                              .split(',')
                                              .map(s => s.trim())
                                              .filter(s => s !== '')
                                              .map(s => parseInt(s, 10))
                                              .filter(n => !isNaN(n) && n >= 0);
                                            handleSettingsUpdate((prev) => {
                                              const patterns = [...(prev.shapeMasking?.grid?.pattern ?? [])];
                                              patterns[idx] = { ...patterns[idx], columns: cols };
                                              return { 
                                                shapeMasking: { 
                                                  ...(prev.shapeMasking || DEFAULT_SHAPE_MASKING), 
                                                  grid: {
                                                    ...(prev.shapeMasking?.grid || DEFAULT_SHAPE_MASKING.grid),
                                                    pattern: patterns
                                                  }
                                                } 
                                              };
                                            });
                                          }}
                                          placeholder="0, 1, 3"
                                          className="h-7 bg-slate-800 border-slate-600 text-slate-200 text-xs"
                                          data-testid={`input-shape-masking-pattern-cols-${idx}`}
                                        />
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        handleSettingsUpdate((prev) => {
                                          const patterns = [...(prev.shapeMasking?.grid?.pattern ?? [])];
                                          patterns.splice(idx, 1);
                                          return { 
                                            shapeMasking: { 
                                              ...(prev.shapeMasking || DEFAULT_SHAPE_MASKING), 
                                              grid: {
                                                ...(prev.shapeMasking?.grid || DEFAULT_SHAPE_MASKING.grid),
                                                pattern: patterns
                                              }
                                            } 
                                          };
                                        });
                                      }}
                                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded"
                                      data-testid={`button-shape-masking-pattern-remove-${idx}`}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  onClick={() => {
                                    handleSettingsUpdate((prev) => {
                                      const patterns = [...(prev.shapeMasking?.grid?.pattern ?? [])];
                                      patterns.push({ row: patterns.length, columns: [] });
                                      return { 
                                        shapeMasking: { 
                                          ...(prev.shapeMasking || DEFAULT_SHAPE_MASKING), 
                                          grid: {
                                            ...(prev.shapeMasking?.grid || DEFAULT_SHAPE_MASKING.grid),
                                            pattern: patterns
                                          }
                                        } 
                                      };
                                    });
                                  }}
                                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-slate-700"
                                  data-testid="button-shape-masking-pattern-add"
                                >
                                  <Plus className="h-3 w-3" /> Add Row Pattern
                                </button>
                              </div>
                              <span className="text-xs text-slate-500">Define specific row/column combinations to mask</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Future filter types will be added here: Position, Color, Size, etc. */}
                    <div className="text-xs text-slate-500 italic p-2 bg-slate-800/50 rounded border border-dashed border-slate-600">
                      Additional filter types (Position, Color, Size) coming soon
                    </div>
                  </div>
                )}
              </div>

              {/* Properties Section - Modern Styling */}
              <div className="space-y-3 border border-slate-600 rounded-lg p-3 bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={currentSettings.propertiesEnabled}
                      onCheckedChange={(checked) => handleSettingsUpdate({ propertiesEnabled: checked as boolean })}
                      className="border-slate-500 data-[state=checked]:bg-purple-600"
                      data-testid="checkbox-properties-enabled"
                    />
                    <Label className="text-sm font-medium text-slate-200">Properties</Label>
                  </div>
                  <span className="text-xs text-slate-400">
                    {currentSettings.propertiesEnabled 
                      ? `${currentSettings.shapePropertiesEnabled ? 'Shape' : ''}${currentSettings.shapePropertiesEnabled && (currentSettings.fillEnabled || currentSettings.strokeEnabled) ? ', ' : ''}${currentSettings.fillEnabled ? 'Fill' : ''}${currentSettings.fillEnabled && currentSettings.strokeEnabled ? ', ' : ''}${currentSettings.strokeEnabled ? 'Stroke' : ''}` || 'None active'
                      : 'Disabled'}
                  </span>
                </div>
                
                {currentSettings.propertiesEnabled && (
                  <div className="space-y-4 mt-3">


                    {/* Shape Properties Section */}
                    <div className="space-y-3 border border-slate-600 rounded-lg p-3 bg-slate-800/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={currentSettings.shapePropertiesEnabled}
                            onCheckedChange={(checked) => handleSettingsUpdate({ shapePropertiesEnabled: checked as boolean })}
                            className="border-slate-500 data-[state=checked]:bg-blue-600"
                            data-testid="checkbox-shape-properties-enabled"
                          />
                          <Label className="text-sm font-medium text-slate-200">Shape Properties</Label>
                        </div>
                        <span className="text-xs text-slate-400">
                          {currentSettings.shapePropertiesDimensionsEnabled && currentSettings.shapePropertiesPositionEnabled 
                            ? 'Dimensions & Position' 
                            : currentSettings.shapePropertiesDimensionsEnabled 
                              ? 'Dimensions only'
                              : currentSettings.shapePropertiesPositionEnabled
                                ? 'Position only'
                                : 'All disabled'}
                        </span>
                      </div>
                      
                      {currentSettings.shapePropertiesEnabled && (
                        <div className="space-y-4 mt-3">
                          {/* Dimensions Sub-section */}
                          <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                checked={currentSettings.shapePropertiesDimensionsEnabled}
                                onCheckedChange={(checked) => handleSettingsUpdate({ shapePropertiesDimensionsEnabled: checked as boolean })}
                                className="border-slate-500 data-[state=checked]:bg-green-600"
                                data-testid="checkbox-shape-dimensions-enabled"
                              />
                              <Label className="text-xs font-medium text-slate-300">Dimensions</Label>
                            </div>
                            
                            {currentSettings.shapePropertiesDimensionsEnabled && (
                              <div className="space-y-3 mt-2">
                            
                            {/* Width Controls */}
                            <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium text-slate-300">Width</Label>
                                <Select value={currentSettings.widthMode} onValueChange={(value) => handleSettingsUpdate({ widthMode: value as any })}>
                                  <SelectTrigger className="h-7 w-28 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                    <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                    <SelectItem value="value" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
                                    <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {currentSettings.widthMode === 'range' && (
                                <div className="space-y-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Min / Max (px)</Label>
                                    <div className="flex items-center gap-2">
                                      <NumericInput
                                        value={currentSettings.widthRange?.[0] || 50}
                                        onChange={(value) => handleSettingsUpdate({ widthRange: [value, currentSettings.widthRange?.[1] || 200] as [number, number] })}
                                        min={10}
                                        max={500}
                                        step={5}
                                        className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                        data-testid="input-width-min"
                                      />
                                      <Slider
                                        value={currentSettings.widthRange || [50, 200]}
                                        onValueChange={(value) => handleSettingsUpdate({ widthRange: value as [number, number] })}
                                        min={10}
                                        max={500}
                                        step={5}
                                        className="flex-1 [&_[role=slider]]:bg-blue-600"
                                      />
                                      <NumericInput
                                        value={currentSettings.widthRange?.[1] || 200}
                                        onChange={(value) => handleSettingsUpdate({ widthRange: [currentSettings.widthRange?.[0] || 50, value] as [number, number] })}
                                        min={10}
                                        max={500}
                                        step={5}
                                        className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                        data-testid="input-width-max"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Randomization (%)</Label>
                                    <BufferedSliderWithNumericInput
                                      value={currentSettings.widthRandomizationScale}
                                      onValueCommit={(value) => handleSettingsUpdate({ widthRandomizationScale: value })}
                                      min={0}
                                      max={100}
                                      step={5}
                                      layout="inline"
                                      inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                      sliderClassName="flex-1 [&_[role=slider]]:bg-purple-600"
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {currentSettings.widthMode === 'value' && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Fixed Value (px)</Label>
                                  <BufferedSliderWithNumericInput
                                    value={currentSettings.widthValue}
                                    onValueCommit={(value) => handleSettingsUpdate({ widthValue: value })}
                                    min={10}
                                    max={500}
                                    step={5}
                                    layout="inline"
                                    inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                    sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                  />
                                </div>
                              )}
                              
                              {currentSettings.widthMode === 'incremental' && (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Start (px)</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.widthStartValue}
                                        onValueCommit={(value) => handleSettingsUpdate({ widthStartValue: value })}
                                        min={10}
                                        max={200}
                                        step={5}
                                        layout="inline"
                                        inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Increment (px)</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.widthIncrement}
                                        onValueCommit={(value) => handleSettingsUpdate({ widthIncrement: value })}
                                        min={1}
                                        max={50}
                                        step={1}
                                        layout="inline"
                                        inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={currentSettings.sizeIncrementalResetPerBatch}
                                      onCheckedChange={(checked) => handleSettingsUpdate({ sizeIncrementalResetPerBatch: checked as boolean })}
                                      className="border-slate-500 data-[state=checked]:bg-blue-600"
                                    />
                                    <Label className="text-xs text-slate-400">Reset per batch</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={currentSettings.widthModulationEnabled ?? false}
                                      onCheckedChange={(checked) => handleSettingsUpdate({ widthModulationEnabled: checked as boolean })}
                                      className="border-slate-500 data-[state=checked]:bg-blue-600"
                                      data-testid="checkbox-width-modulation"
                                    />
                                    <Label className="text-xs text-slate-400">Enable Modulation</Label>
                                  </div>
                                  {currentSettings.widthModulationEnabled && (
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Wrap at (px)</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.widthModulationValue ?? 500}
                                        onValueCommit={(value) => handleSettingsUpdate({ widthModulationValue: value })}
                                        min={10}
                                        max={1000}
                                        step={10}
                                        layout="inline"
                                        inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                      />
                                    </div>
                                  )}
                                  <IndexDriverSelect
                                    value={currentSettings.sizeIncrementalIndexDriver}
                                    onChange={(value) => handleSettingsUpdate({ sizeIncrementalIndexDriver: value })}
                                    testId="select-size-index-driver"
                                  />
                                </div>
                              )}
                            </div>
                            
                            {/* Height Controls */}
                            <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium text-slate-300">Height</Label>
                                <Select value={currentSettings.heightMode} onValueChange={(value) => handleSettingsUpdate({ heightMode: value as any })}>
                                  <SelectTrigger className="h-7 w-28 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                    <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                    <SelectItem value="value" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
                                    <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {currentSettings.heightMode === 'range' && (
                                <div className="space-y-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Min / Max (px)</Label>
                                    <div className="flex items-center gap-2">
                                      <NumericInput
                                        value={currentSettings.heightRange?.[0] || 50}
                                        onChange={(value) => handleSettingsUpdate({ heightRange: [value, currentSettings.heightRange?.[1] || 200] as [number, number] })}
                                        min={10}
                                        max={500}
                                        step={5}
                                        className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                        data-testid="input-height-min"
                                      />
                                      <Slider
                                        value={currentSettings.heightRange || [50, 200]}
                                        onValueChange={(value) => handleSettingsUpdate({ heightRange: value as [number, number] })}
                                        min={10}
                                        max={500}
                                        step={5}
                                        className="flex-1 [&_[role=slider]]:bg-blue-600"
                                      />
                                      <NumericInput
                                        value={currentSettings.heightRange?.[1] || 200}
                                        onChange={(value) => handleSettingsUpdate({ heightRange: [currentSettings.heightRange?.[0] || 50, value] as [number, number] })}
                                        min={10}
                                        max={500}
                                        step={5}
                                        className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                        data-testid="input-height-max"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Randomization (%)</Label>
                                    <BufferedSliderWithNumericInput
                                      value={currentSettings.heightRandomizationScale}
                                      onValueCommit={(value) => handleSettingsUpdate({ heightRandomizationScale: value })}
                                      min={0}
                                      max={100}
                                      step={5}
                                      layout="inline"
                                      inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                      sliderClassName="flex-1 [&_[role=slider]]:bg-purple-600"
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {currentSettings.heightMode === 'value' && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Fixed Value (px)</Label>
                                  <BufferedSliderWithNumericInput
                                    value={currentSettings.heightValue}
                                    onValueCommit={(value) => handleSettingsUpdate({ heightValue: value })}
                                    min={10}
                                    max={500}
                                    step={5}
                                    layout="inline"
                                    inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                    sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                  />
                                </div>
                              )}
                              
                              {currentSettings.heightMode === 'incremental' && (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Start (px)</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.heightStartValue}
                                        onValueCommit={(value) => handleSettingsUpdate({ heightStartValue: value })}
                                        min={10}
                                        max={200}
                                        step={5}
                                        layout="inline"
                                        inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Increment (px)</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.heightIncrement}
                                        onValueCommit={(value) => handleSettingsUpdate({ heightIncrement: value })}
                                        min={1}
                                        max={50}
                                        step={1}
                                        layout="inline"
                                        inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={currentSettings.sizeIncrementalResetPerBatch}
                                      onCheckedChange={(checked) => handleSettingsUpdate({ sizeIncrementalResetPerBatch: checked as boolean })}
                                      className="border-slate-500 data-[state=checked]:bg-blue-600"
                                    />
                                    <Label className="text-xs text-slate-400">Reset per batch</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={currentSettings.heightModulationEnabled ?? false}
                                      onCheckedChange={(checked) => handleSettingsUpdate({ heightModulationEnabled: checked as boolean })}
                                      className="border-slate-500 data-[state=checked]:bg-blue-600"
                                      data-testid="checkbox-height-modulation"
                                    />
                                    <Label className="text-xs text-slate-400">Enable Modulation</Label>
                                  </div>
                                  {currentSettings.heightModulationEnabled && (
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Wrap at (px)</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.heightModulationValue ?? 500}
                                        onValueCommit={(value) => handleSettingsUpdate({ heightModulationValue: value })}
                                        min={10}
                                        max={1000}
                                        step={10}
                                        layout="inline"
                                        inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                      />
                                    </div>
                                  )}
                                  <IndexDriverSelect
                                    value={currentSettings.sizeIncrementalIndexDriver}
                                    onChange={(value) => handleSettingsUpdate({ sizeIncrementalIndexDriver: value })}
                                    testId="select-height-index-driver"
                                  />
                                </div>
                              )}
                            </div>
                            
                            {/* Size Constraints */}
                            <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                              <Label className="text-xs font-medium text-slate-300">Size Constraints</Label>
                              <RadioGroup 
                                value={currentSettings.sizeConstraintMode} 
                                onValueChange={(value: 'none' | 'min' | 'max' | 'avg') => handleSettingsUpdate({ sizeConstraintMode: value })}
                                className="grid grid-cols-2 gap-2"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="none" id="size-none" className="border-slate-500 text-blue-600" />
                                  <Label htmlFor="size-none" className="text-xs text-slate-400 cursor-pointer">None</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="min" id="size-min" className="border-slate-500 text-blue-600" />
                                  <Label htmlFor="size-min" className="text-xs text-slate-400 cursor-pointer">Min</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="max" id="size-max" className="border-slate-500 text-blue-600" />
                                  <Label htmlFor="size-max" className="text-xs text-slate-400 cursor-pointer">Max</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="avg" id="size-avg" className="border-slate-500 text-blue-600" />
                                  <Label htmlFor="size-avg" className="text-xs text-slate-400 cursor-pointer">Average</Label>
                                </div>
                              </RadioGroup>
                            </div>
                              </div>
                            )}
                          </div>

                          {/* Position Sub-section */}
                          <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                checked={currentSettings.shapePropertiesPositionEnabled}
                                onCheckedChange={(checked) => handleSettingsUpdate({ shapePropertiesPositionEnabled: checked as boolean })}
                                className="border-slate-500 data-[state=checked]:bg-green-600"
                                data-testid="checkbox-shape-position-enabled"
                              />
                              <Label className="text-xs font-medium text-slate-300">Position</Label>
                            </div>
                            
                            {currentSettings.shapePropertiesPositionEnabled && (
                              <div className="space-y-3 mt-2">
                            
                            {/* X Position Controls */}
                            <div className="space-y-2 p-2 bg-slate-600/50 rounded">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium text-slate-300">X Position</Label>
                                <Select value={currentSettings.xPositionMode} onValueChange={(value) => handleSettingsUpdate({ xPositionMode: value as any })}>
                                  <SelectTrigger className="h-7 w-28 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                    <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                    <SelectItem value="value" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
                                    <SelectItem value="directional" className="text-slate-200 hover:bg-slate-700">Directional</SelectItem>
                                    <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {currentSettings.xPositionMode === 'range' && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Min / Max (px)</Label>
                                  <div className="flex items-center gap-2">
                                    <NumericInput
                                      value={currentSettings.xPositionRange?.[0] || -100}
                                      onChange={(value) => handleSettingsUpdate({ xPositionRange: [value, currentSettings.xPositionRange?.[1] || 100] as [number, number] })}
                                      min={-500}
                                      max={500}
                                      step={5}
                                      className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                      data-testid="input-x-pos-min"
                                    />
                                    <Slider
                                      value={currentSettings.xPositionRange || [-100, 100]}
                                      onValueChange={(value) => handleSettingsUpdate({ xPositionRange: value as [number, number] })}
                                      min={-500}
                                      max={500}
                                      step={5}
                                      className="flex-1 [&_[role=slider]]:bg-blue-600"
                                    />
                                    <NumericInput
                                      value={currentSettings.xPositionRange?.[1] || 100}
                                      onChange={(value) => handleSettingsUpdate({ xPositionRange: [currentSettings.xPositionRange?.[0] || -100, value] as [number, number] })}
                                      min={-500}
                                      max={500}
                                      step={5}
                                      className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                      data-testid="input-x-pos-max"
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {currentSettings.xPositionMode === 'value' && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Fixed Value (px)</Label>
                                  <BufferedSliderWithNumericInput
                                    value={currentSettings.xPositionValue}
                                    onValueCommit={(value) => handleSettingsUpdate({ xPositionValue: value })}
                                    min={-400}
                                    max={400}
                                    step={5}
                                    layout="inline"
                                    inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                    sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                  />
                                </div>
                              )}
                              
                              {currentSettings.xPositionMode === 'directional' && (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Mode</Label>
                                      <Select value={currentSettings.positionDirectionalMode} onValueChange={(value) => handleSettingsUpdate({ positionDirectionalMode: value as any })}>
                                        <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                          <SelectItem value="outward-center" className="text-slate-200 hover:bg-slate-700">From Center</SelectItem>
                                          <SelectItem value="outward-edge" className="text-slate-200 hover:bg-slate-700">From Edge</SelectItem>
                                          <SelectItem value="angle-based" className="text-slate-200 hover:bg-slate-700">Angle</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Distance (px)</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.positionDirectionalDistance}
                                        onValueCommit={(value) => handleSettingsUpdate({ positionDirectionalDistance: value })}
                                        min={10}
                                        max={200}
                                        step={5}
                                        layout="inline"
                                        inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                      />
                                    </div>
                                  </div>
                                  {currentSettings.positionDirectionalMode === 'angle-based' && (
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Angle (°)</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.positionDirectionalAngle}
                                        onValueCommit={(value) => handleSettingsUpdate({ positionDirectionalAngle: value })}
                                        min={0}
                                        max={360}
                                        step={1}
                                        layout="inline"
                                        inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                      />
                                    </div>
                                  )}
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={currentSettings.directionalEvenDistribution}
                                      onCheckedChange={(checked) => handleSettingsUpdate({ directionalEvenDistribution: checked as boolean })}
                                      className="border-slate-500 data-[state=checked]:bg-blue-600"
                                    />
                                    <Label className="text-xs text-slate-400">Even 360° Distribution</Label>
                                  </div>
                                  {!currentSettings.directionalEvenDistribution && (
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Cluster Angle (°)</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.directionalClusterAngle}
                                        onValueCommit={(value) => handleSettingsUpdate({ directionalClusterAngle: value })}
                                        min={10}
                                        max={180}
                                        step={5}
                                        layout="inline"
                                        inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {currentSettings.xPositionMode === 'incremental' && (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Start (px)</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.xPositionStartValue}
                                        onValueCommit={(value) => handleSettingsUpdate({ xPositionStartValue: value })}
                                        min={0}
                                        max={200}
                                        step={5}
                                        layout="inline"
                                        inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Increment (px)</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.xPositionIncrement}
                                        onValueCommit={(value) => handleSettingsUpdate({ xPositionIncrement: value })}
                                        min={1}
                                        max={100}
                                        step={1}
                                        layout="inline"
                                        inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={currentSettings.incrementalResetPerBatch}
                                      onCheckedChange={(checked) => handleSettingsUpdate({ incrementalResetPerBatch: checked as boolean })}
                                      className="border-slate-500 data-[state=checked]:bg-blue-600"
                                    />
                                    <Label className="text-xs text-slate-400">Reset per batch</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={currentSettings.xPositionModulationMode !== 'off'}
                                      onCheckedChange={(checked) => handleSettingsUpdate({ 
                                        xPositionModulationMode: checked ? 'grid-col' : 'off' 
                                      })}
                                      className="border-slate-500 data-[state=checked]:bg-blue-600"
                                      data-testid="checkbox-x-position-modulation"
                                    />
                                    <Label className="text-xs text-slate-400">Enable Modulation</Label>
                                  </div>
                                  {currentSettings.xPositionModulationMode !== 'off' && (
                                    <div className="space-y-2 ml-4">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-xs text-slate-400">Mode</Label>
                                        <Select value={currentSettings.xPositionModulationMode} onValueChange={(value) => handleSettingsUpdate({ xPositionModulationMode: value as any })}>
                                          <SelectTrigger className="h-7 w-28 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                            <SelectItem value="grid-col" className="text-slate-200 hover:bg-slate-700">Grid Col</SelectItem>
                                            <SelectItem value="pixel-value" className="text-slate-200 hover:bg-slate-700">Pixel Value</SelectItem>
                                            <SelectItem value="shape-count" className="text-slate-200 hover:bg-slate-700">Index Count</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      {(currentSettings.xPositionModulationMode === 'pixel-value' || currentSettings.xPositionModulationMode === 'shape-count') && (
                                        <div className="space-y-1">
                                          <Label className="text-xs text-slate-400">
                                            Wrap at {currentSettings.xPositionModulationMode === 'pixel-value' ? '(px)' : '(count)'}
                                          </Label>
                                          <BufferedSliderWithNumericInput
                                            value={currentSettings.xPositionModulationValue}
                                            onValueCommit={(value) => handleSettingsUpdate({ xPositionModulationValue: value })}
                                            min={currentSettings.xPositionModulationMode === 'pixel-value' ? 50 : 1}
                                            max={currentSettings.xPositionModulationMode === 'pixel-value' ? 1500 : 50}
                                            step={currentSettings.xPositionModulationMode === 'pixel-value' ? 50 : 1}
                                            layout="inline"
                                            inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                            sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <IndexDriverSelect
                                    value={currentSettings.positionIncrementalIndexDriver}
                                    onChange={(value) => handleSettingsUpdate({ positionIncrementalIndexDriver: value })}
                                    testId="select-position-index-driver"
                                  />
                                </div>
                              )}
                            </div>
                            
                            {/* Y Position Controls */}
                            <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium text-slate-300">Y Position</Label>
                                <Select value={currentSettings.yPositionMode} onValueChange={(value) => handleSettingsUpdate({ yPositionMode: value as any })}>
                                  <SelectTrigger className="h-7 w-28 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                    <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                    <SelectItem value="value" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
                                    <SelectItem value="directional" className="text-slate-200 hover:bg-slate-700">Directional</SelectItem>
                                    <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {currentSettings.yPositionMode === 'range' && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Min / Max (px)</Label>
                                  <div className="flex items-center gap-2">
                                    <NumericInput
                                      value={currentSettings.yPositionRange?.[0] || -100}
                                      onChange={(value) => handleSettingsUpdate({ yPositionRange: [value, currentSettings.yPositionRange?.[1] || 100] as [number, number] })}
                                      min={-500}
                                      max={500}
                                      step={5}
                                      className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                      data-testid="input-y-pos-min"
                                    />
                                    <Slider
                                      value={currentSettings.yPositionRange || [-100, 100]}
                                      onValueChange={(value) => handleSettingsUpdate({ yPositionRange: value as [number, number] })}
                                      min={-500}
                                      max={500}
                                      step={5}
                                      className="flex-1 [&_[role=slider]]:bg-blue-600"
                                    />
                                    <NumericInput
                                      value={currentSettings.yPositionRange?.[1] || 100}
                                      onChange={(value) => handleSettingsUpdate({ yPositionRange: [currentSettings.yPositionRange?.[0] || -100, value] as [number, number] })}
                                      min={-500}
                                      max={500}
                                      step={5}
                                      className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                      data-testid="input-y-pos-max"
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {currentSettings.yPositionMode === 'value' && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Fixed Value (px)</Label>
                                  <BufferedSliderWithNumericInput
                                    value={currentSettings.yPositionValue}
                                    onValueCommit={(value) => handleSettingsUpdate({ yPositionValue: value })}
                                    min={-400}
                                    max={400}
                                    step={5}
                                    layout="inline"
                                    inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                    sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                  />
                                </div>
                              )}
                              
                              {currentSettings.yPositionMode === 'directional' && (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Mode</Label>
                                      <Select value={currentSettings.positionDirectionalMode} onValueChange={(value) => handleSettingsUpdate({ positionDirectionalMode: value as any })}>
                                        <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                          <SelectItem value="outward-center" className="text-slate-200 hover:bg-slate-700">From Center</SelectItem>
                                          <SelectItem value="outward-edge" className="text-slate-200 hover:bg-slate-700">From Edge</SelectItem>
                                          <SelectItem value="angle-based" className="text-slate-200 hover:bg-slate-700">Angle</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Distance (px)</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.positionDirectionalDistance}
                                        onValueCommit={(value) => handleSettingsUpdate({ positionDirectionalDistance: value })}
                                        min={10}
                                        max={200}
                                        step={5}
                                        layout="inline"
                                        inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                      />
                                    </div>
                                  </div>
                                  {currentSettings.positionDirectionalMode === 'angle-based' && (
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Angle (°)</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.positionDirectionalAngle}
                                        onValueCommit={(value) => handleSettingsUpdate({ positionDirectionalAngle: value })}
                                        min={0}
                                        max={360}
                                        step={1}
                                        layout="inline"
                                        inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                      />
                                    </div>
                                  )}
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={currentSettings.directionalEvenDistribution}
                                      onCheckedChange={(checked) => handleSettingsUpdate({ directionalEvenDistribution: checked as boolean })}
                                      className="border-slate-500 data-[state=checked]:bg-blue-600"
                                    />
                                    <Label className="text-xs text-slate-400">Even 360° Distribution</Label>
                                  </div>
                                  {!currentSettings.directionalEvenDistribution && (
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Cluster Angle (°)</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.directionalClusterAngle}
                                        onValueCommit={(value) => handleSettingsUpdate({ directionalClusterAngle: value })}
                                        min={10}
                                        max={180}
                                        step={5}
                                        layout="inline"
                                        inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {currentSettings.yPositionMode === 'incremental' && (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Start (px)</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.yPositionStartValue}
                                        onValueCommit={(value) => handleSettingsUpdate({ yPositionStartValue: value })}
                                        min={0}
                                        max={200}
                                        step={5}
                                        layout="inline"
                                        inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Increment (px)</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.yPositionIncrement}
                                        onValueCommit={(value) => handleSettingsUpdate({ yPositionIncrement: value })}
                                        min={1}
                                        max={100}
                                        step={1}
                                        layout="inline"
                                        inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={currentSettings.incrementalResetPerBatch}
                                      onCheckedChange={(checked) => handleSettingsUpdate({ incrementalResetPerBatch: checked as boolean })}
                                      className="border-slate-500 data-[state=checked]:bg-blue-600"
                                    />
                                    <Label className="text-xs text-slate-400">Reset per batch</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={currentSettings.yPositionModulationMode !== 'off'}
                                      onCheckedChange={(checked) => handleSettingsUpdate({ 
                                        yPositionModulationMode: checked ? 'grid-row' : 'off' 
                                      })}
                                      className="border-slate-500 data-[state=checked]:bg-blue-600"
                                      data-testid="checkbox-y-position-modulation"
                                    />
                                    <Label className="text-xs text-slate-400">Enable Modulation</Label>
                                  </div>
                                  {currentSettings.yPositionModulationMode !== 'off' && (
                                    <div className="space-y-2 ml-4">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-xs text-slate-400">Mode</Label>
                                        <Select value={currentSettings.yPositionModulationMode} onValueChange={(value) => handleSettingsUpdate({ yPositionModulationMode: value as any })}>
                                          <SelectTrigger className="h-7 w-28 text-xs bg-slate-800 border-slate-600 text-slate-200">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                            <SelectItem value="grid-row" className="text-slate-200 hover:bg-slate-700">Grid Row</SelectItem>
                                            <SelectItem value="pixel-value" className="text-slate-200 hover:bg-slate-700">Pixel Value</SelectItem>
                                            <SelectItem value="shape-count" className="text-slate-200 hover:bg-slate-700">Index Count</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      {(currentSettings.yPositionModulationMode === 'pixel-value' || currentSettings.yPositionModulationMode === 'shape-count') && (
                                        <div className="space-y-1">
                                          <Label className="text-xs text-slate-400">
                                            Wrap at {currentSettings.yPositionModulationMode === 'pixel-value' ? '(px)' : '(count)'}
                                          </Label>
                                          <BufferedSliderWithNumericInput
                                            value={currentSettings.yPositionModulationValue}
                                            onValueCommit={(value) => handleSettingsUpdate({ yPositionModulationValue: value })}
                                            min={currentSettings.yPositionModulationMode === 'pixel-value' ? 50 : 1}
                                            max={currentSettings.yPositionModulationMode === 'pixel-value' ? 1500 : 50}
                                            step={currentSettings.yPositionModulationMode === 'pixel-value' ? 50 : 1}
                                            layout="inline"
                                            inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                            sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <IndexDriverSelect
                                    value={currentSettings.positionIncrementalIndexDriver}
                                    onChange={(value) => handleSettingsUpdate({ positionIncrementalIndexDriver: value })}
                                    testId="select-y-position-index-driver"
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

                    {/* Fill Properties */}
                    <div className="space-y-3 border border-slate-600 rounded-lg p-3 bg-slate-800/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            checked={currentSettings.fillEnabled}
                            onCheckedChange={(checked) => handleSettingsUpdate({ fillEnabled: checked as boolean })}
                            className="border-slate-500 data-[state=checked]:bg-cyan-600"
                            data-testid="checkbox-fill-enabled"
                          />
                          <Label className="text-sm font-medium text-slate-200">Fill Properties</Label>
                        </div>
                        <span className="text-xs text-slate-400">
                          {currentSettings.fillEnabled ? `${currentSettings.fillStyleProbability}% solid / ${100 - currentSettings.fillStyleProbability}% gradient` : 'Disabled'}
                        </span>
                      </div>
                      
                      {currentSettings.fillEnabled && (
                        <div className="space-y-4 mt-3">
                          {/* Fill Type Probability - Controls solid vs gradient */}
                          <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Fill Type Probability</Label>
                            <BufferedSliderWithNumericInput
                              value={currentSettings.fillStyleProbability}
                              onValueCommit={(value) => handleSettingsUpdate({ fillStyleProbability: Math.max(0, Math.min(100, value)) })}
                              min={0}
                              max={100}
                              step={5}
                              layout="inline"
                              inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                              sliderClassName="flex-1 [&_[role=slider]]:bg-cyan-600"
                            />
                            <p className="text-xs text-slate-500">{currentSettings.fillStyleProbability}% solid, {100 - currentSettings.fillStyleProbability}% gradient</p>
                          </div>
                          
                          {/* Solid Fill Subsection */}
                          <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  checked={currentSettings.fillSolidEnabled}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ fillSolidEnabled: checked as boolean })}
                                  className="border-slate-500 data-[state=checked]:bg-cyan-600"
                                  data-testid="checkbox-solid-fill-enabled"
                                />
                                <Label className="text-sm font-medium text-slate-200">Solid Fill</Label>
                              </div>
                              <span className="text-xs text-slate-400">
                                {currentSettings.fillSolidEnabled ? currentSettings.fillColorMode : 'Disabled'}
                              </span>
                            </div>
      
                            {currentSettings.fillSolidEnabled && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs text-slate-400">Color Mode</Label>
                                  <Select 
                                    value={currentSettings.fillColorMode} 
                                    onValueChange={(value) => handleSettingsUpdate({ fillColorMode: value as 'range' | 'palette' | 'define' })}
                                  >
                                    <SelectTrigger className="h-7 w-24 text-xs bg-slate-800 border-slate-600 text-slate-200" data-testid="select-fill-color-mode">
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
                                  <Label className="text-xs text-slate-400">Color Range</Label>
                                  <div className="flex items-center gap-3">
                                    <Input
                                      type="color"
                                      value={currentSettings.fillColorRange?.[0] || '#3b82f6'}
                                      onChange={(e) => handleSettingsUpdate({
                                        fillColorRange: [e.target.value, currentSettings.fillColorRange?.[1] || '#8b5cf6']
                                      })}
                                      className="w-12 h-8 p-1 bg-slate-800 border-slate-600 rounded cursor-pointer"
                                      data-testid="input-fill-color-start"
                                    />
                                    <div className="flex-1 h-6 rounded" style={{
                                      background: `linear-gradient(to right, ${currentSettings.fillColorRange?.[0] || '#3b82f6'}, ${currentSettings.fillColorRange?.[1] || '#8b5cf6'})`
                                    }} />
                                    <Input
                                      type="color"
                                      value={currentSettings.fillColorRange?.[1] || '#8b5cf6'}
                                      onChange={(e) => handleSettingsUpdate({
                                        fillColorRange: [currentSettings.fillColorRange?.[0] || '#3b82f6', e.target.value]
                                      })}
                                      className="w-12 h-8 p-1 bg-slate-800 border-slate-600 rounded cursor-pointer"
                                      data-testid="input-fill-color-end"
                                    />
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Checkbox 
                                    checked={currentSettings.fillColorRangeFlip || false}
                                    onCheckedChange={(checked) => handleSettingsUpdate({ fillColorRangeFlip: checked as boolean })}
                                    className="border-slate-500 data-[state=checked]:bg-cyan-600"
                                    data-testid="checkbox-fill-color-flip"
                                  />
                                  <Label className="text-xs text-slate-300">Flip Color Range</Label>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-400">Saturation Range (%)</Label>
                                  <div className="flex items-center gap-2">
                                    <NumericInput
                                      value={currentSettings.fillColorSaturationRange?.[0] ?? 50}
                                      onChange={(value) => handleSettingsUpdate({ 
                                        fillColorSaturationRange: [value, currentSettings.fillColorSaturationRange?.[1] ?? 100] 
                                      })}
                                      min={0}
                                      max={100}
                                      step={5}
                                      className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      data-testid="input-fill-saturation-min"
                                    />
                                    <Slider
                                      value={currentSettings.fillColorSaturationRange || [50, 100]}
                                      onValueChange={(value) => handleSettingsUpdate({ fillColorSaturationRange: value as [number, number] })}
                                      min={0}
                                      max={100}
                                      step={5}
                                      className="flex-1 [&_[role=slider]]:bg-green-500"
                                    />
                                    <NumericInput
                                      value={currentSettings.fillColorSaturationRange?.[1] ?? 100}
                                      onChange={(value) => handleSettingsUpdate({ 
                                        fillColorSaturationRange: [currentSettings.fillColorSaturationRange?.[0] ?? 50, value] 
                                      })}
                                      min={0}
                                      max={100}
                                      step={5}
                                      className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      data-testid="input-fill-saturation-max"
                                    />
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-400">Lightness Range (%)</Label>
                                  <div className="flex items-center gap-2">
                                    <NumericInput
                                      value={currentSettings.fillColorLightnessRange?.[0] ?? 30}
                                      onChange={(value) => handleSettingsUpdate({ 
                                        fillColorLightnessRange: [value, currentSettings.fillColorLightnessRange?.[1] ?? 70] 
                                      })}
                                      min={0}
                                      max={100}
                                      step={5}
                                      className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      data-testid="input-fill-lightness-min"
                                    />
                                    <Slider
                                      value={currentSettings.fillColorLightnessRange || [30, 70]}
                                      onValueChange={(value) => handleSettingsUpdate({ fillColorLightnessRange: value as [number, number] })}
                                      min={0}
                                      max={100}
                                      step={5}
                                      className="flex-1 [&_[role=slider]]:bg-blue-500"
                                    />
                                    <NumericInput
                                      value={currentSettings.fillColorLightnessRange?.[1] ?? 70}
                                      onChange={(value) => handleSettingsUpdate({ 
                                        fillColorLightnessRange: [currentSettings.fillColorLightnessRange?.[0] ?? 30, value] 
                                      })}
                                      min={0}
                                      max={100}
                                      step={5}
                                      className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      data-testid="input-fill-lightness-max"
                                    />
                                  </div>
                                </div>
                                  </div>
                                )}
      
                                {currentSettings.fillColorMode === 'palette' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Color Palette</Label>
                                <div className="flex flex-wrap gap-2 p-2 bg-slate-800/50 rounded">
                                  {currentSettings.fillColorPalette?.map((color, index) => (
                                    <div key={index} className="relative group">
                                      <Input
                                        type="color"
                                        value={color}
                                        onChange={(e) => {
                                          const newPalette = [...(currentSettings.fillColorPalette || [])];
                                          newPalette[index] = e.target.value;
                                          handleSettingsUpdate({ fillColorPalette: newPalette });
                                        }}
                                        className="w-10 h-10 p-1 bg-slate-800 border-slate-600 rounded cursor-pointer"
                                        data-testid={`input-new-fill-palette-${index}`}
                                      />
                                      <button
                                        onClick={() => {
                                          const newPalette = (currentSettings.fillColorPalette || []).filter((_, i) => i !== index);
                                          handleSettingsUpdate({ fillColorPalette: newPalette });
                                        }}
                                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                        data-testid={`btn-remove-fill-palette-${index}`}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => {
                                      const newPalette = [...(currentSettings.fillColorPalette || []), '#ffffff'];
                                      handleSettingsUpdate({ fillColorPalette: newPalette });
                                    }}
                                    className="w-10 h-10 bg-slate-700 border border-dashed border-slate-500 rounded text-slate-400 text-lg hover:bg-slate-600 hover:border-slate-400 transition-colors flex items-center justify-center"
                                    data-testid="btn-add-fill-palette"
                                  >
                                    +
                                  </button>
                                </div>
                                <p className="text-xs text-slate-500">Shapes cycle through palette colors</p>
                              </div>
                            )}
      
                            {currentSettings.fillColorMode === 'define' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Defined Color</Label>
                                <div className="flex items-center gap-3">
                                  <Input
                                    type="color"
                                    value={currentSettings.fillColorDefine || '#3b82f6'}
                                    onChange={(e) => handleSettingsUpdate({ fillColorDefine: e.target.value })}
                                    className="w-12 h-10 p-1 bg-slate-800 border-slate-600 rounded cursor-pointer"
                                    data-testid="input-fill-color-define"
                                  />
                                  <div 
                                    className="flex-1 h-8 rounded border border-slate-600"
                                    style={{ backgroundColor: currentSettings.fillColorDefine || '#3b82f6' }}
                                  />
                                  <Input
                                    type="text"
                                    value={currentSettings.fillColorDefine || '#3b82f6'}
                                    onChange={(e) => handleSettingsUpdate({ fillColorDefine: e.target.value })}
                                    className="w-24 h-8 bg-slate-800 border-slate-600 text-slate-200 text-xs"
                                    data-testid="input-fill-color-hex"
                                  />
                                </div>
                                <p className="text-xs text-slate-500">All shapes use this exact color</p>
                              </div>
                            )}
                              </div>
                            )}
                          </div>
                          
                          {/* Gradient Fill Subsection */}
                          <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  checked={currentSettings.fillGradientEnabled}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ fillGradientEnabled: checked as boolean })}
                                  className="border-slate-500 data-[state=checked]:bg-cyan-600"
                                  data-testid="checkbox-gradient-fill-enabled"
                                />
                                <Label className="text-sm font-medium text-slate-200">Gradient Fill</Label>
                              </div>
                              <span className="text-xs text-slate-400">
                                {currentSettings.fillGradientEnabled ? 
                                  `L:${currentSettings.fillGradientLinearProbability}% R:${currentSettings.fillGradientRadialProbability}% C:${currentSettings.fillGradientConicProbability}%` : 
                                  'Disabled'}
                              </span>
                            </div>
      
                            {currentSettings.fillGradientEnabled && (
                              <div className="space-y-3">
                                {/* Gradient Type Probabilities */}
                                <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs font-medium text-slate-300">Type Probabilities</Label>
                                    <span className="text-xs text-slate-400">
                                      Total: {currentSettings.fillGradientLinearProbability + currentSettings.fillGradientRadialProbability + currentSettings.fillGradientConicProbability}%
                                    </span>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs text-slate-400 w-12">Linear</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.fillGradientLinearProbability}
                                        onValueCommit={(value) => handleSettingsUpdate({ fillGradientLinearProbability: Math.max(0, Math.min(100, value)) })}
                                        min={0}
                                        max={100}
                                        step={5}
                                        layout="inline"
                                        inputClassName="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs text-slate-400 w-12">Radial</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.fillGradientRadialProbability}
                                        onValueCommit={(value) => handleSettingsUpdate({ fillGradientRadialProbability: Math.max(0, Math.min(100, value)) })}
                                        min={0}
                                        max={100}
                                        step={5}
                                        layout="inline"
                                        inputClassName="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-purple-500"
                                      />
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs text-slate-400 w-12">Conic</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.fillGradientConicProbability}
                                        onValueCommit={(value) => handleSettingsUpdate({ fillGradientConicProbability: Math.max(0, Math.min(100, value)) })}
                                        min={0}
                                        max={100}
                                        step={5}
                                        layout="inline"
                                        inputClassName="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-orange-500"
                                      />
                                    </div>
                                  </div>
                                </div>
      
                                {/* Color Stops */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-slate-400">Color Stops</Label>
                                    <Select 
                                      value={currentSettings.fillGradientStopsMode ?? 'range'} 
                                      onValueChange={(value) => handleSettingsUpdate({ fillGradientStopsMode: value as 'fixed' | 'range' })}
                                    >
                                      <SelectTrigger className="h-7 w-20 text-xs bg-slate-800 border-slate-600 text-slate-200" data-testid="select-gradient-stops-mode">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                        <SelectItem value="fixed" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
                                        <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {(currentSettings.fillGradientStopsMode ?? 'range') === 'fixed' ? (
                                    <div className="flex items-center gap-2">
                                      <NumericInput
                                        value={currentSettings.fillGradientStopsCount ?? 3}
                                        onChange={(value) => handleSettingsUpdate({ fillGradientStopsCount: value })}
                                        min={2}
                                        max={10}
                                        step={1}
                                        className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                        data-testid="input-gradient-stops-count"
                                      />
                                      <Slider
                                        value={[currentSettings.fillGradientStopsCount ?? 3]}
                                        onValueChange={(value) => handleSettingsUpdate({ fillGradientStopsCount: value[0] })}
                                        min={2}
                                        max={10}
                                        step={1}
                                        className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <NumericInput
                                        value={currentSettings.fillGradientStopsRange?.[0] ?? 2}
                                        onChange={(value) => handleSettingsUpdate({ 
                                          fillGradientStopsRange: [value, currentSettings.fillGradientStopsRange?.[1] ?? 5] 
                                        })}
                                        min={2}
                                        max={10}
                                        step={1}
                                        className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                        data-testid="input-gradient-stops-min"
                                      />
                                      <Slider
                                        value={currentSettings.fillGradientStopsRange || [2, 5]}
                                        onValueChange={(value) => handleSettingsUpdate({ fillGradientStopsRange: value as [number, number] })}
                                        min={2}
                                        max={10}
                                        step={1}
                                        className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                      />
                                      <NumericInput
                                        value={currentSettings.fillGradientStopsRange?.[1] ?? 5}
                                        onChange={(value) => handleSettingsUpdate({ 
                                          fillGradientStopsRange: [currentSettings.fillGradientStopsRange?.[0] ?? 2, value] 
                                        })}
                                        min={2}
                                        max={10}
                                        step={1}
                                        className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                        data-testid="input-gradient-stops-max"
                                      />
                                    </div>
                                  )}
                                  
                                  {/* Stop Distribution Options */}
                                  <div className="flex items-center gap-4 pt-2">
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs text-slate-400">Distribution:</Label>
                                      <Select 
                                        value={currentSettings.fillGradientStopDistribution ?? 'even'} 
                                        onValueChange={(value) => handleSettingsUpdate({ fillGradientStopDistribution: value as 'even' | 'random' })}
                                      >
                                        <SelectTrigger className="h-7 w-24 text-xs bg-slate-800 border-slate-600 text-slate-200" data-testid="select-gradient-stop-distribution">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                          <SelectItem value="even" className="text-slate-200 hover:bg-slate-700">Even</SelectItem>
                                          <SelectItem value="random" className="text-slate-200 hover:bg-slate-700">Random</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox 
                                        checked={currentSettings.fillGradientStopsReverse ?? false}
                                        onCheckedChange={(checked) => handleSettingsUpdate({ fillGradientStopsReverse: checked as boolean })}
                                        className="border-slate-500 data-[state=checked]:bg-cyan-600"
                                        data-testid="checkbox-gradient-stops-reverse"
                                      />
                                      <Label className="text-xs text-slate-300">Reverse</Label>
                                    </div>
                                  </div>
                                </div>
      
                                {/* Gradient Color Controls */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs font-medium text-slate-300">Gradient Colors</Label>
                                    <Select 
                                      value={currentSettings.fillGradientColorMode} 
                                      onValueChange={(value) => handleSettingsUpdate({ fillGradientColorMode: value as 'range' | 'palette' | 'define' })}
                                    >
                                      <SelectTrigger className="h-7 w-24 text-xs bg-slate-800 border-slate-600 text-slate-200" data-testid="select-gradient-color-mode">
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
                                    <div className="space-y-2 p-2 bg-slate-800/30 rounded">
                                      <div className="flex items-center gap-3">
                                        <Input
                                          type="color"
                                          value={currentSettings.fillGradientColorRange?.[0] || '#3b82f6'}
                                          onChange={(e) => handleSettingsUpdate({
                                            fillGradientColorRange: [e.target.value, currentSettings.fillGradientColorRange?.[1] || '#8b5cf6']
                                          })}
                                          className="w-10 h-8 p-1 bg-slate-800 border-slate-600 rounded cursor-pointer"
                                          data-testid="input-gradient-color-start"
                                        />
                                        <div className="flex-1 h-6 rounded" style={{
                                          background: `linear-gradient(to right, ${currentSettings.fillGradientColorRange?.[0] || '#3b82f6'}, ${currentSettings.fillGradientColorRange?.[1] || '#8b5cf6'})`
                                        }} />
                                        <Input
                                          type="color"
                                          value={currentSettings.fillGradientColorRange?.[1] || '#8b5cf6'}
                                          onChange={(e) => handleSettingsUpdate({
                                            fillGradientColorRange: [currentSettings.fillGradientColorRange?.[0] || '#3b82f6', e.target.value]
                                          })}
                                          className="w-10 h-8 p-1 bg-slate-800 border-slate-600 rounded cursor-pointer"
                                          data-testid="input-gradient-color-end"
                                        />
                                      </div>
                                      
                                      <div className="flex items-center space-x-2">
                                        <Checkbox 
                                          checked={currentSettings.fillGradientColorRangeFlip || false}
                                          onCheckedChange={(checked) => handleSettingsUpdate({ fillGradientColorRangeFlip: checked as boolean })}
                                          className="border-slate-500 data-[state=checked]:bg-cyan-600"
                                          data-testid="checkbox-gradient-color-flip"
                                        />
                                        <Label className="text-xs text-slate-300">Flip Color Range</Label>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <Label className="text-xs text-slate-400">Saturation Range (%)</Label>
                                        <div className="flex items-center gap-2">
                                          <NumericInput
                                            value={currentSettings.fillGradientColorSaturationRange?.[0] ?? 40}
                                            onChange={(value) => handleSettingsUpdate({ 
                                              fillGradientColorSaturationRange: [value, currentSettings.fillGradientColorSaturationRange?.[1] ?? 90] 
                                            })}
                                            min={0}
                                            max={100}
                                            step={5}
                                            className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                            data-testid="input-gradient-saturation-min"
                                          />
                                          <Slider
                                            value={currentSettings.fillGradientColorSaturationRange || [40, 90]}
                                            onValueChange={(value) => handleSettingsUpdate({ fillGradientColorSaturationRange: value as [number, number] })}
                                            min={0}
                                            max={100}
                                            step={5}
                                            className="flex-1 [&_[role=slider]]:bg-green-500"
                                          />
                                          <NumericInput
                                            value={currentSettings.fillGradientColorSaturationRange?.[1] ?? 90}
                                            onChange={(value) => handleSettingsUpdate({ 
                                              fillGradientColorSaturationRange: [currentSettings.fillGradientColorSaturationRange?.[0] ?? 40, value] 
                                            })}
                                            min={0}
                                            max={100}
                                            step={5}
                                            className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                            data-testid="input-gradient-saturation-max"
                                          />
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <Label className="text-xs text-slate-400">Lightness Range (%)</Label>
                                        <div className="flex items-center gap-2">
                                          <NumericInput
                                            value={currentSettings.fillGradientColorLightnessRange?.[0] ?? 20}
                                            onChange={(value) => handleSettingsUpdate({ 
                                              fillGradientColorLightnessRange: [value, currentSettings.fillGradientColorLightnessRange?.[1] ?? 80] 
                                            })}
                                            min={0}
                                            max={100}
                                            step={5}
                                            className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                            data-testid="input-gradient-lightness-min"
                                          />
                                          <Slider
                                            value={currentSettings.fillGradientColorLightnessRange || [20, 80]}
                                            onValueChange={(value) => handleSettingsUpdate({ fillGradientColorLightnessRange: value as [number, number] })}
                                            min={0}
                                            max={100}
                                            step={5}
                                            className="flex-1 [&_[role=slider]]:bg-blue-500"
                                          />
                                          <NumericInput
                                            value={currentSettings.fillGradientColorLightnessRange?.[1] ?? 80}
                                            onChange={(value) => handleSettingsUpdate({ 
                                              fillGradientColorLightnessRange: [currentSettings.fillGradientColorLightnessRange?.[0] ?? 20, value] 
                                            })}
                                            min={0}
                                            max={100}
                                            step={5}
                                            className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                            data-testid="input-gradient-lightness-max"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}
      
                                  {currentSettings.fillGradientColorMode === 'palette' && (
                                    <div className="flex flex-wrap gap-2 p-2 bg-slate-800/30 rounded">
                                      {currentSettings.fillGradientColorPalette?.map((color, index) => (
                                        <div key={index} className="relative group">
                                          <Input
                                            type="color"
                                            value={color}
                                            onChange={(e) => {
                                              const newPalette = [...(currentSettings.fillGradientColorPalette || [])];
                                              newPalette[index] = e.target.value;
                                              handleSettingsUpdate({ fillGradientColorPalette: newPalette });
                                            }}
                                            className="w-8 h-8 p-1 bg-slate-800 border-slate-600 rounded cursor-pointer"
                                            data-testid={`input-new-gradient-palette-${index}`}
                                          />
                                          <button
                                            onClick={() => {
                                              const newPalette = (currentSettings.fillGradientColorPalette || []).filter((_, i) => i !== index);
                                              handleSettingsUpdate({ fillGradientColorPalette: newPalette });
                                            }}
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                            data-testid={`btn-delete-gradient-palette-${index}`}
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ))}
                                      <button
                                        onClick={() => {
                                          const newPalette = [...(currentSettings.fillGradientColorPalette || []), '#ffffff'];
                                          handleSettingsUpdate({ fillGradientColorPalette: newPalette });
                                        }}
                                        className="w-8 h-8 bg-slate-700 border border-dashed border-slate-500 rounded text-slate-400 hover:bg-slate-600 flex items-center justify-center"
                                        data-testid="btn-add-gradient-palette"
                                      >
                                        +
                                      </button>
                                    </div>
                                  )}
      
                                  {currentSettings.fillGradientColorMode === 'define' && (
                                    <div className="space-y-2 p-2 bg-slate-800/30 rounded">
                                      <Label className="text-xs text-slate-400">Gradient Color Stops</Label>
                                      <div className="flex flex-wrap gap-2">
                                        {(currentSettings.fillGradientColorDefine || ['#3b82f6', '#8b5cf6']).map((color, index) => (
                                          <div key={index} className="relative group">
                                            <Input
                                              type="color"
                                              value={color}
                                              onChange={(e) => {
                                                const newColors = [...(currentSettings.fillGradientColorDefine || ['#3b82f6', '#8b5cf6'])];
                                                newColors[index] = e.target.value;
                                                handleSettingsUpdate({ fillGradientColorDefine: newColors });
                                              }}
                                              className="w-10 h-10 p-1 bg-slate-800 border-slate-600 rounded cursor-pointer"
                                              data-testid={`input-new-gradient-define-${index}`}
                                            />
                                            <button
                                              onClick={() => {
                                                const newColors = (currentSettings.fillGradientColorDefine || ['#3b82f6', '#8b5cf6']).filter((_, i) => i !== index);
                                                if (newColors.length >= 2) {
                                                  handleSettingsUpdate({ fillGradientColorDefine: newColors });
                                                }
                                              }}
                                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                              data-testid={`btn-delete-gradient-define-${index}`}
                                            >
                                              ×
                                            </button>
                                          </div>
                                        ))}
                                        <button
                                          onClick={() => {
                                            const newColors = [...(currentSettings.fillGradientColorDefine || ['#3b82f6', '#8b5cf6']), '#ffffff'];
                                            handleSettingsUpdate({ fillGradientColorDefine: newColors });
                                          }}
                                          className="w-10 h-10 bg-slate-700 border border-dashed border-slate-500 rounded text-slate-400 text-lg hover:bg-slate-600 flex items-center justify-center"
                                          data-testid="btn-add-gradient-define"
                                        >
                                          +
                                        </button>
                                      </div>
                                      <p className="text-xs text-slate-500">Exact colors for gradient stops (min 2)</p>
                                    </div>
                                  )}
                                </div>
      
                                {/* Gradient Type & Direction Controls */}
                                <div className="space-y-3 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={currentSettings.fillGradientTypeDirectionEnabled ?? false}
                                      onCheckedChange={(checked) => handleSettingsUpdate({ fillGradientTypeDirectionEnabled: checked as boolean })}
                                      className="border-slate-500 data-[state=checked]:bg-cyan-600"
                                      data-testid="checkbox-gradient-type-direction-enabled"
                                    />
                                    <Label className="text-sm font-medium text-slate-200">Type & Direction Controls</Label>
                                  </div>
                                  <p className="text-xs text-slate-500 ml-6">
                                    When enabled, overrides type probabilities with shape-matching or custom controls
                                  </p>
                                  
                                  {currentSettings.fillGradientTypeDirectionEnabled && (
                                    <div className="space-y-3 mt-2">
                                      {/* Match gradient to shape */}
                                      <div className="flex items-center gap-2 p-2 bg-slate-900/40 rounded">
                                        <Checkbox
                                          checked={currentSettings.fillGradientMatchShape ?? false}
                                          onCheckedChange={(checked) => handleSettingsUpdate({ fillGradientMatchShape: checked as boolean })}
                                          className="border-slate-500 data-[state=checked]:bg-cyan-600"
                                          data-testid="checkbox-gradient-match-shape"
                                        />
                                        <div>
                                          <Label className="text-xs text-slate-300">Match gradient type to shape</Label>
                                          <p className="text-xs text-slate-500">Radial/conic for round shapes, linear for geometric</p>
                                        </div>
                                      </div>
                                      
                                      {/* Linear Direction */}
                                      <div className="space-y-2 p-2 bg-slate-900/30 rounded">
                                        <div className="flex items-center justify-between">
                                          <Label className="text-xs font-medium text-slate-300">Linear Direction</Label>
                                          <Select 
                                            value={currentSettings.fillGradientLinearDirection || 'range'} 
                                            onValueChange={(value) => handleSettingsUpdate({ fillGradientLinearDirection: value as 'fixed' | 'range' | 'predefined' })}
                                          >
                                            <SelectTrigger className="h-7 w-24 text-xs bg-slate-800 border-slate-600 text-slate-200" data-testid="select-linear-direction-mode">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                              <SelectItem value="fixed" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
                                              <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                              <SelectItem value="predefined" className="text-slate-200 hover:bg-slate-700">Predefined</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        
                                        {currentSettings.fillGradientLinearDirection === 'fixed' && (
                                          <div className="space-y-2">
                                            <Label className="text-xs text-slate-400">Angle (°)</Label>
                                            <div className="flex items-center gap-2">
                                              <NumericInput
                                                value={currentSettings.fillGradientLinearAngle ?? 45}
                                                onChange={(value) => handleSettingsUpdate({ fillGradientLinearAngle: value })}
                                                min={0}
                                                max={360}
                                                step={15}
                                                className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                data-testid="input-linear-angle-fixed"
                                              />
                                              <Slider
                                                value={[currentSettings.fillGradientLinearAngle ?? 45]}
                                                onValueChange={([value]) => handleSettingsUpdate({ fillGradientLinearAngle: value })}
                                                min={0}
                                                max={360}
                                                step={15}
                                                className="flex-1 [&_[role=slider]]:bg-purple-600"
                                              />
                                            </div>
                                          </div>
                                        )}
                                        
                                        {currentSettings.fillGradientLinearDirection === 'range' && (
                                          <div className="space-y-2">
                                            <Label className="text-xs text-slate-400">Angle Range (°)</Label>
                                            <div className="flex items-center gap-2">
                                              <NumericInput
                                                value={currentSettings.fillGradientLinearAngleRange?.[0] ?? 0}
                                                onChange={(value) => handleSettingsUpdate({ 
                                                  fillGradientLinearAngleRange: [value, currentSettings.fillGradientLinearAngleRange?.[1] ?? 360] 
                                                })}
                                                min={0}
                                                max={360}
                                                step={15}
                                                className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                data-testid="input-linear-angle-min"
                                              />
                                              <Slider
                                                value={currentSettings.fillGradientLinearAngleRange || [0, 360]}
                                                onValueChange={(value) => handleSettingsUpdate({ fillGradientLinearAngleRange: value as [number, number] })}
                                                min={0}
                                                max={360}
                                                step={15}
                                                className="flex-1 [&_[role=slider]]:bg-purple-600"
                                              />
                                              <NumericInput
                                                value={currentSettings.fillGradientLinearAngleRange?.[1] ?? 360}
                                                onChange={(value) => handleSettingsUpdate({ 
                                                  fillGradientLinearAngleRange: [currentSettings.fillGradientLinearAngleRange?.[0] ?? 0, value] 
                                                })}
                                                min={0}
                                                max={360}
                                                step={15}
                                                className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                data-testid="input-linear-angle-max"
                                              />
                                            </div>
                                          </div>
                                        )}
                                        
                                        {currentSettings.fillGradientLinearDirection === 'predefined' && (
                                          <div className="flex items-center gap-3">
                                            <Select 
                                              value={currentSettings.fillGradientLinearPredefined || 'horizontal'} 
                                              onValueChange={(value) => handleSettingsUpdate({ fillGradientLinearPredefined: value as any })}
                                            >
                                              <SelectTrigger className="h-7 w-32 text-xs bg-slate-800 border-slate-600 text-slate-200" data-testid="select-linear-predefined">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                                <SelectItem value="horizontal" className="text-slate-200 hover:bg-slate-700">Horizontal</SelectItem>
                                                <SelectItem value="vertical" className="text-slate-200 hover:bg-slate-700">Vertical</SelectItem>
                                                <SelectItem value="diagonal-down" className="text-slate-200 hover:bg-slate-700">Diagonal ↘</SelectItem>
                                                <SelectItem value="diagonal-up" className="text-slate-200 hover:bg-slate-700">Diagonal ↗</SelectItem>
                                              </SelectContent>
                                            </Select>
                                            <div className="flex items-center gap-2">
                                              <Checkbox
                                                checked={currentSettings.fillGradientLinearAlignToShape ?? false}
                                                onCheckedChange={(checked) => handleSettingsUpdate({ fillGradientLinearAlignToShape: checked as boolean })}
                                                className="border-slate-500 data-[state=checked]:bg-purple-600"
                                                data-testid="checkbox-linear-align-to-shape"
                                              />
                                              <Label className="text-xs text-slate-300">Align to shape</Label>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Radial Settings */}
                                      <div className="space-y-2 p-2 bg-slate-900/30 rounded">
                                        <Label className="text-xs font-medium text-slate-300">Radial Settings</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-1">
                                            <Label className="text-xs text-slate-400">Position</Label>
                                            <Select 
                                              value={currentSettings.fillGradientRadialCenter || 'center'} 
                                              onValueChange={(value) => handleSettingsUpdate({ fillGradientRadialCenter: value as any })}
                                            >
                                              <SelectTrigger className="h-8 w-full text-xs bg-slate-800 border-slate-600 text-slate-200" data-testid="select-radial-position">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                                <SelectItem value="center" className="text-slate-200 hover:bg-slate-700">Center</SelectItem>
                                                <SelectItem value="corners" className="text-slate-200 hover:bg-slate-700">Corners</SelectItem>
                                                <SelectItem value="midpoints" className="text-slate-200 hover:bg-slate-700">Midpoints</SelectItem>
                                                <SelectItem value="coordinates" className="text-slate-200 hover:bg-slate-700">Coordinates</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-xs text-slate-400">Shape</Label>
                                            <Select 
                                              value={currentSettings.fillGradientRadialShape || 'auto'} 
                                              onValueChange={(value) => handleSettingsUpdate({ fillGradientRadialShape: value as any })}
                                            >
                                              <SelectTrigger className="h-8 w-full text-xs bg-slate-800 border-slate-600 text-slate-200" data-testid="select-radial-shape">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                                <SelectItem value="auto" className="text-slate-200 hover:bg-slate-700">Auto</SelectItem>
                                                <SelectItem value="circle" className="text-slate-200 hover:bg-slate-700">Circle</SelectItem>
                                                <SelectItem value="ellipse" className="text-slate-200 hover:bg-slate-700">Ellipse</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                        
                                        {/* Radial Corners Selection */}
                                        {currentSettings.fillGradientRadialCenter === 'corners' && (
                                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                                            <div className="flex items-center gap-2">
                                              <Label className="text-xs text-slate-400">Selection</Label>
                                              <Select 
                                                value={currentSettings.fillGradientRadialSelectionMode || 'random'} 
                                                onValueChange={(value) => handleSettingsUpdate({ fillGradientRadialSelectionMode: value as any })}
                                              >
                                                <SelectTrigger className="h-7 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                                  <SelectItem value="random" className="text-slate-200 hover:bg-slate-700">Random</SelectItem>
                                                  <SelectItem value="cycle" className="text-slate-200 hover:bg-slate-700">Cycle</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  checked={currentSettings.fillGradientRadialCorners?.topLeft ?? true}
                                                  onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                    fillGradientRadialCorners: { ...currentSettings.fillGradientRadialCorners, topLeft: checked as boolean } 
                                                  })}
                                                  className="border-slate-500 data-[state=checked]:bg-pink-600"
                                                />
                                                <Label className="text-xs text-slate-300">Top Left</Label>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  checked={currentSettings.fillGradientRadialCorners?.topRight ?? true}
                                                  onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                    fillGradientRadialCorners: { ...currentSettings.fillGradientRadialCorners, topRight: checked as boolean } 
                                                  })}
                                                  className="border-slate-500 data-[state=checked]:bg-pink-600"
                                                />
                                                <Label className="text-xs text-slate-300">Top Right</Label>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  checked={currentSettings.fillGradientRadialCorners?.bottomLeft ?? true}
                                                  onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                    fillGradientRadialCorners: { ...currentSettings.fillGradientRadialCorners, bottomLeft: checked as boolean } 
                                                  })}
                                                  className="border-slate-500 data-[state=checked]:bg-pink-600"
                                                />
                                                <Label className="text-xs text-slate-300">Bottom Left</Label>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  checked={currentSettings.fillGradientRadialCorners?.bottomRight ?? true}
                                                  onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                    fillGradientRadialCorners: { ...currentSettings.fillGradientRadialCorners, bottomRight: checked as boolean } 
                                                  })}
                                                  className="border-slate-500 data-[state=checked]:bg-pink-600"
                                                />
                                                <Label className="text-xs text-slate-300">Bottom Right</Label>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Radial Midpoints Selection */}
                                        {currentSettings.fillGradientRadialCenter === 'midpoints' && (
                                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                                            <div className="flex items-center gap-2">
                                              <Label className="text-xs text-slate-400">Selection</Label>
                                              <Select 
                                                value={currentSettings.fillGradientRadialSelectionMode || 'random'} 
                                                onValueChange={(value) => handleSettingsUpdate({ fillGradientRadialSelectionMode: value as any })}
                                              >
                                                <SelectTrigger className="h-7 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                                  <SelectItem value="random" className="text-slate-200 hover:bg-slate-700">Random</SelectItem>
                                                  <SelectItem value="cycle" className="text-slate-200 hover:bg-slate-700">Cycle</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  checked={currentSettings.fillGradientRadialMidpoints?.top ?? true}
                                                  onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                    fillGradientRadialMidpoints: { ...currentSettings.fillGradientRadialMidpoints, top: checked as boolean } 
                                                  })}
                                                  className="border-slate-500 data-[state=checked]:bg-pink-600"
                                                />
                                                <Label className="text-xs text-slate-300">Top</Label>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  checked={currentSettings.fillGradientRadialMidpoints?.right ?? true}
                                                  onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                    fillGradientRadialMidpoints: { ...currentSettings.fillGradientRadialMidpoints, right: checked as boolean } 
                                                  })}
                                                  className="border-slate-500 data-[state=checked]:bg-pink-600"
                                                />
                                                <Label className="text-xs text-slate-300">Right</Label>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  checked={currentSettings.fillGradientRadialMidpoints?.bottom ?? true}
                                                  onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                    fillGradientRadialMidpoints: { ...currentSettings.fillGradientRadialMidpoints, bottom: checked as boolean } 
                                                  })}
                                                  className="border-slate-500 data-[state=checked]:bg-pink-600"
                                                />
                                                <Label className="text-xs text-slate-300">Bottom</Label>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  checked={currentSettings.fillGradientRadialMidpoints?.left ?? true}
                                                  onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                    fillGradientRadialMidpoints: { ...currentSettings.fillGradientRadialMidpoints, left: checked as boolean } 
                                                  })}
                                                  className="border-slate-500 data-[state=checked]:bg-pink-600"
                                                />
                                                <Label className="text-xs text-slate-300">Left</Label>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Radial Shape Probability when auto */}
                                        {currentSettings.fillGradientRadialShape === 'auto' && (
                                          <div className="grid grid-cols-2 gap-3 p-2 bg-slate-800/50 rounded">
                                            <div className="space-y-1">
                                              <Label className="text-xs text-slate-400">Circle: {currentSettings.fillGradientRadialCircleProbability ?? 50}%</Label>
                                              <Slider
                                                value={[currentSettings.fillGradientRadialCircleProbability ?? 50]}
                                                onValueChange={([value]) => handleSettingsUpdate({ 
                                                  fillGradientRadialCircleProbability: value,
                                                  fillGradientRadialEllipseProbability: 100 - value
                                                })}
                                                min={0}
                                                max={100}
                                                step={5}
                                                className="[&_[role=slider]]:bg-pink-600"
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-xs text-slate-400">Ellipse: {currentSettings.fillGradientRadialEllipseProbability ?? 50}%</Label>
                                              <Slider
                                                value={[currentSettings.fillGradientRadialEllipseProbability ?? 50]}
                                                onValueChange={([value]) => handleSettingsUpdate({ 
                                                  fillGradientRadialEllipseProbability: value,
                                                  fillGradientRadialCircleProbability: 100 - value
                                                })}
                                                min={0}
                                                max={100}
                                                step={5}
                                                className="[&_[role=slider]]:bg-pink-600"
                                              />
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Radial Coordinates Controls */}
                                        {currentSettings.fillGradientRadialCenter === 'coordinates' && (
                                          <div className="space-y-3 p-2 bg-slate-800/50 rounded">
                                            {/* Center X */}
                                            <div className="space-y-2">
                                              <div className="flex items-center justify-between">
                                                <Label className="text-xs text-slate-300">Center X</Label>
                                                <Select 
                                                  value={currentSettings.fillGradientRadialCenterXMode || 'fixed'} 
                                                  onValueChange={(value) => handleSettingsUpdate({ fillGradientRadialCenterXMode: value as any })}
                                                >
                                                  <SelectTrigger className="h-7 w-24 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                                    <SelectItem value="fixed" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
                                                    <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                                    <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              
                                              {currentSettings.fillGradientRadialCenterXMode === 'fixed' && (
                                                <div className="flex items-center gap-2">
                                                  <NumericInput
                                                    value={currentSettings.fillGradientRadialCenterX ?? 50}
                                                    onChange={(value) => handleSettingsUpdate({ fillGradientRadialCenterX: value })}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                    data-testid="input-radial-center-x"
                                                  />
                                                  <Slider
                                                    value={[currentSettings.fillGradientRadialCenterX ?? 50]}
                                                    onValueChange={([value]) => handleSettingsUpdate({ fillGradientRadialCenterX: value })}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    className="flex-1 [&_[role=slider]]:bg-pink-600"
                                                  />
                                                </div>
                                              )}
                                              
                                              {currentSettings.fillGradientRadialCenterXMode === 'range' && (
                                                <div className="flex items-center gap-2">
                                                  <NumericInput
                                                    value={currentSettings.fillGradientRadialCenterXRange?.[0] ?? 25}
                                                    onChange={(value) => handleSettingsUpdate({ 
                                                      fillGradientRadialCenterXRange: [value, currentSettings.fillGradientRadialCenterXRange?.[1] ?? 75] 
                                                    })}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                  />
                                                  <Slider
                                                    value={currentSettings.fillGradientRadialCenterXRange || [25, 75]}
                                                    onValueChange={(value) => handleSettingsUpdate({ fillGradientRadialCenterXRange: value as [number, number] })}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    className="flex-1 [&_[role=slider]]:bg-pink-600"
                                                  />
                                                  <NumericInput
                                                    value={currentSettings.fillGradientRadialCenterXRange?.[1] ?? 75}
                                                    onChange={(value) => handleSettingsUpdate({ 
                                                      fillGradientRadialCenterXRange: [currentSettings.fillGradientRadialCenterXRange?.[0] ?? 25, value] 
                                                    })}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                  />
                                                </div>
                                              )}
                                              
                                              {currentSettings.fillGradientRadialCenterXMode === 'incremental' && (
                                                <div className="space-y-2">
                                                  <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                      <Label className="text-xs text-slate-400">Start</Label>
                                                      <div className="flex items-center gap-2">
                                                        <NumericInput
                                                          value={currentSettings.fillGradientRadialCenterXStartValue ?? 50}
                                                          onChange={(value) => handleSettingsUpdate({ fillGradientRadialCenterXStartValue: value })}
                                                          min={0}
                                                          max={100}
                                                          step={5}
                                                          className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                        />
                                                        <Slider
                                                          value={[currentSettings.fillGradientRadialCenterXStartValue ?? 50]}
                                                          onValueChange={([value]) => handleSettingsUpdate({ fillGradientRadialCenterXStartValue: value })}
                                                          min={0}
                                                          max={100}
                                                          step={5}
                                                          className="flex-1 [&_[role=slider]]:bg-pink-600"
                                                        />
                                                      </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                      <Label className="text-xs text-slate-400">Increment</Label>
                                                      <div className="flex items-center gap-2">
                                                        <NumericInput
                                                          value={currentSettings.fillGradientRadialCenterXIncrement ?? 10}
                                                          onChange={(value) => handleSettingsUpdate({ fillGradientRadialCenterXIncrement: value })}
                                                          min={-50}
                                                          max={50}
                                                          step={5}
                                                          className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                        />
                                                        <Slider
                                                          value={[currentSettings.fillGradientRadialCenterXIncrement ?? 10]}
                                                          onValueChange={([value]) => handleSettingsUpdate({ fillGradientRadialCenterXIncrement: value })}
                                                          min={-50}
                                                          max={50}
                                                          step={5}
                                                          className="flex-1 [&_[role=slider]]:bg-pink-600"
                                                        />
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <Checkbox
                                                      checked={currentSettings.fillGradientRadialCenterXModulationEnabled ?? false}
                                                      onCheckedChange={(checked) => handleSettingsUpdate({ fillGradientRadialCenterXModulationEnabled: checked as boolean })}
                                                      className="border-slate-500 data-[state=checked]:bg-pink-600"
                                                    />
                                                    <Label className="text-xs text-slate-300">Modulation</Label>
                                                    {currentSettings.fillGradientRadialCenterXModulationEnabled && (
                                                      <NumericInput
                                                        value={currentSettings.fillGradientRadialCenterXModulationValue ?? 100}
                                                        onChange={(value) => handleSettingsUpdate({ fillGradientRadialCenterXModulationValue: value })}
                                                        min={10}
                                                        max={100}
                                                        step={5}
                                                        className="h-7 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                      />
                                                    )}
                                                  </div>
                                                  <IndexDriverSelect
                                                    value={currentSettings.gradientCenterIncrementalIndexDriver}
                                                    onChange={(value) => handleSettingsUpdate({ gradientCenterIncrementalIndexDriver: value })}
                                                    testId="select-radial-center-x-index-driver"
                                                  />
                                                </div>
                                              )}
                                            </div>
                                            
                                            {/* Center Y */}
                                            <div className="space-y-2">
                                              <div className="flex items-center justify-between">
                                                <Label className="text-xs text-slate-300">Center Y</Label>
                                                <Select 
                                                  value={currentSettings.fillGradientRadialCenterYMode || 'fixed'} 
                                                  onValueChange={(value) => handleSettingsUpdate({ fillGradientRadialCenterYMode: value as any })}
                                                >
                                                  <SelectTrigger className="h-7 w-24 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                                    <SelectItem value="fixed" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
                                                    <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                                    <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              
                                              {currentSettings.fillGradientRadialCenterYMode === 'fixed' && (
                                                <div className="flex items-center gap-2">
                                                  <NumericInput
                                                    value={currentSettings.fillGradientRadialCenterY ?? 50}
                                                    onChange={(value) => handleSettingsUpdate({ fillGradientRadialCenterY: value })}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                    data-testid="input-radial-center-y"
                                                  />
                                                  <Slider
                                                    value={[currentSettings.fillGradientRadialCenterY ?? 50]}
                                                    onValueChange={([value]) => handleSettingsUpdate({ fillGradientRadialCenterY: value })}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    className="flex-1 [&_[role=slider]]:bg-pink-600"
                                                  />
                                                </div>
                                              )}
                                              
                                              {currentSettings.fillGradientRadialCenterYMode === 'range' && (
                                                <div className="flex items-center gap-2">
                                                  <NumericInput
                                                    value={currentSettings.fillGradientRadialCenterYRange?.[0] ?? 25}
                                                    onChange={(value) => handleSettingsUpdate({ 
                                                      fillGradientRadialCenterYRange: [value, currentSettings.fillGradientRadialCenterYRange?.[1] ?? 75] 
                                                    })}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                  />
                                                  <Slider
                                                    value={currentSettings.fillGradientRadialCenterYRange || [25, 75]}
                                                    onValueChange={(value) => handleSettingsUpdate({ fillGradientRadialCenterYRange: value as [number, number] })}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    className="flex-1 [&_[role=slider]]:bg-pink-600"
                                                  />
                                                  <NumericInput
                                                    value={currentSettings.fillGradientRadialCenterYRange?.[1] ?? 75}
                                                    onChange={(value) => handleSettingsUpdate({ 
                                                      fillGradientRadialCenterYRange: [currentSettings.fillGradientRadialCenterYRange?.[0] ?? 25, value] 
                                                    })}
                                                    min={0}
                                                    max={100}
                                                    step={5}
                                                    className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                  />
                                                </div>
                                              )}
                                              
                                              {currentSettings.fillGradientRadialCenterYMode === 'incremental' && (
                                                <div className="space-y-2">
                                                  <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                      <Label className="text-xs text-slate-400">Start</Label>
                                                      <div className="flex items-center gap-2">
                                                        <NumericInput
                                                          value={currentSettings.fillGradientRadialCenterYStartValue ?? 50}
                                                          onChange={(value) => handleSettingsUpdate({ fillGradientRadialCenterYStartValue: value })}
                                                          min={0}
                                                          max={100}
                                                          step={5}
                                                          className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                        />
                                                        <Slider
                                                          value={[currentSettings.fillGradientRadialCenterYStartValue ?? 50]}
                                                          onValueChange={([value]) => handleSettingsUpdate({ fillGradientRadialCenterYStartValue: value })}
                                                          min={0}
                                                          max={100}
                                                          step={5}
                                                          className="flex-1 [&_[role=slider]]:bg-pink-600"
                                                        />
                                                      </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                      <Label className="text-xs text-slate-400">Increment</Label>
                                                      <div className="flex items-center gap-2">
                                                        <NumericInput
                                                          value={currentSettings.fillGradientRadialCenterYIncrement ?? 10}
                                                          onChange={(value) => handleSettingsUpdate({ fillGradientRadialCenterYIncrement: value })}
                                                          min={-50}
                                                          max={50}
                                                          step={5}
                                                          className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                        />
                                                        <Slider
                                                          value={[currentSettings.fillGradientRadialCenterYIncrement ?? 10]}
                                                          onValueChange={([value]) => handleSettingsUpdate({ fillGradientRadialCenterYIncrement: value })}
                                                          min={-50}
                                                          max={50}
                                                          step={5}
                                                          className="flex-1 [&_[role=slider]]:bg-pink-600"
                                                        />
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <Checkbox
                                                      checked={currentSettings.fillGradientRadialCenterYModulationEnabled ?? false}
                                                      onCheckedChange={(checked) => handleSettingsUpdate({ fillGradientRadialCenterYModulationEnabled: checked as boolean })}
                                                      className="border-slate-500 data-[state=checked]:bg-pink-600"
                                                    />
                                                    <Label className="text-xs text-slate-300">Modulation</Label>
                                                    {currentSettings.fillGradientRadialCenterYModulationEnabled && (
                                                      <NumericInput
                                                        value={currentSettings.fillGradientRadialCenterYModulationValue ?? 100}
                                                        onChange={(value) => handleSettingsUpdate({ fillGradientRadialCenterYModulationValue: value })}
                                                        min={10}
                                                        max={100}
                                                        step={5}
                                                        className="h-7 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                      />
                                                    )}
                                                  </div>
                                                  <IndexDriverSelect
                                                    value={currentSettings.gradientCenterIncrementalIndexDriver}
                                                    onChange={(value) => handleSettingsUpdate({ gradientCenterIncrementalIndexDriver: value })}
                                                    testId="select-radial-center-y-index-driver"
                                                  />
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Conic Settings - Responsive Two Column Layout */}
                                      <div className="space-y-3 p-3 bg-slate-900/30 rounded">
                                        <Label className="text-xs font-medium text-slate-300">Conic Settings</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                          {/* Left Column: Position Controls */}
                                          <div className="space-y-3 p-3 bg-slate-800/40 rounded border border-slate-700">
                                            <div className="space-y-2">
                                              <Label className="text-xs text-slate-400">Position</Label>
                                              <Select 
                                                value={currentSettings.fillGradientConicCenter || 'center'} 
                                                onValueChange={(value) => handleSettingsUpdate({ fillGradientConicCenter: value as any })}
                                              >
                                                <SelectTrigger className="h-8 w-full text-xs bg-slate-800 border-slate-600 text-slate-200" data-testid="select-conic-position">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                                  <SelectItem value="center" className="text-slate-200 hover:bg-slate-700">Center</SelectItem>
                                                  <SelectItem value="corners" className="text-slate-200 hover:bg-slate-700">Corners</SelectItem>
                                                  <SelectItem value="midpoints" className="text-slate-200 hover:bg-slate-700">Midpoints</SelectItem>
                                                  <SelectItem value="coordinates" className="text-slate-200 hover:bg-slate-700">Coordinates</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            
                                            {/* Corners Selection - inline in left column */}
                                            {currentSettings.fillGradientConicCenter === 'corners' && (
                                              <div className="space-y-2 pt-1">
                                                <div className="flex items-center gap-2">
                                                  <Label className="text-xs text-slate-400">Selection</Label>
                                                  <Select 
                                                    value={currentSettings.fillGradientConicSelectionMode || 'random'} 
                                                    onValueChange={(value) => handleSettingsUpdate({ fillGradientConicSelectionMode: value as any })}
                                                  >
                                                    <SelectTrigger className="h-7 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                                      <SelectItem value="random" className="text-slate-200 hover:bg-slate-700">Random</SelectItem>
                                                      <SelectItem value="cycle" className="text-slate-200 hover:bg-slate-700">Cycle</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1">
                                                  <div className="flex items-center gap-1">
                                                    <Checkbox
                                                      checked={currentSettings.fillGradientConicCorners?.topLeft ?? true}
                                                      onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                        fillGradientConicCorners: { ...currentSettings.fillGradientConicCorners, topLeft: checked as boolean } 
                                                      })}
                                                      className="border-slate-500 data-[state=checked]:bg-amber-600 h-3 w-3"
                                                    />
                                                    <Label className="text-xs text-slate-300">TL</Label>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <Checkbox
                                                      checked={currentSettings.fillGradientConicCorners?.topRight ?? true}
                                                      onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                        fillGradientConicCorners: { ...currentSettings.fillGradientConicCorners, topRight: checked as boolean } 
                                                      })}
                                                      className="border-slate-500 data-[state=checked]:bg-amber-600 h-3 w-3"
                                                    />
                                                    <Label className="text-xs text-slate-300">TR</Label>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <Checkbox
                                                      checked={currentSettings.fillGradientConicCorners?.bottomLeft ?? true}
                                                      onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                        fillGradientConicCorners: { ...currentSettings.fillGradientConicCorners, bottomLeft: checked as boolean } 
                                                      })}
                                                      className="border-slate-500 data-[state=checked]:bg-amber-600 h-3 w-3"
                                                    />
                                                    <Label className="text-xs text-slate-300">BL</Label>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <Checkbox
                                                      checked={currentSettings.fillGradientConicCorners?.bottomRight ?? true}
                                                      onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                        fillGradientConicCorners: { ...currentSettings.fillGradientConicCorners, bottomRight: checked as boolean } 
                                                      })}
                                                      className="border-slate-500 data-[state=checked]:bg-amber-600 h-3 w-3"
                                                    />
                                                    <Label className="text-xs text-slate-300">BR</Label>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                            
                                            {/* Midpoints Selection - inline in left column */}
                                            {currentSettings.fillGradientConicCenter === 'midpoints' && (
                                              <div className="space-y-2 pt-1">
                                                <div className="flex items-center gap-2">
                                                  <Label className="text-xs text-slate-400">Selection</Label>
                                                  <Select 
                                                    value={currentSettings.fillGradientConicSelectionMode || 'random'} 
                                                    onValueChange={(value) => handleSettingsUpdate({ fillGradientConicSelectionMode: value as any })}
                                                  >
                                                    <SelectTrigger className="h-7 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                                      <SelectItem value="random" className="text-slate-200 hover:bg-slate-700">Random</SelectItem>
                                                      <SelectItem value="cycle" className="text-slate-200 hover:bg-slate-700">Cycle</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1">
                                                  <div className="flex items-center gap-1">
                                                    <Checkbox
                                                      checked={currentSettings.fillGradientConicMidpoints?.top ?? true}
                                                      onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                        fillGradientConicMidpoints: { ...currentSettings.fillGradientConicMidpoints, top: checked as boolean } 
                                                      })}
                                                      className="border-slate-500 data-[state=checked]:bg-amber-600 h-3 w-3"
                                                    />
                                                    <Label className="text-xs text-slate-300">Top</Label>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <Checkbox
                                                      checked={currentSettings.fillGradientConicMidpoints?.right ?? true}
                                                      onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                        fillGradientConicMidpoints: { ...currentSettings.fillGradientConicMidpoints, right: checked as boolean } 
                                                      })}
                                                      className="border-slate-500 data-[state=checked]:bg-amber-600 h-3 w-3"
                                                    />
                                                    <Label className="text-xs text-slate-300">Right</Label>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <Checkbox
                                                      checked={currentSettings.fillGradientConicMidpoints?.bottom ?? true}
                                                      onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                        fillGradientConicMidpoints: { ...currentSettings.fillGradientConicMidpoints, bottom: checked as boolean } 
                                                      })}
                                                      className="border-slate-500 data-[state=checked]:bg-amber-600 h-3 w-3"
                                                    />
                                                    <Label className="text-xs text-slate-300">Bottom</Label>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <Checkbox
                                                      checked={currentSettings.fillGradientConicMidpoints?.left ?? true}
                                                      onCheckedChange={(checked) => handleSettingsUpdate({ 
                                                        fillGradientConicMidpoints: { ...currentSettings.fillGradientConicMidpoints, left: checked as boolean } 
                                                      })}
                                                      className="border-slate-500 data-[state=checked]:bg-amber-600 h-3 w-3"
                                                    />
                                                    <Label className="text-xs text-slate-300">Left</Label>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                            
                                            {/* Coordinates Controls - inline in left column */}
                                            {currentSettings.fillGradientConicCenter === 'coordinates' && (
                                              <div className="space-y-4 pt-1">
                                                {/* Center X */}
                                                <div className="space-y-3">
                                                  <div className="flex items-center justify-between">
                                                    <Label className="text-xs text-slate-300">X</Label>
                                                    <Select 
                                                      value={currentSettings.fillGradientConicCenterXMode || 'fixed'} 
                                                      onValueChange={(value) => handleSettingsUpdate({ fillGradientConicCenterXMode: value as any })}
                                                    >
                                                      <SelectTrigger className="h-6 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                                        <SelectValue />
                                                      </SelectTrigger>
                                                      <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                                        <SelectItem value="fixed" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
                                                        <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                                        <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                                      </SelectContent>
                                                    </Select>
                                                  </div>
                                                  {currentSettings.fillGradientConicCenterXMode === 'fixed' && (
                                                    <div className="space-y-2">
                                                      <NumericInput
                                                        value={currentSettings.fillGradientConicCenterX ?? 50}
                                                        onChange={(value) => handleSettingsUpdate({ fillGradientConicCenterX: value })}
                                                        min={0}
                                                        max={100}
                                                        step={5}
                                                        className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                      />
                                                      <Slider
                                                        value={[currentSettings.fillGradientConicCenterX ?? 50]}
                                                        onValueChange={([value]) => handleSettingsUpdate({ fillGradientConicCenterX: value })}
                                                        min={0}
                                                        max={100}
                                                        step={5}
                                                        className="[&_[role=slider]]:bg-amber-600"
                                                      />
                                                    </div>
                                                  )}
                                                  {currentSettings.fillGradientConicCenterXMode === 'range' && (
                                                    <div className="space-y-3">
                                                      <div className="flex flex-col md:flex-row gap-2 md:gap-1">
                                                        <NumericInput
                                                          value={currentSettings.fillGradientConicCenterXRange?.[0] ?? 25}
                                                          onChange={(value) => handleSettingsUpdate({ 
                                                            fillGradientConicCenterXRange: [value, currentSettings.fillGradientConicCenterXRange?.[1] ?? 75] 
                                                          })}
                                                          min={0}
                                                          max={100}
                                                          step={5}
                                                          className="h-8 flex-1 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                        />
                                                        <NumericInput
                                                          value={currentSettings.fillGradientConicCenterXRange?.[1] ?? 75}
                                                          onChange={(value) => handleSettingsUpdate({ 
                                                            fillGradientConicCenterXRange: [currentSettings.fillGradientConicCenterXRange?.[0] ?? 25, value] 
                                                          })}
                                                          min={0}
                                                          max={100}
                                                          step={5}
                                                          className="h-8 flex-1 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                        />
                                                      </div>
                                                      <Slider
                                                        value={currentSettings.fillGradientConicCenterXRange || [25, 75]}
                                                        onValueChange={(value) => handleSettingsUpdate({ fillGradientConicCenterXRange: value as [number, number] })}
                                                        min={0}
                                                        max={100}
                                                        step={5}
                                                        className="[&_[role=slider]]:bg-amber-600"
                                                      />
                                                    </div>
                                                  )}
                                                  {currentSettings.fillGradientConicCenterXMode === 'incremental' && (
                                                    <div className="space-y-1">
                                                      <div className="flex items-center gap-1">
                                                        <Label className="text-xs text-slate-500 w-8">Start</Label>
                                                        <NumericInput
                                                          value={currentSettings.fillGradientConicCenterXStartValue ?? 50}
                                                          onChange={(value) => handleSettingsUpdate({ fillGradientConicCenterXStartValue: value })}
                                                          min={0}
                                                          max={100}
                                                          step={5}
                                                          className="h-8 flex-1 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                        />
                                                      </div>
                                                      <div className="flex items-center gap-1">
                                                        <Label className="text-xs text-slate-500 w-8">Inc</Label>
                                                        <NumericInput
                                                          value={currentSettings.fillGradientConicCenterXIncrement ?? 10}
                                                          onChange={(value) => handleSettingsUpdate({ fillGradientConicCenterXIncrement: value })}
                                                          min={-50}
                                                          max={50}
                                                          step={5}
                                                          className="h-8 flex-1 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                        />
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                        <Checkbox
                                                          checked={currentSettings.fillGradientConicCenterXModulationEnabled ?? false}
                                                          onCheckedChange={(checked) => handleSettingsUpdate({ fillGradientConicCenterXModulationEnabled: checked as boolean })}
                                                          className="border-slate-500 data-[state=checked]:bg-amber-600"
                                                        />
                                                        <Label className="text-xs text-slate-300">Modulation</Label>
                                                        {currentSettings.fillGradientConicCenterXModulationEnabled && (
                                                          <NumericInput
                                                            value={currentSettings.fillGradientConicCenterXModulationValue ?? 100}
                                                            onChange={(value) => handleSettingsUpdate({ fillGradientConicCenterXModulationValue: value })}
                                                            min={10}
                                                            max={100}
                                                            step={5}
                                                            className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                          />
                                                        )}
                                                      </div>
                                                      <IndexDriverSelect
                                                        value={currentSettings.gradientCenterIncrementalIndexDriver}
                                                        onChange={(value) => handleSettingsUpdate({ gradientCenterIncrementalIndexDriver: value })}
                                                        testId="select-conic-center-x-index-driver"
                                                      />
                                                    </div>
                                                  )}
                                                </div>
                                                
                                                {/* Center Y */}
                                                <div className="space-y-3">
                                                  <div className="flex items-center justify-between">
                                                    <Label className="text-xs text-slate-300">Y</Label>
                                                    <Select 
                                                      value={currentSettings.fillGradientConicCenterYMode || 'fixed'} 
                                                      onValueChange={(value) => handleSettingsUpdate({ fillGradientConicCenterYMode: value as any })}
                                                    >
                                                      <SelectTrigger className="h-6 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                                        <SelectValue />
                                                      </SelectTrigger>
                                                      <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                                        <SelectItem value="fixed" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
                                                        <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                                        <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                                      </SelectContent>
                                                    </Select>
                                                  </div>
                                                  {currentSettings.fillGradientConicCenterYMode === 'fixed' && (
                                                    <div className="space-y-2">
                                                      <NumericInput
                                                        value={currentSettings.fillGradientConicCenterY ?? 50}
                                                        onChange={(value) => handleSettingsUpdate({ fillGradientConicCenterY: value })}
                                                        min={0}
                                                        max={100}
                                                        step={5}
                                                        className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                      />
                                                      <Slider
                                                        value={[currentSettings.fillGradientConicCenterY ?? 50]}
                                                        onValueChange={([value]) => handleSettingsUpdate({ fillGradientConicCenterY: value })}
                                                        min={0}
                                                        max={100}
                                                        step={5}
                                                        className="[&_[role=slider]]:bg-amber-600"
                                                      />
                                                    </div>
                                                  )}
                                                  {currentSettings.fillGradientConicCenterYMode === 'range' && (
                                                    <div className="space-y-3">
                                                      <div className="flex flex-col md:flex-row gap-2 md:gap-1">
                                                        <NumericInput
                                                          value={currentSettings.fillGradientConicCenterYRange?.[0] ?? 25}
                                                          onChange={(value) => handleSettingsUpdate({ 
                                                            fillGradientConicCenterYRange: [value, currentSettings.fillGradientConicCenterYRange?.[1] ?? 75] 
                                                          })}
                                                          min={0}
                                                          max={100}
                                                          step={5}
                                                          className="h-8 flex-1 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                        />
                                                        <NumericInput
                                                          value={currentSettings.fillGradientConicCenterYRange?.[1] ?? 75}
                                                          onChange={(value) => handleSettingsUpdate({ 
                                                            fillGradientConicCenterYRange: [currentSettings.fillGradientConicCenterYRange?.[0] ?? 25, value] 
                                                          })}
                                                          min={0}
                                                          max={100}
                                                          step={5}
                                                          className="h-8 flex-1 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                        />
                                                      </div>
                                                      <Slider
                                                        value={currentSettings.fillGradientConicCenterYRange || [25, 75]}
                                                        onValueChange={(value) => handleSettingsUpdate({ fillGradientConicCenterYRange: value as [number, number] })}
                                                        min={0}
                                                        max={100}
                                                        step={5}
                                                        className="[&_[role=slider]]:bg-amber-600"
                                                      />
                                                    </div>
                                                  )}
                                                  {currentSettings.fillGradientConicCenterYMode === 'incremental' && (
                                                    <div className="space-y-1">
                                                      <div className="flex items-center gap-1">
                                                        <Label className="text-xs text-slate-500 w-8">Start</Label>
                                                        <NumericInput
                                                          value={currentSettings.fillGradientConicCenterYStartValue ?? 50}
                                                          onChange={(value) => handleSettingsUpdate({ fillGradientConicCenterYStartValue: value })}
                                                          min={0}
                                                          max={100}
                                                          step={5}
                                                          className="h-8 flex-1 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                        />
                                                      </div>
                                                      <div className="flex items-center gap-1">
                                                        <Label className="text-xs text-slate-500 w-8">Inc</Label>
                                                        <NumericInput
                                                          value={currentSettings.fillGradientConicCenterYIncrement ?? 10}
                                                          onChange={(value) => handleSettingsUpdate({ fillGradientConicCenterYIncrement: value })}
                                                          min={-50}
                                                          max={50}
                                                          step={5}
                                                          className="h-8 flex-1 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                        />
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                        <Checkbox
                                                          checked={currentSettings.fillGradientConicCenterYModulationEnabled ?? false}
                                                          onCheckedChange={(checked) => handleSettingsUpdate({ fillGradientConicCenterYModulationEnabled: checked as boolean })}
                                                          className="border-slate-500 data-[state=checked]:bg-amber-600"
                                                        />
                                                        <Label className="text-xs text-slate-300">Modulation</Label>
                                                        {currentSettings.fillGradientConicCenterYModulationEnabled && (
                                                          <NumericInput
                                                            value={currentSettings.fillGradientConicCenterYModulationValue ?? 100}
                                                            onChange={(value) => handleSettingsUpdate({ fillGradientConicCenterYModulationValue: value })}
                                                            min={10}
                                                            max={100}
                                                            step={5}
                                                            className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                          />
                                                        )}
                                                      </div>
                                                      <IndexDriverSelect
                                                        value={currentSettings.gradientCenterIncrementalIndexDriver}
                                                        onChange={(value) => handleSettingsUpdate({ gradientCenterIncrementalIndexDriver: value })}
                                                        testId="select-conic-center-y-index-driver"
                                                      />
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Right Column: Angle Mode Controls */}
                                          <div className="space-y-3 p-3 bg-slate-800/40 rounded border border-slate-700">
                                            <div className="space-y-2">
                                              <Label className="text-xs text-slate-400">Angle Mode</Label>
                                              <Select 
                                                value={currentSettings.fillGradientConicAngleMode || 'fixed'} 
                                                onValueChange={(value) => handleSettingsUpdate({ fillGradientConicAngleMode: value as any })}
                                              >
                                                <SelectTrigger className="h-8 w-full text-xs bg-slate-800 border-slate-600 text-slate-200" data-testid="select-conic-angle-mode">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10003 }}>
                                                  <SelectItem value="fixed" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
                                                  <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                                  <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            
                                            {/* Fixed Angle */}
                                            {currentSettings.fillGradientConicAngleMode === 'fixed' && (
                                              <div className="space-y-3">
                                                <Label className="text-xs text-slate-400">Start Angle (°)</Label>
                                                <NumericInput
                                                  value={currentSettings.fillGradientConicAngle ?? 0}
                                                  onChange={(value) => handleSettingsUpdate({ fillGradientConicAngle: value })}
                                                  min={0}
                                                  max={360}
                                                  step={15}
                                                  className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                  data-testid="input-conic-angle"
                                                />
                                                <Slider
                                                  value={[currentSettings.fillGradientConicAngle ?? 0]}
                                                  onValueChange={([value]) => handleSettingsUpdate({ fillGradientConicAngle: value })}
                                                  min={0}
                                                  max={360}
                                                  step={15}
                                                  className="[&_[role=slider]]:bg-amber-600"
                                                />
                                              </div>
                                            )}
                                            
                                            {/* Range Angle */}
                                            {currentSettings.fillGradientConicAngleMode === 'range' && (
                                              <div className="space-y-3">
                                                <Label className="text-xs text-slate-400">Angle Range (°)</Label>
                                                <div className="flex flex-col md:flex-row gap-2 md:gap-1">
                                                  <NumericInput
                                                    value={currentSettings.fillGradientConicAngleRange?.[0] ?? 0}
                                                    onChange={(value) => handleSettingsUpdate({ 
                                                      fillGradientConicAngleRange: [value, currentSettings.fillGradientConicAngleRange?.[1] ?? 360] 
                                                    })}
                                                    min={0}
                                                    max={360}
                                                    step={15}
                                                    className="h-8 flex-1 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                    data-testid="input-conic-angle-min"
                                                  />
                                                  <NumericInput
                                                    value={currentSettings.fillGradientConicAngleRange?.[1] ?? 360}
                                                    onChange={(value) => handleSettingsUpdate({ 
                                                      fillGradientConicAngleRange: [currentSettings.fillGradientConicAngleRange?.[0] ?? 0, value] 
                                                    })}
                                                    min={0}
                                                    max={360}
                                                    step={15}
                                                    className="h-8 flex-1 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                    data-testid="input-conic-angle-max"
                                                  />
                                                </div>
                                                <Slider
                                                  value={currentSettings.fillGradientConicAngleRange || [0, 360]}
                                                  onValueChange={(value) => handleSettingsUpdate({ fillGradientConicAngleRange: value as [number, number] })}
                                                  min={0}
                                                  max={360}
                                                  step={15}
                                                  className="[&_[role=slider]]:bg-amber-600"
                                                />
                                              </div>
                                            )}
                                            
                                            {/* Incremental Angle */}
                                            {currentSettings.fillGradientConicAngleMode === 'incremental' && (
                                              <div className="space-y-3">
                                                <div className="space-y-3">
                                                  <Label className="text-xs text-slate-400">Start (°)</Label>
                                                  <NumericInput
                                                    value={currentSettings.fillGradientConicAngleStartValue ?? 0}
                                                    onChange={(value) => handleSettingsUpdate({ fillGradientConicAngleStartValue: value })}
                                                    min={0}
                                                    max={360}
                                                    step={15}
                                                    className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                  />
                                                  <Slider
                                                    value={[currentSettings.fillGradientConicAngleStartValue ?? 0]}
                                                    onValueChange={([value]) => handleSettingsUpdate({ fillGradientConicAngleStartValue: value })}
                                                    min={0}
                                                    max={360}
                                                    step={15}
                                                    className="[&_[role=slider]]:bg-amber-600"
                                                  />
                                                </div>
                                                <div className="space-y-3">
                                                  <Label className="text-xs text-slate-400">Increment (°)</Label>
                                                  <NumericInput
                                                    value={currentSettings.fillGradientConicAngleIncrement ?? 30}
                                                    onChange={(value) => handleSettingsUpdate({ fillGradientConicAngleIncrement: value })}
                                                    min={-180}
                                                    max={180}
                                                    step={15}
                                                    className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                                  />
                                                  <Slider
                                                    value={[currentSettings.fillGradientConicAngleIncrement ?? 30]}
                                                    onValueChange={([value]) => handleSettingsUpdate({ fillGradientConicAngleIncrement: value })}
                                                    min={-180}
                                                    max={180}
                                                    step={15}
                                                    className="[&_[role=slider]]:bg-amber-600"
                                                  />
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                  <Checkbox
                                                    checked={currentSettings.fillGradientConicAngleModulationEnabled ?? false}
                                                    onCheckedChange={(checked) => handleSettingsUpdate({ fillGradientConicAngleModulationEnabled: checked as boolean })}
                                                    className="border-slate-500 data-[state=checked]:bg-amber-600"
                                                    data-testid="checkbox-conic-angle-modulation"
                                                  />
                                                  <Label className="text-xs text-slate-400">Enable Modulation</Label>
                                                </div>
                                                {currentSettings.fillGradientConicAngleModulationEnabled && (
                                                  <div className="space-y-1">
                                                    <Label className="text-xs text-slate-400">Wrap at (°)</Label>
                                                    <BufferedSliderWithNumericInput
                                                      value={currentSettings.fillGradientConicAngleModulationValue ?? 360}
                                                      onValueCommit={(value) => handleSettingsUpdate({ fillGradientConicAngleModulationValue: value })}
                                                      min={30}
                                                      max={360}
                                                      step={15}
                                                      layout="inline"
                                                      inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                                      sliderClassName="flex-1 [&_[role=slider]]:bg-amber-600"
                                                    />
                                                  </div>
                                                )}
                                                <IndexDriverSelect
                                                  value={currentSettings.gradientCenterIncrementalIndexDriver}
                                                  onChange={(value) => handleSettingsUpdate({ gradientCenterIncrementalIndexDriver: value })}
                                                  testId="select-conic-angle-index-driver"
                                                />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Fill Opacity Subsection */}
                          <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  checked={currentSettings.fillOpacityEnabled}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ fillOpacityEnabled: checked as boolean })}
                                  className="border-slate-500 data-[state=checked]:bg-cyan-600"
                                  data-testid="checkbox-fill-opacity-enabled"
                                />
                                <Label className="text-sm font-medium text-slate-200">Fill Opacity</Label>
                              </div>
                              <span className="text-xs text-slate-400">
                                {currentSettings.fillOpacityEnabled ? 
                                  (currentSettings.fillOpacityMode === 'range' ? 'Range' : 
                                   currentSettings.fillOpacityMode === 'define' ? 'Fixed' : 
                                   'Incremental') : 'Disabled'}
                              </span>
                            </div>
      
                            {currentSettings.fillOpacityEnabled && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs text-slate-400">Mode</Label>
                                  <Select 
                                    value={currentSettings.fillOpacityMode} 
                                    onValueChange={(value) => handleSettingsUpdate({ fillOpacityMode: value as 'range' | 'define' | 'incremental' })}
                                  >
                                    <SelectTrigger className="h-7 w-28 text-xs bg-slate-800 border-slate-600 text-slate-200" data-testid="select-fill-opacity-mode">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                      <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                      <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
      
                            {currentSettings.fillOpacityMode === 'range' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Opacity Range (%)</Label>
                                <div className="flex items-center gap-2">
                                  <NumericInput
                                    value={currentSettings.fillOpacityRange?.[0] ?? 70}
                                    onChange={(value) => handleSettingsUpdate({ 
                                      fillOpacityRange: [value, currentSettings.fillOpacityRange?.[1] ?? 100] 
                                    })}
                                    min={0}
                                    max={100}
                                    step={5}
                                    className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    data-testid="input-fill-opacity-min"
                                  />
                                  <Slider
                                    value={currentSettings.fillOpacityRange || [70, 100]}
                                    onValueChange={(value) => handleSettingsUpdate({ fillOpacityRange: value as [number, number] })}
                                    min={0}
                                    max={100}
                                    step={5}
                                    className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                  />
                                  <NumericInput
                                    value={currentSettings.fillOpacityRange?.[1] ?? 100}
                                    onChange={(value) => handleSettingsUpdate({ 
                                      fillOpacityRange: [currentSettings.fillOpacityRange?.[0] ?? 70, value] 
                                    })}
                                    min={0}
                                    max={100}
                                    step={5}
                                    className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    data-testid="input-fill-opacity-max"
                                  />
                                </div>
                              </div>
                            )}
      
                            {currentSettings.fillOpacityMode === 'define' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Opacity (%)</Label>
                                <BufferedSliderWithNumericInput
                                  value={currentSettings.fillOpacityDefine ?? 80}
                                  onValueCommit={(value) => handleSettingsUpdate({ fillOpacityDefine: value })}
                                  min={0}
                                  max={100}
                                  step={5}
                                  layout="inline"
                                  inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  sliderClassName="flex-1 [&_[role=slider]]:bg-cyan-600"
                                />
                              </div>
                            )}
      
                            {currentSettings.fillOpacityMode === 'incremental' && (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Start Value (%)</Label>
                                    <BufferedSliderWithNumericInput
                                      value={currentSettings.fillOpacityStartValue ?? 70}
                                      onValueCommit={(value) => handleSettingsUpdate({ fillOpacityStartValue: value })}
                                      min={0}
                                      max={100}
                                      step={5}
                                      layout="inline"
                                      inputClassName="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      sliderClassName="flex-1 [&_[role=slider]]:bg-cyan-600"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Increment (%/shape)</Label>
                                    <BufferedSliderWithNumericInput
                                      value={currentSettings.fillOpacityIncrement ?? 5}
                                      onValueCommit={(value) => handleSettingsUpdate({ fillOpacityIncrement: value })}
                                      min={-20}
                                      max={20}
                                      step={1}
                                      layout="inline"
                                      inputClassName="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      sliderClassName="flex-1 [&_[role=slider]]:bg-cyan-600"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={currentSettings.fillOpacityModulationEnabled ?? false}
                                      onCheckedChange={(checked) => handleSettingsUpdate({ fillOpacityModulationEnabled: checked as boolean })}
                                      className="border-slate-500 data-[state=checked]:bg-cyan-600"
                                      data-testid="checkbox-fill-opacity-modulation"
                                    />
                                    <Label className="text-xs text-slate-300">Enable Modulation</Label>
                                  </div>
                                  {currentSettings.fillOpacityModulationEnabled && (
                                    <div className="space-y-2 mt-2">
                                      <Label className="text-xs text-slate-400">Wrap at (%)</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.fillOpacityModulationValue ?? 100}
                                        onValueCommit={(value) => handleSettingsUpdate({ fillOpacityModulationValue: value })}
                                        min={10}
                                        max={100}
                                        step={5}
                                        layout="inline"
                                        inputClassName="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                  )}
                                </div>
                                <IndexDriverSelect
                                  value={currentSettings.fillOpacityIncrementalIndexDriver}
                                  onChange={(value) => handleSettingsUpdate({ fillOpacityIncrementalIndexDriver: value })}
                                  testId="select-fill-opacity-index-driver"
                                />
                                <p className="text-xs text-slate-500">Progressive opacity with optional modulation wrap</p>
                              </div>
                            )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Stroke Properties Section - Enhanced styling */}
                    <div className="space-y-3 border border-slate-600 rounded-lg p-3 bg-slate-800/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            checked={currentSettings.strokeEnabled}
                            onCheckedChange={(checked) => handleSettingsUpdate({ strokeEnabled: checked as boolean })}
                            className="border-slate-500 data-[state=checked]:bg-cyan-600"
                            data-testid="checkbox-stroke-enabled"
                          />
                          <Label className="text-sm font-medium text-slate-200">Stroke Properties</Label>
                        </div>
                        <span className="text-xs text-slate-400">
                          {currentSettings.strokeEnabled ? `${currentSettings.strokeProbability}% probability` : 'Disabled'}
                        </span>
                      </div>
                      
                      {currentSettings.strokeEnabled && (
                        <div className="space-y-4 mt-3">
                          {/* Stroke Probability */}
                          <div className="space-y-2 p-2 bg-slate-700/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Stroke Probability</Label>
                            <div className="flex items-center gap-3">
                              <BufferedSliderWithNumericInput
                                value={currentSettings.strokeProbability}
                                onValueCommit={(value) => handleSettingsUpdate({ strokeProbability: Math.max(0, Math.min(100, value)) })}
                                min={0}
                                max={100}
                                step={5}
                                layout="inline"
                                inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                sliderClassName="flex-1 [&_[role=slider]]:bg-cyan-600"
                              />
                              <span className="text-xs text-slate-400">%</span>
                            </div>
                          </div>
                          
                          {/* Stroke Width Subsection */}
                          <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={currentSettings.strokeWidthEnabled ?? true}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ strokeWidthEnabled: checked as boolean })}
                                  className="border-slate-500 data-[state=checked]:bg-cyan-600"
                                  data-testid="checkbox-stroke-width-enabled"
                                />
                                <Label className="text-sm font-medium text-slate-200">Stroke Width</Label>
                              </div>
                              <span className="text-xs text-slate-400">
                                {currentSettings.strokeWidthEnabled !== false ? 
                                  (currentSettings.strokeWidthMode === 'range' ? 'Range' : 
                                   currentSettings.strokeWidthMode === 'define' ? 'Fixed' : 
                                   'Incremental') : 'Disabled'}
                              </span>
                            </div>
                            
                            {currentSettings.strokeWidthEnabled !== false && (
                              <>
                              <div className="flex justify-end">
                                <Select 
                                  value={currentSettings.strokeWidthMode} 
                                  onValueChange={(value) => handleSettingsUpdate({ strokeWidthMode: value as 'range' | 'define' | 'incremental' })}
                                >
                                  <SelectTrigger className="h-7 w-28 text-xs bg-slate-800 border-slate-600 text-slate-200" data-testid="select-stroke-width-mode">
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
                                <Label className="text-xs text-slate-400">Width Range (px)</Label>
                                <div className="flex items-center gap-2">
                                  <NumericInput
                                    value={currentSettings.strokeWidthRange?.[0] ?? 1}
                                    onChange={(value) => handleSettingsUpdate({ 
                                      strokeWidthRange: [value, currentSettings.strokeWidthRange?.[1] ?? 5] 
                                    })}
                                    min={0.5}
                                    max={20}
                                    step={0.5}
                                    className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                    data-testid="input-stroke-width-min"
                                  />
                                  <Slider
                                    value={currentSettings.strokeWidthRange || [1, 5]}
                                    onValueChange={(value) => handleSettingsUpdate({ strokeWidthRange: value as [number, number] })}
                                    min={0.5}
                                    max={20}
                                    step={0.5}
                                    className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                  />
                                  <NumericInput
                                    value={currentSettings.strokeWidthRange?.[1] ?? 5}
                                    onChange={(value) => handleSettingsUpdate({ 
                                      strokeWidthRange: [currentSettings.strokeWidthRange?.[0] ?? 1, value] 
                                    })}
                                    min={0.5}
                                    max={20}
                                    step={0.5}
                                    className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                    data-testid="input-stroke-width-max"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {currentSettings.strokeWidthMode === 'define' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Width (px)</Label>
                                <BufferedSliderWithNumericInput
                                  value={currentSettings.strokeWidthDefine ?? 3}
                                  onValueCommit={(value) => handleSettingsUpdate({ strokeWidthDefine: value })}
                                  min={0.5}
                                  max={20}
                                  step={0.5}
                                  layout="inline"
                                  inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                  sliderClassName="flex-1 [&_[role=slider]]:bg-cyan-600"
                                />
                              </div>
                            )}
                            
                            {currentSettings.strokeWidthMode === 'incremental' && (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Start Value (px)</Label>
                                    <BufferedSliderWithNumericInput
                                      value={currentSettings.strokeWidthStartValue ?? 1}
                                      onValueCommit={(value) => handleSettingsUpdate({ strokeWidthStartValue: value })}
                                      min={0.5}
                                      max={20}
                                      step={0.5}
                                      layout="inline"
                                      inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                      sliderClassName="flex-1 [&_[role=slider]]:bg-cyan-600"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Increment (px/shape)</Label>
                                    <BufferedSliderWithNumericInput
                                      value={currentSettings.strokeWidthIncrement ?? 0.5}
                                      onValueCommit={(value) => handleSettingsUpdate({ strokeWidthIncrement: value })}
                                      min={0}
                                      max={2}
                                      step={0.1}
                                      layout="inline"
                                      inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                      sliderClassName="flex-1 [&_[role=slider]]:bg-cyan-600"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={currentSettings.strokeWidthModulationEnabled ?? false}
                                      onCheckedChange={(checked) => handleSettingsUpdate({ strokeWidthModulationEnabled: checked as boolean })}
                                      className="border-slate-500 data-[state=checked]:bg-cyan-600"
                                      data-testid="checkbox-stroke-width-modulation"
                                    />
                                    <Label className="text-xs text-slate-300">Enable Modulation</Label>
                                  </div>
                                  {currentSettings.strokeWidthModulationEnabled && (
                                    <div className="space-y-2 mt-2">
                                      <Label className="text-xs text-slate-400">Wrap at (px)</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.strokeWidthModulationValue ?? 10}
                                        onValueCommit={(value) => handleSettingsUpdate({ strokeWidthModulationValue: value })}
                                        min={1}
                                        max={20}
                                        step={0.5}
                                        layout="inline"
                                        inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                  )}
                                </div>
                                <IndexDriverSelect
                                  value={currentSettings.strokeIncrementalIndexDriver}
                                  onChange={(value) => handleSettingsUpdate({ strokeIncrementalIndexDriver: value })}
                                  testId="select-stroke-width-index-driver"
                                />
                                <p className="text-xs text-slate-500">Progressive stroke width with optional modulation wrap</p>
                              </div>
                            )}
                              </>
                            )}
                          </div>
                          
                          {/* Stroke Color Subsection */}
                          <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={currentSettings.strokeColorEnabled ?? true}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ strokeColorEnabled: checked as boolean })}
                                  className="border-slate-500 data-[state=checked]:bg-cyan-600"
                                  data-testid="checkbox-stroke-color-enabled"
                                />
                                <Label className="text-sm font-medium text-slate-200">Stroke Color</Label>
                              </div>
                              <span className="text-xs text-slate-400">
                                {currentSettings.strokeColorEnabled !== false ? 
                                  (currentSettings.strokeColorMode === 'range' ? 'Range' : 
                                   currentSettings.strokeColorMode === 'palette' ? 'Palette' : 
                                   'Define') : 'Disabled'}
                              </span>
                            </div>
                            
                            {currentSettings.strokeColorEnabled !== false && (
                              <>
                              <div className="flex justify-end">
                                <Select 
                                  value={currentSettings.strokeColorMode} 
                                  onValueChange={(value) => handleSettingsUpdate({ strokeColorMode: value as 'range' | 'palette' | 'define' })}
                                >
                                  <SelectTrigger className="h-7 w-24 text-xs bg-slate-800 border-slate-600 text-slate-200" data-testid="select-stroke-color-mode">
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
                                  <Label className="text-xs text-slate-400">Color Range</Label>
                                  <div className="flex items-center gap-3">
                                    <Input
                                      type="color"
                                      value={currentSettings.strokeColorRange?.[0] || '#ef4444'}
                                      onChange={(e) => handleSettingsUpdate({
                                        strokeColorRange: [e.target.value, currentSettings.strokeColorRange?.[1] || '#f59e0b']
                                      })}
                                      className="w-12 h-8 p-1 bg-slate-800 border-slate-600 rounded cursor-pointer"
                                      data-testid="input-stroke-color-start"
                                    />
                                    <div className="flex-1 h-6 rounded" style={{
                                      background: `linear-gradient(to right, ${currentSettings.strokeColorRange?.[0] || '#ef4444'}, ${currentSettings.strokeColorRange?.[1] || '#f59e0b'})`
                                    }} />
                                    <Input
                                      type="color"
                                      value={currentSettings.strokeColorRange?.[1] || '#f59e0b'}
                                      onChange={(e) => handleSettingsUpdate({
                                        strokeColorRange: [currentSettings.strokeColorRange?.[0] || '#ef4444', e.target.value]
                                      })}
                                      className="w-12 h-8 p-1 bg-slate-800 border-slate-600 rounded cursor-pointer"
                                      data-testid="input-stroke-color-end"
                                    />
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Checkbox 
                                    checked={currentSettings.strokeColorRangeFlip || false}
                                    onCheckedChange={(checked) => handleSettingsUpdate({ strokeColorRangeFlip: checked as boolean })}
                                    className="border-slate-500 data-[state=checked]:bg-cyan-600"
                                    data-testid="checkbox-stroke-color-flip"
                                  />
                                  <Label className="text-xs text-slate-300">Flip Color Range</Label>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-400">Saturation Range (%)</Label>
                                  <div className="flex items-center gap-2">
                                    <NumericInput
                                      value={currentSettings.strokeColorSaturationRange?.[0] ?? 60}
                                      onChange={(value) => handleSettingsUpdate({ 
                                        strokeColorSaturationRange: [value, currentSettings.strokeColorSaturationRange?.[1] ?? 100] 
                                      })}
                                      min={0}
                                      max={100}
                                      step={5}
                                      className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                      data-testid="input-stroke-saturation-min"
                                    />
                                    <Slider
                                      value={currentSettings.strokeColorSaturationRange || [60, 100]}
                                      onValueChange={(value) => handleSettingsUpdate({ strokeColorSaturationRange: value as [number, number] })}
                                      min={0}
                                      max={100}
                                      step={5}
                                      className="flex-1 [&_[role=slider]]:bg-green-500"
                                    />
                                    <NumericInput
                                      value={currentSettings.strokeColorSaturationRange?.[1] ?? 100}
                                      onChange={(value) => handleSettingsUpdate({ 
                                        strokeColorSaturationRange: [currentSettings.strokeColorSaturationRange?.[0] ?? 60, value] 
                                      })}
                                      min={0}
                                      max={100}
                                      step={5}
                                      className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                      data-testid="input-stroke-saturation-max"
                                    />
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-400">Lightness Range (%)</Label>
                                  <div className="flex items-center gap-2">
                                    <NumericInput
                                      value={currentSettings.strokeColorLightnessRange?.[0] ?? 20}
                                      onChange={(value) => handleSettingsUpdate({ 
                                        strokeColorLightnessRange: [value, currentSettings.strokeColorLightnessRange?.[1] ?? 60] 
                                      })}
                                      min={0}
                                      max={100}
                                      step={5}
                                      className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                      data-testid="input-stroke-lightness-min"
                                    />
                                    <Slider
                                      value={currentSettings.strokeColorLightnessRange || [20, 60]}
                                      onValueChange={(value) => handleSettingsUpdate({ strokeColorLightnessRange: value as [number, number] })}
                                      min={0}
                                      max={100}
                                      step={5}
                                      className="flex-1 [&_[role=slider]]:bg-blue-500"
                                    />
                                    <NumericInput
                                      value={currentSettings.strokeColorLightnessRange?.[1] ?? 60}
                                      onChange={(value) => handleSettingsUpdate({ 
                                        strokeColorLightnessRange: [currentSettings.strokeColorLightnessRange?.[0] ?? 20, value] 
                                      })}
                                      min={0}
                                      max={100}
                                      step={5}
                                      className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                      data-testid="input-stroke-lightness-max"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
      
                            {currentSettings.strokeColorMode === 'palette' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Color Palette</Label>
                                <div className="flex flex-wrap gap-2 p-2 bg-slate-800/50 rounded">
                                  {currentSettings.strokeColorPalette?.map((color, index) => (
                                    <div key={index} className="relative group">
                                      <Input
                                        type="color"
                                        value={color}
                                        onChange={(e) => {
                                          const newPalette = [...(currentSettings.strokeColorPalette || [])];
                                          newPalette[index] = e.target.value;
                                          handleSettingsUpdate({ strokeColorPalette: newPalette });
                                        }}
                                        className="w-10 h-10 p-1 bg-slate-800 border-slate-600 rounded cursor-pointer"
                                        data-testid={`input-new-stroke-palette-${index}`}
                                      />
                                      <button
                                        onClick={() => {
                                          const newPalette = (currentSettings.strokeColorPalette || []).filter((_, i) => i !== index);
                                          handleSettingsUpdate({ strokeColorPalette: newPalette });
                                        }}
                                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                        data-testid={`btn-remove-stroke-palette-${index}`}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => {
                                      const newPalette = [...(currentSettings.strokeColorPalette || []), '#ffffff'];
                                      handleSettingsUpdate({ strokeColorPalette: newPalette });
                                    }}
                                    className="w-10 h-10 bg-slate-700 border border-dashed border-slate-500 rounded text-slate-400 text-lg hover:bg-slate-600 hover:border-slate-400 transition-colors flex items-center justify-center"
                                    data-testid="btn-add-stroke-palette"
                                  >
                                    +
                                  </button>
                                </div>
                                <p className="text-xs text-slate-500">Shapes cycle through palette colors</p>
                              </div>
                            )}
      
                            {currentSettings.strokeColorMode === 'define' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Defined Color</Label>
                                <div className="flex items-center gap-3">
                                  <Input
                                    type="color"
                                    value={currentSettings.strokeColorDefine || '#ef4444'}
                                    onChange={(e) => handleSettingsUpdate({ strokeColorDefine: e.target.value })}
                                    className="w-12 h-10 p-1 bg-slate-800 border-slate-600 rounded cursor-pointer"
                                    data-testid="input-stroke-color-define"
                                  />
                                  <div 
                                    className="flex-1 h-8 rounded border border-slate-600"
                                    style={{ backgroundColor: currentSettings.strokeColorDefine || '#ef4444' }}
                                  />
                                  <Input
                                    type="text"
                                    value={currentSettings.strokeColorDefine || '#ef4444'}
                                    onChange={(e) => handleSettingsUpdate({ strokeColorDefine: e.target.value })}
                                    className="w-24 h-8 bg-slate-800 border-slate-600 text-slate-200 text-xs"
                                    data-testid="input-stroke-color-hex"
                                  />
                                </div>
                                <p className="text-xs text-slate-500">All shapes use this exact color</p>
                              </div>
                            )}
                              </>
                            )}
                          </div>
                          
                          {/* Stroke Opacity Subsection */}
                          <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={currentSettings.strokeOpacityEnabled ?? true}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ strokeOpacityEnabled: checked as boolean })}
                                  className="border-slate-500 data-[state=checked]:bg-cyan-600"
                                  data-testid="checkbox-stroke-opacity-enabled"
                                />
                                <Label className="text-sm font-medium text-slate-200">Stroke Opacity</Label>
                              </div>
                              <span className="text-xs text-slate-400">
                                {currentSettings.strokeOpacityEnabled !== false ? 
                                  (currentSettings.strokeOpacityMode === 'range' ? 'Range' : 
                                   currentSettings.strokeOpacityMode === 'define' ? 'Fixed' : 
                                   'Incremental') : 'Disabled'}
                              </span>
                            </div>
      
                            {currentSettings.strokeOpacityEnabled !== false && (
                              <>
                              <div className="flex justify-end">
                                <Select 
                                  value={currentSettings.strokeOpacityMode} 
                                  onValueChange={(value) => handleSettingsUpdate({ strokeOpacityMode: value as 'range' | 'define' | 'incremental' })}
                                >
                                  <SelectTrigger className="h-7 w-28 text-xs bg-slate-800 border-slate-600 text-slate-200" data-testid="select-stroke-opacity-mode">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                    <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                    <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                    <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                            {currentSettings.strokeOpacityMode === 'range' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Opacity Range (%)</Label>
                                <div className="flex items-center gap-2">
                                  <NumericInput
                                    value={currentSettings.strokeOpacityRange?.[0] ?? 40}
                                    onChange={(value) => handleSettingsUpdate({ 
                                      strokeOpacityRange: [value, currentSettings.strokeOpacityRange?.[1] ?? 100] 
                                    })}
                                    min={0}
                                    max={100}
                                    step={5}
                                    className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                    data-testid="input-stroke-opacity-min"
                                  />
                                  <Slider
                                    value={currentSettings.strokeOpacityRange || [40, 100]}
                                    onValueChange={(value) => handleSettingsUpdate({ strokeOpacityRange: value as [number, number] })}
                                    min={0}
                                    max={100}
                                    step={5}
                                    className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                  />
                                  <NumericInput
                                    value={currentSettings.strokeOpacityRange?.[1] ?? 100}
                                    onChange={(value) => handleSettingsUpdate({ 
                                      strokeOpacityRange: [currentSettings.strokeOpacityRange?.[0] ?? 40, value] 
                                    })}
                                    min={0}
                                    max={100}
                                    step={5}
                                    className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                    data-testid="input-stroke-opacity-max"
                                  />
                                </div>
                              </div>
                            )}
      
                            {currentSettings.strokeOpacityMode === 'define' && (
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Opacity (%)</Label>
                                <BufferedSliderWithNumericInput
                                  value={currentSettings.strokeOpacityDefine ?? 80}
                                  onValueCommit={(value) => handleSettingsUpdate({ strokeOpacityDefine: value })}
                                  min={0}
                                  max={100}
                                  step={5}
                                  layout="inline"
                                  inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200"
                                  sliderClassName="flex-1 [&_[role=slider]]:bg-cyan-600"
                                />
                              </div>
                            )}
      
                            {currentSettings.strokeOpacityMode === 'incremental' && (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Start Value (%)</Label>
                                    <BufferedSliderWithNumericInput
                                      value={currentSettings.strokeOpacityStartValue ?? 100}
                                      onValueCommit={(value) => handleSettingsUpdate({ strokeOpacityStartValue: value })}
                                      min={0}
                                      max={100}
                                      step={5}
                                      layout="inline"
                                      inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                      sliderClassName="flex-1 [&_[role=slider]]:bg-cyan-600"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Increment (%/shape)</Label>
                                    <BufferedSliderWithNumericInput
                                      value={currentSettings.strokeOpacityIncrement ?? -5}
                                      onValueCommit={(value) => handleSettingsUpdate({ strokeOpacityIncrement: value })}
                                      min={-20}
                                      max={20}
                                      step={1}
                                      layout="inline"
                                      inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                      sliderClassName="flex-1 [&_[role=slider]]:bg-cyan-600"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={currentSettings.strokeOpacityModulationEnabled ?? false}
                                      onCheckedChange={(checked) => handleSettingsUpdate({ strokeOpacityModulationEnabled: checked as boolean })}
                                      className="border-slate-500 data-[state=checked]:bg-cyan-600"
                                      data-testid="checkbox-stroke-opacity-modulation"
                                    />
                                    <Label className="text-xs text-slate-300">Enable Modulation</Label>
                                  </div>
                                  {currentSettings.strokeOpacityModulationEnabled && (
                                    <div className="space-y-2 mt-2">
                                      <Label className="text-xs text-slate-400">Wrap at (%)</Label>
                                      <BufferedSliderWithNumericInput
                                        value={currentSettings.strokeOpacityModulationValue ?? 50}
                                        onValueCommit={(value) => handleSettingsUpdate({ strokeOpacityModulationValue: value })}
                                        min={10}
                                        max={100}
                                        step={5}
                                        layout="inline"
                                        inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                        sliderClassName="flex-1 [&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                  )}
                                </div>
                                <IndexDriverSelect
                                  value={currentSettings.strokeIncrementalIndexDriver}
                                  onChange={(value) => handleSettingsUpdate({ strokeIncrementalIndexDriver: value })}
                                  testId="select-stroke-opacity-index-driver"
                                />
                                <p className="text-xs text-slate-500">Progressive opacity with optional modulation wrap</p>
                              </div>
                            )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>

              {/* NEW Shape Transforms Section - Modern Styling */}
              <div className="space-y-3 border border-slate-600 rounded-lg p-3 bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      checked={currentSettings.transformsEnabled}
                      onCheckedChange={(checked) => handleSettingsUpdate({ transformsEnabled: checked as boolean })}
                      className="border-slate-500 data-[state=checked]:bg-blue-600"
                      data-testid="checkbox-new-transforms-enabled"
                    />
                    <Label className="text-sm font-medium text-slate-200">Shape Transforms</Label>
                  </div>
                  <span className="text-xs text-slate-400">
                    {currentSettings.transformsEnabled ? 'Translation, Rotation, Scale' : 'Disabled'}
                  </span>
                </div>
                
                {currentSettings.transformsEnabled && (
                  <div className="space-y-4 mt-3">
                    {/* Artboard-Aware Toggle */}
                    <div className="flex items-center space-x-2 p-2 bg-slate-700/50 rounded">
                      <Checkbox
                        checked={currentSettings.transformsArtboardAware}
                        onCheckedChange={(checked) => handleSettingsUpdate({ transformsArtboardAware: checked as boolean })}
                        className="border-slate-500 data-[state=checked]:bg-blue-600"
                        data-testid="checkbox-new-transforms-artboard-aware"
                      />
                      <Label className="text-xs text-slate-300">Use Artboard Bounds for Translate X/Y Ranges</Label>
                    </div>
                    
                    {/* Translation Subsection */}
                    <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                      <Label className="text-sm font-medium text-slate-200">Translation (X/Y Position)</Label>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* X Translation */}
                        <div className="space-y-3 p-2 bg-slate-800/50 rounded">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium text-slate-300">X Position</Label>
                            <Select value={currentSettings.xTransformMode} onValueChange={(value) => handleSettingsUpdate({ xTransformMode: value as any })}>
                              <SelectTrigger className="h-7 w-24 text-xs bg-slate-700 border-slate-600 text-slate-200" data-testid="select-new-x-transform-mode">
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
                          
                          {currentSettings.xTransformMode === 'value' && (
                            <div className="space-y-2">
                              <BufferedSliderWithNumericInput
                                value={currentSettings.xTransformValue}
                                onValueCommit={(value) => handleSettingsUpdate({ xTransformValue: value })}
                                min={-500}
                                max={500}
                                step={5}
                                layout="inline"
                                inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                              />
                              <p className="text-xs text-slate-500">Fixed X offset: {currentSettings.xTransformValue}px</p>
                            </div>
                          )}
                          
                          {currentSettings.xTransformMode === 'range' && (
                            <div className="space-y-2">
                              {/* Desktop: inline layout */}
                              <div className="hidden md:flex items-center gap-2">
                                <NumericInput
                                  value={currentSettings.translateXRange?.[0] ?? -50}
                                  onChange={(value) => handleSettingsUpdate({ translateXRange: [value, currentSettings.translateXRange?.[1] ?? 50] })}
                                  min={-500}
                                  max={500}
                                  step={5}
                                  className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  data-testid="input-new-x-range-min"
                                />
                                <Slider
                                  value={currentSettings.translateXRange || [-50, 50]}
                                  onValueChange={(value) => handleSettingsUpdate({ translateXRange: value as [number, number] })}
                                  min={-200}
                                  max={200}
                                  step={5}
                                  className="flex-1 [&_[role=slider]]:bg-blue-600"
                                />
                                <NumericInput
                                  value={currentSettings.translateXRange?.[1] ?? 50}
                                  onChange={(value) => handleSettingsUpdate({ translateXRange: [currentSettings.translateXRange?.[0] ?? -50, value] })}
                                  min={-500}
                                  max={500}
                                  step={5}
                                  className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  data-testid="input-new-x-range-max"
                                />
                              </div>
                              {/* Mobile: stacked layout */}
                              <div className="md:hidden space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Min</Label>
                                    <NumericInput
                                      value={currentSettings.translateXRange?.[0] ?? -50}
                                      onChange={(value) => handleSettingsUpdate({ translateXRange: [value, currentSettings.translateXRange?.[1] ?? 50] })}
                                      min={-500}
                                      max={500}
                                      step={5}
                                      className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Max</Label>
                                    <NumericInput
                                      value={currentSettings.translateXRange?.[1] ?? 50}
                                      onChange={(value) => handleSettingsUpdate({ translateXRange: [currentSettings.translateXRange?.[0] ?? -50, value] })}
                                      min={-500}
                                      max={500}
                                      step={5}
                                      className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    />
                                  </div>
                                </div>
                                <Slider
                                  value={currentSettings.translateXRange || [-50, 50]}
                                  onValueChange={(value) => handleSettingsUpdate({ translateXRange: value as [number, number] })}
                                  min={-200}
                                  max={200}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                              <p className="text-xs text-slate-500">Range: {currentSettings.translateXRange?.[0] ?? -50} to {currentSettings.translateXRange?.[1] ?? 50}px</p>
                            </div>
                          )}
                          
                          {currentSettings.xTransformMode === 'incremental' && (
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Start Value</Label>
                                <BufferedSliderWithNumericInput
                                  value={currentSettings.xTransformStartValue ?? 0}
                                  onValueCommit={(value) => handleSettingsUpdate({ xTransformStartValue: value })}
                                  min={-500}
                                  max={500}
                                  step={1}
                                  layout="inline"
                                  inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Increment</Label>
                                <BufferedSliderWithNumericInput
                                  value={currentSettings.xTransformIncrement}
                                  onValueCommit={(value) => handleSettingsUpdate({ xTransformIncrement: value })}
                                  min={-100}
                                  max={100}
                                  step={1}
                                  layout="inline"
                                  inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                              <div className="flex items-center space-x-2 p-2 bg-slate-700/50 rounded">
                                <Checkbox
                                  checked={currentSettings.xTransformModulationEnabled}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ xTransformModulationEnabled: checked as boolean })}
                                  className="border-slate-500 data-[state=checked]:bg-blue-600"
                                  data-testid="checkbox-new-x-modulation"
                                />
                                <Label className="text-xs text-slate-300">Enable Modulation</Label>
                              </div>
                              {currentSettings.xTransformModulationEnabled && (
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-400">Modulation Wrap</Label>
                                  <BufferedSliderWithNumericInput
                                    value={currentSettings.xTransformModulationValue}
                                    onValueCommit={(value) => handleSettingsUpdate({ xTransformModulationValue: value })}
                                    min={10}
                                    max={1000}
                                    step={10}
                                    layout="inline"
                                    inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                  />
                                </div>
                              )}
                              <IndexDriverSelect
                                value={currentSettings.setTransformIncrementalIndexDriver}
                                onChange={(value) => handleSettingsUpdate({ setTransformIncrementalIndexDriver: value })}
                                testId="select-x-transform-index-driver"
                              />
                            </div>
                          )}
                          
                          {currentSettings.xTransformMode === 'align' && (
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Shape Anchor</Label>
                                <div className="flex items-center gap-2">
                                  <Select value={currentSettings.xShapeAnchorMode} onValueChange={(value) => handleSettingsUpdate({ xShapeAnchorMode: value as any })}>
                                    <SelectTrigger className="h-7 flex-1 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="predefined" className="text-slate-200 hover:bg-slate-700">Predefined</SelectItem>
                                      <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {currentSettings.xShapeAnchorMode === 'predefined' && (
                                    <Select value={currentSettings.xShapeAnchorPredefined} onValueChange={(value) => handleSettingsUpdate({ xShapeAnchorPredefined: value as any })}>
                                      <SelectTrigger className="h-7 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                        <SelectItem value="left" className="text-slate-200 hover:bg-slate-700">Left</SelectItem>
                                        <SelectItem value="center" className="text-slate-200 hover:bg-slate-700">Center</SelectItem>
                                        <SelectItem value="right" className="text-slate-200 hover:bg-slate-700">Right</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                                {currentSettings.xShapeAnchorMode === 'define' && (
                                  <BufferedSliderWithNumericInput
                                    value={currentSettings.xShapeAnchorDefine}
                                    onValueCommit={(value) => handleSettingsUpdate({ xShapeAnchorDefine: value })}
                                    min={-500}
                                    max={500}
                                    step={10}
                                    layout="inline"
                                    inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    sliderClassName="flex-1 [&_[role=slider]]:bg-cyan-600"
                                  />
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Artboard Anchor</Label>
                                <div className="flex items-center gap-2">
                                  <Select value={currentSettings.xArtboardAnchorMode} onValueChange={(value) => handleSettingsUpdate({ xArtboardAnchorMode: value as any })}>
                                    <SelectTrigger className="h-7 flex-1 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="predefined" className="text-slate-200 hover:bg-slate-700">Predefined</SelectItem>
                                      <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {currentSettings.xArtboardAnchorMode === 'predefined' && (
                                    <Select value={currentSettings.xArtboardAnchorPredefined} onValueChange={(value) => handleSettingsUpdate({ xArtboardAnchorPredefined: value as any })}>
                                      <SelectTrigger className="h-7 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                        <SelectItem value="left" className="text-slate-200 hover:bg-slate-700">Left</SelectItem>
                                        <SelectItem value="center" className="text-slate-200 hover:bg-slate-700">Center</SelectItem>
                                        <SelectItem value="right" className="text-slate-200 hover:bg-slate-700">Right</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                                {currentSettings.xArtboardAnchorMode === 'define' && (
                                  <BufferedSliderWithNumericInput
                                    value={currentSettings.xArtboardAnchorDefine}
                                    onValueCommit={(value) => handleSettingsUpdate({ xArtboardAnchorDefine: value })}
                                    min={-500}
                                    max={500}
                                    step={10}
                                    layout="inline"
                                    inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    sliderClassName="flex-1 [&_[role=slider]]:bg-cyan-600"
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Y Translation */}
                        <div className="space-y-3 p-2 bg-slate-800/50 rounded">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium text-slate-300">Y Position</Label>
                            <Select value={currentSettings.yTransformMode} onValueChange={(value) => handleSettingsUpdate({ yTransformMode: value as any })}>
                              <SelectTrigger className="h-7 w-24 text-xs bg-slate-700 border-slate-600 text-slate-200" data-testid="select-new-y-transform-mode">
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
                          
                          {currentSettings.yTransformMode === 'value' && (
                            <div className="space-y-2">
                              <BufferedSliderWithNumericInput
                                value={currentSettings.yTransformValue}
                                onValueCommit={(value) => handleSettingsUpdate({ yTransformValue: value })}
                                min={-500}
                                max={500}
                                step={5}
                                layout="inline"
                                inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                              />
                              <p className="text-xs text-slate-500">Fixed Y offset: {currentSettings.yTransformValue}px</p>
                            </div>
                          )}
                          
                          {currentSettings.yTransformMode === 'range' && (
                            <div className="space-y-2">
                              {/* Desktop: inline layout */}
                              <div className="hidden md:flex items-center gap-2">
                                <NumericInput
                                  value={currentSettings.translateYRange?.[0] ?? -50}
                                  onChange={(value) => handleSettingsUpdate({ translateYRange: [value, currentSettings.translateYRange?.[1] ?? 50] })}
                                  min={-500}
                                  max={500}
                                  step={5}
                                  className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  data-testid="input-new-y-range-min"
                                />
                                <Slider
                                  value={currentSettings.translateYRange || [-50, 50]}
                                  onValueChange={(value) => handleSettingsUpdate({ translateYRange: value as [number, number] })}
                                  min={-200}
                                  max={200}
                                  step={5}
                                  className="flex-1 [&_[role=slider]]:bg-blue-600"
                                />
                                <NumericInput
                                  value={currentSettings.translateYRange?.[1] ?? 50}
                                  onChange={(value) => handleSettingsUpdate({ translateYRange: [currentSettings.translateYRange?.[0] ?? -50, value] })}
                                  min={-500}
                                  max={500}
                                  step={5}
                                  className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  data-testid="input-new-y-range-max"
                                />
                              </div>
                              {/* Mobile: stacked layout */}
                              <div className="md:hidden space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Min</Label>
                                    <NumericInput
                                      value={currentSettings.translateYRange?.[0] ?? -50}
                                      onChange={(value) => handleSettingsUpdate({ translateYRange: [value, currentSettings.translateYRange?.[1] ?? 50] })}
                                      min={-500}
                                      max={500}
                                      step={5}
                                      className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Max</Label>
                                    <NumericInput
                                      value={currentSettings.translateYRange?.[1] ?? 50}
                                      onChange={(value) => handleSettingsUpdate({ translateYRange: [currentSettings.translateYRange?.[0] ?? -50, value] })}
                                      min={-500}
                                      max={500}
                                      step={5}
                                      className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    />
                                  </div>
                                </div>
                                <Slider
                                  value={currentSettings.translateYRange || [-50, 50]}
                                  onValueChange={(value) => handleSettingsUpdate({ translateYRange: value as [number, number] })}
                                  min={-200}
                                  max={200}
                                  step={5}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                              <p className="text-xs text-slate-500">Range: {currentSettings.translateYRange?.[0] ?? -50} to {currentSettings.translateYRange?.[1] ?? 50}px</p>
                            </div>
                          )}
                          
                          {currentSettings.yTransformMode === 'incremental' && (
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Start Value</Label>
                                <BufferedSliderWithNumericInput
                                  value={currentSettings.yTransformStartValue ?? 0}
                                  onValueCommit={(value) => handleSettingsUpdate({ yTransformStartValue: value })}
                                  min={-500}
                                  max={500}
                                  step={1}
                                  layout="inline"
                                  inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Increment</Label>
                                <BufferedSliderWithNumericInput
                                  value={currentSettings.yTransformIncrement}
                                  onValueCommit={(value) => handleSettingsUpdate({ yTransformIncrement: value })}
                                  min={-100}
                                  max={100}
                                  step={1}
                                  layout="inline"
                                  inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                />
                              </div>
                              <div className="flex items-center space-x-2 p-2 bg-slate-700/50 rounded">
                                <Checkbox
                                  checked={currentSettings.yTransformModulationEnabled}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ yTransformModulationEnabled: checked as boolean })}
                                  className="border-slate-500 data-[state=checked]:bg-blue-600"
                                  data-testid="checkbox-new-y-modulation"
                                />
                                <Label className="text-xs text-slate-300">Enable Modulation</Label>
                              </div>
                              {currentSettings.yTransformModulationEnabled && (
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-400">Modulation Wrap</Label>
                                  <BufferedSliderWithNumericInput
                                    value={currentSettings.yTransformModulationValue}
                                    onValueCommit={(value) => handleSettingsUpdate({ yTransformModulationValue: value })}
                                    min={10}
                                    max={1000}
                                    step={10}
                                    layout="inline"
                                    inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    sliderClassName="flex-1 [&_[role=slider]]:bg-blue-600"
                                  />
                                </div>
                              )}
                              <IndexDriverSelect
                                value={currentSettings.setTransformIncrementalIndexDriver}
                                onChange={(value) => handleSettingsUpdate({ setTransformIncrementalIndexDriver: value })}
                                testId="select-y-transform-index-driver"
                              />
                            </div>
                          )}
                          
                          {currentSettings.yTransformMode === 'align' && (
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Shape Anchor</Label>
                                <div className="flex items-center gap-2">
                                  <Select value={currentSettings.yShapeAnchorMode} onValueChange={(value) => handleSettingsUpdate({ yShapeAnchorMode: value as any })}>
                                    <SelectTrigger className="h-7 flex-1 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="predefined" className="text-slate-200 hover:bg-slate-700">Predefined</SelectItem>
                                      <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {currentSettings.yShapeAnchorMode === 'predefined' && (
                                    <Select value={currentSettings.yShapeAnchorPredefined} onValueChange={(value) => handleSettingsUpdate({ yShapeAnchorPredefined: value as any })}>
                                      <SelectTrigger className="h-7 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                        <SelectItem value="top" className="text-slate-200 hover:bg-slate-700">Top</SelectItem>
                                        <SelectItem value="center" className="text-slate-200 hover:bg-slate-700">Center</SelectItem>
                                        <SelectItem value="bottom" className="text-slate-200 hover:bg-slate-700">Bottom</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                                {currentSettings.yShapeAnchorMode === 'define' && (
                                  <BufferedSliderWithNumericInput
                                    value={currentSettings.yShapeAnchorDefine}
                                    onValueCommit={(value) => handleSettingsUpdate({ yShapeAnchorDefine: value })}
                                    min={-500}
                                    max={500}
                                    step={10}
                                    layout="inline"
                                    inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    sliderClassName="flex-1 [&_[role=slider]]:bg-cyan-600"
                                  />
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Artboard Anchor</Label>
                                <div className="flex items-center gap-2">
                                  <Select value={currentSettings.yArtboardAnchorMode} onValueChange={(value) => handleSettingsUpdate({ yArtboardAnchorMode: value as any })}>
                                    <SelectTrigger className="h-7 flex-1 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                      <SelectItem value="predefined" className="text-slate-200 hover:bg-slate-700">Predefined</SelectItem>
                                      <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {currentSettings.yArtboardAnchorMode === 'predefined' && (
                                    <Select value={currentSettings.yArtboardAnchorPredefined} onValueChange={(value) => handleSettingsUpdate({ yArtboardAnchorPredefined: value as any })}>
                                      <SelectTrigger className="h-7 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                        <SelectItem value="top" className="text-slate-200 hover:bg-slate-700">Top</SelectItem>
                                        <SelectItem value="center" className="text-slate-200 hover:bg-slate-700">Center</SelectItem>
                                        <SelectItem value="bottom" className="text-slate-200 hover:bg-slate-700">Bottom</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                                {currentSettings.yArtboardAnchorMode === 'define' && (
                                  <BufferedSliderWithNumericInput
                                    value={currentSettings.yArtboardAnchorDefine}
                                    onValueCommit={(value) => handleSettingsUpdate({ yArtboardAnchorDefine: value })}
                                    min={-500}
                                    max={500}
                                    step={10}
                                    layout="inline"
                                    inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    sliderClassName="flex-1 [&_[role=slider]]:bg-cyan-600"
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Scaling Subsection */}
                    <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-slate-200">Scale</Label>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            checked={currentSettings.maintainScaleAspectRatio}
                            onCheckedChange={(checked) => {
                              handleSettingsUpdate({ maintainScaleAspectRatio: checked as boolean });
                              if (checked) {
                                handleSettingsUpdate({ 
                                  scaleYMode: currentSettings.scaleXMode,
                                  scaleYValue: currentSettings.scaleXValue,
                                  scaleYIncrement: currentSettings.scaleXIncrement
                                });
                              }
                            }}
                            className="border-slate-500 data-[state=checked]:bg-green-600"
                            data-testid="checkbox-new-link-scale"
                          />
                          <Label className="text-xs text-slate-300">Link X/Y</Label>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Scale X */}
                        <div className="space-y-3 p-2 bg-slate-800/50 rounded">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium text-slate-300">Scale X</Label>
                            <Select 
                              value={currentSettings.scaleXMode} 
                              onValueChange={(value) => {
                                handleSettingsUpdate({ scaleXMode: value as any });
                                if (currentSettings.maintainScaleAspectRatio) {
                                  handleSettingsUpdate({ scaleYMode: value as any });
                                }
                              }}
                            >
                              <SelectTrigger className="h-7 w-24 text-xs bg-slate-700 border-slate-600 text-slate-200" data-testid="select-new-scale-x-mode">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                <SelectItem value="value" className="text-slate-200 hover:bg-slate-700">Value</SelectItem>
                                <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {currentSettings.scaleXMode === 'value' && (
                            <div className="space-y-2">
                              <BufferedSliderWithNumericInput
                                value={currentSettings.scaleXValue}
                                onValueCommit={(value) => {
                                  handleSettingsUpdate({ scaleXValue: value });
                                  if (currentSettings.maintainScaleAspectRatio) {
                                    handleSettingsUpdate({ scaleYValue: value });
                                  }
                                }}
                                min={1}
                                max={500}
                                step={5}
                                layout="inline"
                                inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                sliderClassName="flex-1 [&_[role=slider]]:bg-green-600"
                              />
                              <p className="text-xs text-slate-500">Scale: {currentSettings.scaleXValue}%</p>
                            </div>
                          )}
                          
                          {currentSettings.scaleXMode === 'range' && (
                            <div className="space-y-2">
                              <div className="hidden md:flex items-center gap-2">
                                <NumericInput
                                  value={currentSettings.scaleXRange?.[0] ?? 50}
                                  onChange={(value) => {
                                    handleSettingsUpdate({ scaleXRange: [value, currentSettings.scaleXRange?.[1] ?? 200] });
                                    if (currentSettings.maintainScaleAspectRatio) {
                                      handleSettingsUpdate({ scaleYRange: [value, currentSettings.scaleYRange?.[1] ?? 200] });
                                    }
                                  }}
                                  min={1}
                                  max={500}
                                  step={5}
                                  className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  data-testid="input-new-scale-x-min"
                                />
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
                                  className="flex-1 [&_[role=slider]]:bg-green-600"
                                />
                                <NumericInput
                                  value={currentSettings.scaleXRange?.[1] ?? 200}
                                  onChange={(value) => {
                                    handleSettingsUpdate({ scaleXRange: [currentSettings.scaleXRange?.[0] ?? 50, value] });
                                    if (currentSettings.maintainScaleAspectRatio) {
                                      handleSettingsUpdate({ scaleYRange: [currentSettings.scaleYRange?.[0] ?? 50, value] });
                                    }
                                  }}
                                  min={1}
                                  max={500}
                                  step={5}
                                  className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  data-testid="input-new-scale-x-max"
                                />
                              </div>
                              <div className="md:hidden space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Min %</Label>
                                    <NumericInput
                                      value={currentSettings.scaleXRange?.[0] ?? 50}
                                      onChange={(value) => {
                                        handleSettingsUpdate({ scaleXRange: [value, currentSettings.scaleXRange?.[1] ?? 200] });
                                        if (currentSettings.maintainScaleAspectRatio) {
                                          handleSettingsUpdate({ scaleYRange: [value, currentSettings.scaleYRange?.[1] ?? 200] });
                                        }
                                      }}
                                      min={1}
                                      max={500}
                                      step={5}
                                      className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Max %</Label>
                                    <NumericInput
                                      value={currentSettings.scaleXRange?.[1] ?? 200}
                                      onChange={(value) => {
                                        handleSettingsUpdate({ scaleXRange: [currentSettings.scaleXRange?.[0] ?? 50, value] });
                                        if (currentSettings.maintainScaleAspectRatio) {
                                          handleSettingsUpdate({ scaleYRange: [currentSettings.scaleYRange?.[0] ?? 50, value] });
                                        }
                                      }}
                                      min={1}
                                      max={500}
                                      step={5}
                                      className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    />
                                  </div>
                                </div>
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
                              <p className="text-xs text-slate-500">Range: {currentSettings.scaleXRange?.[0] ?? 50}% to {currentSettings.scaleXRange?.[1] ?? 200}%</p>
                            </div>
                          )}
                          
                          {currentSettings.scaleXMode === 'incremental' && (
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Start %</Label>
                                <BufferedSliderWithNumericInput
                                  value={currentSettings.scaleXStartValue ?? 100}
                                  onValueCommit={(value) => {
                                    handleSettingsUpdate({ scaleXStartValue: value });
                                    if (currentSettings.maintainScaleAspectRatio) {
                                      handleSettingsUpdate({ scaleYStartValue: value });
                                    }
                                  }}
                                  min={0}
                                  max={300}
                                  step={1}
                                  layout="inline"
                                  inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  sliderClassName="flex-1 [&_[role=slider]]:bg-green-600"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Increment %</Label>
                                <BufferedSliderWithNumericInput
                                  value={currentSettings.scaleXIncrement}
                                  onValueCommit={(value) => {
                                    handleSettingsUpdate({ scaleXIncrement: value });
                                    if (currentSettings.maintainScaleAspectRatio) {
                                      handleSettingsUpdate({ scaleYIncrement: value });
                                    }
                                  }}
                                  min={-100}
                                  max={100}
                                  step={1}
                                  layout="inline"
                                  inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  sliderClassName="flex-1 [&_[role=slider]]:bg-green-600"
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={currentSettings.scaleXModulationEnabled ?? false}
                                  onCheckedChange={(checked) => {
                                    handleSettingsUpdate({ scaleXModulationEnabled: checked as boolean });
                                    if (currentSettings.maintainScaleAspectRatio) {
                                      handleSettingsUpdate({ scaleYModulationEnabled: checked as boolean });
                                    }
                                  }}
                                  className="border-slate-500 data-[state=checked]:bg-green-600"
                                  data-testid="checkbox-scale-x-modulation"
                                />
                                <Label className="text-xs text-slate-400">Enable Modulation</Label>
                              </div>
                              {currentSettings.scaleXModulationEnabled && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Wrap at (%)</Label>
                                  <BufferedSliderWithNumericInput
                                    value={currentSettings.scaleXModulationValue ?? 100}
                                    onValueCommit={(value) => {
                                      handleSettingsUpdate({ scaleXModulationValue: value });
                                      if (currentSettings.maintainScaleAspectRatio) {
                                        handleSettingsUpdate({ scaleYModulationValue: value });
                                      }
                                    }}
                                    min={10}
                                    max={500}
                                    step={10}
                                    layout="inline"
                                    inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                    sliderClassName="flex-1 [&_[role=slider]]:bg-green-600"
                                  />
                                </div>
                              )}
                              <IndexDriverSelect
                                value={currentSettings.setTransformIncrementalIndexDriver}
                                onChange={(value) => handleSettingsUpdate({ setTransformIncrementalIndexDriver: value })}
                                testId="select-scale-x-index-driver"
                              />
                            </div>
                          )}
                        </div>
                        
                        {/* Scale Y */}
                        <div className={`space-y-3 p-2 bg-slate-800/50 rounded ${currentSettings.maintainScaleAspectRatio ? 'opacity-50' : ''}`}>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium text-slate-300">Scale Y</Label>
                            <Select 
                              value={currentSettings.scaleYMode} 
                              onValueChange={(value) => handleSettingsUpdate({ scaleYMode: value as any })}
                              disabled={currentSettings.maintainScaleAspectRatio}
                            >
                              <SelectTrigger className="h-7 w-24 text-xs bg-slate-700 border-slate-600 text-slate-200" data-testid="select-new-scale-y-mode">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                <SelectItem value="value" className="text-slate-200 hover:bg-slate-700">Value</SelectItem>
                                <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {currentSettings.scaleYMode === 'value' && (
                            <div className="space-y-2">
                              <BufferedSliderWithNumericInput
                                value={currentSettings.scaleYValue}
                                onValueCommit={(value) => handleSettingsUpdate({ scaleYValue: value })}
                                min={1}
                                max={500}
                                step={5}
                                layout="inline"
                                inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                sliderClassName="flex-1 [&_[role=slider]]:bg-green-600"
                                disabled={currentSettings.maintainScaleAspectRatio}
                              />
                              <p className="text-xs text-slate-500">Scale: {currentSettings.scaleYValue}%</p>
                            </div>
                          )}
                          
                          {currentSettings.scaleYMode === 'range' && (
                            <div className="space-y-2">
                              <div className="hidden md:flex items-center gap-2">
                                <NumericInput
                                  value={currentSettings.scaleYRange?.[0] ?? 50}
                                  onChange={(value) => handleSettingsUpdate({ scaleYRange: [value, currentSettings.scaleYRange?.[1] ?? 200] })}
                                  min={1}
                                  max={500}
                                  step={5}
                                  className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  disabled={currentSettings.maintainScaleAspectRatio}
                                  data-testid="input-new-scale-y-min"
                                />
                                <Slider
                                  value={currentSettings.scaleYRange || [50, 200]}
                                  onValueChange={(value) => handleSettingsUpdate({ scaleYRange: value as [number, number] })}
                                  min={10}
                                  max={300}
                                  step={5}
                                  className="flex-1 [&_[role=slider]]:bg-green-600"
                                  disabled={currentSettings.maintainScaleAspectRatio}
                                />
                                <NumericInput
                                  value={currentSettings.scaleYRange?.[1] ?? 200}
                                  onChange={(value) => handleSettingsUpdate({ scaleYRange: [currentSettings.scaleYRange?.[0] ?? 50, value] })}
                                  min={1}
                                  max={500}
                                  step={5}
                                  className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  disabled={currentSettings.maintainScaleAspectRatio}
                                  data-testid="input-new-scale-y-max"
                                />
                              </div>
                              <div className="md:hidden space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Min %</Label>
                                    <NumericInput
                                      value={currentSettings.scaleYRange?.[0] ?? 50}
                                      onChange={(value) => handleSettingsUpdate({ scaleYRange: [value, currentSettings.scaleYRange?.[1] ?? 200] })}
                                      min={1}
                                      max={500}
                                      step={5}
                                      className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      disabled={currentSettings.maintainScaleAspectRatio}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Max %</Label>
                                    <NumericInput
                                      value={currentSettings.scaleYRange?.[1] ?? 200}
                                      onChange={(value) => handleSettingsUpdate({ scaleYRange: [currentSettings.scaleYRange?.[0] ?? 50, value] })}
                                      min={1}
                                      max={500}
                                      step={5}
                                      className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      disabled={currentSettings.maintainScaleAspectRatio}
                                    />
                                  </div>
                                </div>
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
                              <p className="text-xs text-slate-500">Range: {currentSettings.scaleYRange?.[0] ?? 50}% to {currentSettings.scaleYRange?.[1] ?? 200}%</p>
                            </div>
                          )}
                          
                          {currentSettings.scaleYMode === 'incremental' && (
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Start %</Label>
                                <BufferedSliderWithNumericInput
                                  value={currentSettings.scaleYStartValue ?? 100}
                                  onValueCommit={(value) => handleSettingsUpdate({ scaleYStartValue: value })}
                                  min={0}
                                  max={300}
                                  step={1}
                                  layout="inline"
                                  inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  sliderClassName="flex-1 [&_[role=slider]]:bg-green-600"
                                  disabled={currentSettings.maintainScaleAspectRatio}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Increment %</Label>
                                <BufferedSliderWithNumericInput
                                  value={currentSettings.scaleYIncrement}
                                  onValueCommit={(value) => handleSettingsUpdate({ scaleYIncrement: value })}
                                  min={-100}
                                  max={100}
                                  step={1}
                                  layout="inline"
                                  inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  sliderClassName="flex-1 [&_[role=slider]]:bg-green-600"
                                  disabled={currentSettings.maintainScaleAspectRatio}
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={currentSettings.scaleYModulationEnabled ?? false}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ scaleYModulationEnabled: checked as boolean })}
                                  className="border-slate-500 data-[state=checked]:bg-green-600"
                                  disabled={currentSettings.maintainScaleAspectRatio}
                                  data-testid="checkbox-scale-y-modulation"
                                />
                                <Label className="text-xs text-slate-400">Enable Modulation</Label>
                              </div>
                              {currentSettings.scaleYModulationEnabled && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Wrap at (%)</Label>
                                  <BufferedSliderWithNumericInput
                                    value={currentSettings.scaleYModulationValue ?? 100}
                                    onValueCommit={(value) => handleSettingsUpdate({ scaleYModulationValue: value })}
                                    min={10}
                                    max={500}
                                    step={10}
                                    layout="inline"
                                    inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200"
                                    sliderClassName="flex-1 [&_[role=slider]]:bg-green-600"
                                    disabled={currentSettings.maintainScaleAspectRatio}
                                  />
                                </div>
                              )}
                              <IndexDriverSelect
                                value={currentSettings.setTransformIncrementalIndexDriver}
                                onChange={(value) => handleSettingsUpdate({ setTransformIncrementalIndexDriver: value })}
                                testId="select-scale-y-index-driver"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Rotation Subsection */}
                    <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-slate-200">Rotation</Label>
                        <Select value={currentSettings.rotationMode} onValueChange={(value) => handleSettingsUpdate({ rotationMode: value as any })}>
                          <SelectTrigger className="h-7 w-24 text-xs bg-slate-700 border-slate-600 text-slate-200" data-testid="select-new-rotation-mode">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                            <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                            <SelectItem value="value" className="text-slate-200 hover:bg-slate-700">Value</SelectItem>
                            <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {currentSettings.rotationMode === 'value' && (
                        <div className="space-y-2">
                          <BufferedSliderWithNumericInput
                            value={currentSettings.rotationValue}
                            onValueCommit={(value) => handleSettingsUpdate({ rotationValue: value })}
                            min={0}
                            max={360}
                            step={5}
                            layout="inline"
                            inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                            sliderClassName="flex-1 [&_[role=slider]]:bg-orange-600"
                          />
                          <p className="text-xs text-slate-500">Fixed rotation: {currentSettings.rotationValue}°</p>
                        </div>
                      )}
                      
                      {currentSettings.rotationMode === 'range' && (
                        <div className="space-y-2">
                          <div className="hidden md:flex items-center gap-2">
                            <NumericInput
                              value={currentSettings.rotationRange?.[0] ?? 0}
                              onChange={(value) => handleSettingsUpdate({ rotationRange: [value, currentSettings.rotationRange?.[1] ?? 360] })}
                              min={0}
                              max={360}
                              step={5}
                              className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                              data-testid="input-new-rotation-min"
                            />
                            <Slider
                              value={currentSettings.rotationRange || [0, 360]}
                              onValueChange={(value) => handleSettingsUpdate({ rotationRange: value as [number, number] })}
                              min={0}
                              max={360}
                              step={5}
                              className="flex-1 [&_[role=slider]]:bg-orange-600"
                            />
                            <NumericInput
                              value={currentSettings.rotationRange?.[1] ?? 360}
                              onChange={(value) => handleSettingsUpdate({ rotationRange: [currentSettings.rotationRange?.[0] ?? 0, value] })}
                              min={0}
                              max={360}
                              step={5}
                              className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                              data-testid="input-new-rotation-max"
                            />
                          </div>
                          <div className="md:hidden space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-400">Min °</Label>
                                <NumericInput
                                  value={currentSettings.rotationRange?.[0] ?? 0}
                                  onChange={(value) => handleSettingsUpdate({ rotationRange: [value, currentSettings.rotationRange?.[1] ?? 360] })}
                                  min={0}
                                  max={360}
                                  step={5}
                                  className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-400">Max °</Label>
                                <NumericInput
                                  value={currentSettings.rotationRange?.[1] ?? 360}
                                  onChange={(value) => handleSettingsUpdate({ rotationRange: [currentSettings.rotationRange?.[0] ?? 0, value] })}
                                  min={0}
                                  max={360}
                                  step={5}
                                  className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                />
                              </div>
                            </div>
                            <Slider
                              value={currentSettings.rotationRange || [0, 360]}
                              onValueChange={(value) => handleSettingsUpdate({ rotationRange: value as [number, number] })}
                              min={0}
                              max={360}
                              step={5}
                              className="[&_[role=slider]]:bg-orange-600"
                            />
                          </div>
                          <p className="text-xs text-slate-500">Range: {currentSettings.rotationRange?.[0] ?? 0}° to {currentSettings.rotationRange?.[1] ?? 360}°</p>
                        </div>
                      )}
                      
                      {currentSettings.rotationMode === 'incremental' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-400">Start °</Label>
                              <BufferedSliderWithNumericInput
                                value={currentSettings.rotationStartValue ?? 0}
                                onValueCommit={(value) => handleSettingsUpdate({ rotationStartValue: value })}
                                min={0}
                                max={360}
                                step={1}
                                layout="inline"
                                inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                sliderClassName="flex-1 [&_[role=slider]]:bg-orange-600"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-400">Step Size °</Label>
                              <BufferedSliderWithNumericInput
                                value={currentSettings.rotationIncrementStep}
                                onValueCommit={(value) => handleSettingsUpdate({ rotationIncrementStep: value })}
                                min={1}
                                max={90}
                                step={1}
                                layout="inline"
                                inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                sliderClassName="flex-1 [&_[role=slider]]:bg-orange-600"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-400">Increment °</Label>
                              <BufferedSliderWithNumericInput
                                value={currentSettings.rotationIncrement}
                                onValueCommit={(value) => handleSettingsUpdate({ rotationIncrement: value })}
                                min={-180}
                                max={180}
                                step={currentSettings.rotationIncrementStep}
                                layout="inline"
                                inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                sliderClassName="flex-1 [&_[role=slider]]:bg-orange-600"
                              />
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 p-2 bg-slate-700/50 rounded">
                            <Checkbox 
                              checked={currentSettings.rotationModulationEnabled}
                              onCheckedChange={(checked) => handleSettingsUpdate({ rotationModulationEnabled: checked as boolean })}
                              className="border-slate-500 data-[state=checked]:bg-orange-600"
                              data-testid="checkbox-new-rotation-modulation"
                            />
                            <Label className="text-xs text-slate-300">Enable Modulation</Label>
                          </div>
                          {currentSettings.rotationModulationEnabled && (
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-400">Modulation Wrap °</Label>
                              <BufferedSliderWithNumericInput
                                value={currentSettings.rotationModulation}
                                onValueCommit={(value) => handleSettingsUpdate({ rotationModulation: value })}
                                min={90}
                                max={720}
                                step={30}
                                layout="inline"
                                inputClassName="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                sliderClassName="flex-1 [&_[role=slider]]:bg-orange-600"
                              />
                            </div>
                          )}
                          <IndexDriverSelect
                            value={currentSettings.setTransformIncrementalIndexDriver}
                            onChange={(value) => handleSettingsUpdate({ setTransformIncrementalIndexDriver: value })}
                            testId="select-rotation-index-driver"
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Transform Randomization Scaling Subsection */}
                    <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                      <Label className="text-sm font-medium text-slate-200">Randomization Scaling</Label>
                      <p className="text-xs text-slate-400">Control how much additional randomization is applied</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-300">Scale Randomization</Label>
                          <BufferedSliderWithNumericInput
                            value={currentSettings.scaleRandomizationScale}
                            onValueCommit={(value) => handleSettingsUpdate({ scaleRandomizationScale: value })}
                            min={0}
                            max={100}
                            step={5}
                            layout="inline"
                            inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                            sliderClassName="flex-1 [&_[role=slider]]:bg-purple-600"
                          />
                          <p className="text-xs text-slate-500">{currentSettings.scaleRandomizationScale}%</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-300">Rotation Randomization</Label>
                          <BufferedSliderWithNumericInput
                            value={currentSettings.rotationRandomizationScale}
                            onValueCommit={(value) => handleSettingsUpdate({ rotationRandomizationScale: value })}
                            min={0}
                            max={100}
                            step={5}
                            layout="inline"
                            inputClassName="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                            sliderClassName="flex-1 [&_[role=slider]]:bg-purple-600"
                          />
                          <p className="text-xs text-slate-500">{currentSettings.rotationRandomizationScale}%</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Transform Origin Subsection */}
                    <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium text-slate-200">Transform Origin</Label>
                          <p className="text-xs text-slate-400">Point from which transforms are applied</p>
                        </div>
                        <Select 
                          value={currentSettings.transformOriginMode} 
                          onValueChange={(value) => handleSettingsUpdate({ transformOriginMode: value as any })}
                        >
                          <SelectTrigger className="h-7 w-32 text-xs bg-slate-700 border-slate-600 text-slate-200" data-testid="select-new-transform-origin-mode">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                            <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define (X, Y)</SelectItem>
                            <SelectItem value="predefined-artboard" className="text-slate-200 hover:bg-slate-700">Artboard</SelectItem>
                            <SelectItem value="shape-reference" className="text-slate-200 hover:bg-slate-700">Shape Reference</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {currentSettings.transformOriginMode === 'define' && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-slate-300">Sub-mode:</Label>
                            <Select 
                              value={currentSettings.transformOriginDefineMode} 
                              onValueChange={(value) => handleSettingsUpdate({ transformOriginDefineMode: value as any })}
                            >
                              <SelectTrigger className="h-7 w-28 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="fixed" className="text-slate-200 hover:bg-slate-700">Fixed</SelectItem>
                                <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range</SelectItem>
                                <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {currentSettings.transformOriginDefineMode === 'fixed' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">X</Label>
                                <div className="flex items-center gap-2">
                                  <NumericInput
                                    value={currentSettings.transformOriginX}
                                    onChange={(value) => handleSettingsUpdate({ transformOriginX: value })}
                                    min={-500}
                                    max={500}
                                    step={10}
                                    className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    data-testid="input-new-origin-x"
                                  />
                                  <Slider
                                    value={[currentSettings.transformOriginX]}
                                    onValueChange={([value]) => handleSettingsUpdate({ transformOriginX: value })}
                                    min={-500}
                                    max={500}
                                    step={10}
                                    className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Y</Label>
                                <div className="flex items-center gap-2">
                                  <NumericInput
                                    value={currentSettings.transformOriginY}
                                    onChange={(value) => handleSettingsUpdate({ transformOriginY: value })}
                                    min={-500}
                                    max={500}
                                    step={10}
                                    className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    data-testid="input-new-origin-y"
                                  />
                                  <Slider
                                    value={[currentSettings.transformOriginY]}
                                    onValueChange={([value]) => handleSettingsUpdate({ transformOriginY: value })}
                                    min={-500}
                                    max={500}
                                    step={10}
                                    className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {currentSettings.transformOriginDefineMode === 'range' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* X Range */}
                              <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                                <Label className="text-xs font-medium text-slate-300">X Range</Label>
                                <div className="hidden md:flex items-center gap-2">
                                  <NumericInput
                                    value={currentSettings.transformOriginXMin}
                                    onChange={(value) => handleSettingsUpdate({ transformOriginXMin: value })}
                                    min={-500}
                                    max={500}
                                    step={10}
                                    className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    data-testid="input-new-origin-x-min"
                                  />
                                  <Slider
                                    value={[currentSettings.transformOriginXMin, currentSettings.transformOriginXMax]}
                                    onValueChange={([min, max]) => handleSettingsUpdate({ transformOriginXMin: min, transformOriginXMax: max })}
                                    min={-500}
                                    max={500}
                                    step={10}
                                    className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                  />
                                  <NumericInput
                                    value={currentSettings.transformOriginXMax}
                                    onChange={(value) => handleSettingsUpdate({ transformOriginXMax: value })}
                                    min={-500}
                                    max={500}
                                    step={10}
                                    className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    data-testid="input-new-origin-x-max"
                                  />
                                </div>
                                <div className="md:hidden space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Min</Label>
                                      <NumericInput
                                        value={currentSettings.transformOriginXMin}
                                        onChange={(value) => handleSettingsUpdate({ transformOriginXMin: value })}
                                        min={-500}
                                        max={500}
                                        step={10}
                                        className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Max</Label>
                                      <NumericInput
                                        value={currentSettings.transformOriginXMax}
                                        onChange={(value) => handleSettingsUpdate({ transformOriginXMax: value })}
                                        min={-500}
                                        max={500}
                                        step={10}
                                        className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      />
                                    </div>
                                  </div>
                                  <Slider
                                    value={[currentSettings.transformOriginXMin, currentSettings.transformOriginXMax]}
                                    onValueChange={([min, max]) => handleSettingsUpdate({ transformOriginXMin: min, transformOriginXMax: max })}
                                    min={-500}
                                    max={500}
                                    step={10}
                                    className="[&_[role=slider]]:bg-cyan-600"
                                  />
                                </div>
                                <p className="text-xs text-slate-500">Range: {currentSettings.transformOriginXMin} to {currentSettings.transformOriginXMax}</p>
                              </div>
                              
                              {/* Y Range */}
                              <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                                <Label className="text-xs font-medium text-slate-300">Y Range</Label>
                                <div className="hidden md:flex items-center gap-2">
                                  <NumericInput
                                    value={currentSettings.transformOriginYMin}
                                    onChange={(value) => handleSettingsUpdate({ transformOriginYMin: value })}
                                    min={-500}
                                    max={500}
                                    step={10}
                                    className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    data-testid="input-new-origin-y-min"
                                  />
                                  <Slider
                                    value={[currentSettings.transformOriginYMin, currentSettings.transformOriginYMax]}
                                    onValueChange={([min, max]) => handleSettingsUpdate({ transformOriginYMin: min, transformOriginYMax: max })}
                                    min={-500}
                                    max={500}
                                    step={10}
                                    className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                  />
                                  <NumericInput
                                    value={currentSettings.transformOriginYMax}
                                    onChange={(value) => handleSettingsUpdate({ transformOriginYMax: value })}
                                    min={-500}
                                    max={500}
                                    step={10}
                                    className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    data-testid="input-new-origin-y-max"
                                  />
                                </div>
                                <div className="md:hidden space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Min</Label>
                                      <NumericInput
                                        value={currentSettings.transformOriginYMin}
                                        onChange={(value) => handleSettingsUpdate({ transformOriginYMin: value })}
                                        min={-500}
                                        max={500}
                                        step={10}
                                        className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Max</Label>
                                      <NumericInput
                                        value={currentSettings.transformOriginYMax}
                                        onChange={(value) => handleSettingsUpdate({ transformOriginYMax: value })}
                                        min={-500}
                                        max={500}
                                        step={10}
                                        className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      />
                                    </div>
                                  </div>
                                  <Slider
                                    value={[currentSettings.transformOriginYMin, currentSettings.transformOriginYMax]}
                                    onValueChange={([min, max]) => handleSettingsUpdate({ transformOriginYMin: min, transformOriginYMax: max })}
                                    min={-500}
                                    max={500}
                                    step={10}
                                    className="[&_[role=slider]]:bg-cyan-600"
                                  />
                                </div>
                                <p className="text-xs text-slate-500">Range: {currentSettings.transformOriginYMin} to {currentSettings.transformOriginYMax}</p>
                              </div>
                            </div>
                          )}
                          
                          {currentSettings.transformOriginDefineMode === 'incremental' && (
                            <div className="space-y-4">
                              {/* X Incremental */}
                              <div className="space-y-3 p-2 bg-slate-800/50 rounded">
                                <Label className="text-xs font-medium text-slate-300">X Incremental</Label>
                                <div className="space-y-3">
                                  <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Start</Label>
                                    <div className="flex items-center gap-2">
                                      <NumericInput
                                        value={currentSettings.transformOriginXStartValue}
                                        onChange={(value) => handleSettingsUpdate({ transformOriginXStartValue: value })}
                                        min={-500}
                                        max={500}
                                        step={10}
                                        className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                        data-testid="input-new-origin-x-start"
                                      />
                                      <Slider
                                        value={[currentSettings.transformOriginXStartValue]}
                                        onValueChange={([value]) => handleSettingsUpdate({ transformOriginXStartValue: value })}
                                        min={-500}
                                        max={500}
                                        step={10}
                                        className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Increment</Label>
                                    <div className="flex items-center gap-2">
                                      <NumericInput
                                        value={currentSettings.transformOriginXIncrement}
                                        onChange={(value) => handleSettingsUpdate({ transformOriginXIncrement: value })}
                                        min={-100}
                                        max={100}
                                        step={1}
                                        className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                        data-testid="input-new-origin-x-increment"
                                      />
                                      <Slider
                                        value={[currentSettings.transformOriginXIncrement]}
                                        onValueChange={([value]) => handleSettingsUpdate({ transformOriginXIncrement: value })}
                                        min={-100}
                                        max={100}
                                        step={1}
                                        className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 p-2 bg-slate-700/50 rounded">
                                    <Checkbox
                                      checked={currentSettings.transformOriginXModulationEnabled}
                                      onCheckedChange={(checked) => handleSettingsUpdate({ transformOriginXModulationEnabled: checked as boolean })}
                                      className="border-slate-500 data-[state=checked]:bg-purple-600"
                                      data-testid="checkbox-new-origin-x-modulation"
                                    />
                                    <Label className="text-xs text-slate-300">Enable Modulation</Label>
                                  </div>
                                  {currentSettings.transformOriginXModulationEnabled && (
                                    <div className="space-y-2">
                                      <Label className="text-xs text-slate-400">Modulation</Label>
                                      <div className="flex items-center gap-2">
                                        <NumericInput
                                          value={currentSettings.transformOriginXModulationValue}
                                          onChange={(value) => handleSettingsUpdate({ transformOriginXModulationValue: value })}
                                          min={1}
                                          max={500}
                                          step={10}
                                          className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                          data-testid="input-new-origin-x-modulation"
                                        />
                                        <Slider
                                          value={[currentSettings.transformOriginXModulationValue]}
                                          onValueChange={([value]) => handleSettingsUpdate({ transformOriginXModulationValue: value })}
                                          min={1}
                                          max={500}
                                          step={10}
                                          className="flex-1 [&_[role=slider]]:bg-purple-600"
                                        />
                                      </div>
                                    </div>
                                  )}
                                  <IndexDriverSelect
                                    value={currentSettings.transformOriginXIncrementalIndexDriver}
                                    onChange={(value) => handleSettingsUpdate({ transformOriginXIncrementalIndexDriver: value })}
                                    testId="select-transform-origin-x-index-driver"
                                  />
                                </div>
                              </div>
                              
                              {/* Y Incremental */}
                              <div className="space-y-3 p-2 bg-slate-800/50 rounded">
                                <Label className="text-xs font-medium text-slate-300">Y Incremental</Label>
                                <div className="space-y-3">
                                  <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Start</Label>
                                    <div className="flex items-center gap-2">
                                      <NumericInput
                                        value={currentSettings.transformOriginYStartValue}
                                        onChange={(value) => handleSettingsUpdate({ transformOriginYStartValue: value })}
                                        min={-500}
                                        max={500}
                                        step={10}
                                        className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                        data-testid="input-new-origin-y-start"
                                      />
                                      <Slider
                                        value={[currentSettings.transformOriginYStartValue]}
                                        onValueChange={([value]) => handleSettingsUpdate({ transformOriginYStartValue: value })}
                                        min={-500}
                                        max={500}
                                        step={10}
                                        className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">Increment</Label>
                                    <div className="flex items-center gap-2">
                                      <NumericInput
                                        value={currentSettings.transformOriginYIncrement}
                                        onChange={(value) => handleSettingsUpdate({ transformOriginYIncrement: value })}
                                        min={-100}
                                        max={100}
                                        step={1}
                                        className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                        data-testid="input-new-origin-y-increment"
                                      />
                                      <Slider
                                        value={[currentSettings.transformOriginYIncrement]}
                                        onValueChange={([value]) => handleSettingsUpdate({ transformOriginYIncrement: value })}
                                        min={-100}
                                        max={100}
                                        step={1}
                                        className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 p-2 bg-slate-700/50 rounded">
                                    <Checkbox
                                      checked={currentSettings.transformOriginYModulationEnabled}
                                      onCheckedChange={(checked) => handleSettingsUpdate({ transformOriginYModulationEnabled: checked as boolean })}
                                      className="border-slate-500 data-[state=checked]:bg-purple-600"
                                      data-testid="checkbox-new-origin-y-modulation"
                                    />
                                    <Label className="text-xs text-slate-300">Enable Modulation</Label>
                                  </div>
                                  {currentSettings.transformOriginYModulationEnabled && (
                                    <div className="space-y-2">
                                      <Label className="text-xs text-slate-400">Modulation</Label>
                                      <div className="flex items-center gap-2">
                                        <NumericInput
                                          value={currentSettings.transformOriginYModulationValue}
                                          onChange={(value) => handleSettingsUpdate({ transformOriginYModulationValue: value })}
                                          min={1}
                                          max={500}
                                          step={10}
                                          className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                          data-testid="input-new-origin-y-modulation"
                                        />
                                        <Slider
                                          value={[currentSettings.transformOriginYModulationValue]}
                                          onValueChange={([value]) => handleSettingsUpdate({ transformOriginYModulationValue: value })}
                                          min={1}
                                          max={500}
                                          step={10}
                                          className="flex-1 [&_[role=slider]]:bg-purple-600"
                                        />
                                      </div>
                                    </div>
                                  )}
                                  <IndexDriverSelect
                                    value={currentSettings.transformOriginYIncrementalIndexDriver}
                                    onChange={(value) => handleSettingsUpdate({ transformOriginYIncrementalIndexDriver: value })}
                                    testId="select-transform-origin-y-index-driver"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {currentSettings.transformOriginMode === 'predefined-artboard' && (
                        <Select 
                          value={currentSettings.transformOriginPredefined} 
                          onValueChange={(value) => handleSettingsUpdate({ transformOriginPredefined: value as any })}
                        >
                          <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-slate-200" data-testid="select-new-origin-artboard-anchor">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                            <SelectItem value="center" className="text-slate-200 hover:bg-slate-700">Center</SelectItem>
                            <SelectItem value="top-left" className="text-slate-200 hover:bg-slate-700">Top Left</SelectItem>
                            <SelectItem value="top-center" className="text-slate-200 hover:bg-slate-700">Top Center</SelectItem>
                            <SelectItem value="top-right" className="text-slate-200 hover:bg-slate-700">Top Right</SelectItem>
                            <SelectItem value="center-left" className="text-slate-200 hover:bg-slate-700">Center Left</SelectItem>
                            <SelectItem value="center-right" className="text-slate-200 hover:bg-slate-700">Center Right</SelectItem>
                            <SelectItem value="bottom-left" className="text-slate-200 hover:bg-slate-700">Bottom Left</SelectItem>
                            <SelectItem value="bottom-center" className="text-slate-200 hover:bg-slate-700">Bottom Center</SelectItem>
                            <SelectItem value="bottom-right" className="text-slate-200 hover:bg-slate-700">Bottom Right</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      
                      {currentSettings.transformOriginMode === 'shape-reference' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-400">Reference</Label>
                              <Select 
                                value={currentSettings.transformOriginShapeReference} 
                                onValueChange={(value) => handleSettingsUpdate({ transformOriginShapeReference: value as any })}
                              >
                                <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="first" className="text-slate-200 hover:bg-slate-700">First Shape</SelectItem>
                                  <SelectItem value="last" className="text-slate-200 hover:bg-slate-700">Last Shape</SelectItem>
                                  <SelectItem value="previous" className="text-slate-200 hover:bg-slate-700">Previous Shape</SelectItem>
                                  <SelectItem value="next" className="text-slate-200 hover:bg-slate-700">Next Shape</SelectItem>
                                  <SelectItem value="current" className="text-slate-200 hover:bg-slate-700">Current Shape</SelectItem>
                                  <SelectItem value="specific" className="text-slate-200 hover:bg-slate-700">Specific Index</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-400">Anchor Point</Label>
                              <Select 
                                value={currentSettings.transformOriginShapeAnchor} 
                                onValueChange={(value) => handleSettingsUpdate({ transformOriginShapeAnchor: value as any })}
                              >
                                <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="center" className="text-slate-200 hover:bg-slate-700">Center</SelectItem>
                                  <SelectItem value="top-left" className="text-slate-200 hover:bg-slate-700">Top Left</SelectItem>
                                  <SelectItem value="top-center" className="text-slate-200 hover:bg-slate-700">Top Center</SelectItem>
                                  <SelectItem value="top-right" className="text-slate-200 hover:bg-slate-700">Top Right</SelectItem>
                                  <SelectItem value="center-left" className="text-slate-200 hover:bg-slate-700">Center Left</SelectItem>
                                  <SelectItem value="center-right" className="text-slate-200 hover:bg-slate-700">Center Right</SelectItem>
                                  <SelectItem value="bottom-left" className="text-slate-200 hover:bg-slate-700">Bottom Left</SelectItem>
                                  <SelectItem value="bottom-center" className="text-slate-200 hover:bg-slate-700">Bottom Center</SelectItem>
                                  <SelectItem value="bottom-right" className="text-slate-200 hover:bg-slate-700">Bottom Right</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {currentSettings.transformOriginShapeReference === 'specific' && (
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-400">Shape Index</Label>
                              <div className="flex items-center gap-2">
                                <NumericInput
                                  value={currentSettings.transformOriginShapeIndex}
                                  onChange={(value) => handleSettingsUpdate({ transformOriginShapeIndex: value })}
                                  min={0}
                                  max={100}
                                  step={1}
                                  className="h-8 w-20 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  data-testid="input-new-origin-shape-index"
                                />
                                <Slider
                                  value={[currentSettings.transformOriginShapeIndex]}
                                  onValueChange={([value]) => handleSettingsUpdate({ transformOriginShapeIndex: value })}
                                  min={0}
                                  max={100}
                                  step={1}
                                  className="flex-1 [&_[role=slider]]:bg-orange-600"
                                />
                              </div>
                              <p className="text-xs text-slate-500">0 = first shape, 1 = second, etc.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Shape Compositing Section - Modern Styling */}
              <div className="space-y-3 border border-slate-600 rounded-lg p-3 bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={currentSettings.blendModeEnabled || currentSettings.compositingOperationsEnabled}
                      onCheckedChange={(checked) => {
                        if (!checked) {
                          handleSettingsUpdate({ blendModeEnabled: false, compositingOperationsEnabled: false });
                        } else {
                          handleSettingsUpdate({ blendModeEnabled: true });
                        }
                      }}
                      className="border-slate-500 data-[state=checked]:bg-purple-600"
                      data-testid="checkbox-shape-compositing-enabled"
                    />
                    <Label className="text-sm font-medium text-slate-200">Shape Compositing</Label>
                  </div>
                  <span className="text-xs text-slate-400">
                    {currentSettings.blendModeEnabled 
                      ? 'Blending Modes' 
                      : currentSettings.compositingOperationsEnabled 
                        ? 'Composite Operations' 
                        : 'Disabled'}
                  </span>
                </div>
                
                {(currentSettings.blendModeEnabled || currentSettings.compositingOperationsEnabled) && (
                  <div className="space-y-4 mt-3">
                    {/* Blending Modes Subsection */}
                    <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            checked={currentSettings.blendModeEnabled}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleSettingsUpdate({ blendModeEnabled: true, compositingOperationsEnabled: false });
                              } else {
                                handleSettingsUpdate({ blendModeEnabled: false });
                              }
                            }}
                            disabled={currentSettings.compositingOperationsEnabled}
                            className="border-slate-500 data-[state=checked]:bg-purple-600"
                            data-testid="checkbox-blend-mode-enabled"
                          />
                          <Label className="text-sm font-medium text-slate-200">Blending Modes</Label>
                        </div>
                        {currentSettings.compositingOperationsEnabled && (
                          <span className="text-xs text-amber-400 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Disabled when Composite Operations is active
                          </span>
                        )}
                      </div>
                      
                      {currentSettings.blendModeEnabled && !currentSettings.compositingOperationsEnabled && (
                        <div className="space-y-3 mt-2">
                          <p className="text-xs text-slate-400 p-2 bg-slate-800/50 rounded">
                            Each enabled blend mode has a 0-100% probability weight. System randomly selects modes based on these weights.
                          </p>
                          
                          <div className="grid grid-cols-1 gap-2">
                            {blendModes.map((mode) => (
                              <div key={mode} className="flex items-center space-x-3 p-2 bg-slate-800/50 rounded">
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
                                  className="border-slate-500 data-[state=checked]:bg-purple-600"
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
                                      className="h-2 [&_[role=slider]]:bg-purple-600"
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

                    {/* Composite Operations Subsection */}
                    <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            checked={currentSettings.compositingOperationsEnabled}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleSettingsUpdate({ compositingOperationsEnabled: true, blendModeEnabled: false });
                              } else {
                                handleSettingsUpdate({ compositingOperationsEnabled: false });
                              }
                            }}
                            disabled={currentSettings.blendModeEnabled}
                            className="border-slate-500 data-[state=checked]:bg-purple-600"
                            data-testid="checkbox-compositing-enabled"
                          />
                          <Label className="text-sm font-medium text-slate-200">Composite Operations</Label>
                        </div>
                        {currentSettings.blendModeEnabled && (
                          <span className="text-xs text-amber-400 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Disabled when Blending Modes is active
                          </span>
                        )}
                      </div>
                      
                      {currentSettings.compositingOperationsEnabled && !currentSettings.blendModeEnabled && (
                        <div className="space-y-3 mt-2">
                          <p className="text-xs text-slate-400 p-2 bg-slate-800/50 rounded">
                            Each enabled compositing operation has a 0-100% probability weight. System randomly selects operations for masking and transparency effects.
                          </p>
                          
                          <div className="grid grid-cols-1 gap-2">
                            {compositingOperations.map((op) => (
                              <div key={op} className="flex items-center space-x-3 p-2 bg-slate-800/50 rounded">
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
                                  className="border-slate-500 data-[state=checked]:bg-purple-600"
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
                                      className="h-2 [&_[role=slider]]:bg-purple-600"
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
                  </div>
                )}
              </div>

              {/* Shape Effects Section - Modern Styling */}
              <div className="space-y-3 border border-slate-600 rounded-lg p-3 bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={currentSettings.shapeEffectsEnabled}
                      onCheckedChange={(checked) => handleSettingsUpdate({ shapeEffectsEnabled: checked as boolean })}
                      className="border-slate-500 data-[state=checked]:bg-purple-600"
                      data-testid="checkbox-shape-effects-enabled"
                    />
                    <Label className="text-sm font-medium text-slate-200">Shape Effects</Label>
                  </div>
                  <span className="text-xs text-slate-400">
                    {currentSettings.shapeEffectsEnabled 
                      ? `${currentSettings.blurEnabled ? 'Blur' : ''}${currentSettings.blurEnabled ? '' : 'No effects active'}` 
                      : 'Disabled'}
                  </span>
                </div>
                
                {currentSettings.shapeEffectsEnabled && (
                  <div className="space-y-4 mt-3">
                    {/* Blur Subsection */}
                    <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          checked={currentSettings.blurEnabled}
                          onCheckedChange={(checked) => handleSettingsUpdate({ blurEnabled: checked as boolean })}
                          className="border-slate-500 data-[state=checked]:bg-purple-600"
                          data-testid="checkbox-blur-enabled"
                        />
                        <Label className="text-sm font-medium text-slate-200">Blur</Label>
                      </div>

                      {currentSettings.blurEnabled && (
                        <div className="space-y-3 mt-2">
                          {/* Blur Probability */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Probability</Label>
                            <div className="flex items-center gap-2">
                              <NumericInput
                                value={currentSettings.blurProbability}
                                onChange={(value) => handleSettingsUpdate({ blurProbability: Math.max(0, Math.min(100, value)) })}
                                min={0}
                                max={100}
                                step={5}
                                className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                data-testid="input-blur-probability"
                              />
                              <Slider
                                value={[currentSettings.blurProbability]}
                                onValueChange={([value]) => handleSettingsUpdate({ blurProbability: value })}
                                min={0}
                                max={100}
                                step={5}
                                className="flex-1 [&_[role=slider]]:bg-purple-600"
                              />
                            </div>
                            <p className="text-xs text-slate-500">{currentSettings.blurProbability}% of shapes will have blur applied</p>
                          </div>

                          {/* Blur Mode Selector */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Mode</Label>
                            <Select value={currentSettings.blurMode} onValueChange={(value) => handleSettingsUpdate({ blurMode: value as any })}>
                              <SelectTrigger className="h-8 w-full text-xs bg-slate-700 border-slate-600 text-slate-200" data-testid="select-blur-mode">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define (Fixed)</SelectItem>
                                <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range (Random)</SelectItem>
                                <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {currentSettings.blurMode === 'define' && (
                            <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                              <Label className="text-xs font-medium text-slate-300">Blur Radius</Label>
                              <div className="flex items-center gap-2">
                                <NumericInput
                                  value={currentSettings.blurDefine}
                                  onChange={(value) => handleSettingsUpdate({ blurDefine: value })}
                                  min={0}
                                  max={50}
                                  step={1}
                                  className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  data-testid="input-blur-define"
                                />
                                <Slider
                                  value={[currentSettings.blurDefine]}
                                  onValueChange={([value]) => handleSettingsUpdate({ blurDefine: value })}
                                  min={0}
                                  max={50}
                                  step={1}
                                  className="flex-1 [&_[role=slider]]:bg-purple-600"
                                />
                              </div>
                              <p className="text-xs text-slate-500">Fixed blur: {currentSettings.blurDefine}px</p>
                            </div>
                          )}

                          {currentSettings.blurMode === 'range' && (
                            <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                              <Label className="text-xs font-medium text-slate-300">Blur Range</Label>
                              <div className="hidden md:flex items-center gap-2">
                                <NumericInput
                                  value={currentSettings.blurRange?.[0] ?? 2}
                                  onChange={(value) => handleSettingsUpdate({ blurRange: [value, currentSettings.blurRange?.[1] ?? 15] })}
                                  min={0}
                                  max={50}
                                  step={1}
                                  className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  data-testid="input-blur-range-min"
                                />
                                <Slider
                                  value={currentSettings.blurRange || [2, 15]}
                                  onValueChange={(value) => handleSettingsUpdate({ blurRange: value as [number, number] })}
                                  min={0}
                                  max={50}
                                  step={1}
                                  className="flex-1 [&_[role=slider]]:bg-purple-600"
                                />
                                <NumericInput
                                  value={currentSettings.blurRange?.[1] ?? 15}
                                  onChange={(value) => handleSettingsUpdate({ blurRange: [currentSettings.blurRange?.[0] ?? 2, value] })}
                                  min={0}
                                  max={50}
                                  step={1}
                                  className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  data-testid="input-blur-range-max"
                                />
                              </div>
                              <div className="md:hidden space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Min</Label>
                                    <NumericInput
                                      value={currentSettings.blurRange?.[0] ?? 2}
                                      onChange={(value) => handleSettingsUpdate({ blurRange: [value, currentSettings.blurRange?.[1] ?? 15] })}
                                      min={0}
                                      max={50}
                                      step={1}
                                      className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Max</Label>
                                    <NumericInput
                                      value={currentSettings.blurRange?.[1] ?? 15}
                                      onChange={(value) => handleSettingsUpdate({ blurRange: [currentSettings.blurRange?.[0] ?? 2, value] })}
                                      min={0}
                                      max={50}
                                      step={1}
                                      className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                    />
                                  </div>
                                </div>
                                <Slider
                                  value={currentSettings.blurRange || [2, 15]}
                                  onValueChange={(value) => handleSettingsUpdate({ blurRange: value as [number, number] })}
                                  min={0}
                                  max={50}
                                  step={1}
                                  className="[&_[role=slider]]:bg-purple-600"
                                />
                              </div>
                              <p className="text-xs text-slate-500">Range: {currentSettings.blurRange?.[0] ?? 2}px to {currentSettings.blurRange?.[1] ?? 15}px</p>
                            </div>
                          )}

                          {currentSettings.blurMode === 'incremental' && (
                            <div className="space-y-3 p-2 bg-slate-800/50 rounded">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-400">Start Value</Label>
                                  <div className="flex items-center gap-2">
                                    <NumericInput
                                      value={currentSettings.blurStartValue}
                                      onChange={(value) => handleSettingsUpdate({ blurStartValue: value })}
                                      min={0}
                                      max={50}
                                      step={0.5}
                                      className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      data-testid="input-blur-start-value"
                                    />
                                    <Slider
                                      value={[currentSettings.blurStartValue]}
                                      onValueChange={([value]) => handleSettingsUpdate({ blurStartValue: value })}
                                      min={0}
                                      max={50}
                                      step={0.5}
                                      className="flex-1 [&_[role=slider]]:bg-purple-600"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-400">Increment</Label>
                                  <div className="flex items-center gap-2">
                                    <NumericInput
                                      value={currentSettings.blurIncrement}
                                      onChange={(value) => handleSettingsUpdate({ blurIncrement: value })}
                                      min={0}
                                      max={5}
                                      step={0.1}
                                      className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      data-testid="input-blur-increment"
                                    />
                                    <Slider
                                      value={[currentSettings.blurIncrement]}
                                      onValueChange={([value]) => handleSettingsUpdate({ blurIncrement: value })}
                                      min={0}
                                      max={5}
                                      step={0.1}
                                      className="flex-1 [&_[role=slider]]:bg-purple-600"
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 p-2 bg-slate-700/50 rounded">
                                <Checkbox
                                  checked={currentSettings.blurModulationEnabled}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ blurModulationEnabled: checked as boolean })}
                                  className="border-slate-500 data-[state=checked]:bg-purple-600"
                                  data-testid="checkbox-blur-modulation"
                                />
                                <Label className="text-xs text-slate-300">Enable Modulation</Label>
                              </div>
                              {currentSettings.blurModulationEnabled && (
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-400">Modulation Wrap</Label>
                                  <div className="flex items-center gap-2">
                                    <NumericInput
                                      value={currentSettings.blurModulationValue}
                                      onChange={(value) => handleSettingsUpdate({ blurModulationValue: value })}
                                      min={1}
                                      max={50}
                                      step={1}
                                      className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      data-testid="input-blur-modulation"
                                    />
                                    <Slider
                                      value={[currentSettings.blurModulationValue]}
                                      onValueChange={([value]) => handleSettingsUpdate({ blurModulationValue: value })}
                                      min={1}
                                      max={50}
                                      step={1}
                                      className="flex-1 [&_[role=slider]]:bg-purple-600"
                                    />
                                  </div>
                                </div>
                              )}
                              <IndexDriverSelect
                                value={currentSettings.blurIncrementalIndexDriver}
                                onChange={(value) => handleSettingsUpdate({ blurIncrementalIndexDriver: value })}
                                testId="select-blur-index-driver"
                              />
                              <p className="text-xs text-slate-500">Progressive blur: start + (index × increment), wraps at modulation value</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Drop Shadow Subsection */}
                    <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          checked={currentSettings.dropShadowEnabled}
                          onCheckedChange={(checked) => handleSettingsUpdate({ dropShadowEnabled: checked as boolean })}
                          className="border-slate-500 data-[state=checked]:bg-orange-600"
                          data-testid="checkbox-drop-shadow-enabled"
                        />
                        <Label className="text-sm font-medium text-slate-200">Drop Shadow</Label>
                      </div>

                      {currentSettings.dropShadowEnabled && (
                        <div className="space-y-3 mt-2">
                          {/* Drop Shadow Probability */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Probability</Label>
                            <div className="flex items-center gap-2">
                              <NumericInput
                                value={currentSettings.dropShadowProbability}
                                onChange={(value) => handleSettingsUpdate({ dropShadowProbability: Math.max(0, Math.min(100, value)) })}
                                min={0}
                                max={100}
                                step={5}
                                className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                data-testid="input-drop-shadow-probability"
                              />
                              <Slider
                                value={[currentSettings.dropShadowProbability]}
                                onValueChange={([value]) => handleSettingsUpdate({ dropShadowProbability: value })}
                                min={0}
                                max={100}
                                step={5}
                                className="flex-1 [&_[role=slider]]:bg-orange-600"
                              />
                            </div>
                          </div>

                          {/* Drop Shadow Mode Selector */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Mode</Label>
                            <Select value={currentSettings.dropShadowBlurMode} onValueChange={(value) => {
                              handleSettingsUpdate({ 
                                dropShadowBlurMode: value as any,
                                dropShadowOffsetXMode: value as any,
                                dropShadowOffsetYMode: value as any,
                                dropShadowSpreadMode: value as any
                              });
                            }}>
                              <SelectTrigger className="h-8 w-full text-xs bg-slate-700 border-slate-600 text-slate-200" data-testid="select-drop-shadow-mode">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define (Fixed)</SelectItem>
                                <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range (Random)</SelectItem>
                                <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                              </SelectContent>
                            </Select>
                            {currentSettings.dropShadowBlurMode === 'incremental' && (
                              <IndexDriverSelect
                                value={currentSettings.dropShadowIncrementalIndexDriver}
                                onChange={(value) => handleSettingsUpdate({ dropShadowIncrementalIndexDriver: value })}
                                testId="select-drop-shadow-index-driver"
                              />
                            )}
                          </div>

                          {/* Drop Shadow Offset */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Offset (X, Y)</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {currentSettings.dropShadowBlurMode === 'define' ? (
                                <>
                                  <NumericInput
                                    value={currentSettings.dropShadowOffsetX}
                                    onChange={(value) => handleSettingsUpdate({ dropShadowOffsetX: value })}
                                    min={-50}
                                    max={50}
                                    step={1}
                                    className="h-8 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                    data-testid="input-drop-shadow-offset-x"
                                  />
                                  <NumericInput
                                    value={currentSettings.dropShadowOffsetY}
                                    onChange={(value) => handleSettingsUpdate({ dropShadowOffsetY: value })}
                                    min={-50}
                                    max={50}
                                    step={1}
                                    className="h-8 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                    data-testid="input-drop-shadow-offset-y"
                                  />
                                </>
                              ) : (
                                <>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">X Range</Label>
                                    <div className="flex items-center gap-1">
                                      <NumericInput
                                        value={currentSettings.dropShadowOffsetXRange?.[0] ?? 2}
                                        onChange={(value) => handleSettingsUpdate({ dropShadowOffsetXRange: [value, currentSettings.dropShadowOffsetXRange?.[1] ?? 10] })}
                                        min={-50}
                                        max={50}
                                        step={1}
                                        className="h-7 w-12 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      />
                                      <span className="text-xs text-slate-400">to</span>
                                      <NumericInput
                                        value={currentSettings.dropShadowOffsetXRange?.[1] ?? 10}
                                        onChange={(value) => handleSettingsUpdate({ dropShadowOffsetXRange: [currentSettings.dropShadowOffsetXRange?.[0] ?? 2, value] })}
                                        min={-50}
                                        max={50}
                                        step={1}
                                        className="h-7 w-12 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Y Range</Label>
                                    <div className="flex items-center gap-1">
                                      <NumericInput
                                        value={currentSettings.dropShadowOffsetYRange?.[0] ?? 2}
                                        onChange={(value) => handleSettingsUpdate({ dropShadowOffsetYRange: [value, currentSettings.dropShadowOffsetYRange?.[1] ?? 10] })}
                                        min={-50}
                                        max={50}
                                        step={1}
                                        className="h-7 w-12 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      />
                                      <span className="text-xs text-slate-400">to</span>
                                      <NumericInput
                                        value={currentSettings.dropShadowOffsetYRange?.[1] ?? 10}
                                        onChange={(value) => handleSettingsUpdate({ dropShadowOffsetYRange: [currentSettings.dropShadowOffsetYRange?.[0] ?? 2, value] })}
                                        min={-50}
                                        max={50}
                                        step={1}
                                        className="h-7 w-12 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      />
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Drop Shadow Blur */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Blur Radius</Label>
                            {currentSettings.dropShadowBlurMode === 'define' ? (
                              <div className="flex items-center gap-2">
                                <NumericInput
                                  value={currentSettings.dropShadowBlur}
                                  onChange={(value) => handleSettingsUpdate({ dropShadowBlur: value })}
                                  min={0}
                                  max={50}
                                  step={1}
                                  className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  data-testid="input-drop-shadow-blur"
                                />
                                <Slider
                                  value={[currentSettings.dropShadowBlur]}
                                  onValueChange={([value]) => handleSettingsUpdate({ dropShadowBlur: value })}
                                  min={0}
                                  max={50}
                                  step={1}
                                  className="flex-1 [&_[role=slider]]:bg-orange-600"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <NumericInput
                                  value={currentSettings.dropShadowBlurRange?.[0] ?? 5}
                                  onChange={(value) => handleSettingsUpdate({ dropShadowBlurRange: [value, currentSettings.dropShadowBlurRange?.[1] ?? 15] })}
                                  min={0}
                                  max={50}
                                  step={1}
                                  className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                />
                                <Slider
                                  value={currentSettings.dropShadowBlurRange || [5, 15]}
                                  onValueChange={(value) => handleSettingsUpdate({ dropShadowBlurRange: value as [number, number] })}
                                  min={0}
                                  max={50}
                                  step={1}
                                  className="flex-1 [&_[role=slider]]:bg-orange-600"
                                />
                                <NumericInput
                                  value={currentSettings.dropShadowBlurRange?.[1] ?? 15}
                                  onChange={(value) => handleSettingsUpdate({ dropShadowBlurRange: [currentSettings.dropShadowBlurRange?.[0] ?? 5, value] })}
                                  min={0}
                                  max={50}
                                  step={1}
                                  className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                />
                              </div>
                            )}
                          </div>

                          {/* Drop Shadow Color */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium text-slate-300">Color</Label>
                              <Select value={currentSettings.dropShadowColorMode} onValueChange={(value) => handleSettingsUpdate({ dropShadowColorMode: value as any })}>
                                <SelectTrigger className="h-6 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="auto" className="text-slate-200 hover:bg-slate-700">Auto</SelectItem>
                                  <SelectItem value="custom" className="text-slate-200 hover:bg-slate-700">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {currentSettings.dropShadowColorMode === 'custom' && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={currentSettings.dropShadowCustomColor}
                                  onChange={(e) => handleSettingsUpdate({ dropShadowCustomColor: e.target.value })}
                                  className="h-8 w-8 rounded border border-slate-600 cursor-pointer"
                                  data-testid="input-drop-shadow-color"
                                />
                                <span className="text-xs text-slate-400">{currentSettings.dropShadowCustomColor}</span>
                              </div>
                            )}
                            {currentSettings.dropShadowColorMode === 'auto' && (
                              <p className="text-xs text-slate-500">Color derived from shape fill (darkened)</p>
                            )}
                          </div>

                          {/* Drop Shadow Opacity */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Opacity</Label>
                            <div className="flex items-center gap-2">
                              <NumericInput
                                value={currentSettings.dropShadowOpacity}
                                onChange={(value) => handleSettingsUpdate({ dropShadowOpacity: Math.max(0, Math.min(100, value)) })}
                                min={0}
                                max={100}
                                step={5}
                                className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                data-testid="input-drop-shadow-opacity"
                              />
                              <Slider
                                value={[currentSettings.dropShadowOpacity]}
                                onValueChange={([value]) => handleSettingsUpdate({ dropShadowOpacity: value })}
                                min={0}
                                max={100}
                                step={5}
                                className="flex-1 [&_[role=slider]]:bg-orange-600"
                              />
                              <span className="text-xs text-slate-400">{currentSettings.dropShadowOpacity}%</span>
                            </div>
                          </div>

                          {/* Drop Shadow Blend Mode */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Blend Mode</Label>
                            <Select value={currentSettings.dropShadowBlendMode} onValueChange={(value) => handleSettingsUpdate({ dropShadowBlendMode: value as any })}>
                              <SelectTrigger className="h-8 w-full text-xs bg-slate-700 border-slate-600 text-slate-200" data-testid="select-drop-shadow-blend-mode">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="multiply" className="text-slate-200 hover:bg-slate-700">Multiply</SelectItem>
                                <SelectItem value="darken" className="text-slate-200 hover:bg-slate-700">Darken</SelectItem>
                                <SelectItem value="overlay" className="text-slate-200 hover:bg-slate-700">Overlay</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Outer Glow Subsection */}
                    <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          checked={currentSettings.outerGlowEnabled}
                          onCheckedChange={(checked) => handleSettingsUpdate({ outerGlowEnabled: checked as boolean })}
                          className="border-slate-500 data-[state=checked]:bg-yellow-500"
                          data-testid="checkbox-outer-glow-enabled"
                        />
                        <Label className="text-sm font-medium text-slate-200">Outer Glow</Label>
                      </div>

                      {currentSettings.outerGlowEnabled && (
                        <div className="space-y-3 mt-2">
                          {/* Outer Glow Probability */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Probability</Label>
                            <div className="flex items-center gap-2">
                              <NumericInput
                                value={currentSettings.outerGlowProbability}
                                onChange={(value) => handleSettingsUpdate({ outerGlowProbability: Math.max(0, Math.min(100, value)) })}
                                min={0}
                                max={100}
                                step={5}
                                className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                data-testid="input-outer-glow-probability"
                              />
                              <Slider
                                value={[currentSettings.outerGlowProbability]}
                                onValueChange={([value]) => handleSettingsUpdate({ outerGlowProbability: value })}
                                min={0}
                                max={100}
                                step={5}
                                className="flex-1 [&_[role=slider]]:bg-yellow-500"
                              />
                            </div>
                          </div>

                          {/* Outer Glow Mode Selector */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Mode</Label>
                            <Select value={currentSettings.outerGlowBlurMode} onValueChange={(value) => {
                              handleSettingsUpdate({ 
                                outerGlowBlurMode: value as any,
                                outerGlowSpreadMode: value as any,
                              });
                            }}>
                              <SelectTrigger className="h-8 w-full text-xs bg-slate-700 border-slate-600 text-slate-200" data-testid="select-outer-glow-mode">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define (Fixed)</SelectItem>
                                <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range (Random)</SelectItem>
                                <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                              </SelectContent>
                            </Select>
                            {currentSettings.outerGlowBlurMode === 'incremental' && (
                              <IndexDriverSelect
                                value={currentSettings.outerGlowIncrementalIndexDriver}
                                onChange={(value) => handleSettingsUpdate({ outerGlowIncrementalIndexDriver: value })}
                                testId="select-outer-glow-index-driver"
                              />
                            )}
                          </div>

                          {/* Outer Glow Blur */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Blur Radius</Label>
                            {currentSettings.outerGlowBlurMode === 'define' ? (
                              <div className="flex items-center gap-2">
                                <NumericInput
                                  value={currentSettings.outerGlowBlur}
                                  onChange={(value) => handleSettingsUpdate({ outerGlowBlur: value })}
                                  min={0}
                                  max={50}
                                  step={1}
                                  className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  data-testid="input-outer-glow-blur"
                                />
                                <Slider
                                  value={[currentSettings.outerGlowBlur]}
                                  onValueChange={([value]) => handleSettingsUpdate({ outerGlowBlur: value })}
                                  min={0}
                                  max={50}
                                  step={1}
                                  className="flex-1 [&_[role=slider]]:bg-yellow-500"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <NumericInput
                                  value={currentSettings.outerGlowBlurRange?.[0] ?? 5}
                                  onChange={(value) => handleSettingsUpdate({ outerGlowBlurRange: [value, currentSettings.outerGlowBlurRange?.[1] ?? 20] })}
                                  min={0}
                                  max={50}
                                  step={1}
                                  className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                />
                                <Slider
                                  value={currentSettings.outerGlowBlurRange || [5, 20]}
                                  onValueChange={(value) => handleSettingsUpdate({ outerGlowBlurRange: value as [number, number] })}
                                  min={0}
                                  max={50}
                                  step={1}
                                  className="flex-1 [&_[role=slider]]:bg-yellow-500"
                                />
                                <NumericInput
                                  value={currentSettings.outerGlowBlurRange?.[1] ?? 20}
                                  onChange={(value) => handleSettingsUpdate({ outerGlowBlurRange: [currentSettings.outerGlowBlurRange?.[0] ?? 5, value] })}
                                  min={0}
                                  max={50}
                                  step={1}
                                  className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                />
                              </div>
                            )}
                          </div>

                          {/* Outer Glow Color */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium text-slate-300">Color</Label>
                              <Select value={currentSettings.outerGlowColorMode} onValueChange={(value) => handleSettingsUpdate({ outerGlowColorMode: value as any })}>
                                <SelectTrigger className="h-6 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="auto" className="text-slate-200 hover:bg-slate-700">Auto</SelectItem>
                                  <SelectItem value="custom" className="text-slate-200 hover:bg-slate-700">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {currentSettings.outerGlowColorMode === 'custom' && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={currentSettings.outerGlowCustomColor}
                                  onChange={(e) => handleSettingsUpdate({ outerGlowCustomColor: e.target.value })}
                                  className="h-8 w-8 rounded border border-slate-600 cursor-pointer"
                                  data-testid="input-outer-glow-color"
                                />
                                <span className="text-xs text-slate-400">{currentSettings.outerGlowCustomColor}</span>
                              </div>
                            )}
                            {currentSettings.outerGlowColorMode === 'auto' && (
                              <p className="text-xs text-slate-500">Color derived from shape fill (lightened)</p>
                            )}
                          </div>

                          {/* Outer Glow Opacity */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Opacity</Label>
                            <div className="flex items-center gap-2">
                              <NumericInput
                                value={currentSettings.outerGlowOpacity}
                                onChange={(value) => handleSettingsUpdate({ outerGlowOpacity: Math.max(0, Math.min(100, value)) })}
                                min={0}
                                max={100}
                                step={5}
                                className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                data-testid="input-outer-glow-opacity"
                              />
                              <Slider
                                value={[currentSettings.outerGlowOpacity]}
                                onValueChange={([value]) => handleSettingsUpdate({ outerGlowOpacity: value })}
                                min={0}
                                max={100}
                                step={5}
                                className="flex-1 [&_[role=slider]]:bg-yellow-500"
                              />
                              <span className="text-xs text-slate-400">{currentSettings.outerGlowOpacity}%</span>
                            </div>
                          </div>

                          {/* Outer Glow Blend Mode */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Blend Mode</Label>
                            <Select value={currentSettings.outerGlowBlendMode} onValueChange={(value) => handleSettingsUpdate({ outerGlowBlendMode: value as any })}>
                              <SelectTrigger className="h-8 w-full text-xs bg-slate-700 border-slate-600 text-slate-200" data-testid="select-outer-glow-blend-mode">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="screen" className="text-slate-200 hover:bg-slate-700">Screen</SelectItem>
                                <SelectItem value="lighter" className="text-slate-200 hover:bg-slate-700">Add (Lighter)</SelectItem>
                                <SelectItem value="soft-light" className="text-slate-200 hover:bg-slate-700">Soft Light</SelectItem>
                                <SelectItem value="color-dodge" className="text-slate-200 hover:bg-slate-700">Color Dodge</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Inner Shadow Subsection */}
                    <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          checked={currentSettings.innerShadowEnabled}
                          onCheckedChange={(checked) => handleSettingsUpdate({ innerShadowEnabled: checked as boolean })}
                          className="border-slate-500 data-[state=checked]:bg-red-600"
                          data-testid="checkbox-inner-shadow-enabled"
                        />
                        <Label className="text-sm font-medium text-slate-200">Inner Shadow</Label>
                      </div>

                      {currentSettings.innerShadowEnabled && (
                        <div className="space-y-3 mt-2">
                          {/* Inner Shadow Probability */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Probability</Label>
                            <div className="flex items-center gap-2">
                              <NumericInput
                                value={currentSettings.innerShadowProbability}
                                onChange={(value) => handleSettingsUpdate({ innerShadowProbability: Math.max(0, Math.min(100, value)) })}
                                min={0}
                                max={100}
                                step={5}
                                className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                data-testid="input-inner-shadow-probability"
                              />
                              <Slider
                                value={[currentSettings.innerShadowProbability]}
                                onValueChange={([value]) => handleSettingsUpdate({ innerShadowProbability: value })}
                                min={0}
                                max={100}
                                step={5}
                                className="flex-1 [&_[role=slider]]:bg-red-600"
                              />
                            </div>
                          </div>

                          {/* Inner Shadow Mode Selector */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Mode</Label>
                            <Select value={currentSettings.innerShadowBlurMode} onValueChange={(value) => {
                              handleSettingsUpdate({ 
                                innerShadowBlurMode: value as any,
                                innerShadowOffsetXMode: value as any,
                                innerShadowOffsetYMode: value as any,
                              });
                            }}>
                              <SelectTrigger className="h-8 w-full text-xs bg-slate-700 border-slate-600 text-slate-200" data-testid="select-inner-shadow-mode">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define (Fixed)</SelectItem>
                                <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range (Random)</SelectItem>
                                <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                              </SelectContent>
                            </Select>
                            {currentSettings.innerShadowBlurMode === 'incremental' && (
                              <IndexDriverSelect
                                value={currentSettings.innerShadowIncrementalIndexDriver}
                                onChange={(value) => handleSettingsUpdate({ innerShadowIncrementalIndexDriver: value })}
                                testId="select-inner-shadow-index-driver"
                              />
                            )}
                          </div>

                          {/* Inner Shadow Offset */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Offset (X, Y)</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {currentSettings.innerShadowBlurMode === 'define' ? (
                                <>
                                  <NumericInput
                                    value={currentSettings.innerShadowOffsetX}
                                    onChange={(value) => handleSettingsUpdate({ innerShadowOffsetX: value })}
                                    min={-30}
                                    max={30}
                                    step={1}
                                    className="h-8 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                    data-testid="input-inner-shadow-offset-x"
                                  />
                                  <NumericInput
                                    value={currentSettings.innerShadowOffsetY}
                                    onChange={(value) => handleSettingsUpdate({ innerShadowOffsetY: value })}
                                    min={-30}
                                    max={30}
                                    step={1}
                                    className="h-8 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                    data-testid="input-inner-shadow-offset-y"
                                  />
                                </>
                              ) : (
                                <>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">X Range</Label>
                                    <div className="flex items-center gap-1">
                                      <NumericInput
                                        value={currentSettings.innerShadowOffsetXRange?.[0] ?? 1}
                                        onChange={(value) => handleSettingsUpdate({ innerShadowOffsetXRange: [value, currentSettings.innerShadowOffsetXRange?.[1] ?? 5] })}
                                        min={-30}
                                        max={30}
                                        step={1}
                                        className="h-7 w-12 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      />
                                      <span className="text-xs text-slate-400">to</span>
                                      <NumericInput
                                        value={currentSettings.innerShadowOffsetXRange?.[1] ?? 5}
                                        onChange={(value) => handleSettingsUpdate({ innerShadowOffsetXRange: [currentSettings.innerShadowOffsetXRange?.[0] ?? 1, value] })}
                                        min={-30}
                                        max={30}
                                        step={1}
                                        className="h-7 w-12 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Y Range</Label>
                                    <div className="flex items-center gap-1">
                                      <NumericInput
                                        value={currentSettings.innerShadowOffsetYRange?.[0] ?? 1}
                                        onChange={(value) => handleSettingsUpdate({ innerShadowOffsetYRange: [value, currentSettings.innerShadowOffsetYRange?.[1] ?? 5] })}
                                        min={-30}
                                        max={30}
                                        step={1}
                                        className="h-7 w-12 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      />
                                      <span className="text-xs text-slate-400">to</span>
                                      <NumericInput
                                        value={currentSettings.innerShadowOffsetYRange?.[1] ?? 5}
                                        onChange={(value) => handleSettingsUpdate({ innerShadowOffsetYRange: [currentSettings.innerShadowOffsetYRange?.[0] ?? 1, value] })}
                                        min={-30}
                                        max={30}
                                        step={1}
                                        className="h-7 w-12 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                      />
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Inner Shadow Blur */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Blur Radius</Label>
                            {currentSettings.innerShadowBlurMode === 'define' ? (
                              <div className="flex items-center gap-2">
                                <NumericInput
                                  value={currentSettings.innerShadowBlur}
                                  onChange={(value) => handleSettingsUpdate({ innerShadowBlur: value })}
                                  min={0}
                                  max={30}
                                  step={1}
                                  className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  data-testid="input-inner-shadow-blur"
                                />
                                <Slider
                                  value={[currentSettings.innerShadowBlur]}
                                  onValueChange={([value]) => handleSettingsUpdate({ innerShadowBlur: value })}
                                  min={0}
                                  max={30}
                                  step={1}
                                  className="flex-1 [&_[role=slider]]:bg-red-600"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <NumericInput
                                  value={currentSettings.innerShadowBlurRange?.[0] ?? 3}
                                  onChange={(value) => handleSettingsUpdate({ innerShadowBlurRange: [value, currentSettings.innerShadowBlurRange?.[1] ?? 10] })}
                                  min={0}
                                  max={30}
                                  step={1}
                                  className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                />
                                <Slider
                                  value={currentSettings.innerShadowBlurRange || [3, 10]}
                                  onValueChange={(value) => handleSettingsUpdate({ innerShadowBlurRange: value as [number, number] })}
                                  min={0}
                                  max={30}
                                  step={1}
                                  className="flex-1 [&_[role=slider]]:bg-red-600"
                                />
                                <NumericInput
                                  value={currentSettings.innerShadowBlurRange?.[1] ?? 10}
                                  onChange={(value) => handleSettingsUpdate({ innerShadowBlurRange: [currentSettings.innerShadowBlurRange?.[0] ?? 3, value] })}
                                  min={0}
                                  max={30}
                                  step={1}
                                  className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                />
                              </div>
                            )}
                          </div>

                          {/* Inner Shadow Color */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium text-slate-300">Color</Label>
                              <Select value={currentSettings.innerShadowColorMode} onValueChange={(value) => handleSettingsUpdate({ innerShadowColorMode: value as any })}>
                                <SelectTrigger className="h-6 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="auto" className="text-slate-200 hover:bg-slate-700">Auto</SelectItem>
                                  <SelectItem value="custom" className="text-slate-200 hover:bg-slate-700">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {currentSettings.innerShadowColorMode === 'custom' && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={currentSettings.innerShadowCustomColor}
                                  onChange={(e) => handleSettingsUpdate({ innerShadowCustomColor: e.target.value })}
                                  className="h-8 w-8 rounded border border-slate-600 cursor-pointer"
                                  data-testid="input-inner-shadow-color"
                                />
                                <span className="text-xs text-slate-400">{currentSettings.innerShadowCustomColor}</span>
                              </div>
                            )}
                            {currentSettings.innerShadowColorMode === 'auto' && (
                              <p className="text-xs text-slate-500">Color derived from shape fill (darkened)</p>
                            )}
                          </div>

                          {/* Inner Shadow Opacity */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Opacity</Label>
                            <div className="flex items-center gap-2">
                              <NumericInput
                                value={currentSettings.innerShadowOpacity}
                                onChange={(value) => handleSettingsUpdate({ innerShadowOpacity: Math.max(0, Math.min(100, value)) })}
                                min={0}
                                max={100}
                                step={5}
                                className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                data-testid="input-inner-shadow-opacity"
                              />
                              <Slider
                                value={[currentSettings.innerShadowOpacity]}
                                onValueChange={([value]) => handleSettingsUpdate({ innerShadowOpacity: value })}
                                min={0}
                                max={100}
                                step={5}
                                className="flex-1 [&_[role=slider]]:bg-red-600"
                              />
                              <span className="text-xs text-slate-400">{currentSettings.innerShadowOpacity}%</span>
                            </div>
                          </div>

                          {/* Inner Shadow Blend Mode */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Blend Mode</Label>
                            <Select value={currentSettings.innerShadowBlendMode} onValueChange={(value) => handleSettingsUpdate({ innerShadowBlendMode: value as any })}>
                              <SelectTrigger className="h-8 w-full text-xs bg-slate-700 border-slate-600 text-slate-200" data-testid="select-inner-shadow-blend-mode">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="multiply" className="text-slate-200 hover:bg-slate-700">Multiply</SelectItem>
                                <SelectItem value="darken" className="text-slate-200 hover:bg-slate-700">Darken</SelectItem>
                                <SelectItem value="overlay" className="text-slate-200 hover:bg-slate-700">Overlay</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Inner Glow Subsection */}
                    <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          checked={currentSettings.innerGlowEnabled}
                          onCheckedChange={(checked) => handleSettingsUpdate({ innerGlowEnabled: checked as boolean })}
                          className="border-slate-500 data-[state=checked]:bg-pink-500"
                          data-testid="checkbox-inner-glow-enabled"
                        />
                        <Label className="text-sm font-medium text-slate-200">Inner Glow</Label>
                      </div>

                      {currentSettings.innerGlowEnabled && (
                        <div className="space-y-3 mt-2">
                          {/* Inner Glow Probability */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Probability</Label>
                            <div className="flex items-center gap-2">
                              <NumericInput
                                value={currentSettings.innerGlowProbability}
                                onChange={(value) => handleSettingsUpdate({ innerGlowProbability: Math.max(0, Math.min(100, value)) })}
                                min={0}
                                max={100}
                                step={5}
                                className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                data-testid="input-inner-glow-probability"
                              />
                              <Slider
                                value={[currentSettings.innerGlowProbability]}
                                onValueChange={([value]) => handleSettingsUpdate({ innerGlowProbability: value })}
                                min={0}
                                max={100}
                                step={5}
                                className="flex-1 [&_[role=slider]]:bg-pink-500"
                              />
                            </div>
                          </div>

                          {/* Inner Glow Mode Selector */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Mode</Label>
                            <Select value={currentSettings.innerGlowBlurMode} onValueChange={(value) => {
                              handleSettingsUpdate({ 
                                innerGlowBlurMode: value as any,
                                innerGlowSpreadMode: value as any,
                              });
                            }}>
                              <SelectTrigger className="h-8 w-full text-xs bg-slate-700 border-slate-600 text-slate-200" data-testid="select-inner-glow-mode">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="define" className="text-slate-200 hover:bg-slate-700">Define (Fixed)</SelectItem>
                                <SelectItem value="range" className="text-slate-200 hover:bg-slate-700">Range (Random)</SelectItem>
                                <SelectItem value="incremental" className="text-slate-200 hover:bg-slate-700">Incremental</SelectItem>
                              </SelectContent>
                            </Select>
                            {currentSettings.innerGlowBlurMode === 'incremental' && (
                              <IndexDriverSelect
                                value={currentSettings.innerGlowIncrementalIndexDriver}
                                onChange={(value) => handleSettingsUpdate({ innerGlowIncrementalIndexDriver: value })}
                                testId="select-inner-glow-index-driver"
                              />
                            )}
                          </div>

                          {/* Inner Glow Blur */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Blur Radius</Label>
                            {currentSettings.innerGlowBlurMode === 'define' ? (
                              <div className="flex items-center gap-2">
                                <NumericInput
                                  value={currentSettings.innerGlowBlur}
                                  onChange={(value) => handleSettingsUpdate({ innerGlowBlur: value })}
                                  min={0}
                                  max={30}
                                  step={1}
                                  className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                  data-testid="input-inner-glow-blur"
                                />
                                <Slider
                                  value={[currentSettings.innerGlowBlur]}
                                  onValueChange={([value]) => handleSettingsUpdate({ innerGlowBlur: value })}
                                  min={0}
                                  max={30}
                                  step={1}
                                  className="flex-1 [&_[role=slider]]:bg-pink-500"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <NumericInput
                                  value={currentSettings.innerGlowBlurRange?.[0] ?? 3}
                                  onChange={(value) => handleSettingsUpdate({ innerGlowBlurRange: [value, currentSettings.innerGlowBlurRange?.[1] ?? 15] })}
                                  min={0}
                                  max={30}
                                  step={1}
                                  className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                />
                                <Slider
                                  value={currentSettings.innerGlowBlurRange || [3, 15]}
                                  onValueChange={(value) => handleSettingsUpdate({ innerGlowBlurRange: value as [number, number] })}
                                  min={0}
                                  max={30}
                                  step={1}
                                  className="flex-1 [&_[role=slider]]:bg-pink-500"
                                />
                                <NumericInput
                                  value={currentSettings.innerGlowBlurRange?.[1] ?? 15}
                                  onChange={(value) => handleSettingsUpdate({ innerGlowBlurRange: [currentSettings.innerGlowBlurRange?.[0] ?? 3, value] })}
                                  min={0}
                                  max={30}
                                  step={1}
                                  className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                />
                              </div>
                            )}
                          </div>

                          {/* Inner Glow Color */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium text-slate-300">Color</Label>
                              <Select value={currentSettings.innerGlowColorMode} onValueChange={(value) => handleSettingsUpdate({ innerGlowColorMode: value as any })}>
                                <SelectTrigger className="h-6 w-20 text-xs bg-slate-700 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="auto" className="text-slate-200 hover:bg-slate-700">Auto</SelectItem>
                                  <SelectItem value="custom" className="text-slate-200 hover:bg-slate-700">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {currentSettings.innerGlowColorMode === 'custom' && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={currentSettings.innerGlowCustomColor}
                                  onChange={(e) => handleSettingsUpdate({ innerGlowCustomColor: e.target.value })}
                                  className="h-8 w-8 rounded border border-slate-600 cursor-pointer"
                                  data-testid="input-inner-glow-color"
                                />
                                <span className="text-xs text-slate-400">{currentSettings.innerGlowCustomColor}</span>
                              </div>
                            )}
                            {currentSettings.innerGlowColorMode === 'auto' && (
                              <p className="text-xs text-slate-500">Color derived from shape fill (lightened)</p>
                            )}
                          </div>

                          {/* Inner Glow Opacity */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Opacity</Label>
                            <div className="flex items-center gap-2">
                              <NumericInput
                                value={currentSettings.innerGlowOpacity}
                                onChange={(value) => handleSettingsUpdate({ innerGlowOpacity: Math.max(0, Math.min(100, value)) })}
                                min={0}
                                max={100}
                                step={5}
                                className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                data-testid="input-inner-glow-opacity"
                              />
                              <Slider
                                value={[currentSettings.innerGlowOpacity]}
                                onValueChange={([value]) => handleSettingsUpdate({ innerGlowOpacity: value })}
                                min={0}
                                max={100}
                                step={5}
                                className="flex-1 [&_[role=slider]]:bg-pink-500"
                              />
                              <span className="text-xs text-slate-400">{currentSettings.innerGlowOpacity}%</span>
                            </div>
                          </div>

                          {/* Inner Glow Blend Mode */}
                          <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                            <Label className="text-xs font-medium text-slate-300">Blend Mode</Label>
                            <Select value={currentSettings.innerGlowBlendMode} onValueChange={(value) => handleSettingsUpdate({ innerGlowBlendMode: value as any })}>
                              <SelectTrigger className="h-8 w-full text-xs bg-slate-700 border-slate-600 text-slate-200" data-testid="select-inner-glow-blend-mode">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="screen" className="text-slate-200 hover:bg-slate-700">Screen</SelectItem>
                                <SelectItem value="lighter" className="text-slate-200 hover:bg-slate-700">Add (Lighter)</SelectItem>
                                <SelectItem value="soft-light" className="text-slate-200 hover:bg-slate-700">Soft Light</SelectItem>
                                <SelectItem value="color-dodge" className="text-slate-200 hover:bg-slate-700">Color Dodge</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Echo/Motion Trails Section */}
              <div className="space-y-3 border border-slate-600 rounded-lg p-3 bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={currentSettings.echoSpread?.enabled ?? false}
                      onCheckedChange={(checked) => handleSettingsUpdate({ 
                        echoSpread: { ...currentSettings.echoSpread, enabled: checked as boolean } 
                      })}
                      className="border-slate-500 data-[state=checked]:bg-cyan-600"
                      data-testid="checkbox-echo-enabled"
                    />
                    <Label className="text-sm font-medium text-slate-200">Echo/Motion Trails</Label>
                  </div>
                  <span className="text-xs text-slate-400">
                    {currentSettings.echoSpread?.enabled 
                      ? `${currentSettings.echoSpread?.echoCount ?? 3} echoes • ${
                          currentSettings.echoSpread?.directionMode === 'fixed-vector' ? 'Fixed' : 
                          currentSettings.echoSpread?.directionMode === 'auto-motion' ? 'Auto' : 
                          'Absolute'}` 
                      : 'Disabled'}
                  </span>
                </div>
                
                {currentSettings.echoSpread?.enabled && (
                  <div className="space-y-4 mt-3">
                    {/* Performance Warning for high echo counts */}
                    {(currentSettings.echoSpread?.echoCount ?? 3) >= 8 && (
                      <div className="flex items-start gap-2 p-2 bg-amber-900/30 border border-amber-600/50 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-200">
                          High echo count ({currentSettings.echoSpread?.echoCount ?? 3}) may impact performance. 
                          {(currentSettings.echoSpread?.scope === 'shape' || currentSettings.echoSpread?.scope === 'both') && (
                            <span className="block mt-1">
                              With shape-level scope, total rendered shapes = shapes × echoes per shape.
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                    
                    {/* Scope & Driver Row - with future options disabled */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Scope</Label>
                        <Select 
                          value={currentSettings.echoSpread?.scope ?? 'set'} 
                          onValueChange={(value) => handleSettingsUpdate({ 
                            echoSpread: { ...currentSettings.echoSpread, scope: value as any } 
                          })}
                        >
                          <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-slate-200 text-xs" data-testid="select-echo-scope">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                            <SelectItem value="set" className="text-slate-200 hover:bg-slate-700">Set Level</SelectItem>
                            <SelectItem value="shape" className="text-slate-200 hover:bg-slate-700">Shape Level</SelectItem>
                            <SelectItem value="both" className="text-slate-200 hover:bg-slate-700">
                              Both (Set + Shape)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Driver</Label>
                        <Select 
                          value={currentSettings.echoSpread?.driver ?? 'setRepIndex'} 
                          onValueChange={(value) => handleSettingsUpdate({ 
                            echoSpread: { ...currentSettings.echoSpread, driver: value as any } 
                          })}
                        >
                          <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-slate-200 text-xs" data-testid="select-echo-driver">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                            <SelectItem 
                              value="setRepIndex" 
                              className={`text-slate-200 hover:bg-slate-700 ${isSetRepIndexDisabled ? 'opacity-50' : ''}`}
                              disabled={isSetRepIndexDisabled}
                            >
                              Set Rep Index {isSetRepIndexDisabled && '(needs reps > 1)'}
                            </SelectItem>
                            <SelectItem value="shapeIndex" className="text-slate-200 hover:bg-slate-700">Shape Index</SelectItem>
                            <SelectItem 
                              value="combined" 
                              className={`text-slate-200 hover:bg-slate-700 ${isSetRepIndexDisabled ? 'opacity-50' : ''}`}
                              disabled={isSetRepIndexDisabled}
                            >
                              Combined (Shape + Set) {isSetRepIndexDisabled && '(needs reps > 1)'}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Both Scope Tabbed UI (Future: Project B) */}
                    {currentSettings.echoSpread?.scope === 'both' && (
                      <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-cyan-600/50">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-cyan-400">Dual Scope Configuration</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Apply Same Settings</span>
                            <Switch
                              checked={currentSettings.echoSpread?.syncBothScopes ?? true}
                              onCheckedChange={(checked) => handleSettingsUpdate({ 
                                echoSpread: { ...currentSettings.echoSpread, syncBothScopes: checked } 
                              })}
                              className="data-[state=checked]:bg-cyan-600"
                              data-testid="switch-echo-sync-scopes"
                            />
                          </div>
                        </div>
                        
                        {currentSettings.echoSpread?.syncBothScopes ? (
                          <p className="text-xs text-slate-400">
                            Settings below will apply to both Set-level and Shape-level echoes.
                          </p>
                        ) : (
                          <Tabs defaultValue="set" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-slate-800 h-8">
                              <TabsTrigger 
                                value="set" 
                                className="text-xs data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
                                data-testid="tab-echo-set"
                              >
                                Set Level
                              </TabsTrigger>
                              <TabsTrigger 
                                value="shape" 
                                className="text-xs data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
                                data-testid="tab-echo-shape"
                              >
                                Shape Level
                              </TabsTrigger>
                            </TabsList>
                            <TabsContent value="set" className="mt-2">
                              <p className="text-xs text-slate-400 p-2 bg-slate-800/50 rounded">
                                Set-level echo settings (applied per set repetition). Configure settings below.
                              </p>
                            </TabsContent>
                            <TabsContent value="shape" className="mt-2">
                              <p className="text-xs text-slate-400 p-2 bg-slate-800/50 rounded">
                                Shape-level echo settings (applied per individual shape). Configure settings below.
                              </p>
                            </TabsContent>
                          </Tabs>
                        )}
                      </div>
                    )}

                    {/* ApplyTo Filters (Shape-Level only) */}
                    {(currentSettings.echoSpread?.scope === 'shape') && (
                      <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-cyan-600/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={currentSettings.echoSpread?.applyTo?.enabled ?? false}
                              onCheckedChange={(checked) => handleSettingsUpdate({ 
                                echoSpread: { 
                                  ...currentSettings.echoSpread, 
                                  applyTo: { 
                                    enabled: checked as boolean,
                                    selector: currentSettings.echoSpread?.applyTo?.selector ?? 'all',
                                    indexStep: currentSettings.echoSpread?.applyTo?.indexStep ?? 2,
                                    probability: currentSettings.echoSpread?.applyTo?.probability ?? 100
                                  } 
                                } 
                              })}
                              className="border-slate-500 data-[state=checked]:bg-cyan-600"
                              data-testid="checkbox-echo-applyto-enabled"
                            />
                            <Label className="text-xs font-medium text-cyan-400">Shape Filters</Label>
                          </div>
                          <span className="text-xs text-slate-400">
                            {currentSettings.echoSpread?.applyTo?.enabled 
                              ? `${currentSettings.echoSpread?.applyTo?.selector ?? 'all'} • ${currentSettings.echoSpread?.applyTo?.probability ?? 100}%` 
                              : 'Apply to all'}
                          </span>
                        </div>
                        
                        {currentSettings.echoSpread?.applyTo?.enabled && (
                          <div className="space-y-3">
                            {/* Selector Mode */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-400">Selector</Label>
                                <Select 
                                  value={currentSettings.echoSpread?.applyTo?.selector ?? 'all'} 
                                  onValueChange={(value) => handleSettingsUpdate({ 
                                    echoSpread: { 
                                      ...currentSettings.echoSpread, 
                                      applyTo: { 
                                        enabled: currentSettings.echoSpread?.applyTo?.enabled ?? false,
                                        selector: value as 'all' | 'even' | 'odd' | 'step',
                                        indexStep: currentSettings.echoSpread?.applyTo?.indexStep ?? 2,
                                        probability: currentSettings.echoSpread?.applyTo?.probability ?? 100
                                      } 
                                    } 
                                  })}
                                >
                                  <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-200 text-xs" data-testid="select-echo-applyto-selector">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                    <SelectItem value="all" className="text-slate-200 hover:bg-slate-700">All Shapes</SelectItem>
                                    <SelectItem value="even" className="text-slate-200 hover:bg-slate-700">Even Indices</SelectItem>
                                    <SelectItem value="odd" className="text-slate-200 hover:bg-slate-700">Odd Indices</SelectItem>
                                    <SelectItem value="step" className="text-slate-200 hover:bg-slate-700">Step Interval</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {currentSettings.echoSpread?.applyTo?.selector === 'step' && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-400">Step</Label>
                                  <NumericInput
                                    value={currentSettings.echoSpread?.applyTo?.indexStep ?? 2}
                                    onChange={(value) => handleSettingsUpdate({ 
                                      echoSpread: { 
                                        ...currentSettings.echoSpread, 
                                        applyTo: { 
                                          enabled: currentSettings.echoSpread?.applyTo?.enabled ?? false,
                                          selector: currentSettings.echoSpread?.applyTo?.selector ?? 'step',
                                          indexStep: Math.max(1, Math.min(100, value)),
                                          probability: currentSettings.echoSpread?.applyTo?.probability ?? 100
                                        } 
                                      } 
                                    })}
                                    min={1}
                                    max={100}
                                    step={1}
                                    className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                    data-testid="input-echo-applyto-step"
                                  />
                                </div>
                              )}
                            </div>
                            
                            {/* Probability */}
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-400">Probability ({currentSettings.echoSpread?.applyTo?.probability ?? 100}%)</Label>
                              <Slider
                                value={[currentSettings.echoSpread?.applyTo?.probability ?? 100]}
                                onValueChange={([value]) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    applyTo: { 
                                      enabled: currentSettings.echoSpread?.applyTo?.enabled ?? false,
                                      selector: currentSettings.echoSpread?.applyTo?.selector ?? 'all',
                                      indexStep: currentSettings.echoSpread?.applyTo?.indexStep ?? 2,
                                      probability: value
                                    } 
                                  } 
                                })}
                                min={0}
                                max={100}
                                step={5}
                                className="flex-1 [&_[role=slider]]:bg-cyan-600"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Echo Count & Direction Mode */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-400">Echo Count</Label>
                        <div className="flex items-center gap-2">
                          <NumericInput
                            value={currentSettings.echoSpread?.echoCount ?? 3}
                            onChange={(value) => handleSettingsUpdate({ 
                              echoSpread: { ...currentSettings.echoSpread, echoCount: Math.max(1, Math.min(20, value)) } 
                            })}
                            min={1}
                            max={20}
                            step={1}
                            className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                            data-testid="input-echo-count"
                          />
                          <Slider
                            value={[currentSettings.echoSpread?.echoCount ?? 3]}
                            onValueChange={([value]) => handleSettingsUpdate({ 
                              echoSpread: { ...currentSettings.echoSpread, echoCount: value } 
                            })}
                            min={1}
                            max={20}
                            step={1}
                            className="flex-1 [&_[role=slider]]:bg-cyan-600"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Direction Mode</Label>
                        <Select 
                          value={currentSettings.echoSpread?.directionMode ?? 'fixed-vector'} 
                          onValueChange={(value) => handleSettingsUpdate({ 
                            echoSpread: { ...currentSettings.echoSpread, directionMode: value as any } 
                          })}
                        >
                          <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-slate-200 text-xs" data-testid="select-echo-direction-mode">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                            <SelectItem value="fixed-vector" className="text-slate-200 hover:bg-slate-700">Fixed Vector</SelectItem>
                            <SelectItem value="auto-motion" className="text-slate-200 hover:bg-slate-700">Auto Motion</SelectItem>
                            <SelectItem value="absolute-position" className="text-slate-200 hover:bg-slate-700">Absolute Position</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Fixed Vector Controls */}
                    {currentSettings.echoSpread?.directionMode === 'fixed-vector' && (
                      <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                        <Label className="text-xs font-medium text-slate-300">Fixed Vector Settings</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-400">Angle (0-360°)</Label>
                            <div className="flex items-center gap-2">
                              <NumericInput
                                value={currentSettings.echoSpread?.fixedVector?.angle ?? 45}
                                onChange={(value) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    fixedVector: { ...currentSettings.echoSpread?.fixedVector, angle: Math.max(0, Math.min(360, value)) } 
                                  } 
                                })}
                                min={0}
                                max={360}
                                step={1}
                                className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                data-testid="input-echo-angle"
                              />
                              <Slider
                                value={[currentSettings.echoSpread?.fixedVector?.angle ?? 45]}
                                onValueChange={([value]) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    fixedVector: { ...currentSettings.echoSpread?.fixedVector, angle: value } 
                                  } 
                                })}
                                min={0}
                                max={360}
                                step={1}
                                className="flex-1 [&_[role=slider]]:bg-cyan-600"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-400">Distance (px)</Label>
                            <div className="flex items-center gap-2">
                              <NumericInput
                                value={currentSettings.echoSpread?.fixedVector?.distance ?? 20}
                                onChange={(value) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    fixedVector: { ...currentSettings.echoSpread?.fixedVector, distance: Math.max(0, Math.min(500, value)) } 
                                  } 
                                })}
                                min={0}
                                max={500}
                                step={1}
                                className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                data-testid="input-echo-distance"
                              />
                              <Slider
                                value={[currentSettings.echoSpread?.fixedVector?.distance ?? 20]}
                                onValueChange={([value]) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    fixedVector: { ...currentSettings.echoSpread?.fixedVector, distance: value } 
                                  } 
                                })}
                                min={0}
                                max={500}
                                step={1}
                                className="flex-1 [&_[role=slider]]:bg-cyan-600"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Auto Motion Controls */}
                    {currentSettings.echoSpread?.directionMode === 'auto-motion' && (
                      <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                        <Label className="text-xs font-medium text-slate-300">Auto Motion Settings</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-400">Fallback Angle</Label>
                            <div className="flex items-center gap-2">
                              <NumericInput
                                value={currentSettings.echoSpread?.autoMotion?.fallbackAngle ?? 45}
                                onChange={(value) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    autoMotion: { ...currentSettings.echoSpread?.autoMotion, fallbackAngle: Math.max(0, Math.min(360, value)) } 
                                  } 
                                })}
                                min={0}
                                max={360}
                                step={1}
                                className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                data-testid="input-echo-fallback-angle"
                              />
                              <Slider
                                value={[currentSettings.echoSpread?.autoMotion?.fallbackAngle ?? 45]}
                                onValueChange={([value]) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    autoMotion: { ...currentSettings.echoSpread?.autoMotion, fallbackAngle: value } 
                                  } 
                                })}
                                min={0}
                                max={360}
                                step={1}
                                className="flex-1 [&_[role=slider]]:bg-cyan-600"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-400">Distance Multiplier</Label>
                            <div className="flex items-center gap-2">
                              <NumericInput
                                value={currentSettings.echoSpread?.autoMotion?.distanceMultiplier ?? 1.0}
                                onChange={(value) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    autoMotion: { ...currentSettings.echoSpread?.autoMotion, distanceMultiplier: Math.max(0.1, Math.min(5, value)) } 
                                  } 
                                })}
                                min={0.1}
                                max={5}
                                step={0.1}
                                className="h-8 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                data-testid="input-echo-distance-multiplier"
                              />
                              <Slider
                                value={[currentSettings.echoSpread?.autoMotion?.distanceMultiplier ?? 1.0]}
                                onValueChange={([value]) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    autoMotion: { ...currentSettings.echoSpread?.autoMotion, distanceMultiplier: value } 
                                  } 
                                })}
                                min={0.1}
                                max={5}
                                step={0.1}
                                className="flex-1 [&_[role=slider]]:bg-cyan-600"
                              />
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500">Direction derived from set position changes. Fallback used when no motion detected.</p>
                      </div>
                    )}

                    {/* Absolute Position Controls */}
                    {currentSettings.echoSpread?.directionMode === 'absolute-position' && (
                      <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                        <Label className="text-xs font-medium text-slate-300">Absolute Position Settings</Label>
                        
                        {/* Mode: Converge/Diverge */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-400">Effect Mode</Label>
                            <Select 
                              value={currentSettings.echoSpread?.absolutePosition?.mode ?? 'converge'} 
                              onValueChange={(value) => handleSettingsUpdate({ 
                                echoSpread: { 
                                  ...currentSettings.echoSpread, 
                                  absolutePosition: { 
                                    ...currentSettings.echoSpread?.absolutePosition, 
                                    mode: value as 'converge' | 'diverge' 
                                  } 
                                } 
                              })}
                            >
                              <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-slate-200 text-xs" data-testid="select-echo-abs-mode">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                <SelectItem value="converge" className="text-slate-200 hover:bg-slate-700">Converge (toward target)</SelectItem>
                                <SelectItem value="diverge" className="text-slate-200 hover:bg-slate-700">Diverge (away from target)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-400">Distance per Echo</Label>
                            <div className="flex items-center gap-2">
                              <NumericInput
                                value={currentSettings.echoSpread?.fixedVector?.distance ?? 20}
                                onChange={(value) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    fixedVector: { ...currentSettings.echoSpread?.fixedVector, distance: Math.max(0, Math.min(500, value)) } 
                                  } 
                                })}
                                min={0}
                                max={500}
                                step={5}
                                className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                data-testid="input-echo-abs-distance"
                              />
                              <Slider
                                value={[currentSettings.echoSpread?.fixedVector?.distance ?? 20]}
                                onValueChange={([value]) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    fixedVector: { ...currentSettings.echoSpread?.fixedVector, distance: value } 
                                  } 
                                })}
                                min={0}
                                max={500}
                                step={5}
                                className="flex-1 [&_[role=slider]]:bg-cyan-600"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Artboard Target Selection */}
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-400">Artboard Target</Label>
                          <Select 
                            value={currentSettings.echoSpread?.absolutePosition?.artboardTarget ?? 'center'} 
                            onValueChange={(value) => handleSettingsUpdate({ 
                              echoSpread: { 
                                ...currentSettings.echoSpread, 
                                absolutePosition: { 
                                  ...currentSettings.echoSpread?.absolutePosition, 
                                  artboardTarget: value as any 
                                } 
                              } 
                            })}
                          >
                            <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-slate-200 text-xs" data-testid="select-echo-artboard-target">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                              <SelectItem value="center" className="text-slate-200 hover:bg-slate-700">Center</SelectItem>
                              <SelectItem value="top-left" className="text-slate-200 hover:bg-slate-700">Top Left</SelectItem>
                              <SelectItem value="top-right" className="text-slate-200 hover:bg-slate-700">Top Right</SelectItem>
                              <SelectItem value="bottom-right" className="text-slate-200 hover:bg-slate-700">Bottom Right</SelectItem>
                              <SelectItem value="bottom-left" className="text-slate-200 hover:bg-slate-700">Bottom Left</SelectItem>
                              <SelectItem value="custom" className="text-slate-200 hover:bg-slate-700">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {currentSettings.echoSpread?.absolutePosition?.artboardTarget === 'custom' && (
                            <div className="grid grid-cols-2 gap-3 mt-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-400">Target X (artboard-relative)</Label>
                                <NumericInput
                                  value={currentSettings.echoSpread?.absolutePosition?.targetX ?? 0}
                                  onChange={(value) => handleSettingsUpdate({ 
                                    echoSpread: { 
                                      ...currentSettings.echoSpread, 
                                      absolutePosition: { 
                                        ...currentSettings.echoSpread?.absolutePosition, 
                                        targetX: value 
                                      } 
                                    } 
                                  })}
                                  className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                  data-testid="input-echo-target-x"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-slate-400">Target Y (artboard-relative)</Label>
                                <NumericInput
                                  value={currentSettings.echoSpread?.absolutePosition?.targetY ?? 0}
                                  onChange={(value) => handleSettingsUpdate({ 
                                    echoSpread: { 
                                      ...currentSettings.echoSpread, 
                                      absolutePosition: { 
                                        ...currentSettings.echoSpread?.absolutePosition, 
                                        targetY: value 
                                      } 
                                    } 
                                  })}
                                  className="h-8 w-full bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                  data-testid="input-echo-target-y"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-xs text-slate-500">
                          {currentSettings.echoSpread?.absolutePosition?.mode === 'converge' 
                            ? 'Echoes trail toward the target point (gravity effect).' 
                            : 'Echoes trail away from the target point (explosion effect).'}
                        </p>
                      </div>
                    )}

                    {/* Per-Echo Effects */}
                    <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                      <Label className="text-xs font-medium text-slate-300">Per-Echo Effects</Label>
                      
                      {/* Opacity Controls */}
                      <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={currentSettings.echoSpread?.opacity?.enabled ?? true}
                            onCheckedChange={(checked) => handleSettingsUpdate({ 
                              echoSpread: { 
                                ...currentSettings.echoSpread, 
                                opacity: { ...currentSettings.echoSpread?.opacity, enabled: checked as boolean } 
                              } 
                            })}
                            className="border-slate-500 data-[state=checked]:bg-cyan-600"
                            data-testid="checkbox-echo-opacity-enabled"
                          />
                          <Label className="text-xs text-slate-400">Opacity</Label>
                        </div>
                        {currentSettings.echoSpread?.opacity?.enabled !== false && (
                          <>
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <span className="text-xs text-slate-500">Start %</span>
                            <div className="flex items-center gap-2">
                              <NumericInput
                                value={currentSettings.echoSpread?.opacity?.startOpacity ?? 80}
                                onChange={(value) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    opacity: { ...currentSettings.echoSpread?.opacity, startOpacity: Math.max(0, Math.min(100, value)) } 
                                  } 
                                })}
                                min={0}
                                max={100}
                                step={5}
                                className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                data-testid="input-echo-opacity-start"
                              />
                              <Slider
                                value={[currentSettings.echoSpread?.opacity?.startOpacity ?? 80]}
                                onValueChange={([value]) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    opacity: { ...currentSettings.echoSpread?.opacity, startOpacity: value } 
                                  } 
                                })}
                                min={0}
                                max={100}
                                step={5}
                                className="flex-1 [&_[role=slider]]:bg-cyan-600"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-slate-500">Falloff %</span>
                            <div className="flex items-center gap-2">
                              <NumericInput
                                value={currentSettings.echoSpread?.opacity?.falloffRate ?? 25}
                                onChange={(value) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    opacity: { ...currentSettings.echoSpread?.opacity, falloffRate: Math.max(0, Math.min(100, value)) } 
                                  } 
                                })}
                                min={0}
                                max={100}
                                step={5}
                                className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                data-testid="input-echo-opacity-falloff"
                              />
                              <Slider
                                value={[currentSettings.echoSpread?.opacity?.falloffRate ?? 25]}
                                onValueChange={([value]) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    opacity: { ...currentSettings.echoSpread?.opacity, falloffRate: value } 
                                  } 
                                })}
                                min={0}
                                max={100}
                                step={5}
                                className="flex-1 [&_[role=slider]]:bg-cyan-600"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-slate-500">Min %</span>
                            <div className="flex items-center gap-2">
                              <NumericInput
                                value={currentSettings.echoSpread?.opacity?.minOpacity ?? 5}
                                onChange={(value) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    opacity: { ...currentSettings.echoSpread?.opacity, minOpacity: Math.max(0, Math.min(100, value)) } 
                                  } 
                                })}
                                min={0}
                                max={100}
                                step={5}
                                className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                data-testid="input-echo-opacity-min"
                              />
                              <Slider
                                value={[currentSettings.echoSpread?.opacity?.minOpacity ?? 5]}
                                onValueChange={([value]) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    opacity: { ...currentSettings.echoSpread?.opacity, minOpacity: value } 
                                  } 
                                })}
                                min={0}
                                max={100}
                                step={5}
                                className="flex-1 [&_[role=slider]]:bg-cyan-600"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Checkbox
                            checked={currentSettings.echoSpread?.opacity?.jitter?.enabled ?? false}
                            onCheckedChange={(checked) => handleSettingsUpdate({ 
                              echoSpread: { 
                                ...currentSettings.echoSpread, 
                                opacity: { 
                                  ...currentSettings.echoSpread?.opacity, 
                                  jitter: { ...currentSettings.echoSpread?.opacity?.jitter, enabled: checked as boolean } 
                                } 
                              } 
                            })}
                            className="border-slate-500 data-[state=checked]:bg-cyan-600"
                            data-testid="checkbox-echo-opacity-jitter"
                          />
                          <span className="text-xs text-slate-400">Jitter</span>
                        </div>
                        {currentSettings.echoSpread?.opacity?.jitter?.enabled && (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Mode:</span>
                              <Select
                                value={currentSettings.echoSpread?.opacity?.jitter?.mode ?? 'fixed'} 
                                onValueChange={(value) => {
                                  const mode = value as 'fixed' | 'range';
                                  const currentJitter = currentSettings.echoSpread?.opacity?.jitter ?? {};
                                  const safeJitter = {
                                    enabled: currentJitter.enabled ?? true,
                                    mode,
                                    fixedAmount: currentJitter.fixedAmount ?? 10,
                                    rangeMin: currentJitter.rangeMin ?? 0,
                                    rangeMax: currentJitter.rangeMax ?? 20,
                                  };
                                  handleSettingsUpdate({ 
                                    echoSpread: { 
                                      ...currentSettings.echoSpread, 
                                      opacity: { 
                                        ...currentSettings.echoSpread?.opacity, 
                                        jitter: safeJitter
                                      } 
                                    } 
                                  });
                                }}
                              >
                                <SelectTrigger className="h-7 w-24 bg-slate-800 border-slate-600 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent style={{ zIndex: 10002 }}>
                                  <SelectItem value="fixed">Fixed</SelectItem>
                                  <SelectItem value="range">Range</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {(currentSettings.echoSpread?.opacity?.jitter?.mode ?? 'fixed') === 'fixed' ? (
                              <div className="space-y-1">
                                <span className="text-xs text-slate-500">Fixed Amount (±%)</span>
                                <div className="flex items-center gap-2">
                                  <NumericInput
                                    value={currentSettings.echoSpread?.opacity?.jitter?.fixedAmount ?? 0}
                                    onChange={(value) => handleSettingsUpdate({ 
                                      echoSpread: { 
                                        ...currentSettings.echoSpread, 
                                        opacity: { 
                                          ...currentSettings.echoSpread?.opacity, 
                                          jitter: { ...currentSettings.echoSpread?.opacity?.jitter, fixedAmount: Math.max(0, Math.min(100, value)) } 
                                        } 
                                      } 
                                    })}
                                    min={0}
                                    max={100}
                                    step={5}
                                    className="h-9 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                    data-testid="input-echo-opacity-jitter-fixed"
                                  />
                                  <Slider
                                    value={[currentSettings.echoSpread?.opacity?.jitter?.fixedAmount ?? 0]}
                                    onValueChange={([value]) => handleSettingsUpdate({ 
                                      echoSpread: { 
                                        ...currentSettings.echoSpread, 
                                        opacity: { 
                                          ...currentSettings.echoSpread?.opacity, 
                                          jitter: { ...currentSettings.echoSpread?.opacity?.jitter, fixedAmount: value } 
                                        } 
                                      } 
                                    })}
                                    min={0}
                                    max={100}
                                    step={5}
                                    className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="text-xs text-slate-500">Jitter Range (%)</span>
                                <BufferedRangeSliderWithNumericInputs
                                  value={[currentSettings.echoSpread?.opacity?.jitter?.rangeMin ?? 0, currentSettings.echoSpread?.opacity?.jitter?.rangeMax ?? 20]}
                                  onValueCommit={([minVal, maxVal]) => handleSettingsUpdate({ 
                                    echoSpread: { 
                                      ...currentSettings.echoSpread, 
                                      opacity: { 
                                        ...currentSettings.echoSpread?.opacity, 
                                        jitter: { ...currentSettings.echoSpread?.opacity?.jitter, rangeMin: minVal, rangeMax: maxVal } 
                                      } 
                                    } 
                                  })}
                                  min={-100}
                                  max={100}
                                  step={5}
                                  inputClassName="h-9 min-w-[80px] bg-slate-800 border-slate-600 text-slate-200 text-xs"
                                  sliderClassName="[&_[role=slider]]:bg-cyan-600"
                                />
                              </div>
                            )}
                          </div>
                        )}
                        </>
                      )}
                      </div>

                      {/* Blur Controls */}
                      <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={currentSettings.echoSpread?.blur?.enabled ?? false}
                            onCheckedChange={(checked) => handleSettingsUpdate({ 
                              echoSpread: { 
                                ...currentSettings.echoSpread, 
                                blur: { ...currentSettings.echoSpread?.blur, enabled: checked as boolean } 
                              } 
                            })}
                            className="border-slate-500 data-[state=checked]:bg-cyan-600"
                            data-testid="checkbox-echo-blur-enabled"
                          />
                          <Label className="text-xs text-slate-400">Blur</Label>
                        </div>
                        {currentSettings.echoSpread?.blur?.enabled && (
                          <>
                            <div className="space-y-2 mt-2">
                              <div className="space-y-1">
                                <span className="text-xs text-slate-500">Start px</span>
                                <div className="flex items-center gap-2">
                                  <NumericInput
                                    value={currentSettings.echoSpread?.blur?.startBlur ?? 0}
                                    onChange={(value) => handleSettingsUpdate({ 
                                      echoSpread: { 
                                        ...currentSettings.echoSpread, 
                                        blur: { ...currentSettings.echoSpread?.blur, startBlur: Math.max(0, Math.min(50, value)) } 
                                      } 
                                    })}
                                    min={0}
                                    max={50}
                                    step={1}
                                    className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                    data-testid="input-echo-blur-start"
                                  />
                                  <Slider
                                    value={[currentSettings.echoSpread?.blur?.startBlur ?? 0]}
                                    onValueChange={([value]) => handleSettingsUpdate({ 
                                      echoSpread: { 
                                        ...currentSettings.echoSpread, 
                                        blur: { ...currentSettings.echoSpread?.blur, startBlur: value } 
                                      } 
                                    })}
                                    min={0}
                                    max={50}
                                    step={1}
                                    className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs text-slate-500">Delta px</span>
                                <div className="flex items-center gap-2">
                                  <NumericInput
                                    value={currentSettings.echoSpread?.blur?.blurDelta ?? 2}
                                    onChange={(value) => handleSettingsUpdate({ 
                                      echoSpread: { 
                                        ...currentSettings.echoSpread, 
                                        blur: { ...currentSettings.echoSpread?.blur, blurDelta: Math.max(0, Math.min(20, value)) } 
                                      } 
                                    })}
                                    min={0}
                                    max={20}
                                    step={0.5}
                                    className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                    data-testid="input-echo-blur-delta"
                                  />
                                  <Slider
                                    value={[currentSettings.echoSpread?.blur?.blurDelta ?? 2]}
                                    onValueChange={([value]) => handleSettingsUpdate({ 
                                      echoSpread: { 
                                        ...currentSettings.echoSpread, 
                                        blur: { ...currentSettings.echoSpread?.blur, blurDelta: value } 
                                      } 
                                    })}
                                    min={0}
                                    max={20}
                                    step={0.5}
                                    className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs text-slate-500">Max px</span>
                                <div className="flex items-center gap-2">
                                  <NumericInput
                                    value={currentSettings.echoSpread?.blur?.maxBlur ?? 20}
                                    onChange={(value) => handleSettingsUpdate({ 
                                      echoSpread: { 
                                        ...currentSettings.echoSpread, 
                                        blur: { ...currentSettings.echoSpread?.blur, maxBlur: Math.max(0, Math.min(100, value)) } 
                                      } 
                                    })}
                                    min={0}
                                    max={100}
                                    step={1}
                                    className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                    data-testid="input-echo-blur-max"
                                  />
                                  <Slider
                                    value={[currentSettings.echoSpread?.blur?.maxBlur ?? 20]}
                                    onValueChange={([value]) => handleSettingsUpdate({ 
                                      echoSpread: { 
                                        ...currentSettings.echoSpread, 
                                        blur: { ...currentSettings.echoSpread?.blur, maxBlur: value } 
                                      } 
                                    })}
                                    min={0}
                                    max={100}
                                    step={1}
                                    className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Checkbox
                                checked={currentSettings.echoSpread?.blur?.jitter?.enabled ?? false}
                                onCheckedChange={(checked) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    blur: { 
                                      ...currentSettings.echoSpread?.blur, 
                                      jitter: { ...currentSettings.echoSpread?.blur?.jitter, enabled: checked as boolean } 
                                    } 
                                  } 
                                })}
                                className="border-slate-500 data-[state=checked]:bg-cyan-600"
                                data-testid="checkbox-echo-blur-jitter"
                              />
                              <span className="text-xs text-slate-400">Jitter</span>
                            </div>
                            {currentSettings.echoSpread?.blur?.jitter?.enabled && (
                              <div className="mt-2 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500">Mode:</span>
                                  <Select
                                    value={currentSettings.echoSpread?.blur?.jitter?.mode ?? 'fixed'} 
                                    onValueChange={(value) => {
                                      const mode = value as 'fixed' | 'range';
                                      const currentJitter = currentSettings.echoSpread?.blur?.jitter ?? {};
                                      const safeJitter = {
                                        enabled: currentJitter.enabled ?? true,
                                        mode,
                                        fixedAmount: currentJitter.fixedAmount ?? 5,
                                        rangeMin: currentJitter.rangeMin ?? 0,
                                        rangeMax: currentJitter.rangeMax ?? 10,
                                      };
                                      handleSettingsUpdate({ 
                                        echoSpread: { 
                                          ...currentSettings.echoSpread, 
                                          blur: { 
                                            ...currentSettings.echoSpread?.blur, 
                                            jitter: safeJitter
                                          } 
                                        } 
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-7 w-24 bg-slate-800 border-slate-600 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent style={{ zIndex: 10002 }}>
                                      <SelectItem value="fixed">Fixed</SelectItem>
                                      <SelectItem value="range">Range</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {(currentSettings.echoSpread?.blur?.jitter?.mode ?? 'fixed') === 'fixed' ? (
                                  <div className="space-y-1">
                                    <span className="text-xs text-slate-500">Fixed Amount (±px)</span>
                                    <div className="flex items-center gap-2">
                                      <NumericInput
                                        value={currentSettings.echoSpread?.blur?.jitter?.fixedAmount ?? 0}
                                        onChange={(value) => handleSettingsUpdate({ 
                                          echoSpread: { 
                                            ...currentSettings.echoSpread, 
                                            blur: { 
                                              ...currentSettings.echoSpread?.blur, 
                                              jitter: { ...currentSettings.echoSpread?.blur?.jitter, fixedAmount: Math.max(0, Math.min(50, value)) } 
                                            } 
                                          } 
                                        })}
                                        min={0}
                                        max={50}
                                        step={1}
                                        className="h-9 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                        data-testid="input-echo-blur-jitter-fixed"
                                      />
                                      <Slider
                                        value={[currentSettings.echoSpread?.blur?.jitter?.fixedAmount ?? 0]}
                                        onValueChange={([value]) => handleSettingsUpdate({ 
                                          echoSpread: { 
                                            ...currentSettings.echoSpread, 
                                            blur: { 
                                              ...currentSettings.echoSpread?.blur, 
                                              jitter: { ...currentSettings.echoSpread?.blur?.jitter, fixedAmount: value } 
                                            } 
                                          } 
                                        })}
                                        min={0}
                                        max={50}
                                        step={1}
                                        className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <span className="text-xs text-slate-500">Jitter Range (px)</span>
                                    <BufferedRangeSliderWithNumericInputs
                                      value={[currentSettings.echoSpread?.blur?.jitter?.rangeMin ?? 0, currentSettings.echoSpread?.blur?.jitter?.rangeMax ?? 10]}
                                      onValueCommit={([minVal, maxVal]) => handleSettingsUpdate({ 
                                        echoSpread: { 
                                          ...currentSettings.echoSpread, 
                                          blur: { 
                                            ...currentSettings.echoSpread?.blur, 
                                            jitter: { ...currentSettings.echoSpread?.blur?.jitter, rangeMin: minVal, rangeMax: maxVal } 
                                          } 
                                        } 
                                      })}
                                      min={-50}
                                      max={50}
                                      step={1}
                                      inputClassName="h-9 min-w-[80px] bg-slate-800 border-slate-600 text-slate-200 text-xs"
                                      sliderClassName="[&_[role=slider]]:bg-cyan-600"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Scale Controls */}
                      <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={currentSettings.echoSpread?.scale?.enabled ?? false}
                            onCheckedChange={(checked) => handleSettingsUpdate({ 
                              echoSpread: { 
                                ...currentSettings.echoSpread, 
                                scale: { ...currentSettings.echoSpread?.scale, enabled: checked as boolean } 
                              } 
                            })}
                            className="border-slate-500 data-[state=checked]:bg-cyan-600"
                            data-testid="checkbox-echo-scale-enabled"
                          />
                          <Label className="text-xs text-slate-400">Scale</Label>
                        </div>
                        {currentSettings.echoSpread?.scale?.enabled && (
                          <>
                            <div className="space-y-2 mt-2">
                              <div className="space-y-1">
                                <span className="text-xs text-slate-500">Start %</span>
                                <div className="flex items-center gap-2">
                                  <NumericInput
                                    value={currentSettings.echoSpread?.scale?.startScale ?? 100}
                                    onChange={(value) => handleSettingsUpdate({ 
                                      echoSpread: { 
                                        ...currentSettings.echoSpread, 
                                        scale: { ...currentSettings.echoSpread?.scale, startScale: Math.max(10, Math.min(200, value)) } 
                                      } 
                                    })}
                                    min={10}
                                    max={200}
                                    step={5}
                                    className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                    data-testid="input-echo-scale-start"
                                  />
                                  <Slider
                                    value={[currentSettings.echoSpread?.scale?.startScale ?? 100]}
                                    onValueChange={([value]) => handleSettingsUpdate({ 
                                      echoSpread: { 
                                        ...currentSettings.echoSpread, 
                                        scale: { ...currentSettings.echoSpread?.scale, startScale: value } 
                                      } 
                                    })}
                                    min={10}
                                    max={200}
                                    step={5}
                                    className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs text-slate-500">Delta %</span>
                                <div className="flex items-center gap-2">
                                  <NumericInput
                                    value={currentSettings.echoSpread?.scale?.scaleDelta ?? -10}
                                    onChange={(value) => handleSettingsUpdate({ 
                                      echoSpread: { 
                                        ...currentSettings.echoSpread, 
                                        scale: { ...currentSettings.echoSpread?.scale, scaleDelta: Math.max(-50, Math.min(50, value)) } 
                                      } 
                                    })}
                                    min={-50}
                                    max={50}
                                    step={5}
                                    className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                    data-testid="input-echo-scale-delta"
                                  />
                                  <Slider
                                    value={[currentSettings.echoSpread?.scale?.scaleDelta ?? -10]}
                                    onValueChange={([value]) => handleSettingsUpdate({ 
                                      echoSpread: { 
                                        ...currentSettings.echoSpread, 
                                        scale: { ...currentSettings.echoSpread?.scale, scaleDelta: value } 
                                      } 
                                    })}
                                    min={-50}
                                    max={50}
                                    step={5}
                                    className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1 mt-2">
                              <span className="text-xs text-slate-500">Scale Range (min-max %)</span>
                              <BufferedRangeSliderWithNumericInputs
                                value={[currentSettings.echoSpread?.scale?.minScale ?? 10, currentSettings.echoSpread?.scale?.maxScale ?? 200]}
                                onValueCommit={([minVal, maxVal]) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    scale: { ...currentSettings.echoSpread?.scale, minScale: minVal, maxScale: maxVal } 
                                  } 
                                })}
                                min={1}
                                max={500}
                                step={5}
                                inputClassName="h-9 min-w-[80px] bg-slate-800 border-slate-600 text-slate-200 text-xs"
                                sliderClassName="[&_[role=slider]]:bg-cyan-600"
                              />
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Checkbox
                                checked={currentSettings.echoSpread?.scale?.jitter?.enabled ?? false}
                                onCheckedChange={(checked) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    scale: { 
                                      ...currentSettings.echoSpread?.scale, 
                                      jitter: { ...currentSettings.echoSpread?.scale?.jitter, enabled: checked as boolean } 
                                    } 
                                  } 
                                })}
                                className="border-slate-500 data-[state=checked]:bg-cyan-600"
                                data-testid="checkbox-echo-scale-jitter"
                              />
                              <span className="text-xs text-slate-400">Jitter</span>
                            </div>
                            {currentSettings.echoSpread?.scale?.jitter?.enabled && (
                              <div className="mt-2 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500">Mode:</span>
                                  <Select
                                    value={currentSettings.echoSpread?.scale?.jitter?.mode ?? 'fixed'} 
                                    onValueChange={(value) => {
                                      const mode = value as 'fixed' | 'range';
                                      const currentJitter = currentSettings.echoSpread?.scale?.jitter ?? {};
                                      const safeJitter = {
                                        enabled: currentJitter.enabled ?? true,
                                        mode,
                                        fixedAmount: currentJitter.fixedAmount ?? 10,
                                        rangeMin: currentJitter.rangeMin ?? 0,
                                        rangeMax: currentJitter.rangeMax ?? 20,
                                      };
                                      handleSettingsUpdate({ 
                                        echoSpread: { 
                                          ...currentSettings.echoSpread, 
                                          scale: { 
                                            ...currentSettings.echoSpread?.scale, 
                                            jitter: safeJitter
                                          } 
                                        } 
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-7 w-24 bg-slate-800 border-slate-600 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent style={{ zIndex: 10002 }}>
                                      <SelectItem value="fixed">Fixed</SelectItem>
                                      <SelectItem value="range">Range</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {(currentSettings.echoSpread?.scale?.jitter?.mode ?? 'fixed') === 'fixed' ? (
                                  <div className="space-y-1">
                                    <span className="text-xs text-slate-500">Fixed Amount (±%)</span>
                                    <div className="flex items-center gap-2">
                                      <NumericInput
                                        value={currentSettings.echoSpread?.scale?.jitter?.fixedAmount ?? 0}
                                        onChange={(value) => handleSettingsUpdate({ 
                                          echoSpread: { 
                                            ...currentSettings.echoSpread, 
                                            scale: { 
                                              ...currentSettings.echoSpread?.scale, 
                                              jitter: { ...currentSettings.echoSpread?.scale?.jitter, fixedAmount: Math.max(0, Math.min(100, value)) } 
                                            } 
                                          } 
                                        })}
                                        min={0}
                                        max={100}
                                        step={5}
                                        className="h-9 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                        data-testid="input-echo-scale-jitter-fixed"
                                      />
                                      <Slider
                                        value={[currentSettings.echoSpread?.scale?.jitter?.fixedAmount ?? 0]}
                                        onValueChange={([value]) => handleSettingsUpdate({ 
                                          echoSpread: { 
                                            ...currentSettings.echoSpread, 
                                            scale: { 
                                              ...currentSettings.echoSpread?.scale, 
                                              jitter: { ...currentSettings.echoSpread?.scale?.jitter, fixedAmount: value } 
                                            } 
                                          } 
                                        })}
                                        min={0}
                                        max={100}
                                        step={5}
                                        className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <span className="text-xs text-slate-500">Jitter Range (%)</span>
                                    <BufferedRangeSliderWithNumericInputs
                                      value={[currentSettings.echoSpread?.scale?.jitter?.rangeMin ?? 0, currentSettings.echoSpread?.scale?.jitter?.rangeMax ?? 20]}
                                      onValueCommit={([minVal, maxVal]) => handleSettingsUpdate({ 
                                        echoSpread: { 
                                          ...currentSettings.echoSpread, 
                                          scale: { 
                                            ...currentSettings.echoSpread?.scale, 
                                            jitter: { ...currentSettings.echoSpread?.scale?.jitter, rangeMin: minVal, rangeMax: maxVal } 
                                          } 
                                        } 
                                      })}
                                      min={-100}
                                      max={100}
                                      step={5}
                                      inputClassName="h-9 min-w-[80px] bg-slate-800 border-slate-600 text-slate-200 text-xs"
                                      sliderClassName="[&_[role=slider]]:bg-cyan-600"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Rotation Controls */}
                      <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={currentSettings.echoSpread?.rotation?.enabled ?? false}
                            onCheckedChange={(checked) => handleSettingsUpdate({ 
                              echoSpread: { 
                                ...currentSettings.echoSpread, 
                                rotation: { ...currentSettings.echoSpread?.rotation, enabled: checked as boolean } 
                              } 
                            })}
                            className="border-slate-500 data-[state=checked]:bg-cyan-600"
                            data-testid="checkbox-echo-rotation-enabled"
                          />
                          <Label className="text-xs text-slate-400">Rotation</Label>
                        </div>
                        {currentSettings.echoSpread?.rotation?.enabled && (
                          <>
                            <div className="space-y-2 mt-2">
                              <div className="space-y-1">
                                <span className="text-xs text-slate-500">Start °</span>
                                <div className="flex items-center gap-2">
                                  <NumericInput
                                    value={currentSettings.echoSpread?.rotation?.startRotation ?? 0}
                                    onChange={(value) => handleSettingsUpdate({ 
                                      echoSpread: { 
                                        ...currentSettings.echoSpread, 
                                        rotation: { ...currentSettings.echoSpread?.rotation, startRotation: Math.max(0, Math.min(360, value)) } 
                                      } 
                                    })}
                                    min={0}
                                    max={360}
                                    step={5}
                                    className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                    data-testid="input-echo-rotation-start"
                                  />
                                  <Slider
                                    value={[currentSettings.echoSpread?.rotation?.startRotation ?? 0]}
                                    onValueChange={([value]) => handleSettingsUpdate({ 
                                      echoSpread: { 
                                        ...currentSettings.echoSpread, 
                                        rotation: { ...currentSettings.echoSpread?.rotation, startRotation: value } 
                                      } 
                                    })}
                                    min={0}
                                    max={360}
                                    step={5}
                                    className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs text-slate-500">Delta °</span>
                                <div className="flex items-center gap-2">
                                  <NumericInput
                                    value={currentSettings.echoSpread?.rotation?.rotationDelta ?? 0}
                                    onChange={(value) => handleSettingsUpdate({ 
                                      echoSpread: { 
                                        ...currentSettings.echoSpread, 
                                        rotation: { ...currentSettings.echoSpread?.rotation, rotationDelta: Math.max(-180, Math.min(180, value)) } 
                                      } 
                                    })}
                                    min={-180}
                                    max={180}
                                    step={5}
                                    className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                    data-testid="input-echo-rotation-delta"
                                  />
                                  <Slider
                                    value={[currentSettings.echoSpread?.rotation?.rotationDelta ?? 0]}
                                    onValueChange={([value]) => handleSettingsUpdate({ 
                                      echoSpread: { 
                                        ...currentSettings.echoSpread, 
                                        rotation: { ...currentSettings.echoSpread?.rotation, rotationDelta: value } 
                                      } 
                                    })}
                                    min={-180}
                                    max={180}
                                    step={5}
                                    className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1 mt-2">
                              <span className="text-xs text-slate-500">Rotation Range (min-max °)</span>
                              <BufferedRangeSliderWithNumericInputs
                                value={[currentSettings.echoSpread?.rotation?.minRotation ?? -360, currentSettings.echoSpread?.rotation?.maxRotation ?? 360]}
                                onValueCommit={([minVal, maxVal]) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    rotation: { ...currentSettings.echoSpread?.rotation, minRotation: minVal, maxRotation: maxVal } 
                                  } 
                                })}
                                min={-360}
                                max={360}
                                step={5}
                                inputClassName="h-9 min-w-[80px] bg-slate-800 border-slate-600 text-slate-200 text-xs"
                                sliderClassName="[&_[role=slider]]:bg-cyan-600"
                              />
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Checkbox
                                checked={currentSettings.echoSpread?.rotation?.jitter?.enabled ?? false}
                                onCheckedChange={(checked) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    rotation: { 
                                      ...currentSettings.echoSpread?.rotation, 
                                      jitter: { ...currentSettings.echoSpread?.rotation?.jitter, enabled: checked as boolean } 
                                    } 
                                  } 
                                })}
                                className="border-slate-500 data-[state=checked]:bg-cyan-600"
                                data-testid="checkbox-echo-rotation-jitter"
                              />
                              <span className="text-xs text-slate-400">Jitter</span>
                            </div>
                            {currentSettings.echoSpread?.rotation?.jitter?.enabled && (
                              <div className="mt-2 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500">Mode:</span>
                                  <Select
                                    value={currentSettings.echoSpread?.rotation?.jitter?.mode ?? 'fixed'} 
                                    onValueChange={(value) => {
                                      const mode = value as 'fixed' | 'range';
                                      const currentJitter = currentSettings.echoSpread?.rotation?.jitter ?? {};
                                      const safeJitter = {
                                        enabled: currentJitter.enabled ?? true,
                                        mode,
                                        fixedAmount: currentJitter.fixedAmount ?? 15,
                                        rangeMin: currentJitter.rangeMin ?? 0,
                                        rangeMax: currentJitter.rangeMax ?? 30,
                                      };
                                      handleSettingsUpdate({ 
                                        echoSpread: { 
                                          ...currentSettings.echoSpread, 
                                          rotation: { 
                                            ...currentSettings.echoSpread?.rotation, 
                                            jitter: safeJitter
                                          } 
                                        } 
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-7 w-24 bg-slate-800 border-slate-600 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent style={{ zIndex: 10002 }}>
                                      <SelectItem value="fixed">Fixed</SelectItem>
                                      <SelectItem value="range">Range</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {(currentSettings.echoSpread?.rotation?.jitter?.mode ?? 'fixed') === 'fixed' ? (
                                  <div className="space-y-1">
                                    <span className="text-xs text-slate-500">Fixed Amount (±°)</span>
                                    <div className="flex items-center gap-2">
                                      <NumericInput
                                        value={currentSettings.echoSpread?.rotation?.jitter?.fixedAmount ?? 0}
                                        onChange={(value) => handleSettingsUpdate({ 
                                          echoSpread: { 
                                            ...currentSettings.echoSpread, 
                                            rotation: { 
                                              ...currentSettings.echoSpread?.rotation, 
                                              jitter: { ...currentSettings.echoSpread?.rotation?.jitter, fixedAmount: Math.max(0, Math.min(180, value)) } 
                                            } 
                                          } 
                                        })}
                                        min={0}
                                        max={180}
                                        step={5}
                                        className="h-9 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                        data-testid="input-echo-rotation-jitter-fixed"
                                      />
                                      <Slider
                                        value={[currentSettings.echoSpread?.rotation?.jitter?.fixedAmount ?? 0]}
                                        onValueChange={([value]) => handleSettingsUpdate({ 
                                          echoSpread: { 
                                            ...currentSettings.echoSpread, 
                                            rotation: { 
                                              ...currentSettings.echoSpread?.rotation, 
                                              jitter: { ...currentSettings.echoSpread?.rotation?.jitter, fixedAmount: value } 
                                            } 
                                          } 
                                        })}
                                        min={0}
                                        max={180}
                                        step={5}
                                        className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <span className="text-xs text-slate-500">Jitter Range (°)</span>
                                    <BufferedRangeSliderWithNumericInputs
                                      value={[currentSettings.echoSpread?.rotation?.jitter?.rangeMin ?? 0, currentSettings.echoSpread?.rotation?.jitter?.rangeMax ?? 30]}
                                      onValueCommit={([minVal, maxVal]) => handleSettingsUpdate({ 
                                        echoSpread: { 
                                          ...currentSettings.echoSpread, 
                                          rotation: { 
                                            ...currentSettings.echoSpread?.rotation, 
                                            jitter: { ...currentSettings.echoSpread?.rotation?.jitter, rangeMin: minVal, rangeMax: maxVal } 
                                          } 
                                        } 
                                      })}
                                      min={-180}
                                      max={180}
                                      step={5}
                                      inputClassName="h-9 min-w-[80px] bg-slate-800 border-slate-600 text-slate-200 text-xs"
                                      sliderClassName="[&_[role=slider]]:bg-cyan-600"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      
                      {/* Color Shift Controls */}
                      <div className="space-y-2 p-2 bg-slate-800/50 rounded">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={currentSettings.echoSpread?.colorShift?.enabled ?? false}
                            onCheckedChange={(checked) => handleSettingsUpdate({ 
                              echoSpread: { 
                                ...currentSettings.echoSpread, 
                                colorShift: { ...currentSettings.echoSpread?.colorShift, enabled: checked as boolean } 
                              } 
                            })}
                            className="border-slate-500 data-[state=checked]:bg-cyan-600"
                            data-testid="checkbox-echo-colorshift-enabled"
                          />
                          <Label className="text-xs text-slate-400">Color Shift</Label>
                        </div>
                        {currentSettings.echoSpread?.colorShift?.enabled && (
                          <div className="space-y-2 mt-2">
                            <div className="space-y-1">
                              <span className="text-xs text-slate-500">Hue Delta (°)</span>
                              <div className="flex items-center gap-2">
                                <NumericInput
                                  value={currentSettings.echoSpread?.colorShift?.hueDelta ?? 0}
                                  onChange={(value) => handleSettingsUpdate({ 
                                    echoSpread: { 
                                      ...currentSettings.echoSpread, 
                                      colorShift: { ...currentSettings.echoSpread?.colorShift, hueDelta: Math.max(-180, Math.min(180, value)) } 
                                    } 
                                  })}
                                  min={-180}
                                  max={180}
                                  step={5}
                                  className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                  data-testid="input-echo-colorshift-hue"
                                />
                                <Slider
                                  value={[currentSettings.echoSpread?.colorShift?.hueDelta ?? 0]}
                                  onValueChange={([value]) => handleSettingsUpdate({ 
                                    echoSpread: { 
                                      ...currentSettings.echoSpread, 
                                      colorShift: { ...currentSettings.echoSpread?.colorShift, hueDelta: value } 
                                    } 
                                  })}
                                  min={-180}
                                  max={180}
                                  step={5}
                                  className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs text-slate-500">Saturation Delta (%)</span>
                              <div className="flex items-center gap-2">
                                <NumericInput
                                  value={currentSettings.echoSpread?.colorShift?.saturationDelta ?? 0}
                                  onChange={(value) => handleSettingsUpdate({ 
                                    echoSpread: { 
                                      ...currentSettings.echoSpread, 
                                      colorShift: { ...currentSettings.echoSpread?.colorShift, saturationDelta: Math.max(-50, Math.min(50, value)) } 
                                    } 
                                  })}
                                  min={-50}
                                  max={50}
                                  step={5}
                                  className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                  data-testid="input-echo-colorshift-saturation"
                                />
                                <Slider
                                  value={[currentSettings.echoSpread?.colorShift?.saturationDelta ?? 0]}
                                  onValueChange={([value]) => handleSettingsUpdate({ 
                                    echoSpread: { 
                                      ...currentSettings.echoSpread, 
                                      colorShift: { ...currentSettings.echoSpread?.colorShift, saturationDelta: value } 
                                    } 
                                  })}
                                  min={-50}
                                  max={50}
                                  step={5}
                                  className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs text-slate-500">Lightness Delta (%)</span>
                              <div className="flex items-center gap-2">
                                <NumericInput
                                  value={currentSettings.echoSpread?.colorShift?.lightnessDelta ?? 0}
                                  onChange={(value) => handleSettingsUpdate({ 
                                    echoSpread: { 
                                      ...currentSettings.echoSpread, 
                                      colorShift: { ...currentSettings.echoSpread?.colorShift, lightnessDelta: Math.max(-50, Math.min(50, value)) } 
                                    } 
                                  })}
                                  min={-50}
                                  max={50}
                                  step={5}
                                  className="h-8 w-16 bg-slate-800 border-slate-600 text-slate-200 text-xs px-2"
                                  data-testid="input-echo-colorshift-lightness"
                                />
                                <Slider
                                  value={[currentSettings.echoSpread?.colorShift?.lightnessDelta ?? 0]}
                                  onValueChange={([value]) => handleSettingsUpdate({ 
                                    echoSpread: { 
                                      ...currentSettings.echoSpread, 
                                      colorShift: { ...currentSettings.echoSpread?.colorShift, lightnessDelta: value } 
                                    } 
                                  })}
                                  min={-50}
                                  max={50}
                                  step={5}
                                  className="flex-1 [&_[role=slider]]:bg-cyan-600"
                                />
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Progressive color changes per echo (e.g., Hue +30° creates rainbow effect)</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Echo Position Jitter Controls */}
                    <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-slate-300">Echo Position Jitter</Label>
                        <Checkbox
                          checked={currentSettings.echoSpread?.jitter?.enabled ?? false}
                          onCheckedChange={(checked) => handleSettingsUpdate({ 
                            echoSpread: { 
                              ...currentSettings.echoSpread, 
                              jitter: { ...currentSettings.echoSpread?.jitter, enabled: checked as boolean } 
                            } 
                          })}
                          className="border-slate-500 data-[state=checked]:bg-cyan-600"
                          data-testid="checkbox-echo-jitter-enabled"
                        />
                      </div>
                      {currentSettings.echoSpread?.jitter?.enabled && (
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-400">Distance Range (±px)</Label>
                            <div className="flex items-center gap-2">
                              <NumericInput
                                value={currentSettings.echoSpread?.jitter?.distanceRange ?? 10}
                                onChange={(value) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    jitter: { ...currentSettings.echoSpread?.jitter, distanceRange: Math.max(0, Math.min(100, value)) } 
                                  } 
                                })}
                                min={0}
                                max={100}
                                step={1}
                                className="h-7 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                data-testid="input-echo-jitter-distance"
                              />
                              <Slider
                                value={[currentSettings.echoSpread?.jitter?.distanceRange ?? 10]}
                                onValueChange={([value]) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    jitter: { ...currentSettings.echoSpread?.jitter, distanceRange: value } 
                                  } 
                                })}
                                min={0}
                                max={100}
                                step={1}
                                className="flex-1 [&_[role=slider]]:bg-cyan-600"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-400">Angle Range (±°)</Label>
                            <div className="flex items-center gap-2">
                              <NumericInput
                                value={currentSettings.echoSpread?.jitter?.angleRange ?? 15}
                                onChange={(value) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    jitter: { ...currentSettings.echoSpread?.jitter, angleRange: Math.max(0, Math.min(180, value)) } 
                                  } 
                                })}
                                min={0}
                                max={180}
                                step={1}
                                className="h-7 w-14 bg-slate-800 border-slate-600 text-slate-200 text-xs px-1"
                                data-testid="input-echo-jitter-angle"
                              />
                              <Slider
                                value={[currentSettings.echoSpread?.jitter?.angleRange ?? 15]}
                                onValueChange={([value]) => handleSettingsUpdate({ 
                                  echoSpread: { 
                                    ...currentSettings.echoSpread, 
                                    jitter: { ...currentSettings.echoSpread?.jitter, angleRange: value } 
                                  } 
                                })}
                                min={0}
                                max={180}
                                step={1}
                                className="flex-1 [&_[role=slider]]:bg-cyan-600"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-slate-500">Adds randomization to echo positions (angle and distance) for organic variation. Different from per-effect jitter above.</p>
                    </div>
                  </div>
                )}
              </div>

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

// Custom comparison function - only re-render when meaningful props change
// Function props rarely change in identity, so we focus on data props
function arePropsEqual(prevProps: BatchConfigDialogProps, nextProps: BatchConfigDialogProps): boolean {
  // Fast path: if settings object reference is the same, nothing changed
  if (prevProps.settings === nextProps.settings &&
      prevProps.isOpen === nextProps.isOpen &&
      prevProps.sidebarCollapsed === nextProps.sidebarCollapsed &&
      prevProps.generationSets === nextProps.generationSets &&
      prevProps.currentGenerationSetId === nextProps.currentGenerationSetId &&
      prevProps.generationSetsEnabled === nextProps.generationSetsEnabled &&
      prevProps.shapeCountMode === nextProps.shapeCountMode &&
      prevProps.shapeCountFixed === nextProps.shapeCountFixed &&
      prevProps.activeArtboard === nextProps.activeArtboard) {
    return true;
  }
  return false;
}

const BatchConfigDialog = memo(BatchConfigDialogInner, arePropsEqual);
export default BatchConfigDialog;
