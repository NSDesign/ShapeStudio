import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { X, Plus } from "lucide-react";
import { useState } from "react";
import { ScalarMode, ModeKind } from "@/lib/shapeTypes";

interface ModeFieldProps {
  label: string;
  config: ScalarMode<number>;
  onChange: (config: ScalarMode<number>) => void;
  bounds: { min: number; max: number };
  unit?: string;
  step?: number;
}

export function ModeField({ label, config, onChange, bounds, unit = "", step = 1 }: ModeFieldProps) {
  const [newValue, setNewValue] = useState("");

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
    <Card className="p-4 space-y-3" data-testid={`mode-field-${label.toLowerCase()}`}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>

      {/* Mode Selection */}
      <RadioGroup 
        value={config.kind} 
        onValueChange={handleModeChange}
        className="flex space-x-4"
        data-testid={`select-${label.toLowerCase()}-mode`}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="fixed" id={`${label}-fixed`} />
          <Label htmlFor={`${label}-fixed`} className="text-xs">Fixed</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="range" id={`${label}-range`} />
          <Label htmlFor={`${label}-range`} className="text-xs">Range</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="values" id={`${label}-values`} />
          <Label htmlFor={`${label}-values`} className="text-xs">Values</Label>
        </div>
      </RadioGroup>

      {/* Mode-specific Controls */}
      {config.kind === 'fixed' && (
        <Input
          type="number"
          value={config.value}
          onChange={(e) => onChange({ ...config, value: parseFloat(e.target.value) || bounds.min })}
          min={bounds.min}
          max={bounds.max}
          step={step}
          data-testid={`input-${label.toLowerCase()}-fixed`}
        />
      )}

      {config.kind === 'range' && (
        <div className="space-y-2">
          <Slider
            value={[config.min, config.max]}
            onValueChange={([min, max]) => onChange({ ...config, min, max })}
            min={bounds.min}
            max={bounds.max}
            step={step}
            className="w-full"
            data-testid={`slider-${label.toLowerCase()}-range`}
          />
          <div className="flex space-x-2">
            <Input
              type="number"
              value={config.min}
              onChange={(e) => onChange({ ...config, min: parseFloat(e.target.value) || bounds.min })}
              min={bounds.min}
              max={config.max}
              step={step}
              placeholder="Min"
              className="flex-1"
              data-testid={`input-${label.toLowerCase()}-min`}
            />
            <Input
              type="number"
              value={config.max}
              onChange={(e) => onChange({ ...config, max: parseFloat(e.target.value) || bounds.max })}
              min={config.min}
              max={bounds.max}
              step={step}
              placeholder="Max"
              className="flex-1"
              data-testid={`input-${label.toLowerCase()}-max`}
            />
          </div>
        </div>
      )}

      {config.kind === 'values' && (
        <div className="space-y-2">
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
              className="flex-1"
              data-testid={`input-${label.toLowerCase()}-values`}
            />
            <Button 
              size="sm" 
              onClick={addValue}
              data-testid={`button-add-${label.toLowerCase()}-value`}
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
                  className="flex items-center gap-1"
                  data-testid={`badge-${label.toLowerCase()}-value-${index}`}
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

          {/* Selection strategy */}
          <div className="flex items-center space-x-2">
            <Label className="text-xs">Selection:</Label>
            <Select
              value={config.selection}
              onValueChange={(selection: 'random' | 'cycle') => onChange({ ...config, selection })}
            >
              <SelectTrigger className="w-20 h-8">
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
    </Card>
  );
}