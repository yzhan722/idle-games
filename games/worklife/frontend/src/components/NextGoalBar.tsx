import { CHAPTER1_OBJECTIVES, type ChapterGoal } from "../gameplay/chapter1";

export function NextGoalBar(props: { goal: ChapterGoal; onGo: () => void; goLabel?: string }) {
  const objectiveIndex = CHAPTER1_OBJECTIVES.indexOf(
    props.goal.id as (typeof CHAPTER1_OBJECTIVES)[number]
  );
  const current = objectiveIndex >= 0 ? objectiveIndex + 1 : 1;

  return (
    <div className="next-goal-bar" data-goal-id={props.goal.id}>
      <div className="next-goal-copy">
        <span className="next-goal-label">
          第一章 · {current}/{CHAPTER1_OBJECTIVES.length}
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
