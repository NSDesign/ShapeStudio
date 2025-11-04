/**
 * Utility functions for embedding DPI metadata into image exports
 */

/**
 * Convert DPI to pixels per meter for PNG pHYs chunk
 */
function dpiToPixelsPerMeter(dpi: number): number {
  // 1 inch = 0.0254 meters
  // pixels per meter = DPI / 0.0254
  return Math.round(dpi / 0.0254);
}

/**
 * Add pHYs chunk to PNG data URL to embed DPI metadata
 * PNG structure: Signature (8 bytes) + IHDR chunk + optional chunks + IDAT chunks + IEND chunk
 * We insert pHYs chunk after IHDR and before IDAT
 */
export function embedDPIInPNG(dataURL: string, dpi: number): string {
  // Convert data URL to Uint8Array
  const base64 = dataURL.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // PNG signature: 137 80 78 71 13 10 26 10
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  
  // Verify this is a PNG
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== pngSignature[i]) {
      console.warn('Not a valid PNG file, returning original data URL');
      return dataURL;
    }
  }

  // Find IHDR chunk end (should be at byte 33 for most PNGs)
  // IHDR structure: length(4) + 'IHDR'(4) + data(13) + CRC(4) = 25 bytes
  let ihdrEnd = 8; // Start after signature
  
  // Read chunk length
  const ihdrLength = (bytes[ihdrEnd] << 24) | (bytes[ihdrEnd + 1] << 16) | 
                     (bytes[ihdrEnd + 2] << 8) | bytes[ihdrEnd + 3];
  
  // Skip to end of IHDR: length(4) + type(4) + data + CRC(4)
  ihdrEnd += 4 + 4 + ihdrLength + 4;

  // Create pHYs chunk
  const pixelsPerMeter = dpiToPixelsPerMeter(dpi);
  
  // pHYs chunk structure:
  // - Pixels per unit, X axis: 4 bytes
  // - Pixels per unit, Y axis: 4 bytes  
  // - Unit specifier: 1 byte (1 = meter)
  const physData = new Uint8Array(9);
  
  // X pixels per meter (big-endian)
  physData[0] = (pixelsPerMeter >> 24) & 0xFF;
  physData[1] = (pixelsPerMeter >> 16) & 0xFF;
  physData[2] = (pixelsPerMeter >> 8) & 0xFF;
  physData[3] = pixelsPerMeter & 0xFF;
  
  // Y pixels per meter (big-endian)
  physData[4] = (pixelsPerMeter >> 24) & 0xFF;
  physData[5] = (pixelsPerMeter >> 16) & 0xFF;
  physData[6] = (pixelsPerMeter >> 8) & 0xFF;
  physData[7] = pixelsPerMeter & 0xFF;
  
  // Unit specifier (1 = meter)
  physData[8] = 1;

  // Create chunk: length(4) + type(4) + data(9) + CRC(4)
  const chunkLength = physData.length;
  const chunkType = new Uint8Array([112, 72, 89, 115]); // 'pHYs' in ASCII
  
  // Calculate CRC for type + data
  const crcData = new Uint8Array(4 + physData.length);
  crcData.set(chunkType, 0);
  crcData.set(physData, 4);
  const crc = calculateCRC(crcData);
  
  // Build complete pHYs chunk
  const physChunk = new Uint8Array(4 + 4 + physData.length + 4);
  let offset = 0;
  
  // Length (big-endian)
  physChunk[offset++] = (chunkLength >> 24) & 0xFF;
  physChunk[offset++] = (chunkLength >> 16) & 0xFF;
  physChunk[offset++] = (chunkLength >> 8) & 0xFF;
  physChunk[offset++] = chunkLength & 0xFF;
  
  // Type 'pHYs'
  physChunk.set(chunkType, offset);
  offset += 4;
  
  // Data
  physChunk.set(physData, offset);
  offset += physData.length;
  
  // CRC
  physChunk[offset++] = (crc >> 24) & 0xFF;
  physChunk[offset++] = (crc >> 16) & 0xFF;
  physChunk[offset++] = (crc >> 8) & 0xFF;
  physChunk[offset++] = crc & 0xFF;

  // Combine: signature + IHDR + pHYs + rest of PNG
  const result = new Uint8Array(bytes.length + physChunk.length);
  result.set(bytes.subarray(0, ihdrEnd), 0);
  result.set(physChunk, ihdrEnd);
  result.set(bytes.subarray(ihdrEnd), ihdrEnd + physChunk.length);

  // Convert back to data URL
  const resultBase64 = btoa(String.fromCharCode.apply(null, Array.from(result)));
  return `data:image/png;base64,${resultBase64}`;
}

/**
 * CRC-32 calculation for PNG chunks
 */
function calculateCRC(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  
  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    crc = crc ^ byte;
    
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xEDB88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Note: JPEG DPI embedding requires modifying JFIF or EXIF markers
 * This is complex as we need to parse and modify the binary structure
 * For now, we return the original data URL
 * DPI information should be stored in the project file instead
 */
export function embedDPIInJPEG(dataURL: string, dpi: number): string {
  // JPEG DPI embedding is complex and requires parsing JFIF/EXIF markers
  // For browser compatibility, we skip this and rely on project file for DPI info
  console.log(`Note: JPEG DPI metadata (${dpi} DPI) not embedded in browser export. DPI info is stored in project file.`);
  return dataURL;
}

/**
 * Embed DPI metadata based on format
 */
export function embedDPI(dataURL: string, format: string, dpi: number): string {
  if (format === 'png') {
    return embedDPIInPNG(dataURL, dpi);
  } else if (format === 'jpg' || format === 'jpeg') {
    return embedDPIInJPEG(dataURL, dpi);
  }
  
  // Other formats don't support DPI metadata in browser exports
  return dataURL;
}
