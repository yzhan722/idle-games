import type { EnhancedContentPack, EnhancedPlayerState } from './types';

export type PlayerCommand<T> = {
  userId: string;
  now: Date;
  contentPack: EnhancedContentPack;
  expectedRevision?: number;
  /**
   * Client-supplied idempotency key. A committed receipt with the same key replays its stored
   * result instead of re-applying; the same key with a different payload is a 409 mismatch.
   */
  operationId?: string;
  /** The request's business payload (everything except transport fields), hashed into the receipt. */
  operationPayload?: unknown;
  /** Pure, synchronous business mutation of an isolated draft. May be replayed after a conflict. */
  apply: (state: EnhancedPlayerState) => T;
};

export type PlayerCommandReceipt = {
  operationId: string;
  requestHash: string;
  result: unknown;
  stateRevision: number;
  createdAt: string;
};

export type PlayerCommandResult<T> = { state: EnhancedPlayerState; result: T; deduplicated?: boolean };

export class PlayerCommandConflict extends Error {
  constructor(readonly stateRevision: number) { super('state_version_conflict'); }
}

export class PlayerCommandRejected extends Error {
  constructor(readonly code: string, readonly details?: unknown) { super(code); }
}

/** The same operationId was already committed with different business parameters. */
export class PlayerCommandOperationMismatch extends Error {
  constructor() { super('operation_id_mismatch'); }
}

/** Strip transport fields so the hash only covers the client's business intent. */
export function operationPayload(body: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  const { expectedRevision: _e, operationId: _o, ...rest } = body as Record<string, unknown>;
  return rest;
}

function canonical(value: unknown): string {
  if (value === undefined) return '';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const o = value as Record<string, unknown>;
  return `{${Object.keys(o).sort().filter(k => o[k] !== undefined).map(k => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`;
}

export function commandOperationHash(userId: string, operationId: string, payload: unknown): string {
  return canonical({ userId, operationId, payload });
}

export function commandRevision(state: EnhancedPlayerState, expectedRevision?: number): number {
  const revision = state.stateRevision ?? 0;
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('state_version_conflict');
  if (expectedRevision !== undefined && expectedRevision !== revision) throw new PlayerCommandConflict(revision);
  return revision;
}

/** Does not publish anything; a storage implementation commits this draft exactly once. */
export function applyPlayerCommand<T>(settled: EnhancedPlayerState, apply: PlayerCommand<T>['apply']): PlayerCommandResult<T> {
  const state = structuredClone(settled);
  const result = apply(state);
  if (result && typeof (result as any).then === 'function') throw new Error('async_player_command');
  if (Object.values(state.inventory).some(qty => !Number.isFinite(qty) || qty < 0)) {
    throw new Error('invalid_command_inventory');
  }
  return { state, result };
}
