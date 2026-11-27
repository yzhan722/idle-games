// pet-chat.js — 轻对话题库、猜拳、掌心接饭
// 由 game.js 原样搬出（2026-11-26，AR-COM5 拆分）：只有函数声明，和初始化时不依赖其他文件的常量 / 变量。
// 会改写共享 let 的函数、绑定事件的顶层语句都留在 game.js。[[split N]] 记号给 tests/split_check.mjs 拼回比对用，别删。
import {
  vision,
  W,
  H,
  playSfx,
  gameMode,
  player,
  spawnInteractVfx,
  addCoins,
  setPlayerEmote,
  addAffectionXp,
  floatingTexts,
  catchItems,
  completeWish,
  drawerEl,
  dismissPolaroid,
  closeDrawer,
  setNapping,
  bindHudTap,
  switchMode,
  pomodoroRun,
  goodnightRun,
  polaroidCardEl,
  pendingPhotoSnapTimer,
  applyTopicOptionReaction,
  rpsChoiceBtns,
  rpsChoicesEl,
  isMemoryBookOpen
} from './game.js?v=hd60';
import {
  petAudio
} from './audio.js?v=hd31';
import {
  applyCallName
} from './intimacy.js?v=hd60';
import {
  windowAmbienceCardEl,
  dismissWindowAmbienceCard,
  pomodoroCardEl,
  foldOrHidePomodoroCard,
  teatimeCardEl,
  weeklyJournalCardEl,
  recordJournalActivity,
  dismissWeeklyJournalCard,
  dismissTeatimeCard,
  terrariumCardEl,
  goodnightCardEl,
  dismissTerrariumCard,
  foldOrHideGoodnightCard
} from './room-ar04-06.js?v=hd60';
import {
  collageCardEl,
  cozyRadioCardEl,
  dismissCollageCard,
  foldOrHideCozyRadioCard,
  crochetCardEl,
  hotCocoaCardEl,
  dismissCrochetCard,
  dismissHotCocoaCard,
  pressedFlowerCardEl,
  telescopeCardEl,
  dismissPressedFlowerCard,
  dismissTelescopeCard
} from './room-ar07-09.js?v=hd60';
import {
  isAr10CardOpen,
  dismissAr10Cards,
  isAr11CardOpen,
  dismissAr11Cards
} from './room-ar10-11.js?v=hd60';
import {
  isAr12CardOpen,
  dismissAr12Cards,
  isAr13CardOpen,
  dismissAr13Cards
} from './room-ar12-13.js?v=hd60';
import {
  isAr14CardOpen,
  dismissAr14Cards,
  isAr15CardOpen,
  dismissAr15Cards
} from './room-ar14-15.js?v=hd60';
import {
  isAr16CardOpen,
  dismissAr16Cards,
  isAr17CardOpen,
  dismissAr17Cards
} from './room-ar16-17.js?v=hd60';

// [[split 51]]

