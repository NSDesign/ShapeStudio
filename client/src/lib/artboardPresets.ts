/**
 * Artboard Presets with Physical Dimensions
 * 
 * All presets store physical dimensions in inches as the canonical unit.
 * Pixel dimensions are calculated dynamically based on the selected DPI.
 */

import { UnitType, unitToPixels, getUnitLabel } from './artboardUtils';

export type PresetCategory = 
  | 'paper' 
  | 'print-products' 
  | 'photo' 
  | 'aspect-ratio' 
  | 'social' 
  | 'web' 
  | 'tv' 
  | 'mobile';

export interface ArtboardPresetPhysical {
  id: string;
  name: string;
  widthInches: number;
  heightInches: number;
  category: PresetCategory;
  description?: string;
  aspectRatio: string;
}

export interface PresetCategoryInfo {
  id: PresetCategory;
  label: string;
  description?: string;
}

export const PRESET_CATEGORIES: PresetCategoryInfo[] = [
  { id: 'paper', label: 'Paper Sizes', description: 'Standard paper formats' },
  { id: 'print-products', label: 'Print Products', description: 'Cards, posters, and more' },
  { id: 'photo', label: 'Photo Sizes', description: 'Common photo print dimensions' },
  { id: 'aspect-ratio', label: 'Aspect Ratios', description: 'Common aspect ratios' },
  { id: 'social', label: 'Social Media', description: 'Social platform formats' },
  { id: 'web', label: 'Web & Screen', description: 'Web and display formats' },
  { id: 'tv', label: 'TV & Video', description: 'Video and broadcast formats' },
  { id: 'mobile', label: 'Mobile', description: 'Mobile device screens' },
];

function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(Math.round(width * 100), Math.round(height * 100));
  const w = Math.round(width * 100 / divisor);
  const h = Math.round(height * 100 / divisor);
  
  const commonRatios: Record<string, string> = {
    '1:1': '1:1',
    '2:3': '2:3',
    '3:2': '3:2',
    '3:4': '3:4',
    '4:3': '4:3',
    '4:5': '4:5',
    '5:4': '5:4',
    '5:7': '5:7',
    '7:5': '7:5',
    '9:16': '9:16',
    '16:9': '16:9',
    '1:1.41': '1:√2 (A-series)',
    '1.41:1': '√2:1 (A-series)',
  };
  
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.01) return '1:1';
  if (Math.abs(ratio - 2/3) < 0.01) return '2:3';
  if (Math.abs(ratio - 3/2) < 0.01) return '3:2';
  if (Math.abs(ratio - 3/4) < 0.01) return '3:4';
  if (Math.abs(ratio - 4/3) < 0.01) return '4:3';
  if (Math.abs(ratio - 4/5) < 0.01) return '4:5';
  if (Math.abs(ratio - 5/4) < 0.01) return '5:4';
  if (Math.abs(ratio - 5/7) < 0.01) return '5:7';
  if (Math.abs(ratio - 7/5) < 0.01) return '7:5';
  if (Math.abs(ratio - 9/16) < 0.01) return '9:16';
  if (Math.abs(ratio - 16/9) < 0.01) return '16:9';
  if (Math.abs(ratio - 1/1.414) < 0.01) return '1:√2';
  if (Math.abs(ratio - 1.414) < 0.01) return '√2:1';
  
  return `${w}:${h}`;
}

