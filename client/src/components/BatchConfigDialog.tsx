import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Settings, RotateCcw, X, ChevronDown } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BlendMode } from '@/lib/shapeTypes';

export interface BatchConfigSettings {
  // Preset Selection
  selectedPreset: string;
  
  // Advanced Noise (First configurable section)
  noiseEnabled: boolean;
  noiseAlgorithm: 'randomise' | 'perlin' | 'simplex' | 'fractal' | 'worley' | 'ridge' | 'turbulence';
  noiseScale: number;
  noiseOctaves: number;
  noiseAmplitude: number;
  noiseSeed: number;
  noiseScaleToCanvas: boolean;
  
  // Property-specific amplitude multipliers
  noisePositionAmplitude: number;
  noiseRotationAmplitude: number;
  noiseScaleAmplitude: number;
  noiseOpacityAmplitude: number;
  noiseColorAmplitude: number;
  
  // Octave handling mode
  noiseOctaveMode: 'natural' | 'normalized';
  
  // Algorithm-specific settings
  // Fractal specific
  noiseLacunarity: number;
  noiseGain: number;
  
  // Worley specific
  noiseDistanceFunction: 'euclidean' | 'manhattan' | 'chebyshev';
  noiseFeaturePoints: number;
  
  // Ridge specific
  noiseRidgeOffset: number;
  
  // Turbulence specific
  noiseTurbulencePower: number;
  
  // Distribution Layout
  distributionLayoutEnabled: boolean;
  distributionPattern: 'grid' | 'line' | 'circle' | 'spiral';
  
  // Grid Layout Settings
  gridRows: number;
  gridColumns: number;
  gridRowOffset: number;
  gridColumnOffset: number;
  gridSortBy: 'layer' | 'id' | 'shape-type' | 'fill-color' | 'opacity' | 'none';
  
  // Blend Mode Control
  blendModeEnabled: boolean;
  enabledBlendModes: { [key in BlendMode]?: number }; // weight 0-100
  
  // Properties Section
  propertiesEnabled: boolean;
  
  // Safety Constraints
  preventInvisibleShapes: boolean; // ensures fill OR stroke is always present
  
  // Shape Properties
  shapePropertiesEnabled: boolean;
  widthRange: [number, number];
  heightRange: [number, number];
  xPositionRange: [number, number];
  yPositionRange: [number, number];
  
  // Enhanced Width and Height Properties
  widthMode: 'range' | 'value' | 'incremental';
  heightMode: 'range' | 'value' | 'incremental';
  
  // Width/Height Mode Toggles
  sizeNoiseWithinRange: boolean; // true: noise defines values within range, false: noise adds to range
  sizeIncrementalResetPerBatch: boolean; // true: reset count per batch, false: continuous increment
  sizeNoiseMode: 'additive' | 'multiplicative'; // how noise affects size properties
  
  // Shape Constraint Value Selection (replaces separate constraint ranges)
  useMinWidthHeight: boolean; // Use minimum of width/height for circular shapes
  useMaxWidthHeight: boolean; // Use maximum of width/height for circular shapes  
  useAvgWidthHeight: boolean; // Use average of width/height for circular shapes
  
  // Width/Height Value Mode
  widthValue: number;
  heightValue: number;
  

  
  // Width/Height Incremental Mode
  widthIncrement: number;
  heightIncrement: number;
  sizeIncrementalStartValue: number;
  
  // Size Constraints
  maintainAspectRatio: boolean; // force width/height to maintain shape proportions
  minimumSize: number; // absolute minimum size to prevent invisible shapes
  maximumSize: number; // absolute maximum size constraint
  
  // Enhanced Position Properties (removed percentage and edge-offset modes)
  xPositionMode: 'range' | 'value' | 'directional' | 'incremental';
  yPositionMode: 'range' | 'value' | 'directional' | 'incremental';
  
  // Position Mode Toggles
  rangeNoiseWithinRange: boolean; // true: noise defines values within range, false: noise adds to range
  incrementalResetPerBatch: boolean; // true: reset count per batch, false: continuous increment
  directionalEvenDistribution: boolean; // true: even 360° distribution, false: clustering
  directionalClusterAngle: number; // degrees for clustering mode
  noiseMode: 'additive' | 'multiplicative'; // how noise affects properties
  
  // Position Value Mode
  xPositionValue: number;
  yPositionValue: number;
  
  // Position Directional Mode
  positionDirectionalMode: 'outward-center' | 'outward-edge' | 'angle-based';
  positionDirectionalAngle: number; // 0-360 degrees
  positionDirectionalDistance: number;
  
  // Position Incremental Mode
  xPositionIncrement: number;
  yPositionIncrement: number;
  
  // Rectangle-specific Properties
  rectangleCornerRadiusRange: [number, number];
  
  // Star-specific Properties
  starInnerRadiusRange: [number, number];
  
  // Ring-specific Properties
  ringInnerRadiusRange: [number, number];
  
  // Fill Properties
  fillEnabled: boolean;
  fillProbability: number; // 0-100%
  
  // Fill Color Settings
  fillColorMode: 'range' | 'palette' | 'define';
  fillColorRange: [string, string]; // For range mode (HSL interpolation)
  fillColorPalette: string[]; // For palette mode
  fillColorDefine: string; // For define mode
  
  // Fill Gradient Settings
  fillGradientEnabled: boolean; // Enable/disable gradients independently from solid fills
  fillGradientProbability: number; // 0-100%
  fillGradientColorMode: 'range' | 'palette' | 'define';
  fillGradientColorRange: [string, string]; // For range mode (HSL interpolation)
  fillGradientColorPalette: string[]; // For palette mode
  fillGradientColorDefine: string[]; // For define mode - array based on max stops
  fillGradientStopsRange: [number, number]; // RGBA gradient stops
  
