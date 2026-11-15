// vision.js — 高帧率分时调度实景手掌与进阶手势识别引擎（60/120FPS 丝滑运动预测 + 纯净无辅助线版）：
// 1. 严格对齐 <video object-fit:cover> 裁剪与横屏旋转矩阵
// 2. 21 关键点语义手势识别：张开手掌(open_palm) / 食指逗宠(point_finger) / 比耶比心合影(peace) / 握拳猜拳(fist)
// 3. 帧间分时调度（Time-Sliced Vision）+ 60/120FPS 弹簧运动学插值

export class ARVisionEngine {
  constructor(videoEl) {
    this.video = videoEl;
    this.mode = 'sim';
    this.facingMode = 'environment';
    this.rotationMode = 'none';
    this.activeGameMode = 'pet';

    this.cvWidth = 160;
    this.cvHeight = 90;
    this.cvCanvas = document.createElement('canvas');
    this.cvCanvas.width = this.cvWidth;
    this.cvCanvas.height = this.cvHeight;
    this.cvCtx = this.cvCanvas.getContext('2d', { willReadFrequently: true });

    this.detWidth = 256;
    this.detHeight = 144;
    this.detCanvas = document.createElement('canvas');
    this.detCanvas.width = this.detWidth;
    this.detCanvas.height = this.detHeight;
    this.detCtx = this.detCanvas.getContext('2d');

    this.prevLuma = null;
    this.currLuma = new Uint8Array(this.cvWidth * this.cvHeight);
    this.skinMask = new Uint8Array(this.cvWidth * this.cvHeight);

    this.edgePlatforms = [];
    this.semanticObjects = [];
    this.pinnedTarget = null;

    // 实时手掌追踪状态（供主角第一时间跳上手掌互动）
    this.palmTarget = {
      active: false,
      inCenterZone: false,
      rawX: 400,
      rawY: 240,
      rawSurfaceY: 235,
      x: 400,
      y: 240,
      surfaceY: 235,
      w: 110,
      h: 90,
      vx: 0,
      vy: 0,
      tilt: 0,
      isTickling: false,
      confidence: 0,
      ttl: 0,
      holdTime: 0,
      source: 'none'
    };

    // 进阶手势语义状态：'none' | 'open_palm' | 'point_finger' | 'peace' | 'fist'
    this.gestureState = {
      type: 'none',
      rpsMove: 'none', // 'rock' | 'scissors' | 'paper' | 'none'
      rawFingerX: 400,
      rawFingerY: 240,
      fingerX: 400,
      fingerY: 240,
      holdDuration: 0,
      candidateType: 'none',
      candidateFrames: 0,
      ttl: 0
    };

    this.lastMpPalmTime = 0;
    this.prevFingerSpread = 0;

    // 实景环境光照度传感（0~255 平滑亮度 + 暗光夜灯自动感应滞回防抖）
    this.ambientBrightness = 135;
    this.isDarkRoom = false;

    this.handLandmarker = null;
    this.detector = null;
    this.lastHandDetectTime = 0;
    this.lastDetectTime = 0;
    this.lastCvTime = 0;
    this.frameCounter = 0;

    this.simCamX = 0;
    this.simTargetCamX = 0;
    this.roomTheme = 'cream_study';
    this.simBgImgs = {};
    this.simBgImg = null;

    // AR-4 四季窗景昼夜流转（早 / 午 / 黄昏 / 星空 + 春 / 夏 / 秋 / 冬）
    this.windowAmbience = {
      period: 'morning',
      season: 'spring',
      autoSync: true
    };
    this.prevWindowPeriod = null;
    this.windowTransition = 1;
    this.lastAmbienceRenderAt = 0;
    this.winImgs = {};
    this.seasonImgs = {};
    this.sparkleImg = null;
    this.seasonMotes = Array.from({ length: 7 }, (_, idx) => ({
      seedU: ((idx * 0.17 + 0.11) % 0.82) + 0.09,
      seedV: (idx * 0.19 + 0.07) % 1,
      speed: 0.07 + (idx % 3) * 0.025,
      swayAmp: 7 + (idx % 4) * 3.5,
      phase: idx * 1.35,
      scale: 0.76 + (idx % 3) * 0.14
    }));

    this.initMediaPipe();
  }

  setRoomTheme(themeKey = 'cream_study') {
    const validKey = themeKey === 'star_aquarium' ? 'star_aquarium' : 'cream_study';
    this.roomTheme = validKey;
    const srcMap = {
      cream_study: './assets/bg_healing_room.webp?v=hd19',
      star_aquarium: './assets/bg_aquarium_room.webp?v=hd19'
    };
    if (!this.simBgImgs[validKey]) {
      const img = new Image();
      img.src = srcMap[validKey];
      this.simBgImgs[validKey] = img;
    }
    this.simBgImg = this.simBgImgs[validKey];
    return this.roomTheme;
  }

  getRoomTheme() {
    return this.roomTheme;
  }

  ensureWindowAssets(periodKey, seasonKey) {
    const winSrcMap = {
      morning: './assets/win_morning.webp?v=hd19',
      noon: './assets/win_noon.webp?v=hd19',
      dusk: './assets/win_dusk.webp?v=hd19',
      starry: './assets/win_starry.webp?v=hd19'
    };
    const seasonSrcMap = {
      spring: './assets/vfx_season_spring.webp?v=hd19',
      summer: './assets/vfx_season_summer.webp?v=hd19',
      autumn: './assets/vfx_season_autumn.webp?v=hd19',
      winter: './assets/vfx_season_winter.webp?v=hd19'
    };
    if (winSrcMap[periodKey] && !this.winImgs[periodKey]) {
      const img = new Image();
      img.src = winSrcMap[periodKey];
      this.winImgs[periodKey] = img;
    }
    if (seasonSrcMap[seasonKey] && !this.seasonImgs[seasonKey]) {
      const sImg = new Image();
      sImg.src = seasonSrcMap[seasonKey];
      this.seasonImgs[seasonKey] = sImg;
    }
    if (!this.sparkleImg) {
      const sp = new Image();
      sp.src = './assets/vfx_sparkle.webp?v=hd19';
      this.sparkleImg = sp;
    }
  }

