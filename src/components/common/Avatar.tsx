import React, { useState, useEffect } from 'react';
import { employeeService } from '../../services/employeeService';

interface AvatarProps {
  src?: string;
  name?: string;
  className?: string;
  alt?: string;
}

const GRADIENTS = [
  'from-violet-600 to-indigo-600 text-white',
  'from-cyan-600 to-blue-600 text-white',
  'from-emerald-600 to-teal-600 text-white',
  'from-amber-500 to-orange-600 text-slate-950',
  'from-rose-600 to-pink-600 text-white',
  'from-purple-600 to-fuchsia-600 text-white',
];

function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'EE';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGradient(name?: string): string {
  if (!name) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, className = 'w-10 h-10 rounded-xl', alt = '' }) => {
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
  const gradient = getGradient(name);

  if (resolvedUrl && !hasError) {
    return (
      <img
        src={resolvedUrl}
        alt={alt || name || 'Avatar'}
        onError={() => setHasError(true)}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`bg-gradient-to-br ${gradient} font-heading font-black flex items-center justify-center select-none uppercase tracking-wider shrink-0 ${className}`}
      title={name}
    >
      {initials}
    </div>
  );
};
