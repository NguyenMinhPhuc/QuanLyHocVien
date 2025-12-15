import { useState } from 'react'
import { useRouter } from 'next/router'
import { getToken, saveToken } from '../lib/auth'
import { t } from '../lib/i18n'

export default function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [error, setError] = useState(null)
  const router = useRouter()

  async function submit(e) {
    e.preventDefault()
    setError(null)
    try {
      // Attempt to send token if present (admin route requires admin token)
      const token = getToken()
      const res = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ username, password, role })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || JSON.stringify(data))
        return
      }
      // If register returns user info only, redirect to login
      router.push('/login')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>{t('register.title', 'Register (Admin only)')}</h1>
      <form onSubmit={submit}>
        <div>
          <label>{t('register.username', 'Username')}</label><br />
          <input value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div>
          <label>{t('register.password', 'Password')}</label><br />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div>
          <label>{t('register.role', 'Role')}</label><br />
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="student">{t('roles.student', 'Học viên')}</option>
            <option value="parent">{t('roles.parent', 'Phụ huynh')}</option>
            <option value="teacher">{t('roles.teacher', 'Giáo viên')}</option>
            <option value="administrator">{t('roles.admin', 'Quản trị viên')}</option>
          </select>
        </div>
        <div style={{ marginTop: 10 }}>
          <button type="submit">{t('register.submit', 'Register')}</button>
        </div>
        {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      </form>
    </div>
  )
}
