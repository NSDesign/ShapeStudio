/**
 * Shared distribution types for client and server
 */

/**
 * Grid distribution result with grid context
 * Used to pass grid cell information through the distribution pipeline
 * for grid-aware position modulation
 */
export interface GridDistributionResult {
  shape: any;
  rowIndex: number;
  colIndex: number;
  generationIndex: number;
}
