import { Github, Twitter } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 py-10 mt-16">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-300">
        <div>© {new Date().getFullYear()} Axiom UI</div>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-gray-900 dark:hover:text-white flex items-center gap-2"><Github className="h-4 w-4" /> GitHub</a>
          <a href="#" className="hover:text-gray-900 dark:hover:text-white flex items-center gap-2"><Twitter className="h-4 w-4" /> Twitter</a>
        </div>
      </div>
    </footer>
  )
}


