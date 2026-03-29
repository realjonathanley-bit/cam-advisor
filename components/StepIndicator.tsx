import type { AppStep } from '@/types';

const STEPS: { key: AppStep; label: string }[] = [
  { key: 'input', label: 'Dirección' },
  { key: 'loading', label: 'Analizando' },
  { key: 'editor', label: 'Editor' },
];

interface StepIndicatorProps {
  currentStep: AppStep;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentIndex =
    currentStep === 'error'
      ? 0
      : STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isActive = index === currentIndex;

        return (
          <div key={step.key} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                  isDone
                    ? 'bg-[#1a6bff] text-white'
                    : isActive
                      ? 'bg-[#1a6bff]/20 border-2 border-[#1a6bff] text-[#1a6bff]'
                      : 'bg-white/5 border border-white/10 text-gray-600',
                ].join(' ')}
              >
                {isDone ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={[
                  'text-xs font-medium transition-colors duration-300',
                  isActive ? 'text-white' : isDone ? 'text-[#1a6bff]' : 'text-gray-600',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line between steps */}
            {index < STEPS.length - 1 && (
              <div
                className={[
                  'h-px w-12 mx-2 mb-5 transition-all duration-300',
                  isDone ? 'bg-[#1a6bff]' : 'bg-white/10',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
