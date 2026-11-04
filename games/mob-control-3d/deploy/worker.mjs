const SEED_LEADERBOARD = [
  { name: '好男人未来', bestStage: 28, totalKills: 48620, playTimeSeconds: 14820, skinName: '星河霓虹', badgeColor: '#f472b6', isBot: true },
  { name: '星际破壁者', bestStage: 23, totalKills: 36410, playTimeSeconds: 11580, skinName: '黄金帝国', badgeColor: '#facc15', isBot: true },
  { name: '深渊猎手K', bestStage: 19, totalKills: 29850, playTimeSeconds: 9420, skinName: '黄金帝国', badgeColor: '#facc15', isBot: true },
  { name: '雷霆泰坦07', bestStage: 16, totalKills: 23190, playTimeSeconds: 7650, skinName: '暗影虚空', badgeColor: '#c084fc', isBot: true },
  { name: '夜幕执政官', bestStage: 14, totalKills: 19400, playTimeSeconds: 6380, skinName: '暗影虚空', badgeColor: '#c084fc', isBot: true },
  { name: '暴风克隆体', bestStage: 12, totalKills: 15820, playTimeSeconds: 5120, skinName: '翡翠毒牙', badgeColor: '#4ade80', isBot: true },
  { name: '机械狂潮阿泽', bestStage: 9, totalKills: 11260, playTimeSeconds: 3840, skinName: '翡翠毒牙', badgeColor: '#4ade80', isBot: true },
  { name: '绯红女武神', bestStage: 6, totalKills: 7450, playTimeSeconds: 2560, skinName: '绯红审判', badgeColor: '#f87171', isBot: true },
  { name: '前线老兵老王', bestStage: 4, totalKills: 4680, playTimeSeconds: 1620, skinName: '绯红审判', badgeColor: '#f87171', isBot: true },
  { name: '新星侦察兵', bestStage: 2, totalKills: 1920, playTimeSeconds: 780, skinName: '蔚蓝先锋', badgeColor: '#38bdf8', isBot: true },
];

const EPOCH_MONDAY_UTC8_MS = 316800000; // 1970-01-05 00:00:00 UTC+8 (Monday)
const WEEK_MS = 7 * 24 * 3600 * 1000;

function getWeeklyCycleInfo(nowMs = Date.now()) {
  const weekIndex = Math.floor((nowMs - EPOCH_MONDAY_UTC8_MS) / WEEK_MS);
  const weekKey = `w${weekIndex}`;
  const kvKey = `real_players_weekly_${weekKey}`;
  const nextResetAtMs = EPOCH_MONDAY_UTC8_MS + (weekIndex + 1) * WEEK_MS;
  return { weekKey, kvKey, nextResetAtMs };
}

let fallbackWeekKey = '';
let fallbackRealPlayers = [];

async function loadRealPlayers(env, kvKey, weekKey) {
  if (fallbackWeekKey !== weekKey) {
    fallbackWeekKey = weekKey;
    fallbackRealPlayers = [];
  }
  if (env && env.MOB_CONTROL_LEADERBOARD) {
    try {
      const data = await env.MOB_CONTROL_LEADERBOARD.get(kvKey, 'json');
      if (Array.isArray(data)) {
        return data;
      }
    } catch {
      // Fallback to memory if KV read fails
    }
  }
  return [...fallbackRealPlayers];
}

async function saveRealPlayers(env, kvKey, weekKey, players) {
  fallbackWeekKey = weekKey;
  fallbackRealPlayers = players;
  if (env && env.MOB_CONTROL_LEADERBOARD) {
    try {
      await env.MOB_CONTROL_LEADERBOARD.put(kvKey, JSON.stringify(players), {
        expirationTtl: 14 * 86400,
      });
    } catch {
      // Ignore KV write errors
    }
  }
}

function ensurePlayTime(p) {
  if (typeof p.playTimeSeconds === 'number' && p.playTimeSeconds > 0) {
    return Math.round(p.playTimeSeconds);
  }
  return Math.max(60, Math.round((p.bestStage || 1) * 145 + (p.totalKills || 0) * 0.15));
}

function buildTop10(realPlayers) {
  const sortedReal = [...realPlayers]
    .map((p) => ({ ...p, playTimeSeconds: ensurePlayTime(p), isBot: false }))
    .sort((a, b) => b.bestStage - a.bestStage || b.totalKills - a.totalKills);

  const selectedReal = sortedReal.slice(0, 10);
  const neededBots = Math.max(0, 10 - selectedReal.length);
  const bots = SEED_LEADERBOARD.slice(0, neededBots).map((b) => ({ ...b, isBot: true }));

  const combined = [...selectedReal, ...bots];
  combined.sort((a, b) => b.bestStage - a.bestStage || b.totalKills - a.totalKills);
  return combined.slice(0, 10);
}

