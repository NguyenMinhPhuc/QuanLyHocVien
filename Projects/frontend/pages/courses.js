import { useEffect, useState } from 'react'
import { sanitizeNumericInput, formatWithThousands } from '../lib/numberFormat'
import { authFetch } from '../lib/auth'

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', level: '', sessions: 0, status: 'active', tuition_amount: 0, discount_percent: 0 })


  const [teachers, setTeachers] = useState([])
  const [showClassModal, setShowClassModal] = useState(false)
  const [classForm, setClassForm] = useState({ course_id: null, teacher_id: null, room: '', schedule: '', status: 'active' })
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
      const res = await authFetch('/api/courses')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setCourses(data)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  useEffect(() => { setPage(1); setSelected([]) }, [query, sortKey, sortDir, statusFilter, pageSize])

  const filteredSorted = () => {
    let arr = Array.isArray(courses) ? courses.slice() : []
    if (query) {
      const q = query.toLowerCase()
      arr = arr.filter(c => (c.name || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q))
    }
    if (statusFilter) arr = arr.filter(c => (c.status || '') === statusFilter)
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

  useEffect(() => {
    async function loadTeachers() {
      try {
        const res = await authFetch('/api/teachers')
        if (!res.ok) return
        const data = await res.json()
        setTeachers(data)
      } catch (err) {
        // ignore
      }
    }
    loadTeachers()
  }, [])

  function openNew() { setEditing(null); setForm({ name: '', description: '', level: '', sessions: 0, status: 'active', tuition_amount: 0, discount_percent: 0 }); setShowModal(true) }

  async function handleSave(e) {
    e.preventDefault()
    setError(null)
    try {
      const payload = { name: form.name, description: form.description, level: form.level, sessions: form.sessions, status: form.status, tuition_amount: Number(form.tuition_amount || 0), discount_percent: Number(form.discount_percent || 0) }
      let res
      if (editing) {
        res = await authFetch(`/api/courses/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      } else {
        res = await authFetch('/api/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || JSON.stringify(data))
      await load()
      setShowModal(false)
    } catch (err) { setError(err.message) }
  }

  async function editCourse(c) {
    setError(null)
    try {
      const res = await authFetch(`/api/courses/${c.id}`)
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Failed to fetch course') }
      const course = await res.json()
      setEditing(course)
      setForm({ name: course.name || '', description: course.description || '', level: course.level || '', sessions: course.sessions || 0, status: course.status || 'active', tuition_amount: course.tuition_amount || 0, discount_percent: course.discount_percent || 0 })
      setShowModal(true)
    } catch (err) { setError(err.message) }
  }

  async function removeCourse(id) {
    if (!confirm('Xác nhận xóa khóa học?')) return
    try {
      const res = await authFetch(`/api/courses/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || JSON.stringify(data))
      await load()
    } catch (err) { setError(err.message) }
  }

  function openCreateClass(course) {
    setClassForm({ course_id: course.id, teacher_id: teachers.length ? teachers[0].id : null, room: '', schedule: '', status: 'active' })
    setShowClassModal(true)
  }

  async function handleCreateClass(e) {
    e.preventDefault()
    setError(null)
    try {
      const payload = { course_id: classForm.course_id, teacher_id: classForm.teacher_id, room: classForm.room, schedule: classForm.schedule, status: classForm.status }
      const res = await authFetch('/api/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || JSON.stringify(data))
      setShowClassModal(false)
      // optional: refresh classes list or show success
    } catch (err) { setError(err.message) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Courses</h1>
        <div>
          <button onClick={openNew} className="px-3 py-1 bg-blue-600 text-white rounded">Add course</button>
        </div>
      </div>

      {error && <div className="mb-3 text-red-600">{error}</div>}

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-2xl z-50">
            <h2 className="text-lg font-semibold mb-3">{editing ? 'Edit course' : 'Add course'}</h2>
            <form onSubmit={handleSave} className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Course name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="p-2 border rounded bg-transparent w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Level</label>
                  <input value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className="p-2 border rounded bg-transparent w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sessions</label>
                  <input type="number" value={form.sessions} onChange={e => setForm(f => ({ ...f, sessions: parseInt(e.target.value || '0', 10) }))} className="p-2 border rounded bg-transparent w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tuition amount</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatWithThousands(form.tuition_amount)}
                    onChange={e => {
                      const clean = sanitizeNumericInput(e.target.value)
                      setForm(f => ({ ...f, tuition_amount: clean }))
                    }}
                    className="p-2 border rounded bg-transparent w-full"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Discount %</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={sanitizeNumericInput(form.discount_percent)}
                    onChange={e => setForm(f => ({ ...f, discount_percent: sanitizeNumericInput(e.target.value) }))}
                    className="p-2 border rounded bg-transparent w-full"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="p-2 border rounded bg-transparent w-full">
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="p-2 border rounded bg-transparent w-full" />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-2 border rounded">Cancel</button>
                <button type="submit" className="px-3 py-2 bg-green-600 text-white rounded">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showClassModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowClassModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-2xl z-50">
            <h2 className="text-lg font-semibold mb-3">Create Class for Course</h2>
            <form onSubmit={handleCreateClass} className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Teacher</label>
                  <select value={classForm.teacher_id || ''} onChange={e => setClassForm(f => ({ ...f, teacher_id: e.target.value }))} className="p-2 border rounded bg-transparent w-full">
                    <option value="">-- select teacher --</option>
                    {teachers.map(t => (<option key={t.id} value={t.id}>{t.name || t.fullname || t.email}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Room</label>
                  <input value={classForm.room} onChange={e => setClassForm(f => ({ ...f, room: e.target.value }))} className="p-2 border rounded bg-transparent w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Schedule</label>
                  <input value={classForm.schedule} onChange={e => setClassForm(f => ({ ...f, schedule: e.target.value }))} placeholder="e.g. Mon/Wed 18:00-20:00" className="p-2 border rounded bg-transparent w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select value={classForm.status} onChange={e => setClassForm(f => ({ ...f, status: e.target.value }))} className="p-2 border rounded bg-transparent w-full">
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowClassModal(false)} className="px-3 py-2 border rounded">Cancel</button>
                <button type="submit" className="px-3 py-2 bg-green-600 text-white rounded">Create</button>
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
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name/description" className="p-2 border rounded w-64" />
                <select value={sortKey} onChange={e => setSortKey(e.target.value)} className="p-2 border rounded">
                  <option value="name">Sort by Name</option>
                  <option value="level">Sort by Level</option>
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
                <tr className="text-left"><th className="p-2"><input type="checkbox" onChange={e => toggleSelectAllOnPage(e.target.checked)} checked={currentPageItems().every(i => selected.includes(i.id)) && currentPageItems().length > 0} /></th><th className="p-2">No.</th><th className="p-2">Name</th><th>Description</th><th>Level</th><th>Sessions</th><th>Tuition</th><th>Discount %</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {currentPageItems().map((c, idx) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2"><input type="checkbox" checked={selected.includes(c.id)} onChange={e => setSelected(prev => e.target.checked ? Array.from(new Set([...prev, c.id])) : prev.filter(x => x !== c.id))} /></td>
                    <td className="p-2">{(page - 1) * pageSize + idx + 1}</td>
                    <td className="p-2">{c.name}</td>
                    <td>{c.description}</td>
                    <td>{c.level}</td>
                    <td>{c.sessions}</td>
                    <td className="p-2">{c.tuition_amount != null ? Number(c.tuition_amount).toLocaleString() : '-'}</td>
                    <td className="p-2">{c.discount_percent != null ? Number(c.discount_percent) : '-'}</td>
                    <td className="p-2">
                      <select value={c.status || 'active'} onChange={async (e) => {
                        const newStatus = e.target.value
                        try {
                          const res = await authFetch(`/api/courses/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
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
                      <button onClick={() => editCourse(c)} className="mr-2 px-2 py-1 bg-yellow-400 rounded">Edit</button>
                      <button onClick={() => openCreateClass(c)} className="mr-2 px-2 py-1 bg-indigo-600 text-white rounded">Create Class</button>
                      <button onClick={() => removeCourse(c.id)} className="px-2 py-1 bg-red-500 text-white rounded">Delete</button>
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
