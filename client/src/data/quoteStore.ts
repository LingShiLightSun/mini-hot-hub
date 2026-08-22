// 金句漂流瓶 · 用户金句存储
//
// 当前为纯前端 localStorage 实现；接口刻意保持「后端就绪」：
// 后续要做「跨设备共享池」（所有人投的句子彼此可见，见设计文档），
// 只需把下面两个函数换成对后端的 fetch 调用，调用方（QuoteBottle / 轮换）无需改动。

const USER_QUOTES_KEY = 'mini-hot-hub:user-quotes'
const MAX_LEN = 120

export function getUserQuotes(): string[] {
  try {
    const raw = localStorage.getItem(USER_QUOTES_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** 投一句进漂流瓶。返回 true=成功投出；空 / 超长 / 与已有重复则 false（不动作）。 */
export function addUserQuote(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (t.length > MAX_LEN) return false
  const list = getUserQuotes()
  if (list.includes(t)) return false // 不重复投同一句，漂流瓶里不堆重样
  list.push(t)
  try {
    localStorage.setItem(USER_QUOTES_KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}
