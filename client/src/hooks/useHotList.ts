// 热榜数据 Hook — 把「请求状态 + 500ms 模拟延迟 + 三态」收口在此
// MVP 阶段仍读 mock/hot.json，后续接真实后端时只需改 fetchHot 即可
import { useCallback, useEffect, useState } from 'react'
import { fetchHot } from '../api/fetchHot'
import type { HotPlatform } from '../types/hot'

// 模拟网络延迟（毫秒），仅 MVP mock 阶段使用
const MOCK_DELAY = 500

export interface UseHotListResult {
  platforms: HotPlatform[]
  loading: boolean
  error: string | null
  /** 重新拉取（用于刷新按钮 / 卡片重试） */
  retry: () => void
}

export function useHotList(): UseHotListResult {
  const [platforms, setPlatforms] = useState<HotPlatform[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 模拟 500ms 网络延迟
      await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY))
      const data = await fetchHot()
      setPlatforms(data)
    } catch {
      setError('数据加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { platforms, loading, error, retry: load }
}
