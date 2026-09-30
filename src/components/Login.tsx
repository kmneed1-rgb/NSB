import React, { useState } from 'react';
import { GraduationCap, Mail, Lock, Eye, EyeOff, Shield, User, Users, AlertCircle } from 'lucide-react';
import { Role, UserSession, Teacher, Student, Coordinator } from '../types';
import { supabase } from '../supabase';
import { authEmailFor } from '../lib/authAdmin';
import { AppSettings } from '../types';
import { isRoleLoginEnabled, getRoleLoginBlockMessage } from '../lib/appControl';
import { toast } from 'sonner';

interface LoginProps {
  teachers: Teacher[];
  students: Student[];
  coordinators: Coordinator[];
  onLogin: (session: UserSession) => void;
  onBackToLanding?: () => void;
  /** Portal OFF / subscription expired hone par dikhne wala message (null = portal online). */
  portalNotice?: string | null;
  /** Developer Control: role-wise login switches (App.tsx se aata hai). */
  appSettings?: AppSettings;
}

export default function Login({ teachers, students, coordinators, onLogin, onBackToLanding, portalNotice, appSettings }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const checkInput = email.trim().toLowerCase();

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    // Developer Control: us role ka login band hai? → Auth attempt se PEHLE block.
    const blockedByDeveloper = (role: Role): boolean => {
      if (!appSettings) return false;
      const msg = getRoleLoginBlockMessage(appSettings, role);
      if (msg) { setError(msg); toast.error(msg); return true; }
      return false;
    };

    // Best-effort Supabase Auth session (developer/principal) — edge function
    // (admin-auth) ko bhejne ke liye session chahiye. Fail hone par bhi login chalta hai.
    const tryAuthSession = async (authEmail: string, pw: string = password) => {
      try {
        await supabase.auth.signInWithPassword({ email: authEmail, password: pw });
      } catch {
        /* offline / Auth user nahi bana — ignore */
      }
    };

    // Record-based login — sirf STAFF (teacher/coordinator):
    // online → Supabase Auth (asli verification + JWT session); offline ya
    // Auth fail → local record password fallback.
    // NOTE: role ka login developer ne band kiya ho to yahan tak aate hi nahi.
    const tryStaffLogin = async (
      role: 'coordinator' | 'teacher',
      session: UserSession,
      recEmail: string,
      recPassword: string,
      welcomeMsg: string
    ) => {
      const authEmail = authEmailFor(role, recEmail || session.email, session.id);
      if (navigator.onLine !== false) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
          if (!error && data?.user) {
            onLogin(session);
            toast.success(welcomeMsg);
            return;
          }
        } catch {
          /* network fail → local fallback */
        }
      }
      if (password === recPassword) {
        onLogin(session);
        toast.success(welcomeMsg);
        return;
      }
      setError('Invalid ID or Password. Portal access denied.');
    };

    // 1. Check Developer (Superuser)
    if (checkInput === 'km' && password === '6016') {
      // Auth copy '60166016' — Supabase min 6 char ('6016' se Auth session fail hota)
      await tryAuthSession('dev@nsb1.com', '60166016');
      onLogin({
        role: 'developer',
        email: 'developer@nsb1.com',
        username: 'KM',
        name: 'System Developer',
      });
      toast.success("Developer Access Granted.");
      return;
    }

    // 2. Check Principal (Master Credentials)
    if (checkInput === 'ali' && password === '111222') {
      if (blockedByDeveloper('principal')) return;
      await tryAuthSession('ali@nsb1.com'); // best-effort — edge function calls ke liye session
      onLogin({
        role: 'principal',
        email: 'ali@nsb1.com',
        username: 'ali',
        name: 'Ali (Principal)',
      });
      toast.success("Principal Ali authenticated.");
      return;
    }

    // 3. Check Coordinators — record mila to Auth-first (online) + local fallback
    const foundCoordinator = coordinators.find(c => 
      c.name?.toLowerCase() === checkInput || 
      c.username?.toLowerCase() === checkInput ||
      c.id?.toLowerCase() === checkInput
    );
    if (foundCoordinator) {
      if (blockedByDeveloper('coordinator')) return;
      await tryStaffLogin('coordinator', {
        role: 'coordinator',
        email: foundCoordinator.email || '',
        username: foundCoordinator.username || '',
        id: foundCoordinator.id,
        name: foundCoordinator.name,
      }, foundCoordinator.email, foundCoordinator.password, `Welcome Coordinator ${foundCoordinator.name}!`);
      return;
    }

    // 4. Check Faculty (Teachers)
    const foundTeacher = teachers.find(t => 
      t.name?.toLowerCase() === checkInput || 
      t.username?.toLowerCase() === checkInput ||
      t.id?.toLowerCase() === checkInput
    );
    if (foundTeacher) {
      if (blockedByDeveloper('teacher')) return;
      await tryStaffLogin('teacher', {
        role: 'teacher',
        email: foundTeacher.email || '',
        username: foundTeacher.username || '',
        id: foundTeacher.id,
        name: foundTeacher.name,
      }, foundTeacher.email, foundTeacher.password, `Welcome Faculty ${foundTeacher.name}!`);
      return;
    }

    // 5. Check Students — PURANA TAREEQA: sirf local record password
    // (students Supabase Auth se BAHAR hain — unke Auth users nahi bante)
    const foundStudent = students.find(s => 
      s.email?.toLowerCase() === checkInput || 
      s.username?.toLowerCase() === checkInput ||
      s.id?.toLowerCase() === checkInput
    );
    if (foundStudent) {
      if (blockedByDeveloper('student')) return;
      if (password === foundStudent.password) {
        onLogin({
          role: 'student',
          email: foundStudent.email || '',
          username: foundStudent.username || '',
          id: foundStudent.id,
          name: foundStudent.name,
        });
        toast.success(`Welcome Student ${foundStudent.name}!`);
        return;
      }
      setError('Invalid ID or Password. Portal access denied.');
      return; // student record mila — Auth fallback ki koi zaroorat nahi
    }

    // 6. Fallback — Cloud Register (Supabase Auth).
    // SECURITY: yeh sirf ADMIN (principal/developer) allowlist ke liye hai — warna
    // koi bhi valid Auth user (masalan teacher) apne email/password se principal ban jata.
    const ADMIN_AUTH_EMAILS = ['ali@nsb1.com', 'dev@nsb1.com'];
    const fallbackEmail = email.trim().toLowerCase();
    if (!ADMIN_AUTH_EMAILS.includes(fallbackEmail)) {
      setError('Invalid ID or Password. Portal access denied.');
      return;
    }
    try {
      const { data: cred, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authErr) throw authErr;
      const user = cred.user;
      if (user && user.email) {
        const isDev = user.email.toLowerCase() === 'dev@nsb1.com';
        if (blockedByDeveloper(isDev ? 'developer' : 'principal')) return;
        onLogin({
          role: isDev ? 'developer' : 'principal',
          email: user.email,
          username: user.email.split('@')[0],
          name: isDev ? 'System Developer' : 'Principal Office',
        });
        toast.success("Authenticated via Cloud Register.");
        return;
      }
    } catch (err: any) {
      // If everything fails
      setError('Invalid ID or Password. Portal access denied.');
    }
  };

  return (
    <div id="login-container" className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 px-6 font-sans border-t-8 border-slate-900 dark:border-indigo-600 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="w-full max-w-sm space-y-12">
        
        {/* Minimalist Header */}
        <div className="text-center space-y-4">
          <img 
            src="/logo.png" 
            alt="NSB 1 ACADEMY" 
            className="mx-auto h-20 w-auto object-contain mb-2"
            referrerPolicy="no-referrer"
          />
          <div className="space-y-1">
            <h2 id="login-title" className="text-3xl font-light tracking-tighter text-slate-950 dark:text-white uppercase  text-center">
              Portal <span className="font-extrabold not-">Login</span>
            </h2>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] text-center">
              NSB1 School
            </p>
          </div>
        </div>

        {/* Portal Offline / Subscription expired notice */}
        {portalNotice && (
          <div className="mb-6 flex items-start gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-center bg-amber-50 dark:bg-amber-950/30 py-3 px-3 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{portalNotice}</span>
          </div>
        )}

        {/* Unified Form */}
        <form onSubmit={handleLogin} className="space-y-8">
          {error && (
            <div id="login-error" className="text-[10px] font-bold text-red-550 uppercase tracking-[0.2em] text-center bg-red-50 dark:bg-red-950/25 py-3 border border-red-100 dark:border-red-900/30">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-1">
              <input
                id="email-input"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ID, Username or Email"
                className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 py-4 text-[11px] font-bold tracking-[0.2em] focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500 text-slate-900 dark:text-white transition-all placeholder:text-slate-300 dark:placeholder:text-slate-650"
              />
            </div>

            <div className="space-y-1 relative">
              <input
                id="password-input"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 py-4 text-[11px] font-bold tracking-[0.2em] focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500 text-slate-900 dark:text-white transition-all placeholder:text-slate-300 dark:placeholder:text-slate-650"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <button
              id="login-submit-btn"
              type="submit"
              className="w-full py-4 bg-slate-950 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-[0.4em] transition-all cursor-pointer shadow-2xl"
            >
              Sign In to Portal
            </button>

            <div className="text-center">
              {onBackToLanding && (
                <button 
                  onClick={onBackToLanding}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-950 uppercase tracking-[0.2em] border-b border-slate-100 transition-all cursor-pointer"
                >
                  Return to Overview
                </button>
              )}
            </div>
          </div>
        </form>

        <div className="pt-8 border-t border-slate-50 dark:border-slate-900 text-center">
            <p className="text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">
                NSB1 Digital Management Infrastructure
            </p>
        </div>
      </div>
    </div>
  );
}
