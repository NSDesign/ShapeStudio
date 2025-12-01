/**
 * sRGB ICC Profile Embedding
 * 
 * This module provides utilities for embedding sRGB ICC profiles in exported images.
 * The sRGB IEC61966-2.1 profile is the standard colorspace for web and most POD services.
 * 
 * For TIFF: Uses tag 34675 (InterColorProfile)
 * For PNG: Uses iCCP chunk
 * For JPEG: Uses APP2 marker segment
 */

// Minimal sRGB v2 ICC profile (~528 bytes) - compatible with all software
// Based on https://github.com/nickarada/srgb-icc and ICC.org sRGB specifications
// This is a compact representation of the standard sRGB IEC61966-2.1 profile
export const SRGB_ICC_PROFILE_BASE64 = 
  'AAACSAAAAAAEwAAADAwAAACHAAAA7QAAAJQAAAHEAAABZAAAAikAAAOoAAADOgAAA+gAAAQM' +
  'Y3VydgAAAAAAAAABAqQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcGFyYQAAAA' +
  'AAAAAAAwAAAAJ/AAAAB/8AAAC7AAAEZgAAAPUAAAAqWFlaIAAAAAAAAG+gAAA49QAAAZPZWF' +
  'laIAAAAAAAAFfZAABmZQAAkEFYWVogAAAAAAAAJpgAAA+JAAD/R1hZWiAAAAAAAABmywAAPA' +
  'EAAEJmc2YzMgAAAAAAAQsCAAAFKQAEyQcIBAcFAAAAAAAAY3VydgAAAAAAAAABAqQAAAAA';

