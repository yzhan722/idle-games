# 分级自查草稿（`WL-COM3`，待用户审核，未提交任何问卷）

2026-11-26 按代码和图片查，没有打开游戏。路径相对 `games/worklife/`。这不是评级结果，最后以问卷系统给出的为准；法律结论由用户找专业人士确认。

## 逐条自查

| # | 问题 | 答案 | 证据 |
|---|---|---|---|
| 1 | 暴力 | 有，奇幻类。角色和怪物自动对打，扣血数字，击败后消失。没有血液和残肢画面 | 怪物 83 只（内容包 `monsters`）；看过 `frontend/src/assets/t1/monsters/` 全部插画，没有流血 |
| 2 | 对人类的暴力 | 有盔甲骑士、魔将类人形怪；没有对真实人物 | 同上；`shared/enhanced_content_pack_chinese.json` 怪物名「深渊魔将」「炼狱魔神」 |
| 3 | 恐怖 | 轻。有僵尸、幽灵、恶魔外形和名字 | `frontend/src/assets/t1/contract.ts:371`（沼泽僵尸）、`shared/enhanced_content_pack_chinese.json:2694`（号令亿万恶魔） |
| 4 | 略恶心的文字 | 有一处「沼泽僵尸的腐烂心脏」 | `shared/enhanced_content_pack_chinese.json:873` |
| 5 | 性与裸露 | 没有。看过 18 张角色立绘，两张短裙配长袜，没有裸露 | `frontend/src/assets/t1/character/`；搜「性感 / 内衣 / 泳装」0 处 |
| 6 | 粗话 | 没有 | `frontend/src`、`shared` 搜常见粗话 0 处 |
| 7 | 酒 | **有提及，能喝**。「佳酿」「醇酿」喝了加增益；酒馆玩法；「酒馆麦酒杯」图标 | `shared/enhanced_content_pack_chinese.json:3896、3919`、`frontend/src/gameplay/bardTavern.ts:206、208`、`frontend/src/assets/t1/contract.ts:291` |
| 8 | 烟草、毒品 | 没有。「狂战药剂」等是奇幻药水；「毒囊」是怪物材料 | `shared/enhanced_content_pack_chinese.json:862` |
| 9 | 赌博 / 模拟赌博 | 没有。搜「赌 / 下注 / 押注 / 彩票 / 老虎机 / 轮盘 / 抽奖」0 处；没有付筹码赢回筹码的玩法 | `frontend/src`、`backend/src`、`shared` |
| 10 | 随机物品与真钱 | 没有真钱。随机的有：补给箱（任务代币换）、怪物掉落、强化、垂钓、天候祈愿 | 见下表 |
| 11 | 付费、内购 | 没有 | `frontend/src/gameplay/legalDocs.ts:137`；搜支付关键词 0 处 |
| 12 | 用户交流 | **有**：世界、职业、队伍、私聊四种文字聊天；组队邀请；玩家市场；角色名公开 | `backend/src/chat_channels.ts:1、7-9`、`backend/src/storage_pg.ts:1493-1535`、`frontend/src/components/GameChatPanel.tsx:125` |
| 13 | 举报 / 屏蔽 / 过滤 | 有（2026-11-27）：聊天名字右键或长按可屏蔽（公聊、私聊、组队邀请都收不到，对方无感）、举报（原因 + 该频道内存里最近 20 条，存 90 天）；辱骂、色情、仇恨词打码；限频 3 秒 6 条、300 字 | `backend/src/chat_moderation.ts`、`backend/src/name_filter.ts`、`shared/blocked_words.json` |
| 14 | 名字规则 | 有。16 字、不许隐形字、不许冒充系统和官方；屏蔽词表（中英，人工可增删）建角改名不收、旧名打码 | `backend/src/display_name.ts`、`shared/blocked_words.json` |
| 15 | 位置 | 不用 | 搜 `geolocation` 0 处 |
| 16 | 摄像头、麦克风 | 不用 | 搜 `getUserMedia` 0 处 |
| 17 | 个人信息 | 收账号名、密码（散列）、随机编号；日志里有来源地址 | `backend/src/routes/auth.ts:51-58`，`_work/loop/6h/legal-check.md` 第四节 |
| 18 | 分享个人信息给他人 | 角色名公开；没起名显示「玩家_」加编号前 6 位；账号名不公开 | `backend/src/storage_pg.ts:1514`、`legal-check.md` 第四节第 10 条 |
| 19 | 广告 | 没有 | 搜广告关键词 0 处 |
| 20 | 外链 | 没有跳到外站的链接 | `frontend/src` 只有接口地址说明 `frontend/src/services/api.ts:737` |
| 21 | 未成年人规则 | **没写**，草案是待填 | `frontend/src/gameplay/legalDocs.ts:121-122` |

## 随机机制一览

| 机制 | 花什么 | 概率公示 |
|---|---|---|
| 补给箱 | 任务代币 15 | 有：「金币 800–1500 与 3 份消耗品（每份 4 种各 25%）」，由代码常量算出（`backend/src/tasks.ts` `CRATE_ODDS_TEXT`） |
| 行会谢礼 | 任务点 | 有：悬停提示「技能书 3 本各 33.3%」（`GIFT_BOOK_ODDS_TEXT`） |
| 装备强化 | 材料 | 有，写成功率（`EnhancementPanel.tsx:568`） |
| 采集产出 | 时间 | 有（`SkillActionList.tsx:100`） |
| 垂钓 | 鱼饵 | 有，鱼池几率（`HarborDerbyPanel.tsx:352、506`） |
| 天候祈愿 | 星晶尘 | 有（`BeastWeatherPanel.tsx:743、772`） |
| 技能书 | 打怪 | 有范围 0.1%～0.5%（`AbilityLoadoutPanel.tsx:235`） |

都用游戏内的东西，不能用钱买，也不能换成钱。玩家市场只用游戏金币。

## 会抬高分级或被拒的点

| 级别 | 点 | 最小改法（只列，不改） |
|---|---|---|
| 高 | ~~聊天没有举报、屏蔽、过滤~~ 2026-11-27 已加；私聊陌生人仍可直接发（被屏蔽才收不到） | 举报要有人看：配 `REPORTS_ADMIN_KEY` 并定谁来处理 |
| 高 | 未成年人规则是空的 | 用户定最低年龄；登录页加一行年龄说明 |
| 中 | 能喝的「佳酿」「醇酿」 | 改成「佳酿果饮」「醇香果饮」或同类，只改名字；麦酒杯图标换成果汁杯 |
| 中 | 没有素材来源清单，AI 生成披露写不出来 | 先补 `ASSETS_LICENSE.md` |
| 低 | 「腐烂心脏」 | 改成「沼泽之心」 |
| 低 | 炼狱、恶魔、堕天使类名字，部分地区敏感 | 待用户确认发行地区后再看 |
| 低 | ~~补给箱没写几率~~ 2026-11-27 已补 | — |

## 待用户确认

1. 最低年龄写多少，要不要监护人同意。
2. 聊天保留、限制还是先关。有聊天的游戏在多数问卷里会标「用户互动」，这是标签，不一定抬年龄。
3. 酒类名字改不改。
4. 以后卖会员时，如果会员给的东西里含补给箱或强化材料，随机和付费就连上了，要重答第 10、11 条。
