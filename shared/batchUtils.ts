import type { BatchConfigSettings } from './schema';

export type LinearGradientPredefined = 'horizontal' | 'vertical' | 'diagonal-down' | 'diagonal-up';

export function calculateLinearAngle(settings: BatchConfigSettings, shapeIndex: number): number {
  let angleDegrees: number;
  
  if (!settings.fillGradientTypeDirectionEnabled) {
    return 45;
  }
  
  switch (settings.fillGradientLinearDirection) {
    case 'fixed':
      angleDegrees = settings.fillGradientLinearAngle ?? 45;
      break;
    
    case 'predefined':
      switch (settings.fillGradientLinearPredefined as LinearGradientPredefined) {
        case 'horizontal':
          angleDegrees = 0;
          break;
        case 'vertical':
          angleDegrees = 90;
          break;
        case 'diagonal-down':
          angleDegrees = 135;
          break;
        case 'diagonal-up':
          angleDegrees = 45;
          break;
        default:
          angleDegrees = 0;
      }
      break;
    
    case 'range':
    default:
      const [minAngle, maxAngle] = settings.fillGradientLinearAngleRange || [0, 360];
      angleDegrees = minAngle + Math.random() * (maxAngle - minAngle);
      break;
  }
  
  angleDegrees = ((angleDegrees % 360) + 360) % 360;
  
  return angleDegrees;
}

export function calculateConicCenterX(settings: BatchConfigSettings, shapeIndex: number, setRepIndex: number = 0): number {
  let result: number;
  
  // Get the effective index based on Index Driver setting
  const driver = settings.gradientCenterIncrementalIndexDriver || 'shapeIndex';
  const effectiveIndex = driver === 'setRepIndex' ? setRepIndex : shapeIndex;
  
  switch (settings.fillGradientConicCenterXMode) {
    case 'range':
      const [minX, maxX] = settings.fillGradientConicCenterXRange || [25, 75];
      result = minX + Math.random() * (maxX - minX);
      break;
    
    case 'incremental':
      const startX = settings.fillGradientConicCenterXStartValue ?? 50;
      const incrementX = (settings.fillGradientConicCenterXIncrement || 0) * effectiveIndex;
      result = startX + incrementX;
      
      if (settings.fillGradientConicCenterXModulationEnabled && settings.fillGradientConicCenterXModulationValue > 0) {
        const m = settings.fillGradientConicCenterXModulationValue;
        result = ((result % m) + m) % m;
      }
      break;
    
    case 'fixed':
    default:
      result = settings.fillGradientConicCenterX ?? 50;
      break;
  }
  
  return Math.max(0, Math.min(100, result));
}

export function calculateConicCenterY(settings: BatchConfigSettings, shapeIndex: number, setRepIndex: number = 0): number {
  let result: number;
  
  // Get the effective index based on Index Driver setting
  const driver = settings.gradientCenterIncrementalIndexDriver || 'shapeIndex';
  const effectiveIndex = driver === 'setRepIndex' ? setRepIndex : shapeIndex;
  
  switch (settings.fillGradientConicCenterYMode) {
    case 'range':
      const [minY, maxY] = settings.fillGradientConicCenterYRange || [25, 75];
      result = minY + Math.random() * (maxY - minY);
      break;
    
    case 'incremental':
      const startY = settings.fillGradientConicCenterYStartValue ?? 50;
      const incrementY = (settings.fillGradientConicCenterYIncrement || 0) * effectiveIndex;
      result = startY + incrementY;
      
      if (settings.fillGradientConicCenterYModulationEnabled && settings.fillGradientConicCenterYModulationValue > 0) {
        const m = settings.fillGradientConicCenterYModulationValue;
        result = ((result % m) + m) % m;
      }
      break;
    
    case 'fixed':
    default:
      result = settings.fillGradientConicCenterY ?? 50;
      break;
  }
  
  return Math.max(0, Math.min(100, result));
}

export function calculateRadialCenterX(settings: BatchConfigSettings, shapeIndex: number, setRepIndex: number = 0): number {
  let result: number;
  
  // Get the effective index based on Index Driver setting
  const driver = settings.gradientCenterIncrementalIndexDriver || 'shapeIndex';
  const effectiveIndex = driver === 'setRepIndex' ? setRepIndex : shapeIndex;
  
  switch (settings.fillGradientRadialCenterXMode) {
    case 'range':
      const [minX, maxX] = settings.fillGradientRadialCenterXRange || [25, 75];
      result = minX + Math.random() * (maxX - minX);
      break;
    
    case 'incremental':
      const startX = settings.fillGradientRadialCenterXStartValue ?? 50;
      const incrementX = (settings.fillGradientRadialCenterXIncrement || 0) * effectiveIndex;
      result = startX + incrementX;
      
      if (settings.fillGradientRadialCenterXModulationEnabled && settings.fillGradientRadialCenterXModulationValue > 0) {
        const m = settings.fillGradientRadialCenterXModulationValue;
        result = ((result % m) + m) % m;
      }
      break;
    
    case 'fixed':
    default:
      result = settings.fillGradientRadialCenterX ?? 50;
      break;
  }
  
  return Math.max(0, Math.min(100, result));
}

export function calculateRadialCenterY(settings: BatchConfigSettings, shapeIndex: number, setRepIndex: number = 0): number {
  let result: number;
  
  // Get the effective index based on Index Driver setting
  const driver = settings.gradientCenterIncrementalIndexDriver || 'shapeIndex';
  const effectiveIndex = driver === 'setRepIndex' ? setRepIndex : shapeIndex;
  
  switch (settings.fillGradientRadialCenterYMode) {
    case 'range':
      const [minY, maxY] = settings.fillGradientRadialCenterYRange || [25, 75];
      result = minY + Math.random() * (maxY - minY);
      break;
    
    case 'incremental':
      const startY = settings.fillGradientRadialCenterYStartValue ?? 50;
      const incrementY = (settings.fillGradientRadialCenterYIncrement || 0) * effectiveIndex;
      result = startY + incrementY;
      
      if (settings.fillGradientRadialCenterYModulationEnabled && settings.fillGradientRadialCenterYModulationValue > 0) {
        const m = settings.fillGradientRadialCenterYModulationValue;
        result = ((result % m) + m) % m;
      }
      break;
    
    case 'fixed':
    default:
      result = settings.fillGradientRadialCenterY ?? 50;
      break;
  }
  
  return Math.max(0, Math.min(100, result));
}
