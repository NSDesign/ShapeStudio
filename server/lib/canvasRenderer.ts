import { createCanvas, CanvasRenderingContext2D, Canvas as NodeCanvas } from 'canvas';
import { Shape } from './shapeGenerator';
import { Point } from '../../client/src/lib/shapeTypes';

/**
 * Main rendering function for shapes on the server-side using node-canvas
 * This matches the client-side rendering pixel-perfect
 */
export function renderShape(ctx: CanvasRenderingContext2D, shape: Shape, skipSelectionAdornments = false): void {
  if (!shape.points || shape.points.length === 0) {
    return;
  }
  
  ctx.save();
  
  // Apply blend mode
  ctx.globalCompositeOperation = shape.properties.blendMode;
  
  // Apply transform
  ctx.translate(shape.transform.x, shape.transform.y);
  ctx.rotate(shape.transform.rotation * Math.PI / 180);
  ctx.scale(shape.transform.scaleX, shape.transform.scaleY);
  ctx.transform(1, shape.transform.skewX, shape.transform.skewY, 1, 0, 0);
  
  // Check if blur should be applied
  if (shape.properties.blurRadius > 0) {
    renderWithCanvasBlur(ctx, shape);
  } else {
    // Draw shape normally
    drawShape(ctx, shape);
  }
  
  ctx.restore();
}

/**
 * Render shape with blur effect using box blur approximation
 */
function renderWithCanvasBlur(ctx: CanvasRenderingContext2D, shape: Shape): void {
  // Get the bounds of the shape for blur calculation
  const bounds = getBounds(shape);
  const blurRadius = Math.max(1, Math.min(20, shape.properties.blurRadius)); // Clamp blur radius
  
  // Expand bounds to account for blur effect
  const expandedBounds = {
    x: bounds.x - blurRadius * 2,
    y: bounds.y - blurRadius * 2,
    width: bounds.width + blurRadius * 4,
    height: bounds.height + blurRadius * 4
  };
  
  // Create temporary canvas for shape rendering using node-canvas
  const tempCanvas = createCanvas(expandedBounds.width, expandedBounds.height);
  const tempCtx = tempCanvas.getContext('2d');
  
  // Save current transform and translate temp context
  tempCtx.translate(-expandedBounds.x, -expandedBounds.y);
  
  // Draw shape on temporary canvas without transforms (they're already applied)
  tempCtx.save();
  drawShape(tempCtx, shape);
  tempCtx.restore();
  
  // Apply blur effect to the temporary canvas
  const blurredImageData = applyGaussianBlur(tempCtx, tempCanvas.width, tempCanvas.height, blurRadius);
  
  // Draw the blurred result back to the main canvas
  const blurredCanvas = createCanvas(tempCanvas.width, tempCanvas.height);
  const blurredCtx = blurredCanvas.getContext('2d');
  blurredCtx.putImageData(blurredImageData, 0, 0);
  
  // Draw blurred result to main canvas
  ctx.drawImage(blurredCanvas, expandedBounds.x, expandedBounds.y);
}

/**
 * Apply Gaussian blur using box blur approximation (3 passes)
 */
function applyGaussianBlur(ctx: CanvasRenderingContext2D, width: number, height: number, radius: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Simple box blur approximation (3 passes for Gaussian-like effect)
  const boxBlurRadius = Math.ceil(radius / 3);
  
  // Apply horizontal blur
  boxBlurHorizontal(data, width, height, boxBlurRadius);
  // Apply vertical blur  
  boxBlurVertical(data, width, height, boxBlurRadius);
  // Apply horizontal blur again
  boxBlurHorizontal(data, width, height, boxBlurRadius);
  
  return imageData;
}

/**
 * Apply horizontal box blur
 */
