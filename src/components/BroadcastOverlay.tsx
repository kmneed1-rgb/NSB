import React, { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { UserSession } from '../types';
import { BroadcastMessage, markBroadcastSeen, getSeenBroadcastIds } from '../lib/broadcast';
import { getUserKey } from '../lib/notificationUtils';
import { playBellTone } from '../lib/notifySound';

interface BroadcastOverlayProps {
  userSession: UserSession | null;
  broadcast: BroadcastMessage | null | undefined;
}

/**
 * Full-screen BLACK overlay with WHITE text — Developer (admin) ki announcement.
 * Sirf target role ko dikhti hai, sirf EK DAFA (OK = acknowledged).
 * `active=false` (stop) par foran ghayab. Baqi kisi cheez ko touch nahi karta.
 *
 * Dismissal do tareeqon se track hoti hai:
 *  1. localStorage "seen" list (refresh/relogin ke baad bhi ek hi dafa).
 *  2. local `dismissedId` state (isi session mein foran ghayab).
 * Naya broadcast (naya id) phir dikhega — purana kabhi nahi.
 */
export default function BroadcastOverlay({ userSession, broadcast }: BroadcastOverlayProps) {
  const userKey = userSession ? getUserKey(userSession) : '';
  const role = userSession?.role;
  const id = broadcast?.id;

  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const targetOk =
    !!broadcast && (broadcast.target === 'all' || broadcast.target === role);
  const seenOk = !!id && !getSeenBroadcastIds(userKey).includes(id);
  const notDismissed = !id || dismissedId !== id;
  const visible = !!broadcast && broadcast.active && targetOk && seenOk && notDismissed;

  // Appear hote hi tone bajao (best-effort — browser autoplay policy ka ehtiram).
  useEffect(() => {
    if (visible) {
      try { playBellTone(); } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, id]);

  if (!visible || !broadcast) return null;

  const handleOk = () => {
    if (id) {
      markBroadcastSeen(userKey, id);
      setDismissedId(id);
    }
  };

  return (
    <div className="fixed inset-0 z-[10003] bg-black text-white flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
      <div className="max-w-lg w-full space-y-6">
        <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto">
          <Megaphone size={36} className="text-white" strokeWidth={2.5} />
        </div>

        {broadcast.title && (
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight leading-tight">
            {broadcast.title}
          </h1>
        )}

        {broadcast.sentByName && (
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/50">
            From {broadcast.sentByName}
          </p>
        )}

        <p className="text-sm sm:text-base text-white/90 leading-relaxed whitespace-pre-wrap break-words">
          {broadcast.message}
        </p>

        <button
          type="button"
          onClick={handleOk}
          className="mt-4 w-full py-4 bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer"
        >
          OK
        </button>
      </div>
    </div>
  );
}
