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

## Priority & Timeline

These features are marked for future development. Priority should be determined based on:
- User demand and feedback
- Impact on workflow efficiency
- Technical complexity and resource availability
- Dependencies on other system improvements

**Estimated Complexity:**
- Batch Export Queue: **High** (requires queue management, progress tracking, packaging)
- Multi-format Batch Processing: **Medium** (extends existing export, format-specific settings)

---

## Notes

This document will be updated as requirements evolve and technical constraints are identified. Implementation details may change based on user feedback and architectural decisions.

Last updated: October 31, 2025
