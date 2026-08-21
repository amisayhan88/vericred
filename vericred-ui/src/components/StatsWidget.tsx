import React from 'react';

interface StatsWidgetProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  description?: string;
}

export const StatsWidget: React.FC<StatsWidgetProps> = ({
  title,
  value,
  change,
  icon: Icon,
  description,
}) => {
  return (
    <div className="card-content p-6 hover:shadow-card transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <span className="text-caption text-muted">{title}</span>
        <div className="w-9 h-9 rounded-lg bg-surface-card flex items-center justify-center text-ink">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-display-sm text-ink" style={{ fontSize: '24px', letterSpacing: '-0.5px' }}>
          {value}
        </span>
        {change && (
          <span className="badge-pill text-success bg-[#ecfdf5] text-caption" style={{ fontSize: '11px' }}>
            {change}
          </span>
        )}
      </div>

      {description && (
        <p className="mt-1.5 text-caption text-muted-soft">{description}</p>
      )}
    </div>
  );
};
