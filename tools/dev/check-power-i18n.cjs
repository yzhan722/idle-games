var zh=require('./res/i18n/zh.json'),cr=require('./res/i18n/crowdin/zh.json'),en=require('./res/i18n/en.json');
['cultivation.power.label','cultivation.power.value','cultivation.rift.floorPower','cultivation.rift.yourPower','cultivation.msg.ambush.win','cultivation.msg.ambush.lose'].forEach(function(k){
  console.log(k,'| zh:'+!!zh[k],'cr:'+!!cr[k],'en:'+!!en[k],'|',(zh[k]||'').substring(0,40));
});
var src=require('fs').readFileSync('js/cultivation.js','utf8');
var keys={},re=/\$I\(['"]([^'"]+)['"]/g,m;
while((m=re.exec(src))){ keys[m[1]]=1; }
var missing=[];
Object.keys(keys).forEach(function(k){ if(!zh[k]||!en[k]) missing.push(k); });
console.log('total $I keys:',Object.keys(keys).length,'missing:',missing.length);
missing.slice(0,20).forEach(function(k){ console.log('  MISS:',k); });
