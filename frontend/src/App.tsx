import { useEffect, useRef, useState } from 'react'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import copy from 'copy-to-clipboard'
import { Menu, X, MoreVertical, Share2, Edit3, Archive, Trash2, User, Settings, LogOut, Brain } from 'lucide-react'
import ModelSelector from './components/ModelSelector'
import CodeEditor from './components/CodeEditor'
import React from 'react'
import ReactDOM from 'react-dom/client'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  ts?: number
}

const apiBase = 'http://localhost:8080/api'

type Conversation = {
  id: string
  title: string
  createdAt: number
  archived?: boolean
}

const CONVOS_KEY = 'conversations'

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVOS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

function saveConversations(convos: Conversation[]) {
  localStorage.setItem(CONVOS_KEY, JSON.stringify(convos))
}

// Add download function to global window object
declare global {
  interface Window {
    downloadImage: (base64: string, filename: string) => void
  }
}

window.downloadImage = function(base64: string, filename: string) {
  const link = document.createElement('a')
  link.href = `data:image/png;base64,${base64}`
  link.download = `${filename}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  highlight: function (str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' + hljs.highlight(str, { language: lang, ignoreIllegals: true }).value + '</code></pre>'
      } catch (__) {}
    }
    const escaped = String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return '<pre class="hljs"><code>' + escaped + '</code></pre>'
  },
})

function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations())
  const [activeId, setActiveId] = useState<string>(() => conversations[0]?.id || '')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash')

  useEffect(() => {
    // bootstrap first conversation if none
    if (conversations.length === 0) {
      const first: Conversation = { id: crypto.randomUUID(), title: 'New chat', createdAt: Date.now() }
      const next = [first]
      setConversations(next)
      saveConversations(next)
      setActiveId(first.id)
      return
    }
    if (!activeId) {
      setActiveId(conversations[0].id)
      return
    }
    fetch(`${apiBase}/history/${activeId}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data?.history)) setMessages(data.history)
        else setMessages([])
      })
      .catch(() => setMessages([]))
  }, [activeId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null)
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const optimistic: ChatMessage = { role: 'user', content: text, ts: Date.now() }
    setMessages(prev => [...prev, optimistic])
    // set title on first message
    setConversations(prev => {
      const updated = prev.map(c => c.id === activeId ? { ...c, title: c.title === 'New chat' ? text.slice(0, 32) : c.title } : c)
      saveConversations(updated)
      return updated
    })
    setLoading(true)
    try {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const res = await fetch(`${apiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: activeId, 
          message: text,
          selectedModel: selectedModel 
        }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Request failed')
      
      // Handle image data if present
      if (data?.imageData) {
        // Store image data globally for download function
        window.downloadImage = function(base64: string, filename: string) {
          const link = document.createElement('a')
          link.href = `data:image/png;base64,${base64}`
          link.download = `${filename}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      }
      
      if (Array.isArray(data?.history)) setMessages(data.history)
      else if (data?.reply) setMessages(prev => [...prev, { role: 'assistant', content: data.reply, ts: Date.now() }])
    } catch (err) {
      if ((err as any)?.name === 'AbortError') {
        // silently ignore aborted requests
      } else {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.', ts: Date.now() }])
      }
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  async function clearHistory() {
    if (!activeId) return
    await fetch(`${apiBase}/history/${activeId}`, { method: 'DELETE' })
    setMessages([])
  }

  function renderMessage(content: string) {
    // Check if content contains HTML tags (like image responses from backend)
    if (content.includes('<div') || content.includes('<img') || content.includes('<button') || content.includes('<a ')) {
      // If it's HTML content, return it directly without markdown processing
      return content
    }
    
    try {
      // Enhanced markdown rendering with better formatting
      const enhancedContent = content
        .replace(/\n\n/g, '\n\n') // Ensure proper paragraph breaks
        .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
          // Enhanced code block formatting
          const language = lang || 'text'
          return `<pre class="hljs language-${language}"><code class="language-${language}">${code.trim()}</code></pre>`
        })
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>') // Inline code
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // Bold text
        .replace(/\*([^*]+)\*/g, '<em>$1</em>') // Italic text
        .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mb-2">$1</h3>') // H3 headers
        .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mb-3">$1</h2>') // H2 headers
        .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>') // H1 headers
        .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>') // List items
        .replace(/^\d+\. (.*$)/gm, '<li class="ml-4">$1</li>') // Numbered list items
        .replace(/\n\n/g, '</p><p>') // Paragraph breaks
      
      return `<div class="formatted-message"><p>${enhancedContent}</p></div>`
    } catch {
      return content
    }
  }

  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    
    const blocks = root.querySelectorAll('pre.hljs')
    blocks.forEach(block => {
      if ((block as HTMLElement).querySelector('.enhanced-code-block')) return
      
      // Create enhanced wrapper
      const wrapper = document.createElement('div')
      wrapper.className = 'enhanced-code-block relative bg-gray-900 border border-gray-700 rounded-lg overflow-hidden mb-4'
      
      // Create header
      const header = document.createElement('div')
      header.className = 'flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700'
      
      // Language indicator
      const language = block.className.match(/language-(\w+)/)?.[1] || 'text'
      const langSpan = document.createElement('span')
      langSpan.className = 'px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded font-mono'
      langSpan.textContent = language.toUpperCase()
      
      // Action buttons
      const actions = document.createElement('div')
      actions.className = 'flex items-center gap-2'
      
      // Edit button
      const editBtn = document.createElement('button')
      editBtn.className = 'p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors'
      editBtn.innerHTML = '✏️'
      editBtn.title = 'Edit Code'
      
      // Copy button
      const copyBtn = document.createElement('button')
      copyBtn.className = 'copy-btn p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors'
      copyBtn.innerHTML = '📋'
      copyBtn.title = 'Copy Code'
      
      // Add event listeners
      editBtn.addEventListener('click', () => {
        const codeElement = block.querySelector('code')
        if (codeElement) {
          const textarea = document.createElement('textarea')
          textarea.value = codeElement.textContent || ''
          textarea.className = 'w-full h-64 bg-gray-900 text-gray-100 font-mono text-sm p-4 rounded border border-gray-600 focus:border-blue-500 focus:outline-none resize-none'
          
          const saveBtn = document.createElement('button')
          saveBtn.className = 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors mt-3'
          saveBtn.textContent = 'Save Changes'
          
          const cancelBtn = document.createElement('button')
          cancelBtn.className = 'px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors mt-3 ml-2'
          cancelBtn.textContent = 'Cancel'
          
          const actionsDiv = document.createElement('div')
          actionsDiv.className = 'flex items-center gap-2 mt-3'
          actionsDiv.appendChild(saveBtn)
          actionsDiv.appendChild(cancelBtn)
          
          // Replace code with textarea
          const codeContainer = document.createElement('div')
          codeContainer.className = 'p-4'
          codeContainer.appendChild(textarea)
          codeContainer.appendChild(actionsDiv)
          
          block.parentNode?.replaceChild(codeContainer, block)
          
          // Event listeners for save/cancel
          saveBtn.addEventListener('click', () => {
            codeElement.textContent = textarea.value
            block.parentNode?.replaceChild(block, codeContainer)
          })
          
          cancelBtn.addEventListener('click', () => {
            block.parentNode?.replaceChild(block, codeContainer)
          })
        }
      })
      
      copyBtn.addEventListener('click', () => {
        const code = (block.querySelector('code')?.textContent) || ''
        if (copy(code)) {
          copyBtn.innerHTML = '✅'
          copyBtn.className = 'copy-btn p-2 text-green-400 bg-green-900/20 rounded transition-colors'
          setTimeout(() => {
            copyBtn.innerHTML = '📋'
            copyBtn.className = 'copy-btn p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors'
          }, 2000)
        }
      })
      
      // Assemble header
      header.appendChild(langSpan)
      actions.appendChild(editBtn)
      actions.appendChild(copyBtn)
      header.appendChild(actions)
      
      // Insert wrapper before block
      block.parentNode?.insertBefore(wrapper, block)
      wrapper.appendChild(header)
      wrapper.appendChild(block)
    })
  }, [messages])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(200, el.scrollHeight) + 'px'
    el.style.overflowY = el.scrollHeight > 200 ? 'auto' : 'hidden'
  }, [input])

  function newChat() {
    const conv: Conversation = { id: crypto.randomUUID(), title: 'New chat', createdAt: Date.now() }
    const next = [conv, ...conversations]
    setConversations(next)
    saveConversations(next)
    setActiveId(conv.id)
    setMessages([])
  }

  function selectConversation(id: string) {
    if (id === activeId) return
    setActiveId(id)
    setMenuOpenId(null)
  }

  function shareConversation(id: string) {
    const conv = conversations.find(c => c.id === id)
    if (!conv) return
    
    const shareData = {
      title: conv.title,
      text: `Check out this conversation: ${conv.title}`,
      url: window.location.href + '?conv=' + id
    }
    
    if (navigator.share) {
      navigator.share(shareData)
    } else {
      // Fallback: copy to clipboard
      copy(shareData.url)
      alert('Conversation link copied to clipboard!')
    }
    setMenuOpenId(null)
  }

  function startRename(id: string) {
    const conv = conversations.find(c => c.id === id)
    if (!conv) return
    setEditingId(id)
    setEditingTitle(conv.title)
    setMenuOpenId(null)
  }

  function saveRename() {
    if (!editingId || !editingTitle.trim()) return
    setConversations(prev => {
      const updated = prev.map(c => c.id === editingId ? { ...c, title: editingTitle.trim() } : c)
      saveConversations(updated)
      return updated
    })
    setEditingId(null)
    setEditingTitle('')
  }

  function cancelRename() {
    setEditingId(null)
    setEditingTitle('')
  }

  function archiveConversation(id: string) {
    setConversations(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, archived: !c.archived } : c)
      saveConversations(updated)
      return updated
    })
    setMenuOpenId(null)
  }

  function deleteConversation(id: string) {
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) return
    
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id)
      saveConversations(updated)
      return updated
    })
    
    // If deleted conversation was active, switch to first available
    if (id === activeId) {
      const remaining = conversations.filter(c => c.id !== id)
      if (remaining.length > 0) {
        setActiveId(remaining[0].id)
      } else {
        newChat()
      }
    }
    setMenuOpenId(null)
  }

  const activeConversations = conversations.filter(c => !c.archived)
  const archivedConversations = conversations.filter(c => c.archived)

  return (
    <div className="h-full w-full flex">
      <aside className={`${sidebarOpen ? 'flex' : 'hidden'} md:flex md:w-64 lg:w-72 xl:w-80 border-r border-gray-800 flex-col p-4 gap-3`}>
        <div className="flex items-center gap-3 mb-2">
          <button onClick={newChat} className="flex items-center gap-3">
            <img className="h-8 w-8 rounded logo-icon" src="https://portfolioimageadsfasdf.blob.core.windows.net/applicationphoto/Lahsiv_logo.png" alt="LahsivGPT Logo" />
          </button>
          <img className="h-6 logo-wordmark" src="https://portfolioimageadsfasdf.blob.core.windows.net/applicationphoto/lahsiv-font.png" alt="LahsivGPT " />
        </div>
        <button onClick={newChat} className="w-full text-left px-3 py-2 rounded bg-gray-900 hover:bg-gray-800">+ New chat</button>
        <div className="mt-2 text-xs text-gray-400">Conversations</div>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {activeConversations.map(c => (
            <div key={c.id} className={`group relative flex items-center rounded border ${c.id === activeId ? 'border-blue-600 bg-gray-900' : 'border-transparent hover:bg-gray-900'}`}>
              <button 
                onClick={() => selectConversation(c.id)} 
                className="flex-1 text-left px-3 py-2 min-w-0"
              >
                <div className="truncate text-sm text-gray-200">{c.title || 'Untitled'}</div>
                <div className="text-[10px] text-gray-500">{new Date(c.createdAt).toLocaleString()}</div>
              </button>
              <button
                onClick={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}
                className="p-1 rounded hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {menuOpenId === c.id && (
                <div ref={menuRef} className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-10 min-w-32">
                  <button onClick={() => shareConversation(c.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 flex items-center gap-2">
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                  <button onClick={() => startRename(c.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 flex items-center gap-2">
                    <Edit3 className="h-4 w-4" /> Rename
                  </button>
                  <button onClick={() => archiveConversation(c.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 flex items-center gap-2">
                    <Archive className="h-4 w-4" /> Archive
                  </button>
                  <button onClick={() => deleteConversation(c.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 flex items-center gap-2 text-red-400">
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
          {archivedConversations.length > 0 && (
            <>
              <div className="mt-4 text-xs text-gray-400">Archived</div>
              {archivedConversations.map(c => (
                <div key={c.id} className="group relative flex items-center rounded border border-transparent hover:bg-gray-900">
                  <button 
                    onClick={() => selectConversation(c.id)} 
                    className="flex-1 text-left px-3 py-2 min-w-0"
                  >
                    <div className="truncate text-sm text-gray-400">{c.title || 'Untitled'}</div>
                    <div className="text-[10px] text-gray-500">{new Date(c.createdAt).toLocaleString()}</div>
                  </button>
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}
                    className="p-1 rounded hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {menuOpenId === c.id && (
                    <div ref={menuRef} className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-10 min-w-32">
                      <button onClick={() => shareConversation(c.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 flex items-center gap-2">
                        <Share2 className="h-4 w-4" /> Share
                      </button>
                      <button onClick={() => startRename(c.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 flex items-center gap-2">
                        <Edit3 className="h-4 w-4" /> Rename
                      </button>
                      <button onClick={() => archiveConversation(c.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 flex items-center gap-2">
                        <Archive className="h-4 w-4" /> Unarchive
                      </button>
                      <button onClick={() => deleteConversation(c.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 flex items-center gap-2 text-red-400">
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <button onClick={clearHistory} className="px-3 py-2 rounded bg-gray-900 hover:bg-gray-800 text-sm">Clear conversation</button>
        </div>
      </aside>
      <div className="flex-1 h-full flex flex-col">
      <header className="border-b border-gray-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded hover:bg-gray-800">
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="text-sm md:text-base font-semibold text-gray-200">LashivGPT - DevOps & Cloud</span>
          </div>
          <div className="flex items-center gap-3">
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              disabled={loading}
            />
            <div className="relative">
              <button 
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm animate-pulse">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900 animate-ping"></div>
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium text-gray-200">User</div>
                  <div className="text-xs text-gray-400">Online</div>
                </div>
              </button>
              {profileMenuOpen && (
                <div ref={profileMenuRef} className="absolute right-0 top-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 min-w-48">
                  <div className="p-3 border-b border-gray-700">
                    <div className="text-sm font-medium text-gray-200">User</div>
                    <div className="text-xs text-gray-400">lahsiv@lahsiv.com</div>
                  </div>
                  <div className="p-1">
                    <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 rounded flex items-center gap-2">
                      <User className="h-4 w-4" /> Profile
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 rounded flex items-center gap-2">
                      <Settings className="h-4 w-4" /> Settings
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 rounded flex items-center gap-2 text-red-400">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main ref={containerRef} className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((m, idx) => (
              <div key={idx} className={`w-full flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`w-full md:w-auto md:max-w-3xl rounded-lg px-4 py-3 ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-100'}`}>
                  {m.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  ) : (
                    <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderMessage(m.content) }} />
                  )}
            </div>
          </div>
        ))}
        {loading && (
              <div className="w-full flex justify-start">
                <div className="rounded-lg px-4 py-3 bg-gray-900 text-gray-400">Thinking…</div>
          </div>
        )}
        <div ref={endRef} />
          </div>
      </main>
        <div className="p-4 border-t border-gray-800 bg-gray-950/70">
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <textarea
              ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
              placeholder="Ask about DevOps, Kubernetes, AWS, Azure, GCP, CI/CD, Security..."
              rows={1}
              className="flex-1 rounded border border-gray-700 bg-gray-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
            />
            {loading ? (
              <button onClick={() => { abortRef.current?.abort(); setLoading(false) }} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600">Stop</button>
            ) : (
              <button onClick={sendMessage} disabled={!input.trim()} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50">Send</button>
            )}
          </div>
          <div className="max-w-3xl mx-auto mt-2 text-xs text-gray-500">Press Enter to send, Shift+Enter for new line.</div>
        </div>
      </div>
      
      {/* Rename Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Rename Conversation</h3>
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveRename()
                if (e.key === 'Escape') cancelRename()
              }}
              className="w-full px-3 py-2 rounded border border-gray-700 bg-gray-900 text-white mb-4"
              placeholder="Enter new title"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={cancelRename} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600">Cancel</button>
              <button onClick={saveRename} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
