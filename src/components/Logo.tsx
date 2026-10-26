import { cn } from './Button';

interface LogoProps {
  className?: string;
}

/**
 * Two overlapping circles: the same mark as the wordmark.
 * A second copy uses lighter strokes so the mark stays visible on a dark page.
 */
export function Logo({ className = 'h-8 w-10' }: LogoProps) {
  return (
    <span className="inline-flex shrink-0">
      <Venn className={cn(className, 'dark:hidden')} green="#2F5D50" amber="#D98E4A" />
      <Venn className={cn(className, 'hidden dark:block')} green="#8FBFB0" amber="#E0A36A" />
    </span>
  );
}

function Venn({ className, green, amber }: { className: string; green: string; amber: string }) {
  return (
    <svg viewBox="0 0 40 32" className={className} aria-hidden="true">
      <circle cx="15" cy="16" r="10" fill={green} fillOpacity="0.16" stroke={green} strokeWidth="2" />
      <circle cx="25" cy="16" r="10" fill={amber} fillOpacity="0.2" stroke={amber} strokeWidth="2" />
    </svg>
  );
}
