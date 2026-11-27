// 排行榜 Tab 事件（DOM only）
// 维护者窗口：D

import { checkName } from "../name_filter.js";

const NAME_REFUSED = "这个名字不能用，换一个";

export function initLeaderboardTab({
  elLeaderboard,
  ui,
  LB_NAME_KEY,
  LB_AVATAR_KEY,
  avatarFileToDataUrl,
  markLeaderboardDirty,
  render,
  submitScoreAndRefresh,
  getState,
  addRes,
  addLog,
  dexCaughtUnique,
  activateTab,
}) {
  if (!elLeaderboard) return;

  // 改名：命中屏蔽词（辱骂、色情、仇恨、冒充官方）不保存，离开输入框时退回上一个名字
  elLeaderboard.addEventListener("input", (ev) => {
    const nameInp = ev.target?.closest?.("input[data-lb-name]");
    if (!nameInp || !elLeaderboard.contains(nameInp)) return;
    const value = String(nameInp.value || "");
    const allowed = checkName(value).ok;
    nameInp.classList.toggle("is-invalid", !allowed);
    nameInp.title = allowed ? "" : NAME_REFUSED;
    if (!allowed) return;
    ui.lbName = value;
    try {
      localStorage.setItem(LB_NAME_KEY, ui.lbName);
    } catch {
    }
  });
  elLeaderboard.addEventListener("change", (ev) => {
    const nameInp = ev.target?.closest?.("input[data-lb-name]");
    if (!nameInp || !elLeaderboard.contains(nameInp) || checkName(nameInp.value).ok) return;
    nameInp.value = ui.lbName || "";
    nameInp.classList.remove("is-invalid");
    nameInp.title = "";
    if (typeof addLog === "function") addLog(NAME_REFUSED, true);
  });

  elLeaderboard.addEventListener("change", async (ev) => {
    const fileInp = ev.target?.closest?.("input[type=file][data-lb-avatar]");
    if (!fileInp || !elLeaderboard.contains(fileInp)) return;
    const f = fileInp.files && fileInp.files[0] ? fileInp.files[0] : null;
    if (!f) return;
    try {
      const url = await avatarFileToDataUrl(f);
      ui.lbAvatar = url;
      try {
        localStorage.setItem(LB_AVATAR_KEY, ui.lbAvatar);
      } catch {
      }
      markLeaderboardDirty();
      render();
    } catch {
      ui.lbErr = "头像处理失败";
      markLeaderboardDirty();
      render();
    } finally {
      try {
        fileInp.value = "";
      } catch {
      }
    }
  });

  elLeaderboard.addEventListener("click", (ev) => {
    const foldBtn = ev.target?.closest?.("button[data-lb-fold]");
    if (foldBtn && elLeaderboard.contains(foldBtn)) {
      const k = foldBtn.getAttribute("data-lb-fold");
      if (k === "dex") ui.lbDexFolded = !ui.lbDexFolded;
      if (k === "power") ui.lbPowerFolded = !ui.lbPowerFolded;
      if (k === "contrib") ui.lbContribFolded = !ui.lbContribFolded;
      if (k === "hatch") ui.lbHatchFolded = !ui.lbHatchFolded;
      if (k === "shiny") ui.lbShinyFolded = !ui.lbShinyFolded;
      if (k === "totalPower") ui.lbTotalPowerFolded = !ui.lbTotalPowerFolded;
      if (k === "gather") ui.lbGatherFolded = !ui.lbGatherFolded;
      if (k === "resource") ui.lbResourceFolded = !ui.lbResourceFolded;
      if (k === "catch") ui.lbCatchFolded = !ui.lbCatchFolded;
      if (k === "rebirths") ui.lbRebirthFolded = !ui.lbRebirthFolded;
      markLeaderboardDirty();
      render();
      return;
    }
    const lbBtn = ev.target?.closest?.("button[data-lb-act]");
    if (!lbBtn || !elLeaderboard.contains(lbBtn)) return;
    const act = lbBtn.getAttribute("data-lb-act");
    if (act === "submit") {
      submitScoreAndRefresh();
      return;
    }
    if (act === "pickAvatar") {
      const inp = elLeaderboard.querySelector("input[type=file][data-lb-avatar]");
      inp?.click?.();
      return;
    }
  });
}
