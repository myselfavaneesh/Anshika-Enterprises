import { useState, useEffect } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState<boolean>(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const checkIsStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
      return isStandaloneMedia || isIOSStandalone;
    };

    if (checkIsStandalone()) {
      setIsInstalled(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    if (iosDevice && !checkIsStandalone()) {
      setIsInstallable(true);
    }

    // Listen for Chrome / Android / Desktop beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setIsInstallable(false);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error('PWA install prompt error:', err);
      }
    } else {
      // Show modal instructions for iOS or if automatic prompt was consumed/blocked
      setShowInstructionsModal(true);
    }
  };

  return {
    isInstallable,
    isInstalled,
    isIOS,
    deferredPrompt,
    showInstructionsModal,
    setShowInstructionsModal,
    triggerInstall,
  };
}
