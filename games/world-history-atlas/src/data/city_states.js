// Representative independent city-states, oasis states, maritime republics, and port polities.
// Each entry's [from, to) marks the historical span during which the city existed as an independent or autonomous city-state.
// Coordinates (x, y) use the world-map SVG projection (Natural Earth 50m) and fall inside their regionId polygon.
window.HistoryAtlas = window.HistoryAtlas || {};

window.HistoryAtlas.CITY_STATES = [
  // 苏美尔与叙利亚早期城邦
  { id: "uruk", name: "乌鲁克", regionId: "lower_mesopotamia", x: 706.8, y: 186.8, from: -3000, to: -2334, note: "苏美尔早王朝最大城邦与伊南娜神庙中心，出早期楔形文字泥板，前2334年并入阿卡德帝国。" },
  { id: "ur", name: "乌尔", regionId: "lower_mesopotamia", x: 710.2, y: 189.4, from: -2900, to: -2334, note: "苏美尔南部滨海大城，早王朝王陵出土精美金银礼器，前2334年为萨尔贡兼并。" },
  { id: "kish", name: "基什", regionId: "lower_mesopotamia", x: 703.2, y: 180.2, from: -2900, to: -2334, note: "两河中游偏北重镇，“基什之王”称号在早王朝时期象征诸城盟主地位。" },
  { id: "lagash", name: "拉格什", regionId: "lower_mesopotamia", x: 712.4, y: 186.0, from: -2600, to: -2334, note: "苏美尔东南强邦（含吉尔苏），与温马长期争夺灌溉渠水与边界，留有秃鹫碑铭文。" },
  { id: "umma", name: "温马", regionId: "lower_mesopotamia", x: 708.8, y: 183.6, from: -2600, to: -2334, note: "苏美尔中部城邦，末代城邦主卢伽尔扎吉西曾短暂统合诸城，旋败于阿卡德王萨尔贡。" },
  { id: "ebla", name: "埃勃拉", regionId: "syria", x: 669.6, y: 163.4, from: -2600, to: -2240, note: "叙利亚北部青铜早期城邦王国，王宫泥板档案库记载其与两河及埃及的广域贸易。" },

  // 迦南与青铜晚期黎凡特城邦
  { id: "jericho", name: "耶利哥", regionId: "judea", x: 663.8, y: 184.2, from: -3000, to: -1550, note: "约旦河谷绿洲设防城邦，早中青铜时代筑有厚重石墙与斜坡护城设施，约前16世纪中叶毁弃。" },
  { id: "megiddo", name: "美吉多", regionId: "judea", x: 662.2, y: 180.6, from: -2500, to: -1457, note: "扼守伊兹列平原商路要冲的迦南城邦，前1457年美吉多之战后臣服于埃及新王国。" },
  { id: "hazor", name: "夏琐", regionId: "judea", x: 664.8, y: 178.0, from: -2000, to: -1250, note: "上加利利规模最大的迦南城邦，中晚青铜时代与马里、巴比伦往来密切，前13世纪后期焚毁。" },
  { id: "ugarit", name: "乌加里特", regionId: "syria", x: 665.1, y: 164.5, from: -1800, to: -1185, note: "东地中海国际贸易港邦，使用楔形字母泥板，约前1185年毁于青铜时代晚期崩溃。" },

  // 腓尼基城邦
  { id: "byblos", name: "比布鲁斯", regionId: "phoenicia", x: 664.6, y: 171.6, from: -2800, to: -539, note: "腓尼基古港（古巴勒），长期向埃及出口黎巴嫩雪松并转运纸莎草，前539年后归入波斯行省。" },
  { id: "sidon", name: "西顿", regionId: "phoenicia", x: 663.6, y: 174.6, from: -1200, to: -351, note: "腓尼基航海与玻璃工艺名城，铁器时代自治兴盛，前351年反抗波斯起义失败焚城。" },
  { id: "tyre", name: "推罗", regionId: "phoenicia", x: 663.7, y: 177.2, from: -1200, to: -332, note: "腓尼基岛城霸主与紫红染料中心，建立迦太基等海外殖民点，前332年为亚历山大筑堤攻陷。" },

  // 古希腊城邦
  { id: "athens", name: "雅典", regionId: "greece", x: 613.2, y: 152.6, from: -750, to: -338, note: "阿提卡民主制城邦与提洛同盟盟主，古典希腊学术艺术中心，前338年喀罗尼亚战后受制于马其顿。" },
  { id: "sparta", name: "斯巴达", regionId: "greece", x: 607.0, y: 156.9, from: -750, to: -195, note: "拉科尼亚军事寡头制城邦与伯罗奔尼撒同盟盟主，前195年反纳比斯战争后并入亚该亚同盟。" },
  { id: "corinth", name: "科林斯", regionId: "greece", x: 608.6, y: 153.2, from: -750, to: -338, note: "扼守科林斯地峡双港的商业造船强邦，前338年为马其顿驻军控制要塞。" },
  { id: "thebes", name: "底比斯", regionId: "greece", x: 610.8, y: 150.0, from: -750, to: -335, note: "维奥蒂亚同盟主导城邦，前371年留克特拉之战击败斯巴达称霸，前335年为亚历山大攻毁。" },
  { id: "miletus", name: "米利都", regionId: "west_anatolia", x: 628.1, y: 154.6, from: -750, to: -494, note: "爱奥尼亚十二城重镇与古希腊自然哲学发源地，广建黑海殖民城，前494年败于波斯被毁。" },
  { id: "syracuse", name: "叙拉古", regionId: "south_italy", x: 575.9, y: 157.1, from: -734, to: -212, note: "西西里最富庶的希腊殖民城邦，曾击溃雅典远征军，前212年为罗马攻占。" },

  // 伊特鲁里亚与拉丁城市
  { id: "veii", name: "维爱", regionId: "central_italy", x: 563.4, y: 131.6, from: -750, to: -396, note: "伊特鲁里亚十二城邦南端强城，与早期罗马隔台伯河争雄，前396年城陷并入罗马。" },
  { id: "tarquinia", name: "塔尔奎尼亚", regionId: "central_italy", x: 560.2, y: 130.0, from: -750, to: -281, note: "伊特鲁里亚海港城邦与彩绘墓葬重镇，前281年战败臣服于罗马共和国。" },
  { id: "praeneste", name: "普雷内斯泰", regionId: "central_italy", x: 566.4, y: 133.2, from: -700, to: -338, note: "拉丁同盟主要设防山城，前338年拉丁战争后丧失独立外交权并入罗马体系。" },

  // 玛雅城邦
  { id: "tikal", name: "蒂卡尔", regionId: "mesoamerica", x: 242.5, y: 256.5, from: -200, to: 900, note: "佩滕低地玛雅大城邦（穆图尔王国），古典期与卡拉克穆尔长期争霸，9世纪末荒废。" },
  { id: "calakmul", name: "卡拉克穆尔", regionId: "mesoamerica", x: 241.5, y: 251.5, from: -200, to: 900, note: "坎佩切丛林“蛇之王朝”都城，通过联姻与附庸网络抗衡蒂卡尔，约900年前后衰废。" },
  { id: "copan", name: "科潘", regionId: "mesoamerica", x: 245.5, y: 266.0, from: 426, to: 822, note: "玛雅东南边疆天文学与雕塑名城，存象形文字阶梯，426年立王朝，9世纪初瓦解。" },
  { id: "palenque", name: "帕伦克", regionId: "mesoamerica", x: 233.5, y: 254.5, from: 431, to: 800, note: "玛雅西部城邦（巴卡尔王国），巴加尔大帝在位期建筑与铭文艺术极盛，约800年停止立碑。" },
  { id: "chichen_itza", name: "奇琴伊察", regionId: "mesoamerica", x: 246.0, y: 241.0, from: 750, to: 1221, note: "尤卡坦半岛古典晚期至后古典早期玛雅中心城邦，13世纪初霸权为马亚潘取代。" },

  // 意大利中世纪与文艺复兴城市共和国
  { id: "venice", name: "威尼斯", regionId: "north_italy", x: 562.7, y: 114.0, from: 697, to: 1797, note: "亚得里亚海商业共和国，长期垄断东地中海香料丝绸转运，1797年为拿破仑终结。" },
  { id: "genoa", name: "热那亚", regionId: "north_italy", x: 548.2, y: 119.1, from: 1099, to: 1797, note: "利古里亚海事共和国与近代银行业先驱，在黑海与爱琴海广设商站，1797年改组终结。" },
  { id: "florence", name: "佛罗伦萨", regionId: "central_italy", x: 558.4, y: 122.6, from: 1115, to: 1532, note: "托斯卡纳自治城市共和国、毛纺金融中心与文艺复兴摇篮，1532年改制为世袭公国。" },
  { id: "milan", name: "米兰", regionId: "north_italy", x: 549.4, y: 113.8, from: 1097, to: 1535, note: "伦巴第同盟核心自治公社（后演变为米兰公国），1535年斯福尔扎绝嗣后归哈布斯堡直辖。" },

  // 汉萨同盟主要城市
  { id: "luebeck", name: "吕贝克", regionId: "saxony", x: 556.4, y: 71.0, from: 1226, to: 1669, note: "汉萨同盟核心自由市与总议会所在地，1226年获帝国自由市特权，主导波罗的海贸易。" },
  { id: "hamburg", name: "汉堡", regionId: "saxony", x: 552.6, y: 72.8, from: 1189, to: 1669, note: "易北河口北海枢纽自由市，1241年与吕贝克结盟奠定汉萨同盟基石。" },
  { id: "bremen", name: "不来梅", regionId: "saxony", x: 547.7, y: 74.8, from: 1186, to: 1669, note: "威悉河口自治商业城市，1186年获皇家特许状确认市民自治，后为汉萨同盟重镇。" },
  { id: "danzig", name: "但泽", regionId: "poland", x: 590.6, y: 69.0, from: 1361, to: 1669, note: "维斯瓦河口谷物与琥珀出口大港（格但斯克），汉萨同盟普鲁士区首席自治港市。" },

  // 斯瓦希里海岸城邦
  { id: "kilwa", name: "基尔瓦", regionId: "east_africa", x: 680.7, y: 370.1, from: 957, to: 1505, note: "东非海岸强盛的斯瓦希里苏丹城邦，掌控索法拉黄金转口贸易并自铸钱币，1505年遭葡军攻占。" },
  { id: "mombasa", name: "蒙巴萨", regionId: "east_africa", x: 682.0, y: 347.1, from: 1000, to: 1505, note: "东非印度洋季风贸易良港城邦，与波斯湾及印度西岸通商密切，1505年遭葡舰队攻掠。" },

  // 西域绿洲城邦
  { id: "loulan", name: "楼兰", regionId: "tarim", x: 900.3, y: 139.3, from: -200, to: 448, note: "罗布泊西岸丝路咽喉绿洲城邦（前77年改名鄯善），448年为北魏万度归所灭。" },
  { id: "khotan", name: "于阗", regionId: "tarim", x: 857.2, y: 156.7, from: -200, to: 1006, note: "塔里木南道和田玉产地与佛教绿洲王国（尉迟王族），1006年为喀喇汗王朝攻灭。" },
  { id: "kucha", name: "龟兹", regionId: "tarim", x: 870.4, y: 133.1, from: -200, to: 648, note: "塔里木北道大邦，以克孜尔石窟、龟兹乐与鸠摩罗什译经闻世，648年唐平龟兹列安西四镇。" },
  { id: "shule", name: "疏勒", regionId: "tarim", x: 840.1, y: 144.7, from: -200, to: 648, note: "葱岭东麓丝路南北两道交汇绿洲城邦，贞观二十二年后纳入唐安西都护府四镇体系。" },

  // 东南亚港口国家
  { id: "langkasuka", name: "狼牙修", regionId: "malacca", x: 950.2, y: 303.0, from: 100, to: 682, note: "马来半岛北部早期印度化港口邦国（见《梁书》），控扼克拉地峡跨洋转运，7世纪末入室利佛逝圈。" },
  { id: "temasek", name: "单马锡", regionId: "malacca", x: 961.3, y: 323.5, from: 1299, to: 1398, note: "马六甲海峡南端港口小国（今新加坡，《岛夷志略》有载），约1398年末王拜里米苏拉北迁建满剌加。" },
  { id: "malacca_port", name: "满剌加", regionId: "malacca", x: 954.3, y: 319.6, from: 1400, to: 1511, note: "马六甲海峡季风香料总埠，与明朝郑和船队通好，1511年为葡萄牙阿尔布克尔克攻占。" },
  { id: "palembang", name: "旧港", regionId: "malacca", x: 965.0, y: 342.5, from: 1377, to: 1520, note: "苏门答腊巨港自治商埠（室利佛逝故地），明永乐五年（1407）于此置旧港宣慰司。" }
];
