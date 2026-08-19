import express from 'express'
import cors from 'cors'
import { getCache, setCache } from './utils/cache.js'
import { fetchWeiboHot } from './services/weibo.js'
import { fetchZhihuHot } from './services/zhihu.js'
import { fetchBilibiliHot } from './services/bilibili.js'

// 已接入真实抓取的平台 → 抓取函数；新增平台只需在此加一行
const REAL_FETCHERS = {
  weibo: fetchWeiboHot,
  zhihu: fetchZhihuHot,
  bilibili: fetchBilibiliHot,
}

const app = express()
const PORT = process.env.PORT || 3001
// CORS 来源：兜底 localhost:5173；规范化去尾随空格 + 结尾斜杠。
// 起因：Railway 控制台若填 `https://xxx.vercel.app/`（带尾斜杠），cors 中间件
// 会拿它和浏览器实际发出的 Origin（`https://xxx.vercel.app`，无斜杠）做精确匹配，
// 两者不等 → 浏览器拦掉响应。统一规范化后无论填带不带斜杠都能正确放行。
// 也符合项目铁律：env 值一律 .trim() 后使用。
const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .trim()
  .replace(/\/+$/, '')

// 前端 dev 域名跨域放行（AGENTS.md：Vite 代理 /api -> localhost:3001）
app.use(
  cors({
    origin: CLIENT_ORIGIN,
  })
)

// 请求日志：打印每次请求的方法与路径
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`)
  next()
})

// 平台元数据（sourceName / listName），新增平台只需在此登记。
// 注意：此处仅存展示用元信息，真实数据一律由 REAL_FETCHERS 抓取，绝不内置 Mock 兜底。
const PLATFORMS = {
  weibo: { source: 'weibo', sourceName: '微博', listName: '热搜榜' },
  zhihu: { source: 'zhihu', sourceName: '知乎', listName: '热榜' },
  bilibili: { source: 'bilibili', sourceName: '哔哩哔哩', listName: '热搜' },
}

// 抽取「单平台数据获取」为共享函数，供单平台路由与聚合路由复用。
// 行为：先查缓存（命中直接返回）→ 未命中则生成；已登记 REAL_FETCHERS 的平台（weibo/zhihu/bilibili）走真实抓取，
// 真实抓取失败 → 返回 error 态（不写缓存，便于下次重试）；严格不回退 Mock（即便未登记平台也如实返回错误态，不内置假数据）。
// 开发期可通过 MOCK_FAIL_<平台>=1 注入故障（强制报错，用于验证前端 error 卡片，与“严格不回退”不冲突）。
// 该函数永不 reject，调用方无需再 try/catch。
async function getPlatformData(source, forceRefresh = false) {
  const meta = PLATFORMS[source]
  const cacheKey = `hot:${source}`

  // ── 开发期故障注入（仅本地调试用，生产环境切勿设置）──────────────
  // 设置 MOCK_FAIL_WEIBO=1 / MOCK_FAIL_ZHIHU=1 / MOCK_FAIL_BILIBILI=1 可强制让对应平台
  // "抓取失败"，用于验证前端 error 卡片展示。这是"强制报错"而非"回退假数据"，
  // 与项目"严格不回退"约束不冲突。注入时会跳过缓存（保证每次请求都走错误态）。
  // 注意：env 值可能带尾随空格（如 Windows cmd `set X=1` 会把行尾空格吃进变量），
  // 统一 .trim() 处理，避免 `=== '1'` 判定失败。
  const failFlag = process.env[`MOCK_FAIL_${source.toUpperCase()}`]
  const injectFail = failFlag != null && (failFlag.trim() === '1' || failFlag.trim() === 'true')

  // 1) 非强制刷新且未注入故障时先查缓存
  if (!forceRefresh && !injectFail) {
    const cached = getCache(cacheKey)
    if (cached) {
      console.log(`[cache hit] GET /api/hot/${source}`)
      return cached
    }
  }

  // 2) 未命中（或强制刷新）：生成数据
  const realFetcher = REAL_FETCHERS[source]
  let data
  if (realFetcher) {
    try {
      if (injectFail) {
        // 开发期故障注入：主动抛错，由下方 catch 转成 error 态（不写缓存）
        throw new Error(
          `[DEV] 已通过 MOCK_FAIL_${source.toUpperCase()}=1 注入故障，用于验证前端 error 卡片`
        )
      }
      const items = await realFetcher()
      data = {
        source: meta.source,
        sourceName: meta.sourceName,
        listName: meta.listName,
        updatedAt: new Date().toISOString(),
        items,
      }
    } catch (err) {
      // 抓取失败：返回友好错误态（不写入缓存，便于下次请求重新尝试）
      console.log(`[${source} fetch failed] ${err.message}`)
      return {
        source: meta.source,
        sourceName: meta.sourceName,
        listName: meta.listName,
        updatedAt: new Date().toISOString(),
        error: true,
        items: [],
        message: `${meta.sourceName}热榜暂时获取失败，请稍后点击重试`,
      }
    }
  } else {
    // 平台已在 PLATFORMS 登记但暂未接入真实抓取：如实返回错误态，绝不回退 Mock
    console.log(`[${source} not configured] no real fetcher registered`)
    return {
      source: meta.source,
      sourceName: meta.sourceName,
      listName: meta.listName,
      updatedAt: new Date().toISOString(),
      error: true,
      items: [],
      message: `${meta.sourceName}热榜暂未接入，请稍后配置数据源`,
    }
  }

  setCache(cacheKey, data)
  if (forceRefresh) {
    console.log(`[cache skip] GET /api/hot/${source} (refresh=1, regenerated)`)
  } else {
    console.log(`[cache miss] GET /api/hot/${source} (generated & cached)`)
  }
  return data
}

// 单平台热搜：/api/hot/:source，无效 source 返回 404
// 缓存策略：先查缓存，命中直接返回；未命中则生成数据并写入缓存。
// 支持 ?refresh=1 强制跳过缓存（仅开发用）。
// 微博 / 知乎 / 哔哩哔哩 均走真实抓取（fetchWeiboHot / fetchZhihuHot / fetchBilibiliHot）；抓取失败时返回 error 态且不缓存。
app.get('/api/hot/:source', async (req, res) => {
  const { source } = req.params
  if (!PLATFORMS[source]) {
    res.status(404).json({ error: `未知 platform：${source}` })
    return
  }
  const data = await getPlatformData(source, req.query.refresh === '1')
  res.json(data)
})

// 聚合接口：一次性返回全部平台。
// 逐个调用 getPlatformData（互不阻塞、任一失败不影响其他）；真实抓取失败的平台带 error: true，
// 成功平台正常返回。整包始终 HTTP 200，不整体报错（部分失败隔离）。
app.get('/api/hot', async (_req, res) => {
  const platforms = await Promise.all(
    Object.keys(PLATFORMS).map((key) => getPlatformData(key, false)),
  )
  // 把当前生效的缓存 TTL（秒）透传给前端，用于页脚「更新频率约 × 分钟」展示
  res.json({ platforms, cacheTtl: Number(process.env.CACHE_TTL) || 600 })
})

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (CORS for ${CLIENT_ORIGIN})`)
})
