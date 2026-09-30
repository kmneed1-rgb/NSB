import React, { useState } from 'react';
import { toast } from 'sonner';
import { CalendarClock, FileText, KeyRound, LogOut, Power, Shield, ToggleLeft, ToggleRight, Wallet, Wifi } from 'lucide-react';
import { AppSettings, Role, UserSession } from '../types';
import {
  getGeminiApiKey, isPortalEnabled, isSubscriptionActive,
  isRoleLoginEnabled, LOGIN_CONTROL_ROLES, LOGIN_CONTROL_LABELS, LoginControlRole,
} from '../lib/appControl';
import { testGeminiConnection } from '../lib/geminiPaper';

interface DeveloperDashboardProps {
  userSession: UserSession;
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onLogout: () => void;
}

export default function DeveloperDashboard({
  userSession,
  appSettings,
  setAppSettings,
  onLogout,
}: DeveloperDashboardProps) {
  const [keyDraft, setKeyDraft] = useState(appSettings.geminiApiKey || '');
  const [testing, setTesting] = useState(false);
  const [expiryDraft, setExpiryDraft] = useState(appSettings.subscriptionExpiry || '');

  const paperOn = appSettings.enablePaperGenerator !== false;
  const salaryOn = appSettings.enableTeacherSalary !== false;
  const portalOn = isPortalEnabled(appSettings);
  const subActive = isSubscriptionActive(appSettings);

  const toggle = (field: 'enablePaperGenerator' | 'enableTeacherSalary', value: boolean) => {
    setAppSettings(prev => ({ ...prev, [field]: value }));
    toast.success(value ? 'Feature turned on' : 'Feature turned off');
  };

  const togglePortal = (value: boolean) => {
    setAppSettings(prev => ({ ...prev, portalEnabled: value }));
    toast.success(value ? 'Portal ONLINE — users portal kholein ge.' : 'Portal OFFLINE — sab users block ho jayein ge.');
  };

  /** Role-wise login switch (student/teacher/coordinator/principal). */
  const toggleRoleLogin = (role: LoginControlRole, value: boolean) => {
    setAppSettings(prev => ({
      ...prev,
      loginControl: { ...(prev.loginControl || {}), [role]: value },
    }));
    toast.success(`${LOGIN_CONTROL_LABELS[role]} ${value ? 'ALLOWED — login chalega.' : 'BLOCKED — login band ho gaya.'}`);
  };

  /** Sab roles ek saath ON/OFF (developer login is se mutasir nahi hota). */
  const setAllRoleLogins = (value: boolean) => {
    setAppSettings(prev => ({
      ...prev,
      loginControl: { student: value, teacher: value, coordinator: value, principal: value },
    }));
    toast.success(value ? 'Sab logins ALLOWED.' : 'Sab logins BLOCKED (developer login chalta rahega).');
  };

  const allLoginOn = LOGIN_CONTROL_ROLES.every(r => isRoleLoginEnabled(appSettings, r as Role));
  const allLoginOff = LOGIN_CONTROL_ROLES.every(r => !isRoleLoginEnabled(appSettings, r as Role));

  const saveSubscription = () => {
    const value = expiryDraft.trim();
    if (value && Number.isNaN(new Date(value).getTime())) {
      toast.error('Sahi tareekh (YYYY-MM-DD) select karein.');
      return;
    }
    setAppSettings(prev => ({ ...prev, subscriptionExpiry: value }));
    toast.success(value ? `Subscription ${value} tak active.` : 'Subscription expiry hata di gayi.');
  };

  const expireSubscription = () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const value = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    setExpiryDraft(value);
    setAppSettings(prev => ({ ...prev, subscriptionExpiry: value }));
    toast.success('Subscription expire kar diya — portal ab OFFLINE.');
  };

  const saveKey = () => {
    setAppSettings(prev => ({ ...prev, geminiApiKey: keyDraft.trim() }));
    toast.success('Gemini API key saved.');
  };

  const testKey = async () => {
    const key = keyDraft.trim() || getGeminiApiKey({ ...appSettings, geminiApiKey: keyDraft });
    if (!key) {
      toast.error('Pehle Gemini API key paste karein.');
      return;
    }
    setTesting(true);
    try {
      await testGeminiConnection(key);
      setAppSettings(prev => ({ ...prev, geminiApiKey: key }));
      toast.success('Gemini connection OK.');
    } catch (err: any) {
      toast.error(err?.message || 'Gemini test failed.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30">
            <Shield size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-400">Developer Control</p>
            <h1 className="text-lg font-black uppercase tracking-tight">{userSession.name}</h1>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-500"
        >
          <LogOut size={14} /> Exit
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <p className="text-sm text-slate-400">
          School app yahan nahi khulti. Yahan se modules on/off karein. Paper generator Gemini API ke baghair nahi chalega.
        </p>

        {/* ===== PORTAL ON/OFF + MONTHLY SUBSCRIPTION ===== */}
        <section className="grid md:grid-cols-2 gap-4">
          <article className={`border p-5 space-y-4 ${portalOn ? 'border-emerald-500/40 bg-slate-900' : 'border-rose-500/50 bg-rose-950/30'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Power size={16} className={portalOn ? 'text-emerald-400' : 'text-rose-400'} />
                <h2 className="text-sm font-black uppercase tracking-widest">Portal On / Off</h2>
              </div>
              <button
                type="button"
                onClick={() => togglePortal(!portalOn)}
                className={portalOn ? 'text-emerald-300' : 'text-rose-300'}
                aria-label="Toggle portal online offline"
              >
                {portalOn ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-slate-600" />}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              OFF karte hi sab users (principal, teacher, student) portal band dekhenge. Developer login hamesha chalta rahega.
            </p>
            <p className={`text-[10px] font-black uppercase tracking-widest ${portalOn ? 'text-emerald-400' : 'text-rose-400'}`}>
              {portalOn ? 'Portal Online' : 'Portal Offline'}
            </p>
          </article>

          <article className={`border p-5 space-y-4 ${subActive ? 'border-sky-500/40 bg-slate-900' : 'border-amber-500/50 bg-amber-950/30'}`}>
            <div className="flex items-center gap-2">
              <CalendarClock size={16} className={subActive ? 'text-sky-400' : 'text-amber-400'} />
              <h2 className="text-sm font-black uppercase tracking-widest">Monthly Subscription</h2>
            </div>
            <p className="text-xs text-slate-400">
              Expiry date set karein. Date guzar jaye to portal apne aap OFFLINE ho jayega (login par message).
            </p>
            <input
              type="date"
              value={expiryDraft}
              onChange={(e) => setExpiryDraft(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-700 text-sm font-mono outline-none"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveSubscription}
                className="px-4 py-2 bg-sky-500 text-slate-950 text-xs font-black uppercase tracking-widest"
              >
                Save expiry
              </button>
              <button
                type="button"
                onClick={expireSubscription}
                className="px-4 py-2 border border-amber-500/60 text-amber-300 text-xs font-black uppercase tracking-widest"
              >
                Expire now
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() + 1);
                  const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  setExpiryDraft(value);
                  setAppSettings(prev => ({ ...prev, subscriptionExpiry: value }));
                  toast.success(`Subscription 1 mahine ke liye renew (${value}).`);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-black uppercase tracking-widest"
              >
                Renew +1 month
              </button>
            </div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${subActive ? 'text-sky-400' : 'text-amber-400'}`}>
              {subActive
                ? (appSettings.subscriptionExpiry ? `Active until ${appSettings.subscriptionExpiry}` : 'Active — no expiry set')
                : `Expired on ${appSettings.subscriptionExpiry}`}
            </p>
          </article>
        </section>

        {/* ===== LOGIN CONTROL — role-wise login switches ===== */}
        <article className="border border-slate-800 bg-slate-900 p-5 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-indigo-400" />
              <h2 className="text-sm font-black uppercase tracking-widest">Login Control</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAllRoleLogins(true)}
                disabled={allLoginOn}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
              >
                Allow All
              </button>
              <button
                type="button"
                onClick={() => setAllRoleLogins(false)}
                disabled={allLoginOff}
                className="px-3 py-1.5 border border-rose-500/60 text-rose-300 text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
              >
                Block All
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Kisi bhi role ka login band kar dein. Band role Auth attempt se pehle block hota hai —
            pehle se logged-in user ko bhi live block screen milegi. Developer login is se mutasir nahi hota.
          </p>

          <div className="space-y-2">
            {LOGIN_CONTROL_ROLES.map((role) => {
              const on = isRoleLoginEnabled(appSettings, role as Role);
              return (
                <div key={role} className="flex items-center justify-between gap-3 border border-slate-800 bg-slate-950 p-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black uppercase tracking-widest">{LOGIN_CONTROL_LABELS[role]}</p>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${on ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {on ? 'Allowed' : 'Blocked'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleRoleLogin(role, !on)}
                    className={on ? 'text-emerald-300' : 'text-rose-300'}
                    aria-label={`Toggle ${role} login`}
                  >
                    {on ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-slate-600" />}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] uppercase tracking-widest text-slate-500">
            Developer login: always allowed (lockout safety)
          </p>
        </article>

        <section className="grid md:grid-cols-2 gap-4">
          <article className="border border-slate-800 bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-indigo-400" />
                <h2 className="text-sm font-black uppercase tracking-widest">AI Paper Generator</h2>
              </div>
              <button
                type="button"
                onClick={() => toggle('enablePaperGenerator', !paperOn)}
                className="text-indigo-300"
                aria-label="Toggle paper generator"
              >
                {paperOn ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-slate-600" />}
              </button>
            </div>
            <p className="text-xs text-slate-400">Principal aur coordinator ke paper tab ko control karta hai.</p>
            <p className={`text-[10px] font-black uppercase tracking-widest ${paperOn ? 'text-emerald-400' : 'text-slate-500'}`}>
              {paperOn ? 'Enabled' : 'Disabled'}
            </p>
          </article>

          <article className="border border-slate-800 bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-emerald-400" />
                <h2 className="text-sm font-black uppercase tracking-widest">Teacher Salary</h2>
              </div>
              <button
                type="button"
                onClick={() => toggle('enableTeacherSalary', !salaryOn)}
                className="text-emerald-300"
                aria-label="Toggle teacher salary"
              >
                {salaryOn ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-slate-600" />}
              </button>
            </div>
            <p className="text-xs text-slate-400">Principal aur coordinator ka payroll view (teacher salary).</p>
            <p className={`text-[10px] font-black uppercase tracking-widest ${salaryOn ? 'text-emerald-400' : 'text-slate-500'}`}>
              {salaryOn ? 'Enabled' : 'Disabled'}
            </p>
          </article>
        </section>

        <article className="border border-slate-800 bg-slate-900 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-amber-400" />
            <h2 className="text-sm font-black uppercase tracking-widest">Gemini API</h2>
          </div>
          <p className="text-xs text-slate-400">
            Key paste karein, save karein, phir paper generator chalega. Key client par store hoti hai.
          </p>
          <input
            type="password"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            placeholder="AIza..."
            className="w-full p-3 bg-slate-950 border border-slate-700 text-sm font-mono outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveKey}
              className="px-4 py-2 bg-amber-500 text-slate-950 text-xs font-black uppercase tracking-widest"
            >
              Save key
            </button>
            <button
              type="button"
              onClick={testKey}
              disabled={testing}
              className="px-4 py-2 border border-slate-600 text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
            >
              <Wifi size={14} />
              {testing ? 'Testing…' : 'Test connection'}
            </button>
          </div>
        </article>
      </main>
    </div>
  );
}
