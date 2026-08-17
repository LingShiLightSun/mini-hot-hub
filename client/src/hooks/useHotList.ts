// 热榜数据 Hook — 把「请求状态 + 加载延迟 + 三态」收口在此
// 数据来源由 api/hot.ts 决定：微博走后端 /api/hot/weibo，知乎 B 站走 Mock
import { useCallback, useEffect, useState } from 'react'
import { fetchAllHot } from '../api/hot'
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
      // 模拟 500ms 网络延迟（保留三态 loading 体验；接入真实后端后亦可按需移除）
      await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY))
      const data = await fetchAllHot()
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
