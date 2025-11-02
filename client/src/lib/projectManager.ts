import { Shape, ShapeGroupClass } from './shapes';
import { CanvasSettings, ScatterSettings, ShapeType, Artboard } from './shapeTypes';
import type { GenerationSet, SidebarSectionConfig } from '@shared/schema';

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

export interface ProjectData {
  version: string;
  timestamp: string;
  name: string;
  canvasSettings: CanvasSettings;
  scatterSettings: ScatterSettings;
  enabledShapeTypes: ShapeType[];
  shapes: any[]; // Serialized shape data
  groups?: any[]; // Serialized group data (optional, only included when non-empty)
  
  // Generation Sets configuration
  generationSets?: GenerationSet[];
  currentSetId?: string | null;
  
  // Export and App Settings
  exportSettings?: ExportSettingsData;
  appSettingsDefaults?: AppSettingsDefaults;
  
  // Artboard configuration
  artboard?: Artboard;
  
  // UI configuration
  sidebarSections?: SidebarSectionConfig;
}

export class ProjectManager {
  static async saveProject(
    shapes: Shape[],
    groups: ShapeGroupClass[],
    canvasSettings: CanvasSettings,
    scatterSettings: ScatterSettings,
    enabledShapeTypes: Set<ShapeType>,
    projectName?: string,
    generationSets?: GenerationSet[],
    currentSetId?: string | null,
    exportSettings?: ExportSettingsData,
    appSettingsDefaults?: AppSettingsDefaults,
    artboard?: Artboard,
    sidebarSections?: SidebarSectionConfig
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const name = projectName || `shape-editor-${timestamp.slice(0, 10)}`;
    
    const projectData: ProjectData = {
      version: '1.0.0',
      timestamp,
      name,
      canvasSettings,
      scatterSettings,
      enabledShapeTypes: Array.from(enabledShapeTypes),
      shapes: shapes.map(shape => this.serializeShape(shape)),
      ...(groups.length > 0 && { groups: groups.map(group => this.serializeGroup(group)) }),
      ...(generationSets && { generationSets }),
      ...(currentSetId !== undefined && { currentSetId }),
      ...(exportSettings && { exportSettings }),
      ...(appSettingsDefaults && { appSettingsDefaults }),
      ...(artboard && { artboard }),
      ...(sidebarSections && { sidebarSections })
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
    canvasSettings: CanvasSettings;
    scatterSettings: ScatterSettings;
    enabledShapeTypes: Set<ShapeType>;
    projectName: string;
    generationSets?: GenerationSet[];
    currentSetId?: string | null;
    exportSettings?: ExportSettingsData;
    appSettingsDefaults?: AppSettingsDefaults;
    artboard?: Artboard;
    sidebarSections?: SidebarSectionConfig;
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const projectData: ProjectData = JSON.parse(e.target?.result as string);
          
          // Validate project data
          if (!projectData.version || !projectData.shapes) {
            throw new Error('Invalid project file format');
          }

          const shapes = projectData.shapes.map(shapeData => this.deserializeShape(shapeData));
          const groups = (projectData.groups || []).map(groupData => this.deserializeGroup(groupData));
          
          // Handle legacy export settings migration
          let exportSettings = projectData.exportSettings;
          if (exportSettings && (exportSettings as any).batchSaveProjectFiles !== undefined) {
            // Migrate legacy batchSaveProjectFiles to exportSaveProjectFiles
            exportSettings = {
              ...exportSettings,
              exportSaveProjectFiles: (exportSettings as any).batchSaveProjectFiles
            };
            delete (exportSettings as any).batchSaveProjectFiles;
          }
          
          // Complete canvasSettings defaults
          const canvasSettings: CanvasSettings = projectData.canvasSettings ? {
            width: projectData.canvasSettings.width || 1200,
            height: projectData.canvasSettings.height || 800,
            zoom: projectData.canvasSettings.zoom || 1,
            panX: projectData.canvasSettings.panX || 0,
            panY: projectData.canvasSettings.panY || 0,
            backgroundColor: projectData.canvasSettings.backgroundColor || '#1e293b',
            showGrid: projectData.canvasSettings.showGrid || false
          } : {
            width: 1200,
            height: 800,
            zoom: 1,
            panX: 0,
            panY: 0,
            backgroundColor: '#1e293b',
            showGrid: false
          };
          
          // Complete scatterSettings defaults with all required fields
          const scatterSettings: ScatterSettings = projectData.scatterSettings ? {
            onPoints: projectData.scatterSettings.onPoints || false,
            insideArea: projectData.scatterSettings.insideArea || false,
            count: projectData.scatterSettings.count || 5,
            minCount: projectData.scatterSettings.minCount || 1,
            maxCount: projectData.scatterSettings.maxCount || 10,
            shapeCountMode: projectData.scatterSettings.shapeCountMode || 'fixed',
            fixedShapeCount: projectData.scatterSettings.fixedShapeCount || 5,
            randomness: projectData.scatterSettings.randomness || 0.5,
            distribution: projectData.scatterSettings.distribution || {
              type: 'random',
              padding: 20,
              gridColumns: 5,
              gridRows: 5,
              gridSpacing: 50
            },
            shapeSpecific: projectData.scatterSettings.shapeSpecific || {}
          } : {
            onPoints: false,
            insideArea: false,
            count: 5,
            minCount: 1,
            maxCount: 10,
            shapeCountMode: 'fixed',
            fixedShapeCount: 5,
            randomness: 0.5,
            distribution: {
              type: 'random',
              padding: 20,
              gridColumns: 5,
              gridRows: 5,
              gridSpacing: 50
            },
            shapeSpecific: {}
          };
          
          resolve({
            shapes,
            groups,
            canvasSettings,
            scatterSettings,
            enabledShapeTypes: new Set(projectData.enabledShapeTypes || ['rectangle', 'circle', 'polygon']),
            projectName: projectData.name,
            generationSets: projectData.generationSets,
            currentSetId: projectData.currentSetId,
            exportSettings,
            appSettingsDefaults: projectData.appSettingsDefaults,
            artboard: projectData.artboard,
            sidebarSections: projectData.sidebarSections
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
    canvasSettings: CanvasSettings,
    scatterSettings: ScatterSettings,
    enabledShapeTypes: Set<ShapeType>
  ): string {
    const projectData: ProjectData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      name: `shape-editor-export-${Date.now()}`,
      canvasSettings,
      scatterSettings,
      enabledShapeTypes: Array.from(enabledShapeTypes),
      shapes: shapes.map(shape => this.serializeShape(shape)),
      ...(groups.length > 0 && { groups: groups.map(group => this.serializeGroup(group)) })
    };

    return JSON.stringify(projectData, null, 2);
  }
}