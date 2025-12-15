import React from 'react'
import Link from 'next/link'
import { FiHome, FiUsers, FiBook, FiUserCheck, FiCalendar, FiLayers } from 'react-icons/fi'
import { t } from '../lib/i18n'

export default function Sidebar({ collapsed, user }) {
  const dashboardHref = '/dashboard'
  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} bg-white dark:bg-slate-800 border-r h-full transition-width duration-150 flex-shrink-0`}>
      <div className="p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white">CM</div>
        {!collapsed && <div className="font-semibold text-lg">{t('app.title', 'CenterMgmt')}</div>}
      </div>
      <nav className="mt-4 px-2 flex flex-col gap-1">
        <Link href={dashboardHref} className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"><FiHome className="text-lg" />{!collapsed && <span>{t('sidebar.dashboard', 'Dashboard')}</span>}</Link>
        <Link href="/" className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"><FiUsers className="text-lg" />{!collapsed && <span>{t('sidebar.students', 'Students')}</span>}</Link>
        <Link href="/courses" className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"><FiBook className="text-lg" />{!collapsed && <span>{t('sidebar.courses', 'Courses')}</span>}</Link>
        <Link href="/teachers" className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"><FiUserCheck className="text-lg" />{!collapsed && <span>{t('sidebar.teachers', 'Teachers')}</span>}</Link>
        <Link href="/classes" className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"><FiLayers className="text-lg" />{!collapsed && <span>{t('sidebar.classes', 'Classes')}</span>}</Link>
        <Link href="/debts" className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"><FiUsers className="text-lg" />{!collapsed && <span>{t('sidebar.debts', 'Quản lý công nợ')}</span>}</Link>
        <Link href="/schedules" className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"><FiCalendar className="text-lg" />{!collapsed && <span>{t('sidebar.schedules', 'Schedules')}</span>}</Link>

      </nav>
    </aside>
  )
}
