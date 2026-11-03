import { useState } from "react";
import { T1Art, T1ItemIcon, characterArtId, PlayerAvatarIcon } from "./T1Art";
import { getProfessionPerk } from "../gameplay/professionPerks";

type EquipSlot = { id: string; name: string; icon: string; type: string };

type InvItem = {
  itemId: string;
  count: number;
  name?: string;
  tier?: number;
};

type ProfessionInfo = { id?: string; icon: string; name: string };
type SkillInfo = { level: number; xp: number };
type CombatSheet = { hp: number; atk: number; def: number };

type Props = {
  expanded: boolean;
  onToggle: () => void;
  playerName: string;
  /** 建角时选的头像 emoji；未建角则显示职业图标 */
  playerAvatar?: string;
  /** 角色性别外观（male / female / animal） */
  playerGender?: string;
  /** Persists a custom display name (empty string clears back to the derived default). */
  onRename?: (name: string) => void | Promise<void>;
  onOpenProfessionModal: () => void;
  profession: ProfessionInfo;
  professionSkill: SkillInfo;
  combatLevel: number;
  combatXp: number;
  gold: number;
  forceUpdate: number;
  getXpForLevel: (level: number) => number;
  view: "character" | "inventory";
  onView: (view: "character" | "inventory") => void;
  equipSlots: { left: EquipSlot[]; right: EquipSlot[] };
  /** Shown under the paperdoll when later-chapter slots are hidden. */
  lockedSlotsHint?: string;
  onOpenEquipSelector: (slotId: string) => void;
  onUnequipSlot: (slotId: string) => void;
  getEquippedItemId: (slotId: string) => string | undefined;
  getItemNameById: (itemId: string) => string;
  combatSheet: CombatSheet;
  allowProfessionSwitch?: boolean;
  inventoryKindCount: number;
  inventoryItems: InvItem[];
  onOrganize: () => void;
  inventorySearch: string;
  onSearch: (value: string) => void;
  inventoryFilter: string;
  onFilter: (value: "all" | "material" | "weapon" | "armor" | "consumable") => void;
  inventorySortBy: string;
  onSort: (value: string) => void;
  getItemIcon: (itemId: string) => string;
  onSelectInventoryItem: (item: InvItem) => void;
};

