import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Upload, Download, FolderOpen } from "lucide-react";
import { ProjectManager } from '../lib/projectManager';
import { Shape, ShapeGroupClass } from '../lib/shapes';
import { CanvasSettings, ScatterSettings, ShapeType } from '../lib/shapeTypes';
import { useToast } from "@/hooks/use-toast";

interface ProjectDialogProps {
  shapes: Shape[];
  groups: ShapeGroupClass[];
  canvasSettings: CanvasSettings;
  scatterSettings: ScatterSettings;
  enabledShapeTypes: Set<ShapeType>;
  onLoadProject: (data: {
    shapes: Shape[];
    groups: ShapeGroupClass[];
    canvasSettings: CanvasSettings;
    scatterSettings: ScatterSettings;
    enabledShapeTypes: Set<ShapeType>;
  }) => void;
}

export default function ProjectDialog({
  shapes,
  groups,
  canvasSettings,
  scatterSettings,
  enabledShapeTypes,
  onLoadProject
}: ProjectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const handleSaveProject = async () => {
    if (shapes.length === 0 && groups.length === 0) {
      toast({
        title: "No content to save",
        description: "Add some shapes to the canvas before saving.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      await ProjectManager.saveProject(
        shapes,
        groups,
        canvasSettings,
        scatterSettings,
        enabledShapeTypes,
        projectName || undefined
      );
      
      toast({
        title: "Project saved successfully",
        description: `Project saved as ${projectName || 'shape-editor project'}.json`,
      });
      
      setIsOpen(false);
      setProjectName('');
    } catch (error) {
      console.error('Save failed:', error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadProject = async (file: File) => {
    setIsLoading(true);

    try {
      const projectData = await ProjectManager.loadProject(file);
      
      onLoadProject(projectData);
      
      toast({
        title: "Project loaded successfully",
        description: `Loaded project: ${projectData.projectName}`,
      });
      
      setIsOpen(false);
    } catch (error) {
      console.error('Load failed:', error);
      toast({
        title: "Load failed",
        description: error instanceof Error ? error.message : "Failed to load project file",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleLoadProject(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Project
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] bg-[var(--surface)] border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center text-white">
              <FolderOpen className="w-5 h-5 mr-2" />
              Project Manager
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Save your current work or load an existing project file.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="save" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[var(--surface-light)]">
              <TabsTrigger value="save" className="text-slate-300 data-[state=active]:text-white">
                Save Project
              </TabsTrigger>
              <TabsTrigger value="load" className="text-slate-300 data-[state=active]:text-white">
                Load Project
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="save" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-300">Project Name</Label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name (optional)"
                  className="bg-[var(--surface-light)] border-slate-600 text-white"
                />
                <div className="text-xs text-slate-400">
                  If empty, a timestamp-based name will be used
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                  className="text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProject}
                  disabled={isLoading}
                  className="bg-[var(--editor-primary)] hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Project
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="load" className="space-y-4 mt-6">
              <div className="text-center space-y-4">
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-8">
                  <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <div className="text-slate-300 mb-2">Load Project File</div>
                  <div className="text-sm text-slate-500 mb-4">
                    Select a .json project file to load
                  </div>
                  <Button
                    onClick={triggerFileSelect}
                    disabled={isLoading}
                    className="bg-[var(--editor-accent)] hover:bg-purple-700 text-white"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Choose File
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="text-xs text-amber-400">
                  ⚠ Loading a project will replace all current shapes and settings
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}