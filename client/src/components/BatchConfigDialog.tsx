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
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ zIndex: 10001 }}>
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
                  <div className="ml-6 space-y-3 border-l-2 border-slate-600 pl-4">
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

              {/* Advanced Noise */}
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
                  <div className="ml-6 space-y-3 border-l-2 border-slate-600 pl-4">
                    <div className="grid grid-cols-2 gap-4">
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
                            <SelectItem value="perlin" className="text-slate-200 hover:bg-slate-700">Perlin</SelectItem>
                            <SelectItem value="simplex" className="text-slate-200 hover:bg-slate-700">Simplex</SelectItem>
                            <SelectItem value="fractal" className="text-slate-200 hover:bg-slate-700">Fractal</SelectItem>
                            <SelectItem value="worley" className="text-slate-200 hover:bg-slate-700">Worley</SelectItem>
                            <SelectItem value="ridge" className="text-slate-200 hover:bg-slate-700">Ridge</SelectItem>
                            <SelectItem value="turbulence" className="text-slate-200 hover:bg-slate-700">Turbulence</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
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
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
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

                    <div className="space-y-2">
                      <Label className="text-sm text-slate-300">Noise Targets</Label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(currentSettings.noiseTargets).map(([target, enabled]) => (
                          <div key={target} className="flex items-center space-x-2">
                            <Checkbox
                              checked={enabled}
                              onCheckedChange={(checked) => handleSettingsUpdate({
                                noiseTargets: { ...currentSettings.noiseTargets, [target]: checked as boolean }
                              })}
                              className="border-slate-500 data-[state=checked]:bg-blue-600"
                            />
                            <Label className="text-xs text-slate-300 capitalize">{target}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-slate-600" />

              {/* Fill Properties */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    checked={currentSettings.fillEnabled}
                    onCheckedChange={(checked) => handleSettingsUpdate({ fillEnabled: checked as boolean })}
                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <Label className="font-medium text-slate-200">Fill Properties</Label>
                </div>
                
                {currentSettings.fillEnabled && (
                  <div className="ml-6 space-y-3 border-l-2 border-slate-600 pl-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-300">Fill Probability: {currentSettings.fillProbability}%</Label>
                      <Slider
                        value={[currentSettings.fillProbability]}
                        onValueChange={([value]) => handleSettingsUpdate({ fillProbability: value })}
                        max={100}
                        step={5}
                        className="[&_[role=slider]]:bg-blue-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Fill Color Range</Label>
                        <div className="flex space-x-2">
                          <Input
                            type="color"
                            value={currentSettings.fillColorRange[0]}
                            onChange={(e) => handleSettingsUpdate({
                              fillColorRange: [e.target.value, currentSettings.fillColorRange[1]]
                            })}
                            className="w-16 h-8 p-1 bg-slate-800 border-slate-600"
                          />
                          <Input
                            type="color"
                            value={currentSettings.fillColorRange[1]}
                            onChange={(e) => handleSettingsUpdate({
                              fillColorRange: [currentSettings.fillColorRange[0], e.target.value]
                            })}
                            className="w-16 h-8 p-1 bg-slate-800 border-slate-600"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Fill Opacity: {currentSettings.fillOpacityRange[0]}% - {currentSettings.fillOpacityRange[1]}%</Label>
                        <Slider
                          value={currentSettings.fillOpacityRange}
                          onValueChange={(value) => handleSettingsUpdate({ fillOpacityRange: value as [number, number] })}
                          min={0}
                          max={100}
                          step={5}
                          className="[&_[role=slider]]:bg-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-slate-600" />

              {/* Stroke Properties */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    checked={currentSettings.strokeEnabled}
                    onCheckedChange={(checked) => handleSettingsUpdate({ strokeEnabled: checked as boolean })}
                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <Label className="font-medium text-slate-200">Stroke Properties</Label>
                </div>
                
                {currentSettings.strokeEnabled && (
                  <div className="ml-6 space-y-3 border-l-2 border-slate-600 pl-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-300">Stroke Probability: {currentSettings.strokeProbability}%</Label>
                      <Slider
                        value={[currentSettings.strokeProbability]}
                        onValueChange={([value]) => handleSettingsUpdate({ strokeProbability: value })}
                        max={100}
                        step={5}
                        className="[&_[role=slider]]:bg-blue-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Stroke Color Range</Label>
                        <div className="flex space-x-2">
                          <Input
                            type="color"
                            value={currentSettings.strokeColorRange[0]}
                            onChange={(e) => handleSettingsUpdate({
                              strokeColorRange: [e.target.value, currentSettings.strokeColorRange[1]]
                            })}
                            className="w-16 h-8 p-1 bg-slate-800 border-slate-600"
                          />
                          <Input
                            type="color"
                            value={currentSettings.strokeColorRange[1]}
                            onChange={(e) => handleSettingsUpdate({
                              strokeColorRange: [currentSettings.strokeColorRange[0], e.target.value]
                            })}
                            className="w-16 h-8 p-1 bg-slate-800 border-slate-600"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Stroke Width: {currentSettings.strokeWidthRange[0]}px - {currentSettings.strokeWidthRange[1]}px</Label>
                        <Slider
                          value={currentSettings.strokeWidthRange}
                          onValueChange={(value) => handleSettingsUpdate({ strokeWidthRange: value as [number, number] })}
                          min={1}
                          max={20}
                          step={1}
                          className="[&_[role=slider]]:bg-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="bg-slate-600" />

              {/* Property Constraints */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={currentSettings.propertyConstraintsEnabled}
                    onCheckedChange={(checked) => handleSettingsUpdate({ propertyConstraintsEnabled: checked as boolean })}
                    className="border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <Label className="font-medium text-slate-200">Property Constraints</Label>
                </div>
                
                {currentSettings.propertyConstraintsEnabled && (
                  <div className="ml-6 space-y-3 border-l-2 border-slate-600 pl-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Scale Range: {currentSettings.scaleRange[0]}% - {currentSettings.scaleRange[1]}%</Label>
                        <Slider
                          value={currentSettings.scaleRange}
                          onValueChange={(value) => handleSettingsUpdate({ scaleRange: value as [number, number] })}
                          min={10}
                          max={300}
                          step={5}
                          className="[&_[role=slider]]:bg-blue-600"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Rotation Range: {currentSettings.rotationRange[0]}° - {currentSettings.rotationRange[1]}°</Label>
                        <Slider
                          value={currentSettings.rotationRange}
                          onValueChange={(value) => handleSettingsUpdate({ rotationRange: value as [number, number] })}
                          min={0}
                          max={360}
                          step={5}
                          className="[&_[role=slider]]:bg-blue-600"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Opacity Range: {currentSettings.opacityRange[0]}% - {currentSettings.opacityRange[1]}%</Label>
                        <Slider
                          value={currentSettings.opacityRange}
                          onValueChange={(value) => handleSettingsUpdate({ opacityRange: value as [number, number] })}
                          min={0}
                          max={100}
                          step={5}
                          className="[&_[role=slider]]:bg-blue-600"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Position Drift: {currentSettings.positionDrift}px</Label>
                        <Slider
                          value={[currentSettings.positionDrift]}
                          onValueChange={([value]) => handleSettingsUpdate({ positionDrift: value })}
                          min={0}
                          max={200}
                          step={1}
                          className="[&_[role=slider]]:bg-blue-600"
                        />
                      </div>
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
                  <div className="ml-6 space-y-3 border-l-2 border-slate-600 pl-4">
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
                  <div className="ml-6 space-y-3 border-l-2 border-slate-600 pl-4">
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
                  <div className="ml-6 space-y-3 border-l-2 border-slate-600 pl-4">
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

              {/* Safety Constraints */}
              <div className="space-y-2">
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