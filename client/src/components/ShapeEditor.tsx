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

  // Transform handlers that apply transformations
  const handleMove = () => {
    if (selectedCount > 0) {
      moveSelected(10, 0); // Move 10px to the right
    }
  };

  const handleScale = () => {
    if (selectedCount > 0) {
      scaleSelected(1.1); // Scale up by 10%
    }
  };

  const handleRotate = () => {
    if (selectedCount > 0) {
      rotateSelected(15); // Rotate 15 degrees
    }
  };

  const handleSkew = () => {
    if (selectedCount > 0) {
      skewSelected(0.1, 0); // Skew on X axis
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
    <div className="flex h-screen">
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
        onMove={handleMove}
        onScale={handleScale}
        onRotate={handleRotate}
        onSkew={handleSkew}
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
