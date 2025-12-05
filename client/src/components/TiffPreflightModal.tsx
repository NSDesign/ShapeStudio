import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Info, Server, Loader2, Palette } from 'lucide-react';

interface TiffPreflightInfo {
  requestedCount: number;
  effectiveCount: number;
  megapixelsPerImage: number;
  memoryPerImageMb: number;
  totalMemoryMb: number;
  artboardDpi: number;
  canvasWidth: number;
  canvasHeight: number;
  isMemoryLimited: boolean;
  hasLowDpi: boolean;
  hasNoBleed: boolean;
  hasTransparentBackground: boolean;
  requiresServerExport?: boolean;
  serverExportReason?: string | null;
  estimatedDuration?: number;
  is16Bit?: boolean;
}

interface TiffPreflightModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preflightInfo: TiffPreflightInfo;
  onConfirm: (dontShowAgain: boolean) => void;
  onCancel: () => void;
  isExporting?: boolean;
  flattenToRgb?: boolean;
  onFlattenToRgbChange?: (value: boolean) => void;
  matteColor?: string;
  onMatteColorChange?: (value: string) => void;
}

export default function TiffPreflightModal({
  open,
  onOpenChange,
  preflightInfo,
  onConfirm,
  onCancel,
  isExporting = false,
  flattenToRgb = false,
  onFlattenToRgbChange,
  matteColor = '#ffffff',
  onMatteColorChange,
}: TiffPreflightModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const hasWarnings = preflightInfo.hasLowDpi || preflightInfo.hasNoBleed || preflightInfo.hasTransparentBackground;
  const hasMemoryLimitation = preflightInfo.isMemoryLimited && !preflightInfo.requiresServerExport;
  const hasServerExport = preflightInfo.requiresServerExport;
  const hasCriticalIssue = hasMemoryLimitation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            {hasCriticalIssue ? (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            ) : (
              <Info className="w-5 h-5 text-blue-400" />
            )}
            TIFF Export Summary
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Review your export settings before proceeding.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 py-2 pr-4">
            <div className="p-3 bg-slate-800 rounded-lg space-y-2">
              <div className="text-sm font-medium text-slate-300">Export Details</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-slate-400">Canvas Size:</span>
                <span className="text-slate-200">{preflightInfo.canvasWidth} × {preflightInfo.canvasHeight} px</span>
                
                <span className="text-slate-400">Resolution:</span>
                <span className="text-slate-200">{preflightInfo.artboardDpi} DPI</span>
                
                <span className="text-slate-400">Image Size:</span>
                <span className="text-slate-200">{preflightInfo.megapixelsPerImage.toFixed(1)} megapixels</span>
                
                <span className="text-slate-400">Memory per Image:</span>
                <span className="text-slate-200">~{preflightInfo.memoryPerImageMb.toFixed(0)} MB</span>
              </div>
            </div>

            {hasServerExport && (
              <div className="p-3 bg-purple-900/30 border border-purple-500/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-purple-300 font-medium text-sm">
                  <Server className="w-4 h-4" />
                  Server Processing Required
                </div>
                <p className="text-xs text-purple-200/80">
                  {preflightInfo.serverExportReason || 'This export requires server-side processing for optimal quality.'}
                </p>
                {preflightInfo.is16Bit && (
                  <p className="text-xs text-purple-200/80">
                    16-bit TIFF output will be generated with embedded sRGB ICC profile for professional print quality.
                  </p>
                )}
                {preflightInfo.estimatedDuration && (
                  <p className="text-xs text-purple-200/60">
                    Estimated time: ~{Math.ceil(preflightInfo.estimatedDuration / 1000)} seconds per image
                  </p>
                )}
              </div>
            )}

            {hasMemoryLimitation && (
              <div className="p-3 bg-amber-900/30 border border-amber-500/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-medium text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Batch Size Limited
                </div>
                <p className="text-xs text-amber-200/80">
                  Due to browser memory limits (~600 MB), only <strong>{preflightInfo.effectiveCount}</strong> of your 
                  requested <strong>{preflightInfo.requestedCount}</strong> images will be exported.
                </p>
                <p className="text-xs text-amber-200/60">
                  Estimated total: ~{preflightInfo.totalMemoryMb.toFixed(0)} MB
                </p>
              </div>
            )}

            {!hasMemoryLimitation && preflightInfo.requestedCount > 1 && (
              <div className="p-3 bg-slate-800 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Images to Export:</span>
                  <span className="text-slate-200 font-medium">{preflightInfo.effectiveCount}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-slate-500">Est. Total Memory:</span>
                  <span className="text-slate-400">~{preflightInfo.totalMemoryMb.toFixed(0)} MB</span>
                </div>
              </div>
            )}

            {hasWarnings && (
              <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-blue-300 font-medium text-sm">
                  <Info className="w-4 h-4" />
                  Print-Ready Considerations
                </div>
                <ul className="text-xs text-blue-200/80 space-y-1 list-disc list-inside">
                  {preflightInfo.hasLowDpi && (
                    <li>DPI ({preflightInfo.artboardDpi}) is below 300 - not ideal for professional printing</li>
                  )}
                  {preflightInfo.hasNoBleed && (
                    <li>Bleed is not enabled - may cause issues at print edges</li>
                  )}
                  {preflightInfo.hasTransparentBackground && (
                    <li>Background is transparent - some print services require solid background</li>
                  )}
                </ul>
              </div>
            )}

            {preflightInfo.hasTransparentBackground && onFlattenToRgbChange && (
              <div className="p-3 bg-slate-800 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-slate-300 font-medium text-sm">
                  <Palette className="w-4 h-4" />
                  RGB Optimization
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor="flatten-to-rgb" className="text-xs text-slate-300 cursor-pointer">
                      Flatten to RGB (drop transparency)
                    </Label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ~10-20% smaller files, removes alpha channel
                    </p>
                  </div>
                  <Switch
                    id="flatten-to-rgb"
                    checked={flattenToRgb}
                    onCheckedChange={onFlattenToRgbChange}
                    disabled={isExporting}
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>
                {flattenToRgb && onMatteColorChange && (
                  <div className="flex items-center gap-3 pt-1">
                    <Label className="text-xs text-slate-400">Matte Color:</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={matteColor}
                        onChange={(e) => onMatteColorChange(e.target.value)}
                        disabled={isExporting}
                        className="w-8 h-8 rounded cursor-pointer border border-slate-600 bg-transparent"
                      />
                      <span className="text-xs text-slate-400 font-mono">{matteColor}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="flex items-center space-x-2 flex-1">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
              disabled={isExporting}
              className="border-slate-500 data-[state=checked]:bg-blue-600"
            />
            <Label htmlFor="dont-show-again" className="text-xs text-slate-400 cursor-pointer">
              Don't show this again
            </Label>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isExporting}
              className="bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={() => onConfirm(dontShowAgain)}
              disabled={isExporting}
              className={hasServerExport 
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
              }
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {hasServerExport ? 'Processing...' : 'Exporting...'}
                </>
              ) : hasMemoryLimitation 
                ? `Export ${preflightInfo.effectiveCount} Image${preflightInfo.effectiveCount > 1 ? 's' : ''}`
                : hasServerExport
                  ? 'Start Server Export'
                  : 'Continue Export'
              }
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function calculateTiffPreflightInfo(
  artboardWidth: number,
  artboardHeight: number,
  artboardDpi: number,
  requestedCount: number,
  bleedEnabled: boolean,
  backgroundMode: 'transparent' | 'artboard' | 'custom',
  is16Bit: boolean = false,
  scale: number = 1
): TiffPreflightInfo {
  // Scale is applied directly to artboard dimensions (which are already in pixels)
  // No separate dpiScale needed - the scale parameter already includes DPI adjustment
  // when auto-scale-from-DPI is enabled (effectiveExportScale = dpi/72)
  const scaledWidth = Math.round(artboardWidth * scale);
  const scaledHeight = Math.round(artboardHeight * scale);
  const pixelsPerImage = scaledWidth * scaledHeight;
  const megapixelsPerImage = pixelsPerImage / 1_000_000;
  const bytesPerPixel = is16Bit ? 8 : 4;
  const bytesPerImage = pixelsPerImage * bytesPerPixel;
  const memoryPerImageMb = bytesPerImage / (1024 * 1024);
  
  const LIMIT_THRESHOLD_MB = 600;
  const MAX_CANVAS_DIMENSION = 32767;
  const MAX_CANVAS_PIXELS = 268435456;
  const SERVER_MEMORY_THRESHOLD_MB = 500;
  const totalMemoryMb = memoryPerImageMb * requestedCount;
  
  let requiresServerExport = false;
  let serverExportReason: string | null = null;
  
  if (scaledWidth > MAX_CANVAS_DIMENSION || scaledHeight > MAX_CANVAS_DIMENSION) {
    requiresServerExport = true;
    serverExportReason = `Canvas dimension ${Math.max(scaledWidth, scaledHeight)}px exceeds browser limit of ${MAX_CANVAS_DIMENSION}px`;
  } else if (pixelsPerImage > MAX_CANVAS_PIXELS) {
    requiresServerExport = true;
    serverExportReason = `Total pixels (${(pixelsPerImage / 1000000).toFixed(1)}M) exceeds browser limit of ${(MAX_CANVAS_PIXELS / 1000000).toFixed(0)}M`;
  } else if (memoryPerImageMb > SERVER_MEMORY_THRESHOLD_MB) {
    requiresServerExport = true;
    serverExportReason = `Estimated memory (${memoryPerImageMb.toFixed(0)}MB) exceeds browser threshold of ${SERVER_MEMORY_THRESHOLD_MB}MB`;
  } else if (is16Bit) {
    requiresServerExport = true;
    serverExportReason = '16-bit TIFF requires server-side processing for proper bit depth';
  }
  
  const baseDurationMs = 5000;
  const pixelFactor = pixelsPerImage / (3000 * 4000);
  const estimatedDuration = Math.ceil(baseDurationMs * Math.max(1, pixelFactor));
  
  let effectiveCount = requestedCount;
  let isMemoryLimited = false;
  
  if (!requiresServerExport && totalMemoryMb > LIMIT_THRESHOLD_MB && requestedCount > 1) {
    effectiveCount = Math.max(1, Math.floor(LIMIT_THRESHOLD_MB / memoryPerImageMb));
    isMemoryLimited = effectiveCount < requestedCount;
  }
  
  return {
    requestedCount,
    effectiveCount,
    megapixelsPerImage,
    memoryPerImageMb,
    totalMemoryMb: memoryPerImageMb * effectiveCount,
    artboardDpi,
    canvasWidth: scaledWidth,
    canvasHeight: scaledHeight,
    isMemoryLimited,
    hasLowDpi: artboardDpi < 300,
    hasNoBleed: !bleedEnabled,
    hasTransparentBackground: backgroundMode === 'transparent',
    requiresServerExport,
    serverExportReason,
    estimatedDuration: requiresServerExport ? estimatedDuration : undefined,
    is16Bit,
  };
}
