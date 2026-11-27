# 素材来源与商用依据（ML-COM1）

> 2026-11-26 核对。依据只取 git 记录、文件元数据和代码，查不到的写「未知，需核实」，不猜。
> 结论：**还不能算权利清白**。AI 生图用的是哪个工具、哪个账号、当时的服务条款，仓库里没有记录；另有一批立绘造型与第三方作品接近（第 2 节）。

## 1. 分类总表

| 类别 | 文件 | 来源（能查到的） | 商用依据 | 状态 |
|---|---|---|---|---|
| 萌灵立绘 160 | `assets/beasts/*.png`（160×160 透明底） | 全部由提交 `71da976e`（2026-10-23）加入，提交说明写「AI-generated … 160+160 original beast illustrations」；之后没有改过 | 未知，需核实：生图工具、账号、服务条款、提示词、有没有用参考图都没有记录 | 待核实 |
| 闪光立绘 160 | `assets/beasts_shiny/*.png` | 同上，同一提交 | 同上；是重新生图还是由普通版改色，未知 | 待核实 |
| 界面图标 156 | `assets/ui_icons/*.webp`（128×128） | 分批加入，见第 4 节；首批 64 枚的提交说明写「AI hand-painted RPG icon assets」 | 未知，需核实（同上） | 待核实 |
| 场景图 6 | `assets/ui/camp_stage_night.jpg`、`stage_*.jpg`（1376×768） | `71da976e`（2026-10-23，说明写 AI 生成）、`97a2986c`（2026-10-24） | 未知，需核实 | 待核实 |
| 标志与站点图标 | `assets/ui/app_logo.webp`、`favicon-*.png`、`apple-touch-icon.png`、`favicon.ico` | `81b1bd7c`（2026-10-24，说明写「AI hand-painted RPG favicon/app-logo」） | 未知，需核实 | 待核实 |
| 背景图 1 | `assets/bg-camp-night.jpg`（1600×1067，2026-11-26 由 1920×1280 原图缩小，原图备份在 `C:Project_workmenglingssets_before_resize`） | `26b2e45a`（2026-07-13）加入，早于 AI 美术批次，提交说明没写来源，文件无 EXIF | 未知，需核实；核实前建议换成已有场景图 | **存疑** |
| 像素小人 1 | `assets/trainer_pixel.svg` | `5d693f7a`（2026-07-10）初始提交；代码里没有引用 | 未知；未使用，建议删除 | **存疑** |
| 音频 | 无音频文件 | `modules/audio/sound_engine.js` 用 Web Audio 实时合成，旋律与和弦写在代码里 | 随本仓代码；和弦进行为通用进行 | 通过 |
| 字体 | 仓库内无字体文件 | `index.html` 从 Google Fonts 加载 Noto Sans SC、Rajdhani | 两款在 Google Fonts 上标注 SIL OFL 1.1；仓库内没有留许可文本，需核实后补 | 待补证 |
| 图鉴名、称号、图鉴志 | `data/beasts_zh.js` | 本仓手写（同 `71da976e`，后续改名见 `docs/RENAME_CHECKLIST.md`） | 本仓原创；家族概念与第三方作品平行，见清单第 4 节 | 待用户定 |
| 物种数值 | `data/beasts.js` | 捕获率、稀有度、基础属性、进化等级与材料由 `scripts/beast_rules.mjs` 的自有公式生成（0.7.60）；生态区与 9 系属性为本仓设定；第三方快照 `scripts/_srcdata/` 只供比对、不随站点发布 | 本仓原创 | 数值通过；进化关系 91 / 95 仍平行，待用户定 |

文件元数据：全部图片里没有找到 C2PA、XMP、EXIF、生成工具标记，无法从文件本身反推工具。

## 2. 建议重画的立绘（人工看过 160 张普通版缩略图，2026-11-26）

造型和第三方作品的对应角色太近，不管生图来源是否合规都建议换：

| 编号 | 名称 | 接近点 |
|---|---|---|
| 570 / 571 | 幻夜赤尾狐 / 诡影夜狐王 | 深灰黑狐 + 红颈毛，终段长红鬃人立，两阶造型几乎一一对应 |
| 113 | 祈福灵蛋兽 | 粉色蛋形身体，胸前抱一颗蛋 |
| 009 | 镇海重炮龟 | 龟壳两侧一对炮管 |
| 015 | 追风金枪蜂 | 黄黑蜂，双前肢为枪 |
| 143 / 446 | 酣眠山岳熊 / 贪睡小绒熊 | 青绿身、米色肚皮的大胃熊 |
| 151 | 幻梦祈愿灵 | 粉色长尾幼猫悬浮 |
| 702 | 星波圆耳鼠 | 橙色圆身鼠，脸侧电须 |
| 004 / 006 | 炽尾幼麟 / 焚天炽翼龙 | 红色幼龙尾端火焰，终段橙色双翼火龙 |
| 037 / 038 | 赤焰灯尾狐 / 九曜天狐 | 红色多尾幼狐 → 奶白多尾狐 |
| 547 | 扶摇风棉仙 | 棉团身体加一对绿角 |
| 182 | 晴空花舞姬 | 花瓣裙小人 |
| 011 / 014 | 凝翠星茧 / 金甲灵蛹 | 带眼睛的立茧 |

