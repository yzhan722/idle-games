import React from 'react'

/**
 * CardArt —— 纯 SVG 矢量卡片素材
 * 不依赖任何位图文件，刷新即生效、无 404、风格统一。
 * 用法： <CardArt kind="tree" id="poplar" fallback="🌱" />
 *
 * 设计语言：圆角徽章底盘 + 内发光 + 顶部高光，营造轻量 3D 质感；
 * 配色贴合黄昏工坊：墨底 + 琥珀金 + 苔绿。
 */

export type CardArtKind = 'tree' | 'monster' | 'craft' | 'character' | 'item' | 'equipment' | 'materials'

interface CardArtProps {
  kind: CardArtKind
  id: string
  fallback?: string
  className?: string
}

const VIEW = 120

/* ---------- 通用底盘 ---------- */

function Plate({
  children,
  glow = '#d49a48',
  rim = '#4a3828',
}: {
  children: React.ReactNode
  glow?: string
  rim?: string
}) {
  const gid = React.useId()
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={`bg-${gid}`} cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#2a2119" />
          <stop offset="100%" stopColor="#16110d" />
        </radialGradient>
        <linearGradient id={`hl-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,.16)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <radialGradient id={`spot-${gid}`} cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor={glow} stopOpacity="0.22" />
          <stop offset="100%" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <filter id={`ds-${gid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.4" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>

      {/* 底盘 */}
      <rect x="6" y="6" width="108" height="108" rx="22" fill={`url(#bg-${gid})`} stroke={rim} strokeWidth="2" />
      <rect x="6" y="6" width="108" height="108" rx="22" fill={`url(#spot-${gid})`} />
      {/* 顶部高光 */}
      <rect x="10" y="10" width="100" height="60" rx="18" fill={`url(#hl-${gid})`} />

      {/* 主体造型 */}
      <g filter={`url(#ds-${gid})`}>{children}</g>
    </svg>
  )
}

/* 简易树：树冠(多层)+ 树干 */
function TreeArt({
  leaf,
  leaf2,
  trunk = '#7a5230',
  crown = 'blob',
  accent,
}: {
  leaf: string
  leaf2: string
  trunk?: string
  crown?: 'blob' | 'cone' | 'droop' | 'tall' | 'bloom' | 'ancient' | 'divine'
  accent?: string
}) {
  const gid = React.useId()
  return (
    <Plate glow={leaf} rim="#2a3d2c">
      <defs>
        <linearGradient id={`lf-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={leaf} />
          <stop offset="100%" stopColor={leaf2} />
        </linearGradient>
        <linearGradient id={`tr-${gid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={trunk} />
          <stop offset="50%" stopColor="#9c6b3f" />
          <stop offset="100%" stopColor={trunk} />
        </linearGradient>
      </defs>

      {/* 树干 */}
      <rect x="55" y="74" width="10" height="26" rx="4" fill={`url(#tr-${gid})`} />

      {crown === 'cone' && (
        <>
          <polygon points="60,24 84,56 36,56" fill={`url(#lf-${gid})`} />
          <polygon points="60,38 88,74 32,74" fill={`url(#lf-${gid})`} />
          <polygon points="60,52 92,86 28,86" fill={`url(#lf-${gid})`} />
        </>
      )}
      {crown === 'blob' && (
        <>
          <circle cx="60" cy="50" r="26" fill={`url(#lf-${gid})`} />
          <circle cx="42" cy="60" r="16" fill={`url(#lf-${gid})`} />
          <circle cx="78" cy="60" r="16" fill={`url(#lf-${gid})`} />
        </>
      )}
      {crown === 'droop' && (
        <>
          <circle cx="60" cy="42" r="22" fill={`url(#lf-${gid})`} />
          {[36, 48, 60, 72, 84].map((x, i) => (
            <path
              key={i}
              d={`M${x},50 q-3,22 ${i % 2 ? 4 : -4},34`}
              stroke={leaf2}
              strokeWidth="3.4"
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </>
      )}
      {crown === 'tall' && (
        <>
          <ellipse cx="60" cy="46" rx="20" ry="30" fill={`url(#lf-${gid})`} />
          <ellipse cx="60" cy="40" rx="11" ry="18" fill={leaf} opacity="0.5" />
        </>
      )}
      {crown === 'bloom' && (
        <>
          <circle cx="60" cy="50" r="25" fill={`url(#lf-${gid})`} />
          {[
            [60, 30],
            [42, 46],
            [78, 46],
            [48, 66],
            [72, 66],
            [60, 56],
          ].map(([x, y], i) => (
            <g key={i}>
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse
                  key={a}
                  cx={x}
                  cy={y}
                  rx="5"
                  ry="2.6"
                  fill={accent || '#ffd6ef'}
                  transform={`rotate(${a} ${x} ${y})`}
                  opacity="0.95"
                />
              ))}
              <circle cx={x} cy={y} r="1.8" fill="#fff3c4" />
            </g>
          ))}
        </>
      )}
      {crown === 'ancient' && (
        <>
          <ellipse cx="60" cy="48" rx="30" ry="26" fill={`url(#lf-${gid})`} />
          <ellipse cx="44" cy="58" rx="14" ry="12" fill={`url(#lf-${gid})`} />
          <ellipse cx="78" cy="58" rx="14" ry="12" fill={`url(#lf-${gid})`} />
          {/* 龙鳞缠绕 */}
          <path
            d="M55,98 q-14,-22 4,-40 q16,-16 0,-30"
            stroke={accent || '#e8b860'}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            opacity="0.85"
          />
        </>
      )}
      {crown === 'divine' && (
        <>
          <ellipse cx="60" cy="48" rx="27" ry="25" fill={`url(#lf-${gid})`} />
          <ellipse cx="60" cy="44" rx="14" ry="14" fill="#fff" opacity="0.35" />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <line
              key={a}
              x1="60"
              y1="48"
              x2={60 + 40 * Math.cos((a * Math.PI) / 180)}
              y2={48 + 40 * Math.sin((a * Math.PI) / 180)}
              stroke={accent || '#e8b860'}
              strokeWidth="2"
              opacity="0.5"
            />
          ))}
        </>
      )}
    </Plate>
  )
}

