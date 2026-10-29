import { useEffect, useMemo, useReducer, useState } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
} from '@xyflow/react';
import { computeContentHash, WORKFLOW_LIMITS } from '@workflow-builder/workflow-contract';
import type { SimulationRun } from '@workflow-builder/workflow-core';
import { InputFields } from './InputFields';
import { TransferPanel } from './TransferPanel';
import { ExamplesPanel } from './ExamplesPanel';
import { AccountPanel } from '../account/AccountPanel';
import { useAccount } from '../account/use-account';
import { CloudPanel } from '../account/CloudPanel';
import { AiPanel } from '../account/AiPanel';
import { ValidationPanel } from './ValidationPanel';
import { SimulationPanel } from './SimulationPanel';
import { visitedPath } from './simulation-view';
import { describeWorkflow, issueCountsByNode } from './validation-messages';
import { NodePropertiesForm } from './NodePropertiesForm';
import { ConnectionForm } from './ConnectionForm';
import { WorkflowCard, type CanvasNode } from './WorkflowCard';
import { conditionSummary, invalidConditionIds } from './condition-model';
import { browserStore, loadDraft } from './draft-storage';
import { historyReducer, initialHistory } from './history';
import { useDraft, type DraftStatus } from './use-draft';
import { connectionError, emptyWorkflow, HANDLE_LABELS, NODE_LABELS, type NodeKind } from './model';
import '@xyflow/react/dist/style.css';
import { setLocale, t, type Locale } from '../i18n/i18n';
import { useLocale } from '../i18n/use-locale';
import { Tabs } from '../ui/Tabs';
import { setTheme, useTheme } from '../ui/theme';