// 24 组治愈系日常话题轻对话题库（每题 3 分支：害羞撒娇 / 傲娇拌嘴 / 元气得意）
const PET_CHAT_TOPICS = [
  {
    id: 't01_late_code',
    tag: '深夜写码',
    prompt: '主人盯屏幕这么久啦，眼睛会不会酸呀？要我帮你守着光标吗~',
    options: [
      { label: '摸摸头休息两分钟', mood: 'shy', xp: 22, coins: 10, reply: '唔姆……手心暖乎乎的，充好电我们再一起出发~' },
      { label: '那你帮我把 Bug 吃掉！', mood: 'tsundere', xp: 18, coins: 12, reply: '哼！Bug 又不好吃，我只吃热乎乎的白米饭和便当！' },
      { label: '有你在旁边效率翻倍', mood: 'proud', xp: 20, coins: 12, reply: '那当然啦！我可是桌面首席蓝鲸督导官！' }
    ]
  },
  {
    id: 't02_milk_tea',
    tag: '下午茶',
    prompt: '咕噜噜……下午三点钟，空气里好像飘着三分糖珍珠奶茶的香气！',
    options: [
      { label: '请你喝温热的草莓鲜奶', mood: 'happy', xp: 22, coins: 10, reply: '好耶！第一口最甜的奶盖要和主人分一半~' },
      { label: '喝多了小心小肚子圆滚滚', mood: 'tsundere', xp: 18, coins: 12, reply: '才、才没有胖呢！这叫蓬松可爱的像素流体力学！' },
      { label: '干杯！喝完去摘星星', mood: 'cheer', xp: 20, coins: 14, reply: '吨吨吨满血复活！今天能一口气连跳三层书本台阶！' }
    ]
  },
  {
    id: 't03_rain_window',
    tag: '窗边听雨',
    prompt: '要是窗外突然下起淅淅沥沥的小雨，主人最想在桌前做什么呀？',
    options: [
      { label: '把小夜灯打开陪你听雨', mood: 'shy', xp: 24, coins: 10, reply: '暖黄的灯光配雨声最安心啦，悄悄往主人手边蹭近一点~' },
      { label: '钻进被窝睡个昏天黑地', mood: 'happy', xp: 20, coins: 10, reply: '赞成！我也要抱着蓝鲸软垫窝在键盘旁边打呼噜~' },
      { label: '趁下雨专注干票大的项目', mood: 'proud', xp: 20, coins: 14, reply: '哇哦，认真的主人超帅气，我在旁边替你摇旗呐喊！' }
    ]
  },
  {
    id: 't04_whale_tail',
    tag: '蓝鲸发饰',
    prompt: '嘿嘿，你刚刚是不是偷偷盯着我的蓝鲸小发卡看了好几眼？',
    options: [
      { label: '因为一晃一晃特别可爱', mood: 'shy', xp: 24, coins: 10, reply: '呜……突然这么直球夸人家，耳朵都要冒粉红泡泡啦！' },
      { label: '在看它会不会喷水弹', mood: 'tsundere', xp: 18, coins: 12, reply: '喂！只有去幸存者打工打怪的时候才会发射水弹啦！' },
      { label: '再配个樱粉蝴蝶结更完美', mood: 'cheer', xp: 22, coins: 12, reply: '真的吗！快去小铺帮我试戴看看，我要拍纪念照！' }
    ]
  },
  {
    id: 't05_slack_off',
    tag: '摸鱼雷达',
    prompt: '嘀嘀嘀——蓝鲸雷达检测到主人有 87% 的概率想伸懒腰摸个小鱼！',
    options: [
      { label: '被发现了，陪我发会儿呆', mood: 'happy', xp: 22, coins: 10, reply: '嘿嘿，发呆也是正经事！我陪你数桌面上飘过的小星尘~' },
      { label: '胡说，我明明在深度思考', mood: 'tsundere', xp: 18, coins: 12, reply: '哼哼，眼神都飘到零食袋那边去啦，本侦探绝不误判！' },
      { label: '来一把石头剪刀布决胜负', mood: 'cheer', xp: 20, coins: 14, reply: '来就来！这次我绝对不会第一把就傻乎乎出布了！' }
    ]
  },
  {
    id: 't06_palm_temp',
    tag: '掌心温度',
    prompt: '每次跳到主人手掌心上晃悠的时候，都觉得像踩在暖洋洋的云朵上~',
    options: [
      { label: '随时欢迎你跳上来休息', mood: 'shy', xp: 25, coins: 10, reply: '拉勾勾！那主人手心永远留一块我的专属停机坪~' },
      { label: '其实你踩得手心有点痒痒的', mood: 'tsundere', xp: 19, coins: 12, reply: '那、那我下次把小皮鞋收轻一点点嘛，不许嫌弃！' },
      { label: '站稳咯，准备手掌蹦床起飞', mood: 'cheer', xp: 21, coins: 12, reply: '芜湖——飞得越高越能摘到金闪闪的大星星！' }
    ]
  },
  {
    id: 't07_keyboard_sound',
    tag: '键盘节奏',
    prompt: '咔哒咔哒的敲键盘声听久了，总觉得像八音盒的伴奏曲一样好听呢。',
    options: [
      { label: '那这首曲子专门弹给你听', mood: 'shy', xp: 24, coins: 10, reply: '唔……我要把这句话偷偷记进今日份最佳心动语录里！' },
      { label: '那是狂暴改需求时的战鼓声', mood: 'proud', xp: 20, coins: 14, reply: '冲鸭主人！不管是甲方还是摸鱼怪，统统三下五除二搞定！' },
      { label: '你也去深海工位敲两行试试', mood: 'happy', xp: 20, coins: 12, reply: '包在我身上！我在迷你电脑前敲出来的可全是真的金币哦~' }
    ]
  },
  {
    id: 't08_midnight_snack',
    tag: '夜宵诱惑',
    prompt: '小声问一句……如果现在天上掉下一份豪华便当和热汤，算不算违规加餐？',
    options: [
      { label: '开心最重要，马上开动！', mood: 'cheer', xp: 22, coins: 12, reply: '主人万岁！吃饱饱才有力气保护整张书桌的和平~' },
      { label: '只能吃三口，剩下的明天吃', mood: 'tsundere', xp: 18, coins: 12, reply: '呜……那我要拿最大的勺子装满那三口！绝不浪费！' },
      { label: '来，张嘴喂你一颗饭团', mood: 'shy', xp: 24, coins: 10, reply: '啊呜~ 嚼嚼……被投喂的饭团好像比平时香甜十倍呢。' }
    ]
  },
  {
    id: 't09_photo_pose',
    tag: '上镜秘诀',
    prompt: '主人主人，你觉得我拍纪念拍立得的时候，比耶好看还是叉腰好看呀？',
    options: [
      { label: '只要是你怎么拍都超上镜', mood: 'shy', xp: 25, coins: 10, reply: '嘿嘿，相纸显影出来要是脸红红的，可全都怪主人夸太甜啦~' },
      { label: '当然是炸毛鼓起脸的时候', mood: 'tsundere', xp: 19, coins: 12, reply: '不许抓拍黑历史啦！那种照片绝对不准钉在相册最前面！' },
      { label: '换上小皇冠再拍一张镇墙之宝', mood: 'proud', xp: 21, coins: 14, reply: '有道理！戴上小皇冠气场全开，相册集邮墙C位预定！' }
    ]
  },
  {
    id: 't10_dream_island',
    tag: '梦境漫游',
    prompt: '刚才打盹做了一个小梦，梦见整张书桌变成漂在星海上的奶油浮岛啦~',
    options: [
      { label: '梦里有没有我的位置呀？', mood: 'shy', xp: 24, coins: 10, reply: '当然有呀，最大的那朵云朵躺椅就是专门留给主人的~' },
      { label: '肯定是因为枕着零食睡着了', mood: 'tsundere', xp: 18, coins: 12, reply: '才不是贪吃梦呢！是充满浪漫想象力的深海巡航梦！' },
      { label: '醒醒，浮岛上刷出打工金币啦', mood: 'cheer', xp: 20, coins: 14, reply: '哪儿哪儿？！本打工小能手一秒清醒，全屏吸金启动！' }
    ]
  },
  {
    id: 't11_weekend_plan',
    tag: '周末计划',
    prompt: '等忙完这一阵子，周末主人最想带我去哪里透透气呀？',
    options: [
      { label: '去洒满阳光的旧书街散步', mood: 'happy', xp: 22, coins: 12, reply: '好棒！我可以坐在书脊台阶上闻着墨香陪你挑喜欢的书~' },
      { label: '去公园草坪拍十张实景拍立得', mood: 'cheer', xp: 22, coins: 12, reply: '耶！我要在真正的树叶和花坛边上蹦蹦跳跳拍满整本相册！' },
      { label: '在家躺平一整天谁也不见', mood: 'shy', xp: 22, coins: 10, reply: '那我就安安静静趴在桌角当小摆件，陪主人度过最舒服的慢时光~' }
    ]
  },
  {
    id: 't12_cat_tree',
    tag: '攀爬高手',
    prompt: '我发现无论是厚字典、水杯沿还是猫爬架，都拦不住我的二段轻功跳！',
    options: [
      { label: '厉害厉害，给你颁小金牌', mood: 'proud', xp: 22, coins: 12, reply: '哼哼~ 再升一级轻巧跑鞋，连显示器顶端我都跳上去给你看！' },
      { label: '小心别一头栽进茶杯里咯', mood: 'tsundere', xp: 18, coins: 12, reply: '唔！我的落地平衡感可是满分，才不会变成落汤小鲸鱼！' },
      { label: '跳累了随时接住你', mood: 'shy', xp: 24, coins: 10, reply: '有主人在底下兜着，我每次起跳都超级安心呢~' }
    ]
  },
  {
    id: 't13_compliment_battle',
    tag: '夸夸时间',
    prompt: '今天主人已经很努力啦！快选一个词，让我正式表扬你一下吧~',
    options: [
      { label: '想要温柔治愈系的夸夸', mood: 'shy', xp: 24, coins: 10, reply: '不管外面多忙，你在我眼里永远是最靠谱、最温柔的满分主人~' },
      { label: '想要气势十足的热血夸夸', mood: 'cheer', xp: 21, coins: 12, reply: '今日最佳MVP就是主人！难题遇到你统统自动退散！' },
      { label: '反过来先夸夸可爱的DeepSeek娘', mood: 'tsundere', xp: 20, coins: 12, reply: '诶？！怎、怎么突然反弹回来啦……勉强收下你的喜欢咯！' }
    ]
  },
  {
    id: 't14_toy_choice',
    tag: '心爱玩具',
    prompt: '蓝鲸球弹得高，毛线球跑得快，小黄鸭还会嘎嘎叫……到底宠幸哪一个好呢？',
    options: [
      { label: '小孩子才做选择，轮流陪你玩', mood: 'cheer', xp: 22, coins: 12, reply: '太好啦！和你玩顶球连击的时候最开心了！' },
      { label: '看你追毛线球像小猫咪一样', mood: 'tsundere', xp: 18, coins: 12, reply: '那、那是在测试彩虹尾迹的空气阻力啦，才不是喵星人本能！' },
      { label: '玩累了记得回来喝口温水', mood: 'happy', xp: 22, coins: 10, reply: '嗯嗯！主人也要记得喝水润润嗓子哦~' }
    ]
  },
  {
    id: 't15_survivor_pride',
    tag: '打工心得',
    prompt: '每次去『幸存者打工』把满屏摸鱼怪震飞爆金币的时候，真的超解压的！',
    options: [
      { label: '辛苦我们家赚钱养家的小能手', mood: 'proud', xp: 22, coins: 14, reply: '包在身上！赚来的小金币全都用来给桌面添置漂亮家具！' },
      { label: '别光顾着冲锋，注意自己血条', mood: 'shy', xp: 24, coins: 10, reply: '知道主人心疼我啦~ 看到绿色回血宝石我都会乖乖捡起来的！' },
      { label: '超武茶刃转起来像火锅飞饼', mood: 'tsundere', xp: 18, coins: 12, reply: '喂！明明是帅气潇洒的碧叶风暴，怎么到你嘴里就变好吃的了！' }
    ]
  },
  {
    id: 't16_tidying_desk',
    tag: '桌面巡逻',
    prompt: '刚刚沿着桌面巡逻了一圈，发现主人的桌面气场今天格外清爽呢！',
    options: [
      { label: '专门收拾干净给你当游乐场', mood: 'shy', xp: 24, coins: 10, reply: '哇，难怪跑起来一点都不绊脚，主人最好啦~' },
      { label: '其实杂物全推到镜头外面了', mood: 'tsundere', xp: 19, coins: 12, reply: '噗——我就假装没听见，替你保守这个桌面整洁小秘密！' },
      { label: '摆个书本斜坡让你当跳台', mood: 'cheer', xp: 21, coins: 12, reply: '好主意！点一下右上角重扫，我马上给你表演花式登顶！' }
    ]
  },
  {
    id: 't17_morning_evening',
    tag: '陪伴时光',
    prompt: '不管是白天的忙碌时刻还是安静的夜晚，只要一打开屏幕就能见到你真好~',
    options: [
      { label: '我也很喜欢有你在桌角陪着', mood: 'shy', xp: 25, coins: 12, reply: '心里暖洋洋的……那我们要一直当彼此最合拍的桌面搭档哦！' },
      { label: '主要是怕你不盯着我就偷吃零食', mood: 'tsundere', xp: 19, coins: 12, reply: '哼！我的饱食度明明很守规矩，才不会偷翻小铺仓库呢！' },
      { label: '来，击个掌庆祝今日份重逢', mood: 'cheer', xp: 22, coins: 12, reply: '啪嗒击掌成功！好运值与亲密度同步飙升！' }
    ]
  },
  {
    id: 't18_music_box',
    tag: '八音盒曲',
    prompt: '啦啦啦~ 你听背景里的八音盒旋律，是不是像小鲸鱼在水泡泡里转圈圈？',
    options: [
      { label: '听着歌看你晃脑袋特别解压', mood: 'happy', xp: 22, coins: 10, reply: '那我再多晃两拍~ 把主人心里的烦心事统统摇散！' },
      { label: '你哼的调子好像拐了半个弯', mood: 'tsundere', xp: 18, coins: 12, reply: '哪、哪有跑调！这叫即兴爵士蓝鲸变奏曲，懂不懂嘛！' },
      { label: '转个圈跳支小舞看看', mood: 'cheer', xp: 22, coins: 12, reply: '看好了哦——华丽原地转圈加满天星光特效！' }
    ]
  },
  {
    id: 't19_secret_wish',
    tag: '小小愿望',
    prompt: '偷偷告诉主人，我把每天和你互动的小开心都折成星星收起来啦。',
    options: [
      { label: '攒满一百颗会许什么愿望？', mood: 'shy', xp: 25, coins: 10, reply: '许愿主人的代码永无报错，每天都能笑眯眯地来摸摸我的头~' },
      { label: '该不会许愿每天十顿大餐吧', mood: 'tsundere', xp: 18, coins: 12, reply: '才占了愿望清单的十分之一而已啦，剩下九分全是关于你的！' },
      { label: '现在就帮你再添几颗亮晶晶的', mood: 'happy', xp: 22, coins: 14, reply: '收到主人的心意星光！小罐子都快装不下啦~' }
    ]
  },
  {
    id: 't20_starlight_aura',
    tag: '闪耀气场',
    prompt: '我一直在练习怎么让脚底下的星光看起来更有大魔法师的派头！',
    options: [
      { label: '不用练习也已经闪闪发光了', mood: 'shy', xp: 24, coins: 10, reply: '呜哇……主人今天说话像裹了蜂蜜一样甜！' },
      { label: '更像刚踩完荧光粉的小团子', mood: 'tsundere', xp: 19, coins: 12, reply: '什么小团子嘛！人家明明是灵动飒爽的星海少女！' },
      { label: '吸金币的时候确实很有气势', mood: 'proud', xp: 21, coins: 14, reply: '嘿嘿，方圆百里的金币见了本大侠都得乖乖排着队飞过来！' }
    ]
  },
  {
    id: 't21_headpat_habit',
    tag: '摸头定律',
    prompt: '奇怪……为什么每次被主人轻轻揉头顶的时候，原本想好的傲娇台词就全忘光了呢？',
    options: [
      { label: '说明你其实超级喜欢被顺毛', mood: 'shy', xp: 25, coins: 10, reply: '唔……只允许你一个人这么顺毛哦，别人可没这个特权~' },
      { label: '因为发型被我揉成小鸟窝啦', mood: 'tsundere', xp: 19, coins: 12, reply: '哇啊！赔我整整齐齐的刘海，罚你多喂我一碗热拉面！' },
      { label: '那以后每天上线先摸三次头', mood: 'happy', xp: 22, coins: 12, reply: '成交！少摸一下我可是会举着小牌子提醒你的哦~' }
    ]
  },
  {
    id: 't22_season_breeze',
    tag: '换季提醒',
    prompt: '最近早晚温差变大咯，本桌面健康小管家特来抽查主人的保暖情况！',
    options: [
      { label: '衣服穿得很暖，放心吧小管家', mood: 'happy', xp: 22, coins: 10, reply: '乖乖加分！健康值一百分，奖励小鲸鱼欣慰微笑一枚~' },
      { label: '有电脑散热器烤手完全不冷', mood: 'tsundere', xp: 18, coins: 12, reply: '不许糊弄小管家！要是着凉打喷嚏，我可是会担心的！' },
      { label: '看到你元气满满瞬间就暖和了', mood: 'shy', xp: 24, coins: 12, reply: '嘿嘿，那我把活力火力再调高一档，给你当随身小太阳！' }
    ]
  },
  {
    id: 't23_polaroid_wall',
    tag: '相册回忆',
    prompt: '翻看『纪念相册』里的拍立得时，每一张都能想起当时主人的手势和心情呢。',
    options: [
      { label: '以后每个阶段都留一张合影', mood: 'shy', xp: 24, coins: 12, reply: '嗯！从 LV.1 到很远很远的以后，每一页都要和主人同框~' },
      { label: '最喜欢哪张就给你钉上小金星', mood: 'happy', xp: 22, coins: 12, reply: '好耶！被钉上星星图钉的相片，我每次路过都会偷看两眼！' },
      { label: '走，现在就再咔嚓拍张新的！', mood: 'cheer', xp: 22, coins: 14, reply: '时刻准备着！我已经把最甜的笑容摆好咯，一二茄子~' }
    ]
  },
  {
    id: 't24_good_luck',
    tag: '今日吉签',
    prompt: '锵锵！刚刚替主人摇了一枚深海幸运签——显示今天宜放松、宜微笑、宜心想事成！',
    options: [
      { label: '借你吉言，把好运分你一半', mood: 'shy', xp: 24, coins: 12, reply: '一人一半好运翻倍！今天不管做什么都会顺顺当当的~' },
      { label: '这么准？该不会全写的上上签吧', mood: 'tsundere', xp: 19, coins: 12, reply: '哼哼，给主人的签筒里当然只准装上上签啦，我亲手挑的！' },
      { label: '接下上上签，干劲十足出发！', mood: 'proud', xp: 22, coins: 14, reply: '气势满分！本桌宠宣布今日幸运Buff已永久生效！' }
    ]
  }
];

