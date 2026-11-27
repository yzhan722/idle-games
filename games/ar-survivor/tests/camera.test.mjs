// camera.test.mjs — 摄像头开关流程的单测（不开浏览器、不碰真摄像头）：node --test games/ar-survivor/tests/camera.test.mjs
// 只用 vision.js 的开关部分；getUserMedia、video、track 都是假的
import test from 'node:test';
import assert from 'node:assert/strict';
import { ARVisionEngine } from '../public/vision.js';

const ctx2d = {};
const doc = { hidden: false, createElement: () => ({ getContext: () => ctx2d }) };
globalThis.document = doc;

class FakeTrack {
  constructor() {
    this.readyState = 'live';
    this.handlers = [];
  }
  addEventListener(type, fn) {
    this.handlers.push(fn);
  }
  stop() {
    this.readyState = 'ended'; // 真浏览器里自己 stop() 不触发 ended 事件
  }
  // 被系统 / 用户从外面停掉
  endFromOutside() {
    this.readyState = 'ended';
    for (const fn of this.handlers) fn();
  }
}
function makeStream() {
  const track = new FakeTrack();
  return { track, getTracks: () => [track], getVideoTracks: () => [track] };
}

// gum：每次调用返回一个 Promise；记录收到的条件
function setup(gum) {
  const calls = [];
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: gum === null ? {} : { mediaDevices: { getUserMedia: (c) => (calls.push(c), gum(calls.length)) } }
  });
  const video = { srcObject: null, style: {}, paused: false, plays: 0, async play() { this.plays += 1; this.paused = false; } };
  const v = new ARVisionEngine(video);
  v.initMediaPipe = async () => {};
  doc.hidden = false;
  const lost = [];
  v.onCameraLost = () => lost.push(v.mode);
  return { v, video, calls, lost };
}
const err = (name) => Object.assign(new Error(name), { name });

test('开成功 / 拒绝 / 没设备 / 被占用 / 非安全上下文：都有明确结果，失败回到小屋', async () => {
  const ok = setup(async () => makeStream());
  assert.equal(await ok.v.startCamera(), true);
  assert.equal(ok.v.mode, 'camera');
  for (const name of ['NotAllowedError', 'NotFoundError', 'NotReadableError', 'AbortError']) {
    const s = setup(async () => { throw err(name); });
    assert.equal(await s.v.startCamera(), false, name);
    assert.equal(s.v.mode, 'sim');
    assert.equal(s.calls.length, 1);
    assert.equal(s.v.mediaPipeRequested, false); // 没开成就不下载识别组件
  }
  const insecure = setup(null);
  assert.equal(await insecure.v.startCamera(), false);
  assert.equal(insecure.v.mode, 'sim');
});

test('摄像头到不了 30 帧：放宽条件再试一次', async () => {
  const s = setup(async (n) => {
    if (n === 1) throw err('OverconstrainedError');
    return makeStream();
  });
  assert.equal(await s.v.startCamera(), true);
  assert.equal(s.calls.length, 2);
  assert.equal(s.calls[1].video.frameRate, undefined);
  assert.equal(s.calls[1].audio, false);
});

test('授权框还没点就选了「先不用」：等到授权也不会打开，拿到的流立刻停掉', async () => {
  const stream = makeStream();
  let allow;
  const s = setup(() => new Promise((r) => { allow = () => r(stream); }));
  const pending = s.v.startCamera();
  s.v.enableSimMode();
  allow();
  assert.equal(await pending, null);
  assert.equal(s.v.mode, 'sim');
  assert.equal(s.video.srcObject, null);
  assert.equal(stream.track.readyState, 'ended');
});

test('连点两次「开启」：只留后一次的流，前一次的停掉；前一次失败也不影响后一次', async () => {
  const first = makeStream();
  const second = makeStream();
  const gates = [];
  const s = setup((n) => new Promise((r) => gates.push(() => r(n === 1 ? first : second))));
  const a = s.v.startCamera();
  const b = s.v.startCamera();
  gates[1]();
  assert.equal(await b, true);
  gates[0]();
  assert.equal(await a, null);
  assert.equal(s.video.srcObject, second);
  assert.equal(s.v.mode, 'camera');
  assert.equal(first.track.readyState, 'ended');
  assert.equal(second.track.readyState, 'live');
});