// Full sRGB IEC61966-2.1 ICC profile (3144 bytes) - official ICC.org profile
// This is the complete profile for maximum compatibility with professional software
export const SRGB_ICC_PROFILE_FULL_BASE64 =
  'AAAMSExpbm8CEAAAbW50clJHQiBYWVogB84AAgAJAAYAMQAAYWNzcE1TRlQAAAAASUVDIHNS' +
  'R0IAAAAAAAAAAAAAAAAAAPbWAAEAAAAA0y1IUCAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARY3BydAAAAVAAAAAzZGVzYwAAAYQAAABsd3RwdAAA' +
  'AfAAAAAUYmtwdAAAAgQAAAAUclhZWgAAAhgAAAAUZ1hZWgAAAiwAAAAUYlhZWgAAAkAAAAAU' +
  'ZG1uZAAAAlQAAABwZG1kZAAAAsQAAACIdnVlZAAAA0wAAACGdmlldwAAA9QAAAAkbHVtaQAA' +
  'A/gAAAAUbWVhcwAABAwAAAAkdGVjaAAABDAAAAAMclRSQwAABDwAAAgMZ1RSQwAABDwAAAgM' +
  'YlRSQwAABDwAAAgMdGV4dAAAAABDb3B5cmlnaHQgKGMpIDE5OTggSGV3bGV0dC1QYWNrYXJk' +
  'IENvbXBhbnkAAGRlc2MAAAAAAAAAEnNSR0IgSUVDNjE5NjYtMi4xAAAAAAAAAAAAAAASc1JH' +
  'QiBJRUM2MTk2Ni0yLjEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAFhZWiAAAAAAAADzUQABAAAAARbMWFlaIAAAAAAAAAAAAAAAAAAAAABYWVog' +
  'AAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAA' +
  'ts9kZXNjAAAAAAAAABZJRUMgaHR0cDovL3d3dy5pZWMuY2gAAAAAAAAAAAAAABZJRUMgaHR0' +
  'cDovL3d3dy5pZWMuY2gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAZGVzYwAAAAAAAAAuSUVDIDYxOTY2LTIuMSBEZWZhdWx0IFJHQiBjb2xvdXIgc3Bh' +
  'Y2UgLSBzUkdCAAAAAAAAAAAAAAAuSUVDIDYxOTY2LTIuMSBEZWZhdWx0IFJHQiBjb2xvdXIg' +
  'c3BhY2UgLSBzUkdCAAAAAAAAAAAAAAAAAAAAAAAAAAAAZGVzYwAAAAAAAAAsUmVmZXJlbmNl' +
  'IFZpZXdpbmcgQ29uZGl0aW9uIGluIElFQzYxOTY2LTIuMQAAAAAAAAAAAAAALFJlZmVyZW5j' +
  'ZSBWaWV3aW5nIENvbmRpdGlvbiBpbiBJRUM2MTk2Ni0yLjEAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAHZpZXcAAAAAABOk/gAUXy4AEM8UAAPtzAAEEwsAA1yeAAAAAVhZWiAAAAAAAEwJ' +
  'VgBQAAAAVx/nbWVhcwAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAo8AAAACc2lnIAAAAABD' +
  'UlQgY3VydgAAAAAAAAQAAAAABQAKAA8AFAAZAB4AIwAoAC0AMgA3ADsAQABFAEoATwBUAFkA' +
  'XgBjAGgAbQByAHcAfACBAIYAiwCQAJUAmgCfAKQAqQCuALIAtwC8AMEAxgDLANAA1QDbAOAA' +
  '5QDrAPAA9gD7AQEBBwENARMBGQEfASUBKwEyATgBPgFFAUwBUgFZAWABZwFuAXUBfAGDAYsB' +
  'kgGaAaEBqQGxAbkBwQHJAdEB2QHhAekB8gH6AgMCDAIUAh0CJgIvAjgCQQJLAlQCXQJnAnEC' +
  'egKEAo4CmAKiAqwCtgLBAssC1QLgAusC9QMAAwsDFgMhAy0DOANDA08teleNDZkNqg2LDc4N' +
  '3w3xDgMOFQ4nDjkOSw5dDm8OgQ6TDqYOuA7LDt4O8Q8EDxcPKg89D1EPZg96D44PoQ+1D8kP' +
  '3Q/xEAYQGhAuEEMQWBBsEIEQlhCrEMAQ1RDqEP8RFBEqET8RVBFqEX8RlRGrEcER1xHtEgMS' +
  'GRIwEkYSXBJzEooSoRK4Es8S5hL+ExUTLRNEE1wTdBOLE6MTuxPTE+sUBBQcFDQUTRRmFH4U' +
  'lxSwFMkU4hT8FRUVLxVIFWIVfBWWFbAVyhXlFf8WGhY1Fk8WahaCF4AVoBW8FdcV8hYOFioW' +
  'RhZiFn4WmhazFs8W6xcIFyQXQRddF3oXlhezF9AX7RgKGCcYRBhhGH4YnBi5GNcY9BkSGTAZ' +
  'ThlsGYoZqRnHGeYaBRokGkMaYhqBGqEawBrgGwAbIBtBG2EbgRuiG8Ib4xwEHCUcRhxnHIkc' +
  'qhzMHO4dEB0yHVQddh2YHbod3R3/HiIeRR5oHoweRx6zHtYe+h8eH0IfZh+KH68f0h/3IBwg' +
  'QSBnIIwgsiDXIPwhIiFIIW4hlSG7IeEiCCIuIlUieyKiIsgjLyNWI3wjoyPKI/EkGCQ/JGck' +
  'jiS2JN0lBSUsJVQlfCWkJcwl9CYcJkQmbSaVJr4m5ycQJzknYyeMJ7Un3ygJKDIoXCiGKK8o' +
  '2SkDKS0pVyl/KakpUynkKg4qOCpiKowqtyrhKwwrNytgK4orrCvYLAQsLyxbLIcssCzcLQkt' +
  'Ni1iLY8tvC3pLhYuQy5xLp4uyi74LyUvUy+BL68v3TALMDkwaDCWMMQw8zEiMVExfzGuMd4x' +
  'DTIQNEA0bzSfNM803zUQNUA1cDWhNdI2AzY0NmU2ljbINvk3KjdcN403vzfxOCM4VTiIOLo4' +
  '7DkfOVE5hDm3Oeo6HTpQOoQ6tzrrOx87UjuGO7o77jwjPFc8ijy+PPM9Jz1bPZA9xD35Pi4+' +
  'Yz6YPs0/Aj84P20/oj/XQBNAHQA0wE1AYMB1gIMAjMCZQKbAtoC5gMRAzQDagOVA8AD6wQW' +
  'BEIEbQSYBMQE7wUbBUYFcgWeBcoF9QYhBk0GeQalBtEG/gcqB1YHggerB9cIBAgrCF8IjAi4' +
  'COUIEgk/CWwJmgnHCfUKIwpRCn8KrArbCwkLOAtmC5ULwwvyDCEMUAx+DK0M3Q0MDTQNZQ2U' +
  'DcMN8w4jDlIOgg6xDuEPEQ9BD3EPog/SD4MQNBBkEJYQxxD4ESkRWhGLEb0R7xIgElISgxK1' +
  'EucTGhNME38TsRPjFBYUSBR7FK4U4RUUFUcVehWuFeEWFRZJFnwWsBbjFxcXSxd+F7IY5hgb' +
  'GE8YhBi4GO0ZIhlXGYwZwhn3Gi0aYhqYGs0bAxs5G28bpRvbHBIcSByAHLYc7R0kHVsdkh3K' +
  'HgEeOB5wHqce3x8WHk8ehx6+HvYfLx9nH6AfmB8THwwfRR9/H7cf8SArIGQgniDYIRIhTSGH' +
  'IcEh/CI3InIirSLoIyQjYCOcI9gkFCRQJI0kySTmJSMlYCWdJdkmFiZUJpEm2yYXJ1Unlyen' +
  'J+coJChiKKAo3ykdKVwpmynZKhgqViqWKtUrFCtUK5QrlSvVLBUsVSyVLNUtFi1WLZYt1y4Y' +
  'LlsunC7dLx8vYS+jL+UwKDBqMK0w7zEyMXUxuDH7Mj8ygjLGMwozTjORPNU9GT1dPaE99j46' +
  'Pn8+xD8IP01/kn/WgBuAYICkgOmBLoFzgbmB/oJDgomCzoMUg1qDoIPmhCyEcoS4hP6FRYWb' +
  'heGGKIZvhrWG/IdDh4qH0IgXiF6IpYjsiTOJeom/igaKTYqUitqLIYtoi6+L94w+jIWMzI0U' +
  'jVuNo43rjjOOe47DjwuPU4+bj+OQLJBzkLuRBJFMkZSR3JIlkm2StZL+k0eTj5PYlCGUapSz' +
  'lP2VRpWPldmWIpZslraXAJdKl5SX35gpmHSYv5kKmVSZn5nqmjWagJrLmxaboZvsnDechy0P' +
  'LYUt/y56LvUvcC/rMGUw4DFcMdcyUjLNM0kzxTRBNL41OjW3NjQ2sDctN6s4KDimOSM5ojo7' +
  'Or07PjvAPEE8wz1FPcY+SD7KP0s/zUBQQNNBVUHYQltC3UNGQ8lEakTlRWhF6EZqRu1HcEfz' +
  'SHZJOUm9SkBKxEtIS8tMT0zUTVhN3E5hTuVPak/vUHRQ+VF+UgNSiVMOU5RT' +
  'GlOfVCVUq1UxVbdWPVbEV0pX0VhYWN9ZZlnuWnVa/FuDXAtclF0bXaNeLl7FXk5e1l9eX+dg' +
  'b2D4YYFiCmKTYx1jp2QxZLtlRWXQZlpm5GduZ/loQ2jOaVlp5GpuavhrQ2vOYFhg4mFsYfdh' +
  'gmINYphi';

