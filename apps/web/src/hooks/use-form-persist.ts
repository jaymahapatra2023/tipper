'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { UseFormReturn, FieldValues } from 'react-hook-form';

const SENSITIVE_FIELDS = ['cardNumber', 'cvc', 'expiry', 'card'];

export function useFormPersist<T extends FieldValues>(storageKey: string, form: UseFormReturn<T>) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore saved values on mount

  const setValue = form.setValue as (
    key: string,
    value: unknown,
    opts?: { shouldValidate: boolean },
  ) => void;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        for (const [key, value] of Object.entries(parsed)) {
          if (!SENSITIVE_FIELDS.includes(key) && value !== undefined) {
            setValue(key, value, { shouldValidate: false });
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [storageKey, setValue]);

  // Watch all values and debounce-save
  const values = form.watch();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        const toSave: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(values)) {
          if (!SENSITIVE_FIELDS.includes(key)) {
            toSave[key] = value;
          }
        }
        localStorage.setItem(storageKey, JSON.stringify(toSave));
      } catch {
        // localStorage full or unavailable
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [storageKey, values]);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
  }, [storageKey]);

  return { clear };
}
