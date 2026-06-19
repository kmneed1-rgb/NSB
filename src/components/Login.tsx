import React, { useState } from 'react';
import { GraduationCap, Mail, Lock, Eye, EyeOff, Shield, User, Users, AlertCircle } from 'lucide-react';
import { Role, UserSession, Teacher, Student, Coordinator } from '../types';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'sonner';

interface LoginProps {
  teachers: Teacher[];
  students: Student[];
  coordinators: Coordinator[];
  onLogin: (session: UserSession) => void;
  onBackToLanding?: () => void;
}

export default function Login({ teachers, students, coordinators, onLogin, onBackToLanding }: LoginProps) {
  const [role, setRole] = useState<Role>('principal');
  const [email, setEmail] = useState('ali');
  const [password, setPassword] = useState('111222');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setError(null);
    if (newRole === 'principal') {
      setEmail('ali');
      setPassword('111222');
    } else if (newRole === 'developer') {
      setEmail('KM');
      setPassword('6016');
    } else if (newRole === 'coordinator') {
      setEmail('');
      setPassword('');
    } else if (newRole === 'teacher') {
      setEmail('');
      setPassword('');
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (user && user.email) {
        onLogin({
          role: 'principal',
          email: user.email,
          username: user.email.split('@')[0],
          name: user.displayName || 'School Principal',
        });
        toast.success(`Google Sign-In successful. Welcome Principal ${user.displayName || ''}!`);
      }
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      setError(err.message || "Google Sign-In failed.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const checkInput = email.trim().toLowerCase();

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (role === 'principal') {
      try {
        let user;
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
          user = userCredential.user;
        } catch (firebaseErr: any) {
          if (
            firebaseErr.code === 'auth/user-not-found' || 
            firebaseErr.code === 'auth/invalid-login-credentials' || 
            firebaseErr.code === 'auth/invalid-credential' ||
            firebaseErr.code === 'auth/cannot-find-user'
          ) {
            try {
              const signupCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
              user = signupCredential.user;
              toast.success("New Principal Admin profile secured in Firebase Authentication!");
            } catch (signupErr: any) {
              throw new Error("Invalid principal credentials or database connection issue.");
            }
          } else {
            throw firebaseErr;
          }
        }

        if (user && user.email) {
          onLogin({
            role: 'principal',
            email: user.email,
            username: user.email.split('@')[0],
            name: 'Principal Office',
          });
          toast.success("Principal authenticated securely via Firebase Auth.");
        }
      } catch (err: any) {
        if ((checkInput === 'ali') && password === '111222') {
          onLogin({
            role: 'principal',
            email: 'ali@nsb1.com',
            username: 'ali',
            name: 'Ali (Principal)',
          });
          toast.success("Principal Ali authenticated via master credentials.");
        } else if ((checkInput === 'principal@school.com' || checkInput === 'principal@nsb1.com' || checkInput === 'principal') && password === 'principal123') {
          onLogin({
            role: 'principal',
            email: 'principal@nsb1.com',
            username: 'principal',
            name: 'Principal',
          });
          toast.success("Authenticated via local backup credentials.");
        } else {
          setError(err.message || 'Invalid manual principal credentials.');
        }
      }
    } else if (role === 'developer') {
      if (checkInput === 'km' && password === '6016') {
        onLogin({
          role: 'developer',
          email: 'developer@nsb1.com',
          username: 'KM',
          name: 'System Developer',
        });
        toast.success("Developer Access Granted.");
      } else {
        setError("Invalid developer credentials.");
      }
    } else if (role === 'coordinator') {
      const foundCoordinator = coordinators.find(c => 
        c.email?.toLowerCase() === checkInput || 
        c.username?.toLowerCase() === checkInput ||
        c.id?.toLowerCase() === checkInput
      );

      if (foundCoordinator) {
        if (password === foundCoordinator.password) {
          onLogin({
            role: 'coordinator',
            email: foundCoordinator.email || '',
            username: foundCoordinator.username || '',
            id: foundCoordinator.id,
            name: foundCoordinator.name,
          });
          toast.success(`Academic Coordinator ${foundCoordinator.name} authenticated!`);
        } else {
          setError(`Invalid password for ${foundCoordinator.name}.`);
        }
      } else if ((checkInput === 'coordinator@school.com' || checkInput === 'coordinator@nsb1.com' || checkInput === 'coordinator') && password === 'coordinator123') {
        onLogin({
          role: 'coordinator',
          email: 'coordinator@nsb1.com',
          username: 'coordinator',
          name: 'Academic Coordinator',
        });
        toast.success("Academic Coordinator authenticated via fallback credentials.");
      } else {
        setError('Coordinator account not found.');
      }
    } else if (role === 'teacher') {
      const foundTeacher = teachers.find(t => 
        t.email?.toLowerCase() === checkInput || 
        t.username?.toLowerCase() === checkInput ||
        t.id?.toLowerCase() === checkInput
      );

      if (foundTeacher) {
        if (password === foundTeacher.password) {
          onLogin({
            role: 'teacher',
            email: foundTeacher.email || '',
            username: foundTeacher.username || '',
            id: foundTeacher.id,
            name: foundTeacher.name,
          });
        } else {
          setError(`Invalid password for ${foundTeacher.name}.`);
        }
      } else {
        setError('Teacher account not found.');
      }
    } else if (role === 'student') {
      const foundStudent = students.find(s => 
        s.email?.toLowerCase() === checkInput || 
        s.username?.toLowerCase() === checkInput ||
        s.id?.toLowerCase() === checkInput
      );

      if (foundStudent) {
        if (password === foundStudent.password) {
          onLogin({
            role: 'student',
            email: foundStudent.email || '',
            username: foundStudent.username || '',
            id: foundStudent.id,
            name: foundStudent.name,
          });
        } else {
          setError(`Invalid password for ${foundStudent.name}.`);
        }
      } else {
        setError('Student account not found.');
      }
    }
  };

  return (
    <div id="login-container" className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 px-6 font-sans border-t-8 border-slate-900 dark:border-indigo-600 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="w-full max-w-sm space-y-12">
        
        {/* Minimalist Header */}
        <div className="text-center space-y-4">
          <img 
            src="/src/assets/images/nsb1_logo_white_bg_1781098534962.png" 
            alt="NSB 1 ACADEMY" 
            className="mx-auto h-20 w-auto object-contain mb-2"
            referrerPolicy="no-referrer"
          />
          <div className="space-y-1">
            <h2 id="login-title" className="text-3xl font-light tracking-tighter text-slate-950 dark:text-white uppercase italic">
              Terminal <span className="font-extrabold not-italic">Login</span>
            </h2>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em]">
              NSB1 School & Academy
            </p>
          </div>
        </div>

        {/* Simplified Form */}
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
                placeholder="Username or Email"
                className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 py-4 text-[11px] font-bold tracking-[0.2em] focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500 text-slate-900 dark:text-white transition-all placeholder:text-slate-300 dark:placeholder:text-slate-650"
              />
            </div>

            <div className="space-y-1">
              <input
                id="password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 py-4 text-[11px] font-bold tracking-[0.2em] focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-500 text-slate-900 dark:text-white transition-all placeholder:text-slate-300 dark:placeholder:text-slate-650"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <button
              id="login-submit-btn"
              type="submit"
              className="w-full py-4 bg-slate-950 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-[0.4em] transition-all cursor-pointer shadow-2xl"
            >
              Authenticate
            </button>

            {role === 'principal' && (
              <button
                id="google-signin-btn"
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-4 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 bg-white dark:bg-slate-900 text-slate-950 dark:text-white font-bold text-[10px] uppercase tracking-[0.2em] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4 ml-1 mr-1" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.08-.34-.11-.71-.11-1.09c0-.38.03-.75.11-1.09z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Sign In with Google
              </button>
            )}
            
            <div className="text-center">
              {onBackToLanding && (
                <button 
                  onClick={onBackToLanding}
                  className="text-[9px] font-bold text-slate-400 hover:text-slate-950 uppercase tracking-[0.2em] border-b border-slate-100 transition-all cursor-pointer"
                >
                  Return to Overview
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Minimalist Role Hints */}
        <div className="pt-8 border-t border-slate-50 grid grid-cols-2 sm:grid-cols-4 gap-4">
           {[
             { role: 'principal', label: 'Principal', icon: Shield },
             { role: 'coordinator', label: 'Coord', icon: Shield },
             { role: 'teacher', label: 'Faculty', icon: Users },
             { role: 'student', label: 'Student', icon: User },
             { role: 'developer', label: 'Dev', icon: Shield }
           ].map(item => (
             <button
               key={item.role}
               type="button"
               disabled={role === item.role}
               onClick={() => handleRoleChange(item.role as Role)}
               className={`text-[8px] font-bold uppercase tracking-widest py-2 border transition-all ${
                 role === item.role 
                   ? 'bg-slate-900 text-white border-slate-900' 
                   : 'text-slate-400 border-slate-100 hover:border-slate-300'
               }`}
             >
               {item.label}
             </button>
           ))}
        </div>
      </div>
    </div>

  );
}
