# Future Features & Enhancements

This document outlines complex features that have been identified for future development. These features represent significant enhancements to the Shape Editor's capabilities and require careful planning and implementation.

---

## 1. Batch Export Queue

### Overview
A comprehensive batch export system that allows users to queue multiple export operations and process them sequentially with progress tracking and batch packaging options.

### Current State
The application currently supports:
- Single-file exports (all shapes, selected shapes, or artboard content)
- One format at a time
- Manual export initiation for each operation

Users must manually export each configuration separately, which is inefficient for workflows requiring multiple variations.

### Proposed Feature

#### Core Functionality
1. **Export Queue Management**
   - Add multiple export jobs to a queue
   - Each job specifies: format, quality, scale, scope, naming options
   - Queue visualization showing pending, in-progress, and completed jobs
   - Ability to reorder, edit, or remove queued jobs before processing

2. **Batch Processing**
   - Process queued exports sequentially
   - Real-time progress tracking for each job
   - Overall progress indicator (e.g., "3 of 10 exports complete")
   - Pause/resume capability
   - Error handling with retry options

3. **Packaging Options**
   - Option to package all exports as a ZIP file
   - Automatic filename generation with configurable patterns
   - Optional project file (.json) inclusion
   - Subfolder organization by format or export scope

#### Technical Requirements

**Frontend:**
- Queue state management (could use React Context or Zustand)
- Queue UI component with drag-and-drop reordering
- Progress indicators and status badges
- Background processing that doesn't block UI interactions

**Backend:**
- Queue processing endpoint that handles multiple exports
- Stream-based ZIP generation for memory efficiency
- Progress tracking via WebSocket or Server-Sent Events
- Temporary file management and cleanup

**Data Model:**
```typescript
interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  settings: {
    format: ImageFormat;
    quality: number;
    scale: number;
    scope: 'all' | 'selected' | 'artboard';
    includeBackground: boolean;
    backgroundColor: string;
    // ... other export options
  };
  filename: string;
  progress?: number; // 0-100
  error?: string;
  resultUrl?: string;
}

interface ExportQueue {
  jobs: ExportJob[];
  packageAsZip: boolean;
  zipFilename?: string;
  includeProjectFile: boolean;
}
```

#### UI/UX Considerations
- **Queue Panel**: Collapsible sidebar or modal showing all queued jobs
- **Quick Actions**: Templates for common batch scenarios (e.g., "Export all formats at 1x, 2x, 4x")
- **Job Templates**: Save queue configurations for reuse
- **Notifications**: Toast notifications for completion/errors
- **Download Management**: Option to auto-download or save to project folder

#### Implementation Phases
1. **Phase 1**: Basic queue UI and single-job sequential processing
2. **Phase 2**: ZIP packaging and progress tracking
3. **Phase 3**: Job templates and advanced queue management
4. **Phase 4**: Background/async processing with notifications

---

## 2. Multi-format Batch Processing

### Overview
Allow users to export the same content in multiple image formats simultaneously, streamlining workflows that require the same design in various formats.

### Current State
Users can only export one format at a time. To get the same design in multiple formats (e.g., PNG, JPEG, WebP), they must:
1. Export as PNG
2. Change format setting
3. Export as JPEG
4. Change format setting
5. Export as WebP
6. Etc.

This is tedious and time-consuming for multi-format delivery requirements.

### Proposed Feature

#### Core Functionality
1. **Multi-format Selection**
   - Checkbox-based format selector in export dialog
   - Select multiple formats simultaneously (e.g., PNG + JPEG + WebP)
   - Per-format quality settings (since JPEG/WebP/AVIF support quality)
   - Unified naming scheme across all formats

2. **Format-Specific Settings**
   - Quality slider for each lossy format
   - Transparency handling (auto-disable for JPEG, add background)
   - Format-specific optimization toggles

3. **Batch Generation**
   - Generate all selected formats in a single operation
   - Show progress across all formats
   - Package results together or download individually

#### Technical Requirements

**Frontend:**
- Multi-select format UI component
- Conditional settings panels based on selected formats
- Format-specific validation (e.g., warn if transparency selected with JPEG)
- Batch progress indicator showing per-format status

**Backend:**
- Parallel or sequential format generation from single canvas
- Efficient canvas reuse (render once, export to multiple formats)
- Memory-optimized processing for large batches
- ZIP packaging for multi-format downloads

**Data Model:**
```typescript
interface MultiFormatExportSettings {
  formats: {
    format: ImageFormat;
    quality?: number; // For lossy formats
    enabled: boolean;
  }[];
  commonSettings: {
    scale: number;
    scope: 'all' | 'selected' | 'artboard';
    includeBackground: boolean;
    backgroundColor: string;
    // ... other shared options
  };
  packaging: {
    zipEnabled: boolean;
    individualDownloads: boolean;
  };
  naming: {
    baseFilename: string;
    includeFormat: boolean; // Append format to filename
    includeTimestamp: boolean;
  };
}
```

#### UI/UX Considerations
- **Format Grid**: Visual grid of format checkboxes with icons/descriptions
- **Smart Defaults**: Auto-adjust settings when formats selected (e.g., add background if JPEG selected)
- **Preview Matrix**: Show thumbnail preview of each format side-by-side
- **Size Estimates**: Display estimated file sizes for each format
- **Conflict Detection**: Warn about incompatible settings (e.g., transparency + JPEG)

#### Implementation Phases
1. **Phase 1**: Basic multi-format selection and export
2. **Phase 2**: Format-specific quality settings
3. **Phase 3**: Preview matrix and size estimates
4. **Phase 4**: Advanced optimization and comparison tools

#### Synergy with Batch Export Queue
These two features work well together:
- Multi-format exports could be added as a single queue job
- Queue could show sub-items for each format being processed
- Format templates could be saved and reused in queue

---

## Integration Notes

### Relationship to Existing Features
Both features build upon the current export system:
- Use existing `ImageExporter` class as foundation
- Leverage current format support (PNG, JPEG, WebP, AVIF, BMP)
- Extend existing export options rather than replacing them

### API Parity Considerations
When implementing these features:
- Ensure both client and server support the same capabilities
- Server API should support batch requests
- Consider WebSocket/SSE for real-time progress updates
- Maintain JSON parity between client and API exports

### Performance Considerations
- Memory management for large batch operations
- Canvas reuse strategies to avoid redundant rendering
- Stream-based processing for ZIP generation
- Background/worker thread processing where possible

---

## 3. Set Repetition Index Control

### Overview
A powerful parameter control system that allows shape properties to change predictably based on the repetition index, enabling controlled progressions, sequences, and patterns instead of random variations. When a shape set is repeated multiple times, each repetition can have properties that increment, decrement, or modulate according to its position in the sequence (index 0, 1, 2, 3...).

### Concept
Currently, shape sets support three repetition behaviors:
- **Use Global**: Inherit global repetition settings
- **Fixed**: Repeat the set N times with fresh random values each time
- **Range**: Repeat a random count within a range, with fresh random values each time

Set Repetition Index Control would add a fourth mode for numeric properties: **Set Rep Index**, where property values are calculated based on the repetition index using a formula: `value = base + (index × increment)`.

This transforms repetition from purely random variation to controlled, mathematical progression.

### Use Cases

#### A. Generation Config Settings
Numeric properties in the main generation configuration that could be controlled by repetition index:

**Position:**
- X/Y offset: Create echo/trail effects with predictable spacing
- Example: Base X=0, Increment +5 → Each rep shifts 5px right (0px, 5px, 10px, 15px...)

**Size (Width/Height):**
- Progressive scaling: Shapes growing or shrinking systematically
- Example: Base radius=50, Increment +10 → Concentric circles (50px, 60px, 70px, 80px...)

**Rotation:**
- Angular progression: Create radial patterns or rotation sequences
- Example: Base 0°, Increment +15° → Creates 24-spoke radial pattern

**Opacity:**
- Fade sequences: Linear fade-in or fade-out progressions
- Example: Base 100%, Increment -10% → Fade out (100%, 90%, 80%, 70%...)

**Colors (Fill/Stroke):**
- Hue rotation: Smooth color wheel progressions
- Example: Base hue=0°, Increment +30° → Rainbow sequence (red → orange → yellow → green...)
- Saturation/Lightness ramps: Colors becoming more vivid or desaturated
- Example: Base saturation=50%, Increment +10% → Increasing color intensity

**Blur Radius:**
- Progressive blur: Sharp to blurry or vice versa
- Example: Base 0px, Increment +2px → Increasing blur effect (0px, 2px, 4px, 6px...)

**Stroke Width:**
- Line thickness progression: Lines getting thicker or thinner
- Example: Base 1px, Increment +0.5px → Growing stroke weight

#### B. Shape-Specific Properties
Type-specific parameters that could be controlled by repetition index:

