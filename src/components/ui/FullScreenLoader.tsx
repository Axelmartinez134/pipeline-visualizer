import { cn } from '../../lib/utils';

export default function FullScreenLoader({
  className,
  label = 'Loading…',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn('min-h-screen bg-black flex items-center justify-center px-6', className)}>
      <div className="flex items-center gap-3 text-white/80">
        <span
          className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white/80 animate-spin"
          aria-hidden="true"
        />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}

