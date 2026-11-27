// mediapipe_retry.test.mjs — 手势识别组件下载失败后换地址重试（不开浏览器、不联网）：node --test games/ar-survivor/tests/mediapipe_retry.test.mjs
// import() 用假的：像浏览器一样，同一地址下载失败过，同一页里再 import 直接失败（模块表按地址记住）
import test from 'node:test';
import assert from 'node:assert/strict';
import { ARVisionEngine, MP_RETRY_DELAYS, mediaPipeModuleUrl, removeStaleMediaPipeScripts } from '../public/vision.js';

const BARE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm';
const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';

// 假页面：document.createElement 给画布；scripts 是页面里的 <script> 标签
function makeDoc() {
  const doc = {
    hidden: false,
    visibilityState: 'visible',
    scripts: [],
    createElement: () => ({ getContext: () => ({}) }),
    addScript(src) {
      const el = { getAttribute: (k) => (k === 'src' ? src : null), remove: () => doc.scripts.splice(doc.scripts.indexOf(el), 1) };
      doc.scripts.push(el);
    },
    querySelectorAll: (sel) => (sel === 'script[src]' ? [...doc.scripts] : []),
    srcs: () => doc.scripts.map((s) => s.getAttribute('src'))
  };
  return doc;
}

function makeStream() {
  const track = { readyState: 'live', addEventListener() {}, stop() { this.readyState = 'ended'; } };
  return { getTracks: () => [track], getVideoTracks: () => [track] };
}

// net.online：现在有没有网；net.model：模型能不能下（模块下来了、模型没下来的情况）
function setup() {
  const doc = makeDoc();
  globalThis.document = doc;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getUserMedia: async () => makeStream() } }
  });
  const net = { online: false, model: true };
  const made = { hand: 0, det: 0 };
  // 假 MediaPipe：建识别器时像真的一样往页面里插 wasm 加载脚本的 <script> 标签
  const mod = {
    FilesetResolver: { forVisionTasks: async (base) => ({ base }) },
    HandLandmarker: {
      createFromOptions: async () => {
        doc.addScript(`${WASM}/vision_wasm_internal.js`);
        if (!net.online || !net.model) throw new Error('hand model');
        made.hand += 1;
        return { kind: 'hand' };
      }
    },
    ObjectDetector: {
      createFromOptions: async () => {
        doc.addScript(`${WASM}/vision_wasm_internal.js`);
        if (!net.online || !net.model) throw new Error('detector model');
        made.det += 1;
        return { kind: 'det' };
      }
    }
  };
  const moduleMap = new Map();
  const urls = [];
  const browserImport = (url) => {
    urls.push(url);
    if (!moduleMap.has(url)) {
      moduleMap.set(url, net.online ? Promise.resolve(mod) : Promise.reject(new TypeError('Failed to fetch dynamically imported module')));
    }
    return moduleMap.get(url);
  };
  const video = { srcObject: null, style: {}, paused: false, readyState: 4, async play() {} };
  const v = new ARVisionEngine(video);
  v.pageDoc = doc;
  v.importVisionModule = browserImport;
  const waits = [];
  v.onWait = null;
  v.waitMs = async (ms) => {
    waits.push(ms);
    if (v.onWait) v.onWait(waits.length);
  };
  // startCamera 不等下载：把这一轮的 Promise 接出来等
  const rounds = [];
  v.initMediaPipe = function () {
    const p = ARVisionEngine.prototype.initMediaPipe.call(this);
    rounds.push(p);
    return p;
  };
  return { v, doc, net, made, urls, waits, rounds, browserImport };
}

test('地址：第一次不带尾巴，之后 ?retry=n；版本始终锁在路径里', () => {
  assert.equal(mediaPipeModuleUrl(0), BARE);
  assert.equal(mediaPipeModuleUrl(), BARE);
  assert.equal(mediaPipeModuleUrl(1), `${BARE}?retry=1`);
  assert.equal(mediaPipeModuleUrl(3), `${BARE}?retry=3`);
  for (let n = 0; n < 8; n++) assert.ok(mediaPipeModuleUrl(n).includes('/@mediapipe/tasks-vision@0.10.14/+esm'));
  assert.deepEqual(MP_RETRY_DELAYS, [1500, 4000, 10000]);
});

