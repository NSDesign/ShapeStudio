import { Shape, ShapeGroupClass } from './shapes';
import { CanvasSettings, ScatterSettings, ShapeType, Artboard } from './shapeTypes';
import type { GenerationSet, SidebarSectionConfig } from '@shared/schema';
import { migrateSizeConstraintMode } from '@shared/schema';

export interface AppSettingsDefaults {
  exportFormat?: string;
  exportQuality?: number;
  exportScale?: number;
  exportMode?: string;
  artboardWidth?: number;
  artboardHeight?: number;
  artboardBackgroundColor?: string;
  artboardDisplayGrid?: boolean;
  artboardDisplayBorder?: boolean;
}

export interface ExportSettingsData {
  batchExportMode?: string;
  enableGenerationSets?: boolean;
  batchCount?: number;
  exportSaveProjectFiles?: boolean; // Match shared/schema.ts naming
}

export interface ArtboardConfig {
  width: number;
  height: number;
  backgroundColor: string;
  dpi?: number;
  unitType?: 'pixels' | 'mm' | 'cm' | 'inches';
  displayGrid?: boolean;
  displayBorder?: boolean;
  displayName?: boolean;
  displayDimensions?: boolean;
  displayResolution?: boolean;
  name?: string;
}

export interface ProjectData {
  version: string;
  timestamp: string;
  name: string;
  shapes: any[]; // Serialized shape data
  groups?: any[]; // Serialized group data (optional, only included when non-empty)
  artboard: ArtboardConfig; // Minimal artboard config for reproducing exports
}

export class ProjectManager {
  static async saveProject(
    shapes: Shape[],
    groups: ShapeGroupClass[],
    artboard: Artboard,
    projectName?: string
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const name = projectName || `shape-editor-${timestamp.slice(0, 10)}`;
    
    const projectData: ProjectData = {
      version: '1.0.0',
      timestamp,
      name,
      shapes: shapes.map(shape => this.serializeShape(shape)),
      ...(groups.length > 0 && { groups: groups.map(group => this.serializeGroup(group)) }),
      artboard: {
        width: artboard.width,
        height: artboard.height,
        backgroundColor: artboard.backgroundColor || '#ffffff',
        dpi: artboard.dpi ?? 72,
        unitType: artboard.unitType ?? 'pixels',
        displayGrid: artboard.displayGrid ?? false,
        displayBorder: artboard.displayBorder ?? true,
        displayName: artboard.displayName ?? true,
        displayDimensions: artboard.displayDimensions ?? false,
        displayResolution: artboard.displayResolution ?? false,
        name: artboard.name
      }
    };

    const jsonData = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static async loadProject(file: File): Promise<{
    shapes: Shape[];
    groups: ShapeGroupClass[];
    artboard: ArtboardConfig;
    projectName: string;
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const projectData: any = JSON.parse(e.target?.result as string);
          
          // Validate project data
          if (!projectData.version || !projectData.shapes) {
            throw new Error('Invalid project file format');
          }

          const shapes = projectData.shapes.map((shapeData: any) => this.deserializeShape(shapeData));
          const groups = (projectData.groups || []).map((groupData: any) => this.deserializeGroup(groupData));
          
          // Extract artboard config (with backwards compatibility for legacy files)
          let artboard: ArtboardConfig;
          if (projectData.artboard) {
            artboard = {
              width: projectData.artboard.width || 1200,
              height: projectData.artboard.height || 800,
              backgroundColor: projectData.artboard.backgroundColor || '#ffffff',
              dpi: projectData.artboard.dpi ?? 72,
              unitType: projectData.artboard.unitType ?? 'pixels',
              displayGrid: projectData.artboard.displayGrid ?? false,
              displayBorder: projectData.artboard.displayBorder ?? true,
              displayName: projectData.artboard.displayName ?? true,
              displayDimensions: projectData.artboard.displayDimensions ?? false,
              displayResolution: projectData.artboard.displayResolution ?? false,
              name: projectData.artboard.name
            };
          } else if (projectData.canvasSettings) {
            // Legacy compatibility: extract from canvasSettings
            artboard = {
              width: projectData.canvasSettings.width || 1200,
              height: projectData.canvasSettings.height || 800,
              backgroundColor: projectData.canvasSettings.backgroundColor || '#ffffff',
              dpi: 72,
              unitType: 'pixels',
              displayGrid: false,
              displayBorder: true,
              displayName: true,
              displayDimensions: false,
              displayResolution: false
            };
          } else {
            // Default fallback
            artboard = {
              width: 1200,
              height: 800,
              backgroundColor: '#ffffff',
              dpi: 72,
              unitType: 'pixels',
              displayGrid: false,
              displayBorder: true,
              displayName: true,
              displayDimensions: false,
              displayResolution: false
            };
          }
          
          resolve({
            shapes,
            groups,
            artboard,
            projectName: projectData.name
          });
        } catch (error) {
          reject(new Error(`Failed to load project: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private static serializeShape(shape: Shape): any {
    return {
      id: shape.id,
      type: shape.type,
      transform: shape.transform,
      properties: shape.properties,
      points: shape.points,
      sides: shape.sides,
      radius: shape.radius,
      innerRadius: shape.innerRadius,
      width: shape.width,
      height: shape.height,
      controlPoints: shape.controlPoints,
      closed: shape.closed
    };
  }

  private static serializeGroup(group: ShapeGroupClass): any {
    return {
      id: group.id,
      shapes: group.shapes.map(shape => this.serializeShape(shape)),
      transform: group.transform
    };
  }

  private static deserializeShape(data: any): Shape {
    const shape = new Shape(data.type, data.transform.x, data.transform.y);
    
    // Restore all properties
    shape.id = data.id;
    shape.transform = data.transform;
    shape.properties = data.properties;
    shape.selected = false;
    shape.points = data.points || [];
    shape.sides = data.sides;
    shape.radius = data.radius;
    shape.innerRadius = data.innerRadius;
    shape.width = data.width;
    shape.height = data.height;
    shape.controlPoints = data.controlPoints;
    shape.closed = data.closed;
    
    return shape;
  }

  private static deserializeGroup(data: any): ShapeGroupClass {
    const shapes = data.shapes.map((shapeData: any) => this.deserializeShape(shapeData));
    const group = new ShapeGroupClass(shapes);
    
    group.id = data.id;
    group.transform = data.transform;
    group.selected = false;
    
    return group;
  }

  static exportAsJSON(
    shapes: Shape[],
    groups: ShapeGroupClass[],
    artboard: Artboard
  ): string {
    const projectData: ProjectData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      name: `shape-editor-export-${Date.now()}`,
      shapes: shapes.map(shape => this.serializeShape(shape)),
      ...(groups.length > 0 && { groups: groups.map(group => this.serializeGroup(group)) }),
      artboard: {
        width: artboard.width,
        height: artboard.height,
        backgroundColor: artboard.backgroundColor || '#ffffff'
      }
    };

    return JSON.stringify(projectData, null, 2);
  }
}