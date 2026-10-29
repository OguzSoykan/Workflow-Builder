import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { getLocale } from './i18n/i18n';
import { applyTheme } from './ui/theme';
import './styles.css';

document.documentElement.lang = getLocale();
applyTheme();

const root = document.getElementById('root');
if (!root) throw new Error('Application root is missing');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
