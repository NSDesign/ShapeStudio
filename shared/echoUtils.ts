/**
 * Shared Echo/Motion Trails Utilities
 * 
 * These functions calculate echo positions and effects for the Echo/Motion Trails feature.
 * Used by both client and server for consistent behavior (client/server parity).
 * 
 * Project A: Set-Level only (scope locked to 'set', driver is setRepIndex)
 */

import type { 
  EchoSpreadConfig, 
  EchoOpacityConfig, 
  EchoBlurConfig, 
  EchoScaleConfig,
  EchoRotationConfig,
  EchoJitterConfig,
  EchoPerEffectJitterConfig,
  EchoFixedVectorConfig,
  EchoAutoMotionConfig
} from './schema';

/**
 * Result of echo transform calculation for a single echo instance
 */
export interface EchoTransform {
  echoIndex: number;        // 0-based index of this echo
  offsetX: number;          // X offset from original shape position
  offsetY: number;          // Y offset from original shape position
  opacity: number;          // 0-1 opacity value
  blur: number;             // Blur radius in pixels
  scale: number;            // Scale factor (1.0 = 100%)
  rotation: number;         // Additional rotation in degrees
}

/**
 * Context for auto-motion mode - position deltas between set repetitions
 */
export interface AutoMotionContext {
  prevX?: number;           // Previous set repetition X position
  prevY?: number;           // Previous set repetition Y position
  currentX: number;         // Current set repetition X position
  currentY: number;         // Current set repetition Y position
}

/**
 * Seeded random number generator for deterministic jitter
 * Uses a simple LCG (Linear Congruential Generator)
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Calculate echo direction angle based on direction mode
 * 
 * @param config - Echo spread configuration
 * @param autoMotionContext - Optional context for auto-motion mode (set position deltas)
 * @returns Direction angle in degrees (0-360)
 */
export function calculateEchoDirection(
  config: EchoSpreadConfig,
  autoMotionContext?: AutoMotionContext
): number {
  if (config.directionMode === 'fixed-vector') {
    return config.fixedVector.angle;
  }
  
  // Auto-motion mode: derive direction from position deltas
  if (autoMotionContext && 
      autoMotionContext.prevX !== undefined && 
      autoMotionContext.prevY !== undefined) {
    const deltaX = autoMotionContext.currentX - autoMotionContext.prevX;
    const deltaY = autoMotionContext.currentY - autoMotionContext.prevY;
    
    // If there's meaningful motion, calculate angle from it
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance > 0.1) {
      // Calculate angle and add 180° to trail behind the motion
      let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
      angle = (angle + 180) % 360; // Reverse direction (trail behind)
      if (angle < 0) angle += 360;
      return angle;
    }
  }
  
  // Fallback angle when no motion detected
  return config.autoMotion.fallbackAngle;
}

/**
 * Calculate distance between echo copies based on direction mode
 */
export function calculateEchoDistance(
  config: EchoSpreadConfig,
  autoMotionContext?: AutoMotionContext
): number {
  if (config.directionMode === 'fixed-vector') {
    return config.fixedVector.distance;
  }
  
  // Auto-motion mode: derive distance from position deltas
  if (autoMotionContext && 
      autoMotionContext.prevX !== undefined && 
      autoMotionContext.prevY !== undefined) {
    const deltaX = autoMotionContext.currentX - autoMotionContext.prevX;
    const deltaY = autoMotionContext.currentY - autoMotionContext.prevY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    return distance * config.autoMotion.distanceMultiplier;
  }
  
  // Fallback to a reasonable default distance
  return 20 * config.autoMotion.distanceMultiplier;
}

/**
 * Calculate opacity for a specific echo index
 * 
 * @param opacityConfig - Opacity configuration
 * @param echoIndex - 0-based echo index (0 = first echo, closest to original)
 * @param totalEchoes - Total number of echo copies
 * @returns Opacity value 0-1
 */
