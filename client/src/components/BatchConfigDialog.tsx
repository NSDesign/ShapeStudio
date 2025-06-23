import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Settings, RotateCcw, Save } from 'lucide-react';
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
  opacityRange: [number, number];
  rotationRange: [number, number];
  scaleRange: [number, number];
  positionDrift: number;
  distributionCurve: 'linear' | 'normal' | 'exponential';
  
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
  opacityRange: [20, 100],
  rotationRange: [0, 360],
  scaleRange: [50, 200],
  positionDrift: 0,
  distributionCurve: 'linear',
  
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

const presets = {
  current: defaultSettings,
  organic: {
    ...defaultSettings,
    blendModeEnabled: true,
    enabledBlendModes: { 'multiply': 40, 'overlay': 40, 'soft-light': 20 },
    colorHarmonyEnabled: true,
    harmonyType: 'analogous' as const,
    physicsEnabled: true,
    physicsType: 'collision' as const
  },
  geometric: {
    ...defaultSettings,
    propertyConstraintsEnabled: true,
    opacityRange: [80, 100] as [number, number],
    rotationRange: [0, 90] as [number, number],
    physicsEnabled: true,
    physicsType: 'gravity' as const
  },
  chaotic: {
    ...defaultSettings,
    blendModeEnabled: true,
    enabledBlendModes: { 
      'multiply': 20, 'screen': 20, 'overlay': 20, 
      'soft-light': 15, 'hard-light': 15, 'difference': 10 
    },
    noiseEnabled: true,
    noiseAmplitude: 80,
    noiseTargets: {
      position: true,
      rotation: true,
      scale: true,
      color: true,
      opacity: true
    },
    physicsEnabled: true,
    physicsType: 'magnetic' as const
  }
};

interface BatchConfigDialogProps {
  settings: BatchConfigSettings;
  onSettingsChange: (settings: BatchConfigSettings) => void;
}

