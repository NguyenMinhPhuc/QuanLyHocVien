import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { authFetch } from '../../lib/auth'

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
  const [paymentMethod, setPaymentMethod] = useState('')
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
      if (!res.ok) throw new Error('Failed to load enrollments')
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
        console.warn('Failed to load class info', cErr)
      }
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [classId])

  function openPayments(e) {
    setCurrentEnrollment(e);
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
      const amt = Number(paymentAmount)
      if (!amt || amt <= 0) return setError('Số tiền không hợp lệ')
      const res = await authFetch(`/api/enrollments/${currentEnrollment.id}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amt, method: paymentMethod }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add payment')
      setPaymentAmount('')
      setPaymentMethod('')
      await loadPayments(currentEnrollment.id)
      await load()
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
    if (!targetClassId) return setError('Please pick target class')
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
    setEditData({ status: e.status || '', assigned_teacher_id: e.assigned_teacher_id || '', registration_date: e.registration_date || '' })
    setShowEditModal(true)
  }

  async function submitEdit(ev) {
    ev.preventDefault()
    if (!currentEnrollment) return
    try {
      const res = await authFetch(`/api/enrollments/${currentEnrollment.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editData) })
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
        <h1 className="text-2xl font-semibold">Students in {classInfo ? (classInfo.course_name || classInfo.name || `Class ${classId}`) : (`Class ${classId}`)}</h1>
        <div>
          <button onClick={addEnrollment} className="px-3 py-2 bg-green-600 text-white rounded">Enroll student</button>
        </div>
      </div>

      {error && <div className="text-red-600 mb-2">{error}</div>}

      <div className="bg-white p-4 rounded">
        {loading ? <div>Loading...</div> : (
          <table className="min-w-full table-auto">
            <thead><tr className="text-left"><th className="p-2">No.</th><th>Name</th><th>Reg date</th><th>Status</th><th>Debt / Paid</th><th>Actions</th></tr></thead>
            <tbody>
              {enrollments.map((e, idx) => (
                <tr key={e.id} className="border-t">
                  <td className="p-2">{idx + 1}</td>
                  <td className="p-2">{e.student_name}</td>
                  <td className="p-2">{e.registration_date || '—'}</td>
                  <td className="p-2">{e.status}</td>
                  <td className="p-2">
                    <div className="text-sm text-slate-700 mb-1">Nợ: <strong>{(e.outstanding_balance != null) ? Number(e.outstanding_balance).toLocaleString() : '—'}</strong></div>
                    <div className="text-sm text-slate-500">Đã trả: <strong>{Number(e.total_paid || 0).toLocaleString()}</strong></div>
                  </td>
                  <td className="p-2">
                    <button onClick={() => openPayments(e)} className="mr-2 px-2 py-1 bg-blue-500 text-white rounded">Payments</button>
                    <button onClick={() => openEdit(e)} className="mr-2 px-2 py-1 bg-yellow-500 text-white rounded">Edit</button>
                    <button onClick={() => openTransfer(e)} className="mr-2 px-2 py-1 bg-indigo-600 text-white rounded">Transfer</button>
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
          <div className="relative bg-white p-6 rounded w-full max-w-lg z-60">
            <h3 className="text-lg font-semibold mb-2">Payments — {currentEnrollment.student_name}</h3>
            <div className="mb-3">
              <form onSubmit={submitPayment} className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-sm">Amount</label>
                  <input value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="p-2 border rounded w-full" />
                </div>
                <div>
                  <label className="block text-sm">Method</label>
                  <input value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="p-2 border rounded w-full" />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowPaymentModal(false)} className="px-3 py-2 border rounded">Cancel</button>
                  <button type="submit" className="px-3 py-2 bg-green-600 text-white rounded">Add payment</button>
                </div>
              </form>
            </div>
            <div>
              <h4 className="font-semibold mb-2">History</h4>
              <table className="min-w-full table-auto"><thead><tr><th>Paid at</th><th>Amount</th><th>Method</th><th>Note</th></tr></thead>
                <tbody>{payments.map(p => (<tr key={p.id}><td>{new Date(p.paid_at).toLocaleString()}</td><td>{p.amount}</td><td>{p.method}</td><td>{p.note}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && currentEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowTransferModal(false)}></div>
          <div className="relative bg-white p-6 rounded w-full max-w-md z-60">
            <h3 className="text-lg font-semibold mb-2">Transfer — {currentEnrollment.student_name}</h3>
            <div className="grid gap-2">
              <label className="block text-sm font-medium">{String(currentEnrollment?.status || '').toLowerCase() === 'reserved' ? 'Select target class (active classes)' : 'Select target class (same course, not ended)'}</label>
              <div className="relative">
                <input
                  placeholder="Search classes..."
                  value={targetSearch}
                  onChange={e => { setTargetSearch(e.target.value); setShowTargetDropdown(true); setTargetClassId('') }}
                  onFocus={() => setShowTargetDropdown(true)}
                  className="p-2 border rounded w-full"
                />
                <div className={`absolute left-0 right-0 mt-1 bg-white border rounded max-h-56 overflow-auto z-40 ${showTargetDropdown ? '' : 'hidden'}`}>
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
                      <div className="p-2 text-sm text-slate-500">No classes found</div>
                    )}
                </div>
              </div>
              <div className="flex gap-2 justify-end"><button onClick={() => setShowTransferModal(false)} className="px-3 py-2 border rounded">Cancel</button><button onClick={submitTransfer} className="px-3 py-2 bg-green-600 text-white rounded">Transfer</button></div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && currentEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowEditModal(false)}></div>
          <div className="relative bg-white p-6 rounded w-full max-w-md z-60">
            <h3 className="text-lg font-semibold mb-2">Edit Enrollment — {currentEnrollment.student_name}</h3>
            <form onSubmit={submitEdit} className="grid gap-2">
              <div>
                <label className="block text-sm">Status</label>
                <select value={editData.status} onChange={e => setEditData(d => ({ ...d, status: e.target.value }))} className="p-2 border rounded w-full"><option value="active">active</option><option value="reserved">reserved</option><option value="withdrawn">withdrawn</option></select>
              </div>
              <div>
                <label className="block text-sm">Registration date</label>
                <input type="date" value={editData.registration_date || ''} onChange={e => setEditData(d => ({ ...d, registration_date: e.target.value }))} className="p-2 border rounded w-full" />
              </div>
              <div>
                <label className="block text-sm">Assigned teacher id</label>
                <input value={editData.assigned_teacher_id || ''} onChange={e => setEditData(d => ({ ...d, assigned_teacher_id: e.target.value }))} className="p-2 border rounded w-full" />
              </div>
              <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShowEditModal(false)} className="px-3 py-2 border rounded">Cancel</button><button type="submit" className="px-3 py-2 bg-green-600 text-white rounded">Save</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
