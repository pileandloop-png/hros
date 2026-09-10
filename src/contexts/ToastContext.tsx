import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, description?: string, duration?: number) => void;
  success: (title: string, description?: string, duration?: number) => void;
  error: (title: string, description?: string, duration?: number) => void;
  warning: (title: string, description?: string, duration?: number) => void;
  info: (title: string, description?: string, duration?: number) => void;
  dismissToast: (id: string) => void;
  toast: {
    success: (title: string, description?: string, duration?: number) => void;
    error: (title: string, description?: string, duration?: number) => void;
    warning: (title: string, description?: string, duration?: number) => void;
    info: (title: string, description?: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, description?: string, duration: number = 4000) => {
      const id = 'toast-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      const newToast: ToastMessage = { id, type, title, description, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const success = useCallback((title: string, description?: string, duration?: number) => {
    showToast('success', title, description, duration);
  }, [showToast]);

  const error = useCallback((title: string, description?: string, duration?: number) => {
    showToast('error', title, description, duration || 5000);
  }, [showToast]);

  const warning = useCallback((title: string, description?: string, duration?: number) => {
    showToast('warning', title, description, duration);
  }, [showToast]);

  const info = useCallback((title: string, description?: string, duration?: number) => {
    showToast('info', title, description, duration);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, dismissToast, toast: { success, error, warning, info } }}>
      {children}
      
      {/* Toast Render Portal */}
      <div
        aria-live="assertive"
        className="fixed top-4 right-4 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0"
      >
        {toasts.map((t) => {
          const isError = t.type === 'error';
          const isSuccess = t.type === 'success';
          const isWarning = t.type === 'warning';

          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start space-x-3 p-3.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-slate-100 animate-in slide-in-from-top-3 fade-in duration-200 transition-all"
              style={{
                borderLeftWidth: '4px',
                borderLeftColor: isError
                  ? '#EF4444'
                  : isSuccess
                  ? '#10B981'
                  : isWarning
                  ? '#F59E0B'
                  : '#3B82F6',
              }}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-500" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-sky-500" />}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold leading-tight">{t.title}</h4>
                {t.description && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal break-words">
                    {t.description}
                  </p>
                )}
              </div>

              <button
                onClick={() => dismissToast(t.id)}
                className="shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
