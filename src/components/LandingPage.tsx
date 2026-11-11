import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Users, Award, Shield, ArrowRight, CheckCircle2, 
  MapPin, Phone, Mail, Clock, Calendar, Sparkles, Send, Info,
  GraduationCap, Laptop, Book, Globe, ShieldCheck, Trophy,
  Menu, X, Star, Quote, TrendingUp, CheckSquare, CreditCard, MessageSquare, Fingerprint,
  Upload, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Teacher, Student, Class, AdmissionApplication, AdmissionApplicationInput } from '../types';
import schoolHero from '../assets/images/school_hero_illustration_1781185991035.png';
import { submitAdmissionApplication } from '../lib/admissions';
import { convertToWebP } from '../lib/imageUtils';

type AdmissionFormState = AdmissionApplicationInput;

const INITIAL_ADMISSION_FORM: AdmissionFormState = {
  studentName: '',
  dob: '',
  gender: '',
  bformNo: '',
  bloodGroup: '',
  nationality: 'Pakistani',
  religion: '',
  studentPhone: '',
  photo: '',
  grade: '',
  sectionPreference: '',
  session: '2026-27',
  category: 'Regular',
  academySubjects: '',
  previousSchool: '',
  previousClass: '',
  lastResult: '',
  transferCertificate: '',
  fatherName: '',
  motherName: '',
  guardianName: '',
  relationship: 'Father',
  parentPhone: '',
  alternatePhone: '',
  parentEmail: '',
  parentCnic: '',
  occupation: '',
  address: '',
  city: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelation: '',
  medicalConditions: '',
  transportRequired: '',
  pickupArea: '',
  siblingAtSchool: '',
  siblingNames: '',
  hearAboutUs: '',
  notes: '',
  consent: false,
};

const admissionDigits = (v: string) => v.replace(/\D/g, '');
const admissionEmailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

const admissionInputClass = (hasError?: boolean) =>
  `w-full bg-slate-50 border ${hasError ? 'border-rose-400' : 'border-slate-100'} focus:border-emerald-500 focus:bg-white p-3.5 text-xs font-bold outline-none transition-all`;

