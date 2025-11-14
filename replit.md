# Shape Editor - Replit Development Guide

## Overview
Shape Editor is a web-based application for creating, manipulating, and composing geometric shapes. Built with React, TypeScript, and Express, it offers advanced features like procedural generation, boolean operations, and smart distribution algorithms. The project aims to provide a comprehensive toolset for digital artists and designers to create complex graphic compositions, targeting creative professionals and hobbyists.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Frameworks**: React 18 with TypeScript, Vite, Shadcn/ui, Radix UI.
- **Styling**: Tailwind CSS with custom CSS variables.
- **Canvas Rendering**: HTML5 Canvas with a custom rendering pipeline.
- **Advanced UI**: Features like color harmony systems, unified property controls, responsive design, and enhanced status indicators.
- **Properties Section**: Improved accordion for Canvas Settings and Quick Actions when no shapes are selected.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Shadcn/ui, Radix UI, Tailwind CSS, custom React hooks.
- **Backend**: Node.js with Express.js, TypeScript, RESTful API.
- **Database**: PostgreSQL with Drizzle ORM for type-safe schema management.
- **Shape System**: Supports geometric primitives, 2D transformations, boolean operations, point-level editing, and hierarchical grouping.
- **Canvas Engine**: Three-layer infinite canvas with pan/zoom, multi-touch, multi-selection, and optimized real-time rendering.
- **Distribution Algorithms**: Advanced shape placement with Grid, Auto Distribute, Wave, Ellipse, and Spiral patterns, including randomization and physics simulation.
  - **Server-Side Distribution**: Full support for all distribution layouts (grid, wave, ellipse, spiral, auto-distribute) with batch config settings. Server implementation matches client's two-phase approach: initial scatter followed by distribution layout application.
- **Export System**: Multi-format support (PNG, JPEG, WebP, AVIF, SVG, BMP, PDF), high-resolution export, batch processing, and enhanced project save/load with complete application state persistence.
- **Enhanced Gradient System**: Comprehensive controls for linear/radial gradients, angle ranges, predefined directions, radial center positioning, and intelligent type matching.
- **Full Spectrum Color Interpolation**: Advanced HSL interpolation for maximum color variety across ranges.
- **Authentication**: Replit OpenID Connect integration with PostgreSQL-backed session storage.
- **Transform Origin System**: Comprehensive transform origin controls with multiple modes:
  - **Define Mode**: Independent X and Y axis control with three modes each:
    - *Fixed*: Custom X/Y coordinates for static transform origin
    - *Range*: Random origin selection from X/Y min/max ranges (independent per axis)
    - *Incremental*: Progressive origin shift using start value + increment × index with optional modulation for cyclic patterns (independent per axis)
    - **Independent Axis Configuration**: X and Y can use different modes simultaneously (e.g., X fixed + Y incremental)
  - **Predefined Artboard**: 9-point alignment system anchored to artboard boundaries
  - **Shape Reference**: Reference another shape's position with configurable anchor points:
    - *Current*: Use the current shape's bounds with 9-point alignment
    - *Previous*: Reference the previous shape in generation sequence
    - *Next*: Reference the next shape in generation sequence
    - *Specific*: Reference a shape at a specific index
  - **Fallback Logic**: When referenced shape is unavailable (out of bounds), falls back to current shape's center
  - **Migration Support**: Legacy 'predefined-shape' and 'current-shape' modes automatically migrated to 'shape-reference' with mode 'current'
  - **Client/Server Parity**: Identical transform origin calculations in both frontend preview and backend export