function buildActiveTop10(realPlayers) {
  const sortedReal = [...realPlayers]
    .map((p) => ({ ...p, playTimeSeconds: ensurePlayTime(p), isBot: false }))
    .sort((a, b) => b.playTimeSeconds - a.playTimeSeconds || b.bestStage - a.bestStage);

  const selectedReal = sortedReal.slice(0, 10);
  const neededBots = Math.max(0, 10 - selectedReal.length);
  const bots = SEED_LEADERBOARD.slice(0, neededBots).map((b) => ({ ...b, isBot: true }));

  const combined = [...selectedReal, ...bots];
  combined.sort((a, b) => b.playTimeSeconds - a.playTimeSeconds || b.bestStage - a.bestStage);
  return combined.slice(0, 10);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Edge API for Top 10 Weekly Leaderboard (Backed by Cloudflare KV, resets every Monday 00:00 UTC+8)
    if (url.pathname === '/api/leaderboard') {
      const { weekKey, kvKey, nextResetAtMs } = getWeeklyCycleInfo();
      let realPlayers = await loadRealPlayers(env, kvKey, weekKey);

      if (request.method === 'POST') {
        try {
          const body = await request.json();
          const playerId = String(body.playerId || '').trim().slice(0, 40);
          const name = String(body.name || '').trim().slice(0, 20);
          const bestStage = Math.max(0, Math.min(999, Number(body.bestStage) || 0));
          const totalKills = Math.max(0, Math.min(9999999, Number(body.totalKills) || 0));
          const playTimeSeconds = Math.max(0, Math.min(99999999, Math.round(Number(body.playTimeSeconds) || 0)));
          const skinName = String(body.skinName || '蔚蓝先锋').slice(0, 12);
          const badgeColor = String(body.badgeColor || '#38bdf8').slice(0, 16);

          if (name && (bestStage > 0 || totalKills > 0 || playTimeSeconds > 0)) {
            const idx = realPlayers.findIndex(
              (e) => (playerId && e.playerId && e.playerId === playerId) || e.name === name
            );
            const updatedEntry = {
              playerId: playerId || undefined,
              name,
              bestStage,
              totalKills,
              playTimeSeconds,
              skinName,
              badgeColor,
              isBot: false,
              updatedAt: Date.now(),
            };

            if (idx >= 0) {
              const prev = realPlayers[idx];
              realPlayers[idx] = {
                ...updatedEntry,
                bestStage: Math.max(prev.bestStage || 0, bestStage),
                totalKills: Math.max(prev.totalKills || 0, totalKills),
                playTimeSeconds: Math.max(ensurePlayTime(prev), playTimeSeconds),
              };
            } else {
              realPlayers.push({
                ...updatedEntry,
                playTimeSeconds: Math.max(ensurePlayTime(updatedEntry), playTimeSeconds),
              });
            }

            realPlayers.sort((a, b) => b.bestStage - a.bestStage || b.totalKills - a.totalKills);
            realPlayers = realPlayers.slice(0, 100);
            await saveRealPlayers(env, kvKey, weekKey, realPlayers);
          }
        } catch {
          // Ignore malformed JSON
        }
      }

      const top10 = buildTop10(realPlayers);
      const activeTop10 = buildActiveTop10(realPlayers);
      return new Response(
        JSON.stringify({
          weekKey,
          nextResetAtMs,
          top10,
          activeTop10,
          realPlayerCount: realPlayers.length,
          storage: env && env.MOB_CONTROL_LEADERBOARD ? 'kv' : 'memory',
        }),
        {
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
          },
        }
      );
    }

    // 1. Try serving static assets directly or proxying from Baota origin (yinosites.com)
    if (env && env.ASSETS) {
      const assetResp = await env.ASSETS.fetch(request);
      if (assetResp.status !== 404) {
        return assetResp;
      }
    }

    let path = url.pathname;
    if (path === "/" || path === "") {
      path = "/previews/mob-control/index.html";
    } else if (!path.startsWith("/previews/mob-control/")) {
      path = "/previews/mob-control" + (path.startsWith("/") ? path : "/" + path);
    }
    const targetUrl = "https://yinosites.com" + path + url.search;
    return fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
    });
  },
};
