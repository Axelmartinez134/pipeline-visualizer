import * as React from 'react';
import { cn } from '../../lib/utils';

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'warning';
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-bold leading-none',
          variant === 'warning'
            ? 'bg-yellow-500 text-yellow-950'
            : 'bg-slate-100 text-slate-900',
          className,
        )}
        {...props}
      />
    );
  },
);

Badge.displayName = 'Badge';

