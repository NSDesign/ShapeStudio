import { useShapeEditor } from '../hooks/useShapeEditor';
import Sidebar from './Sidebar';
import Canvas from './Canvas';

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

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        enabledShapeTypes={enabledShapeTypes}
        scatterSettings={scatterSettings}
        selectedCount={selectedCount}
        selectedPointsCount={selectedPointsCount}
        selectedSegmentsCount={selectedSegmentsCount}
        editMode={editMode}
        canComposeShapes={canComposeShapes}
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
  );
}
