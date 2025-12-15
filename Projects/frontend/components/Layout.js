import React, { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { authFetch } from '../lib/auth'

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState(null)
  // initialize theme synchronously from localStorage to avoid flash of incorrect background
  const [theme, setTheme] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('theme') || 'light'
        if (saved === 'dark') document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
        return saved
      }
    } catch (e) { }
    return 'light'
  })

  useEffect(() => {
    // attempt to load basic user info from /api/me
    authFetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(setUser).catch(() => { })
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try { localStorage.setItem('theme', next) } catch (e) { }
    if (next === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900">
      <Sidebar collapsed={collapsed} user={user} />
      <div className="flex-1 flex flex-col">
        <Header onToggleSidebar={() => setCollapsed(s => !s)} collapsed={collapsed} user={user} theme={theme} onToggleTheme={toggleTheme} />
        <main className="p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
