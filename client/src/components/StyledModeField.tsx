import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumericInput } from "@/components/ui/numeric-input";
import { useState, useEffect } from "react";

export type ModeKind = 'fixed' | 'range' | 'incremental';

export type ModeConfig = 
  | { kind: 'fixed'; value: number }
  | { kind: 'range'; min: number; max: number }
  | { kind: 'incremental'; startValue: number; increment: number };

export interface StyledModeFieldProps {
  label: string;
  config: ModeConfig;
  onChange: (config: ModeConfig) => void;
  bounds: { min: number; max: number };
  unit?: string;
  step?: number;
  allowedModes?: ModeKind[];
}

export function StyledModeField({ label, config, onChange, bounds, unit = "", step = 1, allowedModes = ['fixed', 'range', 'incremental'] }: StyledModeFieldProps) {
  // Local string state for numeric inputs to prevent focus loss
  const [fixedValueStr, setFixedValueStr] = useState("");
  const [minValueStr, setMinValueStr] = useState("");
  const [maxValueStr, setMaxValueStr] = useState("");
  
  // Sync local string state when config changes
  useEffect(() => {
    if (config.kind === 'fixed') {
      setFixedValueStr(config.value.toString());
    }
  }, [config.kind === 'fixed' ? config.value : null]);
  
  useEffect(() => {
    if (config.kind === 'range') {
      setMinValueStr(config.min.toString());
      setMaxValueStr(config.max.toString());
    }
  }, [config.kind === 'range' ? config.min : null, config.kind === 'range' ? config.max : null]);
  
  // Create safe ID base for HTML elements
  const idBase = label.toLowerCase().replace(/[^a-z0-9_-]/g, "-");

  const handleModeChange = (mode: ModeKind) => {
    switch (mode) {
      case 'fixed':
        onChange({ kind: 'fixed', value: bounds.min });
        break;
      case 'range':
        onChange({ kind: 'range', min: bounds.min, max: bounds.max });
        break;
      case 'incremental':
        onChange({ kind: 'incremental', startValue: bounds.min, increment: step });
        break;
    }
  };

  return (
    <div className="space-y-6" data-testid={`styled-mode-field-${idBase}`}>
      {/* Label with Pattern 2 Slate Styling */}
      <div className="flex items-baseline justify-between">
        <Label className="text-slate-300 text-xs font-medium">{label}</Label>
        <span className="text-slate-400 text-xs">{unit}</span>
      </div>

      {/* Mode Selection Dropdown */}
      <div className="flex items-center space-x-2">
        <Label className="text-slate-300 text-xs">Mode:</Label>
        <Select
          value={config.kind}
          onValueChange={handleModeChange}
        >
          <SelectTrigger className="w-24 h-8 bg-slate-700 border-slate-600 text-white" data-testid={`select-${idBase}-mode`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600 text-white z-50">
            {allowedModes.includes('fixed') && <SelectItem value="fixed">Fixed</SelectItem>}
            {allowedModes.includes('range') && <SelectItem value="range">Range</SelectItem>}
            {allowedModes.includes('incremental') && <SelectItem value="incremental">Incremental</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {/* Incremental Controls with Pattern 2 Styling */}
      {config.kind === 'incremental' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300 text-xs">Start Value</Label>
            <NumericInput
              value={config.startValue}
              onChange={(startValue) => onChange({ ...config, startValue })}
              min={bounds.min}
              max={bounds.max}
              step={step}
              className="h-9 bg-slate-700 border-slate-600 text-slate-300 show-spinners"
              data-testid={`input-${idBase}-start-value`}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300 text-xs">Increment</Label>
            <NumericInput
              value={config.increment}
              onChange={(increment) => onChange({ ...config, increment })}
              min={-1000}
              max={1000}
              step={step}
              className="h-9 bg-slate-700 border-slate-600 text-slate-300 show-spinners"
              data-testid={`input-${idBase}-increment`}
            />
          </div>
        </div>
      )}

      {/* Mode-specific Controls with Pattern 2 Styling */}
      {config.kind === 'fixed' && (
        <NumericInput
          value={config.value}
          onChange={(value) => onChange({ ...config, value })}
          min={bounds.min}
          max={bounds.max}
          step={step}
          className="h-9 bg-slate-700 border-slate-600 text-slate-300 show-spinners"
          data-testid={`input-${idBase}-fixed`}
        />
      )}

      {config.kind === 'range' && (
        <div className="space-y-4">
          <Slider
            value={[config.min, config.max]}
            onValueChange={([min, max]) => onChange({ ...config, min, max })}
            min={bounds.min}
            max={bounds.max}
            step={step}
            className="w-full"
            data-testid={`slider-${idBase}-range`}
          />
          <div className="flex space-x-2">
            <NumericInput
              value={config.min}
              onChange={(min) => {
                const clampedMin = Math.min(min, config.max);
                onChange({ ...config, min: clampedMin });
              }}
              min={bounds.min}
              max={config.max}
              step={step}
              className="flex-1 h-9 bg-slate-700 border-slate-600 text-slate-300 show-spinners"
              data-testid={`input-${idBase}-min`}
            />
            <NumericInput
              value={config.max}
              onChange={(max) => {
                const clampedMax = Math.max(max, config.min);
                onChange({ ...config, max: clampedMax });
              }}
              min={config.min}
              max={bounds.max}
              step={step}
              className="flex-1 h-9 bg-slate-700 border-slate-600 text-slate-300 show-spinners"
              data-testid={`input-${idBase}-max`}
            />
          </div>
        </div>
      )}
    </div>
  );
}