const MOOD_TAG_LABELS = {
  shy: '心动害羞',
  tsundere: '傲娇炸毛',
  happy: '温柔开心',
  cheer: '元气欢呼',
  proud: '得意叉腰'
};

const topicCardEl = document.getElementById('pet-topic-card');
const topicKickerEl = document.getElementById('topic-kicker');
const topicPromptEl = document.getElementById('topic-prompt-text');
const topicOptionsEl = document.getElementById('topic-options-list');
let topicDeckOrder = [];
let currentTopicObj = null;
// [[split 52]]

function nextShuffledTopic() {
  if (topicDeckOrder.length === 0) {
    topicDeckOrder = PET_CHAT_TOPICS.map((_, idx) => idx);
    for (let i = topicDeckOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = topicDeckOrder[i];
      topicDeckOrder[i] = topicDeckOrder[j];
      topicDeckOrder[j] = tmp;
    }
    if (currentTopicObj && PET_CHAT_TOPICS[topicDeckOrder[0]]?.id === currentTopicObj.id && topicDeckOrder.length > 1) {
      const first = topicDeckOrder.shift();
      topicDeckOrder.push(first);
    }
  }
  return PET_CHAT_TOPICS[topicDeckOrder.shift()];
}

function dismissTopicCard() {
  currentTopicObj = null;
  topicCardEl?.classList.add('hidden');
  document.getElementById('btn-chat-topic')?.classList.remove('active');
}
// [[split 53]]

