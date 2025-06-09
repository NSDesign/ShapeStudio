import { useShapeEditor } from '../hooks/useShapeEditor';
import { Shape, ShapeGroupClass } from '../lib/shapes';
import { CanvasSettings, ScatterSettings, ShapeType } from '../lib/shapeTypes';
import { FolderOpen } from 'lucide-react';
import Sidebar from './Sidebar';
import Canvas from './Canvas';
import ProjectDialog from './ProjectDialog';

export default function ShapeEditor() {
  const {
    shapes,
    groups,
    selectedShapes,
    selectedGroups,
    enabledShapeTypes,
    scatterSettings,
    canvasSettings,
    canvasRef,
    editMode,
    selectedPoints,
    selectedSegments,
    isMultiSelectMode,
    marqueeStart,
    marqueeEnd,
    isMarqueeSelecting,
    generateRandomShapes,
    toggleShapeType,
    updateScatterSettings,
    composeShapes,
    setEditingMode,
    toggleMultiSelectMode,
    moveSelected,
    scaleSelected,
    rotateSelected,
    skewSelected,
    flipSelected,
    deleteSelected,
    zoomIn,
    zoomOut,
    resetView,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    selectedCount,
    selectedPointsCount,
    selectedSegmentsCount,
    canComposeShapes
  } = useShapeEditor();

  // Transform handlers with precise control
  const handleMoveBy = (x: number, y: number) => {
    if (selectedCount > 0) {
      moveSelected(x, y);
    }
  };

  const handleScaleBy = (x: number, y: number) => {
    if (selectedCount > 0) {
      scaleSelected(x, y);
    }
  };

  const handleRotateBy = (angle: number) => {
    if (selectedCount > 0) {
      rotateSelected(angle);
    }
  };

  const handleSkewBy = (x: number, y: number) => {
    if (selectedCount > 0) {
      skewSelected(x, y);
    }
  };

  const handleFlipHorizontal = () => {
    if (selectedCount > 0) {
      flipSelected(true); // Flip horizontally
    }
  };

  const handleFlipVertical = () => {
    if (selectedCount > 0) {
      flipSelected(false); // Flip vertically
    }
  };

  const handleDeleteSelected = () => {
    if (selectedCount > 0) {
      deleteSelected();
    }
  };

  // Handle project loading
  const handleLoadProject = (data: any) => {
    // This will be handled by the useShapeEditor hook's state setters
    // The ProjectDialog component will call this function
  };

  return (
    <div className="flex h-screen w-full overflow-hidden flex-col">
      {/* Project Header */}
      <div className="bg-[var(--surface)] border-b border-slate-700 px-4 py-2 flex items-center justify-between">
        <ProjectDialog
          shapes={shapes}
          groups={groups}
          canvasSettings={canvasSettings}
          scatterSettings={scatterSettings}
          enabledShapeTypes={enabledShapeTypes}
          onLoadProject={handleLoadProject}
        />
        <div className="flex-1" />
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          enabledShapeTypes={enabledShapeTypes}
          scatterSettings={scatterSettings}
          selectedCount={selectedCount}
          selectedPointsCount={selectedPointsCount}
          selectedSegmentsCount={selectedSegmentsCount}
          editMode={editMode}
          canComposeShapes={canComposeShapes}
          selectedShapes={selectedShapes}
          selectedGroups={selectedGroups}
          onToggleShapeType={toggleShapeType}
          onUpdateScatterSettings={updateScatterSettings}
          onGenerateRandomShapes={generateRandomShapes}
          onComposeShapes={composeShapes}
          onSetEditMode={setEditingMode}
          onMoveBy={handleMoveBy}
          onScaleBy={handleScaleBy}
          onRotateBy={handleRotateBy}
          onSkewBy={handleSkewBy}
          onFlipHorizontal={handleFlipHorizontal}
          onFlipVertical={handleFlipVertical}
          onShapeUpdate={() => {
            // Force shapes array update to trigger re-render
            setShapes(prev => [...prev]);
            setGroups(prev => [...prev]);
          }}
          onDeleteSelected={handleDeleteSelected}
        />
        <Canvas
          shapes={shapes}
          groups={groups}
          canvasSettings={canvasSettings}
          selectedCount={selectedCount}
          editMode={editMode}
          selectedPoints={selectedPoints}
          selectedSegments={selectedSegments}
          isMultiSelectMode={isMultiSelectMode}
          marqueeStart={marqueeStart}
          marqueeEnd={marqueeEnd}
          isMarqueeSelecting={isMarqueeSelecting}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onToggleMultiSelect={toggleMultiSelectMode}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetView={resetView}
          canvasRef={canvasRef}
        />
      </div>
    </div>
  );
}