function AdmissionField({
  label,
  error,
  children,
  className = '',
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      {children}
      {error ? <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">{error}</p> : null}
    </div>
  );
}

function validateAdmissionStep(step: number, f: AdmissionFormState): Record<string, string> {
  const errors: Record<string, string> = {};

  if (step === 1) {
    if (f.studentName.trim().length < 3) errors.studentName = 'Student ka poora naam likhein (min 3 harf).';
    if (!f.dob) errors.dob = 'Date of birth zaroori hai.';
    else {
      const d = new Date(f.dob);
      if (Number.isNaN(d.getTime())) errors.dob = 'Date of birth sahi nahi hai.';
      else if (d.getTime() > Date.now()) errors.dob = 'Date of birth future mein nahi ho sakti.';
    }
    if (!f.gender) errors.gender = 'Gender select karein.';
    if (f.studentPhone.trim() && admissionDigits(f.studentPhone).length < 7)
      errors.studentPhone = 'Student phone sahi nahi hai.';
    if (!f.grade) errors.grade = 'Admission class select karein.';
    if (!f.category) errors.category = 'Admission category select karein.';
    if ((f.category === 'Academy' || f.category === 'Both') && !f.academySubjects.trim())
      errors.academySubjects = 'Academy subjects likhein.';
  }

  if (step === 2) {
    if (f.fatherName.trim().length < 3) errors.fatherName = "Father's name zaroori hai.";
    if (f.guardianName.trim() && f.guardianName.trim().length < 3)
      errors.guardianName = 'Guardian ka naam sahi likhein.';
    if (!f.relationship) errors.relationship = 'Relationship select karein.';
    const phone = admissionDigits(f.parentPhone);
    if (phone.length < 7 || phone.length > 15) errors.parentPhone = 'Valid WhatsApp number zaroori hai.';
    if (f.alternatePhone.trim() && admissionDigits(f.alternatePhone).length < 7)
      errors.alternatePhone = 'Alternate number sahi nahi hai.';
    if (f.parentEmail.trim() && !admissionEmailOk(f.parentEmail.trim()))
      errors.parentEmail = 'Email address sahi nahi hai.';
    if (f.parentCnic.trim() && admissionDigits(f.parentCnic).length !== 13)
      errors.parentCnic = 'CNIC 13 digits ki honi chahiye.';
    if (f.address.trim().length < 5) errors.address = 'Complete home address zaroori hai.';
    if (!f.city.trim()) errors.city = 'City zaroori hai.';
    if (f.emergencyPhone.trim() && admissionDigits(f.emergencyPhone).length < 7)
      errors.emergencyPhone = 'Emergency number sahi nahi hai.';
  }

  if (step === 3) {
    if (!f.transportRequired) errors.transportRequired = 'Transport option select karein.';
    if (f.transportRequired === 'Yes' && !f.pickupArea.trim())
      errors.pickupArea = 'Pickup area / stop likhein.';
    if (!f.siblingAtSchool) errors.siblingAtSchool = 'Sibling option select karein.';
    if (!f.consent) errors.consent = 'Declaration accept karna zaroori hai.';
  }

  return errors;
}

interface LandingPageProps {
  teachers: Teacher[];
  students: Student[];
  classes: Class[];
  onEnterPortal: () => void;
}

export default function LandingPage({ teachers, students, classes, onEnterPortal }: LandingPageProps) {
  // Mobile nav state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Admission form (3-step enrollment application)
  const [admissionForm, setAdmissionForm] = useState<AdmissionFormState>(INITIAL_ADMISSION_FORM);
  const [admissionErrors, setAdmissionErrors] = useState<Record<string, string>>({});
  const [admissionStep, setAdmissionStep] = useState(1);
  const [admissionSubmitting, setAdmissionSubmitting] = useState(false);
  const [admissionPhotoBusy, setAdmissionPhotoBusy] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState<AdmissionApplication | null>(null);
  const [admissionCloudSynced, setAdmissionCloudSynced] = useState(true);

  const updateAdmission = <K extends keyof AdmissionFormState>(key: K, value: AdmissionFormState[K]) => {
    setAdmissionForm(prev => ({ ...prev, [key]: value }));
    setAdmissionErrors(prev => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const gradeOptions = useMemo(() => {
    const fromClasses = Array.from(
      new Set((classes || []).map(c => String(c.className || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (fromClasses.length > 0) return fromClasses;
    return ['Play Group', 'Nursery', 'Prep', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'];
  }, [classes]);

  const handleAdmissionPhoto = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAdmissionErrors(prev => ({ ...prev, photo: 'Photo 5MB se chhoti honi chahiye.' }));
      return;
    }
    try {
      setAdmissionPhotoBusy(true);
      const data = await convertToWebP(file);
      updateAdmission('photo', data);
    } catch {
      setAdmissionErrors(prev => ({ ...prev, photo: 'Photo process nahi ho saki. Dobara koshish karein.' }));
    } finally {
      setAdmissionPhotoBusy(false);
    }
  };

  const goToAdmissionStep = (next: number) => {
    const errs = validateAdmissionStep(admissionStep, admissionForm);
    setAdmissionErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setAdmissionStep(next);
  };

  const handleAdmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Enter key se early submit na ho — pehle steps par sirf next step par jayein.
    if (admissionStep < 3) {
      goToAdmissionStep(admissionStep + 1);
      return;
    }
    const step1 = validateAdmissionStep(1, admissionForm);
    const step2 = validateAdmissionStep(2, admissionForm);
    const step3 = validateAdmissionStep(3, admissionForm);
    const allErrors = { ...step1, ...step2, ...step3 };
    setAdmissionErrors(allErrors);
    if (Object.keys(allErrors).length > 0) {
      setAdmissionStep(Object.keys(step1).length ? 1 : Object.keys(step2).length ? 2 : 3);
      return;
    }

    try {
      setAdmissionSubmitting(true);
      const result = await submitAdmissionApplication(admissionForm);
      setSubmittedApplication(result.application);
      setAdmissionCloudSynced(result.cloudSynced);
      setAdmissionForm(INITIAL_ADMISSION_FORM);
      setAdmissionErrors({});
      setAdmissionStep(1);
    } catch {
      setAdmissionErrors({ submit: 'Application submit nahi ho saki. Internet check karke dobara koshish karein.' });
    } finally {
      setAdmissionSubmitting(false);
    }
  };

  const resetAdmissionForm = () => {
    setSubmittedApplication(null);
    setAdmissionForm(INITIAL_ADMISSION_FORM);
    setAdmissionErrors({});
    setAdmissionStep(1);
    setAdmissionCloudSynced(true);
  };

  const f = admissionForm;
  const err = admissionErrors;

  const navItems = ['Home', 'Academics', 'Mentors', 'Admissions'];

  const handleNavClick = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id.toLowerCase())?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-white text-slate-900 font-sans antialiased min-h-screen flex flex-col selection:bg-emerald-100 selection:text-emerald-900 overflow-x-hidden">
      
      {/* ========== MODERN NAVIGATION ========== */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 sm:px-6 md:px-12 py-3 sm:py-4 flex items-center justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <img 
            src="/logo.png" 
            alt="NSB1 School" 
            className="h-9 sm:h-10 w-auto object-contain hover:scale-105 transition-transform"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col">
            <span className="font-black text-slate-950 text-lg sm:text-xl tracking-tighter uppercase leading-none">
              NSB1
            </span>
            <span className="text-[10px] tracking-[0.4em] font-black text-emerald-600 uppercase">
              School
            </span>
          </div>
        </motion.div>

        {/* Desktop Navbar */}
        <nav className="hidden lg:flex items-center gap-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
          {navItems.map((item) => (
            <a 
              key={item}
              href={`#${item.toLowerCase()}`} 
              onClick={(e) => { e.preventDefault(); handleNavClick(item.toLowerCase()); }}
              className="hover:text-emerald-600 transition-all relative group cursor-pointer"
            >
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-600 transition-all group-hover:w-full"></span>
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02, translateY: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={onEnterPortal}
            className="hidden sm:block py-3 px-6 md:px-8 bg-slate-950 text-white font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-xl shadow-slate-200 hover:bg-emerald-600 hover:shadow-emerald-200"
          >
            Portal Login
          </motion.button>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden fixed top-[60px] left-0 right-0 z-40 bg-white border-b border-slate-100 shadow-2xl shadow-slate-200/50 px-6 py-6 space-y-4 max-h-[calc(100vh-60px)] overflow-y-auto"
          >
            {navItems.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={(e) => { e.preventDefault(); handleNavClick(item.toLowerCase()); }}
                className="block py-3 px-4 rounded-xl text-[11px] font-black text-slate-700 uppercase tracking-[0.25em] hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                {item}
              </a>
            ))}
            <button
              onClick={() => { setMobileOpen(false); onEnterPortal(); }}
              className="w-full py-4 mt-2 bg-slate-950 text-white font-black text-[11px] uppercase tracking-widest hover:bg-emerald-600 transition-colors cursor-pointer"
            >
              Portal Login
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main>
        {/* ========== MODERN HERO SECTION ========== */}
        <section id="home" className="relative pt-10 sm:pt-14 md:pt-16 pb-14 md:pb-20 px-4 sm:px-6 md:px-12 overflow-hidden">
          {/* Refined Background Elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl -z-10 overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-50/60 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-slate-50 rounded-full blur-[100px]"></div>
            <div className="absolute top-1/3 left-1/4 w-40 h-40 bg-emerald-100/40 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-8 md:space-y-10 text-center"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Excellence Redefined</span>
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tighter leading-[0.95] text-slate-950 uppercase">
                  Shaping<br/>
                  <span className="text-emerald-600">The Future</span><br/>
                  of Leaders.
                </h1>
                
                <p className="text-slate-500 text-base sm:text-lg md:text-xl max-w-xl leading-relaxed font-medium mx-auto">
                  NSB1 School integrates rigorous academic standards with advanced digital systems, fostering an environment where curiosity meets modern capability.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 md:gap-5 pt-4 sm:pt-6 max-w-md sm:max-w-none mx-auto">
                  <motion.button
                    whileHover={{ scale: 1.05, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onEnterPortal}
                    className="px-8 sm:px-12 py-4 md:py-5 bg-emerald-600 text-white font-black text-[11px] uppercase tracking-[0.4em] transition-all shadow-2xl shadow-emerald-200 flex items-center justify-center gap-2"
                  >
                    Enter Portal
                    <ArrowRight size={14} />
                  </motion.button>
                  <motion.a
                    whileHover={{ scale: 1.05, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    href="#academics"
                    onClick={(e) => { e.preventDefault(); handleNavClick('academics'); }}
                    className="px-8 sm:px-12 py-4 md:py-5 border-2 border-slate-950 text-slate-950 hover:bg-slate-950 hover:text-white font-black text-[11px] uppercase tracking-[0.4em] transition-all flex items-center justify-center"
                  >
                    View Programs
                  </motion.a>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="relative"
              >
                <div className="aspect-square w-full bg-slate-50 rounded-[2rem] md:rounded-[4rem] border border-slate-100 overflow-hidden relative shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100/20 to-transparent"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img 
                      src={schoolHero} 
                      alt="NSB1 School Features" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* School Features Overlay Chips */}
                  <div className="absolute left-4 bottom-4 sm:left-6 sm:bottom-6 flex flex-wrap gap-2 max-w-[85%]">
                    {[
                      { icon: CheckSquare, label: 'Digital Attendance' },
                      { icon: Calendar, label: 'Smart Timetable' },
                      { icon: CreditCard, label: 'Fee Ledger' },
                      { icon: MessageSquare, label: 'WhatsApp Alerts' },
                      { icon: Award, label: 'Live Results' },
                      { icon: Fingerprint, label: 'ID Cards' }
                    ].map(feat => (
                      <span key={feat.label} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/90 backdrop-blur-md border border-emerald-100 text-slate-900 rounded-full shadow-md text-[9px] font-black uppercase tracking-widest">
                        <feat.icon size={11} className="text-emerald-600" />
                        {feat.label}
                      </span>
                    ))}
                  </div>

                  {/* Floating Feature Cards */}
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-4 right-4 sm:top-10 sm:right-10 bg-white p-4 sm:p-5 shadow-xl rounded-2xl border border-slate-100 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <div className="text-emerald-600 font-black text-sm sm:text-lg">98%</div>
                      <div className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Board Pass Rate</div>
                    </div>
                  </motion.div>

                  <motion.div 
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-24 left-2 sm:bottom-28 sm:left-[-20px] bg-slate-950 p-4 sm:p-5 shadow-xl rounded-2xl border border-slate-800 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-600/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <div className="text-white font-black text-sm sm:text-lg">12+</div>
                      <div className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Specialized Labs</div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ========== TRUST STRIP ========== */}
        <section className="bg-slate-950 py-8 md:py-10 px-4 sm:px-6 md:px-12">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Shield, label: 'Safe Campus', sub: '24/7 Security' },
              { icon: Award, label: 'Certified Faculty', sub: 'Advanced Credentials' },
              { icon: TrendingUp, label: 'Digital Ledger', sub: 'Real-time Tracking' },
              { icon: GraduationCap, label: 'Global Curriculum', sub: 'Modern Standards' }
            ].map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="flex items-center gap-3 justify-center"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-600/20 rounded-xl flex items-center justify-center shrink-0">
                  <item.icon size={18} className="text-emerald-400" />
                </div>
                <div className="text-left">
                  <div className="text-white font-black text-xs sm:text-sm uppercase tracking-wider">{item.label}</div>
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{item.sub}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ========== ACADEMIC BENTO GRID ========== */}
        <section id="academics" className="py-12 md:py-16 px-4 sm:px-6 md:px-12 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10 md:mb-12 mx-auto max-w-3xl">
                <h2 className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.5em] mb-4">Academic Streams</h2>
                <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 uppercase tracking-tighter leading-tight">
                  Curated Programs for<br/>Every Stage of Growth.
                </h3>
                <p className="text-slate-500 font-medium mx-auto mt-6 text-sm leading-relaxed max-w-md">
                  From foundational primary education to advanced matriculation prep, we provide the environment for students to excel.
                </p>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Primary - Large Bento Item */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="md:col-span-8 bg-white p-8 sm:p-10 border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group min-h-[320px] sm:min-h-[400px] flex flex-col justify-between"
              >
                <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mb-6 sm:mb-10 shadow-lg shadow-emerald-100">
                    <BookOpen size={24} />
                  </div>
                  <h4 className="text-2xl sm:text-3xl font-black text-slate-950 uppercase tracking-tighter mb-4">Primary Foundation</h4>
                  <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-md">
                    Cultivating literacy, numeracy, and critical thinking skills in a vibrant, supportive environment for Grades 1 through 8.
                  </p>
                </div>
                <div className="relative z-10 flex flex-wrap items-center gap-6">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-full">Grades 1-8</span>
                  <div className="flex -space-x-3">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Secondary - Tall Bento Item */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="md:col-span-4 bg-slate-950 p-8 sm:p-10 shadow-2xl relative overflow-hidden group min-h-[320px] sm:min-h-[400px] flex flex-col justify-between"
              >
                <div className="absolute inset-0 bg-emerald-600/10 group-hover:bg-emerald-600/20 transition-colors"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white text-slate-950 rounded-2xl flex items-center justify-center mb-6 sm:mb-10">
                    <ShieldCheck size={24} />
                  </div>
                  <h4 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter mb-4">Secondary Excellence</h4>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                    Intensive matriculation preparation with a focus on science, mathematics, and high-performance laboratory work.
                  </p>
                </div>
                <div className="relative z-10">
                  <div className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4">Science / Arts Streams</div>
                  <button className="flex items-center gap-2 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:text-emerald-400 transition-colors cursor-pointer">
                    Explore Matrix <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>

              {/* Academy - Third Bento Item */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="md:col-span-12 bg-emerald-600 p-8 sm:p-10 shadow-xl relative overflow-hidden group min-h-[240px] sm:min-h-[300px] flex items-center"
              >
                <div className="absolute right-0 bottom-0 p-6 sm:p-10 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700 hidden sm:block">
                  <Trophy size={220} strokeWidth={1} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10 w-full">
                  <div className="space-y-4 sm:space-y-6">
                    <h4 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter">NSB1 Academy Prep</h4>
                    <p className="text-emerald-50 text-base sm:text-lg leading-relaxed max-w-md">
                      Specialized evening coaching designed for conceptual mastery and top-tier board exam results.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer'].map(sub => (
                      <div key={sub} className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                        {sub}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ========== THE MENTORSHIP WALL ========== */}
        <section id="mentors" className="py-12 md:py-16 px-4 sm:px-6 md:px-12 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10 md:mb-14">
              <h2 className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.5em] mb-4">Our Commitment</h2>
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 uppercase tracking-tighter leading-tight">
                Pedagogical Excellence.
              </h3>
              <p className="text-slate-500 font-medium mt-6 text-sm max-w-2xl mx-auto leading-relaxed">
                Three pillars that power every classroom at NSB1 — from verified expertise to technology-driven learning experiences.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
              {[
                { 
                  title: 'Certified Academics', 
                  desc: 'Faculty members hold advanced credentials and undergo rigorous pedagogical training cycles for mastery in every subject.', 
                  icon: Award, 
                  accent: 'emerald',
                  soft: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                  chip: 'bg-emerald-600',
                  features: ['100% Qualified Staff', 'Continuous PD Cycles', 'Subject Specialists']
                },
                { 
                  title: 'Mentorship Focus', 
                  desc: 'Each student is assigned a personal academic mentor to track holistic development — academically and personally.', 
                  icon: Users, 
                  accent: 'indigo',
                  soft: 'bg-indigo-50 border-indigo-200 text-indigo-700',
                  chip: 'bg-indigo-600',
                  features: ['1:1 Mentorship', 'Progress Reviews', 'Parent Counselor Links']
                },
                { 
                  title: 'Tech-First Learning', 
                  desc: 'Integrating smart classroom technology for an interactive, data-driven experience that prepares students for a digital future.', 
                  icon: Laptop, 
                  accent: 'rose',
                  soft: 'bg-rose-50 border-rose-200 text-rose-700',
                  chip: 'bg-rose-600',
                  features: ['Smart Classrooms', 'Digital Attendance', 'Live Result Portal']
                }
              ].map((item, idx) => (
                <motion.div 
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ y: -8 }}
                  className="group relative bg-slate-50 border border-slate-100 rounded-[1.75rem] p-8 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 text-center flex flex-col"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="mb-7 relative mx-auto">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg ${item.chip} group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500`}>
                      <item.icon size={28} />
                    </div>
                  </div>
                  <h4 className="text-lg font-black text-slate-950 uppercase tracking-tighter mb-4">{item.title}</h4>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium flex-1">
                    {item.desc}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mb-6">
                    {item.features.map(f => (
                      <span key={f} className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${item.soft}`}>
                        {f}
                      </span>
                    ))}
                  </div>
                  <div className="h-1 w-12 bg-slate-200 rounded-full mx-auto group-hover:w-full group-hover:bg-emerald-600 transition-all duration-500"></div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== DIRECTORY METRICS ========== */}
        <section className="bg-slate-50 py-10 md:py-16 px-4 sm:px-6 md:px-12 border-y border-slate-100">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-3 gap-4 md:gap-12">
              {[
                { label: 'Faculty Members', val: teachers.length, icon: GraduationCap },
                { label: 'Students Enrolled', val: students.length, icon: Users },
                { label: 'Active Classrooms', val: classes.length, icon: Globe }
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
                  <div className="text-slate-200 hidden sm:block"><stat.icon size={48} strokeWidth={1} /></div>
                  <div className="text-2xl sm:text-5xl font-black text-slate-950 tracking-tighter">{stat.val}</div>
                  <div className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== PREMIUM ADMISSION PORTAL (FORM) ========== */}
        <section id="admissions" className="py-12 md:py-16 px-4 sm:px-6 md:px-12 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            
            <div className="lg:col-span-5 space-y-8 text-center">
              <div className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[11px] font-black uppercase tracking-widest rounded-full">
                Session 2026-27 Open
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 uppercase tracking-tighter leading-tight">
                Secure Your Path<br/>to Academic Success.
              </h2>
              <p className="text-slate-500 text-base sm:text-lg leading-relaxed font-medium">
                Complete the online enrollment application below. Our admissions office will review your details and contact you for the next step.
              </p>

              <div className="bg-slate-50 border border-slate-100 p-5 text-left space-y-3">
                <div className="text-[11px] font-black text-slate-950 uppercase tracking-widest">Documents required at interview</div>
                {[
                  'Student B-Form / Birth Certificate',
                  "Father / Guardian CNIC copy",
                  'Previous school report card',
                  'Transfer / School Leaving Certificate',
                  '2 recent passport-size photographs',
                ].map(doc => (
                  <div key={doc} className="flex items-start gap-2">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">{doc}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-6 pt-2">
                {[
                  { icon: Phone, label: 'Principal Office', val: '+92 (051) nsb1-school' },
                  { icon: Mail, label: 'Inquiry Support', val: 'queries@nsb1-school.edu' },
                  { icon: MapPin, label: 'Campus Address', val: 'NSB1 Building, Academy Blvd, PK' }
                ].map(info => (
                  <div key={info.label} className="flex items-center justify-center gap-5">
                    <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-900 shadow-sm shrink-0">
                      <info.icon size={18} />
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{info.label}</div>
                      <div className="text-sm font-bold text-slate-950">{info.val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7">
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-white border border-slate-100 shadow-2xl p-6 sm:p-10 md:p-12 relative"
              >
                <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600"></div>
                
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tighter mb-2">Admission Application Form</h3>
                  <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Session 2026-27 • Complete Enrollment Details</p>
                </div>

                {submittedApplication ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-50 border border-emerald-100 p-6 sm:p-10 text-center space-y-6"
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-100">
                      <CheckCircle2 size={32} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg sm:text-xl font-black text-emerald-950 uppercase tracking-tighter">Application Submitted</h4>
                      <p className="text-sm text-emerald-800 font-medium">
                        Your enrollment application has been received by the NSB1 admissions office. Please keep your reference number safe.
                      </p>
                    </div>

                    <div className="bg-white border border-emerald-100 p-4 sm:p-5 text-left space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Application No.</span>
                        <span className="text-xs sm:text-sm font-black text-emerald-700 tracking-wider">{submittedApplication.applicationNo}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</span>
                        <span className="text-xs font-bold text-slate-950 text-right">{submittedApplication.studentName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Applying For</span>
                        <span className="text-xs font-bold text-slate-950 text-right">{submittedApplication.grade}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Session</span>
                        <span className="text-xs font-bold text-slate-950 text-right">{submittedApplication.session}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Guardian Contact</span>
                        <span className="text-xs font-bold text-slate-950 text-right">{submittedApplication.parentPhone}</span>
                      </div>
                    </div>

                    {!admissionCloudSynced && (
                      <p className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 p-3 text-left">
                        Application is saved on this device, but the school server could not be reached. Please contact the admissions office or submit again when you are online.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={resetAdmissionForm}
                      className="w-full py-4 bg-slate-950 text-white font-black text-[11px] uppercase tracking-[0.3em] hover:bg-emerald-600 transition-all"
                    >
                      Submit Another Application
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleAdmissionSubmit} className="space-y-6" noValidate>
                    {/* Step indicator */}
                    <div className="flex items-center gap-2 mb-2">
                      {[
                        { step: 1, label: 'Student' },
                        { step: 2, label: 'Guardian' },
                        { step: 3, label: 'Background' },
                      ].map((s, i) => (
                        <React.Fragment key={s.step}>
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 flex items-center justify-center text-[11px] font-black ${admissionStep >= s.step ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              {admissionStep > s.step ? <CheckCircle2 size={14} /> : s.step}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${admissionStep === s.step ? 'text-slate-950' : 'text-slate-400'}`}>{s.label}</span>
                          </div>
                          {i < 2 && <div className={`flex-1 h-px ${admissionStep > s.step ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* ================= STEP 1 : STUDENT ================= */}
                    {admissionStep === 1 && (
                      <div className="space-y-5">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                          <Users size={14} className="text-emerald-600" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-slate-950">Student Personal Details</span>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100">
                          <div className="w-16 h-16 bg-white border border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {f.photo ? (
                              <img src={f.photo} alt="Student" className="w-full h-full object-cover" />
                            ) : (
                              <Users size={22} className="text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-emerald-600 transition-all">
                              <Upload size={12} />
                              {admissionPhotoBusy ? 'Processing...' : (f.photo ? 'Change Photo' : 'Upload Photo')}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  handleAdmissionPhoto(e.target.files?.[0]);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">Optional • JPG / PNG • max 5MB</p>
                            {err.photo && <p className="text-[10px] font-bold text-rose-600 mt-1">{err.photo}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <AdmissionField label="Student Full Name *" error={err.studentName} className="md:col-span-2">
                            <input
                              type="text"
                              placeholder="e.g. Muhammad Ali"
                              value={f.studentName}
                              onChange={(e) => updateAdmission('studentName', e.target.value)}
                              className={admissionInputClass(Boolean(err.studentName))}
                            />
                          </AdmissionField>

                          <AdmissionField label="Date of Birth *" error={err.dob}>
                            <input
                              type="date"
                              value={f.dob}
                              max={new Date().toISOString().slice(0, 10)}
                              onChange={(e) => updateAdmission('dob', e.target.value)}
                              className={admissionInputClass(Boolean(err.dob))}
                            />
                          </AdmissionField>

                          <AdmissionField label="Gender *" error={err.gender}>
                            <select
                              value={f.gender}
                              onChange={(e) => updateAdmission('gender', e.target.value)}
                              className={`${admissionInputClass(Boolean(err.gender))} cursor-pointer appearance-none`}
                            >
                              <option value="">-- Select gender --</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </AdmissionField>

                          <AdmissionField label="B-Form / Birth Certificate No.">
                            <input
                              type="text"
                              placeholder="e.g. 34101-1234567-8"
                              value={f.bformNo}
                              onChange={(e) => updateAdmission('bformNo', e.target.value)}
                              className={admissionInputClass()}
                            />
                          </AdmissionField>

                          <AdmissionField label="Blood Group">
                            <select
                              value={f.bloodGroup}
                              onChange={(e) => updateAdmission('bloodGroup', e.target.value)}
                              className={`${admissionInputClass()} cursor-pointer appearance-none`}
                            >
                              <option value="">-- Select --</option>
                              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                <option key={bg} value={bg}>{bg}</option>
                              ))}
                            </select>
                          </AdmissionField>

                          <AdmissionField label="Nationality">
                            <input
                              type="text"
                              value={f.nationality}
                              onChange={(e) => updateAdmission('nationality', e.target.value)}
                              className={admissionInputClass()}
                            />
                          </AdmissionField>

                          <AdmissionField label="Religion">
                            <input
                              type="text"
                              placeholder="e.g. Islam"
                              value={f.religion}
                              onChange={(e) => updateAdmission('religion', e.target.value)}
                              className={admissionInputClass()}
                            />
                          </AdmissionField>

                          <AdmissionField label="Student Contact No." error={err.studentPhone}>
                            <input
                              type="tel"
                              placeholder="e.g. 03211234567"
                              value={f.studentPhone}
                              onChange={(e) => updateAdmission('studentPhone', e.target.value)}
                              className={admissionInputClass(Boolean(err.studentPhone))}
                            />
                          </AdmissionField>
                        </div>

                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 pt-2">
                          <GraduationCap size={14} className="text-emerald-600" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-slate-950">Admission & Academic Details</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <AdmissionField label="Applying For Class *" error={err.grade}>
                            <select
                              value={f.grade}
                              onChange={(e) => updateAdmission('grade', e.target.value)}
                              className={`${admissionInputClass(Boolean(err.grade))} cursor-pointer appearance-none`}
                            >
                              <option value="">-- Select class --</option>
                              {gradeOptions.map(g => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                              <option value="Other">Other / Not sure</option>
                            </select>
                          </AdmissionField>

                          <AdmissionField label="Section Preference">
                            <select
                              value={f.sectionPreference}
                              onChange={(e) => updateAdmission('sectionPreference', e.target.value)}
                              className={`${admissionInputClass()} cursor-pointer appearance-none`}
                            >
                              <option value="">No preference</option>
                              <option value="A">Section A</option>
                              <option value="B">Section B</option>
                              <option value="C">Section C</option>
                            </select>
                          </AdmissionField>

                          <AdmissionField label="Session">
                            <select
                              value={f.session}
                              onChange={(e) => updateAdmission('session', e.target.value)}
                              className={`${admissionInputClass()} cursor-pointer appearance-none`}
                            >
                              <option value="2026-27">2026-27</option>
                              <option value="2027-28">2027-28</option>
                            </select>
                          </AdmissionField>

                          <AdmissionField label="Admission Category *" error={err.category}>
                            <select
                              value={f.category}
                              onChange={(e) => updateAdmission('category', e.target.value)}
                              className={`${admissionInputClass(Boolean(err.category))} cursor-pointer appearance-none`}
                            >
                              <option value="Regular">Regular School</option>
                              <option value="Academy">Evening Academy</option>
                              <option value="Both">Both (School + Academy)</option>
                            </select>
                          </AdmissionField>

                          {(f.category === 'Academy' || f.category === 'Both') && (
                            <AdmissionField label="Academy Subjects *" error={err.academySubjects} className="md:col-span-2">
                              <input
                                type="text"
                                placeholder="e.g. Physics, Chemistry, Biology"
                                value={f.academySubjects}
                                onChange={(e) => updateAdmission('academySubjects', e.target.value)}
                                className={admissionInputClass(Boolean(err.academySubjects))}
                              />
                            </AdmissionField>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ================= STEP 2 : GUARDIAN ================= */}
                    {admissionStep === 2 && (
                      <div className="space-y-5">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                          <Users size={14} className="text-emerald-600" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-slate-950">Parent / Guardian Details</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <AdmissionField label="Father's Full Name *" error={err.fatherName}>
                            <input
                              type="text"
                              placeholder="e.g. Muhammad Aslam"
                              value={f.fatherName}
                              onChange={(e) => updateAdmission('fatherName', e.target.value)}
                              className={admissionInputClass(Boolean(err.fatherName))}
                            />
                          </AdmissionField>

                          <AdmissionField label="Mother's Full Name">
                            <input
                              type="text"
                              placeholder="e.g. Fatima Aslam"
                              value={f.motherName}
                              onChange={(e) => updateAdmission('motherName', e.target.value)}
                              className={admissionInputClass()}
                            />
                          </AdmissionField>

                          <AdmissionField label="Guardian Name (if different)">
                            <input
                              type="text"
                              placeholder="Leave empty if father/mother is guardian"
                              value={f.guardianName}
                              onChange={(e) => updateAdmission('guardianName', e.target.value)}
                              className={admissionInputClass(Boolean(err.guardianName))}
                            />
                          </AdmissionField>

                          <AdmissionField label="Relationship *" error={err.relationship}>
                            <select
                              value={f.relationship}
                              onChange={(e) => updateAdmission('relationship', e.target.value)}
                              className={`${admissionInputClass(Boolean(err.relationship))} cursor-pointer appearance-none`}
                            >
                              <option value="Father">Father</option>
                              <option value="Mother">Mother</option>
                              <option value="Brother">Brother</option>
                              <option value="Sister">Sister</option>
                              <option value="Uncle">Uncle</option>
                              <option value="Aunt">Aunt</option>
                              <option value="Grandparent">Grandparent</option>
                              <option value="Other">Other</option>
                            </select>
                          </AdmissionField>

                          <AdmissionField label="Primary WhatsApp Number *" error={err.parentPhone}>
                            <input
                              type="tel"
                              placeholder="e.g. 03001234567"
                              value={f.parentPhone}
                              onChange={(e) => updateAdmission('parentPhone', e.target.value)}
                              className={admissionInputClass(Boolean(err.parentPhone))}
                            />
                          </AdmissionField>

                          <AdmissionField label="Alternate Phone" error={err.alternatePhone}>
                            <input
                              type="tel"
                              placeholder="e.g. 03211234567"
                              value={f.alternatePhone}
                              onChange={(e) => updateAdmission('alternatePhone', e.target.value)}
                              className={admissionInputClass(Boolean(err.alternatePhone))}
                            />
                          </AdmissionField>

                          <AdmissionField label="Email Address" error={err.parentEmail}>
                            <input
                              type="email"
                              placeholder="e.g. parent@example.com"
                              value={f.parentEmail}
                              onChange={(e) => updateAdmission('parentEmail', e.target.value)}
                              className={admissionInputClass(Boolean(err.parentEmail))}
                            />
                          </AdmissionField>

                          <AdmissionField label="Parent / Guardian CNIC" error={err.parentCnic}>
                            <input
                              type="text"
                              placeholder="e.g. 34101-1234567-1"
                              value={f.parentCnic}
                              onChange={(e) => updateAdmission('parentCnic', e.target.value)}
                              className={admissionInputClass(Boolean(err.parentCnic))}
                            />
                          </AdmissionField>

                          <AdmissionField label="Occupation">
                            <input
                              type="text"
                              placeholder="e.g. Business / Teacher / Govt. Service"
                              value={f.occupation}
                              onChange={(e) => updateAdmission('occupation', e.target.value)}
                              className={admissionInputClass()}
                            />
                          </AdmissionField>

                          <AdmissionField label="City *" error={err.city}>
                            <input
                              type="text"
                              placeholder="e.g. Islamabad"
                              value={f.city}
                              onChange={(e) => updateAdmission('city', e.target.value)}
                              className={admissionInputClass(Boolean(err.city))}
                            />
                          </AdmissionField>

                          <AdmissionField label="Complete Home Address *" error={err.address} className="md:col-span-2">
                            <textarea
                              rows={2}
                              placeholder="House / street / area"
                              value={f.address}
                              onChange={(e) => updateAdmission('address', e.target.value)}
                              className={`${admissionInputClass(Boolean(err.address))} resize-none`}
                            />
                          </AdmissionField>
                        </div>

                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 pt-2">
                          <Phone size={14} className="text-emerald-600" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-slate-950">Emergency Contact</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <AdmissionField label="Contact Name">
                            <input
                              type="text"
                              placeholder="e.g. Uncle's name"
                              value={f.emergencyName}
                              onChange={(e) => updateAdmission('emergencyName', e.target.value)}
                              className={admissionInputClass()}
                            />
                          </AdmissionField>

                          <AdmissionField label="Emergency Phone" error={err.emergencyPhone}>
                            <input
                              type="tel"
                              placeholder="e.g. 03331234567"
                              value={f.emergencyPhone}
                              onChange={(e) => updateAdmission('emergencyPhone', e.target.value)}
                              className={admissionInputClass(Boolean(err.emergencyPhone))}
                            />
                          </AdmissionField>

                          <AdmissionField label="Relation">
                            <input
                              type="text"
                              placeholder="e.g. Uncle"
                              value={f.emergencyRelation}
                              onChange={(e) => updateAdmission('emergencyRelation', e.target.value)}
                              className={admissionInputClass()}
                            />
                          </AdmissionField>
                        </div>
                      </div>
                    )}

                    {/* ================= STEP 3 : BACKGROUND & HEALTH ================= */}
                    {admissionStep === 3 && (
                      <div className="space-y-5">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                          <BookOpen size={14} className="text-emerald-600" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-slate-950">Previous School & Academic History</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <AdmissionField label="Previous School Name">
                            <input
                              type="text"
                              placeholder="e.g. City Public School"
                              value={f.previousSchool}
                              onChange={(e) => updateAdmission('previousSchool', e.target.value)}
                              className={admissionInputClass()}
                            />
                          </AdmissionField>

                          <AdmissionField label="Last Class Completed">
                            <input
                              type="text"
                              placeholder="e.g. Class 7"
                              value={f.previousClass}
                              onChange={(e) => updateAdmission('previousClass', e.target.value)}
                              className={admissionInputClass()}
                            />
                          </AdmissionField>

                          <AdmissionField label="Last Result / Percentage">
                            <input
                              type="text"
                              placeholder="e.g. 85% / A Grade"
                              value={f.lastResult}
                              onChange={(e) => updateAdmission('lastResult', e.target.value)}
                              className={admissionInputClass()}
                            />
                          </AdmissionField>

                          <AdmissionField label="Transfer Certificate">
                            <select
                              value={f.transferCertificate}
                              onChange={(e) => updateAdmission('transferCertificate', e.target.value)}
                              className={`${admissionInputClass()} cursor-pointer appearance-none`}
                            >
                              <option value="">-- Select --</option>
                              <option value="Yes">Yes, available</option>
                              <option value="No">No</option>
                              <option value="Will provide later">Will provide later</option>
                            </select>
                          </AdmissionField>
                        </div>

                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 pt-2">
                          <Shield size={14} className="text-emerald-600" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-slate-950">Health, Transport & Additional Information</span>
                        </div>

                        <AdmissionField label="Medical Conditions / Allergies">
                          <textarea
                            rows={2}
                            placeholder="e.g. Asthma, peanut allergy — write 'None' if not applicable"
                            value={f.medicalConditions}
                            onChange={(e) => updateAdmission('medicalConditions', e.target.value)}
                            className={`${admissionInputClass()} resize-none`}
                          />
                        </AdmissionField>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <AdmissionField label="School Transport Required? *" error={err.transportRequired}>
                            <select
                              value={f.transportRequired}
                              onChange={(e) => updateAdmission('transportRequired', e.target.value)}
                              className={`${admissionInputClass(Boolean(err.transportRequired))} cursor-pointer appearance-none`}
                            >
                              <option value="">-- Select --</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </AdmissionField>

                          {f.transportRequired === 'Yes' && (
                            <AdmissionField label="Pickup Area / Stop *" error={err.pickupArea}>
                              <input
                                type="text"
                                placeholder="e.g. G-11 Markaz"
                                value={f.pickupArea}
                                onChange={(e) => updateAdmission('pickupArea', e.target.value)}
                                className={admissionInputClass(Boolean(err.pickupArea))}
                              />
                            </AdmissionField>
                          )}

                          <AdmissionField label="Sibling Already at NSB1? *" error={err.siblingAtSchool}>
                            <select
                              value={f.siblingAtSchool}
                              onChange={(e) => updateAdmission('siblingAtSchool', e.target.value)}
                              className={`${admissionInputClass(Boolean(err.siblingAtSchool))} cursor-pointer appearance-none`}
                            >
                              <option value="">-- Select --</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </AdmissionField>

                          {f.siblingAtSchool === 'Yes' && (
                            <AdmissionField label="Sibling Name(s) & Class">
                              <input
                                type="text"
                                placeholder="e.g. Ahmed Ali — Class 5"
                                value={f.siblingNames}
                                onChange={(e) => updateAdmission('siblingNames', e.target.value)}
                                className={admissionInputClass()}
                              />
                            </AdmissionField>
                          )}

                          <AdmissionField label="How Did You Hear About NSB1?">
                            <select
                              value={f.hearAboutUs}
                              onChange={(e) => updateAdmission('hearAboutUs', e.target.value)}
                              className={`${admissionInputClass()} cursor-pointer appearance-none`}
                            >
                              <option value="">-- Select --</option>
                              <option value="Friend / Family">Friend / Family</option>
                              <option value="Social Media">Social Media</option>
                              <option value="Existing Parent">Existing Parent</option>
                              <option value="Walk-in / Banner">Walk-in / Banner</option>
                              <option value="Other">Other</option>
                            </select>
                          </AdmissionField>
                        </div>

                        <AdmissionField label="Additional Notes / Requirements">
                          <textarea
                            rows={3}
                            placeholder="Any special requests, learning support needs, or subject preferences..."
                            value={f.notes}
                            onChange={(e) => updateAdmission('notes', e.target.value)}
                            className={`${admissionInputClass()} resize-none`}
                          />
                        </AdmissionField>

                        <label className={`flex items-start gap-3 p-4 border cursor-pointer transition-all ${err.consent ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                          <input
                            type="checkbox"
                            checked={f.consent}
                            onChange={(e) => updateAdmission('consent', e.target.checked)}
                            className="mt-0.5 w-4 h-4 accent-emerald-600 shrink-0"
                          />
                          <span className="text-[11px] font-bold text-slate-600 leading-relaxed">
                            I declare that all the information provided above is correct. I agree that the school may contact me on the given numbers and that admission is subject to the school's assessment and policy.
                          </span>
                        </label>
                        {err.consent && <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">{err.consent}</p>}
                      </div>
                    )}

                    {err.submit && (
                      <p className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 p-3">{err.submit}</p>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      {admissionStep > 1 && (
                        <button
                          type="button"
                          onClick={() => setAdmissionStep(admissionStep - 1)}
                          className="px-5 py-4 bg-slate-100 text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                        >
                          <ChevronLeft size={14} /> Back
                        </button>
                      )}

                      {admissionStep < 3 ? (
                        <motion.button
                          whileHover={{ scale: 1.01, translateY: -1 }}
                          whileTap={{ scale: 0.99 }}
                          type="button"
                          onClick={() => goToAdmissionStep(admissionStep + 1)}
                          className="flex-1 py-4 bg-slate-950 text-white font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 hover:bg-emerald-600 shadow-2xl"
                        >
                          Continue <ChevronRight size={14} />
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.01, translateY: -1 }}
                          whileTap={{ scale: 0.99 }}
                          type="submit"
                          disabled={admissionSubmitting}
                          className="flex-1 py-4 bg-emerald-600 text-white font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 hover:bg-emerald-700 shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {admissionSubmitting ? 'Submitting...' : 'Submit Application'}
                          <Send size={14} />
                        </motion.button>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">
                      Step {admissionStep} of 3 • Fields marked * are required
                    </p>
                  </form>
                )}
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      {/* ========== MODERN FOOTER ========== */}
      <footer className="bg-slate-950 text-white py-16 md:py-20 px-4 sm:px-6 md:px-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-16 mb-16 md:mb-20">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="NSB1 Logo" className="h-12 w-auto object-contain rounded-lg bg-white p-1.5 shadow-lg" referrerPolicy="no-referrer" />
                <span className="font-black text-xl tracking-tighter uppercase">NSB1</span>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed font-bold uppercase tracking-wider">
                Developing Scholars, Creating Legacies since 2012. We are committed to nurturing the next generation of global citizens.
              </p>
            </div>
            
            <div className="space-y-6">
              <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Navigation</h5>
              <ul className="space-y-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <li><button onClick={() => handleNavClick('home')} className="hover:text-white transition-colors cursor-pointer">Home Campus</button></li>
                <li><button onClick={() => handleNavClick('academics')} className="hover:text-white transition-colors cursor-pointer">Curriculum</button></li>
                <li><button onClick={() => handleNavClick('mentors')} className="hover:text-white transition-colors cursor-pointer">Faculty</button></li>
                <li><button onClick={() => handleNavClick('admissions')} className="hover:text-white transition-colors cursor-pointer">Enrolment</button></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Portals</h5>
              <ul className="space-y-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <li><button onClick={onEnterPortal} className="hover:text-white transition-colors text-left uppercase cursor-pointer">Principal Dashboard</button></li>
                <li><button onClick={onEnterPortal} className="hover:text-white transition-colors text-left uppercase cursor-pointer">Faculty Portal</button></li>
                <li><button onClick={onEnterPortal} className="hover:text-white transition-colors text-left uppercase cursor-pointer">Student Campus</button></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Connect</h5>
              <div className="flex gap-4">
                {[Phone, Mail, Globe].map((Icon, i) => (
                  <div key={i} className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer">
                    <Icon size={18} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.4em] text-slate-600 text-center">
              © 2012-2026 Principal Campus Management Center.
            </p>
            <div className="flex gap-8 text-[11px] font-black uppercase tracking-[0.4em] text-slate-600">
              <a href="#" className="hover:text-white">Privacy</a>
              <a href="#" className="hover:text-white">Terms</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
