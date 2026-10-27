import { useState } from 'react';
import type { InputField, Workflow } from '@workflow-builder/workflow-contract';
import {
  decideApproval,
  startSimulation,
  type ApprovalDecision,
  type SimulationRun,
} from '@workflow-builder/workflow-core';
import { INPUT_LABELS } from './input-draft';
import { describeStep, inputIssueText, simulationInputsFromForm } from './simulation-view';

function InputControl({ field, used }: { field: InputField; used: boolean }) {
  const name = `sim:${field.key}`;
  const initial = field.defaultValue === undefined ? '' : String(field.defaultValue);
  const label = `${field.label} (${INPUT_LABELS[field.type]}${field.required || used ? ', gerekli' : ''})`;
  if (field.type === 'boolean' || field.type === 'enum')
    return (
      <label>
        {label}
        <select name={name} defaultValue={initial}>
          <option value="">Seçilmedi</option>
          {(field.type === 'enum' ? field.options : ['true', 'false']).map((option) => (
            <option key={option} value={option}>
              {field.type === 'boolean' ? (option === 'true' ? 'Doğru' : 'Yanlış') : option}
            </option>
          ))}
        </select>
      </label>
    );
  return (
    <label>
      {label}
      <input
        name={name}
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        step="any"
        defaultValue={initial}
      />
    </label>
  );
}

const STATUS_TEXT: Record<SimulationRun['status'], string> = {
  waiting_for_approval: 'Onay bekleniyor',
  completed: 'Sonuç: akış tamamlandı',
  rejected: 'Sonuç: akış reddedildi',
};

// Simulation only: nothing is sent or stored; the run lives in memory (FR-14 is out of scope).
export function SimulationPanel({
  workflow,
  executable,
  run,
  stale,
  setRun,
}: {
  workflow: Workflow;
  executable: boolean;
  run: SimulationRun | null;
  stale: boolean;
  setRun: (run: SimulationRun | null) => void;
}) {
  const [errors, setErrors] = useState<string[]>([]);
  const used = new Set(
    workflow.nodes.flatMap((node) => (node.type === 'condition' ? [node.config.fieldKey] : [])),
  );
  const current = run && workflow.nodes.find((node) => node.id === run.currentNodeId);
  const decide = (decision: ApprovalDecision) => {
    if (!run) return;
    const result = decideApproval(workflow, run, decision);
    if (result.ok) setRun(result.run);
    else setErrors(['Akış değişti; simülasyonu yeniden başlatın.']);
  };
  return (
    <section className="simulation-panel" aria-label="Simülasyon">
      <h2>Simülasyon</h2>
      <p className="simulation-note">
        Yalnız simülasyon: e-posta, onay isteği veya harici işlem gönderilmez; sonuç kaydedilmez.
      </p>
      {!executable ? (
        <p className="muted">Simülasyon için önce doğrulama sorunlarını giderin.</p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const values = simulationInputsFromForm(
              new FormData(event.currentTarget),
              workflow.inputs,
            );
            const result = startSimulation(workflow, values, `run_${crypto.randomUUID()}`);
            if (result.ok) {
              setErrors([]);
              setRun(result.run);
            } else
              setErrors(
                result.error === 'INPUT_INVALID'
                  ? result.inputIssues.map((issue) => inputIssueText(issue, workflow))
                  : ['Akış simüle edilemiyor; doğrulama sorunlarını kontrol edin.'],
              );
          }}
        >
          {workflow.inputs.length ? (
            <fieldset className="simulation-inputs">
              <legend>Girdi değerleri</legend>
              {workflow.inputs.map((field) => (
                <InputControl key={field.key} field={field} used={used.has(field.key)} />
              ))}
            </fieldset>
          ) : (
            <p className="muted">Akışta giriş alanı yok.</p>
          )}
          <button type="submit">{run ? 'Yeniden başlat' : 'Simülasyonu başlat'}</button>{' '}
          {run && (
            <button type="button" className="secondary" onClick={() => setRun(null)}>
              Simülasyonu temizle
            </button>
          )}
        </form>
      )}
      {errors.length > 0 && (
        <ul className="simulation-errors" role="alert">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      {run && (
        <div className="simulation-run">
          <p role="status">
            <strong>
              {stale ? 'Akış değişti; simülasyonu yeniden başlatın.' : STATUS_TEXT[run.status]}
            </strong>
          </p>
          {run.status === 'waiting_for_approval' && current?.type === 'approval' && (
            <div className="simulation-decision" role="group" aria-label="Onay kararı">
              <p>
                “{current.label}” — {current.config.roleLabel} olarak karar verin.
              </p>
              <button type="button" disabled={stale} onClick={() => decide('approved')}>
                Onayla
              </button>{' '}
              <button
                type="button"
                className="danger"
                disabled={stale}
                onClick={() => decide('rejected')}
              >
                Reddet
              </button>
            </div>
          )}
          <h3>Adım kaydı</h3>
          <ol aria-label="Simülasyon adımları">
            {run.trace.map((step) => (
              <li key={step.stepIndex}>{describeStep(workflow, step, run)}</li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
