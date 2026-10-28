import type { Dispatch } from 'react';
import {
  WORKFLOW_LIMITS,
  type Workflow,
  type WorkflowNode,
} from '@workflow-builder/workflow-contract';
import { BranchStatus } from './BranchStatus';
import { ConditionFields } from './ConditionFields';
import { conditionFromForm } from './condition-model';
import { NODE_LABELS, type EditableProperties, type EditorAction } from './model';
import { t } from '../i18n/i18n';

export function NodePropertiesForm({
  workflow,
  node,
  dispatch,
}: {
  workflow: Workflow;
  node: WorkflowNode;
  dispatch: Dispatch<EditorAction>;
}) {
  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const label = String(data.get('label') ?? '');
          if (node.type === 'condition') {
            const field = workflow.inputs.find((item) => item.key === data.get('fieldKey'));
            dispatch(
              field
                ? {
                    type: 'update-condition',
                    id: node.id,
                    label,
                    config: conditionFromForm(data, field),
                  }
                : { type: 'rename-node', id: node.id, label },
            );
            return;
          }
          let properties: EditableProperties;
          switch (node.type) {
            case 'start': {
              const description = String(data.get('description') ?? '');
              properties = { type: 'start', config: description === '' ? {} : { description } };
              break;
            }
            case 'approval':
              properties = {
                type: 'approval',
                config: { roleLabel: String(data.get('role') ?? '') },
              };
              break;
            case 'end':
              properties = {
                type: 'end',
                config: { outcome: data.get('outcome') === 'rejected' ? 'rejected' : 'completed' },
              };
              break;
          }
          dispatch({ type: 'update-properties', id: node.id, label, properties });
        }}
      >
        <p className="muted">{t('{kind} adımı', { kind: t(NODE_LABELS[node.type]) })}</p>
        <label>
          {t('Adım adı')}
          <input name="label" defaultValue={node.label} required maxLength={120} />
        </label>
        {node.type === 'start' && (
          <label>
            {t('Başlangıç açıklaması (isteğe bağlı)')}
            <textarea
              name="description"
              defaultValue={node.config.description ?? ''}
              maxLength={WORKFLOW_LIMITS.text}
            />
          </label>
        )}
        {node.type === 'approval' && (
          <>
            <label>
              {t('Onaylayan rolü')}
              <input name="role" defaultValue={node.config.roleLabel} required maxLength={120} />
            </label>
            <p className="muted">
              {t('Onaylayan kabul ederse “Onaylandı”, reddederse “Reddedildi” çıkışı izlenir.')}
            </p>
          </>
        )}
        {node.type === 'end' && (
          <label htmlFor="node-outcome">
            {t('Bitiş sonucu')}
            <select id="node-outcome" name="outcome" defaultValue={node.config.outcome}>
              <option value="completed">{t('Tamamlandı')}</option>
              <option value="rejected">{t('Reddedildi')}</option>
            </select>
          </label>
        )}
        {node.type === 'condition' && <ConditionFields node={node} inputs={workflow.inputs} />}
        <p className="muted">
          {t(
            'Alanları düzenleyip değişiklikleri uygulayın. Uygulanmayan girişler başka bir adım seçilince silinir.',
          )}
        </p>
        <button type="submit">{t('Değişiklikleri uygula')}</button>
        <button
          type="button"
          className="danger"
          onClick={() => dispatch({ type: 'delete-node', id: node.id })}
        >
          {t('Adımı sil')}
        </button>
      </form>
      <BranchStatus workflow={workflow} node={node} />
    </>
  );
}
