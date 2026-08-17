// 极简内存缓存：用于缓存热榜接口响应，减轻后端 / 上游压力。
// 进程内存储（非持久化），进程重启即清空——对热榜场景足够。
//
// 约定：
// - 默认 TTL 读取环境变量 CACHE_TTL（秒），未设置时回退 600 秒（10 分钟）。
// - setCache(key, data, ttlSec)：写入时记录过期时间。
// - getCache(key)：命中且未过期返回 data；未命中或已过期返回 undefined，且过期项会被自动删除。

const DEFAULT_TTL = Number(process.env.CACHE_TTL) || 600

// key -> { data, expiresAt(ms 时间戳) }
const store = new Map()

/** 写入缓存。ttlSec 缺省时取 CACHE_TTL 或默认 600 秒 */
export function setCache(key, data, ttlSec = DEFAULT_TTL) {
  const expiresAt = Date.now() + ttlSec * 1000
  store.set(key, { data, expiresAt })
}

/**
 * 读取缓存。
 * @returns {any|undefined} 命中且未过期返回缓存值；否则 undefined（过期项同时被删除）
 */
export function getCache(key) {
  const entry = store.get(key)
  if (!entry) return undefined

  if (entry.expiresAt <= Date.now()) {
    // 过期：自动删除，避免 Map 无限增长
    store.delete(key)
    return undefined
  }

  return entry.data
}
