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

## Notes

This document will be updated as requirements evolve and technical constraints are identified. Implementation details may change based on user feedback and architectural decisions.

Last updated: November 5, 2025
