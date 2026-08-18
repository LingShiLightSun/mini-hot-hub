// server/utils/sortByHeatDesc.js
// 通用工具：把「已解析好的中间热榜数组」按原始热度数值降序排序、截断、重排 rank。
//
// ⚠️ 背景（真实踩坑）：uapis.cn 的 list[] 不保证按热度降序
//   （B站 曾出现第 8 名 585.7万、第 10 名 550.1万 被排在末尾）。
//   直接 slice().map() 会照抄原始乱序 → rank 与热度不符。必须主动排序。
//
// 入参 items：每项形如 { title, heat, url, _heatRaw }
//   - _heatRaw：原始热度「数值」（已剥非数字字符的 Number），仅用于排序；
//               非数字 / 缺失归 0 → 排到末尾。其它字段直接透传给输出。
// 返回：按 _heatRaw 降序、截取前 limit 名、rank 重排为 1..n、且**不含 _heatRaw** 的干净数组。
//
// ⚠️ 致命坑：排序必须用原始数值 _heatRaw，不能用已格式化的字符串 "585.7万"
//   （字符串排序比字头，"5" 开头反而比 "1"/"6" 小，会全乱）。
//
// 用法（见各 services/*.js）：
//   const mapped = list.map(item => ({ title, heat, url, _heatRaw: Number(...) }))
//   return sortByHeatDesc(mapped, ITEM_LIMIT)

/**
 * 按原始热度数值降序排序 + 截断 + 重排 rank。
 * @param {{title:string, heat:string, url:string, _heatRaw?:number}[]} items
 * @param {number} [limit=10] 截取前 N 名
 * @returns {{rank:number, title:string, heat:string, url:string}[]}
 */
export function sortByHeatDesc(items, limit = 10) {
  // 浅拷贝后排序，不修改入参数组
  const sorted = [...items].sort((a, b) => (b._heatRaw || 0) - (a._heatRaw || 0))
  return sorted.slice(0, limit).map((item, index) => ({
    rank: index + 1,
    title: item.title,
    heat: item.heat,
    url: item.url,
  }))
}
