import { useEffect, useRef, useState } from 'react'
import { addUserQuote } from '../data/quoteStore'
import './QuoteBottle.css'

type Stage = 'view' | 'confirm' | 'done'

type Ripple = {
  id: number
  x: number // 百分比，可落在对话框内部（随机散布，含边缘与内部）
  y: number
  size: number // px
  op: number // 0.35 ~ 1.0 深浅
}

// 🔧 测试模式开关：true = 每次点金句都展示"信封"介绍（方便查看效果）。
// 用户说"退出测试模式"时改回 false，即恢复「读过 localStorage 就不再显示」。
const BOTTLE_TEST_MODE = true

/**
 * 金句漂流瓶浮层（隐藏款功能，形态 B：两人小聊天）。
 * - 首次进入展示一封"信封"介绍：本地 localStorage 标记已看后才不再显示
 *   ⚠️ 临时测试模式：现在每次点都展示信封（mode 初始固定 'intro'，方便看效果）
 *   正式上线前恢复成「读 localStorage 决定」即可
 */
export default function QuoteBottle({
  quote,
  onClose,
}: {
  quote: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [draft, setDraft] = useState('')
  const [stage, setStage] = useState<Stage>('view')
  const [ripples, setRipples] = useState<Ripple[]>([])
  const rippleId = useRef(0)
  // 首次进入展示信封：测试模式下每次都先看介绍；否则读 localStorage 决定（只显示一次）
  const [mode, setMode] = useState<'intro' | 'chat'>(() => {
    if (BOTTLE_TEST_MODE) return 'intro'
    try {
      return localStorage.getItem('bottle_intro_seen') === '1' ? 'chat' : 'intro'
    } catch {
      return 'intro'
    }
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // 涟漪：低频随机、任意时刻最多 2 颗在场——画龙点睛而非喧宾夺主。
  // 池子"感觉很大"（位置/大小/深浅每次都不同），但每次只抽 1~2 颗，制造随机感。
  // 仅在正式对话态（chat）运行；信封介绍态不播。
  useEffect(() => {
    if (mode !== 'chat') return
    // 尊重无障碍：减少动态时完全不播
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    let timer: number | undefined
    const spawn = () => {
      // 本次抽 1 或 2 颗
      const count = Math.random() < 0.45 ? 2 : 1
      const next: Ripple[] = []
      for (let i = 0; i < count; i++) {
        const r: Ripple = {
          id: rippleId.current++,
          // 位置散布整个对话框（含内部）：上下 5%~92%，左右 4%~92%
          x: 4 + Math.random() * 88,
          y: 5 + Math.random() * 87,
          // 大小 12~40，偶尔偏大
          size: 12 + Math.round(Math.random() * 28),
          // 深浅 0.35（几乎将现未现）~ 1.0（浓）
          op: 0.35 + Math.random() * 0.65,
        }
        next.push(r)
      }
      setRipples(next)
      // 约 1.6s 播完，移除（保证在场 ≤2）
      window.setTimeout(() => {
        setRipples((cur) => cur.filter((it) => !next.find((n) => n.id === it.id)))
      }, 1700)
    }
    // 随机间隔 4~9s：低频、不可预测
    const loop = () => {
      spawn()
      timer = window.setTimeout(loop, 4000 + Math.random() * 5000)
    }
    timer = window.setTimeout(loop, 1500 + Math.random() * 3000)
    return () => {
      if (timer) window.clearTimeout(timer)
      setRipples([])
    }
  }, [mode])

  // 复制：手机端 / 部分 Webview / 非安全上下文（navigator.clipboard 可能不可用）→ 加 execCommand 兜底
  const copy = async () => {
    // 1. 优先 Clipboard API（现代浏览器、HTTPS / 安全上下文）
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard?.writeText &&
      window.isSecureContext
    ) {
      try {
        await navigator.clipboard.writeText(quote)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
        return
      } catch {
        // 失败不阻断，落入下面的兜底
      }
    }
    // 2. 兜底：textarea + execCommand('copy')，对手机端任意浏览器都能跑
    try {
      const ta = document.createElement('textarea')
      ta.value = quote
      ta.setAttribute('readonly', '')
      // 屏外、不影响视觉，避免 iOS 缩放
      ta.style.position = 'fixed'
      ta.style.top = '0'
      ta.style.left = '0'
      ta.style.width = '1px'
      ta.style.height = '1px'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      ta.setSelectionRange(0, ta.value.length)
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      if (ok) {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
      }
    } catch {
      // 实在不行（如 Webview 完全禁用）也不报错，避免打断用户
    }
  }

  const submit = () => {
    const ok = addUserQuote(draft)
    if (!ok) return // 空 / 超长 / 重复 → 不动
    setDraft('')
    setStage('done')
  }

  // 信封「开始漂流」：标记已看过，切到正式对话
  const startBottle = () => {
    try {
      localStorage.setItem('bottle_intro_seen', '1')
    } catch {
      // 隐私模式写不进也没关系，本次直接进入对话
    }
    setMode('chat')
  }

  return (
    <div
      className="bottle-mask"
      role="dialog"
      aria-modal="true"
      aria-label="金句漂流瓶"
      onClick={onClose}
    >
      <div className="bottle-chat" onClick={(e) => e.stopPropagation()} key={mode}>
        {mode === 'intro' ? (
      /* 首次入场：一封信纸便签，介绍金句漂流瓶 */
      <div className="bottle-intro">
        {/* 左上斜贴撕边胶带 */}
        <span className="bottle-tape" aria-hidden="true" />
        {/* 右上花饰（卷草纹） */}
        <span className="bottle-intro__flourish" aria-hidden="true">
                <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 30 Q14 18 10 10 M10 10 Q18 6 24 14 M24 14 Q26 22 20 26 M20 26 Q26 30 30 26" />
                  <circle cx="20" cy="14" r="1.4" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <h3 className="bottle-intro__title">
                {/* 标题前的极简波浪小符号，呼应漂流 */}
                <svg className="bottle-intro__mark" viewBox="0 0 44 16" aria-hidden="true">
                  <path d="M2 9 q4 -6 8 0 t8 0 t8 0 t8 0 t8 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                嗨，这里是“金句漂流瓶”
              </h3>
              <p className="bottle-intro__text">
                这里每天都会漂来很多句，是你路过时值得停一下看看的话。
              </p>
              <p className="bottle-intro__text">喜欢，就把它轻轻带走；</p>
              <p className="bottle-intro__text">
                也想说点什么，就投一句进来，它会在某一天的某个时刻再次出现~
              </p>
              <button className="bottle-throw" type="button" onClick={startBottle}>
                开始漂流 ~
              </button>
              {/* 信纸右下角：徽章小图标（按你给的 logo 原样搬入） */}
              <div className="bottle-glyph" aria-hidden="true">
                <svg
                  t="1787366976012"
                  className="bottle-glyph__svg icon"
                  viewBox="0 0 1024 1024"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  p-id="6782"
                  width="200"
                  height="200"
                >
                  <path
                    d="M416.46875 381.5c3.28125-3.09375 6.46875-6.28125 9.75-9.375 23.4375 1.3125 35.25-9.28125 34.03125-33.28125l-0.28125 0.5625c3.75-3.84375 7.59375-7.6875 11.34375-11.625l-0.46875 0.46875c4.125-3.28125 8.25-6.5625 12.28125-9.84375 1.78125-2.34375 3.9375-3 6.75-2.0625 23.4375 0.5625 46.96875 2.90625 70.21875 1.21875 21.9375-1.59375 43.59375-7.3125 65.4375-11.25 29.90625-31.40625 59.8125-62.90625 89.8125-94.40625-4.875-13.3125-29.625-15.375-13.125-35.71875 16.5-20.34375 57.09375 10.6875 57.09375 10.6875l104.4375 79.125s36.28125 40.40625 21.375 61.125c-10.59375 12.28125-41.53125-20.71875-41.53125-20.71875s-70.5 74.8125-104.90625 104.15625c-10.78125 58.125 16.78125 120.375-27.84375 170.71875-18-2.4375-38.0625 28.03125-54.28125-3.46875 33.65625-34.59375 35.90625-77.625 33.09375-122.0625-2.25-35.4375 1.40625-64.03125 36.9375-88.125 31.03125-21 51.46875-57.5625 76.6875-87.46875-46.78125-35.71875-57.75-36.9375-57.75-36.9375S689.75 304.25 676.0625 318.875c-26.0625 27.75-56.53125 40.21875-95.71875 39.9375-31.78125-0.1875-63.5625 9.5625-95.34375 14.8125-4.03125 3.84375-8.0625 7.59375-12.09375 11.4375l0.46875-0.46875-11.4375 11.4375 0.46875-0.28125c-28.03125 1.40625-42.75 16.125-44.15625 44.15625l0.28125-0.46875-11.4375 11.4375 0.46875-0.46875c-3.84375 4.03125-7.59375 7.96875-11.4375 12-3.09375 3.46875-6.1875 6.9375-9.1875 10.40625-17.53125-1.875-25.21875 5.90625-23.25 23.4375-3.375 3.09375-6.75 6.09375-10.21875 9.1875-4.03125 3.84375-8.0625 7.6875-12.09375 11.4375l0.46875-0.46875-11.4375 11.4375 0.46875-0.46875c-3.65625 3.9375-7.40625 7.875-11.0625 11.8125l0.65625-0.28125c-22.96875-2.15625-33.46875 9.5625-34.6875 31.40625l-0.1875 0.09375c-12.65625 6.65625-25.3125 13.21875-43.875 22.96875 9.28125-25.3125 15.28125-41.625 21.28125-57.9375 3.09375-3.28125 6.28125-6.46875 9.375-9.75l12.5625-12.5625c3.28125-3.09375 6.5625-6.28125 9.84375-9.375 23.4375 1.21875 35.25-9.375 33.9375-33.375l-0.28125 0.5625c3.75-3.9375 7.59375-7.78125 11.34375-11.71875l-0.5625 0.5625L350.75 448.25l-0.5625 0.5625 11.625-11.34375-0.5625 0.28125c24 1.3125 34.59375-10.59375 33.28125-34.03125 3.09375-3.28125 6.28125-6.46875 9.375-9.75 4.21875-4.125 8.34375-8.25 12.5625-12.46875z"
                    fill="#2B85DA"
                    p-id="6783"
                  />
                  <path
                    d="M262.90625 535.34375c-6 16.3125-12 32.53125-21.28125 57.9375 18.5625-9.75 31.21875-16.3125 43.875-22.96875-4.03125 21.46875 9.46875 24.09375 25.6875 24.09375 34.3125-0.09375 68.71875 0 108.5625 0 2.34375 18 4.21875 32.53125 6.65625 50.90625H135.3125v-52.40625c62.625 20.4375 86.625-34.96875 127.59375-57.5625z"
                    fill="#3C8DD9"
                    p-id="6784"
                  />
                  <path
                    d="M656.5625 577.8125c16.125 31.5 36.28125 1.03125 54.28125 3.46875 14.71875 4.5 29.15625 11.0625 44.25 13.03125 29.71875 3.84375 36.375 19.40625 26.71875 49.78125H546.3125c-1.6875-6.46875-4.96875-14.71875-5.53125-23.15625-0.46875-6.75 2.34375-13.78125 3.09375-17.90625 39.5625-8.90625 76.125-17.0625 112.6875-25.21875z"
                    fill="#3E8EDA"
                    p-id="6785"
                  />
                  <path
                    d="M755.65625 795.875v46.78125H587.65625c-1.21875-15 1.5-28.59375 0-46.78125h168zM608.46875 706.0625v46.78125H426.40625c-1.21875-15 1.5-28.59375 0-46.78125h182.0625zM371.75 706.0625v46.78125h-59.8125c-1.21875-15 1.5-28.59375 0-46.78125h59.8125z"
                    fill="#3C8FDD"
                    p-id="6786"
                  />
                  <path
                    d="M625.53125 306.40625c-21.75 3.9375-43.5 9.65625-65.4375 11.25-23.25 1.6875-46.78125-0.65625-70.21875-1.21875 45.28125-3.28125 90.46875-6.65625 135.65625-10.03125zM418.15625 439.90625c1.40625-28.03125 16.125-42.75 44.15625-44.15625l-44.15625 44.15625zM460.25 338.84375c1.21875 24-10.59375 34.59375-34.03125 33.28125 11.34375-11.0625 22.6875-22.21875 34.03125-33.28125zM394.53125 403.8125c1.3125 23.4375-9.375 35.25-33.28125 34.03125 11.0625-11.34375 22.21875-22.6875 33.28125-34.03125zM328.625 470.375c1.3125 24-10.5 34.59375-33.9375 33.375l33.9375-33.375zM285.6875 570.21875c1.125-21.9375 11.625-33.5625 34.6875-31.40625-11.53125 10.5-23.0625 20.90625-34.6875 31.40625zM363.59375 496.15625c-2.0625-17.53125 5.625-25.3125 23.25-23.4375-7.78125 7.78125-15.46875 15.5625-23.25 23.4375zM483.21875 318.5c-4.125 3.28125-8.25 6.5625-12.28125 9.84375 4.03125-3.28125 8.15625-6.5625 12.28125-9.84375z"
                    fill="#3C8DD9"
                    p-id="6787"
                  />
                  <path
                    d="M471.40625 327.78125c-3.75 3.84375-7.59375 7.6875-11.34375 11.625 3.75-3.84375 7.5-7.6875 11.34375-11.625zM472.8125 385.0625c4.03125-3.84375 8.0625-7.59375 12.09375-11.4375-4.03125 3.84375-8.0625 7.59375-12.09375 11.4375zM416.46875 381.5l-12.5625 12.5625 12.5625-12.5625zM461.84375 396.03125l11.4375-11.4375-11.4375 11.4375zM361.8125 437.5625l-11.625 11.34375c3.84375-3.84375 7.6875-7.59375 11.625-11.34375zM407 450.875l11.4375-11.4375c-3.84375 3.75-7.59375 7.59375-11.4375 11.4375zM350.65625 448.34375l-11.53125 11.53125 11.53125-11.53125zM396.03125 462.3125c3.84375-4.03125 7.59375-7.96875 11.4375-12-3.84375 4.03125-7.59375 8.0625-11.4375 12zM339.6875 459.3125c-3.75 3.9375-7.59375 7.78125-11.34375 11.71875 3.75-3.9375 7.59375-7.875 11.34375-11.71875zM341.28125 516.78125c4.03125-3.84375 8.0625-7.6875 12.09375-11.4375-4.03125 3.75-8.0625 7.59375-12.09375 11.4375zM284.84375 513.125l-12.5625 12.5625 12.5625-12.5625zM330.3125 527.65625l11.4375-11.4375c-3.75 3.84375-7.59375 7.6875-11.4375 11.4375z"
                    fill="#3C8DD9"
                    p-id="6788"
                  />
                  <path
                    d="M319.71875 539c3.65625-3.9375 7.40625-7.875 11.0625-11.8125-3.65625 3.9375-7.40625 7.875-11.0625 11.8125z"
                    fill="#3C8DD9"
                    p-id="6789"
                  />
                </svg>
              </div>
            </div>
        ) : (
          /* 正式对话：气泡 + 金句 + 投句 */
          <>
            <div className="bottle-bubbles" aria-hidden="true">
              {/* 实心泡泡（更明显） + 空心圆环泡 */}
              <span className="bubble bubble--solid" />
              <span className="bubble bubble--ring" />
              <span className="bubble bubble--solid" />
              <span className="bubble bubble--solid" />
              <span className="bubble bubble--ring" />
              <span className="bubble bubble--solid" />
              <span className="bubble bubble--ring" />
              <span className="bubble bubble--solid" />
              {/* 漂浮微光点：缓慢摇曳，不止直线上升 */}
              <span className="mote" />
              <span className="mote" />
              <span className="mote" />
              <span className="mote" />
            </div>
            {/* 涟漪：JS 真随机、低频、任意时刻最多 2 颗在场；位置/大小/深浅每次都不同 */}
            {ripples.map((r) => (
              <span
                key={r.id}
                className="ripple"
                style={{
                  left: `${r.x}%`,
                  top: `${r.y}%`,
                  width: r.size,
                  height: r.size,
                  borderWidth: r.size > 30 ? 1.5 : 2,
                  ['--r-op' as string]: r.op,
                }}
              />
            ))}
            <div className="bottle-float">
              {/* 瓶子说话：小圆头像 + 金句气泡 */}
              <div className="bottle-msg">
                <div className="bottle-avatar" aria-hidden="true">
                  ~
                </div>
                <div className="bottle-bubble">
                  <p className="bottle-bubble__quote">{quote}</p>
                  <button
                    className={copied ? 'bottle-copy is-copied' : 'bottle-copy'}
                    type="button"
                    onClick={copy}
                  >
                    {copied ? '已拾起这一页小纸条～' : '复制这一句'}
                  </button>
                </div>
              </div>

              {/* 你回瓶子：投一句进去 */}
              <div className="bottle-reply">
                {stage === 'done' ? (
                  <p className="bottle-done">
                    已投入漂流瓶～它会在某天的旋转里，漂回你眼前
                  </p>
                ) : (
                  <>
                    <input
                      className="bottle-input"
                      placeholder="投一句进去…"
                      value={draft}
                      maxLength={120}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                    {stage === 'view' ? (
                      <button
                        className="bottle-throw"
                        type="button"
                        disabled={!draft.trim()}
                        onClick={() => setStage('confirm')}
                      >
                        投出
                      </button>
                    ) : (
                      <div className="bottle-confirm">
                        <p className="bottle-confirm__text">
                          投出后无法更改或删除，确定要投吗？
                        </p>
                        <div className="bottle-confirm__btns">
                          <button
                            className="bottle-confirm__no"
                            type="button"
                            onClick={() => setStage('view')}
                          >
                            再想想
                          </button>
                          <button
                            className="bottle-confirm__yes"
                            type="button"
                            onClick={submit}
                          >
                            确认投出
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