export const ARTBOARD_PRESETS_PHYSICAL: ArtboardPresetPhysical[] = [
  // Paper Sizes (ISO A-series)
  { id: 'a3', name: 'A3', widthInches: 11.69, heightInches: 16.54, category: 'paper', description: '297×420mm', aspectRatio: '1:√2' },
  { id: 'a4', name: 'A4', widthInches: 8.27, heightInches: 11.69, category: 'paper', description: '210×297mm', aspectRatio: '1:√2' },
  { id: 'a5', name: 'A5', widthInches: 5.83, heightInches: 8.27, category: 'paper', description: '148×210mm', aspectRatio: '1:√2' },
  { id: 'a6', name: 'A6', widthInches: 4.13, heightInches: 5.83, category: 'paper', description: '105×148mm', aspectRatio: '1:√2' },
  
  // Paper Sizes (US)
  { id: 'letter', name: 'US Letter', widthInches: 8.5, heightInches: 11, category: 'paper', description: '8.5×11"', aspectRatio: '17:22' },
  { id: 'legal', name: 'US Legal', widthInches: 8.5, heightInches: 14, category: 'paper', description: '8.5×14"', aspectRatio: '17:28' },
  { id: 'tabloid', name: 'Tabloid', widthInches: 11, heightInches: 17, category: 'paper', description: '11×17"', aspectRatio: '11:17' },
  
  // Print Products - Greeting Cards
  { id: 'greeting-5x7', name: 'Greeting Card (5×7")', widthInches: 5, heightInches: 7, category: 'print-products', description: 'Standard greeting card', aspectRatio: '5:7' },
  { id: 'greeting-4x6', name: 'Greeting Card (4×6")', widthInches: 4, heightInches: 6, category: 'print-products', description: 'Photo card size', aspectRatio: '2:3' },
  { id: 'greeting-a6-folded', name: 'Greeting Card (A6 folded)', widthInches: 4.13, heightInches: 5.83, category: 'print-products', description: 'A6 folded card', aspectRatio: '1:√2' },
  
  // Print Products - Postcards
  { id: 'postcard-4x6', name: 'Postcard (4×6")', widthInches: 4, heightInches: 6, category: 'print-products', description: 'Standard postcard', aspectRatio: '2:3' },
  { id: 'postcard-5x7', name: 'Postcard (5×7")', widthInches: 5, heightInches: 7, category: 'print-products', description: 'Large postcard', aspectRatio: '5:7' },
  { id: 'postcard-a6', name: 'Postcard (A6)', widthInches: 4.13, heightInches: 5.83, category: 'print-products', description: 'A6 postcard', aspectRatio: '1:√2' },
  
  // Print Products - Business Cards
  { id: 'business-card-us', name: 'Business Card (US)', widthInches: 3.5, heightInches: 2, category: 'print-products', description: '3.5×2"', aspectRatio: '7:4' },
  { id: 'business-card-eu', name: 'Business Card (EU)', widthInches: 3.35, heightInches: 2.17, category: 'print-products', description: '85×55mm', aspectRatio: '17:11' },
  
  // Print Products - Posters
  { id: 'poster-11x17', name: 'Poster (11×17")', widthInches: 11, heightInches: 17, category: 'print-products', description: 'Small poster/Tabloid', aspectRatio: '11:17' },
  { id: 'poster-18x24', name: 'Poster (18×24")', widthInches: 18, heightInches: 24, category: 'print-products', description: 'Medium poster', aspectRatio: '3:4' },
  { id: 'poster-24x36', name: 'Poster (24×36")', widthInches: 24, heightInches: 36, category: 'print-products', description: 'Large poster', aspectRatio: '2:3' },
  { id: 'poster-a2', name: 'Poster (A2)', widthInches: 16.54, heightInches: 23.39, category: 'print-products', description: '420×594mm', aspectRatio: '1:√2' },
  { id: 'poster-a1', name: 'Poster (A1)', widthInches: 23.39, heightInches: 33.11, category: 'print-products', description: '594×841mm', aspectRatio: '1:√2' },
  
  // Photo Sizes
  { id: 'photo-4x6', name: 'Photo 4×6"', widthInches: 4, heightInches: 6, category: 'photo', description: 'Standard photo print', aspectRatio: '2:3' },
  { id: 'photo-5x7', name: 'Photo 5×7"', widthInches: 5, heightInches: 7, category: 'photo', description: 'Medium photo print', aspectRatio: '5:7' },
  { id: 'photo-8x10', name: 'Photo 8×10"', widthInches: 8, heightInches: 10, category: 'photo', description: 'Large photo print', aspectRatio: '4:5' },
  { id: 'photo-11x14', name: 'Photo 11×14"', widthInches: 11, heightInches: 14, category: 'photo', description: 'Portrait size', aspectRatio: '11:14' },
  { id: 'photo-16x20', name: 'Photo 16×20"', widthInches: 16, heightInches: 20, category: 'photo', description: 'Wall print', aspectRatio: '4:5' },
  
  // Aspect Ratios (base size 10" on longest side for reasonable default)
  { id: 'ratio-1-1', name: 'Square (1:1)', widthInches: 10, heightInches: 10, category: 'aspect-ratio', description: 'Perfect square', aspectRatio: '1:1' },
  { id: 'ratio-2-3', name: 'Portrait (2:3)', widthInches: 6.67, heightInches: 10, category: 'aspect-ratio', description: 'Photo portrait', aspectRatio: '2:3' },
  { id: 'ratio-3-2', name: 'Landscape (3:2)', widthInches: 10, heightInches: 6.67, category: 'aspect-ratio', description: 'Photo landscape', aspectRatio: '3:2' },
  { id: 'ratio-3-4', name: 'Portrait (3:4)', widthInches: 7.5, heightInches: 10, category: 'aspect-ratio', description: 'Standard portrait', aspectRatio: '3:4' },
  { id: 'ratio-4-3', name: 'Landscape (4:3)', widthInches: 10, heightInches: 7.5, category: 'aspect-ratio', description: 'Standard landscape', aspectRatio: '4:3' },
  { id: 'ratio-4-5', name: 'Portrait (4:5)', widthInches: 8, heightInches: 10, category: 'aspect-ratio', description: 'Instagram portrait', aspectRatio: '4:5' },
  { id: 'ratio-5-4', name: 'Landscape (5:4)', widthInches: 10, heightInches: 8, category: 'aspect-ratio', description: 'Instagram landscape', aspectRatio: '5:4' },
  { id: 'ratio-9-16', name: 'Vertical (9:16)', widthInches: 5.625, heightInches: 10, category: 'aspect-ratio', description: 'Stories/Reels', aspectRatio: '9:16' },
  { id: 'ratio-16-9', name: 'Widescreen (16:9)', widthInches: 10, heightInches: 5.625, category: 'aspect-ratio', description: 'Video/TV', aspectRatio: '16:9' },
  
  // Social Media
  { id: 'instagram-post', name: 'Instagram Post', widthInches: 10, heightInches: 10, category: 'social', description: '1080×1080 at 108 DPI', aspectRatio: '1:1' },
  { id: 'instagram-story', name: 'Instagram Story', widthInches: 5.625, heightInches: 10, category: 'social', description: '1080×1920 at 108 DPI', aspectRatio: '9:16' },
  { id: 'facebook-post', name: 'Facebook Post', widthInches: 10, heightInches: 5.25, category: 'social', description: '1200×630 at 120 DPI', aspectRatio: '40:21' },
  { id: 'twitter-post', name: 'Twitter/X Post', widthInches: 10, heightInches: 5.625, category: 'social', description: '1200×675 at 120 DPI', aspectRatio: '16:9' },
  { id: 'youtube-thumbnail', name: 'YouTube Thumbnail', widthInches: 10, heightInches: 5.625, category: 'social', description: '1280×720 at 128 DPI', aspectRatio: '16:9' },
  { id: 'linkedin-post', name: 'LinkedIn Post', widthInches: 10, heightInches: 5.225, category: 'social', description: '1200×627 at 120 DPI', aspectRatio: '40:21' },
  
  // Web & Screen
  { id: 'web-hd', name: 'HD (1920×1080)', widthInches: 20, heightInches: 11.25, category: 'web', description: 'Full HD at 96 DPI', aspectRatio: '16:9' },
  { id: 'web-4k', name: '4K (3840×2160)', widthInches: 40, heightInches: 22.5, category: 'web', description: '4K UHD at 96 DPI', aspectRatio: '16:9' },
  { id: 'web-banner', name: 'Web Banner (728×90)', widthInches: 7.583, heightInches: 0.938, category: 'web', description: 'Leaderboard at 96 DPI', aspectRatio: '728:90' },
  
  // Mobile
  { id: 'iphone-14-pro', name: 'iPhone 14 Pro', widthInches: 3.93, heightInches: 8.52, category: 'mobile', description: '1179×2556 at 300 DPI', aspectRatio: '9:19.5' },
  { id: 'android-phone', name: 'Android Phone', widthInches: 3.6, heightInches: 6.4, category: 'mobile', description: '1080×1920 at 300 DPI', aspectRatio: '9:16' },
];

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: PresetCategory): ArtboardPresetPhysical[] {
  return ARTBOARD_PRESETS_PHYSICAL.filter(p => p.category === category);
}

