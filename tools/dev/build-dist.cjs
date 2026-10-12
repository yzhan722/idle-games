// 构建静态发布目录 dist/ —— 白名单制:只拷运行时需要的文件
//   node tools/dev/build-dist.cjs
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(ROOT, "dist");

const INCLUDE_DIRS = ["js", "lib", "res"];
const INCLUDE_FILES = [
	"index.html",
	"config.js",
	"core.js",
	"game.js",
	"i18n.js",
	"server.json",
	"version.json",
	"build.version.json"
];

function copyDir(src, dst) {
	fs.mkdirSync(dst, { recursive: true });
	for (const e of fs.readdirSync(src, { withFileTypes: true })) {
		const s = path.join(src, e.name), d = path.join(dst, e.name);
		if (e.isDirectory()) { copyDir(s, d); }
		else { fs.copyFileSync(s, d); }
	}
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const f of INCLUDE_FILES) {
	fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
}
for (const d of INCLUDE_DIRS) {
	copyDir(path.join(ROOT, d), path.join(OUT, d));
}
let count = 0, bytes = 0;
(function walk(d) {
	for (const e of fs.readdirSync(d, { withFileTypes: true })) {
		if (e.isDirectory()) { walk(path.join(d, e.name)); }
		else { count++; bytes += fs.statSync(path.join(d, e.name)).size; }
	}
})(OUT);
console.log(`dist/ ready: ${count} files, ${(bytes / 1048576).toFixed(1)} MB`);
