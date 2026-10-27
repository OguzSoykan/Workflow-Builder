import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { NODE_HANDLES, type WorkflowNode } from '@workflow-builder/workflow-contract';
import { HANDLE_LABELS, NODE_LABELS } from './model';

export type CanvasNode = Node<{ node: WorkflowNode; summary: string | null }, 'workflow'>;

export function WorkflowCard({ data, selected, isConnectable }: NodeProps<CanvasNode>) {
  const { node, summary } = data;
  const handles = NODE_HANDLES[node.type];
  return (
    <div className={`workflow-card kind-${node.type}${selected ? ' is-selected' : ''}`}>
      {node.type !== 'start' && (
        <Handle type="target" position={Position.Left} id="input" isConnectable={isConnectable} />
      )}
      <span className="node-kind">{NODE_LABELS[node.type]}</span>
      <strong>{node.label}</strong>
      <span className="node-detail">
        {node.type === 'condition'
          ? (summary ?? 'Alan ve koşul ayarı bekliyor')
          : node.type === 'approval'
            ? node.config.roleLabel
            : node.type === 'end'
              ? node.config.outcome === 'rejected'
                ? 'Akış reddedilir'
                : 'Akış tamamlanır'
              : 'Akış burada başlar'}
      </span>
      {handles.map((handle, index) => (
        <div key={handle}>
          <span
            className="port-label"
            style={{ top: handles.length === 1 ? '50%' : `${30 + index * 45}%` }}
          >
            {HANDLE_LABELS[handle]}
          </span>
          <Handle
            type="source"
            isConnectable={isConnectable}
            position={Position.Right}
            id={handle}
            style={{ top: handles.length === 1 ? '50%' : `${30 + index * 45}%` }}
          />
        </div>
      ))}
    </div>
  );
}
