'use client';

import { cn } from '@/lib/utils';

interface TogglePillOption {
  label: string;
  value: string;
}

interface TogglePillProps {
  options: TogglePillOption[];
  value: string;
  onChange: (value: string) => void;
}

export function TogglePill({ options, value, onChange }: TogglePillProps) {
  return (
    <div className="inline-flex rounded-full bg-muted p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            value === option.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
