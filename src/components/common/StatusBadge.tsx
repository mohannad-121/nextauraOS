import React from 'react';
import { getStatusBadgeStyle } from '../../utils/formatters';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  const badgeStyle = getStatusBadgeStyle(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border tracking-wide uppercase ${sizeClasses} ${badgeStyle}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
};
