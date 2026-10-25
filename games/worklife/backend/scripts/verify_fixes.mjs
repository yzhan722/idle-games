// Live verification of the defect-fix batch. Run: npx tsx verify_fixes.mjs
// Requires the dev backend on :3001.
const B = 'http://localhost:3001';
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✖ ${name} ${extra}`); }
};
async function api(path, { method = 'GET', token, body, raw } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${B}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch {}
  return raw ? res : { status: res.status, json };
}

// --- 1. guest resumeToken lifecycle ---
console.log('== guest resume / bind / logout ==');
const g = await api('/auth/guest', { method: 'POST', body: {} });
ok('guest login 200', g.status === 200, JSON.stringify(g.json));
ok('guest returns resumeToken', !!g.json?.resumeToken);
const gTok = g.json.token, gResume = g.json.resumeToken, gId = g.json.userId;

// resume with token → same account
const r1 = await api('/auth/guest', { method: 'POST', body: { resumeToken: gResume } });
ok('resume returns same userId', r1.json?.userId === gId, JSON.stringify(r1.json));

// bind password → rotates credentials
const name = `u${Math.random().toString(36).slice(2, 10)}`;
const bind = await api('/auth/bind/password', { method: 'POST', token: gTok, body: { username: name, password: 'secret123' } });
ok('bind/password 200', bind.status === 200, JSON.stringify(bind.json));
const newTok = bind.json?.token, newResume = bind.json?.resumeToken;

// old JWT dead (authVersion bump)
const oldJwt = await api('/player/state', { token: gTok });
ok('old JWT rejected after bind', oldJwt.status === 401, `got ${oldJwt.status}`);
// old resumeToken dead
const oldResume = await api('/auth/guest', { method: 'POST', body: { resumeToken: gResume } });
ok('old resumeToken rejected after bind', oldResume.status === 401 || oldResume.status === 403, `got ${oldResume.status}`);
// new token works
const newState = await api('/player/state', { token: newTok });
ok('new session works', newState.status === 200, `got ${newState.status}`);

// password login still works
const login = await api('/auth/login', { method: 'POST', body: { username: name, password: 'secret123' } });
ok('password login', login.status === 200 && login.json?.userId === gId);

// double bind rejected
const rebind = await api('/auth/bind/password', { method: 'POST', token: newTok, body: { username: `x${name}`, password: 'secret123' } });
ok('re-bind rejected', rebind.status === 400 || rebind.status === 409, `got ${rebind.status}`);

// logout kills token
const logout = await api('/auth/logout', { method: 'POST', token: newTok });
ok('logout 200', logout.status === 200);
const afterLogout = await api('/player/state', { token: newTok });
ok('JWT dead after logout', afterLogout.status === 401, `got ${afterLogout.status}`);

// whitespace password rejected
const g2 = await api('/auth/guest', { method: 'POST', body: {} });
const wsBind = await api('/auth/bind/password', { method: 'POST', token: g2.json.token, body: { username: `w${name}`, password: '      ' } });
ok('whitespace password rejected', wsBind.status === 400, `got ${wsBind.status}`);

// google bind without valid idToken rejected
const gBind = await api('/auth/bind/google', { method: 'POST', token: g2.json.token, body: { googleSub: 'totally-fake-sub' } });
ok('fake google bind rejected', gBind.status === 400 || gBind.status === 401, `got ${gBind.status}: ${JSON.stringify(gBind.json)}`);

// --- 2. party ghost ops ---
console.log('== party semantics ==');
const p = g2.json.token;
for (const [path, body] of [
  ['/party/kick', { partyId: 'ghost', memberId: 'x' }],
  ['/party/transfer-leadership', { partyId: 'ghost', memberId: 'x' }],
  ['/party/complete-activity', { partyId: 'ghost' }],
  ['/party/cancel-activity', { partyId: 'ghost' }],
  ['/party/leave', { partyId: 'ghost' }],
  ['/party/invite/decline', { partyId: 'ghost' }],
]) {
  const r = await api(path, { method: 'POST', token: p, body });
  ok(`${path} ghost → 400`, r.status === 400, `got ${r.status}`);
}
const emptyName = await api('/party/create', { method: 'POST', token: p, body: { name: '   ' } });
ok('empty party name rejected', emptyName.status === 400, `got ${emptyName.status}`);

// --- 3. strict schemas / route semantics ---
console.log('== strict schemas & route semantics ==');
const strict = await api('/party/create', { method: 'POST', token: p, body: { name: 'ok', bogusField: 1 } });
ok('unknown field rejected', strict.status === 400, `got ${strict.status}`);
const qMove = await api('/actions/queue/move', { method: 'POST', token: p, body: { id: 'ghost', direction: 'up' } });
ok('queue/move ghost → 404', qMove.status === 404, `got ${qMove.status}`);
const skill404 = await api('/skills/progress/ghost', { token: p });
ok('skills/progress ghost → 404', skill404.status === 404, `got ${skill404.status}`);
const trend = await api('/trading/price-trend/ghost_item', { token: p });
ok('price-trend ghost → 404', trend.status === 404, `got ${trend.status}`);
const days = await api('/trading/price-history/wood_1?days=abc', { token: p });
ok('price-history bad days → 400', days.status === 400, `got ${days.status}`);

// --- 4. WS first-message auth + private chat + throttle ---
console.log('== websocket ==');
const WebSocket = (await import('ws')).default;
function wsClient() { return new WebSocket(`ws://localhost:3001/ws`); }
const w1 = wsClient();
const w1msgs = [];
w1.on('message', d => w1msgs.push(JSON.parse(d.toString())));
await new Promise(r => w1.on('open', r));
// no token in query — auth via first message
w1.send(JSON.stringify({ type: 'auth', token: p }));
await new Promise(r => setTimeout(r, 400));
ok('WS auth via first message', w1msgs.some(m => m.type === 'auth:ok' || m.type === 'presence'), JSON.stringify(w1msgs));

