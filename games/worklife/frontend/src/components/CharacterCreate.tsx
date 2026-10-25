import { useMemo, useState } from 'react'
import { apiClient } from '../services/api'
import { T1Art, characterArtId, AVATAR_OPTIONS, PlayerAvatarIcon, type PlayerGender } from './T1Art'
import { getProfessionPerk } from '../gameplay/professionPerks'
import './CharacterCreate.css'

export type ClassOption = { id: string; name: string; icon: string; gatherName: string; craftName: string }

const GENDERS: Array<{ id: PlayerGender; label: string; icon: string }> = [
  { id: 'male', label: '男', icon: '♂' },
  { id: 'female', label: '女', icon: '♀' },
  { id: 'animal', label: '动物', icon: '🐾' },
]

/**
 * 首次进游戏的建角仪式：名字 + 头像 + 性别 + 职业第一印象。
 * 老存档（无 characterCreated 标记）下次进游戏也会补一次，字段可留空走默认。
 */
export function CharacterCreate(props: {
  classes: ClassOption[];
  currentName: string;
  currentClassId: string;
  onDone: (res?: { name: string; avatar: string; gender: PlayerGender; classId: string }) => void;
}) {
  const [name, setName] = useState(props.currentName.startsWith('玩家_') ? '' : props.currentName)
  const [gender, setGender] = useState<PlayerGender>('male')
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0].id)
  const [classId, setClassId] = useState(props.currentClassId || props.classes[0]?.id || 'woodcutter')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const nameValid = useMemo(() => name.trim().length > 0 && name.trim().length <= 16, [name])

  const handleSelectGender = (nextGender: PlayerGender) => {
    setGender(nextGender)
    const matchingAvatar = AVATAR_OPTIONS.find((a) => a.gender === nextGender)
    if (matchingAvatar) {
      setAvatar(matchingAvatar.id)
    }
  }

  const submit = async () => {
    if (!nameValid || busy) return
    setBusy(true)
    setError('')
    try {
      await apiClient.updateSettings({
        playerName: name.trim(),
        avatar,
        gender,
        characterCreated: true,
      })
      if (classId) await apiClient.setActiveClass(classId)
      props.onDone({ name: name.trim(), avatar, gender, classId })
    } catch (e) {
      setError((e as Error)?.message || '保存失败，请重试')
      setBusy(false)
    }
  }

  return (
    <div className="cc-overlay" role="dialog" aria-label="创建角色">
      <div className="cc-card">
        <div className="cc-head">
          <h2>开始你的打工生活</h2>
          <p>给自己起个名字，选个专属幻想头像与形象。职业与外观进游戏后随时能换。</p>
        </div>

        <div className="cc-section">
          <label className="cc-label">名字</label>
          <input
            className="input cc-name"
            maxLength={16}
            placeholder="1-16 个字"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="cc-section">
          <label className="cc-label">形象</label>
          <div className="cc-gender-row">
            {GENDERS.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`cc-gender ${gender === g.id ? 'sel' : ''}`}
                onClick={() => handleSelectGender(g.id)}
              >{g.icon} {g.label}</button>
            ))}
          </div>
        </div>

        <div className="cc-section">
          <label className="cc-label">专属头像</label>
          <div className="cc-avatar-grid">
            {AVATAR_OPTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`cc-avatar ${avatar === a.id ? 'sel' : ''}`}
                onClick={() => setAvatar(a.id)}
                title={a.label}
                aria-label={`头像 ${a.label}`}
              >
                <PlayerAvatarIcon avatar={a.id} gender={a.gender} />
                <span className="cc-avatar-name">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="cc-section">
          <label className="cc-label">初始职业<span className="cc-hint">（进游戏后随时可换）</span></label>
          <div className="cc-class-grid">
            {props.classes.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`cc-class ${classId === c.id ? 'sel' : ''}`}
                onClick={() => setClassId(c.id)}
              >
                <span className="cc-class-art">
                  <T1Art kind="character" id={characterArtId(c.id, gender)} fallback={c.icon} alt={c.name} />
                </span>
                <span className="cc-class-name">{c.icon} {c.name}</span>
                <span className="cc-class-desc">{c.gatherName} · {c.craftName}</span>
                <span className="cc-class-perk">{getProfessionPerk(c.id).shortTag}</span>
              </button>
            ))}
          </div>
          {classId && (
            <div className="cc-perk-detail">
              <div><strong>【{getProfessionPerk(classId).traitName}】</strong>{getProfessionPerk(classId).combatAndUtilityDesc}</div>
              <div className="cc-perk-sub">✨ {getProfessionPerk(classId).masteryDesc}</div>
            </div>
          )}
        </div>

        {error && <div className="cc-error" role="alert">{error}</div>}

        <button
          className="btn btn-primary cc-submit"
          disabled={!nameValid || busy}
          onClick={() => void submit()}
        >
          {busy ? '创建中...' : '进入异世界'}
        </button>
      </div>
    </div>
  )
}
