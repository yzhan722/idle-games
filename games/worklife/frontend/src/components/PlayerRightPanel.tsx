type EquipSlot = { id: string; name: string; icon: string; type: string };

type InvItem = {
  itemId: string;
  count: number;
  name?: string;
  tier?: number;
};

type ProfessionInfo = { icon: string; name: string };
type SkillInfo = { level: number; xp: number };
type EqBonus = { atk: number; def: number; hp: number; mp: number };

type Props = {
  expanded: boolean;
  onToggle: () => void;
  playerName: string;
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
  onOpenEquipSelector: (slotId: string) => void;
  onUnequipSlot: (slotId: string) => void;
  getEquippedItemId: (slotId: string) => string | undefined;
  getItemNameById: (itemId: string) => string;
  equipmentBonus: EqBonus;
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
  const professionNeed = props.getXpForLevel(props.professionSkill.level + 1);
  const combatNeed = props.getXpForLevel(props.combatLevel + 1);
  const professionPct = Math.min(100, ((props.professionSkill.xp || 0) / professionNeed) * 100);
  const combatPct = Math.min(100, ((props.combatXp || 0) / combatNeed) * 100);

  return (
    <aside className={`right-panel ${props.expanded ? "expanded" : "collapsed"}`}>
      <button
        className="right-panel-toggle-top"
        onClick={props.onToggle}
        title={props.expanded ? "收起" : "展开"}
      >
        {props.expanded ? "▶" : "◀"}
      </button>

      {props.expanded && (
        <div className="right-panel-status">
          <div className="status-player-info">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <span className="status-player-name">{props.playerName}</span>
              <button className="btn-switch-compact" onClick={props.onOpenProfessionModal} title="切换职业">
                切换
              </button>
            </div>
            <span className="status-player-class">
              {props.profession.icon} {props.profession.name}
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
                <span className="xp-percentage">{Math.round(professionPct)}%</span>
              </div>
              <div className="status-xp-progress">
                <div className="status-xp-fill profession" style={{ width: `${professionPct}%` }}>
                  <div className="xp-shine"></div>
                </div>
              </div>
              <div className="xp-footer">
                <span className="status-xp-text">
                  {props.professionSkill.xp || 0} / {professionNeed}
                </span>
                <span className="xp-remaining">还需 {professionNeed - (props.professionSkill.xp || 0)}</span>
              </div>
            </div>
            <div className="status-xp-bar">
              <div className="xp-header">
                <span className="status-xp-label">战斗经验</span>
                <span className="xp-percentage">{Math.round(combatPct)}%</span>
              </div>
              <div className="status-xp-progress">
                <div className="status-xp-fill combat" style={{ width: `${combatPct}%` }}>
                  <div className="xp-shine"></div>
                </div>
              </div>
              <div className="xp-footer">
                <span className="status-xp-text">
                  {props.combatXp || 0} / {combatNeed}
                </span>
                <span className="xp-remaining">还需 {combatNeed - (props.combatXp || 0)}</span>
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
                        <span className="slot-icon">{equippedName ? equippedName.charAt(0) : slot.name.charAt(0)}</span>
                        <div className="slot-hover-hint">{equippedName || "空"}</div>
                      </div>
                      <span className="equipment-slot-name">{slot.name}</span>
                    </div>
                    );
                  })}
                </div>
                <div className="paperdoll-center">
                  <div className="character-avatar-display">
                    <div className="avatar-glow"></div>
                    <span className="avatar-emoji">🧙</span>
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
                        <span className="slot-icon">{equippedName ? equippedName.charAt(0) : slot.name.charAt(0)}</span>
                        <div className="slot-hover-hint">{equippedName || "空"}</div>
                      </div>
                      <span className="equipment-slot-name">{slot.name}</span>
                    </div>
                    );
                  })}
                </div>
              </div>

              <div className="character-attributes">
                <h4>战斗属性</h4>
                <div className="attribute-row">
                  <span className="attribute-label">
                    <span className="attr-icon">❤️</span>生命值
                  </span>
                  <div className="attribute-bar-container">
                    <div
                      className="attribute-bar hp-attr-bar"
                      style={{ width: `${Math.min(100, ((50 + ((props.combatLevel || 1) - 1) * 10) / 200) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="attribute-value">
                    {50 + ((props.combatLevel || 1) - 1) * 10}
                    {props.equipmentBonus.hp > 0 && <span className="bonus-value"> +{props.equipmentBonus.hp}</span>}
                  </span>
                </div>
                <div className="attribute-row">
                  <span className="attribute-label">
                    <span className="attr-icon">💧</span>魔力值
                  </span>
                  <div className="attribute-bar-container">
                    <div
                      className="attribute-bar mp-attr-bar"
                      style={{ width: `${Math.min(100, ((50 + ((props.combatLevel || 1) - 1) * 10) / 200) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="attribute-value">
                    {50 + ((props.combatLevel || 1) - 1) * 10}
                    {props.equipmentBonus.mp > 0 && <span className="bonus-value"> +{props.equipmentBonus.mp}</span>}
                  </span>
                </div>
                <div className="attribute-row">
                  <span className="attribute-label">
                    <span className="attr-icon">⚔️</span>攻击力
                  </span>
                  <div className="attribute-bar-container">
                    <div
                      className="attribute-bar atk-attr-bar"
                      style={{ width: `${Math.min(100, ((5 + ((props.combatLevel || 1) - 1) * 1) / 50) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="attribute-value">
                    {5 + ((props.combatLevel || 1) - 1) * 1}
                    {props.equipmentBonus.atk > 0 && <span className="bonus-value"> +{props.equipmentBonus.atk}</span>}
                  </span>
                </div>
                <div className="attribute-row">
                  <span className="attribute-label">
                    <span className="attr-icon">🛡️</span>防御力
                  </span>
                  <div className="attribute-bar-container">
                    <div
                      className="attribute-bar def-attr-bar"
                      style={{ width: `${Math.min(100, (props.equipmentBonus.def / 30) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="attribute-value">
                    0
                    {props.equipmentBonus.def > 0 && <span className="bonus-value"> +{props.equipmentBonus.def}</span>}
                  </span>
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
                  <span>
                    📦 {props.inventoryItems.length} / {props.inventoryKindCount} 种
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
                      <div className="item-icon-compact">{(item.name || "物").charAt(0)}</div>
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
