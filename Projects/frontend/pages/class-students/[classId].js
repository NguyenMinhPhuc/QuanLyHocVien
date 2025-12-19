import { useEffect, useState } from 'react'
import { sanitizeNumericInput, formatWithThousands } from '../../lib/numberFormat'
import { useRouter } from 'next/router'
import { authFetch } from '../../lib/auth'
import { t } from '../../lib/i18n'

export default function ClassStudentsPage() {
  const router = useRouter()
  const { classId } = router.query
  const [enrollments, setEnrollments] = useState([])
  const [classInfo, setClassInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [currentEnrollment, setCurrentEnrollment] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [payments, setPayments] = useState([])



  const [showTransferModal, setShowTransferModal] = useState(false)
  const [targetClassId, setTargetClassId] = useState('')
  const [availableClasses, setAvailableClasses] = useState([])
  const [targetSearch, setTargetSearch] = useState('')
  const [showTargetDropdown, setShowTargetDropdown] = useState(false)

  const [showEditModal, setShowEditModal] = useState(false)
  const [editData, setEditData] = useState({ status: '', assigned_teacher_id: '', registration_date: '' })

  async function load() {
    if (!classId) return
    setLoading(true)
    try {
      const res = await authFetch(`/api/classes/${classId}/enrollments`)
      if (!res.ok) throw new Error(t('class_students.error.load_enrollments', 'Không tải được danh sách học viên'))
      const data = await res.json()
      setEnrollments(data)
      // also fetch class info (for displaying class name in the page title)
      try {
        const cRes = await authFetch(`/api/classes/${classId}`)
        if (cRes.ok) {
          const cdata = await cRes.json()
          setClassInfo(cdata)
        }
      } catch (cErr) {
        // ignore class info errors but keep enrollments
        console.warn(t('class_students.warn.load_class_info', 'Không tải được thông tin lớp'), cErr)
      }
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [classId])

  function openPayments(e) {
    setCurrentEnrollment(e);
    // prefill payment amount with current outstanding balance to save user input
    try {
      const pref = (e && (e.outstanding_balance != null)) ? String(Number(e.outstanding_balance)) : ''
      setPaymentAmount(sanitizeNumericInput(pref))
    } catch (err) { setPaymentAmount('') }
    setShowPaymentModal(true)
    loadPayments(e.id)
  }

  async function loadPayments(enrollmentId) {
    try {
      const res = await authFetch(`/api/enrollments/${enrollmentId}/payments`)
      if (!res.ok) return
      setPayments(await res.json())
    } catch (err) { /* ignore */ }
  }

  async function submitPayment(e) {
    e.preventDefault()
    if (!currentEnrollment) return
    try {
      const amt = Number(String(paymentAmount || '').replace(/,/g, ''))
      if (!amt || amt <= 0) return setError(t('pay.invalid_amount', 'Số tiền không hợp lệ'))
      const res = await authFetch(`/api/enrollments/${currentEnrollment.id}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amt, method: paymentMethod }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('class_students.error.add_payment', 'Không thể thêm khoản thu'))
      // clear form
      setPaymentAmount('')
      setPaymentMethod('cash')
      await loadPayments(currentEnrollment.id)
      await load()
      // if server returned a receipt, open printable receipt
      if (data && data.receipt && data.receipt.id) {
        try {
          // fetch enriched receipt (includes parsed details and settings)
          const rres = await authFetch(`/api/receipts/${data.receipt.id}`)
          let rdata = null
          if (rres.ok) rdata = await rres.json()
          const r = rdata && rdata.receipt ? rdata.receipt : data.receipt
          const details = (rdata && rdata.details) ? rdata.details : (() => { try { return JSON.parse(r.data); } catch (e) { return {}; } })()
          const settings = (rdata && rdata.settings) ? rdata.settings : {}

          // render all keys from details
          const extraRows = Object.keys(details || {}).filter(k => !['student_name', 'student_phone', 'class_name', 'amount', 'method', 'note'].includes(k)).map(k => `<div class="row"><div>${k.replace(/_/g, ' ')}</div><div>${details[k] || ''}</div></div>`).join('')

          const html = `<!doctype html><html><head><meta charset="utf-8"><title>Phiếu ${r.receipt_number}</title><style>body{font-family: Arial, Helvetica, sans-serif;padding:16px;font-size:12px} .container{width:420px;margin:0 auto} h1{font-size:16px;text-align:center} .row{display:flex;justify-content:space-between;margin:6px 0} .bold{font-weight:700}</style></head><body><div class="container">${settings && settings.receipt_logo_url ? `<div style="text-align:center;margin-bottom:6px"><img src="${settings.receipt_logo_url}" style="max-height:60px"/></div>` : ''}<h1>PHIẾU THU</h1><div class="row"><div>Phiếu số:</div><div class="bold">${r.receipt_number}</div></div><div class="row"><div>Ngày:</div><div class="bold">${new Date(r.created_at).toLocaleString()}</div></div><hr><div class="row"><div>Học sinh:</div><div>${details && details.student_name ? details.student_name : ''}</div></div><div class="row"><div>SDT học sinh:</div><div>${details && details.student_phone ? details.student_phone : ''}</div></div><div class="row"><div>Lớp / Khóa:</div><div>${details && details.class_name ? details.class_name : ''}</div></div><div class="row"><div>Số tiền:</div><div class="bold">${Number(details && details.amount || 0).toLocaleString()} đ</div></div><div class="row"><div>Hình thức:</div><div>${(details && details.method) || ''}</div></div>${extraRows}${settings && settings.receipt_center_phone ? `<div class="row"><div>Điện thoại:</div><div>${settings.receipt_center_phone}</div></div>` : ''}<div style="margin-top:20px">Người thu: ____________________</div><div style="margin-top:40px;font-size:11px;color:#666">Ghi chú: ${details && details.note ? details.note : ''}</div></div></body></html>`;

          const w = window.open('', '_blank', 'width=600,height=800');
          w.document.write(html);
          w.document.close();
          setTimeout(() => { try { w.print(); } catch (e) { console.warn('print failed', e) } }, 500);
        } catch (e) { console.error('Failed to open receipt', e) }
      }
    } catch (err) { setError(err.message) }
  }

  function openTransfer(e) {
    setCurrentEnrollment(e);
    // load candidate target classes (same course, not ended)
    (async () => {
      try {
        let candidates = []
        // If the enrollment is reserved (we are re-assigning), show ALL active classes and skip fetching source class
        if (String(e.status || '').toLowerCase() === 'reserved') {
          const candRes = await authFetch('/api/classes/active')
          if (candRes.ok) candidates = await candRes.json()
          console.log('[openTransfer] candidates (all active) from server', candidates && candidates.length)
        } else {
          // get current class info to know course_id
          const cRes = await authFetch(`/api/classes/${e.class_id}`)
          if (!cRes.ok) {
            setError('Không lấy được thông tin lớp nguồn')
            setShowTransferModal(true)
            return
          }
          const classInfo = await cRes.json()
          console.log('[openTransfer] classInfo', classInfo)
          const courseId = classInfo.course_id
          if (courseId) {
            const candRes = await authFetch(`/api/classes/course/${courseId}/active`)
            if (candRes.ok) candidates = await candRes.json()
            console.log('[openTransfer] candidates (same course) from server', candidates && candidates.length)
          } else {
            console.log('[openTransfer] no courseId, cannot fetch candidates')
          }
        }
        setAvailableClasses(candidates || [])
        setTargetClassId('')
      } catch (err) {
        console.error('openTransfer error', err)
        setError('Lỗi khi tải danh sách lớp chuyển')
      } finally {
        setShowTransferModal(true)
      }
    })()
  }

  async function submitTransfer() {
    if (!currentEnrollment) return
    if (!targetClassId) return setError(t('class_students.transfer.error.pick_target', 'Vui lòng chọn lớp đích'))
    try {
      const res = await authFetch(`/api/enrollments/${currentEnrollment.id}/transfer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_class_id: Number(targetClassId) }) })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Failed') }
      setShowTransferModal(false)
      setTargetClassId('')
      await load()
    } catch (err) { setError(err.message) }
  }

  async function holdEnrollmentAction(e) {
    if (!e || !e.id) return
    try {
      const reason = window.prompt('Lý do bảo lưu (tùy chọn):', '') || ''
      const res = await authFetch(`/api/enrollments/${e.id}/hold`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'hold', reason }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Không thể bảo lưu')
      // reload enrollments
      await load()
    } catch (err) { setError(err.message) }
  }

  async function assignBackToClass(e) {
    // Instead of automatically adding back to current class, open transfer modal
    // so user can select a target class to assign the student to.
    if (!e) return
    openTransfer(e)
  }

  function openEdit(e) {
    setCurrentEnrollment(e);
    // registration_date for input[type=date] must be in YYYY-MM-DD format
    let regVal = ''
    if (e && e.registration_date) {
      try {
        const d = new Date(e.registration_date)
        if (!isNaN(d.getTime())) regVal = d.toISOString().slice(0, 10)
      } catch (ex) { regVal = '' }
    }
    setEditData({ status: e.status || '', assigned_teacher_id: e.assigned_teacher_id || '', registration_date: regVal })
    setShowEditModal(true)
  }

  async function submitEdit(ev) {
    ev.preventDefault()
    if (!currentEnrollment) return
    try {
      // normalize registration_date: empty -> null, otherwise send ISO date string
      const payload = { ...editData }
      if (!payload.registration_date || String(payload.registration_date).trim() === '') payload.registration_date = null
      // if user provided YYYY-MM-DD, convert to ISO string so backend parses consistently
      else {
        try { payload.registration_date = new Date(payload.registration_date).toISOString() } catch (e) { /* leave as-is */ }
      }
      const res = await authFetch(`/api/enrollments/${currentEnrollment.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setShowEditModal(false)
      await load()
    } catch (err) { setError(err.message) }
  }

  async function addEnrollment() {
    // simple picker: open browser to classes page for adding; for now we will not implement heavy flows
    router.push('/classes')
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{t('class_students.title', 'Học viên trong')} {classInfo ? (classInfo.course_name || classInfo.name || `Class ${classId}`) : (`Class ${classId}`)}</h1>
        <div>
          <button onClick={addEnrollment} className="px-3 py-2 bg-green-600 text-white rounded">{t('class_students.enroll', 'Ghi danh học viên')}</button>
        </div>
      </div>

      {error && <div className="text-red-600 mb-2">{error}</div>}

      <div className="bg-white dark:bg-slate-800 dark:text-slate-100 p-4 rounded">
        {loading ? <div>{t('actions.loading', 'Đang tải...')}</div> : (
          <table className="min-w-full table-auto">
            <thead><tr className="text-left"><th className="p-2">{t('debts.table.no', 'STT')}</th><th>{t('debts.table.name', 'Họ tên')}</th><th>{t('class_students.col.reg_date', 'Ngày đăng ký')}</th><th>{t('class_students.col.status', 'Trạng thái')}</th><th>{t('class_students.col.debt_paid', 'Nợ / Đã trả')}</th><th>{t('actions.actions', 'Thao tác')}</th></tr></thead>
            <tbody>
              {enrollments.map((e, idx) => (
                <tr key={e.id} className="border-t">
                  <td className="p-2">{idx + 1}</td>
                  <td className="p-2">{e.student_name}</td>
                  <td className="p-2">{e.registration_date || '—'}</td>
                  <td className="p-2">{e.status}</td>
                  <td className="p-2">
                    <div className="text-sm text-slate-700 dark:text-slate-200 mb-1">Nợ: <strong>{(e.outstanding_balance != null) ? Number(e.outstanding_balance).toLocaleString() : '—'}</strong></div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Đã trả: <strong>{Number(e.total_paid || 0).toLocaleString()}</strong></div>
                  </td>
                  <td className="p-2">
                    <button onClick={() => openPayments(e)} className="mr-2 px-2 py-1 bg-blue-500 text-white rounded">{t('class_students.btn.payments', 'Thu tiền')}</button>
                    <button onClick={() => openEdit(e)} className="mr-2 px-2 py-1 bg-yellow-500 text-white rounded">{t('class_students.btn.edit', 'Chỉnh sửa')}</button>
                    <button onClick={() => openTransfer(e)} className="mr-2 px-2 py-1 bg-indigo-600 text-white rounded">{t('class_students.btn.transfer', 'Chuyển lớp')}</button>
                    {String(e.status || '').toLowerCase() !== 'reserved' ? (
                      <button onClick={() => holdEnrollmentAction(e)} className="ml-2 px-2 py-1 bg-gray-600 text-white rounded">Bảo lưu</button>
                    ) : (
                      <button onClick={() => assignBackToClass(e)} className="ml-2 px-2 py-1 bg-green-600 text-white rounded">Gán lại</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showPaymentModal && currentEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowPaymentModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 dark:text-slate-100 p-6 rounded w-full max-w-lg z-60">
            <h3 className="text-lg font-semibold mb-2">{t('class_students.payments.title', 'Thu tiền')} — {currentEnrollment.student_name}</h3>
            <div className="mb-3 text-sm text-slate-700 dark:text-slate-200">{t('class_students.payments.outstanding', 'Số tiền nợ hiện tại')}: <strong>{(currentEnrollment.outstanding_balance != null) ? Number(currentEnrollment.outstanding_balance).toLocaleString() : '—'}</strong></div>
            <div className="mb-3">
              <form onSubmit={submitPayment} className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-sm">{t('class_students.payments.amount', 'Số tiền')}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatWithThousands(paymentAmount)}
                    onChange={e => setPaymentAmount(sanitizeNumericInput(e.target.value))}
                    className="p-2 border rounded w-full bg-white dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm">{t('class_students.payments.method', 'Hình thức')}</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="p-2 border rounded w-full bg-white dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600">
                    <option value="cash">Tiền mặt</option>
                    <option value="transfer">Chuyển khoản</option>
                  </select>
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowPaymentModal(false)} className="px-3 py-2 border rounded">{t('actions.cancel', 'Hủy')}</button>
                  <button type="submit" className="px-3 py-2 bg-green-600 text-white rounded">{t('class_students.payments.add', 'Thêm khoản thu')}</button>
                </div>
              </form>
            </div>
            <div>
              <h4 className="font-semibold mb-2">{t('class_students.payments.history', 'Lịch sử')}</h4>
              <table className="min-w-full table-auto"><thead><tr><th>{t('class_students.payments.col.paid_at', 'Thời gian')}</th><th>{t('class_students.payments.col.amount', 'Số tiền')}</th><th>{t('class_students.payments.col.method', 'Hình thức')}</th><th>{t('class_students.payments.col.note', 'Ghi chú')}</th></tr></thead>
                <tbody>{payments.map(p => (<tr key={p.id}><td>{new Date(p.paid_at).toLocaleString()}</td><td>{Number(p.amount).toLocaleString()}</td><td>{p.method}</td><td>{p.note}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && currentEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowTransferModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 dark:text-slate-100 p-6 rounded w-full max-w-md z-60">
            <h3 className="text-lg font-semibold mb-2">{t('class_students.transfer.title', 'Chuyển lớp')} — {currentEnrollment.student_name}</h3>
            <div className="grid gap-2">
              <label className="block text-sm font-medium">{String(currentEnrollment?.status || '').toLowerCase() === 'reserved' ? t('class_students.transfer.label.active', 'Chọn lớp đích (lớp đang hoạt động)') : t('class_students.transfer.label.same_course', 'Chọn lớp đích (cùng khóa, chưa kết thúc)')}</label>
              <div className="relative">
                <input
                  placeholder={t('class_students.transfer.search_placeholder', 'Tìm lớp...')}
                  value={targetSearch}
                  onChange={e => { setTargetSearch(e.target.value); setShowTargetDropdown(true); setTargetClassId('') }}
                  onFocus={() => setShowTargetDropdown(true)}
                    className="p-2 pr-8 border rounded w-full bg-white dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                />
                  {targetSearch && <button type="button" onClick={() => { setTargetSearch(''); setTargetClassId('') }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700">×</button>}
                <div className={`absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 dark:border-slate-700 border rounded max-h-56 overflow-auto z-40 ${showTargetDropdown ? '' : 'hidden'}`}>
                  {(availableClasses || []).filter(ac => {
                    const q = (targetSearch || '').toLowerCase().trim()
                    const label = `${(ac.course_name || ac.name || ('Class ' + ac.id))} ${(ac.teacher_name || ac.teacher || '')}`.toLowerCase()
                    return !q || label.includes(q)
                  }).map(ac => {
                    const line1 = `#${ac.id} — ${(ac.course_name || ac.name || ('Class ' + ac.id))} — ${(ac.teacher_name || ac.teacher || 'TBA')}`
                    return (
                      <div key={ac.id} onMouseDown={() => { setTargetClassId(String(ac.id)); setTargetSearch(line1); setShowTargetDropdown(false) }} className="px-3 py-2 hover:bg-gray-100 cursor-pointer">
                        <div className="font-medium">{line1}</div>
                        <div className="text-sm text-slate-500">{ac.course_start_date ? new Date(ac.course_start_date).toLocaleDateString() : 'start?'} → {ac.course_end_date ? new Date(ac.course_end_date).toLocaleDateString() : 'ongoing'}</div>
                      </div>
                    )
                  })}
                  {(availableClasses || []).filter(ac => {
                    const q = (targetSearch || '').toLowerCase().trim()
                    const label = `${ac.id} ${ac.course_name || ac.course_id}`.toLowerCase()
                    return !q || label.includes(q)
                  }).length === 0 && (
                      <div className="p-2 text-sm text-slate-500">{t('class_students.transfer.none', 'Không tìm thấy lớp')}</div>
                    )}
                </div>
              </div>
              <div className="flex gap-2 justify-end"><button onClick={() => setShowTransferModal(false)} className="px-3 py-2 border rounded">{t('actions.cancel', 'Hủy')}</button><button onClick={submitTransfer} className="px-3 py-2 bg-green-600 text-white rounded">{t('class_students.transfer.submit', 'Chuyển lớp')}</button></div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && currentEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowEditModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-800 dark:text-slate-100 p-6 rounded w-full max-w-md z-60">
            <h3 className="text-lg font-semibold mb-2">{t('class_students.edit.title', 'Chỉnh sửa ghi danh')} — {currentEnrollment.student_name}</h3>
            <form onSubmit={submitEdit} className="grid gap-2">
              <div>
                <label className="block text-sm">{t('class_students.edit.status', 'Trạng thái')}</label>
                <select value={editData.status} onChange={e => setEditData(d => ({ ...d, status: e.target.value }))} className="p-2 border rounded w-full bg-white dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"><option value="active">{t('class_students.status.active', 'Kích hoạt')}</option><option value="reserved">{t('class_students.status.reserved', 'Bảo lưu')}</option><option value="withdrawn">{t('class_students.status.withdrawn', 'Rút')}</option></select>
              </div>
              <div>
                <label className="block text-sm">{t('class_students.edit.registration_date', 'Ngày đăng ký')}</label>
                <input type="date" value={editData.registration_date || ''} onChange={e => setEditData(d => ({ ...d, registration_date: e.target.value }))} className="p-2 border rounded w-full bg-white dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600" />
              </div>
              <div>
                <label className="block text-sm">{t('class_students.edit.assigned_teacher_id', 'ID giáo viên')}</label>
                <input value={editData.assigned_teacher_id || ''} onChange={e => setEditData(d => ({ ...d, assigned_teacher_id: e.target.value }))} className="p-2 border rounded w-full bg-white dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600" />
              </div>
              <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowEditModal(false)} className="px-3 py-2 border rounded">{t('actions.cancel', 'Hủy')}</button><button type="submit" className="px-3 py-2 bg-green-600 text-white rounded">{t('actions.confirm', 'Lưu')}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
