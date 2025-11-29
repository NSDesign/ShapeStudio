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

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Shadcn/ui, Radix UI, Tailwind CSS, custom React hooks.
- **Backend**: Node.js with Express.js, TypeScript, RESTful API.
- **Database**: PostgreSQL with Drizzle ORM.
- **Shape System**: Supports geometric primitives, 2D transformations, boolean operations, point-level editing, and hierarchical grouping.
- **Canvas Engine**: Three-layer infinite canvas with pan/zoom, multi-touch, multi-selection, and optimized real-time rendering.
- **Distribution Algorithms**: Advanced shape placement with Grid, Auto Distribute, Wave, Ellipse, and Spiral patterns, including randomization and physics simulation, with client/server parity.
- **Shape Masking System**: Independent top-level configuration for filtering rendered shapes, including grid position filters (alternating, pattern, invert, priority) and planned future filters.
- **Export System**: Multi-format support (PNG, JPEG, WebP, AVIF, SVG, BMP, PDF), high-resolution export, batch processing, and complete application state persistence.
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
- **Grid Offset System**: Row/column offset controls with presets (Brick, Honeycomb, Staircase, Zigzag, Diamond) and value modes (Fixed, Range, Incremental), with client/server parity.
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
- **Utility Libraries**: clsx, date-fns, jsPDF.
- **Database**: Drizzle ORM, Neon Database (Serverless PostgreSQL), PostgreSQL.
- **Build Tools**: TypeScript, ESBuild, PostCSS, Vite plugins.