//上线前审计:全 JS 文件的 $I 引用 vs 三语键库 + 键库间漂移 + 死键
var fs = require("fs"), path = require("path");
var zh = JSON.parse(fs.readFileSync("res/i18n/zh.json", "utf8"));
var cr = JSON.parse(fs.readFileSync("res/i18n/crowdin/zh.json", "utf8"));
var en = JSON.parse(fs.readFileSync("res/i18n/en.json", "utf8"));

// 1) 收集所有 js 里的字面 $I('key') 引用
var keyRefs = {}, dynRefs = [];
function scan(dir){
	fs.readdirSync(dir).forEach(function(f){
		var p = path.join(dir, f);
		if (fs.statSync(p).isDirectory()){ return scan(p); }
		if (!/\.(js|jsx)$/.test(f) || /node_modules|test|\.test\.|selfcheck|\.cjs$/.test(p)) { return; }
		var src = fs.readFileSync(p, "utf8"), m;
		var re = /\$I\(\s*['"]([^'"]+)['"]/g;
		while ((m = re.exec(src))){ keyRefs[m[1]] = (keyRefs[m[1]]||0)+1; }
		var re2 = /\$I\(\s*['"]([^'"]+)['"]\s*\+/g;
		while ((m = re2.exec(src))){ dynRefs.push(p + ":" + m[1]); }
	});
}
["js", "game.js", "core.js"].forEach(function(p){
	if (fs.statSync(p).isDirectory()){ scan(p); } else { scan(path.dirname(p)||"."); }
});

var missing = [];
Object.keys(keyRefs).forEach(function(k){
	if (zh[k] === undefined || en[k] === undefined){ missing.push(k); }
});
console.log("=== 字面 $I 键:", Object.keys(keyRefs).length, "zh/en 缺失:", missing.length);
missing.forEach(function(k){
	console.log("  MISS", k, "| zh:" + (zh[k]!==undefined), "en:" + (en[k]!==undefined), "cr:" + (cr[k]!==undefined));
});

// 2) 三语键库漂移(全键域)
var zhKeys = Object.keys(zh), crKeys = Object.keys(cr), enKeys = Object.keys(en);
var zhOnly = zhKeys.filter(k => cr[k] === undefined);
var crOnly = crKeys.filter(k => zh[k] === undefined);
var zhVsEn = zhKeys.filter(k => en[k] === undefined);
var enVsZh = enKeys.filter(k => zh[k] === undefined);
console.log("\n=== 键库漂移 ===");
console.log("zh 有 crowdin 无:", zhOnly.length, zhOnly.slice(0,15));
console.log("crowdin 有 zh 无:", crOnly.length, crOnly.slice(0,15));
console.log("zh 有 en 无:", zhVsEn.length, zhVsEn.slice(0,15));
console.log("en 有 zh 无:", enVsZh.length, enVsZh.slice(0,10));

// 3) 动态前缀(误报源,列出供人工核对)
console.log("\n=== 动态键前缀:", dynRefs.length);
dynRefs.slice(0,20).forEach(function(d){ console.log("  ", d); });

// 4) zh.json 里残留的猫/英文味
var catHits = [];
zhKeys.forEach(function(k){
	var v = zh[k];
	if (typeof v === "string" && /猫|kitten|catnip|zebra|斑马|Cat|Kitten/.test(v)){ catHits.push(k + " = " + v.slice(0,60)); }
});
console.log("\n=== zh 残留猫/zebra 文案:", catHits.length);
catHits.slice(0,25).forEach(function(h){ console.log("  ", h); });
