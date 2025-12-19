import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { authFetch } from '../lib/auth'
import { t } from '../lib/i18n'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!username.trim() || !password) {
      setError(t('login.error.missing', 'Vui lòng nhập tên đăng nhập và mật khẩu'))
      return
    }
    setLoading(true)
    try {
      const res = await authFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      })

      let data = null
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) data = await res.json()

      if (!res.ok) {
        const msg = (data && (data.error || data.message)) || `Lỗi: ${res.status}`
        setError(msg)
        setLoading(false)
        return
      }

      const next = router.query.next || '/'
      router.replace(next)
    } catch (err) {
      setError(err.message || 'Lỗi mạng')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <Head>
        <title>{t('login.title', 'Đăng nhập')} - {t('app.title', 'Quản lý học viên')}</title>
      </Head>

      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-lg bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">CM</div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-lg rounded-lg p-6">
          <h2 className="text-center text-2xl font-semibold text-slate-800 dark:text-slate-100">{t('login.title', 'Đăng nhập')}</h2>
          <p className="text-center text-sm text-slate-500 dark:text-slate-300 mt-2 mb-4">{t('login.subtitle', 'Đăng nhập để tiếp tục')}</p>

          {error && <div className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</div>}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-200 mb-1">{t('login.username', 'Tên đăng nhập')}</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full rounded-md p-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                placeholder={t('login.username_placeholder', 'Nhập tên đăng nhập')}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-slate-700 dark:text-slate-200 mb-1">{t('login.password', 'Mật khẩu')}</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-md p-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                placeholder={t('login.password_placeholder', 'Nhập mật khẩu')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60"
            >
              {loading ? t('login.processing', 'Đang xử lý...') : t('login.submit', 'Đăng nhập')}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-500 dark:text-slate-300">
            <a href="/register" className="text-blue-600 dark:text-blue-400 hover:underline">{t('login.no_account', 'Chưa có tài khoản? Đăng ký')}</a>
          </div>
        </div>
      </div>
    </div>
  )
}
