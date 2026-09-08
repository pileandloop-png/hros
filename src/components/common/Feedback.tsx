import React from 'react';
import { Loader2, Inbox } from 'lucide-react';

export const LoadingSpinner: React.FC<{ message?: string; className?: string }> = ({ message = 'Loading...', className = '' }) => (
  <div className={`flex flex-col items-center justify-center p-12 text-slate-500 ${className}`}>
    <Loader2 className="w-8 h-8 animate-spin text-slate-800 mb-3" />
    <p className="text-sm font-medium">{message}</p>
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, description, icon, action }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
    <div className="p-3 bg-slate-50 text-slate-400 rounded-full mb-4">
      {icon || <Inbox className="w-8 h-8" />}
    </div>
    <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
    {description && <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>}
    {action}
  </div>
);