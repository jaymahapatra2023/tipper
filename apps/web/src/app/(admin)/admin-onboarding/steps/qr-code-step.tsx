'use client';

import { useState } from 'react';
import { QrCode, Download, FileText, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface QrCodeStepProps {
  onComplete: () => void;
}

export function QrCodeStep({ onComplete }: QrCodeStepProps) {
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function generateAll() {
    try {
      setError('');
      setGenerating(true);
      const res = await api.post<{ generated: number }>('/admin/qr/regenerate-all');
      if (res.success) {
        setGenerated(true);
      } else {
        setError(res.error?.message || 'Failed to generate QR codes');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setGenerating(false);
    }
  }

  async function downloadFile(format: 'zip' | 'pdf') {
    try {
      setDownloading(format);
      const blob = await api.downloadBlob(`/admin/qr/download/${format}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-codes.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError(`Failed to download ${format.toUpperCase()}`);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <QrCode className="h-8 w-8" />
        </div>
        <p className="text-sm text-muted-foreground">
          Generate QR codes for all your rooms. Guests scan these to leave tips.
        </p>
      </div>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      {!generated ? (
        <Button onClick={generateAll} disabled={generating} className="w-full">
          {generating ? 'Generating QR Codes...' : 'Generate All QR Codes'}
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">QR codes generated!</span>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => downloadFile('zip')}
              disabled={downloading !== null}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloading === 'zip' ? 'Downloading...' : 'Download ZIP'}
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadFile('pdf')}
              disabled={downloading !== null}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              {downloading === 'pdf' ? 'Downloading...' : 'Download PDF'}
            </Button>
          </div>
        </div>
      )}

      <Button onClick={onComplete} className="w-full">
        Finish Setup
      </Button>
    </div>
  );
}