/* 通用生物：圆身 + 眼睛 + 特征，按 type 调整 */
function MonsterArt({
  body,
  body2,
  shape = 'round',
  accent = '#fff',
  boss = false,
  eyes = 2,
}: {
  body: string
  body2: string
  shape?: 'round' | 'tall' | 'bug' | 'wing' | 'spiky' | 'ghost' | 'blob'
  accent?: string
  boss?: boolean
  eyes?: number
}) {
  const gid = React.useId()
  const glow = boss ? '#e8b860' : body
  const rim = boss ? '#5a4420' : '#4a3828'
  const eyeY = shape === 'tall' ? 50 : 56
  return (
    <Plate glow={glow} rim={rim}>
      <defs>
        <radialGradient id={`bd-${gid}`} cx="42%" cy="35%" r="75%">
          <stop offset="0%" stopColor={body} />
          <stop offset="100%" stopColor={body2} />
        </radialGradient>
      </defs>

      {boss && (
        // 王冠
        <path d="M44,30 l6,10 6,-12 6,12 6,-10 -3,16 -18,0 z" fill="#e8b860" stroke="#8a6a28" strokeWidth="1.5" />
      )}

      {shape === 'round' && <circle cx="60" cy="64" r="30" fill={`url(#bd-${gid})`} />}
      {shape === 'blob' && (
        <path
          d="M30,70 q-4,-34 30,-34 q34,0 30,34 q2,18 -30,18 q-32,0 -30,-18 z"
          fill={`url(#bd-${gid})`}
        />
      )}
      {shape === 'tall' && <rect x="38" y="36" width="44" height="58" rx="20" fill={`url(#bd-${gid})`} />}
      {shape === 'bug' && (
        <>
          <ellipse cx="60" cy="64" rx="22" ry="30" fill={`url(#bd-${gid})`} />
          {[46, 56, 66, 76].map((y) => (
            <line key={y} x1="38" y1={y} x2="82" y2={y} stroke={body2} strokeWidth="3" opacity="0.6" />
          ))}
        </>
      )}
      {shape === 'wing' && (
        <>
          <path d="M60,60 q-34,-18 -38,4 q22,4 34,14 z" fill={accent} opacity="0.8" />
          <path d="M60,60 q34,-18 38,4 q-22,4 -34,14 z" fill={accent} opacity="0.8" />
          <ellipse cx="60" cy="66" rx="18" ry="22" fill={`url(#bd-${gid})`} />
        </>
      )}
      {shape === 'spiky' && (
        <>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <polygon
              key={a}
              points="60,30 64,58 56,58"
              fill={body2}
              transform={`rotate(${a} 60 62)`}
            />
          ))}
          <circle cx="60" cy="62" r="26" fill={`url(#bd-${gid})`} />
        </>
      )}
      {shape === 'ghost' && (
        <path
          d="M34,64 q0,-28 26,-28 q26,0 26,28 l0,26 q-6,-6 -10,0 q-6,6 -12,0 q-6,-6 -12,0 q-4,6 -10,0 z"
          fill={`url(#bd-${gid})`}
          opacity="0.92"
        />
      )}

      {/* 眼睛 */}
      {Array.from({ length: eyes }).map((_, i) => {
        const cx = eyes === 1 ? 60 : 52 + i * 16
        return (
          <g key={i}>
            <circle cx={cx} cy={eyeY} r="6" fill="#fff" />
            <circle cx={cx} cy={eyeY + 1} r="3" fill="#1a2430" />
            <circle cx={cx - 1.5} cy={eyeY - 1.5} r="1.2" fill="#fff" />
          </g>
        )
      })}
      {/* 腮红 */}
      <ellipse cx="46" cy={eyeY + 12} rx="4" ry="2.4" fill={accent} opacity="0.4" />
      <ellipse cx="74" cy={eyeY + 12} rx="4" ry="2.4" fill={accent} opacity="0.4" />
    </Plate>
  )
}

