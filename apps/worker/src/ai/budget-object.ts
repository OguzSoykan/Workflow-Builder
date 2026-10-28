import { BudgetLedger, type ReserveResult, type Settlement, type SqlStore } from './budget-ledger';

// Fixed by product decision (D-07, Faz 5 kararları): 4,50 USD stop, one AI request per member per UTC day.
export const STOP_AT_MICROS = 4_500_000;
export const DAILY_LIMIT = 1;

type Command =
  | { op: 'reserve'; requestId: string; subject: string; day: string; maxMicros: number }
  | { op: 'settle'; requestId: string; settlement: Settlement }
  | { op: 'totals' }
  | { op: 'quota'; subject: string; day: string };

/** The single global SQLite-backed Durable Object (`AI_BUDGET`, name "global"). */
export class AiBudget {
  private readonly ledger: BudgetLedger;
  constructor(ctx: { storage: { sql: SqlStore } }) {
    this.ledger = new BudgetLedger(ctx.storage.sql, {
      stopAtMicros: STOP_AT_MICROS,
      dailyLimit: DAILY_LIMIT,
    });
  }

  async fetch(request: Request): Promise<Response> {
    let command: Command;
    try {
      command = (await request.json()) as Command;
    } catch {
      return Response.json({ error: 'INVALID_COMMAND' }, { status: 400 });
    }
    switch (command.op) {
      case 'reserve':
        return Response.json(this.ledger.reserve(command));
      case 'settle':
        return Response.json({ state: this.ledger.settle(command.requestId, command.settlement) });
      case 'totals':
        return Response.json(this.ledger.totals());
      case 'quota':
        return Response.json({
          used: this.ledger.used(command.subject, command.day),
          limit: DAILY_LIMIT,
        });
      default:
        return Response.json({ error: 'INVALID_COMMAND' }, { status: 400 });
    }
  }
}

export interface DurableObjectNamespaceLike {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(request: Request): Promise<Response> };
}
export type LedgerUnavailable = { ok: false; code: 'AI_LEDGER_UNAVAILABLE' };

/** Worker-side client; any binding, network or protocol failure is reported as unavailable (fail-closed). */
export function budgetClient(namespace: DurableObjectNamespaceLike | undefined) {
  async function send<T>(command: Command): Promise<T | null> {
    if (!namespace) return null;
    try {
      const stub = namespace.get(namespace.idFromName('global'));
      const response = await stub.fetch(
        new Request('https://ai-budget.internal/', {
          method: 'POST',
          body: JSON.stringify(command),
        }),
      );
      return response.ok ? ((await response.json()) as T) : null;
    } catch {
      return null;
    }
  }
  return {
    async reserve(
      request: Omit<Extract<Command, { op: 'reserve' }>, 'op'>,
    ): Promise<ReserveResult | LedgerUnavailable> {
      return (
        (await send<ReserveResult>({ op: 'reserve', ...request })) ?? {
          ok: false,
          code: 'AI_LEDGER_UNAVAILABLE',
        }
      );
    },
    settle(requestId: string, settlement: Settlement) {
      return send<{ state: string | null }>({ op: 'settle', requestId, settlement });
    },
    quota(subject: string, day: string) {
      return send<{ used: number; limit: number }>({ op: 'quota', subject, day });
    },
    totals() {
      return send<{ committedMicros: number; outstandingMicros: number; remainingMicros: number }>({
        op: 'totals',
      });
    },
  };
}