function openPetTopicPrompt(fromAuto = false) {
  if (gameMode !== 'pet') {
    if (fromAuto) return;
    switchMode('pet');
  }
  if (!drawerEl.classList.contains('hidden')) {
    if (fromAuto) return;
    closeDrawer();
  }
  if (rpsGame.active || palmCatchGame.active || pendingPhotoSnapTimer > 0) {
    if (fromAuto) return;
    cancelRpsGame();
    cancelPalmCatchGame();
  }
  if (!fromAuto) {
    dismissPolaroid();
    dismissWindowAmbienceCard();
    foldOrHidePomodoroCard();
    dismissTeatimeCard();
    dismissWeeklyJournalCard();
    dismissTerrariumCard();
    foldOrHideGoodnightCard();
    dismissCollageCard();
    foldOrHideCozyRadioCard();
    dismissCrochetCard();
    dismissHotCocoaCard();
    dismissPressedFlowerCard();
    dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
    setNapping(false);
  } else if (
    player.isNapping ||
    pomodoroRun.status === 'running' ||
    goodnightRun.status === 'running' ||
    !polaroidCardEl?.classList.contains('hidden') ||
    !windowAmbienceCardEl?.classList.contains('hidden') ||
    !pomodoroCardEl?.classList.contains('hidden') ||
    !teatimeCardEl?.classList.contains('hidden') ||
    !weeklyJournalCardEl?.classList.contains('hidden') ||
    !terrariumCardEl?.classList.contains('hidden') ||
    !goodnightCardEl?.classList.contains('hidden') ||
    !collageCardEl?.classList.contains('hidden') ||
    !cozyRadioCardEl?.classList.contains('hidden') ||
    !crochetCardEl?.classList.contains('hidden') ||
    !hotCocoaCardEl?.classList.contains('hidden') ||
    !pressedFlowerCardEl?.classList.contains('hidden') ||
    !telescopeCardEl?.classList.contains('hidden') ||
    (isAr10CardOpen() || isAr11CardOpen() || isAr12CardOpen() || isAr13CardOpen() || isAr14CardOpen() || isAr15CardOpen() || isAr16CardOpen() || isAr17CardOpen() || isMemoryBookOpen())
  ) {
    return;
  }

  const topic = nextShuffledTopic();
  currentTopicObj = topic;
  if (topicKickerEl) {
    topicKickerEl.textContent = `${topic.tag} · 已聊 ${player.topicsChatted || 0} 次`;
  }
  if (topicPromptEl) {
    topicPromptEl.textContent = applyCallName(topic.prompt, player.bond.call);
  }
  if (topicOptionsEl) {
    topicOptionsEl.innerHTML = '';
    for (const opt of topic.options) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'topic-opt-btn';
      btn.dataset.mood = opt.mood;
      btn.innerHTML = `
        <span>${opt.label}</span>
        <span class="topic-opt-tag">
          <img loading="lazy" src="./assets/ui_mood_blush.webp?v=hd60" alt="" class="topic-opt-ico" />
          ${MOOD_TAG_LABELS[opt.mood] || '互动'}
        </span>
      `;
      bindHudTap(btn, () => {
        applyTopicOptionReaction(opt);
      });
      topicOptionsEl.appendChild(btn);
    }
  }
  topicCardEl?.classList.remove('hidden');
  document.getElementById('btn-chat-topic')?.classList.add('active');
  player.talkAnimTimer = 1.6;
  if (!fromAuto) {
    playSfx('star');
    setPlayerEmote('来聊个小话题吧~', 1.5, 'happy', false);
  } else {
    player.emoteTimer = 0;
  }
}
// [[split 54]]

