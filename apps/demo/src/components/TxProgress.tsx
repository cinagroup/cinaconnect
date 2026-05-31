'use client';

/** Transaction step progress visualization. */

export interface TxStep {
  label: string;
  icon: string;
  status: 'pending' | 'active' | 'done' | 'error';
}

export default function TxProgress({ steps }: { steps: TxStep[] }) {
  const activeIdx = steps.findIndex((s) => s.status === 'active');
  const errorIdx = steps.findIndex((s) => s.status === 'error');

  return (
    <div className="mx-5 mb-5 p-4 bg-gray-900/60 rounded-xl border border-gray-700/30 animate-slide-up">
      <div className="space-y-3">
        {steps.map((step, i) => {
          const isDone = step.status === 'done';
          const isActive = step.status === 'active';
          const isError = step.status === 'error';
          const isLast = i === steps.length - 1;

          return (
            <div key={step.label} className="flex items-start gap-3">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                    isDone
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400'
                      : isActive
                      ? 'bg-blue-500/20 border-blue-500/60 text-blue-400'
                      : isError
                      ? 'bg-red-500/20 border-red-500/60 text-red-400'
                      : 'bg-gray-800 border-gray-600/50 text-gray-600'
                  }`}
                >
                  {isDone ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isError ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : isActive ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <span className="text-xs">{step.icon}</span>
                  )}
                </div>
                {/* Connector line */}
                {!isLast && (
                  <div
                    className={`w-0.5 h-6 transition-colors duration-300 ${
                      isDone ? 'bg-emerald-500/40' : 'bg-gray-700/50'
                    }`}
                  />
                )}
              </div>
              {/* Step label */}
              <div className={`pt-1.5 transition-colors duration-300 ${
                isDone ? 'text-emerald-400' : isActive ? 'text-blue-400' : isError ? 'text-red-400' : 'text-gray-600'
              }`}>
                <span className="text-sm font-medium">{step.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall progress bar */}
      <div className="mt-3 pt-3 border-t border-gray-700/30">
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              errorIdx >= 0
                ? 'bg-red-500'
                : steps.every((s) => s.status === 'done')
                ? 'bg-emerald-500'
                : activeIdx >= 0
                ? 'bg-blue-500'
                : 'bg-gray-700'
            }`}
            style={{
              width: errorIdx >= 0
                ? `${((errorIdx + 1) / steps.length) * 100}%`
                : steps.every((s) => s.status === 'done')
                ? '100%'
                : activeIdx >= 0
                ? `${((activeIdx + 0.5) / steps.length) * 100}%`
                : '0%',
            }}
          />
        </div>
      </div>
    </div>
  );
}
