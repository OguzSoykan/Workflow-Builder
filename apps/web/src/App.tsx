import { Editor } from './editor/Editor';
import { HealthPage } from './HealthPage';

export function App() {
  return window.location.pathname === '/health' ? <HealthPage /> : <Editor />;
}