function boxBlurHorizontal(data: Uint8ClampedArray, width: number, height: number, radius: number): void {
  const temp = new Uint8ClampedArray(data.length);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      
      for (let i = -radius; i <= radius; i++) {
        const xi = Math.max(0, Math.min(width - 1, x + i));
        const idx = (y * width + xi) * 4;
        
        // Premultiply RGB by alpha to prevent dark halos
        const pixelAlpha = data[idx + 3] / 255;
        r += data[idx] * pixelAlpha;
        g += data[idx + 1] * pixelAlpha;
        b += data[idx + 2] * pixelAlpha;
        a += data[idx + 3];
        count++;
      }
      
      const idx = (y * width + x) * 4;
      const avgAlpha = a / count;
      
      // Unpremultiply: divide by alpha to get original color
      if (avgAlpha > 0) {
        const alphaFactor = avgAlpha / 255;
        temp[idx] = (r / count) / alphaFactor;
        temp[idx + 1] = (g / count) / alphaFactor;
        temp[idx + 2] = (b / count) / alphaFactor;
      } else {
        temp[idx] = 0;
        temp[idx + 1] = 0;
        temp[idx + 2] = 0;
      }
      temp[idx + 3] = avgAlpha;
    }
  }
  
  data.set(temp);
}

/**
 * Apply vertical box blur
 */
function boxBlurVertical(data: Uint8ClampedArray, width: number, height: number, radius: number): void {
  const temp = new Uint8ClampedArray(data.length);
  
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      
      for (let i = -radius; i <= radius; i++) {
        const yi = Math.max(0, Math.min(height - 1, y + i));
        const idx = (yi * width + x) * 4;
        
        // Premultiply RGB by alpha to prevent dark halos
        const pixelAlpha = data[idx + 3] / 255;
        r += data[idx] * pixelAlpha;
        g += data[idx + 1] * pixelAlpha;
        b += data[idx + 2] * pixelAlpha;
        a += data[idx + 3];
        count++;
      }
      
      const idx = (y * width + x) * 4;
      const avgAlpha = a / count;
      
      // Unpremultiply: divide by alpha to get original color
      if (avgAlpha > 0) {
        const alphaFactor = avgAlpha / 255;
        temp[idx] = (r / count) / alphaFactor;
        temp[idx + 1] = (g / count) / alphaFactor;
        temp[idx + 2] = (b / count) / alphaFactor;
      } else {
        temp[idx] = 0;
        temp[idx + 1] = 0;
        temp[idx + 2] = 0;
      }
      temp[idx + 3] = avgAlpha;
    }
  }
  
  data.set(temp);
}

/**
 * Main shape drawing function - routes to specific draw methods
 */
