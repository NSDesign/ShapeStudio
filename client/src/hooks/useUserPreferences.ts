import { useQuery } from '@tanstack/react-query';
import type { UserPreferences, SidebarSectionConfig } from '@shared/schema';
import { DEFAULT_SIDEBAR_SECTIONS } from '@shared/schema';

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

  return {
    preferences,
    sidebarSections,
    isLoading,
    error,
  };
}