  // Fill Opacity Settings
  fillOpacityMode: 'range' | 'define';
  fillOpacityRange: [number, number]; // For range mode
  fillOpacityDefine: number; // For define mode
  
  // Stroke Properties  
  strokeEnabled: boolean;
  strokeProbability: number; // 0-100%
  
  // Stroke Color Settings
  strokeColorMode: 'range' | 'palette' | 'define';
  strokeColorRange: [string, string]; // For range mode (HSL interpolation)
  strokeColorPalette: string[]; // For palette mode
  strokeColorDefine: string; // For define mode
  
  // Stroke Opacity Settings
  strokeOpacityMode: 'range' | 'define';
  strokeOpacityRange: [number, number]; // For range mode
  strokeOpacityDefine: number; // For define mode
  strokeWidthRange: [number, number];
  
  // Polygon Shape Properties
  polygonPropertiesEnabled: boolean;
  segmentCountRange: [number, number];
  
  // Line Properties
  linePropertiesEnabled: boolean;
  pointCountRange: [number, number];
  pointPositionRange: [number, number];
  
  // Spline Curve Properties
  splinePropertiesEnabled: boolean;
  splinePointCountRange: [number, number];
  splinePointPositionRange: [number, number];
  splineControlPointRange: [number, number];
  
  // Shape Transforms
  transformsEnabled: boolean;
  translateXRange: [number, number];
  translateYRange: [number, number];
  scaleUniform: boolean;
  scaleRange: [number, number];
  scaleXRange: [number, number];
  scaleYRange: [number, number];
  rotationRange: [number, number];
  skewXRange: [number, number];
  skewYRange: [number, number];
  
  // Color Harmony
  colorHarmonyEnabled: boolean;
  harmonyType: 'monochromatic' | 'analogous' | 'complementary' | 'triadic' | 'split-complementary' | 'tetradic';
  baseColor: string;
  hueVariance: number;
  saturationRange: [number, number];
  lightnessRange: [number, number];
  
  // Harmony-specific settings
  monochromaticSettings: {
    lightnessSteps: number;
    saturationSteps: number;
    includeNeutrals: boolean;
  };
  analogousSettings: {
    hueRange: number;
    colorCount: number;
  };
  complementarySettings: {
    includeNearComplements: boolean;
    complementOffset: number;
  };
  triadicSettings: {
    rotationOffset: number;
    useEqualSpacing: boolean;
  };
  splitComplementarySettings: {
    splitAngle: number;
    balanceWeights: boolean;
  };
  tetradicSettings: {
    squareHarmony: boolean;
    rectangleRatio: number;
  };
  
  // Physics Simulation
  physicsEnabled: boolean;
  physicsType: 'none' | 'gravity' | 'magnetic' | 'collision' | 'flocking';
  gravityDirection: number; // degrees
  gravityStrength: number;
  magneticType: 'attraction' | 'repulsion';
  magneticStrength: number;
  collisionDistance: number;
  collisionBounce: number;
  simulationSteps: number;
  
  // Temporal Variation (DISABLED - Future Feature)
  temporalEnabled: false; // Always disabled for now
  evolutionMode: 'none'; // Always none for now
  seedIncrement: number;
  evolutionTargets: {
    position: boolean;
    rotation: boolean;
    scale: boolean;
    color: boolean;
    opacity: boolean;
  };
}