// ================= 实景石头剪刀布（猜拳）小游戏（握拳手势或底部猜拳键触发） =================
const rpsHudEl = document.getElementById('rps-hud');
const rpsStatusEl = document.getElementById('rps-status-text');
// [[split 55]]
const RPS_LABELS = { rock: '石头', scissors: '剪刀', paper: '布' };

const rpsGame = {
  active: false,
  timer: 0,
  lastTickSec: 4,
  lockedMove: null,
  cooldown: 0,
  hideTimer: null
};
// [[split 56]]

function highlightRpsChoice(move) {
  for (const btn of rpsChoiceBtns) {
    btn.classList.toggle('detected', btn.dataset.rps === move);
  }
}

function cancelRpsGame() {
  rpsGame.active = false;
  player.rpsPoseTimer = 0;
  if (rpsGame.hideTimer) {
    clearTimeout(rpsGame.hideTimer);
    rpsGame.hideTimer = null;
  }
  rpsHudEl?.classList.add('hidden');
  document.getElementById('btn-rps')?.classList.remove('active');
}

function startRpsGame(fromGesture = false) { dismissPolaroid(); dismissTopicCard(); dismissTeatimeCard(); dismissWeeklyJournalCard(); dismissTerrariumCard(); foldOrHideGoodnightCard(); dismissCollageCard(); foldOrHideCozyRadioCard(); dismissCrochetCard(); dismissHotCocoaCard(); dismissPressedFlowerCard(); dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards(); if (palmCatchGame.active) cancelPalmCatchGame(); if (rpsChoicesEl) rpsChoicesEl.style.display = 'flex';
  if (rpsGame.active) {
    cancelRpsGame();
    return;
  }
  if (!drawerEl.classList.contains('hidden')) closeDrawer();
  if (gameMode !== 'pet') switchMode('pet');
  setNapping(false);

  if (rpsGame.hideTimer) {
    clearTimeout(rpsGame.hideTimer);
    rpsGame.hideTimer = null;
  }

  rpsGame.active = true;
  player.x = W * 0.5;
  player.y = H * 0.68 - 25;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.standingPlat = null;
  player.wanderTargetX = W * 0.5;
  rpsGame.timer = 2.55;
  rpsGame.lastTickSec = 4;
  rpsGame.lockedMove = null;
  rpsGame.cooldown = 4.2;
  player.rpsPoseTimer = 2.65;
  player.idleTime = 0;

  highlightRpsChoice(null);
  rpsHudEl?.classList.remove('hidden');
  document.getElementById('btn-rps')?.classList.add('active');
  if (rpsStatusEl) {
    rpsStatusEl.innerHTML = `<span class="mg-hud-row"><span class="mg-hud-title">实景猜拳</span><span class="mg-chip mg-chip-combo">伸手或点选出拳</span><span class="mg-chip mg-chip-time">3s</span></span>`;
  }
  playSfx('rps_tick', 1);
  setPlayerEmote(
    fromGesture ? '收到猜拳挑战！石头剪刀布~' : '石头剪刀布！准备出拳咯~',
    2.2,
    'happy',
    true
  );
}

