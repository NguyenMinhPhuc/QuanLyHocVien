import { useEffect, useState } from 'react'
import { authFetch } from '../lib/auth'
import { t } from '../lib/i18n'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const res = await authFetch('/api/dashboard')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setStats(data)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  const [classes, setClasses] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [classId, setClassId] = useState('')
  const [revenue, setRevenue] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState('')
  const [modalItems, setModalItems] = useState([])
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => { load() }, [])

  async function openDetail(type) {
    setModalType(type)
    setModalOpen(true)
    setModalLoading(true)
    setModalItems([])
    try {
      let url = ''
      if (type === 'students') url = '/api/students?limit=200'
      else if (type === 'teachers') url = '/api/teachers?limit=200'
      else if (type === 'classes') url = '/api/classes'
      else if (type === 'schedules') url = '/api/schedules?page=1&pageSize=200'
      const res = await authFetch(url)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      const items = data.rows || data
      setModalItems(items || [])
    } catch (e) {
      console.error('[dashboard] openDetail error', e.message)
      setModalItems([])
    } finally {
      setModalLoading(false)
    }
  }

  useEffect(() => {
    // load classes for filter
    authFetch('/api/classes').then(r => r.ok ? r.json() : []).then(setClasses).catch(() => setClasses([]))
  }, [])

  useEffect(() => {
    async function loadRevenue() {
      try {
        const params = new URLSearchParams({ year: String(year) })
        if (classId) params.set('classId', classId)
        const res = await authFetch('/api/dashboard/revenue?' + params.toString())
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setRevenue(data.rows)
      } catch (e) { /* ignore */ }
    }
    loadRevenue()
  }, [year, classId])

  function getClassLabel(id, item) {
    if (!id && item) {
      return item.name || item.course_name || item.class_name || ('Class ' + (item.id || ''))
    }
    const found = classes.find(c => String(c.id) === String(id))
    if (found) return found.name || found.course_name || ('Class ' + found.id)
    return 'Class ' + id
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">{t('dashboard.title', 'Dashboard')}</h1>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {loading && <div>{t('actions.loading', 'Đang tải...')}</div>}
      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded shadow bg-indigo-600 text-white">
              <div className="text-sm opacity-80">{t('dashboard.total_students', 'Tổng học viên')}</div>
              <div onClick={() => openDetail('students')} className="text-3xl font-bold cursor-pointer">{stats.totalStudents}</div>
            </div>
            <div className="p-4 rounded shadow bg-emerald-600 text-white">
              <div className="text-sm opacity-80">{t('dashboard.total_teachers', 'Tổng giáo viên')}</div>
              <div onClick={() => openDetail('teachers')} className="text-3xl font-bold cursor-pointer">{stats.totalTeachers}</div>
            </div>
            <div className="p-4 rounded shadow bg-amber-500 text-white">
              <div className="text-sm opacity-80">{t('dashboard.total_classes', 'Tổng lớp')}</div>
              <div onClick={() => openDetail('classes')} className="text-3xl font-bold cursor-pointer">{stats.totalClasses} <span className="text-sm opacity-80">({t('dashboard.active', 'Hoạt động')}: {stats.activeClasses})</span></div>
            </div>
            <div className="p-4 rounded shadow bg-rose-600 text-white">
              <div className="text-sm opacity-80">{t('dashboard.schedules', 'Lịch')}</div>
              <div onClick={() => openDetail('schedules')} className="text-3xl font-bold cursor-pointer">{stats.upcomingSessions} <span className="text-sm opacity-80">{t('dashboard.upcoming', 'Sắp tới')}</span></div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white rounded shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('dashboard.revenue', 'Doanh thu học phí theo tháng')}</h2>
              <div className="flex items-center gap-2">
                <select value={year} onChange={e => setYear(Number(e.target.value))} className="border px-2 py-1 rounded">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const y = new Date().getFullYear() - i
                    return <option key={y} value={y}>{y}</option>
                  })}
                </select>
                <select value={classId} onChange={e => setClassId(e.target.value)} className="border px-2 py-1 rounded">
                  <option value="">{t('dashboard.all_classes', 'Tất cả lớp')}</option>
                  {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name || c.id}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <svg width="100%" height="240" viewBox="0 0 800 240">
                {/* bars */}
                {(revenue || []).map((r, idx) => {
                  const max = Math.max(...(revenue || []).map(x => x.total || 0), 1)
                  const barW = 40
                  const gap = 16
                  const x = 40 + idx * (barW + gap)
                  const h = Math.round(((r.total || 0) / max) * 160)
                  const y = 200 - h
                  return (
                    <g key={idx}>
                      <rect x={x} y={y} width={barW} height={h} rx="4" fill="#60a5fa" />
                      <text x={x + barW / 2} y={216} fontSize="12" fill="#374151" textAnchor="middle">{monthNames[idx]}</text>
                      <text x={x + barW / 2} y={y - 6} fontSize="11" fill="#111827" textAnchor="middle">{(r.total || 0).toLocaleString()}</text>
                    </g>
                  )
                })}
                {/* axes */}
                <line x1="32" y1="200" x2="760" y2="200" stroke="#e5e7eb" strokeWidth="1" />
              </svg>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white rounded shadow">
            <div className="text-sm text-slate-500">{t('dashboard.top_classes', 'Lớp đông nhất')}</div>
            <div>
              <table className="min-w-full mt-2 text-sm">
                <thead><tr><th className="text-left">{t('dashboard.class', 'Lớp')}</th><th className="text-left">{t('dashboard.teacher', 'Giáo viên')}</th><th className="text-right">{t('dashboard.students', 'Học viên')}</th></tr></thead>
                <tbody>
                  {(stats.topClasses || []).map(c => (
                    <tr key={c.id} className="border-t"><td className="py-1">{c.course_name || ('Class ' + c.id)}</td><td className="py-1">{c.teacher_name || '-'}</td><td className="py-1 text-right">{c.student_count || 0}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-lg w-11/12 md:w-3/4 max-h-[80vh] overflow-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{modalType === 'students' ? t('dashboard.students', 'Học viên') : modalType === 'teachers' ? t('dashboard.teachers', 'Giáo viên') : modalType === 'classes' ? t('dashboard.classes', 'Lớp') : t('dashboard.schedules', 'Lịch')}</h3>
              <button className="text-sm px-3 py-1 rounded border" onClick={() => setModalOpen(false)}>{t('actions.close', 'Đóng')}</button>
            </div>
            {modalLoading && <div>{t('actions.loading', 'Đang tải...')}</div>}
            {!modalLoading && (
              <div>
                {modalType === 'students' && (
                  <table className="min-w-full text-sm">
                    <thead><tr className="text-left"><th>{t('students.name', 'Tên')}</th><th>{t('students.phone', 'SĐT')}</th><th>{t('students.email', 'Email')}</th></tr></thead>
                    <tbody>{modalItems.map(s => <tr key={s.id} className="border-t"><td className="py-1">{s.name}</td><td className="py-1">{s.phone}</td><td className="py-1">{s.email}</td></tr>)}</tbody>
                  </table>
                )}
                {modalType === 'teachers' && (
                  <table className="min-w-full text-sm">
                    <thead><tr className="text-left"><th>{t('teachers.name', 'Tên')}</th><th>{t('teachers.phone', 'SĐT')}</th><th>{t('teachers.email', 'Email')}</th></tr></thead>
                    <tbody>{modalItems.map(s => <tr key={s.id} className="border-t"><td className="py-1">{s.name}</td><td className="py-1">{s.phone}</td><td className="py-1">{s.email}</td></tr>)}</tbody>
                  </table>
                )}
                {modalType === 'classes' && (
                  <table className="min-w-full text-sm">
                    <thead><tr className="text-left"><th>{t('dashboard.class', 'Lớp')}</th><th>{t('dashboard.teacher', 'Giáo viên')}</th><th>{t('dashboard.students', 'Học viên')}</th></tr></thead>
                    <tbody>{modalItems.map(s => <tr key={s.id} className="border-t"><td className="py-1">{getClassLabel(s.id, s)}</td><td className="py-1">{s.teacher_name}</td><td className="py-1">{s.student_count || ''}</td></tr>)}</tbody>
                  </table>
                )}
                {modalType === 'schedules' && (
                  <table className="min-w-full text-sm">
                    <thead><tr className="text-left"><th>{t('schedules.col.class', 'Lớp')}</th><th>{t('schedules.col.weekday', 'Thứ')}</th><th>{t('schedules.col.start', 'Bắt đầu')}</th><th>{t('schedules.col.end', 'Kết thúc')}</th></tr></thead>
                    <tbody>{modalItems.map(s => <tr key={s.id} className="border-t"><td className="py-1">{getClassLabel(s.class_id, s)}</td><td className="py-1">{s.weekday}</td><td className="py-1">{s.start_time || s.start}</td><td className="py-1">{s.end_time || s.end}</td></tr>)}</tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


