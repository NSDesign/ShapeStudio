import { Shape } from './shapes';

export function renderShape(ctx: CanvasRenderingContext2D, shape: Shape, zoom: number): void {
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
  
  // Draw shape
  drawShape(ctx, shape);
  
  // Draw selection indicator
  if (shape.selected) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([5 / zoom, 5 / zoom]);
    drawSelectionBounds(ctx, shape);
    ctx.setLineDash([]);
  }
  
  ctx.restore();
}

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape): void {
  ctx.beginPath();
  
  switch (shape.type) {
    case 'rectangle':
    case 'rounded-rectangle':
    case 'square':
      drawPolygon(ctx, shape);
      break;
    case 'circle':
      drawPolygon(ctx, shape);
      break;
    case 'ellipse':
      drawPolygon(ctx, shape);
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
      drawPolygon(ctx, shape);
      break;
    case 'line':
      drawLine(ctx, shape);
      break;
    case 'bezier':
    case 'cubic':
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
      drawPolygon(ctx, shape);
      break;
    case 'spline-circle':
    case 'spline-ellipse':
    case 'spline-ring':
      drawSplineCubicBezier(ctx, shape);
      break;
  }
  
  // Fill shape
  if (shape.type !== 'line' && shape.properties.fillColor !== 'none') {
    if (shape.properties.gradient) {
      const bounds = shape.getBounds();
      let gradient: CanvasGradient;
      
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
      } else {
        // Conic gradient
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        gradient = ctx.createConicGradient(0, centerX, centerY);
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
  
  // Stroke shape
  if (shape.properties.strokeColor !== 'none' && shape.properties.strokeWidth > 0) {
    ctx.globalAlpha = shape.properties.strokeOpacity;
    ctx.strokeStyle = shape.properties.strokeColor;
    ctx.lineWidth = shape.properties.strokeWidth;
    ctx.stroke();
  }
}

function drawPolygon(ctx: CanvasRenderingContext2D, shape: Shape): void {
  if (!shape.points || shape.points.length === 0) return;
  
  if (shape.type === 'ring') {
    const halfPoints = shape.points.length / 2;
    
    // Outer ring
    shape.points.slice(0, halfPoints).forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    
    // Inner ring
    ctx.moveTo(shape.points[halfPoints].x, shape.points[halfPoints].y);
    for (let i = halfPoints; i < shape.points.length; i++) {
      ctx.lineTo(shape.points[i].x, shape.points[i].y);
    }
    ctx.closePath();
  } else {
    shape.points.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
  }
}

function drawLine(ctx: CanvasRenderingContext2D, shape: Shape): void {
  shape.points.forEach((point, i) => {
    if (i === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
}

function drawCurve(ctx: CanvasRenderingContext2D, shape: Shape): void {
  if (shape.points.length < 2) return;
  
  ctx.moveTo(shape.points[0].x, shape.points[0].y);
  
  const renderType = shape.renderType || 'polygon';
  
  if (renderType === 'bezier' || renderType === 'cubic' || renderType === 'smooth') {
    if ((shape.type === 'bezier' || shape.type === 'cubic' || shape.type === 'smooth-spline') && shape.tangentHandles && shape.points.length >= 2) {
      // Bezier curves with tangent handles (includes cubic splines and smooth splines)
      for (let i = 0; i < shape.points.length - 1; i++) {
        const p1 = shape.points[i];
        const p2 = shape.points[i + 1];
        
        if (i < shape.tangentHandles.length && (i + 1) < shape.tangentHandles.length) {
          const cp1 = shape.tangentHandles[i].out;
          const cp2 = shape.tangentHandles[i + 1].in;
          ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
        } else {
          ctx.lineTo(p2.x, p2.y);
        }
      }
      
      // Handle closed curves
      if (shape.closed && shape.points.length > 2) {
        const lastIndex = shape.points.length - 1;
        const firstPoint = shape.points[0];
        
        if (lastIndex < shape.tangentHandles.length && 0 < shape.tangentHandles.length) {
          const cp1 = shape.tangentHandles[lastIndex].out;
          const cp2 = shape.tangentHandles[0].in;
          ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, firstPoint.x, firstPoint.y);
        }
      }
    } else {
      // Smooth curves
      for (let i = 1; i < shape.points.length; i++) {
        const prevPoint = shape.points[i - 1];
        const currentPoint = shape.points[i];
        const nextPoint = shape.points[i + 1] || (shape.closed ? shape.points[0] : currentPoint);
        
        const tension = 0.3;
        const controlX = currentPoint.x + (nextPoint.x - prevPoint.x) * tension;
        const controlY = currentPoint.y + (nextPoint.y - prevPoint.y) * tension;
        
        ctx.quadraticCurveTo(controlX, controlY, currentPoint.x, currentPoint.y);
      }
    }
  } else {
    // Straight lines
    for (let i = 1; i < shape.points.length; i++) {
      ctx.lineTo(shape.points[i].x, shape.points[i].y);
    }
  }
  
  if (shape.closed) ctx.closePath();
}

function drawChunk(ctx: CanvasRenderingContext2D, shape: Shape): void {
  if (shape.points.length < 3) return;
  
  ctx.moveTo(shape.points[0].x, shape.points[0].y);
  
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

function drawBlob(ctx: CanvasRenderingContext2D, shape: Shape): void {
  if (shape.points.length < 3) return;
  
  ctx.moveTo(shape.points[0].x, shape.points[0].y);
  
  // Use cubic bezier curves with tangent handles for smooth organic shapes
  if (shape.tangentHandles && shape.tangentHandles.length === shape.points.length) {
    for (let i = 0; i < shape.points.length; i++) {
      const current = shape.points[i];
      const next = shape.points[(i + 1) % shape.points.length];
      const currentHandle = shape.tangentHandles[i];
      const nextHandle = shape.tangentHandles[(i + 1) % shape.tangentHandles.length];
      
      // Create smooth cubic bezier curve between points
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

function drawSmoothSpline(ctx: CanvasRenderingContext2D, shape: Shape): void {
  if (!shape.points || shape.points.length < 2) return;
  if (!shape.controlPoints || shape.controlPoints.length === 0) return;

  ctx.moveTo(shape.points[0].x, shape.points[0].y);

  // Draw cubic Bézier segments using control points
  const numSegments = shape.closed ? shape.points.length : shape.points.length - 1;
  
  for (let i = 0; i < numSegments; i++) {
    const currentPoint = shape.points[i];
    const nextPoint = shape.points[(i + 1) % shape.points.length];
    
    // Each segment uses two control points
    const cp1 = shape.controlPoints[i * 2];
    const cp2 = shape.controlPoints[i * 2 + 1];
    
    if (cp1 && cp2) {
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, nextPoint.x, nextPoint.y);
    } else {
      // Fallback to linear if control points missing
      ctx.lineTo(nextPoint.x, nextPoint.y);
    }
  }

  // Close the path only if this is a closed spline
  if (shape.closed) {
    ctx.closePath();
  }
}

function drawSplineCubicBezier(ctx: CanvasRenderingContext2D, shape: Shape): void {
  if (!shape.controlPoints || !shape.points) return;
  
  if (shape.type === 'spline-circle' || shape.type === 'spline-ellipse') {
    ctx.moveTo(shape.points[0].x, shape.points[0].y);
    
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
    // Outer ring
    ctx.moveTo(shape.points[0].x, shape.points[0].y);
    
    for (let i = 0; i < 4; i++) {
      const startPoint = shape.points[i];
      const endPoint = shape.points[(i + 1) % 4];
      const cp1 = shape.controlPoints[i * 2];
      const cp2 = shape.controlPoints[i * 2 + 1];
      
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, endPoint.x, endPoint.y);
    }
    ctx.closePath();
    
    // Inner ring
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

function drawSelectionBounds(ctx: CanvasRenderingContext2D, shape: Shape): void {
  const bounds = shape.getBounds();
  ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  
  const cornerSize = 6;
  const corners = [
    [bounds.x, bounds.y],
    [bounds.x + bounds.width, bounds.y],
    [bounds.x + bounds.width, bounds.y + bounds.height],
    [bounds.x, bounds.y + bounds.height]
  ];
  
  ctx.fillStyle = '#2563EB';
  corners.forEach(([x, y]) => {
    ctx.fillRect(x - cornerSize/2, y - cornerSize/2, cornerSize, cornerSize);
  });
}