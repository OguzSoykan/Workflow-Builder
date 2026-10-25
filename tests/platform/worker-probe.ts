import { canonicalizeWorkflow, computeContentHash } from '@workflow-builder/workflow-contract';
import { validateWorkflow } from '@workflow-builder/workflow-core';

// Local test runtime only. Not a public product endpoint or deployment target.
export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'GET') return Response.json({ ready: true });
    try {
      const workflow: unknown = await request.json();
      return Response.json({
        validation: validateWorkflow(workflow),
        canonicalJSON: canonicalizeWorkflow(workflow),
        contentHash: computeContentHash(workflow),
      });
    } catch {
      return Response.json({ error: 'INVALID_WORKFLOW' }, { status: 400 });
    }
  },
};
