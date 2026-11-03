/**
 * 轻量 API 冒烟测试（需后端运行在 localhost:3001）
 * 运行: npm run test:integration
 */
const BASE = process.env.API_BASE || "http://localhost:3001";

async function request(path: string, opts: RequestInit = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  let passed = 0;
  let failed = 0;

  function ok(name: string) {
    passed++;
    console.log(`✔ ${name}`);
  }
  function fail(name: string, detail: unknown) {
    failed++;
    console.error(`✘ ${name}`, detail);
  }

  const health = await request("/health");
  if (health.status === 200 && health.body.ok) ok("health");
  else fail("health", health);

  const guest = await request("/auth/guest", { method: "POST", body: JSON.stringify({ deviceId: "test_device_integration" }) });
  const token = guest.body.token as string;
  if (guest.status === 200 && token) ok("guest login");
  else fail("guest login", guest);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const bindWithoutAuth = await request("/auth/bind/google", {
    method: "POST",
    body: JSON.stringify({ googleSub: "test-google-sub" }),
  });
  if (bindWithoutAuth.status === 401) ok("google bind requires auth");
  else fail("google bind requires auth", bindWithoutAuth);

  const bindWithAuth = await request("/auth/bind/google", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ googleSub: "test-google-sub" }),
  });
  if (bindWithAuth.status === 200 && bindWithAuth.body.userId) ok("google bind with token");
  else fail("google bind with token", bindWithAuth);

  const state = await request("/player/state", { headers: authHeaders });
  if (state.status === 200 && state.body.inventory) ok("player state");
  else fail("player state", state);

  const startAction = await request("/actions/start", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ actionId: "act_chop_wood_t1" }),
  });
  if (startAction.status === 200) ok("start life action");
  else fail("start life action", startAction);

  await new Promise((r) => setTimeout(r, 600));
  const stateAfter = await request("/player/state", { headers: authHeaders });
  const goldBefore = state.body.inventory?.gold ?? 0;
  const goldAfter = stateAfter.body.inventory?.gold ?? 0;
  const logsAfter = (stateAfter.body.logs || []).length;
  if (stateAfter.status === 200 && (goldAfter > goldBefore || logsAfter > 0)) ok("simulate rewards on state refresh");
  else fail("simulate rewards on state refresh", { goldBefore, goldAfter, logsAfter });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
