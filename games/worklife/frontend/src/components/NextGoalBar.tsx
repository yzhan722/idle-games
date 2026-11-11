import { CHAPTER1_OBJECTIVES, type ChapterGoal } from "../gameplay/chapter1";

const CHAPTER_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "第一章 · 森林伐木",
  2: "第二章 · 矿山铁匠",
  3: "第三章 · 沼泽裁缝",
  4: "第四章 · 雪山火山与百味秘药",
};

export function NextGoalBar(props: { goal: ChapterGoal; onGo: () => void; goLabel?: string }) {
  const ch = props.goal.chapter ?? 1;
  const fallbackIdx = CHAPTER1_OBJECTIVES.indexOf(
    props.goal.id as (typeof CHAPTER1_OBJECTIVES)[number]
  );
  const current = props.goal.stepIndex ?? (fallbackIdx >= 0 ? fallbackIdx + 1 : 1);
  const total = props.goal.stepTotal ?? CHAPTER1_OBJECTIVES.length;

  return (
    <div className="next-goal-bar" data-goal-id={props.goal.id} data-chapter={ch}>
      <div className="next-goal-copy">
        <span className="next-goal-label">
          {CHAPTER_LABELS[ch]} · {current}/{total}
        </span>
        <strong className="next-goal-title">{props.goal.title}</strong>
        <span className="next-goal-detail">{props.goal.detail}</span>
      </div>
      <button type="button" className="next-goal-go" onClick={props.onGo}>
        {props.goLabel || "前往"}
      </button>
    </div>
  );
}