**Line-Vector:**
- Direction angle: Each repetition rotates by fixed degrees (creates radial burst patterns)
- Length: Progressively longer or shorter lines
- Centroid position: Animating the line's center point along a path
- Example: Base direction=0°, Increment +15° → 24 lines radiating from center

**Polygon:**
- Edge count: Triangle → square → pentagon → hexagon (morphing sequence)
- Example: Base edges=3, Increment +1 → Shape complexity increases per rep

**Star:**
- Point count: 5-pointed → 8-pointed → 12-pointed progression
- Inner radius ratio: Stars getting sharper (lower ratio) or blunter (higher ratio)
- Example: Base points=5, Increment +2 → Increasingly complex stars

**Circle/Ellipse:**
- Segment count: Low-poly to high-poly progression (blocky → smooth)
- Example: Base segments=6, Increment +4 → Visual quality increases (6, 10, 14, 18...)

**Bezier/Cubic/Smooth-Spline:**
- Point count: Curves getting more complex per repetition
- Curvature: Progressively more curved or straighter paths
- Spread (for cubic splines): Tightening or expanding spread patterns

**Ring/Spline-Ring:**
- Inner radius: Rings getting thicker or thinner progressively
- Example: Base inner=0.2, Increment +0.1 → Varying ring thickness

#### C. Visual Effects
Additional visual properties that could be index-controlled:

**Gradient Angle:**
- Rotating gradients: Each rep's gradient rotates systematically
- Example: Base 0°, Increment +45° → Gradient rotates through orientations

**Shadow Offset/Intensity:**
- Creating depth progression with shadow effects
- Example: Base offset=2px, Increment +1px → Increasing shadow depth

#### D. Layering & Compositing
Compositional properties controlled by index:

**Blend Mode Cycling:**
- Each repetition uses a different blend mode from a sequence
- Example: source-over → multiply → screen → overlay (repeating pattern)

**Opacity Steps:**
- Controlled fade-in or fade-out progressions (different from random opacity)
- Example: Base 20%, Increment +20% → 5 reps create full fade-in

**Z-Index:**
- Explicit layer ordering tied to repetition sequence
- Example: Base z=100, Increment +10 → Clear stacking order

#### E. Color Systems (Advanced)
Complex color manipulations based on index:

**Hue Rotation:**
- Color wheel progression (red → orange → yellow → green → cyan → blue → magenta)
- Example: Base hue=0°, Increment +30° → 12 reps complete full color wheel

**Saturation/Lightness Ramps:**
- Colors becoming more vivid (saturation up) or desaturated (saturation down)
- Colors becoming lighter or darker (lightness up/down)
- Example: Base saturation=30%, Increment +10% → Progressive color intensity

**Color Harmony Cycling:**
- Cycle through color harmony relationships (complementary → triadic → tetradic)
- Each rep uses a different harmonic relationship to base color

#### F. Transform Properties
Transform-related parameters controlled by index:

**Transform Origin:**
- Shifting the pivot point progressively
- Example: Base origin-x=0%, Increment +10% → Pivot shifts left to right

**Combined Transforms:**
- Rotation + scale + position all tied to index for complex motion paths
- Example: Spiral effect with simultaneous rotation, scaling, and position offset

#### G. Distribution Parameters
Distribution layout settings controlled by index:

**Grid Spacing:**
- Cells getting larger or smaller progressively
- Example: Base spacing=50px, Increment +10px → Expanding grid

**Wave Amplitude/Frequency:**
- Modulating wave parameters for evolving wave patterns
- Base amplitude=20px, Increment +5px → Increasingly dramatic waves

**Spiral Tightness:**
- Changing the spacing between spiral arms
- Example: Base spacing=10px, Increment +2px → Loosening spiral

**Ellipse Radii:**
- Progressive ellipse size changes
- Example: Base radius=100px, Increment +20px → Expanding concentric ellipses

### Technical Implementation

#### Parameters Required
For each property supporting "Set Rep Index" mode:

1. **Base Value** (required)
   - Starting point for index 0
   - Example: 50px, 0°, 100%, #ff0000

2. **Increment** (required)
   - Amount to add/subtract per index
   - Can be positive (increasing) or negative (decreasing)
   - Example: +10px, -5°, +15%

3. **Multiplier** (optional, default: 1)
   - Scale the index before applying increment
   - Useful for faster/slower progressions
   - Example: Multiplier 2 → index 0,2,4,6... instead of 0,1,2,3...

4. **Offset** (optional, default: 0)
   - Start from a different index value
   - Example: Offset 3 → indices start at 3,4,5,6... instead of 0,1,2,3...

5. **Modulation** (optional, default: linear)
   - How the value changes over indices
   - Types:
     - **Linear** (default): Direct increment (value = base + increment × index)
     - **Exponential**: Accelerating change (value = base + increment × index²)
     - **Sine Wave**: Oscillating pattern (value = base + amplitude × sin(index × frequency))
     - **Ease In/Out**: Smooth acceleration/deceleration curves
     - **Step**: Discrete jumps at intervals

#### Calculation Formula
```
effectiveIndex = (actualIndex + offset) × multiplier

switch (modulationType) {
  case 'linear':
    value = base + (increment × effectiveIndex)
  case 'exponential':
    value = base + (increment × effectiveIndex²)
  case 'sine':
    value = base + (increment × sin(effectiveIndex × frequency))
  // ... other modulation types
}
```

#### Data Model
```typescript
type PropertyMode = 'fixed' | 'range' | 'use-global' | 'set-rep-index';

interface SetRepIndexConfig {
  mode: 'set-rep-index';
  base: number;           // Starting value
  increment: number;      // Amount per index (can be negative)
  multiplier?: number;    // Default: 1
  offset?: number;        // Default: 0
  modulation?: 'linear' | 'exponential' | 'sine' | 'ease-in' | 'ease-out' | 'step';
  modulationParams?: {
    frequency?: number;   // For sine wave
    stepInterval?: number; // For step modulation
  };
  clamp?: {              // Optional value clamping
    min?: number;
    max?: number;
  };
}

// Example usage in generation config
interface PositionConfig {
  x: {
    mode: 'set-rep-index';
    base: 0;
    increment: 5;
    // Results: 0px, 5px, 10px, 15px...
  };
  y: {
    mode: 'fixed';
    value: 100;
    // Results: All reps at 100px
  };
}

interface ColorConfig {
  hue: {
    mode: 'set-rep-index';
    base: 0;
    increment: 30;
    modulation: 'linear';
    clamp: { min: 0, max: 360 };
    // Results: 0°, 30°, 60°, 90°, 120°... (wraps at 360°)
  };
}

// Example usage in shape-specific properties
interface PolygonProperties {
  edgeCount: {
    mode: 'set-rep-index';
    base: 3;
    increment: 1;
    clamp: { min: 3, max: 12 };
    // Results: triangle, square, pentagon, hexagon...
  };
}
```

### Concrete Examples

#### Example 1: Concentric Circles
**Goal:** Create 5 concentric circles with increasing radius

**Setup:**
- Shape type: Circle
- Repetition: Fixed, count = 5
- Circle radius (width/height):
  - Mode: Set Rep Index
  - Base: 50px
  - Increment: 20px

**Result:**
- Rep 0: 50px radius
- Rep 1: 70px radius
- Rep 2: 90px radius
- Rep 3: 110px radius
- Rep 4: 130px radius

#### Example 2: Radial Line Burst
**Goal:** 24 lines radiating from center point

**Setup:**
- Shape type: Line-Vector
- Repetition: Fixed, count = 24
- Line direction:
  - Mode: Set Rep Index
  - Base: 0°
  - Increment: 15°
- Line length: Fixed at 100px
- Line centroid: Fixed at 0

**Result:**
- Rep 0: 0° direction
- Rep 1: 15° direction
- Rep 2: 30° direction
- ...
- Rep 23: 345° direction

Creates perfect radial burst with evenly spaced lines.

#### Example 3: Polygon Morphing Sequence
**Goal:** Shapes morphing from triangle to dodecagon

**Setup:**
- Shape type: Polygon
- Repetition: Fixed, count = 10
- Edge count:
  - Mode: Set Rep Index
  - Base: 3
  - Increment: 1
  - Clamp: min=3, max=12

**Result:**
- Rep 0: Triangle (3 edges)
- Rep 1: Square (4 edges)
- Rep 2: Pentagon (5 edges)
- ...
- Rep 9: Dodecagon (12 edges)

#### Example 4: Rainbow Color Progression
**Goal:** Full color wheel progression across 12 repetitions

**Setup:**
- Shape type: Circle
- Repetition: Fixed, count = 12
- Fill color hue:
  - Mode: Set Rep Index
  - Base: 0°
  - Increment: 30°
  - Modulation: Linear
- Saturation: Fixed at 100%
- Lightness: Fixed at 50%

**Result:**
- Rep 0: Red (0°)
- Rep 1: Orange (30°)
- Rep 2: Yellow (60°)
- Rep 3: Chartreuse (90°)
- Rep 4: Green (120°)
- ...
- Rep 11: Magenta (330°)

