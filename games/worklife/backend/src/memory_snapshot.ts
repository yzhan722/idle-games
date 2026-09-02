import type { EnhancedPlayerState, Party, UserRecord } from "./types";

export type MemorySnapshot = {
  version: 1;
  users: UserRecord[];
  states: Array<[string, EnhancedPlayerState]>;
  parties: Party[];
};

export function emptySnapshot(): MemorySnapshot {
  return { version: 1, users: [], states: [], parties: [] };
}

export function buildSnapshot(input: {
  users: Iterable<UserRecord>;
  states: Iterable<[string, EnhancedPlayerState]>;
  parties: Iterable<Party>;
}): MemorySnapshot {
  return {
    version: 1,
    users: [...input.users],
    states: [...input.states],
    parties: [...input.parties],
  };
}

export function parseSnapshot(raw: unknown): MemorySnapshot {
  if (!raw || typeof raw !== "object") return emptySnapshot();
  const obj = raw as Partial<MemorySnapshot>;
  return {
    version: 1,
    users: Array.isArray(obj.users) ? obj.users : [],
    states: Array.isArray(obj.states) ? (obj.states as MemorySnapshot["states"]) : [],
    parties: Array.isArray(obj.parties) ? obj.parties : [],
  };
}