function drawShape(ctx: CanvasRenderingContext2D, shape: Shape): void {
  ctx.beginPath();
  
  switch (shape.type) {
    case 'rectangle':
    case 'square':
      drawPolygon(ctx, shape); // Use points for standard rectangles
      break;
    case 'rounded-rectangle':
    case 'rounded-square':
      if (shape.renderType === 'roundRect' && shape.cornerRadius) {
        drawRoundedRectangle(ctx, shape); // Use native roundRect for rounded shapes
      } else {
        drawPolygon(ctx, shape); // Fallback to polygon for deformed shapes
      }
      break;
    case 'circle':
      drawPolygon(ctx, shape); // Use points for deformable circles
      break;
    case 'ellipse':
      drawPolygon(ctx, shape); // Use points for deformable ellipses
      break;
    case 'triangle':
    case 'right-triangle':
    case 'trapezoid':
    case 'pentagon':
    case 'hexagon':
    case 'rhombus':
    case 'parallelogram':
    case 'kite':
    case 'semicircle':
    case 'heart':
    case 'arrow':
    case 'cross':
      drawPolygon(ctx, shape);
      break;
    case 'polygon':
      drawPolygon(ctx, shape);
      break;
    case 'star':
      drawPolygon(ctx, shape); // Use points for deformable stars
      break;
    case 'line':
      drawLine(ctx, shape);
      break;
    case 'line-vector':
      drawLine(ctx, shape); // Use same drawing method as regular line
      break;
    case 'cubic':
      drawCubicCurve(ctx, shape);
      break;
    case 'bezier':
      drawCurve(ctx, shape);
      break;
    case 'smooth-spline':
      drawSmoothSpline(ctx, shape);
      break;
    case 'chunk':
      drawChunk(ctx, shape);
      break;
    case 'blob':
      drawBlob(ctx, shape);
      break;
    case 'ring':
      drawPolygon(ctx, shape); // Use points for deformable rings
      break;
    case 'spline-circle':
    case 'spline-ellipse':
    case 'spline-ring':
      drawSplineCubicBezier(ctx, shape);
      break;
  }
  
  // Only fill shapes that aren't lines and have fill enabled
  if (shape.type !== 'line' && shape.properties.fillColor !== 'none') {
    // Apply fill with gradient if available
    if (shape.properties.gradient) {
      const bounds = getBounds(shape);
      let gradient: any;
      
      if (shape.properties.gradient.type === 'linear') {
        gradient = ctx.createLinearGradient(
          bounds.x, bounds.y, 
          bounds.x + bounds.width, bounds.y + bounds.height
        );
      } else if (shape.properties.gradient.type === 'radial') {
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const radius = Math.max(bounds.width, bounds.height) / 2;
        gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      } else if (shape.properties.gradient.type === 'conic') {
        // Note: node-canvas may not support conic gradients, fallback to radial
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const radius = Math.max(bounds.width, bounds.height) / 2;
        gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      }
      
      shape.properties.gradient.stops.forEach(stop => {
        gradient.addColorStop(stop.offset, stop.color);
      });
      
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = shape.properties.fillColor;
    }
    ctx.globalAlpha = shape.properties.fillOpacity;
    ctx.fill();
  }
  
  // Only stroke if stroke is enabled
  if (shape.properties.strokeColor !== 'none' && shape.properties.strokeWidth > 0) {
    ctx.globalAlpha = shape.properties.strokeOpacity;
    ctx.strokeStyle = shape.properties.strokeColor;
    ctx.lineWidth = shape.properties.strokeWidth;
    
    // Apply stroke cap if available
    if (shape.strokeCap) {
      ctx.lineCap = shape.strokeCap;
    }
    
    ctx.stroke();
  }
}

/**
 * Draw polygon using points
 */
function drawPolygon(ctx: CanvasRenderingContext2D, shape: Shape): void {
  if (!shape.points || shape.points.length === 0) {
    return;
  }
  
  // Handle ring shapes with inner and outer points
  if (shape.type === 'ring') {
    const halfPoints = shape.points.length / 2;
    
    // Draw outer ring
    shape.points.slice(0, halfPoints).forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    
    // Draw inner ring (cut-out)
    ctx.moveTo(shape.points[halfPoints].x, shape.points[halfPoints].y);
    for (let i = halfPoints; i < shape.points.length; i++) {
      ctx.lineTo(shape.points[i].x, shape.points[i].y);
    }
    ctx.closePath();
  } else {
    // Draw regular polygon using actual points
    shape.points.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
  }
}

/**
 * Draw rounded rectangle using native roundRect
 */
function drawRoundedRectangle(ctx: CanvasRenderingContext2D, shape: Shape): void {
  if (!shape.width || !shape.height || !shape.cornerRadius) return;
  
  const w = shape.width / 2;
  const h = shape.height / 2;
  const radius = Math.min(shape.cornerRadius, Math.min(w, h));
  
  // Use native roundRect() method for perfect rounded rectangles
  ctx.roundRect(-w, -h, shape.width, shape.height, radius);
}

/**
 * Draw cubic curve using tangent handles
 */
