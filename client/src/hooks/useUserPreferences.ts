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

  // Normalize sidebar sections from old boolean format to new object format
  const normalizeSidebarSections = (sections: any): SidebarSectionConfig => {
    // Start with defaults
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
          enabled: value, // Preserve the actual boolean value (true or false)
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

  // Extract sidebar sections with fallback to defaults and normalization
  const sidebarSections: SidebarSectionConfig = normalizeSidebarSections(preferences?.sidebarSections);

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

  // Mutation for updating skip load project dialog preference
  const updateSkipLoadDialog = useMutation({
    mutationFn: (skip: boolean) => {
      console.log('Updating skip load project dialog preference:', skip);
      return apiRequest('PUT', '/api/user/preferences', {
        skipLoadProjectDialog: skip,
      });
    },
    onSuccess: (response, variables) => {
      console.log('Skip load dialog preference updated:', variables);
      // Update cache directly
      queryClient.setQueryData(['/api/user/preferences'], (oldData: UserPreferences | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          skipLoadProjectDialog: variables,
        };
      });
    },
    onError: (error) => {
      console.error('Skip load dialog preference update failed:', error);
    },
  });

  return {
    preferences,
    sidebarSections,
    exportSettings,
    appSettingsDefaults,
    skipLoadProjectDialog: preferences?.skipLoadProjectDialog ?? false,
    isLoading,
    error,
    updateExportSettings,
    updateSidebarSections,
    saveAppSettings,
    updateSkipLoadDialog,
  };
}

// Helper hook for just export settings
export function useExportSettings() {
  const { exportSettings, updateExportSettings, isLoading, error } = useUserPreferences();
  return { exportSettings, updateExportSettings, isLoading, error };
}