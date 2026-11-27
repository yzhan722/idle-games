import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../../services/api';

/* 真人排行榜：并入竞技城镇面板的一个页签。名单、名次都由服务器给，这里只显示；名字按纯文本渲染（React 自动转义）。 */

/** circle：团榜（同好会成员总等级之和，只算能上真人榜的成员）。 */
type RankBoard = 'total' | 'combat' | 'zone' | 'circle';
type RankView = {
  board: RankBoard;
  entries: Array<{ rank: number; name: string; score: number; label: string; me: boolean }>;
  me: { listed: true; rank: number; score: number; label: string } | { listed: false; reason: 'no_name' | 'excluded' };
};

const BOARDS: Array<[RankBoard, string]> = [
  ['total', '总等级'],
  ['combat', '战斗等级'],
  ['zone', '最远区域'],
  ['circle', '同好会'],
];

function myLine(me: RankView['me'], board: RankBoard): string {
  if (!me.listed && board === 'circle') return '还没加入同好会';
  if (!me.listed) return me.reason === 'no_name' ? '换个自己的名字就能上榜' : '暂未上榜';
  return me.score > 0 ? `我：第 ${me.rank} 名 · ${me.label}` : `我：${me.label}`;
}

export function RankBoardView() {
  const [board, setBoard] = useState<RankBoard>('total');
  const [view, setView] = useState<RankView | null>(null);
  const [failed, setFailed] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async (next: RankBoard) => {
    const mine = ++seq.current;
    setFailed(false);
    try {
      const res = next === 'circle' ? await apiClient.getCircleBoard() : await apiClient.getLeaderboard(next);
      if (mine === seq.current) setView(res as RankView);
    } catch {
      if (mine === seq.current) setFailed(true);
    }
  }, []);

  useEffect(() => {
    setView(null);
    void load(board);
    return () => {
      seq.current += 1;
    };
  }, [board, load]);

  return (
    <div className="rb-view" data-testid="rank-board">
      <div className="rb-boards">
        {BOARDS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            data-testid={`rank-board-${id}`}
            className={`rb-board-btn ${board === id ? 'active' : ''}`}
            onClick={() => setBoard(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {failed ? (
        <button type="button" className="rb-board-btn rb-retry" onClick={() => void load(board)}>
          没加载出来，点这里重试
        </button>
      ) : !view ? (
        <div className="prog-empty">加载中…</div>
      ) : (
        <>
          <div className="rb-me" data-testid="rank-me">{myLine(view.me, board)}</div>
          {view.entries.length === 0 ? (
            <div className="prog-empty">还没有人上榜</div>
          ) : (
            <ol className="rb-list">
              {view.entries.map((e, i) => (
                <li key={i} className={`rb-row ${e.me ? 'me' : ''} ${e.rank <= 3 ? 'top' : ''}`}>
                  <span className="rb-rank">{e.rank}</span>
                  <bdi className="rb-name">{e.name}</bdi>
                  <span className="rb-score">{e.label}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="rb-note">只列真人 · 每分钟更新</div>
        </>
      )}
    </div>
  );
}
