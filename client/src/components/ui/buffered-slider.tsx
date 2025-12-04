import * as React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
import { Slider } from "./slider"

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
