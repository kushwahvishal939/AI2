import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

export function useTheme(): [Theme, (t: Theme) => void, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored) return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggle() {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  return [theme, setTheme, toggle]
}