#### Example 5: Fade-Out Sequence
**Goal:** 10 shapes fading from opaque to transparent

**Setup:**
- Shape type: Rectangle
- Repetition: Fixed, count = 10
- Opacity:
  - Mode: Set Rep Index
  - Base: 100%
  - Increment: -10%
  - Clamp: min=0%, max=100%

**Result:**
- Rep 0: 100% opacity
- Rep 1: 90% opacity
- Rep 2: 80% opacity
- ...
- Rep 9: 10% opacity

#### Example 6: Spiral with Combined Properties
**Goal:** Spiral pattern using rotation + position offset

**Setup:**
- Shape type: Circle
- Repetition: Fixed, count = 20
- Rotation:
  - Mode: Set Rep Index
  - Base: 0°
  - Increment: 18°
- Position X:
  - Mode: Set Rep Index
  - Base: 200px (artboard center)
  - Increment: 5px (radius grows)
  - Modulation: Linear
- Use polar coordinate calculation: x = centerX + radius × cos(angle), y = centerY + radius × sin(angle)

**Result:** Shapes arranged in expanding spiral pattern

### Synergies with Existing Features

#### Echo/Spread Effect (Future Feature)
Documented in replit.md, this feature provides controlled position offsets between repetitions. When combined with Set Rep Index:
- **Echo effect** provides predictable X/Y offsets
- **Set Rep Index** adds other property progressions (size, color, opacity, rotation)
- **Result:** Motion blur trails with color shifts, size changes, or rotation

Example: Drop shadow effect with color fade
- Echo: +3px X, +3px Y per rep
- Set Rep Index opacity: 100% → 50% (decreasing)
- Set Rep Index blur: 0px → 5px (increasing)

#### Randomization Per Repetition (Future Feature)
Also documented in replit.md, allows each repetition to get fresh random values. These features complement each other:
- **Set Rep Index:** Controls specific properties predictably (e.g., rotation angle)
- **Randomization:** Other properties remain random (e.g., position, size)
- **Result:** Controlled + chaotic = Radial burst where angle is precise but line length/color are random

Example: Color wheel with random sizes
- Set Rep Index hue: 0° → 360° (precise color progression)
- Random size: 20-80px (varied shapes)
- Random position: scattered placement

#### Global Repetition Override (Future Feature)
Also documented in replit.md, forces global repetition settings across all sets. Interaction:
- When override enabled, all sets use global repetition count
- Set Rep Index calculations still use per-set configurations
- Allows quick testing of index-based progressions at different repetition counts

### UI/UX Considerations

#### Mode Selection
For each property supporting modes (fixed/range/set-rep-index):
- **Dropdown or segmented control** to select mode
- **Conditional UI** showing relevant inputs based on mode:
  - Fixed: Single value input
  - Range: Min/max inputs
  - Set Rep Index: Base, increment, and optional advanced params

#### Basic vs Advanced Parameters
- **Basic view:** Show base and increment only (covers 90% of use cases)
- **Advanced toggle:** Reveals multiplier, offset, modulation options
- **Presets:** Common patterns (linear increase, linear decrease, color wheel, fade in/out)

#### Visual Feedback
- **Preview indicator:** Show calculated values for first 3-5 repetitions
  - Example: "50px → 70px → 90px → 110px..."
- **Graph visualization:** Plot the progression curve for modulated types
- **Real-time preview:** Update canvas as parameters change

#### Property Compatibility
Not all properties make sense for Set Rep Index:
- **Good candidates:** Numeric values (position, size, angles, counts, percentages)
- **Poor candidates:** Boolean flags, categorical selections (unless cycled)
- **Special handling:** Colors need HSL decomposition (control H, S, or L independently)

### Implementation Phases

#### Phase 1: Core Functionality
- Add "set-rep-index" mode to schema for numeric properties
- Implement basic calculation (base + increment × index)
- UI for base and increment inputs
- Support in generation config for position, size, rotation, opacity
- Linear modulation only

**Deliverable:** Users can create concentric circles, radial bursts, fade sequences

#### Phase 2: Shape-Specific Properties
- Extend to shape-specific numeric properties:
  - Polygon: edge count
  - Star: point count, inner radius
  - Line-vector: direction, length, centroid
  - Circle/Ellipse: segment count
  - Bezier/Cubic/Spline: point count, curvature, spread
- UI integration in shape-specific controls

**Deliverable:** Users can create polygon morphing, complexity progressions

#### Phase 3: Advanced Modulation
- Add modulation types: exponential, sine, ease-in, ease-out, step
- Multiplier and offset parameters
- Value clamping with min/max
- UI for advanced parameter panel (collapsible)

**Deliverable:** Users can create wave patterns, accelerating progressions, oscillations

#### Phase 4: Color & Effects
- HSL decomposition for color controls (hue, saturation, lightness independently)
- Gradient angle control
- Blur radius progression
- Stroke width progression
- Shadow parameters

**Deliverable:** Users can create color wheels, blur progressions, dynamic strokes

#### Phase 5: Distribution & Transforms
- Grid spacing control
- Wave amplitude/frequency control
- Spiral tightness
- Transform origin shifts
- Ellipse distribution radii

**Deliverable:** Users can create dynamic distribution layouts

### Edge Cases & Constraints

#### Value Boundaries
- **Clamping:** Ensure values stay within valid ranges
  - Opacity: 0-100%
  - Hue: 0-360° (wrapping)
  - Edge counts: Minimum 3 for polygons
  - Segment counts: Minimum 3 for circles

#### Negative Increments
- Support decreasing progressions (increment < 0)
- Clamp to minimum values to prevent invalid results
- Example: Opacity 100% → 0% requires increment = -10% with clamp min=0%

#### Large Repetition Counts
- With 100 repetitions and increment +10px, final value = 1000px
- Warn user if calculated values exceed reasonable bounds
- Provide visual feedback showing value range

#### Fractional Indices
- Some properties require integers (edge counts, point counts)
- Round calculated values to nearest integer where appropriate

### Performance Considerations
- Calculations are simple arithmetic (no performance concern)
- Pre-calculate values for all repetitions during generation setup
- Cache calculated values to avoid redundant computation
- Modulation functions (sine, exponential) use standard Math library

### Estimated Complexity
**Overall: High** (comprehensive feature touching many systems)

**By Phase:**
- Phase 1 (Core): **Medium** - Schema changes, basic UI, calculation logic
- Phase 2 (Shape-Specific): **Medium** - Extend to type-specific properties
- Phase 3 (Advanced Modulation): **Low** - Additive complexity to existing system
- Phase 4 (Color & Effects): **Medium** - HSL decomposition, new property types
- Phase 5 (Distribution): **Low** - Apply existing pattern to distribution params

### Priority Rationale
This feature significantly expands creative control over repetition:
- Enables entire new categories of designs (radial patterns, progressions, sequences)
- Complements randomization (predictable + chaotic combinations)
- Natural extension of existing repetition system
- High user demand for controlled patterns vs pure randomness

---

## Priority & Timeline

These features are marked for future development. Priority should be determined based on:
- User demand and feedback
- Impact on workflow efficiency
- Technical complexity and resource availability
- Dependencies on other system improvements

**Estimated Complexity:**
- Batch Export Queue: **High** (requires queue management, progress tracking, packaging)
- Multi-format Batch Processing: **Medium** (extends existing export, format-specific settings)
- Set Repetition Index Control: **High** (comprehensive feature touching many systems, phased implementation)

---

## 4. Extended Locking System for Generation Sets

### Overview
A granular control system that allows users to selectively protect individual generation sets from specific operations, preventing unwanted interactions between layers while maintaining flexibility for intentional effects.

### Current Implementation: Composite Lock ✅

**Status:** Implemented (November 2025)

The composite lock feature provides protection from compositing operations for specific generation sets. This is particularly useful for background layers or base elements that should remain unchanged regardless of foreground compositing effects.

#### Functionality
- **Purpose**: Prevent compositing operations (destination-in, destination-out, etc.) from affecting protected sets
- **Default State**: All locks disabled (composite = false)
- **Rendering Strategy**: 
  - Locked sets render first with `source-over` (normal blending)
  - Unlocked sets render after, with their configured compositing operations
  - Compositing operations only affect other unlocked sets
- **Use Cases**:
  - Protecting background layers from foreground masking operations
  - Preserving base shapes while applying destructive compositing to overlays
  - Maintaining specific layer integrity in complex compositions

#### Implementation Details
- **Data Model**: `GenerationSet.locks.composite: boolean`
- **UI**: Lock button on set cards (Lock + "|" + Layers2 icons)
  - Blue background when locked
  - Slate background when unlocked
  - Positioned top-right on set card header
- **Client Rendering**: `client/src/lib/offscreenRenderer.ts`
- **Server Rendering**: `server/lib/generationSetProcessor.ts`
- **Persistence**: Automatically saved/loaded via `useGenerationSetsPersistence`

