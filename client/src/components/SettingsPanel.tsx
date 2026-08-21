import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { SPROUT_PATH } from './EntryOverlay'
import type { ReadRecord } from '../hooks/useReadHistory'
import './SettingsPanel.css'

export type ThemeKey = 'warm' | 'green' | 'dark'

/** 顶栏设置按钮用的「当前主题符号」：暖黄=暖阳 / 浅绿=新芽 / 深黑=月亮，一眼看出当前模式 */
export function ThemeGlyph({ theme }: { theme: ThemeKey }) {
  if (theme === 'green') return <SproutIcon />
  if (theme === 'dark') return <MoonIcon />
  return <SunIcon />
}

const THEMES: { key: ThemeKey; label: string; desc: string; icon: ReactNode }[] = [
  { key: 'warm', label: '暖黄', desc: '温暖奶油', icon: <SunIcon /> },
  { key: 'green', label: '浅绿', desc: '鲜亮生机', icon: <SproutIcon /> },
  { key: 'dark', label: '深黑', desc: '夜间暗色', icon: <MoonIcon /> },
]

/** 浏览时刻格式化为 HH:mm */
function formatTime(t: number): string {
  const d = new Date(t)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/**
 * 设置面板：主题为当前落地功能；「更多」区——浏览垃圾桶（TODO-5 已落地：今日浏览记录，
 * 只存档不还原，自然日自动清空）；投喂金句（TODO-8，规划中）
 */
export default function SettingsPanel({
  theme,
  onChange,
  onClose,
  records,
}: {
  theme: string
  onChange: (t: ThemeKey) => void
  onClose: () => void
  records: ReadRecord[]
}) {
  const [binOpen, setBinOpen] = useState(false)
  // 垃圾桶记录区：height 0 → 实际高度过渡，让记录「滑出来」而非突然撑大面板
  const recordsWrapRef = useRef<HTMLDivElement>(null)
  const [recordsH, setRecordsH] = useState(0)
  useLayoutEffect(() => {
    if (!binOpen) {
      setRecordsH(0)
      return
    }
    const el = recordsWrapRef.current
    if (el) setRecordsH(el.scrollHeight)
  }, [binOpen])
  // 关闭面板：先播渐隐再卸载（点 × / 点遮罩都走这里）
  const [leaving, setLeaving] = useState(false)
  const closeTimerRef = useRef<number | null>(null)
  const requestClose = () => {
    if (leaving) return
    setLeaving(true)
    closeTimerRef.current = window.setTimeout(onClose, 240) // 与 is-leaving 过渡时长一致
  }
  useLayoutEffect(
    () => () => {
      if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current)
    },
    [],
  )

  return (
    <div className={leaving ? 'settings-mask is-leaving' : 'settings-mask'} onClick={requestClose}>
      <div
        className={leaving ? 'settings-panel is-leaving' : 'settings-panel'}
        role="dialog"
        aria-modal="true"
        aria-label="设置"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-panel__head">
          <h2 className="settings-panel__title">设置</h2>
          <button className="settings-panel__close" aria-label="关闭" onClick={requestClose}>
            ×
          </button>
        </div>

        <section className="settings-section">
          <h3 className="settings-section__title">主题</h3>
          <div className="settings-themes">
            {THEMES.map((t) => (
              <button
                key={t.key}
                type="button"
                className={theme === t.key ? 'settings-theme is-active' : 'settings-theme'}
                onClick={() => onChange(t.key)}
                aria-pressed={theme === t.key}
              >
                <span className="settings-theme__icon">{t.icon}</span>
                <span className="settings-theme__label">{t.label}</span>
                <span className="settings-theme__desc">{t.desc}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h3 className="settings-section__title">更多</h3>
          <ul className="settings-soon">
            <li
              className="settings-soon__item settings-soon__item--btn"
              onClick={() => setBinOpen((v) => !v)}
              aria-expanded={binOpen}
            >
              <span>浏览垃圾桶</span>
              <span className="settings-soon__tag">
                {records.length > 0 ? `今日 ${records.length} 条` : '今日暂无'}
              </span>
            </li>
          </ul>
          <div
            className="settings-records-wrap"
            ref={recordsWrapRef}
            style={{ height: binOpen ? recordsH : 0 }}
            aria-hidden={!binOpen}
          >
            <div className="settings-records">
              {records.length === 0 ? (
                <p className="settings-records__empty">今天还没浏览过热点～</p>
              ) : (
                <ul className="settings-records__list">
                  {records.map((r) => (
                    <li key={r.url} className="settings-records__row">
                      {r.url.startsWith('http') ? (
                        <a
                          className="settings-records__title"
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {r.title}
                        </a>
                      ) : (
                        <span className="settings-records__title">{r.title}</span>
                      )}
                      <span className="settings-records__meta">
                        {r.source} · {formatTime(r.time)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="settings-records__hint">
                看完就翻篇啦，明天 00:00 自动清零
              </p>
            </div>
          </div>
          <ul className="settings-soon settings-soon--after-records">
            <li className="settings-soon__item">
              <span>投喂金句</span>
              <span className="settings-soon__tag">规划中</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" />
    </svg>
  )
}

function SproutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
      <path d={SPROUT_PATH} />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z" />
    </svg>
  )
}
