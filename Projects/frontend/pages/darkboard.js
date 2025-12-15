import { useEffect, useState } from 'react'
import { authFetch } from '../lib/auth'
import { t } from '../lib/i18n'

export default function Darkboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const res = await authFetch('/api/dashboard')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setStats(data)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function renderKPI(label, value, subtitle) {
    return (
      <div className="p-4 bg-gray-800/60 rounded-lg shadow-md border border-gray-700">
        <div className="text-sm text-gray-300">{label}</div>
        <div className="text-4xl font-extrabold text-white mt-2">{value}</div>
        {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
      </div>
    )
  }

  function TopClassesChart({ items }) {
    if (!items || items.length === 0) return <div className="text-gray-300">{t('dashboard.no_data', 'Không có dữ liệu')}</div>
    const max = Math.max(...items.map(i => i.student_count || 0), 1)
    const chartWidth = 600
    return (
      <div className="mt-4 overflow-auto">
        <svg width={Math.min(chartWidth, items.length * 220)} height={items.length * 48} viewBox={`0 0 ${Math.min(chartWidth, items.length * 220)} ${items.length * 48}`}>
          {items.map((it, idx) => {
            const h = 36
            const y = idx * 48 + 6
            const w = Math.round(((it.student_count || 0) / max) * (chartWidth - 200))
            return (
              <g key={it.id} transform={`translate(0, ${y})`}>
                <text x={8} y={18} fill="#e5e7eb" fontSize="12">{it.course_name || ('Class ' + it.id)}</text>
                <rect x={200} y={2} rx={6} ry={6} width={Math.max(8, w)} height={h} fill="#60a5fa" />
                <text x={200 + Math.max(8, w) + 8} y={18} fill="#d1d5db" fontSize="12">{it.student_count || 0}</text>
                <text x={8} y={36} fill="#9ca3af" fontSize="10">{it.teacher_name || ''}</text>
              </g>
            )
          })}
        </svg>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 text-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">{t('darkboard.title', 'Darkboard — Báo cáo')}</h1>
        {error && <div className="text-red-400 mb-2">{error}</div>}
        {loading && <div className="text-gray-300">{t('actions.loading', 'Đang tải...')}</div>}

        {stats && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderKPI(t('dashboard.total_students', 'Tổng học viên'), stats.totalStudents, t('dashboard.students_label', 'Tổng học viên'))}
              {renderKPI(t('dashboard.total_teachers', 'Tổng giáo viên'), stats.totalTeachers)}
              {renderKPI(t('dashboard.total_classes', 'Tổng lớp'), stats.totalClasses, `${t('dashboard.active', 'Hoạt động')}: ${stats.activeClasses}`)}
              {renderKPI(t('dashboard.schedules', 'Lịch (sắp tới)'), stats.upcomingSessions, `${t('dashboard.total_schedules', 'Tổng lịch')}: ${stats.totalSchedules}`)}
            </div>

            <div className="mt-8 p-6 bg-gray-800/60 rounded-lg border border-gray-700">
              <h2 className="text-xl font-semibold mb-2">{t('dashboard.top_classes', 'Lớp đông nhất')}</h2>
              <TopClassesChart items={stats.topClasses} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