闪光版没有逐张看，按同样编号处理。`assets/beasts_hd` 槽位不存在，替换时直接覆盖同名文件即可。

## 3. 立绘逐文件来历

160 个普通版文件名与 `data/beasts_zh.js` 一一对应，160 个闪光版文件名相同；`git log` 显示每个文件只有 `71da976e` 一次写入。名单里的「Sheet」是 `data/beasts_zh.js` 的原画图集编号（原图集不在仓库里，来源：未知，需核实）。

| Sheet | 文件（编号 名称） |
|---|---|
| 01 | 001 青萝幼龙、002 翠冠森龙、003 森罗古龙、004 炽尾幼麟、005 烈爪炎龙、006 焚天炽翼龙、007 沧澜幼龟、008 漩涡玄龟、009 镇海重炮龟、010 翠玉灵蚕、011 凝翠星茧、012 幻彩星蝶、013 琥珀刺虫、014 金甲灵蛹、015 追风金枪蜂、016 云羽雏雀 |
| 02 | 017 疾风灵隼、018 苍穹羽皇、019 星穗松鼠、020 金穗领主鼠、172 闪闪幼鼠、025 星雷灵鼠、026 天雷御守鼠、027 星砂穿山崽、028 金刚刺甲兽、029 紫晶幼兔、030 紫棘灵兽、031 紫曜棘甲王、173 星露幼灵、035 月咏花仙、036 月华星后、037 赤焰灯尾狐 |
| 03 | 038 九曜天狐、174 绒音小团、039 星歌绒灵、040 天籁歌姬兽、041 幽谷夜蝠、042 影翼猎蝠、169 紫电四翼蝠、043 星夜曼陀芽、044 迷雾梦花、045 绯冠大王花、182 晴空花舞姬、052 招财星喵、053 金瞳灵豹、054 涟漪小鸭、055 沧澜灵鸭皇、058 炽焰幼犬 |
| 04 | 059 燎原炎狮犬、060 漩涡灵蚪、061 潮汐战蛙、062 怒涛武宗蛙、186 碧玉蛙皇、063 星眠小狐、064 念力灵狐、065 天机星圣狐、066 磐石武童、067 破岩战将、068 四臂金刚王、069 翠蔓灵芽、070 捕露藤灵、071 幽林捕蝇皇、074 晶簇岩球、075 陨铁滚岩兽 |
| 05 | 076 镇岳巨岩尊、077 星焰幼驹、078 逐日天马、079 梦游水獭、080 螺甲灵獭、199 沧海智者獭、081 星磁浮球、082 三联磁晶阵、462 苍穹磁暴舰、092 冥雾星魂、093 裂影鬼爪、094 噬影夜魔王、095 巨岩晶蛇、208 耀钢龙蛇、098 赤甲灵蟹、099 裂海巨钳王 |
| 06 | 104 荒骨幼狼、105 镇魂骨武士、111 重甲岩犀、112 破山钻角犀、464 熔岩巨甲犀、116 碧波小海马、117 棘冠海刺龙、230 沧溟海龙皇、120 辰光海星、121 紫微宝星皇、123 翠影双镰兽、212 赤金铁钳皇、129 金鳞跃波鲤、130 覆海苍龙、131 沧海颂歌龙、132 幻彩星泥 |
| 07 | 133 星绒幼狐、134 汐澜水狐、135 惊雷电狐、136 炽焰火狐、196 曜光星狐、197 幽月影狐、470 森语叶狐、471 霜华冰狐、700 绯星仙狐、137 星轨棱晶兽、233 虚空星核兽、474 超维星灵皇、147 云渊幼蛟、148 瑞霭灵龙、149 凌霄圣龙、150 太虚星蚀尊 |
| 08 | 151 幻梦祈愿灵、440 晨露福蛋崽、113 祈福灵蛋兽、242 圣光天佑兽、446 贪睡小绒熊、143 酣眠山岳熊、439 星戏小偶、122 幻镜星偶师、239 雷角幼灵、125 狂雷战兽、466 雷霆泰坦王、240 熔火幼兽、126 炽炎火灵兽、467 炼狱炎魔皇、194 溪岸笑笑鲵、195 沧泽憨憨鲵 |
| 09 | 360 乐天小蓝团、202 镇岳守心灵、216 新月蜜熊崽、217 啸月巨灵熊、228 冥火猎犬崽、229 炼狱魔狼王、258 跃浪小水鲵、259 踏浪岩鲵、260 裂海巨渊兽、285 森林小伞菇、286 疾风笠剑客、300 星尾粉喵、301 紫月贵妃喵、311 阳雷乐拍兔、312 阴雷乐拍兔、417 星电飞鼠 |
| 10 | 546 云絮小团、547 扶摇风棉仙、570 幻夜赤尾狐、571 诡影夜狐王、582 霜星幼晶、583 寒璇冰灵、584 极光双子晶、613 冰晶小雪熊、614 极地霜牙熊、659 灵耳掘地兔、660 裂地重锤兔、684 云糖绒球、685 星甜慕斯姬、702 星波圆耳鼠、710 幽火南瓜灵、711 夜宴南瓜爵 |

