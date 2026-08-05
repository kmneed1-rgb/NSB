import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Users, Award, Shield, ArrowRight, CheckCircle2, 
  MapPin, Phone, Mail, Clock, Calendar, Sparkles, Send, Info,
  GraduationCap
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
      setStudentName('');
      setParentEmail('');
      setParentPhone('');
      setMessageText('');
    }, 5000);
  };

  return (
    <div className="bg-slate-50 text-slate-900 font-sans antialiased min-h-screen flex flex-col">
      
      {/* ========== LANDING NAVIGATION HEADER ========== */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 md:px-12 py-3 flex items-center justify-between shadow-sm">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <img 
            src="/logo.png" 
            alt="NSB1 School" 
            className="h-10 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
          <span className="font-black text-slate-900 text-lg tracking-tighter uppercase flex flex-col leading-none">
            NSB1 <span className="text-[10px] tracking-[0.3em] font-bold text-indigo-600">School</span>
          </span>
        </motion.div>

        {/* Desktop Navbar items */}
        <nav className="hidden lg:flex items-center gap-10 text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">
          <a href="#hero" className="hover:text-indigo-600 transition-colors">Home</a>
          <a href="#academics" className="hover:text-indigo-600 transition-colors">Academics</a>
          <a href="#stats" className="hover:text-indigo-600 transition-colors">Directory</a>
          <a href="#inquiry" className="hover:text-indigo-600 transition-colors">Admission</a>
        </nav>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onEnterPortal}
          className="py-2.5 px-8 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer hover:shadow-lg hover:bg-indigo-700"
        >
          Portal Login
        </motion.button>
      </header>

      {/* ========== HERO SECTION (POLISHED) ========== */}
      <section id="hero" className="relative bg-white text-slate-900 pt-32 pb-32 px-6 md:px-12 overflow-hidden border-b border-slate-100">
        {/* Background Mesh/Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-50 rounded-full blur-[120px] opacity-60"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[100px] opacity-40"></div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-10 max-w-4xl w-full"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Excellence Redefined</span>
            </div>

            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.8] text-slate-950 uppercase ">
              Empowering<br/>
              <span className="text-indigo-600 not-">Scholars.</span>
            </h1>
            
            <p className="text-slate-500 text-sm md:text-lg max-w-lg leading-relaxed font-medium mx-auto lg:mx-0">
              NSB1 School delivers first-class academic excellence in Gujranwala. We combine digital portal efficiency with rigorous traditional standards to prepare the next generation.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onEnterPortal}
                className="px-12 py-4 bg-slate-950 hover:bg-indigo-600 text-white font-black text-[11px] uppercase tracking-[0.4em] transition-all shadow-2xl shadow-indigo-200"
              >
                Access Portal
              </motion.button>
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="#academics"
                className="px-12 py-4 border-2 border-slate-950 text-slate-950 hover:bg-slate-50 font-black text-[11px] uppercase tracking-[0.4em] transition-all"
              >
                View Streams
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>


      {/* ========== ACADEMIC PROGRAM HIGHLIGHTS (MINIMAL) ========== */}
      <section id="academics" className="py-24 px-6 md:px-12 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20 text-center"
          >
            <h2 className="text-sm font-bold uppercase tracking-[0.4em] text-slate-400 mb-4">Academic Streams</h2>
            <div className="h-px w-20 bg-indigo-600 mx-auto"></div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { id: '01', title: 'Primary Foundation', desc: 'Focusing on fundamental literacy and numeracy with a modern pedagogical approach.', range: 'Grades 1-8' },
              { id: '02', title: 'Secondary Excellence', desc: 'Customized matriculation prep with advanced science and computational labs.', range: 'Grades 9-10' },
              { id: '03', title: 'Academy Revision', desc: 'Evening coaching and conceptual refinement for board-level preparation.', range: 'Academy Prep' }
            ].map((stream, idx) => (
              <motion.div 
                key={stream.id} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.2 }}
                className="group cursor-default p-4 border border-transparent hover:border-slate-100 hover:bg-white transition-all duration-300"
              >
                <span className="block text-[10px] font-bold text-indigo-600 mb-6 tracking-[0.2em]">{stream.id} / STREAM</span>
                <h3 className="text-2xl font-black text-slate-950 mb-4 uppercase tracking-tighter group-hover:text-indigo-600 transition-colors uppercase">{stream.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">{stream.desc}</p>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 border-t border-slate-200 pt-4 block">{stream.range}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TEACHER QUALITY ========== */}
      <section id="teachers" className="py-24 px-6 md:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20 text-center"
          >
            <h2 className="text-sm font-bold uppercase tracking-[0.4em] text-slate-400 mb-4">Our Commitment</h2>
            <div className="h-px w-20 bg-indigo-600 mx-auto"></div>
            <h3 className="text-3xl font-black text-slate-950 mt-6 uppercase tracking-tighter">Excellence in Pedagogy</h3>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { title: 'Certified Academics', desc: 'All faculty hold advanced degrees and are certified in modern instructional methods.', icon: Award, color: 'emerald' },
              { title: 'Mentorship Focus', desc: 'Our teachers act as mentors, guiding students through academic and personal growth.', icon: Users, color: 'indigo' },
              { title: 'Continuous Learning', desc: 'Faculty engage in weekly professional development workshops to stay current.', icon: Sparkles, color: 'amber' }
            ].map((quality, idx) => {
              const colorClasses = {
                emerald: 'hover:border-emerald-100 hover:bg-emerald-50/30 bg-emerald-100 text-emerald-600',
                indigo: 'hover:border-indigo-100 hover:bg-indigo-50/30 bg-indigo-100 text-indigo-600',
                amber: 'hover:border-amber-100 hover:bg-amber-50/30 bg-amber-100 text-amber-600',
              }[quality.color] || 'hover:border-indigo-100 hover:bg-indigo-50/30 bg-indigo-100 text-indigo-600';

              return (
                <motion.div 
                  key={quality.title} 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.2 }}
                  className={`group p-6 border border-slate-100 transition-all duration-300 ${colorClasses.split(' ').slice(0, 2).join(' ')}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform ${colorClasses.split(' ').slice(2).join(' ')}`}>
                    <quality.icon size={24} />
                  </div>
                  <h3 className="text-xl font-black text-slate-950 mb-4 uppercase tracking-tighter text-center">{quality.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed text-center">{quality.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== REAL-TIME DIRECTORY (METRICS) ========== */}
      <section id="stats" className="bg-slate-50 py-24 px-6 md:px-12 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { label: 'Faculty Members', val: teachers.length, icon: Users },
              { label: 'Students Enrolled', val: students.length, icon: BookOpen },
              { label: 'Active Classrooms', val: classes.length, icon: Shield }
            ].map((stat, idx) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.2 }}
                whileHover={{ y: -5 }}                
                className="bg-white p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all rounded-none flex items-start gap-4"
              >
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                  <stat.icon size={24} />
                </div>
                <div>
                  <div className="text-4xl font-black mb-1">{stat.val}</div>
                  <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ========== ADMISSION REQUEST / INQUIRY FORM ========== */}
      <section id="inquiry" className="py-16 px-4 md:px-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        <div className="lg:col-span-6 space-y-6">
          <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest block mb-1">Admissions Open 2026-27</span>
          <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 uppercase tracking-wide">
            Request Campus Prospectus &amp; Details
          </h2>
          <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
            Fill out this quick inquiry form to receive our program details, fee maps, and private academy scheduling options. Our principal office will connect with your provided contact credentials.
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                <Phone size={14} />
              </div>
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wide">Call Principal Office</span>
                <span className="text-xs md:text-sm text-slate-800 font-bold">+92 (051) nsb1-school</span>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                <Mail size={14} />
              </div>
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wide">Direct Email Queries</span>
                <span className="text-xs md:text-sm text-slate-800 font-bold">queries@nsb1-school.edu</span>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                <MapPin size={14} />
              </div>
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wide">Campus Location</span>
                <span className="text-xs md:text-sm text-slate-800 font-bold">NSB1 Building, Academy Boulevard, Capital Ring Road, PK</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <motion.div 
            whileHover={{ y: -5 }}                
            className="bg-white border border-slate-200/90 shadow-sm p-6 md:p-8 rounded-none border-t-4 border-t-indigo-600"
          >
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Send size={14} className="text-indigo-600" />
              Inquiry / Admission Query Form
            </h3>

            {inquirySubmitted ? (
              <div className="bg-emerald-50 border border-emerald-150 p-6 text-center rounded-xl space-y-3 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
                  ✓
                </div>
                <h4 className="font-bold text-emerald-950 uppercase tracking-wide text-xs">Inquiry Registered Successfully!</h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Thank you! Our admission counselors will trace the parent contact index and phone you back shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">Student Complete Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter candidate's full name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white p-2.5 rounded outline-hidden transition-all text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">Parent Email Coordinates</label>
                    <input
                      type="email"
                      placeholder="e.g. parent@email.com"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white p-2.5 rounded outline-hidden transition-all text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">Contact Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +923123456789"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white p-2.5 rounded outline-hidden transition-all text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">Desired Admission Stream / Class Grade</label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white p-2.5 rounded outline-hidden transition-all text-xs font-bold"
                  >
                    <option value="Prep Block">Prep Block / Kindergarten</option>
                    <option value="Grade 1 - 5">Primary Segment (Grade 1 - 5)</option>
                    <option value="Grade 6 - 8">Middle Segment (Grade 6 - 8)</option>
                    <option value="Grade 9">Grade 9 (Matric Secondary)</option>
                    <option value="Grade 10">Grade 10 (Matric Secondary)</option>
                    <option value="Evening Prep Academy">Evening Academy Coaching</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">Additional Directives / Custom Message</label>
                  <textarea
                    rows={3}
                    placeholder="Specify physical queries, timing adjustments or custom subject options here..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white p-2.5 rounded outline-hidden transition-all text-xs min-h-[70px]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase tracking-widest transition-all rounded shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Submit Prospectus Query
                  <ArrowRight size={13} />
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </section>


      {/* ========== FOOTER ========== */}
      <footer className="mt-auto bg-slate-900 border-t-4 border-indigo-600 text-slate-400 py-10 px-4 md:px-8 text-xs font-semibold">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          
          <div className="space-y-1">
            <span className="font-extrabold text-white text-sm uppercase tracking-wide block">
              NSB1 School &amp; Academy
            </span>
            <p className="text-[10px] text-slate-500 tracking-wider uppercase font-extrabold">
              Developing Scholars, Creating Legacies since 2012.
            </p>
          </div>

          <div className="text-[10px] text-slate-400">
            © 2012-2026 Principal Campus Management Center. All rights reserved.
          </div>

          <div>
            <button 
              onClick={onEnterPortal}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 uppercase tracking-widest font-extrabold border-b border-indigo-500/30 pb-0.5 cursor-pointer"
            >
              Sign In to Acadamis Portal →
            </button>
          </div>
          
        </div>
      </footer>

    </div>
  );
}
