import { useState } from 'react'
import { apiClient } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './Toast'
import './LegalPage.css'

/** 没有密码的账号（游客）用这句话代替密码，与后端 account_deletion.DELETE_CONFIRM_TEXT 一致。 */
const CONFIRM_TEXT = '注销账号'

/** 设置里的条款入口与账号注销：先输密码，再确认一次。 */
export function DeleteAccountSection() {
  const toast = useToast()
  const { user, forgetSession } = useAuth()
  const [step, setStep] = useState<'closed' | 'verify' | 'confirm'>('closed')
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const hasPassword = Boolean(user?.username)
  const ready = hasPassword ? secret.length > 0 : secret === CONFIRM_TEXT

  const reset = () => {
    setStep('closed')
    setSecret('')
  }

  const submit = async () => {
    if (busy || !ready) return
    setBusy(true)
    try {
      await apiClient.deleteAccount(hasPassword ? { password: secret } : { confirmText: secret })
      toast.success('账号已注销')
      forgetSession()
    } catch (e: any) {
      if (e?.status === 401) {
        forgetSession()
        return
      }
      toast.error(e?.message || '注销失败，账号还在')
      setStep('verify')
      setSecret('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="settings-legal">
      <div className="settings-legal-links">
        <a href="#privacy">隐私政策</a>
        <a href="#terms">用户协议</a>
      </div>
      {step === 'closed' && (
        <button type="button" className="settings-export-btn settings-delete-btn" onClick={() => setStep('verify')}>
          注销账号
        </button>
      )}
      {step === 'verify' && (
        <div className="settings-delete-box">
          <span>存档、背包、金币全部删除，挂单撤下且不退还，队长会解散队伍。</span>
          <input
            className="input"
            type={hasPassword ? 'password' : 'text'}
            autoComplete="current-password"
            placeholder={hasPassword ? '输入密码' : `输入「${CONFIRM_TEXT}」`}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
          <div className="settings-delete-actions">
            <button type="button" className="settings-export-btn" onClick={reset}>
              取消
            </button>
            <button type="button" className="settings-export-btn settings-delete-btn" disabled={!ready} onClick={() => setStep('confirm')}>
              下一步
            </button>
          </div>
        </div>
      )}
      {step === 'confirm' && (
        <div className="settings-delete-box">
          <strong>注销后无法恢复。</strong>
          <div className="settings-delete-actions">
            <button type="button" className="settings-export-btn" disabled={busy} onClick={reset}>
              不注销了
            </button>
            <button type="button" className="settings-export-btn settings-delete-btn" disabled={busy} onClick={() => void submit()}>
              {busy ? '注销中…' : '确认注销'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
