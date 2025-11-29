import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Shapes,
  MousePointer,
  Layers,
  Settings,
  Package,
  Grid3X3,
  Monitor,
  Palette,
  FolderOpen,
  Download,
  Loader2,
  Save,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  GripVertical,
  PanelLeft,
  FileOutput,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useExportSettings } from '@/hooks/useUserPreferences';
import type { SidebarSectionConfig, UserPreferences } from '@shared/schema';
import { DEFAULT_SIDEBAR_SECTIONS } from '@shared/schema';

interface SidebarSettingsDialogProps {
  children: React.ReactNode;
}

// Sidebar section definitions with metadata (order matches default displayOrder in schema)
const SIDEBAR_SECTIONS = [
  {
    key: 'shapes' as keyof SidebarSectionConfig,
    name: 'Shape Types',
    description: 'Select and configure different shape types for generation',
    icon: Shapes,
  },
  {
    key: 'layers' as keyof SidebarSectionConfig,
    name: 'Layers',
    description: 'Manage layer order, blend modes, and z-index operations',
    icon: Layers,
  },
  {
    key: 'properties' as keyof SidebarSectionConfig,
    name: 'Properties',
    description: 'Adjust shape properties like position, scale, rotation, and skew',
    icon: Settings,
  },
  {
    key: 'artboards' as keyof SidebarSectionConfig,
    name: 'Artboards',
    description: 'Manage different canvas sizes and artboard presets',
    icon: Monitor,
  },
  {
    key: 'project' as keyof SidebarSectionConfig,
    name: 'Project Management',
    description: 'Save, load, and manage your shape projects',
    icon: FolderOpen,
  },
  {
    key: 'export' as keyof SidebarSectionConfig,
    name: 'Export & Save',
    description: 'Export your creations to various file formats',
    icon: Download,
  },
  {
    key: 'selection' as keyof SidebarSectionConfig,
    name: 'Selection Modes',
    description: 'Switch between shape, point, and segment editing modes',
    icon: MousePointer,
  },
  {
    key: 'composition' as keyof SidebarSectionConfig,
    name: 'Composition',
    description: 'Boolean operations and shape composition tools',
    icon: Package,
  },
  {
    key: 'align-distribute' as keyof SidebarSectionConfig,
    name: 'Align & Distribute',
    description: 'Alignment and distribution tools for selected shapes',
    icon: Grid3X3,
  },
  {
    key: 'colors' as keyof SidebarSectionConfig,
    name: 'Color Manipulation',
    description: 'Advanced color adjustment and manipulation tools',
    icon: Palette,
  },
] as const;

