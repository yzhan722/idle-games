// save-core.js — 存档读写与相册裁剪的纯规则（不碰 DOM；storage 由外面传进来，浏览器与 node 单测共用）
//
// 【为什么要有「要紧存档」】
// 浏览器的本地存储满了以后 setItem 会抛错，整份存档写不进去，以前是悄悄丢掉。
// 现在平时先占一小块固定长度的位置；整份真写不进时，把等级 / 亲密 / 金币 / 装扮 / 武器这些
// 原地覆盖写进那一块（长度不变，不需要新空间）。下次读档时哪份新用哪份补；整份又写得进去之后把它清回空的。

export const PET_SAVE_KEY = 'ar_deepseek_pet_v2';
export const PET_CORE_KEY = 'ar_deepseek_pet_core_v1';
export const PET_CORE_CHARS = 3072;

const CORE_FIELDS = [
  'level',
  'xp',
  'xpNext',
  'bond',
  'coins',
  'hunger',
  'starsCollected',
  'ownedDress',
  'equipped',
  'placedFurniture',
  'activeToy',
  'weapons',
  'bestShiftRecord',
  'topicsChatted'
];

export function isQuotaError(e) {
  return Boolean(e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014));
}

function parseObject(text) {
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch (e) {
    return null;
  }
}

function toSeq(v) {
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
}

function pickCore(data) {
  const out = {};
  for (const k of CORE_FIELDS) if (data[k] !== undefined) out[k] = data[k];
  return out;
}

const padCore = (text) => text.padEnd(PET_CORE_CHARS);
const blankCore = () => padCore('{}');

export function openPetStore(getStorage) {
  let seq = 0;
  let coreUsed = false;
  return {
    read() {
      try {
        const storage = getStorage();
        const full = parseObject(storage.getItem(PET_SAVE_KEY)) || {};
        const rawCore = storage.getItem(PET_CORE_KEY);
        const core = parseObject(rawCore);
        const fullSeq = toSeq(full.saveSeq);
        const coreSeq = toSeq(core && core.saveSeq);
        seq = Math.max(fullSeq, coreSeq);
        coreUsed = coreSeq > 0;
        if (rawCore === null) {
          try {
            storage.setItem(PET_CORE_KEY, blankCore());
          } catch (e) {}
        }
        return coreSeq > fullSeq ? { ...full, ...pickCore(core) } : full;
      } catch (e) {
        return {};
      }
    },
    // state：'full' 整份写进去了 / 'core' 只写进了要紧的 / 'none' 都没写进去
    write(data) {
      const next = seq + 1;
      let storage = null;
      try {
        storage = getStorage();
        storage.setItem(PET_SAVE_KEY, JSON.stringify({ ...data, saveSeq: next }));
      } catch (e) {
        const quota = isQuotaError(e);
        try {
          storage.setItem(PET_CORE_KEY, padCore(JSON.stringify({ ...pickCore(data), saveSeq: next })));
          seq = next;
          coreUsed = true;
          return { state: 'core', quota };
        } catch (e2) {
          return { state: 'none', quota };
        }
      }
      seq = next;
      if (coreUsed) {
        try {
          storage.setItem(PET_CORE_KEY, blankCore());
          coreUsed = false;
        } catch (e) {}
      }
      return { state: 'full', quota: false };
    }
  };
}

function dropOldestUnpinned(list) {
  for (let i = list.length - 1; i >= 0; i--) {
    if (!list[i].pinned) return [...list.slice(0, i), ...list.slice(i + 1)];
  }
  return null;
}

// 相册裁到 max 张再存（list 新的在前）：超出或存不下时，从最早的没钉住的开始让，钉住的不动
// 存不下最多让 maxDrop 张；还是不行就不再删，saved=false
export function fitAlbum(list, max, trySave, maxDrop = 3) {
  let base = [...list];
  while (base.length > max) base = dropOldestUnpinned(base) || base.slice(0, -1);
  let cur = base;
  for (let n = 0; ; n++) {
    if (trySave(cur)) return { list: cur, saved: true };
    const next = n < maxDrop && cur.length > 1 ? dropOldestUnpinned(cur) : null;
    if (!next) return { list: base, saved: false };
    cur = next;
  }
}

// 比耶自动拍（AR-COM3）：'auto' 以后自动拍 / 'tap' 只在我点时拍 / '' 还没问过（第一次比耶时先问）
// 老存档没有这个键 = 还没问过：第一次比耶先出说明，不直接拍
export const PEACE_SNAP_KEY = 'ar_deepseek_peace_snap_v1';

export function readPeaceSnapChoice(getStorage) {
  try {
    const v = getStorage().getItem(PEACE_SNAP_KEY);
    return v === 'auto' || v === 'tap' ? v : '';
  } catch (e) {
    return '';
  }
}

// 存不进去（无痕模式、存储满）也不报错：这次打开照选的来，下次再问
export function savePeaceSnapChoice(getStorage, choice) {
  if (choice !== 'auto' && choice !== 'tap') return false;
  try {
    getStorage().setItem(PEACE_SNAP_KEY, choice);
    return true;
  } catch (e) {
    return false;
  }
}

// 比耶比够了时做什么：snap 拍 / ask 先问 / off 不拍
export function peaceSnapAction(choice) {
  if (choice === 'auto') return 'snap';
  if (choice === 'tap') return 'off';
  return 'ask';
}
