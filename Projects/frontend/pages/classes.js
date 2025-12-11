import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { authFetch } from '../lib/auth'
import { FiEye, FiTrash2, FiUserPlus, FiUserCheck, FiPlus, FiEdit3, FiUsers } from 'react-icons/fi'

export default function Classes() {
  const router = useRouter()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ course_id: '', teacher_id: '', room: '', schedule: '', status: 'active' })

  const [detailClass, setDetailClass] = useState(null)
  const [classStudents, setClassStudents] = useState([])
  const [classTeachers, setClassTeachers] = useState([])
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [showAddTeacher, setShowAddTeacher] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [createForm, setCreateForm] = useState({ course_id: '', teacher_id: '', room: '', start_time: '', end_time: '', registration_open_date: '', registration_close_date: '', course_start_date: '', course_end_date: '', status: 'active' })
  const [courses, setCourses] = useState([])

  // List controls: search, filter, sort, pagination
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortField, setSortField] = useState('course_name')
  const [sortDir, setSortDir] = useState('asc') // 'asc' | 'desc'
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [students, setStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [newStudent, setNewStudent] = useState({ name: '', email: '', phone: '' })
  const [teachers, setTeachers] = useState([])
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [teacherSearch, setTeacherSearch] = useState('')
  const [showStudentDropdown, setShowStudentDropdown] = useState(false)
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await authFetch('http://localhost:4000/api/classes')
      if (!res.ok) throw new Error('Failed to load classes')
      const data = await res.json()
      setClasses(data)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  async function handleManage(c) {
    setError(null)
    try {
      // sync enrollments on server (create missing enrollments)
      const backendHost = 'http://localhost:4000'
      const res = await authFetch(`${backendHost}/api/classes/${c.id}/enrollments/sync`, { method: 'POST' })
      if (!res.ok) {
        let body = {};
        try { body = await res.json(); } catch (e) { body = { error: await res.text().catch(() => res.statusText) } }
        throw new Error(body.error || `Failed to sync enrollments (status ${res.status})`)
      }
      // navigate to management page
      router.push(`/class-students/${c.id}`)
    } catch (err) {
      console.error('handleManage error', err)
      setError(err.message || 'Không thể đồng bộ dữ liệu lớp')
    }
  }

  async function openCreateModal(c) {
    setError(null)
    try {
      const cRes = await authFetch('http://localhost:4000/api/courses')
      if (cRes.ok) setCourses(await cRes.json())
      const tRes = await authFetch('http://localhost:4000/api/teachers')
      if (tRes.ok) setTeachers(await tRes.json())
    } catch (err) { /* ignore */ }
    if (c) {
      // editing existing class: prefill form
      const start = c.schedule && c.schedule.includes(' - ') ? c.schedule.split(' - ')[0] : ''
      const end = c.schedule && c.schedule.includes(' - ') ? c.schedule.split(' - ')[1] : ''
      const fmt = v => {
        if (!v) return ''
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
        if (typeof v === 'string' && v.includes('T')) return v.split('T')[0]
        try {
          const d = new Date(v)
          if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
        } catch (e) { }
        return ''
      }

      setCreateForm({
        course_id: c.course_id || '',
        teacher_id: c.teacher_id || '',
        room: c.room || '',
        start_time: start,
        end_time: end,
        registration_open_date: fmt(c.registration_open_date),
        registration_close_date: fmt(c.registration_close_date),
        course_start_date: fmt(c.course_start_date),
        course_end_date: fmt(c.course_end_date),
        status: c.status || 'active'
      })
      setEditingId(c.id)
    } else {
      setCreateForm({ course_id: '', teacher_id: '', room: '', start_time: '', end_time: '', registration_open_date: '', registration_close_date: '', course_start_date: '', course_end_date: '', status: 'active' })
      setEditingId(null)
    }
    setShowCreateModal(true)
  }

  async function submitCreateClass(e) {
    e.preventDefault()
    setError(null)
    try {
      // combine start/end times into a schedule string like "HH:MM - HH:MM"
      const payload = { ...createForm }
      if (createForm.start_time || createForm.end_time) payload.schedule = `${createForm.start_time || ''}${createForm.start_time && createForm.end_time ? ' - ' : ''}${createForm.end_time || ''}`
      // remove start_time/end_time from payload (backend expects `schedule` field)
      delete payload.start_time
      delete payload.end_time
      let res
      if (editingId) {
        res = await authFetch(`http://localhost:4000/api/classes/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      } else {
        res = await authFetch('http://localhost:4000/api/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || JSON.stringify(data))
      setShowCreateModal(false)
      setEditingId(null)
      await load()
    } catch (err) { setError(err.message) }
  }

  useEffect(() => { load() }, [])

  // reset to first page when list controls change
  useEffect(() => { setPage(1) }, [searchQuery, filterStatus, sortField, sortDir, pageSize])

  async function loadClassDetails(c) {
    setError(null)
    try {
      const [cRes, sRes, tRes] = await Promise.all([
        authFetch(`http://localhost:4000/api/classes/${c.id}`),
        authFetch(`http://localhost:4000/api/classes/${c.id}/students`),
        authFetch(`http://localhost:4000/api/classes/${c.id}/teachers`)
      ])
      if (!cRes.ok) throw new Error('Failed to fetch class')
      if (!sRes.ok) throw new Error('Failed to fetch enrolled students')
      if (!tRes.ok) throw new Error('Failed to fetch class teachers')
      const classData = await cRes.json()
      const studs = await sRes.json()
      const tchs = await tRes.json()
      setDetailClass(classData)
      setClassStudents(studs)
      setClassTeachers(tchs)
      setShowModal(true)
    } catch (err) { setError(err.message) }
  }

  async function openAddStudent(c) {
    setError(null)
    try {
      // ensure students list loaded for selection
      const res = await authFetch('http://localhost:4000/api/students')
      if (res.ok) {
        const data = await res.json()
        setStudents(data)
      }
    } catch (err) { /* ignore */ }
    setSelectedStudentId('')
    setNewStudent({ name: '', email: '', phone: '' })
    setStudentSearch('')
    setShowAddStudent(true)
  }

  async function openAddTeacher(c) {
    setError(null)
    try {
      const res = await authFetch('http://localhost:4000/api/teachers')
      if (res.ok) {
        const data = await res.json()
        setTeachers(data)
      }
    } catch (err) { /* ignore */ }
    setSelectedTeacherId('')
    setTeacherSearch('')
    setShowAddTeacher(true)
  }

  async function handleAddStudent(e) {
    e.preventDefault()
    setError(null)
    try {
      const payload = selectedStudentId ? { student_id: selectedStudentId } : { student: newStudent }
      const res = await authFetch(`http://localhost:4000/api/classes/${detailClass.id}/students`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || JSON.stringify(data))
      // refresh students list
      const sRes = await authFetch(`http://localhost:4000/api/classes/${detailClass.id}/students`)
      if (sRes.ok) setClassStudents(await sRes.json())
      setShowAddStudent(false)
    } catch (err) { setError(err.message) }
  }

  async function removeStudentFromClass(studentId) {
    if (!confirm('Remove student from class?')) return
    try {
      const res = await authFetch(`http://localhost:4000/api/classes/${detailClass.id}/students/${studentId}`, { method: 'DELETE' })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Failed to remove') }
      const sRes = await authFetch(`http://localhost:4000/api/classes/${detailClass.id}/students`)
      if (sRes.ok) setClassStudents(await sRes.json())
    } catch (err) { setError(err.message) }
  }

  async function handleAddTeacher(e) {
    e.preventDefault()
    setError(null)
    try {
      if (!selectedTeacherId) return setError('Please select a teacher')
      const payload = { teacher_id: selectedTeacherId }
      const res = await authFetch(`http://localhost:4000/api/classes/${detailClass.id}/teachers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || JSON.stringify(data))
      const tRes = await authFetch(`http://localhost:4000/api/classes/${detailClass.id}/teachers`)
      if (tRes.ok) setClassTeachers(await tRes.json())
      setShowAddTeacher(false)
    } catch (err) { setError(err.message) }
  }

  async function removeTeacherFromClass(teacherId) {
    if (!confirm('Remove teacher from class?')) return
    try {
      const res = await authFetch(`http://localhost:4000/api/classes/${detailClass.id}/teachers/${teacherId}`, { method: 'DELETE' })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Failed to remove') }
      const tRes = await authFetch(`http://localhost:4000/api/classes/${detailClass.id}/teachers`)
      if (tRes.ok) setClassTeachers(await tRes.json())
    } catch (err) { setError(err.message) }
  }

  async function removeClass(id) {
    if (!confirm('Xác nhận xóa lớp học?')) return
    try {
      const res = await authFetch(`http://localhost:4000/api/classes/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || JSON.stringify(data))
      await load()
    } catch (err) { setError(err.message) }
  }

  // Toggle class status (active <-> inactive) inline from list
  async function toggleClassStatus(c) {
    const newStatus = c.status === 'active' ? 'inactive' : 'active'
    try {
      setLoading(true)
      const res = await authFetch(`http://localhost:4000/api/classes/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to update status')
      // update local state without refetching all
      setClasses(prev => prev.map(cl => (cl.id === c.id ? { ...cl, status: newStatus } : cl)))
    } catch (err) {
      console.error('toggle status error', err)
      setError('Không thể thay đổi trạng thái lớp')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold inline-block bg-indigo-100 text-indigo-800 dark:bg-slate-700 dark:text-indigo-200 px-3 py-1 rounded">Classes</h1>
        <div>
          <button title="New class" onClick={() => openCreateModal()} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:opacity-90"><FiPlus /> New</button>
        </div>
      </div>

      {error && <div className="mb-3 text-red-600">{error}</div>}

      <div className="bg-white dark:bg-slate-800 p-4 rounded">
        {loading ? <div>Loading...</div> : (
          <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 w-full md:w-1/2">
                <input placeholder="Tìm kiếm lớp, khóa học, giáo viên..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="p-2 border rounded w-full" />
              </div>
              <div className="flex items-center gap-2">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="p-2 border rounded">
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="p-2 border rounded">
                  <option value={5}>5 / page</option>
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                </select>
              </div>
            </div>

            <table className="min-w-full table-auto">
              <thead>
                <tr className="text-left">
                  <th className="p-2">No.</th>
                  <th className="p-2 cursor-pointer" onClick={() => { if (sortField === 'course_name') setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField('course_name'); setSortDir('asc') } }}>
                    Course {sortField === 'course_name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="p-2">Students</th>
                  <th className="p-2">Reserved</th>
                  <th>Teacher(s)</th>
                  <th>Room</th>
                  <th>Schedule</th>
                  <th>Reg. Open</th>
                  <th>Start</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // derive visible classes with search/filter/sort/pagination
                  const q = (searchQuery || '').toLowerCase().trim()
                  let filtered = Array.isArray(classes) ? classes.slice() : []
                  if (filterStatus !== 'all') filtered = filtered.filter(x => (x.status || '').toLowerCase() === filterStatus)
                  if (q) {
                    filtered = filtered.filter(x => {
                      const course = (x.course_name || x.course || '').toString().toLowerCase()
                      const teacher = (x.teacher_name || x.teacher || '').toString().toLowerCase()
                      const room = (x.room || '').toString().toLowerCase()
                      return course.includes(q) || teacher.includes(q) || room.includes(q)
                    })
                  }
                  // sort
                  filtered.sort((a, b) => {
                    const aVal = (a[sortField] || '').toString().toLowerCase()
                    const bVal = (b[sortField] || '').toString().toLowerCase()
                    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
                    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
                    return 0
                  })
                  const total = filtered.length
                  const pages = Math.max(1, Math.ceil(total / pageSize))
                  const currentPage = Math.min(Math.max(1, page), pages)
                  const start = (currentPage - 1) * pageSize
                  const pageItems = filtered.slice(start, start + pageSize)

                  return pageItems.map((c, i) => (
                    <tr key={c.id} className="border-t">
                      <td className="p-2">{start + i + 1}</td>
                      <td className="p-2">{c.course_name || (c.course_id ? c.course_id : c.course)}</td>
                      <td className="p-2">{typeof c.student_count !== 'undefined' ? c.student_count : 0}</td>
                      <td className="p-2">{typeof c.reserved_count !== 'undefined' ? c.reserved_count : 0}</td>
                      <td>{c.teacher_name || (c.teacher_id ? c.teacher_id : c.teacher)}</td>
                      <td>{c.room}</td>
                      <td>{c.schedule}</td>
                      <td className="p-2">{c.registration_open_date ? new Date(c.registration_open_date).toLocaleDateString() : '—'}</td>
                      <td className="p-2">{c.course_start_date ? new Date(c.course_start_date).toLocaleDateString() : '—'}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only" checked={c.status === 'active'} onChange={() => toggleClassStatus(c)} />
                            <div className={`w-10 h-6 flex items-center bg-gray-300 rounded-full p-1 transition-colors ${c.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`}>
                              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${c.status === 'active' ? 'translate-x-4' : ''}`}></div>
                            </div>
                          </label>
                          <span className="text-sm">{c.status}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <button title="Manage" onClick={() => handleManage(c)} className="mr-2 p-2 bg-sky-500 text-white rounded hover:opacity-90"><FiUsers /></button>
                        <button title="View" onClick={() => loadClassDetails(c)} className="mr-2 p-2 bg-blue-500 text-white rounded hover:opacity-90"><FiEye /></button>
                        <button title="Edit" onClick={() => openCreateModal(c)} className="mr-2 p-2 bg-yellow-500 text-white rounded hover:opacity-90"><FiEdit3 /></button>
                        <button title="Delete" onClick={() => removeClass(c.id)} className="p-2 bg-red-500 text-white rounded hover:opacity-90"><FiTrash2 /></button>
                      </td>
                    </tr>
                  ))
                })()}
              </tbody>
            </table>

            {/* Pagination controls */}
            {(() => {
              const q = (searchQuery || '').toLowerCase().trim()
              let filtered = Array.isArray(classes) ? classes.slice() : []
              if (filterStatus !== 'all') filtered = filtered.filter(x => (x.status || '').toLowerCase() === filterStatus)
              if (q) {
                filtered = filtered.filter(x => {
                  const course = (x.course_name || x.course || '').toString().toLowerCase()
                  const teacher = (x.teacher_name || x.teacher || '').toString().toLowerCase()
                  const room = (x.room || '').toString().toLowerCase()
                  return course.includes(q) || teacher.includes(q) || room.includes(q)
                })
              }
              const total = filtered.length
              const pages = Math.max(1, Math.ceil(total / pageSize))
              const currentPage = Math.min(Math.max(1, page), pages)
              return (
                <div className="flex items-center justify-between mt-3">
                  <div className="text-sm">Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, total)} of {total}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 border rounded disabled:opacity-50">Prev</button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: pages }).map((_, idx) => (
                        <button key={idx} onClick={() => setPage(idx + 1)} className={`px-2 py-1 border rounded ${currentPage === idx + 1 ? 'bg-slate-200' : ''}`}>{idx + 1}</button>
                      ))}
                    </div>
                    <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={currentPage === pages} className="px-2 py-1 border rounded disabled:opacity-50">Next</button>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {showModal && detailClass && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-3xl z-50">
            <h2 className="text-lg font-semibold mb-3 inline-block bg-indigo-100 text-indigo-800 dark:bg-slate-700 dark:text-indigo-200 px-3 py-1 rounded">Class Details</h2>
            <div className="mb-3">
              <div><strong>Course:</strong> {detailClass.course_name || detailClass.course_id}</div>
              <div><strong>Teacher(s):</strong> {Array.isArray(classTeachers) && classTeachers.length ? classTeachers.map(t => t.name).join(', ') : '—'}</div>
              <div><strong>Room:</strong> {detailClass.room}</div>
              <div><strong>Schedule:</strong> {detailClass.schedule}</div>
              <div><strong>Registration open:</strong> {detailClass.registration_open_date ? new Date(detailClass.registration_open_date).toLocaleDateString() : '—'}</div>
              <div><strong>Registration close:</strong> {detailClass.registration_close_date ? new Date(detailClass.registration_close_date).toLocaleDateString() : '—'}</div>
              <div><strong>Course start:</strong> {detailClass.course_start_date ? new Date(detailClass.course_start_date).toLocaleDateString() : '—'}</div>
              <div><strong>Course end:</strong> {detailClass.course_end_date ? new Date(detailClass.course_end_date).toLocaleDateString() : '—'}</div>
            </div>
            <div className="mb-3">
              <div className="flex items-center justify-between"><h3 className="font-semibold">Enrolled students</h3><div><button title="Add student" onClick={() => openAddStudent(detailClass)} className="p-2 bg-green-600 text-white rounded hover:opacity-90"><FiUserPlus /></button></div></div>
              <table className="min-w-full table-auto mt-2">
                <thead><tr className="text-left"><th className="p-2">No.</th><th>Name</th><th>Phone</th><th>Email</th><th>Actions</th></tr></thead>
                <tbody>
                  {classStudents.map((s, idx) => (
                    <tr key={s.student_id} className="border-t"><td className="p-2">{idx + 1}</td><td className="p-2">{s.name}</td><td>{s.phone}</td><td>{s.email}</td><td className="p-2"><button title="Remove student" onClick={() => removeStudentFromClass(s.student_id)} className="p-2 bg-red-500 text-white rounded hover:opacity-90"><FiTrash2 /></button></td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between"><h3 className="font-semibold">Assigned teachers</h3><div><button title="Add teacher" onClick={() => openAddTeacher(detailClass)} className="p-2 bg-indigo-600 text-white rounded hover:opacity-90"><FiUserCheck /></button></div></div>
              <table className="min-w-full table-auto mt-2">
                <thead><tr className="text-left"><th className="p-2">No.</th><th>Name</th><th>Phone</th><th>Email</th><th>Actions</th></tr></thead>
                <tbody>
                  {classTeachers.map((t, idx) => (
                    <tr key={t.teacher_id} className="border-t"><td className="p-2">{idx + 1}</td><td className="p-2">{t.name}</td><td>{t.phone}</td><td>{t.email}</td><td className="p-2"><button title="Remove teacher" onClick={() => removeTeacherFromClass(t.teacher_id)} className="p-2 bg-red-500 text-white rounded hover:opacity-90"><FiTrash2 /></button></td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowModal(false)} className="px-3 py-2 border rounded">Close</button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => { setShowCreateModal(false); setEditingId(null); }}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-lg z-60">
            <h3 className="text-lg font-semibold mb-3">{editingId ? 'Edit Class' : 'Create New Class'}</h3>
            <form onSubmit={submitCreateClass} className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Course</label>
                <select value={createForm.course_id} onChange={e => setCreateForm(f => ({ ...f, course_id: e.target.value }))} className="p-2 border rounded w-full">
                  <option value="">-- choose course --</option>
                  {courses.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Primary teacher (optional)</label>
                <select value={createForm.teacher_id} onChange={e => setCreateForm(f => ({ ...f, teacher_id: e.target.value }))} className="p-2 border rounded w-full">
                  <option value="">-- none --</option>
                  {teachers.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Room</label>
                <input value={createForm.room} onChange={e => setCreateForm(f => ({ ...f, room: e.target.value }))} className="p-2 border rounded w-full" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Start time</label>
                  <input type="time" value={createForm.start_time} onChange={e => setCreateForm(f => ({ ...f, start_time: e.target.value }))} className="p-2 border rounded w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End time</label>
                  <input type="time" value={createForm.end_time} onChange={e => setCreateForm(f => ({ ...f, end_time: e.target.value }))} className="p-2 border rounded w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Registration open</label>
                  <input type="date" value={createForm.registration_open_date} onChange={e => setCreateForm(f => ({ ...f, registration_open_date: e.target.value }))} className="p-2 border rounded w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Registration close</label>
                  <input type="date" value={createForm.registration_close_date} onChange={e => setCreateForm(f => ({ ...f, registration_close_date: e.target.value }))} className="p-2 border rounded w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Course start</label>
                  <input type="date" value={createForm.course_start_date} onChange={e => setCreateForm(f => ({ ...f, course_start_date: e.target.value }))} className="p-2 border rounded w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Course end</label>
                  <input type="date" value={createForm.course_end_date} onChange={e => setCreateForm(f => ({ ...f, course_end_date: e.target.value }))} className="p-2 border rounded w-full" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => { setShowCreateModal(false); setEditingId(null); }} className="px-3 py-2 border rounded">Cancel</button>
                <button type="submit" className="px-3 py-2 bg-green-600 text-white rounded">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowAddStudent(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-2xl z-60">
            <h3 className="text-lg font-semibold mb-3">Add student to class</h3>
            <form onSubmit={handleAddStudent} className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Select existing student</label>
                <div className="relative">
                  <input
                    placeholder="Search or pick a student..."
                    value={studentSearch}
                    onChange={e => { setStudentSearch(e.target.value); setShowStudentDropdown(true) }}
                    onFocus={() => setShowStudentDropdown(true)}
                    className="p-2 border rounded w-full"
                  />
                  <div className={`absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border rounded max-h-48 overflow-auto z-30 ${showStudentDropdown ? '' : 'hidden'}`}>
                    {students
                      .filter(s => !classStudents.some(cs => cs.student_id === s.id))
                      .filter(s => (s.name || '').toLowerCase().includes(studentSearch.toLowerCase()) || (s.email || '').toLowerCase().includes(studentSearch.toLowerCase()) || (s.phone || '').toLowerCase().includes(studentSearch.toLowerCase()))
                      .map(s => (
                        <div key={s.id} onMouseDown={() => { setSelectedStudentId(String(s.id)); setStudentSearch(s.name || ''); setShowStudentDropdown(false) }} className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer">
                          <div className="font-medium">{s.name}</div>
                          <div className="text-sm text-slate-500">{s.email || s.phone}</div>
                        </div>
                      ))}
                    {students.filter(s => !classStudents.some(cs => cs.student_id === s.id)).filter(s => (s.name || '').toLowerCase().includes(studentSearch.toLowerCase()) || (s.email || '').toLowerCase().includes(studentSearch.toLowerCase()) || (s.phone || '').toLowerCase().includes(studentSearch.toLowerCase())).length === 0 && (
                      <div className="p-2 text-sm text-slate-500">No results</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-2">
                <div className="text-sm font-medium mb-1">Or create new student</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input placeholder="Name" value={newStudent.name} onChange={e => setNewStudent(n => ({ ...n, name: e.target.value }))} className="p-2 border rounded" />
                  <input placeholder="Email" value={newStudent.email} onChange={e => setNewStudent(n => ({ ...n, email: e.target.value }))} className="p-2 border rounded" />
                  <input placeholder="Phone" value={newStudent.phone} onChange={e => setNewStudent(n => ({ ...n, phone: e.target.value }))} className="p-2 border rounded" />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowAddStudent(false)} className="px-3 py-2 border rounded">Cancel</button>
                <button type="submit" className="px-3 py-2 bg-green-600 text-white rounded">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAddTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowAddTeacher(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md z-60">
            <h3 className="text-lg font-semibold mb-3">Assign teacher to class</h3>
            <form onSubmit={handleAddTeacher} className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Select existing teacher</label>
                <div className="relative">
                  <input
                    placeholder="Search or pick a teacher..."
                    value={teacherSearch}
                    onChange={e => { setTeacherSearch(e.target.value); setShowTeacherDropdown(true) }}
                    onFocus={() => setShowTeacherDropdown(true)}
                    className="p-2 border rounded w-full"
                  />
                  <div className={`absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border rounded max-h-48 overflow-auto z-30 ${showTeacherDropdown ? '' : 'hidden'}`}>
                    {teachers
                      .filter(t => !classTeachers.some(ct => ct.teacher_id === t.id))
                      .filter(t => (t.name || '').toLowerCase().includes(teacherSearch.toLowerCase()) || (t.email || '').toLowerCase().includes(teacherSearch.toLowerCase()) || (t.phone || '').toLowerCase().includes(teacherSearch.toLowerCase()))
                      .map(t => (
                        <div key={t.id} onMouseDown={() => { setSelectedTeacherId(String(t.id)); setTeacherSearch(t.name || ''); setShowTeacherDropdown(false) }} className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer">
                          <div className="font-medium">{t.name}</div>
                          <div className="text-sm text-slate-500">{t.email || t.phone}</div>
                        </div>
                      ))}
                    {teachers.filter(t => !classTeachers.some(ct => ct.teacher_id === t.id)).filter(t => (t.name || '').toLowerCase().includes(teacherSearch.toLowerCase()) || (t.email || '').toLowerCase().includes(teacherSearch.toLowerCase()) || (t.phone || '').toLowerCase().includes(teacherSearch.toLowerCase())).length === 0 && (
                      <div className="p-2 text-sm text-slate-500">No results</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowAddTeacher(false)} className="px-3 py-2 border rounded">Cancel</button>
                <button type="submit" className="px-3 py-2 bg-indigo-600 text-white rounded">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
