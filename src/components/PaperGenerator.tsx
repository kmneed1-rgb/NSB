import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Loader2, Printer, Sparkles } from 'lucide-react';
import { AppSettings, Class } from '../types';
import { generateExamPaper, GeneratedPaper } from '../lib/geminiPaper';
import { getGeminiApiKey } from '../lib/appControl';

interface PaperGeneratorProps {
  classes: Class[];
  defaultSubject?: string;
  appSettings: AppSettings;
}

export default function PaperGenerator({ classes, defaultSubject, appSettings }: PaperGeneratorProps) {
  const apiKey = getGeminiApiKey(appSettings);
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [subject, setSubject] = useState(defaultSubject || classes[0]?.subjects?.[0] || 'Mathematics');
  const [examTitle, setExamTitle] = useState('Mid Term Examination');
  const [topics, setTopics] = useState('');
  const [language, setLanguage] = useState<'English' | 'Urdu'>('English');
  const [mcqCount, setMcqCount] = useState(5);
  const [shortCount, setShortCount] = useState(5);
  const [longCount, setLongCount] = useState(2);
  const [totalMarks, setTotalMarks] = useState(50);
  const [duration, setDuration] = useState('1 hour 30 minutes');
  const [busy, setBusy] = useState(false);
  const [paper, setPaper] = useState<GeneratedPaper | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  const selectedClass = useMemo(
    () => classes.find(c => c.id === classId),
    [classes, classId]
  );
  const classLabel = selectedClass
    ? `${selectedClass.className} ${selectedClass.section}`.trim()
    : 'All Classes';

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
      toast.error('Developer se Gemini API set karein.');
      return;
    }
    setBusy(true);
    try {
      const result = await generateExamPaper({
        apiKey,
        className: classLabel,
        subject: subject.trim() || 'General',
        examTitle: examTitle.trim() || 'Examination',
        topics: topics.trim(),
        language,
        mcqCount: Math.max(0, Number(mcqCount) || 0),
        shortCount: Math.max(0, Number(shortCount) || 0),
        longCount: Math.max(0, Number(longCount) || 0),
        totalMarks: Math.max(1, Number(totalMarks) || 50),
        duration: duration.trim() || '1 hour',
      });
      setPaper(result);
      setShowAnswers(false);
      toast.success('Paper generated. Print or review the answer key.');
    } catch (err: any) {
      toast.error(err?.message || 'Paper generate nahi ho saka.');
    } finally {
      setBusy(false);
    }
  };

  if (!apiKey) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-8 text-center">
        <FileText className="mx-auto mb-3 text-amber-600" />
        <h3 className="text-sm font-black uppercase tracking-widest text-amber-900">Gemini API required</h3>
        <p className="mt-2 text-sm text-amber-800">Developer se Gemini API set karein.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleGenerate} className="bg-white border border-slate-200 p-6 space-y-4 print:hidden">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-50 border border-indigo-100">
            <Sparkles size={18} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">AI Paper Generator</h2>
            <p className="text-xs text-slate-500">Gemini se exam paper aur answer key banayein.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Class</span>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 text-sm font-bold outline-none"
            >
              {classes.length === 0 && <option value="">No classes</option>}
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.className} {c.section}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 text-sm font-bold outline-none"
              required
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exam title</span>
            <input
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 text-sm font-bold outline-none"
              required
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'English' | 'Urdu')}
              className="w-full p-3 bg-slate-50 border border-slate-200 text-sm font-bold outline-none"
            >
              <option value="English">English</option>
              <option value="Urdu">Urdu</option>
            </select>
          </label>
        </div>

        <label className="space-y-1 block">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Topics / chapters</span>
          <textarea
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            rows={3}
            placeholder="e.g. Algebra, Linear equations, Word problems"
            className="w-full p-3 bg-slate-50 border border-slate-200 text-sm outline-none"
          />
        </label>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">MCQs</span>
            <input type="number" min={0} value={mcqCount} onChange={(e) => setMcqCount(Number(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 text-sm font-bold" />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Short</span>
            <input type="number" min={0} value={shortCount} onChange={(e) => setShortCount(Number(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 text-sm font-bold" />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Long</span>
            <input type="number" min={0} value={longCount} onChange={(e) => setLongCount(Number(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 text-sm font-bold" />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total marks</span>
            <input type="number" min={1} value={totalMarks} onChange={(e) => setTotalMarks(Number(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 text-sm font-bold" />
          </label>
          <label className="space-y-1 col-span-2 md:col-span-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time</span>
            <input value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 text-sm font-bold" />
          </label>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {busy ? 'Generating…' : 'Generate Paper'}
        </button>
      </form>

      {paper && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={() => { setShowAnswers(false); window.print(); }}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2"
            >
              <Printer size={14} /> Print paper
            </button>
            <button
              type="button"
              onClick={() => setShowAnswers(v => !v)}
              className="px-4 py-2 border border-slate-200 text-xs font-black uppercase tracking-widest"
            >
              {showAnswers ? 'Hide answer key' : 'Show answer key'}
            </button>
          </div>

          <article className="bg-white border-2 border-slate-900 p-8 print:border-0" id="generated-exam-paper">
            <header className="text-center border-b-2 border-slate-900 pb-4 mb-6">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">NSB1 School</p>
              <h3 className="text-2xl font-black uppercase tracking-tight">{paper.title}</h3>
              <p className="text-sm font-bold mt-1">{paper.className} · {paper.subject}</p>
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider mt-3 text-slate-600">
                <span>Time: {paper.duration}</span>
                <span>Total marks: {paper.totalMarks}</span>
              </div>
            </header>

            {paper.instructions.length > 0 && (
              <section className="mb-6">
                <h4 className="text-xs font-black uppercase tracking-widest mb-2">Instructions</h4>
                <ol className="list-decimal pl-5 text-sm space-y-1">
                  {paper.instructions.map((ins, i) => <li key={i}>{ins}</li>)}
                </ol>
              </section>
            )}

            <section className="space-y-5">
              {paper.questions.map((q) => (
                <div key={`${q.type}-${q.number}`} className="text-sm">
                  <p className="font-bold">
                    Q{q.number}. {q.question} <span className="text-slate-500 font-medium">({q.marks} marks)</span>
                  </p>
                  {q.type === 'mcq' && q.options && (
                    <ol className="list-[upper-alpha] pl-6 mt-2 space-y-1">
                      {q.options.map((opt, i) => <li key={i}>{opt}</li>)}
                    </ol>
                  )}
                  {q.type !== 'mcq' && (
                    <div className="mt-3 border-b border-dotted border-slate-300 h-10" />
                  )}
                </div>
              ))}
            </section>
          </article>

          {showAnswers && (
            <article className="bg-white border border-slate-200 p-8 print:break-before-page">
              <h3 className="text-lg font-black uppercase tracking-tight mb-4">Answer Key</h3>
              <ol className="space-y-3 text-sm">
                {paper.questions.map((q) => (
                  <li key={`ans-${q.number}`}>
                    <span className="font-black">Q{q.number}:</span> {q.answer || '—'}
                  </li>
                ))}
              </ol>
            </article>
          )}
        </div>
      )}
    </div>
  );
}