function resolveRpsRound(userMove) {
  rpsGame.active = false;
  rpsGame.cooldown = 3.6;
  document.getElementById('btn-rps')?.classList.remove('active');
  highlightRpsChoice(userMove);

  const moves = ['rock', 'scissors', 'paper'];
  const petMove = moves[Math.floor(Math.random() * moves.length)];
  const winsAgainst = { rock: 'scissors', scissors: 'paper', paper: 'rock' };

  let banner = '';
  if (userMove === petMove) {
    banner = `你出 ${RPS_LABELS[userMove]} vs DeepSeek娘 ${RPS_LABELS[petMove]} · 心有灵犀平局!`;
    player.happyTimer = 1.7;
    playSfx('pat');
    petAudio.haptic('tap');
    addCoins(8, player.x, player.y - 36, '默契 ');
    addAffectionXp(15, '心有灵犀 +15 亲密');
    setPlayerEmote(`^w^ 我也是${RPS_LABELS[petMove]}！和主人超有默契~`, 2.4, 'happy', true);
  } else if (winsAgainst[userMove] === petMove) {
    banner = `你出 ${RPS_LABELS[userMove]} vs DeepSeek娘 ${RPS_LABELS[petMove]} · 主人获胜 `;
    player.tsundereTimer = 1.7;
    playSfx('star');
    petAudio.haptic('win');
    addCoins(18, player.x, player.y - 36, '猜拳胜 ');
    addAffectionXp(24, '猜拳获胜 +24 亲密');
    setPlayerEmote(`呜~ 我出${RPS_LABELS[petMove]}输啦，主人好厉害!`, 2.5, 'tsundere', true);
  } else {
    banner = `你出 ${RPS_LABELS[userMove]} vs DeepSeek娘 ${RPS_LABELS[petMove]} · DeepSeek娘赢咯 `;
    player.cheerTimer = 2.0;
    player.happyTimer = 1.9;
    playSfx('bounce', 3);
    petAudio.haptic('headpat');
    addCoins(10, player.x, player.y - 36, '陪玩奖 ');
    addAffectionXp(18, '猜拳互动 +18 亲密');
    setPlayerEmote(`耶！我出${RPS_LABELS[petMove]}赢咯~ 奖励白米饭!`, 2.5, 'cheer', true);
  }

  if (rpsStatusEl) rpsStatusEl.textContent = banner;
  completeWish('play_rps');

  rpsGame.hideTimer = setTimeout(() => {
    rpsHudEl?.classList.add('hidden');
  }, 2400);
}

