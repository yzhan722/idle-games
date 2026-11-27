import { LEGAL_DOCS, LEGAL_DRAFT, type LegalDocId } from './LegalDocs';

let modalEl: HTMLElement | null = null;
let bodyEl: HTMLElement | null = null;
let closeEl: HTMLElement | null = null;
let openerEl: HTMLElement | null = null;

function isOpen(): boolean {
  return Boolean(modalEl && !modalEl.classList.contains('hidden'));
}

export function closeLegalDoc(): void {
  if (!isOpen()) return;
  modalEl?.classList.add('hidden');
  openerEl?.focus();
  openerEl = null;
}

function ensureModal(): HTMLElement {
  if (modalEl) return modalEl;
  const el = document.createElement('div');
  el.id = 'legal-modal';
  el.className = 'legal-modal hidden';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target === el) closeLegalDoc();
  });
  // 打开时吞掉全局快捷键（主菜单与战斗都在 window 上监听），只留 Esc 关闭；
  // Tab 只在正文与关闭按钮之间走，否则焦点会跑到后面的按钮上，回车就点到「进入工坊」
  window.addEventListener(
    'keydown',
    (e) => {
      if (!isOpen()) return;
      e.stopImmediatePropagation();
      if (e.code === 'Escape') {
        e.preventDefault();
        closeLegalDoc();
      } else if (e.code === 'Tab') {
        e.preventDefault();
        (document.activeElement === closeEl ? bodyEl : closeEl)?.focus();
      }
    },
    true
  );
  document.body.appendChild(el);
  modalEl = el;
  return el;
}

export function openLegalDoc(id: LegalDocId): void {
  const el = ensureModal();
  const doc = LEGAL_DOCS[id];
  el.replaceChildren();

  const card = document.createElement('div');
  card.className = 'legal-card';

  const title = document.createElement('h2');
  title.textContent = doc.title;
  card.appendChild(title);

  if (LEGAL_DRAFT) {
    const draft = document.createElement('p');
    draft.className = 'legal-draft';
    draft.textContent = '草案，尚未生效';
    card.appendChild(draft);
  }

  const body = document.createElement('div');
  body.className = 'legal-body';
  body.tabIndex = 0; // 打开后焦点落在正文上，方向键 / PageDown 直接滚动
  for (const section of doc.sections) {
    const h = document.createElement('h3');
    h.textContent = section.heading;
    const ul = document.createElement('ul');
    for (const item of section.items) {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    }
    body.append(h, ul);
  }
  card.appendChild(body);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'btn-primary legal-close';
  close.textContent = '关闭';
  close.addEventListener('click', closeLegalDoc);
  card.appendChild(close);

  el.appendChild(card);
  el.setAttribute('aria-label', doc.title);
  if (!isOpen()) openerEl = document.activeElement as HTMLElement | null;
  el.classList.remove('hidden');
  bodyEl = body;
  closeEl = close;
  body.focus();
}

/** 页面上任何带 data-legal="privacy|terms" 的按钮都能打开对应文本。 */
export function bindLegalLinks(): void {
  document.querySelectorAll<HTMLElement>('[data-legal]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.legal;
      if (id === 'privacy' || id === 'terms') openLegalDoc(id);
    });
  });
}
