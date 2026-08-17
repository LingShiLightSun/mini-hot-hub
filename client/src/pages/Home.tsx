import { useState } from 'react'
import HotCard from '../components/HotCard'
import TabBar, { type Tab, type TabItem } from '../components/TabBar'
import { useHotList } from '../hooks/useHotList'
import { PLATFORM_SOURCES } from '../api/hot'
import './Home.css'

export default function Home() {
  const { platforms, loading, error, retry } = useHotList()
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
          <p className="home-intro">
            一个页面看遍各平台当下最热的事件，省去到处找热度的时间。
          </p>
        </div>
        <button className="home-refresh" onClick={retry} disabled={loading}>
          {loading ? '刷新中…' : '刷新'}
        </button>
      </header>

      {/* 平台 Tab 筛选 */}
      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {/* 主区域：按三态契约渲染每张 HotCard */}
      <main className="home-grid">
        {visibleSources.map((s) => {
          const p = platformMap.get(s.source)
          const cardError = error || (p?.error ? (p.message ?? '该平台数据获取失败') : null)
          return (
            <HotCard
              key={s.source}
              loading={loading}
              error={cardError}
              data={p && !p.error ? p : null}
              sourceName={s.sourceName}
              onRetry={retry}
            />
          )
        })}
      </main>

      {/* 页脚：学习项目 / 非商用 / 数据来源 / 免责声明 */}
      <footer className="home-footer">
        <p className="home-footer__line">
          学习项目 · 仅供学习交流 · 非商用
        </p>
        <p className="home-footer__line home-footer__sub">
          数据来自各平台公开热榜，版权归原平台所有，本页面仅作展示用途（当前为 Mock 数据）
        </p>
      </footer>
    </div>
  )
}
