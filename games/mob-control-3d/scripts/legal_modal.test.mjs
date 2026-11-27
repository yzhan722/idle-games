// 隐私说明 / 用户协议弹层的键盘与焦点：node --test scripts/legal_modal.test.mjs（假 DOM，不开浏览器）
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './lib/load_ts.mjs';

class FakeEl {
  constructor(tag) {
    Object.assign(this, { tag, children: [], attrs: {}, dataset: {}, handlers: {}, tabIndex: -1, textContent: '' });
    const set = new Set();
    this.classList = { add: (c) => set.add(c), remove: (c) => set.delete(c), contains: (c) => set.has(c) };
    Object.defineProperty(this, 'className', {
      get: () => [...set].join(' '),
      set: (v) => {
        set.clear();
        v.split(/\s+/).filter(Boolean).forEach((c) => set.add(c));
      },
    });
  }
  setAttribute(k, v) {
    this.attrs[k] = v;
  }
  append(...c) {
    this.children.push(...c);
  }
  appendChild(c) {
    this.children.push(c);
  }
  replaceChildren() {
    this.children = [];
  }
  addEventListener(type, fn) {
    this.handlers[type] = fn;
  }
  focus() {
    globalThis.document.activeElement = this;
  }
  click() {
    this.handlers.click?.({ stopPropagation() {}, target: this });
  }
}

const links = ['privacy', 'terms'].map((id) => Object.assign(new FakeEl('button'), { dataset: { legal: id } }));
const body = new FakeEl('body');
let onKey = null;
globalThis.window = { addEventListener: (type, fn, capture) => assert.ok(type === 'keydown' && capture) ?? (onKey = fn) };
globalThis.document = { activeElement: body, body, createElement: (t) => new FakeEl(t), querySelectorAll: () => links };

const { M } = await loadTs({ M: 'src/legal/LegalModal.ts' });
M.bindLegalLinks();

const press = (code) => {
  const e = { code, swallowed: false, prevented: false, stopImmediatePropagation: () => (e.swallowed = true), preventDefault: () => (e.prevented = true) };
  onKey(e);
  return e;
};
const modal = () => body.children[0];
const isOpen = () => !modal().classList.contains('hidden');
const parts = () => {
  const card = modal().children[0];
  return { text: card.children.find((c) => c.className === 'legal-body'), close: card.children.find((c) => c.tag === 'button') };
};

test('打开后焦点在正文（可滚动），Tab 只在正文与关闭之间走', () => {
  links[0].focus();
  links[0].click();
  assert.ok(isOpen());
  const { text, close } = parts();
  assert.equal(text.tabIndex, 0);
  assert.equal(document.activeElement, text);
  const tab = press('Tab');
  assert.ok(tab.swallowed && tab.prevented);
  assert.equal(document.activeElement, close);
  press('Tab');
  assert.equal(document.activeElement, text);
});

test('战斗 / 主菜单快捷键全被挡住，但不拦默认行为（方向键还能滚、回车还能点关闭）', () => {
  for (const code of ['Space', 'Enter', 'KeyQ', 'KeyC', 'KeyV', 'KeyF', 'ArrowDown', 'F1']) {
    const e = press(code);
    assert.ok(e.swallowed && !e.prevented, code);
  }
  assert.ok(isOpen());
});

test('Esc / 关闭按钮 / 点遮罩都能关，关后焦点还给入口，快捷键恢复', () => {
  press('Escape');
  assert.ok(!isOpen());
  assert.equal(document.activeElement, links[0]);
  assert.equal(press('Space').swallowed, false);

  links[1].focus();
  links[1].click();
  parts().close.click();
  assert.ok(!isOpen());
  assert.equal(document.activeElement, links[1]);

  links[0].click();
  modal().handlers.click({ stopPropagation() {}, target: parts().text });
  assert.ok(isOpen());
  modal().handlers.click({ stopPropagation() {}, target: modal() });
  assert.ok(!isOpen());
  assert.equal(body.children.length, 1);
});
