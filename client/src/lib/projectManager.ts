import { Shape, ShapeGroupClass } from './shapes';
import { CanvasSettings, ScatterSettings, ShapeType } from './shapeTypes';

export interface ProjectData {
  version: string;
  timestamp: string;
  name: string;
  canvasSettings: CanvasSettings;
  scatterSettings: ScatterSettings;
  enabledShapeTypes: ShapeType[];
  shapes: any[]; // Serialized shape data
  groups?: any[]; // Serialized group data (optional, only included when non-empty)
}

export class ProjectManager {
  static async saveProject(
    shapes: Shape[],
    groups: ShapeGroupClass[],
    canvasSettings: CanvasSettings,
    scatterSettings: ScatterSettings,
    enabledShapeTypes: Set<ShapeType>,
    projectName?: string
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
      ...(groups.length > 0 && { groups: groups.map(group => this.serializeGroup(group)) })
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
          
          resolve({
            shapes,
            groups,
            canvasSettings: projectData.canvasSettings || {
              width: 1200,
              height: 800,
              zoom: 1,
              panX: 0,
              panY: 0
            },
            scatterSettings: projectData.scatterSettings || {
              onPoints: false,
              insideArea: false,
              count: 5,
              randomness: 0.5
            },
            enabledShapeTypes: new Set(projectData.enabledShapeTypes || ['rectangle', 'circle', 'polygon']),
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