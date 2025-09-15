import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sidebar section configuration type
export interface SidebarSectionConfig {
  shapes: boolean;           // Shape Types - enabled by default
  selection: boolean;        // Selection Modes - disabled by default  
  layers: boolean;           // Layers - disabled by default
  properties: boolean;       // Properties - disabled by default
  composition: boolean;      // Composition - disabled by default
  'align-distribute': boolean; // Align & Distribute - disabled by default
  artboards: boolean;        // Artboards - enabled by default
  colors: boolean;           // Color Manipulation - disabled by default
  project: boolean;          // Project Management - enabled by default
  export: boolean;           // Export & Save - enabled by default
}

// Default sidebar section configuration
export const DEFAULT_SIDEBAR_SECTIONS: SidebarSectionConfig = {
  shapes: true,              // Shape Types - enabled by default
  selection: false,          // Selection Modes - disabled by default
  layers: false,             // Layers - disabled by default
  properties: false,         // Properties - disabled by default
  composition: false,        // Composition - disabled by default
  'align-distribute': false, // Align & Distribute - disabled by default
  artboards: true,           // Artboards - enabled by default
  colors: false,             // Color Manipulation - disabled by default
  project: true,             // Project Management - enabled by default
  export: true,              // Export & Save - enabled by default
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

export interface BatchConfigSettings {
  // Preset Selection
  selectedPreset: string;
  
  // Advanced Noise (First configurable section)
  noiseEnabled: boolean;
  noiseAlgorithm: 'randomise' | 'perlin' | 'simplex' | 'fractal' | 'worley' | 'ridge' | 'turbulence';
  noiseScale: number;
  noiseOctaves: number;
  noiseAmplitude: number;
  noiseSeed: number;
  noiseScaleToCanvas: boolean;
  
  // Property-specific amplitude multipliers
  noisePositionAmplitude: number;
  noiseRotationAmplitude: number;
  noiseScaleAmplitude: number;
  noiseOpacityAmplitude: number;
  noiseColorAmplitude: number;
  
  // Octave handling mode
  noiseOctaveMode: 'natural' | 'normalized';
  
  // Algorithm-specific settings
  // Fractal specific
  noiseLacunarity: number;
  noiseGain: number;
  
  // Worley specific
  noiseDistanceFunction: 'euclidean' | 'manhattan' | 'chebyshev';
  noiseFeaturePoints: number;
  
  // Ridge specific
  noiseRidgeOffset: number;
  
  // Turbulence specific
  noiseTurbulencePower: number;
  
  // Distribution Layout
  distributionLayoutEnabled: boolean;
  distributionPattern: 'grid' | 'line' | 'circle' | 'spiral';
  
  // Grid Layout Settings
  gridRows: number;
  gridColumns: number;
  gridRowOffset: number;
  gridColumnOffset: number;
  gridSortBy: 'layer' | 'id' | 'shape-type' | 'fill-color' | 'opacity' | 'size' | 'angle' | 'creation-time' | 'none';
  gridSortScope: 'per-generation' | 'per-batch'; // Sort within each generation or across entire batch
  gridSortOrder: 'ascending' | 'descending'; // Sort direction
  // Grid randomization amounts
  gridXRandomization: number; // 0-100 pixels randomization in X direction
  gridYRandomization: number; // 0-100 pixels randomization in Y direction
  
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
  
  // Properties Section
  propertiesEnabled: boolean;
  
  // Shape Properties
  shapePropertiesEnabled: boolean;
  widthRange: [number, number];
  heightRange: [number, number];
  xPositionRange: [number, number];
  yPositionRange: [number, number];
  
  // Enhanced Width and Height Properties
  widthMode: 'range' | 'value' | 'incremental';
  heightMode: 'range' | 'value' | 'incremental';
  
  // Width/Height Mode Toggles
  sizeNoiseWithinRange: boolean; // true: noise defines values within range, false: noise adds to range
  sizeIncrementalResetPerBatch: boolean; // true: reset count per batch, false: continuous increment
  sizeNoiseMode: 'additive' | 'multiplicative'; // how noise affects size properties
  
  // Shape Constraint Value Selection (replaces separate constraint ranges)
  useMinWidthHeight: boolean; // Use minimum of width/height for circular shapes
  useMaxWidthHeight: boolean; // Use maximum of width/height for circular shapes  
  useAvgWidthHeight: boolean; // Use average of width/height for circular shapes
  
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
  
  // Size Constraints
  maintainAspectRatio: boolean; // force width/height to maintain shape proportions
  minimumSize: number; // absolute minimum size to prevent invisible shapes
  maximumSize: number; // absolute maximum size constraint
  
  // Enhanced Position Properties (removed percentage and edge-offset modes)
  positionsEnabled: boolean; // Controls whether positions are applied to distribution layouts
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
  xPositionModulationEnabled: boolean; // Enable modulation for X position
  xPositionModulationValue: number; // Modulation value for X position
  yPositionModulationEnabled: boolean; // Enable modulation for Y position
  yPositionModulationValue: number; // Modulation value for Y position
  
  // Rectangle-specific Properties
  rectangleCornerRadiusMode: 'range' | 'define' | 'incremental';
  rectangleCornerRadiusRange: [number, number];
  rectangleCornerRadiusDefine: number;
  rectangleCornerRadiusStartValue: number;
  rectangleCornerRadiusIncrement: number;
  rectangleCornerRadiusModulationEnabled: boolean;
  rectangleCornerRadiusModulationValue: number;
  
  // Star-specific Properties
  starInnerRadiusMode: 'range' | 'define' | 'incremental';
  starInnerRadiusRange: [number, number];
  starInnerRadiusDefine: number;
  starInnerRadiusStartValue: number;
  starInnerRadiusIncrement: number;
  starInnerRadiusModulationEnabled: boolean;
  starInnerRadiusModulationValue: number;
  
  // Ring-specific Properties
  ringInnerRadiusMode: 'range' | 'define' | 'incremental';
  ringInnerRadiusRange: [number, number];
  ringInnerRadiusDefine: number;
  ringInnerRadiusStartValue: number;
  ringInnerRadiusIncrement: number;
  ringInnerRadiusModulationEnabled: boolean;
  ringInnerRadiusModulationValue: number;
  
  // Fill Properties - Controls solid vs gradient vs pattern
  fillEnabled: boolean;
  fillStyleProbability: number; // 0-100% - probability for solid fill vs gradient fill
  
  // Fill Color Settings (for solid fills)
  fillColorMode: 'range' | 'palette' | 'define';
  fillColorRange: [string, string]; // For range mode (HSL interpolation)
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
  fillGradientColorPalette: string[]; // For palette mode
  fillGradientColorDefine: string[]; // For define mode - array based on max stops
  // Additional HSL controls for range mode
  fillGradientColorSaturationRange: [number, number]; // 0-100% for range mode
  fillGradientColorLightnessRange: [number, number]; // 0-100% for range mode
  fillGradientStopsRange: [number, number]; // RGBA gradient stops
  // Enhanced Gradient Type & Direction Controls
  fillGradientLinearDirection: 'range' | 'predefined'; // Linear direction mode
  fillGradientLinearAngleRange: [number, number]; // Min-max angle range for range mode
  fillGradientLinearPredefined: 'horizontal' | 'vertical' | 'diagonal-down' | 'diagonal-up'; // Predefined directions
  fillGradientLinearAlignToShape: boolean; // Whether to align gradient to shape orientation/rotation
  fillGradientRadialCenter: 'center' | 'random' | 'corners' | 'midpoints' | 'coordinates'; // Radial center positioning
  fillGradientRadialCenterX: number; // X coordinate for specific positioning (0-100%)
  fillGradientRadialCenterY: number; // Y coordinate for specific positioning (0-100%)
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
  
  // Conic gradient controls
  fillGradientConicCenter: 'center' | 'random' | 'coordinates'; // Conic center positioning
  fillGradientConicCenterX: number; // X coordinate for specific positioning (0-100%)
  fillGradientConicCenterY: number; // Y coordinate for specific positioning (0-100%)
  fillGradientConicAngle: number; // Starting angle for conic gradient (0-360°)
  
  // Fill Opacity Settings
  fillOpacityMode: 'range' | 'define' | 'incremental';
  fillOpacityRange: [number, number]; // For range mode
  fillOpacityDefine: number; // For define mode
  fillOpacityStartValue: number; // For incremental mode
  fillOpacityIncrement: number; // For incremental mode
  fillOpacityModulationEnabled: boolean; // Enable modulation
  fillOpacityModulationValue: number; // Modulation value
  
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
  
  // Stroke Properties  
  strokeEnabled: boolean;
  strokeProbability: number; // 0-100%
  
  // Stroke Color Settings
  strokeColorMode: 'range' | 'palette' | 'define';
  strokeColorRange: [string, string]; // For range mode (HSL interpolation)
  strokeColorPalette: string[]; // For palette mode
  strokeColorDefine: string; // For define mode
  // Additional HSL controls for range mode
  strokeColorSaturationRange: [number, number]; // 0-100% for range mode
  strokeColorLightnessRange: [number, number]; // 0-100% for range mode
  
  // Stroke Opacity Settings
  strokeOpacityMode: 'range' | 'define' | 'incremental';
  strokeOpacityRange: [number, number]; // For range mode
  strokeOpacityDefine: number; // For define mode
  strokeOpacityStartValue: number; // For incremental mode
  strokeOpacityIncrement: number; // For incremental mode
  strokeOpacityModulationEnabled: boolean; // Enable modulation
  strokeOpacityModulationValue: number; // Modulation value
  
  // Stroke Width Settings
  strokeWidthMode: 'range' | 'define' | 'incremental';
  strokeWidthRange: [number, number];
  strokeWidthDefine: number; // For define mode
  strokeWidthStartValue: number; // For incremental mode
  strokeWidthIncrement: number; // For incremental mode
  strokeWidthModulationEnabled: boolean; // Enable modulation
  strokeWidthModulationValue: number; // Modulation value
  
  // Polygon Shape Properties
  polygonPropertiesEnabled: boolean;
  segmentCountMode: 'range' | 'define' | 'incremental';
  segmentCountRange: [number, number];
  segmentCountDefine: number;
  segmentCountStartValue: number;
  segmentCountIncrement: number;
  segmentCountModulationEnabled: boolean;
  segmentCountModulationValue: number;
  
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
  
  // Shape Transforms
  transformsEnabled: boolean;
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
  xTransformMode: 'range' | 'value' | 'incremental';
  yTransformMode: 'range' | 'value' | 'incremental';
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
  rotationModulation: number; // Modulation value (e.g., 360 for full circle reset)
  rotationModulationEnabled: boolean; // Toggle to enable/disable modulation
  
  // Transform Randomization Scaling (0-100%)
  scaleRandomizationScale: number; // Scale for scale randomization  
  rotationRandomizationScale: number; // Scale for rotation randomization
  widthRandomizationScale: number; // Scale for width randomization in range mode
  heightRandomizationScale: number; // Scale for height randomization in range mode
  
  // Shape Effects
  shapeEffectsEnabled: boolean;
  
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
  
  noiseEnabled: false,
  noiseAlgorithm: 'randomise',
  noiseScale: 1,
  noiseOctaves: 1,
  noiseAmplitude: 50,
  noiseSeed: Math.floor(Math.random() * 10000),
  noiseScaleToCanvas: true,
  
  // Property-specific amplitude multipliers
  noisePositionAmplitude: 1.0,
  noiseRotationAmplitude: 1.0,
  noiseScaleAmplitude: 1.0,
  noiseOpacityAmplitude: 1.0,
  noiseColorAmplitude: 1.0,
  
  // Octave handling mode
  noiseOctaveMode: 'natural',
  
  // Algorithm-specific settings
  noiseLacunarity: 2.0,
  noiseGain: 0.5,
  noiseDistanceFunction: 'euclidean',
  noiseFeaturePoints: 1,
  noiseRidgeOffset: 1.0,
  noiseTurbulencePower: 1.0,
  
  distributionLayoutEnabled: false,
  distributionPattern: 'grid',
  gridRows: 3,
  gridColumns: 3,
  gridRowOffset: 120,
  gridColumnOffset: 120,
  gridSortBy: 'none',
  gridSortScope: 'per-generation',
  gridSortOrder: 'ascending',
  gridXRandomization: 0,
  gridYRandomization: 0,
  
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
  
  propertiesEnabled: false,
  
  // Shape Properties
  shapePropertiesEnabled: false,
  widthRange: [50, 200],
  heightRange: [50, 200],
  xPositionRange: [-100, 100],
  yPositionRange: [-100, 100],
  
  // Enhanced Width and Height Properties
  widthMode: 'range',
  heightMode: 'range',
  
  // Width/Height Mode Toggles
  sizeNoiseWithinRange: false, // Default: noise adds to range
  sizeIncrementalResetPerBatch: true, // Default: reset count per batch
  sizeNoiseMode: 'additive', // Default: additive noise
  
  // Shape Constraint Value Selection (replaces separate constraint ranges)
  useMinWidthHeight: false, // Use minimum of width/height for circular shapes
  useMaxWidthHeight: true, // Use maximum of width/height for circular shapes (default)
  useAvgWidthHeight: false, // Use average of width/height for circular shapes
  
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
  
  // Size Constraints
  maintainAspectRatio: false, // Default: independent width/height
  minimumSize: 10, // Minimum size to prevent invisible shapes
  maximumSize: 500, // Maximum size constraint
  
  // Enhanced Position Properties
  positionsEnabled: false, // Default: positions are not applied in distribution layouts
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
  xPositionModulationEnabled: false,
  xPositionModulationValue: 800,
  yPositionModulationEnabled: false,
  yPositionModulationValue: 600,
  
  // Rectangle-specific Properties
  rectangleCornerRadiusMode: 'range',
  rectangleCornerRadiusRange: [0, 20],
  rectangleCornerRadiusDefine: 10,
  rectangleCornerRadiusStartValue: 0,
  rectangleCornerRadiusIncrement: 2,
  rectangleCornerRadiusModulationEnabled: false,
  rectangleCornerRadiusModulationValue: 50,
  
  // Star-specific Properties
  starInnerRadiusMode: 'range',
  starInnerRadiusRange: [0.3, 0.7],
  starInnerRadiusDefine: 0.5,
  starInnerRadiusStartValue: 0.3,
  starInnerRadiusIncrement: 0.05,
  starInnerRadiusModulationEnabled: false,
  starInnerRadiusModulationValue: 1.0,
  
  // Ring-specific Properties
  ringInnerRadiusMode: 'range',
  ringInnerRadiusRange: [0.4, 0.8],
  ringInnerRadiusDefine: 0.6,
  ringInnerRadiusStartValue: 0.4,
  ringInnerRadiusIncrement: 0.05,
  ringInnerRadiusModulationEnabled: false,
  ringInnerRadiusModulationValue: 1.0,
  
  // Fill Properties
  fillEnabled: true,
  fillStyleProbability: 60, // 60% solid fill, 40% gradient fill
  
  // Fill Color Settings
  fillColorMode: 'range',
  fillColorRange: ['#3b82f6', '#8b5cf6'],
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
  fillGradientColorPalette: ['#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b'],
  fillGradientColorDefine: ['#3b82f6', '#8b5cf6', '#ef4444'],
  // HSL range controls for range mode
  fillGradientColorSaturationRange: [40, 90],
  fillGradientColorLightnessRange: [20, 80],
  fillGradientStopsRange: [2, 4],
  
  // Enhanced Gradient Type & Direction Controls
  fillGradientLinearDirection: 'range', // Default to range control
  fillGradientLinearAngleRange: [0, 360], // Default full angle range
  fillGradientLinearPredefined: 'diagonal-down', // Default predefined direction
  fillGradientLinearAlignToShape: false, // Default: don't align to shape
  fillGradientRadialCenter: 'center', // Default center positioning
  fillGradientRadialCenterX: 50, // 50% (center) X coordinate
  fillGradientRadialCenterY: 50, // 50% (center) Y coordinate
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
  
  // Conic gradient controls
  fillGradientConicCenter: 'center',
  fillGradientConicCenterX: 50,
  fillGradientConicCenterY: 50,
  fillGradientConicAngle: 0,
  
  // Fill Opacity Settings
  fillOpacityMode: 'range',
  fillOpacityRange: [70, 100],
  fillOpacityDefine: 80,
  fillOpacityStartValue: 70,
  fillOpacityIncrement: 5,
  fillOpacityModulationEnabled: false,
  fillOpacityModulationValue: 100,
  
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
  
  // Stroke Properties
  strokeEnabled: true,
  strokeProbability: 60,
  
  // Stroke Color Settings
  strokeColorMode: 'range',
  strokeColorRange: ['#ef4444', '#f59e0b'],
  strokeColorPalette: ['#ef4444', '#f59e0b', '#8b5cf6', '#10b981', '#3b82f6'],
  strokeColorDefine: '#ef4444',
  // HSL range controls for range mode
  strokeColorSaturationRange: [60, 100],
  strokeColorLightnessRange: [20, 60],
  
  // Stroke Opacity Settings
  strokeOpacityMode: 'range',
  strokeOpacityRange: [40, 100],
  strokeOpacityDefine: 80,
  strokeOpacityStartValue: 40,
  strokeOpacityIncrement: 10,
  strokeOpacityModulationEnabled: false,
  strokeOpacityModulationValue: 100,
  
  // Stroke Width Settings
  strokeWidthMode: 'range',
  strokeWidthRange: [1, 5],
  strokeWidthDefine: 3,
  strokeWidthStartValue: 1,
  strokeWidthIncrement: 0.5,
  strokeWidthModulationEnabled: false,
  strokeWidthModulationValue: 10,
  
  // Polygon Shape Properties
  polygonPropertiesEnabled: false,
  segmentCountMode: 'range',
  segmentCountRange: [3, 12],
  segmentCountDefine: 6,
  segmentCountStartValue: 3,
  segmentCountIncrement: 1,
  segmentCountModulationEnabled: false,
  segmentCountModulationValue: 20,
  
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
  
  // Shape Transforms
  transformsEnabled: false,
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
  rotationModulation: 360,
  rotationModulationEnabled: false,
  
  // Transform Randomization Scaling (0-100%)
  scaleRandomizationScale: 50,
  rotationRandomizationScale: 50,
  widthRandomizationScale: 100,
  heightRandomizationScale: 100,
  
  // Shape Effects
  shapeEffectsEnabled: false,
  
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
  };
  ellipse?: {
    segmentCountRange?: [number, number];
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
    segmentCountRange?: [number, number];
  };
  'spline-ellipse'?: {
    segmentCountRange?: [number, number];
  };
  'spline-ring'?: {
    innerRadiusRange?: [number, number];
    segmentCountRange?: [number, number];
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
  
  // Generation-specific metadata
  generationOrder: number;              // Order in which this set should be generated
  description?: string;                 // Optional description for the set
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
    
    // Export settings
    exportFormat: 'png' | 'svg' | 'json';
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
    segmentCountRange: z.tuple([z.number(), z.number()]).optional()
  }).optional(),
  ellipse: z.object({
    segmentCountRange: z.tuple([z.number(), z.number()]).optional()
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
    segmentCountRange: z.tuple([z.number(), z.number()]).optional()
  }).optional(),
  'spline-ellipse': z.object({
    segmentCountRange: z.tuple([z.number(), z.number()]).optional()
  }).optional(),
  'spline-ring': z.object({
    innerRadiusRange: z.tuple([z.number(), z.number()]).optional(),
    segmentCountRange: z.tuple([z.number(), z.number()]).optional()
  }).optional()
});