#### Example Workflow
```
Set 1: Background (LOCKED for composite)
  └─ Rectangle, full artboard, blue fill
  
Set 2: Foreground (UNLOCKED)
  └─ Circle, compositing op: destination-in
  
Result: Circle cuts itself out against unlocked content,
        but Background set remains completely untouched
```

### Future Lock Types

The composite lock is the foundation of a planned granular locking system. Future implementations may include:

#### 1. Blend Lock 🔒
**Purpose**: Prevent blend modes from affecting this set

**Functionality**:
- Locked sets always use `source-over` blend mode
- Protects from global or probability-based blend mode changes
- Useful for maintaining pure color appearance

**Icon**: Lock + "|" + Droplet (or Palette)

#### 2. Transform Lock 🔒
**Purpose**: Prevent moving, scaling, or rotating the set

**Functionality**:
- Locks position (X/Y), rotation, and scale transforms
- Set cannot be moved via Set Transform controls
- Prevents accidental repositioning of fixed layouts

**Icon**: Lock + "|" + Move (or Maximize2)

**Granularity Options**:
- Lock all transforms (position + rotation + scale)
- Lock position only
- Lock rotation only
- Lock scale only

#### 3. Point Edit Lock 🔒
**Purpose**: Protect point-level geometry modifications

**Functionality**:
- Prevents adding, removing, or moving individual control points
- Protects against point-level editing operations
- Maintains exact shape geometry

**Icon**: Lock + "|" + Edit3 (or PenTool)

#### 4. Segment Edit Lock 🔒
**Purpose**: Protect segment-level geometry modifications

**Functionality**:
- Prevents modifying curve segments between points
- Locks tangent handles and curve tension
- Maintains exact path curvature

**Icon**: Lock + "|" + BezierCurve

### Technical Implementation (Future)

#### Data Model Extension
```typescript
interface SetLocks {
  composite: boolean;      // Currently implemented
  blend?: boolean;         // Future: blend mode protection
  transform?: boolean;     // Future: transform protection
  pointEdit?: boolean;     // Future: point-level edit protection
  segmentEdit?: boolean;   // Future: segment-level edit protection
}
```

#### UI Design Patterns
All lock buttons follow the same visual pattern:
- **Container**: Rounded rectangle button
- **Icons**: Lock icon + "|" + operation-specific icon
- **States**: 
  - Unlocked: Slate/transparent background, outline style
  - Locked: Blue/accent background, solid appearance
- **Position**: Top-right on set card, left-to-right order
- **Interaction**: Click to toggle, tooltip on hover

#### Rendering Pipeline Considerations
Each lock type requires different handling:
- **Composite Lock**: Applied during canvas compositing (implemented)
- **Blend Lock**: Applied before shape rendering
- **Transform Lock**: UI-level prevention of transform controls
- **Edit Locks**: Tool-level prevention of geometry editing

### Priority & Complexity

**Composite Lock**: ✅ **Implemented** - Foundation for system

**Future Locks:**
- **Blend Lock**: **Low Complexity** - Similar to composite lock, affects blend mode application
- **Transform Lock**: **Low Complexity** - UI-level control disabling
- **Edit Locks**: **Medium Complexity** - Requires tool-level integration

**Priority Rationale:**
- Composite lock solves the most critical use case (background protection)
- Other locks are valuable but less urgent
- Can be added incrementally as user demand grows
- Architecture supports easy extension via `locks` object

### Synergy with Existing Features
- **Set Visibility**: Locks work alongside visibility controls
- **Set Blending**: Blend lock would complement existing blend mode system
- **Set Transform**: Transform lock would protect against accidental changes
- **Compositing Operations**: Composite lock (implemented) protects from these

---

## 5. Grid Layout Enhancements

### Overview
A comprehensive set of enhancements to the grid distribution layout system, adding advanced offset controls, shape masking capabilities, and cell-based rendering options. These features enable more creative and precise control over how shapes are positioned and rendered within grid structures.

### Current State
The grid layout system currently supports:
- Fixed rows and columns with customizable spacing
- Start position offsets (X/Y)
- Three spacing modes: Define, Auto-Centered, Auto-Edge-to-Edge
- Sorting and grouping options
- X/Y randomization for position jitter
- ✅ Grid Offsets (Alternating & Pattern modes)
- ✅ Shape Masking (Grid Position filtering)
- ✅ Grid Render Mode (Point vs Cell-based positioning)

### Implementation Status
| Phase | Feature | Status |
|-------|---------|--------|
| Phase 1 | Alternating Grid Offsets | ✅ Implemented |
| Phase 2 | Pattern-Based Offsets | ✅ Implemented |
| Phase 3 | Shape Masking (Grid-Based) | ✅ Implemented |
| Phase 4 | Grid Render Mode (Cell-Based) | ⚠️ Implemented - Untested |
| Phase 5+ | No-Overlap/Distance Maintenance | Future |

### Phased Implementation Plan

---

### Phase 1: Alternating Grid Offsets ✅ IMPLEMENTED

#### Overview
Add the ability to offset every second row or column by a fixed pixel amount, with control over which row/column the alternation starts from.

**Implementation Status**: Complete  
**Location**: Grid Layout section in BatchConfigDialog.tsx

#### Use Cases
- Brick/honeycomb patterns where rows are staggered
- Hexagonal-style layouts
- Visual rhythm variations in grid compositions

#### Data Model
```typescript
gridOffsets: {
  enabled: boolean;
  mode: 'alternating';  // Phase 1 only supports alternating
  row: {
    enabled: boolean;
    amount: number;           // Pixels to offset
    startIndex: 0 | 1;        // Which row starts the offset (0 = first row, 1 = second row)
    direction: 'left' | 'right';  // Direction of offset
  };
  column: {
    enabled: boolean;
    amount: number;           // Pixels to offset
    startIndex: 0 | 1;        // Which column starts the offset
    direction: 'up' | 'down';     // Direction of offset
  };
}
```

#### Offset Calculation Logic
```typescript
// For each shape at grid position (row, col):
let offsetX = 0;
let offsetY = 0;

// Row offset affects X position (shifts row left/right)
if (gridOffsets.row.enabled) {
  const isOffsetRow = (row % 2) === gridOffsets.row.startIndex;
  if (isOffsetRow) {
    offsetX = gridOffsets.row.direction === 'right' 
      ? gridOffsets.row.amount 
      : -gridOffsets.row.amount;
  }
}

// Column offset affects Y position (shifts column up/down)
if (gridOffsets.column.enabled) {
  const isOffsetColumn = (col % 2) === gridOffsets.column.startIndex;
  if (isOffsetColumn) {
    offsetY = gridOffsets.column.direction === 'down' 
      ? gridOffsets.column.amount 
      : -gridOffsets.column.amount;
  }
}

finalX = baseX + offsetX;
finalY = baseY + offsetY;
```

#### UI Controls
Within the Grid Layout section:
- **Grid Offsets** accordion/collapsible
  - Enable toggle
  - **Row Offset** subsection:
    - Enable toggle
    - Amount input (px)
    - Start index: dropdown (0 or 1) with labels "1st row" / "2nd row"
    - Direction: dropdown (left/right)
  - **Column Offset** subsection:
    - Enable toggle
    - Amount input (px)
    - Start index: dropdown (0 or 1) with labels "1st column" / "2nd column"
    - Direction: dropdown (up/down)

---

### Phase 2: Pattern-Based Offsets ✅ IMPLEMENTED

#### Overview
Extend the offset system to support explicit patterns defining which rows/columns receive offsets, rather than simple alternation.

**Implementation Status**: Complete  
**Location**: Grid Layout section in BatchConfigDialog.tsx (Grid Offsets subsection)

#### Use Cases
- Complex staggered patterns (e.g., offset rows 0, 2, 3, 5 but not 1, 4)
- Asymmetric visual rhythms
- Architectural/design patterns requiring specific offset sequences

#### Data Model Extension
```typescript
gridOffsets: {
  enabled: boolean;
  mode: 'alternating' | 'pattern';
  row: {
    enabled: boolean;
    amount: number;
    startIndex: 0 | 1;        // For alternating mode
    direction: 'left' | 'right';
    pattern: number[];        // For pattern mode: [0, 2, 3, 5] = offset these row indices
  };
  column: {
    enabled: boolean;
    amount: number;
    startIndex: 0 | 1;
    direction: 'up' | 'down';
    pattern: number[];        // For pattern mode
  };
}
```

#### Pattern Input
- **Absolute indices**: Pattern `[0, 2, 3, 5]` means exactly rows/columns 0, 2, 3, and 5 receive offset
- **No repetition**: Patterns don't cycle - only specified indices are affected
- **Input format**: Comma-separated numbers in text field (e.g., "0, 2, 3, 5")
- **Future enhancement**: Could support range syntax like "0-3, 5, 7-10"

