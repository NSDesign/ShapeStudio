/**
 * Comprehensive Noise System for Shape Property Variation
 * Implements multiple noise algorithms with property targeting
 */

import { BatchConfigSettings } from '../components/BatchConfigDialog';

export interface NoiseOptions {
  algorithm: 'randomise' | 'perlin' | 'simplex' | 'fractal' | 'worley' | 'ridge' | 'turbulence';
  scale: number;
  octaves: number;
  amplitude: number;
  seed: number;
  scaleToCanvas?: boolean;
  artboardWidth?: number;
  artboardHeight?: number;
  
  // Algorithm-specific options
  lacunarity?: number;
  gain?: number;
  distanceFunction?: 'euclidean' | 'manhattan' | 'chebyshev';
  featurePoints?: number;
  ridgeOffset?: number;
  turbulencePower?: number;
}

export interface NoiseResult {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  hue: number;
  saturation: number;
  lightness: number;
}

export class NoiseSystem {
  private static permutation: number[] = [];
  private static gradients3D: number[][] = [];
  
  static {
    // Initialize permutation table for Perlin noise
    for (let i = 0; i < 256; i++) {
      NoiseSystem.permutation[i] = i;
    }
    
    // Initialize 3D gradients
    NoiseSystem.gradients3D = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];
  }

  /**
   * Generate noise-based property variations for shape
   */
  static generateNoiseVariation(
    shapeIndex: number, 
    settings: BatchConfigSettings,
    baseX: number = 0,
    baseY: number = 0,
    artboardWidth: number = 400,
    artboardHeight: number = 400
  ): NoiseResult {
    const { noiseEnabled, noiseAlgorithm, noiseScale, noiseOctaves, noiseAmplitude, noiseSeed } = settings;
    
    if (!noiseEnabled) {
      return {
        x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, 
        opacity: 1, hue: 0, saturation: 0, lightness: 0
      };
    }

    const options: NoiseOptions = {
      algorithm: noiseAlgorithm,
      scale: noiseScale,
      octaves: noiseOctaves,
      amplitude: noiseAmplitude,
      seed: noiseSeed,
      scaleToCanvas: settings.noiseScaleToCanvas,
      artboardWidth: artboardWidth,
      artboardHeight: artboardHeight,
      lacunarity: settings.noiseLacunarity,
      gain: settings.noiseGain,
      distanceFunction: settings.noiseDistanceFunction,
      featurePoints: settings.noiseFeaturePoints,
      ridgeOffset: settings.noiseRidgeOffset,
      turbulencePower: settings.noiseTurbulencePower
    };

    // Generate noise coordinates with independent spacing to prevent diagonal patterns
    const noiseX = (shapeIndex * 0.137 + baseX * 0.001) * options.scale; // Use prime-like spacing
    const noiseY = (shapeIndex * 0.211 + baseY * 0.001) * options.scale; // Different prime-like spacing 
    const noiseZ = shapeIndex * 0.083; // Independent Z dimension spacing

    switch (options.algorithm) {
      case 'randomise':
        return this.generateRandomNoise(shapeIndex, options);
      case 'perlin':
        return this.generatePerlinNoise(noiseX, noiseY, noiseZ, options);
      case 'simplex':
        return this.generateSimplexNoise(noiseX, noiseY, noiseZ, options);
      case 'fractal':
        return this.generateFractalNoise(noiseX, noiseY, noiseZ, options);
      case 'worley':
        return this.generateWorleyNoise(noiseX, noiseY, options);
      case 'ridge':
        return this.generateRidgeNoise(noiseX, noiseY, noiseZ, options);
      case 'turbulence':
        return this.generateTurbulenceNoise(noiseX, noiseY, noiseZ, options);
      default:
        return this.generateRandomNoise(shapeIndex, options);
    }
  }

  /**
   * Standard randomization (baseline)
   */
  private static generateRandomNoise(shapeIndex: number, options: NoiseOptions): NoiseResult {
    // Match the EXACT original randomization behavior - return only small variations, not absolute values
    const artboardWidth = options.artboardWidth || 400;
    const artboardHeight = options.artboardHeight || 400;
    
    return {
      // Position: Small random offsets (original has no position randomization)
      x: (this.seededRandom(options.seed + shapeIndex * 1000 + 1)() - 0.5) * options.amplitude * (options.scaleToCanvas ? Math.min(artboardWidth * 0.1, artboardHeight * 0.1) : 20),
      y: (this.seededRandom(options.seed + shapeIndex * 1000 + 2)() - 0.5) * options.amplitude * (options.scaleToCanvas ? Math.min(artboardWidth * 0.1, artboardHeight * 0.1) : 20),
      
      // Rotation: Return value to map to 0-360° range (original range)
      rotation: this.seededRandom(options.seed + shapeIndex * 1000 + 3)() * options.amplitude * 360, // 0-360° range
      
      // Scale: Return values to map to 0.5-2.5 range (original range)
      scaleX: this.seededRandom(options.seed + shapeIndex * 1000 + 4)() * options.amplitude, // 0-1 range for mapping
      scaleY: this.seededRandom(options.seed + shapeIndex * 1000 + 5)() * options.amplitude,
      
      // Opacity: Return value for mapping to original ranges (fill 0.8-1.0, stroke 0.9-1.0)
      opacity: this.seededRandom(options.seed + shapeIndex * 1000 + 6)() * options.amplitude, // 0-1 range for mapping
      
      // Colors: Return values for mapping to original absolute ranges
      hue: this.seededRandom(options.seed + shapeIndex * 1000 + 7)() * options.amplitude * 360, // 0-360° range
      saturation: this.seededRandom(options.seed + shapeIndex * 1000 + 8)() * options.amplitude, // 0-1 range for mapping
      lightness: this.seededRandom(options.seed + shapeIndex * 1000 + 9)() * options.amplitude // 0-1 range for mapping
    };
  }

  /**
   * Perlin noise implementation
   */
  private static generatePerlinNoise(x: number, y: number, z: number, options: NoiseOptions): NoiseResult {
    let amplitude = options.amplitude;
    let frequency = 1 / options.scale;
    let result = {
      x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
      opacity: 1, hue: 0, saturation: 0, lightness: 0
    };

    const artboardWidth = options.artboardWidth || 400;
    const artboardHeight = options.artboardHeight || 400;
    
    // Position constraints based on artboard size when scaling to artboard
    const positionScale = options.scaleToCanvas ? 
      Math.min(artboardWidth * 0.3, artboardHeight * 0.3) : // Keep within 30% of artboard dimensions
      80; // Standard wide distribution when not constrained

    for (let i = 0; i < options.octaves; i++) {
      // Generate independent noise values for each property using different coordinates
      const noiseX = this.perlin3D(x * frequency + 100, y * frequency, z * frequency, options.seed + 1);
      const noiseY = this.perlin3D(x * frequency, y * frequency + 100, z * frequency, options.seed + 2);
      const noiseRot = this.perlin3D(x * frequency + 200, y * frequency + 200, z * frequency, options.seed + 3);
      const noiseScaleX = this.perlin3D(x * frequency + 300, y * frequency, z * frequency, options.seed + 4);
      const noiseScaleY = this.perlin3D(x * frequency, y * frequency + 300, z * frequency, options.seed + 5);
      const noiseOpacity = this.perlin3D(x * frequency + 400, y * frequency + 400, z * frequency, options.seed + 6);
      const noiseHue = this.perlin3D(x * frequency + 500, y * frequency, z * frequency, options.seed + 7);
      const noiseSat = this.perlin3D(x * frequency, y * frequency + 500, z * frequency, options.seed + 8);
      const noiseLght = this.perlin3D(x * frequency + 600, y * frequency + 600, z * frequency, options.seed + 9);
      
      // Apply noise values with proper scaling (noise is -1 to 1, amplitude is typically 1)
      result.x += noiseX * amplitude * (options.scaleToCanvas ? Math.min(artboardWidth * 0.2, artboardHeight * 0.2) : 20);
      result.y += noiseY * amplitude * (options.scaleToCanvas ? Math.min(artboardWidth * 0.2, artboardHeight * 0.2) : 20);
      result.rotation += noiseRot * amplitude * 45; // ±45 degrees max per octave
      result.scaleX += noiseScaleX * amplitude * 0.15; // ±15% scale variation per octave
      result.scaleY += noiseScaleY * amplitude * 0.15;
      result.opacity += noiseOpacity * amplitude * 0.1; // ±10% opacity variation per octave
      result.hue += noiseHue * amplitude * 20; // ±20 degrees hue variation per octave
      result.saturation += noiseSat * amplitude * 10; // ±10% saturation variation per octave
      result.lightness += noiseLght * amplitude * 8; // ±8% lightness variation per octave

      amplitude *= (options.gain || 0.5);
      frequency *= (options.lacunarity || 2.0);
    }

    // Clamp values to reasonable ranges
    result.opacity = Math.max(0.1, Math.min(1, result.opacity));
    result.scaleX = Math.max(0.1, Math.min(3, result.scaleX));
    result.scaleY = Math.max(0.1, Math.min(3, result.scaleY));

    return result;
  }

  /**
   * Simplex noise implementation (simplified)
   */
  private static generateSimplexNoise(x: number, y: number, z: number, options: NoiseOptions): NoiseResult {
    // Generate independent noise values for each property using different coordinates
    const frequency = 1 / options.scale;
    
    const artboardWidth = options.artboardWidth || 400;
    const artboardHeight = options.artboardHeight || 400;
    
    // Position constraints based on artboard size when scaling to artboard
    const positionScale = options.scaleToCanvas ? 
      Math.min(artboardWidth * 0.3, artboardHeight * 0.3) : // Keep within 30% of artboard dimensions
      80; // Standard wide distribution when not constrained
    
    const noiseX = this.gradientNoise(x * frequency + 100, y * frequency, options.seed + 1);
    const noiseY = this.gradientNoise(x * frequency, y * frequency + 100, options.seed + 2);
    const noiseRot = this.gradientNoise(x * frequency + 200, y * frequency + 200, options.seed + 3);
    const noiseScaleX = this.gradientNoise(x * frequency + 300, y * frequency, options.seed + 4);
    const noiseScaleY = this.gradientNoise(x * frequency, y * frequency + 300, options.seed + 5);
    const noiseOpacity = this.gradientNoise(x * frequency + 400, y * frequency + 400, options.seed + 6);
    const noiseHue = this.gradientNoise(x * frequency + 500, y * frequency, options.seed + 7);
    const noiseSat = this.gradientNoise(x * frequency, y * frequency + 500, options.seed + 8);
    const noiseLght = this.gradientNoise(x * frequency + 600, y * frequency + 600, options.seed + 9);

    return {
      x: noiseX * options.amplitude * (options.scaleToCanvas ? Math.min(artboardWidth * 0.2, artboardHeight * 0.2) : 20),
      y: noiseY * options.amplitude * (options.scaleToCanvas ? Math.min(artboardWidth * 0.2, artboardHeight * 0.2) : 20),
      rotation: noiseRot * options.amplitude * 45, // ±45 degrees max
      scaleX: 1 + noiseScaleX * options.amplitude * 0.15, // ±15% scale variation
      scaleY: 1 + noiseScaleY * options.amplitude * 0.15,
      opacity: Math.max(0.1, Math.min(1, 1 + noiseOpacity * options.amplitude * 0.1)), // ±10% opacity variation
      hue: noiseHue * options.amplitude * 20, // ±20 degrees hue variation
      saturation: noiseSat * options.amplitude * 10, // ±10% saturation variation
      lightness: noiseLght * options.amplitude * 8 // ±8% lightness variation
    };
  }

  /**
   * Fractal noise implementation
   */
  private static generateFractalNoise(x: number, y: number, z: number, options: NoiseOptions): NoiseResult {
    let result = {
      x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
      opacity: 1, hue: 0, saturation: 0, lightness: 0
    };

    const artboardWidth = options.artboardWidth || 400;
    const artboardHeight = options.artboardHeight || 400;
    
    // Position constraints based on artboard size when scaling to artboard
    const positionScale = options.scaleToCanvas ? 
      Math.min(artboardWidth * 0.3, artboardHeight * 0.3) : // Keep within 30% of artboard dimensions
      60; // Standard distribution when not constrained

    let amplitude = options.amplitude;
    let frequency = 1;
    const lacunarity = options.lacunarity || 2.0;
    const gain = options.gain || 0.5;

    for (let i = 0; i < options.octaves; i++) {
      const noiseX = this.perlin3D(x * frequency, y * frequency, z * frequency, options.seed);
      const noiseY = this.perlin3D(x * frequency + 1000, y * frequency + 1000, z * frequency, options.seed);
      const noiseZ = this.perlin3D(x * frequency + 2000, y * frequency + 2000, z * frequency, options.seed);

      // Apply noise values with proper scaling per octave
      result.x += noiseX * amplitude * (options.scaleToCanvas ? Math.min(artboardWidth * 0.2, artboardHeight * 0.2) : 20);
      result.y += noiseY * amplitude * (options.scaleToCanvas ? Math.min(artboardWidth * 0.2, artboardHeight * 0.2) : 20);
      result.rotation += noiseZ * amplitude * 45; // ±45 degrees max per octave
      result.scaleX += noiseX * amplitude * 0.15; // ±15% scale variation per octave
      result.scaleY += noiseY * amplitude * 0.15;
      result.opacity += noiseZ * amplitude * 0.1; // ±10% opacity variation per octave
      result.hue += noiseX * amplitude * 20; // ±20 degrees hue variation per octave
      result.saturation += noiseY * amplitude * 10; // ±10% saturation variation per octave
      result.lightness += noiseZ * amplitude * 8; // ±8% lightness variation per octave

      amplitude *= gain;
      frequency *= lacunarity;
    }

    // Apply fractal-specific clamping
    result.opacity = Math.max(0.1, Math.min(1, result.opacity));
    result.scaleX = Math.max(0.2, Math.min(2.5, result.scaleX));
    result.scaleY = Math.max(0.2, Math.min(2.5, result.scaleY));

    return result;
  }

  /**
   * Worley noise (cellular/Voronoi) implementation
   */
  private static generateWorleyNoise(x: number, y: number, options: NoiseOptions): NoiseResult {
    const featurePoints = options.featurePoints || 4;
    const distanceFunction = options.distanceFunction || 'euclidean';
    
    let minDistance = Infinity;
    let secondMinDistance = Infinity;

    // Generate feature points based on seed
    for (let i = 0; i < featurePoints; i++) {
      const fx = this.seededRandom(options.seed + i * 2)() * 10 - 5;
      const fy = this.seededRandom(options.seed + i * 2 + 1)() * 10 - 5;
      
      const distance = this.calculateDistance(x, y, fx, fy, distanceFunction);
      
      if (distance < minDistance) {
        secondMinDistance = minDistance;
        minDistance = distance;
      } else if (distance < secondMinDistance) {
        secondMinDistance = distance;
      }
    }

    const cellValue = minDistance;
    const edgeValue = secondMinDistance - minDistance;

    return {
      x: cellValue * options.amplitude * 20,
      y: edgeValue * options.amplitude * 20,
      rotation: (cellValue + edgeValue) * options.amplitude * 45,
      scaleX: 1 + cellValue * options.amplitude * 0.15,
      scaleY: 1 + edgeValue * options.amplitude * 0.15,
      opacity: Math.max(0.1, Math.min(1, 1 - cellValue * options.amplitude * 0.1)),
      hue: cellValue * options.amplitude * 20,
      saturation: edgeValue * options.amplitude * 10,
      lightness: (cellValue + edgeValue) * options.amplitude * 8
    };
  }

  /**
   * Ridge noise implementation
   */
  private static generateRidgeNoise(x: number, y: number, z: number, options: NoiseOptions): NoiseResult {
    const ridgeOffset = options.ridgeOffset || 1.0;
    let result = {
      x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
      opacity: 1, hue: 0, saturation: 0, lightness: 0
    };

    let amplitude = options.amplitude;
    let frequency = 1;

    for (let i = 0; i < options.octaves; i++) {
      let noise = this.perlin3D(x * frequency, y * frequency, z * frequency, options.seed);
      noise = ridgeOffset - Math.abs(noise); // Create ridge effect
      noise = noise * noise; // Square for sharper ridges

      result.x += noise * amplitude * 15;
      result.y += noise * amplitude * 15;
      result.rotation += noise * amplitude * 30;
      result.scaleX += noise * amplitude * 0.1;
      result.scaleY += noise * amplitude * 0.1;
      result.opacity += noise * amplitude * 0.05;
      result.hue += noise * amplitude * 15;
      result.saturation += noise * amplitude * 8;
      result.lightness += noise * amplitude * 6;

      amplitude *= (options.gain || 0.5);
      frequency *= (options.lacunarity || 2.0);
    }

    result.opacity = Math.max(0.1, Math.min(1, result.opacity));
    result.scaleX = Math.max(0.1, Math.min(3, result.scaleX));
    result.scaleY = Math.max(0.1, Math.min(3, result.scaleY));

    return result;
  }

  /**
   * Turbulence noise implementation
   */
  private static generateTurbulenceNoise(x: number, y: number, z: number, options: NoiseOptions): NoiseResult {
    const turbulencePower = options.turbulencePower || 1.0;
    let result = {
      x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
      opacity: 1, hue: 0, saturation: 0, lightness: 0
    };

    let amplitude = options.amplitude;
    let frequency = 1;

    for (let i = 0; i < options.octaves; i++) {
      let noiseX = this.perlin3D(x * frequency, y * frequency, z * frequency, options.seed);
      let noiseY = this.perlin3D(x * frequency + 100, y * frequency + 100, z * frequency, options.seed);
      let noiseZ = this.perlin3D(x * frequency + 200, y * frequency + 200, z * frequency, options.seed);

      // Apply turbulence by taking absolute value and applying power
      noiseX = Math.pow(Math.abs(noiseX), turbulencePower);
      noiseY = Math.pow(Math.abs(noiseY), turbulencePower);
      noiseZ = Math.pow(Math.abs(noiseZ), turbulencePower);

      result.x += noiseX * amplitude * 55;
      result.y += noiseY * amplitude * 55;
      result.rotation += noiseZ * amplitude * 250;
      result.scaleX += noiseX * amplitude * 0.3;
      result.scaleY += noiseY * amplitude * 0.3;
      result.opacity += noiseZ * amplitude * 0.15;
      result.hue += noiseX * amplitude * 40;
      result.saturation += noiseY * amplitude * 28;
      result.lightness += noiseZ * amplitude * 22;

      amplitude *= (options.gain || 0.5);
      frequency *= (options.lacunarity || 2.0);
    }

    result.opacity = Math.max(0.1, Math.min(1, result.opacity));
    result.scaleX = Math.max(0.1, Math.min(4, result.scaleX));
    result.scaleY = Math.max(0.1, Math.min(4, result.scaleY));

    return result;
  }

  /**
   * 3D Perlin noise implementation
   */
  private static perlin3D(x: number, y: number, z: number, seed: number): number {
    // Seed the permutation table
    const perm = [...this.permutation];
    for (let i = 0; i < 256; i++) {
      const j = Math.floor(this.seededRandom(seed + i)() * 256);
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }

    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = perm[X] + Y;
    const AA = perm[A] + Z;
    const AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y;
    const BA = perm[B] + Z;
    const BB = perm[B + 1] + Z;

    return this.lerp(w,
      this.lerp(v,
        this.lerp(u, this.grad(perm[AA], x, y, z), this.grad(perm[BA], x - 1, y, z)),
        this.lerp(u, this.grad(perm[AB], x, y - 1, z), this.grad(perm[BB], x - 1, y - 1, z))
      ),
      this.lerp(v,
        this.lerp(u, this.grad(perm[AA + 1], x, y, z - 1), this.grad(perm[BA + 1], x - 1, y, z - 1)),
        this.lerp(u, this.grad(perm[AB + 1], x, y - 1, z - 1), this.grad(perm[BB + 1], x - 1, y - 1, z - 1))
      )
    );
  }

  /**
   * Gradient noise helper
   */
  private static gradientNoise(x: number, y: number, seed: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.seededRandom(seed + xi + yi * 57)() * 2 - 1;
    const ab = this.seededRandom(seed + xi + (yi + 1) * 57)() * 2 - 1;
    const ba = this.seededRandom(seed + (xi + 1) + yi * 57)() * 2 - 1;
    const bb = this.seededRandom(seed + (xi + 1) + (yi + 1) * 57)() * 2 - 1;

    const x1 = this.lerp(aa, ba, u);
    const x2 = this.lerp(ab, bb, u);

    return this.lerp(x1, x2, v);
  }

  /**
   * Distance calculation for Worley noise
   */
  private static calculateDistance(x1: number, y1: number, x2: number, y2: number, type: string): number {
    const dx = x1 - x2;
    const dy = y1 - y2;

    switch (type) {
      case 'manhattan':
        return Math.abs(dx) + Math.abs(dy);
      case 'chebyshev':
        return Math.max(Math.abs(dx), Math.abs(dy));
      case 'euclidean':
      default:
        return Math.sqrt(dx * dx + dy * dy);
    }
  }

  /**
   * Utility functions
   */
  private static fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private static lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private static grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private static seededRandom(seed: number): () => number {
    let m = 0x80000000; // 2**31
    let a = 1103515245;
    let c = 12345;
    let state = seed ? seed : Math.floor(Math.random() * (m - 1));

    return function() {
      state = (a * state + c) % m;
      return state / (m - 1);
    };
  }
}