import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Download, Image, FileImage } from "lucide-react";
import { ImageExporter, ImageFormat, ExportOptions } from '../lib/imageExport';
import { Shape, ShapeGroupClass } from '../lib/shapes';
import { CanvasSettings } from '../lib/shapeTypes';
import { useToast } from "@/hooks/use-toast";

interface ExportDialogProps {
  shapes: Shape[];
  groups: ShapeGroupClass[];
  canvasSettings: CanvasSettings;
}

export default function ExportDialog({ shapes, groups, canvasSettings }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState<ImageFormat>('png');
  const [quality, setQuality] = useState(92);
  const [scale, setScale] = useState(1);
  const [customWidth, setCustomWidth] = useState(canvasSettings.width);
  const [customHeight, setCustomHeight] = useState(canvasSettings.height);
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [includeBackground, setIncludeBackground] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState('#1e293b');
  
  const { toast } = useToast();

  const supportedFormats: { value: ImageFormat; label: string; description: string }[] = [
    { value: 'png' as ImageFormat, label: 'PNG', description: 'Lossless with transparency' },
    { value: 'jpeg' as ImageFormat, label: 'JPEG', description: 'Lossy compression, smaller files' },
    { value: 'webp' as ImageFormat, label: 'WebP', description: 'Modern format, excellent compression' },
    { value: 'avif' as ImageFormat, label: 'AVIF', description: 'Next-gen format, best compression' },
    { value: 'svg' as ImageFormat, label: 'SVG', description: 'Vector format, scalable' },
    { value: 'bmp' as ImageFormat, label: 'BMP', description: 'Uncompressed bitmap' }
  ].filter(f => ImageExporter.isFormatSupported(f.value));

  const getQualityLabel = () => {
    if (quality >= 90) return 'Highest';
    if (quality >= 80) return 'High';
    if (quality >= 60) return 'Medium';
    if (quality >= 40) return 'Low';
    return 'Lowest';
  };

  const getScaleLabel = () => {
    if (scale === 1) return '1x (Standard)';
    if (scale === 2) return '2x (Retina)';
    if (scale === 3) return '3x (Super Retina)';
    if (scale === 4) return '4x (Ultra High DPI)';
    return `${scale}x`;
  };

  const handleExport = async () => {
    if (shapes.length === 0 && groups.length === 0) {
      toast({
        title: "No content to export",
        description: "Add some shapes to the canvas before exporting.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);

    try {
      const exporter = new ImageExporter();
      
      const options: ExportOptions = {
        format,
        quality: quality / 100,
        scale,
        width: useCustomSize ? customWidth : canvasSettings.width,
        height: useCustomSize ? customHeight : canvasSettings.height,
        backgroundColor: includeBackground ? backgroundColor : 'transparent',
        includeBackground
      };

      const blob = await exporter.exportImage(shapes, groups, canvasSettings, options);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `shape-editor-${timestamp}.${ImageExporter.getFileExtension(format)}`;
      
      await ImageExporter.downloadImage(blob, filename);
      
      toast({
        title: "Export successful",
        description: `Image saved as ${filename}`,
      });
      
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const supportsQuality = ['jpeg', 'webp', 'avif'].includes(format);
  const supportsTransparency = ['png', 'webp', 'avif', 'svg'].includes(format);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-[var(--surface)] border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center text-white">
            <FileImage className="w-5 h-5 mr-2" />
            Export Image
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-300">Format</Label>
            <Select value={format} onValueChange={(value) => setFormat(value as ImageFormat)}>
              <SelectTrigger className="bg-[var(--surface-light)] border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--surface-light)] border-slate-600">
                {supportedFormats.map(f => (
                  <SelectItem key={f.value} value={f.value}>
                    <div>
                      <div className="font-medium">{f.label}</div>
                      <div className="text-xs text-slate-400">{f.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quality Slider */}
          {supportsQuality && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-300">
                Quality: {quality}% ({getQualityLabel()})
              </Label>
              <Slider
                value={[quality]}
                onValueChange={([value]) => setQuality(value)}
                min={10}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          )}

          {/* Scale Factor */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-300">
              Scale: {getScaleLabel()}
            </Label>
            <Slider
              value={[scale]}
              onValueChange={([value]) => setScale(value)}
              min={1}
              max={4}
              step={1}
              className="w-full"
            />
            <div className="text-xs text-slate-400">
              Higher scales create larger, higher resolution images
            </div>
          </div>

          {/* Custom Size */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                checked={useCustomSize}
                onCheckedChange={setUseCustomSize}
              />
              <Label className="text-sm font-medium text-slate-300">Custom Size</Label>
            </div>
            
            {useCustomSize && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-400">Width</Label>
                  <Input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(parseInt(e.target.value) || 0)}
                    className="bg-[var(--surface-light)] border-slate-600 text-white"
                    min={1}
                    max={8000}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Height</Label>
                  <Input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(parseInt(e.target.value) || 0)}
                    className="bg-[var(--surface-light)] border-slate-600 text-white"
                    min={1}
                    max={8000}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Background Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                checked={includeBackground}
                onCheckedChange={setIncludeBackground}
              />
              <Label className="text-sm font-medium text-slate-300">Include Background</Label>
            </div>
            
            {includeBackground && (
              <div className="flex items-center space-x-3">
                <Label className="text-xs text-slate-400">Color:</Label>
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-10 h-8 rounded border border-slate-600 bg-transparent"
                />
                <span className="text-xs text-slate-400">{backgroundColor}</span>
              </div>
            )}
            
            {!supportsTransparency && !includeBackground && (
              <div className="text-xs text-amber-400">
                ⚠ {format.toUpperCase()} doesn't support transparency. Background will be white.
              </div>
            )}
          </div>

          {/* Export Button */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
            <Button
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={isExporting}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="bg-[var(--editor-primary)] hover:bg-blue-700 text-white"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}