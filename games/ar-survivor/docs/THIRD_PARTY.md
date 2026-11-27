# 运行时外部地址与自托管方案（AR-COM3）

代码里的外部地址只有下面 4 个，全部在 `public/vision.js`（文件头的 `MP_MODULE_URL` / `MP_WASM_URL` 和 `loadMediaPipeOnce()` 里的两个模型地址）。2026-11-26 起只有玩家开启摄像头成功后才会请求；选「先不用」时页面不联系任何外部地址。`tests/static_check.mjs` 会检查新增的外部地址有没有登记到这里。

下载失败的重试（2026-11-27）：浏览器会把下载失败的模块按地址记住，同一页里再 `import()` 同一地址直接失败，以前断网恢复后要刷新整页才有手势。现在失败后隔 1.5 / 4 / 10 秒各重试一次，第 n 次用 `+esm?retry=n`；三次用完、或等的时候关了摄像头 / 切了后台就停，下次开摄像头再来一轮（序号接着加，不重复）。模块下成功后留着，不再下；MediaPipe 插的 wasm 加载脚本 `<script>` 标签重试前拿掉。失败期间用肤色识别顶着，不提示。jsDelivr 不看查询串：2026-11-27 用 `curl -I`（只看响应头）核对，`+esm`、`+esm?retry=1`、`+esm?retry=2` 回同一个 ETag `W/"873c-df99fe30c3761590"`、同一份边缘缓存（`Age` 相同、`x-cache: HIT`），`x-jsd-version` 都是 0.10.14；版本锁在路径里，不会拉到别的版本。单测 `tests/mediapipe_retry.test.mjs`。

| 地址 | 用途 | 版本 |
|---|---|---|
| `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm` | MediaPipe 视觉任务脚本 | 0.10.14 |
| `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm` | 同一包的 wasm 目录（运行时按浏览器能力取其中一组文件） | 0.10.14 |
| `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task` | 手部关键点模型 | float16 / 1 |
| `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/latest/efficientdet_lite0.tflite` | 物品识别模型 | int8 / `latest`（没锁版本） |

下载时 jsDelivr、Google 会看到访问者的 IP 和浏览器信息；摄像头画面不会发出去（`public/*.js` 里没有 `fetch` / `XMLHttpRequest` / `WebSocket` / `sendBeacon`）。第三方组件内部有没有自己的统计上报：未知，没有核对过源码。

另外：`public/audio.js` 用浏览器自带 `speechSynthesis` 朗读台词，部分浏览器的在线音色会联网合成（由浏览器决定，代码里没有地址）。网页由 Cloudflare Workers 静态资源托管（`wrangler.toml`）。

许可证：未在本仓库核对，自托管前从包里的 `LICENSE` 和模型页面取原文放进仓库。

## 自托管要下载的文件（这次没做）

放到 `public/vendor/mediapipe-0.10.14/`：

1. npm 包 `@mediapipe/tasks-vision` **0.10.14**（不要换版本）里的
   - `vision_bundle.mjs`
   - `wasm/vision_wasm_internal.js`、`wasm/vision_wasm_internal.wasm`
   - `wasm/vision_wasm_nosimd_internal.js`、`wasm/vision_wasm_nosimd_internal.wasm`
   - `LICENSE`（如包内有）
2. 模型
   - `hand_landmarker.task`（float16 / 1）
   - `efficientdet_lite0.tflite`（int8，把 `latest` 换成 `1`，锁定版本后再下载）

文件名以 0.10.14 包内实际为准，下载后记下 SHA-256。Cloudflare 静态资源单文件上限 25 MiB，下载后核对体积。`.task`、`.tflite`、`.mjs`、`.wasm` 的响应类型部署后核对一次（`.mjs` 必须是 JavaScript 类型，`.wasm` 必须是 `application/wasm`）。

## 代码要改的行（`public/vision.js`）

| 行 | 现在 | 改成 |
|---|---|---|
| 21 `MP_MODULE_URL` | `'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm'` | `'./vendor/mediapipe-0.10.14/vision_bundle.mjs'`（重试的 `?retry=n` 照旧加在后面：Cloudflare 静态资源也不看查询串，见 `docs/PERF.md`「版本号」） |
| 22 `MP_WASM_URL` | `'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'` | `'./vendor/mediapipe-0.10.14/wasm'`（拿掉旧 `<script>` 标签也按它认，一起改就行） |
| 346、360 | `hand_landmarker.task` 的 Google 地址 | `'./vendor/mediapipe-0.10.14/hand_landmarker.task'` |
| 375 | `efficientdet_lite0.tflite` 的 Google 地址 | `'./vendor/mediapipe-0.10.14/efficientdet_lite0.tflite'` |

改完：只升 `vision.js` 自己的 `?v=`（`game.js` 第 3 行的 import、`index.html` 的 `modulepreload`；`vision.js` 是只被 `game.js` 引用的叶子文件，见 `docs/PERF.md`「版本号」第 2 条，`game.js` 那一行的改动登记进 `tests/split_manifest.json` 的 `edits`），并更新 `public/privacy.html` 里「会连到哪里」那一段和本文件。
