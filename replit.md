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
- June 24, 2025. Enhanced batch configuration dialog with comprehensive property controls
  - Fixed dialog accessibility and positioning issues
  - Added detailed blend mode controls with probability weights
  - Implemented extensive property constraints including fill, stroke, shape, and transform options
  - Added safety constraint to prevent invisible shapes
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```