const defaultSettings: BatchConfigSettings = {
  selectedPreset: 'custom',
  
  noiseEnabled: false,
  noiseAlgorithm: 'randomise',
  noiseScale: 1,
  noiseOctaves: 1,
  noiseAmplitude: 50,
  noiseSeed: Math.floor(Math.random() * 10000),
  noiseScaleToCanvas: true,
  
  // Property-specific amplitude multipliers
  noisePositionAmplitude: 1.0,
  noiseRotationAmplitude: 1.0,
  noiseScaleAmplitude: 1.0,
  noiseOpacityAmplitude: 1.0,
  noiseColorAmplitude: 1.0,
  
  // Octave handling mode
  noiseOctaveMode: 'natural' as const,
  
  // Algorithm-specific settings
  noiseLacunarity: 2.0,
  noiseGain: 0.5,
  noiseDistanceFunction: 'euclidean',
  noiseFeaturePoints: 1,
  noiseRidgeOffset: 1.0,
  noiseTurbulencePower: 1.0,
  
  distributionLayoutEnabled: false,
  distributionPattern: 'grid',
  gridRows: 3,
  gridColumns: 3,
  gridRowOffset: 120,
  gridColumnOffset: 120,
  gridSortBy: 'none',
  
  blendModeEnabled: false,
  enabledBlendModes: { 'source-over': 100 },
  
  propertiesEnabled: false,
  preventInvisibleShapes: true,
  
  // Shape Properties
  shapePropertiesEnabled: false,
  widthRange: [50, 200],
  heightRange: [50, 200],
  xPositionRange: [-100, 100],
  yPositionRange: [-100, 100],
  
  // Enhanced Width and Height Properties
  widthMode: 'range' as const,
  heightMode: 'range' as const,
  
  // Width/Height Mode Toggles
  sizeNoiseWithinRange: false, // Default: noise adds to range
  sizeIncrementalResetPerBatch: true, // Default: reset count per batch
  sizeNoiseMode: 'additive' as const, // Default: additive noise
  
  // Shape Constraint Value Selection (replaces separate constraint ranges)
  useMinWidthHeight: false, // Use minimum of width/height for circular shapes
  useMaxWidthHeight: true, // Use maximum of width/height for circular shapes (default)
  useAvgWidthHeight: false, // Use average of width/height for circular shapes
  
  // Width/Height Value Mode
  widthValue: 100,
  heightValue: 100,
  

  
  // Width/Height Incremental Mode
  widthIncrement: 10,
  heightIncrement: 10,
  sizeIncrementalStartValue: 50,
  
  // Size Constraints
  maintainAspectRatio: false, // Default: independent width/height
  minimumSize: 10, // Minimum size to prevent invisible shapes
  maximumSize: 500, // Maximum size constraint
  
  // Enhanced Position Properties
  xPositionMode: 'range' as const,
  yPositionMode: 'range' as const,
  
  // Position Mode Toggles
  rangeNoiseWithinRange: false, // Default: noise adds to range
  incrementalResetPerBatch: true, // Default: reset count per batch
  directionalEvenDistribution: true, // Default: even 360° distribution
  directionalClusterAngle: 30, // Default clustering angle
  noiseMode: 'additive' as const, // Default: additive noise
  
  // Position Value Mode
  xPositionValue: 0,
  yPositionValue: 0,
  
  // Position Directional Mode
  positionDirectionalMode: 'outward-center' as const,
  positionDirectionalAngle: 0,
  positionDirectionalDistance: 100,
  
  // Position Incremental Mode
  xPositionIncrement: 50,
  yPositionIncrement: 50,
  
  // Rectangle-specific Properties
  rectangleCornerRadiusRange: [0, 20],
  
  // Star-specific Properties
  starInnerRadiusRange: [0.3, 0.7],
  
  // Ring-specific Properties
  ringInnerRadiusRange: [0.4, 0.8],
  
  // Fill Properties
  fillEnabled: true,
  fillProbability: 80,
  
  // Fill Color Settings
  fillColorMode: 'range' as const,
  fillColorRange: ['#3b82f6', '#8b5cf6'],
  fillColorPalette: ['#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b'],
  fillColorDefine: '#3b82f6',
  
  // Fill Gradient Settings
  fillGradientEnabled: true,
  fillGradientProbability: 20,
  fillGradientColorMode: 'range' as const,
  fillGradientColorRange: ['#3b82f6', '#8b5cf6'],
  fillGradientColorPalette: ['#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b'],
  fillGradientColorDefine: ['#3b82f6', '#8b5cf6', '#ef4444'],
  fillGradientStopsRange: [2, 4],
  
  // Fill Opacity Settings
  fillOpacityMode: 'range' as const,
  fillOpacityRange: [20, 100],
  fillOpacityDefine: 80,
  
  // Stroke Properties
  strokeEnabled: true,
  strokeProbability: 60,
  
  // Stroke Color Settings
  strokeColorMode: 'range' as const,
  strokeColorRange: ['#ef4444', '#f59e0b'],
  strokeColorPalette: ['#ef4444', '#f59e0b', '#8b5cf6', '#10b981', '#3b82f6'],
  strokeColorDefine: '#ef4444',
  
  // Stroke Opacity Settings
  strokeOpacityMode: 'range' as const,
  strokeOpacityRange: [40, 100],
  strokeOpacityDefine: 80,
  strokeWidthRange: [1, 5],
  
  // Polygon Shape Properties
  polygonPropertiesEnabled: false,
  segmentCountRange: [3, 12],
  
  // Line Properties
  linePropertiesEnabled: false,
  pointCountRange: [3, 8],
  pointPositionRange: [-50, 50],
  
  // Spline Curve Properties
  splinePropertiesEnabled: false,
  splinePointCountRange: [3, 6],
  splinePointPositionRange: [-50, 50],
  splineControlPointRange: [-25, 25],
  
  // Shape Transforms
  transformsEnabled: false,
  translateXRange: [-50, 50],
  translateYRange: [-50, 50],
  scaleUniform: true,
  scaleRange: [50, 200],
  scaleXRange: [50, 200],
  scaleYRange: [50, 200],
  rotationRange: [0, 360],
  skewXRange: [0, 0],
  skewYRange: [0, 0],
  
  colorHarmonyEnabled: false,
  harmonyType: 'complementary',
  baseColor: '#3b82f6',
  hueVariance: 15,
  saturationRange: [0, 100],
  lightnessRange: [0, 100],
  
  // Harmony-specific defaults
  monochromaticSettings: {
    lightnessSteps: 5,
    saturationSteps: 3,
    includeNeutrals: true,
  },
  analogousSettings: {
    hueRange: 60,
    colorCount: 3,
  },
  complementarySettings: {
    includeNearComplements: false,
    complementOffset: 0,
  },
  triadicSettings: {
    rotationOffset: 0,
    useEqualSpacing: true,
  },
  splitComplementarySettings: {
    splitAngle: 30,
    balanceWeights: true,
  },
  tetradicSettings: {
    squareHarmony: true,
    rectangleRatio: 60,
  },
  
  physicsEnabled: false,
  physicsType: 'none',
  gravityDirection: 270,
  gravityStrength: 50,
  magneticType: 'attraction',
  magneticStrength: 50,
  collisionDistance: 20,
  collisionBounce: 0.5,
  simulationSteps: 100,
  
  temporalEnabled: false, // Always false (disabled)
  evolutionMode: 'none', // Always none (disabled)
  seedIncrement: 1,
  evolutionTargets: {
    position: false,
    rotation: false,
    scale: false,
    color: false,
    opacity: false
  }
};

