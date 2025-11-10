/**
 * Artboard utility functions for DPI and unit conversions
 */

export type UnitType = 'pixels' | 'mm' | 'cm' | 'inches';

/**
 * Convert pixels to physical units based on DPI
 */
export function pixelsToUnit(pixels: number, dpi: number, unit: UnitType): number {
  if (unit === 'pixels') return pixels;
  
  const inches = pixels / dpi;
  
  switch (unit) {
    case 'inches':
      return inches;
    case 'mm':
      return inches * 25.4;
    case 'cm':
      return inches * 2.54;
    default:
      return pixels;
  }
}

/**
 * Convert physical units to pixels based on DPI
 */
export function unitToPixels(value: number, dpi: number, unit: UnitType): number {
  if (unit === 'pixels') return value;
  
  let inches: number;
  
  switch (unit) {
    case 'inches':
      inches = value;
      break;
    case 'mm':
      inches = value / 25.4;
      break;
    case 'cm':
      inches = value / 2.54;
      break;
    default:
      inches = 0;
  }
  
  return inches * dpi;
}

/**
 * Format dimension value with appropriate decimal places for the unit
 */
export function formatDimension(value: number, unit: UnitType): string {
  if (unit === 'pixels') {
    return Math.round(value).toString();
  }
  
  // For physical units, show 2 decimal places
  return value.toFixed(2);
}

/**
 * Get unit label for display
 */
export function getUnitLabel(unit: UnitType): string {
  const labels: Record<UnitType, string> = {
    'pixels': 'px',
    'mm': 'mm',
    'cm': 'cm',
    'inches': 'in'
  };
  return labels[unit] || 'px';
}

/**
 * Convert artboard dimensions to display units
 */
export function getArtboardDisplayDimensions(
  widthPixels: number,
  heightPixels: number,
  dpi: number = 72,
  unit: UnitType = 'pixels'
): { width: number; height: number; widthFormatted: string; heightFormatted: string } {
  const width = pixelsToUnit(widthPixels, dpi, unit);
  const height = pixelsToUnit(heightPixels, dpi, unit);
  
  return {
    width,
    height,
    widthFormatted: formatDimension(width, unit),
    heightFormatted: formatDimension(height, unit)
  };
}

/**
 * Calculate pixel dimensions from physical dimensions
 */
export function calculatePixelDimensions(
  width: number,
  height: number,
  dpi: number = 72,
  unit: UnitType = 'pixels'
): { widthPixels: number; heightPixels: number } {
  return {
    widthPixels: Math.round(unitToPixels(width, dpi, unit)),
    heightPixels: Math.round(unitToPixels(height, dpi, unit))
  };
}

/**
 * Common DPI presets
 */
export const DPI_PRESETS = [
  { label: 'Screen (72 DPI)', value: 72 },
  { label: 'Web (96 DPI)', value: 96 },
  { label: 'Print Draft (150 DPI)', value: 150 },
  { label: 'Print Standard (300 DPI)', value: 300 },
  { label: 'Print High (600 DPI)', value: 600 },
  { label: 'Print Ultra (1200 DPI)', value: 1200 },
] as const;

/**
 * Get effective translate range for shape transforms based on artboard-aware setting
 * 
 * When transformsArtboardAware is enabled, returns artboard bounds.
 * Otherwise, returns the user's manual translate range settings.
 */
export function getEffectiveTranslateRange(
  axis: 'x' | 'y',
  settings: { 
    transformsArtboardAware: boolean; 
    translateXRange?: [number, number]; 
    translateYRange?: [number, number];
  },
  artboard: { x: number; y: number; width: number; height: number }
): [number, number] {
  if (!settings.transformsArtboardAware) {
    // Use manual ranges when toggle is OFF
    return axis === 'x' 
      ? (settings.translateXRange || [-50, 50])
      : (settings.translateYRange || [-50, 50]);
  }
  
  // Use artboard bounds when toggle is ON
  return axis === 'x'
    ? [artboard.x, artboard.x + artboard.width]
    : [artboard.y, artboard.y + artboard.height];
}
