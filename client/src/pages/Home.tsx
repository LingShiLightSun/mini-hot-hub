import { useEffect, useRef, useState } from 'react'
import HotCard from '../components/HotCard'
import TabBar, { type Tab, type TabItem } from '../components/TabBar'
import { useHotList } from '../hooks/useHotList'
import { PLATFORM_SOURCES } from '../api/hot'
import { getQuoteAt } from '../data/dailyQuotes'
import './Home.css'

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
  const [tab, setTab] = useState<Tab>('all')

  const tabs: TabItem[] = [
    { key: 'all', label: '全部' },
    ...PLATFORM_SOURCES.map((s) => ({ key: s.source, label: s.sourceName })),
  ]

  const visibleSources =
    tab === 'all' ? PLATFORM_SOURCES : PLATFORM_SOURCES.filter((s) => s.source === tab)
  const platformMap = new Map(platforms.map((p) => [p.source, p]))

  return (
    <div className="home">
      {/* 顶栏：站名 + 一句话介绍 + 刷新 */}
      <header className="home-header">
        <div className="home-brand">
          <h1 className="home-title">迷你今日热榜</h1>
          <p className={`home-intro${visible ? '' : ' home-intro--fading'}`}>
            {quote}
          </p>
        </div>
        <button className="home-refresh" onClick={refresh} disabled={loading}>
          {loading ? '刷新中…' : '刷新'}
        </button>
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
          ——将心注入·将爱注入——
        </p>
      </footer>
    </div>
  )
}
