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
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

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

// 各平台热搜 Mock 数据（硬编码 10 条，字段严格符合 TECH_DESIGN 的 HotPlatform 契约）
const WEIBO_HOT = [
  { rank: 1, title: '今日多地迎来入秋首场降雨', url: 'https://s.weibo.com/weibo?q=今日多地迎来入秋首场降雨', heat: '512万' },
  { rank: 2, title: '国产大模型发布最新多模态版本', url: 'https://s.weibo.com/weibo?q=国产大模型发布最新多模态版本', heat: '487万' },
  { rank: 3, title: '今年中秋节放假安排公布', url: 'https://s.weibo.com/weibo?q=今年中秋节放假安排公布', heat: '463万' },
  { rank: 4, title: '新能源汽车下乡补贴政策延续', url: 'https://s.weibo.com/weibo?q=新能源汽车下乡补贴政策延续', heat: '401万' },
  { rank: 5, title: '夏末秋初养生指南冲上热搜', url: 'https://s.weibo.com/weibo?q=夏末秋初养生指南冲上热搜', heat: '388万' },
  { rank: 6, title: '城市夜市经济活力持续回归', url: 'https://s.weibo.com/weibo?q=城市夜市经济活力持续回归', heat: '352万' },
  { rank: 7, title: '年轻人开始流行街区漫步', url: 'https://s.weibo.com/weibo?q=年轻人开始流行街区漫步', heat: '319万' },
  { rank: 8, title: '国产动画电影票房创新高', url: 'https://s.weibo.com/weibo?q=国产动画电影票房创新高', heat: '287万' },
  { rank: 9, title: '高校开学季宿舍好物清单', url: 'https://s.weibo.com/weibo?q=高校开学季宿舍好物清单', heat: '254万' },
  { rank: 10, title: '秋季氛围感穿搭教程走红', url: 'https://s.weibo.com/weibo?q=秋季氛围感穿搭教程走红', heat: '231万' },
]

const ZHIHU_HOT = [
  { rank: 1, title: '如何评价 2026 年国产大模型的多模态进展？', url: 'https://www.zhihu.com/question/1001', heat: '1284万热度' },
  { rank: 2, title: '为什么今年夏天特别热？气象专家解答', url: 'https://www.zhihu.com/question/1002', heat: '962万热度' },
  { rank: 3, title: '新能源车到底值不值得买？真实车主分享', url: 'https://www.zhihu.com/question/1003', heat: '845万热度' },
  { rank: 4, title: '远程办公三年后，我为什么回到了公司', url: 'https://www.zhihu.com/question/1004', heat: '778万热度' },
  { rank: 5, title: '有哪些适合夏天做的低成本运动？', url: 'https://www.zhihu.com/question/1005', heat: '690万热度' },
  { rank: 6, title: '国产动画电影崛起背后有哪些原因？', url: 'https://www.zhihu.com/question/1006', heat: '623万热度' },
  { rank: 7, title: '如何评价某科技公司全员涨薪的决定？', url: 'https://www.zhihu.com/question/1007', heat: '567万热度' },
  { rank: 8, title: '学习编程一定要报班吗？自学经验分享', url: 'https://www.zhihu.com/question/1008', heat: '498万热度' },
  { rank: 9, title: '有哪些能提升幸福感的小家电？', url: 'https://www.zhihu.com/question/1009', heat: '445万热度' },
  { rank: 10, title: '为什么老字号联名越来越火？', url: 'https://www.zhihu.com/question/1010', heat: '401万热度' },
]

const BILIBILI_HOT = [
  { rank: 1, title: '【4K】国产大模型多模态实测对比', url: 'https://www.bilibili.com/search?keyword=大模型实测', heat: '综合 98万' },
  { rank: 2, title: '一口气看完今年夏季运动会高光时刻', url: 'https://www.bilibili.com/search?keyword=运动会高光', heat: '综合 87万' },
  { rank: 3, title: 'UP主实测：40度高温下户外装备测评', url: 'https://www.bilibili.com/search?keyword=高温装备测评', heat: '综合 79万' },
  { rank: 4, title: '国产动画电影幕后制作纪录片', url: 'https://www.bilibili.com/search?keyword=动画幕后', heat: '综合 72万' },
  { rank: 5, title: '新能源车续航实测横评来了', url: 'https://www.bilibili.com/search?keyword=新能源横评', heat: '综合 66万' },
  { rank: 6, title: '十分钟学会夏天低成本居家运动', url: 'https://www.bilibili.com/search?keyword=居家运动', heat: '综合 58万' },
  { rank: 7, title: '科技公司涨薪后员工真实反应', url: 'https://www.bilibili.com/search?keyword=涨薪反应', heat: '综合 51万' },
  { rank: 8, title: '老字号联名款开箱试吃', url: 'https://www.bilibili.com/search?keyword=老字号开箱', heat: '综合 47万' },
  { rank: 9, title: '自学编程一年后的成果展示', url: 'https://www.bilibili.com/search?keyword=自学编程', heat: '综合 42万' },
  { rank: 10, title: '提升幸福感小家电 TOP5', url: 'https://www.bilibili.com/search?keyword=幸福感小家电', heat: '综合 38万' },
]

// 平台元数据 + Mock 数据，新增平台只需在此登记
const PLATFORMS = {
  weibo: { source: 'weibo', sourceName: '微博', listName: '热搜榜', items: WEIBO_HOT },
  zhihu: { source: 'zhihu', sourceName: '知乎', listName: '热榜', items: ZHIHU_HOT },
  bilibili: { source: 'bilibili', sourceName: '哔哩哔哩', listName: '热搜', items: BILIBILI_HOT },
}

// 组装单个平台响应（updatedAt 运行时生成）
function buildPlatform(key) {
  const meta = PLATFORMS[key]
  return {
    source: meta.source,
    sourceName: meta.sourceName,
    listName: meta.listName,
    updatedAt: new Date().toISOString(),
    items: meta.items,
  }
}

// 抽取「单平台数据获取」为共享函数，供单平台路由与聚合路由复用。
// 行为：先查缓存（命中直接返回）→ 未命中则生成；接入真实抓取的平台走 REAL_FETCHERS，
// 未接入的（bilibili）走 Mock；真实抓取失败时返回 error 态（不写缓存，便于下次重试）。
// 该函数永不 reject，调用方无需再 try/catch。
async function getPlatformData(source, forceRefresh = false) {
  const meta = PLATFORMS[source]
  const cacheKey = `hot:${source}`

  // 1) 非强制刷新时先查缓存
  if (!forceRefresh) {
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
    // 未接入真实抓取的平台仍使用 Mock 数据（目前三平台均已接入，此分支作为新增平台的兜底）
    data = buildPlatform(source)
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
  res.json({ platforms })
})

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (CORS for ${CLIENT_ORIGIN})`)
})
