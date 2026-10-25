import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSync } from 'esbuild';
import path from 'node:path';

// Compile the browser module with an empty Vite env; only the HTTP boundary is substituted.
function client() {
  const output = buildSync({ entryPoints: [path.resolve('frontend/src/services/api.ts')], bundle: true,
    platform: 'node', format: 'cjs', write: false, define: { 'import.meta.env': '{}' } });
  const mod = { exports: {} as any };
  new Function('module', 'exports', output.outputFiles[0].text)(mod, mod.exports);
  return mod.exports.apiClient;
}

test('a write with an unknown result is not replayed automatically', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new TypeError('Failed to fetch'); };
  try {
    await assert.rejects(client().post('/houses/upgrade', { roomId: 'workshop' }));
    assert.equal(calls, 1, 'the first request might already have committed');
  } finally { globalThis.fetch = original; }
});

test('a failed paid operation is not replayed on a server error', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response('{"error":"internal_error"}', {status:500}); };
  try {
    await assert.rejects(client().post('/trading/buy', { orderId:'test',quantity:1 }));
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});

test('a read may safely retry a transient error', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => ++calls === 1 ? new Response('{}', {status:503}) : new Response('{"ok":true}');
  try { assert.deepEqual(await client().get('/content'), {ok:true}); assert.equal(calls,2); }
  finally { globalThis.fetch = original; }
});

test('a write invalidates an in-flight read so the next read is fresh', async () => {
  const original = globalThis.fetch;
  const api = client();
  const releases: Array<() => void> = [];
  let getCalls = 0;
  globalThis.fetch = async (_input: any, init?: any) => {
    const method = init?.method || 'GET';
    if (method !== 'GET') return new Response('{"ok":true}');
    getCalls++;
    if (getCalls === 1) {
      await new Promise<void>((r) => releases.push(r));
      return new Response('{"orders":[]}');
    }
    return new Response('{"orders":[1]}');
  };
  try {
    const staleRead = api.get('/trading/orders/sword'); // in-flight when the write commits
    await api.post('/trading/orders', {});
    const freshRead = api.get('/trading/orders/sword'); // must not join the stale promise
    releases[0]?.();
    assert.deepEqual(await staleRead, { orders: [] });
    assert.deepEqual(await freshRead, { orders: [1] });
    assert.equal(getCalls, 2);
  } finally { globalThis.fetch = original; }
});

test('a stale in-flight read finishing late does not unregister its fresh successor', async () => {
  const original = globalThis.fetch;
  const api = client();
  const releases: Array<() => void> = [];
  let getCalls = 0;
  globalThis.fetch = async (_input: any, init?: any) => {
    const method = init?.method || 'GET';
    if (method !== 'GET') return new Response('{"ok":true}');
    const n = ++getCalls;
    await new Promise<void>((r) => releases.push(r));
    return new Response(`{"n":${n}}`);
  };
  try {
    const stale = api.get('/trading/orders/sword'); // read #1, pending
    await api.post('/trading/orders', {});
    const fresh = api.get('/trading/orders/sword');  // read #2 registers after the write
    const joined = api.get('/trading/orders/sword'); // dedupes onto read #2
    releases[0]?.();                                  // read #1 resolves; its finally must keep #2
    releases[1]?.();
    assert.deepEqual(await stale, { n: 1 });
    assert.deepEqual(await fresh, { n: 2 });
    assert.deepEqual(await joined, { n: 2 });
    assert.equal(getCalls, 2, 'read #3 would mean the stale finally removed the fresh entry');
  } finally { globalThis.fetch = original; }
});