test('断网时开摄像头、隔一会儿恢复：换地址重试一次就成，不用刷新页面；成功后不再下', async () => {
  const s = setup();
  s.v.onWait = () => (s.net.online = true); // 等的时候网恢复了
  assert.equal(await s.v.startCamera(), true);
  await s.rounds[0];
  assert.deepEqual(s.urls, [BARE, `${BARE}?retry=1`]);
  assert.deepEqual(s.waits, [1500]);
  assert.deepEqual(s.v.handLandmarker, { kind: 'hand' });
  assert.deepEqual(s.v.detector, { kind: 'det' });
  assert.equal(s.v.mediaPipeRequested, true);
  // 对照：同一页里再 import 原地址，就算有网了也直接失败（这就是要换地址的原因）
  await assert.rejects(s.browserImport(BARE));

  // 关了再开、切后台再回来：都不再下载
  s.urls.length = 0;
  s.v.enableSimMode();
  await s.v.startCamera();
  assert.equal(s.rounds.length, 1);
  assert.deepEqual(s.urls, []);
  assert.equal(s.made.hand, 1);
});

test('一直断网：重试 3 次、退避 1.5 / 4 / 10 秒、地址各不相同；用完后肤色识别兜底、不提示；下次开摄像头接着换号', async () => {
  const s = setup();
  const lost = [];
  s.v.onCameraLost = (why) => lost.push(why || 'lost');
  await s.v.startCamera();
  await s.rounds[0];
  assert.deepEqual(s.urls, [BARE, `${BARE}?retry=1`, `${BARE}?retry=2`, `${BARE}?retry=3`]);
  assert.deepEqual(s.waits, [1500, 4000, 10000]);
  assert.equal(s.v.handLandmarker, null);
  assert.equal(s.v.mediaPipeRequested, false);
  assert.equal(s.v.mode, 'camera'); // 摄像头照开，不回小屋
  assert.deepEqual(lost, []); // 不弹提示

  // 失败期间这一帧走肤色识别
  let skin = 0;
  s.v.drawAlignedVideoTo = () => true;
  s.v.cvCtx = { getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) };
  s.v.detectPalmBySkinAndContour = () => (skin += 1);
  s.v.update(1000, 0.016, 800, 450);
  assert.equal(skin, 1);

  // 网恢复后再开摄像头：新一轮，从没用过的 ?retry=4 起，一次就成
  s.net.online = true;
  s.v.enableSimMode();
  s.urls.length = 0;
  await s.v.startCamera();
  await s.rounds[1];
  assert.deepEqual(s.urls, [`${BARE}?retry=4`]);
  assert.ok(s.v.handLandmarker);
  assert.equal(s.v.mediaPipeRequested, true);
});

test('等重试时关了摄像头（或切了后台）：不再连外部地址，下次开摄像头再来', async () => {
  const s = setup();
  s.v.onWait = () => s.v.enableSimMode();
  await s.v.startCamera();
  await s.rounds[0];
  assert.deepEqual(s.urls, [BARE]);
  assert.equal(s.v.mediaPipeRequested, false);

  const t = setup();
  t.v.onWait = () => t.v.suspendCamera();
  await t.v.startCamera();
  await t.rounds[0];
  assert.deepEqual(t.urls, [BARE]);
  assert.equal(t.v.mediaPipeRequested, false);
});

test('模块下来了、模型没下来：模块只下一次，重试只重建识别器；失败留下的 <script> 标签重试前拿掉', async () => {
  const s = setup();
  s.net.online = true;
  s.net.model = false;
  s.doc.addScript('./game.js?v=hd60'); // 页面自己的脚本不能动
  s.v.onWait = (n) => {
    // 每次重试前页面里都是上一次失败留下的标签
    assert.ok(s.doc.srcs().filter((u) => u.startsWith(WASM)).length > 0);
    if (n === 2) s.net.model = true;
  };
  await s.v.startCamera();
  await s.rounds[0];
  assert.deepEqual(s.urls, [BARE]); // 模块只 import 一次
  assert.deepEqual(s.waits, [1500, 4000]);
  assert.ok(s.v.handLandmarker);
  // 只剩页面自己的脚本 + 成功那次插的两个（手、物品）
  assert.deepEqual(s.doc.srcs(), ['./game.js?v=hd60', `${WASM}/vision_wasm_internal.js`, `${WASM}/vision_wasm_internal.js`]);
});

test('拿掉旧标签：只认识别组件 wasm 目录下的，没有 document 也不报错', () => {
  const doc = makeDoc();
  doc.addScript(`${WASM}/vision_wasm_internal.js`);
  doc.addScript('./lazy-img.js?v=hd60');
  doc.addScript(`${WASM}/vision_wasm_nosimd_internal.js`);
  assert.equal(removeStaleMediaPipeScripts(doc), 2);
  assert.deepEqual(doc.srcs(), ['./lazy-img.js?v=hd60']);
  assert.equal(removeStaleMediaPipeScripts(null), 0);
  assert.equal(removeStaleMediaPipeScripts({}), 0);
});
