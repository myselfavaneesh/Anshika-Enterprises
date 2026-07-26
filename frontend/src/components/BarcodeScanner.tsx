import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Camera, X, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  buttonText?: string;
}

export const BarcodeScanner = ({ onScan, buttonText = "Scan QR/Barcode" }: BarcodeScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<any>(null);
  const isNative = Capacitor.isNativePlatform();

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      setTimeout(() => oscillator.stop(), 150);
    } catch (_) {}
  };

  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  // ─── NATIVE Android Scanner (scan() — simple one-shot) ───────────
  const startNativeScanner = async () => {
    setError(null);
    try {
      const { BarcodeScanner: MLKit } = await import('@capacitor-mlkit/barcode-scanning');

      // 1. Check & request camera permission
      const permResult = await MLKit.checkPermissions();
      if (permResult.camera !== 'granted') {
        const req = await MLKit.requestPermissions();
        if (req.camera !== 'granted') {
          setError('Camera permission denied. Enable in Settings.');
          return;
        }
      }

      setIsScanning(true);

      // 2. One-shot scan — opens camera, scans, returns result, closes camera
      const { barcodes } = await MLKit.scan({ formats: [] });

      setIsScanning(false);

      if (barcodes && barcodes.length > 0) {
        const text = barcodes[0].rawValue ?? barcodes[0].displayValue ?? '';
        if (text) {
          playBeep();
          onScanRef.current(text);
        }
      }

    } catch (err: any) {
      console.error('Native scanner error:', err);
      // User cancelled — not an error
      if (err?.message?.includes('cancel') || err?.message?.includes('Cancel')) {
        setIsScanning(false);
        return;
      }
      setError('Scanner error: ' + (err?.message ?? 'Unknown'));
      setIsScanning(false);
    }
  };

  // ─── WEB Browser Scanner (zxing fallback) ────────────────────────
  useEffect(() => {
    if (isNative || !isScanning || !videoRef.current) return;

    let mounted = true;
    const lastScannedRef = { current: '' };
    const lastTimeRef = { current: 0 };

    const startWebScanner = async () => {
      try {
        const { BrowserMultiFormatReader, NotFoundException } = await import('@zxing/library');
        codeReaderRef.current = new BrowserMultiFormatReader();
        await codeReaderRef.current.decodeFromVideoDevice(
          null,
          videoRef.current!,
          (result: any, err: any) => {
            if (!mounted) return;
            if (result) {
              const text = result.getText();
              const now = Date.now();
              if (text === lastScannedRef.current && now - lastTimeRef.current < 2000) return;
              lastScannedRef.current = text;
              lastTimeRef.current = now;
              playBeep();
              onScanRef.current(text);
            }
            if (err && !(err instanceof NotFoundException)) { /* ignore */ }
          }
        );
      } catch (err: any) {
        if (mounted) setError('Camera error: ' + (err?.message ?? 'Cannot access camera'));
      }
    };

    startWebScanner();
    return () => {
      mounted = false;
      codeReaderRef.current?.reset();
    };
  }, [isScanning, isNative]);

  const stopWebScanner = () => {
    codeReaderRef.current?.reset();
    setIsScanning(false);
  };

  // ─── RENDER ──────────────────────────────────────────────────────

  // Idle button
  if (!isScanning) {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => isNative ? startNativeScanner() : setIsScanning(true)}
          className="w-full flex items-center gap-2"
        >
          <Camera className="h-4 w-4" />
          {buttonText}
        </Button>
        {error && <p className="text-xs text-red-500 text-center px-2">{error}</p>}
      </div>
    );
  }

  // Native scanning → MLKit handles its own UI, show spinner + cancel
  if (isNative) {
    return (
      <div className="space-y-3 w-full text-center">
        <div className="flex flex-col items-center gap-2 py-6 rounded-lg border bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-slate-700">Opening camera scanner…</p>
          <p className="text-xs text-slate-400">Point at QR code or barcode</p>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  // Web scanning → show video element
  return (
    <div className="space-y-4 w-full">
      <div className="w-full max-w-xs sm:max-w-sm mx-auto overflow-hidden rounded-md border bg-black relative aspect-square">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay muted playsInline
        />
        <div className="absolute inset-8 border-2 border-red-500/50 rounded-lg pointer-events-none shadow-[0_0_0_4000px_rgba(0,0,0,0.5)]">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-red-500/50" />
        </div>
        <div className="absolute top-5 left-5 w-5 h-5 border-t-2 border-l-2 border-green-400 pointer-events-none" />
        <div className="absolute top-5 right-5 w-5 h-5 border-t-2 border-r-2 border-green-400 pointer-events-none" />
        <div className="absolute bottom-5 left-5 w-5 h-5 border-b-2 border-l-2 border-green-400 pointer-events-none" />
        <div className="absolute bottom-5 right-5 w-5 h-5 border-b-2 border-r-2 border-green-400 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      <Button
        type="button"
        variant="destructive"
        onClick={stopWebScanner}
        className="w-full max-w-xs sm:max-w-sm mx-auto flex items-center gap-2"
      >
        <X className="h-4 w-4" /> Stop Scanning
      </Button>
    </div>
  );
};
