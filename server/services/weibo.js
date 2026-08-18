import { formatHeat } from '../utils/formatHeat.js'
import { sortByHeatDesc } from '../utils/sortByHeatDesc.js'

// server/services/weibo.js
// 微博热搜抓取服务（学习 / 演示用途，非官方接口）
//
// ── 数据接口（企业级聚合 API，证书稳定、SLA 完备）──────────────
// 地址：https://uapis.cn/api/v1/misc/hotboard?type=weibo
// 说明：uapis.cn 维护的公开热榜聚合接口，已封装 40+ 平台（含微博/知乎/B站）。
//       同一域名可同时拿 weibo/zhihu/bilibili，未来接入其他平台也无需换源。
//       返回干净的 JSON，免 UA/Referer 校验。
//       本服务只对响应做 JSON.parse，绝不解析 HTML。
//
// ── 历史源变更（学习笔记，便于回溯）─────────────────────
//   v1: weibo.com/ajax/side/hotSearch     → 403（被官方反爬）
//   v2: api.vvhan.com/api/hotlist/wbHot   → 证书过期（SEC_E_CERT_EXPIRED）
//   v3: api-hot.imsyy.top/weibo           → 用户本机 fetch failed（具体原因待 curl 诊断）
//   v4 (当前): uapis.cn/api/v1/misc/hotboard?type=weibo
//   通过 env `WEIBO_API_URL` 可在不改代码的情况下切换到任意备用源
//
// ── 请求头 ──────────────────────────────────────────────
// ⚠️ uapis.cn 免 UA/Referer 校验；保留通用浏览器 UA 作兜底。
//
// ── 解析字段（来自 list[]，接口变更时只改这里）────────────
//   item.title     → title  热搜词（标题）
//   item.hot_value → heat   热度（格式化为「万/亿」string，对齐 TECH_DESIGN heat?: string）
//   item.url       → url    详情链接（缺失时回退到拼接的微博搜索页）
//   item.index     → rank   排名（1-based；缺失时用「数组下标 + 1」兜底）
//
// ── 返回结构 ──────────────────────────────────────────
//   { rank, title, heat, url }[]
//   严格符合前端 HotPlatform.items 契约。
//
// ── 失败语义（用户硬约束：绝不降级 mock）───────────────────
//   任何网络层/HTTP/JSON 解析/结构异常都向上 throw，
//   由调用方（路由层）转换为 error 态响应（不缓存），由前端展示重试。

// 与 Mock（PLATFORMS.weibo.items）保持 10 条对齐（聚合源通常返 50 条，需前端截断体验差，
// 故在数据层统一截到 10 条；未来如要放宽只需改这里）
const ITEM_LIMIT = 10

const WBHOT_URL =
  process.env.WEIBO_API_URL || 'https://uapis.cn/api/v1/misc/hotboard?type=weibo'

// 通用浏览器 UA（uapis.cn 免校验，仅作兜底）
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
}

/**
 * 抓取并解析微博热搜榜。
 * @returns {Promise<{rank:number, title:string, heat:string, url:string}[]>}
 * @throws {Error} 任何网络 / 接口异常都会抛出带清晰原因的错误
 */
export async function fetchWeiboHot() {
  let res
  try {
    res = await fetch(WBHOT_URL, { headers: HEADERS })
  } catch (err) {
    // 网络层失败：DNS 解析、连接超时、本机无外网、SSL 证书过期等
    throw new Error(`请求微博热搜接口失败（网络错误）：${err?.message || err}`)
  }

  // HTTP 状态码非 2xx：接口限流 / 网关错误 / 下线等
  if (!res.ok) {
    throw new Error(
      `微博热搜接口返回 HTTP ${res.status} ${res.statusText}，可能接口限流或已下线（可换用其他聚合源）`
    )
  }

  let body
  try {
    body = await res.json()
  } catch {
    // 返回的不是 JSON（很可能是被导流到错误页的 HTML）
    throw new Error(
      '微博热搜接口返回内容不是 JSON，可能被导流到 HTML 页面（本服务不解析 HTML）'
    )
  }

  // 业务层失败：uapis.cn 用 code 表达错误（成功响应无该字段）
  if (body?.code && body.code !== 200) {
    throw new Error(
      `微博热搜接口业务失败：code=${body.code} msg=${body.message ?? '未知'}`
    )
  }

  // 取 list 数组（uapis.cn 标准响应）
  const list = body?.list
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(
      '微博热搜接口响应缺少有效的 list 数组，接口结构可能已变更（预期 { list: [...] }）'
    )
  }

  // ── 排序策略 ────────────────────────────────────────────
  // uapis.cn 的 list[] 不保证按热度降序（B站 曾踩坑）。为让 rank 1..10 真正反映热度榜，
  // 先 map 出含 _heatRaw（原始热度数值，仅用于排序）的中间数组，再交给 sortByHeatDesc
  // 按数值降序排、截断前 ITEM_LIMIT 名、重排 rank 1..n。
  const mapped = list.map((item) => {
    // title：热搜词
    const title = item.title ?? item.word ?? item.name ?? ''
    // heat：热度数值（统一格式化为「万/亿」对齐 TECH_DESIGN heat?: string）
    const heat = formatHeat(item.hot_value ?? item.hot ?? item.num ?? 0)
    // url：详情链接；缺失时自行拼接微博搜索页（#标题# 需编码）
    const fallbackUrl =
      'https://s.weibo.com/weibo?q=' + encodeURIComponent('#' + title + '#')
    const url = item.url ?? item.mobileUrl ?? item.mobil_url ?? item.link ?? fallbackUrl
    // _heatRaw：原始热度数值，仅用于排序；非数字/缺失归 0 → 排到末尾
    const _heatRaw = Number(
      String(item.hot_value ?? item.hot ?? item.num ?? 0).replace(/[^\d.]/g, '')
    )
    return { title, heat, url, _heatRaw: Number.isFinite(_heatRaw) ? _heatRaw : 0 }
  })

  return sortByHeatDesc(mapped, ITEM_LIMIT)
}
