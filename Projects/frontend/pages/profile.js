import React, { useEffect, useState } from 'react'
import { authFetch } from '../lib/auth'
import { useRouter } from 'next/router'
import { t } from '../lib/i18n'

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    authFetch('/api/me')
      .then(async res => {
        if (!res.ok) {
          if (res.status === 401) return router.replace('/login')
          const txt = await res.text().catch(() => '')
          throw new Error(txt || `Status ${res.status}`)
        }
        return res.json()
      })
      .then(data => { if (mounted) setUser(data) })
      .catch(err => { if (mounted) setError(err.message || String(err)) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (!user) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{t('header.menu.profile', 'Profile')}</h1>
        <a href="/settings" className="px-3 py-2 bg-blue-600 text-white rounded">{t('header.menu.settings', 'Settings')}</a>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded shadow">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-indigo-500 text-white flex items-center justify-center text-2xl">{(user.username || (user.name || '')).charAt(0) || '?'}</div>
          <div>
            <div className="text-xl font-medium">{user.name || user.username}</div>
            <div className="text-sm text-slate-500 dark:text-slate-300">{user.username}</div>
            <div className="mt-2 text-sm">{t('roles.' + ((user.role || '').toString().toLowerCase()), user.role || '')}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-slate-500">Email</div>
            <div className="font-medium">{user.email || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Phone</div>
            <div className="font-medium">{user.phone || '-'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
