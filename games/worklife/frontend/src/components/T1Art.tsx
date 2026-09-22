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

export function T1Art(props: Props) {
  const key = t1KeyFor(props.kind, props.id);
  const src = key ? t1Url(key) : undefined;
  const profile = profileForKey(key);
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
  if (props.kind === "tree" || props.kind === "monster" || props.kind === "craft" || props.kind === "character") {
    return <CardArt kind={props.kind} id={props.id} fallback={props.fallback} className={props.className} />;
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