function updateRpsGame(dt) {
  rpsGame.cooldown = Math.max(0, rpsGame.cooldown - dt);
  if (!rpsGame.active) return;

  rpsGame.timer -= dt;
  player.rpsPoseTimer = Math.max(player.rpsPoseTimer, 0.2);

  const gs = vision.gestureState;
  const detectedMove =
    rpsGame.lockedMove || (gs && gs.ttl > 0 && gs.rpsMove !== 'none' ? gs.rpsMove : null);
  highlightRpsChoice(detectedMove);

  const sec = Math.max(1, Math.ceil(rpsGame.timer / 0.85));
  if (sec < rpsGame.lastTickSec) {
    rpsGame.lastTickSec = sec;
    playSfx('rps_tick', 4 - sec);
  }
  if (rpsStatusEl) {
    const moveChip = detectedMove
      ? `<span class="mg-chip mg-chip-score">已锁定 <b>${RPS_LABELS[detectedMove]}</b></span>`
      : `<span class="mg-chip mg-chip-combo">伸手或点选出拳</span>`;
    rpsStatusEl.innerHTML = `<span class="mg-hud-row"><span class="mg-hud-title">实景猜拳</span>${moveChip}<span class="mg-chip mg-chip-time${sec <= 1 ? ' is-urgent' : ''}">${sec}s</span></span>`;
  }

  if (rpsGame.timer <= 0) {
    const finalMove =
      detectedMove || ['rock', 'scissors', 'paper'][Math.floor(Math.random() * 3)];
    resolveRpsRound(finalMove);
  }
}
// [[split 57]]
const palmCatchGame = {
  active: false,
  timer: 0,
  spawnTick: 0,
  score: 0,
  catches: 0,
  combo: 0
};

function cancelPalmCatchGame() {
  if (!palmCatchGame.active) return;
  palmCatchGame.active = false;
  catchItems.length = 0;
  if (rpsChoicesEl) rpsChoicesEl.style.display = 'flex';
  rpsHudEl?.classList.add('hidden');
  document.getElementById('btn-palm-catch')?.classList.remove('active');
}

function startPalmCatchGame() { dismissPolaroid(); dismissTopicCard(); dismissTeatimeCard(); dismissWeeklyJournalCard(); dismissTerrariumCard(); foldOrHideGoodnightCard(); dismissCollageCard(); foldOrHideCozyRadioCard(); dismissCrochetCard(); dismissHotCocoaCard(); dismissPressedFlowerCard(); dismissTelescopeCard(); dismissAr10Cards(); dismissAr11Cards(); dismissAr12Cards(); dismissAr13Cards(); dismissAr14Cards(); dismissAr15Cards(); dismissAr16Cards(); dismissAr17Cards();
  if (palmCatchGame.active) {
    cancelPalmCatchGame();
    return;
  }
  if (!drawerEl.classList.contains('hidden')) closeDrawer();
  if (rpsGame.active) cancelRpsGame();
  if (gameMode !== 'pet') switchMode('pet');
  setNapping(false);

  if (rpsGame.hideTimer) {
    clearTimeout(rpsGame.hideTimer);
    rpsGame.hideTimer = null;
  }
  palmCatchGame.active = true;
  player.x = W * 0.5;
  player.y = H * 0.68 - 25;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.standingPlat = null;
  player.wanderTargetX = W * 0.5;
  palmCatchGame.timer = 16.0;
  palmCatchGame.spawnTick = 0.25;
  palmCatchGame.score = 0;
  palmCatchGame.catches = 0;
  palmCatchGame.combo = 0;
  catchItems.length = 0;

  if (rpsChoicesEl) rpsChoicesEl.style.display = 'none';
  rpsHudEl?.classList.remove('hidden');
  document.getElementById('btn-palm-catch')?.classList.add('active');
  if (rpsStatusEl) {
    rpsStatusEl.textContent = '掌心接美食！伸出手掌左右移动（或滑动摇杆） · 16s';
  }
  playSfx('star');
  setPlayerEmote('天降白米饭大作战！快用手掌托着我左右接美食咯~', 2.4, 'cheer', true);
}

