// 数据获取封装（v3）— 前端直连 uapis.cn 聚合源，就地归一化为 HotPlatform
//
// 设计要点（2026-08-19 方案 B）：
// - 此前前端经自建 Express 后端（Railway，海外）取数，大陆访问被 RST → 三卡空。
// - 实测 uapis.cn 的 CORS 为反射型（允许任意域名跨域直连）、域名在中国，
//   故改为前端直接 fetch uapis.cn，链路全程走国内，彻底规避 RST。
// - 严格「不回退 Mock」：任一平台拉取失败 / 结构异常 → 返回 error 态
//   （HotPlatform.error=true + 温柔 message），由 HotCard 以错误态呈现。
// - 归一化逻辑从后端 services/*.js 平移到此处：取 list → 按热度数值降序排序 →
//   截足量条数（uapis.cn 单平台约 50 条，保留用于「已读即隐藏」后的第 11 名补位）→
//   重排 rank 1..n → 包成 { source, sourceName, listName, items }。
// - 卡片层（HotCard）再做「过滤已读 + 取满 10 条 + 重编号」展示，真实排名只在数据层保留。

import type { HotPlatform, Source } from '../types/hot'

// uapis.cn 公开热榜聚合接口（国内可达、CORS 反射型允许跨域直连）
const UAPIS_BASE = 'https://uapis.cn/api/v1/misc/hotboard'

// 平台 → uapis.cn 的 type 参数（新增平台只需在此加一行）
const SOURCE_TO_TYPE: Record<Source, string> = {
  weibo: 'weibo',
  zhihu: 'zhihu',
  bilibili: 'bilibili',
}

// 平台展示元信息（uapis.cn 响应只给 type，sourceName/listName 由前端补）
const SOURCE_META: Record<Source, { sourceName: string; listName: string }> = {
  weibo: { sourceName: '微博', listName: '热搜榜' },
  zhihu: { sourceName: '知乎', listName: '热榜' },
  bilibili: { sourceName: 'B站', listName: '热搜' },
}

// 平台注册表：首页 Tab、卡片列表、逐平台拉取都从这里取；新增平台只改上面两处。
export const PLATFORM_SOURCES: { source: Source; sourceName: string }[] = (
  Object.keys(SOURCE_META) as Source[]
).map((source) => ({ source, sourceName: SOURCE_META[source].sourceName }))

// 数据层保留足量条目：卡片「已读即隐藏」后需要后面的名次补位（第 11 名及以后）
const ITEM_LIMIT = 50

/** 把原始热度格式化为「万/亿」可读串（对齐后端 formatHeat 行为） */
function formatHeat(raw: unknown): string {
  if (raw == null) return ''
  const s = String(raw).trim()
  if (!s) return ''
  const digits = s.replace(/[^\d.]/g, '')
  if (!digits) return ''
  const n = Number(digits)
  if (!Number.isFinite(n) || n <= 0) return ''
  if (/亿/.test(s)) return n.toFixed(2).replace(/\.?0+$/, '') + '亿'
  if (/万/.test(s)) return n.toFixed(1).replace(/\.?0+$/, '') + '万'
  if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '亿'
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.?0+$/, '') + '万'
  return String(n)
}

/** 按原始热度数值降序排序 + 截足量 + 重排 rank（展示位次由卡片层重编号） */
function sortByHeatDesc(
  items: { title: string; heat: string; url: string; _heatRaw: number }[],
): { rank: number; title: string; heat: string; url: string }[] {
  const sorted = [...items].sort((a, b) => b._heatRaw - a._heatRaw)
  return sorted.slice(0, ITEM_LIMIT).map((item, index) => ({
    rank: index + 1,
    title: item.title,
    heat: item.heat,
    url: item.url,
  }))
}

/** uapis.cn 返回的单个热榜条目（仅取我们用到的字段） */
interface RawItem {
  title?: string
  word?: string
  name?: string
  hot_value?: unknown
  hot?: unknown
  num?: unknown
  url?: string
  mobileUrl?: string
  mobil_url?: string
  link?: string
  index?: number
}

// 构造一个「加载失败」的平台对象，交给 HotCard 以错误态显现
function toErrorPlatform(source: Source, message: string): HotPlatform {
  return {
    source,
    sourceName: SOURCE_META[source].sourceName,
    listName: SOURCE_META[source].listName,
    updatedAt: new Date().toISOString(),
    items: [],
    error: true,
    message,
  }
}

/** 拉取失败时统一的温柔提示（TODO-7 整改成果） */
const FETCH_FAILED_MSG = '热榜数据暂时拉不到，过会儿再来看看～'

/**
 * 拉取单个平台热榜（严格模式：不回退 Mock）。
 * 直连 uapis.cn，失败 / 结构异常一律以 error 态返回。
 */
export async function fetchHotPlatform(source: Source): Promise<HotPlatform> {
  const url = `${UAPIS_BASE}?type=${SOURCE_TO_TYPE[source]}`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      return toErrorPlatform(source, FETCH_FAILED_MSG)
    }
    const body = (await res.json()) as { list?: unknown; update_time?: string }
    const list = body?.list
    if (!Array.isArray(list) || list.length === 0) {
      return toErrorPlatform(source, FETCH_FAILED_MSG)
    }
    const meta = SOURCE_META[source]
    const mapped = (list as RawItem[]).map((item) => {
      const title = item.title ?? item.word ?? item.name ?? ''
      const heat = formatHeat(item.hot_value ?? item.hot ?? item.num ?? 0)
      const fallbackUrl =
        'https://s.weibo.com/weibo?q=' + encodeURIComponent('#' + title + '#')
      const url =
        item.url ??
        item.mobileUrl ??
        item.mobil_url ??
        item.link ??
        (source === 'weibo' ? fallbackUrl : '')
      const _heatRaw = Number(
        String(item.hot_value ?? item.hot ?? item.num ?? 0).replace(/[^\d.]/g, ''),
      )
      return {
        title,
        heat,
        url,
        _heatRaw: Number.isFinite(_heatRaw) ? _heatRaw : 0,
      }
    })
    return {
      source,
      sourceName: meta.sourceName,
      listName: meta.listName,
      // 用上游真实的 update_time（完整 ISO 时间戳），不用本端 fetch 时间：
      // 数据源本身有快慢——B站上游约每小时才刷新一次，显示「N 分钟前」是事实，
      // 不应伪装成「刚刚更新」欺骗用户（违背 PRD「诚实」原则 P3）。
      // 对于较慢的平台，由 HotCard 底部小字温柔提示「不是不更新哦~」，
      // 既真实，又有人味，更贴合「将心注入、将爱注入」的定位。
      updatedAt: body.update_time ?? new Date().toISOString(),
      items: sortByHeatDesc(mapped),
    }
  } catch {
    return toErrorPlatform(source, FETCH_FAILED_MSG)
  }
}

export interface HotListResult {
  platforms: HotPlatform[]
  /** 名义更新频率（秒），用于页脚「更新频率约 × 分钟」展示 */
  cacheTtl: number
}

/**
 * 拉取全部平台热榜：三平台并行直连 uapis.cn，任一失败以 error 态呈现，互不阻塞。
 */
export async function fetchAllHot(): Promise<HotListResult> {
  const platforms = await Promise.all(
    PLATFORM_SOURCES.map((s) => fetchHotPlatform(s.source)),
  )
  return { platforms, cacheTtl: 600 }
}