  setWindowAmbience({ period = 'morning', season = 'spring', autoSync = true } = {}) {
    const validPeriods = ['morning', 'noon', 'dusk', 'starry'];
    const validSeasons = ['spring', 'summer', 'autumn', 'winter'];
    const nextPeriod = validPeriods.includes(period) ? period : 'morning';
    const nextSeason = validSeasons.includes(season) ? season : 'spring';
    this.ensureWindowAssets(nextPeriod, nextSeason);

    if (this.windowAmbience.period !== nextPeriod && this.winImgs[this.windowAmbience.period]) {
      this.prevWindowPeriod = this.windowAmbience.period;
      this.windowTransition = 0;
    }

    this.windowAmbience = {
      period: nextPeriod,
      season: nextSeason,
      autoSync: Boolean(autoSync)
    };

    if (this.mode !== 'camera') {
      this.isDarkRoom = nextPeriod === 'starry';
      this.ambientBrightness = nextPeriod === 'starry' ? 68 : nextPeriod === 'dusk' ? 116 : 162;
    }
    return { ...this.windowAmbience };
  }

  getWindowAmbience() {
    return { ...this.windowAmbience };
  }

  async initMediaPipe() {
    try {
      const visionModule = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm');
      const { HandLandmarker, ObjectDetector, FilesetResolver } = visionModule;
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      try {
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.32,
          minHandPresenceConfidence: 0.32,
          minTrackingConfidence: 0.32
        });
      } catch (handErr) {
        try {
          this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.32,
            minHandPresenceConfidence: 0.32,
            minTrackingConfidence: 0.32
          });
        } catch (e2) {}
      }

      try {
        this.detector = await ObjectDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/latest/efficientdet_lite0.tflite',
            delegate: 'GPU'
          },
          scoreThreshold: 0.3,
          maxResults: 3,
          runningMode: 'VIDEO'
        });
      } catch (objErr) {}
    } catch (err) {}
  }

  // 将当前实景摄像头画面严格按横屏视口裁剪绘制到任意目标画布（供视觉识别与 AR 拍立得合影复用！）
  drawAlignedVideoTo(targetCtx, tw, th) {
    const vidW = this.video.videoWidth;
    const vidH = this.video.videoHeight;
    if (!vidW || !vidH) return false;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const coverScale = Math.max(vw / vidW, vh / vidH);
    const cropW = vw / coverScale;
    const cropH = vh / coverScale;
    const cropX = (vidW - cropW) * 0.5;
    const cropY = (vidH - cropH) * 0.5;

    targetCtx.save();
    if (this.rotationMode === 'cw') {
      targetCtx.translate(tw * 0.5, th * 0.5);
      targetCtx.rotate(-Math.PI * 0.5);
      targetCtx.drawImage(this.video, cropX, cropY, cropW, cropH, -th * 0.5, -tw * 0.5, th, tw);
    } else if (this.rotationMode === 'ccw') {
      targetCtx.translate(tw * 0.5, th * 0.5);
      targetCtx.rotate(Math.PI * 0.5);
      targetCtx.drawImage(this.video, cropX, cropY, cropW, cropH, -th * 0.5, -tw * 0.5, th, tw);
    } else {
      targetCtx.drawImage(this.video, cropX, cropY, cropW, cropH, 0, 0, tw, th);
    }
    targetCtx.restore();
    return true;
  }

  async startCamera(facing = 'environment', W = 800, H = 450) {
    this.facingMode = facing;
    if (this.video.srcObject) {
      this.video.srcObject.getTracks().forEach((t) => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 60, min: 30 }
        },
        audio: false
      });
      this.video.srcObject = stream;
      this.video.style.display = 'block';
      await this.video.play();
      this.mode = 'camera';
      this.prevLuma = null;
      this.semanticObjects = [];
      this.edgePlatforms = [];
      return true;
    } catch (err) {
      this.enableSimMode(W, H);
      return false;
    }
  }

  enableSimMode(W = 800, H = 450) {
    if (this.video.srcObject) {
      this.video.srcObject.getTracks().forEach((t) => t.stop());
      this.video.srcObject = null;
    }
    this.video.style.display = 'none';
    this.mode = 'sim';
    this.buildSimulatedDesk(W, H);
  }

  buildSimulatedDesk(W, H) {
    this.semanticObjects = [];
    this.edgePlatforms = [];
  }

  triggerRescan(W, H) {
    this.edgePlatforms = [];
    this.pinnedTarget = null;
    if (this.mode === 'camera' && this.video.readyState >= 2) {
      const now = performance.now();
      if (this.handLandmarker) {
        this.runHandDetection(now, 0.04, W, H);
      } else {
        this.detectPalmBySkinAndContour(now, 0.04, W, H);
      }
    }
  }

  pinTargetAt(x, y, W, H) {
    const clampedX = Math.max(W * 0.12, Math.min(W * 0.88, x));
    const clampedY = Math.max(H * 0.16, Math.min(H * 0.68, y));
    const bw = 96;
    this.pinnedTarget = {
      id: 'pinned-target',
      role: 'drink',
      color: '#ffd700',
      x: clampedX - bw * 0.5,
      y: clampedY,
      w: bw,
      h: 72,
      ttl: 12
    };
  }

  // 旋转不变的 21 关键点手势语义分类器
  classifyHandGesture(lm, W, H) {
    const dist = (a, b) => Math.hypot(lm[a].x - lm[b].x, lm[a].y - lm[b].y);

    const palmScale = Math.max(0.04, dist(0, 9));
    const indexExt = dist(0, 8) > dist(0, 6) * 1.16 && dist(0, 8) > palmScale * 1.25;
    const middleExt = dist(0, 12) > dist(0, 10) * 1.16 && dist(0, 12) > palmScale * 1.25;
    const ringExt = dist(0, 16) > dist(0, 14) * 1.13 && dist(0, 16) > palmScale * 1.15;
    const pinkyExt = dist(0, 20) > dist(0, 18) * 1.13 && dist(0, 20) > palmScale * 1.05;

    const extCount = (indexExt ? 1 : 0) + (middleExt ? 1 : 0) + (ringExt ? 1 : 0) + (pinkyExt ? 1 : 0);

    // 比心手势判定：拇指尖(4)与食指尖(8)捏合靠近，其余三指收起
    const thumbIndexPinch = dist(4, 8) < palmScale * 0.42;

    let rawType = 'open_palm';
    let rpsMove = 'paper';

    if (extCount >= 3) {
      rawType = 'open_palm';
      rpsMove = 'paper';
    } else if (indexExt && middleExt && !ringExt && !pinkyExt) {
      rawType = 'peace';
      rpsMove = 'scissors';
    } else if (indexExt && !middleExt && !ringExt && !pinkyExt) {
      if (thumbIndexPinch) {
        rawType = 'peace'; // 单手比心同样触发合影互动！
        rpsMove = 'rock';
      } else {
        rawType = 'point_finger';
        rpsMove = 'scissors';
      }
    } else if (extCount === 0) {
      rawType = 'fist';
      rpsMove = 'rock';
    }

    const g = this.gestureState;
    g.rpsMove = rpsMove;
    const fx = lm[8].x * W;
    const fy = lm[8].y * H;
    if (g.ttl <= 0) {
      g.fingerX = fx;
      g.fingerY = fy;
    }
    g.rawFingerX = fx;
    g.rawFingerY = fy;
    g.ttl = 0.42;

    // 连续 2 帧确认同一手势再切换，防止抬手过渡瞬间误触发
    if (rawType === g.candidateType) {
      g.candidateFrames++;
      if (g.candidateFrames >= 2 && g.type !== rawType) {
        g.type = rawType;
        g.holdDuration = 0;
      }
    } else {
      g.candidateType = rawType;
      g.candidateFrames = 1;
    }

    return rawType;
  }

  updatePalmTargetState(rawPalm, dt, W, H, source) {
    const p = this.palmTarget;
    if (!p.active) {
      p.rawX = rawPalm.x;
      p.rawY = rawPalm.y;
      p.rawSurfaceY = rawPalm.surfaceY;
      p.x = rawPalm.x;
      p.y = rawPalm.y;
      p.surfaceY = rawPalm.surfaceY;
      p.vx = 0;
      p.vy = 0;
    } else {
      const safeDt = Math.max(0.016, dt);
      const instVx = (rawPalm.x - p.rawX) / safeDt;
      const instVy = (rawPalm.y - p.rawY) / safeDt;
      p.vx = p.vx * 0.55 + instVx * 0.45;
      p.vy = p.vy * 0.55 + instVy * 0.45;
      p.rawX = rawPalm.x;
      p.rawY = rawPalm.y;
      p.rawSurfaceY = rawPalm.surfaceY;
    }

    p.w = p.w * 0.6 + rawPalm.w * 0.4;
    p.h = p.h * 0.6 + rawPalm.h * 0.4;
    p.tilt = p.tilt * 0.7 + (rawPalm.tilt || 0) * 0.3;
    p.isTickling = Boolean(rawPalm.isTickling);
    p.confidence = rawPalm.confidence || 0.85;
    p.source = source;
    p.active = true;
    p.ttl = source === 'mediapipe' ? 0.56 : 0.46;

    const distFromCenterX = Math.abs(p.rawX - W * 0.5);
    const inVerticalRange = p.rawY >= H * 0.12 && p.rawY <= H * 0.88;
    p.inCenterZone = distFromCenterX < W * 0.43 && inVerticalRange;
  }

  runHandDetection(now, dt, W, H) {
    if (!this.handLandmarker) return false;
    try {
      this.drawAlignedVideoTo(this.detCtx, this.detWidth, this.detHeight);
      const res = this.handLandmarker.detectForVideo(this.detCanvas, now);
      if (!res || !res.landmarks || res.landmarks.length === 0) return false;

      const bestLm = res.landmarks[0];
      const gestureType = this.classifyHandGesture(bestLm, W, H);
      this.lastMpPalmTime = now;

      // 只有当手势为「张开手掌 (open_palm)」时才激活手掌站立平台；
      // 伸食指、比耶或握拳时释放手掌站立锁定，以便触发追指尖、拍立得合影与猜拳互动！
      if (gestureType !== 'open_palm') {
        this.palmTarget.active = false;
        this.palmTarget.inCenterZone = false;
        this.palmTarget.ttl = 0;
        return true;
      }

      const wrist = bestLm[0];
      const idxMcp = bestLm[5];
      const midMcp = bestLm[9];
      const ringMcp = bestLm[13];
      const pinkyMcp = bestLm[17];
      const thumbTip = bestLm[4];
      const idxTip = bestLm[8];
      const midTip = bestLm[12];

      const palmNormX =
        wrist.x * 0.18 + idxMcp.x * 0.22 + midMcp.x * 0.25 + ringMcp.x * 0.20 + pinkyMcp.x * 0.15;
      const palmNormY =
        wrist.y * 0.18 + idxMcp.y * 0.22 + midMcp.y * 0.25 + ringMcp.y * 0.20 + pinkyMcp.y * 0.15;

      let minX = 1;
      let maxX = 0;
      let minY = 1;
      let maxY = 0;
      for (const pt of bestLm) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }

      const palmX = palmNormX * W;
      const palmY = palmNormY * H;
      const handW = Math.max(75, Math.min(W * 0.55, (maxX - minX) * W));
      const handH = Math.max(60, Math.min(H * 0.65, (maxY - minY) * H));

      const mcpY = ((idxMcp.y + midMcp.y + ringMcp.y) / 3) * H;
      const surfaceY = Math.min(palmY, mcpY * 0.65 + palmY * 0.35);

      const fingerSpread =
        Math.hypot(thumbTip.x - idxTip.x, thumbTip.y - idxTip.y) +
        Math.hypot(idxTip.x - midTip.x, idxTip.y - midTip.y);
      const spreadDelta = Math.abs(fingerSpread - this.prevFingerSpread);
      this.prevFingerSpread = fingerSpread;
      const thumbToPalmDist = Math.hypot(thumbTip.x - palmNormX, thumbTip.y - palmNormY);
      const isTickling = spreadDelta > 0.045 || thumbToPalmDist < 0.085;
      const tilt = Math.atan2(pinkyMcp.y - idxMcp.y, pinkyMcp.x - idxMcp.x);

      this.updatePalmTargetState(
        {
          x: palmX,
          y: palmY,
          surfaceY: Math.max(H * 0.18, Math.min(H * 0.84, surfaceY)),
          w: handW,
          h: handH,
          tilt,
          isTickling,
          confidence: 0.96
        },
        dt,
        W,
        H,
        'mediapipe'
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  detectPalmBySkinAndContour(now, dt, W, H, imgData) {
    if (now - this.lastMpPalmTime < 220) return;

    const cw = this.cvWidth;
    const ch = this.cvHeight;
    let data = imgData;
    if (!data) {
      this.drawAlignedVideoTo(this.cvCtx, cw, ch);
      data = this.cvCtx.getImageData(0, 0, cw, ch).data;
    }

    let bgY = 0;
    let bgCb = 0;
    let bgCr = 0;
    let bgCount = 0;
    for (let x = 4; x < cw - 4; x += 4) {
      const idx = (2 * cw + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      bgY += 0.299 * r + 0.587 * g + 0.114 * b;
      bgCb += 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      bgCr += 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      bgCount++;
    }
    if (bgCount > 0) {
      bgY /= bgCount;
      bgCb /= bgCount;
      bgCr /= bgCount;
    }

    const xStart = Math.floor(cw * 0.14);
    const xEnd = Math.floor(cw * 0.86);
    const yStart = Math.floor(ch * 0.14);
    const yEnd = Math.floor(ch * 0.88);

    this.skinMask.fill(0);
    let skinCount = 0;

    for (let y = yStart; y < yEnd; y++) {
      const rowOffset = y * cw;
      for (let x = xStart; x < xEnd; x++) {
        const p = rowOffset + x;
        const i = p * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        if (r < 68 || g < 35 || b < 18 || r < g || r < b || maxC - minC < 14) continue;

        const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        if (cb >= 76 && cb <= 130 && cr >= 131 && cr <= 178 && yVal >= 45 && yVal <= 242) {
          const bgDiff = Math.abs(cr - bgCr) * 1.4 + Math.abs(cb - bgCb) * 1.2 + Math.abs(yVal - bgY) * 0.55;
          if (bgDiff > 15) {
            this.skinMask[p] = 1;
            skinCount++;
          }
        }
      }
    }

    const roiArea = (xEnd - xStart) * (yEnd - yStart);
    const skinRatio = skinCount / Math.max(1, roiArea);
    if (skinRatio < 0.028 || skinRatio > 0.46) return;

    let sumX = 0;
    let sumY = 0;
    let coreCount = 0;
    let minX = cw;
    let maxX = 0;
    let minY = ch;
    let maxY = 0;

    for (let y = yStart + 1; y < yEnd - 1; y++) {
      const row = y * cw;
      for (let x = xStart + 1; x < xEnd - 1; x++) {
        if (!this.skinMask[row + x]) continue;
        const neighbors =
          this.skinMask[row - cw + x - 1] +
          this.skinMask[row - cw + x] +
          this.skinMask[row - cw + x + 1] +
          this.skinMask[row + x - 1] +
          this.skinMask[row + x + 1] +
          this.skinMask[row + cw + x - 1] +
          this.skinMask[row + cw + x] +
          this.skinMask[row + cw + x + 1];

        if (neighbors >= 5) {
          const centerWeight = 1 + (1 - Math.abs(x - cw * 0.5) / (cw * 0.5)) * 0.5;
          sumX += x * centerWeight;
          sumY += y * centerWeight;
          coreCount += centerWeight;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (coreCount < 16) return;
    const spanW = maxX - minX;
    const spanH = maxY - minY;
    if (spanW < cw * 0.09 || spanW > cw * 0.65 || spanH < ch * 0.10) return;

    const cx = sumX / coreCount;
    const cy = sumY / coreCount;

    let topEdgeY = minY;
    const colStart = Math.max(xStart, Math.floor(cx - spanW * 0.25));
    const colEnd = Math.min(xEnd, Math.ceil(cx + spanW * 0.25));
    let topSum = 0;
    let topCols = 0;
    for (let x = colStart; x <= colEnd; x += 2) {
      for (let y = minY; y <= Math.min(yEnd - 1, Math.floor(cy)); y++) {
        if (this.skinMask[y * cw + x]) {
          topSum += y;
          topCols++;
          break;
        }
      }
    }
    if (topCols > 0) {
      topEdgeY = topSum / topCols;
    }

    const stageX = (cx / cw) * W;
    const stageY = (cy / ch) * H;
    const stageTopY = (topEdgeY / ch) * H;
    const surfaceY = stageTopY * 0.42 + stageY * 0.58;

    this.updatePalmTargetState(
      {
        x: stageX,
        y: stageY,
        surfaceY: Math.max(H * 0.18, Math.min(H * 0.84, surfaceY)),
        w: Math.max(80, Math.min(W * 0.52, (spanW / cw) * W)),
        h: Math.max(60, (spanH / ch) * H),
        tilt: 0,
        isTickling: false,
        confidence: 0.82
      },
      dt,
      W,
      H,
      'cv_palm'
    );
  }

  update(now, dt, W, H) {
    let flow = { dx: 0, dy: 0 };
    this.frameCounter++;

    // 1€ 自适应低通滤波：静止时高阻尼滤除摄像头噪点微抖，快速移手（如接白米饭）时零延迟紧跟！
    if (this.palmTarget.ttl > 0) {
      this.palmTarget.ttl -= dt;
      this.palmTarget.holdTime += dt;
      const palmDelta = Math.hypot(
        this.palmTarget.rawX - this.palmTarget.x,
        this.palmTarget.rawY - this.palmTarget.y
      );
      if (palmDelta > 0.9) {
        const adaptivePalmRate = Math.min(48, 12 + palmDelta * 0.58);
        const palmK = 1 - Math.exp(-dt * adaptivePalmRate);
        this.palmTarget.x += (this.palmTarget.rawX - this.palmTarget.x) * palmK;
        this.palmTarget.y += (this.palmTarget.rawY - this.palmTarget.y) * palmK;
        this.palmTarget.surfaceY += (this.palmTarget.rawSurfaceY - this.palmTarget.surfaceY) * palmK;
      }

      if (this.palmTarget.ttl <= 0) {
        this.palmTarget.active = false;
        this.palmTarget.inCenterZone = false;
        this.palmTarget.holdTime = 0;
        this.palmTarget.vx = 0;
        this.palmTarget.vy = 0;
      }
    }

    if (this.gestureState.ttl > 0) {
      this.gestureState.ttl -= dt;
      this.gestureState.holdDuration += dt;
      const fingerDelta = Math.hypot(
        this.gestureState.rawFingerX - this.gestureState.fingerX,
        this.gestureState.rawFingerY - this.gestureState.fingerY
      );
      if (fingerDelta > 0.8) {
        const adaptiveFingerRate = Math.min(52, 14 + fingerDelta * 0.65);
        const fingerK = 1 - Math.exp(-dt * adaptiveFingerRate);
        this.gestureState.fingerX += (this.gestureState.rawFingerX - this.gestureState.fingerX) * fingerK;
        this.gestureState.fingerY += (this.gestureState.rawFingerY - this.gestureState.fingerY) * fingerK;
      }
      if (this.gestureState.ttl <= 0) {
        this.gestureState.type = 'none';
        this.gestureState.rpsMove = 'none';
        this.gestureState.holdDuration = 0;
        this.gestureState.candidateType = 'none';
        this.gestureState.candidateFrames = 0;
      }
    }

    if (this.mode === 'sim') {
      const prevX = this.simCamX;
      this.simCamX += (this.simTargetCamX - this.simCamX) * Math.min(1, dt * 5);
      flow.dx = this.simCamX - prevX;
      this.buildSimulatedDesk(W, H);
      if (this.pinnedTarget) this.pinnedTarget.x += flow.dx;
      return flow;
    }

    if (this.video.readyState < 2) return flow;

    let didHeavyWorkThisFrame = false;

    if (this.handLandmarker && now - this.lastHandDetectTime >= 33) {
      const handDt = Math.min(0.1, (now - this.lastHandDetectTime) / 1000);
      this.lastHandDetectTime = now;
      this.runHandDetection(now, handDt, W, H);
      didHeavyWorkThisFrame = true;
    }

    if (!didHeavyWorkThisFrame && now - this.lastCvTime >= 48) {
      const cvDt = Math.min(0.1, (now - this.lastCvTime) / 1000);
      this.lastCvTime = now;
      this.drawAlignedVideoTo(this.cvCtx, this.cvWidth, this.cvHeight);
      const imgData = this.cvCtx.getImageData(0, 0, this.cvWidth, this.cvHeight).data;

      let lumaSum = 0;
      for (let i = 0, p = 0; i < imgData.length; i += 4, p++) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        const luma = (r * 77 + g * 150 + b * 29) >> 8;
        this.currLuma[p] = luma;
        lumaSum += luma;
      }
      const avgLuma = lumaSum / Math.max(1, this.cvWidth * this.cvHeight);
      this.ambientBrightness = this.ambientBrightness * 0.84 + avgLuma * 0.16;
      if (!this.isDarkRoom && this.ambientBrightness < 66) {
        this.isDarkRoom = true;
      } else if (this.isDarkRoom && this.ambientBrightness > 78) {
        this.isDarkRoom = false;
      }

      if (this.prevLuma) {
        flow = this.computeOpticalFlow(W, H);
      } else {
        this.prevLuma = new Uint8Array(this.cvWidth * this.cvHeight);
      }

      if (Math.abs(flow.dx) > 0.15 || Math.abs(flow.dy) > 0.15) {
        for (const obj of this.semanticObjects) {
          obj.x += flow.dx;
          obj.y += flow.dy;
        }
        if (this.pinnedTarget) {
          this.pinnedTarget.x += flow.dx;
          this.pinnedTarget.y += flow.dy;
        }
      }

      this.detectPalmBySkinAndContour(now, cvDt, W, H, imgData);
      this.prevLuma.set(this.currLuma);
      didHeavyWorkThisFrame = true;
    }

    for (let i = this.semanticObjects.length - 1; i >= 0; i--) {
      const o = this.semanticObjects[i];
      if (o.playerStanding) {
        o.ttl = Math.max(o.ttl, 3.0);
        o.playerStanding = false;
      } else {
        o.ttl -= dt;
      }
      if (o.ttl <= 0) this.semanticObjects.splice(i, 1);
    }

    if (this.pinnedTarget) {
      this.pinnedTarget.ttl -= dt;
      if (this.pinnedTarget.ttl <= 0) this.pinnedTarget = null;
    }

    if (!didHeavyWorkThisFrame && this.activeGameMode !== 'pet' && this.detector && now - this.lastDetectTime >= 320) {
      this.lastDetectTime = now;
      this.runMediaPipeDetection(now, W, H);
    }

    return flow;
  }

  computeOpticalFlow(W, H) {
    const cw = this.cvWidth;
    const ch = this.cvHeight;
    const prev = this.prevLuma;
    const curr = this.currLuma;
    const dxs = [];
    const dys = [];

    for (let gy = 1; gy <= 3; gy++) {
      for (let gx = 1; gx <= 3; gx++) {
        const cx = Math.floor((gx / 4) * cw);
        const cy = Math.floor((gy / 4) * ch);

        let minV = 255;
        let maxV = 0;
        for (let py = -4; py <= 4; py += 2) {
          for (let px = -4; px <= 4; px += 2) {
            const v = prev[(cy + py) * cw + (cx + px)];
            if (v < minV) minV = v;
            if (v > maxV) maxV = v;
          }
        }
        if (maxV - minV < 16) continue;

        let bestSad = Infinity;
        let bestDx = 0;
        let bestDy = 0;
        for (let dy = -5; dy <= 5; dy++) {
          for (let dx = -5; dx <= 5; dx++) {
            let sad = 0;
            for (let py = -4; py < 4; py += 2) {
              const r1 = (cy + py) * cw + cx;
              const r2 = (cy + py + dy) * cw + (cx + dx);
              for (let px = -4; px < 4; px += 2) {
                sad += Math.abs(prev[r1 + px] - curr[r2 + px]);
              }
            }
            if (sad < bestSad) {
              bestSad = sad;
              bestDx = dx;
              bestDy = dy;
            }
          }
        }
        if (bestSad < 240) {
          dxs.push(bestDx);
          dys.push(bestDy);
        }
      }
    }

    if (dxs.length < 2) return { dx: 0, dy: 0 };
    dxs.sort((a, b) => a - b);
    dys.sort((a, b) => a - b);
    const mid = dxs.length >> 1;
    return {
      dx: (dxs[mid] / cw) * W,
      dy: (dys[mid] / ch) * H
    };
  }

  runMediaPipeDetection(now, W, H) {
    try {
      this.drawAlignedVideoTo(this.detCtx, this.detWidth, this.detHeight);
      const res = this.detector.detectForVideo(this.detCanvas, now);
      if (!res || !res.detections) return;

      for (const det of res.detections) {
        if (!det.categories || !det.categories[0]) continue;
        const cat = det.categories[0].categoryName.toLowerCase();
        if (cat === 'dining table' || cat === 'person' || cat === 'couch' || cat === 'bed') continue;

        const bb = det.boundingBox;
        const rawX = (bb.originX / this.detWidth) * W;
        const rawY = (bb.originY / this.detHeight) * H;
        const rawW = (bb.width / this.detWidth) * W;
        const rawH = (bb.height / this.detHeight) * H;

        if (rawW < 42 || rawW > W * 0.65 || rawY < H * 0.10 || rawY > H * 0.78) continue;

        let matched = false;
        for (const obj of this.semanticObjects) {
          const prevMidX = obj.x + obj.w * 0.5;
          const newMidX = rawX + rawW * 0.5;
          if (Math.abs(prevMidX - newMidX) < 110 && Math.abs(obj.y - rawY) < 90) {
            obj.x = obj.x * 0.6 + rawX * 0.4;
            obj.y = obj.y * 0.6 + rawY * 0.4;
            obj.w = obj.w * 0.6 + rawW * 0.4;
            obj.h = obj.h * 0.6 + rawH * 0.4;
            obj.ttl = 3.0;
            matched = true;
            break;
          }
        }

        if (!matched && this.semanticObjects.length < 3) {
          this.semanticObjects.push({
            id: `${cat}-${Date.now()}-${Math.random()}`,
            catKey: cat,
            role: 'spring',
            color: '#00f3ff',
            x: rawX,
            y: rawY,
            w: rawW,
            h: rawH,
            ttl: 3.0
          });
        }
      }
    } catch (e) {}
  }

  getAllWalkablePlatforms(W, H) {
    const list = [];

    if (this.palmTarget.active && this.palmTarget.inCenterZone) {
      const halfW = Math.max(46, this.palmTarget.w * 0.45);
      list.push({
        x1: this.palmTarget.x - halfW,
        x2: this.palmTarget.x + halfW,
        y: Math.max(Math.min(H * 0.62, Math.max(198, H * 0.28)), this.palmTarget.surfaceY),
        role: 'palm',
        isPalm: true,
        ref: this.palmTarget
      });
    }

    const minSafePlatY = Math.min(H * 0.62, Math.max(198, H * 0.28));
    for (const obj of this.semanticObjects) {
      if (obj.y < minSafePlatY) continue;
      list.push({
        x1: obj.x - 4,
        x2: obj.x + obj.w + 4,
        y: obj.y,
        role: obj.role,
        objId: obj.id,
        ref: obj
      });
    }
    if (this.pinnedTarget) {
      const clampedY = Math.max(minSafePlatY, this.pinnedTarget.y);
      this.pinnedTarget.y = clampedY;
      list.push({
        x1: this.pinnedTarget.x - 4,
        x2: this.pinnedTarget.x + this.pinnedTarget.w + 4,
        y: clampedY,
        role: this.pinnedTarget.role,
        objId: this.pinnedTarget.id,
        ref: this.pinnedTarget
      });
    }

    const centerFloorY = H * 0.68;
    list.push({
      x1: -200,
      x2: W + 200,
      y: centerFloorY,
      role: 'floor',
      isFloor: true
    });

    return list;
  }

  renderBackgroundAndNeon(ctx, W, H, now = performance.now()) {
    ctx.clearRect(0, 0, W, H);
    const dtSec =
      this.lastAmbienceRenderAt > 0
        ? Math.min(0.08, Math.max(0.001, (now - this.lastAmbienceRenderAt) / 1000))
        : 0.016;
    this.lastAmbienceRenderAt = now;
    if (this.windowTransition < 1) {
      this.windowTransition = Math.min(1, this.windowTransition + dtSec * 2.2);
    }

    if (this.mode !== 'camera') {
      this.isDarkRoom = this.windowAmbience.period === 'starry';
      this.renderSimulatedDeskScene(ctx, W, H, now);
    } else {
      this.renderAmbientTintOverlay(ctx, W, H, now, 0.48);
    }
  }

  renderAmbientTintOverlay(ctx, W, H, now, strength = 1) {
    const period = this.windowAmbience?.period || 'morning';
    const isAquarium = this.roomTheme === 'star_aquarium';
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    if (period === 'morning') {
      grad.addColorStop(0, `rgba(255, 233, 196, ${(0.15 * strength).toFixed(3)})`);
      grad.addColorStop(0.58, `rgba(255, 245, 224, ${(0.08 * strength).toFixed(3)})`);
      grad.addColorStop(1, `rgba(255, 236, 206, ${(0.05 * strength).toFixed(3)})`);
    } else if (period === 'noon') {
      grad.addColorStop(0, `rgba(226, 246, 255, ${(0.11 * strength).toFixed(3)})`);
      grad.addColorStop(0.6, `rgba(255, 252, 244, ${(0.04 * strength).toFixed(3)})`);
      grad.addColorStop(1, `rgba(255, 248, 235, ${(0.03 * strength).toFixed(3)})`);
    } else if (period === 'dusk') {
      grad.addColorStop(0, `rgba(255, 184, 132, ${(0.21 * strength).toFixed(3)})`);
      grad.addColorStop(0.55, `rgba(255, 208, 168, ${(0.14 * strength).toFixed(3)})`);
      grad.addColorStop(1, `rgba(244, 178, 138, ${(0.09 * strength).toFixed(3)})`);
    } else {
      // 治愈童话星夜柔光（拒绝生硬死黑与暗黑赛博，保持柔和薰衣草星梦底色）
      const topAlpha = (isAquarium ? 0.18 : 0.24) * strength;
      const midAlpha = (isAquarium ? 0.12 : 0.16) * strength;
      grad.addColorStop(0, `rgba(98, 114, 184, ${topAlpha.toFixed(3)})`);
      grad.addColorStop(0.58, `rgba(132, 128, 196, ${midAlpha.toFixed(3)})`);
      grad.addColorStop(1, `rgba(112, 108, 168, ${(0.1 * strength).toFixed(3)})`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  renderWindowScenery(ctx, W, H, now = 0) {
    const period = this.windowAmbience?.period || 'morning';
    const season = this.windowAmbience?.season || 'spring';
    this.ensureWindowAssets(period, season);

    const winW = Math.max(136, Math.min(228, W * 0.19));
    const winH = winW * 0.75;
    const winCx = W * 0.675 + (this.simCamX || 0) * 0.22;
    const winCy = Math.max(winH * 0.56 + 52, H * 0.295);
    const winLeft = winCx - winW * 0.5;
    const winTop = winCy - winH * 0.5;

    ctx.save();

    // 窗棂投射向桌面的柔和阳光/霞光/星辉光束（纯柔光渐变洗色）
    const beamGrad = ctx.createRadialGradient(winCx, winCy, winW * 0.1, winCx - winW * 0.22, winCy + winH * 0.7, winW * 1.35);
    if (period === 'morning') {
      beamGrad.addColorStop(0, 'rgba(255, 241, 198, 0.34)');
      beamGrad.addColorStop(1, 'rgba(255, 241, 198, 0)');
    } else if (period === 'noon') {
      beamGrad.addColorStop(0, 'rgba(235, 250, 255, 0.28)');
      beamGrad.addColorStop(1, 'rgba(235, 250, 255, 0)');
    } else if (period === 'dusk') {
      beamGrad.addColorStop(0, 'rgba(255, 192, 140, 0.36)');
      beamGrad.addColorStop(1, 'rgba(255, 192, 140, 0)');
    } else {
      beamGrad.addColorStop(0, 'rgba(186, 198, 255, 0.28)');
      beamGrad.addColorStop(1, 'rgba(186, 198, 255, 0)');
    }
    ctx.fillStyle = beamGrad;
    ctx.fillRect(Math.max(0, winCx - winW * 1.4), Math.max(0, winCy - winH * 0.7), winW * 2.5, winH * 2.3);

    const currImg = this.winImgs[period];
    const prevImg = this.prevWindowPeriod ? this.winImgs[this.prevWindowPeriod] : null;
    const alpha = this.windowTransition;

    if (prevImg && prevImg.complete && prevImg.naturalWidth > 0 && alpha < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - alpha;
      ctx.drawImage(prevImg, winLeft, winTop, winW, winH);
      ctx.restore();
    }

    if (currImg && currImg.complete && currImg.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = prevImg && alpha < 1 ? alpha : 1;
      ctx.drawImage(currImg, winLeft, winTop, winW, winH);
      ctx.restore();
    }

    // 星空时段窗内柔和星芒闪烁（复用手绘 vfx_sparkle.webp）
    if (period === 'starry' && this.sparkleImg && this.sparkleImg.complete && this.sparkleImg.naturalWidth > 0) {
      for (let i = 0; i < 3; i++) {
        const pulse = 0.42 + 0.48 * Math.sin(now * 0.0032 + i * 2.1);
        const sx = winLeft + winW * (0.3 + i * 0.2);
        const sy = winTop + winH * (0.28 + (i % 2) * 0.14);
        const sSz = 14 + (i % 2) * 4;
        ctx.save();
        ctx.globalAlpha = Math.max(0.15, pulse * 0.82);
        ctx.drawImage(this.sparkleImg, sx - sSz * 0.5, sy - sSz * 0.5, sSz, sSz);
        ctx.restore();
      }
    }

    // 四季治愈窗边风物点缀（手绘春樱 / 夏日风铃 / 秋枫 / 初雪 .webp 贴图）
    const seasonImg = this.seasonImgs[season];
    if (seasonImg && seasonImg.complete && seasonImg.naturalWidth > 0) {
      if (season === 'summer') {
        // 夏日玻璃风铃悬挂在窗檐右上角随微风轻摆
        const chimeX = winLeft + winW * 0.82;
        const chimeY = winTop + winH * 0.22;
        const swing = Math.sin(now * 0.0026) * 0.14;
        const chimeSz = Math.max(30, winW * 0.2);
        ctx.save();
        ctx.translate(chimeX, chimeY);
        ctx.rotate(swing);
        ctx.drawImage(seasonImg, -chimeSz * 0.5, -chimeSz * 0.18, chimeSz, chimeSz);
        ctx.restore();
      } else {
        // 春樱 / 秋枫 / 初雪：轻柔飘落窗前的手绘季节微粒 + 窗台角落手账风贴饰
        const tSec = now * 0.001;
        for (let i = 0; i < 5; i++) {
          const mote = this.seasonMotes[i];
          const progress = (mote.seedV + tSec * mote.speed) % 1;
          const mx =
            winLeft +
            winW * mote.seedU +
            Math.sin(tSec * 1.5 + mote.phase) * mote.swayAmp;
          const my = winTop + winH * (0.14 + progress * 0.74);
          const mSz = Math.max(15, winW * 0.095 * mote.scale);
          const edgeFade = Math.sin(progress * Math.PI);
          ctx.save();
          ctx.globalAlpha = Math.max(0.18, edgeFade * 0.86);
          ctx.translate(mx, my);
          ctx.rotate(Math.sin(tSec * 1.1 + mote.phase) * 0.35);
          ctx.drawImage(seasonImg, -mSz * 0.5, -mSz * 0.5, mSz, mSz);
          ctx.restore();
        }
        // 窗台右下角常驻一枚季节小点缀
        const cornerSz = Math.max(24, winW * 0.14);
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.drawImage(
          seasonImg,
          winLeft + winW * 0.78 - cornerSz * 0.5,
          winTop + winH * 0.82 - cornerSz * 0.5,
          cornerSz,
          cornerSz
        );
        ctx.restore();
      }
    }

    ctx.restore();
  }

  renderSimulatedDeskScene(ctx, W, H, now = 0) {
    ctx.save();
    if (!this.simBgImg) {
      this.setRoomTheme(this.roomTheme || 'cream_study');
    }
    if (this.simBgImg && this.simBgImg.complete && this.simBgImg.naturalWidth > 0) {
      ctx.drawImage(this.simBgImg, 0, 0, W, H);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      if (this.roomTheme === 'star_aquarium') {
        grad.addColorStop(0, '#c8ecff');
        grad.addColorStop(0.55, '#e8f9ff');
        grad.addColorStop(0.56, '#d9b58e');
        grad.addColorStop(1, '#b88e66');
      } else {
        grad.addColorStop(0, '#dff2ff');
        grad.addColorStop(0.55, '#fff8ec');
        grad.addColorStop(0.56, '#e8c396');
        grad.addColorStop(1, '#d4a373');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
    this.renderWindowScenery(ctx, W, H, now);
    this.renderAmbientTintOverlay(ctx, W, H, now, 1);
    ctx.restore();
  }
}
