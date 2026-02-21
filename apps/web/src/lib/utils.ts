import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const localeMap: Record<string, string> = { en: 'en-US', es: 'es-ES', fr: 'fr-FR' };

export function formatCurrency(cents: number, currency = 'usd', locale = 'en'): string {
  return new Intl.NumberFormat(localeMap[locale] || 'en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function formatDate(date: string | Date, locale = 'en'): string {
  return new Intl.DateTimeFormat(localeMap[locale] || 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}
