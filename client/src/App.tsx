import { useEffect, useState, useCallback } from 'react'
import { fetchHot } from './api/fetchHot'
import type { HotPlatform, Source } from './types/hot'
import HotCard from './components/HotCard'
import './App.css'

type Tab = 'all' | Source

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'weibo', label: '微博' },
  { key: 'zhihu', label: '知乎' },
  { key: 'bilibili', label: 'B 站' },
]

function App() {
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

  return (
    <div className="app">
      <header className="header">
        <span className="logo">mini-hot-hub</span>
        <button className="refresh-btn" onClick={load} disabled={loading}>
          {loading ? '刷新中…' : '刷新'}
        </button>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="cards">
        {error && <p className="error">{error}</p>}
        {visible.map((p) => (
          <HotCard key={p.source} platform={p} />
        ))}
      </main>

      <footer className="footer">
        学习项目 · 非商用 · 数据来源：各平台公开热榜（当前为 Mock）
      </footer>
    </div>
  )
}

export default App
