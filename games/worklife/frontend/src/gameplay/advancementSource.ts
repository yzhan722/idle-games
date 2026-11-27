import { readFileSync } from "node:fs";
import path from "node:path";

/** 只给测试用：进阶面板源码拆在 components/advancement/，按拆分前的先后次序拼回一份文本。 */
export const ADVANCEMENT_PANEL_FILES = [
  "PanelModal",
  "ReputationPanel",
  "PrestigePanel",
  "HeritageWorkshopPanel",
  "CaravanTradePanel",
  "AlchemyCauldronPanel",
  "AstralRelicsPanel",
  "SkyForgePanel",
  "HarborDerbyPanel",
  "AcademyFestivalPanel",
  "SkyArenaTownPanel",
  "BeastWeatherPanel",
  "BardTavernChroniclePanel",
  "AirshipPaladinView",
  "DwarfElfView",
  "AbyssGuildView",
] as const;

export function readAdvancementPanels(frontendSrcRoot: string): string {
  return ADVANCEMENT_PANEL_FILES.map((name) => readFileSync(path.join(frontendSrcRoot, `components/advancement/${name}.tsx`), "utf8")).join("\n");
}
