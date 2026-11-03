import * as THREE from 'three';

export type ThemeId =
  | 'wasteland'
  | 'sakura'
  | 'glacier'
  | 'magma'
  | 'cyberhive'
  | 'emerald'
  | 'ocean'
  | 'royal';

export type RoadPatternId =
  | 'cobble'
  | 'sakura'
  | 'ice'
  | 'wafer'
  | 'carnival'
  | 'forest'
  | 'ocean'
  | 'royal';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  badge: string;
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
  sunColor: number;
  sunIntensity: number;
  rimLightColor: number;
  bossLightColor: number;
  portalCoreColor: number;
  portalRingColor: number;
  roadBaseHex: string;
  roadPlateHex: string;
  roadLineHex: string;
  roadAccentHex: string;
  roadPattern: RoadPatternId;
  curbColor: number;
  curbEmissive: number;
  cliffColor: number;
  cliffSecondaryColor: number;
  roofColor: number;
  foliageColor: number;
  crystalColor: number;
  crystalEmissive: number;
  bossArmorColor: number;
  bossSecondaryColor: number;
  bossEyeColor: number;
  abyssBaseHex: string;
  abyssVeinHex: string;
  ambientParticleColor: number;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  wasteland: {
    id: 'wasteland',
    name: '🏭 暖阳街区 · 蒸汽齿轮城',
    badge: '齿轮城',
    skyColor: 0x1d4ed8,
    fogColor: 0x2563eb,
    fogDensity: 0.00042,
    hemiSkyColor: 0xdbeafe,
    hemiGroundColor: 0x854d0e,
    hemiIntensity: 0.86,
    sunColor: 0xfff3c4,
    sunIntensity: 1.68,
    rimLightColor: 0xfbbf24,
    bossLightColor: 0xf59e0b,
    portalCoreColor: 0x36201a,
    portalRingColor: 0xf59e0b,
    roadBaseHex: '#c89258',
    roadPlateHex: '#e0ad72',
    roadLineHex: '#6b3e1b',
    roadAccentHex: '#fef3c7',
    roadPattern: 'cobble',
    curbColor: 0xb87d4b,
    curbEmissive: 0x000000,
    cliffColor: 0xb93829,
    cliffSecondaryColor: 0x7f1d1d,
    roofColor: 0xc2410c,
    foliageColor: 0x22c55e,
    crystalColor: 0xf59e0b,
    crystalEmissive: 0x451a03,
    bossArmorColor: 0xb93829,
    bossSecondaryColor: 0xf59e0b,
    bossEyeColor: 0xfef08a,
    abyssBaseHex: '#153782',
    abyssVeinHex: '#2563eb',
    ambientParticleColor: 0xfef08a,
  },
  sakura: {
    id: 'sakura',
    name: '🌸 春日花见 · 樱花神社町',
    badge: '樱花町',
    skyColor: 0xffdfee,
    fogColor: 0xffeef7,
    fogDensity: 0.0012,
    hemiSkyColor: 0xfff5fa,
    hemiGroundColor: 0xd99bb5,
    hemiIntensity: 1.35,
    sunColor: 0xfff2e6,
    sunIntensity: 2.32,
    rimLightColor: 0xff85b8,
    bossLightColor: 0xff6b9e,
    portalCoreColor: 0x3d1628,
    portalRingColor: 0xff7eb6,
    roadBaseHex: '#f6d8e5',
    roadPlateHex: '#ffeaf3',
    roadLineHex: '#a86482',
    roadAccentHex: '#ffffff',
    roadPattern: 'sakura',
    curbColor: 0xe5adc4,
    curbEmissive: 0x000000,
    cliffColor: 0xd94862,
    cliffSecondaryColor: 0x9e2a42,
    roofColor: 0x3f4d75,
    foliageColor: 0xff80b5,
    crystalColor: 0xfbbf24,
    crystalEmissive: 0x422006,
    bossArmorColor: 0xc83754,
    bossSecondaryColor: 0xfbbf24,
    bossEyeColor: 0xffe4ec,
    abyssBaseHex: '#fbd5e5',
    abyssVeinHex: '#fff7fb',
    ambientParticleColor: 0xffb3d1,
  },
  glacier: {
    id: 'glacier',
    name: '🍧 极光冰晶 · 薄荷雪糕港',
    badge: '雪糕港',
    skyColor: 0xb0f0ff,
    fogColor: 0xdff8ff,
    fogDensity: 0.0011,
    hemiSkyColor: 0xf2fcff,
    hemiGroundColor: 0x7cb8d4,
    hemiIntensity: 1.38,
    sunColor: 0xfff9eb,
    sunIntensity: 2.32,
    rimLightColor: 0x38bdf8,
    bossLightColor: 0x22d3ee,
    portalCoreColor: 0x102a42,
    portalRingColor: 0x38bdf8,
    roadBaseHex: '#bae8fa',
    roadPlateHex: '#e0f6ff',
    roadLineHex: '#4d92b8',
    roadAccentHex: '#ffffff',
    roadPattern: 'ice',
    curbColor: 0x93d5f0,
    curbEmissive: 0x000000,
    cliffColor: 0x3898d4,
    cliffSecondaryColor: 0x226899,
    roofColor: 0xf4fbff,
    foliageColor: 0x6ee7b7,
    crystalColor: 0x67e8f9,
    crystalEmissive: 0x083344,
    bossArmorColor: 0x2980b9,
    bossSecondaryColor: 0x67e8f9,
    bossEyeColor: 0xe0f2fe,
    abyssBaseHex: '#c8f0ff',
    abyssVeinHex: '#ffffff',
    ambientParticleColor: 0xffffff,
  },
  magma: {
    id: 'magma',
    name: '🥐 焦糖夕照 · 甜点烘焙坊',
    badge: '烘焙坊',
    skyColor: 0xffcca0,
    fogColor: 0xffe4c8,
    fogDensity: 0.0013,
    hemiSkyColor: 0xfff3e2,
    hemiGroundColor: 0xc27844,
    hemiIntensity: 1.32,
    sunColor: 0xffe4b5,
    sunIntensity: 2.36,
    rimLightColor: 0xff9248,
    bossLightColor: 0xf97316,
    portalCoreColor: 0x3b180e,
    portalRingColor: 0xf47296,
    roadBaseHex: '#e6b276',
    roadPlateHex: '#f6d2a4',
    roadLineHex: '#6e3918',
    roadAccentHex: '#fff8eb',
    roadPattern: 'wafer',
    curbColor: 0xc98850,
    curbEmissive: 0x000000,
    cliffColor: 0x7c3f20,
    cliffSecondaryColor: 0x542610,
    roofColor: 0xf47296,
    foliageColor: 0x52b788,
    crystalColor: 0xfbbf24,
    crystalEmissive: 0x451a03,
    bossArmorColor: 0x7c3f20,
    bossSecondaryColor: 0xf47296,
    bossEyeColor: 0xffe57f,
    abyssBaseHex: '#f5cfa6',
    abyssVeinHex: '#fff5e6',
    ambientParticleColor: 0xffe8cc,
  },
  cyberhive: {
    id: 'cyberhive',
    name: '🎡 星梦嘉年华 · 奇幻游乐园',
    badge: '游乐园',
    skyColor: 0xdcc2ff,
    fogColor: 0xf0e0ff,
    fogDensity: 0.0012,
    hemiSkyColor: 0xf8f0ff,
    hemiGroundColor: 0x9b72cf,
    hemiIntensity: 1.35,
    sunColor: 0xfff0d8,
    sunIntensity: 2.32,
    rimLightColor: 0xf472b6,
    bossLightColor: 0xc084fc,
    portalCoreColor: 0x2b124c,
    portalRingColor: 0xf472b6,
    roadBaseHex: '#d5c4f7',
    roadPlateHex: '#ebe0ff',
    roadLineHex: '#6c4ba6',
    roadAccentHex: '#fff9ff',
    roadPattern: 'carnival',
    curbColor: 0xb796f0,
    curbEmissive: 0x000000,
    cliffColor: 0x6d42c7,
    cliffSecondaryColor: 0x4a2796,
    roofColor: 0xff5ca8,
    foliageColor: 0x38bdf8,
    crystalColor: 0xfacc15,
    crystalEmissive: 0x3b1d5e,
    bossArmorColor: 0x6d42c7,
    bossSecondaryColor: 0xff5ca8,
    bossEyeColor: 0xfef08a,
    abyssBaseHex: '#e5d4ff',
    abyssVeinHex: '#fff7ff',
    ambientParticleColor: 0xfde047,
  },
  emerald: {
    id: 'emerald',
    name: '🌲 翠林仙踪 · 精灵风车谷',
    badge: '精灵谷',
    skyColor: 0xc2f5d8,
    fogColor: 0xe4fcee,
    fogDensity: 0.0012,
    hemiSkyColor: 0xf2fff7,
    hemiGroundColor: 0x76b865,
    hemiIntensity: 1.34,
    sunColor: 0xfff6cf,
    sunIntensity: 2.34,
    rimLightColor: 0x4ade80,
    bossLightColor: 0x84cc16,
    portalCoreColor: 0x14331d,
    portalRingColor: 0x4ade80,
    roadBaseHex: '#bde09b',
    roadPlateHex: '#d8f2be',
    roadLineHex: '#527d39',
    roadAccentHex: '#fafff0',
    roadPattern: 'forest',
    curbColor: 0x8ec468,
    curbEmissive: 0x000000,
    cliffColor: 0x7d5638,
    cliffSecondaryColor: 0x593a22,
    roofColor: 0xe63946,
    foliageColor: 0x38b000,
    crystalColor: 0xfacc15,
    crystalEmissive: 0x1b4332,
    bossArmorColor: 0x388e3c,
    bossSecondaryColor: 0xfacc15,
    bossEyeColor: 0xd9f99d,
    abyssBaseHex: '#d2f5df',
    abyssVeinHex: '#f7fff9',
    ambientParticleColor: 0xd9f99d,
  },
  ocean: {
    id: 'ocean',
    name: '🐳 珊瑚浅湾 · 泡泡海底城',
    badge: '海底城',
    skyColor: 0x8ae6ff,
    fogColor: 0xc9f4ff,
    fogDensity: 0.0012,
    hemiSkyColor: 0xebfcff,
    hemiGroundColor: 0x4da8b8,
    hemiIntensity: 1.36,
    sunColor: 0xfff8dc,
    sunIntensity: 2.34,
    rimLightColor: 0x2dd4bf,
    bossLightColor: 0x38bdf8,
    portalCoreColor: 0x0c3442,
    portalRingColor: 0xff758f,
    roadBaseHex: '#9ee3e6',
    roadPlateHex: '#c8f5f7',
    roadLineHex: '#2b7a87',
    roadAccentHex: '#ffffff',
    roadPattern: 'ocean',
    curbColor: 0x6ecad4,
    curbEmissive: 0x000000,
    cliffColor: 0x1f8fa3,
    cliffSecondaryColor: 0x146373,
    roofColor: 0xff7088,
    foliageColor: 0x2dd4bf,
    crystalColor: 0xfbbf24,
    crystalEmissive: 0x0f3f4c,
    bossArmorColor: 0x1f8fa3,
    bossSecondaryColor: 0xff7088,
    bossEyeColor: 0xa5f3fc,
    abyssBaseHex: '#b8f2ff',
    abyssVeinHex: '#f2fdff',
    ambientParticleColor: 0xe0f2fe,
  },
  royal: {
    id: 'royal',
    name: '🏰 凯旋大道 · 皇家积木城',
    badge: '积木城',
    skyColor: 0xa2d0ff,
    fogColor: 0xdbeeff,
    fogDensity: 0.0012,
    hemiSkyColor: 0xf2f8ff,
    hemiGroundColor: 0xb5a692,
    hemiIntensity: 1.35,
    sunColor: 0xfff3d4,
    sunIntensity: 2.36,
    rimLightColor: 0x60a5fa,
    bossLightColor: 0xf59e0b,
    portalCoreColor: 0x1b2848,
    portalRingColor: 0xfacc15,
    roadBaseHex: '#ede3d2',
    roadPlateHex: '#faf5ec',
    roadLineHex: '#877660',
    roadAccentHex: '#ffffff',
    roadPattern: 'royal',
    curbColor: 0xd4be9e,
    curbEmissive: 0x000000,
    cliffColor: 0x3862b5,
    cliffSecondaryColor: 0x244282,
    roofColor: 0xd93648,
    foliageColor: 0x65a30d,
    crystalColor: 0xfacc15,
    crystalEmissive: 0x3b2506,
    bossArmorColor: 0x3862b5,
    bossSecondaryColor: 0xd93648,
    bossEyeColor: 0xfde047,
    abyssBaseHex: '#dcebff',
    abyssVeinHex: '#ffffff',
    ambientParticleColor: 0xfef08a,
  },
};

