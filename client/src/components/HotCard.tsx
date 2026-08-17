import type { HotPlatform } from '../types/hot'
import './HotCard.css'

interface HotCardProps {
  /** 单个平台的热榜数据 */
  platform: HotPlatform
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

export default function HotCard({ platform }: HotCardProps) {
  const { sourceName, listName, items, updatedAt, error, message } = platform

  return (
    <section className="hot-card">
      <header className="hot-card__head">
        <h3 className="hot-card__title">
          {sourceName} · {listName}
        </h3>
      </header>

      {error ? (
        <p className="hot-card__error">{message ?? '该平台数据获取失败'}</p>
      ) : (
        <ol className="hot-card__list">
          {items.map((item) => (
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
      )}

      <footer className="hot-card__foot">{formatUpdatedAt(updatedAt)}</footer>
    </section>
  )
}
