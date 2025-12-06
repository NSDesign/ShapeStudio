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
- **Advanced UI**: Color harmony systems, unified property controls, responsive design, enhanced status indicators, and reorganized sections for Artboard and Properties.
- **UI Color Standardization**: Consistent color schemes for UI elements.
- **Artboard Sync**: Automatic selection of new artboards; functional state updates for deletion.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Shadcn/ui, Radix UI, Tailwind CSS, custom React hooks.
- **Backend**: Node.js with Express.js, TypeScript, RESTful API.
- **Database**: PostgreSQL with Drizzle ORM.
- **Shape System**: Geometric primitives, 2D transformations, boolean operations, point-level editing, hierarchical grouping.
- **Canvas Engine**: Three-layer infinite canvas with pan/zoom, multi-touch, multi-selection, and optimized real-time rendering.
- **Distribution Algorithms**: Advanced shape placement (Grid, Auto Distribute, Wave, Ellipse, Spiral) with randomization and physics simulation, supporting client/server parity.
- **Shape Masking System**: Independent top-level configuration for filtering rendered shapes (grid position filters).
- **Export System**: Multi-format support (PNG, JPEG, WebP, AVIF, SVG, BMP, PDF, TIFF), high-resolution export, batch processing, and complete application state persistence.
  - **TIFF Export**: Professional printing format via UTIF library with embedded DPI metadata, compression handling, and memory management for large exports. Includes enhanced pre-flight UX and progress display.
- **Print-on-Demand Configuration**: Per-artboard print settings including bleed, safe zone, print marks, and background modes, with unit conversion and backward compatibility.
- **Enhanced Gradient System**: Comprehensive controls for linear/radial gradients, angle ranges, and intelligent type matching.
- **Full Spectrum Color Interpolation**: Advanced HSL interpolation.
- **Authentication**: Replit OpenID Connect integration with PostgreSQL-backed session storage.
- **Transform Origin System**: Comprehensive controls with Fixed, Range, Incremental modes, predefined anchoring, and shape referencing, with client/server parity.
- **Enhanced Incremental Transform Modes**: Position (X/Y) and Rotation transforms support incremental mode with start value, increment, and modulation.
- **Position Alignment System**: Dual anchor point alignment for precise shape positioning.
- **Canvas-Based Blur System**: Gaussian blur via direct canvas pixel manipulation.
- **Enhanced Curve System**: Mathematically accurate Bézier curves and cubic splines.
- **Advanced Grid Layout Sorting**: Comprehensive sorting criteria for shapes.
- **Enhanced Grid Distribution System**: Advanced grid layout controls with start position offsets, three spacing modes, and independent axis configuration.
- **Grid Offset System**: Row/column offset controls with presets and value modes, with client/server parity via shared utilities.
- **Shared Utilities**: Common calculation functions extracted to ensure client/server parity for batch generation, gradients, and grid offsets.
- **Grid Render Mode**: Controls how shapes are positioned within grid cells (Point Mode, Cell Mode) including a debug overlay.
- **Shape Type Architecture**: Clear distinction between standard and rounded shapes.
- **Shape Sets System**: Layer management with synchronized dropdowns for shape types and generation config settings, supporting set-level positioning, blending, compositing, transforms, and alignment.
- **Hierarchical Shape Properties**: Granular control over shape dimensions and position during generation.
- **Fill Opacity Mode**: Full functionality for 'define' and 'range' modes.
- **Set Transform**: Implementation for translation, rotation, and scaling applied to all shapes within a Shape Set.
- **Artboard Alignment**: FitToArtboard and 9-point alignment for Shape Set positioning.
- **Blend Modes and Compositing Operations**: Dual-level implementation at Set-level and Shape-level, with probability-based selection.
- **Set Visibility Controls**: Visibility toggle and opacity controls with variance for Shape Sets.
- **Z-index Layering Strategy**: GenerationOrder-based z-index offset.
- **Enhanced Project Persistence**: Complete application state save/load with backward compatibility.
- **Multi-Artboard Persistence**: All artboards saved with `activeArtboardId` tracking and dimension validation.
- **Automatic Grid Recalculation**: Grid settings automatically scaled when switching artboards.
- **Artboard Info Display**: Name, dimensions, and DPI displayed with adaptive contrast.
- **Export Render Mode Selector**: UI control for choosing rendering pipeline with Auto/Client/Server options.
- **Tiled Export System**: Server-side tiled rendering pipeline for very large print files, with auto-detection, tile planning, rendering, sequential composite, metadata preservation, progress integration, and error handling.
- **SSE Streaming for Server Exports**: Real-time progress streaming via Server-Sent Events for high-resolution exports, including endpoints for initiation, streaming, download, cancellation, and client integration with typed callbacks.
- **Echo/Motion Trails System (Project A: Set-Level)**: Creates motion trail effects behind shapes with configurable direction modes (fixed-vector, auto-motion), per-echo effects (opacity falloff, blur progression, scale delta, rotation), and jitter modifiers for organic variation. Uses shared echoUtils.ts for client/server parity. Project B (Shape-Level) planned for future.
- **Shape Selection Groups (Planned)**: Future abstraction for unifying filtering logic across various features.

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
- **Utility Libraries**: clsx, date-fns, jsPDF, UTIF.
- **Database**: Drizzle ORM, Neon Database (Serverless PostgreSQL), PostgreSQL.
- **Build Tools**: TypeScript, ESBuild, PostCSS, Vite plugins.