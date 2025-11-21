import { useShapeEditor } from '../hooks/useShapeEditor';
import { Shape, ShapeGroupClass } from '../lib/shapes';
import { CanvasSettings, ScatterSettings, ShapeType } from '../lib/shapeTypes';
import { FolderOpen } from 'lucide-react';
import Sidebar from './Sidebar';
import Canvas from './Canvas';
import ProjectDialog from './ProjectDialog';
import { ShapeCountMode } from '@shared/schema';

export default function ShapeEditor() {
  const {
    shapes,
    groups,
    selectedShapes,
    selectedGroups,
    enabledShapeTypes,
    scatterSettings,
    generationConfigSettings,
    canvasSettings,
    artboards,
    activeArtboard,
    canvasRef,
    editMode,
    selectedPoints,
    selectedSegments,
    isMultiSelectMode,
    showMultiSelectButton,
    showSelectedCount,
    setShowMultiSelectButton,
    setShowSelectedCount,
    marqueeStart,
    marqueeEnd,
    isMarqueeSelecting,
    isTouchDevice,
    isMultiTouch,
    generateRandomShapes,
    generateShapesWithBatchConfig,
    toggleShapeType,
    updateScatterSettings,
    updateGenerationConfigSettings,
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
    fitToArtboard,
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
    applyColorManipulation,
    onLoadProject,
    
    // Generation Sets state and handlers for bi-directional sync
    generationSets,
    currentGenerationSetId,
    batchExportCount,
    generationCountMode,
    handleGenerationSetsChange,
    handleCurrentGenerationSetChange,
    handleBatchExportCountChange,
    handleGenerationCountModeChange,
    handleCreateGenerationSet,
    handleDeleteGenerationSet,
    generateUniqueSetName,
    onOpenGenerationSetsManager,
    isSetsManagerOpen,
    onCloseGenerationSetsManager,
    restoreUIStateFromSet,
    applyCurrentUIStateToSet,
    updateGenerationSetPartial,
    hasUnsavedChanges,
    areSetsEnabled
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
    <div className="flex h-screen w-full overflow-hidden">
      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        <Sidebar
          enabledShapeTypes={enabledShapeTypes}
          scatterSettings={scatterSettings}
          generationConfigSettings={generationConfigSettings}
          selectedCount={selectedCount}
          selectedPointsCount={selectedPointsCount}
          selectedSegmentsCount={selectedSegmentsCount}
          editMode={editMode}
          showMultiSelectButton={showMultiSelectButton}
          showSelectedCount={showSelectedCount}
          onSetShowMultiSelectButton={setShowMultiSelectButton}
          onSetShowSelectedCount={setShowSelectedCount}
          canComposeShapes={canComposeShapes}
          selectedShapes={selectedShapes}
          selectedGroups={selectedGroups}
          shapes={shapes}
          artboards={artboards}
          activeArtboard={activeArtboard}
          onToggleShapeType={toggleShapeType}
          onUpdateScatterSettings={updateScatterSettings}
          onUpdateGenerationConfigSettings={updateGenerationConfigSettings}
          onGenerateRandomShapes={generateRandomShapes}
          onGenerateShapesWithBatchConfig={generateShapesWithBatchConfig}
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
          onAddCustomShape={(shape) => setShapes(prev => [...prev, shape])}
          onClearAll={clearAllShapes}
          onAddArtboard={addArtboard}
          onSelectArtboard={selectArtboard}
          onDeleteArtboard={deleteArtboard}
          onUpdateArtboard={updateArtboard}
          onDistributeSelected={distributeSelected}
          onApplyBooleanOperation={applyBooleanOperation}
          onApplyColorManipulation={applyColorManipulation}
          onLoadProject={onLoadProject}
          
          // Generation Sets props for bi-directional synchronization
          generationSets={generationSets}
          currentGenerationSetId={currentGenerationSetId}
          batchExportCount={batchExportCount}
          generationCountMode={generationCountMode}
          shapeCountMode={scatterSettings.shapeCountMode as ShapeCountMode}
          shapeCountFixed={scatterSettings.fixedShapeCount}
          shapeCountRange={[scatterSettings.minCount, scatterSettings.maxCount] as [number, number]}
          onGenerationSetsChange={handleGenerationSetsChange}
          onCurrentGenerationSetChange={handleCurrentGenerationSetChange}
          onBatchExportCountChange={handleBatchExportCountChange}
          onGenerationCountModeChange={handleGenerationCountModeChange}
          onCreateGenerationSet={handleCreateGenerationSet}
          onDeleteGenerationSet={handleDeleteGenerationSet}
          generateUniqueSetName={generateUniqueSetName}
          onOpenGenerationSetsManager={onOpenGenerationSetsManager}
          isSetsManagerOpen={isSetsManagerOpen}
          onCloseGenerationSetsManager={onCloseGenerationSetsManager}
          onRestoreUIStateFromSet={restoreUIStateFromSet}
          onApplyCurrentUIStateToSet={applyCurrentUIStateToSet}
          updateGenerationSetPartial={updateGenerationSetPartial}
          hasUnsavedChanges={hasUnsavedChanges}
          areSetsEnabled={areSetsEnabled}
        />
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
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
            showMultiSelectButton={showMultiSelectButton}
            showSelectedCount={showSelectedCount}
            marqueeStart={marqueeStart}
            marqueeEnd={marqueeEnd}
            isMarqueeSelecting={isMarqueeSelecting}
            isTouchDevice={isTouchDevice}
            isMultiTouch={isMultiTouch}
            selectedShapes={selectedShapes}
            selectedGroups={selectedGroups}
            generationSets={generationSets}
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
            onZoomChange={(zoomValue) => {
              // zoomValue is already a decimal (e.g., 0.74 for 74%)
              const clamped = Math.max(0.05, Math.min(5, zoomValue));
              const canvasElem = canvasRef.current;
              if (canvasElem) {
                const centerX = canvasElem.clientWidth / 2;
                const centerY = canvasElem.clientHeight / 2;
                const oldZoom = canvasSettings.zoom < 0.05 ? 1 : canvasSettings.zoom;
                const scale = clamped / oldZoom;
                const newPanX = canvasSettings.panX * scale - (centerX * (scale - 1));
                const newPanY = canvasSettings.panY * scale - (centerY * (scale - 1));
                // Use the updateCanvasSettings if it exists in useShapeEditor
                // For now, we'll create a callback inline
              }
              // Direct zoom update - look for updateCanvasSettings from hook
            }}
            onResetView={resetView}
            onFitToArtboard={fitToArtboard}
            onClearAll={clearAllShapes}
            canvasRef={canvasRef}
          />
        </div>
      </div>
    </div>
  );
}