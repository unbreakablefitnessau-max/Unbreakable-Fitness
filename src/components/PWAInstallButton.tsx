import React, { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF4D1C] font-semibold text-white transition-colors hover:bg-[#E03A0C] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer ${
          compact ? 'min-h-[44px] px-3 text-xs' : 'min-h-[44px] px-4 py-2.5 text-sm'
        }`}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        <span>Install App</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#141923] font-semibold text-[#090D16] dark:text-slate-100 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer ${
          compact ? 'min-h-[44px] px-3 text-xs' : 'min-h-[44px] px-4 py-2.5 text-sm'
        }`}
      >
        <Smartphone className="h-4 w-4 text-[#FF4D1C]" aria-hidden="true" />
        <span>{isIOS ? 'Install on iOS' : 'Get Mobile App'}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#141923] border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  id="pwa-guide-title"
                  className="font-display text-2xl font-bold tracking-tight text-[#090D16] dark:text-white"
                >
                  Install Unbeatable Fitness AU
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Add to your iPhone or Android home screen for full-screen mobile access.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Close install instructions"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E14] p-4">
                <p className="text-sm font-semibold text-[#090D16] dark:text-white">
                  iPhone & iPad (Safari)
                </p>
                <ol className="mt-2 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <span className="font-mono-tabular text-xs font-semibold text-[#FF4D1C]">01.</span>
                    <span>
                      Tap the <Share className="inline h-4 w-4 mx-0.5 text-slate-700 dark:text-slate-300" /> Share icon in Safari.
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-mono-tabular text-xs font-semibold text-[#FF4D1C]">02.</span>
                    <span>Scroll and tap Add to Home Screen.</span>
                  </li>
                </ol>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E14] p-4">
                <p className="text-sm font-semibold text-[#090D16] dark:text-white">
                  Android (Chrome)
                </p>
                <ol className="mt-2 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2">
                    <span className="font-mono-tabular text-xs font-semibold text-[#FF4D1C]">01.</span>
                    <span>Open the Chrome menu (three dots) in the top right.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-mono-tabular text-xs font-semibold text-[#FF4D1C]">02.</span>
                    <span>Tap Install app or Add to Home screen.</span>
                  </li>
                </ol>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-[#090D16] dark:bg-white text-sm font-semibold text-white dark:text-[#090D16] transition-colors hover:opacity-90 cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
