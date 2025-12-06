# Shape Editor - Feature Implementation Tracker

## Size Constraints System

### Phase 1: Unified Size Constraints (✅ COMPLETED)

**Completed**: November 10, 2025

**Description**: Replaced the complex checkbox system (use min/max/avg + Force 1:1 aspect ratio) with a simple radio button system that applies to ALL shape types.

**Changes**:
- **UI**: Four radio buttons (None, Min, Max, Avg) replace three checkboxes and "Force 1:1" toggle
- **Schema**: Single `sizeConstraintMode` field ('none' | 'min' | 'max' | 'avg') replaces four boolean fields
- **Behavior**: When constraint is active (min/max/avg), the constrained size applies to BOTH dimensions for ALL shapes
- **Migration**: Automatic backward compatibility for old project files via `migrateSizeConstraintMode()` helper

**Files Modified**:
- `shared/schema.ts`: Added `sizeConstraintMode`, removed legacy fields, added migration helper
- `client/src/components/BatchConfigDialog.tsx`: Radio buttons UI
- `client/src/hooks/useShapeEditor.ts`: Simplified constraint logic
- `client/src/hooks/useGenerationSetsPersistence.ts`: Wired up migration on load
- `server/lib/batchConfigProcessor.ts`: Server-side constraint logic

**Constraint Modes**:
- **None**: Independent width/height (rectangles can be non-square)
- **Min**: Uses smaller of width/height for both dimensions → creates squares/circles at smaller size
- **Max**: Uses larger of width/height for both dimensions → creates squares/circles at larger size
- **Avg**: Uses average of width/height for both dimensions → creates squares/circles at average size

---

### Phase 2: Aspect Ratio Post-Scaling (⏳ PLANNED)

**Status**: Not yet implemented

**Description**: Add aspect ratio options that post-scale shapes after the size constraint is applied, enabling creation of shapes with specific aspect ratios (e.g., 16:9, 4:3, 21:9).

**Proposed Design**:

**Two-Phase Sizing System**:
1. **Phase 1 - Size Constraint** (determines base size):
   - None → use independent width/height as-is
   - Min/Max/Avg → calculate a single base size value

2. **Phase 2 - Aspect Ratio Scaling** (reshapes the result):
   - If "None" constraint: aspect ratio applies to existing width/height
   - If Min/Max/Avg: aspect ratio scales from the base size

**UI Changes**:
- Aspect ratio dropdown only enabled when size constraint is Min/Max/Avg (not None)
- Dropdown options:
  - **1:1** - Square (default, no scaling)
  - **16:9** - Widescreen
  - **4:3** - Classic
  - **3:2** - Photo
  - **21:9** - Ultrawide
  - **9:16** - Portrait (vertical 16:9)
  - **2:3** - Portrait photo
  - **Custom** - User-defined ratio (two input fields)

**Schema Changes**:
```typescript
// Add to BatchConfigSettings
aspectRatioMode: '1:1' | '16:9' | '4:3' | '3:2' | '21:9' | '9:16' | '2:3' | 'custom';
aspectRatioCustomWidth: number; // For custom mode
aspectRatioCustomHeight: number; // For custom mode
```

**Implementation Logic**:
```typescript
// Phase 1: Calculate constrained size based on mode
const constrainedSize = calculateConstrainedSize(width, height, mode);

// Phase 2: Apply aspect ratio if constraint is active
if (sizeConstraintMode !== 'none' && aspectRatioMode !== '1:1') {
  const ratio = getAspectRatio(aspectRatioMode, customW, customH);
  if (ratio >= 1) {
    // Landscape: width is larger
    width = constrainedSize * ratio;
    height = constrainedSize;
  } else {
    // Portrait: height is larger
    width = constrainedSize;
    height = constrainedSize / ratio;
  }
}
```

**Use Cases**:
- Video thumbnails (16:9)
- Phone screen mockups (9:16)
- Print layouts (4:3, 3:2)
- Ultrawide banners (21:9)
- Custom brand ratios

**Complexity Note**: This keeps "None" simple (independent sizing) and only allows aspect ratio post-scaling for the constrained modes (min/max/avg), avoiding complex calculations.

---

## Other Planned Features

### Global Repetition Override (⏳ PLANNED)

**Description**: A toggle feature that forces global repetition settings across all shape sets while preserving individual set configurations.

**Concept**: Temporarily override all per-set repetition settings with global values without losing the individual set configurations.

**Use Case**: Quickly test different repetition counts across all sets without manually changing each one.

**Behavior**: 
- When enabled, all sets use global repetition settings regardless of their individual repetitionMode setting
- Individual set repetition configurations remain intact and are restored when override is disabled

**UI Implementation**: Simple checkbox/toggle in the Set Manager dialog near global repetition settings.

**Difference from Use-Global Mode**: Sets retain their current mode (fixed/range/use-global) but temporarily act as if all are set to use-global.

**Benefits**: Rapid experimentation with different repetition counts across entire composition without modifying individual set configurations.

---

### Randomization Per Repetition (⏳ PLANNED)

**Description**: When generating multiple repetitions of a shape set, each repetition receives independent random values for enhanced variety.

**Features**:
- **Random Positions**: Each repetition uses fresh random scatter/distribution coordinates
- **Random Colors**: Independent color selection from ranges or palettes per repetition
- **Random Sizes**: Separate scale randomization with min/max ranges for each instance
- **Random Rotations**: Unique rotation angles within defined ranges per repetition
- **Random Shape Counts**: When count mode is "range", each repetition gets its own random count
- **Fresh Random Seeds**: Each repetition generates with a new random seed, ensuring complete independence of all random properties (gradients, blur, effects, etc.)

**Result**: Multiple repetitions would create truly diverse variations rather than duplicates, useful for creating organic, natural-looking compositions.

---

## Implementation Notes

- All features above are documented for future implementation
- Phase 1 (Size Constraints) is complete and tested
- Phase 2 (Aspect Ratio Post-Scaling) is the next priority
- Strike-through items in this document indicate completed features
