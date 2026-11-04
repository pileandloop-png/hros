import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  metric: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  delta?: {
    value: string;
    type: 'increase' | 'decrease' | 'neutral';
    timeframe?: string;
  };
  progress?: {
    current: number;
    total: number;
    label?: string;
    color?: string;
  };
  onClick?: () => void;
  className?: string;
  badge?: string;
}

/**
 * Tremor-inspired SaaS Metric Card
 * High-definition white theme with subtle borders, delta pills, and progress track.
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  metric,
  subtitle,
  icon: Icon,
  iconColor = 'text-sky-600',
  iconBg = 'bg-sky-50',
  delta,
  progress,
  onClick,
  className = '',
  badge
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all ${
        onClick ? 'cursor-pointer group' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className="flex items-center space-x-1.5">
          {badge && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
              {badge}
            </span>
          )}
          {Icon && (
            <div className={`w-8 h-8 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center transition-transform group-hover:scale-110`}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-baseline space-x-2">
        <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {metric}
        </span>
        {delta && (
          <span
            className={`inline-flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
              delta.type === 'increase'
                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/70'
                : delta.type === 'decrease'
                ? 'text-rose-700 bg-rose-50 border border-rose-200/70'
                : 'text-slate-600 bg-slate-100 border border-slate-200'
            }`}
          >
            {delta.type === 'increase' && <TrendingUp className="w-3 h-3 mr-0.5" />}
            {delta.type === 'decrease' && <TrendingDown className="w-3 h-3 mr-0.5" />}
            {delta.type === 'neutral' && <Minus className="w-3 h-3 mr-0.5" />}
            {delta.value}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
          {subtitle}
        </p>
      )}

      {progress && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
            <span>{progress.label || 'Progress'}</span>
            <span className="font-bold text-slate-700">
              {progress.current} / {progress.total} ({Math.round((progress.current / Math.max(progress.total, 1)) * 100)}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progress.color || 'bg-sky-500'}`}
              style={{
                width: `${Math.min(100, Math.round((progress.current / Math.max(progress.total, 1)) * 100))}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
