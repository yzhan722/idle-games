export const T1_ASSET_CACHE_VERSION = "20261120wl18";

export function withAssetCacheVersion(url: string): string {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;
  return url.includes("?") ? `${url}&v=${T1_ASSET_CACHE_VERSION}` : `${url}?v=${T1_ASSET_CACHE_VERSION}`;
}

export const GUILD_FRAME_META: Record<
  string,
  { id: string; label: string; iconId: string; theme: "crimson" | "astral" }
> = {
  frame_crimson_vanguard: {
    id: "frame_crimson_vanguard",
    label: "绯焰讨伐纹章",
    iconId: "guild_frame_crimson",
    theme: "crimson",
  },
  frame_astral_sovereign: {
    id: "frame_astral_sovereign",
    label: "星穹全制霸圣冕",
    iconId: "guild_frame_astral",
    theme: "astral",
  },
};

export function resolveEquippedGuildFrame(guildHonor?: {
  unlockedFrames?: string[];
  equippedFrame?: string | null;
} | null) {
  const eq = guildHonor?.equippedFrame;
  const unlocked = guildHonor?.unlockedFrames || [];
  if (!eq || !unlocked.includes(eq)) return null;
  return GUILD_FRAME_META[eq] || null;
}