export function calculateEchoOpacity(
  opacityConfig: EchoOpacityConfig,
  echoIndex: number,
  totalEchoes: number
): number {
  const startOpacity = opacityConfig.startOpacity / 100;
  const falloffRate = opacityConfig.falloffRate / 100;
  const minOpacity = opacityConfig.minOpacity / 100;
  
  // Calculate falloff: each echo loses (falloffRate) opacity
  const falloff = startOpacity * (1 - Math.pow(1 - falloffRate, echoIndex + 1));
  const opacity = Math.max(startOpacity - falloff, minOpacity);
  
  return Math.max(0, Math.min(1, opacity));
}

/**
 * Calculate blur for a specific echo index
 * 
 * @param blurConfig - Blur configuration
 * @param echoIndex - 0-based echo index
 * @returns Blur radius in pixels
 */
export function calculateEchoBlur(
  blurConfig: EchoBlurConfig,
  echoIndex: number
): number {
  if (!blurConfig.enabled) {
    return 0;
  }
  
  const blur = blurConfig.startBlur + (blurConfig.blurDelta * (echoIndex + 1));
  return Math.max(0, Math.min(blurConfig.maxBlur, blur));
}

/**
 * Calculate scale for a specific echo index
 * 
 * @param scaleConfig - Scale configuration
 * @param echoIndex - 0-based echo index
 * @returns Scale factor (1.0 = 100%)
 */
export function calculateEchoScale(
  scaleConfig: EchoScaleConfig,
  echoIndex: number
): number {
  if (!scaleConfig.enabled) {
    return 1.0;
  }
  
  const scalePercent = scaleConfig.startScale + (scaleConfig.scaleDelta * (echoIndex + 1));
  const clampedPercent = Math.max(
    scaleConfig.minScale,
    Math.min(scaleConfig.maxScale, scalePercent)
  );
  
  return clampedPercent / 100;
}

/**
 * Calculate rotation for a specific echo index
 * Now uses the full rotation config with start, delta, min, and max values
 * 
 * @param rotationConfig - Rotation configuration
 * @param echoIndex - 0-based echo index
 * @returns Total rotation in degrees
 */
export function calculateEchoRotation(
  rotationConfig: EchoRotationConfig,
  echoIndex: number
): number {
  if (!rotationConfig.enabled) {
    return 0;
  }
  
  const rotation = rotationConfig.startRotation + (rotationConfig.rotationDelta * (echoIndex + 1));
  return Math.max(
    rotationConfig.minRotation,
    Math.min(rotationConfig.maxRotation, rotation)
  );
}

/**
 * Apply per-effect jitter to a calculated effect value
 * Uses deterministic seeded random for reproducibility
 * 
 * @param effectJitter - Per-effect jitter config
 * @param baseValue - The calculated base value
 * @param seed - Random seed for deterministic jitter
 * @returns Jittered value
 */
export function applyPerEffectJitter(
  effectJitter: EchoPerEffectJitterConfig,
  baseValue: number,
  seed: number
): number {
  if (!effectJitter.enabled || effectJitter.range === 0) {
    return baseValue;
  }
  
  const random = seededRandom(seed);
  const jitterAmount = (random() * 2 - 1) * effectJitter.range;
  return baseValue + jitterAmount;
}

/**
 * Apply jitter to distance and angle
 * Uses deterministic seeded random for reproducibility
 * 
 * @param jitterConfig - Jitter configuration
 * @param baseAngle - Base direction angle in degrees
 * @param baseDistance - Base distance in pixels
 * @param seed - Random seed for deterministic jitter
 * @returns Object with jittered angle and distance
 */
