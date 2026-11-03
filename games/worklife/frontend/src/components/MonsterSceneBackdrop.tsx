import React from "react";

export interface MonsterSceneBackdropProps {
  monsterId: string;
  mapId?: string;
  isBoss?: boolean;
  variant?: "card" | "modal" | "avatar";
}

interface ScenePalette {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  horizonGlow: string;
  rayColor: string;
  distantFill: string;
  midFill: string;
  foreFill: string;
  groundTop: string;
  groundSide: string;
  groundRim: string;
  accent: string;
  accentSecondary: string;
  particle: string;
}

const FOREST_MONSTER_PALETTES: Record<string, Partial<ScenePalette>> = {
  slime: {
    skyTop: "#0f291e",
    skyMid: "#1b4d35",
    skyBottom: "#2d6e48",
    horizonGlow: "#6ee7b7",
    rayColor: "#a7f3d0",
    groundTop: "#254d32",
    groundRim: "#4ade80",
    accent: "#34d399",
    accentSecondary: "#6ee7b7",
    particle: "#bbf7d0",
  },
  caterpillar: {
    skyTop: "#1a2e12",
    skyMid: "#2d4c1e",
    skyBottom: "#426b29",
    horizonGlow: "#bef264",
    rayColor: "#d9f99d",
    groundTop: "#365314",
    groundRim: "#84cc16",
    accent: "#a3e635",
    accentSecondary: "#fde047",
    particle: "#fef08a",
  },
  monkey: {
    skyTop: "#271c10",
    skyMid: "#47331b",
    skyBottom: "#694b26",
    horizonGlow: "#fbbf24",
    rayColor: "#fde68a",
    distantFill: "#2a1f14",
    midFill: "#1e160e",
    groundTop: "#4d381e",
    groundRim: "#f59e0b",
    accent: "#fbbf24",
    accentSecondary: "#34d399",
    particle: "#fef3c7",
  },
  mushroom: {
    skyTop: "#13162b",
    skyMid: "#1e2749",
    skyBottom: "#2b3b5c",
    horizonGlow: "#38bdf8",
    rayColor: "#7dd3fc",
    distantFill: "#141d33",
    midFill: "#0f172a",
    groundTop: "#1e293b",
    groundRim: "#22d3ee",
    accent: "#c084fc",
    accentSecondary: "#22d3ee",
    particle: "#67e8f9",
  },
  bee: {
    skyTop: "#291d0c",
    skyMid: "#4d3715",
    skyBottom: "#71511e",
    horizonGlow: "#facc15",
    rayColor: "#fef08a",
    distantFill: "#2f2310",
    midFill: "#231a0b",
    groundTop: "#423315",
    groundRim: "#eab308",
    accent: "#facc15",
    accentSecondary: "#fb923c",
    particle: "#fef9c3",
  },
  crab: {
    skyTop: "#0d242c",
    skyMid: "#163e4b",
    skyBottom: "#215a69",
    horizonGlow: "#2dd4bf",
    rayColor: "#99f6e4",
    distantFill: "#0f2930",
    midFill: "#0b1f24",
    groundTop: "#1f4247",
    groundRim: "#2dd4bf",
    accent: "#38bdf8",
    accentSecondary: "#f59e0b",
    particle: "#a5f3fc",
  },
  forest_boss: {
    skyTop: "#240f12",
    skyMid: "#3f1b1a",
    skyBottom: "#5c2a1e",
    horizonGlow: "#f97316",
    rayColor: "#fdba74",
    distantFill: "#261210",
    midFill: "#1a0c0a",
    foreFill: "#120807",
    groundTop: "#3b2016",
    groundSide: "#1c0e09",
    groundRim: "#f59e0b",
    accent: "#ef4444",
    accentSecondary: "#fbbf24",
    particle: "#fde68a",
  },
};

