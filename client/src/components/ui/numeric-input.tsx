import * as React from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  value: number | string;
  onChange: (value: number) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  step?: number;
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ className, value, onChange, onBlur, min = -Infinity, max = Infinity, step = 1, ...props }, ref) => {
    const [localValue, setLocalValue] = React.useState(String(value));

    React.useEffect(() => {
      setLocalValue(String(value));
    }, [value]);

    const handleIncrement = React.useCallback(() => {
      const currentValue = parseFloat(localValue) || 0;
      const newValue = Math.max(min, Math.min(max, currentValue + step));
      setLocalValue(String(newValue));
      onChange(newValue);
    }, [localValue, min, max, step, onChange]);

    const handleDecrement = React.useCallback(() => {
      const currentValue = parseFloat(localValue) || 0;
      const newValue = Math.min(max, Math.max(min, currentValue - step));
      setLocalValue(String(newValue));
      onChange(newValue);
    }, [localValue, min, max, step, onChange]);

    const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
    }, []);

    const handleInputBlur = React.useCallback(() => {
      const numValue = parseFloat(localValue);
      if (Number.isNaN(numValue) || localValue === '' || localValue.trim() === '-') {
        // Reset to current value if invalid
        setLocalValue(String(value));
      } else {
        // Clamp to bounds
        const clampedValue = Math.max(min, Math.min(max, numValue));
        setLocalValue(String(clampedValue));
        onChange(clampedValue);
      }
      onBlur?.();
    }, [localValue, value, min, max, onChange, onBlur]);

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.currentTarget.blur();
      }
    }, []);

    return (
      <div className="relative flex items-center">
        <input
          type="number"
          ref={ref}
          value={localValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pr-8",
            className
          )}
          {...props}
        />
        <div className="absolute right-1 flex flex-col gap-0">
          <button
            type="button"
            onClick={handleIncrement}
            className="h-4 w-6 p-0 flex items-center justify-center bg-slate-700 border border-slate-600 hover:bg-slate-600 rounded-sm transition-colors"
            tabIndex={-1}
          >
            <ChevronUp className="h-3 w-3 text-slate-300" />
          </button>
          <button
            type="button"
            onClick={handleDecrement}
            className="h-4 w-6 p-0 flex items-center justify-center bg-slate-700 border border-slate-600 hover:bg-slate-600 rounded-sm transition-colors"
            tabIndex={-1}
          >
            <ChevronDown className="h-3 w-3 text-slate-300" />
          </button>
        </div>
      </div>
    );
  }
);

NumericInput.displayName = "NumericInput";

export { NumericInput };