#### Pattern Calculation Logic
```typescript
if (gridOffsets.mode === 'pattern') {
  // Row offset
  if (gridOffsets.row.enabled && gridOffsets.row.pattern.includes(row)) {
    offsetX = gridOffsets.row.direction === 'right' 
      ? gridOffsets.row.amount 
      : -gridOffsets.row.amount;
  }
  
  // Column offset
  if (gridOffsets.column.enabled && gridOffsets.column.pattern.includes(col)) {
    offsetY = gridOffsets.column.direction === 'down' 
      ? gridOffsets.column.amount 
      : -gridOffsets.column.amount;
  }
}
```

---

### Phase 3: Shape Masking (Grid-Based) ✅ IMPLEMENTED

#### Overview
A standalone top-level section for controlling which grid positions render shapes and which are excluded. Named "Shape Masking" to accommodate future masking methods beyond grid-based exclusion.

**Implementation Status**: Complete  
**Location**: BatchConfigDialog.tsx - Standalone section between Distribution Layout and Properties

#### Architecture Design
Shape Masking is structured as an independent filtering layer that operates separately from Distribution Layout:

```typescript
shapeMasking: {
  enabled: boolean;              // Master toggle for all masking
  
  // Grid Position Filter (IMPLEMENTED)
  grid: {
    enabled: boolean;            // Toggle for grid-based masking specifically
    mode: 'alternating' | 'pattern';
    invert: boolean;              // false = exclude matched, true = render only matched
    priority: 'row-first' | 'column-first';
    
    // Alternating mode settings
    alternating: {
      skipEvery: number;          // Skip every Nth row/column (1-10)
      startIndex: number;         // Where alternation begins (0-indexed)
    };
    
    // Pattern mode settings
    pattern: Array<{
      row: number;
      columns: number[];          // Which columns to mask for this row
    }>;
  };
  
  // Future Filter Types (PLANNED)
  position: { ... };    // Filter by X/Y range, distance from center/edges
  count: { ... };       // Filter by shape index, random percentage
  color: { ... };       // Filter by hue range, saturation, lightness
  size: { ... };        // Filter by shape dimensions
  rotation: { ... };    // Filter by rotation angle ranges
  opacity: { ... };     // Filter by opacity thresholds
}
```

#### Key Design Decisions

1. **Standalone Section**: Shape Masking is NOT nested inside Distribution Layout. It appears as its own top-level section in the BatchConfigDialog, positioned between Distribution Layout and Properties sections.

2. **Dual Enable Toggles**: 
   - Master toggle enables/disables the entire Shape Masking feature
   - Each filter type (grid, position, etc.) has its own enable toggle
   - This allows enabling Shape Masking while selectively activating filter types

3. **Grid-Specific Application**: Grid Position masking only applies when Distribution Layout is set to "grid" pattern. For non-grid layouts (wave, spiral, ellipse, auto-distribute), the grid filter has no effect since there are no row/column concepts.

4. **Future Extensibility**: The architecture supports adding new filter types as subsections. Each filter type will have its own configuration panel and enable toggle.

