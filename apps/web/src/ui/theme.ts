import { useSyncExternalStore } from 'react';

// Light/dark theme that follows the system unless the user picks one (stored per browser).
export type ThemeChoice = 'system' | 'light' | 'dark';
const KEY = 'workflow-builder:theme:v1';
const listeners = new Set<() => void>();
const media = () =>
  typeof window === 'undefined' ? null : window.matchMedia?.('(prefers-color-scheme: dark)');

function read(): ThemeChoice {
  try {
    const saved = window.localStorage.getItem(KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}
let choice: ThemeChoice = typeof window === 'undefined' ? 'system' : read();

export function resolvedTheme(): 'light' | 'dark' {
  return choice === 'system' ? (media()?.matches ? 'dark' : 'light') : choice;
}

export function applyTheme() {
  document.documentElement.dataset.theme = resolvedTheme();
}

export function setTheme(next: ThemeChoice) {
  choice = next;
  try {
    if (next === 'system') window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, next);
  } catch {
    // Without storage the choice lasts for this page.
  }
  applyTheme();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const query = media();
  const onChange = () => {
    if (choice === 'system') {
      applyTheme();
      listener();
    }
  };
  query?.addEventListener('change', onChange);
  return () => {
    listeners.delete(listener);
    query?.removeEventListener('change', onChange);
  };
}

export function useTheme() {
  const value = useSyncExternalStore(
    subscribe,
    () => `${choice}:${resolvedTheme()}`,
    () => 'system:light',
  );
  const [current, resolved] = value.split(':') as [ThemeChoice, 'light' | 'dark'];
  return { choice: current, resolved };
}
