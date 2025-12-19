import { useEffect, useState } from 'react'
import { authFetch } from '../lib/auth'
import { t } from '../lib/i18n'

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [sortField, setSortField] = useState('id')
  const [sortDir, setSortDir] = useState('asc')
  const [classesList, setClassesList] = useState([])
  const [exportClassId, setExportClassId] = useState('')
  const [filterClassId, setFilterClassId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyTarget, setCopyTarget] = useState(null)
  const [copyCount, setCopyCount] = useState(1)
  const [editData, setEditData] = useState({ id: null, class_id: '', weekday: 0, start_time: '08:00', end_time: '09:30' })
  function formatDateForInput(v) {
    if (!v) return ''
    try {
      const s = String(v)
      if (s.includes('T')) return s.split('T')[0]
      // handle YYYY-MM-DD or other
      if (s.match(/\d{4}-\d{2}-\d{2}/)) return s.match(/\d{4}-\d{2}-\d{2}/)[0]
      const d = new Date(s)
      if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    } catch (e) { }
    return ''
  }
  const weekdayLabels = [t('schedules.weekday.0', 'Chủ nhật'), t('schedules.weekday.1', 'Thứ 2'), t('schedules.weekday.2', 'Thứ 3'), t('schedules.weekday.3', 'Thứ 4'), t('schedules.weekday.4', 'Thứ 5'), t('schedules.weekday.5', 'Thứ 6'), t('schedules.weekday.6', 'Thứ 7')]

  function dbWeekdayToIndex(w) {
    if (w === null || typeof w === 'undefined' || w === '') return null
    const n = Number(w)
    if (isNaN(n)) return null
    const idx = n - 1
    return idx >= 0 && idx <= 6 ? idx : null
  }

  function indexToDbWeekday(i) {
    const n = Number(i)
    if (isNaN(n)) return null
    return n + 1
  }

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q)
      if (filterClassId) params.set('classId', filterClassId)
      params.set('page', page)
      params.set('pageSize', pageSize)
      if (sortField) params.set('sortField', sortField)
      if (sortDir) params.set('sortDir', sortDir)
      const [sres, cres] = await Promise.all([authFetch('/api/schedules?' + params.toString()), authFetch('/api/classes')])
      if (!sres.ok) throw new Error('Failed to load schedules')
      const sdata = await sres.json()
      const srows = sdata && sdata.rows ? sdata.rows : sdata
      setSchedules(srows || [])
      setTotal(sdata && sdata.total ? Number(sdata.total) : 0)
      if (cres.ok) {
        let crows = await cres.json()
        // support different response shapes: array, { rows: [] }, { items: [] }
        if (!Array.isArray(crows)) {
          if (crows && Array.isArray(crows.rows)) crows = crows.rows
          else if (crows && Array.isArray(crows.items)) crows = crows.items
          else crows = []
        }
        setClassesList(crows || [])
      } else {
        setClassesList([])
      }
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { load() }, [q, page, pageSize, sortField, sortDir, filterClassId])

  function getClassName(id) {
    const c = (classesList || []).find(x => Number(x.id) === Number(id))
    return c ? (c.course_name || c.name || c.course || (`Class ${id}`)) : id
  }

  function formatTime(v) {
    if (!v) return ''
    try {
      // handle Date objects (some DB drivers return TIME as Date at epoch)
      if (v instanceof Date) {
        const year = v.getFullYear();
        // if it's a time-only value (year is 1970 or 1900), read UTC to avoid timezone shift
        const hh = (year <= 1970) ? v.getUTCHours() : v.getHours();
        const mm = (year <= 1970) ? v.getUTCMinutes() : v.getMinutes();
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
      }
      const s = String(v)
      if (s.includes('T')) {
        const d = new Date(s)
        if (!isNaN(d.getTime())) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      // time in HH:MM:SS or HH:MM
      const parts = s.split(':')
      if (parts.length >= 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
      return s.slice(0, 5)
    } catch (e) { return v }
  }

  function parseTimeForInput(v) {
    if (!v) return ''
    try {
      // handle Date objects from DB: use UTC for time-only epoch dates
      if (v instanceof Date) {
        const year = v.getFullYear();
        const hh = (year <= 1970) ? v.getUTCHours() : v.getHours();
        const mm = (year <= 1970) ? v.getUTCMinutes() : v.getMinutes();
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
      }
      const s = String(v)
      if (s.includes('T')) {
        const d = new Date(s)
        if (!isNaN(d.getTime())) {
          const hh = String(d.getHours()).padStart(2, '0')
          const mm = String(d.getMinutes()).padStart(2, '0')
          return `${hh}:${mm}`
        }
      }
      const parts = s.split(':')
      if (parts.length >= 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
      return s.slice(0, 5)
    } catch (e) { return '' }
  }

  function openCreate() { setEditData({ id: null, class_id: '', weekdays: [], weekday: 0, schedule_date: '', start_time: '08:00', end_time: '09:30' }); setShowModal(true) }
  function openEdit(s) {
    setEditData({
      id: s.id,
      class_id: s.class_id,
      weekdays: Array.isArray(s.weekdays) ? s.weekdays.map(dbWeekdayToIndex).filter(x => x !== null) : (typeof s.weekday !== 'undefined' && s.weekday !== null ? [dbWeekdayToIndex(s.weekday)] : []),
      weekday: dbWeekdayToIndex(s.weekday),
      schedule_date: formatDateForInput(s.schedule_date || s.date || s.schedule_date),
      start_time: parseTimeForInput(s.start_time),
      end_time: parseTimeForInput(s.end_time)
    })
    setShowModal(true)
  }

  async function submit(e) {
    e.preventDefault()
    try {
      // require explicit date
      if (!editData.schedule_date) {
        setError(t('schedules.error.date_required', 'Vui lòng chọn ngày'))
        return
      }
      // build payload
      const payload = { class_id: Number(editData.class_id), start_time: editData.start_time, end_time: editData.end_time, schedule_date: editData.schedule_date }
      // convert UI weekday indexes (0..6) to DB format (1..7)
      if (Array.isArray(editData.weekdays) && editData.weekdays.length > 0) payload.weekdays = editData.weekdays.map(n => indexToDbWeekday(n))
      else payload.weekday = indexToDbWeekday(editData.weekday)
      let res
      if (editData.id) res = await authFetch(`/api/schedules/${editData.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      else res = await authFetch('/api/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      // defensive parse: try json, fallback to text for better diagnostics
      if (!res || !res.ok) {
        let bodyText = ''
        try { bodyText = await res.text() } catch (e) { bodyText = String(e) }
        console.error('[schedules.submit] non-ok response', res && res.status, bodyText)
        const parsed = (() => { try { return JSON.parse(bodyText); } catch (_) { return null } })()
        throw new Error((parsed && parsed.error) ? parsed.error : (`Server error: ${res && res.status} ${bodyText}`))
      }
      setShowModal(false)
      await load()
    } catch (err) { setError(err.message) }
  }

  async function remove(id) {
    // use window.confirm explicitly (avoid SSR ambiguity)
    if (!window.confirm(t('class_students.confirm_delete', 'Xác nhận xóa?'))) return
    try {
      const res = await authFetch(`/api/schedules/${id}`, { method: 'DELETE' })
      if (!res || !res.ok) {
        let bodyText = ''
        try { bodyText = await res.text() } catch (e) { bodyText = String(e) }
        console.error('[schedules.remove] delete failed', res && res.status, bodyText)
        throw new Error(`Delete failed: ${res && res.status}`)
      }
      await load()
    } catch (err) { setError(err.message) }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{t('schedules.title', 'Quản lý lịch')}</h1>
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-xs">
            <input placeholder={t('schedules.search.placeholder', 'Tìm kiếm...')} value={q} onChange={e => { setQ(e.target.value); setPage(1) }} className="p-2 pr-8 border rounded w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
            {q && <button onClick={() => { setQ(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700">×</button>}
          </div>
          <select value={filterClassId} onChange={e => { setFilterClassId(e.target.value); setPage(1) }} className="p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100">
            <option value="">{t('schedules.filter.all_classes', '-- Tất cả lớp --')}</option>
            {(classesList || []).map(c => (<option key={c.id} value={c.id}>{c.course_name || c.name || (`Class ${c.id}`)}</option>))}
          </select>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }} className="p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100">
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <button onClick={openCreate} className="px-3 py-2 bg-green-600 text-white rounded">{t('schedules.create', 'Tạo lịch')}</button>
          <select value={exportClassId} onChange={e => setExportClassId(e.target.value)} className="p-2 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100">
            <option value="">{t('schedules.export.all', 'Tất cả lớp')}</option>
            {(classesList || []).map(c => (<option key={c.id} value={c.id}>{c.course_name || c.name || (`Class ${c.id}`)}</option>))}
          </select>
          <button onClick={async () => {
            try {
              const params = new URLSearchParams();
              if (exportClassId) params.set('classId', exportClassId);
              const res = await authFetch('/api/schedules/export.ics' + (params.toString() ? ('?' + params.toString()) : ''))
              if (!res.ok) throw new Error('Export failed')
              const blob = await res.blob()
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'schedules.ics'
              document.body.appendChild(a)
              a.click()
              a.remove()
              window.URL.revokeObjectURL(url)
            } catch (err) { setError(err.message) }
          }} className="px-3 py-2 border rounded">{t('schedules.export_button', 'Export .ics')}</button>
        </div>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <div className="bg-white dark:bg-slate-800 dark:text-slate-100 p-4 rounded">
        {loading ? <div>{t('actions.loading', 'Đang tải...')}</div> : (
          <>
            <table className="min-w-full table-auto">
              <thead>
                <tr className="text-left">
                  <th className="p-2">{t('debts.table.no', 'STT')}</th>
                  <th className="p-2 cursor-pointer" onClick={() => { setSortField('class_id'); setSortDir(sortField === 'class_id' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc') }}>{t('schedules.col.class', 'Lớp')}</th>
                  <th className="p-2 cursor-pointer" onClick={() => { setSortField('schedule_date'); setSortDir(sortField === 'schedule_date' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc') }}>{t('schedules.col.date', 'Ngày')}</th>
                  <th className="p-2 cursor-pointer" onClick={() => { setSortField('weekday'); setSortDir(sortField === 'weekday' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc') }}>{t('schedules.col.weekday', 'Thứ')}</th>
                  <th className="p-2 cursor-pointer" onClick={() => { setSortField('start_time'); setSortDir(sortField === 'start_time' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc') }}>{t('schedules.col.start', 'Bắt đầu')}</th>
                  <th className="p-2 cursor-pointer" onClick={() => { setSortField('end_time'); setSortDir(sortField === 'end_time' ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc') }}>{t('schedules.col.end', 'Kết thúc')}</th>
                  <th>{t('actions.actions', 'Thao tác')}</th>
                </tr>
              </thead>
              <tbody>{(schedules || []).map((s, idx) => {
                const dateValue = s && (s.schedule_date || s.date) ? new Date(s.schedule_date || s.date).toLocaleDateString() : '-'
                let wdIndex = null
                if (typeof s.weekday !== 'undefined' && s.weekday !== null) wdIndex = dbWeekdayToIndex(s.weekday)
                else if (s.schedule_date) wdIndex = new Date(s.schedule_date).getDay()
                const weekdayValue = (wdIndex !== null && typeof wdIndex !== 'undefined') ? weekdayLabels[wdIndex] : '-'
                return (
                  <tr key={s.id} className="border-t">
                    <td className="p-2">{idx + 1}</td>
                    <td className="p-2">
                      <div>{getClassName(s.class_id)}</div>
                      <div className="text-sm text-slate-500">
                        {s.teacher_name || ''}{s.teacher_phone ? (` • ${s.teacher_phone}`) : ''}
                      </div>
                    </td>
                    <td className="p-2">{dateValue}</td>
                    <td className="p-2">{weekdayValue}</td>
                    <td className="p-2">{formatTime(s.start_time)}</td>
                    <td className="p-2">{formatTime(s.end_time)}</td>
                    <td className="p-2">
                      <button onClick={() => openEdit(s)} className="mr-2 px-2 py-1 bg-yellow-500 text-white rounded">{t('actions.edit', 'Sửa')}</button>
                      <button onClick={() => remove(s.id)} className="mr-2 px-2 py-1 bg-red-600 text-white rounded">{t('actions.delete', 'Xóa')}</button>
                      <button onClick={() => { setCopyTarget(s); setCopyCount(1); setShowCopyModal(true) }} className="px-2 py-1 bg-blue-600 text-white rounded">{t('schedules.copy', 'Sao chép')}</button>
                    </td>
                  </tr>
                )
              })}</tbody>
            </table>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm">{t('schedules.pagination.total', 'Tổng')}: {total}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(1)} disabled={page <= 1} className="px-2 py-1 border rounded">{t('pagination.first', 'Đầu')}</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-2 py-1 border rounded">{t('pagination.prev', 'Trước')}</button>
                <div className="px-2">{page}</div>
                <button onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total} className="px-2 py-1 border rounded">{t('pagination.next', 'Sau')}</button>
                <button onClick={() => setPage(Math.max(1, Math.ceil(total / pageSize)))} disabled={page * pageSize >= total} className="px-2 py-1 border rounded">{t('pagination.last', 'Cuối')}</button>
              </div>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 dark:text-slate-100 p-6 rounded w-full max-w-md z-60">
            <h3 className="text-lg font-semibold mb-2">{editData.id ? t('schedules.edit_title', 'Sửa lịch') : t('schedules.create_title', 'Tạo lịch')}</h3>
            <form onSubmit={submit} className="grid gap-2">
              <div>
                <label className="block text-sm">{t('schedules.form.class', 'Lớp')}</label>
                <select value={editData.class_id} onChange={e => setEditData(d => ({ ...d, class_id: e.target.value }))} className="p-2 border rounded w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                  <option value="">{t('schedules.form.select_class', '-- Chọn lớp --')}</option>
                  {(classesList || []).map(c => (
                    <option key={c.id} value={c.id}>{c.course_name || c.name || c.course || (`Class ${c.id}`)}</option>
                  ))}
                </select>
                {(classesList || []).length === 0 && <div className="text-sm text-slate-500 mt-1">{t('schedules.no_classes', 'Chưa có lớp nào. Vui lòng tạo lớp trước khi thêm lịch.')}</div>}
              </div>
              <div>
                <label className="block text-sm">{t('schedules.form.weekdays', 'Chọn ngày lặp lại')}</label>
                <div className="grid grid-cols-4 gap-2">
                  {weekdayLabels.map((label, idx) => (
                    <label key={idx} className="flex items-center gap-2">
                      <input type="checkbox" checked={Array.isArray(editData.weekdays) ? editData.weekdays.includes(idx) : Number(editData.weekday) === idx} onChange={e => {
                        const checked = e.target.checked
                        setEditData(d => {
                          const cur = Array.isArray(d.weekdays) ? [...d.weekdays] : [d.weekday]
                          if (checked) {
                            if (!cur.includes(idx)) cur.push(idx)
                          } else {
                            const i = cur.indexOf(idx); if (i !== -1) cur.splice(i, 1)
                          }
                          return { ...d, weekdays: cur }
                        })
                      }} />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm">{t('schedules.form.specific_date', 'Ngày cụ thể (tùy chọn)')}</label>
                <input required type="date" value={editData.schedule_date || ''} onChange={e => setEditData(d => ({ ...d, schedule_date: e.target.value }))} className="p-2 border rounded w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
                <div className="text-xs text-slate-500 mt-1">{t('schedules.form.specific_date_help', 'Nếu đặt ngày, lịch này sẽ là buổi cụ thể thay vì lặp theo thứ')}</div>
              </div>
              <div>
                <label className="block text-sm">{t('schedules.form.start_time', 'Bắt đầu')}</label>
                <input type="time" value={editData.start_time} onChange={e => setEditData(d => ({ ...d, start_time: e.target.value }))} className="p-2 border rounded w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <label className="block text-sm">{t('schedules.form.end_time', 'Kết thúc')}</label>
                <input type="time" value={editData.end_time} onChange={e => setEditData(d => ({ ...d, end_time: e.target.value }))} className="p-2 border rounded w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
              </div>
              <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowModal(false)} className="px-3 py-2 border rounded">{t('actions.cancel', 'Hủy')}</button><button type="submit" className="px-3 py-2 bg-green-600 text-white rounded">{t('actions.confirm', 'Lưu')}</button></div>
            </form>
          </div>
        </div>
      )}
      {showCopyModal && copyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowCopyModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 dark:text-slate-100 p-6 rounded w-full max-w-sm z-60">
            <h3 className="text-lg font-semibold mb-2">{t('schedules.copy_title', 'Sao chép lịch')}</h3>
            <div className="mb-2">{t('schedules.copy_help', 'Chọn số buổi sẽ được tạo tiếp theo hàng tuần')}</div>
            <div className="grid gap-2">
              <div>
                <label className="block text-sm">{t('schedules.copy.count', 'Số buổi')}</label>
                <input type="number" min={1} value={copyCount} onChange={e => setCopyCount(Math.max(1, Number(e.target.value || 1)))} className="p-2 border rounded w-full" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCopyModal(false)} className="px-3 py-2 border rounded">{t('actions.cancel', 'Hủy')}</button>
                <button type="button" onClick={async () => {
                  try {
                    const res = await authFetch(`/api/schedules/${copyTarget.id}/copy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ count: copyCount }) })
                    if (!res.ok) {
                      let text = ''
                      try { text = await res.text() } catch (e) { text = e.message }
                      throw new Error(text || 'Copy failed')
                    }
                    setShowCopyModal(false)
                    await load()
                  } catch (err) { setError(err.message) }
                }} className="px-3 py-2 bg-blue-600 text-white rounded">{t('schedules.copy_confirm', 'Sao chép')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
