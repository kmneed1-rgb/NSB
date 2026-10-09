/**
 * Logged-in user ka avatar — photo ho to wahi, warna naam ke initials wali
 * colored circle (har portal ke sidebar/header mein user identity ke liye).
 */
interface UserAvatarProps {
  photo?: string;
  name?: string;
  /** Diameter in px (default 36). */
  size?: number;
  className?: string;
}

const GRADIENTS = [
  'from-indigo-600 to-violet-600',
  'from-emerald-600 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-sky-500 to-blue-700',
  'from-fuchsia-500 to-purple-700',
];

function gradientFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

function initialsFor(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserAvatar({ photo, name = '', size = 36, className = '' }: UserAvatarProps) {
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) };
  const base = `shrink-0 rounded-full overflow-hidden flex items-center justify-center select-none ${className}`;
  if (photo && photo.trim()) {
    return (
      <img
        src={photo}
        alt={name || 'Profile'}
        style={style}
        className={`${base} object-cover object-center bg-slate-100 border border-slate-200`}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div
      style={style}
      title={name}
      className={`${base} bg-gradient-to-br ${gradientFor(name)} text-white font-black uppercase shadow-md`}
    >
      {initialsFor(name)}
    </div>
  );
}