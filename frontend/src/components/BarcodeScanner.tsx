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

  useEffect(() => {
    let mounted = true;

    if (isScanning && videoRef.current) {
      codeReaderRef.current = new BrowserMultiFormatReader();
      codeReaderRef.current.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
        if (!mounted) return;
        
        if (result) {
          playBeep();
          onScan(result.getText());
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
  }, [isScanning, onScan]);

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
    <div className="space-y-4">
      <div className="w-full max-w-sm mx-auto overflow-hidden rounded-md border bg-black relative">
        <video 
          ref={videoRef} 
          className="w-full h-auto"
          autoPlay 
          muted 
          playsInline
        />
        {/* Visual indicator / crosshair for better scanning UX */}
        <div className="absolute inset-0 border-2 border-red-500 opacity-50 m-8 rounded pointer-events-none"></div>
      </div>
      <Button 
        type="button" 
        variant="destructive" 
        onClick={stopScanning}
        className="w-full"
      >
        Stop Scanning
      </Button>
    </div>
  );
};
