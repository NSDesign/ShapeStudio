import { ProjectManager } from '../../client/src/lib/projectManager';
import { Shape, ShapeGroupClass } from '../../client/src/lib/shapes';
import { CanvasSettings } from '../../client/src/lib/shapeTypes';
import { BatchConfigSettings } from '../../client/src/components/BatchConfigDialog';
import * as fs from 'fs';
import * as path from 'path';

export interface SaveProjectSettings {
  projectName?: string;
  includeTimestamp?: boolean;
}

export interface ProjectSaveResult {
  success: boolean;
  filename: string;
  downloadUrl: string;
  projectData?: any;
}

export class ProjectService {
  constructor() {
    // Ensure projects directory exists
    const projectsDir = path.join(process.cwd(), 'projects');
    if (!fs.existsSync(projectsDir)) {
      fs.mkdirSync(projectsDir, { recursive: true });
    }
  }

  async saveProject(
    shapes: Shape[],
    groups: ShapeGroupClass[],
    canvasSettings: CanvasSettings,
    batchConfigSettings: BatchConfigSettings,
    enabledShapeTypes: Set<string>,
    settings: SaveProjectSettings = {}
  ): Promise<ProjectSaveResult> {
    try {
      const timestamp = new Date().toISOString();
      const name = settings.projectName || `shape-editor-${timestamp.slice(0, 10)}`;
      
      const projectData = {
        version: '1.0.0',
        timestamp,
        name,
        canvasSettings,
        batchConfigSettings,
        enabledShapeTypes: Array.from(enabledShapeTypes),
        shapes: shapes.map(shape => this.serializeShape(shape)),
        groups: groups.map(group => this.serializeGroup(group))
      };

      const filename = settings.includeTimestamp 
        ? `${name}-${timestamp.replace(/[:.]/g, '-').slice(0, -5)}.json`
        : `${name}.json`;
      
      const filePath = path.join(process.cwd(), 'projects', filename);
      const jsonData = JSON.stringify(projectData, null, 2);
      
      fs.writeFileSync(filePath, jsonData);
      
      return {
        success: true,
        filename,
        downloadUrl: `/api/projects/download/${encodeURIComponent(filename)}`,
        projectData
      };
      
    } catch (error) {
      throw new Error(`Failed to save project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getProjectFile(filename: string): Promise<string | null> {
    const filePath = path.join(process.cwd(), 'projects', filename);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    return filePath;
  }

  private serializeShape(shape: Shape): any {
    // This would need to be implemented based on the actual Shape class structure
    // For now, return a basic serialization
    return {
      type: shape.constructor.name,
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      fill: shape.fill,
      stroke: shape.stroke,
      strokeWidth: shape.strokeWidth,
      rotation: shape.rotation,
      opacity: shape.opacity,
      // Add more properties as needed based on the actual Shape class
    };
  }

  private serializeGroup(group: ShapeGroupClass): any {
    // This would need to be implemented based on the actual ShapeGroupClass structure
    // For now, return a basic serialization
    return {
      id: group.id,
      x: group.x,
      y: group.y,
      rotation: group.rotation,
      scaleX: group.scaleX,
      scaleY: group.scaleY,
      shapes: group.shapes.map(shape => this.serializeShape(shape)),
      // Add more properties as needed based on the actual ShapeGroupClass
    };
  }

  cleanupOldProjects(): void {
    // Clean up projects older than 30 days
    const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const projectsDir = path.join(process.cwd(), 'projects');
    
    if (fs.existsSync(projectsDir)) {
      const files = fs.readdirSync(projectsDir);
      
      for (const file of files) {
        const filePath = path.join(projectsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
        }
      }
    }
  }
}