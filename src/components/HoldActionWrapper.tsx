import React, { useState } from 'react';
import { useLongPress } from '../lib/longPress';
import { Edit2, Trash2 } from 'lucide-react';

interface HoldActionWrapperProps {
  onEdit?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const HoldActionWrapper: React.FC<HoldActionWrapperProps> = ({
  onEdit,
  onDelete,
  children,
  className = ''
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const longPressProps = useLongPress(() => {
    setShowMenu(true);
  }, 500);

  return (
    <div className={`relative select-none ${className}`} {...longPressProps}>
      {children}
      {showMenu && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center gap-3 rounded-2xl animate-fade-in p-2 shadow-2xl">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onEdit();
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
            >
              <Edit2 size={14} /> Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onDelete();
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
            }}
            className="px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-black text-xs rounded-xl transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