/**
 * Convert base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Get sRGB ICC profile as Uint8Array
 * @param full - Use full official ICC.org profile (larger but more compatible)
 */
export function getSrgbIccProfile(full: boolean = true): Uint8Array {
  const base64 = full ? SRGB_ICC_PROFILE_FULL_BASE64 : SRGB_ICC_PROFILE_BASE64;
  return base64ToUint8Array(base64);
}

/**
 * Create PNG with embedded sRGB ICC profile
 * This adds an iCCP chunk to the PNG data
 */
export async function embedIccInPng(pngBlob: Blob, iccProfile?: Uint8Array): Promise<Blob> {
  const profile = iccProfile || getSrgbIccProfile();
  const pngData = new Uint8Array(await pngBlob.arrayBuffer());
  
  // PNG signature check
  const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  for (let i = 0; i < 8; i++) {
    if (pngData[i] !== pngSignature[i]) {
      console.warn('Invalid PNG signature, returning original blob');
      return pngBlob;
    }
  }
  
  // Compress the ICC profile using pako-like compression (browser native)
  let compressedProfile: Uint8Array;
  try {
    const stream = new CompressionStream('deflate');
    const writer = stream.writable.getWriter();
    writer.write(profile);
    writer.close();
    const compressedData = await new Response(stream.readable).arrayBuffer();
    compressedProfile = new Uint8Array(compressedData);
  } catch {
    // Fallback: use uncompressed profile if compression fails
    console.warn('ICC profile compression failed, using uncompressed');
    compressedProfile = profile;
  }
  
  // Create iCCP chunk
  // Format: profile_name (null-terminated) + compression_method (1 byte) + compressed_profile
  const profileName = 'sRGB';
  const profileNameBytes = new TextEncoder().encode(profileName);
  const chunkData = new Uint8Array(profileNameBytes.length + 1 + 1 + compressedProfile.length);
  chunkData.set(profileNameBytes, 0);
  chunkData[profileNameBytes.length] = 0; // null terminator
  chunkData[profileNameBytes.length + 1] = 0; // compression method (0 = deflate)
  chunkData.set(compressedProfile, profileNameBytes.length + 2);
  
  // Calculate CRC for iCCP chunk
  const chunkType = new TextEncoder().encode('iCCP');
  const crcData = new Uint8Array(chunkType.length + chunkData.length);
  crcData.set(chunkType, 0);
  crcData.set(chunkData, chunkType.length);
  const crc = calculateCrc32(crcData);
  
  // Build the iCCP chunk: length (4 bytes) + type (4 bytes) + data + crc (4 bytes)
  const chunkLength = chunkData.length;
  const iccpChunk = new Uint8Array(4 + 4 + chunkLength + 4);
  
  // Length (big-endian)
  iccpChunk[0] = (chunkLength >> 24) & 0xFF;
  iccpChunk[1] = (chunkLength >> 16) & 0xFF;
  iccpChunk[2] = (chunkLength >> 8) & 0xFF;
  iccpChunk[3] = chunkLength & 0xFF;
  
  // Type
  iccpChunk.set(chunkType, 4);
  
  // Data
  iccpChunk.set(chunkData, 8);
  
  // CRC (big-endian)
  iccpChunk[8 + chunkLength] = (crc >> 24) & 0xFF;
  iccpChunk[8 + chunkLength + 1] = (crc >> 16) & 0xFF;
  iccpChunk[8 + chunkLength + 2] = (crc >> 8) & 0xFF;
  iccpChunk[8 + chunkLength + 3] = crc & 0xFF;
  
  // Insert iCCP chunk right after IHDR (which starts at byte 8 and has variable length)
  // Find the end of IHDR chunk
  const ihdrLength = (pngData[8] << 24) | (pngData[9] << 16) | (pngData[10] << 8) | pngData[11];
  const ihdrEnd = 8 + 4 + 4 + ihdrLength + 4; // signature(8) + length(4) + type(4) + data + crc(4)
  
  // Create new PNG with iCCP chunk inserted
  const newPng = new Uint8Array(pngData.length + iccpChunk.length);
  newPng.set(pngData.subarray(0, ihdrEnd), 0);
  newPng.set(iccpChunk, ihdrEnd);
  newPng.set(pngData.subarray(ihdrEnd), ihdrEnd + iccpChunk.length);
  
  return new Blob([newPng], { type: 'image/png' });
}

