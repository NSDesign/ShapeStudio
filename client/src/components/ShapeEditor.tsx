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
    artboards,
    activeArtboard,
    canvasRef,
    editMode,
    selectedPoints,
    selectedSegments,
    isMultiSelectMode,
    marqueeStart,
    marqueeEnd,
    isMarqueeSelecting,
    isTouchDevice,
    isMultiTouch,
    generateRandomShapes,
    toggleShapeType,
    updateScatterSettings,
    distributeSelected,
    composeShapes,
    setEditMode,
    toggleMultiSelectMode,
    moveBy,
    scaleBy,
    rotateBy,
    skewBy,
    flipHorizontal,
    flipVertical,
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
    handleWheel,
    setShapes,
    clearAllShapes,
    selectedCount,
    selectedPointsCount,
    selectedSegmentsCount,
    canComposeShapes,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    changeBlendMode,
    addArtboard,
    selectArtboard,
    deleteArtboard,
    updateArtboard,
    applyBooleanOperation,
    applyColorManipulation
  } = useShapeEditor();

  // Transform handlers with precise control
  const handleMoveBy = (x: number, y: number) => {
    if (selectedCount > 0) {
      moveBy(x, y);
    }
  };

  const handleScaleBy = (x: number, y: number) => {
    if (selectedCount > 0) {
      scaleBy(x, y);
    }
  };

  const handleRotateBy = (angle: number) => {
    if (selectedCount > 0) {
      rotateBy(angle);
    }
  };

  const handleSkewBy = (x: number, y: number) => {
    if (selectedCount > 0) {
      skewBy(x, y);
    }
  };

  const handleFlipHorizontal = () => {
    if (selectedCount > 0) {
      flipHorizontal();
    }
  };

  const handleFlipVertical = () => {
    if (selectedCount > 0) {
      flipVertical();
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
      <div className="flex flex-1 min-h-0">
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
          shapes={shapes}
          artboards={artboards}
          activeArtboard={activeArtboard}
          onToggleShapeType={toggleShapeType}
          onUpdateScatterSettings={updateScatterSettings}
          onGenerateRandomShapes={generateRandomShapes}
          onComposeShapes={composeShapes}
          onSetEditMode={setEditMode}
          onMoveBy={handleMoveBy}
          onScaleBy={handleScaleBy}
          onRotateBy={handleRotateBy}
          onSkewBy={handleSkewBy}
          onFlipHorizontal={handleFlipHorizontal}
          onFlipVertical={handleFlipVertical}
          onDeleteSelected={handleDeleteSelected}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
          onBringForward={bringForward}
          onSendBackward={sendBackward}
          onChangeBlendMode={changeBlendMode}
          onShapeUpdate={() => setShapes(prev => [...prev])}
          onClearAll={clearAllShapes}
          onAddArtboard={addArtboard}
          onSelectArtboard={selectArtboard}
          onDeleteArtboard={deleteArtboard}
          onUpdateArtboard={updateArtboard}
          onDistributeSelected={distributeSelected}
          onApplyBooleanOperation={applyBooleanOperation}
          onApplyColorManipulation={applyColorManipulation}
        />
        <div className="flex-1 flex flex-col min-h-0 relative">
          <Canvas
            shapes={shapes}
            groups={groups}
            canvasSettings={canvasSettings}
            artboards={artboards}
            activeArtboard={activeArtboard}
            selectedCount={selectedCount}
            editMode={editMode}
            selectedPoints={selectedPoints}
            selectedSegments={selectedSegments}
            isMultiSelectMode={isMultiSelectMode}
            marqueeStart={marqueeStart}
            marqueeEnd={marqueeEnd}
            isMarqueeSelecting={isMarqueeSelecting}
            isTouchDevice={isTouchDevice}
            isMultiTouch={isMultiTouch}
            selectedShapes={selectedShapes}
            selectedGroups={selectedGroups}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            onToggleMultiSelect={toggleMultiSelectMode}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onResetView={resetView}
            canvasRef={canvasRef}
          />
        </div>
      </div>
    </div>
  );
}