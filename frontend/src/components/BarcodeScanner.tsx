import { useEffect, useRef, useState, useCallback } from 'react';
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
  const scannerRef = useRef<any>(null);
  const scannerContainerId = useRef(`scanner-${Date.now()}`);
  const isNative = Capacitor.isNativePlatform();

  const playBeep = useCallback(() => {
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
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 150);
    } catch (_) {}
  }, []);

  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  // Deduplicate scans — prevent same code triggering repeatedly
  const lastScannedRef = useRef('');
  const lastTimeRef = useRef(0);

  const handleDecodedResult = useCallback((decodedText: string) => {
    const now = Date.now();
    if (decodedText === lastScannedRef.current && now - lastTimeRef.current < 2500) return;
    lastScannedRef.current = decodedText;
    lastTimeRef.current = now;
    playBeep();
    onScanRef.current(decodedText);
  }, [playBeep]);

  // ─── Cleanup scanner on unmount ────────────────────────────────────
  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState?.();
        // State 2 = SCANNING, State 3 = PAUSED
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (_) {
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // ─── NATIVE Android Scanner (MLKit — one-shot) ────────────────────
  const startNativeScanner = async () => {
    setError(null);
    try {
      const { BarcodeScanner: MLKit } = await import('@capacitor-mlkit/barcode-scanning');

      // Check & request camera permission
      const permResult = await MLKit.checkPermissions();
      if (permResult.camera !== 'granted') {
        const req = await MLKit.requestPermissions();
        if (req.camera !== 'granted') {
          setError('Camera permission denied. Enable in Settings.');
          return;
        }
      }

      setIsScanning(true);

      // Specify common formats for faster detection instead of scanning ALL formats
      const { BarcodeFormat } = await import('@capacitor-mlkit/barcode-scanning');
      const { barcodes } = await MLKit.scan({
        formats: [
          BarcodeFormat.QrCode,     // QR_CODE
          BarcodeFormat.Ean13,      // EAN_13
          BarcodeFormat.Ean8,       // EAN_8
          BarcodeFormat.UpcA,       // UPC_A
          BarcodeFormat.UpcE,       // UPC_E
          BarcodeFormat.Code128,    // CODE_128
          BarcodeFormat.Code39,     // CODE_39
          BarcodeFormat.Itf,        // ITF
        ],
      });

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

  // ─── WEB Browser Scanner (html5-qrcode — much faster than zxing) ──
  useEffect(() => {
    if (isNative || !isScanning) return;

    let mounted = true;

    const startWebScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        // Wait a tick for DOM to render the container
        await new Promise(r => setTimeout(r, 50));

        const containerEl = document.getElementById(scannerContainerId.current);
        if (!containerEl || !mounted) return;

        const scanner = new Html5Qrcode(scannerContainerId.current, {
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 15,                    // High FPS for faster detection
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1.0,
            disableFlip: false,
          },
          (decodedText: string) => {
            if (!mounted) return;
            handleDecodedResult(decodedText);
          },
          () => {
            // Ignore scan failures (no code found in frame)
          }
        );

      } catch (err: any) {
        console.error('Web scanner error:', err);
        if (mounted) {
          setError('Camera error: ' + (err?.message ?? 'Cannot access camera'));
        }
      }
    };

    startWebScanner();

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [isScanning, isNative, handleDecodedResult, stopScanner]);

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

  // Web scanning → html5-qrcode renders into this container
  return (
    <div className="space-y-4 w-full">
      <div className="w-full max-w-xs sm:max-w-sm mx-auto overflow-hidden rounded-md border bg-black relative">
        <div
          id={scannerContainerId.current}
          className="w-full"
          style={{ minHeight: '300px' }}
        />
        {/* Corner markers overlay */}
        <div className="absolute inset-8 pointer-events-none">
          <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-green-400" />
          <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-green-400" />
          <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-green-400" />
          <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-green-400" />
        </div>
      </div>
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      <Button
        type="button"
        variant="destructive"
        onClick={stopScanner}
        className="w-full max-w-xs sm:max-w-sm mx-auto flex items-center gap-2"
      >
        <X className="h-4 w-4" /> Stop Scanning
      </Button>
    </div>
  );
};
