import type { HotPlatform, HotItem } from '../types/hot'
import { useIsTruncated } from '../hooks/useIsTruncated'
import './HotCard.css'

interface HotCardProps {
  /** 是否加载中（显示骨架屏） */
  loading?: boolean
  /** 错误信息（非空即进入错误态） */
  error?: string | null
  /** 成功态数据；加载/出错时为 null */
  data?: HotPlatform | null
  /** 错误态「点击重试」回调 */
  onRetry?: () => void
  /** 该平台是否正在重试（按钮显示「重试中…」并禁用） */
  reloading?: boolean
  /** 加载/错误态用来显示平台名（data 为空时回退） */
  sourceName?: string
}

/**
 * 把 ISO 时间格式化为相对友好的「更新于 X 分钟前」文本。
 * 服务端 updatedAt 在缓存期内固定不变，因此这段相对时间也保持稳定——属正常现象。
 */
function formatUpdatedAt(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso

  const diffSec = Math.max(0, (Date.now() - d.getTime()) / 1000)

  if (diffSec < 60) return '刚刚更新'

  const pad = (n: number) => String(n).padStart(2, '0')

  if (diffSec < 3600) {
    return `更新于 ${Math.floor(diffSec / 60)} 分钟前`
  }

  if (diffSec < 86400) {
    return `更新于 ${Math.floor(diffSec / 3600)} 小时前`
  }

  if (diffSec < 86400 * 30) {
    return `更新于 ${Math.floor(diffSec / 86400)} 天前`
  }

  // 超过一个月回退绝对日期
  const MM = pad(d.getMonth() + 1)
  const DD = pad(d.getDate())
  return `更新于 ${MM}-${DD}`
}

/** 加载中的骨架屏占位 */
function HotCardSkeleton() {
  return (
    <div className="hot-card__skeleton" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div className="hot-card__skeleton-row" key={i}>
          <span className="hot-card__skeleton-rank" />
          <span className="hot-card__skeleton-line" />
        </div>
      ))}
    </div>
  )
}

/**
 * 单条热榜条目：桌面端标题被省略时，hover/focus 显示自定义奶黄气泡（完整标题）。
 * 仅当该条标题真正溢出（is-truncated）才显示气泡；未溢出时保留原生 title 作为兜底，避免双 tooltip。
 */
function HotItem({ item }: { item: HotItem }) {
  const { ref, isTruncated } = useIsTruncated<HTMLSpanElement>()
  return (
    <li
      className={
        item.rank <= 3
          ? `hot-card__item is-rank-${item.rank}`
          : 'hot-card__item'
      }
    >
      <span className="hot-card__rank">{item.rank}</span>
      <a
        className={
          isTruncated
            ? 'hot-card__title-link is-truncated'
            : 'hot-card__title-link'
        }
        href={item.url}
        target="_blank"
        rel="noreferrer"
        title={isTruncated ? undefined : item.title}
      >
        <span className="hot-card__title-text" ref={ref}>
          {item.title}
        </span>
        <span className="hot-card__bubble" role="tooltip">
          {item.title}
        </span>
      </a>
      {item.heat && <span className="hot-card__heat">{item.heat}</span>}
    </li>
  )
}

export default function HotCard({
  loading,
  error,
  data,
  onRetry,
  reloading,
  sourceName,
}: HotCardProps) {
  const name = data?.sourceName ?? sourceName ?? '热榜'
  const listName = data?.listName ?? ''

  return (
    <section className="hot-card">
      <header className="hot-card__head">
        <h3 className="hot-card__title">
          {name}
          {listName ? ` · ${listName}` : ''}
        </h3>
      </header>

      {loading ? (
        <HotCardSkeleton />
      ) : error ? (
        <div className="hot-card__state">
          <p className="hot-card__state-msg">{error}</p>
          {onRetry && (
            <button
              className="hot-card__retry"
              type="button"
              onClick={onRetry}
              disabled={reloading}
            >
              {reloading ? '重试中…' : '点击重试'}
            </button>
          )}
        </div>
      ) : data ? (
        data.items.length > 0 ? (
          <ol className="hot-card__list">
            {data.items.map((item) => (
              <HotItem key={item.rank} item={item} />
            ))}
          </ol>
        ) : (
          <div className="hot-card__state">
            <p className="hot-card__state-msg hot-card__state-msg--empty">暂无数据</p>
          </div>
        )
      ) : null}

      <footer className="hot-card__foot">
        {data ? formatUpdatedAt(data.updatedAt) : '—'}
      </footer>
    </section>
  )
}
