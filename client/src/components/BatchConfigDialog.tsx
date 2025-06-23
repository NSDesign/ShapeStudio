import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
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
  opacityRange: [0.1, 1.0],
  rotationRange: [0, 360],
  scaleRange: [0.5, 2.0],
  positionDrift: 50,
  distributionCurve: 'linear',
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
  const [currentSettings, setCurrentSettings] = useState<BatchConfigSettings>(settings);

  useEffect(() => {
    setCurrentSettings(settings);
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
          colorHarmonyEnabled: true,
          harmonyType: 'analogous',
          physicsEnabled: false,
          temporalEnabled: false,
        };
        break;
      case 'geometric':
        newSettings = {
          noiseEnabled: false,
          propertyConstraintsEnabled: true,
          distributionCurve: 'linear',
          colorHarmonyEnabled: true,
          harmonyType: 'complementary',
          physicsEnabled: false,
          temporalEnabled: false,
        };
        break;
      case 'chaotic':
        newSettings = {
          noiseEnabled: true,
          noiseAlgorithm: 'turbulence',
          noiseScale: 0.2,
          noiseTargets: { position: true, rotation: true, scale: true, color: true, opacity: true },
          physicsEnabled: true,
          physicsType: 'collision',
          temporalEnabled: true,
          evolutionMode: 'chaos',
        };
        break;
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
        className="fixed inset-0 flex items-center justify-center bg-black/80 p-4 z-50"
        onInteractOutside={(e) => {
          // Only close on backdrop clicks, not on Select interactions
          const target = e.target as Element;
          if (target === e.currentTarget) {
            // Clicked on backdrop
            return;
          }
          e.preventDefault();
        }}
      >
        <div className="w-[90vw] max-w-[500px] h-[85vh] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}