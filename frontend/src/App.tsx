import { useEffect, useRef, useState } from 'react'


import copy from 'copy-to-clipboard'
import { Menu, X, MoreVertical, Share2, Edit3, Archive, Trash2, User, Settings, LogOut } from 'lucide-react'
import ModelSelector from './components/ModelSelector'
import ErrorBoundary from './components/ErrorBoundary'
import { getApiUrl } from './config'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  ts?: number
}

const apiBase = getApiUrl()

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

function renderMessage(content: string) {
  if (content.includes('<div') || content.includes('<img') || content.includes('<button') || content.includes('<a ')) {
    // If it's HTML content, return it directly without markdown processing
    return content
  }
  
  try {
    // Enhanced markdown rendering with better formatting and spacing
    const enhancedContent = content
      // First, normalize line breaks and ensure proper spacing
      .replace(/\r\n/g, '\n') // Normalize Windows line breaks
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive line breaks to max 2
      .replace(/\n\n/g, '\n\n') // Ensure proper paragraph breaks
      
      // Process code blocks with proper spacing
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
        const language = lang || 'text'
        return `\n\n<pre class="hljs language-${language}"><code class="language-${language}">${code.trim()}</code></pre>\n\n`
      })
      
      // Process inline code with spacing
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      
      // Process headers with proper spacing
      .replace(/^### (.*$)/gm, '\n\n<h3 class="text-lg font-semibold mb-2">$1</h3>\n')
      .replace(/^## (.*$)/gm, '\n\n<h2 class="text-xl font-bold mb-3">$1</h2>\n')
      .replace(/^# (.*$)/gm, '\n\n<h1 class="text-2xl font-bold mb-4">$1</h1>\n')
      
      // Process lists with proper spacing
      .replace(/^- (.*$)/gm, '\n<li class="ml-4 mb-1">$1</li>')
      .replace(/^\d+\. (.*$)/gm, '\n<li class="ml-4 mb-1">$1</li>')
      
      // Process bold and italic text
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      
      // Process blockquotes with spacing
      .replace(/^> (.*$)/gm, '\n\n<blockquote class="border-l-4 border-blue-500 pl-4 italic text-gray-300 my-4">$1</blockquote>\n\n')
      
      // Process horizontal rules with spacing
      .replace(/^---$/gm, '\n\n<hr class="my-6 border-gray-600">\n\n')
      
      // Final paragraph processing with proper spacing
      .replace(/\n\n/g, '</p>\n<p>')
      .replace(/^\s*/, '') // Remove leading whitespace
      .replace(/\s*$/, '') // Remove trailing whitespace
    
    return `<div class="formatted-message"><p>${enhancedContent}</p></div>`
  } catch {
    return content
  }
}

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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

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

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    // You can add file processing logic here if needed
  };

  const handleFileRemove = () => {
    setUploadedFile(null);
  };

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
      // Create FormData if file is uploaded
      let requestBody: string | FormData;
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      if (uploadedFile) {
        const formData = new FormData();
        formData.append('userId', activeId);
        formData.append('message', text);
        formData.append('selectedModel', selectedModel);
        formData.append('file', uploadedFile);
        requestBody = formData;
        delete headers['Content-Type']; // Let browser set content-type for FormData
      } else {
        requestBody = JSON.stringify({ 
          userId: activeId, 
          message: text,
          selectedModel: selectedModel 
        });
      }
      
      const res = await fetch(`${apiBase}/chat`, {
        method: 'POST',
        headers,
        body: requestBody,
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
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <aside className={`${sidebarOpen ? 'flex' : 'hidden'} md:flex md:w-64 lg:w-72 xl:w-80 border-r border-gray-800 flex-col p-4 gap-3 bg-gray-950/95 backdrop-blur-sm transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-50 h-full`}>
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img className="h-8 w-8 rounded logo-icon" src="https://portfolioimageadsfasdf.blob.core.windows.net/applicationphoto/Lahsiv_logo.png" alt="LashivGPT Logo" />
          </button>
          <img className="h-6 logo-wordmark" src="https://portfolioimageadsfasdf.blob.core.windows.net/applicationphoto/lahsiv-font.png" alt="LashivGPT" />
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
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="p-2 rounded-lg hover:bg-gray-800 transition-all duration-200 group border border-gray-700 hover:border-gray-600 sidebar-toggle-btn"
              title={sidebarOpen ? "Close Sidebar" : "Open Sidebar"}
            >
              {sidebarOpen ? (
                <X className="h-4 w-4 text-gray-400 group-hover:text-gray-200 transition-colors" />
              ) : (
                <Menu className="h-4 w-4 text-gray-400 group-hover:text-gray-200 transition-colors" />
              )}
            </button>
            <span className="text-sm md:text-base font-semibold text-gray-200">LashivGPT - DevOps & Cloud</span>
          </div>
          <div className="flex items-center gap-3">
            <ErrorBoundary>
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                disabled={loading}
              />
            </ErrorBoundary>
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
          {/* File Upload Display */}
          {uploadedFile && (
            <div className="max-w-3xl mx-auto mb-3 p-3 bg-gray-900 border border-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-200">{uploadedFile.name}</div>
                    <div className="text-xs text-gray-400">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleFileRemove}
                  className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                  title="Remove file"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            {/* File Upload Button */}
            <label className="cursor-pointer p-2 rounded border border-gray-700 bg-gray-900 hover:bg-gray-800 hover:border-gray-600 transition-colors">
              <input
                type="file"
                className="hidden"
                accept=".pdf,.txt,.md,.csv,.json,.xml,.html,.css,.js,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <svg className="w-5 h-5 text-gray-400 hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </label>
            
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={uploadedFile ? `Ask about ${uploadedFile.name}...` : "Ask about DevOps, Kubernetes, AWS, Azure, GCP, CI/CD, Security..."}
              rows={1}
              className="flex-1 rounded border border-gray-700 bg-gray-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
            />
            {loading ? (
              <button onClick={() => { abortRef.current?.abort(); setLoading(false) }} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600">Stop</button>
            ) : (
              <button onClick={sendMessage} disabled={!input.trim()} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50">Send</button>
            )}
          </div>
          <div className="max-w-3xl mx-auto mt-2 text-xs text-gray-500">
            {uploadedFile ? `File uploaded: ${uploadedFile.name} • ` : ''}Press Enter to send, Shift+Enter for new line.
          </div>
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