/**
 * Get all presets grouped by category
 */
export function getPresetsGrouped(): Map<PresetCategory, ArtboardPresetPhysical[]> {
  const grouped = new Map<PresetCategory, ArtboardPresetPhysical[]>();
  
  for (const category of PRESET_CATEGORIES) {
    const presets = getPresetsByCategory(category.id);
    if (presets.length > 0) {
      grouped.set(category.id, presets);
    }
  }
  
  return grouped;
}

/**
 * Calculate pixel dimensions from a preset at a given DPI
 */
export function getPresetPixelDimensions(preset: ArtboardPresetPhysical, dpi: number): { width: number; height: number } {
  return {
    width: Math.round(preset.widthInches * dpi),
    height: Math.round(preset.heightInches * dpi)
  };
}

/**
 * Format preset dimensions for display in the user's preferred unit
 */
export function formatPresetDimensions(
  preset: ArtboardPresetPhysical,
  unit: UnitType,
  dpi: number
): string {
  if (unit === 'pixels') {
    const { width, height } = getPresetPixelDimensions(preset, dpi);
    return `${width} × ${height} px`;
  }
  
  let width: number, height: number;
  const unitLabel = getUnitLabel(unit);
  
  switch (unit) {
    case 'inches':
      width = preset.widthInches;
      height = preset.heightInches;
      break;
    case 'mm':
      width = preset.widthInches * 25.4;
      height = preset.heightInches * 25.4;
      break;
    case 'cm':
      width = preset.widthInches * 2.54;
      height = preset.heightInches * 2.54;
      break;
    default:
      width = preset.widthInches;
      height = preset.heightInches;
  }
  
  const decimals = unit === 'mm' ? 0 : 2;
  return `${width.toFixed(decimals)} × ${height.toFixed(decimals)} ${unitLabel}`;
}

