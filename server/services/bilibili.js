// server/services/bilibili.js
// 哔哩哔哩热搜抓取服务（学习 / 演示用途，非官方接口）
//
// ── 数据接口（企业级聚合 API，证书稳定、SLA 完备）──────────────
// 地址：https://uapis.cn/api/v1/misc/hotboard?type=bilibili
// 说明：uapis.cn 维护的公开热榜聚合接口，已封装 40+ 平台（含微博/知乎/B站）。
//       与 weibo.js / zhihu.js 同域名，字段结构一致（list[]），便于统一解析。
//       返回干净的 JSON，免 UA/Referer 校验。
//       本服务只对响应做 JSON.parse，绝不解析 HTML。
//
// ── 历史源变更（学习笔记，便于回溯）─────────────────────
//   v1: server 硬编码 Mock（PLATFORMS.bilibili.items，10 条写死）→ 演示用，非真实数据
//   v2 (当前): uapis.cn/api/v1/misc/hotboard?type=bilibili → 真实抓取
//   通过 env `BILIBILI_API_URL` 可在不改代码的情况下切换到任意备用源
//
// ── 请求头 ──────────────────────────────────────────────
// ⚠️ uapis.cn 免 UA/Referer 校验；保留通用浏览器 UA 作兜底。
//
// ── 解析字段（来自 list[]，接口变更时只改这里）────────────
//   item.title     → title  热门视频标题
//   item.url       → url    视频详情链接（缺失时回退到拼接的 B站 搜索页）
//   item.index     → rank   排名（1-based；缺失时用「数组下标 + 1」兜底）
//   item.hot_value → heat   热度（⚠️ B站 特殊：返回形如 "1456769播放"，带单位后缀，
//                                 故 formatHeat 先剥离非数字字符再格式化为「万/亿」，
//                                 对齐 TECH_DESIGN 的 heat?: string）
//
// ── 返回结构 ──────────────────────────────────────────
//   { rank, title, heat, url }[]
//   严格符合前端 HotPlatform.items 契约（heat 为 string，与 TECH_DESIGN 完全一致）。
//
// ── 失败语义（用户硬约束：绝不降级 mock）───────────────────
//   任何网络层/HTTP/JSON 解析/结构异常都向上 throw，
//   由调用方（路由层）转换为 error 态响应（不缓存），由前端展示重试。

// 与 Mock（PLATFORMS.bilibili.items）保持 10 条对齐（聚合源通常返 50 条，需前端截断体验差，
// 故在数据层统一截到 10 条；未来如要放宽只需改这里）
const ITEM_LIMIT = 10

const BILIBILI_URL =
  process.env.BILIBILI_API_URL || 'https://uapis.cn/api/v1/misc/hotboard?type=bilibili'

// 通用浏览器 UA（uapis.cn 免校验，仅作兜底）
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
}

/**
 * 把 B站 原始热度数值格式化为「万/亿」可读字符串，对齐 TECH_DESIGN 的 heat?: string。
 * ⚠️ B站 的 hot_value 是带单位的字符串（如 "1456769播放"），需先剥离非数字字符再转换；
 *    而微博/知乎 返回的是纯数字字符串（如 "2283814"），本函数对两者均兼容。
 * @param {unknown} raw 原始热度（可能是 "1456769播放" / "2283814" / 缺）
 * @returns {string} 格式化后的热度字符串；无效时返回空串（heat 可选）
 */
function formatHeat(raw) {
  // 先剥离所有非数字、非小数点字符（去掉「播放」等后缀），再转 Number
  const n = Number(String(raw ?? '').replace(/[^\d.]/g, ''))
  if (!Number.isFinite(n) || n <= 0) return ''
  if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '亿'
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.?0+$/, '') + '万'
  return String(n)
}

/**
 * 抓取并解析哔哩哔哩热搜榜。
 * @returns {Promise<{rank:number, title:string, heat:string, url:string}[]>}
 * @throws {Error} 任何网络 / 接口异常都会抛出带清晰原因的错误
 */
export async function fetchBilibiliHot() {
  let res
  try {
    res = await fetch(BILIBILI_URL, { headers: HEADERS })
  } catch (err) {
    // 网络层失败：DNS 解析、连接超时、本机无外网、SSL 证书过期等
    throw new Error(`请求哔哩哔哩热搜接口失败（网络错误）：${err?.message || err}`)
  }

  // HTTP 状态码非 2xx：接口限流 / 网关错误 / 下线等
  if (!res.ok) {
    throw new Error(
      `哔哩哔哩热搜接口返回 HTTP ${res.status} ${res.statusText}，可能接口限流或已下线（可换用其他聚合源）`
    )
  }

  let body
  try {
    body = await res.json()
  } catch {
    // 返回的不是 JSON（很可能是被导流到错误页的 HTML）
    throw new Error(
      '哔哩哔哩热搜接口返回内容不是 JSON，可能被导流到 HTML 页面（本服务不解析 HTML）'
    )
  }

  // 业务层失败：uapis.cn 用 code 表达错误（成功响应无该字段）
  if (body?.code && body.code !== 200) {
    throw new Error(
      `哔哩哔哩热搜接口业务失败：code=${body.code} msg=${body.message ?? '未知'}`
    )
  }

  // 取 list 数组（uapis.cn 标准响应）
  const list = body?.list
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(
      '哔哩哔哩热搜接口响应缺少有效的 list 数组，接口结构可能已变更（预期 { list: [...] }）'
    )
  }

  // 与 Mock（PLATFORMS.bilibili.items）保持 10 条对齐
  // 聚合源通常返 50 条，如不限量前端卡片会被拉得很长，故在数据层统一截断
  const trimmed = list.slice(0, ITEM_LIMIT)

  // 逐条映射成 { rank, title, heat, url }
  return trimmed.map((item, index) => {
    // title：热门视频标题
    const title = item.title ?? item.word ?? item.name ?? ''
    // heat：热度（B站 为 "1456769播放" 带单位，formatHeat 先剥离非数字再格式化为「万/亿」）
    const heat = formatHeat(item.hot_value ?? item.hot ?? item.num ?? 0)
    // url：视频详情链接；缺失时自行拼接 B站 搜索页（keyword 参数，需编码）
    const fallbackUrl =
      'https://www.bilibili.com/search?keyword=' + encodeURIComponent(title)
    const url = item.url ?? item.mobileUrl ?? item.mobil_url ?? item.link ?? fallbackUrl
    // rank：优先用接口的 index 字段，缺失时按下标兜底
    const rank = typeof item.index === 'number' ? item.index : index + 1
    return { rank, title, heat, url }
  })
}