function drawCubicCurve(ctx: CanvasRenderingContext2D, shape: Shape): void {
  if (!shape.points || shape.points.length < 2) return;
  
  ctx.moveTo(shape.points[0].x, shape.points[0].y);

  // Use tangent handles for smooth cubic curves, same as Bézier curves
  if (shape.tangentHandles && shape.tangentHandles.length > 0) {
    for (let i = 0; i < shape.points.length - 1; i++) {
      const p1 = shape.points[i];
      const p2 = shape.points[i + 1];
      
      // Get tangent handles for smooth cubic interpolation
      const handle1 = shape.tangentHandles[i]; // Current point's tangent handle
      const handle2 = shape.tangentHandles[i + 1]; // Next point's tangent handle
      
      if (handle1 && handle2 && 'out' in handle1 && 'in' in handle2) {
        // Draw cubic Bézier curve with proper tangent continuity
        ctx.bezierCurveTo(
          handle1.out.x, handle1.out.y,
          handle2.in.x, handle2.in.y,
          p2.x, p2.y
        );
      } else {
        // Fallback to linear if handles missing
        ctx.lineTo(p2.x, p2.y);
      }
    }
  } else {
    // Fallback to simple quadratic curves if no tangent handles
    for (let i = 1; i < shape.points.length; i++) {
      ctx.lineTo(shape.points[i].x, shape.points[i].y);
    }
  }

  // Close the path if this is a closed curve
  if (shape.closed) {
    ctx.closePath();
  }
}

/**
 * Draw line using points
 */
