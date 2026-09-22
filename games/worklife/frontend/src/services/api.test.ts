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
