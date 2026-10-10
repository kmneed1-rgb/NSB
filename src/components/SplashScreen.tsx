import React from 'react';

/**
 * App boot loading screen — school logo + ghoomta hua spinner.
 * Initial cloud sync (syncReady) ke doran dikhta hai; phir ghayab.
 * Sirf ek naya component hai — kisi mojooda feature ko touch nahi karta.
 */
export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[10005] bg-slate-950 flex flex-col items-center justify-center gap-6 select-none">
      <img
        src="/logo.png"
        alt="NSB1 School"
        className="h-24 w-auto object-contain animate-pulse"
        referrerPolicy="no-referrer"
      />
      <div
        className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white animate-spin"
        role="status"
        aria-label="Loading"
      />
      <p className="text-[11px] font-black uppercase tracking-[0.35em] text-white/60">
        Loading…
      </p>
    </div>
  );
}