const ZONE_BASE_PALETTES: Record<string, ScenePalette> = {
  forest: {
    skyTop: "#0f2419",
    skyMid: "#1b4330",
    skyBottom: "#2c6142",
    horizonGlow: "#6ee7b7",
    rayColor: "#a7f3d0",
    distantFill: "#132a1e",
    midFill: "#0c1d14",
    foreFill: "#07120c",
    groundTop: "#26462e",
    groundSide: "#112216",
    groundRim: "#4ade80",
    accent: "#34d399",
    accentSecondary: "#fbbf24",
    particle: "#bbf7d0",
  },
  mine: {
    skyTop: "#11131c",
    skyMid: "#1e2436",
    skyBottom: "#2b354f",
    horizonGlow: "#38bdf8",
    rayColor: "#7dd3fc",
    distantFill: "#171c2b",
    midFill: "#101420",
    foreFill: "#090c14",
    groundTop: "#283044",
    groundSide: "#141824",
    groundRim: "#38bdf8",
    accent: "#22d3ee",
    accentSecondary: "#f59e0b",
    particle: "#7dd3fc",
  },
  swamp: {
    skyTop: "#0e1c1a",
    skyMid: "#17332c",
    skyBottom: "#244b3d",
    horizonGlow: "#4ade80",
    rayColor: "#86efac",
    distantFill: "#11241f",
    midFill: "#0b1915",
    foreFill: "#06100d",
    groundTop: "#1d382c",
    groundSide: "#0d1c16",
    groundRim: "#a3e635",
    accent: "#4ade80",
    accentSecondary: "#c084fc",
    particle: "#bef264",
  },
  snow: {
    skyTop: "#0d1b2e",
    skyMid: "#193558",
    skyBottom: "#2b5582",
    horizonGlow: "#7dd3fc",
    rayColor: "#bae6fd",
    distantFill: "#162c4a",
    midFill: "#0f2038",
    foreFill: "#091526",
    groundTop: "#3b628a",
    groundSide: "#1e3652",
    groundRim: "#bae6fd",
    accent: "#38bdf8",
    accentSecondary: "#a7f3d0",
    particle: "#e0f2fe",
  },
  volcano: {
    skyTop: "#200b0b",
    skyMid: "#421512",
    skyBottom: "#6e2517",
    horizonGlow: "#fb923c",
    rayColor: "#fdba74",
    distantFill: "#290d0b",
    midFill: "#1c0807",
    foreFill: "#120504",
    groundTop: "#3b1712",
    groundSide: "#1f0a08",
    groundRim: "#f97316",
    accent: "#ef4444",
    accentSecondary: "#fbbf24",
    particle: "#fed7aa",
  },
  abyss: {
    skyTop: "#0e081c",
    skyMid: "#1f113b",
    skyBottom: "#351c61",
    horizonGlow: "#c084fc",
    rayColor: "#e9d5ff",
    distantFill: "#160b2b",
    midFill: "#0f071f",
    foreFill: "#080412",
    groundTop: "#271447",
    groundSide: "#130926",
    groundRim: "#a855f7",
    accent: "#c084fc",
    accentSecondary: "#38bdf8",
    particle: "#e9d5ff",
  },
  celestial: {
    skyTop: "#171c36",
    skyMid: "#2c3866",
    skyBottom: "#4e5b8f",
    horizonGlow: "#fde047",
    rayColor: "#fef08a",
    distantFill: "#232b52",
    midFill: "#192040",
    foreFill: "#10152b",
    groundTop: "#3e4875",
    groundSide: "#23294a",
    groundRim: "#fbbf24",
    accent: "#fde047",
    accentSecondary: "#60a5fa",
    particle: "#fef9c3",
  },
  rift: {
    skyTop: "#0f1026",
    skyMid: "#231d4f",
    skyBottom: "#3b2c7a",
    horizonGlow: "#ec4899",
    rayColor: "#f472b6",
    distantFill: "#1a143b",
    midFill: "#120d2b",
    foreFill: "#0a071a",
    groundTop: "#2f225c",
    groundSide: "#181033",
    groundRim: "#e879f9",
    accent: "#f472b6",
    accentSecondary: "#22d3ee",
    particle: "#f5d0fe",
  },
  inferno: {
    skyTop: "#260808",
    skyMid: "#52100e",
    skyBottom: "#851d14",
    horizonGlow: "#facc15",
    rayColor: "#fde047",
    distantFill: "#330a09",
    midFill: "#240606",
    foreFill: "#140303",
    groundTop: "#47120e",
    groundSide: "#260806",
    groundRim: "#ef4444",
    accent: "#f97316",
    accentSecondary: "#facc15",
    particle: "#fef08a",
  },
  genesis: {
    skyTop: "#0b2126",
    skyMid: "#164247",
    skyBottom: "#256966",
    horizonGlow: "#fde047",
    rayColor: "#fef08a",
    distantFill: "#102e33",
    midFill: "#0b2024",
    foreFill: "#061316",
    groundTop: "#1f524f",
    groundSide: "#0e2928",
    groundRim: "#34d399",
    accent: "#fbbf24",
    accentSecondary: "#2dd4bf",
    particle: "#fef9c3",
  },
  omega: {
    skyTop: "#090612",
    skyMid: "#19102e",
    skyBottom: "#2e1c52",
    horizonGlow: "#f59e0b",
    rayColor: "#fcd34d",
    distantFill: "#130c24",
    midFill: "#0c0717",
    foreFill: "#06030c",
    groundTop: "#241642",
    groundSide: "#120a24",
    groundRim: "#f59e0b",
    accent: "#fbbf24",
    accentSecondary: "#c084fc",
    particle: "#fde68a",
  },
};

