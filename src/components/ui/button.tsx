import * as React from 'react';
import { cn } from '../../lib/utils';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            default: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
            secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
            outline: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
            ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
          }[variant],
          {
            default: 'h-10 px-4 text-sm',
            sm: 'h-9 px-3 text-sm',
            lg: 'h-11 px-6 text-base',
          }[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
