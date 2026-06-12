import React, { useState } from 'react';
import { GraduationCap, Mail, Lock, Eye, EyeOff, Shield, User, Users, AlertCircle } from 'lucide-react';
import { Role, UserSession, Teacher, Student } from '../types';

interface LoginProps {
  teachers: Teacher[];
  students: Student[];
  onLogin: (session: UserSession) => void;
  onBackToLanding?: () => void;
}

export default function Login({ teachers, students, onLogin, onBackToLanding }: LoginProps) {
  const [role, setRole] = useState<Role>('principal');
  const [email, setEmail] = useState('principal@school.com');
  const [password, setPassword] = useState('principal123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setError(null);
    if (newRole === 'principal') {
      setEmail('principal@school.com');
      setPassword('principal123');
    } else if (newRole === 'coordinator') {
      setEmail('coordinator@nsb1.com');
      setPassword('coordinator123');
    } else if (newRole === 'teacher') {
      setEmail('teacher1'); // Default username
      setPassword('password123');
    } else {
      setEmail('student1'); // Default username
      setPassword('password123');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const checkInput = email.trim().toLowerCase();

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (role === 'principal') {
      if ((checkInput === 'principal@school.com' || checkInput === 'principal@nsb1.com' || checkInput === 'principal') && password === 'principal123') {
        onLogin({
          role: 'principal',
          email: 'principal@nsb1.com',
          username: 'principal',
          name: 'Principal',
        });
      } else {
        setError('Invalid principal credentials.');
      }
    } else if (role === 'coordinator') {
      if ((checkInput === 'coordinator@school.com' || checkInput === 'coordinator@nsb1.com' || checkInput === 'coordinator') && password === 'coordinator123') {
        onLogin({
          role: 'coordinator',
          email: 'coordinator@nsb1.com',
          username: 'coordinator',
          name: 'Academic Coordinator',
        });
      } else {
        setError('Invalid coordinator credentials.');
      }
    } else if (role === 'teacher') {
      // Find teacher in database by email or username
      const foundTeacher = teachers.find(t => 
        t.email?.toLowerCase() === checkInput || 
        t.username?.toLowerCase() === checkInput
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
      // Find student in database by email or username
      const foundStudent = students.find(s => 
        s.email?.toLowerCase() === checkInput || 
        s.username?.toLowerCase() === checkInput
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
            className="mx-auto h-20 w-auto object-contain mb-2 invert dark:invert-0"
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
             { role: 'student', label: 'Student', icon: User }
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
