# Shape Editor - Replit Development Guide

## Overview
Shape Editor is a web-based application for creating, manipulating, and composing geometric shapes. It provides a comprehensive toolset for digital artists and designers to create complex graphic compositions, targeting creative professionals and hobbyists, with features like procedural generation, boolean operations, and smart distribution algorithms.

## User Preferences
Preferred communication style: Simple, everyday language.

### Development Workflow
**Client-Side First**: All new features must be fully implemented and tested on the client-side before any server-side implementation begins. Server-side parity work is deferred until the complete feature set is working correctly in the frontend preview. Do not implement server-side code for new features until explicitly requested after client testing passes.

## System Architecture

### UI/UX Decisions
- **Frameworks**: React 18 with TypeScript, Vite, Shadcn/ui, Radix UI.
- **Styling**: Tailwind CSS with custom CSS variables.
- **Canvas Rendering**: HTML5 Canvas with a custom rendering pipeline.
- **Advanced UI**: Color harmony systems, unified property controls, responsive design, and enhanced status indicators.
- **Properties Section**: Improved accordion for Canvas Settings and Quick Actions.
- **Artboard Section**: Reorganized with orange/green accent scheme, parent "Active"/"Create" tabs, and nested "Custom"/"Presets" tabs for artboard creation. Tab selections persist via localStorage.
- **UI Color Standardization**: All dropdown chevrons and NumericInput arrows use gray (#94a3b8), Select trigger text uses slate-200, tabs use isolated button appearance with flex gaps (no container backgrounds), child tabs match parent green-600 shade.
- **Artboard Sync**: Newly created artboards are automatically selected; deletion uses functional state updates to prevent stale closure issues.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Shadcn/ui, Radix UI, Tailwind CSS, custom React hooks.
- **Backend**: Node.js with Express.js, TypeScript, RESTful API.
- **Database**: PostgreSQL with Drizzle ORM.
- **Shape System**: Supports geometric primitives, 2D transformations, boolean operations, point-level editing, and hierarchical grouping.
- **Canvas Engine**: Three-layer infinite canvas with pan/zoom, multi-touch, multi-selection, and optimized real-time rendering.
- **Distribution Algorithms**: Advanced shape placement with Grid, Auto Distribute, Wave, Ellipse, and Spiral patterns, including randomization and physics simulation, with client/server parity.
- **Shape Masking System**: Independent top-level configuration for filtering rendered shapes, including grid position filters (alternating, pattern, invert, priority) and planned future filters.
- **Export System**: Multi-format support (PNG, JPEG, WebP, AVIF, SVG, BMP, PDF, TIFF), high-resolution export, batch processing, and complete application state persistence.
  - **TIFF Export (Phase 2)**: Professional printing format via UTIF library with embedded DPI metadata (XResolution, YResolution, ResolutionUnit tags).
    - **Compression**: UTIF.js auto-detects pako for deflate compression. For reliable encoding: don't set t259 metadata for deflate (let UTIF auto-detect), only set t259=[1] to explicitly disable compression.
    - **Limitations**: LZW compression (5) is NOT supported for encoding. Deflate compression only works reliably with 8-bit data; 16-bit exports automatically fall back to uncompressed.
  - **TIFF Memory Management**: Automatic batch size limiting and sequential processing with memory cleanup for large TIFF exports. Estimates memory requirements based on canvas dimensions and DPI, reduces batch count when approaching browser limits (~600 MB threshold), and pauses between images to allow garbage collection.
  - **TIFF Pre-flight UX**: Enhanced user experience for TIFF batch exports including:
    - Pre-flight confirmation modal with memory estimation and effective batch count display
    - "Don't show again" option with persisted user preference (skipTiffPreflightModal)
    - Inline validation warnings when DPI < 300, bleed disabled, or background is transparent
    - Reset capability for dismissed warnings in Settings > Export tab
  - **Export Progress UI**: Enhanced batch export progress display with:
    - Real-time elapsed time tracking (mm:ss format) displayed alongside progress percentage
    - Cancel button to abort ongoing exports with AbortController integration
    - Multiple abort checkpoints throughout export loop (after shape generation, after image creation)
    - Timer cleanup in finally block ensures proper resource management
- **Print-on-Demand Configuration (Phase 1)**: Print configuration system with printConfig stored per-artboard, supporting:
  - **Bleed**: Configurable amount/unit (px/mm/cm/in), display overlay on canvas (red dashed), render to export (expands dimensions by 2× bleed on each axis).
  - **Safe Zone**: Configurable amount/unit, display overlay on canvas (green dashed inset), display-only (not rendered to export).
  - **Print Marks**: Crop marks and registration marks with configurable mark length and offset, display overlay and render to export (adds gutter beyond bleed for marks).
  - **Background Mode**: Transparent, Artboard color, or Custom color for export background, with display and render toggles.
  - **Unit Conversion**: Automatic px/mm/cm/in conversion based on artboard DPI.
  - **Backward Compatibility**: Legacy projects without printConfig use DEFAULT_PRINT_CONFIG.
- **Enhanced Gradient System**: Comprehensive controls for linear/radial gradients, angle ranges, and intelligent type matching.
- **Full Spectrum Color Interpolation**: Advanced HSL interpolation.
- **Authentication**: Replit OpenID Connect integration with PostgreSQL-backed session storage.
- **Transform Origin System**: Comprehensive controls with Fixed, Range, Incremental modes, predefined artboard/shape anchoring, shape referencing, and client/server parity.
- **Enhanced Incremental Transform Modes**: Position (X/Y) and Rotation transforms support incremental mode with start value, increment, and modulation, maintaining client/server parity.
- **Position Alignment System**: Dual anchor point alignment for precise shape positioning relative to artboard boundaries.
- **Canvas-Based Blur System**: Gaussian blur via direct canvas pixel manipulation.
- **Enhanced Curve System**: Mathematically accurate Bézier curves and cubic splines.
- **Advanced Grid Layout Sorting**: Comprehensive sorting criteria (layer, creation-time, shape-type, size, color, opacity, angle, id).
- **Enhanced Grid Distribution System**: Advanced grid layout controls with start position offsets, three spacing modes (Define, Auto-Centered, Auto-Edge-to-Edge), and independent axis configuration.
- **Grid Offset System**: Row/column offset controls with presets (Brick, Honeycomb, Staircase, Zigzag, Diamond) and value modes (Fixed, Range, Incremental), with client/server parity via shared utilities in `shared/gridOffsetUtils.ts`.
- **Shared Utilities**: Common calculation functions extracted to `shared/` directory to ensure client/server parity:
  - `shared/batchUtils.ts`: Linear angle, conic/radial center calculations for batch generation
  - `shared/gradientUtils.ts`: Linear, radial, conic gradient coordinate calculations
  - `shared/gridOffsetUtils.ts`: Grid offset calculations (fixed/range/incremental modes) and position masking
- **Grid Render Mode**: Controls how shapes are positioned within grid cells (Point Mode, Cell Mode with fit options and padding), including a debug grid overlay.
- **Shape Type Architecture**: Clear distinction between standard and rounded shapes with specific corner radius properties.
- **Shape Sets System**: Layer management with synchronized dropdowns for shape types and generation config settings, supporting set-level positioning, blending, compositing, transforms, and alignment.
- **Hierarchical Shape Properties**: Shape Properties section with independent Dimensions (width/height/radius/innerRadius/cornerRadius) and Position (X/Y offsets) sub-toggles for granular control over which properties are applied during generation.
- **Fill Opacity Mode**: Full functionality for 'define' and 'range' modes.
- **Set Transform**: Implementation for translation, rotation, and scaling applied to all shapes within a Shape Set.
- **Artboard Alignment**: FitToArtboard and 9-point alignment for precise Shape Set positioning.
- **Blend Modes and Compositing Operations**: Dual-level implementation at Set-level and Shape-level, with probability-based selection.
- **Set Visibility Controls**: Visibility toggle and opacity controls with variance for Shape Sets.
- **Z-index Layering Strategy**: GenerationOrder-based z-index offset for proper layering.
- **Enhanced Project Persistence**: Complete application state save/load with backward compatibility.
- **Multi-Artboard Persistence**: All artboards are saved to `savedArtboards` array with `activeArtboardId` tracking, with automatic dimension validation per artboard during restore. Maintains backward compatibility with legacy single-artboard fields.
- **Automatic Grid Recalculation**: When switching artboards with different dimensions, grid settings are automatically scaled via `recalculateGridForArtboard` utility. Only "define" mode settings (gridRowOffset, gridColumnOffset, gridStartX, gridStartY, gridMarginValue) are scaled based on artboard dimension ratios; auto modes (auto-centered, auto-edge-to-edge) recalculate automatically from artboard bounds. When shape sets are enabled, updated grid config requires explicit Apply to persist to set.
- **Artboard Info Display**: Name, dimensions, and DPI displayed in a rounded container at top-right of artboard, positioned above all print overlays (bleed, safe zone, print marks). Container uses adaptive contrast (dark on light backgrounds, light on dark backgrounds) with semi-transparent background. Position calculation accounts for bleed area and print marks gutter scaled by zoom level.
- **Export Render Mode Selector**: UI control for choosing rendering pipeline with Auto/Client/Server options:
  - **Auto** (default): Smart detection based on export size, format, and DPI - automatically chooses optimal renderer
  - **Client**: Force browser-based rendering for quick exports (subject to browser canvas limits)
  - **Server**: Force server-side rendering via Headless Chromium + Sharp for large/high-quality exports

### System Design Choices
- **Data Flow**: User interaction -> State updates -> Shape generation -> Canvas rendering -> Export pipeline.
- **Session Management**: Express sessions with PostgreSQL storage.
- **Deployment**: Vite for frontend, ESBuild for backend, Node.js runtime, Replit autoscale deployment.
- **Modular Design**: Separation of concerns across frontend, backend, and database.
- **Type Safety**: Extensive TypeScript usage.
- **Unified Generation System**: `generateShapesWithBatchConfig` for consistent application of batch settings.
- **Live API Endpoints**: Comprehensive REST API for capturing application state.
- **API Call Generator**: Provides multi-version API call generation with secure credential handling.

## External Dependencies

- **React Ecosystem**: React 18, React DOM, React Query.
- **UI Framework**: Radix UI primitives, Shadcn/ui.
- **Utility Libraries**: clsx, date-fns, jsPDF, UTIF (TIFF encoding/decoding).
- **Database**: Drizzle ORM, Neon Database (Serverless PostgreSQL), PostgreSQL.
- **Build Tools**: TypeScript, ESBuild, PostCSS, Vite plugins.