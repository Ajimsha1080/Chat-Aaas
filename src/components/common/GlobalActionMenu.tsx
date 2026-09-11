import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, LucideIcon } from 'lucide-react';

export interface ActionMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'warning' | 'primary';
  disabled?: boolean;
  divider?: boolean;
  badge?: string;
}

export interface GlobalActionMenuProps {
  items: ActionMenuItem[];
  ariaLabel?: string;
  size?: 'sm' | 'md';
}

export const GlobalActionMenu: React.FC<GlobalActionMenuProps> = ({
  items,
  ariaLabel = 'Actions menu',
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const buttonSize = size === 'sm' ? 'w-7 h-7 p-1' : 'w-8 h-8 p-1.5';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        className={`${buttonSize} flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100/90 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer`}
      >
        <MoreVertical className={iconSize} />
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 z-30 mt-1.5 w-52 origin-top-right rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-slate-900/10 border border-slate-100 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
          role="menu"
        >
          {items.map((item, idx) => {
            const Icon = item.icon;
            const isDestructive = item.variant === 'destructive';
            const isWarning = item.variant === 'warning';
            const isPrimary = item.variant === 'primary';

            return (
              <React.Fragment key={idx}>
                {item.divider && <div className="my-1 border-t border-slate-100" />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={e => {
                    e.stopPropagation();
                    setIsOpen(false);
                    item.onClick();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer text-left disabled:opacity-40 disabled:cursor-not-allowed ${
                    isDestructive 
                      ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700' 
                      : isWarning
                      ? 'text-amber-700 hover:bg-amber-50 hover:text-amber-800'
                      : isPrimary
                      ? 'text-indigo-600 hover:bg-indigo-50 font-semibold'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {Icon && <Icon className="w-4 h-4 shrink-0" />}
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.badge}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
