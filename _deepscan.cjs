const zh=require('./res/i18n/zh.json');
// 原作词库:专有名词+机制词+星球名+资源英文名
const terms={
  '猫族/小猫':/猫|喵|kitten|feline|cath\b|nip\b|catpower/i,
  '独角兽系':/独角兽|unicorn|alicorn|necrocorn|ivory|象牙/i,
  '斑灵马系':/zebra|斑马/i,
  '利维坦':/leviathan|利维坦/i,
  '原作星名':/\bCath\b|\bYarn\b|\bDune\b|\bCharon\b|\bPiscine\b|\bTerminus\b|\bKairo\b|\bUmbra\b|\bCentaurus\b|\bHelios\b|Redmoon|Rorschach/i,
  '原作资源':/unobtainium|eludium|catnip|blackcoin|sorrow|titanium|uranium|thorium|kerosene|megalith|bloodstone|compedium|concrate|starchart|blueprint|tanker|scaffold|spice|furs|parchment|manuscript|microchip|plastic|ivory|relic/i,
  '原作组织/梗':/hissmeowra|HG\b|Holy Genocide|Alicornmancy|willenfluff|venus/i,
  '科技词':/光刻|电磁|纳米|核裂|聚变|反物质|强子|量子|卫星|火箭|轨道|空间站|太阳能|石油|炼油|抽油|塑料|芯片|涡轮|混凝土|低温|基因|病毒|实验室|粒子|裂变|超光速|黑洞|中子|夸克|弦论|引力波|计算机|算法|服务器|数据库|互联网|机器人|蒸汽机|内燃|引擎(?!之)|航空|航天|潜艇|坦克|雷达|激光|声波|疫苗|抗生素|细胞|基因|克隆/i,
};
const hits={};
for(const[k,v]of Object.entries(zh)){
  const s=String(v);
  for(const[name,re]of Object.entries(terms)){
    if(re.test(s)){(hits[name]=hits[name]||[]).push(k+' = '+s.slice(0,80));}
  }
}
for(const[name,list]of Object.entries(hits)){
  console.log('\n===== '+name+' ('+list.length+') =====');
  list.slice(0,40).forEach(l=>console.log(' ',l));
  if(list.length>40)console.log('  ... +'+(list.length-40));
}