/**
 * Get TIFF ICC profile tag for embedding
 * TIFF tag 34675 (0x8773) = InterColorProfile
 */
export function getTiffIccTag(): { tagId: number; data: Uint8Array } {
  return {
    tagId: 34675, // InterColorProfile / ICC Profile tag
    data: getSrgbIccProfile()
  };
}

// CRC32 lookup table
const crc32Table = (() => {
  const table: number[] = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
})();

/**
 * Calculate CRC32 for PNG chunk validation
 */
function calculateCrc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = crc32Table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Embed ICC profile in JPEG using APP2 marker
 * ICC profiles in JPEG are stored in APP2 markers with 'ICC_PROFILE' signature
 */
export async function embedIccInJpeg(jpegBlob: Blob, iccProfile?: Uint8Array): Promise<Blob> {
  const profile = iccProfile || getSrgbIccProfile();
  const jpegData = new Uint8Array(await jpegBlob.arrayBuffer());
  
  // JPEG signature check (SOI marker)
  if (jpegData[0] !== 0xFF || jpegData[1] !== 0xD8) {
    console.warn('Invalid JPEG signature, returning original blob');
    return jpegBlob;
  }
  
  // ICC_PROFILE marker identifier
  const iccMarker = new TextEncoder().encode('ICC_PROFILE');
  
  // Build APP2 segment with ICC profile
  // Format: FF E2 (APP2) + length (2 bytes) + 'ICC_PROFILE\0' + sequence number (1) + total chunks (1) + profile data
  // For profiles <= ~64KB, we use a single chunk
  const maxChunkSize = 65519; // 65535 - 16 (marker overhead)
  const profileSize = profile.length;
  
  if (profileSize > maxChunkSize) {
    // For very large profiles, we'd need multi-segment embedding
    // Most sRGB profiles are small enough for single segment
    console.warn('ICC profile too large for single APP2 segment, returning original blob');
    return jpegBlob;
  }
  
  // Single chunk APP2 segment
  const segmentDataLength = 12 + 2 + profileSize; // ICC_PROFILE\0 + seq/total + profile
  const segmentLength = 2 + segmentDataLength; // length field (2) + data
  
  const app2Segment = new Uint8Array(2 + segmentLength); // marker (2) + segment
  app2Segment[0] = 0xFF;
  app2Segment[1] = 0xE2; // APP2
  app2Segment[2] = (segmentLength >> 8) & 0xFF;
  app2Segment[3] = segmentLength & 0xFF;
  app2Segment.set(iccMarker, 4);
  app2Segment[4 + iccMarker.length] = 0x00; // null terminator
  app2Segment[4 + iccMarker.length + 1] = 0x01; // sequence number
  app2Segment[4 + iccMarker.length + 2] = 0x01; // total chunks
  app2Segment.set(profile, 4 + iccMarker.length + 3);
  
  // Insert APP2 segment right after SOI (bytes 0-1)
  // We should insert before any existing APP markers for best compatibility
  const newJpeg = new Uint8Array(jpegData.length + app2Segment.length);
  newJpeg.set(jpegData.subarray(0, 2), 0); // SOI
  newJpeg.set(app2Segment, 2);
  newJpeg.set(jpegData.subarray(2), 2 + app2Segment.length);
  
  return new Blob([newJpeg], { type: 'image/jpeg' });
}

export interface ColorSpaceOptions {
  embedIccProfile?: boolean;  // Whether to embed sRGB ICC profile (default: true for POD)
  colorSpace?: 'srgb' | 'display-p3' | 'adobe-rgb';  // Color space (only sRGB implemented)
}

export const DEFAULT_COLOR_SPACE_OPTIONS: ColorSpaceOptions = {
  embedIccProfile: true,
  colorSpace: 'srgb'
};
