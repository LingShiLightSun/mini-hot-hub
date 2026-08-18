import { useState } from 'react'
import HotCard from '../components/HotCard'
import TabBar, { type Tab, type TabItem } from '../components/TabBar'
import { useHotList } from '../hooks/useHotList'
import { PLATFORM_SOURCES } from '../api/hot'
import './Home.css'

export default function Home() {
  const { platforms, loading, error, cacheTtl, refresh, retrySource, reloading } = useHotList()
  const [tab, setTab] = useState<Tab>('all')

  // 页脚「更新频率」：缓存 TTL（秒）换算成分钟，至少 1 分钟，便于阅读
  const ttlMinutes = Math.max(1, Math.round(cacheTtl / 60))

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
          页面更新频率约 {ttlMinutes} 分钟（接口缓存时间，可由后端 CACHE_TTL 环境变量调整）。
        </p>
        <p className="home-footer__line home-footer__sub">
          如有侵权或违规内容，请联系：lingshiqingshi@qq.com。
        </p>
      </footer>
    </div>
  )
}
