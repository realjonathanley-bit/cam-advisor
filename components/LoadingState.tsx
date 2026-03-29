import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const STEPS = [
  { label: 'Geocodificando dirección', duration: 1500 },
  { label: 'Obteniendo imagen satelital', duration: 3500 },
  { label: 'Estilizando fondo de seguridad', duration: 5500 },
  { label: 'Preparando editor de plan', duration: 7000 },
];

interface LoadingStateProps {
  address: string;
  /** Elapsed ms since loading started, used to animate the sub-steps */
  elapsedMs?: number;
}

export default function LoadingState({
  address,
  elapsedMs = 0,
}: LoadingStateProps) {
  const activeStep = STEPS.findIndex((s) => elapsedMs < s.duration);
  const currentIndex = activeStep === -1 ? STEPS.length - 1 : activeStep;

  return (
    <Card glow padding="lg" className="w-full max-w-2xl mx-auto text-center">
      <div className="flex flex-col items-center gap-6">
        <LoadingSpinner size="lg" />

        <div>
          <h2 className="text-xl font-bold text-white mb-1">
            Analizando propiedad
          </h2>
          <p className="text-sm text-gray-500 max-w-sm truncate">
            {address}
          </p>
        </div>

        {/* Sub-step list */}
        <div className="w-full flex flex-col gap-3 text-left">
          {STEPS.map((step, index) => {
            const isDone = index < currentIndex;
            const isActive = index === currentIndex;

            return (
              <div key={step.label} className="flex items-center gap-3">
                <div
                  className={[
                    'w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-500',
                    isDone
                      ? 'bg-[#1a6bff]'
                      : isActive
                        ? 'border-2 border-[#1a6bff] bg-[#1a6bff]/10'
                        : 'border border-white/10 bg-white/5',
                  ].join(' ')}
                >
                  {isDone && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-[#1a6bff] animate-pulse" />
                  )}
                </div>
                <span
                  className={[
                    'text-sm transition-colors duration-300',
                    isDone ? 'text-gray-500 line-through' : isActive ? 'text-white font-medium' : 'text-gray-700',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-700 mt-2">
          Esto puede tomar unos segundos...
        </p>
      </div>
    </Card>
  );
}
