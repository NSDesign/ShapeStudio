import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus, Layers, Info, Eye, EyeOff } from 'lucide-react';
import { GenerationSet, ShapeCountMode, SupportedShapeType, BatchConfigSettings } from '@shared/schema';
import { ScatterSettings, ShapeType } from '@/lib/shapeTypes';

interface GenerationSetsDropdownProps {
  // Current state to capture/restore
  currentSetId: string | null;
  generationSets: GenerationSet[];
  
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
  variant?: 'inline' | 'boxed';  // boxed = sidebar style with border and stacked layout
  'data-testid'?: string;
}

export function GenerationSetsDropdown({
  currentSetId,
  generationSets,
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
  variant = 'inline',
  'data-testid': testId
}: GenerationSetsDropdownProps) {
  const [isCreatingSet, setIsCreatingSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);

  // Filter generation sets based on toggle, but always include the currently selected set
  const filteredGenerationSets = showOnlyEnabled 
    ? generationSets.filter(set => set.enabled || set.id === currentSetId)
    : generationSets;

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

  const currentSet = generationSets.find(set => set.id === currentSetId);
  const canDelete = currentSetId && generationSets.length > 1;

  const buttonSize = size === 'sm' ? 'sm' : 'default';
  const selectHeight = size === 'sm' ? 'h-8' : 'h-10';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  // Render buttons component (shared between variants)
  const buttonsComponent = enabled && (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size={buttonSize}
        onClick={handleOpenCreate}
        disabled={!enabled}
        className={`px-2 bg-slate-800 border-slate-600 hover:bg-slate-700 ${!enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Create new generation set"
        data-testid={`${testId}-add-button`}
      >
        <Plus className={`${iconSize} text-slate-300`} />
      </Button>
      <Button
        variant="outline"
        size={buttonSize}
        onClick={handleDeleteCurrentSet}
        disabled={!enabled || !canDelete}
        className={`px-2 bg-slate-800 border-slate-600 hover:bg-slate-700 ${(!enabled || !canDelete) ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={canDelete ? "Delete current generation set" : "Cannot delete - only one set remaining"}
        data-testid={`${testId}-remove-button`}
      >
        <Minus className={`${iconSize} text-slate-300`} />
      </Button>
      <Button
        variant="outline"
        size={buttonSize}
        onClick={onOpenManager}
        disabled={!enabled}
        className={`px-2 bg-slate-800 border-slate-600 hover:bg-slate-700 ${!enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Open Generation Sets Manager"
        data-testid={`${testId}-manager-button`}
      >
        <Layers className={`${iconSize} ${hasMismatch ? 'text-yellow-400' : 'text-slate-300'}`} />
      </Button>
      <Button
        variant="outline"
        size={buttonSize}
        onClick={() => setShowOnlyEnabled(!showOnlyEnabled)}
        disabled={!enabled}
        className={`px-2 bg-slate-800 border-slate-600 hover:bg-slate-700 ${!enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={showOnlyEnabled ? "Show all sets" : "Show only enabled sets"}
        data-testid={`${testId}-filter-button`}
      >
        {showOnlyEnabled ? (
          <EyeOff className={`${iconSize} text-blue-400`} />
        ) : (
          <Eye className={`${iconSize} text-slate-300`} />
        )}
      </Button>
    </div>
  );

  // Render dropdown component (shared between variants)
  const dropdownComponent = (
    <Select
      value={currentSetId || ''}
      onValueChange={(value) => onSetChange(value || null)}
      disabled={!enabled}
    >
      <SelectTrigger 
        className={`${variant === 'boxed' ? 'w-full' : 'flex-1'} ${selectHeight} ${!enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        data-testid={`${testId}-select-trigger`}
      >
        <SelectValue 
          placeholder={enabled ? "Select generation set..." : "Enable generation sets to select"} 
        />
      </SelectTrigger>
      <SelectContent className="bg-slate-800 border-slate-600">
        {filteredGenerationSets.length === 0 ? (
          <SelectItem value="no-sets" disabled className="text-slate-400">
            {showOnlyEnabled ? "No enabled sets" : "No sets available"}
          </SelectItem>
        ) : (
          filteredGenerationSets.map((set) => (
            <SelectItem 
              key={set.id} 
              value={set.id}
              className={`${set.enabled ? 'text-white' : 'text-slate-500 opacity-60'} data-[highlighted]:bg-slate-600 data-[highlighted]:text-white`}
              data-testid={`${testId}-option-${set.id}`}
            >
              {variant === 'inline' ? (
                <div className="flex items-center justify-between w-full">
                  <span className={!set.enabled ? 'opacity-75' : ''}>{set.name}</span>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <span>{set.enabledShapeTypes.length} types</span>
                    {!set.enabled && <span className="text-orange-400">●</span>}
                  </div>
                </div>
              ) : (
                <span className={!set.enabled ? 'opacity-75' : ''}>{set.name}</span>
              )}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );

  // Boxed variant (sidebar style)
  if (variant === 'boxed') {
    return (
      <>
        <div className={`mb-4 p-3 border border-slate-600 rounded-lg bg-slate-800/30 space-y-2 ${className}`} data-testid={testId}>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-slate-400">Shape Sets</Label>
            {buttonsComponent}
          </div>
          {enabled ? dropdownComponent : (
            <div className="flex items-center gap-2 p-2 bg-slate-900/50 border border-slate-600 rounded text-xs text-slate-400">
              <Info className="w-3 h-3 text-blue-400 flex-shrink-0" />
              <span>Enable Shape Sets in the Export & Save section to use this feature</span>
            </div>
          )}
        </div>

        {/* Create Set Modal */}
        {isCreatingSet && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 w-80">
              <h3 className="text-white font-medium mb-3">Create Generation Set</h3>
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
      </>
    );
  }

  // Inline variant (dialog style)
  return (
    <>
      <div className={`flex items-center gap-2 ${className}`} data-testid={testId}>
        {showLabel && (
          <span className="text-xs text-slate-400 whitespace-nowrap">Set:</span>
        )}
        
        {dropdownComponent}
        {buttonsComponent}
      </div>

      {/* Create Set Modal */}
      {isCreatingSet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 w-80">
            <h3 className="text-white font-medium mb-3">Create Generation Set</h3>
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
    </>
  );
}