# Shape Editor Pro - Replit Development Guide

## Overview

Shape Editor Pro is a sophisticated web-based shape manipulation application built with React, TypeScript, and Express. The application provides comprehensive tools for creating, manipulating, and composing geometric shapes with advanced features like procedural generation, boolean operations, and smart distribution algorithms.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: Custom React hooks with local state management
- **Canvas Rendering**: HTML5 Canvas with custom rendering pipeline

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Development**: TypeScript with tsx for development server
- **API Structure**: RESTful endpoints with `/api` prefix
- **Session Management**: Express sessions with PostgreSQL storage
- **Build Process**: ESBuild for production bundling

### Database Architecture
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in shared TypeScript files for type safety
- **Migrations**: Drizzle Kit for schema management
- **Development Storage**: In-memory storage fallback for development

## Key Components

### Shape System
- **Shape Classes**: Comprehensive shape system supporting multiple geometric primitives
- **Transform System**: Full 2D transformation support (translate, rotate, scale, skew)
- **Boolean Operations**: Union, subtract, intersect, and exclude operations
- **Point-level Editing**: Individual point and segment manipulation
- **Group Management**: Hierarchical shape grouping system

### Canvas Engine
- **Infinite Canvas**: Virtually unlimited canvas space with pan/zoom
- **Multi-touch Support**: Touch device compatibility with gesture recognition
- **Selection System**: Multi-selection with marquee tool and individual selection
- **Real-time Rendering**: Optimized canvas rendering with shape caching

### Distribution Algorithms
- **Smart Placement**: Multiple distribution patterns (grid, circle, spiral, organic)
- **Physics Simulation**: Physics-based distribution with collision avoidance
- **Noise Generation**: Multiple noise algorithms for procedural variation
- **Constraint System**: Property ranges and distribution curves

### Export System
- **Multi-format Support**: PNG, JPEG, WebP, AVIF, SVG, BMP export
- **High-resolution Export**: Configurable scaling for print-quality output
- **Batch Processing**: Multiple artboard and selection export
- **Project Management**: Save/load project files with full state preservation

## Data Flow

1. **User Interaction**: Mouse/touch events captured by Canvas component
2. **State Updates**: useShapeEditor hook manages application state
3. **Shape Generation**: Procedural shape creation with configurable parameters
4. **Canvas Rendering**: Real-time updates to HTML5 canvas
5. **Export Pipeline**: Image generation through dedicated export system

## External Dependencies

### Core Dependencies
- **React Ecosystem**: React 18, React DOM, React Query for state synchronization
- **UI Framework**: Radix UI primitives for accessible components
- **Utility Libraries**: clsx for conditional classes, date-fns for date handling
- **Development Tools**: Vite plugins for enhanced development experience

### Database Dependencies
- **Drizzle ORM**: Modern TypeScript ORM with excellent type inference
- **Neon Database**: Serverless PostgreSQL with connection pooling
- **Session Storage**: PostgreSQL-backed session management

### Build Dependencies
- **TypeScript**: Full type safety across frontend and backend
- **ESBuild**: Fast bundling for production builds
- **PostCSS**: CSS processing with Tailwind integration

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with hot module replacement
- **Database**: PostgreSQL 16 with automatic provisioning
- **Port Configuration**: Frontend on port 5000, auto-scaling deployment

### Production Build
- **Frontend**: Vite production build with asset optimization
- **Backend**: ESBuild bundle with external package references
- **Static Assets**: Served from dist/public directory
- **Environment**: Node.js runtime with PM2 process management

### Replit Integration
- **Auto-deployment**: Replit autoscale deployment target
- **Environment Variables**: Database URL automatically provisioned
- **Development Banner**: Replit development environment integration

## Changelog

