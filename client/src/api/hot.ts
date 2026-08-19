// 数据获取封装（v2）— 单平台 / 全量，严格「不回退 Mock」
//
// 设计要点（2026-08-17 修订）：
// - 任何平台都必须从后端拿到真实数据；「未接入后端」或「请求失败」都不再静默回退 Mock，
//   而是把问题明确返回（HotPlatform.error=true + 可读 message），由 HotCard 以错误态呈现。
// - fetchHotPlatform(source)：未登记路由 -> 报错「尚未接入后端」；已登记但请求失败 -> 报错「后端错误 / 无法连接」；
//   只有 2xx 且解析成功才返回正常数据。
// - fetchAllHot()：生产环境（配了 VITE_API_BASE）优先试聚合接口 GET /api/hot；
//   其余情况逐平台调用 fetchHotPlatform。

import type { HotPlatform, Source } from '../types/hot'

// 生产环境可配 VITE_API_BASE 指向真实后端域名；开发期为空时走 Vite /api 代理（相对路径）
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

// 已接入后端的平台 -> 路由。新增平台需在此注册，否则前端会以「未接入」错误态呈现。
const BACKEND_ROUTES: Partial<Record<Source, string>> = {
  weibo: '/api/hot/weibo',
  zhihu: '/api/hot/zhihu',
  bilibili: '/api/hot/bilibili',
}

// 平台中文名（仅用于错误态展示，不承载数据）
const SOURCE_LABELS: Record<Source, string> = {
  weibo: '微博',
  zhihu: '知乎',
  bilibili: 'B站',
}

// 平台注册表：由 BACKEND_ROUTES + SOURCE_LABELS 派生的「有哪些平台」单一数据源。
// 首页 Tab、卡片列表、逐平台拉取都从这里取；新增平台只改上面的 BACKEND_ROUTES 即可。
export const PLATFORM_SOURCES: { source: Source; sourceName: string }[] = (
  Object.keys(BACKEND_ROUTES) as Source[]
).map((source) => ({ source, sourceName: SOURCE_LABELS[source] }))

// 构造一个「加载失败」的平台对象，交给 HotCard 以错误态显现
function toErrorPlatform(source: Source, message: string): HotPlatform {
  return {
    source,
    sourceName: SOURCE_LABELS[source],
    listName: '',
    updatedAt: new Date().toISOString(),
    items: [],
    error: true,
    message,
  }
}

/**
 * 拉取单个平台热榜（严格模式：不回退 Mock）。
 * - 未登记后端路由：返回「尚未接入后端数据源」错误。
 * - 已登记但请求失败（网络异常 / 非 2xx）：返回具体错误原因。
 * - 仅请求成功且解析正常时返回真实数据。
 */
export async function fetchHotPlatform(source: Source): Promise<HotPlatform> {
  const route = BACKEND_ROUTES[source]
  if (!route) {
    return toErrorPlatform(source, `平台「${SOURCE_LABELS[source]}」尚未接入后端数据源，无法加载`)
  }
  try {
    const res = await fetch(`${API_BASE}${route}`)
    if (!res.ok) {
      return toErrorPlatform(source, `后端返回错误（HTTP ${res.status}），请稍后重试`)
    }
    return (await res.json()) as HotPlatform
  } catch {
    return toErrorPlatform(source, `无法连接后端（${route}），请确认服务已启动`)
  }
}

export interface HotListResult {
  platforms: HotPlatform[]
  /** 后端当前生效的缓存 TTL（秒），用于页脚「更新频率约 × 分钟」展示 */
  cacheTtl: number
}

/**
 * 拉取全部平台热榜。
 * 生产环境（已配 VITE_API_BASE）优先尝试后端聚合接口 GET /api/hot；
 * 其余情况逐平台调用 fetchHotPlatform（三平台均走后端，任一失败以错误态呈现）。
 * 返回 { platforms, cacheTtl }，cacheTtl 取后端透传值（缺省 600 秒 = 10 分钟）。
 */
export async function fetchAllHot(): Promise<HotListResult> {
  // 优先尝试后端聚合接口 GET /api/hot（开发期经 Vite 代理同样可用；
  // 全页「刷新」按钮即走此路径，对应「重新请求 /api/hot」的诉求）
  try {
    const res = await fetch(`${API_BASE}/api/hot`)
    if (res.ok) {
      // 后端当前契约固定为 { platforms, cacheTtl }；为兼容旧形态（直接返回数组）做双分支。
      // 用 unknown 收住、运行时按形态分派，避免对联合类型直接点属性触发 TS2339。
      const body: unknown = await res.json()
      if (Array.isArray(body)) {
        if (body.length) return { platforms: body as HotPlatform[], cacheTtl: 600 }
      } else if (body && typeof body === 'object') {
        const obj = body as {
          platforms?: HotPlatform[]
          items?: HotPlatform[]
          cacheTtl?: number
        }
        const list = obj.platforms ?? obj.items
        if (list && list.length) {
          return {
            platforms: list,
            cacheTtl: typeof obj.cacheTtl === 'number' ? obj.cacheTtl : 600,
          }
        }
      }
    }
  } catch {
    // 聚合失败：继续走逐平台拉取，各平台会自行以错误态呈现
  }

  // 逐平台拉取兜底：三平台均走后端，任一失败以错误态呈现
  const platforms = await Promise.all(PLATFORM_SOURCES.map((s) => fetchHotPlatform(s.source)))
  return { platforms, cacheTtl: 600 }
}
