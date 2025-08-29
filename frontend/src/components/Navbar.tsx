import { Moon, Sun } from 'lucide-react'
import { Button } from './ui/button'
import { useTheme } from '../hooks/useTheme'

export function Navbar() {
  const [theme, , toggle] = useTheme()
  return (
    <nav className="w-full border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-950/70 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-gray-900 dark:bg-white" />
          <span className="font-semibold">Axiom</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-gray-600 dark:text-gray-300">
          <a href="#features" className="hover:text-gray-900 dark:hover:text-white">Features</a>
          <a href="#testimonials" className="hover:text-gray-900 dark:hover:text-white">Testimonials</a>
          <a href="#contact" className="hover:text-gray-900 dark:hover:text-white">Contact</a>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggle}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </nav>
  )
}