#### Inversion Toggle
- **Invert OFF (default)**: Matched positions are EXCLUDED (shapes don't render at those positions)
- **Invert ON**: Matched positions are the ONLY ones that render (non-matched are excluded)

#### Implemented UI Controls

**Shape Masking Section** (Top-level, between Distribution Layout and Properties):
- Master enable checkbox with label "Shape Masking"
- Mode indicator showing current mode (Skip every N) or (Pattern)

**Grid Position Subsection** (when Shape Masking enabled):
- Enable checkbox with label "Grid Position" and description "Filter by row/column indices"
- **Mode dropdown**: Alternating or Pattern
- **Priority dropdown**: Row First or Column First
- **Invert checkbox**: Dynamic label showing current behavior
- **Alternating Settings** (when mode = alternating):
  - Skip Every N: Number input (1-10)
  - Start Index: Number input (0 to skipEvery-1)
  - Helper text showing which indices will be masked
- **Pattern Settings** (when mode = pattern):
  - Dynamic list of row/column pattern entries
  - Each entry: Row index input + Columns input (comma-separated)
  - Add/Remove buttons for pattern entries
  - Helper text explaining pattern usage

**Future Filters Placeholder**:
- Informational text: "Additional filter types (Position, Color, Size) coming soon"

#### Masking Logic (isPositionMasked function)

Located in `client/src/lib/shapeTypes.ts`:

```typescript
export function isPositionMasked(
  row: number,
  column: number,
  shapeMasking?: ShapeMaskingConfig
): boolean {
  // Returns true if position should be masked (excluded from rendering)
  
  // Early return if masking disabled
  if (!shapeMasking?.enabled || !shapeMasking?.grid?.enabled) {
    return false;
  }
  
  const grid = shapeMasking.grid;
  let isMatched = false;
  
  if (grid.mode === 'alternating') {
    // Check if row/column matches alternating pattern
    const { skipEvery, startIndex } = grid.alternating;
    if (grid.priority === 'row-first') {
      isMatched = ((row - startIndex) % skipEvery) === 0 && row >= startIndex;
    } else {
      isMatched = ((column - startIndex) % skipEvery) === 0 && column >= startIndex;
    }
  } else if (grid.mode === 'pattern') {
    // Check explicit row/column combinations
    for (const entry of grid.pattern) {
      if (entry.row === row && entry.columns.includes(column)) {
        isMatched = true;
        break;
      }
    }
  }
  
  // Apply inversion
  return grid.invert ? !isMatched : isMatched;
}
```

#### Usage in Distribution

The `applyGridDistribution` function in `shapeTypes.ts` uses masking:

```typescript
// Build list of valid (non-masked) grid positions
const validPositions = [];
for (let i = 0; i < totalPositions; i++) {
  const rowIndex = Math.floor(i / config.gridColumns);
  const colIndex = i % config.gridColumns;
  
  // Check if this position is masked
  if (!isPositionMasked(rowIndex, colIndex, config.shapeMasking)) {
    validPositions.push({ rowIndex, colIndex, linearIndex: i });
  }
}

// Map shapes to valid positions only
return sortedShapes.map((shape, index) => {
  const position = validPositions[index % validPositions.length];
  // Apply position to shape...
});
```

#### Interaction with Other Features
- Shape Masking applies to grid distribution specifically
- Works with Grid Offsets (Phase 1 & 2) - offsets are applied to non-masked positions
- Will work with Cell-Based Rendering (Phase 4) - defines valid cells for placement

#### Future Filter Types (Planned)

**Position-Based Masking**:
- Filter by absolute X/Y coordinate ranges
- Filter by distance from artboard center/edges
- Filter by quadrant or region

**Count-Based Masking**:
- Filter every Nth shape regardless of grid position
- Random percentage filtering
- First N / Last N shapes only

**Color-Based Masking**:
- Filter by hue range
- Filter by saturation/lightness thresholds
- Filter by specific color match

**Size-Based Masking**:
- Filter by shape dimensions (width/height)
- Filter by area
- Filter by aspect ratio

**Rotation-Based Masking**:
- Filter by rotation angle ranges
- Filter by specific angle values

**Opacity-Based Masking**:
- Filter by opacity thresholds
- Filter transparent/opaque shapes

#### Future Enhancement: Masked Shape Operations

**Concept**: The current shape masking system identifies shapes at specific grid positions and excludes them from rendering. Using the same selection logic, we could apply various transformations to these shapes instead of simply removing them. This transforms Shape Masking from a binary "show/hide" system into a powerful selective modification tool.

**Operation Types**:

**Transform Operations**:
- **Move/Translate**: Shift matched shapes by X/Y offset (create staggered effects)
- **Scale**: Resize matched shapes (alternating large/small patterns)
- **Rotate**: Apply rotation to matched shapes (directional emphasis)
- **Skew**: Apply skew transformations to matched shapes

**Visual Operations**:
- **Recolor Fill**: Change fill color of matched shapes (checkerboard color patterns)
- **Recolor Stroke**: Change stroke color/width of matched shapes
- **Adjust Opacity**: Modify opacity of matched shapes (fade alternate rows/columns)
- **Apply Blur**: Add blur effect to matched shapes (depth-of-field effects)
- **Apply Gradient**: Override gradient on matched shapes

**Compositional Operations**:
- **Change Blend Mode**: Apply different blend mode to matched shapes
- **Change Compositing**: Apply different compositing operation
- **Adjust Z-Index**: Modify layer order of matched shapes

**Shape Operations**:
- **Change Shape Type**: Transform matched shapes to a different type
- **Modify Properties**: Adjust shape-specific properties (corner radius, point count, etc.)

**Implementation Approach**:
```typescript
interface ShapeMaskingOperation {
  mode: 'exclude' | 'transform';  // Current 'exclude' is default
  
  // When mode is 'transform', apply these operations to matched shapes
  operations?: {
    translate?: { x: number; y: number };
    scale?: { x: number; y: number };
    rotate?: number;
    fillColor?: string;
    strokeColor?: string;
    opacity?: number;
    blur?: number;
    blendMode?: string;
    // ... additional operation types
  };
}
```

**UI Considerations**:
- Mode selector: "Exclude Shapes" (current) vs "Transform Shapes"
- When "Transform" mode selected, show operation configuration panel
- Multiple operations can be stacked (e.g., scale + recolor + rotate)
- Preview shows matched shapes with operations applied

**Use Cases**:
1. **Checkerboard patterns**: Alternate shapes with different colors/sizes
2. **Emphasis effects**: Scale up or highlight shapes at specific positions
3. **Depth simulation**: Reduce opacity/apply blur to create layered depth
4. **Pattern variation**: Rotate alternate shapes for visual interest
5. **Color gradients across grid**: Progressive color changes based on position

**Synergy with Existing Features**:
- Combines with all existing filter types (alternating, pattern, position, color, size, count)
- Works with Set Repetition Index Control for index-based operations
- Enables complex visual patterns without creating multiple shape sets

---

### Phase 4: Grid Render Mode (Cell-Based Rendering) ⚠️ IMPLEMENTED - UNTESTED

#### Overview
Controls how shapes are positioned within grid cells: either at intersection points (Point mode) or centered within cells with size constraints (Cell mode).

**Implementation Status**: Complete (Untested)  
**Location**: Part of Grid distribution settings in Distribution Layout section of BatchConfigDialog.tsx

#### Render Modes
| Mode | Position | Size Control | Use Case |
|------|----------|-------------|----------|
| Point | Grid intersection points | Independent of grid | Traditional grid positioning |
| Cell | Center of cell area | Constrained by cell dimensions | Shapes filling a grid |

#### Data Model
```typescript
cellConstraints: {
  enabled: boolean;           // Auto-set based on renderMode
  renderMode: 'point' | 'cell';
  
  // Cell mode settings (only active when renderMode = 'cell')
  fitMode: 'none' | 'fill' | 'contain' | 'cover';
  // - none: Use original shape size, just center in cell
  // - contain: Scale to fit within cell (maintain aspect ratio)
  // - cover: Scale to cover cell (maintain aspect ratio)
  // - fill: Stretch to fill cell (configurable aspect ratio)
  
  maintainAspectRatio: boolean;   // For 'fill' mode - uses Math.max (cover ratio) when true
  padding: number;                // Inset from cell edges
  paddingUnit: 'px' | '%';        // Pixel or percentage of cell size
}
```

#### Implementation Details
- **UI Location**: Render Mode controls appear within the Grid distribution settings, after Grid Offsets
- **Client-side**: Full implementation in `shapeTypes.ts` with live preview
- **Server-side**: Placeholder for future export support (client preview fully functional)
- **Fill Mode Fix**: When `maintainAspectRatio=true`, uses `Math.max` (cover ratio) to ensure shape fills entire cell

#### Cell Calculation (Client Implementation)
```typescript
// Cell dimensions based on grid spacing
const cellWidth = gridSpacingX;
const cellHeight = gridSpacingY;

// Cell center position
const cellCenterX = gridStartX + (col * cellWidth) + (cellWidth / 2);
const cellCenterY = gridStartY + (row * cellHeight) + (cellHeight / 2);

// Available space after padding
const availableWidth = cellWidth - (padding * 2);
const availableHeight = cellHeight - (padding * 2);

// Scale shape based on fit mode
switch (fitMode) {
  case 'contain':
    const scale = Math.min(availableWidth / shapeWidth, availableHeight / shapeHeight);
    break;
  case 'cover':
    const scale = Math.max(availableWidth / shapeWidth, availableHeight / shapeHeight);
    break;
  case 'fill':
    if (maintainAspectRatio) {
      // Use cover ratio (Math.max) to fill entire cell
      const scale = Math.max(availableWidth / shapeWidth, availableHeight / shapeHeight);
    } else {
      // Independent X/Y scaling
      scaleX = availableWidth / shapeWidth;
      scaleY = availableHeight / shapeHeight;
    }
    break;
}
```

#### Interaction with Shape Masking
Shape Masking (Phase 3) defines which cells are valid for rendering. Grid Render Mode then determines HOW shapes are placed within those valid cells.

---

### Phase 5+: No-Overlap/Distance Maintenance (Future)

#### Overview
Advanced collision detection and resolution to ensure offset shapes don't overlap or maintain minimum distance from adjacent shapes.

#### Complexity
This phase involves:
- Collision detection between shapes
- Iterative position adjustment algorithms
- Performance considerations for large shape counts
- Edge case handling (when collision-free placement is impossible)

#### Potential Approaches
1. **Simple distance check**: Ensure minimum gap between shape bounds
2. **Collision resolution**: Iteratively push overlapping shapes apart
3. **Constraint-based placement**: Pre-calculate valid positions before placement
4. **Fallback strategies**: What happens when shapes can't fit without overlap?

#### Deferred Rationale
This phase is deferred due to:
- Significant algorithmic complexity
- Performance implications
- Need to establish Phases 1-4 first as foundation
- User demand will inform priority

---

### Technical Considerations

#### Client/Server Parity
All offset and masking calculations must be identical on client (preview) and server (export) to ensure what users see matches what they export.

#### Default Values
```typescript
// gridOffsets defaults
gridOffsets: {
  enabled: false,
  mode: 'alternating',
  row: { enabled: false, amount: 0, startIndex: 0, direction: 'right', pattern: [] },
  column: { enabled: false, amount: 0, startIndex: 0, direction: 'down', pattern: [] }
}

// shapeMasking defaults
shapeMasking: {
  enabled: false,
  grid: {
    enabled: false,
    mode: 'alternating',
    invert: false,
    priority: 'row-first',
    alternating: { skipEvery: 2, startIndex: 0 },
    pattern: []
  }
}

// cellConstraints defaults
cellConstraints: {
  enabled: false,
  renderMode: 'point',        // 'point' (intersection) or 'cell' (cell-based)
  fitMode: 'contain',
  maintainAspectRatio: true,
  padding: 0,
  paddingUnit: 'px'
}
```

#### Migration Strategy
New properties should be added with defaults that preserve existing behavior:
- `gridOffsets.enabled: false` → No offsets applied (current behavior)
- `shapeMasking.enabled: false` → All positions render (current behavior)
- `cellConstraints.renderMode: 'point'` → Current behavior (shapes at intersection points)

---

## Grid Offset Presets

### Overview
Pre-configured offset patterns that allow users to quickly apply common visual arrangements with a single click. These presets combine row and column offset settings to create recognizable patterns used in design, architecture, and nature.

### Implementation Context
Grid Offset Presets build upon the Phase 1 Grid Offsets implementation, providing pre-defined configurations for the existing offset controls (enabled state, amount, startIndex, direction for both row and column axes).

### Preset Definitions

#### 1. Brick Pattern
**Description:** Classic brick wall or masonry layout where alternating rows are horizontally offset by half the column spacing.

**Configuration:**
```typescript
{
  row: {
    enabled: true,
    amount: gridSpacingX / 2,  // Half the horizontal grid spacing
    startIndex: 1,              // Start offset on 2nd row
    direction: 'right'
  },
  column: {
    enabled: false
  }
}
```

**Visual Effect:**
```
[*] [*] [*] [*]        Row 0 (not offset)
   [*] [*] [*] [*]     Row 1 (offset right by 50%)
[*] [*] [*] [*]        Row 2 (not offset)
   [*] [*] [*] [*]     Row 3 (offset right by 50%)
```

**Use Cases:**
- Brick wall textures
- Tiled floor patterns
- Running bond layouts
- Offset photo grids

---

#### 2. Honeycomb Pattern
**Description:** Hexagonal-style arrangement mimicking natural honeycomb structure. Alternating rows offset horizontally AND alternating columns offset vertically to create interlocking pattern.

**Configuration:**
```typescript
{
  row: {
    enabled: true,
    amount: gridSpacingX / 2,  // Half horizontal spacing
    startIndex: 1,
    direction: 'right'
  },
  column: {
    enabled: true,
    amount: gridSpacingY / 4,  // Quarter vertical spacing
    startIndex: 1,
    direction: 'down'
  }
}
```

**Visual Effect:**
```
[*]   [*]   [*]   [*]      Row 0
   [*]   [*]   [*]   [*]   Row 1 (offset right + down)
[*]   [*]   [*]   [*]      Row 2
   [*]   [*]   [*]   [*]   Row 3 (offset right + down)
```

**Use Cases:**
- Hexagonal grids
- Organic/natural patterns
- Efficient packing layouts
- Scientific/molecular diagrams

---

#### 3. Staircase Pattern
**Description:** Progressive diagonal arrangement where each row offsets further in the same direction, creating a descending or ascending stair effect.

**Configuration (Descending Right):**
```typescript
{
  row: {
    enabled: true,
    amount: 20,           // Fixed step amount (or gridSpacingX / 4)
    startIndex: 1,        // Apply to all rows from 2nd onwards
    direction: 'right'    // or 'left' for descending left
  },
  column: {
    enabled: false
  }
}
```

**Note:** True staircase requires incremental offset mode (Phase 2 enhancement) where amount increases per row. With alternating mode, this creates a simpler two-step pattern.

**Visual Effect (with alternating mode):**
```
[*] [*] [*] [*]           Row 0
    [*] [*] [*] [*]       Row 1 (offset)
[*] [*] [*] [*]           Row 2 (back to baseline)
    [*] [*] [*] [*]       Row 3 (offset)
```

**Use Cases:**
- Cascade layouts
- Timeline visualizations
- Hierarchical diagrams
- Motion/sequence illustrations

---

#### 4. Zigzag/Wave Pattern
**Description:** Alternating offset direction creating a zigzag or wave-like visual rhythm. Odd rows offset one direction, even rows offset the opposite direction.

**Configuration:**
```typescript
// Note: Current implementation doesn't support alternating direction per row.
// This preset would require Phase 2 pattern-based offsets or direction alternation.

// Workaround using column offset for vertical zigzag:
{
  row: {
    enabled: false
  },
  column: {
    enabled: true,
    amount: gridSpacingY / 2,
    startIndex: 1,
    direction: 'down'  // Creates vertical zigzag
  }
}
```

**True Zigzag (requires Phase 2):**
```
   [*] [*] [*] [*]        Row 0 (offset right)
[*] [*] [*] [*]           Row 1 (offset left)
   [*] [*] [*] [*]        Row 2 (offset right)
[*] [*] [*] [*]           Row 3 (offset left)
```

**Use Cases:**
- Chevron patterns
- Wave/water effects
- Dynamic visual rhythm
- Art deco styling

---

#### 5. Diamond/Checkerboard Pattern
**Description:** Combined row and column offsets that create a diamond or checkerboard-like arrangement with shapes at diagonal intersections.

**Configuration:**
```typescript
{
  row: {
    enabled: true,
    amount: gridSpacingX / 2,
    startIndex: 1,
    direction: 'right'
  },
  column: {
    enabled: true,
    amount: gridSpacingY / 2,
    startIndex: 1,
    direction: 'down'
  }
}
```

**Visual Effect:**
```
[*]     [*]     [*]        Row 0
    [*]     [*]     [*]    Row 1 (offset right + down)
[*]     [*]     [*]        Row 2
    [*]     [*]     [*]    Row 3 (offset right + down)
```

**Use Cases:**
- Argyle patterns
- Diamond tiling
- Decorative geometric designs
- Playing card patterns

---

### UI/UX Implementation

#### Preset Selector
- **Location:** Within Grid Offsets section, above manual controls
- **Format:** Dropdown or button group with preset names and icons
- **Options:** "None", "Brick", "Honeycomb", "Staircase", "Zigzag", "Diamond"

#### Behavior
1. User selects a preset
2. Offset controls update to show preset values
3. User can modify values after applying preset (exits "preset mode")
4. Selecting "None" clears all offsets

#### Visual Preview
- Small icon/thumbnail next to each preset option showing the pattern
- Tooltip with description on hover

#### Smart Defaults
- Preset amounts calculated from current grid spacing when possible
- If grid spacing is 0 or undefined, use sensible pixel values (e.g., 20px)

### Technical Notes

#### Preset Application Logic
```typescript
function applyOffsetPreset(preset: string, gridSpacingX: number, gridSpacingY: number): GridOffsets {
  switch (preset) {
    case 'brick':
      return {
        enabled: true,
        mode: 'alternating',
        row: { enabled: true, amount: gridSpacingX / 2, startIndex: 1, direction: 'right' },
        column: { enabled: false, amount: 0, startIndex: 0, direction: 'down' }
      };
    case 'honeycomb':
      return {
        enabled: true,
        mode: 'alternating',
        row: { enabled: true, amount: gridSpacingX / 2, startIndex: 1, direction: 'right' },
        column: { enabled: true, amount: gridSpacingY / 4, startIndex: 1, direction: 'down' }
      };
    case 'diamond':
      return {
        enabled: true,
        mode: 'alternating',
        row: { enabled: true, amount: gridSpacingX / 2, startIndex: 1, direction: 'right' },
        column: { enabled: true, amount: gridSpacingY / 2, startIndex: 1, direction: 'down' }
      };
    // ... other presets
  }
}
```

#### Future Enhancements
- User-defined presets (save current offset configuration as named preset)
- Preset variations (e.g., "Brick Left", "Brick Right")
- Preset combinations with pattern mode (Phase 2)
- Animated preview showing pattern effect

---

## Grid Offset Enhancements (Future Considerations)

The current Grid Offsets implementation (Phase 1) provides alternating row/column offsets with dynamic start index selection and improved input field UX.

### Value Mode Pattern for Offset Properties
**Current:** Amount uses a simple fixed value.

**Enhancement:** Apply the standard value mode pattern (fixed/range/incremental) to the Amount property:

#### Amount Value Modes:
- **Fixed:** Single value (current behavior) - e.g., 20px offset
- **Range:** Random value within min/max bounds - e.g., 10-30px offset per alternating row
- **Incremental:** Progressive offset that grows - e.g., 1st row offset=10px, 3rd row offset=20px, 5th row offset=30px

**Use Cases:**
- Range mode: More organic, irregular offset patterns with random variation
- Incremental mode: Progressively shifting offset patterns creating perspective or wave effects

**Implementation Notes:**
- Would follow the established pattern used elsewhere in the application for value modes
- Requires UI changes to add mode selector and conditional inputs for range (min/max) or incremental (base/increment/modulation)
- Generation logic would need to calculate offset based on mode and row/column index

---

## Echo/Spread Effect

### Overview
A controlled layering system that creates deliberate position offsets between repetitions of shape sets, producing visual effects like motion blur trails, drop shadows, or echo patterns.

### Current State
Shape Set repetitions are currently positioned identically—each repetition overlays exactly on top of previous instances. Users cannot create predictable offset patterns between repetitions without manually creating separate sets with different positions.

### Proposed Feature

#### Core Functionality
1. **Echo/Spread Toggle**
   - Enable/disable echo effect per Shape Set
   - When enabled, each repetition is positioned at a calculated offset from the base position
   - Works in conjunction with existing repetition settings (fixed count, range)

2. **Offset Configuration**
   - **X Offset per Instance:** Horizontal displacement per repetition (e.g., +5px)
   - **Y Offset per Instance:** Vertical displacement per repetition (e.g., +5px)
   - **Cumulative vs. Fixed:** Option for cumulative offsets (1st at 0, 2nd at +5, 3rd at +10) or fixed offset from base
   - **Direction Modes:** 
     - Linear (consistent direction)
     - Radial (spreading outward from center)
     - Random (controlled scatter around base position)

3. **Visual Result Examples**
   - **Motion Trail:** 5 repetitions with offset (10,0) creates horizontal trail effect
   - **Drop Shadow Stack:** 5 repetitions with offset (2,2) creates depth illusion
   - **Radial Echo:** 8 repetitions spreading outward in circular pattern
   - **Cascade:** Repetitions stacking diagonally like cards

4. **Additional Transform Options**
   - **Opacity Fade:** Each repetition slightly more transparent
   - **Scale Reduction:** Each repetition slightly smaller
   - **Rotation Increment:** Each repetition rotated by N degrees
   - **Color Shift:** Gradual hue/saturation shift across repetitions

#### Technical Requirements

**Schema Extensions:**
```typescript
interface EchoSpreadConfig {
  enabled: boolean;
  mode: 'linear' | 'radial' | 'random';
  
  // Linear/Radial mode
  offsetX: number;           // Pixels per repetition in X
  offsetY: number;           // Pixels per repetition in Y
  cumulative: boolean;       // true = offsets accumulate, false = fixed from base
  
  // Radial mode
  radialStartAngle: number;  // Starting angle for radial spread (degrees)
  radialSpacing: number;     // Distance per repetition (pixels)
  
  // Random mode
  randomRangeX: [number, number];  // Min/max X scatter
  randomRangeY: [number, number];  // Min/max Y scatter
  
  // Additional transforms
  opacityFade: boolean;
  opacityStep: number;       // Opacity reduction per repetition (e.g., 0.1)
  scaleReduction: boolean;
  scaleStep: number;         // Scale reduction per repetition (e.g., 0.95)
  rotationIncrement: boolean;
  rotationStep: number;      // Rotation per repetition (degrees)
}
```

**Generation Logic:**
```typescript
function applyEchoSpread(
  baseShapes: Shape[],
  repetitionIndex: number,
  config: EchoSpreadConfig
): Shape[] {
  if (!config.enabled) return baseShapes;
  
  const offsetMultiplier = config.cumulative ? repetitionIndex : 1;
  
  return baseShapes.map(shape => {
    const offsetShape = { ...shape };
    
    // Apply position offset
    if (config.mode === 'linear') {
      offsetShape.transform.x += config.offsetX * offsetMultiplier;
      offsetShape.transform.y += config.offsetY * offsetMultiplier;
    } else if (config.mode === 'radial') {
      const angle = config.radialStartAngle + (360 / repetitionIndex);
      const distance = config.radialSpacing * repetitionIndex;
      offsetShape.transform.x += Math.cos(angle * Math.PI / 180) * distance;
      offsetShape.transform.y += Math.sin(angle * Math.PI / 180) * distance;
    }
    
    // Apply additional transforms
    if (config.opacityFade) {
      offsetShape.opacity *= Math.pow(1 - config.opacityStep, repetitionIndex);
    }
    if (config.scaleReduction) {
      const scaleFactor = Math.pow(config.scaleStep, repetitionIndex);
      offsetShape.width *= scaleFactor;
      offsetShape.height *= scaleFactor;
    }
    if (config.rotationIncrement) {
      offsetShape.rotation += config.rotationStep * repetitionIndex;
    }
    
    return offsetShape;
  });
}
```

#### UI/UX Design

**Location:** New "Echo/Spread" section in Set-level configuration (alongside Repetition settings)

**Controls:**
1. **Enable Toggle:** Checkbox to activate echo effect
2. **Mode Selector:** Dropdown (Linear/Radial/Random)
3. **Offset Inputs:** X/Y input fields with unit labels
4. **Cumulative Toggle:** Checkbox for cumulative vs. fixed offset
5. **Additional Effects:** Collapsible section with opacity/scale/rotation sliders
6. **Preview:** Real-time preview showing echo pattern on canvas

**Visual Indicators:**
- Badge showing "Echo: 5 steps" or similar summary
- Ghost preview lines showing offset direction

#### Use Cases
1. **Depth Simulation:** Create 3D-like depth by stacking slightly offset copies
2. **Vintage Print Effect:** Simulate old print registration errors
3. **Neon Glow Trails:** Create glowing trail effects behind shapes
4. **Kinetic Typography:** Suggest motion through positioned repetitions
5. **Layered Shadows:** Build complex shadow effects with controlled falloff

#### Implementation Phases
1. **Phase 1:** Basic linear offset with X/Y controls and cumulative option
2. **Phase 2:** Radial and random modes
3. **Phase 3:** Additional transforms (opacity, scale, rotation)
4. **Phase 4:** Advanced color shifting and blend mode variations

---

## Advanced Multi-Filter System for Shape Sets

### Overview
A comprehensive filtering system for the Sets Manager dialog that enables efficient management of large numbers of shape sets through name-based and property-based filtering.

### Current State
The Sets Manager dialog displays all shape sets in a flat list. As projects grow to include dozens of sets, finding and managing specific sets becomes increasingly difficult. Users must scroll through the entire list to find sets with specific characteristics.

### Proposed Feature

#### Core Functionality

1. **Dual Filter Approach**
   - **Name Filter:** Quick-access dropdown showing all set names for direct selection
   - **Property Filters:** Combinable filter criteria that work as removable chips/badges

2. **Filter Categories**

   | Category | Options |
   |----------|---------|
   | Hidden Status | Hidden, Not Hidden |
   | Shape Types | Multi-select: rectangle, circle, polygon, star, etc. |
   | Lock Status | Locked, Unlocked |
   | Count Mode | Fixed, Range |
   | Blending | Enabled, Disabled |
   | Transforms | Enabled, Disabled |
   | Distribution Layout | Grid, Spiral, Wave, Ellipse, Auto-Distribute, None |
   | Z-index Range | Min/Max value inputs |
   | Repetition Mode | Use Global, Fixed, Range |
   | Has Pattern | Gradient, Solid, None |

3. **Multi-Filter Logic**
   - Filters combine with AND logic (sets must match ALL active filters)
   - Each filter category is independent
   - Clear visual indication of active filters

4. **Filter Management**
   - Add filters via dropdown + value selector → appears as removable chip
   - "Clear All Filters" button when filters are active
   - Live count display: "5 of 20 sets shown"
   - Filters persist during session (optional: save with project)

#### Technical Requirements

**Schema Extensions:**
```typescript
interface SetFilter {
  id: string;
  category: FilterCategory;
  value: string | number | boolean | string[];
  operator?: 'equals' | 'contains' | 'greater' | 'less' | 'range';
}

type FilterCategory = 
  | 'hidden' 
  | 'shape-types' 
  | 'locked' 
  | 'count-mode'
  | 'blending'
  | 'transforms'
  | 'distribution'
  | 'z-index-min'
  | 'z-index-max'
  | 'repetition-mode'
  | 'name';

interface FilterState {
  activeFilters: SetFilter[];
  nameSearch: string;
  showFilteredCount: boolean;
}
```

**Filter Logic Implementation:**
```typescript
function applyFilters(
  sets: GenerationSet[],
  filters: FilterState
): GenerationSet[] {
  return sets.filter(set => {
    // Name search (partial match)
    if (filters.nameSearch && !set.name.toLowerCase().includes(filters.nameSearch.toLowerCase())) {
      return false;
    }
    
    // Apply each active filter
    for (const filter of filters.activeFilters) {
      if (!matchesFilter(set, filter)) {
        return false;
      }
    }
    
    return true;
  });
}

function matchesFilter(set: GenerationSet, filter: SetFilter): boolean {
  switch (filter.category) {
    case 'hidden':
      return set.hidden === (filter.value === 'hidden');
    case 'locked':
      return set.locked === (filter.value === 'locked');
    case 'shape-types':
      const filterTypes = filter.value as string[];
      return set.shapeTypes.some(type => filterTypes.includes(type));
    case 'distribution':
      return set.batchConfig.distributionPattern === filter.value;
    case 'z-index-min':
      return set.zIndexOffset >= (filter.value as number);
    case 'z-index-max':
      return set.zIndexOffset <= (filter.value as number);
    case 'count-mode':
      return set.batchConfig.generationCountMode === filter.value;
    case 'blending':
      return set.batchConfig.setBlendingEnabled === (filter.value === 'enabled');
    case 'transforms':
      return set.batchConfig.setTransformEnabled === (filter.value === 'enabled');
    default:
      return true;
  }
}
```

#### UI/UX Design

**Filter Bar Layout:**
```
┌────────────────────────────────────────────────────────────────┐
│ 🔍 [Search by name...  ▼]  [+ Add Filter ▼]  [Clear All]      │
├────────────────────────────────────────────────────────────────┤
│ Active: [Hidden: Yes ✕] [Shape: Circle ✕] [Layout: Grid ✕]   │
├────────────────────────────────────────────────────────────────┤
│                    Showing 5 of 20 sets                        │
└────────────────────────────────────────────────────────────────┘
```

**Filter Chip Component:**
```tsx
function FilterChip({ filter, onRemove }: FilterChipProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 
                    border border-blue-500/50 rounded-full text-xs">
      <span className="text-slate-400">{filter.category}:</span>
      <span className="text-slate-200">{filter.value}</span>
      <button onClick={onRemove} className="ml-1 hover:text-red-400">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
```

**Add Filter Dropdown:**
1. Click "+ Add Filter" → opens category selector
2. Select category (e.g., "Distribution Layout")
3. Shows value options for that category
4. Selecting value adds the filter chip immediately

#### Quick Filter Presets
Pre-defined filter combinations for common workflows:

| Preset Name | Filters Applied |
|-------------|-----------------|
| Show Hidden Only | hidden = true |
| Grid Layouts Only | distribution = grid |
| Active Sets | hidden = false, locked = false |
| Complex Sets | blending = enabled OR transforms = enabled |
| High Z-Index | z-index-min = 1000 |

#### Persistence Options
- **Session Only:** Filters reset when dialog closes (default)
- **Remember:** Filters persist across dialog open/close
- **Save with Project:** Filter state saved in project file

#### Implementation Phases

1. **Phase 1: Core Filtering**
   - Name search with partial matching
   - Basic filter categories: hidden, locked, shape-types
   - Filter chip UI with add/remove functionality
   - Live count display

2. **Phase 2: Extended Filters**
   - Distribution layout filter
   - Count mode filter
   - Blending/transforms enabled filters
   - Z-index range filters

3. **Phase 3: Advanced Features**
   - Quick filter presets
   - Filter persistence options
   - Bulk actions on filtered results
   - Export filtered set list

4. **Phase 4: UX Enhancements**
   - Filter suggestions based on current sets
   - Recently used filters
   - Keyboard shortcuts for common filters
   - Filter combinations saved as named presets

#### Benefits
1. **Efficiency:** Quickly isolate sets by specific criteria
2. **Organization:** Manage complex projects with many sets
3. **Workflow:** Create focused views for different tasks
4. **Discoverability:** Find sets with specific properties easily

---

## Notes

This document will be updated as requirements evolve and technical constraints are identified. Implementation details may change based on user feedback and architectural decisions.

Last updated: November 25, 2025