export const THEME_ORDER: ThemeId[] = [
  'wasteland',
  'sakura',
  'glacier',
  'magma',
  'cyberhive',
  'emerald',
  'ocean',
  'royal',
];

function drawRoundedBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rr = Math.min(r, w * 0.4, h * 0.4);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/**
 * Generates a 1024x2048 warm sunlit sandstone/travertine cobblestone viaduct bridge texture
 * matching the golden-hour steampunk factory town aesthetic:
 * - Staggered ashlar & square sandstone pavers with subtle warm per-stone tint variations
 * - Warm earthy mortar joints & crisp sunlit top-bevel highlights
 * - Raised stone border trim blocks along left & right flanks
 * - Soft painted creamy-white double chevrons down the central avenue
 */
export function createThemedRoadTexture(theme: ThemeConfig): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width;
  const H = canvas.height;

  // 1. Warm mortar bed base
  ctx.fillStyle = theme.roadLineHex;
  ctx.fillRect(0, 0, W, H);

  // 2. Staggered Sandstone Cobblestone Pavers across the main bridge deck (x: 56 .. W-56)
  const deckLeft = 56;
  const deckW = W - 112;
  const rows = 28;
  const rowH = H / rows;
  const baseCol = new THREE.Color(theme.roadBaseHex);
  const lightCol = new THREE.Color(theme.roadPlateHex);
  const tmpCol = new THREE.Color();

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const cols = 6;
    const baseStoneW = deckW / cols;
    const stagger = r % 2 === 1 ? baseStoneW * 0.5 : 0;

    for (let c = -1; c <= cols; c++) {
      const rawX = deckLeft + c * baseStoneW + stagger;
      const sx = Math.max(deckLeft, rawX);
      const ex = Math.min(deckLeft + deckW, rawX + baseStoneW);
      const sw = ex - sx;
      if (sw < 16) continue;

      // Deterministic pseudo-random warm tint per stone paver
      const hash = Math.abs(Math.sin(r * 127.1 + c * 311.7) * 43758.5453) % 1;
      const hash2 = Math.abs(Math.sin(r * 269.5 + c * 183.3) * 19531.213) % 1;
      tmpCol.copy(baseCol).lerp(lightCol, 0.2 + hash * 0.72);
      if (hash2 < 0.28) {
        tmpCol.offsetHSL(0.008, 0.03, -0.035);
      } else if (hash2 > 0.74) {
        tmpCol.offsetHSL(-0.004, -0.02, 0.028);
      }

      const pad = 4.5;
      const bx = sx + pad;
      const by = y + pad;
      const bw = sw - pad * 2;
      const bh = rowH - pad * 2;

      // 2D Cartoon Dark-Brown Mortar Ink Outline Base (#4a2812)
      ctx.fillStyle = '#4a2812';
      drawRoundedBlock(ctx, bx - 1.5, by - 1.5, bw + 3.0, bh + 3.0, 10);
      ctx.fill();

      // Main 2D Thick-Painted Paver Fill with theme-tinted gradient
      const stoneGrad = ctx.createLinearGradient(bx, by, bx + bw * 0.45, by + bh);
      const topHex = `#${tmpCol.clone().offsetHSL(0, 0.04, 0.055).getHexString()}`;
      const botHex = `#${tmpCol.clone().offsetHSL(0, 0.04, -0.025).getHexString()}`;
      const edgeHex = `#${baseCol.clone().offsetHSL(0, 0.04, -0.08).getHexString()}`;
      stoneGrad.addColorStop(0, topHex);
      stoneGrad.addColorStop(0.72, botHex);
      stoneGrad.addColorStop(1, edgeHex);
      ctx.fillStyle = stoneGrad;
      drawRoundedBlock(ctx, bx, by, bw, bh, 8.5);
      ctx.fill();

      // 2D Cel-Painted Bottom-Right Inner Bevel
      ctx.strokeStyle = 'rgba(72, 42, 22, 0.32)';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(bx + 8, by + bh - 2.5);
      ctx.lineTo(bx + bw - 8, by + bh - 2.5);
      ctx.quadraticCurveTo(bx + bw - 2.5, by + bh - 2.5, bx + bw - 2.5, by + bh - 8);
      ctx.lineTo(bx + bw - 2.5, by + 8);
      ctx.stroke();

      // Crisp 2D Cartoon Top-Left Highlight Band on every paver
      ctx.strokeStyle = 'rgba(255, 253, 248, 0.78)';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(bx + 6, by + bh - 10);
      ctx.lineTo(bx + 2.8, by + 8);
      ctx.quadraticCurveTo(bx + 2.8, by + 2.8, bx + 8, by + 2.8);
      ctx.lineTo(bx + bw - 10, by + 2.8);
      ctx.stroke();

      // Theme-specific 2D Hand-Painted Paver Motifs
      if (theme.roadPattern === 'wafer' && bw > 45) {
        // Biscuit wafer diagonal waffle grill lines & candy sprinkles
        ctx.strokeStyle = 'rgba(124, 62, 24, 0.28)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(bx + 12, by + 8);
        ctx.lineTo(bx + bw - 12, by + bh - 8);
        ctx.moveTo(bx + bw - 12, by + 8);
        ctx.lineTo(bx + 12, by + bh - 8);
        ctx.stroke();
        if (hash > 0.52) {
          const spColors = ['#ff5ca8', '#38bdf8', '#facc15', '#4ade80'];
          ctx.fillStyle = spColors[(r + c) % spColors.length];
          drawRoundedBlock(ctx, bx + bw * 0.42, by + bh * 0.42, 14, 6, 3);
          ctx.fill();
        }
      } else if (theme.roadPattern === 'ice' && bw > 45) {
        // Frosted diagonal ice-crystal gleam & snowflake sparkle
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(bx + 14, by + bh * 0.72);
        ctx.lineTo(bx + bw * 0.55, by + 10);
        ctx.stroke();
      } else if (theme.roadPattern === 'sakura' && hash > 0.48 && bw > 45) {
        // Fallen 2D pink sakura petals on the stone slabs
        ctx.fillStyle = hash2 > 0.5 ? '#ff7eb6' : '#ffb3d1';
        const px = bx + bw * (0.28 + hash2 * 0.45);
        const py = by + bh * (0.3 + hash * 0.4);
        ctx.beginPath();
        ctx.ellipse(px, py, 7.5, 4.5, hash * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      } else if (theme.roadPattern === 'forest' && hash > 0.5 && bw > 45) {
        // Cute clover leaf & moss tuft at stone corners
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(bx + 14, by + bh - 12, 5.5, 0, Math.PI * 2);
        ctx.arc(bx + 21, by + bh - 10, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (theme.roadPattern === 'ocean' && hash > 0.52 && bw > 45) {
        // Pearlescent sea-bubble rings & tiny coral starfish
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(bx + bw * 0.5, by + bh * 0.5, 8 + hash2 * 5, 0, Math.PI * 2);
        ctx.stroke();
      } else if (theme.roadPattern === 'carnival' && hash > 0.5 && bw > 45) {
        // Pastel carnival diamond / confetti motif
        ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255, 92, 168, 0.28)' : 'rgba(56, 189, 248, 0.28)';
        ctx.beginPath();
        ctx.moveTo(bx + bw * 0.5, by + 10);
        ctx.lineTo(bx + bw - 14, by + bh * 0.5);
        ctx.lineTo(bx + bw * 0.5, by + bh - 10);
        ctx.lineTo(bx + 14, by + bh * 0.5);
        ctx.closePath();
        ctx.fill();
      } else if (hash > 0.62 && bw > 55) {
        ctx.strokeStyle = 'rgba(92, 54, 24, 0.38)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        const cx0 = bx + bw * (0.28 + hash2 * 0.42);
        ctx.moveTo(cx0, by + 1.5);
        ctx.lineTo(cx0 + (hash - 0.7) * 18, by + bh * 0.34);
        ctx.lineTo(cx0 - 4, by + bh * 0.52);
        ctx.stroke();
      }
    }
  }

  // 2b. Royal Castle Theme Special: Grand Central Crimson-and-Gold Royal Carpet Runner!
  if (theme.roadPattern === 'royal') {
    const carpetW = 280;
    const carpetX = (W - carpetW) * 0.5;
    ctx.fillStyle = '#4a121b';
    ctx.fillRect(carpetX - 5, 0, carpetW + 10, H);
    const carpetGrad = ctx.createLinearGradient(carpetX, 0, carpetX + carpetW, 0);
    carpetGrad.addColorStop(0, '#b82538');
    carpetGrad.addColorStop(0.5, '#df3b50');
    carpetGrad.addColorStop(1, '#b82538');
    ctx.fillStyle = carpetGrad;
    ctx.fillRect(carpetX, 0, carpetW, H);
    // Double woven golden royal trim borders along the red carpet
    ctx.fillStyle = '#facc15';
    ctx.fillRect(carpetX + 10, 0, 9, H);
    ctx.fillRect(carpetX + carpetW - 19, 0, 9, H);
    ctx.fillStyle = '#fffbeb';
    ctx.fillRect(carpetX + 12, 0, 3, H);
    ctx.fillRect(carpetX + carpetW - 17, 0, 3, H);
  }

  // 3. Raised 2D Hand-Painted Border Curb Trim Stones along Left (0..54) & Right (W-54..W)
  const trimRows = 22;
  const trimH = H / trimRows;
  const trimTopHex = `#${lightCol.clone().offsetHSL(0, 0.02, 0.06).getHexString()}`;
  const trimBotHex = `#${baseCol.clone().offsetHSL(0, 0.04, -0.08).getHexString()}`;
  for (let i = 0; i < trimRows; i++) {
    const ty = i * trimH;
    for (const tx of [3, W - 53]) {
      ctx.fillStyle = '#43240f';
      drawRoundedBlock(ctx, tx - 1, ty + 1, 52, trimH - 3, 8);
      ctx.fill();

      const trimGrad = ctx.createLinearGradient(tx, ty, tx + 50, ty + trimH);
      trimGrad.addColorStop(0, trimTopHex);
      trimGrad.addColorStop(0.65, theme.roadPlateHex);
      trimGrad.addColorStop(1, trimBotHex);
      ctx.fillStyle = trimGrad;
      drawRoundedBlock(ctx, tx + 1, ty + 2.5, 48, trimH - 6.5, 6.5);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 252, 242, 0.75)';
      ctx.lineWidth = 2.4;
      ctx.strokeRect(tx + 3.5, ty + 5, 43, trimH - 12);
    }
  }

  // 4. Warm Golden Sunlight Center Glow & Warm Caramel Curb Drop Shadow Bands
  const leftShadow = ctx.createLinearGradient(54, 0, 128, 0);
  leftShadow.addColorStop(0, 'rgba(96, 54, 20, 0.32)');
  leftShadow.addColorStop(1, 'rgba(96, 54, 20, 0)');
  ctx.fillStyle = leftShadow;
  ctx.fillRect(54, 0, 74, H);

  const rightShadow = ctx.createLinearGradient(W - 54, 0, W - 128, 0);
  rightShadow.addColorStop(0, 'rgba(96, 54, 20, 0.32)');
  rightShadow.addColorStop(1, 'rgba(96, 54, 20, 0)');
  ctx.fillStyle = rightShadow;
  ctx.fillRect(W - 128, 0, 74, H);

  // 5. 2D Cartoon Painted Forward Double-Chevrons down the Central Avenue (pointing toward Factory Fortress)
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 2; i < rows - 2; i += 3) {
    const cy = i * rowH + rowH * 0.5;
    const cx = W * 0.5;

    // Warm tan cartoon outline under chevron
    ctx.globalAlpha = 0.36;
    ctx.strokeStyle = '#7c4a1e';
    ctx.lineWidth = 16;
    for (const dy of [0, 26]) {
      const span = dy === 0 ? 44 : 34;
      ctx.beginPath();
      ctx.moveTo(cx - span, cy + 20 + dy);
      ctx.lineTo(cx, cy - 16 + dy);
      ctx.lineTo(cx + span, cy + 20 + dy);
      ctx.stroke();
    }

    // Creamy-white painted chevron fill
    ctx.globalAlpha = 0.62;
    ctx.strokeStyle = '#fff9eb';
    ctx.lineWidth = 10;
    for (const dy of [0, 26]) {
      const span = dy === 0 ? 44 : 34;
      ctx.beginPath();
      ctx.moveTo(cx - span, cy + 20 + dy);
      ctx.lineTo(cx, cy - 16 + dy);
      ctx.lineTo(cx + span, cy + 20 + dy);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1.0;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Generates an emissive map for the sunlit stone bridge (kept near-black so natural PBR sunlight & shadows shine cleanly).
 */
export function createThemedRoadEmissiveTexture(_theme: ThemeConfig): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 256, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Generates a Tangent-Space Normal Map (#8080ff base) matching the 6x28 staggered sandstone cobblestone grid
 * so warm directional sunlight catches every rounded paver bevel and mortar groove.
 */
export function createRoadNormalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const W = 512;
  const H = 1024;

  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, W, H);

  const deckLeft = 28;
  const deckW = W - 56;
  const rows = 28;
  const rowH = H / rows;
  const cols = 6;
  const stoneW = deckW / cols;

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const stagger = r % 2 === 1 ? stoneW * 0.5 : 0;

    // Horizontal mortar bevels (+Y / -Y)
    ctx.fillStyle = 'rgb(128, 178, 240)';
    ctx.fillRect(deckLeft, y + 2, deckW, 2.5);
    ctx.fillStyle = 'rgb(128, 80, 240)';
    ctx.fillRect(deckLeft, y + rowH - 3.5, deckW, 2.5);

    // Vertical staggered stone joint bevels (+X / -X)
    for (let c = 0; c <= cols; c++) {
      const jx = deckLeft + c * stoneW + stagger;
      if (jx > deckLeft + 4 && jx < deckLeft + deckW - 4) {
        ctx.fillStyle = 'rgb(84, 128, 242)';
        ctx.fillRect(jx - 3, y + 2, 2.2, rowH - 4);
        ctx.fillStyle = 'rgb(174, 128, 242)';
        ctx.fillRect(jx + 1, y + 2, 2.2, rowH - 4);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Generates a procedural roughness/bump map for the sandstone cobblestone road deck.
 */
export function createRoadBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const W = 512;
  const H = 1024;

  // Matte travertine stone surface (#a6a6a6) with deeper rough mortar grooves (#e2e2e2)
  ctx.fillStyle = '#a4a4a4';
  ctx.fillRect(0, 0, W, H);

  const deckLeft = 28;
  const deckW = W - 56;
  const rows = 28;
  const rowH = H / rows;
  const cols = 6;
  const stoneW = deckW / cols;

  ctx.fillStyle = '#dcdcdc';
  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const stagger = r % 2 === 1 ? stoneW * 0.5 : 0;
    ctx.fillRect(deckLeft, y, deckW, 3);
    for (let c = 0; c <= cols; c++) {
      const jx = deckLeft + c * stoneW + stagger;
      if (jx > deckLeft + 3 && jx < deckLeft + deckW - 3) {
        ctx.fillRect(jx - 1.5, y, 3, rowH);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Generates a soft warm sunlit cloud-mist texture beneath the viaduct bridge.
 */
export function createAbyssFloorTexture(theme: ThemeConfig): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = theme.abyssBaseHex;
  ctx.fillRect(0, 0, 1024, 1024);

  for (let c = 0; c < 18; c++) {
    const cx = (c * 173 + 60) % 1024;
    const cy = (c * 289 + 40) % 1024;
    const r = 160 + (c % 4) * 75;
    const radGrad = ctx.createRadialGradient(cx, cy, 12, cx, cy, r);
    radGrad.addColorStop(0, theme.abyssVeinHex);
    radGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = radGrad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1.0;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

/**
 * Generates a 2D Hand-Painted Draped Cloth Banner texture for Multiplier Gates (+2, -2, x2, x3)
 * suspended between turned polished-brass finial posts!
 * Supports baking the cartoon number (`+2`, `-2`, `×2`, `×3`) directly into the cloth canvas!
 */
export function createGateForcefieldTexture(
  style: 'blue' | 'gold' | 'mega' | 'hazard',
  labelText?: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const W = 512;
  const H = 256;

  // Supercell Neon Portal Forcefield Palette (Matches Style 2 3D Asset Sheet!)
  let topCol = '#47f3ff';
  let midCol = '#0ea5e9';
  let botCol = '#0369a1';
  let rimGlowCol = '#a5f3fc';
  let textStrokeCol = '#082f49';

  if (style === 'gold') {
    topCol = '#fef08a';
    midCol = '#f59e0b';
    botCol = '#b45309';
    rimGlowCol = '#fef9c3';
    textStrokeCol = '#451a03';
  } else if (style === 'mega') {
    topCol = '#f5d0fe';
    midCol = '#d946ef';
    botCol = '#86198f';
    rimGlowCol = '#fae8ff';
    textStrokeCol = '#3b0764';
  } else if (style === 'hazard') {
    topCol = '#fecdd3';
    midCol = '#f43f5e';
    botCol = '#9f1239';
    rimGlowCol = '#ffe4e6';
    textStrokeCol = '#4c0519';
  }

  ctx.clearRect(0, 0, W, H);

  const tracePortalArchPath = () => {
    ctx.beginPath();
    ctx.moveTo(8, 22);
    ctx.quadraticCurveTo(W * 0.5, 4, W - 8, 22);
    ctx.lineTo(W - 8, H - 10);
    ctx.quadraticCurveTo(W * 0.5, H - 4, 8, H - 10);
    ctx.closePath();
  };

  ctx.save();
  tracePortalArchPath();
  ctx.clip();

  // 1. Vibrant Supercell Glowing Neon Energy Field Gradient
  const grad = ctx.createLinearGradient(0, 6, 0, H - 6);
  grad.addColorStop(0, topCol);
  grad.addColorStop(0.48, midCol);
  grad.addColorStop(1, botCol);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 2. Radial Center Portal Core Bloom
  const coreGrad = ctx.createRadialGradient(W * 0.5, H * 0.5, 16, W * 0.5, H * 0.5, W * 0.45);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.36)');
  coreGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.10)');
  coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = coreGrad;
  ctx.fillRect(0, 0, W, H);

  // 3. Bold Diagonal Supercell Glossy Light Streaks
  ctx.fillStyle = 'rgba(255, 255, 255, 0.26)';
  ctx.beginPath();
  ctx.moveTo(58, 0);
  ctx.lineTo(152, 0);
  ctx.lineTo(88, H);
  ctx.lineTo(10, H);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.moveTo(188, 0);
  ctx.lineTo(232, 0);
  ctx.lineTo(172, H);
  ctx.lineTo(132, H);
  ctx.closePath();
  ctx.fill();

  // 4. Inner Neon Energy Conduit Border Ring
  ctx.strokeStyle = rimGlowCol;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(20, 30);
  ctx.quadraticCurveTo(W * 0.5, 14, W - 20, 30);
  ctx.lineTo(W - 20, H - 20);
  ctx.quadraticCurveTo(W * 0.5, H - 14, 20, H - 20);
  ctx.closePath();
  ctx.stroke();

  // 5. Left & right Golden-Brass Energy Emitter Rivets
  for (const gx of [26, W - 26]) {
    for (const gy of [42, H - 38]) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(gx, gy, 10.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(gx, gy, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(gx - 2, gy - 2, 3.0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 6. Baked 3D Extruded Supercell Number Typography (+4, ×3, -2)
  if (labelText) {
    ctx.save();
    ctx.font = '900 138px "Fredoka", "Nunito", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const cx = W * 0.5;
    const cy = H * 0.5 + 4;

    // Deep 3D block extrusion shadow
    ctx.fillStyle = textStrokeCol;
    ctx.fillText(labelText, cx, cy + 10);
    ctx.strokeStyle = textStrokeCol;
    ctx.lineWidth = 20;
    ctx.strokeText(labelText, cx, cy + 6);

    // Crisp dark outline
    ctx.strokeStyle = textStrokeCol;
    ctx.lineWidth = 18;
    ctx.strokeText(labelText, cx, cy);

    // Pure white glossy face with top highlight
    const textGrad = ctx.createLinearGradient(0, cy - 55, 0, cy + 55);
    textGrad.addColorStop(0, '#ffffff');
    textGrad.addColorStop(0.65, '#f8fafc');
    textGrad.addColorStop(1, rimGlowCol);
    ctx.fillStyle = textGrad;
    ctx.fillText(labelText, cx, cy);
    ctx.restore();
  }

  ctx.restore();

  // 7. Bold Supercell Dark-Navy Ink Outline around the Portal Field
  ctx.save();
  tracePortalArchPath();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Creates a warm industrial hangar depth shader for the Factory Fortress doorway arch.
 */
export function createBossPortalShaderMaterial(coreHex: number, ringHex: number): THREE.ShaderMaterial {
  const cCore = new THREE.Color(coreHex);
  const cRing = new THREE.Color(ringHex);
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCoreColor: { value: cCore },
      uRingColor: { value: cRing },
    },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uCoreColor;
      uniform vec3 uRingColor;
      varying vec2 vUv;

      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float pulse = 0.5 + 0.5 * sin(uTime * 2.4 - r * 4.0);
        vec3 col = mix(uCoreColor * 0.55, uCoreColor + uRingColor * 0.28, smoothstep(0.95, 0.1, r) * (0.65 + 0.35 * pulse));
        float alpha = smoothstep(1.05, 0.35, r) * 0.92;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

/**
 * Creates a soft sunlit drifting cloud-and-steam valley mist ShaderMaterial beneath the viaduct bridge.
 */
export function createAbyssalSeaShaderMaterial(theme: ThemeConfig): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBaseColor: { value: new THREE.Color(theme.abyssBaseHex) },
      uVeinColor: { value: new THREE.Color(theme.abyssVeinHex) },
      uAccentColor: { value: new THREE.Color(theme.portalRingColor) },
    },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uBaseColor;
      uniform vec3 uVeinColor;
      uniform vec3 uAccentColor;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      float hash21(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }

      float noise2D(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        vec2 p = vWorldPos.xz * 0.055;
        float n1 = noise2D(p + vec2(uTime * 0.06, uTime * 0.04));
        float n2 = noise2D(p * 1.9 - vec2(uTime * 0.05, -uTime * 0.03));
        float cloud = smoothstep(0.32, 0.85, n1 * 0.62 + n2 * 0.38);

        vec3 col = mix(uBaseColor, uVeinColor, cloud * 0.85);
        col += uAccentColor * pow(cloud, 3.0) * 0.08;

        float distFade = smoothstep(82.0, 18.0, length(vWorldPos.xz));
        gl_FragColor = vec4(col, distFade * 0.92);
      }
    `,
  });
}

/**
 * Creates a soft white steam-cascade ShaderMaterial for factory vent plumes.
 */
export function createEnergyWaterfallShaderMaterial(colorHex: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(colorHex) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;

      void main() {
        float xMask = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
        float yMask = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
        float puff = sin(vUv.y * 14.0 - uTime * 3.5 + sin(vUv.x * 10.0)) * 0.5 + 0.5;
        vec3 col = mix(uColor, vec3(1.0, 0.99, 0.96), 0.72);
        gl_FragColor = vec4(col, (0.28 + puff * 0.32) * xMask * yMask);
      }
    `,
  });
}

/**
 * Creates a gentle warm golden-sky shimmer ribbon for the Bubble Station defense line.
 */
export function createBastionShieldShaderMaterial(colorHex: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(colorHex) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;

      void main() {
        float wave = sin(vUv.x * 24.0 - uTime * 3.0) * 0.5 + 0.5;
        float rail = smoothstep(0.25, 0.0, vUv.y) + smoothstep(0.75, 1.0, vUv.y);
        float alpha = (rail * 0.45 + 0.12) * (0.75 + wave * 0.25);
        vec3 col = mix(uColor, vec3(1.0, 0.98, 0.92), 0.38);
        gl_FragColor = vec4(col, alpha * 0.42);
      }
    `,
  });
}

/**
 * Generates a 2D Hand-Painted Fluffy Cumulus Steam Cloud Billboard Texture
 * with warm dark-brown cartoon ink outlines (#482812), creamy-white sunlit crown,
 * and soft peach-lavender lower belly shading (matching the 2D clouds in the reference screenshot!).
 */
let cachedCloudPuffTex: THREE.CanvasTexture | null = null;
export function create2DCloudPuffTexture(): THREE.CanvasTexture {
  if (cachedCloudPuffTex) return cachedCloudPuffTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  const lobes: Array<[number, number, number]> = [
    [128, 126, 62],
    [76, 138, 46],
    [180, 138, 46],
    [102, 92, 50],
    [154, 94, 48],
    [54, 152, 32],
    [202, 152, 32],
  ];

  // 1. 2D Cartoon Dark-Brown Outer Ink Outline (#4a2a14)
  ctx.fillStyle = '#4a2a14';
  for (const [cx, cy, r] of lobes) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Warm Peach-Tan Lower Belly Shadow Layer (#edd8c4)
  ctx.fillStyle = '#edd8c4';
  for (const [cx, cy, r] of lobes) {
    ctx.beginPath();
    ctx.arc(cx, cy + 2, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Creamy-White Sunlit Upper Crown Layer (#fffdf7)
  const topGrad = ctx.createLinearGradient(0, 40, 0, 185);
  topGrad.addColorStop(0, '#ffffff');
  topGrad.addColorStop(0.68, '#fffaf0');
  topGrad.addColorStop(1, '#f3e1ce');
  ctx.fillStyle = topGrad;
  for (const [cx, cy, r] of lobes) {
    ctx.beginPath();
    ctx.arc(cx - 1.5, cy - 5, r * 0.92, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Crisp 2D Hand-Painted Internal Scallop Highlight Arcs
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  for (const [cx, cy, r] of [
    [102, 92, 38],
    [154, 94, 36],
    [76, 138, 34],
  ] as const) {
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 4, r, Math.PI * 1.1, Math.PI * 1.82);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedCloudPuffTex = tex;
  return tex;
}

/**
 * Generates a 2D Hand-Painted Glossy Black Amoeba Oil Spill Puddle Texture
 * with wavy organic lobes, satellite splatters, warm tan rim, and crisp white 2D liquid highlight arcs!
 */
let cachedOilSpillTex: THREE.CanvasTexture | null = null;
export function create2DOilSpillTexture(): THREE.CanvasTexture {
  if (cachedOilSpillTex) return cachedOilSpillTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 512);

  const lobes: Array<[number, number, number, number, number]> = [
    [256, 256, 152, 128, 0.12],
    [154, 214, 96, 78, -0.25],
    [352, 226, 92, 82, 0.3],
    [182, 326, 88, 72, 0.2],
    [336, 318, 94, 74, -0.18],
    [258, 156, 78, 62, 0.05],
  ];
  const drops: Array<[number, number, number]> = [
    [68, 172, 22],
    [438, 184, 25],
    [82, 336, 19],
    [428, 344, 21],
    [244, 424, 18],
    [142, 108, 15],
    [378, 114, 16],
  ];

  // 1. Warm Tan Outer Rim Stain (#7a502c)
  ctx.fillStyle = 'rgba(92, 56, 28, 0.68)';
  for (const [x, y, rx, ry, rot] of lobes) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx + 7, ry + 7, rot, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [x, y, r] of drops) {
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Pitch-Dark Espresso Oil Body (#1b1412)
  ctx.fillStyle = '#1b1412';
  for (const [x, y, rx, ry, rot] of lobes) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [x, y, r] of drops) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Inner Deep Warm Gloss Sheen (#2d221e)
  ctx.fillStyle = '#2d221e';
  for (const [x, y, rx, ry, rot] of lobes) {
    ctx.beginPath();
    ctx.ellipse(x - 6, y - 6, rx * 0.76, ry * 0.72, rot, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Crisp 2D Cartoon Curved White Specular Highlight Arcs & Dots
  ctx.strokeStyle = 'rgba(255, 252, 245, 0.88)';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.arc(172, 206, 56, Math.PI * 1.08, Math.PI * 1.56);
  ctx.stroke();

  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.arc(328, 218, 52, Math.PI * 1.18, Math.PI * 1.62);
  ctx.stroke();

  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.arc(196, 318, 46, Math.PI * 0.68, Math.PI * 1.05);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 252, 245, 0.92)';
  for (const [hx, hy, hr] of [
    [232, 166, 6.5],
    [364, 294, 5.5],
    [64, 166, 4.5],
    [432, 178, 5.0],
  ] as const) {
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedOilSpillTex = tex;
  return tex;
}

/**
 * Generates a 2D Crisp-Soft Dark-Brown Oval Contact Shadow Texture for grounding units & props on the bridge.
 */
let cachedBlobShadowTex: THREE.CanvasTexture | null = null;
export function create2DBlobShadowTexture(): THREE.CanvasTexture {
  if (cachedBlobShadowTex) return cachedBlobShadowTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);

  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 56);
  grad.addColorStop(0, 'rgba(52, 26, 10, 0.62)');
  grad.addColorStop(0.62, 'rgba(58, 30, 12, 0.46)');
  grad.addColorStop(0.86, 'rgba(68, 36, 14, 0.18)');
  grad.addColorStop(1, 'rgba(68, 36, 14, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  cachedBlobShadowTex = tex;
  return tex;
}

/**
 * Generates a High-Resolution 1024x1024 2D Thick-Painted Anime Illustration Texture
 * of the Chibi Pink-Twintail Idol Cheerleader Mascot (matching the bottom-left character in the reference screenshot!).
 * Features:
 * - Crisp dark-espresso (#381b0e) 2D anime linework
 * - Flowing sakura-pink twintails with bright hair gloss & golden hair cuffs
 * - Black & gold DJ headphones
 * - Cheerful winking & smiling anime face with rosy blush cheeks
 * - Pink-and-white frilly idol dress with golden star brooch
 * - Cute white bunny-blob backpack with red/white cheering flag
 * - Waving left hand & right hand holding a brass megaphone with red grip!
 */
let cachedCheerleaderTex: THREE.CanvasTexture | null = null;
export function create2DCheerleaderIllustrationTexture(): THREE.CanvasTexture {
  if (cachedCheerleaderTex) return cachedCheerleaderTex;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 1024, 1024);

  const ink = '#381b0e';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const fillAndStroke = (fill: string | CanvasGradient, lw = 12) => {
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.stroke();
  };

  // --- 1. Back Cheering Flag & Cute White Bunny-Blob Backpack (upper-left behind shoulder) ---
  ctx.save();
  // Flag pole
  ctx.beginPath();
  ctx.moveTo(310, 560);
  ctx.lineTo(190, 210);
  ctx.strokeStyle = '#d89e32';
  ctx.lineWidth = 22;
  ctx.stroke();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 8;
  ctx.stroke();

  // Red & Cream Pennant Flag
  ctx.beginPath();
  ctx.moveTo(198, 224);
  ctx.lineTo(74, 278);
  ctx.lineTo(228, 344);
  ctx.closePath();
  fillAndStroke('#f25565', 11);

  // Cute White Bunny-Blob Backpack sitting on her back-left
  ctx.beginPath();
  ctx.ellipse(264, 548, 86, 76, -0.22, 0, Math.PI * 2);
  fillAndStroke('#fffdf9', 12);
  // Backpack cute dot eyes & blush
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(232, 540, 8, 0, Math.PI * 2);
  ctx.arc(272, 532, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff85a2';
  ctx.beginPath();
  ctx.ellipse(216, 554, 12, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(288, 544, 12, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- 2. Flowing Sakura-Pink Twintails (Left & Right) with Hair Gloss ---
  const drawTwintail = (dir: -1 | 1) => {
    ctx.save();
    const bx = 512 + dir * 210;
    const by = 370;
    const hairGrad = ctx.createLinearGradient(bx, by - 40, bx + dir * 160, by + 390);
    hairGrad.addColorStop(0, '#ffb3c9');
    hairGrad.addColorStop(0.55, '#ff80a6');
    hairGrad.addColorStop(1, '#e85282');

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.bezierCurveTo(
      bx + dir * 155,
      by + 20,
      bx + dir * 215,
      by + 230,
      bx + dir * 110,
      by + 380
    );
    ctx.bezierCurveTo(
      bx + dir * 55,
      by + 355,
      bx + dir * 75,
      by + 250,
      bx + dir * 28,
      by + 330
    );
    ctx.bezierCurveTo(
      bx - dir * 25,
      by + 220,
      bx - dir * 10,
      by + 95,
      bx,
      by
    );
    ctx.closePath();
    fillAndStroke(hairGrad, 13);

    // Golden-Brass & Pink Hair Tie Cuff
    ctx.beginPath();
    ctx.ellipse(bx - dir * 6, by + 12, 34, 22, dir * 0.45, 0, Math.PI * 2);
    fillAndStroke('#f6bd38', 11);
    ctx.restore();
  };
  drawTwintail(-1);
  drawTwintail(1);

  // --- 3. Chibi Boots & Stockings ---
  for (const side of [-1, 1] as const) {
    const lx = 512 + side * 78;
    // White stocking leg
    ctx.beginPath();
    ctx.roundRect(lx - 34, 740, 68, 155, 30);
    fillAndStroke('#fff9f5', 12);

    // Pink & Brown Idol Ankle Boot
    ctx.beginPath();
    ctx.ellipse(lx + side * 8, 902, 52, 36, 0, 0, Math.PI * 2);
    fillAndStroke('#5a2d1c', 12);

    ctx.beginPath();
    ctx.ellipse(lx + side * 6, 892, 42, 26, 0, 0, Math.PI * 2);
    fillAndStroke('#ff7aa2', 10);
  }

  // --- 4. Frilly White & Sakura-Pink Idol Dress & Pleated Skirt ---
  // Outer white ruffle petticoat
  ctx.beginPath();
  ctx.moveTo(395, 620);
  ctx.lineTo(629, 620);
  ctx.quadraticCurveTo(695, 765, 665, 792);
  ctx.quadraticCurveTo(512, 828, 359, 792);
  ctx.quadraticCurveTo(329, 765, 395, 620);
  ctx.closePath();
  fillAndStroke('#fffdf9', 12);

  // Main Sakura-Pink Idol Skirt + Bodice
  const dressGrad = ctx.createLinearGradient(512, 520, 512, 760);
  dressGrad.addColorStop(0, '#ff9ebb');
  dressGrad.addColorStop(0.6, '#ff6e99');
  dressGrad.addColorStop(1, '#e44b7b');
  ctx.beginPath();
  ctx.moveTo(426, 520);
  ctx.lineTo(598, 520);
  ctx.quadraticCurveTo(662, 695, 642, 748);
  ctx.quadraticCurveTo(512, 782, 382, 748);
  ctx.quadraticCurveTo(362, 695, 426, 520);
  ctx.closePath();
  fillAndStroke(dressGrad, 13);

  // Skirt vertical pleat lines
  ctx.strokeStyle = ink;
  ctx.lineWidth = 8;
  for (const px of [456, 512, 568]) {
    ctx.beginPath();
    ctx.moveTo(px, 635);
    ctx.lineTo(px + (px - 512) * 0.25, 752);
    ctx.stroke();
  }

  // White Sailor/Idol Collar & Golden Star Ribbon Brooch
  ctx.beginPath();
  ctx.moveTo(432, 528);
  ctx.lineTo(512, 608);
  ctx.lineTo(592, 528);
  ctx.closePath();
  fillAndStroke('#ffffff', 11);

  // Pink chest bow + Golden Star Center
  ctx.beginPath();
  ctx.ellipse(476, 586, 32, 18, -0.3, 0, Math.PI * 2);
  ctx.ellipse(548, 586, 32, 18, 0.3, 0, Math.PI * 2);
  fillAndStroke('#ff4f82', 10);
  ctx.beginPath();
  ctx.arc(512, 586, 18, 0, Math.PI * 2);
  fillAndStroke('#ffd43b', 10);

  // --- 5. Left Arm Raised Waving Cheerfully ---
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(428, 556);
  ctx.quadraticCurveTo(335, 518, 304, 446);
  ctx.quadraticCurveTo(286, 412, 324, 398);
  ctx.quadraticCurveTo(362, 392, 376, 434);
  ctx.quadraticCurveTo(398, 492, 446, 532);
  ctx.closePath();
  fillAndStroke('#ffe6d4', 12);
  // Pink sleeve cuff
  ctx.beginPath();
  ctx.ellipse(412, 540, 34, 24, -0.5, 0, Math.PI * 2);
  fillAndStroke('#ff7aa2', 11);
  ctx.restore();

  // --- 6. Right Arm Holding Golden-Brass Megaphone with Red Handle ---
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(594, 552);
  ctx.quadraticCurveTo(668, 542, 708, 494);
  ctx.quadraticCurveTo(732, 466, 702, 442);
  ctx.quadraticCurveTo(672, 432, 646, 474);
  ctx.quadraticCurveTo(618, 512, 578, 534);
  ctx.closePath();
  fillAndStroke('#ffe6d4', 12);

  // Megaphone Red Handle
  ctx.beginPath();
  ctx.roundRect(692, 464, 34, 78, 12);
  fillAndStroke('#e04836', 11);

  // Megaphone Golden-Brass Cone flaring right-upward!
  const megaGrad = ctx.createLinearGradient(680, 360, 890, 520);
  megaGrad.addColorStop(0, '#fff0a6');
  megaGrad.addColorStop(0.45, '#f5b82e');
  megaGrad.addColorStop(1, '#c87d14');
  ctx.beginPath();
  ctx.moveTo(674, 448);
  ctx.lineTo(876, 344);
  ctx.lineTo(906, 504);
  ctx.lineTo(686, 488);
  ctx.closePath();
  fillAndStroke(megaGrad, 13);

  // Megaphone mouth dark interior & cream rim
  ctx.beginPath();
  ctx.ellipse(891, 424, 26, 80, -0.18, 0, Math.PI * 2);
  fillAndStroke('#5a2614', 12);
  ctx.restore();

  // --- 7. Large Chibi Anime Head, Sakura Hair Bangs, Headphones & Expressive Face ---
  // Back hair dome
  ctx.beginPath();
  ctx.arc(512, 348, 198, 0, Math.PI * 2);
  fillAndStroke('#ff85a8', 13);

  // Black & Gold Headphone Band arching over head
  ctx.beginPath();
  ctx.arc(512, 342, 214, Math.PI * 1.08, Math.PI * 1.92);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 34;
  ctx.stroke();
  ctx.strokeStyle = '#3b3f4a';
  ctx.lineWidth = 18;
  ctx.stroke();

  // Warm Peach Chibi Face Contour
  const skinGrad = ctx.createLinearGradient(512, 210, 512, 525);
  skinGrad.addColorStop(0, '#fff3e8');
  skinGrad.addColorStop(0.75, '#ffe3ce');
  skinGrad.addColorStop(1, '#f7c5a8');
  ctx.beginPath();
  ctx.ellipse(512, 378, 168, 152, 0, 0, Math.PI * 2);
  fillAndStroke(skinGrad, 13);

  // Left Eye: Cheerful Anime Wink Curve ( > or ^ )
  ctx.strokeStyle = ink;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(404, 368);
  ctx.quadraticCurveTo(442, 336, 474, 374);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(408, 352);
  ctx.lineTo(392, 340);
  ctx.stroke();

  // Right Eye: Big Sparkling Rose-Amber Anime Eye with Double White Catchlights!
  ctx.beginPath();
  ctx.ellipse(584, 368, 36, 44, 0, 0, Math.PI * 2);
  fillAndStroke('#ffffff', 11);

  const irisGrad = ctx.createLinearGradient(584, 330, 584, 408);
  irisGrad.addColorStop(0, '#6b233b');
  irisGrad.addColorStop(0.55, '#d94876');
  irisGrad.addColorStop(1, '#ff9eb8');
  ctx.fillStyle = irisGrad;
  ctx.beginPath();
  ctx.ellipse(582, 370, 25, 33, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pupil + Sparkling white catchlights
  ctx.fillStyle = '#2d101c';
  ctx.beginPath();
  ctx.arc(582, 372, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(570, 352, 11, 0, Math.PI * 2);
  ctx.arc(594, 386, 6, 0, Math.PI * 2);
  ctx.fill();

  // Rosy Blush Cheeks with cute anime slash marks
  ctx.fillStyle = 'rgba(255, 110, 145, 0.55)';
  ctx.beginPath();
  ctx.ellipse(412, 412, 32, 18, 0, 0, Math.PI * 2);
  ctx.ellipse(614, 412, 32, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Happy Open Singing Anime Mouth ("D" shape)
  ctx.beginPath();
  ctx.moveTo(484, 422);
  ctx.quadraticCurveTo(512, 416, 540, 422);
  ctx.quadraticCurveTo(538, 476, 512, 476);
  ctx.quadraticCurveTo(486, 476, 484, 422);
  ctx.closePath();
  fillAndStroke('#a82846', 10);
  // Pink tongue inside mouth
  ctx.fillStyle = '#ff7a98';
  ctx.beginPath();
  ctx.arc(512, 456, 18, 0, Math.PI);
  ctx.fill();

  // Voluminous Sakura-Pink Front Hair Bangs & Side Locks
  const bangGrad = ctx.createLinearGradient(512, 155, 512, 360);
  bangGrad.addColorStop(0, '#ffc2d4');
  bangGrad.addColorStop(0.55, '#ff88ad');
  bangGrad.addColorStop(1, '#ef5b8a');
  ctx.beginPath();
  ctx.moveTo(334, 356);
  ctx.quadraticCurveTo(336, 178, 512, 168);
  ctx.quadraticCurveTo(688, 178, 690, 356);
  // Scalloped anime front bangs
  ctx.quadraticCurveTo(650, 290, 622, 346);
  ctx.quadraticCurveTo(582, 268, 538, 338);
  ctx.quadraticCurveTo(502, 265, 466, 338);
  ctx.quadraticCurveTo(418, 272, 384, 346);
  ctx.quadraticCurveTo(358, 298, 334, 356);
  ctx.closePath();
  fillAndStroke(bangGrad, 13);

  // Bright 2D White/Pale-Pink Anime Hair Gloss Highlight Ribbon across bangs
  ctx.fillStyle = 'rgba(255, 250, 252, 0.78)';
  ctx.beginPath();
  ctx.ellipse(462, 236, 44, 15, -0.22, 0, Math.PI * 2);
  ctx.ellipse(564, 238, 38, 14, 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Cute Top Ahoge Hair Curl
  ctx.beginPath();
  ctx.moveTo(504, 172);
  ctx.quadraticCurveTo(476, 102, 548, 114);
  ctx.quadraticCurveTo(516, 138, 526, 172);
  ctx.closePath();
  fillAndStroke('#ff9ebb', 11);

  // Left & Right DJ Ear Cups (Charcoal & Golden-Brass)
  for (const side of [-1, 1] as const) {
    const ex = 512 + side * 184;
    ctx.beginPath();
    ctx.ellipse(ex, 372, 30, 52, side * 0.12, 0, Math.PI * 2);
    fillAndStroke('#353944', 12);

    ctx.beginPath();
    ctx.ellipse(ex + side * 6, 372, 16, 34, side * 0.12, 0, Math.PI * 2);
    fillAndStroke('#f6bd38', 9);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedCheerleaderTex = tex;
  return tex;
}

/**
 * Injects a 2D Cel-Toon / Painterly Illustration Shader Hook into any Three.js MeshStandardMaterial
 * so architectural props (red-brick factory walls, brass steam pipes, sandstone curbs, copper boilers, cannon)
 * render with warm 2D stepped cel-shading, warm caramel shadows, and crisp 2D dark-brown (#381c0c) cartoon outlines!
 */
export function stylizeMaterialAs2DIllustration(
  mat: THREE.MeshStandardMaterial,
  _outlineStrength = 0.85
): THREE.MeshStandardMaterial {
  // Supercell 3D Glossy Toy-Box & Brushed-Gold PBR Material Enhancement
  mat.roughness = Math.max(0.24, Math.min(0.48, mat.roughness * 0.78));
  mat.metalness = Math.max(0.14, mat.metalness);
  mat.needsUpdate = true;
  return mat;
}