## 4. 图标加入批次

| 提交 | 数量 | 图标 |
|---|---|---|
| 277868d0 2026-10-24 | 64 | advSearchCell、affectionTreat、atkPotion、ballBench、ballFactory、berryPress、bigBerry、bottleCap、breedingHouse、catnip、commandCenter、defPotion、duskball、energyDrink、evolutionStone、expCandy、expCandyL、expCandyS、expCandyXL、expeditionPost、field、friendshipBracelet、futurecoin、goldBottleCap、granary、greatball、hpPotion、hugeBerry、hut、library、linkRope、luckyEgg、lumberYard、luxuryball、masterball、megaStone、mineralSilo、minerals、netball、quarry、quickball、rangerPost、rareCandy、researchLab、science、searchFlare、shinyCharm、sootheBell、spaPotion、spdPotion、spePotion、spiritOrb、storehouse、tab_bonfire、tab_capture、tab_dex、tab_future、tab_mons、tab_pve、tab_trophy、trainingGround、ultraball、wood、workshop |
| a9a779ff 2026-11-15 | 35 | accAuroraCrown、accCozyScarf、accFairyWings、amberFossilGem、amberRevivalPod、bondAtlas、boutiqueMirrorStar、campCookingPot、campPicnicBasket、campTentStar、corridorStarCrest、dishBerryTart、dishFlameSkewers、dishMoonSoup、dualSanctum、duoCombo、ecoAstral、ecoCaldera、ecoCanopy、ecoRelic、ecoTidepool、eugenicsCharm、expeditionMaster、leagueChampionRibbon、leagueEliteCrest、natalBond、primalClawTotem、primalShellTotem、sanctumBadge、seasonMark、shinyHall、starCorridorGate、swiftHatch、towerWeather、tuningMint |
| bf3c73f7 2026-11-19 | 50 | acrobatStage、bakeryOven、balloonIsles、balloonTicket、bandStage、bathBucket、buildHammer、campfireBadge、carouselRide、cloudCake、cloudPark、creekFish、dreamLibrary、dreamPage、driftBottle、ecoChampionHall、ecoTriCrest、fireflyLantern、fishingDock、fishingRod、fishingTrophy、hatchAura、hotSpring、instrumentSet、mapFragment、messengerBag、meteorSighting、migratingBird、migrationMedal、moonlitJournal、nightObservatory、nocturnalCrest、oceanPearlBadge、parkTicket、pictureBook、postOffice、postmarkStamp、rainbowBalloon、recipeCard、relaxTowel、seasonCompass、showStarTrophy、skyIsland、starCamp、starShellTreasure、tourTrophy、travelSouvenir、treasureIsland、treasureMap、wishBottleDock |
| 47e7f892 2026-11-20 | 7 | beeHive、beeWorkshop、hiveBadge、honeyJar、iceRink、rinkBuff、skateScore |

- `a9a779ff`、`bf3c73f7`、`47e7f892` 三批的提交说明没写图标来源：未知，需核实。
- 8 组图标是同一文件的副本（新入口复用旧图）：bandStage=carouselRide、campfireBadge=nocturnalCrest、campTentStar=starCamp、cloudPark=skyIsland、hiveBadge=sanctumBadge、mapFragment=parkTicket、meteorSighting=nightObservatory、showStarTrophy=skateScore。
- `spiritOrb.webp` 原名 `pokeball.webp`（2026-11-26 改名，内容未变）。

## 5. 用户要补的证据

1. 2026-10-23、10-24 生图用的工具、账号、付费档位，保存当时的服务条款（是否允许商用、输出归属）。
2. 原画图集 10 张与提示词；有没有喂过第三方参考图。
3. `bg-camp-night.jpg` 的出处；查不到就换。
4. 2026-11-15 之后三批图标的生成方式。
