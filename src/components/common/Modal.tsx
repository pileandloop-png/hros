import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxW = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div
        className={`relative bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${maxW} max-h-[92vh] flex flex-col overflow-hidden border border-slate-200/80 dark:border-slate-800 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate mr-2">
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer touch-target-44 flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto scrollbar-thin touch-momentum text-slate-700 dark:text-slate-200">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
