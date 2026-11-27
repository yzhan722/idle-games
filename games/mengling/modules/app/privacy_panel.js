// 设置页「隐私与账号」：匿名统计开关（正式版首次询问一次） + 退出所有设备（点两次） + 注销账号（两步确认：点开弹窗 → 再输用户名和密码）
// 维护者窗口：A

import { LEGAL_DRAFT, legalLabel } from "../legal_status.js";

/** 用户名原样一致且密码非空才放开「永久删除」 */
export function canConfirmDelete({ username, typedName, password }) {
  return Boolean(username) && String(typedName || "").trim() === username && String(password || "").trim().length > 0;
}

/** 服务端错误 → 玩家看得懂的话 */
export function deleteErrorText(err) {
  const msg = String(err?.message || "");
  if (err?.status === 403) return "密码不对";
  if (err?.status === 400) return "用户名不一致";
  if (err?.status === 429) return "试得太频繁，10 分钟后再来";
  if (err?.status === 401) return "登录已过期，请重新登录";
  if (!err?.status) return "没连上服务器，什么都没删，稍后再试";
  return `没删成：${msg || "未知错误"}`;
}

export function logoutAllErrorText(err) {
  if (err?.status === 429) return "试得太频繁，10 分钟后再来";
  if (err?.status === 401) return "登录已过期，本机已退出";
  if (!err?.status) return "没连上服务器，没有退出";
  return "没退成，稍后再试";
}

const LOGOUT_ALL_LABEL = "退出所有设备";
const LOGOUT_ALL_ARMED = "再点一次，全部退出";
const LOGOUT_ALL_ARM_MS = 5000;

/** 两步确认：第一次点变成「再点一次」，5 秒不点就复原 */
export function initLogoutAll({ cloudSave, hint, addLog, onDone, doc = document, setTimer = setTimeout, clearTimer = clearTimeout }) {
  const btn = doc.getElementById("btnLogoutAll");
  if (!btn) return;
  let armed = 0;
  let busy = false;
  const disarm = () => {
    if (armed) clearTimer(armed);
    armed = 0;
    btn.textContent = LOGOUT_ALL_LABEL;
  };
  btn.addEventListener("click", async () => {
    if (busy) return;
    if (!cloudSave.isLoggedIn()) {
      disarm();
      hint?.("还没有登录。", 2000);
      return;
    }
    if (!armed) {
      btn.textContent = LOGOUT_ALL_ARMED;
      armed = setTimer(disarm, LOGOUT_ALL_ARM_MS);
      hint?.("这台和其他设备都会退出，要重新登录。", 3000);
      return;
    }
    disarm();
    busy = true;
    btn.disabled = true;
    try {
      await cloudSave.logoutAll();
      onDone?.();
      addLog?.("所有设备都已退出，重新登录才能同步。本机存档还在。", true);
      hint?.("所有设备都已退出", 3000);
    } catch (e) {
      onDone?.();
      hint?.(logoutAllErrorText(e), 3000);
    } finally {
      busy = false;
      btn.disabled = false;
    }
  });
}

export const DM_LABEL_ON = "私信：只收好友";
export const DM_LABEL_OFF = "私信：所有人";

/** 「只收好友私信」开关（ML-COM3，默认开，存在服务器）：没登录时显示默认值，点了提示先登录 */
export function initDmFriendsOnly({ cloudSave, lbBaseUrl, hint, doc = document, fetchImpl = (...a) => fetch(...a) }) {
  const btn = doc.getElementById("btnDmFriendsOnly");
  if (!btn) return null;
  let on = true;
  let busy = false;
  let loadedFor = ""; // 读到的是哪次登录的设置；换了账号先重读再切换
  const paint = () => {
    btn.textContent = on ? DM_LABEL_ON : DM_LABEL_OFF;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  };
  const call = async (method, body) => {
    const base = typeof lbBaseUrl === "function" ? lbBaseUrl() : "";
    const res = await fetchImpl(`${base}/api/social/prefs`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cloudSave.getToken()}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw Object.assign(new Error(data?.error || `HTTP ${res.status}`), { status: res.status });
    return data || {};
  };
  const load = async () => {
    if (!cloudSave.isLoggedIn()) {
      on = true;
      paint();
      return;
    }
    try {
      on = (await call("GET")).dmFriendsOnly !== false;
      loadedFor = cloudSave.getToken();
    } catch {
      // 读不到就按默认值显示
    }
    paint();
  };
  btn.addEventListener("click", async () => {
    if (busy) return;
    if (!cloudSave.isLoggedIn()) {
      hint?.("登录后才能设置", 2000);
      return;
    }
    busy = true;
    btn.disabled = true;
    try {
      if (loadedFor !== cloudSave.getToken()) await load();
      const data = await call("PUT", { dmFriendsOnly: !on });
      on = data.dmFriendsOnly !== false;
      paint();
      hint?.(on ? "只收好友的私信" : "所有人都能给你发私信", 2000);
    } catch (e) {
      hint?.(e?.status === 429 ? "太频繁了，歇一会儿再试" : e?.status === 503 ? "这个功能还没开通" : "没改成，稍后再试", 2400);
    } finally {
      busy = false;
      btn.disabled = false;
    }
  });
  paint();
  load();
  return { load };
}

