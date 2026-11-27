// Service Worker v0.7.63
// 策略：
// - HTML / JS / CSS / 数据：先联网（条件请求，没变只回 304），断网或服务器出错（5xx）才用本版预缓存。
// - 图：先用本机存的，没有才下载；缓存随版本号整体更换。
// - 旧版缓存只在这一版装好、接手时才删（activate）；页面里不删，装到一半断网还能用旧版。
// - 两份预缓存清单由 scripts/build-precache.mjs 生成，不要手改。

const CACHE_VERSION = 'mengling-v0.7.63';
const VERSION = CACHE_VERSION.split('-v')[1];
const CORE_CACHE = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// 首屏必需：缺一个就不安装，继续用旧版
const CORE_URLS = [
  './',
  './app.js',
  './assets/bg-camp-night.jpg',
  './assets/ui/app_logo.webp',
  './assets/ui/camp_stage_night.jpg',
  './assets/ui/favicon-32.png',
  './assets/ui_icons/catnip.webp',
  './assets/ui_icons/commandCenter.webp',
  './assets/ui_icons/expeditionPost.webp',
  './assets/ui_icons/field.webp',
  './assets/ui_icons/hut.webp',
  './assets/ui_icons/library.webp',
  './assets/ui_icons/minerals.webp',
  './assets/ui_icons/science.webp',
  './assets/ui_icons/searchFlare.webp',
  './assets/ui_icons/shinyCharm.webp',
  './assets/ui_icons/sootheBell.webp',
  './assets/ui_icons/tab_bonfire.webp',
  './assets/ui_icons/tab_capture.webp',
  './assets/ui_icons/tab_dex.webp',
  './assets/ui_icons/tab_future.webp',
  './assets/ui_icons/tab_mons.webp',
  './assets/ui_icons/tab_pve.webp',
  './assets/ui_icons/tab_trophy.webp',
  './assets/ui_icons/wood.webp',
  './data/beasts.js',
  './main.js',
  './modules/abilities.js',
  './modules/analytics.js',
  './modules/app/boot.js',
  './modules/app/boss_bully.js',
  './modules/app/capture_award.js',
  './modules/app/capture_flow.js',
  './modules/app/capture_system.js',
  './modules/app/core_fns.js',
  './modules/app/core_helpers.js',
  './modules/app/dom_refs.js',
  './modules/app/game_state.js',
  './modules/app/lazy_panel.js',
  './modules/app/leaderboard_core.js',
  './modules/app/leaderboard_data.js',
  './modules/app/log_ui.js',
  './modules/app/mon_helpers.js',
  './modules/app/options_goals.js',
  './modules/app/privacy_panel.js',
  './modules/app/render_loop.js',
  './modules/app/save_cloud.js',
  './modules/app/server_buffs_ui.js',
  './modules/app/storage.js',
  './modules/app/ticker.js',
  './modules/app/ui_state.js',
  './modules/app/wiring.js',
  './modules/audio/sound_engine.js',
  './modules/automation.js',
  './modules/avatar_guard.js',
  './modules/beast_data.js',
  './modules/beast_defs.js',
  './modules/beast_tier.js',
  './modules/cloud_save.js',
  './modules/config.js',
  './modules/defs_buildings.js',
  './modules/defs_core.js',
  './modules/defs_eras.js',
  './modules/defs_resources.js',
  './modules/defs_tech_core.js',
  './modules/error_handler.js',
  './modules/evo_utils.js',
  './modules/expedition_defs.js',
  './modules/guide.js',
  './modules/item_usage.js',
  './modules/legal_status.js',
  './modules/mons.js',
  './modules/name_filter.js',
  './modules/name_filter_words.js',
  './modules/own_numbers_compat.js',
  './modules/pve_battle.js',
  './modules/remote_config.js',
  './modules/render/buildings.js',
  './modules/render/capture.js',
  './modules/render/log.js',
  './modules/render/overlays.js',
  './modules/render/resources.js',
  './modules/render/rpg_svg_icons.js',
  './modules/render/server_buff_bar.js',
  './modules/render/tab_stages.js',
  './modules/render/tech.js',
  './modules/save_codec.js',
  './modules/save_forward.js',
  './modules/sprites.js',
  './modules/stars.js',
  './modules/state.js',
  './modules/systems/ball_catch.js',
  './modules/systems/breeding.js',
  './modules/systems/collection/away_registry.js',
  './modules/systems/collection/bakery_park.js',
  './modules/systems/collection/boutique_amber.js',
  './modules/systems/collection/camp.js',
  './modules/systems/collection/core.js',
  './modules/systems/collection/dock_observatory.js',
  './modules/systems/collection/island_voyage.js',
  './modules/systems/collection/spring_library.js',
  './modules/systems/collection_fun.js',
  './modules/systems/compute_derived.js',
  './modules/systems/effects.js',
  './modules/systems/era.js',
  './modules/systems/expedition.js',
  './modules/systems/gameplay_fun.js',
  './modules/systems/mon_stats.js',
  './modules/systems/newbie_compass.js',
  './modules/systems/production.js',
  './modules/systems/pve_tower.js',
  './modules/systems/pvp_narrative.js',
  './modules/systems/rebirth.js',
  './modules/systems/server_buffs.js',
  './modules/systems/world_presence.js',
  './modules/tab_badges.js',
  './modules/tabs/bonfire_tab.js',
  './modules/tabs/buildings_tab.js',
  './modules/tabs/capture_tab.js',
  './modules/tabs/tabs_controller.js',
  './modules/tabs/tech_tab.js',
  './modules/tech_defs.js',
  './modules/tech_req_hint.js',
  './modules/tick.js',
  './modules/type_chart.js',
  './modules/type_skills.js',
  './modules/type_zh.js',
  './modules/ui/stage_interactions.js',
  './modules/utils.js',
  './site.webmanifest',
  './styles.css',
];

