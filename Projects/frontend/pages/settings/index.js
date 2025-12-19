import { useEffect, useState } from 'react'
import { authFetch } from '../../lib/auth'

export default function SettingsIndex() {
  const [logo, setLogo] = useState('')
  const [template, setTemplate] = useState('')
  const [phone, setPhone] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch('/api/settings/receipts')
        if (!res.ok) return
        const data = await res.json()
        setLogo(data.receipt_logo_url || '')
        setTemplate(data.receipt_template_url || '')
        setPhone(data.receipt_center_phone || '')
      } catch (e) { console.error(e) }
    })()
  }, [])

  async function save(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authFetch('/api/settings/receipts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receipt_logo_url: logo || null, receipt_center_phone: phone || null, receipt_template_url: template || null }) })
      if (!res.ok) throw new Error('Failed to save settings')
      const data = await res.json()
      setMsg('Saved')
      setTimeout(() => setMsg(''), 2000)
    } catch (err) {
      setMsg('Error: ' + err.message)
    } finally { setLoading(false) }
  }

  async function uploadFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return
    const fd = new FormData();
    fd.append('file', f)
    try {
      const res = await authFetch('/api/settings/receipts/upload-logo', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      if (data && data.url) setLogo(data.url)
    } catch (err) { console.error(err); setMsg('Upload error: ' + err.message) }
  }

  async function uploadTemplate(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return
    const fd = new FormData();
    fd.append('file', f)
    try {
      const res = await authFetch('/api/settings/receipts/upload-logo', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      if (data && data.url) setTemplate(data.url)
    } catch (err) { console.error(err); setMsg('Upload error: ' + err.message) }
  }

  return (
    <div className="p-4 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">System Settings</h1>
      <p className="mb-4">Configure system-wide settings such as receipt header/logo and contact phone.</p>

      <form onSubmit={save} className="grid gap-4 bg-white dark:bg-slate-800 dark:text-slate-100 p-4 rounded">
        <div>
          <label className="block text-sm font-medium">Receipt logo URL</label>
          <div className="flex gap-2 items-center">
            <input value={logo} onChange={e => setLogo(e.target.value)} placeholder="https://.../logo.png" className="p-2 border rounded w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
            <label className="p-2 bg-gray-100 border rounded cursor-pointer">
              Upload
              <input type="file" accept="image/*" onChange={uploadFile} style={{ display: 'none' }} />
            </label>
          </div>
          {logo ? <div className="mt-2"><img src={logo} alt="logo preview" style={{ maxHeight: 100 }} /></div> : <div className="mt-2 text-sm text-slate-500">No logo configured</div>}
        </div>

        <div>
          <label className="block text-sm font-medium">Receipt template (background)</label>
          <div className="flex gap-2 items-center">
            <input value={template} onChange={e => setTemplate(e.target.value)} placeholder="https://.../template.png" className="p-2 border rounded w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
            <label className="p-2 bg-gray-100 border rounded cursor-pointer">
              Upload
              <input type="file" accept="image/*" onChange={uploadTemplate} style={{ display: 'none' }} />
            </label>
          </div>
          {template ? <div className="mt-2"><img src={template} alt="template preview" style={{ maxHeight: 120 }} /></div> : <div className="mt-2 text-sm text-slate-500">No template configured</div>}
        </div>

        <div>
          <label className="block text-sm font-medium">Center phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0123-456-789" className="p-2 border rounded w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
        </div>

        <div className="flex items-center gap-2">
          <button type="submit" disabled={loading} className="px-3 py-2 bg-green-600 text-white rounded">{loading ? 'Saving...' : 'Save settings'}</button>
          {msg && <div className="text-sm">{msg}</div>}
        </div>
      </form>

      <div className="mt-6">
        <h2 className="text-lg font-medium mb-2">Quick links</h2>
        <ul className="list-disc ml-6 text-sm">
          <li><a href="/settings/receipts" className="text-blue-600">Receipt settings page</a></li>
        </ul>
      </div>
    </div>
  )
}
