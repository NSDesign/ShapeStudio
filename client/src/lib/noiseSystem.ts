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
  
  // Property-specific amplitude multipliers
  positionAmplitude?: number;
  rotationAmplitude?: number;
  scaleAmplitude?: number;
  opacityAmplitude?: number;
  colorAmplitude?: number;
  
  // Octave handling mode
  octaveMode?: 'natural' | 'normalized';
}



// Final processed noise values with property-specific ranges
export interface NoiseResult {
  x: number;         // Position offset in pixels
  y: number;         // Position offset in pixels
  rotation: number;  // Absolute rotation 0-360°
  scaleX: number;    // Multiplicative scale >= 1.0
  scaleY: number;    // Multiplicative scale >= 1.0
  opacity: number;   // Range [0.1, 1.0]
  hue: number;       // Absolute hue 0-360°
  saturation: number; // Absolute saturation 0-100%
  lightness: number;  // Absolute lightness 0-100%
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
      // Property-specific amplitudes
      positionAmplitude: settings.noisePositionAmplitude,
      rotationAmplitude: settings.noiseRotationAmplitude,
      scaleAmplitude: settings.noiseScaleAmplitude,
      opacityAmplitude: settings.noiseOpacityAmplitude,
      colorAmplitude: settings.noiseColorAmplitude,
      octaveMode: settings.noiseOctaveMode,
      // Algorithm-specific
      lacunarity: settings.noiseLacunarity,
      gain: settings.noiseGain,
      distanceFunction: settings.noiseDistanceFunction,
      featurePoints: settings.noiseFeaturePoints,
      ridgeOffset: settings.noiseRidgeOffset,
      turbulencePower: settings.noiseTurbulencePower
    };

    // Generate noise coordinates with larger spacing for better per-shape variation
    const noiseX = (shapeIndex * 1.37 + baseX * 0.01) * options.scale; // Increased spacing 10x
    const noiseY = (shapeIndex * 2.11 + baseY * 0.01) * options.scale; // Different prime spacing
    const noiseZ = shapeIndex * 0.83; // Increased Z spacing 10x

    // Generate noise using unified implementation
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
   * Random noise generation with unified implementation approach
   */
  private static generateRandomNoise(shapeIndex: number, options: NoiseOptions): NoiseResult {
    // Use large prime offsets to eliminate sequential correlation
    const baseOffset = shapeIndex * 4177;
    
    // Generate independent random values
    const randX = this.seededRandom(options.seed + baseOffset + 7919)();
    const randY = this.seededRandom(options.seed + baseOffset + 15937)();
    const randRot = this.seededRandom(options.seed + baseOffset + 24077)();
    const randScale = this.seededRandom(options.seed + baseOffset + 32143)();
    const randOpacity = this.seededRandom(options.seed + baseOffset + 40213)();
    const randHue = this.seededRandom(options.seed + baseOffset + 48299)();
    const randSat = this.seededRandom(options.seed + baseOffset + 56377)();
    const randLght = this.seededRandom(options.seed + baseOffset + 64439)();
    
    const artboardWidth = options.artboardWidth || 400;
    const artboardHeight = options.artboardHeight || 400;
    
    // Position range - unconstrained 20px or artboard-based
    const maxPosOffset = options.scaleToCanvas ? 
      Math.min(artboardWidth * 0.3, artboardHeight * 0.3) : 
      20;
    
    return {
      // Position: centered around 0 with ±range
      x: (randX - 0.5) * 2 * maxPosOffset * options.amplitude,
      y: (randY - 0.5) * 2 * maxPosOffset * options.amplitude,
      
      // Rotation: 0-360 degrees
      rotation: randRot * 360 * options.amplitude,
      
      // Scale: 0.5-1.5x range
      scaleX: 0.5 + randScale * 1.0 * options.amplitude,
      scaleY: 0.5 + randScale * 1.0 * options.amplitude,
      
      // Opacity: 0.1-1.0 range
      opacity: Math.max(0.1, 0.1 + randOpacity * 0.9 * options.amplitude),
      
      // Colors: natural HSL ranges
      hue: randHue * 360 * options.amplitude,
      saturation: 50 + randSat * 50 * options.amplitude, // 50-100%
      lightness: 30 + randLght * 40 * options.amplitude  // 30-70%
    };
  }
  
  /**
   * Perlin noise implementation with unified approach
   */
  private static generatePerlinNoise(x: number, y: number, z: number, options: NoiseOptions): NoiseResult {
    let positionX = 0, positionY = 0, rotation = 0;
    let scaleX = 0, scaleY = 0, opacity = 0;
    let hue = 0, saturation = 0, lightness = 0;
    
    const artboardWidth = options.artboardWidth || 400;
    const artboardHeight = options.artboardHeight || 400;
    
    // Max allowed offset: 50px unconstrained or 30% of artboard
    const maxPosOffset = options.scaleToCanvas ? 
      Math.min(artboardWidth * 0.3, artboardHeight * 0.3) : 
      50;
    
    let amplitude = options.amplitude;
    let frequency = 1 / options.scale;
    
    // Generate noise across octaves with improved coordinate independence
    for (let i = 0; i < options.octaves; i++) {
      // Use large prime numbers to eliminate coordinate correlations
      const noiseX = this.perlin3D(x * frequency + 1117 * i, y * frequency + 2221 * i, z * frequency + 3331 * i, options.seed + 1);
      const noiseY = this.perlin3D(x * frequency + 4441 * i, y * frequency + 5557 * i, z * frequency + 6661 * i, options.seed + 2);
      const noiseRot = this.perlin3D(x * frequency + 7771 * i, y * frequency + 8887 * i, z * frequency + 9997 * i, options.seed + 3);
      const noiseScaleX = this.perlin3D(x * frequency + 10007 * i, y * frequency + 11117 * i, z * frequency + 12227 * i, options.seed + 4);
      const noiseScaleY = this.perlin3D(x * frequency + 13337 * i, y * frequency + 14447 * i, z * frequency + 15557 * i, options.seed + 5);
      const noiseOpacity = this.perlin3D(x * frequency + 16667 * i, y * frequency + 17777 * i, z * frequency + 18887 * i, options.seed + 6);
      const noiseHue = this.perlin3D(x * frequency + 19997 * i, y * frequency + 21107 * i, z * frequency + 22217 * i, options.seed + 7);
      const noiseSat = this.perlin3D(x * frequency + 23327 * i, y * frequency + 24437 * i, z * frequency + 25547 * i, options.seed + 8);
      const noiseLght = this.perlin3D(x * frequency + 26657 * i, y * frequency + 27767 * i, z * frequency + 28877 * i, options.seed + 9);
      
      // Apply noise with proper ranges per octave
      positionX += noiseX * amplitude * maxPosOffset * 0.25;
      positionY += noiseY * amplitude * maxPosOffset * 0.25;
      rotation += noiseRot * amplitude * 45; // ±45° per octave
      scaleX += noiseScaleX * amplitude * 0.125; // ±0.125x per octave
      scaleY += noiseScaleY * amplitude * 0.125;
      opacity += noiseOpacity * amplitude * 0.15; // ±0.15 per octave
      hue += noiseHue * amplitude * 60; // ±60° per octave
      saturation += noiseSat * amplitude * 30; // ±30% per octave
      lightness += noiseLght * amplitude * 25; // ±25% per octave
      
      // Update for next octave
      amplitude *= (options.gain || 0.5);
      frequency *= (options.lacunarity || 2.0);
    }
    
    return {
      x: Math.max(-maxPosOffset, Math.min(maxPosOffset, positionX)),
      y: Math.max(-maxPosOffset, Math.min(maxPosOffset, positionY)),
      rotation: Math.abs(rotation) % 360,
      scaleX: Math.max(1.0, 1.0 + scaleX),
      scaleY: Math.max(1.0, 1.0 + scaleY),
      opacity: Math.max(0.1, Math.min(1.0, 1.0 + opacity)),
      hue: Math.abs(hue) % 360,
      saturation: Math.max(0, Math.min(100, 75 + saturation)),
      lightness: Math.max(0, Math.min(100, 50 + lightness))
    };
  }

  /**
   * Simplex noise implementation with improved coordinate independence
   */
  private static generateSimplexNoise(x: number, y: number, z: number, options: NoiseOptions): NoiseResult {
    let positionX = 0, positionY = 0, rotation = 0;
    let scaleX = 0, scaleY = 0, opacity = 0;
    let hue = 0, saturation = 0, lightness = 0;
    
    const artboardWidth = options.artboardWidth || 400;
    const artboardHeight = options.artboardHeight || 400;
    
    // Max allowed offset: 50px unconstrained or 30% of artboard
    const maxPosOffset = options.scaleToCanvas ? 
      Math.min(artboardWidth * 0.3, artboardHeight * 0.3) : 
      50;
    
    const positionScale = maxPosOffset / options.octaves; // Distribute across octaves
    
    let amplitude = options.amplitude;
    let frequency = 1 / options.scale;
    
    // Accumulate noise across octaves with proper control
    for (let i = 0; i < options.octaves; i++) {
      const octaveAmplitude = amplitude;
      
      // Use large prime numbers for coordinate independence
      const noiseX = this.gradientNoise(x * frequency + 1423 * i, y * frequency + 2347 * i, options.seed + 1);
      const noiseY = this.gradientNoise(x * frequency + 3449 * i, y * frequency + 4547 * i, options.seed + 2);
      const noiseRot = this.gradientNoise(x * frequency + 5647 * i, y * frequency + 6749 * i, options.seed + 3);
      const noiseScaleX = this.gradientNoise(x * frequency + 7853 * i, y * frequency + 8951 * i, options.seed + 4);
      const noiseScaleY = this.gradientNoise(x * frequency + 9049 * i, y * frequency + 10151 * i, options.seed + 5);
      const noiseOpacity = this.gradientNoise(x * frequency + 11251 * i, y * frequency + 12347 * i, options.seed + 6);
      const noiseHue = this.gradientNoise(x * frequency + 13441 * i, y * frequency + 14549 * i, options.seed + 7);
      const noiseSat = this.gradientNoise(x * frequency + 15643 * i, y * frequency + 16747 * i, options.seed + 8);
      const noiseLght = this.gradientNoise(x * frequency + 17851 * i, y * frequency + 18947 * i, options.seed + 9);
      
      // Apply noise with controlled ranges per octave
      positionX += noiseX * octaveAmplitude * positionScale * 0.25;
      positionY += noiseY * octaveAmplitude * positionScale * 0.25;
      rotation += noiseRot * octaveAmplitude * 20; // Max ±20 degrees per octave
      scaleX += noiseScaleX * octaveAmplitude * 0.06;
      scaleY += noiseScaleY * octaveAmplitude * 0.06;
      opacity += noiseOpacity * octaveAmplitude * 0.02;
      hue += noiseHue * octaveAmplitude * 10;
      saturation += noiseSat * octaveAmplitude * 3;
      lightness += noiseLght * octaveAmplitude * 2.5;
      
      amplitude *= 0.5; // Reduce amplitude for next octave
      frequency *= 2; // Increase frequency for next octave
    }
    
    // Final clamping to ensure reasonable ranges
    return {
      x: Math.max(-maxPosOffset, Math.min(maxPosOffset, positionX)),
      y: Math.max(-maxPosOffset, Math.min(maxPosOffset, positionY)),
      rotation: Math.max(-90, Math.min(90, rotation)),
      scaleX: 1 + Math.max(-0.25, Math.min(0.25, scaleX)),
      scaleY: 1 + Math.max(-0.25, Math.min(0.25, scaleY)),
      opacity: Math.max(0.7, Math.min(1, 1 + opacity)),
      hue: Math.max(-25, Math.min(25, hue)),
      saturation: Math.max(-10, Math.min(10, saturation)),
      lightness: Math.max(-8, Math.min(8, lightness))
    };
  }

  /**
   * Fractal noise implementation with improved coordinate independence
   */
  private static generateFractalNoise(x: number, y: number, z: number, options: NoiseOptions): NoiseResult {
    let positionX = 0, positionY = 0, rotation = 0;
    let scaleX = 0, scaleY = 0, opacity = 0;
    let hue = 0, saturation = 0, lightness = 0;

    const artboardWidth = options.artboardWidth || 400;
    const artboardHeight = options.artboardHeight || 400;
    
    // Max allowed offset: 50px unconstrained or 30% of artboard
    const maxPosOffset = options.scaleToCanvas ? 
      Math.min(artboardWidth * 0.3, artboardHeight * 0.3) : 
      50;
    
    const positionScale = maxPosOffset / options.octaves;

    let amplitude = options.amplitude;
    let frequency = 1 / options.scale;
    const lacunarity = options.lacunarity || 2.0;
    const gain = options.gain || 0.5;

    for (let i = 0; i < options.octaves; i++) {
      const octaveAmplitude = amplitude;
      
      // Use large prime numbers for coordinate independence
      const noiseX = this.perlin3D(x * frequency + 2003 * i, y * frequency + 3011 * i, z * frequency + 4021 * i, options.seed);
      const noiseY = this.perlin3D(x * frequency + 5023 * i, y * frequency + 6037 * i, z * frequency + 7043 * i, options.seed);
      const noiseRot = this.perlin3D(x * frequency + 8053 * i, y * frequency + 9059 * i, z * frequency + 10067 * i, options.seed);
      const noiseScaleX = this.perlin3D(x * frequency + 11071 * i, y * frequency + 12073 * i, z * frequency + 13103 * i, options.seed);
      const noiseScaleY = this.perlin3D(x * frequency + 14107 * i, y * frequency + 15131 * i, z * frequency + 16139 * i, options.seed);
      const noiseOpacity = this.perlin3D(x * frequency + 17159 * i, y * frequency + 18169 * i, z * frequency + 19181 * i, options.seed);
      const noiseHue = this.perlin3D(x * frequency + 20201 * i, y * frequency + 21211 * i, z * frequency + 22229 * i, options.seed);
      const noiseSat = this.perlin3D(x * frequency + 23227 * i, y * frequency + 24229 * i, z * frequency + 25237 * i, options.seed);
      const noiseLght = this.perlin3D(x * frequency + 26249 * i, y * frequency + 27253 * i, z * frequency + 28277 * i, options.seed);

      // Apply noise with controlled ranges per octave
      positionX += noiseX * octaveAmplitude * positionScale * 0.25;
      positionY += noiseY * octaveAmplitude * positionScale * 0.25;
      rotation += noiseRot * octaveAmplitude * 20; // Max ±20 degrees per octave
      scaleX += noiseScaleX * octaveAmplitude * 0.06;
      scaleY += noiseScaleY * octaveAmplitude * 0.06;
      opacity += noiseOpacity * octaveAmplitude * 0.02;
      hue += noiseHue * octaveAmplitude * 10;
      saturation += noiseSat * octaveAmplitude * 3;
      lightness += noiseLght * octaveAmplitude * 2.5;

      amplitude *= gain;
      frequency *= lacunarity;
    }

    // Final clamping to ensure reasonable ranges
    return {
      x: Math.max(-maxPosOffset, Math.min(maxPosOffset, positionX)),
      y: Math.max(-maxPosOffset, Math.min(maxPosOffset, positionY)),
      rotation: Math.max(-90, Math.min(90, rotation)),
      scaleX: 1 + Math.max(-0.25, Math.min(0.25, scaleX)),
      scaleY: 1 + Math.max(-0.25, Math.min(0.25, scaleY)),
      opacity: Math.max(0.7, Math.min(1, 1 + opacity)),
      hue: Math.max(-25, Math.min(25, hue)),
      saturation: Math.max(-10, Math.min(10, saturation)),
      lightness: Math.max(-8, Math.min(8, lightness))
    };
  }

  /**
   * Worley noise (cellular/Voronoi) implementation with improved value control
   */
  private static generateWorleyNoise(x: number, y: number, options: NoiseOptions): NoiseResult {
    const featurePoints = options.featurePoints || 4;
    const distanceFunction = options.distanceFunction || 'euclidean';
    
    const artboardWidth = options.artboardWidth || 400;
    const artboardHeight = options.artboardHeight || 400;
    
    // Max allowed offset: 50px unconstrained or 30% of artboard
    const maxPosOffset = options.scaleToCanvas ? 
      Math.min(artboardWidth * 0.3, artboardHeight * 0.3) : 
      50;
    
    let positionX = 0, positionY = 0, rotation = 0;
    let scaleX = 0, scaleY = 0, opacity = 0;
    let hue = 0, saturation = 0, lightness = 0;
    
    // Accumulate noise across octaves
    let amplitude = options.amplitude;
    let frequency = 1 / options.scale;
    
    for (let octave = 0; octave < options.octaves; octave++) {
      let minDistance = Infinity;
      let secondMinDistance = Infinity;
      
      // Generate feature points with coordinate independence
      for (let i = 0; i < featurePoints; i++) {
        // Use large prime numbers for coordinate independence
        const fx = this.seededRandom(options.seed + i * 1109 + octave * 2113)() * 10 - 5;
        const fy = this.seededRandom(options.seed + i * 3119 + octave * 4129)() * 10 - 5;
        
        const distance = this.calculateDistance(
          x * frequency, 
          y * frequency, 
          fx, 
          fy, 
          distanceFunction
        );
        
        if (distance < minDistance) {
          secondMinDistance = minDistance;
          minDistance = distance;
        } else if (distance < secondMinDistance) {
          secondMinDistance = distance;
        }
      }
      
      // Normalize cell and edge values to [-1, 1] range
      const cellValue = (minDistance - 2.5) / 2.5; // Normalize from typical [0, 5] to [-1, 1]
      const edgeValue = ((secondMinDistance - minDistance) - 1) / 1; // Normalize edge difference
      
      // Apply controlled ranges per octave
      positionX += cellValue * amplitude * maxPosOffset * 0.2;
      positionY += edgeValue * amplitude * maxPosOffset * 0.2;
      rotation += (cellValue + edgeValue) * amplitude * 15;
      scaleX += cellValue * amplitude * 0.05;
      scaleY += edgeValue * amplitude * 0.05;
      opacity += cellValue * amplitude * 0.015;
      hue += cellValue * amplitude * 8;
      saturation += edgeValue * amplitude * 3;
      lightness += (cellValue + edgeValue) * amplitude * 2;
      
      amplitude *= 0.5;
      frequency *= 2;
    }

    // Final clamping to ensure reasonable ranges
    return {
      x: Math.max(-maxPosOffset, Math.min(maxPosOffset, positionX)),
      y: Math.max(-maxPosOffset, Math.min(maxPosOffset, positionY)),
      rotation: Math.max(-90, Math.min(90, rotation)),
      scaleX: 1 + Math.max(-0.25, Math.min(0.25, scaleX)),
      scaleY: 1 + Math.max(-0.25, Math.min(0.25, scaleY)),
      opacity: Math.max(0.7, Math.min(1, 1 + opacity)),
      hue: Math.max(-25, Math.min(25, hue)),
      saturation: Math.max(-10, Math.min(10, saturation)),
      lightness: Math.max(-8, Math.min(8, lightness))
    };
  }

  /**
   * Ridge noise implementation with improved coordinate independence
   */
  private static generateRidgeNoise(x: number, y: number, z: number, options: NoiseOptions): NoiseResult {
    const ridgeOffset = options.ridgeOffset || 1.0;
    let positionX = 0, positionY = 0, rotation = 0;
    let scaleX = 0, scaleY = 0, opacity = 0;
    let hue = 0, saturation = 0, lightness = 0;

    const artboardWidth = options.artboardWidth || 400;
    const artboardHeight = options.artboardHeight || 400;
    
    // Max allowed offset: 50px unconstrained or 30% of artboard
    const maxPosOffset = options.scaleToCanvas ? 
      Math.min(artboardWidth * 0.3, artboardHeight * 0.3) : 
      50;
    
    const positionScale = maxPosOffset / options.octaves;

    let amplitude = options.amplitude;
    let frequency = 1 / options.scale;

    for (let i = 0; i < options.octaves; i++) {
      const octaveAmplitude = amplitude;
      
      // Use large prime numbers for coordinate independence
      const noiseX = this.perlin3D(x * frequency + 1283 * i, y * frequency + 2287 * i, z * frequency + 3299 * i, options.seed);
      const noiseY = this.perlin3D(x * frequency + 4297 * i, y * frequency + 5303 * i, z * frequency + 6311 * i, options.seed);
      const noiseRot = this.perlin3D(x * frequency + 7307 * i, y * frequency + 8317 * i, z * frequency + 9319 * i, options.seed);
      const noiseScaleX = this.perlin3D(x * frequency + 10331 * i, y * frequency + 11329 * i, z * frequency + 12343 * i, options.seed);
      const noiseScaleY = this.perlin3D(x * frequency + 13337 * i, y * frequency + 14341 * i, z * frequency + 15349 * i, options.seed);
      const noiseOpacity = this.perlin3D(x * frequency + 16361 * i, y * frequency + 17377 * i, z * frequency + 18379 * i, options.seed);
      const noiseHue = this.perlin3D(x * frequency + 19381 * i, y * frequency + 20389 * i, z * frequency + 21391 * i, options.seed);
      const noiseSat = this.perlin3D(x * frequency + 22397 * i, y * frequency + 23399 * i, z * frequency + 24407 * i, options.seed);
      const noiseLght = this.perlin3D(x * frequency + 25409 * i, y * frequency + 26417 * i, z * frequency + 27427 * i, options.seed);
      
      // Apply ridge effect to each noise value
      const ridgeX = ridgeOffset - Math.abs(noiseX);
      const ridgeY = ridgeOffset - Math.abs(noiseY);
      const ridgeRot = ridgeOffset - Math.abs(noiseRot);
      const ridgeScaleX = ridgeOffset - Math.abs(noiseScaleX);
      const ridgeScaleY = ridgeOffset - Math.abs(noiseScaleY);
      const ridgeOpacity = ridgeOffset - Math.abs(noiseOpacity);
      const ridgeHue = ridgeOffset - Math.abs(noiseHue);
      const ridgeSat = ridgeOffset - Math.abs(noiseSat);
      const ridgeLght = ridgeOffset - Math.abs(noiseLght);

      // Apply noise with controlled ranges per octave
      positionX += ridgeX * ridgeX * octaveAmplitude * positionScale * 0.25;
      positionY += ridgeY * ridgeY * octaveAmplitude * positionScale * 0.25;
      rotation += ridgeRot * ridgeRot * octaveAmplitude * 20;
      scaleX += ridgeScaleX * ridgeScaleX * octaveAmplitude * 0.06;
      scaleY += ridgeScaleY * ridgeScaleY * octaveAmplitude * 0.06;
      opacity += ridgeOpacity * ridgeOpacity * octaveAmplitude * 0.02;
      hue += ridgeHue * ridgeHue * octaveAmplitude * 10;
      saturation += ridgeSat * ridgeSat * octaveAmplitude * 3;
      lightness += ridgeLght * ridgeLght * octaveAmplitude * 2.5;

      amplitude *= (options.gain || 0.5);
      frequency *= (options.lacunarity || 2.0);
    }

    // Final clamping to ensure reasonable ranges
    return {
      x: Math.max(-maxPosOffset, Math.min(maxPosOffset, positionX)),
      y: Math.max(-maxPosOffset, Math.min(maxPosOffset, positionY)),
      rotation: Math.max(-90, Math.min(90, rotation)),
      scaleX: 1 + Math.max(-0.25, Math.min(0.25, scaleX)),
      scaleY: 1 + Math.max(-0.25, Math.min(0.25, scaleY)),
      opacity: Math.max(0.7, Math.min(1, 1 + opacity)),
      hue: Math.max(-25, Math.min(25, hue)),
      saturation: Math.max(-10, Math.min(10, saturation)),
      lightness: Math.max(-8, Math.min(8, lightness))
    };
  }

  /**
   * Turbulence noise implementation with improved coordinate independence
   */
  private static generateTurbulenceNoise(x: number, y: number, z: number, options: NoiseOptions): NoiseResult {
    const turbulencePower = options.turbulencePower || 1.0;
    let positionX = 0, positionY = 0, rotation = 0;
    let scaleX = 0, scaleY = 0, opacity = 0;
    let hue = 0, saturation = 0, lightness = 0;

    const artboardWidth = options.artboardWidth || 400;
    const artboardHeight = options.artboardHeight || 400;
    
    // Max allowed offset: 50px unconstrained or 30% of artboard
    const maxPosOffset = options.scaleToCanvas ? 
      Math.min(artboardWidth * 0.3, artboardHeight * 0.3) : 
      50;
    
    const positionScale = maxPosOffset / options.octaves;

    let amplitude = options.amplitude;
    let frequency = 1 / options.scale;

    for (let i = 0; i < options.octaves; i++) {
      const octaveAmplitude = amplitude;
      
      // Use large prime numbers for coordinate independence
      const noiseX = this.perlin3D(x * frequency + 1607 * i, y * frequency + 2609 * i, z * frequency + 3613 * i, options.seed);
      const noiseY = this.perlin3D(x * frequency + 4621 * i, y * frequency + 5623 * i, z * frequency + 6637 * i, options.seed);
      const noiseRot = this.perlin3D(x * frequency + 7639 * i, y * frequency + 8641 * i, z * frequency + 9643 * i, options.seed);
      const noiseScaleX = this.perlin3D(x * frequency + 10651 * i, y * frequency + 11657 * i, z * frequency + 12659 * i, options.seed);
      const noiseScaleY = this.perlin3D(x * frequency + 13669 * i, y * frequency + 14683 * i, z * frequency + 15683 * i, options.seed);
      const noiseOpacity = this.perlin3D(x * frequency + 16691 * i, y * frequency + 17707 * i, z * frequency + 18713 * i, options.seed);
      const noiseHue = this.perlin3D(x * frequency + 19717 * i, y * frequency + 20719 * i, z * frequency + 21727 * i, options.seed);
      const noiseSat = this.perlin3D(x * frequency + 22739 * i, y * frequency + 23741 * i, z * frequency + 24749 * i, options.seed);
      const noiseLght = this.perlin3D(x * frequency + 25759 * i, y * frequency + 26777 * i, z * frequency + 27779 * i, options.seed);

      // Apply turbulence by taking absolute value and applying power
      const turbX = Math.pow(Math.abs(noiseX), turbulencePower) * Math.sign(noiseX);
      const turbY = Math.pow(Math.abs(noiseY), turbulencePower) * Math.sign(noiseY);
      const turbRot = Math.pow(Math.abs(noiseRot), turbulencePower) * Math.sign(noiseRot);
      const turbScaleX = Math.pow(Math.abs(noiseScaleX), turbulencePower) * Math.sign(noiseScaleX);
      const turbScaleY = Math.pow(Math.abs(noiseScaleY), turbulencePower) * Math.sign(noiseScaleY);
      const turbOpacity = Math.pow(Math.abs(noiseOpacity), turbulencePower) * Math.sign(noiseOpacity);
      const turbHue = Math.pow(Math.abs(noiseHue), turbulencePower) * Math.sign(noiseHue);
      const turbSat = Math.pow(Math.abs(noiseSat), turbulencePower) * Math.sign(noiseSat);
      const turbLght = Math.pow(Math.abs(noiseLght), turbulencePower) * Math.sign(noiseLght);

      // Apply noise with controlled ranges per octave
      positionX += turbX * octaveAmplitude * positionScale * 0.25;
      positionY += turbY * octaveAmplitude * positionScale * 0.25;
      rotation += turbRot * octaveAmplitude * 20;
      scaleX += turbScaleX * octaveAmplitude * 0.06;
      scaleY += turbScaleY * octaveAmplitude * 0.06;
      opacity += turbOpacity * octaveAmplitude * 0.02;
      hue += turbHue * octaveAmplitude * 10;
      saturation += turbSat * octaveAmplitude * 3;
      lightness += turbLght * octaveAmplitude * 2.5;

      amplitude *= (options.gain || 0.5);
      frequency *= (options.lacunarity || 2.0);
    }

    // Final clamping to ensure reasonable ranges
    return {
      x: Math.max(-maxPosOffset, Math.min(maxPosOffset, positionX)),
      y: Math.max(-maxPosOffset, Math.min(maxPosOffset, positionY)),
      rotation: Math.max(-90, Math.min(90, rotation)),
      scaleX: 1 + Math.max(-0.25, Math.min(0.25, scaleX)),
      scaleY: 1 + Math.max(-0.25, Math.min(0.25, scaleY)),
      opacity: Math.max(0.7, Math.min(1, 1 + opacity)),
      hue: Math.max(-25, Math.min(25, hue)),
      saturation: Math.max(-10, Math.min(10, saturation)),
      lightness: Math.max(-8, Math.min(8, lightness))
    };
  }

  /**
   * 3D Perlin noise implementation with proper centering
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

    // Calculate the raw noise value
    const noise = this.lerp(w,
      this.lerp(v,
        this.lerp(u, this.grad(perm[AA], x, y, z), this.grad(perm[BA], x - 1, y, z)),
        this.lerp(u, this.grad(perm[AB], x, y - 1, z), this.grad(perm[BB], x - 1, y - 1, z))
      ),
      this.lerp(v,
        this.lerp(u, this.grad(perm[AA + 1], x, y, z - 1), this.grad(perm[BA + 1], x - 1, y, z - 1)),
        this.lerp(u, this.grad(perm[AB + 1], x, y - 1, z - 1), this.grad(perm[BB + 1], x - 1, y - 1, z - 1))
      )
    );
    
    // Ensure proper zero-centering and [-1, 1] range
    // The theoretical range of Perlin noise is approximately [-√(n/2), √(n/2)] where n is dimensions
    // For 3D, this is approximately [-0.866, 0.866], so we normalize to [-1, 1]
    return Math.max(-1, Math.min(1, noise / 0.866));
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