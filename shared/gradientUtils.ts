export interface GradientStop {
  offset: number;
  color: string;
}

export interface GradientConfig {
  type: 'linear' | 'radial' | 'conic';
  stops: GradientStop[];
  angle?: number;
  conicAngle?: number;
  conicCenterX?: number;
  conicCenterY?: number;
  radialCenterX?: number;
  radialCenterY?: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LinearGradientCoords {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RadialGradientCoords {
  centerX: number;
  centerY: number;
  innerRadius: number;
  outerRadius: number;
}

export interface ConicGradientCoords {
  centerX: number;
  centerY: number;
  startAngle: number;
}

export function calculateLinearGradientCoords(bounds: Bounds, angleDegrees: number): LinearGradientCoords {
  const angle = (angleDegrees || 0) * Math.PI / 180;
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const length = Math.max(bounds.width, bounds.height) / 2;
  
  return {
    x1: cx - Math.cos(angle) * length,
    y1: cy - Math.sin(angle) * length,
    x2: cx + Math.cos(angle) * length,
    y2: cy + Math.sin(angle) * length
  };
}

export function calculateRadialGradientCoords(
  bounds: Bounds, 
  centerXPercent: number = 50, 
  centerYPercent: number = 50
): RadialGradientCoords {
  const centerX = bounds.x + (bounds.width * centerXPercent / 100);
  const centerY = bounds.y + (bounds.height * centerYPercent / 100);
  const radius = Math.max(bounds.width, bounds.height) / 2;
  
  return {
    centerX,
    centerY,
    innerRadius: 0,
    outerRadius: radius
  };
}

export function calculateConicGradientCoords(
  bounds: Bounds, 
  centerXPercent: number = 50, 
  centerYPercent: number = 50,
  startAngle: number = 0
): ConicGradientCoords {
  const centerX = bounds.x + (bounds.width * centerXPercent / 100);
  const centerY = bounds.y + (bounds.height * centerYPercent / 100);
  
  return {
    centerX,
    centerY,
    startAngle
  };
}

export function getGradientCoords(gradient: GradientConfig, bounds: Bounds) {
  if (gradient.type === 'linear') {
    return {
      type: 'linear' as const,
      coords: calculateLinearGradientCoords(bounds, gradient.angle || 0)
    };
  } else if (gradient.type === 'conic') {
    return {
      type: 'conic' as const,
      coords: calculateConicGradientCoords(
        bounds,
        gradient.conicCenterX ?? 50,
        gradient.conicCenterY ?? 50,
        gradient.conicAngle ?? 0
      )
    };
  } else {
    return {
      type: 'radial' as const,
      coords: calculateRadialGradientCoords(
        bounds,
        gradient.radialCenterX ?? 50,
        gradient.radialCenterY ?? 50
      )
    };
  }
}
