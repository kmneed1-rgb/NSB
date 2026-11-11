/**
 * ADMISSIONS REVIEW PANEL — principal ke liye.
 * Landing page se aayi applications (local + cloud merged) dikhata hai,
 * search/filter ke saath, aur approve / waitlist / reject review deta hai.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ClipboardList, RefreshCw, Search, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, Phone, Mail, MapPin, Users, GraduationCap,
  AlertTriangle, Inbox, Wifi, WifiOff, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdmissionApplication, AdmissionStatus } from '../types';
import {
  loadLocalAdmissionApplications,
  saveLocalAdmissionApplications,
  mergeAdmissionApplications,
  fetchCloudAdmissionApplications,
  updateAdmissionApplication,
  subscribeAdmissionApplications,
} from '../lib/admissions';

const STATUS_META: Record<AdmissionStatus, { label: string; badge: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  approved: { label: 'Approved', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  waitlisted: { label: 'Waitlisted', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: AlertTriangle },
  rejected: { label: 'Rejected', badge: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
};

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-xs font-bold text-slate-800 break-words mt-0.5">{value}</p>
    </div>
  );
}

export default function AdmissionsPanel() {
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | AdmissionStatus>('pending');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState('');

  const load = async () => {
    const local = loadLocalAdmissionApplications();
    setApplications(local);
    // Local copy foran dikhao — cloud fetch background mein chalti rahe.
    setLoading(false);
    try {
      const cloud = await fetchCloudAdmissionApplications();
      const merged = mergeAdmissionApplications(local, cloud);
      saveLocalAdmissionApplications(merged);
      setApplications(merged);
      setCloudError('');
    } catch (e: any) {
      setCloudError(e?.message || 'Cloud applications load nahi ho sakin.');
    }
  };

  useEffect(() => {
    let mounted = true;
    load().finally(() => {
      if (mounted) setLoading(false);
    });
    const unsubscribe = subscribeAdmissionApplications(() => {
      load().catch(() => {});
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const base: Record<'all' | AdmissionStatus, number> = {
      all: applications.length,
      pending: 0,
      approved: 0,
      waitlisted: 0,
      rejected: 0,
    };
    for (const app of applications) base[app.status] += 1;
    return base;
  }, [applications]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter(app => {
      if (statusFilter !== 'all' && app.status !== statusFilter) return false;
      if (!q) return true;
      return [app.studentName, app.applicationNo, app.parentPhone, app.grade, app.fatherName, app.guardianName]
        .some(v => String(v || '').toLowerCase().includes(q));
    });
  }, [applications, statusFilter, search]);

  const setStatus = async (app: AdmissionApplication, status: AdmissionStatus) => {
    setUpdatingId(app.id);
    const note = (notes[app.id] ?? app.reviewNote ?? '').trim();
    const updated: AdmissionApplication = {
      ...app,
      status,
      reviewedAt: new Date().toISOString(),
      reviewNote: note || undefined,
    };
    try {
      const result = await updateAdmissionApplication(updated);
      setApplications(prev => mergeAdmissionApplications(prev.map(a => (a.id === app.id ? updated : a))));
      if (result.cloudSynced) {
        toast.success(`Application ${STATUS_META[status].label.toLowerCase()} — cloud par bhi save ho gayi.`);
      } else {
        toast.warning('Local save ho gayi, lekin cloud sync nahi hua. Internet check karein.');
      }
    } catch {
      toast.error('Application update nahi ho saki.');
    } finally {
      setUpdatingId(null);
    }
  };

  const refresh = async () => {
    setLoading(true);
    await load();
    setLoading(false);
  };

  return (
    <div id="panel-principal-admissions" className="space-y-6 animate-fade-in pb-24">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
            <ClipboardList size={18} />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">Admission Applications</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
              Landing page se aayi online enrollment applications
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cloudError ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-full">
              <WifiOff size={12} /> Cloud Offline
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
              <Wifi size={12} /> Cloud Synced
            </span>
          )}
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(['pending', 'approved', 'waitlisted', 'rejected'] as AdmissionStatus[]).map(status => {
          const meta = STATUS_META[status];
          const Icon = meta.icon;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`text-left bg-white border rounded-2xl p-4 shadow-sm transition-all ${
                statusFilter === status ? 'border-slate-950 ring-2 ring-slate-950/5' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{meta.label}</span>
                <Icon size={14} className="text-slate-300" />
              </div>
              <p className="text-2xl font-black text-slate-950 tracking-tighter mt-1">{counts[status]}</p>
            </button>
          );
        })}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Naam, application no. ya phone se search karein..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500 transition-all"
          />
        </div>
        <button
          onClick={() => setStatusFilter('all')}
          className={`self-start px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all ${
            statusFilter === 'all' ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
          }`}
        >
          All Applications ({counts.all})
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <RefreshCw size={22} className="mx-auto text-slate-300 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-3">Applications load ho rahi hain...</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <Inbox size={28} className="mx-auto text-slate-300" />
          <p className="text-sm font-black uppercase tracking-tight text-slate-700 mt-3">Koi application nahi mili</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
            {applications.length === 0 ? 'Landing page par form submit hone par applications yahan aayengi.' : 'Search ya filter change karke dekhein.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(app => {
            const meta = STATUS_META[app.status];
            const StatusIcon = meta.icon;
            const expanded = expandedId === app.id;
            return (
              <motion.div
                key={app.id}
                layout
                className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : app.id)}
                  className="w-full flex items-center gap-3 p-4 sm:p-5 text-left hover:bg-slate-50 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center text-xs font-black shrink-0">
                    {String(app.studentName || '?').trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-slate-950 uppercase tracking-tight truncate">{app.studentName}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border rounded-full ${meta.badge}`}>
                        <StatusIcon size={9} /> {meta.label}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5 truncate">
                      {app.applicationNo} • {app.grade} • {app.parentPhone}
                    </p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Submitted</p>
                    <p className="text-[10px] font-bold text-slate-600">
                      {new Date(app.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {expanded ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                </button>

                {expanded && (
                  <div className="border-t border-slate-100 p-4 sm:p-5 space-y-5 bg-slate-50/50">
                    {/* Quick actions */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { status: 'approved' as AdmissionStatus, label: 'Approve', icon: CheckCircle2, cls: 'bg-emerald-600 hover:bg-emerald-700' },
                        { status: 'waitlisted' as AdmissionStatus, label: 'Waitlist', icon: Clock, cls: 'bg-indigo-600 hover:bg-indigo-700' },
                        { status: 'rejected' as AdmissionStatus, label: 'Reject', icon: XCircle, cls: 'bg-rose-600 hover:bg-rose-700' },
                      ].map(action => {
                        const Icon = action.icon;
                        const active = app.status === action.status;
                        return (
                          <button
                            key={action.status}
                            disabled={updatingId === app.id}
                            onClick={() => setStatus(app, action.status)}
                            className={`inline-flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white rounded-lg transition-all disabled:opacity-50 ${
                              active ? action.cls : 'bg-slate-400 hover:bg-slate-600'
                            }`}
                          >
                            <Icon size={12} /> {action.label}
                          </button>
                        );
                      })}
                      {updatingId === app.id && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          <RefreshCw size={11} className="animate-spin" /> Saving...
                        </span>
                      )}
                    </div>

                    {/* Student */}
                    <div>
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5 mb-3">
                        <Users size={12} className="text-emerald-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Student Details</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <DetailRow label="Date of Birth" value={app.dob} />
                        <DetailRow label="Gender" value={app.gender} />
                        <DetailRow label="B-Form" value={app.bformNo} />
                        <DetailRow label="Blood Group" value={app.bloodGroup} />
                        <DetailRow label="Nationality" value={app.nationality} />
                        <DetailRow label="Religion" value={app.religion} />
                        <DetailRow label="Student Phone" value={app.studentPhone} />
                        <DetailRow label="Session" value={app.session} />
                      </div>
                    </div>

                    {/* Academic */}
                    <div>
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5 mb-3">
                        <GraduationCap size={12} className="text-emerald-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Admission & Previous School</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <DetailRow label="Applying For" value={app.grade} />
                        <DetailRow label="Section" value={app.sectionPreference} />
                        <DetailRow label="Category" value={app.category} />
                        <DetailRow label="Academy Subjects" value={app.academySubjects} />
                        <DetailRow label="Previous School" value={app.previousSchool} />
                        <DetailRow label="Last Class" value={app.previousClass} />
                        <DetailRow label="Last Result" value={app.lastResult} />
                        <DetailRow label="Transfer Certificate" value={app.transferCertificate} />
                      </div>
                    </div>

                    {/* Guardian */}
                    <div>
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5 mb-3">
                        <Phone size={12} className="text-emerald-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Parent / Guardian & Emergency</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <DetailRow label="Father" value={app.fatherName} />
                        <DetailRow label="Mother" value={app.motherName} />
                        <DetailRow label="Guardian" value={app.guardianName} />
                        <DetailRow label="Relationship" value={app.relationship} />
                        <DetailRow label="Primary Phone" value={app.parentPhone} />
                        <DetailRow label="Alternate Phone" value={app.alternatePhone} />
                        <DetailRow label="Email" value={app.parentEmail} />
                        <DetailRow label="CNIC" value={app.parentCnic} />
                        <DetailRow label="Occupation" value={app.occupation} />
                        <DetailRow label="City" value={app.city} />
                        <DetailRow label="Emergency Contact" value={app.emergencyName} />
                        <DetailRow label="Emergency Phone" value={app.emergencyPhone} />
                        <DetailRow label="Emergency Relation" value={app.emergencyRelation} />
                      </div>
                      <div className="mt-3">
                        <DetailRow label="Address" value={app.address} />
                      </div>
                    </div>

                    {/* Health & misc */}
                    <div>
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5 mb-3">
                        <MapPin size={12} className="text-emerald-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Health, Transport & Notes</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <DetailRow label="Medical Conditions" value={app.medicalConditions} />
                        <DetailRow label="Transport" value={app.transportRequired} />
                        <DetailRow label="Pickup Area" value={app.pickupArea} />
                        <DetailRow label="Sibling at NSB1" value={app.siblingAtSchool} />
                        <DetailRow label="Sibling Names" value={app.siblingNames} />
                        <DetailRow label="Source" value={app.hearAboutUs} />
                        <DetailRow label="Declaration" value={app.consent ? 'Accepted' : 'Not accepted'} />
                        <DetailRow label="Submitted" value={new Date(app.submittedAt).toLocaleString()} />
                      </div>
                      <div className="mt-3">
                        <DetailRow label="Additional Notes" value={app.notes} />
                      </div>
                    </div>

                    {/* Contact actions */}
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`tel:${app.parentPhone}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg hover:border-slate-400 transition-all"
                      >
                        <Phone size={12} /> Call Guardian
                      </a>
                      {app.parentEmail && (
                        <a
                          href={`mailto:${app.parentEmail}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg hover:border-slate-400 transition-all"
                        >
                          <Mail size={12} /> Email
                        </a>
                      )}
                    </div>

                    {/* Review note */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Review Note (optional)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={notes[app.id] ?? app.reviewNote ?? ''}
                          onChange={e => setNotes(prev => ({ ...prev, [app.id]: e.target.value }))}
                          placeholder="e.g. Interview 12 Nov, 10:00 AM"
                          className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-emerald-500 transition-all"
                        />
                        <button
                          disabled={updatingId === app.id}
                          onClick={() => setStatus(app, app.status)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all disabled:opacity-50"
                        >
                          <Send size={12} /> Save Note
                        </button>
                      </div>
                      {app.reviewedAt && (
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                          Last reviewed: {new Date(app.reviewedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
