import React, { useState, useRef, useEffect } from 'react'
import { logout } from '../lib/auth'
import { FiSearch, FiSun, FiMoon, FiUser } from 'react-icons/fi'

export default function Header({ onToggleSidebar, collapsed, user, theme, onToggleTheme }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const menuRef = useRef()

  useEffect(() => {
    function onDoc(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  return (
    <header className="h-16 flex items-center justify-between px-4 bg-white dark:bg-slate-900 border-b">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800">{collapsed ? '☰' : '▢'}</button>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 px-3 py-2 rounded">
          <FiSearch className="text-gray-500 dark:text-gray-300" />
          <input className="bg-transparent outline-none w-64 text-sm dark:text-white" placeholder="Tìm theo mã, tên..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onToggleTheme} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800">{theme === 'dark' ? <FiMoon /> : <FiSun />}</button>
        <div className="relative avatar-menu" ref={menuRef}>
          <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center cursor-pointer" onClick={() => setOpen(v => !v)}>{user && user.username ? user.username.charAt(0).toUpperCase() : <FiUser />}</div>
          {open && (
            <div className="menu">
              <button onClick={() => { setOpen(false); window.location.href = '/profile' }}>Profile</button>
              <button onClick={async () => { await logout(); window.location.href = '/login' }}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
