import { useSyncExternalStore } from 'react';
import { getLocale, subscribe } from './i18n';

/** Re-renders the caller when the language changes; state elsewhere is kept. */
export function useLocale() {
  return useSyncExternalStore(subscribe, getLocale, () => 'tr' as const);
}
