import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { FiSearch, FiX } from 'react-icons/fi'
import { authFetch } from '../lib/auth'

function debounce(fn, delay) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), delay)
  }
}

export default function SearchModal({ open, onClose }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(0)
  const inputRef = useRef()

  useEffect(() => {
    if (open) {
      setQ('')
      setResults([])
      setSelected(0)
      setTimeout(() => inputRef.current && inputRef.current.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!q || q.trim().length < 1) { setResults([]); return }
    setLoading(true)
    debouncedSearch(q)
  }, [q, open])

  const performSearch = async (term) => {
    try {
      const res = await authFetch(`/api/search?q=${encodeURIComponent(term)}`)
      if (!res.ok) { setResults([]); return }
      const data = await res.json()
      const items = (data && data.results) ? data.results : []
      // items already contains actions from server; keep local quick-create on top
      const localActions = [
        { type: 'action', label: 'Tạo học viên mới', href: '/students/new' },
        { type: 'action', label: 'Tạo lớp mới', href: '/classes/new' },
      ]
      setResults([...localActions, ...items])
    } catch (err) {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const debouncedSearch = debounce(performSearch, 300)

  function onKey(e) {
    if (!results || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(i => Math.min(results.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(i => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); activate(results[selected]) }
    else if (e.key === 'Escape') { onClose() }
  }

  function activate(r) {
    if (!r) return
    if (r.type === 'action') {
      onClose()
      router.push(r.href)
      return
    }
    const id = (r.id || (r.item && (r.item.id || r.item.class_id || r.item.user_id || r.item.receipt_id)))
    if (!id) return
    onClose()
    if (r.type === 'classes') router.push(`/class-students/${id}`)
    else if (r.type === 'courses') router.push(`/courses/${id}`)
    else if (r.type === 'students') router.push(`/debts?student=${id}`)
    else if (r.type === 'teachers') router.push(`/teachers?focus=${id}`)
    else if (r.type === 'receipts') router.push(`/receipts/${id}`)
  }

  function renderMeta(r) {
    const m = r.meta || (r.item && r.item.meta) || {}
    if (r.type === 'teachers') {
      const cls = m.class_count != null ? `Lớp: ${m.class_count}` : null
      const stu = m.student_count != null ? `HV: ${m.student_count}` : null
      const contact = m.phone || m.email ? `${m.phone || ''} ${m.email || ''}`.trim() : null
      return [cls, stu, contact].filter(Boolean).join(' · ')
    }
    if (r.type === 'students') {
      const cls = m.class_count != null ? `Lớp: ${m.class_count}` : null
      const debt = m.debt_total != null ? `Nợ: ${Number(m.debt_total).toLocaleString()}` : null
      const contact = m.phone || m.email ? `${m.phone || ''} ${m.email || ''}`.trim() : null
      return [cls, debt, contact].filter(Boolean).join(' · ')
    }
    if (r.type === 'classes') {
      const stu = m.student_count != null ? `HV: ${m.student_count}` : null
      const course = m.course_id ? `Course ${m.course_id}` : null
      return [stu, course].filter(Boolean).join(' · ')
    }
    if (r.type === 'courses') {
      const cls = m.class_count != null ? `Lớp: ${m.class_count}` : null
      const stu = m.student_count != null ? `HV: ${m.student_count}` : null
      return [cls, stu].filter(Boolean).join(' · ')
    }
    return r.type
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded shadow-lg mt-20">
        <div className="flex items-center gap-2 p-3 border-b border-gray-100 dark:border-slate-700">
          <FiSearch className="text-gray-500 dark:text-gray-300" />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey} placeholder="Tìm kiếm toàn bộ hệ thống..." className="flex-1 bg-transparent outline-none text-sm text-slate-800 dark:text-slate-100" />
          <button onClick={() => { setQ(''); inputRef.current && inputRef.current.focus() }} className="p-1 text-gray-500"><FiX /></button>
        </div>
        <div className="max-h-80 overflow-auto">
          {loading && <div className="p-4 text-sm text-slate-500">Đang tìm...</div>}
          {!loading && results && results.length === 0 && <div className="p-4 text-sm text-slate-500">Không có kết quả</div>}
          <ul>
            {results.map((r, idx) => (
              <li key={idx} onMouseEnter={() => setSelected(idx)} onClick={() => activate(r)} className={`p-3 cursor-pointer flex items-center justify-between ${selected === idx ? 'bg-gray-100 dark:bg-slate-700' : 'hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                <div>
                  {r.type === 'action' ? (
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.label}</div>
                  ) : (
                    <div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.label || (r.item && (r.item.name || r.item.title || r.item.username || r.item.fullname || r.item.class_name))}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-300">{renderMeta(r)}</div>
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-400">{r.type !== 'action' && (r.id || (r.item && (r.item.id || r.item.class_id || r.item.user_id || r.item.receipt_id)))}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
