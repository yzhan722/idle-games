// nameFilter.mjs 的类型声明（实现是纯 ESM，Worker 也直接 import）。
export type BlockedCategory = 'insult' | 'sexual' | 'hate' | 'impersonation';
export function findBlockedTerm(raw: unknown): { category: BlockedCategory; term: string } | null;
export function isNameBlocked(raw: unknown): boolean;
export function defaultNameFor(seed: unknown): string;
export function safeDisplayName(name: unknown, seed?: unknown): string;