const nodeTypes = { workflow: WorkflowCard };
const kinds: NodeKind[] = ['start', 'approval', 'condition', 'end'];
const FIT_VIEW = { padding: 0.2, maxZoom: 1 };
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
  const [history, dispatch] = useReducer(historyReducer, undefined, () =>
    initialHistory({
      workflow:
        load.status === 'loaded' ? load.workflow : emptyWorkflow(`workflow_${crypto.randomUUID()}`),
      nodeId: null,
      edgeId: null,
      error: null,
    }),
  );
  const state = history.present;
  const account = useAccount();
  // Canvas cards are memoized by React Flow; the locale in their data makes them re-render.
  const locale = useLocale();
  const { workflow } = state;
  useEffect(() => {
    // Text controls keep their native undo; the shortcut only applies to the workflow.
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      event.preventDefault();
      dispatch({ type: key === 'y' || event.shiftKey ? 'redo' : 'undo' });
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  const draft = useDraft(store, load, workflow, dispatch);
  const theme = useTheme();
  const flow = useReactFlow();
  const [leftTab, setLeftTab] = useState('steps');
  const [rightTab, setRightTab] = useState('properties');
  // Selecting a step or connection always shows its properties.
  useEffect(() => {
    if (state.nodeId || state.edgeId) setRightTab('properties');
  }, [state.nodeId, state.edgeId]);
  // A different document (example, import, AI proposal, other tab) is fitted into view once.
  const workflowId = workflow.workflowId;
  useEffect(() => {
    const handle = window.setTimeout(() => void flow.fitView(FIT_VIEW), 50);
    return () => window.clearTimeout(handle);
  }, [workflowId, flow]);
  // Messages are translated when computed, so the language is part of the cache key.
  const issues = useMemo(() => describeWorkflow(workflow), [workflow, locale]);
  const [run, setRun] = useState<SimulationRun | null>(null);
  // Layout is outside the content hash, so moving steps keeps a run current (ADR-014/017).
  const stale = useMemo(
    () => run !== null && computeContentHash(workflow) !== run.workflowContentHash,
    [run, workflow],
  );
  const path = useMemo(
    () => (run && !stale ? visitedPath(workflow, run) : null),
    [run, stale, workflow],
  );
  const nodes = useMemo<CanvasNode[]>(() => {
    const invalid = invalidConditionIds(workflow);
    const counts = issueCountsByNode(issues);
    return workflow.nodes.map((node) => ({
      id: node.id,
      type: 'workflow',
      position: node.position,
      data: {
        locale,
        node,
        summary: invalid.has(node.id) ? null : conditionSummary(workflow, node),
        issueCount: counts.get(node.id) ?? 0,
        simulation:
          run && !stale && run.currentNodeId === node.id
            ? ('current' as const)
            : path?.nodes.has(node.id)
              ? ('visited' as const)
              : null,
      },
      selected: state.nodeId === node.id,
      ...(measurements[node.id] ? { measured: measurements[node.id] } : {}),
      ariaLabel: `${t(NODE_LABELS[node.type])}: ${node.label}`,
    }));
  }, [workflow, issues, run, stale, path, state.nodeId, measurements, locale]);
  const edges = useMemo<Edge[]>(
    () =>
      workflow.edges.map((edge) => ({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        sourceHandle: edge.sourceHandle,
        targetHandle: 'input',
        label: t(HANDLE_LABELS[edge.sourceHandle]),
        selected: state.edgeId === edge.id,
        type: 'smoothstep',
        animated: path?.edges.has(edge.id) ?? false,
        ...(path?.edges.has(edge.id) ? { className: 'sim-edge' } : {}),
      })),
    [workflow.edges, state.edgeId, path, locale],
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
  const alerts = (
    <>
      {load.status === 'corrupt' && (
        <div className="draft-alert" role="alert">
          {load.backedUp
            ? t('Önceki taslak okunamadı. Yedeklendi ve boş bir taslakla başlandı.')
            : t('Önceki taslak okunamadı. Yedeklenemedi; boş bir taslakla başlandı.')}
        </div>
      )}
      {!draft.conflict && draft.status === 'quota' && (
        <div className="draft-alert" role="alert">
          {t(
            'Tarayıcı depolaması dolu olduğu için son değişiklikler kaydedilmedi. Sayfayı yenilerseniz kaybolur.',
          )}
        </div>
      )}
      {!draft.conflict && draft.status === 'unavailable' && (
        <div className="draft-alert" role="alert">
          {t('Tarayıcı depolamasına erişilemiyor; değişiklikler yalnız bu oturumda kalır.')}
        </div>
      )}
      {draft.conflict && (
        <div className="draft-alert" role="alert">
          <p>
            {t(
              'Bu taslak başka bir sekmede değiştirildi. Otomatik kayıt duraklatıldı; hangi sürümle devam edeceğinizi seçin.',
            )}
          </p>
          {draft.conflictError && (
            <p>{t('Diğer sekmedeki kayıt okunamadı. Bu sekmedeki taslağı kaydedebilirsiniz.')}</p>
          )}
          <button type="button" className="secondary" onClick={draft.loadOther}>
            {t('Diğer sekmedeki sürümü yükle')}
          </button>{' '}
          <button type="button" onClick={draft.keepThis}>
            {t('Bu sekmedekini kaydet')}
          </button>
        </div>
      )}
    </>
  );
  const stepsTab = (
    <>
      <h2 className="panel-heading">{t('Adım ekle')}</h2>
      <p className="muted">{t('Akışınızı adım adım oluşturun.')}</p>
      <div className="palette-grid">
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
            {t('{kind} ekle', { kind: t(NODE_LABELS[kind]) })}
            <span aria-hidden="true" className="palette-plus">
              +
            </span>
          </button>
        ))}
      </div>
      <h2 className="panel-heading">{t('Akıştaki adımlar')}</h2>
      <p className="muted">
        {t('{nodes} / 50 adım · {edges} / 100 bağlantı', {
          nodes: workflow.nodes.length,
          edges: workflow.edges.length,
        })}
      </p>
      <ol className="node-list" aria-label={t('Akıştaki adımlar')}>
        {workflow.nodes.map((node) => (
          <li key={node.id}>
            <button
              className={`list-button kind-${node.type}`}
              aria-pressed={state.nodeId === node.id}
              onClick={() => dispatch({ type: 'select-node', id: node.id })}
            >
              <span className="kind-dot" aria-hidden="true" />
              <span className="list-text">
                {node.label}
                <small>{t(NODE_LABELS[node.type])}</small>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="draft-notice">
        {t(
          'Taslak bu tarayıcıda otomatik kaydedilir; eksik adımlar olsa da yenilemede geri gelir. Hesap veya bulut kaydı yoktur.',
        )}
      </p>
    </>
  );
  const propertiesTab = (
    <>
      {selectedNode ? (
        <NodePropertiesForm
          key={selectedNode.id}
          workflow={workflow}
          node={selectedNode}
          dispatch={dispatch}
        />
      ) : selectedEdge ? (
        <div className="card">
          <p>{t('{handle} bağlantısı', { handle: t(HANDLE_LABELS[selectedEdge.sourceHandle]) })}</p>
          <button
            className="danger"
            onClick={() => dispatch({ type: 'delete-edge', id: selectedEdge.id })}
          >
            {t('Bağlantıyı sil')}
          </button>
        </div>
      ) : (
        <p className="empty-hint">{t('Düzenlemek için tuvalden veya listeden bir adım seçin.')}</p>
      )}
      <ConnectionForm workflow={workflow} dispatch={dispatch} />
      <div className="editor-feedback" aria-live="polite">
        {state.error && <p role="alert">{state.error}</p>}
      </div>
      {!!workflow.edges.length && (
        <div className="connections">
          <h3>{t('Bağlantılar')}</h3>
          <ul aria-label={t('Akış bağlantıları')}>
            {workflow.edges.map((edge) => (
              <li key={edge.id}>
                <button
                  className="list-button"
                  aria-pressed={state.edgeId === edge.id}
                  onClick={() => dispatch({ type: 'select-edge', id: edge.id })}
                >
                  <span className="list-text">
                    {workflow.nodes.find((node) => node.id === edge.sourceNodeId)?.label} →{' '}
                    {workflow.nodes.find((node) => node.id === edge.targetNodeId)?.label}
                    <small>{t(HANDLE_LABELS[edge.sourceHandle])}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
  const themeLabel = t('Tema: {mode}', {
    mode: theme.choice === 'system' ? t('Sistem') : theme.choice === 'dark' ? t('Koyu') : t('Açık'),
  });
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            WB
          </span>
          <div>
            <p className="eyebrow">{t('WORKFLOW BUILDER')}</p>
            <h1>{t('İş akışı tasarımı')}</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="history-buttons" role="group" aria-label={t('Geçmiş')}>
            <button
              type="button"
              className="ghost"
              disabled={!history.past.length}
              title={t('Ctrl/Cmd+Z')}
              onClick={() => dispatch({ type: 'undo' })}
            >
              <span aria-hidden="true">↶ </span>
              {t('Geri al')}
            </button>
            <button
              type="button"
              className="ghost"
              disabled={!history.future.length}
              title={t('Ctrl/Cmd+Shift+Z veya Ctrl+Y')}
              onClick={() => dispatch({ type: 'redo' })}
            >
              <span aria-hidden="true">↷ </span>
              {t('Yinele')}
            </button>
          </div>
          <span
            className={`draft-badge status-${draft.conflict ? 'conflict' : draft.status}`}
            role="status"
          >
            {draft.conflict ? t('Otomatik kayıt duraklatıldı') : t(STATUS_LABELS[draft.status])}
          </span>
          <button
            type="button"
            className="ghost icon-button"
            aria-label={themeLabel}
            title={themeLabel}
            onClick={() =>
              setTheme(
                theme.choice === 'system' ? 'light' : theme.choice === 'light' ? 'dark' : 'system',
              )
            }
          >
            <span aria-hidden="true">
              {theme.choice === 'system' ? '◐' : theme.choice === 'dark' ? '☾' : '☀'}
            </span>
          </button>
          <label className="language-switch">
            <span className="visually-hidden">{t('Dil')}</span>
            <select
              aria-label={t('Dil')}
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
            >
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </label>
          <AccountPanel account={account} />
          <a className="service-link" href="/health">
            {t('Servis durumu')}
          </a>
        </div>
      </header>
      {/* Always rendered so the workspace keeps the flexible grid row. */}
      <div className="alerts">{alerts}</div>
      <main className="workspace">
        <aside className="side-panel palette" aria-label={t('Adım paleti')}>
          <Tabs
            label={t('Araçlar')}
            active={leftTab}
            onChange={setLeftTab}
            items={[
              { id: 'steps', label: t('Adımlar'), content: stepsTab },
              {
                id: 'fields',
                label: t('Alanlar'),
                content: <InputFields workflow={workflow} dispatch={dispatch} />,
              },
              {
                id: 'create',
                label: t('Oluştur'),
                content: (
                  <>
                    <AiPanel account={account} workflow={workflow} dispatch={dispatch} />
                    <ExamplesPanel dispatch={dispatch} />
                  </>
                ),
              },
              {
                id: 'file',
                label: t('Dosya'),
                content: (
                  <>
                    <TransferPanel workflow={workflow} dispatch={dispatch} />
                    <CloudPanel
                      workflow={workflow}
                      executable={issues.length === 0}
                      account={account}
                    />
                  </>
                ),
              },
            ]}
          />
        </aside>
        <section className="canvas-panel" aria-label={t('İş akışı tuvali')}>
          <div className="canvas-title">
            <h2>{workflow.title}</h2>
            <span>{t('Çıkış noktalarını sürükleyerek bağlayın')}</span>
          </div>
          <div className="flow-canvas">
            <ReactFlow<CanvasNode>
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              colorMode={theme.resolved}
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
              onNodeDragStart={() => dispatch({ type: 'checkpoint' })}
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
              fitView
              fitViewOptions={FIT_VIEW}
              minZoom={0.2}
              maxZoom={2}
              edgesReconnectable={false}
              deleteKeyCode={['Backspace', 'Delete']}
              ariaLabelConfig={{
                'controls.zoomIn.ariaLabel': t('Yakınlaştır'),
                'controls.zoomOut.ariaLabel': t('Uzaklaştır'),
                'controls.fitView.ariaLabel': t('Tümünü göster'),
                'controls.interactive.ariaLabel': t('Düzenlemeyi kilitle veya aç'),
              }}
            >
              <Background gap={24} size={1} />
              <Controls position="bottom-right" />
              <MiniMap position="top-right" pannable zoomable className="minimap" />
            </ReactFlow>
            {!nodes.length && (
              <div className="canvas-empty">
                <span aria-hidden="true">↖</span>
                <h3>{t('İlk adımla başlayın')}</h3>
                <p>{t('Soldan bir başlangıç adımı ekleyin.')}</p>
              </div>
            )}
            <ValidationPanel issues={issues} dispatch={dispatch} />
          </div>
        </section>
        <aside className="side-panel inspector" aria-label={t('Adım özellikleri')}>
          <Tabs
            label={t('Ayrıntılar')}
            active={rightTab}
            onChange={setRightTab}
            items={[
              { id: 'properties', label: t('Özellikler'), content: propertiesTab },
              {
                id: 'simulation',
                label: t('Simülasyon'),
                content: (
                  <SimulationPanel
                    workflow={workflow}
                    executable={issues.length === 0}
                    run={run}
                    stale={stale}
                    setRun={setRun}
                  />
                ),
              },
            ]}
          />
        </aside>
      </main>
    </div>
  );
}

export function Editor() {
  return (
    <ReactFlowProvider>
      <EditorWorkspace />
    </ReactFlowProvider>
  );
}
