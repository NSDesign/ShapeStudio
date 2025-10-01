import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { ShapeSet } from '@shared/schema';

export interface ShapeSetsData {
  shapeSets: ShapeSet[];
  currentSetId: string | null;
}

export function useShapeSetsPersistence() {
  // Load shape sets from server
  const { data, isLoading, error } = useQuery<ShapeSetsData>({
    queryKey: ['/api/user/shape-sets'],
    retry: 2,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Save shape sets to server
  const saveMutation = useMutation({
    mutationFn: async (data: ShapeSetsData) => {
      const response = await apiRequest('POST', '/api/user/shape-sets', data);
      return response.json();
    },
    onSuccess: (result, variables) => {
      // Update cache directly instead of invalidating to prevent refetch loops
      queryClient.setQueryData(['/api/user/shape-sets'], variables);
    },
    onError: (error) => {
      console.error('Failed to save shape sets:', error);
    },
  });

  // Auto-save function that can be called from components
  const saveShapeSets = async (shapeSets: ShapeSet[], currentSetId?: string | null) => {
    try {
      await saveMutation.mutateAsync({
        shapeSets,
        currentSetId: currentSetId || null,
      });
    } catch (error) {
      console.error('Error saving shape sets:', error);
      throw error;
    }
  };

  return {
    // Data
    shapeSets: data?.shapeSets || [],
    currentSetId: data?.currentSetId || null,
    
    // Loading states
    isLoading,
    isSaving: saveMutation.isPending,
    
    // Error states
    error,
    saveError: saveMutation.error,
    
    // Actions
    saveShapeSets,
    
    // Utility
    isReady: !isLoading && !error,
  };
}
