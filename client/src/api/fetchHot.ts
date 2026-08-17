// 数据获取封装 — 对应 TECH_DESIGN.md 的「数据适配层」
// MVP 策略：未配置 VITE_API_BASE 时读取本地 Mock JSON；配置后走聚合 API
import type { HotPlatform, Source } from '../types/hot'
import mockData from '../mock/hot.json'

const API_BASE = import.meta.env.VITE_API_BASE as string | undefined
// 缓存 TTL（毫秒），默认 600 秒，可用 VITE_CACHE_TTL（秒）配置
const CACHE_TTL = (Number(import.meta.env.VITE_CACHE_TTL) || 600) * 1000

// 内存缓存：Map<source | 'all', { data; expiredAt }>
const cache = new Map<string, { data: HotPlatform[]; expiredAt: number }>()

function isFresh(key: string): boolean {
  const entry = cache.get(key)
  return !!entry && entry.expiredAt > Date.now()
}

/**
 * 拉取全部平台热榜。
 * - 未配置 VITE_API_BASE：返回本地 Mock（带 cache 标记）
 * - 已配置：fetch 聚合 API，失败时降级到 Mock
 */
export async function fetchHot(): Promise<HotPlatform[]> {
  const key = 'all'
  if (isFresh(key)) {
    return cache.get(key)!.data
  }

  let data: HotPlatform[]
  if (!API_BASE) {
    // Mock 模式
    data = mockData as HotPlatform[]
  } else {
    try {
      const res = await fetch(`${API_BASE}/hot`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      data = (await res.json()) as HotPlatform[]
    } catch {
      // 聚合 API 失败，降级 Mock，保证页面可用
      data = mockData as HotPlatform[]
    }
  }

  cache.set(key, { data, expiredAt: Date.now() + CACHE_TTL })
  return data
}

/**
 * 拉取单个平台热榜（后续后端 /api/hot/:source 预留）。
 * MVP 从 fetchHot() 结果中过滤。
 */
export async function fetchHotBySource(source: Source): Promise<HotPlatform | undefined> {
  const all = await fetchHot()
  return all.find((p) => p.source === source)
}
