import { useEffect, useState, useCallback } from 'react'
import { fetchHot } from '../api/fetchHot'
import type { HotPlatform } from '../types/hot'
import HotCard from '../components/HotCard'
import TabBar, { type Tab, type TabItem } from '../components/TabBar'
import './Home.css'

export default function Home() {
  const [platforms, setPlatforms] = useState<HotPlatform[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchHot()
      setPlatforms(data)
    } catch {
      setError('数据加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible =
    tab === 'all' ? platforms : platforms.filter((p) => p.source === tab)

  // 标签列表从 platforms 派生：加一个新平台只需在数据源加一份，标签自动多出
  const tabs: TabItem[] = [
    { key: 'all', label: '全部' },
    ...platforms.map((p) => ({ key: p.source, label: p.sourceName })),
  ]

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
        <button className="home-refresh" onClick={load} disabled={loading}>
          {loading ? '刷新中…' : '刷新'}
        </button>
      </header>

      {/* 平台 Tab 筛选 */}
      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {/* 主区域：平台卡片网格 */}
      <main className="home-grid">
        {error && <p className="home-error">{error}</p>}
        {visible.map((p) => (
          <HotCard key={p.source} platform={p} />
        ))}
      </main>

      {/* 页脚：学习项目 / 非商用说明 */}
      <footer className="home-footer">
        学习项目 · 非商用 · 数据来源：各平台公开热榜（当前为 Mock）
      </footer>
    </div>
  )
}
