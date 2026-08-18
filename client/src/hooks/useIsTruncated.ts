import { useLayoutEffect, useRef, useState } from 'react'

/**
 * 检测元素内容是否被 CSS 截断（单行省略 ellipsis 生效）。
 * 用于桌面端标题被 `text-overflow: ellipsis` 省略时，决定是否展示自定义气泡。
 *
 * 原理：单行 nowrap 省略时，`scrollWidth > clientWidth`（完整文字宽 > 可见宽）。
 * 手机端标题自动换行（white-space: normal），不会横向溢出，因此天然不会触发，
 * 但仍用 ResizeObserver 覆盖容器/字体变化，避免 resize 后状态失准。
 */
export function useIsTruncated<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const check = () => {
      const truncated = el.scrollWidth > el.clientWidth + 1
      setIsTruncated(truncated)
    }

    check() // 首次同步检测，避免气泡闪烁
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { ref, isTruncated }
}
