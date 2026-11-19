/**
 * MobileMenu — 手机端精简：顶栏只留年份与搜索，底部只留播放与时间轴，
 * 其余功能（人物视角、纪年志、编年史、对比图志、战区镜头、速度、图层开关、复位、配乐）收进一个菜单。
 * 菜单项直接调用 window.AtlasApp 上已有的方法；开关状态读取桌面版按钮的 active 状态，二者始终一致。
 */
(function () {
  const HA = window.HistoryAtlas = window.HistoryAtlas || {};
  const app = () => window.AtlasApp || {};
  const isOn = id => { const el = document.getElementById(id); return Boolean(el && el.classList.contains("active")); };

  function build() {
    const sheet = document.createElement("div");
    sheet.id = "mobile-menu";
    sheet.className = "mobile-menu is-hidden";
    const theaters = (HA.THEATERS || []).map(t => `<button type="button" data-th="${t.id}">${t.name}</button>`).join("");
    sheet.innerHTML = `
      <div class="mm-box" role="dialog" aria-label="功能菜单">
        <div class="mm-head"><span>功能</span><button type="button" class="mm-close" aria-label="关闭">×</button></div>
        <div class="mm-sec"><div class="mm-title">浏览</div><div class="mm-grid">
          <button type="button" data-fn="openPersonPicker">◎ 人物视角</button>
          <button type="button" data-fn="toggleChinaAnnals">§ 中国纪年志</button>
          <button type="button" data-fn="openChronicleModal">❖ 编年史大库</button>
          <button type="button" data-fn="openCompareModal">◈ 帝国兴衰图志</button>
        </div></div>
        <div class="mm-sec"><div class="mm-title">战区镜头</div><div class="mm-grid">${theaters}</div></div>
        <div class="mm-sec"><div class="mm-title">播放速度</div><div class="mm-grid mm-speed">
          ${[0.5, 1, 2, 5].map(s => `<button type="button" data-speed="${s}">${s}x</button>`).join("")}
        </div></div>
        <div class="mm-sec"><div class="mm-title">图层与其他</div><div class="mm-grid">
          <button type="button" data-toggle="toggleRoutes" data-state="btn-routes">⇌ 商路脉络</button>
          <button type="button" data-toggle="toggleCampaigns" data-state="btn-campaigns">⇄ 进军线</button>
          <button type="button" data-toggle="toggleIdleDrift" data-state="btn-drift">✧ 挂机漫游</button>
          <button type="button" data-fn="resetCamera">⊕ 复位视野</button>
          <button type="button" data-toggle="toggleMusic" data-state="btn-music">♫ 背景配乐</button>
          <button type="button" data-fn="toggleTheme">◐ 纸本 / 夜色</button>
        </div></div>
      </div>`;
    document.body.appendChild(sheet);

    const close = () => sheet.classList.add("is-hidden");
    const refresh = () => {
      sheet.querySelectorAll("[data-state]").forEach(b => b.classList.toggle("is-on", isOn(b.dataset.state)));
      sheet.querySelectorAll("[data-speed]").forEach(b => b.classList.toggle("is-on", isOn("btn-" + b.dataset.speed + "x")));
    };
    sheet.addEventListener("click", e => {
      if (e.target === sheet || e.target.closest(".mm-close")) { close(); return; }
      const b = e.target.closest("button");
      if (!b) return;
      const a = app();
      if (b.dataset.fn && typeof a[b.dataset.fn] === "function") { close(); a[b.dataset.fn](); return; }
      if (b.dataset.th && a.focusTheater) { close(); a.focusTheater(b.dataset.th); return; }
      if (b.dataset.speed && a.setSpeed) { a.setSpeed(Number(b.dataset.speed)); refresh(); return; }
      if (b.dataset.toggle && typeof a[b.dataset.toggle] === "function") { a[b.dataset.toggle](); refresh(); }
    });

    const btn = document.getElementById("btn-mobile-menu");
    if (btn) btn.addEventListener("click", () => { refresh(); sheet.classList.remove("is-hidden"); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
