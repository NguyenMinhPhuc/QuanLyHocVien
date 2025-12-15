import React, { useState, useRef, useEffect } from 'react'
import { logout } from '../lib/auth'
import { FiSearch, FiSun, FiMoon, FiUser } from 'react-icons/fi'
import { t } from '../lib/i18n'

export default function Header({ onToggleSidebar, collapsed, user, theme, onToggleTheme }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const menuRef = useRef()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    function onDoc(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  useEffect(() => {
    // mark mounted to avoid hydration mismatch for icons that depend on client-only theme
    setMounted(true)
  }, [])

  return (
    <header className="h-16 flex items-center justify-between px-4 bg-white dark:bg-slate-900 border-b">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800">{collapsed ? '☰' : '▢'}</button>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 px-3 py-2 rounded">
          <FiSearch className="text-gray-500 dark:text-gray-300" />
          <input className="bg-transparent outline-none w-64 text-sm dark:text-white" placeholder={t('header.search.placeholder', 'Tìm theo mã, tên...')} value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user && user.role === 'admin' && (
          <a href="/darkboard" className="text-sm px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800">
            {t('darkboard.link', 'Darkboard')}
          </a>
        )}
        <button onClick={onToggleTheme} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800">
          {mounted ? (theme === 'dark' ? <FiMoon /> : <FiSun />) : <span style={{ display: 'inline-block', width: 20, height: 20 }}></span>}
        </button>
        <div className="relative avatar-menu" ref={menuRef}>
          <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center cursor-pointer" onClick={() => setOpen(v => !v)}>{user && user.username ? user.username.charAt(0).toUpperCase() : <FiUser />}</div>
          {open && (
            <div className="menu">
              <button onClick={() => { setOpen(false); window.location.href = '/profile' }}>{t('header.menu.profile', 'Profile')}</button>
              <button onClick={() => { setOpen(false); window.location.href = '/settings' }}>{t('header.menu.settings', 'Settings')}</button>
              <button onClick={async () => { await logout(); window.location.href = '/login' }}>{t('header.menu.logout', 'Logout')}</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
