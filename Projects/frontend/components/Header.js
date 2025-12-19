import React, { useState, useRef, useEffect } from 'react'
import { logout } from '../lib/auth'
import { FiSearch, FiSun, FiMoon, FiUser, FiMenu } from 'react-icons/fi'
import SearchModal from './SearchModal'
import { t } from '../lib/i18n'

export default function Header({ onToggleSidebar, collapsed, user, theme, onToggleTheme }) {
  const [query, setQuery] = useState('')
  const [openSearch, setOpenSearch] = useState(false)
  const [open, setOpen] = useState(false)
  const menuRef = useRef()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    function onDoc(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setOpenSearch(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    // mark mounted to avoid hydration mismatch for icons that depend on client-only theme
    setMounted(true)
  }, [])

  return (
    <header className="h-16 flex items-center justify-between px-4 bg-white dark:bg-slate-900 border-b">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800"><FiMenu /></button>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 px-3 py-2 rounded cursor-text" onClick={() => setOpenSearch(true)}>
          <FiSearch className="text-gray-500 dark:text-gray-300" />
          <input readOnly onFocus={() => setOpenSearch(true)} className="bg-transparent outline-none w-64 text-sm dark:text-white cursor-text" placeholder={t('header.search.placeholder', 'Tìm theo mã, tên... (Ctrl+K)')} value={query} />
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
          <div onClick={() => setOpen(v => !v)} className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800">
            <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center">{user && (user.username || user.name) ? (user.username || user.name).charAt(0).toUpperCase() : <FiUser />}</div>
            {user && (user.name || user.username) && (
              <div className="block max-w-[160px] truncate text-sm text-slate-800 dark:text-slate-100">
                {user.name || user.username} - {t(`roles.${(user.role || '').toString().toLowerCase()}`, user.role || '')}
              </div>
            )}
          </div>
          {open && (
            <div className="menu">
              {user && (
                <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100">
                  <div className="font-medium">{user.name || user.username}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-300">{t(`roles.${(user.role || '').toString().toLowerCase()}`, user.role || '')}</div>
                </div>
              )}
              <div className="flex flex-col">
                <button onClick={() => { setOpen(false); window.location.href = '/profile' }} className="px-3 py-2 text-left">{t('header.menu.profile', 'Profile')}</button>
                <button onClick={() => { setOpen(false); window.location.href = '/settings' }} className="px-3 py-2 text-left">{t('header.menu.settings', 'Settings')}</button>
                <button onClick={async () => { await logout(); window.location.href = '/login' }} className="px-3 py-2 text-left">{t('header.menu.logout', 'Logout')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <SearchModal open={openSearch} onClose={() => setOpenSearch(false)} />
    </header>
  )
}
