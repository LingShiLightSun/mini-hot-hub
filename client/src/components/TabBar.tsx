import type { Source } from '../types/hot'
import './TabBar.css'

/** 当前选中的标签：全部 / 某个平台 */
export type Tab = 'all' | Source

/** 单个标签项 */
export interface TabItem {
  key: Tab
  label: string
}

interface TabBarProps {
  /** 标签列表（通常含「全部」+ 各平台） */
  tabs: TabItem[]
  /** 当前选中项 */
  active: Tab
  /** 切换回调 */
  onChange: (key: Tab) => void
}

/** 顶部分类标签栏：定义一次，按数据复用 */
export default function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <nav className="tab-bar">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`tab-bar__item ${active === t.key ? 'is-active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
