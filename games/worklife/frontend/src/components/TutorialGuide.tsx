import { useState } from 'react'
import { apiClient } from '../services/api'
import './TutorialGuide.css'

const STEPS = [
  {
    title: '第一步 · 开始干活',
    body: '点中间任意一张动作卡就开始打工。动作会一轮轮自动进行，收益按服务器结算自动入账——不用盯。',
  },
  {
    title: '第二步 · 抬头看进度',
    body: '顶部活动条显示正在进行的动作和本轮进度；「停止」随时能换动作。行动队列可以提前排好下一项，无缝接上。',
  },
  {
    title: '第三步 · 生涯菜单',
    body: '右上角「生涯」里藏着成就、每日任务、商店、签到。攒够木板去做一把木头短剑——森林里等你。',
  },
]

/** 开场三步引导：建角后显示一次，看完即焚（settings.tutorialDone） */
export function TutorialGuide(props: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)

  const finish = async () => {
    if (busy) return
    setBusy(true)
    try {
      await apiClient.updateSettings({ tutorialDone: true })
    } catch {
      // 引导标记写不进也不拦玩家——本地直接关
    }
    props.onDone()
  }

  const s = STEPS[step]
  return (
    <div className="tg-card" role="dialog" aria-label="新手指引">
      <div className="tg-head">
        <span className="tg-title">{s.title}</span>
        <span className="tg-step">{step + 1} / {STEPS.length}</span>
      </div>
      <p className="tg-body">{s.body}</p>
      <div className="tg-actions">
        <button className="tg-skip" onClick={() => void finish()} disabled={busy}>跳过</button>
        {step > 0 && (
          <button className="tg-nav" onClick={() => setStep(step - 1)} disabled={busy}>上一步</button>
        )}
        {step < STEPS.length - 1 ? (
          <button className="btn btn-primary tg-nav" onClick={() => setStep(step + 1)}>下一步</button>
        ) : (
          <button className="btn btn-primary tg-nav" onClick={() => void finish()} disabled={busy}>去干活</button>
        )}
      </div>
    </div>
  )
}
