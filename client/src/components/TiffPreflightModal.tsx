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
import { AlertTriangle, Info } from 'lucide-react';

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
}

interface TiffPreflightModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preflightInfo: TiffPreflightInfo;
  onConfirm: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

export default function TiffPreflightModal({
  open,
  onOpenChange,
  preflightInfo,
  onConfirm,
  onCancel,
}: TiffPreflightModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const hasWarnings = preflightInfo.hasLowDpi || preflightInfo.hasNoBleed || preflightInfo.hasTransparentBackground;
  const hasMemoryLimitation = preflightInfo.isMemoryLimited;
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

        <div className="space-y-4 py-2">
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
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="flex items-center space-x-2 flex-1">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
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
              className="bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={() => onConfirm(dontShowAgain)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {hasMemoryLimitation 
                ? `Export ${preflightInfo.effectiveCount} Image${preflightInfo.effectiveCount > 1 ? 's' : ''}`
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
  backgroundMode: 'transparent' | 'artboard' | 'custom'
): TiffPreflightInfo {
  const baseDpi = 72;
  const dpiScale = artboardDpi / baseDpi;
  const scaledWidth = Math.round(artboardWidth * dpiScale);
  const scaledHeight = Math.round(artboardHeight * dpiScale);
  const pixelsPerImage = scaledWidth * scaledHeight;
  const megapixelsPerImage = pixelsPerImage / 1_000_000;
  const bytesPerImage = pixelsPerImage * 4;
  const memoryPerImageMb = bytesPerImage / (1024 * 1024);
  
  const LIMIT_THRESHOLD_MB = 600;
  const totalMemoryMb = memoryPerImageMb * requestedCount;
  
  let effectiveCount = requestedCount;
  let isMemoryLimited = false;
  
  if (totalMemoryMb > LIMIT_THRESHOLD_MB && requestedCount > 1) {
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
  };
}
