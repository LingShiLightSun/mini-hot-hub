import { useEffect, useRef, useState } from 'react'
import type { HotPlatform, HotItem } from '../types/hot'
import { useIsTruncated } from '../hooks/useIsTruncated'
import './HotCard.css'

/**
 * 平台品牌气质（仅用于表头小图标的颜色与首字，小面积点缀，不破坏全站暖底）。
 * 想退回「统一暖色（方案 C）」只需把三行 color 都改成 var 里的摩卡金 #B07D3B。
 */
const PLATFORM_META: Record<string, { initial: string; color: string }> = {
  '微博': { initial: '微', color: '#E08A4E' }, // 暖橙（略加深，白字可读）
  '知乎': { initial: '知', color: '#5E8098' }, // 雾蓝（去饱和、略加深，与暖奶油底更协调，白字对比约 4:1）
  '哔哩哔哩': { initial: 'B', color: '#E78AA6' }, // 柔粉（略加深）
  'B站': { initial: 'B', color: '#E78AA6' }, // 柔粉（与「哔哩哔哩」同色，兼容加载/错误态传来的展示名）
}

/** 展示名映射：把后端返回的「哔哩哔哩」换成更轻的「B站」，三卡表头更齐整 */
const SOURCE_DISPLAY: Record<string, string> = {
  '哔哩哔哩': 'B站',
}

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
  /** 今日已读（隐藏）条目的唯一标识集合：命中则从榜上消失 */
  hiddenUrls?: ReadonlySet<string>
  /** 用户点击标题链接触发（= 已读，记录并隐藏） */
  onRead?: (item: HotItem) => void
}

/** 条目唯一标识：优先链接，空链接回退标题（隐藏/过滤/气泡互斥共用） */
const identityOf = (item: HotItem) => item.url || item.title

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
function HotItem({
  item,
  isOpen,
  onToggle,
  onRead,
}: {
  item: HotItem
  isOpen: boolean
  onToggle: () => void
  onRead?: (item: HotItem) => void
}) {
  const { ref, isTruncated } = useIsTruncated<HTMLSpanElement>()
  const [exiting, setExiting] = useState(false)
  const exitTimerRef = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (exitTimerRef.current !== null) clearTimeout(exitTimerRef.current)
    },
    [],
  )

  // 点击标题：先播一段渐隐+收起动画，再真正调 onRead 让父级隐藏
  // （新标签页已立刻打开，此处只管当前列表的视觉过渡）
  const handleLinkClick = () => {
    if (exiting) return
    setExiting(true)
    exitTimerRef.current = window.setTimeout(() => {
      onRead?.(item)
    }, 420) // 与 CSS height 0.4s 留 20ms 余量，避免动画末尾抖动
  }

  return (
    <li
      className={
        item.rank <= 3
          ? `hot-card__item is-rank-${item.rank}${exiting ? ' is-exiting' : ''}`
          : `hot-card__item${exiting ? ' is-exiting' : ''}`
      }
    >
      <span className="hot-card__rank">{item.rank}</span>
      <div className="hot-card__title-col">
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
          onClick={handleLinkClick}
        >
          <span className="hot-card__title-text" ref={ref}>
            {item.title}
          </span>
        </a>
        {isTruncated && (
          <>
            <button
              type="button"
              className="hot-card__bubble-btn"
              aria-label="展开完整标题"
              aria-expanded={isOpen}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggle()
              }}
            >
              <span aria-hidden="true">⋯</span>
            </button>
            <span
              className={
                isOpen ? 'hot-card__bubble is-open' : 'hot-card__bubble'
              }
              role="tooltip"
            >
              {item.title}
            </span>
          </>
        )}
      </div>
      {item.heat && <span className="hot-card__heat">{item.heat}</span>}
    </li>
  )
}

/** 可见列表：过滤已读(隐藏) → 取满 10 条 → 重编号（数字=当前可见榜序号，永远 1-10 无空号）。
 *  该榜今日已看 40+ 条（约等于底线）时，列表底部浮现「我也是有底线哒～」 */
function ReadList({
  items,
  hiddenUrls,
  openUrl,
  setOpenUrl,
  onRead,
}: {
  items: HotItem[]
  hiddenUrls?: ReadonlySet<string>
  openUrl: string | null
  setOpenUrl: (v: string | null) => void
  onRead?: (item: HotItem) => void
}) {
  const hiddenCount = hiddenUrls
    ? items.filter((it) => hiddenUrls.has(identityOf(it))).length
    : 0
  const visible = items
    .filter((it) => !hiddenUrls?.has(identityOf(it)))
    .slice(0, 10)
    .map((it, i) => ({ ...it, rank: i + 1 }))

  if (visible.length === 0) {
    return (
      <div className="hot-card__state">
        <p className="hot-card__state-msg hot-card__state-msg--empty">
          我也是有底线哒～
        </p>
        <p className="hot-card__state-sub">今天的热点都看完啦，明天再来吧</p>
      </div>
    )
  }

  return (
    <ol className="hot-card__list">
      {visible.map((item) => {
        const id = identityOf(item)
        return (
          <HotItem
            key={id}
            item={item}
            isOpen={openUrl === id}
            onToggle={() => setOpenUrl(openUrl === id ? null : id)}
            onRead={onRead}
          />
        )
      })}
      {hiddenCount >= 40 && (
        <li className="hot-card__list-end" aria-hidden="true">
          今日已看 {hiddenCount} 条，我也是有底线哒～
        </li>
      )}
    </ol>
  )
}

export default function HotCard({
  loading,
  error,
  data,
  onRetry,
  reloading,
  sourceName,
  hiddenUrls,
  onRead,
}: HotCardProps) {
  const [openUrl, setOpenUrl] = useState<string | null>(null)
  const rawName = data?.sourceName ?? sourceName ?? '热榜'

  // 单一气泡互斥：同一时间只让一个标题被「看见、被接住」（将心注入——一次只专注一件事）。
  // 点其它「⋯」/ 点卡片外任意处 / 按 Esc 都会关闭当前气泡。
  useEffect(() => {
    if (openUrl === null) return
    const onDoc = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.hot-card__bubble-btn')) return
      setOpenUrl(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenUrl(null)
    }
    document.addEventListener('click', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [openUrl])
  const name = SOURCE_DISPLAY[rawName] ?? rawName
  const meta =
    PLATFORM_META[rawName] ?? { initial: name.slice(0, 1), color: '#B07D3B' }

  return (
    <section className="hot-card">
      <header className="hot-card__head">
        <span
          className="hot-card__badge"
          style={{ background: meta.color }}
          aria-hidden="true"
        >
          {meta.initial}
        </span>
        <h3 className="hot-card__title">{name}</h3>
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
          <ReadList
            items={data.items}
            hiddenUrls={hiddenUrls}
            openUrl={openUrl}
            setOpenUrl={setOpenUrl}
            onRead={onRead}
          />
        ) : (
          <div className="hot-card__state">
            <p className="hot-card__state-msg hot-card__state-msg--empty">暂无数据</p>
          </div>
        )
      ) : null}

      <footer className="hot-card__foot">
        <span className="hot-card__foot-time">
          {data ? formatUpdatedAt(data.updatedAt) : '—'}
        </span>
        {data?.source === 'bilibili' && (
          <span className="hot-card__foot-hint">
            B站榜单刷新得比较慢，不是不更新哦~
          </span>
        )}
      </footer>
    </section>
  )
}