- **Enhanced Incremental Transform Modes**: Position (X/Y) and Rotation transforms support incremental mode with start value, increment amount, and optional modulation for cyclic patterns. Uses formula: `result = startValue + ((increment × index) % modulation)`. Client/server parity maintained with non-negative modulo: `((value % m) + m) % m`. Note: Reset-per-batch controls removed due to architectural limitations (batch context not passed through generation pipeline).
- **Position Alignment System**: Dual anchor point alignment for precise shape positioning relative to artboard boundaries (Shape Anchor, Artboard Anchor).
- **Canvas-Based Blur System**: Gaussian blur implemented via direct canvas pixel manipulation.
- **Enhanced Curve System**: Mathematically accurate Bézier curves and cubic splines with proper tangent handle continuity.
- **Advanced Grid Layout Sorting**: Comprehensive sorting criteria (layer, creation-time, shape-type, size, color, opacity, angle, id) with configurable order and scope.
- **Enhanced Grid Distribution System**: Advanced grid layout controls with start position offsets, three spacing modes (Define, Auto-Centered, Auto-Edge-to-Edge), and independent axis configuration.
- **Shape Type Architecture**: Clear distinction between standard and rounded shapes (rectangle, rounded-rectangle, square, rounded-square) with specific corner radius properties.
- **Shape Sets System**: Layer management with synchronized dropdowns for shape types and generation config settings. Supports set-level positioning, blending, compositing, transforms, and alignment.
- **Fill Opacity Mode**: Full functionality for 'define' and 'range' modes.
- **Set Transform**: Implementation for translation, rotation, and scaling applied to all shapes within a Shape Set.
- **Artboard Alignment**: FitToArtboard and 9-point alignment for precise Shape Set positioning.
- **Blend Modes and Compositing Operations**: Dual-level implementation at Set-level and Shape-level, with probability-based selection for individual shapes.
- **Set Visibility Controls**: Visibility toggle and opacity controls with variance for Shape Sets.
- **Z-index Layering Strategy**: GenerationOrder-based z-index offset for proper layering of Shape Sets.
- **Enhanced Project Persistence**: Complete application state save/load including generation sets, export settings, artboard configuration, sidebar sections, and app defaults. Backward compatible with legacy project files through automatic migration of deprecated field names (e.g., batchSaveProjectFiles → exportSaveProjectFiles).

### System Design Choices
- **Data Flow**: User interaction -> State updates -> Shape generation -> Canvas rendering -> Export pipeline.
- **Session Management**: Express sessions with PostgreSQL storage.
- **Deployment**: Vite for frontend, ESBuild for backend, Node.js runtime, Replit autoscale deployment.
- **Modular Design**: Separation of concerns across frontend, backend, and database.
- **Type Safety**: Extensive TypeScript usage.
- **Unified Generation System**: `generateShapesWithBatchConfig` for consistent application of batch settings.
- **Live API Endpoints**: Comprehensive REST API (e.g., `/api/live/sets/enabled`) for capturing application state.
- **API Call Generator**: Provides multi-version API call generation with secure credential handling.

## External Dependencies

- **React Ecosystem**: React 18, React DOM, React Query.
- **UI Framework**: Radix UI primitives, Shadcn/ui.
- **Utility Libraries**: clsx, date-fns, jsPDF.
- **Database**: Drizzle ORM, Neon Database (Serverless PostgreSQL), PostgreSQL.
- **Build Tools**: TypeScript, ESBuild, PostCSS, Vite plugins.

## Future Features

### Randomization Per Repetition
When generating multiple repetitions of a shape set, each repetition could receive independent random values for enhanced variety:
- **Random Positions**: Each repetition uses fresh random scatter/distribution coordinates
- **Random Colors**: Independent color selection from ranges or palettes per repetition
- **Random Sizes**: Separate scale randomization with min/max ranges for each instance
- **Random Rotations**: Unique rotation angles within defined ranges per repetition
- **Random Shape Counts**: When count mode is "range", each repetition gets its own random count
- **Fresh Random Seeds**: Each repetition generates with a new random seed, ensuring complete independence of all random properties (gradients, blur, effects, etc.)

Result: Multiple repetitions would create truly diverse variations rather than duplicates, useful for creating organic, natural-looking compositions.

### Echo/Spread Effect
A controlled layering system that creates deliberate position offsets between repetitions:
- **Concept**: Each repetition is positioned at a predictable offset from the previous instance
- **Visual Result**: Creates a "motion blur trail," "drop shadow," or "echo" effect
- **Implementation**: Apply incremental X/Y offset to each successive repetition (e.g., +5px X, +5px Y per instance)
- **Example**: 5 repetitions with offset (5,5) would appear at positions (0,0), (5,5), (10,10), (15,15), (20,20)
- **Difference from Randomization**: Produces controlled, predictable visual patterns rather than chaotic variety
- **Combination Potential**: Could work with randomization (random properties + predictable position offsets) for creative effects

Use cases: Depth simulation, vintage print registration effects, neon glow trails, kinetic typography.

### Global Repetition Override
A toggle feature that forces global repetition settings across all shape sets while preserving individual set configurations:
- **Concept**: Temporarily override all per-set repetition settings with global values without losing the individual set configurations
- **Use Case**: Quickly test different repetition counts across all sets without manually changing each one
- **Behavior**: When enabled, all sets use global repetition settings regardless of their individual repetitionMode setting
- **Preservation**: Individual set repetition configurations remain intact and are restored when override is disabled
- **UI Implementation**: Simple checkbox/toggle in the Set Manager dialog near global repetition settings
- **Difference from Use-Global Mode**: Sets retain their current mode (fixed/range/use-global) but temporarily act as if all are set to use-global

Benefits: Rapid experimentation with different repetition counts across entire composition without modifying individual set configurations, useful for quick iteration and testing.