// 数据类型定义 — 严格对应 TECH_DESIGN.md 的数据模型契约

/** 热点条目 */
export interface HotItem {
  /** 排名，从 1 开始 */
  rank: number
  /** 标题 */
  title: string
  /** 跳转链接 */
  url: string
  /** 热度（可选，各平台格式不一，统一用字符串） */
  heat?: string
}

/** 平台来源标识 */
export type Source = 'weibo' | 'zhihu' | 'bilibili'

/** 单个平台的热榜数据（接口响应统一契约） */
export interface HotPlatform {
  /** 平台来源标识：weibo | zhihu | bilibili */
  source: Source
  /** 平台中文名：微博 */
  sourceName: string
  /** 榜单名：热搜榜 */
  listName: string
  /** 更新时间 ISO 8601 */
  updatedAt: string
  /** 热点条目列表 */
  items: HotItem[]
  /** 该平台数据是否拉取失败 */
  error?: boolean
  /** 失败时的提示信息 */
  message?: string
}
