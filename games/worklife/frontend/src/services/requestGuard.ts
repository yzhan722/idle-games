/** In-flight 去重：相同 key 复用同一个 Promise，结束后删除。 */
export class InFlightMap<T> {
  private readonly map = new Map<string, Promise<T>>();

  get(key: string): Promise<T> | undefined {
    return this.map.get(key);
  }

  run(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.map.get(key);
    if (existing) return existing;
    const pending = fn().finally(() => {
      this.map.delete(key);
    });
    this.map.set(key, pending);
    return pending;
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

export function writeDedupeKey(method: string, endpoint: string, body: string): string {
  return `${method}:${endpoint}:${body}`;
}
