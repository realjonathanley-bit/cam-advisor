interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizeMap = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export default function LoadingSpinner({
  size = 'md',
  label,
}: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        className={`${sizeMap[size]} animate-spin text-[#1a6bff]`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-20"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      {label && <p className="text-sm text-gray-400 animate-pulse">{label}</p>}
    </div>
  );
}
