import * as React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
import { Slider } from "./slider"
import { NumericInput } from "./numeric-input"

interface BufferedSliderProps {
  value: number[];
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export function BufferedSlider({
  value,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className,
}: BufferedSliderProps) {
  const [localValue, setLocalValue] = useState<number[]>(value);
  const isDraggingRef = useRef(false);
  
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleValueChange = useCallback((newValue: number[]) => {
    isDraggingRef.current = true;
    setLocalValue(newValue);
    onValueChange?.(newValue);
  }, [onValueChange]);

  const handleValueCommit = useCallback((newValue: number[]) => {
    isDraggingRef.current = false;
    onValueCommit?.(newValue);
  }, [onValueCommit]);

  return (
    <Slider
      value={localValue}
      onValueChange={handleValueChange}
      onValueCommit={handleValueCommit}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={className}
    />
  );
}

// Buffered slider with integrated label display
interface BufferedSliderWithLabelProps {
  value: number;
  onValueCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  formatLabel?: (value: number) => string;
  labelClassName?: string;
}

export function BufferedSliderWithLabel({
  value,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className,
  formatLabel = (v) => String(v),
  labelClassName = "text-xs text-slate-500",
}: BufferedSliderWithLabelProps) {
  const [localValue, setLocalValue] = useState<number>(value);
  const isDraggingRef = useRef(false);
  
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleValueChange = useCallback((newValue: number[]) => {
    isDraggingRef.current = true;
    setLocalValue(newValue[0]);
  }, []);

  const handleValueCommit = useCallback((newValue: number[]) => {
    isDraggingRef.current = false;
    onValueCommit(newValue[0]);
  }, [onValueCommit]);

  return (
    <div className="space-y-1">
      <Slider
        value={[localValue]}
        onValueChange={handleValueChange}
        onValueCommit={handleValueCommit}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={className}
      />
      <span className={labelClassName}>{formatLabel(localValue)}</span>
    </div>
  );
}

// Buffered range slider with integrated dual label display
interface BufferedRangeSliderWithLabelProps {
  value: [number, number];
  onValueCommit: (value: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  formatLabel?: (min: number, max: number) => string;
  labelClassName?: string;
}

export function BufferedRangeSliderWithLabel({
  value,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className,
  formatLabel = (minVal, maxVal) => `${minVal} - ${maxVal}`,
  labelClassName = "text-xs text-slate-500",
}: BufferedRangeSliderWithLabelProps) {
  const [localValue, setLocalValue] = useState<[number, number]>(value);
  const isDraggingRef = useRef(false);
  
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleValueChange = useCallback((newValue: number[]) => {
    isDraggingRef.current = true;
    setLocalValue(newValue as [number, number]);
  }, []);

  const handleValueCommit = useCallback((newValue: number[]) => {
    isDraggingRef.current = false;
    onValueCommit(newValue as [number, number]);
  }, [onValueCommit]);

  return (
    <div className="space-y-1">
      <Slider
        value={localValue}
        onValueChange={handleValueChange}
        onValueCommit={handleValueCommit}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={className}
      />
      <span className={labelClassName}>{formatLabel(localValue[0], localValue[1])}</span>
    </div>
  );
}

interface BufferedRangeSliderProps {
  value: [number, number];
  onValueChange?: (value: [number, number]) => void;
  onValueCommit?: (value: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export function BufferedRangeSlider({
  value,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className,
}: BufferedRangeSliderProps) {
  const [localValue, setLocalValue] = useState<[number, number]>(value);
  const isDraggingRef = useRef(false);
  
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleValueChange = useCallback((newValue: number[]) => {
    isDraggingRef.current = true;
    const rangeValue = newValue as [number, number];
    setLocalValue(rangeValue);
    onValueChange?.(rangeValue);
  }, [onValueChange]);

  const handleValueCommit = useCallback((newValue: number[]) => {
    isDraggingRef.current = false;
    onValueCommit?.(newValue as [number, number]);
  }, [onValueCommit]);

  return (
    <Slider
      value={localValue}
      onValueChange={handleValueChange}
      onValueCommit={handleValueCommit}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={className}
    />
  );
}

// Buffered slider with synchronized numeric input
interface BufferedSliderWithNumericInputProps {
  value: number;
  onValueCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  sliderClassName?: string;
  inputClassName?: string;
  layout?: 'stacked' | 'inline';
  label?: string;
  labelClassName?: string;
}

export function BufferedSliderWithNumericInput({
  value,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  sliderClassName,
  inputClassName = "h-8 text-xs bg-slate-800 border-slate-600 text-white",
  layout = 'stacked',
  label,
  labelClassName = "text-xs text-slate-400",
}: BufferedSliderWithNumericInputProps) {
  const [localValue, setLocalValue] = useState<number>(value);
  const isDraggingRef = useRef(false);
  
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleSliderChange = useCallback((newValue: number[]) => {
    isDraggingRef.current = true;
    setLocalValue(newValue[0]);
  }, []);

  const handleSliderCommit = useCallback((newValue: number[]) => {
    isDraggingRef.current = false;
    onValueCommit(newValue[0]);
  }, [onValueCommit]);

  const handleInputChange = useCallback((newValue: number) => {
    setLocalValue(newValue);
    onValueCommit(newValue);
  }, [onValueCommit]);

  if (layout === 'inline') {
    return (
      <div className="flex items-center gap-2">
        {label && <span className={labelClassName}>{label}</span>}
        <NumericInput
          value={localValue}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={inputClassName}
        />
        <Slider
          value={[localValue]}
          onValueChange={handleSliderChange}
          onValueCommit={handleSliderCommit}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={sliderClassName || "flex-1"}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && <span className={labelClassName}>{label}</span>}
      <NumericInput
        value={localValue}
        onChange={handleInputChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={inputClassName}
      />
      <Slider
        value={[localValue]}
        onValueChange={handleSliderChange}
        onValueCommit={handleSliderCommit}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={sliderClassName}
      />
    </div>
  );
}

// Buffered range slider with synchronized dual numeric inputs
interface BufferedRangeSliderWithNumericInputsProps {
  value: [number, number];
  onValueCommit: (value: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  sliderClassName?: string;
  inputClassName?: string;
  minLabel?: string;
  maxLabel?: string;
  labelClassName?: string;
}

export function BufferedRangeSliderWithNumericInputs({
  value,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  sliderClassName,
  inputClassName = "h-8 text-xs bg-slate-800 border-slate-600 text-white",
  minLabel = "Min",
  maxLabel = "Max",
  labelClassName = "text-xs text-slate-400 mb-1 block",
}: BufferedRangeSliderWithNumericInputsProps) {
  const [localValue, setLocalValue] = useState<[number, number]>(value);
  const isDraggingRef = useRef(false);
  
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleSliderChange = useCallback((newValue: number[]) => {
    isDraggingRef.current = true;
    setLocalValue(newValue as [number, number]);
  }, []);

  const handleSliderCommit = useCallback((newValue: number[]) => {
    isDraggingRef.current = false;
    onValueCommit(newValue as [number, number]);
  }, [onValueCommit]);

  const handleMinInputChange = useCallback((newMin: number) => {
    const clampedMin = Math.min(newMin, localValue[1] - step);
    const newRange: [number, number] = [clampedMin, localValue[1]];
    setLocalValue(newRange);
    onValueCommit(newRange);
  }, [localValue, step, onValueCommit]);

  const handleMaxInputChange = useCallback((newMax: number) => {
    const clampedMax = Math.max(newMax, localValue[0] + step);
    const newRange: [number, number] = [localValue[0], clampedMax];
    setLocalValue(newRange);
    onValueCommit(newRange);
  }, [localValue, step, onValueCommit]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <span className={labelClassName}>{minLabel}</span>
          <NumericInput
            value={localValue[0]}
            onChange={handleMinInputChange}
            min={min}
            max={localValue[1] - step}
            step={step}
            disabled={disabled}
            className={inputClassName}
          />
        </div>
        <div className="flex-1">
          <span className={labelClassName}>{maxLabel}</span>
          <NumericInput
            value={localValue[1]}
            onChange={handleMaxInputChange}
            min={localValue[0] + step}
            max={max}
            step={step}
            disabled={disabled}
            className={inputClassName}
          />
        </div>
      </div>
      <Slider
        value={localValue}
        onValueChange={handleSliderChange}
        onValueCommit={handleSliderCommit}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={sliderClassName || "w-full pt-2"}
      />
    </div>
  );
}
