import CardArt, { type CardArtKind } from "./CardArt";
import { t1KeyFor, t1Url, profileForKey } from "../assets/t1/manifest";

type Props = {
  kind: CardArtKind | "ui" | "skills" | "equipment" | "materials" | "item";
  id: string;
  fallback?: string;
  className?: string;
  alt?: string;
};

const warned = new Set<string>();

function warnMissingOnce(key: string) {
  if (import.meta.env?.PROD) return;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[t1] missing asset ${key}`);
}

export type PlayerGender = "male" | "female" | "animal";

export function normalizeGender(gender?: string | null): PlayerGender {
  if (gender === "female") return "female";
  if (gender === "animal" || gender === "secret") return "animal";
  return "male";
}

export const AVATAR_OPTIONS: Array<{ id: string; label: string; gender: PlayerGender }> = [
  { id: "avatar_male_knight", label: "星辉剑士", gender: "male" },
  { id: "avatar_male_ranger", label: "晨风游侠", gender: "male" },
  { id: "avatar_male_mage", label: "苍翠秘术师", gender: "male" },
  { id: "avatar_female_valkyrie", label: "绯光女武神", gender: "female" },
  { id: "avatar_female_alchemist", label: "翠星炼金师", gender: "female" },
  { id: "avatar_female_healer", label: "月华圣女", gender: "female" },
  { id: "avatar_animal_fox", label: "灵狐冒险家", gender: "animal" },
  { id: "avatar_animal_cat", label: "星冠猫骑士", gender: "animal" },
];

const LEGACY_EMOJI_AVATAR_MAP: Record<string, string> = {
  "🙂": "avatar_male_knight",
  "😎": "avatar_male_ranger",
  "🤠": "avatar_male_mage",
  "👷": "avatar_female_valkyrie",
  "🧙": "avatar_female_alchemist",
  "🐯": "avatar_female_healer",
  "🦊": "avatar_animal_fox",
  "😺": "avatar_animal_cat",
};

export function normalizeAvatarId(avatar?: string | null, gender?: string | null): string {
  if (avatar && AVATAR_OPTIONS.some((a) => a.id === avatar)) {
    return avatar;
  }
  if (avatar && LEGACY_EMOJI_AVATAR_MAP[avatar]) {
    return LEGACY_EMOJI_AVATAR_MAP[avatar];
  }
  const g = normalizeGender(gender);
  if (g === "female") return "avatar_female_valkyrie";
  if (g === "animal") return "avatar_animal_fox";
  return "avatar_male_knight";
}

export function characterArtId(classId: string | undefined, gender?: string | null): string {
  const base = classId || "woodcutter";
  const g = normalizeGender(gender);
  if (g === "female") {
    const femaleKey = t1KeyFor("character", `${base}_female`);
    if (femaleKey && t1Url(femaleKey)) {
      return `${base}_female`;
    }
  }
  if (g === "animal") {
    const animalKey = t1KeyFor("character", `${base}_animal`);
    if (animalKey && t1Url(animalKey)) {
      return `${base}_animal`;
    }
  }
  return base;
}

export function PlayerAvatarIcon(props: { avatar?: string | null; gender?: string | null; className?: string; alt?: string }) {
  const avatarId = normalizeAvatarId(props.avatar, props.gender);
  const label = AVATAR_OPTIONS.find((a) => a.id === avatarId)?.label || "角色头像";
  return (
    <T1Art
      kind="ui"
      id={avatarId}
      fallback="✦"
      className={`player-avatar-art ${props.className || ""}`.trim()}
      alt={props.alt ?? label}
    />
  );
}

export function T1Art(props: Props) {
  const key = t1KeyFor(props.kind, props.id);
  const src = key ? t1Url(key) : undefined;
  const profile = key ? profileForKey(key) : "item";
  if (src) {
    return (
      <img
        className={`t1-art t1-art-${profile} ${props.className || ""}`.trim()}
        src={src}
        alt={props.alt || ""}
        data-t1-key={key}
        data-t1-profile={profile}
      />
    );
  }
  if (key) warnMissingOnce(key);
  if (
    props.kind === "tree" ||
    props.kind === "monster" ||
    props.kind === "craft" ||
    props.kind === "character" ||
    props.kind === "item" ||
    props.kind === "equipment" ||
    props.kind === "materials"
  ) {
    return (
      <CardArt
        kind={props.kind}
        id={props.id}
        fallback={props.fallback}
        className={`t1-art t1-art-${profile} ${props.className || ""}`.trim()}
      />
    );
  }
  return <span className={`t1-art-missing t1-art-${profile} ${props.className || ""}`.trim()}>{props.fallback || ""}</span>;
}

export function T1ItemIcon(props: { itemId: string; fallback?: string; className?: string; alt?: string }) {
  return <T1Art kind="item" id={props.itemId} fallback={props.fallback} className={props.className} alt={props.alt} />;
}

/** Inline gold coin: the 🪙 emoji is missing from the UI font, so always use the header's coin art. */
export function GoldIcon(props: { className?: string }) {
  return <T1Art kind="ui" id="gold" fallback="金" alt="" className={`gold-inline${props.className ? ` ${props.className}` : ""}`} />;
}
