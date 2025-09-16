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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SidebarSectionConfig, UserPreferences } from '@shared/schema';

interface SidebarSettingsDialogProps {
  children: React.ReactNode;
}

// Sidebar section definitions with metadata
const SIDEBAR_SECTIONS = [
  {
    key: 'shapes' as keyof SidebarSectionConfig,
    name: 'Shape Types',
    description: 'Select and configure different shape types for generation',
    icon: Shapes,
    category: 'Core Features',
  },
  {
    key: 'artboards' as keyof SidebarSectionConfig,
    name: 'Artboards',
    description: 'Manage different canvas sizes and artboard presets',
    icon: Monitor,
    category: 'Core Features',
  },
  {
    key: 'project' as keyof SidebarSectionConfig,
    name: 'Project Management',
    description: 'Save, load, and manage your shape projects',
    icon: FolderOpen,
    category: 'Core Features',
  },
  {
    key: 'export' as keyof SidebarSectionConfig,
    name: 'Export & Save',
    description: 'Export your creations to various file formats',
    icon: Download,
    category: 'Core Features',
  },
  {
    key: 'selection' as keyof SidebarSectionConfig,
    name: 'Selection Modes',
    description: 'Switch between shape, point, and segment editing modes',
    icon: MousePointer,
    category: 'Advanced Tools',
  },
  {
    key: 'layers' as keyof SidebarSectionConfig,
    name: 'Layers',
    description: 'Manage layer order, blend modes, and z-index operations',
    icon: Layers,
    category: 'Advanced Tools',
  },
  {
    key: 'properties' as keyof SidebarSectionConfig,
    name: 'Properties',
    description: 'Adjust shape properties like position, scale, rotation, and skew',
    icon: Settings,
    category: 'Advanced Tools',
  },
  {
    key: 'composition' as keyof SidebarSectionConfig,
    name: 'Composition',
    description: 'Boolean operations and shape composition tools',
    icon: Package,
    category: 'Advanced Tools',
  },
  {
    key: 'align-distribute' as keyof SidebarSectionConfig,
    name: 'Align & Distribute',
    description: 'Alignment and distribution tools for selected shapes',
    icon: Grid3X3,
    category: 'Advanced Tools',
  },
  {
    key: 'colors' as keyof SidebarSectionConfig,
    name: 'Color Manipulation',
    description: 'Advanced color adjustment and manipulation tools',
    icon: Palette,
    category: 'Advanced Tools',
  },
] as const;

// Group sections by category
const SECTION_GROUPS = SIDEBAR_SECTIONS.reduce((groups, section) => {
  if (!groups[section.category]) {
    groups[section.category] = [];
  }
  groups[section.category].push(section);
  return groups;
}, {} as Record<string, typeof SIDEBAR_SECTIONS[number][]>);

export default function SidebarSettingsDialog({ children }: SidebarSettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<SidebarSectionConfig | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user preferences
  const { data: preferences, isLoading: isLoadingPreferences, error: preferencesError } = useQuery<UserPreferences>({
    queryKey: ['/api/user/preferences'],
    staleTime: 5 * 60 * 1000, // Consider preferences fresh for 5 minutes
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

  // Initialize local settings when preferences load (only if no local changes exist)
  useEffect(() => {
    if (preferences && preferences.sidebarSections && !localSettings) {
      setLocalSettings(preferences.sidebarSections as SidebarSectionConfig);
    }
  }, [preferences, localSettings]);

  // Handle section toggle
  const handleSectionToggle = (sectionKey: keyof SidebarSectionConfig, enabled: boolean) => {
    if (!localSettings) return;
    
    const updatedSettings = {
      ...localSettings,
      [sectionKey]: enabled,
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

  // Save changes
  const handleSave = () => {
    if (!localSettings) return;
    updatePreferencesMutation.mutate(localSettings);
  };

  // Check if settings have changed
  const hasChanges = localSettings && preferences && preferences.sidebarSections && 
    JSON.stringify(localSettings) !== JSON.stringify(preferences.sidebarSections);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setLocalSettings(null); }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[90vh] bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-100">
            Sidebar Settings
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Configure which sections are visible in your sidebar. Changes are saved automatically to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {isLoadingPreferences || !localSettings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-400">Loading preferences...</span>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[50vh] w-full">
                <div className="space-y-6 pr-4">
                  {Object.entries(SECTION_GROUPS).map(([category, sections]) => (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-slate-300">{category}</h3>
                        <Separator className="flex-1 bg-slate-700" />
                      </div>
                      
                      <div className="space-y-3">
                        {sections.map((section) => {
                          const IconComponent = section.icon;
                          const isEnabled = localSettings[section.key];
                          
                          return (
                            <div
                              key={section.key}
                              className="flex items-start justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
                              data-testid={`sidebar-setting-${section.key}`}
                            >
                              <div className="flex items-start gap-3">
                                <IconComponent className={`w-5 h-5 mt-0.5 transition-colors ${
                                  isEnabled ? 'text-blue-400' : 'text-slate-500'
                                }`} />
                                <div className="space-y-1">
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
                              
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => handleSectionToggle(section.key, checked)}
                                data-testid={`switch-${section.key}`}
                                className="data-[state=checked]:bg-blue-600"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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
      </DialogContent>
    </Dialog>
  );
}