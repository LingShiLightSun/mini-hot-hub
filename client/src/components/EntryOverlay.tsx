import { useEffect, useRef, useState } from 'react'
import './EntryOverlay.css'

const ENTRY_KEY = 'mini-hot-hub:last-entry'
const ENTRY_GAP_MS = 60 * 60 * 1000 // 距上次打开 > 1h 才展示开场（高频访问不打扰）

// 🔧 测试模式开关：true = 每次刷新都展示开场动画（方便查看效果）。
// 用户说"退出测试模式"时改为 false，下方真实「1H 间隔」逻辑即生效。
const ENTRY_TEST_MODE = true

// 每次打开都刷新「上次访问时间」；距上次超过间隔才需要开场
export function shouldShowEntry(): boolean {
  if (ENTRY_TEST_MODE) return true
  try {
    const last = Number(localStorage.getItem(ENTRY_KEY) || 0)
    const now = Date.now()
    localStorage.setItem(ENTRY_KEY, String(now))
    return !last || now - last > ENTRY_GAP_MS
  } catch {
    return false // 隐私模式等无法读写 → 不展示，避免打扰
  }
}

const REDUCED =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const EXIT_MS = REDUCED ? 0 : 650 // 与 .entry-overlay 淡出时长一致

const HEART_PATH =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'

// 新芽：单片优雅卷叶（浅绿主题登场，2026-08-20 用户最终选定 B·单片卷叶，Material eco 造型）
export const SPROUT_PATH =
  'M6.05 8.05c-2.73 2.73-2.73 7.15-.02 9.88 1.47-3.4 4.09-6.24 7.36-7.93-2.77 2.34-4.71 5.61-5.39 9.32 2.6 1.23 5.8.78 7.95-1.37C19.43 14.47 20 4 20 4S9.53 4.57 6.05 8.05z'

// 月亮（深黑主题入场徽记）：暖金弦月
const MOON_PATH =
  'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'

// 入场徽记 + 话语：随主题切换（暖黄=心+将心注入；浅绿=新芽+扎根；深黑=月亮+初心）
const EMBLEMS: Record<string, { path: string; text: string }> = {
  warm: { path: HEART_PATH, text: '将心注入·将爱注入' },
  green: { path: SPROUT_PATH, text: '我们不做大事·我们只会扎根' },
  dark: { path: MOON_PATH, text: '曾经初心依旧炙热\n庆幸自己未曾退缩' },
}

/** 当前主题对应的话语（页脚复用：入场两行话语用「·」拼成一行） */
export function getMotto(theme: string): string {
  const m = EMBLEMS[theme] ?? EMBLEMS.warm
  return m.text.replace(/\n/g, '·')
}

export default function EntryOverlay({
  theme,
  quote,
  onEnter,
}: {
  theme: string
  quote: string
  onEnter: () => void
}) {
  const [shown, setShown] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const emblem = EMBLEMS[theme] ?? EMBLEMS.warm

  // 挂载后下一帧再开 opacity，让「进场淡入」走 transition（而非 animation），退场才不会被 fill-mode 压住
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleEnter = () => {
    if (leaving) return
    setLeaving(true)
    setTimeout(onEnter, EXIT_MS)
  }
  const enterRef = useRef(handleEnter)
  enterRef.current = handleEnter

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') enterRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const overlayClass = [
    'entry-overlay',
    shown ? 'entry-overlay--shown' : '',
    leaving ? 'entry-overlay--leaving' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={overlayClass}>
      <div className="entry-overlay__inner">
        <div className="entry-overlay__emblem-wrap">
          <svg className="entry-overlay__emblem" viewBox="0 0 24 24" aria-hidden="true">
            <path d={emblem.path} />
          </svg>
        </div>
        <p className="entry-overlay__motto">{emblem.text}</p>
        <p className="entry-overlay__quote">{quote}</p>
        <button type="button" className="entry-overlay__enter" onClick={handleEnter}>
          <svg className="entry-overlay__enter-emblem" viewBox="0 0 24 24" aria-hidden="true">
            <path d={emblem.path} />
          </svg>
          进入
        </button>
      </div>
    </div>
  )
}
