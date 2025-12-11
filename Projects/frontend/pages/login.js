import { useState } from 'react'
import { useRouter } from 'next/router'
import { authFetch } from '../lib/auth'

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
      setError('Vui lòng nhập tên đăng nhập và mật khẩu')
      return
    }
    setLoading(true)
    try {
      const res = await authFetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      })

      // Some servers set cookies and return no JSON (204 or empty body).
      // Safely attempt to parse JSON only when present.
      let data = null
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        data = await res.json()
      }

      if (!res.ok) {
        const msg = (data && (data.error || data.message)) || `Lỗi: ${res.status}`
        setError(msg)
        setLoading(false)
        return
      }

      // Success: backend should set HttpOnly cookies (access + refresh).
      // Redirect to next or home.
      const next = router.query.next || '/'
      router.replace(next)
    } catch (err) {
      setError(err.message || 'Lỗi mạng')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', padding: 20, border: '1px solid #eee', borderRadius: 6 }}>
      <h1 style={{ marginBottom: 12 }}>Đăng nhập</h1>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>Tên đăng nhập</label>
          <input value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: 8, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>Mật khẩu</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: 8, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginTop: 10 }}>
          <button type="submit" disabled={loading} style={{ padding: '8px 16px' }}>{loading ? 'Đang xử lý...' : 'Đăng nhập'}</button>
        </div>
        {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
      </form>
    </div>
  )
}
