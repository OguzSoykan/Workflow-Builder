import { useState, type Dispatch } from 'react';
import { NODE_HANDLES, type Workflow } from '@workflow-builder/workflow-contract';
import { HANDLE_LABELS, type EditorAction } from './model';

export function ConnectionForm({
  workflow,
  dispatch,
}: {
  workflow: Workflow;
  dispatch: Dispatch<EditorAction>;
}) {
  const [sourceId, setSourceId] = useState('');
  const source = workflow.nodes.find((node) => node.id === sourceId);
  const handles = source ? NODE_HANDLES[source.type] : [];
  // Suggest the first free branch so a second connection does not hit the duplicate-handle error.
  const connected = (handle: string) =>
    workflow.edges.some((edge) => edge.sourceNodeId === source?.id && edge.sourceHandle === handle);
  const free = handles.find((handle) => !connected(handle));
  return (
    <form
      className="connection-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        dispatch({
          type: 'connect',
          id: `edge_${crypto.randomUUID()}`,
          source: String(form.get('source') ?? ''),
          handle: String(form.get('handle') ?? ''),
          target: String(form.get('target') ?? ''),
        });
      }}
    >
      <h3>Adımları bağla</h3>
      <label htmlFor="connection-source">
        Kaynak adım
        <select
          id="connection-source"
          name="source"
          required
          value={source?.id ?? ''}
          onChange={(event) => setSourceId(event.target.value)}
        >
          <option value="">Adım seçin</option>
          {workflow.nodes
            .filter((node) => node.type !== 'end')
            .map((node, index) => (
              <option key={node.id} value={node.id}>
                {node.label} ({index + 1})
              </option>
            ))}
        </select>
      </label>
      <label htmlFor="connection-handle">
        Çıkış
        <select
          id="connection-handle"
          key={`${source?.id ?? 'none'}:${free ?? ''}`}
          name="handle"
          required
          defaultValue={free ?? handles[0] ?? ''}
        >
          {!handles.length && <option value="">Önce kaynak seçin</option>}
          {handles.map((handle) => (
            <option key={handle} value={handle}>
              {HANDLE_LABELS[handle]}
              {connected(handle) ? ' (bağlı)' : ''}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="connection-target">
        Hedef adım
        <select id="connection-target" name="target" required defaultValue="">
          <option value="">Adım seçin</option>
          {workflow.nodes
            .filter((node) => node.type !== 'start')
            .map((node, index) => (
              <option key={node.id} value={node.id}>
                {node.label} ({index + 1})
              </option>
            ))}
        </select>
      </label>
      <button type="submit" className="secondary" disabled={!workflow.nodes.length}>
        Bağlantı ekle
      </button>
    </form>
  );
}
