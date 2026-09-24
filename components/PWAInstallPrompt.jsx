'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, PlusSquare, Check } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('PWA Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('PWA Service Worker registration failed:', err);
        });
    }

    // 2. Check if already running in standalone (installed app) mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();

    // 3. Check if user previously dismissed in this session
    const dismissedTime = sessionStorage.getItem('pwa_prompt_dismissed');
    if (dismissedTime) {
      setIsDismissed(true);
    }

    // 4. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 5. Listen for Android / Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setTimeout(() => setIsInstalled(false), 4000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install user choice: ${outcome}`);

    if (outcome === 'accepted') {
      setIsInstallable(false);
      setIsInstalled(true);
      setTimeout(() => setIsInstalled(false), 4000);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  // Do not show if already running as installed standalone app or user dismissed
  if (isStandalone || isDismissed) {
    return null;
  }

  // Success message after installation
  if (isInstalled) {
    return (
      <div className="fixed bottom-5 right-5 left-5 md:left-auto md:max-w-md z-50 bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
        <div className="p-2 rounded-xl bg-white/20">
          <Check className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-extrabold text-sm">App Installed Successfully!</h4>
          <p className="text-xs text-emerald-100">Mutants Academy is now in your phone's apps list.</p>
        </div>
      </div>
    );
  }

  // Android / Chrome / Edge Install Banner
  if (isInstallable) {
    return (
      <div className="fixed bottom-5 right-4 left-4 md:left-auto md:right-6 md:max-w-md z-50 bg-slate-900/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-red-500/30 text-white p-4 rounded-3xl shadow-2xl shadow-red-950/40 animate-in fade-in slide-in-from-bottom-5">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800/90 border border-zinc-700/60 p-1 flex items-center justify-center shrink-0 shadow-lg shadow-black/40 mt-0.5">
            <img src="/icons/icon-192.png" alt="Mutants App Icon" className="w-full h-full object-contain" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-sm uppercase tracking-tight text-white flex items-center gap-1.5">
                Install Mutants App
              </h4>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white p-1 -mr-1 -mt-1 rounded-lg transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Download as a shortcut app on your phone's home screen for fast 1-tap access!
            </p>

            <div className="mt-3 flex items-center gap-2.5">
              <button
                onClick={handleInstallClick}
                className="flex-1 py-2 px-3.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-600/30 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download / Install App
              </button>
              <button
                onClick={handleDismiss}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // iOS Safari "Add to Home Screen" Instructions Banner (Mobile Safari only)
  if (isIOS && !isStandalone) {
    return (
      <div className="fixed bottom-5 right-4 left-4 md:left-auto md:right-6 md:max-w-md z-50 bg-slate-900/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-red-500/30 text-white p-4 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-5">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800/90 border border-zinc-700/60 p-1 flex items-center justify-center shrink-0 shadow-lg shadow-black/40 mt-0.5">
            <img src="/icons/icon-192.png" alt="Mutants App Icon" className="w-full h-full object-contain" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-sm uppercase tracking-tight text-white">
                Install on iPhone / iPad
              </h4>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white p-1 -mr-1 -mt-1 rounded-lg transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Install Mutants Academy on your home screen:
            </p>

            <div className="mt-2.5 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 space-y-1.5 text-xs text-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600/30 text-red-400 flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Tap the <strong>Share</strong> button <Share className="inline w-3.5 h-3.5 mx-0.5 text-blue-400" /> at bottom of Safari</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-600/30 text-red-400 flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Scroll down & tap <strong>Add to Home Screen</strong> <PlusSquare className="inline w-3.5 h-3.5 mx-0.5 text-slate-300" /></span>
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                onClick={handleDismiss}
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
