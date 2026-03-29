import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a subtle blue glow — use for the active/featured card */
  glow?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({
  glow = false,
  padding = 'md',
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={[
        'rounded-2xl border border-white/10 bg-[#0d0d0d]',
        glow ? 'shadow-[0_0_40px_rgba(26,107,255,0.15)]' : '',
        paddingClasses[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