test('用到一半权限被收回 / 设备拔掉：回小屋并通知一次；自己关的不算', async () => {
  const stream = makeStream();
  const s = setup(async () => stream);
  await s.v.startCamera();
  stream.track.endFromOutside();
  assert.deepEqual(s.lost, ['sim']);
  assert.equal(s.video.srcObject, null);

  const stream2 = makeStream();
  const t = setup(async () => stream2);
  await t.v.startCamera();
  t.v.enableSimMode();
  stream2.track.endFromOutside(); // 迟到的事件
  assert.deepEqual(t.lost, []);
});

test('切后台再回来：画面定住就接着放；后台里被停了就重开；重开失败回小屋并通知', async () => {
  const s1 = makeStream();
  const s2 = makeStream();
  const s = setup(async (n) => {
    if (n === 1) return s1;
    if (n === 2) return s2;
    throw err('NotAllowedError');
  });
  await s.v.startCamera();
  s.video.paused = true;
  await s.v.resumeCamera();
  assert.equal(s.video.paused, false);
  assert.equal(s.calls.length, 1);

  doc.hidden = true;
  s1.track.endFromOutside();
  assert.equal(s.v.mode, 'camera'); // 后台里先不动
  doc.hidden = false;
  await s.v.resumeCamera();
  assert.equal(s.video.srcObject, s2);
  assert.deepEqual(s.lost, []);

  doc.hidden = true;
  s2.track.endFromOutside();
  doc.hidden = false;
  await s.v.resumeCamera();
  assert.equal(s.v.mode, 'sim');
  assert.deepEqual(s.lost, ['sim']);
});

test('小屋里切后台再回来：不会自己去开摄像头', async () => {
  const s = setup(async () => makeStream());
  await s.v.resumeCamera();
  assert.equal(s.calls.length, 0);
});

test('识别组件下载失败：手掌仍有肤色识别兜底，下次开摄像头会再试', async () => {
  const s = setup(async () => makeStream());
  let downloads = 0;
  s.v.initMediaPipe = async function () {
    downloads += 1;
    if (!this.handLandmarker) this.mediaPipeRequested = false;
  };
  await s.v.startCamera();
  s.v.enableSimMode();
  await s.v.startCamera();
  assert.equal(downloads, 2);
  const src = ARVisionEngine.prototype.initMediaPipe.toString();
  assert.match(src, /if \(!this\.handLandmarker\) this\.mediaPipeRequested = false;/);
});

// ---------- AR-COM3 切后台停摄像头 ----------
// 假页面：visibilityState + 事件；win 收 pagehide / pageshow
function makePage(v) {
  const on = {};
  const add = (t, fn) => (on[t] = on[t] || []).push(fn);
  const page = { visibilityState: 'visible', hidden: false, addEventListener: add };
  const win = { addEventListener: add };
  v.bindPageLifecycle(page, win);
  const fire = (t) => (on[t] || []).forEach((fn) => fn());
  return {
    on,
    hide(type = 'visibilitychange') {
      page.visibilityState = 'hidden';
      page.hidden = true;
      fire(type);
    },
    show(...types) {
      page.visibilityState = 'visible';
      page.hidden = false;
      for (const t of types.length ? types : ['visibilitychange']) fire(t);
    }
  };
}
const flush = () => new Promise((r) => setImmediate(r));

test('切后台：track.stop() 停掉摄像头、角标灭；回前台按原来的「开启」重开、角标亮', async () => {
  const streams = [];
  const s = setup(async () => (streams.push(makeStream()), streams[streams.length - 1]));
  const page = makePage(s.v);
  assert.equal(await s.v.startCamera(), true);
  assert.equal(s.v.isCameraLive(), true);

  page.hide();
  assert.equal(streams[0].track.readyState, 'ended'); // 真停了轨道，不只是暂停画面
  assert.equal(s.video.srcObject, null);
  assert.equal(s.v.isCameraLive(), false);
  assert.equal(s.v.mode, 'sim');
  assert.equal(s.v.cameraSuspended, true);

  page.show();
  await flush();
  assert.equal(s.calls.length, 2);
  assert.equal(s.video.srcObject, streams[1]);
  assert.equal(s.v.mode, 'camera');
  assert.equal(s.v.isCameraLive(), true);
  assert.equal(s.v.cameraSuspended, false);
  assert.deepEqual(s.lost, []);
});

test('锁屏 / 关页面走 pagehide 也停；visibilitychange 和 pageshow 一起回来只申请一次', async () => {
  const streams = [];
  const s = setup(async () => (streams.push(makeStream()), streams[streams.length - 1]));
  const page = makePage(s.v);
  await s.v.startCamera();
  page.hide('pagehide');
  assert.equal(streams[0].track.readyState, 'ended');
  page.show('visibilitychange', 'pageshow');
  await flush();
  assert.equal(s.calls.length, 2);
  assert.equal(s.v.isCameraLive(), true);
});