function hashMonsterId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function inferZoneFromMonsterId(monsterId: string, mapId?: string): string {
  if (mapId && ZONE_BASE_PALETTES[mapId]) return mapId;
  const id = (monsterId || "").toLowerCase();
  for (const zone of Object.keys(ZONE_BASE_PALETTES)) {
    if (id.startsWith(`${zone}_`) || id.includes(`_${zone}`)) return zone;
  }
  if (["slime", "caterpillar", "monkey", "mushroom", "bee", "crab", "forest_boss"].includes(id)) {
    return "forest";
  }
  return "forest";
}

const ZONE_MIST_TINTS: Array<Partial<ScenePalette>> = [
  {},
  { horizonGlow: "#38bdf8", rayColor: "#bae6fd" },
  { horizonGlow: "#fbbf24", rayColor: "#fde68a" },
  { horizonGlow: "#a78bfa", rayColor: "#ddd6fe" },
  { horizonGlow: "#34d399", rayColor: "#a7f3d0" },
  { horizonGlow: "#fb7185", rayColor: "#fecdd3" },
];

export const MonsterSceneBackdrop: React.FC<MonsterSceneBackdropProps> = ({
  monsterId,
  mapId,
  isBoss = false,
  variant = "card",
}) => {
  const uid = React.useId().replace(/:/g, "");
  const zone = inferZoneFromMonsterId(monsterId, mapId);
  const seed = hashMonsterId(monsterId || "monster");
  const base = ZONE_BASE_PALETTES[zone] || ZONE_BASE_PALETTES.forest;
  const bespoke = FOREST_MONSTER_PALETTES[monsterId];
  const tint = !bespoke && !isBoss ? ZONE_MIST_TINTS[seed % ZONE_MIST_TINTS.length] : {};

  const p: ScenePalette = {
    ...base,
    ...tint,
    ...(bespoke || {}),
    ...(isBoss && !bespoke
      ? {
          horizonGlow: "#f97316",
          rayColor: "#fdba74",
          groundRim: "#f59e0b",
          accent: "#ef4444",
          accentSecondary: "#fbbf24",
        }
      : {}),
  };

  const rayShift = (seed % 36) - 18;
  const moonX = 64 + (seed % 192);
  const moonY = 44 + (seed % 28);

  return (
    <div className={`monster-scene-backdrop zone-${zone} variant-${variant}${isBoss ? " is-boss-scene" : ""}`} aria-hidden="true">
      <svg
        viewBox="0 0 320 260"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        className="monster-scene-svg"
      >
        <defs>
          <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.skyTop} />
            <stop offset="52%" stopColor={p.skyMid} />
            <stop offset="100%" stopColor={p.skyBottom} />
          </linearGradient>

          <radialGradient id={`glow-${uid}`} cx="50%" cy="46%" r="54%">
            <stop offset="0%" stopColor={p.horizonGlow} stopOpacity="0.46" />
            <stop offset="55%" stopColor={p.horizonGlow} stopOpacity="0.16" />
            <stop offset="100%" stopColor={p.horizonGlow} stopOpacity="0" />
          </radialGradient>

          <linearGradient id={`ray-${uid}`} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor={p.rayColor} stopOpacity="0.28" />
            <stop offset="65%" stopColor={p.rayColor} stopOpacity="0.08" />
            <stop offset="100%" stopColor={p.rayColor} stopOpacity="0" />
          </linearGradient>

          <linearGradient id={`ground-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.groundTop} />
            <stop offset="100%" stopColor={p.groundSide} />
          </linearGradient>

          <radialGradient id={`shadow-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.72" />
            <stop offset="65%" stopColor="#000000" stopOpacity="0.36" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          <radialGradient id={`boss-aura-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={p.accentSecondary} stopOpacity="0.42" />
            <stop offset="55%" stopColor={p.accent} stopOpacity="0.22" />
            <stop offset="100%" stopColor={p.accent} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Sky & Horizon Glow */}
        <rect x="0" y="0" width="320" height="260" fill={`url(#sky-${uid})`} />
        <circle cx={moonX} cy={moonY} r="36" fill={p.horizonGlow} opacity="0.16" />
        <circle cx={moonX} cy={moonY} r="18" fill={p.rayColor} opacity="0.26" />
        <ellipse cx="160" cy="132" rx="148" ry="96" fill={`url(#glow-${uid})`} />

        {/* 2. Slanted Volumetric Light Shafts (God Rays) */}
        <g opacity="0.85">
          <polygon points={`${42 + rayShift},0 ${96 + rayShift},0 ${158 + rayShift},215 ${88 + rayShift},215`} fill={`url(#ray-${uid})`} />
          <polygon points={`${134 + rayShift},0 ${198 + rayShift},0 ${252 + rayShift},215 ${176 + rayShift},215`} fill={`url(#ray-${uid})`} />
          <polygon points={`${224 + rayShift},0 ${268 + rayShift},0 ${310 + rayShift},215 ${258 + rayShift},215`} fill={`url(#ray-${uid})`} opacity="0.65" />
        </g>

        {/* 3. Zone-Specific Midground & Distant Environment Art */}
        {zone === "forest" && (
          <g>
            {/* Distant hills & ancient canopy */}
            <path d="M0,175 Q80,132 165,156 T320,148 L320,220 L0,220 Z" fill={p.distantFill} opacity="0.85" />
            {/* Background tree trunks */}
            <rect x="18" y="16" width="22" height="175" fill={p.distantFill} opacity="0.9" />
            <rect x="64" y="28" width="14" height="162" fill={p.distantFill} opacity="0.7" />
            <rect x="244" y="22" width="16" height="168" fill={p.distantFill} opacity="0.75" />
            <rect x="280" y="10" width="26" height="182" fill={p.midFill} opacity="0.92" />
            {/* Framing ancient tree trunks & boughs */}
            <path d="M-8,0 L34,0 L26,195 L-8,195 Z" fill={p.midFill} />
            <path d="M292,0 L328,0 L328,195 L298,195 Z" fill={p.midFill} />
            {/* Canopy leaf arches */}
            <circle cx="24" cy="22" r="46" fill={p.midFill} />
            <circle cx="82" cy="12" r="38" fill={p.distantFill} />
            <circle cx="238" cy="14" r="40" fill={p.distantFill} />
            <circle cx="296" cy="24" r="48" fill={p.midFill} />
            {/* Hanging woodland vines */}
            <path d="M52,0 Q46,45 55,78" stroke={p.groundRim} strokeWidth="1.6" fill="none" opacity="0.45" />
            <path d="M266,0 Q274,50 262,86" stroke={p.groundRim} strokeWidth="1.6" fill="none" opacity="0.45" />
            {/* Glowing mushrooms / flora on the sides */}
            <ellipse cx="42" cy="186" rx="10" ry="5" fill={p.accent} opacity="0.65" />
            <rect x="40" y="186" width="4" height="9" fill={p.rayColor} opacity="0.55" />
            <ellipse cx="276" cy="184" rx="11" ry="5.5" fill={p.accentSecondary} opacity="0.65" />
            <rect x="274" y="184" width="4" height="10" fill={p.rayColor} opacity="0.55" />
          </g>
        )}

        {zone === "mine" && (
          <g>
            {/* Cavern rock walls & stalactites */}
            <polygon points="0,0 320,0 320,56 276,84 232,42 184,74 136,38 86,78 38,48 0,88" fill={p.midFill} />
            <polygon points="0,40 42,96 34,196 0,196" fill={p.foreFill} />
            <polygon points="320,36 274,94 284,196 320,196" fill={p.foreFill} />
            {/* Glowing mineral crystal clusters */}
            <g opacity="0.88">
              <polygon points="28,184 38,144 48,182" fill={p.accent} />
              <polygon points="44,186 56,154 62,186" fill={p.horizonGlow} opacity="0.75" />
              <polygon points="272,184 282,140 294,182" fill={p.accent} />
              <polygon points="258,186 266,152 276,186" fill={p.accentSecondary} opacity="0.8" />
            </g>
          </g>
        )}

        {zone === "swamp" && (
          <g>
            {/* Marsh horizon & twisted mangrove roots */}
            <path d="M0,168 Q90,148 160,162 T320,154 L320,210 L0,210 Z" fill={p.distantFill} />
            <path d="M12,0 C32,54 18,120 42,190" stroke={p.midFill} strokeWidth="14" fill="none" />
            <path d="M36,42 C64,82 48,140 68,188" stroke={p.distantFill} strokeWidth="7" fill="none" />
            <path d="M308,0 C286,58 302,124 276,190" stroke={p.midFill} strokeWidth="14" fill="none" />
            {/* Eerie bog spore orbs */}
            <circle cx="58" cy="146" r="6" fill={p.accent} opacity="0.75" />
            <circle cx="264" cy="138" r="7" fill={p.accentSecondary} opacity="0.75" />
          </g>
        )}

        {zone === "snow" && (
          <g>
            {/* Aurora borealis ribbon */}
            <path
              d="M0,68 Q84,32 162,62 T320,46"
              stroke={p.accentSecondary}
              strokeWidth="16"
              fill="none"
              opacity="0.22"
            />
            {/* Jagged glacier mountain peaks */}
            <polygon points="0,185 56,82 114,158 172,74 236,156 286,88 320,148 320,205 0,205" fill={p.distantFill} />
            <polygon points="56,82 82,130 44,124" fill={p.rayColor} opacity="0.32" />
            <polygon points="172,74 198,126 156,118" fill={p.rayColor} opacity="0.32" />
            {/* Ice spires */}
            <polygon points="22,190 34,132 46,190" fill={p.accent} opacity="0.65" />
            <polygon points="274,190 288,128 300,190" fill={p.accent} opacity="0.65" />
          </g>
        )}

        {zone === "volcano" && (
          <g>
            {/* Volcanic caldera & basalt peaks */}
            <polygon points="0,186 64,96 122,148 164,78 212,146 272,92 320,164 320,206 0,206" fill={p.distantFill} />
            {/* Glowing lava streams */}
            <path d="M164,82 Q154,132 132,188" stroke={p.accent} strokeWidth="4" fill="none" opacity="0.78" />
            <path d="M166,82 Q178,136 196,188" stroke={p.accentSecondary} strokeWidth="3" fill="none" opacity="0.72" />
            {/* Obsidian pillars */}
            <polygon points="12,192 26,112 44,192" fill={p.midFill} />
            <polygon points="276,192 292,108 310,192" fill={p.midFill} />
          </g>
        )}

        {!["forest", "mine", "swamp", "snow", "volcano"].includes(zone) && (
          <g>
            {/* Cosmic / Endgame Realm Architecture (Abyss, Celestial, Rift, Inferno, Genesis, Omega) */}
            <circle cx="160" cy="112" r="64" stroke={p.horizonGlow} strokeWidth="1.5" fill="none" opacity="0.32" strokeDasharray="6 4" />
            <circle cx="160" cy="112" r="46" stroke={p.accentSecondary} strokeWidth="1.2" fill="none" opacity="0.28" />
            <polygon points="0,188 52,98 98,168 222,168 268,94 320,188" fill={p.distantFill} opacity="0.88" />
            {/* Floating monoliths */}
            <polygon points="28,64 44,44 52,132 24,142" fill={p.midFill} stroke={p.groundRim} strokeWidth="1" opacity="0.85" />
            <polygon points="272,58 292,42 296,136 268,144" fill={p.midFill} stroke={p.groundRim} strokeWidth="1" opacity="0.85" />
          </g>
        )}

        {/* 4. Boss Sacred Runic Halo & Altar */}
        {isBoss && (
          <g className="boss-scene-ornaments">
            <circle cx="160" cy="124" r="78" fill={`url(#boss-aura-${uid})`} />
            <circle
              cx="160"
              cy="124"
              r="62"
              stroke={p.accentSecondary}
              strokeWidth="1.6"
              strokeDasharray="8 5"
              fill="none"
              opacity="0.55"
            />
            <circle
              cx="160"
              cy="124"
              r="52"
              stroke={p.accent}
              strokeWidth="1"
              fill="none"
              opacity="0.4"
            />
          </g>
        )}

        {/* 5. 3D Sculpted Ground Stage & Pedestal Beneath Monster */}
        <g>
          {/* Back horizon hill */}
          <path d="M-10,192 Q160,162 330,192 L330,265 L-10,265 Z" fill={p.midFill} />
          {/* Main stage platform */}
          <ellipse cx="160" cy="216" rx="134" ry="34" fill={`url(#ground-${uid})`} stroke={p.groundRim} strokeWidth="1.5" strokeOpacity="0.55" />
          {/* Inner stage highlight rim */}
          <ellipse cx="160" cy="212" rx="104" ry="22" fill="none" stroke={p.rayColor} strokeWidth="1" strokeOpacity="0.28" />
          {isBoss && (
            <ellipse
              cx="160"
              cy="214"
              rx="92"
              ry="19"
              fill="none"
              stroke={p.accentSecondary}
              strokeWidth="1.8"
              strokeDasharray="10 6"
              strokeOpacity="0.72"
            />
          )}
          {/* Grounding contact shadow directly under the monster's feet */}
          <ellipse cx="160" cy="214" rx={isBoss ? 78 : 62} ry={isBoss ? 17 : 13} fill={`url(#shadow-${uid})`} />
        </g>

        {/* 6. Ambient Floating Spores / Fireflies / Embers */}
        <g fill={p.particle} opacity="0.78">
          <circle cx={48 + (seed % 24)} cy={62 + (seed % 30)} r="2.2" />
          <circle cx={92 + (seed % 18)} cy={142 - (seed % 26)} r="1.6" opacity="0.65" />
          <circle cx={228 - (seed % 22)} cy={54 + (seed % 28)} r="2.4" />
          <circle cx={262 - (seed % 16)} cy={136 - (seed % 20)} r="1.8" opacity="0.7" />
          <circle cx={156 + ((seed >> 3) % 30) - 15} cy={38 + (seed % 18)} r="1.9" opacity="0.6" />
        </g>
      </svg>
    </div>
  );
};
