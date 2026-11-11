import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useGame } from '../contexts/GameContext'
import { useAuth } from '../hooks/useAuth'
import { EnhancementPanel } from './EnhancementPanel'
import { PartyPanel, type PartyCombatHeaderInfo } from './PartyPanel'
import { GameChatPanel } from './GameChatPanel'
import { SkillSidebar } from './SkillSidebar'
import { MobileNavBar } from './MobileNavBar'
import { navIdForAction, visibleSkillNav, recommendedSkillNavIds, tabForNavId, SKILL_NAV } from '../gameplay/skillNav'
import { SkillActionList } from './SkillActionList'
import { CraftRecipeList, stripCraftVerb, type CraftRecipeView } from './CraftRecipeList'
import { skillActionRows, type SkillActionRow } from '../gameplay/skillActions'
import { t1Url } from '../assets/t1/manifest'
import { GameHeader } from './GameHeader'
import { PlayerRightPanel } from './PlayerRightPanel'
import { apiClient, type ActionPreview } from '../services/api'
import { chatWs, ChatMsg } from '../services/websocket'
import { logger } from '../utils/logger'
import { getItemName, registerItemNames } from '../utils/itemNames'
import { AchievementsPanel, DailyQuestsPanel, SettingsPanel } from './ProgressionPanels'
import { CheckInModal } from './SystemPanels'
import { PrestigePanel } from './AdvancementPanels'
import { useToast } from './Toast'
import { CharacterCreate } from './CharacterCreate'
import { TutorialGuide } from './TutorialGuide'
import { NextGoalBar } from './NextGoalBar'
import { ActionQueueBar } from './ActionQueueBar'
import { CharacterSheet } from './CharacterSheet'
import { encounterStages } from '../gameplay/encounters'
import { nextChapterGoal, chapter1Complete } from '../gameplay/chapter1'
import { CHAPTER1_MONSTERS } from '../gameplay/ia'
import { COMBAT_SKILL_KEYS, abilitySlotCount, activeSetBonuses, combatSheetFromPack, equippedWeaponAtk, mainCombatSkill } from '../gameplay/combatSheet'
import { enhancementStatMultiplier, toolEffectLine } from '../gameplay/enhancement'
import { previewAbilities } from '../gameplay/fightPreview'
import { describeTrigger } from './AbilityBar'
import { InventoryPage } from './InventoryPage'
import { TasksPage } from './TasksPage'
import { HousesPage } from './HousesPage'
import type { AbilityDef } from '../types/game'
import { craftWhy } from '../gameplay/craftPreview'
import { xpToNextLevel } from '../gameplay/xp'
import { playGameSound, setGameSoundEnabled } from '../gameplay/sound'
import {
  COMBAT_SKILL_LABEL,
  CRAFT_CATEGORY_LABELS,
  CRAFT_PAGES,
  EQUIP_SLOTS,
  GATHER_FLAVOR_BY_ACTION,
  GATHER_PAGES,
  PROFESSIONS,
  UI_SLOT_TO_EQ,
  activityMarkFromAction,
  crops,
  crystalSpots,
  fiberSpots,
  fishingSpots,
  getItemIcon,
  ores,
  resolveItemInfo,
  resolveRequiredItemId,
  trees,
  type ActiveTab,
  type CurrentActivity,
} from '../gameplay/gameConstants'
import { AlchemyCoinifyPanel, ProductionTeaBar } from './ProductionExtras'
import { GoldIcon, T1ItemIcon } from './T1Art'
import { AdventurePanel } from './AdventurePanel'
import { TradingMarketView } from './TradingMarketView'
import {
  EquipSelectorModal,
  FirstBladeBuildModal,
  GameEntityDetailModal,
  ProfessionSwitchModal,
} from './GameModals'
import './NewGameInterface.css'

const equipSlots = EQUIP_SLOTS
const professions = PROFESSIONS

