import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Settings, RotateCcw, X } from 'lucide-react';
import { BlendMode } from '@/lib/shapeTypes';

export interface BatchConfigSettings {
  // Blend Mode Control
  blendModeEnabled: boolean;
  enabledBlendModes: { [key in BlendMode]?: number }; // weight 0-100
  
  // Advanced Noise
  noiseEnabled: boolean;
  noiseAlgorithm: 'perlin' | 'simplex' | 'fractal' | 'worley' | 'ridge' | 'turbulence';
  noiseScale: number;
  noiseOctaves: number;
  noiseAmplitude: number;
  noiseSeed: number;
  noiseTargets: {
    position: boolean;
    rotation: boolean;
    scale: boolean;
    color: boolean;
    opacity: boolean;
  };
  
  // Property Constraints
  propertyConstraintsEnabled: boolean;
  
  // Fill Properties
  fillEnabled: boolean;
  fillProbability: number; // 0-100%
  fillColorRange: [string, string]; // color range
  fillGradientEnabled: boolean;
  fillGradientStops: number;
  fillOpacityRange: [number, number];
  
  // Stroke Properties  
  strokeEnabled: boolean;
  strokeProbability: number; // 0-100%
  strokeColorRange: [string, string];
  strokeGradientEnabled: boolean;
  strokeGradientStops: number;
  strokeOpacityRange: [number, number];
  strokeWidthRange: [number, number];
  
  // Shape Properties
  pointCountRange: [number, number];
  segmentCountRange: [number, number];
  splineCurvesEnabled: boolean;
  closedShapeProbability: number;
  
  // Transform Properties
  positionDrift: number;
  translateXRange: [number, number];
  translateYRange: [number, number];
  scaleUniform: boolean;
  scaleRange: [number, number];
  scaleXRange: [number, number];
  scaleYRange: [number, number];
  rotationRange: [number, number];
  skewXRange: [number, number];
  skewYRange: [number, number];
  
  // General Properties
  opacityRange: [number, number];
  distributionCurve: 'linear' | 'normal' | 'exponential';
  
  // Safety Constraints
  preventInvisibleShapes: boolean; // ensures fill OR stroke is always present
  
  // Color Harmony
  colorHarmonyEnabled: boolean;
  harmonyType: 'monochromatic' | 'analogous' | 'complementary' | 'triadic' | 'split-complementary' | 'tetradic';
  baseColor: string;
  hueVariance: number;
  saturationRange: [number, number];
  lightnessRange: [number, number];
  
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
  
  // Temporal Variation
  temporalEnabled: boolean;
  evolutionMode: 'none' | 'linear' | 'oscillation' | 'chaos';
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
  blendModeEnabled: false,
  enabledBlendModes: { 'source-over': 100 },
  
  noiseEnabled: false,
  noiseAlgorithm: 'perlin',
  noiseScale: 1,
  noiseOctaves: 1,
  noiseAmplitude: 50,
  noiseSeed: Math.floor(Math.random() * 10000),
  noiseTargets: {
    position: true,
    rotation: false,
    scale: false,
    color: false,
    opacity: false
  },
  
  propertyConstraintsEnabled: false,
  
  fillEnabled: true,
  fillProbability: 80,
  fillColorRange: ['#3b82f6', '#8b5cf6'],
  fillGradientEnabled: false,
  fillGradientStops: 2,
  fillOpacityRange: [20, 100],
  
  strokeEnabled: true,
  strokeProbability: 60,
  strokeColorRange: ['#ef4444', '#f59e0b'],
  strokeGradientEnabled: false,
  strokeGradientStops: 2,
  strokeOpacityRange: [40, 100],
  strokeWidthRange: [1, 5],
  
  pointCountRange: [3, 8],
  segmentCountRange: [3, 12],
  splineCurvesEnabled: false,
  closedShapeProbability: 80,
  
  positionDrift: 0,
  translateXRange: [-50, 50],
  translateYRange: [-50, 50],
  scaleUniform: true,
  scaleRange: [50, 200],
  scaleXRange: [50, 200],
  scaleYRange: [50, 200],
  rotationRange: [0, 360],
  skewXRange: [0, 0],
  skewYRange: [0, 0],
  
  opacityRange: [20, 100],
  distributionCurve: 'linear',
  
  preventInvisibleShapes: true,
  
  colorHarmonyEnabled: false,
  harmonyType: 'complementary',
  baseColor: '#3b82f6',
  hueVariance: 15,
  saturationRange: [50, 100],
  lightnessRange: [30, 70],
  
