# Shape Editor Pro - Replit Development Guide

## Overview
Shape Editor Pro is a web-based application for creating, manipulating, and composing geometric shapes. Built with React, TypeScript, and Express, it offers advanced features like procedural generation, boolean operations, and smart distribution algorithms. The project aims to provide a comprehensive toolset for digital artists and designers to create complex graphic compositions with ease, targeting a market for creative professionals and hobbyists seeking advanced shape manipulation capabilities.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: Shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables
- **Canvas Rendering**: HTML5 Canvas with custom rendering pipeline
- **Color Harmony**: Comprehensive system with Monochromatic, Analogous, Complementary, Triadic, Split-Complementary, and Tetradic harmonies.
- **Unified Controls**: Consolidated UI for color, fill, stroke, and shape properties.
- **Responsive Design**: Sidebar authentication adapts to collapsed/expanded states.
- **Status Indicators**: Disabled sections have clear visual cues (opacity reduction, pointer-events blocking, color-coded labels).

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Vite, Shadcn/ui, Radix UI, Tailwind CSS, custom React hooks for state management.
- **Backend**: Node.js with Express.js, TypeScript (tsx for dev), RESTful API.
- **Database**: PostgreSQL with Drizzle ORM for type-safe schema management and Drizzle Kit for migrations.
- **Shape System**: Supports geometric primitives, 2D transformations (translate, rotate, scale, skew), boolean operations (union, subtract, intersect, exclude), point-level editing, and hierarchical grouping.
- **Canvas Engine**: Infinite canvas with pan/zoom, multi-touch support, multi-selection, and optimized real-time rendering.
- **Distribution Algorithms**: Smart placement (grid, circle, spiral, organic), physics simulation, noise generation (Randomise, Perlin, Simplex, Fractal, Worley, Ridge, Turbulence), and constraint system.
- **Export System**: Multi-format support (PNG, JPEG, WebP, AVIF, SVG, BMP, PDF), high-resolution export, batch processing, and project save/load.
- **Enhanced Gradient System**: Comprehensive gradient controls with separate linear/radial probability sliders, angle range controls (min-max 0-360° in 15° increments), predefined directions with shape alignment options, advanced radial center positioning (center, random, customizable corners/midpoints selection with random/cycle modes, coordinates), radial shape controls (circle vs ellipse probability), and intelligent gradient type matching to shape geometry.
- **Authentication**: Replit OpenID Connect integration with PostgreSQL-backed session storage and database-level access control.
- **Noise System**: Pure mathematical implementation with property-specific amplitude controls, octave modes, and seeded random generation for reproducibility.
- **Properties Section Integration**: Noise ranges are controlled by enabled Properties sections (Position, Rotation, Scale, Opacity, Fill Color, Shape Size, Corner Radius, Inner Radius, Segments, Point Counts).
- **Transform Randomization Scaling**: Controls for position, scale, and rotation randomization amount.
- **Canvas-Based Blur System**: Gaussian blur algorithm implemented via direct canvas pixel manipulation for pixel-perfect blur effects.
- **Enhanced Curve System**: Mathematically accurate Bézier curves and cubic splines with proper tangent handle continuity, collinearity enforcement, and C1 smoothness. No random tangent generation to preserve mathematical integrity.

### System Design Choices
- **Data Flow**: User interaction -> State updates -> Shape generation -> Canvas rendering -> Export pipeline.
- **Session Management**: Express sessions with PostgreSQL storage for persistent user data.
- **Deployment**: Vite for frontend, ESBuild for backend, Node.js runtime, Replit autoscale deployment target.
- **Modular Design**: Separation of concerns between frontend, backend, and database layers.
- **Type Safety**: Extensive use of TypeScript across the entire stack for robust development.
- **Unified Generation System**: `generateShapesWithBatchConfig` function ensures all batch configuration settings are applied consistently for both live generation and batch exports.

## External Dependencies

- **React Ecosystem**: React 18, React DOM, React Query
- **UI Framework**: Radix UI primitives, Shadcn/ui
- **Utility Libraries**: clsx, date-fns, jsPDF
- **Database**: Drizzle ORM, Neon Database (Serverless PostgreSQL), PostgreSQL for session storage
- **Build Tools**: TypeScript, ESBuild, PostCSS, Vite plugins