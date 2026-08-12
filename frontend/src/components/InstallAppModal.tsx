import React from 'react';
import { Download, X, Share, PlusSquare, Smartphone, CheckCircle } from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  isIOS: boolean;
  hasDeferredPrompt: boolean;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  onInstall,
  isIOS,
  hasDeferredPrompt,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Smartphone className="h-6 w-6 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Install App</h3>
              <p className="text-xs text-emerald-200">Anshika Enterprises</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-slate-700 dark:text-slate-200">
          <div className="flex items-start space-x-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-900 dark:text-emerald-300 text-sm">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>Install our web app to access full features directly from your mobile home screen with faster performance!</p>
          </div>

          {isIOS ? (
            /* iOS Instructions */
            <div className="space-y-3 pt-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Follow these 3 quick steps in Safari:
              </p>

              <div className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 font-bold text-sm flex-shrink-0">
                  1
                </div>
                <div className="flex-1 text-sm">
                  Tap the <span className="font-semibold text-emerald-700 dark:text-emerald-400">Share icon</span> <Share className="inline h-4 w-4 mx-1" /> in Safari's bottom toolbar.
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 font-bold text-sm flex-shrink-0">
                  2
                </div>
                <div className="flex-1 text-sm">
                  Scroll down and tap <span className="font-semibold text-emerald-700 dark:text-emerald-400">Add to Home Screen</span> <PlusSquare className="inline h-4 w-4 mx-1" />.
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 font-bold text-sm flex-shrink-0">
                  3
                </div>
                <div className="flex-1 text-sm">
                  Tap <span className="font-semibold text-emerald-700 dark:text-emerald-400">Add</span> in the top right corner.
                </div>
              </div>
            </div>
          ) : (
            /* Android / Desktop Instructions */
            <div className="space-y-3 pt-1">
              {hasDeferredPrompt ? (
                <div className="text-center py-2 space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Click the button below to directly install the app on your device.
                  </p>
                  <button
                    onClick={() => {
                      onInstall();
                      onClose();
                    }}
                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-xl shadow-lg hover:shadow-emerald-700/25 transition-all"
                  >
                    <Download className="h-5 w-5" />
                    <span>Install App Now</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    How to install manually:
                  </p>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 font-bold text-sm flex-shrink-0">
                      1
                    </div>
                    <div>
                      Open browser menu (3 dots <span className="font-bold">⋮</span> in top right corner).
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 font-bold text-sm flex-shrink-0">
                      2
                    </div>
                    <div>
                      Select <span className="font-semibold text-emerald-700 dark:text-emerald-400">"Install app"</span> or <span className="font-semibold text-emerald-700 dark:text-emerald-400">"Add to Home screen"</span>.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