/**
 * Get preset label with dimensions in the selected unit
 */
export function getPresetLabel(
  preset: ArtboardPresetPhysical,
  unit: UnitType,
  dpi: number,
  showAspectRatio: boolean = true
): string {
  const dimensions = formatPresetDimensions(preset, unit, dpi);
  const aspectRatio = showAspectRatio ? ` — ${preset.aspectRatio}` : '';
  return `${preset.name} (${dimensions})${aspectRatio}`;
}

/**
 * Find a preset by ID
 */
export function findPresetById(id: string): ArtboardPresetPhysical | undefined {
  return ARTBOARD_PRESETS_PHYSICAL.find(p => p.id === id);
}

/**
 * Get unique aspect ratios that are NOT already covered by paper/photo/print presets
 * Used to deduplicate the aspect ratio category
 */
export function getUniqueAspectRatios(): ArtboardPresetPhysical[] {
  const coveredRatios = new Set<string>();
  
  for (const preset of ARTBOARD_PRESETS_PHYSICAL) {
    if (preset.category !== 'aspect-ratio') {
      coveredRatios.add(preset.aspectRatio);
    }
  }
  
  return ARTBOARD_PRESETS_PHYSICAL.filter(p => 
    p.category === 'aspect-ratio' && !coveredRatios.has(p.aspectRatio)
  );
}

/**
 * Get categorized presets with deduplication
 * Aspect ratios that are already represented by other presets are removed
 */
export function getCategorizedPresetsDeduped(): Map<PresetCategory, ArtboardPresetPhysical[]> {
  const grouped = new Map<PresetCategory, ArtboardPresetPhysical[]>();
  
  for (const category of PRESET_CATEGORIES) {
    let presets: ArtboardPresetPhysical[];
    
    if (category.id === 'aspect-ratio') {
      presets = getUniqueAspectRatios();
    } else {
      presets = getPresetsByCategory(category.id);
    }
    
    if (presets.length > 0) {
      grouped.set(category.id, presets);
    }
  }
  
  return grouped;
}

/**
 * Convert legacy pixel-based preset to physical preset format
 * Used for backward compatibility
 */
export function convertLegacyPreset(
  name: string,
  widthPixels: number,
  heightPixels: number,
  dpi: number = 300
): ArtboardPresetPhysical {
  const widthInches = widthPixels / dpi;
  const heightInches = heightPixels / dpi;
  
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    name,
    widthInches,
    heightInches,
    category: 'paper',
    aspectRatio: calculateAspectRatio(widthInches, heightInches)
  };
}
