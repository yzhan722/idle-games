// legal_facts.test.mjs — 隐私说明 / 用户协议草案与代码对得上（纯文本，不开浏览器）：node --test games/ar-survivor/tests/legal_facts.test.mjs
// 改了代码里的上限、存储键、外部地址，或者改了草案里对应的话，另一边没跟着改就会失败
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const read = (f) => fs.readFileSync(path.join(PUB, f), 'utf8').replace(/\r\n/g, '\n');
const js = Object.fromEntries(fs.readdirSync(PUB).filter((f) => f.endsWith('.js')).map((f) => [f, read(f)]));
const all = Object.values(js).join('\n');
const plain = (html) => html.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '').replace(/[ \t]+/g, ' ');
const privacy = plain(read('privacy.html'));
const terms = plain(read('terms.html'));
const num = (src, name) => Number(new RegExp(`const ${name} = ([0-9]+);`).exec(src)?.[1]);

test('草案开关与待填：还有待填项时必须是草案，四项主体信息都在', () => {
  for (const f of ['privacy.html', 'terms.html']) {
    const html = read(f);
    assert.ok(html.includes('data-status="draft"') || !html.includes('待填'), `${f} 还有待填项，不能关草案开关`);
    assert.match(html, /\[data-status="draft"\] \.draft \{ display: block; \}/);
  }
  for (const word of ['运营主体', '联系邮箱', '生效日期', '未成年人', '日志留多久']) assert.ok(privacy.includes(word), word);
  for (const word of ['运营主体', '联系邮箱', '适用地区与争议处理']) assert.ok(terms.includes(word), word);
});

test('上限张数：相册、拼图小图与代码常量一致', () => {
  assert.ok(privacy.includes(`最多 ${num(js['game.js'], 'POLAROID_ALBUM_MAX')} 张；满了会去掉没置顶的旧照片`));
  assert.ok(privacy.includes(`另存一张小图，最多 ${num(js['data-room.js'], 'MEMORY_WALL_MAX')} 张`));
  // 在相册里删照片的函数不碰拼图墙；哪天改成一起删，这句话要跟着改
  const del = /function deletePolaroidEntry[\s\S]*?\n\}/.exec(js['game.js'])[0];
  assert.equal(/wall|memoryPuzzle/i.test(del), false);
  assert.ok(privacy.includes('小图不会跟着删'));
});

