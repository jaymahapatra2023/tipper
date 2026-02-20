'use client';

import { cn } from '@/lib/utils';

interface AmountSelectorProps {
  amount: string;
  selected: boolean;
  onClick: () => void;
}

export function AmountSelector({ amount, selected, onClick }: AmountSelectorProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-20 w-20 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-200',
        selected
          ? 'border-gold bg-gold text-gold-foreground scale-110 shadow-[0_0_16px_rgba(201,168,76,0.25)]'
          : 'border-border bg-card text-foreground hover:border-gold/50 hover:shadow-[0_0_8px_rgba(201,168,76,0.1)]',
      )}
    >
      {amount}
    </button>
  );
}