// 按需面板等：下不到不影响安装，打开时再下
const EXTRA_URLS = [
  './assets/ui/favicon-64.png',
  './modules/friends.js',
  './modules/pve_defs.js',
  './modules/pvp_battle.js',
  './modules/render/dex.js',
  './modules/render/future.js',
  './modules/render/leaderboard.js',
  './modules/render/mons.js',
  './modules/render/shiny_share.js',
  './modules/render/social.js',
  './modules/social.js',
  './modules/systems/mon_release.js',
  './modules/systems/npc_pvp.js',
  './modules/tabs/dex_tab.js',
  './modules/tabs/functions_tab.js',
  './modules/tabs/future_tab.js',
  './modules/tabs/help_tab.js',
  './modules/tabs/items_tab.js',
  './modules/tabs/leaderboard_tab.js',
  './modules/tabs/mons_tab.js',
  './modules/tabs/pve_tab.js',
  './modules/tabs/social_tab.js',
];

// 改过名的素材：还开着的旧页面按旧地址要时给新文件
const RENAMED_ASSETS = {
  '/assets/ui_icons/pokeball.webp': '/assets/ui_icons/spiritOrb.webp',
};

// 缓存键去掉 ?v= / ?retry=：缓存名已带版本号，同一文件只存一份；.html 去掉，Pages 会跳到不带扩展名的地址
const keyOf = (url) => {
  const u = new URL(url, self.location.href);
  return u.origin + u.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
};

// Pages 没有 404.html 时，缺的文件会回「200 + 首页」。要的是脚本 / 图却拿到网页，就是没拿到：不存，有存货用存货
const isPage = (key) => !/\.[a-z0-9]+$/i.test(new URL(key).pathname);
const wrongKind = (key, res) => !isPage(key) && /^text\/html/i.test(res.headers.get('content-type') || '');
const storable = (key, res) => res.status === 200 && !res.redirected && !wrongKind(key, res);

const precache = (cache, url) =>
  fetch(new Request(new URL(url, self.location.href), { cache: 'no-cache' })).then((res) => {
    const key = keyOf(url);
    if (!storable(key, res)) throw new Error(`precache ${url}: ${res.status}`);
    return cache.put(key, res);
  });

const fromCache = (key) =>
  caches.open(CORE_CACHE)
    .then((cache) => cache.match(key))
    .then((hit) => hit || caches.open(RUNTIME_CACHE).then((cache) => cache.match(key)));

// 预缓存是装这一版时的整套快照，之后不改（不然新版下到一半断网，新旧文件混在一起打不开）；其余进运行时缓存
const remember = (key, res) => {
  if (!storable(key, res)) return Promise.resolve();
  const copy = res.clone();
  return caches.open(CORE_CACHE)
    .then((core) => core.match(key))
    .then((hit) => hit || caches.open(RUNTIME_CACHE).then((cache) => cache.put(key, copy)))
    .catch(() => {});
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE)
      .then((cache) =>
        Promise.all(CORE_URLS.map((url) => precache(cache, url)))
          .then(() => Promise.allSettled(EXTRA_URLS.map((url) => precache(cache, url)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CORE_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function imageResponse(event, url) {
  const key = keyOf(url);
  const load = () => fetch(url).then((res) => {
    event.waitUntil(remember(key, res));
    return res;
  });
  // 页面是别的版本（新版刚打开，旧的还没换下来）：图可能换过，先联网
  const v = new URL(url).searchParams.get('v');
  if (v && v !== VERSION) return load().catch((err) => fromCache(key).then((hit) => hit || Promise.reject(err)));
  return fromCache(key).then((hit) => hit || load());
}

// 断网时没存过的地址：根目录下的网址给首页；子目录的不给（首页里的相对地址会全部指错）
const offlinePage = (request, key) =>
  request.mode === 'navigate' && /^\/[^/]*$/.test(new URL(key).pathname) ? fromCache(keyOf('./')) : undefined;

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 非同源请求直接走网络
  if (url.origin !== self.location.origin) return;

  // API 请求：只走网络，不缓存
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ ok: false, error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  if (request.method !== 'GET' || request.headers.has('range')) return;

  if (RENAMED_ASSETS[url.pathname]) {
    event.respondWith(imageResponse(event, new URL(RENAMED_ASSETS[url.pathname], url).href));
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(imageResponse(event, request.url));
    return;
  }

  // HTML / JS / CSS / 数据：先联网，失败退回本版缓存（首页断网也能打开）
  const key = keyOf(request.url);
  event.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then((res) => {
        if (res.status >= 500 || (res.status === 200 && wrongKind(key, res))) return fromCache(key).then((hit) => hit || res);
        event.waitUntil(remember(key, res));
        return res;
      })
      .catch(() =>
        fromCache(key)
          .then((hit) => hit || offlinePage(request, key))
          .then((hit) => hit || new Response('Offline', { status: 503 }))
      )
  );
});
