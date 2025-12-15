import { useEffect, useState } from 'react'
import { authFetch } from '../lib/auth'
import { formatWithThousands } from '../lib/numberFormat'
import { t } from '../lib/i18n'

function qs(params) {
  const esc = encodeURIComponent;
  return Object.keys(params).filter(k => typeof params[k] !== 'undefined' && params[k] !== null && params[k] !== '')
    .map(k => `${esc(k)}=${esc(params[k])}`).join('&');
}

export default function DebtsPage() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [sortField, setSortField] = useState('total_outstanding')
  const [sortDir, setSortDir] = useState('DESC')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [minOutstanding, setMinOutstanding] = useState('')
  const [maxOutstanding, setMaxOutstanding] = useState('')
  const [hasDebtFilter, setHasDebtFilter] = useState('any') // any | with | without
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPayModal, setShowPayModal] = useState(false)
  const [currentStudent, setCurrentStudent] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [showClassesModal, setShowClassesModal] = useState(false)
  const [studentClasses, setStudentClasses] = useState([])
  const [loadingClasses, setLoadingClasses] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const params = {
        q: query || undefined,
        sortField,
        sortDir,
        minOutstanding: minOutstanding || undefined,
        maxOutstanding: maxOutstanding || undefined,
        hasDebt: hasDebtFilter === 'with' ? true : (hasDebtFilter === 'without' ? false : undefined),
        page,
        pageSize
      }
      const url = '/api/students/debts' + (qs(params) ? `?${qs(params)}` : '')
      const res = await authFetch(url)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to load')
      }
      const data = await res.json()
      setRows(data.rows || [])
      setTotal(data.total || 0)
      setPage(data.page || page)
      setPageSize(data.pageSize || pageSize)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [query, sortField, sortDir, page, pageSize, minOutstanding, maxOutstanding, hasDebtFilter])

  function openPay(student) {
    setCurrentStudent(student)
    setPayAmount('')
    setPayMethod('cash')
    setShowPayModal(true)
  }

  async function openStudentClasses(student) {
    setCurrentStudent(student)
    setStudentClasses([])
    setShowClassesModal(true)
    setLoadingClasses(true)
    try {
      const res = await authFetch(`/api/students/${student.id}/enrollments`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load enrollments')
      }
      const data = await res.json()
      setStudentClasses(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingClasses(false)
    }
  }

  async function submitPay(e) {
    e.preventDefault()
    if (!currentStudent) return
    try {
      const amount = Number(String(payAmount || '').replace(/,/g, ''))
      if (!amount || amount <= 0) return setError('Số tiền không hợp lệ')
      const res = await authFetch(`/api/students/${currentStudent.id}/pay`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, method: payMethod }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setShowPayModal(false)
      await load()
    } catch (err) { setError(err.message) }
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">{t('debts.title', 'Quản lý công nợ')}</h1>
        <div className="mt-3 bg-white dark:bg-slate-800 p-3 rounded">
          <div className="flex gap-2 items-center flex-wrap">
            <input placeholder={t('debts.search.placeholder', 'Tìm kiếm tên hoặc sđt')} value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} className="p-2 border rounded" />
            <input placeholder={t('debts.minOutstanding', 'Min nợ')} value={minOutstanding} onChange={e => { setMinOutstanding(e.target.value); setPage(1); }} className="p-2 border rounded w-36" />
            <input placeholder={t('debts.maxOutstanding', 'Max nợ')} value={maxOutstanding} onChange={e => { setMaxOutstanding(e.target.value); setPage(1); }} className="p-2 border rounded w-36" />
            <select value={hasDebtFilter} onChange={e => { setHasDebtFilter(e.target.value); setPage(1); }} className="p-2 border rounded">
              <option value="any">{t('debts.filter.any', 'Tất cả')}</option>
              <option value="with">{t('debts.filter.with', 'Có nợ')}</option>
              <option value="without">{t('debts.filter.without', 'Không nợ')}</option>
            </select>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="p-2 border rounded">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <div className="bg-white dark:bg-slate-800 p-4 rounded">
        {loading ? <div>Loading...</div> : (
          <table className="min-w-full table-auto">
            <thead>
              <tr className="text-left">
                <th className="p-2">No.</th>
                <th className="p-2 cursor-pointer" onClick={() => { if (sortField === 'name') setSortDir(sortDir === 'ASC' ? 'DESC' : 'ASC'); else { setSortField('name'); setSortDir('ASC'); } }}>{t('debts.table.name', 'Họ tên')}</th>
                <th className="p-2 cursor-pointer" onClick={() => { if (sortField === 'phone') setSortDir(sortDir === 'ASC' ? 'DESC' : 'ASC'); else { setSortField('phone'); setSortDir('ASC'); } }}>{t('debts.table.phone', 'SĐT')}</th>
                <th className="p-2 cursor-pointer" onClick={() => { if (sortField === 'classes_active') setSortDir(sortDir === 'ASC' ? 'DESC' : 'ASC'); else { setSortField('classes_active'); setSortDir('DESC'); } }}>{t('debts.table.active', 'Lớp đang học')}</th>
                <th className="p-2 cursor-pointer" onClick={() => { if (sortField === 'classes_finished') setSortDir(sortDir === 'ASC' ? 'DESC' : 'ASC'); else { setSortField('classes_finished'); setSortDir('DESC'); } }}>{t('debts.table.finished', 'Lớp đã kết thúc')}</th>
                <th className="p-2 cursor-pointer" onClick={() => { if (sortField === 'total_outstanding') setSortDir(sortDir === 'ASC' ? 'DESC' : 'ASC'); else { setSortField('total_outstanding'); setSortDir('DESC'); } }}>{t('debts.table.total_owed', 'Tổng nợ')}</th>
                <th className="p-2 cursor-pointer" onClick={() => { if (sortField === 'total_paid') setSortDir(sortDir === 'ASC' ? 'DESC' : 'ASC'); else { setSortField('total_paid'); setSortDir('DESC'); } }}>{t('debts.table.total_paid', 'Đã thanh toán')}</th>
                <th className="p-2">{t('debts.table.remaining', 'Còn lại')}</th>
                <th className="p-2">{t('debts.table.parent', 'Phụ huynh')}</th>
                <th className="p-2">{t('debts.table.actions', 'Hành động')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{(page - 1) * pageSize + idx + 1}</td>
                  <td className="p-2"><button onClick={() => openStudentClasses(r)} className="text-left text-blue-600 dark:text-blue-300 underline">{r.name}</button></td>
                  <td className="p-2">{r.phone || '—'}</td>
                  <td className="p-2">{r.classes_active}</td>
                  <td className="p-2">{r.classes_finished}</td>
                  <td className="p-2">{Number(r.total_outstanding || 0).toLocaleString()}</td>
                  <td className="p-2">{Number(r.total_paid || 0).toLocaleString()}</td>
                  <td className="p-2">{Number((r.total_outstanding || 0) - (r.total_paid || 0)).toLocaleString()}</td>
                  <td className="p-2">{r.parent_name || ''}{r.parent_phone ? ` (${r.parent_phone})` : ''}</td>
                  <td className="p-2"><button onClick={() => openPay(r)} className="px-2 py-1 bg-green-600 text-white rounded">{t('debts.actions.pay', 'Thanh toán')}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} of {total}</div>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 border rounded">Prev</button>
          <span className="px-3 py-1">{page}</span>
          <button disabled={(page * pageSize) >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded">Next</button>
        </div>
      </div>

      {showPayModal && currentStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowPayModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 dark:text-slate-100 p-6 rounded w-full max-w-md z-60">
            <h3 className="text-lg font-semibold mb-2">Thanh toán — {currentStudent.name}</h3>
            <form onSubmit={submitPay} className="grid gap-2">
              <div>
                <label className="block text-sm">Amount</label>
                <input type="text" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="p-2 border rounded w-full" />
              </div>
              <div>
                <label className="block text-sm">Method</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="p-2 border rounded w-full"><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option></select>
              </div>
              <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowPayModal(false)} className="px-3 py-2 border rounded">Cancel</button><button type="submit" className="px-3 py-2 bg-green-600 text-white rounded">Pay</button></div>
            </form>
          </div>
        </div>
      )}

      {showClassesModal && currentStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowClassesModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 dark:text-slate-100 p-6 rounded w-full max-w-2xl z-60">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Lớp đang tham gia — {currentStudent.name}</h3>
              <button onClick={() => setShowClassesModal(false)} className="px-2 py-1 border rounded">Đóng</button>
            </div>
            {loadingClasses ? <div>Loading...</div> : (
              <table className="min-w-full table-auto">
                <thead><tr><th className="p-2 text-left">Class</th><th className="p-2">Reg date</th><th className="p-2">Status</th><th className="p-2">Outstanding</th><th className="p-2">Paid</th></tr></thead>
                <tbody>
                  {studentClasses.length === 0 && <tr><td colSpan={5} className="p-2">Không có lớp</td></tr>}
                  {studentClasses.map(sc => (
                    <tr key={sc.id} className="border-t">
                      <td className="p-2">{sc.class_name || sc.class_id}</td>
                      <td className="p-2">{sc.registration_date ? (new Date(sc.registration_date)).toLocaleDateString() : '—'}</td>
                      <td className="p-2">{sc.status}</td>
                      <td className="p-2">{Number(sc.outstanding_balance || 0).toLocaleString()}</td>
                      <td className="p-2">{Number(sc.total_paid || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
