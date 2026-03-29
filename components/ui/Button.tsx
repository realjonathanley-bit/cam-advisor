'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[#1a6bff] text-white hover:bg-[#0050e6] disabled:bg-[#1a6bff]/40',
  secondary:
    'bg-white/10 text-white hover:bg-white/20 border border-white/10 disabled:bg-white/5',
  ghost:
    'text-gray-400 hover:text-white hover:bg-white/5 disabled:text-gray-600',
  danger:
    'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/40',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm px-4 py-2 rounded-lg',
  md: 'text-base px-6 py-3 rounded-xl',
  lg: 'text-lg px-8 py-4 rounded-xl',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      children,
      className = '',
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center gap-2 font-semibold',
          'transition-all duration-200 cursor-pointer',
          'disabled:cursor-not-allowed disabled:opacity-60',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;
