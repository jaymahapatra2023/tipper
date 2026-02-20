interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

const DEFAULT_LABELS = ['Stay', 'Amount', 'Details', 'Payment'];

export function StepIndicator({ currentStep, totalSteps, labels }: StepIndicatorProps) {
  const stepLabels = labels ?? DEFAULT_LABELS;

  return (
    <div className="space-y-2">
      <div className="flex">
        {stepLabels.slice(0, totalSteps).map((label, i) => (
          <span
            key={i}
            className={`flex-1 text-center text-xs ${
              i < currentStep ? 'text-primary font-medium' : 'text-muted-foreground'
            }`}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < currentStep ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