function updatePalmCatchGame(dt, centerFloorY) {
  if (!palmCatchGame.active) return;
  palmCatchGame.timer -= dt;
  palmCatchGame.spawnTick -= dt;

  if (palmCatchGame.spawnTick <= 0) {
    palmCatchGame.spawnTick = Math.max(0.32, 0.55 - palmCatchGame.catches * 0.012);
    const roll = Math.random();
    const kind =
      roll < 0.16 ? 'alarm' : roll < 0.36 ? 'coin' : roll < 0.54 ? 'bento' : roll < 0.66 ? 'cake' : 'rice';
    catchItems.push({
      kind,
      x: W * (0.14 + Math.random() * 0.72),
      y: H * 0.08,
      vy: 155 + Math.random() * 85,
      rot: 0
    });
  }

  for (let i = catchItems.length - 1; i >= 0; i--) {
    const ci = catchItems[i];
    ci.y += ci.vy * dt;
    ci.rot += dt * 2.2;

    if (Math.hypot(ci.x - player.x, ci.y - (player.y - 12)) < 52) {
      if (ci.kind === 'alarm') {
        palmCatchGame.combo = 0;
        palmCatchGame.score = Math.max(0, palmCatchGame.score - 10);
        player.tsundereTimer = 0.9;
        playSfx('pat');
        petAudio.haptic('headpat');
        floatingTexts.push({
          x: player.x,
          y: player.y - 42,
          vx: 0,
          vy: -60,
          text: '加班闹钟 -10!',
          color: '#ff4d79',
          scale: 1.15,
          life: 0.7
        });
        setPlayerEmote('讨厌加班闹钟！只接白米饭和炸虾!', 1.5, 'tsundere');
      } else {
        palmCatchGame.catches++;
        palmCatchGame.combo++;
        const pts = ci.kind === 'cake' ? 30 : ci.kind === 'bento' ? 20 : 12;
        palmCatchGame.score += pts + palmCatchGame.combo * 2;
        player.eatingTimer = 0.24;
        player.happyTimer = 1.0;
        playSfx(ci.kind === 'coin' ? 'coin' : 'bite', palmCatchGame.combo);
        petAudio.haptic('finger_boop');
        spawnInteractVfx(player.x, player.y - 20, 'eat', 5);
        if (ci.kind === 'coin') {
          addCoins(6, player.x, player.y - 36, '接金币 ');
        } else {
          player.hunger = Math.min(player.maxHunger, player.hunger + 6);
          recordJournalActivity('feeds', 1);
          floatingTexts.push({
            x: player.x,
            y: player.y - 40,
            vx: 0,
            vy: -58,
            text: `接住 x${palmCatchGame.combo} (+${pts})`,
            color: '#ffd700',
            scale: 1.12,
            life: 0.65
          });
        }
        if (palmCatchGame.catches >= 5) completeWish('palm_catch');
      }
      catchItems.splice(i, 1);
      continue;
    }

    if (ci.y > centerFloorY + 12) {
      catchItems.splice(i, 1);
    }
  }

  if (rpsStatusEl) {
    const remSec = Math.max(0, Math.ceil(palmCatchGame.timer));
    rpsStatusEl.innerHTML =
      `<span class="mg-hud-row"><span class="mg-hud-title">掌心接美食</span>` +
      `<span class="mg-chip mg-chip-score">得分 <b>${palmCatchGame.score}</b></span>` +
      `<span class="mg-chip mg-chip-combo${palmCatchGame.combo >= 3 ? ' is-hot' : ''}">连击 ×${palmCatchGame.combo}</span>` +
      `<span class="mg-chip mg-chip-time${remSec <= 5 ? ' is-urgent' : ''}">${remSec}s</span></span>`;
  }

  if (palmCatchGame.timer <= 0) {
    const rewardCoins = Math.max(12, Math.round(palmCatchGame.score * 0.35));
    const rewardXp = Math.max(18, Math.round(palmCatchGame.score * 0.4));
    const finalScore = palmCatchGame.score;
    cancelPalmCatchGame();
    player.cheerTimer = 2.0;
    player.happyTimer = 2.0;
    playSfx('star');
    petAudio.haptic('win');
    addCoins(rewardCoins, player.x, player.y - 44, '接饭大奖 ');
    addAffectionXp(rewardXp, `掌心接饭 ${finalScore}分 +${rewardXp} 亲密`);
    setPlayerEmote(`掌心接美食大丰收！共得 ${finalScore} 分，吃得好饱 ^w^`, 2.6, 'cheer', true);
  }
}
// [[split end]]
export {
  topicCardEl,
  dismissTopicCard,
  openPetTopicPrompt,
  rpsHudEl,
  rpsGame,
  cancelRpsGame,
  startRpsGame,
  resolveRpsRound,
  updateRpsGame,
  palmCatchGame,
  cancelPalmCatchGame,
  startPalmCatchGame,
  updatePalmCatchGame
};
