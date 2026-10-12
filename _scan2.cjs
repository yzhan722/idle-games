const zh=require('./res/i18n/zh.json');
// 词汇一致性:资源已改名,文案还在用旧名
const checks={
  '象牙(资源叫灵骨)':/象牙/,
  '反物质(资源叫湮灭精元)':/反物质/,
  '冥币(改玄晶币统一)':/冥币/,
  '阴煞(改玄泪统一)':/阴煞/,
  '圣麒麟(alicorn应是麟角)':/圣麒麟/,
  '死灵麒麟(necrocorn)':/死灵麒麟/,
  '黑洞(应归墟)':/黑洞/,
  '利维坦(应古神)':/利维坦/,
  '猫/喵':/猫|喵/,
  'kitten/cat英文':/[a-z]*kitten|\bcat\b|\bcats\b|cath\b|feline|nip/i,
  '煤(应玄炭)':/煤(?!炭)/,
  '石油(应地火灵液)':/石油/,
  '钛(应庚金)':/钛/,
  '铀/钍':/铀|钍/,
  '混凝土':/混凝土/,
  '独角兽':/独角兽/,
  '铁(非玄铁前缀)':/(?<!玄|生|精|玄精|陨)铁(?!匠|意|塔)/,
  'TBD/todo':/\bTBD\b|todo/i,
  'HG/圣戮':/\bHG\b/,
  '猫星/母星':/母星/,
};
for(const[name,re]of Object.entries(checks)){
  const list=Object.keys(zh).filter(k=>re.test(String(zh[k])));
  console.log('\n===== '+name+' ('+list.length+')');
  list.slice(0,25).forEach(k=>console.log(' ',k,'=',String(zh[k]).slice(0,90)));
}
