import { useEffect, useState } from 'react'
import { LEGAL_DRAFT, legalDocFromHash, type LegalDoc } from '../gameplay/legalDocs'
import './LegalPage.css'

/** 地址栏 #privacy / #terms 打开的全屏页。盖在当前界面上面，关掉后下面的输入不丢。 */
export function LegalPage() {
  const [doc, setDoc] = useState<LegalDoc | null>(() => legalDocFromHash(window.location.hash))

  useEffect(() => {
    const sync = () => setDoc(legalDocFromHash(window.location.hash))
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  if (!doc) return null

  const close = () => {
    // 这一页的 state 里记着上次自动刷新的时间（utils/lazyImport.ts），不能清掉
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    setDoc(null)
  }

  return (
    <div className="legal-page" role="dialog" aria-modal="true" aria-label={doc.title}>
      <div className="legal-body">
        <button type="button" className="legal-close" onClick={close}>
          ← 返回
        </button>
        <h1>{doc.title}</h1>
        {LEGAL_DRAFT && <p className="legal-draft">草案 · 尚未生效</p>}
        {doc.sections.map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            {s.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </section>
        ))}
        <p className="legal-other">
          {doc.id === 'privacy' ? <a href="#terms">看用户协议</a> : <a href="#privacy">看隐私政策</a>}
        </p>
      </div>
    </div>
  )
}