export function applyJitter(
  jitterConfig: EchoJitterConfig,
  baseAngle: number,
  baseDistance: number,
  seed: number
): { angle: number; distance: number } {
  if (!jitterConfig.enabled || (jitterConfig.distanceRange === 0 && jitterConfig.angleRange === 0)) {
    return { angle: baseAngle, distance: baseDistance };
  }
  
  const random = seededRandom(seed);
  
  // Apply distance jitter: ±distanceRange
  const distanceJitter = (random() * 2 - 1) * jitterConfig.distanceRange;
  const jitteredDistance = Math.max(0, baseDistance + distanceJitter);
  
  // Apply angle jitter: ±angleRange
  const angleJitter = (random() * 2 - 1) * jitterConfig.angleRange;
  let jitteredAngle = baseAngle + angleJitter;
  
  // Normalize angle to 0-360
  while (jitteredAngle < 0) jitteredAngle += 360;
  while (jitteredAngle >= 360) jitteredAngle -= 360;
  
  return { angle: jitteredAngle, distance: jitteredDistance };
}

/**
 * Calculate all echo transforms for a set repetition
 * 
 * @param config - Echo spread configuration
 * @param setRepIndex - Set repetition index (0-based)
 * @param autoMotionContext - Optional context for auto-motion direction detection
 * @returns Array of echo transforms, one per echo copy
 */
export function calculateEchoTransforms(
  config: EchoSpreadConfig,
  setRepIndex: number,
  autoMotionContext?: AutoMotionContext
): EchoTransform[] {
  if (!config.enabled || config.echoCount <= 0) {
    return [];
  }
  
  const echoes: EchoTransform[] = [];
  
  // Calculate base direction and distance
  const baseAngle = calculateEchoDirection(config, autoMotionContext);
  const baseDistance = calculateEchoDistance(config, autoMotionContext);
  
  for (let i = 0; i < config.echoCount; i++) {
    // Create deterministic seeds based on set rep index, echo index, and effect type
    const baseSeed = setRepIndex * 1000 + i * 17;
    const opacitySeed = baseSeed + 1;
    const blurSeed = baseSeed + 2;
    const scaleSeed = baseSeed + 3;
    const rotationSeed = baseSeed + 4;
    
    // Apply position jitter to angle and distance
    const { angle, distance } = applyJitter(
      config.jitter,
      baseAngle,
      baseDistance,
      baseSeed
    );
    
    // Calculate cumulative position offset for this echo
    // Each echo is positioned further away: echo 0 at 1×distance, echo 1 at 2×distance, etc.
    const cumulativeDistance = distance * (i + 1);
    const angleRad = angle * (Math.PI / 180);
    const offsetX = Math.cos(angleRad) * cumulativeDistance;
    const offsetY = Math.sin(angleRad) * cumulativeDistance;
    
    // Calculate per-echo effects with per-effect jitter
    let opacity = calculateEchoOpacity(config.opacity, i, config.echoCount);
    opacity = Math.max(0, Math.min(1, applyPerEffectJitter(config.opacity.jitter, opacity, opacitySeed)));
    
    let blur = calculateEchoBlur(config.blur, i);
    blur = Math.max(0, applyPerEffectJitter(config.blur.jitter, blur, blurSeed));
    
    let scale = calculateEchoScale(config.scale, i);
    const scaleJitterAmount = applyPerEffectJitter(config.scale.jitter, 0, scaleSeed) / 100; // Convert percentage jitter to scale factor
    scale = Math.max(0.01, scale + scaleJitterAmount);
    
    let rotation = calculateEchoRotation(config.rotation, i);
    rotation = applyPerEffectJitter(config.rotation.jitter, rotation, rotationSeed);
    
    echoes.push({
      echoIndex: i,
      offsetX,
      offsetY,
      opacity,
      blur,
      scale,
      rotation
    });
  }
  
  return echoes;
}

/**
 * Check if echo rendering is enabled and should be applied
 */
export function isEchoEnabled(config: EchoSpreadConfig | undefined): boolean {
  return config?.enabled === true && config.echoCount > 0;
}

/**
 * Get total shape count including echoes
 * Useful for performance estimation
 */
export function getTotalShapeCountWithEchoes(
  baseShapeCount: number,
  config: EchoSpreadConfig | undefined
): number {
  if (!isEchoEnabled(config)) {
    return baseShapeCount;
  }
  
  // Each base shape generates echoCount echo copies
  return baseShapeCount + (baseShapeCount * config!.echoCount);
}
