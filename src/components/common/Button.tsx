import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconPosition = 'left',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex min-h-10 items-center justify-center font-medium transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700/25 focus-visible:ring-offset-2 disabled:opacity-45 disabled:cursor-not-allowed select-none';

  const variantClasses = {
    primary:
      'bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white shadow-[0_1px_2px_rgba(26,35,30,.12)] dark:bg-blue-600 dark:hover:bg-blue-500',
    secondary:
      'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700',
    outline:
      'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200/90 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    ghost:
      'bg-transparent hover:bg-slate-100/80 dark:hover:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-300',
    danger:
      'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs dark:bg-rose-600 dark:hover:bg-rose-500',
  };

  const sizeClasses = {
    xs: 'min-h-8 px-2.5 py-1 text-[11px] font-medium rounded-lg gap-1',
    sm: 'min-h-9 px-3 py-1.5 text-xs rounded-[10px] gap-1.5',
    md: 'px-4 py-2 text-xs font-semibold rounded-[10px] gap-2',
    lg: 'min-h-11 px-5 py-2.5 text-sm font-semibold rounded-xl gap-2.5',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : icon && iconPosition === 'left' ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {!isLoading && icon && iconPosition === 'right' ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
    </button>
  );
};
