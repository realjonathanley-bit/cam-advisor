'use client';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Card padding="lg" className="w-full max-w-2xl mx-auto text-center">
      <div className="flex flex-col items-center gap-5">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-2">
            No se pudo generar la recomendación
          </h2>
          <p className="text-sm text-gray-400 max-w-sm">{message}</p>
        </div>

        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Intentar de nuevo
          </Button>
        )}
      </div>
    </Card>
  );
}
