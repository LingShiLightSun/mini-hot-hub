// server/utils/formatHeat.js
// 各平台热度的统一格式化工具（学习 / 演示用途）。
//
// ⚠️ uapis.cn 各平台 hot_value 格式不统一，必须 robust 处理：
//   - 微博 / B站源：纯数字字符串       "1094321"        → "109.4万"
//   - 知乎源：带空格 + 中文后缀        "1602 万热度"    → "1602万"
//   - B站早期版：带"播放"后缀          "1456769播放"    → "145.7万"
//   - 已格式化串（少数场景）            "109.4万"        → "109.4万"（避免重复除法）
// 做法：先剥掉所有非数字字符；如原串已带"万/亿"单位则直接拼回（不重复除以 1e4/1e8）。
//
// 抽成共享模块的原因：weibo / zhihu / bilibili 三个 service 原本各复制了一份完全相同的实现，
// 新增平台时若继续复制会带来「改一处忘改三处」的风险。统一在此维护。

/**
 * 把原始热度格式化为「万/亿」可读字符串，对齐 TECH_DESIGN 的 heat?: string。
 * @param {unknown} raw 原始热度（可能是字符串/数字/缺）
 * @returns {string} 格式化后的热度字符串；无效时返回空串（heat 可选）
 */
export function formatHeat(raw) {
  if (raw == null) return ''
  const s = String(raw).trim()
  if (!s) return ''
  // 抽取出所有数字（含小数点）
  const digits = s.replace(/[^\d.]/g, '')
  if (!digits) return ''

  const n = Number(digits)
  if (!Number.isFinite(n) || n <= 0) return ''

  // 原串已带"亿"或"万"单位 → 直接拼回，不重复除法
  if (/亿/.test(s)) return n.toFixed(2).replace(/\.?0+$/, '') + '亿'
  if (/万/.test(s)) return n.toFixed(1).replace(/\.?0+$/, '') + '万'

  // 否则按纯数字处理
  if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '亿'
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.?0+$/, '') + '万'
  return String(n)
}
