export const PRIMARY_TABS = [
  { id: "logging", name: "工作" },
  { id: "woodworking", name: "制作" },
  { id: "adventure", name: "冒险" },
  { id: "character", name: "角色" },
] as const;

export type PrimaryTabId = (typeof PRIMARY_TABS)[number]["id"];

export const CHAPTER1_CRAFT_OUTPUTS = ["lumber_1", "weapon_wooden_sword", "armor_wood_chest"] as const;

export const CHAPTER1_MONSTERS = ["slime", "crab", "monkey", "forest_boss"] as const;

export const CAREER_GROUPS: Array<{
  title: string;
  items: Array<"daily" | "achievements" | "checkin" | "reputation" | "prestige" | "settings">;
}> = [
  { title: "进度", items: ["daily", "achievements"] },
  { title: "日常", items: ["checkin"] },
  { title: "远期", items: ["reputation", "prestige"] },
  { title: "系统", items: ["settings"] },
];
