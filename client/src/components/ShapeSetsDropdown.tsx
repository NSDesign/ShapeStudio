import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, Settings } from 'lucide-react';
import { ShapeSet, ShapeCountMode, SupportedShapeType, BatchConfigSettings } from '@shared/schema';
import { ScatterSettings, ShapeType } from '@/lib/shapeTypes';

interface ShapeSetsDropdownProps {
  // Current state to capture/restore
  currentSetId: string | null;
  shapeSets: ShapeSet[];
  
  // Current UI state that gets captured
  enabledShapeTypes: Set<ShapeType>;
  scatterSettings: ScatterSettings;
  batchConfigSettings: BatchConfigSettings;
  shapeCountMode: ShapeCountMode;
  shapeCountFixed: number;
  shapeCountRange: [number, number];
  
  // Callbacks
  onSetChange: (setId: string | null) => void;
  onCreateSet: (name: string) => void;
  onDeleteSet: (setId: string) => void;
  onOpenManager: () => void;
  
  // Name generation
  generateUniqueSetName?: (baseName?: string) => string;
  
  // Conditional enabling
  enabled: boolean;
  
  // Mismatch detection
  hasMismatch?: boolean;
  
  // Styling
  className?: string;
  size?: 'sm' | 'default';
  showLabel?: boolean;
  'data-testid'?: string;
}

export function ShapeSetsDropdown({
  currentSetId,
  shapeSets,
  enabledShapeTypes,
  scatterSettings,
  batchConfigSettings,
  shapeCountMode,
  shapeCountFixed,
  shapeCountRange,
  onSetChange,
  onCreateSet,
  onDeleteSet,
  onOpenManager,
  generateUniqueSetName,
  enabled,
  hasMismatch = false,
  className = '',
  size = 'default',
  showLabel = false,
  'data-testid': testId
}: ShapeSetsDropdownProps) {
  const [isCreatingSet, setIsCreatingSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');

  // Pre-populate with auto-generated name when opening create dialog
  const handleOpenCreate = () => {
    const suggestedName = generateUniqueSetName ? generateUniqueSetName() : 'Set 1';
    setNewSetName(suggestedName);
    setIsCreatingSet(true);
  };

  const handleCreateSet = () => {
    const finalName = newSetName.trim() || (generateUniqueSetName ? generateUniqueSetName() : 'Set 1');
    onCreateSet(finalName);
    setNewSetName('');
    setIsCreatingSet(false);
  };

  const handleDeleteCurrentSet = () => {
    if (currentSetId) {
      onDeleteSet(currentSetId);
    }
  };

  const currentSet = shapeSets.find(set => set.id === currentSetId);
  const canDelete = currentSetId && shapeSets.length > 1;

  const buttonSize = size === 'sm' ? 'sm' : 'default';
  const selectHeight = size === 'sm' ? 'h-8' : 'h-10';

  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid={testId}>
      {showLabel && (
        <span className="text-xs text-slate-400 whitespace-nowrap">Set:</span>
      )}
      
      {/* Dropdown Select */}
      <Select
        value={currentSetId || ''}
        onValueChange={(value) => onSetChange(value || null)}
        disabled={!enabled}
      >
        <SelectTrigger 
          className={`flex-1 ${selectHeight} ${!enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          data-testid={`${testId}-select-trigger`}
        >
          <SelectValue 
            placeholder={enabled ? "Select shape set..." : "Switch to fixed count mode"} 
          />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-600">
          {shapeSets.length === 0 ? (
            <SelectItem value="no-sets" disabled className="text-slate-400">
              No sets available
            </SelectItem>
          ) : (
            shapeSets.map((set) => (
              <SelectItem 
                key={set.id} 
                value={set.id}
                className="text-white data-[highlighted]:bg-slate-600 data-[highlighted]:text-white"
                data-testid={`${testId}-option-${set.id}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{set.name}</span>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <span>{set.enabledShapeTypes.length} types</span>
                    {!set.enabled && <span className="text-orange-400">●</span>}
                  </div>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {/* Add Set Button */}
      <Button
        variant="outline"
        size={buttonSize}
        onClick={handleOpenCreate}
        disabled={!enabled}
        className={`px-2 bg-slate-800 border-slate-600 hover:bg-slate-700 ${!enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Create new shape set"
        data-testid={`${testId}-add-button`}
      >
        <Plus className="h-4 w-4 text-slate-300" />
      </Button>

      {/* Remove Set Button */}
      <Button
        variant="outline"
        size={buttonSize}
        onClick={handleDeleteCurrentSet}
        disabled={!enabled || !canDelete}
        className={`px-2 bg-slate-800 border-slate-600 hover:bg-slate-700 ${(!enabled || !canDelete) ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={canDelete ? "Delete current shape set" : "Cannot delete - only one set remaining"}
        data-testid={`${testId}-remove-button`}
      >
        <Minus className="h-4 w-4 text-slate-300" />
      </Button>

      {/* Sets Manager Button */}
      <Button
        variant="outline"
        size={buttonSize}
        onClick={onOpenManager}
        disabled={!enabled}
        className={`px-2 bg-slate-800 border-slate-600 hover:bg-slate-700 ${!enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Open Shape Sets Manager"
        data-testid={`${testId}-manager-button`}
      >
        <Settings className={`h-4 w-4 ${hasMismatch ? 'text-yellow-400' : 'text-slate-300'}`} />
      </Button>

      {/* Create Set Modal/Input */}
      {isCreatingSet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 w-80">
            <h3 className="text-white font-medium mb-3">Create Shape Set</h3>
            <input
              type="text"
              value={newSetName}
              onChange={(e) => setNewSetName(e.target.value)}
              placeholder="Enter set name..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSet();
                if (e.key === 'Escape') setIsCreatingSet(false);
              }}
              data-testid={`${testId}-create-input`}
            />
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleCreateSet}
                disabled={!newSetName.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                data-testid={`${testId}-create-confirm`}
              >
                Create
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsCreatingSet(false)}
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                data-testid={`${testId}-create-cancel`}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}