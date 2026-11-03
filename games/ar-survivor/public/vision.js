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

    this.initMediaPipe();
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
    const ox = this.simCamX;
    this.semanticObjects = [
      {
        id: 'sim-center-pad',
        role: 'tech',
        color: '#00f3ff',
        x: W * 0.38 + ox,
        y: H * 0.53,
        w: W * 0.24,
        h: H * 0.12,
        ttl: 999
      }
    ];
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
        y: this.palmTarget.surfaceY,
        role: 'palm',
        isPalm: true,
        ref: this.palmTarget
      });
    }

    const allObjs = [...this.semanticObjects];
    if (this.pinnedTarget) allObjs.push(this.pinnedTarget);

    for (const obj of allObjs) {
      list.push({
        x1: obj.x - 4,
        x2: obj.x + obj.w + 4,
        y: obj.y,
        role: obj.role,
        objId: obj.id,
        ref: obj
      });
    }

    const centerFloorY = H * 0.56;
    list.push({
      x1: -200,
      x2: W + 200,
      y: centerFloorY,
      role: 'floor',
      isFloor: true
    });

    return list;
  }

  renderBackgroundAndNeon(ctx, W, H, now) {
    ctx.clearRect(0, 0, W, H);
    if (this.mode !== 'camera') {
      this.renderSimulatedDeskScene(ctx, W, H, now);
    }
  }

  renderSimulatedDeskScene(ctx, W, H) {
    ctx.save();
    if (!this.simBgImg) {
      this.simBgImg = new Image();
      this.simBgImg.src = './assets/bg_healing_room.webp?v=hd6';
    }
    if (this.simBgImg.complete && this.simBgImg.naturalWidth > 0) {
      ctx.drawImage(this.simBgImg, 0, 0, W, H);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#dff2ff');
      grad.addColorStop(0.55, '#fff8ec');
      grad.addColorStop(0.56, '#e8c396');
      grad.addColorStop(1, '#d4a373');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }
}
