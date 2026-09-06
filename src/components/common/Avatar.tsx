import React, { useState, useEffect } from 'react';
import { employeeService } from '../../services/employeeService';

interface AvatarProps {
  src?: string;
  name?: string;
  className?: string;
  alt?: string;
}

const TONES = [
  'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
  'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
  'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
  'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
];

function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'EE';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getTone(name?: string): string {
  if (!name) return TONES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TONES.length;
  return TONES[index];
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, className = 'w-9 h-9 rounded-xl', alt = '' }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setHasError(false);

    if (!src) {
      setResolvedUrl('');
      return;
    }

    if (
      src.startsWith('http://') ||
      src.startsWith('https://') ||
      src.startsWith('blob:') ||
      src.startsWith('data:')
    ) {
      setResolvedUrl(src);
      return;
    }

    employeeService
      .getEmployeeAvatarUrl(src)
      .then((url) => {
        if (isMounted) {
          setResolvedUrl(url);
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasError(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [src]);

  const initials = getInitials(name);
  const tone = getTone(name);

  if (resolvedUrl && !hasError) {
    return (
      <img
        src={resolvedUrl}
        alt={alt || name || 'Avatar'}
        onError={() => setHasError(true)}
        className={`object-cover border border-slate-200/80 dark:border-slate-700/80 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${tone} border font-heading font-semibold text-xs flex items-center justify-center select-none uppercase tracking-wider shrink-0 ${className}`}
      title={name}
    >
      {initials}
    </div>
  );
};
