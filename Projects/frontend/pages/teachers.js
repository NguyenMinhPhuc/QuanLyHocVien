import { useEffect, useState } from 'react'
import { authFetch } from '../lib/auth'

export default function Teachers() {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', status: 'active' })
  // list UI states
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState([])

  async function load() {
    setLoading(true)
    try {
      const res = await authFetch('/api/teachers')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setTeachers(data)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { setPage(1); setSelected([]) }, [query, sortKey, sortDir, statusFilter, pageSize])

  const filteredSorted = () => {
    let arr = Array.isArray(teachers) ? teachers.slice() : []
    if (query) {
      const q = query.toLowerCase()
      arr = arr.filter(t => (t.name || '').toLowerCase().includes(q) || (t.email || '').toLowerCase().includes(q) || (t.phone || '').toLowerCase().includes(q))
    }
    if (statusFilter) arr = arr.filter(t => (t.status || '') === statusFilter)
    arr.sort((a, b) => {
      const A = ((a[sortKey] || '') + '').toString().toLowerCase()
      const B = ((b[sortKey] || '') + '').toString().toLowerCase()
      if (A < B) return sortDir === 'asc' ? -1 : 1
      if (A > B) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }

  const currentPageItems = () => {
    const arr = filteredSorted()
    const start = (page - 1) * pageSize
    return arr.slice(start, start + pageSize)
  }

  const totalPages = () => Math.max(1, Math.ceil(filteredSorted().length / pageSize))

  function toggleSelectAllOnPage(checked) {
    const idsOnPage = currentPageItems().map(x => x.id)
    if (checked) setSelected(prev => Array.from(new Set([...prev, ...idsOnPage])))
    else setSelected(prev => prev.filter(id => !idsOnPage.includes(id)))
  }

  function openNew() { setEditing(null); setForm({ name: '', phone: '', email: '', status: 'active' }); setShowModal(true) }

  async function handleSave(e) {
    e.preventDefault()
    setError(null)
    try {
      const payload = { name: form.name, phone: form.phone, email: form.email, status: form.status }
      let res
      if (editing) {
        res = await authFetch(`/api/teachers/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      } else {
        res = await authFetch('/api/teachers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || JSON.stringify(data))
      await load()
      setShowModal(false)
    } catch (err) { setError(err.message) }
  }

  async function editTeacher(t) {
    setError(null)
    try {
      const res = await authFetch(`/api/teachers/${t.id}`)
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Failed to fetch teacher') }
      const teacher = await res.json()
      setEditing(teacher)
      setForm({ name: teacher.name || '', phone: teacher.phone || '', email: teacher.email || '', status: teacher.status || 'active' })
      setShowModal(true)
    } catch (err) { setError(err.message) }
  }

  async function removeTeacher(id) {
    if (!confirm('Xác nhận xóa giáo viên?')) return
    try {
      const res = await authFetch(`/api/teachers/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || JSON.stringify(data))
      await load()
    } catch (err) { setError(err.message) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Teachers</h1>
        <div>
          <button onClick={openNew} className="px-3 py-1 bg-blue-600 text-white rounded">Add teacher</button>
        </div>
      </div>

      {error && <div className="mb-3 text-red-600">{error}</div>}

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-2xl z-50">
            <h2 className="text-lg font-semibold mb-3">{editing ? 'Edit teacher' : 'Add teacher'}</h2>
            <form onSubmit={handleSave} className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="p-2 border rounded bg-transparent w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="p-2 border rounded bg-transparent w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="p-2 border rounded bg-transparent w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="p-2 border rounded bg-transparent w-full">
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-2 border rounded">Cancel</button>
                <button type="submit" className="px-3 py-2 bg-green-600 text-white rounded">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 p-4 rounded">
        {loading ? <div>Loading...</div> : (
          <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name/email/phone" className="p-2 border rounded w-64" />
                <select value={sortKey} onChange={e => setSortKey(e.target.value)} className="p-2 border rounded">
                  <option value="name">Sort by Name</option>
                  <option value="email">Sort by Email</option>
                  <option value="phone">Sort by Phone</option>
                </select>
                <select value={sortDir} onChange={e => setSortDir(e.target.value)} className="p-2 border rounded">
                  <option value="asc">Asc</option>
                  <option value="desc">Desc</option>
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="p-2 border rounded">
                  <option value="">All statuses</option>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="disabled">disabled</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm">Rows:</label>
                <select value={pageSize} onChange={e => setPageSize(parseInt(e.target.value, 10))} className="p-2 border rounded">
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>

            <table className="min-w-full table-auto">
              <thead>
                <tr className="text-left"><th className="p-2"><input type="checkbox" onChange={e => toggleSelectAllOnPage(e.target.checked)} checked={currentPageItems().every(i => selected.includes(i.id)) && currentPageItems().length > 0} /></th><th className="p-2">No.</th><th className="p-2">Name</th><th>Phone</th><th>Email</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {currentPageItems().map((t, idx) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-2"><input type="checkbox" checked={selected.includes(t.id)} onChange={e => setSelected(prev => e.target.checked ? Array.from(new Set([...prev, t.id])) : prev.filter(x => x !== t.id))} /></td>
                    <td className="p-2">{(page - 1) * pageSize + idx + 1}</td>
                    <td className="p-2">{t.name}</td>
                    <td>{t.phone}</td>
                    <td>{t.email}</td>
                    <td className="p-2">
                      <select value={t.status || 'active'} onChange={async (e) => {
                        const newStatus = e.target.value
                        try {
                          const res = await authFetch(`/api/teachers/${t.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
                          const body = await res.json().catch(() => ({}))
                          if (!res.ok) throw new Error(body.error || 'Failed to update status')
                          await load()
                        } catch (err) { setError(err.message) }
                      }} className="p-1 border rounded bg-transparent">
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                        <option value="disabled">disabled</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <button onClick={() => editTeacher(t)} className="mr-2 px-2 py-1 bg-yellow-400 rounded">Edit</button>
                      <button onClick={() => removeTeacher(t.id)} className="px-2 py-1 bg-red-500 text-white rounded">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between mt-3">
              <div>
                <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-2 py-1 border rounded mr-2">Prev</button>
                <button disabled={page >= totalPages()} onClick={() => setPage(p => Math.min(totalPages(), p + 1))} className="px-2 py-1 border rounded">Next</button>
              </div>
              <div className="text-sm">Page {page} / {totalPages()} — {filteredSorted().length} items</div>
              <div>
                {Array.from({ length: totalPages() }).map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)} className={`px-2 py-1 border rounded ml-1 ${page === i + 1 ? 'bg-slate-200' : ''}`}>{i + 1}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