```
Changelog:
- June 24, 2025. Initial setup
- July 12, 2025. Complete Replit Auth Integration
  - Added PostgreSQL database with sessions and users tables
  - Implemented Replit OpenID Connect authentication with passport
  - Created authentication middleware and protected routes
  - Added user interface with landing page for logged-out users
  - Integrated user profile display with logout functionality
  - Database-backed session storage with automatic token refresh
  - Complete authentication flow: login, callback, logout, and protected routes
- July 13, 2025. Database-Level Access Control Implementation
  - Added database-level user authorization checking in authentication flow
  - Modified verify function to check user existence before allowing access
  - Created /access-denied page for unauthorized users with proper error messaging
  - Implemented checkUserAccess function to validate users against database
  - Updated callback route to redirect unauthorized users to access denied page
  - Created user management scripts for adding/removing authorized users
  - Added comprehensive access control documentation and demo scripts
  - Only pre-approved users in database can now access the application
- June 24, 2025. Enhanced batch configuration dialog with comprehensive property controls
  - Fixed dialog accessibility and positioning issues
  - Added detailed blend mode controls with probability weights
  - Implemented extensive property constraints including fill, stroke, shape, and transform options
  - Added safety constraint to prevent invisible shapes
- June 25, 2025. Resolved batch configuration dialog stability and functionality issues
  - Fixed portal-based positioning for centered modal independent of trigger button
  - Implemented proper z-index stacking (10002) for dropdown functionality within portal
  - Restored comprehensive settings after refactoring (11 major setting categories)
  - Updated button layout: Reset | Apply | Cancel with simplified labels
  - Applied deferred update pattern to prevent parent component remounting
- June 26, 2025. Advanced Noise System Technical Architecture Refinement
  - Clarified algorithm-specific settings for each noise type (Fractal, Worley, Ridge, Turbulence)
  - Simplified targeting to core 5 properties: Position, Rotation, Scale, Color, Opacity
  - Implemented fallback behavior: untargeted properties use Randomise (standard setting)
  - Added explicit blend mode probability mechanics with noise variation when Opacity targeted
  - Documented missing shape-specific properties requiring separate implementation
  - Added comprehensive system behavior explanation panel in dialog
- June 26, 2025. Simplified Targeting System - Property Section Enablement
  - Removed separate "Targets" section to eliminate UI duplication
  - Property section enablement (Shape Properties, Fill Properties, etc.) now serves as targeting mechanism
  - Enabled sections make their properties targetable by selected noise algorithm
  - Disabled sections use Randomise (standard setting) fallback with probability distributions
  - Updated explanations to reflect simplified approach and better user experience
- June 28, 2025. Enhanced Shape-Specific Accordion System & Comprehensive Color Harmony
  - Fixed accordion closing issue by moving state outside component function scope
  - Implemented comprehensive shape-specific property controls with accordion UI
  - Added detailed Color Harmony system with explanations for all harmony types:
    * Monochromatic: Single hue variations with lightness/saturation steps
    * Analogous: Adjacent colors with configurable hue range and color count
    * Complementary: Opposite colors with near-complement options
    * Triadic: Three evenly spaced colors with rotation offset controls
    * Split-Complementary: Base + adjacent complement colors with split angle
    * Tetradic: Four-color rectangle/square harmonies with ratio controls
  - Each harmony type includes contextual explanations and specific configuration options
  - Connected accordion controls to ScatterSettings with proper type safety
- June 28, 2025. Distribution Layout System - Grid Positioning with Additive Noise
  - Implemented comprehensive Distribution Layout section in batch configuration
  - Added grid pattern positioning with rows, columns, row/column offsets
  - Grid sorting options: layer, id, shape type, fill color, opacity, or none
  - Grid positioning works additively with noise system: grid provides base layout, noise adds variation
  - Future patterns ready: line, circle, spiral (marked as "coming soon")
  - Connected grid distribution to shape generation pipeline with proper sorting and positioning
  - Added utility functions for grid calculation and shape sorting in shapeTypes.ts
- June 28, 2025. Complete Noise System Implementation & UI Enhancements
  - Fixed persistent slider default value bug: saturation/lightness now properly start at 0% instead of 50%/30%
  - Added trash bin icon in top bar for clearing all shapes from canvas
  - Implemented comprehensive Noise System with 7 algorithms: Randomise, Perlin, Simplex, Fractal, Worley, Ridge, Turbulence
  - Each noise algorithm applies to 9 properties: position (x,y), rotation, scale (x,y), opacity, color (hue, saturation, lightness)
  - Noise works additively with grid distribution: grid provides base positioning, noise adds variation
  - Algorithm-specific settings implemented: lacunarity/gain for fractal, distance functions for Worley, ridge offset, turbulence power
  - Comprehensive seeded random generation ensures reproducible results across all noise algorithms
  - Noise applies to colors only when color harmony is disabled, maintaining harmony priority when enabled
- July 2, 2025. Critical Noise System Fixes & Value Range Normalization
  - Fixed extreme value scaling bug: noise functions now properly respect -1 to 1 input ranges
  - Corrected artboard constraint logic: "Scale to Fit Artboard" now actually constrains shapes within artboard bounds
  - Normalized all noise algorithm multipliers to reasonable ranges (±180° rotation, ±50% scale, ±30% opacity)
  - Fixed color calculation extremes that were causing black/white shapes: limited to ±60° hue, ±30% saturation, ±25% lightness
  - Eliminated diagonal positioning patterns by using independent coordinate spacing for X/Y values
  - Restored original randomization behavior when all config options are disabled
- July 2, 2025. Advanced Perlin Noise System Overhaul (Based on User Analysis)
  - Fixed Perlin noise zero-centering: removed faulty bipolar conversion, normalized perlin3D output to true [-1, 1]
  - Eliminated coordinate bias: replaced small offsets (100, 200) with large prime numbers (1117, 2221, etc.) for true independence
  - Implemented strict value range control: position ±50px/30% artboard, rotation ±45°, scale 0.75-1.25x
  - Added octave accumulation control: proper amplitude decay, final value clamping as safety net
  - Result: Perlin noise now produces centered, reasonable variations instead of extreme outliers (was 6000+ positions, now ±50px)
- July 3, 2025. Complete Noise System Standardization & Batch Config Randomise Overhaul
  - Applied Perlin improvements to all noise algorithms: Simplex, Fractal, Worley, Ridge, Turbulence with coordinate independence
  - Fixed batch config Randomise algorithm to match original non-batch behavior: eliminated diagonal patterns, boundary clustering, scale capping
  - Key insight: Original uses natural Math.random() distributions without artificial clamping for smooth, well-distributed results
  - Batch Randomise now produces: ±20px position, 0-360° rotation, 0.5-1.5x scale, natural HSL color ranges (50-100% sat, 30-70% lightness)
  - Eliminated sequential correlation using large prime offsets (4177, 7919, 15937) ensuring true independence between properties
- July 3, 2025. Advanced Noise System Architecture - Pure Mathematical Implementation
  - Implemented pure noise generation with [-1, 1] values preserving natural mathematical properties
  - Added property-specific amplitude controls: position, rotation, scale, opacity, color (0-200% range)
  - Post-processing amplitude application maintains noise algorithm characteristics
  - Natural range philosophy: unconstrained position (artboard-bounded only when enabled), minimum scale 1.0, opacity [0.1-1.0]
  - Octave modes: "Natural" for organic accumulation, "Normalized" to maintain [-1, 1] range
  - UI integration: Property amplitude sliders and octave mode selector in batch config dialog
- July 3, 2025. Noise System UI Refinements
  - Removed color and opacity amplitude controls per user request
  - Changed amplitude increments to whole numbers (1-10) instead of percentages
  - Renamed "Scale to Fit Artboard" to "Position inside Artboard" for clarity
  - Confirmed "Position inside Artboard" only affects x,y position values, not scale/size/opacity/color
- July 3, 2025. Properties Section Integration with Noise System
  - Fixed critical missing implementation: Properties sections now actually control noise ranges
  - When Properties sections are enabled, noise uses configured ranges (position, rotation, scale, opacity)
  - When disabled, noise falls back to hardcoded default values
  - Position ranges: Uses xPositionRange/yPositionRange from Shape Properties
  - Rotation range: Uses rotationRange from Transform Properties
  - Scale ranges: Uses scaleRange (uniform) or scaleXRange/scaleYRange from Transform Properties
  - Opacity range: Uses fillOpacityRange from Fill Properties
  - This enables fine-grained control over noise variation ranges through the UI
- July 3, 2025. Fill Color Range & Shape Size Implementation
  - Added missing fillColorRange property to BatchConfigSettings interface for solid color interpolation
  - Implemented color interpolation between two selected colors when Properties and Fill are enabled
  - Fixed shape size generation to use widthRange/heightRange from Shape Properties when enabled
  - Shapes now properly apply configured sizes: rectangles use width/height, circles/polygons use width as diameter
  - Lines use width/height to determine endpoint positioning with random angle
  - Both color and size ranges now work correctly with the batch configuration system
- July 3, 2025. Complete Properties Implementation
  - **Prevent Invisible Shapes**: Ensures at least fill OR stroke is always present when enabled
  - **Shape Properties**: X/Y Position ranges now control initial shape placement when Properties enabled
  - **Fill Properties**: All probabilities implemented - Fill, Color, Gradient with proper interpolation
  - **Fill Gradients**: Dynamic gradient generation with configurable stops and color interpolation
  - **Stroke Properties**: Stroke probability, width range, color probability with interpolation
  - **Stroke UI**: Added missing stroke color probability and opacity range sliders
  - **Shape Transforms**: X/Y translate, scale (uniform/non-uniform), rotation all functional
  - All properties now work independently or together, providing complete control over shape generation
- July 3, 2025. Shape-Specific Properties Integration
  - **Rectangle Corner Radius**: Configurable corner radius range (0-20px) applied to rectangle generation
  - **Star Inner Radius**: Configurable inner radius ratio (0.3-0.7) for star shape generation
  - **Ring Inner Radius**: Configurable inner radius ratio (0.4-0.8) for ring and spline-ring shapes
  - **Complete Integration**: Shape constructor now accepts batch configuration parameters
  - **Width/Height/Segments**: All shape-specific dimensions now use configured ranges instead of hardcoded values
  - **Point Counts**: Line, bezier, and spline point counts now respect UI configuration settings
  - Shape generation algorithm completely overhauled to use batch configuration when Properties sections are enabled
- July 3, 2025. Critical Shape Properties Bug Fixes
  - **Fixed Missing smooth-spline Generation**: Added missing smooth-spline case to Shape constructor
  - **Fixed Sidebar Properties Integration**: Shape constructor now receives combined batchConfig + scatterSettings
  - **Rectangle/Square Corner Radius**: Now properly uses sidebar corner radius settings when batch config is disabled
  - **Spline Curve Properties**: Point counts, open/closed probability now correctly use sidebar settings
  - **Property Integration**: Resolved disconnect between batch config and sidebar shape-specific properties
- July 4, 2025. Batch Export with Project File Saving
  - **Save Project Files Toggle**: Added optional project file saving in batch export section
  - **Comprehensive Project Data**: Each project file contains shapes, artboards, enabled shape types, and metadata
  - **Export Correlation**: Project files are linked to corresponding images with metadata including export index
  - **ZIP Package Integration**: Project files (.json) are included alongside images in the batch export ZIP
  - **Reload Capability**: Users can reload specific batched images with their exact shape configurations
  - **Metadata Tracking**: Includes generation bounds, timestamps, export mode, and shape counts for each batch
- July 4, 2025. Complete Project Loading Integration & Canvas Settings Fix
  - **Fixed Project Loading**: Implemented complete onLoadProject callback integration in useShapeEditor hook
  - **Shape Instance Recreation**: Loaded shapes are properly converted from JSON objects back to Shape class instances
  - **Canvas Settings Validation**: Fixed zoom NaN display by ensuring valid canvas settings during project loading
  - **Type Safety**: Updated all interfaces to handle project loading data types correctly
  - **State Management**: Project loading now properly updates shapes, groups, settings, and enabled shape types
  - **Error Resolution**: Fixed "getBounds is not a function" error by recreating proper Shape instances with all methods
- July 4, 2025. Distribution Layout getBounds Error Fix
  - **Fixed Grid Distribution**: Modified applyGridDistribution to preserve Shape class instances instead of creating plain objects
  - **Method Preservation**: Grid distribution now modifies shapes in-place to maintain getBounds() and other class methods
  - **Batch Configuration**: Distribution layout now works correctly with batch configuration without breaking shape functionality
  - **Error Resolution**: Eliminated "getBounds is not a function" error when using distribution layout in batch configuration
- July 5, 2025. Complete Export Format Implementation - WebP, AVIF, BMP, and PDF
  - **Added Missing Formats**: Implemented WebP, AVIF, and BMP export formats in sidebar export functionality
  - **PDF Export Integration**: Added jsPDF library and implemented proper PDF export with orientation detection
  - **Quality Control**: Extended quality settings to support WebP and AVIF lossy compression
  - **Transparency Support**: Updated background handling to preserve transparency for WebP and AVIF formats
  - **Batch Export Support**: All new formats work in single export, batch export, and ZIP batch export modes
  - **Format Detection**: Updated file extension patterns and MIME type handling for all new formats
  - **Helper Function**: Created unified exportCanvasAsFormat function to handle all export formats consistently
- July 13, 2025. Sidebar Authentication Integration - Removing Floating Overlays
  - **Removed Floating Authentication**: Eliminated absolute positioned AuthHeader overlay that was covering critical UI functions
  - **Integrated Into Sidebar**: Moved authentication to top of sidebar in document flow with proper responsive behavior
  - **Responsive Design**: Avatar shows icon only when sidebar collapsed, icon + username when expanded
  - **Dropdown Positioning**: Fixed dropdown menu positioning to adapt to sidebar state (right-aligned when collapsed, left-aligned when expanded)
  - **Clean Document Flow**: Authentication now seamlessly integrated into sidebar structure without interfering with canvas functionality
  - **Preserved Functionality**: All authentication features (login, logout, user info) maintained with improved UX
- July 13, 2025. Enhanced Position Properties & Noise Integration System
  - **Enhanced Position Properties**: Implemented 6 position modes - range, value, directional, incremental (removed percentage and edge-offset per user request)
  - **Noise Integration Toggles**: Added rangeNoiseWithinRange (noise defines values within range vs additive), noiseMode (additive vs multiplicative)
  - **Incremental Position Control**: Added incrementalResetPerBatch toggle for continuous vs per-batch incremental positioning
  - **Directional Distribution**: Added directionalEvenDistribution toggle for even 360° distribution vs clustering with configurable angle
  - **Sidebar Settings Fallback**: Disabled properties now fallback to sidebar settings instead of hardcoded defaults
  - **Batch Size Integration**: Position calculations now use actual batch size for proper directional distribution
  - **Temporal Variation Disabled**: Marked temporal variation system as future feature and disabled in current implementation
- July 24, 2025. Fill UI Restructure with Accordion Layout & Gradient Contamination Fix
  - **Fill Properties Renaming**: Changed "Fill" to "Fill Properties" for consistent section naming throughout interface
  - **Fill Accordion Structure**: Restructured Fill Properties with separate "Solid" and "Gradient" accordions under Fill Properties umbrella
  - **Separate Fill Opacity Section**: Moved fill opacity controls to independent section outside accordions for cleaner organization
  - **Repositioned Prevent Invisible Shapes**: Moved safety control between Shape Properties and Fill Properties sections for logical flow
  - **Independent Gradient Controls**: Added separate fillGradientEnabled control independent from solid fill probability
  - **Fixed Button Nesting**: Removed nested button elements in accordion triggers to eliminate DOM validation warnings
  - **Gradient Contamination Fix**: Fixed critical issue where "prevent invisible shapes" logic was overriding gradient transparent fills with random colors
  - **Enhanced Fill Logic**: Gradients with transparent fills now correctly recognized as valid fills to prevent contamination
  - **UI Consistency**: Fill controls now match gradient UI style with compact selectors and organized layout
  - **Probability Display**: Added probability percentages in accordion headers for quick reference
- July 24, 2025. Shape Types All On/Off Buttons Implementation
  - **Added Control Buttons**: Implemented "All On" and "All Off" buttons in sidebar Shape Types section
  - **Strategic Positioning**: Placed buttons between last shape type and random shape count range as requested
  - **Toggle Functionality**: All On enables all disabled shape types, All Off disables all currently enabled types
  - **UI Styling**: Compact outline buttons with consistent slate color scheme matching sidebar design
  - **Efficient Implementation**: Uses existing onToggleShapeType function to maintain state consistency
- July 24, 2025. Removed Prevent Invisible Shapes System
  - **UI Removal**: Removed "Prevent Invisible Shapes" toggle from batch configuration dialog
  - **Logic Removal**: Eliminated all preventInvisibleShapes logic from shape generation pipeline
  - **Interface Cleanup**: Removed preventInvisibleShapes property from BatchConfigSettings interface
  - **Code Simplification**: Removed forced fill color overrides and invisible shape detection
  - **Natural Behavior**: Shapes now maintain their natural transparent fills and stroke settings without forced modifications
- July 25, 2025. Complete HSL Integration and Color System Overhaul
  - **HSL Range Mode Integration**: Combined HSL controls into range mode - color swatches define hue range, separate S&L sliders define saturation/lightness ranges
  - **Removed HSL Mode**: Eliminated HSL as separate mode from Fill solid, Fill gradient, and Stroke color selectors
  - **Unified Color Generation**: Updated generateColor function to use saturation/lightness ranges when provided in range mode
  - **Fixed Stroke Color Bug**: Stroke colors now properly interpolate between range colors instead of using only the two defined colors
  - **Enhanced Range Mode**: All color sections (fill, gradient, stroke) now support integrated HSL controls in range mode
  - **Simplified Interface**: Cleaner UI with HSL controls as part of range mode rather than separate complex modes
- July 26, 2025. Critical Batch Export Architecture Fix & Random Shape Range Implementation
  - **Fixed Batch Export Architecture**: Eliminated hardcoded shape generation in batch export that bypassed all batch configuration settings
  - **Unified Generation System**: Created generateShapesWithBatchConfig function shared between regular generation and batch export
  - **Proper Random Shape Range**: Fixed Random Shape Range to simulate multiple "Generate Random Shapes" button presses per export
  - **Multiple Generation Calls**: Each batch export now makes 2-5 generation calls (based on range), each creating shapes per scatter settings
  - **Complete Batch Config Integration**: Batch exports now respect all noise algorithms, color systems, property controls, and distribution patterns
  - **Enhanced Logging**: Added detailed console logging to track generation calls and shape creation process
  - **UI Status Clarity**: Disabled and greyed out unimplemented sections (Blend Mode Control, Physics Simulation, Temporal Variation) with clear status indicators
  - **Visual Feedback**: Added opacity reduction, pointer-events blocking, and color-coded status labels to prevent user confusion
  - **Shape-Specific Properties Complete Implementation**: Fixed polygon segment counts, line point counts, and spline control point positioning
  - **Enhanced Shape Generation**: All shape-specific properties now properly integrate with batch configuration and fallback to scatter settings
  - **Point/Control Point Positioning**: Implemented configurable ranges for line point positioning and spline control point variation
  - **Polygon Segment Control**: Polygon and star shapes now respect segment count ranges from batch configuration properties
- July 26, 2025. Distribution Layout X/Y Randomization Scaling Enhancement
  - **Grid Randomization Scale Sliders**: Added X and Y randomization scale sliders (0-100%) to control existing variation in grid positioning
  - **Scaling Control**: X/Y randomization scales the existing random variation rather than adding new randomization layers
  - **Proportional Variation**: 0% removes all random variation, 100% applies full existing variation, intermediate values scale proportionally
  - **Enhanced Grid Control**: Users can fine-tune the amount of scatter applied to grid positions without additional randomization
  - **Purple Slider Styling**: Used distinct purple slider styling to differentiate scaling controls from other settings
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```