export default function NewGameInterface() {
  const { playerState, loading, refreshPlayerState, startLifeAction, stopAction } = useGame()
  const { user } = useAuth()
  const toast = useToast()
  const prevCombatRef = useRef<{
    enemyHp: number;
    playerHp: number;
    guardActive: boolean;
    wrathActive: boolean;
    outcome?: string;
    logLen: number;
    heavyReady: boolean;
    startedAt?: number;
  } | null>(null)
  const prevLevelsRef = useRef<{ combat: number; wood: number } | null>(null)
  const prevUnlockRef = useRef<{ craft: boolean; adventure: boolean } | null>(null)

  const [customPlayerName, setCustomPlayerName] = useState<string | null>(null)
  const [customPlayerGender, setCustomPlayerGender] = useState<string | null>(null)
  const [customPlayerAvatar, setCustomPlayerAvatar] = useState<string | null>(null)
  useEffect(() => {
    void apiClient.getSettings().then((res: { settings?: { soundEnabled?: boolean; animationsEnabled?: boolean; compactMode?: boolean; playerName?: string; gender?: string; avatar?: string } }) => {
      const s = res.settings
      setGameSoundEnabled(s?.soundEnabled !== false)
      document.body.classList.toggle("no-animations", s?.animationsEnabled === false)
      document.body.classList.toggle("compact-mode", !!s?.compactMode)
      setCustomPlayerName(s?.playerName || null)
      if (s?.gender) setCustomPlayerGender(s.gender === 'secret' ? 'animal' : s.gender)
      if (s?.avatar) setCustomPlayerAvatar(s.avatar)
    }).catch(() => undefined)
  }, [])
  // 玩家展示名：优先自定义角色名（存档里的 settings.playerName），其次注册账号名，最后按用户 id 派生
  const fallbackName = user?.username || (user?.id ? `玩家_${String(user.id).slice(0, 6)}` : '玩家')
  const playerName = customPlayerName || (playerState?.settings as any)?.playerName || fallbackName
  const rawGender = customPlayerGender || (playerState?.settings as any)?.playerGender || playerState?.settings?.gender || 'male'
  const playerGender: 'male' | 'female' | 'animal' = rawGender === 'female' ? 'female' : (rawGender === 'animal' || rawGender === 'secret') ? 'animal' : 'male'
  const playerAvatar = customPlayerAvatar || (playerState?.settings as any)?.avatarId || playerState?.settings?.avatar
  const renamePlayer = useCallback(async (name: string) => {
    const trimmed = name.trim().slice(0, 16)
    await apiClient.updateSettings({ playerName: trimmed || null })
    setCustomPlayerName(trimmed || null)
  }, [])
  const changePlayerAvatar = useCallback(async (avatar: string) => {
    setCustomPlayerAvatar(avatar)
    await apiClient.updateSettings({ avatar }).catch(() => undefined)
    void refreshPlayerState()
  }, [refreshPlayerState])
  const [activeTab, setActiveTab] = useState<ActiveTab>('logging')

  // 进度系统弹窗：成就 / 每日任务 / 设置 / 签到 / 转生
  const [progPanel, setProgPanel] = useState<null | 'achievements' | 'daily' | 'settings' | 'checkin' | 'prestige'>(null)
  // 顶栏角标：可领取数量
  const [claimableCount, setClaimableCount] = useState(0)
  // 顶栏角标：今日是否可签到
  const [checkInAvailable, setCheckInAvailable] = useState(false)
  // 离线收益弹窗（服务端报告）
  
  // 轮询可领取的成就/每日任务数量，用于顶栏角标提醒
  const refreshClaimable = useCallback(async () => {
    try {
      const [ach, daily, checkin]: any[] = await Promise.all([
        apiClient.getAchievements().catch(() => ({ achievements: [] })),
        apiClient.getDailyQuests().catch(() => ({ quests: [] })),
        apiClient.getCheckIn().catch(() => ({ canCheckIn: false }))
      ])
      const achCount = (ach.achievements || []).filter((a: any) => a.unlocked && !a.claimed).length
      const dailyCount = (daily.quests || []).filter((q: any) => q.completed && !q.claimed).length
      setClaimableCount(achCount + dailyCount)
      setCheckInAvailable(!!checkin.canCheckIn)
    } catch { /* 忽略 */ }
  }, [])

  useEffect(() => {
    void refreshClaimable()
    const timer = window.setInterval(() => { void refreshClaimable() }, 30000)
    return () => { window.clearInterval(timer) }
  }, [refreshClaimable])

  // 调试：监控组件是否重新挂载
  useEffect(() => {
    logger.debug('🔄 NewGameInterface mounted/remounted');
    return () => {
      logger.debug('❌ NewGameInterface unmounting');
    };
  }, []);
  
  const [selectedMap, setSelectedMap] = useState('forest')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [modalType, setModalType] = useState<'monster' | 'tree' | 'craft' | 'item' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [craftCategory, setCraftCategory] = useState<string>('materials')
  const [showSellModal, setShowSellModal] = useState(false)
  const [sellQuantity, setSellQuantity] = useState(1)
  const [sellPrice, setSellPrice] = useState(10)
  const [selectedTradingItem, setSelectedTradingItem] = useState<string | null>(null)
  const [orderType, setOrderType] = useState<'sell' | 'buy'>('sell')
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [purchaseQuantity, setPurchaseQuantity] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState<{id: string, quantity: number, price: number, type: 'sell' | 'buy'} | null>(null)
  const [orderSubmitting, setOrderSubmitting] = useState(false)
  const [repairingItemId, setRepairingItemId] = useState<string | null>(null)
  const [tradingOrders, setTradingOrders] = useState<any[]>([])
  const [tradingOrdersLoading, setTradingOrdersLoading] = useState(false)
  const tradingOrdersReqRef = useRef(0) // 递增即作废仍在途的旧列表请求，防旧结果覆盖新单
  const [currentProfession, setCurrentProfession] = useState<'woodcutter' | 'blacksmith' | 'farmer' | 'chef' | 'tailor' | 'alchemist'>('woodcutter')
  const [showProfessionModal, setShowProfessionModal] = useState(false)
  const classHydratedRef = useRef(false)

  useEffect(() => {
    if (!showProfessionModal && !(selectedItem && modalType)) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (showProfessionModal) setShowProfessionModal(false)
      if (selectedItem && modalType) {
        setSelectedItem(null)
        setModalType(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showProfessionModal, selectedItem, modalType])

  useEffect(() => {
    const id = playerState?.activeClassId
    if (!id || classHydratedRef.current) return
    if (['woodcutter', 'blacksmith', 'farmer', 'chef', 'tailor', 'alchemist'].includes(id)) {
      setCurrentProfession(id as typeof currentProfession)
      classHydratedRef.current = true
    }
  }, [playerState?.activeClassId])
  
  // 内容包状态 - 从后端API加载
  const [contentPack, setContentPack] = useState<any>(null)
  const [contentPackLoading, setContentPackLoading] = useState(true)
  const adventureStages = useMemo(() => encounterStages(contentPack), [contentPack])
  const isChapter1Done = Boolean(playerState && chapter1Complete(playerState))
  const selectedEncounters = useMemo(() => {
    const all = adventureStages.find((stage) => stage.id === selectedMap)?.encounters ?? []
    // Chapter 1 keeps the four tutorial cards; afterwards the whole zone is listed (MWI) with
    // the real difficulty forecast on each card, so the harder forest monsters become the
    // post-chapter content until the mine opens.
    if (playerState && !isChapter1Done) {
      return all.filter((encounter) => (CHAPTER1_MONSTERS as readonly string[]).includes(encounter.id))
    }
    const bossLast = (a: { isBoss?: boolean }, b: { isBoss?: boolean }) => Number(!!a.isBoss) - Number(!!b.isBoss)
    return [...all].sort(bossLast)
  }, [adventureStages, selectedMap, isChapter1Done, Boolean(playerState)])
  
  // 道具列表状态 - 用于交易所
  const [allItems, setAllItems] = useState<any>(null)
  const [itemsLoading, setItemsLoading] = useState(true)
  
  // 聊天相关状态 —— 接入 WebSocket 实时通信
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatChannel, setChatChannel] = useState<'world' | 'profession' | 'party' | 'private'>('world')
  // 私聊目标：点消息里的玩家名设置；未选择时私聊频道不可发送
  const [privateTarget, setPrivateTarget] = useState<{ id: string; name: string } | null>(null)
  // 窄屏（≤768px）下聊天默认收起，避免底部抽屉遮挡主内容
  const [isChatExpanded, setIsChatExpanded] = useState(false)
  // 移动端底栏：采集 / 生产 / 更多 三组以抽屉列出技能行
  const [mobileSheet, setMobileSheet] = useState<'gathering' | 'production' | 'more' | null>(null)
  // 冒险页的战斗配置（技能槽 / 食物 / 饮品）默认收成一行摘要
  const [showCombatConfig, setShowCombatConfig] = useState(false)
  // 交易行物品格的行情（最低卖价 / 最高收购）在自己的挂单变化后重新拉取
  const [marketRefreshKey, setMarketRefreshKey] = useState(0)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({
    world: 0,
    profession: 0,
    party: 0,
    private: 0
  })
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const chatChannelRef = useRef(chatChannel)
  chatChannelRef.current = chatChannel

  // WebSocket 连接管理
  useEffect(() => {
    const token = apiClient.getToken()
    if (!token) return
    chatWs.connect(token)
    return () => { chatWs.disconnect() }
  }, [user])

  // 监听 WebSocket 消息
  useEffect(() => {
    const unsubMsg = chatWs.onMessage((msg: ChatMsg) => {
      setChatMessages(prev => [...prev.slice(-99), msg])
      if (msg.channel === 'private' && !msg.isSelf && msg.sender && msg.type === 'message') {
        setPrivateTarget((prev) => prev || { id: msg.sender, name: msg.senderName || msg.sender })
      }
      // 如果消息不在当前频道，增加未读计数
      if (msg.channel !== chatChannelRef.current && msg.type === 'message') {
        setUnreadCounts(prev => ({
          ...prev,
          [msg.channel]: (prev[msg.channel] || 0) + 1
        }))
      }
    })
    const unsubStatus = chatWs.onStatus((status) => {
      setWsStatus(status)
    })
    return () => { unsubMsg(); unsubStatus() }
  }, [])

  // 服务端定向通知（市场成交/强化委托/队伍事件）→ Toast + 玩家状态刷新。
  // 通知一律意味着服务端状态已变（金币/物品/队伍关系），刷新本地副本。
  useEffect(() => {
    return chatWs.onNotify((n) => {
      const item = typeof n.itemId === 'string' ? getItemName(n.itemId) : ''
      switch (n.kind) {
        case 'market:sale':
          toast.reward(`市集售出 ${item}×${n.quantity}，+${n.gold} 金币`)
          setMarketRefreshKey((k) => k + 1)
          break
        case 'order:filled':
          toast.reward(`订单成交：${item}×${n.quantity}，+${n.gold} 金币`)
          setMarketRefreshKey((k) => k + 1)
          break
        case 'party:invite':
          toast.info('收到组队邀请，前往「组队」页查看')
          break
        case 'party:kicked':
          toast.info('你已被移出队伍')
          break
        case 'party:leader':
          toast.success('你已成为队长')
          break
        case 'party:leader_changed':
          toast.info('队长已更换')
          break
        case 'party:member_joined':
          toast.info('有新队员加入')
          break
        case 'party:activity_completed':
          toast.reward('队伍活动已结算')
          break
        case 'party:party_disbanded':
          toast.info('队伍已解散')
          break
        case 'enhancement:service_request':
          toast.info(`收到强化委托${item ? `：${item}` : ''}`)
          break
        case 'enhancement:service_completed':
          if (n.success) toast.success('委托的强化成功')
          else toast.info(`委托的强化失败${n.failureReason ? `：${n.failureReason}` : ''}`)
          break
        case 'enhancement:service_rejected':
          toast.info(`强化委托被拒绝${n.message ? `：${n.message}` : ''}`)
          break
        default:
          break
      }
      void refreshPlayerState()
    })
  }, [toast, refreshPlayerState])
  
  // 右侧边栏状态
  const [rightPanelView, setRightPanelView] = useState<'character' | 'inventory'>('character')
  const [isRightPanelExpanded, setIsRightPanelExpanded] = useState(false)
  const [selectedEquipSlot, setSelectedEquipSlot] = useState<string | null>(null)
  const [showEquipSelector, setShowEquipSelector] = useState(false)

  useEffect(() => {
    if (!showEquipSelector) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setShowEquipSelector(false)
      setSelectedEquipSlot(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showEquipSelector])
  
  // 背包筛选和搜索状态
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'material' | 'weapon' | 'armor' | 'consumable'>('all')
  const [inventorySearch, setInventorySearch] = useState('')
  const [inventorySortBy, setInventorySortBy] = useState<'default' | 'name' | 'tier' | 'count'>('default')
  
  // 制作相关状态
  const [craftQuantity, setCraftQuantity] = useState(1)
  const [favoriteRecipes, setFavoriteRecipes] = useState<Set<string>>(new Set())
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [partyTargetStageId, setPartyTargetStageId] = useState<string | null>(null)
  const [partyCombatInfo, setPartyCombatInfo] = useState<PartyCombatHeaderInfo | null>(null)

  useEffect(() => {
    if (!playerState) return
    if (!playerState.activePartyActivity && partyCombatInfo?.active) {
      setPartyCombatInfo(null)
    }
  }, [playerState, playerState?.activePartyActivity, partyCombatInfo?.active])
  
  /** "伐木/木工" for a profession skill id (采集或生产均可); undefined for non-profession skills. */
  const professionLabel = (skillId?: string): string | undefined => {
    const prof = skillId ? Object.values(professions).find((p) => p.skill === skillId || p.craftSkill === skillId) : undefined
    return prof ? [prof.gatherName, prof.craftName].filter(Boolean).join('/') : undefined
  }

  // 升级所需经验：与服务端同一条曲线（gameplay/xp.ts，参数为当前等级）
  const getXpForLevel = xpToNextLevel;
  
  // 获取当前职业信息
  const getCurrentProfession = () => professions[currentProfession]
  // 技能树面板用的职业等级 = 采集/生产两侧最高者（与后端解锁门槛一致）；若当前正处于生产标签页或生产动作，则优先显示生产经验
  const getCurrentSkill = () => {
    const p = getCurrentProfession()
    const gather = playerState?.skills?.[p.skill]
    const craft = playerState?.skills?.[p.craftSkill]
    if (!gather && !craft) return { level: 1, xp: 0 }
    if (['woodworking', 'smithing', 'husbandry', 'cooking', 'tailoring', 'alchemy'].includes(activeTab) && craft && (craft.level || 1) >= (gather?.level || 1)) {
      return craft
    }
    if ((craft?.level || 0) > (gather?.level || 0)) return craft!
    if ((craft?.level || 0) === (gather?.level || 0) && (craft?.xp || 0) > (gather?.xp || 0)) return craft!
    return gather || craft!
  }
  
  // 判断是否正在战斗某个怪物
  const isCurrentlyFighting = (monsterId: string): boolean => {
    if (
      playerState?.hpCombat &&
      (!playerState.hpCombat.outcome || Boolean(playerState.hpCombat.nextFightAt))
    ) {
      return playerState.hpCombat.monsterId === monsterId
    }
    if (!battleState || !battleState.isActive) return false;
    return battleState.monster.id === monsterId;
  };
  
  // 发送聊天消息（通过 WebSocket）
  const sendChatMessage = useCallback(() => {
    if (!chatInput.trim()) return
    if (chatChannel === 'private' && !privateTarget) {
      setChatMessages(prev => [...prev.slice(-99), {
        id: `local_err_${Date.now()}`,
        type: 'error' as const,
        channel: 'private',
        sender: '系统',
        content: '先点击玩家名字选择私聊对象',
        ts: new Date().toISOString(),
      }])
      return
    }
    const sent = chatWs.send(chatChannel, chatInput.trim(), chatChannel === 'private' ? privateTarget!.id : undefined)
    if (!sent) {
      // WebSocket 未连接，显示本地提示
      setChatMessages(prev => [...prev.slice(-99), {
        id: `local_err_${Date.now()}`,
        type: 'error' as const,
        channel: chatChannel,
        sender: '系统',
        content: '消息发送失败，连接已断开',
        ts: new Date().toISOString(),
      }])
    }
    setChatInput('')
    setShowEmojiPicker(false)
  }, [chatInput, chatChannel, privateTarget])
  
  // 插入表情
  const insertEmoji = (emoji: string) => {
    setChatInput(prev => prev + emoji)
    setShowEmojiPicker(false)
  }
  
  // 切换频道时清除未读计数
  const switchChannel = (channel: 'world' | 'profession' | 'party' | 'private') => {
    setChatChannel(channel)
    setUnreadCounts(prev => ({ ...prev, [channel]: 0 }))
  }

  // 点消息里的玩家名 → 切到私聊频道并锁定对象
  const startPrivateChat = useCallback((target: { id: string; name: string }) => {
    if (!target.id || target.id === user?.id) return
    setPrivateTarget(target)
    switchChannel('private')
  }, [user])

  const openEquipSelector = (slotId: string) => {
    if (slotId !== 'tool' && isCombatLockoutActive()) {
      toast.info('当前正在战斗中，无法更换战斗装备（请先停止战斗）')
      return
    }
    setSelectedEquipSlot(slotId)
    setShowEquipSelector(true)
  }
  
  // 装备物品
  const equipItem = async (itemId: string) => {
    if (!selectedEquipSlot) return
    if (selectedEquipSlot !== 'tool' && isCombatLockoutActive()) {
      toast.info('当前正在战斗中，无法更换战斗装备（请先停止战斗）')
      return
    }
    try {
      apiClient.clearCache()
      await apiClient.equipItem(UI_SLOT_TO_EQ[selectedEquipSlot], itemId)
      await refreshPlayerState()
      playGameSound("equip")
      toast.success('已装备')
    } catch (e: any) {
      toast.error(e?.message || '装备失败')
    } finally {
      setShowEquipSelector(false)
      setSelectedEquipSlot(null)
    }
  }

  const unequipSlot = async (slotId: string) => {
    if (slotId !== 'tool' && isCombatLockoutActive()) {
      toast.info('当前正在战斗中，无法卸下战斗装备（请先停止战斗）')
      return
    }
    try {
      apiClient.clearCache()
      await apiClient.unequipItem(UI_SLOT_TO_EQ[slotId])
      await refreshPlayerState()
    } catch (e: any) {
      toast.error(e?.message || '卸下失败')
    }
  }
  
  const getEquippedItemId = (uiSlot: string): string | undefined => {
    const key = UI_SLOT_TO_EQ[uiSlot]
    const val = (playerState?.equipment as any)?.[key]
    if (typeof val !== 'string' || !val) return undefined
    if (playerState?.inventory && (playerState.inventory[val] || 0) <= 0) return undefined
    return val
  }

  // 获取可装备的物品列表（根据槽位类型过滤）
  const getEquippableItems = (slotId: string) => {
    if (!playerState?.inventory || !contentPack?.items) return []
    const matches = (item: any) => {
      if (slotId === 'tool') return typeof item.toolFor === 'string' && item.toolFor.length > 0
      if (slotId === 'mainhand') return item.type === 'weapon'
      if (slotId === 'offhand') return item.type === 'offhand' || item.type === 'shield' || String(item.id).includes('shield')
      if (slotId === 'accessory1' || slotId === 'accessory2') return item.type === 'accessory' || item.slot === 'accessory'
      const want = slotId === 'head' ? 'head' : slotId
      return item.slot === want || (item.type === 'armor' && item.slot === want)
    }
    return Object.entries(playerState.inventory)
      .filter(([id, count]) => id !== 'gold' && Number(count || 0) > 0)
      .map(([id, count]) => {
        const item = contentPack.items.find((i: any) => i.id === id)
        return item ? { ...item, count: Number(count) } : null
      })
      .filter((item): item is any => !!item && matches(item))
  }
  
  // 筛选和排序背包物品
  const getFilteredInventoryItems = () => {
    if (!playerState?.inventory) return []
    
    let items = Object.entries(playerState.inventory)
      .filter(([key, value]) => key !== 'gold' && Number(value || 0) > 0)
      .map(([itemId, count]) => ({
        itemId,
        count: Number(count),
        ...getItemInfo(itemId)
      }))
    
    // 按类型筛选
    if (inventoryFilter !== 'all') {
      items = items.filter(item => {
        if (inventoryFilter === 'armor') {
          return item.type === 'armor' || item.type === 'offhand' || item.type === 'shield' || item.type === 'accessory'
        }
        if (inventoryFilter === 'consumable') {
          return item.type === 'consumable' || item.type === 'food' || item.type === 'book'
        }
        return item.type === inventoryFilter
      })
    }
    
    // 按名称搜索
    if (inventorySearch.trim()) {
      const searchLower = inventorySearch.toLowerCase()
      items = items.filter(item => 
        item.name.toLowerCase().includes(searchLower) || item.itemId.toLowerCase().includes(searchLower)
      )
    }
    
    // 排序
    switch (inventorySortBy) {
      case 'name':
        items.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
        break
      case 'tier':
        items.sort((a, b) => b.tier - a.tier)
        break
      case 'count':
        items.sort((a, b) => Number(b.count) - Number(a.count))
        break
      default:
        // 默认排序（按添加顺序）
        break
    }
    
    return items
  }
  
  // 整理背包（按品质排序）
  const organizeInventory = () => {
    setInventorySortBy('tier')
  }
  
  // 切换收藏配方
  const toggleFavoriteRecipe = (recipeId: string) => {
    setFavoriteRecipes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId)
      } else {
        newSet.add(recipeId)
      }
      return newSet
    })
  }
  
  // 从内容包获取指定职业（默认当前职业）的制作配方
  const getCraftRecipesFromContentPack = (category: string, profOverride?: string) => {
    if (!contentPack || !contentPack.actions) return []
    const targetProf = (profOverride && profOverride in professions ? profOverride : currentProfession) as keyof typeof professions
    const craftSkillId = professions[targetProf].craftSkill

    // 过滤出当前职业的制作配方（生产技能下的动作即制作配方）
    const recipes = contentPack.actions.filter((action: any) => action.skillId === craftSkillId)
    
    // 按产出物品类型分类。厨师/炼金的产出是 consumable，之前的分类表没有这一项，导致两页永远为空。
    const categorizedRecipes: Record<string, any[]> = {
      materials: [],
      weapons: [],
      equipment: [],
      consumables: [],
      accessories: [],
    }
    
    recipes.forEach((recipe: any) => {
      // 根据产出物品判断类别
      const outputItem = recipe.yields[0].itemId
      if (!outputItem) return
      
      // 查找物品信息
      const itemInfo = contentPack.items.find((item: any) => item.id === outputItem)
      if (!itemInfo) return
      // MWI: every recipe is listed from minute one; rows above the skill level render locked with
      // "再升 N 级解锁", and the chapter-1 goal bar does the guiding.
      
      // 转换为前端格式
      const formattedRecipe = {
        id: recipe.id,
        name: stripCraftVerb(recipe.name),
        output: outputItem,
        outputCount: recipe.yields[0].qty || 1,
        requires: recipe.consumes.map((consume: any) => ({
          item: consume.itemId,
          count: consume.qty
        })),
        time: recipe.duration / 1000, // 转换为秒
        xp: recipe.xp,
        level: recipe.requirements.skillLevel || 1,
        tier: itemInfo.tier || 1,
        type: itemInfo.type,
        atk: itemInfo.atk,
        mag: itemInfo.mag,
        def: itemInfo.def,
        hp: itemInfo.hp,
        toolFor: itemInfo.toolFor,
        toolSpeed: itemInfo.toolSpeed,
        enhanceSuccess: itemInfo.enhanceSuccess,
        desc: itemInfo.description || recipe.description,
      }
      
      // 分类
      if (itemInfo.type === 'weapon') {
        categorizedRecipes.weapons.push(formattedRecipe)
      } else if (itemInfo.type === 'armor' || itemInfo.type === 'offhand' || itemInfo.type === 'shield') {
        categorizedRecipes.equipment.push(formattedRecipe)
      } else if (itemInfo.type === 'consumable' || itemInfo.type === 'food') {
        categorizedRecipes.consumables.push(formattedRecipe)
      } else if (itemInfo.type === 'accessory') {
        categorizedRecipes.accessories.push(formattedRecipe)
      } else {
        categorizedRecipes.materials.push(formattedRecipe)
      }
    })
    
    if (category === '__all__') return Object.values(categorizedRecipes).flat()
    return categorizedRecipes[category] || []
  }

  const craftCategoriesFor = (profOverride?: string): string[] => {
    const targetProf = profOverride || currentProfession
    // 厨师/炼金以消耗品为主业，放最前
    const order = targetProf === 'chef' || targetProf === 'alchemist'
      ? ['consumables', 'materials', 'weapons', 'equipment', 'accessories']
      : ['materials', 'weapons', 'equipment', 'consumables', 'accessories']
    return order.filter((c) => getCraftRecipesFromContentPack(c, targetProf).length > 0)
  }
  
  // 计算最大可制作数量
  const getMaxCraftableQuantity = (recipe: any): number => {
    if (!recipe.requires || !playerState?.inventory) return 0
    
    let maxQuantity = 5000
    for (const req of recipe.requires) {
      const itemId = getRequiredItemId(req.item)
      const available = playerState.inventory?.[itemId] || 0
      const possibleQuantity = Math.floor(available / req.count)
      maxQuantity = Math.min(maxQuantity, possibleQuantity)
    }
    
    return Math.max(0, maxQuantity)
  }
  
  // 处理回车发送
  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendChatMessage()
    }
  }
  
  // 战斗相关状态
  const [battleState, setBattleState] = useState<{
    isActive: boolean;
    monster: any;
    playerHp: number;
    playerMaxHp: number;
    enemyHp: number;
    enemyMaxHp: number;
    playerCastTime: number; // 玩家读条进度（0-3000ms）
    enemyCastTime: number; // 敌人读条进度（0-3000ms）
    playerCastDuration: number; // 玩家读条总时长（默认3000ms）
    enemyCastDuration: number; // 敌人读条总时长（默认3000ms）
    battleLog: string[];
    battleCount: number; // 连续战斗次数
    isPlayerDead: boolean; // 玩家是否死亡
    drops: Array<{ itemId: string; name: string; qty: number }>; // 服务端实际发放的稀有掉落
  } | null>(null)
  const combatTimingRef = useRef<{
    syncPerfNow: number;
    playerCooldownMs: number;
    enemyCooldownMs: number;
    playerIntervalMs: number;
    enemyIntervalMs: number;
  } | null>(null)
  const [combatNow, setCombatNow] = useState(() => Date.now())

  useEffect(() => {
    const hp = playerState?.hpCombat
    if (!hp) {
      combatTimingRef.current = null
      setBattleState(null)
      return
    }
    const playerIntervalMs = Math.max(200, hp.playerIntervalMs || 2400)
    const enemyIntervalMs = Math.max(200, hp.enemyIntervalMs || 3000)
    combatTimingRef.current = {
      syncPerfNow: performance.now(),
      playerCooldownMs: hp.playerCooldownMs || 0,
      enemyCooldownMs: hp.enemyCooldownMs || 0,
      playerIntervalMs,
      enemyIntervalMs,
    }
    setCombatNow(Date.now())
    const prev = prevCombatRef.current
    const isNewFight = Boolean(prev && ((hp.startedAt && prev.startedAt && hp.startedAt !== prev.startedAt) || (prev.outcome && !hp.outcome)))
    const showFullSpawnFirst = isNewFight && !hp.outcome && hp.enemyHp < hp.enemyMaxHp
    const allEncounters = adventureStages.flatMap((s) => s.encounters)
    const matchedEncounter = selectedEncounters.find((e) => e.id === hp.monsterId) || allEncounters.find((e) => e.id === hp.monsterId)
    const baseState = {
      isActive: !hp.outcome,
      monster: {
        id: hp.monsterId,
        name: hp.monsterName,
        icon: matchedEncounter?.icon,
        isBoss: Boolean(matchedEncounter?.isBoss || hp.monsterId.endsWith('_boss')),
        xp: matchedEncounter?.xp || 0,
        gold: matchedEncounter?.gold || 0,
        level: matchedEncounter?.level || 1,
      },
      playerHp: hp.playerHp,
      playerMaxHp: hp.playerMaxHp,
      enemyHp: showFullSpawnFirst ? hp.enemyMaxHp : hp.enemyHp,
      enemyMaxHp: hp.enemyMaxHp,
      playerCastTime: hp.playerCooldownMs,
      enemyCastTime: hp.enemyCooldownMs,
      playerCastDuration: playerIntervalMs,
      enemyCastDuration: enemyIntervalMs,
      battleLog: hp.log,
      battleCount: (hp.streak || 0) + 1,
      isPlayerDead: hp.outcome === 'loss',
      drops: hp.drops || [],
    }
    setBattleState(baseState)
    if (showFullSpawnFirst) {
      const timerId = window.setTimeout(() => {
        setBattleState((curr) => (curr && curr.isActive ? { ...curr, enemyHp: hp.enemyHp } : curr))
      }, 150)
      return () => window.clearTimeout(timerId)
    }
  }, [playerState?.hpCombat])

  // Smoothly interpolate combat attack cast bars and ability cooldowns at 20fps between 1s server polls,
  // and keep combatNow ticking at 1Hz out of combat so active buff duration bars on the adventure map stay live.
  useEffect(() => {
    const inFastCombatLoop = Boolean(
      battleState?.isActive ||
        (playerState?.hpCombat?.outcome && playerState?.hpCombat?.nextFightAt)
    )
    if (!inFastCombatLoop) {
      const slowId = window.setInterval(() => setCombatNow(Date.now()), 1000)
      return () => window.clearInterval(slowId)
    }
    const id = window.setInterval(() => {
      setCombatNow(Date.now())
      const timing = combatTimingRef.current
      if (!timing || !battleState?.isActive) return
      const dt = Math.max(0, performance.now() - timing.syncPerfNow)
      const nextPlayerCast = Math.min(timing.playerIntervalMs, timing.playerCooldownMs + dt)
      const nextEnemyCast = Math.min(timing.enemyIntervalMs, timing.enemyCooldownMs + dt)
      setBattleState((prev) =>
        prev && prev.isActive
          ? {
              ...prev,
              playerCastTime: nextPlayerCast,
              enemyCastTime: nextEnemyCast,
            }
          : prev
      )
    }, 50)
    return () => window.clearInterval(id)
  }, [battleState?.isActive, playerState?.hpCombat?.outcome, playerState?.hpCombat?.nextFightAt])

  // MWI timed enhancing: attempts land on the server every interval; poll so the page keeps up.
  useEffect(() => {
    if (!(playerState?.mode === 'enhancing' && playerState.enhanceRun && !playerState.enhanceRun.outcome)) return
    const id = window.setInterval(() => {
      void refreshPlayerState()
    }, 1000)
    return () => window.clearInterval(id)
  }, [playerState?.mode, playerState?.enhanceRun?.nextAttemptAt, playerState?.enhanceRun?.outcome, refreshPlayerState])

  useEffect(() => {
    if (!playerState?.hpCombat) return
    // Keep polling while fighting, and while a finished fight (win intermission or death respawn) waits to auto-repeat.
    const awaitingRepeat = !!playerState.hpCombat.outcome && !!playerState.hpCombat.nextFightAt
    if (playerState.hpCombat.outcome && !awaitingRepeat) return
    const id = window.setInterval(() => {
      void refreshPlayerState()
    }, 1000)
    let nextTimer: number | undefined
    if (awaitingRepeat && playerState.hpCombat.nextFightAt) {
      const waitMs = Math.max(25, playerState.hpCombat.nextFightAt - Date.now() + 30)
      nextTimer = window.setTimeout(() => {
        void refreshPlayerState()
      }, waitMs)
    }
    return () => {
      window.clearInterval(id)
      if (nextTimer !== undefined) window.clearTimeout(nextTimer)
    }
  }, [playerState?.hpCombat?.monsterId, playerState?.hpCombat?.outcome, playerState?.hpCombat?.nextFightAt, refreshPlayerState])

  useEffect(() => {
    const hp = playerState?.hpCombat
    if (!hp) {
      prevCombatRef.current = null
      return
    }
    const prev = prevCombatRef.current
    const heavyReadyNow = Date.now() >= (hp.heavyChopReadyAt || 0)
    if (prev) {
      const isNewFight = Boolean((hp.startedAt && prev.startedAt && hp.startedAt !== prev.startedAt) || (prev.outcome && !hp.outcome))
      const baselineEnemyHp = isNewFight ? hp.enemyMaxHp : prev.enemyHp
      const baselinePlayerHp = isNewFight ? hp.playerMaxHp : prev.playerHp
      if (hp.enemyHp < baselineEnemyHp) {
        const addedCount = Math.max(1, hp.log.length - (isNewFight ? 0 : prev.logLen))
        const newLines = hp.log.slice(-addedCount)
        const heavy = newLines.some((l: string) => l.includes("重劈"))
        playGameSound(heavy ? "skill" : "combat-hit")
        pushDamageFloat("enemy", baselineEnemyHp - hp.enemyHp, heavy)
        shake("enemy")
      }
      if (hp.playerHp < baselinePlayerHp) {
        playGameSound("combat-hit")
        pushDamageFloat("player", baselinePlayerHp - hp.playerHp, false)
        shake("player")
      }
      if ((hp.guardActive && !prev.guardActive) || (hp.wrathActive && !prev.wrathActive)) {
        playGameSound("boss-phase")
      }
      if (heavyReadyNow && !prev.heavyReady && !hp.outcome) {
        playGameSound("skill-ready")
      }
      if (hp.outcome === "win" && prev.outcome !== "win") {
        const isBossFight = hp.monsterId.endsWith("_boss") || adventureStages.some((s) => s.encounters.some((e) => e.id === hp.monsterId && e.isBoss))
        playGameSound(isBossFight ? "boss-win" : "victory")
        if (hp.drops && hp.drops.length > 0) window.setTimeout(() => playGameSound("rare-drop"), 350)
        setShowVictoryFx(true)
        window.setTimeout(() => setShowVictoryFx(false), 1200)
        setBuildModalDelayDone(false)
        window.setTimeout(() => setBuildModalDelayDone(true), 1500)
      }
    }
    prevCombatRef.current = {
      enemyHp: hp.enemyHp,
      playerHp: hp.playerHp,
      guardActive: hp.guardActive,
      wrathActive: hp.wrathActive,
      outcome: hp.outcome,
      logLen: hp.log.length,
      heavyReady: heavyReadyNow,
      startedAt: hp.startedAt,
    }
  }, [playerState?.hpCombat])

  useEffect(() => {
    if (!playerState) return
    const combat = playerState.combatLevel || 1
    const totalSkillLv = Object.values(playerState.skills || {}).reduce<number>((sum: number, s: any) => sum + (s?.level || 1), 0)
    if (prevLevelsRef.current) {
      if (combat > prevLevelsRef.current.combat || totalSkillLv > prevLevelsRef.current.wood) {
        playGameSound("level-up")
      }
    }
    prevLevelsRef.current = { combat, wood: totalSkillLv }
  }, [playerState?.combatLevel, playerState?.skills])

  useEffect(() => {
    if (!playerState) return
    const craft =
      (playerState.inventory.wood_1 || 0) > 0 ||
      (playerState.inventory.lumber_1 || 0) > 0 ||
      (playerState.stats?.totalGathered || 0) > 0
    const adventure = Boolean(
      playerState.equipment?.main_hand ||
      (playerState.stats?.totalKills || 0) > 0 ||
      playerState.progression?.completedMilestones?.equip_sword
    )
    if (prevUnlockRef.current) {
      if ((craft && !prevUnlockRef.current.craft) || (adventure && !prevUnlockRef.current.adventure)) {
        playGameSound("unlock")
      }
    }
    prevUnlockRef.current = { craft, adventure }
  }, [playerState?.inventory?.wood_1, playerState?.inventory?.lumber_1, playerState?.stats?.totalGathered, playerState?.equipment?.main_hand])
  
  // 状态栏相关状态
  const [currentActivity, setCurrentActivity] = useState<CurrentActivity | null>(null)
  const [progress, setProgress] = useState(0)
  const lastRefreshTimeRef = useRef(0) // 使用ref记录上次刷新时间，避免触发重渲染
  const isStoppingRef = useRef(false) // 标记是否正在停止活动
  
  // 奖励通知状态
  const [rewardNotification] = useState<{
    show: boolean;
    xp: number;
    gold: number;
    key: number;
  }>({ show: false, xp: 0, gold: 0, key: 0 })

  // 战斗伤害飘字：由服务端 hpCombat 两次快照的 HP 差值驱动（1s 轮询内多次命中会合并成一条）
  const [damageFloats, setDamageFloats] = useState<Array<{
    id: number;
    target: 'player' | 'enemy';
    damage: number;
    isCrit: boolean;
  }>>([])
  const floatIdRef = useRef(0)
  const pushDamageFloat = useCallback((target: 'player' | 'enemy', damage: number, isCrit: boolean) => {
    const id = ++floatIdRef.current
    setDamageFloats((prev) => [...prev.slice(-5), { id, target, damage, isCrit }])
    window.setTimeout(() => setDamageFloats((prev) => prev.filter((f) => f.id !== id)), 900)
  }, [])

  // 战斗受击震动状态
  const [hitShake, setHitShake] = useState<{ player: boolean; enemy: boolean }>({ player: false, enemy: false })
  const shake = useCallback((target: 'player' | 'enemy') => {
    setHitShake((prev) => ({ ...prev, [target]: true }))
    window.setTimeout(() => setHitShake((prev) => ({ ...prev, [target]: false })), 320)
  }, [])

  // 胜利特效状态
  const [showVictoryFx, setShowVictoryFx] = useState(false)

  // 胜利奖励先亮 1.5 秒，再弹"选择你的第一刀"，两个高光时刻不互相遮
  const [buildModalDelayDone, setBuildModalDelayDone] = useState(true)

  // 采集/制作周期完成闪光
  const [cycleCompleteFlash, setCycleCompleteFlash] = useState(false)
  
  // 强制重新渲染的状态
  const [forceUpdate] = useState(0)

  // 加载内容包
  useEffect(() => {
    const loadContentPack = async () => {
      try {
        setContentPackLoading(true)
        const pack = await apiClient.getContentPack()
        setContentPack(pack)
        registerItemNames(pack?.items)
        logger.debug('✅ 内容包加载成功', pack)
      } catch (error) {
        logger.error('❌ 加载内容包失败', error)
      } finally {
        setContentPackLoading(false)
      }
    }
    loadContentPack()
  }, [])

  // 加载道具列表（用于交易行）
  useEffect(() => {
    const loadAllItems = async () => {
      try {
        setItemsLoading(true)
        const items = await apiClient.getAllItems()
        setAllItems(items)
        logger.debug('✅ 道具列表加载成功:', items)
      } catch (error) {
        logger.error('❌ 加载道具列表失败:', error)
      } finally {
        setItemsLoading(false)
      }
    }
    loadAllItems()
  }, [])

  // 加载选中物品的订单
  useEffect(() => {
    if (!selectedTradingItem) {
      setTradingOrders([]);
      return;
    }

    const reqId = ++tradingOrdersReqRef.current;
    const loadOrders = async () => {
      try {
        setTradingOrdersLoading(true);
        const orders = await apiClient.getTradingOrders(selectedTradingItem);
        if (tradingOrdersReqRef.current === reqId) setTradingOrders(orders);
        logger.debug('✅ 订单加载成功:', orders);
      } catch (error) {
        logger.error('❌ 加载订单失败:', error);
        if (tradingOrdersReqRef.current === reqId) setTradingOrders([]);
      } finally {
        setTradingOrdersLoading(false);
      }
    };

    loadOrders();
  }, [selectedTradingItem]);

  // 页面加载时恢复活动状态
  useEffect(() => {
    if (!playerState || !contentPack) return;
    
    // 如果正在停止活动，不要恢复
    if (isStoppingRef.current) {
      logger.debug('⏭️ 跳过恢复：正在停止活动');
      return;
    }
    
    // 如果前端已经有活动状态，不需要恢复
    if (currentActivity || battleState) {
      logger.debug('⏭️ 跳过恢复：前端已有状态', { currentActivity: !!currentActivity, battleState: !!battleState });
      return;
    }
    
    logger.debug('🔍 检查是否需要恢复活动状态', { 
      mode: playerState.mode, 
      lifeActionState: playerState.lifeActionState,
      currentActivity: currentActivity,
      battleState: battleState
    });
    
    // 战斗与生活互斥：若处于单人战斗（含连战等待中）或组队副本战斗，禁止恢复生活动作
    const inSoloCombat = Boolean(
      playerState.hpCombat &&
        (!playerState.hpCombat.outcome || (playerState.combatLoadout?.autoRepeat && playerState.hpCombat.nextFightAt))
    );
    const inPartyCombat = Boolean(playerState.activePartyActivity || partyCombatInfo?.active);
    if (inSoloCombat || inPartyCombat) {
      if (currentActivity) {
        setCurrentActivity(null);
        setProgress(0);
      }
      return;
    }

    // 检查后端是否有正在进行的活动
    if (playerState.mode === 'life_action' && playerState.lifeActionState) {
      const actionId = playerState.lifeActionState.actionId;
      const startedAt = new Date(playerState.lifeActionState.startedAt);
      
      // 跳过战斗活动（战斗活动的ID以act_combat_开头）
      if (actionId.startsWith('act_combat_')) {
        logger.debug('⚠️ 跳过恢复战斗活动:', actionId);
        return;
      }
      
      // 从contentPack中查找对应的action信息
      const action = contentPack.actions.find((a: any) => a.id === actionId);
      if (action) {
        logger.debug('⚠️ 准备恢复活动:', action.name, 'actionId:', actionId);
        const durationMs =
          playerState.lifeActionState.effectiveDurationMs && playerState.lifeActionState.effectiveDurationMs > 0
            ? playerState.lifeActionState.effectiveDurationMs
            : action.duration;
        
        // 恢复活动状态
        const activityInfo: CurrentActivity = {
          name: action.name,
          output: action.yields[0].itemId ? getItemNameById(action.yields[0].itemId) : '未知',
          duration: Math.round((durationMs / 1000) * 100) / 100, // 转换为秒（保留实际有效时长精度）
          mark: activityMarkFromAction(actionId),
          actionId,
        };
        
        setCurrentActivity(activityInfo);
        
        // 计算当前进度
        const now = new Date();
        const elapsedMs = Math.max(0, now.getTime() - startedAt.getTime());
        const currentProgress = ((elapsedMs % durationMs) / durationMs) * 100;
        
        setProgress(Math.min(currentProgress, 100));
        logger.debug('✅ 恢复活动状态', activityInfo, '进度:', currentProgress.toFixed(2) + '%');
      } else {
        logger.debug('⚠️ 未找到活动定义', actionId);
      }
    } else {
      logger.debug('ℹ️ 后端无活动状态，mode:', playerState.mode);
    }
  }, [playerState, contentPack, currentActivity, battleState]);

  // 服务端说"空闲"时前端不能再转进度环（批量制作做完、材料耗尽、别处停止都会走到这里）。
  // 开始请求进行中除外：此时 playerState 还没拿到新的 life_action。
  useEffect(() => {
    if (!playerState || !currentActivity || actionLoading) return;
    const inSoloCombat = Boolean(
      playerState.hpCombat &&
        (!playerState.hpCombat.outcome || (playerState.combatLoadout?.autoRepeat && playerState.hpCombat.nextFightAt))
    );
    const inPartyCombat = Boolean(playerState.activePartyActivity || partyCombatInfo?.active);
    if (playerState.mode !== 'life_action' || !playerState.lifeActionState || inSoloCombat || inPartyCombat) {
      setCurrentActivity(null);
      setProgress(0);
      return;
    }
    // 队列在服务端切到了下一个动作：清掉旧的，让恢复逻辑按新动作重建进度环
    if (currentActivity.actionId && playerState.lifeActionState.actionId !== currentActivity.actionId) {
      setCurrentActivity(null);
      setProgress(0);
      return;
    }
    // 同步服务端计算出的实际有效耗时（含工具加速、职业专精、房屋与Buff加成）
    const effMs = playerState.lifeActionState.effectiveDurationMs;
    if (effMs && effMs > 0) {
      const effSec = Math.round((effMs / 1000) * 100) / 100;
      if (Math.abs(currentActivity.duration - effSec) > 0.01) {
        setCurrentActivity((prev) => (prev ? { ...prev, duration: effSec } : prev));
      }
    }
  }, [playerState?.mode, playerState?.lifeActionState?.actionId, playerState?.lifeActionState?.effectiveDurationMs, playerState?.lifeActionState, currentActivity, actionLoading]);

  // 进度条循环动画：使用 requestAnimationFrame 以 ~30fps (0.1% 精度) 平滑更新顶部进度环与列表行进度条
  useEffect(() => {
    // 战斗时不显示进度条
    if (battleState?.isActive) {
      setProgress(0);
      return;
    }
    
    if (!currentActivity) {
      setProgress(0);
      return;
    }

    const duration = Math.max(200, currentActivity.duration * 1000); // 转换为毫秒
    const startedAt = performance.now() - (progress / 100) * duration;
    let animationFrameId = 0;
    let lastPaintedProgress = Math.round(progress * 10) / 10;
    let lastPaintAt = 0;

    let lastCycleBucket = Math.floor((performance.now() - startedAt) / duration);

    const tick = (now: number) => {
      const elapsed = Math.max(0, now - startedAt);
      const cycleProgress = Math.round((((elapsed % duration) / duration) * 100) * 10) / 10;

      if (cycleProgress !== lastPaintedProgress && (now - lastPaintAt >= 32 || cycleProgress < lastPaintedProgress)) {
        lastPaintedProgress = cycleProgress;
        lastPaintAt = now;
        setProgress(cycleProgress);
      }

      // 检测周期完成，触发闪光效果
      const currentBucket = Math.floor(elapsed / duration);
      if (currentBucket > lastCycleBucket) {
        lastCycleBucket = currentBucket;
        setCycleCompleteFlash(true);
        playGameSound(currentActivity.mark === "制" ? "craft-complete" : "gather-complete");
        if (flashTimerId !== null) window.clearTimeout(flashTimerId);
        flashTimerId = window.setTimeout(() => setCycleCompleteFlash(false), 600);
      }

      if (elapsed >= duration) {
        const refreshBucket = Math.floor(elapsed / duration);
        const refreshKey = startedAt + refreshBucket * duration;
        if (refreshKey > lastRefreshTimeRef.current) {
          lastRefreshTimeRef.current = refreshKey;
          void refreshPlayerState();
          // 客户端计时器可能比服务端结算早几十毫秒；补一次刷新，避免库存永远慢一个周期
          if (refreshTimerId !== null) window.clearTimeout(refreshTimerId);
          refreshTimerId = window.setTimeout(() => { void refreshPlayerState(); }, 600);
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    let flashTimerId: number | null = null;
    let refreshTimerId: number | null = null;
    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (flashTimerId !== null) window.clearTimeout(flashTimerId);
      if (refreshTimerId !== null) window.clearTimeout(refreshTimerId);
    };
  }, [currentActivity, battleState?.isActive, refreshPlayerState]);

  // 打开制作弹窗前先拉一次最新状态：弹窗里的"最大"和材料计数直接读 playerState，
  // 采集进行中时前端库存可能比服务端慢一个周期。
  const openCraftModal = (item: any) => {
    if ( Boolean(playerState?.activePartyActivity || partyCombatInfo?.active || battleState?.isActive || (playerState?.hpCombat && (!playerState.hpCombat.outcome || playerState.hpCombat.nextFightAt))) ) {
      toast.info("当前正在战斗中，无法进行生产与生活技能（请先在顶部停止战斗）");
      return;
    }
    setSelectedItem(item);
    setModalType('craft');
    setCraftQuantity(1);
    void refreshPlayerState();
  };

  // ---- 采集页（内容包驱动，银河奶牛式动作列表）----
  const openGatherRow = (row: SkillActionRow) => {
    if ( Boolean(playerState?.activePartyActivity || partyCombatInfo?.active || battleState?.isActive || (playerState?.hpCombat && (!playerState.hpCombat.outcome || playerState.hpCombat.nextFightAt))) ) {
      toast.info("当前正在战斗中，无法进行生产与生活技能（请先在顶部停止战斗）");
      return;
    }
    const a = row.action
    const flavor = GATHER_FLAVOR_BY_ACTION[a.id]
    const out = row.primaryYield
    // 采集弹窗沿用 selectedItem 结构；等级/时长/经验/产出全部来自内容包，而不是本地表
    setSelectedItem({
      id: flavor?.cardId || a.id,
      actionId: a.id,
      name: flavor?.title || a.name,
      desc: flavor?.desc || '',
      icon: '',
      level: row.requiredLevel,
      xp: a.xp,
      output: out ? getItemNameById(out.itemId) : '',
      outputItemId: out?.itemId,
      outputRange: out ? String(out.qty) : '1',
      time: Math.round(a.duration / 100) / 10,
      rare: '',
      rareChance: 0,
    })
    setModalType('tree')
    setGatherQuantity(null)
  }
  const gatherArtIds = new Set(
    [...trees, ...ores, ...crops, ...fishingSpots, ...fiberSpots, ...crystalSpots]
      .map((c) => c.id)
      .filter((id) => !!t1Url(`trees/${id}`))
  )

  // 炼金术分支切换：药剂与炼金配方 vs 点石成金（Coinify）
  const [alchemyBranch, setAlchemyBranch] = useState<'recipes' | 'coinify'>('recipes')
  const [coinifyItemId, setCoinifyItemId] = useState<string>('')
  const [coinifyFilter, setCoinifyFilter] = useState<'all' | 'material' | 'gear' | 'consumable'>('all')
  const [coinifyBusy, setCoinifyBusy] = useState<boolean>(false)

  const renderGatherPage = (tab: keyof typeof GATHER_PAGES) => {
    if (!playerState) return null
    const cfg = GATHER_PAGES[tab]
    const skillLevel = playerState.skills?.[cfg.skillId]?.level || 1
    const rows = skillActionRows(contentPack?.actions as any, cfg.skillId, 'gathering', skillLevel, {
      cardIdByActionId: Object.fromEntries(Object.entries(GATHER_FLAVOR_BY_ACTION).map(([k, v]) => [k, v.cardId])),
      titleByActionId: Object.fromEntries(Object.entries(GATHER_FLAVOR_BY_ACTION).map(([k, v]) => [k, v.title])),
    })
    const skillName = professions[cfg.profession as keyof typeof professions]?.gatherName || cfg.title
    const isCombatLock = Boolean(
      playerState.activePartyActivity ||
        partyCombatInfo?.active ||
        battleState?.isActive ||
        (playerState.hpCombat &&
          (!playerState.hpCombat.outcome || playerState.hpCombat.nextFightAt))
    )
    return (
      <div className={`logging-layout skill-page${isCombatLock ? ' combat-disabled-page' : ''}`} data-skill-page={tab}>
        <div className="page-header">
          <h2 className="section-title">{cfg.title} <span className="skill-page-level">Lv.{skillLevel}</span></h2>
          <div className="page-info"><p>{cfg.blurb}</p></div>
        </div>
        {isCombatLock && (
          <div className="combat-lock-banner">
            <T1ItemIcon itemId="weapon_iron_sword" className="gold-inline" alt="" /> 当前正在战斗中，所有生产与生活技能已锁定置灰
            <button type="button" className="btn-secondary" style={{ marginLeft: 10, padding: '2px 10px', fontSize: 12 }} onClick={() => void stopBattle()}>
              立即停止战斗
            </button>
          </div>
        )}
        <ProductionTeaBar playerState={playerState} refreshPlayerState={refreshPlayerState} />
        {contentPackLoading ? (
          <div className="loading-message">加载中...</div>
        ) : (
          <SkillActionList
            rows={rows}
            skillName={skillName}
            skillLevel={skillLevel}
            runningActionId={playerState.mode === 'life_action' ? playerState.lifeActionState?.actionId : undefined}
            runningStartedAt={playerState.mode === 'life_action' ? playerState.lifeActionState?.startedAt : undefined}
            runningProgress={playerState.mode === 'life_action' ? progress : undefined}
            runningEffectiveDurationMs={playerState.mode === 'life_action' ? playerState.lifeActionState?.effectiveDurationMs : undefined}
            artIds={gatherArtIds}
            nameOf={getItemNameById}
            iconOf={getItemIcon}
            onOpen={openGatherRow}
            onQuickToggle={quickToggleRow}
            hintFor={(row) => (row.action.id === 'act_chop_wood_t1' && !chapterDone ? goalMaterialHint() : null)}
          />
        )}
      </div>
    )
  }

  const renderCraftPage = (tab: keyof typeof CRAFT_PAGES) => {
    if (!playerState) return null
    const cfg = CRAFT_PAGES[tab]
    const skillId = professions[cfg.profession as keyof typeof professions].craftSkill
    const skillLevel = playerState.skills?.[skillId]?.level || 1
    const cats = craftCategoriesFor(cfg.profession)
    const active = cats.includes(craftCategory) ? craftCategory : (cats[0] || 'materials')
    const recipes = getCraftRecipesFromContentPack(active, cfg.profession).filter((r: any) => !showFavoritesOnly || favoriteRecipes.has(r.id))
    const skillName = professions[cfg.profession as keyof typeof professions]?.craftName || cfg.title
    const isCombatLock = Boolean(
      playerState.activePartyActivity ||
        partyCombatInfo?.active ||
        battleState?.isActive ||
        (playerState.hpCombat &&
          (!playerState.hpCombat.outcome || playerState.hpCombat.nextFightAt))
    )
    return (
      <div className={`crafting-layout skill-page${isCombatLock ? ' combat-disabled-page' : ''}`} data-skill-page={tab}>
        <div className="page-header">
          <h2 className="section-title">{cfg.title} <span className="skill-page-level">Lv.{skillLevel}</span></h2>
          <div className="page-info"><p>{cfg.blurb}</p></div>
        </div>
        {isCombatLock && (
          <div className="combat-lock-banner">
            <T1ItemIcon itemId="weapon_iron_sword" className="gold-inline" alt="" /> 当前正在战斗中，所有生产与生活技能已锁定置灰
            <button type="button" className="btn-secondary" style={{ marginLeft: 10, padding: '2px 10px', fontSize: 12 }} onClick={() => void stopBattle()}>
              立即停止战斗
            </button>
          </div>
        )}
        <ProductionTeaBar playerState={playerState} refreshPlayerState={refreshPlayerState} />
        {tab === 'alchemy' && (
          <div className="alchemy-branch-tabs" role="tablist" aria-label="炼金分支选择">
            <button
              type="button"
              role="tab"
              aria-selected={alchemyBranch === 'recipes'}
              className={`alchemy-branch-tab ${alchemyBranch === 'recipes' ? 'active' : ''}`}
              onClick={() => setAlchemyBranch('recipes')}
            >
              <T1ItemIcon itemId="weapon_alchemy_bottle_t1" className="gold-inline" alt="" /> 药剂与炼金制作
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={alchemyBranch === 'coinify'}
              className={`alchemy-branch-tab ${alchemyBranch === 'coinify' ? 'active' : ''}`}
              onClick={() => setAlchemyBranch('coinify')}
            >
              <GoldIcon /> 点石成金（Coinify 转化金币）
            </button>
          </div>
        )}
        {tab === 'alchemy' && alchemyBranch === 'coinify' ? (
          <AlchemyCoinifyPanel
            playerState={playerState}
            contentPack={contentPack}
            currentProfession={currentProfession}
            skillLevel={skillLevel}
            coinifyItemId={coinifyItemId}
            setCoinifyItemId={setCoinifyItemId}
            coinifyFilter={coinifyFilter}
            setCoinifyFilter={setCoinifyFilter}
            coinifyBusy={coinifyBusy}
            setCoinifyBusy={setCoinifyBusy}
            refreshPlayerState={refreshPlayerState}
          />
        ) : (
          <>
        <div className="craft-header-controls">
          <div className="craft-categories">
            {cats.map((c) => (
              <button key={c} className={`category-btn ${active === c ? 'active' : ''}`} onClick={() => setCraftCategory(c)}>
                {CRAFT_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <button
            className={`btn-favorites ${showFavoritesOnly ? 'active' : ''}`}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            title={showFavoritesOnly ? '显示全部' : '只看收藏'}
          >
            {showFavoritesOnly ? '★收藏' : '☆收藏'}
          </button>
        </div>
        {contentPackLoading ? (
          <div className="loading-message">加载中...</div>
        ) : (
          <CraftRecipeList
            recipes={recipes}
            skillName={skillName}
            skillLevel={skillLevel}
            inventory={playerState.inventory}
            runningActionId={playerState.mode === 'life_action' ? playerState.lifeActionState?.actionId : undefined}
            runningStartedAt={playerState.mode === 'life_action' ? playerState.lifeActionState?.startedAt : undefined}
            runningProgress={playerState.mode === 'life_action' ? progress : undefined}
            runningEffectiveDurationMs={playerState.mode === 'life_action' ? playerState.lifeActionState?.effectiveDurationMs : undefined}
            favorites={favoriteRecipes}
            nameOf={getItemNameById}
            iconOf={getItemIcon}
            resolveItemId={getRequiredItemId}
            whyLine={(r) => {
              const out: any = contentPack?.items?.find((i: any) => i.id === r.output)
              if (out?.toolFor) {
                const line = toolEffectLine(out, professionLabel(out.toolFor))
                return line ? `工具：${line}` : ''
              }
              const why = craftWhy({ id: r.output, atk: r.atk, def: r.def, hp: r.hp }, combatSheet, { equippedMainAtk: weaponAtk, outputEquipped: Object.values(playerState.equipment || {}).includes(r.output) })
              return why === '做成之后会进背包。' ? '' : why
            }}
            onOpen={(r) => openCraftModal(r)}
            onToggleFavorite={toggleFavoriteRecipe}
            onQuickToggle={quickToggleCraft}
          />
        )}
        {showFavoritesOnly && recipes.length === 0 && (
          <div className="no-favorites"><div className="empty-icon">☆</div><p>还没有收藏的配方</p><p className="hint-text">点配方右侧的星星收藏</p></div>
        )}
          </>
        )}
      </div>
    )
  }

  // ---- 动作面板收益预览（服务端真值）----
  const [actionPreview, setActionPreview] = useState<ActionPreview | null>(null);
  const [actionPreviewLoading, setActionPreviewLoading] = useState(false);
  const previewActionId: string | null =
    selectedItem && modalType === 'tree' ? selectedItem.actionId || null
    : selectedItem && modalType === 'craft' ? selectedItem.id || null
    : null;
  useEffect(() => {
    if (!previewActionId) { setActionPreview(null); return; }
    let cancelled = false;
    setActionPreviewLoading(true);
    apiClient.getActionPreview(previewActionId)
      .then((p) => { if (!cancelled) setActionPreview(p); })
      .catch(() => { if (!cancelled) setActionPreview(null); })
      .finally(() => { if (!cancelled) setActionPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [previewActionId, playerState?.skills, playerState?.equipment]);

  // ---- 行动队列（银河奶牛式）----
  const ACTION_QUEUE_MAX = 5;
  const [gatherQuantity, setGatherQuantity] = useState<number | null>(null); // null = 无限
  const actionNameOf = (actionId: string) =>
    contentPack?.actions?.find((a: any) => a.id === actionId)?.name || actionId;
  const isCombatLockoutActive = () =>
    Boolean(
      playerState?.activePartyActivity ||
        partyCombatInfo?.active ||
        battleState?.isActive ||
        (playerState?.hpCombat &&
          (!playerState.hpCombat.outcome || playerState.hpCombat.nextFightAt))
    );

  const queueAction = async (actionId: string, quantity?: number) => {
    if (isCombatLockoutActive()) {
      toast.info('当前正在战斗中，无法进行生产与生活技能（请先在顶部停止战斗）');
      return;
    }
    try {
      const name = actionNameOf(actionId);
      const wasIdle = playerState?.mode !== 'life_action';
      await apiClient.queueAction(actionId, quantity);
      apiClient.clearCache();
      await refreshPlayerState();
      setSelectedItem(null);
      setModalType(null);
      toast.success(wasIdle ? `已开始「${name}」` : `已加入队列：「${name}」${quantity ? ` ×${quantity}` : ''}`);
    } catch (e: any) {
      toast.error(e?.message || '加入队列失败');
    }
  };
  const removeQueued = async (id: string) => {
    try { await apiClient.removeQueuedAction(id); apiClient.clearCache(); await refreshPlayerState(); } catch (e: any) { toast.error(e?.message || '操作失败'); }
  };
  const moveQueued = async (id: string, direction: 'up' | 'down') => {
    try { await apiClient.moveQueuedAction(id, direction); apiClient.clearCache(); await refreshPlayerState(); } catch (e: any) { toast.error(e?.message || '操作失败'); }
  };
  const clearQueue = async () => {
    try { await apiClient.clearActionQueue(); apiClient.clearCache(); await refreshPlayerState(); toast.info('队列已清空'); } catch (e: any) { toast.error(e?.message || '操作失败'); }
  };

  const startAction = async (actionId: string, activityInfo: CurrentActivity, quantity?: number) => {
    if (isCombatLockoutActive()) {
      toast.info('当前正在战斗中，无法进行生产与生活技能（请先在顶部停止战斗）');
      return;
    }
    logger.debug('🚀 startAction called with:', actionId, activityInfo, quantity);
    try {
      setActionLoading(true)
      
      // 如果有任何活动，先清除前端状态
      if (currentActivity) {
        logger.debug('🔄 清除旧的采集活动');
        isStoppingRef.current = true;
        setCurrentActivity(null);
        setProgress(0);
        // 同一时间只能做一件事：告诉玩家刚才那件被停了
        if (currentActivity.actionId ? currentActivity.actionId !== actionId : currentActivity.name !== activityInfo.name) {
          toast.info(`已停止「${currentActivity.name}」，开始「${activityInfo.name}」`);
        }
      }
      const inSoloCombat = Boolean(
        battleState ||
          (playerState?.hpCombat &&
            (!playerState.hpCombat.outcome || playerState.hpCombat.nextFightAt))
      );
      if (inSoloCombat) {
        logger.debug('🔄 清除战斗状态');
        isStoppingRef.current = true;
        setBattleState(null);
        await apiClient.fleeHpCombat().catch(() => undefined);
      }
      
      // 调用后端停止旧生活活动（如果有）
      if (currentActivity) {
        await stopAction();
      }
      
      logger.debug('🚀 开始新活动:', actionId);
      // 清除停止标记，允许新活动
      isStoppingRef.current = false;
      const result = await startLifeAction(actionId, quantity)
      logger.debug('📡 startLifeAction result:', result);
      const effMs = (result as any)?.lifeActionState?.effectiveDurationMs;
      const effSec = effMs && effMs > 0 ? Math.round((effMs / 1000) * 100) / 100 : activityInfo.duration;
      
      // 设置新的前端状态
      logger.debug('📝 Setting currentActivity:', activityInfo);
      setCurrentActivity({ ...activityInfo, duration: effSec, actionId })
      setProgress(0)
      
      setSelectedItem(null)
      setModalType(null)
      
      logger.debug('✅ 新活动已开始', activityInfo);
    } catch (error) {
      logger.error('❌ 开始活动失败', error)
      isStoppingRef.current = false;
      toast.error('开始活动失败: ' + (error as Error).message)
    } finally {
      setActionLoading(false)
    }
  }

  // 停止当前生活动作（顶部活动条与卡片快捷 ■ 共用）
  const stopCurrentActivity = async () => {
    try {
      logger.debug('🛑 停止采集活动');
      isStoppingRef.current = true;
      setCurrentActivity(null);
      setProgress(0);
      await stopAction();
      logger.debug('✅ 采集活动已停止');
      setTimeout(() => {
        isStoppingRef.current = false;
      }, 1000);
    } catch (error) {
      logger.error('停止活动失败:', error);
      isStoppingRef.current = false;
    }
  }

  // 卡片快捷开关：点 ▶ 直接开始不限次动作，点 ■ 停止——不必先开弹窗
  const runningLifeActionId = () =>
    playerState?.mode === 'life_action' ? playerState.lifeActionState?.actionId : undefined
  const quickToggleRow = (row: SkillActionRow) => {
    if ( Boolean(playerState?.activePartyActivity || partyCombatInfo?.active || battleState?.isActive || (playerState?.hpCombat && (!playerState.hpCombat.outcome || playerState.hpCombat.nextFightAt))) ) {
      toast.info("当前正在战斗中，无法进行生产与生活技能（请先在顶部停止战斗）")
      return
    }
    if (runningLifeActionId() === row.action.id) {
      void stopCurrentActivity()
      return
    }
    const a = row.action
    const out = row.primaryYield
    void startAction(a.id, {
      name: GATHER_FLAVOR_BY_ACTION[a.id]?.title || a.name,
      output: out ? getItemNameById(out.itemId) : '',
      duration: Math.round(a.duration / 100) / 10,
      mark: activityMarkFromAction(a.id),
    })
  }
  const quickToggleCraft = (r: CraftRecipeView) => {
    if ( Boolean(playerState?.activePartyActivity || partyCombatInfo?.active || battleState?.isActive || (playerState?.hpCombat && (!playerState.hpCombat.outcome || playerState.hpCombat.nextFightAt))) ) {
      toast.info("当前正在战斗中，无法进行生产与生活技能（请先在顶部停止战斗）")
      return
    }
    if (runningLifeActionId() === r.id) {
      void stopCurrentActivity()
      return
    }
    void startAction(r.id, {
      name: r.name,
      output: getItemNameById(r.output),
      duration: r.time,
      mark: '制',
    })
  }

  // 开始自动战斗
  const startBattle = async (monster: any) => {
    if (!playerState) return;
    
    // 战斗与生活互斥：开始战斗前清除任何进行中的生活动作
    if (currentActivity || playerState.mode === 'life_action') {
      logger.debug('🔄 清除采集/生活活动以开始战斗');
      isStoppingRef.current = true;
      setCurrentActivity(null);
      setProgress(0);
      await stopAction().catch(() => undefined);
    }
    
    try {
      isStoppingRef.current = false;
      await apiClient.startHpCombat(monster.id);
      await refreshPlayerState();
      setSelectedItem(null);
      setModalType(null);
      logger.debug('✅ 开始战斗', monster.name);
    } catch (error) {
      logger.error('Failed to start battle:', error);
      isStoppingRef.current = false;
      toast.error('开始战斗失败: ' + (error as Error).message);
    }
  };

  // 停止战斗（同时支持单人战斗与组队首领副本）
  const stopBattle = async () => {
    try {
      logger.debug('🛑 停止战斗');
      isStoppingRef.current = true;
      setBattleState(null);
      const activePartyId =
        partyCombatInfo?.partyId ||
        playerState?.activePartyActivity?.partyId ||
        playerState?.partyState?.partyId;
      if ((partyCombatInfo?.active || playerState?.activePartyActivity) && activePartyId) {
        setPartyCombatInfo(null);
        await apiClient.cancelPartyActivity(activePartyId).catch(() => undefined);
      }
      if (playerState?.hpCombat) {
        await apiClient.fleeHpCombat().catch(() => undefined);
      }
      await refreshPlayerState();
      logger.debug('✅ 战斗已停止');
      setTimeout(() => {
        isStoppingRef.current = false;
      }, 1000);
    } catch (error) {
      logger.error('停止战斗失败:', error);
      isStoppingRef.current = false;
    }
  };

  // 创建交易订单
  const handleCreateOrder = async () => {
    if (!selectedTradingItem || orderSubmitting) return;
    setOrderSubmitting(true);

    try {
      await apiClient.createTradingOrder({
        itemId: selectedTradingItem,
        quantity: sellQuantity,
        price: sellPrice,
        type: orderType
      });

      // 刷新订单列表（递增序号，作废仍在途的旧列表请求，防旧结果覆盖新单）
      tradingOrdersReqRef.current++;
      const orders = await apiClient.getTradingOrders(selectedTradingItem);
      setTradingOrders(orders);
      setMarketRefreshKey((k) => k + 1);

      // 刷新玩家状态
      await refreshPlayerState();

      // 关闭弹窗
      setShowSellModal(false);
      setSellQuantity(1);
      setSellPrice(10);

      toast.success(`${orderType === 'sell' ? '出售单' : '收购单'}创建成功！`);
    } catch (error: any) {
      logger.error('创建订单失败:', error);
      toast.error('创建订单失败: ' + (error.message || '未知错误'));
    } finally {
      setOrderSubmitting(false);
    }
  };

  // 购买/出售吃单
  const handleBuyOrder = async () => {
    if (!selectedOrder || orderSubmitting) return;
    const isSellingToBid = selectedOrder.type === 'buy';
    setOrderSubmitting(true);

    try {
      await apiClient.buyFromOrder(selectedOrder.id, purchaseQuantity);

      // 刷新订单列表（递增序号，作废仍在途的旧列表请求，防旧结果覆盖新单）
      if (selectedTradingItem) {
        tradingOrdersReqRef.current++;
        const orders = await apiClient.getTradingOrders(selectedTradingItem);
        setTradingOrders(orders);
      }
      setMarketRefreshKey((k) => k + 1);

      // 刷新玩家状态
      await refreshPlayerState();

      // 关闭弹窗
      setShowPurchaseModal(false);
      setSelectedOrder(null);
      setPurchaseQuantity(1);

      toast.success(isSellingToBid ? '出售成功！' : '购买成功！');
    } catch (error: any) {
      logger.error(isSellingToBid ? '出售失败:' : '购买失败:', error);
      toast.error((isSellingToBid ? '出售失败: ' : '购买失败: ') + (error.message || '未知错误'));
    } finally {
      setOrderSubmitting(false);
    }
  };

  // HP、胜负和重试都只服从服务端 hpCombat；前端不再伪造复活或自动续战。

  if (loading || !playerState) {
    return (
      <div className="game-container">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  const chapterGoal = nextChapterGoal(playerState)
  const chapterDone = chapter1Complete(playerState)
  const hasFirstGather = Boolean(
    chapterDone ||
    (playerState.inventory.wood_1 || 0) > 0 ||
    (playerState.inventory.lumber_1 || 0) > 0 ||
    (playerState.stats?.totalGathered || 0) > 0 ||
    (playerState.stats?.totalActions || 0) > 0
  )
  const hasSwordOn = Boolean(
    chapterDone ||
    playerState.equipment?.main_hand ||
    (playerState.stats?.totalKills || 0) > 0 ||
    playerState.progression?.completedMilestones?.equip_sword
  )
  const combatSheet = combatSheetFromPack(playerState, contentPack?.items, contentPack?.equipmentSets)
  const setBonuses = activeSetBonuses(playerState.equipment as any, contentPack?.equipmentSets)
  const weaponAtk = equippedWeaponAtk(playerState, contentPack?.items)
  // 技能目录来自 /content（与服务端同一份定义）；未加载时退回内置的重劈
  const abilityCatalog: AbilityDef[] | undefined = contentPack?.abilities
  const equippedAbilities = previewAbilities(playerState.abilityLoadout, playerState.abilities, abilityCatalog, abilitySlotCount(playerState))
  // 当前章节目标还差多少原木/木板，挂在白杨卡和采集弹窗上
  const goalMaterialHint = (): string | null => {
    const wood = playerState.inventory.wood_1 || 0
    const lumber = playerState.inventory.lumber_1 || 0
    const forBoards = (boards: number) => {
      const boardsLeft = Math.max(0, boards - lumber)
      if (boardsLeft === 0) return '木板够了，去制作'
      const woodNeed = boardsLeft * 2
      return wood >= woodNeed ? `原木够做 ${boardsLeft} 块板了，去制作` : `原木 ${wood}/${woodNeed}`
    }
    switch (chapterGoal.id) {
      case 'chop': return '砍 1 根就行'
      case 'board': return wood >= 2 ? '原木够了，去制作木板' : `原木 ${wood}/2`
      case 'sword': return forBoards(3)
      case 'chest': return forBoards(6)
      default: return null
    }
  }
  /** The monster's rare drop as a real pack item (the pack names it by id or by display name). */
  const rareItemOf = (m: any): { id: string; name: string } | null => {
    const rare = typeof m?.rare === 'string' ? m.rare : ''
    if (!rare || !(Number(m?.rareChance) > 0)) return null
    const item = contentPack?.items?.find((i: any) => i.id === rare || i.name === rare)
    return item ? { id: item.id, name: item.name || rare } : null
  }
  // 左栏（银河奶牛式技能列表）：17 行从第一分钟起全部可见，第一章相关的四行只打"推荐"标签
  const sidebarItems = visibleSkillNav(chapterDone)
  const sidebarRecommended = recommendedSkillNavIds(chapterDone)
  // MWI total level: every skill row's level added up (professions + enhancing + seven combat skills)
  const totalLevel =
    Object.values(playerState.skills || {}).reduce((sum: number, s: any) => sum + Number(s?.level || 1), 0) +
    (playerState.combatSkills
      ? Object.values(playerState.combatSkills).reduce<number>((sum: number, s: any) => sum + Number(s?.level || 1), 0)
      : (playerState.combatLevel || 1) * 7)
  // MWI attention badges: claimable tasks (+1 when the gift is ready)
  const navBadges: Record<string, number | undefined> = {
    tasks: (playerState.taskSummary?.ready || 0) + (playerState.taskSummary?.giftReady ? 1 : 0) || undefined,
  }
  const combatSkillRows = playerState.combatSkills as Record<string, { level: number; xp: number }> | undefined
  const soloCombatActive = Boolean(
    battleState?.isActive ||
      (playerState.hpCombat &&
        (!playerState.hpCombat.outcome || playerState.hpCombat.nextFightAt))
  )
  const partyCombatActive = Boolean(playerState.activePartyActivity || partyCombatInfo?.active)
  const headerBattleActive = soloCombatActive || partyCombatActive

  const sidebarLocked = new Set<string>()
  if (!hasFirstGather) sidebarLocked.add("woodworking")
  if (!hasSwordOn) sidebarLocked.add("adventure")
  const onNavLocked = (id: string) => {
    if (id === "woodworking") toast.info("先砍到第一根木头，制作才会打开")
    if (id === "adventure") toast.info("先穿上木头短剑，再进森林")
  }
  const onNavSelect = (id: string) => {
    // 点某个职业的技能页时同时切换"当前职业"，这样右栏与制作分类跟着走
    const item = SKILL_NAV.find((s) => s.id === id)
    if (item?.profession && item.profession !== currentProfession) {
      setCurrentProfession(item.profession as any)
      void apiClient.setActiveClass(item.profession).catch(() => undefined)
    }
    // 战斗技能行（耐力 / 智力 / …）只是进度读数，统一打开冒险页
    setActiveTab(tabForNavId(id) as ActiveTab)
  }
  const resolvedPartyCombatDisplay = (() => {
    if (!partyCombatActive) return null
    if (partyCombatInfo?.active && partyCombatInfo.title) {
      return {
        title: partyCombatInfo.title,
        subtitle: partyCombatInfo.subtitle || '组队自动战斗',
      }
    }
    const rawStageId = playerState.activePartyActivity?.stageId || partyCombatInfo?.stageId || 'forest'
    const stageAliases: Record<string, string> = {
      stage_1: 'forest',
      stage_2: 'mine',
      stage_3: 'swamp',
      stage_4: 'snow',
      stage_forest: 'forest',
      stage_mine: 'mine',
      stage_swamp: 'swamp',
      stage_snow: 'snow',
      stage_volcano: 'volcano',
    }
    const normStageId = stageAliases[rawStageId] || rawStageId
    const stg = (contentPack?.stages as any[] | undefined)?.find((s) => s.id === normStageId)
    const stageName = stg?.name || '组队首领副本'
    const bossId =
      playerState.activePartyActivity?.raidBossId ||
      ((stg?.monsters || []) as string[]).find((id) => String(id).endsWith('_boss'))
    const bossMonster = (contentPack?.monsters as any[] | undefined)?.find((m) => m.id === bossId)
    const rawBossName = playerState.activePartyActivity?.raidBossName || bossMonster?.name
    const bossName = rawBossName ? String(rawBossName).replace(/\s*[(（]BOSS[)）]\s*$/i, '') : ''
    return {
      title: bossName ? `${stageName} · ${bossName}` : stageName,
      subtitle: '组队连续战斗',
    }
  })()
  const headerBattleName = partyCombatActive
    ? resolvedPartyCombatDisplay?.title
    : battleState?.monster?.name || playerState.hpCombat?.monsterName || '战斗中'
  const headerBattleSubtitle = partyCombatActive
    ? resolvedPartyCombatDisplay?.subtitle
    : playerState.hpCombat?.outcome === 'loss' && playerState.hpCombat?.nextFightAt
      ? '重伤休整 · 准备再战'
      : playerState.hpCombat?.outcome === 'win' && playerState.hpCombat?.nextFightAt
        ? '自动连战 · 索敌中'
        : '连续自动战斗'

  const runningAction = playerState.mode === 'life_action' && playerState.lifeActionState && !headerBattleActive
    ? contentPack?.actions?.find((a: any) => a.id === playerState.lifeActionState!.actionId)
    : soloCombatActive && playerState.hpCombat
      ? { id: 'act_combat_' + playerState.hpCombat.monsterId, skillId: 'skill_combat' }
      : undefined
  const runningNavId = playerState.mode === 'enhancing' && playerState.enhanceRun && !playerState.enhanceRun.outcome
    ? 'enhance'
    : partyCombatActive
      ? 'party'
      : navIdForAction(runningAction as any)

  const getItemInfo = (itemId: string) => resolveItemInfo(itemId, contentPack);
  const getRequiredItemId = (itemName: string): string => resolveRequiredItemId(itemName, contentPack);

  // 根据物品ID获取中文名称
  const getItemNameById = (itemId: string): string => {
    if (!contentPack?.items) return itemId;
    const item = contentPack.items.find((i: any) => i.id === itemId);
    return item?.name || itemId;
  };

  return (
    <div className="game-container">
      <GameHeader
        playerMode={playerState.mode}
        currentActivity={currentActivity}
        batchRemaining={playerState.lifeActionState?.remaining}
        batchTotal={playerState.lifeActionState?.quantity}
        battleActive={headerBattleActive}
        battleMonsterName={headerBattleName}
        battleSubtitle={headerBattleSubtitle}
        enhanceRun={playerState.mode === 'enhancing' && playerState.enhanceRun && !playerState.enhanceRun.outcome
          ? {
              itemName: getItemNameById(playerState.enhanceRun.itemId),
              level: Number(playerState.equipment?.enhancementLevels?.[playerState.enhanceRun.itemId] || 0),
              target: playerState.enhanceRun.targetLevel,
              nextAttemptAt: playerState.enhanceRun.nextAttemptAt,
              intervalMs: playerState.enhanceRun.intervalMs,
            }
          : null}
        onStopEnhance={async () => {
          try {
            apiClient.clearCache()
            await apiClient.stopEnhanceRun()
            await refreshPlayerState()
          } catch (e: any) { toast.error(e?.message || '停止失败') }
        }}
        cycleCompleteFlash={cycleCompleteFlash}
        activeTab={activeTab}
        progress={progress}
        onStopActivity={stopCurrentActivity}
        onStopBattle={stopBattle}
        rewardNotification={rewardNotification}
        onOpenProg={(id) => setProgPanel(id)}
        claimableCount={claimableCount}
        checkInAvailable={checkInAvailable}
        gold={playerState.inventory.gold || 0}
        totalLevel={totalLevel}
        chapterComplete={chapter1Complete(playerState)}
      />
      <NextGoalBar
        goal={chapterGoal}
        goLabel={
          chapterGoal.id === "complete" || chapterGoal.id === "ch3_complete"
            ? (claimableCount > 0 ? `领工钱 ${claimableCount}` : "看成就")
            : chapterGoal.buildChapter
              ? "选流派"
              : undefined
        }
        onGo={() => {
          if (chapterGoal.id === "complete" || chapterGoal.id === "ch3_complete") {
            setProgPanel("achievements")
            return
          }
          if (chapterGoal.craftCategory) {
            setCraftCategory(chapterGoal.craftCategory)
          }
          if (chapterGoal.adventureZone) {
            setSelectedMap(chapterGoal.adventureZone)
          }
          if (chapterGoal.tab === "character") {
            setActiveTab("character")
            if (chapterGoal.id === "equip_sword") {
              openEquipSelector("mainhand")
            } else if (chapterGoal.id === "chest") {
              openEquipSelector("chest")
            }
            return
          }
          setActiveTab(chapterGoal.tab)
        }}
      />
      <ActionQueueBar
        queue={playerState.activityQueue || []}
        max={ACTION_QUEUE_MAX}
        current={
          playerState.mode === 'life_action' && playerState.lifeActionState && !headerBattleActive
            ? {
                name: actionNameOf(playerState.lifeActionState.actionId),
                quantity: playerState.lifeActionState.quantity,
                remaining: playerState.lifeActionState.remaining,
              }
            : null
        }
        nameOf={actionNameOf}
        durationOf={(actionId) => {
          const act = contentPack?.actions?.find((a: any) => a.id === actionId)
          return act?.duration ? act.duration / 1000 : 0
        }}
        onRemove={removeQueued}
        onMove={moveQueued}
        onClear={clearQueue}
      />

      {/* 主内容区域 */}
      <div className="game-main-layout">
        <SkillSidebar
          items={sidebarItems}
          activeTab={activeTab}
          runningId={runningNavId}
          skills={playerState.skills as any}
          combat={{ level: playerState.combatLevel || 1, xp: playerState.combatXp || 0 }}
          combatSkills={combatSkillRows}
          lockedIds={sidebarLocked}
          recommendedIds={sidebarRecommended}
          badges={navBadges}
          onLocked={onNavLocked}
          onSelect={onNavSelect}
        />
        <MobileNavBar
          activeTab={activeTab}
          runningId={runningNavId}
          skills={playerState.skills as any}
          combat={{ level: playerState.combatLevel || 1, xp: playerState.combatXp || 0 }}
          combatSkills={combatSkillRows}
          recommendedIds={sidebarRecommended}
          lockedIds={sidebarLocked}
          badges={navBadges}
          openSheet={mobileSheet}
          onOpenSheet={setMobileSheet}
          onLocked={onNavLocked}
          onSelect={onNavSelect}
        />

        <GameChatPanel
          expanded={isChatExpanded}
          onToggle={() => setIsChatExpanded(!isChatExpanded)}
          channel={chatChannel}
          onSwitchChannel={switchChannel}
          privateTarget={privateTarget}
          onPrivateChat={startPrivateChat}
          unread={unreadCounts}
          professionIcon={getCurrentProfession().icon}
          wsStatus={wsStatus}
          messages={chatMessages}
          input={chatInput}
          onInput={setChatInput}
          onSend={sendChatMessage}
          onKeyPress={handleChatKeyPress}
          showEmojiPicker={showEmojiPicker}
          onToggleEmoji={() => setShowEmojiPicker(!showEmojiPicker)}
          onInsertEmoji={insertEmoji}
        />

        
        {/* 游戏内容 */}
        <main className="game-content">
        {/* 冒险页面 */}
        {activeTab === 'adventure' && (
          <AdventurePanel
            playerState={playerState}
            contentPack={contentPack}
            adventureStages={adventureStages}
            selectedMap={selectedMap}
            setSelectedMap={setSelectedMap}
            selectedEncounters={selectedEncounters}
            chapterDone={chapterDone}
            chapterGoalId={chapterGoal.id}
            combatSheet={combatSheet}
            combatNow={combatNow}
            equippedAbilities={equippedAbilities}
            abilityCatalog={abilityCatalog}
            showCombatConfig={showCombatConfig}
            setShowCombatConfig={setShowCombatConfig}
            battleState={battleState}
            showVictoryFx={showVictoryFx}
            hitShake={hitShake}
            damageFloats={damageFloats}
            playerName={playerName}
            playerGender={playerGender}
            currentProfession={currentProfession}
            setCurrentProfession={setCurrentProfession}
            setActiveTab={setActiveTab}
            setCraftCategory={setCraftCategory}
            setIsRightPanelExpanded={setIsRightPanelExpanded}
            getItemNameById={getItemNameById}
            isCurrentlyFighting={isCurrentlyFighting}
            onSelectMonster={(monster) => {
              setSelectedItem(monster)
              setModalType('monster')
            }}
            startBattle={startBattle}
            stopBattle={stopBattle}
            refreshPlayerState={refreshPlayerState}
          />
        )}

        {activeTab === 'character' && (
          <CharacterSheet
            playerName={playerName}
            totalLevel={totalLevel}
            combatLevel={playerState.combatLevel || 1}
            sheet={combatSheet}
            activeClassId={currentProfession}
            activeClassName={getCurrentProfession().name}
            playerGender={playerGender}
            playerAvatar={playerAvatar}
            onChangeAvatar={changePlayerAvatar}
            onOpenProfessionModal={chapterDone ? () => setShowProfessionModal(true) : undefined}
            mainSkill={mainCombatSkill(playerState)}
            focusSkill={(() => {
              // mirrors backend focusedCombatSkill: first equipped accessory with a focusSkill wins
              const eq = playerState.equipment as { accessory1?: string; accessory2?: string; durability?: Record<string, number> } | undefined
              for (const id of [eq?.accessory1, eq?.accessory2]) {
                if (!id || (playerState.inventory?.[id] || 0) <= 0) continue
                const dur = eq?.durability?.[id]
                if (typeof dur === 'number' && Number.isFinite(dur) && dur <= 0) continue
                const def: any = contentPack?.items?.find((it: any) => it.id === id)
                if (def?.focusSkill) return String(def.focusSkill)
              }
              return undefined
            })()}
            combatSkills={COMBAT_SKILL_KEYS.map((id) => ({
              id,
              name: COMBAT_SKILL_LABEL[id],
              blurb: (contentPack?.combatSkills as Array<{ id: string; blurb: string }> | undefined)?.find((c) => c.id === id)?.blurb || '',
              level: playerState.combatSkills?.[id]?.level || 1,
              xp: playerState.combatSkills?.[id]?.xp || 0,
            }))}
            abilities={Object.entries(playerState.abilities || {}).map(([id, st]: [string, any]) => {
              const def = abilityCatalog?.find((a) => a.id === id)
              const slot = (playerState.abilityLoadout || []).find((s: any) => s.abilityId === id)
              return {
                id,
                name: def?.name || id,
                level: st.level,
                xp: st.xp,
                equipped: Boolean(slot),
                blurb: def?.blurb,
                cooldownMs: def?.cooldownMs,
                mpCost: def?.mpCost,
                damageMult: def?.damageMult,
                healPct: def?.healPct,
                guardMult: def?.guardMult,
                durationMs: def?.durationMs,
                breaksGuard: def?.breaksGuard,
                levelStep: def?.levelStep,
                triggerText: slot ? describeTrigger(slot.trigger) : undefined,
              }
            })}
            slots={[...equipSlots.left, ...equipSlots.right].map((s, _i, arr) => {
              const itemId = getEquippedItemId(s.id)
              const def: any = itemId ? contentPack?.items?.find((it: any) => it.id === itemId) : undefined
              const dup = arr.filter((x) => x.name === s.name).length > 1
              const tool = s.id === 'tool'
              const enh = itemId ? Number(playerState.equipment?.enhancementLevels?.[itemId] || 0) : 0
              const mult = enhancementStatMultiplier(enh, def)
              const effective = (n: number) => Math.round(n * mult * 10) / 10
              const dur = itemId ? playerState.equipment?.durability?.[itemId] : undefined
              const maxDur = itemId ? (playerState.equipment?.maxDurability?.[itemId] || 100) : 100
              const durRecorded = typeof dur === 'number' && Number.isFinite(dur)
              const durabilityPct = itemId
                ? durRecorded
                  ? Math.max(0, Math.min(100, Math.round((dur / maxDur) * 1000) / 10))
                  : 100
                : undefined
              const broken = durRecorded && dur <= 0
              const repairCost = durRecorded ? Math.ceil((maxDur - Math.max(0, dur)) * 0.5) : undefined
              return {
                id: s.id,
                name: s.name,
                icon: s.icon,
                ariaLabel: dup ? `${s.name} ${arr.filter((x) => x.name === s.name).indexOf(s) + 1}` : undefined,
                itemId,
                itemName: itemId ? `${getItemNameById(itemId)}${enh ? ` +${enh}` : ''}` : '',
                durabilityPct,
                broken,
                repairCost,
                available: !itemId && getEquippableItems(s.id).length > 0,
                effect: tool
                  ? toolEffectLine(def, professionLabel(def?.toolFor), enh)
                  : def ? [def.atk ? `攻击 +${effective(def.atk)}` : '', def.mag ? `魔力伤害 +${effective(def.mag)}` : '', def.def ? `防御 +${effective(def.def)}` : '', def.hp ? `生命 +${effective(def.hp)}` : ''].filter(Boolean).join(' · ') : '',
                hint: tool ? '斧头、锤子等工具：加快对应技能，不参与战斗' : undefined,
              }
            })}
            onOpenSlot={(slotId) => openEquipSelector(slotId)}
            onRepairItem={async (itemId) => {
              if (repairingItemId) return
              setRepairingItemId(itemId)
              try {
                apiClient.clearCache()
                await apiClient.repairEquipment(itemId, 'full')
                toast.success('装备已修理')
                await refreshPlayerState()
              } catch (e: any) {
                toast.error(e?.message || '修理失败')
              } finally {
                setRepairingItemId(null)
              }
            }}
            onRepairAll={async () => {
              if (repairingItemId) return
              const damagedIds = [...equipSlots.left, ...equipSlots.right]
                .map((s) => getEquippedItemId(s.id))
                .filter((id): id is string => {
                  if (!id) return false
                  const d = playerState.equipment?.durability?.[id]
                  const maxD = playerState.equipment?.maxDurability?.[id] || 100
                  return typeof d === 'number' && Number.isFinite(d) && d < maxD
                })
              const uniqueIds = [...new Set(damagedIds)]
              if (!uniqueIds.length) return
              setRepairingItemId('__all__')
              try {
                apiClient.clearCache()
                for (const id of uniqueIds) {
                  await apiClient.repairEquipment(id, 'full')
                }
                toast.success(`已全部修理（${uniqueIds.length} 件装备）`)
                await refreshPlayerState()
              } catch (e: any) {
                toast.error(e?.message || '修理失败')
              } finally {
                setRepairingItemId(null)
              }
            }}
            repairingItemId={repairingItemId}
            setBonuses={setBonuses}
          />
        )}

        {/* 背包页（银河奶牛式分组物品格） */}
        {activeTab === 'inventory' && (
          <InventoryPage
            rows={Object.entries(playerState.inventory)
              .filter(([key, value]) => key !== 'gold' && Number(value || 0) > 0)
              .map(([itemId, count]) => ({ itemId, count: Number(count), ...getItemInfo(itemId) }))}
            gold={playerState.inventory.gold || 0}
            packItems={contentPack?.items}
            equippedIds={new Set(Object.values(playerState.equipment || {}).filter((v): v is string => typeof v === 'string'))}
            enhancementLevels={playerState.equipment?.enhancementLevels}
            iconOf={getItemIcon}
            onOpen={(row) => {
              setSelectedItem({ ...row, id: row.itemId })
              setModalType('item')
            }}
          />
        )}

        {/* 任务板（银河奶牛式：按冷却发放的技能任务 + 代币商店） */}
        {activeTab === 'tasks' && (
          <TasksPage
            actions={contentPack?.actions}
            iconOf={getItemIcon}
            gold={playerState.inventory.gold || 0}
            progressKey={`${playerState.stats?.totalActions || 0}:${playerState.stats?.totalKills || 0}`}
            onGoldChange={() => { void refreshPlayerState() }}
          />
        )}

        {/* 房屋（银河奶牛式：每技能一间房，材料沉没换永久加成） */}
        {activeTab === 'houses' && (
          <HousesPage
            iconOf={getItemIcon}
            gold={playerState.inventory.gold || 0}
            refreshKey={JSON.stringify(playerState.inventory)}
            onChanged={() => { void refreshPlayerState() }}
          />
        )}

        {/* 伐木页面 */}
        {activeTab === 'logging' && renderGatherPage('logging')}

        {/* 伐木厂 - 木工页面 */}
        {activeTab === 'woodworking' && renderCraftPage('woodworking')}

        {/* 铁匠 - 挖矿页面 */}
        {activeTab === 'mining' && renderGatherPage('mining')}

        {/* 铁匠 - 锻造页面 */}
        {activeTab === 'smithing' && renderCraftPage('smithing')}

        {/* 农夫 - 畜牧页面 */}
        {activeTab === 'husbandry' && renderCraftPage('husbandry')}

        {/* 厨师 - 烹饪页面 */}
        {activeTab === 'cooking' && renderCraftPage('cooking')}

        {/* 裁缝 - 缝纫页面 */}
        {activeTab === 'tailoring' && renderCraftPage('tailoring')}

        {/* 炼金术师 - 炼金页面 */}
        {activeTab === 'alchemy' && renderCraftPage('alchemy')}

        {/* 农夫 - 种植页面 */}
        {activeTab === 'farming' && renderGatherPage('farming')}

        {/* 厨师 - 钓鱼页面 */}
        {activeTab === 'fishing' && renderGatherPage('fishing')}

        {/* 裁缝 - 采集页面 */}
        {activeTab === 'gathering' && renderGatherPage('gathering')}

        {/* 炼金术师 - 水晶页面 */}
        {activeTab === 'crystal_mining' && renderGatherPage('crystal_mining')}

        {/* 背包页面 */}
        {/* 装备强化页面 */}
        {activeTab === 'enhance' && (
          <div className={headerBattleActive ? 'combat-disabled-page' : undefined}>
            {headerBattleActive && (
              <div className="combat-lock-banner" role="status">
                <T1ItemIcon itemId="weapon_iron_sword" className="gold-inline" alt="" /> 当前正在战斗中，生产与生活技能已锁定
                <button type="button" className="btn-secondary" style={{ marginLeft: 10, padding: '2px 10px', fontSize: 12 }} onClick={() => void stopBattle()}>
                  立即停止战斗
                </button>
              </div>
            )}
            <EnhancementPanel 
              playerState={playerState} 
              contentItems={contentPack?.items}
              combatLocked={headerBattleActive}
              onRefresh={refreshPlayerState}
            />
          </div>
        )}

        <div style={{ display: activeTab === 'party' ? 'contents' : 'none' }}>
          <PartyPanel
            initialStageId={partyTargetStageId}
            onConsumeInitialStage={() => setPartyTargetStageId(null)}
            onCombatStatusChange={setPartyCombatInfo}
          />
        </div>
        
        {/* 交易页面 */}
        {activeTab === 'trading' && (
          <TradingMarketView
            playerState={playerState}
            userId={user?.id}
            contentPack={contentPack}
            allItems={allItems}
            itemsLoading={itemsLoading}
            selectedTradingItem={selectedTradingItem}
            setSelectedTradingItem={setSelectedTradingItem}
            tradingOrders={tradingOrders}
            tradingOrdersLoading={tradingOrdersLoading}
            marketRefreshKey={marketRefreshKey}
            setMarketRefreshKey={setMarketRefreshKey}
            orderType={orderType}
            setOrderType={setOrderType}
            sellQuantity={sellQuantity}
            setSellQuantity={setSellQuantity}
            sellPrice={sellPrice}
            setSellPrice={setSellPrice}
            showSellModal={showSellModal}
            setShowSellModal={setShowSellModal}
            showPurchaseModal={showPurchaseModal}
            setShowPurchaseModal={setShowPurchaseModal}
            purchaseQuantity={purchaseQuantity}
            setPurchaseQuantity={setPurchaseQuantity}
            selectedOrder={selectedOrder}
            setSelectedOrder={setSelectedOrder}
            orderSubmitting={orderSubmitting}
            handleCreateOrder={handleCreateOrder}
            handleBuyOrder={handleBuyOrder}
            getItemNameById={getItemNameById}
            refreshPlayerState={refreshPlayerState}
          />
        )}
      </main>
      
      <PlayerRightPanel
        expanded={isRightPanelExpanded}
        onToggle={() => setIsRightPanelExpanded(!isRightPanelExpanded)}
        playerName={playerName}
        playerAvatar={playerAvatar}
        playerGender={playerGender}
        onRename={renamePlayer}
        onOpenProfessionModal={() => setShowProfessionModal(true)}
        profession={{ ...getCurrentProfession(), id: currentProfession }}
        professionSkill={getCurrentSkill()}
        combatLevel={playerState.combatLevel || 1}
        combatXp={playerState.combatXp || 0}
        gold={playerState.inventory.gold || 0}
        forceUpdate={forceUpdate}
        getXpForLevel={getXpForLevel}
        view={rightPanelView}
        onView={setRightPanelView}
        equipSlots={equipSlots}
        onOpenEquipSelector={openEquipSelector}
        onUnequipSlot={unequipSlot}
        getEquippedItemId={getEquippedItemId}
        getItemNameById={getItemNameById}
        combatSheet={combatSheet}
        allowProfessionSwitch={chapterDone}
        inventoryKindCount={Object.keys(playerState.inventory).filter(key => key !== 'gold' && (playerState.inventory[key] || 0) > 0).length}
        inventoryItems={getFilteredInventoryItems()}
        onOrganize={organizeInventory}
        inventorySearch={inventorySearch}
        onSearch={setInventorySearch}
        inventoryFilter={inventoryFilter}
        onFilter={setInventoryFilter}
        inventorySortBy={inventorySortBy}
        onSort={(value) => setInventorySortBy(value as any)}
        getItemIcon={getItemIcon}
        onSelectInventoryItem={(item) => {
          setSelectedItem({ ...item, id: item.itemId });
          setModalType('item');
        }}
      />
      </div>

      <EquipSelectorModal
        showEquipSelector={showEquipSelector}
        selectedEquipSlot={selectedEquipSlot}
        onClose={() => {
          setShowEquipSelector(false)
          setSelectedEquipSlot(null)
        }}
        playerState={playerState}
        contentPack={contentPack}
        getEquippableItems={getEquippableItems}
        getEquippedItemId={getEquippedItemId}
        equipItem={equipItem}
        unequipSlot={unequipSlot}
        professionLabel={professionLabel}
      />

      <GameEntityDetailModal
        selectedItem={selectedItem}
        modalType={modalType}
        setSelectedItem={setSelectedItem}
        setModalType={setModalType}
        playerState={playerState}
        contentPack={contentPack}
        selectedMap={selectedMap}
        setSelectedMap={setSelectedMap}
        setPartyTargetStageId={setPartyTargetStageId}
        setActiveTab={setActiveTab}
        currentProfession={currentProfession}
        setCurrentProfession={setCurrentProfession}
        getCurrentProfession={getCurrentProfession}
        professionLabel={professionLabel}
        actionLoading={actionLoading}
        startBattle={startBattle}
        startAction={startAction}
        queueAction={queueAction}
        actionPreview={actionPreview}
        actionPreviewLoading={actionPreviewLoading}
        progress={progress}
        gatherQuantity={gatherQuantity}
        setGatherQuantity={setGatherQuantity}
        craftQuantity={craftQuantity}
        setCraftQuantity={setCraftQuantity}
        getMaxCraftableQuantity={getMaxCraftableQuantity}
        favoriteRecipes={favoriteRecipes}
        toggleFavoriteRecipe={toggleFavoriteRecipe}
        combatSheet={combatSheet}
        weaponAtk={weaponAtk}
        abilityCatalog={abilityCatalog}
        goalMaterialHint={goalMaterialHint}
        rareItemOf={rareItemOf}
        getItemNameById={getItemNameById}
        isCombatLockoutActive={isCombatLockoutActive}
        refreshPlayerState={refreshPlayerState}
        actionQueueMax={ACTION_QUEUE_MAX}
      />

      <ProfessionSwitchModal
        showProfessionModal={showProfessionModal}
        setShowProfessionModal={setShowProfessionModal}
        chapterDone={chapterDone}
        playerState={playerState}
        currentProfession={currentProfession}
        setCurrentProfession={setCurrentProfession}
        setActiveTab={setActiveTab}
        playerGender={playerGender}
      />

      {/* 进度系统弹窗 */}
      {progPanel === 'achievements' && (
        <AchievementsPanel
          onClose={() => { setProgPanel(null); void refreshClaimable(); }}
          onGoldChange={() => { void refreshPlayerState(); void refreshClaimable(); }}
        />
      )}
      {progPanel === 'daily' && (
        <DailyQuestsPanel
          onClose={() => { setProgPanel(null); void refreshClaimable(); }}
          onGoldChange={() => { void refreshPlayerState(); void refreshClaimable(); }}
        />
      )}
      {progPanel === 'settings' && (
        <SettingsPanel onClose={() => setProgPanel(null)} />
      )}
      <FirstBladeBuildModal
        playerState={playerState}
        buildModalDelayDone={buildModalDelayDone}
        activeBuildChapter={chapterGoal.buildChapter}
        actionLoading={actionLoading}
        setActionLoading={setActionLoading}
        refreshPlayerState={refreshPlayerState}
      />
      {progPanel === 'checkin' && (
        <CheckInModal
          onClose={() => { setProgPanel(null); void refreshClaimable(); }}
          onChange={() => { void refreshPlayerState(); void refreshClaimable(); }}
        />
      )}
      {progPanel === 'prestige' && (
        <PrestigePanel
          onClose={() => setProgPanel(null)}
          onChange={() => {
            apiClient.clearCache();
            setCurrentActivity(null);
            setBattleState(null);
            void refreshPlayerState();
          }}
        />
      )}

      {/* 首次建角：无 characterCreated 标记的存档一律补一次 */}
      {playerState && !playerState.settings?.characterCreated && (
        <CharacterCreate
          classes={Object.values(professions).map((p) => ({ id: p.id, name: p.name, icon: p.icon, gatherName: p.gatherName, craftName: p.craftName }))}
          currentName={playerName}
          currentClassId={playerState.activeClassId || 'woodcutter'}
          onDone={(res) => {
            if (res?.name) setCustomPlayerName(res.name);
            if (res?.gender) setCustomPlayerGender(res.gender);
            if (res?.avatar) setCustomPlayerAvatar(res.avatar);
            if (res?.classId) setCurrentProfession(res.classId as any);
            void refreshPlayerState();
          }}
        />
      )}
      {/* 开场三步引导：建角完成后、看过为止 */}
      {playerState?.settings?.characterCreated && !playerState.settings.tutorialDone && (
        <TutorialGuide onDone={() => { void refreshPlayerState(); }} />
      )}
    </div>
  )
}
