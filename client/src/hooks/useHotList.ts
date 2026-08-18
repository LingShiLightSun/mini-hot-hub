// 热榜数据 Hook — 把「请求状态 + 加载延迟 + 三态」收口在此
// 数据来源由 api/hot.ts 决定：三平台均走后端（/api/hot/:source），任一失败以错误态呈现
import { useCallback, useEffect, useState } from 'react'
import { fetchAllHot, fetchHotPlatform } from '../api/hot'
import type { HotPlatform, Source } from '../types/hot'

// 模拟网络延迟（毫秒），仅 MVP mock 阶段使用
const MOCK_DELAY = 500

export interface UseHotListResult {
  platforms: HotPlatform[]
  loading: boolean
  error: string | null
  /** 后端当前生效的缓存 TTL（秒），用于页脚「更新频率约 × 分钟」展示 */
  cacheTtl: number
  /** 全页刷新：重新请求 /api/hot 聚合接口（对应顶部「刷新」按钮） */
  refresh: () => void
  /** 单平台重试：重新请求该平台接口 /api/hot/:source（对应卡片「点击重试」） */
  retrySource: (source: Source) => void
  /** 各平台独立的「重试中」状态，用于卡片按钮 loading 态 */
  reloading: Partial<Record<Source, boolean>>
}

export function useHotList(): UseHotListResult {
  const [platforms, setPlatforms] = useState<HotPlatform[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cacheTtl, setCacheTtl] = useState(600)
  const [reloading, setReloading] = useState<Partial<Record<Source, boolean>>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 模拟 500ms 网络延迟（保留三态 loading 体验；接入真实后端后亦可按需移除）
      await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY))
      const data = await fetchAllHot()
      setPlatforms(data.platforms)
      setCacheTtl(data.cacheTtl)
    } catch {
      setError('数据加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  // 单平台重试：只重新请求该平台接口，并就地替换该平台数据（不影响其他卡）
  const retrySource = useCallback(async (source: Source) => {
    setReloading((prev) => ({ ...prev, [source]: true }))
    try {
      // fetchHotPlatform 内部已把失败转成 error 态对象（不会 reject），这里只管替换
      const data = await fetchHotPlatform(source)
      setPlatforms((prev) => prev.map((p) => (p.source === source ? data : p)))
    } finally {
      setReloading((prev) => ({ ...prev, [source]: false }))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { platforms, loading, error, cacheTtl, refresh: load, retrySource, reloading }
}
