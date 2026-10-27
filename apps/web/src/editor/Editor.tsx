import { useMemo, useReducer, useState } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
} from '@xyflow/react';
import { WORKFLOW_LIMITS } from '@workflow-builder/workflow-contract';
import { InputFields } from './InputFields';
import { TransferPanel } from './TransferPanel';
import { NodePropertiesForm } from './NodePropertiesForm';
import { ConnectionForm } from './ConnectionForm';
import { WorkflowCard, type CanvasNode } from './WorkflowCard';
import { conditionSummary, invalidConditionIds } from './condition-model';
import { browserStore, loadDraft } from './draft-storage';
import { useDraft, type DraftStatus } from './use-draft';
import {
  connectionError,
  editorReducer,
  emptyWorkflow,
  HANDLE_LABELS,
  NODE_LABELS,
  type NodeKind,
} from './model';
import '@xyflow/react/dist/style.css';

const nodeTypes = { workflow: WorkflowCard };
const kinds: NodeKind[] = ['start', 'approval', 'condition', 'end'];
const STATUS_LABELS: Record<DraftStatus, string> = {
  idle: 'Kaydedilecek değişiklik yok',
  saved: 'Tarayıcıda kaydedildi',
  quota: 'Kaydedilemedi: depolama dolu',
  unavailable: 'Tarayıcı kaydı kullanılamıyor',
};

