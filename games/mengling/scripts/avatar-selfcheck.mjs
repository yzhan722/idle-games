// 头像只认本机压好的位图数据：外部网址、svg、脚本协议、超长都不存也不显示。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cleanAvatar } from "../functions/api/_avatar.js";
import { isLocalAvatar } from "../modules/avatar_guard.js";

const ok = "data:image/png;base64,iVBORw0KGgo=";
const bad = [
  "https://example.com/a.png", "//example.com/a.png", "http://example.com/x", "javascript:alert(1)",
  "data:image/svg+xml;base64,PHN2Zz4=", "data:text/html;base64,PGI+", 'data:image/png;base64,iVBOR" onerror="x',
  "./assets/trainer.png", "", null, 5, {},
];
assert.equal(cleanAvatar(ok), ok);
assert.equal(isLocalAvatar(ok), true);
for (const v of bad) {
  assert.equal(cleanAvatar(v), "", String(v));
  assert.equal(isLocalAvatar(v), false, String(v));
}
assert.equal(cleanAvatar("data:image/png;base64," + "A".repeat(200001)), "");
const submit = readFileSync(new URL("../functions/api/score/submit.js", import.meta.url), "utf8");
const board = readFileSync(new URL("../functions/api/leaderboard/[board].js", import.meta.url), "utf8");
assert.match(submit, /avatarDataUrl = cleanAvatar\(body\.avatar\)/);
assert.match(board, /cleanAvatar\(r\.avatarDataUrl\)/);
for (const f of ["modules/app/leaderboard_core.js", "modules/render/leaderboard.js"]) {
  const src = readFileSync(new URL("../" + f, import.meta.url), "utf8");
  assert.match(src, /isLocalAvatar\(/, f);
}
console.log("avatar-selfcheck: OK");
