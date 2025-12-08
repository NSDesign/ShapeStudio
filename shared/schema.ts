import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ===== USER PREFERENCES =====
// Sidebar section visibility preferences
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Sidebar section visibility settings
  sidebarSections: jsonb("sidebar_sections").notNull().default('{}'),
  // Generation sets persistence
  generationSets: jsonb("generation_sets").notNull().default('[]'),
  currentGenerationSetId: varchar("current_generation_set_id"),
  // Export settings persistence
  exportSettings: jsonb("export_settings").notNull().default('{}'),
  // App settings defaults (export format, artboard dimensions, etc.)
  appSettingsDefaults: jsonb("app_settings_defaults"),
  // Load project dialog preference - skip dialog if user checked "don't ask again"
  skipLoadProjectDialog: boolean("skip_load_project_dialog").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sidebar section item configuration
export interface SidebarSectionItem {
  enabled: boolean;
  displayOrder: number;
}

// Sidebar section configuration type
export interface SidebarSectionConfig {
  shapes: SidebarSectionItem;           // Shape Types - enabled by default
  selection: SidebarSectionItem;        // Selection Modes - disabled by default  
  layers: SidebarSectionItem;           // Layers - disabled by default
  properties: SidebarSectionItem;       // Properties - disabled by default
  composition: SidebarSectionItem;      // Composition - disabled by default
  'align-distribute': SidebarSectionItem; // Align & Distribute - disabled by default
  artboards: SidebarSectionItem;        // Artboards - enabled by default
  colors: SidebarSectionItem;           // Color Manipulation - disabled by default
  project: SidebarSectionItem;          // Project Management - enabled by default
  export: SidebarSectionItem;           // Export & Save - enabled by default
}

// Default sidebar section configuration
export const DEFAULT_SIDEBAR_SECTIONS: SidebarSectionConfig = {
  shapes: { enabled: true, displayOrder: 1 },              // Shape Types - enabled by default
  layers: { enabled: false, displayOrder: 2 },             // Layers - disabled by default
  properties: { enabled: false, displayOrder: 3 },         // Properties - disabled by default
  artboards: { enabled: true, displayOrder: 4 },           // Artboards - enabled by default
  project: { enabled: true, displayOrder: 5 },             // Project Management - enabled by default
  export: { enabled: true, displayOrder: 6 },              // Export & Save - enabled by default
  selection: { enabled: false, displayOrder: 7 },          // Selection Modes - disabled by default
  composition: { enabled: false, displayOrder: 8 },        // Composition - disabled by default
  'align-distribute': { enabled: false, displayOrder: 9 }, // Align & Distribute - disabled by default
  colors: { enabled: false, displayOrder: 10 },            // Color Manipulation - disabled by default
};

// Export background mode type (transparent ignores artboard background, artboard uses artboard's configured color)
export type ExportBackgroundMode = 'transparent' | 'artboard';

// Render mode for exports - determines whether to use client-side or server-side rendering
export type ExportRenderMode = 'auto' | 'client' | 'server';

// Export settings configuration type
export interface ExportSettingsConfig {
  exportBatchModeEnabled: boolean;    // Whether batch export mode is enabled
  generationSetsEnabled: boolean;     // Whether generation sets toggle is enabled
  batchExportCount: number;           // Current batch export count setting
  generationCountMode: string;        // Current generation count mode ('fixed', 'range', etc)
  edgeCaseStrategy?: 'hold' | 'cycle' | 'random' | 'stop';  // Strategy when set count < batch export count
  exportSaveProjectFiles: boolean;    // Whether to export project files (.json) alongside images
  packageAsZip: boolean;              // Whether to package exports as ZIP file
  skipTiffPreflightModal: boolean;    // Skip pre-flight confirmation modal for TIFF batch exports
  exportBackgroundMode: ExportBackgroundMode;  // Export background: transparent or artboard color
  exportBackgroundColor?: string;     // @deprecated - legacy field, ignored (artboard background is configured in Artboard section)
  tiffBitDepth: 8 | 16;               // TIFF bit depth: 8-bit (default) or 16-bit for professional printing
  tiffCompression: 'none' | 'deflate'; // TIFF compression: 'none' for uncompressed, 'deflate' for ZIP/Deflate (requires Pako.js)
  embedIccProfile: boolean;           // Embed sRGB ICC profile in TIFF/PNG/JPEG exports (POD requirement)
  renderMode: ExportRenderMode;       // Render mode: 'auto' (smart detection), 'client' (browser), 'server' (headless)
  flattenToRgb: boolean;              // Flatten to RGB (drop alpha) for ~10-20% smaller files; auto-enabled when background is artboard
  matteColor: string;                 // Matte color for flattening transparent images to RGB (default: white)
  copyrightText: string;              // Copyright text to embed in exported images (EXIF/XMP metadata)
  // Image metadata fields for export
  artistName: string;                 // Artist/Creator name (pre-filled from logged-in user, editable)
  imageTitle: string;                 // Image title (editable with default template)
  imageDescription: string;           // Image description (editable with default template)
}

// Default export settings configuration
export const DEFAULT_EXPORT_SETTINGS: ExportSettingsConfig = {
  exportBatchModeEnabled: false,      // Batch export disabled by default
  generationSetsEnabled: false,       // Generation sets disabled by default
  batchExportCount: 10,               // 10 exports by default
  generationCountMode: 'fixed',       // Fixed count mode by default
  edgeCaseStrategy: 'cycle',          // Default edge case strategy
  exportSaveProjectFiles: false,      // Project files disabled by default
  packageAsZip: false,                // ZIP packaging disabled by default
  skipTiffPreflightModal: false,      // Show TIFF pre-flight modal by default
  exportBackgroundMode: 'transparent', // Transparent background by default
  tiffBitDepth: 8,                    // 8-bit by default (smaller files, most common)
  tiffCompression: 'none',            // No compression by default (Deflate requires Pako.js)
  embedIccProfile: true,              // Embed sRGB ICC profile by default for POD compliance
  renderMode: 'auto',                 // Auto mode by default - smart detection of client vs server
  flattenToRgb: false,                // Off by default - user can enable for smaller files when transparency not needed
  matteColor: '#ffffff',              // White matte color by default
  copyrightText: '',                  // Empty by default - user can add their copyright notice
  // Image metadata defaults
  artistName: '',                     // Empty by default - pre-filled from user profile on first load
  imageTitle: 'Untitled Artwork',     // Default title template
  imageDescription: 'Created with Shape Editor', // Default description template
};

// Saved artboard configuration for persistence
export interface SavedArtboard {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dpi: number;
  unitType: 'pixels' | 'mm' | 'cm' | 'inches';
  backgroundColor: string;
  gridColor?: string;
  displayGrid: boolean;
  displayBorder: boolean;
  displayName: boolean;
  displayDimensions: boolean;
  displayResolution: boolean;
  preset?: string;
  category?: string;
  linkedDimensions?: boolean;
  aspectRatio?: string;
  printConfig?: PrintConfig;
}

// App settings defaults configuration type
export interface AppSettingsDefaults {
  // Export settings
  exportFormat: 'png' | 'jpg' | 'webp' | 'avif' | 'bmp' | 'pdf' | 'tiff';
  exportQuality: number;              // 10-100 for lossy formats
  exportScale: number;                // 0.1-20x scaling (up to 1200dpi)
  exportAutoScaleFromDpi: boolean;    // Auto-calculate scale from artboard DPI
  exportMode: 'selection' | 'artboard' | 'all';
  
  // All artboards (persisted)
  savedArtboards?: SavedArtboard[];   // All artboards for persistence
  activeArtboardId?: string;          // Currently active artboard ID
  
  // Legacy artboard settings (for backward compatibility)
  artboardName: string;
  artboardWidth: number;
  artboardHeight: number;
  artboardDpi: number;
  artboardUnitType: 'pixels' | 'mm' | 'cm' | 'inches';
  artboardBackgroundColor: string;
  artboardGridColor: string;
  artboardDisplayGrid: boolean;
  artboardDisplayBorder: boolean;
  artboardDisplayName: boolean;
  artboardDisplayDimensions: boolean;
  artboardDisplayResolution: boolean;
  
  // Canvas settings
  canvasPanX: number;
  canvasPanY: number;
  canvasZoom: number;
  
  // UI settings
  sidebarCollapsed: boolean;
  
  // Selection UI visibility settings
  showMultiSelectButton: boolean;
  showSelectedCount: boolean;
  
  // Print configuration settings (applied to new artboards)
  printOverlayUnit: PrintUnitType;   // Unified unit for all overlays (bleed, safe zone, print marks)
  printBleedAmount: number;
  printBleedDisplay: boolean;
  printBleedRender: boolean;
  printBleedColor: string;           // Bleed overlay color (default: cyan #00FFFF)
  printSafeZoneAmount: number;
  printSafeZoneDisplay: boolean;
  printSafeZoneColor: string;        // Safe zone overlay color (default: magenta #FF00FF)
  printMarksCropMarks: boolean;
  printMarksRegistrationMarks: boolean;
  printMarksMarkLength: number;
  printMarksMarkOffset: number;
  printMarksDisplay: boolean;
  printMarksRender: boolean;
  printMarksScaleMode?: PrintMarksScaleMode;  // 'none' = use overlayUnit, 'percent' = scale relative to artboard
}

// Default app settings
export const DEFAULT_APP_SETTINGS: AppSettingsDefaults = {
  exportFormat: 'png',
  exportQuality: 90,
  exportScale: 1,
  exportAutoScaleFromDpi: false,
  exportMode: 'all',
  artboardName: 'Artboard 1',
  artboardWidth: 400,
  artboardHeight: 400,
  artboardDpi: 72,
  artboardUnitType: 'pixels',
  artboardBackgroundColor: '#ffffff',
  artboardGridColor: '#cccccc',
  artboardDisplayGrid: false,
  artboardDisplayBorder: true,
  artboardDisplayName: true,
  artboardDisplayDimensions: false,
  artboardDisplayResolution: false,
  canvasPanX: 0,
  canvasPanY: 0,
  canvasZoom: 1,
  sidebarCollapsed: false,
  showMultiSelectButton: true,
  showSelectedCount: true,
  printOverlayUnit: 'mm',
  printBleedAmount: 3,
  printBleedDisplay: false,
  printBleedRender: false,
  printBleedColor: '#00FFFF',
  printSafeZoneAmount: 5,
  printSafeZoneDisplay: false,
  printSafeZoneColor: '#FF00FF',
  printMarksCropMarks: true,
  printMarksRegistrationMarks: true,
  printMarksMarkLength: 5,
  printMarksMarkOffset: 3,
  printMarksDisplay: false,
  printMarksRender: false,
  printMarksScaleMode: 'none',
};

// User preferences schemas
export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserPreferencesSchema = insertUserPreferencesSchema.partial().omit({
  userId: true,
});

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UpdateUserPreferences = z.infer<typeof updateUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;

