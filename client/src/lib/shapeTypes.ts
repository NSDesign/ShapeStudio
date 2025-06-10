export interface Point {
  x: number;
  y: number;
}

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  skewX: number;
  skewY: number;
}

export type BlendMode = 
  | 'source-over' 
  | 'multiply' 
  | 'screen' 
  | 'overlay' 
  | 'darken' 
  | 'lighten' 
  | 'color-dodge' 
  | 'color-burn' 
  | 'hard-light' 
  | 'soft-light' 
  | 'difference' 
  | 'exclusion' 
  | 'hue' 
  | 'saturation' 
  | 'color' 
  | 'luminosity';

export interface ShapeProperties {
  fillColor: string | 'none';
  fillOpacity: number;
  strokeColor: string | 'none';
  strokeWidth: number;
  strokeOpacity: number;
  blendMode: BlendMode;
  zIndex: number;
  gradient?: {
    type: 'linear' | 'radial';
    stops: { offset: number; color: string }[];
  };
}

export type ShapeType = 
  | 'rectangle' 
  | 'square' 
  | 'circle' 
  | 'ellipse' 
  | 'line' 
  | 'polygon' 
  | 'star' 
  | 'blob' 
  | 'ring'
  | 'bezier'
  | 'cubic'
  | 'quadratic'
  | 'nurbs';

export interface BaseShape {
  id: string;
  type: ShapeType;
  transform: Transform;
  properties: ShapeProperties;
  selected: boolean;
  points?: Point[];
  sides?: number;
  radius?: number;
  innerRadius?: number;
  width?: number;
  height?: number;
  controlPoints?: Point[];
  closed?: boolean;
}

export interface ShapeGroup {
  id: string;
  shapes: BaseShape[];
  transform: Transform;
  selected: boolean;
}

export interface ScatterSettings {
  onPoints: boolean;
  insideArea: boolean;
  count: number;
  randomness: number;
}

export interface CanvasSettings {
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
}

export interface Artboard {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  preset?: string;
}