test('选了「先不用」：切后台再回来不会去申请摄像头', async () => {
  const s = setup(async () => makeStream());
  const page = makePage(s.v);
  s.v.enableSimMode();
  page.hide();
  page.show('visibilitychange', 'pageshow');
  await flush();
  assert.equal(s.calls.length, 0);
  assert.equal(s.v.isCameraLive(), false);

  // 开着时切走、在后台里点了关（或回来前改成先不用）：也不重开
  const t = setup(async () => makeStream());
  const p2 = makePage(t.v);
  await t.v.startCamera();
  p2.hide();
  t.v.enableSimMode();
  p2.show();
  await flush();
  assert.equal(t.calls.length, 1);
});

test('回前台重开被拒绝：回小屋、通知一次，之后切来切去都不再申请', async () => {
  const s = setup(async (n) => {
    if (n === 1) return makeStream();
    throw err('NotAllowedError');
  });
  const page = makePage(s.v);
  await s.v.startCamera();
  page.hide();
  page.show();
  await flush();
  assert.equal(s.v.mode, 'sim');
  assert.deepEqual(s.lost, ['sim']);
  assert.equal(s.v.cameraSuspended, false);
  for (let i = 0; i < 3; i++) {
    page.hide();
    page.show('visibilitychange', 'pageshow');
  }
  await flush();
  assert.equal(s.calls.length, 2);
  assert.deepEqual(s.lost, ['sim']);
});

test('授权框还没点就切走：拿到的流马上停，算开成了；回来只再申请一次', async () => {
  const first = makeStream();
  const second = makeStream();
  let allow;
  const s = setup((n) => (n === 1 ? new Promise((r) => { allow = () => r(first); }) : Promise.resolve(second)));
  const page = makePage(s.v);
  const pending = s.v.startCamera();
  page.hide();
  allow();
  assert.equal(await pending, true); // 授权过了：选择照样记住
  assert.equal(first.track.readyState, 'ended');
  assert.equal(s.video.srcObject, null);
  assert.equal(s.v.isCameraLive(), false);
  page.show('visibilitychange', 'pageshow');
  await flush();
  assert.equal(s.calls.length, 2);
  assert.equal(s.video.srcObject, second);

  // 授权框开着切走又切回来，之后才点允许：不重复申请，直接用
  const third = makeStream();
  let allow2;
  const t = setup(() => new Promise((r) => { allow2 = () => r(third); }));
  const p2 = makePage(t.v);
  const pending2 = t.v.startCamera();
  p2.hide();
  p2.show();
  allow2();
  assert.equal(await pending2, true);
  assert.equal(t.calls.length, 1);
  assert.equal(t.v.isCameraLive(), true);
});

test('页面在后台时打开（记住了「开启」）：先不申请，切到前台再开', async () => {
  const s = setup(async () => makeStream());
  const page = makePage(s.v);
  page.hide();
  assert.equal(await s.v.startCamera(), null);
  assert.equal(s.calls.length, 0);
  page.show();
  await flush();
  assert.equal(s.calls.length, 1);
  assert.equal(s.v.isCameraLive(), true);
});

test('回来重开还在等时又切走再回来：不重复申请；接画面时切走的作废，回来重新开，最后只留一条流', async () => {
  const streams = [];
  const gates = [];
  const s = setup((n) => {
    if (n === 1) return Promise.resolve((streams.push(makeStream()), streams[0]));
    return new Promise((r) => gates.push(() => { const st = makeStream(); streams.push(st); r(st); }));
  });
  const page = makePage(s.v);
  await s.v.startCamera();
  page.hide();
  page.show(); // 第 2 次申请，等着
  page.hide(); // 还没拿到：不动
  page.show(); // 不再申请第 3 次
  assert.equal(s.calls.length, 2);
  gates[0]();
  await flush();
  assert.equal(s.video.srcObject, streams[1]);
  assert.equal(s.v.isCameraLive(), true);

  // 画面接上、play() 还没好时切走：这条停掉作废，回来重新申请
  let playGate;
  s.video.play = () => new Promise((r) => { playGate = r; });
  page.hide();
  page.show();
  gates[1]();
  await flush();
  page.hide();
  assert.equal(streams[2].track.readyState, 'ended');
  s.video.play = async () => {};
  page.show();
  playGate();
  gates[2]();
  await flush();
  assert.equal(s.calls.length, 4);
  assert.equal(s.video.srcObject, streams[3]);
  assert.equal(s.v.mode, 'camera');
  assert.deepEqual(streams.map((st) => st.track.readyState), ['ended', 'ended', 'ended', 'live']);
  assert.deepEqual(s.lost, []);
});

