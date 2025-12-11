import React, { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState(null)
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    // load theme from localStorage
    try {
      const saved = localStorage.getItem('theme') || 'light'
      setTheme(saved)
      if (saved === 'dark') document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    } catch (e) { }

    // attempt to load basic user info from /api/me
    fetch('http://localhost:4000/api/me', { credentials: 'include' })
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
      <Sidebar collapsed={collapsed} />
      <div className="flex-1 flex flex-col">
        <Header onToggleSidebar={() => setCollapsed(s => !s)} collapsed={collapsed} user={user} theme={theme} onToggleTheme={toggleTheme} />
        <main className="p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