// private chat echo with senderName
const g3 = await api('/auth/guest', { method: 'POST', body: {} });
const w2 = wsClient();
const w2msgs = [];
w2.on('message', d => w2msgs.push(JSON.parse(d.toString())));
await new Promise(r => w2.on('open', r));
w2.send(JSON.stringify({ type: 'auth', token: g3.json.token }));
await new Promise(r => setTimeout(r, 400));
w1msgs.length = 0; w2msgs.length = 0;
w1.send(JSON.stringify({ type: 'chat:send', channel: 'private', recipient: g3.json.userId, content: 'secret-hi' }));
await new Promise(r => setTimeout(r, 500));
const echo = w1msgs.find(m => m.type === 'chat:message' && m.channel === 'private');
const got = w2msgs.find(m => m.type === 'chat:message' && m.channel === 'private');
ok('private echo received', !!echo);
ok('private delivered to recipient', !!got && got.content === 'secret-hi', JSON.stringify(w2msgs));
ok('echo carries senderName', !!echo?.senderName || !!got?.senderName, JSON.stringify(echo || got));

// empty message gets an error receipt
w1msgs.length = 0;
w1.send(JSON.stringify({ type: 'chat:send', channel: 'world', content: '' }));
await new Promise(r => setTimeout(r, 400));
ok('empty chat → error receipt', w1msgs.some(m => m.type === 'chat:error'), JSON.stringify(w1msgs));

// throttle: burst of 12 world messages
w1msgs.length = 0;
for (let i = 0; i < 12; i++) w1.send(JSON.stringify({ type: 'chat:send', channel: 'world', content: `burst-${i}` }));
await new Promise(r => setTimeout(r, 1200));
const throttled = w1msgs.filter(m => m.type === 'chat:error' || m.type === 'chat:rate');
const delivered = w1msgs.filter(m => m.type === 'chat:message');
ok('chat throttle engages on burst', throttled.length > 0 || delivered.length < 12, `errors=${throttled.length} delivered=${delivered.length}`);

// invalid token first message → close / auth error
const w3 = wsClient();
const w3msgs = [];
let w3closed = false;
w3.on('message', d => w3msgs.push(JSON.parse(d.toString())));
w3.on('close', () => { w3closed = true; });
await new Promise(r => w3.on('open', r));
w3.send(JSON.stringify({ type: 'auth', token: 'garbage' }));
await new Promise(r => setTimeout(r, 500));
ok('bad WS auth → error or close', w3closed || w3msgs.some(m => m.type === 'auth:error' || m.type === 'error'), JSON.stringify(w3msgs));
w1.close(); w2.close(); w3.close();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
