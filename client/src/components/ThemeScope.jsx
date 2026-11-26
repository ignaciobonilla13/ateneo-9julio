import { FONT_STACKS } from '@shared/design.js'
import { useLayoutEffect } from 'react'

function paint(node, design) {
  const font = FONT_STACKS[design.font] || FONT_STACKS.modern
  node.style.setProperty('--bg', design.background)
  node.style.setProperty('--card', design.card)
  node.style.setProperty('--text', design.text)
  node.style.setProperty('--accent', design.accent1)
  node.style.setProperty('--accent2', design.accent2)
  node.style.setProperty('--font', font)
  node.style.setProperty('--muted', `color-mix(in srgb, ${design.text} 68%, transparent)`)
  node.style.setProperty('--line', `color-mix(in srgb, ${design.text} 14%, transparent)`)
  node.style.fontFamily = font
  node.style.backgroundColor = design.background
  node.style.color = design.text
}

export function ThemeScope({ design, global = false, className = '', children }) {
  useLayoutEffect(() => {
    if (!global || !design) return undefined
    paint(document.documentElement, design)
    document.documentElement.style.fontSize = `${design.fontScale}%`
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', design.background)
    return () => {
      document.documentElement.style.fontSize = ''
    }
  }, [design, global])

  if (global || !design) return children
  const font = FONT_STACKS[design.font] || FONT_STACKS.modern
  return (
    <div
      className={className}
      style={{
        zoom: (design.fontScale || 100) / 100,
        background: design.background,
        color: design.text,
        fontFamily: font,
        ['--bg']: design.background,
        ['--card']: design.card,
        ['--text']: design.text,
        ['--accent']: design.accent1,
        ['--accent2']: design.accent2,
        ['--font']: font,
        ['--muted']: `color-mix(in srgb, ${design.text} 68%, transparent)`,
        ['--line']: `color-mix(in srgb, ${design.text} 14%, transparent)`,
      }}
    >
      {children}
    </div>
  )
}
