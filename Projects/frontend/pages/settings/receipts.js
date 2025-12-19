import { useEffect, useState } from 'react'
import { authFetch } from '../../lib/auth'

export default function ReceiptSettings() {
  const [logo, setLogo] = useState('')
  const [phone, setPhone] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch('/api/settings/receipts')
        if (!res.ok) return
        const data = await res.json()
        setLogo(data.receipt_logo_url || '')
        setPhone(data.receipt_center_phone || '')
      } catch (e) { console.error(e) }
    })()
  }, [])

  async function save(e) {
    e.preventDefault()
    try {
      const res = await authFetch('/api/settings/receipts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receipt_logo_url: logo || null, receipt_center_phone: phone || null }) })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setMsg('Saved')
      setTimeout(() => setMsg(''), 2000)
    } catch (err) { setMsg('Error: ' + err.message) }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Receipt settings</h1>
      {msg && <div className="mb-2">{msg}</div>}
      <form onSubmit={save} className="grid gap-2 max-w-lg">
        <div>
          <label className="block text-sm">Logo URL</label>
          <input value={logo} onChange={e => setLogo(e.target.value)} className="p-2 border rounded w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
        </div>
        <div>
          <label className="block text-sm">Center phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className="p-2 border rounded w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
        </div>
        <div className="flex gap-2"><button className="px-3 py-2 bg-green-600 text-white rounded">Save</button></div>
      </form>
    </div>
  )
}
