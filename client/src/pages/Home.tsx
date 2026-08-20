import { useCallback, useEffect, useRef, useState } from 'react'
import HotCard from '../components/HotCard'
import TabBar, { type Tab, type TabItem } from '../components/TabBar'
import EntryOverlay, { getMotto, shouldShowEntry } from '../components/EntryOverlay'
import SettingsPanel, { ThemeGlyph, type ThemeKey } from '../components/SettingsPanel'
import { useHotList } from '../hooks/useHotList'
import { useReadHistory } from '../hooks/useReadHistory'
import { PLATFORM_SOURCES } from '../api/hot'
import type { HotItem } from '../types/hot'
import { getQuoteAt } from '../data/dailyQuotes'
import './Home.css'

/** 主题持久化键（与 index.html 内联脚本、SettingsPanel 共用） */
const THEME_KEY = 'mini-hot-hub:theme'
function readTheme(): ThemeKey {
  try {
    const t = localStorage.getItem(THEME_KEY)
    return t === 'green' || t === 'dark' ? t : 'warm'
  } catch {
    return 'warm'
  }
}

// 关闭浏览器自带的滚动恢复，改由我们自己记住位置（文章返回场景更可控）
if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}
const SCROLL_KEY = 'mini-hot-hub:scroll-y'        // 同标签会话内（标准浏览器）
const SCROLL_LS_KEY = 'mini-hot-hub:scroll-save'  // 跨 WebView 重建（微信等内置浏览器常清空 session）
const SCROLL_MAX_AGE = 10 * 60 * 1000             // 仅 10 分钟内恢复，避免隔天/下次全新打开还跳到上次位置

function saveScroll() {
  try {
    const y = window.scrollY
    sessionStorage.setItem(SCROLL_KEY, String(y))
    localStorage.setItem(SCROLL_LS_KEY, JSON.stringify({ y, t: Date.now() }))
  } catch {}
}

function loadScroll(): number {
  try {
    const s = sessionStorage.getItem(SCROLL_KEY)
    if (s) return Number(s) || 0
    const raw = localStorage.getItem(SCROLL_LS_KEY)
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj && typeof obj.y === 'number' && Date.now() - obj.t < SCROLL_MAX_AGE) {
        return obj.y
      }
    }
  } catch {}
  return 0
}

function clearScroll() {
  try {
    sessionStorage.removeItem(SCROLL_KEY)
    localStorage.removeItem(SCROLL_LS_KEY)
  } catch {}
}

// 每 10 分钟一轮的淡入淡出旋转金句：窗口内稳定、跨窗口自动换、每圈重洗不循环
function useRotatingQuote() {
  const quoteRef = useRef('')
  const [quote, setQuote] = useState(() => {
    const q = getQuoteAt(Date.now())
    quoteRef.current = q
    return q
  })
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout> | undefined
    const interval = setInterval(() => {
      const next = getQuoteAt(Date.now())
      if (next === quoteRef.current) return
      setVisible(false) // 轻轻淡出
      fadeTimer = setTimeout(() => {
        quoteRef.current = next
        setQuote(next)
        setVisible(true) // 轻轻淡入
      }, 450)
    }, 15_000)
    return () => {
      clearInterval(interval)
      if (fadeTimer) clearTimeout(fadeTimer)
    }
  }, [])

  return { quote, visible }
}

export default function Home() {
  const { quote, visible } = useRotatingQuote()
  const { platforms, loading, error, refresh, retrySource, reloading } = useHotList()
  const { hidden, records, hide } = useReadHistory()
  const [tab, setTab] = useState<Tab>('all')
  const [showEntry, setShowEntry] = useState(shouldShowEntry)
  const [theme, setTheme] = useState<ThemeKey>(readTheme)
  const [showSettings, setShowSettings] = useState(false)

  // 点击热点 = 已读：写入今日记录（该条从榜上消失；已读即隐藏，无撤销）
  const handleRead = useCallback(
    (item: HotItem, source: string) => {
      hide({
        url: item.url || item.title,
        title: item.title,
        source,
        heat: item.heat,
        time: Date.now(),
      })
    },
    [hide],
  )

  // 主题切换：应用到根节点 data-theme，并持久化（刷新/重开仍保持）
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {}
  }, [theme])

  // 离开 / 切到后台时记住滚动位置（手机端后台标签常被回收，回来会重载到顶部）
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'hidden') saveScroll() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', saveScroll)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', saveScroll)
    }
  }, [])

  // 数据渲染出来后，恢复到离开前的滚动位置（避免从文章返回被打回顶部）
  useEffect(() => {
    if (platforms.length === 0) return
    const y = loadScroll()
    if (!y) return
    const id = requestAnimationFrame(() => {
      window.scrollTo(0, y)
      clearScroll()
    })
    return () => cancelAnimationFrame(id)
  }, [platforms.length])

  const tabs: TabItem[] = [
    { key: 'all', label: '全部' },
    ...PLATFORM_SOURCES.map((s) => ({ key: s.source, label: s.sourceName })),
  ]

  const visibleSources =
    tab === 'all' ? PLATFORM_SOURCES : PLATFORM_SOURCES.filter((s) => s.source === tab)
  const platformMap = new Map(platforms.map((p) => [p.source, p]))

  return (
    <>
      {showEntry && <EntryOverlay theme={theme} onEnter={() => setShowEntry(false)} />}
      {showSettings && (
        <SettingsPanel
          theme={theme}
          onChange={setTheme}
          onClose={() => setShowSettings(false)}
          records={records}
        />
      )}
      <div className="home">
      {/* 顶栏：站名 + 一句话介绍 + 设置 + 刷新 */}
      <header className="home-header">
        <div className="home-brand">
          <h1 className="home-title">迷你今日热榜</h1>
          <p className={`home-intro${visible ? '' : ' home-intro--fading'}`}>
            {quote}
          </p>
        </div>
        <div className="home-actions">
          <button
            className="home-settings"
            type="button"
            aria-label="设置"
            onClick={() => setShowSettings(true)}
          >
            <ThemeGlyph theme={theme} />
          </button>
          <button className="home-refresh" onClick={refresh} disabled={loading}>
            {loading ? '刷新中…' : '刷新'}
          </button>
        </div>
      </header>

      {/* 平台 Tab 筛选 */}
      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {/* 主区域：按三态契约渲染每张 HotCard */}
      <main className="home-grid">
        {visibleSources.map((s) => {
          const p = platformMap.get(s.source)
          const isReloading = reloading[s.source] ?? false
          const cardError = error || (p?.error ? (p.message ?? '该平台数据获取失败') : null)
          return (
            <HotCard
              key={s.source}
              loading={loading}
              reloading={isReloading}
              error={cardError}
              data={p && !p.error ? p : null}
              sourceName={s.sourceName}
              onRetry={() => retrySource(s.source)}
              hiddenUrls={hidden}
              onRead={(item) => handleRead(item, s.sourceName)}
            />
          )
        })}
      </main>

      {/* 页脚：学习项目 / 数据来源 / 更新频率 / 联系/免责声明 */}
      <footer className="home-footer">
        <p className="home-footer__line">
          本站为个人学习项目，仅供学习交流，非商业用途。
        </p>
        <p className="home-footer__line home-footer__sub">
          数据来源于各平台公开信息（第三方聚合接口获取），非官方数据，版权归各平台所有。
        </p>
        <p className="home-footer__line home-footer__sub">
          如有侵权或违规内容，请联系：lingshiqingshi@qq.com。
        </p>
        <p className="home-footer__line home-footer__motto">
          ——{getMotto(theme)}——
        </p>
      </footer>
      </div>
    </>
  )
}