test('本机存储：只有 localStorage，键都说到了；不用 Cookie、sessionStorage、IndexedDB、缓存接口', () => {
  const said = {
    ar_deepseek_pet_v2: '游戏进度',
    ar_deepseek_pet_core_v1: '游戏进度',
    ar_deepseek_polaroid_album_v1: '相册',
    ar_deepseek_muted: '声音开关',
    ar_deepseek_bgm_track: '曲目',
    ar_deepseek_camera_choice_v1: '摄像头选择',
    ar_deepseek_peace_snap_v1: '比耶自动拍选择',
  };
  const keys = new Set([...all.matchAll(/['"`](ar_deepseek_\w+)['"`]/g)].map((m) => m[1]));
  assert.deepEqual([...keys].sort(), Object.keys(said).sort(), '新的本机存储要写进隐私说明');
  for (const word of Object.values(said)) assert.ok(privacy.includes(word), word);
  assert.equal(/document\.cookie|sessionStorage\.|indexedDB\.|\bcaches\.open/.test(all), false);
  assert.ok(privacy.includes('不用 Cookie'));
  assert.ok(privacy.includes('专注事项名称') && /id="pomodoro-task-input"/.test(read('index.html')));
});

test('不往外发：没有请求接口；外部地址只有说明里写的两处，而且开了摄像头才下载', () => {
  assert.equal(/\bfetch\(|XMLHttpRequest|sendBeacon|new WebSocket|EventSource|RTCPeerConnection/.test(all), false);
  const hosts = new Set([...all.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1]));
  for (const f of ['index.html', 'style.css']) for (const m of read(f).matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) hosts.add(m[1]);
  assert.deepEqual([...hosts].filter((h) => h !== 'www.w3.org').sort(), ['cdn.jsdelivr.net', 'storage.googleapis.com']);
  for (const h of ['cdn.jsdelivr.net', 'storage.googleapis.com', 'Cloudflare']) assert.ok(privacy.includes(h), h);
  const calls = [...all.matchAll(/this\.initMediaPipe\(\)/g)];
  const start = /async startCamera\([\s\S]*?\n {2}\}\n/.exec(js['vision.js'])[0];
  assert.equal(calls.length, 1);
  assert.ok(start.includes('this.initMediaPipe()'));
});

test('摄像头：不要麦克风、不录像；记住选择；物品识别只在摘星和打工', () => {
  assert.equal(/MediaRecorder|captureStream/.test(all), false);
  const gum = [...all.matchAll(/getUserMedia\(([\s\S]*?)\);/g)].map((m) => m[1]);
  assert.ok(gum.length >= 1 && gum.every((c) => /audio: false/.test(c)));
  assert.ok(js['game.js'].includes('const choice = readCameraChoice();'));
  assert.ok(privacy.includes('选择会记住，下次打开按上次的来'));
  assert.ok(/activeGameMode !== 'pet' && this\.detector/.test(js['vision.js']));
});

// 函数体（到行首两格的「}」为止）
const method = (src, head) => {
  const i = src.indexOf(head);
  assert.ok(i >= 0, head);
  return src.slice(i, src.indexOf('\n  }\n', i) + 4);
};

test('切后台停摄像头：visibilitychange / pagehide 里 track.stop()，回来按原来的选择重开，开不成不反复申请', () => {
  const v = js['vision.js'];
  // game.js 只有这一处接页面生命周期，没有别的 visibilitychange 去开摄像头
  assert.ok(js['game.js'].includes('vision.bindPageLifecycle(document, window, () => [W, H]);'));
  assert.equal(/addEventListener\('visibilitychange'/.test(js['game.js']), false);
  const bind = method(v, '  bindPageLifecycle(doc');
  assert.match(bind, /doc\.addEventListener\('visibilitychange', sync\)/);
  assert.match(bind, /win\.addEventListener\('pagehide', [\s\S]*?this\.suspendCamera\(/);
  assert.match(bind, /win\.addEventListener\('pageshow', sync\)/);
  assert.match(bind, /if \(this\.pageHidden\(\)\) this\.suspendCamera\(w, h\);\s*else this\.resumeCamera\(w, h\);/);
  assert.match(method(v, '  suspendCamera(W'), /this\.parkCamera\(/);
  assert.match(method(v, '  parkCamera(W'), /getTracks\(\)\.forEach\(\(t\) => t\.stop\(\)\)/);
  assert.match(method(v, '  pageHidden() {'), /visibilityState === 'hidden'/);
  // 只有切后台时停掉的（cameraSuspended）才会自己重开；「先不用」/ 开不成都会清掉它
  assert.match(method(v, '  enableSimMode(W'), /this\.cameraSuspended = false;/);
  assert.ok(privacy.includes('切到后台、锁屏或切到别的标签页时会停掉摄像头'));
  assert.ok(privacy.includes('不会反复申请'));
  // 指示：相机键角标跟着 isCameraLive()
  assert.ok(/id="cam-live-badge"/.test(read('index.html')));
  assert.match(js['game.js'], /const live = vision\.isCameraLive\(\);[\s\S]*?getElementById\('cam-live-badge'\)\?\.classList\.toggle\('hidden', !live\)/);
  assert.ok(privacy.includes('右上角相机键上挂着「开」字'));
});

test('比耶自动拍：第一次先问、选择记住、手账可改；每次拍都有闪光和快门声', () => {
  const g = js['game.js'];
  assert.match(g, /if \(peaceSnapAction\(peaceSnapChoice\) === 'snap'\) triggerPolaroidSequence\(true\);\s*else showPeaceSnapNotice\(\);/);
  assert.equal((g.match(/triggerPolaroidSequence\(true\)/g) || []).length, 1, '比耶以外的自动拍要写进说明');
  assert.ok(/id="btn-peace-snap-toggle"/.test(read('index.html')) && /id="peace-snap-notice"/.test(read('index.html')));
  const shot = /function captureArPolaroid\(\) \{[\s\S]*?\n\}/.exec(g)[0];
  assert.match(shot, /shutterFlashEl\.classList\.add\('flash'\)/);
  assert.match(shot, /playSfx\('shutter'\)/);
  assert.ok(privacy.includes('第一次会先问你，选「以后自动拍」才自动拍'));
  assert.ok(privacy.includes('每次拍都会闪一下'));
  assert.ok(privacy.includes('镜头里拍到的人和东西都会拍进去'));
});

test('朗读：专注事项名称不会拿去朗读', () => {
  assert.ok(privacy.includes('发出去的是她的台词'));
  for (const src of Object.values(js)) {
    for (const m of src.matchAll(/setPlayerEmote\(([^;]*taskTag[^;]*)\);/g)) assert.match(m[1], /false\s*$/, m[1]);
  }
});
