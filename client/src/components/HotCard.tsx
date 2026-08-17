import type { HotPlatform } from '../types/hot'
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
  /** 加载/错误态用来显示平台名（data 为空时回退） */
  sourceName?: string
}

/** 把 ISO 时间格式化为「更新于 今天 09:00」这类友好文本 */
function formatUpdatedAt(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso

  const pad = (n: number) => String(n).padStart(2, '0')
  const hh = pad(d.getHours())
  const mm = pad(d.getMinutes())
  const now = new Date()

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()

  if (sameDay) return `更新于 今天 ${hh}:${mm}`

  const MM = pad(d.getMonth() + 1)
  const DD = pad(d.getDate())
  return `更新于 ${MM}-${DD} ${hh}:${mm}`
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

export default function HotCard({
  loading,
  error,
  data,
  onRetry,
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
            >
              点击重试
            </button>
          )}
        </div>
      ) : data ? (
        data.items.length > 0 ? (
          <ol className="hot-card__list">
            {data.items.map((item) => (
              <li
                key={item.rank}
                className={
                  item.rank <= 3
                    ? `hot-card__item is-rank-${item.rank}`
                    : 'hot-card__item'
                }
              >
                <span className="hot-card__rank">{item.rank}</span>
                <a
                  className="hot-card__title-link"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.title}
                </a>
                {item.heat && (
                  <span className="hot-card__heat">{item.heat}</span>
                )}
              </li>
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