interface BatchConfigDialogProps {
  settings: BatchConfigSettings;
  onSettingsChange: (settings: BatchConfigSettings) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function BatchConfigDialog({ settings, onSettingsChange, isOpen: controlledIsOpen, onOpenChange: controlledOnOpenChange }: BatchConfigDialogProps) {
  const [currentSettings, setCurrentSettings] = useState<BatchConfigSettings>(defaultSettings);
  const [isOpen, setIsOpen] = useState(controlledIsOpen ?? false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showBlendModeExplanation, setShowBlendModeExplanation] = useState(false);

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

  // Initialize currentSettings when settings prop changes
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
    
    // Only update internal state, don't call parent callback immediately
    setCurrentSettings(prevSettings => ({ ...prevSettings, ...updates }));
  }, [isOpen]);

  const resetToDefaults = useCallback(() => {
    setCurrentSettings(defaultSettings);
  }, []);

  const applySettings = useCallback(() => {
    console.log('[BatchConfigDialog] Applying settings to parent');
    onSettingsChange(currentSettings);
    setIsOpen(false);
  }, [currentSettings, onSettingsChange]);

  const blendModes: BlendMode[] = [
    'source-over', 'multiply', 'screen', 'overlay', 'darken', 
    'lighten', 'color-dodge', 'color-burn', 'hard-light', 
    'soft-light', 'difference', 'exclusion'
  ];

  const presets = [
    { value: 'custom', label: 'Custom Settings' },
    { value: 'minimal', label: 'Minimal Variation' },
    { value: 'moderate', label: 'Moderate Variation' },
    { value: 'chaotic', label: 'Chaotic Generation' },
    { value: 'geometric', label: 'Geometric Patterns' },
    { value: 'organic', label: 'Organic Shapes' }
  ];

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm"
        className="h-10 w-10 p-0 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600"
        onClick={() => setIsOpen(true)}
      >
        <Settings className="w-4 h-4" />
      </Button>
      
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
            className="w-[90vw] max-w-[600px] bg-slate-900 border-slate-700 border rounded-lg overflow-hidden max-h-[80vh] shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: 10000 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900">
              <div>
                <h3 className="text-lg font-semibold text-slate-200">Batch Configuration</h3>
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ zIndex: 10001 }}>
              {/* Collapsible System Behavior Explanation */}
              <div className="border border-slate-600 rounded">
                <Button
                  variant="ghost"
                  className="flex items-center justify-between w-full p-3 bg-slate-800 rounded hover:bg-slate-700 text-left"
                  onClick={() => setShowExplanation(!showExplanation)}
                >
                  <Label className="text-sm font-medium text-slate-200">Advanced Noise System Behavior</Label>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showExplanation ? 'rotate-180' : ''}`} />
                </Button>
                {showExplanation && (
                  <div className="p-3 bg-slate-800 border-t border-slate-600">
                    <div className="space-y-2 text-xs text-slate-400">
                      <p><strong>Property Section Targeting:</strong> Enabling property sections (Shape Properties, Fill Properties, etc.) makes those properties targetable by the selected noise algorithm.</p>
                      <p><strong>Disabled Properties:</strong> Properties in disabled sections use Randomise (standard setting) fallback with probability distributions.</p>
                      <p><strong>Algorithm-Specific Settings:</strong> Each noise type has unique parameters (Fractal: lacunarity/gain, Worley: distance functions, etc.)</p>
                      <p><strong>Blend Mode Variation:</strong> When Advanced Noise is enabled AND Blend Mode Control is enabled, noise adds variation to blend mode probability weights.</p>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-slate-600" />

              {/* Presets Dropdown */}
              <div className="space-y-3">
                <Label className="font-medium text-slate-200">Configuration Preset</Label>
                <Select 
                  value={currentSettings.selectedPreset}
                  onValueChange={(value) => handleSettingsUpdate({ selectedPreset: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                    {presets.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value} className="text-slate-200 hover:bg-slate-700">
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-slate-600" />

              {/* Advanced Noise - First configurable section */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={currentSettings.noiseEnabled}
                    onCheckedChange={(checked) => handleSettingsUpdate({ noiseEnabled: checked as boolean })}
                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <Label className="font-medium text-slate-200">Advanced Noise</Label>
                </div>
                
                {currentSettings.noiseEnabled && (
                  <div className="ml-6 space-y-3">
                    {/* Algorithm Selection */}
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-300">Algorithm</Label>
                      <Select 
                        value={currentSettings.noiseAlgorithm}
                        onValueChange={(value) => handleSettingsUpdate({ noiseAlgorithm: value as any })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                          <SelectItem value="randomise" className="text-slate-200 hover:bg-slate-700">Randomise</SelectItem>
                          <SelectItem value="perlin" className="text-slate-200 hover:bg-slate-700">Perlin</SelectItem>
                          <SelectItem value="simplex" className="text-slate-200 hover:bg-slate-700">Simplex</SelectItem>
                          <SelectItem value="fractal" className="text-slate-200 hover:bg-slate-700">Fractal</SelectItem>
                          <SelectItem value="worley" className="text-slate-200 hover:bg-slate-700">Worley</SelectItem>
                          <SelectItem value="ridge" className="text-slate-200 hover:bg-slate-700">Ridge</SelectItem>
                          <SelectItem value="turbulence" className="text-slate-200 hover:bg-slate-700">Turbulence</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Common settings for most algorithms (not randomise) */}
                    {currentSettings.noiseAlgorithm !== 'randomise' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm text-slate-300">Scale: {currentSettings.noiseScale}x</Label>
                          <Slider
                            value={[currentSettings.noiseScale]}
                            onValueChange={([value]) => handleSettingsUpdate({ noiseScale: value })}
                            min={0.1}
                            max={10}
                            step={0.1}
                            className="[&_[role=slider]]:bg-blue-600"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm text-slate-300">Amplitude: {currentSettings.noiseAmplitude}%</Label>
                          <Slider
                            value={[currentSettings.noiseAmplitude]}
                            onValueChange={([value]) => handleSettingsUpdate({ noiseAmplitude: value })}
                            min={1}
                            max={100}
                            step={1}
                            className="[&_[role=slider]]:bg-blue-600"
                          />
                        </div>
                      </div>
                    )}

                    {/* Octaves for multi-layered algorithms */}
                    {(['perlin', 'fractal', 'ridge', 'turbulence'].includes(currentSettings.noiseAlgorithm)) && (
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Octaves: {currentSettings.noiseOctaves}</Label>
                        <Slider
                          value={[currentSettings.noiseOctaves]}
                          onValueChange={([value]) => handleSettingsUpdate({ noiseOctaves: value })}
                          min={1}
                          max={8}
                          step={1}
                          className="[&_[role=slider]]:bg-blue-600"
                        />
                      </div>
                    )}

                    {/* Seed for all algorithms */}
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-300">Seed: {currentSettings.noiseSeed}</Label>
                      <Slider
                        value={[currentSettings.noiseSeed]}
                        onValueChange={([value]) => handleSettingsUpdate({ noiseSeed: value })}
                        min={0}
                        max={9999}
                        step={1}
                        className="[&_[role=slider]]:bg-blue-600"
                      />
                    </div>

                    {/* Position Inside Artboard Toggle */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={currentSettings.noiseScaleToCanvas}
                        onCheckedChange={(checked) => handleSettingsUpdate({ noiseScaleToCanvas: checked as boolean })}
                        className="border-slate-500 data-[state=checked]:bg-blue-600"
                      />
                      <Label className="text-sm text-slate-300">Position inside Artboard</Label>
                    </div>
                    {currentSettings.noiseScaleToCanvas && (
                      <div className="ml-6">
                        <Label className="text-xs text-slate-400">Position values will be constrained to keep shapes within the current artboard bounds</Label>
                      </div>
                    )}
                    
                    {/* Property-specific Amplitude Controls */}
                    <div className="space-y-3 pt-3 border-t border-slate-700">
                      <Label className="text-sm font-medium text-slate-200">Property Amplitudes</Label>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <Label className="text-slate-300">Position: {currentSettings.noisePositionAmplitude}</Label>
                          <Slider
                            value={[currentSettings.noisePositionAmplitude]}
                            onValueChange={([value]) => handleSettingsUpdate({ noisePositionAmplitude: value })}
                            min={0}
                            max={10}
                            step={1}
                            className="[&_[role=slider]]:bg-blue-600"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-slate-300">Rotation: {currentSettings.noiseRotationAmplitude}</Label>
                          <Slider
                            value={[currentSettings.noiseRotationAmplitude]}
                            onValueChange={([value]) => handleSettingsUpdate({ noiseRotationAmplitude: value })}
                            min={0}
                            max={10}
                            step={1}
                            className="[&_[role=slider]]:bg-blue-600"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-slate-300">Scale: {currentSettings.noiseScaleAmplitude}</Label>
                          <Slider
                            value={[currentSettings.noiseScaleAmplitude]}
                            onValueChange={([value]) => handleSettingsUpdate({ noiseScaleAmplitude: value })}
                            min={0}
                            max={10}
                            step={1}
                            className="[&_[role=slider]]:bg-blue-600"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-slate-300">Octave Mode</Label>
                          <Select 
                            value={currentSettings.noiseOctaveMode}
                            onValueChange={(value) => handleSettingsUpdate({ noiseOctaveMode: value as 'natural' | 'normalized' })}
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200 h-7">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                              <SelectItem value="natural" className="text-slate-200 hover:bg-slate-700">Natural</SelectItem>
                              <SelectItem value="normalized" className="text-slate-200 hover:bg-slate-700">Normalized</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <p className="text-xs text-slate-400 mt-2">
                        Property amplitudes multiply the base amplitude for fine-grained control. 
                        Natural octaves accumulate organically, normalized maintains [-1,1] range.
                      </p>
                    </div>



                    {/* Algorithm-specific settings */}
                    {currentSettings.noiseAlgorithm === 'fractal' && (
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700">
                        <div className="space-y-2">
                          <Label className="text-sm text-slate-300">Lacunarity: {currentSettings.noiseLacunarity}</Label>
                          <Slider
                            value={[currentSettings.noiseLacunarity]}
                            onValueChange={([value]) => handleSettingsUpdate({ noiseLacunarity: value })}
                            min={1.0}
                            max={4.0}
                            step={0.1}
                            className="[&_[role=slider]]:bg-blue-600"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-slate-300">Gain: {currentSettings.noiseGain}</Label>
                          <Slider
                            value={[currentSettings.noiseGain]}
                            onValueChange={([value]) => handleSettingsUpdate({ noiseGain: value })}
                            min={0.1}
                            max={1.0}
                            step={0.1}
                            className="[&_[role=slider]]:bg-blue-600"
                          />
                        </div>
                      </div>
                    )}

                    {currentSettings.noiseAlgorithm === 'worley' && (
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700">
                        <div className="space-y-2">
                          <Label className="text-sm text-slate-300">Distance Function</Label>
                          <Select 
                            value={currentSettings.noiseDistanceFunction}
                            onValueChange={(value) => handleSettingsUpdate({ noiseDistanceFunction: value as any })}
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                              <SelectItem value="euclidean" className="text-slate-200 hover:bg-slate-700">Euclidean</SelectItem>
                              <SelectItem value="manhattan" className="text-slate-200 hover:bg-slate-700">Manhattan</SelectItem>
                              <SelectItem value="chebyshev" className="text-slate-200 hover:bg-slate-700">Chebyshev</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-slate-300">Feature Points: {currentSettings.noiseFeaturePoints}</Label>
                          <Slider
                            value={[currentSettings.noiseFeaturePoints]}
                            onValueChange={([value]) => handleSettingsUpdate({ noiseFeaturePoints: value })}
                            min={1}
                            max={4}
                            step={1}
                            className="[&_[role=slider]]:bg-blue-600"
                          />
                        </div>
                      </div>
                    )}

                    {currentSettings.noiseAlgorithm === 'ridge' && (
                      <div className="space-y-2 pt-2 border-t border-slate-700">
                        <Label className="text-sm text-slate-300">Ridge Offset: {currentSettings.noiseRidgeOffset}</Label>
                        <Slider
                          value={[currentSettings.noiseRidgeOffset]}
                          onValueChange={([value]) => handleSettingsUpdate({ noiseRidgeOffset: value })}
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          className="[&_[role=slider]]:bg-blue-600"
                        />
                      </div>
                    )}

                    {currentSettings.noiseAlgorithm === 'turbulence' && (
                      <div className="space-y-2 pt-2 border-t border-slate-700">
                        <Label className="text-sm text-slate-300">Turbulence Power: {currentSettings.noiseTurbulencePower}</Label>
                        <Slider
                          value={[currentSettings.noiseTurbulencePower]}
                          onValueChange={([value]) => handleSettingsUpdate({ noiseTurbulencePower: value })}
                          min={0.5}
                          max={3.0}
                          step={0.1}
                          className="[&_[role=slider]]:bg-blue-600"
                        />
                      </div>
                    )}

                    {/* Algorithm-specific explanations */}
                    {currentSettings.noiseAlgorithm === 'randomise' && (
                      <div className="space-y-2 pt-2 border-t border-slate-700">
                        <Label className="text-xs text-slate-400">Standard randomization - uses probability distributions and property constraints defined in Properties section. Only seed value affects output.</Label>
                      </div>
                    )}
                  </div>
                )}
              </div>

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
                              <SelectItem value="layer" className="text-slate-200 hover:bg-slate-700">Layer Order</SelectItem>
                              <SelectItem value="id" className="text-slate-200 hover:bg-slate-700">Shape ID</SelectItem>
                              <SelectItem value="shape-type" className="text-slate-200 hover:bg-slate-700">Shape Type</SelectItem>
                              <SelectItem value="fill-color" className="text-slate-200 hover:bg-slate-700">Fill Color</SelectItem>
                              <SelectItem value="opacity" className="text-slate-200 hover:bg-slate-700">Opacity</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator className="bg-slate-600" />

              {/* Blend Mode Control */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    checked={currentSettings.blendModeEnabled}
                    onCheckedChange={(checked) => handleSettingsUpdate({ blendModeEnabled: checked as boolean })}
                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <Label className="font-medium text-slate-200">Blend Mode Control</Label>
                </div>
                
                {currentSettings.blendModeEnabled && (
                  <div className="ml-6 space-y-3">
                    <div className="border border-slate-600 rounded">
                      <Button
                        variant="ghost"
                        className="flex items-center justify-between w-full p-2 bg-slate-800 rounded hover:bg-slate-700 text-left"
                        onClick={() => setShowBlendModeExplanation(!showBlendModeExplanation)}
                      >
                        <Label className="text-xs text-slate-300">Blend Mode Behavior</Label>
                        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${showBlendModeExplanation ? 'rotate-180' : ''}`} />
                      </Button>
                      {showBlendModeExplanation && (
                        <div className="p-2 bg-slate-800 border-t border-slate-600">
                          <p className="text-xs text-slate-400">
                            Each enabled blend mode has a 0-100% probability weight. System randomly selects modes based on these weights.
                            {currentSettings.noiseEnabled && currentSettings.blendModeEnabled && 
                              " Advanced Noise adds variation to these probability values when Blend Mode Control is enabled."
                            }
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <Label className="text-sm text-slate-300">Active Blend Modes</Label>
                    <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                      {blendModes.map((mode) => (
                        <div key={mode} className="flex items-center space-x-3 p-2 bg-slate-800 rounded">
                          <Checkbox
                            checked={currentSettings.enabledBlendModes[mode] !== undefined}
                            onCheckedChange={(checked) => {
                              const newBlendModes = { ...currentSettings.enabledBlendModes };
                              if (checked) {
                                newBlendModes[mode] = 50;
                              } else {
                                delete newBlendModes[mode];
                              }
                              handleSettingsUpdate({ enabledBlendModes: newBlendModes });
                            }}
                            className="border-slate-500 data-[state=checked]:bg-blue-600"
                          />
                          <Label className="text-xs capitalize text-slate-300 flex-1">
                            {mode.replace('-', ' ')}
                          </Label>
                          {currentSettings.enabledBlendModes[mode] !== undefined && (
                            <div className="flex items-center space-x-2 flex-1 max-w-24">
                              <Slider
                                value={[currentSettings.enabledBlendModes[mode] || 50]}
                                onValueChange={([value]) => {
                                  const newBlendModes = { ...currentSettings.enabledBlendModes };
                                  newBlendModes[mode] = value;
                                  handleSettingsUpdate({ enabledBlendModes: newBlendModes });
                                }}
                                max={100}
                                step={1}
                                className="h-2"
                              />
                              <span className="text-xs text-slate-400 w-8">{currentSettings.enabledBlendModes[mode]}%</span>
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
                                <Label className="text-xs text-slate-300">Start Value: {currentSettings.sizeIncrementalStartValue}px</Label>
                                <Slider
                                  value={[currentSettings.sizeIncrementalStartValue]}
                                  onValueChange={([value]) => handleSettingsUpdate({ sizeIncrementalStartValue: value })}
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
                                <Label className="text-xs text-slate-300">Start Value: {currentSettings.sizeIncrementalStartValue}px</Label>
                                <Slider
                                  value={[currentSettings.sizeIncrementalStartValue]}
                                  onValueChange={([value]) => handleSettingsUpdate({ sizeIncrementalStartValue: value })}
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
                          
                          {/* Noise Integration Section */}
                          <div className="space-y-3 p-3 bg-slate-700 rounded">
                            <Label className="text-sm font-medium text-slate-200">Size Noise Integration</Label>
                            <div className="space-y-3">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={currentSettings.sizeNoiseWithinRange}
                                  onCheckedChange={(checked) => handleSettingsUpdate({ sizeNoiseWithinRange: checked as boolean })}
                                  className="border-slate-500 data-[state=checked]:bg-blue-600"
                                />
                                <Label className="text-xs text-slate-300">Noise defines values within range</Label>
                              </div>
                              <p className="text-xs text-slate-400 ml-6">
                                {currentSettings.sizeNoiseWithinRange ? "Noise determines size within specified range" : "Noise adds variation to base size"}
                              </p>
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">Noise Mode</Label>
                                <Select value={currentSettings.sizeNoiseMode} onValueChange={(value) => handleSettingsUpdate({ sizeNoiseMode: value as any })}>
                                  <SelectTrigger className="h-6 w-full text-xs bg-slate-800 border-slate-600 text-slate-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                    <SelectItem value="additive" className="text-slate-200 hover:bg-slate-700">Additive</SelectItem>
                                    <SelectItem value="multiplicative" className="text-slate-200 hover:bg-slate-700">Multiplicative</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <p className="text-xs text-slate-400">
                                {currentSettings.sizeNoiseMode === 'additive' ? "Noise adds to base size" : "Noise multiplies base size"}
                              </p>
                            </div>
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
                                <Label className="text-xs text-slate-300">Increment: {currentSettings.xPositionIncrement}px</Label>
                                <Slider
                                  value={[currentSettings.xPositionIncrement]}
                                  onValueChange={([value]) => handleSettingsUpdate({ xPositionIncrement: value })}
                                  min={1}
                                  max={100}
                                  step={1}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                                <p className="text-xs text-slate-400">Stepped positioning (shape 1 at 0, shape 2 at increment, etc.)</p>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={currentSettings.incrementalResetPerBatch}
                                    onCheckedChange={(checked) => handleSettingsUpdate({ incrementalResetPerBatch: checked as boolean })}
                                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                                  />
                                  <Label className="text-xs text-slate-300">Reset per batch</Label>
                                </div>
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
                                <Label className="text-xs text-slate-300">Increment: {currentSettings.yPositionIncrement}px</Label>
                                <Slider
                                  value={[currentSettings.yPositionIncrement]}
                                  onValueChange={([value]) => handleSettingsUpdate({ yPositionIncrement: value })}
                                  min={1}
                                  max={100}
                                  step={1}
                                  className="[&_[role=slider]]:bg-blue-600"
                                />
                                <p className="text-xs text-slate-400">Stepped positioning (shape 1 at 0, shape 2 at increment, etc.)</p>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={currentSettings.incrementalResetPerBatch}
                                    onCheckedChange={(checked) => handleSettingsUpdate({ incrementalResetPerBatch: checked as boolean })}
                                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                                  />
                                  <Label className="text-xs text-slate-300">Reset per batch</Label>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Noise Integration Toggles */}
                          <div className="space-y-3 p-3 bg-slate-700 rounded border border-slate-600">
                            <Label className="text-sm font-medium text-slate-200">Noise Integration</Label>
                            
                            {/* Range Noise Mode */}
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={currentSettings.rangeNoiseWithinRange}
                                onCheckedChange={(checked) => handleSettingsUpdate({ rangeNoiseWithinRange: checked as boolean })}
                                className="border-slate-500 data-[state=checked]:bg-blue-600"
                              />
                              <Label className="text-xs text-slate-300">Range noise within range</Label>
                            </div>
                            <p className="text-xs text-slate-400 ml-6">
                              When enabled: noise defines values within the specified range. 
                              When disabled: noise adds to the range values.
                            </p>
                            
                            {/* Noise Mode */}
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-300">Noise Mode</Label>
                              <Select value={currentSettings.noiseMode} onValueChange={(value) => handleSettingsUpdate({ noiseMode: value as any })}>
                                <SelectTrigger className="h-6 w-full text-xs bg-slate-800 border-slate-600 text-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                                  <SelectItem value="additive" className="text-slate-200 hover:bg-slate-700">Additive (default)</SelectItem>
                                  <SelectItem value="multiplicative" className="text-slate-200 hover:bg-slate-700">Multiplicative</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-slate-400">
                                Additive: noise value is added to property. Multiplicative: property is multiplied by noise value.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator className="bg-slate-700" />

                    {/* Prevent Invisible Shapes */}
                    <div className="space-y-2 p-3 bg-slate-800 rounded">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={currentSettings.preventInvisibleShapes}
                          onCheckedChange={(checked) => handleSettingsUpdate({ preventInvisibleShapes: checked as boolean })}
                          className="border-slate-500 data-[state=checked]:bg-blue-600"
                        />
                        <Label className="text-sm text-slate-200">Prevent Invisible Shapes</Label>
                      </div>
                      <p className="text-xs text-slate-400 ml-6">Ensures fill OR stroke is always present</p>
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
                          <Accordion type="multiple" className="w-full space-y-2">
                            {/* Solid Fill Accordion */}
                            <AccordionItem value="solid" className="border border-slate-600 rounded bg-slate-800">
                              <AccordionTrigger className="px-3 py-2 hover:no-underline">
                                <div className="flex items-center space-x-2">
                                  <Label className="text-sm font-medium text-slate-200">Solid</Label>
                                  <div className="flex items-center space-x-1 text-xs text-slate-400">
                                    <span>Probability: {currentSettings.fillProbability}%</span>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-3 pb-3">
                                <div className="space-y-4">
                                  {/* Fill Probability */}
                                  <div className="space-y-2">
                                    <Label className="text-xs text-slate-300">Fill Probability: {currentSettings.fillProbability}%</Label>
                                    <Slider
                                      value={[currentSettings.fillProbability]}
                                      onValueChange={([value]) => handleSettingsUpdate({ fillProbability: value })}
                                      max={100}
                                      step={5}
                                      className="[&_[role=slider]]:bg-blue-600"
                                    />
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
                                      <div className="space-y-2">
                                        <Label className="text-xs text-slate-300">HSL Range</Label>
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
                                      </div>
                                    )}
                                  </div>

                                  {/* Fill Opacity Controls */}
                                  <div className="space-y-3">
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
                                        <Label className="text-xs text-slate-300">Opacity Range: {currentSettings.fillOpacityRange?.[0] || 20}% - {currentSettings.fillOpacityRange?.[1] || 100}%</Label>
                                        <Slider
                                          value={currentSettings.fillOpacityRange || [20, 100]}
                                          onValueChange={(value) => handleSettingsUpdate({ fillOpacityRange: value as [number, number] })}
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
                              </AccordionContent>
                            </AccordionItem>

                            {/* Gradient Fill Accordion */}
                            <AccordionItem value="gradient" className="border border-slate-600 rounded bg-slate-800">
                              <AccordionTrigger className="px-3 py-2 hover:no-underline">
                                <div className="flex items-center space-x-2">
                                  <Label className="text-sm font-medium text-slate-200">Gradient</Label>
                                  <div className="flex items-center space-x-1 text-xs text-slate-400">
                                    <span>Probability: {currentSettings.fillGradientProbability}%</span>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-3 pb-3">
                                <div className="space-y-4">
                                  {/* Gradient Enable Control */}
                                  <div className="flex items-center space-x-2">
                                    <Checkbox 
                                      checked={currentSettings.fillGradientEnabled}
                                      onCheckedChange={(checked) => handleSettingsUpdate({ fillGradientEnabled: checked as boolean })}
                                      className="border-slate-500 data-[state=checked]:bg-blue-600"
                                    />
                                    <Label className="text-sm font-medium text-slate-200">Enable Gradients</Label>
                                  </div>

                                  {/* Gradient Probability */}
                                  <div className="space-y-2">
                                    <Label className="text-xs text-slate-300">Gradient Probability: {currentSettings.fillGradientProbability}%</Label>
                                    <Slider
                                      value={[currentSettings.fillGradientProbability]}
                                      onValueChange={([value]) => handleSettingsUpdate({ fillGradientProbability: value })}
                                      max={100}
                                      step={5}
                                      className="[&_[role=slider]]:bg-blue-600"
                                    />
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
                                      <div className="space-y-2">
                                        <Label className="text-xs text-slate-300">HSL Range</Label>
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
                                      </div>
                                    )}
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
                                <Label className="text-xs text-slate-300">Opacity Range: {currentSettings.fillOpacityRange?.[0] || 20}% - {currentSettings.fillOpacityRange?.[1] || 100}%</Label>
                                <Slider
                                  value={currentSettings.fillOpacityRange || [20, 100]}
                                  onValueChange={(value) => handleSettingsUpdate({ fillOpacityRange: value as [number, number] })}
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
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-300">HSL Color Range</Label>
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
                                <p className="text-xs text-slate-400">Colors interpolated in HSL space for smooth hue transitions</p>
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
                        <div className="ml-6 grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-300">X Translate: {currentSettings.translateXRange?.[0] || -50} - {currentSettings.translateXRange?.[1] || 50}</Label>
                            <Slider
                              value={currentSettings.translateXRange || [-50, 50]}
                              onValueChange={(value) => handleSettingsUpdate({ translateXRange: value as [number, number] })}
                              min={-200}
                              max={200}
                              step={5}
                              className="[&_[role=slider]]:bg-blue-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-300">Y Translate: {currentSettings.translateYRange?.[0] || -50} - {currentSettings.translateYRange?.[1] || 50}</Label>
                            <Slider
                              value={currentSettings.translateYRange || [-50, 50]}
                              onValueChange={(value) => handleSettingsUpdate({ translateYRange: value as [number, number] })}
                              min={-200}
                              max={200}
                              step={5}
                              className="[&_[role=slider]]:bg-blue-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-300">Scale: {currentSettings.scaleRange?.[0] || 50}% - {currentSettings.scaleRange?.[1] || 200}%</Label>
                            <Slider
                              value={currentSettings.scaleRange || [50, 200]}
                              onValueChange={(value) => handleSettingsUpdate({ scaleRange: value as [number, number] })}
                              min={10}
                              max={300}
                              step={5}
                              className="[&_[role=slider]]:bg-blue-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-300">Rotation: {currentSettings.rotationRange?.[0] || 0}° - {currentSettings.rotationRange?.[1] || 360}°</Label>
                            <Slider
                              value={currentSettings.rotationRange || [0, 360]}
                              onValueChange={(value) => handleSettingsUpdate({ rotationRange: value as [number, number] })}
                              min={0}
                              max={360}
                              step={5}
                              className="[&_[role=slider]]:bg-blue-600"
                            />
                          </div>
                        </div>
                      )}
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

              {/* Physics Simulation */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={currentSettings.physicsEnabled}
                    onCheckedChange={(checked) => handleSettingsUpdate({ physicsEnabled: checked as boolean })}
                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <Label className="font-medium text-slate-200">Physics Simulation</Label>
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

              {/* Temporal Variation */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={currentSettings.temporalEnabled}
                    onCheckedChange={(checked) => handleSettingsUpdate({ temporalEnabled: checked as boolean })}
                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <Label className="font-medium text-slate-200">Temporal Variation</Label>
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
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Apply
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