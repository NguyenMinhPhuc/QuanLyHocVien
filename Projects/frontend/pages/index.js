import { useEffect, useState } from 'react'
import { authFetch } from '../lib/auth'

export default function Home() {
  const [students, setStudents] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // list UI states
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState([])

  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', dob: '' })
  const [showModal, setShowModal] = useState(false)
  const [parents, setParents] = useState([{ name: '', email: '', phone: '', relationship: '' }])

  async function load() {
    setLoading(true)
    try {
      const res = await authFetch('/api/students')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setStudents(data)
    } catch (err) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  useEffect(() => { setPage(1); setSelected([]) }, [query, sortKey, sortDir, statusFilter, pageSize])

  const filteredSorted = () => {
    let arr = Array.isArray(students) ? students.slice() : []
    if (query) {
      const q = query.toLowerCase()
      arr = arr.filter(s => (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q) || (s.phone || '').toLowerCase().includes(q))
    }
    if (statusFilter) arr = arr.filter(s => (s.status || '') === statusFilter)
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

  function openNew() { setEditing(null); setForm({ name: '', email: '', phone: '', dob: '' }) }
  function openNewModal() { setEditing(null); setForm({ name: '', email: '', phone: '', dob: '' }); setParents([{ name: '', email: '', phone: '' }]); setShowModal(true) }

  async function handleSave(e) {
    e.preventDefault()
    setError(null)
    try {
      const payload = { name: form.name, email: form.email, phone: form.phone, dob: form.dob, parents }
      let res
      if (editing) {
        res = await authFetch(`/api/students/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      } else {
        res = await authFetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || JSON.stringify(data))
      // if created returned { student, user }
      if (data.student) {
        // newly created
        let msg = `Sinh viên tạo thành công. Tài khoản: ${data.user.username} (mật khẩu mặc định: ${data.user.username}@123)`
        if (Array.isArray(data.parents) && data.parents.length > 0) {
          msg += '\nPhụ huynh:\n'
          data.parents.forEach(p => { msg += ` - ${p.username} (mật khẩu: ${p.password})\n` })
        }
        alert(msg)
      }
      await load()
      setEditing(null)
      setForm({ name: '', email: '', phone: '', dob: '' })
      setParents([{ name: '', email: '', phone: '' }])
      setShowModal(false)
    } catch (err) { setError(err.message) }
  }

  async function editStudent(s) {
    setError(null)
    try {
      // fetch full student details (includes parents)
      const res = await authFetch(`/api/students/${s.id}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to fetch student details')
      }
      const stu = await res.json()
      setEditing(stu)
      setForm({ name: stu.name || '', email: stu.email || '', phone: stu.phone || '', dob: stu.dob ? stu.dob.split('T')[0] : '' })
      if (stu.parents && Array.isArray(stu.parents) && stu.parents.length > 0) {
        setParents(stu.parents.map(p => ({ id: p.id, user_id: p.user_id, name: p.name || '', email: p.email || '', phone: p.phone || '', relationship: p.relationship || '' })))
      } else {
        setParents([{ name: '', email: '', phone: '' }])
      }
      setShowModal(true)
    } catch (err) {
      console.error(err)
      setError(err.message)
    }
  }

  async function removeStudent(id) {
    if (!confirm('Xác nhận xóa sinh viên?')) return
    try {
      const res = await authFetch(`/api/students/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || JSON.stringify(data))
      await load()
    } catch (err) { setError(err.message) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Students</h1>
        <div>
          <button onClick={openNewModal} className="px-3 py-1 bg-blue-600 text-white rounded">Add student</button>
        </div>
      </div>

      {error && <div className="mb-3 text-red-600">{error}</div>}

      {/* Modal form - create/edit student + parent info */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-2xl z-50">
            <h2 className="text-lg font-semibold mb-3">{editing ? 'Edit student' : 'Add student'}</h2>
            <form onSubmit={handleSave} className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Student name" className="p-2 border rounded bg-transparent" />
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Student email" className="p-2 border rounded bg-transparent" />
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Student phone" className="p-2 border rounded bg-transparent" />
                <input type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} className="p-2 border rounded bg-transparent" />
              </div>

              <div className="mt-4">
                <h3 className="font-medium">Parents / Guardians</h3>
                <div className="space-y-3 mt-2">
                  {parents.map((pInfo, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                      <input value={pInfo.name} onChange={e => setParents(prev => { const copy = [...prev]; copy[idx] = { ...copy[idx], name: e.target.value }; return copy })} placeholder="Parent name" className="p-2 border rounded bg-transparent" />
                      <input value={pInfo.email} onChange={e => setParents(prev => { const copy = [...prev]; copy[idx] = { ...copy[idx], email: e.target.value }; return copy })} placeholder="Parent email" className="p-2 border rounded bg-transparent" />
                      <input value={pInfo.phone} onChange={e => setParents(prev => { const copy = [...prev]; copy[idx] = { ...copy[idx], phone: e.target.value }; return copy })} placeholder="Parent phone" className="p-2 border rounded bg-transparent" />
                      <div className="flex gap-2 items-center min-w-0">
                        <select value={pInfo.relationship || ''} onChange={e => setParents(prev => { const copy = [...prev]; copy[idx] = { ...copy[idx], relationship: e.target.value }; return copy })} className="p-2 border rounded bg-transparent">
                          <option value="">Relationship</option>
                          <option value="father">Father</option>
                          <option value="mother">Mother</option>
                          <option value="guardian">Guardian</option>
                          <option value="other">Other</option>
                        </select>
                        <button
                          type="button"
                          onClick={async () => {
                            // if this parent has an id (existing in DB) and we're editing, call API to disable
                            if (editing && pInfo && pInfo.id) {
                              if (!confirm('Xác nhận xóa phụ huynh? Tài khoản phụ huynh sẽ bị vô hiệu hóa.')) return;
                              try {
                                const res = await authFetch(`/api/parents/${pInfo.id}`, { method: 'DELETE' });
                                const body = await res.json().catch(() => ({}));
                                if (!res.ok) throw new Error(body.error || 'Failed to remove parent');
                                setParents(prev => prev.filter((_, i) => i !== idx));
                              } catch (err) { setError(err.message) }
                            } else {
                              // just remove the unsaved parent input
                              setParents(prev => prev.filter((_, i) => i !== idx));
                            }
                          }}
                          title="Remove parent"
                          className="h-8 w-8 rounded bg-red-500 text-white flex items-center justify-center shrink-0"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                            <path d="M10 11v6"></path>
                            <path d="M14 11v6"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  <div>
                    <button type="button" onClick={() => setParents(prev => ([...prev, { name: '', email: '', phone: '' }]))} className="px-3 py-1 bg-blue-600 text-white rounded">Add parent</button>
                  </div>
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
                <tr className="text-left"><th className="p-2"><input type="checkbox" onChange={e => toggleSelectAllOnPage(e.target.checked)} checked={currentPageItems().every(i => selected.includes(i.id)) && currentPageItems().length > 0} /></th><th className="p-2">No.</th><th className="p-2">Name</th><th>Email</th><th>Phone</th><th>DOB</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {currentPageItems().map((s, idx) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-2"><input type="checkbox" checked={selected.includes(s.id)} onChange={e => setSelected(prev => e.target.checked ? Array.from(new Set([...prev, s.id])) : prev.filter(x => x !== s.id))} /></td>
                    <td className="p-2">{(page - 1) * pageSize + idx + 1}</td>
                    <td className="p-2">{s.name}</td>
                    <td>{s.email}</td>
                    <td>{s.phone}</td>
                    <td>{s.dob ? s.dob.split('T')[0] : ''}</td>
                    <td className="p-2">
                      <select value={s.status || 'active'} onChange={async (e) => {
                        const newStatus = e.target.value
                        try {
                          const res = await authFetch(`/api/students/${s.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
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
                      <button onClick={() => editStudent(s)} className="mr-2 px-2 py-1 bg-yellow-400 rounded">Edit</button>
                      <button onClick={() => removeStudent(s.id)} className="px-2 py-1 bg-red-500 text-white rounded">Delete</button>
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