function EditorWorkspace() {
  const [measurements, setMeasurements] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [{ store, load }] = useState(() => {
    const local = browserStore();
    return { store: local, load: loadDraft(local) };
  });
  const [state, dispatch] = useReducer(editorReducer, undefined, () => ({
    workflow:
      load.status === 'loaded' ? load.workflow : emptyWorkflow(`workflow_${crypto.randomUUID()}`),
    nodeId: null,
    edgeId: null,
    error: null,
  }));
  const { workflow } = state;
  const draft = useDraft(store, load, workflow, dispatch);
  const nodes = useMemo<CanvasNode[]>(() => {
    const invalid = invalidConditionIds(workflow);
    return workflow.nodes.map((node) => ({
      id: node.id,
      type: 'workflow',
      position: node.position,
      data: { node, summary: invalid.has(node.id) ? null : conditionSummary(workflow, node) },
      selected: state.nodeId === node.id,
      ...(measurements[node.id] ? { measured: measurements[node.id] } : {}),
      ariaLabel: `${NODE_LABELS[node.type]}: ${node.label}`,
    }));
  }, [workflow, state.nodeId, measurements]);
  const edges = useMemo<Edge[]>(
    () =>
      workflow.edges.map((edge) => ({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        sourceHandle: edge.sourceHandle,
        targetHandle: 'input',
        label: HANDLE_LABELS[edge.sourceHandle],
        selected: state.edgeId === edge.id,
        type: 'smoothstep',
      })),
    [workflow.edges, state.edgeId],
  );
  const selectedNode = workflow.nodes.find((node) => node.id === state.nodeId);
  const selectedEdge = workflow.edges.find((edge) => edge.id === state.edgeId);
  const connect = (connection: Connection) =>
    dispatch({
      type: 'connect',
      id: `edge_${crypto.randomUUID()}`,
      source: connection.source,
      target: connection.target,
      handle: connection.sourceHandle ?? '',
    });
  return (
    <main className="editor-shell">
      <header className="editor-header">
        <div>
          <p className="eyebrow">WORKFLOW BUILDER</p>
          <h1>İş akışı tasarımı</h1>
        </div>
        <div className="header-meta">
          <span className="draft-badge" role="status">
            {draft.conflict ? 'Otomatik kayıt duraklatıldı' : STATUS_LABELS[draft.status]}
          </span>
          <a href="/health">Servis durumu</a>
        </div>
      </header>
      <div className="draft-notice">
        Taslak bu tarayıcıda otomatik kaydedilir; eksik adımlar olsa da yenilemede geri gelir. Hesap
        veya bulut kaydı yoktur.
      </div>
      {load.status === 'corrupt' && (
        <div className="draft-alert" role="alert">
          Önceki taslak okunamadı. {load.backedUp ? 'Yedeklendi ve' : 'Yedeklenemedi;'} boş bir
          taslakla başlandı.
        </div>
      )}
      {!draft.conflict && draft.status === 'quota' && (
        <div className="draft-alert" role="alert">
          Tarayıcı depolaması dolu olduğu için son değişiklikler kaydedilmedi. Sayfayı yenilerseniz
          kaybolur.
        </div>
      )}
      {!draft.conflict && draft.status === 'unavailable' && (
        <div className="draft-alert" role="alert">
          Tarayıcı depolamasına erişilemiyor; değişiklikler yalnız bu oturumda kalır.
        </div>
      )}
      {draft.conflict && (
        <div className="draft-alert" role="alert">
          <p>
            Bu taslak başka bir sekmede değiştirildi. Otomatik kayıt duraklatıldı; hangi sürümle
            devam edeceğinizi seçin.
          </p>
          {draft.conflictError && (
            <p>Diğer sekmedeki kayıt okunamadı. Bu sekmedeki taslağı kaydedebilirsiniz.</p>
          )}
          <button type="button" className="secondary" onClick={draft.loadOther}>
            Diğer sekmedeki sürümü yükle
          </button>{' '}
          <button type="button" onClick={draft.keepThis}>
            Bu sekmedekini kaydet
          </button>
        </div>
      )}
      <div className="editor-layout">
        <aside className="palette" aria-label="Adım paleti">
          <h2>Adım ekle</h2>
          <p className="muted">Akışınızı adım adım oluşturun.</p>
          {kinds.map((kind) => (
            <button
              key={kind}
              className={`palette-button kind-${kind}`}
              disabled={
                workflow.nodes.length >= WORKFLOW_LIMITS.nodes ||
                (kind === 'start' && workflow.nodes.some((node) => node.type === 'start'))
              }
              onClick={() =>
                dispatch({
                  type: 'add-node',
                  id: `node_${crypto.randomUUID()}`,
                  kind,
                  position: {
                    x: (workflow.nodes.length % 2) * 320 + 40,
                    y: Math.floor(workflow.nodes.length / 2) * 170 + 40,
                  },
                })
              }
            >
              <span className="kind-dot" />
              {NODE_LABELS[kind]} ekle<span aria-hidden="true">+</span>
            </button>
          ))}
          <h2 className="list-heading">Akıştaki adımlar</h2>
          <p className="muted">
            {workflow.nodes.length} / 50 adım · {workflow.edges.length} / 100 bağlantı
          </p>
          <ol className="node-list" aria-label="Akıştaki adımlar">
            {workflow.nodes.map((node) => (
              <li key={node.id}>
                <button
                  className="list-button"
                  aria-pressed={state.nodeId === node.id}
                  onClick={() => dispatch({ type: 'select-node', id: node.id })}
                >
                  {node.label}
                  <small>{NODE_LABELS[node.type]}</small>
                </button>
              </li>
            ))}
          </ol>
          <TransferPanel workflow={workflow} dispatch={dispatch} />
        </aside>
        <section className="canvas-panel" aria-label="İş akışı tuvali">
          <div className="canvas-title">
            <h2>{workflow.title}</h2>
            <span>Çıkış noktalarını sürükleyerek bağlayın</span>
          </div>
          <div className="flow-canvas">
            <ReactFlow<CanvasNode>
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onConnect={connect}
              isValidConnection={(connection) =>
                !connectionError(
                  workflow,
                  connection.source,
                  connection.sourceHandle ?? '',
                  connection.target,
                )
              }
              onNodeClick={(_, node) => dispatch({ type: 'select-node', id: node.id })}
              onEdgeClick={(_, edge) => dispatch({ type: 'select-edge', id: edge.id })}
              onPaneClick={() => dispatch({ type: 'select-node', id: null })}
              onNodesChange={(changes) => {
                for (const change of changes) {
                  if (change.type === 'dimensions' && change.dimensions) {
                    const dimensions = change.dimensions;
                    setMeasurements((previous) =>
                      previous[change.id]?.width === dimensions.width &&
                      previous[change.id]?.height === dimensions.height
                        ? previous
                        : { ...previous, [change.id]: dimensions },
                    );
                  }
                  if (change.type === 'position' && change.position)
                    dispatch({ type: 'move-node', id: change.id, position: change.position });
                  if (change.type === 'remove') dispatch({ type: 'delete-node', id: change.id });
                  if (change.type === 'select' && change.selected)
                    dispatch({ type: 'select-node', id: change.id });
                }
              }}
              onEdgesChange={(changes) => {
                for (const change of changes) {
                  if (change.type === 'remove') dispatch({ type: 'delete-edge', id: change.id });
                  if (change.type === 'select' && change.selected)
                    dispatch({ type: 'select-edge', id: change.id });
                }
              }}
              defaultViewport={{ x: 30, y: 30, zoom: 0.85 }}
              minZoom={0.2}
              maxZoom={2}
              edgesReconnectable={false}
              deleteKeyCode={['Backspace', 'Delete']}
              ariaLabelConfig={{
                'controls.zoomIn.ariaLabel': 'Yakınlaştır',
                'controls.zoomOut.ariaLabel': 'Uzaklaştır',
                'controls.fitView.ariaLabel': 'Tümünü göster',
                'controls.interactive.ariaLabel': 'Düzenlemeyi kilitle veya aç',
              }}
            >
              <Background gap={24} size={1} />
              <Controls />
              <MiniMap pannable zoomable nodeColor="#87a8c5" />
            </ReactFlow>
            {!nodes.length && (
              <div className="canvas-empty">
                <span aria-hidden="true">↗</span>
                <h3>İlk adımla başlayın</h3>
                <p>Soldan bir başlangıç adımı ekleyin.</p>
              </div>
            )}
          </div>
        </section>
        <aside className="inspector" aria-label="Adım özellikleri">
          <h2>Özellikler</h2>
          {selectedNode ? (
            <NodePropertiesForm
              key={selectedNode.id}
              workflow={workflow}
              node={selectedNode}
              dispatch={dispatch}
            />
          ) : selectedEdge ? (
            <div>
              <p>{HANDLE_LABELS[selectedEdge.sourceHandle]} bağlantısı</p>
              <button
                className="danger"
                onClick={() => dispatch({ type: 'delete-edge', id: selectedEdge.id })}
              >
                Bağlantıyı sil
              </button>
            </div>
          ) : (
            <p className="muted">Düzenlemek için tuvalden veya listeden bir adım seçin.</p>
          )}
          <ConnectionForm workflow={workflow} dispatch={dispatch} />
          <div className="editor-feedback" aria-live="polite">
            {state.error && <p role="alert">{state.error}</p>}
          </div>
          {!!workflow.edges.length && (
            <div className="connections">
              <h3>Bağlantılar</h3>
              <ul aria-label="Akış bağlantıları">
                {workflow.edges.map((edge) => (
                  <li key={edge.id}>
                    <button
                      className="list-button"
                      aria-pressed={state.edgeId === edge.id}
                      onClick={() => dispatch({ type: 'select-edge', id: edge.id })}
                    >
                      {workflow.nodes.find((node) => node.id === edge.sourceNodeId)?.label} →{' '}
                      {workflow.nodes.find((node) => node.id === edge.targetNodeId)?.label}
                      <small>{HANDLE_LABELS[edge.sourceHandle]}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
      <InputFields workflow={workflow} dispatch={dispatch} />
    </main>
  );
}

export function Editor() {
  return (
    <ReactFlowProvider>
      <EditorWorkspace />
    </ReactFlowProvider>
  );
}