export function initPrivacyPanel({ analytics, cloudSave, hint, addLog, onAccountDeleted, onLoggedOutAll = onAccountDeleted, lbBaseUrl, doc = document, draft = LEGAL_DRAFT }) {
  initLogoutAll({ cloudSave, hint, addLog, onDone: onLoggedOutAll, doc });
  initDmFriendsOnly({ cloudSave, lbBaseUrl, hint, doc });
  doc.querySelectorAll("[data-legal]").forEach((el) => {
    el.textContent = legalLabel(el.getAttribute("data-legal") || "");
  });

  const toggle = doc.getElementById("btnAnalyticsToggle");
  const paintToggle = () => {
    if (!toggle) return;
    const on = analytics.isEnabled();
    toggle.textContent = on ? "匿名统计：开" : "匿名统计：关";
    toggle.setAttribute("aria-pressed", on ? "true" : "false");
  };
  toggle?.addEventListener("click", () => {
    analytics.setEnabled(!analytics.isEnabled());
    paintToggle();
    hint?.(analytics.isEnabled() ? "匿名统计已打开" : "匿名统计已关闭，未发出的记录已清空", 2000);
  });
  paintToggle();

  // 正式版第一次打开问一次；两个按钮一样大，不选就当没同意
  const ask = doc.getElementById("analyticsAskOverlay");
  if (ask && analytics.shouldAsk?.(draft)) {
    const answer = (on) => {
      analytics.setEnabled(on);
      ask.hidden = true;
      paintToggle();
    };
    doc.getElementById("btnAnalyticsYes")?.addEventListener("click", () => answer(true));
    doc.getElementById("btnAnalyticsNo")?.addEventListener("click", () => answer(false));
    ask.hidden = false;
  }

  const overlay = doc.getElementById("accountDeleteOverlay");
  const nameEl = doc.getElementById("accountDeleteName");
  const passEl = doc.getElementById("accountDeletePassword");
  const okBtn = doc.getElementById("btnAccountDeleteConfirm");
  const cancelBtn = doc.getElementById("btnAccountDeleteCancel");
  const statusEl = doc.getElementById("accountDeleteStatus");
  if (!overlay || !nameEl || !passEl || !okBtn) return;

  let busy = false;
  const say = (t) => {
    if (statusEl) statusEl.textContent = t;
  };
  const refresh = () => {
    okBtn.disabled = busy || !canConfirmDelete({ username: cloudSave.getUsername(), typedName: nameEl.value, password: passEl.value });
  };
  const close = () => {
    if (busy) return;
    overlay.hidden = true;
    nameEl.value = "";
    passEl.value = "";
    say("");
    refresh();
  };

  doc.getElementById("btnAccountDelete")?.addEventListener("click", () => {
    if (!cloudSave.isLoggedIn()) {
      hint?.("没有登录，先登录要注销的账号。", 2400);
      return;
    }
    close();
    overlay.hidden = false;
    nameEl.focus?.();
  });
  nameEl.addEventListener("input", refresh);
  passEl.addEventListener("input", refresh);
  cancelBtn?.addEventListener("click", close);

  okBtn.addEventListener("click", async () => {
    const typedName = String(nameEl.value || "").trim();
    const password = String(passEl.value || "").trim(); // 注册和登录时也去了首尾空格
    if (busy || !canConfirmDelete({ username: cloudSave.getUsername(), typedName, password })) return;
    busy = true;
    refresh();
    say("删除中…");
    try {
      await cloudSave.deleteAccount({ confirm: typedName, password });
      busy = false;
      close();
      onAccountDeleted?.();
      addLog?.("账号已注销，服务器记录已删除。本机存档还在。", true);
      hint?.("账号已注销", 3000);
    } catch (e) {
      busy = false;
      say(deleteErrorText(e));
      refresh();
    }
  });
}
