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
- **Distribution Algorithms**: Advanced shape placement with Grid, Auto Distribute, Wave, Ellipse, and Spiral patterns, including randomization, physics simulation, and noise generation.
  - **Server-Side Distribution**: Full support for all distribution layouts (grid, wave, ellipse, spiral, auto-distribute) with batch config settings. Server implementation matches client's two-phase approach: initial scatter followed by distribution layout application.
- **Export System**: Multi-format support (PNG, JPEG, WebP, AVIF, SVG, BMP, PDF), high-resolution export, batch processing, and project save/load.
- **Enhanced Gradient System**: Comprehensive controls for linear/radial gradients, angle ranges, predefined directions, radial center positioning, and intelligent type matching.
- **Full Spectrum Color Interpolation**: Advanced HSL interpolation for maximum color variety across ranges.
- **Authentication**: Replit OpenID Connect integration with PostgreSQL-backed session storage.
- **Noise System**: Pure mathematical implementation with property-specific amplitude controls and seeded random generation.
- **Transform Controls**: Transform origin controls (Define, Predefined Artboard, Predefined Shape) and randomization scaling for position, scale, and rotation.
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