/**
 * Shared Incremental Value Utilities
 * 
 * These functions calculate incremental values based on index driver selection.
 * Used by both client and server for consistent behavior in shape generation.
 * 
 * The Index Driver feature allows users to choose whether incremental calculations
 * should be based on shape index (within a set) or set repetition index (generation count).
 */

import type { IncrementalIndexDriver } from './schema';

/**
 * Context for incremental calculations - contains both possible index values
 */
export interface IncrementalContext {
  shapeIndex: number;
  setRepIndex: number;
}

/**
 * Configuration for an incremental value calculation
 */
export interface IncrementalConfig {
  startValue: number;
  increment: number;
  modulationEnabled?: boolean;
  modulationValue?: number;
}

/**
 * Get the effective index based on the selected driver
 * 
 * @param driver - The index driver selection ('shapeIndex' or 'setRepIndex')
 * @param context - Object containing both shapeIndex and setRepIndex
 * @returns The selected index value to use for calculations
 */
export function getEffectiveIndex(
  driver: IncrementalIndexDriver,
  context: IncrementalContext
): number {
  return driver === 'setRepIndex' ? context.setRepIndex : context.shapeIndex;
}

/**
 * Calculate an incremental value based on the selected index driver
 * 
 * This is the core utility function for all incremental mode calculations.
 * It supports optional modulation (wrap-around) behavior.
 * 
 * @param config - Configuration object with start value, increment, and modulation settings
 * @param driver - The index driver selection ('shapeIndex' or 'setRepIndex')
 * @param context - Object containing both shapeIndex and setRepIndex
 * @returns The calculated incremental value
 * 
 * @example
 * // Basic incremental width calculation
 * const width = calculateIncrementalValue(
 *   { startValue: 50, increment: 10 },
 *   'shapeIndex',
 *   { shapeIndex: 3, setRepIndex: 0 }
 * ); // Returns 80 (50 + 10 * 3)
 * 
 * @example
 * // With modulation (wrap-around)
 * const rotation = calculateIncrementalValue(
 *   { startValue: 0, increment: 45, modulationEnabled: true, modulationValue: 360 },
 *   'shapeIndex',
 *   { shapeIndex: 10, setRepIndex: 0 }
 * ); // Returns 90 (450 % 360 = 90)
 */
export function calculateIncrementalValue(
  config: IncrementalConfig,
  driver: IncrementalIndexDriver,
  context: IncrementalContext
): number {
  const index = getEffectiveIndex(driver, context);
  let value = config.startValue + (config.increment * index);
  
  if (config.modulationEnabled && config.modulationValue && config.modulationValue > 0) {
    value = value % config.modulationValue;
  }
  
  return value;
}

/**
 * Calculate an incremental value with clamping support
 * 
 * Some properties (like opacity, scale) need to be clamped to valid ranges.
 * 
 * @param config - Configuration object with start value, increment, and modulation settings
 * @param driver - The index driver selection ('shapeIndex' or 'setRepIndex')
 * @param context - Object containing both shapeIndex and setRepIndex
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns The calculated incremental value, clamped to [min, max]
 */
export function calculateIncrementalValueClamped(
  config: IncrementalConfig,
  driver: IncrementalIndexDriver,
  context: IncrementalContext,
  min: number,
  max: number
): number {
  const value = calculateIncrementalValue(config, driver, context);
  return Math.max(min, Math.min(max, value));
}

/**
 * Create an IncrementalContext from shape generation parameters
 * 
 * Helper function to construct the context object from common generation parameters.
 * 
 * @param shapeIndex - Index of the shape within the current generation set
 * @param setRepIndex - Repetition index of the set (0-based generation count)
 * @returns IncrementalContext object ready for use with calculation functions
 */
export function createIncrementalContext(
  shapeIndex: number,
  setRepIndex: number
): IncrementalContext {
  return { shapeIndex, setRepIndex };
}

/**
 * Get the default index driver for backward compatibility
 * 
 * All incremental modes default to 'shapeIndex' to maintain existing behavior.
 */
export const DEFAULT_INDEX_DRIVER: IncrementalIndexDriver = 'shapeIndex';
