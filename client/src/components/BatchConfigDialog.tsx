import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  enabledBlendModes: {},
  noiseEnabled: false,
  noiseAlgorithm: 'perlin',
  noiseScale: 0.1,
  noiseOctaves: 3,
  noiseAmplitude: 1.0,
  noiseSeed: 12345,
  noiseTargets: {
    position: true,
    rotation: false,
    scale: false,
    color: false,
    opacity: false,
  },
  propertyConstraintsEnabled: false,
  
  // Fill Properties
  fillEnabled: true,
  fillProbability: 80,
  fillColorRange: ['#3b82f6', '#8b5cf6'],
  fillGradientEnabled: false,
  fillGradientStops: 3,
  fillOpacityRange: [0.7, 1.0],
  
  // Stroke Properties
  strokeEnabled: true,
  strokeProbability: 60,
  strokeColorRange: ['#1e293b', '#64748b'],
  strokeGradientEnabled: false,
  strokeGradientStops: 2,
  strokeOpacityRange: [0.8, 1.0],
  strokeWidthRange: [1, 4],
  
  // Shape Properties
  pointCountRange: [3, 8],
  segmentCountRange: [3, 12],
  splineCurvesEnabled: false,
  closedShapeProbability: 85,
  
  // Transform Properties
  positionDrift: 50,
  translateXRange: [-100, 100],
  translateYRange: [-100, 100],
  scaleUniform: true,
  scaleRange: [0.5, 2.0],
  scaleXRange: [0.5, 2.0],
  scaleYRange: [0.5, 2.0],
  rotationRange: [0, 360],
  skewXRange: [-15, 15],
  skewYRange: [-15, 15],
  
  // General Properties
  opacityRange: [0.1, 1.0],
  distributionCurve: 'linear',
  
  // Safety Constraints
  preventInvisibleShapes: true,
  
  colorHarmonyEnabled: false,
  harmonyType: 'complementary',
  baseColor: '#3b82f6',
  hueVariance: 30,
  saturationRange: [50, 100],
  lightnessRange: [40, 80],
  physicsEnabled: false,
  physicsType: 'none',
  gravityDirection: 270,
  gravityStrength: 0.5,
  magneticType: 'attraction',
  magneticStrength: 0.3,
  collisionDistance: 20,
  collisionBounce: 0.8,
  simulationSteps: 10,
  temporalEnabled: false,
  evolutionMode: 'none',
  seedIncrement: 1,
  evolutionTargets: {
    position: true,
    rotation: false,
    scale: false,
    color: false,
    opacity: false,
  },
};

interface BatchConfigDialogProps {
  settings: BatchConfigSettings;
  onSettingsChange: (settings: BatchConfigSettings) => void;
}