export function PlayerRightPanel(props: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  // 服务端在 xp >= need(当前等级) 时升级，所以这里传当前等级，不是 +1
  const professionNeed = props.getXpForLevel(props.professionSkill.level);
  const combatNeed = props.getXpForLevel(props.combatLevel || 1);
  const pct = (xp: number, need: number) => (Number.isFinite(need) && need > 0 ? Math.min(100, (xp / need) * 100) : 100);
  const professionPct = pct(props.professionSkill.xp || 0, professionNeed);
  const combatPct = pct(props.combatXp || 0, combatNeed);
  const fmtNeed = (need: number) => (Number.isFinite(need) ? String(need) : "MAX");
  const fmtRemaining = (xp: number, need: number) => (Number.isFinite(need) ? `还需 ${Math.max(0, need - xp)}` : "已满级");

  return (
    <aside className={`right-panel ${props.expanded ? "expanded" : "collapsed"}`}>
      <button
        className="right-panel-toggle-top"
        type="button"
        onClick={props.onToggle}
        title={props.expanded ? "收起角色面板" : "展开角色面板"}
        aria-label={props.expanded ? "收起角色面板" : "展开角色面板"}
        aria-expanded={props.expanded}
      >
        {props.expanded ? "▶" : "◀"}
      </button>

      {props.expanded && (
        <div className="right-panel-status">
          <div className="status-player-info">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <span className="status-player-avatar" aria-hidden>
                <PlayerAvatarIcon avatar={props.playerAvatar} gender={props.playerGender} />
              </span>
              {editingName ? (
                <form
                  className="player-name-edit"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setEditingName(false);
                    void props.onRename?.(nameDraft);
                  }}
                >
                  <input
                    autoFocus
                    maxLength={16}
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") setEditingName(false); }}
                    placeholder="玩家名"
                  />
                  <button type="submit" aria-label="保存名字">✓</button>
                </form>
              ) : (
                <span
                  className="status-player-name"
                  role={props.onRename ? "button" : undefined}
                  title={props.onRename ? "点击改名" : undefined}
                  onClick={() => {
                    if (!props.onRename) return;
                    setNameDraft(props.playerName);
                    setEditingName(true);
                  }}
                >
                  {props.playerName}
                </span>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {props.allowProfessionSwitch !== false && (
                  <button className="btn-switch-compact" onClick={props.onOpenProfessionModal} title="切换职业">
                    切换
                  </button>
                )}
              </div>
            </div>
            <span className="status-player-class" title={`【${getProfessionPerk(props.profession.id).traitName}】${getProfessionPerk(props.profession.id).combatAndUtilityDesc}`}>
              {props.profession.icon} {props.profession.name} · <small style={{ opacity: 0.85 }}>{getProfessionPerk(props.profession.id).traitName}</small>
            </span>
          </div>

          <div className="status-stats" key={props.forceUpdate}>
            <div className="status-stat-item">
              <span className="status-stat-label">职业</span>
              <span className="status-stat-value">Lv.{props.professionSkill.level}</span>
            </div>
            <div className="status-stat-item">
              <span className="status-stat-label">战斗</span>
              <span className="status-stat-value">Lv.{props.combatLevel || 1}</span>
            </div>
            <div className="status-stat-item">
              <span className="status-stat-label">金币</span>
              <span className="status-stat-value gold">{props.gold || 0}</span>
            </div>
          </div>

          <div className="status-xp-bars">
            <div className="status-xp-bar">
              <div className="xp-header">
                <span className="status-xp-label">职业经验</span>
                <span className="xp-percentage">{Math.floor(professionPct)}%</span>
              </div>
              <div className="status-xp-progress">
                <div className="status-xp-fill profession" style={{ width: `${professionPct}%` }}>
                  <div className="xp-shine"></div>
                </div>
              </div>
              <div className="xp-footer">
                <span className="status-xp-text">
                  {Math.floor(props.professionSkill.xp || 0)} / {fmtNeed(professionNeed)}
                </span>
                <span className="xp-remaining">{fmtRemaining(Math.floor(props.professionSkill.xp || 0), professionNeed)}</span>
              </div>
            </div>
            <div className="status-xp-bar">
              <div className="xp-header">
                <span className="status-xp-label">战斗经验</span>
                <span className="xp-percentage">{Math.floor(combatPct)}%</span>
              </div>
              <div className="status-xp-progress">
                <div className="status-xp-fill combat" style={{ width: `${combatPct}%` }}>
                  <div className="xp-shine"></div>
                </div>
              </div>
              <div className="xp-footer">
                <span className="status-xp-text">
                  {Math.floor(props.combatXp || 0)} / {fmtNeed(combatNeed)}
                </span>
                <span className="xp-remaining">{fmtRemaining(Math.floor(props.combatXp || 0), combatNeed)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {props.expanded && (
        <div className="right-panel-header">
          <div className="right-panel-tabs">
            <button
              className={`right-tab ${props.view === "character" ? "active" : ""}`}
              onClick={() => props.onView("character")}
            >
              装备
            </button>
            <button
              className={`right-tab ${props.view === "inventory" ? "active" : ""}`}
              onClick={() => props.onView("inventory")}
            >
              背包
            </button>
          </div>
        </div>
      )}

      {props.expanded && (
        <div className="right-panel-content">
          {props.view === "character" && (
            <div className="equipment-panel">
              <div className="equipment-paperdoll">
                <div className="paperdoll-left">
                  {props.equipSlots.left.map((slot) => {
                    const equippedId = props.getEquippedItemId(slot.id);
                    const equippedName = equippedId ? props.getItemNameById(equippedId) : "";
                    return (
                    <div key={slot.id} className="equipment-slot-item" onClick={() => props.onOpenEquipSelector(slot.id)}>
                      <div className={`equipment-slot-box${equippedId ? " filled" : ""}`}>
                        {equippedId ? (
                          <T1ItemIcon itemId={equippedId} fallback={equippedName.charAt(0)} alt="" />
                        ) : (
                          <span className="slot-icon" aria-hidden="true">{slot.icon}</span>
                        )}
                        <div className="slot-hover-hint">{equippedName || `空·${slot.name}`}</div>
                      </div>
                      <span className="equipment-slot-name">{slot.name}</span>
                    </div>
                    );
                  })}
                </div>
                <div className="paperdoll-center">
                  <div className="character-avatar-display">
                    <div className="avatar-glow"></div>
                    <T1Art kind="character" id={characterArtId(props.profession.id, props.playerGender)} alt={props.profession.name || "伐木工"} />
                    <span className="avatar-level">Lv.{props.combatLevel || 1}</span>
                  </div>
                </div>
                <div className="paperdoll-right">
                  {props.equipSlots.right.map((slot) => {
                    const equippedId = props.getEquippedItemId(slot.id);
                    const equippedName = equippedId ? props.getItemNameById(equippedId) : "";
                    return (
                    <div key={slot.id} className="equipment-slot-item" onClick={() => props.onOpenEquipSelector(slot.id)}>
                      <div className={`equipment-slot-box${equippedId ? " filled" : ""}`}>
                        {equippedId ? (
                          <T1ItemIcon itemId={equippedId} fallback={equippedName.charAt(0)} alt="" />
                        ) : (
                          <span className="slot-icon" aria-hidden="true">{slot.icon}</span>
                        )}
                        <div className="slot-hover-hint">{equippedName || `空·${slot.name}`}</div>
                      </div>
                      <span className="equipment-slot-name">{slot.name}</span>
                    </div>
                    );
                  })}
                </div>
              </div>
              {props.lockedSlotsHint && <p className="locked-slots-hint">{props.lockedSlotsHint}</p>}

              <div className="character-attributes">
                <h4>战斗属性</h4>
                <div className="attribute-row">
                  <span className="attribute-label">生命</span>
                  <span className="attribute-value">{props.combatSheet.hp}</span>
                </div>
                <div className="attribute-row">
                  <span className="attribute-label">攻击</span>
                  <span className="attribute-value">{props.combatSheet.atk}</span>
                </div>
                <div className="attribute-row">
                  <span className="attribute-label">防御</span>
                  <span className="attribute-value">{props.combatSheet.def}</span>
                </div>
              </div>

              <div className="equipment-tips">
                <div className="tip-item">
                  <span className="tip-text">点装备槽穿上，选择器里可卸下</span>
                </div>
              </div>
            </div>
          )}

          {props.view === "inventory" && (
            <div className="inventory-panel">
              <div className="inventory-header-compact">
                <div className="inventory-info">
                  <span>💰 {props.gold || 0}</span>
                  <span title="背包没有格数上限；这里是当前筛选下的物品种类数">
                    📦 {props.inventoryItems.length === props.inventoryKindCount
                      ? `${props.inventoryKindCount} 种物品`
                      : `${props.inventoryItems.length} / ${props.inventoryKindCount} 种`}
                  </span>
                </div>
                <button className="btn-organize" onClick={props.onOrganize} title="整理背包">
                  🔄
                </button>
              </div>

              <div className="inventory-search">
                <input
                  type="text"
                  className="search-input"
                  placeholder="搜索物品..."
                  value={props.inventorySearch}
                  onChange={(e) => props.onSearch(e.target.value)}
                />
                {props.inventorySearch && (
                  <button className="btn-clear-search" onClick={() => props.onSearch("")}>
                    ✕
                  </button>
                )}
              </div>

              <div className="inventory-filters">
                <button
                  className={`filter-btn ${props.inventoryFilter === "all" ? "active" : ""}`}
                  onClick={() => props.onFilter("all")}
                >
                  全部
                </button>
                <button
                  className={`filter-btn ${props.inventoryFilter === "material" ? "active" : ""}`}
                  onClick={() => props.onFilter("material")}
                >
                  📦 材料
                </button>
                <button
                  className={`filter-btn ${props.inventoryFilter === "weapon" ? "active" : ""}`}
                  onClick={() => props.onFilter("weapon")}
                >
                  ⚔️ 武器
                </button>
                <button
                  className={`filter-btn ${props.inventoryFilter === "armor" ? "active" : ""}`}
                  onClick={() => props.onFilter("armor")}
                >
                  🛡️ 防具
                </button>
                <button
                  className={`filter-btn ${props.inventoryFilter === "consumable" ? "active" : ""}`}
                  onClick={() => props.onFilter("consumable")}
                >
                  🍖 消耗
                </button>
              </div>

              <div className="inventory-sort">
                <span className="sort-label">排序:</span>
                <select
                  className="sort-select"
                  value={props.inventorySortBy}
                  onChange={(e) => props.onSort(e.target.value)}
                >
                  <option value="default">默认</option>
                  <option value="name">名称</option>
                  <option value="tier">品质</option>
                  <option value="count">数量</option>
                </select>
              </div>

              <div className="inventory-grid-compact">
                {props.inventoryItems.length === 0 ? (
                  <div className="inventory-empty">
                    <div className="empty-icon">📭</div>
                    <p>没有找到物品</p>
                  </div>
                ) : (
                  props.inventoryItems.map((item) => (
                    <div
                      key={item.itemId}
                      className="inventory-item-compact"
                      data-tier={item.tier}
                      onClick={() => props.onSelectInventoryItem(item)}
                      title={item.name}
                    >
                      <div className="item-icon-compact">
                        <T1ItemIcon itemId={item.itemId} fallback={(item.name || "物").charAt(0)} alt="" />
                      </div>
                      <div className="item-count-compact">x{item.count}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