test('切后台 / 回小屋：清掉手势识别结果，回来不会按走之前那次比耶自动拍', async () => {
  const s = setup(async () => makeStream());
  const page = makePage(s.v);
  await s.v.startCamera();
  const g = s.v.gestureState;
  Object.assign(g, { type: 'peace', ttl: 0.42, holdDuration: 0.4, candidateType: 'peace', candidateFrames: 3 });
  Object.assign(s.v.palmTarget, { active: true, inCenterZone: true, ttl: 0.5 });
  page.hide();
  assert.deepEqual([g.type, g.ttl, g.holdDuration, g.candidateFrames], ['none', 0, 0, 0]);
  assert.deepEqual([s.v.palmTarget.active, s.v.palmTarget.ttl], [false, 0]);
  // 回来后头几帧也认不出比耶（update 里 ttl 不会再是正数）
  page.show();
  await flush();
  s.video.readyState = 0; // 只走计时那段，不碰画面
  s.v.update(1000, 0.05, 800, 450);
  assert.equal(g.type, 'none');

  Object.assign(g, { type: 'peace', ttl: 0.42, holdDuration: 0.4 });
  s.v.enableSimMode();
  assert.deepEqual([g.type, g.ttl], ['none', 0]);
});

test('在后台时别的标签页里改成了「先不用」：回来不申请、回小屋、不提示断开', async () => {
  const s = setup(async () => makeStream());
  const why = [];
  s.v.onCameraLost = (w) => why.push(w);
  let choice = 'on';
  s.v.allowCameraResume = () => choice !== 'off';
  const page = makePage(s.v);
  await s.v.startCamera();
  page.hide();
  choice = 'off';
  page.show('visibilitychange', 'pageshow');
  await flush();
  assert.equal(s.calls.length, 1);
  assert.equal(s.v.mode, 'sim');
  assert.equal(s.v.cameraSuspended, false);
  assert.deepEqual(why, ['off']);
  // 之后再切来切去也不申请
  page.hide();
  page.show();
  await flush();
  assert.equal(s.calls.length, 1);

  // 记住的还是「开启」（或读不到）：照常重开
  const t = setup(async () => makeStream());
  t.v.allowCameraResume = () => true;
  const p2 = makePage(t.v);
  await t.v.startCamera();
  p2.hide();
  p2.show();
  await flush();
  assert.equal(t.calls.length, 2);
  assert.equal(t.v.isCameraLive(), true);
});

// ---------- 版本号：线上旧 game.js 拿到新 vision.js 也要能跑（见 docs/PERF.md「版本号」） ----------
// 服务器不看 ?v=，缓存过期时旧 game.js 会按旧地址拿到新 vision.js：vision.js 只增不删
test('vision.js 只增不删：线上 game.js?v=hd57 用到的成员都还在；现在各文件用到的也都有', async () => {
  const s = setup(async () => makeStream());
  const has = (n) => n in s.v || typeof ARVisionEngine.prototype[n] === 'function';
  // 2026-11-27 从 git HEAD 的 game.js（线上 hd57）里取的 vision.xxx
  const deployed = ['activeGameMode', 'buildSimulatedDesk', 'drawAlignedVideoTo', 'edgePlatforms', 'enableSimMode', 'gestureState', 'getAllWalkablePlatforms', 'getWindowAmbience', 'isDarkRoom', 'mode', 'palmTarget', 'pinTargetAt', 'pinnedTarget', 'renderBackgroundAndNeon', 'rotationMode', 'semanticObjects', 'setRoomTheme', 'setWindowAmbience', 'simBgImg', 'simCamX', 'simTargetCamX', 'startCamera', 'triggerRescan', 'update'];
  assert.deepEqual(deployed.filter((n) => !has(n)), []);
  const { readdirSync, readFileSync } = await import('node:fs');
  const pub = new URL('../public/', import.meta.url);
  const src = readdirSync(pub).filter((f) => f.endsWith('.js') && f !== 'vision.js').map((f) => readFileSync(new URL(f, pub), 'utf8')).join('\n');
  const used = [...new Set([...src.matchAll(/\bvision\.(\w+)\b(?!\?v=)/g)].map((m) => m[1]))].filter((n) => n !== 'js');
  assert.ok(used.length >= 28);
  assert.deepEqual(used.filter((n) => !has(n)), []);
});