export default function BatchConfigDialog({ settings, onSettingsChange }: BatchConfigDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<BatchConfigSettings>(() => ({ ...defaultSettings, ...settings }));

  useEffect(() => {
    // Merge incoming settings with defaults to ensure all properties exist
    const mergedSettings = { ...defaultSettings, ...settings };
    setCurrentSettings(mergedSettings);
  }, [settings]);

  const handleSettingsUpdate = useCallback((updates: Partial<BatchConfigSettings>) => {
    const newSettings = { ...currentSettings, ...updates };
    setCurrentSettings(newSettings);
    onSettingsChange(newSettings);
  }, [currentSettings, onSettingsChange]);

  const handlePresetChange = useCallback((preset: string) => {
    let newSettings: Partial<BatchConfigSettings>;
    
    switch (preset) {
      case 'organic':
        newSettings = {
          noiseEnabled: true,
          noiseAlgorithm: 'perlin',
          noiseScale: 0.05,
          noiseTargets: { position: true, rotation: true, scale: true, color: false, opacity: false },
          propertyConstraintsEnabled: true,
          distributionCurve: 'normal',
          colorHarmonyEnabled: true,
          harmonyType: 'analogous',
        };
        break;
      case 'geometric':
        newSettings = {
          noiseEnabled: false,
          propertyConstraintsEnabled: true,
          distributionCurve: 'linear',
          colorHarmonyEnabled: true,
          harmonyType: 'complementary',
        };
        break;
      case 'chaotic':
        newSettings = {
          noiseEnabled: true,
          noiseAlgorithm: 'turbulence',
          noiseScale: 0.2,
          noiseTargets: { position: true, rotation: true, scale: true, color: true, opacity: true },
          propertyConstraintsEnabled: true,
          distributionCurve: 'exponential',
          colorHarmonyEnabled: false,
        };
        break;
      case 'current':
      default:
        return;
    }
    
    handleSettingsUpdate(newSettings);
  }, [handleSettingsUpdate]);

  const resetToDefaults = useCallback(() => {
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
      <DialogContent 
        className="w-[90vw] max-w-[600px] h-[85vh] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden p-0 [&>button]:hidden"
        onEscapeKeyDown={(e) => {
          // Only close on explicit escape key
        }}
        onPointerDownOutside={(e) => {
          // Only close when clicking outside the dialog
          const target = e.target as Element;
          if (!target.closest('[data-radix-popper-content-wrapper]')) {
            // Allow closing only if not clicking on select content
          } else {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          // Prevent all other interaction-based closing
          e.preventDefault();
        }}
      >
        <DialogTitle className="sr-only">Batch Configuration</DialogTitle>
        <DialogDescription className="sr-only">
          Configure advanced settings for batch shape generation
        </DialogDescription>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
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
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
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
                  checked={currentSettings.blendModeEnabled}
                  onCheckedChange={(checked) => 
                    handleSettingsUpdate({ blendModeEnabled: checked as boolean })
                  }
                  className="border-slate-600"
                />
                <Label className="text-slate-300 font-medium">Blend Mode Control</Label>
              </div>
              
              {currentSettings.blendModeEnabled && (
                <div className="ml-6 space-y-3 border-l-2 border-slate-600 pl-4">
                  <Label className="text-sm text-slate-300">Enabled Blend Modes & Weights</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                    {blendModes.map(mode => (
                      <div key={mode} className="flex items-center space-x-2">
                        <Checkbox
                          checked={!!currentSettings.enabledBlendModes[mode]}
                          onCheckedChange={(checked) => {
                            const newBlendModes = { ...currentSettings.enabledBlendModes };
                            if (checked) {
                              newBlendModes[mode] = 50; // default weight
                            } else {
                              delete newBlendModes[mode];
                            }
                            handleSettingsUpdate({ enabledBlendModes: newBlendModes });
                          }}
                          className="border-slate-600"
                        />
                        <Label className="text-xs text-slate-300 flex-1 capitalize">
                          {mode.replace('-', ' ')}
                        </Label>
                        {currentSettings.enabledBlendModes[mode] && (
                          <div className="flex items-center space-x-1">
                            <Slider
                              value={[currentSettings.enabledBlendModes[mode] || 50]}
                              onValueChange={([value]) => {
                                const newBlendModes = { ...currentSettings.enabledBlendModes };
                                newBlendModes[mode] = value;
                                handleSettingsUpdate({ enabledBlendModes: newBlendModes });
                              }}
                              min={1}
                              max={100}
                              step={1}
                              className="w-16"
                            />
                            <span className="text-xs text-slate-400 w-8">
                              {currentSettings.enabledBlendModes[mode]}%
                            </span>
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
                  onCheckedChange={(checked) => 
                    handleSettingsUpdate({ noiseEnabled: checked as boolean })
                  }
                  className="border-slate-600"
                />
                <Label className="text-slate-300 font-medium">Advanced Noise</Label>
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
                      <Label className="text-sm text-slate-300">Scale</Label>
                      <Slider
                        value={[currentSettings.noiseScale]}
                        onValueChange={([value]) => handleSettingsUpdate({ noiseScale: value })}
                        min={0.01}
                        max={1}
                        step={0.01}
                        className="w-full"
                      />
                      <span className="text-xs text-slate-400">{currentSettings.noiseScale.toFixed(2)}</span>
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
                  onCheckedChange={(checked) => 
                    handleSettingsUpdate({ propertyConstraintsEnabled: checked as boolean })
                  }
                  className="border-slate-600"
                />
                <Label className="text-slate-300 font-medium">Property Constraints</Label>
              </div>
              
              {currentSettings.propertyConstraintsEnabled && (
                <div className="ml-6 space-y-4 border-l-2 border-slate-600 pl-4 max-h-64 overflow-y-auto">
                  
                  {/* Safety Constraint */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={currentSettings.preventInvisibleShapes}
                        onCheckedChange={(checked) => 
                          handleSettingsUpdate({ preventInvisibleShapes: checked as boolean })
                        }
                        className="border-slate-600"
                      />
                      <Label className="text-sm text-slate-300">Prevent Invisible Shapes</Label>
                    </div>
                    <p className="text-xs text-slate-400 ml-6">Ensures at least fill OR stroke is always present</p>
                  </div>

                  <Separator className="bg-slate-600" />

                  {/* Fill Properties */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={currentSettings.fillEnabled}
                        onCheckedChange={(checked) => 
                          handleSettingsUpdate({ fillEnabled: checked as boolean })
                        }
                        className="border-slate-600"
                      />
                      <Label className="text-sm text-slate-300 font-medium">Fill Properties</Label>
                    </div>
                    
                    {currentSettings.fillEnabled && (
                      <div className="ml-6 space-y-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-300">Fill Probability (%)</Label>
                          <Slider
                            value={[currentSettings.fillProbability]}
                            onValueChange={([value]) => handleSettingsUpdate({ fillProbability: value })}
                            min={0}
                            max={100}
                            step={5}
                            className="w-full"
                          />
                          <span className="text-xs text-slate-400">{currentSettings.fillProbability}%</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-300">Fill Color Start</Label>
                            <Input
                              type="color"
                              value={currentSettings.fillColorRange[0]}
                              onChange={(e) => handleSettingsUpdate({ 
                                fillColorRange: [e.target.value, currentSettings.fillColorRange[1]] 
                              })}
                              className="bg-slate-800 border-slate-600 h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-300">Fill Color End</Label>
                            <Input
                              type="color"
                              value={currentSettings.fillColorRange[1]}
                              onChange={(e) => handleSettingsUpdate({ 
                                fillColorRange: [currentSettings.fillColorRange[0], e.target.value] 
                              })}
                              className="bg-slate-800 border-slate-600 h-8"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            checked={currentSettings.fillGradientEnabled}
                            onCheckedChange={(checked) => 
                              handleSettingsUpdate({ fillGradientEnabled: checked as boolean })
                            }
                            className="border-slate-600"
                          />
                          <Label className="text-xs text-slate-300">Enable Fill Gradients</Label>
                        </div>

                        {currentSettings.fillGradientEnabled && (
                          <div className="space-y-2">
                            <Label className="text-xs text-slate-300">Gradient Stops</Label>
                            <Slider
                              value={[currentSettings.fillGradientStops]}
                              onValueChange={([value]) => handleSettingsUpdate({ fillGradientStops: value })}
                              min={2}
                              max={8}
                              step={1}
                              className="w-full"
                            />
                            <span className="text-xs text-slate-400">{currentSettings.fillGradientStops} stops</span>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="text-xs text-slate-300">Fill Opacity Range</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="1"
                              step="0.1"
                              value={currentSettings.fillOpacityRange[0]}
                              onChange={(e) => handleSettingsUpdate({ 
                                fillOpacityRange: [parseFloat(e.target.value), currentSettings.fillOpacityRange[1]] 
                              })}
                              className="bg-slate-800 border-slate-600 text-slate-200"
                            />
                            <Input
                              type="number"
                              min="0"
                              max="1"
                              step="0.1"
                              value={currentSettings.fillOpacityRange[1]}
                              onChange={(e) => handleSettingsUpdate({ 
                                fillOpacityRange: [currentSettings.fillOpacityRange[0], parseFloat(e.target.value)] 
                              })}
                              className="bg-slate-800 border-slate-600 text-slate-200"
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
                        onCheckedChange={(checked) => 
                          handleSettingsUpdate({ strokeEnabled: checked as boolean })
                        }
                        className="border-slate-600"
                      />
                      <Label className="text-sm text-slate-300 font-medium">Stroke Properties</Label>
                    </div>
                    
                    {currentSettings.strokeEnabled && (
                      <div className="ml-6 space-y-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-300">Stroke Probability (%)</Label>
                          <Slider
                            value={[currentSettings.strokeProbability]}
                            onValueChange={([value]) => handleSettingsUpdate({ strokeProbability: value })}
                            min={0}
                            max={100}
                            step={5}
                            className="w-full"
                          />
                          <span className="text-xs text-slate-400">{currentSettings.strokeProbability}%</span>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-slate-300">Stroke Width Range</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              min="0.5"
                              max="20"
                              step="0.5"
                              value={currentSettings.strokeWidthRange[0]}
                              onChange={(e) => handleSettingsUpdate({ 
                                strokeWidthRange: [parseFloat(e.target.value), currentSettings.strokeWidthRange[1]] 
                              })}
                              className="bg-slate-800 border-slate-600 text-slate-200"
                            />
                            <Input
                              type="number"
                              min="0.5"
                              max="20"
                              step="0.5"
                              value={currentSettings.strokeWidthRange[1]}
                              onChange={(e) => handleSettingsUpdate({ 
                                strokeWidthRange: [currentSettings.strokeWidthRange[0], parseFloat(e.target.value)] 
                              })}
                              className="bg-slate-800 border-slate-600 text-slate-200"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-300">Stroke Color Start</Label>
                            <Input
                              type="color"
                              value={currentSettings.strokeColorRange[0]}
                              onChange={(e) => handleSettingsUpdate({ 
                                strokeColorRange: [e.target.value, currentSettings.strokeColorRange[1]] 
                              })}
                              className="bg-slate-800 border-slate-600 h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-300">Stroke Color End</Label>
                            <Input
                              type="color"
                              value={currentSettings.strokeColorRange[1]}
                              onChange={(e) => handleSettingsUpdate({ 
                                strokeColorRange: [currentSettings.strokeColorRange[0], e.target.value] 
                              })}
                              className="bg-slate-800 border-slate-600 h-8"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator className="bg-slate-600" />

                  {/* Shape Properties */}
                  <div className="space-y-3">
                    <Label className="text-sm text-slate-300 font-medium">Shape Properties</Label>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Point Count Range</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min="3"
                          max="20"
                          step="1"
                          value={currentSettings.pointCountRange[0]}
                          onChange={(e) => handleSettingsUpdate({ 
                            pointCountRange: [parseInt(e.target.value), currentSettings.pointCountRange[1]] 
                          })}
                          className="bg-slate-800 border-slate-600 text-slate-200"
                        />
                        <Input
                          type="number"
                          min="3"
                          max="20"
                          step="1"
                          value={currentSettings.pointCountRange[1]}
                          onChange={(e) => handleSettingsUpdate({ 
                            pointCountRange: [currentSettings.pointCountRange[0], parseInt(e.target.value)] 
                          })}
                          className="bg-slate-800 border-slate-600 text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={currentSettings.splineCurvesEnabled}
                        onCheckedChange={(checked) => 
                          handleSettingsUpdate({ splineCurvesEnabled: checked as boolean })
                        }
                        className="border-slate-600"
                      />
                      <Label className="text-xs text-slate-300">Enable Spline Curves</Label>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Closed Shape Probability (%)</Label>
                      <Slider
                        value={[currentSettings.closedShapeProbability]}
                        onValueChange={([value]) => handleSettingsUpdate({ closedShapeProbability: value })}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                      <span className="text-xs text-slate-400">{currentSettings.closedShapeProbability}%</span>
                    </div>
                  </div>

                  <Separator className="bg-slate-600" />

                  {/* Transform Properties */}
                  <div className="space-y-3">
                    <Label className="text-sm text-slate-300 font-medium">Transform Properties</Label>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Translation X Range</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min="-500"
                          max="500"
                          step="10"
                          value={currentSettings.translateXRange[0]}
                          onChange={(e) => handleSettingsUpdate({ 
                            translateXRange: [parseInt(e.target.value), currentSettings.translateXRange[1]] 
                          })}
                          className="bg-slate-800 border-slate-600 text-slate-200"
                        />
                        <Input
                          type="number"
                          min="-500"
                          max="500"
                          step="10"
                          value={currentSettings.translateXRange[1]}
                          onChange={(e) => handleSettingsUpdate({ 
                            translateXRange: [currentSettings.translateXRange[0], parseInt(e.target.value)] 
                          })}
                          className="bg-slate-800 border-slate-600 text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Translation Y Range</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min="-500"
                          max="500"
                          step="10"
                          value={currentSettings.translateYRange[0]}
                          onChange={(e) => handleSettingsUpdate({ 
                            translateYRange: [parseInt(e.target.value), currentSettings.translateYRange[1]] 
                          })}
                          className="bg-slate-800 border-slate-600 text-slate-200"
                        />
                        <Input
                          type="number"
                          min="-500"
                          max="500"
                          step="10"
                          value={currentSettings.translateYRange[1]}
                          onChange={(e) => handleSettingsUpdate({ 
                            translateYRange: [currentSettings.translateYRange[0], parseInt(e.target.value)] 
                          })}
                          className="bg-slate-800 border-slate-600 text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={currentSettings.scaleUniform}
                        onCheckedChange={(checked) => 
                          handleSettingsUpdate({ scaleUniform: checked as boolean })
                        }
                        className="border-slate-600"
                      />
                      <Label className="text-xs text-slate-300">Uniform Scaling</Label>
                    </div>

                    {currentSettings.scaleUniform ? (
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-300">Scale Range (Uniform)</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            min="0.1"
                            max="5"
                            step="0.1"
                            value={currentSettings.scaleRange[0]}
                            onChange={(e) => handleSettingsUpdate({ 
                              scaleRange: [parseFloat(e.target.value), currentSettings.scaleRange[1]] 
                            })}
                            className="bg-slate-800 border-slate-600 text-slate-200"
                          />
                          <Input
                            type="number"
                            min="0.1"
                            max="5"
                            step="0.1"
                            value={currentSettings.scaleRange[1]}
                            onChange={(e) => handleSettingsUpdate({ 
                              scaleRange: [currentSettings.scaleRange[0], parseFloat(e.target.value)] 
                            })}
                            className="bg-slate-800 border-slate-600 text-slate-200"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-300">Scale X Range</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              min="0.1"
                              max="5"
                              step="0.1"
                              value={currentSettings.scaleXRange[0]}
                              onChange={(e) => handleSettingsUpdate({ 
                                scaleXRange: [parseFloat(e.target.value), currentSettings.scaleXRange[1]] 
                              })}
                              className="bg-slate-800 border-slate-600 text-slate-200"
                            />
                            <Input
                              type="number"
                              min="0.1"
                              max="5"
                              step="0.1"
                              value={currentSettings.scaleXRange[1]}
                              onChange={(e) => handleSettingsUpdate({ 
                                scaleXRange: [currentSettings.scaleXRange[0], parseFloat(e.target.value)] 
                              })}
                              className="bg-slate-800 border-slate-600 text-slate-200"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-300">Scale Y Range</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              min="0.1"
                              max="5"
                              step="0.1"
                              value={currentSettings.scaleYRange[0]}
                              onChange={(e) => handleSettingsUpdate({ 
                                scaleYRange: [parseFloat(e.target.value), currentSettings.scaleYRange[1]] 
                              })}
                              className="bg-slate-800 border-slate-600 text-slate-200"
                            />
                            <Input
                              type="number"
                              min="0.1"
                              max="5"
                              step="0.1"
                              value={currentSettings.scaleYRange[1]}
                              onChange={(e) => handleSettingsUpdate({ 
                                scaleYRange: [currentSettings.scaleYRange[0], parseFloat(e.target.value)] 
                              })}
                              className="bg-slate-800 border-slate-600 text-slate-200"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Rotation Range (degrees)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="360"
                          step="15"
                          value={currentSettings.rotationRange[0]}
                          onChange={(e) => handleSettingsUpdate({ 
                            rotationRange: [parseInt(e.target.value), currentSettings.rotationRange[1]] 
                          })}
                          className="bg-slate-800 border-slate-600 text-slate-200"
                        />
                        <Input
                          type="number"
                          min="0"
                          max="360"
                          step="15"
                          value={currentSettings.rotationRange[1]}
                          onChange={(e) => handleSettingsUpdate({ 
                            rotationRange: [currentSettings.rotationRange[0], parseInt(e.target.value)] 
                          })}
                          className="bg-slate-800 border-slate-600 text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Skew X Range (degrees)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min="-45"
                          max="45"
                          step="5"
                          value={currentSettings.skewXRange[0]}
                          onChange={(e) => handleSettingsUpdate({ 
                            skewXRange: [parseInt(e.target.value), currentSettings.skewXRange[1]] 
                          })}
                          className="bg-slate-800 border-slate-600 text-slate-200"
                        />
                        <Input
                          type="number"
                          min="-45"
                          max="45"
                          step="5"
                          value={currentSettings.skewXRange[1]}
                          onChange={(e) => handleSettingsUpdate({ 
                            skewXRange: [currentSettings.skewXRange[0], parseInt(e.target.value)] 
                          })}
                          className="bg-slate-800 border-slate-600 text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Skew Y Range (degrees)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min="-45"
                          max="45"
                          step="5"
                          value={currentSettings.skewYRange[0]}
                          onChange={(e) => handleSettingsUpdate({ 
                            skewYRange: [parseInt(e.target.value), currentSettings.skewYRange[1]] 
                          })}
                          className="bg-slate-800 border-slate-600 text-slate-200"
                        />
                        <Input
                          type="number"
                          min="-45"
                          max="45"
                          step="5"
                          value={currentSettings.skewYRange[1]}
                          onChange={(e) => handleSettingsUpdate({ 
                            skewYRange: [currentSettings.skewYRange[0], parseInt(e.target.value)] 
                          })}
                          className="bg-slate-800 border-slate-600 text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-slate-300">Overall Opacity Range</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={currentSettings.opacityRange[0]}
                          onChange={(e) => handleSettingsUpdate({ 
                            opacityRange: [parseFloat(e.target.value), currentSettings.opacityRange[1]] 
                          })}
                          className="bg-slate-800 border-slate-600 text-slate-200"
                        />
                        <Input
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={currentSettings.opacityRange[1]}
                          onChange={(e) => handleSettingsUpdate({ 
                            opacityRange: [currentSettings.opacityRange[0], parseFloat(e.target.value)] 
                          })}
                          className="bg-slate-800 border-slate-600 text-slate-200"
                        />
                      </div>
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
                  onCheckedChange={(checked) => 
                    handleSettingsUpdate({ colorHarmonyEnabled: checked as boolean })
                  }
                  className="border-slate-600"
                />
                <Label className="text-slate-300 font-medium">Color Harmony</Label>
              </div>
              
              {currentSettings.colorHarmonyEnabled && (
                <div className="ml-6 space-y-3 border-l-2 border-slate-600 pl-4">
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
                        <SelectItem value="split-complementary" className="text-slate-200 hover:bg-slate-700">Split Complementary</SelectItem>
                        <SelectItem value="tetradic" className="text-slate-200 hover:bg-slate-700">Tetradic</SelectItem>
                      </SelectContent>
                    </Select>
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
                  onCheckedChange={(checked) => 
                    handleSettingsUpdate({ physicsEnabled: checked as boolean })
                  }
                  className="border-slate-600"
                />
                <Label className="text-slate-300 font-medium">Physics Simulation</Label>
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
                        <SelectItem value="collision" className="text-slate-200 hover:bg-slate-700">Collision</SelectItem>
                        <SelectItem value="flocking" className="text-slate-200 hover:bg-slate-700">Flocking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <Separator className="bg-slate-600" />

            {/* Temporal Variation */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  checked={currentSettings.temporalEnabled}
                  onCheckedChange={(checked) => 
                    handleSettingsUpdate({ temporalEnabled: checked as boolean })
                  }
                  className="border-slate-600"
                />
                <Label className="text-slate-300 font-medium">Temporal Variation</Label>
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
                        <SelectItem value="linear" className="text-slate-200 hover:bg-slate-700">Linear</SelectItem>
                        <SelectItem value="oscillation" className="text-slate-200 hover:bg-slate-700">Oscillation</SelectItem>
                        <SelectItem value="chaos" className="text-slate-200 hover:bg-slate-700">Chaos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-700">
          <Button 
            onClick={resetToDefaults}
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
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}