// 按需面板：第一次打开某个页签才下载它的模块（首屏不下载）。
// 下载时面板顶上显示「正在打开」，失败显示「重试」；模块到手后 setup 只跑一次，之后 render 与原来直接调用一致。
// preload() 是空闲时的静默预取：不弹提示，失败不算数，真正打开时再试。

// 换地址也没下到就改成「刷新页面」：浏览器会记住失败的模块地址，面板自己再 import 的文件换不了地址，重试永远失败
const RELOAD_AFTER = 2;

/** 更新后旧页面拿到新模块会缺导出（SyntaxError），重试没用，只能刷新；没联网时不劝人刷新（没装离线版的会整页打不开） */
export function needsReload(err, tries, online = typeof navigator === "undefined" || navigator.onLine !== false) {
  return err instanceof SyntaxError || err?.fatal === true || (online && tries >= RELOAD_AFTER);
}

export function createLazyPanel({ load, setup, getHost, isActive = () => true, reload = () => window.location.reload() }) {
  let render = null;
  let pending = null;
  let silent = false;
  let tries = 0;
  let lastErr = null;
  let notice = null;
  let noticeText = "";

  function clearNotice() {
    notice?.remove();
    notice = null;
    noticeText = "";
  }

  function showNotice(text, btnText, onClick) {
    const host = getHost?.();
    if (!host?.parentElement) return;
    if (notice && noticeText === text) return; // 每帧都会走到这里：内容没变就别重建按钮，否则点击会落空
    noticeText = text;
    if (!notice) {
      notice = document.createElement("div");
      notice.className = "lazyPanelNotice";
      notice.setAttribute("role", "status");
      host.parentElement.insertBefore(notice, host);
    }
    notice.textContent = "";
    const label = document.createElement("span");
    label.textContent = text;
    notice.appendChild(label);
    if (!btnText) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn--primary btn--small";
    btn.textContent = btnText;
    btn.addEventListener("click", onClick);
    notice.appendChild(btn);
  }

  function showState() {
    if (render) clearNotice();
    else if (pending) showNotice("正在打开…");
    else if (lastErr) {
      if (needsReload(lastErr, tries)) showNotice("没打开，刷新一下页面就好", "刷新", reload);
      else showNotice("没打开，网络不太好", "重试", () => { open(); });
    }
  }

  function start(quiet) {
    if (render) return Promise.resolve(true);
    if (pending) {
      if (!quiet) silent = false;
      return pending;
    }
    silent = quiet;
    // 失败过的模块地址浏览器可能记住失败结果，重试换一个查询串
    pending = Promise.resolve()
      .then(() => load(tries ? `?retry=${tries}` : ""))
      .then((mods) => {
        try {
          render = setup(mods);
        } catch (err) {
          err.fatal = true; // 事件可能已挂了一半，再跑一遍会挂两份
          throw err;
        }
        lastErr = null;
        return true;
      })
      .catch((err) => {
        if (!silent || needsReload(err, 0)) lastErr = err;
        tries += 1;
        console.error("[lazy panel]", err);
        return false;
      })
      .then((ok) => {
        pending = null;
        if (!silent) showState();
        return ok;
      });
    return pending;
  }

  function open(...args) {
    if (render) return render(...args);
    const p = start(false);
    showState();
    p.then((ok) => {
      if (ok && isActive()) render(...args);
    });
    return undefined;
  }

  return {
    /** 与原 renderX 同用法：每帧都可调用 */
    render: (...args) => {
      if (render) return render(...args);
      if (pending && !silent) return undefined;
      if (!pending && lastErr) {
        showState(); // 失败后等玩家点，不自己反复下载
        return undefined;
      }
      return open(...args);
    },
    preload: () => start(true),
    isReady: () => Boolean(render),
  };
}

/** 空闲时逐个预取，省流量模式不预取 */
export function preloadWhenIdle(panels, { delayMs = 1500 } = {}) {
  if (typeof navigator !== "undefined" && navigator.connection?.saveData) return;
  const idle = typeof requestIdleCallback === "function" ? (cb) => requestIdleCallback(cb, { timeout: 4000 }) : (cb) => setTimeout(cb, 200);
  const queue = [...panels];
  const next = () => {
    const p = queue.shift();
    if (!p) return;
    idle(() => p.preload().then(next));
  };
  setTimeout(next, delayMs);
}
