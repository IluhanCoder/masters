import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useAuth } from '../../context/auth-context'
import { API_BASE } from '../../shared/api-base'
import { AppNav } from '../../shared/app-nav'

interface ManagerDashboard {
  candidates: { total: number; available: number; leased: number }
  bookings: { total: number; new: number; approved: number; completed: number; rejected: number; client_rejected: number; cancelled: number }
  companies: { total: number }
  positions: { total: number; open: number; archived: number }
}

interface ClientDashboard {
  companies: { total: number }
  positions: { total: number; open: number; archived: number }
  bookings: { total: number; new: number; approved: number; completed: number }
}

const API_BASE_DASHBOARD = `${API_BASE}/api/dashboard`

const fetchDashboard = async (accessToken: string): Promise<{ dashboard: ManagerDashboard | ClientDashboard }> => {
  const res = await fetch(API_BASE_DASHBOARD, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Помилка завантаження дашборду')
  return res.json() as Promise<{ dashboard: ManagerDashboard | ClientDashboard }>
}

interface StatCardProps {
  label: string
  value: number
  color?: string
  to?: string
}

const StatCard = ({ label, value, color = 'slate', to }: StatCardProps) => {
  const colorMap: Record<string, string> = {
    slate: 'border-slate-200 bg-white',
    sky: 'border-sky-200 bg-sky-50',
    emerald: 'border-emerald-200 bg-emerald-50',
    amber: 'border-amber-200 bg-amber-50',
    red: 'border-red-200 bg-red-50',
    violet: 'border-violet-200 bg-violet-50',
  }
  const valueColorMap: Record<string, string> = {
    slate: 'text-slate-900',
    sky: 'text-sky-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
    violet: 'text-violet-700',
  }

  const inner = (
    <div className={`rounded-2xl border p-5 shadow-sm ${colorMap[color] ?? colorMap.slate}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${valueColorMap[color] ?? valueColorMap.slate}`}>{value}</p>
    </div>
  )

  return to ? <Link to={to} className="block transition hover:opacity-80">{inner}</Link> : inner
}

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <h3 className="mb-4 text-sm font-semibold text-slate-700">{title}</h3>
    {children}
  </div>
)

export const DashboardPage = () => {
  const { authData } = useAuth()
  const accessToken = authData!.tokens.accessToken
  const role = authData!.user.role

  const [data, setData] = useState<ManagerDashboard | ClientDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    fetchDashboard(accessToken)
      .then((res) => setData(res.dashboard))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Помилка'))
      .finally(() => setIsLoading(false))
  }, [accessToken])

  return (
    <main className="marketplace-bg px-6 py-10">
      <section className="mx-auto max-w-5xl space-y-8">
        <AppNav title="Огляд платформи" />

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        {isLoading || !data ? (
          <p className="text-sm text-slate-500">{isLoading ? 'Завантажуємо статистику...' : null}</p>
        ) : role === 'manager' ? (
          <ManagerStats data={data as ManagerDashboard} />
        ) : (
          <ClientStats data={data as ClientDashboard} />
        )}
      </section>
    </main>
  )
}

const BOOKING_STATUS_COLORS: Record<string, string> = {
  'Нові': '#0ea5e9',
  'Активні': '#10b981',
  'Завершені': '#94a3b8',
  'Відхилено': '#ef4444',
  'Відх. клієнтом': '#f59e0b',
  'Скасовано': '#cbd5e1',
}

const ManagerStats = ({ data }: { data: ManagerDashboard }) => {
  const candidatePieData = [
    { name: 'Вільні', value: data.candidates.available, fill: '#10b981' },
    { name: 'Задіяні', value: data.candidates.leased, fill: '#f59e0b' },
  ].filter((d) => d.value > 0)

  const bookingsBarData = [
    { name: 'Нові', value: data.bookings.new },
    { name: 'Активні', value: data.bookings.approved },
    { name: 'Завершені', value: data.bookings.completed },
    { name: 'Відхилено', value: data.bookings.rejected },
    { name: 'Відх. клієнтом', value: data.bookings.client_rejected },
    { name: 'Скасовано', value: data.bookings.cancelled },
  ].filter((d) => d.value > 0)

  const positionsPieData = [
    { name: 'Відкриті', value: data.positions.open, fill: '#0ea5e9' },
    { name: 'В архіві', value: data.positions.archived, fill: '#f59e0b' },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      {}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Майстрів" value={data.candidates.total} color="slate" to="/masters" />
        <StatCard label="Вільні" value={data.candidates.available} color="emerald" to="/masters" />
        <StatCard label="Замовлень" value={data.bookings.total} color="sky" to="/orders" />
        <StatCard label="Компаній" value={data.companies.total} color="violet" to="/companies/all" />
      </div>

      {}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Майстри — доступність">
          {candidatePieData.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Немає даних</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={candidatePieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {candidatePieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Категорії робіт — статус">
          {positionsPieData.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Немає даних</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={positionsPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {positionsPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Замовлення за статусами">
        {bookingsBarData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Немає замовлень</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={bookingsBarData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip
                formatter={(v, name) => [v, name]}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
              />
              <Bar dataKey="value" name="Кількість" radius={[6, 6, 0, 0]}>
                {bookingsBarData.map((entry) => (
                  <Cell key={entry.name} fill={BOOKING_STATUS_COLORS[entry.name] ?? '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  )
}

const ClientStats = ({ data }: { data: ClientDashboard }) => {
  const bookingsPieData = [
    { name: 'Нові', value: data.bookings.new, fill: '#0ea5e9' },
    { name: 'Активні', value: data.bookings.approved, fill: '#10b981' },
    { name: 'Завершені', value: data.bookings.completed, fill: '#94a3b8' },
  ].filter((d) => d.value > 0)

  const positionsBarData = [
    { name: 'Відкриті', value: data.positions.open },
    { name: 'В архіві', value: data.positions.archived },
  ]

  return (
    <div className="space-y-6">
      {}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Компаній" value={data.companies.total} color="violet" to="/companies" />
        <StatCard label="Відкритих позицій" value={data.positions.open} color="sky" to="/companies" />
        <StatCard label="Замовлень" value={data.bookings.total} color="slate" to="/my-orders" />
        <StatCard label="Активних" value={data.bookings.approved} color="emerald" to="/my-orders" />
      </div>

      {}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Мої замовлення — статуси">
          {bookingsPieData.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Немає запитів</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={bookingsPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {bookingsPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Позиції">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={positionsBarData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 13, fill: '#64748b' }} />
              <Tooltip
                formatter={(v) => [v, 'Позицій']}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
              />
              <Bar dataKey="value" name="Позицій" radius={[6, 6, 0, 0]}>
                <Cell fill="#0ea5e9" />
                <Cell fill="#f59e0b" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