/* 合成物 / 物品徽章：道具风格(木板/武器/锭/防具/药水/书籍/饰品等) */
function CraftArt({
  variant,
  main,
  main2,
  accent = '#e8b860',
}: {
  variant: 'plank' | 'log' | 'sword' | 'ingot' | 'gem' | 'tool' | 'armor' | 'shield' | 'potion' | 'book' | 'ring' | 'food'
  main: string
  main2: string
  accent?: string
}) {
  const gid = React.useId()
  return (
    <Plate glow={accent} rim="#4a3a22">
      <defs>
        <linearGradient id={`mn-${gid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={main} />
          <stop offset="100%" stopColor={main2} />
        </linearGradient>
      </defs>

      {variant === 'plank' && (
        <>
          <rect x="28" y="46" width="64" height="14" rx="3" fill={`url(#mn-${gid})`} transform="rotate(-8 60 60)" />
          <rect x="28" y="62" width="64" height="14" rx="3" fill={`url(#mn-${gid})`} transform="rotate(-8 60 60)" />
          <line x1="42" y1="44" x2="40" y2="78" stroke={main2} strokeWidth="1.5" opacity="0.5" />
          <line x1="76" y1="42" x2="74" y2="76" stroke={main2} strokeWidth="1.5" opacity="0.5" />
        </>
      )}
      {variant === 'log' && (
        <>
          <rect x="32" y="48" width="56" height="26" rx="13" fill={`url(#mn-${gid})`} />
          <ellipse cx="36" cy="61" rx="6" ry="13" fill="#caa06a" />
          <ellipse cx="36" cy="61" rx="3" ry="7" fill="#9c6b3f" />
        </>
      )}
      {variant === 'sword' && (
        <>
          <polygon points="60,24 66,72 54,72" fill={`url(#mn-${gid})`} />
          <rect x="48" y="72" width="24" height="6" rx="2" fill={accent} />
          <rect x="56" y="78" width="8" height="16" rx="2" fill="#7a5230" />
          <polygon points="60,24 63,72 60,72" fill="#fff" opacity="0.3" />
        </>
      )}
      {variant === 'ingot' && (
        <>
          <polygon points="36,72 84,72 76,52 44,52" fill={`url(#mn-${gid})`} />
          <polygon points="44,52 76,52 72,46 48,46" fill={main} opacity="0.8" />
          <line x1="44" y1="62" x2="76" y2="62" stroke="#fff" strokeWidth="1.5" opacity="0.3" />
        </>
      )}
      {variant === 'gem' && (
        <>
          <polygon points="60,34 84,56 60,92 36,56" fill={`url(#mn-${gid})`} />
          <polygon points="60,34 84,56 60,56 36,56" fill="#fff" opacity="0.25" />
          <line x1="36" y1="56" x2="84" y2="56" stroke="#fff" strokeWidth="1" opacity="0.4" />
        </>
      )}
      {variant === 'tool' && (
        <>
          <rect x="54" y="44" width="8" height="44" rx="3" fill="#7a5230" />
          <path d="M40,46 q20,-12 40,0 l-6,10 q-14,-8 -28,0 z" fill={`url(#mn-${gid})`} />
        </>
      )}
      {variant === 'armor' && (
        <>
          <path
            d="M42,34 l10,-4 q8,8 16,0 l10,4 l8,16 l-10,6 l-4,-8 l0,40 l-24,0 l0,-40 l-4,8 l-10,-6 z"
            fill={`url(#mn-${gid})`}
            stroke={accent}
            strokeWidth="2"
          />
          <line x1="60" y1="36" x2="60" y2="86" stroke={accent} strokeWidth="1.6" opacity="0.55" />
        </>
      )}
      {variant === 'shield' && (
        <>
          <path
            d="M36,34 l48,0 l0,24 q0,24 -24,34 q-24,-10 -24,-34 z"
            fill={`url(#mn-${gid})`}
            stroke={accent}
            strokeWidth="2.5"
          />
          <circle cx="60" cy="56" r="7" fill={accent} />
        </>
      )}
      {variant === 'potion' && (
        <>
          <rect x="53" y="28" width="14" height="8" rx="2" fill="#b89060" />
          <rect x="51" y="34" width="18" height="5" rx="2" fill="#d8dde2" />
          <path
            d="M54,39 l0,10 l-16,24 q-4,15 12,17 l20,0 q16,-2 12,-17 l-16,-24 l0,-10 z"
            fill={`url(#mn-${gid})`}
            stroke="#e8f4ff"
            strokeWidth="1.8"
          />
          <ellipse cx="54" cy="68" rx="5" ry="9" fill="#fff" opacity="0.28" transform="rotate(-18 54 68)" />
        </>
      )}
      {variant === 'book' && (
        <>
          <rect x="34" y="30" width="52" height="62" rx="6" fill={`url(#mn-${gid})`} stroke={accent} strokeWidth="2.2" />
          <rect x="38" y="34" width="6" height="54" fill={main2} opacity="0.6" />
          <polygon points="62,46 65,54 74,54 67,59 70,68 62,62 54,68 57,59 50,54 59,54" fill={accent} />
        </>
      )}
      {variant === 'ring' && (
        <>
          <circle cx="60" cy="64" r="20" fill="none" stroke={accent} strokeWidth="7" />
          <polygon points="60,30 70,42 60,50 50,42" fill={`url(#mn-${gid})`} stroke="#fff" strokeWidth="1.2" />
        </>
      )}
      {variant === 'food' && (
        <>
          <path d="M30,62 q0,24 30,24 q30,0 30,-24 z" fill="#8a5a36" stroke={accent} strokeWidth="2" />
          <ellipse cx="60" cy="62" rx="28" ry="9" fill={`url(#mn-${gid})`} />
          <circle cx="52" cy="60" r="4" fill={accent} />
          <circle cx="66" cy="63" r="3.5" fill="#7fbf6a" />
        </>
      )}
    </Plate>
  )
}

