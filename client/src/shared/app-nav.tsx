import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/auth-context'

interface AppNavProps {
  title: string
  actions?: ReactNode
}

export const AppNav = ({ title, actions }: AppNavProps) => {
  const { authData, clearSession } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const { role, fullName, email } = authData!.user
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  const handleLogout = () => {
    clearSession()
    void navigate('/login')
  }

  const linkClass = (paths: string[]) =>
    paths.includes(pathname)
      ? 'group inline-flex items-center gap-2 rounded-xl border border-[#0f4c5c] bg-[linear-gradient(140deg,_#0f4c5c_0%,_#16657a_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(15,76,92,0.35)]'
      : 'group inline-flex items-center gap-2 rounded-xl border border-[#dbcdb7] bg-[#fff9ee] px-4 py-2 text-sm font-semibold text-[#3d3a35] transition hover:-translate-y-0.5 hover:border-[#c8b396] hover:bg-[#f7efdd] hover:shadow-[0_8px_16px_rgba(101,76,53,0.14)]'

  const navIconClass = (paths: string[]) =>
    paths.includes(pathname)
      ? 'text-white/90'
      : 'text-[#8a755d] transition group-hover:text-[#5f4d38]'

  const roleLabel = role === 'manager' ? 'Менеджер платформи' : 'Клієнт'
  const roleAccent = role === 'manager' ? 'bg-[#0f4c5c] text-white' : 'bg-[#f7efdd] text-[#5d5348]'

  return (
    <header className="relative overflow-hidden rounded-3xl border border-[#d9c9ae] bg-[linear-gradient(140deg,_#fff8eb_0%,_#efe3cf_56%,_#e9dcc7_100%)] p-5 shadow-[0_22px_50px_rgba(95,67,43,0.2)] md:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(255,255,255,0.7),transparent_38%),radial-gradient(circle_at_88%_18%,rgba(15,76,92,0.16),transparent_34%)]" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.34em] text-[#9a7d55]">Marketplace of Masters</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#1f2a2d] md:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6a5b4a]">
            Керуйте замовленнями, майстрами та підбором в єдиній панелі співпраці.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-[#dbcdb7] bg-[#fffbf3]/90 px-3 py-2 shadow-sm backdrop-blur">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f4c5c] text-sm font-bold text-white">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#2f2a24]">{fullName}</p>
            <p className="text-xs text-[#7a6b5a]">{email}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roleAccent}`}>
            {roleLabel}
          </span>
        </div>
      </div>

      <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dbcdb7] bg-[#fff9ef]/95 p-3 backdrop-blur">
        <nav className="flex flex-wrap items-center gap-2">
          <Link to="/overview" className={linkClass(['/overview', '/dashboard'])}>
            <svg className={`h-4 w-4 ${navIconClass(['/overview', '/dashboard'])}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 10.5L12 3l9 7.5" />
              <path d="M5 9.5V20h14V9.5" />
            </svg>
            Огляд
          </Link>
          <Link to="/masters" className={linkClass(['/masters', '/candidates'])}>
            <svg className={`h-4 w-4 ${navIconClass(['/masters', '/candidates'])}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="8" cy="8" r="3" />
              <circle cx="16" cy="7" r="2.5" />
              <path d="M3 20c0-3 2.6-5.5 5.7-5.5S14.5 17 14.5 20" />
              <path d="M14 20c0-2.2 1.7-4 3.8-4 2 0 3.7 1.8 3.7 4" />
            </svg>
            Майстри
          </Link>
          <Link to="/chats" className={linkClass(['/chats'])}>
            <svg className={`h-4 w-4 ${navIconClass(['/chats'])}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 5h16v10H8l-4 4V5z" />
            </svg>
            Чат
          </Link>
          {role === 'client' ? (
            <>
              <Link to="/companies" className={linkClass(['/companies'])}>
                <svg className={`h-4 w-4 ${navIconClass(['/companies'])}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 20V8l8-4 8 4v12" />
                  <path d="M9 20v-6h6v6" />
                </svg>
                Мої компанії
              </Link>
              <Link to="/my-orders" className={linkClass(['/my-orders', '/my-bookings'])}>
                <svg className={`h-4 w-4 ${navIconClass(['/my-orders', '/my-bookings'])}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <path d="M8 9h8M8 13h8M8 17h5" />
                </svg>
                Мої замовлення
              </Link>
              <Link to="/recommendations" className={linkClass(['/recommendations'])}>
                <svg className={`h-4 w-4 ${navIconClass(['/recommendations'])}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3l2.6 5.2L20 9l-4 3.9.9 5.6L12 16l-4.9 2.5.9-5.6L4 9l5.4-.8L12 3z" />
                </svg>
                Підбір
              </Link>
            </>
          ) : null}
          {role === 'manager' ? (
            <>
              <Link to="/companies/all" className={linkClass(['/companies/all'])}>
                <svg className={`h-4 w-4 ${navIconClass(['/companies/all'])}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 20h18" />
                  <rect x="5" y="9" width="5" height="11" />
                  <rect x="14" y="5" width="5" height="15" />
                </svg>
                Клієнти
              </Link>
              <Link to="/orders" className={linkClass(['/orders', '/bookings'])}>
                <svg className={`h-4 w-4 ${navIconClass(['/orders', '/bookings'])}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16v12H4z" />
                  <path d="M4 10h16" />
                  <path d="M8 14h3" />
                </svg>
                Замовлення
              </Link>
              <Link to="/skills" className={linkClass(['/skills'])}>
                <svg className={`h-4 w-4 ${navIconClass(['/skills'])}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 7h10v10H7z" />
                  <path d="M3 12h4M17 12h4M12 3v4M12 17v4" />
                </svg>
                Категорії
              </Link>
            </>
          ) : null}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-[#d1bfa5] bg-[#fffdf8] px-4 py-2 text-sm font-semibold text-[#5d5348] transition hover:bg-[#f7efdd] hover:shadow-sm"
          >
            Вийти
          </button>
        </div>
      </div>
    </header>
  )
}