function drawLine(ctx: CanvasRenderingContext2D, shape: Shape): void {
  shape.points.forEach((point, i) => {
    if (i === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
}

/**
 * Draw bezier curve
 */
function drawCurve(ctx: CanvasRenderingContext2D, shape: Shape): void {
  if (shape.points.length < 2) return;
  
  ctx.moveTo(shape.points[0].x, shape.points[0].y);
  
  // Use renderType to determine how to draw curves
  const renderType = shape.renderType || 'polygon';
  
  if (renderType === 'bezier' || renderType === 'cubic' || renderType === 'smooth') {
    if ((shape.type === 'spline-circle' || shape.type === 'spline-ellipse' || shape.type === 'spline-ring') && shape.controlPoints) {
      // Draw four-segment Bézier curves for spline-based shapes
      drawSplineCubicBezier(ctx, shape);
    } else if (shape.type === 'bezier' && shape.controlPoints && shape.controlPoints.length > 0 && shape.points.length >= 2) {
      // Draw bezier curves using bezier curves with control points (only if control points actually exist)
      for (let i = 1; i < shape.points.length; i++) {
        const controlIndex1 = (i - 1) * 2;
        const controlIndex2 = controlIndex1 + 1;
        
        if (controlIndex1 < shape.controlPoints.length && controlIndex2 < shape.controlPoints.length) {
          // Use two control points for proper bezier curve
          ctx.bezierCurveTo(
            shape.controlPoints[controlIndex1].x,
            shape.controlPoints[controlIndex1].y,
            shape.controlPoints[controlIndex2].x,
            shape.controlPoints[controlIndex2].y,
            shape.points[i].x,
            shape.points[i].y
          );
        } else {
          // Fallback to linear if control points are missing
          ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
      }
    } else if (shape.type === 'bezier' && shape.tangentHandles && shape.points.length >= 2) {
      // Draw proper bezier curves using tangent handles
      for (let i = 0; i < shape.points.length - 1; i++) {
        const p1 = shape.points[i];
        const p2 = shape.points[i + 1];
        
        if (i < shape.tangentHandles.length && (i + 1) < shape.tangentHandles.length) {
          const cp1 = shape.tangentHandles[i].out;
          const cp2 = shape.tangentHandles[i + 1].in;
          
          // Draw bezier curve
          ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
        } else {
          ctx.lineTo(p2.x, p2.y);
        }
      }
    } else {
      // Fallback for other curve types
      for (let i = 1; i < shape.points.length; i++) {
        const prevPoint = shape.points[i - 1];
        const currentPoint = shape.points[i];
        const nextPoint = shape.points[i + 1] || (shape.closed ? shape.points[0] : currentPoint);
        
        // Calculate control point for smooth curve
        const tension = 0.3;
        const controlX = currentPoint.x + (nextPoint.x - prevPoint.x) * tension;
        const controlY = currentPoint.y + (nextPoint.y - prevPoint.y) * tension;
        
        ctx.quadraticCurveTo(controlX, controlY, currentPoint.x, currentPoint.y);
      }
    }
  } else {
    // Draw straight lines between points
    for (let i = 1; i < shape.points.length; i++) {
      ctx.lineTo(shape.points[i].x, shape.points[i].y);
    }
  }
  
  if (shape.closed) ctx.closePath();
}

/**
 * Draw chunk shape using control points
 */
function drawChunk(ctx: CanvasRenderingContext2D, shape: Shape): void {
  if (shape.points.length < 3) return;
  
  ctx.moveTo(shape.points[0].x, shape.points[0].y);
  
  // Use control points if available, otherwise generate them
  if (shape.controlPoints && shape.controlPoints.length > 0) {
    for (let i = 1; i < shape.points.length; i++) {
      const controlIndex = (i - 1) % shape.controlPoints.length;
      ctx.quadraticCurveTo(
        shape.controlPoints[controlIndex].x,
        shape.controlPoints[controlIndex].y,
        shape.points[i].x,
        shape.points[i].y
      );
    }
    // Close the curve back to the first point
    if (shape.controlPoints.length > 0) {
      const lastControlIndex = shape.controlPoints.length - 1;
      ctx.quadraticCurveTo(
        shape.controlPoints[lastControlIndex].x,
        shape.controlPoints[lastControlIndex].y,
        shape.points[0].x,
        shape.points[0].y
      );
    }
  } else {
    // Fallback to generated smooth curves
    for (let i = 1; i < shape.points.length; i++) {
      const current = shape.points[i];
      const next = shape.points[(i + 1) % shape.points.length];
      const cp1x = current.x;
      const cp1y = current.y;
      const cp2x = (current.x + next.x) / 2;
      const cp2y = (current.y + next.y) / 2;
      
      ctx.quadraticCurveTo(cp1x, cp1y, cp2x, cp2y);
    }
  }
  
  ctx.closePath();
}

/**
 * Draw blob shape using tangent handles
 */
function drawBlob(ctx: CanvasRenderingContext2D, shape: Shape): void {
  if (shape.points.length < 3) return;
  
  ctx.moveTo(shape.points[0].x, shape.points[0].y);
  
  // Use bezier curves with tangent handles for smooth organic shapes
  if (shape.tangentHandles && shape.tangentHandles.length === shape.points.length) {
    for (let i = 0; i < shape.points.length; i++) {
      const current = shape.points[i];
      const next = shape.points[(i + 1) % shape.points.length];
      const currentHandle = shape.tangentHandles[i];
      const nextHandle = shape.tangentHandles[(i + 1) % shape.tangentHandles.length];
      
      // Create smooth bezier curve between points
      ctx.bezierCurveTo(
        currentHandle.out.x,
        currentHandle.out.y,
        nextHandle.in.x,
        nextHandle.in.y,
        next.x,
        next.y
      );
    }
  } else {
    // Fallback to generated smooth curves
    for (let i = 1; i < shape.points.length; i++) {
      const current = shape.points[i];
      const next = shape.points[(i + 1) % shape.points.length];
      const cp1x = current.x;
      const cp1y = current.y;
      const cp2x = (current.x + next.x) / 2;
      const cp2y = (current.y + next.y) / 2;
      
      ctx.quadraticCurveTo(cp1x, cp1y, cp2x, cp2y);
    }
  }
  
  ctx.closePath();
}

/**
 * Draw spline-based cubic bezier curves (for spline-circle, spline-ellipse, spline-ring)
 */
function drawSplineCubicBezier(ctx: CanvasRenderingContext2D, shape: Shape): void {
  if (!shape.controlPoints || !shape.points) return;
  
  if (shape.type === 'spline-circle' || shape.type === 'spline-ellipse') {
    // Four-segment Bézier curve (circle/ellipse)
    ctx.moveTo(shape.points[0].x, shape.points[0].y);
    
    // Draw four Bézier segments
    for (let i = 0; i < 4; i++) {
      const startPoint = shape.points[i];
      const endPoint = shape.points[(i + 1) % 4];
      const cp1 = shape.controlPoints[i * 2];
      const cp2 = shape.controlPoints[i * 2 + 1];
      
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, endPoint.x, endPoint.y);
    }
    
    if (shape.closed) {
      ctx.closePath();
    }
  } else if (shape.type === 'spline-ring') {
    // Outer ring - four Bézier segments
    ctx.moveTo(shape.points[0].x, shape.points[0].y);
    
    for (let i = 0; i < 4; i++) {
      const startPoint = shape.points[i];
      const endPoint = shape.points[(i + 1) % 4];
      const cp1 = shape.controlPoints[i * 2];
      const cp2 = shape.controlPoints[i * 2 + 1];
      
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, endPoint.x, endPoint.y);
    }
    ctx.closePath();
    
    // Inner ring - four Bézier segments (reverse order)
    ctx.moveTo(shape.points[4].x, shape.points[4].y);
    
    for (let i = 0; i < 4; i++) {
      const startPoint = shape.points[4 + i];
      const endPoint = shape.points[4 + ((i + 1) % 4)];
      const cp1 = shape.controlPoints[8 + i * 2];
      const cp2 = shape.controlPoints[8 + i * 2 + 1];
      
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, endPoint.x, endPoint.y);
    }
    ctx.closePath();
  }
}

/**
 * Draw smooth spline using tangent handles
 */
function drawSmoothSpline(ctx: CanvasRenderingContext2D, shape: Shape): void {
  if (shape.points.length < 2) return;
  
  ctx.moveTo(shape.points[0].x, shape.points[0].y);
  
  // Use tangent handles for proper smooth spline curves
  if (shape.tangentHandles && shape.tangentHandles.length >= shape.points.length) {
    // Draw smooth spline using bezier curves with tangent handles
    for (let i = 0; i < shape.points.length - 1; i++) {
      const p1 = shape.points[i];
      const p2 = shape.points[i + 1];
      const cp1 = shape.tangentHandles[i].out;
      const cp2 = shape.tangentHandles[i + 1].in;
      
      // Draw bezier curve for smooth continuity
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
    }
    
    // Handle closed curves
    if (shape.closed && shape.points.length > 2) {
      const lastIndex = shape.points.length - 1;
      const firstPoint = shape.points[0];
      const cp1 = shape.tangentHandles[lastIndex].out;
      const cp2 = shape.tangentHandles[0].in;
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, firstPoint.x, firstPoint.y);
    }
  } else {
    // Fallback: use catmull-rom spline approximation
    for (let i = 1; i < shape.points.length; i++) {
      const p0 = shape.points[i - 2] || shape.points[i - 1];
      const p1 = shape.points[i - 1];
      const p2 = shape.points[i];
      const p3 = shape.points[i + 1] || shape.points[i];
      
      // Catmull-Rom to Bezier conversion
      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }
  
  if (shape.closed) ctx.closePath();
}

/**
 * Get bounding box from shape points
 */
function getBounds(shape: Shape): { x: number; y: number; width: number; height: number } {
  if (shape.points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  // Calculate bounds ONLY from actual shape points, not control handles
  const xs = shape.points.map(p => p.x);
  const ys = shape.points.map(p => p.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}
