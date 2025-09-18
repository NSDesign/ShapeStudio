import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useState, useEffect } from "react";

export type ModeKind = 'fixed' | 'range' | 'values';

export type ModeConfig = 
  | { kind: 'fixed'; value: number }
  | { kind: 'range'; min: number; max: number }
  | { kind: 'values'; values: number[]; selection: 'random' | 'cycle' };

export interface StyledModeFieldProps {
  label: string;
  config: ModeConfig;
  onChange: (config: ModeConfig) => void;
  bounds: { min: number; max: number };
  unit?: string;
  step?: number;
  allowedModes?: ModeKind[];
}

export function StyledModeField({ label, config, onChange, bounds, unit = "", step = 1, allowedModes = ['fixed', 'range', 'values'] }: StyledModeFieldProps) {
  const [newValue, setNewValue] = useState("");
  
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
      case 'values':
        onChange({ kind: 'values', values: [bounds.min], selection: 'random' });
        break;
    }
  };

  const addValue = () => {
    if (config.kind === 'values' && newValue) {
      const num = parseFloat(newValue);
      if (!isNaN(num) && num >= bounds.min && num <= bounds.max) {
        onChange({
          ...config,
          values: [...config.values, num]
        });
        setNewValue("");
      }
    }
  };

  const removeValue = (index: number) => {
    if (config.kind === 'values') {
      onChange({
        ...config,
        values: config.values.filter((_, i) => i !== index)
      });
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
          <SelectTrigger className="w-24 h-8 bg-slate-700 border-slate-600 text-slate-300" data-testid={`select-${idBase}-mode`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allowedModes.includes('fixed') && <SelectItem value="fixed">Fixed</SelectItem>}
            {allowedModes.includes('range') && <SelectItem value="range">Range</SelectItem>}
            {allowedModes.includes('values') && <SelectItem value="values">Values</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {/* Values Controls with Pattern 2 Styling */}
      {config.kind === 'values' && (
        <div className="space-y-4">
          {/* Add new value */}
          <div className="flex space-x-2">
            <Input
              type="number"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              min={bounds.min}
              max={bounds.max}
              step={step}
              placeholder={`Add value (${bounds.min}-${bounds.max})`}
              className="flex-1 bg-slate-700 border-slate-600 text-slate-300"
              data-testid={`input-${idBase}-values`}
            />
            <Button 
              size="sm" 
              onClick={addValue}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600"
              data-testid={`button-add-${idBase}-value`}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Values list */}
          {config.values.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {config.values.map((value, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="flex items-center gap-1 bg-slate-700 text-slate-300 border-slate-600"
                  data-testid={`badge-${idBase}-value-${index}`}
                >
                  {value}{unit}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeValue(index)}
                  />
                </Badge>
              ))}
            </div>
          )}

          {/* Selection strategy with Pattern 2 Styling */}
          <div className="flex items-center space-x-2">
            <Label className="text-slate-300 text-xs">Selection:</Label>
            <Select
              value={config.selection}
              onValueChange={(selection: 'random' | 'cycle') => onChange({ ...config, selection })}
            >
              <SelectTrigger className="w-20 h-8 bg-slate-700 border-slate-600 text-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">Random</SelectItem>
                <SelectItem value="cycle">Cycle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Mode-specific Controls with Pattern 2 Styling */}
      {config.kind === 'fixed' && (
        <Input
          type="number"
          value={fixedValueStr}
          onChange={(e) => {
            setFixedValueStr(e.target.value);
          }}
          onBlur={() => {
            const v = parseFloat(fixedValueStr);
            if (Number.isNaN(v) || fixedValueStr === '' || fixedValueStr.trim() === '-') {
              // Reset to current value if invalid
              const resetValue = config.value;
              setFixedValueStr(resetValue.toString());
              onChange({ ...config, value: resetValue });
            } else {
              // Clamp to bounds and update
              const clampedValue = Math.max(bounds.min, Math.min(bounds.max, v));
              setFixedValueStr(clampedValue.toString());
              onChange({ ...config, value: clampedValue });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          min={bounds.min}
          max={bounds.max}
          step={step}
          className="bg-slate-700 border-slate-600 text-slate-300"
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
            <Input
              type="number"
              value={minValueStr}
              onChange={(e) => {
                setMinValueStr(e.target.value);
              }}
              onBlur={() => {
                const v = parseFloat(minValueStr);
                if (Number.isNaN(v) || minValueStr === '' || minValueStr.trim() === '-') {
                  // Reset to current value if invalid
                  const resetValue = config.min;
                  setMinValueStr(resetValue.toString());
                  onChange({ ...config, min: resetValue });
                } else {
                  // Clamp to bounds and ensure min <= max
                  const clampedValue = Math.max(bounds.min, Math.min(config.max, v));
                  setMinValueStr(clampedValue.toString());
                  onChange({ ...config, min: clampedValue });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              min={bounds.min}
              max={config.max}
              step={step}
              placeholder="Min"
              className="flex-1 bg-slate-700 border-slate-600 text-slate-300"
              data-testid={`input-${idBase}-min`}
            />
            <Input
              type="number"
              value={maxValueStr}
              onChange={(e) => {
                setMaxValueStr(e.target.value);
              }}
              onBlur={() => {
                const v = parseFloat(maxValueStr);
                if (Number.isNaN(v) || maxValueStr === '' || maxValueStr.trim() === '-') {
                  // Reset to current value if invalid
                  const resetValue = config.max;
                  setMaxValueStr(resetValue.toString());
                  onChange({ ...config, max: resetValue });
                } else {
                  // Clamp to bounds and ensure max >= min
                  const clampedValue = Math.min(bounds.max, Math.max(config.min, v));
                  setMaxValueStr(clampedValue.toString());
                  onChange({ ...config, max: clampedValue });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              min={config.min}
              max={bounds.max}
              step={step}
              placeholder="Max"
              className="flex-1 bg-slate-700 border-slate-600 text-slate-300"
              data-testid={`input-${idBase}-max`}
            />
          </div>
        </div>
      )}
    </div>
  );
}