/* 角色：Q版头身(头 + 身体 + 职业道具点缀) */
function CharacterArt({
  skin = '#f2c79a',
  cloth,
  cloth2,
  hair = '#3a2a1a',
  prop,
  propColor = '#e8b860',
}: {
  skin?: string
  cloth: string
  cloth2: string
  hair?: string
  prop?: 'hammer' | 'axe' | 'hoe' | 'spoon' | 'needle' | 'flask'
  propColor?: string
}) {
  const gid = React.useId()
  return (
    <Plate glow={cloth} rim="#4a3828">
      <defs>
        <linearGradient id={`cl-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cloth} />
          <stop offset="100%" stopColor={cloth2} />
        </linearGradient>
      </defs>
      {/* 身体 */}
      <path d="M38,104 q0,-30 22,-30 q22,0 22,30 z" fill={`url(#cl-${gid})`} />
      {/* 头发后 */}
      <circle cx="60" cy="48" r="22" fill={hair} />
      {/* 脸 */}
      <circle cx="60" cy="50" r="17" fill={skin} />
      {/* 刘海 */}
      <path d="M43,46 q4,-16 17,-16 q13,0 17,16 q-9,-8 -17,-8 q-8,0 -17,8 z" fill={hair} />
      {/* 眼睛 */}
      <circle cx="53" cy="51" r="2.4" fill="#23303d" />
      <circle cx="67" cy="51" r="2.4" fill="#23303d" />
      {/* 腮红 */}
      <ellipse cx="50" cy="57" rx="3" ry="1.8" fill="#f29a8a" opacity="0.6" />
      <ellipse cx="70" cy="57" rx="3" ry="1.8" fill="#f29a8a" opacity="0.6" />
      {/* 笑嘴 */}
      <path d="M56,58 q4,4 8,0" stroke="#b5605a" strokeWidth="1.6" fill="none" strokeLinecap="round" />

      {/* 职业道具 */}
      {prop === 'axe' && (
        <g transform="rotate(-25 86 80)">
          <rect x="84" y="62" width="5" height="32" rx="2" fill="#7a5230" />
          <path d="M78,64 l22,0 l-4,14 l-14,0 z" fill={propColor} />
        </g>
      )}
      {prop === 'hammer' && (
        <g transform="rotate(20 86 78)">
          <rect x="83" y="70" width="5" height="28" rx="2" fill="#7a5230" />
          <rect x="76" y="64" width="19" height="11" rx="2" fill={propColor} />
        </g>
      )}
      {prop === 'hoe' && (
        <g>
          <rect x="84" y="64" width="4" height="34" rx="2" fill="#7a5230" />
          <path d="M86,64 q10,-2 12,8 l-8,2 z" fill={propColor} />
        </g>
      )}
      {prop === 'spoon' && (
        <g>
          <rect x="85" y="70" width="4" height="28" rx="2" fill="#cfcfcf" />
          <ellipse cx="87" cy="68" rx="7" ry="9" fill="#cfcfcf" />
        </g>
      )}
      {prop === 'needle' && (
        <g transform="rotate(35 86 80)">
          <rect x="85" y="62" width="3" height="34" rx="1.5" fill="#dcdcdc" />
          <circle cx="86.5" cy="62" r="3" fill={propColor} />
        </g>
      )}
      {prop === 'flask' && (
        <g>
          <path d="M82,72 l0,8 -6,14 q-2,6 6,6 q8,0 6,-6 l-6,-14 0,-8 z" fill={propColor} opacity="0.85" />
          <rect x="80" y="68" width="6" height="5" rx="1.5" fill="#cfcfcf" />
        </g>
      )}
    </Plate>
  )
}

/* ============ id → 造型 映射 ============ */

const TREE_MAP: Record<string, React.ReactNode> = {
  poplar: <TreeArt leaf="#9ed36a" leaf2="#5fa83a" crown="blob" trunk="#8a6b45" />,
  fir: <TreeArt leaf="#3f8f5e" leaf2="#1f5e3a" crown="cone" trunk="#5e4326" />,
  willow: <TreeArt leaf="#86c47e" leaf2="#4e8c54" crown="droop" trunk="#6f5536" />,
  birch: <TreeArt leaf="#7fbf6a" leaf2="#4f8f44" crown="tall" trunk="#d8d2c4" />,
  rosewood: <TreeArt leaf="#c98ad6" leaf2="#8a4fa0" crown="bloom" trunk="#7a4f55" accent="#ffd6ef" />,
  cypress: <TreeArt leaf="#3a7a5a" leaf2="#1d4d38" crown="ancient" trunk="#5a4426" accent="#e8b860" />,
  divine: <TreeArt leaf="#7fe0d0" leaf2="#3a9fa0" crown="divine" trunk="#caa86a" accent="#fff2b8" />,
}

const MONSTER_MAP: Record<string, React.ReactNode> = {
  // 森林
  slime: <MonsterArt body="#7fe089" body2="#2f9e54" shape="blob" accent="#caffd2" />,
  caterpillar: <MonsterArt body="#a8d86a" body2="#6f9e34" shape="bug" accent="#e6ffb0" />,
  monkey: <MonsterArt body="#b98a55" body2="#7a5430" shape="round" accent="#f2d3a0" />,
  mushroom: <MonsterArt body="#e06a6a" body2="#a83434" shape="round" accent="#ffd0d0" eyes={2} />,
  bee: <MonsterArt body="#f2c94c" body2="#c79a1a" shape="wing" accent="#fff3c4" />,
  crab: <MonsterArt body="#e8714a" body2="#b03a1e" shape="spiky" accent="#ffd0b8" />,
  forest_boss: <MonsterArt body="#8fd0a0" body2="#3a8a5e" shape="round" accent="#e8ffe0" boss eyes={2} />,
  // 矿山
  rock_golem: <MonsterArt body="#9aa3ab" body2="#5a636b" shape="spiky" accent="#d6dee4" />,
  crystal_bat: <MonsterArt body="#7fb6e0" body2="#3a6f9e" shape="wing" accent="#cfeaff" />,
  ore_rat: <MonsterArt body="#a89070" body2="#6f5a3a" shape="round" accent="#e6d6b8" />,
  magma_worm: <MonsterArt body="#f08a3a" body2="#b0401a" shape="bug" accent="#ffd0a0" />,
  iron_spider: <MonsterArt body="#7a828a" body2="#3a424a" shape="spiky" accent="#cfd6dc" eyes={2} />,
  gem_thief: <MonsterArt body="#6fd0b0" body2="#2f8f74" shape="round" accent="#d0fff0" />,
  mine_boss: <MonsterArt body="#c97a5a" body2="#8a3a2a" shape="spiky" accent="#ffd6c0" boss eyes={2} />,
  // 沼泽
  poison_frog: <MonsterArt body="#9ed86a" body2="#5a9e34" shape="round" accent="#e0ffb0" eyes={2} />,
  swamp_zombie: <MonsterArt body="#8aa07a" body2="#4f6a44" shape="tall" accent="#cfe0c0" eyes={2} />,
  mud_elemental: <MonsterArt body="#8a7050" body2="#5a4530" shape="blob" accent="#d6c0a0" eyes={2} />,
  vine_snake: <MonsterArt body="#5fae6a" body2="#2f7a44" shape="tall" accent="#d0ffd0" eyes={2} />,
  ghost_light: <MonsterArt body="#9fc0e0" body2="#5f80b0" shape="ghost" accent="#e0f0ff" eyes={2} />,
  swamp_troll: <MonsterArt body="#7a9e6a" body2="#456a3a" shape="tall" accent="#cfe0b8" eyes={2} />,
  swamp_boss: <MonsterArt body="#5a9e7a" body2="#2a6a4a" shape="round" accent="#d0ffe0" boss eyes={2} />,
}

const CRAFT_MAP: Record<string, React.ReactNode> = {
  plank: <CraftArt variant="plank" main="#c79a5a" main2="#8a6230" />,
  log: <CraftArt variant="log" main="#b98a55" main2="#7a5430" />,
  sword: <CraftArt variant="sword" main="#cfd6dc" main2="#8a949c" accent="#e8b860" />,
  ingot: <CraftArt variant="ingot" main="#d8dde2" main2="#9aa3ab" />,
  gem: <CraftArt variant="gem" main="#7fd0e8" main2="#3a8fb0" accent="#cfeeff" />,
  tool: <CraftArt variant="tool" main="#cfd6dc" main2="#8a949c" />,
}

const CHARACTER_MAP: Record<string, React.ReactNode> = {
  woodcutter: <CharacterArt cloth="#6fae6a" cloth2="#3f7a3a" hair="#5a3a1a" prop="axe" propColor="#cfd6dc" />,
  blacksmith: <CharacterArt cloth="#8a6240" cloth2="#5a3a22" hair="#2a2018" prop="hammer" propColor="#cfd6dc" />,
  farmer: <CharacterArt cloth="#c7a85a" cloth2="#8a7030" hair="#4a3418" prop="hoe" propColor="#9aa3ab" />,
  chef: <CharacterArt cloth="#e0e4e8" cloth2="#aab0b6" hair="#3a2a1a" prop="spoon" propColor="#cfcfcf" />,
  tailor: <CharacterArt cloth="#9a6fc0" cloth2="#5f3f8a" hair="#3a2a3a" prop="needle" propColor="#e8b860" />,
  alchemist: <CharacterArt cloth="#7a9e5c" cloth2="#5f8146" hair="#2a2119" prop="flask" propColor="#c4b09a" />,
}

/* 关键词兜底：根据 id 推断造型族类（覆盖采集点/矿石/作物等共用 tree-card 的条目） */
function inferTree(id: string): React.ReactNode | null {
  if (TREE_MAP[id]) return TREE_MAP[id]
  if (/copper|iron|silver|gold|platinum|mithril|adamantite|ore|crystal/.test(id))
    return <CraftArt variant="gem" main="#9fb0c0" main2="#5f7080" accent="#cfe0f0" />
  if (/cotton|wheat|rice|herb|crop|fiber|linen|silk|flax/.test(id))
    return <TreeArt leaf="#bcd86a" leaf2="#7a9e34" crown="tall" trunk="#8a6b45" />
  if (/river|lake|ocean|sea|fish/.test(id))
    return <CraftArt variant="gem" main="#5fc0e0" main2="#2a7fa0" accent="#cfeeff" />
  return null
}

function inferItemBadge(id: string): React.ReactNode {
  // Tier color palette based on item suffix or material keyword
  let main = '#cfd6dc'
  let main2 = '#7a8692'
  let accent = '#e8b860'
  if (/(_t5|_7|divine|genesis|chaos|god|dragon|holy|sacred)/.test(id)) {
    main = '#ffd86b'
    main2 = '#b87a1e'
    accent = '#fff3c4'
  } else if (/(_t4|_6|abyss|void|shadow|demon|adamantite|star)/.test(id)) {
    main = '#b98ae8'
    main2 = '#623896'
    accent = '#f0d8ff'
  } else if (/(_t3|_5|volcano|magma|flame|fire|inferno|mithril|platinum|gold|rosewood)/.test(id)) {
    main = '#f28a48'
    main2 = '#9e3818'
    accent = '#ffe0b0'
  } else if (/(_t2|_3|_4|frost|ice|snow|crystal|silver|lake|silk)/.test(id)) {
    main = '#74c7e8'
    main2 = '#2f7296'
    accent = '#d8f4ff'
  } else if (/wood|lumber|forest|herb|leaf|farmer/.test(id)) {
    main = '#92cf6a'
    main2 = '#4a802c'
    accent = '#e2ffc8'
  }

  if (/^book_/.test(id)) return <CraftArt variant="book" main={main} main2={main2} accent={accent} />
  if (/^(potion|elixir|drink)_/.test(id)) return <CraftArt variant="potion" main={main} main2={main2} accent={accent} />
  if (/^(food|dish|soup|meat|fish|bread|meal)_/.test(id)) return <CraftArt variant="food" main={main} main2={main2} accent={accent} />
  if (/^(shield|offhand)_/.test(id)) return <CraftArt variant="shield" main={main} main2={main2} accent={accent} />
  if (/^(ring|amulet|pendant|charm|accessory|crown)_/.test(id)) return <CraftArt variant="ring" main={main} main2={main2} accent={accent} />
  if (/^armor_/.test(id)) return <CraftArt variant="armor" main={main} main2={main2} accent={accent} />
  if (/^(weapon|sword|blade|dagger)_/.test(id)) return <CraftArt variant="sword" main={main} main2={main2} accent={accent} />
  if (/^(tool)_/.test(id) || /(axe|hammer|hoe|sickle|scissors|pan|spatula)/.test(id))
    return <CraftArt variant="tool" main={main} main2={main2} accent={accent} />
  if (/^(ingot)_/.test(id)) return <CraftArt variant="ingot" main={main} main2={main2} accent={accent} />
  if (/^(wood)_/.test(id)) return <CraftArt variant="log" main="#b98a55" main2="#7a5430" accent={accent} />
  if (/^(lumber)_/.test(id)) return <CraftArt variant="plank" main="#c79a5a" main2="#8a6230" accent={accent} />
  return <CraftArt variant="gem" main={main} main2={main2} accent={accent} />
}

const MAPS: Partial<Record<CardArtKind, Record<string, React.ReactNode>>> = {
  tree: TREE_MAP,
  monster: MONSTER_MAP,
  craft: CRAFT_MAP,
  character: CHARACTER_MAP,
}

export default function CardArt({ kind, id, fallback, className }: CardArtProps) {
  let art: React.ReactNode = MAPS[kind]?.[id]

  if (!art && kind === 'tree') art = inferTree(id) ?? undefined
  if (!art && (kind === 'craft' || kind === 'item' || kind === 'equipment' || kind === 'materials')) {
    art = inferItemBadge(id)
  }
  if (!art && kind === 'monster') {
    if (/boss/.test(id))
      art = <MonsterArt body="#9a8ad0" body2="#5a4a9e" shape="round" accent="#e0d0ff" boss eyes={2} />
    else art = <MonsterArt body="#7f9ed0" body2="#3a5f9e" shape="round" accent="#cfe0ff" eyes={2} />
  }
  if (!art && kind === 'character') art = CHARACTER_MAP.woodcutter

  if (!art) {
    return (
      <span className={className} aria-hidden>
        {fallback || '\u25c6'}
      </span>
    )
  }

  return (
    <span
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', lineHeight: 0 }}
      aria-hidden
    >
      {art}
    </span>
  )
}