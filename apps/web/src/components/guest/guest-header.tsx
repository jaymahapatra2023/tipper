'use client';

import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LanguageSelector } from '@/components/shared/language-selector';

export function GuestHeader() {
  const t = useTranslations('common');
  return (
    <header className="glass-panel flex items-center justify-between border-b border-border/50 px-4 py-3">
      <span className="font-display text-lg text-primary font-semibold tracking-tight">Tipper</span>
      <div className="flex items-center gap-3">
        <LanguageSelector />
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span className="text-xs">{t('secure')}</span>
        </div>
      </div>
    </header>
  );
}
