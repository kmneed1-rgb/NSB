import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Users, Award, Shield, ArrowRight, CheckCircle2, 
  MapPin, Phone, Mail, Clock, Calendar, Sparkles, Send, Info,
  GraduationCap, Laptop, Book, Globe, ShieldCheck, Trophy
} from 'lucide-react';
import { Teacher, Student, Class } from '../types';

interface LandingPageProps {
  teachers: Teacher[];
  students: Student[];
  classes: Class[];
  onEnterPortal: () => void;
}

export default function LandingPage({ teachers, students, classes, onEnterPortal }: LandingPageProps) {
  // Inquiry form states
  const [studentName, setStudentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('Grade 9');
  const [messageText, setMessageText] = useState('');
  const [inquirySubmitted, setInquirySubmitted] = useState(false);

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !parentPhone.trim()) {
      alert('Please fill in Student Name and Contact Phone number.');
      return;
    }
    setInquirySubmitted(true);
    // Auto-reset after a moment
    setTimeout(() => {
      setInquirySubmitted(false);
      setStudentName('');
      setParentEmail('');
      setParentPhone('');
      setMessageText('');
    }, 5000);
  };

  return (
    <div className="bg-white text-slate-900 font-sans antialiased min-h-screen flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* ========== PREMIUM NAVIGATION ========== */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 md:px-12 py-4 flex items-center justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <img 
            src="/logo.png" 
            alt="NSB1 School" 
            className="h-10 w-auto object-contain hover:scale-105 transition-transform"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col">
            <span className="font-black text-slate-950 text-xl tracking-tighter uppercase leading-none">
              NSB1
            </span>
            <span className="text-[10px] tracking-[0.4em] font-black text-emerald-600 uppercase">
              School
            </span>
          </div>
        </motion.div>

        {/* Desktop Navbar - Sophisticated Typography */}
        <nav className="hidden lg:flex items-center gap-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
          {['Home', 'Academics', 'Mentors', 'Admissions'].map((item) => (
            <a 
              key={item}
              href={`#${item.toLowerCase()}`} 
              className="hover:text-emerald-600 transition-all relative group"
            >
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-600 transition-all group-hover:w-full"></span>
            </a>
          ))}
        </nav>

        <motion.button
          whileHover={{ scale: 1.02, translateY: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={onEnterPortal}
          className="py-3 px-8 bg-slate-950 text-white font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-xl shadow-slate-200 hover:bg-emerald-600 hover:shadow-emerald-200"
        >
          Portal Login
        </motion.button>
      </header>

      <main>
        {/* ========== IMMERSIVE HERO SECTION ========== */}
        <section id="home" className="relative pt-24 pb-32 px-6 md:px-12 overflow-hidden">
          {/* Refined Background Elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl -z-10 overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-50/50 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-slate-50 rounded-full blur-[100px]"></div>
          </div>

          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-10"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Excellence Redefined</span>
                </div>

                <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter leading-[0.9] text-slate-950 uppercase">
                  Shaping<br/>
                  <span className="text-emerald-600">The Future</span><br/>
                  of Leaders.
                </h1>
                
                <p className="text-slate-500 text-lg md:text-xl max-w-xl leading-relaxed font-medium">
                  NSB1 School integrates rigorous academic standards with advanced digital systems, fostering an environment where curiosity meets modern capability.
                </p>

                <div className="flex flex-col sm:flex-row gap-5 pt-6">
                  <motion.button
                    whileHover={{ scale: 1.05, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onEnterPortal}
                    className="px-12 py-5 bg-emerald-600 text-white font-black text-[11px] uppercase tracking-[0.4em] transition-all shadow-2xl shadow-emerald-200 flex items-center justify-center gap-2"
                  >
                    Enter Portal
                    <ArrowRight size={14} />
                  </motion.button>
                  <motion.a
                    whileHover={{ scale: 1.05, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    href="#academics"
                    className="px-12 py-5 border-2 border-slate-950 text-slate-950 hover:bg-slate-950 hover:text-white font-black text-[11px] uppercase tracking-[0.4em] transition-all flex items-center justify-center"
                  >
                    View Programs
                  </motion.a>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="relative hidden lg:block"
              >
                <div className="aspect-square bg-slate-50 rounded-[4rem] border border-slate-100 overflow-hidden relative shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100/20 to-transparent"></div>
                  <div className="absolute inset-0 flex items-center justify-center p-20">
                    <img 
                      src="/logo.png" 
                      alt="NSB1 Logo Large" 
                      className="w-full h-auto object-contain opacity-20 grayscale"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  {/* Floating Metric Cards */}
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-10 right-10 bg-white p-6 shadow-xl rounded-2xl border border-slate-100"
                  >
                    <div className="text-emerald-600 font-black text-2xl">98%</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Board Pass Rate</div>
                  </motion.div>

                  <motion.div 
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-20 left-[-20px] bg-slate-950 p-6 shadow-xl rounded-2xl border border-slate-800"
                  >
                    <div className="text-white font-black text-2xl">12+</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Specialized Labs</div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ========== ACADEMIC BENTO GRID ========== */}
        <section id="academics" className="py-32 px-6 md:px-12 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
              <div className="max-w-2xl">
                <h2 className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.5em] mb-4">Academic Streams</h2>
                <h3 className="text-4xl md:text-5xl font-black text-slate-950 uppercase tracking-tighter leading-tight">
                  Curated Programs for<br/>Every Stage of Growth.
                </h3>
              </div>
              <p className="text-slate-500 font-medium max-w-sm mb-2 text-sm leading-relaxed">
                From foundational primary education to advanced matriculation prep, we provide the environment for students to excel.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Primary - Large Bento Item */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="md:col-span-8 bg-white p-10 border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group min-h-[400px] flex flex-col justify-between"
              >
                <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mb-10 shadow-lg shadow-emerald-100">
                    <BookOpen size={28} />
                  </div>
                  <h4 className="text-3xl font-black text-slate-950 uppercase tracking-tighter mb-4">Primary Foundation</h4>
                  <p className="text-slate-500 text-lg leading-relaxed max-w-md">
                    Cultivating literacy, numeracy, and critical thinking skills in a vibrant, supportive environment for Grades 1 through 8.
                  </p>
                </div>
                <div className="relative z-10 flex items-center gap-6">
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
                className="md:col-span-4 bg-slate-950 p-10 shadow-2xl relative overflow-hidden group min-h-[400px] flex flex-col justify-between"
              >
                <div className="absolute inset-0 bg-emerald-600/10 group-hover:bg-emerald-600/20 transition-colors"></div>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-white text-slate-950 rounded-2xl flex items-center justify-center mb-10">
                    <ShieldCheck size={28} />
                  </div>
                  <h4 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Secondary Excellence</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Intensive matriculation preparation with a focus on science, mathematics, and high-performance laboratory work.
                  </p>
                </div>
                <div className="relative z-10">
                  <div className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4">Science / Arts Streams</div>
                  <button className="flex items-center gap-2 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:text-emerald-400 transition-colors">
                    Explore Matrix <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>

              {/* Academy - Third Bento Item */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="md:col-span-12 bg-emerald-600 p-10 shadow-xl relative overflow-hidden group min-h-[300px] flex items-center"
              >
                <div className="absolute right-0 bottom-0 p-10 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                  <Trophy size={300} strokeWidth={1} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative z-10 w-full">
                  <div className="space-y-6">
                    <h4 className="text-3xl font-black text-white uppercase tracking-tighter">NSB1 Academy Prep</h4>
                    <p className="text-emerald-50 text-lg leading-relaxed max-w-md">
                      Specialized evening coaching designed for conceptual mastery and top-tier board exam results.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer'].map(sub => (
                      <div key={sub} className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
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
        <section id="mentors" className="py-32 px-6 md:px-12 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
              <h2 className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.5em] mb-4">Our Commitment</h2>
              <h3 className="text-4xl md:text-5xl font-black text-slate-950 uppercase tracking-tighter leading-tight">
                Pedagogical Excellence.
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                { title: 'Certified Academics', desc: 'Faculty members hold advanced credentials and undergo rigorous pedagogical training cycles.', icon: Award, accent: 'emerald' },
                { title: 'Mentorship Focus', desc: 'Each student is assigned a personal academic mentor to track holistic development.', icon: Users, accent: 'slate' },
                { title: 'Tech-First Learning', desc: 'Integrating smart classroom technology for an interactive, data-driven experience.', icon: Laptop, accent: 'indigo' }
              ].map((item, idx) => (
                <motion.div 
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="group"
                >
                  <div className="mb-8 relative">
                    <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-900 group-hover:bg-emerald-600 group-hover:text-white group-hover:scale-110 transition-all duration-500 shadow-sm">
                      <item.icon size={28} />
                    </div>
                  </div>
                  <h4 className="text-xl font-black text-slate-950 uppercase tracking-tighter mb-4">{item.title}</h4>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium">
                    {item.desc}
                  </p>
                  <div className="h-0.5 w-12 bg-slate-100 group-hover:w-full group-hover:bg-emerald-600 transition-all duration-500"></div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== DIRECTORY METRICS ========== */}
        <section className="bg-slate-50 py-24 px-6 md:px-12 border-y border-slate-100">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                { label: 'Faculty Members', val: teachers.length, icon: GraduationCap },
                { label: 'Students Enrolled', val: students.length, icon: Users },
                { label: 'Active Classrooms', val: classes.length, icon: Globe }
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center text-center space-y-4">
                  <div className="text-slate-200"><stat.icon size={48} strokeWidth={1} /></div>
                  <div className="text-5xl font-black text-slate-950 tracking-tighter">{stat.val}</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== PREMIUM ADMISSION PORTAL (FORM) ========== */}
        <section id="admissions" className="py-32 px-6 md:px-12 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-20 items-center">
            
            <div className="lg:col-span-5 space-y-8">
              <div className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 text-[11px] font-black uppercase tracking-widest rounded-full">
                Session 2026-27 Open
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-950 uppercase tracking-tighter leading-tight">
                Secure Your Path<br/>to Academic Success.
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed font-medium">
                Submit an inquiry today to receive our comprehensive digital prospectus and fee structure blueprints.
              </p>

              <div className="space-y-6 pt-6">
                {[
                  { icon: Phone, label: 'Principal Office', val: '+92 (051) nsb1-school' },
                  { icon: Mail, label: 'Inquiry Support', val: 'queries@nsb1-school.edu' },
                  { icon: MapPin, label: 'Campus Address', val: 'NSB1 Building, Academy Blvd, PK' }
                ].map(info => (
                  <div key={info.label} className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-900 shadow-sm">
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
                className="bg-white border border-slate-100 shadow-2xl p-10 md:p-12 relative"
              >
                <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600"></div>
                
                <div className="mb-10">
                  <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tighter mb-2">Digital Inquiry Portal</h3>
                  <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Registration & Information Request</p>
                </div>

                {inquirySubmitted ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-50 border border-emerald-100 p-12 text-center space-y-6"
                  >
                    <div className="w-20 h-20 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-100">
                      <CheckCircle2 size={40} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-black text-emerald-950 uppercase tracking-tighter">Inquiry Received</h4>
                      <p className="text-sm text-emerald-800 font-medium">
                        Thank you for your interest. Our admissions counselor will contact you shortly to guide you through the enrollment matrix.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleInquirySubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Student Complete Name</label>
                        <input
                          type="text"
                          required
                          placeholder="John Doe"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white p-4 text-xs font-bold outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Parent Contact Index</label>
                        <input
                          type="tel"
                          required
                          placeholder="+92 3XX XXXXXXX"
                          value={parentPhone}
                          onChange={(e) => setParentPhone(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white p-4 text-xs font-bold outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Admission Grade</label>
                      <select
                        value={selectedGrade}
                        onChange={(e) => setSelectedGrade(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white p-4 text-xs font-bold outline-none cursor-pointer transition-all appearance-none"
                      >
                        <option value="Prep">Kindergarten / Prep</option>
                        <option value="Primary">Primary (1 - 5)</option>
                        <option value="Middle">Middle (6 - 8)</option>
                        <option value="Secondary">Secondary (9 - 10)</option>
                        <option value="Academy">Evening Academy</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Additional Requirements</label>
                      <textarea
                        rows={4}
                        placeholder="Specify custom requirements or subject preferences..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white p-4 text-xs font-bold outline-none transition-all resize-none"
                      />
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.01, translateY: -2 }}
                      whileTap={{ scale: 0.99 }}
                      type="submit"
                      className="w-full py-5 bg-slate-950 text-white font-black text-[11px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 hover:bg-emerald-600 shadow-2xl"
                    >
                      Process Inquiry
                      <Send size={14} />
                    </motion.button>
                  </form>
                )}
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      {/* ========== REFINED FOOTER ========== */}
      <footer className="bg-slate-950 text-white py-20 px-6 md:px-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="NSB1 Logo" className="h-10 w-auto brightness-0 invert" referrerPolicy="no-referrer" />
                <span className="font-black text-xl tracking-tighter uppercase">NSB1</span>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed font-bold uppercase tracking-wider">
                Developing Scholars, Creating Legacies since 2012. We are committed to nurturing the next generation of global citizens.
              </p>
            </div>
            
            <div className="space-y-6">
              <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Navigation</h5>
              <ul className="space-y-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <li><a href="#home" className="hover:text-white transition-colors">Home Campus</a></li>
                <li><a href="#academics" className="hover:text-white transition-colors">Curriculum</a></li>
                <li><a href="#mentors" className="hover:text-white transition-colors">Faculty</a></li>
                <li><a href="#admissions" className="hover:text-white transition-colors">Enrolment</a></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Portals</h5>
              <ul className="space-y-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <li><button onClick={onEnterPortal} className="hover:text-white transition-colors text-left uppercase">Principal Dashboard</button></li>
                <li><button onClick={onEnterPortal} className="hover:text-white transition-colors text-left uppercase">Faculty Portal</button></li>
                <li><button onClick={onEnterPortal} className="hover:text-white transition-colors text-left uppercase">Student Campus</button></li>
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
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-600">
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