  physicsEnabled: false,
  physicsType: 'none',
  gravityDirection: 270,
  gravityStrength: 50,
  magneticType: 'attraction',
  magneticStrength: 50,
  collisionDistance: 20,
  collisionBounce: 0.5,
  simulationSteps: 100,
  
  temporalEnabled: false,
  evolutionMode: 'linear',
  seedIncrement: 1,
  evolutionTargets: {
    position: true,
    rotation: true,
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
            <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{ zIndex: 10001 }}>
              {/* Blend Mode Control */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    checked={currentSettings.blendModeEnabled}
                    onCheckedChange={(checked) => handleSettingsUpdate({ blendModeEnabled: checked as boolean })}
                  />
                  <Label className="text-sm font-medium text-slate-200">Enable Blend Mode Control</Label>
                </div>
                
                {currentSettings.blendModeEnabled && (
                  <div className="ml-6 space-y-3">
                    <Label className="text-xs text-slate-400">Blend Mode Weights (0-100%)</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {blendModes.map((mode) => (
                        <div key={mode} className="space-y-2">
                          <div className="flex justify-between">
                            <Label className="text-xs text-slate-300 capitalize">{mode.replace('-', ' ')}</Label>
                            <span className="text-xs text-slate-400">{currentSettings.enabledBlendModes[mode] || 0}%</span>
                          </div>
                          <Slider
                            value={[currentSettings.enabledBlendModes[mode] || 0]}
                            onValueChange={([value]) => handleSettingsUpdate({
                              enabledBlendModes: { ...currentSettings.enabledBlendModes, [mode]: value }
                            })}
                            max={100}
                            step={5}
                            className="w-full"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-slate-700" />

              {/* Advanced Noise */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    checked={currentSettings.noiseEnabled}
                    onCheckedChange={(checked) => handleSettingsUpdate({ noiseEnabled: checked as boolean })}
                  />
                  <Label className="text-sm font-medium text-slate-200">Advanced Noise</Label>
                </div>
                
                {currentSettings.noiseEnabled && (
                  <div className="ml-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-400">Algorithm</Label>
                        <Select 
                          value={currentSettings.noiseAlgorithm} 
                          onValueChange={(value: any) => handleSettingsUpdate({ noiseAlgorithm: value })}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600" style={{ zIndex: 10002 }}>
                            <SelectItem value="perlin">Perlin</SelectItem>
                            <SelectItem value="simplex">Simplex</SelectItem>
                            <SelectItem value="fractal">Fractal</SelectItem>
                            <SelectItem value="worley">Worley</SelectItem>
                            <SelectItem value="ridge">Ridge</SelectItem>
                            <SelectItem value="turbulence">Turbulence</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-400">Scale: {currentSettings.noiseScale}</Label>
                        <Slider
                          value={[currentSettings.noiseScale]}
                          onValueChange={([value]) => handleSettingsUpdate({ noiseScale: value })}
                          min={0.1}
                          max={5}
                          step={0.1}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-slate-700" />

              {/* Fill Properties */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    checked={currentSettings.fillEnabled}
                    onCheckedChange={(checked) => handleSettingsUpdate({ fillEnabled: checked as boolean })}
                  />
                  <Label className="text-sm font-medium text-slate-200">Fill Properties</Label>
                </div>
                
                {currentSettings.fillEnabled && (
                  <div className="ml-6 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-400">Fill Probability: {currentSettings.fillProbability}%</Label>
                      <Slider
                        value={[currentSettings.fillProbability]}
                        onValueChange={([value]) => handleSettingsUpdate({ fillProbability: value })}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-slate-700" />

              {/* Transform Properties */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-slate-200">Transform Properties</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-400">Scale Range: {currentSettings.scaleRange[0]}% - {currentSettings.scaleRange[1]}%</Label>
                    <div className="flex space-x-2">
                      <Slider
                        value={currentSettings.scaleRange}
                        onValueChange={(value) => handleSettingsUpdate({ scaleRange: value as [number, number] })}
                        min={10}
                        max={300}
                        step={5}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-400">Rotation Range: {currentSettings.rotationRange[0]}° - {currentSettings.rotationRange[1]}°</Label>
                    <div className="flex space-x-2">
                      <Slider
                        value={currentSettings.rotationRange}
                        onValueChange={(value) => handleSettingsUpdate({ rotationRange: value as [number, number] })}
                        min={0}
                        max={360}
                        step={5}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
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