export default function BatchConfigDialog({ settings, onSettingsChange }: BatchConfigDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<BatchConfigSettings>(settings);

  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings]);

  const handleSettingsUpdate = useCallback((updates: Partial<BatchConfigSettings>) => {
    const newSettings = { ...currentSettings, ...updates };
    setCurrentSettings(newSettings);
    onSettingsChange(newSettings);
  }, [currentSettings, onSettingsChange]);

  const handlePresetChange = useCallback((presetName: string) => {
    const preset = presets[presetName as keyof typeof presets];
    if (preset) {
      setCurrentSettings(preset);
      onSettingsChange(preset);
    }
  }, [onSettingsChange]);

  const handleReset = useCallback(() => {
    setCurrentSettings(defaultSettings);
    onSettingsChange(defaultSettings);
  }, [onSettingsChange]);

  const blendModes: BlendMode[] = [
    'source-over', 'multiply', 'screen', 'overlay', 'soft-light', 
    'hard-light', 'color-dodge', 'color-burn', 'darken', 'lighten', 
    'difference', 'exclusion'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-10 w-10 p-0 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-200">Batch Configuration</DialogTitle>
          <DialogDescription className="text-slate-400">
            Configure advanced settings for batch shape generation
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Presets */}
          <div className="space-y-2">
            <Label className="text-slate-300">Presets</Label>
            <Select onValueChange={handlePresetChange}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                <SelectValue placeholder="Select a preset..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="current" className="text-slate-200 hover:bg-slate-700">Current</SelectItem>
                <SelectItem value="organic" className="text-slate-200 hover:bg-slate-700">Organic</SelectItem>
                <SelectItem value="geometric" className="text-slate-200 hover:bg-slate-700">Geometric</SelectItem>
                <SelectItem value="chaotic" className="text-slate-200 hover:bg-slate-700">Chaotic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-slate-600" />

          {/* Blend Mode Control */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="blend-mode-enabled"
                checked={currentSettings.blendModeEnabled}
                onCheckedChange={(checked) => 
                  handleSettingsUpdate({ blendModeEnabled: checked as boolean })
                }
                className="border-slate-500 data-[state=checked]:bg-blue-600"
              />
              <Label htmlFor="blend-mode-enabled" className="font-medium text-slate-200">
                Blend Mode Control
              </Label>
            </div>
            
            {currentSettings.blendModeEnabled && (
              <div className="ml-6 space-y-2 border-l-2 border-slate-600 pl-4">
                <Label className="text-sm text-slate-400">Select blend modes and their weights:</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {blendModes.map((mode) => (
                    <div key={mode} className="flex items-center space-x-2">
                      <Checkbox
                        id={`blend-${mode}`}
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
                      <Label htmlFor={`blend-${mode}`} className="text-xs capitalize text-slate-300">
                        {mode.replace('-', ' ')}
                      </Label>
                      {currentSettings.enabledBlendModes[mode] !== undefined && (
                        <div className="flex-1 max-w-16">
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
                id="noise-enabled"
                checked={currentSettings.noiseEnabled}
                onCheckedChange={(checked) => 
                  handleSettingsUpdate({ noiseEnabled: checked as boolean })
                }
                className="border-slate-500 data-[state=checked]:bg-blue-600"
              />
              <Label htmlFor="noise-enabled" className="font-medium text-slate-200">
                Advanced Noise
              </Label>
            </div>
            
            {currentSettings.noiseEnabled && (
              <div className="ml-6 space-y-3 border-l-2 border-slate-600 pl-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-300">Algorithm</Label>
                    <Select 
                      value={currentSettings.noiseAlgorithm}
                      onValueChange={(value) => 
                        handleSettingsUpdate({ noiseAlgorithm: value as any })
                      }
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
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
                      min={0}
                      max={100}
                      step={1}
                      className="[&_[role=slider]]:bg-blue-600"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-slate-300">Target Properties</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(currentSettings.noiseTargets).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-1">
                        <Checkbox
                          id={`noise-${key}`}
                          checked={value}
                          onCheckedChange={(checked) => {
                            const newTargets = { ...currentSettings.noiseTargets };
                            newTargets[key as keyof typeof newTargets] = checked as boolean;
                            handleSettingsUpdate({ noiseTargets: newTargets });
                          }}
                          className="border-slate-500 data-[state=checked]:bg-blue-600"
                        />
                        <Label htmlFor={`noise-${key}`} className="text-xs capitalize text-slate-300">
                          {key}
                        </Label>
                      </div>
                    ))}
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
                id="property-constraints-enabled"
                checked={currentSettings.propertyConstraintsEnabled}
                onCheckedChange={(checked) => 
                  handleSettingsUpdate({ propertyConstraintsEnabled: checked as boolean })
                }
                className="border-slate-500 data-[state=checked]:bg-blue-600"
              />
              <Label htmlFor="property-constraints-enabled" className="font-medium text-slate-200">
                Property Constraints
              </Label>
            </div>
            
            {currentSettings.propertyConstraintsEnabled && (
              <div className="ml-6 space-y-3 border-l-2 border-slate-600 pl-4">
                <div className="space-y-2">
                  <Label className="text-sm text-slate-300">
                    Opacity Range: {currentSettings.opacityRange[0]}% - {currentSettings.opacityRange[1]}%
                  </Label>
                  <div className="px-2">
                    <Slider
                      value={currentSettings.opacityRange}
                      onValueChange={(value) => handleSettingsUpdate({ opacityRange: value as [number, number] })}
                      min={0}
                      max={100}
                      step={1}
                      className="[&_[role=slider]]:bg-blue-600"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-slate-300">
                    Rotation Range: {currentSettings.rotationRange[0]}° - {currentSettings.rotationRange[1]}°
                  </Label>
                  <div className="px-2">
                    <Slider
                      value={currentSettings.rotationRange}
                      onValueChange={(value) => handleSettingsUpdate({ rotationRange: value as [number, number] })}
                      min={0}
                      max={360}
                      step={1}
                      className="[&_[role=slider]]:bg-blue-600"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-slate-300">
                    Scale Range: {currentSettings.scaleRange[0]}% - {currentSettings.scaleRange[1]}%
                  </Label>
                  <div className="px-2">
                    <Slider
                      value={currentSettings.scaleRange}
                      onValueChange={(value) => handleSettingsUpdate({ scaleRange: value as [number, number] })}
                      min={10}
                      max={500}
                      step={5}
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
                id="color-harmony-enabled"
                checked={currentSettings.colorHarmonyEnabled}
                onCheckedChange={(checked) => 
                  handleSettingsUpdate({ colorHarmonyEnabled: checked as boolean })
                }
                className="border-slate-500 data-[state=checked]:bg-blue-600"
              />
              <Label htmlFor="color-harmony-enabled" className="font-medium text-slate-200">
                Color Harmony
              </Label>
            </div>
            
            {currentSettings.colorHarmonyEnabled && (
              <div className="ml-6 space-y-3 border-l-2 border-slate-600 pl-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-300">Harmony Type</Label>
                    <Select 
                      value={currentSettings.harmonyType}
                      onValueChange={(value) => 
                        handleSettingsUpdate({ harmonyType: value as any })
                      }
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="monochromatic" className="text-slate-200 hover:bg-slate-700">Monochromatic</SelectItem>
                        <SelectItem value="analogous" className="text-slate-200 hover:bg-slate-700">Analogous</SelectItem>
                        <SelectItem value="complementary" className="text-slate-200 hover:bg-slate-700">Complementary</SelectItem>
                        <SelectItem value="triadic" className="text-slate-200 hover:bg-slate-700">Triadic</SelectItem>
                        <SelectItem value="split-complementary" className="text-slate-200 hover:bg-slate-700">Split-Complementary</SelectItem>
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
                      className="w-full h-10 bg-slate-800 border-slate-600"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-slate-300">Hue Variance: ±{currentSettings.hueVariance}°</Label>
                  <Slider
                    value={[currentSettings.hueVariance]}
                    onValueChange={([value]) => handleSettingsUpdate({ hueVariance: value })}
                    min={0}
                    max={30}
                    step={1}
                    className="[&_[role=slider]]:bg-blue-600"
                  />
                </div>
              </div>
            )}
          </div>

          <Separator className="bg-slate-600" />

          {/* Physics Simulation */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="physics-enabled"
                checked={currentSettings.physicsEnabled}
                onCheckedChange={(checked) => 
                  handleSettingsUpdate({ physicsEnabled: checked as boolean })
                }
                className="border-slate-500 data-[state=checked]:bg-blue-600"
              />
              <Label htmlFor="physics-enabled" className="font-medium text-slate-200">
                Physics Simulation
              </Label>
            </div>
            
            {currentSettings.physicsEnabled && (
              <div className="ml-6 space-y-3 border-l-2 border-slate-600 pl-4">
                <div className="space-y-2">
                  <Label className="text-sm text-slate-300">Physics Type</Label>
                  <Select 
                    value={currentSettings.physicsType}
                    onValueChange={(value) => 
                      handleSettingsUpdate({ physicsType: value as any })
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
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
                id="temporal-enabled"
                checked={currentSettings.temporalEnabled}
                onCheckedChange={(checked) => 
                  handleSettingsUpdate({ temporalEnabled: checked as boolean })
                }
                className="border-slate-500 data-[state=checked]:bg-blue-600"
              />
              <Label htmlFor="temporal-enabled" className="font-medium text-slate-200">
                Temporal Variation
              </Label>
            </div>
            
            {currentSettings.temporalEnabled && (
              <div className="ml-6 space-y-3 border-l-2 border-slate-600 pl-4">
                <div className="space-y-2">
                  <Label className="text-sm text-slate-300">Evolution Mode</Label>
                  <Select 
                    value={currentSettings.evolutionMode}
                    onValueChange={(value) => 
                      handleSettingsUpdate({ evolutionMode: value as any })
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
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

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button 
              onClick={handleReset} 
              variant="outline"
              className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button 
              onClick={() => setIsOpen(false)} 
              variant="outline"
              className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}