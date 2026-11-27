// 资源引用检查：node scripts/asset_refs.mjs [--json]（只读，不开浏览器）
// 列出：404 引用、大小写不一致的引用、public/ 里没人引用的文件、只被「没人用的图标键」引用的文件。
import { fileURLToPath } from 'node:url';
import { harvestExports, listFiles, publicUrls, read, scanLiteralRefs, stripQuery } from './lib/asset_scan.mjs';

export async function checkAssets() {
  const files = publicUrls();
  const exact = new Set(files);
  const lower = new Map(files.map((f) => [f.toLowerCase(), f]));
  const { refs, patterns } = scanLiteralRefs();
  const exportsMap = await harvestExports();

  const all = refs.map((r) => ({ ...r, url: stripQuery(r.url) }));
  for (const [name, urls] of exportsMap) for (const u of urls) all.push({ file: 'src/game', line: 0, name, url: stripQuery(u) });

  const missing = [];
  const wrongCase = [];
  const referenced = new Set();
  for (const r of all) {
    if (exact.has(r.url)) referenced.add(r.url);
    else if (lower.has(r.url.toLowerCase())) wrongCase.push({ ...r, actual: lower.get(r.url.toLowerCase()) });
    else missing.push(r);
  }
  // SkillIcons 里的小工具函数由上面的导出表精确展开；其余模板串按通配匹配
  const deadPatterns = [];
  for (const p of patterns.filter((x) => !x.helper)) {
    const hit = files.filter((f) => p.re.test(f));
    if (!hit.length) deadPatterns.push(p);
    hit.forEach((f) => referenced.add(f));
  }
  const unreferenced = files.filter((f) => !referenced.has(f));

  // 图标键写了但全项目没人用的：UI_ART.xxx 与整张表
  const code = listFiles('src', (f) => f.endsWith('.ts') && !f.endsWith('SkillIcons.ts')).map(read).join('\n');
  const iconsFile = read('src/game/SkillIcons.ts');
  const live = new Set();
  const idle = new Map();
  for (const [name, urls] of exportsMap) {
    if (name === 'UI_ART') continue;
    // 名字后面紧跟一个非标识符字符才算；UI_ART.x 这种带点的按字面找
    const uses = (text) => text.split(name).filter((rest, k) => k > 0 && !/^[A-Za-z0-9_$]/.test(rest)).length;
    const usedElsewhere = uses(code) > 0 || uses(iconsFile) > (name.includes('.') ? 0 : 1);
    for (const u of urls) (usedElsewhere ? live.add(stripQuery(u)) : idle.set(stripQuery(u), name));
  }
  refs.filter((r) => !r.file.endsWith('SkillIcons.ts')).forEach((r) => live.add(stripQuery(r.url)));
  patterns.filter((x) => !x.helper).forEach((p) => files.filter((f) => p.re.test(f)).forEach((f) => live.add(f)));
  const onlyIdleKeys = [...idle].filter(([u]) => !live.has(u) && exact.has(u)).map(([u, name]) => ({ url: u, name }));

  return { files, missing, wrongCase, deadPatterns, unreferenced, onlyIdleKeys, refCount: all.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await checkAssets();
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 1));
  else {
    const show = (title, list, fmt) => console.log(`\n${title}：${list.length}\n${list.map((x) => `  ${fmt(x)}`).join('\n')}`);
    console.log(`public/ ${r.files.length} 个文件，引用 ${r.refCount} 处`);
    show('404 引用', r.missing, (x) => `${x.url}  ← ${x.file}:${x.line}${x.name ? ` ${x.name}` : ''}`);
    show('大小写不一致', r.wrongCase, (x) => `${x.url} 应为 ${x.actual}  ← ${x.file}:${x.line}`);
    show('模板串一个文件都匹配不到', r.deadPatterns, (x) => `${x.text}  ← ${x.file}:${x.line}`);
    show('没人引用的文件', r.unreferenced, (x) => x);
    show('只被没人用的图标键引用的文件', r.onlyIdleKeys, (x) => `${x.url}  ← ${x.name}`);
  }
}
