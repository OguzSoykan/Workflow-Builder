import {
  NODE_HANDLES,
  type Workflow,
  type WorkflowNode,
} from '@workflow-builder/workflow-contract';
import { HANDLE_LABELS } from './model';

// Every declared handle must be connected before the graph can be executed.
export function BranchStatus({ workflow, node }: { workflow: Workflow; node: WorkflowNode }) {
  const handles = NODE_HANDLES[node.type];
  if (!handles.length) return null;
  return (
    <div className="branch-status">
      <h3>Çıkışlar</h3>
      <ul aria-label="Adım çıkışları">
        {handles.map((handle) => {
          const edge = workflow.edges.find(
            (item) => item.sourceNodeId === node.id && item.sourceHandle === handle,
          );
          const target = workflow.nodes.find((item) => item.id === edge?.targetNodeId);
          return (
            <li key={handle} className={target ? undefined : 'is-missing'}>
              <strong>{HANDLE_LABELS[handle]}</strong>
              {target
                ? ` → ${target.label}`
                : ': bağlı değil. Akışın çalışabilmesi için bu çıkışı bir adıma bağlayın.'}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