// Comprehensive BatchConfigSettings Zod schema
export const BatchConfigSettingsSchema = z.object({
  selectedPreset: z.string(),
  
  // Noise settings
  noiseEnabled: z.boolean(),
  noiseAlgorithm: z.enum(['randomise', 'perlin', 'simplex', 'fractal', 'worley', 'ridge', 'turbulence']),
  noiseScale: z.number(),
  noiseOctaves: z.number(),
  noiseAmplitude: z.number(),
  noiseSeed: z.number(),
  noiseScaleToCanvas: z.boolean(),
  noisePositionAmplitude: z.number(),
  noiseRotationAmplitude: z.number(),
  noiseScaleAmplitude: z.number(),
  noiseOpacityAmplitude: z.number(),
  noiseColorAmplitude: z.number(),
  noiseOctaveMode: z.enum(['natural', 'normalized']),
  noiseLacunarity: z.number(),
  noiseGain: z.number(),
  noiseDistanceFunction: z.enum(['euclidean', 'manhattan', 'chebyshev']),
  noiseFeaturePoints: z.number(),
  noiseRidgeOffset: z.number(),
  noiseTurbulencePower: z.number(),
  
  // Distribution settings
  distributionLayoutEnabled: z.boolean(),
  distributionPattern: z.enum(['grid', 'line', 'circle', 'spiral']),
  gridRows: z.number(),
  gridColumns: z.number(),
  gridRowOffset: z.number(),
  gridColumnOffset: z.number(),
  gridSortBy: z.enum(['layer', 'id', 'shape-type', 'fill-color', 'opacity', 'size', 'angle', 'creation-time', 'none']),
  gridSortScope: z.enum(['per-generation', 'per-batch']),
  gridSortOrder: z.enum(['ascending', 'descending']),
  gridXRandomization: z.number(),
  gridYRandomization: z.number(),
  
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
  
  // Properties
  propertiesEnabled: z.boolean(),
  shapePropertiesEnabled: z.boolean(),
  
  // Basic shape properties
  widthRange: z.tuple([z.number(), z.number()]),
  heightRange: z.tuple([z.number(), z.number()]),
  xPositionRange: z.tuple([z.number(), z.number()]),
  yPositionRange: z.tuple([z.number(), z.number()]),
  
  // Enhanced width/height
  widthMode: z.enum(['range', 'value', 'incremental']),
  heightMode: z.enum(['range', 'value', 'incremental']),
  sizeNoiseWithinRange: z.boolean(),
  sizeIncrementalResetPerBatch: z.boolean(),
  sizeNoiseMode: z.enum(['additive', 'multiplicative']),
  useMinWidthHeight: z.boolean(),
  useMaxWidthHeight: z.boolean(),
  useAvgWidthHeight: z.boolean(),
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
  maintainAspectRatio: z.boolean(),
  minimumSize: z.number(),
  maximumSize: z.number(),
  
  // Enhanced positions
  positionsEnabled: z.boolean(),
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
  xPositionModulationEnabled: z.boolean(),
  xPositionModulationValue: z.number(),
  yPositionModulationEnabled: z.boolean(),
  yPositionModulationValue: z.number(),
  
  // Shape-specific properties
  rectangleCornerRadiusMode: z.enum(['range', 'define', 'incremental']),
  rectangleCornerRadiusRange: z.tuple([z.number(), z.number()]),
  rectangleCornerRadiusDefine: z.number(),
  rectangleCornerRadiusStartValue: z.number(),
  rectangleCornerRadiusIncrement: z.number(),
  rectangleCornerRadiusModulationEnabled: z.boolean(),
  rectangleCornerRadiusModulationValue: z.number(),
  
  starInnerRadiusMode: z.enum(['range', 'define', 'incremental']),
  starInnerRadiusRange: z.tuple([z.number(), z.number()]),
  starInnerRadiusDefine: z.number(),
  starInnerRadiusStartValue: z.number(),
  starInnerRadiusIncrement: z.number(),
  starInnerRadiusModulationEnabled: z.boolean(),
  starInnerRadiusModulationValue: z.number(),
  
  ringInnerRadiusMode: z.enum(['range', 'define', 'incremental']),
  ringInnerRadiusRange: z.tuple([z.number(), z.number()]),
  ringInnerRadiusDefine: z.number(),
  ringInnerRadiusStartValue: z.number(),
  ringInnerRadiusIncrement: z.number(),
  ringInnerRadiusModulationEnabled: z.boolean(),
  ringInnerRadiusModulationValue: z.number(),
  
  // Fill properties
  fillEnabled: z.boolean(),
  fillStyleProbability: z.number(),
  fillColorMode: z.enum(['range', 'palette', 'define']),
  fillColorRange: z.tuple([z.string(), z.string()]),
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
  fillGradientColorPalette: z.array(z.string()),
  fillGradientColorDefine: z.array(z.string()),
  fillGradientColorSaturationRange: z.tuple([z.number(), z.number()]),
  fillGradientColorLightnessRange: z.tuple([z.number(), z.number()]),
  fillGradientStopsRange: z.tuple([z.number(), z.number()]),
  fillGradientLinearDirection: z.enum(['range', 'predefined']),
  fillGradientLinearAngleRange: z.tuple([z.number(), z.number()]),
  fillGradientLinearPredefined: z.enum(['horizontal', 'vertical', 'diagonal-down', 'diagonal-up']),
  fillGradientLinearAlignToShape: z.boolean(),
  fillGradientRadialCenter: z.enum(['center', 'random', 'corners', 'midpoints', 'coordinates']),
  fillGradientRadialCenterX: z.number(),
  fillGradientRadialCenterY: z.number(),
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
  fillGradientConicCenter: z.enum(['center', 'random', 'coordinates']),
  fillGradientConicCenterX: z.number(),
  fillGradientConicCenterY: z.number(),
  fillGradientConicAngle: z.number(),
  
  // Fill opacity
  fillOpacityMode: z.enum(['range', 'define', 'incremental']),
  fillOpacityRange: z.tuple([z.number(), z.number()]),
  fillOpacityDefine: z.number(),
  fillOpacityStartValue: z.number(),
  fillOpacityIncrement: z.number(),
  fillOpacityModulationEnabled: z.boolean(),
  fillOpacityModulationValue: z.number(),
  
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
  
  // Stroke properties
  strokeEnabled: z.boolean(),
  strokeProbability: z.number(),
  strokeColorMode: z.enum(['range', 'palette', 'define']),
  strokeColorRange: z.tuple([z.string(), z.string()]),
  strokeColorPalette: z.array(z.string()),
  strokeColorDefine: z.string(),
  strokeColorSaturationRange: z.tuple([z.number(), z.number()]),
  strokeColorLightnessRange: z.tuple([z.number(), z.number()]),
  strokeOpacityMode: z.enum(['range', 'define', 'incremental']),
  strokeOpacityRange: z.tuple([z.number(), z.number()]),
  strokeOpacityDefine: z.number(),
  strokeOpacityStartValue: z.number(),
  strokeOpacityIncrement: z.number(),
  strokeOpacityModulationEnabled: z.boolean(),
  strokeOpacityModulationValue: z.number(),
  strokeWidthMode: z.enum(['range', 'define', 'incremental']),
  strokeWidthRange: z.tuple([z.number(), z.number()]),
  strokeWidthDefine: z.number(),
  strokeWidthStartValue: z.number(),
  strokeWidthIncrement: z.number(),
  strokeWidthModulationEnabled: z.boolean(),
  strokeWidthModulationValue: z.number(),
  
  // Shape-specific properties
  polygonPropertiesEnabled: z.boolean(),
  segmentCountMode: z.enum(['range', 'define', 'incremental']),
  segmentCountRange: z.tuple([z.number(), z.number()]),
  segmentCountDefine: z.number(),
  segmentCountStartValue: z.number(),
  segmentCountIncrement: z.number(),
  segmentCountModulationEnabled: z.boolean(),
  segmentCountModulationValue: z.number(),
  
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
  
  // Transform properties
  transformsEnabled: z.boolean(),
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
  xTransformMode: z.enum(['range', 'value', 'incremental']),
  yTransformMode: z.enum(['range', 'value', 'incremental']),
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
  rotationModulation: z.number(),
  rotationModulationEnabled: z.boolean(),
  
  scaleRandomizationScale: z.number(),
  rotationRandomizationScale: z.number(),
  widthRandomizationScale: z.number(),
  heightRandomizationScale: z.number(),
  
  // Shape effects
  shapeEffectsEnabled: z.boolean(),
  
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
  generationOrder: z.number().min(0),
  description: z.string().optional()
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
    exportFormat: z.enum(['png', 'svg', 'json']),
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
    generationOrder: 0,
    description: undefined
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