import { useLayoutEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react'
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
  /** 全局唯一激活气泡的复合键（sourceKey::id）；跨平台共享，同一时刻最多一个 */
  activeBubble?: string | null
  /** 切换/关闭全局气泡 */
  onBubbleChange?: (v: string | null) => void
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
 * 单条热榜条目：标题被省略时提供「完整标题气泡」。
 * - 桌面（hover 设备）：hover/focus 显示气泡；未溢出时保留原生 title 兜底，避免双 tooltip。
 * - 手机（无 hover）：长标题改用「两次点击」——第一次点亮气泡预览，第二次才进入界面（见 handleLinkClick）。
 */
function HotItem({
  item,
  dataKey,
  isOpen,
  onToggle,
  onRead,
}: {
  item: HotItem
  dataKey: string
  isOpen: boolean
  onToggle: () => void
  onRead?: (item: HotItem) => void
}) {
  const { ref, isTruncated } = useIsTruncated<HTMLSpanElement>()

  // 点击标题：
  // - 桌面（hover 设备）：hover 时已预览过气泡，点击即「进入界面」并标记已读隐藏。
  // - 手机（无 hover）：长标题改用「两次点击」——第一次点亮气泡预览，第二次才进入界面。
  //   这样不再需要标题右侧那个「⋯」按钮（否则会和末尾 CSS 截断的「…」叠成两个省略号，手机端很冲突），
  //   也回到了最早的交互设想。短标题无需预览，一次点击直接进入。
  // 已读隐藏后，列表补位由 ReadList 的 FLIP 动画接手（平滑上移 + 第 11 名滑入），不再做 height 收缩。
  const handleLinkClick = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    const isTouch = window.matchMedia('(hover: none)').matches
    if (isTouch && isTruncated && !isOpen) {
      e.preventDefault() // 第一次只预览，不跳转、不标记已读
      onToggle()
      return
    }
    // 进入界面（新标签已立刻打开）；已读隐藏交给父级，列表用 FLIP 平滑补位
    onRead?.(item)
  }

  return (
    <li
      className={
        item.rank <= 3 ? `hot-card__item is-rank-${item.rank}` : 'hot-card__item'
      }
      data-key={dataKey}
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
          aria-expanded={isTruncated ? isOpen : undefined}
          onMouseDown={(e) => e.preventDefault()} /* 阻止点击抢焦点引发的页面滚动（"跳到标题"的来源），键盘 Tab 聚焦不受影响 */
          onClick={handleLinkClick}
        >
          <span className="hot-card__title-text" ref={ref}>
            {item.title}
          </span>
        </a>
        {isTruncated && (
          <span
            className={
              isOpen ? 'hot-card__bubble is-open' : 'hot-card__bubble'
            }
            role="tooltip"
          >
            {item.title}
          </span>
        )}
      </div>
      {item.heat && <span className="hot-card__heat">{item.heat}</span>}
    </li>
  )
}

/** 可见列表：过滤已读(隐藏) → 取满 10 条 → 重编号（数字=当前可见榜序号，永远 1-10 无空号）。
 *  该榜今日已看 40+ 条（约等于底线）时，列表底部浮现「我也是有底线哒～」
 *
 * 气泡状态（activeBubble）由 Home 持有，跨三平台共享——同一时刻全局只有一个气泡；
 * 在某个平台点亮气泡后，去另一平台点出气泡，前一个会自动收起（人眼一次只看一个）。
 * 已读隐藏后，用 FLIP（Web Animations API）让剩余条目平滑上移、第 11 名轻轻滑入，
 * 不再做 height 收缩，避免「列表先变短再变长」的突兀感。 */
function ReadList({
  items,
  sourceKey,
  hiddenUrls,
  activeBubble,
  onBubbleChange,
  onRead,
}: {
  items: HotItem[]
  sourceKey: string
  hiddenUrls?: ReadonlySet<string>
  activeBubble: string | null
  onBubbleChange: (v: string | null) => void
  onRead?: (item: HotItem) => void
}) {
  const hiddenCount = hiddenUrls
    ? items.filter((it) => hiddenUrls.has(identityOf(it))).length
    : 0
  const visible = items
    .filter((it) => !hiddenUrls?.has(identityOf(it)))
    .slice(0, 10)
    .map((it, i) => ({ ...it, rank: i + 1 }))

  // FLIP：列表因已读隐藏而重排时，对位移的条目做 translateY 补间，新进入的第 11 名从下方淡入。
  const listRef = useRef<HTMLOListElement>(null)
  const prevPos = useRef<Map<string, number>>(new Map())
  const firstRun = useRef(true)
  useLayoutEffect(() => {
    const ul = listRef.current
    if (!ul) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // 用「相对列表容器」的 top，而非视口 top：这样页面滚动（如点击标题时浏览器的焦点滚动）
    // 不会污染位移差，避免所有条目被当成「重排」一起滑动（之前「乱滑一会」的根因）。
    const listTop = ul.getBoundingClientRect().top
    const nodes = Array.from(ul.querySelectorAll<HTMLElement>('.hot-card__item'))
    const next = new Map<string, number>()
    for (const n of nodes) {
      const key = n.dataset.key as string
      const top = n.getBoundingClientRect().top - listTop
      next.set(key, top)
      if (firstRun.current || reduce) continue
      const prev = prevPos.current.get(key)
      if (prev == null) {
        // 新进入（如第 11 名补位）：从下方轻轻滑入
        n.animate(
          [
            { transform: 'translateY(12px)', opacity: 0.35 },
            { transform: 'translateY(0)', opacity: 1 },
          ],
          { duration: 360, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' },
        )
      } else if (prev !== top) {
        // 已存在条目：从旧位置滑到新位置
        const dy = prev - top
        n.animate(
          [
            { transform: `translateY(${dy}px)` },
            { transform: 'translateY(0)' },
          ],
          { duration: 360, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' },
        )
      }
    }
    firstRun.current = false
    prevPos.current = next
  }, [visible])

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
    <ol className="hot-card__list" ref={listRef}>
      {visible.map((item) => {
        const id = identityOf(item)
        const bubbleKey = `${sourceKey}::${id}`
        return (
          <HotItem
            key={id}
            dataKey={bubbleKey}
            item={item}
            isOpen={activeBubble === bubbleKey}
            onToggle={() =>
              onBubbleChange(activeBubble === bubbleKey ? null : bubbleKey)
            }
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
  activeBubble,
  onBubbleChange,
}: HotCardProps) {
  const rawName = data?.sourceName ?? sourceName ?? '热榜'
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
            sourceKey={rawName}
            hiddenUrls={hiddenUrls}
            activeBubble={activeBubble ?? null}
            onBubbleChange={onBubbleChange ?? (() => {})}
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
