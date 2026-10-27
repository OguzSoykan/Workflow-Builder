// Public pure-core entry point; graph validation belongs to WB-003A.
export { validateWorkflow, validateWorkflowJSON } from './validator.ts';
export {
  startSimulation,
  decideApproval,
  normalizeInputs,
  evaluateCondition,
} from './simulator.ts';
export type {
  SimulationRun,
  SimulationStep,
  SimulationStatus,
  SimulationResult,
  ApprovalDecision,
  InputValue,
  InputIssue,
  InputIssueCode,
} from './simulator.ts';
