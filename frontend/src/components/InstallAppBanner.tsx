import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface InstallAppBannerProps {
  onInstall: () => void;
  isInstalled: boolean;
}

export const InstallAppBanner: React.FC<InstallAppBannerProps> = ({ onInstall, isInstalled }) => {
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('anshika_pwa_banner_dismissed') === 'true';
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('anshika_pwa_banner_dismissed', 'true');
  };

  if (isInstalled || dismissed) return null;

  return (
    <div className="md:hidden fixed top-2 left-2 right-2 z-40 bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl border border-slate-700 backdrop-blur-md animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-between space-x-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2 bg-emerald-600 rounded-xl flex-shrink-0">
            <Smartphone className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold truncate">Install Anshika App</h4>
            <p className="text-[11px] text-slate-300 truncate">Quick access from home screen</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <button
            onClick={onInstall}
            className="flex items-center space-x-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Install</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
