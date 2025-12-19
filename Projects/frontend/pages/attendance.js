import { useEffect, useState } from 'react'
import { authFetch } from '../lib/auth'
import { FiClock, FiCheckSquare, FiXSquare } from 'react-icons/fi'

export default function AttendancePage() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // list controls
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [showModal, setShowModal] = useState(false)
  const [activeClass, setActiveClass] = useState(null)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [students, setStudents] = useState([])
  const [saving, setSaving] = useState(false)

  async function loadMyClasses(forDate = date) {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (forDate) params.set('date', forDate)
      const res = await authFetch('/api/attendance/my-classes' + (params.toString() ? `?${params.toString()}` : ''))
      if (!res.ok) {
        let body = ''
        try { body = await res.json() } catch (e) { body = await res.text().catch(() => '') }
        throw new Error(`Failed to load classes (status ${res.status}) ${typeof body === 'string' ? body : JSON.stringify(body)}`)
      }
      const data = await res.json()
      setClasses(data || [])
    } catch (err) { setError(err.message || String(err)) } finally { setLoading(false) }
  }

  useEffect(() => { loadMyClasses() }, [])
  useEffect(() => { setPage(1) }, [query, sortKey, sortDir, pageSize])

  async function openAttendanceModal(c) {
    setError(null)
    setActiveClass(c)
    setShowModal(true)
    await loadStudentsForClass(c.id, date)
  }

  async function loadStudentsForClass(classId, forDate) {
    setLoading(true)
    try {
      const res = await authFetch(`/api/attendance/class/${classId}/students?date=${forDate}`)
      if (!res.ok) {
        let body = ''
        try { body = await res.json() } catch (e) { body = await res.text().catch(() => '') }
        throw new Error(`Failed to load students (status ${res.status}) ${typeof body === 'string' ? body : JSON.stringify(body)}`)
      }
      const payload = await res.json()
      // map students to local model with status
      const list = (payload.students || []).map(s => ({ student_id: s.student_id, name: s.name, phone: s.phone, status: (s.attendance && s.attendance.status) || 'absent', checkin_time: (s.attendance && s.attendance.checkin_time) || null }))
      setStudents(list)
    } catch (err) { setError(err.message || String(err)) } finally { setLoading(false) }
  }

  function setStudentStatus(index, status) {
    setStudents(prev => prev.map((s, i) => i === index ? { ...s, status } : s))
  }

  // Filtering, sorting, pagination for class list
  const processedClasses = () => {
    let arr = Array.isArray(classes) ? [...classes] : []
    if (query) {
      const q = query.toLowerCase()
      arr = arr.filter(c => (c.name || '').toLowerCase().includes(q) || (c.course_name || '').toLowerCase().includes(q))
    }
    arr.sort((a, b) => {
      const val = (key) => {
        if (key === 'students') return a.student_count || 0
        if (key === 'present') return a.present_count || 0
        if (key === 'absent') return a.absent_count || 0
        return (a[key] || '').toString().toLowerCase()
      }
      const vala = val(sortKey)
      const valb = (() => {
        if (sortKey === 'students') return b.student_count || 0
        if (sortKey === 'present') return b.present_count || 0
        if (sortKey === 'absent') return b.absent_count || 0
        return (b[sortKey] || '').toString().toLowerCase()
      })()
      if (vala < valb) return sortDir === 'asc' ? -1 : 1
      if (vala > valb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return arr.slice(start, end)
  }

  const totalPages = () => {
    const arr = Array.isArray(classes) ? classes.filter(c => {
      if (!query) return true
      const q = query.toLowerCase()
      return (c.name || '').toLowerCase().includes(q) || (c.course_name || '').toLowerCase().includes(q)
    }) : []
    return Math.max(1, Math.ceil(arr.length / pageSize))
  }

  async function saveAttendance() {
    if (!activeClass) return
    setSaving(true)
    try {
      const records = students.map(s => ({ student_id: s.student_id, status: s.status, checkin_time: s.checkin_time }))
      const res = await authFetch(`/api/attendance/class/${activeClass.id}/records`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, records }) })
      const data = await (async () => { try { return await res.json() } catch (e) { return null } })()
      if (!res.ok) {
        const body = data || await res.text().catch(() => '')
        throw new Error(`Save failed (status ${res.status}) ${typeof body === 'string' ? body : JSON.stringify(body)}`)
      }
      setShowModal(false)
    } catch (err) { setError(err.message || String(err)) } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Điểm danh của giáo viên</h1>
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-xs">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm lớp hoặc khóa" className="p-2 pr-8 border rounded w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
            {query && <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700">×</button>}
          </div>
          <select value={sortKey} onChange={e => setSortKey(e.target.value)} className="p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100">
            <option value="name">Sắp theo lớp</option>
            <option value="course_name">Sắp theo khóa</option>
            <option value="students">Số học viên</option>
            <option value="present">Có mặt</option>
            <option value="absent">Vắng</option>
          </select>
          <select value={sortDir} onChange={e => setSortDir(e.target.value)} className="p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100">
            <option value="asc">Tăng</option>
            <option value="desc">Giảm</option>
          </select>
          <select value={pageSize} onChange={e => setPageSize(parseInt(e.target.value, 10))} className="p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100">
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
          <input type="date" value={date} onChange={e => { setDate(e.target.value); loadMyClasses(e.target.value) }} className="p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
        </div>
      </div>

      {error && <div className="mb-3 text-red-600">{error}</div>}

      <div className="bg-white dark:bg-slate-800 p-4 rounded">
        {loading ? <div>Loading...</div> : (
          <div>
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left">
                  <th className="p-2">Class</th>
                  <th className="p-2">Course</th>
                  <th className="p-2">Students</th>
                  <th className="p-2">Có mặt</th>
                  <th className="p-2">Vắng</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {processedClasses().map(c => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2">{c.name || c.course_name || `Class ${c.id}`}</td>
                    <td className="p-2">{c.course_name || ''}</td>
                    <td className="p-2">{c.student_count || 0}</td>
                    <td className="p-2">{c.present_count || 0}</td>
                    <td className="p-2">{c.absent_count || 0}</td>
                    <td className="p-2">
                      <button onClick={() => openAttendanceModal(c)} className="px-3 py-2 bg-indigo-600 text-white rounded flex items-center gap-2"><FiClock /> Điểm danh</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between mt-3">
              <div>Trang {page} / {totalPages()}</div>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 border rounded" disabled={page <= 1}>Trước</button>
                <button onClick={() => setPage(p => Math.min(totalPages(), p + 1))} className="px-3 py-1 border rounded" disabled={page >= totalPages()}>Sau</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-slate-800 p-4 rounded w-11/12 md:w-3/4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Điểm danh: {activeClass && (activeClass.name || activeClass.course_name || `Class ${activeClass.id}`)}</h2>
              <div className="flex items-center gap-2">
                <input type="date" value={date} onChange={e => { setDate(e.target.value); loadMyClasses(e.target.value); if (activeClass) loadStudentsForClass(activeClass.id, e.target.value) }} className="p-2 border rounded" />
                <button onClick={() => setShowModal(false)} className="px-3 py-1 border rounded">Đóng</button>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left bg-gray-50 dark:bg-slate-700">
                    <th className="p-2">Student</th>
                    <th className="p-2">Phone</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.student_id} className="border-t">
                      <td className="p-2">{s.name}</td>
                      <td className="p-2">{s.phone}</td>
                      <td className="p-2">
                        <select value={s.status} onChange={e => setStudentStatus(i, e.target.value)} className="p-2 border rounded">
                          <option value="present">Có mặt</option>
                          <option value="absent">Vắng</option>
                          <option value="tardy">Trễ</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-3 py-2 border rounded">Hủy</button>
              <button disabled={saving} onClick={saveAttendance} className="px-3 py-2 bg-green-600 text-white rounded">{saving ? 'Đang lưu...' : 'Lưu điểm danh'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
