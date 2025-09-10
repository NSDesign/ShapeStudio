import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Code2 } from 'lucide-react';
import { BatchConfigSettings } from './BatchConfigDialog';

interface ApiCallGeneratorProps {
  batchConfigSettings: BatchConfigSettings;
  className?: string;
}

interface GenerationCountConfig {
  mode: 'fixed' | 'range' | 'incremental';
  fixed?: number;
  min?: number;
  max?: number;
  start?: number;
  increment?: number;
  resetPerBatch?: boolean;
}

interface ApiV2Payload {
  // V1 (existing) parameters
  format?: string;
  quality?: number;
  scale?: number;
  includeBackground?: boolean;
  backgroundColor?: string;
  batchExportCount?: number;
  batchSaveProjectFiles?: boolean;
  packageAsZip?: boolean;
  
  // V2 additions
  generationCount?: GenerationCountConfig;
  modulationValue?: number;
}

export default function ApiCallGenerator({ batchConfigSettings, className = "" }: ApiCallGeneratorProps) {
  const [copied, setCopied] = useState<string | null>(null);

  // Convert current settings to API payload
  const generateApiPayload = (): ApiV2Payload => {
    const payload: ApiV2Payload = {
      // Default V1 parameters (can be customized)
      format: 'png',
      quality: 92,
      scale: 1,
      includeBackground: true,
      backgroundColor: '#1e293b',
      batchExportCount: 10,
      batchSaveProjectFiles: false,
      packageAsZip: false,
    };

    // V2 additions based on current batch config
    const generationCount: GenerationCountConfig = {
      mode: batchConfigSettings.generationCountMode
    };

    if (batchConfigSettings.generationCountMode === 'fixed') {
      generationCount.fixed = batchConfigSettings.generationCountDefine;
    } else if (batchConfigSettings.generationCountMode === 'range') {
      // For range mode, we'll use generationCountDefine as max and assume min is 1
      generationCount.min = 1;
      generationCount.max = batchConfigSettings.generationCountDefine;
    } else if (batchConfigSettings.generationCountMode === 'incremental') {
      generationCount.start = batchConfigSettings.generationCountStartValue;
      generationCount.increment = batchConfigSettings.generationCountIncrement;
      generationCount.resetPerBatch = batchConfigSettings.generationCountResetPerBatch;
    }

    payload.generationCount = generationCount;

    // Add modulation if enabled
    if (batchConfigSettings.generationCountModulationEnabled) {
      payload.modulationValue = batchConfigSettings.generationCountModulationValue;
    }

    return payload;
  };

  const generateCurlCommand = (platform: 'linux' | 'windows'): string => {
    const payload = generateApiPayload();
    const jsonPayload = JSON.stringify(payload, null, 2);
    const baseUrl = 'https://your-published-app.replit.app'; // Will be updated when published
    
    if (platform === 'windows') {
      // Windows cmd/PowerShell format
      const escapedJson = jsonPayload.replace(/"/g, '\\"');
      return `curl -X POST ^
  -H "Content-Type: application/json" ^
  -d "${escapedJson}" ^
  ${baseUrl}/api/export/batch`;
    } else {
      // Linux/Mac bash format
      return `curl -X POST \\
  -H "Content-Type: application/json" \\
  -d '${jsonPayload}' \\
  ${baseUrl}/api/export/batch`;
    }
  };

  const generateN8nConfig = (): object => {
    const payload = generateApiPayload();
    return {
      "node": "HttpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://your-published-app.replit.app/api/export/batch",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "bodyType": "json",
          "jsonBody": JSON.stringify(payload, null, 2)
        },
        "options": {
          "timeout": 30000
        }
      }
    };
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const payload = generateApiPayload();
  const curlLinux = generateCurlCommand('linux');
  const curlWindows = generateCurlCommand('windows');
  const n8nConfig = generateN8nConfig();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
        <Code2 className="h-4 w-4" />
        Generated API Calls (v2)
      </div>
      
      <div className="text-xs text-slate-400">
        Based on your current batch configuration settings. Update the URL after publishing your project.
      </div>

      <Tabs defaultValue="curl-linux" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="curl-linux" className="text-xs">cURL (Linux/Mac)</TabsTrigger>
          <TabsTrigger value="curl-windows" className="text-xs">cURL (Windows)</TabsTrigger>
          <TabsTrigger value="n8n" className="text-xs">n8n HTTP Request</TabsTrigger>
        </TabsList>
        
        <TabsContent value="curl-linux" className="space-y-2 mt-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-medium">Linux/Mac Terminal</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(curlLinux, 'curl-linux')}
              className="gap-1 h-6 px-2 text-xs"
            >
              <Copy className="h-3 w-3" />
              {copied === 'curl-linux' ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <pre className="bg-slate-900 p-3 rounded-lg text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
            {curlLinux}
          </pre>
        </TabsContent>
        
        <TabsContent value="curl-windows" className="space-y-2 mt-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-medium">Windows Command Prompt</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(curlWindows, 'curl-windows')}
              className="gap-1 h-6 px-2 text-xs"
            >
              <Copy className="h-3 w-3" />
              {copied === 'curl-windows' ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <pre className="bg-slate-900 p-3 rounded-lg text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
            {curlWindows}
          </pre>
        </TabsContent>
        
        <TabsContent value="n8n" className="space-y-2 mt-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-medium">n8n HTTP Request Node Configuration</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(JSON.stringify(n8nConfig, null, 2), 'n8n')}
              className="gap-1 h-6 px-2 text-xs"
            >
              <Copy className="h-3 w-3" />
              {copied === 'n8n' ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <pre className="bg-slate-900 p-3 rounded-lg text-xs text-slate-300 overflow-x-auto max-h-32 overflow-y-auto">
            {JSON.stringify(n8nConfig, null, 2)}
          </pre>
        </TabsContent>
      </Tabs>

      {/* Current Settings Summary */}
      <div className="border-t border-slate-600 pt-3">
        <h3 className="text-xs font-medium mb-2 text-slate-300">Current Configuration Summary</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400">Generation Count Mode:</span>
            <span className="ml-1 font-medium">{payload.generationCount?.mode}</span>
          </div>
          {payload.generationCount?.mode === 'fixed' && (
            <div>
              <span className="text-slate-400">Fixed Count:</span>
              <span className="ml-1 font-medium">{payload.generationCount.fixed}</span>
            </div>
          )}
          {payload.generationCount?.mode === 'range' && (
            <>
              <div>
                <span className="text-slate-400">Min Count:</span>
                <span className="ml-1 font-medium">{payload.generationCount.min}</span>
              </div>
              <div>
                <span className="text-slate-400">Max Count:</span>
                <span className="ml-1 font-medium">{payload.generationCount.max}</span>
              </div>
            </>
          )}
          {payload.generationCount?.mode === 'incremental' && (
            <>
              <div>
                <span className="text-slate-400">Start Value:</span>
                <span className="ml-1 font-medium">{payload.generationCount.start}</span>
              </div>
              <div>
                <span className="text-slate-400">Increment:</span>
                <span className="ml-1 font-medium">{payload.generationCount.increment}</span>
              </div>
              <div>
                <span className="text-slate-400">Reset Per Batch:</span>
                <span className="ml-1 font-medium">{payload.generationCount.resetPerBatch ? 'Yes' : 'No'}</span>
              </div>
            </>
          )}
          {payload.modulationValue !== undefined && (
            <div>
              <span className="text-slate-400">Modulation Value:</span>
              <span className="ml-1 font-medium">{payload.modulationValue}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}