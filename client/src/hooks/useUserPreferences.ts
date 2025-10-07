import { useQuery, useMutation } from '@tanstack/react-query';
import type { UserPreferences, SidebarSectionConfig, ExportSettingsConfig, AppSettingsDefaults } from '@shared/schema';
import { DEFAULT_SIDEBAR_SECTIONS, DEFAULT_EXPORT_SETTINGS, DEFAULT_APP_SETTINGS } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';

export function useUserPreferences() {
  const { data: preferences, isLoading, error } = useQuery<UserPreferences>({
    queryKey: ['/api/user/preferences'],
    retry: 2,
    staleTime: 0, // Always refetch when invalidated
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

  // Extract app settings defaults
  const appSettingsDefaults: AppSettingsDefaults | null = preferences?.appSettingsDefaults as AppSettingsDefaults || null;

  // Mutation for updating export settings
  const updateExportSettings = useMutation({
    mutationFn: (newExportSettings: Partial<ExportSettingsConfig>) => {
      console.log('Updating export settings:', newExportSettings);
      return apiRequest('PUT', '/api/user/preferences', {
        exportSettings: {
          ...exportSettings,
          ...newExportSettings,
        },
      });
    },
    onSuccess: (response, variables) => {
      console.log('Export settings update successful:', variables);
      // Update cache directly with the new settings
      queryClient.setQueryData(['/api/user/preferences'], (oldData: UserPreferences | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          exportSettings: {
            ...(oldData.exportSettings as ExportSettingsConfig || {}),
            ...variables,
          },
        };
      });
      // Don't invalidate immediately - this causes the flicker
      // The cache update above is sufficient for immediate UI update
    },
    onError: (error) => {
      console.error('Export settings update failed:', error);
    },
  });

  // Mutation for updating sidebar sections
  const updateSidebarSections = useMutation({
    mutationFn: (newSidebarSections: Partial<SidebarSectionConfig>) => {
      console.log('Updating sidebar sections:', newSidebarSections);
      return apiRequest('PUT', '/api/user/preferences', {
        sidebarSections: {
          ...sidebarSections,
          ...newSidebarSections,
        },
      });
    },
    onSuccess: (response, variables) => {
      console.log('Sidebar sections update successful:', variables);
      // Update cache directly with the new settings
      queryClient.setQueryData(['/api/user/preferences'], (oldData: UserPreferences | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          sidebarSections: {
            ...(oldData.sidebarSections as SidebarSectionConfig || {}),
            ...variables,
          },
        };
      });
      // Don't invalidate immediately - this causes race conditions
      // The cache update above is sufficient for immediate UI update
    },
    onError: (error) => {
      console.error('Sidebar sections update failed:', error);
    },
  });

  // Mutation for saving app settings defaults
  const saveAppSettings = useMutation({
    mutationFn: (newAppSettings: AppSettingsDefaults) => {
      console.log('Saving app settings defaults:', newAppSettings);
      return apiRequest('PUT', '/api/user/preferences', {
        appSettingsDefaults: newAppSettings,
      });
    },
    onSuccess: (response, variables) => {
      console.log('App settings saved successfully:', variables);
      // Update cache directly
      queryClient.setQueryData(['/api/user/preferences'], (oldData: UserPreferences | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          appSettingsDefaults: variables,
        };
      });
    },
    onError: (error) => {
      console.error('App settings save failed:', error);
    },
  });

  return {
    preferences,
    sidebarSections,
    exportSettings,
    appSettingsDefaults,
    isLoading,
    error,
    updateExportSettings,
    updateSidebarSections,
    saveAppSettings,
  };
}

// Helper hook for just export settings
export function useExportSettings() {
  const { exportSettings, updateExportSettings, isLoading, error } = useUserPreferences();
  return { exportSettings, updateExportSettings, isLoading, error };
}