// ===== SHAPE SET PRESETS =====
// Table for storing user's shape set preset configurations
export const shapeSetPresets = pgTable("shape_set_presets", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  presetName: varchar("preset_name").notNull(),
  generationSetsData: jsonb("generation_sets_data").notNull(),
  currentSetId: varchar("current_set_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertShapeSetPresetSchema = createInsertSchema(shapeSetPresets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertShapeSetPreset = z.infer<typeof insertShapeSetPresetSchema>;
export type ShapeSetPreset = typeof shapeSetPresets.$inferSelect;

// ===== BATCH CONFIGURATION SETTINGS =====
// Moved from client/src/components/BatchConfigDialog.tsx to shared for type safety

// BlendMode type definition (moved from client shapeTypes)
export type BlendMode = 
  | 'source-over' 
  | 'multiply' 
  | 'screen' 
  | 'overlay' 
  | 'darken' 
  | 'lighten' 
  | 'color-dodge' 
  | 'color-burn' 
  | 'hard-light' 
  | 'soft-light' 
  | 'difference' 
  | 'exclusion' 
  | 'hue' 
  | 'saturation' 
  | 'color' 
  | 'luminosity';

// Compositing operation type for advanced masking and compositing effects
export type CompositingOperation = 
  | 'source-over'     // Default - draw new on top
  | 'source-in'       // Keep new where it overlaps existing  
  | 'source-out'      // Keep new where it doesn't overlap existing
  | 'source-atop'     // Keep new on top of existing only
  | 'destination-over'  // Draw new behind existing
  | 'destination-in'    // Keep existing where new overlaps
  | 'destination-out'   // Remove existing where new overlaps  
  | 'destination-atop'  // Keep existing on top of new only
  | 'lighter'         // Add colors together
  | 'copy'           // Replace with new
  | 'xor';           // Keep where they don't overlap

// Incremental Index Driver - determines which index to use for incremental calculations
// shapeIndex: Uses the shape's index within the generation (0, 1, 2, ...)
// setRepIndex: Uses the set's repetition index across batch generations (0, 1, 2, ...)
export type IncrementalIndexDriver = 'shapeIndex' | 'setRepIndex';

// Set transform configuration
export interface SetTransform {
  x: number;                    // X position offset
  y: number;                    // Y position offset  
  rotation: number;             // Rotation in degrees
  scaleX: number;               // Scale factor for X axis (1.0 = 100%)
  scaleY: number;               // Scale factor for Y axis (1.0 = 100%)
  transformOrigin: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

// Artboard alignment configuration  
export interface ArtboardAlignment {
  fitToArtboard: boolean;       // Automatically fit set to artboard bounds
  fitMode: 'contain' | 'fill';  // contain = maintain aspect ratio, fill = stretch to fill both axes
  alignTo: 'artboard' | 'set' | 'none'; // What to align to
  alignmentType: 'center' | 'top-left' | 'top-center' | 'top-right' | 
                 'center-left' | 'center-right' | 'bottom-left' | 
                 'bottom-center' | 'bottom-right';
  targetSetId?: string;         // ID of set to align to (when alignTo = 'set')
  margin: number | { top: number; bottom: number; left: number; right: number }; // Margin from alignment target in pixels (uniform or individual)
}

// Set visibility and opacity configuration
export interface SetVisibility {
  visible: boolean;            // Whether this set is visible
  opacity: number;             // Overall opacity for the set (0-1)
  opacityVariance: number;     // Random variance in opacity (0-1)
}

// Set locks configuration - granular control over which operations can affect this set
export interface SetLocks {
  composite: boolean;          // Prevents compositing operations from affecting this set (protects backgrounds)
}

// ============================================================================
// Print Configuration Types (for Print-on-Demand export)
// ============================================================================

// Unit type for print measurements
export type PrintUnitType = 'pixels' | 'mm' | 'cm' | 'inches';

// Background mode for export
export type BackgroundMode = 'transparent' | 'artboard' | 'custom';

// Output specifications (non-visual print parameters)
export interface OutputSpecs {
  dpi: number;
  unitType: PrintUnitType;
}

// Bleed settings
export interface BleedSettings {
  amount: number;
  display: boolean;  // Show on canvas
  render: boolean;   // Include in export
  color: string;     // Display/render color (default: cyan #00FFFF)
}

// Safe zone settings
export interface SafeZoneSettings {
  amount: number;
  display: boolean;  // Show on canvas (no render - purely visual)
  color: string;     // Display color (default: magenta #FF00FF)
}

// Print marks scale mode - controls how mark dimensions scale with artboard
export type PrintMarksScaleMode = 'none' | 'percent';

// Print marks settings
export interface PrintMarksSettings {
  display: boolean;  // Show on canvas
  render: boolean;   // Include in export
  cropMarks: boolean;
  registrationMarks: boolean;
  markLength: number;  // Length of crop marks (uses unified overlayUnit, or percentage if scaleMode is 'percent')
  markOffset: number;  // Offset from bleed edge (uses unified overlayUnit, or percentage if scaleMode is 'percent')
  scaleMode?: PrintMarksScaleMode;  // 'none' = use overlayUnit, 'percent' = scale relative to artboard size
}

// Background settings for export
export interface BackgroundExportSettings {
  mode: BackgroundMode;
  customColor: string;
  display: boolean;  // Show on canvas
  render: boolean;   // Include in export
}

// Printable elements (overlays that can be rendered)
export interface PrintableOverlays {
  overlayUnit: PrintUnitType;  // Unified unit for all overlay measurements (bleed, safe zone, print marks)
  bleed: BleedSettings;
  safeZone: SafeZoneSettings;
  printMarks: PrintMarksSettings;
  background: BackgroundExportSettings;
}

// Complete print configuration
export interface PrintConfig {
  outputSpecs: OutputSpecs;
  overlays: PrintableOverlays;
}

// Default print configuration values
export const DEFAULT_PRINT_CONFIG: PrintConfig = {
  outputSpecs: {
    dpi: 72,
    unitType: 'pixels',
  },
  overlays: {
    overlayUnit: 'pixels',  // Unified unit for all overlay measurements
    bleed: {
      amount: 0,
      display: false,
      render: false,
      color: '#00FFFF',  // Cyan
    },
    safeZone: {
      amount: 0,
      display: false,
      color: '#FF00FF',  // Magenta
    },
    printMarks: {
      display: false,
      render: false,
      cropMarks: true,
      registrationMarks: true,
      markLength: 12,
      markOffset: 3,
      scaleMode: 'none',
    },
    background: {
      mode: 'artboard',
      customColor: '#ffffff',
      display: true,
      render: true,
    },
  },
};

// Zod schemas for print configuration validation
export const PrintUnitTypeSchema = z.enum(['pixels', 'mm', 'cm', 'inches']);
export const BackgroundModeSchema = z.enum(['transparent', 'artboard', 'custom']);

export const OutputSpecsSchema = z.object({
  dpi: z.number().min(1).max(1200),
  unitType: PrintUnitTypeSchema,
});

export const BleedSettingsSchema = z.object({
  amount: z.number().min(0),
  display: z.boolean(),
  render: z.boolean(),
  color: z.string(),
});

export const SafeZoneSettingsSchema = z.object({
  amount: z.number().min(0),
  display: z.boolean(),
  color: z.string(),
});

export const PrintMarksScaleModeSchema = z.enum(['none', 'percent']);

export const PrintMarksSettingsSchema = z.object({
  display: z.boolean(),
  render: z.boolean(),
  cropMarks: z.boolean(),
  registrationMarks: z.boolean(),
  markLength: z.number().min(0).max(100),  // Allow 0-100 for percentage mode
  markOffset: z.number().min(0).max(50),
  scaleMode: PrintMarksScaleModeSchema.optional(),
});

export const BackgroundExportSettingsSchema = z.object({
  mode: BackgroundModeSchema,
  customColor: z.string(),
  display: z.boolean(),
  render: z.boolean(),
});

export const PrintableOverlaysSchema = z.object({
  overlayUnit: PrintUnitTypeSchema,  // Unified unit for all overlay measurements
  bleed: BleedSettingsSchema,
  safeZone: SafeZoneSettingsSchema,
  printMarks: PrintMarksSettingsSchema,
  background: BackgroundExportSettingsSchema,
});

export const PrintConfigSchema = z.object({
  outputSpecs: OutputSpecsSchema,
  overlays: PrintableOverlaysSchema,
});

// ============================================================================

// Grid offset axis configuration (for row or column)
export interface GridOffsetAxisConfig {
  enabled: boolean;
  amountMode: 'fixed' | 'range' | 'incremental';  // Value mode for amount
  amount: number;                    // Pixels to offset (for fixed mode)
  amountMin: number;                 // Min offset for range mode
  amountMax: number;                 // Max offset for range mode
  amountBase: number;                // Base offset for incremental mode
  amountIncrement: number;           // Increment per alternating row/col for incremental mode
  startIndex: number;                // Which row/column starts the offset (0-indexed)
  direction: 'left' | 'right' | 'up' | 'down';  // Direction of offset
  pattern: number[];                 // For pattern mode: explicit indices to offset
}

// Grid offsets configuration for alternating/pattern offsets
export interface GridOffsetsConfig {
  enabled: boolean;
  mode: 'alternating' | 'pattern';
  preset: 'custom' | 'none' | 'brick' | 'honeycomb' | 'staircase' | 'zigzag' | 'diamond';  // Track selected preset
  row: GridOffsetAxisConfig;         // Row offset affects X position (shifts left/right)
  column: GridOffsetAxisConfig;      // Column offset affects Y position (shifts up/down)
}

// Default grid offsets configuration
export const DEFAULT_GRID_OFFSETS: GridOffsetsConfig = {
  enabled: false,
  mode: 'alternating',
  preset: 'custom',
  row: {
    enabled: false,
    amountMode: 'fixed',
    amount: 0,
    amountMin: 0,
    amountMax: 50,
    amountBase: 0,
    amountIncrement: 10,
    startIndex: 0,
    direction: 'right',
    pattern: []
  },
  column: {
    enabled: false,
    amountMode: 'fixed',
    amount: 0,
    amountMin: 0,
    amountMax: 50,
    amountBase: 0,
    amountIncrement: 10,
    startIndex: 0,
    direction: 'down',
    pattern: []
  }
};

// Shape masking configuration for controlling which grid positions render shapes
export interface ShapeMaskingGridConfig {
  enabled: boolean;
  mode: 'alternating' | 'pattern';
  invert: boolean;                    // false = exclude matched, true = render only matched
  priority: 'row-first' | 'column-first';
  
  // Alternating mode settings
  alternating: {
    skipEvery: number;                // Skip every Nth row/column (2 = every other)
    startIndex: number;               // Where alternation begins (0-indexed)
  };
  
  // Pattern mode settings - explicit row/column combinations to mask
  pattern: Array<{
    row: number;
    columns: number[];                // Which columns to mask for this row
  }>;
}

// Shape masking configuration (Phase 3)
export interface ShapeMaskingConfig {
  enabled: boolean;
  grid: ShapeMaskingGridConfig;
}

// Default shape masking configuration
export const DEFAULT_SHAPE_MASKING: ShapeMaskingConfig = {
  enabled: false,
  grid: {
    enabled: false,
    mode: 'alternating',
    invert: false,
    priority: 'row-first',
    alternating: {
      skipEvery: 2,
      startIndex: 0
    },
    pattern: []
  }
};

// Cell constraints configuration for cell-based rendering (Phase 4)
export interface CellConstraintsConfig {
  enabled: boolean;
  renderMode: 'point' | 'cell' | 'cell-point';
  // - point: Shapes at intersection points, original size (rows × cols positions)
  // - cell: Shapes in cells between grid lines with fit constraints ((rows-1) × (cols-1) cells)
  // - cell-point: Shapes at intersection points but with cell-based fit constraints (rows × cols positions with sizing)
  
  // Cell/Cell-Point mode settings - how shapes fit within cells
  fitMode: 'none' | 'fill' | 'contain' | 'cover';
  // - none: Use original shape size, just center in cell
  // - fill: Stretch to fill cell (may distort aspect ratio)
  // - contain: Scale to fit within cell (maintain aspect ratio, may have gaps)
  // - cover: Scale to cover cell (maintain aspect ratio, may overflow)
  
  maintainAspectRatio: boolean;   // Legacy field, no longer used (fill always stretches)
  padding: number;                // Inset from cell edges
  paddingUnit: 'px' | '%';        // Pixel or percentage of cell size
  
  // Debug visualization
  showDebugGrid: boolean;         // Show red semi-transparent grid lines for debugging
}

// Default cell constraints configuration
export const DEFAULT_CELL_CONSTRAINTS: CellConstraintsConfig = {
  enabled: false,
  renderMode: 'point',
  fitMode: 'contain',
  maintainAspectRatio: true,
  padding: 0,
  paddingUnit: 'px',
  showDebugGrid: false
};

// ===== ECHO/MOTION TRAILS CONFIGURATION =====
// Echo/Motion Trails creates trailing copies of shapes with progressive effects
// Project A: Set-Level only (scope locked to 'set', driver is setRepIndex)

// Echo direction mode - how the echo direction is determined
export type EchoDirectionMode = 'fixed-vector' | 'auto-motion' | 'absolute-position';

// Echo scope - which level echoes apply to (Project A: only 'set' is enabled)
export type EchoScope = 'set' | 'shape' | 'both';

// Echo driver - what determines echo progression (Project A: only 'setRepIndex' active)
export type EchoDriver = 'setRepIndex' | 'shapeIndex' | 'combined';

// Per-effect jitter mode
export type EchoPerEffectJitterMode = 'fixed' | 'range';

// Per-effect jitter settings (applies to individual effects for granular control)
export interface EchoPerEffectJitterConfig {
  enabled: boolean;
  mode: EchoPerEffectJitterMode;  // 'fixed' uses fixedAmount, 'range' randomizes between min/max
  fixedAmount: number;            // Fixed jitter amount (used in 'fixed' mode)
  rangeMin: number;               // Minimum jitter (used in 'range' mode)
  rangeMax: number;               // Maximum jitter (used in 'range' mode)
}

// Per-echo opacity settings
export interface EchoOpacityConfig {
  enabled?: boolean;         // Whether opacity effect is enabled (defaults to true for backward compat)
  startOpacity: number;      // 0-100% - starting opacity for first echo
  falloffRate: number;       // 0-100% - how fast opacity decreases per echo
  minOpacity: number;        // 0-100% - minimum opacity floor
  jitter: EchoPerEffectJitterConfig; // Opacity-specific jitter
}

// Per-echo blur settings
export interface EchoBlurConfig {
  enabled: boolean;
  startBlur: number;         // 0-50px - starting blur for first echo
  blurDelta: number;         // 0-20px - blur increase per echo
  maxBlur: number;           // 0-100px - maximum blur cap
  jitter: EchoPerEffectJitterConfig; // Blur-specific jitter
}

// Per-echo scale settings
export interface EchoScaleConfig {
  enabled: boolean;
  startScale: number;        // 10-200% - starting scale for first echo
  scaleDelta: number;        // -50 to +50% - scale change per echo
  minScale: number;          // 1-100% - minimum scale floor
  maxScale: number;          // 100-500% - maximum scale cap
  jitter: EchoPerEffectJitterConfig; // Scale-specific jitter
}

// Per-echo rotation settings
export interface EchoRotationConfig {
  enabled: boolean;
  startRotation: number;     // 0-360° - starting rotation for first echo
  rotationDelta: number;     // -180 to +180° - rotation change per echo
  minRotation: number;       // -360 to 0° - minimum rotation floor
  maxRotation: number;       // 0 to 360° - maximum rotation cap
  jitter: EchoPerEffectJitterConfig; // Rotation-specific jitter
}

// Echo jitter settings for organic variation (position/direction jitter)
export interface EchoJitterConfig {
  enabled: boolean;
  distanceRange: number;     // 0-100px - random distance variation
  angleRange: number;        // 0-180° - random angle variation
}

// Per-echo color shift settings (Project B: color progression)
export interface EchoColorShiftConfig {
  enabled: boolean;
  hueDelta: number;          // -180 to +180° - hue change per echo
  saturationDelta: number;   // -50 to +50% - saturation change per echo
  lightnessDelta: number;    // -50 to +50% - lightness change per echo
  jitter: EchoPerEffectJitterConfig; // Color-specific jitter (applied to hue)
}

// Fixed-vector mode settings
export interface EchoFixedVectorConfig {
  angle: number;             // 0-360° - direction of echoes
  distance: number;          // 0-500px - distance between echoes
}

// Auto-motion mode settings
export interface EchoAutoMotionConfig {
  fallbackAngle: number;     // 0-360° - angle when no motion detected
  distanceMultiplier: number; // 0.1-5.0 - multiplier for detected motion
}

// Artboard target presets for absolute-position mode
export type EchoArtboardTarget = 'center' | 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left' | 'custom';

// Absolute-position mode settings (Project B: converging/diverging effects)
export interface EchoAbsolutePositionConfig {
  targetX: number;           // Target X coordinate (artboard-relative, used when artboardTarget='custom')
  targetY: number;           // Target Y coordinate (artboard-relative, used when artboardTarget='custom')
  artboardTarget: EchoArtboardTarget; // Predefined artboard location or custom coordinates
  mode: 'converge' | 'diverge'; // Converge toward target or diverge away from it
}

// Echo ApplyTo filter selector mode
export type EchoApplyToSelector = 'all' | 'even' | 'odd' | 'step';

// Echo ApplyTo filter configuration (Project B: shape filtering for echoes)
export interface EchoApplyToConfig {
  enabled: boolean;
  shapeTypes?: string[];      // Only apply to these shape types (if empty/undefined, apply to all)
  indices?: number[];         // Specific shape indices to apply to
  selector: EchoApplyToSelector;  // Index-based selection mode
  indexStep?: number;         // Step interval when selector='step' (default: 2)
  probability?: number;       // 0-100 probability of applying to each matching shape
}

// Default ApplyTo config (apply to all)
export const DEFAULT_ECHO_APPLY_TO_CONFIG: EchoApplyToConfig = {
  enabled: false,
  shapeTypes: [],
  indices: [],
  selector: 'all',
  indexStep: 2,
  probability: 100
};

// Main Echo/Motion Trails configuration
export interface EchoSpreadConfig {
  version: number;           // Schema version for migrations (starts at 1)
  enabled: boolean;
  
  // Scope and driver (Project A: scope locked to 'set', driver to 'setRepIndex')
  scope: EchoScope;
  driver: EchoDriver;
  syncBothScopes?: boolean;  // When scope='both', sync settings between Set and Shape levels (default: true)
  
  // Echo count
  echoCount: number;         // 1-20 - number of echo copies
  
  // Direction mode
  directionMode: EchoDirectionMode;
  fixedVector: EchoFixedVectorConfig;
  autoMotion: EchoAutoMotionConfig;
  absolutePosition?: EchoAbsolutePositionConfig;
  
  // Per-echo effects
  opacity: EchoOpacityConfig;
  blur: EchoBlurConfig;
  scale: EchoScaleConfig;
  rotation: EchoRotationConfig;
  colorShift?: EchoColorShiftConfig; // Optional color progression (Project B)
  
  // Jitter for organic variation (position/direction)
  jitter: EchoJitterConfig;
  
  // ApplyTo filters (Project B: shape-level filtering)
  applyTo?: EchoApplyToConfig;
}

// Default per-effect jitter config
export const DEFAULT_ECHO_PER_EFFECT_JITTER: EchoPerEffectJitterConfig = {
  enabled: false,
  mode: 'fixed',
  fixedAmount: 0,
  rangeMin: 0,
  rangeMax: 0
};

// Default echo/motion trails configuration
export const DEFAULT_ECHO_SPREAD_CONFIG: EchoSpreadConfig = {
  version: 2,                // Schema version 2: per-effect jitter + rotation config
  enabled: false,
  
  scope: 'set',              // Project A: locked to 'set'
  driver: 'setRepIndex',     // Project A: locked to 'setRepIndex'
  
  echoCount: 3,
  
  directionMode: 'fixed-vector',
  fixedVector: {
    angle: 225,              // Default: trailing behind (up-left)
    distance: 20
  },
  autoMotion: {
    fallbackAngle: 225,
    distanceMultiplier: 1.0
  },
  absolutePosition: {
    targetX: 0,
    targetY: 0,
    artboardTarget: 'center',
    mode: 'converge'
  },
  
  opacity: {
    startOpacity: 80,
    falloffRate: 25,
    minOpacity: 10,
    jitter: { enabled: false, mode: 'fixed', fixedAmount: 0, rangeMin: 0, rangeMax: 0 }
  },
  blur: {
    enabled: false,
    startBlur: 0,
    blurDelta: 2,
    maxBlur: 20,
    jitter: { enabled: false, mode: 'fixed', fixedAmount: 0, rangeMin: 0, rangeMax: 0 }
  },
  scale: {
    enabled: false,
    startScale: 100,
    scaleDelta: -5,
    minScale: 20,
    maxScale: 200,
    jitter: { enabled: false, mode: 'fixed', fixedAmount: 0, rangeMin: 0, rangeMax: 0 }
  },
  rotation: {
    enabled: false,
    startRotation: 0,
    rotationDelta: 0,
    minRotation: -360,
    maxRotation: 360,
    jitter: { enabled: false, mode: 'fixed', fixedAmount: 0, rangeMin: 0, rangeMax: 0 }
  },
  colorShift: {
    enabled: false,
    hueDelta: 0,
    saturationDelta: 0,
    lightnessDelta: 0,
    jitter: { enabled: false, mode: 'fixed', fixedAmount: 0, rangeMin: 0, rangeMax: 0 }
  },
  
  jitter: {
    enabled: false,
    distanceRange: 0,
    angleRange: 0
  },
  
  applyTo: DEFAULT_ECHO_APPLY_TO_CONFIG
};

export interface BatchConfigSettings {
  // Preset Selection
  selectedPreset: string;
  
  // Distribution Layout
  distributionLayoutEnabled: boolean;
  distributionPattern: 'grid' | 'wave' | 'ellipse' | 'spiral';
  
  // Grid Layout Settings
  gridRows: number;
  gridColumns: number;
  gridStartX: number; // Start position offset X
  gridStartY: number; // Start position offset Y
  gridSpacingXMode: 'define' | 'auto-centered' | 'auto-edge-to-edge'; // Spacing calculation mode
  gridSpacingYMode: 'define' | 'auto-centered' | 'auto-edge-to-edge'; // Spacing calculation mode
  gridRowOffset: number;
  gridColumnOffset: number;
  gridMarginEnabled: boolean; // Enable custom margin for auto-centered mode
  gridMarginValue: number; // Custom margin value (applies to all sides)
  gridSortBy: 'layer' | 'id' | 'shape-type' | 'fill-color' | 'opacity' | 'size' | 'angle' | 'creation-time' | 'none' | 
    'corner-radius' | 'point-count' | 'edge-count' | 'inner-radius' | 'segment-count' | 
    'direction' | 'length' | 'centroid' | 'spread' | 'curvature';
  gridSortScope: 'per-generation' | 'per-batch'; // Sort within each generation or across entire batch
  gridSortOrder: 'ascending' | 'descending'; // Sort direction
  gridGroupByShapeType: boolean; // Group shapes by type before sorting
  gridReverseGroups: boolean; // Reverse the order of shape-type groups
  // Grid randomization amounts (additive pixel offsets)
  gridXRandomization: number; // 0-200 pixels additive randomization in X direction
  gridYRandomization: number; // 0-200 pixels additive randomization in Y direction
  
  // Grid alternating/pattern offsets (Phase 1: alternating, Phase 2: pattern)
  gridOffsets: GridOffsetsConfig;
  
  // Shape masking for grid positions (Phase 3)
  shapeMasking: ShapeMaskingConfig;
  
  // Cell constraints for cell-based rendering (Phase 4)
  cellConstraints: CellConstraintsConfig;
  
  
  // Wave Pattern Settings
  waveType: 'sine' | 'triangle' | 'square' | 'sawtooth';
  waveAmplitude: number; // Wave height in pixels (0-200)
  waveFrequency: number; // Number of complete waves or wavelength
  waveDirection: 'horizontal' | 'vertical';
  wavePhaseOffset: number; // Start position along wave (0-360 degrees)
  
  // Ellipse/Ring Pattern Settings
  ellipseXRadius: [number, number]; // X radius range in pixels
  ellipseYRadius: [number, number]; // Y radius range in pixels
  ellipseRingCount: number; // Number of concentric rings (1-10)
  ellipseRingSpacing: 'even' | 'progressive'; // Spacing mode between rings
  ellipseRotation: number; // Ellipse rotation angle (0-360 degrees)
  ellipseRotationAlignment: 'uniform' | 'progressive'; // All rings same rotation or progressive
  ellipseAlignToRing: boolean; // Align shapes to ellipse tangent
  ellipseFlipInward: boolean; // Flip alignment inward vs outward
  ellipseAdditionalRotation: number; // Additional rotation added to alignment (degrees)
  ellipseShapeRotationMode: 'none' | 'fixed' | 'range' | 'incremental'; // Shape rotation mode
  ellipseRotationFixed: number; // Fixed rotation value (degrees)
  ellipseRotationRange: [number, number]; // Random rotation range (degrees)
  ellipseRotationIncrementalStart: number; // Starting rotation (degrees)
  ellipseRotationIncrementalStep: number; // Rotation increment per shape (degrees)
  
  // Spiral Pattern Settings
  spiralTurnCount: number; // Number of complete rotations (1-20)
  spiralSpacingMode: 'linear' | 'logarithmic'; // Spacing growth mode
  spiralDirection: 'clockwise' | 'counterclockwise';
  spiralStartAngle: number; // Initial rotation offset (0-360 degrees)
  spiralTightness: number; // How compact/spread the spiral is (0.1-2.0)
  
  // Shared Pattern Enhancements
  tangentAlignment: boolean; // Orient shapes to follow curve tangent
  segmentDistribution: 'even' | 'clustered'; // Shape distribution along path
  reverseDirection: boolean; // Reverse pattern direction
  
  // Generation Count Controls
  generationCountMode: 'range' | 'fixed' | 'incremental';
  generationCountDefine: number;
  generationCountStartValue: number;
  generationCountIncrement: number;
  generationCountResetPerBatch: boolean;
  generationCountModulationEnabled: boolean;
  generationCountModulationValue: number;

  // Blend Mode Control
  blendModeEnabled: boolean;
  enabledBlendModes: { [key in BlendMode]?: number }; // weight 0-100
  
  // Compositing Operations Control
  compositingOperationsEnabled: boolean;
  enabledCompositingOperations: { [key: string]: number }; // weight 0-100
  
  // Properties Section
  propertiesEnabled: boolean;
  
  // Shape Properties
  shapePropertiesEnabled: boolean;
  shapePropertiesDimensionsEnabled: boolean;
  shapePropertiesPositionEnabled: boolean;
  widthRange: [number, number];
  heightRange: [number, number];
  xPositionRange: [number, number];
  yPositionRange: [number, number];
  
  // Enhanced Width and Height Properties
  widthMode: 'range' | 'value' | 'incremental';
  heightMode: 'range' | 'value' | 'incremental';
  
  // Width/Height Mode Toggles
  sizeIncrementalResetPerBatch: boolean; // true: reset count per batch, false: continuous increment
  
  // Size Constraint Mode - determines how width/height are constrained
  sizeConstraintMode: 'none' | 'min' | 'max' | 'avg'; // 'none': independent W/H, 'min/max/avg': constrain both dimensions
  
  // Width/Height Value Mode
  widthValue: number;
  heightValue: number;
  
  // Width/Height Incremental Mode
  widthIncrement: number;
  heightIncrement: number;
  widthStartValue: number; // Individual start values
  heightStartValue: number;
  widthModulationEnabled: boolean; // Enable modulation for width
  widthModulationValue: number; // Modulation value for width
  heightModulationEnabled: boolean; // Enable modulation for height
  heightModulationValue: number; // Modulation value for height
  sizeIncrementalIndexDriver: IncrementalIndexDriver; // Index driver for width/height incremental mode
  
  // Size Constraints
  minimumSize: number; // absolute minimum size to prevent invisible shapes
  maximumSize: number; // absolute maximum size constraint
  
  // Enhanced Position Properties (removed percentage and edge-offset modes)
  xPositionMode: 'range' | 'value' | 'directional' | 'incremental';
  yPositionMode: 'range' | 'value' | 'directional' | 'incremental';
  
  // Position Mode Toggles
  incrementalResetPerBatch: boolean; // true: reset count per batch, false: continuous increment
  directionalEvenDistribution: boolean; // true: even 360° distribution, false: clustering
  directionalClusterAngle: number; // degrees for clustering mode
  
  // Position Value Mode
  xPositionValue: number;
  yPositionValue: number;
  
  // Position Directional Mode
  positionDirectionalMode: 'outward-center' | 'outward-edge' | 'angle-based';
  positionDirectionalAngle: number; // 0-360 degrees
  positionDirectionalDistance: number;
  
  // Position Incremental Mode
  xPositionIncrement: number;
  yPositionIncrement: number;
  xPositionStartValue: number; // Start value for X position
  yPositionStartValue: number; // Start value for Y position
  xPositionModulationMode: 'off' | 'grid-row' | 'pixel-value' | 'shape-count'; // Modulation mode for X position
  xPositionModulationValue: number; // Modulation value for X position (used for pixel-value and shape-count modes)
  yPositionModulationMode: 'off' | 'grid-row' | 'pixel-value' | 'shape-count'; // Modulation mode for Y position
  yPositionModulationValue: number; // Modulation value for Y position (used for pixel-value and shape-count modes)
  positionIncrementalIndexDriver: IncrementalIndexDriver; // Index driver for position incremental mode
  
  // Rectangle-specific Properties
  rectangleCornerRadiusMode: 'range' | 'define' | 'incremental';
  rectangleCornerRadiusRange: [number, number];
  rectangleCornerRadiusDefine: number;
  rectangleCornerRadiusStartValue: number;
  rectangleCornerRadiusIncrement: number;
  rectangleCornerRadiusModulationEnabled: boolean;
  rectangleCornerRadiusModulationValue: number;
  rectangleCornerRadiusIncrementalIndexDriver: IncrementalIndexDriver; // Index driver for corner radius incremental mode
  
  // Star-specific Properties
  starInnerRadiusMode: 'range' | 'define' | 'incremental';
  starInnerRadiusRange: [number, number];
  starInnerRadiusDefine: number;
  starInnerRadiusStartValue: number;
  starInnerRadiusIncrement: number;
  starInnerRadiusModulationEnabled: boolean;
  starInnerRadiusModulationValue: number;
  starInnerRadiusIncrementalIndexDriver: IncrementalIndexDriver; // Index driver for star inner radius incremental mode
  
  // Ring-specific Properties
  ringInnerRadiusMode: 'range' | 'define' | 'incremental';
  ringInnerRadiusRange: [number, number];
  ringInnerRadiusDefine: number;
  ringInnerRadiusStartValue: number;
  ringInnerRadiusIncrement: number;
  ringInnerRadiusModulationEnabled: boolean;
  ringInnerRadiusModulationValue: number;
  ringInnerRadiusIncrementalIndexDriver: IncrementalIndexDriver; // Index driver for ring inner radius incremental mode
  
  // Fill Properties - Controls solid vs gradient vs pattern
  fillEnabled: boolean;
  fillSolidEnabled: boolean; // Enable/disable solid fill section
  fillStyleProbability: number; // 0-100% - probability for solid fill vs gradient fill
  
  // Fill Color Settings (for solid fills)
  fillColorMode: 'range' | 'palette' | 'define';
  fillColorRange: [string, string]; // For range mode (HSL interpolation)
  fillColorRangeFlip: boolean; // Toggle to flip color range direction (short vs long path around hue wheel)
  fillColorPalette: string[]; // For palette mode
  fillColorDefine: string; // For define mode
  // Additional HSL controls for range mode
  fillColorSaturationRange: [number, number]; // 0-100% for range mode
  fillColorLightnessRange: [number, number]; // 0-100% for range mode
  
  // Fill Gradient Settings
  fillGradientEnabled: boolean; // Enable/disable gradients
  // Individual gradient type probabilities (must sum to 100 when enabled)
  fillGradientLinearProbability: number; // 0-100% probability for linear gradients
  fillGradientRadialProbability: number; // 0-100% probability for radial gradients
  fillGradientConicProbability: number; // 0-100% probability for conic gradients
  
  fillGradientColorMode: 'range' | 'palette' | 'define';
  fillGradientColorRange: [string, string]; // For range mode (HSL interpolation)
  fillGradientColorRangeFlip: boolean; // Toggle to flip color range direction (short vs long path around hue wheel)
  fillGradientColorPalette: string[]; // For palette mode
  fillGradientColorDefine: string[]; // For define mode - array based on max stops
  // Additional HSL controls for range mode
  fillGradientColorSaturationRange: [number, number]; // 0-100% for range mode
  fillGradientColorLightnessRange: [number, number]; // 0-100% for range mode
  fillGradientStopsMode: 'fixed' | 'range'; // Mode for color stops count
  fillGradientStopsCount: number; // Fixed mode: exact number of color stops
  fillGradientStopsRange: [number, number]; // Range mode: min-max color stops
  // Stop Position Distribution Controls
  fillGradientStopDistribution: 'even' | 'random'; // How stops are positioned
  fillGradientStopsReverse: boolean; // Reverse the color order of stops
  // Enhanced Gradient Type & Direction Controls
  fillGradientLinearDirection: 'fixed' | 'range' | 'predefined'; // Linear direction mode
  fillGradientLinearAngle: number; // Fixed mode: exact angle in degrees
  fillGradientLinearAngleRange: [number, number]; // Range mode: min-max angle range
  fillGradientLinearPredefined: 'horizontal' | 'vertical' | 'diagonal-down' | 'diagonal-up'; // Predefined directions
  fillGradientLinearAlignToShape: boolean; // Whether to align gradient to shape orientation/rotation
  fillGradientRadialCenter: 'center' | 'corners' | 'midpoints' | 'coordinates'; // Radial center positioning
  
  // Radial Gradient Center X (0-100% of shape bounds)
  fillGradientRadialCenterXMode: 'fixed' | 'range' | 'incremental';
  fillGradientRadialCenterX: number; // Fixed mode value
  fillGradientRadialCenterXRange: [number, number]; // Range mode min/max
  fillGradientRadialCenterXStartValue: number; // Incremental mode start
  fillGradientRadialCenterXIncrement: number; // Incremental mode step
  fillGradientRadialCenterXModulationEnabled: boolean; // Enable modulation
  fillGradientRadialCenterXModulationValue: number; // Modulation value
  
  // Radial Gradient Center Y (0-100% of shape bounds)
  fillGradientRadialCenterYMode: 'fixed' | 'range' | 'incremental';
  fillGradientRadialCenterY: number; // Fixed mode value
  fillGradientRadialCenterYRange: [number, number]; // Range mode min/max
  fillGradientRadialCenterYStartValue: number; // Incremental mode start
  fillGradientRadialCenterYIncrement: number; // Incremental mode step
  fillGradientRadialCenterYModulationEnabled: boolean; // Enable modulation
  fillGradientRadialCenterYModulationValue: number; // Modulation value
  fillGradientRadialCorners: {
    topLeft: boolean;
    topRight: boolean;
    bottomLeft: boolean;
    bottomRight: boolean;
  }; // Which corners can be selected
  fillGradientRadialMidpoints: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  }; // Which midpoints can be selected
  fillGradientRadialSelectionMode: 'random' | 'cycle'; // How to select from enabled corners/midpoints
  fillGradientRadialShape: 'circle' | 'ellipse' | 'auto'; // Radial gradient shape
  fillGradientRadialCircleProbability: number; // 0-100% probability for circle shape
  fillGradientRadialEllipseProbability: number; // 0-100% probability for ellipse shape
  fillGradientMatchShape: boolean; // Whether gradient type should match shape type
  fillGradientTypeDirectionEnabled: boolean; // Whether the Gradient Type & Direction section overrides main gradient probabilities
  
  // Conic gradient controls
  fillGradientConicCenter: 'center' | 'corners' | 'midpoints' | 'coordinates'; // Conic center positioning (matching radial structure)
  fillGradientConicCorners: {
    topLeft: boolean;
    topRight: boolean;
    bottomLeft: boolean;
    bottomRight: boolean;
  }; // Which corners can be selected
  fillGradientConicMidpoints: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  }; // Which midpoints can be selected
  fillGradientConicSelectionMode: 'random' | 'cycle'; // How to select from enabled corners/midpoints
  
  // Conic Gradient Start Angle (0-360°)
  fillGradientConicAngleMode: 'fixed' | 'range' | 'incremental';
  fillGradientConicAngle: number; // Fixed mode value
  fillGradientConicAngleRange: [number, number]; // Range mode min/max
  fillGradientConicAngleStartValue: number; // Incremental mode start
  fillGradientConicAngleIncrement: number; // Incremental mode step
  fillGradientConicAngleModulationEnabled: boolean; // Enable modulation
  fillGradientConicAngleModulationValue: number; // Modulation value (wraps at this value)
  
  // Conic Gradient Center X (0-100% of shape bounds)
  fillGradientConicCenterXMode: 'fixed' | 'range' | 'incremental';
  fillGradientConicCenterX: number; // Fixed mode value
  fillGradientConicCenterXRange: [number, number]; // Range mode min/max
  fillGradientConicCenterXStartValue: number; // Incremental mode start
  fillGradientConicCenterXIncrement: number; // Incremental mode step
  fillGradientConicCenterXModulationEnabled: boolean; // Enable modulation
  fillGradientConicCenterXModulationValue: number; // Modulation value
  
  // Conic Gradient Center Y (0-100% of shape bounds)
  fillGradientConicCenterYMode: 'fixed' | 'range' | 'incremental';
  fillGradientConicCenterY: number; // Fixed mode value
  fillGradientConicCenterYRange: [number, number]; // Range mode min/max
  fillGradientConicCenterYStartValue: number; // Incremental mode start
  fillGradientConicCenterYIncrement: number; // Incremental mode step
  fillGradientConicCenterYModulationEnabled: boolean; // Enable modulation
  fillGradientConicCenterYModulationValue: number; // Modulation value
  gradientCenterIncrementalIndexDriver: IncrementalIndexDriver; // Index driver for gradient center incremental modes (radial/conic)
  
  // Fill Opacity Settings
  fillOpacityEnabled: boolean;
  fillOpacityMode: 'range' | 'define' | 'incremental';
  fillOpacityRange: [number, number]; // For range mode
  fillOpacityDefine: number; // For define mode
  fillOpacityStartValue: number; // For incremental mode
  fillOpacityIncrement: number; // For incremental mode
  fillOpacityModulationEnabled: boolean; // Enable modulation
  fillOpacityModulationValue: number; // Modulation value
  fillOpacityIncrementalIndexDriver: IncrementalIndexDriver; // Index driver for fill opacity incremental mode
  
  // Blur Properties
  blurEnabled: boolean;
  blurProbability: number; // 0-100%
  blurMode: 'range' | 'define' | 'incremental';
  blurRange: [number, number]; // For range mode (e.g., [2, 15])
  blurDefine: number; // For define mode (e.g., 8)
  blurStartValue: number; // For incremental mode
  blurIncrement: number; // For incremental mode
  blurModulationEnabled: boolean; // Enable modulation
  blurModulationValue: number; // Modulation value
  blurIncrementalIndexDriver: IncrementalIndexDriver; // Index driver for blur incremental mode
  
  // Drop Shadow Properties
  dropShadowEnabled: boolean;
  dropShadowProbability: number; // 0-100%
  dropShadowColorMode: 'auto' | 'custom'; // auto = derive from shape color
  dropShadowCustomColor: string; // Custom color when colorMode is 'custom'
  dropShadowColorDarken: number; // For auto mode - how much to darken (0-100%)
  dropShadowBlendMode: 'multiply' | 'darken' | 'overlay'; // Blend modes for shadows
  dropShadowOffsetXMode: 'range' | 'define' | 'incremental';
  dropShadowOffsetX: number; // Fixed value
  dropShadowOffsetXRange: [number, number]; // Range mode
  dropShadowOffsetXStartValue: number; // Incremental mode
  dropShadowOffsetXIncrement: number;
  dropShadowOffsetYMode: 'range' | 'define' | 'incremental';
  dropShadowOffsetY: number; // Fixed value
  dropShadowOffsetYRange: [number, number]; // Range mode
  dropShadowOffsetYStartValue: number; // Incremental mode
  dropShadowOffsetYIncrement: number;
  dropShadowBlurMode: 'range' | 'define' | 'incremental';
  dropShadowBlur: number; // Fixed value
  dropShadowBlurRange: [number, number]; // Range mode
  dropShadowBlurStartValue: number; // Incremental mode
  dropShadowBlurIncrement: number;
  dropShadowSpreadMode: 'range' | 'define' | 'incremental';
  dropShadowSpread: number; // Fixed value
  dropShadowSpreadRange: [number, number]; // Range mode
  dropShadowSpreadStartValue: number; // Incremental mode
  dropShadowSpreadIncrement: number;
  dropShadowOpacity: number; // 0-100%
  dropShadowIncrementalIndexDriver: IncrementalIndexDriver; // Index driver for all drop shadow incremental properties
  
  // Outer Glow Properties
  outerGlowEnabled: boolean;
  outerGlowProbability: number; // 0-100%
  outerGlowColorMode: 'auto' | 'custom'; // auto = derive from shape color
  outerGlowCustomColor: string; // Custom color when colorMode is 'custom'
  outerGlowColorSaturate: number; // For auto mode - boost saturation (0-100%)
  outerGlowBlendMode: 'screen' | 'add' | 'soft-light' | 'color-dodge' | 'lighter'; // Blend modes for glows
  outerGlowBlurMode: 'range' | 'define' | 'incremental';
  outerGlowBlur: number; // Fixed value
  outerGlowBlurRange: [number, number]; // Range mode
  outerGlowBlurStartValue: number; // Incremental mode
  outerGlowBlurIncrement: number;
  outerGlowSpreadMode: 'range' | 'define' | 'incremental';
  outerGlowSpread: number; // Fixed value
  outerGlowSpreadRange: [number, number]; // Range mode
  outerGlowSpreadStartValue: number; // Incremental mode
  outerGlowSpreadIncrement: number;
  outerGlowOpacity: number; // 0-100%
  outerGlowIncrementalIndexDriver: IncrementalIndexDriver; // Index driver for all outer glow incremental properties
  
  // Inner Shadow Properties
  innerShadowEnabled: boolean;
  innerShadowProbability: number; // 0-100%
  innerShadowColorMode: 'auto' | 'custom'; // auto = derive from shape color
  innerShadowCustomColor: string; // Custom color when colorMode is 'custom'
  innerShadowColorDarken: number; // For auto mode - how much to darken (0-100%)
  innerShadowBlendMode: 'multiply' | 'darken' | 'overlay'; // Blend modes for shadows
  innerShadowOffsetXMode: 'range' | 'define' | 'incremental';
  innerShadowOffsetX: number; // Fixed value
  innerShadowOffsetXRange: [number, number]; // Range mode
  innerShadowOffsetXStartValue: number; // Incremental mode
  innerShadowOffsetXIncrement: number;
  innerShadowOffsetYMode: 'range' | 'define' | 'incremental';
  innerShadowOffsetY: number; // Fixed value
  innerShadowOffsetYRange: [number, number]; // Range mode
  innerShadowOffsetYStartValue: number; // Incremental mode
  innerShadowOffsetYIncrement: number;
  innerShadowBlurMode: 'range' | 'define' | 'incremental';
  innerShadowBlur: number; // Fixed value
  innerShadowBlurRange: [number, number]; // Range mode
  innerShadowBlurStartValue: number; // Incremental mode
  innerShadowBlurIncrement: number;
  innerShadowOpacity: number; // 0-100%
  innerShadowIncrementalIndexDriver: IncrementalIndexDriver; // Index driver for all inner shadow incremental properties
  
  // Inner Glow Properties
  innerGlowEnabled: boolean;
  innerGlowProbability: number; // 0-100%
  innerGlowColorMode: 'auto' | 'custom'; // auto = derive from shape color
  innerGlowCustomColor: string; // Custom color when colorMode is 'custom'
  innerGlowColorSaturate: number; // For auto mode - boost saturation (0-100%)
  innerGlowBlendMode: 'screen' | 'add' | 'soft-light' | 'color-dodge' | 'lighter'; // Blend modes for glows
  innerGlowBlurMode: 'range' | 'define' | 'incremental';
  innerGlowBlur: number; // Fixed value
  innerGlowBlurRange: [number, number]; // Range mode
  innerGlowBlurStartValue: number; // Incremental mode
  innerGlowBlurIncrement: number;
  innerGlowSpreadMode: 'range' | 'define' | 'incremental';
  innerGlowSpread: number; // Fixed value
  innerGlowSpreadRange: [number, number]; // Range mode
  innerGlowSpreadStartValue: number; // Incremental mode
  innerGlowSpreadIncrement: number;
  innerGlowOpacity: number; // 0-100%
  innerGlowIncrementalIndexDriver: IncrementalIndexDriver; // Index driver for all inner glow incremental properties
  
  // Stroke Properties  
  strokeEnabled: boolean;
  strokeProbability: number; // 0-100%
  
  // Stroke Color Settings
  strokeColorMode: 'range' | 'palette' | 'define';
  strokeColorRange: [string, string]; // For range mode (HSL interpolation)
  strokeColorRangeFlip: boolean; // Toggle to flip color range direction (short vs long path around hue wheel)
  strokeColorPalette: string[]; // For palette mode
  strokeColorDefine: string; // For define mode
  // Additional HSL controls for range mode
  strokeColorSaturationRange: [number, number]; // 0-100% for range mode
  strokeColorLightnessRange: [number, number]; // 0-100% for range mode
  strokeColorEnabled: boolean; // Enable/disable stroke color configuration
  
  // Stroke Opacity Settings
  strokeOpacityEnabled: boolean;
  strokeOpacityMode: 'range' | 'define' | 'incremental';
  strokeOpacityRange: [number, number]; // For range mode
  strokeOpacityDefine: number; // For define mode
  strokeOpacityStartValue: number; // For incremental mode
  strokeOpacityIncrement: number; // For incremental mode
  strokeOpacityModulationEnabled: boolean; // Enable modulation
  strokeOpacityModulationValue: number; // Modulation value
  
  // Stroke Width Settings
  strokeWidthEnabled: boolean;
  strokeWidthMode: 'range' | 'define' | 'incremental';
  strokeWidthRange: [number, number];
  strokeWidthDefine: number; // For define mode
  strokeWidthStartValue: number; // For incremental mode
  strokeWidthIncrement: number; // For incremental mode
  strokeWidthModulationEnabled: boolean; // Enable modulation
  strokeWidthModulationValue: number; // Modulation value
  strokeIncrementalIndexDriver: IncrementalIndexDriver; // Index driver for stroke opacity/width incremental modes
  
  // Polygon Shape Properties
  polygonPropertiesEnabled: boolean;
  segmentCountMode: 'range' | 'define' | 'incremental';
  segmentCountRange: [number, number];
  segmentCountDefine: number;
  segmentCountStartValue: number;
  segmentCountIncrement: number;
  segmentCountModulationEnabled: boolean;
  segmentCountModulationValue: number;
  polygonIncrementalIndexDriver: IncrementalIndexDriver; // Index driver for polygon segment count incremental mode
  
  // Line Properties
  linePropertiesEnabled: boolean;
  pointCountMode: 'range' | 'define' | 'incremental';
  pointCountRange: [number, number];
  pointCountDefine: number;
  pointCountStartValue: number;
  pointCountIncrement: number;
  pointCountModulationEnabled: boolean;
  pointCountModulationValue: number;
  
  pointPositionMode: 'range' | 'define' | 'incremental';
  pointPositionRange: [number, number];
  pointPositionDefine: number;
  pointPositionStartValue: number;
  pointPositionIncrement: number;
  pointPositionModulationEnabled: boolean;
  pointPositionModulationValue: number;
  lineIncrementalIndexDriver: IncrementalIndexDriver; // Index driver for line point count/position incremental modes
  
  // Spline Curve Properties
  splinePropertiesEnabled: boolean;
  splinePointCountMode: 'range' | 'define' | 'incremental';
  splinePointCountRange: [number, number];
  splinePointCountDefine: number;
  splinePointCountStartValue: number;
  splinePointCountIncrement: number;
  splinePointCountModulationEnabled: boolean;
  splinePointCountModulationValue: number;
  
  splinePointPositionMode: 'range' | 'define' | 'incremental';
  splinePointPositionRange: [number, number];
  splinePointPositionDefine: number;
  splinePointPositionStartValue: number;
  splinePointPositionIncrement: number;
  splinePointPositionModulationEnabled: boolean;
  splinePointPositionModulationValue: number;
  
  splineControlPointMode: 'range' | 'define' | 'incremental';
  splineControlPointRange: [number, number];
  splineControlPointDefine: number;
  splineControlPointStartValue: number;
  splineControlPointIncrement: number;
  splineControlPointModulationEnabled: boolean;
  splineControlPointModulationValue: number;
  splineIncrementalIndexDriver: IncrementalIndexDriver; // Index driver for spline point/control incremental modes
  
  // Shape Transforms
  transformsEnabled: boolean;
  transformsArtboardAware: boolean; // Scale transform values relative to artboard dimensions
  translateXRange: [number, number];
  translateYRange: [number, number];
  scaleUniform: boolean;
  scaleRange: [number, number];
  scaleXRange: [number, number];
  scaleYRange: [number, number];
  rotationRange: [number, number];
  skewXRange: [number, number];
  skewYRange: [number, number];
  
  // Enhanced Transform Properties  
  // Position Enhanced Modes
  xTransformMode: 'range' | 'value' | 'incremental' | 'align';
  yTransformMode: 'range' | 'value' | 'incremental' | 'align';
  xTransformValue: number;
  yTransformValue: number;
  xTransformIncrement: number;
  yTransformIncrement: number;
  xTransformStartValue: number;
  yTransformStartValue: number;
  xTransformModulationEnabled: boolean;
  xTransformModulationValue: number;
  yTransformModulationEnabled: boolean;
  yTransformModulationValue: number;
  
  // Position Alignment (when mode is 'align')
  // X Alignment - Shape Anchor
  xShapeAnchorMode: 'predefined' | 'define';
  xShapeAnchorPredefined: 'left' | 'center' | 'right';
  xShapeAnchorDefine: number;
  // X Alignment - Artboard Anchor
  xArtboardAnchorMode: 'predefined' | 'define';
  xArtboardAnchorPredefined: 'left' | 'center' | 'right';
  xArtboardAnchorDefine: number;
  
  // Y Alignment - Shape Anchor
  yShapeAnchorMode: 'predefined' | 'define';
  yShapeAnchorPredefined: 'top' | 'center' | 'bottom';
  yShapeAnchorDefine: number;
  // Y Alignment - Artboard Anchor
  yArtboardAnchorMode: 'predefined' | 'define';
  yArtboardAnchorPredefined: 'top' | 'center' | 'bottom';
  yArtboardAnchorDefine: number;
  
  // Scale Enhanced Modes
  scaleXMode: 'range' | 'value' | 'incremental';
  scaleYMode: 'range' | 'value' | 'incremental';
  scaleXValue: number;
  scaleYValue: number;
  scaleXIncrement: number;
  scaleYIncrement: number;
  scaleXStartValue: number;
  scaleYStartValue: number;
  scaleXModulationEnabled: boolean;
  scaleXModulationValue: number;
  scaleYModulationEnabled: boolean;
  scaleYModulationValue: number;
  maintainScaleAspectRatio: boolean; // Link scale X and Y
  
  // Rotation Enhanced Mode
  rotationMode: 'range' | 'value' | 'incremental';
  rotationValue: number;
  rotationIncrement: number;
  rotationIncrementStep: number; // Step amount for rotation increment slider (1-90)
  rotationStartValue: number; // Starting rotation value for incremental mode
  rotationModulation: number; // Modulation value (e.g., 360 for full circle reset)
  rotationModulationEnabled: boolean; // Toggle to enable/disable modulation
  setTransformIncrementalIndexDriver: IncrementalIndexDriver; // Index driver for set transform incremental modes (position, scale, rotation)
  
  // Transform Randomization Scaling (0-100%)
  scaleRandomizationScale: number; // Scale for scale randomization  
  rotationRandomizationScale: number; // Scale for rotation randomization
  widthRandomizationScale: number; // Scale for width randomization in range mode
  heightRandomizationScale: number; // Scale for height randomization in range mode
  
  // Transform Origin
  transformOriginMode: 'define' | 'predefined-artboard' | 'current-shape' | 'shape-reference';
  
  // Define mode sub-modes
  transformOriginDefineMode: 'fixed' | 'range' | 'incremental';
  transformOriginX: number; // Fixed mode X value
  transformOriginY: number; // Fixed mode Y value
  
  // Range mode
  transformOriginXMin: number;
  transformOriginXMax: number;
  transformOriginYMin: number;
  transformOriginYMax: number;
  
  // Incremental mode
  transformOriginXStartValue: number;
  transformOriginXIncrement: number;
  transformOriginXModulationEnabled: boolean;
  transformOriginXModulationValue: number;
  transformOriginYStartValue: number;
  transformOriginYIncrement: number;
  transformOriginYModulationEnabled: boolean;
  transformOriginYModulationValue: number;
  transformOriginIncrementalIndexDriver: IncrementalIndexDriver; // Index driver for transform origin incremental mode
  
  // Predefined anchor points (for predefined-artboard and current-shape modes)
  transformOriginPredefined: 'center' | 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  
  // Shape reference mode
  transformOriginShapeReference: 'current' | 'previous' | 'next' | 'specific';
  transformOriginShapeIndex: number; // Used when shapeReference is 'specific'
  transformOriginShapeAnchor: 'center' | 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  
  // Shape Effects
  shapeEffectsEnabled: boolean;
  
  // Echo/Motion Trails (Project A: Set-Level)
  echoSpread: EchoSpreadConfig;
  
  // Color Harmony
  colorHarmonyEnabled: boolean;
  harmonyType: 'monochromatic' | 'analogous' | 'complementary' | 'triadic' | 'split-complementary' | 'tetradic';
  baseColor: string;
  hueVariance: number;
  saturationRange: [number, number];
  lightnessRange: [number, number];
  
  // Harmony-specific settings
  monochromaticSettings: {
    lightnessSteps: number;
    saturationSteps: number;
    includeNeutrals: boolean;
  };
  analogousSettings: {
    hueRange: number;
    colorCount: number;
  };
  complementarySettings: {
    includeNearComplements: boolean;
    complementOffset: number;
  };
  triadicSettings: {
    rotationOffset: number;
    useEqualSpacing: boolean;
  };
  splitComplementarySettings: {
    splitAngle: number;
    balanceWeights: boolean;
  };
  tetradicSettings: {
    squareHarmony: boolean;
    rectangleRatio: number;
  };
  
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
  
  // Temporal Variation (DISABLED - Future Feature)
  temporalEnabled: false; // Always disabled for now
  evolutionMode: 'none'; // Always none for now
  seedIncrement: number;
  evolutionTargets: {
    position: boolean;
    rotation: boolean;
    scale: boolean;
    color: boolean;
    opacity: boolean;
  };
}

// Default settings for BatchConfigSettings (moved from client)
export const defaultBatchConfigSettings: BatchConfigSettings = {
  selectedPreset: 'custom',
  
  distributionLayoutEnabled: false,
  distributionPattern: 'grid',
  gridRows: 3,
  gridColumns: 3,
  gridStartX: 0,
  gridStartY: 0,
  gridSpacingXMode: 'define',
  gridSpacingYMode: 'define',
  gridRowOffset: 120,
  gridColumnOffset: 120,
  gridMarginEnabled: false,
  gridMarginValue: 50,
  gridSortBy: 'none',
  gridSortScope: 'per-generation',
  gridSortOrder: 'ascending',
  gridGroupByShapeType: false,
  gridReverseGroups: false,
  gridXRandomization: 0,
  gridYRandomization: 0,
  
  // Grid alternating/pattern offsets
  gridOffsets: DEFAULT_GRID_OFFSETS,
  
  // Shape masking for grid positions
  shapeMasking: DEFAULT_SHAPE_MASKING,
  
  // Cell constraints for cell-based rendering
  cellConstraints: DEFAULT_CELL_CONSTRAINTS,
  
  waveType: 'sine',
  waveAmplitude: 50,
  waveFrequency: 2,
  waveDirection: 'horizontal',
  wavePhaseOffset: 0,
  
  ellipseXRadius: [80, 120],
  ellipseYRadius: [80, 120],
  ellipseRingCount: 1,
  ellipseRingSpacing: 'even',
  ellipseRotation: 0,
  ellipseRotationAlignment: 'uniform',
  ellipseAlignToRing: false,
  ellipseFlipInward: false,
  ellipseAdditionalRotation: 0,
  ellipseShapeRotationMode: 'none',
  ellipseRotationFixed: 0,
  ellipseRotationRange: [0, 360],
  ellipseRotationIncrementalStart: 0,
  ellipseRotationIncrementalStep: 10,
  
  spiralTurnCount: 3,
  spiralSpacingMode: 'linear',
  spiralDirection: 'clockwise',
  spiralStartAngle: 0,
  spiralTightness: 1.0,
  
  tangentAlignment: false,
  segmentDistribution: 'even',
  reverseDirection: false,
  
  // Generation Count Controls
  generationCountMode: 'range',
  generationCountDefine: 5,
  generationCountStartValue: 1,
  generationCountIncrement: 1,
  generationCountResetPerBatch: true,
  generationCountModulationEnabled: false,
  generationCountModulationValue: 3,
  
  blendModeEnabled: false,
  enabledBlendModes: { 'source-over': 100 },
  
  compositingOperationsEnabled: false,
  enabledCompositingOperations: {},
  
  propertiesEnabled: false,
  
  // Shape Properties
  shapePropertiesEnabled: false,
  shapePropertiesDimensionsEnabled: true,
  shapePropertiesPositionEnabled: true,
  widthRange: [50, 200],
  heightRange: [50, 200],
  xPositionRange: [-100, 100],
  yPositionRange: [-100, 100],
  
  // Enhanced Width and Height Properties
  widthMode: 'range',
  heightMode: 'range',
  
  // Width/Height Mode Toggles
  sizeIncrementalResetPerBatch: true, // Default: reset count per batch
  
  // Size Constraint Mode
  sizeConstraintMode: 'none', // Default: independent width/height (no constraint)
  
  // Width/Height Value Mode
  widthValue: 100,
  heightValue: 100,
  
  // Width/Height Incremental Mode
  widthIncrement: 10,
  heightIncrement: 10,
  widthStartValue: 50,
  heightStartValue: 50,
  widthModulationEnabled: false,
  widthModulationValue: 500,
  heightModulationEnabled: false,
  heightModulationValue: 500,
  sizeIncrementalIndexDriver: 'shapeIndex', // Default: use shape index for size incremental
  
  // Size Constraints
  minimumSize: 10, // Minimum size to prevent invisible shapes
  maximumSize: 500, // Maximum size constraint
  
  // Enhanced Position Properties
  xPositionMode: 'range',
  yPositionMode: 'range',
  
  // Position Mode Toggles
  incrementalResetPerBatch: true, // Default: reset count per batch
  directionalEvenDistribution: true, // Default: even 360° distribution
  directionalClusterAngle: 30, // Default clustering angle
  
  // Position Value Mode
  xPositionValue: 0,
  yPositionValue: 0,
  
  // Position Directional Mode
  positionDirectionalMode: 'outward-center',
  positionDirectionalAngle: 0,
  positionDirectionalDistance: 100,
  
  // Position Incremental Mode
  xPositionIncrement: 50,
  yPositionIncrement: 50,
  xPositionStartValue: 0,
  yPositionStartValue: 0,
  xPositionModulationMode: 'off',
  xPositionModulationValue: 200,
  yPositionModulationMode: 'off',
  yPositionModulationValue: 200,
  positionIncrementalIndexDriver: 'shapeIndex', // Default: use shape index for position incremental
  
  // Rectangle-specific Properties
  rectangleCornerRadiusMode: 'range',
  rectangleCornerRadiusRange: [0, 20],
  rectangleCornerRadiusDefine: 10,
  rectangleCornerRadiusStartValue: 0,
  rectangleCornerRadiusIncrement: 2,
  rectangleCornerRadiusModulationEnabled: false,
  rectangleCornerRadiusModulationValue: 50,
  rectangleCornerRadiusIncrementalIndexDriver: 'shapeIndex', // Default: use shape index
  
  // Star-specific Properties
  starInnerRadiusMode: 'range',
  starInnerRadiusRange: [0.3, 0.7],
  starInnerRadiusDefine: 0.5,
  starInnerRadiusStartValue: 0.3,
  starInnerRadiusIncrement: 0.05,
  starInnerRadiusModulationEnabled: false,
  starInnerRadiusModulationValue: 1.0,
  starInnerRadiusIncrementalIndexDriver: 'shapeIndex', // Default: use shape index
  
  // Ring-specific Properties
  ringInnerRadiusMode: 'range',
  ringInnerRadiusRange: [0.4, 0.8],
  ringInnerRadiusDefine: 0.6,
  ringInnerRadiusStartValue: 0.4,
  ringInnerRadiusIncrement: 0.05,
  ringInnerRadiusModulationEnabled: false,
  ringInnerRadiusModulationValue: 1.0,
  ringInnerRadiusIncrementalIndexDriver: 'shapeIndex', // Default: use shape index
  
  // Fill Properties
  fillEnabled: true,
  fillSolidEnabled: true, // Solid fill section enabled by default
  fillStyleProbability: 60, // 60% solid fill, 40% gradient fill
  
  // Fill Color Settings
  fillColorMode: 'range',
  fillColorRange: ['#3b82f6', '#8b5cf6'],
  fillColorRangeFlip: false,
  fillColorPalette: ['#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b'],
  fillColorDefine: '#3b82f6',
  // HSL range controls for range mode
  fillColorSaturationRange: [50, 100],
  fillColorLightnessRange: [30, 70],
  
  // Fill Gradient Settings
  fillGradientEnabled: true,
  // Individual gradient type probabilities
  fillGradientLinearProbability: 50, // 50% of gradients are linear
  fillGradientRadialProbability: 40, // 40% of gradients are radial
  fillGradientConicProbability: 10,  // 10% of gradients are conic
  fillGradientColorMode: 'range',
  fillGradientColorRange: ['#3b82f6', '#8b5cf6'],
  fillGradientColorRangeFlip: false,
  fillGradientColorPalette: ['#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b'],
  fillGradientColorDefine: ['#3b82f6', '#8b5cf6', '#ef4444'],
  // HSL range controls for range mode
  fillGradientColorSaturationRange: [40, 90],
  fillGradientColorLightnessRange: [20, 80],
  fillGradientStopsMode: 'range',
  fillGradientStopsCount: 3,
  fillGradientStopsRange: [2, 4],
  fillGradientStopDistribution: 'even',
  fillGradientStopsReverse: false,
  
  // Enhanced Gradient Type & Direction Controls
  fillGradientLinearDirection: 'range', // Default to range control
  fillGradientLinearAngle: 45, // Default fixed angle (diagonal)
  fillGradientLinearAngleRange: [0, 360], // Default full angle range
  fillGradientLinearPredefined: 'diagonal-down', // Default predefined direction
  fillGradientLinearAlignToShape: false, // Default: don't align to shape
  fillGradientRadialCenter: 'center', // Default center positioning
  
  // Radial Gradient Center X
  fillGradientRadialCenterXMode: 'fixed',
  fillGradientRadialCenterX: 50,
  fillGradientRadialCenterXRange: [25, 75],
  fillGradientRadialCenterXStartValue: 50,
  fillGradientRadialCenterXIncrement: 10,
  fillGradientRadialCenterXModulationEnabled: false,
  fillGradientRadialCenterXModulationValue: 100,
  
  // Radial Gradient Center Y
  fillGradientRadialCenterYMode: 'fixed',
  fillGradientRadialCenterY: 50,
  fillGradientRadialCenterYRange: [25, 75],
  fillGradientRadialCenterYStartValue: 50,
  fillGradientRadialCenterYIncrement: 10,
  fillGradientRadialCenterYModulationEnabled: false,
  fillGradientRadialCenterYModulationValue: 100,
  
  fillGradientRadialCorners: {
    topLeft: true,
    topRight: true,
    bottomLeft: true,
    bottomRight: true,
  }, // All corners enabled by default
  fillGradientRadialMidpoints: {
    top: true,
    right: true,
    bottom: true,
    left: true,
  }, // All midpoints enabled by default
  fillGradientRadialSelectionMode: 'random', // Default to random selection
  fillGradientRadialShape: 'auto', // Auto-determine based on shape
  fillGradientRadialCircleProbability: 60, // 60% circle probability
  fillGradientRadialEllipseProbability: 40, // 40% ellipse probability
  fillGradientMatchShape: false, // Default: don't match shape type
  fillGradientTypeDirectionEnabled: false, // Default: disabled - use main gradient probabilities
  
  // Conic gradient controls
  fillGradientConicCenter: 'center', // Default center positioning (matching radial)
  fillGradientConicCorners: {
    topLeft: true,
    topRight: true,
    bottomLeft: true,
    bottomRight: true,
  }, // All corners enabled by default
  fillGradientConicMidpoints: {
    top: true,
    right: true,
    bottom: true,
    left: true,
  }, // All midpoints enabled by default
  fillGradientConicSelectionMode: 'random', // Default to random selection
  
  // Conic Gradient Start Angle
  fillGradientConicAngleMode: 'fixed',
  fillGradientConicAngle: 0,
  fillGradientConicAngleRange: [0, 360],
  fillGradientConicAngleStartValue: 0,
  fillGradientConicAngleIncrement: 30,
  fillGradientConicAngleModulationEnabled: false,
  fillGradientConicAngleModulationValue: 360,
  
  // Conic Gradient Center X
  fillGradientConicCenterXMode: 'fixed',
  fillGradientConicCenterX: 50,
  fillGradientConicCenterXRange: [25, 75],
  fillGradientConicCenterXStartValue: 50,
  fillGradientConicCenterXIncrement: 10,
  fillGradientConicCenterXModulationEnabled: false,
  fillGradientConicCenterXModulationValue: 100,
  
  // Conic Gradient Center Y
  fillGradientConicCenterYMode: 'fixed',
  fillGradientConicCenterY: 50,
  fillGradientConicCenterYRange: [25, 75],
  fillGradientConicCenterYStartValue: 50,
  fillGradientConicCenterYIncrement: 10,
  fillGradientConicCenterYModulationEnabled: false,
  fillGradientConicCenterYModulationValue: 100,
  gradientCenterIncrementalIndexDriver: 'shapeIndex', // Default: use shape index for gradient center incremental
  
  // Fill Opacity Settings
  fillOpacityEnabled: true,
  fillOpacityMode: 'range',
  fillOpacityRange: [70, 100],
  fillOpacityDefine: 80,
  fillOpacityStartValue: 70,
  fillOpacityIncrement: 5,
  fillOpacityModulationEnabled: false,
  fillOpacityModulationValue: 100,
  fillOpacityIncrementalIndexDriver: 'shapeIndex', // Default: use shape index for fill opacity incremental
  
  // Blur Properties
  blurEnabled: false,
  blurProbability: 50,
  blurMode: 'range',
  blurRange: [2, 15],
  blurDefine: 8,
  blurStartValue: 2,
  blurIncrement: 1,
  blurModulationEnabled: false,
  blurModulationValue: 20,
  blurIncrementalIndexDriver: 'shapeIndex', // Default: use shape index for blur incremental
  
  // Drop Shadow Properties
  dropShadowEnabled: false,
  dropShadowProbability: 100,
  dropShadowColorMode: 'auto',
  dropShadowCustomColor: '#000000',
  dropShadowColorDarken: 50,
  dropShadowBlendMode: 'multiply',
  dropShadowOffsetXMode: 'define',
  dropShadowOffsetX: 4,
  dropShadowOffsetXRange: [2, 8],
  dropShadowOffsetXStartValue: 2,
  dropShadowOffsetXIncrement: 1,
  dropShadowOffsetYMode: 'define',
  dropShadowOffsetY: 4,
  dropShadowOffsetYRange: [2, 8],
  dropShadowOffsetYStartValue: 2,
  dropShadowOffsetYIncrement: 1,
  dropShadowBlurMode: 'define',
  dropShadowBlur: 6,
  dropShadowBlurRange: [2, 12],
  dropShadowBlurStartValue: 2,
  dropShadowBlurIncrement: 1,
  dropShadowSpreadMode: 'define',
  dropShadowSpread: 0,
  dropShadowSpreadRange: [0, 10],
  dropShadowSpreadStartValue: 0,
  dropShadowSpreadIncrement: 1,
  dropShadowOpacity: 50,
  dropShadowIncrementalIndexDriver: 'shapeIndex', // Default: use shape index for drop shadow incremental
  
  // Outer Glow Properties
  outerGlowEnabled: false,
  outerGlowProbability: 100,
  outerGlowColorMode: 'auto',
  outerGlowCustomColor: '#ffffff',
  outerGlowColorSaturate: 20,
  outerGlowBlendMode: 'screen',
  outerGlowBlurMode: 'define',
  outerGlowBlur: 10,
  outerGlowBlurRange: [5, 20],
  outerGlowBlurStartValue: 5,
  outerGlowBlurIncrement: 2,
  outerGlowSpreadMode: 'define',
  outerGlowSpread: 0,
  outerGlowSpreadRange: [0, 10],
  outerGlowSpreadStartValue: 0,
  outerGlowSpreadIncrement: 1,
  outerGlowOpacity: 75,
  outerGlowIncrementalIndexDriver: 'shapeIndex', // Default: use shape index for outer glow incremental
  
  // Inner Shadow Properties
  innerShadowEnabled: false,
  innerShadowProbability: 100,
  innerShadowColorMode: 'auto',
  innerShadowCustomColor: '#000000',
  innerShadowColorDarken: 50,
  innerShadowBlendMode: 'multiply',
  innerShadowOffsetXMode: 'define',
  innerShadowOffsetX: 2,
  innerShadowOffsetXRange: [1, 5],
  innerShadowOffsetXStartValue: 1,
  innerShadowOffsetXIncrement: 1,
  innerShadowOffsetYMode: 'define',
  innerShadowOffsetY: 2,
  innerShadowOffsetYRange: [1, 5],
  innerShadowOffsetYStartValue: 1,
  innerShadowOffsetYIncrement: 1,
  innerShadowBlurMode: 'define',
  innerShadowBlur: 4,
  innerShadowBlurRange: [2, 8],
  innerShadowBlurStartValue: 2,
  innerShadowBlurIncrement: 1,
  innerShadowOpacity: 50,
  innerShadowIncrementalIndexDriver: 'shapeIndex', // Default: use shape index for inner shadow incremental
  
  // Inner Glow Properties
  innerGlowEnabled: false,
  innerGlowProbability: 100,
  innerGlowColorMode: 'auto',
  innerGlowCustomColor: '#ffffff',
  innerGlowColorSaturate: 20,
  innerGlowBlendMode: 'screen',
  innerGlowBlurMode: 'define',
  innerGlowBlur: 8,
  innerGlowBlurRange: [4, 16],
  innerGlowBlurStartValue: 4,
  innerGlowBlurIncrement: 2,
  innerGlowSpreadMode: 'define',
  innerGlowSpread: 0,
  innerGlowSpreadRange: [0, 8],
  innerGlowSpreadStartValue: 0,
  innerGlowSpreadIncrement: 1,
  innerGlowOpacity: 75,
  innerGlowIncrementalIndexDriver: 'shapeIndex', // Default: use shape index for inner glow incremental
  
  // Stroke Properties
  strokeEnabled: true,
  strokeProbability: 60,
  
  // Stroke Color Settings
  strokeColorMode: 'range',
  strokeColorRange: ['#ef4444', '#f59e0b'],
  strokeColorRangeFlip: false,
  strokeColorPalette: ['#ef4444', '#f59e0b', '#8b5cf6', '#10b981', '#3b82f6'],
  strokeColorDefine: '#ef4444',
  // HSL range controls for range mode
  strokeColorSaturationRange: [60, 100],
  strokeColorLightnessRange: [20, 60],
  strokeColorEnabled: true,
  
  // Stroke Opacity Settings
  strokeOpacityEnabled: true,
  strokeOpacityMode: 'range',
  strokeOpacityRange: [40, 100],
  strokeOpacityDefine: 80,
  strokeOpacityStartValue: 40,
  strokeOpacityIncrement: 10,
  strokeOpacityModulationEnabled: false,
  strokeOpacityModulationValue: 100,
  
  // Stroke Width Settings
  strokeWidthEnabled: true,
  strokeWidthMode: 'range',
  strokeWidthRange: [1, 5],
  strokeWidthDefine: 3,
  strokeWidthStartValue: 1,
  strokeWidthIncrement: 0.5,
  strokeWidthModulationEnabled: false,
  strokeWidthModulationValue: 10,
  strokeIncrementalIndexDriver: 'shapeIndex', // Default: use shape index for stroke incremental
  
  // Polygon Shape Properties
  polygonPropertiesEnabled: false,
  segmentCountMode: 'range',
  segmentCountRange: [3, 12],
  segmentCountDefine: 6,
  segmentCountStartValue: 3,
  segmentCountIncrement: 1,
  segmentCountModulationEnabled: false,
  segmentCountModulationValue: 20,
  polygonIncrementalIndexDriver: 'shapeIndex', // Default: use shape index for polygon incremental
  
  // Line Properties
  linePropertiesEnabled: false,
  pointCountMode: 'range',
  pointCountRange: [3, 8],
  pointCountDefine: 4,
  pointCountStartValue: 3,
  pointCountIncrement: 1,
  pointCountModulationEnabled: false,
  pointCountModulationValue: 15,
  
  pointPositionMode: 'range',
  pointPositionRange: [-50, 50],
  pointPositionDefine: 0,
  pointPositionStartValue: -50,
  pointPositionIncrement: 10,
  pointPositionModulationEnabled: false,
  pointPositionModulationValue: 200,
  lineIncrementalIndexDriver: 'shapeIndex', // Default: use shape index for line incremental
  
  // Spline Curve Properties
  splinePropertiesEnabled: false,
  splinePointCountMode: 'range',
  splinePointCountRange: [3, 6],
  splinePointCountDefine: 4,
  splinePointCountStartValue: 3,
  splinePointCountIncrement: 1,
  splinePointCountModulationEnabled: false,
  splinePointCountModulationValue: 10,
  
  splinePointPositionMode: 'range',
  splinePointPositionRange: [-50, 50],
  splinePointPositionDefine: 0,
  splinePointPositionStartValue: -50,
  splinePointPositionIncrement: 10,
  splinePointPositionModulationEnabled: false,
  splinePointPositionModulationValue: 200,
  
  splineControlPointMode: 'range',
  splineControlPointRange: [-25, 25],
  splineControlPointDefine: 0,
  splineControlPointStartValue: -25,
  splineControlPointIncrement: 5,
  splineControlPointModulationEnabled: false,
  splineControlPointModulationValue: 100,
  splineIncrementalIndexDriver: 'shapeIndex', // Default: use shape index for spline incremental
  
  // Shape Transforms
  transformsEnabled: false,
  transformsArtboardAware: false, // When enabled, translate ranges dynamically match artboard bounds
  translateXRange: [-50, 50],
  translateYRange: [-50, 50],
  scaleUniform: true,
  scaleRange: [50, 200],
  scaleXRange: [50, 200],
  scaleYRange: [50, 200],
  rotationRange: [0, 360],
  skewXRange: [0, 0],
  skewYRange: [0, 0],
  
  // Enhanced Transform Properties
  // Position Enhanced Modes
  xTransformMode: 'range',
  yTransformMode: 'range',
  xTransformValue: 0,
  yTransformValue: 0,
  xTransformIncrement: 10,
  yTransformIncrement: 10,
  xTransformStartValue: 0,
  yTransformStartValue: 0,
  xTransformModulationEnabled: false,
  xTransformModulationValue: 100,
  yTransformModulationEnabled: false,
  yTransformModulationValue: 100,
  
  // Position Alignment (when mode is 'align')
  xShapeAnchorMode: 'predefined',
  xShapeAnchorPredefined: 'center',
  xShapeAnchorDefine: 0,
  xArtboardAnchorMode: 'predefined',
  xArtboardAnchorPredefined: 'center',
  xArtboardAnchorDefine: 0,
  
  yShapeAnchorMode: 'predefined',
  yShapeAnchorPredefined: 'center',
  yShapeAnchorDefine: 0,
  yArtboardAnchorMode: 'predefined',
  yArtboardAnchorPredefined: 'center',
  yArtboardAnchorDefine: 0,
  
  // Scale Enhanced Modes
  scaleXMode: 'range',
  scaleYMode: 'range',
  scaleXValue: 100,
  scaleYValue: 100,
  scaleXIncrement: 10,
  scaleYIncrement: 10,
  scaleXStartValue: 100,
  scaleYStartValue: 100,
  scaleXModulationEnabled: false,
  scaleXModulationValue: 200,
  scaleYModulationEnabled: false,
  scaleYModulationValue: 200,
  maintainScaleAspectRatio: true,
  
  // Rotation Enhanced Mode
  rotationMode: 'range',
  rotationValue: 0,
  rotationIncrement: 15,
  rotationIncrementStep: 15,
  rotationStartValue: 0,
  rotationModulation: 360,
  rotationModulationEnabled: false,
  setTransformIncrementalIndexDriver: 'shapeIndex', // Default: use shape index for set transform incremental
  
  // Transform Randomization Scaling (0-100%)
  scaleRandomizationScale: 50,
  rotationRandomizationScale: 50,
  widthRandomizationScale: 100,
  heightRandomizationScale: 100,
  
  // Transform Origin
  transformOriginMode: 'predefined-artboard',
  
  // Define mode sub-modes
  transformOriginDefineMode: 'fixed',
  transformOriginX: 0,
  transformOriginY: 0,
  
  // Range mode
  transformOriginXMin: -100,
  transformOriginXMax: 100,
  transformOriginYMin: -100,
  transformOriginYMax: 100,
  
  // Incremental mode
  transformOriginXStartValue: 0,
  transformOriginXIncrement: 10,
  transformOriginXModulationEnabled: false,
  transformOriginXModulationValue: 100,
  transformOriginYStartValue: 0,
  transformOriginYIncrement: 10,
  transformOriginYModulationEnabled: false,
  transformOriginYModulationValue: 100,
  transformOriginIncrementalIndexDriver: 'shapeIndex', // Default: use shape index for transform origin incremental
  
  // Predefined anchor points
  transformOriginPredefined: 'center',
  
  // Shape reference mode
  transformOriginShapeReference: 'current',
  transformOriginShapeIndex: 0,
  transformOriginShapeAnchor: 'center',
  
  // Shape Effects
  shapeEffectsEnabled: false,
  
  // Echo/Motion Trails
  echoSpread: DEFAULT_ECHO_SPREAD_CONFIG,
  
  colorHarmonyEnabled: false,
  harmonyType: 'complementary',
  baseColor: '#3b82f6',
  hueVariance: 15,
  saturationRange: [0, 100],
  lightnessRange: [0, 100],
  
  // Harmony-specific defaults
  monochromaticSettings: {
    lightnessSteps: 5,
    saturationSteps: 3,
    includeNeutrals: true,
  },
  analogousSettings: {
    hueRange: 60,
    colorCount: 3,
  },
  complementarySettings: {
    includeNearComplements: false,
    complementOffset: 0,
  },
  triadicSettings: {
    rotationOffset: 0,
    useEqualSpacing: true,
  },
  splitComplementarySettings: {
    splitAngle: 30,
    balanceWeights: true,
  },
  tetradicSettings: {
    squareHarmony: true,
    rectangleRatio: 60,
  },
  
  physicsEnabled: false,
  physicsType: 'none',
  gravityDirection: 270,
  gravityStrength: 50,
  magneticType: 'attraction',
  magneticStrength: 50,
  collisionDistance: 20,
  collisionBounce: 0.5,
  simulationSteps: 100,
  
  temporalEnabled: false, // Always false (disabled)
  evolutionMode: 'none', // Always none (disabled)
  seedIncrement: 1,
  evolutionTargets: {
    position: false,
    rotation: false,
    scale: false,
    color: false,
    opacity: false
  }
};

// ===== GENERATION SETS DATA STRUCTURES =====

// Mode enumeration for generation sets
export enum GenerationSetMode {
  SINGLE = "single",
  MULTI = "multi"
}

// Shape count mode for individual generation sets
export enum ShapeCountMode {
  FIXED = "fixed",
  RANGE = "range"
}

// Z-index management for layering
export interface ZIndexConfig {
  baseOffset: number;           // Base z-index offset for this generation set
  incrementPerShape: number;    // Z-index increment between shapes within set
  incrementPerGeneration: number; // Z-index increment between generation sets
}

// Updated shape types to match client ShapeType from lib/shapeTypes.ts (complete coverage)
export type SupportedShapeType = 
  | 'rectangle' 
  | 'rounded-rectangle'
  | 'square' 
  | 'rounded-square'
  | 'circle' 
  | 'ellipse' 
  | 'triangle'
  | 'right-triangle'
  | 'trapezoid'
  | 'pentagon'
  | 'hexagon'
  | 'rhombus'
  | 'parallelogram'
  | 'kite'
  | 'semicircle'
  | 'heart'
  | 'arrow'
  | 'cross'
  | 'line' 
  | 'line-vector'
  | 'polygon' 
  | 'star' 
  | 'chunk' 
  | 'blob'
  | 'ring'
  | 'cubic'
  | 'bezier'
  | 'smooth-spline'
  | 'spline-circle'
  | 'spline-ellipse'
  | 'spline-ring';

// Shape-specific properties for different shape types (complete coverage)
export interface ShapeSpecificProperties {
  // Rectangle properties
  rectangle?: {
    // Standard rectangle has no special properties
  };
  
  // Rounded rectangle properties  
  'rounded-rectangle'?: {
    cornerRadiusRange?: [number, number];
    cornerRadiusMode?: 'range' | 'fixed';
    cornerRadiusValue?: number;
  };
  
  // Square properties
  square?: {
    // Standard square has no special properties
  };
  
  // Rounded square properties
  'rounded-square'?: {
    cornerRadiusRange?: [number, number];
    cornerRadiusMode?: 'range' | 'fixed';
    cornerRadiusValue?: number;
  };
  
  // Circle and ellipse properties
  circle?: {
    segmentCountRange?: [number, number];
    segmentCountMode?: 'range' | 'fixed';
    segmentCountValue?: number;
  };
  ellipse?: {
    segmentCountRange?: [number, number];
    segmentCountMode?: 'range' | 'fixed';
    segmentCountValue?: number;
  };
  
  // Geometric shape properties
  triangle?: {
    // Standard triangle has no special properties
  };
  'right-triangle'?: {
    // Standard right triangle has no special properties
  };
  trapezoid?: {
    // Standard trapezoid has no special properties
  };
  pentagon?: {
    // Standard pentagon has no special properties
  };
  hexagon?: {
    // Standard hexagon has no special properties
  };
  rhombus?: {
    // Standard rhombus has no special properties
  };
  parallelogram?: {
    // Standard parallelogram has no special properties
  };
  kite?: {
    // Standard kite has no special properties
  };
  semicircle?: {
    // Standard semicircle has no special properties
  };
  heart?: {
    // Standard heart has no special properties
  };
  arrow?: {
    // Standard arrow has no special properties
  };
  cross?: {
    // Standard cross has no special properties
  };
  
  // Polygon properties
  polygon?: {
    pointCountRange?: [number, number];
    pointCountMode?: 'range' | 'fixed';
    pointCountValue?: number;
  };
  
  // Star properties
  star?: {
    pointCountRange?: [number, number];
    pointCountMode?: 'range' | 'fixed';
    pointCountValue?: number;
    innerRadiusRange?: [number, number];
    innerRadiusMode?: 'range' | 'fixed';
    innerRadiusValue?: number;
  };
  
  // Ring properties
  ring?: {
    innerRadiusRange?: [number, number];
    innerRadiusMode?: 'range' | 'fixed';
    innerRadiusValue?: number;
  };
  
  // Line properties
  line?: {
    pointCountRange?: [number, number];
    pointCountMode?: 'range' | 'fixed';
    pointCountValue?: number;
    strokeCapProbabilities?: {
      round: number;
      square: number;
      butt: number;
    };
  };
  
  // Line vector properties
  'line-vector'?: {
    directionMode?: 'range' | 'fixed' | 'incremental';
    directionRange?: [number, number]; // For range mode (0-360 degrees)
    directionValue?: number; // For fixed mode
    directionStartValue?: number; // For incremental mode
    directionIncrement?: number; // For incremental mode
    
    lengthMode?: 'range' | 'fixed' | 'incremental';
    lengthRange?: [number, number]; // For range mode (5-500)
    lengthValue?: number; // For fixed mode
    lengthStartValue?: number; // For incremental mode
    lengthIncrement?: number; // For incremental mode
    
    centroidMode?: 'range' | 'fixed' | 'incremental';
    centroidRange?: [number, number]; // For range mode (0-1)
    centroidValue?: number; // For fixed mode
    centroidStartValue?: number; // For incremental mode
    centroidIncrement?: number; // For incremental mode
    
    strokeCapProbabilities?: {
      round: number;
      square: number;
      butt: number;
    };
  };
  
  // Bezier curve properties
  bezier?: {
    pointCountRange?: [number, number];
    pointCountMode?: 'range' | 'fixed';
    pointCountValue?: number;
    openProbability?: number;
    strokeCapProbabilities?: {
      round: number;
      square: number;
      butt: number;
    };
  };
  
  // Cubic curve properties
  cubic?: {
    pointCountRange?: [number, number];
    pointCountMode?: 'range' | 'fixed';
    pointCountValue?: number;
    openProbability?: number;
    curvatureRange?: [number, number];
    spreadRange?: [number, number];
    patternType?: number;
  };
  
  // Smooth spline properties
  'smooth-spline'?: {
    pointCountRange?: [number, number];
    pointCountMode?: 'range' | 'fixed';
    pointCountValue?: number;
    openProbability?: number;
    strokeCapProbabilities?: {
      round: number;
      square: number;
      butt: number;
    };
  };
  
  // Advanced shapes
  chunk?: {
    // Chunk has no special properties
  };
  blob?: {
    // Blob has no special properties
  };
  
  // Spline shapes
  'spline-circle'?: {
    // Spline-circle has no configurable properties
  };
  'spline-ellipse'?: {
    // Spline-ellipse has no configurable properties
  };
  'spline-ring'?: {
    innerRadiusRange?: [number, number];
    innerRadiusMode?: 'range' | 'fixed';
    innerRadiusValue?: number;
  };
}

// Individual generation set configuration
export interface GenerationSet {
  id: string;                           // Unique identifier for the set
  name: string;                         // Display name for the set
  enabled: boolean;                     // Whether this set is active
  
  // Shape types enabled for this generation set (JSON-serializable array)
  enabledShapeTypes: SupportedShapeType[]; // e.g., ['rectangle', 'circle', 'polygon']
  
  // Shape count configuration
  shapeCountMode: ShapeCountMode;       // Fixed or range mode
  shapeCountFixed: number;              // Fixed number of shapes (when mode is FIXED)
  shapeCountRange: [number, number];    // Min/max shapes (when mode is RANGE)
  
  // Shape-specific properties for this generation set
  shapeSpecificProperties: ShapeSpecificProperties;
  
  // Z-index configuration for layering (per-set customization)
  // NOTE: This is used for per-set customization only.
  // If EnhancedBatchConfig.globalSettings.globalZIndexSettings.useGlobalSettings is true,
  // this configuration is ignored in favor of global settings.
  zIndexConfig: ZIndexConfig;
  
  // Complete batch configuration settings for this generation set
  // Properly typed instead of Record<string, any>
  batchConfig: BatchConfigSettings;
  
  // SET-LEVEL FEATURES FOR ADVANCED COMPOSITION
  
  // Set visibility and opacity controls
  setVisibility: SetVisibility;
  
  // Set-level blend mode and compositing operation
  setBlendMode: BlendMode;              // Blend mode applied to entire set
  compositingOperation: CompositingOperation; // Compositing operation for masking effects
  
  // Set positioning and transform controls
  setTransform: SetTransform;           // Position, rotation, scale for the entire set
  
  // Artboard alignment and fitting
  artboardAlignment: ArtboardAlignment; // How this set aligns to artboard or other sets
  
  // Generation-specific metadata
  generationOrder: number;              // Order in which this set should be generated
  description?: string;                 // Optional description for the set
  
  // Per-set repetition settings (overrides global settings)
  repetitionMode: 'use-global' | 'fixed' | 'range';  // Use global, fixed count, or range mode
  repetitionValue: number;              // Count when mode is 'fixed'
  repetitionRange: [number, number];    // Min/max when mode is 'range'
  
  // Set locks - granular control over operations
  locks: SetLocks;                      // Lock states for this set (composite, blend, transform, etc.)
  
  // Per-set echo override (Project B feature)
  echoOverride?: {
    enabled: boolean;                   // Whether to override global echo settings
    config?: EchoSpreadConfig;          // Custom echo config for this set (if enabled)
  };
}

// Enhanced batch configuration supporting both single and multi-generation modes
export interface EnhancedBatchConfig {
  // Mode selection
  mode: GenerationSetMode;              // Single or multi-generation mode
  
  // Backward compatibility: single generation settings
  // When mode is SINGLE, these settings are used directly
  legacyBatchConfig?: BatchConfigSettings; // Properly typed instead of Record<string, any>
  
  // Multi-generation settings
  // When mode is MULTI, these settings control the generation sets
  generationSets: GenerationSet[];     // Array of generation sets
  
  // Global settings that apply to all generation sets
  globalSettings: {
    // Canvas and artboard settings
    canvasWidth: number;
    canvasHeight: number;
    artboardSettings?: {
      enabled: boolean;
      width: number;
      height: number;
      backgroundColor: string;
    };
    
    // Edge case strategy for when generation sets count < batch export count
    edgeCaseStrategy: 'hold' | 'cycle' | 'random' | 'stop';
    
    // Export settings
    exportFormat: 'png' | 'jpeg' | 'webp' | 'avif' | 'bmp';
    exportQuality: number;            // 0-100 for image formats
    
    // Global z-index management (single source of truth)
    // NOTE: This is the authoritative z-index configuration.
    // Individual GenerationSet.zIndexConfig is for per-set customization only.
    globalZIndexSettings: {
      startingZIndex: number;         // Base z-index to start from
      setSpacing: number;             // Z-index spacing between generation sets
      preventOverlap: boolean;        // Ensure sets don't overlap in z-space
      useGlobalSettings: boolean;     // If true, ignore per-set zIndexConfig
    };
    
    // Global repetition settings (applies to all sets unless overridden)
    globalRepetitionSettings: {
      repetitionMode: 'fixed' | 'range';  // Fixed count or range mode
      repetitionValue: number;            // Count when mode is 'fixed'
      repetitionRange: [number, number];  // Min/max when mode is 'range'
    };
  };
  
  // Mode restrictions and validation
  modeRestrictions: {
    // Multi-generation mode restrictions
    multiGenerationOnlyForFixedCount: boolean;  // Restrict multi-generation to fixed count only
    maxGenerationSets: number;                  // Maximum allowed generation sets
    minShapesPerSet: number;                    // Minimum shapes per generation set
    maxShapesPerSet: number;                    // Maximum shapes per generation set
  };
  
  // Metadata (using ISO string timestamps for JSON serialization)
  createdAt: string;                    // ISO timestamp string
  updatedAt: string;                    // ISO timestamp string
  version: string;                      // Version for migration/compatibility
}

// ===== HELPER TYPES AND UTILITIES =====

// Default values for generation set configuration
export const DEFAULT_Z_INDEX_CONFIG: ZIndexConfig = {
  baseOffset: 1000,
  incrementPerShape: 1,
  incrementPerGeneration: 1000
};

export const DEFAULT_GENERATION_SET_LIMITS = {
  maxGenerationSets: 20,
  minShapesPerSet: 1,
  maxShapesPerSet: 1000,
  defaultShapesPerSet: 10
};

// ===== VALIDATION SCHEMAS USING ZOD =====

export const GenerationSetModeSchema = z.nativeEnum(GenerationSetMode);
export const ShapeCountModeSchema = z.nativeEnum(ShapeCountMode);

export const BlendModeSchema = z.enum([
  'source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference',
  'exclusion', 'hue', 'saturation', 'color', 'luminosity'
]);

export const CompositingOperationSchema = z.enum([
  'source-over', 'source-in', 'source-out', 'source-atop',
  'destination-over', 'destination-in', 'destination-out', 'destination-atop',
  'lighter', 'copy', 'xor'
]);

export const IncrementalIndexDriverSchema = z.enum(['shapeIndex', 'setRepIndex']);

export const SetTransformSchema = z.object({
  x: z.number(),
  y: z.number(),
  rotation: z.number(),
  scaleX: z.number().positive(),
  scaleY: z.number().positive(),
  transformOrigin: z.enum(['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'])
});

export const ArtboardAlignmentSchema = z.object({
  fitToArtboard: z.boolean(),
  alignTo: z.enum(['artboard', 'set', 'none']),
  alignmentType: z.enum([
    'center', 'top-left', 'top-center', 'top-right',
    'center-left', 'center-right', 'bottom-left', 
    'bottom-center', 'bottom-right'
  ]),
  targetSetId: z.string().optional(),
  margin: z.number().min(0)
});

export const SetVisibilitySchema = z.object({
  visible: z.boolean(),
  opacity: z.number().min(0).max(1),
  opacityVariance: z.number().min(0).max(1)
});

export const SetLocksSchema = z.object({
  composite: z.boolean()
});

export const SupportedShapeTypeSchema = z.enum([
  'rectangle', 'rounded-rectangle', 'square', 'rounded-square', 'circle', 
  'ellipse', 'triangle', 'right-triangle', 'trapezoid', 'pentagon', 'hexagon', 
  'rhombus', 'parallelogram', 'kite', 'semicircle', 'heart', 'arrow', 'cross',
  'line-vector', 'line', 'polygon', 'star', 'chunk', 'blob', 'ring', 'cubic', 'bezier', 
  'smooth-spline', 'spline-circle', 'spline-ellipse', 'spline-ring'
]);

export const ZIndexConfigSchema = z.object({
  baseOffset: z.number().min(0),
  incrementPerShape: z.number().min(0),
  incrementPerGeneration: z.number().min(0)
});

export const ShapeSpecificPropertiesSchema = z.object({
  rectangle: z.object({}).optional(),
  'rounded-rectangle': z.object({
    cornerRadiusRange: z.tuple([z.number(), z.number()]).optional(),
    cornerRadiusMode: z.enum(['range', 'fixed']).optional(),
    cornerRadiusValue: z.number().optional()
  }).optional(),
  square: z.object({}).optional(),
  'rounded-square': z.object({
    cornerRadiusRange: z.tuple([z.number(), z.number()]).optional(),
    cornerRadiusMode: z.enum(['range', 'fixed']).optional(),
    cornerRadiusValue: z.number().optional()
  }).optional(),
  circle: z.object({
    segmentCountRange: z.tuple([z.number(), z.number()]).optional(),
    segmentCountMode: z.enum(['range', 'fixed']).optional(),
    segmentCountValue: z.number().optional()
  }).optional(),
  ellipse: z.object({
    segmentCountRange: z.tuple([z.number(), z.number()]).optional(),
    segmentCountMode: z.enum(['range', 'fixed']).optional(),
    segmentCountValue: z.number().optional()
  }).optional(),
  triangle: z.object({}).optional(),
  'right-triangle': z.object({}).optional(),
  trapezoid: z.object({}).optional(),
  pentagon: z.object({}).optional(),
  hexagon: z.object({}).optional(),
  rhombus: z.object({}).optional(),
  parallelogram: z.object({}).optional(),
  kite: z.object({}).optional(),
  semicircle: z.object({}).optional(),
  heart: z.object({}).optional(),
  arrow: z.object({}).optional(),
  cross: z.object({}).optional(),
  polygon: z.object({
    pointCountRange: z.tuple([z.number(), z.number()]).optional(),
    pointCountMode: z.enum(['range', 'fixed']).optional(),
    pointCountValue: z.number().optional()
  }).optional(),
  star: z.object({
    pointCountRange: z.tuple([z.number(), z.number()]).optional(),
    pointCountMode: z.enum(['range', 'fixed']).optional(),
    pointCountValue: z.number().optional(),
    innerRadiusRange: z.tuple([z.number(), z.number()]).optional(),
    innerRadiusMode: z.enum(['range', 'fixed']).optional(),
    innerRadiusValue: z.number().optional()
  }).optional(),
  ring: z.object({
    innerRadiusRange: z.tuple([z.number(), z.number()]).optional(),
    innerRadiusMode: z.enum(['range', 'fixed']).optional(),
    innerRadiusValue: z.number().optional()
  }).optional(),
  line: z.object({
    pointCountRange: z.tuple([z.number(), z.number()]).optional(),
    pointCountMode: z.enum(['range', 'fixed']).optional(),
    pointCountValue: z.number().optional(),
    strokeCapProbabilities: z.object({
      round: z.number(),
      square: z.number(),
      butt: z.number()
    }).optional()
  }).optional(),
  bezier: z.object({
    pointCountRange: z.tuple([z.number(), z.number()]).optional(),
    pointCountMode: z.enum(['range', 'fixed']).optional(),
    pointCountValue: z.number().optional(),
    openProbability: z.number().optional(),
    strokeCapProbabilities: z.object({
      round: z.number(),
      square: z.number(),
      butt: z.number()
    }).optional()
  }).optional(),
  cubic: z.object({
    pointCountRange: z.tuple([z.number(), z.number()]).optional(),
    pointCountMode: z.enum(['range', 'fixed']).optional(),
    pointCountValue: z.number().optional(),
    openProbability: z.number().optional(),
    curvatureRange: z.tuple([z.number(), z.number()]).optional(),
    spreadRange: z.tuple([z.number(), z.number()]).optional(),
    patternType: z.number().optional()
  }).optional(),
  'smooth-spline': z.object({
    pointCountRange: z.tuple([z.number(), z.number()]).optional(),
    pointCountMode: z.enum(['range', 'fixed']).optional(),
    pointCountValue: z.number().optional(),
    openProbability: z.number().optional(),
    strokeCapProbabilities: z.object({
      round: z.number(),
      square: z.number(),
      butt: z.number()
    }).optional()
  }).optional(),
  chunk: z.object({}).optional(),
  blob: z.object({}).optional(),
  'spline-circle': z.object({
    // Spline-circle has no configurable properties
  }).optional(),
  'spline-ellipse': z.object({
    // Spline-ellipse has no configurable properties
  }).optional(),
  'spline-ring': z.object({
    innerRadiusRange: z.tuple([z.number(), z.number()]).optional(),
    innerRadiusMode: z.enum(['range', 'fixed']).optional(),
    innerRadiusValue: z.number().optional()
  }).optional()
});

// Comprehensive BatchConfigSettings Zod schema
export const BatchConfigSettingsSchema = z.object({
  selectedPreset: z.string(),
  
  // Distribution settings
  distributionLayoutEnabled: z.boolean(),
  distributionPattern: z.enum(['grid', 'wave', 'ellipse', 'spiral']),
  gridRows: z.number(),
  gridColumns: z.number(),
  gridStartX: z.number(),
  gridStartY: z.number(),
  gridSpacingXMode: z.enum(['define', 'auto-centered', 'auto-edge-to-edge']),
  gridSpacingYMode: z.enum(['define', 'auto-centered', 'auto-edge-to-edge']),
  gridRowOffset: z.number(),
  gridColumnOffset: z.number(),
  gridMarginEnabled: z.boolean(),
  gridMarginValue: z.number(),
  gridSortBy: z.enum(['layer', 'id', 'shape-type', 'fill-color', 'opacity', 'size', 'angle', 'creation-time', 'none',
    'corner-radius', 'point-count', 'edge-count', 'inner-radius', 'segment-count', 
    'direction', 'length', 'centroid', 'spread', 'curvature']),
  gridSortScope: z.enum(['per-generation', 'per-batch']),
  gridSortOrder: z.enum(['ascending', 'descending']),
  gridGroupByShapeType: z.boolean(),
  gridReverseGroups: z.boolean(),
  gridXRandomization: z.number(),
  gridYRandomization: z.number(),
  
  waveType: z.enum(['sine', 'triangle', 'square', 'sawtooth']),
  waveAmplitude: z.number(),
  waveFrequency: z.number(),
  waveDirection: z.enum(['horizontal', 'vertical']),
  wavePhaseOffset: z.number(),
  
  ellipseXRadius: z.tuple([z.number(), z.number()]),
  ellipseYRadius: z.tuple([z.number(), z.number()]),
  ellipseRingCount: z.number(),
  ellipseRingSpacing: z.enum(['even', 'progressive']),
  ellipseRotation: z.number(),
  ellipseRotationAlignment: z.enum(['uniform', 'progressive']),
  ellipseAlignToRing: z.boolean(),
  ellipseFlipInward: z.boolean(),
  ellipseAdditionalRotation: z.number(),
  ellipseShapeRotationMode: z.enum(['none', 'fixed', 'range', 'incremental']),
  ellipseRotationFixed: z.number(),
  ellipseRotationRange: z.tuple([z.number(), z.number()]),
  ellipseRotationIncrementalStart: z.number(),
  ellipseRotationIncrementalStep: z.number(),
  
  spiralTurnCount: z.number(),
  spiralSpacingMode: z.enum(['linear', 'logarithmic']),
  spiralDirection: z.enum(['clockwise', 'counterclockwise']),
  spiralStartAngle: z.number(),
  spiralTightness: z.number(),
  
  tangentAlignment: z.boolean(),
  segmentDistribution: z.enum(['even', 'clustered']),
  reverseDirection: z.boolean(),
  
  // Generation count
  generationCountMode: z.enum(['range', 'fixed', 'incremental']),
  generationCountDefine: z.number(),
  generationCountStartValue: z.number(),
  generationCountIncrement: z.number(),
  generationCountResetPerBatch: z.boolean(),
  generationCountModulationEnabled: z.boolean(),
  generationCountModulationValue: z.number(),
  
  // Blend modes
  blendModeEnabled: z.boolean(),
  enabledBlendModes: z.record(BlendModeSchema, z.number().min(0).max(100)).optional(),
  
  // Compositing operations
  compositingOperationsEnabled: z.boolean(),
  enabledCompositingOperations: z.record(z.string(), z.number().min(0).max(100)).optional(),
  
  // Properties
  propertiesEnabled: z.boolean(),
  shapePropertiesEnabled: z.boolean(),
  shapePropertiesDimensionsEnabled: z.boolean(),
  shapePropertiesPositionEnabled: z.boolean(),
  
  // Basic shape properties
  widthRange: z.tuple([z.number(), z.number()]),
  heightRange: z.tuple([z.number(), z.number()]),
  xPositionRange: z.tuple([z.number(), z.number()]),
  yPositionRange: z.tuple([z.number(), z.number()]),
  
  // Enhanced width/height
  widthMode: z.enum(['range', 'value', 'incremental']),
  heightMode: z.enum(['range', 'value', 'incremental']),
  sizeIncrementalResetPerBatch: z.boolean(),
  sizeConstraintMode: z.enum(['none', 'min', 'max', 'avg']),
  widthValue: z.number(),
  heightValue: z.number(),
  widthIncrement: z.number(),
  heightIncrement: z.number(),
  widthStartValue: z.number(),
  heightStartValue: z.number(),
  widthModulationEnabled: z.boolean(),
  widthModulationValue: z.number(),
  heightModulationEnabled: z.boolean(),
  heightModulationValue: z.number(),
  sizeIncrementalIndexDriver: IncrementalIndexDriverSchema,
  minimumSize: z.number(),
  maximumSize: z.number(),
  
  // Enhanced positions
  xPositionMode: z.enum(['range', 'value', 'directional', 'incremental']),
  yPositionMode: z.enum(['range', 'value', 'directional', 'incremental']),
  incrementalResetPerBatch: z.boolean(),
  directionalEvenDistribution: z.boolean(),
  directionalClusterAngle: z.number(),
  xPositionValue: z.number(),
  yPositionValue: z.number(),
  positionDirectionalMode: z.enum(['outward-center', 'outward-edge', 'angle-based']),
  positionDirectionalAngle: z.number(),
  positionDirectionalDistance: z.number(),
  xPositionIncrement: z.number(),
  yPositionIncrement: z.number(),
  xPositionStartValue: z.number(),
  yPositionStartValue: z.number(),
  xPositionModulationMode: z.enum(['off', 'grid-row', 'pixel-value', 'shape-count']),
  xPositionModulationValue: z.number(),
  yPositionModulationMode: z.enum(['off', 'grid-row', 'pixel-value', 'shape-count']),
  yPositionModulationValue: z.number(),
  positionIncrementalIndexDriver: IncrementalIndexDriverSchema,
  
  // Shape-specific properties
  rectangleCornerRadiusMode: z.enum(['range', 'define', 'incremental']),
  rectangleCornerRadiusRange: z.tuple([z.number(), z.number()]),
  rectangleCornerRadiusDefine: z.number(),
  rectangleCornerRadiusStartValue: z.number(),
  rectangleCornerRadiusIncrement: z.number(),
  rectangleCornerRadiusModulationEnabled: z.boolean(),
  rectangleCornerRadiusModulationValue: z.number(),
  rectangleCornerRadiusIncrementalIndexDriver: IncrementalIndexDriverSchema,
  
  starInnerRadiusMode: z.enum(['range', 'define', 'incremental']),
  starInnerRadiusRange: z.tuple([z.number(), z.number()]),
  starInnerRadiusDefine: z.number(),
  starInnerRadiusStartValue: z.number(),
  starInnerRadiusIncrement: z.number(),
  starInnerRadiusModulationEnabled: z.boolean(),
  starInnerRadiusModulationValue: z.number(),
  starInnerRadiusIncrementalIndexDriver: IncrementalIndexDriverSchema,
  
  ringInnerRadiusMode: z.enum(['range', 'define', 'incremental']),
  ringInnerRadiusRange: z.tuple([z.number(), z.number()]),
  ringInnerRadiusDefine: z.number(),
  ringInnerRadiusStartValue: z.number(),
  ringInnerRadiusIncrement: z.number(),
  ringInnerRadiusModulationEnabled: z.boolean(),
  ringInnerRadiusModulationValue: z.number(),
  ringInnerRadiusIncrementalIndexDriver: IncrementalIndexDriverSchema,
  
  // Fill properties
  fillEnabled: z.boolean(),
  fillSolidEnabled: z.boolean(),
  fillStyleProbability: z.number(),
  fillColorMode: z.enum(['range', 'palette', 'define']),
  fillColorRange: z.tuple([z.string(), z.string()]),
  fillColorRangeFlip: z.boolean(),
  fillColorPalette: z.array(z.string()),
  fillColorDefine: z.string(),
  fillColorSaturationRange: z.tuple([z.number(), z.number()]),
  fillColorLightnessRange: z.tuple([z.number(), z.number()]),
  
  // Fill gradient properties
  fillGradientEnabled: z.boolean(),
  fillGradientLinearProbability: z.number(),
  fillGradientRadialProbability: z.number(),
  fillGradientConicProbability: z.number(),
  fillGradientColorMode: z.enum(['range', 'palette', 'define']),
  fillGradientColorRange: z.tuple([z.string(), z.string()]),
  fillGradientColorRangeFlip: z.boolean(),
  fillGradientColorPalette: z.array(z.string()),
  fillGradientColorDefine: z.array(z.string()),
  fillGradientColorSaturationRange: z.tuple([z.number(), z.number()]),
  fillGradientColorLightnessRange: z.tuple([z.number(), z.number()]),
  fillGradientStopsMode: z.enum(['fixed', 'range']),
  fillGradientStopsCount: z.number(),
  fillGradientStopsRange: z.tuple([z.number(), z.number()]),
  fillGradientStopDistribution: z.enum(['even', 'random']),
  fillGradientStopsReverse: z.boolean(),
  fillGradientLinearDirection: z.enum(['fixed', 'range', 'predefined']),
  fillGradientLinearAngle: z.number(),
  fillGradientLinearAngleRange: z.tuple([z.number(), z.number()]),
  fillGradientLinearPredefined: z.enum(['horizontal', 'vertical', 'diagonal-down', 'diagonal-up']),
  fillGradientLinearAlignToShape: z.boolean(),
  fillGradientRadialCenter: z.enum(['center', 'corners', 'midpoints', 'coordinates']),
  
  // Radial Gradient Center X
  fillGradientRadialCenterXMode: z.enum(['fixed', 'range', 'incremental']),
  fillGradientRadialCenterX: z.number(),
  fillGradientRadialCenterXRange: z.tuple([z.number(), z.number()]),
  fillGradientRadialCenterXStartValue: z.number(),
  fillGradientRadialCenterXIncrement: z.number(),
  fillGradientRadialCenterXModulationEnabled: z.boolean(),
  fillGradientRadialCenterXModulationValue: z.number(),
  
  // Radial Gradient Center Y
  fillGradientRadialCenterYMode: z.enum(['fixed', 'range', 'incremental']),
  fillGradientRadialCenterY: z.number(),
  fillGradientRadialCenterYRange: z.tuple([z.number(), z.number()]),
  fillGradientRadialCenterYStartValue: z.number(),
  fillGradientRadialCenterYIncrement: z.number(),
  fillGradientRadialCenterYModulationEnabled: z.boolean(),
  fillGradientRadialCenterYModulationValue: z.number(),
  
  fillGradientRadialCorners: z.object({
    topLeft: z.boolean(),
    topRight: z.boolean(),
    bottomLeft: z.boolean(),
    bottomRight: z.boolean()
  }),
  fillGradientRadialMidpoints: z.object({
    top: z.boolean(),
    right: z.boolean(),
    bottom: z.boolean(),
    left: z.boolean()
  }),
  fillGradientRadialSelectionMode: z.enum(['random', 'cycle']),
  fillGradientRadialShape: z.enum(['circle', 'ellipse', 'auto']),
  fillGradientRadialCircleProbability: z.number(),
  fillGradientRadialEllipseProbability: z.number(),
  fillGradientMatchShape: z.boolean(),
  fillGradientTypeDirectionEnabled: z.boolean(),
  fillGradientConicCenter: z.enum(['center', 'corners', 'midpoints', 'coordinates']),
  fillGradientConicCorners: z.object({
    topLeft: z.boolean(),
    topRight: z.boolean(),
    bottomLeft: z.boolean(),
    bottomRight: z.boolean()
  }),
  fillGradientConicMidpoints: z.object({
    top: z.boolean(),
    right: z.boolean(),
    bottom: z.boolean(),
    left: z.boolean()
  }),
  fillGradientConicSelectionMode: z.enum(['random', 'cycle']),
  
  // Conic Gradient Start Angle
  fillGradientConicAngleMode: z.enum(['fixed', 'range', 'incremental']),
  fillGradientConicAngle: z.number(),
  fillGradientConicAngleRange: z.tuple([z.number(), z.number()]),
  fillGradientConicAngleStartValue: z.number(),
  fillGradientConicAngleIncrement: z.number(),
  fillGradientConicAngleModulationEnabled: z.boolean(),
  fillGradientConicAngleModulationValue: z.number(),
  
  // Conic Gradient Center X
  fillGradientConicCenterXMode: z.enum(['fixed', 'range', 'incremental']),
  fillGradientConicCenterX: z.number(),
  fillGradientConicCenterXRange: z.tuple([z.number(), z.number()]),
  fillGradientConicCenterXStartValue: z.number(),
  fillGradientConicCenterXIncrement: z.number(),
  fillGradientConicCenterXModulationEnabled: z.boolean(),
  fillGradientConicCenterXModulationValue: z.number(),
  
  // Conic Gradient Center Y
  fillGradientConicCenterYMode: z.enum(['fixed', 'range', 'incremental']),
  fillGradientConicCenterY: z.number(),
  fillGradientConicCenterYRange: z.tuple([z.number(), z.number()]),
  fillGradientConicCenterYStartValue: z.number(),
  fillGradientConicCenterYIncrement: z.number(),
  fillGradientConicCenterYModulationEnabled: z.boolean(),
  fillGradientConicCenterYModulationValue: z.number(),
  gradientCenterIncrementalIndexDriver: IncrementalIndexDriverSchema,
  
  // Fill opacity
  fillOpacityEnabled: z.boolean(),
  fillOpacityMode: z.enum(['range', 'define', 'incremental']),
  fillOpacityRange: z.tuple([z.number(), z.number()]),
  fillOpacityDefine: z.number(),
  fillOpacityStartValue: z.number(),
  fillOpacityIncrement: z.number(),
  fillOpacityModulationEnabled: z.boolean(),
  fillOpacityModulationValue: z.number(),
  fillOpacityIncrementalIndexDriver: IncrementalIndexDriverSchema,
  
  // Blur properties
  blurEnabled: z.boolean(),
  blurProbability: z.number(),
  blurMode: z.enum(['range', 'define', 'incremental']),
  blurRange: z.tuple([z.number(), z.number()]),
  blurDefine: z.number(),
  blurStartValue: z.number(),
  blurIncrement: z.number(),
  blurModulationEnabled: z.boolean(),
  blurModulationValue: z.number(),
  blurIncrementalIndexDriver: IncrementalIndexDriverSchema,
  
  // Drop Shadow properties
  dropShadowEnabled: z.boolean(),
  dropShadowProbability: z.number(),
  dropShadowColorMode: z.enum(['auto', 'custom']),
  dropShadowCustomColor: z.string(),
  dropShadowColorDarken: z.number(),
  dropShadowBlendMode: z.enum(['multiply', 'darken', 'overlay']),
  dropShadowOffsetXMode: z.enum(['range', 'define', 'incremental']),
  dropShadowOffsetX: z.number(),
  dropShadowOffsetXRange: z.tuple([z.number(), z.number()]),
  dropShadowOffsetXStartValue: z.number(),
  dropShadowOffsetXIncrement: z.number(),
  dropShadowOffsetYMode: z.enum(['range', 'define', 'incremental']),
  dropShadowOffsetY: z.number(),
  dropShadowOffsetYRange: z.tuple([z.number(), z.number()]),
  dropShadowOffsetYStartValue: z.number(),
  dropShadowOffsetYIncrement: z.number(),
  dropShadowBlurMode: z.enum(['range', 'define', 'incremental']),
  dropShadowBlur: z.number(),
  dropShadowBlurRange: z.tuple([z.number(), z.number()]),
  dropShadowBlurStartValue: z.number(),
  dropShadowBlurIncrement: z.number(),
  dropShadowSpreadMode: z.enum(['range', 'define', 'incremental']),
  dropShadowSpread: z.number(),
  dropShadowSpreadRange: z.tuple([z.number(), z.number()]),
  dropShadowSpreadStartValue: z.number(),
  dropShadowSpreadIncrement: z.number(),
  dropShadowOpacity: z.number(),
  dropShadowIncrementalIndexDriver: IncrementalIndexDriverSchema,
  
  // Outer Glow properties
  outerGlowEnabled: z.boolean(),
  outerGlowProbability: z.number(),
  outerGlowColorMode: z.enum(['auto', 'custom']),
  outerGlowCustomColor: z.string(),
  outerGlowColorSaturate: z.number(),
  outerGlowBlendMode: z.enum(['screen', 'add', 'soft-light', 'color-dodge', 'lighter']),
  outerGlowBlurMode: z.enum(['range', 'define', 'incremental']),
  outerGlowBlur: z.number(),
  outerGlowBlurRange: z.tuple([z.number(), z.number()]),
  outerGlowBlurStartValue: z.number(),
  outerGlowBlurIncrement: z.number(),
  outerGlowSpreadMode: z.enum(['range', 'define', 'incremental']),
  outerGlowSpread: z.number(),
  outerGlowSpreadRange: z.tuple([z.number(), z.number()]),
  outerGlowSpreadStartValue: z.number(),
  outerGlowSpreadIncrement: z.number(),
  outerGlowOpacity: z.number(),
  outerGlowIncrementalIndexDriver: IncrementalIndexDriverSchema,
  
  // Inner Shadow properties
  innerShadowEnabled: z.boolean(),
  innerShadowProbability: z.number(),
  innerShadowColorMode: z.enum(['auto', 'custom']),
  innerShadowCustomColor: z.string(),
  innerShadowColorDarken: z.number(),
  innerShadowBlendMode: z.enum(['multiply', 'darken', 'overlay']),
  innerShadowOffsetXMode: z.enum(['range', 'define', 'incremental']),
  innerShadowOffsetX: z.number(),
  innerShadowOffsetXRange: z.tuple([z.number(), z.number()]),
  innerShadowOffsetXStartValue: z.number(),
  innerShadowOffsetXIncrement: z.number(),
  innerShadowOffsetYMode: z.enum(['range', 'define', 'incremental']),
  innerShadowOffsetY: z.number(),
  innerShadowOffsetYRange: z.tuple([z.number(), z.number()]),
  innerShadowOffsetYStartValue: z.number(),
  innerShadowOffsetYIncrement: z.number(),
  innerShadowBlurMode: z.enum(['range', 'define', 'incremental']),
  innerShadowBlur: z.number(),
  innerShadowBlurRange: z.tuple([z.number(), z.number()]),
  innerShadowBlurStartValue: z.number(),
  innerShadowBlurIncrement: z.number(),
  innerShadowOpacity: z.number(),
  innerShadowIncrementalIndexDriver: IncrementalIndexDriverSchema,
  
  // Inner Glow properties
  innerGlowEnabled: z.boolean(),
  innerGlowProbability: z.number(),
  innerGlowColorMode: z.enum(['auto', 'custom']),
  innerGlowCustomColor: z.string(),
  innerGlowColorSaturate: z.number(),
  innerGlowBlendMode: z.enum(['screen', 'add', 'soft-light', 'color-dodge', 'lighter']),
  innerGlowBlurMode: z.enum(['range', 'define', 'incremental']),
  innerGlowBlur: z.number(),
  innerGlowBlurRange: z.tuple([z.number(), z.number()]),
  innerGlowBlurStartValue: z.number(),
  innerGlowBlurIncrement: z.number(),
  innerGlowSpreadMode: z.enum(['range', 'define', 'incremental']),
  innerGlowSpread: z.number(),
  innerGlowSpreadRange: z.tuple([z.number(), z.number()]),
  innerGlowSpreadStartValue: z.number(),
  innerGlowSpreadIncrement: z.number(),
  innerGlowOpacity: z.number(),
  innerGlowIncrementalIndexDriver: IncrementalIndexDriverSchema,
  
  // Stroke properties
  strokeEnabled: z.boolean(),
  strokeProbability: z.number(),
  strokeColorMode: z.enum(['range', 'palette', 'define']),
  strokeColorRange: z.tuple([z.string(), z.string()]),
  strokeColorRangeFlip: z.boolean(),
  strokeColorPalette: z.array(z.string()),
  strokeColorDefine: z.string(),
  strokeColorSaturationRange: z.tuple([z.number(), z.number()]),
  strokeColorLightnessRange: z.tuple([z.number(), z.number()]),
  strokeColorEnabled: z.boolean(),
  strokeOpacityEnabled: z.boolean(),
  strokeOpacityMode: z.enum(['range', 'define', 'incremental']),
  strokeOpacityRange: z.tuple([z.number(), z.number()]),
  strokeOpacityDefine: z.number(),
  strokeOpacityStartValue: z.number(),
  strokeOpacityIncrement: z.number(),
  strokeOpacityModulationEnabled: z.boolean(),
  strokeOpacityModulationValue: z.number(),
  strokeWidthEnabled: z.boolean(),
  strokeWidthMode: z.enum(['range', 'define', 'incremental']),
  strokeWidthRange: z.tuple([z.number(), z.number()]),
  strokeWidthDefine: z.number(),
  strokeWidthStartValue: z.number(),
  strokeWidthIncrement: z.number(),
  strokeWidthModulationEnabled: z.boolean(),
  strokeWidthModulationValue: z.number(),
  strokeIncrementalIndexDriver: IncrementalIndexDriverSchema,
  
  // Shape-specific properties
  polygonPropertiesEnabled: z.boolean(),
  segmentCountMode: z.enum(['range', 'define', 'incremental']),
  segmentCountRange: z.tuple([z.number(), z.number()]),
  segmentCountDefine: z.number(),
  segmentCountStartValue: z.number(),
  segmentCountIncrement: z.number(),
  segmentCountModulationEnabled: z.boolean(),
  segmentCountModulationValue: z.number(),
  polygonIncrementalIndexDriver: IncrementalIndexDriverSchema,
  
  linePropertiesEnabled: z.boolean(),
  pointCountMode: z.enum(['range', 'define', 'incremental']),
  pointCountRange: z.tuple([z.number(), z.number()]),
  pointCountDefine: z.number(),
  pointCountStartValue: z.number(),
  pointCountIncrement: z.number(),
  pointCountModulationEnabled: z.boolean(),
  pointCountModulationValue: z.number(),
  pointPositionMode: z.enum(['range', 'define', 'incremental']),
  pointPositionRange: z.tuple([z.number(), z.number()]),
  pointPositionDefine: z.number(),
  pointPositionStartValue: z.number(),
  pointPositionIncrement: z.number(),
  pointPositionModulationEnabled: z.boolean(),
  pointPositionModulationValue: z.number(),
  lineIncrementalIndexDriver: IncrementalIndexDriverSchema,
  
  splinePropertiesEnabled: z.boolean(),
  splinePointCountMode: z.enum(['range', 'define', 'incremental']),
  splinePointCountRange: z.tuple([z.number(), z.number()]),
  splinePointCountDefine: z.number(),
  splinePointCountStartValue: z.number(),
  splinePointCountIncrement: z.number(),
  splinePointCountModulationEnabled: z.boolean(),
  splinePointCountModulationValue: z.number(),
  splinePointPositionMode: z.enum(['range', 'define', 'incremental']),
  splinePointPositionRange: z.tuple([z.number(), z.number()]),
  splinePointPositionDefine: z.number(),
  splinePointPositionStartValue: z.number(),
  splinePointPositionIncrement: z.number(),
  splinePointPositionModulationEnabled: z.boolean(),
  splinePointPositionModulationValue: z.number(),
  splineControlPointMode: z.enum(['range', 'define', 'incremental']),
  splineControlPointRange: z.tuple([z.number(), z.number()]),
  splineControlPointDefine: z.number(),
  splineControlPointStartValue: z.number(),
  splineControlPointIncrement: z.number(),
  splineControlPointModulationEnabled: z.boolean(),
  splineControlPointModulationValue: z.number(),
  splineIncrementalIndexDriver: IncrementalIndexDriverSchema,
  
  // Transform properties
  transformsEnabled: z.boolean(),
  transformsArtboardAware: z.boolean(),
  translateXRange: z.tuple([z.number(), z.number()]),
  translateYRange: z.tuple([z.number(), z.number()]),
  scaleUniform: z.boolean(),
  scaleRange: z.tuple([z.number(), z.number()]),
  scaleXRange: z.tuple([z.number(), z.number()]),
  scaleYRange: z.tuple([z.number(), z.number()]),
  rotationRange: z.tuple([z.number(), z.number()]),
  skewXRange: z.tuple([z.number(), z.number()]),
  skewYRange: z.tuple([z.number(), z.number()]),
  
  // Enhanced transform properties
  xTransformMode: z.enum(['range', 'value', 'incremental', 'align']),
  yTransformMode: z.enum(['range', 'value', 'incremental', 'align']),
  xTransformValue: z.number(),
  yTransformValue: z.number(),
  xTransformIncrement: z.number(),
  yTransformIncrement: z.number(),
  xTransformStartValue: z.number(),
  yTransformStartValue: z.number(),
  xTransformModulationEnabled: z.boolean(),
  xTransformModulationValue: z.number(),
  yTransformModulationEnabled: z.boolean(),
  yTransformModulationValue: z.number(),
  
  // Position Alignment (when mode is 'align')
  xShapeAnchorMode: z.enum(['predefined', 'define']),
  xShapeAnchorPredefined: z.enum(['left', 'center', 'right']),
  xShapeAnchorDefine: z.number(),
  xArtboardAnchorMode: z.enum(['predefined', 'define']),
  xArtboardAnchorPredefined: z.enum(['left', 'center', 'right']),
  xArtboardAnchorDefine: z.number(),
  
  yShapeAnchorMode: z.enum(['predefined', 'define']),
  yShapeAnchorPredefined: z.enum(['top', 'center', 'bottom']),
  yShapeAnchorDefine: z.number(),
  yArtboardAnchorMode: z.enum(['predefined', 'define']),
  yArtboardAnchorPredefined: z.enum(['top', 'center', 'bottom']),
  yArtboardAnchorDefine: z.number(),
  
  scaleXMode: z.enum(['range', 'value', 'incremental']),
  scaleYMode: z.enum(['range', 'value', 'incremental']),
  scaleXValue: z.number(),
  scaleYValue: z.number(),
  scaleXIncrement: z.number(),
  scaleYIncrement: z.number(),
  scaleXStartValue: z.number(),
  scaleYStartValue: z.number(),
  scaleXModulationEnabled: z.boolean(),
  scaleXModulationValue: z.number(),
  scaleYModulationEnabled: z.boolean(),
  scaleYModulationValue: z.number(),
  maintainScaleAspectRatio: z.boolean(),
  
  rotationMode: z.enum(['range', 'value', 'incremental']),
  rotationValue: z.number(),
  rotationIncrement: z.number(),
  rotationIncrementStep: z.number().min(1).max(90),
  rotationStartValue: z.number(),
  rotationModulation: z.number(),
  rotationModulationEnabled: z.boolean(),
  setTransformIncrementalIndexDriver: IncrementalIndexDriverSchema,
  
  scaleRandomizationScale: z.number(),
  rotationRandomizationScale: z.number(),
  widthRandomizationScale: z.number(),
  heightRandomizationScale: z.number(),
  
  // Transform Origin
  transformOriginMode: z.enum(['define', 'predefined-artboard', 'current-shape', 'shape-reference']),
  
  // Define mode sub-modes
  transformOriginDefineMode: z.enum(['fixed', 'range', 'incremental']),
  transformOriginX: z.number(),
  transformOriginY: z.number(),
  
  // Range mode
  transformOriginXMin: z.number(),
  transformOriginXMax: z.number(),
  transformOriginYMin: z.number(),
  transformOriginYMax: z.number(),
  
  // Incremental mode
  transformOriginXStartValue: z.number(),
  transformOriginXIncrement: z.number(),
  transformOriginXModulationEnabled: z.boolean(),
  transformOriginXModulationValue: z.number(),
  transformOriginYStartValue: z.number(),
  transformOriginYIncrement: z.number(),
  transformOriginYModulationEnabled: z.boolean(),
  transformOriginYModulationValue: z.number(),
  transformOriginIncrementalIndexDriver: IncrementalIndexDriverSchema,
  
  // Predefined anchor points
  transformOriginPredefined: z.enum(['center', 'top-left', 'top-center', 'top-right', 'center-left', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right']),
  
  // Shape reference mode
  transformOriginShapeReference: z.enum(['current', 'previous', 'next', 'specific']),
  transformOriginShapeIndex: z.number(),
  transformOriginShapeAnchor: z.enum(['center', 'top-left', 'top-center', 'top-right', 'center-left', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right']),
  
  // Shape effects
  shapeEffectsEnabled: z.boolean(),
  
  // Echo/Motion Trails (Project A: Set-Level)
  echoSpread: z.object({
    version: z.number(),
    enabled: z.boolean(),
    scope: z.enum(['set', 'shape', 'both']),
    driver: z.enum(['setRepIndex', 'shapeIndex', 'combined']),
    echoCount: z.number().min(1).max(20),
    directionMode: z.enum(['fixed-vector', 'auto-motion', 'absolute-position']),
    fixedVector: z.object({
      angle: z.number().min(0).max(360),
      distance: z.number().min(0).max(500)
    }),
    autoMotion: z.object({
      fallbackAngle: z.number().min(0).max(360),
      distanceMultiplier: z.number().min(0.1).max(5)
    }),
    absolutePosition: z.object({
      targetX: z.number(),
      targetY: z.number(),
      artboardTarget: z.enum(['center', 'top-left', 'top-right', 'bottom-right', 'bottom-left', 'custom']),
      mode: z.enum(['converge', 'diverge'])
    }).optional(),
    opacity: z.object({
      startOpacity: z.number().min(0).max(100),
      falloffRate: z.number().min(0).max(100),
      minOpacity: z.number().min(0).max(100),
      jitter: z.object({
        enabled: z.boolean(),
        range: z.number().min(0).max(100)
      })
    }),
    blur: z.object({
      enabled: z.boolean(),
      startBlur: z.number().min(0).max(50),
      blurDelta: z.number().min(0).max(20),
      maxBlur: z.number().min(0).max(100),
      jitter: z.object({
        enabled: z.boolean(),
        range: z.number().min(0).max(50)
      })
    }),
    scale: z.object({
      enabled: z.boolean(),
      startScale: z.number().min(10).max(200),
      scaleDelta: z.number().min(-50).max(50),
      minScale: z.number().min(1).max(100),
      maxScale: z.number().min(100).max(500),
      jitter: z.object({
        enabled: z.boolean(),
        range: z.number().min(0).max(100)
      })
    }),
    rotation: z.object({
      enabled: z.boolean(),
      startRotation: z.number().min(0).max(360),
      rotationDelta: z.number().min(-180).max(180),
      minRotation: z.number().min(-360).max(0),
      maxRotation: z.number().min(0).max(360),
      jitter: z.object({
        enabled: z.boolean(),
        range: z.number().min(0).max(180)
      })
    }),
    colorShift: z.object({
      enabled: z.boolean(),
      hueDelta: z.number().min(-180).max(180),
      saturationDelta: z.number().min(-50).max(50),
      lightnessDelta: z.number().min(-50).max(50),
      jitter: z.object({
        enabled: z.boolean(),
        range: z.number().min(0).max(180)
      })
    }).optional(),
    jitter: z.object({
      enabled: z.boolean(),
      distanceRange: z.number().min(0).max(100),
      angleRange: z.number().min(0).max(180)
    }),
    applyTo: z.object({
      enabled: z.boolean(),
      shapeTypes: z.array(z.string()).optional(),
      indices: z.array(z.number()).optional(),
      selector: z.enum(['all', 'even', 'odd', 'step']),
      indexStep: z.number().min(1).max(100).optional(),
      probability: z.number().min(0).max(100).optional()
    }).optional()
  }),
  
  // Color harmony
  colorHarmonyEnabled: z.boolean(),
  harmonyType: z.enum(['monochromatic', 'analogous', 'complementary', 'triadic', 'split-complementary', 'tetradic']),
  baseColor: z.string(),
  hueVariance: z.number(),
  saturationRange: z.tuple([z.number(), z.number()]),
  lightnessRange: z.tuple([z.number(), z.number()]),
  monochromaticSettings: z.object({
    lightnessSteps: z.number(),
    saturationSteps: z.number(),
    includeNeutrals: z.boolean()
  }),
  analogousSettings: z.object({
    hueRange: z.number(),
    colorCount: z.number()
  }),
  complementarySettings: z.object({
    includeNearComplements: z.boolean(),
    complementOffset: z.number()
  }),
  triadicSettings: z.object({
    rotationOffset: z.number(),
    useEqualSpacing: z.boolean()
  }),
  splitComplementarySettings: z.object({
    splitAngle: z.number(),
    balanceWeights: z.boolean()
  }),
  tetradicSettings: z.object({
    squareHarmony: z.boolean(),
    rectangleRatio: z.number()
  }),
  
  // Physics simulation
  physicsEnabled: z.boolean(),
  physicsType: z.enum(['none', 'gravity', 'magnetic', 'collision', 'flocking']),
  gravityDirection: z.number(),
  gravityStrength: z.number(),
  magneticType: z.enum(['attraction', 'repulsion']),
  magneticStrength: z.number(),
  collisionDistance: z.number(),
  collisionBounce: z.number(),
  simulationSteps: z.number(),
  
  // Temporal variation
  temporalEnabled: z.literal(false),
  evolutionMode: z.literal('none'),
  seedIncrement: z.number(),
  evolutionTargets: z.object({
    position: z.boolean(),
    rotation: z.boolean(),
    scale: z.boolean(),
    color: z.boolean(),
    opacity: z.boolean()
  })
});

export const GenerationSetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean(),
  enabledShapeTypes: z.array(SupportedShapeTypeSchema), // Fixed: now uses array instead of Set
  shapeCountMode: ShapeCountModeSchema,
  shapeCountFixed: z.number().min(1),
  shapeCountRange: z.tuple([z.number().min(1), z.number().min(1)]),
  shapeSpecificProperties: ShapeSpecificPropertiesSchema,
  zIndexConfig: ZIndexConfigSchema,
  batchConfig: BatchConfigSettingsSchema, // Fixed: now properly typed instead of z.any()
  // New set-level features
  setVisibility: SetVisibilitySchema,
  setBlendMode: BlendModeSchema,
  compositingOperation: CompositingOperationSchema,
  setTransform: SetTransformSchema,
  artboardAlignment: ArtboardAlignmentSchema,
  // Metadata
  generationOrder: z.number().min(0),
  description: z.string().optional(),
  // Repetition settings
  repetitionMode: z.enum(['use-global', 'fixed', 'range']),
  repetitionValue: z.number().min(0),
  repetitionRange: z.tuple([z.number().min(0), z.number().min(0)]),
  // Lock settings
  locks: SetLocksSchema,
  // Per-set echo override (Project B feature)
  echoOverride: z.object({
    enabled: z.boolean(),
    config: z.any().optional()
  }).optional()
});

export const EnhancedBatchConfigSchema = z.object({
  mode: GenerationSetModeSchema,
  legacyBatchConfig: BatchConfigSettingsSchema.optional(), // Fixed: now properly typed instead of z.any()
  generationSets: z.array(GenerationSetSchema),
  globalSettings: z.object({
    canvasWidth: z.number().positive(),
    canvasHeight: z.number().positive(),
    artboardSettings: z.object({
      enabled: z.boolean(),
      width: z.number().positive(),
      height: z.number().positive(),
      backgroundColor: z.string()
    }).optional(),
    edgeCaseStrategy: z.enum(['hold', 'cycle', 'random', 'stop']),
    exportFormat: z.enum(['png', 'jpeg', 'webp', 'avif', 'bmp']),
    exportQuality: z.number().min(0).max(100),
    globalZIndexSettings: z.object({
      startingZIndex: z.number(),
      setSpacing: z.number().positive(),
      preventOverlap: z.boolean(),
      useGlobalSettings: z.boolean() // Added for z-index precedence control
    })
  }),
  modeRestrictions: z.object({
    multiGenerationOnlyForFixedCount: z.boolean(),
    maxGenerationSets: z.number().positive(),
    minShapesPerSet: z.number().positive(),
    maxShapesPerSet: z.number().positive()
  }),
  createdAt: z.string().datetime(), // Fixed: now uses ISO string instead of z.date()
  updatedAt: z.string().datetime(), // Fixed: now uses ISO string instead of z.date()
  version: z.string()
}).refine((data) => {
  // Validation refinement: Multi-generation mode requires fixed generation count when restriction is enabled
  if (data.mode === GenerationSetMode.MULTI && data.modeRestrictions.multiGenerationOnlyForFixedCount) {
    return data.generationSets.every(set => set.shapeCountMode === ShapeCountMode.FIXED);
  }
  return true;
}, {
  message: "Multi-generation mode with multiGenerationOnlyForFixedCount restriction requires all generation sets to use fixed shape count mode",
  path: ["generationSets"]
});

// Utility functions for working with generation sets
export const GenerationSetUtils = {
  // Create a new generation set with default values
  createDefault: (id: string, name: string): GenerationSet => ({
    id,
    name,
    enabled: true,
    enabledShapeTypes: ['rectangle', 'circle'], // Fixed: now uses array instead of Set
    shapeCountMode: ShapeCountMode.FIXED,
    shapeCountFixed: DEFAULT_GENERATION_SET_LIMITS.defaultShapesPerSet,
    shapeCountRange: [1, 10],
    shapeSpecificProperties: {},
    zIndexConfig: { ...DEFAULT_Z_INDEX_CONFIG },
    batchConfig: { ...defaultBatchConfigSettings }, // Fixed: now uses proper default settings
    // New set-level features with sensible defaults
    setVisibility: {
      visible: true,
      opacity: 1.0,
      opacityVariance: 0.0
    },
    setBlendMode: 'source-over',
    compositingOperation: 'source-over',
    setTransform: {
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1.0,
      scaleY: 1.0,
      transformOrigin: 'center'
    },
    artboardAlignment: {
      fitToArtboard: false,
      fitMode: 'contain',
      alignTo: 'none',
      alignmentType: 'center',
      margin: 0
    },
    generationOrder: 0,
    description: undefined,
    // Repetition settings (defaults to use-global mode with no repetitions)
    repetitionMode: 'use-global',
    repetitionValue: 0,
    repetitionRange: [0, 0],
    // Lock settings (defaults to all locks disabled/off)
    locks: {
      composite: false
    }
  }),

  // Validate shape count settings
  validateShapeCount: (set: GenerationSet): boolean => {
    if (set.shapeCountMode === ShapeCountMode.FIXED) {
      return set.shapeCountFixed >= DEFAULT_GENERATION_SET_LIMITS.minShapesPerSet &&
             set.shapeCountFixed <= DEFAULT_GENERATION_SET_LIMITS.maxShapesPerSet;
    } else {
      const [min, max] = set.shapeCountRange;
      return min >= DEFAULT_GENERATION_SET_LIMITS.minShapesPerSet &&
             max <= DEFAULT_GENERATION_SET_LIMITS.maxShapesPerSet &&
             min <= max;
    }
  },

  // Calculate total z-index range for a generation set
  calculateZIndexRange: (set: GenerationSet): [number, number] => {
    const maxShapes = set.shapeCountMode === ShapeCountMode.FIXED 
      ? set.shapeCountFixed 
      : set.shapeCountRange[1];
    
    const minZ = set.zIndexConfig.baseOffset;
    const maxZ = minZ + (maxShapes - 1) * set.zIndexConfig.incrementPerShape;
    
    return [minZ, maxZ];
  },

  // Get actual shape count for generation (handles range mode)
  getShapeCount: (set: GenerationSet, randomSeed?: number): number => {
    if (set.shapeCountMode === ShapeCountMode.FIXED) {
      return set.shapeCountFixed;
    }
    
    const [min, max] = set.shapeCountRange;
    if (randomSeed !== undefined) {
      // Use seeded random for reproducible results
      return Math.floor(min + (randomSeed % (max - min + 1)));
    }
    
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Convert Set<string> to SupportedShapeType[] for JSON serialization
  convertShapeTypesFromSet: (shapeTypesSet: Set<string>): SupportedShapeType[] => {
    return Array.from(shapeTypesSet).filter(type => 
      SupportedShapeTypeSchema.safeParse(type).success
    ) as SupportedShapeType[];
  },

  // Convert SupportedShapeType[] to Set<string> for backwards compatibility
  convertShapeTypesToSet: (shapeTypesArray: SupportedShapeType[]): Set<string> => {
    return new Set(shapeTypesArray);
  }
};

// Type exports for external usage
export type GenerationSetType = z.infer<typeof GenerationSetSchema>;
export type EnhancedBatchConfigType = z.infer<typeof EnhancedBatchConfigSchema>;
export type ZIndexConfigType = z.infer<typeof ZIndexConfigSchema>;
export type ShapeSpecificPropertiesType = z.infer<typeof ShapeSpecificPropertiesSchema>;
export type BatchConfigSettingsType = z.infer<typeof BatchConfigSettingsSchema>;

// Insert schema for batch config settings
export const insertBatchConfigSettingsSchema = BatchConfigSettingsSchema;
export type InsertBatchConfigSettings = z.infer<typeof insertBatchConfigSettingsSchema>;

// Export all BlendMode values for convenience
export const BLEND_MODES: BlendMode[] = [
  'source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference',
  'exclusion', 'hue', 'saturation', 'color', 'luminosity'
];

// Export all supported shape types for convenience
export const SUPPORTED_SHAPE_TYPES: SupportedShapeType[] = [
  'rectangle', 'rounded-rectangle', 'square', 'rounded-square', 'circle', 
  'ellipse', 'triangle', 'right-triangle', 'trapezoid', 'pentagon', 'hexagon', 
  'rhombus', 'parallelogram', 'kite', 'semicircle', 'heart', 'arrow', 'cross',
  'line-vector', 'line', 'polygon', 'star', 'chunk', 'blob', 'ring', 'cubic', 'bezier', 
  'smooth-spline', 'spline-circle', 'spline-ellipse', 'spline-ring'
];

// ===== EXPORT JOBS =====
// Persistent storage for export job status and results
export const exportJobs = pgTable("export_jobs", {
  exportId: varchar("export_id").primaryKey().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status").notNull().default('queued'), // queued, processing, completed, failed
  progress: jsonb("progress").notNull(), // { progress: number, currentStep: string }
  config: jsonb("config").notNull(), // Export configuration (shapes, settings, etc.)
  results: jsonb("results"), // Download URLs, file paths, etc.
  error: text("error"), // Error message if failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export type ExportJob = typeof exportJobs.$inferSelect;
export type InsertExportJob = typeof exportJobs.$inferInsert;

// ===== MIGRATION UTILITIES =====
/**
 * Migrates legacy size constraint fields to new sizeConstraintMode field
 * This ensures backward compatibility with old project files and generation sets
 * 
 * @param settings - Batch config settings (may have legacy fields)
 * @returns Normalized settings with sizeConstraintMode
 */
export function migrateSizeConstraintMode(settings: Partial<BatchConfigSettings> & {
  useMinWidthHeight?: boolean;
  useMaxWidthHeight?: boolean;
  useAvgWidthHeight?: boolean;
  maintainAspectRatio?: boolean;
}): Partial<BatchConfigSettings> {
  // If already has sizeConstraintMode, no migration needed
  if (settings.sizeConstraintMode) {
    // Remove legacy fields if present
    const { useMinWidthHeight, useMaxWidthHeight, useAvgWidthHeight, maintainAspectRatio, ...rest } = settings as any;
    return rest;
  }
  
  // Determine new sizeConstraintMode based on legacy flags
  let sizeConstraintMode: 'none' | 'min' | 'max' | 'avg' = 'none';
  
  if (settings.useMinWidthHeight) {
    sizeConstraintMode = 'min';
  } else if (settings.useAvgWidthHeight) {
    sizeConstraintMode = 'avg';
  } else if (settings.useMaxWidthHeight) {
    sizeConstraintMode = 'max';
  } else if (settings.maintainAspectRatio) {
    // If maintainAspectRatio was true but no constraint was set, default to 'max'
    sizeConstraintMode = 'max';
  } else {
    // All false or undefined: use 'none' (independent dimensions)
    sizeConstraintMode = 'none';
  }
  
  // Remove legacy fields and add new field
  const { useMinWidthHeight, useMaxWidthHeight, useAvgWidthHeight, maintainAspectRatio, ...rest } = settings as any;
  
  return {
    ...rest,
    sizeConstraintMode
  };
}

/**
 * Migrates rotation settings to ensure rotationIncrementStep has a default value
 * This ensures backward compatibility with configs created before the step amount feature
 * 
 * @param settings - Batch config settings (may be missing rotationIncrementStep)
 * @returns Settings with rotationIncrementStep defaulted to 15
 */
export function migrateRotationSettings(settings: Partial<BatchConfigSettings>): Partial<BatchConfigSettings> {
  return {
    ...settings,
    rotationIncrementStep: settings.rotationIncrementStep ?? 15
  };
}

/**
 * Migrates transform origin settings from legacy 'predefined-shape' to 'current-shape'
 * and ensures all new transform origin fields have default values
 * 
 * @param settings - Batch config settings (may have legacy transformOriginMode)
 * @returns Settings with updated transformOriginMode and default values for new fields
 */
export function migrateTransformOrigin(settings: Partial<BatchConfigSettings> & {
  transformOriginMode?: 'define' | 'predefined-artboard' | 'predefined-shape' | 'current-shape' | 'shape-reference';
}): Partial<BatchConfigSettings> {
  const migrated = { ...settings };
  
  // Rename legacy 'predefined-shape' to 'current-shape'
  if (migrated.transformOriginMode === 'predefined-shape' as any) {
    migrated.transformOriginMode = 'current-shape';
  }
  
  // Ensure new fields have default values
  return {
    ...migrated,
    transformOriginDefineMode: migrated.transformOriginDefineMode ?? 'fixed',
    transformOriginXMin: migrated.transformOriginXMin ?? -100,
    transformOriginXMax: migrated.transformOriginXMax ?? 100,
    transformOriginYMin: migrated.transformOriginYMin ?? -100,
    transformOriginYMax: migrated.transformOriginYMax ?? 100,
    transformOriginXStartValue: migrated.transformOriginXStartValue ?? 0,
    transformOriginXIncrement: migrated.transformOriginXIncrement ?? 10,
    transformOriginXModulationEnabled: migrated.transformOriginXModulationEnabled ?? false,
    transformOriginXModulationValue: migrated.transformOriginXModulationValue ?? 100,
    transformOriginYStartValue: migrated.transformOriginYStartValue ?? 0,
    transformOriginYIncrement: migrated.transformOriginYIncrement ?? 10,
    transformOriginYModulationEnabled: migrated.transformOriginYModulationEnabled ?? false,
    transformOriginYModulationValue: migrated.transformOriginYModulationValue ?? 100,
    transformOriginShapeReference: migrated.transformOriginShapeReference ?? 'current',
    transformOriginShapeIndex: migrated.transformOriginShapeIndex ?? 0,
    transformOriginShapeAnchor: migrated.transformOriginShapeAnchor ?? 'center'
  };
}

/**
 * Helper to migrate a single per-effect jitter config from legacy format
 * Legacy configs had a single 'range' property, new configs have mode/fixedAmount/rangeMin/rangeMax
 */
function migratePerEffectJitter(jitter: any): EchoPerEffectJitterConfig | undefined {
  if (!jitter) return undefined;
  
  // Check for legacy config (has 'range' but not 'mode')
  if (jitter.range !== undefined && jitter.mode === undefined) {
    const legacyRange = jitter.range ?? 0;
    return {
      enabled: jitter.enabled ?? false,
      mode: 'range',
      fixedAmount: 0,
      rangeMin: -legacyRange,  // Symmetric negative bound
      rangeMax: legacyRange    // Symmetric positive bound
    };
  }
  
  // Return as-is if already in new format or missing
  return jitter;
}

/**
 * Migrates echo spread per-effect jitter configs from legacy format
 * Legacy configs had a single 'range' property representing ±range jitter
 * New format uses mode/fixedAmount/rangeMin/rangeMax for more control
 * 
 * IMPORTANT: This function deep-clones all effect configs to avoid shared
 * references that could leak legacy data back into the state.
 * 
 * @param settings - Batch config settings (may have legacy jitter configs)
 * @returns Settings with migrated per-effect jitter configs (deep cloned)
 */
export function migrateEchoJitter(settings: Partial<BatchConfigSettings>): Partial<BatchConfigSettings> {
  if (!settings.echoSpread) return settings;
  
  const echoSpread = settings.echoSpread;
  
  // Start by spreading ALL original echoSpread properties to preserve any fields
  // Then deep clone nested objects to break references
  const updatedEchoSpread: any = {
    ...echoSpread,
    // Deep clone fixedVector config if present
    fixedVector: echoSpread.fixedVector ? { ...echoSpread.fixedVector } : echoSpread.fixedVector,
    // Deep clone autoMotion config if present
    autoMotion: echoSpread.autoMotion ? { ...echoSpread.autoMotion } : echoSpread.autoMotion,
    // Deep clone position jitter config if present
    jitter: echoSpread.jitter ? { ...echoSpread.jitter } : echoSpread.jitter
  };
  
  // Check each effect for legacy jitter config and deep clone
  const effects = ['opacity', 'blur', 'scale', 'rotation'] as const;
  
  for (const effect of effects) {
    const effectConfig = (echoSpread as any)[effect];
    if (effectConfig) {
      // Deep clone the effect config
      const clonedConfig: any = { ...effectConfig };
      
      // Migrate jitter if present
      if (effectConfig.jitter) {
        const migratedJitter = migratePerEffectJitter(effectConfig.jitter);
        // Always deep clone the jitter config
        clonedConfig.jitter = { ...migratedJitter };
      }
      
      updatedEchoSpread[effect] = clonedConfig;
    }
  }
  
  return {
    ...settings,
    echoSpread: updatedEchoSpread
  };
}

/**
 * Master migration function that applies all batch config migrations
 * This should be called at all persistence boundaries (load/save)
 * 
 * @param settings - Batch config settings (may have legacy fields)
 * @returns Fully migrated settings
 */
export function migrateBatchConfigSettings(settings: Partial<BatchConfigSettings> & {
  useMinWidthHeight?: boolean;
  useMaxWidthHeight?: boolean;
  useAvgWidthHeight?: boolean;
  maintainAspectRatio?: boolean;
}): Partial<BatchConfigSettings> {
  // Apply all migrations in sequence
  let migrated = migrateSizeConstraintMode(settings);
  migrated = migrateRotationSettings(migrated);
  migrated = migrateTransformOrigin(migrated);
  migrated = migrateEchoJitter(migrated);
  
  return migrated;
}

// ===== SSE EXPORT PROGRESS EVENTS =====

/**
 * SSE Export Phase - high-level export phases
 */
export type SSEExportPhase = 'preparing' | 'rendering' | 'rendering-tiles' | 'stitching' | 'encoding' | 'compressing' | 'finalizing';

/**
 * SSE Event Types for export progress streaming
 */
export type SSEEventType = 'phase' | 'tile' | 'progress' | 'complete' | 'error' | 'heartbeat';

/**
 * Base SSE event interface
 */
export interface SSEEventBase {
  type: SSEEventType;
  timestamp: number;
}

/**
 * Phase change event - indicates major export phase transitions
 */
export interface SSEPhaseEvent extends SSEEventBase {
  type: 'phase';
  phase: SSEExportPhase;
  message: string;
}

/**
 * Tile progress event - for tiled rendering updates
 */
export interface SSETileEvent extends SSEEventBase {
  type: 'tile';
  tileIndex: number;
  totalTiles: number;
  step: 'render' | 'stitch';
  message: string;
  progressPct?: number;
}

/**
 * General progress event - overall progress updates
 */
export interface SSEProgressEvent extends SSEEventBase {
  type: 'progress';
  progressPct: number;
  status: string;
  estimatedSecondsRemaining?: number;
}

/**
 * Export complete event - final event with download info
 */
export interface SSECompleteEvent extends SSEEventBase {
  type: 'complete';
  downloadUrl: string;
  filename: string;
  contentType: string;
  sizeBytes?: number;
  dimensions?: { width: number; height: number };
}

/**
 * Error event - export failure
 */
export interface SSEErrorEvent extends SSEEventBase {
  type: 'error';
  message: string;
  code?: string;
}

/**
 * Heartbeat event - keep connection alive
 */
export interface SSEHeartbeatEvent extends SSEEventBase {
  type: 'heartbeat';
}

/**
 * Union type for all SSE events
 */
export type SSEExportEvent = 
  | SSEPhaseEvent 
  | SSETileEvent 
  | SSEProgressEvent 
  | SSECompleteEvent 
  | SSEErrorEvent 
  | SSEHeartbeatEvent;

/**
 * SSE export session state
 */
export interface SSEExportSession {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';
  startTime: number;
  downloadUrl?: string;
  filename?: string;
  error?: string;
}