export default function SidebarSettingsDialog({ children }: SidebarSettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<SidebarSectionConfig | null>(null);
  const [draggedSectionKey, setDraggedSectionKey] = useState<keyof SidebarSectionConfig | null>(null);
  const [dragOverSectionKey, setDragOverSectionKey] = useState<keyof SidebarSectionConfig | null>(null);
  const { toast} = useToast();
  const queryClient = useQueryClient();

  // Fetch user preferences
  const { data: preferences, isLoading: isLoadingPreferences, error: preferencesError } = useQuery<UserPreferences>({
    queryKey: ['/api/user/preferences'],
    staleTime: 0, // Always refetch when invalidated
    retry: 1, // Reduce retries for faster failure
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (sidebarSections: SidebarSectionConfig) => {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sidebarSections }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Update local settings with confirmed server response
      if (data && data.sidebarSections) {
        setLocalSettings(data.sidebarSections as SidebarSectionConfig);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      toast({
        title: 'Settings Saved',
        description: 'Your sidebar preferences have been updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Failed to update preferences:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save your sidebar preferences. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Normalize sidebar sections from old boolean format to new object format
  const normalizeSidebarSections = (sections: any): SidebarSectionConfig => {
    const normalized: SidebarSectionConfig = {} as SidebarSectionConfig;
    
    // First, populate all keys from defaults
    Object.keys(DEFAULT_SIDEBAR_SECTIONS).forEach((key) => {
      const defaultValue = DEFAULT_SIDEBAR_SECTIONS[key as keyof SidebarSectionConfig];
      normalized[key as keyof SidebarSectionConfig] = { ...defaultValue };
    });
    
    // If no persisted sections, return defaults
    if (!sections) return normalized;
    
    // For each persisted key, override the default
    Object.keys(sections).forEach((key) => {
      const value = sections[key];
      const typedKey = key as keyof SidebarSectionConfig;
      
      // If it's a boolean (old format), convert to object preserving the boolean value
      if (typeof value === 'boolean') {
        normalized[typedKey] = {
          enabled: value,
          displayOrder: DEFAULT_SIDEBAR_SECTIONS[typedKey]?.displayOrder ?? 999
        };
      }
      // If it's already an object (new format), use it
      else if (typeof value === 'object' && value !== null) {
        normalized[typedKey] = {
          enabled: value.enabled !== undefined ? value.enabled : DEFAULT_SIDEBAR_SECTIONS[typedKey]?.enabled ?? true,
          displayOrder: value.displayOrder ?? DEFAULT_SIDEBAR_SECTIONS[typedKey]?.displayOrder ?? 999
        };
      }
    });
    
    return normalized;
  };

  // Initialize local settings when preferences load (only if no local changes exist)
  useEffect(() => {
    if (preferences && preferences.sidebarSections && !localSettings) {
      // Normalize to ensure all values are objects, not booleans
      const normalized = normalizeSidebarSections(preferences.sidebarSections);
      setLocalSettings(normalized);
    }
  }, [preferences, localSettings]);

  // Handle section toggle
  const handleSectionToggle = (sectionKey: keyof SidebarSectionConfig, enabled: boolean) => {
    if (!localSettings) return;
    
    const updatedSettings = {
      ...localSettings,
      [sectionKey]: {
        ...localSettings[sectionKey],
        enabled,
      },
    };
    setLocalSettings(updatedSettings);
  };

  // Reset to defaults
  const resetToDefaults = async () => {
    try {
      const { DEFAULT_SIDEBAR_SECTIONS } = await import('@shared/schema');
      setLocalSettings(DEFAULT_SIDEBAR_SECTIONS);
      toast({
        title: 'Reset to Defaults',
        description: 'Sidebar settings have been reset to default configuration.',
      });
    } catch (error) {
      console.error('Failed to load default settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset to default settings.',
        variant: 'destructive',
      });
    }
  };

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, sectionKey: keyof SidebarSectionConfig) => {
    setDraggedSectionKey(sectionKey);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, sectionKey: keyof SidebarSectionConfig) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSectionKey(sectionKey);
  };

  const handleDragEnd = () => {
    setDraggedSectionKey(null);
    setDragOverSectionKey(null);
  };

  const handleDrop = (e: React.DragEvent, targetKey: keyof SidebarSectionConfig) => {
    e.preventDefault();
    
    if (!localSettings || !draggedSectionKey || draggedSectionKey === targetKey) return;

    const draggedOrder = localSettings[draggedSectionKey].displayOrder;
    const targetOrder = localSettings[targetKey].displayOrder;

    // Reindex all sections like Sets Manager
    const allSections = Object.keys(localSettings) as (keyof SidebarSectionConfig)[];
    const sortedSections = allSections
      .map(key => ({ key, displayOrder: localSettings[key].displayOrder }))
      .sort((a, b) => a.displayOrder - b.displayOrder);

    // Remove dragged item and insert at target position
    const draggedIndex = sortedSections.findIndex(s => s.key === draggedSectionKey);
    const targetIndex = sortedSections.findIndex(s => s.key === targetKey);
    
    const [removed] = sortedSections.splice(draggedIndex, 1);
    sortedSections.splice(targetIndex, 0, removed);

    // Reindex with sequential displayOrder values
    const updatedSettings: SidebarSectionConfig = { ...localSettings };
    sortedSections.forEach((section, index) => {
      updatedSettings[section.key] = {
        ...localSettings[section.key],
        displayOrder: index + 1, // Start from 1
      };
    });

    setLocalSettings(updatedSettings);
    setDraggedSectionKey(null);
    setDragOverSectionKey(null);
  };

  // Move section up/down
  const handleMoveSection = (sectionKey: keyof SidebarSectionConfig, direction: 'up' | 'down') => {
    if (!localSettings) return;

    // Reindex all sections like Sets Manager
    const allSections = Object.keys(localSettings) as (keyof SidebarSectionConfig)[];
    const sortedSections = allSections
      .map(key => ({ key, displayOrder: localSettings[key].displayOrder }))
      .sort((a, b) => a.displayOrder - b.displayOrder);

    // Find current index
    const currentIndex = sortedSections.findIndex(s => s.key === sectionKey);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    // Check bounds
    if (targetIndex < 0 || targetIndex >= sortedSections.length) return;

    // Remove and insert at new position
    const [removed] = sortedSections.splice(currentIndex, 1);
    sortedSections.splice(targetIndex, 0, removed);

    // Reindex with sequential displayOrder values
    const updatedSettings: SidebarSectionConfig = { ...localSettings };
    sortedSections.forEach((section, index) => {
      updatedSettings[section.key] = {
        ...localSettings[section.key],
        displayOrder: index + 1, // Start from 1
      };
    });

    setLocalSettings(updatedSettings);
  };

  // Save changes
  const handleSave = () => {
    if (!localSettings) return;
    updatePreferencesMutation.mutate(localSettings);
  };

  // Check if settings have changed
  const hasChanges = localSettings && preferences && preferences.sidebarSections && 
    JSON.stringify(localSettings) !== JSON.stringify(preferences.sidebarSections);

  // Export settings management
  const { exportSettings, updateExportSettings } = useExportSettings();
  
  // Reset export warnings handler
  const handleResetExportWarnings = () => {
    updateExportSettings.mutate({ skipTiffPreflightModal: false });
    toast({
      title: 'Export Warnings Reset',
      description: 'TIFF pre-flight confirmation will be shown again.',
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setLocalSettings(null); }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[90vh] bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="sidebar" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800">
            <TabsTrigger value="sidebar" className="data-[state=active]:bg-slate-700 flex items-center gap-2">
              <PanelLeft className="w-4 h-4" />
              Sidebar
            </TabsTrigger>
            <TabsTrigger value="export" className="data-[state=active]:bg-slate-700 flex items-center gap-2">
              <FileOutput className="w-4 h-4" />
              Export
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="sidebar" className="mt-4">
            <div className="space-y-4">
              {isLoadingPreferences || !localSettings ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  <span className="ml-2 text-slate-400">Loading preferences...</span>
                </div>
              ) : (
                <>
                  <ScrollArea className="h-[35vh] w-full">
                    <div className="space-y-2 pr-4">
                      {SIDEBAR_SECTIONS
                        .slice()
                        .sort((a, b) => {
                          const orderA = localSettings[a.key]?.displayOrder ?? 0;
                          const orderB = localSettings[b.key]?.displayOrder ?? 0;
                          return orderA - orderB;
                        })
                        .map((section, index, sortedArray) => {
                        const IconComponent = section.icon;
                        const isEnabled = localSettings[section.key]?.enabled ?? false;
                        const currentOrder = localSettings[section.key]?.displayOrder ?? 0;
                        const minOrder = Math.min(...Object.values(localSettings).map(v => v.displayOrder));
                        const maxOrder = Math.max(...Object.values(localSettings).map(v => v.displayOrder));
                        
                        return (
                          <div
                            key={section.key}
                            className={`flex items-start gap-2 p-3 rounded-lg bg-slate-800/50 border transition-colors ${
                              dragOverSectionKey === section.key 
                                ? 'border-blue-400' 
                                : 'border-slate-700/50'
                            }`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, section.key)}
                            onDragOver={(e) => handleDragOver(e, section.key)}
                            onDragEnd={handleDragEnd}
                            onDrop={(e) => handleDrop(e, section.key)}
                            data-testid={`sidebar-setting-${section.key}`}
                          >
                            {/* Drag Handle */}
                            <GripVertical className="w-4 h-4 mt-0.5 text-slate-500 cursor-move" data-testid={`handle-drag-${section.key}`} />
                            
                            {/* Icon and Content */}
                            <div className="flex items-start gap-3 flex-1">
                              <IconComponent className={`w-5 h-5 mt-0.5 transition-colors ${
                                isEnabled ? 'text-blue-400' : 'text-slate-500'
                              }`} />
                              <div className="space-y-1 flex-1">
                                <Label className={`text-sm font-medium transition-colors ${
                                  isEnabled ? 'text-slate-200' : 'text-slate-400'
                                }`}>
                                  {section.name}
                                </Label>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                  {section.description}
                                </p>
                              </div>
                            </div>
                            
                            {/* Controls: Chevrons and Switch */}
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveSection(section.key, 'up');
                                }}
                                disabled={currentOrder === minOrder}
                                data-testid={`button-move-up-${section.key}`}
                                aria-label={`Move ${section.name} up`}
                              >
                                <ChevronUp className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveSection(section.key, 'down');
                                }}
                                disabled={currentOrder === maxOrder}
                                data-testid={`button-move-down-${section.key}`}
                                aria-label={`Move ${section.name} down`}
                              >
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => handleSectionToggle(section.key, checked)}
                                data-testid={`switch-${section.key}`}
                                className="data-[state=checked]:bg-blue-600 ml-2"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  <Separator className="bg-slate-700" />

                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetToDefaults}
                      className="text-slate-300 border-slate-600 hover:bg-slate-800 hover:text-slate-100"
                      data-testid="button-reset-defaults"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Defaults
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleSave}
                        disabled={!hasChanges || updatePreferencesMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        data-testid="button-save-settings"
                      >
                        {updatePreferencesMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="export" className="mt-4">
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 space-y-4">
                <div>
                  <Label className="text-sm font-medium text-slate-200">Export Warnings</Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage confirmation dialogs that appear before export operations.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded border border-slate-700/30">
                    <div className="flex-1">
                      <Label className="text-sm text-slate-300">TIFF Pre-flight Confirmation</Label>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Shows memory estimate and print-ready warnings before TIFF batch exports
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {exportSettings.skipTiffPreflightModal ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetExportWarnings}
                          className="text-slate-300 border-slate-600 hover:bg-slate-700 text-xs"
                          data-testid="button-reset-tiff-warning"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Re-enable
                        </Button>
                      ) : (
                        <span className="text-xs text-green-400 px-2 py-1 bg-green-900/20 rounded">
                          Enabled
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-slate-500 text-center">
                More export settings coming soon
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}