import { Shape } from './shapes';
import { ColorManipulation, HSLShift, ColorRemapping } from './shapeTypes';

export class ColorUtils {
  /**
   * Convert hex color to HSL values
   */
  static hexToHSL(hex: string): { h: number; s: number; l: number } {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse RGB values
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: h * 360,
      s: s * 100,
      l: l * 100
    };
  }

  /**
   * Convert HSL values to hex color
   */
  static hslToHex(h: number, s: number, l: number): string {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Apply HSL shift to a color
   */
  static applyHSLShift(color: string, shift: HSLShift): string {
    if (!shift.enabled || color === 'none') return color;

    const hsl = this.hexToHSL(color);
    
    // Apply shifts with proper clamping
    let newH = hsl.h + shift.hue;
    while (newH < 0) newH += 360;
    while (newH >= 360) newH -= 360;
    
    const newS = Math.max(0, Math.min(100, hsl.s + shift.saturation));
    const newL = Math.max(0, Math.min(100, hsl.l + shift.lightness));

    return this.hslToHex(newH, newS, newL);
  }

  /**
   * Check if two colors are similar within tolerance
   */
  static colorsMatch(color1: string, color2: string, tolerance: number): boolean {
    if (color1 === color2) return true;
    if (color1 === 'none' || color2 === 'none') return false;

    const hsl1 = this.hexToHSL(color1);
    const hsl2 = this.hexToHSL(color2);

    // Calculate color distance in HSL space
    const hueDiff = Math.min(Math.abs(hsl1.h - hsl2.h), 360 - Math.abs(hsl1.h - hsl2.h));
    const satDiff = Math.abs(hsl1.s - hsl2.s);
    const lightDiff = Math.abs(hsl1.l - hsl2.l);

    // Normalize differences to 0-100 range
    const distance = Math.sqrt((hueDiff / 180) ** 2 + (satDiff / 100) ** 2 + (lightDiff / 100) ** 2) * 100;
    
    return distance <= tolerance;
  }

  /**
   * Apply color remapping to a color
   */
  static applyColorRemapping(color: string, remappings: ColorRemapping[]): string {
    if (color === 'none') return color;

    for (const mapping of remappings) {
      if (this.colorsMatch(color, mapping.sourceColor, mapping.tolerance)) {
        return mapping.targetColor;
      }
    }

    return color;
  }

  /**
   * Apply color manipulation to a shape
   */
  static applyColorManipulation(shape: Shape, manipulation: ColorManipulation): void {
    if (manipulation.mode === 'shift' && manipulation.hslShift) {
      if (manipulation.affectFill && shape.properties.fillColor !== 'none') {
        shape.properties.fillColor = this.applyHSLShift(shape.properties.fillColor, manipulation.hslShift);
      }
      if (manipulation.affectStroke && shape.properties.strokeColor !== 'none') {
        shape.properties.strokeColor = this.applyHSLShift(shape.properties.strokeColor, manipulation.hslShift);
      }
    } else if (manipulation.mode === 'remap' && manipulation.remappings) {
      if (manipulation.affectFill && shape.properties.fillColor !== 'none') {
        shape.properties.fillColor = this.applyColorRemapping(shape.properties.fillColor, manipulation.remappings);
      }
      if (manipulation.affectStroke && shape.properties.strokeColor !== 'none') {
        shape.properties.strokeColor = this.applyColorRemapping(shape.properties.strokeColor, manipulation.remappings);
      }
    }
  }

  /**
   * Apply color manipulation to multiple shapes
   */
  static applyToShapes(shapes: Shape[], manipulation: ColorManipulation): void {
    shapes.forEach(shape => this.applyColorManipulation(shape, manipulation));
  }

  /**
   * Get all unique colors from a set of shapes
   */
  static extractUniqueColors(shapes: Shape[]): { fills: string[]; strokes: string[] } {
    const fills = new Set<string>();
    const strokes = new Set<string>();

    shapes.forEach(shape => {
      if (shape.properties.fillColor !== 'none') {
        fills.add(shape.properties.fillColor);
      }
      if (shape.properties.strokeColor !== 'none') {
        strokes.add(shape.properties.strokeColor);
      }
    });

    return {
      fills: Array.from(fills),
      strokes: Array.from(strokes)
    };
  }

  /**
   * Create a color harmony based on HSL shifts
   */
  static createColorHarmony(baseColor: string, harmonyType: 'complementary' | 'triadic' | 'analogous' | 'split-complementary'): string[] {
    const hsl = this.hexToHSL(baseColor);
    const colors = [baseColor];

    switch (harmonyType) {
      case 'complementary':
        colors.push(this.hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l));
        break;
      case 'triadic':
        colors.push(this.hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l));
        colors.push(this.hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l));
        break;
      case 'analogous':
        colors.push(this.hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l));
        colors.push(this.hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l));
        break;
      case 'split-complementary':
        colors.push(this.hslToHex((hsl.h + 150) % 360, hsl.s, hsl.l));
        colors.push(this.hslToHex((hsl.h + 210) % 360, hsl.s, hsl.l));
        break;
    }

    return colors;
  }
}