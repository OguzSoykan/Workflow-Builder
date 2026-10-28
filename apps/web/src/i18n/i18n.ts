import { EN } from './en';

// FR-11: Turkish source strings are the keys; English comes from the catalog (no dependency).
export type Locale = 'tr' | 'en';
const KEY = 'workflow-builder:locale:v1';
const listeners = new Set<() => void>();

function initial(): Locale {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === 'tr' || saved === 'en') return saved;
    return window.navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  } catch {
    return 'tr';
  }
}
let current: Locale = typeof window === 'undefined' ? 'tr' : initial();

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale) {
  current = locale;
  try {
    window.localStorage.setItem(KEY, locale);
    document.documentElement.lang = locale;
  } catch {
    // Storage may be unavailable; the choice then lasts for this page only.
  }
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Translates a Turkish source string and fills `{name}` placeholders. */
export function t(source: string, params: Record<string, string | number> = {}): string {
  const template = current === 'en' ? (EN[source] ?? source) : source;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
