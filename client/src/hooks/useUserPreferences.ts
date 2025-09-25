import { useQuery, useMutation } from '@tanstack/react-query';
import type { UserPreferences, SidebarSectionConfig, ExportSettingsConfig } from '@shared/schema';
import { DEFAULT_SIDEBAR_SECTIONS, DEFAULT_EXPORT_SETTINGS } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';

export function useUserPreferences() {
  const { data: preferences, isLoading, error } = useQuery<UserPreferences>({
    queryKey: ['/api/user/preferences'],
    retry: 2,
    staleTime: 5 * 60 * 1000, // Consider preferences fresh for 5 minutes
  });

  // Extract sidebar sections with fallback to defaults
  const sidebarSections: SidebarSectionConfig = {
    ...DEFAULT_SIDEBAR_SECTIONS,
    ...(preferences?.sidebarSections as SidebarSectionConfig || {}),
  };

  // Extract export settings with fallback to defaults
  const exportSettings: ExportSettingsConfig = {
    ...DEFAULT_EXPORT_SETTINGS,
    ...(preferences?.exportSettings as ExportSettingsConfig || {}),
  };

  // Mutation for updating export settings
  const updateExportSettings = useMutation({
    mutationFn: (newExportSettings: Partial<ExportSettingsConfig>) => {
      return apiRequest('/api/user/preferences', {
        method: 'PUT',
        body: {
          exportSettings: {
            ...exportSettings,
            ...newExportSettings,
          },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
    },
  });

  // Mutation for updating sidebar sections
  const updateSidebarSections = useMutation({
    mutationFn: (newSidebarSections: Partial<SidebarSectionConfig>) => {
      return apiRequest('/api/user/preferences', {
        method: 'PUT',
        body: {
          sidebarSections: {
            ...sidebarSections,
            ...newSidebarSections,
          },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
    },
  });

  return {
    preferences,
    sidebarSections,
    exportSettings,
    isLoading,
    error,
    updateExportSettings,
    updateSidebarSections,
  };
}

// Helper hook for just export settings
export function useExportSettings() {
  const { exportSettings, updateExportSettings, isLoading, error } = useUserPreferences();
  return { exportSettings, updateExportSettings, isLoading, error };
}