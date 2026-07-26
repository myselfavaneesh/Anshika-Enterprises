import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Button } from './ui/button';
import { Camera } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  buttonText?: string;
}

export const BarcodeScanner = ({ onScan, buttonText = "Scan QR/Barcode" }: BarcodeScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // 800Hz
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // volume
      
      oscillator.start();
      setTimeout(() => oscillator.stop(), 100); // 100ms beep
    } catch (e) {
      // Ignore audio errors
    }
  };

  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const lastScannedRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  useEffect(() => {
    let mounted = true;

    if (isScanning && videoRef.current) {
      codeReaderRef.current = new BrowserMultiFormatReader();
      codeReaderRef.current.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
        if (!mounted) return;
        
        if (result) {
          const text = result.getText();
          const now = Date.now();
          if (text === lastScannedRef.current && now - lastScannedTimeRef.current < 2000) {
            return; // debounce same barcode
          }
          lastScannedRef.current = text;
          lastScannedTimeRef.current = now;

          playBeep();
          onScanRef.current(text);
        }
        if (err && !(err instanceof NotFoundException)) {
          // Ignore not found exceptions, log others
          // console.error(err);
        }
      });
    }

    return () => {
      mounted = false;
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, [isScanning]);

  const stopScanning = () => {
    setIsScanning(false);
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
  };

  if (!isScanning) {
    return (
      <Button 
        type="button" 
        variant="outline" 
        onClick={() => setIsScanning(true)}
        className="w-full flex items-center gap-2"
      >
        <Camera className="h-4 w-4" />
        {buttonText}
      </Button>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="w-full max-w-xs sm:max-w-sm mx-auto overflow-hidden rounded-md border bg-black relative aspect-square">
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover"
          autoPlay 
          muted 
          playsInline
        />
        {/* Visual indicator / crosshair for better scanning UX */}
        <div className="absolute inset-8 border-2 border-red-500/50 rounded-lg pointer-events-none shadow-[0_0_0_4000px_rgba(0,0,0,0.5)]">
           <div className="absolute top-1/2 left-0 w-full h-[1px] bg-red-500/50 shadow-[0_0_4px_rgba(255,0,0,0.5)]"></div>
        </div>
      </div>
      <Button 
        type="button" 
        variant="destructive" 
        onClick={stopScanning}
        className="w-full max-w-xs sm:max-w-sm mx-auto block"
      >
        Stop Scanning
      </Button>
    </div>
  );
};
